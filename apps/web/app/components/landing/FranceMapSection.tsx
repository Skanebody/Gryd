'use client';

/**
 * Section Carte V2 « Battle Map France » (#map, AMENDEMENT-05 §3.4).
 * La carte est la VRAIE géographie de France (@klaim/shared/france-geo :
 * contours Etalab/IGN simplifiés + 337 cellules H3 res 4 réelles) rendue en
 * plateau : quadrillage neutre agrégé (un seul <path>), territoires par
 * faction (mon crew chartreuse autour de Paris + Lille, crew rival violet à
 * Lyon, zone contestée hachurée ennemi+chartreuse vers Lille/Rouen), secteur
 * protégé (double contour blanc), secteur en decay, routes ouvertes entre
 * villes réelles, avant-postes Dieppe/Offranville et zone pionnière.
 * Villes = FRANCE_CITIES (positions réelles projetées, plus aucun % en dur).
 * Légende complète + statuts par ville (chips au hover ET liste) + compteur
 * 551 695 km² + City Activation. Les 4 zone-tabs V1 sont conservés (récit
 * « la densité définit le niveau de guerre ») et le pont PhoneContext
 * (hover ville → téléphone du hero) reste intact.
 * Couleurs de conflit (--ennemi/--rival) : états de jeu uniquement (§1).
 */

import { useRef, useState } from 'react';
import {
  CITIES,
  FRANCE_CITIES,
  FRANCE_HEX_CELLS,
  FRANCE_HEX_R,
  FRANCE_OUTLINE,
  FRANCE_VIEWBOX,
  type IconName,
  type ZoneDensity,
} from '@klaim/shared';
import { FRANCE_CAPTURABLE_KM2 } from '../../../lib/landing';
import { useLang } from './LangProvider';
import { usePhone } from './PhoneContext';
import { Reveal } from './Reveal';
import { useCountUp } from './useCountUp';
import { useReveal } from './useReveal';
import { CityActivation } from './CityActivation';
import { Icon } from '../ui/Icon';
import ui from './ui.module.css';
import styles from './FranceMapSection.module.css';

const ZONE_KEYS: ZoneDensity[] = ['active', 'emerging', 'pioneer', 'wild'];

type DotId = 'paris' | 'lille' | 'rouen' | 'dieppe' | 'caux' | 'lyon' | 'bordeaux';
type StatusBadge = 'active' | 'emerging' | 'pioneer' | 'wild' | 'contested' | 'dominated';

/* ─── Géométrie (module scope, déterministe → SSR stable) ────────────────── */

/** Ville projetée (france-geo) — fallback neutre si l'id manquait au généré. */
const geo = (id: string): { x: number; y: number } => FRANCE_CITIES[id] ?? { x: 0, y: 0 };

const PARIS = geo('paris');
const LILLE = geo('lille');
const ROUEN = geo('rouen');
const DIEPPE = geo('dieppe');
const LYON = geo('lyon');
const BORDEAUX = geo('bordeaux');
const OFFRANVILLE = geo('offranville');
/** Pays de Caux = région (pas une ville du référentiel) : centroïde dérivé Dieppe/Rouen. */
const CAUX = { x: (DIEPPE.x + ROUEN.x) / 2 - 32, y: (DIEPPE.y + ROUEN.y) / 2 };

/** Contours réels (continent, îles, Corse) → un seul path multi-sous-chemins. */
const FRANCE_D = FRANCE_OUTLINE.map(
  (poly) => `M${poly.map(([x, y]) => `${x} ${y}`).join('L')}Z`,
).join('');

/** Hexagone pointy-top de rayon r autour d'un centre — sous-chemin SVG. */
const hexPathD = (cx: number, cy: number, r: number): string => {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
  });
  return `M${pts.join('L')}Z`;
};

/** Quadrillage neutre : les 337 cellules H3 agrégées en UN SEUL path (perf). */
const NEUTRAL_GRID_D = FRANCE_HEX_CELLS.map((c) => hexPathD(c.x, c.y, FRANCE_HEX_R)).join('');

type Cell = { h: string; x: number; y: number };

const dist2 = (c: Cell, x: number, y: number): number => (c.x - x) ** 2 + (c.y - y) ** 2;

/** Les `count` cellules H3 réelles les plus proches d'un point (hors exclusions). */
function cellsNear(x: number, y: number, count: number, exclude?: ReadonlySet<string>): Cell[] {
  return FRANCE_HEX_CELLS.filter((c) => !exclude?.has(c.h))
    .slice()
    .sort((a, b) => dist2(a, x, y) - dist2(b, x, y))
    .slice(0, count);
}

const ids = (cells: readonly Cell[]): Set<string> => new Set(cells.map((c) => c.h));

/* Attribution des factions (démo fictive assumée, cellules H3 RÉELLES). */
const MINE_CELLS = [...cellsNear(PARIS.x, PARIS.y, 6), ...cellsNear(LILLE.x, LILLE.y, 2)];
const MINE_IDS = ids(MINE_CELLS);
const CONTESTED_CELLS = [
  ...cellsNear(LILLE.x, LILLE.y, 3, MINE_IDS),
  ...cellsNear(ROUEN.x, ROUEN.y, 1, MINE_IDS),
];
const TAKEN_IDS = new Set([...MINE_IDS, ...ids(CONTESTED_CELLS)]);
const RIVAL_CELLS = cellsNear(LYON.x, LYON.y, 5);
const DECAY_CELLS = cellsNear(PARIS.x + 48, PARIS.y + 62, 2, TAKEN_IDS);
/** Secteur protégé (double contour blanc) : une cellule en bordure du cluster Paris. */
const PROTECTED_CELL = cellsNear(PARIS.x - 46, PARIS.y + 38, 1, TAKEN_IDS)[0] ?? { h: '', x: PARIS.x, y: PARIS.y };

/** Route ouverte entre deux villes : quadratique légèrement incurvée. */
const route = (a: { x: number; y: number }, b: { x: number; y: number }, bend = 0.12): string => {
  const cx = (a.x + b.x) / 2 - (b.y - a.y) * bend;
  const cy = (a.y + b.y) / 2 + (b.x - a.x) * bend;
  return `M ${a.x} ${a.y} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x} ${b.y}`;
};

/** Routes-glow : Paris↔Lille, Paris↔Lyon, Paris↔Rouen, Dieppe↔Rouen. */
const ROUTES = [route(PARIS, LILLE), route(PARIS, LYON), route(PARIS, ROUEN), route(ROUEN, DIEPPE, 0.2)];

/** Avant-postes (présence construite) : Dieppe et Offranville. */
const OUTPOSTS = [DIEPPE, OFFRANVILLE];

/**
 * Villes du plateau — positions RÉELLES (france-geo), densité (pont
 * PhoneContext) et badge de statut. Démo fictive assumée, déterministe
 * (Paris/Lille = CITIES de @klaim/shared, seedées `active` Saison 0).
 */
const CITY_DOTS: { id: DotId; name: string; density: ZoneDensity; badge: StatusBadge; x: number; y: number }[] = [
  { id: 'paris', name: CITIES.paris.name, density: 'active', badge: 'active', x: PARIS.x, y: PARIS.y },
  { id: 'lille', name: 'Lille', density: 'active', badge: 'contested', x: LILLE.x, y: LILLE.y },
  { id: 'rouen', name: 'Rouen', density: 'emerging', badge: 'emerging', x: ROUEN.x, y: ROUEN.y },
  { id: 'dieppe', name: 'Dieppe', density: 'pioneer', badge: 'pioneer', x: DIEPPE.x, y: DIEPPE.y },
  { id: 'caux', name: 'Pays de Caux', density: 'pioneer', badge: 'pioneer', x: CAUX.x, y: CAUX.y },
  { id: 'lyon', name: 'Lyon', density: 'emerging', badge: 'dominated', x: LYON.x, y: LYON.y },
  { id: 'bordeaux', name: 'Bordeaux', density: 'wild', badge: 'wild', x: BORDEAUX.x, y: BORDEAUX.y },
];

const pctLeft = (x: number): string => `${((x / FRANCE_VIEWBOX.w) * 100).toFixed(2)}%`;
const pctTop = (y: number): string => `${((y / FRANCE_VIEWBOX.h) * 100).toFixed(2)}%`;

/** Légende complète — mini-icônes de renfort (charte « icône + texte court »). */
const LEGEND_ITEMS: { key: 'mine' | 'rival' | 'neutral' | 'contested' | 'protected' | 'decay'; sw: string; icon: IconName; tint: string }[] = [
  { key: 'mine', sw: 'swMine', icon: 'carte', tint: 'tintMine' },
  { key: 'rival', sw: 'swRival', icon: 'carte', tint: 'tintRival' },
  { key: 'neutral', sw: 'swNeutral', icon: 'carte', tint: 'tintNeutral' },
  { key: 'contested', sw: 'swContested', icon: 'alerte', tint: 'tintEnemy' },
  { key: 'protected', sw: 'swProtected', icon: 'bouclier', tint: 'tintWhite' },
  { key: 'decay', sw: 'swDecay', icon: 'historique', tint: 'tintNeutral' },
];

const STRINGS = {
  fr: {
    title: 'La carte est ouverte. Chaque run peut changer la frontière.',
    narration:
      'Paris devient une bataille. Dieppe devient un avant-poste. Offranville devient une terre pionnière. Chaque village peut écrire sa carte.',
    boardAria:
      'Plateau de jeu : vraie carte de France quadrillée en hexagones, avec territoires de crews, zone contestée, routes, avant-postes et zone pionnière',
    legendTitle: 'Légende',
    legend: {
      mine: 'À moi',
      rival: 'Rival',
      neutral: 'Neutre',
      contested: 'Contesté',
      protected: 'Protégé',
      decay: 'Decay',
    },
    badges: {
      active: 'ACTIVE',
      emerging: 'ÉMERGENTE',
      pioneer: 'PIONNIÈRE',
      wild: 'SAUVAGE',
      contested: 'CONTESTÉE',
      dominated: 'DOMINÉE',
    },
    cityStatuses: {
      paris: 'Zone active',
      lille: 'Guerre ouverte',
      rouen: 'Émergente',
      dieppe: 'Avant-postes',
      caux: 'Pionnier',
      lyon: 'Secteur rival',
      bordeaux: 'Terre sauvage',
    },
    citiesTitle: 'Statuts de la carte',
    kmLabel: 'km² ouverts à la capture',
  },
  en: {
    title: 'The map is open. Every run can move the border.',
    narration:
      'Paris becomes a battle. Dieppe becomes an outpost. Offranville becomes pioneer land. Every village can write its own map.',
    boardAria:
      'Game board: real map of France gridded with hexagons, with crew territories, contested zone, routes, outposts and pioneer land',
    legendTitle: 'Legend',
    legend: {
      mine: 'Mine',
      rival: 'Rival',
      neutral: 'Neutral',
      contested: 'Contested',
      protected: 'Protected',
      decay: 'Decay',
    },
    badges: {
      active: 'ACTIVE',
      emerging: 'EMERGING',
      pioneer: 'PIONEER',
      wild: 'WILD',
      contested: 'CONTESTED',
      dominated: 'DOMINATED',
    },
    cityStatuses: {
      paris: 'Active zone',
      lille: 'Open war',
      rouen: 'Emerging',
      dieppe: 'Outposts',
      caux: 'Pioneer',
      lyon: 'Rival sector',
      bordeaux: 'Wild land',
    },
    citiesTitle: 'Map statuses',
    kmLabel: 'km² open for capture',
  },
} as const;

export function FranceMapSection() {
  const { copy, lang, formatInt } = useLang();
  const { setZone } = usePhone();
  const s = STRINGS[lang];
  const [tab, setTab] = useState<ZoneDensity>('active');
  const [hovered, setHovered] = useState<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const counterReveal = useReveal<HTMLDivElement>();
  const kmValue = useCountUp(FRANCE_CAPTURABLE_KM2, counterReveal.shown, { durationMs: 900 });

  const badgeClassOf = (badge: StatusBadge): string => {
    if (badge === 'active') return styles.badgeActive ?? '';
    if (badge === 'contested') return styles.badgeContested ?? '';
    if (badge === 'dominated') return styles.badgeDominated ?? '';
    return '';
  };

  const selectTab = (key: ZoneDensity) => setTab(key);

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = (index + delta + ZONE_KEYS.length) % ZONE_KEYS.length;
    const key = ZONE_KEYS[next];
    if (!key) return;
    setTab(key);
    tabRefs.current[next]?.focus();
  };

  /** Pont PhoneContext (contrat V1 conservé) : hover/focus ville → téléphone du hero. */
  const onCityEnter = (index: number) => {
    setHovered(index);
    const city = CITY_DOTS[index];
    if (city) setZone({ name: city.name, density: city.density });
  };

  const zone = copy.zones[tab];
  const hoveredCity = hovered !== null ? CITY_DOTS[hovered] : undefined;

  return (
    <section id="map" className={ui.section} aria-labelledby="map-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{copy.map.kicker}</p>
          <h2 id="map-title" className={ui.sectionTitle}>
            {s.title}
          </h2>
          <p className={ui.sectionSub}>{s.narration}</p>
        </Reveal>

        <div className={styles.grid}>
          <Reveal className={styles.left}>
            {/* Les 4 zone-tabs V1, intégrés au récit du plateau : la densité définit le niveau de guerre. */}
            <p className={styles.tabsIntro}>{copy.map.sub}</p>
            <div className={styles.tabs} role="tablist" aria-label={copy.map.tablistAria}>
              {ZONE_KEYS.map((key, i) => (
                <button
                  key={key}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`zone-tab-${key}`}
                  aria-selected={tab === key}
                  aria-controls="zone-panel"
                  tabIndex={tab === key ? 0 : -1}
                  className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
                  onClick={() => selectTab(key)}
                  onKeyDown={(event) => onTabKeyDown(event, i)}
                >
                  {copy.zones[key].name}
                </button>
              ))}
            </div>

            <div
              key={tab}
              id="zone-panel"
              role="tabpanel"
              aria-labelledby={`zone-tab-${tab}`}
              className={`${ui.card} ${styles.panel}`}
            >
              <h3 className={styles.panelTitle}>{zone.name}</h3>
              <p className={styles.panelDesc}>{zone.desc}</p>
              <dl className={styles.metrics}>
                {zone.metrics.map((metric) => (
                  <div key={metric.label} className={styles.metric}>
                    <dt className={ui.monoLabel}>{metric.label}</dt>
                    <dd className={styles.metricValue}>{metric.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Statuts par ville (liste) — le hover pilote aussi le téléphone du hero. */}
            <p className={`${ui.monoLabel} ${styles.cityListTitle}`}>{s.citiesTitle}</p>
            <ul className={styles.cityList}>
              {CITY_DOTS.map((city, i) => (
                <li key={city.id}>
                  <button
                    type="button"
                    className={styles.cityChip}
                    onMouseEnter={() => onCityEnter(i)}
                    onFocus={() => onCityEnter(i)}
                    onMouseLeave={() => setHovered(null)}
                    onBlur={() => setHovered(null)}
                    onClick={() => onCityEnter(i)}
                  >
                    <span className={styles.chipName}>{city.name}</span>
                    <span className={styles.chipStatus}>{s.cityStatuses[city.id]}</span>
                    <span className={`${styles.badge} ${badgeClassOf(city.badge)}`}>
                      {s.badges[city.badge]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delayMs={100} className={styles.right}>
            <div className={styles.mapBox}>
              <div className={styles.mapInner}>
                <svg
                  viewBox={`0 0 ${FRANCE_VIEWBOX.w} ${FRANCE_VIEWBOX.h}`}
                  className={styles.franceSvg}
                  role="img"
                  aria-label={s.boardAria}
                >
                  <defs>
                    {/* Clip = vrais contours : aucun hex ne déborde de la silhouette. */}
                    <clipPath id="gryd-map-clip">
                      <path d={FRANCE_D} />
                    </clipPath>
                    {/* Hachures « contesté » : ennemi + chartreuse (AMENDEMENT-05 §1). */}
                    <pattern
                      id="gryd-map-contested"
                      width="8"
                      height="8"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width="8" height="8" fill="var(--ennemi-14)" />
                      <line x1="1" y1="0" x2="1" y2="8" stroke="var(--ennemi)" strokeWidth="1.4" opacity="0.5" />
                      <line x1="5" y1="0" x2="5" y2="8" stroke="var(--ch)" strokeWidth="1.4" opacity="0.4" />
                    </pattern>
                  </defs>

                  {/* Vraie silhouette (continent + îles + Corse). */}
                  <path d={FRANCE_D} className={styles.france} />

                  <g clipPath="url(#gryd-map-clip)">
                    {/* Quadrillage H3 res 4 neutre — un seul path agrégé (perf). */}
                    <path d={NEUTRAL_GRID_D} className={styles.hexNeutral} />

                    {/* Territoire de MON crew : Paris + Lille (chartreuse — doctrine C.3). */}
                    {MINE_CELLS.map((c) => (
                      <path key={c.h} d={hexPathD(c.x, c.y, FRANCE_HEX_R)} className={styles.terrMine} />
                    ))}
                    {/* Secteurs en decay (pâlis, pointillés) au sud-est du cluster Paris. */}
                    {DECAY_CELLS.map((c) => (
                      <path key={c.h} d={hexPathD(c.x, c.y, FRANCE_HEX_R)} className={styles.terrDecay} />
                    ))}
                    {/* Secteur protégé : double contour blanc (bouclier). */}
                    <path
                      d={hexPathD(PROTECTED_CELL.x, PROTECTED_CELL.y, FRANCE_HEX_R)}
                      className={styles.terrProtected}
                    />
                    <path
                      d={hexPathD(PROTECTED_CELL.x, PROTECTED_CELL.y, FRANCE_HEX_R - 5)}
                      className={styles.terrProtectedInner}
                    />
                    {/* Crew rival autour de Lyon (violet — état de jeu). */}
                    {RIVAL_CELLS.map((c) => (
                      <path key={c.h} d={hexPathD(c.x, c.y, FRANCE_HEX_R)} className={styles.terrRival} />
                    ))}
                    {/* Zone contestée vers Lille/Rouen : hachures ennemi + chartreuse. */}
                    {CONTESTED_CELLS.map((c) => (
                      <path
                        key={c.h}
                        d={hexPathD(c.x, c.y, FRANCE_HEX_R)}
                        fill="url(#gryd-map-contested)"
                        className={styles.terrContested}
                      />
                    ))}
                    {/* Terre pionnière — Pays de Caux (contour pointillé). */}
                    <ellipse cx={CAUX.x} cy={CAUX.y} rx="44" ry="27" className={styles.pioneerZone} />
                  </g>

                  {/* Routes ouvertes (glow) entre villes réelles. */}
                  {ROUTES.map((d) => (
                    <path key={d} d={d} className={styles.route} />
                  ))}

                  {/* Avant-postes : Dieppe et Offranville (points cerclés). */}
                  <g className={styles.outposts} aria-hidden="true">
                    {OUTPOSTS.map((p) => (
                      <g key={`${p.x}-${p.y}`}>
                        <circle cx={p.x} cy={p.y} r="6.5" className={styles.outpost} />
                        <circle cx={p.x} cy={p.y} r="2.2" className={styles.outpostCore} />
                      </g>
                    ))}
                  </g>
                </svg>

                {CITY_DOTS.map((city, i) => (
                  <button
                    key={city.id}
                    type="button"
                    className={`${styles.cityDot} ${styles[city.density] ?? ''} ${hovered === i ? styles.dotHot : ''}`}
                    style={{ left: pctLeft(city.x), top: pctTop(city.y) }}
                    aria-label={`${city.name} · ${s.cityStatuses[city.id]} · ${s.badges[city.badge]}`}
                    onMouseEnter={() => onCityEnter(i)}
                    onFocus={() => onCityEnter(i)}
                    onMouseLeave={() => setHovered(null)}
                    onBlur={() => setHovered(null)}
                    onClick={() => onCityEnter(i)}
                  >
                    <span className={styles.dotCore} aria-hidden="true" />
                  </button>
                ))}

                {hoveredCity ? (
                  <div
                    className={styles.tooltip}
                    style={{ left: pctLeft(hoveredCity.x), top: pctTop(hoveredCity.y) }}
                    role="status"
                  >
                    {hoveredCity.name} · {s.cityStatuses[hoveredCity.id]}
                    <span className={`${styles.badge} ${badgeClassOf(hoveredCity.badge)} ${styles.tooltipBadge}`}>
                      {s.badges[hoveredCity.badge]}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Légende complète du plateau (états de jeu §1) — mini-icônes de renfort. */}
            <ul className={styles.legend} aria-label={s.legendTitle}>
              {LEGEND_ITEMS.map((item) => (
                <li key={item.key} className={styles.legendItem}>
                  <span className={`${styles.sw} ${styles[item.sw] ?? ''}`} aria-hidden="true" />
                  <Icon name={item.icon} size={12} className={`${styles.legendIcon} ${styles[item.tint] ?? ''}`} />
                  {s.legend[item.key]}
                </li>
              ))}
            </ul>

            {/* Compteur France entière — chiffre héros 400, count-up au reveal. */}
            <div ref={counterReveal.ref} className={styles.counter}>
              <span className={styles.counterValue}>{formatInt(kmValue)}</span>
              <span className={ui.monoLabel}>{s.kmLabel}</span>
            </div>

            <p className={styles.hint}>{copy.map.hint}</p>
          </Reveal>
        </div>

        <Reveal delayMs={140}>
          <CityActivation />
        </Reveal>
      </div>
    </section>
  );
}
