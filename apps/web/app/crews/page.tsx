/**
 * GRYD — LES CREWS, `/crews/` (lot W3).
 *
 * Copie : cahier de contenu §3.3.
 *
 * ─── CE QUE CETTE PAGE NE MONTRE PAS ────────────────────────────────────────
 * Aucun nombre de crews, aucun nom de crew, aucun classement de crew, aucun
 * blason d'exemple. Aucun crew réel n'existe en base à ce jour (3 comptes,
 * 0 donnée de jeu) : un exemple « pour illustrer » serait la donnée factice que
 * la constitution interdit, et c'est sur une page de crews qu'elle est la plus
 * tentante.
 *
 * Les deux photographies sont des scènes RÉELLES de groupe : elles montrent ce
 * qu'est un crew (des gens qui courent ensemble), jamais l'interface qui le
 * gère. Tant qu'aucune capture iOS n'est recettée, le site ne peint pas d'écran.
 */
import type { Metadata } from 'next';
import { CtaButton, Hero, PhotoFigure, Section, SiteFooter, SiteHeader, Stat, StatRow } from '../../components/ui';
import { CREWS_COPY } from '../../lib/crewsCopy2026';
import { SITE_PHOTOS } from '../../lib/photos2026';
import { SITE_ORIGIN } from '../../lib/site2026';
import styles from '../sitePages.module.css';

export const metadata: Metadata = {
  title: CREWS_COPY.seo.title,
  description: CREWS_COPY.seo.description,
  alternates: { canonical: `${SITE_ORIGIN}/crews/` },
};

export default function CrewsPage() {
  const copy = CREWS_COPY;
  return (
    <>
      <SiteHeader />

      <main id="contenu">
        <Hero title={copy.hero.title} lead={copy.hero.lead} photo={SITE_PHOTOS.crewsHero} />

        {copy.sections.map((section) => (
          <Section
            key={section.id}
            id={section.id}
            kicker={section.kicker}
            title={section.title}
            lead={section.body}
          >
            {section.facts ? (
              <StatRow>
                {section.facts.map((item) => (
                  <Stat key={item.rule} value={item.value} label={item.label} rule={item.rule} />
                ))}
              </StatRow>
            ) : null}

            {/* La scène d'après-course porte la section « Gérer » : c'est la
                seule image du site où l'on voit un crew hors de la course. */}
            {section.id === 'gerer' ? (
              <div className={styles.media}>
                <PhotoFigure
                  photo={SITE_PHOTOS.crewsGerer}
                  ratio="wide"
                  focusY={42}
                  sizes="(min-width: 1120px) 1056px, 100vw"
                />
              </div>
            ) : null}
          </Section>
        ))}

        <Section spacing="tight">
          <CtaButton href={copy.cta.href} variant="link">
            {copy.cta.label}
          </CtaButton>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
