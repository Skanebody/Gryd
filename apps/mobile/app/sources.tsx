/**
 * GRYD — Sources connectées (AMENDEMENT-06 §4, doc v3 §13/§16). Écran POUSSÉ
 * depuis Profil→Paramètres ET Performance. Liste §16 exacte avec états (GRYD
 * Live GPS Actif · Apple Health Connecté · Health Connect Non connecté · Strava
 * Connecter · Garmin Bientôt · WHOOP Connecter pour Score Forme), textes par
 * source, et la règle « Toutes les sources enrichissent la performance. Seules
 * les activités vérifiées capturent. ». Connexions = stub TODO(O2). Aucune
 * valeur de jeu — c'est de la donnée d'affichage (features/sources/catalog).
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { GhostButton } from '../src/ui/GhostButton';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { SOURCES, type SourceDef } from '../src/features/sources/catalog';

/** Action stub par état (§16) — TODO(O2) branchements réels. */
function onManage(source: SourceDef) {
  // TODO(O2) : OAuth Strava/WHOOP, HealthKit, Health Connect (Activity Hub §13).
  if (__DEV__) console.log(`[sources] manage ${source.key} (${source.state}) — TODO(O2)`);
}

function SourceRow({ source }: { source: SourceDef }) {
  const isActive = source.state === 'active' || source.state === 'connected';
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Icon name="lien" size={20} color={isActive ? colors.chartreuse : colors.blanc} />
        <View style={styles.rowInfo}>
          <Text style={styles.name}>{source.name}</Text>
          <Text style={[styles.state, isActive && styles.stateOn]}>{source.stateLabel}</Text>
        </View>
      </View>
      <Text style={styles.desc}>{source.desc}</Text>
      <View style={styles.rowFooter}>
        {/* Chip de rôle : capture éligible vs performance seule (§15) */}
        <View style={styles.roleChip}>
          <Icon
            name={source.canCapture ? 'bouclier' : 'performance'}
            size={13}
            color={colors.gris}
          />
          <Text style={styles.roleChipText}>
            {source.canCapture ? 'Capture après vérif.' : 'Performance seule'}
          </Text>
        </View>
        {source.state === 'active' ? null : (
          <GhostButton
            label={
              source.state === 'connected'
                ? 'Gérer'
                : source.state === 'soon'
                  ? 'Bientôt'
                  : 'Connecter'
            }
            disabled={source.state === 'soon'}
            onPress={() => onManage(source)}
          />
        )}
      </View>
    </View>
  );
}

export default function SourcesScreen() {
  useEffect(() => {
    screen('sources');
  }, []);

  return (
    <StackScreen
      title="Sources connectées"
      icon="lien"
      kicker="ACTIVITY HUB"
      subtitle="Toutes les sources enrichissent la performance. Seules les activités vérifiées capturent du territoire."
    >
      <View style={styles.list}>
        {SOURCES.map((source) => (
          <SourceRow key={source.key} source={source} />
        ))}
      </View>
      <Text style={styles.footnote}>
        GRYD lit tes activités, vérifie leur fiabilité, déduplique les doublons, puis décide si
        elles peuvent capturer (§13). Fitbit, Polar, Coros et Suunto arrivent plus tard.
      </Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 16, gap: 12 },
  row: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: 0.2 },
  state: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3, marginLeft: 10 },
  stateOn: { color: colors.chartreuse },
  desc: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 10,
  },
  rowFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 14,
  },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roleChipText: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.2 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 20,
  },
});
