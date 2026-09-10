/**
 * GRYD — GARDE-FOUS DE SOURCE : aucune surface ne relit `hex_claims` en aveugle.
 *
 * ─── POURQUOI DES TESTS QUI LISENT DU TEXTE ─────────────────────────────────
 * Le défaut corrigé le 26/07/2026 n'était pas une erreur de calcul : c'était un
 * ARGUMENT MANQUANT. `useRealTerritories()` sans discipline compile, ne plante
 * pas, et rend des chiffres plausibles — dans le mauvais monde. Aucune fonction
 * pure ne peut attraper ça : la faute est dans l'APPEL, pas dans la logique.
 *
 * Ces gardes échouent donc sur le code d'AVANT le correctif, et c'est tout leur
 * intérêt : ils empêchent le défaut de revenir en silence dans six semaines,
 * quand quelqu'un ajoutera une surface « juste pour afficher un km² ».
 *
 * Même patron que `features/social/activityScoping.test.ts`, qui garde déjà le
 * classement, l'économie et la mission. Ici : le Profil, /territoire, la carte
 * « Mon territoire », le widget, la dernière sortie et l'écran de Résultat.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

/** Source d'un fichier, commentaires de LIGNE retirés (ils citent le défaut). */
async function code(relPath: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(relPath, import.meta.url));
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, '') // blocs /** … */ : ils DÉCRIVENT la faute
    .replace(/^\s*\/\/.*$/gm, ''); // et les commentaires de ligne aussi
}

/** Fenêtre d'une chaîne de requête : du `.from('table')` au `;` qui la clôt. */
function queryChain(src: string, table: string, label: string): string {
  const from = src.indexOf(`.from('${table}')`);
  assert(from >= 0, `${label} : aucune lecture de ${table}`);
  const end = src.indexOf(';', from);
  assert(end > from, `${label} : chaîne de requête ${table} non terminée`);
  return src.slice(from, end);
}

// ─── 1. Plus AUCUN appel sans discipline sur les surfaces corrigées ──────────

const SANS_LENTILLE = /useRealTerritories\(\s*\)/;

Deno.test('2026 : le Profil sépare son journal par discipline', async () => {
  const src = await code('../refonte/ProfileHomeScreen.tsx');
  assertEquals(
    SANS_LENTILLE.test(src),
    false,
    'un `useRealTerritories()` nu ferait redire « nouveau joueur » à un cycliste',
  );
  assert(
    src.includes('useProfileJournal(activity)') && src.includes('selected: activity === value') && src.includes('setActivity(value)'),
    'le Profil affiche le journal du sport choisi (§10), sans fusionner course et vélo',
  );
  const journal = await code('../refonte/ProfileJournal.ts');
  assert(journal.includes('useMyRunHistory(activity)'), 'la requête distante reçoit le même sport');
  assert(journal.includes('run.activity === activity'), 'les sorties locales suivent le même filtre');
});

Deno.test('/territoire ne lit plus le territoire sans discipline', async () => {
  const src = await code('../../../app/territoire.tsx');
  assertEquals(SANS_LENTILLE.test(src), false);
  assert(src.includes('useRealTerritoriesByActivity('));
  assert(
    src.includes('activity={shown}'),
    'la carte doit peindre le monde que la page vient de NOMMER',
  );
});

Deno.test('la carte « Mon territoire » reçoit sa discipline de l’écran', async () => {
  const src = await code('./TerritoryFranceMap.tsx');
  assertEquals(SANS_LENTILLE.test(src), false);
  assert(
    src.includes('useRealTerritories(') && src.includes('activity,'),
    'TerritoryFranceMap doit passer la discipline reçue en prop',
  );
  assert(
    /activity:\s*Activity;/.test(src),
    'la prop doit être REQUISE : un défaut rétablirait le choix silencieux',
  );
});

Deno.test('le widget « Mon territoire » exige sa discipline', async () => {
  const src = await code('../widget/TerritoryWidgetCard.tsx');
  assertEquals(SANS_LENTILLE.test(src), false);
  assert(
    /useTerritoryWidgetView\(activity:\s*Activity\)/.test(src),
    'le paramètre doit être obligatoire, sans valeur par défaut',
  );
});

// ─── 2. La lecture DES DEUX MONDES : une requête, zéro filtre, zéro somme ────

Deno.test('la lecture deux-mondes demande la colonne `activity` et ne la FILTRE pas', async () => {
  const src = await code('../map/hexClaims.ts');
  const from = src.lastIndexOf(".from('hex_claims')");
  assert(from >= 0, 'hexClaims doit lire hex_claims');
  const chain = src.slice(from, src.indexOf(';', from));
  assert(
    chain.includes('activity'),
    'sans la colonne, impossible de séparer les deux mondes côté client',
  );
  assertEquals(
    chain.includes(".eq('activity'"),
    false,
    'cette lecture-là doit rapporter LES DEUX mondes — c’est le split qui sépare',
  );
});

Deno.test('la lecture disciplinée, elle, garde son `.eq(activity)`', async () => {
  const src = await code('../map/hexClaims.ts');
  const chain = queryChain(src, 'hex_claims', 'hexClaims');
  assert(
    chain.includes(".eq('activity'"),
    'les surfaces à commutateur (Carte, Statistiques) bornent en SQL',
  );
});

// ─── 3. « Ta dernière sortie » : on DATE, on ne filtre pas — mais on NOMME ───

Deno.test('lastActivity lit la discipline SANS filtrer sur elle', async () => {
  const src = await code('../social/lastActivity.ts');
  const chain = queryChain(src, 'runs', 'lastActivity');
  assert(
    chain.includes('activity'),
    'la ligne doit savoir de quelle discipline elle parle (sinon l’écran reste ambigu)',
  );
  assertEquals(
    chain.includes(".eq('activity'"),
    false,
    'filtrer ferait dire « tu n’as rien fait » à quelqu’un qui a roulé hier',
  );
});

/**
 * ─── OÙ LE SPORT SE NOMME A CHANGÉ DE FICHIER (10/09/2026) ─────────────────
 * Ce test lisait `ProfileHomeScreen.tsx` et y cherchait trois chaînes en dur
 * (`copy('Course à pied', 'Run')`, `runs.slice(0,`, `openRun(run)`) : l'écran
 * recopiait alors sa liste de sorties à la main. Le lot « Réglages et Profil »
 * a monté `features/journal/JournalSection2026` à sa place — la ligne y gagne
 * la vignette du tracé, l'allure et le terrain, et le sport y est NOMMÉ dans
 * le corps de la ligne au lieu de ne vivre que dans un libellé
 * d'accessibilité.
 *
 * L'invariant surveillé n'a pas bougé d'un pouce : le journal doit nommer le
 * sport effectivement choisi, et la liste doit venir du journal du MÊME sport.
 * Seuls les deux fichiers où cet invariant s'écrit ont changé. Le laisser
 * pointer sur l'ancien emplacement l'aurait rendu ROUGE pour une bonne
 * refonte, puis vert pour toujours après une suppression négligente.
 */
Deno.test('2026 : le Profil nomme le sport du journal et de sa dernière sortie', async () => {
  const ecran = await code('../refonte/ProfileHomeScreen.tsx');
  const ligne = await code('../journal/JournalSection2026.tsx');
  assert(
    ligne.includes("entry.activity === 'run' ? AC.optionRun : AC.optionBike"),
    'la ligne du journal doit nommer le sport effectivement choisi (catalogue setupActivity, 5 langues)',
  );
  assert(
    ligne.includes('activityLabel'),
    'le nom du sport doit être RENDU, pas seulement calculé',
  );
  assert(
    ecran.includes('useProfileJournal(activity)') && ecran.includes('runs={runs}') && ecran.includes('onOpen={openRun}'),
    'la liste doit venir du journal du même sport, et son tap ouvrir la sortie',
  );
});

// ─── 4. L'écran de Résultat ne dément plus le préflight ─────────────────────

Deno.test('course-result lit la discipline déclarée et sert SES libellés', async () => {
  const route = await code('../../../app/course-result.tsx');
  assert(route.includes('refonte/RunResult'), 'la route doit monter le résultat 2026');
  const src = await code('../refonte/RunResult.tsx');
  assert(
    src.includes('resolveResultActivity2026('),
    'le résultat doit établir la sortie réellement enregistrée et son propriétaire',
  );
  assert(
    src.includes('local?.activity ?? DEFAULT_ACTIVITY') && !src.includes('parseStartActivity(params.activity)'),
    'le sport de la sortie vient de l’enregistrement ; un paramètre d’URL ne fabrique pas une sortie',
  );
  assert(src.includes('liveRateDisplay(activity,'), 'l’unité de mesure doit suivre ce même sport');
  assertEquals(
    /t\(C\.(heroDone|heroPrivate|heroFlagged|barKicker|privateNote|flaggedWhy)\)/.test(src),
    false,
    'aucun libellé qui NOMME l’effort ne doit rester servi en version course seule',
  );
});
