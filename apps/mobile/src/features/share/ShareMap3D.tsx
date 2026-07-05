/**
 * GRYD — ShareMap3D : la « GRYD 3D Conquest Map » du template `carte3d`
 * (AMENDEMENT-24). L'équivalent PROPRIETAIRE de la carte 3D Strava, mais
 * MapLibre (PAS Mapbox), ZERO clé, tuiles CARTO dark déjà utilisées. Contrairement
 * aux 5 autres templates (faux-map SVG léger `ShareMap`), celui-ci monte un VRAI
 * `RealMap` PITCHE (caméra inclinée ~55°) avec :
 *   - la ZONE conquise EXTRUDEE en volume 3D chartreuse translucide (fill-extrusion),
 *   - la TRACE chartreuse épaisse (la boucle du run),
 *   - la zone RIVALE atténuée (orange basse opacité, zéro halo),
 * le tout sur le fond dark. Géométrie déterministe (démo République — `demo3d`).
 *
 * Non-régression : `RealMap` reçoit `pitch`/`bearing`/`extrudeZones` — des props
 * OPTIONNELLES dont le défaut est le comportement 2D actuel. Ici on les active
 * explicitement (c'est le seul endroit du partage qui monte une carte 3D).
 * Attribution masquée (la card porte sa propre chrome), carte silencieuse
 * (labels de quartiers éteints — le tracé prime). Le conteneur clippe (overflow)
 * pour épouser le coin arrondi de la card, sans double container (AMENDEMENT-22).
 */
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '@klaim/shared';
import { RealMap } from '../../ui/game';
import {
  CARTE_3D_BEARING,
  CARTE_3D_CAMERA,
  CARTE_3D_PITCH,
  carte3dLayers,
} from './demo3d';

export interface ShareMap3DProps {
  /** testID transmis à RealMap (vérif preview). */
  testID?: string;
  style?: ViewStyle;
}

/**
 * Carte 3D de conquête (partage). Aspect géré par le parent via `style` — comme
 * `ShareMap`, la card décide de la taille (slot visuel plein en « Carte seule »,
 * bloc central en Story/Carré).
 */
export function ShareMap3D({ testID, style }: ShareMap3DProps) {
  return (
    <View style={[styles.wrap, style]}>
      <RealMap
        camera={CARTE_3D_CAMERA}
        pitch={CARTE_3D_PITCH}
        bearing={CARTE_3D_BEARING}
        extrudeZones
        geojsonLayers={carte3dLayers()}
        attributionCompact={false}
        silent
        style={StyleSheet.absoluteFill}
        testID={testID ?? 'share-map-3d'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Fond noir derrière les tuiles (jamais d'écran blanc pendant le chargement),
  // clippe le pitch/volume au coin de la card (overflow). Pas de bord visible.
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.noir,
  },
});
