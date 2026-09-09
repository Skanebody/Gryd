/**
 * GRYD — LA COUTURE DE LA CHAÎNE VIVANTE (carte → sortie → résultat).
 *
 * ─── POURQUOI DES TESTS QUI LISENT DU TEXTE ─────────────────────────────────
 * Même patron que `mvp/couture.test.ts` et `territory/lensGuards.test.ts` : les
 * défauts corrigés ici ne sont pas des erreurs de calcul mais des BRANCHEMENTS.
 * Un `router.push('/course')` compile, ne plante pas, et envoie le joueur dans
 * l'app d'août ; un `deadMs` écrit par personne compile aussi. Aucune fonction
 * pure ne peut attraper ça : la faute est dans l'appel, pas dans la logique.
 *
 * Chaque règle ci-dessous cite le code EXACT qu'elle aurait fait échouer
 * (« étape 0 »), avec son fichier — sinon rien ne distinguerait ce fichier d'un
 * test qui passe parce qu'il ne demande rien.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

/** Source d'un fichier, commentaires retirés : ils CITENT les défauts. */
function code(relPath: string): string {
  return Deno.readTextFileSync(new URL(relPath, import.meta.url))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

// ════════════════════════════════════════════════════════════════════════════
// Constat 1 — LA REPRISE APRÈS CRASH
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `app/_layout.tsx` faisait `if (next === 'recover_run') router.push('/course')`.
 * `/course` est l'écran du groupe `(mvp)`, en quarantaine : une course
 * interrompue rouvrait l'app d'août ENTIÈRE, dont la reprise réécrit le buffer
 * en `activity:'run'`, `mode:'conquete'`, `deadMs:0` — une sortie vélo tuée par
 * l'OS revenait en course à pied. `bootSequence.ts` documentait pourtant déjà
 * la bonne cible (« c'est-à-dire /course-live »).
 */
Deno.test('reprise : le démarrage rend la course interrompue à la chaîne vivante', () => {
  const layout = code('../../../app/_layout.tsx');
  const handoff = layout.slice(layout.indexOf("next === 'recover_run'"));
  assert(handoff.startsWith("next === 'recover_run') router.push('/course-live')"),
    'la reprise doit mener à /course-live, jamais à l’écran (mvp) /course');
  assert(!/router\.(push|replace)\('\/course'\)/.test(layout),
    'aucun chemin du démarrage n’envoie plus le joueur dans le groupe (mvp)');
});

/**
 * ÉTAPE 0 : `StoredRun.deadMs` n'avait AUCUN lecteur ni AUCUN écrivain hors du
 * groupe `(mvp)`. `flush()` persistait tout sauf lui, et `resumeStored`
 * reconstruisait le tracker sans le mesurer : une sortie tuée à 20 minutes et
 * rouverte trois heures plus tard affichait 3 h 20 (`runPipeline`, `activeS`).
 */
Deno.test('reprise : le temps où l’app ne tournait pas est mesuré, persisté et retranché', () => {
  const core = code('./gps/useRealRunCore.ts');
  const flush = core.slice(core.indexOf('const flush = useCallback'), core.indexOf('const uploadOrQueue'));
  assert(flush.includes('deadMs: t.deadMs'), 'le buffer doit persister le temps mort déjà mesuré');
  const resume = core.slice(core.indexOf('const resumeStored = useCallback'), core.indexOf('const discardStored'));
  assert(resume.includes('resumedDeadTimeMs(stored, Date.now())'), 'la reprise doit MESURER son temps mort');
  assert(resume.includes('deadMs,'), 'et le passer au tracker fusionné');
  assert(resume.includes('deadMs: merged.deadMs'), 'puis le réécrire sur le disque (2ᵉ kill)');
  const pipeline = code('./gps/runPipeline.ts');
  assert(pipeline.includes('- measurableMs(state.deadMs)'), 'le chrono retranche le temps mort');
});

/**
 * ÉTAPE 0 : la carte de reprise proposait « Reprendre » quel que soit l'ÂGE du
 * buffer, alors que la décision de démarrage, elle, applique une fenêtre de
 * 24 h depuis toujours (`CRASH_RECOVERY_MAX_AGE_MS`). Rouvrir une sortie de la
 * semaine dernière faisait repartir son chronomètre sur des jours d'absence.
 */
Deno.test('reprise : hors fenêtre, « Reprendre » n’existe pas — et l’écran dit pourquoi', () => {
  const core = code('./gps/useRealRunCore.ts');
  assert(core.includes('CRASH_RECOVERY_MAX_AGE_MS'), 'la même fenêtre que la décision de démarrage');
  assert(core.includes("? 'other_activity'") && core.includes("? 'too_old'"),
    'les deux causes de refus sont nommées, jamais un bouton qui disparaît sans raison');
  const live = code('./gps/RealCourseLive.tsx');
  assert(live.includes('resumeBlocked'), 'l’écran peint la raison du refus');
});
