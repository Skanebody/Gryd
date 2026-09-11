'use client';

/**
 * GRYD — L'EN-TÊTE DU SITE (lot W2).
 *
 * Cahier §2.3 : le logo, puis cinq liens, puis l'action « Télécharger » à
 * droite. Au delà de cinq, la barre se plie mal. Sur mobile, les cinq liens
 * passent dans un panneau et **Télécharger reste visible** : c'est la seule
 * action que quelqu'un cherche vraiment sur un téléphone.
 *
 * ─── CE QUI REND LE MENU ACCESSIBLE, POINT PAR POINT ────────────────────────
 *  · Un vrai `<button>`, pas une case à cocher déguisée : il porte
 *    `aria-expanded` et `aria-controls`, donc un lecteur d'écran annonce l'état
 *    du panneau avant qu'on l'ouvre.
 *  · Le panneau fermé est retiré de l'arbre (`hidden`), pas juste transparent :
 *    un lien invisible mais focalisable piège le clavier.
 *  · Échap ferme, et rend le focus au bouton.
 *  · Un changement de page ferme le panneau : sinon il reste ouvert par dessus
 *    la page suivante.
 *  · `aria-current="page"` marque la page courante, en plus du filet chartreuse :
 *    jamais la couleur seule.
 *
 * ⚠️ L'ACTION DE L'EN-TÊTE N'EST PAS CHARTREUSE. Elle est collante, donc visible
 * sur tous les écrans de la page : en chartreuse, elle volerait son rôle au CTA
 * principal du héros, et il y aurait deux actions principales partout.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BRAND_WORD, HEADER_ACTION, PRIMARY_NAV } from '../../lib/site2026';
import { CtaButton } from './CtaButton';
import { GrydMark } from './GrydMark';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Un changement d'adresse ferme le panneau. Sans ça, il reste ouvert par
  // dessus la page qu'on vient d'ouvrir depuis lui.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Échap ferme, et le focus revient au bouton qui a ouvert : un focus perdu au
  // fond du document est la panne clavier la plus courante d'un menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const isCurrent = useCallback((href: string) => pathname === href || `${pathname}/` === href, [pathname]);

  return (
    <header className={styles.header}>
      {/* Premier élément focalisable de chaque page : au clavier, on saute les
          six liens de navigation d'un coup. La cible `#contenu` est le `<main>`
          que chaque page doit porter. */}
      <a className="grydSkipLink" href="#contenu">
        Aller au contenu
      </a>
      <div className={`grydContainer ${styles.bar}`}>
        <Link className={styles.brand} href="/" aria-label={`${BRAND_WORD}, accueil`}>
          <GrydMark size={24} title={null} />
          <span className={styles.brandWord}>{BRAND_WORD}</span>
        </Link>

        <nav className={styles.desktopNav} aria-label="Navigation principale">
          <ul className={styles.desktopList}>
            {PRIMARY_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  className={styles.navLink}
                  href={link.href}
                  aria-current={isCurrent(link.href) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          <CtaButton href={HEADER_ACTION.href} variant="outline" className={styles.action}>
            {HEADER_ACTION.label}
          </CtaButton>
          <button
            ref={toggleRef}
            className={styles.toggle}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="grydSrOnly">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {open ? (
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path d="M3 7h18M3 12h18M3 17h18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* `hidden` retire vraiment le panneau de l'arbre quand il est fermé. */}
      <div className={styles.panel} id={panelId} hidden={!open}>
        <nav className="grydContainer" aria-label="Navigation du site">
          <ul className={styles.panelList}>
            {PRIMARY_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  className={styles.panelLink}
                  href={link.href}
                  aria-current={isCurrent(link.href) ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
