'use client';

/** Table des courses : filtre par statut + tri simple au clic (spec « table-first »). */
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RunStatus } from '@klaim/shared/types';
import {
  REJECT_REASON_LABELS,
  STATUS_LABELS,
  formatDateTime,
  formatDuration,
  formatKm,
  formatPace,
} from '../lib/format';
import { StatusChip } from './StatusChip';
import ui from './ui.module.css';

export interface CourseRow {
  id: string;
  pseudo: string;
  startedAt: string;
  distanceM: number;
  durationS: number;
  avgPaceSKm: number;
  trustScore: number;
  status: RunStatus;
  reason: string | null;
  source: string;
}

type SortKey = 'pseudo' | 'startedAt' | 'distanceM' | 'durationS' | 'avgPaceSKm' | 'trustScore';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'pseudo', label: 'Joueur' },
  { key: 'startedAt', label: 'Date' },
  { key: 'distanceM', label: 'Distance' },
  { key: 'durationS', label: 'Durée' },
  { key: 'avgPaceSKm', label: 'Allure' },
  { key: 'trustScore', label: 'Trust' },
];

const FILTERS: (RunStatus | 'all')[] = ['all', 'flagged', 'partial', 'rejected', 'valid'];

export function CoursesTable({ runs }: { runs: CourseRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<RunStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('startedAt');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const rows = useMemo(() => {
    const filtered = filter === 'all' ? runs : runs.filter((r) => r.status === filter);
    return [...filtered].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const cmp = typeof va === 'string' && typeof vb === 'string'
        ? va.localeCompare(vb)
        : Number(va) - Number(vb);
      return cmp * sortDir;
    });
  }, [runs, filter, sortKey, sortDir]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  return (
    <>
      <div className={ui.filterRow} role="group" aria-label="Filtrer par statut">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? `${ui.filterBtn} ${ui.filterBtnActive}` : ui.filterBtn}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Toutes' : STATUS_LABELS[f]}
            {' '}
            ({f === 'all' ? runs.length : runs.filter((r) => r.status === f).length})
          </button>
        ))}
      </div>

      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th>Run</th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={ui.thSortable}
                  onClick={() => onSort(c.key)}
                  aria-sort={sortKey === c.key ? (sortDir === 1 ? 'ascending' : 'descending') : undefined}
                >
                  {c.label}
                  {sortKey === c.key ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
              <th>Source</th>
              <th>Statut</th>
              <th>Raison</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((run) => (
              <tr
                key={run.id}
                className={ui.rowLink}
                onClick={() => router.push(`/admin/courses/${run.id}`)}
              >
                <td className={ui.mono}>{run.id}</td>
                <td>{run.pseudo}</td>
                <td className={`${ui.mono} ${ui.muted}`}>{formatDateTime(run.startedAt)}</td>
                <td className={ui.mono}>{formatKm(run.distanceM)}</td>
                <td className={ui.mono}>{formatDuration(run.durationS)}</td>
                <td className={ui.mono}>{formatPace(run.avgPaceSKm)}</td>
                <td className={ui.mono}>{run.trustScore}</td>
                <td className={`${ui.mono} ${ui.muted}`}>{run.source}</td>
                <td>
                  <StatusChip status={run.status} />
                </td>
                <td className={ui.muted}>
                  {run.reason
                    ? (REJECT_REASON_LABELS as Record<string, string>)[run.reason] ?? run.reason
                    : '—'}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className={ui.muted}>
                  Aucune course pour ce filtre.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
