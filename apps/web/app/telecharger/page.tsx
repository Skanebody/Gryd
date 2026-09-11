/**
 * GRYD — TÉLÉCHARGER, `/telecharger/` (lot W3).
 *
 * Copie : cahier de contenu §3.8.
 *
 * ─── AUCUN BADGE APPLE, AUCUN LIEN DE FICHE ─────────────────────────────────
 * Il n'existe AUCUNE adresse `apps.apple.com` dans le dépôt : un badge serait un
 * bouton mort, et c'est précisément la page où la tentation est la plus forte.
 * La page dit l'état réel, le date, et propose la seule action qui fonctionne
 * vraiment.
 *
 * ─── LE FORMULAIRE ENREGISTRE POUR DE BON ───────────────────────────────────
 * `WaitlistForm` appelle la RPC `waitlist_join(email, postal_code)` (migration
 * 0034, `SECURITY DEFINER`, accordée à `anon`). Quatre états distincts : repos,
 * en cours, échec nommé, succès. Rien n'est annoncé avant le retour du serveur.
 *
 * ─── LE SEUL CHARTREUSE DE LA PAGE EST LE BOUTON DU FORMULAIRE ──────────────
 * Le héros n'en porte pas : l'action de cette page, c'est laisser son adresse,
 * et elle vit dans le formulaire. Deux boutons chartreuse sur un même écran n'en
 * feraient aucun.
 */
import type { Metadata } from 'next';
import {
  Callout,
  CtaButton,
  Hero,
  JsonLd,
  Section,
  SiteFooter,
  SiteHeader,
  WaitlistForm,
} from '../../components/ui';
import { DOWNLOAD_COPY } from '../../lib/downloadCopy2026';
import { SITE_PHOTOS } from '../../lib/photos2026';
import { SITE_ORIGIN } from '../../lib/site2026';
import { softwareApplicationJsonLd } from '../../lib/structuredData2026';
import styles from '../sitePages.module.css';

export const metadata: Metadata = {
  title: DOWNLOAD_COPY.seo.title,
  description: DOWNLOAD_COPY.seo.description,
  alternates: { canonical: `${SITE_ORIGIN}/telecharger/` },
};

export default function TelechargerPage() {
  const copy = DOWNLOAD_COPY;
  return (
    <>
      <SiteHeader />

      <main id="contenu">
        <Hero title={copy.hero.title} lead={copy.hero.lead} photo={SITE_PHOTOS.telecharger} />

        {/* `id="waitlist"` est l'ancre historique de la section : elle est visée
            par des liens déjà partagés et par les tests de bout en bout. */}
        <Section id="waitlist" kicker={copy.waitlist.kicker} title={copy.waitlist.title}>
          <div className={styles.waitlist}>
            <Callout title={copy.notice.title} />
            <WaitlistForm
              emailLabel={copy.waitlist.emailLabel}
              postalLabel={copy.waitlist.postalLabel}
              postalHelp={copy.waitlist.postalHelp}
              submitLabel={copy.waitlist.submit}
              successMessage={copy.waitlist.success}
            />
          </div>
        </Section>

        <Section kicker={copy.before.kicker} title={copy.before.title} lead={copy.before.body}>
          <CtaButton href={copy.cta.href} variant="link">
            {copy.cta.label}
          </CtaButton>
        </Section>
      </main>

      <SiteFooter />

      {/* Le SEUL bloc `SoftwareApplication` du site, et il est ici. Sans note,
          sans version, sans adresse de fiche : rien de tout cela n'existe. */}
      <JsonLd data={softwareApplicationJsonLd()} />
    </>
  );
}
