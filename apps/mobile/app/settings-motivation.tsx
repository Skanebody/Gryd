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

const STYLE_ORDER: PlayStyle[] = ['focus_solo', 'mixte', 'crew_war'];
const STYLE_ICON: Record<PlayStyle, 'aujourdhui' | 'crew' | 'cible'> = {
  focus_solo: 'aujourdhui',
  mixte: 'crew',
  crew_war: 'cible',
};
const VISIBILITY_OPTS: { value: ProfileVisibility; label: string }[] = (
  ['private', 'friends', 'crew', 'public'] as ProfileVisibility[]
).map((v) => ({ value: v, label: PROFILE_VISIBILITY_LABELS[v] }));
const ACTIVITY_OPTS: { value: ActivitySharing; label: string }[] = (
  ['private', 'friends', 'crew', 'stats_only'] as ActivitySharing[]
).map((v) => ({ value: v, label: ACTIVITY_SHARING_LABELS[v] }));
const MAP_OPTS: { value: MapSharing; label: string }[] = (
  ['precise', 'simplified', 'territory_only', 'none'] as MapSharing[]
).map((v) => ({ value: v, label: MAP_SHARING_LABELS[v] }));
const NOTIF_ORDER: NotifChannel[] = ['solo', 'crew', 'competition', 'off'];

export default function SettingsMotivationScreen() {
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

  return (
    <StackScreen title="Motivation" icon="reglages" subtitle="Comment GRYD s'adapte à toi.">
      <Section label="STYLE DE JEU">
        {STYLE_ORDER.map((s) => (
          <OptionCard
            key={s}
            title={PLAY_STYLE_LABELS[s].title}
            subtitle={PLAY_STYLE_LABELS[s].subtitle}
            icon={STYLE_ICON[s]}
            selected={prefs.playStyle === s}
            onPress={() => void update({ playStyle: s })}
          />
        ))}
      </Section>

      <Section label="CLASSEMENTS VISIBLES">
        <Text style={styles.note}>
          Adaptés à ton style. Ceux qui te ressemblent apparaissent ; les autres restent masqués.
        </Text>
        <View style={styles.levels}>
          {LEADERBOARD_LEVELS.map((lvl) => {
            const on = visibleLevels.includes(lvl);
            return (
              <View key={lvl} style={[styles.levelChip, on && styles.levelChipOn]}>
                <Text style={[styles.levelText, on && styles.levelTextOn]}>
                  {LEADERBOARD_LABELS[lvl]}
                </Text>
              </View>
            );
          })}
        </View>
      </Section>

      <Section label="NOTIFICATIONS">
        <View style={styles.pillsWrap}>
          {NOTIF_ORDER.map((ch) => (
            <TogglePill
              key={ch}
              label={NOTIF_CHANNEL_LABELS[ch].title}
              on={prefs.notifChannels.includes(ch)}
              onPress={() =>
                void update({ notifChannels: toggleNotifChannel(prefs.notifChannels, ch) })
              }
            />
          ))}
        </View>
        <Text style={styles.note}>
          {prefs.notifChannels.includes('off')
            ? NOTIF_CHANNEL_LABELS.off.subtitle
            : 'Tu reçois seulement ce qui compte pour toi. Jamais de rappel culpabilisant.'}
        </Text>
      </Section>

      <Section label="PROFIL VISIBLE PAR">
        <SelectPills
          options={VISIBILITY_OPTS}
          value={prefs.profileVisibility}
          onChange={(v) => void update({ profileVisibility: v })}
        />
      </Section>

      <Section label="PARTAGE D'ACTIVITÉ">
        <SelectPills
          options={ACTIVITY_OPTS}
          value={prefs.activitySharing}
          onChange={(v) => void update({ activitySharing: v })}
        />
      </Section>

      <Section label="TRACE SUR LA CARTE">
        <SelectPills
          options={MAP_OPTS}
          value={prefs.mapSharing}
          onChange={(v) => void update({ mapSharing: v })}
        />
        <Text style={styles.note}>Ta position en direct n'est jamais partagée.</Text>
      </Section>

      <Section label="RETOURS HAPTIQUES">
        <SwitchRow
          title="Retours haptiques"
          subtitle="Vibrations légères sur les captures, badges et victoires."
          value={hapticsOn}
          onValueChange={(v) => {
            setHapticsOn(v);
            setHapticsEnabled(v);
          }}
        />
      </Section>

      <Section label="MODE DISCRET">
        <SwitchRow
          title="Rester discret"
          subtitle="Hors des classements globaux, profil limité, partage au choix. Un droit, pas un recul."
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
  levels: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  levelChip: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    opacity: 0.5,
  },
  levelChipOn: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse14, opacity: 1 },
  levelText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },
  levelTextOn: { color: colors.blanc },
  pillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
