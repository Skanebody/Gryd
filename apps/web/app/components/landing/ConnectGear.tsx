'use client';

/**
 * Section « Connecte ton matériel » (#connect) — reliquat AMENDEMENT-05 §4.10 /
 * doc refonte v2 §4.10. Insérée entre PerformanceSection et Pricing.
 * Règle centrale (anti pay-to-win, GRYD Verified) : TOUTES les sources
 * enrichissent la performance, SEULES les activités vérifiées capturent le
 * territoire. Pastilles des sources en pictogrammes GÉNÉRIQUES monochromes
 * (PAS de logos officiels), états Actif/Connecté/Bientôt. Tokens stricts,
 * 1 CTA chartreuse max (celui du header global — aucun ici), reduced-motion.
 */

import type { ComponentType, SVGProps } from 'react';
import { Icon } from '../ui/Icon';
import { useLang } from './LangProvider';
import { Reveal } from './Reveal';
import ui from './ui.module.css';
import styles from './ConnectGear.module.css';

type SourceState = 'active' | 'connected' | 'soon';

/**
 * Pictogrammes GÉNÉRIQUES (charte §F : trait 1,5 px, 24×24, currentColor) —
 * volontairement PAS les logos officiels des marques : un symbole neutre par
 * source, sans marque déposée. Décoratifs, aria-hidden.
 */
function GlyphHealth(props: SVGProps<SVGSVGElement>) {
  // Cœur + tracé de pouls (santé générique).
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M12 20s-7-4.5-7-9.5A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 7 2.5c0 5-7 9.5-7 9.5z" />
      <path d="M6 13h2.5l1.5-3 2 5 1.5-2H18" />
    </svg>
  );
}

function GlyphConnect(props: SVGProps<SVGSVGElement>) {
  // Deux cercles reliés (agrégateur générique).
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="7.5" cy="12" r="3.5" />
      <circle cx="16.5" cy="12" r="3.5" />
      <path d="M10.2 10.4 13.8 13.6" />
    </svg>
  );
}

function GlyphSwoosh(props: SVGProps<SVGSVGElement>) {
  // Chevron ascendant (segment / progression).
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 16l5-9 4 6 2-3 5 9" />
    </svg>
  );
}

function GlyphCompass(props: SVGProps<SVGSVGElement>) {
  // Boussole (navigation / GPS générique).
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5 13 13l-4.5 2.5L11 11z" />
    </svg>
  );
}

function GlyphPulse(props: SVGProps<SVGSVGElement>) {
  // Onde de récupération (bande / capteur générique).
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M3 12h3l2-5 3 10 2.5-7 1.5 4H21" />
    </svg>
  );
}

function GlyphTracker(props: SVGProps<SVGSVGElement>) {
  // Bracelet + point (tracker générique).
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <rect x="7.5" y="4.5" width="9" height="15" rx="4.5" />
      <circle cx="12" cy="12" r="1.6" />
    </svg>
  );
}

function GlyphGauge(props: SVGProps<SVGSVGElement>) {
  // Jauge / cardio (cardiofréquencemètre générique).
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path d="M4 15a8 8 0 0 1 16 0" />
      <path d="M12 15l4-3.5" />
      <path d="M5.5 18.5h13" />
    </svg>
  );
}

function GlyphRays(props: SVGProps<SVGSVGElement>) {
  // Cercle + rayons (montre outdoor générique).
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
    </svg>
  );
}

/**
 * Sources §4.10 — noms de marque en libellé (autorisé), pictogramme générique.
 * État : Apple Health + Strava = actifs (beta fondateur) ; le reste = bientôt.
 */
const SOURCES: { name: string; state: SourceState; Glyph: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { name: 'Apple Health', state: 'active', Glyph: GlyphHealth },
  { name: 'Strava', state: 'connected', Glyph: GlyphSwoosh },
  { name: 'Health Connect', state: 'active', Glyph: GlyphConnect },
  { name: 'Garmin', state: 'soon', Glyph: GlyphCompass },
];

export function ConnectGear() {
  const { copy } = useLang();
  const c = copy.connect;
  const stateLabel: Record<SourceState, string> = {
    active: c.stateActive,
    connected: c.stateConnected,
    soon: c.stateSoon,
  };

  return (
    <section id="connect" className={ui.section} aria-labelledby="connect-title">
      <div className={ui.inner}>
        <Reveal>
          <p className={ui.kicker}>{c.kicker}</p>
          <h2 id="connect-title" className={ui.sectionTitle}>
            {c.title}
          </h2>
          <p className={ui.sectionSub}>{c.sub}</p>
        </Reveal>

        {/* Règle centrale (anti pay-to-win) : accent éditorial Lora, pas un CTA. */}
        <Reveal delayMs={70}>
          <p className={styles.rule}>
            <Icon name="badge" size={20} className={styles.ruleIcon} />
            {c.rule}
          </p>
        </Reveal>

        <ul className={styles.grid} aria-label={c.listAria}>
          {SOURCES.map((s, i) => (
            <Reveal key={s.name} delayMs={80 + i * 50}>
              <li className={`${ui.card} ${styles.tile}`}>
                <span className={styles.glyph} aria-hidden="true">
                  <s.Glyph
                    width={26}
                    height={26}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </span>
                <span className={styles.name}>{s.name}</span>
                <span className={`${styles.state} ${styles[s.state]}`}>
                  <span className={styles.dot} aria-hidden="true" />
                  {stateLabel[s.state]}
                </span>
              </li>
            </Reveal>
          ))}
        </ul>

        <Reveal delayMs={120}>
          <p className={styles.note}>{c.verifiedNote}</p>
        </Reveal>
      </div>
    </section>
  );
}
