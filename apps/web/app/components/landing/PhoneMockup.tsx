'use client';

/**
 * Téléphone HUD « RAID LIVE » du hero (AMENDEMENT-05 §3.2) : carte 3 factions
 * (mon crew chartreuse, ennemi --ennemi, neutre), trace de course active dont
 * les hexes ennemis BASCULENT en chartreuse, alerte raid, panneau
 * « RAID LIVE · Paris Est · 62 % GRYD Crew · 31 % Rival · 7 % Neutre ·
 * +18 hexes pris · 4 membres actifs · 22 min restantes » et badge (--or) qui
 * pop en fin de séquence. La séquence se joue une fois à l'apparition du
 * téléphone, et « Simuler une course » (Hero → PhoneContext.simTick) la rejoue.
 * SSR stable (aucun aléa au rendu) ; prefers-reduced-motion : capture posée
 * d'un bloc, badge statique. Strings V2 locales fr/en.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { colors, mapTokens } from '@klaim/shared';
import { RAID } from '../../../lib/landing';
import { useLang } from './LangProvider';
import { usePhone } from './PhoneContext';
import { useToast } from './Toast';
import { useReveal } from './useReveal';
import styles from './PhoneMockup.module.css';

/* ── Géométrie déterministe (module scope → SSR-safe) ─────────────────────── */

const R = 14;
const W = Math.sqrt(3) * R;
const H = 1.5 * R;
const COLS = 9;
const ROWS = 10;
const VIEW_W = 240;
const VIEW_H = 222;

function hexCenter(c: number, r: number): { cx: number; cy: number } {
  return { cx: c * W + (r % 2 ? W / 2 : 0) + 12, cy: r * H + 12 };
}

function hexPoints(cx: number, cy: number): string {
  let s = '';
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    s += `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)} `;
  }
  return s.trim();
}

/** Mon territoire de base (chartreuse-14, bas-gauche). */
const MINE = new Set(['0,8', '1,7', '1,8', '1,9', '2,7', '2,8', '2,9']);
/** Zone ENNEMIE (--ennemi, haut-droite) — 3 factions AMENDEMENT-05 §3.2. */
const FOE = new Set([
  '5,0', '6,0', '7,0', '8,0',
  '5,1', '6,1', '7,1', '8,1',
  '6,2', '7,2', '8,2',
  '7,3', '8,3',
  '8,4',
]);
/**
 * Trace de course active : part de mon territoire, traverse le neutre et
 * pénètre la zone ennemie — les 5 derniers hexes sont ennemis et basculent
 * ennemi → chartreuse pendant la séquence.
 */
const SEQUENCE = [
  '2,7', '3,7', '3,6', '4,5', '4,4', '5,3', '5,2', '6,2', '6,1', '7,1', '7,2', '8,2',
] as const;

const SIM_STEP_MS = 150;
const BADGE_HIDE_MS = 3_000;

const SEQ_CENTERS = SEQUENCE.map((key) => {
  const [c = 0, r = 0] = key.split(',').map(Number);
  return hexCenter(c, r);
});
const RUN_PATH_D = SEQ_CENTERS.map(
  (p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`,
).join(' ');
const PIN = SEQ_CENTERS[SEQ_CENTERS.length - 1] ?? { cx: 0, cy: 0 };

type Hex = { key: string; points: string; kind: 'mine' | 'foe' | 'neutral' };

const HEXES: Hex[] = [];
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const key = `${c},${r}`;
    const { cx, cy } = hexCenter(c, r);
    HEXES.push({
      key,
      points: hexPoints(cx, cy),
      kind: MINE.has(key) ? 'mine' : FOE.has(key) ? 'foe' : 'neutral',
    });
  }
}

// Chiffres de showcase du raid : RAID (lib/landing, fictifs assumés,
// DÉTERMINISTES — AMENDEMENT-05 §3.2/§4, centralisés).

const STRINGS = {
  fr: {
    raidLive: 'RAID LIVE',
    contested: '⚠ Contesté',
    crew: 'GRYD Crew',
    /* Libellé aligné AMENDEMENT-05 §1 : la faction adverse du HUD est rendue
       en --ennemi (zone ennemie/attaque) — « Rival » (violet) serait faux. */
    rival: 'Ennemi',
    neutral: 'Neutre',
    hexesTaken: (n: string) => `+${n} hexes pris`,
    members: (n: string) => `${n} membres actifs`,
    minutes: (n: string) => `${n} min restantes`,
    badgeName: 'Route Opened',
    badgeLabel: 'Badge débloqué',
    sharesAria: 'Parts de contrôle de la zone',
    frameAria:
      'Aperçu de l’app GRYD : raid en direct — carte à trois factions, trace de course et HUD de progression',
  },
  en: {
    raidLive: 'LIVE RAID',
    contested: '⚠ Contested',
    crew: 'GRYD Crew',
    /* Label aligned with AMENDEMENT-05 §1: the HUD foe faction renders in
       --ennemi (enemy zone/attack) — "Rival" (purple) would contradict it. */
    rival: 'Enemy',
    neutral: 'Neutral',
    hexesTaken: (n: string) => `+${n} hexes taken`,
    members: (n: string) => `${n} members active`,
    minutes: (n: string) => `${n} min left`,
    badgeName: 'Route Opened',
    badgeLabel: 'Badge unlocked',
    sharesAria: 'Zone control shares',
    frameAria:
      'GRYD app preview: live raid — three-faction map, run trace and progress HUD',
  },
} as const;

/* ── Composant ─────────────────────────────────────────────────────────────── */

export function PhoneMockup() {
  const { lang, copy, formatInt } = useLang();
  const S = STRINGS[lang];
  const { zone, simTick } = usePhone();
  const { showToast } = useToast();
  const reveal = useReveal<HTMLDivElement>(0.35);

  const [capturedCount, setCapturedCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [badge, setBadge] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playedRef = useRef(false);

  // Copie stable pour le timeout de fin (évite de re-armer l'effet au changement de langue).
  const toastCopyRef = useRef({ validated: copy.phone.runValidated, unit: copy.phone.hexesUnit });
  toastCopyRef.current = { validated: copy.phone.runValidated, unit: copy.phone.hexesUnit };

  const play = useCallback(
    (announce: boolean) => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setBadge(false);

      const finish = () => {
        setRunning(false);
        setBadge(true);
        timersRef.current.push(setTimeout(() => setBadge(false), BADGE_HIDE_MS));
        if (announce) {
          const { validated, unit } = toastCopyRef.current;
          showToast(`${validated} · +${RAID.hexesTaken} ${unit.toLowerCase()}`);
        }
      };

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // Capture posée d'un bloc, badge sans pop (charte §G).
        setCapturedCount(SEQUENCE.length);
        finish();
        return;
      }

      setCapturedCount(0);
      setRunning(true);
      SEQUENCE.forEach((_, i) => {
        timersRef.current.push(setTimeout(() => setCapturedCount(i + 1), 200 + i * SIM_STEP_MS));
      });
      timersRef.current.push(setTimeout(finish, 200 + SEQUENCE.length * SIM_STEP_MS + 350));
    },
    [showToast],
  );

  // Séquence jouée une fois à l'apparition du téléphone (démarrage client, valeurs fixes).
  useEffect(() => {
    if (!reveal.shown || playedRef.current) return;
    playedRef.current = true;
    play(false);
  }, [reveal.shown, play]);

  // « Simuler une course » rejoue la séquence.
  useEffect(() => {
    if (simTick === 0) return;
    play(true);
  }, [simTick, play]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const captured = new Set<string>(SEQUENCE.slice(0, capturedCount));
  // « +18 hexes pris » suit la bascule des hexes (0 → 18 pendant la séquence).
  const taken = Math.round((RAID.hexesTaken * capturedCount) / SEQUENCE.length);
  const zoneName = zone?.name ?? copy.phone.defaultZoneName;

  return (
    <div ref={reveal.ref} className={styles.scene}>
      <div className={styles.phone} role="img" aria-label={S.frameAria}>
        <div className={styles.notch} aria-hidden="true" />
        <div className={styles.screen}>
          <div className={styles.statusBar}>
            <span className={styles.time}>19:42</span>
            {/* Chip « live » — emploi doctrine C.3 (état en direct). */}
            <span className={styles.liveChip}>
              <span className={styles.liveDot} />
              {copy.phone.live}
            </span>
          </div>

          <div className={styles.mapWrap}>
            <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={styles.map} aria-hidden="true">
              <rect width={VIEW_W} height={VIEW_H} fill={colors.noir} />

              {HEXES.map((hex) => {
                const isCaptured = captured.has(hex.key);
                if (hex.kind === 'mine' || isCaptured) {
                  return (
                    <polygon
                      key={hex.key}
                      className={isCaptured && hex.kind !== 'mine' ? styles.hexFlip : undefined}
                      points={hex.points}
                      fill={mapTokens.mineFill}
                      stroke={mapTokens.mineStroke}
                      strokeWidth="1.2"
                    />
                  );
                }
                if (hex.kind === 'foe') {
                  // Zone ennemie : --ennemi (état de jeu exclusif, AMENDEMENT-05 §1).
                  return (
                    <polygon
                      key={hex.key}
                      points={hex.points}
                      fill="var(--ennemi-14)"
                      stroke="var(--ennemi-40)"
                      strokeWidth="1"
                    />
                  );
                }
                return (
                  <polygon
                    key={hex.key}
                    points={hex.points}
                    fill="none"
                    stroke={mapTokens.neutralStroke}
                    strokeWidth="0.9"
                  />
                );
              })}

              {/* Trace de course : fantôme permanent + tracé animé pendant la sim. */}
              <path
                d={RUN_PATH_D}
                fill="none"
                stroke={colors.chartreuse40}
                strokeWidth="2"
                strokeDasharray="3 5"
                strokeLinecap="round"
              />
              <path
                className={`${styles.runLine} ${running ? styles.runLineOn : ''}`}
                d={RUN_PATH_D}
                pathLength={100}
                fill="none"
                stroke={colors.chartreuse}
                strokeWidth="2.4"
                strokeLinecap="round"
              />

              {/* Pin coureur pulsé. */}
              <circle className={styles.pinPulse} cx={PIN.cx} cy={PIN.cy} r="9" fill={colors.chartreuse40} />
              <circle cx={PIN.cx} cy={PIN.cy} r="4" fill={colors.chartreuse} stroke={colors.noir} strokeWidth="1.4" />
            </svg>

            {/* Alerte raid : zone contestée (pulse ennemi discret). */}
            <span className={styles.contested}>{S.contested}</span>

            {/* Badge qui pop en fin de séquence — --or réservé victoire/badge. */}
            {badge ? (
              <div className={styles.badge}>
                <svg viewBox="0 0 24 24" className={styles.badgeHex} aria-hidden="true">
                  <polygon
                    points="12,1.5 21.5,7 21.5,17.5 12,23 2.5,17.5 2.5,7"
                    fill="var(--or-14)"
                    stroke="var(--or)"
                    strokeWidth="1.4"
                  />
                  <polygon points="12,7 16.3,9.5 16.3,14.5 12,17 7.7,14.5 7.7,9.5" fill="var(--or)" />
                </svg>
                <span className={styles.badgeTexts}>
                  <strong className={styles.badgeName}>{S.badgeName}</strong>
                  <span className={styles.badgeLabel}>{S.badgeLabel}</span>
                </span>
              </div>
            ) : null}
          </div>

          {/* Panneau HUD RAID LIVE. */}
          <div className={styles.raidPanel}>
            <div className={styles.raidHead}>
              <span className={styles.raidChip}>
                <span className={styles.raidDot} aria-hidden="true" />
                {S.raidLive}
              </span>
              <strong className={styles.raidZone}>{zoneName}</strong>
            </div>

            <div className={styles.factionBar} role="img" aria-label={S.sharesAria}>
              <span className={styles.segCrew} style={{ width: `${RAID.crewPct}%` }} />
              <span className={styles.segRival} style={{ width: `${RAID.rivalPct}%` }} />
              <span className={styles.segNeutral} style={{ width: `${RAID.neutralPct}%` }} />
            </div>

            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotCrew}`} aria-hidden="true" />
                <strong>{formatInt(RAID.crewPct)} %</strong> {S.crew}
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotRival}`} aria-hidden="true" />
                <strong>{formatInt(RAID.rivalPct)} %</strong> {S.rival}
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.dotNeutral}`} aria-hidden="true" />
                <strong>{formatInt(RAID.neutralPct)} %</strong> {S.neutral}
              </span>
            </div>

            <div className={styles.raidStats}>
              <span className={styles.statTaken}>{S.hexesTaken(formatInt(taken))}</span>
              <span className={styles.statItem}>{S.members(formatInt(RAID.membersActive))}</span>
              <span className={styles.statItem}>{S.minutes(formatInt(RAID.minutesLeft))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
