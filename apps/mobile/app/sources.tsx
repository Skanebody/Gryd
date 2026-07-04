/**
 * GRYD — GRYD VERIFY HUB (AMENDEMENT-10 §6, copy trust par source). Écran
 * POUSSÉ depuis Profil→Paramètres ET Performance. Régime usage réel : sobre,
 * confiance. « Seules les courses vérifiées capturent. Les autres enrichissent
 * tes stats. » Chaque source = trust + chemin de vérification (« Capture
 * directe », « Import + vérif », « Vérification requise »), montres « Bientôt »
 * non connectables. Connexions DÉMO locales (toggle en mémoire) — branchements
 * réels TODO(O2). Aucune valeur de jeu ici (features/sources/catalog).
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import {
  TRUST_LABELS,
  VERIFY_SOURCES,
  type VerifySourceDef,
} from '../src/features/sources/catalog';

/** Ligne source vérifiable : nom, « Trust élevé · Capture directe », statut. */
function SourceRow({
  source,
  connected,
  onConnect,
}: {
  source: VerifySourceDef;
  connected: boolean;
  onConnect: () => void;
}) {
  const trustHigh = source.trust === 'high';
  return (
    <View style={styles.card}>
      <View
        style={[styles.iconWrap, connected && { borderColor: gameColors.verify }]}
      >
        <Icon
          name={source.icon}
          size={20}
          color={connected ? gameColors.verify : colors.gris}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {source.name}
        </Text>
        <Text style={styles.trustLine} numberOfLines={2}>
          <Text style={{ color: trustHigh ? gameColors.verify : colors.blanc }}>
            {source.trust ? TRUST_LABELS[source.trust] : ''}
          </Text>
          {source.path ? ` · ${source.path}` : ''}
        </Text>
      </View>
      {source.availability === 'native' || connected ? (
        <View style={styles.statusChip}>
          <Text style={styles.statusChipText}>
            {source.availability === 'native' ? 'Actif' : 'Connecté'}
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Connecter ${source.name}`}
          onPress={onConnect}
          style={({ pressed }) => [styles.connectBtn, pressed && styles.pressed]}
        >
          <Text style={styles.connectLabel}>Connecter</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Ligne « Bientôt » : montre non connectable pour l'instant — atténuée. */
function SoonRow({ source }: { source: VerifySourceDef }) {
  return (
    <View style={[styles.card, styles.cardSoon]}>
      <View style={styles.iconWrap}>
        <Icon name={source.icon} size={20} color={colors.gris} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, styles.nameSoon]} numberOfLines={1}>
          {source.name}
        </Text>
        <Text style={styles.trustLine} numberOfLines={1}>
          Non connectable
        </Text>
      </View>
      <View style={styles.soonChip}>
        <Text style={styles.soonChipText}>Bientôt</Text>
      </View>
    </View>
  );
}

export default function SourcesScreen() {
  useEffect(() => {
    screen('sources');
  }, []);

  /** Connexions DÉMO : surcouche locale par-dessus le statut du catalogue. */
  const [demoConnected, setDemoConnected] = useState<Record<string, boolean>>({});

  const isConnected = (s: VerifySourceDef) => demoConnected[s.key] ?? s.connected === true;

  const connect = (s: VerifySourceDef) => {
    // TODO(O2) : OAuth Strava, HealthKit, Health Connect (Activity Hub §13).
    haptics.light();
    setDemoConnected((prev) => ({ ...prev, [s.key]: true }));
  };

  const verifySources = VERIFY_SOURCES.filter((s) => s.availability !== 'soon');
  const soonSources = VERIFY_SOURCES.filter((s) => s.availability === 'soon');

  return (
    <StackScreen title="GRYD Verify Hub" icon="radar" kicker="GRYD VERIFY HUB">
      {/* Entête (AMENDEMENT-10 §6) — le bleu verify = état de confiance. */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="radar" size={22} color={gameColors.verify} />
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroStrong}>Seules les courses vérifiées capturent.</Text>
          <Text style={styles.heroLine}>Les autres enrichissent tes stats.</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>SOURCES VÉRIFIÉES</Text>
      <View style={styles.list}>
        {verifySources.map((source) => (
          <SourceRow
            key={source.key}
            source={source}
            connected={isConnected(source)}
            onConnect={() => connect(source)}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>BIENTÔT</Text>
      <View style={styles.list}>
        {soonSources.map((source) => (
          <SoonRow key={source.key} source={source} />
        ))}
      </View>

      <Text style={styles.footnote}>
        GRYD Verify lit tes activités, vérifie l'effort réel, déduplique les doublons, puis
        décide si elles peuvent capturer du territoire.
      </Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    marginTop: 8,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: gameColors.verify,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: { flex: 1, gap: 2 },
  heroStrong: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    lineHeight: fontSizes.sm * 1.4,
  },
  heroLine: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.4 },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 12,
  },
  list: { gap: 10 },
  // ── Ligne source ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
  },
  cardSoon: { opacity: 0.66 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  body: { flex: 1, gap: 3 },
  name: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  nameSoon: { color: colors.gris },
  trustLine: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  statusChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.verify,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  statusChipText: { color: gameColors.verify, fontSize: fontSizes.xs, fontWeight: '700' },
  connectBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  connectLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  soonChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  soonChipText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 20,
  },
});
