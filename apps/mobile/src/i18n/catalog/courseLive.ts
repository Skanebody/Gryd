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
import { defineCatalog } from '../types';

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
  /** Localisation du téléphone coupée : c'est l'interrupteur système, pas l'app. */
  noGpsServicesOffBody: {
    fr: 'La localisation de ton téléphone est coupée. Rallume-la : sans elle, aucun mètre ne peut être mesuré, et on préfère te le dire plutôt que d’inventer une course.',
    en: 'Your phone’s location is turned off. Turn it back on: without it not a single metre can be measured, and we would rather tell you than invent a run.',
    es: 'La ubicación de tu teléfono está desactivada. Vuelve a activarla: sin ella no se puede medir ni un metro, y preferimos decírtelo antes que inventar una carrera.',
    de: 'Der Standort deines Handys ist aus. Schalte ihn wieder ein: ohne ihn lässt sich kein Meter messen — und das sagen wir dir lieber, als einen Lauf zu erfinden.',
    pt: 'A localização do seu telefone está desligada. Ligue de novo: sem ela nenhum metro pode ser medido, e preferimos dizer isso a inventar uma corrida.',
  },
  /** Aucune API de géolocalisation ici : rien ne débloque, donc aucun faux bouton. */
  noGpsNoSensorBody: {
    fr: 'Ce navigateur ne donne aucun accès à la position. GRYD ne peut rien mesurer ici — ouvre GRYD sur ton téléphone pour courir.',
    en: 'This browser gives no access to location. GRYD cannot measure anything here — open GRYD on your phone to run.',
    es: 'Este navegador no da ningún acceso a la ubicación. GRYD no puede medir nada aquí: abre GRYD en tu teléfono para correr.',
    de: 'Dieser Browser gibt keinen Zugriff auf den Standort. GRYD kann hier nichts messen — öffne GRYD auf deinem Handy zum Laufen.',
    pt: 'Este navegador não dá acesso à localização. O GRYD não pode medir nada aqui — abra o GRYD no seu telefone para correr.',
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
  a11yPreflight: {
    fr: 'Vérification avant le départ de la course',
    en: 'Pre-run readiness check',
    es: 'Comprobación previa a la carrera',
    de: 'Bereitschaftsprüfung vor dem Lauf',
    pt: 'Verificação antes da corrida',
  },
  a11yCancelCountdown: {
    fr: 'Annuler le compte à rebours',
    en: 'Cancel the countdown',
    es: 'Cancelar la cuenta atrás',
    de: 'Countdown abbrechen',
    pt: 'Cancelar a contagem regressiva',
  },
});
