/**
 * GRYD — i18n : catalogue du domaine SAISON (horodateur + règles).
 *
 * Deux usages, un seul domaine :
 *  1. l'HORODATEUR (`features/season/SeasonStatus`) — les libellés des quatre
 *     états honnêtes d'une saison (chargement / active / aucune / échec de
 *     lecture), rendus par un composant qui n'affirme JAMAIS une date que la
 *     base ne porte pas ;
 *  2. les RÈGLES des saisons — le bloc « Saisons » de la FAQ (app/faq.tsx),
 *     en accordéons (question au repos, réponse au tap, comme le reste de §33).
 *
 * Pourquoi un catalogue « faq » plutôt que d'alourdir `explain` : l'horodateur
 * vit AUSSI dans les réglages (À propos › GRYD), pas seulement dans la FAQ —
 * regrouper ses chaînes avec les Q/R saison est le découpage le plus lisible,
 * et laisse `explain.ts` à l'explicabilité des ZONES.
 *
 * RÈGLES (mêmes que explain.ts) : source de vérité des 5 langues ; parité forcée
 * par le type `Entry` ; AUCUN nombre de règle en dur — {weeks}=SEASON_DURATION_WEEKS,
 * {days}=INTERSEASON_DAYS, {n}/{pct} dérivés à l'écran depuis les BORNES RÉELLES
 * (jamais une fenêtre inventée) ; invariants jamais traduits (GRYD, Crew, XP,
 * stats) ; mêmes {placeholders} dans les 5 langues.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── HORODATEUR (SeasonStatus) ─────────────────────────────────────────────
  /** Nom d'une saison (0-indexé) : « Saison 0 », « Saison 1 »… ({n}). */
  sName: {
    fr: 'Saison {n}',
    en: 'Season {n}',
    es: 'Temporada {n}',
    de: 'Saison {n}',
    pt: 'Temporada {n}',
  },
  /** Décompte d'une saison ACTIVE — jours pleins jusqu'à `ends_at` réel. */
  sEndsInDays: {
    fr: 'Fin dans {n} jours',
    en: 'Ends in {n} days',
    es: 'Termina en {n} días',
    de: 'Endet in {n} Tagen',
    pt: 'Termina em {n} dias',
  },
  /** Singulier du dernier jour (`joursRestants === 1`) — accord grammatical. */
  sEndsInDay: {
    fr: 'Fin dans {n} jour',
    en: 'Ends in {n} day',
    es: 'Termina en {n} día',
    de: 'Endet in {n} Tag',
    pt: 'Termina em {n} dia',
  },
  /** Saison réelle mais pas encore commencée (`starts_at` futur) — sans nombre
   *  (le moteur ne donne pas les jours AVANT le début, on ne l'invente pas). */
  sStartsSoon: {
    fr: 'Commence bientôt',
    en: 'Starts soon',
    es: 'Empieza pronto',
    de: 'Startet bald',
    pt: 'Começa em breve',
  },
  /** `ends_at` dépassé mais saison encore 'active' en base (cron pas repassé) :
   *  on dit « en clôture » plutôt qu'un décompte négatif. */
  sClosing: {
    fr: 'En clôture',
    en: 'Closing',
    es: 'En cierre',
    de: 'Wird abgeschlossen',
    pt: 'Em encerramento',
  },
  /** Part écoulée de la saison ({pct} entier 0-100). */
  sElapsed: {
    fr: '{pct}% écoulé',
    en: '{pct}% elapsed',
    es: '{pct}% transcurrido',
    de: '{pct}% vergangen',
    pt: '{pct}% decorrido',
  },
  /** Jours restants ({n}, pluriel ≥ 2 ou 0). Le singulier a son entrée dédiée. */
  sDaysLeft: {
    fr: '{n} jours restants',
    en: '{n} days left',
    es: '{n} días restantes',
    de: 'noch {n} Tage',
    pt: '{n} dias restantes',
  },
  /** Singulier du dernier jour (`joursRestants === 1`) — accord grammatical. */
  sDayLeft: {
    fr: '{n} jour restant',
    en: '{n} day left',
    es: '{n} día restante',
    de: 'noch {n} Tag',
    pt: '{n} dia restante',
  },
  /** État « aucune saison active » — statut (jamais une date inventée). */
  sNotOpen: {
    fr: 'Pas encore ouverte',
    en: 'Not open yet',
    es: 'Aún no abierta',
    de: 'Noch nicht offen',
    pt: 'Ainda não aberta',
  },
  /** …et l'indice qui l'accompagne : on promet la date, on ne la fabrique pas. */
  sNotOpenHint: {
    fr: 'La date arrive.',
    en: 'The date is coming.',
    es: 'La fecha llegará pronto.',
    de: 'Das Datum kommt.',
    pt: 'A data está chegando.',
  },
  /** Chargement — n'affirme RIEN sur l'existence d'une saison. */
  sLoading: {
    fr: 'Lecture de la saison…',
    en: 'Reading the season…',
    es: 'Leyendo la temporada…',
    de: 'Saison wird gelesen…',
    pt: 'Lendo a temporada…',
  },
  /** Échec de lecture ≠ « aucune saison » : on dit l'échec, on propose de relire. */
  sErrorTitle: {
    fr: 'Saison indisponible',
    en: 'Season unavailable',
    es: 'Temporada no disponible',
    de: 'Saison nicht verfügbar',
    pt: 'Temporada indisponível',
  },
  sErrorBody: {
    fr: 'Impossible de lire la saison pour l’instant.',
    en: 'Can’t read the season right now.',
    es: 'No se puede leer la temporada ahora mismo.',
    de: 'Die Saison lässt sich gerade nicht lesen.',
    pt: 'Não dá para ler a temporada agora.',
  },
  sRetry: {
    fr: 'Réessayer',
    en: 'Retry',
    es: 'Reintentar',
    de: 'Erneut versuchen',
    pt: 'Tentar de novo',
  },

  // ─── RÈGLES des saisons (bloc « Saisons » de la FAQ) ───────────────────────
  /** Libellé de groupe (MAJUSCULES via style, comme les autres catégories). */
  sGroup: {
    fr: 'Saisons',
    en: 'Seasons',
    es: 'Temporadas',
    de: 'Saisons',
    pt: 'Temporadas',
  },
  sQHow: {
    fr: 'Comment marchent les saisons ?',
    en: 'How do seasons work?',
    es: '¿Cómo funcionan las temporadas?',
    de: 'Wie funktionieren Saisons?',
    pt: 'Como funcionam as temporadas?',
  },
  /** {weeks} = SEASON_DURATION_WEEKS. */
  sAHow: {
    fr: 'Une saison dure {weeks} semaines, ville par ville. Tes zones et celles de ton crew comptent pour le classement de ta ville.',
    en: 'A season lasts {weeks} weeks, city by city. Your zones and your crew’s count toward your city’s ranking.',
    es: 'Una temporada dura {weeks} semanas, ciudad por ciudad. Tus zonas y las de tu crew cuentan para la clasificación de tu ciudad.',
    de: 'Eine Saison dauert {weeks} Wochen, Stadt für Stadt. Deine Zonen und die deiner Crew zählen für die Rangliste deiner Stadt.',
    pt: 'Uma temporada dura {weeks} semanas, cidade por cidade. Suas zonas e as do seu crew contam para o ranking da sua cidade.',
  },
  sQEnd: {
    fr: 'Que se passe-t-il à la fin d’une saison ?',
    en: 'What happens at the end of a season?',
    es: '¿Qué pasa al final de una temporada?',
    de: 'Was passiert am Ende einer Saison?',
    pt: 'O que acontece no fim de uma temporada?',
  },
  /** {days} = INTERSEASON_DAYS. Décrit season_close : gel des classements,
   *  récompenses, puis reset du TERRITOIRE (le reste — compte/badges/XP/stats —
   *  n'est pas touché). Ne promet rien au-delà de ce que fait le cron. */
  sAEnd: {
    fr: 'À la clôture, les classements sont gelés et les récompenses remises. Puis, après {days} jours d’intersaison, le territoire repart à zéro. Ton compte, tes badges, ton XP et tes stats, eux, restent.',
    en: 'At close, rankings freeze and rewards go out. Then, after {days} days of off-season, the territory resets to zero. Your account, badges, XP and stats stay.',
    es: 'Al cierre, las clasificaciones se congelan y se entregan las recompensas. Luego, tras {days} días de intertemporada, el territorio vuelve a cero. Tu cuenta, tus insignias, tu XP y tus stats se mantienen.',
    de: 'Zum Abschluss werden die Ranglisten eingefroren und Belohnungen verteilt. Dann, nach {days} Tagen Pause, wird das Gebiet auf null zurückgesetzt. Dein Konto, deine Abzeichen, dein XP und deine stats bleiben.',
    pt: 'No encerramento, os rankings são congelados e as recompensas entregues. Depois, após {days} dias de intertemporada, o território volta a zero. Sua conta, seus emblemas, seu XP e suas stats permanecem.',
  },
  sQBetween: {
    fr: 'Il y a une pause entre deux saisons ?',
    en: 'Is there a break between seasons?',
    es: '¿Hay una pausa entre temporadas?',
    de: 'Gibt es eine Pause zwischen den Saisons?',
    pt: 'Há uma pausa entre as temporadas?',
  },
  /** {days} = INTERSEASON_DAYS. */
  sABetween: {
    fr: 'Oui : {days} jours d’intersaison. Les résultats tombent, tu souffles, puis la ville rouvre à la conquête.',
    en: 'Yes: {days} days of off-season. Results come in, you catch your breath, then the city reopens for conquest.',
    es: 'Sí: {days} días de intertemporada. Llegan los resultados, respiras, y luego la ciudad se reabre a la conquista.',
    de: 'Ja: {days} Tage Pause. Die Ergebnisse kommen, du holst Luft, dann öffnet die Stadt wieder zur Eroberung.',
    pt: 'Sim: {days} dias de intertemporada. Os resultados chegam, você respira, e a cidade reabre para a conquista.',
  },
});
