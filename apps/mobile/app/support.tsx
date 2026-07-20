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
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, radii, spacing, type IconName } from '@klaim/shared';
import { C } from '../src/i18n/catalog/reglages';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { IconPlate } from '../src/ui/Card';
import { StackScreen } from '../src/ui/StackScreen';

interface SupportTopic {
  key: string;
  icon: IconName;
  title: Entry;
  body: Entry;
}

/** Une entrée de NAVIGATION vers une page d'explicabilité (route interne). */
interface NavTopic {
  key: string;
  icon: IconName;
  title: Entry;
  body: Entry;
  href: string;
}

/**
 * « Comprendre les calculs » — accès aux 2 pages d'explicabilité (AMENDEMENT-23
 * §B). Ces entrées NAVIGUENT (contrairement aux cas support stubés backend).
 * « Pourquoi ma course n'a pas compté ? » ouvre l'explication des règles.
 */
const EXPLAIN_TOPICS: readonly NavTopic[] = [
  {
    key: 'why_not_counted',
    icon: 'info',
    title: C.whyNotCountedTitle,
    body: C.whyNotCountedBody,
    href: '/calcul-zones',
  },
  {
    key: 'calc_zones',
    icon: 'boucle_fermee',
    title: C.explainZonesTitle,
    body: C.calcZonesBody,
    href: '/calcul-zones',
  },
  {
    key: 'faq_rules',
    icon: 'aide',
    title: C.explainFaqTitle,
    body: C.faqRulesBody,
    href: '/faq',
  },
];

/** « Ma course » — statuts de vérification et segments exclus, expliqués calmement. */
const RUN_TOPICS: readonly SupportTopic[] = [
  {
    key: 'not_counted',
    icon: 'aide',
    title: C.notCountedTitle,
    body: C.notCountedBody,
  },
  {
    key: 'segment_excluded',
    icon: 'pin',
    title: C.segmentExcludedTitle,
    body: C.segmentExcludedBody,
  },
];

/** Signalements — le canal de modération est en cours de mise en place (O1). */
const REPORT_TOPICS: readonly SupportTopic[] = [
  {
    key: 'report_cheat',
    icon: 'alerte',
    title: C.reportCheatTitle,
    body: C.reportCheatBody,
  },
  {
    key: 'report_danger',
    icon: 'bouclier',
    title: C.reportDangerTitle,
    body: C.reportDangerBody,
  },
];

/** Données personnelles (RGPD) — export et suppression, sans friction. */
const DATA_TOPICS: readonly SupportTopic[] = [
  {
    key: 'data_export',
    icon: 'partage',
    title: C.exporterMesDonnees,
    body: C.dataExportBody,
  },
  {
    key: 'data_delete',
    icon: 'fermer',
    title: C.dataDeleteTitle,
    body: C.dataDeleteBody,
  },
];

function TopicCard({ topic }: { topic: SupportTopic }) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(topic.title)}
      onPress={() => {
        // Le bouton répond toujours au tap. RGPD (export/suppression) → l'écran
        // Confidentialité qui porte les vrais contrôles ; les autres cas
        // (contestation, signalement) → accusé honnête, traité par une personne.
        // TODO(O1) backend : contestation / signalement (§7.15).
        if (topic.key.startsWith('data_')) {
          router.push('/confidentialite');
          return;
        }
        // Zéro-lie : ces signalements généraux n'ont pas encore de destination
        // (backend de modération O1 en cours) — on ne prétend PLUS qu'« une
        // personne examine ta demande ». Message honnête sur l'état réel.
        Alert.alert(t(topic.title), t(C.reportSoonBody), [{ text: t(C.compris) }]);
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <IconPlate icon={topic.icon} />
      <View style={styles.info}>
        <Text style={styles.title}>{t(topic.title)}</Text>
        <Text style={styles.body}>{t(topic.body)}</Text>
      </View>
      <Icon name="chevron" size={16} color={colors.gris} />
    </Pressable>
  );
}

/** Carte NAVIGABLE vers une page d'explicabilité (router.push). */
function NavCard({ topic }: { topic: NavTopic }) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(topic.title)}
      onPress={() => router.push(topic.href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <IconPlate icon={topic.icon} />
      <View style={styles.info}>
        <Text style={styles.title}>{t(topic.title)}</Text>
        <Text style={styles.body}>{t(topic.body)}</Text>
      </View>
      <Icon name="chevron" size={16} color={colors.gris} />
    </Pressable>
  );
}

function Section({ label, topics }: { label: string; topics: readonly SupportTopic[] }) {
  return (
    <>
      <Text style={styles.sectionLabel}>{label}</Text>
      {topics.map((topic) => (
        <TopicCard key={topic.key} topic={topic} />
      ))}
    </>
  );
}

export default function SupportScreen() {
  const t = useT();
  useEffect(() => {
    screen('support');
  }, []);

  return (
    <StackScreen
      title={t(C.supportTitle)}
      icon="aide"
      kicker={t(C.supportKicker)}
      subtitle={t(C.supportSubtitle)}
    >
      <View style={styles.list}>
        <Text style={styles.sectionLabel}>{t(C.secComprendreCalculs)}</Text>
        {EXPLAIN_TOPICS.map((topic) => (
          <NavCard key={topic.key} topic={topic} />
        ))}
        <Section label={t(C.secMaCourse)} topics={RUN_TOPICS} />
        <Section label={t(C.secSignaler)} topics={REPORT_TOPICS} />
        <Section label={t(C.secMesDonnees)} topics={DATA_TOPICS} />
      </View>
      <Text style={styles.footnote}>{t(C.supportFootnote)}</Text>
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
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 18,
  },
});
