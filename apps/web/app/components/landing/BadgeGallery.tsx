'use client';

/**
 * Badges & Medals (AMENDEMENT-05 §3.7) — galerie depuis le VRAI catalogue
 * @klaim/shared (BADGES / BADGE_FAMILY_COLORS / BADGE_COUNT). Exception
 * polychrome AMENDEMENT-04 §1 : les couleurs de famille ne teintent QUE les
 * surfaces badge (hexagones, points de légende) — le reste de la section
 * reste charte. Rangée de raretés marketing « Road · Tempo · Race · Carbon ·
 * Elite · Legend » : common flat → legend or + halo (--rival réservé au
 * palier épique, --or au legend, AMENDEMENT-05 §1). Secrets masqués en « ? » ;
 * compteur « 59 badges · 9 secrets » CALCULÉ depuis le catalogue.
 */

import type { CSSProperties } from 'react';
import {
  BADGES,
  BADGES_BY_KEY,
  BADGE_COUNT,
  BADGE_FAMILY_COLORS,
  DECAY_DAYS,
  NIGHT_END_MIN,
  NIGHT_START_MIN,
  type BadgeDef,
  type BadgeFamily,
  type BadgeMetric,
  type BadgeTier,
} from '@klaim/shared';
import type { Lang } from './dictionary';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './BadgeGallery.module.css';

const HEX_POINTS = '12,2.5 20.2,7.25 20.2,16.75 12,21.5 3.8,16.75 3.8,7.25';

/** ~13 badges représentatifs de la planche (toutes familles, toutes raretés). */
const SHOWCASE_KEYS = [
  'fondateur',
  'route_opened_1', // « Route Opened »
  'hex_hunter_legend',
  'distance_runner_3', // « Long Run »
  'distance_runner_5', // marathon
  'defender_1',
  'raider_2',
  'zone_taker_legend',
  'crew_member_5',
  'crew_season_legend',
  'united_front_legend',
  'gryd_verified_3',
  'saison_0',
] as const;

const SHOWCASE: readonly BadgeDef[] = SHOWCASE_KEYS.flatMap((key) => {
  const badge = BADGES_BY_KEY.get(key);
  return badge ? [badge] : [];
});

const SECRETS: readonly BadgeDef[] = BADGES.filter((badge) => badge.secret);

const FAMILIES: readonly BadgeFamily[] = [
  'onboarding',
  'distance',
  'territoire',
  'attaque',
  'defense',
  'exploration',
  'routes',
  'crew',
  'performance',
  'saison',
  'verified',
  'secret',
];

/* ─── Conditions EN générées depuis le catalogue (AUCUN chiffre retapé) ──────
   Les conditions mécaniques (km, hexes, jours, membres…) sont interpolées
   depuis `threshold`/`metric` ; seules les formulations sans nombre de règle
   restent dans une map manuelle. FR = `badge.requirement` (planche gelée). */

const EN_NUM = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });
const enN = (n: number): string => EN_NUM.format(n);
/** 22 h → « 10 pm », 5 h → « 5 am » (bornes horaires du catalogue). */
const enHour = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  return h === 0 ? 'midnight' : h < 12 ? `${h} am` : h === 12 ? 'noon' : `${h - 12} pm`;
};

const EN_BY_METRIC: Partial<Record<BadgeMetric, (threshold: number) => string>> = {
  hexesCaptured: (t) => `Capture ${enN(t)} hexagon${t > 1 ? 's' : ''} (lifetime total).`,
  bestRunDistanceM: (t) => `Run ${enN(t / 1000)} km in a single run.`,
  totalDistanceM: (t) => `Run ${enN(t / 1000)} km in total.`,
  seasonDistanceM: (t) => `Run ${enN(t / 1000)} km this season.`,
  steals: (t) => `Steal ${enN(t)} hexagon${t > 1 ? 's' : ''} from rivals.`,
  defends: (t) => `Defend ${enN(t)} hexagon${t > 1 ? 's' : ''}.`,
  pioneerHexes: (t) => `Claim ${enN(t)} pioneer hexagon${t > 1 ? 's' : ''}.`,
  crewContributions: (t) => `${enN(t)} crew contributions.`,
  verifiedRuns: (t) => `${enN(t)} GRYD Verified runs.`,
  weeksActive: (t) => `${enN(t)} active weeks.`,
  routes: (t) => `Open ${enN(t)} route${t > 1 ? 's' : ''}.`,
  seasonZeroHexes: (t) => `Capture at least ${enN(t)} hex${t > 1 ? 'es' : ''} during Season 0.`,
};

/** Formulations EN non mécaniques (aucun seuil numérique dedans). */
const EN_MANUAL: Record<string, string> = {
  route_opened_1: 'Open your first route.',
  secret_silent_takeover:
    `Steal 50+ hexes on a run started between ${enHour(NIGHT_START_MIN)} and ${enHour(NIGHT_END_MIN)}.`,
};

const enRequirement = (badge: BadgeDef): string =>
  EN_MANUAL[badge.key] ?? EN_BY_METRIC[badge.metric]?.(badge.threshold) ?? badge.requirement;

/** Échelle de rareté marketing (paliers d'affichage, pas des données de jeu). */
const LADDER = [
  { id: 'road', label: 'Road' },
  { id: 'tempo', label: 'Tempo' },
  { id: 'race', label: 'Race' },
  { id: 'carbon', label: 'Carbon' },
  { id: 'elite', label: 'Elite' },
  { id: 'legend', label: 'Legend' },
] as const;

type Strings = {
  kicker: string;
  title: string;
  sub: (days: string, secrets: string) => string;
  familiesAria: string;
  families: Record<BadgeFamily, string>;
  rarities: Record<BadgeTier, string>;
  galleryAria: string;
  ladderAria: string;
  ladderCaption: string;
  counter: (total: string, secrets: string) => string;
  secretsAria: string;
  secretTitle: string;
};

const STRINGS: Record<Lang, Strings> = {
  fr: {
    kicker: 'Badges & medals',
    title: 'Le territoire s’efface. Les badges restent.',
    sub: (days, secrets) =>
      `La carte se reprend tous les ${days} jours — la collection, elle, est gravée. Cinq familles, ${secrets} secrets, et une rareté qui se mérite sur le bitume.`,
    familiesAria: 'Familles de badges',
    families: {
      onboarding: 'Onboarding',
      distance: 'Distance',
      territoire: 'Territoire',
      attaque: 'Attaque',
      defense: 'Défense',
      exploration: 'Exploration',
      routes: 'Routes',
      crew: 'Crew',
      performance: 'Performance',
      healthy: 'Bien-être',
      saison: 'Saison',
      verified: 'Verified',
      secret: 'Secret',
    },
    rarities: { road: 'Road', tempo: 'Tempo', race: 'Race', carbon: 'Carbon', elite: 'Elite', legend: 'Legend' },
    galleryAria: 'Galerie de badges représentatifs',
    ladderAria: 'Échelle des raretés',
    ladderCaption: 'Du common flat au legend doré — la rareté se voit, elle ne s’achète pas.',
    counter: (total, secrets) => `${total} badges · ${secrets} secrets`,
    secretsAria: 'Badges secrets non découverts',
    secretTitle: 'Badge secret — à découvrir en courant',
  },
  en: {
    kicker: 'Badges & medals',
    title: 'Territory fades. Badges stay.',
    sub: (days, secrets) =>
      `The map can be retaken every ${days} days — the collection is engraved for good. Five families, ${secrets} secrets, and a rarity you earn on the asphalt.`,
    familiesAria: 'Badge families',
    families: {
      onboarding: 'Onboarding',
      distance: 'Distance',
      territoire: 'Territory',
      attaque: 'Attack',
      defense: 'Defense',
      exploration: 'Exploration',
      routes: 'Routes',
      crew: 'Crew',
      performance: 'Performance',
      healthy: 'Wellness',
      saison: 'Season',
      verified: 'Verified',
      secret: 'Secret',
    },
    rarities: { road: 'Road', tempo: 'Tempo', race: 'Race', carbon: 'Carbon', elite: 'Elite', legend: 'Legend' },
    galleryAria: 'Gallery of representative badges',
    ladderAria: 'Rarity ladder',
    ladderCaption: 'From flat common to golden legend — rarity is visible, never for sale.',
    counter: (total, secrets) => `${total} badges · ${secrets} secrets`,
    secretsAria: 'Undiscovered secret badges',
    secretTitle: 'Secret badge — discover it by running',
  },
};

/** Couleur famille injectée en custom property — surfaces badge uniquement. */
const badgeTint = (badge: BadgeDef): CSSProperties =>
  ({ '--bc': badge.familyColor }) as CSSProperties;

/** Classe visuelle par TIER (§1.1) : intensité croissante road → legend. */
const TIER_CLASS: Record<BadgeTier, string> = {
  road: styles.rarity_common!,
  tempo: styles.rarity_rare!,
  race: styles.rarity_rare!,
  carbon: styles.rarity_epic!,
  elite: styles.rarity_epic!,
  legend: styles.rarity_legend!,
};

export function BadgeGallery() {
  const { lang, formatInt } = useLang();
  const t = STRINGS[lang];

  return (
    <section id="badges" className={ui.section} aria-labelledby="badges-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{t.kicker}</p>
          <h2 id="badges-title" className={ui.sectionTitle}>
            {t.title}
          </h2>
          <p className={ui.sectionSub}>{t.sub(formatInt(DECAY_DAYS), formatInt(SECRETS.length))}</p>

          {/* Légende des familles — couleurs = DATA du catalogue (exception §1). */}
          <ul className={styles.familyLegend} aria-label={t.familiesAria}>
            {FAMILIES.map((family) => (
              <li key={family} className={styles.familyItem}>
                <span
                  className={styles.familyDot}
                  style={{ background: BADGE_FAMILY_COLORS[family] }}
                  aria-hidden="true"
                />
                {t.families[family]}
              </li>
            ))}
          </ul>
        </Reveal>

        <ul className={styles.grid} aria-label={t.galleryAria}>
          {SHOWCASE.map((badge, i) => (
            <li key={badge.key} className={styles.cell}>
              <Reveal delayMs={(i % 4) * 70} className={styles.cellReveal}>
                <article
                  className={`${styles.badgeCard} ${TIER_CLASS[badge.tier] ?? ''}`}
                  style={badgeTint(badge)}
                >
                  <span className={styles.hexWrap} aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="46" height="46">
                      <polygon points={HEX_POINTS} className={styles.hexShape} />
                    </svg>
                  </span>
                  <div>
                    <span className={styles.badgeName}>{badge.name}</span>
                    <span className={styles.badgeFamily}>
                      {t.families[badge.family]} · {t.rarities[badge.tier]}
                    </span>
                    <p className={styles.badgeReq}>
                      {lang === 'en' ? enRequirement(badge) : badge.requirement}
                    </p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        {/* Rangée des raretés : common flat → legend or + halo (§3.7). */}
        <Reveal delayMs={80}>
          <div className={styles.ladder} role="list" aria-label={t.ladderAria}>
            {LADDER.map((tier) => (
              <div key={tier.id} role="listitem" className={`${styles.tier} ${styles[`tier_${tier.id}`] ?? ''}`}>
                <svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true">
                  <polygon points={HEX_POINTS} className={styles.tierShape} />
                </svg>
                <span className={styles.tierLabel}>{tier.label}</span>
              </div>
            ))}
          </div>
          <p className={styles.ladderCaption}>{t.ladderCaption}</p>
        </Reveal>

        {/* Compteur réel du catalogue + les 9 secrets en « ? ». */}
        <Reveal delayMs={120}>
          <div className={styles.footerRow}>
            <p className={styles.counter}>
              {t.counter(formatInt(BADGE_COUNT), formatInt(SECRETS.length))}
            </p>
            <ul className={styles.secretRow} aria-label={t.secretsAria}>
              {SECRETS.map((badge) => (
                <li
                  key={badge.key}
                  className={styles.secretHex}
                  style={badgeTint(badge)}
                  title={t.secretTitle}
                  aria-label={t.secretTitle}
                >
                  <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">
                    <polygon points={HEX_POINTS} className={styles.secretShape} />
                  </svg>
                  <span className={styles.secretMark} aria-hidden="true">
                    ?
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
