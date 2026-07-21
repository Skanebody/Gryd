'use client';

/**
 * Hero « war room » : kicker fort « LA FRANCE EST OUVERTE. » + H1 « Cours pour
 * ton crew. Conquiers ta ville. » (A-42, 2 lignes, accent chartreuse sur la 2ᵉ)
 * + sous-titre crew/quartier/saison, bandeau d'état Saison 0, 2 CTA
 * (« Réserver mon accès » chartreuse → #waitlist, « Créer mon crew » ghost →
 * #crews), 3 stat-cards à compteurs et l'illustration téléphone.
 *
 * ZÉRO DONNÉE FABRIQUÉE (décision fondateur 21/07/2026). Ont été retirés d'ici :
 * - le mini-classement « Bastille Runners / Canal Crew / Night Pacers » avec
 *   ses points : ces crews n'existent pas, ce classement n'a jamais été calculé ;
 * - les notifications flottantes (« Night Pacers passe #3 », « Paris Est
 *   attaqué ») : des événements qui n'ont jamais eu lieu, présentés en direct.
 * Les 3 stat-cards restent : ce sont des faits (superficie IGN) et des règles de
 * jeu réelles lues dans @klaim/shared, pas des mesures d'audience.
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
import { SeasonStatus } from './SeasonStatus';
import ui from './ui.module.css';
import styles from './Hero.module.css';

const STRINGS = {
  fr: {
    kicker: 'La France est ouverte.',
    sub: 'Chaque run change la carte. Rejoins ton crew, prends ton quartier, et termine la saison au sommet de la carte.',
    ctaCrew: 'Créer mon crew',
  },
  en: {
    kicker: 'France is open.',
    sub: 'Every run changes the map. Join your crew, take your neighbourhood, and finish the season on top of the map.',
    ctaCrew: 'Create my crew',
  },
} as const;

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
  const { lang, copy } = useLang();
  const S = STRINGS[lang];
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
            <h1 className={styles.title}>
              {/* Kicker fort V2 — le vrai statement, au-dessus de la tagline 2 lignes. */}
              <span className={styles.kicker}>{S.kicker}</span>
              {copy.hero.line1}
              <br />
              {/* Accent chartreuse sur la 2ᵉ ligne (A-42) : « Conquiers ta ville. » */}
              <span className={styles.accent}>{copy.hero.line2}</span>
            </h1>
          </Reveal>

          <Reveal delayMs={80}>
            <p className={styles.sub}>{S.sub}</p>
          </Reveal>

          <Reveal delayMs={140}>
            <SeasonStatus />
          </Reveal>

          <Reveal delayMs={200}>
            <div className={styles.ctas}>
              {/* 1 seul CTA chartreuse par section : celui-ci. */}
              <a href="#waitlist" className={ui.btnPrimary}>
                {copy.hero.ctaPrimary}
              </a>
              <a href="#crews" className={ui.btnGhost}>
                {S.ctaCrew}
              </a>
            </div>
          </Reveal>

          <div ref={stats.ref} className={`${styles.stats} ${stats.shown ? styles.statsShown : ''}`}>
            <HeroStat target={FRANCE_CAPTURABLE_KM2} label={copy.hero.statKm} shown={stats.shown} />
            <HeroStat target={SEASON_DURATION_WEEKS} label={copy.hero.statWeeks} shown={stats.shown} />
            <HeroStat target={CREW_MAX_MEMBERS} label={copy.hero.statCrew} shown={stats.shown} />
          </div>
        </div>

        <Reveal delayMs={150} className={styles.phoneCol}>
          <div className={styles.phoneStage}>
            <PhoneMockup />
          </div>

          <div className={styles.simRow}>
            {/* Rejoue l'illustration de capture du téléphone (PhoneContext.simTick). */}
            <button type="button" className={styles.simBtn} onClick={requestSim}>
              {copy.hero.ctaSecondary}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
