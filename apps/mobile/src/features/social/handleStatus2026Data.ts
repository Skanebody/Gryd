/**
 * GRYD — LA LECTURE RÉSEAU DE MON ÉTAT DE PSEUDO (LOT H, 10/09/2026).
 *
 * Séparé de `handleStatus2026.ts` (pur) pour la même raison que
 * `social2026Data` l'est de `social2026Model` : `npm run test:mobile` est un
 * `deno test` sur tout `src/`, et Deno type-vérifie le graphe d'imports entier.
 * Garder React et supabase-js hors du module de règles est ce qui rend ces
 * règles testables sans téléphone.
 *
 * Ce fichier ne contient AUCUNE règle : il appelle `my_handle_status_2026()`
 * (migration 0175) et rend le résultat déjà lu par le parseur pur.
 */
import { parseHandleStatus2026, type HandleStatus2026 } from './handleStatus2026';
import { useSocialRead2026 } from './social2026Data';

/**
 * MON état de pseudo, lu sur le serveur. Quatre états, aucun repli :
 * `signedOut` (le pseudo vit sur le compte, pas sur le téléphone), `loading`,
 * `failed` (avec « Réessayer »), `ready`.
 */
export function useMyHandleStatus2026(): {
  status: 'signedOut' | 'loading' | 'ready' | 'failed';
  data: HandleStatus2026 | null;
  reload: () => void;
} {
  const read = useSocialRead2026<unknown>('my_handle_status_2026');
  // `useSocialRead2026` rend son état en `string` (ternaire imbriqué) : on le
  // renomme dans le seul vocabulaire que cet écran connaît, plutôt que de
  // laisser un `string` se propager jusqu'au JSX où plus rien ne le contrôle.
  const state = read.status as 'signedOut' | 'loading' | 'ready' | 'failed';
  const data = state === 'ready' ? parseHandleStatus2026(read.data) : null;
  return {
    // Une réponse lue mais illisible n'est pas « prête » : c'est un échec, et
    // « Réessayer » est le seul geste honnête à proposer.
    status: state === 'ready' && data === null ? 'failed' : state,
    data,
    reload: read.reload,
  };
}
