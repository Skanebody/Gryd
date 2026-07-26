/**
 * GRYD — E01 « PROMESSE », le tout premier écran de l'app (planche Vague 1,
 * hi-fi iOS 390×844). Rendu PLEIN ÉCRAN, hors de l'en-tête commun du stepper
 * (early-return `step === 'mechanic'` dans app/onboarding/index.tsx).
 *
 * ─── ORDRE DE COMPOSITION (planche E01) ─────────────────────────────────────
 *  1. la PHOTO plein cadre (`assets/onboarding/e01-crew.jpg` : crew + un cycliste,
 *     rue de jour), cadrée « cover » ;
 *  2. la BOUCLE chartreuse animée (`E01Route`), qui remplace le label « VOTRE
 *     RUE » de la planche : elle enseigne la mécanique au lieu de la nommer ;
 *  3. la chip « Exemple », posée sur le visuel (coin haut-GAUCHE) ;
 *  4. le voile bas dégradé (lisibilité du bloc de texte) ;
 *  5. « Passer », discret, coin haut-droit ;
 *  6. le bloc bas : kicker → titre display → sous-titre → CTA unique → frise de
 *     progression → porte « J'ai déjà un compte ».
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ───────────────────────────────────────
 * · LE FOND PHOTO — RÉTABLI le 26/07/2026 avec le vrai visuel
 *   `assets/onboarding/e01-crew.jpg` (1024×1536, cadré `cover`). Il avait été
 *   retiré tant que l'asset n'était qu'un PNG de 2 × 3 pixels étiré plein écran —
 *   un placeholder qui PRÉTEND être une photo ment plus qu'un fond assumé. Le
 *   carbone du `root` reste DERRIÈRE l'image : photo absente ou lente → écran
 *   sombre, jamais blanc (jamais d'écran vide).
 * · `Image` À DIMENSIONS EXPLICITES, PAS `ImageBackground` — sur react-native-web
 *   (le bundle mobile-web sert de preview), `ImageBackground` ne contraint pas son
 *   image à la taille du conteneur : elle rend à sa taille native, déborde et —
 *   peinte en `zIndex:-1` qui s'échappe — passe AU-DESSUS du voile bas, la photo
 *   bavant derrière le titre et le CTA. Un `<Image>` frère à `width`/`height`
 *   forcés (les dimensions de l'écran) + `cover` recadre proprement, et l'ordre du
 *   DOM garantit la peinture : photo → boucle → voile → contenu. (Idem
 *   `SignInPhotoBackdrop` ; sur natif les deux formes sont équivalentes.)
 * · Le CTA recodé à la main (56 px, `radii.btn`) : deux boutons chartreuse de
 *   MÊME rôle portaient DEUX rayons différents sur deux écrans consécutifs. Le
 *   composant `Button` tranche — et apporte au passage l'anneau de focus clavier
 *   et le libellé qui rétrécit sans jamais l'ellipse (§A).
 * · Les points d'étape locaux, comptés « 5 » en dur : ils vivent dans `StepDots`,
 *   alimenté par `stepProgress()`. Cf. ÉCARTS pour ce qui reste à E01.
 * · Les mesures nues (40/44/16/14, points 5/16, `rgba(6,8,7,…)`) : constantes
 *   nommées, rôles typo et `withAlpha()` sur un token.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ────────────────────────────────────────────
 * · LA PLANCHE E01 (-selection2/-selection5) MONTRE UNE GRILLE, PAS UNE PHOTO —
 *   écart ASSUMÉ vers le « voire mieux » : le fondateur a livré le vrai visuel
 *   crew (26/07/2026) et veut la photo plein cadre que décrivent CE docblock et
 *   `app/onboarding/index.tsx`. La composition de la planche (titre display, CTA
 *   pleine largeur, frise sous le CTA, « Passer ») est, elle, suivie fidèlement ;
 *   la boucle chartreuse (`E01Route`) et la chip « Exemple » restent au-dessus.
 * · TITRE À 40 px SANS ROLE TYPO — raison technique : l'échelle `typography` ne
 *   monte pas au-delà de `title` (28) sauf par `stat`, réservé aux CHIFFRES
 *   (tabular-nums). La taille vient donc de `fontSizes.xxl` et la famille de
 *   `fonts.display`, comme le ferait le rôle qui manque.
 * · FRISE SOUS LE CTA sur CET écran seulement — la planche la place là ; les
 *   étapes suivantes n'ont pas de planche et la portent dans leur en-tête, où
 *   elle ne dispute rien au pied (qui porte déjà CTA + lien + notes d'état).
 * · « Passer » n'est PAS un bouton système : c'est un lien gris. §A4 n'autorise
 *   qu'UN CTA chartreuse par écran, et c'est « Continuer ».
 */
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, fonts, sizes, spacing, withAlpha } from '@klaim/shared';
import { Button } from '../../ui/Button';
import { StepDots } from './StepDots';

/**
 * PHOTO plein cadre de l'écran promesse (DA, PAS une donnée de jeu) : coureurs +
 * un cycliste, rue de jour. Le titre « CONQUIERS TA VILLE. » vaut pour les deux
 * disciplines — le vélo est dans l'image. Cadrée `cover` par l'`ImageBackground`.
 */
const E01_PHOTO = require('../../../assets/onboarding/e01-crew.jpg');

/**
 * Mesures de COMPOSITION de la planche (pas des règles de jeu) : le titre display
 * est en 40 / interligne 44, et le voile bas démarre à 38 % de la hauteur —
 * mesuré pour que le texte reste lisible sur une photo claire de lever du jour.
 */
const TITLE_LINE_HEIGHT = 44;
const TAGLINE_MAX_WIDTH = 320;
const SCRIM_TOP_HEIGHT = 62; // % de hauteur couverts par le fondu bas
// Fondu SANS expo-linear-gradient (absent du projet) : N bandes fines
// bottom-ancrées, hauteur croissante, même faible opacité → l'empilement produit
// une transition CONTINUE (plus les 3 aplats à bord net). 14 pas = imperceptible.
const SCRIM_STEPS = 14;
const SCRIM_STEP_ALPHA = 0.2;

export interface E01HeroProps {
  title: string;
  tagline: string;
  cta: string;
  /** « Passer » en haut à droite (entre dans l'app sans le flow pédagogique). */
  skipLabel: string;
  onNext: () => void;
  onSkip: () => void;
  insets: EdgeInsets;
  /** Étape courante (0-indexée) et total — dérivés du flow, jamais écrits ici. */
  stepIndex: number;
  stepCount: number;
  /** « Étape 1 sur 4 », déjà traduit : des points ne s'entendent pas. */
  stepA11yLabel: string;
}

export function E01Hero({
  title,
  tagline,
  cta,
  skipLabel,
  onNext,
  onSkip,
  insets,
  stepIndex,
  stepCount,
  stepA11yLabel,
}: E01HeroProps) {
  // Dimensions EXPLICITES pour la photo (cf. docblock : react-native-web ne
  // contraint pas l'image sinon). Elles suivent la rotation / le redimensionnement.
  const { width, height } = useWindowDimensions();
  return (
    // PHOTO plein cadre (DA) : le voile bas en paliers, la boucle chartreuse et la
    // chip « Exemple » se peignent PAR-DESSUS. `styles.root` garde son carbone —
    // fond honnête et sombre si la photo manque ou charge lentement (jamais blanc).
    <View style={styles.root}>
      {/* Photo EN DESSOUS (1er frère), taille FORCÉE à l'écran, `cover` recadre
          (cf. ÉCARTS : react-native-web ne contraint pas l'image d'ImageBackground).
          La photo reste PROPRE (planche E01) : aucune boucle ni chip « Exemple »
          par-dessus — la boucle chartreuse et « Exemple » enseignent la mécanique
          sur les écrans SUIVANTS (visuals.tsx), pas sur l'écran-promesse. */}
      <Image source={E01_PHOTO} resizeMode="cover" style={[styles.photo, { width, height }]} />

      {/* Voile bas : un FONDU continu transparent → carbone plein. Faute
          d'expo-linear-gradient (absent du projet), il est composé de N bandes
          fines bottom-ancrées de hauteur croissante et de même faible opacité :
          leur empilement fait un dégradé lisse, PAS les 3 barres à bord net
          d'avant. Teintes dérivées du token immersif (jamais un rgba en dur). */}
      {Array.from({ length: SCRIM_STEPS }).map((_, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.scrim,
            {
              height: `${(SCRIM_TOP_HEIGHT * (i + 1)) / SCRIM_STEPS}%`,
              backgroundColor: withAlpha(colors.carbonImmersive, SCRIM_STEP_ALPHA),
            },
          ]}
        />
      ))}

      {/* « Passer » : saute le flow pédagogique et entre dans l'app. Il ne mène
          PAS à la connexion — c'est la porte du bas qui l'annonce. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={skipLabel}
        onPress={onSkip}
        hitSlop={12}
        style={({ pressed }) => [
          styles.skip,
          { top: insets.top + spacing.sm },
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.skipLabel}>{skipLabel}</Text>
      </Pressable>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        {/* PAS de kicker « COMMENT ÇA MARCHE » : la planche E01 propre ne le
            montre pas — la photo + le titre suffisent à ouvrir. Il vivait ici par
            habitude du flow, il est retiré (retour fondateur). */}
        {/* Titre planche « COURS. / PRENDS TA VILLE. » : 2 lignes, et
            `adjustsFontSizeToFit` rétrécit si une langue dépasse la largeur
            (« PRENDS TA VILLE. » = 16 car. > budget 14) — jamais de 3e ligne ni
            de débordement sur cet écran sans scroll. */}
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
          {title}
        </Text>
        <Text style={styles.tagline}>{tagline}</Text>
        {/* L'UNIQUE CTA chartreuse de l'écran (§A4). */}
        <Button label={cta} onPress={onNext} variant="primary" size="lg" analyticsId="onboarding_e01_next" />
        {/* Frise de progression sous le CTA (planche E01). Pas de « J'ai déjà un
            compte » ici : la planche ne le montre pas — la porte du compte est
            l'écran d'authentification (E06), atteint en fin de séquence ou par
            « Passer ». Un 2e lien sous le CTA n'y figure pas. */}
        <StepDots
          index={stepIndex}
          count={stepCount}
          a11yLabel={stepA11yLabel}
          style={styles.dots}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.carbonImmersive },
  // Photo plein cadre, DERRIÈRE tout le reste (width/height forcés au rendu).
  photo: { position: 'absolute', top: 0, left: 0 },

  // Cadre du dégradé bas : le tiers inférieur ~62 % de l'écran. Le FONDU (opacité
  // croissante) est porté par le LinearGradient, pas par des aplats empilés.
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: SCRIM_TOP_HEIGHT },

  skip: { position: 'absolute', right: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  skipLabel: { color: colors.gris, fontFamily: fonts.textMedium, fontSize: fontSizes.sm },

  bottom: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: 0, gap: spacing.sm },
  // Titre display de la planche : 40 / interligne 44 / -0,01em.
  title: {
    color: colors.blanc,
    fontFamily: fonts.display, // Inter Tight 800 — la famille porte la graisse
    fontSize: fontSizes.xxl,
    letterSpacing: -0.4,
    lineHeight: TITLE_LINE_HEIGHT,
  },
  tagline: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.4,
    maxWidth: TAGLINE_MAX_WIDTH,
  },
  // Frise SOUS le CTA (planche) — centrée.
  dots: { alignSelf: 'center' },

  pressed: { opacity: 0.85 },
});
