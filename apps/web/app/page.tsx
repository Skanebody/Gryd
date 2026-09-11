/**
 * GRYD — L'ACCUEIL (lot W2, 12/09/2026).
 *
 * Objectif unique de la page, posé par le cahier de contenu §2.1 : « comprendre
 * en 30 secondes, savoir quoi faire ensuite ». Sept sections, dans l'ordre du
 * cahier §3.1, et RIEN qui ne soit dans le cahier.
 *
 * ─── LA PAGE N'ÉCRIT AUCUNE PHRASE ──────────────────────────────────────────
 * Toute la copie vit dans `lib/homeCopy2026.ts`, que `homeCopy2026.test.ts`
 * relit à chaque `npm run gate` : pas de tiret long, pas de « GRYD » en
 * capitales hors du nom de l'offre, pas de vouvoiement, pas de mot de l'ancien
 * site, et chaque chiffre interpolé depuis `game-rules.ts`. Écrire une phrase
 * ici, c'est la sortir de ce filet.
 *
 * ─── UN SEUL CHARTREUSE À L'ÉCRAN ───────────────────────────────────────────
 * Le héros porte le `primary`. Les cinq renvois de section sont des `link`.
 * L'action de l'en-tête est un `outline`. Le second `primary` de la page est le
 * bouton du formulaire, trois écrans plus bas : les deux ne sont jamais visibles
 * en même temps, ce qui a été vérifié en capture à 375, 768 et 1280 px.
 *
 * ─── CE QUE LA PAGE NE MONTRE PAS ───────────────────────────────────────────
 * Aucune capture d'écran, aucune maquette de téléphone, aucune carte peuplée de
 * territoires inventés, aucun compteur d'inscrits, aucune ville nommée, aucun
 * badge App Store. Les seules images sont deux photographies réelles et trois
 * schémas repris du guide de l'application.
 */
import type { Metadata } from 'next';
import {
  CtaButton,
  Hero,
  JsonLd,
  PhotoFigure,
  Section,
  SiteFooter,
  SiteHeader,
  Stat,
  StatRow,
  StepList,
  WaitlistForm,
} from '../components/ui';
import { HOME_COPY } from '../lib/homeCopy2026';
import { SITE_PHOTOS } from '../lib/photos2026';
import { SITE_OG_IMAGE, SITE_ORIGIN } from '../lib/site2026';
import { organizationJsonLd } from '../lib/structuredData2026';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: HOME_COPY.seo.title,
  description: HOME_COPY.seo.description,
  alternates: { canonical: `${SITE_ORIGIN}/` },
  openGraph: {
    title: HOME_COPY.seo.title,
    description: HOME_COPY.seo.description,
    url: `${SITE_ORIGIN}/`,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: HOME_COPY.hero.title }],
  },
};

export default function HomePage() {
  const copy = HOME_COPY;
  return (
    <>
      <SiteHeader />

      <main id="contenu">
        <Hero
          title={copy.hero.title}
          lead={copy.hero.lead}
          primary={copy.hero.primary}
          secondary={copy.hero.secondary}
          status={copy.hero.status}
          photo={SITE_PHOTOS.heroAccueil}
        />

        {/* 1 · Le geste. Trois schémas, pas une photo : une photographie de
            coureur n'explique pas ce qu'est une boucle. */}
        <Section id="le-geste" kicker={copy.steps.kicker} title={copy.steps.title} spacing="flush">
          <StepList
            items={[
              { ...copy.steps.items[0]!, diagram: 'trace' },
              { ...copy.steps.items[1]!, diagram: 'closure' },
              { ...copy.steps.items[2]!, diagram: 'territory' },
            ]}
          />
          <div className={styles.after}>
            <CtaButton href={copy.steps.cta.href} variant="link">
              {copy.steps.cta.label}
            </CtaButton>
          </div>
        </Section>

        {/* 2 · Deux sports. Les deux tolérances côte à côte prouvent la phrase. */}
        <Section kicker={copy.sports.kicker} title={copy.sports.title} lead={copy.sports.body}>
          <StatRow>
            {copy.sports.stats.map((stat) => (
              <Stat key={stat.rule} value={stat.value} label={stat.label} rule={stat.rule} />
            ))}
          </StatRow>
        </Section>

        {/* 3 · Le crew. La photographie porte la section, en pleine largeur :
            c'est la seule scène collective du site, et la direction de septembre
            donne la place principale à la scène. */}
        <Section kicker={copy.crew.kicker} title={copy.crew.title} lead={copy.crew.body}>
          <div className={styles.before}>
            <CtaButton href={copy.crew.cta.href} variant="link">
              {copy.crew.cta.label}
            </CtaButton>
          </div>
          <PhotoFigure
            photo={SITE_PHOTOS.crewAccueil}
            ratio="wide"
            focusY={38}
            sizes="(min-width: 1120px) 1056px, 100vw"
          />
        </Section>

        {/* 4 · Anti-pay-to-win. Les trois multiplicateurs valent 1, et la page
            le montre comme une mesure, pas comme un slogan. */}
        <Section kicker={copy.fairPlay.kicker} title={copy.fairPlay.title} lead={copy.fairPlay.body}>
          <StatRow>
            {copy.fairPlay.stats.map((stat) => (
              <Stat key={stat.rule} value={stat.value} label={stat.label} rule={stat.rule} tone="block" />
            ))}
          </StatRow>
          <div className={styles.after}>
            <p className={styles.note}>{copy.fairPlay.statsNote}</p>
            <CtaButton href={copy.fairPlay.cta.href} variant="link">
              {copy.fairPlay.cta.label}
            </CtaButton>
          </div>
        </Section>

        {/* 5 · Vie privée. La coupe de 250 m est la mesure dominante. */}
        <Section kicker={copy.privacy.kicker} title={copy.privacy.title}>
          <div className={styles.split}>
            <div className={styles.splitText}>
              <p className={styles.body}>{copy.privacy.body}</p>
              <CtaButton href={copy.privacy.cta.href} variant="link">
                {copy.privacy.cta.label}
              </CtaButton>
            </div>
            <Stat
              value={copy.privacy.stat.value}
              label={copy.privacy.stat.label}
              rule={copy.privacy.stat.rule}
              tone="block"
            />
          </div>
        </Section>

        {/* 6 · L'état réel et la liste d'attente. `id="waitlist"` est l'ancre
            historique de la section : elle est visée par les tests E2E du site
            public et par des liens déjà partagés. */}
        <Section id="waitlist" kicker={copy.waitlist.kicker} title={copy.waitlist.title}>
          <div className={styles.waitlist}>
            <p className={styles.body}>{copy.waitlist.body}</p>
            <WaitlistForm
              emailLabel={copy.waitlist.emailLabel}
              postalLabel={copy.waitlist.postalLabel}
              postalHelp={copy.waitlist.postalHelp}
              submitLabel={copy.waitlist.submit}
              successMessage={copy.waitlist.success}
            />
          </div>
        </Section>
      </main>

      <SiteFooter />

      {/* Le SEUL bloc `Organization` du site, et il est sur `/`. */}
      <JsonLd data={organizationJsonLd()} />
    </>
  );
}
