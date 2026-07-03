/**
 * GRYD — onglet Classement (placeholder MVP, GRYD_prompt_pages_ux §7).
 * Classement ANCRÉ sur ma position — jamais un top-100 anonyme : podium,
 * puis ma fenêtre de rangs, et l'écart vers le rang supérieur traduit en
 * hexes neutres (POINTS_NEUTRAL_HEX, aucune constante en dur).
 * Le CTA pour courir est le disque COURIR global du layout.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CITIES,
  POINTS_NEUTRAL_HEX,
  SEASON_DURATION_WEEKS,
  colors,
  fontSizes,
  radii,
  spacing,
} from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';

interface LeaderboardEntry {
  rank: number;
  pseudo: string;
  crew: string;
  points: number;
  me?: boolean;
}

/** Données factices crédibles — MA ligne est l'ancre (rang 8, cf. maquette « 8ᵉ · PARIS »). */
const ME: LeaderboardEntry = { rank: 8, pseudo: 'KORO', crew: 'LES FOULÉES 9³', points: 4210, me: true };

const PODIUM: readonly LeaderboardEntry[] = [
  { rank: 1, pseudo: 'SPRINTEUSE·88', crew: 'CREW NORD·XI', points: 9480 },
  { rank: 2, pseudo: 'K.RUNNER', crew: 'LES PAVÉS 12', points: 8102 },
  { rank: 3, pseudo: 'MOLOKAÏ', crew: 'CREW NORD·XI', points: 7645 },
];

const AROUND_ME: readonly LeaderboardEntry[] = [
  { rank: 6, pseudo: 'JOG.PARMENTIER', crew: 'BPM BASTILLE', points: 4780 },
  { rank: 7, pseudo: 'LENA_RUN', crew: 'LES PAVÉS 12', points: 4552 },
  ME,
  { rank: 9, pseudo: 'PACER·20E', crew: 'CREW NORD·XI', points: 4188 },
  { rank: 10, pseudo: 'TOUTDROIT', crew: 'BPM BASTILLE', points: 3901 },
];

/** Écart vers le rang supérieur, converti en hexes neutres (comparaison directive §7). */
const rankAbove = AROUND_ME.find((entry) => entry.rank === ME.rank - 1);
const gapPoints = rankAbove ? rankAbove.points - ME.points : 0;
const gapHexes = Math.ceil(gapPoints / POINTS_NEUTRAL_HEX);

function Row({ entry }: { entry: LeaderboardEntry }) {
  return (
    <View style={[styles.row, entry.me === true && styles.rowMe]}>
      <Text style={[styles.rank, entry.me === true && styles.rankMe]}>{entry.rank}</Text>
      <View style={styles.rowInfo}>
        <Text style={[styles.pseudo, entry.me === true && styles.pseudoMe]}>
          {entry.pseudo}
          {entry.me === true ? '  · toi' : ''}
        </Text>
        <Text style={styles.crew}>{entry.crew}</Text>
      </View>
      <Text style={styles.points}>{formatInt(entry.points)}</Text>
    </View>
  );
}

export default function ClassementScreen() {
  useEffect(() => {
    screen('classement');
  }, []);

  return (
    <TabScreen
      title="Classement"
      kicker={`SAISON 0 · SEMAINE 2/${SEASON_DURATION_WEEKS}`}
      subtitle={`Joueurs · ${CITIES.paris.name}`}
    >
      <View style={styles.list}>
        {PODIUM.map((entry) => (
          <Row key={entry.rank} entry={entry} />
        ))}
        <Text style={styles.ellipsis}>···</Text>
        {AROUND_ME.map((entry) => (
          <Row key={entry.rank} entry={entry} />
        ))}
      </View>

      {/* Comparaison avec le rang supérieur — directive, pas décorative */}
      {rankAbove ? (
        <View style={styles.gapCard}>
          <Text style={styles.gapTitle}>
            {formatInt(gapPoints)} points te séparent du {rankAbove.rank}ᵉ rang.
          </Text>
          <Text style={styles.gapBody}>
            ≈ {gapHexes} hexes neutres — une seule course peut suffire. Le bouton est juste en
            dessous.
          </Text>
        </View>
      ) : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 22 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.noir, // invisible : réserve la place pour la bordure de MA ligne
    marginBottom: 4,
  },
  rowMe: {
    backgroundColor: colors.carbone,
    borderColor: colors.chartreuse40, // §C.3 (1) : moi sur le classement
  },
  rank: {
    width: 34,
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rankMe: { color: colors.chartreuse },
  rowInfo: { flex: 1 },
  pseudo: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500', letterSpacing: 0.4 },
  pseudoMe: { fontWeight: '700' },
  crew: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2, letterSpacing: 0.4 },
  points: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  ellipsis: {
    color: colors.gris,
    fontSize: fontSizes.md,
    textAlign: 'center',
    paddingVertical: 2,
    letterSpacing: 3,
  },
  gapCard: {
    marginTop: 18,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  gapTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: -0.2 },
  gapBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 6,
  },
});
