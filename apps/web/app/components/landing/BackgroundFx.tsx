'use client';

/**
 * Texture de fond fixe. Aucun éclairage ne suit le curseur et aucune surface
 * d'interface n'applique de flou ou de reflet.
 */

import styles from './BackgroundFx.module.css';

export function BackgroundFx() {
  return <div className={styles.grain} aria-hidden="true" />;
}
