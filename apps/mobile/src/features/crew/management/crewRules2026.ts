/**
 * GRYD — CHARTE, EXIGENCES ET RÈGLES D'UN CREW, côté RÈGLE (LOT Q3).
 *
 * ─── CE QUE CE MODULE EST, ET SURTOUT CE QU'IL N'EST PAS ─────────────────────
 * Il ne DÉCIDE rien. `crew_rules_set_2026` (0188) rejuge intégralement chaque
 * appel : catalogues fermés, valeurs négatives, plafond de journées de défi,
 * commune réelle, et le garde-fou ① (« un retrait sans avertissement préalable
 * n'existe pas »). Ce fichier ne fait que refuser de PEINDRE un enregistrement
 * dont on sait d'avance qu'il serait refusé, et traduire le refus quand il
 * arrive quand même.
 *
 * ─── POURQUOI IL EXISTE MALGRÉ TOUT ──────────────────────────────────────────
 * Parce que l'écran des règles a besoin de deux choses qu'aucune RPC ne rend :
 *   · un BROUILLON (ce que le capitaine est en train de régler, avant d'écrire) ;
 *   · la CONSÉQUENCE d'un réglage sur le crew tel qu'il est aujourd'hui
 *     (§4.1 B : « un capitaine doit voir la conséquence avant de l'armer, pas
 *     après »). Elle se dérive du tableau de suivi déjà lu, jamais d'un second
 *     appel : le serveur n'a pas de RPC de simulation, et en inventer une côté
 *     client ferait mentir l'écran dès que les deux calculs divergeraient.
 *
 * ─── PUR : AUCUN REACT, AUCUN RÉSEAU ─────────────────────────────────────────
 * Règle projet — logique = fonction pure + tests Deno. Les appels vivent dans
 * `crewManagementData.ts`, les écrans dans `app/crew-regles.tsx` et
 * `app/crew-rejoindre.tsx`.
 *
 * ⚠ MIROIR À TENIR. Chaque borne ci-dessous existe DEUX FOIS : ici, et dans
 * 0188. `crewRules2026.test.ts` et `supabase/tests/crew_rules_2026.pglite.test.mjs`
 * vérifient la même table de vérité — si l'un des deux dérive, l'autre le dit.
 */
import {
  CREW_CHARTER_MAX_CHARS,
  CREW_ENFORCEMENT_KEYS,
  CREW_MIN_CHALLENGE_DAYS_MAX,
  CREW_REQUIREMENT_KEYS,
  type CrewEnforcementKey,
  type CrewRequirementKey,
} from '@klaim/shared';

// ─── Lecture DÉFENSIVE du jsonb (le serveur reste souverain) ─────────────────

const asText = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;

const asMs = (v: unknown): number | null => {
  if (typeof v !== 'string' || v.length === 0) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
};

/** Un nombre du serveur, ou `null`. JAMAIS `0` par défaut : zéro veut dire « règle éteinte ». */
const asNumber = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. CE QUE LE SERVEUR REND — `crew_rules_get_2026`
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les exigences d'entrée, telles que le serveur les stocke. Toutes facultatives :
 * une clé ABSENTE et une clé à ZÉRO veulent dire la même chose, « aucune
 * exigence » (§6.4). C'est aussi l'état de TOUS les crews existants : le lot Q2
 * n'a rétro-fité personne.
 */
export interface CrewRequirements2026 {
  readonly min_level: number | null;
  readonly min_distance_km_28d: number | null;
  readonly min_active_days_28d: number | null;
  readonly city_id: string | null;
  readonly activity: string | null;
}

/** Les quatre règles appliquées par le job quotidien. Zéro = ÉTEINTE. */
export type CrewEnforcement2026 = Readonly<Record<CrewEnforcementKey, number>>;

export interface CrewRules2026 {
  /** `null` = ce crew n'a PAS de charte. Jamais une chaîne vide inventée. */
  readonly charter: string | null;
  readonly charterVersion: number;
  /**
   * La version que J'AI acceptée, ou `null` si je n'ai jamais rien accepté.
   * `null` n'est pas `0` : « je n'ai rien accepté » et « j'ai accepté la
   * version 0 » ne sont pas la même phrase, et la seconde n'existe pas.
   */
  readonly myAcceptedVersion: number | null;
  readonly requirements: CrewRequirements2026;
  readonly enforcement: CrewEnforcement2026;
  readonly updatedAtMs: number | null;
}

export const EMPTY_REQUIREMENTS: CrewRequirements2026 = {
  min_level: null,
  min_distance_km_28d: null,
  min_active_days_28d: null,
  city_id: null,
  activity: null,
};

export const EMPTY_ENFORCEMENT: CrewEnforcement2026 = {
  min_weekly_outings: 0,
  min_challenge_days: 0,
  max_inactivity_days: 0,
  auto_remove_after_days: 0,
};

function parseRequirements(raw: unknown): CrewRequirements2026 {
  if (typeof raw !== 'object' || raw === null) return EMPTY_REQUIREMENTS;
  const o = raw as Record<string, unknown>;
  return {
    min_level: asNumber(o.min_level),
    min_distance_km_28d: asNumber(o.min_distance_km_28d),
    min_active_days_28d: asNumber(o.min_active_days_28d),
    city_id: asText(o.city_id),
    activity: asText(o.activity),
  };
}

function parseEnforcement(raw: unknown): CrewEnforcement2026 {
  if (typeof raw !== 'object' || raw === null) return EMPTY_ENFORCEMENT;
  const o = raw as Record<string, unknown>;
  const out: Record<CrewEnforcementKey, number> = { ...EMPTY_ENFORCEMENT };
  for (const key of CREW_ENFORCEMENT_KEYS) {
    // Une valeur illisible vaut ZÉRO, c'est-à-dire « éteinte ». Le défaut le
    // plus sûr : au pire on n'affiche pas une règle qui existe, jamais
    // l'inverse — annoncer une règle qui n'est pas armée serait une menace
    // sans objet.
    out[key] = Math.max(0, asNumber(o[key]) ?? 0);
  }
  return out;
}

/** `null` = je n'ai pas lu des règles valides. L'écran dit l'échec, jamais « aucune règle ». */
export function parseCrewRules(raw: unknown): CrewRules2026 | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.ok !== true) return null;
  return {
    charter: asText(o.charter),
    charterVersion: Math.max(1, asNumber(o.charterVersion) ?? 1),
    myAcceptedVersion: asNumber(o.myAcceptedVersion),
    requirements: parseRequirements(o.requirements),
    enforcement: parseEnforcement(o.enforcement),
    updatedAtMs: asMs(o.updatedAt),
  };
}

// ─── Dérivations pures ───────────────────────────────────────────────────────

/** Les clés d'exigence RÉELLEMENT posées, dans l'ordre de `CREW_REQUIREMENT_KEYS`. */
export function activeRequirements(
  req: CrewRequirements2026,
): readonly { key: CrewRequirementKey; value: number | string }[] {
  const out: { key: CrewRequirementKey; value: number | string }[] = [];
  for (const key of CREW_REQUIREMENT_KEYS) {
    const v = req[key];
    if (typeof v === 'number' && v > 0) out.push({ key, value: v });
    if (typeof v === 'string' && v.length > 0) out.push({ key, value: v });
  }
  return out;
}

/** Les règles RÉELLEMENT armées. Zéro n'y figure jamais : ce n'est pas un seuil. */
export function activeEnforcement(
  enf: CrewEnforcement2026,
): readonly { key: CrewEnforcementKey; value: number }[] {
  return CREW_ENFORCEMENT_KEYS.filter((k) => enf[k] > 0).map((key) => ({ key, value: enf[key] }));
}

/**
 * La charte a-t-elle changé depuis que je l'ai acceptée ? MIROIR du refus
 * `charter_stale` de 0188.
 *
 * ⚠ UN CREW SANS CHARTE N'EST JAMAIS « PÉRIMÉ ». Sans ce garde, tout membre
 * d'un crew sans charte verrait un bandeau « la charte a changé » à vie, sur un
 * texte qui n'existe pas — le bouton mort le plus gênant qui soit, puisqu'il
 * accuse le lecteur de ne pas avoir lu.
 */
export function charterStale(rules: CrewRules2026): boolean {
  if (rules.charter === null) return false;
  return rules.myAcceptedVersion !== rules.charterVersion;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. L'ÉLIGIBILITÉ — « il te manque 2 km », jamais « tu n'es pas éligible »
// ═══════════════════════════════════════════════════════════════════════════

/** `unit` du serveur (§6.3). `city` et `activity` portent des chaînes, pas des nombres. */
export type MissingUnit = 'level' | 'km' | 'days' | 'city' | 'activity';

export interface MissingRequirement2026 {
  readonly key: CrewRequirementKey;
  readonly unit: MissingUnit;
  /** Ce que le crew demande. Nombre pour level/km/days, texte pour city/activity. */
  readonly need: number | string;
  /**
   * Ce que J'AI. `null` = le serveur ne l'a pas rendu : on dit alors ce qui est
   * demandé sans prétendre savoir où j'en suis (une valeur devinée serait pire
   * qu'un manque non chiffré).
   */
  readonly have: number | string | readonly string[] | null;
}

export interface CrewEligibility2026 {
  readonly eligible: boolean;
  readonly missing: readonly MissingRequirement2026[];
  readonly charterVersion: number;
  /** Y a-t-il une charte à accepter ? `false` = ce crew n'en a pas. */
  readonly charterRequired: boolean;
  /** La porte humaine, DITE : une invitation outrepasse toujours les exigences. */
  readonly invitesBypass: boolean;
}

const UNITS: readonly string[] = ['level', 'km', 'days', 'city', 'activity'];

export function parseMissing(raw: unknown): readonly MissingRequirement2026[] {
  if (!Array.isArray(raw)) return [];
  const out: MissingRequirement2026[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const key = asText(o.key);
    const unit = asText(o.unit);
    if (!key || !unit) continue;
    if (!(CREW_REQUIREMENT_KEYS as readonly string[]).includes(key)) continue;
    if (!UNITS.includes(unit)) continue;
    const need =
      typeof o.need === 'number' ? o.need : typeof o.need === 'string' ? o.need : null;
    if (need === null) continue;
    const have =
      typeof o.have === 'number'
        ? o.have
        : typeof o.have === 'string'
          ? o.have
          : Array.isArray(o.have)
            ? o.have.filter((x): x is string => typeof x === 'string')
            : null;
    out.push({
      key: key as CrewRequirementKey,
      unit: unit as MissingUnit,
      need,
      have,
    });
  }
  return out;
}

export function parseEligibility(raw: unknown): CrewEligibility2026 | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.ok !== true) return null;
  const missing = parseMissing(o.missing);
  return {
    // `eligible` est celui du SERVEUR, jamais dérivé de `missing.length` : les
    // deux disent la même chose aujourd'hui, mais c'est le serveur qui décide,
    // et une divergence future doit se voir plutôt que se lisser.
    eligible: o.eligible === true,
    missing,
    charterVersion: Math.max(1, asNumber(o.charterVersion) ?? 1),
    charterRequired: o.charterRequired === true,
    invitesBypass: o.invitesBypass === true,
  };
}

/**
 * L'ÉCART CHIFFRÉ, pour les unités qui en ont un.
 *
 * C'est la phrase du fondateur : « il te manque 2 km cette semaine ». `null`
 * quand l'écart n'a pas de sens (commune, discipline) ou quand `have` n'a pas
 * été rendu : l'écran dit alors ce qui est DEMANDÉ, sans inventer un manque.
 */
export function shortfallOf(m: MissingRequirement2026): number | null {
  if (typeof m.need !== 'number' || typeof m.have !== 'number') return null;
  const gap = m.need - m.have;
  return gap > 0 ? Math.round(gap * 100) / 100 : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE BROUILLON DU CAPITAINE — ce qu'il règle avant d'écrire
// ═══════════════════════════════════════════════════════════════════════════

export interface RulesDraft2026 {
  /** Le texte tel qu'il est tapé. Vide = « pas de charte » (le serveur nullifie). */
  charter: string;
  requirements: {
    min_level: number;
    min_distance_km_28d: number;
    min_active_days_28d: number;
    /** `null` = aucune exigence de commune. Jamais une chaîne vide. */
    city_id: string | null;
    activity: string | null;
  };
  enforcement: Record<CrewEnforcementKey, number>;
}

export function draftOfRules(rules: CrewRules2026): RulesDraft2026 {
  return {
    charter: rules.charter ?? '',
    requirements: {
      min_level: rules.requirements.min_level ?? 0,
      min_distance_km_28d: rules.requirements.min_distance_km_28d ?? 0,
      min_active_days_28d: rules.requirements.min_active_days_28d ?? 0,
      city_id: rules.requirements.city_id,
      activity: rules.requirements.activity,
    },
    enforcement: { ...rules.enforcement },
  };
}

/**
 * LE GARDE-FOU ① DE LA DÉCISION 1, dit AVANT le tap : le retrait automatique ne
 * peut être armé que si l'avertissement d'inactivité l'est aussi. L'écran grise
 * le réglage au lieu de le laisser partir se faire refuser (`bad_rules` /
 * `removal_without_warning`).
 */
export function removalArmable(draft: RulesDraft2026): boolean {
  return draft.enforcement.max_inactivity_days > 0;
}

/**
 * Ce qui EMPÊCHE d'enregistrer, ou `null`. MIROIR des refus `bad_rules` de 0188,
 * plus `pristine` — qui n'est PAS une erreur : on ne crie pas sur quelqu'un qui
 * vient d'ouvrir la page.
 */
export type RulesBlock2026 =
  | 'pristine'
  | 'charter_too_long'
  | 'negative'
  | 'challenge_days_over_max'
  | 'removal_without_warning';

export function rulesBlock(
  rules: CrewRules2026,
  draft: RulesDraft2026,
): RulesBlock2026 | null {
  if (draft.charter.trim().length > CREW_CHARTER_MAX_CHARS) return 'charter_too_long';
  const values = [
    draft.requirements.min_level,
    draft.requirements.min_distance_km_28d,
    draft.requirements.min_active_days_28d,
    ...CREW_ENFORCEMENT_KEYS.map((k) => draft.enforcement[k]),
  ];
  if (values.some((v) => !Number.isFinite(v) || v < 0)) return 'negative';
  if (draft.enforcement.min_challenge_days > CREW_MIN_CHALLENGE_DAYS_MAX) {
    return 'challenge_days_over_max';
  }
  if (draft.enforcement.auto_remove_after_days > 0 && !removalArmable(draft)) {
    return 'removal_without_warning';
  }
  if (!isRulesDirty(rules, draft)) return 'pristine';
  return null;
}

export function isRulesDirty(rules: CrewRules2026, draft: RulesDraft2026): boolean {
  const ref = draftOfRules(rules);
  if (ref.charter.trim() !== draft.charter.trim()) return true;
  if (ref.requirements.min_level !== draft.requirements.min_level) return true;
  if (ref.requirements.min_distance_km_28d !== draft.requirements.min_distance_km_28d) return true;
  if (ref.requirements.min_active_days_28d !== draft.requirements.min_active_days_28d) return true;
  if (ref.requirements.city_id !== draft.requirements.city_id) return true;
  if (ref.requirements.activity !== draft.requirements.activity) return true;
  return CREW_ENFORCEMENT_KEYS.some((k) => ref.enforcement[k] !== draft.enforcement[k]);
}

/**
 * La charge utile de `crew_rules_set_2026`. LES TROIS CHAMPS PARTENT ENSEMBLE,
 * TOUJOURS, et c'est le piège n° 1 de cet écran : la RPC fait
 * `coalesce(p_requirements, '{}')`. N'envoyer que la charte remettrait donc
 * exigences ET règles à zéro EN SILENCE — un crew perdrait ses seuils parce que
 * son capitaine a corrigé une faute d'orthographe. D'où un seul écran, un seul
 * brouillon, un seul appel.
 *
 * Une valeur à ZÉRO n'est pas omise : elle est écrite, et c'est ce qui permet
 * d'ÉTEINDRE une règle. Seules les exigences textuelles (commune, discipline)
 * disparaissent de l'objet quand elles sont nulles, parce que le serveur les
 * teste par `nullif(… , '')`.
 */
export function rulesPayload(draft: RulesDraft2026): {
  p_charter: string | null;
  p_requirements: Record<string, number | string>;
  p_enforcement: Record<string, number>;
} {
  const charter = draft.charter.trim();
  const req: Record<string, number | string> = {
    min_level: draft.requirements.min_level,
    min_distance_km_28d: draft.requirements.min_distance_km_28d,
    min_active_days_28d: draft.requirements.min_active_days_28d,
  };
  if (draft.requirements.city_id) req.city_id = draft.requirements.city_id;
  if (draft.requirements.activity) req.activity = draft.requirements.activity;
  const enf: Record<string, number> = {};
  for (const key of CREW_ENFORCEMENT_KEYS) enf[key] = draft.enforcement[key];
  return {
    p_charter: charter.length > 0 ? charter : null,
    p_requirements: req,
    p_enforcement: enf,
  };
}

/**
 * Le `detail` d'un `bad_rules`, ramené au catalogue FERMÉ de §6.4. Un détail
 * inconnu rend `null` : l'écran affiche alors le refus générique plutôt qu'une
 * traduction devinée.
 */
export const BAD_RULES_DETAILS = [
  'charter_too_long',
  'not_an_object',
  'unknown_requirement',
  'unknown_enforcement',
  'negative_requirement',
  'negative_enforcement',
  'challenge_days_over_max',
  'unknown_city',
  'unknown_activity',
  'removal_without_warning',
] as const;
export type BadRulesDetail = (typeof BAD_RULES_DETAILS)[number];

export function badRulesDetail(raw: unknown): BadRulesDetail | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const d = asText(o.detail);
  return d && (BAD_RULES_DETAILS as readonly string[]).includes(d)
    ? (d as BadRulesDetail)
    : null;
}
