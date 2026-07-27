/**
 * GRYD — i18n : catalogue de l'écran E26 « Fin d'activité »
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1234-1252).
 *
 * Feuille basse posée sur l'activité : temps, distance, objectif détecté, puis
 * DEUX commandes — `TERMINER ET ANALYSER` (unique CTA chartreuse, §A) et
 * `REPRENDRE` (secondaire). Le tap finalise localement et ouvre E27.
 *
 * ─── REGISTRE ───────────────────────────────────────────────────────────────
 * Tutoiement fr, « tú » es, « du » de, « você » pt-BR (jamais teu/tua).
 * §A : les deux libellés d'action tiennent sur une ligne à 375 px dans les cinq
 * langues — l'allemand est volontairement concis (« Beenden & auswerten »),
 * jamais un composé à rallonge qui se ferait couper.
 *
 * ─── L'OBJECTIF EST DÉTECTÉ, PAS DEVINÉ ─────────────────────────────────────
 * « objectif détecté » (spec l.1243) : les quatre valeurs ci-dessous se
 * DÉRIVENT de l'intention déclarée au départ et de ce que la sortie a fait,
 * jamais d'une supposition d'écran. `objectiveUnknown` existe précisément pour
 * le cas où rien de sûr n'est lisible : on affiche l'absence plutôt qu'un
 * objectif plausible. Aucun de ces libellés n'annonce un RÉSULTAT — le verdict
 * est serveur, il arrive en E27 puis sur le Résultat.
 *
 * ─── LE PLANCHER §3.2, DIT AVANT DE TERMINER ────────────────────────────────
 * « `Terminer` demande confirmation uniquement si l'activité est trop courte
 * pour produire un résultat » (spec l.1194). Le test est
 * `activityProducesResult()` (game-rules.ts) — les MÊMES minima que le serveur.
 * `tooShortTitle`/`tooShortBody` ne culpabilisent pas et ne chiffrent pas le
 * seuil : donner « il te manque 240 m » supposerait que l'écran connaisse la
 * distance restante à la seconde près, et transformerait une sortie écourtée
 * (blessure, fatigue) en échec mesuré.
 *
 * ─── CE QUI N'EST PAS PROMIS ────────────────────────────────────────────────
 * La spec écrit « chiffre les données » (l.1251). Aucune clé de ce fichier ne
 * l'affirme : le chiffrement local n'est pas implémenté à ce jour, et une
 * promesse de sécurité écrite avant le code est la faute la plus chère du
 * registre. Le jour où il existe, la phrase s'ajoute ici avec sa preuve.
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Entête ────────────────────────────────────────────────────────────────
  title: {
    fr: 'Fin de sortie',
    en: 'End of outing',
    es: 'Fin de la salida',
    de: 'Ende der Aktivität',
    pt: 'Fim da atividade',
  },
  /** a11y de la feuille : dit ce qu'elle propose, pas ce qu'elle est. */
  a11ySheet: {
    fr: 'Terminer ou reprendre ta sortie',
    en: 'Finish or resume your outing',
    es: 'Terminar o reanudar tu salida',
    de: 'Aktivität beenden oder fortsetzen',
    pt: 'Terminar ou retomar sua atividade',
  },

  // ── Les deux mesures ──────────────────────────────────────────────────────
  timeLabel: {
    fr: 'Temps',
    en: 'Time',
    es: 'Tiempo',
    de: 'Zeit',
    pt: 'Tempo',
  },
  distanceLabel: {
    fr: 'Distance',
    en: 'Distance',
    es: 'Distancia',
    de: 'Distanz',
    pt: 'Distância',
  },

  // ── Objectif détecté (quatre valeurs, aucune supposition) ─────────────────
  objectiveLabel: {
    fr: 'Objectif',
    en: 'Objective',
    es: 'Objetivo',
    de: 'Ziel',
    pt: 'Objetivo',
  },
  objectiveConquest: {
    fr: 'Conquête',
    en: 'Conquest',
    es: 'Conquista',
    de: 'Eroberung',
    pt: 'Conquista',
  },
  objectiveDefense: {
    fr: 'Défense',
    en: 'Defence',
    es: 'Defensa',
    de: 'Verteidigung',
    pt: 'Defesa',
  },
  /** Sortie libre assumée — ce n'est pas un manque. */
  objectiveFree: {
    fr: 'Sortie libre',
    en: 'Free outing',
    es: 'Salida libre',
    de: 'Freie Aktivität',
    pt: 'Atividade livre',
  },
  /** Rien de lisible : on le dit au lieu d'afficher un objectif plausible. */
  objectiveUnknown: {
    fr: 'Objectif non déterminé',
    en: 'Objective not determined',
    es: 'Objetivo no determinado',
    de: 'Ziel nicht bestimmt',
    pt: 'Objetivo não determinado',
  },

  // ── Les deux commandes ────────────────────────────────────────────────────
  /** UNIQUE CTA chartreuse de la feuille (§A4). */
  finishCta: {
    fr: 'TERMINER ET ANALYSER',
    en: 'FINISH AND ANALYSE',
    es: 'TERMINAR Y ANALIZAR',
    de: 'BEENDEN & AUSWERTEN',
    pt: 'TERMINAR E ANALISAR',
  },
  finishA11y: {
    fr: 'Terminer la sortie et lancer l’analyse',
    en: 'Finish the outing and start the analysis',
    es: 'Terminar la salida e iniciar el análisis',
    de: 'Aktivität beenden und Auswertung starten',
    pt: 'Terminar a atividade e iniciar a análise',
  },
  resumeCta: {
    fr: 'REPRENDRE',
    en: 'RESUME',
    es: 'REANUDAR',
    de: 'FORTSETZEN',
    pt: 'RETOMAR',
  },
  resumeA11y: {
    fr: 'Reprendre la sortie en cours',
    en: 'Resume the outing in progress',
    es: 'Reanudar la salida en curso',
    de: 'Laufende Aktivität fortsetzen',
    pt: 'Retomar a atividade em curso',
  },

  // ── Confirmation quand la sortie est sous le plancher §3.2 ────────────────
  tooShortTitle: {
    fr: 'Trop court pour être analysé',
    en: 'Too short to be analysed',
    es: 'Demasiado corto para analizarse',
    de: 'Zu kurz für eine Auswertung',
    pt: 'Curto demais para ser analisado',
  },
  /**
   * Le fait, puis le choix. Aucun chiffre : le seuil exact est une règle
   * serveur, et l'annoncer ici inviterait à courir « juste ce qu'il faut ».
   */
  tooShortBody: {
    fr: 'Cette sortie est trop courte pour produire un résultat. Tu peux la terminer quand même : elle reste dans ton historique.',
    en: 'This outing is too short to produce a result. You can still finish it: it stays in your history.',
    es: 'Esta salida es demasiado corta para dar un resultado. Puedes terminarla igual: queda en tu historial.',
    de: 'Diese Aktivität ist zu kurz für ein Ergebnis. Du kannst sie trotzdem beenden: Sie bleibt in deinem Verlauf.',
    pt: 'Esta atividade é curta demais para gerar um resultado. Você pode terminá-la mesmo assim: ela fica no seu histórico.',
  },
  tooShortConfirm: {
    fr: 'Terminer quand même',
    en: 'Finish anyway',
    es: 'Terminar igualmente',
    de: 'Trotzdem beenden',
    pt: 'Terminar mesmo assim',
  },
  tooShortCancel: {
    fr: 'Continuer la sortie',
    en: 'Keep going',
    es: 'Seguir la salida',
    de: 'Weitermachen',
    pt: 'Continuar a atividade',
  },
});
