'use client';

/**
 * Section Carte (#map) : 4 zone-tabs accessibles (Active/Émergente/Pionnière/
 * Sauvage) qui permutent un panneau {titre, description, 3 métriques}, et carte
 * France stylisée avec 6 city-dots (hover/focus → tooltip + mise à jour de la
 * zone du téléphone du hero via PhoneContext) et 2 routes-glow.
 * Villes actives : Paris + Lille (CITIES de @klaim/shared, AMENDEMENT-02 §2).
 */

import { useRef, useState } from 'react';
import { CITIES, type ZoneDensity } from '@klaim/shared';
import { useLang } from './LangProvider';
import { usePhone } from './PhoneContext';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './FranceMapSection.module.css';

const ZONE_KEYS: ZoneDensity[] = ['active', 'emerging', 'pioneer', 'wild'];

/** Villes de démonstration — Paris/Lille seedées `active` (Saison 0), le reste illustre les 3 autres densités. */
const CITY_DOTS: { name: string; density: ZoneDensity; x: number; y: number }[] = [
  { name: CITIES.paris.name, density: 'active', x: 205, y: 108 },
  { name: CITIES.lille.name, density: 'active', x: 222, y: 40 },
  { name: 'Rouen', density: 'emerging', x: 172, y: 86 },
  { name: 'Dieppe', density: 'pioneer', x: 166, y: 62 },
  { name: 'Lyon', density: 'emerging', x: 272, y: 218 },
  { name: 'Bordeaux', density: 'wild', x: 112, y: 262 },
];

/** Silhouette France métropolitaine stylisée (viewBox 0 0 400 400). */
const FRANCE_PATH =
  'M 218 25 L 245 60 L 300 78 L 332 96 L 318 150 L 330 205 L 345 245 L 340 288 ' +
  'L 345 308 L 300 322 L 268 330 L 240 318 L 218 350 L 150 345 L 92 330 L 85 255 ' +
  'L 95 210 L 75 175 L 25 150 L 12 122 L 55 95 L 90 100 L 100 68 L 118 92 ' +
  'L 150 75 L 168 58 L 200 40 Z';

export function FranceMapSection() {
  const { copy } = useLang();
  const { setZone } = usePhone();
  const [tab, setTab] = useState<ZoneDensity>('active');
  const [hovered, setHovered] = useState<number | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
            {copy.map.title}
          </h2>
          <p className={ui.sectionSub}>{copy.map.sub}</p>
        </Reveal>

        <div className={styles.grid}>
          <Reveal className={styles.left}>
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
          </Reveal>

          <Reveal delayMs={100} className={styles.right}>
            <div className={styles.mapBox}>
              <svg viewBox="0 0 400 400" className={styles.franceSvg} role="img" aria-label={copy.map.mapAria}>
                <path d={FRANCE_PATH} className={styles.france} />
                {/* Routes-glow : liaisons Paris↔Lille et Paris↔Lyon (état live). */}
                <path d="M 205 108 Q 216 70 222 40" className={styles.route} />
                <path d="M 205 108 Q 245 165 272 218" className={styles.route} />
              </svg>

              {CITY_DOTS.map((city, i) => (
                <button
                  key={city.name}
                  type="button"
                  className={`${styles.cityDot} ${styles[city.density] ?? ''}`}
                  style={{ left: `${(city.x / 400) * 100}%`, top: `${(city.y / 400) * 100}%` }}
                  aria-label={`${city.name} · ${copy.zones[city.density].name}`}
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
                  style={{
                    left: `${(hoveredCity.x / 400) * 100}%`,
                    top: `${(hoveredCity.y / 400) * 100}%`,
                  }}
                  role="status"
                >
                  {hoveredCity.name} · {copy.zones[hoveredCity.density].name}
                </div>
              ) : null}
            </div>
            <p className={styles.hint}>{copy.map.hint}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
