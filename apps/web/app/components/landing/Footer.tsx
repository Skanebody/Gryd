'use client';

/**
 * Footer : logo + « Run the Map. Première carte officielle : France. » + liens
 * d'ancres + mentions (âge minimum depuis @klaim/shared).
 * Liens légaux (AMENDEMENT-33 §6) : Confidentialité → /confidentialite, Conditions
 * → /conditions — URL publiques requises par App Store Connect + HealthKit.
 */

import { MIN_AGE_YEARS } from '@klaim/shared';
import { useLang } from './LangProvider';
import styles from './Footer.module.css';

const LINKS = [
  { href: '#concept', key: 'concept' },
  { href: '#map', key: 'map' },
  { href: '#crews', key: 'crews' },
  { href: '#performance', key: 'performance' },
  { href: '#pricing', key: 'access' },
] as const;

export function Footer() {
  const { copy, formatInt, lang } = useLang();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <p className={styles.brand}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <polygon points="12,1.5 21,6.75 21,17.25 12,22.5 3,17.25 3,6.75" fill="var(--ch)" />
            </svg>
            GRYD
          </p>
          <p className={styles.tagline}>{copy.footer.tagline}</p>
        </div>

        <nav className={styles.nav} aria-label={copy.nav.aria}>
          {LINKS.map((link) => (
            <a key={link.href} className={styles.link} href={link.href}>
              {copy.nav[link.key]}
            </a>
          ))}
        </nav>

        <ul className={styles.legal}>
          <li>{copy.footer.age.replace('{age}', formatInt(MIN_AGE_YEARS))}</li>
          <li>
            {/* Politique de confidentialité — URL publique (App Store Connect + HealthKit, AMENDEMENT-33 §6). */}
            <a className={styles.legalLink} href="/confidentialite">
              {copy.footer.privacy}
            </a>
          </li>
          <li>
            {/* CGU — URL publique (App Store Connect, AMENDEMENT-33 §6). Libellé local :
                le dictionnaire landing n'a pas de clé « terms ». */}
            <a className={styles.legalLink} href="/conditions">
              {lang === 'fr' ? 'Conditions' : 'Terms'}
            </a>
          </li>
          <li>{copy.footer.company}</li>
        </ul>
      </div>
    </footer>
  );
}
