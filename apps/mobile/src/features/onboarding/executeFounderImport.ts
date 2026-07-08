/**
 * GRYD — exécution partagée du batch import fondateur (onboarding + Verify Hub).
 * Strava connecté → sync metadata → onboarding_import (serveur décide les hex).
 */
import { EVENTS } from '@klaim/shared';
import { track } from '../../lib/analytics';
import { SOURCE_ADAPTERS } from '../sources/adapters/registry';
import { getStravaRefreshToken } from '../sources/adapters/strava';
import { runOnboardingImport } from './onboardingImportApi';

export type FounderImportError =
  | 'backend_not_configured'
  | 'already_done'
  | 'onboarding_import_failed'
  | 'not_authenticated';

export interface FounderImportSuccess {
  ok: true;
  hexesClaimed: number;
  founderXpAwarded: number;
  playerLevel: number;
  runsProcessed: number;
  alreadyDone: boolean;
}

export type FounderImportOutcome =
  | FounderImportSuccess
  | { ok: false; error: FounderImportError };

export async function executeFounderImport(): Promise<FounderImportOutcome> {
  const strava = SOURCE_ADAPTERS.strava;
  let refreshToken: string | undefined;
  if (strava) {
    const snap = await strava.status();
    if (snap.status === 'connected') {
      if (strava.sync) {
        await strava.sync();
      }
      refreshToken = await getStravaRefreshToken();
    }
  }
  const result = await runOnboardingImport({ refreshToken });
  if ('error' in result) {
    const error = result.error as FounderImportError;
    return { ok: false, error };
  }
  if (!result.alreadyDone || result.runsProcessed > 0) {
    track(EVENTS.onboardingImportComplete, {
      runs: result.runsProcessed,
      founder_xp: result.founderXpAwarded,
      hexes: result.hexesClaimed,
    });
  }
  return {
    ok: true,
    hexesClaimed: result.hexesClaimed,
    founderXpAwarded: result.founderXpAwarded,
    playerLevel: result.playerLevel,
    runsProcessed: result.runsProcessed,
    alreadyDone: result.alreadyDone,
  };
}
