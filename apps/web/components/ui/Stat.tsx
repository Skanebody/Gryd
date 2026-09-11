/**
 * GRYD — UN CHIFFRE (lot W2).
 *
 * ─── `data-rule` : LA PROVENANCE, DANS LE DOM ───────────────────────────────
 * Chaque chiffre affiché porte le NOM DE LA CONSTANTE d'où il sort, en
 * `data-rule`. Ce n'est pas de la décoration : le site a un jour affiché un
 * Founder Pack à 149 € contre 9,99 € dans la source, un facteur 15 entre le
 * lien public et la vérité. Un attribut dans le DOM rend la vérification
 * mécanique, depuis une capture comme depuis un test de page : on peut
 * demander à la page « d'où sort ce nombre » sans lire le code.
 *
 * Il n'est PAS affiché à l'écran : `COMMERCIAL_PROPOSAL_2026.monthlyEurCents`
 * ne veut rien dire pour un visiteur, et la charte interdit de remplacer une
 * mesure par du jargon.
 *
 * La valeur, elle, s'écrit toujours depuis `@klaim/shared`. Un `Stat` dont la
 * valeur est tapée à la main est exactement ce que ce composant doit empêcher.
 */
import styles from './Stat.module.css';

export interface StatProps {
  /** La valeur, déjà mise en forme (« 25 m », « × 1 »). */
  readonly value: string;
  readonly label: string;
  /** Le chemin de la constante source, cité dans le DOM. Obligatoire. */
  readonly rule: string;
  /** `inline` pour une ligne de faits sous un paragraphe, `block` pour une carte. */
  readonly tone?: 'inline' | 'block';
}

export function Stat({ value, label, rule, tone = 'inline' }: StatProps) {
  return (
    <div className={`${styles.stat} ${styles[tone]}`} data-rule={rule}>
      <span className={styles.value}>{value}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}

/** Une rangée de chiffres. Un séparateur fin, jamais une carte par nombre. */
export function StatRow({ children }: { readonly children: React.ReactNode }) {
  return <div className={styles.row}>{children}</div>;
}
