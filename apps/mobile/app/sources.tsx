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
import { colors, fontSizes, gameColors, iconSizes, radii, sizes, spacing } from '@klaim/shared';
import { C } from '../src/i18n/catalog/auth';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
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

/** Libellés courts des états non connectables (chips neutres) — Entries i18n. */
const STATUS_CHIP_LABELS: Record<string, Entry> = {
  needs_keys: C.chipNeedsKeys,
  needs_dev_build: C.chipNeedsDevBuild,
  coming_soon: C.chipSoon,
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
  const t = useT();
  const isNative = source.availability === 'native';
  const status = isNative ? 'native' : snapshot?.status;
  const active = isNative || status === 'connected';
  const trustHigh = source.trust === 'high';
  const statusChipEntry = status ? STATUS_CHIP_LABELS[status] : undefined;

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
          <Text style={styles.statusChipText}>{t(C.statusActive)}</Text>
        </View>
      ) : status === 'connected' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.disconnectA11y, { name: source.name })}
          accessibilityState={{ busy }}
          disabled={busy}
          onPress={onDisconnect}
          style={({ pressed }) => [styles.statusChip, (pressed || busy) && styles.pressed]}
        >
          <Text style={styles.statusChipText}>
            {busy ? t(C.statusDisconnecting) : t(C.statusConnected)}
          </Text>
        </Pressable>
      ) : status === 'disconnected' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.connectA11y, { name: source.name })}
          disabled={busy}
          onPress={onConnect}
          style={({ pressed }) => [
            styles.connectBtn,
            (pressed || busy) && styles.pressed,
          ]}
        >
          <Text style={styles.connectLabel}>{busy ? t(C.connectBusy) : t(C.connectCta)}</Text>
        </Pressable>
      ) : status ? (
        <View style={styles.soonChip}>
          <Text style={styles.soonChipText}>{statusChipEntry ? t(statusChipEntry) : status}</Text>
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
  const t = useT();
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
    } catch {
      // Filet UI (garantie AMENDEMENT-15 §3 « jamais d'exception vers l'UI »,
      // tenue AUSSI ici) : état honnête, CTA re-tentable, jamais de crash.
      setSnapshots((prev) => ({
        ...prev,
        [key]: {
          status: 'disconnected',
          lastSync: null,
          detail: t(C.connectFailed),
        },
      }));
    } finally {
      setBusyKey(null);
    }
  };

  const disconnect = async (key: string) => {
    const adapter = SOURCE_ADAPTERS[key];
    if (!adapter || busyKey) return; // même garde anti double-tap que connect()
    haptics.light();
    setBusyKey(key);
    try {
      const snap = await adapter.disconnect();
      setSnapshots((prev) => ({ ...prev, [key]: snap }));
    } catch {
      // Filet UI symétrique de connect() (AMENDEMENT-15 §3 « jamais d'exception
      // vers l'UI ») : la déconnexion a échoué → la source RESTE connectée,
      // message honnête, action re-tentable, aucun crash.
      setSnapshots((prev) => ({
        ...prev,
        [key]: {
          status: 'connected',
          lastSync: prev[key]?.lastSync ?? null,
          detail: t(C.disconnectFailed),
        },
      }));
    } finally {
      setBusyKey(null);
    }
  };

  const verifySources = VERIFY_SOURCES.filter((s) => s.availability !== 'soon');
  const soonSources = VERIFY_SOURCES.filter((s) => s.availability === 'soon');

  return (
    <StackScreen title="GRYD Verify Hub" icon="radar" kicker={t(C.sourcesKicker)}>
      {/* Entête (AMENDEMENT-10 §6) — le bleu verify = état de confiance. */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="radar" size={iconSizes.lg} color={gameColors.verify} />
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroStrong}>{t(C.sourcesHeroStrong)}</Text>
          <Text style={styles.heroLine}>{t(C.sourcesHeroLine)}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t(C.sectionVerified)}</Text>
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

      <Text style={styles.sectionLabel}>{t(C.sectionSoon)}</Text>
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

      <Text style={styles.footnote}>{t(C.sourcesFootnote)}</Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    marginTop: spacing.xs,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.control,
    borderWidth: 1.5,
    borderColor: gameColors.verify,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: { flex: 1, gap: spacing.xxs },
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
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },
  // ── Ligne source ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.md,
  },
  // Recul VISUEL des sources « à venir » sans crever le contraste AA du texte :
  // 0.66 faisait tomber le gris 12 px sous 4,5:1. La chip d'état (« Bientôt » /
  // « Dev build requis ») porte déjà le signal — 0.85 suffit à reculer la card.
  cardSoon: { opacity: 0.85 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.control,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  body: { flex: 1, gap: spacing.xxs },
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  statusChipText: { color: gameColors.verify, fontSize: fontSizes.xs, fontWeight: '700' },
  connectBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  connectLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  soonChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  soonChipText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  pressed: { opacity: 0.75 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.lg,
  },
});
