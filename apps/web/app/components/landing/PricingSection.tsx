'use client';

/**
 * Section Arsenal (#pricing) — AMENDEMENT-05 §3.10 : le pricing devient une
 * boutique de jeu premium, pas du pricing SaaS.
 * - 6 objets running/tech en SVG (ArsenalItems) avec rareté Road→Legend :
 *   Elite → --rival, Legend → --or (usages autorisés AMENDEMENT-05 §1).
 * - Caps et prix en Éclats RÉELS depuis @klaim/shared (zéro nombre en dur).
 * - Encadré « jamais à vendre » : hexes/points/kilomètres/victoire barrés.
 * - Les 3 offres restent aux prix INCHANGÉS de lib/pricing (lecture seule),
 *   toggle mensuel/annuel conservé. Un seul CTA chartreuse : la carte Club.
 * Strings nouvelles en local (STRINGS fr/en) ; celles encore valides viennent
 * de dictionary via useLang() (toggle, offres, footnote).
 */

import { useState, type ComponentType, type SVGProps } from 'react';
import type { IconName } from '@klaim/shared';
import {
  ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK,
  ATTACK_ALERT_DURATION_HOURS,
  ATTACK_ALERT_ECLATS,
  ATTACK_ALERT_MAX_PER_WEEK,
  CLUB_FOULEES_MULTIPLIER,
  ZONE_DECAY_DAYS,
  SKIN_PREMIUM_ECLATS_MAX,
  SKIN_PREMIUM_ECLATS_MIN,
  SKUS,
  STARTER_PACK_ECLATS,
  STREAK_FREEZE_CLUB_PER_MONTH,
  STREAK_FREEZE_FREE_PER_MONTH,
} from '@klaim/shared';
import { CLUB_ANNUAL_SAVINGS_PCT, PRICES_EUR, SEASON_PASS_PRICE_EUR } from '../../../lib/pricing';
import { BannerIcon, GelIcon, RadarIcon, ScoutIcon, SkinIcon } from './ArsenalItems';
import { Icon } from '../ui/Icon';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './PricingSection.module.css';

type Period = 'monthly' | 'annual';
type Rarity = 'road' | 'tempo' | 'race' | 'carbon' | 'elite' | 'legend';

/** Raretés running (Road→Legend) — termes de marque, identiques FR/EN. */
const RARITY_LABELS: Record<Rarity, string> = {
  road: 'Road',
  tempo: 'Tempo',
  race: 'Race',
  carbon: 'Carbon',
  elite: 'Elite',
  legend: 'Legend',
};

/** Interpole {clefs} — les nombres sont déjà formatés par langue en amont. */
function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}

/** Strings V2 locales au composant (AMENDEMENT-05 §4 : pas de contention sur dictionary.ts). */
const STRINGS = {
  fr: {
    kicker: 'Boutique de saison · zéro pay-to-win',
    title: 'ARSENAL RUNNING',
    sub: 'Tu ne peux pas acheter la ville. Style, confort, statut — jamais la victoire.',
    rarityAria: 'Rareté',
    gelName: 'Streak Gel',
    gelEffect: 'Gel de série : une semaine sans courir, ta streak tient au lieu de casser.',
    gelCap: 'Cap {free} offert / mois · {club} avec Club',
    radarName: 'Radar',
    radarEffect: 'HUD des zones contestées autour de toi — vois où la frontière bouge.',
    radarCap: 'Inclus GRYD Club · lecture seule, ne capture rien',
    scoutName: 'Scout',
    scoutEffect:
      'Éclaireur de secteur : repère les territoires proches du decay ({days} j) avant qu’ils tombent.',
    scoutCap: 'Info uniquement · zéro zone, zéro point',
    alertName: 'Alerte d’attaque',
    alertEffect:
      'Surveille une zone fraîche : tu es prévenu si on la cible pendant {hours} h.',
    alertCap: 'Cap {max} / semaine · {club} inclus Club · {eclats} Éclats l’extra · ne bloque pas la capture',
    bannerName: 'Bannière crew',
    bannerEffect: 'Ton emblème hissé sur les secteurs de ton crew, visible par toute la ville.',
    bannerCap: 'Cosmétique pur · identité, aucun avantage',
    skinName: 'Skin Neon / Carbon',
    skinEffect: 'Ton territoire rendu Neon ou Carbon sur la carte. Ta signature, pas ta force.',
    skinCap: 'Cosmétique · {min}–{max} Éclats',
    neverTitle: 'Jamais à vendre',
    neverItems: ['Des zones', 'Des points', 'Des kilomètres', 'La victoire'],
    neverNote:
      'Tout ce qui compte au classement se gagne en courant. L’Arsenal habille, protège, informe — il ne conquiert jamais à ta place.',
    offersLabel: 'Les offres',
    starterFeatures: [
      'Skin Neon Territory',
      '{eclats} Éclats',
      '1 Alerte d’attaque',
      'Badge Founder — permanent',
    ],
  },
  en: {
    kicker: 'Season shop · zero pay-to-win',
    title: 'RUNNING ARSENAL',
    sub: 'You can’t buy the city. Style, comfort, status — never the win.',
    rarityAria: 'Rarity',
    gelName: 'Streak Gel',
    gelEffect: 'Series gel: miss a week of running and your streak holds instead of breaking.',
    gelCap: 'Cap {free} free / month · {club} with Club',
    radarName: 'Radar',
    radarEffect: 'Contested-zones HUD around you — see where the border is moving.',
    radarCap: 'Included with GRYD Club · read-only, captures nothing',
    scoutName: 'Scout',
    scoutEffect: 'Sector scout: flags territories close to decay ({days} d) before they fall.',
    scoutCap: 'Intel only · zero zones, zero points',
    alertName: 'Attack Alert',
    alertEffect:
      'Watch a fresh zone: you’re notified if it’s targeted for {hours} h.',
    alertCap: 'Cap {max} / week · {club} with Club · {eclats} Éclats extra · never blocks capture',
    bannerName: 'Crew Banner',
    bannerEffect: 'Your emblem raised over your crew’s sectors, visible to the whole city.',
    bannerCap: 'Pure cosmetic · identity, no advantage',
    skinName: 'Neon / Carbon Skin',
    skinEffect: 'Your territory rendered Neon or Carbon on the map. Your signature, not your strength.',
    skinCap: 'Cosmetic · {min}–{max} Éclats',
    neverTitle: 'Never for sale',
    neverItems: ['Zones', 'Points', 'Kilometres', 'The win'],
    neverNote:
      'Everything that counts on the leaderboard is earned by running. The Arsenal dresses, protects and informs — it never conquers for you.',
    offersLabel: 'The bundles',
    starterFeatures: [
      'Neon Territory skin',
      '{eclats} Éclats',
      '1 Attack Alert',
      'Founder badge — permanent',
    ],
  },
} as const;

type ArsenalEntry = {
  id: string;
  rarity: Rarity;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  name: string;
  effect: string;
  cap: string;
};

export function PricingSection() {
  const { lang, copy, formatEur, formatDecimal, formatInt } = useLang();
  const [period, setPeriod] = useState<Period>('monthly');
  const s = STRINGS[lang];
  const n = (v: number) => formatInt(v);

  const clubPrice =
    period === 'monthly' ? PRICES_EUR[SKUS.clubMonthly] : PRICES_EUR[SKUS.clubAnnual];
  const clubSuffix = period === 'monthly' ? copy.pricing.perMonth : copy.pricing.perYear;

  // Objets de l'Arsenal, triés par rareté croissante (Road → Legend).
  // Caps/prix Éclats = constantes @klaim/shared, jamais de nombre en dur.
  const arsenal: ArsenalEntry[] = [
    {
      id: 'gel',
      rarity: 'road',
      Icon: GelIcon,
      name: s.gelName,
      effect: s.gelEffect,
      cap: fill(s.gelCap, {
        free: n(STREAK_FREEZE_FREE_PER_MONTH),
        club: n(STREAK_FREEZE_CLUB_PER_MONTH),
      }),
    },
    {
      id: 'radar',
      rarity: 'tempo',
      Icon: RadarIcon,
      name: s.radarName,
      effect: s.radarEffect,
      cap: s.radarCap,
    },
    {
      id: 'scout',
      rarity: 'race',
      Icon: ScoutIcon,
      name: s.scoutName,
      effect: fill(s.scoutEffect, { days: n(ZONE_DECAY_DAYS) }),
      cap: s.scoutCap,
    },
    {
      id: 'attack_alert',
      rarity: 'carbon',
      Icon: RadarIcon,
      name: s.alertName,
      effect: fill(s.alertEffect, {
        hours: n(ATTACK_ALERT_DURATION_HOURS),
      }),
      cap: fill(s.alertCap, {
        max: n(ATTACK_ALERT_MAX_PER_WEEK),
        club: n(ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK),
        eclats: n(ATTACK_ALERT_ECLATS),
      }),
    },
    {
      id: 'banner',
      rarity: 'elite',
      Icon: BannerIcon,
      name: s.bannerName,
      effect: s.bannerEffect,
      cap: s.bannerCap,
    },
    {
      id: 'skin',
      rarity: 'legend',
      Icon: SkinIcon,
      name: s.skinName,
      effect: s.skinEffect,
      cap: fill(s.skinCap, {
        min: n(SKIN_PREMIUM_ECLATS_MIN),
        max: n(SKIN_PREMIUM_ECLATS_MAX),
      }),
    },
  ];

  // Rareté → classe d'accent (epic → --rival, legend → --or ; AMENDEMENT-05 §1).
  const rarityClass: Partial<Record<Rarity, string>> = {
    carbon: styles.rarityCarbon,
    elite: styles.rarityElite,
    legend: styles.rarityLegend,
  };

  // Features Club composées avec les constantes @klaim/shared (aucun chiffre en dur).
  // Icônes de renfort : alerte sur l'inclusion Club, série (flamme) sur les gels.
  const clubFeatures: { text: string; icon?: IconName }[] = [
    { text: `${formatInt(ATTACK_ALERT_CLUB_INCLUDED_PER_WEEK)} ${copy.pricing.clubFeatures[0]}`, icon: 'alerte' },
    { text: copy.pricing.clubFeatures[1] ?? '' },
    { text: copy.pricing.clubFeatures[2] ?? '' },
    { text: `×${formatDecimal(CLUB_FOULEES_MULTIPLIER, 1)} ${copy.pricing.clubFeatures[3]}` },
    { text: `${formatInt(STREAK_FREEZE_CLUB_PER_MONTH)} ${copy.pricing.clubFeatures[4]}`, icon: 'serie' },
  ];
  // Starter Pack détaillé (AMENDEMENT-05 §3.10) — le dernier item (Badge
  // Founder) porte le marqueur or, usage autorisé « badge Fondateur » (§1).
  const starterFeatures = s.starterFeatures.map((feature) =>
    fill(feature, { eclats: n(STARTER_PACK_ECLATS) }),
  );

  return (
    <section id="pricing" className={ui.section} aria-labelledby="pricing-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{s.kicker}</p>
          <h2 id="pricing-title" className={ui.sectionTitle}>
            {s.title}
          </h2>
          <p className={ui.sectionSub}>{s.sub}</p>
        </Reveal>

        {/* Vitrine d'objets — aucun CTA ici : le seul CTA chartreuse reste la carte Club. */}
        <Reveal delayMs={80}>
          <ul className={styles.arsenalGrid} role="list">
            {arsenal.map(({ id, rarity, Icon, name, effect, cap }) => (
              <li key={id} className={`${styles.itemCard} ${rarityClass[rarity] ?? ''}`}>
                <div className={styles.itemTop}>
                  <Icon className={styles.itemIcon} />
                  <span
                    className={styles.rarityChip}
                    aria-label={`${s.rarityAria} : ${RARITY_LABELS[rarity]}`}
                  >
                    {RARITY_LABELS[rarity]}
                  </span>
                </div>
                <h3 className={styles.itemName}>{name}</h3>
                <p className={styles.itemEffect}>{effect}</p>
                <p className={styles.itemCap}>{cap}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Preuve non pay-to-win : ce qui compte n'est pas à vendre (ghost barré). */}
        <Reveal delayMs={120}>
          <aside className={styles.neverBox} aria-label={s.neverTitle}>
            <p className={styles.neverTitle}>{s.neverTitle}</p>
            <ul className={styles.neverList} role="list">
              {s.neverItems.map((item) => (
                <li key={item} className={styles.neverItem}>
                  <s>{item}</s>
                </li>
              ))}
            </ul>
            <p className={styles.neverNote}>{s.neverNote}</p>
          </aside>
        </Reveal>

        <Reveal delayMs={140}>
          <p className={`${ui.monoLabel} ${styles.offersLabel}`}>{s.offersLabel}</p>
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
          {/* Starter Pack (SPEC §5.1) — contenu détaillé AMENDEMENT-05 §3.10, prix inchangé. */}
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
                {starterFeatures.map((feature, index) => (
                  <li
                    key={feature}
                    className={index === starterFeatures.length - 1 ? styles.featureGold : ''}
                  >
                    {feature}
                  </li>
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
                  <li key={feature.text} className={feature.icon ? styles.featureWithIcon : ''}>
                    {feature.icon ? (
                      <Icon name={feature.icon} size={14} className={styles.featureIcon} />
                    ) : null}
                    {feature.text}
                  </li>
                ))}
              </ul>
              <a href="#waitlist" className={`${ui.btnPrimary} ${styles.cardCta}`}>
                {copy.pricing.cta}
              </a>
            </article>
          </Reveal>

          {/* GRYD Pass — v1.1 « Saison 1 · à venir » (prix spec, badge inchangé). */}
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
