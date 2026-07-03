import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, verifySessionToken } from '../lib/session';
import { LoginForm } from './LoginForm';
import styles from './login.module.css';

export const metadata: Metadata = {
  title: 'GRYD Admin — Connexion',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  // Déjà connecté → directement au dashboard.
  const store = await cookies();
  if (verifySessionToken(store.get(ADMIN_COOKIE)?.value)) redirect('/admin');

  return (
    <main className={styles.page}>
      <div className={styles.box}>
        <p className={styles.kicker}>GRYD · CONSOLE ADMIN</p>
        <h1 className={styles.title}>Connexion</h1>
        <p className={styles.hint}>
          Accès réservé à l&rsquo;équipe. Auth de démo locale — pas un système de
          production.
        </p>
        <LoginForm />
      </div>
    </main>
  );
}
