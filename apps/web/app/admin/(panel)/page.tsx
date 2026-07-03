import Link from 'next/link';
import { getDashboardStats, getRuns } from '../lib/demo-data';
import { formatDateTime, formatKm, formatPace } from '../lib/format';
import { StatusChip } from '../components/StatusChip';
import ui from '../components/ui.module.css';

/** Dashboard général (spec admin §3 — P0). Données démo, TODO(O1) Supabase. */
export default function AdminDashboardPage() {
  const stats = getDashboardStats();
  const lastRuns = getRuns().slice(0, 10);

  const kpis = [
    { label: 'Courses du jour', value: stats.runsToday },
    { label: 'Courses flaggées', value: stats.flaggedPending, accent: true },
    { label: 'Claims gelés', value: stats.frozenClaims },
    { label: 'Joueurs actifs', value: stats.activePlayers },
    { label: 'Nouveaux crews', value: stats.newCrews },
    { label: 'Signalements', value: stats.reports },
  ];

  return (
    <div>
      <p className={ui.kicker}>SAISON 0 · PARIS + LILLE</p>
      <h1 className={ui.pageTitle}>Dashboard</h1>
      <p className={ui.pageSub}>
        Vue d&rsquo;ensemble de l&rsquo;exploitation. Priorité : litiges de courses et triche
        (spec admin §10).
      </p>

      <div className={ui.kpiGrid}>
        {kpis.map((k) => (
          <div key={k.label} className={ui.kpi}>
            <p className={k.accent ? `${ui.kpiValue} ${ui.kpiValueAccent}` : ui.kpiValue}>
              {k.value}
            </p>
            <p className={ui.kpiLabel}>{k.label}</p>
          </div>
        ))}
      </div>

      <h2 className={ui.sectionTitle}>10 dernières courses</h2>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th>Run</th>
              <th>Joueur</th>
              <th>Date</th>
              <th>Distance</th>
              <th>Allure</th>
              <th>Trust</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {lastRuns.map((run) => (
              <tr key={run.id}>
                <td className={ui.mono}>
                  <Link href={`/admin/courses/${run.id}`}>{run.id}</Link>
                </td>
                <td>{run.pseudo}</td>
                <td className={`${ui.mono} ${ui.muted}`}>{formatDateTime(run.startedAt)}</td>
                <td className={ui.mono}>{formatKm(run.distanceM)}</td>
                <td className={ui.mono}>{formatPace(run.avgPaceSKm)}</td>
                <td className={ui.mono}>{run.trustScore}</td>
                <td>
                  <StatusChip status={run.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
