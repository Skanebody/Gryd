import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRunById } from '../../../lib/demo-data';
import { RunReview } from '../../../components/RunReview';
import ui from '../../../components/ui.module.css';

/** Détail course (spec admin §3) : carte, segments, scores, claims, actions §6. */
export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = getRunById(id);
  if (!run) notFound();

  return (
    <div>
      <p className={ui.kicker}>
        <Link href="/admin/courses">← COURSES SUSPECTES</Link>
      </p>
      <h1 className={ui.pageTitle}>
        Course <span className={ui.mono}>{run.id}</span>
      </h1>
      <p className={ui.pageSub}>
        {run.pseudo} · {run.cityId === 'paris' ? 'Paris' : 'Métropole de Lille'} · source{' '}
        {run.source}
      </p>
      <RunReview run={run} />
    </div>
  );
}
