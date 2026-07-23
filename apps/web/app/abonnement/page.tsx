'use client';

/**
 * GRYD Club — page d'offres (AMENDEMENT-31 §4, modèle de monétisation single-sub).
 * ANTI PAY-TO-WIN STRICT : une offre payante ne donne que CONFORT / INFO en
 * lecture seule / COSMÉTIQUE / STATUT — JAMAIS de territoire, de points, de
 * vitesse ni de PROTECTION (GRYD_REGLES_NON_NEGOCIABLES §A, AMENDEMENT-40 §2,
 * AMENDEMENT-45 §2).
 *
 * MODÈLE (décision fondateur) :
 *   1. FREEMIUM : le jeu (territoire, points, victoire, crew) est 100 % gratuit et complet.
 *   2. UN SEUL abonnement = « GRYD Club » → CONFORT sur SES PROPRES données :
 *      stats avancées, heatmap personnelle, historique complet, export et
 *      templates de partage. AUCUN bouclier, AUCUNE protection, AUCUN avantage
 *      territorial, AUCUNE information tactique, AUCUN gel de série réservé
 *      (STREAK_FREEZE_CLUB_PER_MONTH = STREAK_FREEZE_FREE_PER_MONTH).
 *   3. Founder Pack : achat unique à côté du sub, cosmétique + statut.
 *   4. Objets FONCTIONNELS (bouclier, gel de série, scout, alerte d'attaque) :
 *      jamais vendus, dans aucune monnaie (FUNCTIONAL_ITEM_ACQUISITION).
 *
 * ÉTAT RÉEL, 23/07/2026 (AMENDEMENT-47 — l'app ne ment jamais) :
 *   AUCUNE de ces offres n'est achetable. Aucun checkout Stripe n'est branché
 *   sur le site, aucun client d'achats intégrés n'existe dans l'application.
 *   Cette page ANNONCE des prix, elle n'en encaisse aucun — donc AUCUN bouton
 *   d'achat, AUCUN statut d'abonnement simulé, AUCUNE date de débit inventée.
 *   Ce qui est réellement possible aujourd'hui : rejoindre la waitlist.
 *   Les prix affichés sont lus dans @klaim/shared (source unique) via
 *   lib/pricing — jamais réécrits ici.
 *
 * Charte : dark-first, noir/blanc/chartreuse, JAMAIS de chartreuse sur clair.
 * Un seul CTA chartreuse sur la page = « Être prévenu à l'ouverture ».
 * Page autonome (hors LangProvider landing) : strings FR locales, réutilise les
 * tokens globals.css + les primitives ui/Reveal/Icon.
 */

import { useState } from 'react';
import { FOUNDER_PACK_ECLATS, SKUS } from '@klaim/shared';
import { CLUB_ANNUAL_SAVINGS_PCT, FOUNDER_PACK_EUR, PRICES_EUR } from '../../lib/pricing';
import { Icon } from '../components/ui/Icon';
import { Reveal } from '../components/landing/Reveal';
import ui from '../components/landing/ui.module.css';
import styles from './abonnement.module.css';

type Period = 'monthly' | 'annual';

/**
 * Prix ANNONCÉS — tous lus dans @klaim/shared (SKU_PRICES_EUR) via lib/pricing.
 * Aucun nombre en dur ici : le Founder Pack affichait 149 € contre 9,99 € dans
 * la source de vérité, un facteur 15 d'écart sur le lien public.
 */
const CLUB_MONTHLY_EUR = PRICES_EUR[SKUS.clubMonthly];
const CLUB_ANNUAL_EUR = PRICES_EUR[SKUS.clubAnnual];

/** Équivalent mensuel de l'annuel (transparence prix). */
const CLUB_ANNUAL_PER_MONTH = (CLUB_ANNUAL_EUR / 12).toFixed(2).replace('.', ',');

/** Formatage € FR (virgule décimale, pas de décimale superflue sur l'entier). */
function eur(value: number): string {
  return `${value.toFixed(2).replace('.', ',').replace(',00', '')} €`;
}

const CREED_ITEMS = ['Des zones', 'Des points', 'Des kilomètres', 'La victoire'] as const;

/**
 * Contenu du Club — MIROIR EXACT du catalogue mobile (features/arsenal/catalog.ts,
 * entrée SKUS.clubMonthly) et des CGV embarquées dans l'app. Deux listes qui
 * divergeraient seraient pires que la faute d'origine.
 *
 * RETIRÉS le 23/07/2026 :
 *   · « Gel de série » — son plafond est désormais identique pour le Club et le
 *     plan gratuit (AMENDEMENT-40 §2) : ce n'est plus un avantage ;
 *   · « Radar des zones contestées » — de l'INFORMATION TACTIQUE ; un abonnement
 *     qui en distribue vend un avantage compétitif (AMENDEMENT-45 §2 C1) ;
 *   · « Skins de territoire Neon & Carbon » — les skins s'achètent en Éclats
 *     (seed 0014), le Club n'en inclut aucun ;
 *   · « Badge Supporter permanent » — aucun badge « supporter » n'existe au
 *     catalogue : c'était un avantage inventé.
 */
const CLUB_FEATURES = [
  'Stats avancées + heatmap personnelle',
  'Historique complet + export de partage HD',
  'Templates de partage premium (stories, poster de saison)',
] as const;

/**
 * Contenu RÉEL du Founder Pack — SKU_GRANTED_ITEM_KEYS.founder_pack (seed 0014)
 * + FOUNDER_PACK_ECLATS. La première puce disait « Tout GRYD Club, à vie » :
 * FAUX. Le webhook d'achat (supabase/functions/rc_webhook) crédite des Éclats
 * et des cosmétiques pour ce SKU — il ne passe JAMAIS `is_club` à true. Une
 * offre ne promet pas ce que le code ne donne pas.
 */
const FOUNDER_FEATURES = [
  'Badge Founder — édition limitée, jamais réémise',
  'Cadre de profil Founder + titre « Founder Runner »',
  'Skins Founder Glow (territoire) et Founder Line (trace)',
  'Template de partage Founder — raconte la Saison 0',
  `${FOUNDER_PACK_ECLATS} Éclats`,
] as const;

const FREE_FEATURES = [
  'Toutes les zones capturables, partout en France',
  'Crews, War Room, missions & défense',
  'Classements de zone et de saison',
  'Carte 3D / satellite / relief',
  'Aucune limite de jeu, aucune pub',
] as const;

export default function AbonnementPage() {
  // Annuel par défaut (doc stratégie : annuel = meilleur ancrage prix).
  const [period, setPeriod] = useState<Period>('annual');

  const clubPrice = period === 'annual' ? CLUB_ANNUAL_EUR : CLUB_MONTHLY_EUR;
  const clubSuffix = period === 'annual' ? '/an' : '/mois';

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
              Le jeu reste gratuit et complet. Le Club, c&rsquo;est du confort sur{' '}
              <b>tes propres données</b> — stats, historique, partage — pour soutenir GRYD.
              Jamais un avantage sur les autres.
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
              <p className={styles.sectionKicker}>Les offres annoncées</p>
              <h2 id="plans-title" className={styles.sectionTitle}>
                Ce que coûtera le soutien
              </h2>
              <p className={styles.sectionSub}>
                Le jeu complet est gratuit. Le Club et le Founder Pack ajouteront du style, du
                partage, de l&rsquo;info et un statut — jamais un avantage de conquête. Rien
                n&rsquo;est encore en vente : les prix ci-dessous sont annoncés, pas encaissés.
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

            {/* GRYD Club — l'UNIQUE abonnement. Aucun bouton d'achat : rien n'est
                encaissable, un CTA de checkout serait un bouton mort (A-47). */}
            <Reveal delayMs={60}>
              <article className={`${styles.plan} ${styles.planHighlight}`}>
                <header className={styles.planHead}>
                  <h3 className={styles.planName}>GRYD Club</h3>
                  <span className={`${styles.badge} ${styles.badgePremium}`}>L’abonnement</span>
                </header>
                <p className={styles.tagline}>
                  Tes stats, ton historique, ton partage. Tu soutiens GRYD, pas ton classement.
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
                  Confort sur tes propres données — aucune protection, aucune info tactique,
                  aucun avantage de jeu.
                </p>
                <span className={styles.ctaState}>
                  <Icon name="info" size={16} />
                  Pas encore en vente
                </span>
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
                <span className={styles.ctaState}>
                  <Icon name="info" size={16} />
                  Pas encore en vente
                </span>
              </article>
            </Reveal>
          </div>

          {/* Objets FONCTIONNELS : jamais vendus, dans aucune monnaie (A-40 §2 / A-45 §2). */}
          <Reveal delayMs={160}>
            <p className={styles.upsellNote}>
              <Icon name="info" size={16} />
              <span>
                Bouclier de quartier, gel de série, scout et alerte d&rsquo;attaque{' '}
                <b>ne sont vendus dans aucune monnaie</b> — ni en euros, ni en Éclats, ni dans
                un pack, ni dans l&rsquo;abonnement. Protéger, être prévenu ou voir venir est un{' '}
                <b>avantage de jeu</b> : ça ne s&rsquo;achète pas.
              </span>
            </p>
          </Reveal>
        </section>

        {/* ── 3. CE QUI EST POSSIBLE AUJOURD'HUI ───────────────────────── */}
        <section className={styles.section} aria-labelledby="today-title">
          <Reveal>
            <div className={styles.sectionHead}>
              <p className={styles.sectionKicker}>État réel</p>
              <h2 id="today-title" className={styles.sectionTitle}>
                Rien n&rsquo;est en vente aujourd&rsquo;hui
              </h2>
              <p className={styles.sectionSub}>
                Le paiement n&rsquo;est branché nulle part : ni sur ce site, ni dans
                l&rsquo;application. Aucun abonnement ne peut être souscrit, aucun pack ne peut
                être acheté, aucun compte n&rsquo;est débité. Plutôt qu&rsquo;un bouton qui
                échouerait, voilà ce qui existe vraiment : la waitlist.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={60}>
            <p className={styles.ctaRow}>
              <a href="/#waitlist" className={`${ui.btnPrimary} ${styles.cta}`}>
                Être prévenu à l&rsquo;ouverture
              </a>
            </p>
          </Reveal>

          <Reveal delayMs={100}>
            <p className={styles.demoNote}>
              <Icon name="info" size={16} />
              <span>
                Les prix affichés viennent de la <b>source de vérité du jeu</b> (une seule
                définition, partagée par le site et l&rsquo;application). Ils pourront changer
                avant l&rsquo;ouverture des ventes — aucune date n&rsquo;est annoncée, et aucun
                engagement n&rsquo;est pris ici.
              </span>
            </p>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
