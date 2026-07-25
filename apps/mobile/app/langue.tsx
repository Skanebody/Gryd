/**
 * GRYD — SÉLECTEUR DE LANGUE. Une décision, une liste, zéro CTA (§A) : le tap
 * SUR une langue l'applique immédiatement — toute l'app bascule sans redémarrage
 * (store i18n `useSyncExternalStore`) et le choix est persisté.
 *
 * ─── ORDRE DE COMPOSITION ─────────────────────────────────────────────────────
 *   1. `StackScreen` : kicker « RÉGLAGES · LANGUE » + titre + sous-titre ;
 *   2. UN groupe radio, cinq lignes : nom de la langue, et la mention « Langue
 *      actuelle » sur la seule qui l'est.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · LES CINQ CADRES PERMANENTS. Chaque ligne portait `borderWidth: 1` en
 *   `grisLigne`, et la sélection se contentait d'en CHANGER LA COULEUR. Un
 *   contour partout, c'est un contour qui ne signale rien (règle 80/20). Sans
 *   cadre permanent, la bordure chartreuse REDEVIENT un état — et c'est
 *   exactement ce qu'elle est.
 * · Le littéral `minHeight: 52`, remplacé par le token `sizes.buttonMd` : une
 *   mesure d'interaction a un nom dans la charte, elle ne se réinvente pas.
 * · Les styles typo locaux (`fontSize` + `fontWeight` SANS `fontFamily`, donc la
 *   fonte système au lieu d'Inter) → rôles `typography.*`.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ──────────────────────────────────────────────
 * · LA LIGNE N'EST PAS UNE `ListRow`, et c'est délibéré. `ListRow` impose
 *   `accessibilityRole="button"` ; or ceci est un GROUPE RADIO à choix unique,
 *   et la primitive est gelée — on ne la modifie pas pour un écran. La géométrie
 *   est alignée sur elle au pixel (surface N1, `radii.card`, même retrait, même
 *   écart), seule la sémantique d'accessibilité diffère : `radiogroup` sur le
 *   conteneur, `radio` + `selected` sur chaque ligne. Un lecteur d'écran doit
 *   annoncer « 3 sur 5, sélectionné », pas « bouton ».
 * · Les noms de langue restent dans LEUR propre langue (Deutsch, Português…) :
 *   on se reconnaît dans sa langue, jamais dans sa traduction. Ce sont des
 *   invariants, ils ne passent pas par le catalogue.
 * · Aucun des quatre états : cet écran ne lit rien du réseau, et le store i18n
 *   a toujours une langue courante. Il ne peut être ni vide, ni en échec, ni en
 *   cours de lecture.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { borderState, colors, elevation, radii, sizes, spacing, typography } from '@klaim/shared';
import { C } from '../src/i18n/catalog/reglages';
import { setLocale, useLocale, useT } from '../src/i18n/store';
import { LOCALES, LOCALE_LABELS, type Locale } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';

export default function LangueScreen() {
  const t = useT();
  const current = useLocale();

  useEffect(() => {
    screen('settings_langue');
  }, []);

  const choose = (next: Locale) => {
    if (next === current) return;
    haptics.light();
    setLocale(next);
  };

  return (
    <StackScreen
      title={t(C.langueTitle)}
      icon="reglages"
      kicker={t(C.langueKicker)}
      subtitle={t(C.langueSubtitle)}
    >
      <View accessibilityRole="radiogroup" style={styles.list}>
        {LOCALES.map((loc) => {
          const selected = loc === current;
          return (
            <Pressable
              key={loc}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={LOCALE_LABELS[loc]}
              onPress={() => choose(loc)}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.name, selected && styles.nameSelected]}>
                {LOCALE_LABELS[loc]}
              </Text>
              {/* L'état sélectionné est porté par le TEXTE (§C : jamais la
                  couleur seule) — la bordure chartreuse ne fait que renforcer. */}
              {selected ? <Text style={styles.current}>{t(C.langueSelected)}</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 8, gap: 10 },
  // Géométrie alignée sur `ListRow` : surface N1 SANS contour, séparée par
  // l'espace. La hauteur vient du token d'interaction, pas d'un littéral.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.buttonMd,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingHorizontal: spacing.cardPadding,
    // Bordure TRANSPARENTE au repos : la ligne ne bouge pas d'un pixel quand
    // elle devient sélectionnée, et pourtant aucun cadre n'est peint.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: borderState.active },
  pressed: { opacity: 0.7 },
  name: { ...typography.itemTitle, color: colors.blanc },
  nameSelected: { color: colors.chartreuse },
  current: { ...typography.meta, color: colors.gris, marginLeft: 12, flexShrink: 1 },
});
