/**
 * GRYD — UNE PHOTOGRAPHIE (lot W2).
 *
 * ─── POURQUOI UN `<img>` ET PAS `next/image` ────────────────────────────────
 * Le site est exporté en statique pour GitHub Pages, donc `images:
 * { unoptimized: true }` (`next.config.ts`) : `next/image` n'optimise plus rien
 * et n'ajoute qu'un composant client. Le `srcset` est donc écrit à la main,
 * depuis les DEUX tailles réellement produites sur le disque
 * (`lib/photos2026.ts`). Annoncer une largeur qui n'existe pas ferait télécharger
 * un 404 au navigateur.
 *
 * ─── CE QUE CE COMPOSANT GARANTIT ───────────────────────────────────────────
 *  · Un `alt` OBLIGATOIRE, pris dans le manifeste, jamais écrit sur place.
 *  · Des dimensions intrinsèques + un `aspect-ratio` : la page ne saute pas
 *    quand l'image arrive.
 *  · `loading="lazy"` partout SAUF la première image de la page, où il
 *    retarderait le plus gros élément visible.
 *  · Une légende facultative, dans un vrai `<figcaption>`.
 */
import type { SitePhoto } from '../../lib/photos2026';
import { PHOTO_HEIGHT_FULL, PHOTO_WIDTH_FULL, photoSrc, photoSrcSet } from '../../lib/photos2026';
import styles from './PhotoFigure.module.css';

export type PhotoRatio = 'portrait' | 'tall' | 'square' | 'wide';

export interface PhotoFigureProps {
  readonly photo: SitePhoto;
  /** Le cadrage. Les sources sont en 9:16 : `wide` coupe beaucoup, `portrait` peu. */
  readonly ratio?: PhotoRatio;
  /** Point d'intérêt vertical, en pourcentage. 35 % cadre les visages par défaut. */
  readonly focusY?: number;
  readonly caption?: string;
  /** Indice de largeur pour le navigateur. Par défaut : pleine largeur du conteneur. */
  readonly sizes?: string;
  /** La première image de la page, celle qu'il ne faut pas différer. */
  readonly priority?: boolean;
  readonly className?: string;
}

export function PhotoFigure({
  photo,
  ratio = 'portrait',
  focusY = 35,
  caption,
  sizes = '(min-width: 1120px) 1080px, 100vw',
  priority = false,
  className,
}: PhotoFigureProps) {
  return (
    <figure className={[styles.figure, className].filter(Boolean).join(' ')}>
      <div className={`${styles.frame} ${styles[ratio]}`}>
        <img
          className={styles.image}
          src={photoSrc(photo)}
          srcSet={photoSrcSet(photo)}
          sizes={sizes}
          width={PHOTO_WIDTH_FULL}
          height={PHOTO_HEIGHT_FULL}
          alt={photo.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          style={{ objectPosition: `center ${focusY}%` }}
        />
      </div>
      {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
    </figure>
  );
}
