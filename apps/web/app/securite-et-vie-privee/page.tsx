/**
 * GRYD — SÉCURITÉ ET VIE PRIVÉE, `/securite-et-vie-privee/` (lot W3).
 *
 * Copie : cahier de contenu §3.6.
 *
 * ─── CE QUE CETTE PAGE NE PROMET PAS ────────────────────────────────────────
 * Ni « Gryd détecte toute triche », ni « tes données sont parfaitement en
 * sécurité », ni aucun absolu du même genre : le cahier §4.2 les interdit un par
 * un. Une page de sécurité qui promet l'infaillible ment au premier
 * contre-exemple, et il y en a toujours un. Elle décrit donc des MÉCANISMES
 * (ce qui est coupé, ce qui est gardé, ce que le serveur vérifie) et leurs
 * limites nommées.
 *
 * ─── LES CHIFFRES SONT DES MESURES, PAS DES ARGUMENTS ───────────────────────
 * 250 m coupés à chaque bout, 15 m de précision attendue, 5 min d'écart
 * d'horloge toléré, 90 jours ou 1 an de conservation, 16 ans : tous viennent de
 * `@klaim/shared` via `lib/facts2026.ts`, et chacun porte sa constante dans le
 * DOM.
 */
import type { Metadata } from 'next';
import { CtaButton, Hero, Section, SiteFooter, SiteHeader, Stat, StatRow } from '../../components/ui';
import { SITE_PHOTOS } from '../../lib/photos2026';
import { PRIVACY_COPY } from '../../lib/privacyCopy2026';
import { SITE_ORIGIN } from '../../lib/site2026';
import styles from '../sitePages.module.css';

export const metadata: Metadata = {
  title: PRIVACY_COPY.seo.title,
  description: PRIVACY_COPY.seo.description,
  alternates: { canonical: `${SITE_ORIGIN}/securite-et-vie-privee/` },
};

export default function SecuriteEtViePriveePage() {
  const copy = PRIVACY_COPY;
  return (
    <>
      <SiteHeader />

      <main id="contenu">
        <Hero title={copy.hero.title} lead={copy.hero.lead} photo={SITE_PHOTOS.securite} />

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
          </Section>
        ))}

        <Section spacing="tight">
          <div className={styles.after}>
            <CtaButton href={copy.cta.href} variant="link">
              {copy.cta.label}
            </CtaButton>
          </div>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
