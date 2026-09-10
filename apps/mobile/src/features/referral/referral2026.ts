/**
 * GRYD — LE PARRAINAGE CÔTÉ CLIENT : TOUT CE QUI EST PUR.
 *
 * Ce module ne décide RIEN. Le code, le lien, les états et les récompenses sont
 * tranchés par le serveur (`my_referral_2026`, `redeem_referral_code_2026`,
 * migrations 0184-0186) ; ici on parse, on formate, et on refuse ce qui n'a pas
 * la bonne forme. Zéro import React Native : le gate Deno le charge tel quel.
 *
 * ─── LE LIEN EST CONSTRUIT ICI, ET C'EST VOULU ──────────────────────────────
 * `my_referral_2026()` rend le CODE et rien d'autre. Le schéma `gryd://`
 * appartient à `app.json` (`expo.scheme`), pas à la base : un serveur qui
 * écrirait l'adresse deviendrait une seconde source de vérité pour une valeur
 * qu'il ne peut pas vérifier. C'est la même discipline qu'`INVITE_HOSTS` côté
 * crew, et elle a déjà évité une adresse morte une fois.
 *
 * ─── LE LIEN WEB N'EST PAS ÉCRIT, ET LA RAISON N'A PAS CHANGÉ ───────────────
 * `apps/web` n'a AUCUNE route `/r/`, et l'arbitrage de domaine (gryd.app vs
 * gryd.run, point ouvert O10) n'est pas rendu : `ios.associatedDomains` et les
 * `intentFilters` Android sont volontairement absents d'`app.json`. Un message
 * qui SORT de l'app vers un tiers ne peut pas porter une adresse morte — le
 * tiers n'a pas notre note en bas d'écran. On envoie donc le SCHÉMA, qui
 * fonctionne dès aujourd'hui sur un appareil où GRYD est installé, et le CODE,
 * qui se saisit à la main partout ailleurs. `REFERRAL_WEB_HOSTS` est déjà là
 * pour le jour où le domaine répondra : `buildReferralWebLink` n'attend que ça,
 * et le parsing accepte DÉJÀ ces hôtes en entrée (recevoir un lien ne coûte
 * rien ; en promettre un, si).
 */
import { REFERRAL_CODE_ALPHABET, REFERRAL_CODE_LENGTH } from '@klaim/shared';

/** Les deux hôtes candidats, tant que O10 n'est pas tranché (cf. INVITE_HOSTS). */
export const REFERRAL_WEB_HOSTS = ['gryd.run', 'gryd.app'] as const;

/** Le segment du lien profond. Une lettre, comme `/c/` pour les crews. */
export const REFERRAL_LINK_SEGMENT = 'r';

/**
 * Normalise un code recopié à la main : majuscules, alphanumériques seulement,
 * longueur EXACTE. Rend `null` dès que ça ne ressemble pas à un code.
 *
 * ELLE NE DEVINE RIEN, exactement comme `normalize_referral_code_2026` côté
 * serveur : un `O` ou un `1` recopié de travers n'est PAS transformé en `0` ou
 * en `I`. Les deux normalisations doivent rendre la même chose, sinon un code
 * accepté par l'écran serait refusé par la base — un « code invalide » sur un
 * code parfaitement bon.
 */
export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== REFERRAL_CODE_LENGTH) return null;
  for (const letter of clean) if (!REFERRAL_CODE_ALPHABET.includes(letter)) return null;
  return clean;
}

/** La forme d'un code, sans la normalisation (pour un champ de saisie vivant). */
export function looksLikeReferralCode(raw: string): boolean {
  return normalizeReferralCode(raw) !== null;
}

const DEEP_LINK_RE = new RegExp(`^gryd:/*${REFERRAL_LINK_SEGMENT}/([A-Za-z0-9]+)/*(?:[?#].*)?$`, 'i');
const WEB_LINK_RE = new RegExp(
  `^https?://(?:www\\.)?(?:${REFERRAL_WEB_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|')})`
  + `/${REFERRAL_LINK_SEGMENT}/([A-Za-z0-9]+)/*(?:[?#].*)?$`,
  'i',
);

/**
 * URL entrante → code valide, ou `null`. Un deep link est une entrée hostile :
 * tout ce qui ne colle pas EXACTEMENT est ignoré, sans navigation.
 */
export function parseReferralUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || url.length === 0) return null;
  const trimmed = url.trim();
  const match = DEEP_LINK_RE.exec(trimmed) ?? WEB_LINK_RE.exec(trimmed);
  return match ? normalizeReferralCode(match[1]) : null;
}

/** `gryd://r/CODE` — le seul lien que l'app promette aujourd'hui. */
export function buildReferralDeepLink(code: string): string | null {
  const clean = normalizeReferralCode(code);
  return clean === null ? null : `gryd://${REFERRAL_LINK_SEGMENT}/${clean}`;
}

/**
 * `https://<hôte>/r/CODE` — PRÊT, mais jamais envoyé tant qu'aucune page ne
 * répond. L'appelant doit passer l'hôte explicitement : personne ne peut le
 * choisir par défaut avant que O10 soit tranché.
 */
export function buildReferralWebLink(code: string, host: (typeof REFERRAL_WEB_HOSTS)[number]): string | null {
  const clean = normalizeReferralCode(code);
  return clean === null ? null : `https://${host}/${REFERRAL_LINK_SEGMENT}/${clean}`;
}

/** Le code, groupé pour l'œil : `ABC 123`. Jamais stocké sous cette forme. */
export function formatReferralCodeForDisplay(code: string): string {
  const clean = normalizeReferralCode(code);
  if (clean === null) return '';
  const half = Math.ceil(clean.length / 2);
  return `${clean.slice(0, half)} ${clean.slice(half)}`;
}

// ─── LE MODÈLE RENDU PAR LE SERVEUR ─────────────────────────────────────────

/** Les six états d'un lien, tels que `referral_link_state_2026` les nomme. */
export const REFERRAL_LINK_STATES = [
  'awaiting_referee_run', 'awaiting_referrer_run', 'rewarded', 'capped', 'expired', 'revoked',
] as const;
export type ReferralLinkState2026 = (typeof REFERRAL_LINK_STATES)[number];

export const REFERRAL_REDEEM_REFUSALS = [
  'bad_code', 'unknown_code', 'self_referral', 'already_referred', 'reciprocity', 'account_too_old',
] as const;
export type ReferralRefusal2026 = (typeof REFERRAL_REDEEM_REFUSALS)[number];

export type ReferralNextStep2026 = 'share' | 'run' | 'wait' | 'done';
export type ReferralCreditState2026 = 'banked' | 'running' | 'ended';

export interface ReferralPeer2026 {
  readonly pseudo: string;
  readonly state: ReferralLinkState2026;
  readonly redeemedAt: string | null;
  readonly completedAt: string | null;
}
export interface ReferralReward2026 {
  readonly kind: 'collection' | 'xp_boost' | 'gryd_plus';
  readonly rewardId: string;
  readonly side: 'referrer' | 'referee';
  readonly grantedAt: string | null;
  readonly boostEndsAt: string | null;
  readonly boostMultiplier: number | null;
}
export interface MyReferral2026 {
  readonly code: string;
  readonly accountAgeDays: number;
  readonly canRedeem: boolean;
  readonly redeemBlockedReason: 'already_referred' | 'account_too_old' | null;
  readonly myRunDone: boolean;
  readonly sponsor: ReferralPeer2026 | null;
  readonly referees: readonly ReferralPeer2026[];
  readonly rewards: readonly ReferralReward2026[];
  readonly boostActive: boolean;
  readonly bonusXp: number;
  readonly grydPlusCredit: { readonly days: number; readonly state: ReferralCreditState2026; readonly endsAt: string | null } | null;
  readonly remainingThisSeason: number;
  readonly nextStep: ReferralNextStep2026;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const asString = (value: unknown): string | null => typeof value === 'string' && value.length > 0 ? value : null;
const asNumber = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;

function parsePeer(value: unknown): ReferralPeer2026 | null {
  const row = asRecord(value);
  if (row === null) return null;
  const pseudo = asString(row.pseudo);
  const state = asString(row.state);
  if (pseudo === null || state === null) return null;
  if (!(REFERRAL_LINK_STATES as readonly string[]).includes(state)) return null;
  return {
    pseudo, state: state as ReferralLinkState2026,
    redeemedAt: asString(row.redeemedAt), completedAt: asString(row.completedAt),
  };
}

function parseReward(value: unknown): ReferralReward2026 | null {
  const row = asRecord(value);
  if (row === null) return null;
  const kind = asString(row.kind);
  const rewardId = asString(row.rewardId);
  const side = asString(row.side);
  if (kind === null || rewardId === null) return null;
  if (kind !== 'collection' && kind !== 'xp_boost' && kind !== 'gryd_plus') return null;
  if (side !== 'referrer' && side !== 'referee') return null;
  const multiplier = row.boostMultiplier;
  return {
    kind, rewardId, side,
    grantedAt: asString(row.grantedAt),
    boostEndsAt: asString(row.boostEndsAt),
    // Postgres rend un `numeric` en CHAÎNE dans le JSON de PostgREST : le lire
    // comme un nombre sans le convertir donnerait `null` et effacerait le ×1,5.
    boostMultiplier: typeof multiplier === 'string' ? Number(multiplier) : asNumber(multiplier),
  };
}

/**
 * Lecture DÉFENSIVE du JSON serveur. Une réponse illisible rend `null` — donc
 * un état « échec » à l'écran, jamais un écran vide qui aurait l'air d'un compte
 * sans parrainage (L8/L14/L19 : quatre états distincts, aucun repli inventé).
 */
export function parseMyReferral2026(value: unknown): MyReferral2026 | null {
  const row = asRecord(value);
  if (row === null) return null;
  const code = normalizeReferralCode(asString(row.code));
  if (code === null) return null;
  const blocked = asString(row.redeemBlockedReason);
  const nextStep = asString(row.nextStep);
  if (nextStep !== 'share' && nextStep !== 'run' && nextStep !== 'wait' && nextStep !== 'done') return null;
  const credit = asRecord(row.grydPlusCredit);
  const creditState = credit === null ? null : asString(credit.state);
  return {
    code,
    accountAgeDays: asNumber(row.accountAgeDays) ?? 0,
    canRedeem: row.canRedeem === true,
    redeemBlockedReason: blocked === 'already_referred' || blocked === 'account_too_old' ? blocked : null,
    myRunDone: row.myRunDone === true,
    sponsor: parsePeer(row.sponsor),
    referees: Array.isArray(row.referees)
      ? row.referees.map(parsePeer).filter((peer): peer is ReferralPeer2026 => peer !== null) : [],
    rewards: Array.isArray(row.rewards)
      ? row.rewards.map(parseReward).filter((reward): reward is ReferralReward2026 => reward !== null) : [],
    boostActive: row.boostActive === true,
    bonusXp: asNumber(row.bonusXp) ?? 0,
    grydPlusCredit: credit === null || creditState === null
      || (creditState !== 'banked' && creditState !== 'running' && creditState !== 'ended') ? null
      : { days: asNumber(credit.days) ?? 0, state: creditState, endsAt: asString(credit.endsAt) },
    remainingThisSeason: asNumber(row.remainingThisSeason) ?? 0,
    nextStep,
  };
}

/** Le refus typé d'une saisie, ou `null` quand le serveur a accepté. */
export function parseRedeemResult2026(value: unknown): { ok: true } | { ok: false; reason: ReferralRefusal2026 | 'network' } {
  const row = asRecord(value);
  if (row === null) return { ok: false, reason: 'network' };
  if (row.ok === true) return { ok: true };
  const reason = asString(row.reason);
  return {
    ok: false,
    reason: reason !== null && (REFERRAL_REDEEM_REFUSALS as readonly string[]).includes(reason)
      ? reason as ReferralRefusal2026 : 'network',
  };
}
