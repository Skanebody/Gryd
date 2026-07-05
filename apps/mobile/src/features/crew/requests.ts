/**
 * GRYD — REQUÊTES & DONS crew (AMENDEMENT-18 A.3). Mécanique fondateur :
 * « Demander → quelqu'un aide → le crew progresse → tout le monde le voit. »
 *
 * Ce store PERSISTE (AsyncStorage, calque chatStore.ts / reactions.ts : lecture
 * lazy, écriture fire-and-forget best-effort, useSyncExternalStore natif) trois
 * choses créées à l'usage, par-dessus les données démo statiques de feed.ts :
 *   1. REQUÊTES émises via le bouton « Demander » (Défense/Terminer/Route/Scout/
 *      Sortie) → carte dans À FAIRE.
 *   2. DONS accomplis (route donnée, scout report, défense prise) → carte dans
 *      DONS + entrée de Log + Merci/Respect (reactions.ts).
 *   3. CADEAUX premium offerts (Crew Boost 24 h / Coffre cosmétique) → carte
 *      CADEAU CREW réclamable.
 *
 * ANTI PAY-TO-WIN STRICT : aucune requête ni aucun don n'attribue de territoire,
 * de point ni de rang. Un cadeau premium ne donne QUE des cosmétiques, avec des
 * LIMITES DURES (CREW_GIFT_CLAIMS_PER_MEMBER = 1/membre, expiration
 * CREW_GIFT_EXPIRY_H = 24 h). ZÉRO montant, ZÉRO classement des payeurs. Don
 * anonyme possible (GIFT_ANONYMOUS_ALLOWED). Anti-shame : jamais « demander de
 * payer » — « Proposer un boost » est présenté comme optionnel.
 *
 * Tout est LOCAL (démo). TODO(O1) brancher crew_requests / crew_gifts (0014/
 * gifting) via Edge Function — écriture client interdite côté DB (RLS).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CREW_GIFT_CLAIMS_PER_MEMBER,
  CREW_GIFT_EXPIRY_H,
} from '@klaim/shared';
import { CHAT_ME } from './chatStore';
import type { ActionCardDemo, GiftCardDemo } from './feed';

/** Clés de persistance (versionnées, isolées comme chatStore / reactions). */
const REQUESTS_STORAGE_KEY = 'gryd.crew.requests.v1';
const GIFTS_STORAGE_KEY = 'gryd.crew.gifts.v1';

// ─── Types d'une requête émise via « Demander » (A.3) ─────────────────────────

/**
 * Les 6 choix de la feuille « Demander » (A.3). `boost` est OPTIONNEL et présenté
 * comme « Proposer un boost au crew » — jamais « demander aux membres de payer ».
 */
export type RequestChoiceKey =
  | 'defense'
  | 'finish'
  | 'route'
  | 'scout'
  | 'outing'
  | 'boost';

export interface RequestChoiceDef {
  key: RequestChoiceKey;
  /** Libellé court non tronqué du choix (« Défense », « Terminer une boucle »). */
  label: string;
  /** Une ligne d'aide (ce que ça déclenche). */
  hint: string;
}

/** Ordre stable de la feuille de choix (Demander). */
export const REQUEST_CHOICES: readonly RequestChoiceDef[] = [
  { key: 'defense', label: 'Défense', hint: 'Un secteur à tenir' },
  { key: 'finish', label: 'Terminer une boucle', hint: 'Il manque quelques mètres' },
  { key: 'route', label: 'Route', hint: 'Une boucle à proposer' },
  { key: 'scout', label: 'Scout', hint: 'Repérer une zone rivale' },
  { key: 'outing', label: 'Sortie', hint: 'Courir ensemble' },
  { key: 'boost', label: 'Proposer un boost', hint: 'Optionnel · accélère le coffre' },
];

export const REQUEST_CHOICE_BY_KEY: Record<RequestChoiceKey, RequestChoiceDef> =
  Object.fromEntries(REQUEST_CHOICES.map((c) => [c.key, c])) as Record<
    RequestChoiceKey,
    RequestChoiceDef
  >;

/**
 * Une requête que J'AI émise (démo). Rendue en carte d'action « À FAIRE » : on la
 * mappe sur `ActionCardDemo` (même composant que les cartes démo). `boost` route
 * vers l'Arsenal (proposer un boost), les autres vers la course / le planner.
 */
export interface SentRequest {
  id: string;
  choice: RequestChoiceKey;
  /** Zone/secteur concerné (« République », « Canal ») — jamais de coordonnée. */
  zone: string;
  /** 1-2 infos compactes (« 620 m », « 4-5 km », « 34 zones »). */
  infos: readonly string[];
  createdAt: number;
}

// ─── Types d'un don accompli (route/scout/défense) ────────────────────────────

/** Nature d'un don gratuit accompli via le fil (A.3). */
export type DonationKind = 'route' | 'scout' | 'defense';

/**
 * Un don GRATUIT que J'AI fait (démo) → carte dans DONS + Merci possible. `route`
 * = j'ai proposé une route à une requête route ; `scout` = j'ai partagé un scout
 * report ; `defense` = j'ai pris une défense. ZÉRO montant, ZÉRO point.
 */
export interface SentDonation {
  id: string;
  kind: DonationKind;
  /** Kicker en capitales (« ROUTE DONNÉE »). */
  kicker: string;
  /** Phrase du don (« a proposé une route · Canal »). */
  message: string;
  /** Effet en clair (« 3,4 km · 12 zones · prête à courir »). */
  effect: string;
  createdAt: number;
}

// ─── Type d'un cadeau premium offert (réclamable) ─────────────────────────────

/**
 * Un CADEAU CREW premium que J'AI offert (Coffre cosmétique / Crew Boost 24 h).
 * `rewardsTotal` récompenses au départ, décrémentées par `claimedBy`. LIMITES
 * DURES (A.3) : 1 réclamation/membre (CREW_GIFT_CLAIMS_PER_MEMBER), expiration
 * CREW_GIFT_EXPIRY_H (24 h). `by` = null si offrande anonyme. ZÉRO montant.
 */
export interface OfferedGift {
  id: string;
  /** Nom lisible du cadeau (« Coffre cosmétique », « Crew Boost 24 h »). */
  title: string;
  /** Nombre de récompenses au départ (coffre) — décroît à chaque réclamation. */
  rewardsTotal: number;
  /** Pseudos ayant déjà réclamé (1 max/membre). */
  claimedBy: readonly string[];
  /** Auteur, ou null si offrande anonyme (don anonyme possible A.3). */
  by: string | null;
  offeredAt: number;
  /** Fin de fenêtre de réclamation (ms) — offeredAt + 24 h. */
  expiresAt: number;
}

/** Récompenses encore réclamables d'un cadeau (borne 0). PURE. */
export function giftRewardsLeft(gift: OfferedGift): number {
  return Math.max(0, gift.rewardsTotal - gift.claimedBy.length);
}

/** Cadeau expiré ? (24 h dépassées). PURE. */
export function giftExpired(gift: OfferedGift, now: number = Date.now()): boolean {
  return now >= gift.expiresAt;
}

/** Ce membre (démo : CHAT_ME) a-t-il déjà réclamé ? (1 max/membre). PURE. */
export function giftClaimedByMe(gift: OfferedGift): boolean {
  return gift.claimedBy.includes(CHAT_ME);
}

/**
 * Un cadeau est-il encore réclamable PAR MOI ? (non expiré + reste des
 * récompenses + je n'ai pas déjà réclamé). PURE — pilote l'état du CTA.
 */
export function giftClaimable(gift: OfferedGift, now: number = Date.now()): boolean {
  return !giftExpired(gift, now) && giftRewardsLeft(gift) > 0 && !giftClaimedByMe(gift);
}

// ─── Store minimal (notifier + snapshot mémoïsé, useSyncExternalStore) ────────

let requests: SentRequest[] = [];
let donations: SentDonation[] = [];
let gifts: OfferedGift[] = [];
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Version bump : getSnapshot pur (pas de nouvelle ref à chaque rendu). */
let version = 0;

function emit() {
  version += 1;
  for (const l of listeners) l();
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = Promise.all([
      AsyncStorage.getItem(REQUESTS_STORAGE_KEY),
      AsyncStorage.getItem(GIFTS_STORAGE_KEY),
    ])
      .then(([rawReq, rawGift]) => {
        if (rawReq) {
          try {
            const parsed = JSON.parse(rawReq) as { requests?: SentRequest[]; donations?: SentDonation[] };
            if (Array.isArray(parsed?.requests)) requests = parsed.requests;
            if (Array.isArray(parsed?.donations)) donations = parsed.donations;
          } catch {
            // corpus corrompu → on repart propre (best effort).
          }
        }
        if (rawGift) {
          try {
            const parsed = JSON.parse(rawGift) as OfferedGift[];
            if (Array.isArray(parsed)) gifts = parsed.filter((g) => g && typeof g.id === 'string');
          } catch {
            // idem.
          }
        }
        loaded = true;
        emit();
      })
      .catch(() => {
        loaded = true;
      });
  }
  return loadPromise;
}

function persistRequests() {
  void AsyncStorage.setItem(
    REQUESTS_STORAGE_KEY,
    JSON.stringify({ requests, donations }),
  ).catch(() => {});
}

function persistGifts() {
  void AsyncStorage.setItem(GIFTS_STORAGE_KEY, JSON.stringify(gifts)).catch(() => {});
}

// ─── Écritures (créer une requête / un don / un cadeau, réclamer) ─────────────

/** Détails par choix pour une requête émise (démo) — zone + infos par défaut. */
const REQUEST_DEFAULTS: Record<RequestChoiceKey, { zone: string; infos: readonly string[] }> = {
  defense: { zone: 'Canal', infos: ['34 zones', '48 h'] },
  finish: { zone: 'République', infos: ['620 m', 'expire 23 h'] },
  route: { zone: 'Canal', infos: ['4-5 km', 'défense'] },
  scout: { zone: 'Pantin', infos: ['zone rivale', 'à repérer'] },
  outing: { zone: 'République', infos: ['19:00', 'crew'] },
  boost: { zone: 'Coffre crew', infos: ['optionnel', '+25 %'] },
};

/**
 * Émet une requête (bouton « Demander »). Retourne la requête créée. Le choix
 * `boost` est une PROPOSITION optionnelle, jamais une demande de paiement.
 */
export function createRequest(choice: RequestChoiceKey): SentRequest {
  const d = REQUEST_DEFAULTS[choice];
  const req: SentRequest = {
    id: `req_${Date.now()}`,
    choice,
    zone: d.zone,
    infos: d.infos,
    createdAt: Date.now(),
  };
  requests = [req, ...requests];
  persistRequests();
  emit();
  return req;
}

/** Détails par nature de don (démo) — kicker + message + effet. */
const DONATION_DEFAULTS: Record<
  DonationKind,
  { kicker: string; message: string; effect: string }
> = {
  route: {
    kicker: 'ROUTE DONNÉE',
    message: 'a proposé une route · Canal',
    effect: '3,4 km · 12 zones · prête à courir',
  },
  scout: {
    kicker: 'SCOUT REPORT',
    message: 'a partagé un scout · Pantin',
    effect: 'VOLT.19 inactif 3 j · zone rivale faible',
  },
  defense: {
    kicker: 'DÉFENSE PRISE',
    message: 'prend la défense · Canal',
    effect: '34 zones tenues 48 h de plus',
  },
};

/** Enregistre un don accompli (route/scout/défense). Retourne le don créé. */
export function createDonation(kind: DonationKind): SentDonation {
  const d = DONATION_DEFAULTS[kind];
  const don: SentDonation = {
    id: `don_${Date.now()}`,
    kind,
    kicker: d.kicker,
    message: d.message,
    effect: d.effect,
    createdAt: Date.now(),
  };
  donations = [don, ...donations];
  persistRequests();
  emit();
  return don;
}

/**
 * Offre un cadeau premium au crew (Crew Boost 24 h / Coffre cosmétique). Applique
 * les LIMITES DURES : expiration à CREW_GIFT_EXPIRY_H (24 h). `anonymous` → pas
 * de nom au fil. Retourne le cadeau créé.
 */
export function offerGift(opts: {
  title: string;
  rewardsTotal: number;
  anonymous: boolean;
  by: string;
}): OfferedGift {
  const now = Date.now();
  const gift: OfferedGift = {
    id: `gift_${now}`,
    title: opts.title,
    rewardsTotal: opts.rewardsTotal,
    claimedBy: [],
    by: opts.anonymous ? null : opts.by,
    offeredAt: now,
    expiresAt: now + CREW_GIFT_EXPIRY_H * 3_600_000,
  };
  gifts = [gift, ...gifts];
  persistGifts();
  emit();
  return gift;
}

/**
 * Réclame un cadeau (démo : au nom de CHAT_ME). Applique les gardes : non
 * expiré, récompenses restantes, 1 réclamation/membre. Retourne true si la
 * réclamation a bien été prise en compte (décrément), false sinon.
 */
export function claimGift(giftId: string, now: number = Date.now()): boolean {
  const idx = gifts.findIndex((g) => g.id === giftId);
  if (idx < 0) return false;
  const gift = gifts[idx];
  if (!gift || !giftClaimable(gift, now)) return false;
  // CREW_GIFT_CLAIMS_PER_MEMBER = 1 : un pseudo n'apparaît qu'une fois.
  if (gift.claimedBy.length >= gift.rewardsTotal) return false;
  const next: OfferedGift = { ...gift, claimedBy: [...gift.claimedBy, CHAT_ME] };
  gifts = [...gifts.slice(0, idx), next, ...gifts.slice(idx + 1)];
  persistGifts();
  emit();
  return true;
}

/** RAZ (utilitaire démo / tests). */
export function resetRequests(): void {
  requests = [];
  donations = [];
  gifts = [];
  persistRequests();
  persistGifts();
  emit();
}

// ─── Adaptateurs vers les cartes de feed.ts (rendu unifié avec la démo) ───────

/** Mappe une requête émise sur une carte d'action « À FAIRE » (ActionCardDemo). */
export function requestToActionCard(req: SentRequest): ActionCardDemo {
  const def = REQUEST_CHOICE_BY_KEY[req.choice];
  const titleByChoice: Record<RequestChoiceKey, string> = {
    defense: 'Défense demandée',
    finish: 'Terminer une boucle',
    route: 'Route demandée',
    scout: 'Scout demandé',
    outing: 'Sortie crew',
    boost: 'Boost proposé',
  };
  const ctaByChoice: Record<RequestChoiceKey, { cta: string; ctaKind: ActionCardDemo['ctaKind'] }> = {
    defense: { cta: 'PRENDRE LA MISSION', ctaKind: 'live' },
    finish: { cta: 'TERMINER', ctaKind: 'live' },
    route: { cta: 'PROPOSER UNE ROUTE', ctaKind: 'planner' },
    scout: { cta: 'VOIR CIBLE', ctaKind: 'toast' },
    outing: { cta: 'REJOINDRE', ctaKind: 'toast' },
    boost: { cta: 'PROPOSER UN BOOST', ctaKind: 'toast' },
  };
  const kindByChoice: Record<RequestChoiceKey, ActionCardDemo['kind']> = {
    defense: 'defense',
    finish: 'finish',
    route: 'request',
    scout: 'request',
    outing: 'outing',
    boost: 'request',
  };
  const cta = ctaByChoice[req.choice];
  // Aider sur route/scout/défense = un DON GRATUIT (A.3) : on marque la carte
  // pour que le CTA enregistre un SentDonation. `finish`/`outing`/`boost` n'en
  // produisent pas (frontière / sortie / boost proposé). Cast sûr : ces trois
  // clés SONT des DonationKind valides.
  const donationKind: DonationKind | undefined =
    req.choice === 'route' || req.choice === 'scout' || req.choice === 'defense'
      ? (req.choice as DonationKind)
      : undefined;
  return {
    id: req.id,
    kind: kindByChoice[req.choice],
    filters: req.choice === 'outing' ? ['missions'] : ['demandes'],
    title: titleByChoice[req.choice],
    zone: req.zone,
    // Demandeur = MOI (démo). Non tronqué (pseudo court).
    infos: [...req.infos, `Demandeur ${CHAT_ME}`],
    cta: cta.cta,
    ctaKind: cta.ctaKind,
    intention: req.choice === 'finish' ? 'complete' : req.choice === 'defense' ? 'defense' : undefined,
    boundary: req.choice === 'finish' ? 'republique' : undefined,
    donationKind,
  };
}

/** Mappe un don accompli sur une carte de DON (GiftCardDemo, réactions Merci). */
export function donationToGiftCard(don: SentDonation): GiftCardDemo {
  const ctaByKind: Record<DonationKind, { cta: string; ctaKind: GiftCardDemo['ctaKind'] }> = {
    route: { cta: 'Utiliser', ctaKind: 'map' },
    scout: { cta: 'Voir cible', ctaKind: 'map' },
    defense: { cta: 'Voir la carte', ctaKind: 'map' },
  };
  const cta = ctaByKind[don.kind];
  return {
    id: don.id,
    kind: don.kind,
    kicker: don.kicker,
    by: CHAT_ME,
    message: don.message,
    effect: don.effect,
    cta: cta.cta,
    ctaKind: cta.ctaKind,
    minutesAgo: Math.max(0, Math.round((Date.now() - don.createdAt) / 60_000)),
    seed: {},
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureLoaded();
  return () => listeners.delete(listener);
}

function getSnapshot(): number {
  return version;
}

export interface CrewRequestsStore {
  requests: readonly SentRequest[];
  donations: readonly SentDonation[];
  gifts: readonly OfferedGift[];
  loaded: boolean;
}

/**
 * Hook des requêtes/dons/cadeaux. Abonne l'écran au store (re-render à chaque
 * création/réclamation) et expose les listes courantes.
 */
export function useCrewRequests(): CrewRequestsStore {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { requests, donations, gifts, loaded };
}
