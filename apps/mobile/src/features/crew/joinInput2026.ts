import { normalizeInviteCode, parseInviteRef } from './inviteToken';
/** The current join flow supports server-issued short codes and their exact URLs.
 * A token invitation is not silently truncated or mistaken for a short code. */
export function resolveCrewJoinCode2026(input: string): string | null {
  const ref = parseInviteRef(input);
  return ref ? ref.kind === 'code' ? ref.value : null : normalizeInviteCode(input);
}
