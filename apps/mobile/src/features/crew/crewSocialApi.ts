/**
 * GRYD — API crew social live (chat, sorties, requêtes/dons).
 */
import { supabase } from '../../lib/supabase';
import type { ChatThreadMessage } from './chatStore';
import type { OutingRsvp, OutingView, CrewOutingObjective } from './events';
import type { RequestChoiceKey } from './requests';
import { DONATION_DEFAULTS, type DonationKind, type SentDonation } from './requests';
import type { ActionCardDemo, GiftCardDemo } from './feed';

export interface LiveCrewMessage {
  id: string;
  authorId: string;
  authorHandle: string;
  authorName: string | null;
  body: string;
  createdAt: string;
}

export interface LiveCrewEvent {
  id: string;
  title: string;
  whenLabel: string;
  placeLabel: string;
  zoneLabel: string;
  objective: CrewOutingObjective;
  hostHandle: string;
  hostName: string | null;
  goingCount: number;
  myRsvp: OutingRsvp | null;
}

export interface LiveCrewGift {
  id: string;
  title: string;
  rewardsTotal: number;
  claimedCount: number;
  offeredBy: string | null;
  expiresAt: string;
  claimedByMe: boolean;
}

const RSVP_FROM_DB: Record<string, OutingRsvp> = {
  coming: 'Je viens',
  maybe: 'Peut-être',
  no: 'Indispo',
};

const RSVP_TO_DB: Record<OutingRsvp, string> = {
  'Je viens': 'coming',
  'Peut-être': 'maybe',
  'Indispo': 'no',
};

async function invoke(body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  if (supabase === null) return { ok: false, error: 'offline' };
  const { data, error } = await supabase.functions.invoke('crew_social', { body });
  if (error) return { ok: false, error: error.message };
  const payload = data as { ok?: boolean; error?: string };
  if (payload.error) return { ok: false, error: payload.error };
  return { ok: payload.ok === true };
}

export async function fetchCrewMessages(
  crewId: string,
  memberNames: ReadonlyMap<string, string>,
  limit = 50,
): Promise<LiveCrewMessage[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('crew_messages')
    .select('id, author_id, body, created_at')
    .eq('crew_id', crewId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => {
    const authorId = row.author_id as string;
    const label = memberNames.get(authorId) ?? 'Un membre';
    return {
      id: row.id as string,
      authorId,
      authorHandle: label,
      authorName: label,
      body: row.body as string,
      createdAt: row.created_at as string,
    };
  });
}

export function liveMessageToThread(
  msg: LiveCrewMessage,
  myUserId: string,
): ChatThreadMessage {
  return {
    id: msg.id,
    author: msg.authorName ?? msg.authorHandle,
    text: msg.body,
    me: msg.authorId === myUserId,
    at: new Date(msg.createdAt).getTime(),
  };
}

export async function sendCrewMessage(body: string) {
  return invoke({ action: 'send_message', body });
}

export async function fetchCrewEvents(
  crewId: string,
  userId: string,
  memberNames: ReadonlyMap<string, string>,
): Promise<LiveCrewEvent[]> {
  if (supabase === null) return [];
  const { data: events, error } = await supabase
    .from('crew_events')
    .select('id, title, when_label, place_label, zone_label, objective, created_by')
    .eq('crew_id', crewId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !Array.isArray(events) || events.length === 0) return [];

  const eventIds = events.map((e) => e.id as string);
  const { data: rsvps } = await supabase
    .from('crew_event_rsvps')
    .select('event_id, user_id, choice')
    .in('event_id', eventIds);

  const goingByEvent = new Map<string, number>();
  const myRsvpByEvent = new Map<string, OutingRsvp>();
  for (const r of rsvps ?? []) {
    const eid = r.event_id as string;
    if (r.choice === 'coming') goingByEvent.set(eid, (goingByEvent.get(eid) ?? 0) + 1);
    if (r.user_id === userId) {
      myRsvpByEvent.set(eid, RSVP_FROM_DB[r.choice as string] ?? 'Indispo');
    }
  }

  return events.map((row) => {
    const createdBy = row.created_by as string;
    const hostLabel = memberNames.get(createdBy) ?? 'Un membre';
    const id = row.id as string;
    return {
      id,
      title: row.title as string,
      whenLabel: row.when_label as string,
      placeLabel: row.place_label as string,
      zoneLabel: row.zone_label as string,
      objective: row.objective as CrewOutingObjective,
      hostHandle: hostLabel,
      hostName: hostLabel,
      goingCount: goingByEvent.get(id) ?? 0,
      myRsvp: myRsvpByEvent.get(id) ?? null,
    };
  });
}

export function liveEventToOutingView(
  event: LiveCrewEvent,
  myUserId: string,
  createdBy: string,
): OutingView {
  return {
    id: event.id,
    title: event.title,
    when: event.whenLabel,
    place: event.placeLabel,
    zone: event.zoneLabel,
    objective: event.objective,
    host: event.hostName ?? event.hostHandle,
    mine: createdBy === myUserId,
    myRsvp: event.myRsvp,
    going: event.goingCount + (event.myRsvp === 'Je viens' ? 0 : 0),
  };
}

export async function createCrewEvent(input: {
  title: string;
  when: string;
  place: string;
  zone: string;
  objective: CrewOutingObjective;
}) {
  return invoke({
    action: 'create_event',
    title: input.title,
    whenLabel: input.when,
    place: input.place,
    zone: input.zone,
    objective: input.objective,
  });
}

export async function rsvpCrewEvent(eventId: string, choice: OutingRsvp) {
  return invoke({
    action: 'rsvp_event',
    eventId,
    choice: RSVP_TO_DB[choice],
  });
}

export async function fetchCrewRequests(
  crewId: string,
  memberNames: ReadonlyMap<string, string>,
): Promise<ActionCardDemo[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('crew_requests')
    .select('id, requester_id, request_type, zone_label, infos, status')
    .eq('crew_id', crewId)
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !Array.isArray(data)) return [];

  const titleByType: Record<string, string> = {
    defense: 'Défense demandée',
    finish: 'Terminer une boucle',
    route: 'Route demandée',
    scout: 'Scout demandé',
    outing: 'Sortie crew',
    boost: 'Boost proposé',
  };
  const ctaByType: Record<string, { cta: string; ctaKind: ActionCardDemo['ctaKind'] }> = {
    defense: { cta: 'PRENDRE LA MISSION', ctaKind: 'live' },
    finish: { cta: 'TERMINER', ctaKind: 'live' },
    route: { cta: 'PROPOSER UNE ROUTE', ctaKind: 'planner' },
    scout: { cta: 'VOIR CIBLE', ctaKind: 'toast' },
    outing: { cta: 'REJOINDRE', ctaKind: 'toast' },
    boost: { cta: 'PROPOSER UN BOOST', ctaKind: 'toast' },
  };

  return data.map((row) => {
    const t = row.request_type as string;
    const requesterId = row.requester_id as string;
    const requesterName = memberNames.get(requesterId) ?? 'membre';
    const infos = Array.isArray(row.infos) ? (row.infos as string[]) : [];
    const cta = ctaByType[t] ?? { cta: 'AIDER', ctaKind: 'toast' as const };
    return {
      id: row.id as string,
      kind: t === 'defense' ? 'defense' : t === 'finish' ? 'finish' : 'request',
      filters: t === 'outing' ? ['missions'] : ['demandes'],
      title: titleByType[t] ?? 'Demande crew',
      zone: row.zone_label as string,
      infos: [...infos, `Demandeur ${requesterName}`],
      cta: cta.cta,
      ctaKind: cta.ctaKind,
      intention: t === 'finish' ? 'complete' : t === 'defense' ? 'defense' : undefined,
      donationKind:
        t === 'route' || t === 'scout' || t === 'defense' ? (t as 'route' | 'scout' | 'defense') : undefined,
    };
  });
}

export async function createCrewRequest(choice: RequestChoiceKey, zone?: string, infos?: string[]) {
  return invoke({ action: 'create_request', requestType: choice, zone, infos });
}

export async function fulfillCrewRequest(requestId: string) {
  return invoke({ action: 'fulfill_request', requestId });
}

export async function fetchCrewGifts(
  crewId: string,
  userId: string,
  memberNames: ReadonlyMap<string, string>,
): Promise<LiveCrewGift[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('crew_gifts')
    .select('id, title, rewards_total, expires_at, offered_by_user_id, gift_kind')
    .eq('crew_id', crewId)
    .in('gift_kind', ['boost', 'chest'])
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(10);
  if (error || !Array.isArray(data)) return [];

  const giftIds = data.map((g) => g.id as string);
  const { data: claims } = await supabase
    .from('crew_gift_claims')
    .select('gift_id, user_id')
    .in('gift_id', giftIds);

  const claimCount = new Map<string, number>();
  const claimedByMe = new Set<string>();
  for (const c of claims ?? []) {
    const gid = c.gift_id as string;
    claimCount.set(gid, (claimCount.get(gid) ?? 0) + 1);
    if (c.user_id === userId) claimedByMe.add(gid);
  }

  return data.map((row) => {
    const id = row.id as string;
    const offeredById = row.offered_by_user_id as string | null;
    return {
      id,
      title: row.title as string,
      rewardsTotal: Number(row.rewards_total),
      claimedCount: claimCount.get(id) ?? 0,
      offeredBy: offeredById === null ? null : memberNames.get(offeredById) ?? 'Un membre',
      expiresAt: row.expires_at as string,
      claimedByMe: claimedByMe.has(id),
    };
  });
}

export function liveGiftToCard(gift: LiveCrewGift): GiftCardDemo & { liveId: string } {
  return {
    id: gift.id,
    liveId: gift.id,
    kind: 'chest',
    kicker: 'CADEAU CREW',
    by: gift.offeredBy,
    message: gift.title,
    effect: `${gift.rewardsTotal - gift.claimedCount} récompenses restantes`,
    cta: 'RÉCLAMER',
    ctaKind: 'chest',
    minutesAgo: 0,
    seed: {},
  };
}

export async function offerCrewGift(input: {
  title: string;
  rewardsTotal: number;
  anonymous: boolean;
  giftKind?: 'boost' | 'chest';
}) {
  return invoke({
    action: 'offer_gift',
    title: input.title,
    rewardsTotal: input.rewardsTotal,
    anonymous: input.anonymous,
    giftKind: input.giftKind ?? 'chest',
  });
}

export async function claimCrewGift(giftId: string) {
  return invoke({ action: 'claim_gift', giftId });
}

export async function recordCrewDonation(kind: DonationKind, zone?: string) {
  return invoke({ action: 'record_donation', donationKind: kind, zone });
}

export async function fetchCrewDonations(
  crewId: string,
  memberNames: ReadonlyMap<string, string>,
): Promise<SentDonation[]> {
  if (supabase === null) return [];
  const { data, error } = await supabase
    .from('crew_gifts')
    .select('id, donation_kind, title, offered_by_user_id, created_at')
    .eq('crew_id', crewId)
    .eq('gift_kind', 'donation')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !Array.isArray(data)) return [];

  return data
    .map((row): SentDonation | null => {
      const kind = row.donation_kind as DonationKind | null;
      if (kind === null || !(kind in DONATION_DEFAULTS)) return null;
      const defaults = DONATION_DEFAULTS[kind];
      const offeredById = row.offered_by_user_id as string | null;
      const donor = offeredById === null ? null : memberNames.get(offeredById) ?? 'Un membre';
      const title = row.title as string;
      const zonePart = title.includes('·') ? title.split('·').pop()?.trim() : undefined;
      return {
        id: row.id as string,
        kind,
        kicker: defaults.kicker,
        message: zonePart !== undefined ? `${defaults.message} · ${zonePart}` : defaults.message,
        effect: defaults.effect,
        createdAt: new Date(row.created_at as string).getTime(),
        by: donor,
      };
    })
    .filter((d): d is SentDonation => d !== null);
}

export async function fetchCrewChestContributions(
  crewId: string,
  weekStart: string,
): Promise<Map<string, number>> {
  if (supabase === null) return new Map();
  const { data, error } = await supabase
    .from('crew_chest_contributions')
    .select('user_id, points')
    .eq('crew_id', crewId)
    .eq('week_start', weekStart);
  if (error || !Array.isArray(data)) return new Map();
  return new Map(data.map((r) => [r.user_id as string, Number(r.points)]));
}
