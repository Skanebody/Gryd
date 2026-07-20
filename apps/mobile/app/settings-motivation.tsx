/**
 * GRYD — Motivation Settings (AMENDEMENT-07 §8, motivation §21). Style de jeu,
 * classements visibles, canaux de notif, visibilité/partage et mode discret.
 * Écran POUSSÉ. Chaque changement est persisté localement (store) et pilote le
 * FILTRAGE UI/notifs, jamais le gameplay (§1). Les classements visibles sont
 * DÉRIVÉS du style + mode discret (rules.leaderboardVisibility, miroir engine) —
 * pas saisis à la main. Anti-shame : le mode discret est présenté comme un droit,
 * pas un aveu de faiblesse. Aucun nombre magique.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  LEADERBOARD_LEVELS,
  colors,
  fontSizes,
  radii,
  spacing,
  type ActivitySharing,
  type MapSharing,
  type PlayStyle,
  type ProfileVisibility,
} from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { getHapticsEnabled, setHapticsEnabled } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';
import {
  OptionCard,
  Section,
  SelectPills,
  SwitchRow,
  TogglePill,
} from '../src/features/motivation/ui';
import {
  ACTIVITY_SHARING_LABELS,
  LEADERBOARD_LABELS,
  MAP_SHARING_LABELS,
  NOTIF_CHANNEL_LABELS,
  PLAY_STYLE_LABELS,
  PROFILE_VISIBILITY_LABELS,
} from '../src/features/motivation/labels';
import { leaderboardVisibility } from '../src/features/motivation/rules';
import {
  toggleNotifChannel,
  useMotivationPrefs,
  type NotifChannel,
} from '../src/features/motivation/store';
import { C } from '../src/i18n/catalog/motivation';
import { useT } from '../src/i18n/store';

const STYLE_ORDER: PlayStyle[] = ['focus_solo', 'mixte', 'crew_war'];
const STYLE_ICON: Record<PlayStyle, 'aujourdhui' | 'crew' | 'cible'> = {
  focus_solo: 'aujourdhui',
  mixte: 'crew',
  crew_war: 'cible',
};
// Ordres à MODULE SCOPE (structure) — les libellés sont résolus à l'affichage.
const VISIBILITY_ORDER: ProfileVisibility[] = ['private', 'friends', 'crew', 'public'];
const ACTIVITY_ORDER: ActivitySharing[] = ['private', 'friends', 'crew', 'stats_only'];
const MAP_ORDER: MapSharing[] = ['precise', 'simplified', 'territory_only', 'none'];
const NOTIF_ORDER: NotifChannel[] = ['solo', 'crew', 'competition', 'off'];

export default function SettingsMotivationScreen() {
  const t = useT();
  const { prefs, update } = useMotivationPrefs();
  // Retours haptiques : réglage global (src/lib/haptics), défaut activé.
  const [hapticsOn, setHapticsOn] = useState(true);

  useEffect(() => {
    screen('motivation_settings');
  }, []);

  useEffect(() => {
    let alive = true;
    void getHapticsEnabled().then((value) => {
      if (alive) setHapticsOn(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Classements visibles = dérivés (§10.2/§10.3), pas un réglage libre.
  const visibleLevels = leaderboardVisibility(prefs.playStyle, prefs.discreetMode);

  // Options des pastilles : ordre module + libellé résolu dans la langue courante.
  const visibilityOpts = VISIBILITY_ORDER.map((v) => ({
    value: v,
    label: t(PROFILE_VISIBILITY_LABELS[v]),
  }));
  const activityOpts = ACTIVITY_ORDER.map((v) => ({
    value: v,
    label: t(ACTIVITY_SHARING_LABELS[v]),
  }));
  const mapOpts = MAP_ORDER.map((v) => ({ value: v, label: t(MAP_SHARING_LABELS[v]) }));

  return (
    <StackScreen title={t(C.motivationTitle)} icon="reglages" subtitle={t(C.motivationSubtitle)}>
      <Section label={t(C.sectionPlayStyle)}>
        {STYLE_ORDER.map((s) => (
          <OptionCard
            key={s}
            title={t(PLAY_STYLE_LABELS[s].title)}
            subtitle={t(PLAY_STYLE_LABELS[s].subtitle)}
            icon={STYLE_ICON[s]}
            selected={prefs.playStyle === s}
            onPress={() => void update({ playStyle: s })}
          />
        ))}
      </Section>

      <Section label={t(C.sectionLeaderboards)}>
        <Text style={styles.note}>{t(C.leaderboardsNote)}</Text>
        <View style={styles.levels}>
          {LEADERBOARD_LEVELS.map((lvl) => {
            const on = visibleLevels.includes(lvl);
            return (
              <View key={lvl} style={[styles.levelChip, on && styles.levelChipOn]}>
                <View style={[styles.levelDot, on && styles.levelDotOn]} />
                <Text style={[styles.levelText, on && styles.levelTextOn]}>
                  {t(LEADERBOARD_LABELS[lvl])}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>

      <Section label={t(C.sectionNotifs)}>
        <View style={styles.pillsWrap}>
          {NOTIF_ORDER.map((ch) => (
            <TogglePill
              key={ch}
              label={t(NOTIF_CHANNEL_LABELS[ch].title)}
              on={prefs.notifChannels.includes(ch)}
              onPress={() =>
                void update({ notifChannels: toggleNotifChannel(prefs.notifChannels, ch) })
              }
            />
          ))}
        </View>
        <Text style={styles.note}>
          {prefs.notifChannels.includes('off')
            ? t(NOTIF_CHANNEL_LABELS.off.subtitle)
            : t(C.notifsNote)}
        </Text>
      </Section>

      <Section label={t(C.sectionProfileVisible)}>
        <SelectPills
          options={visibilityOpts}
          value={prefs.profileVisibility}
          onChange={(v) => void update({ profileVisibility: v })}
        />
      </Section>

      <Section label={t(C.sectionActivitySharing)}>
        <SelectPills
          options={activityOpts}
          value={prefs.activitySharing}
          onChange={(v) => void update({ activitySharing: v })}
        />
      </Section>

      <Section label={t(C.sectionMapTrace)}>
        <SelectPills
          options={mapOpts}
          value={prefs.mapSharing}
          onChange={(v) => void update({ mapSharing: v })}
        />
        <Text style={styles.note}>{t(C.mapTraceNote)}</Text>
      </Section>

      <Section label={t(C.sectionHaptics)}>
        <SwitchRow
          title={t(C.hapticsTitle)}
          subtitle={t(C.hapticsSubtitle)}
          value={hapticsOn}
          onValueChange={(v) => {
            setHapticsOn(v);
            setHapticsEnabled(v);
          }}
        />
      </Section>

      <Section label={t(C.sectionDiscreet)}>
        <SwitchRow
          title={t(C.discreetTitle)}
          subtitle={t(C.discreetSubtitle)}
          icon="discret"
          value={prefs.discreetMode}
          onValueChange={(v) => void update({ discreetMode: v })}
        />
      </Section>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 10,
  },
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: 14,
    opacity: 0.5,
  },
  // Affichage DÉRIVÉ (lecture seule), pas un toggle : le point chartreuse marque « visible »,
  // le libellé atténué « masqué ». Volontairement sans bordure chartreuse pour ne pas imiter
  // les pastilles interactives (Notifications / Profil) de la même page (audit P2 clarté).
  levelChipOn: { opacity: 1 },
  levelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.grisLigne },
  levelDotOn: { backgroundColor: colors.chartreuse },
  levelText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },
  levelTextOn: { color: colors.blanc },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
