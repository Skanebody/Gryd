/**
 * GRYD — défis personnels de la semaine : le modèle PUR de l'écran.
 * Contrat serveur : `read_weekly_quests_2026()` (migration 0168).
 *
 * DEUX RÈGLES DE LECTURE, ET ELLES SONT DÉFENSIVES.
 *
 * 1. Une réponse mal formée devient `null`, jamais un écran à moitié rempli :
 *    l'appelant en fait l'état « échec », distinct de « vide » (L8/L14/L19).
 * 2. La réponse ne DOIT porter aucune échéance (ADR-013 §2.2 ①, cahier §4.2 :
 *    « pas de compte à rebours poussant à sortir »). 0168 n'en renvoie pas ;
 *    si un jour il en renvoyait une, ce serait une régression du contrat, pas
 *    une donnée à peindre — le modèle la refuse ici, à la frontière, plutôt que
 *    de laisser un écran inventer une horloge.
 */
import { C } from '../../i18n/catalog/defisSemaine';
import type { Entry } from '../../i18n/types';

export type QuestActivity2026 = 'run' | 'bike';
export type QuestStatus2026 = 'active' | 'completed' | 'expired';
export type QuestFamily2026 =
  | 'start' | 'regularity' | 'exploration' | 'ensemble' | 'hosting' | 'running' | 'cycling' | 'double_practice';
export type QuestCondition2026 =
  | 'new_locality' | 'distinct_loops' | 'validated_group_outing'
  | 'run_day_and_bike_day' | 'active_days' | 'hosted_open_outing';
export type QuestRewardKind2026 =
  | 'sticker' | 'trace_pattern' | 'photo_composition' | 'personal_emblem' | 'poster';

export interface WeeklyQuestReward2026 {
  rewardId: string; label: string; kind: QuestRewardKind2026; slot: string; owned: boolean;
}
export interface WeeklyQuest2026 {
  activity: QuestActivity2026; questId: string; version: number;
  family: QuestFamily2026; condition: QuestCondition2026; threshold: number;
  status: QuestStatus2026; completedAt: string | null; reward: WeeklyQuestReward2026;
}
export interface WeeklyQuestObject2026 {
  rewardId: string; label: string; kind: QuestRewardKind2026; slot: string;
  questId: string; earnedAt: string; equipped: boolean;
}
export interface WeeklyQuests2026 {
  ruleset: string; asOf: string; passedWeek: string;
  current: WeeklyQuest2026[]; passed: WeeklyQuest2026[]; objects: WeeklyQuestObject2026[];
}

const ACTIVITIES: readonly string[] = ['run', 'bike'];
const STATUSES: readonly string[] = ['active', 'completed', 'expired'];
const FAMILIES: readonly string[] = ['start', 'regularity', 'exploration', 'ensemble', 'hosting', 'running', 'cycling', 'double_practice'];
const CONDITIONS: readonly string[] = ['new_locality', 'distinct_loops', 'validated_group_outing', 'run_day_and_bike_day', 'active_days', 'hosted_open_outing'];
const KINDS: readonly string[] = ['sticker', 'trace_pattern', 'photo_composition', 'personal_emblem', 'poster'];

/** Les noms qu'un contrat sans compte à rebours ne peut pas porter. */
const FORBIDDEN_TIME_KEYS: readonly string[] = [
  'expiresAt', 'expiresIn', 'endsAt', 'endsIn', 'remaining', 'remainingDays', 'remainingHours',
  'deadline', 'countdown', 'daysLeft', 'hoursLeft', 'weekEnd', 'weekEndsAt', 'timeLeft',
];

const obj = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const date = (v: unknown): v is string => text(v) && Number.isFinite(Date.parse(v));
const day = (v: unknown): v is string => text(v) && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(`${v}T00:00:00Z`));
const count = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

/** Vrai dès qu'une échéance apparaît, à n'importe quelle profondeur. */
export function carriesCountdown2026(raw: unknown): boolean {
  if (Array.isArray(raw)) return raw.some(carriesCountdown2026);
  const row = obj(raw);
  if (!row) return false;
  return Object.entries(row).some(([key, value]) => FORBIDDEN_TIME_KEYS.includes(key) || carriesCountdown2026(value));
}

function reward(raw: unknown): WeeklyQuestReward2026 | null {
  const row = obj(raw);
  if (!row || !text(row.rewardId) || !text(row.label) || !KINDS.includes(String(row.kind)) ||
    !text(row.slot) || typeof row.owned !== 'boolean') return null;
  return { rewardId: row.rewardId, label: row.label, kind: row.kind as QuestRewardKind2026, slot: row.slot, owned: row.owned };
}

function quest(raw: unknown): WeeklyQuest2026 | null {
  const row = obj(raw);
  if (!row) return null;
  const prize = reward(row.reward);
  if (!prize || !ACTIVITIES.includes(String(row.activity)) || !text(row.questId) || !count(row.version) ||
    !FAMILIES.includes(String(row.family)) || !CONDITIONS.includes(String(row.condition)) ||
    !count(row.threshold) || !STATUSES.includes(String(row.status))) return null;
  const completedAt = row.completedAt === undefined || row.completedAt === null ? null : row.completedAt;
  if (completedAt !== null && !date(completedAt)) return null;
  // « Réussi » et son instant vont ensemble, dans les deux sens : la contrainte
  // SQL de 0167 les tient liés, la lecture refuse de les délier.
  if ((row.status === 'completed') !== (completedAt !== null)) return null;
  return {
    activity: row.activity as QuestActivity2026, questId: row.questId, version: row.version,
    family: row.family as QuestFamily2026, condition: row.condition as QuestCondition2026,
    threshold: row.threshold, status: row.status as QuestStatus2026,
    completedAt: completedAt as string | null, reward: prize,
  };
}

function object2026(raw: unknown): WeeklyQuestObject2026 | null {
  const row = obj(raw);
  if (!row || !text(row.rewardId) || !text(row.label) || !KINDS.includes(String(row.kind)) || !text(row.slot) ||
    !text(row.questId) || !date(row.earnedAt) || typeof row.equipped !== 'boolean') return null;
  return {
    rewardId: row.rewardId, label: row.label, kind: row.kind as QuestRewardKind2026, slot: row.slot,
    questId: row.questId, earnedAt: row.earnedAt, equipped: row.equipped,
  };
}

export function parseWeeklyQuests2026(raw: unknown): WeeklyQuests2026 | null {
  const row = obj(raw);
  if (!row || carriesCountdown2026(row)) return null;
  if (!text(row.ruleset) || !date(row.asOf) || !day(row.passedWeek) ||
    !Array.isArray(row.current) || !Array.isArray(row.passed) || !Array.isArray(row.objects)) return null;
  const current = row.current.map(quest);
  const passed = row.passed.map(quest);
  const objects = row.objects.map(object2026);
  if (current.includes(null) || passed.includes(null) || objects.includes(null)) return null;
  // Une semaine « passée » qui ne l'est pas décrirait un calendrier inventé.
  if (Date.parse(`${row.passedWeek}T00:00:00Z`) > Date.parse(row.asOf)) return null;
  return {
    ruleset: row.ruleset, asOf: row.asOf, passedWeek: row.passedWeek,
    current: current as WeeklyQuest2026[], passed: passed as WeeklyQuest2026[],
    objects: objects as WeeklyQuestObject2026[],
  };
}

/** La condition, en clair — jamais un code, jamais un identifiant serveur. */
export const QUEST_CONDITION_COPY_2026: Readonly<Record<QuestCondition2026, { title: Entry; detail: Entry }>> = {
  new_locality: { title: C.conditionNewLocality, detail: C.conditionNewLocalityDetail },
  distinct_loops: { title: C.conditionDistinctLoops, detail: C.conditionDistinctLoopsDetail },
  validated_group_outing: { title: C.conditionGroupOuting, detail: C.conditionGroupOutingDetail },
  run_day_and_bike_day: { title: C.conditionDoublePractice, detail: C.conditionDoublePracticeDetail },
  active_days: { title: C.conditionActiveDays, detail: C.conditionActiveDaysDetail },
  hosted_open_outing: { title: C.conditionHostedOuting, detail: C.conditionHostedOutingDetail },
};

export const QUEST_FAMILY_COPY_2026: Readonly<Record<QuestFamily2026, Entry>> = {
  start: C.familleDepart,
  regularity: C.familleRegularite,
  exploration: C.familleExploration,
  ensemble: C.familleEnsemble,
  hosting: C.familleAccueil,
  running: C.familleCourse,
  cycling: C.familleVelo,
  double_practice: C.familleDoublePratique,
};

export const QUEST_REWARD_KIND_COPY_2026: Readonly<Record<QuestRewardKind2026, Entry>> = {
  sticker: C.kindSticker,
  trace_pattern: C.kindTracePattern,
  photo_composition: C.kindPhotoComposition,
  personal_emblem: C.kindPersonalEmblem,
  poster: C.kindPoster,
};
