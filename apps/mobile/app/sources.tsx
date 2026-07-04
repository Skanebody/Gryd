/**
 * GRYD — GRYD VERIFY HUB (AMENDEMENT-10 §6 copy, AMENDEMENT-15 §3 statuts
 * RÉELS). Écran poussé depuis Profil→Paramètres ET Performance. « Seules les
 * courses vérifiées capturent. Les autres enrichissent tes stats. » Chaque
 * source affiche l'état HONNÊTE de son adaptateur (features/sources/adapters) :
 * Actif (GRYD Live, natif) · Connecté · Connecter (faisable maintenant) ·
 * Configuration requise (clés O7) · Dev build requis (O8) · Bientôt (programmes
 * partenaires — leurs courses arrivent déjà via Strava/Apple Health). Le CTA
 * Connecter n'est actif QUE quand la connexion est réellement faisable.
 * Aucune valeur de jeu ici : la décision capture/stats est 100 % serveur.
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
import { SOURCE_ADAPTERS } from '../src/features/sources/adapters/registry';
import type { SourceAdapterSnapshot } from '../src/features/sources/adapters/types';

/** Libellés FR courts des états non connectables (chips neutres). */
const STATUS_CHIP_LABELS: Record<string, string> = {
  needs_keys: 'Configuration requise',
  needs_dev_build: 'Dev build requis',
  coming_soon: 'Bientôt',
};

/** Ligne source : nom, « Trust élevé · Capture directe », statut RÉEL. */
function SourceRow({
  source,
  snapshot,
  busy,
  onConnect,
  onDisconnect,
}: {
  source: VerifySourceDef;
  snapshot: SourceAdapterSnapshot | undefined;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const isNative = source.availability === 'native';
  const status = isNative ? 'native' : snapshot?.status;
  const active = isNative || status === 'connected';
  const trustHigh = source.trust === 'high';

  return (
    <View style={[styles.card, status === 'coming_soon' && styles.cardSoon]}>
      <View style={[styles.iconWrap, active && { borderColor: gameColors.verify }]}>
        <Icon
          name={source.icon}
          size={20}
          color={active ? gameColors.verify : colors.gris}
        />
      </View>
      <View style={styles.body}>
        <Text
          style={[styles.name, status === 'coming_soon' && styles.nameSoon]}
          numberOfLines={1}
        >
          {source.name}
        </Text>
        <Text style={styles.trustLine} numberOfLines={2}>
          {source.trust ? (
            <Text style={{ color: trustHigh ? gameColors.verify : colors.blanc }}>
              {TRUST_LABELS[source.trust]}
            </Text>
          ) : null}
          {source.trust && source.path ? ` · ${source.path}` : source.path ?? ''}
        </Text>
        {/* Détail honnête (O7/O8/partenaires) — une phrase courte, jamais de blâme. */}
        {snapshot?.detail ? (
          <Text style={styles.detailLine} numberOfLines={2}>
            {snapshot.detail}
          </Text>
        ) : null}
      </View>

      {status === 'native' ? (
        <View style={styles.statusChip}>
          <Text style={styles.statusChipText}>Actif</Text>
        </View>
      ) : status === 'connected' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Déconnecter ${source.name}`}
          onPress={onDisconnect}
          style={({ pressed }) => [styles.statusChip, pressed && styles.pressed]}
        >
          <Text style={styles.statusChipText}>Connecté</Text>
        </Pressable>
      ) : status === 'disconnected' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Connecter ${source.name}`}
          disabled={busy}
          onPress={onConnect}
          style={({ pressed }) => [
            styles.connectBtn,
            (pressed || busy) && styles.pressed,
          ]}
        >
          <Text style={styles.connectLabel}>{busy ? 'Connexion…' : 'Connecter'}</Text>
        </Pressable>
      ) : status ? (
        <View style={styles.soonChip}>
          <Text style={styles.soonChipText}>{STATUS_CHIP_LABELS[status] ?? status}</Text>
        </View>
      ) : (
        // Statuts en cours de lecture (AsyncStorage) — placeholder neutre.
        <View style={styles.soonChip}>
          <Text style={styles.soonChipText}>…</Text>
        </View>
      )}
    </View>
  );
}

export default function SourcesScreen() {
  useEffect(() => {
    screen('sources');
  }, []);

  /** États RÉELS par source, lus des adaptateurs (AMENDEMENT-15 §3). */
  const [snapshots, setSnapshots] = useState<Record<string, SourceAdapterSnapshot>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const entries = await Promise.all(
        Object.values(SOURCE_ADAPTERS).map(async (adapter) => {
          const snap = await adapter.status();
          return [adapter.id, snap] as const;
        }),
      );
      if (mounted) setSnapshots(Object.fromEntries(entries));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const connect = async (key: string) => {
    const adapter = SOURCE_ADAPTERS[key];
    if (!adapter || busyKey) return;
    haptics.light();
    setBusyKey(key);
    try {
      const snap = await adapter.connect();
      setSnapshots((prev) => ({ ...prev, [key]: snap }));
    } finally {
      setBusyKey(null);
    }
  };

  const disconnect = async (key: string) => {
    const adapter = SOURCE_ADAPTERS[key];
    if (!adapter) return;
    haptics.light();
    const snap = await adapter.disconnect();
    setSnapshots((prev) => ({ ...prev, [key]: snap }));
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
            snapshot={snapshots[source.key]}
            busy={busyKey === source.key}
            onConnect={() => connect(source.key)}
            onDisconnect={() => disconnect(source.key)}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>BIENTÔT</Text>
      <View style={styles.list}>
        {soonSources.map((source) => (
          <SourceRow
            key={source.key}
            source={source}
            snapshot={snapshots[source.key]}
            busy={false}
            onConnect={() => {}}
            onDisconnect={() => {}}
          />
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
  detailLine: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.4,
  },
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
