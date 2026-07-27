/**
 * GRYD — E14 : ce que le commutateur Run / Bike doit tenir, prouvé.
 *
 * Deux familles de tests, et les deux comptent :
 *   1. les RÈGLES DÉRIVÉES (mémoire par onglet, verrouillage, éligibilité,
 *      séparation stricte, déclaration de discipline au départ) — des fonctions
 *      pures, vérifiées comme telles ;
 *   2. des GARDE-FOUS DE SOURCE, sur le modèle de
 *      `features/social/activityScoping.test.ts` : les lectures clients doivent
 *      RÉELLEMENT porter `.eq('activity', …)`, et les écrans propagés doivent
 *      RÉELLEMENT basculer une lecture plutôt qu'une étiquette. Ces gardes
 *      échouent sur le code d'avant le correctif — c'est ce qui empêche le
 *      défaut de revenir en silence.
 *
 * ─── CE QUI A CHANGÉ LE 26/07/2026, ET POURQUOI CE FICHIER A ÉTÉ RÉÉCRIT ────
 * Ce fichier verrouillait la thèse inverse : « seule la course à pied est
 * enregistrable » (`RECORDED_ACTIVITIES`), « les deux segments ne sont PAS des
 * pairs » (la marque « PAS ENCORE »), et un tripwire qui exigeait du départ
 * qu'il déclare TOUJOURS `run`. Ce tripwire a fait son travail : il annonçait
 * que « le jour où le départ cesse de déclarer run, ce fichier ET la copie des
 * états vides doivent être revus ». Ce jour est arrivé (décision fondateur :
 * « il faut tout brancher pour que la partie bike fonctionne dès maintenant »),
 * la copie a été revue, et le tripwire est REMPLACÉ — pas supprimé — par deux
 * gardes qui protègent le risque du moment :
 *   · un écran qui affiche une lentille SANS borner sa LECTURE ;
 *   · un chemin de départ MUET qui basculerait dans un autre monde.
 * Le second est celui que le lot « départ » a rétréci ici même : on le conserve
 * mot pour mot dans son intention.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, ACTIVITY_SCOPE, DEFAULT_ACTIVITY } from '@klaim/shared';
import { START_ACTIVITY_PARAM } from '../features/run/gps/runActivity.ts';
import { LOCALES } from '../i18n/types.ts';
import { C as MAP } from '../i18n/catalog/map.ts';
import { C as HIST } from '../i18n/catalog/historique.ts';
import { C as PERF } from '../i18n/catalog/performance.ts';
import { C as SAISON } from '../i18n/catalog/saison.ts';
import {
  ACTIVITY_LABELS,
  ACTIVITY_SEGMENT_HEIGHT,
  ACTIVITY_SURFACES,
  ACTIVITY_SWITCH_GEOMETRY,
  ACTIVITY_SWITCH_HEIGHT,
  ACTIVITY_SWITCH_WIDTH,
  activitySegments,
  activityStorageKey,
  activitySwitchVisible,
  competitiveReadAllowed,
  effectiveActivity,
  estimateUppercaseWidth,
  parseActivity,
  startSortieHref,
  withStartActivity,
} from './activityLens.ts';

// ─── 1. Mémoire PAR ONGLET (planche : « le choix est mémorisé par onglet ») ───

Deno.test('une clé de stockage DISTINCTE par surface : aucune lentille n’en téléporte une autre', () => {
  const keys = ACTIVITY_SURFACES.map(activityStorageKey);
  assertEquals(new Set(keys).size, ACTIVITY_SURFACES.length);
});

Deno.test('la Carte GARDE sa clé historique : un choix déjà persisté n’est jamais effacé', () => {
  // Renommer cette clé effacerait la lentille que le joueur a réellement
  // choisie sur son téléphone — la migration ne se réécrit jamais.
  assertEquals(activityStorageKey('map'), 'gryd.mapactivity');
  assertEquals(activityStorageKey('classement'), 'gryd.activity.classement');
  assertEquals(activityStorageKey('historique'), 'gryd.activity.historique');
  assertEquals(activityStorageKey('stats'), 'gryd.activity.stats');
});

Deno.test('les 4 surfaces de la planche E14 sont couvertes, et elles seules', () => {
  assertEquals([...ACTIVITY_SURFACES], ['map', 'classement', 'historique', 'stats']);
});

// ─── 2. Lecture défensive du réglage persisté ────────────────────────────────

Deno.test('parseActivity n’accepte QUE les disciplines connues', () => {
  for (const a of ACTIVITIES) assertEquals(parseActivity(a), a);
  for (const bad of [null, undefined, '', 'RUN', 'walk', 'bike ']) {
    assertEquals(parseActivity(bad), null, `« ${String(bad)} » ne doit pas passer`);
  }
});

// ─── 3. Éligibilité + VERROUILLAGE pendant une sortie ────────────────────────

Deno.test('masqué — jamais grisé — quand Bike n’est pas activé', () => {
  assertEquals(activitySwitchVisible({ bikeEnabled: false, runLive: false }), false);
  assertEquals(activitySwitchVisible({ bikeEnabled: false, runLive: true }), false);
});

Deno.test('VERROUILLÉ pendant une sortie : le commutateur disparaît, il ne se grise pas', () => {
  assertEquals(activitySwitchVisible({ bikeEnabled: true, runLive: true }), false);
  assertEquals(activitySwitchVisible({ bikeEnabled: true, runLive: false }), true);
});

Deno.test('le verrou n’ENFERME PAS : pendant une sortie, la lentille montre le monde de la sortie', () => {
  // Le piège que ce comportement retire : lentille Bike mémorisée + sortie en
  // cours = mauvais monde SANS commutateur pour en sortir. Un cul-de-sac.
  assertEquals(effectiveActivity('bike', 'run'), 'run');
  assertEquals(effectiveActivity('run', 'run'), 'run');
});

Deno.test('la lentille suit la sortie VÉLO aussi — pas une constante « run »', () => {
  // Le point de bascule du 26/07/2026 : avant, l'appelant passait
  // `RECORDED_ACTIVITIES[0]` (= 'run') dès qu'une sortie tournait. Chez un
  // cycliste, l'écran serait passé sur le territoire de COURSE pendant tout
  // son effort — et il n'aurait vu aucune de ses captures arriver.
  assertEquals(effectiveActivity('run', 'bike'), 'bike');
  assertEquals(effectiveActivity('bike', 'bike'), 'bike');
});

Deno.test('discipline de la sortie INCONNUE ⇒ la préférence fait foi (on ne devine pas)', () => {
  // `null` = buffer d'avant le vélo, ou stockage illisible. Retomber sur un
  // défaut ferait basculer tout un écran sur un monde qui n'est peut-être pas
  // le sien — une affirmation tirée d'une absence d'information.
  assertEquals(effectiveActivity('bike', null), 'bike');
  assertEquals(effectiveActivity('run', null), 'run');
});

// ─── 4. DÉCLARATION DE DISCIPLINE AU DÉPART (le garde-fou du 25/07, tenu) ────
//
// L'arbitrage à ne jamais perdre : une PRÉFÉRENCE D'AFFICHAGE ne décide pas EN
// SILENCE de la NATURE d'un effort enregistré. Le vélo étant devenu réel, la
// réponse n'est plus « tout le monde déclare run » mais « l'écran DÉCLARE, et
// le préflight AFFICHE ». Ces tests verrouillent la moitié « l'écran déclare ».

Deno.test('la discipline par DÉFAUT n’ajoute rien à l’URL (aucun chemin existant ne change de sens)', () => {
  assertEquals(
    withStartActivity('/course-live?mode=conquete', DEFAULT_ACTIVITY),
    '/course-live?mode=conquete',
  );
  assertEquals(withStartActivity('/course-live', DEFAULT_ACTIVITY), '/course-live');
});

Deno.test('une discipline NON par défaut est écrite dans l’URL, avec le bon séparateur', () => {
  assertEquals(
    withStartActivity('/course-live?mode=conquete', 'bike'),
    `/course-live?mode=conquete&${START_ACTIVITY_PARAM}=bike`,
  );
  assertEquals(
    withStartActivity('/course-live', 'bike'),
    `/course-live?${START_ACTIVITY_PARAM}=bike`,
  );
});

Deno.test('le nom du paramètre vient du DOMAINE DU DÉPART, jamais d’une chaîne recopiée', () => {
  // Si `runActivity.ts` renommait son paramètre, une copie locale « activity »
  // continuerait de compiler et la sortie repartirait en course à pied SANS
  // aucune erreur. Ce test échoue à la place.
  assert(startSortieHref('bike').includes(`${START_ACTIVITY_PARAM}=bike`));
});

Deno.test('le départ lancé depuis un écran non-Carte est le MÊME départ que GO', () => {
  // Un « lance ta première sortie » qui partirait sur un autre mode ferait deux
  // départs différents dans la même app, pour la même intention.
  assertEquals(startSortieHref(DEFAULT_ACTIVITY), '/course-live?mode=conquete');
});

Deno.test(
  'TRIPWIRE — le DÉFAUT d’un chemin de départ muet reste la course à pied',
  async () => {
    // On lit la DÉCLARATION, pas un commentaire : les blocs et les lignes de
    // commentaire sont retirés d'abord (l'en-tête de runActivity.ts cite
    // justement `Extract<Activity, 'run'>` en prose — un `includes` naïf
    // passerait sur la prose et ne prouverait rien).
    //
    // PORTÉE RÉTRÉCIE LE 26/07/2026 (lot « départ d'une sortie vélo »). Ce
    // tripwire gardait une affirmation plus large — « le départ ne déclare QUE
    // run » — qui n'est plus vraie : le préflight peut désormais déclarer
    // `bike`, et le montre au joueur avant le premier mètre. Ce qu'il garde est
    // plus étroit et toujours vrai : un chemin qui ne déclare RIEN vaut la
    // course à pied, parce qu'un chemin muet est un chemin antérieur au vélo.
    const url = new URL('../features/run/gps/runActivity.ts', import.meta.url);
    const code = (await Deno.readTextFile(url))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    assert(
      /UNDECLARED_START_ACTIVITY\s*:\s*Extract<Activity,\s*'run'>/.test(code),
      'le défaut d’un chemin muet DOIT rester typé Extract<Activity,\'run\'> : ' +
        'l’élargir ferait basculer en silence des sorties non déclarées dans un autre monde',
    );
  },
);

// ─── 5. SÉPARATION STRICTE : jamais Run + Bike dans une lecture compétitive ──

Deno.test('une source DISCIPLINÉE (0070) est lisible sous les deux lentilles', () => {
  for (const a of ACTIVITIES) assertEquals(competitiveReadAllowed(a, true), true);
});

Deno.test('une source MONO-POT ne s’affiche que sous la lentille par défaut', () => {
  // `specialty_leaderboard` (user_stats), `user_badges` et `sector_snapshot`
  // (PK `sector_id` seul, 0037) mélangent les disciplines — 0070 « en suspens »
  // §2/§3. Les servir sous une étiquette vélo serait la somme interdite.
  assertEquals(competitiveReadAllowed('run', false), true);
  assertEquals(competitiveReadAllowed('bike', false), false);
});

Deno.test('la table de portée est celle du moteur : territoire séparé, NIVEAU global', () => {
  // Override fondateur du 26/07/2026, tracé dans game-rules et PLANCHES.md §E12.
  // Ce test est le rappel côté client : un agent qui « corrigerait » l'XP en la
  // scindant par discipline casserait ici avant de casser en production.
  assertEquals(ACTIVITY_SCOPE.territory, 'per_activity');
  assertEquals(ACTIVITY_SCOPE.history, 'per_activity');
  assertEquals(ACTIVITY_SCOPE.seasonPoints, 'per_activity');
  assertEquals(ACTIVITY_SCOPE.xp, 'global');
  assertEquals(ACTIVITY_SCOPE.level, 'global');
  assertEquals(ACTIVITY_SCOPE.streak, 'global');
});

// ─── 6. GARDE-FOUS DE SOURCE : la lentille borne les LECTURES, pas l'étiquette ─

async function source(relPath: string): Promise<string> {
  return await Deno.readTextFile(new URL(relPath, import.meta.url));
}

/**
 * Fenêtre d'une requête : du `.from('table')` à la fin de SA chaîne.
 *
 * Deux précautions, apprises l'une après l'autre :
 *  1. les commentaires sont retirés d'abord — un `;` dans une explication en
 *     français couperait la chaîne au mauvais endroit et rendrait le garde-fou
 *     menteur ;
 *  2. la fenêtre s'arrête au premier `;` OU au prochain `.from('`, selon ce qui
 *     vient en premier. `economy.ts` lance DEUX lectures dans un même
 *     `Promise.all([...])`, donc un seul `;` pour les deux : sans cette borne,
 *     le `.eq('activity')` de `season_scores` était attribué à la lecture de
 *     `users` — et le test « users n'est PAS filtré » échouait sur du code
 *     parfaitement correct. Un garde-fou qui se trompe de fenêtre est pire
 *     qu'aucun garde-fou : il fait « corriger » ce qui n'est pas cassé.
 */
async function queryChain(relPath: string, table: string): Promise<string> {
  const raw = await source(relPath);
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const from = src.indexOf(`.from('${table}')`);
  assert(from >= 0, `${relPath} : aucune lecture de ${table} trouvée`);
  const semi = src.indexOf(';', from);
  const nextFrom = src.indexOf(".from('", from + 1);
  const end = nextFrom >= 0 && (semi < 0 || nextFrom < semi) ? nextFrom : semi;
  assert(end > from, `${relPath} : chaîne de requête ${table} non terminée`);
  return src.slice(from, end);
}

/**
 * LE TRIPWIRE DE LA LENTILLE — celui qui remplace « le départ déclare run ».
 *
 * Ce qu'il protège : depuis que le vélo enregistre, une lecture non bornée ne
 * « ne montre rien ». Elle PEINT LES ZONES VÉLO COMME DES ZONES DE COURSE (clé
 * primaire composite `(h3index, activity)` depuis 0070) et double l'aire d'un
 * hexagone tenu dans les deux mondes. La déduplication de `territoryBuild.ts`
 * reste la CEINTURE (elle évite le crash) ; ce filtre est la correction, et
 * rien d'autre ne le rappellerait au prochain agent.
 */
const DISCIPLINED_READS: readonly { path: string; table: string; why: string }[] = [
  {
    path: '../features/map/hexClaims.ts',
    table: 'hex_claims',
    why: 'c’est CE hook qui peint le territoire sur sept surfaces',
  },
  {
    path: '../features/mission/useRealMissionCore.ts',
    table: 'hex_claims',
    why: 'une échéance de decay vélo déclencherait une mission dans la lentille course',
  },
  {
    path: '../features/history/real.ts',
    table: 'runs',
    why: 'l’écran promet « TOUS tes parcours » — d’UNE discipline',
  },
  {
    path: '../features/performance/stats/useStats.ts',
    table: 'runs',
    why: 'sinon les km à pied et à vélo tombent dans le même « 24,6 km »',
  },
  {
    path: '../features/performance/real.ts',
    table: 'runs',
    why: 'lecture sans appelant aujourd’hui : sans filtre, elle piège le prochain écran',
  },
  {
    path: '../features/social/leagueBoard.ts',
    table: 'player_leaderboard',
    why: 'un joueur hybride occuperait DEUX places et décalerait les autres',
  },
  {
    path: '../features/social/economy.ts',
    table: 'season_scores',
    why: '« tes points » deviendrait le MEILLEUR des deux mondes, sans dire lequel',
  },
];

Deno.test('toute lecture d’une source DISCIPLINÉE porte .eq(activity)', async () => {
  for (const read of DISCIPLINED_READS) {
    const chain = await queryChain(read.path, read.table);
    assert(
      chain.includes(".eq('activity'"),
      `${read.path} → ${read.table} : filtre de discipline MANQUANT (${read.why})`,
    );
  }
});

/**
 * LE PENDANT, tout aussi important : les dimensions GLOBALES ne doivent PAS être
 * filtrées. Un agent qui « met le vélo au propre » en ajoutant `.eq('activity')`
 * partout scinderait l'XP et la série — l'exact inverse de la décision
 * fondateur, et une faute SILENCIEUSE (les chiffres restent plausibles).
 */
Deno.test('les dimensions GLOBALES ne sont PAS filtrées par discipline', async () => {
  const usersChain = await queryChain('../features/social/economy.ts', 'users');
  assertEquals(
    usersChain.includes(".eq('activity'"),
    false,
    'users porte xp/foulees/streak_weeks : GLOBAUX (override fondateur 26/07/2026, ACTIVITY_SCOPE)',
  );
  const streakChain = await queryChain('../features/social/streak.ts', 'runs');
  assertEquals(
    streakChain.includes(".eq('activity'"),
    false,
    'la série mesure la CONSTANCE d’une personne, pas la pratique d’un sport (ACTIVITY_SCOPE.streak)',
  );
});

Deno.test('les lectures globales DISENT qu’elles le sont (sinon le prochain agent « corrige »)', async () => {
  for (const path of ['../features/social/economy.ts', '../features/social/streak.ts']) {
    const src = await source(path);
    assert(
      src.includes('ET C’EST VOLONTAIRE') || src.includes("ET C'EST VOLONTAIRE"),
      `${path} : une absence de filtre non expliquée se lit comme un oubli`,
    );
  }
});

// ─── 7. LES TROIS SURFACES PROPAGÉES BASCULENT UNE LECTURE, PAS UNE ÉTIQUETTE ─

const PROPAGATED: readonly { path: string; label: string; hook: string }[] = [
  {
    path: '../../app/(tabs)/classement.tsx',
    label: 'Classement (E11/E12)',
    hook: 'useSeasonLeaderboard(activity)',
  },
  { path: '../../app/historique.tsx', label: 'Historique', hook: 'useMyRunHistory(activity)' },
  { path: '../../app/performance.tsx', label: 'Statistiques (E18)', hook: 'useStats(activity)' },
];

Deno.test('les trois surfaces portent le commutateur et sa mémoire par onglet', async () => {
  for (const s of PROPAGATED) {
    const src = await source(s.path);
    assert(
      src.includes('useActivityLens('),
      `${s.label} : ni mémoire par onglet, ni éligibilité dérivée (flags.bike + verrou de sortie)`,
    );
    assert(src.includes('<ActivitySwitch'), `${s.label} : aucun commutateur rendu`);
    assert(
      src.includes('switchVisible'),
      `${s.label} : le commutateur n’est pas retiré quand il ne doit pas exister`,
    );
  }
});

Deno.test('chaque surface PASSE sa lentille à sa lecture (sinon elle ne fait que réétiqueter)', async () => {
  for (const s of PROPAGATED) {
    const src = await source(s.path);
    assert(
      src.includes(s.hook),
      `${s.label} : la lecture n’est pas bornée à la lentille — attendu « ${s.hook} »`,
    );
  }
});

Deno.test('l’état vide VÉLO propose une action RÉELLE, qui déclare sa discipline', async () => {
  // Le vide vélo n'est plus « une fonctionnalité manquante » mais le début de ce
  // joueur : il DOIT donc porter un geste. Et ce geste doit déclarer `bike` —
  // un CTA qui partirait sur un départ non déclaré rejouerait exactement le
  // scénario « il rentre chez lui avec 0 zone ».
  for (const s of PROPAGATED) {
    const src = await source(s.path);
    assert(
      src.includes("startSortieHref('bike')"),
      `${s.label} : l’état vide vélo n’offre aucun départ DÉCLARÉ vélo`,
    );
  }
});

Deno.test('la Carte peint ses couches dans les DEUX lentilles', async () => {
  // Le cœur du lot : `geojsonLayers` et `pointLayers` étaient forcés à `[]` en
  // lentille Bike, le GO retiré, le menu Calques amputé. Ce garde échoue si
  // l'une de ces trois amputations revient.
  for (const path of [
    '../features/map/MapScreen.tsx',
    '../features/map/MapScreen.web.tsx',
  ]) {
    const src = (await source(path)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert(!/bike\s*\?\s*\[\]/.test(src), `${path} : une couche de jeu est encore vidée en Bike`);
    assert(
      src.includes('useRealTerritories(crewIds, activity)'),
      `${path} : la lecture des captures n’est pas bornée à la lentille`,
    );
  }
  const hud = (await source('../features/map/BattleMapOverlays.tsx'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert(
    !hud.includes('showReadingLayers={!bike}'),
    'le menu Calques est encore amputé en lentille Bike',
  );
});

Deno.test('plus AUCUN écran n’affirme que le vélo n’est pas enregistré', async () => {
  // Le mensonge symétrique de celui qu'on vient de retirer. Il vivait dans les
  // copies (« GRYD ne chronomètre pas encore le vélo ») ET dans les catalogues.
  const MENSONGES = [
    'pas encore chronométré',
    'ne chronomètre pas encore',
    'chronomètre pas encore le vélo',
    'doesn’t track cycling yet',
    'aún no cronometra',
  ];
  const surfaces = [
    ...PROPAGATED.map((p) => p.path),
    '../features/map/BattleMapOverlays.tsx',
    '../i18n/catalog/map.ts',
    '../i18n/catalog/historique.ts',
    '../i18n/catalog/performance.ts',
    '../i18n/catalog/saison.ts',
    '../i18n/catalog/nav.ts',
  ];
  for (const path of surfaces) {
    // On lit le CODE et les CHAÎNES, commentaires retirés : les commentaires
    // CITENT volontairement l'ancienne phrase pour expliquer son retrait.
    const src = (await source(path))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const mot of MENSONGES) {
      assert(
        !src.includes(mot),
        `${path} : « ${mot} » affirme que GRYD n’enregistre pas le vélo — faux depuis le 26/07/2026`,
      );
    }
  }
});

// ─── 8. LA COPIE DE L'ÉTAT VIDE : un DÉBUT, pas une absence ─────────────────

Deno.test('les états vides vélo existent dans les CINQ langues', () => {
  const entries = [
    MAP.emptyBikeTitle,
    MAP.emptyBikeLine,
    HIST.bikeEmptyTitle,
    HIST.bikeEmptyBody,
    HIST.bikeEmptyCta,
    PERF.bikeEmptyTitle,
    PERF.bikeEmptyBody,
    PERF.bikeEmptyCta,
    SAISON.bikeBoardTitle,
    SAISON.bikeBoardBody,
    SAISON.bikeBoardCta,
  ];
  for (const entry of entries) {
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `traduction ${locale} manquante`);
    }
  }
});

Deno.test('aucun état vide vélo ne PROMET une date (« bientôt », « soon »…)', () => {
  // Même règle qu'avant : une promesse de délai qu'aucun code ne tient est la
  // même faute qu'une donnée fabriquée (CLAUDE.md).
  const interdits = ['bientot', 'bientôt', 'soon', 'bald', 'pronto', 'em breve', 'à venir'];
  const entries = [MAP.emptyBikeLine, HIST.bikeEmptyBody, PERF.bikeEmptyBody, SAISON.bikeBoardBody];
  for (const entry of entries) {
    for (const locale of LOCALES) {
      const phrase = entry[locale].toLowerCase();
      for (const mot of interdits) {
        assert(!phrase.includes(mot), `« ${entry[locale]} » (${locale}) promet au-delà du code`);
      }
    }
  }
});

Deno.test('le classement vélo n’affirme rien du MONDE, seulement de ce qu’il a lu', () => {
  // L'ancienne copie disait « personne n'a de points vélo, ICI NI AILLEURS » —
  // une affirmation sur la planète entière tirée d'une requête sur une ville.
  for (const locale of LOCALES) {
    const phrase = SAISON.bikeBoardBody[locale].toLowerCase();
    for (const mot of ['ni ailleurs', 'or anywhere', 'ni en otro sitio', 'anderswo', 'noutro lugar']) {
      assert(
        !phrase.includes(mot),
        `« ${SAISON.bikeBoardBody[locale]} » (${locale}) déborde de ce que la lecture établit`,
      );
    }
  }
});

// ─── 9. LES DEUX SEGMENTS SONT DES PAIRS (fondateur, 26/07/2026) ────────────

Deno.test('un seul segment actif, l’ordre est stable (Run à gauche), chacun a son libellé', () => {
  for (const selected of ACTIVITIES) {
    const segments = activitySegments(selected);
    assertEquals(segments.length, ACTIVITIES.length);
    assertEquals(segments.filter((s) => s.selected).length, 1, 'exactement un segment actif');
  }
  const segments = activitySegments(DEFAULT_ACTIVITY);
  assertEquals(
    segments.map((s) => s.activity),
    [...ACTIVITIES],
  );
  for (const seg of segments) {
    assertEquals(seg.label, ACTIVITY_LABELS[seg.activity]);
    assert(seg.label.length > 0, 'demande fondateur : TOUJOURS texte + icône, jamais l’icône seule');
  }
});

Deno.test('AUCUN segment ne porte de marque d’état : la structure ne peut plus en exprimer', () => {
  // C'est la garantie STRUCTURELLE que « PAS ENCORE » ne peut pas revenir par
  // inadvertance : le type d'un segment n'a plus de champ pour le porter.
  for (const seg of activitySegments(DEFAULT_ACTIVITY)) {
    assertEquals(Object.keys(seg).sort(), ['activity', 'label', 'selected']);
  }
});

Deno.test('les deux segments ont EXACTEMENT la même largeur (aucune hiérarchie visuelle)', () => {
  const g = ACTIVITY_SWITCH_GEOMETRY;
  // Une seule constante, donc l'égalité est vraie par construction : ce test
  // garde surtout l'INTENTION — que personne ne réintroduise deux largeurs.
  assertEquals(
    ACTIVITY_SWITCH_WIDTH,
    g.borderWidth * 2 + g.capsulePad * 2 + g.segmentWidth * ACTIVITIES.length,
  );
});

// ⚠️ Le test « §A9 — les libellés visibles tiennent dans leur segment » a été
// RETIRÉ le 27/07/2026 : le commutateur ne rend plus de texte (icônes seules,
// demande fondateur). Un test de non-troncature sans texte à tronquer passerait
// au vert quoi qu'il arrive — une preuve vide est pire que pas de preuve.
// Les DEUX garanties qui le remplacent sont ci-dessous : le sens survit sans
// texte (a11y), et la cible tactile survit à la capsule rétrécie.

Deno.test('icônes SEULES : les libellés existent encore pour les lecteurs d’écran', () => {
  // Retirer le texte VISIBLE est un choix de design ; le retirer des lecteurs
  // d'écran serait un défaut d'accessibilité. `ActivitySwitch` pose
  // `accessibilityLabel` sur chaque segment — ces libellés doivent donc rester
  // définis et non vides dans TOUTES les langues.
  for (const [activity, label] of Object.entries(ACTIVITY_LABELS)) {
    assert(label.trim().length > 0, `${activity} : libellé a11y vide`);
  }
  const src = Deno.readTextFileSync(new URL('./ActivitySwitch.tsx', import.meta.url));
  assert(
    src.includes('accessibilityLabel='),
    'le commutateur ne porte plus d’étiquette d’accessibilité : muet aux lecteurs d’écran',
  );
  assert(
    !/<Text[\s>]/.test(src),
    'un <Text> est réapparu dans le commutateur : il doit rester en icônes seules',
  );
});

Deno.test('§4.2 — la capsule tient dans la fourchette de largeur de la spec (80-96)', () => {
  assert(
    ACTIVITY_SWITCH_WIDTH >= 80 && ACTIVITY_SWITCH_WIDTH <= 96,
    `capsule de ${ACTIVITY_SWITCH_WIDTH} pt : hors de la fourchette 80-96 de §4.2`,
  );
});

Deno.test('le commutateur tient dans un en-tête de 375 pt à côté du retour et du titre', () => {
  // Gabarit réel de `ui/StackScreen.tsx` : marges 14 + 14, bouton retour 40.
  const ECRAN_ETROIT = 375;
  const resteAuTitre = ECRAN_ETROIT - 14 * 2 - 40 - ACTIVITY_SWITCH_WIDTH;
  // « Statistiques » (le plus long des titres qui portent le commutateur) pèse
  // ~102 pt en 16 px. Sous ce plancher, le titre serait rogné — `StackScreen`
  // le coupe en `ellipsizeMode="clip"`, donc sans même un « … » pour prévenir.
  assert(
    resteAuTitre >= 120,
    `il ne reste que ${resteAuTitre} pt au titre : la capsule est trop large pour un 375 pt`,
  );
});

Deno.test('la cible tactile est ATTEINTE, pas simulée par un hitSlop', () => {
  const g = ACTIVITY_SWITCH_GEOMETRY;
  assert(ACTIVITY_SWITCH_HEIGHT >= 44, 'plancher a11y : 44 pt');
  assert(ACTIVITY_SEGMENT_HEIGHT >= 44, `segment de ${ACTIVITY_SEGMENT_HEIGHT} pt — plancher 44`);
  assert(g.segmentWidth >= 44, `segment de ${g.segmentWidth} pt de large — plancher 44`);
});

Deno.test('le contenu d’un segment tient dans sa hauteur (icône + libellé, jamais rogné)', () => {
  const g = ACTIVITY_SWITCH_GEOMETRY;
  // Contenu réel rendu par ActivitySwitch : le PICTO SEUL depuis le 27/07/2026
  // (icônes seules, plus de libellé — la marge 2 et la ligne de 14 du texte ont
  // disparu avec lui). Le segment garde sa hauteur : l'espace libéré devient de
  // l'air autour du glyphe, il ne sert pas à rétrécir la cible tactile.
  const contenu = g.iconSize;
  assert(
    contenu <= ACTIVITY_SEGMENT_HEIGHT,
    `contenu de ${contenu} pt dans un segment de ${ACTIVITY_SEGMENT_HEIGHT} pt`,
  );
});

Deno.test('le plancher de lisibilité tient (libellé à 12 px, jamais moins)', () => {
  // (le verrou `labelSize >= 12` a disparu avec le texte — cf. le bloc ci-dessus)
});
