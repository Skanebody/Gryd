/**
 * GRYD — Mentions légales (obligation LCEN, loi 2004-575 art. 6-III : tout
 * éditeur d'un service en ligne en France DOIT publier ces informations).
 *
 * ⚠️ TEMPLATE À COMPLÉTER : les champs <Todo> attendent les données légales
 * RÉELLES de la SASU Nexus 1993 (capital, siège, RCS/SIREN, TVA, directeur de la
 * publication, hébergeur du site). Voir GRYD_LEGAL_A_COMPLETER.md. Ne pas publier
 * tant que les <Todo> ne sont pas remplacés — et faire relire par un juriste.
 *
 * Charte : dark-first, réutilise le module CSS légal partagé.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Icon } from '../components/ui/Icon';
import styles from '../confidentialite/legal.module.css';

const LAST_UPDATED = '6 juillet 2026';

export const metadata: Metadata = {
  title: 'Mentions légales — GRYD',
  description:
    'Mentions légales de GRYD : éditeur (SASU Nexus 1993), directeur de la publication, hébergement, propriété intellectuelle, contact.',
};

/** Emplacement à compléter — visible, impossible à oublier avant publication. */
function Todo({ children }: { children: ReactNode }) {
  return (
    <b
      style={{
        background: 'rgba(180,255,13,.14)',
        color: '#B4FF0D',
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
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.topbar}>
          <a href="/" className={styles.brand} aria-label="Retour à l'accueil GRYD">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <polygon points="12,1.5 21,6.75 21,17.25 12,22.5 3,17.25 3,6.75" fill="var(--ch)" />
            </svg>
            <span>GRYD</span>
          </a>
          <a href="/" className={styles.back}>
            <Icon name="chevron" size={14} />
            Retour
          </a>
        </div>

        <header className={styles.hero}>
          <p className={styles.kicker}>Mentions légales</p>
          <h1 className={styles.heroTitle}>Mentions légales</h1>
          <p className={styles.heroSub}>
            Informations légales relatives à l&rsquo;éditeur et à l&rsquo;hébergement de
            l&rsquo;application mobile GRYD et du site gryd.run, conformément à
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
              L&rsquo;identité de la société est renseignée. Reste à compléter le champ
              surligné (hébergeur du site, selon l&rsquo;hébergement retenu) et à faire relire
              l&rsquo;ensemble par un professionnel du droit.
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
            L&rsquo;application GRYD et le site gryd.run sont édités par&nbsp;:
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
            <li className={styles.item}>
              <b>Contact&nbsp;:</b> <a href="mailto:support@gryd.run">support@gryd.run</a>
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
          <p className={styles.body}>
            Le site gryd.run est hébergé par <Todo>hébergeur du site web — nom, raison sociale</Todo>,{' '}
            <Todo>adresse de l&rsquo;hébergeur</Todo>, <Todo>téléphone de l&rsquo;hébergeur</Todo>.
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
            <a href="/confidentialite">politique de confidentialité</a>, conforme au RGPD et à
            la loi Informatique et Libertés. Le responsable de traitement est la SASU
            Nexus&nbsp;1993 (<a href="mailto:privacy@gryd.run">privacy@gryd.run</a>).
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
            figure dans la <a href="/confidentialite">politique de confidentialité</a>.
          </p>
        </section>

        <section id="contact" className={styles.section}>
          <p className={styles.sectionNum}>07</p>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <p className={styles.body}>
            Pour toute question, écris à <a href="mailto:support@gryd.run">support@gryd.run</a>{' '}
            (questions générales) ou <a href="mailto:privacy@gryd.run">privacy@gryd.run</a>{' '}
            (données personnelles).
          </p>
        </section>

        <div className={styles.legalFoot}>
          <a href="/confidentialite">Confidentialité</a>
          <a href="/conditions">Conditions</a>
          <a href="/cgv">CGV</a>
          <a href="/">Retour à l&rsquo;accueil</a>
          <span>SASU Nexus 1993</span>
        </div>
      </main>
    </div>
  );
}
