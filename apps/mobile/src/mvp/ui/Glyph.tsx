/**
 * GRYD — LE GLYPHE : un point d'accroche unique pour l'iconographie.
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * Le MVP n'avait AUCUNE icône. Une recherche exhaustive sur `app/(mvp)` et
 * `src/mvp` ne trouvait qu'un seul usage de `react-native-svg`, et c'était
 * `TerritoryMark` — un dessin de marque, pas un glyphe fonctionnel.
 *
 * Ça se paye à trois endroits, tous relevés par l'audit Apple :
 *   · le SIGNAL GPS est une PHRASE (« Recherche du signal », « Signal faible »)
 *     là où trois barres se lisent en 100 ms — et pendant une course, lire est
 *     précisément ce qu'on ne peut pas faire ;
 *   · les liens de navigation n'ont aucun chevron, donc rien ne les distingue
 *     d'une légende grise de la même taille ;
 *   · le retour n'a pas de `chevron.left`, donc rien ne dit qu'il ramène.
 *
 * ─── SF SYMBOLS EN REACT NATIVE : LA RÉPONSE HONNÊTE ────────────────────────
 * `Image(systemName:)` est une API SwiftUI qui n'existe pas ici. Mais
 * `expo-symbols` rend de VRAIES SF Symbols sur iOS via une vue native — donc le
 * dessin d'Apple, ses graisses, son alignement optique, gratuitement.
 *
 * Le coût réel est ailleurs : **SF Symbols n'existe QUE sur iOS**. Sur Android
 * et sur le web (donc la preview de ce dépôt), il faut un repli. Ce fichier est
 * l'endroit où ce repli vit — une fois, pas dans chaque écran.
 *
 * ⚠️ RÈGLE SF SYMBOLS À NE PAS ENFREINDRE : ne jamais détourner un symbole
 * conventionnel. `chevron.left` veut dire « retour » pour tout le monde ; s'en
 * servir pour autre chose casse une convention que l'utilisateur a apprise
 * ailleurs. Le vocabulaire ci-dessous est donc volontairement court.
 */
import { Platform } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@klaim/shared';

/**
 * LE VOCABULAIRE. Un nom GRYD → le symbole Apple + son tracé de repli.
 *
 * On passe par des noms de RÔLE (`retour`, `signal`) et non par les noms Apple :
 * un écran ne doit pas avoir à savoir qu'iOS appelle ça `chevron.left`, et le
 * jour où un repli change de dessin, il change ici.
 *
 * Les tracés de repli sont dessinés dans une grille de 24 — la même que celle
 * des SF Symbols — pour que les deux plateformes s'alignent sans réglage.
 */
const VOCABULAIRE = {
  /** Retour : ramène à l'écran précédent. Jamais un autre sens. */
  retour: { sf: 'chevron.left', d: 'M15 4 L7 12 L15 20' },
  /** Affordance de liste : « ceci mène ailleurs ». */
  suite: { sf: 'chevron.right', d: 'M9 4 L17 12 L9 20' },
  /** Le compte, le profil. */
  toi: { sf: 'person.crop.circle', d: 'M12 12 m-4 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M4 21 a8 8 0 0 1 16 0 M12 2 a10 10 0 1 1 0 20 a10 10 0 1 1 0 -20' },
  /** Position / signal GPS. Voir `valeur` pour la magnitude. */
  signal: { sf: 'location.fill', d: 'M21 3 L3 10.5 L10 13.5 L13 20.5 Z' },
  /** Reprise, réessai. */
  reessayer: { sf: 'arrow.clockwise', d: 'M20 12 a8 8 0 1 1 -2.4 -5.7 M20 3 v4 h-4' },
  /** Un état d'échec, jamais une accusation. */
  echec: { sf: 'exclamationmark.triangle', d: 'M12 3 L22 20 H2 Z M12 9 v5 M12 17 v0.5' },
} as const;

export type GlyphName = keyof typeof VOCABULAIRE;

export interface GlyphProps {
  readonly name: GlyphName;
  readonly size?: number;
  readonly color?: string;
  /**
   * Opacité du glyphe, entre 0 et 1.
   *
   * ⚠️ CE N'EST PAS `variableValue`. L'audit proposait de rendre la force du
   * signal GPS par le remplissage progressif d'un `location.fill` — c'est la
   * bonne idée, et elle est INAPPLICABLE ici : `expo-symbols@0.2.2` n'expose
   * PAS `variableValue` (vérifié dans `SymbolModule.types.d.ts` : seul
   * `animationSpec` existe). Promettre un remplissage variable aurait été
   * exactement le genre d'équivalent inventé qu'on refuse.
   *
   * On rend donc la magnitude par l'OPACITÉ, qui marche sur les deux
   * plateformes et ne prétend rien de plus qu'elle ne fait.
   */
  readonly force?: number;
}

/**
 * ⚠️ CE COMPOSANT NE PORTE AUCUN LIBELLÉ D'ACCESSIBILITÉ, ET C'EST VOULU.
 *
 * Une icône ne REMPLACE pas l'information, elle remplace sa LECTURE. Le texte
 * qu'elle accompagne — ou l'`accessibilityLabel` du contrôle qui la contient —
 * reste la source pour un lecteur d'écran. Un glyphe qui s'annoncerait
 * lui-même produirait un doublon à chaque ligne de liste.
 */
export function Glyph({ name, size = 20, color = colors.blanc, force = 1 }: GlyphProps) {
  const { sf, d } = VOCABULAIRE[name];

  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={sf as SymbolViewProps['name']}
        size={size}
        tintColor={color}
        resizeMode="scaleAspectFit"
        style={{ opacity: force }}
      />
    );
  }

  // REPLI — Android et web. Trait, pas aplat : les SF Symbols de cette famille
  // sont dessinées au trait, un aplat jurerait à côté sur un écran mixte.
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        opacity={force}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
