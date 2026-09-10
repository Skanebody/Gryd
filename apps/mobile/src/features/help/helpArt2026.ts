/**
 * GRYD — GÉOMÉTRIE DES SCHÉMAS du guide « Comment ça marche ».
 *
 * ─── DEUX RÈGLES DE FORME, ET ELLES SONT MESURÉES ───────────────────────────
 *  1. Les sommets sont des NOMBRES, pas des chaînes. Le test de couture du
 *     guide refuse tout littéral « nombre + unité » dans une chaîne de
 *     `src/features/help/**` (un « 800 m » tapé à la main est une règle de jeu
 *     recopiée, donc un futur mensonge). Des coordonnées écrites en tableau
 *     échappent au filet sans qu'on ait à l'exempter de quoi que ce soit.
 *  2. Les rares `d` écrits en toutes lettres n'emploient QUE des commandes
 *     ABSOLUES (majuscules). Une commande relative (`m`, `h`, `v`) mettrait une
 *     lettre d'unité derrière un chiffre et déclencherait ce même filet — pour
 *     rien. La contrainte est gratuite, elle évite une exemption.
 *
 * Aucune valeur de JEU ici : ce sont des coordonnées de `viewBox`, comme dans
 * `features/onboarding/plancheMotion.ts` dont ce module reprend les outils.
 */
import { closedPathD, closedPathLength, type Vertex } from '../onboarding/plancheMotion';

/** Le cadre partagé par toutes les planches du guide. */
export const HELP_ART_WIDTH = 320;
export const HELP_ART_HEIGHT = 180;
export const HELP_ART_VIEWBOX = `0 0 ${HELP_ART_WIDTH} ${HELP_ART_HEIGHT}`;

/**
 * Jours d'une semaine calendaire. Ce n'est pas une règle de jeu (le nombre de
 * journées CRÉDITÉES vient de `PROGRESSION_RULES_2026`) : c'est le calendrier,
 * au même titre que `MS_PER_DAY` dans `packages/shared/src/season.ts`.
 */
export const HELP_WEEK_COLUMNS = 7;

/** Le `d` d'une polyligne OUVERTE (segments droits, pas de `Z`). */
export function openPathD(points: readonly Vertex[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  return `M${first[0]} ${first[1]}${rest.map(([x, y]) => ` L${x} ${y}`).join('')}`;
}

/** Longueur d'une polyligne ouverte — le `strokeDasharray` d'un tracé animé. */
export function openPathLength(points: readonly Vertex[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    total += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return total;
}

// ─── Chapitre 01 · LA TRACE QUI S'ENREGISTRE ────────────────────────────────

/** Fond de plan : des rues régulières, aucune ville réelle, aucun lieu nommé. */
export const HELP_GRID_PATH = 'M0 44H320M0 92H320M0 140H320M64 0V180M132 0V180M200 0V180M264 0V180';

/** La trace enregistrée, OUVERTE : elle ne revendique aucune surface. */
export const HELP_TRACE: readonly Vertex[] = [[36, 154], [74, 122], [98, 120], [120, 88], [160, 80], [178, 48], [234, 42], [284, 60]];
export const HELP_TRACE_D = openPathD(HELP_TRACE);
export const HELP_TRACE_LENGTH = openPathLength(HELP_TRACE);

// ─── Chapitre 02 · L'ÉCART DE FERMETURE ─────────────────────────────────────

/**
 * Une boucle PRESQUE fermée : le premier et le dernier sommet sont voisins sans
 * se toucher. C'est exactement ce que la tolérance rattrape, et le cercle qui
 * les entoure est le seul « raccord » que le moteur accepte.
 */
export const HELP_OPEN_LOOP: readonly Vertex[] = [[188, 152], [252, 128], [262, 74], [206, 32], [128, 30], [66, 66], [58, 124], [124, 152]];
export const HELP_OPEN_LOOP_D = openPathD(HELP_OPEN_LOOP);
export const HELP_OPEN_LOOP_LENGTH = openPathLength(HELP_OPEN_LOOP);
/** Le centre du cercle de tolérance : le milieu exact des deux bouts libres. */
export const HELP_CLOSURE_CENTRE: Vertex = [156, 152];
export const HELP_CLOSURE_RADIUS = 38;

// ─── Chapitre 03 · LA SURFACE PRISE ─────────────────────────────────────────

/** Le polygone de la boucle : ce que la sortie entoure. */
export const HELP_TERRITORY: readonly Vertex[] = [[52, 130], [60, 58], [116, 32], [200, 42], [260, 90], [238, 146], [138, 158]];
export const HELP_TERRITORY_D = closedPathD(HELP_TERRITORY);
export const HELP_TERRITORY_LENGTH = closedPathLength(HELP_TERRITORY);

/** La part DÉJÀ possédée avant la sortie : hachurée, et jamais recomptée. */
export const HELP_OWNED: readonly Vertex[] = [[112, 88], [178, 78], [200, 118], [140, 134]];
export const HELP_OWNED_D = closedPathD(HELP_OWNED);
/**
 * Les hachures de cette part. Elles sont VERTICALES et calculées entre les
 * bords haut et bas du quadrilatère : des obliques posées à vue débordaient en
 * bas à gauche (constaté en capture le 10/09/2026), et une hachure qui sort de
 * sa zone raconte une possession qui n'existe pas.
 */
export const HELP_OWNED_HATCH: readonly (readonly [Vertex, Vertex])[] = [
  [[124, 89], [124, 105]], [[136, 87], [136, 125]], [[148, 85], [148, 129]],
  [[160, 83], [160, 126]], [[172, 81], [172, 123]], [[184, 91], [184, 120]],
];

/** La limite de commune : indicative, jamais une frontière de jeu. */
export const HELP_COMMUNE: readonly Vertex[] = [[0, 22], [46, 34], [104, 18], [158, 34], [214, 16], [268, 32], [320, 20]];
export const HELP_COMMUNE_D = openPathD(HELP_COMMUNE);

// ─── Chapitre 07 · CE QUE LE SERVEUR REFUSE ─────────────────────────────────

/** Le bouclier de la vérification serveur (commandes absolues uniquement). */
export const HELP_SHIELD_D = 'M60 44L100 30L140 44V94C140 124 120 142 100 152C80 142 60 124 60 94Z';
export const HELP_SHIELD_CHECK_D = 'M82 92L96 106L120 74';

/** Une trace coupée par un saut impossible : les deux moitiés restent séparées. */
export const HELP_JUMP_BEFORE: readonly Vertex[] = [[178, 148], [200, 120], [220, 124]];
export const HELP_JUMP_AFTER: readonly Vertex[] = [[264, 62], [288, 44]];
export const HELP_JUMP_BEFORE_D = openPathD(HELP_JUMP_BEFORE);
export const HELP_JUMP_AFTER_D = openPathD(HELP_JUMP_AFTER);
/** Le raccord que le moteur REFUSE de faire, barré d'une croix. */
export const HELP_JUMP_BRIDGE_D = openPathD([[220, 124], [264, 62]]);
export const HELP_JUMP_CROSS: Vertex = [242, 93];
export const HELP_JUMP_CROSS_ARM = 9;

/**
 * Le point atteint après `progress` (0→1) le long d'une polyligne ouverte.
 * C'est la tête du tracé qui avance : sans elle, un chemin qui se dessine n'a
 * pas de « toi, maintenant » et le schéma cesse de raconter un enregistrement.
 */
export function pointAlong(points: readonly Vertex[], progress: number): Vertex {
  const first = points[0];
  if (!first) return [0, 0];
  const clamped = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  let remaining = clamped * openPathLength(points);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (remaining <= length || i === points.length - 1) {
      const ratio = length === 0 ? 0 : Math.min(1, remaining / length);
      return [a[0] + (b[0] - a[0]) * ratio, a[1] + (b[1] - a[1]) * ratio];
    }
    remaining -= length;
  }
  return first;
}
