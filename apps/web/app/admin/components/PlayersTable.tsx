'use client';

/**
 * Joueurs à risque — tri au clic + menu de sanctions progressives (§7).
 * DÉMO : sanction appliquée en mémoire + toast (TODO O1 : Supabase + admin_actions).
 */
import { useMemo, useState } from 'react';
import type { DemoPlayer, DemoSanction } from '../lib/demo-data';
import { timeAgo } from '../lib/format';
import { useToast } from './toast';
import ui from './ui.module.css';

/** Échelle §7 — l'ordre EST la doctrine : on ne saute pas les étapes sans raison. */
const SANCTIONS: { level: number; label: string }[] = [
  { level: 1, label: 'Correction silencieuse' },
  { level: 2, label: 'Avertissement doux' },
  { level: 3, label: 'Claims gelés' },
  { level: 4, label: 'Restriction 24 h' },
  { level: 5, label: 'Restriction 7 jours' },
  { level: 6, label: 'Wipe saison' },
  { level: 7, label: 'Ban capture' },
  { level: 8, label: 'Ban compte' },
];

type SortKey = 'pseudo' | 'riskScore' | 'flaggedRuns' | 'repeatedTraces' | 'runsTotal';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'pseudo', label: 'Joueur' },
  { key: 'riskScore', label: 'Risk score' },
  { key: 'flaggedRuns', label: 'Runs flaggés' },
  { key: 'repeatedTraces', label: 'Traces répétées' },
  { key: 'runsTotal', label: 'Runs total' },
];

export function PlayersTable({ players }: { players: DemoPlayer[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('riskScore');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [applied, setApplied] = useState<Record<string, DemoSanction[]>>({});
  const { toast, showToast } = useToast();

  const rows = useMemo(
    () =>
      [...players].sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        const cmp = typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : Number(va) - Number(vb);
        return cmp * sortDir;
      }),
    [players, sortKey, sortDir],
  );

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const sanction = (player: DemoPlayer, level: number) => {
    const s = SANCTIONS.find((x) => x.level === level);
    if (!s) return;
    const history = [...player.sanctions, ...(applied[player.id] ?? [])];
    const maxLevel = history.reduce((m, x) => Math.max(m, x.level), 0);
    // Garde-fou §7 : progression seulement (pas de saut de 2+ niveaux sans historique).
    if (level > maxLevel + 2) {
      showToast(
        `Sanction refusée : « ${s.label} » saute des étapes (dernier niveau : ${maxLevel || 'aucun'}).`,
      );
      return;
    }
    setApplied((m) => ({
      ...m,
      [player.id]: [
        ...(m[player.id] ?? []),
        { level, label: s.label, at: new Date().toISOString() },
      ],
    }));
    showToast(`« ${s.label} » appliqué à ${player.pseudo} (démo — journalisé §9).`);
  };

  return (
    <>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} className={ui.thSortable} onClick={() => onSort(c.key)}>
                  {c.label}
                  {sortKey === c.key ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
              <th>Multi-compte</th>
              <th>Device</th>
              <th>Intégrité</th>
              <th>Sanctions</th>
              <th>Sanctionner (§7)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const history = [...p.sanctions, ...(applied[p.id] ?? [])];
              const last = history[history.length - 1];
              return (
                <tr key={p.id}>
                  <td>
                    {p.pseudo}
                    <span className={`${ui.mono} ${ui.muted}`} style={{ marginLeft: 8 }}>
                      {p.id}
                    </span>
                  </td>
                  <td className={ui.mono}>
                    {p.riskScore}
                    {p.riskScore >= 55 && (
                      <span className={`${ui.chip} ${ui.chipFlagged}`} style={{ marginLeft: 8 }}>
                        à risque
                      </span>
                    )}
                  </td>
                  <td className={ui.mono}>{p.flaggedRuns}</td>
                  <td className={ui.mono}>{p.repeatedTraces}</td>
                  <td className={ui.mono}>{p.runsTotal}</td>
                  <td className={ui.muted}>{p.multiAccountSuspect ? 'suspect' : '—'}</td>
                  <td className={ui.muted}>{p.device}</td>
                  <td className={p.deviceIntegrity === 'ok' ? ui.muted : undefined}>
                    {p.deviceIntegrity}
                  </td>
                  <td className={ui.muted}>
                    {last ? `${last.label} (${timeAgo(last.at)})` : 'aucune'}
                  </td>
                  <td>
                    <select
                      className={ui.select}
                      value=""
                      aria-label={`Sanctionner ${p.pseudo}`}
                      onChange={(e) => {
                        const lvl = Number(e.target.value);
                        if (lvl) sanction(p, lvl);
                        e.target.value = '';
                      }}
                    >
                      <option value="">Choisir…</option>
                      {SANCTIONS.map((s) => (
                        <option key={s.level} value={s.level}>
                          {s.level}. {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {toast}
    </>
  );
}
