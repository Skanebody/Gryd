/**
 * GRYD — LE GESTE EN TROIS TEMPS (lot W2).
 *
 * Trois blocs, un schéma chacun, PAS DE PHOTO : le cahier de contenu §3.1 le
 * dit explicitement. Une photographie de coureur n'explique pas ce qu'est une
 * boucle ; un dessin le fait en moins de deux secondes, et se lit sans son
 * texte.
 *
 * Rendu en liste ordonnée : l'ordre est le sens. « Tu fermes » avant « Tu
 * bouges » ne veut rien dire, et un lecteur d'écran doit l'entendre comme une
 * séquence, pas comme trois cartes indépendantes.
 */
import type { DiagramKind } from './Diagram';
import { Diagram } from './Diagram';
import { FeatureCard } from './FeatureCard';
import styles from './StepList.module.css';

export interface StepItem {
  /** Le numéro affiché : « 01 », « 02 »… */
  readonly index: string;
  readonly title: string;
  readonly body: string;
  /** Le schéma qui accompagne l'étape. Absent, la carte reste sans dessin. */
  readonly diagram?: DiagramKind;
}

export interface StepListProps {
  readonly items: readonly StepItem[];
}

export function StepList({ items }: StepListProps) {
  return (
    <ol className={styles.list}>
      {items.map((item) => (
        <li key={item.index} className={styles.item}>
          <FeatureCard
            index={item.index}
            title={item.title}
            media={item.diagram ? <Diagram kind={item.diagram} /> : undefined}
          >
            <p>{item.body}</p>
          </FeatureCard>
        </li>
      ))}
    </ol>
  );
}
