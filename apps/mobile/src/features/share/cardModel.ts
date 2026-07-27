/**
 * GRYD — MODÈLE DE LA CARTE PARTAGÉE (planche E10, recalage 25/07/2026).
 *
 * La planche décrit UNE grammaire, partagée par tous les modes :
 *   lieu · TITRE de l'événement · LA CARTE remplie · CHIFFRE héros ·
 *   ligne de contexte · défi discret · signature.
 * Ce module décide ce qui REMPLIT ces emplacements — les composants ne font
 * plus que les poser. PUR, zéro import : testable en Deno comme narrative.ts.
 *
 * ─── LA SURFACE : POURQUOI ELLE EST REDEVENUE LÉGITIME (27/07/2026) ─────────
 * Ce module a longtemps INTERDIT toute aire au chiffre héros. La raison écrite
 * le 25/07 était juste À CETTE DATE : le seul verdict qui arrivait au client
 * était `IngestRunResponse`, qui ne porte que des COMPTES d'hexagones
 * (claimed / stolen / defended / pioneer). En tirer une surface aurait exigé
 * « compte × aire nominale d'une cellule H3 » — un produit FAUX, parce que
 * l'aire d'une cellule H3 varie d'environ ±20 % selon la latitude. La planche
 * montrait « +420 000 m² » ; le dépôt n'avait rien à y mettre.
 *
 * CE QUI A CHANGÉ, ET CE QUI N'A PAS CHANGÉ.
 * Le territoire est devenu POLYGONAL (spec §1.4) : ce n'est plus un paquet de
 * cellules, c'est l'anneau de la trace réellement courue.
 *   · `packages/engine/src/polygon.ts:89` (`polygonAreaM2`) en calcule l'aire
 *     par la formule d'aire SPHÉRIQUE — géodésique, donc juste quelle que soit
 *     la latitude : exactement le défaut qui condamnait l'ancien produit ;
 *   · `supabase/functions/ingest_run/territory.ts:192` l'appelle et la pose dans
 *     `territories.area_m2` (migration 0074, colonne `not null check > 0`) ;
 *   · `apps/mobile/src/features/run/useResultTerritory.ts` RELIT cette ligne
 *     pour la course affichée, et `resultTerritory.ts:105` (`pickRunTerritory`)
 *     vérifie qu'elle est bien celle de CE run.
 * L'aire n'est donc plus déduite : elle est LUE. Ce qui reste interdit, et le
 * reste pour toujours, c'est le produit « compte × aire nominale ».
 *
 * L'INTERDICTION DEVIENT UNE GARANTIE STRUCTURELLE, PAS UNE ABSENCE.
 * La surface entre ici DÉJÀ FORMATÉE (`surfaceValue` + `surfaceUnit`, produits
 * par `formatArea` côté écran à partir du nombre serveur). Ce sont des CHAÎNES :
 * ce module n'a aucun nombre d'aire à manipuler, donc aucune arithmétique
 * d'aire n'est possible — pas plus qu'avant. Un compte de zones ne peut pas
 * devenir une surface : `heroMetricAvailable('surface', …)` ne regarde QUE
 * `surfaceValue`, jamais `zonesGained`. Le test garde ces deux propriétés.
 *
 * AUCUN SIGNE « + » SUR UNE SURFACE, contrairement aux comptes. `area_m2` est
 * l'aire du TERRITOIRE, c'est-à-dire un ÉTAT (ce qu'on tient), pas un delta que
 * le serveur annoncerait comme un gain — sur une défense c'est même la surface
 * CONSERVÉE. Un « + » y serait faux la moitié du temps ; le TITRE de la carte
 * (« J'AI PRIS … », « FRONTIÈRE TENUE ») dit déjà ce qui s'est passé.
 *
 * Le chiffre héros est donc TOUJOURS une grandeur réellement disponible :
 *   · une SURFACE (lue dans `territories.area_m2`, jamais calculée ici) ;
 *   · un COMPTE de zones (verdict serveur : prises, tenues, bonus de boucle) ;
 *   · des POINTS crew (verdict serveur) ;
 *   · un RANG (quand une saison en fournit un) ;
 *   · à défaut, la DISTANCE ou la DURÉE — mesurées par l'appareil, donc vraies
 *     dès qu'une course existe.
 * Rien de disponible → `null`, et la carte le DIT au lieu d'imprimer « +0 ».
 */

/**
 * Ce que la carte a le droit d'afficher en GÉANT. Toute entrée doit avoir une
 * source serveur ou une mesure appareil — sinon elle n'a rien à faire ici.
 * `surface` en fait partie depuis que `territories.area_m2` existe et est LUE
 * (voir l'en-tête) ; elle reste la seule aire admise, et elle n'est jamais
 * calculée dans ce module.
 */
export type HeroMetricId =
  | 'surface'
  | 'zones'
  | 'defended'
  | 'loop'
  | 'crew'
  | 'rank'
  | 'distance'
  | 'duration';

/** Liste exhaustive (le test vérifie qu'aucune aire FABRIQUÉE ne peut y entrer). */
export const HERO_METRICS: readonly HeroMetricId[] = [
  'surface',
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
  /**
   * SURFACE du territoire de cette sortie, DÉJÀ FORMATÉE (« 420 000 », « 0,42 »).
   * Sa source unique est `territories.area_m2` — l'aire géodésique du polygone
   * réel, lue en base pour CE run (voir l'en-tête). Vide = aucune surface lue :
   * territoire pas encore écrit, migration non déployée, lecture en échec, ou
   * capture plafonnée. Vide n'est PAS zéro — la carte bascule alors sur une
   * autre grandeur, elle n'imprime jamais « 0 m² ».
   *
   * C'est une CHAÎNE, et c'est la garantie : sans nombre, aucune arithmétique
   * d'aire n'est possible dans ce module.
   */
  readonly surfaceValue: string;
  /**
   * Unité de la surface ci-dessus (« m² » / « km² »), choisie par le seuil de
   * `formatArea` côté écran. Elle sert de LIBELLÉ au chiffre héros (même patron
   * que la distance : « 4,2 » + « km »), jamais collée à la valeur — « 420 000 m² »
   * composé en 64 pt déborde une story de 232 pt, et §A.9 interdit un texte coupé.
   * Vide ⇒ la surface n'est pas affichable, même si `surfaceValue` ne l'est pas.
   */
  readonly surfaceUnit: string;
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

/**
 * Repli SPÉCIFIQUE, essayé AVANT l'effort : une grandeur voisine que le même
 * événement rend vraie, jamais une invention.
 *
 * Un seul cas, et il est la raison d'être de cette table : une carte qui met la
 * SURFACE en avant décrit une prise de territoire. Sans surface lue (territoire
 * pas encore écrit, migration absente, lecture en échec), retomber directement
 * sur la DISTANCE ferait disparaître le nombre de zones — que le serveur, lui,
 * a bel et bien jugé. La carte perdrait une vérité disponible pour une mesure
 * moins parlante. On passe donc par `zones` d'abord.
 *
 * Une grandeur SANS entrée ici garde exactement le comportement d'avant.
 */
const SPECIFIC_FALLBACK: Partial<Record<HeroMetricId, readonly HeroMetricId[]>> = {
  surface: ['zones'],
};

/** La grandeur est-elle réellement DISPONIBLE dans ces faits ? */
export function heroMetricAvailable(m: HeroMetricId, f: ShareCardFacts): boolean {
  switch (m) {
    // La surface ne regarde QUE la surface : aucun compte de zones, aucune
    // distance ne peut la rendre disponible (c'est la garantie de l'en-tête).
    case 'surface':
      return f.surfaceValue.trim() !== '' && f.surfaceUnit.trim() !== '';
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
  for (const m of SPECIFIC_FALLBACK[preferred] ?? []) {
    if (heroMetricAvailable(m, f)) return m;
  }
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
    // RENDUE TELLE QUELLE — pas de « + » (voir l'en-tête : une surface est un
    // état, pas un delta), et surtout aucun calcul : la chaîne que l'écran a
    // formatée depuis `territories.area_m2` ressort à l'identique.
    case 'surface':
      return f.surfaceValue.trim();
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
 *
 * LA SURFACE N'Y ENTRE PAS. Elle n'est admise qu'en chiffre héros : la ligne de
 * contexte est un invariant de la planche (« crew · classement · distance ·
 * durée »), et une carte qui montrerait une surface EN PLUS d'un autre géant
 * ferait deux affirmations de territoire pour un seul événement (§A : une carte,
 * un chiffre). Quand le héros EST la surface, il n'y a donc rien à retirer ici.
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
