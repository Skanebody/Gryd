/**
 * GRYD — E14 : UNE PRÉFÉRENCE D'AFFICHAGE NE DÉCIDE PAS DE LA NATURE D'UN
 * EFFORT ENREGISTRÉ (correctif du 25/07/2026).
 *
 * LE DÉFAUT QUE CES TESTS EMPÊCHENT DE REVENIR. `runActivity.ts` lisait
 * `gryd.mapactivity` — la LENTILLE Run/Bike de la Carte, un réglage d'affichage
 * persistant — et en faisait la DISCIPLINE de la sortie qui démarrait. Depuis
 * l'ouverture de `flags.bike` (25/07/2026), le commutateur est visible et
 * bascule vraiment ; le GO est bien retiré en lentille Bike sur la Carte, mais
 * `/course-live` reste atteignable par le PLANIFICATEUR d'itinéraire. Une
 * lentille Bike oubliée suffisait donc à faire enregistrer une VRAIE course à
 * pied comme une sortie vélo : nettoyée à 80 km/h par point au lieu de 25,
 * déclarée `bike` à `ingest_run`, écrite dans un univers de territoire que la
 * lentille Run n'affiche jamais — « 0 zone » après une vraie course.
 *
 * CE QUI EST VÉRIFIÉ ICI, ET POURQUOI EN LISANT LA SOURCE. La chaîne du départ
 * (hook React, AsyncStorage, expo-sensors) n'est pas exécutable sous Deno : le
 * seul filet possible est un GARDE-FOU DE SOURCE, comme celui de
 * `features/social/activityScoping.test.ts`. Chacun de ces tests ÉCHOUE sur le
 * code d'avant le correctif — c'est ce qui empêche la dérivation de revenir en
 * silence, y compris via un chemin détourné (un autre fichier de
 * `features/run/**` qui relirait la préférence de carte).
 *
 * Les commentaires sont RETIRÉS avant chaque scan : ces fichiers PARLENT de
 * `gryd.mapactivity` pour raconter le défaut, et un garde-fou qui confondrait
 * une explication avec une dérivation serait un garde-fou menteur.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { DEFAULT_ACTIVITY } from '@klaim/shared';
import { DECLARED_START_ACTIVITY } from './runActivity.ts';

// ─── Outils de lecture de source ────────────────────────────────────────────

/**
 * Retire blocs `/* … *\/` et lignes `// …`. Approximation assumée (une chaîne
 * de caractères contenant `//` serait tronquée) : aucun des fichiers scannés
 * n'en contient, et l'erreur irait dans le sens SÉVÈRE (moins de code vu,
 * jamais plus) — un garde-fou ne doit jamais se relâcher par accident.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

async function readCode(relPath: string): Promise<string> {
  return stripComments(await Deno.readTextFile(new URL(relPath, import.meta.url)));
}

/** Tous les `.ts`/`.tsx` de `features/run/**`, hors tests (ils ne s'embarquent pas). */
async function runFeatureFiles(): Promise<string[]> {
  const root = new URL('../', import.meta.url); // features/run/
  const out: string[] = [];
  const walk = async (dir: URL, prefix: string): Promise<void> => {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isDirectory) {
        await walk(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
      } else if (
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
        !entry.name.endsWith('.test.ts')
      ) {
        out.push(`${prefix}${entry.name}`);
      }
    }
  };
  await walk(root, '');
  return out.sort();
}

// ─── 1. La déclaration elle-même ────────────────────────────────────────────

Deno.test('la discipline déclarée au départ est la course à pied, la seule que GRYD enregistre', () => {
  assertEquals(DECLARED_START_ACTIVITY, 'run');
  // Même valeur que le défaut du domaine : aucun écran ne peut partir dans un
  // monde que le moteur ne sait pas juger (les 4 chantiers vélo de flags.ts).
  assertEquals(DECLARED_START_ACTIVITY, DEFAULT_ACTIVITY);
});

// ─── 2. Le garde-fou central : plus AUCUNE dérivation depuis l'affichage ────

Deno.test(
  'AUCUN fichier de features/run/** ne dérive la discipline d’une préférence de carte',
  async () => {
    // Le réglage d'affichage, sous toutes ses formes : le module, ses accesseurs
    // et sa clé de stockage. En atteindre UN depuis la course, c'est rouvrir le
    // défaut — peu importe le fichier qui le fait.
    const interdits = ['mapPref', 'getMapActivity', 'useMapActivity', 'gryd.mapactivity'];
    const fautes: string[] = [];
    for (const rel of await runFeatureFiles()) {
      const code = await readCode(`../${rel}`);
      for (const mot of interdits) {
        if (code.includes(mot)) fautes.push(`${rel} → ${mot}`);
      }
    }
    assertEquals(
      fautes,
      [],
      'une préférence d’AFFICHAGE ne décide jamais de la NATURE d’un effort enregistré',
    );
  },
);

Deno.test('le module de déclaration n’a plus aucune lecture asynchrone', async () => {
  const code = await readCode('./runActivity.ts');
  // Une déclaration se lit d'un coup d'œil : ni import, ni await, ni promesse.
  // (Le seul `import` toléré est un import de TYPE, effacé à la compilation.)
  assert(!code.includes('await '), 'déclarer une discipline ne demande aucune lecture');
  assert(!code.includes('Promise'), 'la discipline n’est pas une valeur qu’on attend');
  assertEquals(code.includes('import type'), true);
  assertEquals(/^\s*import\s+(?!type)/m.test(code), false, 'aucun import de valeur');
});

// ─── 3. Le compilateur impose la déclaration (garde-fous de signature) ──────

Deno.test('confirmStart EXIGE une discipline (pas de départ muet)', async () => {
  const code = await readCode('./gateTypes.ts');
  assert(
    /confirmStart:\s*\(\s*activity:\s*Activity\s*\)/.test(code),
    'PreflightApi.confirmStart doit prendre la discipline en PARAMÈTRE OBLIGATOIRE : ' +
      'un `confirmStart: () => void` laisse le cœur la deviner à nouveau',
  );
});

Deno.test('le préflight — donc le chemin qui lance la course — DÉCLARE la discipline', async () => {
  const code = await readCode('./RunPreflight.tsx');
  assert(
    code.includes('confirmStart(DECLARED_START_ACTIVITY)'),
    'le départ doit passer une discipline explicite, jamais appeler confirmStart() à vide',
  );
});

Deno.test('TrackerInit.activity est OBLIGATOIRE et n’est résolu par aucun défaut', async () => {
  const code = await readCode('./tracker.ts');
  assertEquals(code.includes('activity?: Activity'), false, 'champ optionnel = défaut silencieux');
  assert(/\n\s*activity:\s*Activity;/.test(code), 'la discipline doit être un champ requis');
  assertEquals(
    /init\.activity\s*\?\?/.test(code),
    false,
    'aucun `??` ne doit pouvoir fabriquer une discipline dans le constructeur',
  );
});

Deno.test('le cœur de course ne lit la discipline nulle part — il la REÇOIT', async () => {
  const code = await readCode('./useRealRunCore.ts');
  assert(
    /const confirmStart = useCallback\(async \(activity: Activity\)/.test(code),
    'confirmStart reçoit la discipline de son appelant',
  );
  assertEquals(
    code.includes('readRunActivity'),
    false,
    'le cœur ne doit plus appeler de lecteur de discipline (il en existait un : la carte)',
  );
});

// ─── 4. Le drapeau vélo dit ce qu'il fait, et rien de plus ──────────────────

Deno.test('flags.bike se documente comme une LENTILLE d’affichage, jamais comme une discipline', async () => {
  // Prose volontairement testée : c'est ce commentaire qui a induit en erreur les
  // correctifs précédents (ils ont supposé le drapeau FERMÉ). « Une doc ne promet
  // jamais au-delà du code » vaut aussi dans l'autre sens : elle ne doit pas
  // laisser croire qu'un drapeau d'affichage décide de ce qui est enregistré.
  const src = await Deno.readTextFile(new URL('../../../lib/flags.ts', import.meta.url));
  assert(
    src.includes('AUCUNE DISCIPLINE D’ENREGISTREMENT') ||
      src.includes("AUCUNE DISCIPLINE D'ENREGISTREMENT"),
    'le commentaire de flags.bike doit dire explicitement qu’il ne décide d’aucune ' +
      'discipline d’enregistrement',
  );
});
