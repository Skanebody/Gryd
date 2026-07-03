'use client';

/**
 * Mockup téléphone 3D flottant du hero : mini hex-map (~80 hexes), trace de
 * course animée, pin coureur pulsé, carte de zone (mise à jour par la section
 * Carte via PhoneContext) et panneau « Course validée +N HEXES ».
 * « Simuler une course » : capture séquentielle d'hexes (flash → owned),
 * reroll des chiffres, toast. prefers-reduced-motion : pas de 3D/float,
 * capture posée d'un bloc, compteurs affichés directement.
 */

import { useEffect, useRef, useState } from 'react';
import { colors, mapTokens } from '@klaim/shared';
import { DEMO } from '../../../lib/landing';
import { useLang } from './LangProvider';
import { usePhone } from './PhoneContext';
import { useToast } from './Toast';
import { useCountUp } from './useCountUp';
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

/** Mon territoire de base (chartreuse-14). */
const MINE = new Set(['1,7', '2,7', '1,8', '2,8', '0,8', '2,9', '1,9']);
/** Crew adverse (motif hachuré, jamais de teinte — AMENDEMENT-01). */
const FOE = new Set(['6,1', '7,1', '6,2', '7,2', '8,2', '7,3']);
/** Hexes capturés séquentiellement pendant la simulation (tracé de la course). */
const SEQUENCE = [
  '2,8', '2,7', '3,7', '3,6', '3,5', '4,5', '4,4', '5,4', '5,3', '5,2', '6,2', '6,1',
] as const;

const SIM_STEP_MS = 140;
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

const randomInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/* ── Composant ─────────────────────────────────────────────────────────────── */

export function PhoneMockup() {
  const { copy, formatInt } = useLang();
  const { zone, simTick } = usePhone();
  const { showToast } = useToast();

  const [capturedCount, setCapturedCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [hexGain, setHexGain] = useState<number>(DEMO.hexesGained);
  const [zonePct, setZonePct] = useState<number>(DEMO.zoneControlPct);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const displayedGain = useCountUp(hexGain, true);
  const captured = new Set<string>(SEQUENCE.slice(0, capturedCount));

  // Copie stable pour le timeout de fin de simulation (évite de re-armer l'effet).
  const finishCopyRef = useRef({ validated: copy.phone.runValidated, unit: copy.phone.hexesUnit });
  finishCopyRef.current = { validated: copy.phone.runValidated, unit: copy.phone.hexesUnit };

  useEffect(() => {
    if (simTick === 0) return;

    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    clearTimers();

    const finish = () => {
      const gain = randomInt(DEMO.simHexGainMin, DEMO.simHexGainMax);
      setHexGain(gain);
      setZonePct(randomInt(DEMO.simZonePctMin, DEMO.simZonePctMax));
      setRunning(false);
      const { validated, unit } = finishCopyRef.current;
      showToast(`${validated} · +${formatInt(gain)} ${unit.toLowerCase()}`);
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Capture posée d'un bloc, chiffres directs (charte §G).
      setCapturedCount(SEQUENCE.length);
      finish();
      return clearTimers;
    }

    setCapturedCount(0);
    setRunning(true);
    SEQUENCE.forEach((_, i) => {
      timersRef.current.push(
        setTimeout(() => setCapturedCount(i + 1), 200 + i * SIM_STEP_MS),
      );
    });
    timersRef.current.push(setTimeout(finish, 200 + SEQUENCE.length * SIM_STEP_MS + 300));
    return clearTimers;
    // showToast/formatInt stables ou lus via ref — seule la demande de sim re-déclenche.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simTick]);

  const zoneName = zone?.name ?? copy.phone.defaultZoneName;
  const zoneTypeName = copy.zones[zone?.density ?? 'active'].name;

  // Mini-barres du panneau résultat (répartition showcase, re-dessinée au reroll).
  const bars = [
    Math.round(hexGain * 0.52),
    Math.round(hexGain * 0.3),
    Math.round(hexGain * 0.18),
  ];
  const maxBar = Math.max(...bars, 1);

  return (
    <div className={styles.scene}>
      <div className={`${styles.phone} ${running ? styles.phoneRunning : ''}`} role="img" aria-label={copy.phone.frameAria}>
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
              <defs>
                <pattern
                  id="gryd-phone-hatch"
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                  patternUnits="userSpaceOnUse"
                >
                  <line x1="0" y1="0" x2="0" y2="6" stroke={mapTokens.foeStroke} strokeWidth="1" />
                </pattern>
              </defs>

              <rect width={VIEW_W} height={VIEW_H} fill={colors.noir} />

              {HEXES.map((hex) => {
                const isCaptured = captured.has(hex.key);
                if (hex.kind === 'mine' || isCaptured) {
                  return (
                    <polygon
                      key={hex.key}
                      className={isCaptured && hex.kind !== 'mine' ? styles.hexFlash : undefined}
                      points={hex.points}
                      fill={mapTokens.mineFill}
                      stroke={mapTokens.mineStroke}
                      strokeWidth="1.2"
                    />
                  );
                }
                if (hex.kind === 'foe') {
                  return (
                    <polygon
                      key={hex.key}
                      points={hex.points}
                      fill="url(#gryd-phone-hatch)"
                      stroke={mapTokens.foeStroke}
                      strokeWidth="0.9"
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

            <div className={styles.zoneCard}>
              <span className={styles.zoneLabel}>{zoneTypeName}</span>
              <strong className={styles.zoneName}>{zoneName}</strong>
              <span className={styles.zonePct}>
                {formatInt(zonePct)} % {copy.phone.controlled}
              </span>
            </div>
          </div>

          <div className={styles.resultPanel}>
            <div className={styles.resultText}>
              <span className={styles.resultLabel}>{copy.phone.runValidated}</span>
              {/* Chiffre héros : graisse 400, chartreuse = gain (doctrine C.3). */}
              <span className={styles.resultValue}>
                +{formatInt(displayedGain)}
                <small className={styles.resultUnit}>{copy.phone.hexesUnit}</small>
              </span>
            </div>
            <div className={styles.bars} role="img" aria-label={copy.phone.barsAria}>
              {bars.map((bar, i) => (
                <span
                  key={i}
                  className={styles.bar}
                  style={{ height: `${Math.round((bar / maxBar) * 100)}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
