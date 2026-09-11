/**
 * GRYD — Mentions légales (obligation LCEN, loi 2004-575 art. 6-III : tout
 * éditeur d'un service en ligne en France DOIT publier ces informations).
 *
 * ÉTAT AU 09/08/2026 : plus aucun champ à compléter. Identité (capital, siège,
 * RCS/SIREN, TVA), directeur de la publication, hébergeur et canal de contact
 * sont renseignés et VÉRIFIÉS. Reste la relecture par un juriste.
 *
 * ⚠️ Le composant `Todo` est CONSERVÉ volontairement : il rend visible, en
 * chartreuse, tout champ qu'une future section laisserait vide. Le retirer
 * rendrait un oubli silencieux — c'est le seul garde-fou de cette page.
 *
 * Charte : dark-first, réutilise le module CSS légal partagé.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CONTACT_EMAIL, POSTAL_CONTACT } from '../../lib/legal';
import { SiteFooter, SiteHeader } from '../../components/ui';
import { LEGAL_SEO } from '../../lib/legalSeo2026';
import { SITE_ORIGIN } from '../../lib/site2026';
import styles from '../confidentialite/legal.module.css';

const LAST_UPDATED = '26 juillet 2026';

/**
 * Le titre d'onglet et la ligne de résumé viennent de `lib/legalSeo2026.ts`, et
 * pas du document : ce ne sont pas des clauses, ce sont les deux textes qu'un
 * moteur affiche À LA PLACE de la page. Sortis d'ici, ils tombent sous le
 * verrou de la copie du site comme les huit autres pages (pas de tiret long,
 * « Gryd » en prose, titre et description dans les plafonds d'affichage).
 */
export const metadata: Metadata = {
  title: LEGAL_SEO.mentionsLegales.title,
  description: LEGAL_SEO.mentionsLegales.description,
  alternates: { canonical: `${SITE_ORIGIN}${LEGAL_SEO.mentionsLegales.path}` },
};

/** Emplacement à compléter — visible, impossible à oublier avant publication. */
function Todo({ children }: { children: ReactNode }) {
  return (
    <b
      style={{
        // Le chartreuse passe par le JETON, jamais par un hex tapé (ADR-008) :
        // celui qui était écrit ici (#C2FF23) n'était même plus la couleur de la
        // charte (#B4FF0D). Un champ à compléter doit se voir ; il n'a pas à
        // inventer une seconde marque au passage.
        background: 'var(--gryd-accent-soft)',
        color: 'var(--gryd-accent)',
        padding: '1px 6px',
        borderRadius: '4px',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      [à compléter : {children}]
    </b>
  );
}

const TOC = [
  { id: 'editeur', label: 'Éditeur' },
  { id: 'publication', label: 'Directeur de la publication' },
  { id: 'hebergement', label: 'Hébergement' },
  { id: 'propriete', label: 'Propriété intellectuelle' },
  { id: 'donnees', label: 'Données personnelles' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'contact', label: 'Contact' },
] as const;

export default function MentionsLegalesPage() {
  return (
    <>
      <SiteHeader />

      <main id="contenu" className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.kicker}>Mentions légales</p>
          <h1 className={styles.heroTitle}>Mentions légales</h1>
          <p className={styles.heroSub}>
            Informations légales relatives à l&rsquo;éditeur et à l&rsquo;hébergement de
            l&rsquo;application mobile GRYD et du site public GRYD, conformément à
            l&rsquo;article 6-III de la loi n°&nbsp;2004-575 du 21&nbsp;juin 2004 pour la
            confiance dans l&rsquo;économie numérique (LCEN).
          </p>
          <div className={styles.dateRow}>
            <span>
              Dernière mise à jour : <b>{LAST_UPDATED}</b>
            </span>
          </div>

          <div className={styles.pledge}>
            <p className={styles.pledgeTitle}>À finaliser avant publication</p>
            <p className={styles.pledgeBody}>
              L&rsquo;identité de la société, l&rsquo;hébergeur et le canal de contact sont
              renseignés (09/08/2026). Reste la relecture par un professionnel du droit.
            </p>
          </div>
        </header>

        <nav aria-label="Sommaire">
          <ol className={styles.toc}>
            {TOC.map((entry, i) => (
              <li key={entry.id}>
                <a className={styles.tocLink} href={`#${entry.id}`}>
                  <span className={styles.tocNum}>{String(i + 1).padStart(2, '0')}</span>
                  {entry.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="editeur" className={styles.section}>
          <p className={styles.sectionNum}>01</p>
          <h2 className={styles.sectionTitle}>Éditeur du site et de l&rsquo;application</h2>
          <p className={styles.body}>
            L&rsquo;application GRYD et le site public GRYD sont édités par&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Dénomination sociale&nbsp;:</b> SASU Nexus 1993
            </li>
            <li className={styles.item}>
              <b>Forme juridique&nbsp;:</b> société par actions simplifiée unipersonnelle (SASU)
            </li>
            <li className={styles.item}>
              <b>Capital social&nbsp;:</b> 500&nbsp;€
            </li>
            <li className={styles.item}>
              <b>Siège social&nbsp;:</b> 66 avenue des Champs-Élysées, 75008 Paris
            </li>
            <li className={styles.item}>
              <b>RCS&nbsp;:</b> Paris (immatriculée le 27/12/2023) — <b>SIREN&nbsp;:</b> 982&nbsp;786&nbsp;154
              {' '}— <b>SIRET (siège)&nbsp;:</b> 982&nbsp;786&nbsp;154&nbsp;00012
            </li>
            <li className={styles.item}>
              <b>N° TVA intracommunautaire&nbsp;:</b> FR18982786154
            </li>
            {/* Guideline 1.2 (« published contact information ») : le canal publié
                doit EXISTER. `support@gryd.run` pointait sur un domaine non acquis
                (O10) — un mailto mort n'est pas un contact. Voir lib/legal.ts. */}
            <li className={styles.item}>
              <b>Contact&nbsp;:</b> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, ou par
              courrier, {POSTAL_CONTACT}
            </li>
          </ul>
        </section>

        <section id="publication" className={styles.section}>
          <p className={styles.sectionNum}>02</p>
          <h2 className={styles.sectionTitle}>Directeur de la publication</h2>
          <p className={styles.body}>
            Le directeur de la publication est <b>Benjamin Bel</b>, en sa qualité de
            président de la SASU Nexus 1993.
          </p>
        </section>

        <section id="hebergement" className={styles.section}>
          <p className={styles.sectionNum}>03</p>
          <h2 className={styles.sectionTitle}>Hébergement</h2>
          {/* ⚠️ « Le site gryd.run » était FAUX : le domaine `gryd.run` n'a
              AUCUN enregistrement A ni `www` — vérifié au DNS le 09/08/2026. Il
              ne sert aucun site, il reçoit seulement du courrier. Le site public
              est servi par GitHub Pages, et c'est LUI que la LCEN oblige à
              déclarer. Nommer une adresse qui ne sert rien, c'est le même défaut
              que la boîte e-mail inexistante corrigée dans `lib/legal.ts`. */}
          <p className={styles.body}>
            Le site public de GRYD est hébergé par <b>GitHub, Inc.</b> (service GitHub&nbsp;Pages),
            88&nbsp;Colin&nbsp;P.&nbsp;Kelly&nbsp;Jr.&nbsp;Street, San&nbsp;Francisco, CA&nbsp;94107,
            États-Unis. GitHub ne publie pas de numéro de téléphone d&rsquo;assistance&nbsp;; son
            canal de contact est <a href="https://support.github.com">support.github.com</a>.
          </p>
          <p className={styles.body}>
            Les données applicatives (comptes, courses, territoire) sont hébergées via
            l&rsquo;infrastructure de <b>Supabase</b> (Supabase, Inc.), sur des serveurs situés
            dans l&rsquo;Union européenne. L&rsquo;application mobile est distribuée via
            l&rsquo;App&nbsp;Store (Apple) et, le cas échéant, Google&nbsp;Play (Google).
          </p>
        </section>

        <section id="propriete" className={styles.section}>
          <p className={styles.sectionNum}>04</p>
          <h2 className={styles.sectionTitle}>Propriété intellectuelle</h2>
          <p className={styles.body}>
            La marque GRYD, le nom, le logo, la charte graphique, les textes, visuels,
            interfaces et le code de l&rsquo;application et du site sont la propriété
            exclusive de la SASU Nexus 1993, sauf mentions contraires. Toute reproduction,
            représentation ou exploitation, totale ou partielle, sans autorisation écrite
            préalable, est interdite et constitue une contrefaçon.
          </p>
          <p className={styles.note}>
            «&nbsp;GRYD&nbsp;» est un nom d&rsquo;usage produit&nbsp;; sa disponibilité à
            titre de marque doit être vérifiée (recherche d&rsquo;antériorité INPI) avant
            tout usage public.
          </p>
        </section>

        <section id="donnees" className={styles.section}>
          <p className={styles.sectionNum}>05</p>
          <h2 className={styles.sectionTitle}>Données personnelles</h2>
          <p className={styles.body}>
            Le traitement de tes données personnelles est décrit dans notre{' '}
            <Link href="/confidentialite">politique de confidentialité</Link>, conforme au RGPD et à
            la loi Informatique et Libertés. Le responsable de traitement est la SASU
            Nexus&nbsp;1993, joignable par courrier à l&rsquo;adresse du siège
            ci-dessus.
          </p>
        </section>

        <section id="cookies" className={styles.section}>
          <p className={styles.sectionNum}>06</p>
          <h2 className={styles.sectionTitle}>Cookies &amp; traceurs</h2>
          <p className={styles.body}>
            Le site n&rsquo;utilise que les cookies strictement nécessaires à son
            fonctionnement et, le cas échéant, une mesure d&rsquo;audience. Tout traceur non
            essentiel n&rsquo;est déposé qu&rsquo;après ton consentement, recueilli via le
            bandeau prévu à cet effet, conformément aux recommandations de la CNIL. Le détail
            figure dans la <Link href="/confidentialite">politique de confidentialité</Link>.
          </p>
        </section>

        <section id="contact" className={styles.section}>
          <p className={styles.sectionNum}>07</p>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <p className={styles.body}>
            Pour toute question, une réclamation ou l&rsquo;exercice de tes droits,
            écris-nous à <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, ou par
            courrier&nbsp;: <b>{POSTAL_CONTACT}</b>. L&rsquo;export et la
            suppression de tes données, eux, s&rsquo;exercent directement dans
            l&rsquo;application (Réglages, puis Confidentialité).
          </p>
        </section>

      </main>

      <SiteFooter />
    </>
  );
}
