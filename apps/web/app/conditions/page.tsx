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
 *
 * ⚠️ 26/07/2026 — LE CONTRAT PUBLIC DISAIT LE CONTRAIRE DU CONTRAT EMBARQUÉ.
 * Cette page est le MÊME document contractuel que la CGU embarquée dans le
 * binaire (`apps/mobile/src/i18n/catalog/legal.ts`, recalée le 26/07/2026).
 * Deux versions opposables qui se contredisent sont un défaut PIRE que
 * l'omission d'origine : un lecteur peut opposer celle qui l'arrange. Or le
 * vélo est une discipline RÉELLE depuis la décision fondateur du 26/07/2026
 * (`ACTIVITIES = ['run', 'bike']` et `ACTIVITY_SCOPE` dans game-rules.ts ;
 * `runs.activity` et la clé primaire COMPOSITE `hex_claims (h3index, activity)`
 * de la migration 0070, EN PRODUCTION), et le site le qualifiait encore de
 * fraude :
 *   · « Simuler une course (voiture, VÉLO, GPS falsifié…) » — la liste des
 *     pratiques interdites nommait la fonctionnalité livrée ;
 *   · « Le territoire se capture uniquement par des courses à pied réelles » ;
 *   · « un jeu de conquête de territoire par la course à pied » — l'OBJET même
 *     du contrat, donc l'endroit où l'omission coûte le plus cher ;
 *   · « GRYD se joue en courant » (clause de sécurité, alors que le risque et
 *     le code de la route ne se lisent pas pareil à vélo) et « se gagne en
 *     courant » (garantie anti-pay-to-win, qui excluait la moitié des joueurs).
 * La rédaction portée ici est CELLE de `legal.ts` (cguObjetBody, cguJeuBody,
 * cguTricheBody1/2/3, cguAboBody1/3, cguRespBody1), pas une reformulation : un
 * miroir approximatif recréerait la divergence qu'on ferme.
 *
 * L'ANTI-TRICHE N'EST PAS AFFAIBLI, IL EST DÉPLACÉ LÀ OÙ IL EST VRAI. Ce qui
 * est fautif n'a jamais été de rouler, c'est de faire passer un effort pour ce
 * qu'il n'est pas : les cinq interdits sont plus stricts qu'avant (déclarer une
 * discipline pour une autre, tout engin motorisé, GPS falsifié / tracé fabriqué
 * / sortie importée qui n'est pas la tienne, bots et modifications de l'app,
 * exploitation de faille). Et la clause DIT désormais ce que GRYD Verify ne
 * sait pas faire — aucune borne de vitesse ne sépare un cycliste rapide d'une
 * voiture EN VILLE (`game-rules.ts` : commentaire de `BIKE_POINT_MAX_SPEED_KMH`
 * et « CE QUI RESTE EN SUSPENS » §1) : promettre une détection totale serait un
 * mensonge de plus, pas une protection de plus.
 *
 * CORRECTION VOISINE, MÊME FAUTE (contenu & modération) : la section décrivait
 * des « messages de crew » et un blocage « pour ne plus voir ses messages ».
 * GRYD n'a AUCUNE messagerie — le crew échange par SIGNAUX à vocabulaire fermé,
 * et `grep -rn crew_messages apps/ packages/ supabase/functions/` ne renvoie
 * aucun code applicatif. La CGU embarquée l'a corrigé (cguContenuBody1), pas
 * celle-ci ; décrire contractuellement une surface d'UGC inexistante ouvrait en
 * plus les obligations App Store 1.2 sur du vide.
 */

import type { Metadata } from 'next';
import { MIN_AGE_YEARS } from '@klaim/shared';
import { Icon } from '../components/ui/Icon';
import { POSTAL_CONTACT } from '../../lib/legal';
import styles from '../confidentialite/legal.module.css';

// Révision du 26 juillet 2026 — le vélo est une discipline réelle (objet, règles
// du jeu, anti-triche, sécurité, anti-pay-to-win) et la messagerie de crew, qui
// n'existe pas, ne figure plus au contrat. La date suit la CGU embarquée
// (`LEGAL_LAST_UPDATED = '26/07/2026'`) : deux dates différentes sur le même
// document contractuel rouvriraient la divergence qu'on vient de fermer.
// Aucune vente n'ayant eu lieu, aucune version antérieure ne lie personne :
// le texte révisé est celui en vigueur.
const LAST_UPDATED = '26 juillet 2026';
const EFFECTIVE = '26 juillet 2026';

export const metadata: Metadata = {
  title: 'Conditions d’utilisation — GRYD',
  description:
    'Les règles d’usage de GRYD : compte, règles du jeu dans les deux disciplines (course à pied et vélo), anti-triche, contenu et modération, abonnement statut, responsabilité, résiliation.',
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
            {/* « se gagne en courant » excluait la moitié des joueurs de la garantie
                anti-pay-to-win depuis que le vélo capture (cf. cguAboBody1). */}
            <p className={styles.pledgeBody}>
              <b>Le territoire ne s&rsquo;achète jamais.</b> Tout ce qui compte au
              classement — zones, points, victoire — se gagne <b>en courant ou en
              roulant</b>. Aucun paiement ne donne le moindre avantage de jeu.
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
          {/* L'OBJET DU CONTRAT NE DÉCRIVAIT QU'UNE MOITIÉ DU JEU (cguObjetBody). */}
          <p className={styles.body}>
            GRYD, édité par <b>SASU Nexus 1993</b>, est un jeu de conquête de territoire par
            l&rsquo;effort réel, dans <b>deux disciplines&nbsp;: la course à pied et le
            vélo</b>. Chaque sortie réellement enregistrée, dans la discipline que tu
            déclares, capture ou défend du territoire sur une carte. En créant un compte ou
            en utilisant le service, tu acceptes ces conditions ainsi que notre{' '}
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
            {/* Deux corrections, mêmes que cguCompteBody : la suppression n'est armée
                QUE si une session existe, et le chemin réel de l'app est Réglages ›
                Confidentialité (c'est celui que /confidentialite publie déjà — deux
                pages du même site ne peuvent pas indiquer deux chemins). */}
            <li className={styles.item}>
              Si tu as créé un compte, tu peux le{' '}
              <b>supprimer à tout moment depuis l&rsquo;application</b> (Réglages
              &rsaquo; Confidentialité &rsaquo; Supprimer mon compte).
            </li>
          </ul>
        </section>

        {/* ── 3. Règles du jeu ────────────────────────────────────────── */}
        <section id="jeu" className={styles.section}>
          <p className={styles.sectionNum}>03</p>
          <h2 className={styles.sectionTitle}>Règles du jeu</h2>
          {/* CLAUSE LA PLUS FAUSSE DU DOCUMENT AVANT LE 26/07/2026 (« uniquement par
              des courses à pied réelles »). Chaque affirmation ci-dessous est adossée
              à un fait de code, aucune n'est une intention — cf. cguJeuBody :
              deux disciplines → ACTIVITIES ; discipline déclarée → runs.activity et
              p_activity de claim_hexes (0070) ; un hexagone / deux tenants → clé
              primaire composite (h3index, activity) ; points jamais additionnés →
              season_scores (season_id, user_id, activity) ; XP et niveau communs →
              ACTIVITY_SCOPE.xp/level = 'global' (override fondateur).
              N'EST PAS ÉCRIT, VOLONTAIREMENT : « statistiques séparées » —
              game-rules.ts le dit lui-même en suspens. */}
          <p className={styles.body}>
            GRYD se joue dans <b>deux disciplines&nbsp;: la course à pied et le vélo</b>. Le
            territoire se capture uniquement par des sorties réelles, effectuées dans la
            discipline que tu déclares avant de partir, et validées par nos serveurs. Les
            captures, points, classements et badges sont attribués
            <b> côté serveur</b>&nbsp;: l&rsquo;application ne décide jamais seule
            qu&rsquo;une zone t&rsquo;appartient.
          </p>
          <p className={styles.body}>
            Les deux disciplines forment <b>deux mondes distincts</b>&nbsp;: un même endroit
            de la carte peut être tenu par un coureur et par un cycliste sans que
            l&rsquo;un prenne la zone de l&rsquo;autre, et les points de saison d&rsquo;une
            discipline ne s&rsquo;ajoutent jamais à ceux de l&rsquo;autre. Ta progression
            personnelle — ton niveau et ton expérience — reste <b>commune aux deux</b>&nbsp;:
            un kilomètre à vélo fait progresser le même joueur qu&rsquo;un kilomètre à pied.
          </p>
          <p className={styles.body}>
            Chaque discipline a ses propres bornes de distance, de durée et
            d&rsquo;allure — celles du vélo ne sont pas celles de la course. Ces règles
            (bornes de validité, décroissance des zones non défendues) peuvent évoluer pour
            préserver l&rsquo;équilibre&nbsp;; les changements importants sont annoncés dans
            l&rsquo;app.
          </p>
        </section>

        {/* ── 4. Anti-triche ──────────────────────────────────────────── */}
        <section id="triche" className={styles.section}>
          <p className={styles.sectionNum}>04</p>
          <h2 className={styles.sectionTitle}>Anti-triche & jeu loyal</h2>
          {/* Cette clause décrivait un DÉTECTEUR DE PIÉTON (« parcours impossibles à
              pied ») et promettait plus que le moteur ne tient. Elle dit désormais ce
              que GRYD Verify fait (comparer l'effort aux bornes de la discipline
              DÉCLARÉE, `activityRules(activity)`) ET ce qu'il ne fait pas. « cadence »
              n'est plus listée : c'est un signal de PODOMÈTRE, qui ne dit rien d'une
              sortie à vélo — la politique de confidentialité, elle, continue d'en
              déclarer la collecte (un contrat n'énumère pas les capteurs, une
              politique RGPD si). */}
          <p className={styles.body}>
            GRYD repose sur des <b>efforts réels</b> et sur une <b>discipline déclarée
            sincèrement</b>. Le système «&nbsp;GRYD Verify&nbsp;» recoupe le GPS, la vitesse
            et la cohérence du mouvement avec les bornes de la discipline que tu as
            déclarée&nbsp;: il écarte ce qui n&rsquo;est pas humainement réalisable dans
            cette discipline — une allure impossible à pied, une vitesse impossible à vélo —
            ainsi que les tracés fabriqués. Il ne prétend pas faire davantage&nbsp;: aucune
            mesure de vitesse ne distingue à elle seule un cycliste rapide d&rsquo;un
            véhicule qui roule en ville. C&rsquo;est pourquoi les pratiques suivantes sont
            interdites, et sanctionnées&nbsp;:
          </p>
          <ul className={styles.list}>
            {/* La liste des fraudes NOMMAIT la fonctionnalité livrée (« vélo »). Elle
                ne perd pas un interdit : le cas visé — pédaler pour gagner des zones de
                coureur — est désormais NOMMÉ au lieu d'être déduit.
                NOTE JURIDIQUE : « véhicule à moteur » est employé au sens du code de la
                route (art. R311-1), qui en EXCLUT le cycle à pédalage assisté. Le statut
                du VAE dans le jeu n'est donc pas tranché ici : ce serait une décision de
                règles, pas de rédaction. */}
            <li className={styles.item}>
              <b>Déclarer une discipline pour une autre&nbsp;:</b> rouler en déclarant une
              course à pied, ou courir en déclarant une sortie à vélo. Le vélo est une
              discipline à part entière de GRYD, avec ses propres zones, ses propres points
              et ses propres bornes — rouler n&rsquo;est pas tricher, le faire passer pour
              une course, si.
            </li>
            <li className={styles.item}>
              Faire enregistrer par GRYD un effort produit par un <b>engin motorisé</b>&nbsp;:
              voiture, deux-roues à moteur, trottinette, gyropode ou tout autre véhicule à
              moteur.
            </li>
            <li className={styles.item}>
              <b>Falsifier sa position</b> (GPS simulé, spoofing), envoyer un tracé fabriqué,
              ou importer une sortie qui n&rsquo;est pas la tienne.
            </li>
            <li className={styles.item}>
              Utiliser des outils automatisés, bots ou modifications de l&rsquo;application.
            </li>
            <li className={styles.item}>
              Exploiter une faille pour capturer du territoire sans fournir l&rsquo;effort
              correspondant.
            </li>
          </ul>
          <p className={styles.body}>
            Une sortie douteuse peut être rejetée&nbsp;; un compte qui triche de façon
            répétée peut être suspendu ou fermé.
          </p>
        </section>

        {/* ── 5. Contenu & modération ────────────────────────────────── */}
        <section id="contenu" className={styles.section}>
          <p className={styles.sectionNum}>05</p>
          <h2 className={styles.sectionTitle}>Contenu utilisateur & modération</h2>
          {/* « MESSAGES DE CREW » DÉCRIVAIT UNE MESSAGERIE QUI N'EXISTE PAS (cf.
              l'en-tête). Le contenu réellement publié par un joueur, c'est son pseudo,
              le nom de son crew et des SIGNAUX à vocabulaire FERMÉ. */}
          <p className={styles.body}>
            Tu restes propriétaire du contenu que tu publies — ton pseudo, le nom de ton
            crew, les signaux que tu envoies à ton crew — et tu nous accordes une licence
            non exclusive et gratuite de l&rsquo;afficher aux autres joueurs pour faire
            fonctionner le jeu. <b>GRYD ne comporte pas de messagerie libre</b>&nbsp;: les
            signaux de crew sont choisis dans un vocabulaire fermé. Tu t&rsquo;engages à ne
            rien publier d&rsquo;illégal, haineux, harcelant, sexuellement explicite ou
            trompeur.
          </p>
          <p className={styles.body}>
            Nous appliquons une <b>tolérance zéro pour les contenus abusifs</b>. Depuis
            Réglages, puis Confidentialité, tu peux&nbsp;:
          </p>
          <ul className={styles.list}>
            <li className={styles.item}>
              <b>Signaler</b> un joueur ou un contenu inapproprié.
            </li>
            <li className={styles.item}>
              <b>Bloquer</b> un joueur pour ne plus interagir avec lui.
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
          {/* UNE CLAUSE DE SÉCURITÉ QUI NE CONNAÎT QU'UNE DISCIPLINE PROTÈGE MAL LA
              SECONDE : le risque, l'équipement et le code de la route ne se lisent pas
              de la même façon à vélo. Aucune obligation n'est INVENTÉE ici (pas de
              casque décrété obligatoire : la loi française ne l'impose qu'aux moins de
              12 ans) — la clause renvoie à la règle applicable (cguRespBody1). */}
          <p className={styles.body}>
            GRYD se joue dehors, <b>en courant ou à vélo</b>, dans le monde réel. <b>Ta
            sécurité passe avant le jeu.</b> Respecte le code de la route, ton environnement
            et tes limites physiques&nbsp;: ne cours pas et ne roule pas dans des lieux
            dangereux, ne regarde pas ton écran en traversant ni en roulant. À vélo,
            l&rsquo;état de ta machine, ton équipement et le respect des règles de
            circulation restent sous ta seule responsabilité. Consulte un professionnel de
            santé avant de reprendre une activité sportive intense.
          </p>
          <p className={styles.body}>
            Le service est fourni «&nbsp;en l&rsquo;état&nbsp;». Dans les limites permises
            par la loi, nous ne saurions être tenus responsables des dommages liés à ta
            pratique de la course à pied ou du vélo, à l&rsquo;usage des données de
            géolocalisation, ou à une interruption du service. Rien dans ces conditions
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
            {/* Le canal publié doit EXISTER : `support@gryd.run` était un mailto vers
                un domaine non acquis (O10). Voir lib/legal.ts. */}
            Une question sur ces conditions&nbsp;? Écris-nous par courrier&nbsp;:{' '}
            <b>{POSTAL_CONTACT}</b>.
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
