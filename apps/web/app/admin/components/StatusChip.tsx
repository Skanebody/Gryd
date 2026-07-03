import type { RunStatus } from '@klaim/shared/types';
import { STATUS_LABELS } from '../lib/format';
import ui from './ui.module.css';

const CLASS_BY_STATUS: Record<RunStatus, string> = {
  valid: ui.chipValid!,
  partial: ui.chipPartial!,
  flagged: ui.chipFlagged!,
  rejected: ui.chipRejected!,
};

/** Chip de statut — différenciation par luminance + libellé, jamais de rouge. */
export function StatusChip({ status }: { status: RunStatus }) {
  return <span className={`${ui.chip} ${CLASS_BY_STATUS[status]}`}>{STATUS_LABELS[status]}</span>;
}
