/**
 * GRYD — sélecteur de LANGUE (demande fondateur 20/07/2026). Écran poussé
 * depuis Paramètres. Une décision, une liste, zéro CTA (§A) : le tap SUR une
 * langue l'applique immédiatement — toute l'app bascule sans redémarrage
 * (store i18n useSyncExternalStore) et le choix est persisté (AsyncStorage).
 *
 * Les noms de langue restent dans leur PROPRE langue (Deutsch, Português…) :
 * on se reconnaît dans sa langue, jamais dans sa traduction.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
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
      <View style={styles.list}>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52, // cible tactile confortable (jamais sous 44)
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.cardPadding,
  },
  rowSelected: { borderColor: colors.chartreuse },
  pressed: { opacity: 0.7 },
  name: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  nameSelected: { color: colors.chartreuse },
  current: { color: colors.gris, fontSize: fontSizes.xs, marginLeft: 12, flexShrink: 1 },
});
