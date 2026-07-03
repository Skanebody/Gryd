/**
 * GRYD — onglet War Room, scène stratégique (AMENDEMENT-08 §10, doc §15).
 * « L'écran le plus jeu » : À faire / Offensives / Défense / Routes / Scout
 * Reports / Coffre / Historique. Compose le design system jeu (ui/game) :
 * WarRoomObjectiveCard (offensive + défense urgente), WarEventCard (scout
 * reports + war log), ChestCard (coffre hebdo). GARDE les entrées AMENDEMENT-07
 * (Aujourd'hui / Challenges / Motivation) + Inbox / Arsenal. Compte à rebours
 * animé (tick 1 s). Données démo DÉTERMINISTES (features/warroom/demo) —
 * TODO(O1) brancher offensives / defense_missions / missions / crew_chests
 * (0010). Aucun nombre magique : seuils/paliers depuis @klaim/shared.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_CHEST_TIERS,
  CREW_CHEST_TIER_ORDER,
  CREW_CHEST_WEEKLY_TARGET,
  OFFENSIVE_DURATION_H,
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';
import {
  ChestCard,
  StatePill,
  WarEventCard,
  WarRoomObjectiveCard,
  type WarEventReaction,
} from '../../src/ui/game';
import { chestStateFor, CHEST_TIER_LABELS } from '../../src/features/crew/rules';
import { MY_CREW } from '../../src/features/crew/demo';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import {
  DEFENSE_MISSION,
  MISSIONS,
  OFFENSIVE,
  SCOUT_REPORTS,
  WAR_HISTORY,
  WAR_ROUTES,
  WAR_STATUS,
  type WarHistoryEventDemo,
} from '../../src/features/warroom/demo';

/** Décompte h:mm:ss depuis un total de secondes (mono, tabular-nums). */
function formatCountdown(totalS: number): string {
  const clamped = Math.max(0, totalS);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Compte à rebours ANIMÉ : tick chaque seconde (1000 ms = unité de temps,
 * pas une constante de jeu), plancher à 0. Info temporelle — reste actif
 * même en reduce motion (lisibilité, pas décoratif).
 */
function useCountdown(initialS: number): string {
  const [left, setLeft] = useState(initialS);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  return formatCountdown(left);
}

const MISSION_ICON: Record<string, IconName> = {
  quotidienne: 'mission',
  hebdomadaire: 'serie',
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

/** Accès rapide aux écrans motivation (AMENDEMENT-07 §8) — CONSERVÉS. */
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

/** Titre de section de scène : icône + libellé espacé (vocabulaire de jeu). */
function SectionHeader({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={15} color={colors.gris} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

/**
 * Événement d'historique avec réactions GRYD togglables localement (démo :
 * l'état vit dans le composant, deterministe au montage depuis demo.ts).
 */
function HistoryEvent({ event }: { event: WarHistoryEventDemo }) {
  const [reactions, setReactions] = useState<readonly WarEventReaction[]>(
    () => event.reactions.map((r) => ({ ...r })),
  );
  const toggle = (icon: IconName) => {
    setReactions((prev) =>
      prev.map((r) =>
        r.icon === icon
          ? { ...r, mine: !r.mine, count: Math.max(0, r.count + (r.mine ? -1 : 1)) }
          : r,
      ),
    );
  };
  return (
    <WarEventCard
      icon={event.icon}
      message={event.message}
      zone={event.zone}
      points={event.points}
      minutesAgo={event.minutesAgo}
      tint={gameColors[event.tint]}
      reactions={reactions}
      onReact={toggle}
    />
  );
}

export default function WarRoomScreen() {
  const toast = useToast();

  useEffect(() => {
    screen('war_room');
  }, []);

  // Offensive : progression + compte à rebours animé (seuils §38.3 côté shared).
  const offensivePct = OFFENSIVE.hexesTaken / OFFENSIVE.objectiveHexes;
  const offensiveTimeLeft = useCountdown(OFFENSIVE.remainingS);

  // Crew Chest : état/palier DÉRIVÉS de chestStateFor (source unique, identique
  // au Crew HQ) — réclamable dès le premier palier atteint (§39.2).
  const chestPct = MY_CREW.chestProgress / CREW_CHEST_WEEKLY_TARGET;
  const chest = chestStateFor(chestPct);
  const nextTier = CREW_CHEST_TIER_ORDER.find((t) => chestPct < CREW_CHEST_TIERS[t]);

  // Membre à assigner sur la défense (démo : premier rôle correspondant).
  const assignee = useMemo(
    () => MY_CREW.members.find((m) => m.role === DEFENSE_MISSION.assignedRole && !m.me),
    [],
  );

  const openMap = () => router.push('/(tabs)');

  return (
    <>
      <TabScreen
        title="War Room"
        icon="guerre"
        kicker={`${WAR_STATUS.seasonLabel} · J-${WAR_STATUS.daysLeft} · ${WAR_STATUS.city} · CREW #${WAR_STATUS.crewRank}`}
      >
        <HeaderActions />

        {/* Accès motivation (AMENDEMENT-07 §8) : Aujourd'hui, Challenges, réglages. */}
        <MotivationLinks />

        {/* À FAIRE — missions quotidienne / hebdo / crew (§7.12) */}
        <SectionHeader icon="mission" label="À FAIRE" />
        {MISSIONS.map((m) => {
          const done = m.progress >= m.target;
          return (
            <View key={m.key} style={styles.missionRow}>
              <View style={[styles.missionIcon, done && styles.missionIconDone]}>
                <Icon
                  name={MISSION_ICON[m.kind] ?? 'mission'}
                  size={18}
                  color={done ? gameColors.crew : colors.blanc}
                />
              </View>
              <View style={styles.missionInfo}>
                <Text style={styles.missionLabel}>{m.label}</Text>
                <Text style={styles.missionKind}>{m.kind.toUpperCase()}</Text>
                <View style={styles.missionGauge}>
                  <ProgressBar value={m.progress / m.target} height={6} />
                </View>
              </View>
              <Text style={[styles.missionCount, done && styles.missionCountDone]}>
                {m.progress}/{m.target}
              </Text>
            </View>
          );
        })}

        {/* OFFENSIVES — WarRoomObjectiveCard (doc §15 : République, +800 hexes) */}
        <SectionHeader icon="raid" label={`OFFENSIVES · ${OFFENSIVE_DURATION_H} H`} />
        <WarRoomObjectiveCard
          kicker="Offensive crew"
          zone={OFFENSIVE.zone}
          objective={`Objectif : +${formatInt(OFFENSIVE.objectiveHexes)} hexes — ${formatInt(OFFENSIVE.hexesTaken)} pris`}
          progress={offensivePct}
          timeLeft={offensiveTimeLeft}
          participants={{ current: OFFENSIVE.activeMembers, max: OFFENSIVE.totalMembers }}
          reward={OFFENSIVE.reward}
          state="active"
          icon="raid"
          joinLabel="Rejoindre"
          onJoin={() => {
            haptics.medium();
            toast.show(`Offensive rejointe — cap sur ${OFFENSIVE.zone}`);
          }}
          onOpenMap={openMap}
        />
        <View style={styles.contribRow}>
          <Text style={styles.contribLabel}>Ta contribution</Text>
          <Text style={styles.contribValue}>+{formatInt(OFFENSIVE.myHexes)} hexes</Text>
        </View>

        {/* DÉFENSE — urgence decay (doc §15 : 34 hexes / 48 h, zone Canal) */}
        <SectionHeader icon="bouclier" label="DÉFENSE" />
        <WarRoomObjectiveCard
          kicker="Défense urgente"
          zone={DEFENSE_MISSION.zone}
          objective={`${DEFENSE_MISSION.hexes} hexes expirent dans ${DEFENSE_MISSION.expiresInH} h — une course sur la zone les remet à l'abri.`}
          state="decay"
          icon="sablier"
          joinLabel="Défendre"
          onJoin={() => {
            haptics.medium();
            toast.show(`Défense lancée — zone ${DEFENSE_MISSION.zone}`);
          }}
          onOpenMap={openMap}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Assigner un membre à la défense"
          onPress={() => {
            haptics.light();
            toast.show(
              assignee
                ? `Défense proposée à ${assignee.pseudo}`
                : 'Défense proposée au crew',
            );
          }}
          style={({ pressed }) => [styles.assignBtn, pressed && styles.pressed]}
        >
          <Icon name="ajoutami" size={16} color={colors.blanc} />
          <Text style={styles.assignLabel}>
            {assignee ? `Assigner ${assignee.pseudo}` : 'Assigner un membre'}
          </Text>
        </Pressable>

        {/* ROUTES — 2 ouvertes, 1 à défendre (doc §7 « route ouverte ») */}
        <SectionHeader icon="route" label="ROUTES" />
        <View style={styles.routeList}>
          {WAR_ROUTES.map((route) => {
            const open = route.status === 'open';
            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={`Voir la route ${route.label} sur la carte`}
                onPress={openMap}
                style={({ pressed }) => [styles.routeRow, pressed && styles.pressed]}
              >
                <View
                  style={[
                    styles.routeIcon,
                    { borderColor: open ? gameColors.crew : gameColors.danger },
                  ]}
                >
                  <Icon name="route" size={16} color={open ? gameColors.crew : gameColors.danger} />
                </View>
                <View style={styles.routeInfo}>
                  <Text style={styles.routeLabel} numberOfLines={1}>
                    {route.label}
                  </Text>
                  <Text style={styles.routeMeta}>
                    {route.km.toLocaleString('fr-FR')} km
                    {route.expiresInH !== undefined ? ` · expire dans ${route.expiresInH} h` : ''}
                  </Text>
                </View>
                <StatePill
                  state={open ? 'active' : 'decay'}
                  label={open ? 'Route ouverte' : 'À défendre'}
                />
              </Pressable>
            );
          })}
        </View>

        {/* SCOUT REPORTS — renseignement agrégé par zone, jamais de position live */}
        <SectionHeader icon="scout" label="SCOUT REPORTS" />
        <View style={styles.eventList}>
          {SCOUT_REPORTS.map((report) => (
            <WarEventCard
              key={report.key}
              icon={report.icon}
              message={report.message}
              zone={`${report.zone} · scout ${report.scout}`}
              minutesAgo={report.minutesAgo}
              tint={gameColors[report.tint]}
              onPress={openMap}
            />
          ))}
        </View>

        {/* COFFRE — jauge hebdo compacte (paliers §39.2 depuis shared) */}
        <SectionHeader icon="coffre" label="COFFRE" />
        <ChestCard
          label={chest.tier ? `Coffre crew · ${CHEST_TIER_LABELS[chest.tier]}` : 'Coffre crew'}
          progress={chestPct}
          nextMilestone={
            nextTier
              ? `Prochain palier : ${CHEST_TIER_LABELS[nextTier]} à ${Math.round(CREW_CHEST_TIERS[nextTier] * 100)} % — ${formatInt(MY_CREW.chestProgress)} / ${formatInt(CREW_CHEST_WEEKLY_TARGET)} pts`
              : 'Palier max atteint cette semaine'
          }
          state={chest.state}
          onOpen={() => {
            toast.show('Coffre crew ouvert');
          }}
        />

        {/* HISTORIQUE — War Log (doc §13), réactions GRYD togglables */}
        <SectionHeader icon="historique" label="HISTORIQUE" />
        <View style={styles.eventList}>
          {WAR_HISTORY.map((event) => (
            <HistoryEvent key={event.key} event={event} />
          ))}
        </View>
      </TabScreen>
      <ToastHost state={toast} />
    </>
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 28,
    marginBottom: 12,
  },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2, fontWeight: '600' },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  missionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionIconDone: { borderColor: gameColors.crew },
  missionInfo: { flex: 1 },
  missionLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  missionKind: { color: colors.gris, fontSize: 10, marginTop: 2, letterSpacing: 0.8 },
  missionGauge: { marginTop: 8 },
  missionCount: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  missionCountDone: { color: gameColors.crew },
  contribRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  contribLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  contribValue: {
    color: gameColors.crew,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    marginTop: 10,
  },
  assignLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  routeList: { gap: 10 },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  routeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: gameColors.carbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfo: { flex: 1 },
  routeLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  routeMeta: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2, fontVariant: ['tabular-nums'] },
  eventList: { gap: 10 },
});
