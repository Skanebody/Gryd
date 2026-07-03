/**
 * GRYD Admin — session HMAC (DÉMO LOCALE, PAS PRODUCTION).
 *
 * ⚠️ Auth volontairement minimale pour le dev du dashboard : credentials en
 * variables d'env (défauts de dev), cookie httpOnly signé HMAC-SHA256 via
 * node:crypto. En production : Supabase Auth + table admin_roles (Support /
 * Moderator / Game Master / Admin Owner, spec admin §2) — TODO(O1).
 *
 * Module serveur uniquement (node:crypto) — ne jamais l'importer côté client.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'gryd_admin';
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

const secret = () => process.env.ADMIN_SESSION_SECRET ?? 'dev-only-secret';
export const adminEmail = () => process.env.ADMIN_EMAIL ?? 'admin@gryd.run';
export const adminPassword = () => process.env.ADMIN_PASSWORD ?? 'gryd-s0-fondateur';

interface SessionPayload {
  email: string;
  /** Expiration epoch ms. */
  exp: number;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

/** Jeton `base64url(payload).signature` — payload {email, exp: now + 24 h}. */
export function createSessionToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, exp: Date.now() + SESSION_TTL_MS } satisfies SessionPayload),
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

/** Vérifie signature (comparaison à temps constant) + expiration. */
export function verifySessionToken(token: string | undefined): { email: string } | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(payload));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<
      SessionPayload
    >;
    if (typeof data.email !== 'string' || typeof data.exp !== 'number') return null;
    if (data.exp < Date.now()) return null;
    return { email: data.email };
  } catch {
    return null;
  }
}
