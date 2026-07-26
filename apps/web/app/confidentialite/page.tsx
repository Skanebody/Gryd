/**
 * GRYD — Politique de confidentialité (AMENDEMENT-33 §6).
 *
 * URL publique requise par App Store Connect (champ « Privacy Policy URL »,
 * Guideline 5.1.1(i) : « identify what data, if any, the app/service collects »).
 *
 * ⚠️ RECALAGE DU 26/07/2026 — TROIS DÉCLARATIONS PORTAIENT SUR DES TRAITEMENTS
 * QUI N'ONT PAS LIEU. Une politique qui SUR-déclare est inexacte au même titre
 * qu'une politique qui dissimule, et celle-ci disait le CONTRAIRE de la
 * politique embarquée dans le binaire (`apps/mobile/src/i18n/catalog/legal.ts`,
 * recalée le 25/07/2026) : deux documents contractuels du même produit qui se
 * contredisent sont un défaut en soi. Ont été retirés :
 *   · la SANTÉ IMPORTÉE (Apple Santé / HealthKit) — section 05 entière, ligne de
 *     tableau, entrée de sommaire, base légale art. 9.2.a. Aucun code ne peut
 *     lire HealthKit : registre d'adaptateurs limité à `gpx`
 *     (`apps/mobile/src/features/sources/adapters/registry.ts:20-23`), adaptateur
 *     Apple Santé = stub `needs_dev_build` (`.../adapters/appleHealth.ts:22-26`),
 *     entitlement `com.apple.developer.healthkit` jamais sous `expo.ios`
 *     (gabarit commenté `_healthkit_o8`, `apps/mobile/app.json:4-16`) ;
 *   · le CHAT DE CREW et les RÉACTIONS — il n'y a aucune messagerie : `grep -rn
 *     crew_messages apps/ packages/ supabase/functions/` ne renvoie RIEN (la
 *     table ne survit qu'en migration 0019/0020, sans aucun code applicatif).
 *     Déclarer de l'UGC de type chat ouvrait en plus les obligations 1.2 sur une
 *     surface inexistante ;
 *   · le PAIEMENT présenté comme un traitement EN COURS — aucune offre n'est
 *     commercialisée, aucune lib d'achat n'est en dépendance.
 * Ont été AJOUTÉS, parce qu'ils existent et n'étaient déclarés nulle part :
 * l'import de courses à l'initiative du joueur (GPX), la section TRANSFERTS HORS
 * UE, le délai de grâce de 30 jours de la suppression de compte, et Google comme
 * fournisseur d'authentification.
 *
 * ⚠️ 26/07/2026, SECONDE PASSE — LA FINALITÉ DÉCLARÉE ÉTAIT PLUS ÉTROITE QUE LE
 * TRAITEMENT RÉEL. Le document annonçait « GRYD est un jeu de conquête de
 * territoire par la course à pied », déclarait la localisation « pendant une
 * course » et le podomètre lu « pour vérifier qu'il s'agit d'une vraie course à
 * pied ». Depuis la décision fondateur du 26/07/2026, le vélo est une
 * discipline RÉELLE (`ACTIVITIES = ['run', 'bike']`, `runs.activity`, clé
 * primaire composite `hex_claims (h3index, activity)` — migration 0070, EN
 * PRODUCTION) : les mêmes données sont donc traitées pour des sorties qui ne
 * sont pas des courses à pied. Une finalité RGPD qui ne couvre pas le
 * traitement réel n'est pas une imprécision de rédaction, c'est un DÉFAUT
 * JURIDIQUE — la finalité est ce qui borne le traitement licite (art. 5.1.b).
 * La correction est celle déjà portée côté mobile (`legal.ts`,
 * `privacyDonneesBody2` / `privacyFinalitesBody2` / `privacyConservationBody`) :
 * on dit ce qui est vérifié — la sincérité de l'effort dans la discipline
 * DÉCLARÉE — sans prétendre que chaque capteur sert dans chaque discipline.
 *
 * RÈGLE DE MAINTENANCE : ce document ne promet jamais au-delà du code. Avant de
 * réintroduire une ligne, vérifier le code, pas la rédaction précédente.
 *
 * Charte ADDENDUM-DESIGN §C : dark-first, noir/blanc/chartreuse #B4FF0D,
 * JAMAIS de chartreuse sur fond clair. §A : lecture linéaire, textes non
 * tronqués, pas de card-dans-card, un seul accent chartreuse (le bandeau
 * promesse + le fil du sommaire). Page autonome, hors LangProvider landing.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { MIN_AGE_YEARS } from '@klaim/shared';
import { Icon } from '../components/ui/Icon';
import { POSTAL_CONTACT } from '../../lib/legal';
import styles from './legal.module.css';

/** Dernière mise à jour — à faire évoluer à chaque changement de fond. */
const LAST_UPDATED = '26 juillet 2026';
const EFFECTIVE = '26 juillet 2026';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — GRYD',
  description:
    'Comment GRYD collecte, utilise et protège tes données : localisation pendant tes sorties (course à pied et vélo), mouvement, compte. Ta position n’est jamais publique, et GRYD ne lit aucune donnée de santé.',
};

/** Sommaire ↔ ancres des sections (ordre de lecture). */
const TOC = [
  { id: 'responsable', label: 'Qui est responsable' },
  { id: 'donnees', label: 'Données que nous collectons' },
  { id: 'position', label: 'Ta position n’est jamais publique' },
  { id: 'finalites', label: 'Pourquoi & base légale' },
  { id: 'sante', label: 'Géolocalisation & absence de données de santé' },
  { id: 'partage', label: 'Partage & sous-traitants' },
  { id: 'transferts', label: 'Transferts hors Union européenne' },
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
          <Link href="/" className={styles.brand} aria-label="Retour à l'accueil GRYD">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <polygon
                points="12,1.5 21,6.75 21,17.25 12,22.5 3,17.25 3,6.75"
                fill="var(--ch)"
              />
            </svg>
            <span>GRYD</span>
          </Link>
          <Link href="/" className={styles.back}>
            <Icon name="chevron" size={14} />
            Retour
          </Link>
        </div>

        {/* ── En-tête ─────────────────────────────────────────────────── */}
        <header className={styles.hero}>
          <p className={styles.kicker}>Confidentialité</p>
          <h1 className={styles.heroTitle}>Politique de confidentialité</h1>
          {/* La finalité annoncée ne peut pas être plus étroite que le traitement
              réel : le vélo enregistre des sorties depuis le 26/07/2026. */}
          <p className={styles.heroSub}>
            GRYD est un jeu de conquête de territoire par l&rsquo;effort réel, dans deux
            disciplines&nbsp;: la course à pied et le vélo. Cette page explique, sans
            détour, quelles données nous traitons, pourquoi, combien de temps, et comment
            tu gardes la main dessus. Elle s&rsquo;applique à l&rsquo;application mobile
            GRYD et au site officiel GRYD.
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
            tes données personnelles, écris-nous par courrier à l&rsquo;adresse du
            siège&nbsp;: <b>{POSTAL_CONTACT}</b>. L&rsquo;export et la suppression de tes
            données, eux, s&rsquo;exercent directement dans l&rsquo;application (Réglages,
            puis Confidentialité).
          </p>
          <p className={styles.body}>
            {/* « nom de CODE » contredisait la marque : GRYD est le nom PUBLIC du
                produit (CLAUDE.md), pas un nom de code interne. */}
            «&nbsp;GRYD&nbsp;» est le nom du produit&nbsp;; l&rsquo;entité juridique
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
              <b>Localisation pendant une sortie&nbsp;:</b> ta position GPS, enregistrée{' '}
              <b>uniquement quand tu as lancé une sortie</b> (course à pied ou vélo), pour
              tracer ton parcours et déterminer quel territoire tu captures ou défends. Le
              suivi s&rsquo;arrête dès la fin de la sortie.
            </li>
            {/* La finalité disait « vérifier qu'il s'agit d'une vraie course à pied » :
                la donnée est aussi lue sur une sortie à vélo, qui n'en est pas une. Ce
                qui est vérifié, c'est la sincérité de l'effort dans la discipline
                DÉCLARÉE — sans prétendre que chaque capteur sert dans chaque
                discipline (le podomètre ne dit rien d'une sortie à vélo). */}
            <li className={styles.item}>
              <b>Mouvement & podomètre&nbsp;:</b> cadence, pas et cohérence de mouvement,
              lus pendant la sortie par «&nbsp;GRYD Verify&nbsp;» pour vérifier que
              l&rsquo;effort enregistré est réel et correspond à la discipline que tu as
              déclarée (anti-triche).
            </li>
            {/* Remplace « Santé importée (Apple Santé / HealthKit) » : ce traitement
                n'existe pas (cf. l'en-tête). Ce qui existe RÉELLEMENT, et qui
                n'était déclaré nulle part, c'est l'import d'un fichier de course
                à ton initiative — un vrai envoi de tracé à nos serveurs. */}
            <li className={styles.item}>
              <b>Sorties importées, à ton initiative&nbsp;:</b> si tu importes un fichier
              d&rsquo;activité (GPX) ou connectes un service de suivi tiers, le tracé et les
              mesures de l&rsquo;activité importée sont envoyés à nos serveurs pour être
              validés comme une sortie GRYD.
            </li>
            {/* Remplace « messages de chat de crew … réactions » : il n'y a AUCUNE
                messagerie dans GRYD (aucun code ne lit ni n'écrit `crew_messages`).
                Le contenu réellement publié est un vocabulaire FERMÉ. */}
            <li className={styles.item}>
              <b>Contenu que tu crées&nbsp;:</b> ton pseudo, le nom de ton crew si tu en
              crées un, les signaux que tu envoies à ton crew (vocabulaire fermé&nbsp;: il
              n&rsquo;y a pas de messagerie libre dans GRYD) et les signalements que tu
              nous adresses.
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
              navigation publicitaire, et <b>GRYD ne lit aucune donnée d&rsquo;Apple Santé
              (HealthKit) ni de Google Health Connect</b>&nbsp;: cette connexion
              n&rsquo;existe pas dans l&rsquo;application. GRYD ne diffuse aucune
              publicité.
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
                {/* Les finalités du tableau sont la borne juridique du traitement
                    (art. 5.1.b) : les nommer « en course » les rendait plus étroites
                    que le traitement réel depuis que le vélo enregistre. */}
                <tr>
                  <td>
                    <b>Localisation pendant une sortie</b>
                  </td>
                  <td>Tracer ton parcours, décider quel territoire tu captures / défends.</td>
                  <td>Exécution du contrat (art. 6.1.b)</td>
                </tr>
                <tr>
                  <td>
                    <b>Mouvement & podomètre</b>
                  </td>
                  <td>
                    Vérifier qu&rsquo;une sortie est réelle et conforme à sa discipline
                    déclarée (anti-triche, GRYD Verify).
                  </td>
                  <td>Intérêt légitime — équité du jeu (art. 6.1.f)</td>
                </tr>
                {/* La ligne « Santé importée — consentement explicite (art. 9.2.a) »
                    fondait une base légale sur un traitement qui n'a jamais lieu.
                    Remplacée par le traitement RÉEL du même endroit du parcours. */}
                <tr>
                  <td>
                    <b>Sorties importées</b>
                  </td>
                  <td>Faire compter une sortie enregistrée ailleurs (GPX, service tiers).</td>
                  <td>Exécution du contrat (art. 6.1.b), sur ton initiative</td>
                </tr>
                <tr>
                  <td>
                    <b>Signaux de crew</b>
                  </td>
                  <td>Coordonner une zone avec ton crew (vocabulaire fermé, pas de chat).</td>
                  <td>Exécution du contrat (art. 6.1.b)</td>
                </tr>
                <tr>
                  <td>
                    <b>Signalements</b>
                  </td>
                  <td>Protéger les joueurs des contenus et comportements abusifs.</td>
                  <td>Intérêt légitime — sécurité des joueurs (art. 6.1.f)</td>
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
            Quand un traitement repose sur le consentement (notifications), tu peux le
            retirer à tout moment sans que cela affecte le reste du jeu.
          </p>
        </section>

        {/* ── 5. Géolocalisation & absence de données de santé ────────────
            ⚠️ Cette section décrivait un traitement de données de santé qui N'A
            PAS LIEU (cf. l'en-tête du fichier). La seule donnée de l'article 9
            réellement en jeu est la géolocalisation précise : la section la nomme
            désormais, et ÉNONCE l'absence de collecte santé plutôt que de la
            passer sous silence — l'iPhone affichait une demande d'autorisation
            Santé, un lecteur pouvait légitimement croire que GRYD s'en sert. */}
        <section id="sante" className={styles.section}>
          <p className={styles.sectionNum}>05</p>
          <h2 className={styles.sectionTitle}>
            Géolocalisation, mouvement — et aucune donnée de santé
          </h2>
          <p className={styles.body}>
            La géolocalisation précise est, dans certains cas, une catégorie particulière
            de données au sens de l&rsquo;article 9 du RGPD. Nous ne la traitons que pour
            l&rsquo;exécution de la course que tu lances toi-même, jamais en arrière-plan
            hors course, et jamais à des fins de profilage publicitaire.
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>GRYD n&rsquo;importe aucune donnée de santé&nbsp;:</b> l&rsquo;application
              n&rsquo;est connectée ni à Apple Santé (HealthKit) ni à Google Health
              Connect, et ne lit donc ni ta fréquence cardiaque, ni ton poids, ni ton
              historique d&rsquo;entraînement.
            </li>
            <li className={styles.item}>
              Les données de mouvement / podomètre restent sur l&rsquo;appareil autant que
              possible et ne sont transmises que pour valider une course (anti-triche).
            </li>
            <li className={styles.item}>
              Si un import santé devait ouvrir un jour, il serait facultatif, soumis à ton
              consentement explicite, et <b>cette politique serait mise à jour avant</b>.
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
              <b>Hébergement & base de données</b> (Supabase) — sur des serveurs situés
              dans l&rsquo;Union européenne (région AWS eu-west-1, Irlande)&nbsp;: stockage
              sécurisé de ton compte et de tes données de jeu.
            </li>
            <li className={styles.item}>
              <b>Authentification</b> — Apple (Sign in with Apple) et, si tu
              l&rsquo;utilises, Google (Sign in with Google).
            </li>
            <li className={styles.item}>
              <b>Mesure d&rsquo;audience produit</b> (PostHog, hébergé dans l&rsquo;Union
              européenne) — statistiques d&rsquo;usage agrégées pour améliorer le jeu, sans
              revente ni publicité.
            </li>
            {/* ⚠️ Le paiement était déclaré comme un traitement EN COURS alors que les
                CGV du même produit affirment qu'aucune offre n'est commercialisée, et
                qu'aucune bibliothèque d'achat n'est en dépendance du binaire. La ligne
                dit l'état RÉEL, et ce qui se passera le jour où une offre ouvrira. */}
            <li className={styles.item}>
              <b>Paiement&nbsp;: aucun.</b> Aucune offre payante n&rsquo;est commercialisée
              à ce jour, aucun paiement n&rsquo;est encaissé — ni sur ce site, ni dans
              l&rsquo;application. Le jour où une vente ouvrira, elle serait traitée par la
              plateforme dans l&rsquo;application (Apple App Store, Google Play) ou par un
              prestataire de paiement sécurisé sur le site&nbsp;: dans les deux cas, nous
              ne verrions jamais ta carte bancaire, et cette politique nommerait le
              prestataire avant la première vente.
            </li>
          </ul>
          <p className={styles.body}>
            Nous pouvons divulguer des données si la loi l&rsquo;exige (réquisition
            judiciaire), ou pour protéger nos droits et la sécurité des joueurs.
          </p>
        </section>

        {/* ── 7. Transferts hors UE ───────────────────────────────────────
            Section ABSENTE du web alors que la politique embarquée la porte : une
            garantie RGPD qui n'existe que dans un des deux documents du même
            produit n'est pas une garantie. */}
        <section id="transferts" className={styles.section}>
          <p className={styles.sectionNum}>07</p>
          <h2 className={styles.sectionTitle}>Transferts hors Union européenne</h2>
          <p className={styles.body}>
            Tes données sont hébergées et traitées dans l&rsquo;Union européenne. Nous ne
            procédons à <b>aucun transfert hors UE</b> dans le cadre du fonctionnement
            normal du jeu. Si un sous-traitant venait à impliquer un tel transfert, il
            serait encadré par les garanties prévues par le RGPD (clauses contractuelles
            types de la Commission européenne) et signalé dans la présente politique.
          </p>
        </section>

        {/* ── 8. Conservation ────────────────────────────────────────── */}
        <section id="conservation" className={styles.section}>
          <p className={styles.sectionNum}>08</p>
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
              <b>Tracés de tes sorties (course à pied comme vélo)&nbsp;:</b> conservés avec
              ton compte&nbsp;; supprimés lors de la suppression du compte.
            </li>
            <li className={styles.item}>
              <b>Journaux techniques&nbsp;:</b> conservés au maximum <b>12 mois</b>, puis
              effacés.
            </li>
          </ul>
        </section>

        {/* ── 9. Droits & suppression ────────────────────────────────── */}
        <section id="droits" className={styles.section}>
          <p className={styles.sectionNum}>09</p>
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
            {/* Le texte décrivait la suppression SANS le délai de grâce ni le fait
                qu'une reconnexion l'annule, alors que c'est le comportement réel
                (migration 0046 : `request_account_deletion` pose l'échéance,
                `cancel_account_deletion` est appelée à chaque ouverture de session).
                Taire un délai de 30 jours pendant lequel les données subsistent,
                c'est décrire une suppression qui n'a pas lieu ce jour-là. */}
            <li className={styles.item}>
              <b>Suppression&nbsp;:</b> effacer ton compte et tes données. Tu peux{' '}
              <b>supprimer ton compte directement depuis l&rsquo;application</b> (Réglages
              &rsaquo; Confidentialité &rsaquo; Supprimer mon compte), avec confirmation.
              Ton profil devient <b>invisible immédiatement</b>&nbsp;; tes données sont
              ensuite purgées de nos serveurs et de ton téléphone au terme d&rsquo;un délai
              de <b>30 jours</b>. Pendant ce délai, <b>toute reconnexion annule la
              suppression</b> — et te le dit.
            </li>
            <li className={styles.item}>
              <b>Opposition & limitation&nbsp;:</b> t&rsquo;opposer à un traitement fondé
              sur l&rsquo;intérêt légitime, ou en demander la limitation.
            </li>
            {/* « couper l'accès santé » nommait un retrait de consentement qui n'existe
                pas (aucun accès santé) et omettait celui qui existe : la position,
                seule donnée sensible réellement collectée. */}
            <li className={styles.item}>
              <b>Retrait du consentement&nbsp;:</b> couper à tout moment l&rsquo;accès à
              ta position, ou les notifications, dans les réglages de ton téléphone.
            </li>
          </ul>
          <div className={styles.note}>
            <Icon name="info" size={16} />
            <span>
              Pour exercer tes droits, utilise l&rsquo;export et la suppression dans
              l&rsquo;application (Réglages, puis Confidentialité), ou écris-nous par
              courrier&nbsp;: <b>{POSTAL_CONTACT}</b>. Tu peux aussi introduire une
              réclamation auprès de la <b>CNIL</b> (cnil.fr).
            </span>
          </div>
        </section>

        {/* ── 10. Sécurité ───────────────────────────────────────────── */}
        <section id="securite" className={styles.section}>
          <p className={styles.sectionNum}>10</p>
          <h2 className={styles.sectionTitle}>Comment nous protégeons tes données</h2>
          <p className={styles.body}>
            Les échanges sont chiffrés en transit (HTTPS). L&rsquo;accès à la base de
            données est cloisonné par des règles de sécurité au niveau de chaque ligne
            (RLS)&nbsp;: un joueur ne peut jamais lire ou écrire les données d&rsquo;un
            autre. L&rsquo;écriture des sorties et des captures de territoire passe
            exclusivement par nos serveurs, jamais directement par l&rsquo;app cliente, ce
            qui empêche toute triche et protège l&rsquo;intégrité de tes données.
          </p>
        </section>

        {/* ── 11. Mineurs ────────────────────────────────────────────── */}
        <section id="mineurs" className={styles.section}>
          <p className={styles.sectionNum}>11</p>
          <h2 className={styles.sectionTitle}>Mineurs</h2>
          <p className={styles.body}>
            GRYD est réservé aux personnes âgées d&rsquo;au moins{' '}
            <b>{MIN_AGE_YEARS} ans</b>. Nous ne collectons pas sciemment de données
            concernant des personnes plus jeunes. Si tu penses qu&rsquo;un mineur de moins
            de {MIN_AGE_YEARS} ans nous a transmis des données, écris-nous par courrier
            à l&rsquo;adresse du siège (<b>{POSTAL_CONTACT}</b>) et nous les
            supprimerons.
          </p>
        </section>

        {/* ── 12. Modifications ──────────────────────────────────────── */}
        <section id="modifs" className={styles.section}>
          <p className={styles.sectionNum}>12</p>
          <h2 className={styles.sectionTitle}>Modifications de cette politique</h2>
          <p className={styles.body}>
            Nous pouvons faire évoluer cette politique. En cas de changement important, nous
            t&rsquo;en informons dans l&rsquo;application ou par e-mail. La date de dernière
            mise à jour figure en haut de cette page.
          </p>
        </section>

        {/* ── 13. Contact ────────────────────────────────────────────── */}
        <section id="contact" className={styles.section}>
          <p className={styles.sectionNum}>13</p>
          <h2 className={styles.sectionTitle}>Nous contacter</h2>
          <p className={styles.body}>
            Une question sur tes données&nbsp;? Écris-nous par courrier&nbsp;:{' '}
            <b>{POSTAL_CONTACT}</b>. Nous répondons dans les meilleurs délais et, en tout
            état de cause, dans les délais prévus par le RGPD. Tu peux aussi saisir la CNIL
            (cnil.fr).
          </p>
        </section>

        {/* ── Pied de page légal ─────────────────────────────────────── */}
        <div className={styles.legalFoot}>
          <Link href="/conditions">Conditions d&rsquo;utilisation</Link>
          <Link href="/cgv">CGV</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/">Retour à l&rsquo;accueil</Link>
          <span>SASU Nexus 1993</span>
        </div>
      </main>
    </div>
  );
}
