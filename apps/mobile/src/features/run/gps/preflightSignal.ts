/**
 * GRYD — E19 « ACQUISITION GPS / PRÊT » : ce que l'anneau a le DROIT d'affirmer.
 *
 * Module PUR (zéro import React, zéro capteur, zéro horloge interne) : il ne
 * fait qu'une chose, traduire l'état RÉEL du sondage de position en ce que
 * l'écran peint. Il est la seule source de cette traduction, pour que l'anneau,
 * le libellé, le CTA `DÉMARRER MAINTENANT`, le lien `Démarrer quand même` et
 * l'analytics ne puissent JAMAIS se contredire.
 *
 * ─── POURQUOI QUATRE ÉTATS, ET PAS TROIS ────────────────────────────────────
 * La spec (l.1100-1103) donne trois BANDES : vert ≤ 15 m, orange 16-30 m, rouge
 * > 30 m. Elles décrivent une MESURE. Or, à l'ouverture de l'écran, il n'existe
 * aucune mesure : le capteur vient d'être ouvert et n'a rien rendu. Peindre une
 * bande — n'importe laquelle — à cet instant serait une affirmation sur un
 * chiffre qui n'existe pas. La constitution le nomme précisément : « un
 * chargement n'affirme rien sur le joueur ». D'où la séparation stricte :
 *
 *   `idle`        — le sondage n'est pas encore ouvert (montage de l'écran) ;
 *   `probing`     — capteur ouvert, AUCUNE position encore reçue ;
 *   `measured`    — une position RÉELLE est arrivée, avec sa précision ;
 *   `unavailable` — cette plateforme ne rend aucune position mesurable ici.
 *
 * `idle` et `probing` peignent le même anneau NEUTRE (« Recherche du signal »,
 * le texte littéral de la spec l.1095) : gris, sans chiffre, sans bande. Ils
 * restent DEUX valeurs distinctes parce que seule la seconde autorise l'écran
 * à dire que l'attente dure (`probeTakingLong`) — on ne reproche pas une
 * lenteur à un capteur qu'on n'a pas encore ouvert.
 *
 * ─── CE QUE CE MODULE NE FAIT PAS ───────────────────────────────────────────
 * Il ne LISSE rien. Aucune moyenne, aucune médiane, aucun « meilleur des N
 * derniers fixes » : la précision affichée est celle du DERNIER fix rendu par
 * le capteur, telle quelle. Une valeur lissée serait plus jolie et mentirait —
 * elle afficherait « Prêt » sur un signal qui vient de se dégrader, à l'instant
 * précis où le joueur décide de partir. Le lissage a sa place dans le moteur de
 * course (`engine/gps.ts`, médiane glissante), après le départ, pour nettoyer
 * une TRACE — pas pour décider d'une promesse.
 *
 * Il ne décide d'AUCUN claim non plus. « Le serveur garde la précision réelle
 * de chaque point » (spec l.1106) et reste seul juge : un départ pris en bande
 * orange enregistre une sortie parfaitement valide dont certains points seront
 * simplement écartés du claim par le filtre §3.2 (`POINT_MAX_ACCURACY_M`).
 */
import { type GpsAccuracyGrade, gpsAccuracyGrade } from '@klaim/shared';

/**
 * L'état RÉEL du sondage de position pré-course. Produit exclusivement par
 * `preflightProbe` (capteur), jamais fabriqué par l'écran.
 *
 * `measured.accuracyM` vaut `null` quand la plateforme a rendu une position
 * SANS chiffrer sa précision (vieux Android, certaines sources wifi du
 * navigateur). Ce n'est pas « mauvais », c'est « non mesuré » — et c'est
 * exactement pour ça que le champ est nullable au lieu d'être rempli par une
 * valeur de repli : `provider.toRawFix` substitue `GPS_ACCURACY_MAX_M` (35 m)
 * dans ce cas pour le MOTEUR, ce qui est un choix prudent côté trace mais
 * afficherait ici une bande ROUGE mesurée sur un chiffre inventé.
 */
export type PreflightSignal =
  | { kind: 'idle' }
  | { kind: 'probing' }
  | { kind: 'measured'; accuracyM: number | null }
  | { kind: 'unavailable' };

/**
 * Ce que l'anneau PEINT. `'none'` = aucun anneau du tout : rien n'est mesurable
 * ici, et un anneau qui ne mesure rien est un décor qui prétend mesurer.
 * `'searching'` = anneau NEUTRE, indéterminé, sans chiffre.
 */
export type PreflightRing = 'none' | 'searching' | 'ready' | 'usable' | 'poor';

export interface PreflightReadiness {
  ring: PreflightRing;
  /**
   * Le chiffre affiché au centre de l'anneau, en mètres — `null` = AUCUN
   * nombre n'est peint. Jamais de « 0 » nu ni de valeur de remplissage.
   */
  accuracyM: number | null;
  /** Le CTA chartreuse `DÉMARRER MAINTENANT` (spec l.1097) est-il peint ? */
  startNow: boolean;
  /** Le lien `Démarrer quand même` (spec l.1098) est-il peint ? */
  startAnyway: boolean;
}

/**
 * Sondage → ce que l'écran peint. UNE traduction, sans branche cachée.
 *
 * LES DEUX AFFORDANCES SONT EXCLUSIVES, et c'est voulu : §A4 (« 1 écran = 1
 * décision, 1 CTA chartreuse max ») interdit de proposer en même temps un
 * départ « propre » et un départ « quand même ». La spec les sépare d'ailleurs
 * déjà par leur condition : le bouton « lorsque le seuil est acceptable »,
 * le lien « seulement si la précision reste exploitable ».
 *
 * EN BANDE ROUGE, LE DÉPART RESTE POSSIBLE — par le lien, jamais par le CTA.
 *
 * ⚠ CORRECTIF DU 27/07, ET LA FAUTE QU'IL RÉPARE. Ce module rendait auparavant
 * `startAnyway: grade === 'usable'`, donc `false` en bande ROUGE : les DEUX
 * affordances disparaissaient et il ne restait qu'« Annuler ». Comme
 * `confirmStart` n'a qu'un seul appelant dans tout le dépôt (RunPreflight.tsx,
 * le décompte), cet écran est la PORTE UNIQUE du départ : un joueur en canyon
 * urbain, en intérieur, sur les premiers fixes d'un démarrage à froid, en
 * permission Android « coarse » (`preflight.status === 'approximate'`, dont la
 * précision est kilométrique donc TOUJOURS rouge) ou sur le bundle web (géoloc
 * Wi-Fi) ne pouvait PLUS enregistrer la moindre sortie. Ce n'est pas un bouton
 * mort qu'on évitait, c'est la fonction qu'on supprimait.
 *
 * LA PRÉMISSE ÉCRITE POUR JUSTIFIER LE BLOCAGE ÉTAIT FAUSSE. `POINT_MAX_ACCURACY_M`
 * (25 m) filtre des POINTS INDIVIDUELS, pas une course : une sortie démarrée à
 * 40 m voit ses premiers points écartés du claim, puis capture normalement dès
 * que le fix converge — ce qui est le cas ordinaire d'un démarrage à froid. Et
 * une sortie qui ne capture RIEN reste une sortie parfaitement valide :
 * distance, durée, GPS Trust, série (`activityProducesResult`, game-rules.ts).
 * Le lien ne promet d'ailleurs aucune conquête — sa note dit exactement le
 * contraire (« Certains points seront trop flous pour compter dans le
 * territoire. Ta sortie, elle, est enregistrée. »).
 *
 * Ce qui reste vrai, et ce que ce module tient toujours : le CTA chartreuse
 * `DÉMARRER MAINTENANT` n'est peint QU'EN BANDE VERTE. Lui seul affirmerait
 * « maintenant, c'est propre ». L'écran garde par ailleurs sa seule phrase
 * utile en rouge (« sors à découvert ») — un conseil, pas une porte fermée.
 *
 * QUAND RIEN N'EST MESURABLE (`unavailable`, ou position sans précision
 * chiffrée), le départ RESTE possible — par le lien, jamais par le CTA
 * chartreuse. Deux raisons, et les deux tiennent à l'honnêteté : le CTA
 * affirmerait « maintenant, c'est propre » sur une mesure absente ; et bloquer
 * quelqu'un dont la plateforme ne chiffre pas sa précision l'empêcherait
 * d'enregistrer une sortie que le capteur suivrait pourtant très bien — le
 * tracker, lui, ouvre son propre flux et le serveur juge point par point.
 */
export function preflightReadiness(signal: PreflightSignal): PreflightReadiness {
  if (signal.kind === 'idle' || signal.kind === 'probing') {
    return { ring: 'searching', accuracyM: null, startNow: false, startAnyway: false };
  }
  if (signal.kind === 'unavailable') {
    return { ring: 'none', accuracyM: null, startNow: false, startAnyway: true };
  }
  const grade = gpsAccuracyGrade(signal.accuracyM);
  if (grade === 'unknown') {
    // Position reçue, précision NON chiffrée par la plateforme : il n'y a pas
    // de bande à peindre, et pas davantage de « recherche » à annoncer — la
    // position est là. On dit ce qui est, et on laisse partir.
    return { ring: 'none', accuracyM: null, startNow: false, startAnyway: true };
  }
  return {
    ring: grade,
    accuracyM: signal.accuracyM,
    startNow: grade === 'ready',
    // Exclusif du CTA (§A4 : jamais deux départs peints), et JAMAIS false pour
    // les deux à la fois : quelle que soit la mesure, il existe toujours
    // exactement un chemin de départ. C'est l'invariant que le test
    // « un départ est TOUJOURS atteignable » verrouille.
    startAnyway: grade !== 'ready',
  };
}

/**
 * Grade transmis à l'analytics quand un départ est pris SANS la bande verte
 * (`run_start_degraded`, props `{ grade }`). On envoie la valeur RÉELLE plutôt
 * que de supposer 'usable' : c'est précisément l'écart entre le seuil théorique
 * et le terrain que cet event doit mesurer.
 */
export function signalGrade(signal: PreflightSignal): GpsAccuracyGrade {
  return signal.kind === 'measured' ? gpsAccuracyGrade(signal.accuracyM) : 'unknown';
}

/**
 * Délai (ms) au-delà duquel une acquisition SANS le moindre fix cesse d'être
 * une attente ordinaire et mérite une phrase.
 *
 * Constante de PRÉSENTATION, pas une règle de jeu — elle ne décide d'aucun
 * territoire, d'aucun point, d'aucun claim, et ne quitte jamais cet écran
 * (même statut que `COUNTDOWN_STEP_MS` dans `RunPreflight.tsx`). Elle vit donc
 * ici plutôt qu'en polluant `game-rules.ts`, qui est la source unique des
 * constantes de JEU.
 *
 * Sa raison d'être est constitutionnelle : « jamais de spinner infini ». Un
 * anneau qui tourne sans fin dans un parking souterrain n'apprend rien ; passé
 * ce délai, l'écran nomme ce qui se passe et donne le seul geste qui aide.
 */
export const PREFLIGHT_PROBE_HINT_MS = 10_000;

/**
 * L'attente dure-t-elle assez pour mériter une explication ? Vrai UNIQUEMENT
 * pendant un sondage réellement ouvert (`probing`) : en `idle` rien n'a encore
 * été demandé au capteur, et une fois `measured` / `unavailable` la question ne
 * se pose plus. `elapsedMs` est passé par l'appelant — ce module n'a pas
 * d'horloge, ce qui le rend testable sans faux minuteur.
 */
export function probeTakingLong(signal: PreflightSignal, elapsedMs: number): boolean {
  return signal.kind === 'probing' && elapsedMs >= PREFLIGHT_PROBE_HINT_MS;
}

/**
 * Le CHIFFRE affiché au centre de l'anneau (sans unité — l'unité vit dans le
 * catalogue i18n, `ringAccuracy`).
 *
 * L'arrondi au mètre est une précision d'AFFICHAGE, pas un lissage : la valeur
 * transmise reste celle du capteur, et le serveur garde de toute façon la
 * précision réelle de chaque point (spec l.1106). Le seul cas particulier est
 * une précision sous le demi-mètre : l'arrondir donnerait « ± 0 m », c'est-à-dire
 * le « 0 nu » que la constitution interdit — et une certitude absolue qu'aucun
 * GPS n'a jamais eue. On garde alors une décimale.
 */
export function accuracyDigits(accuracyM: number): string {
  return accuracyM < 0.5 ? accuracyM.toFixed(1) : String(Math.round(accuracyM));
}
