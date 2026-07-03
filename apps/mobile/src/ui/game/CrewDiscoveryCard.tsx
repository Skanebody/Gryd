/**
 * GRYD — CrewDiscoveryCard : crew à découvrir/rejoindre (AMENDEMENT-08 §1 &
 * §10, doc §16). Blason en grand, niveau · ville · ligue, tags de style de jeu
 * (teintes = états de jeu : guerre/défense/compétitif), places restantes,
 * rôles recherchés, CTA fort « Demander à rejoindre ».
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing, type BadgeTier } from '@klaim/shared';
import { CrewCrest } from './CrewCrest';

export type CrewPlayTag = 'war' | 'defense' | 'competitive';

/** Tag → libellé + teinte fonctionnelle (la couleur lit le style de JEU). */
const TAG_META: Record<CrewPlayTag, { label: string; tint: string }> = {
  war: { label: 'War Active', tint: gameColors.rival },
  defense: { label: 'Defense Active', tint: gameColors.verify },
  competitive: { label: 'Competitive', tint: gameColors.contested },
};

export interface CrewDiscoveryCardProps {
  name: string;
  /** Seed déterministe du blason (id du crew). */
  seed: string;
  level: number;
  city: string;
  /** Ligue du crew — frame du blason + libellé (« Race League »). */
  leagueTier: BadgeTier;
  leagueLabel: string;
  tags?: readonly CrewPlayTag[];
  members: { current: number; max: number };
  runsPerWeek?: number;
  /** Rôles recherchés (« Defender », « Raider »). */
  seeking?: readonly string[];
  onJoin?: () => void;
  onViewBase?: () => void;
}

export function CrewDiscoveryCard({
  name,
  seed,
  level,
  city,
  leagueTier,
  leagueLabel,
  tags,
  members,
  runsPerWeek,
  seeking,
  onJoin,
  onViewBase,
}: CrewDiscoveryCardProps) {
  const placesLeft = Math.max(0, members.max - members.current);
  const full = placesLeft === 0;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <CrewCrest seed={seed} name={name} size="l" leagueTier={leagueTier} tint={colors.blanc} />
        <View style={styles.headBody}>
          <Text style={styles.name} numberOfLines={1}>
            {name.toUpperCase()}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            Niv. {level} · {city} · {leagueLabel}
          </Text>
          {tags && tags.length > 0 ? (
            <View style={styles.tags}>
              {tags.map((t) => {
                const m = TAG_META[t];
                return (
                  <View key={t} style={[styles.tag, { borderColor: m.tint }]}>
                    <Text style={[styles.tagLabel, { color: m.tint }]}>{m.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <Text style={styles.stat}>
          {members.current} / {members.max} membres
        </Text>
        {runsPerWeek !== undefined ? (
          <Text style={styles.stat}>{runsPerWeek} runs / semaine</Text>
        ) : null}
        <Text style={[styles.stat, !full && styles.places]}>
          {full ? 'Complet' : `${placesLeft} place${placesLeft > 1 ? 's' : ''} restante${placesLeft > 1 ? 's' : ''}`}
        </Text>
      </View>

      {seeking && seeking.length > 0 ? (
        <Text style={styles.seeking} numberOfLines={1}>
          Recherche : {seeking.join(' / ')}
        </Text>
      ) : null}

      <View style={styles.ctas}>
        {onJoin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: full }}
            disabled={full}
            onPress={onJoin}
            style={({ pressed }) => [styles.primary, (pressed || full) && styles.dim]}
          >
            <Text style={styles.primaryLabel}>Demander à rejoindre</Text>
          </Pressable>
        ) : null}
        {onViewBase ? (
          <Pressable
            accessibilityRole="button"
            onPress={onViewBase}
            style={({ pressed }) => [styles.ghost, pressed && styles.dim]}
          >
            <Text style={styles.ghostLabel}>Voir la base</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: 12,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headBody: { flex: 1, gap: 4 },
  name: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800', letterSpacing: 0.5 },
  meta: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  tagLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  statsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  stat: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  places: { color: gameColors.crew },
  seeking: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  ctas: { gap: 8 },
  primary: {
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: gameColors.crew,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '700' },
  ghost: {
    height: 46,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  dim: { opacity: 0.6 },
});
