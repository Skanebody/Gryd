/**
 * GRYD — COMMENT ÇA MARCHE, `/comment-ca-marche/` (lot W3).
 *
 * Copie : cahier de contenu §3.2. Sept chapitres, dans l'ordre, et un sommaire
 * cliquable en tête.
 *
 * ─── LES ANCRES SONT PUBLIQUES, ET ELLES SONT CELLES DE L'APPLICATION ───────
 * `#bouger`, `#boucle`, `#terrain`, `#points`, `#crew`, `#saison`, `#fair-play`
 * sont les identifiants de `HELP_CHAPTER_IDS` côté app. Une adresse partagée
 * depuis le guide de l'application tombe donc sur le bon chapitre du site, et
 * `siteCopy2026.test.ts` relit le fichier de l'app pour refuser toute dérive.
 *
 * ─── PAS DE FIL D'ARIANE ────────────────────────────────────────────────────
 * Le plan du site est PLAT : huit pages publiques, toutes filles de `/`. Un
 * « Accueil > Comment ça marche » n'apporterait rien qu'un en-tête collant ne
 * donne déjà, et son `BreadcrumbList` serait un quatrième bloc de données
 * structurées là où le cahier §3.10 en autorise trois.
 *
 * ─── AUCUN CHARTREUSE SUR CETTE PAGE ────────────────────────────────────────
 * On vient ici pour LIRE, pas pour décider : il n'y a donc pas d'action
 * principale, et le chartreuse ne décore pas. Les deux renvois (la Saison 0, les
 * questions fréquentes) sont des `link`, et l'action de l'en-tête reste
 * `outline`.
 */
import type { Metadata } from 'next';
import { Callout, CtaButton, Hero, Section, SiteFooter, SiteHeader, Stat, StatRow } from '../../components/ui';
import { GUIDE_COPY } from '../../lib/guideCopy2026';
import { SITE_PHOTOS } from '../../lib/photos2026';
import { SITE_ORIGIN } from '../../lib/site2026';
import styles from '../sitePages.module.css';

export const metadata: Metadata = {
  title: GUIDE_COPY.seo.title,
  description: GUIDE_COPY.seo.description,
  alternates: { canonical: `${SITE_ORIGIN}/comment-ca-marche/` },
};

export default function CommentCaMarchePage() {
  const copy = GUIDE_COPY;
  return (
    <>
      <SiteHeader />

      <main id="contenu">
        <Hero title={copy.hero.title} lead={copy.hero.lead} photo={SITE_PHOTOS.guideOuverture} />

        {/* Le sommaire. Sept ancres, numérotées comme les chapitres : à 375 px,
            il évite de faire défiler quatre écrans pour trouver « Les points ». */}
        <Section spacing="flush">
          <nav aria-label={copy.tocLabel}>
            <h2 className="grydSrOnly">{copy.tocLabel}</h2>
            <ol className={styles.toc}>
              {copy.chapters.map((chapter) => (
                <li key={chapter.id}>
                  <a className={styles.tocLink} href={`#${chapter.id}`}>
                    <span className={styles.tocNum}>{chapter.index}</span>
                    {chapter.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </Section>

        {copy.chapters.map((chapter) => (
          <Section
            key={chapter.id}
            id={chapter.id}
            kicker={chapter.index}
            title={chapter.title}
            lead={chapter.body}
          >
            {chapter.facts ? (
              <StatRow>
                {chapter.facts.map((item) => (
                  <Stat key={item.rule} value={item.value} label={item.label} rule={item.rule} />
                ))}
              </StatRow>
            ) : null}

            {/* La note du chapitre : ce que le chapitre refuse de laisser croire.
                `quiet`, parce qu'elle nuance, elle n'alerte pas. */}
            {chapter.note ? (
              <div className={styles.after}>
                <Callout title={chapter.note} tone="quiet" />
              </div>
            ) : null}

            {chapter.cta ? (
              <div className={styles.after}>
                <CtaButton href={chapter.cta.href} variant="link">
                  {chapter.cta.label}
                </CtaButton>
              </div>
            ) : null}
          </Section>
        ))}

        <Section spacing="tight">
          <CtaButton href={copy.faqCta.href} variant="link">
            {copy.faqCta.label}
          </CtaButton>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
