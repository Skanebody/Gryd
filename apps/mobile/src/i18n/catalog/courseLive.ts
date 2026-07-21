/**
 * GRYD — i18n : catalogue du domaine COURSE LIVE (app/course-live.tsx +
 * src/features/run/liveNav.ts). Parité 5 langues imposée par le type Entry.
 *
 * Invariants jamais traduits : GRYD, GO, GRYD VERIFIED, Crew, PING, km, min,
 * noms propres (République, Belleville, checkpoints du canal…).
 * §A CONTRAIGNANT : chips/CTA/boutons COURTS dans toutes les langues (l'allemand
 * est reformulé concis plutôt que composé long).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Bandeau mission : slot droit (états — jamais une fausse ETA) ────────────
  statePause: { fr: 'PAUSE', en: 'PAUSE', es: 'PAUSA', de: 'PAUSE', pt: 'PAUSA' },
  stateOngoing: { fr: 'EN COURS', en: 'LIVE', es: 'EN CURSO', de: 'LÄUFT', pt: 'EM CURSO' },
  /** « Arrivée » : état du bandeau ET libellé du dernier repère de nav. */
  arrival: { fr: 'Arrivée', en: 'Finish', es: 'Meta', de: 'Ziel', pt: 'Chegada' },
  /** min = invariant (unité) — identique partout. */
  etaMin: { fr: '{n} min', en: '{n} min', es: '{n} min', de: '{n} min', pt: '{n} min' },

  // ── Nuance « à valider » du bandeau conquête (le serveur seul décide) ───────
  // Fragment SOURCE cherché dans le libellé partagé (intention.ts) + son
  // remplacement : les deux doivent rester alignés avec la copie de ce module.
  zoneTakenSource: {
    fr: 'zone prise',
    en: 'zone taken',
    es: 'zona tomada',
    de: 'Zone erobert',
    pt: 'zona tomada',
  },
  zoneTakenPending: {
    fr: 'zone prise (à valider)',
    en: 'zone taken (pending)',
    es: 'zona tomada (por validar)',
    de: 'Zone erobert (offen)',
    pt: 'zona tomada (a validar)',
  },

  // ── Card live basse (ACTION) — overrides locaux de la copie partagée ────────
  // « Connexion 2 rues » (indications.ts) est cryptique en effort → verbe.
  connect2Source: {
    fr: 'Connexion 2 rues',
    en: 'Connect 2 streets',
    es: 'Conexión 2 calles',
    de: '2 Straßen verbinden',
    pt: 'Conexão 2 ruas',
  },
  connect2Action: {
    fr: 'Relie 2 rues',
    en: 'Link 2 streets',
    es: 'Une 2 calles',
    de: 'Verbinde 2 Straßen',
    pt: 'Liga 2 ruas',
  },
  loopKicker: {
    fr: 'FERME TA BOUCLE',
    en: 'CLOSE YOUR LOOP',
    es: 'CIERRA TU BUCLE',
    de: 'RUNDE SCHLIESSEN',
    pt: 'FECHE O CIRCUITO',
  },
  loopBackValue: {
    fr: 'Retour {d} m',
    en: 'Back {d} m',
    es: 'Vuelve {d} m',
    de: 'Zurück {d} m',
    pt: 'Volta {d} m',
  },

  // ── Burst N3 fermeture de boucle (fait géométrique client, zones estimées) ──
  loopClosedTitle: {
    fr: 'BOUCLE FERMÉE',
    en: 'LOOP CLOSED',
    es: 'BUCLE CERRADO',
    de: 'RUNDE GESCHLOSSEN',
    pt: 'CIRCUITO FECHADO',
  },
  crewLoopClosedTitle: {
    fr: 'BOUCLE CREW FERMÉE',
    en: 'CREW LOOP CLOSED',
    es: 'BUCLE CREW CERRADO',
    de: 'CREW-RUNDE GESCHLOSSEN',
    pt: 'CIRCUITO CREW FECHADO',
  },
  estimatedZones: {
    fr: '+{n} zones estimées',
    en: '+{n} zones (est.)',
    es: '+{n} zonas est.',
    de: '+{n} Zonen (ca.)',
    pt: '+{n} zonas est.',
  },

  // ── Toasts locaux de l'écran ────────────────────────────────────────────────
  pingSentToast: {
    fr: 'Ping · {label}',
    en: 'Ping · {label}',
    es: 'Ping · {label}',
    de: 'Ping · {label}',
    pt: 'Ping · {label}',
  },
  holdToFinishToast: {
    fr: 'Maintiens pour terminer',
    en: 'Hold to finish',
    es: 'Mantén para terminar',
    de: 'Halten zum Beenden',
    pt: 'Segura para terminar',
  },

  // ── Micro-chip technique (jamais un bandeau plein) ─────────────────────────
  gpsWeak: { fr: 'GPS faible', en: 'Weak GPS', es: 'GPS débil', de: 'GPS schwach', pt: 'GPS fraco' },
  privateZone: {
    fr: 'Zone privée',
    en: 'Private zone',
    es: 'Zona privada',
    de: 'Private Zone',
    pt: 'Zona privada',
  },

  // ── Labels d'accessibilité (peuvent être longs — jamais affichés) ──────────
  a11yQuitRun: {
    fr: 'Quitter la course',
    en: 'Quit the run',
    es: 'Salir de la carrera',
    de: 'Lauf verlassen',
    pt: 'Sair da corrida',
  },
  a11yMapCentered: {
    fr: 'Carte centrée sur toi',
    en: 'Map centered on you',
    es: 'Mapa centrado en ti',
    de: 'Karte auf dich zentriert',
    pt: 'Mapa centrado em você',
  },
  a11yRecenter: {
    fr: 'Recentrer la carte sur toi',
    en: 'Recenter the map on you',
    es: 'Recentrar el mapa en ti',
    de: 'Karte auf dich zentrieren',
    pt: 'Recentrar o mapa em você',
  },
  a11yPingCrew: {
    fr: 'Envoyer un ping au crew',
    en: 'Send a ping to the crew',
    es: 'Enviar un ping al crew',
    de: 'Ping an die Crew senden',
    pt: 'Enviar um ping ao crew',
  },
  a11yBackToStats: {
    fr: 'Revenir aux stats',
    en: 'Back to stats',
    es: 'Volver a las estadísticas',
    de: 'Zurück zur Statistik',
    pt: 'Voltar às estatísticas',
  },
  a11yMapView: {
    fr: 'Vue de la carte du run',
    en: 'Run map view',
    es: 'Vista del mapa de la carrera',
    de: 'Kartenansicht des Laufs',
    pt: 'Vista do mapa da corrida',
  },
  a11yFinishHold: {
    fr: 'Terminer la course (maintenir)',
    en: 'Finish the run (hold)',
    es: 'Terminar la carrera (mantener)',
    de: 'Lauf beenden (halten)',
    pt: 'Terminar a corrida (segurar)',
  },
  a11yResumeRun: {
    fr: 'Reprendre la course',
    en: 'Resume the run',
    es: 'Reanudar la carrera',
    de: 'Lauf fortsetzen',
    pt: 'Retomar a corrida',
  },
  a11yPauseRun: {
    fr: 'Mettre la course en pause',
    en: 'Pause the run',
    es: 'Pausar la carrera',
    de: 'Lauf pausieren',
    pt: 'Pausar a corrida',
  },
  a11yShowNavMap: {
    fr: 'Afficher la carte de navigation',
    en: 'Show the navigation map',
    es: 'Mostrar el mapa de navegación',
    de: 'Navigationskarte anzeigen',
    pt: 'Mostrar o mapa de navegação',
  },
  a11yQuitNoSave: {
    fr: 'Quitter sans enregistrer',
    en: 'Quit without saving',
    es: 'Salir sin guardar',
    de: 'Verlassen ohne Speichern',
    pt: 'Sair sem salvar',
  },
  a11yClosePings: {
    fr: 'Fermer les pings',
    en: 'Close pings',
    es: 'Cerrar los pings',
    de: 'Pings schließen',
    pt: 'Fechar os pings',
  },
  a11yPingItem: {
    fr: 'Ping : {label}',
    en: 'Ping: {label}',
    es: 'Ping: {label}',
    de: 'Ping: {label}',
    pt: 'Ping: {label}',
  },

  // ── Kickers / labels de stats (MAJUSCULES conservées) ──────────────────────
  distance: { fr: 'DISTANCE', en: 'DISTANCE', es: 'DISTANCIA', de: 'DISTANZ', pt: 'DISTÂNCIA' },
  timeLabel: { fr: 'TEMPS', en: 'TIME', es: 'TIEMPO', de: 'ZEIT', pt: 'TEMPO' },
  /** « Pace » est le mot des coureurs allemands — plus court que Geschwindigkeit. */
  paceLabel: { fr: 'ALLURE', en: 'PACE', es: 'RITMO', de: 'PACE', pt: 'RITMO' },
  zonesLabel: { fr: 'ZONES', en: 'ZONES', es: 'ZONAS', de: 'ZONEN', pt: 'ZONAS' },
  pacePerKm: {
    fr: 'ALLURE /KM',
    en: 'PACE /KM',
    es: 'RITMO /KM',
    de: 'PACE /KM',
    pt: 'RITMO /KM',
  },
  nextCheckpoint: {
    fr: 'PROCHAIN REPÈRE',
    en: 'NEXT CHECKPOINT',
    es: 'PRÓXIMO PUNTO',
    de: 'NÄCHSTER CHECKPOINT',
    pt: 'PRÓXIMO PONTO',
  },
  crewObjective: {
    fr: 'OBJECTIF CREW',
    en: 'CREW GOAL',
    es: 'OBJETIVO CREW',
    de: 'CREW-ZIEL',
    pt: 'OBJETIVO CREW',
  },
  atMeters: { fr: 'à {n} m', en: 'in {n} m', es: 'a {n} m', de: 'in {n} m', pt: 'a {n} m' },
  zonesJump: {
    fr: '+{n} ZONES',
    en: '+{n} ZONES',
    es: '+{n} ZONAS',
    de: '+{n} ZONEN',
    pt: '+{n} ZONAS',
  },

  // ── Gros contrôles une-main (§A : COURTS, lisibles en courant) ─────────────
  controlResume: { fr: 'REPRENDRE', en: 'RESUME', es: 'REANUDAR', de: 'WEITER', pt: 'RETOMAR' },
  controlPause: { fr: 'PAUSE', en: 'PAUSE', es: 'PAUSA', de: 'PAUSE', pt: 'PAUSA' },
  controlMap: { fr: 'CARTE', en: 'MAP', es: 'MAPA', de: 'KARTE', pt: 'MAPA' },
  /** PING = invariant produit. */
  controlPing: { fr: 'PING', en: 'PING', es: 'PING', de: 'PING', pt: 'PING' },
  controlFinish: { fr: 'TERMINER', en: 'FINISH', es: 'TERMINAR', de: 'BEENDEN', pt: 'TERMINAR' },

  // ── Confirmation de sortie (abandonner ≠ Terminer) ─────────────────────────
  quitTitle: {
    fr: 'Quitter la course ?',
    en: 'Quit the run?',
    es: '¿Salir de la carrera?',
    de: 'Lauf verlassen?',
    pt: 'Sair da corrida?',
  },
  quitBody: {
    fr: 'Elle ne sera pas enregistrée.',
    en: 'It won’t be saved.',
    es: 'No se guardará.',
    de: 'Er wird nicht gespeichert.',
    pt: 'Ela não será salva.',
  },
  quitResume: { fr: 'Reprendre', en: 'Resume', es: 'Reanudar', de: 'Weiter', pt: 'Retomar' },
  quitConfirm: { fr: 'Quitter', en: 'Quit', es: 'Salir', de: 'Verlassen', pt: 'Sair' },

  // ── Quick pings (§C.4) ─────────────────────────────────────────────────────
  pingsKicker: {
    fr: 'PING RAPIDE AU CREW',
    en: 'QUICK PING TO CREW',
    es: 'PING RÁPIDO AL CREW',
    de: 'SCHNELL-PING AN CREW',
    pt: 'PING RÁPIDO AO CREW',
  },
  /** Override local du ping « out » (copy partagée QUICK_PINGS, anglicisme). */
  pingStop: {
    fr: 'Je m’arrête',
    en: 'I’m stopping',
    es: 'Me paro',
    de: 'Ich stoppe',
    pt: 'Vou parar',
  },

  // ── Script de feedback nav (liveNav.ts — toasts scriptés) ──────────────────
  toastArrival: {
    fr: 'Destination atteinte',
    en: 'Destination reached',
    es: 'Destino alcanzado',
    de: 'Ziel erreicht',
    pt: 'Destino alcançado',
  },
  toastDeviation: {
    fr: 'Déviation — itinéraire recalculé',
    en: 'Detour — route recalculated',
    es: 'Desvío — ruta recalculada',
    de: 'Umleitung — Route neu berechnet',
    pt: 'Desvio — rota recalculada',
  },
  /** App FR sans jargon anglais : « Repère » ; ailleurs « Checkpoint » (usage jeu). */
  toastCheckpoint: {
    fr: 'Repère — {label}',
    en: 'Checkpoint — {label}',
    es: 'Checkpoint — {label}',
    de: 'Checkpoint — {label}',
    pt: 'Checkpoint — {label}',
  },
  toastRecord: {
    fr: 'Nouveau record segment',
    en: 'New segment record',
    es: 'Nuevo récord de segmento',
    de: 'Neuer Segment-Rekord',
    pt: 'Novo recorde de segmento',
  },
  toastSectorTaken: {
    fr: 'Secteur pris · +{n} zones',
    en: 'Sector taken · +{n} zones',
    es: 'Sector tomado · +{n} zonas',
    de: 'Sektor erobert · +{n} Zonen',
    pt: 'Setor tomado · +{n} zonas',
  },

  // ── En-tête de route démo (liveNav.ts — routeInfoFromParam) ────────────────
  recommendedRoute: {
    fr: 'Itinéraire recommandé',
    en: 'Recommended route',
    es: 'Ruta recomendada',
    de: 'Empfohlene Route',
    pt: 'Rota recomendada',
  },
  routeName: {
    fr: 'Route {letter} — {name}',
    en: 'Route {letter} — {name}',
    es: 'Ruta {letter} — {name}',
    de: 'Route {letter} — {name}',
    pt: 'Rota {letter} — {name}',
  },
  routeSummaryStreets: {
    fr: '{km} · {n} rues à sauver',
    en: '{km} · {n} streets to save',
    es: '{km} · {n} calles por salvar',
    de: '{km} · {n} Straßen retten',
    pt: '{km} · {n} ruas a salvar',
  },
  routeSummaryZones: {
    fr: '{km} · +{n} zones',
    en: '{km} · +{n} zones',
    es: '{km} · +{n} zonas',
    de: '{km} · +{n} Zonen',
    pt: '{km} · +{n} zonas',
  },

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
   * (Remplace l'ancien `noGpsWebBody`, qui affirmait que l'enregistrement GPS
   *  « n'existe que dans l'app installée » — c'est faux depuis le 21/07/2026 :
   *  le navigateur enregistre de VRAIES courses via navigator.geolocation.)
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
  noGpsSettingsCta: {
    fr: 'Ouvrir les Réglages',
    en: 'Open Settings',
    es: 'Abrir Ajustes',
    de: 'Einstellungen öffnen',
    pt: 'Abrir Ajustes',
  },
  noGpsBack: {
    fr: 'Retour à la carte',
    en: 'Back to map',
    es: 'Volver al mapa',
    de: 'Zurück zur Karte',
    pt: 'Voltar ao mapa',
  },
  a11yNoGpsSettings: {
    fr: 'Ouvrir les réglages de position du téléphone',
    en: 'Open the phone’s location settings',
    es: 'Abrir los ajustes de ubicación del teléfono',
    de: 'Standorteinstellungen des Handys öffnen',
    pt: 'Abrir os ajustes de localização do telefone',
  },
});
