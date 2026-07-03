'use client';

/** Claims gelés — tri au clic + actions démo en mémoire (TODO O1 : Supabase). */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { DemoFrozenClaim } from '../lib/demo-data';
import { formatDateTime, timeAgo } from '../lib/format';
import { useToast } from './toast';
import ui from './ui.module.css';

type SortKey = 'pseudo' | 'hexCount' | 'potentialPoints' | 'frozenAt';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'pseudo', label: 'Joueur' },
  { key: 'hexCount', label: 'Hexes' },
  { key: 'potentialPoints', label: 'Score potentiel' },
  { key: 'frozenAt', label: 'Gelé depuis' },
];

type Resolution = 'released' | 'rejected';

export function ClaimsTable({ claims }: { claims: DemoFrozenClaim[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('frozenAt');
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [resolved, setResolved] = useState<Record<string, Resolution>>({});
  const { toast, showToast } = useToast();

  const rows = useMemo(
    () =>
      [...claims].sort((a, b) => {
        const va = a[sortKey];
        const vb = b[sortKey];
        const cmp = typeof va === 'string' && typeof vb === 'string'
          ? va.localeCompare(vb)
          : Number(va) - Number(vb);
        return cmp * sortDir;
      }),
    [claims, sortKey, sortDir],
  );

  const onSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(-1);
    }
  };

  const resolve = (claim: DemoFrozenClaim, r: Resolution) => {
    setResolved((m) => ({ ...m, [claim.id]: r }));
    showToast(
      r === 'released'
        ? `${claim.hexCount} hexes débloqués pour ${claim.pseudo} (+${claim.potentialPoints} pts).`
        : `Claims de ${claim.pseudo} rejetés — aucun hex attribué.`,
    );
  };

  return (
    <>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th>Claim</th>
              <th>Course</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className={ui.thSortable} onClick={() => onSort(c.key)}>
                  {c.label}
                  {sortKey === c.key ? (sortDir === 1 ? ' ↑' : ' ↓') : ''}
                </th>
              ))}
              <th>Raison</th>
              <th>Impact classement</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const r = resolved[c.id];
              return (
                <tr key={c.id}>
                  <td className={ui.mono}>{c.id}</td>
                  <td className={ui.mono}>
                    <Link href={`/admin/courses/${c.runId}`}>{c.runId}</Link>
                  </td>
                  <td>{c.pseudo}</td>
                  <td className={ui.mono}>{c.hexCount}</td>
                  <td className={ui.mono}>{c.potentialPoints} pts</td>
                  <td className={`${ui.mono} ${ui.muted}`} title={formatDateTime(c.frozenAt)}>
                    {timeAgo(c.frozenAt)}
                  </td>
                  <td className={ui.muted}>{c.reason}</td>
                  <td className={ui.muted}>{c.rankImpact}</td>
                  <td>
                    {r === 'released' && <span className={`${ui.chip} ${ui.chipValid}`}>Débloqué</span>}
                    {r === 'rejected' && <span className={`${ui.chip} ${ui.chipRejected}`}>Rejeté</span>}
                    {!r && (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          className={`${ui.btnGhost} ${ui.btnSmall}`}
                          onClick={() => resolve(c, 'released')}
                        >
                          Débloquer
                        </button>
                        <button
                          type="button"
                          className={`${ui.btnGhost} ${ui.btnSmall}`}
                          onClick={() => resolve(c, 'rejected')}
                        >
                          Rejeter
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className={ui.muted}>
                  Aucun claim gelé. La grille est saine.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {toast}
    </>
  );
}
