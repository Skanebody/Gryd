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
 * Légende complète + compteur 551 695 km². Les 4 zone-tabs V1 sont conservés
 * (récit « la densité définit le niveau de guerre ») et le pont PhoneContext
 * (hover ville → téléphone du hero) reste intact.
 * Couleurs de conflit (--ennemi/--rival) : états de jeu uniquement (§1).
 *
 * ZÉRO DONNÉE FABRIQUÉE (décision fondateur 21/07/2026). Ont été retirés :
 * - les STATUTS PAR VILLE (« Lille · Guerre ouverte · CONTESTÉE », « Lyon ·
 *   Secteur rival · DOMINÉE »…) : personne ne domine Lyon, aucune guerre n'est
 *   ouverte à Lille. C'étaient des affirmations sur l'état du monde ;
 * - les jauges « les villes se remplissent » (CityActivation), qui affichaient
 *   des compteurs d'inscrits inventés.
 * Le plateau reste un SCHÉMA du code couleur (à moi / rival / contesté /
 * protégé / decay) — la légende le dit. Les villes ne sont plus que de la
 * géographie, sauf Paris et Lille, marquées Saison 0 : ça, c'est décidé.
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
import { Icon } from '../ui/Icon';
import ui from './ui.module.css';
import styles from './FranceMapSection.module.css';

const ZONE_KEYS: ZoneDensity[] = ['active', 'emerging', 'pioneer', 'wild'];

type DotId = 'paris' | 'lille' | 'rouen' | 'dieppe' | 'caux' | 'lyon' | 'bordeaux';

/* ─── Géométrie (module scope, déterministe → SSR stable) ────────────────── */

/** Ville projetée (france-geo) — fallback neutre si l'id manquait au généré. */
const geo = (id: string): { x: number; y: number } => FRANCE_CITIES[id] ?? { x: 0, y: 0 };

const PARIS = geo('paris');
const LILLE = geo('lille');
const ROUEN = geo('rouen');
const DIEPPE = geo('dieppe');
const LYON = geo('lyon');
const BORDEAUX = geo('bordeaux');
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








/**
 * Villes du plateau — positions RÉELLES (france-geo). Plus aucun statut de
 * guerre ni type de zone attribué : le type d'une zone se DÉDUIT de la densité
 * réelle de coureurs, et personne n'a encore couru. `season0` est le seul
 * marqueur, et c'est une décision produit vérifiable : la Saison 0 ouvre sur
 * les villes seedées de @klaim/shared (Paris, Lille).
 */
const SEASON0_CITY_IDS = new Set<DotId>(
  Object.values(CITIES).map((city) => city.id as DotId),
);

const CITY_DOTS: { id: DotId; name: string; x: number; y: number }[] = [
  { id: 'paris', name: CITIES.paris.name, x: PARIS.x, y: PARIS.y },
  { id: 'lille', name: CITIES.lille.name, x: LILLE.x, y: LILLE.y },
  { id: 'rouen', name: 'Rouen', x: ROUEN.x, y: ROUEN.y },
  { id: 'dieppe', name: 'Dieppe', x: DIEPPE.x, y: DIEPPE.y },
  { id: 'caux', name: 'Pays de Caux', x: CAUX.x, y: CAUX.y },
  { id: 'lyon', name: 'Lyon', x: LYON.x, y: LYON.y },
  { id: 'bordeaux', name: 'Bordeaux', x: BORDEAUX.x, y: BORDEAUX.y },
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
      'Plateau de jeu : vraie carte de France découpée en zones, avec territoires de crews, zone contestée, routes, avant-postes et zone pionnière',
    legendTitle: 'Légende',
    legend: {
      mine: 'À moi',
      rival: 'Rival',
      neutral: 'Neutre',
      contested: 'Contesté',
      protected: 'Protégé',
      decay: 'Decay',
    },
    season0Badge: 'SAISON 0',
    citiesTitle: 'Repères sur la carte',
    citiesNote:
      'La Saison 0 ouvre sur Paris et Lille. Le reste de la carte est ouvert à la capture, mais personne n’y a encore couru — donc rien n’y est affiché.',
    boardIsDiagram: 'Schéma du code couleur — aucun territoire n’a encore été pris.',
    kmLabel: 'km² ouverts à la capture',
  },
  en: {
    title: 'The map is open. Every run can move the border.',
    narration:
      'Paris becomes a battle. Dieppe becomes an outpost. Offranville becomes pioneer land. Every village can write its own map.',
    boardAria:
      'Game board: real map of France divided into zones, with crew territories, contested zone, routes, outposts and pioneer land',
    legendTitle: 'Legend',
    legend: {
      mine: 'Mine',
      rival: 'Rival',
      neutral: 'Neutral',
      contested: 'Contested',
      protected: 'Protected',
      decay: 'Decay',
    },
    season0Badge: 'SEASON 0',
    citiesTitle: 'Landmarks on the map',
    citiesNote:
      'Season 0 opens in Paris and Lille. The rest of the map is open for capture, but nobody has run there yet — so nothing is displayed there.',
    boardIsDiagram: 'Colour-code diagram — no territory has been taken yet.',
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
    if (city) setZone({ name: city.name });
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

            {/* Repères géographiques — le hover pilote aussi le téléphone du hero.
                Plus aucun statut de guerre : seul le marqueur Saison 0 est vrai. */}
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
                    {SEASON0_CITY_IDS.has(city.id) ? (
                      <span className={`${styles.badge} ${styles.badgeSeason0}`}>{s.season0Badge}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
            <p className={styles.citiesNote}>{s.citiesNote}</p>
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

                    {/* AUCUN territoire peint ici. Une carte de France dont Paris et
                        Lille apparaissent « à moi » et Lyon « rival » se lit comme
                        l'état réel du jeu — c'est une affirmation sur le monde, et
                        elle serait fausse : personne ne tient rien, la Saison 0 n'a
                        pas commencé. Le code couleur est enseigné par la LÉGENDE
                        ci-dessous (pastilles hors carte), pas en coloriant de vraies
                        villes. Il ne reste donc que ce qui est vrai : la silhouette,
                        la grille H3 capturable, et les deux villes de la Saison 0. */}
                  </g>

                </svg>

                {CITY_DOTS.map((city, i) => (
                  <button
                    key={city.id}
                    type="button"
                    className={`${styles.cityDot} ${
                      SEASON0_CITY_IDS.has(city.id) ? styles.dotSeason0 : ''
                    } ${hovered === i ? styles.dotHot : ''}`}
                    style={{ left: pctLeft(city.x), top: pctTop(city.y) }}
                    aria-label={
                      SEASON0_CITY_IDS.has(city.id) ? `${city.name} · ${s.season0Badge}` : city.name
                    }
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
                    {hoveredCity.name}
                    {SEASON0_CITY_IDS.has(hoveredCity.id) ? (
                      <span className={`${styles.badge} ${styles.badgeSeason0} ${styles.tooltipBadge}`}>
                        {s.season0Badge}
                      </span>
                    ) : null}
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
            <p className={styles.citiesNote}>{s.boardIsDiagram}</p>

            {/* Compteur France entière — chiffre héros 400, count-up au reveal. */}
            <div ref={counterReveal.ref} className={styles.counter}>
              <span className={styles.counterValue}>{formatInt(kmValue)}</span>
              <span className={ui.monoLabel}>{s.kmLabel}</span>
            </div>

            <p className={styles.hint}>{copy.map.hint}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
