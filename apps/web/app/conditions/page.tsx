/**
 * GRYD — Conditions d'utilisation / CGU (AMENDEMENT-33 §6).
 *
 * URL publique requise par App Store Connect (EULA / Terms). Contenu RÉEL et
 * court, spécifique à GRYD : compte, règles de jeu, anti-triche, contenu
 * utilisateur + modération, abonnement « statut uniquement » (anti pay-to-win),
 * responsabilité, résiliation.
 *
 * Charte ADDENDUM-DESIGN §C : dark-first, noir/blanc/chartreuse #B4FF0D, JAMAIS
 * de chartreuse sur fond clair. §A : lecture linéaire, textes non tronqués, pas
 * de card-dans-card, accent chartreuse unique (bandeau + fil du sommaire).
 * Réutilise le module CSS légal partagé (confidentialite/legal.module.css).
 */

import type { Metadata } from 'next';
import { MIN_AGE_YEARS } from '@klaim/shared';
import { Icon } from '../components/ui/Icon';
import styles from '../confidentialite/legal.module.css';

// Révision du 23 juillet 2026 — AMENDEMENT-40 §2 / AMENDEMENT-45 §2 : les objets fonctionnels ne sont vendus dans aucune monnaie.
// Aucune vente n'ayant eu lieu, aucune version antérieure ne lie personne :
// le texte révisé est celui en vigueur.
const LAST_UPDATED = '23 juillet 2026';
const EFFECTIVE = '23 juillet 2026';

export const metadata: Metadata = {
  title: 'Conditions d’utilisation — GRYD',
  description:
    'Les règles d’usage de GRYD : compte, règles du jeu, anti-triche, contenu et modération, abonnement statut, responsabilité, résiliation.',
};

const TOC = [
  { id: 'objet', label: 'Objet & acceptation' },
  { id: 'compte', label: 'Ton compte' },
  { id: 'jeu', label: 'Règles du jeu' },
  { id: 'triche', label: 'Anti-triche & jeu loyal' },
  { id: 'contenu', label: 'Contenu & modération' },
  { id: 'abonnement', label: 'Abonnement — statut uniquement' },
  { id: 'responsabilite', label: 'Sécurité & responsabilité' },
  { id: 'resiliation', label: 'Résiliation' },
  { id: 'droit', label: 'Droit applicable' },
  { id: 'contact', label: 'Contact' },
] as const;

export default function ConditionsPage() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
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
          <p className={styles.kicker}>Conditions</p>
          <h1 className={styles.heroTitle}>Conditions d&rsquo;utilisation</h1>
          <p className={styles.heroSub}>
            Ces conditions encadrent l&rsquo;usage de l&rsquo;application GRYD et du site
            gryd.run. En jouant à GRYD, tu les acceptes. Elles sont volontairement courtes
            et lisibles.
          </p>
          <div className={styles.dateRow}>
            <span>
              Dernière mise à jour : <b>{LAST_UPDATED}</b>
            </span>
            <span>
              En vigueur le : <b>{EFFECTIVE}</b>
            </span>
          </div>

          {/* Bandeau — accent chartreuse unique de la page. */}
          <div className={styles.pledge}>
            <p className={styles.pledgeTitle}>Le principe fondateur de GRYD</p>
            <p className={styles.pledgeBody}>
              <b>Le territoire ne s&rsquo;achète jamais.</b> Tout ce qui compte au
              classement — zones, points, victoire — se gagne <b>en courant</b>. Aucun
              paiement ne donne le moindre avantage de jeu.
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

        {/* ── 1. Objet ────────────────────────────────────────────────── */}
        <section id="objet" className={styles.section}>
          <p className={styles.sectionNum}>01</p>
          <h2 className={styles.sectionTitle}>Objet & acceptation</h2>
          <p className={styles.body}>
            GRYD, édité par <b>SASU Nexus 1993</b>, est un jeu de conquête de territoire par
            la course à pied&nbsp;: chaque course réelle capture ou défend du territoire sur
            une carte. En créant un compte ou en utilisant le service, tu acceptes ces
            conditions ainsi que notre{' '}
            <a href="/confidentialite">Politique de confidentialité</a>.
          </p>
        </section>

        {/* ── 2. Compte ───────────────────────────────────────────────── */}
        <section id="compte" className={styles.section}>
          <p className={styles.sectionNum}>02</p>
          <h2 className={styles.sectionTitle}>Ton compte</h2>
          <ul className={styles.list}>
            <li className={styles.item}>
              Tu dois avoir au moins <b>{MIN_AGE_YEARS} ans</b> pour utiliser GRYD.
            </li>
            <li className={styles.item}>
              Tu es responsable de la confidentialité de ton accès et des activités menées
              depuis ton compte.
            </li>
            <li className={styles.item}>
              Tu fournis des informations exactes (pseudo, e-mail) et t&rsquo;engages à ne
              pas usurper l&rsquo;identité d&rsquo;un tiers.
            </li>
            <li className={styles.item}>
              Tu peux <b>supprimer ton compte à tout moment depuis l&rsquo;application</b>{' '}
              (Réglages &rsaquo; Compte &rsaquo; Supprimer mon compte).
            </li>
          </ul>
        </section>

        {/* ── 3. Règles du jeu ────────────────────────────────────────── */}
        <section id="jeu" className={styles.section}>
          <p className={styles.sectionNum}>03</p>
          <h2 className={styles.sectionTitle}>Règles du jeu</h2>
          <p className={styles.body}>
            Le territoire se capture uniquement par des courses à pied réelles, validées par
            nos serveurs. Les captures, points, classements et badges sont attribués
            <b> côté serveur</b>&nbsp;: l&rsquo;application ne décide jamais seule
            qu&rsquo;une zone t&rsquo;appartient. Les règles de jeu (distances, allures
            valides, décroissance des zones non défendues) peuvent évoluer pour préserver
            l&rsquo;équilibre&nbsp;; les changements importants sont annoncés dans
            l&rsquo;app.
          </p>
        </section>

        {/* ── 4. Anti-triche ──────────────────────────────────────────── */}
        <section id="triche" className={styles.section}>
          <p className={styles.sectionNum}>04</p>
          <h2 className={styles.sectionTitle}>Anti-triche & jeu loyal</h2>
          <p className={styles.body}>
            GRYD repose sur des courses honnêtes. Le système «&nbsp;GRYD Verify&nbsp;»
            recoupe GPS, vitesse, cadence et cohérence de mouvement pour écarter les
            parcours impossibles à pied. Sont interdits&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              Simuler une course (voiture, vélo, GPS falsifié, spoofing de position).
            </li>
            <li className={styles.item}>
              Utiliser des outils automatisés, bots ou modifications de l&rsquo;application.
            </li>
            <li className={styles.item}>
              Exploiter une faille pour capturer du territoire sans courir réellement.
            </li>
          </ul>
          <p className={styles.body}>
            Une course douteuse peut être rejetée&nbsp;; un compte qui triche de façon
            répétée peut être suspendu ou fermé.
          </p>
        </section>

        {/* ── 5. Contenu & modération ────────────────────────────────── */}
        <section id="contenu" className={styles.section}>
          <p className={styles.sectionNum}>05</p>
          <h2 className={styles.sectionTitle}>Contenu utilisateur & modération</h2>
          <p className={styles.body}>
            Tu restes propriétaire du contenu que tu publies (messages de crew, pseudo, nom
            de crew), et tu nous accordes le droit de l&rsquo;afficher aux autres joueurs
            pour faire fonctionner le jeu. Tu t&rsquo;engages à ne rien publier
            d&rsquo;illégal, haineux, harcelant, sexuellement explicite ou trompeur.
          </p>
          <p className={styles.body}>
            Nous appliquons une <b>tolérance zéro pour les contenus abusifs</b>. Dans
            l&rsquo;application, tu peux&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Signaler</b> un message, un membre ou un contenu inapproprié.
            </li>
            <li className={styles.item}>
              <b>Bloquer</b> un utilisateur pour ne plus voir ses messages ni interagir avec
              lui.
            </li>
            <li className={styles.item}>
              Compter sur un <b>filtrage</b> des contenus objectionnables.
            </li>
          </ul>
          <div className={styles.note}>
            <Icon name="info" size={16} />
            <span>
              Les signalements sont traités sous <b>24 heures</b>. Nous pouvons retirer un
              contenu et suspendre les comptes qui enfreignent ces règles.
            </span>
          </div>
        </section>

        {/* ── 6. Abonnement statut ───────────────────────────────────── */}
        <section id="abonnement" className={styles.section}>
          <p className={styles.sectionNum}>06</p>
          <h2 className={styles.sectionTitle}>Abonnement & achats — statut uniquement</h2>
          <p className={styles.body}>
            Le jeu est <b>gratuit et complet</b>. GRYD ne propose qu&rsquo;<b>un seul
            abonnement, GRYD Club</b> (bonus permanents de confort sur tes propres
            données&nbsp;: stats avancées, heatmap personnelle, historique complet, export et
            templates de partage), aux côtés
            d&rsquo;<b>achats ponctuels purement cosmétiques</b> (Founder Pack, Starter Pack).
            Aucune de ces offres n&rsquo;apporte <b>de territoire, de points, de victoire ni de
            protection</b>.
          </p>
          <p className={styles.body}>
            Les objets qui agissent sur la partie — <b>bouclier de quartier, gel de série,
            scout, alerte d&rsquo;attaque</b> — <b>ne sont vendus dans aucune monnaie</b> : ni
            en euros, ni en Éclats, ni dans un pack, ni dans l&rsquo;abonnement. Leurs plafonds
            sont <b>identiques</b> pour un abonné et un joueur gratuit.
          </p>
          <p className={styles.body}>
            À ce jour, <b>aucune offre payante n&rsquo;est commercialisée</b> : aucun paiement
            n&rsquo;est encaissable dans l&rsquo;application ni sur le site. Les clauses
            ci-dessous décrivent le cadre applicable dès qu&rsquo;une vente sera ouverte.
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              Les achats dans l&rsquo;application sont traités par <b>Apple (In-App
              Purchase)</b>&nbsp;; la facturation et les remboursements suivent les règles
              d&rsquo;Apple.
            </li>
            <li className={styles.item}>
              Les abonnements se renouvellent automatiquement jusqu&rsquo;à leur annulation.
              Tu gères et annules ton abonnement depuis les réglages de ton compte Apple.
            </li>
            <li className={styles.item}>
              L&rsquo;annulation prend effet à la fin de la période en cours&nbsp;; tu
              conserves tes cosmétiques acquis, jamais tes zones (elles restent à toi tant
              que tu cours).
            </li>
          </ul>
        </section>

        {/* ── 7. Responsabilité ──────────────────────────────────────── */}
        <section id="responsabilite" className={styles.section}>
          <p className={styles.sectionNum}>07</p>
          <h2 className={styles.sectionTitle}>Sécurité & responsabilité</h2>
          <p className={styles.body}>
            GRYD se joue en courant dans le monde réel. <b>Ta sécurité passe avant le
            jeu.</b> Respecte le code de la route, ton environnement et tes limites
            physiques&nbsp;: ne cours pas dans des lieux dangereux, ne regarde pas ton écran
            en traversant. Consulte un professionnel de santé avant de reprendre une
            activité sportive intense.
          </p>
          <p className={styles.body}>
            Le service est fourni «&nbsp;en l&rsquo;état&nbsp;». Dans les limites permises
            par la loi, nous ne saurions être tenus responsables des dommages liés à ta
            pratique de la course ou à une interruption du service. Rien dans ces conditions
            ne limite les droits que la loi française t&rsquo;accorde en tant que
            consommateur.
          </p>
        </section>

        {/* ── 8. Résiliation ─────────────────────────────────────────── */}
        <section id="resiliation" className={styles.section}>
          <p className={styles.sectionNum}>08</p>
          <h2 className={styles.sectionTitle}>Résiliation</h2>
          <p className={styles.body}>
            Tu peux cesser d&rsquo;utiliser GRYD et supprimer ton compte à tout moment
            depuis l&rsquo;application. Nous pouvons suspendre ou fermer un compte qui
            enfreint ces conditions (triche, contenu abusif, fraude), le cas échéant sans
            préavis en cas de manquement grave. À la suppression du compte, tes données sont
            traitées comme décrit dans la{' '}
            <a href="/confidentialite">Politique de confidentialité</a>.
          </p>
        </section>

        {/* ── 9. Droit applicable ────────────────────────────────────── */}
        <section id="droit" className={styles.section}>
          <p className={styles.sectionNum}>09</p>
          <h2 className={styles.sectionTitle}>Droit applicable</h2>
          <p className={styles.body}>
            Ces conditions sont régies par le droit français. En cas de litige, tu peux
            recourir à une médiation de la consommation avant toute action judiciaire. À
            défaut d&rsquo;accord, les tribunaux français sont compétents.
          </p>
        </section>

        {/* ── 10. Contact ────────────────────────────────────────────── */}
        <section id="contact" className={styles.section}>
          <p className={styles.sectionNum}>10</p>
          <h2 className={styles.sectionTitle}>Nous contacter</h2>
          <p className={styles.body}>
            Une question sur ces conditions&nbsp;? Écris à{' '}
            <a href="mailto:support@gryd.run">support@gryd.run</a>.
          </p>
        </section>

        <div className={styles.legalFoot}>
          <a href="/confidentialite">Politique de confidentialité</a>
          <a href="/cgv">CGV</a>
          <a href="/mentions-legales">Mentions légales</a>
          <a href="/">Retour à l&rsquo;accueil</a>
          <span>SASU Nexus 1993</span>
        </div>
      </main>
    </div>
  );
}
