/**
 * GRYD — `https://gryd.run/u/<pseudo>` : l'atterrissage d'un profil partagé.
 *
 * ═══ POURQUOI CE FICHIER EXISTE (12/09/2026) ════════════════════════════════
 * `apple-app-site-association` remet QUATRE chemins à l'app : `/callback`,
 * `/c/*`, `/r/*` et `/u/*`. Les trois premiers avaient une route ; `/u/*` n'en
 * avait aucune. Autrement dit, dès la publication du fichier de domaine, un
 * lien de profil partagé aurait ouvert l'app sur « Unmatched route » — la
 * version 2026 du lien mort, et sur le seul chemin qu'un joueur envoie à
 * quelqu'un qui n'a pas encore l'app.
 *
 * L'ÉCRAN EXISTE DÉJÀ : `app/profil-rival/[handle].tsx` (E26, « Profil rival ·
 * vue publique »), avec ses états honnêtes quand aucun profil consenti n'est
 * exposé. On ne le duplique pas — on le fait servir sous l'adresse que le
 * domaine remet vraiment.
 *
 * ⚠️ `Redirect`, PAS `push` : personne ne doit pouvoir « revenir » sur une
 * adresse de transit qui re-redirigerait aussitôt. Le paramètre est passé tel
 * quel ; c'est l'écran de destination qui juge ce qu'il en fait — un pseudo
 * venu de l'extérieur n'est jamais une donnée de confiance.
 */
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PublicProfileLinkScreen() {
  const { handle } = useLocalSearchParams<{ handle?: string }>();
  return <Redirect href={{ pathname: '/profil-rival/[handle]', params: { handle: handle ?? '' } }} />;
}
