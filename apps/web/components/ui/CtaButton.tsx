/**
 * GRYD — L'ACTION (lot W2).
 *
 * ─── LA RÈGLE DU CHARTREUSE, ET ELLE EST DURE ───────────────────────────────
 * UN SEUL bouton `primary` par écran. Le chartreuse ne décore pas : il DÉSIGNE
 * l'action principale, et deux actions principales n'en font aucune. En
 * pratique : l'en-tête porte une action `outline` (elle est collante, donc
 * visible partout), le héros porte le `primary` de la page, et les renvois de
 * section sont des `link`. Le seul second `primary` autorisé est celui d'un
 * formulaire, parce qu'il vit plusieurs écrans plus bas et n'est jamais visible
 * en même temps que celui du héros.
 *
 * Trois variantes, trois rôles :
 *  · `primary` — fond chartreuse, texte CARBONE. Contraste mesuré 16,3:1.
 *  · `outline` — fond transparent, filet gris, texte encre. 19,5:1.
 *  · `link`    — un renvoi de section : pas de chrome, un chevron qui s'allume.
 *
 * Hauteur minimale 46 px, donc au dessus de la cible tactile de 44 exigée par
 * la charte. Rayon 23 px : un demi-cercle exact, comme `ProfilePrimitives`.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './CtaButton.module.css';

export type CtaVariant = 'primary' | 'outline' | 'link';

export interface CtaButtonProps {
  readonly children: ReactNode;
  /** Adresse interne (slash final obligatoire) ou `mailto:`. Absente, le composant rend un `<button>`. */
  readonly href?: string;
  readonly variant?: CtaVariant;
  /** Type du bouton quand `href` est absent. `submit` pour un formulaire. */
  readonly type?: 'button' | 'submit';
  readonly disabled?: boolean;
  readonly className?: string;
}

/** Le chevron des renvois de section. Décoratif : le libellé porte déjà le sens. */
function Chevron() {
  return (
    <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CtaButton({
  children,
  href,
  variant = 'primary',
  type = 'button',
  disabled,
  className,
}: CtaButtonProps) {
  const classes = [styles.base, styles[variant], className].filter(Boolean).join(' ');
  const content = (
    <>
      <span>{children}</span>
      {variant === 'link' ? <Chevron /> : null}
    </>
  );

  if (href) {
    // `mailto:` et les adresses absolues sortent du routeur : un `<Link>` les
    // préchargerait pour rien, et Next le refuse sur certaines formes.
    const external = href.startsWith('mailto:') || href.startsWith('http');
    if (external) {
      return (
        <a className={classes} href={href}>
          {content}
        </a>
      );
    }
    return (
      <Link className={classes} href={href}>
        {content}
      </Link>
    );
  }

  return (
    <button className={classes} type={type} disabled={disabled}>
      {content}
    </button>
  );
}
