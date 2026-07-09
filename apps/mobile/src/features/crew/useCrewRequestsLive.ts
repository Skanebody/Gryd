/**
 * GRYD — hook requêtes/dons crew live + fallback démo.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from '../../lib/session';
import { useMyCrew } from './useMyCrew';
import type { ActionCardDemo, GiftCardDemo } from './feed';
import {
  type CrewRequestsStore,
  type DonationKind,
  type OfferedGift,
  type RequestChoiceKey,
  type SentDonation,
  type SentRequest,
  useCrewRequests,
  createRequest as createRequestLocal,
  createDonation as createDonationLocal,
  offerGift as offerGiftLocal,
  claimGift as claimGiftLocal,
  requestToActionCard,
  donationToGiftCard,
  giftClaimable,
} from './requests';
import {
  claimCrewGift,
  fetchCrewDonations,
  fetchCrewGifts,
  fetchCrewRequests,
  fulfillCrewRequest,
  liveGiftToCard,
  offerCrewGift,
  createCrewRequest,
  recordCrewDonation,
  type LiveCrewGift,
} from './crewSocialApi';
import { useCrewSocialRealtime } from '../../lib/realtimeRefresh';

function liveGiftToOffered(g: LiveCrewGift): OfferedGift {
  return {
    id: g.id,
    title: g.title,
    rewardsTotal: g.rewardsTotal,
    claimedBy: g.claimedByMe ? ['me'] : [],
    by: g.offeredBy,
    offeredAt: Date.now(),
    expiresAt: new Date(g.expiresAt).getTime(),
  };
}

import type { CrewMemberProfile } from './crewApi';

function memberNameMap(members: readonly CrewMemberProfile[]): Map<string, string> {
  return new Map(members.map((m) => [m.userId, m.displayName ?? m.handle] as const));
}

export function useCrewRequestsLive(members: readonly CrewMemberProfile[]): CrewRequestsStore & {
  liveActionCards: ActionCardDemo[];
  liveGiftCards: GiftCardDemo[];
  refresh: () => void;
  useLive: boolean;
} {
  const demo = useCrewRequests();
  const { session, configured } = useSession();
  const { membership } = useMyCrew();
  const useLive = configured && session !== null && membership !== null;
  const [liveRequests, setLiveRequests] = useState<ActionCardDemo[]>([]);
  const [liveGifts, setLiveGifts] = useState<LiveCrewGift[]>([]);
  const [liveDonations, setLiveDonations] = useState<SentDonation[]>([]);
  const names = useMemo(() => memberNameMap(members), [members]);

  const refresh = useCallback(() => {
    if (!useLive || membership === null || session === null) {
      setLiveRequests([]);
      setLiveGifts([]);
      setLiveDonations([]);
      return;
    }
    void Promise.all([
      fetchCrewRequests(membership.crewId, names),
      fetchCrewGifts(membership.crewId, session.user.id, names),
      fetchCrewDonations(membership.crewId, names),
    ]).then(([reqs, gifts, donations]) => {
      setLiveRequests(reqs);
      setLiveGifts(gifts);
      setLiveDonations(donations);
    });
  }, [membership, names, session, useLive]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useCrewSocialRealtime(
    membership?.crewId ?? null,
    useLive,
    refresh,
  );

  const liveGiftCards = useMemo(
    () => liveGifts.map(liveGiftToCard),
    [liveGifts],
  );

  const gifts: readonly OfferedGift[] = useMemo(() => {
    if (!useLive || liveGifts.length === 0) return demo.gifts;
    const live = liveGifts.map(liveGiftToOffered);
    return [...live, ...demo.gifts];
  }, [demo.gifts, liveGifts, useLive]);

  const donations: readonly SentDonation[] = useMemo(() => {
    if (!useLive || liveDonations.length === 0) return demo.donations;
    return liveDonations;
  }, [demo.donations, liveDonations, useLive]);

  return {
    requests: demo.requests,
    donations,
    gifts,
    loaded: demo.loaded,
    liveActionCards: liveRequests,
    liveGiftCards,
    refresh,
    useLive,
  };
}

export async function createRequestMerged(
  useLive: boolean,
  choice: RequestChoiceKey,
  refresh?: () => void,
) {
  if (useLive) {
    const res = await createCrewRequest(choice);
    if (res.ok) refresh?.();
    return res.ok;
  }
  createRequestLocal(choice);
  return true;
}

export async function fulfillRequestMerged(
  useLive: boolean,
  requestId: string,
  refresh?: () => void,
) {
  if (useLive && !requestId.startsWith('req_')) {
    const res = await fulfillCrewRequest(requestId);
    if (res.ok) refresh?.();
    return res.ok;
  }
  return false;
}

export async function createDonationMerged(
  useLive: boolean,
  kind: DonationKind,
  zone?: string,
  refresh?: () => void,
) {
  if (!useLive) {
    createDonationLocal(kind);
    return true;
  }
  const res = await recordCrewDonation(kind, zone);
  if (res.ok) refresh?.();
  return res.ok;
}

export async function offerGiftMerged(
  useLive: boolean,
  opts: Parameters<typeof offerGiftLocal>[0],
  refresh?: () => void,
) {
  if (useLive) {
    const res = await offerCrewGift({
      title: opts.title,
      rewardsTotal: opts.rewardsTotal,
      anonymous: opts.anonymous,
      giftKind: opts.title.toLowerCase().includes('boost') ? 'boost' : 'chest',
    });
    if (res.ok) refresh?.();
    return res.ok;
  }
  offerGiftLocal(opts);
  return true;
}

export async function claimGiftMerged(
  useLive: boolean,
  giftId: string,
  gift: OfferedGift,
  refresh?: () => void,
): Promise<boolean> {
  if (useLive && !giftId.startsWith('gift_')) {
    const res = await claimCrewGift(giftId);
    if (res.ok) refresh?.();
    return res.ok;
  }
  const ok = claimGiftLocal(giftId);
  if (ok) refresh?.();
  return ok && giftClaimable(gift);
}

export { requestToActionCard, donationToGiftCard };
