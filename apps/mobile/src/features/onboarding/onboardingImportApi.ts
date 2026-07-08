/**
 * GRYD — batch unique d'import onboarding (carte + bonus XP fondateur).
 */
import { supabase } from '../../lib/supabase';
import type { IngestRunRequest, OnboardingImportResponse } from '@klaim/shared';

export interface RunOnboardingImportInput {
  refreshToken?: string;
  runs?: IngestRunRequest[];
  cityId?: IngestRunRequest['cityId'];
}

export async function runOnboardingImport(
  input: RunOnboardingImportInput = {},
): Promise<OnboardingImportResponse | { error: string }> {
  if (!supabase) return { error: 'backend_not_configured' };
  const { data, error } = await supabase.functions.invoke('onboarding_import', {
    body: input,
  });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 409) return { error: 'already_done' };
    return { error: 'onboarding_import_failed' };
  }
  return data as OnboardingImportResponse;
}
