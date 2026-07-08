/**
 * GRYD Admin — formatage FR (dates, distances, allures, libellés).
 * Aucune couleur ici : les statuts sont des libellés, le style vit en CSS Modules.
 */
import type { HexOutcome, RejectReason, RunStatus } from '@klaim/shared/types';

export function formatKm(distanceM: number): string {
  return `${(distanceM / 1000).toFixed(2).replace('.', ',')} km`;
}

export function formatDuration(durationS: number): string {
  const s = Math.round(durationS);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, '0')} min`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** Allure s/km → « 5:30 /km ». */
export function formatPace(paceSKm: number): string {
  if (!Number.isFinite(paceSKm) || paceSKm <= 0) return '—';
  const m = Math.floor(paceSKm / 60);
  const s = Math.round(paceSKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) +
    ' ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string, now = Date.now()): string {
  const diffMs = now - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'à l’instant';
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export const STATUS_LABELS: Record<RunStatus, string> = {
  valid: 'Validée',
  partial: 'Partielle',
  flagged: 'Flaggée',
  rejected: 'Rejetée',
};

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  too_short: 'Trop courte (< 1 km)',
  too_brief: 'Trop brève (< 6 min)',
  pace_too_fast: 'Allure trop rapide (anti-vélo)',
  pace_too_slow: 'Allure trop lente',
  no_valid_points: 'Aucun point GPS exploitable',
};

export const OUTCOME_LABELS: Record<HexOutcome, string> = {
  claimed_neutral: 'Capturé (neutre)',
  stolen: 'Volé à un adversaire',
  defended: 'Défendu',
  already_owned_cooldown: 'Déjà à moi (cooldown 24 h)',
  blocked_lock: 'Bloqué — lock 24 h',
  blocked_fresh_protection: 'Bloqué — zone fraîchement capturée (protégée)',
  blocked_shield: 'Bloqué — bouclier legacy (hex)',
  blocked_new_player: 'Bloqué — nouveau joueur protégé',
  blocked_privacy: 'Bloqué — zone privée',
  blocked_no_capture_zone: 'Bloqué — zone non capturable',
  blocked_daily_cap: 'Bloqué — plafond quotidien',
  blocked_onboarding_neutral_only: 'Bloqué — import fondateur (hex non neutre)',
};
