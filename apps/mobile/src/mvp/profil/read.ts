/**
 * GRYD — LES LECTURES DU PROFIL. La seule I/O du dossier (lot M12).
 *
 * Mince par construction, comme partout : `stats.ts` et `account.ts` décident,
 * ici on transporte. La partie qu'on ne peut pas rejouer en local doit contenir
 * le moins de jugement possible.
 *
 * ⚠️ AUCUN REPLI SUR DU VIDE. Un `catch` qui renverrait des zéros ferait dire au
 * tableau de bord « aucune sortie » à quelqu'un dont la connexion a sauté —
 * c'est la forme la plus banale du mensonge, et le type l'interdit ici : il n'a
 * pas de valeur « vide par défaut ».
 */
import { supabase } from '../../lib/supabase';
import type { StatsRead } from './stats';
import type { DeletionStatus } from './account';

/** Statuts de course qui COMPTENT comme une sortie. */
const RETENUES = ['valid', 'partial'] as const;

/**
 * Statistiques personnelles.
 *
 * Deux lectures, et il faut LES DEUX : une distance sans territoire, ou
 * l'inverse, décrirait un suivi que l'autre moitié dément. Même contrat que la
 * carte — « échec partiel » n'existe pas.
 */
export async function readMyStats(userId: string): Promise<StatsRead> {
  if (supabase === null) return { kind: 'failed' };
  try {
    const [courses, zones] = await Promise.all([
      supabase
        .from('runs')
        .select('distance_m, started_at')
        .eq('user_id', userId)
        .in('status', RETENUES),
      supabase
        .from('territories')
        .select('area_m2')
        .eq('owner_type', 'user')
        .eq('owner_id', userId),
    ]);
    if (courses.error !== null || courses.data === null) return { kind: 'failed' };
    if (zones.error !== null || zones.data === null) return { kind: 'failed' };

    const lignes = courses.data as unknown as { distance_m: number; started_at: string }[];
    let distanceM = 0;
    let lastRunAt: number | null = null;
    for (const l of lignes) {
      // Une distance illisible est ÉCARTÉE, pas comptée pour zéro : additionner
      // un NaN rendrait TOUT le total NaN, et l'écran n'afficherait plus rien
      // sans que personne ne sache pourquoi.
      if (Number.isFinite(l.distance_m) && l.distance_m >= 0) distanceM += l.distance_m;
      const t = Date.parse(l.started_at);
      if (Number.isFinite(t) && (lastRunAt === null || t > lastRunAt)) lastRunAt = t;
    }

    const aires = zones.data as unknown as { area_m2: number }[];
    let areaM2 = 0;
    for (const z of aires) if (Number.isFinite(z.area_m2) && z.area_m2 >= 0) areaM2 += z.area_m2;

    return { kind: 'ok', runs: lignes.length, distanceM, areaM2, lastRunAt };
  } catch {
    return { kind: 'failed' };
  }
}

/**
 * État de la demande de suppression.
 *
 * `null` = on ne sait pas. `accountView` en fait `unknown` et ne propose alors
 * RIEN : offrir de supprimer sans savoir où en est une demande précédente est
 * le pire des deux mondes.
 */
export async function readDeletionStatus(): Promise<DeletionStatus | null> {
  if (supabase === null) return null;
  try {
    const { data, error } = await supabase.rpc('account_deletion_status');
    if (error !== null || typeof data !== 'object' || data === null) return null;
    return data as DeletionStatus;
  } catch {
    return null;
  }
}

/** Demande la suppression. Rend `true` si le serveur l'a bien enregistrée. */
export async function requestDeletion(): Promise<boolean> {
  if (supabase === null) return false;
  try {
    const { error } = await supabase.rpc('request_account_deletion');
    return error === null;
  } catch {
    return false;
  }
}

/** Annule une suppression en cours. */
export async function cancelDeletion(): Promise<boolean> {
  if (supabase === null) return false;
  try {
    const { error } = await supabase.rpc('cancel_account_deletion');
    return error === null;
  } catch {
    return false;
  }
}
