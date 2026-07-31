/**
 * GRYD — i18n : catalogue du domaine « run-gps » (course live réelle,
 * états GPS, aide « Courir écran éteint » par constructeur).
 * Parité 5 langues imposée par le type Entry — une langue manquante = erreur TS.
 *
 * Invariants JAMAIS traduits (restent en dur dans les composants) :
 * GRYD, GRYD VERIFIED, GPS TRUST, KM, iPhone, noms de constructeurs.
 * §A : libellés de boutons/chips COURTS dans les 5 langues (jamais tronqués).
 */
import type { Activity } from '@klaim/shared';
import { defineCatalog, type Entry } from '../types';

export const C = defineCatalog({
  // ── DISCIPLINE DE LA SORTIE (E14, vélo réel 26/07/2026) ──────────────────
  // Noms EN MINUSCULE et volontairement : ils ne s'affichent jamais seuls, ils
  // s'insèrent dans des phrases (« Sortie enregistrée comme vélo », « 3,4 km
  // retrouvés en course à pied »). Le libellé VISIBLE de la pill, lui, reste le
  // couple invariant RUN / BIKE de `ui/activityLens` — le même mot que le
  // commutateur de la Carte, pour que le joueur reconnaisse ce qu'il a choisi.
  activityNameRun: {
    fr: 'course à pied',
    en: 'running',
    es: 'carrera a pie',
    de: 'Laufen',
    pt: 'corrida',
  },
  activityNameBike: {
    fr: 'vélo',
    en: 'cycling',
    es: 'bici',
    de: 'Radfahren',
    pt: 'bicicleta',
  },
  /** Lu à voix haute sur la pill permanente de l'écran live. */
  a11yLiveActivity: {
    fr: 'Sortie enregistrée comme {name}',
    en: 'Outing recorded as {name}',
    es: 'Salida registrada como {name}',
    de: 'Aktivität aufgezeichnet als {name}',
    pt: 'Atividade registrada como {name}',
  },

  // ── Pill d'état principale (statusLabel) ─────────────────────────────────
  statusPaused: {
    fr: 'EN PAUSE',
    en: 'PAUSED',
    es: 'EN PAUSA',
    de: 'PAUSIERT',
    pt: 'PAUSADO',
  },
  statusPausedAuto: {
    fr: 'EN PAUSE AUTO · BOUGE POUR REPRENDRE',
    en: 'AUTO-PAUSED · MOVE TO RESUME',
    es: 'PAUSA AUTO · MUÉVETE PARA SEGUIR',
    de: 'AUTO-PAUSE · BEWEG DICH FÜR WEITER',
    pt: 'PAUSA AUTO · MEXA-SE PARA RETOMAR',
  },
  statusFinished: {
    fr: 'COURSE TERMINÉE',
    en: 'RUN FINISHED',
    es: 'CARRERA TERMINADA',
    de: 'LAUF BEENDET',
    pt: 'CORRIDA CONCLUÍDA',
  },
  /**
   * Aucune position n'est JAMAIS arrivée depuis le départ, et l'attente dure.
   * Distinct de « signal perdu » (qui suppose qu'on en avait un) : on ne
   * transforme pas une lecture en cours en échec, ni un échec en attente muette.
   */
  signalNeverReceived: {
    fr: 'Aucune position reçue pour l’instant',
    en: 'No position received yet',
    es: 'Ninguna posición recibida por ahora',
    de: 'Noch keine Position empfangen',
    pt: 'Nenhuma posição recebida até agora',
  },
  statusSearchingGps: {
    fr: 'RECHERCHE GPS…',
    en: 'SEARCHING GPS…',
    es: 'BUSCANDO GPS…',
    de: 'GPS-SUCHE…',
    pt: 'BUSCANDO GPS…',
  },
  statusRunning: {
    fr: 'EN COURSE',
    en: 'RUNNING',
    es: 'EN CARRERA',
    de: 'IM LAUF',
    pt: 'EM CORRIDA',
  },
  /**
   * Les deux états ci-dessous ne sont PAS une coquetterie de traduction : sur
   * une sortie vélo, « EN COURSE » / « RUNNING » est littéralement faux, et un
   * écran qui nomme mal ce qu'il enregistre est la version la plus discrète du
   * mensonge que la charte interdit. Les autres états (EN PAUSE, RECHERCHE
   * GPS…) sont déjà neutres et restent partagés.
   */
  statusRidingBike: {
    fr: 'EN SORTIE',
    en: 'RIDING',
    es: 'EN RUTA',
    de: 'UNTERWEGS',
    pt: 'EM PERCURSO',
  },
  statusFinishedBike: {
    fr: 'SORTIE TERMINÉE',
    en: 'RIDE FINISHED',
    es: 'SALIDA TERMINADA',
    de: 'FAHRT BEENDET',
    pt: 'PERCURSO CONCLUÍDO',
  },

  // ── Pills secondaires du haut ────────────────────────────────────────────
  statsOnlyMode: {
    fr: '{mode} — stats uniquement, aucune capture',
    en: '{mode} — stats only, no capture',
    es: '{mode} — solo stats, sin captura',
    de: '{mode} — nur Stats, keine Zonen',
    pt: '{mode} — só stats, sem captura',
  },
  foregroundOnly: {
    fr: 'Course enregistrée quand l’app est ouverte.',
    en: 'Run recorded while the app is open.',
    es: 'Carrera registrada con la app abierta.',
    de: 'Lauf wird nur bei geöffneter App erfasst.',
    pt: 'Corrida registrada com o app aberto.',
  },
  /**
   * La même limite, dite au cycliste. Cette phrase s'affiche pendant TOUTE la
   * sortie dès que la permission « Toujours » manque : c'est, en durée d'écran,
   * le texte le plus lu de la course — et il appelait « Course » ce qu'un vélo
   * enregistre. Le mot « Sortie » n'est pas un synonyme poli : c'est le mot que
   * la pill d'état (`statusRidingBike`) et le Résultat emploient déjà.
   */
  foregroundOnlyBike: {
    fr: 'Sortie enregistrée quand l’app est ouverte.',
    en: 'Ride recorded while the app is open.',
    es: 'Salida registrada con la app abierta.',
    de: 'Fahrt wird nur bei geöffneter App erfasst.',
    pt: 'Percurso registrado com o app aberto.',
  },
  /**
   * Navigateur : la position est RÉELLE, mais un onglet caché est suspendu ou
   * étranglé par le navigateur — les positions s'arrêtent. Ce n'est pas un
   * refus de l'utilisateur, c'est une limite de la plateforme : on l'annonce
   * d'emblée plutôt que de laisser croire à un enregistrement continu.
   */
  browserForegroundOnly: {
    fr: 'Garde cet onglet au premier plan : sinon le navigateur coupe la position.',
    en: 'Keep this tab in front: otherwise the browser stops location updates.',
    es: 'Mantén esta pestaña al frente: si no, el navegador corta la ubicación.',
    de: 'Lass diesen Tab im Vordergrund: sonst stoppt der Browser den Standort.',
    pt: 'Mantenha esta aba em primeiro plano: senão o navegador corta a localização.',
  },
  restoreKmFound: {
    fr: '{km} km retrouvés',
    en: '{km} km recovered',
    es: '{km} km recuperados',
    de: '{km} km wiedergefunden',
    pt: '{km} km recuperados',
  },
  /** Repli si le mode est inconnu (RUN_MODE_LABEL ne le connaît pas). */
  modeConquete: {
    fr: 'Conquête',
    en: 'Conquest',
    es: 'Conquista',
    de: 'Eroberung',
    pt: 'Conquista',
  },

  // ── Centre Nike : KPI ────────────────────────────────────────────────────
  kickerDistance: {
    fr: 'DISTANCE',
    en: 'DISTANCE',
    es: 'DISTANCIA',
    de: 'DISTANZ',
    pt: 'DISTÂNCIA',
  },
  zonesEstimated: {
    fr: '+{n} ZONES ESTIMÉES',
    en: '+{n} ZONES ESTIMATED',
    es: '+{n} ZONAS ESTIMADAS',
    de: '+{n} ZONEN GESCHÄTZT',
    pt: '+{n} ZONAS ESTIMADAS',
  },
  // ── E07 : pill de FERMETURE (état permanent, jamais un avis temporaire) ──
  // Les mètres annoncés sont ceux qu'il reste à COUVRIR pour que la boucle
  // compte (écart au départ MOINS la tolérance serveur) — pas une promesse de
  // capture : le serveur reste seul juge. Le « ~ » dit l'estimation.
  loopOpenPill: {
    fr: 'Boucle ouverte · ~{m} m à fermer',
    en: 'Loop open · ~{m} m to close',
    es: 'Bucle abierto · ~{m} m para cerrar',
    de: 'Runde offen · noch ~{m} m',
    pt: 'Circuito aberto · ~{m} m para fechar',
  },
  /** Revenu à portée SANS passer sous la tolérance : factuel, ambre, jamais rouge. */
  loopNotClosedPill: {
    fr: 'Boucle non fermée · {m} m manquants',
    en: 'Loop not closed · {m} m missing',
    es: 'Bucle no cerrado · faltan {m} m',
    de: 'Runde nicht geschlossen · {m} m fehlen',
    pt: 'Circuito não fechado · faltam {m} m',
  },
  loopClosedPill: {
    fr: 'Boucle fermée · termine quand tu veux',
    en: 'Loop closed · finish whenever you want',
    es: 'Bucle cerrado · termina cuando quieras',
    de: 'Runde geschlossen · beende jederzeit',
    pt: 'Circuito fechado · termine quando quiser',
  },
  /** Progression de fermeture — approximative par construction (« ~ »). */
  loopProgress: {
    fr: '~{n} %',
    en: '~{n}%',
    es: '~{n} %',
    de: '~{n} %',
    pt: '~{n} %',
  },
  a11yLoopProgress: {
    fr: 'Fermeture de la boucle : environ {n} %',
    en: 'Loop closing: about {n}%',
    es: 'Cierre del bucle: cerca del {n} %',
    de: 'Rundenschluss: etwa {n} %',
    pt: 'Fechamento do circuito: cerca de {n} %',
  },
  paceLabel: {
    fr: 'ALLURE /KM',
    en: 'PACE /KM',
    es: 'RITMO /KM',
    de: 'PACE /KM',
    pt: 'PACE /KM',
  },
  /**
   * LA 3ᵉ MÉTRIQUE CHANGE DE GRANDEUR À VÉLO — et elle doit en changer ICI, pas
   * seulement à l'arrivée. Le Résultat rend déjà une VITESSE au cycliste
   * (`features/run/effortRate.ts`) : laisser le bandeau live en min/km lui
   * faisait lire son effort dans deux unités pour la même sortie, la seconde
   * démentant la première trente secondes après la ligne d'arrivée.
   *
   * Le libellé ne porte PAS son unité (contrairement à « ALLURE /KM ») : « KM/H »
   * est rendu à côté du chiffre, exactement comme le « KM » de la distance.
   * Raison §A9 : une colonne du bandeau fait ~1/3 de la largeur, et
   * « VELOCIDADE KM/H » y serait tronqué par « … » en portugais.
   */
  speedLabel: {
    fr: 'VITESSE',
    en: 'SPEED',
    es: 'VELOCIDAD',
    de: 'TEMPO',
    pt: 'VELOCIDADE',
  },
  /**
   * Lu à voix haute à la place du tiret, tant qu'aucune allure n'a été mesurée.
   * Formulé SANS accord (« pas encore de mesure » plutôt que « non mesurée ») :
   * la même phrase sert l'allure et la vitesse, dont les genres divergent selon
   * les langues (es. « el ritmo » / « la velocidad »).
   */
  rateNotMeasured: {
    fr: 'Pas encore de mesure',
    en: 'No measurement yet',
    es: 'Todavía sin medición',
    de: 'Noch keine Messung',
    pt: 'Ainda sem medição',
  },
  timeLabel: {
    fr: 'TEMPS',
    en: 'TIME',
    es: 'TIEMPO',
    de: 'ZEIT',
    pt: 'TEMPO',
  },

  // ── Gros contrôles une-main (§A : COURTS) ────────────────────────────────
  ctrlResume: {
    fr: 'REPRENDRE',
    en: 'RESUME',
    es: 'REANUDAR',
    de: 'WEITER',
    pt: 'RETOMAR',
  },
  ctrlPause: {
    fr: 'PAUSE',
    en: 'PAUSE',
    es: 'PAUSA',
    de: 'PAUSE',
    pt: 'PAUSA',
  },
  ctrlGpsHelp: {
    fr: 'AIDE GPS',
    en: 'GPS HELP',
    es: 'AYUDA GPS',
    de: 'GPS-HILFE',
    pt: 'AJUDA GPS',
  },
  ctrlFinish: {
    fr: 'TERMINER',
    en: 'FINISH',
    es: 'TERMINAR',
    de: 'BEENDEN',
    pt: 'TERMINAR',
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
  /**
   * ─── LES QUATRE LIBELLÉS LUS À VOIX HAUTE (E14, 26/07/2026) ───────────────
   * Les libellés VISIBLES de ces mêmes contrôles sont déjà neutres — « PAUSE »,
   * « REPRENDRE », « TERMINER » ne nomment aucune discipline, et n'ont donc
   * AUCUN twin. C'est précisément ce qui rendait le défaut invisible : seul un
   * cycliste utilisant VoiceOver entendait « Mettre la course en pause » sur sa
   * sortie vélo, et personne d'autre dans l'app ne pouvait s'en apercevoir.
   */
  a11yResumeRunBike: {
    fr: 'Reprendre la sortie',
    en: 'Resume the ride',
    es: 'Reanudar la salida',
    de: 'Fahrt fortsetzen',
    pt: 'Retomar o percurso',
  },
  a11yPauseRunBike: {
    fr: 'Mettre la sortie en pause',
    en: 'Pause the ride',
    es: 'Pausar la salida',
    de: 'Fahrt pausieren',
    pt: 'Pausar o percurso',
  },
  a11yGpsHelp: {
    fr: 'Aide GPS : courir écran éteint',
    en: 'GPS help: run with the screen off',
    es: 'Ayuda GPS: correr con la pantalla apagada',
    de: 'GPS-Hilfe: mit Bildschirm aus laufen',
    pt: 'Ajuda GPS: correr com a tela desligada',
  },
  a11yGpsHelpBike: {
    fr: 'Aide GPS : rouler écran éteint',
    en: 'GPS help: ride with the screen off',
    es: 'Ayuda GPS: pedalear con la pantalla apagada',
    de: 'GPS-Hilfe: mit Bildschirm aus fahren',
    pt: 'Ajuda GPS: pedalar com a tela desligada',
  },
  a11yLiveMap: {
    fr: 'Carte de ta course, centrée sur toi',
    en: 'Map of your run, centred on you',
    es: 'Mapa de tu carrera, centrado en ti',
    de: 'Karte deines Laufs, auf dich zentriert',
    pt: 'Mapa da sua corrida, centrado em você',
  },
  a11yLiveMapBike: {
    fr: 'Carte de ta sortie, centrée sur toi',
    en: 'Map of your ride, centred on you',
    es: 'Mapa de tu salida, centrado en ti',
    de: 'Karte deiner Fahrt, auf dich zentriert',
    pt: 'Mapa do seu percurso, centrado em você',
  },

  // ── E07 : verrou des contrôles (effet RÉEL — sinon il ne serait pas peint) ──
  ctrlLock: {
    fr: 'VERROU',
    en: 'LOCK',
    es: 'BLOQUEO',
    de: 'SPERRE',
    pt: 'TRAVA',
  },
  a11yLockControls: {
    fr: 'Verrouiller les contrôles',
    en: 'Lock the controls',
    es: 'Bloquear los controles',
    de: 'Bedienelemente sperren',
    pt: 'Bloquear os controles',
  },
  lockedTitle: {
    fr: 'CONTRÔLES VERROUILLÉS',
    en: 'CONTROLS LOCKED',
    es: 'CONTROLES BLOQUEADOS',
    de: 'BEDIENUNG GESPERRT',
    pt: 'CONTROLES BLOQUEADOS',
  },
  lockedHint: {
    fr: 'Maintiens pour déverrouiller',
    en: 'Hold to unlock',
    es: 'Mantén para desbloquear',
    de: 'Halten zum Entsperren',
    pt: 'Segure para desbloquear',
  },
  a11yUnlockControls: {
    fr: 'Déverrouiller les contrôles (maintenir)',
    en: 'Unlock the controls (hold)',
    es: 'Desbloquear los controles (mantén pulsado)',
    de: 'Bedienelemente entsperren (gedrückt halten)',
    pt: 'Desbloquear os controles (segure)',
  },

  // ── E08 : séquence de fermeture (fait GÉOMÉTRIQUE, jamais une capture) ──
  // Ce qui s'affiche ici n'a qu'une source : la trace mesurée. Aucun nom de
  // zone, aucune aire en km², aucune attribution — le serveur ne s'est pas
  // encore prononcé (il ne le fera qu'à l'envoi, en fin de course).
  loopClosedTitle: {
    fr: 'BOUCLE FERMÉE',
    en: 'LOOP CLOSED',
    es: 'BUCLE CERRADO',
    de: 'RUNDE GESCHLOSSEN',
    pt: 'CIRCUITO FECHADO',
  },
  a11ySkipClosure: {
    fr: 'Appuie pour passer',
    en: 'Tap to skip',
    es: 'Toca para saltar',
    de: 'Tippen zum Überspringen',
    pt: 'Toque para pular',
  },
  a11yClosureBadge: {
    fr: 'Boucle fermée pendant cette course',
    en: 'Loop closed during this run',
    es: 'Bucle cerrado en esta carrera',
    de: 'Runde in diesem Lauf geschlossen',
    pt: 'Circuito fechado nesta corrida',
  },
  /** « BOUCLE FERMÉE » (le titre visible) est déjà neutre et n'a pas de twin —
   *  seule cette version lue nommait la discipline. */
  a11yClosureBadgeBike: {
    fr: 'Boucle fermée pendant cette sortie',
    en: 'Loop closed during this ride',
    es: 'Bucle cerrado en esta salida',
    de: 'Runde bei dieser Fahrt geschlossen',
    pt: 'Circuito fechado neste percurso',
  },
  a11yFinishRun: {
    fr: 'Terminer la course (maintenir)',
    en: 'Finish the run (hold)',
    es: 'Terminar la carrera (mantén pulsado)',
    de: 'Lauf beenden (gedrückt halten)',
    pt: 'Terminar a corrida (segure)',
  },
  a11yFinishRunBike: {
    fr: 'Terminer la sortie (maintenir)',
    en: 'Finish the ride (hold)',
    es: 'Terminar la salida (mantén pulsado)',
    de: 'Fahrt beenden (gedrückt halten)',
    pt: 'Terminar o percurso (segure)',
  },

  // ── Pill signal GPS (informatif, jamais bloquant, anti-shame) ────────────
  signalRevoked: {
    fr: 'GPS coupé — réactive la position dans Réglages',
    en: 'GPS off — re-enable location in Settings',
    es: 'GPS desactivado — reactiva la ubicación en Ajustes',
    de: 'GPS aus — Standort in den Einstellungen aktivieren',
    pt: 'GPS desligado — reative a localização em Ajustes',
  },
  /**
   * ⚠️ « läuft weiter » EST UN FAUX AMI, ET IL RESTE (26/07/2026).
   *
   * Le sujet de ce verbe n'est pas le joueur : c'est L'ENREGISTREMENT qui
   * continue (« läuft » = fonctionne, tourne). La phrase ne demande donc rien à
   * personne et ne nomme aucune discipline — la remplacer par un neutre
   * fabriqué serait retoucher un texte juste. Les autres faux amis allemands du
   * catalogue obéissent à la même règle : « läuft ab » (expirer), « Lauf-Zeit »
   * n'existe pas ici, et seul un IMPÉRATIF adressé au joueur est fautif.
   */
  signalLost: {
    fr: 'Signal perdu — on continue, rien n’est compté à tort',
    en: 'Signal lost — still tracking, nothing counted wrongly',
    es: 'Señal perdida — seguimos, nada se cuenta mal',
    de: 'Signal verloren — läuft weiter, nichts wird falsch gezählt',
    pt: 'Sinal perdido — seguimos, nada é contado errado',
  },
  /**
   * FUITE COLMATÉE (26/07/2026) — l'allemand disait « lauf weiter », impératif
   * de `laufen` : « COURS ». Là où fr/en/es/pt encouragent sans nommer d'effort
   * (continue / keep going / sigue / continue), la pill ordonnait de COURIR à
   * un cycliste dont le GPS faiblit — sur l'écran qu'il regarde toute sa
   * sortie. Une seule langue sur cinq était fautive : on la neutralise ELLE,
   * on ne fabrique pas quatre jumeaux identiques aux quatre déjà justes.
   * « mach weiter » = continue, sans discipline.
   */
  signalWeak: {
    fr: 'GPS faible — continue, le signal revient',
    en: 'Weak GPS — keep going, the signal will return',
    es: 'GPS débil — sigue, la señal vuelve',
    de: 'GPS schwach — mach weiter, das Signal kommt zurück',
    pt: 'GPS fraco — continue, o sinal volta',
  },

  // ── Bandeau position exacte ──────────────────────────────────────────────
  preciseBanner: {
    fr: 'Active la position exacte pour capturer tes zones.',
    en: 'Turn on precise location to capture your zones.',
    es: 'Activa la ubicación exacta para capturar tus zonas.',
    de: 'Aktiviere den genauen Standort, um Zonen zu erobern.',
    pt: 'Ative a localização exata para capturar suas zonas.',
  },
  /**
   * Même bandeau, plateforme sans réglages de position (navigateur). Sur un
   * ordinateur la position vient souvent du wifi (> 100 m) : au-delà du seuil
   * moteur les points sont REJETÉS et la distance reste à 0. On le dit — mieux
   * vaut zéro mètre honnête que des mètres inventés par triangulation.
   */
  preciseBannerBrowser: {
    fr: 'Position trop imprécise ici : rien n’est mesuré. Un téléphone avec GPS le fera.',
    en: 'Location too imprecise here: nothing is measured. A phone with GPS will do it.',
    es: 'Ubicación demasiado imprecisa aquí: no se mide nada. Un teléfono con GPS sí podrá.',
    de: 'Standort hier zu ungenau: nichts wird gemessen. Ein Handy mit GPS schafft das.',
    pt: 'Localização imprecisa demais aqui: nada é medido. Um telefone com GPS consegue.',
  },
  a11yOpenLocationSettings: {
    fr: 'Ouvrir les réglages de position',
    en: 'Open location settings',
    es: 'Abrir los ajustes de ubicación',
    de: 'Standort-Einstellungen öffnen',
    pt: 'Abrir os ajustes de localização',
  },
  // §A : bouton de chip — « EINSTELLUNGEN » déborderait, l'allemand dit ÖFFNEN.
  btnSettings: {
    fr: 'RÉGLAGES',
    en: 'SETTINGS',
    es: 'AJUSTES',
    de: 'ÖFFNEN',
    pt: 'AJUSTES',
  },

  // ── Carte rationale arrière-plan + sheet d'aide (titre partagé) ──────────
  bgTitle: {
    fr: 'COURIR ÉCRAN ÉTEINT',
    en: 'RUN SCREEN OFF',
    es: 'CORRER SIN PANTALLA',
    de: 'LAUFEN MIT BILDSCHIRM AUS',
    pt: 'CORRER COM TELA DESLIGADA',
  },
  bgText: {
    fr: 'Autorise la position en arrière-plan pour que ta course continue écran verrouillé.',
    en: 'Allow background location so your run keeps going with the screen locked.',
    es: 'Permite la ubicación en segundo plano para que tu carrera siga con la pantalla bloqueada.',
    de: 'Erlaube Standort im Hintergrund, damit dein Lauf bei gesperrtem Bildschirm weiterläuft.',
    pt: 'Permita a localização em segundo plano para sua corrida continuar com a tela bloqueada.',
  },
  /**
   * Le VERBE change, pas seulement le nom : on ne « court » pas à vélo. Ce
   * titre est partagé par la carte de rationale (pendant la sortie) et par la
   * feuille d'aide par constructeur — les deux la rendent sur une sortie qui
   * peut être un vélo, donc les deux lisent la même table.
   */
  bgTitleBike: {
    fr: 'ROULER ÉCRAN ÉTEINT',
    en: 'RIDE SCREEN OFF',
    es: 'PEDALEAR SIN PANTALLA',
    de: 'FAHREN MIT BILDSCHIRM AUS',
    pt: 'PEDALAR COM TELA DESLIGADA',
  },
  bgTextBike: {
    fr: 'Autorise la position en arrière-plan pour que ta sortie continue écran verrouillé.',
    en: 'Allow background location so your ride keeps going with the screen locked.',
    es: 'Permite la ubicación en segundo plano para que tu salida siga con la pantalla bloqueada.',
    de: 'Erlaube Standort im Hintergrund, damit deine Fahrt bei gesperrtem Bildschirm weiterläuft.',
    pt: 'Permita a localização em segundo plano para seu percurso continuar com a tela bloqueada.',
  },
  btnAllow: {
    fr: 'AUTORISER',
    en: 'ALLOW',
    es: 'PERMITIR',
    de: 'ERLAUBEN',
    pt: 'PERMITIR',
  },
  a11yAllowBackground: {
    fr: 'Autoriser la position en arrière-plan',
    en: 'Allow background location',
    es: 'Permitir la ubicación en segundo plano',
    de: 'Standort im Hintergrund erlauben',
    pt: 'Permitir a localização em segundo plano',
  },
  btnLater: {
    fr: 'PLUS TARD',
    en: 'LATER',
    es: 'LUEGO',
    de: 'SPÄTER',
    pt: 'DEPOIS',
  },
  a11yLater: {
    fr: 'Plus tard',
    en: 'Later',
    es: 'Luego',
    de: 'Später',
    pt: 'Depois',
  },

  // ── Reprise après kill process ───────────────────────────────────────────
  restoreTitle: {
    fr: 'COURSE INTERROMPUE RETROUVÉE',
    en: 'INTERRUPTED RUN RECOVERED',
    es: 'CARRERA INTERRUMPIDA RECUPERADA',
    de: 'UNTERBROCHENER LAUF GEFUNDEN',
    pt: 'CORRIDA INTERROMPIDA RECUPERADA',
  },
  /**
   * LA BRANCHE FUSIONNABLE — c'est-à-dire EXACTEMENT le cas du cycliste qui
   * retrouve SA propre sortie. Elle affichait « COURSE INTERROMPUE RETROUVÉE »
   * alors que la branche non fusionnable (juste dessous) avait déjà été
   * neutralisée : le passage à deux disciplines avait été fait à moitié.
   *
   * Le titre NOMME ici la discipline (« À VÉLO ») au lieu de se contenter du
   * neutre : dans cette branche elle est connue avec certitude — la sortie
   * retrouvée est de la MÊME discipline que celle qui vient de partir — et le
   * corps du message, lui, ne la répète pas.
   */
  restoreTitleBike: {
    fr: 'SORTIE À VÉLO INTERROMPUE RETROUVÉE',
    en: 'INTERRUPTED RIDE RECOVERED',
    es: 'SALIDA EN BICI INTERRUMPIDA RECUPERADA',
    de: 'UNTERBROCHENE FAHRT GEFUNDEN',
    pt: 'PERCURSO INTERROMPIDO RECUPERADO',
  },
  restoreQuestion: {
    fr: '{distance} — reprendre ou enregistrer telle quelle ?',
    en: '{distance} — resume or save as is?',
    es: '{distance} — ¿reanudar o guardar tal cual?',
    de: '{distance} — fortsetzen oder so speichern?',
    pt: '{distance} — retomar ou salvar como está?',
  },
  /**
   * DEUX MONDES NE FUSIONNENT PAS (E14, séparation stricte). La sortie
   * interrompue n'est pas de la même discipline que celle qui vient de partir :
   * « Reprendre » fusionnerait des kilomètres de course dans une sortie vélo
   * (ou l'inverse). L'action est RETIRÉE — jamais peinte pour échouer — et on
   * DIT pourquoi, sinon un bouton disparu se lit comme un bug. Rien n'est
   * perdu : la sortie part telle quelle, dans SON monde.
   * Titre volontairement NEUTRE : « COURSE INTERROMPUE » serait faux pour une
   * sortie vélo retrouvée.
   */
  restoreTitleOtherActivity: {
    fr: 'SORTIE INTERROMPUE RETROUVÉE',
    en: 'INTERRUPTED OUTING RECOVERED',
    es: 'SALIDA INTERRUMPIDA RECUPERADA',
    de: 'UNTERBROCHENE AKTIVITÄT GEFUNDEN',
    pt: 'ATIVIDADE INTERROMPIDA RECUPERADA',
  },
  restoreOtherActivityBody: {
    fr: '{distance} en {name}. Une sortie d’une autre discipline ne se fusionne pas avec celle-ci — enregistre-la telle quelle.',
    en: '{distance} of {name}. An outing from another discipline cannot be merged into this one — save it as is.',
    es: '{distance} de {name}. Una salida de otra disciplina no se fusiona con esta: guárdala tal cual.',
    de: '{distance} beim {name}. Eine Aktivität einer anderen Disziplin lässt sich nicht mit dieser zusammenführen — speichere sie unverändert.',
    pt: '{distance} de {name}. Uma atividade de outra modalidade não se funde com esta — salve-a como está.',
  },
  btnResume: {
    fr: 'REPRENDRE',
    en: 'RESUME',
    es: 'REANUDAR',
    de: 'WEITER',
    pt: 'RETOMAR',
  },
  a11yResumeInterrupted: {
    fr: 'Reprendre la course interrompue',
    en: 'Resume the interrupted run',
    es: 'Reanudar la carrera interrumpida',
    de: 'Unterbrochenen Lauf fortsetzen',
    pt: 'Retomar a corrida interrompida',
  },
  a11yResumeInterruptedBike: {
    fr: 'Reprendre la sortie interrompue',
    en: 'Resume the interrupted ride',
    es: 'Reanudar la salida interrumpida',
    de: 'Unterbrochene Fahrt fortsetzen',
    pt: 'Retomar o percurso interrompido',
  },
  btnSave: {
    fr: 'ENREGISTRER',
    en: 'SAVE',
    es: 'GUARDAR',
    de: 'SPEICHERN',
    pt: 'SALVAR',
  },
  a11ySaveInterrupted: {
    fr: 'Enregistrer la course interrompue telle quelle',
    en: 'Save the interrupted run as is',
    es: 'Guardar la carrera interrumpida tal cual',
    de: 'Unterbrochenen Lauf unverändert speichern',
    pt: 'Salvar a corrida interrompida como está',
  },
  /**
   * Rendu dans les DEUX branches de la carte de reprise — y compris la non
   * fusionnable, où la discipline de la sortie retrouvée est connue elle aussi
   * (elle est justement ce qui interdit la fusion). Le twin suit donc la
   * discipline de la sortie RETROUVÉE, jamais celle qui vient de démarrer.
   */
  a11ySaveInterruptedBike: {
    fr: 'Enregistrer la sortie interrompue telle quelle',
    en: 'Save the interrupted ride as is',
    es: 'Guardar la salida interrumpida tal cual',
    de: 'Unterbrochene Fahrt unverändert speichern',
    pt: 'Salvar o percurso interrompido como está',
  },

  // ── Sheet « Courir écran éteint » ────────────────────────────────────────
  a11yCloseHelp: {
    fr: 'Fermer l’aide',
    en: 'Close help',
    es: 'Cerrar la ayuda',
    de: 'Hilfe schließen',
    pt: 'Fechar a ajuda',
  },
  helpIntro: {
    fr: 'Certains téléphones coupent le GPS en fond pour économiser la batterie. Deux minutes de réglages et ta trace ne s’arrête plus.',
    en: 'Some phones kill background GPS to save battery. Two minutes of settings and your trace never stops again.',
    es: 'Algunos teléfonos cortan el GPS en segundo plano para ahorrar batería. Dos minutos de ajustes y tu trazado ya no se corta.',
    de: 'Manche Handys stoppen GPS im Hintergrund, um Akku zu sparen. Zwei Minuten Einstellungen und deine Spur reißt nicht mehr ab.',
    pt: 'Alguns celulares cortam o GPS em segundo plano para economizar bateria. Dois minutos de ajustes e seu trajeto não para mais.',
  },
  helpYourPhone: {
    fr: 'TON TÉLÉPHONE',
    en: 'YOUR PHONE',
    es: 'TU TELÉFONO',
    de: 'DEIN HANDY',
    pt: 'SEU CELULAR',
  },
  btnOpenGrydSettings: {
    fr: 'OUVRIR LES RÉGLAGES DE GRYD',
    en: 'OPEN GRYD SETTINGS',
    es: 'ABRIR AJUSTES DE GRYD',
    de: 'GRYD-EINSTELLUNGEN ÖFFNEN',
    pt: 'ABRIR AJUSTES DO GRYD',
  },
  a11yOpenGrydSettings: {
    fr: 'Ouvrir les réglages de GRYD',
    en: 'Open GRYD settings',
    es: 'Abrir los ajustes de GRYD',
    de: 'GRYD-Einstellungen öffnen',
    pt: 'Abrir os ajustes do GRYD',
  },

  // ── Aide par constructeur (deviceHelp) ───────────────────────────────────
  // Noms de MARQUES : invariants (identiques dans les 5 langues — ne pas
  // « traduire »), présents ici uniquement pour l'uniformité du type Entry.
  vendorSamsung: {
    fr: 'Samsung',
    en: 'Samsung',
    es: 'Samsung',
    de: 'Samsung',
    pt: 'Samsung',
  },
  vendorXiaomi: {
    fr: 'Xiaomi / Redmi / POCO',
    en: 'Xiaomi / Redmi / POCO',
    es: 'Xiaomi / Redmi / POCO',
    de: 'Xiaomi / Redmi / POCO',
    pt: 'Xiaomi / Redmi / POCO',
  },
  vendorHuawei: {
    fr: 'Huawei / Honor',
    en: 'Huawei / Honor',
    es: 'Huawei / Honor',
    de: 'Huawei / Honor',
    pt: 'Huawei / Honor',
  },
  vendorOneplus: {
    fr: 'OnePlus / Oppo / realme',
    en: 'OnePlus / Oppo / realme',
    es: 'OnePlus / Oppo / realme',
    de: 'OnePlus / Oppo / realme',
    pt: 'OnePlus / Oppo / realme',
  },
  vendorOtherAndroid: {
    fr: 'Autres Android',
    en: 'Other Android',
    es: 'Otros Android',
    de: 'Andere Android',
    pt: 'Outros Android',
  },

  helpSamsung1: {
    fr: 'Paramètres → Batterie → Limites d’utilisation en arrière-plan.',
    en: 'Settings → Battery → Background usage limits.',
    es: 'Ajustes → Batería → Límites de uso en segundo plano.',
    de: 'Einstellungen → Akku → Nutzungslimits im Hintergrund.',
    pt: 'Configurações → Bateria → Limites de uso em segundo plano.',
  },
  helpSamsung2: {
    fr: 'Retire GRYD des « Applis en veille prolongée ».',
    en: 'Remove GRYD from “Deep sleeping apps”.',
    es: 'Saca GRYD de «Aplicaciones en suspensión profunda».',
    de: 'Entferne GRYD aus „Apps in tiefem Standby“.',
    pt: 'Tire o GRYD de “Apps em suspensão profunda”.',
  },
  helpSamsung3: {
    fr: 'Paramètres → Applications → GRYD → Batterie → « Non restreinte ».',
    en: 'Settings → Apps → GRYD → Battery → “Unrestricted”.',
    es: 'Ajustes → Aplicaciones → GRYD → Batería → «Sin restricciones».',
    de: 'Einstellungen → Apps → GRYD → Akku → „Nicht eingeschränkt“.',
    pt: 'Configurações → Apps → GRYD → Bateria → “Irrestrito”.',
  },
  helpXiaomi1: {
    fr: 'Paramètres → Applications → GRYD → Autorisations → active « Démarrage automatique ».',
    en: 'Settings → Apps → GRYD → Permissions → enable “Autostart”.',
    es: 'Ajustes → Aplicaciones → GRYD → Permisos → activa «Inicio automático».',
    de: 'Einstellungen → Apps → GRYD → Berechtigungen → „Autostart“ aktivieren.',
    pt: 'Configurações → Apps → GRYD → Permissões → ative “Início automático”.',
  },
  helpXiaomi2: {
    fr: 'Paramètres → Batterie → Économiseur → GRYD → « Aucune restriction ».',
    en: 'Settings → Battery → Battery saver → GRYD → “No restrictions”.',
    es: 'Ajustes → Batería → Ahorro → GRYD → «Sin restricciones».',
    de: 'Einstellungen → Akku → Energiesparen → GRYD → „Keine Einschränkung“.',
    pt: 'Configurações → Bateria → Economia → GRYD → “Sem restrições”.',
  },
  helpHuawei1: {
    fr: 'Paramètres → Batterie → Lancement d’applications.',
    en: 'Settings → Battery → App launch.',
    es: 'Ajustes → Batería → Inicio de aplicaciones.',
    de: 'Einstellungen → Akku → App-Start.',
    pt: 'Configurações → Bateria → Início de apps.',
  },
  helpHuawei2: {
    fr: 'GRYD → « Gérer manuellement » → active les trois options.',
    en: 'GRYD → “Manage manually” → enable all three options.',
    es: 'GRYD → «Gestionar manualmente» → activa las tres opciones.',
    de: 'GRYD → „Manuell verwalten“ → alle drei Optionen aktivieren.',
    pt: 'GRYD → “Gerenciar manualmente” → ative as três opções.',
  },
  helpOneplus1: {
    fr: 'Paramètres → Batterie → Optimisation de la batterie.',
    en: 'Settings → Battery → Battery optimization.',
    es: 'Ajustes → Batería → Optimización de batería.',
    de: 'Einstellungen → Akku → Akku-Optimierung.',
    pt: 'Configurações → Bateria → Otimização de bateria.',
  },
  helpOneplus2: {
    fr: 'GRYD → « Ne pas optimiser ».',
    en: 'GRYD → “Don’t optimize”.',
    es: 'GRYD → «No optimizar».',
    de: 'GRYD → „Nicht optimieren“.',
    pt: 'GRYD → “Não otimizar”.',
  },
  helpAndroid1: {
    fr: 'Paramètres → Batterie → Optimisation de la batterie → GRYD → « Ne pas optimiser ».',
    en: 'Settings → Battery → Battery optimization → GRYD → “Don’t optimize”.',
    es: 'Ajustes → Batería → Optimización de batería → GRYD → «No optimizar».',
    de: 'Einstellungen → Akku → Akku-Optimierung → GRYD → „Nicht optimieren“.',
    pt: 'Configurações → Bateria → Otimização de bateria → GRYD → “Não otimizar”.',
  },
  helpAndroid2: {
    fr: 'Autorise la position « Toujours » dans Paramètres → Applications → GRYD.',
    en: 'Allow location “Always” in Settings → Apps → GRYD.',
    es: 'Permite la ubicación «Siempre» en Ajustes → Aplicaciones → GRYD.',
    de: 'Erlaube Standort „Immer“ unter Einstellungen → Apps → GRYD.',
    pt: 'Permita a localização “Sempre” em Configurações → Apps → GRYD.',
  },
  helpIos1: {
    fr: 'Réglages → GRYD → Position → « Toujours ».',
    en: 'Settings → GRYD → Location → “Always”.',
    es: 'Ajustes → GRYD → Ubicación → «Siempre».',
    de: 'Einstellungen → GRYD → Standort → „Immer“.',
    pt: 'Ajustes → GRYD → Localização → “Sempre”.',
  },
  helpIos2: {
    fr: 'Active « Position exacte » (sinon le GPS est volontairement flou).',
    en: 'Turn on “Precise Location” (otherwise GPS is deliberately fuzzy).',
    es: 'Activa «Ubicación exacta» (si no, el GPS es impreciso a propósito).',
    de: 'Aktiviere „Genauer Standort“ (sonst ist das GPS absichtlich ungenau).',
    pt: 'Ative “Localização Exata” (senão o GPS fica impreciso de propósito).',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // E23 — « ANNULER L'ACTIVITÉ » (spec produit l.1189-1197), 28/07/2026.
  //
  // CE QUI EXISTAIT DÉJÀ, ET N'EST PAS REFAIT : « Reprendre » (`ctrlResume`,
  // `btnResume`) et « Terminer » (`ctrlFinish`) sont là depuis E07 ; la
  // confirmation « trop courte pour produire un résultat » est la feuille E26
  // (`catalog/finActivite.ts` : `tooShortTitle` / `tooShortBody` /
  // `tooShortConfirm` / `tooShortCancel`), qui lit déjà
  // `activityProducesResult()`. La spec le dit d'ailleurs mot pour mot :
  // « TERMINER demande confirmation UNIQUEMENT si l'activité est trop courte ».
  //
  // NE MANQUAIT QUE LA TROISIÈME ACTION, et c'est la seule IRRÉVERSIBLE : elle
  // supprime la trace locale. La spec exige que la copie le PRÉCISE (l.1197) —
  // c'est le seul endroit du produit où un geste détruit une mesure d'effort.
  //
  // VOCABULAIRE NEUTRE, ASSUMÉ (pas de jumelle vélo) : ces phrases ne nomment
  // aucun effort — même arbitrage que « EN PAUSE », « RECHERCHE GPS… » et
  // « TERMINER », qui sont partagés (cf. le docblock de RUN_GPS_COPY plus bas).
  // Fabriquer quatre jumelles identiques créerait deux vérités à maintenir.
  // ══════════════════════════════════════════════════════════════════════════
  /** Libellé du 3ᵉ geste, visible seulement en PAUSE. §A : deux mots max. */
  ctrlCancel: {
    fr: 'Annuler',
    en: 'Discard',
    es: 'Descartar',
    de: 'Verwerfen',
    pt: 'Descartar',
  },
  /** Titre de la confirmation. Une question, jamais un ordre. */
  cancelTitle: {
    fr: 'Supprimer cette sortie ?',
    en: 'Delete this activity?',
    es: '¿Eliminar esta salida?',
    de: 'Diese Aktivität löschen?',
    pt: 'Excluir esta atividade?',
  },
  /**
   * LA PHRASE QUE LA SPEC EXIGE (l.1197). Elle dit ce qui disparaît (la trace
   * enregistrée sur l'appareil) et ce que ça implique (rien ne partira au
   * serveur, donc aucun territoire). « Définitivement » est le mot juste :
   * `discardStored` efface le tampon, il n'y a pas de corbeille.
   */
  cancelBody: {
    fr: 'La trace enregistrée sur ton téléphone sera supprimée définitivement. Rien ne sera envoyé, aucun territoire ne sera compté.',
    en: 'The trace recorded on your phone will be deleted for good. Nothing will be sent, and no territory will count.',
    es: 'El recorrido guardado en tu teléfono se eliminará definitivamente. No se enviará nada y ningún territorio contará.',
    de: 'Die auf deinem Handy gespeicherte Spur wird endgültig gelöscht. Es wird nichts gesendet, kein Gebiet zählt.',
    pt: 'O trajeto gravado no seu telefone será excluído para sempre. Nada será enviado e nenhum território vai contar.',
  },
  /**
   * MÊME QUESTION, QUAND LA SORTIE COMPTE DÉJÀ (`activityProducesResult()` vaut
   * `true`). Ce n'est pas la même décision : jeter une sortie de 40 s et jeter
   * une sortie qui aurait pris du territoire ne se valent pas, et l'écran doit
   * dire laquelle des deux on est en train de faire.
   */
  cancelBodyWouldCount: {
    fr: 'Cette sortie compte déjà : elle pourrait prendre du territoire. Sa trace sera supprimée définitivement.',
    en: 'This activity already counts: it could take territory. Its trace will be deleted for good.',
    es: 'Esta salida ya cuenta: podría tomar territorio. Su recorrido se eliminará definitivamente.',
    de: 'Diese Aktivität zählt bereits: Sie könnte Gebiet erobern. Ihre Spur wird endgültig gelöscht.',
    pt: 'Esta atividade já conta: ela poderia tomar território. O trajeto será excluído para sempre.',
  },
  /** Le geste destructeur, NOMMÉ (jamais « OK » — on n'accepte pas un vide). */
  cancelConfirm: {
    fr: 'Supprimer',
    en: 'Delete',
    es: 'Eliminar',
    de: 'Löschen',
    pt: 'Excluir',
  },
  /** La sortie de secours, et c'est elle qui doit être la plus facile à taper. */
  cancelKeep: {
    fr: 'Garder ma sortie',
    en: 'Keep my activity',
    es: 'Conservar mi salida',
    de: 'Aktivität behalten',
    pt: 'Manter minha atividade',
  },
  a11yCancelActivity: {
    fr: 'Annuler et supprimer la sortie en cours',
    en: 'Discard and delete the current activity',
    es: 'Descartar y eliminar la salida en curso',
    de: 'Laufende Aktivität verwerfen und löschen',
    pt: 'Descartar e excluir a atividade em andamento',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // E24 — GPS FAIBLE / ACTIVITÉ EN RÉCUPÉRATION (spec produit l.1201-1215),
  // 28/07/2026. « Aucune perte silencieuse » (l.1215) : chaque cas de la spec
  // doit avoir une PHRASE, sans quoi le silence EST la perte.
  //
  // TROIS DES CINQ CAS ÉTAIENT DÉJÀ ÉCRITS, et ne sont pas refaits :
  //   · GPS faible          → `signalWeak` (« continue, le signal revient ») ;
  //   · permission révoquée → `signalRevoked` (« GPS coupé — réactive… ») ;
  //   · app tuée            → `restoreTitle` / `restoreQuestion` / `btnResume` /
  //                           `btnSave`, plus la branche « autre discipline »
  //                           (`restoreTitleOtherActivity`).
  // Les DEUX qui manquaient sont ci-dessous. Ce sont exactement les deux où
  // l'app continue de fonctionner alors que quelque chose a échoué — donc les
  // deux où le silence serait le plus facile, et le plus coûteux.
  // ══════════════════════════════════════════════════════════════════════════
  /**
   * RÉSEAU ABSENT (spec l.1212 : « file d'attente locale »). Dit la seule chose
   * qui inquiète vraiment — « est-ce que je perds ma sortie ? » — et rien de
   * plus. Ne promet AUCUN délai d'envoi : personne ne sait quand le réseau
   * revient, et une promesse de minutes serait invérifiable.
   *
   * NE PROMET PAS NON PLUS LE TERRITOIRE : l'envoi n'est pas le verdict. Le
   * serveur reste seul juge, et il jugera quand la sortie lui parviendra.
   */
  offlineQueuedNote: {
    fr: 'Hors ligne — ta sortie est gardée sur le téléphone et partira au retour du réseau.',
    en: 'Offline — your activity is kept on the phone and will upload when the network is back.',
    es: 'Sin conexión: tu salida se guarda en el teléfono y se enviará al volver la red.',
    de: 'Offline — deine Aktivität bleibt auf dem Handy und geht raus, sobald das Netz da ist.',
    pt: 'Offline — sua atividade fica guardada no telefone e sobe quando a rede voltar.',
  },
  /**
   * CAPTEUR INCOHÉRENT (spec l.1213 : « activité continue mais passe en
   * analyse »). La phrase la plus délicate du lot : elle doit prévenir sans
   * accuser. GRYD ne dit donc PAS « trajet suspect » — le joueur n'a rien fait
   * de mal dans l'immense majorité des cas (téléphone en poche, tunnel, vélo
   * dans un train). Elle nomme le FAIT (des points ne collent pas) et la
   * CONSÉQUENCE (le verdict prendra un peu plus de temps), rien d'autre.
   */
  sensorInconsistentNote: {
    fr: 'Des points ne collent pas au reste — ta sortie continue, le verdict sera vérifié à l’arrivée.',
    en: 'Some points don’t match the rest — your activity continues, the verdict gets checked at the finish.',
    es: 'Algunos puntos no encajan con el resto: tu salida continúa, el veredicto se revisará al llegar.',
    de: 'Einige Punkte passen nicht zum Rest — deine Aktivität läuft weiter, das Urteil wird am Ziel geprüft.',
    pt: 'Alguns pontos não batem com o resto — sua atividade continua, o veredito será conferido na chegada.',
  },
});

/**
 * NOM DE LA DISCIPLINE, indexé par `Activity` — source UNIQUE pour tous les
 * écrans du départ et de la course (préflight E06, pill live E07, carte de
 * reprise). Le `Record<Activity, Entry>` n'est pas décoratif : le jour où une
 * troisième discipline apparaît, le compilateur exige sa phrase au lieu de la
 * laisser sortir en anglais ou en blanc.
 */
export const ACTIVITY_NAME: Readonly<Record<Activity, Entry>> = {
  run: C.activityNameRun,
  bike: C.activityNameBike,
};

/**
 * ─── TOUT CE QUE L'ÉCRAN DE COURSE DIT DE L'EFFORT, PAR DISCIPLINE ──────────
 *
 * Pourquoi une TABLE plutôt qu'une poignée de `activity === 'bike' ? … : …`
 * dispersés dans le JSX : c'est exactement par là que le passage au vélo s'est
 * fait à moitié. Deux états avaient leur twin (`statusRidingBike`,
 * `statusFinishedBike`), quatorze autres surfaces du même écran ne l'avaient
 * pas, et rien dans le code ne pouvait le signaler — un ternaire manquant ne
 * ressemble à rien. Ici, le `Record<Activity, …>` est EXHAUSTIF : le jour où
 * `ACTIVITIES` accueille une troisième discipline, ce fichier ne compile plus
 * tant que quelqu'un n'a pas écrit ses phrases. (Même patron que
 * `RESULT_COPY` dans `catalog/result.ts` et que `EFFORT_RATE_KIND` dans
 * `features/run/effortRate.ts`.)
 *
 * Ce qui N'EST PAS ici est aussi délibéré : « EN PAUSE », « RECHERCHE GPS… »,
 * « TERMINER », « PAUSE », « BOUCLE FERMÉE », les phrases de signal GPS et
 * l'aide par constructeur ne nomment aucune discipline. Les dupliquer à
 * l'identique créerait deux vérités à maintenir pour zéro information.
 */
export interface RunGpsActivityCopy {
  /** Pill d'état pendant l'effort (« EN COURSE » / « EN SORTIE »). */
  readonly status: Entry;
  /** Pill d'état une fois l'effort terminé. */
  readonly statusFinished: Entry;
  /** Limite « enregistré app ouverte » (permission « Toujours » manquante). */
  readonly foregroundOnly: Entry;
  /** Titre de la carte de reprise, branche FUSIONNABLE. */
  readonly restoreTitle: Entry;
  readonly a11yResumeInterrupted: Entry;
  readonly a11ySaveInterrupted: Entry;
  /** Titre partagé : carte de rationale arrière-plan + feuille d'aide. */
  readonly bgTitle: Entry;
  readonly bgText: Entry;
  readonly a11yGpsHelp: Entry;
  readonly a11yLiveMap: Entry;
  readonly a11yFinishRun: Entry;
  readonly a11yPauseRun: Entry;
  readonly a11yResumeRun: Entry;
  readonly a11yClosureBadge: Entry;
  /**
   * Libellé de la 3ᵉ métrique du bandeau. Il change de GRANDEUR, pas seulement
   * de mot : allure à pied, vitesse à vélo — la même grandeur que le Résultat
   * annonce à l'arrivée (`features/run/effortRate.ts`).
   */
  readonly rateLabel: Entry;
}

export const RUN_GPS_COPY: Readonly<Record<Activity, RunGpsActivityCopy>> = {
  run: {
    status: C.statusRunning,
    statusFinished: C.statusFinished,
    foregroundOnly: C.foregroundOnly,
    restoreTitle: C.restoreTitle,
    a11yResumeInterrupted: C.a11yResumeInterrupted,
    a11ySaveInterrupted: C.a11ySaveInterrupted,
    bgTitle: C.bgTitle,
    bgText: C.bgText,
    a11yGpsHelp: C.a11yGpsHelp,
    a11yLiveMap: C.a11yLiveMap,
    a11yFinishRun: C.a11yFinishRun,
    a11yPauseRun: C.a11yPauseRun,
    a11yResumeRun: C.a11yResumeRun,
    a11yClosureBadge: C.a11yClosureBadge,
    rateLabel: C.paceLabel,
  },
  bike: {
    status: C.statusRidingBike,
    statusFinished: C.statusFinishedBike,
    foregroundOnly: C.foregroundOnlyBike,
    restoreTitle: C.restoreTitleBike,
    a11yResumeInterrupted: C.a11yResumeInterruptedBike,
    a11ySaveInterrupted: C.a11ySaveInterruptedBike,
    bgTitle: C.bgTitleBike,
    bgText: C.bgTextBike,
    a11yGpsHelp: C.a11yGpsHelpBike,
    a11yLiveMap: C.a11yLiveMapBike,
    a11yFinishRun: C.a11yFinishRunBike,
    a11yPauseRun: C.a11yPauseRunBike,
    a11yResumeRun: C.a11yResumeRunBike,
    a11yClosureBadge: C.a11yClosureBadgeBike,
    rateLabel: C.speedLabel,
  },
};
