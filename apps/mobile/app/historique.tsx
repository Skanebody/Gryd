/**
 * GRYD — HISTORIQUE (AMENDEMENT-17 CHANTIER 3, AMENDEMENT-25 §2) : « l'utilisateur
 * doit retrouver TOUS ses parcours » avec, par course, un APERÇU DU TRACÉ + ses
 * stats clés (temps · distance · allure · zones). Filtres en tête
 * (Tout/Conquêtes/Défenses/Routes/Stats only) puis la LISTE COMPLÈTE des courses
 * du filtre — PAS de troncature de liste (AMENDEMENT-25 §2 : plus de fold « 3
 * dernières / Voir tout »). Le détail d'une course (tracé 2D/3D + calcul) est au
 * tap (route course/[id]). Aucune valeur de jeu calculée ici : la liste est le
 * miroir déterministe des runs/claims déjà décidés serveur
 * (features/history/demo). Analytics : screen('historique').
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';
import { RunHistoryCard } from '../src/features/history/RunHistoryCard';
import {
  countByFilter,
  HISTORY_FILTERS,
  runsByFilter,
  type HistoryFilter,
} from '../src/features/history/demo';

/** Barre de filtres horizontale (Tout/Conquêtes/Défenses/Routes/Stats only). */
function FilterBar({
  active,
  onSelect,
}: {
  active: HistoryFilter;
  onSelect: (f: HistoryFilter) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
    >
      {HISTORY_FILTERS.map((f) => {
        const selected = f.key === active;
        const count = countByFilter(f.key);
        return (
          <Pressable
            key={f.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`Filtre ${f.label}, ${count} courses`}
            onPress={() => onSelect(f.key)}
            style={({ pressed }) => [
              styles.filterChip,
              selected && styles.filterChipOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.filterLabel, selected && styles.filterLabelOn]}>
              {f.label}
            </Text>
            <Text style={[styles.filterCount, selected && styles.filterCountOn]}>
              {count}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function HistoriqueScreen() {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  useEffect(() => {
    screen('historique');
  }, []);

  const selectFilter = (f: HistoryFilter) => {
    if (f === filter) return;
    haptics.light();
    setFilter(f);
  };

  const openRun = (id: string) => {
    haptics.light();
    router.push(`/course/${id}`);
  };

  // AMENDEMENT-25 §2 : la LISTE COMPLÈTE du filtre — plus de fold « 3 dernières ».
  const list = runsByFilter(filter);
  const total = countByFilter(filter);

  return (
    <StackScreen
      title="Historique"
      icon="historique"
      kicker="TES COURSES"
      subtitle="Tous tes parcours : le tracé, l’effort et ce qu’il a changé sur le terrain."
    >
      <FilterBar active={filter} onSelect={selectFilter} />

      <Text style={styles.sectionLabel}>
        {`${total} COURSE${total > 1 ? 'S' : ''}`}
      </Text>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Aucune course dans ce filtre pour l’instant.</Text>
        </View>
      ) : (
        <View style={styles.list}>
          {list.map((entry) => (
            <RunHistoryCard key={entry.id} entry={entry} onPress={() => openRun(entry.id)} />
          ))}
        </View>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  filterBar: { gap: 8, paddingVertical: 4, paddingRight: 4 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  filterChipOn: { borderColor: gameColors.crew, backgroundColor: colors.chartreuse14 },
  filterLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  filterLabelOn: { color: gameColors.crew },
  filterCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  filterCountOn: { color: gameColors.crew },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 22,
    marginBottom: 12,
  },
  list: { gap: 12 },
  pressed: { opacity: 0.75 },
  empty: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    alignItems: 'center',
  },
  emptyText: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },
});
