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

Deno.test('le Profil ne lit plus le territoire sans discipline', async () => {
  const src = await code('../../../app/(tabs)/profil.tsx');
  assertEquals(
    SANS_LENTILLE.test(src),
    false,
    'un `useRealTerritories()` nu ferait redire « nouveau joueur » à un cycliste',
  );
  assert(
    src.includes('useRealTerritoriesByActivity('),
    'le Profil doit lire LES DEUX mondes (il n’a pas de commutateur E14)',
  );
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

Deno.test('le Profil nomme la discipline de la dernière sortie, ou se tait', async () => {
  const src = await code('../../../app/(tabs)/profil.tsx');
  assert(
    src.includes('SCOPE_LABEL[a.activity]'),
    'la copie doit lever l’ambiguïté quand la discipline est lue',
  );
  assert(
    src.includes('a.activity === null'),
    'et retomber sur une copie NEUTRE quand elle ne l’est pas — jamais un monde inventé',
  );
});

// ─── 4. L'écran de Résultat ne dément plus le préflight ─────────────────────

Deno.test('course-result lit la discipline déclarée et sert SES libellés', async () => {
  const src = await code('../../../app/course-result.tsx');
  assert(
    src.includes('parseStartActivity(params.activity)'),
    'la discipline doit venir du même paramètre que le DÉPART',
  );
  assert(
    src.includes('resultCopy(activity)'),
    'tout ce qui nomme l’effort passe par la porte d’entrée indexée par discipline',
  );
  assertEquals(
    /t\(C\.(heroDone|heroPrivate|heroFlagged|barKicker|privateNote|flaggedWhy)\)/.test(src),
    false,
    'aucun libellé qui NOMME l’effort ne doit rester servi en version course seule',
  );
});
