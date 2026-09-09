import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as FileSystem from 'expo-file-system';
import { SHARE_EXPORT_FORMATS_2026, type ShareFormat2026 } from '../shareModel2026';
import { buildRunFilmScene2026, type RunFilmInput2026 } from './runFilmModel2026';
export type { RunFilmInput2026, RunFilmFacts2026 } from './runFilmModel2026';

export type RunFilmFailure2026 = 'native_build_required' | 'encoder_unavailable' | 'web_not_supported' | 'busy' | 'cancelled' | 'timeout' | 'invalid_input' | 'trace_too_large' | 'encoding_failed';
export type RunFilmResult2026 = { ok: true; uri: string; mimeType: 'video/mp4'; durationMs: 8000; width: number; height: number } | { ok: false; reason: RunFilmFailure2026 };
export type RunFilmCompatibility2026 = { available: true } | { available: false; reason: 'native_build_required' | 'encoder_unavailable' | 'web_not_supported' };
interface NativeFilmModule {
  isAvailableAsync(width: number, height: number): Promise<boolean>;
  generateAsync(job: string, json: string): Promise<RunFilmResult2026>;
  cancel(job: string): void;
  releaseAsync(uri: string): Promise<void>;
}
let sequence = 0;
let busy = false;
function nativeEncoder() {
  if (Platform.OS === 'web') return null;
  try { return requireOptionalNativeModule<NativeFilmModule>('GrydRunFilm'); } catch { return null; }
}
export async function getRunFilmCompatibility2026(format: ShareFormat2026 = 'story'): Promise<RunFilmCompatibility2026> {
  if (Platform.OS === 'web') return { available: false, reason: 'web_not_supported' };
  const module = nativeEncoder();
  if (!module) return { available: false, reason: 'native_build_required' };
  try {
    const { width, height } = SHARE_EXPORT_FORMATS_2026[format];
    return await module.isAvailableAsync(width, height) ? { available: true } : { available: false, reason: 'encoder_unavailable' };
  } catch { return { available: false, reason: 'encoder_unavailable' }; }
}

/** Produces a real local silent H.264 MP4. It does not open a share destination or claim publication. */
export async function generateRunFilm2026(input: RunFilmInput2026): Promise<RunFilmResult2026> {
  if (input.signal?.aborted) return { ok: false, reason: 'cancelled' };
  if (busy) return { ok: false, reason: 'busy' };
  busy = true;
  const job = `${Date.now().toString(36)}-${(++sequence).toString(36)}`;
  const module = nativeEncoder();
  let cancel: (() => void) | undefined;
  let outputUri: string | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let abandoned = false;
  try {
    const compatibility = await getRunFilmCompatibility2026(input.format);
    if (!compatibility.available) return { ok: false, reason: compatibility.reason };
    if (!module) return { ok: false, reason: 'native_build_required' };
    const scene = buildRunFilmScene2026(input);
    if (input.signal?.aborted) return { ok: false, reason: 'cancelled' };
    cancel = () => { try { module.cancel(job); } catch { /* Final result still observes the signal. */ } };
    input.signal?.addEventListener('abort', cancel, { once: true });
    const encoding = module.generateAsync(job, JSON.stringify(scene));
    // Driver calls can stall outside the encoder's own loop. Keep the UI bounded,
    // and dispose of a late file rather than presenting it after cancellation.
    void encoding.then(result => { if (abandoned && result.ok) void module.releaseAsync(result.uri).catch(() => {}); }).catch(() => {});
    const result = await Promise.race([encoding, new Promise<RunFilmResult2026>(resolve => {
      timeout = setTimeout(() => { abandoned = true; cancel?.(); resolve({ ok: false, reason: 'timeout' }); }, 215_000);
    })]);
    if (result.ok) {
      outputUri = result.uri;
      if (input.signal?.aborted) { await module.releaseAsync(result.uri); return { ok: false, reason: 'cancelled' }; }
      const file = await FileSystem.getInfoAsync(result.uri);
      if (!file.exists || file.isDirectory || file.size < 1024 || result.width !== scene.width || result.height !== scene.height || result.mimeType !== 'video/mp4' || result.durationMs !== 8000) {
        await module.releaseAsync(result.uri); return { ok: false, reason: 'encoding_failed' };
      }
    }
    return result;
  } catch (error) {
    if (outputUri) { try { await module?.releaseAsync(outputUri); } catch { /* Native cache expiry is the second cleanup path. */ } }
    if (input.signal?.aborted) return { ok: false, reason: 'cancelled' };
    const message = error instanceof Error ? error.message : '';
    return { ok: false, reason: message === 'trace_too_large' ? 'trace_too_large' : message === 'invalid_input' ? 'invalid_input' : 'encoding_failed' };
  } finally {
    if (timeout) clearTimeout(timeout);
    if (cancel) input.signal?.removeEventListener('abort', cancel);
    busy = false;
  }
}
/** Call only after the system share sheet has returned, or after an abandoned completed export. */
export async function releaseRunFilm2026(uri: string): Promise<void> {
  try { await nativeEncoder()?.releaseAsync(uri); } catch { /* Native cache expiry is the second cleanup path. */ }
}
