/**
 * GRYD — Conditions Générales de Vente (CGV). OBLIGATOIRE dès lors qu'un service
 * payant est vendu à des consommateurs (GRYD Premium, Founder Pack) — art. L111-1
 * et s. du Code de la consommation. Distinct des CGU (/conditions) : les CGV
 * régissent la VENTE (prix, paiement, rétractation, reconduction, médiation).
 *
 * ⚠️ TEMPLATE À COMPLÉTER + À FAIRE RELIRE PAR UN JURISTE. Champs <Todo> = données
 * réelles de la SASU Nexus 1993 + médiateur de la consommation (obligatoire B2C).
 * Points sensibles signalés : renonciation au droit de rétractation (contenu
 * numérique), reconduction tacite (loi Chatel), traitement des achats in-app Apple.
 *
 * Charte : dark-first, réutilise le module CSS légal partagé.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Icon } from '../components/ui/Icon';
import styles from '../confidentialite/legal.module.css';

const LAST_UPDATED = '6 juillet 2026';
const EFFECTIVE = '6 juillet 2026';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente — GRYD',
  description:
    'CGV de GRYD : abonnement GRYD Premium et Founder Pack — prix, paiement, droit de rétractation, reconduction, résiliation, médiation de la consommation.',
};

function Todo({ children }: { children: ReactNode }) {
  return (
    <b
      style={{
        background: 'rgba(180,255,13,.14)',
        color: '#B4FF0D',
        padding: '1px 6px',
        borderRadius: '4px',
        fontWeight: 700,
      }}
    >
      [à compléter : {children}]
    </b>
  );
}

const TOC = [
  { id: 'objet', label: 'Objet & champ d’application' },
  { id: 'vendeur', label: 'Vendeur' },
  { id: 'offres', label: 'Offres & prix' },
  { id: 'commande', label: 'Commande & paiement' },
  { id: 'retractation', label: 'Droit de rétractation' },
  { id: 'duree', label: 'Durée, reconduction & résiliation' },
  { id: 'garanties', label: 'Garanties légales' },
  { id: 'mediation', label: 'Réclamations & médiation' },
  { id: 'donnees', label: 'Données personnelles' },
  { id: 'droit', label: 'Droit applicable' },
] as const;

export default function CgvPage() {
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
          <p className={styles.kicker}>Conditions Générales de Vente</p>
          <h1 className={styles.heroTitle}>Conditions Générales de Vente</h1>
          <p className={styles.heroSub}>
            Ces CGV régissent la vente des offres payantes de GRYD (GRYD Premium et Founder
            Pack) aux consommateurs. Elles complètent les{' '}
            <a href="/conditions">conditions d&rsquo;utilisation</a> (usage du jeu) et la{' '}
            <a href="/confidentialite">politique de confidentialité</a>. Le jeu, le
            territoire et la progression restent entièrement gratuits&nbsp;: aucune offre
            payante ne procure d&rsquo;avantage de jeu.
          </p>
          <div className={styles.dateRow}>
            <span>
              Dernière mise à jour : <b>{LAST_UPDATED}</b>
            </span>
            <span>
              En vigueur le : <b>{EFFECTIVE}</b>
            </span>
          </div>

          <div className={styles.pledge}>
            <p className={styles.pledgeTitle}>À finaliser avant publication</p>
            <p className={styles.pledgeBody}>
              Les champs surlignés (identité du vendeur, médiateur de la consommation, prix
              définitifs) doivent être complétés et l&rsquo;ensemble relu par un juriste
              avant toute mise en vente.
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

        <section id="objet" className={styles.section}>
          <p className={styles.sectionNum}>01</p>
          <h2 className={styles.sectionTitle}>Objet &amp; champ d&rsquo;application</h2>
          <p className={styles.body}>
            Les présentes CGV s&rsquo;appliquent à toute souscription d&rsquo;une offre payante
            GRYD par un consommateur (personne physique agissant à des fins non
            professionnelles). Toute souscription implique leur acceptation pleine et entière.
            Elles priment sur tout autre document, sous réserve des règles impératives
            applicables aux plateformes de distribution (Apple, Google).
          </p>
        </section>

        <section id="vendeur" className={styles.section}>
          <p className={styles.sectionNum}>02</p>
          <h2 className={styles.sectionTitle}>Vendeur</h2>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Vendeur&nbsp;:</b> SASU Nexus 1993, <Todo>capital</Todo>,{' '}
              <Todo>siège social</Todo>, RCS <Todo>ville</Todo>, SIREN{' '}
              <Todo>numéro</Todo>.
            </li>
            <li className={styles.item}>
              <b>Contact&nbsp;:</b> <a href="mailto:support@gryd.run">support@gryd.run</a>
            </li>
          </ul>
          <p className={styles.note}>
            Le détail complet de l&rsquo;éditeur figure dans les{' '}
            <a href="/mentions-legales">mentions légales</a>.
          </p>
        </section>

        <section id="offres" className={styles.section}>
          <p className={styles.sectionNum}>03</p>
          <h2 className={styles.sectionTitle}>Offres &amp; prix</h2>
          <p className={styles.body}>
            GRYD est jouable gratuitement dans son intégralité. Les offres payantes portent
            uniquement sur des éléments de <b>confort et de statut</b> (cosmétiques, templates
            de partage, badge de soutien)&nbsp;: elles ne donnent ni territoire, ni points, ni
            victoire.
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>GRYD Premium&nbsp;:</b> <Todo>prix mensuel TTC</Todo>/mois ou{' '}
              <Todo>prix annuel TTC</Todo>/an.
            </li>
            <li className={styles.item}>
              <b>Founder Pack&nbsp;:</b> <Todo>prix TTC</Todo> — paiement unique, édition
              limitée.
            </li>
          </ul>
          <p className={styles.body}>
            Les prix sont indiqués en euros, toutes taxes comprises (TTC). Le vendeur se
            réserve le droit de modifier ses prix&nbsp;; le prix applicable est celui affiché
            au moment de la commande. Sur l&rsquo;App&nbsp;Store et Google&nbsp;Play, les prix
            peuvent être ajustés selon les paliers tarifaires de la plateforme.
          </p>
        </section>

        <section id="commande" className={styles.section}>
          <p className={styles.sectionNum}>04</p>
          <h2 className={styles.sectionTitle}>Commande &amp; paiement</h2>
          <p className={styles.body}>
            La souscription s&rsquo;effectue&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Dans l&rsquo;application&nbsp;:</b> via les achats intégrés Apple (App&nbsp;Store)
              ou Google (Google&nbsp;Play). Le paiement, la facturation, le renouvellement et
              les remboursements sont alors gérés <b>par la plateforme</b> et soumis à ses
              propres conditions&nbsp;; les demandes de remboursement se font directement
              auprès d&rsquo;Apple ou Google.
            </li>
            <li className={styles.item}>
              <b>Sur le site gryd.run&nbsp;:</b> par carte bancaire via notre prestataire de
              paiement sécurisé <Todo>prestataire (ex. Stripe)</Todo>. Nexus 1993
              n&rsquo;a jamais accès aux données de ta carte.
            </li>
          </ul>
          <p className={styles.body}>
            La commande est confirmée par un e-mail récapitulatif. L&rsquo;accès aux avantages
            est activé immédiatement après le paiement.
          </p>
        </section>

        <section id="retractation" className={styles.section}>
          <p className={styles.sectionNum}>05</p>
          <h2 className={styles.sectionTitle}>Droit de rétractation</h2>
          <p className={styles.body}>
            Conformément aux articles L221-18 et suivants du Code de la consommation, tu
            disposes d&rsquo;un délai de <b>14 jours</b> pour te rétracter, sans motif.
          </p>
          <p className={styles.body}>
            Toutefois, l&rsquo;abonnement donne accès à un <b>contenu numérique fourni
            immédiatement</b>. En activant ton accès avant la fin du délai de 14 jours, tu
            demandes expressément l&rsquo;exécution immédiate du service et{' '}
            <b>reconnais renoncer à ton droit de rétractation</b> une fois le service
            pleinement exécuté (art. L221-28, 13° du Code de la consommation). Cette
            renonciation t&rsquo;est demandée explicitement au moment de la souscription.
          </p>
          <p className={styles.note}>
            Pour les achats réalisés via l&rsquo;App&nbsp;Store ou Google&nbsp;Play, les
            conditions et remboursements de la plateforme s&rsquo;appliquent en complément.
          </p>
        </section>

        <section id="duree" className={styles.section}>
          <p className={styles.sectionNum}>06</p>
          <h2 className={styles.sectionTitle}>Durée, reconduction &amp; résiliation</h2>
          <p className={styles.body}>
            L&rsquo;abonnement GRYD Premium est souscrit pour la période choisie (mensuelle ou
            annuelle) et se renouvelle par tacite reconduction pour des périodes identiques,
            sauf résiliation.
          </p>
          <p className={styles.body}>
            Pour les abonnements souscrits sur le site, conformément à l&rsquo;article L215-1
            du Code de la consommation, tu es informé par écrit, au plus tôt trois mois et au
            plus tard un mois avant la date de reconduction, de la possibilité de ne pas
            reconduire. Tu peux résilier à tout moment, y compris en ligne, la résiliation
            prenant effet à la fin de la période en cours&nbsp;; les avantages restent actifs
            jusque-là et aucune période entamée n&rsquo;est remboursée (sauf disposition légale
            contraire). Le Founder Pack est un achat unique, non reconductible.
          </p>
          <p className={styles.note}>
            Pour un abonnement souscrit via l&rsquo;App&nbsp;Store ou Google&nbsp;Play, la
            gestion et la résiliation s&rsquo;effectuent depuis les réglages de ton compte
            Apple ou Google.
          </p>
        </section>

        <section id="garanties" className={styles.section}>
          <p className={styles.sectionNum}>07</p>
          <h2 className={styles.sectionTitle}>Garanties légales</h2>
          <p className={styles.body}>
            Tu bénéficies de la garantie légale de conformité (art. L217-1 et s. du Code de la
            consommation) et de la garantie contre les vices cachés (art. 1641 et s. du Code
            civil), indépendamment de toute garantie commerciale. Pour un service numérique non
            conforme, tu peux en exiger la mise en conformité ou, à défaut, une réduction du
            prix ou la résolution du contrat.
          </p>
        </section>

        <section id="mediation" className={styles.section}>
          <p className={styles.sectionNum}>08</p>
          <h2 className={styles.sectionTitle}>Réclamations &amp; médiation de la consommation</h2>
          <p className={styles.body}>
            Toute réclamation peut être adressée à{' '}
            <a href="mailto:support@gryd.run">support@gryd.run</a>. En cas de litige non résolu,
            tu peux recourir gratuitement à un médiateur de la consommation (art. L612-1 du Code
            de la consommation)&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Médiateur&nbsp;:</b> <Todo>nom du médiateur agréé auprès duquel Nexus 1993 adhère</Todo>
            </li>
            <li className={styles.item}>
              <b>Coordonnées / site&nbsp;:</b> <Todo>adresse et site du médiateur</Todo>
            </li>
          </ul>
          <p className={styles.body}>
            Tu peux également utiliser la plateforme européenne de règlement en ligne des
            litiges&nbsp;:{' '}
            <a href="https://ec.europa.eu/consumers/odr" rel="noreferrer noopener" target="_blank">
              ec.europa.eu/consumers/odr
            </a>
            .
          </p>
        </section>

        <section id="donnees" className={styles.section}>
          <p className={styles.sectionNum}>09</p>
          <h2 className={styles.sectionTitle}>Données personnelles</h2>
          <p className={styles.body}>
            Les données collectées lors d&rsquo;une commande sont traitées conformément à notre{' '}
            <a href="/confidentialite">politique de confidentialité</a> (RGPD).
          </p>
        </section>

        <section id="droit" className={styles.section}>
          <p className={styles.sectionNum}>10</p>
          <h2 className={styles.sectionTitle}>Droit applicable &amp; litiges</h2>
          <p className={styles.body}>
            Les présentes CGV sont soumises au droit français. En cas de litige, une solution
            amiable sera recherchée en priorité&nbsp;; à défaut, les tribunaux français sont
            compétents, dans le respect des règles protectrices du consommateur.
          </p>
        </section>

        <div className={styles.legalFoot}>
          <a href="/confidentialite">Confidentialité</a>
          <a href="/conditions">Conditions</a>
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/">Retour à l&rsquo;accueil</a>
          <span>SASU Nexus 1993</span>
        </div>
      </main>
    </div>
  );
}
