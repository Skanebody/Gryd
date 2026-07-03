'use client';

/**
 * Revue d'une course (workflow spec admin §6) — DÉMO : les décisions mutent
 * l'état EN MÉMOIRE côté client et alimentent le journal admin_actions affiché
 * en bas (§9 : aucune action sans trace). TODO(O1) : server actions Supabase
 * (update runs.status + insert admin_actions + review_decisions).
 */
import { useState } from 'react';
import type { RunStatus } from '@klaim/shared/types';
import type { DemoAdminAction, DemoRun } from '../lib/demo-data';
import {
  OUTCOME_LABELS,
  REJECT_REASON_LABELS,
  STATUS_LABELS,
  formatDateTime,
  formatDuration,
  formatKm,
  formatPace,
} from '../lib/format';
import { StatusChip } from './StatusChip';
import { TraceMap, type MapPath } from './TraceMap';
import { useToast } from './toast';
import ui from './ui.module.css';
import styles from './RunReview.module.css';

interface Decision {
  next: RunStatus;
  action: string;
  reason: string;
  toast: string;
}

const DECISIONS: Decision[] = [
  {
    next: 'valid',
    action: 'Valider',
    reason: 'revue manuelle : trace cohérente',
    toast: 'Course validée — claims débloqués.',
  },
  {
    next: 'partial',
    action: 'Valider partiellement',
    reason: 'revue manuelle : segments douteux exclus',
    toast: 'Validation partielle — seuls les segments sûrs claiment.',
  },
  {
    next: 'rejected',
    action: 'Rejeter',
    reason: 'revue manuelle : course non conforme §3.2',
    toast: 'Course rejetée — aucun claim attribué.',
  },
  {
    next: 'rejected',
    action: 'Marquer comme abus',
    reason: 'abus manifeste — sanction progressive §7 à évaluer',
    toast: 'Course marquée comme abus — dossier joueur ouvert.',
  },
];

function tracePaths(run: DemoRun): MapPath[] {
  if (run.trace.length === 0) return [];
  if (run.excludedRanges.length === 0) {
    return [{ id: 'kept-0', points: run.trace, kind: 'kept' }];
  }
  const paths: MapPath[] = [];
  let cursor = 0;
  run.excludedRanges.forEach(([start, end], i) => {
    if (start > cursor) {
      paths.push({ id: `kept-${i}`, points: run.trace.slice(cursor, start + 1), kind: 'kept' });
    }
    paths.push({ id: `excl-${i}`, points: run.trace.slice(start, end + 1), kind: 'excluded' });
    cursor = end;
  });
  if (cursor < run.trace.length - 1) {
    paths.push({ id: 'kept-fin', points: run.trace.slice(cursor), kind: 'kept' });
  }
  return paths;
}

export function RunReview({ run }: { run: DemoRun }) {
  const [status, setStatus] = useState<RunStatus>(run.status);
  const [journal, setJournal] = useState<DemoAdminAction[]>(run.journal);
  const { toast, showToast } = useToast();

  const decide = (d: Decision) => {
    if (d.next === status && d.action !== 'Marquer comme abus') {
      showToast(`Déjà au statut « ${STATUS_LABELS[status]} ».`);
      return;
    }
    const before = status;
    setStatus(d.next);
    setJournal((j) => [
      {
        id: `local-${Date.now()}-${j.length}`,
        at: new Date().toISOString(),
        author: 'admin@gryd.run (démo locale)',
        action: d.action,
        before: `statut : ${STATUS_LABELS[before]}`,
        after: `statut : ${STATUS_LABELS[d.next]}`,
        reason: d.reason,
      },
      ...j,
    ]);
    showToast(d.toast);
  };

  return (
    <div className={styles.grid}>
      <section className={`${ui.card} ${styles.mapCard}`}>
        <p className={ui.kicker}>TRACE (MASQUÉE ZONES PRIVÉES §7)</p>
        <div className={styles.mapWrap}>
          <TraceMap
            hexes={[]}
            paths={tracePaths(run)}
            title={`Trace de la course ${run.id}`}
            compact
          />
        </div>
        <div className={styles.legend}>
          <span className={styles.legendKept}>— segments claimables</span>
          <span className={styles.legendExcluded}>--- segments exclus ({run.segmentsExcluded})</span>
        </div>
      </section>

      <section className={ui.card}>
        <p className={ui.kicker}>DONNÉES</p>
        <dl className={styles.facts}>
          <div>
            <dt>Statut</dt>
            <dd>
              <StatusChip status={status} />
            </dd>
          </div>
          <div>
            <dt>Départ</dt>
            <dd className={ui.mono}>{formatDateTime(run.startedAt)}</dd>
          </div>
          <div>
            <dt>Distance</dt>
            <dd className={ui.mono}>{formatKm(run.distanceM)}</dd>
          </div>
          <div>
            <dt>Durée</dt>
            <dd className={ui.mono}>{formatDuration(run.durationS)}</dd>
          </div>
          <div>
            <dt>Allure moyenne</dt>
            <dd className={ui.mono}>{formatPace(run.avgPaceSKm)}</dd>
          </div>
          <div>
            <dt>Segments</dt>
            <dd className={ui.mono}>
              {run.segmentsKept} conservés · {run.segmentsExcluded} exclus
            </dd>
          </div>
          <div>
            <dt>Trust global</dt>
            <dd className={ui.mono}>{run.trustScore}/100</dd>
          </div>
          <div>
            <dt>GPS trust</dt>
            <dd className={ui.mono}>{run.gpsTrust}/100</dd>
          </div>
          <div>
            <dt>Motion trust</dt>
            <dd className={ui.mono}>{run.motionTrust}/100</dd>
          </div>
          <div>
            <dt>Pas mesurés</dt>
            <dd className={ui.mono}>{run.stepCount ?? '—'}</dd>
          </div>
          <div>
            <dt>Claims demandés</dt>
            <dd className={ui.mono}>{run.claimsRequested} hexes</dd>
          </div>
          <div>
            <dt>Claims accordés</dt>
            <dd className={ui.mono}>
              {status === 'flagged' ? `${run.claimsGranted} (gelés)` : `${run.claimsGranted} hexes`}
            </dd>
          </div>
        </dl>

        {run.rejectReason && (
          <p className={styles.reason}>
            Raison de rejet : {REJECT_REASON_LABELS[run.rejectReason]}
          </p>
        )}
        {run.flagReasons.length > 0 && (
          <ul className={styles.flags}>
            {run.flagReasons.map((f) => <li key={f}>{f}</li>)}
          </ul>
        )}

        <p className={ui.kicker} style={{ marginTop: 18 }}>DÉCISION (§6, ÉTAPE 4)</p>
        <div className={styles.actions}>
          {DECISIONS.map((d) => (
            <button
              key={d.action}
              type="button"
              className={d.action === 'Valider'
                ? `${ui.btnPrimary} ${ui.btnSmall}`
                : `${ui.btnGhost} ${ui.btnSmall}`}
              onClick={() => decide(d)}
            >
              {d.action}
            </button>
          ))}
        </div>
        <p className={styles.demoNote}>
          Démo : décision appliquée en mémoire uniquement (TODO O1 — Supabase).
        </p>
      </section>

      <section className={`${ui.card} ${styles.journalCard}`}>
        <p className={ui.kicker}>JOURNAL ADMIN_ACTIONS (§9 — AUCUNE ACTION SANS TRACE)</p>
        {journal.length === 0
          ? <p className={styles.demoNote}>Aucune action enregistrée sur cette course.</p>
          : (
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Auteur</th>
                  <th>Action</th>
                  <th>Avant</th>
                  <th>Après</th>
                  <th>Raison</th>
                </tr>
              </thead>
              <tbody>
                {journal.map((j) => (
                  <tr key={j.id}>
                    <td className={`${ui.mono} ${ui.muted}`}>{formatDateTime(j.at)}</td>
                    <td>{j.author}</td>
                    <td>{j.action}</td>
                    <td className={ui.muted}>{j.before}</td>
                    <td>{j.after}</td>
                    <td className={ui.muted}>{j.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </section>

      {/* Référence : libellés d'outcomes possibles côté moteur (documentation revue). */}
      <p className={styles.outcomeHint}>
        Outcomes moteur possibles : {Object.values(OUTCOME_LABELS).join(' · ')}
      </p>

      {toast}
    </div>
  );
}
