/**
 * GRYD — RÉSOLUTION i18n DU CATALOGUE ARSENAL.
 *
 * Le catalogue (`catalog.ts`) reste le MIROIR du seed 0014 (mêmes item_key, mêmes
 * raretés, mêmes prix, mêmes chaînes FR — c'est sa raison d'être documentée). Mais
 * ce que l'écran AFFICHE ne doit plus venir de ces chaînes FR en dur : il vient de
 * `ARSENAL_I18N` (5 langues, parité imposée par `Entry`), résolu ici au rendu.
 *
 * ⚠️ Avant le 24/07/2026, la boutique s'affichait EN FRANÇAIS pour tout le monde
 * (VoiceOver compris) — la seule zone morte i18n de l'app (audit Spéc Unifiée §23,
 * BLOQUANT P0). Ces resolvers la lèvent.
 *
 * INTERPOLATION : les nombres (Éclats, durée de bouclier, caps) ne sont PAS écrits
 * dans la copie — ce sont des placeholders `{n}`/`{hours}`/`{perWeek}`/`{perMonth}`
 * remplis ICI depuis game-rules (aucun nombre magique dans la copie).
 *
 * RÉACTIVITÉ : chaque resolver reçoit le `t` de `useT()` (lié à la langue courante)
 * — le catalogue suit un changement de langue sans redémarrage.
 */
import {
  ECLATS_PACKS,
  FOUNDER_PACK_ECLATS,
  SHIELD_DURATION_HOURS,
  SHIELD_MAX_ACTIVE_PER_WEEK,
  SKUS,
  STARTER_PACK_ECLATS,
  STREAK_FREEZE_FREE_PER_MONTH,
} from '@klaim/shared';
import { ARSENAL_I18N } from '../../i18n/catalog/arsenal';
import type { Entry } from '../../i18n/types';
import type { ArsenalCatalogItem, ArsenalSectionKey } from './catalog';

/** Signature du `t` de `useT()` — passé par l'écran appelant (réactif à la langue). */
export type Translate = (entry: Entry, vars?: Record<string, string | number>) => string;

/**
 * Nombres game-rules interpolés dans la copie d'un item. Seuls les items dont la
 * copie porte un placeholder figurent ici — les autres n'ont aucun `{…}`.
 */
const ARSENAL_VARS: Record<string, Record<string, string | number>> = {
  [SKUS.starterPack]: { n: STARTER_PACK_ECLATS },
  [SKUS.founderPack]: { n: FOUNDER_PACK_ECLATS },
  [SKUS.eclatsS]: { n: ECLATS_PACKS.eclats_s },
  [SKUS.eclatsM]: { n: ECLATS_PACKS.eclats_m },
  [SKUS.eclatsL]: { n: ECLATS_PACKS.eclats_l },
  [SKUS.eclatsXl]: { n: ECLATS_PACKS.eclats_xl },
  [SKUS.eclatsXxl]: { n: ECLATS_PACKS.eclats_xxl },
  shield: { hours: SHIELD_DURATION_HOURS, perWeek: SHIELD_MAX_ACTIVE_PER_WEEK },
  streak_gel: { perMonth: STREAK_FREEZE_FREE_PER_MONTH },
};

function resolveKey(key: string, itemKey: string, t: Translate): string | undefined {
  const entry = ARSENAL_I18N[key];
  return entry ? t(entry, ARSENAL_VARS[itemKey]) : undefined;
}

/** Nom affiché d'un item (traduit). Repli sur la chaîne FR du seed si clé absente. */
export function arsenalName(item: ArsenalCatalogItem, t: Translate): string {
  return resolveKey(`${item.key}.name`, item.key, t) ?? item.name;
}

/** Description affichée d'un item (traduite). */
export function arsenalDescription(item: ArsenalCatalogItem, t: Translate): string {
  return resolveKey(`${item.key}.description`, item.key, t) ?? item.description;
}

/** Limite anti-abus affichée (traduite), ou `undefined` si l'item n'en a pas. */
export function arsenalLimit(item: ArsenalCatalogItem, t: Translate): string | undefined {
  if (item.limit === undefined) return undefined;
  return resolveKey(`${item.key}.limit`, item.key, t) ?? item.limit;
}

/** Contenus d'un pack (traduits), ou `undefined` si l'item n'a pas de `contents`. */
export function arsenalContents(item: ArsenalCatalogItem, t: Translate): string[] | undefined {
  if (!item.contents) return undefined;
  return item.contents.map(
    (fallback, i) => resolveKey(`${item.key}.contents.${i}`, item.key, t) ?? fallback,
  );
}

/** Libellé d'une section (traduit). */
export function arsenalSectionLabel(key: ArsenalSectionKey, t: Translate): string {
  const entry = ARSENAL_I18N[`section.${key}.label`];
  return entry ? t(entry) : key.toUpperCase();
}

/** Note d'une section (traduite), ou `undefined` si la section n'en a pas. */
export function arsenalSectionNote(key: ArsenalSectionKey, t: Translate): string | undefined {
  const entry = ARSENAL_I18N[`section.${key}.note`];
  return entry ? t(entry) : undefined;
}
