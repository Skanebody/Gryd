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
 *  · `pending`     — le Store a enregistré l'achat, le serveur pas encore : un
 *                    fait vrai et transitoire, ni un droit ni une panne ;
 *  · `inactive`    — le serveur a répondu, il n'y a pas de droit ;
 *  · `unavailable` — le reçu serveur n'a pas pu être lu : on NE SAIT PAS, même
 *                    si le SDK, lui, prétend le contraire.
 */
export type GrydPlusAccessStatus2026 = 'loading' | 'signedOut' | 'active' | 'pending' | 'inactive' | 'unavailable';
export function grydPlusAccessState2026(input: {
  sessionLoading: boolean; ownerId: string | null; loaded: boolean;
  server: ServerGrydPlusAccess2026 | null; storeActive: boolean;
}): { status: GrydPlusAccessStatus2026; active: boolean } {
  if (input.sessionLoading) return { status: 'loading', active: false };
  if (!input.ownerId) return { status: 'signedOut', active: false };
  if (!input.loaded) return { status: 'loading', active: false };
  if (input.server === null) return { status: 'unavailable', active: false };
  if (input.server.active) return { status: 'active', active: true };
  return { status: input.storeActive ? 'pending' : 'inactive', active: false };
}
