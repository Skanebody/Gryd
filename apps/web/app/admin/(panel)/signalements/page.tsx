/**
 * GRYD Admin — file de revue des SIGNALEMENTS (modération UGC, App Store
 * Guideline 1.2 : revue sous 24 h).
 *
 * C'est LA surface qui manquait : jusqu'ici un signalement partait de l'app,
 * atterrissait dans `content_reports`… et personne ne pouvait le voir. Le
 * dashboard affichait même un compteur de démo. Cette page lit les VRAIES
 * lignes en service-role (RPC `admin_reports_queue` / `admin_reports_counts`,
 * migration 0046), les `pending` en tête.
 *
 * Si la console n'est pas branchée à Supabase, on le DIT au lieu d'afficher une
 * liste vide qui se lirait « aucun signalement à traiter ».
 */
import { getReports } from '../../lib/reports';
import { formatDateTime } from '../../lib/format';
import { ResolveButtons } from './ResolveButtons';
import ui from '../../components/ui.module.css';

export const dynamic = 'force-dynamic';

const REASON_LABEL: Record<string, string> = {
  spam: 'Spam',
  haine: 'Haine',
  harcelement: 'Harcèlement',
  autre: 'Autre',
};

const KIND_LABEL: Record<string, string> = {
  message: 'Message',
  member: 'Membre',
};

const STATUS_CLASS: Record<string, string | undefined> = {
  pending: ui.chipFlagged,
  reviewed: ui.chipPartial,
  actioned: ui.chipValid,
  dismissed: ui.chipNeutral,
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'À traiter',
  reviewed: 'Vu',
  actioned: 'Sanctionné',
  dismissed: 'Écarté',
};

export default async function SignalementsPage() {
  const result = await getReports();

  if (!result.configured) {
    return (
      <div>
        <p className={ui.kicker}>MODÉRATION</p>
        <h1 className={ui.pageTitle}>Signalements</h1>
        <div className={ui.card}>
          <p className={ui.sectionTitle}>Console non branchée</p>
          <p className={ui.pageSub}>
            {result.reason === 'missing_env' ? (
              <>
                Cette page lit les signalements réels via la clé service-role.
                Définis <code className={ui.mono}>SUPABASE_SERVICE_ROLE_KEY</code> (et{' '}
                <code className={ui.mono}>NEXT_PUBLIC_SUPABASE_URL</code>) côté serveur
                pour l&rsquo;activer.
              </>
            ) : (
              <>Lecture impossible : {result.message}</>
            )}
          </p>
          <p className={ui.muted}>
            Tant que ce n&rsquo;est pas fait, aucun chiffre n&rsquo;est affiché ici — un
            zéro serait un mensonge, pas une absence de signalement.
          </p>
        </div>
      </div>
    );
  }

  const { reports, counts } = result;

  return (
    <div>
      <p className={ui.kicker}>MODÉRATION · REVUE SOUS 24 H</p>
      <h1 className={ui.pageTitle}>Signalements</h1>
      <p className={ui.pageSub}>
        Signalements émis depuis l&rsquo;app (chat crew, membres). Les non traités
        apparaissent en premier.
      </p>

      <div className={ui.kpiGrid}>
        <div className={ui.kpi}>
          <p className={`${ui.kpiValue} ${ui.kpiValueAccent}`}>{counts.pending}</p>
          <p className={ui.kpiLabel}>À traiter</p>
        </div>
        <div className={ui.kpi}>
          <p className={ui.kpiValue}>{counts.actioned}</p>
          <p className={ui.kpiLabel}>Sanctionnés</p>
        </div>
        <div className={ui.kpi}>
          <p className={ui.kpiValue}>{counts.dismissed}</p>
          <p className={ui.kpiLabel}>Écartés</p>
        </div>
        <div className={ui.kpi}>
          <p className={ui.kpiValue}>{counts.total}</p>
          <p className={ui.kpiLabel}>Total</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className={ui.card}>
          <p className={ui.sectionTitle}>Aucun signalement</p>
          <p className={ui.muted}>
            La file est réellement vide (lecture confirmée en base).
          </p>
        </div>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Reçu le</th>
                <th>Type</th>
                <th>Visé</th>
                <th>Motif</th>
                <th>Signalé par</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id}>
                  <td className={ui.mono}>{formatDateTime(r.created_at)}</td>
                  <td>{KIND_LABEL[r.kind] ?? r.kind}</td>
                  <td>
                    <span className={ui.mono}>{r.author}</span>
                    {r.kind === 'message' ? (
                      <>
                        {' '}
                        <span className={ui.muted}>(msg {r.target_id})</span>
                      </>
                    ) : null}
                  </td>
                  <td>{REASON_LABEL[r.reason] ?? r.reason}</td>
                  <td>
                    {/* NULL = compte du rapporteur supprimé (0046). On le dit,
                        on n'invente pas un « Anonyme » qui laisserait croire à
                        un signalement anonyme par conception. */}
                    {r.reporter_pseudo ?? (
                      <span className={ui.muted}>compte supprimé</span>
                    )}
                  </td>
                  <td>
                    <span className={`${ui.chip} ${STATUS_CLASS[r.status] ?? ui.chipNeutral}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td>
                    <ResolveButtons id={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
