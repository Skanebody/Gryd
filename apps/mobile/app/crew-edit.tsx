/**
 * GRYD — /crew-edit : ROUTE ARCHIVÉE (fin du mode vitrine, 21/07/2026).
 *
 * Cette page éditait un crew de DÉMO : `MY_CREW` (nom, tag, rôle « founder »
 * fabriqués) sauvegardé dans un store AsyncStorage local qui n'écrivait sur
 * AUCUNE table. Un fondateur y renommait son crew et ne voyait ce changement
 * nulle part ailleurs que dans le HQ démo — le pire des mensonges d'interface,
 * celui qui fait croire à une action.
 *
 * Elle n'était atteignable que sous `isShowcasePlatform` ; sinon elle
 * redirigeait déjà vers l'écran Crew réel. La vitrine étant abandonnée, il ne
 * reste que la redirection. Le fichier est conservé parce que la route est
 * déclarée dans `_layout.tsx` : `gryd://crew-edit` doit atterrir sur le vrai
 * écran Crew, pas sur « unmatched route ».
 *
 * L'ÉDITION RÉELLE RESTE À FAIRE (et c'est un vrai manque, pas un oubli de
 * nettoyage) : renommer/décrire son crew et régler son recrutement exige une
 * RPC serveur rôle-gatée (CREW_PERMISSIONS reste la matrice de référence, le
 * serveur seul juge). Tant qu'elle n'existe pas, l'app n'offre pas le bouton :
 * mieux vaut une fonction absente qu'une fonction qui fait semblant.
 */
import { Redirect } from 'expo-router';

export default function CrewEditRoute() {
  return <Redirect href="/crew" />;
}
