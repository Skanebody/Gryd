'use client';

/**
 * Boutons de revue d'un signalement. Un signalement déjà traité n'affiche plus
 * d'action : la file doit se vider, pas se re-statuer indéfiniment.
 */
import { useActionState } from 'react';
import { resolveReportAction, type ResolveState } from './actions';
import ui from '../../components/ui.module.css';

const INITIAL: ResolveState = { status: 'idle' };

export function ResolveButtons({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState(resolveReportAction, INITIAL);

  if (status !== 'pending') {
    return <span className={ui.muted}>—</span>;
  }

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        name="status"
        value="actioned"
        disabled={pending}
        className={`${ui.btnGhost} ${ui.btnSmall}`}
      >
        Sanctionner
      </button>{' '}
      <button
        type="submit"
        name="status"
        value="dismissed"
        disabled={pending}
        className={`${ui.btnGhost} ${ui.btnSmall}`}
      >
        Écarter
      </button>
      {state.status === 'error' ? (
        <p className={ui.muted} role="alert">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
