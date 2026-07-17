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
import { colors, fontSizes, gameColors, radii, sizes, spacing, typography } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Card } from '../src/ui/Card';
import { StackScreen } from '../src/ui/StackScreen';
import { useSession } from '../src/lib/session';
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
  realUser,
}: {
  active: HistoryFilter;
  onSelect: (f: HistoryFilter) => void;
  realUser: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
    >
      {HISTORY_FILTERS.map((f) => {
        const selected = f.key === active;
        // Vrai user : aucune source de courses réelle câblée (O1) → compteurs à 0
        // (jamais de faux total). Démo showcase (web/dev sans session) inchangée.
        const count = realUser ? 0 : countByFilter(f.key);
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
  // Activation O1 : aucune source de courses RÉELLE n'est encore câblée. Un vrai
  // utilisateur (session) ne voit donc PAS de fausses courses passées — liste
  // vide honnête. La démo ne sert que le showcase (web/dev sans session).
  const { session, configured } = useSession();
  const realUser = configured && !!session;

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
  // Gate session : vrai user → vide (pas de source réelle) ; showcase → démo.
  const list = realUser ? [] : runsByFilter(filter);
  const total = realUser ? 0 : countByFilter(filter);

  return (
    <StackScreen
      title="Historique"
      icon="historique"
      kicker="TES COURSES"
      subtitle="Tous tes parcours : le tracé, l’effort et ce qu’il a changé sur le terrain."
    >
      <FilterBar active={filter} onSelect={selectFilter} realUser={realUser} />

      <Text style={styles.sectionLabel}>
        {`${total} COURSE${total > 1 ? 'S' : ''}`}
      </Text>

      {list.length === 0 ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyText}>
            {realUser
              ? 'Tes courses apparaîtront ici après ta première capture. Lance-toi !'
              : 'Aucune course dans ce filtre pour l’instant.'}
          </Text>
        </Card>
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
    gap: spacing.xs,
    minHeight: sizes.touchTarget, // plancher tactile 44 (P1 : chips étaient ~37 px)
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    paddingHorizontal: spacing.md,
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
    ...typography.kicker,
    color: colors.gris,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },
  pressed: { opacity: 0.75 },
  // Card fournit fond/rayon/padding (sans contour, règle 80/20) : on ne garde que le centrage.
  empty: { alignItems: 'center' },
  emptyText: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },
});
