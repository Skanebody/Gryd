/**
 * GRYD — E14 « commutateur Run / Bike » : TOUTE la logique dérivée, en fonctions
 * PURES (zéro React, zéro stockage, zéro réseau) — donc testable sous Deno.
 *
 * La planche E14 dit quatre choses que du code doit tenir, et pas une copie :
 *   1. le commutateur est « présent sur toutes les pages utiles : carte,
 *      classements, historique, profil-stats » ;
 *   2. il est « visible seulement si Bike est activé ; masqué sinon, JAMAIS
 *      grisé » et « VERROUILLÉ pendant une course » ;
 *   3. « le choix est mémorisé PAR ONGLET » — donc une clé de persistance par
 *      surface, jamais un réglage global qui téléporterait la lentille ;
 *   4. « SÉPARATION STRICTE : jamais Run + Bike dans une même lecture
 *      compétitive, jamais de somme ».
 *
 * ─── LE POINT D'HONNÊTETÉ, QUI EST TOUT LE SUJET ────────────────────────────
 * L'univers vélo est VIDE. Pas « pas encore rempli » : structurellement vide —
 * la discipline d'une sortie est DÉCLARÉE par le chemin qui la lance, et tous
 * déclarent la course à pied (`features/run/gps/runActivity.ts`,
 * `DECLARED_START_ACTIVITY: Extract<Activity, 'run'>`). Basculer en Bike sur le
 * Classement, l'Historique ou les Statistiques ne doit donc JAMAIS montrer les
 * données Run sous une étiquette vélo : ce serait exactement la donnée
 * fabriquée que la charte interdit. `activityIsRecorded` porte ce fait, et
 * `activitySwitch.test.ts` casse le jour où la déclaration s'élargit — pour que
 * la COPIE des états vides soit revue AVANT que le vélo n'existe, pas après.
 */
import { ACTIVITIES, DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';

/** Les surfaces de la planche E14 qui portent le commutateur. */
export const ACTIVITY_SURFACES = ['map', 'classement', 'historique', 'stats'] as const;
export type ActivitySurface = (typeof ACTIVITY_SURFACES)[number];

/**
 * Clé de persistance de la préférence, PAR SURFACE (planche : « le choix est
 * mémorisé par onglet »). Une seule clé partagée ferait basculer la Carte
 * quand on regarde le Classement en vélo — ce n'est pas ce que la planche
 * décrit, et ça téléporterait la lentille d'un écran qu'on ne regarde pas.
 *
 * La Carte GARDE sa clé historique `gryd.mapactivity` : elle est déjà écrite
 * sur les téléphones du pilote, et la renommer effacerait un choix réel de
 * l'utilisateur (la migration ne se réécrit jamais, même côté client).
 */
const LEGACY_MAP_STORAGE_KEY = 'gryd.mapactivity';

export function activityStorageKey(surface: ActivitySurface): string {
  return surface === 'map' ? LEGACY_MAP_STORAGE_KEY : `gryd.activity.${surface}`;
}

/**
 * Lecture DÉFENSIVE d'une valeur stockée. `null` = illisible ou inconnue :
 * l'appelant retombe alors sur le défaut, il n'invente pas une discipline.
 */
export function parseActivity(raw: string | null | undefined): Activity | null {
  return typeof raw === 'string' && (ACTIVITIES as readonly string[]).includes(raw)
    ? (raw as Activity)
    : null;
}

/**
 * Les disciplines dont GRYD sait RÉELLEMENT enregistrer une sortie aujourd'hui.
 *
 * Ce n'est pas une opinion : c'est le miroir de `DECLARED_START_ACTIVITY`, dont
 * le type `Extract<Activity, 'run'>` interdit au compilateur toute autre valeur.
 * Une surface qui bascule sur une discipline NON enregistrée doit rendre un
 * état vide NOMMÉ — jamais les lignes de l'autre monde sous une nouvelle
 * étiquette, jamais un « 0 » nu.
 */
export const RECORDED_ACTIVITIES: readonly Activity[] = ['run'];

export function activityIsRecorded(activity: Activity): boolean {
  return RECORDED_ACTIVITIES.includes(activity);
}

/** Ce que l'écran sait au moment de décider d'afficher le commutateur. */
export interface ActivitySwitchContext {
  /** `flags.bike` — « visible seulement si Bike est activé » (planche E14). */
  bikeEnabled: boolean;
  /**
   * Une course est-elle RÉELLEMENT en cours (buffer GPS frais) ? La planche dit
   * « verrouillé pendant une course » ; la charte dit « masqué, jamais grisé ».
   * Un commutateur grisé serait un contrôle mort de plus — on le retire.
   *
   * ATTENTION : passer `true` tant que la lecture du stockage n'a pas abouti
   * ferait clignoter le contrôle à chaque ouverture d'écran. Une lecture non
   * aboutie n'est pas un verrou : l'appelant passe `running`, jamais `loading`.
   */
  runLive: boolean;
}

export function activitySwitchVisible({ bikeEnabled, runLive }: ActivitySwitchContext): boolean {
  return bikeEnabled && !runLive;
}

/**
 * LENTILLE EFFECTIVE d'une surface — ce que l'écran doit RÉELLEMENT montrer.
 *
 * Le verrou de course a un piège qu'il faut nommer : le commutateur est retiré
 * pendant une course (« masqué, jamais grisé »), or la lentille est MÉMORISÉE.
 * Un joueur qui avait laissé son Historique en Bike, puis qui lance une course
 * et revient sur cet onglet, se retrouverait devant un état vide SANS AUCUN
 * MOYEN d'en sortir. Ce n'est plus un verrou, c'est un cul-de-sac — et un écran
 * dont on ne peut pas sortir est le cousin du bouton mort.
 *
 * Tant qu'une course tourne, la surface montre donc le monde de CETTE course.
 * C'est vrai (il s'y passe quelque chose de réel), c'est utile, et ça
 * n'ÉCRASE PAS la préférence : elle est mise en veille et revient telle quelle
 * à la fin. `liveActivity` est `null` quand aucune course ne tourne.
 *
 * QUAND LE VÉLO SERA ENREGISTRABLE : l'appelant devra passer la discipline
 * DÉCLARÉE de la course en cours, pas une constante. La signature l'accepte
 * déjà ; c'est le seul endroit à revoir.
 */
export function effectiveActivity(stored: Activity, liveActivity: Activity | null): Activity {
  return liveActivity ?? stored;
}

/**
 * SÉPARATION STRICTE (planche E14) — une lecture COMPÉTITIVE est-elle
 * affichable sous cette lentille ?
 *
 * `sourceIsDisciplined` = la source porte-t-elle vraiment la colonne `activity`
 * (migration 0070) ? Deux cas, et un seul est sûr :
 *   · source DISCIPLINÉE (`player_leaderboard`, `season_scores`, `hex_claims`) :
 *     chaque lentille lit son monde, donc tout est affichable ;
 *   · source MONO-POT (`user_stats` → vue `specialty_leaderboard`, `user_badges`,
 *     XP, Foulées — cf. 0070 « ce qui reste en suspens » §2 et §3) : ses chiffres
 *     mélangent les disciplines. Elle ne peut donc s'afficher que sous la
 *     lentille par DÉFAUT, la seule dont ces compteurs disent aujourd'hui la
 *     vérité — les servir sous une étiquette vélo serait la somme interdite.
 */
export function competitiveReadAllowed(activity: Activity, sourceIsDisciplined: boolean): boolean {
  return sourceIsDisciplined || activity === DEFAULT_ACTIVITY;
}

// ─── LES DEUX SEGMENTS NE SONT PAS DES PAIRS (retour fondateur, 26/07/2026) ──
//
// Le constat, capture à l'appui : « l'utilisateur peut entrer dans Bike, mais
// l'interface lui dit ENSUITE que le vélo n'est pas encore utilisable […] tu
// crées une fausse affordance ». La fausse affordance ne venait PAS de la
// présence du bouton — l'arbitrage garde le commutateur visible — elle venait de
// l'ÉGALITÉ VISUELLE : deux capsules identiques, deux pictos de même poids, rien
// qui distingue une lentille pleine d'une lentille creuse avant le tap.
//
// La correction est donc dérivée, pas peinte : un segment porte une MARQUE
// D'ÉTAT si et seulement si sa discipline n'est pas enregistrable
// (`activityIsRecorded`). Le jour où le vélo s'enregistrera, la marque
// disparaîtra du seul fait que `RECORDED_ACTIVITIES` aura changé — personne
// n'aura à se souvenir de retirer un badge à la main.

/**
 * Libellés VISIBLES des segments. Le fondateur demande « toujours texte +
 * icône » : un picto seul n'apprend rien à qui n'a jamais vu le contrôle.
 *
 * Ils sont INVARIANTS dans les cinq langues, et ce n'est pas un oubli de
 * traduction : « RUN » est déjà le verbe invariant du bouton central
 * (`i18n/catalog/nav.ts` → `actionRun`, identique fr/en/es/de/pt) et « Bike »
 * est le mot que la planche E14 et toute la copie existante emploient dans les
 * cinq langues (« Ta carte Bike », « Deine Bike-Karte »…). Deux mots courts et
 * stables valent mieux que « CORRER / BICI », qui ferait respirer la capsule
 * différemment selon la langue — et c'est la largeur qui garantit ici l'absence
 * de troncature (§A9).
 */
export const ACTIVITY_LABELS: Readonly<Record<Activity, string>> = {
  run: 'RUN',
  bike: 'BIKE',
};

/** Un segment du commutateur, entièrement DÉRIVÉ (aucun état local à peindre). */
export interface ActivitySegment {
  activity: Activity;
  /** Libellé visible, invariant (cf. `ACTIVITY_LABELS`). */
  label: string;
  /** Ce segment est-il la lentille courante ? */
  selected: boolean;
  /**
   * Ce segment porte-t-il la marque d'état ? Propriété de la DISCIPLINE, jamais
   * de la sélection : la marque doit se lire AVANT le tap, sinon elle arrive
   * trop tard pour empêcher la déception qu'elle est censée éviter.
   */
  marked: boolean;
}

export function activitySegments(selected: Activity): readonly ActivitySegment[] {
  return ACTIVITIES.map((activity) => ({
    activity,
    label: ACTIVITY_LABELS[activity],
    selected: activity === selected,
    marked: !activityIsRecorded(activity),
  }));
}

/**
 * GÉOMÉTRIE de la capsule — ici, en PUR, parce que ce ne sont pas des valeurs
 * de décoration : ce sont elles qui garantissent qu'aucun libellé n'est tronqué
 * dans les cinq langues (§A9, « texte JAMAIS coupé par "…" »), et le test les
 * confronte au catalogue RÉEL plutôt qu'à une intention.
 *
 * ─── POURQUOI ON S'ÉCARTE DE LA PLANCHE E14 ────────────────────────────────
 * E14 spécifie « un petit commutateur (40 pt) » à pictos seuls, soit 84 × 40.
 * Le fondateur a tranché contre sa propre planche : « toujours texte + icône »,
 * un actif « extrêmement clair », un inactif « nettement secondaire ». La
 * divergence est ASSUMÉE et documentée ici plutôt que silencieuse. Elle a un
 * coût, honnêtement nommé : la rangée de la Carte cède ~50 pt à sa ligne
 * mission (`app/(tabs)/index.tsx` calcule sa marge depuis
 * `ACTIVITY_SWITCH_WIDTH`, donc la cohérence tient toute seule).
 *
 * Les segments sont DÉLIBÉRÉMENT inégaux : le segment Bike est plus large parce
 * qu'il porte sa marque. Deux segments de même largeur seraient exactement
 * l'égalité visuelle que ce chantier retire.
 */
export const ACTIVITY_SWITCH_GEOMETRY = {
  /** ≥ 44 : la cible tactile est ATTEINTE, plus simulée par un hitSlop. */
  height: 58,
  /** Filet de la capsule (compté dans la largeur : `borderBox` n'existe pas ici). */
  borderWidth: 1,
  /** Marge intérieure de la capsule (le fond actif s'y inscrit sans être rogné). */
  capsulePad: 2,
  /** Marge horizontale d'un segment, de part et d'autre du texte. */
  segmentPadH: 6,
  /** ≥ 44 : cible tactile réelle, même sur le segment le plus étroit. */
  runSegmentWidth: 46,
  bikeSegmentWidth: 90,
  iconSize: 16,
  /** Plancher a11y du projet : aucun texte porteur de sens sous 12 px. */
  labelSize: 12,
  labelTracking: 0.6,
  /** La marque est une mention, pas un titre — 10 px, jamais moins. */
  markSize: 10,
  markTracking: 0.2,
} as const;

export const ACTIVITY_SWITCH_HEIGHT = ACTIVITY_SWITCH_GEOMETRY.height;

/**
 * Largeur HORS TOUT de la capsule — filet et marge intérieure compris. C'est
 * cette valeur que la Carte réserve à droite de sa ligne mission : la sous-
 * évaluer ferait chevaucher les deux (§A9 : jamais de texte mangé).
 */
export const ACTIVITY_SWITCH_WIDTH =
  ACTIVITY_SWITCH_GEOMETRY.borderWidth * 2 +
  ACTIVITY_SWITCH_GEOMETRY.capsulePad * 2 +
  ACTIVITY_SWITCH_GEOMETRY.runSegmentWidth +
  ACTIVITY_SWITCH_GEOMETRY.bikeSegmentWidth;

/** Hauteur utile d'un segment : la capsule moins son filet et sa marge. */
export const ACTIVITY_SEGMENT_HEIGHT =
  ACTIVITY_SWITCH_GEOMETRY.height -
  ACTIVITY_SWITCH_GEOMETRY.borderWidth * 2 -
  ACTIVITY_SWITCH_GEOMETRY.capsulePad * 2;

/**
 * Avances MOYENNES d'une capitale, en em. Volontairement PESSIMISTES : une
 * estimation qui sous-évalue laisserait passer la troncature qu'elle est censée
 * interdire. Le calibrage vient d'une MESURE, pas d'une intuition — « PAS
 * ENCORE » rendu à 10 px pèse ~68 pt sur une grotesque système, soit ~0,71 em
 * par capitale ; Inter est un peu plus large, on retient donc 0,75.
 * (Un premier jet à 0,68 avait déclaré la marque tenue alors qu'elle débordait :
 * l'estimation est là pour faire ÉCHOUER le test, pas pour rassurer.)
 */
const CAPS_ADVANCE_EM = 0.75;
const SPACE_ADVANCE_EM = 0.32;

/**
 * Largeur ESTIMÉE d'un texte en capitales. Pure et approximative — son rôle
 * n'est pas de composer la ligne (React Native s'en charge) mais de FAIRE
 * ÉCHOUER LE TEST quand une traduction dépasse le budget de la capsule.
 */
export function estimateUppercaseWidth(text: string, fontSize: number, tracking: number): number {
  const chars = [...text];
  const em = chars.reduce((sum, ch) => sum + (ch === ' ' ? SPACE_ADVANCE_EM : CAPS_ADVANCE_EM), 0);
  return em * fontSize + Math.max(0, chars.length - 1) * tracking;
}

/** Largeur de texte disponible dans le segment Bike (marque comprise). */
export const ACTIVITY_MARK_TEXT_BUDGET =
  ACTIVITY_SWITCH_GEOMETRY.bikeSegmentWidth - 2 * ACTIVITY_SWITCH_GEOMETRY.segmentPadH;

/** Une marque d'état tient-elle dans le segment sans être coupée (§A9) ? */
export function activityMarkFits(mark: string): boolean {
  return (
    estimateUppercaseWidth(
      mark,
      ACTIVITY_SWITCH_GEOMETRY.markSize,
      ACTIVITY_SWITCH_GEOMETRY.markTracking,
    ) <= ACTIVITY_MARK_TEXT_BUDGET
  );
}
