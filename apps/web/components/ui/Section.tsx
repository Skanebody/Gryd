/**
 * GRYD — LA SECTION (lot W2).
 *
 * Le rythme vertical du site, en un seul endroit. Chaque section a UN sujet,
 * donc au plus un titre : la direction visuelle de septembre insiste là dessus
 * (« chaque écran possède un sujet dominant, une action principale et un niveau
 * secondaire accessible »).
 *
 * Le `kicker` est une étiquette, pas un titre : il est rendu avant le `<h2>`
 * mais reste hors du fil des titres, sinon le plan du document compterait deux
 * niveaux là où il n'y a qu'un sujet.
 *
 * `id` sert aux ancres publiques (`#bouger`, `#boucle`…). Elles sont en
 * français PARCE QU'ELLES SONT PUBLIQUES, et elles reprennent les identifiants
 * du guide de l'application.
 */
import type { ReactNode } from 'react';
import styles from './Section.module.css';

export interface SectionProps {
  readonly children: ReactNode;
  /** Ancre publique, sans dièse. */
  readonly id?: string;
  readonly kicker?: string;
  readonly title?: string;
  /** Niveau du titre. `h2` par défaut ; `h3` dans une sous-section. */
  readonly headingLevel?: 'h2' | 'h3';
  /** Le paragraphe d'attaque, plus grand que le corps. */
  readonly lead?: string;
  /** `tight` resserre l'espace vertical, `flush` le supprime en haut. */
  readonly spacing?: 'normal' | 'tight' | 'flush';
  readonly className?: string;
}

export function Section({
  children,
  id,
  kicker,
  title,
  headingLevel = 'h2',
  lead,
  spacing = 'normal',
  className,
}: SectionProps) {
  const Heading = headingLevel;
  const classes = [styles.section, styles[spacing], className].filter(Boolean).join(' ');
  return (
    <section className={classes} id={id} aria-labelledby={id && title ? `${id}-titre` : undefined}>
      <div className="grydContainer">
        {kicker || title || lead ? (
          <header className={styles.head}>
            {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
            {title ? (
              <Heading className={styles.title} id={id ? `${id}-titre` : undefined}>
                {title}
              </Heading>
            ) : null}
            {lead ? <p className={styles.lead}>{lead}</p> : null}
          </header>
        ) : null}
        {children}
      </div>
    </section>
  );
}
