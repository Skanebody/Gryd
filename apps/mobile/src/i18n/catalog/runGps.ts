/**
 * GRYD — i18n : catalogue du domaine « run-gps » (course live réelle,
 * états GPS, aide « Courir écran éteint » par constructeur).
 * Parité 5 langues imposée par le type Entry — une langue manquante = erreur TS.
 *
 * Invariants JAMAIS traduits (restent en dur dans les composants) :
 * GRYD, GRYD VERIFIED, GPS TRUST, KM, iPhone, noms de constructeurs.
 * §A : libellés de boutons/chips COURTS dans les 5 langues (jamais tronqués).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
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
  loopReady: {
    fr: 'BOUCLE PRÊTE — termine quand tu veux',
    en: 'LOOP READY — finish whenever you want',
    es: 'BUCLE LISTO — termina cuando quieras',
    de: 'RUNDE BEREIT — beende, wann du willst',
    pt: 'VOLTA PRONTA — termine quando quiser',
  },
  loopReturn: {
    fr: 'BOUCLE · retour ~{m} m',
    en: 'LOOP · back ~{m} m',
    es: 'BUCLE · retorno ~{m} m',
    de: 'RUNDE · zurück ~{m} m',
    pt: 'VOLTA · retorno ~{m} m',
  },
  paceLabel: {
    fr: 'ALLURE /KM',
    en: 'PACE /KM',
    es: 'RITMO /KM',
    de: 'PACE /KM',
    pt: 'PACE /KM',
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
  a11yGpsHelp: {
    fr: 'Aide GPS : courir écran éteint',
    en: 'GPS help: run with the screen off',
    es: 'Ayuda GPS: correr con la pantalla apagada',
    de: 'GPS-Hilfe: mit Bildschirm aus laufen',
    pt: 'Ajuda GPS: correr com a tela desligada',
  },
  a11yLiveTrace: {
    fr: 'Ton tracé en cours',
    en: 'Your route so far',
    es: 'Tu recorrido hasta ahora',
    de: 'Deine bisherige Strecke',
    pt: 'Seu percurso até agora',
  },
  a11yFinishRun: {
    fr: 'Terminer la course (maintenir)',
    en: 'Finish the run (hold)',
    es: 'Terminar la carrera (mantén pulsado)',
    de: 'Lauf beenden (gedrückt halten)',
    pt: 'Terminar a corrida (segure)',
  },

  // ── Pill signal GPS (informatif, jamais bloquant, anti-shame) ────────────
  signalRevoked: {
    fr: 'GPS coupé — réactive la position dans Réglages',
    en: 'GPS off — re-enable location in Settings',
    es: 'GPS desactivado — reactiva la ubicación en Ajustes',
    de: 'GPS aus — Standort in den Einstellungen aktivieren',
    pt: 'GPS desligado — reative a localização em Ajustes',
  },
  signalLost: {
    fr: 'Signal perdu — on continue, rien n’est compté à tort',
    en: 'Signal lost — still tracking, nothing counted wrongly',
    es: 'Señal perdida — seguimos, nada se cuenta mal',
    de: 'Signal verloren — läuft weiter, nichts wird falsch gezählt',
    pt: 'Sinal perdido — seguimos, nada é contado errado',
  },
  signalWeak: {
    fr: 'GPS faible — continue, le signal revient',
    en: 'Weak GPS — keep going, the signal will return',
    es: 'GPS débil — sigue, la señal vuelve',
    de: 'GPS schwach — lauf weiter, das Signal kommt zurück',
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
  restoreQuestion: {
    fr: '{distance} — reprendre ou enregistrer telle quelle ?',
    en: '{distance} — resume or save as is?',
    es: '{distance} — ¿reanudar o guardar tal cual?',
    de: '{distance} — fortsetzen oder so speichern?',
    pt: '{distance} — retomar ou salvar como está?',
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
});
