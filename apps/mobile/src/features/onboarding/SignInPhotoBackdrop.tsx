/**
 * GRYD — FOND PHOTO du hero de connexion : la photo de crew (nuit) + un voile en
 * paliers, EN WRAPPER autour du contenu. Il REMPLACE `PromiseHexField` (le champ
 * d'hexagones décoratif) le 26/07/2026 : la refonte « écrans à photo » veut un
 * vrai crew, pas un motif.
 *
 * ─── POURQUOI UN `Image` À DIMENSIONS EXPLICITES, ET NON `ImageBackground` ────
 * Sur react-native-web (le bundle mobile-web sert de preview), `ImageBackground`
 * ne contraint PAS son image à la taille du conteneur : elle rend à sa taille
 * NATIVE (941×1672 mesuré), déborde le cadre 390×844 et — peinte en `zIndex:-1`
 * qui s'échappe — passe AU-DESSUS de l'aplat plein : les jambes du crew
 * traversaient l'aplat bas censé porter les boutons. La forme FIABLE est un
 * `<Image>` ORDINAIRE à `width`/`height` EXPLICITES (les dimensions de l'écran,
 * via `useWindowDimensions`) : la taille est forcée, `cover` recadre le bitmap,
 * et l'ordre de peinture suit l'ordre du DOM entre frères — image (fond) → voile
 * → contenu — sans dépendre d'un z-index. Le voile et le contenu sont ses frères.
 *
 * ─── POURQUOI DEUX ZONES DE VOILE, ET PAS UNE ───────────────────────────────
 * L'écran de connexion est en `space-between` : le hero (kicker gris + titre
 * blanc + sous-titre) vit EN HAUT, le bloc d'entrée (Apple/Google/e-mail, dont
 * l'unique CTA chartreuse) vit EN BAS. La photo a un CIEL DE DUSK clair en haut —
 * et la charte interdit texte/chartreuse sur fond clair (contraste 1,2:1). Donc :
 *   · un VOILE HAUT fonce le ciel derrière le hero (blanc/gris lisibles) ;
 *   · un APLAT CARBONE plein en bas porte les boutons — jamais de chartreuse sur
 *     une zone claire de la photo ;
 *   · les VISAGES du crew (≈ 35-47 % de la hauteur) respirent dans la bande
 *     CLAIRE entre les deux ; les chaussures brillantes du bas passent derrière
 *     l'aplat.
 * Les teintes DÉRIVENT du token immersif (`withAlpha`), jamais un rgba recodé à
 * la main. Paliers de Views (aucune dépendance gradient), comme `E01Hero`.
 *
 * ─── PARTAGÉ PAR LES DEUX FORKS ─────────────────────────────────────────────
 * `sign-in.tsx` (natif) et `sign-in.web.tsx` l'enveloppent tous les deux autour
 * de leur `KeyboardAvoidingView`. Le fork n'existe QUE pour tenir un module natif
 * (`expo-apple-authentication`) hors du bundle web ; une photo n'en dépend pas —
 * la dupliquer, ce serait deux réglages de voile qui divergent.
 *
 * ─── HONNÊTETÉ ──────────────────────────────────────────────────────────────
 * C'est une DA, pas une donnée de jeu : aucun nom, aucun chiffre, aucun
 * classement. Le carbone du `root` reste DERRIÈRE l'image — photo absente ou
 * lente → écran sombre, jamais blanc.
 */
import type { ReactNode } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, withAlpha } from '@klaim/shared';

/** Photo de crew (nuit) — DA, cadrée `cover`. Le fichier vit dans `assets/auth/`. */
const SIGN_IN_PHOTO = require('../../../assets/auth/sign-in-crew.jpg');

/**
 * Mesures de COMPOSITION (parts de hauteur d'écran), pas des règles de jeu.
 * CALÉES SUR LA PHOTO : les VISAGES du crew tombent vers 35-47 % de la hauteur —
 * on laisse donc respirer la bande ≈ 40-50 % (le visage central reste net), un
 * voile haut qui couvre le hero ENTIER (le sous-titre gris ne doit pas tomber sur
 * un visage clair), et un aplat plein en bas pour les boutons.
 */
const SCRIM_TOP_H = '40%'; // voile haut : couvre le hero ENTIER (sous-titre inclus)
const SCRIM_TOP_CAP_H = '15%'; // renfort près de la barre d'état / du kicker
const SCRIM_BOTTOM_FADE_H = '50%'; // fondu au-dessus de l'aplat (sous les visages)
const SCRIM_BOTTOM_SOLID_H = '42%'; // aplat carbone PLEIN : porte les boutons

export function SignInPhotoBackdrop({ children }: { children: ReactNode }) {
  // Dimensions EXPLICITES : sans elles, react-native-web rend l'image à sa taille
  // native et le `cover` déborde (cf. docblock). Elles suivent la rotation/resize.
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.root}>
      {/* Photo EN DESSOUS (1er frère), taille forcée à l'écran, `cover` recadre. */}
      <Image
        source={SIGN_IN_PHOTO}
        resizeMode="cover"
        style={[styles.photo, { width, height }]}
      />
      {/* Voile en paliers — pointerEvents none, PAR-DESSUS la photo, SOUS le contenu. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
        {/* Voile HAUT — fonce le ciel de dusk pour le hero (blanc/gris lisibles). */}
        <View style={[styles.top, styles.top1]} />
        <View style={[styles.top, styles.top2]} />
        {/* Aplat BAS — fondu puis carbone PLEIN sous le bloc d'entrée. */}
        <View style={[styles.bottom, styles.bottomFade]} />
        <View style={[styles.bottom, styles.bottomSolid]} />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // Carbone DERRIÈRE la photo : fallback sombre si l'image manque (jamais blanc).
  root: { flex: 1, backgroundColor: colors.carbonImmersive },
  photo: { position: 'absolute', top: 0, left: 0 },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  top1: { height: SCRIM_TOP_H, backgroundColor: withAlpha(colors.carbonImmersive, 0.45) },
  top2: { height: SCRIM_TOP_CAP_H, backgroundColor: withAlpha(colors.carbonImmersive, 0.4) },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomFade: {
    height: SCRIM_BOTTOM_FADE_H,
    backgroundColor: withAlpha(colors.carbonImmersive, 0.5),
  },
  bottomSolid: { height: SCRIM_BOTTOM_SOLID_H, backgroundColor: colors.carbonImmersive },
});
