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
import {
  ZONE_DECAY_DAYS,
  SHIELD_DURATION_HOURS,
  SHIELD_MAX_ACTIVE_PER_WEEK,
  SHIELD_MAX_CLUSTER_HEXES,
  SKIN_PREMIUM_ECLATS_MAX,
  SKIN_PREMIUM_ECLATS_MIN,
  SKUS,
  STARTER_PACK_ECLATS,
  STREAK_FREEZE_FREE_PER_MONTH,
} from '@klaim/shared';
import { CLUB_ANNUAL_SAVINGS_PCT, PRICES_EUR, SEASON_PASS_PRICE_EUR } from '../../../lib/pricing';
import { BannerIcon, GelIcon, ScoutIcon, ShieldIcon, SkinIcon } from './ArsenalItems';
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
    sub: 'Le jeu est gratuit et complet. La boutique n’ajoute que style, confort, info et statut — jamais du terrain, des points ni de la victoire.',
    rarityAria: 'Rareté',
    gelName: 'Streak Gel',
    gelEffect: 'Gel de série : une semaine sans courir, ta streak tient au lieu de casser.',
    gelCap: 'Cap {free} / mois — identique pour tous, Club compris · jamais achetable',
    scoutName: 'Scout',
    scoutEffect:
      'Éclaireur de secteur : repère les territoires proches du decay ({days} j) avant qu’ils tombent.',
    scoutCap: 'Info uniquement · zéro zone, zéro point · jamais achetable',
    shieldName: 'Bouclier de quartier',
    shieldEffect:
      'Coque carbone sur ton secteur : jusqu’à {hexes} zones involables pendant {hours} h.',
    shieldCap: 'Cap {max} / semaine · jamais achetable, jamais dans l’abonnement',
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
    // Contenu RÉEL du pack — SKU_GRANTED_ITEM_KEYS.starter_pack + STARTER_PACK_ECLATS.
    // Ne plus annoncer le « Badge Founder » (exclusif Founder Pack) ni un
    // bouclier (objet fonctionnel, jamais vendu — A-40 §2 / A-45 §2).
    starterFeatures: [
      'Trace Neon Ivory',
      'Cadre Road',
      'Template « Première zone »',
      '{eclats} Éclats',
    ],
  },
  en: {
    kicker: 'Season shop · zero pay-to-win',
    title: 'RUNNING ARSENAL',
    sub: 'The game is free and complete. The shop only adds style, comfort, intel and status — never ground, points or the win.',
    rarityAria: 'Rarity',
    gelName: 'Streak Gel',
    gelEffect: 'Series gel: miss a week of running and your streak holds instead of breaking.',
    gelCap: 'Cap {free} / month — same for everyone, Club included · never purchasable',
    scoutName: 'Scout',
    scoutEffect: 'Sector scout: flags territories close to decay ({days} d) before they fall.',
    scoutCap: 'Intel only · zero zones, zero points · never purchasable',
    shieldName: 'District Shield',
    shieldEffect: 'Carbon shell over your sector: up to {hexes} zones unstealable for {hours} h.',
    shieldCap: 'Cap {max} / week · never purchasable, never in the subscription',
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
      'Neon Ivory trail',
      'Road frame',
      '“First zone” share template',
      '{eclats} Éclats',
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
  const { lang, copy, formatEur, formatInt } = useLang();
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
      // ANTI PAY-TO-WIN (A-40 §2) : Club et gratuit ont le MÊME cap — on
      // n'affiche donc plus deux nombres, il n'y a plus qu'un seul plafond.
      cap: fill(s.gelCap, { free: n(STREAK_FREEZE_FREE_PER_MONTH) }),
    },
    // La carte « Radar » a été SUPPRIMÉE (23/07/2026). Elle annonçait un HUD des
    // zones contestées « inclus GRYD Club » : (1) aucun objet radar n'existe au
    // catalogue — le seul objet d'information est le Scout ci-dessous ; (2) le
    // Club ne distribue plus d'information tactique (AMENDEMENT-45 §2 C1, miroir
    // exact des CGV embarquées du mobile). Vendre de l'info tactique dans un
    // abonnement, c'est vendre un avantage compétitif.
    {
      id: 'scout',
      rarity: 'race',
      Icon: ScoutIcon,
      name: s.scoutName,
      effect: fill(s.scoutEffect, { days: n(ZONE_DECAY_DAYS) }),
      cap: s.scoutCap,
    },
    {
      id: 'shield',
      rarity: 'carbon',
      Icon: ShieldIcon,
      name: s.shieldName,
      effect: fill(s.shieldEffect, {
        hexes: n(SHIELD_MAX_CLUSTER_HEXES),
        hours: n(SHIELD_DURATION_HOURS),
      }),
      // Plus AUCUN prix : le bouclier n'est vendable dans aucune monnaie
      // (FUNCTIONAL_ITEM_ACQUISITION, A-40 §2 / A-45 §2).
      cap: fill(s.shieldCap, { max: n(SHIELD_MAX_ACTIVE_PER_WEEK) }),
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

  // ANTI PAY-TO-WIN (décision fondateur) : le Club ne donne QUE du confort, de
  // l'info en lecture seule, des cosmétiques et du statut — jamais de bouclier,
  // de protection de zone ni de multiplicateur de points/foulées.
  //
  // La 5e puce « N gels de série / mois » a été SUPPRIMÉE (AMENDEMENT-40 §2) :
  // STREAK_FREEZE_CLUB_PER_MONTH vaut désormais STREAK_FREEZE_FREE_PER_MONTH,
  // donc le Club n'apporte AUCUN gel supplémentaire. La vendre comme un
  // avantage d'abonnement serait un mensonge de copie.
  const clubFeatures = copy.pricing.clubFeatures;
  // Starter Pack détaillé (AMENDEMENT-05 §3.10). Le marqueur or a disparu avec
  // le « Badge Founder » : il est EXCLUSIF au Founder Pack (seed 0014), l'annoncer
  // dans le Starter Pack était un contenu de pack inventé.
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

        {/* Freemium d'abord : le jeu complet est gratuit — le socle anti pay-to-win. */}
        <Reveal delayMs={60}>
          <aside className={styles.freeBox} aria-label={copy.pricing.freeTitle}>
            <p className={styles.freeTitle}>{copy.pricing.freeTitle}</p>
            <ul className={styles.freeList} role="list">
              {copy.pricing.freeItems.map((item) => (
                <li key={item} className={styles.freeItem}>
                  {item}
                </li>
              ))}
            </ul>
            <p className={styles.freeNote}>{copy.pricing.freeNote}</p>
          </aside>
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
          {/* État réel : rien n'est encaissable — les 3 cartes mènent à la waitlist. */}
          <p className={styles.notOnSale}>{copy.pricing.notOnSale}</p>
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
              <p className={styles.clubNote}>{copy.pricing.clubNote}</p>
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
