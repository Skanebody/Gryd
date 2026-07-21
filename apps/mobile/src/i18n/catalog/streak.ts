/**
 * GRYD — i18n : catalogue du domaine « série » (LOT 1 « LA SÉRIE VISIBLE »).
 * Parité 5 langues imposée par le type. Ton : tutoiement fr · « du » de ·
 * « tú » es · « você » pt informel · en direct.
 *
 * RÈGLE ANTI-SHAME (§11) STRICTE ICI : une série rompue ne se dit JAMAIS
 * « tu as tout perdu », « tu as échoué », « dommage ». Le seul message est :
 * ce qui compte, c'est de repartir. Aucune formule ne culpabilise un joueur qui
 * a raté une semaine. Le record passé est rappelé comme une PREUVE de capacité,
 * jamais comme un regret.
 *
 * Pluriels : deux entrées séparées (…One / …Many) plutôt qu'une règle de pluriel
 * — le catalogue reste du texte, jamais de la logique.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ─── Bloc série (Aujourd'hui + résultat de course) ────────────────────────
  streakKicker: {
    fr: 'TA SÉRIE',
    en: 'YOUR STREAK',
    es: 'TU RACHA',
    de: 'DEINE SERIE',
    pt: 'SUA SÉRIE',
  },
  streakWeeksOne: {
    fr: '1 semaine',
    en: '1 week',
    es: '1 semana',
    de: '1 Woche',
    pt: '1 semana',
  },
  streakWeeksMany: {
    fr: '{n} semaines',
    en: '{n} weeks',
    es: '{n} semanas',
    de: '{n} Wochen',
    pt: '{n} semanas',
  },
  /** Série en cours, semaine déjà validée. */
  streakActive: {
    fr: 'Semaine validée. Tes points sont multipliés par {m}.',
    en: 'Week secured. Your points are multiplied by {m}.',
    es: 'Semana validada. Tus puntos se multiplican por {m}.',
    de: 'Woche gesichert. Deine Punkte werden mit {m} multipliziert.',
    pt: 'Semana validada. Seus pontos são multiplicados por {m}.',
  },
  /** Série acquise, semaine en cours pas encore validée — invitation, pas menace. */
  streakAtRiskOne: {
    fr: 'Encore 1 course cette semaine pour la prolonger.',
    en: '1 more run this week to keep it going.',
    es: '1 carrera más esta semana para continuarla.',
    de: 'Noch 1 Lauf diese Woche, um sie fortzusetzen.',
    pt: 'Mais 1 corrida esta semana para continuar.',
  },
  streakAtRiskMany: {
    fr: 'Encore {n} courses cette semaine pour la prolonger.',
    en: '{n} more runs this week to keep it going.',
    es: '{n} carreras más esta semana para continuarla.',
    de: 'Noch {n} Läufe diese Woche, um sie fortzusetzen.',
    pt: 'Mais {n} corridas esta semana para continuar.',
  },
  /** Semaine couverte par un gel réellement activé. */
  /**
   * Le gel protège la série AFFICHÉE, jamais le multiplicateur de points
   * (correctif anti-pay-to-win 21/07 : un gel s'achète, des points non). La
   * copie doit le dire — promettre une protection plus large que la réalité
   * serait un mensonge, et laisser croire qu'on achète des points serait pire.
   */
  streakFrozen: {
    fr: 'Semaine protégée : ta série continue. Le multiplicateur, lui, ne compte que les semaines courues.',
    en: 'Week protected: your streak keeps going. The multiplier only counts weeks you actually ran.',
    es: 'Semana protegida: tu racha continúa. El multiplicador solo cuenta las semanas corridas.',
    de: 'Woche geschützt: deine Serie läuft weiter. Der Multiplikator zählt nur gelaufene Wochen.',
    pt: 'Semana protegida: sua sequência continua. O multiplicador só conta as semanas corridas.',
  },
  /** Première(s) course(s), aucune semaine encore validée. */
  streakBuildingOne: {
    fr: 'Encore 1 course cette semaine et ta série démarre.',
    en: '1 more run this week and your streak starts.',
    es: '1 carrera más esta semana y tu racha empieza.',
    de: 'Noch 1 Lauf diese Woche und deine Serie startet.',
    pt: 'Mais 1 corrida esta semana e sua série começa.',
  },
  streakBuildingMany: {
    fr: 'Encore {n} courses cette semaine et ta série démarre.',
    en: '{n} more runs this week and your streak starts.',
    es: '{n} carreras más esta semana y tu racha empieza.',
    de: 'Noch {n} Läufe diese Woche und deine Serie startet.',
    pt: 'Mais {n} corridas esta semana e sua série começa.',
  },
  // ─── Série rompue — ANTI-SHAME (§11) ──────────────────────────────────────
  /** Titre : on nomme le futur, jamais la perte. */
  streakRestartTitle: {
    fr: 'Une nouvelle série',
    en: 'A new streak',
    es: 'Una nueva racha',
    de: 'Eine neue Serie',
    pt: 'Uma nova série',
  },
  streakRestartBody: {
    fr: 'Elle démarre à ta prochaine course. Rien à rattraper.',
    en: 'It starts on your next run. Nothing to catch up on.',
    es: 'Empieza en tu próxima carrera. Nada que recuperar.',
    de: 'Sie startet bei deinem nächsten Lauf. Nichts nachzuholen.',
    pt: 'Ela começa na sua próxima corrida. Nada a recuperar.',
  },
  /** Le record est une preuve de capacité, jamais un regret. */
  streakBestOne: {
    fr: 'Tu as déjà tenu 1 semaine.',
    en: 'You have already held 1 week.',
    es: 'Ya mantuviste 1 semana.',
    de: 'Du hast schon 1 Woche gehalten.',
    pt: 'Você já manteve 1 semana.',
  },
  streakBestMany: {
    fr: 'Tu as déjà tenu {n} semaines.',
    en: 'You have already held {n} weeks.',
    es: 'Ya mantuviste {n} semanas.',
    de: 'Du hast schon {n} Wochen gehalten.',
    pt: 'Você já manteve {n} semanas.',
  },
  // ─── Résultat de course ───────────────────────────────────────────────────
  /** Cette course vient de valider la semaine. */
  streakResultExtended: {
    fr: 'Semaine validée par cette course.',
    en: 'This run secured your week.',
    es: 'Esta carrera validó tu semana.',
    de: 'Dieser Lauf hat deine Woche gesichert.',
    pt: 'Esta corrida validou sua semana.',
  },
  /** Accessibilité : la série lue d'un bloc. */
  streakA11y: {
    fr: 'Ta série : {weeks}. {detail}',
    en: 'Your streak: {weeks}. {detail}',
    es: 'Tu racha: {weeks}. {detail}',
    de: 'Deine Serie: {weeks}. {detail}',
    pt: 'Sua série: {weeks}. {detail}',
  },
});
