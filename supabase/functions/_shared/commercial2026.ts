export interface CommercialConfig2026 { id: string; entitlement_id: string | null; product_ids: string[] }
export interface CommercialSnapshot2026 { observedAtMs: number; items: { id: string; owned: boolean; productId: string | null; acquiredAt: string | null }[] }
const record = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
/** Only configured non-consumables backed by both an entitlement and its receipt. */
export function parseCommercialSnapshot2026(value: unknown, configurations: readonly CommercialConfig2026[], allowSandbox: boolean): CommercialSnapshot2026 | null {
  const body = record(value), subscriber = record(body?.subscriber), entitlements = record(subscriber?.entitlements);
  const observed = body?.request_date_ms;
  if (!entitlements || typeof observed !== 'number' || !Number.isSafeInteger(observed) || observed <= 0) return null;
  const items: CommercialSnapshot2026['items'] = [];
  for (const config of configurations) {
    if (!config.entitlement_id || config.product_ids.length === 0) continue;
    const entitlement = record(entitlements[config.entitlement_id]);
    const empty = { id: config.id, owned: false, productId: null, acquiredAt: null };
    if (!entitlement) { items.push(empty); continue; }
    const productId = entitlement.product_identifier;
    if (typeof productId !== 'string' || !config.product_ids.includes(productId) || entitlement.expires_date !== null) { items.push(empty); continue; }
    const purchases = record(subscriber?.non_subscriptions)?.[productId];
    if (!Array.isArray(purchases)) return null;
    const valid = purchases.map(record).filter((p): p is Record<string, unknown> => !!p && typeof p.is_sandbox === 'boolean' && (allowSandbox || !p.is_sandbox) && p.refunded_at == null && typeof p.purchase_date === 'string' && Number.isFinite(Date.parse(p.purchase_date)) && Date.parse(p.purchase_date) <= observed);
    valid.sort((a,b) => Date.parse(a.purchase_date as string) - Date.parse(b.purchase_date as string));
    const receipt = valid[0];
    items.push(receipt ? { id: config.id, owned: true, productId, acquiredAt: new Date(receipt.purchase_date as string).toISOString() } : empty);
  }
  return { observedAtMs: observed, items };
}
