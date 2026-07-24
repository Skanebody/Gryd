/**
 * GRYD — modes de course + formateurs d'affichage.
 *
 * ─── CE QUI A DISPARU LE 21/07/2026 (A-47, lot « DemoCourseLive ») ──────────
 * Ce fichier s'appelait « simulation » parce qu'il en était une : 617 lignes qui
 * FABRIQUAIENT une course. Un PRNG à graine fixe (mulberry32) produisait 96
 * ticks — position, distance qui monte jusqu'à 8,2 km, allure, hexes « estimés »
 * jusqu'à 214, jauges GPS/Motion Trust, événements scriptés (GPS faible, zone
 * privée, secteur contesté) — plus un crew inventé (« LES FOULÉES 9³ », joueur
 * « KORO », « Paris Est passe à 62 % », « gagne 1 rang »). `resultStats()`
 * transformait ce scénario en bilan de fin de course.
 *
 * Rien de tout cela n'a jamais mesuré quoi que ce soit. C'était une course
 * présentée à la place de celle du joueur — le mensonge le plus grave du
 * produit, puisqu'il produisait des ZONES CAPTURÉES. Tout est supprimé, avec ses
 * consommateurs (`liveNav.ts`, `loop.ts`, `livemates.ts`, `indications.ts`,
 * `LiveNavMap.tsx`, `DemoCourseLive`). Le générateur n'existe plus : une course
 * simulée n'est plus REPRÉSENTABLE, pas seulement inatteignable.
 *
 * ─── CE QUI RESTE, ET POURQUOI ──────────────────────────────────────────────
 * Uniquement des choses qui ne prétendent rien sur le joueur :
 *   - `LiveRunMode` / `runModeFromParam` : quel mode de course a été demandé ;
 *   - `RUN_MODE_LABEL` : son nom affichable ;
 *   - `formatClock` / `formatPace` / `formatKm` : de la mise en forme. Ils
 *     formatent aujourd'hui des MESURES réelles (tracker GPS) — ce sont les
 *     mêmes fonctions, appliquées à de vrais nombres.
 *
 * NOTE — le nom du fichier ment maintenant par excès : il ne contient plus de
 * simulation. Le renommer (`runFormat.ts`) touche `app/course-result.tsx` et
 * `features/share/shareRun.ts`, hors du périmètre de ce lot : c'est signalé
 * plutôt que fait en douce.
 */
import type { RunMode } from '@klaim/shared';
import { decimalSeparator } from '../../ui/format';

// ─── Modes ───────────────────────────────────────────────────────────────────

/** Modes actifs au départ (AMENDEMENT-07 §2 — race_mode/event_run = V1). */
export type LiveRunMode = Extract<RunMode, 'conquete' | 'social_run' | 'course_privee'>;

/**
 * Nom affichable du mode. Encore en français en dur : seul `modeConquete` existe
 * au catalogue i18n (`catalog/runGps.ts`), et compléter la parité 5 langues
 * suppose d'écrire dans `src/i18n/`, hors périmètre de ce lot. Signalé, pas masqué.
 */
export const RUN_MODE_LABEL: Record<LiveRunMode, string> = {
  conquete: 'Conquête',
  social_run: 'Social Run',
  course_privee: 'Course privée',
};

/** Parse le paramètre de route `mode` (défaut conquete — jamais de crash). */
export function runModeFromParam(param: string | string[] | undefined): LiveRunMode {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === 'social_run' || value === 'course_privee') return value;
  return 'conquete';
}

// ─── Formatage (identique iOS/Android — pas d'Intl, cf. src/ui/format.ts) ────

/** « 44:48 » ou « 1:02:11 » (mono tabular-nums côté écran). */
export function formatClock(totalS: number): string {
  const s = Math.max(0, Math.round(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Allure « 5'28 » (s/km → min'sec). */
export function formatPace(sPerKm: number): string {
  if (!Number.isFinite(sPerKm) || sPerKm <= 0) return `0'00`;
  const s = Math.round(sPerKm);
  return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}`;
}

/** Distance « 8,20 » (km, 2 décimales) — séparateur décimal de la langue (§26). */
export function formatKm(distanceM: number): string {
  return (Math.max(0, distanceM) / 1000).toFixed(2).replace('.', decimalSeparator());
}
