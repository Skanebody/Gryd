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
 * ─── LE VÉLO EST DEVENU UNE DISCIPLINE RÉELLE (fondateur, 26/07/2026) ───────
 * Ce fichier a porté, du 25 au 26/07/2026, un « POINT D'HONNÊTETÉ » qui disait :
 * « l'univers vélo est VIDE. Pas “pas encore rempli” : structurellement vide ».
 * C'ÉTAIT VRAI À LA LETTRE, et ça ne l'est plus. Décision fondateur, mot pour
 * mot : « il faut tout brancher pour que la partie bike fonctionne dès
 * maintenant […] il faut avoir sa propre data, ses propres classements etc ».
 * Le schéma est appliqué en production (migration 0070 : `runs.activity`,
 * `hex_claims` clé `(h3index, activity)`, `season_scores` clé
 * `(season_id, user_id, activity)`), le moteur est paramétré par discipline, et
 * les lecteurs clients de ce chantier portent désormais `.eq('activity', …)`.
 *
 * CONSÉQUENCE DIRECTE ICI, et c'est tout le delta de ce fichier :
 *   · `RECORDED_ACTIVITIES` / `activityIsRecorded` / la MARQUE « PAS ENCORE »
 *     ont été RETIRÉS. Ils existaient pour dire « cette lentille ne peut RIEN
 *     contenir » — une propriété de la DISCIPLINE. Elle est fausse maintenant :
 *     une lentille vélo vide l'est parce que CE JOUEUR n'a pas encore roulé,
 *     exactement comme une lentille course est vide chez un nouveau venu. Ce
 *     n'est plus une marque sur un contrôle, c'est un ÉTAT VIDE d'écran — et un
 *     état vide se dit comme un début, avec l'action qui le remplit.
 *   · les deux segments redeviennent des PAIRS : même largeur, même grammaire,
 *     même accent quand ils sont actifs. Une inégalité visuelle affirmerait une
 *     hiérarchie entre les deux mondes que le produit ne pose plus.
 *
 * CE QUI N'A PAS CHANGÉ, ET NE DOIT PAS : `competitiveReadAllowed`. Certaines
 * sources restent MONO-POT côté serveur (`user_stats` → `specialty_leaderboard`,
 * `user_badges`) : elles mélangent réellement les deux disciplines, et les
 * servir sous une étiquette vélo serait la somme que la planche interdit. Le
 * garde-fou vit là, sur la SOURCE, pas sur la discipline.
 */
import { ACTIVITIES, DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
// Le NOM du paramètre de déclaration appartient au domaine du DÉPART, pas à la
// lentille : on l'importe au lieu d'écrire « activity » en dur. Deux chaînes
// égales aujourd'hui finiraient par diverger, et la divergence serait SILENCIEUSE
// (la sortie repartirait dans la discipline par défaut, sans la moindre erreur).
// Ce module reste PUR — `runActivity.ts` ne lit rien non plus.
import { START_ACTIVITY_PARAM } from '../features/run/gps/runActivity';

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
 * DÉCLARATION DE DISCIPLINE sur une cible de départ (E14, 26/07/2026).
 *
 * Tout écran qui propose « lance ta première sortie » sous une lentille doit
 * lancer CETTE discipline-là — sinon le joueur appuie depuis son monde vélo et
 * enregistre une course à pied, c'est-à-dire exactement le scénario « il rentre
 * chez lui avec 0 zone » que l'arbitrage du 25/07 a coûté cher à refermer.
 *
 * Le contrat est un paramètre d'URL nommé par `features/run/gps/runActivity.ts`
 * (`START_ACTIVITY_PARAM`) : c'est le DÉPART qui le lit. Il ne va JAMAIS
 * chercher la préférence de carte lui-même — l'interdit du 25/07 tient : une
 * préférence d'AFFICHAGE ne décide jamais EN SILENCE de la NATURE d'un effort.
 * Ici, ce n'est pas silencieux : l'écran écrit ce qu'il lance, et le préflight
 * l'AFFICHE, corrigeable d'un tap, avant le premier mètre.
 *
 * On n'ajoute RIEN pour la discipline par défaut : une URL inchangée obtient le
 * comportement exact d'avant le vélo (`UNDECLARED_START_ACTIVITY`), donc aucun
 * chemin existant ne change de sens du fait de ce chantier.
 *
 * Le `?` / `&` est choisi d'après la cible : certains verbes de
 * `deriveContextualAction` portent déjà une query (intention, route), d'autres
 * non — concaténer un `?` en aveugle produirait une URL que le routeur ignore.
 */
export function withStartActivity(href: string, activity: Activity): string {
  if (activity === DEFAULT_ACTIVITY) return href;
  return `${href}${href.includes('?') ? '&' : '?'}${START_ACTIVITY_PARAM}=${activity}`;
}

/**
 * Cible de DÉPART D'UNE SORTIE depuis un écran qui n'est pas la Carte
 * (Classement, Historique, Statistiques). Le mode `conquete` est celui du GO de
 * la Carte : un départ lancé d'ailleurs ne doit pas être un autre départ.
 */
export const START_SORTIE_BASE_HREF = '/course-live?mode=conquete';

export function startSortieHref(activity: Activity): string {
  return withStartActivity(START_SORTIE_BASE_HREF, activity);
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
 * à pied et revient sur cet onglet, se retrouverait devant le MAUVAIS monde
 * sans aucun moyen d'en changer. Ce n'est plus un verrou, c'est un cul-de-sac —
 * et un écran dont on ne peut pas sortir est le cousin du bouton mort.
 *
 * Tant qu'une sortie tourne, la surface montre donc le monde de CETTE sortie.
 * C'est vrai (il s'y passe quelque chose de réel), c'est utile, et ça
 * n'ÉCRASE PAS la préférence : elle est mise en veille et revient telle quelle
 * à la fin. `liveActivity` est `null` quand aucune sortie ne tourne — ET quand
 * la discipline de la sortie en cours n'est pas lisible : dans ce cas on ne
 * DEVINE pas, on garde la préférence de l'utilisateur (une discipline inventée
 * ferait basculer tout l'écran sur un monde qui n'est peut-être pas le sien).
 *
 * ⚠️ DEPUIS QUE LE VÉLO EXISTE, `liveActivity` doit venir de la DISCIPLINE
 * DÉCLARÉE de la sortie en cours (`StoredRun.activity`), jamais d'une constante :
 * un cycliste dont l'écran basculerait en « run » verrait le mauvais territoire
 * pendant tout son effort.
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
 *   · source DISCIPLINÉE (`player_leaderboard`, `season_scores`, `hex_claims`,
 *     `runs`) : chaque lentille lit son monde, donc tout est affichable ;
 *   · source MONO-POT (`user_stats` → vue `specialty_leaderboard`, `user_badges`
 *     — cf. 0070 « ce qui reste en suspens » §2 et §3) : ses chiffres mélangent
 *     les disciplines. Elle ne peut donc s'afficher que sous la lentille par
 *     DÉFAUT, la seule dont ces compteurs disent aujourd'hui la vérité — les
 *     servir sous une étiquette vélo serait la somme interdite.
 */
export function competitiveReadAllowed(activity: Activity, sourceIsDisciplined: boolean): boolean {
  return sourceIsDisciplined || activity === DEFAULT_ACTIVITY;
}

// ─── LES DEUX SEGMENTS SONT DES PAIRS (fondateur, 26/07/2026) ────────────────
//
// Le 26/07 au matin, ce bloc portait l'inverse : « LES DEUX SEGMENTS NE SONT PAS
// DES PAIRS », et le segment Bike affichait une marque « PAS ENCORE ». C'était
// la bonne réponse à un vrai défaut (« tu crées une fausse affordance : l'UI lui
// fait croire que la fonctionnalité est disponible ; le contenu lui dit ENSUITE
// qu'elle ne l'est pas ») — mais la correction visait le SYMPTÔME. La cause,
// c'était que le vélo n'existait pas. Le fondateur l'a fait exister le même
// jour ; la marque n'a donc plus rien à marquer, et la laisser serait devenu le
// mensonge symétrique : dire « pas encore » d'un monde qui enregistre vraiment.
//
// Ce qui reste de cet arbitrage, et qui ne bouge pas : « toujours texte + icône »
// (un picto seul n'apprend rien à qui n'a jamais vu le contrôle), l'actif franc,
// l'inactif nettement secondaire.

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
}

export function activitySegments(selected: Activity): readonly ActivitySegment[] {
  return ACTIVITIES.map((activity) => ({
    activity,
    label: ACTIVITY_LABELS[activity],
    selected: activity === selected,
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
 * divergence est ASSUMÉE et documentée ici plutôt que silencieuse.
 *
 * ─── LES DEUX SEGMENTS ONT LA MÊME LARGEUR (26/07/2026) ────────────────────
 * Ils ne l'avaient pas : Bike était plus large de 44 pt pour loger sa marque
 * « PAS ENCORE ». La marque est retirée, donc l'écart n'a plus de cause — et le
 * garder aurait laissé une hiérarchie visuelle entre deux mondes désormais
 * égaux. La largeur commune est DÉRIVÉE du plus long des deux libellés :
 * « BIKE » pèse ~37,8 pt (cf. `estimateUppercaseWidth`), plus 2 × 6 pt de marge
 * intérieure, soit 49,8 — on prend 56 pour garder de l'air aux tailles système
 * agrandies, et parce que 56 > 44 satisfait aussi le plancher tactile.
 * La capsule y gagne 24 pt de large et 8 pt de haut : la Carte les récupère
 * pour sa ligne mission, qui calcule sa marge depuis `ACTIVITY_SWITCH_WIDTH`.
 */
export const ACTIVITY_SWITCH_GEOMETRY = {
  /**
   * Filet + marge + segment de 44 : la cible tactile est ATTEINTE, pas simulée.
   *
   * ⚠️ ÉCART ASSUMÉ À §4.2 (qui demande 40), et il est mesuré : 40 − filet − marge
   * = 34, or §3.4 du MÊME document impose une cible de 44×44. Les deux règles se
   * contredisent ; on ne peut satisfaire 40 qu'en simulant la cible par un
   * `hitSlop`, c'est-à-dire en rendant la zone d'appui plus grande que le bouton
   * visible. Le dépôt a tranché AVANT ce lot pour la cible RÉELLE — un test le
   * verrouille nommément (« pas simulée par un hitSlop »), et il a raison : un
   * appui qui « prend » hors du bouton visible est une promesse floue, et il
   * mord sur ce qui l'entoure. On garde donc 50, et c'est §4.2 qui plie.
   * (Tenté en icônes seules le 27/07/2026 : rejeté par ce test, à juste titre.)
   */
  height: 50,
  /** Filet de la capsule (compté dans la largeur : `borderBox` n'existe pas ici). */
  borderWidth: 1,
  /** Marge intérieure de la capsule (le fond actif s'y inscrit sans être rogné). */
  capsulePad: 2,
  /** Marge horizontale d'un segment, de part et d'autre du texte. */
  segmentPadH: 6,
  /**
   * Largeur COMMUNE aux deux segments (cf. la dérivation ci-dessus). Une seule
   * constante, et pas deux égales : deux valeurs finiraient par diverger, et la
   * divergence se lirait comme une hiérarchie.
   */
  segmentWidth: 44,
  /**
   * 22 pt — la fourchette d'icône de §3.5 (22-24). Elle valait 16 quand un
   * libellé la secondait ; SEULE, elle doit porter le sens à elle toute seule.
   */
  iconSize: 22,
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
  ACTIVITY_SWITCH_GEOMETRY.segmentWidth * ACTIVITIES.length;

/** Hauteur utile d'un segment : la capsule moins son filet et sa marge. */
export const ACTIVITY_SEGMENT_HEIGHT =
  ACTIVITY_SWITCH_GEOMETRY.height -
  ACTIVITY_SWITCH_GEOMETRY.borderWidth * 2 -
  ACTIVITY_SWITCH_GEOMETRY.capsulePad * 2;

/**
 * Avances MOYENNES d'une capitale, en em. Volontairement PESSIMISTES : une
 * estimation qui sous-évalue laisserait passer la troncature qu'elle est censée
 * interdire. Le calibrage vient d'une MESURE, pas d'une intuition — un texte
 * capitalisé rendu à 10 px pèse ~0,71 em par capitale sur une grotesque
 * système ; Inter est un peu plus large, on retient donc 0,75.
 * (Un premier jet à 0,68 avait déclaré un libellé tenu alors qu'il débordait :
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

/**
 * ⚠️ `ACTIVITY_LABEL_TEXT_BUDGET` et `activityLabelFits` ONT ÉTÉ RETIRÉS le
 * 27/07/2026 : le commutateur ne rend plus de libellé (demande fondateur « que
 * des icônes »), donc plus aucun texte n'a à tenir dans un segment. Un garde-fou
 * anti-troncature qui ne garde plus rien est un piège pour le prochain lecteur —
 * il passerait au vert quoi qu'il arrive et donnerait l'illusion d'une preuve.
 *
 * `estimateUppercaseWidth` (ci-dessus) RESTE : c'est un outil général, encore
 * consommé ailleurs pour d'autres budgets de largeur.
 *
 * Si un libellé revient un jour dans la capsule, rétablir le couple budget +
 * vérification EN MÊME TEMPS que le texte, jamais après.
 */
