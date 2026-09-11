/**
 * GRYD — LE HÉROS (lot W2).
 *
 * La direction visuelle de septembre pose la hiérarchie : « la scène ou la
 * mesure en premier, les commandes ensuite, les détails à la demande ». Le
 * héros du site est donc une PHOTOGRAPHIE RÉELLE et un titre, puis une action,
 * puis une ligne d'état. Rien d'autre.
 *
 * ─── CE QU'IL N'Y A PAS, ET C'EST LE POINT LE PLUS IMPORTANT ────────────────
 * Pas de maquette de téléphone, pas de faux écran, pas de carte peuplée de
 * territoires inventés. Tant qu'aucune capture iOS n'est recettée, un écran
 * dessiné à la main sur une page d'accueil est une donnée factice qui se fait
 * passer pour le produit (cahier §4.6). C'est la faute la plus facile ici.
 *
 * ─── LA LIGNE D'ÉTAT ────────────────────────────────────────────────────────
 * « Gryd n'est pas encore sur l'App Store » est écrit SOUS les boutons, sans
 * emphase, avant que le visiteur ne le découvre en cliquant. Un site qui laisse
 * quelqu'un cliquer « Télécharger » sans savoir ment par omission.
 *
 * Le texte reste sur du carbone plein, jamais par dessus la photographie : au
 * dessus d'une image, le contraste dépend du pixel, donc il n'est pas garanti.
 */
import type { ReactNode } from 'react';
import type { SitePhoto } from '../../lib/photos2026';
import { CtaButton } from './CtaButton';
import { PhotoFigure } from './PhotoFigure';
import styles from './Hero.module.css';

export interface HeroAction {
  readonly label: string;
  readonly href: string;
}

export interface HeroProps {
  readonly title: string;
  readonly lead: string;
  /** L'unique action chartreuse de la page. */
  readonly primary?: HeroAction;
  readonly secondary?: HeroAction;
  /** Une ligne d'état, sans emphase. Elle dit l'état réel du produit. */
  readonly status?: string;
  readonly photo?: SitePhoto;
  /** Un contenu libre sous les actions : une liste de faits, un encart. */
  readonly children?: ReactNode;
}

/**
 * Découpe un titre en PHRASES, pour en poser une par ligne.
 *
 * L'accroche est ternaire (« Cours ou roule. Ferme ta boucle. Le terrain est à
 * toi. ») : la laisser au navigateur donnait « Cours ou / roule. Ferme ta /
 * boucle. Le / terrain est à toi. » à 1280 px, ce qui casse le rythme au milieu
 * d'un membre de phrase. L'espace de séparation est CONSERVÉ dans la coupe :
 * le `textContent` du `<h1>` reste identique à la chaîne d'origine, donc ce que
 * lit un lecteur d'écran ne change pas. Un titre d'une seule phrase rend
 * exactement comme avant.
 */
function sentences(title: string): string[] {
  return title.match(/[^.!?]+[.!?]*\s*/g) ?? [title];
}

export function Hero({ title, lead, primary, secondary, status, photo, children }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={`grydContainer ${styles.grid}`}>
        <div className={styles.copy}>
          <h1 className={styles.title}>
            {sentences(title).map((line) => (
              <span key={line} className={styles.titleLine}>
                {line}
              </span>
            ))}
          </h1>
          <p className={styles.lead}>{lead}</p>
          {primary || secondary ? (
            <div className={styles.actions}>
              {primary ? (
                <CtaButton href={primary.href} variant="primary">
                  {primary.label}
                </CtaButton>
              ) : null}
              {secondary ? (
                <CtaButton href={secondary.href} variant="outline">
                  {secondary.label}
                </CtaButton>
              ) : null}
            </div>
          ) : null}
          {status ? <p className={styles.status}>{status}</p> : null}
          {children}
        </div>

        {photo ? (
          <div className={styles.media}>
            <PhotoFigure photo={photo} ratio="portrait" sizes="(min-width: 960px) 46vw, 100vw" priority />
          </div>
        ) : null}
      </div>
    </section>
  );
}
