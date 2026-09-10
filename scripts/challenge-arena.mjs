/**
 * GRYD — PUBLIER (OU RETIRER) UNE ARÈNE DE DÉFI SUR LE PROJET DISTANT.
 *
 * ═══ POURQUOI CE SCRIPT EXISTE ══════════════════════════════════════════════
 * `challenge_arenas_2026` est vide en production : sans arène, la tuile
 * « Défis de crew » est un cul-de-sac. 0151 pose la voie (dérivation depuis une
 * géographie RÉELLE), mais elle est réservée à `service_role` — donc
 * injoignable depuis l'app, et c'est voulu. Restait à pouvoir l'appeler.
 * `psql` n'est pas installé sur la machine du fondateur ; `pg` (devDependency
 * déjà présente pour `verify:rls`) est le seul chemin disponible.
 *
 * ═══ CE QU'IL NE FAIT PAS ═══════════════════════════════════════════════════
 * Il n'invente aucune géométrie, aucun nom de lieu, aucun fuseau : tout vient
 * soit du serveur (les trois secteurs), soit de la ligne de commande (les noms,
 * la revue d'accès, l'opérateur). Par DÉFAUT il ne fait qu'une PROPOSITION À
 * BLANC, qui n'écrit rien : publier demande `--publish` ET les noms.
 *
 * ═══ HORS DU GATE ═══════════════════════════════════════════════════════════
 * Réseau + secret (`GRYD_SUPABASE_DB_URL`, jamais commité). À lancer après un
 * `supabase migration list` puis `supabase db push`.
 *
 *   set -a && . ./scratchpad-secrets.local && set +a
 *   node scripts/challenge-arena.mjs --commune 76540 --activity run
 *   node scripts/challenge-arena.mjs --commune 76540 --activity run --publish \
 *     --title "Rouen — rive droite" --time-zone Europe/Paris \
 *     --sectors "Les Quais|Jardin des Plantes|Rive Gauche" \
 *     --access-source "Revue de terrain du 10/09/2026" --operator fondateur
 *   node scripts/challenge-arena.mjs --retire fr-76540-run-v1 \
 *     --operator fondateur --reason "travaux sur les quais"
 */
import pg from 'pg';
import { CHALLENGE_RULES_2026, CITY_DISC_RADIUS_M } from '../packages/shared/src/game-rules.ts';

const url = process.env.GRYD_SUPABASE_DB_URL;
if (!url) {
  console.error('GRYD_SUPABASE_DB_URL manquant. Charge scratchpad-secrets.local avant de lancer.');
  process.exit(2);
}
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null; };
const has = (name) => argv.includes(`--${name}`);

const activity = flag('activity') ?? 'run';
if (!['run', 'bike'].includes(activity)) { console.error('--activity : run ou bike.'); process.exit(2); }
// Les paramètres géométriques SONT les constantes partagées, jamais des choix
// de ligne de commande : un réglage local produirait une arène hors règles.
const trace = CHALLENGE_RULES_2026.minimumTraceInsideSectorM[activity];
const geometry = [CITY_DISC_RADIUS_M, trace, trace, CHALLENGE_RULES_2026.sectorCount];

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await c.connect();
try {
  const retire = flag('retire');
  if (retire) {
    const operator = flag('operator'); const reason = flag('reason');
    if (!operator || !reason) { console.error('--retire exige --operator et --reason.'); process.exit(2); }
    const r = await c.query('select public.retire_challenge_arena_2026($1,$2,$3) result', [retire, operator, reason]);
    console.log(JSON.stringify(r.rows[0].result, null, 2));
  } else {
    const commune = flag('commune');
    if (!commune) { console.error('--commune <code INSEE> est requis.'); process.exit(2); }
    const version = Number(flag('version') ?? 1);
    const arenaId = `fr-${commune}-${activity}-v${version}`;
    if (!has('publish')) {
      // PROPOSITION À BLANC : aucune écriture, la transaction est en lecture seule.
      await c.query('set default_transaction_read_only = on');
      const r = await c.query('select public.propose_challenge_arenas_2026($1,$2,$3,$4,$5,$6,$7) result', [arenaId, commune, activity, ...geometry]);
      console.log(JSON.stringify(r.rows[0].result, null, 2));
      console.log('\nProposition seule — RIEN n’a été écrit. Relis `source`, `footprintName`, `footprintCommunes`,');
      console.log('`possessionsFound`, `areaRatio`, et chaque `countableAreaM2` avant de publier avec --publish.');
    } else {
      const titles = (flag('sectors') ?? '').split('|').map((t) => t.trim()).filter(Boolean);
      const title = flag('title'); const timeZone = flag('time-zone'); const accessSource = flag('access-source'); const operator = flag('operator');
      if (titles.length !== CHALLENGE_RULES_2026.sectorCount || !title || !timeZone || !accessSource || !operator) {
        console.error(`--publish exige --title, --time-zone, --access-source, --operator et --sectors "a|b|c" (${CHALLENGE_RULES_2026.sectorCount} noms de lieux RÉELS, dans l'ordre west|centre|east).`);
        process.exit(2);
      }
      const reviewedAt = flag('reviewed-at') ?? new Date().toISOString();
      const r = await c.query('select public.publish_challenge_arena_2026($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) result',
        [arenaId, commune, activity, timeZone, title, titles, accessSource, reviewedAt, operator, ...geometry]);
      console.log(JSON.stringify(r.rows[0].result, null, 2));
    }
  }
} catch (error) {
  // Les motifs de 0151 (`no_real_geography`, `unknown_commune`, `sectors_too_small`,
  // `sector_titles_required`…) sont des réponses utiles : les rendre telles quelles.
  console.error(`REFUS : ${error.message}`);
  process.exitCode = 1;
} finally { await c.end(); }
