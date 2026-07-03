/**
 * GRYD — GRYD VERIFY HUB (AMENDEMENT-08 §10, doc §21 ; remplace la page
 * « Sources connectées » trop settings). Écran POUSSÉ depuis Profil→Paramètres
 * ET Performance. « Connecte tes sources. GRYD vérifie l'effort réel. Seules
 * les courses vérifiées capturent. » Chaque source = `SourceTrustCard`
 * (statut, trust, rôle, capture éligible vs stats only). Connexions DÉMO
 * locales (toggle en mémoire) — branchements réels TODO(O2). Aucune valeur de
 * jeu ici, c'est de la donnée d'affichage (features/sources/catalog).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { SourceTrustCard } from '../src/ui/game';
import { VERIFY_SOURCES, type VerifySourceDef } from '../src/features/sources/catalog';

/** Rendu d'une source avec son statut DÉMO courant + action connecter/gérer. */
function SourceRow({
  source,
  connected,
  onToggle,
}: {
  source: VerifySourceDef;
  connected: boolean;
  onToggle: () => void;
}) {
  const status = connected ? 'connected' : source.status;
  return (
    <SourceTrustCard
      name={source.name}
      icon={source.icon}
      status={status}
      trust={source.trust}
      role={source.role}
      capture={source.capture}
      actionLabel={
        source.actionLabel === undefined
          ? undefined
          : status === 'connected'
            ? 'Gérer'
            : 'Connecter'
      }
      onAction={source.actionLabel === undefined ? undefined : onToggle}
    />
  );
}

export default function SourcesScreen() {
  useEffect(() => {
    screen('sources');
  }, []);

  /** Connexions DÉMO : surcouche locale par-dessus le statut du catalogue. */
  const [demoConnected, setDemoConnected] = useState<Record<string, boolean>>({});

  const isConnected = (s: VerifySourceDef) =>
    demoConnected[s.key] ?? s.status === 'connected';

  const toggle = (s: VerifySourceDef) => {
    // TODO(O2) : OAuth Strava/WHOOP…, HealthKit, Health Connect (Activity Hub §13).
    if (isConnected(s)) {
      if (__DEV__) console.log(`[verify-hub] manage ${s.key} — TODO(O2)`);
      return; // « Gérer » : rien à câbler en démo.
    }
    haptics.light();
    setDemoConnected((prev) => ({ ...prev, [s.key]: true }));
  };

  const captureSources = VERIFY_SOURCES.filter((s) => s.capture === 'verified');
  const statsSources = VERIFY_SOURCES.filter((s) => s.capture === 'statsonly');

  return (
    <StackScreen title="GRYD Verify Hub" icon="radar" kicker="GRYD VERIFY HUB">
      {/* Message hub (doc §21) — le bleu verify est l'état de confiance, pas une déco. */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="radar" size={22} color={gameColors.verify} />
        </View>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroLine}>Connecte tes sources.</Text>
          <Text style={styles.heroLine}>GRYD vérifie l'effort réel.</Text>
          <Text style={styles.heroStrong}>Seules les courses vérifiées capturent.</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>CAPTURE ÉLIGIBLE</Text>
      <View style={styles.list}>
        {captureSources.map((source) => (
          <SourceRow
            key={source.key}
            source={source}
            connected={isConnected(source)}
            onToggle={() => toggle(source)}
          />
        ))}
      </View>

      <Text style={styles.sectionLabel}>STATS ONLY</Text>
      <View style={styles.list}>
        {statsSources.map((source) => (
          <SourceRow
            key={source.key}
            source={source}
            connected={isConnected(source)}
            onToggle={() => toggle(source)}
          />
        ))}
      </View>

      <Text style={styles.footnote}>
        GRYD Verify lit tes activités, vérifie leur fiabilité, déduplique les doublons, puis
        décide si elles peuvent capturer. Toutes les sources enrichissent ta performance —
        seul l'effort vérifié prend du territoire.
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
  heroLine: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.4 },
  heroStrong: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    lineHeight: fontSizes.sm * 1.4,
  },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 12,
  },
  list: { gap: 12 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 20,
  },
});
