/** Pure data boundary shared by result, export and templates. */
import type { Activity } from '@klaim/shared';
import type { LatLngPoint } from '../map/realAnchors';

/** Données du run VALIDÉ projetées dans les cards (plus aucun scénario de démo). */
export interface ShareDemoData {
  /**
   * DISCIPLINE DE LA SORTIE DÉCRITE (26/07/2026). Sans ce champ, la carte
   * exportée ne pouvait pas savoir ce qu'elle décrivait : elle imprimait
   * « COURSE ENREGISTRÉE » / « COURU POUR {crew} » sous le tracé d'un cycliste,
   * dans un PNG qui SORT de l'app et que le crew lit sans pouvoir le corriger.
   *
   * Il vit ici — dans la DONNÉE de la carte — et non dans `ShareView`, qui ne
   * porte que de l'état de RENDU : la discipline est un fait du run, pas un
   * réglage d'affichage. Les libellés qui la nomment passent tous par
   * `resultCopy(d.activity)`, la même porte unique et exhaustive que le Résultat
   * et /partage : impossible qu'un des trois écrans nomme la sortie autrement.
   */
  activity: Activity;
  playerName: string;
  crewName: string;
  zoneName: string;
  /**
   * SURFACE du territoire de cette sortie, DÉJÀ FORMATÉE (« 0,42 », « 420 000 »).
   *
   * SA SEULE SOURCE LÉGALE est `territories.area_m2` — l'aire GÉODÉSIQUE du
   * polygone réellement couru (moteur `polygonAreaM2`, écrite par ingest_run),
   * RELUE en base pour CE run par `useResultTerritory` puis mise en forme par
   * `formatArea` côté Résultat. Il est INTERDIT de la dériver d'un compte
   * d'hexagones : une cellule H3 varie d'environ ±20 % d'aire selon la latitude,
   * donc « zones × aire nominale » produirait un chiffre plausible et faux — le
   * pire, dans une image qui SORT de l'app.
   *
   * Vide = aucune surface connue (territoire pas encore écrit, migration non
   * déployée, lecture en échec, capture plafonnée). Vide n'est pas zéro : la
   * carte bascule sur une autre grandeur, elle n'imprime jamais « 0 m² ».
   */
  surfaceValue: string;
  /** Unité de `surfaceValue` (« m² » / « km² »), choisie par `formatArea`. Vide = inconnue. */
  surfaceUnit: string;
  zonesGained: number;
  loopBonusZones: number;
  zonesDefended: number;
  holdHours: number;
  crewPoints: number;
  distanceKm: string;
  paceLabel: string;
  clockLabel: string;
  /** VRAI tracé GPS du run. Vide = inconnu (jamais une ellipse, jamais un emprunt). */
  trace: readonly LatLngPoint[];
  /** GRYD Verified de CE run (serveur seul juge) — plus jamais un `true` en dur. */
  verified: boolean;
  /**
   * Rang atteint (« #8 ») — récit Classement. NULL = pas de classement réel
   * disponible (season_scores vide) → le style Classement est RETIRÉ de la liste
   * plutôt que d'inventer un rang (charte : zéro donnée fabriquée).
   */
  rankLabel: string | null;
  rankZone: string | null;
  rankDelta: string | null;
  /**
   * État de la zone AVANT la course (Avant/Après). NULL = inconnu → ligne masquée.
   *
   * CONFIDENTIALITÉ (contrainte non négociable) : ce champ est un TEXTE LIBRE
   * rendu au-dessus de la carte « avant ». C'est exactement l'endroit où le
   * handle d'un crew rival atterrirait le jour où une source l'alimentera. Il ne
   * doit JAMAIS porter l'identité d'un rival sans consentement explicite — la
   * planche est catégorique et le pipeline actuel ne recueille aucun consentement.
   */
  beforeState: string | null;
}
