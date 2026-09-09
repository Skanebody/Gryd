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
