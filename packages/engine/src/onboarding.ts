/**
 * GRYD — import onboarding fondateur (logique PURE).
 * Batch unique : carte remplie (neutres), 0 pt saison, bonus XP plafonné.
 */
import {
  ONBOARDING_IMPORT_XP_CAP,
  ONBOARDING_IMPORT_XP_TOP_RUNS,
  ONBOARDING_IMPORT_WINDOW_DAYS,
} from '@klaim/shared/game-rules';

/** XP fondateur crédité à partir des candidats par course (meilleures en premier). */
export function founderXpFromCandidates(candidates: readonly number[]): number {
  const top = [...candidates]
    .filter((n) => n > 0)
    .sort((a, b) => b - a)
    .slice(0, ONBOARDING_IMPORT_XP_TOP_RUNS);
  const sum = top.reduce((acc, n) => acc + n, 0);
  return Math.min(sum, ONBOARDING_IMPORT_XP_CAP);
}

/** Borne basse UTC pour la fenêtre d'import (now − WINDOW jours). */
export function onboardingImportWindowStart(now: Date): Date {
  return new Date(now.getTime() - ONBOARDING_IMPORT_WINDOW_DAYS * 86_400_000);
}

/** Activité dans la fenêtre d'import onboarding ? */
export function isWithinOnboardingImportWindow(startedAt: Date, now: Date): boolean {
  return startedAt.getTime() >= onboardingImportWindowStart(now).getTime() &&
    startedAt.getTime() <= now.getTime();
}
