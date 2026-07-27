/**
 * GRYD — i18n : CATALOGUE E17 « Préparation d'activité » (`/map/prepare`, spec
 * produit UI/UX l.1028).
 *
 * Objectif de l'écran, mot pour mot : « Passer de l'intention à l'activité en un
 * seul écran. » Donc : UNE décision (l'objectif), UN CTA chartreuse (`DÉMARRER`),
 * le reste en lecture ou replié (§A).
 *
 * ─── TROIS ÉTATS TECHNIQUES, DONT UN QUI SAIT DIRE « JE NE SAIS PAS » ───────
 * La spec en liste trois — GPS, batterie, synchronisation.
 *   · GPS            → SE LIT (`features/run/gps/preflightSignal.ts`, seuils
 *                      `GPS_READY_ACCURACY_M` / `GPS_USABLE_ACCURACY_M`) ;
 *   · SYNCHRONISATION→ SE LIT (session Supabase + `pendingUploadStatus`, la file
 *                      d'envoi RÉELLE) ;
 *   · BATTERIE       → SE LIT DANS LE NAVIGATEUR (`navigator.getBattery()`,
 *                      `features/mission/battery.web.ts`) et PAS sur l'appareil :
 *                      `expo-battery` n'est toujours pas une dépendance de
 *                      `apps/mobile/package.json` au 27/07/2026.
 *
 * ─── CE QUE CE BLOC DISAIT LE MATIN MÊME, ET POURQUOI IL A CHANGÉ ───────────
 * Il déclarait : « IL N'Y A DONC AUCUNE CLÉ DE BATTERIE DANS CE CATALOGUE, ET
 * C'EST VOLONTAIRE […] une pastille "batterie inconnue" est du bruit qui n'aide
 * personne à partir. » La première moitié de l'argument était juste — une
 * pastille verte sans capteur est une donnée fabriquée — et la conclusion,
 * fausse : supprimer la ligne ne supprime pas l'ignorance, elle la déguise en
 * « rien à signaler ». La constitution ne demande pas de se taire quand on ne
 * sait pas, elle demande de ne pas AFFIRMER. La ligne existe donc, et elle dit
 * « inconnu » là où rien ne répond (`batteryUnknown`) — exactement ce que la
 * décision du 27/07 exige : « la où aucune mesure n'est possible, l'état dit
 * inconnu, il n'affiche pas une valeur plausible ».
 *
 * ─── DEUX OPTIONS DE LA SPEC NE SONT PAS TRADUITES ICI, POUR LA MÊME RAISON ─
 * La spec replie trois options : audio, partage temporaire crew, plan de route.
 *   · AUDIO → aucune dépendance audio dans l'app (`RealCourseLive.tsx:34` le
 *     documente déjà : « un bouton son serait mort ») ;
 *   · PARTAGE TEMPORAIRE CREW → aucune table, aucun RPC, aucun module (grep du
 *     27/07/2026) — et c'est une fonction de POSITION EN DIRECT, donc la
 *     dernière qu'on peindrait avant de savoir la tenir (§12) ;
 *   · PLAN DE ROUTE → EXISTE (`/route-planner`), et lui seul a sa clé.
 * Un contrôle qui échoue toujours est un bouton mort (constitution §2) ; son
 * absence, elle, ne ment pas.
 *
 * REGISTRE : tutoiement en français ; portugais BRÉSILIEN (« você »), jamais
 * « teu/tua ». Parité 5 langues imposée par `Entry`.
 * INVARIANTS jamais traduits : GRYD, GO, RUN/BIKE (libellés `activityLens`),
 * km, m, noms de lieux.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Header ────────────────────────────────────────────────────────────────
  screenTitle: {
    fr: 'Préparer',
    en: 'Get ready',
    es: 'Preparar',
    de: 'Vorbereiten',
    pt: 'Preparar',
  },
  backA11y: {
    fr: 'Revenir à la carte',
    en: 'Back to the map',
    es: 'Volver al mapa',
    de: 'Zurück zur Karte',
    pt: 'Voltar ao mapa',
  },
  /**
   * L'activité est VERROUILLABLE (spec l.1028) : une fois figée, la sortie
   * s'enregistrera dans cette discipline et pas l'autre. On le dit, parce que
   * c'est irréversible pour la course qui suit.
   */
  activityLocked: {
    fr: 'Discipline figée pour cette sortie',
    en: 'Discipline locked for this outing',
    es: 'Disciplina fijada para esta salida',
    de: 'Disziplin für diesen Ausflug fixiert',
    pt: 'Modalidade fixada para esta saída',
  },
  activityLockA11y: {
    fr: 'Verrouiller la discipline de cette sortie',
    en: 'Lock the discipline for this outing',
    es: 'Bloquear la disciplina de esta salida',
    de: 'Disziplin für diesen Ausflug sperren',
    pt: 'Travar a modalidade desta saída',
  },

  // ── La grande ligne d'objectif RECOMMANDÉ ─────────────────────────────────
  objectiveKicker: {
    fr: 'OBJECTIF',
    en: 'OBJECTIVE',
    es: 'OBJETIVO',
    de: 'ZIEL',
    pt: 'OBJETIVO',
  },
  /** Recommandation « conquérir » sans cible nommée (spec : « autour de vous »). */
  objectiveConquerNearby: {
    fr: 'Conquérir autour de toi',
    en: 'Conquer around you',
    es: 'Conquistar a tu alrededor',
    de: 'In deiner Umgebung erobern',
    pt: 'Conquistar ao seu redor',
  },
  /** Recommandation « défendre » avec la zone RÉELLE. `{zone}` vient des données. */
  objectiveDefendNamed: {
    fr: 'Défendre {zone}',
    en: 'Defend {zone}',
    es: 'Defender {zone}',
    de: '{zone} verteidigen',
    pt: 'Defender {zone}',
  },
  /** Défense d'une zone que la carte n'a pas su nommer — on ne l'invente pas. */
  objectiveDefendUnnamed: {
    fr: 'Défendre ta zone menacée',
    en: 'Defend your threatened zone',
    es: 'Defender tu zona amenazada',
    de: 'Deine bedrohte Zone verteidigen',
    pt: 'Defender sua zona ameaçada',
  },
  /**
   * POURQUOI cette recommandation — une phrase, jamais un paragraphe. Elle est
   * DÉRIVÉE (une zone à moi expire dans {h} h) : aucune urgence fabriquée.
   */
  objectiveReasonExpiring: {
    fr: 'Elle s’efface dans {h} h si personne n’y court.',
    en: 'It fades in {h} h if nobody runs it.',
    es: 'Se borra en {h} h si nadie corre allí.',
    de: 'Sie verblasst in {h} h, wenn niemand dort läuft.',
    pt: 'Ela some em {h} h se ninguém correr lá.',
  },
  /**
   * ⚠ CETTE PHRASE AFFIRME. « Rien ne presse AILLEURS » suppose qu'on a regardé
   * ailleurs — elle n'a donc le droit d'apparaître qu'après une lecture ABOUTIE
   * de mes zones, sur un joueur qui en possède au moins une. Jusqu'au
   * 27/07/2026 elle était le cas par DÉFAUT de l'écran (tout ce qui n'était pas
   * une défense), donc affichée sans qu'aucune zone n'ait été lue. C'est
   * `objectiveReasonKey` (prepareState.ts) qui garde désormais la porte.
   */
  objectiveReasonExpand: {
    fr: 'Rien ne presse ailleurs : c’est le moment d’agrandir.',
    en: 'Nothing urgent elsewhere: good time to grow.',
    es: 'Nada urge en otro sitio: buen momento para ampliar.',
    de: 'Sonst nichts Dringendes — guter Moment zum Erweitern.',
    pt: 'Nada urgente em outro lugar: hora de ampliar.',
  },
  /**
   * Lecture ABOUTIE, et pas une seule zone à moi (`first_capture`). « Agrandir »
   * n'a alors aucun sens — agrandir quoi. La phrase dit le fait, et il est
   * motivant par lui-même : la première prise est un événement.
   */
  objectiveReasonFirst: {
    fr: 'Tu n’as encore aucune zone : celle-ci sera la première.',
    en: 'You don’t hold a single zone yet: this one will be the first.',
    es: 'Aún no tienes ninguna zona: esta será la primera.',
    de: 'Du hältst noch keine einzige Zone: Diese wird die erste.',
    pt: 'Você ainda não tem nenhuma zona: esta será a primeira.',
  },
  /**
   * La lecture des zones n'a PAS abouti (pas de backend, pas de session, échec,
   * ou lecture en cours). L'écran ne sait rien du terrain — et il le dit, au
   * lieu de peindre une raison rassurante. Il n'INTERDIT rien pour autant :
   * sortir courir reste possible, et c'est ce que la seconde phrase établit.
   */
  objectiveReasonUnknown: {
    fr: 'Tes zones n’ont pas pu être lues : cette sortie compte quand même.',
    en: 'Your zones couldn’t be read: this outing still counts.',
    es: 'No se han podido leer tus zonas: esta salida cuenta igualmente.',
    de: 'Deine Zonen konnten nicht gelesen werden: Diese Runde zählt trotzdem.',
    pt: 'Não foi possível ler suas zonas: esta saída conta mesmo assim.',
  },

  // ── Le lien « Changer » + le mini-segment ─────────────────────────────────
  change: {
    fr: 'Changer',
    en: 'Change',
    es: 'Cambiar',
    de: 'Ändern',
    pt: 'Mudar',
  },
  changeA11y: {
    fr: 'Changer l’objectif de cette sortie',
    en: 'Change this outing’s objective',
    es: 'Cambiar el objetivo de esta salida',
    de: 'Ziel dieses Ausflugs ändern',
    pt: 'Mudar o objetivo desta saída',
  },
  segConquer: {
    fr: 'Conquérir',
    en: 'Conquer',
    es: 'Conquistar',
    de: 'Erobern',
    pt: 'Conquistar',
  },
  segDefend: {
    fr: 'Défendre',
    en: 'Defend',
    es: 'Defender',
    de: 'Verteidigen',
    pt: 'Defender',
  },
  /** La recommandation reste VISIBLE après un changement (spec l.1028). */
  recommendedBadge: {
    fr: 'Recommandé',
    en: 'Recommended',
    es: 'Recomendado',
    de: 'Empfohlen',
    pt: 'Recomendado',
  },
  /** Aucune zone à défendre : le segment « Défendre » n'a pas de cible. */
  segDefendUnavailable: {
    fr: 'Rien à défendre : tu ne tiens aucune zone menacée.',
    en: 'Nothing to defend: you hold no threatened zone.',
    es: 'Nada que defender: no retienes ninguna zona amenazada.',
    de: 'Nichts zu verteidigen: Du hältst keine bedrohte Zone.',
    pt: 'Nada a defender: você não mantém nenhuma zona ameaçada.',
  },

  // ── Mini-carte de la cible ────────────────────────────────────────────────
  mapLoading: {
    fr: 'Lecture de la cible…',
    en: 'Loading the target…',
    es: 'Cargando el objetivo…',
    de: 'Ziel wird geladen…',
    pt: 'Carregando o alvo…',
  },
  mapNoPosition: {
    fr: 'Position inconnue : la cible s’affichera dès le premier point GPS.',
    en: 'Location unknown: the target appears with the first GPS fix.',
    es: 'Ubicación desconocida: el objetivo aparecerá con el primer punto GPS.',
    de: 'Standort unbekannt: Das Ziel erscheint mit dem ersten GPS-Punkt.',
    pt: 'Localização desconhecida: o alvo aparece no primeiro ponto de GPS.',
  },
  mapFailed: {
    fr: 'La carte n’a pas pu être lue. Tu peux démarrer quand même.',
    en: 'The map couldn’t load. You can still start.',
    es: 'No se pudo cargar el mapa. Puedes empezar igualmente.',
    de: 'Die Karte lud nicht. Du kannst trotzdem starten.',
    pt: 'O mapa não carregou. Você pode começar mesmo assim.',
  },

  // ── État technique 1/2 : GPS ──────────────────────────────────────────────
  techKicker: {
    fr: 'AVANT DE PARTIR',
    en: 'BEFORE YOU GO',
    es: 'ANTES DE SALIR',
    de: 'VOR DEM START',
    pt: 'ANTES DE SAIR',
  },
  gpsLabel: { fr: 'GPS', en: 'GPS', es: 'GPS', de: 'GPS', pt: 'GPS' },
  /** Bande verte : le signal tient le seuil de capture. */
  gpsReady: {
    fr: 'Signal net',
    en: 'Sharp signal',
    es: 'Señal nítida',
    de: 'Klares Signal',
    pt: 'Sinal nítido',
  },
  /** Bande orange : utilisable, mais la capture sera moins précise. On le dit. */
  gpsApproximate: {
    fr: 'Signal approximatif — la capture sera plus grossière',
    en: 'Rough signal — the capture will be coarser',
    es: 'Señal aproximada — la captura será más burda',
    de: 'Ungenaues Signal — die Eroberung wird gröber',
    pt: 'Sinal aproximado — a captura será mais grosseira',
  },
  /** Aucun point encore reçu : un chargement n'affirme rien. */
  gpsSearching: {
    fr: 'Recherche du signal…',
    en: 'Looking for a signal…',
    es: 'Buscando la señal…',
    de: 'Signal wird gesucht…',
    pt: 'Procurando o sinal…',
  },
  /** Permission refusée : sans elle, aucune capture n'est possible. */
  gpsDenied: {
    fr: 'Localisation refusée — aucune zone ne pourra être capturée',
    en: 'Location denied — no zone can be captured',
    es: 'Ubicación denegada — no se podrá capturar ninguna zona',
    de: 'Standort abgelehnt — keine Zone kann erobert werden',
    pt: 'Localização negada — nenhuma zona poderá ser capturada',
  },
  gpsOpenSettings: {
    fr: 'Ouvrir les réglages',
    en: 'Open settings',
    es: 'Abrir ajustes',
    de: 'Einstellungen öffnen',
    pt: 'Abrir ajustes',
  },
  /** Bande rouge d'E19 : mesuré, et franchement mauvais. On le dit sans le
   *  déguiser en « approximatif » — le départ reste possible, la capture non. */
  gpsPoor: {
    fr: 'Signal faible — sors à découvert avant de partir',
    en: 'Weak signal — step into the open before you go',
    es: 'Señal débil — sal a cielo abierto antes de salir',
    de: 'Schwaches Signal — geh vor dem Start ins Freie',
    pt: 'Sinal fraco — vá para um lugar aberto antes de sair',
  },
  /**
   * AUCUNE mesure possible ici : localisation refusée, capteur muet, ou position
   * rendue sans précision chiffrée. Distinct de « recherche » (qui attend) et de
   * « faible » (qui a mesuré). L'écran ne peint alors aucune bande.
   */
  gpsUnavailable: {
    fr: 'Aucune mesure — la localisation ne répond pas',
    en: 'No reading — location isn’t responding',
    es: 'Sin medición — la ubicación no responde',
    de: 'Keine Messung — der Standort antwortet nicht',
    pt: 'Sem medição — a localização não responde',
  },

  // ── État technique 2/3 : batterie ─────────────────────────────────────────
  batteryLabel: {
    fr: 'Batterie',
    en: 'Battery',
    es: 'Batería',
    de: 'Akku',
    pt: 'Bateria',
  },
  /**
   * L'appareil ne publie pas son niveau (aucune dépendance batterie native ;
   * navigateurs ayant retiré l'API). C'est un FAIT, pas un défaut d'affichage :
   * on ne remplit pas ce trou par une valeur plausible.
   */
  batteryUnknown: {
    fr: 'Niveau inconnu — cet appareil ne le publie pas',
    en: 'Level unknown — this device doesn’t report it',
    es: 'Nivel desconocido — este dispositivo no lo publica',
    de: 'Ladestand unbekannt — dieses Gerät meldet ihn nicht',
    pt: 'Nível desconhecido — este aparelho não informa',
  },
  /** Niveau MESURÉ, suffisant. `{p}` vient du capteur, jamais d'une estimation. */
  batteryOk: {
    fr: '{p} %',
    en: '{p} %',
    es: '{p} %',
    de: '{p} %',
    pt: '{p} %',
  },
  /** Sous le seuil où le système commence à brider ce dont le GPS dépend. */
  batteryLow: {
    fr: '{p} % — l’enregistrement GPS peut être bridé',
    en: '{p} % — GPS recording may be throttled',
    es: '{p} % — la grabación GPS puede limitarse',
    de: '{p} % — die GPS-Aufzeichnung kann gedrosselt werden',
    pt: '{p} % — a gravação de GPS pode ser limitada',
  },
  batteryCharging: {
    fr: '{p} % — en charge',
    en: '{p} % — charging',
    es: '{p} % — cargando',
    de: '{p} % — lädt',
    pt: '{p} % — carregando',
  },

  // ── État technique 3/3 : synchronisation ──────────────────────────────────
  syncLabel: {
    fr: 'Synchronisation',
    en: 'Sync',
    es: 'Sincronización',
    de: 'Synchronisierung',
    pt: 'Sincronização',
  },
  syncReady: {
    fr: 'À jour',
    en: 'Up to date',
    es: 'Al día',
    de: 'Aktuell',
    pt: 'Em dia',
  },
  /** Des sorties attendent : rien n'est perdu, et on le prouve en le disant. */
  syncPending: {
    fr: '{n} sortie(s) en attente d’envoi — rien n’est perdu',
    en: '{n} outing(s) waiting to upload — nothing is lost',
    es: '{n} salida(s) pendientes de envío — no se pierde nada',
    de: '{n} Ausflug/Ausflüge warten auf Upload — nichts geht verloren',
    pt: '{n} saída(s) aguardando envio — nada se perde',
  },
  /**
   * La file d'envoi n'a pas pu être LUE (stockage local indisponible, blob
   * corrompu), ou la lecture n'est pas revenue. « À jour » serait une promesse
   * que personne n'a vérifiée.
   */
  syncUnknown: {
    fr: 'État inconnu — la file d’envoi n’a pas pu être lue',
    en: 'Status unknown — the upload queue couldn’t be read',
    es: 'Estado desconocido — no se pudo leer la cola de envío',
    de: 'Status unbekannt — die Warteschlange war nicht lesbar',
    pt: 'Estado desconhecido — a fila de envio não pôde ser lida',
  },
  /**
   * Hors ligne : on peut courir, le verdict serveur viendra plus tard.
   *
   * ⚠ CLÉ NON CONSOMMÉE au 27/07/2026, et volontairement conservée : RIEN dans
   * le dépôt ne MESURE la connectivité (aucune dépendance réseau installée,
   * `navigator.onLine` n'existe que dans le navigateur). L'afficher serait une
   * supposition. `syncPending` porte déjà le seul fait vérifiable — des sorties
   * attendent, rien n'est perdu. Ne pas la brancher tant qu'aucune mesure ne la
   * fonde.
   */
  syncOffline: {
    fr: 'Hors ligne — la sortie sera envoyée au retour du réseau',
    en: 'Offline — the outing uploads when the network returns',
    es: 'Sin conexión — la salida se enviará al volver la red',
    de: 'Offline — der Ausflug wird bei Netz wieder gesendet',
    pt: 'Offline — a saída será enviada quando a rede voltar',
  },
  /** Pas connecté : la course s'enregistre en local, sans territoire. */
  syncSignedOut: {
    fr: 'Non connecté — la sortie sera enregistrée sans territoire',
    en: 'Signed out — the outing records without territory',
    es: 'Sin sesión — la salida se guardará sin territorio',
    de: 'Nicht angemeldet — der Ausflug wird ohne Gebiet gespeichert',
    pt: 'Sem sessão — a saída será salva sem território',
  },

  // ── Options repliées (SEULE celle qui existe vraiment) ────────────────────
  optionsToggle: {
    fr: 'Options',
    en: 'Options',
    es: 'Opciones',
    de: 'Optionen',
    pt: 'Opções',
  },
  optionsToggleA11y: {
    fr: 'Afficher ou masquer les options de la sortie',
    en: 'Show or hide the outing options',
    es: 'Mostrar u ocultar las opciones de la salida',
    de: 'Optionen des Ausflugs ein- oder ausblenden',
    pt: 'Mostrar ou ocultar as opções da saída',
  },
  optionRoutePlan: {
    fr: 'Plan de route',
    en: 'Route plan',
    es: 'Plan de ruta',
    de: 'Routenplan',
    pt: 'Plano de rota',
  },
  optionRoutePlanSub: {
    fr: 'Choisir une boucle avant de partir.',
    en: 'Pick a loop before you go.',
    es: 'Elige un bucle antes de salir.',
    de: 'Vor dem Start eine Schleife wählen.',
    pt: 'Escolha um circuito antes de sair.',
  },

  // ── CTA sticky + friction minimale ────────────────────────────────────────
  /** UNIQUE CTA chartreuse de l'écran (§A4). « GO » reste invariant ailleurs. */
  startCta: {
    fr: 'DÉMARRER',
    en: 'START',
    es: 'EMPEZAR',
    de: 'STARTEN',
    pt: 'COMEÇAR',
  },
  startA11y: {
    fr: 'Démarrer l’activité',
    en: 'Start the activity',
    es: 'Empezar la actividad',
    de: 'Aktivität starten',
    pt: 'Começar a atividade',
  },
  /**
   * Spec : « Aucun compte à rebours obligatoire. » La micro-ligne dit ce qui va
   * se passer au tap, selon le réglage RÉEL du joueur — jamais une promesse de
   * guidage que l'écran suivant ne tient pas.
   */
  /**
   * ⚠ CLÉ NON CONSOMMÉE au 27/07/2026, et volontairement conservée. La spec
   * l.1028 dit « aucun compte à rebours obligatoire […] utilisé uniquement si
   * l'utilisateur l'a activé » — mais AUCUN réglage de ce genre n'existe dans le
   * dépôt (grep : aucun `countdown` dans `features/settings` ni `routePrefs`), et
   * `RunPreflight` décompte TOUJOURS 3-2-1. Écrire « départ immédiat » serait
   * donc démenti trois secondes plus tard. L'écran affiche `startMicroCountdown`,
   * qui décrit ce qui va réellement se passer. À brancher le jour où le réglage
   * existe — pas avant.
   */
  startMicroImmediate: {
    fr: 'Départ immédiat.',
    en: 'Starts right away.',
    es: 'Salida inmediata.',
    de: 'Startet sofort.',
    pt: 'Começa na hora.',
  },
  startMicroCountdown: {
    fr: 'Départ après le décompte 3-2-1.',
    en: 'Starts after the 3-2-1 countdown.',
    es: 'Salida tras la cuenta atrás 3-2-1.',
    de: 'Start nach dem 3-2-1-Countdown.',
    pt: 'Começa após a contagem 3-2-1.',
  },
});
