/**
 * GRYD — Edge Function rc_webhook (SPEC §5.1/§6.3).
 *
 * Pipeline : vérif Authorization (secret configuré dans le dashboard
 * RevenueCat, envoyé tel quel) → mapRevenueCatEvent (pur) → idempotence par
 * insert purchases (rc_event_id unique, 0002 — un retry RC rejoue l'event à
 * l'identique et prend un 23505 → acquitté sans double application) →
 * application (users.is_club / users.eclats).
 *
 * RevenueCat retente tant qu'il ne reçoit pas un 2xx : on n'acquitte (200)
 * que ce qui est appliqué ou volontairement ignoré.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { mapRevenueCatEvent, type RevenueCatEvent } from './logic.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  // RevenueCat envoie la valeur configurée, verbatim, dans Authorization.
  const secret = Deno.env.get('RC_WEBHOOK_SECRET') ?? '';
  if (!secret || req.headers.get('authorization') !== secret) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const event = (body as { event?: RevenueCatEvent })?.event;
  if (typeof event !== 'object' || event === null) {
    return json({ error: 'invalid_payload' }, 400);
  }

  const decision = mapRevenueCatEvent(event);
  if (decision.kind === 'ignore') {
    // Acquitté : RC ne doit pas retenter un event qu'on ignore volontairement.
    return json({ ignored: true, reason: decision.reason });
  }

  try {
    // ── Idempotence : l'insert purchases est LA barrière (rc_event_id unique) ─
    const { error: insertError } = await supabase.from('purchases').insert({
      user_id: decision.userId,
      sku: decision.sku,
      rc_event_id: decision.rcEventId,
      amount: decision.price,
    });
    if (insertError) {
      // 23505 = event déjà traité (retry RevenueCat) → acquitté, zéro ré-application.
      if (insertError.code === '23505') return json({ replayed: true });
      // FK user inconnu (app_user_id ≠ uuid GRYD) : acquitté en anomalie loggée,
      // un retry infini de RC ne résoudrait rien.
      if (insertError.code === '23503') {
        console.error('rc_webhook: unknown user', decision.userId);
        return json({ ignored: true, reason: 'unknown_user' });
      }
      throw new Error(`purchases insert: ${insertError.message}`);
    }

    // ── Application de la décision ────────────────────────────────────────────
    switch (decision.kind) {
      case 'club_on':
      case 'club_off': {
        const { error } = await supabase
          .from('users')
          .update({ is_club: decision.kind === 'club_on' })
          .eq('id', decision.userId);
        if (error) throw new Error(`users is_club update: ${error.message}`);
        break;
      }
      case 'credit_eclats':
      case 'starter_pack': {
        // Lecture-modification simple : l'idempotence (insert ci-dessus) garantit
        // une application unique par event ; pas d'écriture cliente concurrente
        // sur eclats (RLS 0003). RPC atomique si le volume l'exige un jour.
        const { data: user, error: readError } = await supabase
          .from('users')
          .select('eclats')
          .eq('id', decision.userId)
          .single();
        if (readError || !user) throw new Error(`users read: ${readError?.message}`);
        const { error } = await supabase
          .from('users')
          .update({ eclats: (user.eclats as number) + decision.eclats })
          .eq('id', decision.userId);
        if (error) throw new Error(`users eclats update: ${error.message}`);
        // TODO starter_pack : créditer aussi le skin exclusif + 1 bouclier
        // (SPEC §5.1) quand l'inventaire skins et l'activation bouclier
        // existeront (semaine boutiques). Les Éclats, eux, sont crédités.
        break;
      }
    }

    return json({ applied: decision.kind, sku: decision.sku });
  } catch (err) {
    console.error('rc_webhook:', err);
    // 500 → RevenueCat retentera ; l'idempotence absorbe le rejeu.
    return json({ error: 'internal_error', message: `${err}` }, 500);
  }
});
