/**
 * GRYD — i18n : catalogue du domaine PERFORMANCE (/performance).
 *
 * Nouveau catalogue (21/07/2026) : la page ne rendait plus qu'une constante de
 * démo, et ses libellés étaient du français en dur dans les composants. Tout ce
 * qui s'affiche passe désormais par une `Entry` — parité 5 langues imposée par
 * le type (une langue manquante = erreur TypeScript).
 *
 * Les entrées d'en-tête historiques (`perfTitle`, `perfKicker`,
 * `a11yPerfVerifyLink`, `perfVerifyLink`) restent dans `historique.ts` : elles y
 * sont déjà traduites et partagées avec /historique.
 *
 * Invariants jamais traduits : GRYD, GO, GRYD Verify, km, GPS, les chiffres et
 * leurs unités (« 5:32 /km », « 1h42 »).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Les trois états vides ─────────────────────────────────────────────────
  signedOutTitle: {
    fr: 'Connecte-toi pour voir tes courses.',
    en: 'Sign in to see your runs.',
    es: 'Inicia sesión para ver tus carreras.',
    de: 'Melde dich an, um deine Läufe zu sehen.',
    pt: 'Entre para ver suas corridas.',
  },
  signedOutBody: {
    fr: 'Distance, allure et records sont rattachés à ton compte.',
    en: 'Distance, pace and records are tied to your account.',
    es: 'Distancia, ritmo y récords están vinculados a tu cuenta.',
    de: 'Distanz, Pace und Rekorde hängen an deinem Konto.',
    pt: 'Distância, ritmo e recordes ficam na sua conta.',
  },
  signIn: {
    fr: 'Se connecter',
    en: 'Sign in',
    es: 'Iniciar sesión',
    de: 'Anmelden',
    pt: 'Entrar',
  },
  /** Pas de backend configuré : « Se connecter » mènerait à un cul-de-sac. */
  noBackendTitle: {
    fr: 'Tes courses arrivent avec ton compte.',
    en: 'Your runs come with your account.',
    es: 'Tus carreras llegan con tu cuenta.',
    de: 'Deine Läufe kommen mit deinem Konto.',
    pt: 'Suas corridas vêm com sua conta.',
  },
  noBackendBody: {
    fr: 'Cet aperçu n’est relié à aucun serveur : il n’y a rien à afficher ici.',
    en: 'This preview isn’t connected to a server: there is nothing to show here.',
    es: 'Esta vista previa no está conectada a ningún servidor: no hay nada que mostrar.',
    de: 'Diese Vorschau ist mit keinem Server verbunden: Hier gibt es nichts zu zeigen.',
    pt: 'Esta prévia não está ligada a nenhum servidor: não há nada para mostrar aqui.',
  },
  emptyTitle: {
    fr: 'Aucune course pour l’instant.',
    en: 'No run yet.',
    es: 'Ninguna carrera por ahora.',
    de: 'Noch kein Lauf.',
    pt: 'Nenhuma corrida por enquanto.',
  },
  emptyBody: {
    fr: 'Ta première course remplit cette page : semaine, progression, records.',
    en: 'Your first run fills this page: week, progress, records.',
    es: 'Tu primera carrera llena esta página: semana, progreso, récords.',
    de: 'Dein erster Lauf füllt diese Seite: Woche, Fortschritt, Rekorde.',
    pt: 'Sua primeira corrida preenche esta página: semana, progresso, recordes.',
  },
  emptyCta: {
    fr: 'Lancer une course',
    en: 'Start a run',
    es: 'Empezar una carrera',
    de: 'Lauf starten',
    pt: 'Iniciar uma corrida',
  },
  failedTitle: {
    fr: 'On n’a pas pu charger tes courses.',
    en: 'We couldn’t load your runs.',
    es: 'No pudimos cargar tus carreras.',
    de: 'Wir konnten deine Läufe nicht laden.',
    pt: 'Não conseguimos carregar suas corridas.',
  },
  failedBody: {
    fr: 'Rien n’est perdu. Vérifie ta connexion, puis réessaie.',
    en: 'Nothing is lost. Check your connection, then try again.',
    es: 'No se pierde nada. Revisa tu conexión y vuelve a intentarlo.',
    de: 'Nichts ist verloren. Prüfe deine Verbindung und versuch es erneut.',
    pt: 'Nada se perdeu. Verifique sua conexão e tente de novo.',
  },
  retry: {
    fr: 'Réessayer',
    en: 'Try again',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },
  loading: {
    fr: 'Chargement de tes courses…',
    en: 'Loading your runs…',
    es: 'Cargando tus carreras…',
    de: 'Deine Läufe werden geladen …',
    pt: 'Carregando suas corridas…',
  },

  // ─── Cette semaine ─────────────────────────────────────────────────────────
  weekTitle: {
    fr: 'Cette semaine',
    en: 'This week',
    es: 'Esta semana',
    de: 'Diese Woche',
    pt: 'Esta semana',
  },
  weekRuns: { fr: 'courses', en: 'runs', es: 'carreras', de: 'Läufe', pt: 'corridas' },
  weekKm: { fr: 'km', en: 'km', es: 'km', de: 'km', pt: 'km' },
  weekDuration: { fr: 'durée', en: 'time', es: 'tiempo', de: 'Zeit', pt: 'tempo' },
  weekPace: { fr: 'allure', en: 'pace', es: 'ritmo', de: 'Pace', pt: 'ritmo' },
  weekNoRun: {
    fr: 'Pas encore de course cette semaine.',
    en: 'No run this week yet.',
    es: 'Aún no hay carreras esta semana.',
    de: 'Diese Woche noch kein Lauf.',
    pt: 'Ainda nenhuma corrida esta semana.',
  },

  // ─── Progression ───────────────────────────────────────────────────────────
  progressionTitle: {
    fr: 'Progression',
    en: 'Progress',
    es: 'Progreso',
    de: 'Fortschritt',
    pt: 'Progresso',
  },
  signalDistance: { fr: 'distance', en: 'distance', es: 'distancia', de: 'Distanz', pt: 'distância' },
  signalPace: { fr: 'allure', en: 'pace', es: 'ritmo', de: 'Pace', pt: 'ritmo' },
  signalRegularity: {
    fr: 'régularité',
    en: 'regularity',
    es: 'regularidad',
    de: 'Regelmäßigkeit',
    pt: 'regularidade',
  },
  /** Semaines d'affilée — valeur du signal « régularité ». */
  weeksShort: { fr: '{n} sem.', en: '{n} wk', es: '{n} sem.', de: '{n} Wo.', pt: '{n} sem.' },
  /** Axe du mini-graph : semaines passées (S-1, S-2…). */
  trendWeekAgo: { fr: 'S-{n}', en: 'W-{n}', es: 'S-{n}', de: 'W-{n}', pt: 'S-{n}' },
  trendThisWeek: {
    fr: 'Cette sem.',
    en: 'This wk',
    es: 'Esta sem.',
    de: 'Diese Wo.',
    pt: 'Esta sem.',
  },
  /** Affiché quand il n'y a pas assez d'historique pour comparer. */
  progressionNeedsHistory: {
    fr: 'Encore une semaine de course et la comparaison arrive.',
    en: 'One more week of running and the comparison shows up.',
    es: 'Una semana más de carrera y aparece la comparación.',
    de: 'Noch eine Laufwoche und der Vergleich erscheint.',
    pt: 'Mais uma semana de corrida e a comparação aparece.',
  },

  // ─── Records ───────────────────────────────────────────────────────────────
  recordsTitle: { fr: 'Records', en: 'Records', es: 'Récords', de: 'Rekorde', pt: 'Recordes' },
  recordLongest: {
    fr: 'Plus longue',
    en: 'Longest',
    es: 'Más larga',
    de: 'Längster',
    pt: 'Mais longa',
  },
  recordDuration: {
    fr: 'Plus longtemps',
    en: 'Longest time',
    es: 'Más tiempo',
    de: 'Längste Zeit',
    pt: 'Mais tempo',
  },
  recordBestPace: {
    fr: 'Meilleure allure',
    en: 'Best pace',
    es: 'Mejor ritmo',
    de: 'Beste Pace',
    pt: 'Melhor ritmo',
  },
  recordStreak: {
    fr: 'Série',
    en: 'Streak',
    es: 'Racha',
    de: 'Serie',
    pt: 'Sequência',
  },
  /** Contexte d'un record : la course qui l'a produit. */
  recordOverKm: {
    fr: 'sur {km} km',
    en: 'over {km} km',
    es: 'en {km} km',
    de: 'auf {km} km',
    pt: 'em {km} km',
  },

  // ─── GRYD Verify ───────────────────────────────────────────────────────────
  verifyReliable: {
    fr: 'de tes courses comptent sans réserve',
    en: 'of your runs count with no caveat',
    es: 'de tus carreras cuentan sin reservas',
    de: 'deiner Läufe zählen ohne Vorbehalt',
    pt: 'das suas corridas contam sem ressalvas',
  },
  verifyOnRuns: {
    fr: 'sur {n} courses',
    en: 'across {n} runs',
    es: 'sobre {n} carreras',
    de: 'von {n} Läufen',
    pt: 'em {n} corridas',
  },
  channelGps: { fr: 'GPS', en: 'GPS', es: 'GPS', de: 'GPS', pt: 'GPS' },
  channelMotion: {
    fr: 'Mouvement',
    en: 'Motion',
    es: 'Movimiento',
    de: 'Bewegung',
    pt: 'Movimento',
  },
  channelSteps: { fr: 'Pas', en: 'Steps', es: 'Pasos', de: 'Schritte', pt: 'Passos' },

  // ─── ORPHELINES depuis le 21/07/2026 (fin du mode vitrine) ────────────────
  // Ces clés alimentaient ScoreFormeHero / GrydImpactCard, supprimés avec la
  // vitrine (aucune source réelle ne calcule un « score de forme »). Elles sont
  // conservées telles quelles — les retirer est un nettoyage i18n à part, à
  // faire avec les autres clés orphelines du catalogue.
  scoreForme: {
    fr: 'SCORE FORME',
    en: 'FITNESS SCORE',
    es: 'PUNTUACIÓN FORMA',
    de: 'FITNESS-SCORE',
    pt: 'PONTUAÇÃO DE FORMA',
  },
  weekDelta: {
    fr: 'cette semaine',
    en: 'this week',
    es: 'esta semana',
    de: 'diese Woche',
    pt: 'esta semana',
  },
  grydImpact: {
    fr: 'Impact GRYD',
    en: 'GRYD impact',
    es: 'Impacto GRYD',
    de: 'GRYD-Wirkung',
    pt: 'Impacto GRYD',
  },
  weeklyGoal: {
    fr: 'Objectif hebdo',
    en: 'Weekly goal',
    es: 'Objetivo semanal',
    de: 'Wochenziel',
    pt: 'Meta semanal',
  },
});
