'use client';

/**
 * Section Pricing (#pricing) : toggle Mensuel/Annuel + 3 cartes.
 * Prix clefés sur les SKUs @klaim/shared (lib/pricing) — le « Founder Pack
 * 4,99 € » du brouillon est corrigé en Starter Pack 2,99 € (SPEC §5.1) et le
 * GRYD Pass 7,99 € est badgé « Saison 1 · à venir » (v1.1, arbitrage A2).
 * Un seul CTA chartreuse : la carte Club (highlight). Autres CTA en ghost.
 */

import { useState } from 'react';
import {
  CLUB_FOULEES_MULTIPLIER,
  SHIELD_CLUB_INCLUDED_PER_WEEK,
  SKUS,
  STARTER_PACK_ECLATS,
  STREAK_FREEZE_CLUB_PER_MONTH,
} from '@klaim/shared';
import { CLUB_ANNUAL_SAVINGS_PCT, PRICES_EUR, SEASON_PASS_PRICE_EUR } from '../../../lib/pricing';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './PricingSection.module.css';

type Period = 'monthly' | 'annual';

export function PricingSection() {
  const { copy, formatEur, formatDecimal, formatInt } = useLang();
  const [period, setPeriod] = useState<Period>('monthly');

  const clubPrice =
    period === 'monthly' ? PRICES_EUR[SKUS.clubMonthly] : PRICES_EUR[SKUS.clubAnnual];
  const clubSuffix = period === 'monthly' ? copy.pricing.perMonth : copy.pricing.perYear;

  // Features Club composées avec les constantes @klaim/shared (aucun chiffre en dur).
  const clubFeatures = [
    `${formatInt(SHIELD_CLUB_INCLUDED_PER_WEEK)} ${copy.pricing.clubFeatures[0]}`,
    copy.pricing.clubFeatures[1],
    copy.pricing.clubFeatures[2],
    `×${formatDecimal(CLUB_FOULEES_MULTIPLIER, 1)} ${copy.pricing.clubFeatures[3]}`,
    `${formatInt(STREAK_FREEZE_CLUB_PER_MONTH)} ${copy.pricing.clubFeatures[4]}`,
  ];
  const starterFeatures = [
    copy.pricing.starterFeatures[0],
    `${formatInt(STARTER_PACK_ECLATS)} ${copy.pricing.starterFeatures[1]}`,
    copy.pricing.starterFeatures[2],
  ];

  return (
    <section id="pricing" className={ui.section} aria-labelledby="pricing-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{copy.pricing.kicker}</p>
          <h2 id="pricing-title" className={ui.sectionTitle}>
            {copy.pricing.title}
          </h2>
          <p className={ui.sectionSub}>{copy.pricing.sub}</p>
        </Reveal>

        <Reveal delayMs={80}>
          <div className={styles.toggleRow}>
            <div className={styles.toggle} role="group" aria-label={copy.pricing.toggleAria}>
              {(['monthly', 'annual'] as Period[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.toggleBtn} ${period === key ? styles.toggleActive : ''}`}
                  aria-pressed={period === key}
                  onClick={() => setPeriod(key)}
                >
                  {key === 'monthly' ? copy.pricing.monthly : copy.pricing.annual}
                </button>
              ))}
            </div>
            <span className={`${styles.saveNote} ${period === 'annual' ? styles.saveVisible : ''}`}>
              {copy.pricing.save} {formatInt(CLUB_ANNUAL_SAVINGS_PCT)} %
            </span>
          </div>
        </Reveal>

        <div className={styles.grid}>
          {/* Starter Pack (SPEC §5.1 — remplace le « Founder Pack » inventé du brouillon). */}
          <Reveal>
            <article className={`${ui.card} ${styles.priceCard}`}>
              <header className={styles.cardHead}>
                <h3 className={styles.planName}>{copy.pricing.starterName}</h3>
                <span className={styles.badge}>{copy.pricing.starterBadge}</span>
              </header>
              <p className={styles.price}>
                <span className={styles.priceValue}>{formatEur(PRICES_EUR[SKUS.starterPack])}</span>
                <span className={styles.priceSuffix}>{copy.pricing.oneTime}</span>
              </p>
              <ul className={styles.features}>
                {starterFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a href="#waitlist" className={`${ui.btnGhost} ${styles.cardCta}`}>
                {copy.pricing.cta}
              </a>
            </article>
          </Reveal>

          {/* GRYD Club — carte highlight, CTA chartreuse unique de la section. */}
          <Reveal delayMs={80}>
            <article className={`${ui.card} ${styles.priceCard} ${styles.highlight}`}>
              <header className={styles.cardHead}>
                <h3 className={styles.planName}>{copy.pricing.clubName}</h3>
                <span className={`${styles.badge} ${styles.badgeClub}`}>{copy.pricing.clubBadge}</span>
              </header>
              <p className={styles.price} key={period}>
                <span className={styles.priceValue}>{formatEur(clubPrice)}</span>
                <span className={styles.priceSuffix}>{clubSuffix}</span>
              </p>
              <ul className={styles.features}>
                {clubFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a href="#waitlist" className={`${ui.btnPrimary} ${styles.cardCta}`}>
                {copy.pricing.cta}
              </a>
            </article>
          </Reveal>

          {/* GRYD Pass — v1.1 « Saison 1 » (prix spec, badge à venir). */}
          <Reveal delayMs={160}>
            <article className={`${ui.card} ${styles.priceCard} ${styles.coming}`}>
              <header className={styles.cardHead}>
                <h3 className={styles.planName}>{copy.pricing.passName}</h3>
                <span className={styles.badge}>{copy.pricing.passBadge}</span>
              </header>
              <p className={styles.price}>
                <span className={styles.priceValue}>{formatEur(SEASON_PASS_PRICE_EUR)}</span>
              </p>
              <ul className={styles.features}>
                {copy.pricing.passFeatures.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <a href="#waitlist" className={`${ui.btnGhost} ${styles.cardCta}`}>
                {copy.pricing.cta}
              </a>
            </article>
          </Reveal>
        </div>

        <Reveal delayMs={120}>
          <p className={styles.footnote}>{copy.pricing.footnote}</p>
        </Reveal>
      </div>
    </section>
  );
}
