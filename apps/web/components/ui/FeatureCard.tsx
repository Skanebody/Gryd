/**
 * GRYD — LA CARTE (lot W2).
 *
 * Une surface `#171717` sur le carbone, un filet fin, un rayon de 22 px : la
 * grammaire exacte de `ProfilePrimitives.tsx` côté application. AUCUNE OMBRE :
 * une ombre portée sur du carbone ne se voit pas, elle salit (direction
 * visuelle de septembre, « surfaces à plat et séparateurs fins »).
 *
 * ⚠️ PAS DE CARTE DANS UNE CARTE DANS UNE CARTE. La direction l'écrit
 * littéralement. Une `FeatureCard` contient du texte, un chiffre, un schéma :
 * jamais une autre `FeatureCard`.
 *
 * Le `media` (un schéma SVG, jamais une capture inventée) se pose EN HAUT : la
 * scène d'abord, le texte ensuite.
 */
import type { ReactNode } from 'react';
import styles from './FeatureCard.module.css';

export interface FeatureCardProps {
  readonly title: string;
  readonly children?: ReactNode;
  /** Un repère court au dessus du titre : un numéro d'étape, une étiquette. */
  readonly index?: string;
  /** Un schéma ou une illustration vectorielle. Jamais une fausse capture d'écran. */
  readonly media?: ReactNode;
  /** Un renvoi, rendu sous le corps. */
  readonly footer?: ReactNode;
  readonly className?: string;
}

export function FeatureCard({ title, children, index, media, footer, className }: FeatureCardProps) {
  return (
    <article className={[styles.card, className].filter(Boolean).join(' ')}>
      {media ? <div className={styles.media}>{media}</div> : null}
      <div className={styles.body}>
        {index ? <p className={styles.index}>{index}</p> : null}
        <h3 className={styles.title}>{title}</h3>
        {children ? <div className={styles.text}>{children}</div> : null}
      </div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </article>
  );
}
