/**
 * GRYD — E00 « Splash / restauration de session », LE RENDU (spec produit
 * `GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md` l.549-553, route `/`).
 *
 * Layout imposé, et rien d'autre :
 *  · fond `--gryd-bg` (= `colors.noir`, le token — jamais un `#000` en dur) ;
 *  · logo GRYD centré horizontalement, LÉGÈREMENT au-dessus du centre ;
 *  · AUCUN slogan (aucun texte visible en dehors du wordmark) ;
 *  · indicateur discret UNIQUEMENT au-delà de `SPLASH_INDICATOR_DELAY_MS`.
 *
 * ─── CE QUE CE COMPOSANT REMPLACE ───────────────────────────────────────────
 * Deux `<View style={{flex:1, backgroundColor: colors.noir}} />` nus — un dans
 * `app/_layout.tsx` (attente des fontes), un dans `app/(tabs)/_layout.tsx`
 * (attente de la session). Le fond était juste, mais il n'y avait ni logo ni
 * indicateur : E00 n'était pas rendu, il était SUBI. Celui de `(tabs)` reste en
 * place comme seconde garde (il appartient à un autre périmètre) ; il n'est plus
 * atteignable À L'ŒIL puisque ce splash le couvre.
 *
 * ─── DEUX RÈGLES QUI CONTRAIGNENT LE RENDU ──────────────────────────────────
 * 1. AUCUN SAUT DE MISE EN PAGE. Le logo ne bouge pas d'un pixel quand
 *    l'indicateur apparaît (il est positionné en absolu), et il n'apparaît pas
 *    dans la police système pour être remplacé ensuite par Inter Tight : tant
 *    que les fontes ne sont pas prêtes (`logoReady`), le wordmark est rendu en
 *    opacité 0 — la place est déjà prise, la substitution ne se voit jamais.
 * 2. REDUCE MOTION RESPECTÉ. Sous Reduce Motion, l'indicateur n'est PAS un
 *    spinner : trois points statiques. L'information « ça travaille » reste,
 *    l'animation part — jamais l'inverse (on ne supprime pas l'indicateur, on
 *    supprime son mouvement).
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { colors, fonts, fontSizes, SPLASH_INDICATOR_DELAY_MS, spacing } from '@klaim/shared';
import { useReduceMotion } from '../../ui/game/anim';
import { C } from '../../i18n/catalog/boot';
import { useT } from '../../i18n/store';
import { shouldShowBootIndicator } from './bootSequence';

/**
 * « Légèrement au-dessus du centre » : 8 % de la hauteur d'écran. Assez pour que
 * l'œil lise une composition intentionnelle plutôt qu'un centrage raté, assez
 * peu pour que ça reste le centre optique (le vide sous un logo pèse plus lourd
 * que le vide au-dessus).
 */
const LOGO_RISE_RATIO = 0.08;

/** Diamètre d'un point de l'indicateur statique (variante Reduce Motion). */
const DOT_SIZE = 5;

export interface SplashE00Props {
  /**
   * Les fontes NIGHT PRINT sont-elles chargées ? Le wordmark n'est révélé
   * qu'ensuite (voir règle 1 de l'entête) — la mise en page, elle, est déjà en
   * place, donc rien ne bouge à la révélation.
   */
  readonly logoReady: boolean;
}

/**
 * Compte le temps écoulé depuis le montage et dit si l'indicateur a le droit
 * d'apparaître. Un SEUL `setTimeout` (pas de tick récurrent) : le seuil est un
 * franchissement unique, pas une mesure continue.
 */
function useIndicatorVisible(): boolean {
  const [visible, setVisible] = useState(() => shouldShowBootIndicator(0));
  useEffect(() => {
    const id = setTimeout(
      () => setVisible(shouldShowBootIndicator(SPLASH_INDICATOR_DELAY_MS)),
      SPLASH_INDICATOR_DELAY_MS,
    );
    return () => clearTimeout(id);
  }, []);
  return visible;
}

export function SplashE00({ logoReady }: SplashE00Props) {
  const { height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const showIndicator = useIndicatorVisible();
  const t = useT();

  return (
    <View
      style={styles.root}
      // Le splash COUVRE l'app : le lecteur d'écran ne devrait pas traverser
      // vers les écrans montés dessous, qui ne sont pas encore les bons.
      // ⚠ PORTÉE RÉELLE : `accessibilityViewIsModal` est un attribut iOS. Sur
      // Android il est ignoré, et rien ici ne masque les frères — le faire
      // demanderait de poser `importantForAccessibility="no-hide-descendants"`
      // sur le `<Stack>` depuis `app/_layout.tsx`, ce qui touche la pile de
      // navigation entière et sort du périmètre de ce chantier. Écrit ici pour
      // que personne ne lise « c'est réglé » là où c'est réglé sur UNE
      // plateforme.
      accessibilityViewIsModal
    >
      <View
        style={[
          styles.logoWrap,
          { transform: [{ translateY: -Math.round(height * LOGO_RISE_RATIO) }] },
        ]}
      >
        {/* Le wordmark EST le logo (même traitement que la planche E06 :
            chartreuse, Inter Tight 800, fort interlettrage). Chartreuse sur
            fond carbone — jamais sur fond clair (charte). */}
        <Text
          style={[styles.wordmark, logoReady ? null : styles.wordmarkHidden]}
          accessibilityRole="header"
          // Le logo est décoratif tant que la marque n'est pas lisible : on ne
          // fait pas annoncer un titre qui n'est pas encore affiché.
          accessibilityElementsHidden={!logoReady}
        >
          GRYD
        </Text>
      </View>

      {/* INDICATEUR DISCRET — en absolu, sous le logo : son apparition ne
          déplace RIEN. Rendu seulement au-delà du seuil de la spec. */}
      {showIndicator ? (
        <View style={styles.indicator} accessibilityLabel={t(C.loadingIndicator)}>
          {reduceMotion ? (
            <View style={styles.dots}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          ) : (
            <ActivityIndicator size="small" color={colors.grisFaible} />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // `absoluteFill` + fond OPAQUE : c'est ce qui rend l'écran de connexion
  // invisible même s'il se monte dessous (critère E00, l.577).
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.noir, // --gryd-bg
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center' },
  wordmark: {
    color: colors.chartreuse,
    fontFamily: fonts.display, // Inter Tight 800
    fontSize: fontSizes.xl,
    letterSpacing: 12,
    // Le letterSpacing pousse le dernier glyphe : on compense pour recentrer
    // (même compensation que app/(auth)/sign-in.tsx).
    marginLeft: 12,
  },
  // Place réservée, marque pas encore lisible : aucun saut à la révélation.
  wordmarkHidden: { opacity: 0 },
  indicator: {
    position: 'absolute',
    // Sous le centre optique, assez bas pour ne pas concurrencer le logo.
    bottom: '22%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: spacing.lg,
  },
  dots: { flexDirection: 'row', gap: spacing.xxs },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.grisFaible,
  },
});
