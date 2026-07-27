/**
 * GRYD — L'ÉTAGE D'EXPORT HD (la moitié « rendu » de clubExport.ts).
 *
 * ─── POURQUOI UNE DEUXIÈME VUE, ET PAS UNE OPTION DE CAPTURE ────────────────
 * `captureRef({ width, height })` ne donne PAS de définition : Android
 * rééchantillonne le bitmap déjà rendu (`Bitmap.createScaledBitmap`) et iOS
 * étire l'instantané de la vue (`drawViewHierarchyInRect` dans un contexte plus
 * grand). Un fichier plus lourd, aucun détail de plus — voir l'en-tête de
 * `clubExport.ts`, qui cite le natif embarqué ligne à ligne.
 *
 * Le seul gain RÉEL vient d'un re-rendu : la carte de partage est entièrement
 * vectorielle (View, Text, SVG), donc la monter à une largeur logique
 * supérieure produit un dessin réellement plus fin — le titre héros recalcule sa
 * taille sur la largeur mesurée (`HeroTitleLines`), la carte recalcule son
 * cadrage (`mapFrame.ts`). C'est cette vue-là qu'on capture ensuite SANS aucune
 * option de redimensionnement.
 *
 * ─── CE QUE CE COMPOSANT NE FAIT PAS ────────────────────────────────────────
 * Il ne capture pas, ne partage pas, ne lit aucun statut d'abonnement et ne
 * choisit rien : il MONTE ses enfants hors écran à la largeur qu'on lui donne
 * (`hdStageWidthPt`) et expose la ref à capturer. La décision d'ouvrir le HD
 * appartient à `buildExportPlan`, l'action à `shareCardImage`.
 *
 * ANTI PAY-TO-WIN (§1.6) : un étage de rendu ne donne ni territoire, ni points,
 * ni protection, ni priorité. Il change la définition d'une image, rien d'autre.
 *
 * CONFIDENTIALITÉ : cet étage rend la MÊME carte que l'aperçu, donc le MÊME
 * tracé déjà masqué (`applySharePrivacy`, départ/arrivée retirés et zones
 * floutées appliquées). Il n'a aucun accès à la trace brute — l'appelant lui
 * passe des enfants déjà construits. Un export HD ne peut donc pas révéler plus
 * qu'un export standard : c'est vérifié dans `clubExport.test.ts`.
 *
 * ─── HORS ÉCRAN, PAS INVISIBLE ──────────────────────────────────────────────
 * Même technique que le sticker PNG de /partage (`stickerOffscreen`) : la vue
 * est décalée très à gauche, `pointerEvents="none"` et `collapsable={false}`
 * (sans quoi Android fusionnerait la vue et `captureRef` ne trouverait rien).
 * `opacity: 0` serait un piège — sur certaines versions la capture rendrait un
 * PNG transparent.
 */
import { forwardRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export interface ShareExportStageProps {
  /**
   * Largeur LOGIQUE de l'étage, en points — vient de `hdStageWidthPt(scale)`,
   * jamais d'une valeur écrite à la main : c'est elle qui décide les pixels de
   * sortie (largeur × densité de l'écran).
   */
  widthPt: number;
  /** La carte à rendre en grand — construite par l'appelant, pas ici. */
  children: ReactNode;
}

/**
 * Monte `children` hors écran à `widthPt` points de large et expose la vue à
 * capturer. À rendre en permanence tant que le HD est proposé : `captureRef` ne
 * peut viser qu'une vue déjà montée et mise en page.
 */
export const ShareExportStage = forwardRef<View, ShareExportStageProps>(
  function ShareExportStage({ widthPt, children }, ref) {
    return (
      <View
        ref={ref}
        collapsable={false}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.offscreen, { width: widthPt }]}
      >
        {children}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  // Très à gauche : hors du viewport, mais RENDU (contrairement à `display:
  // none` ou `opacity: 0`, qui produiraient une capture vide ou transparente).
  offscreen: { position: 'absolute', left: -20_000, top: 0 },
});
