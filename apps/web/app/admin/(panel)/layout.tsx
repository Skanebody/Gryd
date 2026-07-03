/**
 * GRYD Admin — layout protégé (Server Component).
 *
 * NOTE structure : la spec demandait le garde dans app/admin/layout.tsx, mais un
 * layout à cette hauteur envelopperait AUSSI /admin/login → boucle de redirect.
 * Le garde vit donc dans ce route group (panel) ; /admin/login reste libre.
 * Les URLs ne changent pas : (panel) est invisible dans le chemin.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logoutAdmin } from '../auth';
import { ADMIN_COOKIE, verifySessionToken } from '../lib/session';
import { AdminNav } from '../components/AdminNav';
import styles from './shell.module.css';

export const metadata: Metadata = {
  title: 'GRYD — Console admin',
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  const session = verifySessionToken(store.get(ADMIN_COOKIE)?.value);
  if (!session) redirect('/admin/login');

  // Mode démo tant que le projet Supabase n'existe pas (point ouvert O1).
  const demoMode = !process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandHex} aria-hidden="true" />
          <div>
            <p className={styles.brandName}>GRYD</p>
            <p className={styles.brandSub}>Console admin</p>
          </div>
        </div>

        <AdminNav />

        <div className={styles.sidebarFooter}>
          {demoMode && (
            <p className={styles.demoBadge}>
              MODE DÉMO — Supabase non configuré (O1)
            </p>
          )}
          <p className={styles.sessionEmail}>{session.email}</p>
          <form action={logoutAdmin}>
            <button className={styles.logout} type="submit">
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
