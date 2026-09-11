/**
 * GRYD — Conditions Générales de Vente (CGV). OBLIGATOIRE dès lors qu'un service
 * payant est vendu à des consommateurs (abonnement GRYD+, collections
 * permanentes) — art. L111-1 et s. du Code de la consommation. Distinct
 * des CGU (/conditions) : les CGV régissent la VENTE (prix, paiement,
 * rétractation, reconduction, médiation).
 *
 * ⚠️ DOCUMENT CONTRACTUEL, lié depuis le footer public : c'est ici que la règle
 * « une doc ne promet jamais au-delà du code » est la PLUS stricte.
 *
 * AMENDEMENT-40 §2 / AMENDEMENT-45 §2 — RETIRÉS de la liste des produits vendus :
 *   · les « boucliers de quartier » — une PROTECTION ne se vend dans aucune
 *     monnaie (invariant gelé côté serveur par la contrainte SQL
 *     items_functional_never_priced_check, migration 0065) ;
 *   · les « packs d'Éclats » — la monnaie ne doit pas servir de détour vers un
 *     objet fonctionnel, et aucun pack n'est achetable aujourd'hui ;
 *   · le « Season Pass » — catalogué INACTIF (status draft, aucun SKU actif) :
 *     vendre nommément un produit sans SKU était une promesse contractuelle
 *     au-delà du code.
 *
 * AMENDEMENT-47 — ÉTAT RÉEL (23/07/2026) : AUCUNE offre n'est en vente. Aucun
 * checkout n'est branché sur le site, aucun client d'achats intégrés n'existe
 * dans l'application, le contrat de distribution Apple n'est pas signé. Ces CGV
 * décrivent le cadre qui s'appliquera à la première vente — le §03 le dit.
 *
 * ⚠️ TEMPLATE À COMPLÉTER + À FAIRE RELIRE PAR UN JURISTE. Champs <Todo> = données
 * réelles de la SASU Nexus 1993 + médiateur de la consommation (obligatoire B2C).
 * Points sensibles signalés : renonciation au droit de rétractation (contenu
 * numérique), reconduction tacite (loi Chatel), traitement des achats in-app Apple.
 *
 * Charte : dark-first, réutilise le module CSS légal partagé.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CONTACT_EMAIL, POSTAL_CONTACT } from '../../lib/legal';
import { SiteFooter, SiteHeader } from '../../components/ui';
import styles from '../confidentialite/legal.module.css';

// Révision du 23 juillet 2026 — AMENDEMENT-40 §2 / AMENDEMENT-45 §2 : retrait des boucliers, packs d'Éclats et Season Pass de la liste des produits vendus.
// Aucune vente n'ayant eu lieu, aucune version antérieure ne lie personne :
// le texte révisé est celui en vigueur.
//
// Révision du 10 septembre 2026 — le cahier de septembre (rang 0, ADR-012) a
// tranché l'offre : elle s'appelle GRYD+, les produits uniques sont les trois
// collections permanentes, il n'y a NI monnaie virtuelle (« Pas de monnaie
// virtuelle au lancement », §7.5 ; COMMERCIAL_PROPOSAL_2026.virtualCurrency =
// false) NI offre à vie (§16.1). Le bouclier, le gel de série et le scout ne
// sont plus seulement invendables : §5.3 les a SUPPRIMÉS du jeu, et les nommer
// même pour dire qu'on ne les vend pas décrivait un jeu qui n'existe plus.
// ⚠️ Ce document est le MÊME contrat que les CGV embarquées dans l'application
// (apps/mobile/src/i18n/catalog/legal.ts) : les laisser diverger permettrait à
// un lecteur d'opposer la version qui l'arrange. Toute correction ici se fait
// des deux côtés, dans le même commit.
const LAST_UPDATED = '10 septembre 2026';
const EFFECTIVE = '10 septembre 2026';

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente — GRYD',
  description:
    'CGV de GRYD : abonnement GRYD+ et collections permanentes — prix, paiement, droit de rétractation, reconduction, résiliation, médiation de la consommation.',
};

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
    <>
      <SiteHeader />

      <main id="contenu" className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.kicker}>Conditions Générales de Vente</p>
          <h1 className={styles.heroTitle}>Conditions Générales de Vente</h1>
          <p className={styles.heroSub}>
            Ces CGV régissent la vente des offres payantes de GRYD (abonnement GRYD+ et
            collections permanentes) aux consommateurs. Elles complètent les{' '}
            <Link href="/conditions">conditions d&rsquo;utilisation</Link> (usage du jeu) et la{' '}
            <Link href="/confidentialite">politique de confidentialité</Link>. Le jeu, le
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
            <p className={styles.pledgeTitle}>Aucune offre n&rsquo;est en vente à ce jour</p>
            <p className={styles.pledgeBody}>
              À la date ci-dessus, <b>aucune offre payante de GRYD n&rsquo;est commercialisée</b> :
              aucun paiement n&rsquo;est encaissable, ni sur ce site, ni dans l&rsquo;application.
              Ces CGV décrivent le cadre applicable à la première vente. L&rsquo;identité du
              vendeur est renseignée&nbsp;; reste à désigner le champ surligné (médiateur de la
              consommation, dont l&rsquo;adhésion est obligatoire) et à faire relire
              l&rsquo;ensemble par un juriste avant toute mise en vente.
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
              <b>Vendeur&nbsp;:</b> SASU Nexus 1993, au capital de 500&nbsp;€, siège social
              66 avenue des Champs-Élysées, 75008 Paris, immatriculée au RCS de Paris sous le
              n°&nbsp;982&nbsp;786&nbsp;154, TVA intracommunautaire FR18982786154.
            </li>
            {/* Le canal publié doit EXISTER : `support@gryd.run` était un mailto vers
                un domaine non acquis (O10). Voir lib/legal.ts. */}
            <li className={styles.item}>
              <b>Contact&nbsp;:</b> <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, ou par
              courrier, {POSTAL_CONTACT}
            </li>
          </ul>
          <p className={styles.note}>
            Le détail complet de l&rsquo;éditeur figure dans les{' '}
            <Link href="/mentions-legales">mentions légales</Link>.
          </p>
        </section>

        <section id="offres" className={styles.section}>
          <p className={styles.sectionNum}>03</p>
          <h2 className={styles.sectionTitle}>Offres &amp; prix</h2>
          <p className={styles.body}>
            GRYD est jouable gratuitement dans son intégralité. Les offres payantes portent
            uniquement sur des <b>outils d&rsquo;analyse privée, de composition et des objets
            visuels</b>&nbsp;: elles ne donnent ni territoire, ni points, ni victoire.
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Abonnement (unique)</b>&nbsp;: <b>GRYD+</b>, mensuel ou annuel. Il ouvre des{' '}
              <b>analyses privées avancées</b> (comparer deux sorties ou deux périodes), les{' '}
              <b>outils de composition Studio</b> et des <b>variantes artistiques de saison</b>.
              Il ne comprend <b>aucun avantage de jeu</b>&nbsp;: ni capture supplémentaire, ni
              protection, ni information tactique, ni accélérateur d&rsquo;XP ou de points de
              défi, et n&rsquo;augmente aucun plafond&nbsp;: les limites d&rsquo;usage sont
              identiques pour un abonné et un joueur gratuit.
            </li>
            <li className={styles.item}>
              <b>Achats uniques</b>&nbsp;: les <b>collections permanentes</b>. Elles ne
              contiennent que des <b>objets visuels et de statut</b>, restent acquises
              définitivement et ne sont <b>pas incluses dans GRYD+</b>.{' '}
              <b>Aucune monnaie virtuelle n&rsquo;est vendue</b> et <b>aucune offre à vie</b>{' '}
              n&rsquo;est proposée.
            </li>
          </ul>
          <p className={styles.body}>
            <b>Ne sont vendus dans aucune monnaie</b>&nbsp;: ni en euros, ni dans un pack, ni
            dans l&rsquo;abonnement, <b>tout ce qui décide le jeu</b>. La capture d&rsquo;un
            terrain, sa reprise, l&rsquo;XP, les points de défi et le classement sont{' '}
            <b>strictement identiques</b> pour un abonné et pour un joueur gratuit. Aucun
            paiement ne les modifie, directement ou indirectement.
          </p>
          <p className={styles.body}>
            <b>À la date d&rsquo;entrée en vigueur ci-dessus, aucune de ces offres n&rsquo;est
            commercialisée.</b> Aucun paiement n&rsquo;est encaissable sur le site ni dans
            l&rsquo;application. Les tarifs annoncés sur les pages d&rsquo;offres sont
            indicatifs tant qu&rsquo;aucune vente n&rsquo;est ouverte&nbsp;; ils ne constituent
            ni une offre ferme, ni un engagement de mise en vente à une date donnée.
          </p>
          <p className={styles.body}>
            Le détail des offres et leurs <b>tarifs TTC en vigueur</b> (en euros, toutes taxes
            comprises) sont présentés sur les pages d&rsquo;offres (site gryd.run et
            application) et rappelés avant la validation de la commande&nbsp;: le prix
            applicable est celui affiché à ce moment-là. Le vendeur se réserve le droit de
            modifier ses prix. Sur l&rsquo;App&nbsp;Store et Google&nbsp;Play, les prix suivent
            les paliers tarifaires de la plateforme.
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
              paiement sécurisé Stripe (Stripe Payments Europe). Nexus 1993 n&rsquo;a jamais
              accès aux données de ta carte.
            </li>
          </ul>
          <p className={styles.body}>
            La commande est confirmée par un e-mail récapitulatif. L&rsquo;accès aux avantages{' '}
            <b>s&rsquo;ouvre lorsque le droit correspondant a été confirmé</b>, et pas avant. Un
            achat en attente de validation (demande adressée à un parent, authentification
            bancaire renforcée) n&rsquo;ouvre aucun droit tant qu&rsquo;il n&rsquo;est pas
            confirmé, et rien n&rsquo;est facturé s&rsquo;il ne l&rsquo;est jamais.
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
            L&rsquo;abonnement GRYD+ est souscrit pour la période choisie (mensuelle ou
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
            contraire). Les collections permanentes sont des achats uniques, non reconductibles.
          </p>
          <p className={styles.body}>
            Une résiliation, un remboursement ou un arrêt de paiement <b>n&rsquo;efface jamais
            un terrain, une progression ni un objet déjà obtenu</b>&nbsp;: ils ne dépendent pas
            de l&rsquo;abonnement. Seuls les outils d&rsquo;analyse avancée et de composition
            se ferment à la fin de la période payée.
          </p>
          <p className={styles.note}>
            Pour un abonnement souscrit via l&rsquo;App&nbsp;Store ou Google&nbsp;Play, la
            gestion et la résiliation s&rsquo;effectuent depuis les réglages de ton compte
            Apple ou Google. <b>Supprimer ton compte GRYD ne résilie pas la facturation de la
            plateforme</b>&nbsp;: ce sont deux gestes distincts.
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
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> ou par courrier à{' '}
            <b>{POSTAL_CONTACT}</b>. En cas de litige non résolu,
            tu peux recourir gratuitement à un médiateur de la consommation (art. L612-1 du Code
            de la consommation)&nbsp;:
          </p>
          <ul className={styles.list}>
            {/* ⚠️ NE PAS REMPLIR CES DEUX CHAMPS AVANT L'ADHÉSION EFFECTIVE.
                Nommer un médiateur auquel l'entité n'adhère pas serait pire que
                le champ vide : le consommateur qui le saisirait serait éconduit,
                et la CECMC ne reconnaît que les adhésions réelles.
                L'obligation, elle, EST due : l'art. L612-1 s'applique « à tous
                les professionnels qui contractent avec des consommateurs,
                INDÉPENDAMMENT de la présence ou non d'une vente » — donc une app
                gratuite assortie de CGU est concernée. Vérifié le 09/08/2026.
                Marche à suivre : souscrire auprès d'un médiateur référencé CECMC
                (liste officielle : economie.gouv.fr/mediation-conso), puis
                remplacer ces deux `Todo` par le nom et l'adresse reçus. */}
            <li className={styles.item}>
              <b>Médiateur&nbsp;:</b> <Todo>nom du médiateur référencé CECMC auprès duquel Nexus 1993 a souscrit</Todo>
            </li>
            <li className={styles.item}>
              <b>Coordonnées / site&nbsp;:</b> <Todo>adresse postale et site du médiateur</Todo>
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
            <Link href="/confidentialite">politique de confidentialité</Link> (RGPD).
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

      </main>

      <SiteFooter />
    </>
  );
}
