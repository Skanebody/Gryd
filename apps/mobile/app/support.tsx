/**
 * GRYD — Support (AMENDEMENT-08 §10, doc §22 ; hérite AMENDEMENT-06 §5).
 * Écran POUSSÉ depuis Profil. VOLONTAIREMENT SOBRE : le support crée la
 * confiance — cards courtes iconées, ton calme, explications transparentes,
 * pas de vocabulaire gaming. L'habillage (espacements, typo, cards carbone)
 * reste celui du design system. Les 6 cas doc §22 : Course non comptée,
 * Segment exclu, Signaler triche, Zone dangereuse, Exporter mes données,
 * Supprimer mes données. Rien de câblé : stubs TODO(O2/backend).
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing, type IconName } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';

interface SupportTopic {
  key: string;
  icon: IconName;
  title: string;
  body: string;
}

/** « Ma course » — statuts de vérification et segments exclus, expliqués calmement. */
const RUN_TOPICS: readonly SupportTopic[] = [
  {
    key: 'not_counted',
    icon: 'aide',
    title: 'Course non comptée',
    body:
      'Une course peut être vérifiée, partielle, stats only, doublon ou rejetée. Seules les ' +
      'courses vérifiées capturent du territoire — les autres comptent quand même pour ta ' +
      'performance. On t\'explique le statut de chaque course, et tu peux le contester.',
  },
  {
    key: 'segment_excluded',
    icon: 'pin',
    title: 'Segment exclu',
    body:
      'Les portions en zone privée, sans signal GPS fiable ou au déplacement invraisemblable ' +
      'sont retirées du calcul. Le reste de la course reste valide, rien d\'autre n\'est perdu.',
  },
];

/** Signalements — traités par une personne, réponse sous quelques jours. */
const REPORT_TOPICS: readonly SupportTopic[] = [
  {
    key: 'report_cheat',
    icon: 'alerte',
    title: 'Signaler une triche',
    body:
      'Des captures impossibles, une allure de véhicule ? Signale le profil : GRYD Verify ' +
      'examine les traces. Le signalement reste confidentiel.',
  },
  {
    key: 'report_danger',
    icon: 'bouclier',
    title: 'Signaler une zone dangereuse',
    body:
      'Travaux, trafic, zone mal éclairée ? Signale-la : elle sera retirée des objectifs ' +
      'proposés. La sécurité passe avant le jeu.',
  },
];

/** Données personnelles (RGPD) — export et suppression, sans friction. */
const DATA_TOPICS: readonly SupportTopic[] = [
  {
    key: 'data_export',
    icon: 'partage',
    title: 'Exporter mes données',
    body: 'Reçois une copie complète de tes courses, hexes, badges et réglages.',
  },
  {
    key: 'data_delete',
    icon: 'fermer',
    title: 'Supprimer mes données',
    body:
      'Demande la suppression définitive de ton compte et de toutes tes données. ' +
      'C\'est irréversible, et c\'est ton droit.',
  },
];

function TopicCard({ topic }: { topic: SupportTopic }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={topic.title}
      onPress={() => {
        // TODO backend : contestation / signalement / RGPD (§7.15). Aucun câblage MVP.
        if (__DEV__) console.log(`[support] ${topic.key} — TODO backend`);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.iconWrap}>
        <Icon name={topic.icon} size={18} color={colors.blanc} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{topic.title}</Text>
        <Text style={styles.body}>{topic.body}</Text>
      </View>
      <Icon name="chevron" size={16} color={colors.gris} />
    </Pressable>
  );
}

function Section({ label, topics }: { label: string; topics: readonly SupportTopic[] }) {
  return (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      {topics.map((t) => (
        <TopicCard key={t.key} topic={t} />
      ))}
    </>
  );
}

export default function SupportScreen() {
  useEffect(() => {
    screen('support');
  }, []);

  return (
    <StackScreen
      title="Support"
      icon="aide"
      kicker="AIDE"
      subtitle="Comprendre pourquoi une course compte — ou pas — et faire valoir tes droits. Une personne lit chaque demande."
    >
      <View style={styles.list}>
        <Section label="MA COURSE" topics={RUN_TOPICS} />
        <Section label="SIGNALER" topics={REPORT_TOPICS} />
        <Section label="MES DONNÉES" topics={DATA_TOPICS} />
      </View>
      <Text style={styles.footnote}>
        Les décisions de vérification sont expliquées, jamais automatiques sans recours.
      </Text>
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
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: 10,
  },
  pressed: { opacity: 0.7 },
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
