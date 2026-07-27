/**
 * GRYD — E17, état technique « batterie » : la LECTURE, variante APPAREIL.
 *
 * ELLE REND `unknown`, ET CE N'EST PAS UN OUBLI. Au 27/07/2026, aucune
 * dépendance ne publie le niveau de batterie sur l'appareil : `expo-battery`
 * n'est pas dans `apps/mobile/package.json`, et React Native n'expose rien de
 * tel en cœur. On rend donc l'ignorance, telle quelle.
 *
 * CE QU'ON AURAIT PU FAIRE, ET POURQUOI ON NE LE FAIT PAS :
 *  · afficher « batterie OK » par défaut — une donnée fabriquée, la faute que
 *    la constitution nomme en premier ;
 *  · masquer la ligne — la spec l.1028 en demande trois, et surtout : cacher
 *    l'ignorance ne la supprime pas, elle la déguise en « rien à signaler ».
 * L'écran dit donc « inconnu », ce qui est vrai, vérifiable, et se corrigera
 * d'une ligne le jour où la dépendance entrera (ce fichier, et lui seul).
 *
 * Le jumeau `battery.web.ts` lit `navigator.getBattery()` quand le navigateur
 * le propose : sur l'instrument de preview du fondateur (localhost, Chrome), la
 * ligne affiche donc une VRAIE mesure. La divergence entre les deux surfaces est
 * ici une différence de capacité RÉELLE, pas un stub — c'est exactement ce que
 * la règle « l'affichage se dérive de la capacité réelle » demande.
 */
import type { BatteryReading } from './prepareState';

export async function readBattery(): Promise<BatteryReading> {
  return { kind: 'unknown' };
}
