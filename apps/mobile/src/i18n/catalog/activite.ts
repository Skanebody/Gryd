/**
 * GRYD — i18n : catalogue de l'écran ACTIVITÉ (/activite, planche E23).
 *
 * Parité 5 langues imposée par le type `Entry`. Invariants jamais traduits :
 * GRYD, Crew, noms propres. {placeholders} identiques dans les 5 langues.
 *
 * VOCABULAIRE NEUTRE aux deux disciplines : ce flux nomme des ACTES DE JEU
 * (contestation, rivalité, capture crew, badge), jamais un sport — un joueur qui
 * regarde son activité vélo ne doit pas lire « course ». Rien ici ne nomme une
 * discipline (le garde-fou `disciplineVocabulary` resterait muet), et c'est
 * voulu : l'activité territoriale est la même à pied et à vélo.
 *
 * HONNÊTETÉ (AMENDEMENT-47) : les trois groupes TACTIQUES (À défendre, Rivalité,
 * Crew) naissent d'actes CROSS-JOUEUR (O1) — aucune ligne fabriquée. Seule la
 * PROGRESSION (badges réels) alimente le flux avant O1 ; sinon, l'état CALME.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── En-tête ───────────────────────────────────────────────────────────────
  activiteTitle: { fr: 'Activité', en: 'Activity', es: 'Actividad', de: 'Aktivität', pt: 'Atividade' },
  activiteKicker: {
    fr: 'TON TERRITOIRE',
    en: 'YOUR TERRITORY',
    es: 'TU TERRITORIO',
    de: 'DEIN GEBIET',
    pt: 'SEU TERRITÓRIO',
  },
  activiteSubtitle: {
    fr: 'Ce qui bouge sur ton territoire, par priorité.',
    en: 'What is moving on your territory, by priority.',
    es: 'Lo que se mueve en tu territorio, por prioridad.',
    de: 'Was sich in deinem Gebiet bewegt — nach Priorität.',
    pt: 'O que mexe no seu território, por prioridade.',
  },

  // ─── Titres des quatre groupes fixes (SectionLabel — casse normale) ─────────
  groupDefend: {
    fr: 'À défendre',
    en: 'To defend',
    es: 'Por defender',
    de: 'Zu verteidigen',
    pt: 'A defender',
  },
  groupRivalry: { fr: 'Rivalité', en: 'Rivalry', es: 'Rivalidad', de: 'Rivalität', pt: 'Rivalidade' },
  groupCrew: { fr: 'Crew', en: 'Crew', es: 'Crew', de: 'Crew', pt: 'Crew' },
  groupProgression: {
    fr: 'Progression',
    en: 'Progression',
    es: 'Progreso',
    de: 'Fortschritt',
    pt: 'Progressão',
  },

  // ─── Ligne de PROGRESSION (badge réel débloqué) ────────────────────────────
  progressionBadge: {
    fr: 'Nouveau badge débloqué',
    en: 'New badge unlocked',
    es: 'Nuevo distintivo desbloqueado',
    de: 'Neues Abzeichen freigeschaltet',
    pt: 'Novo emblema desbloqueado',
  },
  /** VoiceOver d'une ligne de progression : le fait + son âge + l'ouverture. */
  a11yBadgeLine: {
    fr: '{label}, {age}. Voir la collection.',
    en: '{label}, {age}. See collection.',
    es: '{label}, {age}. Ver colección.',
    de: '{label}, {age}. Sammlung ansehen.',
    pt: '{label}, {age}. Ver coleção.',
  },

  // ─── Âge relatif d'un événement (planche : « il y a 3 j ») ──────────────────
  ageToday: { fr: 'aujourd’hui', en: 'today', es: 'hoy', de: 'heute', pt: 'hoje' },
  ageDays: { fr: 'il y a {n} j', en: '{n}d ago', es: 'hace {n} d', de: 'vor {n} T', pt: 'há {n} d' },
  ageWeeks: {
    fr: 'il y a {n} sem',
    en: '{n}w ago',
    es: 'hace {n} sem',
    de: 'vor {n} Wo',
    pt: 'há {n} sem',
  },

  // ─── État CALME (vide) — planche E23 ───────────────────────────────────────
  emptyTitle: {
    fr: 'Tout est calme sur ton territoire',
    en: 'All quiet on your territory',
    es: 'Todo tranquilo en tu territorio',
    de: 'Alles ruhig in deinem Gebiet',
    pt: 'Tudo tranquilo no seu território',
  },
  emptyBody: {
    fr: 'Aucune alerte pour l’instant. On te préviendra ici quand quelque chose bouge.',
    en: 'No alerts yet. We’ll let you know here when something moves.',
    es: 'Aún no hay alertas. Te avisaremos aquí cuando algo se mueva.',
    de: 'Noch keine Meldungen. Wir sagen dir hier Bescheid, wenn sich etwas tut.',
    pt: 'Ainda sem alertas. Avisamos aqui quando algo mexer.',
  },

  /**
   * CE QUI N'EXISTE PAS ENCORE, DIT À SA PLACE (patron /qr, /historique) : en
   * bas, en gris. Les trois groupes tactiques dépendent du cross-joueur (O1) —
   * on nomme la raison du calme plutôt que de laisser croire à une surveillance
   * qui n'a encore personne à signaler.
   */
  tacticalPendingNote: {
    fr: 'Les alertes de contestation, de rivalité et de crew arriveront ici dès que d’autres joueurs seront actifs autour de toi.',
    en: 'Contest, rivalry and crew alerts will land here once other players are active around you.',
    es: 'Las alertas de disputa, rivalidad y crew llegarán aquí cuando haya otros jugadores activos cerca de ti.',
    de: 'Meldungen zu Angriff, Rivalität und Crew erscheinen hier, sobald andere Spieler in deiner Nähe aktiv sind.',
    pt: 'Alertas de disputa, rivalidade e crew chegarão aqui quando houver outros jogadores ativos perto de você.',
  },

  // ─── États de lecture (patron /historique) ─────────────────────────────────
  loadingLine: {
    fr: 'Lecture de ton activité…',
    en: 'Reading your activity…',
    es: 'Leyendo tu actividad…',
    de: 'Deine Aktivität wird gelesen …',
    pt: 'Lendo sua atividade…',
  },
  failedTitle: {
    fr: 'Chargement impossible',
    en: 'Couldn’t load',
    es: 'No se pudo cargar',
    de: 'Laden fehlgeschlagen',
    pt: 'Falha ao carregar',
  },
  failedBody: {
    fr: 'On n’a pas pu lire ton activité. Réessaie.',
    en: 'We couldn’t read your activity. Try again.',
    es: 'No pudimos leer tu actividad. Inténtalo de nuevo.',
    de: 'Wir konnten deine Aktivität nicht lesen. Versuch es erneut.',
    pt: 'Não conseguimos ler sua atividade. Tente de novo.',
  },
  retry: { fr: 'Réessayer', en: 'Try again', es: 'Reintentar', de: 'Erneut versuchen', pt: 'Tentar de novo' },

  signedOutBody: {
    fr: 'Ton activité est liée à ton compte. Connecte-toi pour la suivre ici.',
    en: 'Your activity lives on your account. Sign in to follow it here.',
    es: 'Tu actividad está vinculada a tu cuenta. Inicia sesión para seguirla aquí.',
    de: 'Deine Aktivität hängt an deinem Konto. Melde dich an, um sie hier zu verfolgen.',
    pt: 'Sua atividade está ligada à sua conta. Entre para acompanhá-la aqui.',
  },
  signInCta: { fr: 'Se connecter', en: 'Sign in', es: 'Iniciar sesión', de: 'Anmelden', pt: 'Entrar' },
  a11ySignIn: {
    fr: 'Se connecter pour suivre son activité',
    en: 'Sign in to follow your activity',
    es: 'Iniciar sesión para seguir tu actividad',
    de: 'Anmelden, um deine Aktivität zu verfolgen',
    pt: 'Entrar para acompanhar sua atividade',
  },

  noBackendTitle: {
    fr: 'Aucun serveur relié',
    en: 'No server connected',
    es: 'Sin servidor conectado',
    de: 'Kein Server verbunden',
    pt: 'Nenhum servidor ligado',
  },
  noBackendBody: {
    fr: 'Cet aperçu n’est relié à aucun serveur : aucune alerte ne peut encore t’atteindre.',
    en: 'This preview isn’t connected to a server: no alert can reach you yet.',
    es: 'Esta vista previa no está conectada a ningún servidor: ninguna alerta puede llegarte aún.',
    de: 'Diese Vorschau ist mit keinem Server verbunden: Noch kann dich keine Meldung erreichen.',
    pt: 'Esta prévia não está ligada a nenhum servidor: nenhum alerta pode te alcançar ainda.',
  },

  // ─── Réglages par catégorie (planche E23 « PUSH & RÉGLAGES ») ───────────────
  // Lien DIRECT en bas de liste vers l'écran de canaux RÉEL (/parametres/
  // notifications) — un vrai réglage, jamais un bouton mort.
  notifSettingsLink: {
    fr: 'Régler mes notifications',
    en: 'Manage notifications',
    es: 'Ajustar notificaciones',
    de: 'Benachrichtigungen einstellen',
    pt: 'Ajustar notificações',
  },
  a11yNotifSettings: {
    fr: 'Régler mes notifications par catégorie',
    en: 'Manage notifications by category',
    es: 'Ajustar las notificaciones por categoría',
    de: 'Benachrichtigungen nach Kategorie einstellen',
    pt: 'Ajustar as notificações por categoria',
  },
});
