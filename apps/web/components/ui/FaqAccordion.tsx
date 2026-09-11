/**
 * GRYD — LES QUESTIONS FRÉQUENTES (lot W2).
 *
 * ─── `<details>` NATIF, ET RIEN D'AUTRE ─────────────────────────────────────
 * Pas de `useState`, pas d'`aria-expanded` posé à la main, pas de gestion de
 * clavier : le navigateur fait déjà tout, correctement, et sans un octet de
 * JavaScript. Le composant reste donc un composant SERVEUR, le contenu est dans
 * le HTML exporté (donc lisible par un moteur de recherche même replié), et il
 * fonctionne si le JavaScript ne charge pas.
 *
 * Le `name` partagé rend l'accordéon EXCLUSIF (un seul volet ouvert) là où le
 * navigateur le gère ; ailleurs, plusieurs volets s'ouvrent, ce qui reste un
 * comportement correct. Aucune fonction ne dépend de cette exclusivité.
 *
 * ⚠️ SI LA PAGE POSE UN `FAQPage` EN DONNÉES STRUCTURÉES, SES RÉPONSES DOIVENT
 * ÊTRE CELLES-CI, MOT POUR MOT. Un `FAQPage` dont les réponses diffèrent de la
 * page est une pénalité, pas un bonus (cahier §3.10).
 */
import styles from './FaqAccordion.module.css';

export interface FaqEntry {
  readonly question: string;
  readonly answer: string;
}

export interface FaqAccordionProps {
  readonly entries: readonly FaqEntry[];
  /**
   * Nom du groupe. Deux accordéons de la même page doivent porter des noms
   * différents, sinon ouvrir l'un referme l'autre.
   */
  readonly group?: string;
}

export function FaqAccordion({ entries, group = 'faq' }: FaqAccordionProps) {
  return (
    <div className={styles.list}>
      {entries.map((entry) => (
        <details key={entry.question} className={styles.item} name={group}>
          <summary className={styles.summary}>
            <span>{entry.question}</span>
            <svg className={styles.marker} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </summary>
          <p className={styles.answer}>{entry.answer}</p>
        </details>
      ))}
    </div>
  );
}
