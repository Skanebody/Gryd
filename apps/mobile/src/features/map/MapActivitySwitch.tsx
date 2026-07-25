/**
 * GRYD — COMMUTATEUR RUN / BIKE de la Carte (planche E14, visible sur E03).
 *
 * ─── CE FICHIER N'EST PLUS QUE L'ENVELOPPE CARTE DU COMMUTATEUR ─────────────
 * Le contrôle lui-même a déménagé dans `src/ui/ActivitySwitch.tsx` (25/07/2026,
 * propagation E14) : la planche le veut « présent sur toutes les pages utiles :
 * carte, classements, historique, profil-stats », et un composant global n'a
 * pas à vivre dans le domaine carte. Ce module reste pour deux raisons, toutes
 * deux concrètes :
 *   · la Carte (`app/(tabs)/index.tsx`) n'est PAS dans le périmètre de ce
 *     chantier — son import ne bouge donc pas d'un caractère ;
 *   · les libellés a11y sont ceux de la CARTE (« Carte à pied » / « Carte
 *     vélo »). Les segments portent bien un texte visible depuis le 26/07/2026,
 *     mais ce texte nomme la DISCIPLINE (« RUN » / « BIKE »), pas ce que la
 *     bascule change ici : chaque surface doit le nommer CHEZ ELLE.
 *
 * ─── LE POINT D'HONNÊTETÉ, RENFORCÉ LE 26/07/2026 ───────────────────────────
 * Le commutateur bascule VRAIMENT, et c'est tout ce qu'il prétend faire. En
 * mode Bike, la Carte n'affiche AUCUN territoire, AUCUNE mission, AUCUN
 * classement : le vélo n'existe pas encore sous l'écran (tous les chemins de
 * départ déclarent 'run', cf. `features/run/gps/runActivity.ts`). Montrer les
 * données Run sous une étiquette vélo serait la donnée fabriquée que la charte
 * interdit.
 *
 * Ce que le retour fondateur a ajouté : dire le vide APRÈS le tap ne suffisait
 * pas. « L'UI lui fait croire que la fonctionnalité est disponible ; le contenu
 * lui dit ensuite qu'elle ne l'est pas. » Le segment Bike porte donc maintenant
 * sa marque d'état AVANT le tap (`ui/ActivitySwitch.tsx`), et l'état vide de la
 * sheet a cessé d'énumérer les absences pour désigner l'action réelle qui reste
 * — le segment RUN, juste au-dessus (copie dans `i18n/catalog/map.ts`).
 *
 * VERROUILLAGE PENDANT UNE COURSE (planche E14) : sur la CARTE il est
 * STRUCTUREL, pas peint. La course vit sur `/course-live`, une route poussée
 * par-dessus l'onglet Carte : ce commutateur n'est ni visible ni atteignable
 * tant qu'elle dure. On ne peint donc pas un état « grisé » qui ne pourrait
 * jamais s'afficher — ce serait un contrôle mort de plus. (Les trois autres
 * surfaces, elles, RESTENT atteignables en arrière-plan de course : elles
 * dérivent le verrou pour de vrai, cf. `useActivitySwitchVisible`.)
 */
import { ActivitySwitch } from '../../ui/ActivitySwitch';
import { C } from '../../i18n/catalog/map';
import { useT } from '../../i18n/store';
import { useMapActivity } from './mapPref';

// Métriques réexportées : la Carte les lit pour caler sa ligne mission à côté
// du commutateur (`app/(tabs)/index.tsx`) — un seul chiffre, une seule source.
export { ACTIVITY_SWITCH_HEIGHT, ACTIVITY_SWITCH_WIDTH } from '../../ui/ActivitySwitch';

export function MapActivitySwitch({ testID }: { testID?: string }) {
  const t = useT();
  const { activity, setActivity } = useMapActivity();
  return (
    <ActivitySwitch
      activity={activity}
      onChange={setActivity}
      runLabel={t(C.activityRunA11y)}
      bikeLabel={t(C.activityBikeA11y)}
      {...(testID === undefined ? {} : { testID })}
      runTestID="map-activity-run"
      bikeTestID="map-activity-bike"
    />
  );
}
