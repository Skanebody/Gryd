/**
 * GRYD — E17, état technique « batterie » : la LECTURE, variante NAVIGATEUR.
 *
 * Jumeau web de `battery.ts` (résolu par l'extension de plateforme, même patron
 * que `preflightProbe.web.ts`). Il lit `navigator.getBattery()`, c'est-à-dire la
 * VRAIE batterie de la machine — rien n'est simulé.
 *
 * L'API n'est ni universelle ni garantie : Firefox et Safari l'ont retirée pour
 * des raisons de traçage, une page non sécurisée n'y a pas droit, et la promesse
 * peut être rejetée. Chacun de ces cas rend `unknown` — jamais un pourcentage
 * plausible. On ne devine pas une batterie.
 *
 * ⚠ AUCUNE de ces valeurs ne part en analytics. Le niveau de batterie croisé à
 * l'heure est un signal de traçage (c'est précisément pourquoi les navigateurs
 * ont retiré l'API) : il sert à l'écran, à cet instant, et à rien d'autre.
 */
import type { BatteryReading } from './prepareState';

/** Forme minimale de ce que l'API rend — on ne lit que ces deux champs. */
interface BatteryManagerLike {
  level: unknown;
  charging: unknown;
}

export async function readBattery(): Promise<BatteryReading> {
  if (typeof navigator === 'undefined') return { kind: 'unknown' };
  const getBattery = (navigator as unknown as {
    getBattery?: () => Promise<BatteryManagerLike>;
  }).getBattery;
  if (typeof getBattery !== 'function') return { kind: 'unknown' };
  try {
    const battery = await getBattery.call(navigator);
    const level = battery.level;
    // `level` est un ratio 0..1 dans la spec ; un polyfill peut rendre autre
    // chose. Hors de cet intervalle, on ne convertit pas : on ne sait pas.
    if (typeof level !== 'number' || !Number.isFinite(level) || level < 0 || level > 1) {
      return { kind: 'unknown' };
    }
    return {
      kind: 'measured',
      percent: Math.round(level * 100),
      charging: battery.charging === true,
    };
  } catch {
    return { kind: 'unknown' };
  }
}
