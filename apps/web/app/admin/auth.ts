'use server';

/**
 * GRYD Admin — actions d'auth (DÉMO LOCALE, PAS PRODUCTION — cf. lib/session.ts).
 * Succès → cookie httpOnly `gryd_admin` signé HMAC-SHA256, 24 h.
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  ADMIN_COOKIE,
  SESSION_TTL_MS,
  adminEmail,
  adminPassword,
  createSessionToken,
} from './lib/session';

export type LoginState = { status: 'idle' } | { status: 'error'; message: string };

export async function loginAdmin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');

  if (email !== adminEmail().toLowerCase() || password !== adminPassword()) {
    // Message unique volontaire : ne révèle pas lequel des deux champs est faux.
    return { status: 'error', message: 'Identifiants incorrects. Vérifie e-mail et mot de passe.' };
  }

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
