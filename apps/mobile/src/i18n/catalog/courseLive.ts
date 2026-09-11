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
    fr: 'GRYD mesure ta course avec le GPS. Sans position autorisée, rien ne peut être enregistré, et on préfère te le dire plutôt que t’afficher une course qui n’a pas eu lieu.',
    en: 'GRYD measures your run with GPS. Without location access nothing can be recorded — and we would rather tell you than show you a run that never happened.',
    es: 'GRYD mide tu carrera con el GPS. Sin ubicación autorizada no se puede registrar nada, y preferimos decírtelo antes que mostrarte una carrera que no existió.',
    de: 'GRYD misst deinen Lauf per GPS. Ohne freigegebenen Standort kann nichts aufgezeichnet werden — und das sagen wir dir lieber, als dir einen Lauf zu zeigen, den es nie gab.',
    pt: 'O GRYD mede sua corrida por GPS. Sem localização autorizada nada pode ser registrado — e preferimos dizer isso a mostrar uma corrida que não aconteceu.',
  },
  noGpsNativeBodyBike: {
    fr: 'GRYD mesure ta sortie avec le GPS. Sans position autorisée, rien ne peut être enregistré, et on préfère te le dire plutôt que t’afficher une sortie qui n’a pas eu lieu.',
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
    fr: 'Ce site n’a pas accès à ta position. Autorise la localisation pour cette page dans ton navigateur, puis réessaie. GRYD n’affichera jamais une course qui n’a pas eu lieu.',
    en: 'This site has no access to your location. Allow location for this page in your browser, then try again — GRYD will never show you a run that never happened.',
    es: 'Este sitio no tiene acceso a tu ubicación. Permite la localización para esta página en tu navegador y vuelve a intentarlo: GRYD nunca mostrará una carrera que no existió.',
    de: 'Diese Seite hat keinen Zugriff auf deinen Standort. Erlaube den Standort für diese Seite im Browser und versuch es erneut — GRYD zeigt dir nie einen Lauf, den es nie gab.',
    pt: 'Este site não tem acesso à sua localização. Permita a localização para esta página no navegador e tente de novo — o GRYD nunca vai mostrar uma corrida que não aconteceu.',
  },
  noGpsDeniedWebBodyBike: {
    fr: 'Ce site n’a pas accès à ta position. Autorise la localisation pour cette page dans ton navigateur, puis réessaie. GRYD n’affichera jamais une sortie qui n’a pas eu lieu.',
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
    fr: 'Ce navigateur ne donne aucun accès à la position. GRYD ne peut rien mesurer ici : ouvre GRYD sur ton téléphone pour courir.',
    en: 'This browser gives no access to location. GRYD cannot measure anything here — open GRYD on your phone to run.',
    es: 'Este navegador no da ningún acceso a la ubicación. GRYD no puede medir nada aquí: abre GRYD en tu teléfono para correr.',
    de: 'Dieser Browser gibt keinen Zugriff auf den Standort. GRYD kann hier nichts messen — öffne GRYD auf deinem Handy zum Laufen.',
    pt: 'Este navegador não dá acesso à localização. O GRYD não pode medir nada aqui — abra o GRYD no seu telefone para correr.',
  },
  noGpsNoSensorBodyBike: {
    fr: 'Ce navigateur ne donne aucun accès à la position. GRYD ne peut rien mesurer ici : ouvre GRYD sur ton téléphone pour rouler.',
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

  // ═══════════════════════════════════════════════════════════════════════════
  // E19 — ACQUISITION GPS / PRÊT (spec produit UI/UX, l.1088-1106), 27/07/2026.
  //
  // POURQUOI ICI ET PAS DANS UN CATALOGUE NEUF : `/activity/ready` est l'écran
  // que `RunPreflight.tsx` rend déjà, et RunPreflight lit CE catalogue (l.64 du
  // composant). Un fichier neuf aurait posé deux sources pour un seul écran.
  //
  // LES QUATRE ÉTATS DE L'ANNEAU sont ceux de `GpsAccuracyGrade`
  // (game-rules.ts) — et `ringUnknown` n'est PAS `ringPoor` : avant le premier
  // fix, personne ne sait si le signal est bon. Un anneau rouge affiché à
  // l'ouverture affirmerait un mauvais GPS sur une mesure qui n'existe pas.
  // Aucun de ces libellés ne chiffre le seuil : le nombre vit dans game-rules,
  // l'écran dit l'état.
  // ═══════════════════════════════════════════════════════════════════════════

  /** Bande VERTE (≤ GPS_READY_ACCURACY_M) — le mot exact de la spec (l.1096). */
  ringReady: {
    fr: 'Prêt',
    en: 'Ready',
    es: 'Listo',
    de: 'Bereit',
    pt: 'Pronto',
  },
  /** Bande ORANGE — utilisable, et l'écran le dit sans dramatiser. */
  ringUsable: {
    fr: 'Signal correct',
    en: 'Signal OK',
    es: 'Señal aceptable',
    de: 'Signal brauchbar',
    pt: 'Sinal aceitável',
  },
  /** Bande ROUGE — un fait, pas un reproche, avec la seule chose à faire. */
  ringPoor: {
    fr: 'Signal faible. Sors à découvert',
    en: 'Weak signal — move into the open',
    es: 'Señal débil — sal a cielo abierto',
    de: 'Schwaches Signal — geh ins Freie',
    pt: 'Sinal fraco — vá para um lugar aberto',
  },
  /** AUCUN fix encore reçu : le texte de la spec, « Recherche du signal ». */
  ringUnknown: {
    fr: 'Recherche du signal',
    en: 'Searching for signal',
    es: 'Buscando la señal',
    de: 'Signal wird gesucht',
    pt: 'Procurando sinal',
  },
  /** a11y de l'anneau : l'état en toutes lettres, jamais une couleur seule. */
  a11yRing: {
    fr: 'Précision du signal : {state}',
    en: 'Signal accuracy: {state}',
    es: 'Precisión de la señal: {state}',
    de: 'Signalgenauigkeit: {state}',
    pt: 'Precisão do sinal: {state}',
  },
  /**
   * CTA de la bande verte (spec l.1097). Unique bouton chartreuse de l'écran.
   * Il n'est peint QUE en `'ready'` : peindre un départ « maintenant » sur un
   * signal absent serait le bouton mort que la constitution interdit.
   */
  startNow: {
    fr: 'DÉMARRER MAINTENANT',
    en: 'START NOW',
    es: 'EMPEZAR AHORA',
    de: 'JETZT STARTEN',
    pt: 'COMEÇAR AGORA',
  },
  /**
   * Le lien de la bande orange (spec l.1098 : « seulement si la précision reste
   * exploitable »). C'est un LIEN, pas un second bouton plein : un écran, une
   * décision (§A).
   */
  startAnyway: {
    fr: 'Démarrer quand même',
    en: 'Start anyway',
    es: 'Empezar igualmente',
    de: 'Trotzdem starten',
    pt: 'Começar mesmo assim',
  },
  /**
   * Ce que « démarrer quand même » coûte vraiment, dit avant le tap. Le serveur
   * garde la précision réelle de chaque point (spec l.1106) : certains points
   * ne compteront pas pour le territoire, la sortie, elle, sera bien enregistrée.
   */
  startAnywayNote: {
    fr: 'Certains points seront trop flous pour compter dans le territoire. Ta sortie, elle, est enregistrée.',
    en: 'Some points will be too fuzzy to count towards territory. Your outing itself is recorded.',
    es: 'Algunos puntos serán demasiado imprecisos para contar en el territorio. Tu salida sí queda registrada.',
    de: 'Einige Punkte sind zu ungenau, um fürs Gebiet zu zählen. Deine Aktivität wird trotzdem aufgezeichnet.',
    pt: 'Alguns pontos ficarão imprecisos demais para contar no território. Sua atividade é registrada mesmo assim.',
  },
  /**
   * La précision RÉELLE, au centre de l'anneau. Le « ± » n'est pas décoratif :
   * une précision GPS est un RAYON d'incertitude, pas une distance parcourue.
   * L'entrée existe dans les cinq langues parce que l'unité et la ponctuation
   * ne se placent pas partout pareil, même si le mètre est universel.
   */
  ringAccuracy: {
    fr: '± {m} m',
    en: '± {m} m',
    es: '± {m} m',
    de: '± {m} m',
    pt: '± {m} m',
  },
  /**
   * AUCUNE mesure possible ici (capteur muet, ou position rendue sans précision
   * chiffrée). L'écran ne peint alors PAS d'anneau — cette phrase le remplace.
   * Elle constate, elle n'accuse pas : rien ne dit que le signal est mauvais,
   * seulement que personne ne peut le chiffrer.
   */
  ringUnmeasurable: {
    fr: 'Précision non mesurable ici',
    en: 'Accuracy can’t be measured here',
    es: 'Aquí no se puede medir la precisión',
    de: 'Genauigkeit hier nicht messbar',
    pt: 'Precisão não mensurável aqui',
  },
  /**
   * L'attente dure (PREFLIGHT_PROBE_HINT_MS). « Jamais de spinner infini » :
   * passé ce délai, l'écran nomme ce qui se passe et donne le seul geste qui
   * aide. Tutoiement, et aucun reproche — un signal faible sous un porche est
   * normal et universel.
   */
  /**
   * a11y du bouton « Annuler » PENDANT L'ACQUISITION. Il ne peut pas réutiliser
   * `a11yCancelCountdown` (« Annuler le compte à rebours ») : à cet instant
   * aucun décompte ne tourne, et un lecteur d'écran annoncerait une chose qui
   * n'existe pas — la même faute qu'un chiffre fabriqué, en plus discret.
   */
  a11yCancelPreflight: {
    fr: 'Annuler le départ',
    en: 'Cancel the start',
    es: 'Cancelar la salida',
    de: 'Start abbrechen',
    pt: 'Cancelar a partida',
  },
  ringSearchingLong: {
    fr: 'Toujours rien. Sous un toit ou entre deux immeubles, ça peut prendre un moment.',
    en: 'Still nothing. Under a roof or between tall buildings, this can take a while.',
    es: 'Todavía nada. Bajo techo o entre edificios altos, esto puede tardar.',
    de: 'Noch nichts. Unter einem Dach oder zwischen hohen Häusern kann das dauern.',
    pt: 'Ainda nada. Sob um teto ou entre prédios altos, isso pode demorar.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LE BANDEAU DE COURSE (LOT R, 11/09/2026)
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Demande fondateur : « Vérifie qu'on a bien au minimum toutes les
  // informations que Strava et INTVL peuvent donner. » Ces libellés nomment les
  // mesures qui manquaient. Ils sont COURTS parce qu'ils sont lus en mouvement
  // (§A : comprendre l'écran en moins de trois secondes), et ils portent leur
  // unité : un chiffre sans unité, lu en courant, se lit dans celle qu'on croit.
  //
  // ⚠️ LE LIBELLÉ RESTE QUAND LE CHIFFRE DISPARAÎT. C'est la règle posée par
  // `liveRate.ts` : une mesure absente rend un tiret cadratin, et le libellé dit
  // alors CE QUI MANQUE. Une case qui disparaîtrait ferait bouger la mise en
  // page sous les yeux de quelqu'un qui court.

  /** Grande case 1. L'unité est dans le libellé (le chiffre reste nu et lisible). */
  metricDistance: {
    fr: 'Distance · km',
    en: 'Distance · km',
    es: 'Distancia · km',
    de: 'Distanz · km',
    pt: 'Distância · km',
  },
  /**
   * Grande case 2. « Temps actif » et non « Temps » : le chrono se fige aux
   * pauses (manuelle, et automatique si elle est activée). Dire « Temps » ferait
   * croire à l'horloge du départ, que ce chiffre n'est pas.
   */
  metricActiveTime: {
    fr: 'Temps actif',
    en: 'Moving time',
    es: 'Tiempo activo',
    de: 'Aktive Zeit',
    pt: 'Tempo ativo',
  },
  /** Grande case 3, course à pied : l'allure de MAINTENANT (fenêtre courte). */
  metricPaceNow: {
    fr: 'Allure · maintenant',
    en: 'Pace · now',
    es: 'Ritmo · ahora',
    de: 'Tempo · jetzt',
    pt: 'Ritmo · agora',
  },
  /** Grande case 3, vélo : la même mesure, dans la grandeur du cycliste. */
  metricSpeedNow: {
    fr: 'Vitesse · maintenant',
    en: 'Speed · now',
    es: 'Velocidad · ahora',
    de: 'Tempo · jetzt',
    pt: 'Velocidade · agora',
  },
  /** Petite case : la moyenne depuis le départ (ce que l'écran montrait seul). */
  metricPaceAvg: {
    fr: 'Allure · moyenne',
    en: 'Pace · average',
    es: 'Ritmo · medio',
    de: 'Tempo · Schnitt',
    pt: 'Ritmo · médio',
  },
  metricSpeedAvg: {
    fr: 'Vitesse · moyenne',
    en: 'Speed · average',
    es: 'Velocidad · media',
    de: 'Tempo · Schnitt',
    pt: 'Velocidade · média',
  },
  /** Petite case : dénivelé POSITIF cumulé. « D+ » est la notation universelle. */
  metricElevation: {
    fr: 'D+ · m',
    en: 'Elev. gain · m',
    es: 'Desnivel + · m',
    de: 'Höhenmeter · m',
    pt: 'Ganho · m',
  },
  /** Petite case : cadence en pas par minute. */
  metricCadence: {
    fr: 'Cadence · ppm',
    en: 'Cadence · spm',
    es: 'Cadencia · ppm',
    de: 'Kadenz · Schr./min',
    pt: 'Cadência · ppm',
  },
  /** Dernier kilomètre COMPLET, celui qu'on compare (jamais un km entamé). */
  metricLastKm: {
    fr: 'Dernier km',
    en: 'Last km',
    es: 'Último km',
    de: 'Letzter km',
    pt: 'Último km',
  },

  // ─── QUALITÉ DU SIGNAL : le chiffre, pas seulement un pictogramme ─────────
  /**
   * Précision horizontale du DERNIER relevé. GRYD affiche le nombre là où les
   * autres montrent trois barres, parce que c'est lui qui décide de ce que le
   * serveur acceptera comme boucle : le cacher ferait découvrir après coup
   * pourquoi une capture a été refusée.
   */
  gpsAccuracy: {
    fr: 'GPS ± {m} m',
    en: 'GPS ± {m} m',
    es: 'GPS ± {m} m',
    de: 'GPS ± {m} m',
    pt: 'GPS ± {m} m',
  },
  gpsAccuracyUnknown: {
    fr: 'GPS en recherche',
    en: 'GPS searching',
    es: 'GPS buscando',
    de: 'GPS sucht',
    pt: 'GPS procurando',
  },

  // ─── LA BOUCLE : la mesure que Strava n'a pas ─────────────────────────────
  /** Distance À VOL D'OISEAU qui reste pour revenir refermer la boucle. */
  loopRemaining: {
    fr: 'Boucle · {m} m à refermer',
    en: 'Loop · {m} m to close',
    es: 'Bucle · faltan {m} m',
    de: 'Schleife · noch {m} m',
    pt: 'Volta · faltam {m} m',
  },
  loopClosed: {
    fr: 'Boucle fermée',
    en: 'Loop closed',
    es: 'Bucle cerrado',
    de: 'Schleife geschlossen',
    pt: 'Volta fechada',
  },
  loopUnknown: {
    fr: 'Boucle · en attente des premiers mètres',
    en: 'Loop · waiting for the first metres',
    es: 'Bucle · esperando los primeros metros',
    de: 'Schleife · warte auf die ersten Meter',
    pt: 'Volta · aguardando os primeiros metros',
  },

  // ─── SPLITS ET TOURS ──────────────────────────────────────────────────────
  splitsTitle: {
    fr: 'Kilomètres',
    en: 'Kilometres',
    es: 'Kilómetros',
    de: 'Kilometer',
    pt: 'Quilômetros',
  },
  /** Le kilomètre EN COURS, marqué comme tel : son allure n'est pas comparable. */
  splitPartial: {
    fr: 'en cours',
    en: 'in progress',
    es: 'en curso',
    de: 'läuft',
    pt: 'em curso',
  },
  lapsTitle: {
    fr: 'Tours',
    en: 'Laps',
    es: 'Vueltas',
    de: 'Runden',
    pt: 'Voltas',
  },
  lapCta: {
    fr: 'Tour',
    en: 'Lap',
    es: 'Vuelta',
    de: 'Runde',
    pt: 'Volta',
  },
  a11yLap: {
    fr: 'Marquer un tour',
    en: 'Mark a lap',
    es: 'Marcar una vuelta',
    de: 'Runde markieren',
    pt: 'Marcar uma volta',
  },

  // ─── VERROUILLAGE DE L'ÉCRAN ──────────────────────────────────────────────
  //
  // Un écran tactile dans une poche ou sous la pluie déclenche des appuis. Sans
  // verrou, le geste le plus facile à provoquer par accident est celui qui
  // termine la sortie. Le déverrouillage est un GLISSEMENT, pas un tap : c'est
  // le seul geste qu'un frottement ne produit pas.
  lockCta: {
    fr: 'Verrouiller',
    en: 'Lock',
    es: 'Bloquear',
    de: 'Sperren',
    pt: 'Bloquear',
  },
  lockedTitle: {
    fr: 'Écran verrouillé',
    en: 'Screen locked',
    es: 'Pantalla bloqueada',
    de: 'Bildschirm gesperrt',
    pt: 'Tela bloqueada',
  },
  /** L'enregistrement CONTINUE : le dire, sinon le verrou ressemble à un arrêt. */
  lockedBody: {
    fr: 'La sortie continue d’être enregistrée.',
    en: 'Your outing keeps recording.',
    es: 'La salida sigue grabándose.',
    de: 'Die Aufzeichnung läuft weiter.',
    pt: 'A atividade continua a ser gravada.',
  },
  unlockHint: {
    fr: 'Glisse pour déverrouiller',
    en: 'Slide to unlock',
    es: 'Desliza para desbloquear',
    de: 'Zum Entsperren wischen',
    pt: 'Deslize para desbloquear',
  },
  a11yUnlock: {
    fr: 'Déverrouiller l’écran de course',
    en: 'Unlock the run screen',
    es: 'Desbloquear la pantalla de carrera',
    de: 'Laufbildschirm entsperren',
    pt: 'Desbloquear a tela de corrida',
  },

  // ─── LA VOIX AU KILOMÈTRE ─────────────────────────────────────────────────
  //
  // `voiceKmSplit` est DITE, pas affichée : elle passe par `say()`, qui prend une
  // entrée du catalogue et jamais du texte (L18 rendue structurelle). Les valeurs
  // ({km}, {rate}) sont interpolées par le code — le catalogue ne calcule rien.
  //
  // Elle ne s'ajoute au bavardage de personne : la sortie ne parlait jusqu'ici
  // que TROIS fois (départ, boucle presque fermée, boucle fermée), et cette
  // annonce est la seule qui se répète. C'est aussi la seule que tout le monde
  // attend d'une app de course, et elle est désactivable d'un interrupteur
  // (`/parametres/course`).
  voiceKmSplit: {
    fr: 'Kilomètre {km}. {rate}.',
    en: 'Kilometre {km}. {rate}.',
    es: 'Kilómetro {km}. {rate}.',
    de: 'Kilometer {km}. {rate}.',
    pt: 'Quilômetro {km}. {rate}.',
  },
  /** La grandeur DITE, en toutes lettres : « 5 minutes 28 par kilomètre ». */
  voicePaceSpoken: {
    fr: '{min} minutes {sec} par kilomètre',
    en: '{min} minutes {sec} per kilometre',
    es: '{min} minutos {sec} por kilómetro',
    de: '{min} Minuten {sec} pro Kilometer',
    pt: '{min} minutos {sec} por quilômetro',
  },
  voiceSpeedSpoken: {
    fr: '{kmh} kilomètres heure',
    en: '{kmh} kilometres per hour',
    es: '{kmh} kilómetros por hora',
    de: '{kmh} Stundenkilometer',
    pt: '{kmh} quilômetros por hora',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // « PENDANT LA SORTIE » — les deux réglages que le lot R rend opposables
  // ══════════════════════════════════════════════════════════════════════════
  //
  // Ils vivent dans `/parametres/course`, à côté des haptiques. Ils sont ICI et
  // non dans `catalog/reglages.ts` parce qu'ils décrivent le comportement de
  // l'écran de course, pas celui des Réglages : le jour où la pause automatique
  // change de règle, c'est ce catalogue-ci qu'on relit.
  //
  // La pause automatique EXISTAIT (moteur `detectPauses`, préférence par
  // discipline `autoPausePref.ts`, défaut du cahier §8.2) et n'était réglable
  // que pendant le compte à rebours du départ — c'est-à-dire au pire moment,
  // trois secondes avant de partir. Elle se règle désormais à froid.

  setAutoPauseRunTitle: {
    fr: 'Pause automatique · à pied',
    en: 'Auto-pause · running',
    es: 'Pausa automática · a pie',
    de: 'Auto-Pause · Laufen',
    pt: 'Pausa automática · a pé',
  },
  /**
   * DIT CE QUE LE RÉGLAGE FAIT AU CHRONO, pas ce qu'il « active ». Un coureur
   * qui voit son temps se figer au feu rouge sans l'avoir demandé perd la seule
   * chose qu'un chronomètre promet : être celui de sa montre.
   */
  setAutoPauseRunSubtitle: {
    fr: 'Le chrono se fige quand tu t’arrêtes. Désactivée par défaut à pied.',
    en: 'The clock freezes when you stop. Off by default when running.',
    es: 'El crono se detiene cuando paras. Desactivada por defecto a pie.',
    de: 'Die Uhr stoppt, wenn du stehst. Beim Laufen standardmäßig aus.',
    pt: 'O cronômetro para quando você para. Desligada por padrão a pé.',
  },
  setAutoPauseBikeTitle: {
    fr: 'Pause automatique · vélo',
    en: 'Auto-pause · cycling',
    es: 'Pausa automática · bici',
    de: 'Auto-Pause · Rad',
    pt: 'Pausa automática · bike',
  },
  setAutoPauseBikeSubtitle: {
    fr: 'Activée par défaut : à vélo, un arrêt au carrefour est un vrai arrêt.',
    en: 'On by default: on a bike, a stop at a junction is a real stop.',
    es: 'Activada por defecto: en bici, una parada en el cruce es una parada real.',
    de: 'Standardmäßig an: auf dem Rad ist ein Halt an der Kreuzung ein echter Halt.',
    pt: 'Ligada por padrão: de bike, uma parada no cruzamento é uma parada real.',
  },
  setVoiceTitle: {
    fr: 'Annonces vocales',
    en: 'Voice announcements',
    es: 'Anuncios de voz',
    de: 'Sprachansagen',
    pt: 'Anúncios de voz',
  },
  /**
   * ELLE ÉNUMÈRE CE QUI EST DIT. Un interrupteur « annonces vocales » sans
   * inventaire laisse imaginer un commentaire continu — et c'est exactement ce
   * que GRYD ne fait pas : quatre moments, pas un flux.
   */
  setVoiceSubtitle: {
    fr: 'Le départ, chaque kilomètre avec son allure, la boucle presque fermée, la boucle fermée.',
    en: 'The start, each kilometre with its pace, the loop almost closed, the loop closed.',
    es: 'La salida, cada kilómetro con su ritmo, el bucle casi cerrado, el bucle cerrado.',
    de: 'Der Start, jeder Kilometer mit Tempo, die Schleife fast geschlossen, die Schleife geschlossen.',
    pt: 'A partida, cada quilômetro com seu ritmo, a volta quase fechada, a volta fechada.',
  },
  /**
   * L'HONNÊTETÉ SUR CE QUE LA VOIX NE SAIT PAS FAIRE (L14). `expo-speech` ne
   * touche pas la session audio d'iOS et `app.json` ne déclare pas le mode
   * d'arrière-plan `audio` : écran verrouillé, l'annonce est probablement muette,
   * et la musique n'est pas baissée. Le dire ici évite de promettre par un
   * interrupteur ce que le code ne tient pas.
   */
  setVoiceNote: {
    fr: 'Écran verrouillé, l’annonce peut rester muette selon l’appareil. GRYD ne baisse pas ta musique.',
    en: 'With the screen locked, the announcement may stay silent depending on the device. GRYD does not duck your music.',
    es: 'Con la pantalla bloqueada, el anuncio puede quedar mudo según el dispositivo. GRYD no baja tu música.',
    de: 'Bei gesperrtem Bildschirm kann die Ansage je nach Gerät stumm bleiben. GRYD senkt deine Musik nicht ab.',
    pt: 'Com a tela bloqueada, o anúncio pode ficar mudo conforme o aparelho. O GRYD não abaixa sua música.',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // « UN PROBLÈME AVEC TA SORTIE » — LE CONTRÔLE DE DISCIPLINE À L'ARRIVÉE
  // (décision fondateur du 12/09/2026)
  // ══════════════════════════════════════════════════════════════════════════
  //
  // ─── LE TON, ET POURQUOI CE N'EST PAS UNE ACCUSATION ──────────────────────
  // L'écran ne dit JAMAIS « tu as triché » ni « sortie suspecte ». Il énonce ce
  // que les capteurs ont mesuré, avec les chiffres, et pose une question. Se
  // tromper de bouton au départ est l'erreur la plus banale du produit : la
  // traiter comme une fraude serait faux dans l'immense majorité des cas, et
  // la charte l'interdit (§8.3, « ne jamais accuser quelqu'un de marcher »).
  //
  // ─── DEUX ISSUES DE MÊME RANG, ET AUCUNE TROISIÈME ────────────────────────
  // Les deux boutons portent le même poids visuel. Pas de « plus tard », pas de
  // croix : une troisième issue muette laisserait partir la sortie sans que
  // personne ait décidé ce qu'elle vaut.

  /** Le titre. Factuel : il annonce un problème, pas un verdict. */
  disciplineTitle: {
    fr: 'Un problème avec ta sortie',
    en: 'Something is off with your outing',
    es: 'Algo no cuadra en tu salida',
    de: 'Etwas stimmt an deiner Aktivität nicht',
    pt: 'Algo não bate na sua atividade',
  },
  /**
   * COURSE DÉCLARÉE, VÉLO MESURÉ. `{min}` minutes, `{kmh}` km/h : les nombres
   * viennent de `checkDeclaredDiscipline2026`, jamais d'un arrondi de confort.
   * « sans aucun pas » est une MESURE (le podomètre a tourné et n'a rien
   * compté) : sans podomètre, cet écran ne s'affiche pas du tout.
   */
  disciplineBodyBike: {
    fr: 'Pendant {min} minutes, tu allais à {kmh} km/h sans aucun pas. Ça ressemble à du vélo.',
    en: 'For {min} minutes you were going {kmh} km/h without a single step. That looks like cycling.',
    es: 'Durante {min} minutos ibas a {kmh} km/h sin un solo paso. Eso parece ciclismo.',
    de: 'Über {min} Minuten warst du mit {kmh} km/h unterwegs, ohne einen einzigen Schritt. Das sieht nach Radfahren aus.',
    pt: 'Durante {min} minutos você foi a {kmh} km/h sem um único passo. Isso parece pedalada.',
  },
  /** VÉLO DÉCLARÉ, COURSE MESURÉE. La cadence est le fait, la vitesse la borne. */
  disciplineBodyRun: {
    fr: 'Pendant {min} minutes, tu faisais {spm} pas par minute à {kmh} km/h. Ça ressemble à de la course.',
    en: 'For {min} minutes you were taking {spm} steps a minute at {kmh} km/h. That looks like running.',
    es: 'Durante {min} minutos dabas {spm} pasos por minuto a {kmh} km/h. Eso parece correr.',
    de: 'Über {min} Minuten hast du {spm} Schritte pro Minute bei {kmh} km/h gemacht. Das sieht nach Laufen aus.',
    pt: 'Durante {min} minutos você deu {spm} passos por minuto a {kmh} km/h. Isso parece corrida.',
  },
  /**
   * CE QUE GARDER COÛTE, DIT AVANT LE CHOIX ET NON APRÈS. Une conséquence
   * découverte au journal, une fois la sortie partie, serait un piège.
   */
  disciplineKeepCost: {
    fr: 'Si tu gardes, la sortie compte pour ton journal, tes kilomètres, tes jours actifs et ton XP. Elle ne compte ni pour le terrain, ni pour les classements, ni pour les défis, ni pour les quêtes de la semaine.',
    en: 'If you keep it, the outing counts for your journal, your kilometres, your active days and your XP. It counts for no ground, no leaderboard, no challenge and no weekly quest.',
    es: 'Si la mantienes, la salida cuenta para tu diario, tus kilómetros, tus días activos y tu XP. No cuenta para el terreno, ni las clasificaciones, ni los desafíos, ni las misiones de la semana.',
    de: 'Wenn du dabei bleibst, zählt die Aktivität für dein Journal, deine Kilometer, deine aktiven Tage und deine XP. Für Gebiet, Ranglisten, Challenges und Wochenaufgaben zählt sie nicht.',
    pt: 'Se você mantiver, a atividade conta para seu diário, seus quilômetros, seus dias ativos e seu XP. Não conta para terreno, classificações, desafios nem missões da semana.',
  },
  /** Le filet, dit explicitement : rien ne se perd, quelle que soit la réponse. */
  disciplineSafe: {
    fr: 'Dans les deux cas, ta sortie est enregistrée.',
    en: 'Either way, your outing is saved.',
    es: 'En ambos casos, tu salida queda guardada.',
    de: 'In beiden Fällen wird deine Aktivität gespeichert.',
    pt: 'Nos dois casos, sua atividade fica salva.',
  },
  /** Bascule vers le VÉLO. §A : court dans les cinq langues. */
  disciplineSwitchToBike: {
    fr: 'C’était du vélo : basculer',
    en: 'It was a ride: switch',
    es: 'Era en bici: cambiar',
    de: 'War Radfahren: wechseln',
    pt: 'Era pedalada: trocar',
  },
  /** Bascule vers la COURSE. */
  disciplineSwitchToRun: {
    fr: 'C’était de la course : basculer',
    en: 'It was a run: switch',
    es: 'Era carrera: cambiar',
    de: 'War Laufen: wechseln',
    pt: 'Era corrida: trocar',
  },
  /** Garder la COURSE déclarée. */
  disciplineKeepRun: {
    fr: 'Garder en course',
    en: 'Keep as a run',
    es: 'Mantener como carrera',
    de: 'Als Lauf behalten',
    pt: 'Manter como corrida',
  },
  /** Garder le VÉLO déclaré. */
  disciplineKeepBike: {
    fr: 'Garder en vélo',
    en: 'Keep as a ride',
    es: 'Mantener como bici',
    de: 'Als Radfahrt behalten',
    pt: 'Manter como pedalada',
  },
  a11yDisciplineSheet: {
    fr: 'Un problème avec ta sortie, deux réponses possibles',
    en: 'Something is off with your outing, two possible answers',
    es: 'Algo no cuadra en tu salida, dos respuestas posibles',
    de: 'Etwas stimmt an deiner Aktivität nicht, zwei mögliche Antworten',
    pt: 'Algo não bate na sua atividade, duas respostas possíveis',
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
