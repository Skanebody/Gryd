'use client';

/**
 * GRYD Premium — page d'abonnement (AMENDEMENT-31 §4). Façon Strava /subscribe,
 * mais ANTI PAY-TO-WIN STRICT : l'abonnement vit sur la couche STATUT /
 * COSMÉTIQUES / SUPPORTER — JAMAIS sur le jeu. Aucun avantage territorial,
 * de points ou de victoire (§A, GRYD_REGLES_NON_NEGOCIABLES, doc stratégie §3.5).
 *
 * Contenu (§4) :
 *   1. Hero « GRYD Premium » + bandeau « Le territoire ne s'achète jamais »
 *      (cohérence bannière Arsenal / PricingSection.neverBox).
 *   2. Plans : Gratuit (le JEU COMPLET) · GRYD Premium (cosmétiques, templates de
 *      partage, analytics perso, badge supporter — zéro avantage de jeu) ·
 *      Founder Pack (édition limitée). Prix ÉLEVÉ + ANNUEL par défaut.
 *   3. Timeline d'essai transparente : aujourd'hui (accès) → rappel avant fin →
 *      débit (emprunt Strava, réduit le backlash).
 *   4. « Gérer mon abonnement » : stub statut + annuler (démo).
 *
 * Charte : dark-first, noir/blanc/chartreuse, JAMAIS de chartreuse sur clair.
 * Un seul CTA chartreuse sur la page = « Activer GRYD Premium ».
 *
 * CÂBLE DÉMO : le paiement est une INTENTION câblée (toast + stub de statut).
 * En PROD, le checkout et la gestion passent par Stripe (compte + clés = O-item
 * côté fondateur, cf. AMENDEMENT-31 §4). Aucun débit réel ici.
 * Page autonome (hors LangProvider landing) : strings FR locales, réutilise les
 * tokens globals.css + les primitives ui/Reveal/Icon.
 */

import { useRef, useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { Reveal } from '../components/landing/Reveal';
import ui from '../components/landing/ui.module.css';
import styles from './abonnement.module.css';

type Period = 'monthly' | 'annual';

/**
 * Prix de la COUCHE STATUT (GRYD Premium) — distincts du GRYD Club de la landing
 * (lib/pricing, couche jeu/confort). Ici : prix ÉLEVÉ volontaire (filtre qualité,
 * doc stratégie) et ANNUEL par défaut. Local à la route pour ne pas dériver les
 * prix produit de la landing ; en prod = prix Stripe (O-item). Aucun débit réel.
 */
const PREMIUM_ANNUAL_EUR = 69;
const PREMIUM_MONTHLY_EUR = 8;
const FOUNDER_PACK_EUR = 149;

/** Économie annuel vs 12 × mensuel, en % entier (affichage toggle). */
const ANNUAL_SAVINGS_PCT = Math.round(
  (1 - PREMIUM_ANNUAL_EUR / (PREMIUM_MONTHLY_EUR * 12)) * 100,
);

/** Équivalent mensuel de l'annuel (transparence prix). */
const PREMIUM_ANNUAL_PER_MONTH = (PREMIUM_ANNUAL_EUR / 12).toFixed(2).replace('.', ',');

function eur(value: number): string {
  return `${value} €`;
}

const CREED_ITEMS = ['Des zones', 'Des points', 'Des kilomètres', 'La victoire'] as const;

const PREMIUM_FEATURES = [
  'Skins de territoire Neon & Carbon sur la carte',
  'Templates de partage premium (stories, poster de saison)',
  'Analytics perso : progression, allure, zones tenues dans le temps',
  'Bannière de crew personnalisée',
  'Badge Supporter permanent sur ton profil',
] as const;

const FOUNDER_FEATURES = [
  'Tout GRYD Premium, à vie',
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
    body: 'Tu débloques les cosmétiques, templates et analytics tout de suite. Rien n’est débité maintenant.',
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
    body: `Si tu ne fais rien, l’abonnement démarre à ${eur(PREMIUM_ANNUAL_EUR)}/an. Annulable à tout moment avant.`,
  },
];

export default function AbonnementPage() {
  // Annuel par défaut (doc stratégie : annuel = filtre qualité).
  const [period, setPeriod] = useState<Period>('annual');
  // Stub de statut d'abonnement (démo, à remplacer par l'état Stripe en prod).
  const [subscribed, setSubscribed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const premiumPrice = period === 'annual' ? PREMIUM_ANNUAL_EUR : PREMIUM_MONTHLY_EUR;
  const premiumSuffix = period === 'annual' ? '/an' : '/mois';

  // Câble DÉMO : le paiement est une intention. Prod = redirection Stripe Checkout.
  const startCheckout = (plan: 'premium' | 'founder') => {
    setSubscribed(true);
    showToast(
      plan === 'founder'
        ? 'Founder Pack réservé (démo). En vrai : paiement Stripe sécurisé.'
        : `Essai GRYD Premium lancé (démo). Aucun débit avant le jour 7.`,
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
              Couche statut · <b>zéro pay-to-win</b>
            </p>
            <h1 className={styles.heroTitle}>GRYD Premium</h1>
            <p className={styles.heroSub}>
              Le jeu reste gratuit et complet. Premium, c&rsquo;est le style, le partage et
              le statut de supporter — pour soutenir GRYD et signer ta conquête. Jamais
              l&rsquo;acheter.
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
              Tout ce qui compte au classement se gagne <b>en courant</b>. Premium habille,
              partage et informe — il ne conquiert jamais une seule zone à ta place.
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
                Le jeu complet est gratuit. Premium et Founder ajoutent du style, du
                partage et un statut — jamais un avantage de conquête.
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
                Économise {ANNUAL_SAVINGS_PCT} %
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

            {/* GRYD Premium — carte highlight, SEUL CTA chartreuse de la page. */}
            <Reveal delayMs={60}>
              <article className={`${styles.plan} ${styles.planHighlight}`}>
                <header className={styles.planHead}>
                  <h3 className={styles.planName}>GRYD Premium</h3>
                  <span className={`${styles.badge} ${styles.badgePremium}`}>Supporter</span>
                </header>
                <p className={styles.tagline}>
                  Style, partage et statut. Tu soutiens GRYD, tu signes ta carte.
                </p>
                <p className={styles.priceHint}>
                  {period === 'annual' ? (
                    <>
                      soit <b>{PREMIUM_ANNUAL_PER_MONTH} €</b>/mois, facturé à l&rsquo;année
                    </>
                  ) : (
                    <>facturé chaque mois</>
                  )}
                </p>
                <p className={styles.price} key={period}>
                  <span className={styles.priceValue}>{eur(premiumPrice)}</span>
                  <span className={styles.priceSuffix}>{premiumSuffix}</span>
                </p>
                <ul className={styles.features}>
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f} className={styles.feature}>
                      {f}
                    </li>
                  ))}
                </ul>
                <p className={styles.planGuard}>
                  Cosmétique, partage et statut uniquement — aucun avantage de jeu.
                </p>
                <button
                  type="button"
                  className={`${ui.btnPrimary} ${styles.cta}`}
                  onClick={() => startCheckout('premium')}
                >
                  Activer GRYD Premium
                </button>
              </article>
            </Reveal>

            {/* Founder Pack — édition limitée, accent or, achat unique. */}
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
                  <span className={styles.priceSuffix}>paiement unique</span>
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
                    {subscribed ? 'Premium actif' : 'Plan gratuit'}
                  </span>
                  <p className={styles.manageLine}>
                    {subscribed ? (
                      <>
                        Plan <b>GRYD Premium {period === 'annual' ? 'annuel' : 'mensuel'}</b> ·
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
                    onClick={() => startCheckout('premium')}
                  >
                    Passer Premium
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
