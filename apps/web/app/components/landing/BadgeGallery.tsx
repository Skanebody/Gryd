'use client';

/**
 * Badges & Medals (AMENDEMENT-05 §3.7) — galerie depuis le VRAI catalogue
 * @klaim/shared (BADGES / BADGE_FAMILY_COLORS / BADGE_COUNT). DA planche
 * maquette-badges-gryd.html : chaque emblème = silhouette BOUCLIER-HEXAGONE
 * tactique (BADGE_SHIELD, géométrie partagée badge-icons — jamais dupliquée),
 * anneau/glow/halo par TIER (BADGE_TIER_STYLE + BADGE_TIER_DECOR), icône
 * centrale de la planche teintée FAMILLE (badgeIconFor). Exception polychrome
 * AMENDEMENT-04 §1 : les couleurs de famille ne teintent QUE les surfaces
 * badge — le reste de la section reste charte. Rangée de raretés marketing
 * « Road · Tempo · Race · Carbon · Elite · Legend » (même emblème aux 6
 * tiers) ; secrets masqués en « ? » ; compteur CALCULÉ depuis le catalogue.
 */

import { useId, type CSSProperties } from 'react';
import {
  BADGES,
  BADGES_BY_KEY,
  BADGE_COUNT,
  BADGE_FAMILY_COLORS,
  BADGE_SHIELD,
  BADGE_TIER_DECOR,
  BADGE_TIER_STYLE,
  DECAY_DAYS,
  NIGHT_END_MIN,
  NIGHT_START_MIN,
  badgeIconFor,
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

/* ─── Emblème bouclier-hexagone (DA planche, SVG inline web) ────────────────
   Mêmes recettes DATA que le mobile (BadgeHex) : géométrie + icônes du shared,
   tier → anneau/glow/halo/décors, famille → teinte de l'icône. */

interface BadgeShieldProps {
  tier: BadgeTier;
  /** Couleur d'accent (DATA famille — accepte une var CSS charte). */
  familyColor: string;
  /** Key catalogue → icône exacte de la planche (fallback famille). */
  slug?: string;
  family?: BadgeFamily;
  /** Largeur px (hauteur = ratio 120:136 de la planche). */
  size?: number;
  /** Secret masqué : contour pointillé + « ? ». */
  hidden?: boolean;
}

function BadgeShield({ tier, familyColor, slug, family, size = 104, hidden = false }: BadgeShieldProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ts = BADGE_TIER_STYLE[tier];
  const decor = BADGE_TIER_DECOR[tier];
  const icon = badgeIconFor(slug, family);
  const plateId = `bshield-plate-${uid}`;
  const weaveId = `bshield-weave-${uid}`;
  const height = Math.round((size * BADGE_SHIELD.viewBoxHeight) / BADGE_SHIELD.viewBoxWidth);
  const decorColor = ts.ring2 ?? ts.ring;

  return (
    <svg
      viewBox={`0 0 ${BADGE_SHIELD.viewBoxWidth} ${BADGE_SHIELD.viewBoxHeight}`}
      width={size}
      height={height}
      role="img"
      aria-hidden="true"
    >
      <defs>
        {/* Plateau : dégradé sombre charte (g-dark planche). */}
        <linearGradient id={plateId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--carbone)' }} />
          <stop offset="1" style={{ stopColor: 'var(--noir)' }} />
        </linearGradient>
        {/* Tissage carbone (pattern weave planche), très subtil. */}
        {decor.weave ? (
          <pattern id={weaveId} width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" style={{ fill: 'var(--carbone2)' }} />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="7"
              style={{ stroke: 'color-mix(in srgb, var(--blanc) 6%, transparent)' }}
              strokeWidth="2.6"
            />
          </pattern>
        ) : null}
      </defs>

      {/* Halo legend derrière le bouclier. */}
      {!hidden && ts.haloOpacity > 0 && ts.glow ? (
        <ellipse
          cx={BADGE_SHIELD.halo.cx}
          cy={BADGE_SHIELD.halo.cy}
          rx={BADGE_SHIELD.halo.rx}
          ry={BADGE_SHIELD.halo.ry}
          fill={ts.glow}
          opacity={ts.haloOpacity}
        />
      ) : null}

      {/* Plateau + contour (glow drop-shadow planche pour les tiers hauts). */}
      <path
        d={BADGE_SHIELD.outline}
        fill={decor.weave ? `url(#${weaveId})` : `url(#${plateId})`}
        stroke={hidden ? familyColor : ts.ring}
        strokeWidth={hidden ? 1.4 : ts.strokeWidth}
        strokeOpacity={hidden ? 0.5 : 1}
        strokeDasharray={hidden ? '7 6' : undefined}
        strokeLinejoin="round"
        style={!hidden && ts.glow ? { filter: `drop-shadow(0 0 7px ${ts.glow})` } : undefined}
      />
      {!hidden ? <path d={BADGE_SHIELD.outline} style={{ fill: familyColor }} fillOpacity={0.08} /> : null}

      {/* Anneau intérieur des tiers hauts. */}
      {!hidden && ts.ring2 ? (
        <path d={BADGE_SHIELD.inner} fill="none" stroke={ts.ring2} strokeWidth={1.1} strokeLinejoin="round" />
      ) : null}

      {/* Décors par tier (planche) : ticks · vitesse · rayons · arcs. */}
      {!hidden && decor.ticks ? (
        <g stroke={ts.ring} strokeOpacity={0.85} strokeWidth={2} strokeLinecap="round" fill="none">
          {BADGE_SHIELD.ticks.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      ) : null}
      {!hidden && decor.speed ? (
        <g stroke={ts.ring} strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" fill="none">
          {BADGE_SHIELD.speed.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      ) : null}
      {!hidden && decor.rays ? (
        <g stroke={decorColor} strokeWidth={1.6} strokeLinecap="round" fill="none">
          {BADGE_SHIELD.rays.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      ) : null}
      {!hidden && decor.arcs ? (
        <g stroke={decorColor} strokeWidth={1.6} strokeLinecap="round" fill="none">
          {BADGE_SHIELD.arcs.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      ) : null}

      {/* Centre : « ? » (secret masqué) ou icône planche teintée famille. */}
      {hidden ? (
        <text
          x={BADGE_SHIELD.viewBoxWidth / 2}
          y={BADGE_SHIELD.halo.cy + 13}
          textAnchor="middle"
          fontSize={38}
          style={{ fill: familyColor, fontFamily: 'var(--mono)' }}
          fillOpacity={0.85}
        >
          ?
        </text>
      ) : (
        <g
          transform={`translate(${BADGE_SHIELD.icon.x},${BADGE_SHIELD.icon.y}) scale(${BADGE_SHIELD.icon.scale})`}
        >
          {icon.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              style={{ stroke: familyColor }}
              strokeWidth={BADGE_SHIELD.iconStrokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </g>
      )}
    </svg>
  );
}

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
  hexesCaptured: (t) => `Capture ${enN(t)} zone${t > 1 ? 's' : ''} (lifetime total).`,
  bestRunDistanceM: (t) => `Run ${enN(t / 1000)} km in a single run.`,
  totalDistanceM: (t) => `Run ${enN(t / 1000)} km in total.`,
  seasonDistanceM: (t) => `Run ${enN(t / 1000)} km this season.`,
  steals: (t) => `Steal ${enN(t)} zone${t > 1 ? 's' : ''} from rivals.`,
  defends: (t) => `Defend ${enN(t)} zone${t > 1 ? 's' : ''}.`,
  pioneerHexes: (t) => `Claim ${enN(t)} pioneer zone${t > 1 ? 's' : ''}.`,
  crewContributions: (t) => `${enN(t)} crew contributions.`,
  verifiedRuns: (t) => `${enN(t)} GRYD Verified runs.`,
  weeksActive: (t) => `${enN(t)} active weeks.`,
  routes: (t) => `Open ${enN(t)} route${t > 1 ? 's' : ''}.`,
  seasonZeroHexes: (t) => `Capture at least ${enN(t)} zone${t > 1 ? 's' : ''} during Season 0.`,
};

/** Formulations EN non mécaniques (aucun seuil numérique dedans). */
const EN_MANUAL: Record<string, string> = {
  route_opened_1: 'Open your first route.',
  secret_silent_takeover:
    `Steal 50+ zones on a run started between ${enHour(NIGHT_START_MIN)} and ${enHour(NIGHT_END_MIN)}.`,
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
                    <BadgeShield
                      tier={badge.tier}
                      familyColor={badge.familyColor}
                      slug={badge.key}
                      family={badge.family}
                      size={96}
                    />
                  </span>
                  <div>
                    <span className={styles.badgeName}>{badge.name}</span>
                    <span className={styles.badgeFamily}>
                      ◆ {t.families[badge.family]} · {t.rarities[badge.tier]}
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
            {/* Même emblème aux 6 tiers : l'anneau/glow/halo raconte la rareté. */}
            {LADDER.map((tier) => (
              <div key={tier.id} role="listitem" className={`${styles.tier} ${styles[`tier_${tier.id}`] ?? ''}`}>
                <BadgeShield tier={tier.id} familyColor="var(--blanc)" size={56} />
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
                  <BadgeShield tier={badge.tier} familyColor={badge.familyColor} size={34} hidden />
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
