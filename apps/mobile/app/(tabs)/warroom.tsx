/**
 * GRYD — onglet War Room (nouvel onglet, AMENDEMENT-06 §2, doc v3 §5/§38/§7.5).
 * Centralise « la prochaine meilleure action » : « À faire maintenant » (mission
 * de défense urgente), offensive 24 h en cours (jauge collective + décompte +
 * contribution perso), missions (quotidienne/hebdo/crew), Crew Chest hebdo
 * (paliers bronze→legend). Accès Inbox (cloche) + Arsenal depuis le bandeau
 * d'actions. Données démo DÉTERMINISTES (features/warroom/demo) — TODO(O1)
 * brancher offensives / defense_missions / missions / crew_chests (0010).
 * Aucun nombre magique : seuils/paliers viennent de @klaim/shared.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_CHEST_TIERS,
  CREW_CHEST_TIER_ORDER,
  CREW_CHEST_WEEKLY_TARGET,
  OFFENSIVE_DURATION_H,
  colors,
  fontSizes,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';
import { chestTierFor, CHEST_TIER_LABELS } from '../../src/features/crew/rules';
import { MY_CREW } from '../../src/features/crew/demo';
import { DEFENSE_MISSION, MISSIONS, OFFENSIVE } from '../../src/features/warroom/demo';

/** Décompte h:mm:ss depuis un total de secondes (démo figée, mono). */
function formatCountdown(totalS: number): string {
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const MISSION_ICON: Record<string, IconName> = {
  quotidienne: 'mission',
  hebdomadaire: 'mission',
  crew: 'crew',
};

/** Bandeau d'action haut (Inbox cloche + Arsenal) — §7.14/§7.11. */
function HeaderActions() {
  return (
    <View style={styles.actions}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir l'inbox"
        onPress={() => {
          // TODO(O1) : écran Inbox (vols/decay/récompenses/offensives §7.14).
          if (__DEV__) console.log('[warroom] inbox — écran à venir (O1)');
        }}
        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
      >
        <Icon name="cloche" size={20} color={colors.blanc} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ouvrir l'Arsenal"
        onPress={() => router.push('/arsenal')}
        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
      >
        <Icon name="boutique" size={20} color={colors.blanc} />
      </Pressable>
    </View>
  );
}

/** Accès rapide aux écrans motivation (AMENDEMENT-07 §8). Trois pastilles. */
function MotivationLinks() {
  const items: { label: string; icon: IconName; href: string }[] = [
    { label: "Aujourd'hui", icon: 'aujourdhui', href: '/aujourdhui' },
    { label: 'Challenges', icon: 'mission', href: '/challenges' },
    { label: 'Motivation', icon: 'reglages', href: '/settings-motivation' },
  ];
  return (
    <View style={styles.motivRow}>
      {items.map((it) => (
        <Pressable
          key={it.href}
          accessibilityRole="button"
          accessibilityLabel={it.label}
          onPress={() => router.push(it.href)}
          style={({ pressed }) => [styles.motivChip, pressed && styles.pressed]}
        >
          <Icon name={it.icon} size={18} color={colors.blanc} />
          <Text style={styles.motivLabel}>{it.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function WarRoomScreen() {
  useEffect(() => {
    screen('war_room');
  }, []);

  // Offensive : progression + résultat projeté (seuils §38.3 depuis shared).
  const offensivePct = OFFENSIVE.hexesTaken / OFFENSIVE.objectiveHexes;

  // Crew Chest : palier atteint + prochain palier (paliers §39.2 depuis shared).
  const chestPct = MY_CREW.chestProgress / CREW_CHEST_WEEKLY_TARGET;
  const chestTier = chestTierFor(MY_CREW.chestProgress);
  const nextTier = CREW_CHEST_TIER_ORDER.find((t) => chestPct < CREW_CHEST_TIERS[t]);

  return (
    <TabScreen title="War Room" icon="alerte" kicker="SAISON 0 · PARIS">
      <HeaderActions />

      {/* Accès motivation (AMENDEMENT-07 §8) : Aujourd'hui, Challenges, réglages. */}
      <MotivationLinks />

      {/* À FAIRE MAINTENANT — la mission la plus urgente (§5) */}
      <Text style={styles.sectionLabel}>À FAIRE MAINTENANT</Text>
      <View style={styles.urgentCard}>
        <View style={styles.urgentHead}>
          <Icon name="bouclier" size={18} color={colors.chartreuse} />
          <Text style={styles.urgentTitle}>Défends {DEFENSE_MISSION.zone}</Text>
        </View>
        <Text style={styles.urgentBody}>
          {DEFENSE_MISSION.hexes} hexes expirent dans {DEFENSE_MISSION.expiresInH} h. Une seule
          course sur la zone les remet à l'abri du decay.
        </Text>
      </View>

      {/* OFFENSIVE CREW 24 h — jauge collective + décompte + contribution perso */}
      <Text style={styles.sectionLabel}>OFFENSIVE CREW · {OFFENSIVE_DURATION_H} H</Text>
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Icon name="cible" size={18} color={colors.blanc} />
          <Text style={styles.cardTitle}>{OFFENSIVE.zone}</Text>
          <Text style={styles.countdown}>{formatCountdown(OFFENSIVE.remainingS)}</Text>
        </View>
        <View style={styles.gaugeRow}>
          <ProgressBar value={offensivePct} />
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaStrong}>{Math.round(offensivePct * 100)} %</Text>
          <Text style={styles.meta}>
            {formatInt(OFFENSIVE.hexesTaken)} / {formatInt(OFFENSIVE.objectiveHexes)} hexes ·{' '}
            {OFFENSIVE.activeMembers}/{OFFENSIVE.totalMembers} actifs
          </Text>
        </View>
        <View style={styles.contribRow}>
          <Text style={styles.contribLabel}>Ta contribution</Text>
          <Text style={styles.contribValue}>+{formatInt(OFFENSIVE.myHexes)} hexes</Text>
        </View>
      </View>

      {/* MISSIONS — quotidienne / hebdo / crew (§7.12 fusionnées ici) */}
      <Text style={styles.sectionLabel}>MISSIONS</Text>
      {MISSIONS.map((m) => (
        <View key={m.key} style={styles.missionRow}>
          <Icon name={MISSION_ICON[m.kind] ?? 'mission'} size={20} color={colors.blanc} />
          <View style={styles.missionInfo}>
            <Text style={styles.missionLabel}>{m.label}</Text>
            <Text style={styles.missionKind}>{m.kind}</Text>
            <View style={styles.missionGauge}>
              <ProgressBar value={m.progress / m.target} height={6} />
            </View>
          </View>
          <Text style={styles.missionCount}>
            {m.progress}/{m.target}
          </Text>
        </View>
      ))}

      {/* CREW CHEST hebdo — jauge + palier atteint / prochain (§39.2) */}
      <Text style={styles.sectionLabel}>CREW CHEST · CETTE SEMAINE</Text>
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Icon name="coffre" size={18} color={colors.blanc} />
          <Text style={styles.cardTitle}>
            {chestTier ? `Palier ${CHEST_TIER_LABELS[chestTier]}` : 'Pas encore de palier'}
          </Text>
          <Text style={styles.countdown}>{Math.round(chestPct * 100)} %</Text>
        </View>
        <View style={styles.gaugeRow}>
          <ProgressBar value={chestPct} />
        </View>
        <Text style={styles.meta}>
          {formatInt(MY_CREW.chestProgress)} / {formatInt(CREW_CHEST_WEEKLY_TARGET)} points collectifs
          {nextTier
            ? ` · prochain : ${CHEST_TIER_LABELS[nextTier]} à ${Math.round(CREW_CHEST_TIERS[nextTier] * 100)} %`
            : ' · palier max atteint'}
        </Text>
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  motivRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  motivChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    paddingHorizontal: 6,
  },
  motivLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 26,
    marginBottom: 12,
  },
  urgentCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40, // §C.3 (1) : l'action prioritaire = accent moi/urgent
    padding: spacing.cardPadding,
  },
  urgentHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: -0.2 },
  urgentBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { flex: 1, color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: -0.2 },
  countdown: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  gaugeRow: { marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  metaStrong: {
    color: colors.chartreuse,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  meta: { flex: 1, color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5, fontVariant: ['tabular-nums'] },
  contribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  contribLabel: { color: colors.gris, fontSize: fontSizes.sm },
  contribValue: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  missionRow: {
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
  missionInfo: { flex: 1 },
  missionLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  missionKind: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2, letterSpacing: 0.4 },
  missionGauge: { marginTop: 8 },
  missionCount: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
