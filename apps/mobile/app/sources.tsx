/**
 * GRYD — GRYD VERIFY HUB (AMENDEMENT-10 §6 copy, AMENDEMENT-15 §3 statuts
 * RÉELS). Écran poussé depuis Profil→Paramètres ET Performance. « Seules les
 * courses vérifiées capturent. Les autres enrichissent tes stats. »
 *
 * PÉRIMÈTRE 5 (21/07/2026) — deux décisions structurantes :
 *  1. la section « BIENTÔT » a DISPARU. L'écran ne liste plus que les sources
 *     réellement utilisables (catalog.ts documente les retirées et pourquoi) ;
 *  2. « Import GPX » est un VRAI import (fichier choisi → parse local →
 *     ingest_run), plus une démonstration de parseur déguisée en connexion.
 *
 * Chaque source affiche l'état HONNÊTE de son adaptateur : Actif (GRYD Live,
 * natif) · Importer / Connecter (faisable maintenant) · une phrase de résultat.
 * Aucune valeur de jeu ici : la décision capture/stats est 100 % serveur.
 *
 * Habillage aligné sur la page Confidentialité (référence visuelle des écrans de
 * réglages) : sur-titre de section commun, cards `carbone` cadrées `grisLigne`,
 * icône d'identité CHARTREUSE sur fond sombre, densité identique.
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
import { SectionLabel } from '../src/features/privacy/ui';
import {
  TRUST_LABELS,
  VERIFY_SOURCES,
  type VerifySourceDef,
} from '../src/features/sources/catalog';
import { SOURCE_ADAPTERS } from '../src/features/sources/adapters/registry';
import type { SourceAdapterSnapshot } from '../src/features/sources/adapters/types';

/**
 * Libellés courts des états NON actionnables (chips neutres) — Entries i18n.
 * `needs_keys` / `needs_dev_build` / `coming_soon` ne sont plus atteignables
 * depuis le catalogue actuel : la table reste complète pour qu'une source
 * re-listée s'affiche correctement dès la première ligne rajoutée.
 */
const STATUS_CHIP_LABELS: Record<string, Entry> = {
  app_only: C.chipAppOnly,
  needs_keys: C.chipNeedsKeys,
  needs_dev_build: C.chipNeedsDevBuild,
  coming_soon: C.chipSoon,
};

/** Ligne source : nom, « Trust élevé · Capture directe », statut RÉEL. */
function SourceRow({
  source,
  snapshot,
  busy,
  onAction,
  onDisconnect,
}: {
  source: VerifySourceDef;
  snapshot: SourceAdapterSnapshot | undefined;
  busy: boolean;
  onAction: () => void;
  onDisconnect: () => void;
}) {
  const t = useT();
  const isNative = source.availability === 'native';
  const status = isNative ? 'native' : snapshot?.status;
  const active = isNative || status === 'connected';
  const trustHigh = source.trust === 'high';
  const statusChipEntry = status ? STATUS_CHIP_LABELS[status] : undefined;
  // Une source à action PONCTUELLE (Import GPX) ne dit jamais « Connecter ».
  const isImport = source.action === 'import';

  // Phrase de détail : Entry traduite (nouveau chemin) ou `detail` legacy des
  // adaptateurs non listés. Jamais les deux.
  const detailText = snapshot?.detailEntry
    ? t(snapshot.detailEntry, snapshot.detailVars ?? {})
    : snapshot?.detail;

  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        {/* Icône d'identité CHARTREUSE (fond `carbon`, sombre) — même règle que
            la liste Paramètres. Le bleu `verify` reste réservé à l'ÉTAT actif. */}
        <Icon
          name={source.icon}
          size={iconSizes.md}
          color={active ? gameColors.verify : colors.chartreuse}
        />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {source.name}
        </Text>
        <Text style={styles.trustLine} numberOfLines={2}>
          <Text style={{ color: trustHigh ? gameColors.verify : colors.blanc }}>
            {TRUST_LABELS[source.trust]}
          </Text>
          {` · ${source.path}`}
        </Text>
        {/* Détail honnête (résultat du dernier import, indisponibilité…) — une
            phrase courte, jamais de blâme, jamais une promesse de capture. */}
        {detailText ? (
          <Text style={styles.detailLine} numberOfLines={2}>
            {detailText}
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
          accessibilityLabel={t(isImport ? C.importA11y : C.connectA11y, { name: source.name })}
          disabled={busy}
          onPress={onAction}
          style={({ pressed }) => [styles.actionBtn, (pressed || busy) && styles.pressed]}
        >
          <Text style={styles.actionLabel}>
            {busy
              ? t(isImport ? C.importBusy : C.connectBusy)
              : t(isImport ? C.importCta : C.connectCta)}
          </Text>
        </Pressable>
      ) : status ? (
        <View style={styles.soonChip}>
          <Text style={styles.soonChipText}>{statusChipEntry ? t(statusChipEntry) : status}</Text>
        </View>
      ) : (
        // Statut en cours de lecture — placeholder neutre.
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

  /** CTA principal d'une source : connexion durable OU import ponctuel. */
  const runAction = async (key: string) => {
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
        [key]: { status: 'disconnected', lastSync: null, detailEntry: C.connectFailed },
      }));
    } finally {
      setBusyKey(null);
    }
  };

  const disconnect = async (key: string) => {
    const adapter = SOURCE_ADAPTERS[key];
    if (!adapter || busyKey) return; // même garde anti double-tap que runAction()
    haptics.light();
    setBusyKey(key);
    try {
      const snap = await adapter.disconnect();
      setSnapshots((prev) => ({ ...prev, [key]: snap }));
    } catch {
      // Filet UI symétrique : la déconnexion a échoué → la source RESTE
      // connectée, message honnête, action re-tentable, aucun crash.
      setSnapshots((prev) => ({
        ...prev,
        [key]: {
          status: 'connected',
          lastSync: prev[key]?.lastSync ?? null,
          detailEntry: C.disconnectFailed,
        },
      }));
    } finally {
      setBusyKey(null);
    }
  };

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

      <SectionLabel>{t(C.sectionVerified)}</SectionLabel>
      <View style={styles.list}>
        {VERIFY_SOURCES.map((source) => (
          <SourceRow
            key={source.key}
            source={source}
            snapshot={snapshots[source.key]}
            busy={busyKey === source.key}
            onAction={() => void runAction(source.key)}
            onDisconnect={() => void disconnect(source.key)}
          />
        ))}
      </View>

      {/* Pourquoi la liste est courte — dit franchement, sans « bientôt ». */}
      <Text style={styles.footnote}>{t(C.sourcesScopeNote)}</Text>
      <Text style={styles.footnote}>{t(C.sourcesFootnote)}</Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    marginTop: spacing.xs,
  },
  heroIcon: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
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
  list: { gap: 10 },
  // ── Ligne source (géométrie de card alignée sur Confidentialité) ──
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding - 2,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xxs },
  name: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
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
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  statusChipText: { color: gameColors.verify, fontSize: fontSizes.xs, fontWeight: '700' },
  actionBtn: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  actionLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  soonChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  soonChipText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.lg,
  },
});
