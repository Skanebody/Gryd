/**
 * GRYD : MON MARQUEUR SUR LA CARTE. Un pin, pas un point.
 *
 * Retour du fondateur, 10/09/2026 : « le marqueur de ma position ne doit pas
 * être un petit point chartreuse mais une forme de pin de carte (goutte,
 * demi-coeur) avec ma photo de profil dedans ». La carte peignait
 * `positionHalo` + `positionDot` : un disque de 13 pt, anonyme, impossible à
 * distinguer d'un POI au premier coup d'oeil.
 *
 * ─ L'ANCRAGE, QUI EST TOUT LE SUJET D'UN PIN ────────────────────────────────
 * `RealMap` ancre le contenu d'un marker sur son CENTRE (natif :
 * `MarkerView anchor={{x:.5,y:.5}}` ; web : `MapLibreMarker anchor:'center'`).
 * Un disque s'en accommode, un pin non : c'est sa POINTE qui doit tomber sur la
 * coordonnée, sinon la position affichée est fausse d'une demi-hauteur, soit
 * ici 26 pt, soit plusieurs dizaines de mètres au zoom de quartier. D'où le
 * `translateY: -ME_PIN_HEIGHT / 2` porté par ce composant lui-même : l'écran
 * appelant n'a aucun décalage à calculer, et ne peut donc pas l'oublier.
 *
 * ─ CE QUE LE PIN MONTRE, DANS L'ORDRE ───────────────────────────────────────
 *   1. la photo de profil, si le compte en a une (`profile.avatarUri`) ;
 *   2. sinon l'initiale du pseudo, sur le carbone des surfaces posées sur la
 *      carte (`elevation.overMap`, le seul palier prévu pour ça) ;
 *   3. sinon le G de GRYD : c'est le cas de l'invité, qui n'a pas de pseudo à
 *      afficher et à qui on n'invente pas d'identité.
 *
 * L15 : la couleur ne porte rien seule. La FORME (goutte) distingue « moi » des
 * marqueurs ronds des autres joueurs (`MateMarker`), et le libellé
 * d'accessibilité dit lequel des deux états de précision est peint.
 */
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, elevation, fonts } from '@klaim/shared';
import { GrydMark } from '../gryd/GrydMark';
import { pinPathForCosmetic2026 } from '../../features/arsenal/CosmeticArt2026';

/** Largeur du pin (diamètre de la tête). */
export const ME_PIN_WIDTH = 40;
/** Hauteur totale, pointe comprise. La pointe est le point géographique. */
export const ME_PIN_HEIGHT = 52;
/** Diamètre du disque de photo, centré dans la tête. */
const PHOTO_SIZE = 26;
/** Cercle de précision quand la position est approximative (centré sur la pointe). */
const HALO_SIZE = 48;

/**
 * ─── LA SILHOUETTE DU PIN EST UN COSMÉTIQUE (lot personnalisation, 10/09) ───
 * `styleId` nomme l'objet équipé (`profile_cosmetics_2026`, emplacement `pin`).
 * Les cinq tracés vivent dans `features/arsenal/CosmeticArt2026` et partagent
 * TOUS la même pointe, en (20, 50) : changer de pin ne déplace donc jamais la
 * position affichée, qui est tout le sujet d'un pin (voir l'ancrage ci-dessus).
 * `undefined` ou un identifiant inconnu rend la goutte — l'apparence d'avant ce
 * lot, jamais un marqueur vide.
 */
const PIN_PATH = 'M20 50 L11 35.6 A18 18 0 1 1 29 35.6 Z';

export interface MePinMarker2026Props {
  /** Ce que le lecteur d'écran annonce. Déjà traduit par l'appelant. */
  label: string;
  /** Photo de profil du compte connecté. Vide ou absente : on ne la peint pas. */
  photoUri?: string;
  /** Initiale(s) du pseudo. Vide pour un invité : le pin porte alors le G. */
  initials?: string;
  /** Position issue d'une précision grossière : le pin le DIT, il ne le cache pas. */
  approximate?: boolean;
  /** Cosmétique de pin équipé. Absent = la goutte, l'apparence par défaut. */
  styleId?: string | null;
}

export function MePinMarker2026({ label, photoUri, initials, approximate = false, styleId }: MePinMarker2026Props) {
  const hasPhoto = typeof photoUri === 'string' && photoUri.length > 0;
  const mark = (initials ?? '').trim();
  const path = styleId ? pinPathForCosmetic2026(styleId) : PIN_PATH;

  return <View
    pointerEvents="none"
    accessible={Platform.OS === 'web' ? undefined : true}
    accessibilityRole="image"
    accessibilityLabel={label}
    style={s.anchor}
  >
    {approximate ? <View style={s.halo} /> : null}
    <View style={s.pin}>
      <Svg width={ME_PIN_WIDTH} height={ME_PIN_HEIGHT} viewBox={`0 0 ${ME_PIN_WIDTH} ${ME_PIN_HEIGHT}`}>
        <Path
          d={path}
          fill={elevation.overMap}
          stroke={colors.chartreuse}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
      <View style={s.photo}>
        {hasPhoto
          ? <Image source={{ uri: photoUri }} style={s.photoImage} accessibilityIgnoresInvertColors />
          : mark.length > 0
            ? <Text style={s.initials} numberOfLines={1}>{mark}</Text>
            : <GrydMark variant="symbol" size={13} color={colors.chartreuse} accessibilityLabel={label} />}
      </View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  /** Boîte du marker : centrée sur le point, remontée pour poser la pointe dessus. */
  anchor: {
    width: ME_PIN_WIDTH,
    height: ME_PIN_HEIGHT,
    transform: [{ translateY: -ME_PIN_HEIGHT / 2 }],
  },
  pin: {
    width: ME_PIN_WIDTH,
    height: ME_PIN_HEIGHT,
    shadowColor: colors.noir,
    shadowOpacity: 0.35,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  /** Cercle de précision : son centre est la POINTE, pas la tête du pin. */
  halo: {
    position: 'absolute',
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: HALO_SIZE / 2,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    left: ME_PIN_WIDTH / 2 - HALO_SIZE / 2,
    top: ME_PIN_HEIGHT - 2 - HALO_SIZE / 2,
  },
  photo: {
    position: 'absolute',
    left: ME_PIN_WIDTH / 2 - PHOTO_SIZE / 2,
    top: 20 - PHOTO_SIZE / 2,
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.carbone,
  },
  photoImage: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  initials: {
    fontFamily: fonts.displayMedium,
    fontSize: 12,
    lineHeight: 16,
    color: colors.blanc,
  },
});
