/**
 * GRYD — SAISON ET CLASSEMENTS, `/saison/` (lot W3).
 *
 * Copie : cahier de contenu §3.4.
 *
 * ─── LES DEUX DATES NE SONT PAS ÉCRITES ICI ─────────────────────────────────
 * Elles viennent de `lib/season2026.ts`, seule copie du dépôt, miroir de la
 * ligne `season_collections_2026` configurée en production le 11/09/2026. Si la
 * saison change en base, ce fichier change, ou la page ment. La page les rend
 * dans un `<time>` : une date affichée sans forme machine n'est lisible que par
 * un humain.
 *
 * ─── INTERDIT FORMEL, ET IL EST TENU ────────────────────────────────────────
 * Aucune ville nommée, aucun pays voisin, aucune ouverture européenne (ADR-006,
 * « zéro donnée EU factice »). Aucun nombre d'inscrits, aucun nombre de communes
 * ouvertes, aucun classement d'exemple : la base compte 3 comptes et 0 sortie.
 * La page dit la RÈGLE d'ouverture (par présence), pas un état qu'elle ne
 * connaît pas.
 */
import type { Metadata } from 'next';
import { CtaButton, Hero, Section, SiteFooter, SiteHeader, Stat, StatRow } from '../../components/ui';
import { SITE_PHOTOS } from '../../lib/photos2026';
import { SAISON_COPY } from '../../lib/saisonCopy2026';
import { SEASON_ZERO_END_ISO, SEASON_ZERO_START_ISO } from '../../lib/season2026';
import { SITE_ORIGIN } from '../../lib/site2026';
import styles from '../sitePages.module.css';

export const metadata: Metadata = {
  title: SAISON_COPY.seo.title,
  description: SAISON_COPY.seo.description,
  alternates: { canonical: `${SITE_ORIGIN}/saison/` },
};

export default function SaisonPage() {
  const copy = SAISON_COPY;
  return (
    <>
      <SiteHeader />

      <main id="contenu">
        <Hero title={copy.hero.title} lead={copy.hero.lead} photo={SITE_PHOTOS.saisonHero}>
          {/* Les deux bornes en forme machine, à côté de la phrase qui les dit :
              un lecteur d'écran et un moteur lisent la même fenêtre que l'œil. */}
          <p className="grydSrOnly">
            Du <time dateTime={SEASON_ZERO_START_ISO}>{SEASON_ZERO_START_ISO}</time> au{' '}
            <time dateTime={SEASON_ZERO_END_ISO}>{SEASON_ZERO_END_ISO}</time>.
          </p>
        </Hero>

        {/* Les trois mesures de la saison prennent TOUTE la largeur, et pas la
            colonne du héros : à 1280 px, trois chiffres dans une demi-largeur se
            plient en deux lignes, et « 100 XP » se retrouve seul sous « 12 ». */}
        <Section spacing="flush">
          <StatRow>
            {copy.hero.facts.map((item) => (
              <Stat key={item.rule} value={item.value} label={item.label} rule={item.rule} />
            ))}
          </StatRow>
        </Section>

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
