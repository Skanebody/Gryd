'use client';

/**
 * Simulateur (Client Component) — panneau de contrôle + carte SVG + payload de
 * célébration. La simulation tourne UNIQUEMENT côté client (useEffect/clics) :
 * l'état du monde fabriqué dépend de l'horloge, on évite tout mismatch SSR.
 */
import { useEffect, useState } from 'react';
import { CITIES, type StarterCityId, type ZoneDensity } from '@klaim/shared/game-rules';
import type { RunSource } from '@klaim/shared/types';
import {
  CHEAT_LABELS,
  PRESETS,
  simulate,
  type CheatMode,
  type SimParams,
  type SimResult,
} from '../lib/simulate';
import {
  OUTCOME_LABELS,
  REJECT_REASON_LABELS,
  formatDuration,
  formatKm,
  formatPace,
} from '../lib/format';
import { StatusChip } from './StatusChip';
import { TraceMap } from './TraceMap';
import { useToast } from './toast';
import ui from './ui.module.css';
import styles from './Simulator.module.css';

const DENSITIES: ZoneDensity[] = ['active', 'emerging', 'pioneer', 'wild'];

function paceLabel(s: number): string {
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} min/km`;
}

export function Simulator() {
  const [params, setParams] = useState<SimParams>(PRESETS[0]!.params);
  const [activePreset, setActivePreset] = useState<string | null>(PRESETS[0]!.id);
  const [seed, setSeed] = useState(1234);
  const [result, setResult] = useState<SimResult | null>(null);
  const { toast, showToast } = useToast();

  const run = (p: SimParams, s: number) => {
    const res = simulate(p, s);
    setResult(res);
    return res;
  };

  // Première simulation au montage (client uniquement — cf. en-tête).
  useEffect(() => {
    run(PRESETS[0]!.params, 1234);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof SimParams>(key: K, value: SimParams[K]) => {
    setActivePreset(null);
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const launch = () => {
    const next = seed + 1;
    setSeed(next);
    const res = run(params, next);
    showToast(`Simulation terminée — statut moteur : ${res.status}`);
  };

  const applyPreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setActivePreset(id);
    setParams(preset.params);
    const next = seed + 1;
    setSeed(next);
    const res = run(preset.params, next);
    showToast(`${preset.label} → statut moteur : ${res.status} (attendu : ${preset.expect})`);
  };

  return (
    <div className={styles.layout}>
      {/* ── Panneau de contrôle ── */}
      <aside className={`${ui.card} ${styles.controls}`}>
        <p className={ui.kicker}>CAS DE DÉMO (1 CLIC)</p>
        <div className={styles.presets}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={activePreset === p.id
                ? `${ui.filterBtn} ${ui.filterBtnActive}`
                : ui.filterBtn}
              onClick={() => applyPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className={ui.kicker} style={{ marginTop: 20 }}>PARAMÈTRES</p>

        <label className={styles.field}>
          <span>Ville</span>
          <select
            className={ui.select}
            value={params.city}
            onChange={(e) => set('city', e.target.value as StarterCityId)}
          >
            {Object.values(CITIES).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>
            Distance cible <b className={ui.mono}>{params.distanceKm.toFixed(1)} km</b>
          </span>
          <input
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={params.distanceKm}
            onChange={(e) => set('distanceKm', Number(e.target.value))}
          />
        </label>

        <label className={styles.field}>
          <span>
            Allure <b className={ui.mono}>{paceLabel(params.paceSKm)}</b>
          </span>
          <input
            type="range"
            min={180}
            max={720}
            step={10}
            value={params.paceSKm}
            onChange={(e) => set('paceSKm', Number(e.target.value))}
          />
        </label>

        <label className={styles.field}>
          <span>
            Bruit GPS <b className={ui.mono}>{params.noiseM} m</b>
          </span>
          <input
            type="range"
            min={0}
            max={30}
            step={1}
            value={params.noiseM}
            onChange={(e) => set('noiseM', Number(e.target.value))}
          />
        </label>

        <label className={styles.field}>
          <span>Mode triche</span>
          <select
            className={ui.select}
            value={params.cheat}
            onChange={(e) => set('cheat', e.target.value as CheatMode)}
          >
            {(Object.keys(CHEAT_LABELS) as CheatMode[]).map((c) => (
              <option key={c} value={c}>{CHEAT_LABELS[c]}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Source</span>
          <select
            className={ui.select}
            value={params.source}
            onChange={(e) => set('source', e.target.value as RunSource)}
          >
            <option value="gps">gps</option>
            <option value="healthkit">healthkit</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Densité de zone</span>
          <select
            className={ui.select}
            value={params.density}
            onChange={(e) => set('density', e.target.value as ZoneDensity)}
          >
            {DENSITIES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        {/* LE CTA chartreuse de l'écran (1 max, §F). */}
        <button type="button" className={`${ui.btnPrimary} ${styles.launch}`} onClick={launch}>
          {result ? 'Relancer' : 'Lancer la simulation'}
        </button>
      </aside>

      {/* ── Carte + résultat ── */}
      <div className={styles.results}>
        <section className={ui.card}>
          <p className={ui.kicker}>CARTE (H3 RES 10 · PROJECTION LOCALE)</p>
          {result
            ? (
              <>
                <div className={styles.mapWrap}>
                  <TraceMap
                    hexes={result.mapHexes}
                    paths={result.paths}
                    title="Résultat de simulation : trace et hexes décidés par le moteur"
                  />
                </div>
                <div className={styles.legend}>
                  <span><i className={`${styles.swatch} ${styles.swMine}`} /> à moi / défendu</span>
                  <span><i className={`${styles.swatch} ${styles.swStolen}`} /> volé</span>
                  <span><i className={`${styles.swatch} ${styles.swBlocked}`} /> bloqué (lock · bouclier · protégé · zone)</span>
                  <span><i className={`${styles.swatch} ${styles.swFrozen}`} /> gelé (flagged)</span>
                  <span><i className={`${styles.swatch} ${styles.swOutline}`} /> non attribué / rejeté</span>
                  <span><i className={`${styles.swatch} ${styles.swTrace}`} /> trace claimable</span>
                  <span><i className={`${styles.swatch} ${styles.swExcluded}`} /> segment exclu</span>
                </div>
              </>
            )
            : <p className={styles.placeholder}>Lance une simulation pour voir la grille réagir.</p>}
        </section>

        {result && (
          <section className={ui.card}>
            <p className={ui.kicker}>PAYLOAD DE CÉLÉBRATION (CE QUE VERRAIT LE COUREUR)</p>
            <div className={styles.celebration}>
              <div className={styles.hero}>
                <p className={styles.heroNumber}>
                  {result.score && !result.score.frozen ? `+${result.score.pointsAwarded}` : '0'}
                </p>
                <p className={styles.heroLabel}>points</p>
                <StatusChip status={result.status} />
                {result.rejectReason && (
                  <p className={styles.rejectReason}>
                    {REJECT_REASON_LABELS[result.rejectReason]}
                  </p>
                )}
                {result.score?.frozen && (
                  <p className={styles.rejectReason}>
                    Claims gelés — motion trust {result.motionTrust}/100 (&lt; 50). En
                    attente de revue (§6). Valeur gelée : {result.score.basePoints} pts bruts.
                  </p>
                )}
              </div>

              <dl className={styles.metrics}>
                <div>
                  <dt>Distance retenue</dt>
                  <dd className={ui.mono}>{formatKm(result.stats.distanceM)}</dd>
                </div>
                <div>
                  <dt>Durée</dt>
                  <dd className={ui.mono}>{formatDuration(result.stats.durationS)}</dd>
                </div>
                <div>
                  <dt>Allure mesurée</dt>
                  <dd className={ui.mono}>{formatPace(result.stats.avgPaceSKm)}</dd>
                </div>
                <div>
                  <dt>Points GPS</dt>
                  <dd className={ui.mono}>{result.keptPoints}/{result.totalPoints} conservés</dd>
                </div>
                <div>
                  <dt>Segments</dt>
                  <dd className={ui.mono}>
                    {result.segmentsKept} claimables · {result.segmentsExcluded} exclus
                  </dd>
                </div>
                <div>
                  <dt>GPS / motion trust</dt>
                  <dd className={ui.mono}>{result.gpsTrust} / {result.motionTrust}</dd>
                </div>
                <div>
                  <dt>Pas simulés</dt>
                  <dd className={ui.mono}>{result.stepCount}</dd>
                </div>
                <div>
                  <dt>Hexes traversés</dt>
                  <dd className={ui.mono}>{result.mapHexes.length}</dd>
                </div>
              </dl>

              <dl className={styles.gains}>
                <div>
                  <dt className={styles.gainLabel}>capturés</dt>
                  <dd className={styles.gainValue}>{result.totals.claimed}</dd>
                </div>
                <div>
                  <dt className={styles.gainLabel}>volés</dt>
                  <dd className={styles.gainValue}>{result.totals.stolen}</dd>
                </div>
                <div>
                  <dt className={styles.gainLabel}>défendus</dt>
                  <dd className={styles.gainValue}>{result.totals.defended}</dd>
                </div>
                <div>
                  <dt className={styles.gainLabel}>pionniers</dt>
                  <dd className={styles.gainValue}>{result.totals.pioneer}</dd>
                </div>
                <div>
                  <dt className={styles.gainLabel}>bloqués</dt>
                  <dd className={styles.gainValueMuted}>{result.totals.blocked}</dd>
                </div>
                <div>
                  <dt className={styles.gainLabel}>Foulées</dt>
                  <dd className={styles.gainValue}>
                    {result.score && !result.score.frozen ? `+${result.score.fouleesAwarded}` : '0'}
                  </dd>
                </div>
                <div>
                  <dt className={styles.gainLabel}>XP</dt>
                  <dd className={styles.gainValue}>
                    {result.score && !result.score.frozen ? `+${result.score.xpAwarded}` : '0'}
                  </dd>
                </div>
                {result.score && (
                  <div>
                    <dt className={styles.gainLabel}>multiplicateurs</dt>
                    <dd className={`${styles.gainValueMuted} ${ui.mono}`}>
                      streak ×{result.score.streakMultiplier.toFixed(1)} · perf ×
                      {result.score.performanceModifier.toFixed(2)}
                    </dd>
                  </div>
                )}
              </dl>

              {Object.keys(result.outcomeCounts).length > 0 && (
                <ul className={styles.outcomes}>
                  {(Object.entries(result.outcomeCounts) as [keyof typeof OUTCOME_LABELS, number][])
                    .map(([outcome, n]) => (
                      <li key={outcome}>
                        <span className={ui.mono}>{n}×</span> {OUTCOME_LABELS[outcome]}
                      </li>
                    ))}
                </ul>
              )}

              {/* Badges débloqués — surface badge : la SEULE exception polychrome
                  autorisée (AMENDEMENT-04 §1), teintes familyColor du catalogue. */}
              {result.newBadges.length > 0 && (
                <div className={styles.badges}>
                  <p className={ui.kicker}>BADGES DÉBLOQUÉS ({result.newBadges.length})</p>
                  <ul className={styles.badgeList}>
                    {result.newBadges.map((b) => (
                      <li key={b.key} className={styles.badgeItem}>
                        <svg
                          viewBox="0 0 24 24"
                          width={28}
                          height={28}
                          aria-hidden="true"
                          className={styles.badgeHex}
                        >
                          <polygon
                            points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"
                            fill={b.familyColor}
                            fillOpacity={0.16}
                            stroke={b.familyColor}
                            strokeWidth={1.5}
                          />
                        </svg>
                        <div>
                          <p className={styles.badgeName} style={{ color: b.familyColor }}>
                            {b.name}
                            {b.secret && <span className={styles.badgeSecret}> · secret</span>}
                          </p>
                          <p className={styles.badgeReq}>{b.requirement}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {toast}
    </div>
  );
}
