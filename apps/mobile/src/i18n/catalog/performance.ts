/**
 * GRYD — i18n : catalogue du domaine PERFORMANCE (/performance).
 *
 * Nouveau catalogue (21/07/2026) : la page ne rendait plus qu'une constante de
 * démo, et ses libellés étaient du français en dur dans les composants. Tout ce
 * qui s'affiche passe désormais par une `Entry` — parité 5 langues imposée par
 * le type (une langue manquante = erreur TypeScript).
 *
 * ─── RECALAGE E18 « Statistiques & data » (25/07/2026) ──────────────────────
 * L'écran s'appelle désormais « Statistiques » et sa clé `title` vit ICI. Les
 * entrées d'en-tête historiques (`perfTitle` = « Performance », `perfKicker`,
 * `a11yPerfVerifyLink`, `perfVerifyLink`) restent dans `historique.ts`, hors
 * périmètre : elles n'ont PLUS AUCUN consommateur depuis ce recalage — leur
 * retrait est un nettoyage i18n à part.
 * Les ajouts de ce chantier sont STRICTEMENT ADDITIFS : `app/historique.tsx` et
 * `features/performance/components.tsx` importent encore ce catalogue et sont
 * hors périmètre ; supprimer une clé casserait leur typecheck.
 *
 * Invariants jamais traduits : GRYD, GO, GRYD Verify, km, GPS, les chiffres et
 * leurs unités (« 5:32 /km », « 1h42 »).
 *
 * ─── 26/07/2026 : L'ÉCRAN LIT PAR DISCIPLINE, IL DOIT PARLER PAR DISCIPLINE ──
 * `useStats(activity)` borne sa lecture par `.eq('activity', …)` et la page
 * AFFICHE elle-même la discipline (commutateur E14 en `headerRight`). Sa branche
 * `bike` ne couvrait pourtant que la page SANS DONNÉES : un cycliste qui a des
 * sorties lisait tout le corps en vocabulaire coureur — « courses / sem. »,
 * « {n} de tes {total} courses », « Semaine sans course » (LU À VOIX HAUTE), et
 * surtout « COURS {n} fois pour tes premières tendances » : un impératif qui
 * ordonne de courir à quelqu'un qui roule.
 *
 * MÊME MÉTHODE QUE `result.ts` / `historique.ts` : clés historiques INCHANGÉES
 * (elles sont la version `run`), un jumeau suffixé `Bike` juste en dessous pour
 * chaque libellé qui NOMME l'effort, et un `Record<Activity, …>` exhaustif —
 * `STATS_COPY`, bas de fichier — que les écrans lisent. Un libellé DÉJÀ NEUTRE
 * (« Volume d'activité », « Progression territoriale », « Meilleure allure »,
 * « Rien n'est perdu… ») n'a PAS de jumeau : le dupliquer ferait deux vérités.
 *
 * UNE NEUTRALISATION, PAS UN JUMEAU : `regularityStreak` était déjà neutre dans
 * quatre langues sur cinq (« au moins une sortie », « one outing », « una
 * salida », « uma saída ») et ne fuyait qu'en allemand (« mit mindestens einem
 * Lauf »). Le jumeler aurait figé QUATRE doublons identiques pour corriger UNE
 * chaîne : l'allemand est neutralisé sur place (« einer Aktivität »).
 *
 * VOCABULAIRE VÉLO (aligné sur `result.ts` et sur les états vides déjà écrits
 * ici) : fr « sortie (vélo) » · en « ride » · es « salida (en bici) » · de
 * « Ausfahrt / Fahrt » · pt « pedal ».
 */
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import { defineCatalog } from '../types';
import type { Entry } from '../types';

export const C = defineCatalog({
  // ─── Les trois états vides ─────────────────────────────────────────────────
  signedOutTitle: {
    fr: 'Connecte-toi pour voir tes courses.',
    en: 'Sign in to see your runs.',
    es: 'Inicia sesión para ver tus carreras.',
    de: 'Melde dich an, um deine Läufe zu sehen.',
    pt: 'Entre para ver suas corridas.',
  },
  /**
   * Le commutateur E14 vit dans la barre, hors de l'état de lecture : un joueur
   * déconnecté peut donc regarder le monde vélo, et l'écran le lui affiche.
   */
  signedOutTitleBike: {
    fr: 'Connecte-toi pour voir tes sorties vélo.',
    en: 'Sign in to see your rides.',
    es: 'Inicia sesión para ver tus salidas en bici.',
    de: 'Melde dich an, um deine Ausfahrten zu sehen.',
    pt: 'Entre para ver seus pedais.',
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
  /** Même absence de serveur, dans le monde regardé (rendu aussi par /historique). */
  noBackendTitleBike: {
    fr: 'Tes sorties vélo arrivent avec ton compte.',
    en: 'Your rides come with your account.',
    es: 'Tus salidas en bici llegan con tu cuenta.',
    de: 'Deine Ausfahrten kommen mit deinem Konto.',
    pt: 'Seus pedais vêm com sua conta.',
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
  /**
   * ÉCHEC DE LECTURE dans le monde regardé. C'est l'état où le mot compte le
   * plus : ses sorties EXISTENT, on n'a pas su les lire — les appeler « courses »
   * ajouterait un second faux au premier.
   */
  failedTitleBike: {
    fr: 'On n’a pas pu charger tes sorties vélo.',
    en: 'We couldn’t load your rides.',
    es: 'No pudimos cargar tus salidas en bici.',
    de: 'Wir konnten deine Ausfahrten nicht laden.',
    pt: 'Não conseguimos carregar seus pedais.',
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
  /** Une lecture EN COURS n'affirme rien — mais elle dit quel monde elle lit. */
  loadingBike: {
    fr: 'Chargement de tes sorties vélo…',
    en: 'Loading your rides…',
    es: 'Cargando tus salidas en bici…',
    de: 'Deine Ausfahrten werden geladen …',
    pt: 'Carregando seus pedais…',
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
  /** Fenêtre vide du monde vélo — ton NEUTRE, jamais un reproche. */
  weekNoRunBike: {
    fr: 'Pas encore de sortie cette semaine.',
    en: 'No ride this week yet.',
    es: 'Aún no hay salidas esta semana.',
    de: 'Diese Woche noch keine Ausfahrt.',
    pt: 'Ainda nenhum pedal esta semana.',
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
  /** Ancien titre de card. Le palmarès E18 a son propre titre (`recordsPersonalTitle`). */
  recordsTitle: { fr: 'Records', en: 'Records', es: 'Récords', de: 'Rekorde', pt: 'Recordes' },
  /**
   * COMPLÉTÉ le 25/07/2026 : le libellé vivait dans une grille titrée
   * « Records » où le nom de l'objet était implicite. Isolé sur sa ligne de
   * palmarès, il devait porter son nom — « Längster » seul n'est pas de
   * l'allemand, et « Plus longue » seule ne dit pas longue de quoi.
   */
  recordLongest: {
    fr: 'Plus longue course',
    en: 'Longest run',
    es: 'Carrera más larga',
    de: 'Längster Lauf',
    pt: 'Corrida mais longa',
  },
  /**
   * Le palmarès suit la MÊME lecture que les trois blocs (`records.ts` dérive
   * des mêmes lignes, filtrées par discipline) : sous la lentille vélo, cette
   * ligne consacre une sortie vélo. Les trois autres libellés du palmarès
   * (« Plus longtemps », « Meilleure allure », « Plus longue série ») sont déjà
   * neutres et n'ont donc pas de jumeau.
   */
  recordLongestBike: {
    fr: 'Plus longue sortie',
    en: 'Longest ride',
    es: 'Salida más larga',
    de: 'Längste Ausfahrt',
    pt: 'Pedal mais longo',
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

  // ═══════════════════════════════════════════════════════════════════════════
  // E18 « STATISTIQUES & DATA » (25/07/2026) — recalage sur la planche.
  // Ajouts STRICTEMENT ADDITIFS : `historique.tsx` et
  // `features/performance/components.tsx` consomment encore des clés de ce
  // catalogue et sont HORS PÉRIMÈTRE — en retirer une casserait leur typecheck.
  // ═══════════════════════════════════════════════════════════════════════════

  /** Titre de barre. Remplace `CH.perfTitle` (« Performance ») pour cet écran. */
  title: {
    fr: 'Statistiques',
    en: 'Statistics',
    es: 'Estadísticas',
    de: 'Statistik',
    pt: 'Estatísticas',
  },

  // ─── Commutateur de période (libellés COURTS : contrainte allemande) ───────
  periodA11y: {
    fr: 'Période',
    en: 'Time range',
    es: 'Periodo',
    de: 'Zeitraum',
    pt: 'Período',
  },
  periodWeek: { fr: 'Semaine', en: 'Week', es: 'Semana', de: 'Woche', pt: 'Semana' },
  periodMonth: { fr: 'Mois', en: 'Month', es: 'Mes', de: 'Monat', pt: 'Mês' },
  periodSeason: { fr: 'Saison', en: 'Season', es: 'Temporada', de: 'Saison', pt: 'Temporada' },

  // ─── Axe des 7 jours : abréviations (jamais tronquées, 1 caractère) ────────
  dayMon: { fr: 'L', en: 'M', es: 'L', de: 'M', pt: 'S' },
  dayTue: { fr: 'M', en: 'T', es: 'M', de: 'D', pt: 'T' },
  dayWed: { fr: 'M', en: 'W', es: 'X', de: 'M', pt: 'Q' },
  dayThu: { fr: 'J', en: 'T', es: 'J', de: 'D', pt: 'Q' },
  dayFri: { fr: 'V', en: 'F', es: 'V', de: 'F', pt: 'S' },
  daySat: { fr: 'S', en: 'S', es: 'S', de: 'S', pt: 'S' },
  daySun: { fr: 'D', en: 'S', es: 'D', de: 'S', pt: 'D' },

  // ─── Noms complets : VoiceOver + phrase de conclusion (jamais l'abréviation) ─
  dayMonFull: { fr: 'Lundi', en: 'Monday', es: 'Lunes', de: 'Montag', pt: 'Segunda-feira' },
  dayTueFull: { fr: 'Mardi', en: 'Tuesday', es: 'Martes', de: 'Dienstag', pt: 'Terça-feira' },
  dayWedFull: {
    fr: 'Mercredi',
    en: 'Wednesday',
    es: 'Miércoles',
    de: 'Mittwoch',
    pt: 'Quarta-feira',
  },
  dayThuFull: { fr: 'Jeudi', en: 'Thursday', es: 'Jueves', de: 'Donnerstag', pt: 'Quinta-feira' },
  dayFriFull: { fr: 'Vendredi', en: 'Friday', es: 'Viernes', de: 'Freitag', pt: 'Sexta-feira' },
  daySatFull: { fr: 'Samedi', en: 'Saturday', es: 'Sábado', de: 'Samstag', pt: 'Sábado' },
  daySunFull: { fr: 'Dimanche', en: 'Sunday', es: 'Domingo', de: 'Sonntag', pt: 'Domingo' },

  // ─── BLOC 1 — Volume d'activité ───────────────────────────────────────────
  volumeTitle: {
    fr: 'Volume d’activité',
    en: 'Activity volume',
    es: 'Volumen de actividad',
    de: 'Aktivitätsvolumen',
    pt: 'Volume de atividade',
  },
  /**
   * Deltas COMPLETS (flèche + signe + unité + repère). Une phrase par langue :
   * l'espace avant « % » et la place du repère ne se recomposent pas à la main.
   * Rendus UNIQUEMENT quand la période précédente porte des kilomètres — jamais
   * de « +0 % » (qui se lit « tu stagnes ») ni de « +∞ ».
   */
  volumeUpWeek: {
    fr: '▲ +{pct} % vs semaine dernière',
    en: '▲ +{pct}% vs last week',
    es: '▲ +{pct} % vs semana pasada',
    de: '▲ +{pct} % vs. Vorwoche',
    pt: '▲ +{pct}% vs semana passada',
  },
  volumeDownWeek: {
    fr: '▼ −{pct} % vs semaine dernière',
    en: '▼ −{pct}% vs last week',
    es: '▼ −{pct} % vs semana pasada',
    de: '▼ −{pct} % vs. Vorwoche',
    pt: '▼ −{pct}% vs semana passada',
  },
  volumeUpMonth: {
    fr: '▲ +{pct} % vs mois dernier',
    en: '▲ +{pct}% vs last month',
    es: '▲ +{pct} % vs mes pasado',
    de: '▲ +{pct} % vs. Vormonat',
    pt: '▲ +{pct}% vs mês passado',
  },
  volumeDownMonth: {
    fr: '▼ −{pct} % vs mois dernier',
    en: '▼ −{pct}% vs last month',
    es: '▼ −{pct} % vs mes pasado',
    de: '▼ −{pct} % vs. Vormonat',
    pt: '▼ −{pct}% vs mês passado',
  },
  /** Conclusion quand l'impact territorial de la période est LISIBLE. */
  volumeBestDayCaptures: {
    fr: '{day} est ton meilleur jour — {n} de tes {total} captures y ont eu lieu.',
    en: '{day} is your best day — {n} of your {total} captures happened then.',
    es: '{day} es tu mejor día: {n} de tus {total} capturas ocurrieron ahí.',
    de: '{day} ist dein bester Tag – {n} deiner {total} Eroberungen fielen darauf.',
    pt: '{day} é o seu melhor dia — {n} das suas {total} capturas foram nele.',
  },
  /** Repli quand un payload de capture est illisible : on parle de COURSES. */
  volumeBestDayRuns: {
    fr: '{day} est ton meilleur jour — {n} de tes {total} courses y ont eu lieu.',
    en: '{day} is your best day — {n} of your {total} runs happened then.',
    es: '{day} es tu mejor día: {n} de tus {total} carreras ocurrieron ahí.',
    de: '{day} ist dein bester Tag – {n} deiner {total} Läufe fielen darauf.',
    pt: '{day} é o seu melhor dia — {n} das suas {total} corridas foram nele.',
  },
  /** Le MÊME repli, compté en sorties vélo (la conclusion du bloc 1 en Bike). */
  volumeBestDayRunsBike: {
    fr: '{day} est ton meilleur jour — {n} de tes {total} sorties y ont eu lieu.',
    en: '{day} is your best day — {n} of your {total} rides happened then.',
    es: '{day} es tu mejor día: {n} de tus {total} salidas ocurrieron ahí.',
    de: '{day} ist dein bester Tag – {n} deiner {total} Ausfahrten fielen darauf.',
    pt: '{day} é o seu melhor dia — {n} dos seus {total} pedais foram nele.',
  },
  /** Fenêtre sans course : ton NEUTRE, jamais un reproche (cf. `weekNoRun`). */
  volumeNoRunMonth: {
    fr: 'Pas encore de course ce mois-ci.',
    en: 'No run this month yet.',
    es: 'Aún no hay carreras este mes.',
    de: 'Diesen Monat noch kein Lauf.',
    pt: 'Ainda nenhuma corrida este mês.',
  },
  volumeNoRunSeason: {
    fr: 'Pas encore de course cette saison.',
    en: 'No run this season yet.',
    es: 'Aún no hay carreras esta temporada.',
    de: 'Diese Saison noch kein Lauf.',
    pt: 'Ainda nenhuma corrida nesta temporada.',
  },
  volumeNoRunMonthBike: {
    fr: 'Pas encore de sortie ce mois-ci.',
    en: 'No ride this month yet.',
    es: 'Aún no hay salidas este mes.',
    de: 'Diesen Monat noch keine Ausfahrt.',
    pt: 'Ainda nenhum pedal este mês.',
  },
  volumeNoRunSeasonBike: {
    fr: 'Pas encore de sortie cette saison.',
    en: 'No ride this season yet.',
    es: 'Aún no hay salidas esta temporada.',
    de: 'Diese Saison noch keine Ausfahrt.',
    pt: 'Ainda nenhum pedal nesta temporada.',
  },

  // ─── BLOC 2 — Progression territoriale ────────────────────────────────────
  territoryTitle: {
    fr: 'Progression territoriale',
    en: 'Territory progress',
    es: 'Progresión territorial',
    de: 'Gebietsentwicklung',
    pt: 'Progressão territorial',
  },
  /** Unité invariante — jamais traduite. */
  territoryUnit: { fr: 'km²', en: 'km²', es: 'km²', de: 'km²', pt: 'km²' },
  territoryZonesHeld: {
    fr: '{n} zones tenues',
    en: '{n} zones held',
    es: '{n} zonas retenidas',
    de: '{n} Zonen gehalten',
    pt: '{n} zonas mantidas',
  },
  /**
   * GAIN, jamais un solde. Les pertes ne sont stockées nulle part : écrire
   * « +0,42 vs la semaine dernière » affirmerait qu'on n'a rien perdu.
   */
  territoryGainedWeek: {
    fr: '+{km2} km² capturés cette semaine',
    en: '+{km2} km² captured this week',
    es: '+{km2} km² capturados esta semana',
    de: '+{km2} km² diese Woche erobert',
    pt: '+{km2} km² capturados esta semana',
  },
  territoryGainedMonth: {
    fr: '+{km2} km² capturés ce mois-ci',
    en: '+{km2} km² captured this month',
    es: '+{km2} km² capturados este mes',
    de: '+{km2} km² diesen Monat erobert',
    pt: '+{km2} km² capturados este mês',
  },
  territoryGainedSeason: {
    fr: '+{km2} km² capturés cette saison',
    en: '+{km2} km² captured this season',
    es: '+{km2} km² capturados esta temporada',
    de: '+{km2} km² diese Saison erobert',
    pt: '+{km2} km² capturados nesta temporada',
  },
  /** Légende DIRECTE du graphique + l'aveu de ce qu'il ne mesure pas. */
  territoryChartCaption: {
    fr: 'Surface capturée par semaine. Les pertes de zones ne sont pas mesurées.',
    en: 'Area captured per week. Zone losses are not measured.',
    es: 'Superficie capturada por semana. Las pérdidas de zonas no se miden.',
    de: 'Pro Woche eroberte Fläche. Zonenverluste werden nicht gemessen.',
    pt: 'Área capturada por semana. As perdas de zonas não são medidas.',
  },
  territoryBestWeek: {
    fr: 'Ta meilleure semaine de capture : {n} zones prises.',
    en: 'Your best capture week: {n} zones taken.',
    es: 'Tu mejor semana de captura: {n} zonas tomadas.',
    de: 'Deine beste Eroberungswoche: {n} Zonen genommen.',
    pt: 'Sua melhor semana de captura: {n} zonas tomadas.',
  },
  territoryNoCapture: {
    fr: 'Tes captures apparaîtront ici, semaine après semaine.',
    en: 'Your captures will show up here, week after week.',
    es: 'Tus capturas aparecerán aquí, semana tras semana.',
    de: 'Deine Eroberungen erscheinen hier, Woche für Woche.',
    pt: 'Suas capturas aparecerão aqui, semana após semana.',
  },
  /**
   * Une semaine de l'horizon dont l'impact est ILLISIBLE (payload `celebration`
   * absent ou tronqué) est un TROU, pas un zéro : tracer 0 affirmerait « rien
   * pris cette semaine-là ». On retire le graphique et on dit pourquoi.
   */
  territoryImpactUnknown: {
    fr: 'L’impact de certaines courses n’a pas été enregistré : pas de tendance de capture.',
    en: 'Some runs have no recorded impact: no capture trend.',
    es: 'Algunas carreras no tienen impacto registrado: sin tendencia de captura.',
    de: 'Bei einigen Läufen fehlt die Wirkung: kein Eroberungstrend.',
    pt: 'Algumas corridas não têm impacto registrado: sem tendência de captura.',
  },
  /** Le même TROU, dans le monde vélo : ce sont ses sorties qui sont muettes. */
  territoryImpactUnknownBike: {
    fr: 'L’impact de certaines sorties n’a pas été enregistré : pas de tendance de capture.',
    en: 'Some rides have no recorded impact: no capture trend.',
    es: 'Algunas salidas no tienen impacto registrado: sin tendencia de captura.',
    de: 'Bei einigen Ausfahrten fehlt die Wirkung: kein Eroberungstrend.',
    pt: 'Alguns pedais não têm impacto registrado: sem tendência de captura.',
  },
  territoryLoading: {
    fr: 'Lecture de tes zones…',
    en: 'Reading your zones…',
    es: 'Leyendo tus zonas…',
    de: 'Deine Zonen werden gelesen …',
    pt: 'Lendo suas zonas…',
  },
  territoryFailed: {
    fr: 'On n’a pas pu lire tes zones.',
    en: 'We couldn’t read your zones.',
    es: 'No pudimos leer tus zonas.',
    de: 'Wir konnten deine Zonen nicht lesen.',
    pt: 'Não conseguimos ler suas zonas.',
  },

  // ─── BLOC 3 — Régularité ──────────────────────────────────────────────────
  regularityTitle: {
    fr: 'Régularité',
    en: 'Consistency',
    es: 'Regularidad',
    de: 'Regelmäßigkeit',
    pt: 'Regularidade',
  },
  regularityUnit: {
    fr: 'courses / sem.',
    en: 'runs / wk',
    es: 'carreras / sem.',
    de: 'Läufe / Wo.',
    pt: 'corridas / sem.',
  },
  /**
   * L'unité du chiffre héros du bloc 3, dans le monde vélo. COURTE dans les cinq
   * langues, comme sa jumelle : elle s'inscrit à côté d'un nombre en corps 40
   * (de « Fahrten » plutôt que « Ausfahrten » — même sens ici, deux caractères
   * de moins sous le chiffre).
   */
  regularityUnitBike: {
    fr: 'sorties / sem.',
    en: 'rides / wk',
    es: 'salidas / sem.',
    de: 'Fahrten / Wo.',
    pt: 'pedais / sem.',
  },
  regularityAverageOver: {
    fr: 'en moyenne sur les {n} dernières semaines',
    en: 'on average over the last {n} weeks',
    es: 'de media en las últimas {n} semanas',
    de: 'im Schnitt über die letzten {n} Wochen',
    pt: 'em média nas últimas {n} semanas',
  },
  /**
   * NEUTRALISÉE (26/07/2026), PAS JUMELÉE. Quatre langues sur cinq disaient déjà
   * la chose sans nommer de sport (« une sortie », « one outing », « una
   * salida », « uma saída ») ; seul l'allemand fuyait (« mit mindestens einem
   * Lauf »), servi tel quel sous un en-tête vélo. Créer un jumeau aurait figé
   * QUATRE doublons identiques pour corriger UNE chaîne — deux vérités à
   * maintenir là où une seule suffit (règle du catalogue).
   */
  regularityStreak: {
    fr: '{n} semaines consécutives avec au moins une sortie.',
    en: '{n} weeks in a row with at least one outing.',
    es: '{n} semanas seguidas con al menos una salida.',
    de: '{n} Wochen in Folge mit mindestens einer Aktivität.',
    pt: '{n} semanas seguidas com pelo menos uma saída.',
  },
  regularityBuilding: {
    fr: 'Deux semaines actives d’affilée ouvrent ta série.',
    en: 'Two active weeks in a row start your streak.',
    es: 'Dos semanas activas seguidas abren tu racha.',
    de: 'Zwei aktive Wochen in Folge starten deine Serie.',
    pt: 'Duas semanas ativas seguidas abrem sua sequência.',
  },

  // ─── Repères de semaine (VoiceOver + bulles) ──────────────────────────────
  weekCurrentLong: {
    fr: 'cette semaine',
    en: 'this week',
    es: 'esta semana',
    de: 'diese Woche',
    pt: 'esta semana',
  },
  weekAgoOne: {
    fr: 'la semaine dernière',
    en: 'last week',
    es: 'la semana pasada',
    de: 'letzte Woche',
    pt: 'a semana passada',
  },
  weeksAgoLong: {
    fr: 'il y a {n} semaines',
    en: '{n} weeks ago',
    es: 'hace {n} semanas',
    de: 'vor {n} Wochen',
    pt: 'há {n} semanas',
  },
  weekActiveA11y: {
    fr: 'Semaine active, {when}',
    en: 'Active week, {when}',
    es: 'Semana activa, {when}',
    de: 'Aktive Woche, {when}',
    pt: 'Semana ativa, {when}',
  },
  weekIdleA11y: {
    fr: 'Semaine sans course, {when}',
    en: 'Week without a run, {when}',
    es: 'Semana sin carreras, {when}',
    de: 'Woche ohne Lauf, {when}',
    pt: 'Semana sem corrida, {when}',
  },
  /**
   * LU À VOIX HAUTE, un carré éteint de la grille de régularité. Sa jumelle
   * active (`weekActiveA11y`, « Semaine active ») est déjà neutre et n'en a donc
   * pas : seule celle-ci nommait le sport.
   */
  weekIdleA11yBike: {
    fr: 'Semaine sans sortie, {when}',
    en: 'Week without a ride, {when}',
    es: 'Semana sin salidas, {when}',
    de: 'Woche ohne Ausfahrt, {when}',
    pt: 'Semana sem pedal, {when}',
  },

  // ─── Libellés de graphiques (VoiceOver) et bulles au tap ──────────────────
  chartBarsA11y: {
    fr: 'Distance par jour de la semaine',
    en: 'Distance by day of the week',
    es: 'Distancia por día de la semana',
    de: 'Distanz nach Wochentag',
    pt: 'Distância por dia da semana',
  },
  chartAreaA11y: {
    fr: 'Surface capturée par semaine',
    en: 'Area captured per week',
    es: 'Superficie capturada por semana',
    de: 'Erobertes Gebiet pro Woche',
    pt: 'Área capturada por semana',
  },
  chartSquaresA11y: {
    fr: 'Semaines actives',
    en: 'Active weeks',
    es: 'Semanas activas',
    de: 'Aktive Wochen',
    pt: 'Semanas ativas',
  },
  /** Bulle / libellé d'une barre de jour : « Samedi : 8,2 km ». */
  dayValueA11y: {
    fr: '{day} : {km} km',
    en: '{day}: {km} km',
    es: '{day}: {km} km',
    de: '{day}: {km} km',
    pt: '{day}: {km} km',
  },
  /** Bulle / libellé d'un point de l'aire : « il y a 3 semaines : 0,08 km² ». */
  weekAreaA11y: {
    fr: '{when} : {km2} km²',
    en: '{when}: {km2} km²',
    es: '{when}: {km2} km²',
    de: '{when}: {km2} km²',
    pt: '{when}: {km2} km²',
  },

  // ─── État « pas encore de tendance » (JAMAIS un graphique vide) ───────────
  notEnoughData: {
    fr: 'Cours {n} fois pour tes premières tendances.',
    en: 'Run {n} times for your first trends.',
    es: 'Corre {n} veces para ver tus primeras tendencias.',
    de: 'Lauf {n} Mal für deine ersten Trends.',
    pt: 'Corra {n} vezes para ver suas primeiras tendências.',
  },
  /**
   * LE MÊME SEUIL, À L'IMPÉRATIF DU BON SPORT. C'est la pire des fuites de cet
   * écran : les trois blocs la servent (volume, territoire, régularité), et elle
   * ORDONNE — « Cours 2 fois », « Lauf 2 Mal » — à quelqu'un qui roule. Le verbe
   * reprend celui de l'état vide vélo déjà écrit ici (« Roule deux fois… »).
   */
  notEnoughDataBike: {
    fr: 'Roule {n} fois pour tes premières tendances.',
    en: 'Ride {n} times for your first trends.',
    es: 'Rueda {n} veces para ver tus primeras tendencias.',
    de: 'Fahr {n} Mal für deine ersten Trends.',
    pt: 'Pedale {n} vezes para ver suas primeiras tendências.',
  },

  // ─── Pied Premium (rendu SEULEMENT si la surface Arsenal existe) ──────────
  premiumRow: {
    fr: 'Analytics territoriales détaillées (heatmap, temps de contrôle)',
    en: 'Detailed territory analytics (heatmap, time in control)',
    es: 'Analítica territorial detallada (mapa de calor, tiempo de control)',
    de: 'Detaillierte Gebiets-Analytics (Heatmap, Kontrollzeit)',
    pt: 'Analytics territorial detalhada (heatmap, tempo de controle)',
  },
  premiumCta: { fr: 'Premium', en: 'Premium', es: 'Premium', de: 'Premium', pt: 'Premium' },
  premiumA11y: {
    fr: 'Analytics territoriales détaillées — Premium',
    en: 'Detailed territory analytics — Premium',
    es: 'Analítica territorial detallada — Premium',
    de: 'Detaillierte Gebiets-Analytics – Premium',
    pt: 'Analytics territorial detalhada — Premium',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RECORDS PERSONNELS — retour du palmarès sous les trois blocs (25/07/2026).
  // Le recalage E18 avait sorti les records de l'app entière ; décision
  // fondateur : ils reviennent, en LISTE FACTUELLE (pas en 4e bloc d'analyse).
  // Les libellés `recordLongest` · `recordDuration` · `recordBestPace` ·
  // `recordOverKm` et `weeksShort` sont REPRIS tels quels : ils étaient
  // orphelins depuis le recalage. Seules les trois entrées ci-dessous
  // manquaient.
  // ═══════════════════════════════════════════════════════════════════════════

  /** Titre de la section (kicker mis en majuscules par le style). */
  recordsPersonalTitle: {
    fr: 'Records personnels',
    en: 'Personal records',
    es: 'Récords personales',
    de: 'Persönliche Rekorde',
    pt: 'Recordes pessoais',
  },
  /**
   * Le RECORD de série, à distinguer de la série EN COURS que conclut le bloc
   * « Régularité » : deux nombres différents portant le même mot (« Série ») se
   * liraient comme une contradiction de l'écran avec lui-même. C'est pourquoi
   * `recordStreak` (« Série ») reste orphelin plutôt que réemployé ici.
   */
  recordBestStreak: {
    fr: 'Plus longue série',
    en: 'Longest streak',
    es: 'Racha más larga',
    de: 'Längste Serie',
    pt: 'Maior sequência',
  },
  /**
   * Aucun record établi (compte relié, courses lues, mais rien à consacrer). On
   * le DIT : jamais un tableau de tirets ni un « 0 km » qui affirmerait qu'il a
   * couru zéro kilomètre.
   */
  recordsNoneYet: {
    fr: 'Pas encore de record. Ta prochaine course peut en poser un.',
    en: 'No record yet. Your next run can set one.',
    es: 'Aún no hay récords. Tu próxima carrera puede marcar uno.',
    de: 'Noch kein Rekord. Dein nächster Lauf kann einen aufstellen.',
    pt: 'Ainda nenhum recorde. Sua próxima corrida pode marcar um.',
  },
  /**
   * Cas RÉEL et non marginal : un cycliste qui a des sorties mais dont aucune
   * n'a encore établi de record voit cette phrase SOUS ses trois blocs vélo.
   */
  recordsNoneYetBike: {
    fr: 'Pas encore de record. Ta prochaine sortie peut en poser un.',
    en: 'No record yet. Your next ride can set one.',
    es: 'Aún no hay récords. Tu próxima salida puede marcar uno.',
    de: 'Noch kein Rekord. Deine nächste Ausfahrt kann einen aufstellen.',
    pt: 'Ainda nenhum recorde. Seu próximo pedal pode marcar um.',
  },

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

  // ─── Commutateur Run / Bike (planche E14) ──────────────────────────────────
  // Segments à picto seul : l'a11y porte tout le sens, et elle nomme ce que la
  // bascule change ICI — des statistiques, pas une carte.
  activityRunA11y: {
    fr: 'Statistiques à pied',
    en: 'Running stats',
    es: 'Estadísticas a pie',
    de: 'Lauf-Statistiken',
    pt: 'Estatísticas a pé',
  },
  activityBikeA11y: {
    fr: 'Statistiques vélo',
    en: 'Cycling stats',
    es: 'Estadísticas en bici',
    de: 'Rad-Statistiken',
    pt: 'Estatísticas de bike',
  },
  /**
   * ÉTAT VIDE DU MONDE VÉLO — RÉÉCRIT LE 26/07/2026.
   *
   * Le corps disait « GRYD ne chronomètre pas encore le vélo : aucune sortie,
   * aucun territoire, aucune régularité à analyser ». Faux depuis que le vélo
   * enregistre (`runs.activity`, 0070 appliquée ; `useStats(activity)` borne sa
   * lecture). Ce qui manque, ce sont les sorties DE CE JOUEUR — et la planche
   * E18 a déjà la bonne phrase pour ça : « données insuffisantes → Courez 2 fois
   * pour vos premières tendances », jamais un graphique vide.
   *
   * Le seuil cité n'est pas inventé : c'est `MIN_RUNS_FOR_TRENDS`
   * (`performance/stats/derive.ts`), le même que celui de l'état vide à pied.
   * Deux blocs sur trois seraient une droite avec un seul point.
   */
  bikeEmptyTitle: {
    fr: 'Tes stats Bike commencent ici',
    en: 'Your Bike stats start here',
    es: 'Tus estadísticas Bike empiezan aquí',
    de: 'Deine Bike-Statistiken beginnen hier',
    pt: 'Suas estatísticas Bike começam aqui',
  },
  bikeEmptyBody: {
    fr: 'Roule deux fois : volume, territoire et régularité vélo s’affichent ici.',
    en: 'Ride twice: your Bike volume, turf and consistency show up here.',
    es: 'Rueda dos veces: volumen, territorio y regularidad en bici aparecen aquí.',
    de: 'Fahr zweimal: Volumen, Gebiet und Regelmäßigkeit erscheinen hier.',
    pt: 'Pedale duas vezes: volume, território e regularidade aparecem aqui.',
  },
  /** SÉPARATION STRICTE (E14) : deux mondes, jamais une somme. Un FAIT. */
  bikeEmptyRunSafe: {
    fr: 'Tes statistiques à pied sont comptées à part.',
    en: 'Your running stats are counted separately.',
    es: 'Tus estadísticas a pie se cuentan aparte.',
    de: 'Deine Lauf-Statistiken zählen getrennt.',
    pt: 'Suas estatísticas a pé contam à parte.',
  },
  /** CTA de l'état vide vélo — la sortie est DÉCLARÉE vélo, pas devinée. */
  bikeEmptyCta: {
    fr: 'Lancer une sortie vélo',
    en: 'Start a bike ride',
    es: 'Empezar una salida en bici',
    de: 'Radausfahrt starten',
    pt: 'Começar um pedal',
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// LA DÉRIVATION PAR DISCIPLINE — ce que /performance et /historique lisent.
//
// Un `Record<Activity, …>` EXHAUSTIF plutôt qu'un ternaire dans le JSX : au jour
// d'une 3ᵉ discipline, la compilation échoue ICI, une fois, au lieu de laisser
// douze `bike ? … : …` servir le libellé du coureur en silence. C'est le patron
// de `RESULT_COPY` (catalog/result.ts) et de `HISTORY_COPY` (catalog/historique.ts).
//
// N'y figurent QUE les libellés qui NOMMENT l'effort. Les neutres restent uniques :
// « Volume d'activité », « Progression territoriale », « Régularité »,
// « Rien n'est perdu… », « Semaine active », « {n} zones tenues », les jours de
// la semaine, les légendes de graphique, « Meilleure allure », « sur {km} km ».
// Les états vides propres à chaque monde (`emptyTitle`/`bikeEmpty*`) restent
// eux aussi hors du Record : ils portent DÉJÀ leur discipline, et leur CTA n'a
// pas la même cible (la carte pour la course, un départ DÉCLARÉ vélo sinon).
// ═════════════════════════════════════════════════════════════════════════════

/** Les libellés de `/performance` qui changent avec le monde lu. */
export interface StatsActivityCopy {
  // ── États de lecture (partagés avec /historique, qui a le même commutateur) ──
  signedOutTitle: Entry;
  noBackendTitle: Entry;
  failedTitle: Entry;
  loading: Entry;
  // ── BLOC 1 — volume ──
  weekNoRun: Entry;
  volumeNoRunMonth: Entry;
  volumeNoRunSeason: Entry;
  volumeBestDayRuns: Entry;
  // ── BLOC 2 — territoire ──
  territoryImpactUnknown: Entry;
  // ── BLOC 3 — régularité ──
  regularityUnit: Entry;
  /** LU À VOIX HAUTE (carré éteint de la grille). */
  weekIdleA11y: Entry;
  /** Servie par les TROIS blocs — la fuite la plus large de l'écran. */
  notEnoughData: Entry;
  // ── Palmarès ──
  recordLongest: Entry;
  recordsNoneYet: Entry;
}

export const STATS_COPY: Readonly<Record<Activity, StatsActivityCopy>> = {
  run: {
    signedOutTitle: C.signedOutTitle,
    noBackendTitle: C.noBackendTitle,
    failedTitle: C.failedTitle,
    loading: C.loading,
    weekNoRun: C.weekNoRun,
    volumeNoRunMonth: C.volumeNoRunMonth,
    volumeNoRunSeason: C.volumeNoRunSeason,
    volumeBestDayRuns: C.volumeBestDayRuns,
    territoryImpactUnknown: C.territoryImpactUnknown,
    regularityUnit: C.regularityUnit,
    weekIdleA11y: C.weekIdleA11y,
    notEnoughData: C.notEnoughData,
    recordLongest: C.recordLongest,
    recordsNoneYet: C.recordsNoneYet,
  },
  bike: {
    signedOutTitle: C.signedOutTitleBike,
    noBackendTitle: C.noBackendTitleBike,
    failedTitle: C.failedTitleBike,
    loading: C.loadingBike,
    weekNoRun: C.weekNoRunBike,
    volumeNoRunMonth: C.volumeNoRunMonthBike,
    volumeNoRunSeason: C.volumeNoRunSeasonBike,
    volumeBestDayRuns: C.volumeBestDayRunsBike,
    territoryImpactUnknown: C.territoryImpactUnknownBike,
    regularityUnit: C.regularityUnitBike,
    weekIdleA11y: C.weekIdleA11yBike,
    notEnoughData: C.notEnoughDataBike,
    recordLongest: C.recordLongestBike,
    recordsNoneYet: C.recordsNoneYetBike,
  },
};

/**
 * Le jeu de libellés du monde lu. DÉFAUT = `DEFAULT_ACTIVITY` : un appelant qui
 * ignore la notion de discipline obtient EXACTEMENT les textes d'avant le vélo.
 */
export function statsCopy(activity: Activity = DEFAULT_ACTIVITY): StatsActivityCopy {
  return STATS_COPY[activity];
}
