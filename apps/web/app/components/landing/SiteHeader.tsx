'use client';

/**
 * Header pill sticky (blur, rétrécit au scroll) : logo hexagone, nav ancres,
 * toggle FR/EN, CTA waitlist. Charte : le CTA header est GHOST — le seul CTA
 * chartreuse visible à l'écran reste celui de la section courante (doctrine C.3).
 */

import { useEffect, useState } from 'react';
import type { IconName } from '@klaim/shared';
import { useLang } from './LangProvider';
import type { Lang } from './dictionary';
import { Icon } from '../ui/Icon';
import styles from './SiteHeader.module.css';

/* Icônes de renfort (décision fondateur 03/07/2026 : icône + texte court) :
   Concept = hexagone (carte) · Carte = pin · War room = alerte · Crews = crew ·
   Performance = éclair · Accès = boutique. Le CTA Waitlist reste texte seul. */
const LINKS = [
  { href: '#concept', key: 'concept', icon: 'carte' },
  { href: '#connect', key: 'connect', icon: 'route' },
  { href: '#faq', key: 'faq', icon: 'badge' },
  { href: '#waitlist', key: 'access', icon: 'boutique' },
] as const satisfies readonly { href: string; key: string; icon: IconName }[];

function HexLogo() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      {/* Icône de marque §H : hexagone chartreuse plein. */}
      <polygon points="12,1.5 21,6.75 21,17.25 12,22.5 3,17.25 3,6.75" fill="var(--ch)" />
    </svg>
  );
}

export function SiteHeader() {
  const { copy, lang, setLang } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const langToggle = (
    <div className={styles.lang} role="group" aria-label={copy.nav.langAria}>
      {(['fr', 'en'] as Lang[]).map((code) => (
        <button
          key={code}
          type="button"
          className={`${styles.langBtn} ${lang === code ? styles.langActive : ''}`}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );

  return (
    <header className={styles.wrap}>
      <div className={`${styles.pill} ${scrolled ? styles.scrolled : ''}`}>
        <a href="#top" className={styles.logo} aria-label={copy.nav.logoAria}>
          <HexLogo />
          <span>GRYD</span>
        </a>

        <nav className={styles.nav} aria-label={copy.nav.aria}>
          {LINKS.map((link) => (
            <a key={link.href} className={styles.navLink} href={link.href}>
              <Icon name={link.icon} size={16} className={styles.navIcon} />
              {copy.nav[link.key]}
            </a>
          ))}
        </nav>

        <div className={styles.actions}>
          {langToggle}
          <a href="#waitlist" className={styles.cta}>
            {copy.nav.cta}
          </a>
          <button
            type="button"
            className={styles.burger}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? copy.nav.burgerClose : copy.nav.burgerOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={`${styles.burgerBar} ${menuOpen ? styles.barTop : ''}`} />
            <span className={`${styles.burgerBar} ${menuOpen ? styles.barMid : ''}`} />
            <span className={`${styles.burgerBar} ${menuOpen ? styles.barBot : ''}`} />
          </button>
        </div>
      </div>

      <nav
        id="mobile-nav"
        className={`${styles.mobileNav} ${menuOpen ? styles.mobileOpen : ''}`}
        aria-label={copy.nav.aria}
        hidden={!menuOpen}
      >
        {LINKS.map((link) => (
          <a
            key={link.href}
            className={styles.mobileLink}
            href={link.href}
            onClick={() => setMenuOpen(false)}
          >
            <Icon name={link.icon} size={16} className={styles.navIcon} />
            {copy.nav[link.key]}
          </a>
        ))}
        <div className={styles.mobileFoot}>{langToggle}</div>
      </nav>
    </header>
  );
}
