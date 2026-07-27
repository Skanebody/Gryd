/**
 * GRYD — route `/map/search` (spec produit UI/UX E13, l.926).
 *
 * Le chemin est celui de la spec, mot pour mot. Il est POUSSÉ par-dessus
 * l'onglet Carte (pile expo-router) : « retour carte » est donc le retour de
 * pile, et la carte reste montée derrière — c'est ce qui permet à
 * `requestPlaceFocus` de la cadrer sans la remonter.
 *
 * L'écran vit dans `src/features/map/PlaceSearchScreen.tsx` (même découpe que
 * partout ici : `app/` route, `src/features/` compose).
 */
import { PlaceSearchScreen } from '../../src/features/map/PlaceSearchScreen';

export default PlaceSearchScreen;
