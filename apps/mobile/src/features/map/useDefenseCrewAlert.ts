/**
 * GRYD — « Alerter le crew » de la sheet de DÉFENSE (E22). Envoie un signal de
 * RENFORT RÉEL via `crew_ping_zone` (migration 0051) — le même canal, borné par
 * game-rules, que l'écran de pings du crew (`features/crew/pings.ts`). Un ping est
 * une COORDINATION : l'afficher « envoyé » sans qu'il soit parti au crew serait le
 * mensonge exact que la doctrine interdit. D'où AUCUN repli local — pas de
 * session, pas de backend ⇒ issue `signed_out`, honnête.
 *
 * Le vocabulaire est FIGÉ (`defend_backup`) : aucun texte libre ne transite, la
 * modération est donc structurelle (rien à modérer par construction). L'écriture
 * reste décidée SERVEUR ; ce hook ne fait qu'APPELER et TRADUIRE le verdict
 * (`crewAlertOutcome`, pur et testé) en une issue que l'écran mappe vers un toast.
 *
 * POURQUOI CE PETIT HOOK PLUTÔT QUE `useCrewPings` : ce dernier LIT aussi le flux
 * (`crew_pings_feed`) à chaque montage — la sheet de défense n'a pas besoin du
 * flux, seulement d'ÉMETTRE, et sur un geste. On ne rajoute donc aucune requête
 * passive au montage de la Carte : l'unique appel réseau part quand le doigt tape.
 */
import { useCallback, useState } from 'react';
import {
  CREW_MISSION_RECLAIM_WINDOW_H,
  CREW_PING_COOLDOWN_MIN,
  CREW_PING_MAX_ACTIVE_PER_MEMBER,
  CREW_PING_TTL_H,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { crewAlertOutcome, type CrewAlertOutcome } from './defenseZone';

/** Signal FIGÉ (crewSignals) : « il me faut du renfort », situation défense, secteur. */
const DEFENSE_SIGNAL = 'defend_backup';

export interface DefenseCrewAlert {
  /** Un envoi est en vol : l'écran grise le lien pour éviter le double-tap. */
  alerting: boolean;
  /** Émet le signal pour `sectorId` (le secteur contesté) et rend l'issue. */
  alert: (sectorId: string | null) => Promise<CrewAlertOutcome>;
}

export function useDefenseCrewAlert(): DefenseCrewAlert {
  const { session } = useSession();
  const [alerting, setAlerting] = useState(false);

  const alert = useCallback(
    async (sectorId: string | null): Promise<CrewAlertOutcome> => {
      // Pas de session / pas de backend : un des quatre états honnêtes, dit tel
      // quel — on n'appelle rien et surtout on n'invente pas un « envoyé ».
      if (!supabase || !session) return 'signed_out';
      const client = supabase;
      setAlerting(true);
      try {
        const { data, error } = await client.rpc('crew_ping_zone', {
          p_signal: DEFENSE_SIGNAL,
          p_sector_id: sectorId,
          // Les bornes viennent de game-rules — le SQL n'en écrit aucune en dur.
          p_ttl_h: CREW_PING_TTL_H,
          p_cooldown_min: CREW_PING_COOLDOWN_MIN,
          p_max_active: CREW_PING_MAX_ACTIVE_PER_MEMBER,
          p_reclaim_window_h: CREW_MISSION_RECLAIM_WINDOW_H,
        });
        if (error) return 'failed';
        const res = (data ?? {}) as { ok?: unknown; reason?: unknown };
        return crewAlertOutcome({
          ok: res.ok === true,
          reason: typeof res.reason === 'string' ? res.reason : null,
        });
      } catch {
        return 'failed';
      } finally {
        setAlerting(false);
      }
    },
    [session],
  );

  return { alerting, alert };
}
