/**
 * GRYD — onglet MISSIONS (ex-War Room) : une PORTE, plus un placeholder.
 *
 * ─── FIN DU MODE VITRINE (décision fondateur, 21/07/2026) ────────────────────
 * Ce fichier contenait ~1 600 lignes de War Room démo : mission « défends
 * Canal », raid weekend, revanche, rapports scout, historique de guerre, rang du
 * crew, coffre, bonus — TOUT venait de `features/warroom/demo`. Ce n'étaient pas
 * des données en attente de chargement : elles étaient inventées. La vitrine
 * abandonnée, il n'est resté qu'un état vide honnête.
 *
 * ─── CE QUE CET ÉTAT VIDE DISAIT, ET POURQUOI IL PART (27/07/2026) ───────────
 * Il expliquait : « Une mission n'a de sens que si elle décrit un terrain
 * RÉELLEMENT couru ; tant que ce calcul n'est pas servi, cet écran dit d'où
 * viendront les missions et renvoie à la carte. » C'était vrai le 21 juillet au
 * matin. Ça ne l'est plus : le calcul EST servi depuis ce jour-là
 * (`features/mission/deriveMission.ts`, pur et testé, alimenté par mes vraies
 * `hex_claims` et mon fix GPS), la Carte en affiche déjà la ligne, et E16
 * (`/map/missions/:missionId`, spec produit l.1009) en est l'écran entier.
 *
 * Une doc — ou un écran — qui NIE ce que le code tient est la même faute qu'une
 * doc qui promet au-delà de lui. Cet onglet mène donc à E16, qui dit la vérité
 * dans les quatre états (pas connecté · lecture en cours · échec · vide) au lieu
 * d'un texte figé qui n'en connaît qu'un.
 *
 * `current` est un SENTINEL assumé : E16 identifie une mission par un digest
 * opaque (`missionKey`) et `parseMissionKey` refuse tout le reste — ouvrir
 * l'écran avec `current` revient donc à dire « montre la mission recommandée
 * MAINTENANT », sans prétendre suivre une mission ouverte plus tôt. Ce chemin
 * est couvert par le test « ouvert SANS id ⇒ on montre la mission courante »
 * (`features/mission/recommendedMission.test.ts`).
 *
 * D8 : la surface reste hors MVP (`flags.warRoom`, défaut OFF) — l'onglet et la
 * route restent masqués, les moteurs serveur ne sont pas touchés. RIEN n'est
 * ré-ouvert ici : seule la DESTINATION change, pour le jour où le drapeau
 * tombera. Les clés `warNoData*` / `missions*` de `i18n/catalog/flagged.ts`
 * deviennent orphelines — le catalogue documente déjà qu'il en compte 125, leur
 * sort se joue à son nettoyage, pas ici.
 *
 * Aucun hook n'est appelé : ce fichier ne fait que router.
 */
import { Redirect } from 'expo-router';
import { flags } from '../../src/lib/flags';

export default function WarRoomRoute() {
  // D8 — surface hors MVP : route masquée (les moteurs restent intacts).
  if (!flags.warRoom) return <Redirect href="/" />;
  return <Redirect href="/map/missions/current" />;
}
