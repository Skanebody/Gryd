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
 * ─── CE QUE LA BASCULE FAIT DEPUIS QUE LE VÉLO EST RÉEL (26/07/2026) ───────
 * Elle change LE MONDE LU, pas une étiquette : `MapScreen` passe la lentille à
 * `useRealTerritories(crewIds, activity)` et à `useRealMission(activity)`, dont
 * les requêtes portent `.eq('activity', …)` (clé primaire composite depuis la
 * migration 0070, appliquée le 25/07). La Carte peint donc ses couches, sa
 * mission, sa sheet et son GO dans LES DEUX mondes.
 *
 * Ce fichier a porté, le matin même, l'affirmation inverse : « en mode Bike, la
 * Carte n'affiche AUCUN territoire, AUCUNE mission, AUCUN classement », et le
 * segment Bike portait une marque « PAS ENCORE ». C'était exact tant que rien
 * ne pouvait être enregistré à vélo. Le fondateur a tranché l'inverse le même
 * jour — « il faut avoir sa propre data, ses propres classements » — et laisser
 * cette phrase aurait produit le mensonge symétrique : nier ce que l'app fait.
 *
 * CE QUI RESTE BORNÉ À LA LENTILLE PAR DÉFAUT : les secteurs
 * (`sector_snapshot`, PK `sector_id` seul, alimenté par des vues non
 * disciplinées). Règle dérivée de `competitiveReadAllowed`, pas peinte ici.
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
