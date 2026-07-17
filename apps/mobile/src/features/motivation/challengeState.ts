/**
 * GRYD — activation O1 : progression RÉELLE des challenges (états vides).
 *
 * Le CATALOGUE de challenges (nom, objectif chiffré du seed, récompense) est du
 * CONTENU légitime, identique pour tous. Mais « où en est le joueur » (`current`,
 * `myContrib`, scores de rivalité) est en démo. Un vrai utilisateur (session)
 * n'a encore RIEN fait sur ces challenges tant que `challenge_progress` (0012)
 * n'est pas lu → on remet ces valeurs à 0 (« l'app ne ment jamais »), sans
 * toucher aux définitions. La démo showcase (web/dev sans session) est inchangée.
 */
import { useSession } from '../../lib/session';
import { CHALLENGES, type ChallengeCard } from './demo';

/** Le catalogue avec la progression réelle (0 pour un vrai user), démo sinon. */
export function useChallenges(): ChallengeCard[] {
  const { session, configured } = useSession();
  if (!(configured && session)) return CHALLENGES;
  return CHALLENGES.map(zeroProgress);
}

/** Un challenge par id, progression réelle (0) si session, démo sinon. */
export function useChallenge(id: string | undefined): ChallengeCard | undefined {
  const list = useChallenges();
  return id ? list.find((c) => c.id === id) : undefined;
}

/** Garde les définitions (nom/objectif/récompense), remet la progression à 0. */
function zeroProgress(c: ChallengeCard): ChallengeCard {
  return {
    ...c,
    current: 0,
    ...(c.myContrib !== undefined ? { myContrib: 0 } : {}),
    ...(c.rivalMine !== undefined ? { rivalMine: 0 } : {}),
    ...(c.rivalOther !== undefined ? { rivalOther: 0 } : {}),
  };
}
