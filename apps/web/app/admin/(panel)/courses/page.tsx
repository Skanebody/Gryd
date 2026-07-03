import { getRuns } from '../../lib/demo-data';
import { CoursesTable } from '../../components/CoursesTable';
import ui from '../../components/ui.module.css';

/** Courses suspectes (spec admin §3) — table complète, filtre par statut, tri au clic. */
export default function AdminCoursesPage() {
  const runs = getRuns().map((r) => ({
    id: r.id,
    pseudo: r.pseudo,
    startedAt: r.startedAt,
    distanceM: r.distanceM,
    durationS: r.durationS,
    avgPaceSKm: r.avgPaceSKm,
    trustScore: r.trustScore,
    status: r.status,
    reason: r.rejectReason ?? r.flagReasons[0] ?? null,
    source: r.source,
  }));

  return (
    <div>
      <p className={ui.kicker}>REVUE · WORKFLOW §6</p>
      <h1 className={ui.pageTitle}>Courses suspectes</h1>
      <p className={ui.pageSub}>
        Toutes les courses ingérées. Les flaggées gèlent leurs claims en attendant une
        décision (valider · valider partiellement · rejeter · abus).
      </p>
      <CoursesTable runs={runs} />
    </div>
  );
}
