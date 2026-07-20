/**
 * GRYD — CODE DE CONDUITE de la communauté (AMENDEMENT-33 §1, App Store
 * Guideline 1.2). Écran POUSSÉ depuis le Chat crew. Règles COURTES de la
 * communauté + « Tolérance zéro » harcèlement/haine. Volontairement sobre :
 * ton calme, cards courtes iconées, pas de vocabulaire gaming. Rappelle aussi
 * comment SIGNALER / BLOQUER (déjà dans le chat) — Apple veut voir un moyen
 * clair de modérer le contenu généré par les utilisateurs. Contenu légal RÉEL.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing, type IconName } from '@klaim/shared';
import { C } from '../src/i18n/catalog/reglages';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';

interface Rule {
  key: string;
  icon: IconName;
  title: Entry;
  body: Entry;
}

/** Les règles de la communauté GRYD — courtes, non négociables. */
const RULES: readonly Rule[] = [
  { key: 'respect', icon: 'crew', title: C.respectTitle, body: C.respectBody },
  { key: 'zero_haine', icon: 'alerte', title: C.zeroHaineTitle, body: C.zeroHaineBody },
  { key: 'pseudo', icon: 'profil', title: C.pseudoCorrectTitle, body: C.pseudoCorrectBody },
  { key: 'no_spam', icon: 'cloche', title: C.noSpamTitle, body: C.noSpamBody },
  { key: 'securite', icon: 'bouclier', title: C.securiteTitle, body: C.securiteBody },
];

/** Ce que fait la modération quand une règle est enfreinte. */
const ENFORCEMENT: readonly Rule[] = [
  { key: 'report', icon: 'alerte', title: C.reportEnfTitle, body: C.reportEnfBody },
  { key: 'block', icon: 'verrou', title: C.blockEnfTitle, body: C.blockEnfBody },
  { key: 'sanctions', icon: 'fermer', title: C.sanctionsTitle, body: C.sanctionsBody },
];

function RuleCard({ rule, tint = colors.blanc }: { rule: Rule; tint?: string }) {
  const t = useT();
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon name={rule.icon} size={18} color={tint} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{t(rule.title)}</Text>
        <Text style={styles.body}>{t(rule.body)}</Text>
      </View>
    </View>
  );
}

export default function CodeConduiteScreen() {
  const t = useT();
  useEffect(() => {
    screen('code_conduite');
  }, []);

  return (
    <StackScreen
      title={t(C.conduiteTitle)}
      icon="crew"
      kicker={t(C.conduiteKicker)}
      subtitle={t(C.conduiteSubtitle)}
    >
      <View style={styles.list}>
        <Text style={styles.sectionLabel}>{t(C.secLesRegles)}</Text>
        {RULES.map((r) => (
          <RuleCard
            key={r.key}
            rule={r}
            tint={r.key === 'zero_haine' ? gameColors.danger : colors.blanc}
          />
        ))}

        <Text style={styles.sectionLabel}>{t(C.secModeration)}</Text>
        {ENFORCEMENT.map((r) => (
          <RuleCard key={r.key} rule={r} />
        ))}
      </View>

      <Text style={styles.footnote}>{t(C.conduiteFootnote)}</Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 8 },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  body: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 4,
  },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 18,
  },
});
