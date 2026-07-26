/**
 * GRYD — E14 : LA DISCIPLINE EST DÉCLARÉE ET MONTRÉE, JAMAIS DEVINÉE.
 *
 * ─── LE DÉFAUT QUE CES TESTS EMPÊCHENT DE REVENIR ──────────────────────────
 * `runActivity.ts` lisait `gryd.mapactivity` — la LENTILLE Run/Bike de la
 * Carte, un réglage d'AFFICHAGE persistant — et en faisait la DISCIPLINE de la
 * sortie qui démarrait. Une lentille Bike oubliée suffisait à faire enregistrer
 * une VRAIE course à pied comme une sortie vélo : nettoyée à 80 km/h par point
 * au lieu de 25, déclarée `bike` à `ingest_run`, écrite dans un univers de
 * territoire que la lentille Run n'affiche jamais — « 0 zone » après une vraie
 * course.
 *
 * ─── CE QUI A CHANGÉ LE 26/07/2026, ET CE QUI N'A PAS CHANGÉ ───────────────
 * Le vélo s'enregistre désormais pour de vrai : forcer `run` pour tout le monde
 * serait le mensonge symétrique. La discipline est donc DÉCLARABLE. Ce qui
 * reste verrouillé — et c'est tout le sujet de ce fichier — c'est qu'elle ne
 * peut jamais être décidée EN SILENCE :
 *   1. aucun fichier de `features/run/**` ne lit la préférence de carte ;
 *   2. la déclaration arrive par le CHEMIN qui lance (paramètre d'URL), donc
 *      d'un écran qui a dû l'écrire ;
 *   3. le PRÉFLIGHT l'AFFICHE pendant le décompte et laisse la corriger, avant
 *      qu'aucun tracker n'existe.
 * Retirer l'une des trois rouvre exactement le défaut d'origine.
 *
 * ─── POURQUOI DES GARDE-FOUS DE SOURCE ─────────────────────────────────────
 * La chaîne du départ (hook React, AsyncStorage, expo-sensors) n'est pas
 * exécutable sous Deno : le seul filet possible pour l'INTERFACE est la lecture
 * de source, comme dans `features/social/activityScoping.test.ts`. Les
 * fonctions PURES, elles, sont testées normalement.
 *
 * Les commentaires sont RETIRÉS avant chaque scan : ces fichiers PARLENT de
 * `gryd.mapactivity` pour raconter le défaut, et un garde-fou qui confondrait
 * une explication avec une dérivation serait un garde-fou menteur.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, DEFAULT_ACTIVITY } from '@klaim/shared';
import { RUN_GPS_COPY } from '../../../i18n/catalog/runGps.ts';
import {
  canResumeInterrupted,
  parseStartActivity,
  START_ACTIVITY_PARAM,
  UNDECLARED_START_ACTIVITY,
} from './runActivity.ts';

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

// ─── 1. Ce qu'un chemin MUET veut dire ──────────────────────────────────────

Deno.test('un chemin qui ne déclare rien lance une course à pied — un constat, pas un repli', () => {
  // Tout ce qui existait avant le vélo est de la course à pied : un chemin qui
  // ne dit rien est un chemin ANTÉRIEUR au vélo. La valeur ne peut donc pas
  // diverger du défaut du domaine sans que l'un des deux devienne faux.
  assertEquals(UNDECLARED_START_ACTIVITY, 'run');
  assertEquals(UNDECLARED_START_ACTIVITY, DEFAULT_ACTIVITY);
});

// ─── 2. La lecture du paramètre : DÉFENSIVE, jamais bloquante ───────────────

Deno.test('parseStartActivity ne reconnaît QUE les disciplines du domaine', () => {
  for (const a of ACTIVITIES) assertEquals(parseStartActivity(a), a);
});

Deno.test('toute valeur inconnue retombe sur la course — jamais une discipline inventée', () => {
  // Un joueur qui appuie sur GO doit partir : le pire cas est le comportement
  // historique, et il est VISIBLE au préflight (donc corrigeable avant le 1er m).
  for (const raw of [undefined, null, '', 'BIKE', 'Bike', 'walk', 'course', '0', ' bike']) {
    assertEquals(parseStartActivity(raw), UNDECLARED_START_ACTIVITY, `« ${String(raw)} »`);
  }
});

Deno.test('un paramètre RÉPÉTÉ garde la première valeur, jamais celle ajoutée après', () => {
  // `expo-router` rend un tableau pour `?activity=run&activity=bike`. Prendre
  // la DERNIÈRE laisserait un lien forgé écraser ce que l'écran avait déclaré.
  assertEquals(parseStartActivity(['run', 'bike']), 'run');
  assertEquals(parseStartActivity(['bike', 'run']), 'bike');
  assertEquals(parseStartActivity([]), UNDECLARED_START_ACTIVITY);
});

Deno.test('le nom du paramètre est le contrat partagé avec les écrans de départ', () => {
  assertEquals(START_ACTIVITY_PARAM, 'activity');
});

// ─── 3. Deux mondes ne fusionnent JAMAIS ────────────────────────────────────

Deno.test('une sortie interrompue ne se reprend que dans sa PROPRE discipline', () => {
  for (const a of ACTIVITIES) {
    assertEquals(canResumeInterrupted(a, a), true);
    for (const b of ACTIVITIES) {
      if (a !== b) assertEquals(canResumeInterrupted(a, b), false, `${a} → ${b}`);
    }
  }
});

Deno.test('le cœur retire « Reprendre » au lieu de fusionner deux disciplines', async () => {
  const code = await readCode('./useRealRunCore.ts');
  assert(
    code.includes('canResumeInterrupted'),
    'le gate doit dériver la possibilité de reprise de la discipline, jamais l’offrir toujours',
  );
  assert(
    /resume:\s*canResumeInterrupted\(/.test(code),
    'la reprise exposée à l’écran doit être `null` quand les mondes diffèrent — ' +
      'un bouton qui échoue toujours est un bouton mort',
  );
});

// ─── 4. Le garde-fou central : plus AUCUNE dérivation depuis l'affichage ────

Deno.test(
  'AUCUN fichier de features/run/** ne dérive la discipline d’une préférence de carte',
  async () => {
    // Le réglage d'affichage, sous toutes ses formes : le module, ses accesseurs
    // et sa clé de stockage. En atteindre UN depuis la course, c'est rouvrir le
    // défaut — peu importe le fichier qui le fait. `useActivityPref` et
    // `useActivityLens` ont été AJOUTÉS le 26/07 : ce sont les deux hooks qui
    // lisent réellement la préférence aujourd'hui, et ils vivent désormais dans
    // `ui/`, hors du module `map` que la liste d'origine surveillait.
    const interdits = [
      'mapPref',
      'getMapActivity',
      'useMapActivity',
      'useActivityPref',
      'useActivityLens',
      'gryd.mapactivity',
    ];
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

Deno.test('de `ui/activityLens`, la course n’importe QUE la table de libellés', async () => {
  // `activityLens` héberge à la fois le couple invariant RUN / BIKE (une donnée
  // d'affichage, légitime ici) et la clé de la préférence persistée. Importer
  // le module n'est donc PAS neutre : on borne explicitement ce qui peut en
  // sortir vers `features/run/**`, pour que le garde-fou ci-dessus ne puisse
  // pas être contourné par un ré-export.
  const autorises = new Set(['ACTIVITY_LABELS']);
  const fautes: string[] = [];
  for (const rel of await runFeatureFiles()) {
    const code = await readCode(`../${rel}`);
    for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"][^'"]*activityLens['"]/g)) {
      for (const nom of (m[1] ?? '').split(',')) {
        const clean = nom.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim() ?? '';
        if (clean !== '' && !autorises.has(clean)) fautes.push(`${rel} → ${clean}`);
      }
    }
  }
  assertEquals(fautes, [], 'seule la table de libellés traverse la frontière');
});

Deno.test('le module de déclaration ne lit RIEN — aucune source asynchrone', async () => {
  const code = await readCode('./runActivity.ts');
  // Une déclaration se lit d'un coup d'œil : ni attente, ni promesse, ni
  // stockage. Il importe désormais des VALEURS (`ACTIVITIES`), mais d'une seule
  // origine possible : le domaine.
  assert(!code.includes('await '), 'déclarer une discipline ne demande aucune lecture');
  assert(!code.includes('Promise'), 'la discipline n’est pas une valeur qu’on attend');
  assert(!code.includes('AsyncStorage'), 'aucune persistance ne décide d’une discipline');
  const sources = [...code.matchAll(/from\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assertEquals(sources, ['@klaim/shared'], 'la seule origine autorisée est le domaine');
});

// ─── 5. Le compilateur impose la déclaration (garde-fous de signature) ──────

Deno.test('confirmStart EXIGE une discipline (pas de départ muet)', async () => {
  const code = await readCode('./gateTypes.ts');
  assert(
    /confirmStart:\s*\(\s*activity:\s*Activity\s*\)/.test(code),
    'PreflightApi.confirmStart doit prendre la discipline en PARAMÈTRE OBLIGATOIRE : ' +
      'un `confirmStart: () => void` laisse le cœur la deviner à nouveau',
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

// ─── 6. LE DÉPART EST DÉCLARÉ *ET MONTRÉ* ──────────────────────────────────

Deno.test('la route de course LIT la discipline déclarée et la transmet au préflight', async () => {
  const code = await readCode('../../../../app/course-live.tsx');
  assert(code.includes('parseStartActivity'), 'la route doit lire le paramètre, pas le supposer');
  assert(
    /requestedActivity=\{requestedActivity\}/.test(code),
    'sans transmission au préflight, aucune sortie vélo ne serait ATTEIGNABLE : ' +
      'tout ce chantier resterait dormant',
  );
});

Deno.test('le préflight DÉCLARE la discipline qu’il a lui-même affichée', async () => {
  const code = await readCode('./RunPreflight.tsx');
  assert(
    code.includes('confirmStart(activityRef.current)'),
    'le départ doit passer la discipline COURANTE de l’écran — ni une constante ' +
      'de module, ni un appel à vide',
  );
  assertEquals(
    code.includes('confirmStart()'),
    false,
    'un confirmStart() à vide rouvrirait la devinette côté cœur',
  );
});

Deno.test('le préflight MONTRE ce qui va être enregistré, et laisse le démentir', async () => {
  const code = await readCode('./RunPreflight.tsx');
  // C'est ICI que se joue la différence entre « informer le départ » et
  // « décider à la place du joueur ». Sans cet affichage, une discipline
  // déclarée par l'URL redeviendrait une décision silencieuse — le défaut du
  // 25/07 avec un autre émetteur.
  assert(
    code.includes('preflightActivityKicker'),
    'la ligne « ce qui va être enregistré » est la promesse d’honnêteté de l’écran',
  );
  assert(code.includes('ACTIVITY_LABELS'), 'la discipline doit être LISIBLE, pas seulement connue');
  assert(
    /onPress=\{\(\) => \{[\s\S]{0,120}onDeclare\(a\)/.test(code),
    'chaque discipline doit être atteignable d’un tap — un affichage sans ' +
      'correction possible laisserait le joueur devant un fait accompli',
  );
  assert(
    /setCountdownRun\(/.test(code),
    'corriger doit RELANCER le décompte : partir à 1 seconde d’un changement ' +
      'donnerait le sentiment d’un choix volé',
  );
});

Deno.test('une sortie ne change JAMAIS de discipline une fois partie', async () => {
  const code = await readCode('./RunPreflight.tsx');
  assert(
    /if \(startedRef\.current \|\| stepIdx === null \|\| next === activity\) return;/.test(code),
    'la correction doit être refusée après le GO (le tracker existe) et après ' +
      'une annulation (plus aucun décompte à relancer)',
  );
});

Deno.test('l’écran LIVE dit en permanence quelle discipline est enregistrée', async () => {
  const code = await readCode('./RealCourseLive.tsx');
  // « Un coureur ne doit jamais découvrir après coup que sa sortie est partie
  // en vélo, ni l'inverse. » Le libellé d'état ne suffit pas : en pause ou en
  // recherche GPS, il ne nomme plus la discipline.
  assert(code.includes('ACTIVITY_LABELS[activity]'), 'la pill de discipline doit être rendue');
  assert(
    code.includes('a11yLiveActivity'),
    'et nommée en toutes lettres au lecteur d’écran (le libellé visible est un invariant)',
  );
  // 26/07/2026 — le libellé d'état ne se choisit plus par un ternaire local :
  // il vient de `RUN_GPS_COPY`, la table par discipline qui porte AUSSI les
  // treize autres surfaces de cet écran qui nommaient l'effort (limite
  // d'enregistrement, aide arrière-plan, libellés lus à voix haute…). Le
  // garde-fou suit la structure au lieu de citer une clé : c'est la table qui
  // doit être lue, et le Record exhaustif qui empêche une discipline muette.
  assert(
    /RUN_GPS_COPY\[run\.activity\]/.test(code),
    '« EN COURSE » pendant une sortie vélo est faux au sens littéral : le ' +
      'libellé d’état doit venir de la table par discipline',
  );
  assert(
    code.includes('copy.statusFinished') && code.includes('copy.status'),
    'les DEUX états qui nomment l’effort (en cours, terminé) suivent la discipline',
  );
  // …et la table donne bien deux mots différents (le reste est verrouillé
  // exhaustivement par `i18n/catalog/runGps.test.ts`).
  assertEquals(RUN_GPS_COPY.bike.status.fr === RUN_GPS_COPY.run.status.fr, false);
});

// ─── 7. Le drapeau vélo dit ce qu'il fait, et rien de plus ──────────────────

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
