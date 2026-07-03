'use client';

/**
 * Hero : eyebrow live, H1 3 lignes (« Capture. » en chartreuse — emploi « gain »),
 * copy, CTA primaire (#waitlist) + « Simuler une course » (ghost, déclenche la
 * simulation du mockup), 3 stat-cards à compteurs animés, fond HexMap (réutilisé)
 * masqué radialement, et mockup téléphone.
 * Chiffres : @klaim/shared (SEASON_DURATION_WEEKS, CREW_MAX_MEMBERS) + lib/landing.
 */

import { CREW_MAX_MEMBERS, SEASON_DURATION_WEEKS } from '@klaim/shared';
import { FRANCE_CAPTURABLE_KM2 } from '../../../lib/landing';
import { HexMap } from '../HexMap';
import { useLang } from './LangProvider';
import { usePhone } from './PhoneContext';
import { useCountUp } from './useCountUp';
import { useReveal } from './useReveal';
import { Reveal } from './Reveal';
import { PhoneMockup } from './PhoneMockup';
import ui from './ui.module.css';
import styles from './Hero.module.css';

function HeroStat({
  target,
  label,
  shown,
}: {
  target: number;
  label: string;
  shown: boolean;
}) {
  const { formatInt } = useLang();
  const value = useCountUp(target, shown, { durationMs: 900 });
  return (
    <div className={styles.stat}>
      {/* Chiffres héros en graisse 400 (AMENDEMENT-03). */}
      <span className={styles.statValue}>{formatInt(value)}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

export function Hero() {
  const { copy } = useLang();
  const { requestSim } = usePhone();
  const stats = useReveal<HTMLDivElement>();

  return (
    <section className={styles.hero}>
      <div className={styles.bg} aria-hidden="true">
        <HexMap />
      </div>

      <div className={styles.inner}>
        <div className={styles.copyCol}>
          <Reveal>
            <p className={styles.eyebrow}>
              <span className={styles.liveDot} aria-hidden="true" />
              {copy.hero.eyebrow}
            </p>
          </Reveal>

          <Reveal delayMs={60}>
            <h1 className={styles.title}>
              {copy.hero.line1}
              <br />
              <span className={styles.accent}>{copy.hero.line2}</span>
              <br />
              {copy.hero.line3}
            </h1>
          </Reveal>

          <Reveal delayMs={120}>
            <p className={styles.sub}>{copy.hero.copy}</p>
          </Reveal>

          <Reveal delayMs={180}>
            <div className={styles.ctas}>
              <a href="#waitlist" className={ui.btnPrimary}>
                {copy.hero.ctaPrimary}
              </a>
              <button type="button" className={ui.btnGhost} onClick={requestSim}>
                {copy.hero.ctaSecondary}
              </button>
            </div>
          </Reveal>

          <div ref={stats.ref} className={`${styles.stats} ${stats.shown ? styles.statsShown : ''}`}>
            <HeroStat target={FRANCE_CAPTURABLE_KM2} label={copy.hero.statKm} shown={stats.shown} />
            <HeroStat target={SEASON_DURATION_WEEKS} label={copy.hero.statWeeks} shown={stats.shown} />
            <HeroStat target={CREW_MAX_MEMBERS} label={copy.hero.statCrew} shown={stats.shown} />
          </div>
        </div>

        <Reveal delayMs={150} className={styles.phoneCol}>
          <PhoneMockup />
        </Reveal>
      </div>
    </section>
  );
}
