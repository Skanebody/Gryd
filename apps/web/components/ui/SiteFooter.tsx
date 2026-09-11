/**
 * GRYD — LE PIED DE PAGE (lot W2).
 *
 * Cahier §2.3 : trois colonnes (marque, produit, légal et contact) plus une
 * ligne de bas. Rien d'autre.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ DE L'ANCIEN PIED, ET POURQUOI ──────────────────────
 *  · Les ancres `#pricing`, `#warroom`, `#badges` : ces sections n'existent
 *    plus, et un lien vers une ancre absente est un bouton mort.
 *  · « Run the Map. Première carte officielle : France. » : une carte n'est pas
 *    « officielle », et la formule laisse croire qu'une seconde existe ailleurs.
 *  · TOUTE ICÔNE SOCIALE. Aucun compte Instagram, TikTok ou autre au nom de
 *    Gryd n'est connu en ligne (décision n° 5 du cahier de contenu). Le jour où
 *    un compte existe vraiment, il s'ajoute ici ET dans `Organization.sameAs`,
 *    jamais dans l'un sans l'autre.
 *
 * L'âge minimum vient de `MIN_AGE_YEARS` et l'adresse de `lib/legal.ts` : ni
 * l'un ni l'autre n'est tapé ici.
 */
import Link from 'next/link';
import {
  BRAND_TAGLINE,
  BRAND_WORD,
  CONTACT,
  FOOTER_AGE_NOTICE,
  FOOTER_COPYRIGHT,
  FOOTER_LEGAL,
  FOOTER_PRODUCT,
} from '../../lib/site2026';
import { GrydMark } from './GrydMark';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`grydContainer ${styles.grid}`}>
        <div className={styles.brandCol}>
          <div className={styles.lockup}>
            <GrydMark size={26} title={null} />
            <span className={styles.brandWord}>{BRAND_WORD}</span>
          </div>
          <p className={styles.tagline}>{BRAND_TAGLINE}</p>
        </div>

        <nav className={styles.col} aria-label="Produit">
          <h2 className={styles.colTitle}>Produit</h2>
          <ul className={styles.list}>
            {FOOTER_PRODUCT.map((link) => (
              <li key={link.href}>
                <Link className={styles.link} href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.col} aria-label="Informations légales et contact">
          <h2 className={styles.colTitle}>Légal et contact</h2>
          <ul className={styles.list}>
            {FOOTER_LEGAL.map((link) => (
              <li key={link.href}>
                <Link className={styles.link} href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a className={styles.link} href={`mailto:${CONTACT.email}`}>
                {CONTACT.email}
              </a>
            </li>
          </ul>
          <p className={styles.postal}>{CONTACT.postal}</p>
        </nav>
      </div>

      <div className={`grydContainer ${styles.bottom}`}>
        <p>{FOOTER_AGE_NOTICE}</p>
        <p>{FOOTER_COPYRIGHT}</p>
      </div>
    </footer>
  );
}
