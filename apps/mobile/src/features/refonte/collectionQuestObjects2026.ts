/**
 * GRYD — les objets de défi dans « Mes objets » (§7.5, lecture 0168).
 *
 * Les objets gagnés par les défis de la semaine sont possédés, permanents et
 * équipables, mais ils ne vivaient que sur l'écran des défis : la Collection
 * les ignorait, et son compteur « N objets obtenus » disait donc MOINS que ce
 * que porte le compte. Ce module traduit l'état d'une lecture serveur en état
 * d'affichage. Il est pur, et il refuse deux mensonges :
 *  · une lecture en échec n'est jamais « aucun objet » (L8/L14/L19) ;
 *  · un total ne se donne pas pour complet tant qu'une part reste inconnue —
 *    l'écran doit alors nommer ce qui manque au lieu d'afficher un chiffre nu.
 *
 * Ces objets n'entrent PAS dans l'identité du profil (G22 : ils ne s'empilent
 * pas au-dessus du pseudo) : le décompte « sur le profil » leur reste fermé.
 */
import type { WeeklyQuestObject2026 } from './WeeklyQuests2026Model';

/** Les états de la lecture 0168, redits ici pour que ce module reste PUR :
 *  importer `WeeklyQuests2026Data` tirerait le client Supabase — et React
 *  Native — dans le graphe testé sous Deno. Si l'état serveur gagnait un cas,
 *  le typage de l'appelant refuserait la conversion, jamais en silence. */
export type QuestReadStatus2026 = 'loading' | 'signed-out' | 'unavailable' | 'failed' | 'ready';

export type QuestObjectsSection2026 =
  /** Rien à dire ici : pas de compte, ou pas de serveur joignable. L'écran
   *  porte déjà son propre état pour ces deux cas. */
  | { kind: 'absent' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'empty' }
  | { kind: 'list'; objects: readonly WeeklyQuestObject2026[] };

export function questObjectsSection2026(
  status: QuestReadStatus2026,
  objects: readonly WeeklyQuestObject2026[] | null | undefined,
): QuestObjectsSection2026 {
  if (status === 'signed-out' || status === 'unavailable') return { kind: 'absent' };
  if (status === 'loading') return { kind: 'loading' };
  if (status === 'failed') return { kind: 'failed' };
  // « Prêt » sans données serait un contrat rompu, pas une collection vide.
  if (!objects) return { kind: 'failed' };
  return objects.length === 0 ? { kind: 'empty' } : { kind: 'list', objects };
}

/** Le total affiché ne compte QUE des objets connus du serveur. `complete` dit
 *  si ce total couvre tout ce que le compte possède ; sinon l'écran doit dire
 *  ce qu'il n'a pas pu lire. */
export function ownedObjectsTotal2026(
  known: number,
  section: QuestObjectsSection2026,
): { count: number; complete: boolean } {
  const safe = Number.isSafeInteger(known) && known >= 0 ? known : 0;
  return {
    count: safe + (section.kind === 'list' ? section.objects.length : 0),
    complete: section.kind !== 'loading' && section.kind !== 'failed',
  };
}
