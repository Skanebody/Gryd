/**
 * GRYD — barre de réactions GRYD custom (AMENDEMENT-07 §8). Rend les réactions
 * DÉJÀ posées sur une entrée (feed/chat) sous forme de chips icône + compteur,
 * plus un bouton « + » qui déplie la palette des 8 réactions (icônes du set
 * partagé, JAMAIS d'emojis). État local uniquement (démo) : taper une réaction
 * incrémente son compteur en mémoire. Tokens stricts, icônes filaires.
 */
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';
import {
  CREW_REACTIONS,
  CREW_REACTION_BY_KEY,
  type CrewReactionKey,
} from './feed';

interface ReactionBarProps {
  /** Compteurs initiaux par réaction (démo). */
  initial: Partial<Record<CrewReactionKey, number>>;
}

export function ReactionBar({ initial }: ReactionBarProps) {
  const [counts, setCounts] = useState<Partial<Record<CrewReactionKey, number>>>(initial);
  const [open, setOpen] = useState(false);

  const posted = useMemo(
    () => CREW_REACTIONS.filter((r) => (counts[r.key] ?? 0) > 0),
    [counts],
  );

  const react = (key: CrewReactionKey) => {
    haptics.light(); // réaction = haptic léger (doc §13, grammaire §25)
    setCounts((c) => ({ ...c, [key]: (c[key] ?? 0) + 1 }));
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.postedRow}>
        {posted.map((r) => (
          <Pressable
            key={r.key}
            accessibilityRole="button"
            accessibilityLabel={`Réaction ${r.label}`}
            onPress={() => react(r.key)}
            style={({ pressed }) => [styles.chip, pressed && styles.dim]}
          >
            <Icon name={CREW_REACTION_BY_KEY[r.key].icon} size={14} color={colors.blanc} />
            <Text style={styles.chipCount}>{counts[r.key]}</Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter une réaction"
          onPress={() => setOpen((o) => !o)}
          style={({ pressed }) => [styles.addBtn, pressed && styles.dim]}
        >
          <Icon name="plus" size={14} color={colors.gris} />
        </Pressable>
      </View>

      {open ? (
        <View style={styles.palette}>
          {CREW_REACTIONS.map((r) => (
            <Pressable
              key={r.key}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              onPress={() => react(r.key)}
              style={({ pressed }) => [styles.paletteItem, pressed && styles.dim]}
            >
              <Icon name={r.icon} size={18} color={colors.blanc} />
              <Text style={styles.paletteLabel}>{r.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: 0.6 },
  wrap: { marginTop: 10 },
  postedRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipCount: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  palette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    backgroundColor: colors.carbone2,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 12,
  },
  paletteItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paletteLabel: { color: colors.blanc, fontSize: fontSizes.xs, letterSpacing: 0.2 },
});
