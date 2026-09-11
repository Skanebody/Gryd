/**
 * GRYD — L'OFFRE, `/gryd-plus/` (lot W3).
 *
 * Copie : cahier de contenu §3.5.
 *
 * ─── AUCUN BOUTON D'ACHAT, ET C'EST LE SUJET DE LA PAGE ─────────────────────
 * Ni « S'abonner », ni « Choisir ce plan », ni formulaire, ni lien de paiement.
 * Aucun produit n'existe côté App Store, aucun contrat de distribution n'est
 * signé : un bouton serait mort, et la constitution l'interdit. La page a donc
 * ZÉRO chartreuse. Le seul renvoi mène aux règles du jeu, et il est en `link`.
 *
 * ─── L'ENCART D'ÉTAT PASSE AVANT LES PRIX ───────────────────────────────────
 * « Impossible à manquer », dit le cahier : il est le premier bloc sous le
 * héros, et il dit que le prix affiché plus bas est un prix PRÉVU, pas un prix
 * pratiqué. Un visiteur qui lirait la grille sans lui croirait à une offre en
 * vente.
 *
 * ─── LES PRIX VIENNENT DU CODE ──────────────────────────────────────────────
 * `COMMERCIAL_PROPOSAL_2026` via `lib/facts2026.ts`, jamais `lib/pricing.ts`
 * (qui pointe encore sur les SKU d'une offre morte). Chaque cellule porte la
 * constante dont elle sort en `data-rule` : le jour où quelqu'un affichera un
 * prix qui n'est pas dans la source, ça se verra dans le DOM.
 */
import type { Metadata } from 'next';
import { Callout, CtaButton, Hero, Section, SiteFooter, SiteHeader, Stat, StatRow } from '../../components/ui';
import { OFFER_COPY } from '../../lib/offerCopy2026';
import { SITE_PHOTOS } from '../../lib/photos2026';
import { SITE_ORIGIN } from '../../lib/site2026';
import styles from '../sitePages.module.css';

export const metadata: Metadata = {
  title: OFFER_COPY.seo.title,
  description: OFFER_COPY.seo.description,
  alternates: { canonical: `${SITE_ORIGIN}/gryd-plus/` },
};

export default function GrydPlusPage() {
  const copy = OFFER_COPY;
  return (
    <>
      <SiteHeader />

      <main id="contenu">
        <Hero title={copy.hero.title} lead={copy.hero.lead} photo={SITE_PHOTOS.offre} />

        <Section spacing="flush">
          <Callout title={copy.notice.title}>
            <p>{copy.notice.body}</p>
          </Callout>
        </Section>

        {/* Le contenu de l'offre tient dans son paragraphe : la section n'a pas
            d'enfant, et n'en invente pas un pour remplir. */}
        <Section kicker={copy.contains.kicker} title={copy.contains.title} lead={copy.contains.body}>
          {null}
        </Section>

        <Section kicker={copy.never.kicker} title={copy.never.title} lead={copy.never.body}>
          <StatRow>
            {copy.never.facts.map((item) => (
              <Stat key={item.rule} value={item.value} label={item.label} rule={item.rule} tone="block" />
            ))}
          </StatRow>
        </Section>

        <Section kicker={copy.price.kicker} title={copy.price.title}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{copy.price.columns.offer}</th>
                  <th scope="col">{copy.price.columns.price}</th>
                </tr>
              </thead>
              <tbody>
                {copy.price.rows.map((row) => (
                  <tr key={row.offer}>
                    <th scope="row">{row.offer}</th>
                    <td data-rule={row.rule}>{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.after}>
            <p className={styles.prose}>{copy.price.note}</p>
          </div>
        </Section>

        <Section kicker={copy.stop.kicker} title={copy.stop.title} lead={copy.stop.body}>
          <CtaButton href={copy.cta.href} variant="link">
            {copy.cta.label}
          </CtaButton>
        </Section>
      </main>

      <SiteFooter />
    </>
  );
}
