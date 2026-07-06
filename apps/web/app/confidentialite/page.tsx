/**
 * GRYD — Politique de confidentialité (AMENDEMENT-33 §6).
 *
 * URL publique requise par App Store Connect (App Privacy) + entitlement
 * HealthKit (Apple exige une politique accessible qui décrit l'usage santé).
 * Contenu RÉEL et spécifique à GRYD (RGPD français) — jamais de lorem :
 *   · données collectées (localisation pendant les courses, mouvement/podomètre,
 *     santé importée optionnelle, compte/email, contenu crew) ;
 *   · finalités (jeu de conquête de territoire) + base légale ;
 *   · conservation, droits (accès / suppression / export / opposition) ;
 *   · promesse « ta position n'est jamais publique, jamais suivie hors course » ;
 *   · partage (aucune vente), sous-traitants, contact, mineurs.
 *
 * Charte ADDENDUM-DESIGN §C : dark-first, noir/blanc/chartreuse #B4FF0D,
 * JAMAIS de chartreuse sur fond clair. §A : lecture linéaire, textes non
 * tronqués, pas de card-dans-card, un seul accent chartreuse (le bandeau
 * promesse + le fil du sommaire). Page autonome, hors LangProvider landing.
 */

import type { Metadata } from 'next';
import { MIN_AGE_YEARS } from '@klaim/shared';
import { Icon } from '../components/ui/Icon';
import styles from './legal.module.css';

/** Dernière mise à jour — à faire évoluer à chaque changement de fond. */
const LAST_UPDATED = '6 juillet 2026';
const EFFECTIVE = '6 juillet 2026';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — GRYD',
  description:
    'Comment GRYD collecte, utilise et protège tes données : localisation pendant les courses, mouvement, santé importée, compte. Ta position n’est jamais publique.',
};

/** Sommaire ↔ ancres des sections (ordre de lecture). */
const TOC = [
  { id: 'responsable', label: 'Qui est responsable' },
  { id: 'donnees', label: 'Données que nous collectons' },
  { id: 'position', label: 'Ta position n’est jamais publique' },
  { id: 'finalites', label: 'Pourquoi & base légale' },
  { id: 'sante', label: 'Santé, mouvement & HealthKit' },
  { id: 'partage', label: 'Partage & sous-traitants' },
  { id: 'conservation', label: 'Durées de conservation' },
  { id: 'droits', label: 'Tes droits & suppression' },
  { id: 'securite', label: 'Sécurité' },
  { id: 'mineurs', label: 'Mineurs' },
  { id: 'modifs', label: 'Modifications' },
  { id: 'contact', label: 'Contact' },
] as const;

export default function ConfidentialitePage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* Barre de retour minimale (page autonome). */}
        <div className={styles.topbar}>
          <a href="/" className={styles.brand} aria-label="Retour à l'accueil GRYD">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <polygon
                points="12,1.5 21,6.75 21,17.25 12,22.5 3,17.25 3,6.75"
                fill="var(--ch)"
              />
            </svg>
            <span>GRYD</span>
          </a>
          <a href="/" className={styles.back}>
            <Icon name="chevron" size={14} />
            Retour
          </a>
        </div>

        {/* ── En-tête ─────────────────────────────────────────────────── */}
        <header className={styles.hero}>
          <p className={styles.kicker}>Confidentialité</p>
          <h1 className={styles.heroTitle}>Politique de confidentialité</h1>
          <p className={styles.heroSub}>
            GRYD est un jeu de conquête de territoire par la course à pied. Cette page
            explique, sans détour, quelles données nous traitons, pourquoi, combien de
            temps, et comment tu gardes la main dessus. Elle s&rsquo;applique à
            l&rsquo;application mobile GRYD et au site gryd.run.
          </p>
          <div className={styles.dateRow}>
            <span>
              Dernière mise à jour : <b>{LAST_UPDATED}</b>
            </span>
            <span>
              En vigueur le : <b>{EFFECTIVE}</b>
            </span>
          </div>

          {/* Bandeau promesse — accent chartreuse unique de la page. */}
          <div className={styles.pledge}>
            <p className={styles.pledgeTitle}>Notre promesse en une phrase</p>
            <p className={styles.pledgeBody}>
              Ta position exacte n&rsquo;est <b>jamais rendue publique</b> et n&rsquo;est
              <b> jamais suivie en dehors d&rsquo;une course que tu as toi-même lancée</b>.
              Nous ne vendons aucune donnée, à personne.
            </p>
          </div>
        </header>

        {/* ── Sommaire ────────────────────────────────────────────────── */}
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

        {/* ── 1. Responsable ──────────────────────────────────────────── */}
        <section id="responsable" className={styles.section}>
          <p className={styles.sectionNum}>01</p>
          <h2 className={styles.sectionTitle}>Qui est responsable de tes données</h2>
          <p className={styles.body}>
            Le responsable de traitement est <b>SASU Nexus 1993</b>, éditrice de
            l&rsquo;application GRYD, immatriculée en France. Pour toute question relative à
            tes données personnelles, écris-nous à{' '}
            <a href="mailto:privacy@gryd.run">privacy@gryd.run</a>.
          </p>
          <p className={styles.body}>
            «&nbsp;GRYD&nbsp;» est le nom de code du produit&nbsp;; l&rsquo;entité juridique
            reste SASU Nexus 1993. Nous traitons tes données conformément au Règlement
            général sur la protection des données (RGPD) et à la loi Informatique et
            Libertés.
          </p>
        </section>

        {/* ── 2. Données collectées ──────────────────────────────────── */}
        <section id="donnees" className={styles.section}>
          <p className={styles.sectionNum}>02</p>
          <h2 className={styles.sectionTitle}>Les données que nous collectons</h2>
          <p className={styles.body}>
            Nous collectons uniquement ce qui fait fonctionner le jeu. Aucune donnée
            n&rsquo;est captée « au cas où ».
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Compte&nbsp;:</b> ton adresse e-mail et un identifiant, via Sign in with
              Apple (ou, à terme, un autre fournisseur). Ton pseudo et, si tu le choisis,
              ton crew.
            </li>
            <li className={styles.item}>
              <b>Localisation pendant une course&nbsp;:</b> ta position GPS, enregistrée{' '}
              <b>uniquement quand tu as lancé une course</b>, pour tracer ton parcours et
              déterminer quel territoire tu captures ou défends. Le suivi s&rsquo;arrête dès
              que la course se termine.
            </li>
            <li className={styles.item}>
              <b>Mouvement & podomètre&nbsp;:</b> cadence, pas et cohérence de mouvement,
              lus pendant la course par «&nbsp;GRYD Verify&nbsp;» pour vérifier qu&rsquo;il
              s&rsquo;agit d&rsquo;une vraie course à pied (anti-triche).
            </li>
            <li className={styles.item}>
              <b>Santé importée (optionnelle)&nbsp;:</b> si tu l&rsquo;autorises
              explicitement, des données d&rsquo;entraînement (fréquence cardiaque,
              distances) importées depuis Apple Santé / HealthKit. Cette autorisation est
              facultative et révocable à tout moment.
            </li>
            <li className={styles.item}>
              <b>Contenu que tu crées&nbsp;:</b> messages de chat de crew, noms de crew,
              réactions, et tout contenu que tu publies auprès des autres joueurs.
            </li>
            <li className={styles.item}>
              <b>Données techniques & de jeu&nbsp;:</b> modèle d&rsquo;appareil, version de
              l&rsquo;app, journaux d&rsquo;erreur, et tes statistiques de jeu (zones tenues,
              points, badges) — nécessaires au classement et au fonctionnement.
            </li>
          </ul>
          <div className={styles.note}>
            <Icon name="info" size={16} />
            <span>
              Nous ne collectons ni tes contacts, ni tes photos, ni tes données de
              navigation publicitaire. GRYD ne diffuse aucune publicité.
            </span>
          </div>
        </section>

        {/* ── 3. Position jamais publique ────────────────────────────── */}
        <section id="position" className={styles.section}>
          <p className={styles.sectionNum}>03</p>
          <h2 className={styles.sectionTitle}>Ta position n&rsquo;est jamais publique</h2>
          <p className={styles.body}>
            C&rsquo;est un principe non négociable de GRYD, pas une option&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              Ta position en temps réel n&rsquo;est <b>jamais</b> montrée aux autres
              joueurs. La carte agrège le territoire par zones et par rôle, jamais par
              position individuelle exacte.
            </li>
            <li className={styles.item}>
              Nous ne suivons <b>jamais</b> ta localisation en arrière-plan hors
              course&nbsp;: aucun point GPS n&rsquo;est enregistré tant que tu n&rsquo;as
              pas lancé une course.
            </li>
            <li className={styles.item}>
              Les tracés de tes courses restent privés par défaut. Si un jour tu choisis de
              partager une course, tu décides quoi partager, à ce moment-là.
            </li>
            <li className={styles.item}>
              Les rivaux affichés sur la carte le sont de façon <b>approximative et
              agrégée</b> — jamais leur position réelle, jamais la tienne.
            </li>
          </ul>
        </section>

        {/* ── 4. Finalités & base légale ─────────────────────────────── */}
        <section id="finalites" className={styles.section}>
          <p className={styles.sectionNum}>04</p>
          <h2 className={styles.sectionTitle}>Pourquoi nous traitons ces données</h2>
          <p className={styles.body}>
            Chaque traitement a une finalité précise et une base légale RGPD.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Donnée</th>
                  <th scope="col">Finalité</th>
                  <th scope="col">Base légale (RGPD)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <b>Compte & e-mail</b>
                  </td>
                  <td>Créer et sécuriser ton compte, te contacter au sujet du service.</td>
                  <td>Exécution du contrat (art. 6.1.b)</td>
                </tr>
                <tr>
                  <td>
                    <b>Localisation en course</b>
                  </td>
                  <td>Tracer ton parcours, décider quel territoire tu captures / défends.</td>
                  <td>Exécution du contrat (art. 6.1.b)</td>
                </tr>
                <tr>
                  <td>
                    <b>Mouvement & podomètre</b>
                  </td>
                  <td>Vérifier qu&rsquo;une course est réelle (anti-triche, GRYD Verify).</td>
                  <td>Intérêt légitime — équité du jeu (art. 6.1.f)</td>
                </tr>
                <tr>
                  <td>
                    <b>Santé importée</b>
                  </td>
                  <td>Enrichir ton résumé de course (optionnel).</td>
                  <td>Consentement explicite (art. 6.1.a & 9.2.a)</td>
                </tr>
                <tr>
                  <td>
                    <b>Contenu de crew</b>
                  </td>
                  <td>Chat, coordination et vie de communauté entre joueurs.</td>
                  <td>Exécution du contrat (art. 6.1.b)</td>
                </tr>
                <tr>
                  <td>
                    <b>Journaux & technique</b>
                  </td>
                  <td>Faire fonctionner l&rsquo;app, corriger les bugs, prévenir la fraude.</td>
                  <td>Intérêt légitime (art. 6.1.f)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={styles.body}>
            Quand un traitement repose sur le consentement (santé importée, notifications),
            tu peux le retirer à tout moment sans que cela affecte le reste du jeu.
          </p>
        </section>

        {/* ── 5. Santé, mouvement & HealthKit ────────────────────────── */}
        <section id="sante" className={styles.section}>
          <p className={styles.sectionNum}>05</p>
          <h2 className={styles.sectionTitle}>Santé, mouvement & Apple HealthKit</h2>
          <p className={styles.body}>
            Si tu autorises GRYD à lire des données depuis Apple Santé (HealthKit), nous
            respectons les règles Apple qui s&rsquo;y appliquent&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              Les données de santé lues via HealthKit servent <b>uniquement</b> à enrichir
              ton expérience de course dans GRYD (résumé, historique). Jamais à de la
              publicité, jamais à du marketing, jamais revendues.
            </li>
            <li className={styles.item}>
              Nous ne partageons <b>aucune</b> donnée HealthKit avec des tiers à des fins
              publicitaires ou de data-broker.
            </li>
            <li className={styles.item}>
              Tu peux couper l&rsquo;accès à tout moment depuis Réglages &rsaquo;
              Confidentialité &rsaquo; Santé sur ton iPhone — GRYD continue de fonctionner
              sans.
            </li>
            <li className={styles.item}>
              Les données de mouvement / podomètre restent sur l&rsquo;appareil autant que
              possible et ne sont transmises que pour valider une course.
            </li>
          </ul>
        </section>

        {/* ── 6. Partage & sous-traitants ────────────────────────────── */}
        <section id="partage" className={styles.section}>
          <p className={styles.sectionNum}>06</p>
          <h2 className={styles.sectionTitle}>Avec qui nous partageons — et ne vendons pas</h2>
          <p className={styles.body}>
            <b>Nous ne vendons aucune donnée personnelle.</b> Nous ne cédons ni ne louons
            tes données à des courtiers ou à des annonceurs. Nous faisons appel à un nombre
            restreint de sous-traitants techniques, encadrés par contrat, uniquement pour
            faire tourner le service&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Hébergement & base de données</b> (Supabase / infrastructure cloud) —
              stockage sécurisé de ton compte et de tes données de jeu.
            </li>
            <li className={styles.item}>
              <b>Authentification</b> (Apple) — connexion via Sign in with Apple.
            </li>
            <li className={styles.item}>
              <b>Mesure d&rsquo;audience produit</b> (PostHog, hébergé dans l&rsquo;Union
              européenne) — statistiques d&rsquo;usage agrégées pour améliorer le jeu, sans
              revente ni publicité.
            </li>
            <li className={styles.item}>
              <b>Paiement</b> (Apple In-App Purchase) — pour l&rsquo;abonnement GRYD Club et
              les achats ponctuels&nbsp;; Apple gère la transaction, nous ne voyons pas ta
              carte bancaire.
            </li>
          </ul>
          <p className={styles.body}>
            Nous pouvons divulguer des données si la loi l&rsquo;exige (réquisition
            judiciaire), ou pour protéger nos droits et la sécurité des joueurs.
          </p>
        </section>

        {/* ── 7. Conservation ────────────────────────────────────────── */}
        <section id="conservation" className={styles.section}>
          <p className={styles.sectionNum}>07</p>
          <h2 className={styles.sectionTitle}>Combien de temps nous conservons tes données</h2>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Compte & données de jeu&nbsp;:</b> tant que ton compte est actif.
            </li>
            <li className={styles.item}>
              <b>Après suppression du compte&nbsp;:</b> tes données personnelles sont
              effacées ou anonymisées sous <b>30 jours</b>, sauf obligation légale de
              conservation (facturation, litige).
            </li>
            <li className={styles.item}>
              <b>Tracés de course&nbsp;:</b> conservés avec ton compte&nbsp;; supprimés
              lors de la suppression du compte.
            </li>
            <li className={styles.item}>
              <b>Journaux techniques&nbsp;:</b> conservés au maximum <b>12 mois</b>, puis
              effacés.
            </li>
          </ul>
        </section>

        {/* ── 8. Droits & suppression ────────────────────────────────── */}
        <section id="droits" className={styles.section}>
          <p className={styles.sectionNum}>08</p>
          <h2 className={styles.sectionTitle}>Tes droits — dont la suppression du compte</h2>
          <p className={styles.body}>
            Conformément au RGPD, tu disposes des droits suivants sur tes données&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Accès & portabilité&nbsp;:</b> obtenir une copie de tes données dans un
              format lisible (export).
            </li>
            <li className={styles.item}>
              <b>Rectification&nbsp;:</b> corriger une donnée inexacte (pseudo, e-mail).
            </li>
            <li className={styles.item}>
              <b>Suppression&nbsp;:</b> effacer ton compte et tes données. Tu peux{' '}
              <b>supprimer ton compte directement depuis l&rsquo;application</b> (Réglages
              &rsaquo; Compte &rsaquo; Supprimer mon compte), avec confirmation. La
              suppression purge tes données serveur et locales et te ramène à
              l&rsquo;onboarding.
            </li>
            <li className={styles.item}>
              <b>Opposition & limitation&nbsp;:</b> t&rsquo;opposer à un traitement fondé
              sur l&rsquo;intérêt légitime, ou en demander la limitation.
            </li>
            <li className={styles.item}>
              <b>Retrait du consentement&nbsp;:</b> couper à tout moment l&rsquo;accès
              santé ou les notifications.
            </li>
          </ul>
          <div className={styles.note}>
            <Icon name="info" size={16} />
            <span>
              Pour exercer tes droits, utilise la suppression in-app ou écris à{' '}
              <b>privacy@gryd.run</b>. Tu peux aussi introduire une réclamation auprès de la{' '}
              <b>CNIL</b> (cnil.fr).
            </span>
          </div>
        </section>

        {/* ── 9. Sécurité ────────────────────────────────────────────── */}
        <section id="securite" className={styles.section}>
          <p className={styles.sectionNum}>09</p>
          <h2 className={styles.sectionTitle}>Comment nous protégeons tes données</h2>
          <p className={styles.body}>
            Les échanges sont chiffrés en transit (HTTPS). L&rsquo;accès à la base de
            données est cloisonné par des règles de sécurité au niveau de chaque ligne
            (RLS)&nbsp;: un joueur ne peut jamais lire ou écrire les données d&rsquo;un
            autre. L&rsquo;écriture des courses et des captures de territoire passe
            exclusivement par nos serveurs, jamais directement par l&rsquo;app cliente, ce
            qui empêche toute triche et protège l&rsquo;intégrité de tes données.
          </p>
        </section>

        {/* ── 10. Mineurs ────────────────────────────────────────────── */}
        <section id="mineurs" className={styles.section}>
          <p className={styles.sectionNum}>10</p>
          <h2 className={styles.sectionTitle}>Mineurs</h2>
          <p className={styles.body}>
            GRYD est réservé aux personnes âgées d&rsquo;au moins{' '}
            <b>{MIN_AGE_YEARS} ans</b>. Nous ne collectons pas sciemment de données
            concernant des personnes plus jeunes. Si tu penses qu&rsquo;un mineur de moins
            de {MIN_AGE_YEARS} ans nous a transmis des données, écris à{' '}
            <a href="mailto:privacy@gryd.run">privacy@gryd.run</a> et nous les
            supprimerons.
          </p>
        </section>

        {/* ── 11. Modifications ──────────────────────────────────────── */}
        <section id="modifs" className={styles.section}>
          <p className={styles.sectionNum}>11</p>
          <h2 className={styles.sectionTitle}>Modifications de cette politique</h2>
          <p className={styles.body}>
            Nous pouvons faire évoluer cette politique. En cas de changement important, nous
            t&rsquo;en informons dans l&rsquo;application ou par e-mail. La date de dernière
            mise à jour figure en haut de cette page.
          </p>
        </section>

        {/* ── 12. Contact ────────────────────────────────────────────── */}
        <section id="contact" className={styles.section}>
          <p className={styles.sectionNum}>12</p>
          <h2 className={styles.sectionTitle}>Nous contacter</h2>
          <p className={styles.body}>
            Une question sur tes données&nbsp;? Écris à{' '}
            <a href="mailto:privacy@gryd.run">privacy@gryd.run</a>. Nous répondons dans les
            meilleurs délais et, en tout état de cause, dans les délais prévus par le RGPD.
          </p>
        </section>

        {/* ── Pied de page légal ─────────────────────────────────────── */}
        <div className={styles.legalFoot}>
          <a href="/conditions">Conditions d&rsquo;utilisation</a>
          <a href="/cgv">CGV</a>
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/">Retour à l&rsquo;accueil</a>
          <span>SASU Nexus 1993</span>
        </div>
      </main>
    </div>
  );
}
