/**
 * GRYD — CARD COURSE compacte de l'Historique (AMENDEMENT-17 CHANTIER 3,
 * AMENDEMENT-25 §2). « Une course = un effort + un impact territorial » +
 * l'APERÇU DU TRACÉ : en-tête = miniature du parcours + icône de type + nom +
 * zone + date ; 1 ligne effort (km · durée · allure) ; 1 ligne impact (chips
 * variés) ; 1 pastille Verify + CTA [Voir détail]. Le détail (tracé 2D/3D +
 * calcul) est au tap (route course/[id]). Anti-shame : un refus s'affiche
 * factuellement, jamais en rouge criard — la pastille `statsonly` reste grise,
 * `rejected` réservé au seul cas vraiment écarté. La miniature réutilise
 * `RunTraceThumb` (même projection nette que le détail) — un aperçu, jamais une
 * card-dans-card (AMENDEMENT-22 : c'est un visuel posé, sans surface propre).
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { StatePill, type GameVisualState } from '../../ui/game';
import { RunTraceThumb } from './RunLoopMap';
import { runTrace } from './demoRuns';
import {
  fmtDuration,
  fmtKm,
  fmtPace,
  VERIFY_LABELS,
  type RunHistoryEntry,
} from './demo';

/** Accent/icône d'en-tête par type de course (vocabulaire varié CHANTIER 3). */
const KIND_META: Record<
  RunHistoryEntry['kind'],
  { icon: import('@klaim/shared').IconName; tint: string }
> = {
  conquest: { icon: 'cible', tint: gameColors.crew },
  defense: { icon: 'bouclier', tint: gameColors.verify },
  route: { icon: 'route', tint: gameColors.crew },
  stats: { icon: 'performance', tint: colors.gris },
};

/** Mappe le statut Verify d'une course vers une pastille d'état de jeu. */
function verifyPill(entry: RunHistoryEntry): { state: GameVisualState; label: string } {
  if (entry.refusal === 'speed_incoherent') {
    return { state: 'rejected', label: 'Refusé' };
  }
  if (entry.verify === 'verified') return { state: 'verified', label: VERIFY_LABELS.verified };
  if (entry.verify === 'partial') return { state: 'contested', label: VERIFY_LABELS.partial };
  return { state: 'statsonly', label: VERIFY_LABELS.statsonly };
}

interface RunHistoryCardProps {
  entry: RunHistoryEntry;
  onPress: () => void;
}

export const RunHistoryCard = memo(function RunHistoryCard({
  entry,
  onPress,
}: RunHistoryCardProps) {
  const kind = KIND_META[entry.kind];
  const pill = verifyPill(entry);
  const trace = runTrace(entry.id);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${fmtKm(entry.km)}, voir le détail`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* En-tête : aperçu du tracé + type + nom + zone + horodatage */}
      <View style={styles.head}>
        {trace ? (
          <RunTraceThumb trace={trace} />
        ) : (
          <View style={[styles.iconWrap, { borderColor: kind.tint }]}>
            <Icon name={kind.icon} size={18} color={kind.tint} />
          </View>
        )}
        <View style={styles.headText}>
          <View style={styles.nameRow}>
            <Icon name={kind.icon} size={14} color={kind.tint} />
            <Text style={styles.name} numberOfLines={2}>
              {entry.name}
            </Text>
          </View>
          {/* Lieu et date sur deux lignes : jamais tronqué par « … » (règle 9). */}
          <Text style={styles.area} numberOfLines={1}>
            {entry.area}
          </Text>
          <Text style={styles.when} numberOfLines={1}>
            {entry.when}
          </Text>
        </View>
      </View>

      {/* Effort : distance · durée · allure */}
      <View style={styles.effortRow}>
        <Text style={styles.effortMain}>{fmtKm(entry.km)}</Text>
        <Text style={styles.effortDot}>·</Text>
        <Text style={styles.effort}>{fmtDuration(entry.durationS)}</Text>
        <Text style={styles.effortDot}>·</Text>
        <Text style={styles.effort}>{fmtPace(entry.paceSPerKm)}</Text>
      </View>

      {/* Impact : chips variés (déjà mis en forme) */}
      <View style={styles.chipsRow}>
        {entry.impactChips.map((chip, i) => (
          <View
            key={chip}
            style={[styles.chip, i === 0 && entry.refusal === null && styles.chipGain]}
          >
            <Text
              style={[
                styles.chipText,
                i === 0 && entry.refusal === null && styles.chipTextGain,
              ]}
              numberOfLines={1}
            >
              {chip}
            </Text>
          </View>
        ))}
      </View>

      {/* Pied : pastille Verify + [Voir détail] */}
      <View style={styles.foot}>
        <StatePill state={pill.state} label={pill.label} />
        <View style={styles.detailCta}>
          <Text style={styles.detailText}>Voir détail</Text>
          <Icon name="chevron" size={14} color={colors.blanc} />
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    gap: 10,
  },
  pressed: { opacity: 0.85 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  headText: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  area: { color: colors.gris, fontSize: fontSizes.xs },
  // colors.gris EST déjà la couleur atténuée : l'opacity 0.7 en plus faisait
  // tomber la date sous le contraste AA. Le gris seul suffit (contraste préservé).
  when: { color: colors.gris, fontSize: fontSizes.xs },
  effortRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  effortMain: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  effort: { color: colors.gris, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] },
  effortDot: { color: colors.gris, fontSize: fontSizes.sm },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipGain: { borderColor: gameColors.crew, backgroundColor: colors.chartreuse14 },
  chipText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  chipTextGain: { color: gameColors.crew },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  detailCta: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
});
