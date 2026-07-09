'use client';

/**
 * Bandeau pricing ultra-court (#pricing) — remplace PricingSection sur la home.
 * 2 tiers + lien vers /abonnement pour le détail. Prix depuis lib/pricing.
 */

import Link from 'next/link';
import { SKUS } from '@klaim/shared';
import { PRICES_EUR } from '../../../lib/pricing';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './PricingCompact.module.css';

const STRINGS = {
  fr: {
    kicker: 'Accès',
    title: 'Pas de pay-to-win.',
    sub: 'Tu ne peux pas acheter la ville. Le Club ajoute du confort.',
    freeName: 'Gratuit',
    freePrice: '0 €',
    freeBody: 'Capture, crews, classements — tout le jeu.',
    clubName: 'GRYD Club',
    clubPrice: `${PRICES_EUR[SKUS.clubMonthly].toFixed(2).replace('.', ',')} €/mois`,
    clubBody: 'Heatmap, stats avancées, boucliers inclus.',
    footnote: 'Les Éclats n’achètent jamais de zones ni de points.',
    details: 'Voir tous les détails',
  },
  en: {
    kicker: 'Access',
    title: 'No pay-to-win.',
    sub: 'You can’t buy the city. Club adds comfort.',
    freeName: 'Free',
    freePrice: '€0',
    freeBody: 'Capture, crews, rankings — the full game.',
    clubName: 'GRYD Club',
    clubPrice: `€${PRICES_EUR[SKUS.clubMonthly].toFixed(2)}/mo`,
    clubBody: 'Heatmap, advanced stats, shields included.',
    footnote: 'Éclats never buy zones or points.',
    details: 'See full details',
  },
} as const;

export function PricingCompact() {
  const { lang } = useLang();
  const t = STRINGS[lang];

  return (
    <section id="pricing" className={ui.section} aria-labelledby="pricing-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{t.kicker}</p>
          <h2 id="pricing-title" className={ui.sectionTitle}>
            {t.title}
          </h2>
          <p className={ui.sectionSub}>{t.sub}</p>
        </Reveal>

        <div className={styles.strip}>
          <Reveal delayMs={60}>
            <article className={`${ui.card} ${styles.tier}`}>
              <div className={styles.tierHead}>
                <h3 className={styles.tierName}>{t.freeName}</h3>
                <span className={styles.tierPrice}>{t.freePrice}</span>
              </div>
              <p className={styles.tierBody}>{t.freeBody}</p>
            </article>
          </Reveal>
          <Reveal delayMs={100}>
            <article className={`${ui.card} ${styles.tier}`}>
              <div className={styles.tierHead}>
                <h3 className={styles.tierName}>{t.clubName}</h3>
                <span className={styles.tierPrice}>{t.clubPrice}</span>
              </div>
              <p className={styles.tierBody}>{t.clubBody}</p>
            </article>
          </Reveal>
        </div>

        <Reveal delayMs={140}>
          <p className={styles.footnote}>{t.footnote}</p>
          <Link href="/abonnement" className={styles.link}>
            {t.details} →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
