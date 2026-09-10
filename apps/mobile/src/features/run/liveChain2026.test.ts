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
import { captureExplanation2026, type CaptureReceipt2026 } from '../refonte/captureReceipt2026.ts';

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

// ════════════════════════════════════════════════════════════════════════════
// Constat 9 — LE DÉTAIL D'UNE SORTIE
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `app/course/[id].tsx` ne lisait que `celebration.hexes`. Le serveur
 * de septembre écrit ces compteurs à zéro pour TOUTE sortie 2026 : une sortie
 * qui avait pris du terrain se lisait « Sans capture », avec un « 0 » nu en
 * Points — un zéro que personne n'a décidé.
 */
Deno.test('détail : une sortie de septembre se lit dans son reçu, pas dans les cellules d’août', () => {
  const detail = code('../../../app/course/[id].tsx');
  assert(detail.includes('territoryFromCelebration2026(run.celebration)'), 'le reçu territorial est lu');
  assert(detail.includes('const total = receipt2026 ? null : capturedTotal(breakdown)'),
    'les compteurs de cellules ne racontent pas une sortie du monde des surfaces');
  assert(detail.includes('if (receipt2026) return;'), 'aucune cellule peinte dans le monde des surfaces');
  assert(detail.includes('awards.points !== null && !receipt2026'),
    'Points est écrit à zéro en dur par le serveur 2026 : ce n’est pas un fait à afficher');
  assert(detail.includes('captureAreaLabel2026(m2, locale'), 'les surfaces passent par le module testé');
});

// ════════════════════════════════════════════════════════════════════════════
// Constat 8 — LA CARTE QUAND LE MODULE NATIF MANQUE
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `ui/game/RealMap.tsx` repliait sur un fond noir DÉCORÉ (deux
 * familles de diagonales claires qui imitent des rues) et signait ce dessin
 * « © OpenStreetMap © CARTO » — une attribution pour des tuiles que personne
 * n'avait chargées. `flyTo` et `fitBounds` y étaient vides : « Me recentrer »,
 * le recadrage et la bascule de fond restaient allumés et ne faisaient rien.
 */
Deno.test('carte : sans module natif, aucun décor et aucune attribution empruntée', () => {
  const map = code('../../ui/game/RealMap.tsx');
  assert(!/grid-a-|grid-b-/.test(map), 'le repli ne dessine plus de fausses rues');
  const fallback = map.slice(map.indexOf('function ExpoGoMapFallback'));
  assert(!fallback.includes('basemapAttribution('),
    'on ne signe pas OpenStreetMap/CARTO sans afficher une seule de leurs tuiles');
  assert(map.includes('export function realMapAvailable()'),
    'les écrans doivent pouvoir dériver leurs contrôles de la capacité RÉELLE');
});

/**
 * ÉTAPE 0 : les trois écrans de la chaîne peignaient « Me recentrer » /
 * « Recentrer sur le dernier point » quel que soit le build. Sur un build sans
 * module natif, ces boutons appelaient un `flyTo` vide — « aucun bouton mort »
 * exige que l'affichage se dérive de la capacité réelle de la plateforme.
 */
Deno.test('carte : les contrôles de caméra n’existent que là où la caméra existe', () => {
  for (const path of ['../refonte/MapHome.tsx', './gps/RealCourseLive.tsx']) {
    const screen = code(path);
    assert(screen.includes('realMapAvailable()'), `${path} doit lire la capacité réelle`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Constat 7 — LA CARTE AU REPOS (G03)
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : pas connecté, en cours de lecture et « aucun terrain ici » rendaient
 * exactement la même carte vide — le joueur ne pouvait pas distinguer « GRYD ne
 * sait pas » de « il n'y a rien ». Le cahier donne la phrase du vide réel :
 * « Le quartier est à découvrir. » (G03)
 */
Deno.test('carte : les quatre états du territoire sont distincts, et le vide a sa phrase', () => {
  const map = code('../refonte/MapHome.tsx');
  assert(map.includes('Le quartier est à découvrir'), 'la phrase G03 du vide réel');
  assert(map.includes('ownership.signedOut') && map.includes('ownership.loading') && map.includes('ownership.failed'),
    'les trois autres états existent séparément');
  // 10/09/2026 : la borne haute était `map.indexOf('<GrydNavBar')`, et la Carte
  // ne monte plus de barre. Une borne absente rend -1, et `slice(a, -1)` avale
  // toute la feuille « Couches » : le test serait passé pour la mauvaise
  // raison, en trouvant les états là où justement il ne veut PAS d'eux seuls.
  // On borne donc sur ce qui délimite vraiment la carte : le début du rendu, et
  // l'ouverture de la feuille.
  const surLaCarte = map.slice(map.indexOf('return <View style={s.root}>'), map.indexOf('<Modal'));
  assert(surLaCarte.length > 0 && map.indexOf('<Modal') > 0, 'les bornes du rendu de carte existent');
  for (const state of ['signedOut', 'loading', 'failed']) {
    assert(surLaCarte.includes(state), `l’état ${state} doit se voir SUR la carte, pas seulement dans une feuille`);
  }
});

/**
 * ÉTAPE 0 : `disabled: !recording && (!choice.ready || choice.saving)` — une
 * préférence AsyncStorage illisible (`failed` ⇒ `ready === false`) éteignait le
 * bouton « Courir » DÉFINITIVEMENT. Un stockage en panne n'est pas une raison
 * d'interdire une sortie ; le préflight, lui, sait le dire et le réessayer.
 */
Deno.test('carte : « Courir » ne s’éteint jamais pour une préférence illisible', () => {
  // 10/09/2026 : l'action a quitté `MapHome` (`mapAction={{ … }}`) pour le hook
  // que la barre unique consomme sur les trois destinations. La garde suit le
  // code : c'est le hook qui décide désormais, et c'est donc lui qu'on lit.
  const action = code('../nav/useRunAction2026.ts');
  // Ce que le hook REND, pas ce que son type déclare (`disabled: boolean`).
  const rendu = action.slice(action.indexOf('  return {'));
  assert(rendu.length > 0, 'le hook doit rendre un objet d’action');
  assert(rendu.includes('disabled: false'),
    'une préférence illisible n’éteint plus le départ — `disabled` ne lit plus le stockage');
  assert(!/disabled: [^f]/.test(rendu), 'aucune autre condition ne peut éteindre le départ');
  assert(action.includes('/course-live?mode=conquete&activity='),
    'la chaîne de course est inchangée : même cible qu’avant le déménagement');
  const bar = code('../nav/GrydNavBar.tsx');
  assert(bar.includes('useRunAction2026'), 'et la barre unique la consomme');
});

/**
 * ÉTAPE 0 : `key={`${basemap}-${basemapRevision}-${activity}`}` détruisait et
 * reconstruisait la MapView à CHAQUE bascule Course/Vélo — alors que seules les
 * couches changent. Et `useOwnership` posait `features: []` avant son débounce :
 * le territoire clignotait à chaque déplacement de carte.
 */
Deno.test('carte : la vue survit à la bascule de sport, le territoire ne clignote plus', () => {
  const map = code('../refonte/MapHome.tsx');
  assert(!/key=\{`\$\{basemap\}-\$\{basemapRevision\}-\$\{activity\}`\}/.test(map),
    'la bascule de sport ne détruit plus la carte : elle change les couches');
  const ownership = code('../refonte/useOwnership.ts');
  assert(ownership.includes('keepFeatures'), 'l’ancien territoire tient jusqu’au nouveau');
  assert(ownership.includes('sameLens'), 'sauf quand la lentille change : deux mondes ne se mélangent pas');
});

/**
 * ÉTAPE 0 : le panneau d'une zone montrait sa surface mais ni sa date. Le
 * contrat la valide pourtant depuis toujours (`controlledSince`), et G04
 * demande « surface et dernière mise à jour ».
 */
Deno.test('carte : une zone sélectionnée porte sa date de prise', () => {
  const map = code('../refonte/MapHome.tsx');
  assert(map.includes('controlledSince'), 'la date validée par le contrat doit être peinte');
});

// ════════════════════════════════════════════════════════════════════════════
// Constat 3 — LA FIN DE SORTIE ET LES TROIS CAUSES GPS
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `/course/analyse` (E27) — l'écran G11 « Sauvegarde et analyse »,
 * complet, testé, qui peint les trois issues (analyse en attente, échec réseau,
 * envoi différé) — n'avait AUCUN appelant. `RealCourseLive` sautait directement
 * au résultat, et son propre docblock affirmait pourtant que « RealCourseLive
 * pose ici les paramètres et attend que E27 les remette à /course-result ».
 * Les trois issues n'étaient donc peintes nulle part.
 */
Deno.test('fin de sortie : la sauvegarde passe par l’écran qui sait dire ses trois issues', () => {
  const live = code('./gps/RealCourseLive.tsx');
  assert(live.includes("pathname: '/course/analyse'"), 'la fin de sortie ouvre G11');
  assert(live.includes('courseResultParams('), 'le relais reste celui du module testé');
  const analyse = code('../../../app/course/analyse.tsx');
  assert(analyse.includes("pathname: '/course-result'"), 'et G11 remet la main au résultat');
  // Et jamais un cul-de-sac : une sortie qui vient de finir garde l'accès à ses
  // mesures — elles sont sur l'appareil et n'ont jamais eu besoin du serveur.
  assert(analyse.includes('hints.fromFinish ? C.seeResult : C.leaveCta') && analyse.includes(') : hints.fromFinish ? ('),
    'toutes les issues de synchro laissent revenir au récapitulatif');
});

/**
 * ÉTAPE 0 : un seul bandeau servait trois causes différentes. `approxLocation`
 * (la précision exacte est COUPÉE dans les réglages) s'affichait « Signal GPS
 * faible. La trace reprendra au retour du signal. » — une phrase fausse, qui
 * fait attendre un retour qui n'arrivera jamais, et qui cache l'unique geste
 * qui débloque : ouvrir les Réglages.
 */
Deno.test('course : trois causes GPS, trois phrases, et les Réglages là où ils règlent', () => {
  const live = code('./gps/RealCourseLive.tsx');
  assert(live.includes('run.permissionRevoked') && live.includes('run.approxLocation') && live.includes("snapshot.signal !== 'ok'"),
    'les trois causes restent distinguées');
  assert(live.includes('run.openSettings'), 'les deux causes réglables ouvrent les Réglages système');
  assert(!/Signal GPS faible[^']*'\s*\)?\s*:\s*\(fr/.test(live) || live.includes('précision exacte'),
    'la précision réduite ne se dit plus « signal faible »');
});

// ════════════════════════════════════════════════════════════════════════════
// Constat 4 — L'ANCRE DE DÉPART ET L'ARRIÈRE-PLAN
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `begin_recording_2026` partait en « fire and forget ». Un départ
 * hors couverture n'ancrait donc jamais la sortie, et le serveur la classait
 * `source_or_clock_unconfirmed` — une capture perdue pour une barre de réseau.
 *
 * Le retry est BORNÉ par un fait, pas par une durée arbitraire : l'ancre porte
 * `started_at = now()` et `pointsAfterAnchor2026` écarte du jeu tout point
 * antérieur. Poser une ancre APRÈS les premiers points tronquerait la boucle —
 * pire que pas d'ancre du tout, puisque `adopt_recording_session_2026`
 * (migration 0155) sait désormais adopter une session a posteriori.
 */
Deno.test('départ : l’ancre est retentée tant qu’elle ne coûte rien, jamais après', () => {
  const core = code('./gps/useRealRunCore.ts');
  const anchor = core.slice(core.indexOf('const anchorRecording'), core.indexOf('const cancel = useCallback'));
  assert(anchor.includes("supabase.rpc('begin_recording_2026'"), 'l’ancre reste posée par le même appel');
  assert(anchor.includes('const nothingMeasuredYet = tracker.rawFixes.length === 0;'),
    'on ne retente que tant qu’aucun point n’a été mesuré : une ancre tardive tronquerait la boucle');
  assert(anchor.includes('if (trackerRef.current !== tracker || finishedRef.current) return;'),
    'aucune ancre ne se pose sur la sortie suivante ni sur une sortie terminée');
});

/**
 * ÉTAPE 0 : la permission « Toujours » n'était proposée qu'AU RETOUR d'un
 * passage en arrière-plan — c'est-à-dire après avoir déjà perdu des points.
 * Le cahier (G07) veut la question au moment où elle est utile : à l'amorce,
 * une seule fois, jamais à froid.
 */
Deno.test('départ : l’enregistrement écran verrouillé se propose AVANT la sortie, une fois', () => {
  const core = code('./gps/useRealRunCore.ts');
  assert(core.includes('backgroundOfferSeen'), 'la proposition est mémorisée : on ne harcèle pas');
  assert(core.includes('background: adapter.background === null ? null'), 'le préflight reçoit l’offre');
  const preflight = code('./gps/RunPreflight.tsx');
  assert(preflight.includes('preflight.background'), 'le préflight la peint');
  const offer = code('./gps/backgroundOffer.ts');
  assert(offer.includes('AsyncStorage'), 'la mémoire est locale, sans compte ni réseau');
});

// ════════════════════════════════════════════════════════════════════════════
// Constat 10 — LA VOIX (G09) ET L'HAPTIQUE (L6)
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `mvp/run/voice.ts` n'était appelé que par l'écran du groupe
 * `(mvp)`. La chaîne vivante n'avait AUCUNE annonce et AUCUNE vibration de
 * fermeture : le seul canal qui atteint quelqu'un qui court, écran éteint,
 * n'existait pas pour elle.
 */
Deno.test('course : la fermeture se dit et se sent, sur la transition et une seule fois', () => {
  const core = code('./gps/useRealRunCore.ts');
  assert(core.includes('gaugeVoice(gaugePhaseRef.current, phase, gaugeSaidRef.current)'),
    'la décision reste celle des règles pures — sur la TRANSITION, avec mémoire');
  assert(core.includes('gaugeHaptic(gaugePhaseRef.current, phase)'), 'L6 : l’haptique suit la même transition');
  assert(core.includes('say(VOICE_LINE_2026[cue])') && core.includes('startVoice(false)'),
    'le départ s’annonce, la reprise non');
  assert(core.includes('stopSpeaking()'), 'plus un mot au démontage de la sortie');
  assert(!/say\(\s*['"`]/.test(core), 'aucune phrase en dur : la voix parle le catalogue (L18)');
});

// ════════════════════════════════════════════════════════════════════════════
// Constat 11 — PAUSE AUTOMATIQUE, PROMESSE SANS COMPTE, PORTES /sign-in
// ════════════════════════════════════════════════════════════════════════════

/**
 * ÉTAPE 0 : `computeSnapshot` retranchait toujours les pauses automatiques, pour
 * les deux disciplines. Le cahier §8.2 la veut « désactivée par défaut, réglage
 * personnel » en course, et seulement « proposée » à vélo : un coureur voyait
 * donc son chrono se figer aux feux sans l'avoir demandé, et sans pouvoir le
 * refuser.
 */
Deno.test('sortie : la pause automatique suit le cahier, et se règle', () => {
  const pipeline = code('./gps/runPipeline.ts');
  assert(pipeline.includes('export function autoPauseDefault2026'), 'le défaut par discipline est nommé et testé');
  assert(pipeline.includes('autoPause ? autoPauseMs : 0'), 'désactivée, elle ne fige plus le chrono');
  const preflight = code('./gps/RunPreflight.tsx');
  assert(preflight.includes('autoPause'), 'le réglage se pose avant la sortie, pas en courant');
});

/**
 * ÉTAPE 0 : « Ta première sortie peut se faire sans compte. » laissait croire à
 * une limite d'essai — alors que la vraie règle est ailleurs : sans compte, RIEN
 * n'est capturé, jamais, et tout reste sur l'appareil.
 */
Deno.test('carte : sans compte, la phrase dit la vraie règle', () => {
  const map = code('../refonte/MapHome.tsx');
  assert(!map.includes('première sortie peut se faire sans compte'), 'la fausse limite d’essai disparaît');
  assert(map.includes('ne prennent aucun terrain'), 'la vraie règle est dite');
});

/**
 * ÉTAPE 0 : sans backend, `/sign-in` redirige sur `/` — un bouton mort.
 * `historique`, `activite` et le détail d'activité gardaient déjà leur porte
 * par `configured` ; la carte et les défis, non.
 */
Deno.test('portes : aucune invitation à se connecter sans backend pour l’honorer', () => {
  for (const path of ['../refonte/MapHome.tsx', '../refonte/RunResult.tsx']) {
    const screen = code(path);
    const at = screen.indexOf("router.push('/sign-in')");
    assert(at > 0, `${path} : la porte doit exister`);
    assert(screen.slice(0, at).includes('configured'), `${path} : et être gardée par \`configured\``);
  }
  const challenges = code('../../../app/challenges/index.tsx');
  assert(challenges.includes('configured'), 'les défis aussi');
});


// ════════════════════════════════════════════════════════════════════════════
// GARDES DE SOURCE HÉRITÉES DE `resultVariant.test.ts` (constat 12)
//
// Le module `resultVariant.ts` — la grammaire des écrans de résultat d'août —
// n'avait plus aucun importeur et a été supprimé avec ses tests. Ces gardes-là,
// elles, ne parlaient pas de lui : elles lisent le SOURCE de `RunResult.tsx`,
// l'écran vivant. Les perdre en même temps que le module mort aurait relâché
// quatre tripwires sur l'écran le plus vu du jeu.
// ════════════════════════════════════════════════════════════════════════════

const RESULT_SCREEN = code('../refonte/RunResult.tsx');

Deno.test('course-result : plus aucune garde `capReached` locale sur la surface', () => {
  assert(
    !RESULT_SCREEN.includes('capReached'),
    'la garde locale est de retour : elle protégeait le PNG partagé et PAS le bloc ' +
      'affiché, et elle ne couvrait que le plafond d’aire — pas le plafond quotidien, ' +
      'ni les zones privées/interdites, ni les cellules qu’un rival garde',
  );
});

Deno.test('2026 : résultat et partage reçoivent le même gain net publié par le serveur', () => {
  assert(
    RESULT_SCREEN.includes("const gain = territory?.status === 'published' ? territory.newTerrainM2 : null"),
    'le gain doit être la différence géométrique publiée, jamais la surface de boucle',
  );
  assert(
    RESULT_SCREEN.includes('territory2026: result?.territory2026'),
    'le partage doit recevoir le même verdict territorial versionné — la valeur ' +
      'du serveur elle-même, pas une reconstruction locale (`territory` en est la ' +
      'lecture au type ouvert, cf. captureReceipt2026)',
  );
  assert(
    RESULT_SCREEN.includes('const territory = result?.territory2026'),
    'le verdict territorial vient du serveur',
  );
});

Deno.test('course-result : la conclusion verify ne repasse pas par le booléen fusionné', () => {
  // `stats.verified` vaut `status === 'valid' || status === 'partial'`, donc
  // exactement « la course est créditée ». Le laisser décider de la ligne de
  // conclusion faisait dire « capture pleine » à une course amputée.
  assert(
    !/stats\.verified \? t\(C\.verifyOk\)/.test(RESULT_SCREEN),
    'la conclusion verify est redevenue binaire : `partial` et `valid` y racontent ' +
      'de nouveau la même chose, et `partial` y ment (« capture pleine »)',
  );
  assert(RESULT_SCREEN.includes('captureExplanation2026(territory, fr)'), 'le résultat doit utiliser les verdicts distincts du modèle');
  const verdict = (status: CaptureReceipt2026['status']) => captureExplanation2026({ ruleset: '2026.1', status,
    loopAreaM2: 0, newTerrainM2: null, alreadyOwnedM2: null, neutralTakenM2: null, takenFromOthersM2: null }, true);
  const pending = verdict('pending'); const scheduled = verdict('scheduled');
  assert(pending?.title === 'Terrain en attente' && scheduled?.title === 'Boucle validée · publication différée',
    'en analyse et validé mais non publié doivent conserver des conclusions distinctes');
  assert(verdict('private')?.title === 'Sortie privée' && verdict('no_loop')?.title === 'Aucune boucle admissible',
    'absence de consentement et absence de boucle ne sont pas le même refus');
  assert(verdict('published') === null, 'un résultat publié garde son gain historique, jamais une copie de refus');
});

Deno.test('2026 : une capture ordinaire ne fabrique pas de points de défi', () => {
  // Le cahier sépare terrain, XP et défis : les points existent seulement
  // dans un match consenti. Les anciens crew_points par capture sont retirés.
  assert(
    !RESULT_SCREEN.includes('crewPoints') && !RESULT_SCREEN.includes('crew_points'),
    'le résultat ne doit pas prolonger l’ancien score crew par capture',
  );
});



// ════════════════════════════════════════════════════════════════════════════
// RACCORD A — « TA SORTIE EST ANALYSÉE. TON RÉSULTAT EST PRÊT. » (§14.2)
//
// ÉTAPE 0 : `features/notifications/resultReadyNotice.ts` savait envoyer ce
// message et n'avait AUCUN APPELANT — son propre en-tête le disait (« CE MODULE
// N'A PAS ENCORE D'APPELANT »). Un `grep -r notifyResultReady apps/mobile` ne
// rendait que sa définition et une note de réglages. Pendant ce temps
// `analyse.leaveNotified` promettait au joueur « on te prévient quand le
// résultat est prêt » : une phrase que rien dans le dépôt ne pouvait tenir.
// Les trois gardes ci-dessous échouent toutes sur l'état d'avant.
// ════════════════════════════════════════════════════════════════════════════

/** Tous les `.ts`/`.tsx` de `apps/mobile/src`, chemin relatif à ce test. */
function mobileSources(): string[] {
  const root = new URL('../../', import.meta.url);
  const out: string[] = [];
  const walk = (dir: URL, prefix: string): void => {
    for (const e of Deno.readDirSync(dir)) {
      const child = new URL(`${e.name}${e.isDirectory ? '/' : ''}`, dir);
      if (e.isDirectory) walk(child, `${prefix}${e.name}/`);
      else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) out.push(`${prefix}${e.name}`);
    }
  };
  walk(root, '');
  return out;
}

Deno.test('résultat prêt : le message §14.2 a exactement UN appelant, et c’est le chemin du résultat', () => {
  const callers = mobileSources().filter((rel) =>
    // La définition et sa propre documentation ne comptent pas.
    !rel.endsWith('notifications/resultReadyNotice.ts') &&
    !rel.endsWith('.test.ts') && !rel.endsWith('.test.tsx') &&
    /notifyResultReady\s*\(/.test(code(`../../${rel}`)),
  );
  assert(callers.length === 1,
    `le message de résultat doit partir d’un seul endroit, pas ${callers.length} : ${callers.join(', ')}`);
  assert(callers[0] === 'features/run/resultNotice2026.ts',
    `l’appelant doit être le chemin du résultat, pas ${callers[0]}`);
});

Deno.test('résultat prêt : la réponse d’ingestion déclenche l’annonce, sans la faire attendre', () => {
  const core = code('./gps/useRealRunCore.ts');
  const accepted = core.indexOf("publishSyncFact({ kind: 'server_accepted' }");
  assert(accepted > 0, 'le fait « le serveur a répondu » doit exister');
  const call = core.indexOf('announceResultReady2026(payload.clientRunId)');
  assert(call > accepted,
    'l’annonce doit partir APRÈS la réponse acceptée — jamais sur un envoi encore en vol');
  assert(core.slice(accepted, call).includes("return 'sent'") === false,
    'et avant que `uploadOrQueue` ne rende la main');
  assert(/void announceResultReady2026\(/.test(core),
    'sans `await` : une notification ne doit pas retarder l’écran de résultat');
  assert((core.match(/announceResultReady2026\(/g) ?? []).length === 1,
    'une seule fois : la matrice §14.2 dit « une fois » pour cet événement');
});

Deno.test('résultat prêt : l’écran ouvert et les réglages illisibles ferment tous deux le message', () => {
  const notice = code('./resultNotice2026.ts');
  assert(notice.includes("appActive: AppState.currentState === 'active'"),
    'l’app au premier plan, c’est le joueur DEVANT son résultat : rien ne part');
  assert(notice.includes("my_notification_settings_2026"),
    'les réglages §14.1 se lisent sur le compte, jamais sur le téléphone');
  assert(notice.includes('parseNotificationSettings2026'),
    'et se comprennent avec le parseur partagé');
  assert(!notice.includes('DEFAULT_NOTIFICATION_SETTINGS_2026'),
    'une lecture ratée ne retombe JAMAIS sur les défauts : ce serait notifier ' +
      'quelqu’un qui a peut-être coupé la catégorie');
  const guard = notice.indexOf("why: 'settings_unreadable'");
  assert(guard > 0 && guard < notice.indexOf('notifyResultReady({'),
    'le refus de deviner doit précéder l’envoi');
});


// ════════════════════════════════════════════════════════════════════════════
// RACCORD B — LA PORTE DU CLASSEMENT DE COMMUNE (ADR-013 §2.1)
//
// ÉTAPE 0 : la porte existait bien dans la feuille de la carte, mais son
// libellé passait par le raccourci local `text(fr, en)` — DEUX langues sur
// cinq — pendant que `i18n/catalog/classement.ts` portait `entreeCarte`, écrit
// pour elle, avec ses cinq traductions et AUCUN lecteur. Un joueur en espagnol,
// en allemand ou en portugais lisait donc de l'anglais sur l'unique entrée d'un
// écran entièrement traduit.
// ════════════════════════════════════════════════════════════════════════════

Deno.test('carte : la porte de la commune existe, et parle les cinq langues', () => {
  const map = code('../refonte/MapHome.tsx');
  assert(map.includes("router.push('/classement-commune')"),
    'la seule porte du classement de commune doit vivre dans la feuille de la carte');
  assert(map.includes('t(CClassement.entreeCarte)'),
    'son libellé vient du catalogue — le raccourci `text(fr, en)` n’en connaît que deux');
  assert(!/text\('Ta commune/.test(map),
    'le libellé à deux langues ne doit pas revenir à côté du catalogue');
});
