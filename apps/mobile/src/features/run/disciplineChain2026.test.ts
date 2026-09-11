/**
 * GRYD — LA COUTURE DU CONTRÔLE DE DISCIPLINE (écran de fin → payload).
 *
 * ─── POURQUOI DES TESTS QUI LISENT DU TEXTE ─────────────────────────────────
 * Même patron que `liveChain2026.test.ts` : les défauts visés ici ne sont pas
 * des erreurs de calcul mais des BRANCHEMENTS et des OMISSIONS d'écran. Un
 * `await run.finish()` qui saute le contrôle compile parfaitement ; une feuille
 * avec une croix compile aussi. Aucune fonction pure ne les attrape : la faute
 * est dans l'appel et dans le JSX, pas dans la règle.
 *
 * ═══ ÉTAPE 0 — CE QUI EXISTAIT LE 11/09/2026 AU SOIR ════════════════════════
 * `RealCourseLive.finish()` valait exactement :
 *
 *     const result = await run.finish();
 *     router.replace({ pathname: '/course/analyse', … });
 *
 * Aucun contrôle, aucune question : quelqu'un qui avait tapé « Course » avant
 * de partir à vélo voyait sa sortie prendre du terrain, des points de
 * classement et l'avancement d'un défi de crew, sans que rien ne lui soit
 * jamais demandé. Le seul filet était le signal anti-triche `discipline_mismatch`
 * côté serveur, qui GÈLE la capture et convoque une revue humaine : une
 * sanction là où il n'y avait qu'une erreur de bouton.
 *
 * Les six tests ci-dessous échouent tous sur cette version.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

/** Source d'un fichier, commentaires retirés : ils CITENT les défauts. */
function code(relPath: string): string {
  return Deno.readTextFileSync(new URL(relPath, import.meta.url))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

// ════════════════════════════════════════════════════════════════════════════
// 1. LE CONTRÔLE A LIEU AVANT L'ENVOI, ET NON APRÈS
// ════════════════════════════════════════════════════════════════════════════

Deno.test('ÉTAPE 0 — « Terminer » lit le contrôle AVANT toute clôture', () => {
  const screen = code('./gps/RealCourseLive.tsx');
  const finish = screen.slice(screen.indexOf('const finish = async ()'), screen.indexOf('const complete = async ('));
  assert(
    finish.includes('run.disciplineVerdict()'),
    'le tap sur « Terminer » doit consulter le contrôle',
  );
  assert(
    finish.indexOf('run.disciplineVerdict()') < finish.indexOf('complete('),
    'et le consulter AVANT d’enclencher la clôture',
  );
  assert(
    !finish.includes('run.finish('),
    'le chemin qui pose la question ne doit JAMAIS clôturer lui-même',
  );
  assert(
    finish.includes("verdict.suspected !== null") && finish.includes('setAsking(verdict)'),
    'un soupçon ouvre la feuille au lieu de partir',
  );
});

Deno.test('rien de suspect ⇒ la sortie part comme avant, sans argument', () => {
  const screen = code('./gps/RealCourseLive.tsx');
  const finish = screen.slice(screen.indexOf('const finish = async ()'), screen.indexOf('const complete = async ('));
  assert(
    /await complete\(\);/.test(finish),
    'sans soupçon, la clôture s’appelle SANS choix : aucun champ nouveau ne part',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 2. DEUX ISSUES DE MÊME RANG, ET AUCUNE TROISIÈME
// ════════════════════════════════════════════════════════════════════════════

Deno.test('la feuille porte EXACTEMENT deux actions, et elles partagent leur style', () => {
  const sheet = code('./gps/DisciplineSheet2026.tsx');
  const pressables = sheet.match(/<Pressable/g) ?? [];
  assert(pressables.length === 2, `deux actions, pas ${pressables.length}`);
  const styled = sheet.match(/s\.choice,/g) ?? [];
  assert(
    styled.length === 2,
    'les deux boutons portent le MÊME style : aucun n’est désigné comme « le bon »',
  );
  assert(
    !/s\.primary|backgroundColor: c\.accent/.test(sheet),
    'aucun accent chartreuse ne désigne une réponse préférable',
  );
});

Deno.test('AUCUNE troisième issue : ni croix, ni « plus tard », ni fermeture par tap', () => {
  const sheet = code('./gps/DisciplineSheet2026.tsx');
  for (const echappatoire of ['onRequestClose', 'onDismiss', 'onClose', 'onBackdropPress', 'GrydIcon name="close"']) {
    assert(!sheet.includes(echappatoire), `« ${echappatoire} » rouvrirait une issue muette`);
  }
  const screen = code('./gps/RealCourseLive.tsx');
  const monte = screen.slice(screen.indexOf('<DisciplineSheet2026'));
  const props = monte.slice(0, monte.indexOf('/>'));
  assert(props.includes('onSwitch=') && props.includes('onKeep='), 'les deux réponses sont câblées');
  assert(
    (props.match(/setAsking\(null\)/g) ?? []).length === 2,
    'la feuille ne se referme que par l’une des deux réponses',
  );
});

Deno.test('la feuille est montée AU-DESSUS du verrou : une question cachée ne se répond pas', () => {
  const screen = code('./gps/RealCourseLive.tsx');
  assert(
    screen.indexOf('<LockOverlay') < screen.lastIndexOf('<DisciplineSheet2026'),
    'la feuille doit venir après le verrou dans l’arbre',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LE CHOIX VOYAGE JUSQU'AU PAYLOAD, ET JUSQU'À L'ARCHIVE LOCALE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('les deux réponses atteignent la clôture, chacune avec sa charge', () => {
  const screen = code('./gps/RealCourseLive.tsx');
  const monte = screen.slice(screen.indexOf('<DisciplineSheet2026'));
  assert(
    /complete\(\{ kind: 'switch', to \}\)/.test(monte),
    'basculer transmet la discipline mesurée',
  );
  assert(
    /complete\(\{ kind: 'keep', evidence: asking\.evidence \}\)/.test(monte),
    'garder transmet l’ÉVIDENCE montrée : un refus sans dossier serait un reproche nu',
  );
});

Deno.test('ÉTAPE 0 — le choix descend jusqu’au payload ET jusqu’à l’archive locale', () => {
  const core = code('./gps/useRealRunCore.ts');
  assert(
    core.includes('archiveFor(t, now, choice)'),
    'le journal local doit dire la même discipline que le payload',
  );
  assert(
    core.includes('uploadOrQueue(t.buildPayload(choice)'),
    'le payload envoyé porte le choix',
  );
  const archive = core.slice(core.indexOf('function archiveFor('), core.indexOf('export function useRealRunCore'));
  assert(
    archive.includes("choice?.kind === 'switch' ? choice.to : tracker.activity"),
    'basculer change aussi la discipline ARCHIVÉE',
  );
});

Deno.test('basculer RE-NETTOIE la trace aux bornes de la nouvelle discipline', () => {
  // ÉTAPE 0 : `buildIngestPayload` appelait `cleanTrace(state.fixes, state.activity)`
  // en dur. Basculer n'aurait changé que l'étiquette : la trace serait partie
  // amputée par les 25 km/h de la course sous une discipline qui n'ampute pas,
  // donc avec une distance fausse.
  const pipeline = code('./gps/runPipeline.ts');
  const build = pipeline.slice(pipeline.indexOf('export function buildIngestPayload('));
  assert(
    build.includes('effectiveActivity(state, choice)'),
    'la discipline EFFECTIVE gouverne le nettoyage',
  );
  assert(
    build.includes('payloadPoints(state, activity)'),
    'et les points du payload sont recalculés avec elle',
  );
  assert(
    !/cleanTrace\(state\.fixes, state\.activity\)/.test(build),
    'plus aucune borne figée sur la discipline déclarée',
  );
});

// ════════════════════════════════════════════════════════════════════════════
// 4. LE CONTRÔLE LIT LES POINTS QUI PARTIRONT, PAS UNE AUTRE TRACE
// ════════════════════════════════════════════════════════════════════════════

Deno.test('le verdict se calcule sur les points du PAYLOAD, jamais sur la trace brute', () => {
  const pipeline = code('./gps/runPipeline.ts');
  const verdict = pipeline.slice(
    pipeline.indexOf('export function runDisciplineVerdict2026('),
    pipeline.indexOf('export function buildIngestPayload('),
  );
  assert(
    verdict.includes('payloadPoints(state, state.activity).points'),
    'sinon l’écran annoncerait une vitesse que le serveur ne verra jamais',
  );
  assert(
    verdict.includes('state.stepWindows ?? []'),
    'et la cadence vient des tranches de podomètre, absentes = pas de question',
  );
});

Deno.test('le tracker ALIMENTE les tranches et les ferme sur la trace', () => {
  const tracker = code('./gps/tracker.ts');
  assert(
    tracker.includes('openStepWindows2026(Date.now(), this.stepCount)'),
    'le rangement s’ouvre quand le podomètre commence VRAIMENT d’écouter',
  );
  assert(tracker.includes('addStepSample2026('), 'chaque relevé y est rangé');
  assert(
    tracker.includes('sealStepWindows2026('),
    'et l’état exposé au module pur est FERMÉ (tranches à zéro comprises)',
  );
  const state = tracker.slice(tracker.indexOf('private state(): RunPipelineState'));
  assert(
    !state.includes('Date.now()'),
    'l’état exposé reste SANS horloge : le module pur doit être rejouable',
  );
});
