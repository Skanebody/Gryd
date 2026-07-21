/**
 * GRYD — géométrie PURE du logo couru (le « G » dessiné par un parcours).
 *
 * Séparé de `visuals.tsx` pour une raison précise : ce module n'importe NI
 * React NI react-native, donc il est testable par Deno — et l'animation du logo
 * est exactement le genre de chose qu'on ne peut PAS vérifier à l'écran. La
 * preview headless a `document.visibilityState === "hidden"` :
 * `requestAnimationFrame` y produit ZÉRO image par seconde, donc toute
 * animation pilotée en JS y paraît figée. Mesuré le 21/07/2026 en cherchant
 * pourquoi le tracé restait bloqué — le défaut était dans l'instrument, pas
 * dans le code. D'où ce filet : la géométrie et le découpage du cycle sont
 * prouvés par des tests, le rendu reste à vérifier sur un vrai appareil.
 *
 * ⚠ Ces proportions doivent rester celles de `scripts/build-brand-icons.mjs`
 * (const G) : l'icône est la LETTRE, ceci est le PARCOURS qui la dessine.
 * Rapport largeur / hauteur de référence : 1,53 (rx/ry).
 */
export const LOGO_VIEW = 200;
export const LOGO_CX = 100;
export const LOGO_CY = 100;
export const LOGO_RX = 72;
export const LOGO_RY = 47;
/** Ouverture du G, à droite : l'arc s'arrête avant de se refermer. */
const LOGO_START_DEG = -34;
const LOGO_END_DEG = -356;
/** Fin de la barre horizontale, légèrement à gauche du centre (comme le logo). */
const LOGO_BAR_END_X = 110;

export type Pt = { x: number; y: number };

/** Le G en points, dans l'ordre où on le court. PURE, déterministe. */
function buildLogoRoute(): Pt[] {
  const pts: Pt[] = [];
  const arcSteps = 132;
  for (let i = 0; i <= arcSteps; i += 1) {
    const k = i / arcSteps;
    const deg = LOGO_START_DEG + (LOGO_END_DEG - LOGO_START_DEG) * k;
    const rad = (deg * Math.PI) / 180;
    // Ondulation ~0,7 px : assez pour évoquer le GPS, pas assez pour déformer.
    const wob = Math.sin(k * 27) * 0.7;
    pts.push({
      x: LOGO_CX + (LOGO_RX + wob) * Math.cos(rad),
      y: LOGO_CY + (LOGO_RY + wob) * Math.sin(rad),
    });
  }
  const last = pts[pts.length - 1] ?? { x: LOGO_CX + LOGO_RX, y: LOGO_CY };
  const barSteps = 26;
  for (let i = 1; i <= barSteps; i += 1) {
    const k = i / barSteps;
    pts.push({
      x: last.x + (LOGO_BAR_END_X - last.x) * k,
      y: last.y + Math.sin(k * 9) * 0.5,
    });
  }
  return pts;
}

export const LOGO_ROUTE = buildLogoRoute();
export const LOGO_POINTS = LOGO_ROUTE.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

/** Longueurs cumulées : servent au masque de révélation ET à situer la tête. */
const LOGO_CUM = (() => {
  const cum = [0];
  for (let i = 1; i < LOGO_ROUTE.length; i += 1) {
    const a = LOGO_ROUTE[i - 1];
    const b = LOGO_ROUTE[i];
    const d = a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
    cum.push((cum[i - 1] ?? 0) + d);
  }
  return cum;
})();
export const LOGO_LEN = LOGO_CUM[LOGO_CUM.length - 1] ?? 1;

/** Position du coureur à l'avancement `p` (0→1). PURE. */
export function logoHeadAt(p: number): Pt {
  const target = Math.max(0, Math.min(1, p)) * LOGO_LEN;
  for (let i = 1; i < LOGO_CUM.length; i += 1) {
    const c1 = LOGO_CUM[i] ?? 0;
    if (c1 >= target) {
      const c0 = LOGO_CUM[i - 1] ?? 0;
      const a = LOGO_ROUTE[i - 1];
      const b = LOGO_ROUTE[i];
      if (!a || !b) break;
      const k = c1 === c0 ? 0 : (target - c0) / (c1 - c0);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
  }
  return LOGO_ROUTE[LOGO_ROUTE.length - 1] ?? { x: LOGO_CX, y: LOGO_CY };
}

/**
 * Cap au point `p`, en degrés. Sert à orienter le repère : un marqueur de
 * position qui ne pointe nulle part se lit comme un point posé, pas comme
 * quelqu'un qui court. PURE.
 */
export function logoHeadingAt(p: number): number {
  const a = logoHeadAt(Math.max(0, p - 0.012));
  const b = logoHeadAt(Math.min(1, p + 0.012));
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}


/**
 * Découpe le cycle linéaire bouclé en progression de TRACÉ.
 *
 * L'animation est UNE seule timing 0→1 sur `drawMs + holdMs` : le tracé occupe
 * la première part, puis le logo est TENU complet le temps d'être lu avant de
 * repartir. Faire ça avec une `Animated.sequence` bouclée ne fonctionne pas sur
 * react-native-web (mesuré : le tracé ne démarre jamais) — d'où ce découpage au
 * rendu, qui marche sur les deux cibles.
 *
 * Courbe cubique in-out : le coureur part doucement, tient son allure, finit
 * posé. PURE.
 */
export function logoDrawProgress(raw: number, drawMs: number, holdMs: number): number {
  const cycle = drawMs + holdMs;
  if (!(cycle > 0) || !(drawMs > 0)) return 0;
  const clamped = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  const t = Math.min(1, (clamped * cycle) / drawMs);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
