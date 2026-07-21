'use client';

/**
 * Section Crews (#crews) : le builder live — tu tapes un nom et une ville, tu
 * choisis un style, et tu vois TON emblème se composer. Tout ce qui s'affiche
 * ici vient de ce que TU viens de saisir : c'est le seul aperçu de la landing
 * qui ne peut pas mentir.
 *
 * ZÉRO DONNÉE FABRIQUÉE (décision fondateur 21/07/2026). Ont été retirés :
 * - le « CREW WAR ROOM » (rang #3 de secteur, 4 membres actifs aujourd'hui,
 *   1 offensive en cours, 42 % du secteur contrôlé) : ton crew n'existe pas
 *   encore, il ne contrôle rien, il n'est classé nulle part ;
 * - le mini-classement de rivalité (Bastille Runners, Canal Crew et leurs
 *   points) : deux crews inventés autour du tien pour simuler une compétition.
 * - le bouton « Copier le lien d'invitation », qui produisait un lien
 *   gryd.run/crew/... avec un code inventé : ce lien ne mène nulle part.
 * Chiffres de jeu réels : CREW_MAX_MEMBERS (@klaim/shared).
 */

import { useState } from 'react';
import { CREW_MAX_MEMBERS } from '@klaim/shared';
import { useLang } from './LangProvider';
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

const STRINGS = {
  fr: {
    previewKicker: 'Ton emblème',
    membersLabel: 'coureurs maximum par crew',
    /* La seule promesse de la carte : ce qui est vrai est vrai. */
    emptyStat: 'Aucune zone tant que personne n’a couru.',
    cta: 'Réserver mon accès',
  },
  en: {
    previewKicker: 'Your emblem',
    membersLabel: 'runners max per crew',
    emptyStat: 'No zone until someone has run.',
    cta: 'Reserve my access',
  },
};

function initialsOf(name: string, fallback: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase();
}

export function CrewBuilder() {
  const { copy, lang, formatInt } = useLang();
  const t = STRINGS[lang];
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [style, setStyle] = useState<CrewStyle>('carbon');

  const displayName = name.trim() || copy.crews.previewFallbackName;
  const displayCity = city.trim() || copy.crews.previewFallbackCity;
  const initials = initialsOf(name, 'GR');

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

            {/* CTA chartreuse unique de la section — vers la waitlist, la seule
                action réellement disponible aujourd'hui (l'ancien « Copier le
                lien d'invitation » copiait une URL qui n'existe pas). */}
            <a href="#waitlist" className={`${ui.btnPrimary} ${styles.copyBtn}`}>
              {t.cta}
            </a>
          </Reveal>

          <Reveal delayMs={100} className={styles.previewCol}>
            {/* Aperçu live : uniquement ce que TU viens de saisir. */}
            <div
              className={`${ui.card} ${styles.preview} ${styles[STYLE_CLASS[style]] ?? ''}`}
              role="img"
              aria-label={copy.crews.previewAria}
            >
              <span className={`${ui.monoLabel} ${styles.warKicker}`}>{t.previewKicker}</span>

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
                  <span className={styles.previewMeta}>{displayCity}</span>
                </div>
              </div>

              {/* Une seule ligne de chiffre, et c'est une RÈGLE de jeu réelle
                  (@klaim/shared) — pas un état de crew inventé. Le reste dit
                  honnêtement qu'il n'y a rien à afficher tant que rien n'a été
                  couru : un état vide n'est pas un écran vide. */}
              <p className={styles.previewRule}>
                <strong className={styles.previewRuleValue}>{formatInt(CREW_MAX_MEMBERS)}</strong>
                <span className={styles.previewRuleLabel}>{t.membersLabel}</span>
              </p>
              <p className={styles.previewEmpty}>{t.emptyStat}</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
