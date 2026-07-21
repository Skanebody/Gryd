/**
 * GRYD — ONGLET CREW.
 *
 * ─── FIN DU MODE VITRINE (décision fondateur, 21/07/2026) ────────────────────
 * Ce fichier contenait ~3 800 lignes de « Crew HQ » démo (crew Supercell fabriqué :
 * coffre, perks, chat scénarisé, roster inventé, sorties, colle quotidienne…),
 * gardées derrière `if (!isShowcasePlatform) return <RealCrewScreen />;` — un
 * return conditionnel placé AVANT une quarantaine de hooks.
 *
 * La vitrine est abandonnée : plus AUCUNE surface de GRYD n'affiche de données
 * fabriquées. Le HQ démo n'a donc plus de branche qui l'atteigne, et l'écran Crew
 * EST le crew réel. La correction est la SUPPRESSION, pas le déplacement : le
 * garde-fou conditionnel disparaît avec la branche qu'il gardait, donc l'ordre
 * des hooks redevient inconditionnel par construction (il n'y a plus qu'un seul
 * composant, et il n'a aucun return avant ses hooks).
 *
 * Les trois états honnêtes vivent dans `RealCrewScreen` :
 *   · pas connecté        → invite à se connecter (jamais de crew fictif) ;
 *   · connecté, sans crew → « Créer mon crew » / « J'ai un code » ;
 *   · lecture en échec    → le dit et propose de réessayer.
 *
 * Les modules `features/crew/*demo*.ts` qui n'alimentaient que ce HQ n'ont plus
 * d'importateur ici ; leur suppression revient à la passe de nettoyage globale,
 * une fois tous les lots retirés (la même donnée peut encore servir ailleurs).
 */
export { RealCrewScreen as default } from '../../src/features/crew/RealCrewScreen';
