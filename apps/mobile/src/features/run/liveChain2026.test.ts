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

// ════════════════════════════════════════════════════════════════════════════
// Constat 2 — L'ÉCRAN DE RÉSULTAT
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `RunResult` gatait la publication et le moment de progression sur
 * `result.status === 'valid'`. Le serveur écrit ce champ EN DUR pour toute
 * sortie ingérée (`ingest_run/refonte2026.ts`, `status:'valid'`) : la garde ne
 * gardait rien, et la carte de partage annonçait `credited` — une affiche de
 * victoire — pour une boucle que le serveur venait de refuser.
 */
Deno.test('résultat : un gain ne s’annonce que sur une capture PUBLIÉE', () => {
  const result = code('../refonte/RunResult.tsx');
  assert(!/result\.status === 'valid'/.test(result),
    '`status` vaut « valid » pour toute sortie ingérée : ce n’est pas une garde');
  assert(result.includes("const capturePublished = territory?.status === 'published';"));
  assert(result.includes('credited: capturePublished'), 'la carte de partage ne crédite que le publié');
  assert(result.includes('surfaceValue: capturePublished'), 'aucune surface annoncée sans publication');
  assert(result.includes('progression2026?.status === \'confirmed\''),
    'la progression sportive se gate sur SON fait serveur (§5.5 règle 8), pas sur le terrain');
});

/**
 * ÉTAPE 0 : sans backend, sans session, ou sur la sortie d'un autre compte,
 * l'effet de lecture du terrain sortait avant de poser le moindre état :
 * `captureRead` restait `'idle'` et l'écran affichait « Vérification du terrain
 * actuel… » pour toujours. Un chargement qui n'a pas commencé n'est pas un
 * chargement.
 */
Deno.test('résultat : « vérification » n’est jamais dite quand aucune lecture n’aura lieu', () => {
  const result = code('../refonte/RunResult.tsx');
  assert(result.includes("setCaptureRead('unavailable')"), 'l’absence de lecture est un état nommé');
  const guard = result.indexOf("{ setCaptureRead('unavailable'); return; }");
  assert(guard > 0 && guard < result.indexOf("setCaptureRead('loading')"),
    'l’état indisponible se pose AVANT toute promesse de lecture');
});

/**
 * ÉTAPE 0 : le retour au journal faisait `router.replace('/profil')` — un
 * chemin qui dépend de la résolution de groupe, alors que le dépôt cible
 * partout `/(tabs)/profil`. Et l'invité (`ownerId === null`) ne lisait nulle
 * part que sa sortie ne prend aucun terrain.
 */
Deno.test('résultat : journal explicite, et l’invité sait ce qu’il ne capture pas', () => {
  const result = code('../refonte/RunResult.tsx');
  assert(!/router\.replace\('\/profil'\)/.test(result), 'la cible du journal est explicite');
  assert(result.includes("router.replace('/(tabs)/profil')"));
  assert(result.includes('const guestRecording = ownerId === null'));
  assert(result.includes('{configured && <Pressable'), 'le CTA compte est gardé par `configured` (aucun bouton mort)');
});

/**
 * ÉTAPE 0 : toute surface passait par `(n / 1e6)` à trois décimales ; un gain
 * de quelques centaines de m² s'affichait « +0 km² ».
 */
Deno.test('résultat : aucune surface ne s’affiche « 0 » alors qu’elle existe', () => {
  const result = code('../refonte/RunResult.tsx');
  assert(!/\/ 1e6\)\.toLocaleString/.test(result), 'le formatage de surface passe par le module testé');
  assert(result.includes('captureAreaLabel2026(n, fr)'));
});

// ════════════════════════════════════════════════════════════════════════════
// Constat 6 — LA DISCIPLINE DE LA SORTIE
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `runActivity.ts` promettait depuis le 26/07 que « le PRÉFLIGHT
 * l'AFFICHE en toutes lettres pendant le décompte et laisse la CORRIGER d'un
 * tap ». La pastille était une `<View>` : rien n'était corrigeable. Or le
 * décompte part TOUT SEUL dès qu'un choix de confidentialité est enregistré —
 * une lentille de carte restée sur Vélo envoyait donc une vraie course à pied
 * dans le monde vélo en trois secondes, sans que personne puisse la démentir.
 */
Deno.test('départ : la discipline montrée au préflight est corrigeable d’un tap', () => {
  const preflight = code('./gps/RunPreflight.tsx');
  const at = preflight.indexOf('s.discipline,');
  assert(at > 0, 'la pastille de discipline doit exister');
  const badge = preflight.slice(at - 400, at + 200);
  assert(badge.includes('Pressable') && badge.includes('onPress={correctActivity}'),
    'la pastille de discipline doit être touchable');
  assert(preflight.includes('const [activity, setActivity]'), 'le préflight porte la discipline qu’il va confirmer');
  assert(preflight.includes('confirm.current(activity,'), 'c’est CETTE discipline qui part au tracker');
  assert(!/confirm\.current\(requestedActivity/.test(preflight),
    'la discipline déclarée par l’URL ne peut plus court-circuiter la correction');
});
