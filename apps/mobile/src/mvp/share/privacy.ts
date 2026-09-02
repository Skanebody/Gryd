/**
 * GRYD — LE MASQUAGE D'UNE TRACE AVANT QU'ELLE PARTE. PUR (lot L13).
 *
 * ═══ CE FICHIER EST UN MIROIR ÉPINGLÉ, PAS UNE SECONDE IMPLÉMENTATION ═══════
 * La règle vit dans `packages/engine/src/tracePrivacy.ts` (+ les quelques
 * fonctions de `packages/engine/src/polygon.ts` dont elle dépend), et c'est
 * cette source-là que le SERVEUR exécute avant d'écrire `runs.polyline_masked`.
 * Ce qui suit en est une copie, et le seul motif pour lequel elle existe est
 * mécanique :
 *
 *   · `packages/engine/src/tracePrivacy.ts` importe `./polygon.ts` AVEC son
 *     extension (Deno l'exige). Le tsconfig d'Expo la refuse — mesuré :
 *     `error TS5097: An import path can only end with a '.ts' extension when
 *     'allowImportingTsExtensions' is enabled`. Un import direct depuis l'app
 *     casse donc `npm run typecheck`.
 *   · La copie GÉNÉRÉE qui existe déjà (`scripts/sync-game-rules.mjs`) atterrit
 *     dans `apps/mobile/src/features/share/engine/` — c'est-à-dire du côté
 *     LEGACY. L'importer d'ici créerait une dépendance de l'UI neuve vers
 *     l'ancienne, « exactement ce qu'ADR-001 interdit » (mot pour mot, le
 *     commentaire du lot M8 dans le script de sync).
 *
 * ⚠️ CE QUI REND CETTE COPIE ACCEPTABLE, ET RIEN D'AUTRE : `privacy.drift.test.ts`
 * importe la VRAIE source du moteur (un test Deno n'est pas typechecké par
 * Expo — `tsconfig.json` exclut les fichiers `.test.ts`) et exige une sortie
 * IDENTIQUE sur des traces réelles. Sans ce test, ce fichier serait la deuxième
 * implémentation que ce dépôt paie cher à chaque fois. Le jour où quelqu'un
 * ajoute une cible `MOBILE_ENGINE_TARGETS` vers `src/mvp/share/engine/`, ce
 * fichier disparaît et le drift test devient inutile — c'est la bonne fin.
 *
 * ═══ LA RÈGLE, ET SES DEUX MOITIÉS CUMULATIVES (§12.1 / §1.5) ═══════════════
 * `game-rules.ts` (l. 907-960) est explicite : les deux règles ci-dessous sont
 * « cumulatives, jamais alternatives ».
 *   1. `SHARE_TRIM_M` = 250 m COUPÉS à chaque extrémité — le départ et l'arrivée
 *      sont le domicile. « Autour », pas seulement « le long de » : un
 *      aller-retour qui repasse devant chez soi laisserait sinon le point de
 *      coupe à 40 m de la porte. D'où les DEUX critères cumulés (distance
 *      parcourue ET distance à vol d'oiseau).
 *   2. `SHARE_SIMPLIFY_EPSILON_M` = 15 m de Douglas-Peucker sur TOUT ce qui
 *      reste. Couper les bouts ne suffit pas : entre les deux, une trace au
 *      mètre près dit quel trottoir et quelle contre-allée. Sur une card de
 *      1 080 px cadrée sur 2 km, un pixel vaut ~1,9 m — la carte de partage
 *      PUBLIE donc bien ce détail-là si personne ne le dégrade.
 *
 * ⚠️ CE QUE L'ÉTAPE 2 NE FAIT PAS : Douglas-Peucker RETIRE des sommets, il n'en
 * DÉPLACE aucun. Les points qui survivent sont des positions GPS EXACTES. La
 * protection des extrémités repose entièrement sur l'étape 1.
 *
 * ═══ CE QUI MANQUE ICI, ET POURQUOI CE N'EST PAS UN OUBLI ═══════════════════
 * Le pipeline du moteur a une TROISIÈME étape entre les deux : retirer les
 * points tombant dans une ZONE FLOUTÉE déclarée (`applyPrivacyZones`). Elle
 * n'est pas recopiée parce que le MVP n'a AUCUNE source de zones : rien dans
 * l'app n'écrit `privacy_zones` (l'en-tête du moteur le dit lui-même : « en
 * pratique la lecture rend zéro zone pour tout le monde aujourd'hui »), et cet
 * écran ne fait aucun appel réseau pour en chercher. Avec zéro zone, cette
 * étape est l'IDENTITÉ — ce que le drift test vérifie en comparant contre
 * `applyTracePrivacy(trace, SHARE_TRIM_M, [], SHARE_SIMPLIFY_EPSILON_M)`.
 * Le jour où une zone peut exister, ce miroir DOIT être étendu avant que la
 * card ne dessine quoi que ce soit : §1.5 dit que les zones « prévalent sur
 * tout rendu social ».
 *
 * PUR : aucune I/O, aucune horloge, aucun effet de bord.
 */
import { SHARE_SIMPLIFY_EPSILON_M, SHARE_TRIM_M } from '@klaim/shared';
import { haversineM } from '../run/engine/validation';

/**
 * Un point géographique, réduit à ce que le masquage regarde.
 *
 * Défini localement plutôt qu'importé : TypeScript est STRUCTUREL, donc ce type
 * reste interchangeable avec ceux du moteur et de `run/payload.ts` sans créer
 * de dépendance entre eux. (Le moteur fait exactement le même choix.)
 */
export interface SharePoint {
  readonly lat: number;
  readonly lng: number;
}

/** Nombre minimal de points pour qu'une trace soit RENDABLE. */
const MIN_RENDERABLE_POINTS = 3;

// ─── Projection locale — la MÊME que `polygon.ts` (§7) ──────────────────────
// Équirectangulaire centrée sur le premier point, longitudes mises à l'échelle
// par le cosinus de la latitude MOYENNE : sans ce cosinus, une boucle à 49° de
// latitude s'affiche étirée de ~35 % en largeur, c'est-à-dire une forme qui
// n'est pas celle qu'on a courue. Les unités sont des MÈTRES — c'est ce qui
// permet à Douglas-Peucker de raisonner sur une tolérance en mètres.

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;

export interface LocalProjection {
  readonly lat0: number;
  readonly lng0: number;
  readonly cosLat0: number;
}

export interface XY {
  readonly x: number;
  readonly y: number;
}

export function projectionFor(points: readonly SharePoint[]): LocalProjection {
  const first = points[0] ?? { lat: 0, lng: 0 };
  let latSum = 0;
  for (const p of points) latSum += p.lat;
  const meanLat = points.length > 0 ? latSum / points.length : 0;
  return { lat0: first.lat, lng0: first.lng, cosLat0: Math.cos(meanLat * RAD_PER_DEG) };
}

export function toXY(p: SharePoint, proj: LocalProjection): XY {
  return {
    x: (p.lng - proj.lng0) * RAD_PER_DEG * proj.cosLat0 * EARTH_RADIUS_M,
    y: (p.lat - proj.lat0) * RAD_PER_DEG * EARTH_RADIUS_M,
  };
}

/** Distance point→segment (m) en projection locale. */
function pointSegmentDistM(p: XY, a: XY, b: XY): number {
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const len2 = ex * ex + ey * ey;
  const t = len2 === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * ex + (p.y - a.y) * ey) / len2));
  return Math.hypot(p.x - (a.x + t * ex), p.y - (a.y + t * ey));
}

/**
 * Douglas-Peucker itératif (pile explicite : pas de récursion profonde sur
 * 2 000 points) — rend les INDICES conservés, croissants.
 */
function douglasPeuckerKeep(points: readonly XY[], toleranceM: number): number[] {
  const n = points.length;
  if (n < MIN_RENDERABLE_POINTS) return points.map((_, i) => i);
  const keep = new Uint8Array(n);
  keep[0] = 1;
  keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length > 0) {
    const paire = stack.pop();
    if (paire === undefined) break;
    const [lo, hi] = paire;
    if (hi - lo < 2) continue;
    const a = points[lo];
    const b = points[hi];
    if (a === undefined || b === undefined) continue;
    let farthest = -1;
    let maxDist = toleranceM;
    for (let i = lo + 1; i < hi; i++) {
      const p = points[i];
      if (p === undefined) continue;
      const d = pointSegmentDistM(p, a, b);
      if (d > maxDist) {
        maxDist = d;
        farthest = i;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = 1;
    stack.push([lo, farthest], [farthest, hi]);
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i] === 1) out.push(i);
  return out;
}

/**
 * Polyligne OUVERTE généralisée (miroir de `polygon.ts::simplifyPolyline`).
 *
 * TROIS GARANTIES, et ce sont elles qui la rendent utilisable dans un pipeline
 * de confidentialité :
 *  1. SOUS-SUITE STRICTE — la sortie ne contient que des points de l'entrée,
 *     dans le même ordre, et ce sont les OBJETS d'origine. Corollaire : un
 *     point retiré par la coupe des extrémités ne peut pas réapparaître ici.
 *  2. les DEUX extrémités de l'entrée sont conservées — la généralisation ne
 *     rallonge donc jamais la trace vers ce que la coupe a masqué ;
 *  3. la sortie n'est jamais plus longue que l'entrée (DP ne fait que
 *     supprimer, et supprimer un sommet raccourcit — inégalité triangulaire).
 */
export function simplifyPolyline(
  points: readonly SharePoint[],
  toleranceM: number,
): SharePoint[] {
  if (points.length < MIN_RENDERABLE_POINTS || toleranceM <= 0) return [...points];
  const proj = projectionFor(points);
  const xy = points.map((p) => toXY(p, proj));
  const gardes: SharePoint[] = [];
  for (const i of douglasPeuckerKeep(xy, toleranceM)) {
    const p = points[i];
    if (p !== undefined) gardes.push(p);
  }
  return gardes;
}

/**
 * Retire `trimM` mètres au début ET à la fin — distance cumulée le long de la
 * polyligne ET distance à vol d'oiseau au vrai départ / à la vraie arrivée.
 *
 * Résultat OUVERT : le trou EST le masquage, on ne le referme jamais ICI. (La
 * carte de partage, elle, referme visuellement le contour — voir `trace.ts`,
 * qui explique pourquoi ce n'est pas la même question.)
 *
 * Si moins de 3 points survivent, on rend `[]` — jamais un segment moins masqué
 * que ce que la règle promet. « On préfère rien à un masquage insuffisant » :
 * une version antérieure du moteur retombait sur « le tiers médian » et
 * masquait 130 m là où l'écran en annonçait 250.
 */
export function trimTraceEnds(
  trace: readonly SharePoint[],
  trimM: number,
): readonly SharePoint[] {
  if (trace.length < MIN_RENDERABLE_POINTS) return [];

  const start = trace[0];
  const end = trace[trace.length - 1];
  if (!start || !end) return [];

  const cum: number[] = [0];
  for (let i = 1; i < trace.length; i++) {
    const prev = trace[i - 1];
    const here = trace[i];
    cum.push((cum[i - 1] ?? 0) + (prev && here ? haversineM(prev, here) : 0));
  }

  let startIdx = 0;
  while (startIdx < trace.length) {
    const p = trace[startIdx];
    if (!p) break;
    const alongOk = (cum[startIdx] ?? 0) >= trimM;
    const crowOk = haversineM(start, p) >= trimM;
    if (alongOk && crowOk) break;
    startIdx++;
  }

  const total = cum[cum.length - 1] ?? 0;
  let endIdx = trace.length - 1;
  while (endIdx >= 0) {
    const p = trace[endIdx];
    if (!p) break;
    const alongOk = total - (cum[endIdx] ?? 0) >= trimM;
    const crowOk = haversineM(end, p) >= trimM;
    if (alongOk && crowOk) break;
    endIdx--;
  }

  if (endIdx - startIdx + 1 < MIN_RENDERABLE_POINTS) return [];
  return trace.slice(startIdx, endIdx + 1);
}

/**
 * PLANCHER de la simplification (miroir de `tracePrivacy.ts::simplifyKept`).
 *
 * DP ne garantit que 2 points en sortie : une avenue rectiligne réduirait un
 * vrai parcours à un segment, qu'un appelant lirait comme « tracé inconnu » —
 * un mensonge par sous-affichage. On réinsère alors le point MÉDIAN de
 * l'entrée. C'est un point RÉEL (jamais interpolé), et il ne dit rien de plus
 * que la droite : DP n'a rendu 2 points que parce que tous les intermédiaires
 * tiennent à moins de `toleranceM` de la corde.
 */
function simplifyKept(
  kept: readonly SharePoint[],
  toleranceM: number,
): readonly SharePoint[] {
  const simplified = simplifyPolyline(kept, toleranceM);
  if (
    simplified.length >= MIN_RENDERABLE_POINTS ||
    kept.length < MIN_RENDERABLE_POINTS
  ) {
    return simplified;
  }
  const first = simplified[0];
  const last = simplified[simplified.length - 1];
  const middle = kept[Math.floor(kept.length / 2)];
  return first && last && middle ? [first, middle, last] : simplified;
}

/**
 * LE POINT D'ENTRÉE de la card : coupe les extrémités, puis dégrade la
 * résolution. Un tableau VIDE signifie « rien de publiable » — et l'appelant en
 * tire la seule conclusion honnête : pas de card, donc pas de bouton.
 *
 * ⚠️ AUCUN PARAMÈTRE. Le legacy exposait un réglage (`maskEndpoints`) qui
 * pouvait passer `trimM = 0` ; le MVP n'a pas cet écran, donc le PLANCHER de
 * §1.5 s'applique sans condition. Rendre la coupe optionnelle ici, c'est
 * ouvrir un chemin où une card part avec le domicile dessus.
 */
export function maskForShare(trace: readonly SharePoint[]): readonly SharePoint[] {
  const trimmed = trimTraceEnds(trace, SHARE_TRIM_M);
  if (trimmed.length === 0) return [];
  return simplifyKept(trimmed, SHARE_SIMPLIFY_EPSILON_M);
}
