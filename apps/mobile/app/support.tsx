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
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { IconPlate } from '../src/ui/Card';
import { StackScreen } from '../src/ui/StackScreen';

interface SupportTopic {
  key: string;
  icon: IconName;
  title: string;
  body: string;
}

/** Une entrée de NAVIGATION vers une page d'explicabilité (route interne). */
interface NavTopic {
  key: string;
  icon: IconName;
  title: string;
  body: string;
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
    title: 'Pourquoi ma course n’a pas compté ?',
    body:
      'Boucle non fermée, GPS trop faible, zone trop étroite ou interdite… GRYD calcule chaque ' +
      'zone selon des règles claires. Voir comment une course devient une zone — ou pas.',
    href: '/calcul-zones',
  },
  {
    key: 'calc_zones',
    icon: 'boucle_fermee',
    title: 'Comment GRYD calcule tes zones',
    body: 'Les 6 règles en images : ligne, boucle, défense, crew, bonus et GRYD Verify.',
    href: '/calcul-zones',
  },
  {
    key: 'faq_rules',
    icon: 'aide',
    title: 'Calculs & règles du jeu',
    body: 'La FAQ complète, détails au tap : zones, défense, crew, Verify, points et bonus.',
    href: '/faq',
  },
];

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

/** Signalements — le canal de modération est en cours de mise en place (O1). */
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
    body: 'Reçois une copie complète de tes courses, zones, badges et réglages.',
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
        Alert.alert(
          topic.title,
          'Le signalement en un tap arrive très bientôt. Pour l’instant cette remontée n’est pas encore transmise — on finalise le canal de modération.',
          [{ text: 'Compris' }],
        );
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <IconPlate icon={topic.icon} />
      <View style={styles.info}>
        <Text style={styles.title}>{topic.title}</Text>
        <Text style={styles.body}>{topic.body}</Text>
      </View>
      <Icon name="chevron" size={16} color={colors.gris} />
    </Pressable>
  );
}

/** Carte NAVIGABLE vers une page d'explicabilité (router.push). */
function NavCard({ topic }: { topic: NavTopic }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={topic.title}
      onPress={() => router.push(topic.href)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <IconPlate icon={topic.icon} />
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
      subtitle="Comprendre pourquoi une course compte — ou pas — et faire valoir tes droits."
    >
      <View style={styles.list}>
        <Text style={styles.sectionLabel}>COMPRENDRE LES CALCULS</Text>
        {EXPLAIN_TOPICS.map((t) => (
          <NavCard key={t.key} topic={t} />
        ))}
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
