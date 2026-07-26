/**
 * GRYD — LES LECTEURS DE TERRITOIRE NE SOMMENT PLUS LES DEUX MONDES.
 *
 * Les fonctions PURES sont testées à côté (logic_test.ts). Ce fichier-ci tient
 * le reste : les REQUÊTES et le SQL, qui ne sont pas des fonctions et qu'aucun
 * test ne peut exécuter ici (ni base Postgres, ni PGlite installé dans ce
 * dépôt). Il les lit donc comme du TEXTE — c'est une preuve d'INTENTION des
 * fichiers, pas une exécution ; dit tel quel, à la manière de
 * `_shared/activity_scope_test.ts` pour la migration 0070.
 *
 * Ce que ces assertions empêchent, très concrètement :
 *   · qu'un `select` sur `hex_claims` reparte sans `activity`, et qu'un récap
 *     hebdo réannonce « 12 zones gagnées » pour 7 à pied + 5 à vélo (E14 :
 *     « jamais Run + Bike dans une même lecture compétitive… JAMAIS sommées ») ;
 *   · qu'une fenêtre de bonus se rouvre sans monde, et qu'une zone VÉLO qui
 *     s'efface ouvre une « Défense critique » qu'une course peut réclamer ;
 *   · que `crew_overview()` recompte les LIGNES de claim au lieu des
 *     hexagones, et regonfle le territoire d'un joueur complet.
 *
 * POURQUOI CE FICHIER VIT DANS digest_job/ : c'est le périmètre de ce lot, et
 * digest_job est le seul écrivain de `active_bonuses.activity`. La partie
 * `crew_overview` y est logée faute de meilleur voisin sous
 * `supabase/functions/` — le jour où un dossier de tests de migrations existe,
 * elle y déménage sans rien perdre.
 */
import { assert } from 'jsr:@std/assert@^1';

const readFile = (relative: string): string =>
  Deno.readTextFileSync(new URL(relative, import.meta.url));

/** Normalise les espaces : le code se lit sur son SENS, pas sur son indentation. */
const flat = (src: string): string => src.replace(/\s+/g, ' ');

const DIGEST_INDEX = flat(readFile('./index.ts'));
const DECAY_INDEX = flat(readFile('../decay_job/index.ts'));
const MIGRATION_0071 = flat(readFile('../../migrations/0071_activity_reads_discipline.sql'));

// ════════════════════════════════════════════════════════════════════════════
// 1. LES REQUÊTES DES JOBS — une lecture de territoire lit son monde
// ════════════════════════════════════════════════════════════════════════════

Deno.test('digest_job : aucun `select` sur hex_claims ne repart sans `activity`', () => {
  // On isole chaque chaîne `.select('…')` qui suit un `.from('hex_claims')`.
  const reads = [...DIGEST_INDEX.matchAll(/from\('hex_claims'\) \.select\('([^']*)'\)/g)];
  assert(reads.length >= 2, `attendu ≥ 2 lectures hex_claims, trouvé ${reads.length}`);
  for (const [, columns] of reads) {
    assert(
      columns.split(',').map((c) => c.trim()).includes('activity'),
      `une lecture de hex_claims ne demande pas la discipline (« ${columns} ») : ` +
        `les deux mondes retomberaient dans le même compteur.`,
    );
  }
});

Deno.test('digest_job : le récap hebdo étiquette ses comptes de zones par monde', () => {
  assert(
    DIGEST_INDEX.includes("add(uid, { type: 'hexes_gained', count, activity });"),
    'Les hexes gagnés doivent porter leur discipline jusqu’au digest.',
  );
  assert(
    DIGEST_INDEX.includes("add(uid, { type: 'hexes_defended', count, activity });"),
    'Les hexes défendus aussi — c’est le même territoire.',
  );
});

Deno.test('digest_job : une fenêtre de bonus déclare son monde (ou son absence de monde)', () => {
  assert(
    DIGEST_INDEX.includes("insertBonusIfAbsent( 'crew', crewId, 'defense_critical', world, now)") ||
      DIGEST_INDEX.includes("insertBonusIfAbsent('crew', crewId, 'defense_critical', world, now)"),
    'La Défense critique doit s’ouvrir DANS le monde de la zone menacée.',
  );
  assert(
    DIGEST_INDEX.includes("insertBonusIfAbsent('crew', crewId, 'finisher', world, now)"),
    'Le Finisher doit s’ouvrir dans le monde de la frontière (0070).',
  );
  assert(
    DIGEST_INDEX.includes("'crew_chest', null, now)"),
    'Le Coffre crew n’a PAS de monde : `null` explicite, jamais un « run » par défaut.',
  );
  assert(
    DIGEST_INDEX.includes('activity,') && DIGEST_INDEX.includes("from('active_bonuses').insert({"),
    'La discipline doit être ÉCRITE dans active_bonuses, pas seulement calculée.',
  );
});

Deno.test('digest_job : « zones perdues » lit le PAYLOAD, plus le nombre de lignes', () => {
  assert(
    DIGEST_INDEX.includes(".select('user_id, payload')") &&
      DIGEST_INDEX.includes(".eq('type', 'steal')"),
    'Sans le payload, le job ne peut compter que des LIGNES — et une ligne de ' +
      'vol agrège plusieurs hexagones (steal_push_job:inboxRow).',
  );
  assert(
    !/for \(const s of steals \?\? \[\]\) lost\.set/.test(DIGEST_INDEX),
    'Le comptage « une ligne = une zone perdue » ne doit pas revenir.',
  );
  assert(
    DIGEST_INDEX.includes('buildZonesLost(stealRows,'),
    'La décision (chiffrer ou s’abstenir) appartient à la fonction PURE testée ' +
      'dans zones_lost_test.ts, pas à une boucle d’I/O.',
  );
  assert(
    DIGEST_INDEX.includes("from('season_scores') .select('user_id, activity')"),
    'Trancher un `payload.activity` null exige de savoir si le joueur a DEUX ' +
      'mondes — même source, et même raison de la choisir, que steal_push_job.',
  );
  assert(
    DIGEST_INDEX.includes('lost.unquantifiable.length > 0'),
    'Une abstention se compte : sinon « aucune zone perdue » et « on n’a pas ' +
      'su le dire » deviennent indiscernables dans les métriques.',
  );
});

Deno.test('decay_job : aucun compte « tous mondes confondus » ne quitte le job', () => {
  assert(
    !/w\.hexCount/.test(DECAY_INDEX),
    'Le `hexCount` mêlé a été supprimé de DecayWarning : plus aucun appelant ne ' +
      'doit pouvoir le réintroduire par copie.',
  );
  assert(
    DECAY_INDEX.includes('byActivity: w.perActivity.map('),
    'Le payload de l’inbox doit porter les comptes PAR MONDE.',
  );
  assert(
    DECAY_INDEX.includes('warnedHexesByActivity:'),
    'Même l’observabilité du job se lit par monde — un total mêlé ferait mentir ' +
      'les métriques comme il faisait mentir la notification.',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LA MIGRATION 0071 — le SQL, lu comme du texte
// ════════════════════════════════════════════════════════════════════════════

Deno.test('0071 : crew_overview compte des HEXAGONES, plus des lignes de claim', () => {
  assert(
    MIGRATION_0071.includes('count(distinct hc.h3index)::integer as hexes_held'),
    'Sans `distinct`, un joueur qui tient le même hexagone à pied ET à vélo ' +
      'compte deux fois — la carte Crew affiche alors une emprise que la carte ' +
      'ne montre pas.',
  );
  assert(
    MIGRATION_0071.includes('select distinct cm.crew_id, cm.user_id, hc.h3index'),
    'Le rang de ville doit compter EXACTEMENT la même unité que hexesHeld, ' +
      'sinon un crew est classé sur une règle et affiché sur une autre.',
  );
});

Deno.test('0071 : crew_overview expose la lecture DISCIPLINÉE à côté du total', () => {
  assert(
    MIGRATION_0071.includes(
      "'hexesByActivity', jsonb_build_object('run', v_hexes_run, 'bike', v_hexes_bike)",
    ),
    'Le détail par monde est la seule lecture conforme à E14 ; il doit exister ' +
      'côté serveur même avant que l’écran sache l’afficher.',
  );
  assert(
    MIGRATION_0071.includes("filter (where hc.activity = 'run')") &&
      MIGRATION_0071.includes("filter (where hc.activity = 'bike')"),
    'Chaque monde se compte chez lui.',
  );
});

Deno.test('0071 : le contrat de retour de crew_overview est PRÉSERVÉ (l’app le lit)', () => {
  for (
    const key of [
      "'ok', true",
      "'hexesHeld', v_hexes_held",
      "'lastCaptureAt', v_last_capture",
      "'cityRank', v_city_rank",
      "'crewsInCity', v_crews_in_city",
      "'members', v_members",
      "'contributionPct'",
      "'reason', 'no_crew'",
      "'reason', 'signed_out'",
    ]
  ) {
    assert(
      MIGRATION_0071.includes(key),
      `apps/mobile/src/features/crew/real.ts lit « ${key} » : le retirer casse la carte Crew.`,
    );
  }
  assert(
    !/'code',/.test(MIGRATION_0071),
    'Le code du crew ne sort JAMAIS de crew_overview (0036/0044 choix n°4).',
  );
  assert(
    MIGRATION_0071.includes('u.deletion_requested_at is null'),
    'Le filtre d’invisibilité de 0046 doit survivre à la redéfinition — deux ' +
      'fois : roster ET rang de ville.',
  );
  assert(
    MIGRATION_0071.split('u.deletion_requested_at is null').length - 1 >= 2,
    'Une seule occurrence signifierait que le rang de ville a reperdu le filtre.',
  );
});

Deno.test('0071 : active_bonuses porte une discipline NULLABLE (null = sans monde)', () => {
  assert(
    MIGRATION_0071.includes('alter table public.active_bonuses add column if not exists activity text'),
    'Sans colonne, la discipline d’une fenêtre ne peut pas être écrite.',
  );
  assert(
    MIGRATION_0071.includes("check (activity is null or activity in ('run', 'bike'))"),
    'NULL doit rester LÉGAL : le coffre crew n’a pas de monde, et lui coller ' +
      '« run » par défaut inventerait une information.',
  );
  assert(
    !/add column activity text not null/.test(MIGRATION_0071),
    'Un NOT NULL DEFAULT \'run\' étiquetterait « course à pied » des fenêtres ' +
      'qui n’en sont pas — exactement le genre de repli que le projet interdit.',
  );
});

Deno.test('0071 : la migration 0070 n’est ni réécrite ni contredite', () => {
  // Une migration appliquée n'est jamais réécrite (loi du projet). 0071 est
  // ADDITIVE : elle ne retouche ni la clé composite, ni claim_hexes, ni les
  // colonnes `activity` posées en 0070.
  assert(!MIGRATION_0071.includes('hex_claims_pkey'), '0071 ne touche pas la clé de hex_claims.');
  assert(
    !/alter table public\.hex_claims/.test(MIGRATION_0071),
    '0071 ne modifie pas hex_claims : elle change qui la LIT, pas ce qu’elle est.',
  );
  assert(
    !/create or replace function public\.claim_hexes/.test(MIGRATION_0071),
    '0071 ne redéfinit pas claim_hexes (le claim reste tel que 0070 l’a déployé).',
  );
});

Deno.test('0071 : sector_snapshot reste INTOUCHÉE, et le dit', () => {
  // Sa clé primaire est `sector_id` SEUL : la discipliner enverrait deux lignes
  // par secteur au lecteur mobile (features/map/useSectorSnapshots.ts). C'est un
  // chantier CONJOINT schéma + carte — hors de ce lot, et écrit noir sur blanc
  // pour que personne ne croie la lecture des secteurs déjà propre.
  assert(
    !/alter table public\.sector_snapshot|create (or replace )?(materialized )?view public\.sector_snapshot/
      .test(MIGRATION_0071),
    'Toucher sector_snapshot sans toucher la carte casserait la carte.',
  );
  assert(
    MIGRATION_0071.includes('sector_snapshot'),
    'Le suspens doit être NOMMÉ dans la migration : une limite tue est une ' +
      'limite que le prochain lecteur croira levée.',
  );
});
