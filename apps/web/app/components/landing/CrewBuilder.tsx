'use client';

/**
 * Section Crews (#crews) : crew builder live — nom → initiales de l'emblème,
 * ville → type de zone (Paris/Lille = active, AMENDEMENT-02 §2), style → variante
 * visuelle (différenciée par glow/motif, jamais par teinte hors palette), et
 * « Copier le lien d'invitation » (navigator.clipboard + toast).
 * Chiffres : CREW_MAX_MEMBERS et CREW_CODE_LENGTH de @klaim/shared.
 */

import { useMemo, useState } from 'react';
import { CITIES, CREW_CODE_LENGTH, CREW_MAX_MEMBERS, type ZoneDensity } from '@klaim/shared';
import { useLang } from './LangProvider';
import { useToast } from './Toast';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './CrewBuilder.module.css';

type CrewStyle = 'carbon' | 'gold' | 'neon' | 'ghost';

const STYLES: CrewStyle[] = ['carbon', 'gold', 'neon', 'ghost'];
const STYLE_CLASS: Record<CrewStyle, string> = {
  carbon: 'variantCarbon',
  gold: 'variantGold',
  neon: 'variantNeon',
  ghost: 'variantGhost',
};

const ACTIVE_CITIES = Object.values(CITIES).map((city) => city.name.toLowerCase());
const EMERGING_HINTS = ['lyon', 'bordeaux', 'marseille', 'toulouse', 'nantes', 'rennes', 'rouen', 'nice'];

/** Heuristique de démonstration ville → densité (les vraies zones sont décidées serveur). */
function cityToDensity(city: string): ZoneDensity {
  const clean = city.trim().toLowerCase();
  if (!clean) return 'active';
  if (ACTIVE_CITIES.some((name) => name.includes(clean) || clean.includes(name))) return 'active';
  if (EMERGING_HINTS.includes(clean)) return 'emerging';
  return (['emerging', 'pioneer', 'wild'] as const)[clean.length % 3] ?? 'emerging';
}

function initialsOf(name: string, fallback: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

/** Code d'invitation déterministe de CREW_CODE_LENGTH caractères (démo, dérivé du nom). */
function inviteCode(name: string): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let hash = 7;
  for (const char of name || 'GRYD') hash = (hash * 31 + char.charCodeAt(0)) % 1_000_003;
  let code = '';
  for (let i = 0; i < CREW_CODE_LENGTH; i++) {
    hash = (hash * 131 + 17) % 1_000_003;
    code += alphabet.charAt(hash % alphabet.length);
  }
  return code;
}

export function CrewBuilder() {
  const { copy } = useLang();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [style, setStyle] = useState<CrewStyle>('carbon');

  const density = useMemo(() => cityToDensity(city), [city]);
  const displayName = name.trim() || copy.crews.previewFallbackName;
  const displayCity = city.trim() || copy.crews.previewFallbackCity;
  const initials = initialsOf(name, 'GR');

  const copyInvite = async () => {
    const slug = (name.trim() || 'mon-crew')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const link = `https://gryd.run/crew/${slug || 'mon-crew'}?code=${inviteCode(name)}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast(copy.crews.copied);
    } catch {
      showToast(copy.crews.copyFailed);
    }
  };

  return (
    <section id="crews" className={ui.section} aria-labelledby="crews-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{copy.crews.kicker}</p>
          <h2 id="crews-title" className={ui.sectionTitle}>
            {copy.crews.title}
          </h2>
          <p className={ui.sectionSub}>{copy.crews.sub}</p>
        </Reveal>

        <div className={styles.grid}>
          <Reveal className={styles.formCol}>
            <div className={styles.field}>
              <label className={ui.monoLabel} htmlFor="crew-name">
                {copy.crews.nameLabel}
              </label>
              <input
                id="crew-name"
                className={styles.input}
                type="text"
                value={name}
                maxLength={28}
                placeholder={copy.crews.namePlaceholder}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={ui.monoLabel} htmlFor="crew-city">
                {copy.crews.cityLabel}
              </label>
              <input
                id="crew-city"
                className={styles.input}
                type="text"
                value={city}
                maxLength={40}
                placeholder={copy.crews.cityPlaceholder}
                onChange={(event) => setCity(event.target.value)}
              />
            </div>

            <fieldset className={styles.styleField}>
              <legend className={ui.monoLabel}>{copy.crews.styleLabel}</legend>
              <div className={styles.styleChips}>
                {STYLES.map((key) => (
                  <label
                    key={key}
                    className={`${styles.styleChip} ${style === key ? styles.styleChipActive : ''}`}
                  >
                    <input
                      type="radio"
                      name="crew-style"
                      value={key}
                      checked={style === key}
                      onChange={() => setStyle(key)}
                      className={styles.styleRadio}
                    />
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* CTA chartreuse unique de la section. */}
            <button type="button" className={`${ui.btnPrimary} ${styles.copyBtn}`} onClick={copyInvite}>
              {copy.crews.copyInvite}
            </button>
          </Reveal>

          <Reveal delayMs={100} className={styles.previewCol}>
            <div
              className={`${ui.card} ${styles.preview} ${styles[STYLE_CLASS[style]] ?? ''}`}
              role="img"
              aria-label={copy.crews.previewAria}
            >
              <div className={styles.previewHead}>
                <span className={styles.emblem} aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="52" height="52">
                    <polygon
                      points="12,2 21,7 21,17 12,22 3,17 3,7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                  <span className={styles.initials}>{initials}</span>
                </span>
                <div className={styles.previewIdentity}>
                  <strong className={styles.previewName}>{displayName}</strong>
                  <span className={styles.previewMeta}>
                    {displayCity} · {copy.zones[density].name}
                  </span>
                </div>
              </div>

              <dl className={styles.previewStats}>
                <div className={styles.previewStat}>
                  <dt className={ui.monoLabel}>{copy.crews.statHexes}</dt>
                  <dd>0</dd>
                </div>
                <div className={styles.previewStat}>
                  <dt className={ui.monoLabel}>{copy.crews.statPoints}</dt>
                  <dd>0</dd>
                </div>
                <div className={styles.previewStat}>
                  <dt className={ui.monoLabel}>{copy.crews.statMembers}</dt>
                  <dd>
                    0<span className={styles.statMax}>/{CREW_MAX_MEMBERS}</span>
                  </dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
