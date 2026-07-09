/**
 * GRYD — données affichées au moment signature (import réel ou démo).
 */
import { SYNC_DEMO_RUN } from './syncDemo';

export interface OnboardingCaptureResult {
  zones: number;
  enclosedZones: number;
  zoneName: string;
  founderXp?: number;
  playerLevel?: number;
  isDemo: boolean;
}

export const DEMO_CAPTURE_RESULT: OnboardingCaptureResult = {
  zones: SYNC_DEMO_RUN.zones,
  enclosedZones: SYNC_DEMO_RUN.enclosedZones,
  zoneName: SYNC_DEMO_RUN.zoneName,
  isDemo: true,
};

export function captureFromImport(
  hexesClaimed: number,
  founderXp: number,
  playerLevel: number,
): OnboardingCaptureResult {
  if (hexesClaimed <= 0) {
    return { ...DEMO_CAPTURE_RESULT, founderXp, playerLevel, isDemo: true };
  }
  return {
    zones: hexesClaimed,
    enclosedZones: Math.round(hexesClaimed * 0.62),
    zoneName: 'Ton quartier',
    founderXp,
    playerLevel,
    isDemo: false,
  };
}
