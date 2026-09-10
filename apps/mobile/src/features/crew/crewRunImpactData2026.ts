/**
 * GRYD — CÂBLAGE de `crew_run_impact_2026` (migration 0182). Aucune règle ici :
 * les décisions vivent dans `crewRunImpact2026.ts`, pures et testées.
 *
 * ─── POURQUOI CE HOOK ET PAS `useSocialRead2026` ────────────────────────────
 * `useSocialRead2026` lit DÈS QU'UNE session existe. L'écran de résultat, lui,
 * s'ouvre aussi sur une sortie qui n'est pas (encore) chez le serveur : sortie
 * enregistrée sans compte, sortie en attente d'envoi, sortie d'un autre compte
 * ouverte depuis le journal. Dans ces cas il n'y a pas de `runId` serveur à
 * interroger, et lancer quand même l'appel pour se faire répondre `not_found`
 * serait un aller-retour réseau au moment exact où le téléphone vient de finir
 * une course. Ce hook ne part donc QUE quand il y a quelque chose à demander.
 *
 * ─── LA GARDE DE PROPRIÉTAIRE EST LA MÊME QUE PARTOUT ───────────────────────
 * `socialRpc2026` vérifie la session AVANT et APRÈS l'appel, et `resultOwner2026`
 * fournit l'époque : une réponse qui arrive après un changement de compte est
 * jetée. C'est le patron déjà appliqué au reçu de capture sur le même écran ;
 * en diverger ici ferait afficher le crew de quelqu'un d'autre pendant une
 * fraction de seconde, ce qui est exactement le genre de fuite qu'on refuse.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSession } from '../../lib/session';
import { isResultOwnerCurrent2026, resultOwnerEpoch2026, subscribeResultOwner2026 } from '../run/resultOwner2026';
import { socialRpc2026 } from '../social/social2026Data';
import { parseCrewRunImpact2026, type CrewRunImpact2026 } from './crewRunImpact2026';

/**
 * `runId` `null` = rien à demander. Le hook rend alors `{ kind: 'none' }` :
 * l'écran n'affiche aucun bloc crew, ce qui est la bonne réponse — on ne sait
 * rien, et on ne prétend rien.
 */
export function useCrewRunImpact2026(runId: string | null): { impact: CrewRunImpact2026; reload: () => void } {
  const { session, loading: restoring } = useSession();
  const owner = session?.user.id ?? null;
  const epoch = useSyncExternalStore(subscribeResultOwner2026, resultOwnerEpoch2026, resultOwnerEpoch2026);
  const current = useRef(owner);
  current.current = owner;
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<{ owner: string; epoch: number; runId: string; value: CrewRunImpact2026 } | null>(null);
  const reload = useCallback(() => setTick(n => n + 1), []);

  useEffect(() => {
    if (!owner || restoring || !runId) return;
    let cancelled = false;
    setState({ owner, epoch, runId, value: { kind: 'loading' } });
    socialRpc2026<unknown>(owner, 'crew_run_impact_2026', { p_run_id: runId }, epoch)
      .then(data => {
        if (cancelled || current.current !== owner || !isResultOwnerCurrent2026(owner, epoch)) return;
        // Une forme inattendue ou un refus (`{ok:false}`) N'EST PAS « sans
        // crew » : les fondre ferait disparaître le crew de quelqu'un sur un
        // refus de session ou un contrat plus récent que ce build.
        setState({ owner, epoch, runId, value: parseCrewRunImpact2026(data) ?? { kind: 'failed' } });
      })
      .catch(() => {
        if (cancelled || current.current !== owner || !isResultOwnerCurrent2026(owner, epoch)) return;
        setState({ owner, epoch, runId, value: { kind: 'failed' } });
      });
    return () => { cancelled = true; };
  }, [owner, epoch, restoring, runId, tick]);

  if (!owner || !runId) return { impact: { kind: 'none' }, reload };
  const mine = state && state.owner === owner && state.epoch === epoch && state.runId === runId;
  return { impact: mine ? state.value : { kind: 'loading' }, reload };
}
