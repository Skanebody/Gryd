/**
 * GRYD — i18n : catalogue de l'écran E22 « Défense active »
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1163-1182).
 *
 * E22 n'est pas un écran de plus : c'est la VARIANTE défense de l'activité en
 * cours (E20 Run / E21 Bike). Les métriques, la pause et le GPS restent ceux de
 * `runGps.ts` — ce fichier ne porte QUE ce que la défense ajoute :
 * contour de la zone contestée, jauge de couverture, temps restant, libellé
 * `DÉFENSE`, et le feedback de couverture suffisante.
 *
 * ⚠ COLLISION DE NUMÉROTATION (ARBITRAGES_SPEC_2026.md A4) : le dépôt appelle
 * déjà « E22 » la planche Vague 1 « Défense · zone attaquée » (la feuille de
 * carte, `features/map/DefenseZoneSheet.tsx`, catalogue `map.ts`). Ici, E22 =
 * la NOUVELLE numérotation, qui fait foi : l'activité en cours en mode défense.
 * Les deux surfaces ne partagent aucun texte, volontairement — l'une prépare
 * une sortie, l'autre se lit en courant.
 *
 * ─── REGISTRE ───────────────────────────────────────────────────────────────
 * Tutoiement fr, « tú » es, « du » de, « você » pt-BR (jamais teu/tua).
 * Libellés COURTS dans les 5 langues (§A : jamais de texte d'action coupé), et
 * lisibles EN MOUVEMENT — c'est le seul écran qu'on lit en courant.
 *
 * ─── « AUCUNE BARRE AGRESSIVE OU ALARMISTE » (spec l.1173) ──────────────────
 * Aucune phrase ne menace, ne compte à rebours à la seconde, ni ne parle de
 * perte. Le temps restant est un FAIT (« il te reste ~6 h »), la couverture est
 * un FAIT, et la conclusion appartient au joueur. Aucune couleur d'alarme n'est
 * suggérée par la copie : le rouge est réservé à l'erreur système.
 *
 * ─── CE QUE CET ÉCRAN NE PROMET PAS ────────────────────────────────────────
 * Que la zone est sauvée. « La validation finale reste serveur » (spec l.1182)
 * est une phrase de la spec ET une règle de la constitution (« tout claim est
 * décidé serveur ») : `serverDecides` la dit à l'écran, et aucune autre clé ne
 * la contredit — pas un « zone sauvée », pas un « défense réussie ».
 *
 * ─── QUATRE ÉTATS DE L'ÉCHÉANCE, JAMAIS CONFONDUS ──────────────────────────
 * `deadlineIn` (lue, à venir) · `deadlineSoon` (imminente, dite sans alarme) ·
 * `deadlineLoading` (lecture EN COURS — n'affirme rien) · `deadlineUnknown`
 * (aucune échéance lisible : on se tait plutôt que d'inventer une durée).
 */
import { defineCatalog } from '../types';

export const C = defineCatalog({
  // ── Identité de l'écran ───────────────────────────────────────────────────
  /** Le libellé `DÉFENSE` de la spec (l.1172) — pill permanente de l'activité. */
  kicker: {
    fr: 'DÉFENSE',
    en: 'DEFENCE',
    es: 'DEFENSA',
    de: 'VERTEIDIGUNG',
    pt: 'DEFESA',
  },
  /** Lu à voix haute sur la pill : dit ce que la sortie est en train de faire. */
  a11yMode: {
    fr: 'Sortie en cours en mode défense',
    en: 'Outing in progress in defence mode',
    es: 'Salida en curso en modo defensa',
    de: 'Laufende Aktivität im Verteidigungsmodus',
    pt: 'Atividade em curso no modo defesa',
  },
  /** a11y du contour de la zone défendue dessiné sur la carte. */
  a11yZoneOutline: {
    fr: 'Contour de la zone que tu défends',
    en: 'Outline of the zone you are defending',
    es: 'Contorno de la zona que defiendes',
    de: 'Umriss der Zone, die du verteidigst',
    pt: 'Contorno da zona que você defende',
  },

  // ── Jauge de couverture (moteur pur engine/coverage.ts) ───────────────────
  /** Titre de la jauge — une MESURE, pas un score. */
  coverageLabel: {
    fr: 'Frontière couverte',
    en: 'Border covered',
    es: 'Frontera cubierta',
    de: 'Grenze abgedeckt',
    pt: 'Fronteira coberta',
  },
  /**
   * Aucune portion de frontière longée pour l'instant. Ce n'est PAS « 0 % » nu :
   * la phrase dit quoi faire, sans reproche.
   */
  coverageNone: {
    fr: 'Longe ta zone pour la couvrir',
    en: 'Run along your zone to cover it',
    es: 'Bordea tu zona para cubrirla',
    de: 'Lauf an deiner Zone entlang, um sie abzudecken',
    pt: 'Contorne sua zona para cobri-la',
  },
  /** Palier 1 (`traverse`) — la zone a été traversée. */
  coverageTraverse: {
    fr: 'Zone traversée',
    en: 'Zone crossed',
    es: 'Zona atravesada',
    de: 'Zone durchquert',
    pt: 'Zona atravessada',
  },
  /** Palier 2 (`longe`) — une bonne part de la frontière a été longée. */
  coverageLonge: {
    fr: 'Frontière longée',
    en: 'Border followed',
    es: 'Frontera bordeada',
    de: 'Grenze entlanggelaufen',
    pt: 'Fronteira contornada',
  },
  /** Palier 3 (`cover`) — la frontière est couverte. */
  coverageFull: {
    fr: 'Frontière couverte',
    en: 'Border covered',
    es: 'Frontera cubierta',
    de: 'Grenze abgedeckt',
    pt: 'Fronteira coberta',
  },
  /**
   * Le feedback exact de la spec (l.1180), servi À L'INSTANT où la couverture
   * devient suffisante — avec l'haptique succès, jamais une alerte.
   */
  defensePossible: {
    fr: 'Défense possible — termine la boucle',
    en: 'Defence possible — close the loop',
    es: 'Defensa posible — cierra el bucle',
    de: 'Verteidigung möglich — schließ die Schleife',
    pt: 'Defesa possível — feche o circuito',
  },
  /** a11y de la jauge : la valeur en toutes lettres pour un lecteur d'écran. */
  a11yCoverage: {
    fr: 'Couverture de la frontière : {label}',
    en: 'Border coverage: {label}',
    es: 'Cobertura de la frontera: {label}',
    de: 'Grenzabdeckung: {label}',
    pt: 'Cobertura da fronteira: {label}',
  },

  // ── Échéance (les quatre états, jamais confondus) ──────────────────────────
  /** Échéance lue et lointaine — un fait, sans compte à rebours anxiogène. */
  deadlineIn: {
    fr: 'Il te reste environ {hours} h',
    en: 'About {hours} h left',
    es: 'Te quedan unas {hours} h',
    de: 'Noch etwa {hours} Std.',
    pt: 'Faltam cerca de {hours} h',
  },
  /** Échéance proche — dite calmement (moins d'une heure pleine). */
  deadlineSoon: {
    fr: 'Échéance dans moins d’une heure',
    en: 'Deadline in under an hour',
    es: 'Vence en menos de una hora',
    de: 'Frist in weniger als einer Stunde',
    pt: 'Prazo em menos de uma hora',
  },
  /** LECTURE EN COURS — n'affirme rien sur le temps restant. */
  deadlineLoading: {
    fr: 'Lecture de l’échéance…',
    en: 'Reading the deadline…',
    es: 'Leyendo el plazo…',
    de: 'Frist wird gelesen…',
    pt: 'Lendo o prazo…',
  },
  /**
   * ÉCHÉANCE DÉPASSÉE — la quatrième forme de `defenseDeadlineDisplay`, qui
   * n'avait AUCUNE phrase jusqu'au 27/07 et retombait donc sur `deadlineUnknown`
   * (« échéance inconnue »), une copie réservée à une échéance ILLISIBLE. Le
   * scénario est certain : la liste des contestations est lue UNE seule fois, au
   * premier fix, tandis que l'échéance est recalculée à chaque rendu avec
   * l'horloge — un coureur qui franchit l'échéance en pleine sortie voyait donc
   * la pill DÉFENSE, la jauge violette et « validée par le serveur » continuer à
   * lui promettre une défense déjà résolue. On dit ce qui est, et on dit surtout
   * ce qui reste vrai : la sortie, elle, continue de s'enregistrer.
   */
  deadlinePassed: {
    fr: 'Échéance dépassée : cette défense n’a plus d’effet. Ta sortie continue d’être enregistrée.',
    en: 'Deadline passed: this defence no longer counts. Your outing is still being recorded.',
    es: 'Plazo vencido: esta defensa ya no cuenta. Tu salida se sigue registrando.',
    de: 'Frist abgelaufen: Diese Verteidigung zählt nicht mehr. Deine Aktivität wird weiter aufgezeichnet.',
    pt: 'Prazo encerrado: esta defesa não conta mais. Sua atividade continua sendo registrada.',
  },
  /** Aucune échéance lisible : on ne fabrique pas une durée. */
  deadlineUnknown: {
    fr: 'Échéance inconnue pour l’instant',
    en: 'Deadline unknown for now',
    es: 'Plazo desconocido por ahora',
    de: 'Frist derzeit unbekannt',
    pt: 'Prazo desconhecido por enquanto',
  },

  // ── Ce que l'écran ne décide pas ──────────────────────────────────────────
  /**
   * « La validation finale reste serveur » (spec l.1182). Phrase discrète, mais
   * elle doit être là : sans elle, la jauge se lirait comme un verdict.
   */
  serverDecides: {
    fr: 'La défense est validée par le serveur à la fin de la sortie.',
    en: 'The defence is validated by the server when the outing ends.',
    es: 'La defensa la valida el servidor al terminar la salida.',
    de: 'Die Verteidigung wird am Ende der Aktivität vom Server bestätigt.',
    pt: 'A defesa é validada pelo servidor no fim da atividade.',
  },
  /**
   * La zone défendue n'est plus lisible en cours de sortie (réseau coupé,
   * lecture échouée). L'activité CONTINUE d'enregistrer — c'est le seul point
   * qui compte, et l'écran le dit au lieu d'afficher une jauge figée qui
   * mentirait par immobilité.
   */
  zoneUnavailable: {
    fr: 'Zone illisible pour l’instant — ta sortie continue d’être enregistrée.',
    en: 'Zone unreadable for now — your outing is still being recorded.',
    es: 'Zona ilegible por ahora — tu salida se sigue registrando.',
    de: 'Zone derzeit nicht lesbar — deine Aktivität wird weiter aufgezeichnet.',
    pt: 'Zona ilegível por enquanto — sua atividade continua sendo gravada.',
  },
});
