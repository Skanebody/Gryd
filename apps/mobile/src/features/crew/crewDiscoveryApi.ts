/**
 * GRYD — crews découvrables depuis Supabase (discovery + page publique).
 */
import { CREW_MAX_MEMBERS, type CrewRecruitmentStatus, type CrewRole, type CrewTag } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { fetchCrewMemberCount } from './crewApi';
import type { PublicCrewDemo } from './publicDemo';

interface CrewRow {
  id: string;
  name: string;
  tag: string | null;
  slug: string | null;
  city_id: string;
  code: string;
  xp: number;
  activity_score: number;
  recruitment_status: string;
  tags: string[] | null;
  langue: string;
  objectif: string;
  war_active: boolean;
  defense_active: boolean;
  beginner_friendly: boolean;
  pioneer_friendly: boolean;
}

function cityLabel(cityId: string): string {
  if (cityId === 'paris') return 'Paris';
  if (cityId === 'lille') return 'Lille';
  return cityId.charAt(0).toUpperCase() + cityId.slice(1);
}

function fallbackBio(row: CrewRow): string {
  if (row.beginner_friendly) {
    return 'Crew accueillant — débutants bienvenus. Demande à rejoindre pour en savoir plus.';
  }
  if (row.objectif === 'pionnier') {
    return 'Pionniers : chaque course dessine la carte dans ce secteur.';
  }
  if (row.objectif === 'competitif') {
    return 'Objectif compétitif — on vise le haut du classement local.';
  }
  return 'Ce crew court dans son secteur. Demande à rejoindre pour en savoir plus.';
}

async function weeklyRunCount(crewId: string): Promise<number> {
  if (supabase === null) return 0;
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { count } = await supabase
    .from('group_runs')
    .select('*', { count: 'exact', head: true })
    .eq('crew_id', crewId)
    .gte('started_at', weekAgo);
  return count ?? 0;
}

async function heldHexesForCrew(crewId: string, cityId: string): Promise<number> {
  if (supabase === null) return 0;
  const { data } = await supabase
    .from('crew_leaderboard')
    .select('hexes_held')
    .eq('crew_id', crewId)
    .eq('city_id', cityId)
    .maybeSingle();
  return data ? Number((data as { hexes_held: number }).hexes_held) : 0;
}

async function mapCrewRow(row: CrewRow): Promise<PublicCrewDemo> {
  const [members, weeklyRuns, heldHexes] = await Promise.all([
    fetchCrewMemberCount(row.id),
    weeklyRunCount(row.id),
    heldHexesForCrew(row.id, row.city_id),
  ]);
  const tag = row.tag ?? row.slug?.toUpperCase().slice(0, 6) ?? row.id.slice(0, 4).toUpperCase();
  const recruitment = row.recruitment_status as CrewRecruitmentStatus;
  const slugOrTag = row.slug ?? tag.toLowerCase();

  return {
    id: row.id,
    name: row.name,
    tag,
    city: cityLabel(row.city_id),
    xp: Number(row.xp),
    activityScore: row.activity_score,
    members,
    openSpots: Math.max(0, CREW_MAX_MEMBERS - members),
    recruitment,
    joinCode: recruitment === 'open' ? row.code : undefined,
    tags: (row.tags ?? []) as CrewTag[],
    language: (row.langue ?? 'fr').toUpperCase(),
    objective: row.objectif as PublicCrewDemo['objective'],
    warActive: row.war_active,
    defenseActive: row.defense_active,
    beginnerFriendly: row.beginner_friendly,
    pioneer: row.pioneer_friendly,
    weeklyRuns,
    bio: fallbackBio(row),
    rolesWanted: [] as readonly CrewRole[],
    heldHexes,
    inviteLink: `gryd.run/c/${slugOrTag}`,
  };
}

const CREW_DISCOVERY_SELECT =
  'id, name, tag, slug, city_id, code, xp, activity_score, recruitment_status, tags, langue, objectif, war_active, defense_active, beginner_friendly, pioneer_friendly';

export async function fetchDiscoverableCrews(cityId = 'paris'): Promise<PublicCrewDemo[]> {
  if (supabase === null) return [];

  const { data, error } = await supabase
    .from('crews')
    .select(CREW_DISCOVERY_SELECT)
    .eq('city_id', cityId)
    .neq('recruitment_status', 'closed')
    .order('activity_score', { ascending: false })
    .limit(40);

  if (error || !Array.isArray(data) || data.length === 0) return [];

  return Promise.all((data as CrewRow[]).map(mapCrewRow));
}

export async function fetchPublicCrewByTag(tagOrSlug?: string): Promise<PublicCrewDemo | null> {
  if (supabase === null || tagOrSlug === undefined || tagOrSlug.trim() === '') return null;

  const key = tagOrSlug.trim();
  const upper = key.toUpperCase();
  const lower = key.toLowerCase();

  const byTag = await supabase
    .from('crews')
    .select(CREW_DISCOVERY_SELECT)
    .eq('tag', upper)
    .maybeSingle();
  if (byTag.data) return mapCrewRow(byTag.data as CrewRow);

  const bySlug = await supabase
    .from('crews')
    .select(CREW_DISCOVERY_SELECT)
    .eq('slug', lower)
    .maybeSingle();
  if (bySlug.data) return mapCrewRow(bySlug.data as CrewRow);

  return null;
}
