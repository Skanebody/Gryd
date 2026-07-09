/**
 * GRYD — challenges actifs depuis Supabase (0012).
 */
import type { ChallengeDifficulty, ChallengeType } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { fetchActiveCrew } from '../crew/crewApi';
import type { ChallengeCard } from './demo';

interface GoalJson {
  metric?: string;
  target?: number;
  min?: number;
}

interface ChallengeRow {
  id: string;
  slug: string | null;
  type: string;
  name: string;
  description: string | null;
  difficulty: string;
  primary_goal: GoalJson;
  personal_minimum: GoalJson | null;
  collective_goal: GoalJson | null;
  reward_personal: { badgeKey?: string; chest?: string } | null;
  crew_a_id: string | null;
  crew_b_id: string | null;
}

interface ProgressRow {
  challenge_id: string;
  kind: string;
  subject_id: string;
  progress: number;
  contribution: Record<string, number> | null;
}

const METRIC_UNIT: Record<string, string> = {
  runs: 'courses',
  distanceM: 'km',
  hexes: 'zones',
  defends: 'zones',
};

function unitFor(metric: string): string {
  return METRIC_UNIT[metric] ?? metric;
}

function rewardLabel(row: ChallengeRow): string {
  const badge = row.reward_personal?.badgeKey;
  if (badge) return `Badge ${badge}`;
  if (row.reward_personal?.chest) return 'Coffre crew';
  return 'Récompense à débloquer';
}

function cardFromRow(
  row: ChallengeRow,
  progress: number,
  extras: Partial<ChallengeCard> = {},
): ChallengeCard {
  const metric = row.primary_goal.metric ?? 'runs';
  const target =
    row.type === 'crew' && row.collective_goal?.target != null
      ? Number(row.collective_goal.target)
      : Number(row.primary_goal.target ?? 0);

  return {
    id: row.slug ?? row.id,
    type: row.type as ChallengeType,
    name: row.name,
    blurb: row.description ?? '',
    difficulty: row.difficulty as ChallengeDifficulty,
    metric,
    current: progress,
    target,
    unit: unitFor(metric),
    personalMinimum:
      row.personal_minimum?.min != null ? Number(row.personal_minimum.min) : undefined,
    reward: rewardLabel(row),
    ...extras,
  };
}

export async function fetchActiveChallenges(userId: string): Promise<ChallengeCard[]> {
  if (supabase === null) return [];

  const now = new Date().toISOString();
  const { data: rows, error } = await supabase
    .from('challenges')
    .select(
      'id, slug, type, name, description, difficulty, primary_goal, personal_minimum, collective_goal, reward_personal, crew_a_id, crew_b_id',
    )
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('starts_at', { ascending: true });

  if (error || !Array.isArray(rows) || rows.length === 0) return [];

  const crew = await fetchActiveCrew(userId);
  const crewId = crew?.crewId ?? null;

  const { data: progressRows } = await supabase
    .from('challenge_progress')
    .select('challenge_id, kind, subject_id, progress, contribution');

  const progressByKey = new Map<string, ProgressRow>();
  if (Array.isArray(progressRows)) {
    for (const p of progressRows as ProgressRow[]) {
      progressByKey.set(`${p.challenge_id}:${p.kind}:${p.subject_id}`, p);
    }
  }

  const cards: ChallengeCard[] = [];

  for (const raw of rows as ChallengeRow[]) {
    if (raw.type === 'rivalry' && raw.crew_a_id && raw.crew_b_id && crewId) {
      const progA = progressByKey.get(`${raw.id}:crew:${raw.crew_a_id}`);
      const progB = progressByKey.get(`${raw.id}:crew:${raw.crew_b_id}`);
      const [crewA, crewB] = await Promise.all([
        supabase.from('crews').select('name').eq('id', raw.crew_a_id).maybeSingle(),
        supabase.from('crews').select('name').eq('id', raw.crew_b_id).maybeSingle(),
      ]);
      const mineIsA = crewId === raw.crew_a_id;
      const rivalMine = Number(mineIsA ? progA?.progress : progB?.progress ?? 0);
      const rivalOther = Number(mineIsA ? progB?.progress : progA?.progress ?? 0);
      const partnerName = mineIsA
        ? (crewB.data?.name as string | undefined) ?? 'Rival'
        : (crewA.data?.name as string | undefined) ?? 'Rival';
      cards.push(
        cardFromRow(raw, rivalMine, {
          partnerName,
          rivalMine,
          rivalOther,
          target: Math.max(rivalMine, rivalOther, 1),
        }),
      );
      continue;
    }

    if (raw.type === 'crew' && crewId) {
      const prog = progressByKey.get(`${raw.id}:crew:${crewId}`);
      const myProg = progressByKey.get(`${raw.id}:user:${userId}`);
      cards.push(
        cardFromRow(raw, Number(prog?.progress ?? 0), {
          myContrib: Number(myProg?.progress ?? 0),
        }),
      );
      continue;
    }

    if (raw.type === 'solo') {
      const prog = progressByKey.get(`${raw.id}:user:${userId}`);
      cards.push(cardFromRow(raw, Number(prog?.progress ?? 0)));
    }
  }

  return cards;
}

export function findChallengeInList(
  challenges: readonly ChallengeCard[],
  id: string,
): ChallengeCard | undefined {
  return challenges.find((c) => c.id === id);
}
