/**
 * GRYD — E14 : ce que le commutateur Run / Bike doit tenir, prouvé.
 *
 * Deux familles de tests, et les deux comptent :
 *   1. les RÈGLES DÉRIVÉES (mémoire par onglet, verrouillage, éligibilité,
 *      séparation stricte) — des fonctions pures, vérifiées comme telles ;
 *   2. des GARDE-FOUS DE SOURCE, sur le modèle de
 *      `features/social/activityScoping.test.ts` : les trois écrans propagés
 *      doivent RÉELLEMENT rendre un état vide nommé sous la lentille Bike, et
 *      la déclaration de discipline au départ doit rester `run`. Ces gardes
 *      échouent sur le code d'avant le correctif — c'est ce qui empêche le
 *      défaut de revenir en silence, et surtout ce qui force à REVOIR la copie
 *      des états vides le jour où le vélo deviendra enregistrable.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, DEFAULT_ACTIVITY } from '@klaim/shared';
import {
  ACTIVITY_SURFACES,
  activityIsRecorded,
  activityStorageKey,
  activitySwitchVisible,
  competitiveReadAllowed,
  effectiveActivity,
  parseActivity,
  RECORDED_ACTIVITIES,
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

// ─── 3. Éligibilité + VERROUILLAGE pendant une course ────────────────────────

Deno.test('masqué — jamais grisé — quand Bike n’est pas activé', () => {
  assertEquals(activitySwitchVisible({ bikeEnabled: false, runLive: false }), false);
  assertEquals(activitySwitchVisible({ bikeEnabled: false, runLive: true }), false);
});

Deno.test('VERROUILLÉ pendant une course : le commutateur disparaît, il ne se grise pas', () => {
  assertEquals(activitySwitchVisible({ bikeEnabled: true, runLive: true }), false);
  assertEquals(activitySwitchVisible({ bikeEnabled: true, runLive: false }), true);
});

Deno.test('le verrou n’ENFERME PAS : pendant une course, la lentille montre le monde de la course', () => {
  // Le piège que ce comportement retire : lentille Bike mémorisée + course en
  // cours = état vide SANS commutateur pour en sortir. Un cul-de-sac, pas un verrou.
  assertEquals(effectiveActivity('bike', 'run'), 'run');
  assertEquals(effectiveActivity('run', 'run'), 'run');
});

Deno.test('hors course, la préférence mémorisée fait foi — elle n’est jamais écrasée', () => {
  assertEquals(effectiveActivity('bike', null), 'bike');
  assertEquals(effectiveActivity('run', null), 'run');
});

// ─── 4. Le point d'honnêteté : quelles disciplines sont ENREGISTRABLES ───────

Deno.test('seule la course à pied est enregistrable aujourd’hui', () => {
  assertEquals(activityIsRecorded('run'), true);
  assertEquals(activityIsRecorded('bike'), false);
  assertEquals([...RECORDED_ACTIVITIES], [DEFAULT_ACTIVITY]);
});

Deno.test(
  'TRIPWIRE — si le départ cesse de déclarer « run », ce fichier ET la copie des états vides doivent être revus',
  async () => {
    // On lit la DÉCLARATION, pas un commentaire : les blocs et les lignes de
    // commentaire sont retirés d'abord (l'en-tête de runActivity.ts cite
    // justement `Extract<Activity, 'run'>` en prose — un `includes` naïf
    // passerait sur la prose et ne prouverait rien).
    const url = new URL('../features/run/gps/runActivity.ts', import.meta.url);
    const code = (await Deno.readTextFile(url))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    assert(
      /DECLARED_START_ACTIVITY\s*:\s*Extract<Activity,\s*'run'>/.test(code),
      "tant que RECORDED_ACTIVITIES vaut ['run'], le départ DOIT rester typé Extract<Activity,'run'> — " +
        'sinon les états vides Bike (Classement, Historique, Statistiques) affirment un vide qui n’existe plus',
    );
  },
);

// ─── 5. SÉPARATION STRICTE : jamais Run + Bike dans une lecture compétitive ──

Deno.test('une source DISCIPLINÉE (0070) est lisible sous les deux lentilles', () => {
  for (const a of ACTIVITIES) assertEquals(competitiveReadAllowed(a, true), true);
});

Deno.test('une source MONO-POT ne s’affiche que sous la lentille par défaut', () => {
  // `specialty_leaderboard` (user_stats) et `user_badges` mélangent les
  // disciplines — 0070 « en suspens » §2 et §3. Les servir sous une étiquette
  // vélo serait la somme que la planche interdit.
  assertEquals(competitiveReadAllowed('run', false), true);
  assertEquals(competitiveReadAllowed('bike', false), false);
});

// ─── 6. Garde-fous de source : les 3 surfaces propagées le sont VRAIMENT ─────

async function screenSource(relPath: string): Promise<string> {
  return await Deno.readTextFile(new URL(relPath, import.meta.url));
}

const PROPAGATED: readonly { path: string; label: string }[] = [
  { path: '../../app/(tabs)/classement.tsx', label: 'Classement (E11/E12)' },
  { path: '../../app/historique.tsx', label: 'Historique' },
  { path: '../../app/performance.tsx', label: 'Statistiques (E18)' },
];

Deno.test('les trois surfaces manquantes portent le commutateur et sa mémoire par onglet', async () => {
  for (const s of PROPAGATED) {
    const src = await screenSource(s.path);
    assert(
      src.includes('useActivityLens('),
      `${s.label} : ni mémoire par onglet, ni éligibilité dérivée (flags.bike + verrou de course)`,
    );
    assert(src.includes('<ActivitySwitch'), `${s.label} : aucun commutateur rendu`);
    assert(
      src.includes('switchVisible'),
      `${s.label} : le commutateur n’est pas retiré quand il ne doit pas exister`,
    );
  }
});

Deno.test('sous la lentille Bike, chaque surface rend un ÉTAT VIDE NOMMÉ (jamais les données Run)', async () => {
  for (const s of PROPAGATED) {
    const src = await screenSource(s.path);
    assert(
      /activity === 'bike'|bike\b/.test(src),
      `${s.label} : la lentille Bike n’est pas distinguée`,
    );
    assert(
      /bikeEmpty|bikeBoard/.test(src),
      `${s.label} : aucun état vide NOMMÉ pour la lentille Bike — ` +
        'un écran qui se contente de masquer laisse croire à une panne',
    );
  }
});
