'use client';

/**
 * GRYD Club — page d'abonnement (AMENDEMENT-31 §4, modèle de monétisation single-sub).
 * Façon Strava /subscribe, mais ANTI PAY-TO-WIN STRICT : l'abonnement ne donne que
 * CONFORT / INFO en lecture seule / COSMÉTIQUE / STATUT — JAMAIS de territoire, de
 * points, de vitesse ni de protection (§A, GRYD_REGLES_NON_NEGOCIABLES, doc stratégie §3.5).
 *
 * MODÈLE UNIQUE (décision fondateur) :
 *   1. FREEMIUM : le jeu (territoire, points, victoire, crew) est 100 % gratuit et complet.
 *   2. UN SEUL abonnement = « GRYD Club » (4,99 €/mois, 34,99 €/an) → bonus PERMANENTS :
 *      cosmétiques (skins de territoire), info en lecture seule (heatmap/radar des zones
 *      contestées), stats avancées, templates de partage premium, gel de série (streak),
 *      badge/statut de soutien. AUCUN bouclier, AUCUNE protection, AUCUN avantage territorial.
 *   3. Founder Pack (149 €, à vie, édition limitée) reste un achat unique à côté du sub.
 *   4. Boosts & boucliers = achats in-app ponctuels, CAPÉS, jamais dans l'abonnement.
 *
 * Le SECOND abonnement « GRYD Premium » (8 €/69 €) a été SUPPRIMÉ : son contenu
 * cosmétique/statut fusionne dans GRYD Club. Il ne doit plus rester deux abonnements.
 *
 * Contenu (§4) :
 *   1. Hero « GRYD Club » + bandeau « Le territoire ne s'achète jamais ».
 *   2. Plans : Gratuit (le JEU COMPLET) · GRYD Club (le seul abonnement) ·
 *      Founder Pack (édition limitée, à vie). Prix ANNUEL par défaut.
 *   3. Timeline d'essai transparente : aujourd'hui (accès) → rappel avant fin → débit.
 *   4. « Gérer mon abonnement » : stub statut + annuler (démo).
 *
 * Charte : dark-first, noir/blanc/chartreuse, JAMAIS de chartreuse sur clair.
 * Un seul CTA chartreuse sur la page = « Activer GRYD Club ».
 *
 * CÂBLE DÉMO : le paiement est une INTENTION câblée (toast + stub de statut).
 * En PROD, le checkout et la gestion passent par Stripe / IAP (compte + clés = O-item
 * côté fondateur, cf. AMENDEMENT-31 §4). Aucun débit réel ici.
 * Page autonome (hors LangProvider landing) : strings FR locales, réutilise les
 * tokens globals.css + les primitives ui/Reveal/Icon.
 */

import { useRef, useState } from 'react';
import { SKUS } from '@klaim/shared';
import { PRICES_EUR, CLUB_ANNUAL_SAVINGS_PCT } from '../../lib/pricing';
import { Icon } from '../components/ui/Icon';
import { Reveal } from '../components/landing/Reveal';
import ui from '../components/landing/ui.module.css';
import styles from './abonnement.module.css';

type Period = 'monthly' | 'annual';

/**
 * Prix de l'UNIQUE abonnement — GRYD Club. On réutilise les prix PRODUIT de la
 * landing (lib/pricing → SKUs RevenueCat de @klaim/shared) pour ne JAMAIS dériver
 * des tarifs affichés ailleurs (aucun nombre magique). Le Founder Pack reste un
 * achat unique édité localement (édition limitée hors catalogue d'abonnement).
 * En prod = prix Stripe / IAP (O-item). Aucun débit réel.
 */
const CLUB_MONTHLY_EUR = PRICES_EUR[SKUS.clubMonthly];
const CLUB_ANNUAL_EUR = PRICES_EUR[SKUS.clubAnnual];
const FOUNDER_PACK_EUR = 149;

/** Équivalent mensuel de l'annuel (transparence prix). */
const CLUB_ANNUAL_PER_MONTH = (CLUB_ANNUAL_EUR / 12).toFixed(2).replace('.', ',');

/** Formatage € FR (virgule décimale, pas de décimale superflue sur l'entier). */
function eur(value: number): string {
  return `${value.toFixed(2).replace('.', ',').replace(',00', '')} €`;
}

const CREED_ITEMS = ['Des zones', 'Des points', 'Des kilomètres', 'La victoire'] as const;

const CLUB_FEATURES = [
  'Skins de territoire Neon & Carbon sur la carte',
  'Radar des zones contestées — info en lecture seule',
  'Stats avancées : progression, allure, zones tenues dans le temps',
  'Templates de partage premium (stories, poster de saison)',
  'Gel de série : ta streak protégée un jour off',
  'Badge Supporter permanent sur ton profil',
] as const;

const FOUNDER_FEATURES = [
  'Tout GRYD Club, à vie',
  'Blason Fondateur — édition limitée, jamais réémise',
  'Skin de territoire Founder exclusif',
  'Ton nom au générique de la Saison 0',
] as const;

const FREE_FEATURES = [
  'Toutes les zones capturables, partout en France',
  'Crews, War Room, missions & défense',
  'Classements de zone et de saison',
  'Carte 3D / satellite / relief',
  'Aucune limite de jeu, aucune pub',
] as const;

type Step = { when: string; title: string; body: string; now?: boolean };

const TRIAL_STEPS: Step[] = [
  {
    when: "Aujourd'hui",
    title: 'Accès immédiat',
    body: 'Tu débloques les cosmétiques, le radar, les stats et le gel de série tout de suite. Rien n’est débité maintenant.',
    now: true,
  },
  {
    when: 'Jour 5',
    title: 'Rappel avant la fin',
    body: 'On te prévient 2 jours avant le premier débit — par mail et notification. Zéro surprise.',
  },
  {
    when: 'Jour 7',
    title: 'Débit du plan annuel',
    body: `Si tu ne fais rien, l’abonnement démarre à ${eur(CLUB_ANNUAL_EUR)}/an. Annulable à tout moment avant.`,
  },
];

export default function AbonnementPage() {
  // Annuel par défaut (doc stratégie : annuel = meilleur ancrage prix).
  const [period, setPeriod] = useState<Period>('annual');
  // Stub de statut d'abonnement (démo, à remplacer par l'état Stripe/IAP en prod).
  const [subscribed, setSubscribed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const clubPrice = period === 'annual' ? CLUB_ANNUAL_EUR : CLUB_MONTHLY_EUR;
  const clubSuffix = period === 'annual' ? '/an' : '/mois';

  // Câble DÉMO : le paiement est une intention. Prod = redirection Stripe / IAP.
  const startCheckout = (plan: 'club' | 'founder') => {
    setSubscribed(true);
    showToast(
      plan === 'founder'
        ? 'Founder Pack réservé (démo). En vrai : paiement Stripe sécurisé.'
        : `Essai GRYD Club lancé (démo). Aucun débit avant le jour 7.`,
    );
  };

  // Câble DÉMO : gestion d'abonnement. Prod = portail client Stripe.
  const cancelSub = () => {
    setSubscribed(false);
    showToast('Abonnement annulé (démo). Tu gardes l’accès jusqu’à la fin de la période.');
  };

  return (
    <div className={styles.page}>
      <div className={styles.main}>
        {/* Barre autonome (page hors landing) : retour + marque. */}
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

        {/* ── 1. HERO ──────────────────────────────────────────────────── */}
        <Reveal>
          <header className={styles.hero}>
            <p className={styles.kicker}>
              Un seul abonnement · <b>zéro pay-to-win</b>
            </p>
            <h1 className={styles.heroTitle}>GRYD Club</h1>
            <p className={styles.heroSub}>
              Le jeu reste gratuit et complet. Le Club, c&rsquo;est le style, l&rsquo;info, les
              stats et le statut de supporter — des bonus de confort pour soutenir GRYD et
              signer ta conquête. Jamais l&rsquo;acheter.
            </p>
          </header>
        </Reveal>

        {/* Bandeau « Le territoire ne s'achète jamais » (cohérence Arsenal). */}
        <Reveal delayMs={60}>
          <aside className={styles.creed} aria-label="Le territoire ne s'achète jamais">
            <p className={styles.creedTitle}>
              <Icon name="bouclier" size={20} className={styles.creedIcon} active />
              Le territoire ne s&rsquo;achète jamais
            </p>
            <ul className={styles.creedList} role="list">
              {CREED_ITEMS.map((item) => (
                <li key={item} className={styles.creedItem}>
                  <s>{item}</s>
                </li>
              ))}
            </ul>
            <p className={styles.creedNote}>
              Tout ce qui compte au classement se gagne <b>en courant</b>. Le Club habille,
              partage et informe — il ne conquiert ni ne protège jamais une seule zone à ta
              place.
            </p>
          </aside>
        </Reveal>

        {/* ── 2. PLANS ─────────────────────────────────────────────────── */}
        <section className={styles.section} aria-labelledby="plans-title">
          <Reveal>
            <div className={styles.sectionHead}>
              <p className={styles.sectionKicker}>Les offres</p>
              <h2 id="plans-title" className={styles.sectionTitle}>
                Choisis ton niveau de soutien
              </h2>
              <p className={styles.sectionSub}>
                Le jeu complet est gratuit. Le Club et le Founder Pack ajoutent du style, du
                partage, de l&rsquo;info et un statut — jamais un avantage de conquête.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={60}>
            <div className={styles.toggleRow}>
              <div className={styles.toggle} role="group" aria-label="Période de facturation">
                {(['annual', 'monthly'] as Period[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.toggleBtn} ${period === key ? styles.toggleActive : ''}`}
                    aria-pressed={period === key}
                    onClick={() => setPeriod(key)}
                  >
                    {key === 'annual' ? 'Annuel' : 'Mensuel'}
                  </button>
                ))}
              </div>
              <span
                className={`${styles.saveNote} ${period === 'annual' ? styles.saveVisible : ''}`}
              >
                Économise {CLUB_ANNUAL_SAVINGS_PCT} %
              </span>
            </div>
          </Reveal>

          <div className={styles.plans}>
            {/* Gratuit — le JEU COMPLET. Pas de CTA d'achat : c'est un état. */}
            <Reveal>
              <article className={styles.plan}>
                <header className={styles.planHead}>
                  <h3 className={styles.planName}>Gratuit</h3>
                  <span className={styles.badge}>Le jeu complet</span>
                </header>
                <p className={styles.tagline}>
                  Toute la conquête, sans limite. C&rsquo;est GRYD, pour toujours.
                </p>
                <p className={styles.priceHint} aria-hidden="true">
                  &nbsp;
                </p>
                <p className={styles.price}>
                  <span className={`${styles.priceValue} ${styles.priceFree}`}>0 €</span>
                  <span className={styles.priceSuffix}>pour toujours</span>
                </p>
                <ul className={styles.features}>
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className={styles.feature}>
                      {f}
                    </li>
                  ))}
                </ul>
                <span className={styles.ctaState}>
                  <Icon name="badge" size={16} />
                  Déjà inclus
                </span>
              </article>
            </Reveal>

            {/* GRYD Club — l'UNIQUE abonnement, SEUL CTA chartreuse de la page. */}
            <Reveal delayMs={60}>
              <article className={`${styles.plan} ${styles.planHighlight}`}>
                <header className={styles.planHead}>
                  <h3 className={styles.planName}>GRYD Club</h3>
                  <span className={`${styles.badge} ${styles.badgePremium}`}>L’abonnement</span>
                </header>
                <p className={styles.tagline}>
                  Style, info, stats et statut. Tu soutiens GRYD, tu signes ta carte.
                </p>
                <p className={styles.priceHint}>
                  {period === 'annual' ? (
                    <>
                      soit <b>{CLUB_ANNUAL_PER_MONTH} €</b>/mois, facturé à l&rsquo;année
                    </>
                  ) : (
                    <>facturé chaque mois</>
                  )}
                </p>
                <p className={styles.price} key={period}>
                  <span className={styles.priceValue}>{eur(clubPrice)}</span>
                  <span className={styles.priceSuffix}>{clubSuffix}</span>
                </p>
                <ul className={styles.features}>
                  {CLUB_FEATURES.map((f) => (
                    <li key={f} className={styles.feature}>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className={styles.planGuard}>
                  Confort, info, cosmétique et statut — aucune protection, aucun avantage de jeu.
                </p>
                <button
                  type="button"
                  className={`${ui.btnPrimary} ${styles.cta}`}
                  onClick={() => startCheckout('club')}
                >
                  Activer GRYD Club
                </button>
              </article>
            </Reveal>

            {/* Founder Pack — édition limitée, accent or, achat unique à vie. */}
            <Reveal delayMs={120}>
              <article className={`${styles.plan} ${styles.planFounder}`}>
                <header className={styles.planHead}>
                  <h3 className={styles.planName}>Founder Pack</h3>
                  <span className={`${styles.badge} ${styles.badgeFounder}`}>Édition limitée</span>
                </header>
                <p className={styles.tagline}>
                  Pour les tout premiers. Un blason qui ne reviendra jamais.
                </p>
                <p className={styles.priceHint} aria-hidden="true">
                  &nbsp;
                </p>
                <p className={styles.price}>
                  <span className={styles.priceValue}>{eur(FOUNDER_PACK_EUR)}</span>
                  <span className={styles.priceSuffix}>à vie · paiement unique</span>
                </p>
                <ul className={styles.features}>
                  {FOUNDER_FEATURES.map((f) => (
                    <li key={f} className={styles.feature}>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className={styles.planGuard}>
                  Prestige & cosmétique — le blason n&rsquo;ajoute aucune force de conquête.
                </p>
                <button
                  type="button"
                  className={`${ui.btnGhost} ${styles.cta}`}
                  onClick={() => startCheckout('founder')}
                >
                  Réserver le Founder Pack
                </button>
              </article>
            </Reveal>
          </div>

          {/* Mention achats ponctuels : boosts & boucliers HORS abonnement, capés. */}
          <Reveal delayMs={160}>
            <p className={styles.upsellNote}>
              <Icon name="info" size={16} />
              <span>
                Boosts et boucliers de quartier restent des <b>achats in-app ponctuels</b>,
                <b> plafonnés</b> et <b>jamais inclus dans l&rsquo;abonnement</b> — ils
                protègent un temps limité, jamais du territoire ni des points.
              </span>
            </p>
          </Reveal>
        </section>

        {/* ── 3. TIMELINE D'ESSAI TRANSPARENTE ─────────────────────────── */}
        <section className={styles.section} aria-labelledby="trial-title">
          <Reveal>
            <div className={styles.sectionHead}>
              <p className={styles.sectionKicker}>Essai transparent</p>
              <h2 id="trial-title" className={styles.sectionTitle}>
                7 jours d&rsquo;essai, sans mauvaise surprise
              </h2>
              <p className={styles.sectionSub}>
                Tu vois exactement quand tu es débité — et on te prévient avant.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={60}>
            <ol className={styles.timeline}>
              {TRIAL_STEPS.map((step) => (
                <li
                  key={step.when}
                  className={`${styles.step} ${step.now ? styles.stepNow : ''}`}
                >
                  <span className={styles.stepRail} aria-hidden="true" />
                  <p className={styles.stepWhen}>{step.when}</p>
                  <p className={styles.stepTitle}>{step.title}</p>
                  <p className={styles.stepBody}>{step.body}</p>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delayMs={100}>
            <p className={styles.timelineNote}>
              Annulable en un tap avant le débit. Aucun engagement — tu gardes tes cosmétiques
              acquis, jamais tes zones (elles sont à toi tant que tu cours).
            </p>
          </Reveal>
        </section>

        {/* ── 4. GÉRER MON ABONNEMENT (stub démo) ──────────────────────── */}
        <section className={styles.section} aria-labelledby="manage-title">
          <Reveal>
            <div className={styles.sectionHead}>
              <p className={styles.sectionKicker}>Ton compte</p>
              <h2 id="manage-title" className={styles.sectionTitle}>
                Gérer mon abonnement
              </h2>
            </div>
          </Reveal>

          <Reveal delayMs={60}>
            <div className={styles.manage}>
              <div className={styles.manageRow}>
                <div className={styles.manageStatus}>
                  <span
                    className={`${styles.statusPill} ${subscribed ? '' : styles.statusPillOff}`}
                  >
                    <span className={styles.statusDot} aria-hidden="true" />
                    {subscribed ? 'Club actif' : 'Plan gratuit'}
                  </span>
                  <p className={styles.manageLine}>
                    {subscribed ? (
                      <>
                        Plan <b>GRYD Club {period === 'annual' ? 'annuel' : 'mensuel'}</b> ·
                        essai en cours · prochain débit au jour 7.
                      </>
                    ) : (
                      <>
                        Tu joues sur le <b>plan gratuit complet</b>. Aucun paiement en cours.
                      </>
                    )}
                  </p>
                </div>
                {subscribed ? (
                  <button type="button" className={styles.manageBtn} onClick={cancelSub}>
                    Annuler l&rsquo;abonnement
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.manageBtn}
                    onClick={() => startCheckout('club')}
                  >
                    Rejoindre le Club
                  </button>
                )}
              </div>
              <p className={styles.manageHint}>
                Démo : le statut ci-dessus est simulé localement. En production, la gestion
                (facture, moyen de paiement, annulation) ouvre le portail client Stripe.
              </p>
            </div>
          </Reveal>

          {/* Note câblage Stripe (O-item). */}
          <Reveal delayMs={100}>
            <p className={styles.demoNote}>
              <Icon name="info" size={16} />
              <span>
                <b>Câble démo.</b> Aucun débit réel sur cette page. Le paiement et la gestion
                d&rsquo;abonnement passeront par <b>Stripe</b> (compte + clés = point ouvert
                O-item côté fondateur).
              </span>
            </p>
          </Reveal>
        </section>
      </div>

      {/* Toast démo (intention de paiement câblée). */}
      <div
        className={`${styles.toast} ${toast ? styles.toastShown : ''}`}
        role="status"
        aria-live="polite"
      >
        {toast ? (
          <>
            <Icon name="info" size={16} className={styles.toastIcon} />
            <span>{toast}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
