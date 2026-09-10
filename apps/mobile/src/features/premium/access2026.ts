/** Server receipt, never inferred from users.is_club or a local purchase intention. */
export interface ServerGrydPlusAccess2026 {
  active: boolean;
  expiresAt: string | null;
  lifetime: boolean;
  productId: string | null;
  verifiedAt: string | null;
}
export function readServerGrydPlusAccess2026(value: unknown, nowMs: number): ServerGrydPlusAccess2026 | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.active !== 'boolean' || typeof v.lifetime !== 'boolean') return null;
  const expiry = typeof v.expiresAt === 'string' ? Date.parse(v.expiresAt) : null;
  const active = v.active && (v.lifetime === true && v.expiresAt === null || expiry !== null && Number.isFinite(expiry) && expiry > nowMs);
  return { active, expiresAt: typeof v.expiresAt === 'string' ? v.expiresAt : null, lifetime: v.lifetime, productId: typeof v.productId === 'string' ? v.productId : null, verifiedAt: typeof v.verifiedAt === 'string' ? v.verifiedAt : null };
}

/**
 * G28 : « "Premium activé" n'apparaît qu'après confirmation des droits. »
 *
 * ── LE DÉFAUT QUE CETTE FONCTION SUPPRIME ──────────────────────────────────
 * `useGrydPlusAccess` écrivait `pro ? pro.kind === 'active' : server?.active`.
 * Le CACHE du SDK primait donc sur le REÇU SERVEUR : un CustomerInfo local —
 * qui survit hors ligne, et qu'un webhook non appliqué peut contredire —
 * suffisait à afficher « Abonnement actif » et à ouvrir les outils, alors que
 * le serveur (seule autorité, cf. `sync_gryd_plus_access_2026`) n'avait rien
 * confirmé. L'ordre est renversé : le serveur décide, le Store informe.
 *
 *  · `active`      — le reçu SERVEUR est actif ;
 *  · `preSaleOpen` — personne ne PEUT payer, donc l'outil est ouvert à tout
 *                    compte connecté (décision fondateur du 11/09/2026) ;
 *  · `pending`     — le Store a enregistré l'achat, le serveur pas encore : un
 *                    fait vrai et transitoire, ni un droit ni une panne ;
 *  · `inactive`    — le serveur a répondu, il n'y a pas de droit ;
 *  · `unavailable` — le reçu serveur n'a pas pu être lu : on NE SAIT PAS, même
 *                    si le SDK, lui, prétend le contraire.
 *
 * ── LA PRÉ-VENTE (11/09/2026, brouillon ADR-016) ───────────────────────────
 * Le fondateur, à la question « ouvrir ou non les outils GRYD+ tant que rien
 * n'est en vente ? » : « ouvre, faut les mettre en place si quelqu'un paie ».
 * `storeCannotSell` porte ce fait, et il n'est JAMAIS écrit en dur : il descend
 * de `storeCannotSellYet2026(storeAvailability2026(…))`, c'est-à-dire de l'état
 * réel de la boutique. Le jour où une offre est lue avec son prix, il retombe à
 * `false` et le droit serveur redevient seul juge — la bascule est mécanique.
 *
 * ── POURQUOI LA PRÉ-VENTE PASSE AVANT `pending`, ET APRÈS TOUT LE RESTE ────
 * Après, parce qu'une lecture en cours (`loading`) et un reçu illisible
 * (`unavailable`) n'affirment RIEN : ouvrir sur une non-réponse serait le même
 * mensonge que fermer sur une non-réponse. Avant `pending`, parce que `pending`
 * FERME les outils en attendant une confirmation qui, dans une boutique qui ne
 * vend pas, ne viendra jamais : ce serait remurer la porte que la décision
 * ouvre. Un reçu serveur ACTIF, lui, garde la priorité : un droit réel reste un
 * droit réel, et l'écran doit pouvoir dire « abonnement actif » plutôt que
 * « inclus gratuitement ».
 */
export type GrydPlusAccessStatus2026 = 'loading' | 'signedOut' | 'active' | 'preSaleOpen' | 'pending' | 'inactive' | 'unavailable';
/**
 * POURQUOI l'accès est ouvert, quand il l'est. `null` = il ne l'est pas.
 * Les écrans en ont besoin : « abonné » et « inclus en attendant » ne se disent
 * pas avec les mêmes mots, et confondre les deux ferait afficher « Abonnement
 * actif » à quelqu'un qui n'a jamais payé.
 */
export type GrydPlusAccessReason2026 = 'server_entitlement' | 'pre_sale_open' | null;
export function grydPlusAccessState2026(input: {
  sessionLoading: boolean; ownerId: string | null; loaded: boolean;
  server: ServerGrydPlusAccess2026 | null; storeActive: boolean;
  /** Fait de boutique, jamais une intention : cf. `storeCannotSellYet2026`. */
  storeCannotSell: boolean;
}): { status: GrydPlusAccessStatus2026; active: boolean; reason: GrydPlusAccessReason2026 } {
  if (input.sessionLoading) return { status: 'loading', active: false, reason: null };
  if (!input.ownerId) return { status: 'signedOut', active: false, reason: null };
  if (!input.loaded) return { status: 'loading', active: false, reason: null };
  if (input.server === null) return { status: 'unavailable', active: false, reason: null };
  if (input.server.active) return { status: 'active', active: true, reason: 'server_entitlement' };
  if (input.storeCannotSell) return { status: 'preSaleOpen', active: true, reason: 'pre_sale_open' };
  return { status: input.storeActive ? 'pending' : 'inactive', active: false, reason: null };
}
