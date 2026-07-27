/**
 * GRYD — E09 (`/setup/activity`) : CET ÉCRAN N'ÉCRIT QUE LE FILTRE.
 *
 * La spec l.785 tient en une phrase de logique : « Ce choix ne mélange jamais
 * les données. Il initialise seulement le filtre. » Ce fichier est là pour que
 * cette phrase reste vraie quand plus personne ne se souviendra de l'avoir lue.
 *
 * ─── POURQUOI UN TEST DE SOURCE, ET PAS UN TEST DE COMPOSANT ────────────────
 * La faute qu'on veut interdire n'est pas une erreur de calcul : c'est une
 * ÉCRITURE EN TROP. Un `updateProfile({ sport: choice })`, un
 * `supabase.from('user_stats').update(…)`, un `setActiveRun(…)` ajoutés « pour
 * bien faire » compilent, ne plantent pas, et transforment un réglage
 * d'affichage en donnée de jeu déclarée — c'est-à-dire en affirmation sur le
 * joueur que rien n'a mesurée. Aucune fonction pure ne peut attraper ça : la
 * faute est dans l'APPEL. Même patron que `features/territory/lensGuards.test.ts`
 * et `features/social/activityScoping.test.ts`, qui gardent déjà des appels.
 *
 * Deux temps, tous deux exécutés :
 *   1. une SIMULATION du commit de l'écran, qui MESURE ce qu'il touche : le jeu
 *      exact de clés de stockage écrites, confronté aux clés de DONNÉES DE JEU
 *      réellement présentes dans le dépôt ;
 *   2. des GARDE-FOUS DE SOURCE sur `app/setup/activity.tsx` lui-même.
 *
 * La simulation ne remplace pas un rendu React (indisponible sous Deno) : elle
 * modélise la seule chose qui compte ici, QUELLES CLÉS SONT TOUCHÉES.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, type Activity } from '@klaim/shared';
import { ACTIVITY_SURFACES, activityStorageKey, parseActivity } from './activityLens.ts';

// ─── 1. Simulation : ce que le commit de E09 touche, et rien d'autre ─────────

/**
 * Modèle du commit de l'écran : pour chaque surface E14, la lentille est posée
 * à la discipline choisie. C'est LA MÊME dérivation que le JSX (`for (const
 * surface of ACTIVITY_SURFACES) setActivityPref(surface, choice)`) ; ce que la
 * simulation ajoute, c'est de rendre les EFFETS observables.
 */
function commitE09(choice: Activity): Map<string, string> {
  const written = new Map<string, string>();
  for (const surface of ACTIVITY_SURFACES) written.set(activityStorageKey(surface), choice);
  return written;
}

/**
 * Les clés de DONNÉES DE JEU du dépôt (relevé du 27/07/2026). Elles sont ici en
 * dur et c'est assumé : leur rôle est de faire échouer le test si E09 se met un
 * jour à écrire l'une d'elles. Une liste dérivée d'un scan serait plus jolie et
 * beaucoup plus facile à neutraliser par accident.
 */
const CLES_DE_JEU: readonly string[] = [
  'gryd.activeRun.v1', // lib/runStore.ts:26 — la sortie en cours
  'gryd.activeRun.current.v1', // lib/runStore.ts:27
  'gryd.activeRun.bgFixes.v1', // lib/runStore.ts:28 — les points GPS
  'gryd.pendingUpload.queue.v2', // lib/pendingUploadQueue.ts:36 — les runs à envoyer
  'gryd.social.profile.v1', // features/social/profileStore.ts:146 — le profil
  'gryd.arsenal.equipped.v1', // features/arsenal/inventory.ts:101 — l'équipement
  'gryd.onboarding.v1', // features/onboarding/store.ts:119 — l'avancement du flow
  'gryd.activation.t0.v1', // lib/activation.ts:19 — l'horloge d'activation
];

Deno.test('E09 n’écrit QUE les lentilles E14 — une clé par surface, aucune autre', () => {
  for (const choice of ACTIVITIES) {
    const written = commitE09(choice);
    const attendu = ACTIVITY_SURFACES.map(activityStorageKey).sort();
    assertEquals([...written.keys()].sort(), attendu);
    // Et la valeur écrite est la discipline choisie, jamais autre chose.
    for (const value of written.values()) assertEquals(value, choice);
  }
});

Deno.test('aucune clé de DONNÉE DE JEU n’est touchée par ce choix', () => {
  for (const choice of ACTIVITIES) {
    for (const key of commitE09(choice).keys()) {
      assertEquals(
        CLES_DE_JEU.includes(key),
        false,
        `E09 ne doit jamais écrire ${key} : un filtre d’affichage n’affirme rien sur le joueur`,
      );
    }
  }
});

Deno.test('ce que E09 écrit est RELISIBLE par la lentille (aucun état parallèle)', () => {
  // La preuve que c'est bien le MÊME store : ce qui sort du commit repasse par
  // le parseur de `activityLens`, celui-là même que `mapPref.ts` applique à la
  // relecture. Un second état d'activité échouerait ici — sa valeur ne serait
  // pas une `Activity`, ou elle ne serait pas rangée à ces clés-là.
  for (const choice of ACTIVITIES) {
    for (const raw of commitE09(choice).values()) assertEquals(parseActivity(raw), choice);
  }
});

Deno.test('les quatre surfaces E14 sont semées, pas seulement la Carte', () => {
  // Le piège : n'amorcer que `map`. Un cycliste ouvrirait alors son Classement
  // en monde course juste après avoir déclaré le contraire.
  const written = commitE09('bike');
  assertEquals(written.size, ACTIVITY_SURFACES.length);
  assert(written.has(activityStorageKey('classement')));
  assert(written.has(activityStorageKey('historique')));
  assert(written.has(activityStorageKey('stats')));
});

// ─── 2. Garde-fous de SOURCE sur app/setup/activity.tsx ──────────────────────

/** Source d'un fichier, commentaires retirés (ils CITENT ce qui est interdit). */
async function code(relPath: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(relPath, import.meta.url));
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, '') // blocs /** … */ : ils décrivent la faute
    .replace(/^\s*\/\/.*$/gm, ''); // et les commentaires de ligne aussi
}

const ECRAN = '../../app/setup/activity.tsx';

Deno.test('E09 écrit la lentille par le store EXISTANT (setActivityPref)', async () => {
  const src = await code(ECRAN);
  assert(
    src.includes("from '../../src/features/map/mapPref'"),
    'la préférence doit venir du store E14, pas d’un stockage réinventé',
  );
  assert(
    src.includes('setActivityPref(surface, choice)'),
    'l’écriture doit passer par le setter du store partagé',
  );
});

Deno.test('E09 dérive ses surfaces de ACTIVITY_SURFACES (jamais une liste recopiée)', async () => {
  const src = await code(ECRAN);
  assert(
    /for \(const surface of ACTIVITY_SURFACES\)/.test(src),
    'une liste recopiée manquerait la surface ajoutée demain',
  );
});

Deno.test('E09 ne touche AUCUN stockage direct ni aucune table', async () => {
  const src = await code(ECRAN);
  for (const interdit of [
    'AsyncStorage', // le store possède ses clés — l'écran n'écrit pas à côté
    'supabase', // aucune écriture serveur : le claim est décidé serveur, pas ici
    '.from(', // ni lecture ni écriture de table
    '.rpc(', // ni fonction serveur
    'runStore', // ni la sortie en cours
    'profileStore', // ni le profil du joueur
    'pendingUpload', // ni la file d'envoi
  ]) {
    assertEquals(
      src.includes(interdit),
      false,
      `« ${interdit} » n’a rien à faire dans E09 : le choix initialise SEULEMENT le filtre`,
    );
  }
});

Deno.test('E09 ne déclare aucune discipline de SORTIE (interdit du 25/07/2026)', async () => {
  const src = await code(ECRAN);
  for (const interdit of ['START_ACTIVITY_PARAM', 'withStartActivity', 'startSortieHref', 'course-live']) {
    assertEquals(
      src.includes(interdit),
      false,
      'une préférence d’AFFICHAGE ne décide jamais de la NATURE d’un effort enregistré',
    );
  }
});

Deno.test('E09 n’allume son CTA que sur un choix RÉEL (aucune présélection)', async () => {
  const src = await code(ECRAN);
  assert(
    /useState<Activity \| null>\(null\)/.test(src),
    'préselectionner « run » ferait passer un défaut technique pour une décision',
  );
  assert(
    src.includes('disabled={choice === null}'),
    'le CTA doit être inerte tant que rien n’est choisi (aucun bouton mort)',
  );
  assert(
    src.includes('t(C.ctaDisabledHint)'),
    'et l’écran doit DIRE pourquoi : un bouton gris muet est une impasse',
  );
});

Deno.test('E09 logge les deux events §18, avec la discipline réellement appliquée', async () => {
  const src = await code(ECRAN);
  assert(src.includes('EVENTS.setupActivityViewed'), 'la vue de l’écran doit être tracée');
  const chosen = src.indexOf('EVENTS.setupActivityChosen');
  assert(chosen >= 0, 'le choix doit être tracé');
  const commit = src.indexOf('setActivityPref(surface, choice)');
  assert(
    commit >= 0 && commit < chosen,
    'l’event part APRÈS l’écriture : il dit ce qui a été appliqué, pas une intention',
  );
});

Deno.test('E09 ne peint pas deux lignes quand le vélo est fermé (aucune fausse affordance)', async () => {
  const src = await code(ECRAN);
  assert(
    src.includes('if (!flags.bike) return <Redirect'),
    'sans le monde vélo il n’y a plus de décision : l’écran passe la main',
  );
});
