/**
 * GRYD — Edge Function challenges_arena_2026 (exploitation, service_role seul).
 *
 * LA VOIE DE PUBLICATION D'UNE ARÈNE DE DÉFI. Trois actions, toutes explicites :
 *   · `propose` — à BLANC : dérive trois secteurs d'une géographie réelle et
 *     rend la proposition (source, aires, portées, possessions comptées,
 *     chevauchements interdits, avertissements). N'écrit rien.
 *   · `publish` — publie la MÊME dérivation, avec le fuseau, le titre, les
 *     trois noms de lieux réels, la source de la revue d'accès, sa date et
 *     l'opérateur. Journalisée en base (0151).
 *   · `retire`  — retire une arène publiée (immuable) et journalise le motif.
 *
 * AUCUNE AUTOMATISATION. Rien ici n'est appelé par un cron : une arène naît
 * d'une décision humaine, sur une commune où des gens courent vraiment. Aucun
 * secret n'est écrit dans ce fichier ; la clé de service est lue de
 * l'environnement et comparée en temps constant.
 *
 * Toute la validation vit dans logic.ts (testée par `npm run test:functions`) ;
 * ce fichier ne fait que de l'I/O.
 */
import { createClient } from 'npm:@supabase/supabase-js@^2';
import { secretsMatch } from '../_shared/secret.ts';
import { arenaJournalLine2026, arenaRpcArguments2026, parseArenaCommand2026 } from './logic.ts';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  // Exploitation : la clé de service est le seul porteur admis. Un compte
  // authentifié ordinaire n'a de toute façon aucun droit sur les RPC de 0151.
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!key || !secretsMatch(bearer, key)) return json({ error: 'unauthorized' }, 401);

  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: 'invalid_body' }, 400); }
  const parsed = parseArenaCommand2026(body, Date.now());
  if (!parsed.ok) return json({ error: 'invalid_request', reason: parsed.reason }, 400);

  const { rpc, args } = arenaRpcArguments2026(parsed.command);
  console.log(arenaJournalLine2026(parsed.command, new Date().toISOString()));
  const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.rpc(rpc, args);
  if (error) {
    // Le motif SQL est rendu tel quel : `no_real_geography`, `unknown_commune`,
    // `sectors_too_small`, `invalid_sector_geometry`… sont des réponses utiles,
    // pas des pannes à masquer derrière un 500 muet.
    console.error(`challenges_arena_2026 ${rpc}:`, error.message);
    return json({ error: 'refused', rpc, reason: error.message }, 422);
  }
  return json({ action: parsed.command.action, rpc, result: data });
});
