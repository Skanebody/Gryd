/**
 * GRYD — i18n : catalogue du domaine COURSE LIVE. Deux consommateurs, et deux
 * seulement : `app/course-live.tsx` (l'aiguillage à 4 états honnêtes) et
 * `features/run/gps/RunPreflight.tsx` (E06). Parité 5 langues imposée par Entry.
 *
 * PURGE DU 25/07/2026 (recalage E07/E08). Ce catalogue portait encore 36 clés
 * ORPHELINES — bandeau de mission, ETA, pings au crew, feuille « quitter la
 * course », toasts scriptés, en-tête d'itinéraire recommandé — reliquat de la
 * course de DÉMONSTRATION et de sa navigation (`liveNav`, `route/demo`,
 * `LiveNavMap`), supprimées le 21/07/2026 (A-47). Une chaîne traduite sans
 * appelant n'est pas neutre : elle donne l'illusion qu'un écran existe, et elle
 * invite à le peindre. Ce qui reste ici a un appelant, vérifiable.
 *
 * Les cinq clés RÉCUPÉRABLES ont déménagé dans `catalog/runGps.ts`, où vivent
 * désormais E07 et E08 (« BOUCLE FERMÉE » y est devenue `loopClosedTitle`).
 *
 * Invariants jamais traduits : GRYD, GO, km, min.
 * §A CONTRAIGNANT : chips/CTA/boutons COURTS dans toutes les langues.
 */
import type { Activity } from '@klaim/shared';
import { defineCatalog, type Entry } from '../types';

export const C = defineCatalog({
  // ─── COURSE IMPOSSIBLE : état HONNÊTE quand aucun GPS ne peut mesurer ──────
  // « L'app ne ment jamais » : sans position réelle, GRYD n'invente pas une
  // course simulée qui ressemblerait à la tienne. On dit ce qui manque et LA
  // seule action qui débloque (1 CTA §A). La vitrine étant ABANDONNÉE, la
  // simulation n'a plus AUCUN chemin d'affichage : ce texte est le seul écran
  // servi quand la position manque, sur iPhone comme sur localhost.
  noGpsTitle: {
    fr: 'Pas de position, pas de course',
    en: 'No location, no run',
    es: 'Sin ubicación, sin carrera',
    de: 'Ohne Standort kein Lauf',
    pt: 'Sem localização, sem corrida',
  },
  /**
   * LE TOUT PREMIER ÉCRAN QU'UN CYCLISTE VOIT si sa localisation est coupée.
   * Le produit lui refuse sa sortie : lui refuser en la nommant « course »
   * ajoute au refus une erreur sur ce qu'il faisait. La discipline est celle
   * DÉCLARÉE par le chemin de départ (`?activity=`), la même que le préflight
   * aurait montrée si l'acquisition avait abouti.
   */
  noGpsTitleBike: {
    fr: 'Pas de position, pas de sortie',
    en: 'No location, no ride',
    es: 'Sin ubicación, sin salida',
    de: 'Ohne Standort keine Fahrt',
    pt: 'Sem localização, sem percurso',
  },
  /**
   * Natif sans position (permission refusée OU localisation du téléphone
   * coupée) : les deux se règlent au même endroit — les Réglages système. Une
   * seule copie, un seul CTA (§A : 1 écran = 1 décision).
   */
  noGpsNativeBody: {
    fr: 'GRYD mesure ta course avec le GPS. Sans position autorisée, rien ne peut être enregistré — et on préfère te le dire plutôt que t’afficher une course qui n’a pas eu lieu.',
    en: 'GRYD measures your run with GPS. Without location access nothing can be recorded — and we would rather tell you than show you a run that never happened.',
    es: 'GRYD mide tu carrera con el GPS. Sin ubicación autorizada no se puede registrar nada, y preferimos decírtelo antes que mostrarte una carrera que no existió.',
    de: 'GRYD misst deinen Lauf per GPS. Ohne freigegebenen Standort kann nichts aufgezeichnet werden — und das sagen wir dir lieber, als dir einen Lauf zu zeigen, den es nie gab.',
    pt: 'O GRYD mede sua corrida por GPS. Sem localização autorizada nada pode ser registrado — e preferimos dizer isso a mostrar uma corrida que não aconteceu.',
  },
  noGpsNativeBodyBike: {
    fr: 'GRYD mesure ta sortie avec le GPS. Sans position autorisée, rien ne peut être enregistré — et on préfère te le dire plutôt que t’afficher une sortie qui n’a pas eu lieu.',
    en: 'GRYD measures your ride with GPS. Without location access nothing can be recorded — and we would rather tell you than show you a ride that never happened.',
    es: 'GRYD mide tu salida con el GPS. Sin ubicación autorizada no se puede registrar nada, y preferimos decírtelo antes que mostrarte una salida que no existió.',
    de: 'GRYD misst deine Fahrt per GPS. Ohne freigegebenen Standort kann nichts aufgezeichnet werden — und das sagen wir dir lieber, als dir eine Fahrt zu zeigen, die es nie gab.',
    pt: 'O GRYD mede seu percurso por GPS. Sem localização autorizada nada pode ser registrado — e preferimos dizer isso a mostrar um percurso que não aconteceu.',
  },
  /**
   * Navigateur, refus explicite. L'autorisation d'un SITE ne se règle pas dans
   * les réglages du téléphone mais dans le navigateur : on envoie au bon
   * endroit, puis « Réessayer » relance vraiment la lecture du capteur.
   */
  noGpsDeniedWebBody: {
    fr: 'Ce site n’a pas accès à ta position. Autorise la localisation pour cette page dans ton navigateur, puis réessaie — GRYD n’affichera jamais une course qui n’a pas eu lieu.',
    en: 'This site has no access to your location. Allow location for this page in your browser, then try again — GRYD will never show you a run that never happened.',
    es: 'Este sitio no tiene acceso a tu ubicación. Permite la localización para esta página en tu navegador y vuelve a intentarlo: GRYD nunca mostrará una carrera que no existió.',
    de: 'Diese Seite hat keinen Zugriff auf deinen Standort. Erlaube den Standort für diese Seite im Browser und versuch es erneut — GRYD zeigt dir nie einen Lauf, den es nie gab.',
    pt: 'Este site não tem acesso à sua localização. Permita a localização para esta página no navegador e tente de novo — o GRYD nunca vai mostrar uma corrida que não aconteceu.',
  },
  noGpsDeniedWebBodyBike: {
    fr: 'Ce site n’a pas accès à ta position. Autorise la localisation pour cette page dans ton navigateur, puis réessaie — GRYD n’affichera jamais une sortie qui n’a pas eu lieu.',
    en: 'This site has no access to your location. Allow location for this page in your browser, then try again — GRYD will never show you a ride that never happened.',
    es: 'Este sitio no tiene acceso a tu ubicación. Permite la localización para esta página en tu navegador y vuelve a intentarlo: GRYD nunca mostrará una salida que no existió.',
    de: 'Diese Seite hat keinen Zugriff auf deinen Standort. Erlaube den Standort für diese Seite im Browser und versuch es erneut — GRYD zeigt dir nie eine Fahrt, die es nie gab.',
    pt: 'Este site não tem acesso à sua localização. Permita a localização para esta página no navegador e tente de novo — o GRYD nunca vai mostrar um percurso que não aconteceu.',
  },
  /** Localisation du téléphone coupée : c'est l'interrupteur système, pas l'app. */
  noGpsServicesOffBody: {
    fr: 'La localisation de ton téléphone est coupée. Rallume-la : sans elle, aucun mètre ne peut être mesuré, et on préfère te le dire plutôt que d’inventer une course.',
    en: 'Your phone’s location is turned off. Turn it back on: without it not a single metre can be measured, and we would rather tell you than invent a run.',
    es: 'La ubicación de tu teléfono está desactivada. Vuelve a activarla: sin ella no se puede medir ni un metro, y preferimos decírtelo antes que inventar una carrera.',
    de: 'Der Standort deines Handys ist aus. Schalte ihn wieder ein: ohne ihn lässt sich kein Meter messen — und das sagen wir dir lieber, als einen Lauf zu erfinden.',
    pt: 'A localização do seu telefone está desligada. Ligue de novo: sem ela nenhum metro pode ser medido, e preferimos dizer isso a inventar uma corrida.',
  },
  noGpsServicesOffBodyBike: {
    fr: 'La localisation de ton téléphone est coupée. Rallume-la : sans elle, aucun mètre ne peut être mesuré, et on préfère te le dire plutôt que d’inventer une sortie.',
    en: 'Your phone’s location is turned off. Turn it back on: without it not a single metre can be measured, and we would rather tell you than invent a ride.',
    es: 'La ubicación de tu teléfono está desactivada. Vuelve a activarla: sin ella no se puede medir ni un metro, y preferimos decírtelo antes que inventar una salida.',
    de: 'Der Standort deines Handys ist aus. Schalte ihn wieder ein: ohne ihn lässt sich kein Meter messen — und das sagen wir dir lieber, als eine Fahrt zu erfinden.',
    pt: 'A localização do seu telefone está desligada. Ligue de novo: sem ela nenhum metro pode ser medido, e preferimos dizer isso a inventar um percurso.',
  },
  /** Aucune API de géolocalisation ici : rien ne débloque, donc aucun faux bouton. */
  noGpsNoSensorBody: {
    fr: 'Ce navigateur ne donne aucun accès à la position. GRYD ne peut rien mesurer ici — ouvre GRYD sur ton téléphone pour courir.',
    en: 'This browser gives no access to location. GRYD cannot measure anything here — open GRYD on your phone to run.',
    es: 'Este navegador no da ningún acceso a la ubicación. GRYD no puede medir nada aquí: abre GRYD en tu teléfono para correr.',
    de: 'Dieser Browser gibt keinen Zugriff auf den Standort. GRYD kann hier nichts messen — öffne GRYD auf deinem Handy zum Laufen.',
    pt: 'Este navegador não dá acesso à localização. O GRYD não pode medir nada aqui — abra o GRYD no seu telefone para correr.',
  },
  noGpsNoSensorBodyBike: {
    fr: 'Ce navigateur ne donne aucun accès à la position. GRYD ne peut rien mesurer ici — ouvre GRYD sur ton téléphone pour rouler.',
    en: 'This browser gives no access to location. GRYD cannot measure anything here — open GRYD on your phone to ride.',
    es: 'Este navegador no da ningún acceso a la ubicación. GRYD no puede medir nada aquí: abre GRYD en tu teléfono para pedalear.',
    de: 'Dieser Browser gibt keinen Zugriff auf den Standort. GRYD kann hier nichts messen — öffne GRYD auf deinem Handy zum Fahren.',
    pt: 'Este navegador não dá acesso à localização. O GRYD não pode medir nada aqui — abra o GRYD no seu telefone para pedalar.',
  },
  /**
   * Ni accordé, ni refusé : le capteur n'a rien rendu. On n'impute PAS un refus
   * à quelqu'un qui n'en a prononcé aucun — c'est le capteur qui n'a pas répondu.
   */
  noGpsUnavailableBody: {
    fr: 'GRYD n’a pas réussi à obtenir ta position. Ce n’est pas un refus de ta part : le capteur n’a rien renvoyé. Va dehors, à ciel ouvert, puis réessaie.',
    en: 'GRYD could not get your location. This is not a refusal on your side: the sensor returned nothing. Step outside, under open sky, then try again.',
    es: 'GRYD no pudo obtener tu ubicación. No es un rechazo tuyo: el sensor no devolvió nada. Sal al aire libre y vuelve a intentarlo.',
    de: 'GRYD konnte deinen Standort nicht ermitteln. Das ist keine Ablehnung von dir: der Sensor hat nichts geliefert. Geh nach draußen unter freien Himmel und versuch es erneut.',
    pt: 'O GRYD não conseguiu obter sua localização. Não é uma recusa sua: o sensor não devolveu nada. Vá para fora, a céu aberto, e tente de novo.',
  },
  noGpsRetryCta: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  a11yNoGpsRetry: {
    fr: 'Réessayer de lire ta position',
    en: 'Try reading your location again',
    es: 'Volver a leer tu ubicación',
    de: 'Standort erneut auslesen',
    pt: 'Tentar ler sua localização de novo',
  },
  noGpsSettingsCta: {
    fr: 'Ouvrir les Réglages',
    en: 'Open Settings',
    es: 'Abrir Ajustes',
    de: 'Einstellungen öffnen',
    pt: 'Abrir Ajustes',
  },
  a11yNoGpsSettings: {
    fr: 'Ouvrir les réglages de position du téléphone',
    en: 'Open the phone’s location settings',
    es: 'Abrir los ajustes de ubicación del teléfono',
    de: 'Standorteinstellungen des Handys öffnen',
    pt: 'Abrir os ajustes de localização do telefone',
  },
  noGpsBack: {
    fr: 'Retour à la carte',
    en: 'Back to map',
    es: 'Volver al mapa',
    de: 'Zurück zur Karte',
    pt: 'Voltar ao mapa',
  },

  // ─── LECTURE EN COURS : le 4ᵉ état, qui n'affirme rien sur le joueur ───────
  // Un chargement ne dit ni « tu n'as pas de position », ni « tu en as une ».
  // Il dit ce qu'on fait et ce qu'on attend — jamais un écran noir muet.
  startingTitle: {
    fr: 'GRYD cherche ta position',
    en: 'GRYD is looking for your location',
    es: 'GRYD busca tu ubicación',
    de: 'GRYD sucht deinen Standort',
    pt: 'O GRYD está procurando sua localização',
  },
  startingBody: {
    fr: 'Autorise la localisation quand on te la demande. Rien n’est enregistré tant qu’aucune position réelle n’est arrivée.',
    en: 'Allow location when you are asked. Nothing is recorded until a real position comes in.',
    es: 'Permite la ubicación cuando te la pidan. No se registra nada hasta que llegue una posición real.',
    de: 'Erlaube den Standort, wenn du gefragt wirst. Es wird nichts aufgezeichnet, bis eine echte Position eintrifft.',
    pt: 'Permita a localização quando for solicitado. Nada é registrado até chegar uma posição real.',
  },

  // ── E06 Préflight → compte à rebours (sobre : décompte seul, pas de carte
  //    de statut anxiogène ; la force du signal GPS réelle vit en E07) ──
  countdownCancel: {
    fr: 'Annuler',
    en: 'Cancel',
    es: 'Cancelar',
    de: 'Abbrechen',
    pt: 'Cancelar',
  },

  // ── E14 — LA DISCIPLINE, DITE AVANT LE PREMIER MÈTRE ────────────────────
  // Le garde-fou du 25/07 disait : une PRÉFÉRENCE D'AFFICHAGE ne décide jamais
  // de la NATURE d'un effort enregistré. Depuis que le vélo s'enregistre
  // vraiment, la discipline doit pouvoir être déclarée — mais elle ne peut
  // jamais l'être EN SILENCE. Cette ligne est ce qui transforme une déclaration
  // en information : le joueur lit ce qui va être enregistré pendant que le
  // décompte tourne, et peut le démentir d'un tap avant que rien n'existe.
  preflightActivityKicker: {
    fr: 'CE QUI VA ÊTRE ENREGISTRÉ',
    en: 'WHAT WILL BE RECORDED',
    es: 'LO QUE SE VA A REGISTRAR',
    de: 'WAS AUFGEZEICHNET WIRD',
    pt: 'O QUE SERÁ REGISTRADO',
  },
  /** `{name}` vient de `catalog/runGps` (activityNameRun / activityNameBike). */
  a11yPreflightActivity: {
    fr: 'Enregistrer cette sortie comme {name}',
    en: 'Record this outing as {name}',
    es: 'Registrar esta salida como {name}',
    de: 'Diese Aktivität als {name} aufzeichnen',
    pt: 'Registrar esta atividade como {name}',
  },
  /**
   * NEUTRALISÉ plutôt que dédoublé (26/07/2026). Ce libellé disait
   * « Vérification avant le départ de la course » — faux pour un cycliste. Un
   * twin par discipline serait pourtant une MAUVAISE réponse ici, pour deux
   * raisons propres à cet écran :
   *  · la discipline est DÉCLARÉE juste en dessous, par un contrôle dont le
   *    libellé lu la nomme en toutes lettres (« Enregistrer cette sortie comme
   *    vélo ») — la répéter sur le conteneur en ferait une seconde source pour
   *    la même vérité ;
   *  · elle est CORRIGIBLE d'un tap pendant le décompte. Un libellé de
   *    conteneur porté par l'état pourrait rester périmé dans l'arbre
   *    d'accessibilité après une correction — c'est-à-dire mentir, exactement
   *    ce qu'on est en train de refermer.
   * Le texte neutre, lui, est vrai dans les deux mondes et le reste après
   * n'importe quelle correction.
   */
  a11yPreflight: {
    fr: 'Vérification avant le départ',
    en: 'Pre-start readiness check',
    es: 'Comprobación antes de salir',
    de: 'Bereitschaftsprüfung vor dem Start',
    pt: 'Verificação antes de partir',
  },
  a11yCancelCountdown: {
    fr: 'Annuler le compte à rebours',
    en: 'Cancel the countdown',
    es: 'Cancelar la cuenta atrás',
    de: 'Countdown abbrechen',
    pt: 'Cancelar a contagem regressiva',
  },
});

/**
 * ─── L'ÉCRAN DE BLOCAGE, PAR DISCIPLINE (E14, 26/07/2026) ───────────────────
 *
 * `RunUnavailable` est le premier — et parfois le seul — écran qu'une sortie
 * produit : la position manque, rien ne sera mesuré. Il nommait « course » ce
 * qu'il refusait, y compris à un cycliste. La discipline utilisée ici est celle
 * DÉCLARÉE par le chemin de départ (`?activity=`), la seule connue à ce stade :
 * le préflight, qui la fait confirmer, n'a jamais pu s'afficher.
 *
 * `Record<Activity, …>` EXHAUSTIF : une troisième discipline ne compilera pas
 * sans ses phrases (même patron que `RUN_GPS_COPY` et `RESULT_COPY`).
 */
export interface CourseLiveActivityCopy {
  readonly noGpsTitle: Entry;
  readonly noGpsNativeBody: Entry;
  readonly noGpsDeniedWebBody: Entry;
  readonly noGpsServicesOffBody: Entry;
  readonly noGpsNoSensorBody: Entry;
  /**
   * Volontairement la MÊME entrée dans les deux mondes : « le capteur n'a rien
   * renvoyé, va dehors » ne nomme aucune discipline. La dupliquer créerait deux
   * vérités à maintenir — et le test `courseLive.test.ts` vérifie que ces deux
   * champs restent la même référence, pour qu'un twin ne soit pas ajouté par
   * réflexe un jour.
   */
  readonly noGpsUnavailableBody: Entry;
}

export const COURSE_LIVE_COPY: Readonly<Record<Activity, CourseLiveActivityCopy>> = {
  run: {
    noGpsTitle: C.noGpsTitle,
    noGpsNativeBody: C.noGpsNativeBody,
    noGpsDeniedWebBody: C.noGpsDeniedWebBody,
    noGpsServicesOffBody: C.noGpsServicesOffBody,
    noGpsNoSensorBody: C.noGpsNoSensorBody,
    noGpsUnavailableBody: C.noGpsUnavailableBody,
  },
  bike: {
    noGpsTitle: C.noGpsTitleBike,
    noGpsNativeBody: C.noGpsNativeBodyBike,
    noGpsDeniedWebBody: C.noGpsDeniedWebBodyBike,
    noGpsServicesOffBody: C.noGpsServicesOffBodyBike,
    noGpsNoSensorBody: C.noGpsNoSensorBodyBike,
    noGpsUnavailableBody: C.noGpsUnavailableBody,
  },
};
