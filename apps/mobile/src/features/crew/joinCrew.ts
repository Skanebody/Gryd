/**
 * GRYD — rejoindre un crew depuis Discovery / page publique.
 * Appelle crew_membership quand session + code ; sinon toast démo honnête.
 */
import { EVENTS, track } from '../../lib/analytics';
import { useSession } from '../../lib/session';
import { joinCrewByCode } from './crewApi';
import { canApplyTo, type PublicCrewDemo } from './publicDemo';

const ERROR_LABELS: Record<string, string> = {
  already_in_crew: 'Tu es déjà dans un crew',
  cooldown: 'Tu viens de quitter un crew — réessaie dans quelques jours',
  crew_not_found: 'Code invalide ou crew introuvable',
  recruitment_closed: 'Ce crew ne recrute plus',
  crew_full: 'Ce crew est complet',
  invalid_code: 'Code d’invitation invalide',
  offline: 'Hors ligne — réessaie plus tard',
  unauthorized: 'Connecte-toi pour rejoindre un crew',
};

function errorMessage(code: string | undefined, fallback: string): string {
  if (code && ERROR_LABELS[code]) return ERROR_LABELS[code]!;
  return fallback;
}

export interface JoinCrewOutcome {
  ok: boolean;
  message: string;
}

/** Tente un join réel (open + joinCode) ou renvoie un message démo/on_request. */
export async function joinPublicCrew(
  crew: Pick<PublicCrewDemo, 'name' | 'recruitment' | 'joinCode'>,
  sessionPresent: boolean,
): Promise<JoinCrewOutcome> {
  if (!canApplyTo(crew.recruitment)) {
    return {
      ok: false,
      message: `${crew.name} recrute sur invitation uniquement`,
    };
  }

  if (crew.recruitment === 'on_request') {
    track(EVENTS.crewJoined, { via: 'application_stub' });
    return { ok: true, message: `Demande envoyée à ${crew.name}` };
  }

  if (!sessionPresent) {
    return {
      ok: true,
      message: `Bienvenue chez ${crew.name} — connecte-toi pour sauvegarder`,
    };
  }

  const code = crew.joinCode?.trim().toUpperCase();
  if (!code) {
    return { ok: false, message: 'Code d’invitation indisponible pour ce crew' };
  }

  const result = await joinCrewByCode(code);
  if (result.ok) {
    track(EVENTS.crewJoined, { via: 'join_by_code' });
    return { ok: true, message: `Bienvenue chez ${result.crew?.name ?? crew.name}` };
  }

  return {
    ok: false,
    message: errorMessage(result.error, `Impossible de rejoindre ${crew.name}`),
  };
}

/** Hook pratique pour les écrans Discovery / publique. */
export function useJoinPublicCrew() {
  const { session, configured } = useSession();
  const sessionPresent = configured && session !== null;

  return (crew: Pick<PublicCrewDemo, 'name' | 'recruitment' | 'joinCode'>) =>
    joinPublicCrew(crew, sessionPresent);
}
