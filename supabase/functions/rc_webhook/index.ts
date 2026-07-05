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
import { SEASON_DURATION_WEEKS } from '../_shared/game-rules.ts';
import { mapRevenueCatEvent, type RevenueCatEvent } from './logic.ts';

const MS_PER_HOUR = 3_600_000;
const MS_PER_WEEK = 7 * 24 * MS_PER_HOUR;

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
    // ── Contexte crew (AMENDEMENT-16 §4) : les SKUs crew s'appliquent au crew
    // ACTIF de l'acheteur, résolu AVANT l'insert purchases (lecture seule).
    // Sans crew actif : achat enregistré en 'skipped' (anomalie loggée), pas
    // de retry RC — un retry infini ne rendrait pas un crew à l'acheteur.
    let crewId: string | null = null;
    const needsCrew = decision.kind === 'crew_boost' || decision.kind === 'crew_item';
    if (needsCrew) {
      const { data: membership, error: crewError } = await supabase
        .from('crew_members')
        .select('crew_id')
        .eq('user_id', decision.userId)
        .is('left_at', null)
        .maybeSingle();
      if (crewError) throw new Error(`crew_members read: ${crewError.message}`);
      crewId = membership?.crew_id ?? null;
    }
    const skipped = needsCrew && crewId === null;

    // ── Idempotence : l'insert purchases est LA barrière (rc_event_id unique) ─
    const { error: insertError } = await supabase.from('purchases').insert({
      user_id: decision.userId,
      sku: decision.sku,
      rc_event_id: decision.rcEventId,
      amount: decision.price,
      crew_id: crewId,
      status: skipped ? 'skipped' : 'applied',
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

    if (skipped) {
      console.error('rc_webhook: crew sku without active crew', decision.sku, decision.userId);
      return json({ applied: 'skipped', reason: 'no_active_crew', sku: decision.sku });
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
      case 'starter_pack':
      case 'founder_pack': {
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
        // Items des packs (0014, SKU_GRANTED_ITEM_KEYS) : upsert quantité +1.
        // Purement cosmétique/confort — jamais de territoire/points (§12).
        if (decision.itemKeys.length > 0) {
          const { error: grantError } = await supabase.rpc('grant_user_items', {
            p_user_id: decision.userId,
            p_item_keys: [...decision.itemKeys],
          });
          if (grantError) throw new Error(`grant_user_items rpc: ${grantError.message}`);
        }
        break;
      }
      case 'crew_boost': {
        // CREW_BOOST_MAX_ACTIVE = 1 : la fenêtre du nouveau boost s'ENCHAÎNE
        // après le dernier boost actif (jamais deux fenêtres ouvertes — le
        // moteur boostChestMultiplier prend de toute façon le max, pas le cumul).
        const now = new Date();
        const { data: lastActive, error: activeError } = await supabase
          .from('crew_boosts')
          .select('ends_at')
          .eq('crew_id', crewId!)
          .eq('status', 'active')
          .order('ends_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (activeError) throw new Error(`crew_boosts read: ${activeError.message}`);
        const chainedStart = lastActive && new Date(lastActive.ends_at) > now
          ? new Date(lastActive.ends_at)
          : now;

        let endsAt: Date;
        if (decision.durationH !== null) {
          endsAt = new Date(chainedStart.getTime() + decision.durationH * MS_PER_HOUR);
        } else {
          // Boost saison : jusqu'à la fin de la saison active du crew (city_id) ;
          // repli documenté : SEASON_DURATION_WEEKS si aucune saison active.
          const { data: crew, error: crewReadError } = await supabase
            .from('crews')
            .select('city_id')
            .eq('id', crewId!)
            .single();
          if (crewReadError || !crew) throw new Error(`crews read: ${crewReadError?.message}`);
          const { data: season, error: seasonError } = await supabase
            .from('seasons')
            .select('ends_at')
            .eq('city_id', crew.city_id)
            .eq('status', 'active')
            .maybeSingle();
          if (seasonError) throw new Error(`seasons read: ${seasonError.message}`);
          endsAt = season
            ? new Date(season.ends_at)
            : new Date(chainedStart.getTime() + SEASON_DURATION_WEEKS * MS_PER_WEEK);
        }

        // NB : le blackout de fin de saison n'empêche PAS l'enregistrement —
        // le moteur (boostChestMultiplier) neutralise l'effet pendant les
        // BOOST_BLACKOUT_END_OF_SEASON_H dernières heures, par construction.
        const { error: boostError } = await supabase.from('crew_boosts').insert({
          crew_id: crewId,
          boost_type: decision.boostType,
          activated_by_user_id: decision.userId,
          starts_at: chainedStart.toISOString(),
          ends_at: endsAt.toISOString(),
          multiplier: decision.multiplier,
          status: 'active',
        });
        if (boostError) throw new Error(`crew_boosts insert: ${boostError.message}`);
        break;
      }
      case 'crew_item': {
        // Gift au crew (§14) : l'acheteur est mémorisé pour le Crew Wall opt-in ;
        // l'anonymat (GIFT_ANONYMOUS_ALLOWED) est une affaire d'AFFICHAGE, jamais
        // de classement des payeurs ni de montant montré.
        const { error: grantError } = await supabase.rpc('grant_crew_item', {
          p_crew_id: crewId,
          p_item_key: decision.itemKey,
          p_by: decision.userId,
        });
        if (grantError) throw new Error(`grant_crew_item rpc: ${grantError.message}`);
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
