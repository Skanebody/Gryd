/**
 * GRYD — LA FORMULATION de la gestion de crew : une mesure, une exigence, un
 * manque, une règle → UNE phrase. PUR (aucun React, aucun réseau) : la fonction
 * de traduction est passée en paramètre, ce qui rend chaque phrase testable en
 * Deno sans monter un écran.
 *
 * ─── POURQUOI CENTRALISER ────────────────────────────────────────────────────
 * Trois écrans lisent les mêmes faits (le tableau du capitaine, la fiche
 * publique, « ma situation ») et un quatrième les compare aux miens (« demander
 * à rejoindre »). Si chacun écrivait sa phrase, deux surfaces finiraient par
 * appeler « conforme » deux états différents, et surtout : une seule d'entre
 * elles se souviendrait que `'not_shared'` n'est PAS un zéro.
 *
 * ⚠ LA RÈGLE QUE CE FICHIER FAIT RESPECTER : `measureText` est le SEUL chemin
 * d'une mesure vers un texte. Il n'existe aucune surcharge qui accepte un
 * `?? 0` : un zéro affirmerait « cette personne n'a pas couru » là où le
 * serveur a dit « je ne te le montre pas » (L8).
 */
import type { Activity, CrewEnforcementKey, CrewRequirementKey } from '@klaim/shared';
import { CREW_MEASURE_NOT_SHARED } from '@klaim/shared';
import type { Entry } from '../../../i18n/types';
import {
  CREW_ACTIVITY_E,
  CREW_ENFORCEMENT_E,
  CREW_REQUIREMENT_E,
  G,
} from '../../../i18n/catalog/crewGestion';
import { isShared, type CrewMeasure, type LastRun } from './crewBoard2026';
import type { MissingRequirement2026 } from './crewRules2026';
import { shortfallOf } from './crewRules2026';

/** La signature de `useT()` — passée, jamais importée : ce module reste pur. */
export type Translate = (entry: Entry, vars?: Record<string, string | number>) => string;

const DAY_MS = 86_400_000;

/** Un nombre lisible : au plus une décimale, et jamais « 12.0 ». */
export function num(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

/**
 * UNE MESURE → UN TEXTE. Le seul chemin autorisé.
 * `'not_shared'` devient « non partagé », jamais « 0 », jamais un tiret.
 */
export function measureText(t: Translate, m: CrewMeasure): string {
  return isShared(m) ? num(m) : t(G.boardMeasureNotShared);
}

/**
 * LA DERNIÈRE SORTIE, en trois cas qui ne se confondent jamais :
 * masquée · jamais sortie · il y a N jours. Le troisième est le seul qui porte
 * un chiffre, et c'est ce qui rend les deux autres lisibles.
 */
export function lastRunText(t: Translate, v: LastRun, nowMs: number): string {
  if (v === CREW_MEASURE_NOT_SHARED) return t(G.boardMeasureNotShared);
  if (v === null) return t(G.boardNeverRan);
  const days = Math.floor((nowMs - v) / DAY_MS);
  return days <= 0 ? t(G.boardLastRunToday) : t(G.boardLastRunDays, { n: days });
}

/** Une discipline nommée, ou son identifiant brut si le serveur en invente une. */
export function activityName(t: Translate, key: string): string {
  return key === 'run' || key === 'bike' ? t(CREW_ACTIVITY_E[key as Activity]) : key;
}

/**
 * UNE EXIGENCE D'ENTRÉE, dite en clair sur la fiche publique. La commune est
 * volontairement rendue SANS son identifiant INSEE : un code n'apprend rien à
 * qui lit, et le nom de la commune n'est pas dans ce contrat.
 */
export function requirementLine(
  t: Translate,
  key: CrewRequirementKey,
  value: number | string,
): string {
  switch (key) {
    case 'min_level':
      return t(G.reqLevel, { n: num(Number(value)) });
    case 'min_distance_km_28d':
      return t(G.reqKm, { n: num(Number(value)) });
    case 'min_active_days_28d':
      return t(G.reqDays, { n: num(Number(value)) });
    case 'city_id':
      return t(G.reqCity);
    case 'activity':
      return t(G.reqActivity, { name: activityName(t, String(value)) });
  }
}

/** UNE RÈGLE ARMÉE, dite en clair. Elle vaut pour la fiche publique ET « ma situation ». */
export function enforcementLine(
  t: Translate,
  key: CrewEnforcementKey,
  value: number,
): string {
  switch (key) {
    case 'min_weekly_outings':
      return t(G.enfWeekly, { n: num(value) });
    case 'min_challenge_days':
      return t(G.enfChallenge, { n: num(value) });
    case 'max_inactivity_days':
      return t(G.enfInactivity, { n: num(value) });
    case 'auto_remove_after_days':
      return t(G.enfAutoRemove, { n: num(value) });
  }
}

/**
 * CE QUI MANQUE, ET DE COMBIEN. C'est la phrase du fondateur : « il te manque
 * 2 km cette semaine ». Jamais « tu n'es pas éligible » tout seul, qui ne dit
 * ni quoi ni de combien, et ne laisse aucune suite possible.
 *
 * Quand l'écart n'est pas calculable (`have` absent, unité textuelle), la
 * phrase dit ce qui est DEMANDÉ plutôt que d'inventer un manque : mieux vaut
 * une exigence sans écart qu'un écart faux.
 */
export function missingLine(t: Translate, m: MissingRequirement2026): string {
  const gap = shortfallOf(m);
  switch (m.key) {
    case 'min_level':
      return typeof m.have === 'number'
        ? t(G.missLevel, { need: num(Number(m.need)), have: num(m.have) })
        : t(G.missGeneric, { label: t(CREW_REQUIREMENT_E.min_level), need: num(Number(m.need)) });
    case 'min_distance_km_28d':
      return gap === null
        ? t(G.missGeneric, {
            label: t(CREW_REQUIREMENT_E.min_distance_km_28d),
            need: num(Number(m.need)),
          })
        : t(G.missKm, { need: num(Number(m.need)), gap: num(gap) });
    case 'min_active_days_28d':
      return gap === null
        ? t(G.missGeneric, {
            label: t(CREW_REQUIREMENT_E.min_active_days_28d),
            need: num(Number(m.need)),
          })
        : t(G.missDays, { need: num(Number(m.need)), gap: num(gap) });
    case 'city_id':
      return t(G.missCity);
    case 'activity':
      return t(G.missActivity, { name: activityName(t, String(m.need)) });
  }
}

/** Le libellé court d'une règle, pour un en-tête ou une puce. */
export function enforcementLabel(t: Translate, key: CrewEnforcementKey): string {
  return t(CREW_ENFORCEMENT_E[key]);
}

/**
 * Une date, en toutes lettres et dans la langue courante. `null` rend `null` :
 * une date absente ne devient JAMAIS « aujourd'hui », qui serait une affirmation.
 */
export function dayText(ms: number | null, locale: string): string | null {
  if (ms === null || !Number.isFinite(ms)) return null;
  try {
    return new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  } catch {
    return null;
  }
}

/** Ancienneté d'une demande : aujourd'hui, ou « il y a N j ». */
export function requestAgeText(t: Translate, atMs: number | null, nowMs: number): string | null {
  if (atMs === null) return null;
  const days = Math.floor((nowMs - atMs) / DAY_MS);
  return days <= 0 ? t(G.requestAgeToday) : t(G.requestAge, { n: days });
}
