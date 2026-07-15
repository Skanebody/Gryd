'use server';

/**
 * GRYD Admin — actions d'auth (DÉMO LOCALE, PAS PRODUCTION — cf. lib/session.ts).
 * Succès → cookie httpOnly `gryd_admin` signé HMAC-SHA256, 24 h.
 */
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE,
  SESSION_TTL_MS,
  adminEmail,
  adminPassword,
  constantTimeEquals,
  createSessionToken,
} from './lib/session';

export type LoginState = { status: 'idle' } | { status: 'error'; message: string };

// ─── Anti-bruteforce (audit sécurité) ───────────────────────────────────────
// Le login admin n'avait AUCUNE limite : un attaquant pouvait essayer des mots de passe à
// l'infini. On plafonne par IP ET par e-mail (une même IP qui balaie des e-mails est coupée
// par la clé IP ; une attaque distribuée sur UN compte est coupée par la clé e-mail).
//
// LIMITE ASSUMÉE : ce compteur est EN MÉMOIRE, donc par instance. En serverless (Vercel),
// un attaquant qui tape des instances froides dilue la protection. C'est une barrière
// sérieuse à petite échelle, pas une garantie. Version durable = le RPC hit_rate_limit
// (migration 0035, déjà en prod) — il exige une SUPABASE_SERVICE_ROLE_KEY côté web, que
// l'app n'a pas aujourd'hui (seulement l'anon key). À brancher le jour d'un déploiement
// server-side sérieux.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const MAX_TRACKED_KEYS = 5_000; // borne mémoire : au-delà, on repart à zéro (jamais de fuite)

const failures = new Map<string, number[]>();

/** Échecs récents pour une clé, fenêtre glissante (purge au passage). */
function recentFailures(key: string): number[] {
  const now = Date.now();
  const kept = (failures.get(key) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  if (kept.length > 0) failures.set(key, kept);
  else failures.delete(key);
  return kept;
}

function isLocked(key: string): boolean {
  return recentFailures(key).length >= LOGIN_MAX_ATTEMPTS;
}

function noteFailure(key: string): void {
  if (failures.size > MAX_TRACKED_KEYS) failures.clear();
  failures.set(key, [...recentFailures(key), Date.now()]);
}

export async function loginAdmin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  const h = await headers();
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
  const ipKey = `ip:${ip}`;
  const emailKey = `email:${email}`;

  if (isLocked(ipKey) || isLocked(emailKey)) {
    // Même message que l'échec d'identifiants ? Non : ici on informe, c'est une limite
    // légitime et l'utilisateur légitime doit comprendre pourquoi il est bloqué.
    return {
      status: 'error',
      message: 'Trop de tentatives. Réessaie dans 15 minutes.',
    };
  }

  // Les DEUX comparaisons sont évaluées (pas de court-circuit) et en TEMPS CONSTANT :
  // un `!==` révélait par le timing si l'e-mail existait, puis si le mot de passe approchait.
  const emailOk = constantTimeEquals(email, adminEmail().toLowerCase());
  const passwordOk = constantTimeEquals(password, adminPassword());

  if (!emailOk || !passwordOk) {
    noteFailure(ipKey);
    noteFailure(emailKey);
    // Message unique volontaire : ne révèle pas lequel des deux champs est faux.
    return { status: 'error', message: 'Identifiants incorrects. Vérifie e-mail et mot de passe.' };
  }

  // Succès → on efface le compteur (un légitime qui se trompe 4 fois puis réussit n'est pas puni).
  failures.delete(ipKey);
  failures.delete(emailKey);

  const store = await cookies();
  store.set(ADMIN_COOKIE, createSessionToken(email), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  redirect('/admin');
}

export async function logoutAdmin(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect('/admin/login');
}
