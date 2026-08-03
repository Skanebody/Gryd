/**
 * GRYD — i18n : catalogue de l'écran E10 « Permissions utiles »
 * (`/setup/permissions`).
 *
 * Spec produit UI/UX complète (~l.810) : DEUX cartes seulement — mouvements et
 * activité physique, notifications tactiques — « la localisation a déjà été
 * expliquée » (E05). Règle : « Chaque permission est demandée au moment de son
 * bénéfice. Le bouton principal peut être CONTINUER même si une permission
 * secondaire est refusée. »
 *
 * ─── REGISTRE ───────────────────────────────────────────────────────────────
 * Tutoiement fr, « tú » es, « du » de, « você » pt-BR (jamais teu/tua).
 *
 * ─── CONSTITUTION §2 : AUCUN BOUTON MORT ────────────────────────────────────
 * Une permission système n'existe pas partout, et son bouton ne doit pas être
 * peint là où il échouerait toujours. QUATRE issues, quatre textes, jamais
 * confondues :
 *   · `*Granted`     — accordée, constatée par l'OS (pas supposée) ;
 *   · `*Denied`      — refusée, et l'app continue quand même (elle le DIT) ;
 *   · `*Blocked`     — refusée DÉFINITIVEMENT : le dialogue système ne
 *                      reparaîtra plus, seul le panneau Réglages peut la rendre.
 *                      Redemander ici serait un bouton mort → on renvoie aux
 *                      réglages, qui, eux, marchent ;
 *   · `*Unavailable` — la plateforme courante n'a pas cette capacité (aperçu
 *                      web, appareil sans podomètre). Aucun bouton n'est peint :
 *                      « l'absence d'un bouton n'est pas un mensonge, un bouton
 *                      qui échoue toujours en est un ».
 *
 * ─── ANTI-CHANTAGE ──────────────────────────────────────────────────────────
 * Aucune phrase ne suggère qu'un refus coûte du territoire, des points ou une
 * protection : ce serait faux (le claim est décidé serveur, à partir de la
 * trace GPS) et ce serait une mécanique de pression. `skip` est une vraie
 * sortie, pas une punition, et `footnote` le dit noir sur blanc.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  /**
   * Étiquette du RETOUR vers E09 « Choix d'activité ».
   *
   * ⚠️ Elle nomme la DESTINATION, pas le geste : un lecteur d'écran qui annonce
   * « Retour » ne dit rien de plus que la flèche. Et elle n'est lue que quand la
   * flèche est réellement peinte — c'est-à-dire quand un écran existe derrière
   * (voir `router.canGoBack()` dans l'écran) : jamais de libellé pour un bouton
   * absent.
   */
  backA11y: {
    fr: 'Revenir au choix de discipline',
    en: 'Back to choosing your discipline',
    es: 'Volver a la elección de disciplina',
    de: 'Zurück zur Wahl der Disziplin',
    pt: 'Voltar à escolha da modalidade',
  },
  // ─── Entête ────────────────────────────────────────────────────────────────
  kicker: {
    fr: 'DEUX AUTORISATIONS',
    en: 'TWO PERMISSIONS',
    es: 'DOS PERMISOS',
    de: 'ZWEI BERECHTIGUNGEN',
    pt: 'DUAS PERMISSÕES',
  },
  title: {
    fr: 'Deux choses qui aident',
    en: 'Two things that help',
    es: 'Dos cosas que ayudan',
    de: 'Zwei Dinge, die helfen',
    pt: 'Duas coisas que ajudam',
  },
  /**
   * Rappel que la localisation a DÉJÀ été traitée (E05) : on ne la redemande pas.
   *
   * ⚠️ FORMULATION CORRIGÉE (27/07/2026). « La localisation est déjà réglée »
   * affirmait un ÉTAT que cet écran ne connaît pas : en E05, « Plus tard » est
   * une vraie sortie (app/onboarding/index.tsx, LocationStep) et le joueur peut
   * très bien arriver ici sans avoir accordé la position. La phrase dit
   * maintenant ce qui est vrai à coup sûr : cet écran ne la redemande pas.
   */
  subtitle: {
    fr: 'On ne te redemande pas la localisation. Ces deux-là sont facultatives.',
    en: 'We won’t ask for location again. These two are optional.',
    es: 'No te volvemos a pedir la ubicación. Estas dos son opcionales.',
    de: 'Wir fragen nicht noch einmal nach dem Standort. Diese beiden sind optional.',
    pt: 'Não pedimos a localização de novo. Estas duas são opcionais.',
  },

  // ─── Carte 1 · mouvements et activité physique ────────────────────────────
  motionTitle: {
    fr: 'Mouvements et activité',
    en: 'Motion and fitness',
    es: 'Movimiento y actividad',
    de: 'Bewegung und Fitness',
    pt: 'Movimento e atividade',
  },
  /**
   * LE BÉNÉFICE, pas la mécanique : la spec l'exige (« au moment de son bénéfice »).
   *
   * ⚠️ PROMESSE RETIRÉE (27/07/2026) : « et économise ta batterie pendant la
   * sortie ». AUCUN code ne fait ça. Le podomètre n'est utilisé que par
   * `run/gps/tracker.ts` (`startPedometer` → `watchStepCount`), dont le cumul
   * alimente `motionTrust` côté serveur ; la cadence GPS, elle, est fixe
   * (`GPS_SAMPLE_INTERVAL_MS`, `BestForNavigation` dans `mvp/run/gpsProvider.ts`) et
   * ne dépend d'aucun signal de mouvement. Une garantie écrite avant que le code
   * la tienne est la même faute qu'une donnée fabriquée.
   *
   * Ce qui RESTE est vérifiable ligne à ligne : steps → `motionTrust`
   * (packages/engine/src/validation.ts) → une course reconnue comme courue.
   */
  motionBody: {
    fr: 'Compte tes pas pendant la course : c’est ce qui prouve une vraie foulée, et pas un trajet en voiture.',
    en: 'Counts your steps during the run: that’s what proves a real stride, not a car ride.',
    es: 'Cuenta tus pasos durante la carrera: es lo que demuestra una zancada real y no un trayecto en coche.',
    de: 'Zählt deine Schritte während des Laufs: Das belegt echte Schritte statt einer Autofahrt.',
    pt: 'Conta seus passos durante a corrida: é o que prova uma passada real, e não um trajeto de carro.',
  },
  motionCta: {
    fr: 'Autoriser les mouvements',
    en: 'Allow motion',
    es: 'Permitir movimiento',
    de: 'Bewegung erlauben',
    pt: 'Permitir movimento',
  },
  motionGranted: {
    fr: 'Autorisé',
    en: 'Allowed',
    es: 'Permitido',
    de: 'Erlaubt',
    pt: 'Permitido',
  },
  motionDenied: {
    fr: 'Refusé — le GPS seul suffit à jouer.',
    en: 'Declined — GPS alone is enough to play.',
    es: 'Rechazado: el GPS por sí solo basta para jugar.',
    de: 'Abgelehnt — GPS allein reicht zum Spielen.',
    pt: 'Recusado — só o GPS já basta para jogar.',
  },
  motionBlocked: {
    fr: 'Bloqué au niveau du système. Ça se rouvre dans les réglages de l’appareil.',
    en: 'Blocked at system level. It can be reopened in the device settings.',
    es: 'Bloqueado a nivel del sistema. Se reactiva en los ajustes del dispositivo.',
    de: 'Auf Systemebene blockiert. Lässt sich in den Geräteeinstellungen wieder öffnen.',
    pt: 'Bloqueado no nível do sistema. Dá para reabrir nas configurações do aparelho.',
  },
  motionUnavailable: {
    fr: 'Indisponible sur cet appareil.',
    en: 'Unavailable on this device.',
    es: 'No disponible en este dispositivo.',
    de: 'Auf diesem Gerät nicht verfügbar.',
    pt: 'Indisponível neste aparelho.',
  },

  // ─── Carte 2 · notifications tactiques ────────────────────────────────────
  notificationsTitle: {
    fr: 'Notifications tactiques',
    en: 'Tactical notifications',
    es: 'Notificaciones tácticas',
    de: 'Taktische Mitteilungen',
    pt: 'Notificações táticas',
  },
  /**
   * Une LIMITE, pas un calendrier de livraison. Pas de « reste engagé », pas de
   * relance quotidienne promise ici : les quotas et heures calmes existent
   * (`push_suppressed`), et une carte d'autorisation n'est pas l'endroit pour
   * vendre du volume.
   *
   * ⚠️ REFORMULÉ EN PORTÉE (27/07/2026). La chaîne push serveur existe bel et
   * bien (migration `push_devices`, `decay_job` à J-3, `_shared/expo-push.ts`),
   * mais aucun appareil ne peut obtenir de token tant que les credentials
   * APNs/FCM ne sont pas déposés — c'est écrit noir sur blanc dans app.json
   * (`_note_push_perimetre3`). Une carte de permission ne doit donc pas dire
   * « voilà ce que tu VAS recevoir » : elle dit ce à quoi l'autorisation est
   * RÉSERVÉE. Le diagnostic honnête de la chaîne push, lui, vit déjà dans
   * Réglages › Notifications (`app/parametres/[section].tsx`).
   *
   * ⚠️ COMPLÉTÉ LE 27/07/2026. « Réservées à ça » restait une phrase de PORTÉE,
   * mais elle se lisait quand même comme une promesse de remise dès lors que la
   * carte n'affichait ensuite que « Autorisé ». La réponse n'est pas de raboter
   * la copie : c'est d'ajouter le fait qui manquait. E10 enregistre désormais
   * réellement l'appareil après l'accord de l'OS, et rend le VERDICT de cette
   * tentative sous la ligne d'état (`notificationsDelivering` /
   * `notificationsNotDelivering` / `notificationsNoAccount` /
   * `notificationsDeliveryError`). Cette phrase-ci dit donc toujours à QUOI
   * l'autorisation est réservée ; celle du dessous dit si ça arrive.
   */
  notificationsBody: {
    fr: 'Réservées à ça : une zone qu’on te prend, une défense qui expire, ton crew qui t’appelle.',
    en: 'Reserved for this: a zone taken from you, a defence about to expire, your crew calling.',
    es: 'Reservadas para esto: una zona que te quitan, una defensa que caduca, tu crew que te llama.',
    de: 'Nur dafür: eine Zone, die dir genommen wird, eine ablaufende Verteidigung, dein Crew-Ruf.',
    pt: 'Reservadas para isto: uma zona que tomam de você, uma defesa que expira, seu crew chamando.',
  },
  notificationsCta: {
    fr: 'Autoriser les notifications',
    en: 'Allow notifications',
    es: 'Permitir notificaciones',
    de: 'Mitteilungen erlauben',
    pt: 'Permitir notificações',
  },
  notificationsGranted: {
    fr: 'Autorisé',
    en: 'Allowed',
    es: 'Permitido',
    de: 'Erlaubt',
    pt: 'Permitido',
  },
  notificationsDenied: {
    fr: 'Refusé — tu retrouveras tout dans l’app.',
    en: 'Declined — you’ll find it all inside the app.',
    es: 'Rechazado: lo encontrarás todo dentro de la app.',
    de: 'Abgelehnt — du findest alles in der App wieder.',
    pt: 'Recusado — você encontra tudo dentro do app.',
  },
  notificationsBlocked: {
    fr: 'Bloqué au niveau du système. Ça se rouvre dans les réglages de l’appareil.',
    en: 'Blocked at system level. It can be reopened in the device settings.',
    es: 'Bloqueado a nivel del sistema. Se reactiva en los ajustes del dispositivo.',
    de: 'Auf Systemebene blockiert. Lässt sich in den Geräteeinstellungen wieder öffnen.',
    pt: 'Bloqueado no nível do sistema. Dá para reabrir nas configurações do aparelho.',
  },
  notificationsUnavailable: {
    fr: 'Indisponible ici — les notifications vivent sur le téléphone.',
    en: 'Unavailable here — notifications live on the phone.',
    es: 'No disponible aquí: las notificaciones viven en el móvil.',
    de: 'Hier nicht verfügbar — Mitteilungen leben am Handy.',
    pt: 'Indisponível aqui — as notificações vivem no celular.',
  },

  // ─── DÉLIVRABILITÉ : « autorisé » ne veut pas dire « tu recevras » ─────────
  // Ces quatre lignes sont rendues SOUS la ligne d'état, et uniquement après un
  // `granted` (`notificationsDeliveryLine`, module pur). Elles disent ce que
  // l'enregistrement RÉEL de l'appareil a répondu — jamais une supposition.
  // Sans elles, E10 affirmait « Autorisé » pendant que Réglages › Notifications
  // affichait « Pas encore disponibles sur cette version de l'app » pour la même
  // situation : deux récits d'un seul fait, et c'est l'onboarding qui portait
  // l'optimiste.
  /** L'appareil est enregistré côté serveur : la chaîne est complète. */
  notificationsDelivering: {
    fr: 'Cet appareil est enregistré : ces alertes t’arriveront.',
    en: 'This device is registered: those alerts will reach you.',
    es: 'Este dispositivo está registrado: esas alertas te llegarán.',
    de: 'Dieses Gerät ist registriert: Diese Hinweise erreichen dich.',
    pt: 'Este aparelho está registrado: esses alertas vão chegar até você.',
  },
  /**
   * Le service de push n'a délivré aucun jeton (credentials APNs/FCM absents du
   * build, simulateur, module natif absent). MÊME FOND que `pushNoCredentials`
   * de Réglages : c'est la version de l'app qui ne sait pas encore les recevoir,
   * ce n'est ni un refus, ni une panne du joueur.
   */
  notificationsNotDelivering: {
    fr: 'Autorisation enregistrée. Ces alertes ne sont pas encore livrées par cette version de l’app.',
    en: 'Permission saved. Those alerts aren’t delivered yet by this version of the app.',
    es: 'Permiso guardado. Esta versión de la app todavía no entrega esas alertas.',
    de: 'Erlaubnis gespeichert. Diese Version der App liefert diese Hinweise noch nicht aus.',
    pt: 'Permissão salva. Esta versão do app ainda não entrega esses alertas.',
  },
  /** Ni backend ni session : il n'y a personne à qui rattacher cet appareil. */
  notificationsNoAccount: {
    fr: 'Autorisation enregistrée. Il faut un compte connecté pour que ces alertes t’arrivent.',
    en: 'Permission saved. A signed-in account is needed for those alerts to reach you.',
    es: 'Permiso guardado. Hace falta una cuenta conectada para recibir esas alertas.',
    de: 'Erlaubnis gespeichert. Für diese Hinweise braucht es ein angemeldetes Konto.',
    pt: 'Permissão salva. É preciso uma conta conectada para receber esses alertas.',
  },
  /** Le serveur a refusé l'enregistrement — réseau, RLS, session expirée. */
  notificationsDeliveryError: {
    fr: 'Autorisation enregistrée. L’enregistrement de cet appareil a échoué — à reprendre dans Réglages.',
    en: 'Permission saved. Registering this device failed — pick it up again in Settings.',
    es: 'Permiso guardado. Falló el registro de este dispositivo: retómalo en Ajustes.',
    de: 'Erlaubnis gespeichert. Die Geräteregistrierung ist fehlgeschlagen — in den Einstellungen fortsetzen.',
    pt: 'Permissão salva. O registro deste aparelho falhou — retome nas Configurações.',
  },

  // ─── Sortie vers les réglages système (le seul bouton qui marche si bloqué) ─
  openSettingsCta: {
    fr: 'Ouvrir les réglages',
    en: 'Open settings',
    es: 'Abrir ajustes',
    de: 'Einstellungen öffnen',
    pt: 'Abrir configurações',
  },
  /** L'app ne peut pas garantir l'ouverture du panneau système : elle le dit. */
  openSettingsFailed: {
    fr: 'Impossible d’ouvrir les réglages depuis ici. Passe par les réglages de l’appareil.',
    en: 'Can’t open settings from here. Go through the device settings.',
    es: 'No se pueden abrir los ajustes desde aquí. Ve a los ajustes del dispositivo.',
    de: 'Einstellungen lassen sich von hier nicht öffnen. Nimm die Geräteeinstellungen.',
    pt: 'Não dá para abrir as configurações daqui. Vá pelas configurações do aparelho.',
  },
  /** Lecture de l'état des permissions EN COURS — on n'affiche aucun verdict. */
  checking: {
    fr: 'Vérification…',
    en: 'Checking…',
    es: 'Comprobando…',
    de: 'Wird geprüft…',
    pt: 'Verificando…',
  },

  // ─── CTA principal (unique, §A4) ───────────────────────────────────────────
  /** Toujours actif : « CONTINUER même si une permission secondaire est refusée ». */
  cta: {
    fr: 'CONTINUER',
    en: 'CONTINUE',
    es: 'CONTINUAR',
    de: 'WEITER',
    pt: 'CONTINUAR',
  },
  /**
   * ⚠️ PAS DE « PLUS TARD » SUR CET ÉCRAN, ET C'EST DÉLIBÉRÉ (27/07/2026).
   * La clé `skip` a été retirée : elle aurait mené EXACTEMENT là où mène
   * `cta`. Deux commandes pour une seule issue, c'est deux décisions à prendre
   * pour un écran qui n'en pose qu'une (§A). Ici, ne rien autoriser et
   * continuer, c'est le MÊME bouton — ce que la spec dit en toutes lettres :
   * « le bouton principal peut être CONTINUER même si une permission secondaire
   * est refusée ». La sortie sans culpabilité est portée par `footnote`.
   */
  /**
   * Anti-pay-to-win et anti-chantage, dit une fois : ces deux autorisations
   * n'achètent aucun avantage de jeu. Le claim reste décidé serveur, à partir
   * de la trace.
   */
  footnote: {
    fr: 'Aucune des deux ne donne de territoire, de points ni de protection. Tu peux les changer plus tard dans les réglages.',
    en: 'Neither one grants territory, points or protection. You can change them later in settings.',
    es: 'Ninguna de las dos da territorio, puntos ni protección. Puedes cambiarlas más tarde en los ajustes.',
    de: 'Keine der beiden bringt Gebiet, Punkte oder Schutz. Du kannst sie später in den Einstellungen ändern.',
    pt: 'Nenhuma das duas dá território, pontos nem proteção. Você pode mudar isso depois nas configurações.',
  },
});
