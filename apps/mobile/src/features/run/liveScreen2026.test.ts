/**
 * GRYD — LA COUTURE DE L'ÉCRAN DE COURSE (LOT R, 11/09/2026).
 *
 * ═══ POURQUOI DES TESTS QUI LISENT DU TEXTE ═════════════════════════════════
 * Même patron que `liveChain2026.test.ts` : les défauts que ce lot referme ne
 * sont pas des erreurs de calcul mais des BRANCHEMENTS. `liveMetrics2026` peut
 * être parfaitement testé (il l'est, 19 tests) sans que l'écran n'en affiche une
 * seule valeur — et rien ne compilerait en rouge. La faute serait dans l'appel
 * qui n'existe pas, pas dans la logique.
 *
 * Chaque règle cite l'état d'AVANT (« étape 0 »), pour qu'on ne confonde pas ce
 * fichier avec un test qui passe parce qu'il ne demande rien.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

/** Source d'un fichier, commentaires retirés : ils CITENT les défauts. */
function code(relPath: string): string {
  return Deno.readTextFileSync(new URL(relPath, import.meta.url))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const SCREEN = code('./gps/RealCourseLive.tsx');
const PIPELINE = code('./gps/runPipeline.ts');
const CORE = code('./gps/useRealRunCore.ts');
const TRACKER = code('./gps/tracker.ts');

// ════════════════════════════════════════════════════════════════════════════
// 1. LE BANDEAU AFFICHE CE QUE LE SNAPSHOT MESURE
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : le bandeau tenait en TROIS `<Text>` — `snapshot.distanceM`,
 * `clock(snapshot.activeS)` et `liveRateDisplay(…, snapshot.paceSPerKm, …)`.
 * Aucune des quatre mesures ci-dessous n'était lue nulle part dans le fichier.
 */
Deno.test('écran : les mesures de Strava sont AFFICHÉES, pas seulement calculées', () => {
  for (const champ of ['livePaceSPerKm', 'elevationGainM', 'cadenceSpm', 'accuracyM']) {
    assert(SCREEN.includes(`snapshot.${champ}`),
      `l’écran doit lire snapshot.${champ} : le calculer sans le peindre ne sert personne`);
  }
  assert(SCREEN.includes('snapshot.splits') && SCREEN.includes('snapshot.lastSplit'),
    'les kilomètres et le dernier km doivent être peints');
  assert(SCREEN.includes('snapshot.laps'), 'les tours (INTVL) doivent être peints');
});

/**
 * ÉTAPE 0 : `computeSnapshot` rendait `paceSPerKm: km > 0 ? activeS / km : 0` et
 * rien d'autre du côté « effort ». La moyenne depuis le départ était la SEULE
 * allure du produit pendant la course.
 */
Deno.test('snapshot : les mesures live sont dérivées de la MÊME trace lissée', () => {
  const bloc = PIPELINE.slice(PIPELINE.indexOf('export function computeSnapshot'));
  for (const appel of [
    'livePaceSPerKm(smoothed, nowTs)',
    'liveSplits(smoothed, state.activity)',
    'liveElevationGainM(smoothed, state.activity)',
    'lapsFrom(smoothed, state.lapMarks ?? [], nowTs)',
  ]) {
    assert(bloc.includes(appel),
      `${appel} doit lire la trace lissée : une seconde source raconterait une autre sortie`);
  }
  assert(bloc.includes('cadenceSpm(state.stepSamples ?? [], nowTs)'),
    'la cadence vient des échantillons du podomètre, jamais d’une estimation');
});

/**
 * L'anti-mensonge structurel : ces mesures peuvent TOUTES manquer (pas
 * d'altimètre, pas de podomètre, pas encore de kilomètre, arrêt au feu). Le
 * type doit le permettre, sinon un `0` finirait par passer pour une mesure.
 */
Deno.test('snapshot : chaque mesure absente est représentable par `null`', () => {
  for (const champ of ['livePaceSPerKm', 'elevationGainM', 'cadenceSpm', 'accuracyM']) {
    assert(new RegExp(`${champ}: number \\| null`).test(PIPELINE),
      `${champ} doit pouvoir valoir null : « pas mesuré » n’est pas « zéro » (L8)`);
  }
  assert(PIPELINE.includes('lastSplit: Split | null'), 'aucun kilomètre bouclé ⇒ aucun dernier km');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. LA BOUCLE GRYD — la mesure que Strava n'a pas
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `snapshot.loopGapM` et `farthestGapM` existaient depuis des mois et
 * n'avaient AUCUN lecteur dans `RealCourseLive` : l'écran de la sortie ne disait
 * pas un mot du jeu auquel on joue en courant.
 */
Deno.test('écran : la boucle se dit, avec l’AUTORITÉ du serveur', () => {
  assert(SCREEN.includes('loopClosurePhase('),
    'l’état de boucle vient du moteur partagé, jamais d’un seuil réinventé à l’écran');
  assert(SCREEN.includes('loopMissingM(snapshot.loopGapM'),
    'les mètres restants se lisent sur la mesure, à la tolérance de la discipline');
  assert(SCREEN.includes("run.effectiveMode === 'conquete'"),
    'hors conquête il n’y a rien à fermer : la ligne ne se peint pas');
});

// ════════════════════════════════════════════════════════════════════════════
// 3. LE TOUR MANUEL (INTVL) — et son plancher, visible
// ════════════════════════════════════════════════════════════════════════════

Deno.test('tour : le bouton existe, et il se DÉSACTIVE au lieu de refuser en silence', () => {
  assert(SCREEN.includes('run.markLap()'), 'le bouton « Tour » appelle bien la chaîne vivante');
  assert(SCREEN.includes('!run.canMarkLap'),
    'sous le plancher, le bouton est désactivé — « aucun bouton mort »');
  assert(TRACKER.includes('markLap(nowTs: number): boolean'),
    'le tracker porte la marque : un état d’écran la perdrait au premier remontage');
  assert(TRACKER.includes('canMarkLap(this.startedAt, this.lapMarksList, nowTs)'),
    'le plancher est appliqué par le module PUR, pas par le bouton');
});

Deno.test('tour : les marques survivent à un kill (comme la trace et le chrono)', () => {
  const flush = CORE.slice(CORE.indexOf('const flush = useCallback'), CORE.indexOf('const uploadOrQueue'));
  assert(flush.includes('lapMarks: [...t.lapMarks]'), 'le buffer persiste les tours');
  const resume = CORE.slice(CORE.indexOf('const resumeStored = useCallback'), CORE.indexOf('const discardStored'));
  assert(resume.includes('initialLapMarks:'), 'la reprise rend ses tours à la sortie');
});

// ════════════════════════════════════════════════════════════════════════════
// 4. LE VERROU, L'ÉCRAN ALLUMÉ, LA VOIX
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : aucun verrou. Le geste le plus facile à provoquer par accident dans
 * une poche ou sous la pluie était « Terminer », qui clôt la sortie.
 */
Deno.test('verrou : il existe, il se déverrouille par un GLISSEMENT, et il n’arrête rien', () => {
  assert(SCREEN.includes('LockOverlay'), 'l’écran verrouillé existe');
  assert(SCREEN.includes('onTouchMove') && SCREEN.includes('UNLOCK_RATIO'),
    'le déverrouillage est un glissement mesuré sur la piste RÉELLE, pas un tap');
  assert(SCREEN.includes('C.lockedBody'),
    'l’écran verrouillé DIT que l’enregistrement continue : un voile plein écran se lit comme un arrêt');
  assert(SCREEN.includes('onAccessibilityTap'),
    'un lecteur d’écran ne glisse pas : sans cette porte, VoiceOver resterait enfermé en pleine sortie');
});

Deno.test('écran allumé : le hook est branché sur l’écran de course', () => {
  assert(SCREEN.includes('useKeepScreenAwake2026()'),
    'toute app de course garde l’écran allumé pendant l’enregistrement');
});

/**
 * ÉTAPE 0 : la sortie ne parlait que TROIS fois (départ, boucle presque fermée,
 * boucle fermée) et sa voix n'était réglable NULLE PART.
 */
Deno.test('voix : le kilomètre s’annonce, une fois, et tout se coupe d’un interrupteur', () => {
  assert(CORE.includes('kmAnnouncement2026('), 'le kilomètre est annoncé');
  assert(CORE.includes('lastKm.index > lastAnnouncedKmRef.current'),
    'on annonce la PROGRESSION, jamais un état — sinon le tick répéterait chaque seconde');
  assert(CORE.includes('voiceOnRef.current && lastKm'),
    'l’annonce du kilomètre respecte le réglage');
  for (const appel of ['if (opening !== null && voiceOnRef.current)', 'if (voiceOnRef.current) say(VOICE_LINE_2026[cue])']) {
    assert(CORE.includes(appel),
      'l’interrupteur gouverne TOUTE la voix : couper le son n’est pas demander « moins d’annonces »');
  }
  const reglages = code('../../../app/parametres/[section].tsx');
  assert(reglages.includes('saveVoicePref2026') && reglages.includes("saveAutoPause2026('bike'"),
    '« Pendant la sortie » règle enfin la voix ET la pause automatique, par discipline');
});

// ════════════════════════════════════════════════════════════════════════════
// 5. AUCUNE MESURE NE SE FABRIQUE À L'ÉCRAN
// ════════════════════════════════════════════════════════════════════════════

Deno.test('écran : une mesure absente rend le TIRET, jamais un zéro', () => {
  assert(SCREEN.includes('NO_MEASURE'),
    'le glyphe « valeur non mesurée » vient de liveRate, une seule convention pour tout le produit');
  assert(/function whole\(value: number \| null\)/.test(SCREEN),
    'le formateur d’entier doit accepter null et rendre le tiret');
  assert(SCREEN.includes('snapshot.livePaceSPerKm === null ? NO_MEASURE'),
    'à l’arrêt, l’allure instantanée disparaît au lieu d’afficher une allure absurde');
});

Deno.test('écran : aucun hex en dur, la chartreuse ne porte aucun chiffre', () => {
  assert(!/#[0-9a-fA-F]{6}/.test(SCREEN), 'les couleurs viennent des tokens (ADR-008)');
  // Les styles de CHIFFRE (`distance`, `number`, `small`) sont en `darkInk` :
  // le contraste maximal, le seul qui survive au plein soleil. `c.accent` ne
  // colore que des ÉTATS (point d'enregistrement, meilleur km, boucle fermée).
  // On lit la FEUILLE DE STYLES, pas le fichier entier : `distance` est aussi un
  // nom de propriété du verrou, et chercher dans tout le fichier testerait la
  // première occurrence venue plutôt que le style qui peint le chiffre.
  const styles = SCREEN.slice(SCREEN.indexOf('StyleSheet.create({'));
  for (const style of ['distance:', 'number:', 'small:']) {
    const at = styles.indexOf(style);
    assert(at >= 0, `le style ${style} doit exister`);
    assert(styles.slice(at, at + 90).includes('c.darkInk'), `${style} doit rester blanc sur carbone`);
  }
});
