/**
 * GRYD — L'OBJET SIGNATURE : une forme territoriale chartreuse sur fond sombre.
 *
 * ─── POURQUOI CET OBJET EXISTE ──────────────────────────────────────────────
 * C'est « la grille d'emojis de GRYD » (§5.1) : l'artefact qui doit être
 * reconnaissable en une demi-seconde dans un feed, intrigant sans rien révéler.
 * Il n'appartient donc pas qu'à la carte de partage — c'est la première chose
 * que le joueur doit voir, parce que L9 exige de montrer LA VALEUR avant de
 * demander quoi que ce soit. Un onboarding qui explique le territoire sans en
 * montrer un demande de la confiance sans rien offrir.
 *
 * ─── CE QU'IL N'EST PAS ─────────────────────────────────────────────────────
 * ⚠️ CE N'EST PAS UNE ZONE DE JOUEUR, et ça ne doit jamais en devenir une.
 * C'est un DESSIN de marque — un contour fermé, sans coordonnées, sans ville,
 * sans surface annoncée. Y brancher un jour une vraie géométrie ferait de
 * l'écran d'accueil une donnée, avec tout ce que ça implique (états vides,
 * échecs de lecture, vie privée). Les points sont dans un `viewBox` en unités
 * abstraites : ils ne se convertissent en rien.
 *
 * L15 — purement décoratif : `accessibilityElementsHidden` + `importantFor-
 * Accessibility="no-hide-descendants"`. Un lecteur d'écran doit entendre le
 * titre, pas un polygone. L'information reste portée par le texte.
 */
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@klaim/shared';

/**
 * Anneau FERMÉ aux proportions d'un vrai tour de pâté de maisons.
 *
 * ─── POURQUOI PAS UNE FORME RÉGULIÈRE ──────────────────────────────────────
 * La première version était un polygone à côtés égaux : à l'écran elle lisait
 * « décagone », c'est-à-dire une icône générique. Or cet objet doit faire naître
 * la question « c'est quoi cette app ? » (§5.1) — et une forme géométrique n'en
 * pose aucune. Ce qui intrigue, c'est l'IRRÉGULARITÉ : on reconnaît un trajet.
 *
 * D'où les trois traits d'un tour de quartier réel :
 *   · des segments de LONGUEURS très inégales (une avenue, puis une ruelle) ;
 *   · des angles francs, jamais tous identiques ;
 *   · un DÉCROCHEMENT concave — la rue qui ne va pas jusqu'au bout, le
 *     détour par le parking. C'est lui qui dit « quelqu'un a couru ça ».
 *
 * Unités abstraites du `viewBox` : aucune latitude, aucune longitude, aucune
 * ville. Ce dessin ne se convertit en rien (voir l'en-tête).
 */
const RING =
  'M22 54 L74 20 L119 34 L128 59 L152 74 L143 121 L92 150 L47 133 L33 93 Z';

export function TerritoryMark({ size = 200 }: { readonly size?: number }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ alignSelf: 'center', width: size, height: size }}
    >
      <Svg viewBox="0 0 168 168" width={size} height={size}>
        {/* Remplissage DISCRET : la trace domine, jamais l'aplat (§C, spec §3.9). */}
        <Path d={RING} fill={colors.chartreuse14} />
        {/* Le contour EST la signature — épais, bouts ronds, comme la trace héros. */}
        <Path
          d={RING}
          fill="none"
          stroke={colors.chartreuse}
          strokeWidth={6}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
