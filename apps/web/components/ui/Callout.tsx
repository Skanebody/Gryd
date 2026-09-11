/**
 * GRYD — L'ENCART D'ÉTAT (lot W2).
 *
 * Il sert à UNE chose : dire l'état réel avant qu'on le découvre. « Gryd+ n'est
 * pas en vente », « Gryd n'est pas encore sur l'App Store ». La constitution
 * l'exige (« l'app ne ment jamais : quatre états distincts, jamais un repli
 * inventé ») et le cahier de contenu le pose en haut de `/gryd-plus/`, « en
 * haut, impossible à manquer ».
 *
 * ─── POURQUOI IL N'EST PAS ROUGE, ET N'EST PAS CHARTREUSE ───────────────────
 * La palette n'a qu'un accent, et il désigne l'ACTION. Un encart d'état n'est
 * ni une action, ni une alerte : c'est un fait. Il se distingue donc par sa
 * SURFACE et par un filet à gauche, pas par une couleur d'humeur. La charte a
 * retiré le rouge et le violet « de conflit » de l'ancien site.
 *
 * `role="note"` plutôt que `role="alert"` : rien n'arrive en direct, rien
 * n'interrompt. Un `alert` volerait le focus d'un lecteur d'écran pour une
 * information qui était déjà là au chargement.
 */
import type { ReactNode } from 'react';
import styles from './Callout.module.css';

export interface CalloutProps {
  /** Le fait, en une phrase courte et grasse. */
  readonly title: string;
  readonly children?: ReactNode;
  /** `strong` pour l'encart d'ouverture d'une page, `quiet` pour une note de bas de section. */
  readonly tone?: 'strong' | 'quiet';
}

export function Callout({ title, children, tone = 'strong' }: CalloutProps) {
  return (
    <aside className={`${styles.callout} ${styles[tone]}`} role="note">
      <p className={styles.title}>{title}</p>
      {children ? <div className={styles.body}>{children}</div> : null}
    </aside>
  );
}
