/**
 * GRYD — EFFACER LE TRACÉ D'UNE SORTIE, MAINTENANT. L'I/O, et rien d'autre :
 * les issues et leur traduction vivent dans `./traceRetention.ts` (pur, testé).
 *
 * ═══ POURQUOI UNE RPC ET PAS UN `update` DIRECT ═════════════════════════════
 * `runs_select_own` (0003) ouvre la LECTURE de ses lignes, pas l'écriture. Et
 * même si une policy d'update existait, le client ne pourrait pas tenir les
 * trois choses que `delete_run_trace_2026` (0195) tient :
 *   · effacer LES DEUX formes de trace ensemble — n'en effacer qu'une
 *     laisserait le joueur croire à un effacement qui n'a pas eu lieu ;
 *   · journaliser le geste (`trace_purge_log_2026`), qui est la preuve
 *     d'exécution du droit à l'effacement et qui part dans son export RGPD ;
 *   · opposer le PLANCHER anti-triche — tant qu'une revue (0081) ou un recours
 *     est ouvert sur cette sortie, son tracé est la preuve du dossier.
 * « Tout claim est décidé serveur ; écriture client interdite sur les tables de
 * jeu » (CLAUDE.md) : un effacement en est un.
 *
 * AUCUNE ISSUE MUETTE : les six cas de `TraceDeleteOutcome` sont distincts, et
 * un échec ne se déguise jamais en succès.
 */
import { supabase } from '../../lib/supabase';
import {
  parseTraceDelete,
  traceDeleteFailure,
  type TraceDeleteOutcome,
} from './traceRetention';

/**
 * Efface les deux formes de trace de LA sortie désignée, si elle est au
 * demandeur. Rend l'issue SERVEUR — jamais une supposition du client.
 */
export async function deleteRunTrace(runId: string): Promise<TraceDeleteOutcome> {
  if (supabase === null) return { kind: 'signed-out' };
  try {
    const { data, error } = await supabase.rpc('delete_run_trace_2026', { p_run_id: runId });
    if (error) return traceDeleteFailure(error.message);
    return parseTraceDelete(data);
  } catch (e) {
    return traceDeleteFailure(e instanceof Error ? e.message : String(e));
  }
}
