'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AdminNav.module.css';

const ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/courses', label: 'Courses suspectes' },
  { href: '/admin/claims', label: 'Claims gelés' },
  { href: '/admin/joueurs', label: 'Joueurs à risque' },
  { href: '/admin/signalements', label: 'Signalements' },
  { href: '/admin/simulateur', label: 'Simulateur' },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className={styles.nav} aria-label="Navigation admin">
      {ITEMS.map((item) => {
        const active = item.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? `${styles.link} ${styles.active}` : styles.link}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
