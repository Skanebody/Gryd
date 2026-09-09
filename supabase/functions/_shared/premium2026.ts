/** RevenueCat snapshot protocol. No SDK/client entitlement is accepted by this module. */
export interface PremiumSnapshot2026 { productId: string | null; active: boolean; expiresAt: string | null; lifetime: boolean; observedAtMs: number }
function record(v: unknown): Record<string, unknown> | null { return v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; }
export function parsePremiumSnapshot2026(payload: unknown, entitlementId: string, allowSandbox: boolean): PremiumSnapshot2026 | null {
  const body = record(payload); const subscriber = record(body?.subscriber); const entitlements = record(subscriber?.entitlements);
  const observed = body?.request_date_ms;
  if (!entitlements || typeof observed !== 'number' || !Number.isSafeInteger(observed) || observed <= 0) return null;
  const entry = record(entitlements[entitlementId]);
  if (!entry) return { productId: null, active: false, expiresAt: null, lifetime: false, observedAtMs: observed };
  if (typeof entry.product_identifier !== 'string' || !entry.product_identifier) return null;
  const productId = entry.product_identifier;
  const subscription = record(record(subscriber?.subscriptions)?.[productId]);
  const oneTime = record(subscriber?.non_subscriptions)?.[productId];
  const purchases = Array.isArray(oneTime) ? oneTime.map(record).filter((v): v is Record<string, unknown> => v !== null) : [];
  const receipt = subscription ?? purchases.sort((a, b) => Date.parse(String(b.purchase_date)) - Date.parse(String(a.purchase_date)))[0];
  // Unknown environment is not proof of a production purchase, including legacy lifetime.
  if (typeof receipt?.is_sandbox !== 'boolean') return null;
  const sandbox = receipt.is_sandbox;
  const rawExpiry = entry.expires_date;
  if (rawExpiry !== null && (typeof rawExpiry !== 'string' || !Number.isFinite(Date.parse(rawExpiry)))) return null;
  const grace = subscription?.grace_period_expires_date;
  const expiry = rawExpiry === null ? null : Math.max(Date.parse(rawExpiry as string), typeof grace === 'string' && Number.isFinite(Date.parse(grace)) ? Date.parse(grace) : 0);
  const refunded = typeof subscription?.refunded_at === 'string';
  return { productId, active: !refunded && (allowSandbox || !sandbox) && (expiry === null || expiry > observed), expiresAt: expiry === null ? null : new Date(expiry).toISOString(), lifetime: expiry === null, observedAtMs: observed };
}
export const isPremiumOwnerId2026 = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function premiumWebhookOwners2026(event: Record<string, unknown>): string[] {
  const ids = event.type === 'TRANSFER' ? [...(Array.isArray(event.transferred_from) ? event.transferred_from : []), ...(Array.isArray(event.transferred_to) ? event.transferred_to : [])] : [event.app_user_id];
  return [...new Set(ids.filter(isPremiumOwnerId2026))];
}
/** Mirrors the database order rule so replay/race edge cases are explicit and testable. */
export function premiumSnapshotMayReplace2026(previous: { event: number; observed: number } | null, next: { event: number; observed: number; active: boolean }): boolean {
  return previous === null || next.observed > previous.observed || next.observed === previous.observed && !next.active;
}
