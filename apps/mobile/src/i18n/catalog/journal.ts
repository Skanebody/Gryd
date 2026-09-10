/**
 * GRYD — i18n : catalogue du domaine JOURNAL (détail d'une sortie, splits,
 * courbe d'allure, profil d'altitude, vignettes du journal).
 *
 * Nouveau catalogue (10/09/2026). Il naît avec le chantier « journal et détail
 * de sortie » : jusque-là, le détail d'une sortie n'avait ni tracé, ni split,
 * ni courbe — il DISAIT même qu'aucun tracé n'existait, alors que `ingest_run`
 * en persiste deux formes depuis juillet. Les libellés qui manquaient sont ici,
 * en 5 langues (parité imposée par le type `Entry`).
 *
 * ─── VOCABULAIRE, ALIGNÉ SUR LES CATALOGUES EXISTANTS ───────────────────────
 * · « split » se dit « split » en français comme en anglais : c'est le mot
 *   qu'emploient les coureurs francophones, y compris dans les applications
 *   qu'ils utilisent déjà. On ne traduit pas un mot que la pratique a adopté
 *   (même régime que GRYD, GO, km, GPS, Crew).
 * · « sortie » (fr) / « outing » (en) / « salida » (es) / « Aktivität » (de) /
 *   « saída » (pt) : le vocabulaire NEUTRE aux deux disciplines, déjà fixé par
 *   `catalog/historique.ts`.
 * · « allure » pour la course, « vitesse » pour le vélo : la matrice sportive
 *   du cahier §8.2. Les deux existent ici, l'écran choisit par `Activity`.
 *
 * ─── CE QUE CE CATALOGUE NE CONTIENT PAS ────────────────────────────────────
 * Aucune phrase qui promette une mesure absente : pas de « calories », pas de
 * « fréquence cardiaque », pas de « puissance ». Aucune source ne les fournit
 * (cahier §8.2 : « aucun champ vide n'est remplacé par une fréquence cardiaque,
 * une puissance ou des calories inventées »). Le jour où une source existera,
 * les libellés arriveront AVEC elle.
 */
import { defineCatalog } from '../types';
import type { Entry } from '../types';
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';

export const C = defineCatalog({
  // ─── LA TRACE ─────────────────────────────────────────────────────────────
  /** Ni points complets ni trace masquée : la sortie garde ses chiffres. */
  traceNone: {
    fr: 'Tracé non disponible pour cette sortie. Ses mesures, elles, sont conservées.',
    en: 'No route available for this outing. Its measurements are kept.',
    es: 'No hay trazado disponible para esta salida. Sus mediciones se conservan.',
    de: 'Für diese Aktivität ist keine Strecke verfügbar. Ihre Messwerte bleiben erhalten.',
    pt: 'Traçado indisponível para esta saída. As medições continuam salvas.',
  },
  /**
   * Trace masquée : géométrie seule, extrémités retirées.
   *
   * ⚠️ CORRIGÉ LE 11/09/2026. Cette phrase se terminait par « et elle s'efface
   * au bout de 90 jours ». C'était vrai tant que le job `gryd_purge_polylines`
   * (0102) effaçait `polyline_masked` pour tout le monde. Depuis 0195/0196, la
   * conservation est un CHOIX du joueur dont le défaut est « tout garder » :
   * annoncer une échéance de 90 jours à quelqu'un qui n'a rien réglé serait
   * devenu faux le jour du déploiement. La phrase ne dit plus que ce qui vaut
   * pour TOUT LE MONDE ; la durée, elle, se règle et se lit dans Confidentialité.
   */
  traceMasked: {
    fr: 'Trace protégée : les abords du départ et de l’arrivée sont retirés.',
    en: 'Protected route: the areas around the start and finish are removed.',
    es: 'Trazado protegido: se quitan los alrededores de la salida y la llegada.',
    de: 'Geschützte Strecke: die Bereiche um Start und Ziel werden entfernt.',
    pt: 'Traçado protegido: os arredores da partida e da chegada são removidos.',
  },
  /** Trace masquée : pas d'horodatage, donc pas de split ni de courbe. */
  traceMaskedNoTiming: {
    fr: 'Cette trace ne porte pas de temps : ni split ni courbe d’allure pour cette sortie.',
    en: 'This route carries no timing: no splits and no pace curve for this outing.',
    es: 'Este trazado no lleva tiempos: sin splits ni curva de ritmo para esta salida.',
    de: 'Diese Strecke enthält keine Zeiten: keine Splits und keine Pace-Kurve für diese Aktivität.',
    pt: 'Este traçado não tem tempos: sem splits nem curva de ritmo para esta saída.',
  },

  // ─── SPLITS ───────────────────────────────────────────────────────────────
  splitsLabel: {
    fr: 'Splits',
    en: 'Splits',
    es: 'Splits',
    de: 'Splits',
    pt: 'Splits',
  },
  splitsColumnKm: {
    fr: 'Km',
    en: 'Km',
    es: 'Km',
    de: 'Km',
    pt: 'Km',
  },
  splitsColumnTime: {
    fr: 'Temps',
    en: 'Time',
    es: 'Tiempo',
    de: 'Zeit',
    pt: 'Tempo',
  },
  splitsBest: {
    fr: 'Meilleur km',
    en: 'Fastest km',
    es: 'Mejor km',
    de: 'Schnellster km',
    pt: 'Melhor km',
  },
  /** Le kilomètre entamé : sa distance réelle, pour qu'on ne le compare pas. */
  splitsPartial: {
    fr: 'dernier {m} m',
    en: 'last {m} m',
    es: 'últimos {m} m',
    de: 'letzte {m} m',
    pt: 'últimos {m} m',
  },
  splitsNote: {
    fr: 'Calculés sur la trace enregistrée, avec la règle du serveur : un silence GPS ne compte pas.',
    en: 'Computed from the recorded route, with the server rule: a GPS gap does not count.',
    es: 'Calculados sobre el trazado registrado, con la regla del servidor: un silencio de GPS no cuenta.',
    de: 'Aus der aufgezeichneten Strecke berechnet, nach der Serverregel: eine GPS-Lücke zählt nicht.',
    pt: 'Calculados sobre o traçado gravado, com a regra do servidor: um silêncio de GPS não conta.',
  },

  // ─── COURBE D'ALLURE / DE VITESSE ─────────────────────────────────────────
  paceCurveLabel: {
    fr: 'Allure sur le parcours',
    en: 'Pace along the route',
    es: 'Ritmo a lo largo del recorrido',
    de: 'Pace über die Strecke',
    pt: 'Ritmo ao longo do percurso',
  },
  speedCurveLabel: {
    fr: 'Vitesse sur le parcours',
    en: 'Speed along the route',
    es: 'Velocidad a lo largo del recorrido',
    de: 'Geschwindigkeit über die Strecke',
    pt: 'Velocidade ao longo do percurso',
  },
  paceCurveNote: {
    fr: 'Lissée sur {m} m. Le haut de la courbe est le plus rapide.',
    en: 'Smoothed over {m} m. The top of the curve is the fastest.',
    es: 'Suavizada en {m} m. La parte alta de la curva es la más rápida.',
    de: 'Über {m} m geglättet. Oben in der Kurve ist am schnellsten.',
    pt: 'Suavizada em {m} m. O topo da curva é o mais rápido.',
  },
  paceCurveA11y: {
    fr: 'Courbe d’allure sur {km}. La plus rapide : {best}. La plus lente : {worst}.',
    en: 'Pace curve over {km}. Fastest: {best}. Slowest: {worst}.',
    es: 'Curva de ritmo en {km}. El más rápido: {best}. El más lento: {worst}.',
    de: 'Pace-Kurve über {km}. Am schnellsten: {best}. Am langsamsten: {worst}.',
    pt: 'Curva de ritmo em {km}. O mais rápido: {best}. O mais lento: {worst}.',
  },

  // ─── ALTITUDE ─────────────────────────────────────────────────────────────
  elevationLabel: {
    fr: 'Dénivelé',
    en: 'Elevation',
    es: 'Desnivel',
    de: 'Höhenmeter',
    pt: 'Desnível',
  },
  elevationGain: {
    fr: 'Dénivelé positif',
    en: 'Elevation gain',
    es: 'Desnivel positivo',
    de: 'Aufstieg',
    pt: 'Ganho de elevação',
  },
  elevationLoss: {
    fr: 'Dénivelé négatif',
    en: 'Elevation loss',
    es: 'Desnivel negativo',
    de: 'Abstieg',
    pt: 'Perda de elevação',
  },
  elevationA11y: {
    fr: 'Profil d’altitude : de {min} à {max}.',
    en: 'Elevation profile: from {min} to {max}.',
    es: 'Perfil de altitud: de {min} a {max}.',
    de: 'Höhenprofil: von {min} bis {max}.',
    pt: 'Perfil de altitude: de {min} a {max}.',
  },

  // ─── TEMPS ────────────────────────────────────────────────────────────────
  movingTime: {
    fr: 'Temps en mouvement',
    en: 'Moving time',
    es: 'Tiempo en movimiento',
    de: 'Bewegungszeit',
    pt: 'Tempo em movimento',
  },
  elapsedTime: {
    fr: 'Temps écoulé',
    en: 'Elapsed time',
    es: 'Tiempo transcurrido',
    de: 'Gesamtzeit',
    pt: 'Tempo decorrido',
  },
  avgSpeed: {
    fr: 'Vitesse moyenne',
    en: 'Average speed',
    es: 'Velocidad media',
    de: 'Durchschnittsgeschwindigkeit',
    pt: 'Velocidade média',
  },
  avgPace: {
    fr: 'Allure moyenne',
    en: 'Average pace',
    es: 'Ritmo medio',
    de: 'Durchschnitts-Pace',
    pt: 'Ritmo médio',
  },

  // ─── PARTAGE ──────────────────────────────────────────────────────────────
  shareCta: {
    fr: 'Partager cette sortie',
    en: 'Share this outing',
    es: 'Compartir esta salida',
    de: 'Diese Aktivität teilen',
    pt: 'Compartilhar esta saída',
  },
  /** Aucune trace : rien à mettre sur une image, et on le dit avant le tap. */
  shareNoTrace: {
    fr: 'Le partage a besoin d’un tracé : celui de cette sortie n’est plus disponible.',
    en: 'Sharing needs a route: this outing’s route is no longer available.',
    es: 'Compartir necesita un trazado: el de esta salida ya no está disponible.',
    de: 'Zum Teilen wird eine Strecke gebraucht: die dieser Aktivität ist nicht mehr verfügbar.',
    pt: 'Compartilhar precisa de um traçado: o desta saída não está mais disponível.',
  },

  // ─── JOURNAL (la liste) ───────────────────────────────────────────────────
  journalTitle: {
    fr: 'Journal',
    en: 'Journal',
    es: 'Diario',
    de: 'Journal',
    pt: 'Diário',
  },
  journalPending: {
    fr: 'À synchroniser',
    en: 'Sync pending',
    es: 'Pendiente de sincronizar',
    de: 'Synchronisierung ausstehend',
    pt: 'Sincronização pendente',
  },
  journalTerrainGained: {
    fr: 'terrain gagné',
    en: 'terrain gained',
    es: 'terreno ganado',
    de: 'Gebiet gewonnen',
    pt: 'terreno ganho',
  },
  journalShowAll: {
    fr: 'Toutes les sorties',
    en: 'All activities',
    es: 'Todas las salidas',
    de: 'Alle Aktivitäten',
    pt: 'Todas as saídas',
  },
  journalShowLess: {
    fr: 'Réduire',
    en: 'Show less',
    es: 'Reducir',
    de: 'Weniger anzeigen',
    pt: 'Mostrar menos',
  },
  journalRowA11y: {
    fr: '{activity}, {date}, {distance}, {duration}.',
    en: '{activity}, {date}, {distance}, {duration}.',
    es: '{activity}, {date}, {distance}, {duration}.',
    de: '{activity}, {date}, {distance}, {duration}.',
    pt: '{activity}, {date}, {distance}, {duration}.',
  },

  // ─── STATISTIQUES (les graphiques) ────────────────────────────────────────
  weeklyDistance: {
    fr: 'Distance par semaine',
    en: 'Distance per week',
    es: 'Distancia por semana',
    de: 'Distanz pro Woche',
    pt: 'Distância por semana',
  },
  weeklyDistanceA11y: {
    fr: 'Distance des {n} dernières semaines. Meilleure semaine : {best}.',
    en: 'Distance over the last {n} weeks. Best week: {best}.',
    es: 'Distancia de las últimas {n} semanas. Mejor semana: {best}.',
    de: 'Distanz der letzten {n} Wochen. Beste Woche: {best}.',
    pt: 'Distância das últimas {n} semanas. Melhor semana: {best}.',
  },
  paceBySession: {
    fr: 'Allure moyenne par sortie',
    en: 'Average pace per outing',
    es: 'Ritmo medio por salida',
    de: 'Durchschnitts-Pace pro Aktivität',
    pt: 'Ritmo médio por saída',
  },
  speedBySession: {
    fr: 'Vitesse moyenne par sortie',
    en: 'Average speed per outing',
    es: 'Velocidad media por salida',
    de: 'Durchschnittsgeschwindigkeit pro Aktivität',
    pt: 'Velocidade média por saída',
  },
  sessionCurveA11y: {
    fr: '{n} sorties mesurées, de {first} à {last}.',
    en: '{n} measured outings, from {first} to {last}.',
    es: '{n} salidas medidas, de {first} a {last}.',
    de: '{n} gemessene Aktivitäten, von {first} bis {last}.',
    pt: '{n} saídas medidas, de {first} a {last}.',
  },
  /** Moins de deux sorties mesurées : une courbe de deux points ment. */
  notEnoughForCurve: {
    fr: 'Deux sorties mesurées suffisent à tracer une évolution. Il en manque encore.',
    en: 'Two measured outings are enough to draw a trend. Not there yet.',
    es: 'Dos salidas medidas bastan para trazar una evolución. Todavía faltan.',
    de: 'Zwei gemessene Aktivitäten reichen für einen Verlauf. Noch nicht so weit.',
    pt: 'Duas saídas medidas bastam para traçar uma evolução. Ainda faltam.',
  },
  activeDays: {
    fr: 'jours avec sortie',
    en: 'days with an outing',
    es: 'días con salida',
    de: 'Tage mit Aktivität',
    pt: 'dias com saída',
  },
});

/**
 * Les libellés qui NOMMENT la grandeur d'effort suivent la discipline (cahier
 * §8.2). Un `Record<Activity, …>` EXHAUSTIF plutôt qu'un ternaire : le jour
 * d'une troisième discipline, la compilation s'arrête ici au lieu de servir
 * silencieusement le vocabulaire du coureur à quelqu'un d'autre.
 */
export interface JournalRateCopy {
  /** « Allure moyenne » / « Vitesse moyenne ». */
  readonly average: Entry;
  /** Titre de la courbe. */
  readonly curve: Entry;
}

const JOURNAL_RATE_COPY: Readonly<Record<Activity, JournalRateCopy>> = {
  run: { average: C.avgPace, curve: C.paceCurveLabel },
  bike: { average: C.avgSpeed, curve: C.speedCurveLabel },
};

export function journalRateCopy(activity: Activity = DEFAULT_ACTIVITY): JournalRateCopy {
  return JOURNAL_RATE_COPY[activity] ?? JOURNAL_RATE_COPY[DEFAULT_ACTIVITY];
}

/** Le titre de la courbe « par sortie » de l'écran Statistiques. */
const SESSION_CURVE_COPY: Readonly<Record<Activity, Entry>> = {
  run: C.paceBySession,
  bike: C.speedBySession,
};

export function sessionCurveTitle(activity: Activity = DEFAULT_ACTIVITY): Entry {
  return SESSION_CURVE_COPY[activity] ?? SESSION_CURVE_COPY[DEFAULT_ACTIVITY];
}
