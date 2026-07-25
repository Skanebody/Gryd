/**
 * GRYD — MODÈLE DE LA CARTE PARTAGÉE (planche E10, recalage 25/07/2026).
 *
 * La planche décrit UNE grammaire, partagée par tous les modes :
 *   lieu · TITRE de l'événement · LA CARTE remplie · CHIFFRE héros ·
 *   ligne de contexte · défi discret · signature.
 * Ce module décide ce qui REMPLIT ces emplacements — les composants ne font
 * plus que les poser. PUR, zéro import : testable en Deno comme narrative.ts.
 *
 * ─── LA CONTRAINTE (a) QUI PRIME SUR LA PLANCHE : PAS D'AIRE ─────────────────
 * La planche montre « +420 000 m² » / « 0,42 km² ». Ce chiffre N'A AUCUNE SOURCE.
 * `IngestRunResponse` (packages/shared/src/types.ts) ne renvoie que des COMPTES
 * d'hexagones (claimed / stolen / defended / pioneer) ; l'aire d'une cellule H3
 * varie d'environ ±20 % selon la latitude, donc « compte × aire nominale »
 * fabriquerait une surface fausse de plusieurs dizaines de milliers de m² sur une
 * course ordinaire. L'interdiction est déjà écrite deux fois dans
 * `app/course-result.tsx`. Elle est ici STRUCTURELLE : `ShareCardFacts` ne porte
 * AUCUN champ d'aire et `HeroMetricId` n'en propose aucune valeur — on ne peut
 * donc pas en afficher une par distraction. Un test garde cette absence.
 *
 * Le chiffre héros est donc TOUJOURS une grandeur réellement disponible :
 *   · un COMPTE de zones (verdict serveur : prises, tenues, bonus de boucle) ;
 *   · des POINTS crew (verdict serveur) ;
 *   · un RANG (quand une saison en fournit un) ;
 *   · à défaut, la DISTANCE ou la DURÉE — mesurées par l'appareil, donc vraies
 *     dès qu'une course existe.
 * Rien de disponible → `null`, et la carte le DIT au lieu d'imprimer « +0 ».
 */

/**
 * Ce que la carte a le droit d'afficher en GÉANT. Aucune aire, aucune surface :
 * voir l'en-tête. Toute nouvelle entrée doit avoir une source serveur ou une
 * mesure appareil — sinon elle n'a rien à faire ici.
 */
export type HeroMetricId =
  | 'zones'
  | 'defended'
  | 'loop'
  | 'crew'
  | 'rank'
  | 'distance'
  | 'duration';

/** Liste exhaustive (le test vérifie qu'aucune grandeur d'aire ne s'y glisse). */
export const HERO_METRICS: readonly HeroMetricId[] = [
  'zones',
  'defended',
  'loop',
  'crew',
  'rank',
  'distance',
  'duration',
];

/**
 * Les faits d'une course, tels que le Résultat les a armés. Structurel (aucun
 * import) : les valeurs textuelles arrivent DÉJÀ formatées par l'écran (la
 * séparation décimale est une affaire de langue, pas de card).
 */
export interface ShareCardFacts {
  /** Zones prises (neutre + reprise) — verdict serveur. */
  readonly zonesGained: number;
  /** Zones défendues — verdict serveur. */
  readonly zonesDefended: number;
  /** Zones intérieures gagnées par la boucle — verdict serveur. */
  readonly loopBonusZones: number;
  /** Points crew crédités — verdict serveur. */
  readonly crewPoints: number;
  /** Rang atteint (« #8 ») ou null quand aucune saison ne le fournit. */
  readonly rankLabel: string | null;
  /** Distance MESURÉE, déjà formatée (« 4,2 »). Vide = non mesurée. */
  readonly distanceKm: string;
  /** Durée MESURÉE, déjà formatée (« 26:10 »). Vide = non mesurée. */
  readonly clockLabel: string;
  /** Nom du crew — vide tant qu'aucun crew réel n'est connu. */
  readonly crewName: string;
}

/** Repli commun : ce qui existe dès qu'une course existe. Jamais une aire. */
const EFFORT_FALLBACK: readonly HeroMetricId[] = ['distance', 'duration'];

/** La grandeur est-elle réellement DISPONIBLE dans ces faits ? */
export function heroMetricAvailable(m: HeroMetricId, f: ShareCardFacts): boolean {
  switch (m) {
    case 'zones':
      return f.zonesGained > 0;
    case 'defended':
      return f.zonesDefended > 0;
    case 'loop':
      return f.loopBonusZones > 0;
    case 'crew':
      return f.crewPoints > 0;
    case 'rank':
      return f.rankLabel !== null && f.rankLabel.trim() !== '';
    case 'distance':
      return f.distanceKm.trim() !== '';
    case 'duration':
      return f.clockLabel.trim() !== '';
  }
}

/**
 * Chiffre héros de la carte : la grandeur que ce mode MET EN AVANT si elle
 * existe, sinon l'effort mesuré, sinon RIEN.
 *
 * `null` n'est pas un échec de code : c'est le seul état honnête d'une course
 * dont rien n'a été mesuré ni jugé. La carte affiche alors « — » et dit que la
 * mesure est indisponible — jamais « +0 » ni un chiffre emprunté.
 */
export function heroMetricFor(
  preferred: HeroMetricId,
  f: ShareCardFacts,
): HeroMetricId | null {
  if (heroMetricAvailable(preferred, f)) return preferred;
  for (const m of EFFORT_FALLBACK) {
    if (heroMetricAvailable(m, f)) return m;
  }
  return null;
}

/**
 * Valeur du chiffre héros, SANS son libellé ni son unité. `null` si indisponible.
 *
 * L'unité reste dehors, et ce n'est pas un détail de style : le chiffre héros
 * est composé en 64 pt et la carte story ne fait que 232 pt de large. « 4,2 km »
 * y déborde, et §A.9 interdit un texte coupé. L'unité devient donc le LIBELLÉ
 * du chiffre (côté rendu) — deux caractères, aucune redondance.
 */
export function heroValueFor(m: HeroMetricId | null, f: ShareCardFacts): string | null {
  if (m === null || !heroMetricAvailable(m, f)) return null;
  switch (m) {
    case 'zones':
      return `+${f.zonesGained}`;
    case 'defended':
      return `+${f.zonesDefended}`;
    case 'loop':
      return `+${f.loopBonusZones}`;
    case 'crew':
      return `+${f.crewPoints}`;
    case 'rank':
      return f.rankLabel ?? null;
    case 'distance':
      return f.distanceKm.trim();
    case 'duration':
      return f.clockLabel.trim();
  }
}

/**
 * LIGNE DE CONTEXTE de la planche : « crew / classement / distance / durée »,
 * dans cet ordre, et RIEN d'autre. Deux règles :
 *   · une part vide n'est pas rendue (jamais un « · » orphelin, jamais « km »
 *     tout seul) ;
 *   · la grandeur déjà affichée en GÉANT est retirée — la répéter en petit
 *     juste dessous n'apporte rien et brouille la lecture < 1 s à la vignette.
 */
export function contextParts(
  f: ShareCardFacts,
  hero: HeroMetricId | null,
  unitKm: string,
): readonly string[] {
  const parts: string[] = [];
  if (f.crewName.trim() !== '') parts.push(f.crewName.trim());
  if (hero !== 'rank' && f.rankLabel !== null && f.rankLabel.trim() !== '') {
    parts.push(f.rankLabel.trim());
  }
  if (hero !== 'distance' && f.distanceKm.trim() !== '') {
    parts.push(`${f.distanceKm.trim()} ${unitKm}`);
  }
  if (hero !== 'duration' && f.clockLabel.trim() !== '') parts.push(f.clockLabel.trim());
  return parts;
}

/**
 * BANDEAU DE LIEU (« ville · secteur ») — emplacement #1 de la planche.
 *
 * `zoneName` vaut aujourd'hui le littéral de repli du catalogue (« Zone »,
 * « Zona »…) : ce n'est PAS un nom de lieu, c'est l'aveu qu'on n'en a pas. Le
 * comparer aux replis traduits est la seule façon de ne pas imprimer
 * « J'AI PRIS ZONE » sur une image publiée. Retourne '' quand aucun lieu réel
 * n'est connu — l'appelant bascule alors sur un titre SANS nom de lieu.
 *
 * (La vraie source existe et n'a aucun appelant : `resolveSectorName()` dans
 * features/map/sectorNaming.ts. Son câblage jusqu'à `setShareRun` est un
 * chantier amont — voir openItems.)
 */
export function knownPlaceName(zoneName: string, fallbacks: readonly string[]): string {
  const z = zoneName.trim();
  if (z === '') return '';
  const low = z.toLocaleLowerCase();
  for (const f of fallbacks) {
    if (f.trim().toLocaleLowerCase() === low) return '';
  }
  return z;
}
