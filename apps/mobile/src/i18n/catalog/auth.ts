/**
 * GRYD — i18n : catalogue du domaine AUTH-SOURCES.
 *
 * Couvre l'écran promesse + sign-in (app/(auth)/sign-in.tsx — SPEC §4.1) et le
 * GRYD Verify Hub (app/sources.tsx — AMENDEMENT-10 §6, AMENDEMENT-15 §3).
 *
 * Règles : tutoiement fr / « du » de / « tú » es / « você » pt informel ;
 * invariants jamais traduits (GRYD, GRYD Verify Hub, Crew, Apple, Google,
 * Strava, noms de villes) ; chips/CTA COURTS dans TOUTES les langues (§A :
 * jamais tronqué à 375 px — l'allemand préfère une reformulation concise) ;
 * kickers en MAJUSCULES ; mêmes {placeholders} partout.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Sign-in : promesse (hero) ─────────────────────────────────────────────
  kicker: {
    fr: 'SAISON 0 · PARIS & LILLE',
    en: 'SEASON 0 · PARIS & LILLE',
    es: 'TEMPORADA 0 · PARIS & LILLE',
    de: 'SAISON 0 · PARIS & LILLE',
    pt: 'TEMPORADA 0 · PARIS & LILLE',
  },
  title: {
    fr: 'Cours pour ton crew.\nConquiers ta ville.',
    en: 'Run for your crew.\nConquer your city.',
    es: 'Corre por tu crew.\nConquista tu ciudad.',
    de: 'Lauf für deine Crew.\nErobere deine Stadt.',
    pt: 'Corra pelo seu crew.\nConquiste sua cidade.',
  },
  subtitle: {
    fr: 'Chaque course capture des zones sur la carte réelle de ta ville. Ton crew tient le quartier — ou le perd.',
    en: 'Every run captures zones on the real map of your city. Your crew holds the neighborhood — or loses it.',
    es: 'Cada carrera captura zonas en el mapa real de tu ciudad. Tu crew domina el barrio, o lo pierde.',
    de: 'Jeder Lauf erobert Zonen auf der echten Karte deiner Stadt. Deine Crew hält das Viertel — oder verliert es.',
    pt: 'Cada corrida captura zonas no mapa real da sua cidade. Seu crew segura o bairro — ou o perde.',
  },

  // ─── Sign-in : boutons d'accès ─────────────────────────────────────────────
  googleCta: {
    fr: 'Continuer avec Google',
    en: 'Continue with Google',
    es: 'Continuar con Google',
    de: 'Weiter mit Google',
    pt: 'Continuar com Google',
  },
  emailCta: {
    fr: 'Continuer avec un e-mail',
    en: 'Continue with email',
    es: 'Continuar con e-mail',
    de: 'Weiter mit E-Mail',
    pt: 'Continuar com e-mail',
  },

  // ─── Sign-in : filet e-mail OTP (P0 D1) ────────────────────────────────────
  /** accessibilityLabel du champ e-mail (jamais visible à l'écran). */
  emailFieldA11y: {
    fr: 'Adresse e-mail',
    en: 'Email address',
    es: 'Dirección de e-mail',
    de: 'E-Mail-Adresse',
    pt: 'Endereço de e-mail',
  },
  /** Placeholder du champ e-mail — un exemple par langue, même tutoiement. */
  emailPlaceholder: {
    fr: 'ton@email.fr',
    en: 'you@email.com',
    es: 'tu@email.es',
    de: 'du@email.de',
    pt: 'voce@email.com',
  },
  otpRequestCta: {
    fr: 'Recevoir un code',
    en: 'Get a code',
    es: 'Recibir un código',
    de: 'Code erhalten',
    pt: 'Receber um código',
  },
  otpSent: {
    fr: 'Code envoyé à {email}',
    en: 'Code sent to {email}',
    es: 'Código enviado a {email}',
    de: 'Code gesendet an {email}',
    pt: 'Código enviado para {email}',
  },
  /** accessibilityLabel du champ code (jamais visible à l'écran). */
  otpFieldA11y: {
    fr: 'Code reçu par e-mail',
    en: 'Code received by email',
    es: 'Código recibido por e-mail',
    de: 'Per E-Mail erhaltener Code',
    pt: 'Código recebido por e-mail',
  },
  otpVerifyCta: {
    fr: 'Valider le code',
    en: 'Confirm code',
    es: 'Validar código',
    de: 'Code bestätigen',
    pt: 'Validar código',
  },
  otpResendCta: {
    fr: 'Renvoyer le code',
    en: 'Resend code',
    es: 'Reenviar código',
    de: 'Code erneut senden',
    pt: 'Reenviar código',
  },

  // ─── Sign-in : échecs honnêtes (jamais un mur — §4.1) ──────────────────────
  errorGoogleNotConfigured: {
    fr: 'Connexion Google pas encore configurée (O2). Utilise Apple pour l’instant.',
    en: 'Google sign-in isn’t set up yet (O2). Use Apple for now.',
    es: 'El acceso con Google aún no está configurado (O2). Usa Apple por ahora.',
    de: 'Google-Anmeldung ist noch nicht eingerichtet (O2). Nimm vorerst Apple.',
    pt: 'O login com Google ainda não está configurado (O2). Use Apple por enquanto.',
  },
  errorSignInFailed: {
    fr: 'La connexion a échoué. Réessaie — ta course ne se perdra jamais pour ça.',
    en: 'Sign-in failed. Try again — your run will never be lost because of this.',
    es: 'No se pudo iniciar sesión. Reintenta: tu carrera nunca se perderá por esto.',
    de: 'Anmeldung fehlgeschlagen. Versuch es nochmal — dein Lauf geht dadurch nie verloren.',
    pt: 'Não foi possível entrar. Tente de novo — sua corrida nunca vai se perder por isso.',
  },

  // ─── Verify Hub : entête ───────────────────────────────────────────────────
  sourcesKicker: {
    fr: 'VÉRIFICATION',
    en: 'VERIFICATION',
    es: 'VERIFICACIÓN',
    de: 'VERIFIZIERUNG',
    pt: 'VERIFICAÇÃO',
  },
  sourcesHeroStrong: {
    fr: 'Seules les courses vérifiées capturent.',
    en: 'Only verified runs capture.',
    es: 'Solo las carreras verificadas capturan.',
    de: 'Nur verifizierte Läufe erobern.',
    pt: 'Só corridas verificadas capturam.',
  },
  sourcesHeroLine: {
    fr: 'Les autres enrichissent tes stats.',
    en: 'The rest enrich your stats.',
    es: 'Las demás enriquecen tus estadísticas.',
    de: 'Der Rest stärkt deine Stats.',
    pt: 'As outras enriquecem suas estatísticas.',
  },
  sectionVerified: {
    fr: 'SOURCES VÉRIFIÉES',
    en: 'VERIFIED SOURCES',
    es: 'FUENTES VERIFICADAS',
    de: 'VERIFIZIERTE QUELLEN',
    pt: 'FONTES VERIFICADAS',
  },
  /**
   * PÉRIMÈTRE 5 : la section « BIENTÔT » n'est plus rendue — le Hub n'affiche
   * que les sources réellement disponibles. L'entrée est conservée pour le jour
   * où une source redevient listable (cf. catalog.ts).
   */
  sectionSoon: {
    fr: 'BIENTÔT',
    en: 'COMING SOON',
    es: 'PRÓXIMAMENTE',
    de: 'BALD',
    pt: 'EM BREVE',
  },

  // ─── Verify Hub : chips d'état (COURTES — §A, jamais tronquées) ────────────
  chipNeedsKeys: {
    fr: 'Configuration requise',
    en: 'Setup required',
    es: 'Falta configurar',
    de: 'Setup nötig',
    pt: 'Falta configurar',
  },
  chipNeedsDevBuild: {
    fr: 'Dev build requis',
    en: 'Dev build required',
    es: 'Requiere dev build',
    de: 'Dev-Build nötig',
    pt: 'Requer dev build',
  },
  chipSoon: {
    fr: 'Bientôt',
    en: 'Soon',
    es: 'Pronto',
    de: 'Bald',
    pt: 'Em breve',
  },
  /** Aperçu web : l'action existe, mais elle vit sur le téléphone. */
  chipAppOnly: {
    fr: 'Sur téléphone',
    en: 'On phone',
    es: 'En el móvil',
    de: 'Am Handy',
    pt: 'No celular',
  },
  /** La chip qualifie la source (fém. es « fuente » / pt « fonte »). */
  statusActive: {
    fr: 'Actif',
    en: 'Active',
    es: 'Activa',
    de: 'Aktiv',
    pt: 'Ativa',
  },
  statusConnected: {
    fr: 'Connecté',
    en: 'Connected',
    es: 'Conectada',
    de: 'Verbunden',
    pt: 'Conectada',
  },
  statusDisconnecting: {
    fr: 'Déconnexion…',
    en: 'Disconnecting…',
    es: 'Desconectando…',
    de: 'Trenne…',
    pt: 'Desconectando…',
  },

  // ─── Verify Hub : CTA Connecter ────────────────────────────────────────────
  connectCta: {
    fr: 'Connecter',
    en: 'Connect',
    es: 'Conectar',
    de: 'Verbinden',
    pt: 'Conectar',
  },
  connectBusy: {
    fr: 'Connexion…',
    en: 'Connecting…',
    es: 'Conectando…',
    de: 'Verbinde…',
    pt: 'Conectando…',
  },
  /** CTA d'une source à action PONCTUELLE (Import GPX) — jamais « Connecter ». */
  importCta: {
    fr: 'Importer',
    en: 'Import',
    es: 'Importar',
    de: 'Import',
    pt: 'Importar',
  },
  importBusy: {
    fr: 'Import…',
    en: 'Importing…',
    es: 'Importando…',
    de: 'Importiere…',
    pt: 'Importando…',
  },
  importA11y: {
    fr: 'Importer un fichier depuis {name}',
    en: 'Import a file from {name}',
    es: 'Importar un archivo desde {name}',
    de: 'Datei aus {name} importieren',
    pt: 'Importar um arquivo de {name}',
  },
  /** accessibilityLabels — {name} = nom de la source (jamais traduit). */
  connectA11y: {
    fr: 'Connecter {name}',
    en: 'Connect {name}',
    es: 'Conectar {name}',
    de: '{name} verbinden',
    pt: 'Conectar {name}',
  },
  disconnectA11y: {
    fr: 'Déconnecter {name}',
    en: 'Disconnect {name}',
    es: 'Desconectar {name}',
    de: '{name} trennen',
    pt: 'Desconectar {name}',
  },

  // ─── Verify Hub : échecs honnêtes (filet UI AMENDEMENT-15 §3) ──────────────
  connectFailed: {
    fr: 'Connexion impossible — réessaie plus tard',
    en: 'Couldn’t connect — try again later',
    es: 'No se pudo conectar: inténtalo más tarde',
    de: 'Verbindung fehlgeschlagen — versuch es später',
    pt: 'Não foi possível conectar — tente mais tarde',
  },
  disconnectFailed: {
    fr: 'Déconnexion impossible — réessaie plus tard',
    en: 'Couldn’t disconnect — try again later',
    es: 'No se pudo desconectar: inténtalo más tarde',
    de: 'Trennen fehlgeschlagen — versuch es später',
    pt: 'Não foi possível desconectar — tente mais tarde',
  },

  // ─── Import GPX : phrases d'état HONNÊTES (adapters/gpx.ts) ────────────────
  // Aucune ne promet une capture : le serveur (ingest_run) reste seul juge.
  gpxReady: {
    fr: 'Choisis un fichier .gpx exporté par ta montre ou ton app',
    en: 'Pick a .gpx file exported by your watch or app',
    es: 'Elige un archivo .gpx exportado por tu reloj o tu app',
    de: 'Wähl eine .gpx-Datei aus deiner Uhr oder App',
    pt: 'Escolha um arquivo .gpx exportado do seu relógio ou app',
  },
  gpxAppOnly: {
    fr: 'Import disponible dans l’app sur téléphone',
    en: 'Import available in the phone app',
    es: 'Importación disponible en la app del móvil',
    de: 'Import in der Handy-App verfügbar',
    pt: 'Importação disponível no app do celular',
  },
  gpxPickerUnavailable: {
    fr: 'Sélecteur de fichier indisponible sur cet appareil',
    en: 'File picker unavailable on this device',
    es: 'Selector de archivos no disponible en este dispositivo',
    de: 'Dateiauswahl auf diesem Gerät nicht verfügbar',
    pt: 'Seletor de arquivos indisponível neste aparelho',
  },
  gpxUnreadable: {
    fr: 'Fichier illisible — réessaie avec un autre .gpx',
    en: 'Unreadable file — try another .gpx',
    es: 'Archivo ilegible: prueba con otro .gpx',
    de: 'Datei nicht lesbar — versuch eine andere .gpx',
    pt: 'Arquivo ilegível — tente outro .gpx',
  },
  gpxNoPoints: {
    fr: 'Aucun point horodaté dans ce fichier',
    en: 'No time-stamped points in this file',
    es: 'Ningún punto con hora en este archivo',
    de: 'Keine Punkte mit Zeitstempel in dieser Datei',
    pt: 'Nenhum ponto com horário neste arquivo',
  },
  gpxNeedsAccount: {
    fr: 'Connecte-toi pour envoyer une course',
    en: 'Sign in to send a run',
    es: 'Inicia sesión para enviar una carrera',
    de: 'Melde dich an, um einen Lauf zu senden',
    pt: 'Entre para enviar uma corrida',
  },
  /** {n} = points envoyés. Le verdict appartient au serveur, pas à l'app. */
  gpxSent: {
    fr: '{n} points envoyés — le serveur décide de la capture',
    en: '{n} points sent — the server decides on capture',
    es: '{n} puntos enviados: el servidor decide la captura',
    de: '{n} Punkte gesendet — der Server entscheidet über die Eroberung',
    pt: '{n} pontos enviados — o servidor decide a captura',
  },
  gpxDuplicate: {
    fr: 'Course déjà enregistrée — rien n’a été dupliqué',
    en: 'Run already recorded — nothing was duplicated',
    es: 'Carrera ya registrada: no se duplicó nada',
    de: 'Lauf bereits erfasst — nichts wurde doppelt angelegt',
    pt: 'Corrida já registrada — nada foi duplicado',
  },
  gpxRejected: {
    fr: 'Course refusée par la vérification',
    en: 'Run turned down by verification',
    es: 'Carrera rechazada por la verificación',
    de: 'Lauf von der Prüfung abgelehnt',
    pt: 'Corrida recusada pela verificação',
  },
  gpxSendFailed: {
    fr: 'Envoi impossible — réessaie quand tu as du réseau',
    en: 'Couldn’t send — try again when you’re online',
    es: 'No se pudo enviar: reinténtalo con conexión',
    de: 'Senden fehlgeschlagen — versuch es mit Netz erneut',
    pt: 'Não foi possível enviar — tente com internet',
  },

  // ─── Verify Hub : note de bas de page ──────────────────────────────────────
  sourcesFootnote: {
    fr: 'GRYD Verify lit tes activités, vérifie l’effort réel, déduplique les doublons, puis décide si elles peuvent capturer du territoire.',
    en: 'GRYD Verify reads your activities, checks the real effort, removes duplicates, then decides whether they can capture territory.',
    es: 'GRYD Verify lee tus actividades, verifica el esfuerzo real, elimina los duplicados y decide si pueden capturar territorio.',
    de: 'GRYD Verify liest deine Aktivitäten, prüft den echten Aufwand, entfernt Duplikate und entscheidet, ob sie Territorium erobern können.',
    pt: 'O GRYD Verify lê suas atividades, verifica o esforço real, remove duplicatas e decide se elas podem capturar território.',
  },
  /** Pourquoi la liste est courte : on n'affiche que ce qui marche vraiment. */
  sourcesScopeNote: {
    fr: 'Cette liste ne montre que les sources qui fonctionnent aujourd’hui. Les autres apparaîtront le jour où elles marcheront vraiment — pas avant.',
    en: 'This list only shows sources that work today. The others will appear the day they actually work — not before.',
    es: 'Esta lista solo muestra las fuentes que funcionan hoy. Las demás aparecerán el día que funcionen de verdad, no antes.',
    de: 'Diese Liste zeigt nur Quellen, die heute funktionieren. Die anderen erscheinen, sobald sie wirklich laufen — vorher nicht.',
    pt: 'Esta lista mostra só as fontes que funcionam hoje. As outras vão aparecer quando realmente funcionarem — não antes.',
  },
});
