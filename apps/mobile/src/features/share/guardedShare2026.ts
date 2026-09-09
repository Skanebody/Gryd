/** Recheck after preparation and before each external action; a revoked owner never reaches a fallback. */
export async function guardedShareAsset2026<T>(input: {
  authorized(): boolean;
  confirmBeforeDelivery?(): Promise<boolean>;
  capture(): Promise<string>;
  available(): Promise<boolean>;
  deliver(uri: string): Promise<T>;
  release(uri: string): void;
  fallback(): Promise<T>;
}): Promise<T | { ok: false; reason: 'dismissed' }> {
  const dismissed = { ok: false, reason: 'dismissed' } as const;
  if (!input.authorized()) return dismissed;
  let uri: string | null = null;
  try {
    uri = await input.capture();
    if (!input.authorized()) return dismissed;
    const available = await input.available();
    if (!input.authorized()) return dismissed;
    if (available) {
      if(input.confirmBeforeDelivery){let confirmed=false;try{confirmed=await input.confirmBeforeDelivery();}catch{}if(!confirmed||!input.authorized())return dismissed;}
      return await input.deliver(uri);
    }
  } catch { /* A normal capture failure may use the existing text fallback, if ownership still holds. */ }
  finally { if (uri) { try { input.release(uri); } catch { /* OS cache remains a second cleanup path. */ } } }
  return input.authorized() ? input.fallback() : dismissed;
}
