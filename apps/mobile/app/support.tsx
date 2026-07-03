/**
 * GRYD — Support course (AMENDEMENT-06 §5, doc v3 §7.15). Écran POUSSÉ depuis
 * Profil. Cas : « Ma course n'a pas compté » (explication segments/statuts),
 * signaler triche / zone dangereuse, données (export / suppression → TODO
 * backend). Page obligatoire mais secondaire. Rien de câblé : liens stub
 * TODO(O2/backend). Aucune valeur de jeu — c'est de la donnée d'affichage.
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

/** Explication « ma course n'a pas compté » — statuts §15 / segments exclus. */
const RUN_STATUS_TOPICS: readonly SupportTopic[] = [
  {
    key: 'not_counted',
    icon: 'aide',
    title: "Ma course n'a pas compté",
    body:
      'Une course peut être « capture éligible », « stats only », « partielle », « rejetée » ou ' +
      '« doublon ». Seules les courses vérifiées capturent du territoire ; les autres enrichissent ' +
      'quand même ta performance.',
  },
  {
    key: 'segments',
    icon: 'pin',
    title: 'Un segment a été exclu',
    body:
      'Les portions en zone privée, sans signal GPS fiable ou avec un déplacement invraisemblable ' +
      'sont exclues du calcul. Le reste de la course reste valide.',
  },
];

/** Signalements (§7.15). */
const REPORT_TOPICS: readonly SupportTopic[] = [
  {
    key: 'cheat',
    icon: 'alerte',
    title: 'Signaler une triche',
    body: 'Un joueur capture des zones de façon impossible ? Signale-le, GRYD Verify enquête.',
  },
  {
    key: 'danger',
    icon: 'bouclier',
    title: 'Signaler une zone dangereuse',
    body: 'Une zone met les coureurs en danger ? Signale-la pour qu\'on la retire des objectifs.',
  },
];

/** Données personnelles (RGPD) — export / suppression, TODO backend. */
const DATA_TOPICS: readonly SupportTopic[] = [
  {
    key: 'export',
    icon: 'partage',
    title: 'Exporter mes données',
    body: 'Reçois une copie de tes courses, hexes et badges.',
  },
  {
    key: 'delete',
    icon: 'fermer',
    title: 'Supprimer mes données',
    body: 'Demande la suppression définitive de ton compte et de tes données.',
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
      <Icon name={topic.icon} size={20} color={colors.blanc} />
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
      title="Support course"
      icon="aide"
      kicker="AIDE"
      subtitle="Comprendre pourquoi une course compte — ou pas — et faire valoir tes droits."
    >
      <View style={styles.list}>
        <Section label="MA COURSE" topics={RUN_STATUS_TOPICS} />
        <Section label="SIGNALER" topics={REPORT_TOPICS} />
        <Section label="MES DONNÉES" topics={DATA_TOPICS} />
      </View>
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
  info: { flex: 1 },
  title: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  body: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 4,
  },
});
