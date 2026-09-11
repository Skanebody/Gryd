/**
 * GRYD — QUESTIONS FRÉQUENTES, `/faq/` (lot W3).
 *
 * Copie : cahier de contenu §3.7. Cinq groupes, treize questions, reprises mot
 * pour mot de `helpFaq2026.ts` (version `fr`) : le site et l'application
 * répondent la même chose, au caractère près.
 *
 * ─── L'ACCORDÉON ET LE `FAQPage` LISENT LA MÊME DONNÉE ──────────────────────
 * `faqEntries()` sert les deux. Un `FAQPage` dont les réponses diffèrent de
 * celles affichées est une pénalité, pas un bonus (cahier §3.10) : ici, il
 * n'existe aucun chemin pour les faire diverger.
 *
 * ─── AUCUN JAVASCRIPT ───────────────────────────────────────────────────────
 * `FaqAccordion` rend des `<details>` natifs : le contenu est dans le HTML
 * exporté (donc lisible par un moteur même replié), il s'ouvre sans un octet de
 * script, et le clavier fonctionne parce que c'est le navigateur qui s'en
 * charge.
 *
 * Un `name` de groupe DIFFÉRENT par section : partagé, ouvrir une question de
 * « Le terrain » refermerait celle de « Tes sorties » deux sections plus haut,
 * sans que rien ne l'explique à l'écran.
 */
import type { Metadata } from 'next';
import {
  CtaButton,
  FaqAccordion,
  Hero,
  JsonLd,
  Section,
  SiteFooter,
  SiteHeader,
} from '../../components/ui';
import { FAQ_COPY, faqEntries } from '../../lib/faqCopy2026';
import { SITE_PHOTOS } from '../../lib/photos2026';
import { SITE_ORIGIN } from '../../lib/site2026';
import { faqPageJsonLd } from '../../lib/structuredData2026';
import styles from '../sitePages.module.css';

export const metadata: Metadata = {
  title: FAQ_COPY.seo.title,
  description: FAQ_COPY.seo.description,
  alternates: { canonical: `${SITE_ORIGIN}/faq/` },
};

export default function FaqPage() {
  const copy = FAQ_COPY;
  return (
    <>
      <SiteHeader />

      <main id="contenu">
        <Hero title={copy.hero.title} lead={copy.hero.lead} photo={SITE_PHOTOS.faq} />

        <Section spacing="flush">
          {copy.groups.map((group) => (
            <section key={group.id} className={styles.faqGroup} id={group.id}>
              <h2 className={styles.faqTitle}>{group.title}</h2>
              <FaqAccordion entries={group.entries} group={`faq-${group.id}`} />
            </section>
          ))}

          <div className={styles.after}>
            <CtaButton href={copy.cta.href} variant="link">
              {copy.cta.label}
            </CtaButton>
          </div>
        </Section>
      </main>

      <SiteFooter />

      {/* Le SEUL bloc `FAQPage` du site, et il est sur `/faq/`. */}
      <JsonLd data={faqPageJsonLd(faqEntries())} />
    </>
  );
}
