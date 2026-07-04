/**
 * GRYD — onglet League : le classement devient une SCÈNE de jeu (AMENDEMENT-08
 * §7, doc §17). Header saison/semaine + PARIS LEAGUE, PODIUM top 3 en marches
 * (LeagueMedal), ligne TOI STICKY en bas (« #8 KORO · 342 pts du #7 · ≈ 35
 * hexes neutres peuvent suffire » — formulation POSITIVE, l'écart est DÉRIVÉ
 * via POINTS_NEUTRAL_HEX), récompenses Top 10 en RewardCards, 6 onglets démo
 * (Joueurs / Crews / Ville / France / Pionniers / Performance) et RankUpCard
 * animé quand un rang a été GAGNÉ. Anti-shame AMENDEMENT-07 : jamais
 * « dernier/lent » ; mode discret → bandeau explicatif au lieu du rang global.
 */
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CITIES,
  POINTS_NEUTRAL_HEX,
  SEASON_DURATION_WEEKS,
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
} from '@klaim/shared';
import { useMotivationPrefs } from '../../src/features/motivation/store';
import {
  RUN_BUTTON_BOTTOM,
  RUN_BUTTON_SIZE,
  TAB_CONTENT_BOTTOM_CLEARANCE,
} from '../../src/features/nav/metrics';
import { MY_SOCIAL_PROFILE } from '../../src/features/social/demo';
import {
  LEAGUE_BOARDS,
  LEAGUE_RANK_UP,
  LEAGUE_SEASON_WEEK,
  TOP10_REWARDS,
  type LeagueBoard,
  type LeagueRow,
  type LeagueTabId,
} from '../../src/features/social/league';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { screen } from '../../src/lib/analytics';
import { Icon } from '../../src/ui/Icon';
import { formatInt } from '../../src/ui/format';
import {
  CrewCrest,
  LeagueMedal,
  PlayerAvatarFrame,
  RankUpCard,
  RewardCard,
  useSlideIn,
} from '../../src/ui/game';

/** Ancre : MA ligne du board Joueurs (rang 8, cf. maquette « 8ᵉ · PARIS »). */
const JOUEURS_BOARD = LEAGUE_BOARDS.find((b) => b.id === 'joueurs') ?? LEAGUE_BOARDS[0]!;
const ME_ROW = JOUEURS_BOARD.rows.find((r) => r.me === true);
const ABOVE_ROW = ME_ROW
  ? JOUEURS_BOARD.rows.find((r) => r.rank === ME_ROW.rank - 1)
  : undefined;
/** Écart vers le rang supérieur, converti en hexes neutres (directive §17). */
const GAP_POINTS = ME_ROW && ABOVE_ROW ? ABOVE_ROW.value - ME_ROW.value : 0;
const GAP_HEXES = Math.ceil(GAP_POINTS / POINTS_NEUTRAL_HEX);

/** Hauteur réservée à la ligne TOI sticky (au-dessus du disque COURIR). */
const TOI_BAR_CLEARANCE = 96;

/** Visuel de rang : avatar joueur / blason crew / hex ville. */
function RowVisual({ row, board, big = false }: {
  row: LeagueRow;
  board: LeagueBoard;
  big?: boolean;
}) {
  if (board.kind === 'crew') {
    return (
      <CrewCrest
        seed={row.crewSeed ?? row.name}
        name={row.name}
        size={big ? 'l' : 's'}
        tint={row.me === true ? gameColors.crew : colors.blanc}
      />
    );
  }
  if (board.kind === 'city') {
    return (
      <View style={[styles.cityHex, big && styles.cityHexBig, row.me === true && styles.cityHexMe]}>
        {/* Contre-rotation : la boîte est un losange, l'icône reste droite */}
        <View style={styles.cityIcon}>
          <Icon name="pin" size={big ? 24 : 16} color={row.me === true ? gameColors.crew : colors.blanc} />
        </View>
      </View>
    );
  }
  return <PlayerAvatarFrame name={row.name} size={big ? 'l' : 's'} isMe={row.me === true} />;
}

/** Suffixe « toi » adapté à la nature du board (jamais de honte, juste l'ancre). */
function meSuffix(board: LeagueBoard): string {
  if (board.kind === 'crew') return ' · ton crew';
  if (board.kind === 'city') return ' · ta ville';
  return ' · toi';
}

/** PODIUM top 3 en marches : #2 / #1 (plus haut) / #3, médailles intégrées. */
function Podium({ board }: { board: LeagueBoard }) {
  const slide = useSlideIn(14);
  const first = board.rows.find((r) => r.rank === 1);
  const second = board.rows.find((r) => r.rank === 2);
  const third = board.rows.find((r) => r.rank === 3);
  const cols: { row: LeagueRow | undefined; step: number }[] = [
    { row: second, step: 56 },
    { row: first, step: 84 },
    { row: third, step: 42 },
  ];
  return (
    <Animated.View
      style={[styles.podium, { opacity: slide.opacity, transform: [{ translateY: slide.translateY }] }]}
    >
      {cols.map((c, i) =>
        c.row ? (
          <View key={c.row.rank} style={styles.podiumCol}>
            <RowVisual row={c.row} board={board} big={c.row.rank === 1} />
            <Text style={styles.podiumName} numberOfLines={1}>
              {c.row.name}
            </Text>
            <Text style={styles.podiumValue}>{formatInt(c.row.value)}</Text>
            <View style={[styles.podiumStep, { height: c.step }]}>
              <LeagueMedal rank={c.row.rank} size={40} />
            </View>
          </View>
        ) : (
          <View key={`vide-${i}`} style={styles.podiumCol} />
        ),
      )}
    </Animated.View>
  );
}

/** Ligne de classement standard (rangs 4+), MA ligne ancrée chartreuse. */
function BoardRow({ row, board }: { row: LeagueRow; board: LeagueBoard }) {
  return (
    <>
      {row.gapBefore === true ? <Text style={styles.ellipsis}>···</Text> : null}
      <View style={[styles.row, row.me === true && styles.rowMe]}>
        <Text style={[styles.rank, row.me === true && styles.rankMe]}>{row.rank}</Text>
        <RowVisual row={row} board={board} />
        <View style={styles.rowInfo}>
          <Text
            style={[styles.rowName, row.me === true && styles.rowNameMe]}
            numberOfLines={1}
          >
            {row.name}
            {row.me === true ? meSuffix(board) : ''}
          </Text>
          {row.sub ? (
            <Text style={styles.rowSub} numberOfLines={1}>
              {row.sub}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowValueWrap}>
          <Text style={styles.rowValue}>{formatInt(row.value)}</Text>
          <Text style={styles.rowValueLabel}>{board.valueLabel}</Text>
        </View>
      </View>
    </>
  );
}

export default function LeagueScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { prefs } = useMotivationPrefs();
  const [tabId, setTabId] = useState<LeagueTabId>('joueurs');

  useEffect(() => {
    screen('classement');
  }, []);

  const discreet = prefs.discreetMode;
  const board = LEAGUE_BOARDS.find((b) => b.id === tabId) ?? JOUEURS_BOARD;
  // Mode discret §10.3 : je n'apparais JAMAIS dans un leaderboard global.
  const rows = discreet ? board.rows.filter((r) => r.me !== true) : board.rows;
  const listRows = rows.filter((r) => r.rank > 3);
  const showToi = !discreet && ME_ROW !== undefined;
  const inTop10 = !discreet && ME_ROW !== undefined && ME_ROW.rank <= 10;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom:
              insets.bottom + TAB_CONTENT_BOTTOM_CLEARANCE + (showToi ? TOI_BAR_CLEARANCE : 0),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header saison — SAISON 0 · SEMAINE 2/8 + PARIS LEAGUE (doc §17) */}
        <Text style={styles.kicker}>
          SAISON 0 · SEMAINE {LEAGUE_SEASON_WEEK}/{SEASON_DURATION_WEEKS}
        </Text>
        <View style={styles.titleRow}>
          <Icon name="classement" size={24} color={colors.blanc} />
          <Text style={styles.title}>{CITIES.paris.name.toUpperCase()} LEAGUE</Text>
        </View>

        {/* Rang GAGNÉ cette semaine (célébration) — ou bandeau mode discret */}
        {discreet ? (
          <View style={styles.discreetBanner}>
            <Icon name="discret" size={18} color={colors.blanc} />
            <View style={styles.discreetBody}>
              <Text style={styles.discreetTitle}>Mode discret actif</Text>
              <Text style={styles.discreetText}>
                Ton rang n'apparaît pas dans les classements publics. Ta progression reste
                visible pour toi, dans ton profil.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.rankUpWrap}>
            <RankUpCard
              fromRank={LEAGUE_RANK_UP.fromRank}
              toRank={LEAGUE_RANK_UP.toRank}
              leagueLabel={`${CITIES.paris.name} League`}
              points={LEAGUE_RANK_UP.points}
              onShare={() => toast.show('Share card prête — à toi de jouer')}
            />
          </View>
        )}

        {/* Onglets démo — Joueurs / Crews / Ville / France / Pionniers / Performance */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
          contentContainerStyle={styles.tabsContent}
        >
          {LEAGUE_BOARDS.map((b) => (
            <Pressable
              key={b.id}
              accessibilityRole="button"
              accessibilityLabel={`Classement ${b.label}`}
              accessibilityState={{ selected: b.id === tabId }}
              onPress={() => {
                setTabId(b.id);
                screen(`classement_${b.id}`);
              }}
              style={({ pressed }) => [
                styles.tab,
                b.id === tabId && styles.tabActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.tabLabel, b.id === tabId && styles.tabLabelActive]}>
                {b.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* PODIUM top 3 — remonté à chaque changement d'onglet (key) */}
        <Podium key={board.id} board={board} />

        {/* Rangs 4+ */}
        <View style={styles.list}>
          {listRows.map((row) => (
            <BoardRow key={`${board.id}-${row.rank}`} row={row} board={board} />
          ))}
        </View>

        {/* Récompenses Top 10 (doc §17) */}
        <View style={styles.sectionHead}>
          <Icon name="cadeau" size={14} color={colors.gris} />
          <Text style={styles.sectionLabel}>RÉCOMPENSES TOP 10 · FIN DE SAISON</Text>
        </View>
        {inTop10 ? (
          <Text style={styles.top10Hint}>
            Tu es #{ME_ROW!.rank} — dans le Top 10. Tiens ton rang jusqu'au reset.
          </Text>
        ) : null}
        <View style={styles.rewardList}>
          {TOP10_REWARDS.map((r) => (
            <RewardCard
              key={r.label}
              icon={r.icon}
              label={r.label}
              sublabel={r.sublabel}
              state="inprogress"
            />
          ))}
        </View>
      </ScrollView>

      {/* Ligne TOI sticky — toujours visible, formulation POSITIVE (§17) */}
      {showToi ? (
        <View
          style={[
            styles.toiBar,
            { bottom: insets.bottom + RUN_BUTTON_BOTTOM + RUN_BUTTON_SIZE + 14 },
          ]}
        >
          <View style={styles.toiTop}>
            <Text style={styles.toiRank}>#{ME_ROW!.rank}</Text>
            <Text style={styles.toiName} numberOfLines={1}>
              {MY_SOCIAL_PROFILE.displayName} · toi
            </Text>
            {ABOVE_ROW ? (
              <Text style={styles.toiGap}>
                {formatInt(GAP_POINTS)} pts du #{ABOVE_ROW.rank}
              </Text>
            ) : null}
          </View>
          {ABOVE_ROW ? (
            <Text style={styles.toiHint}>
              ≈ {GAP_HEXES} zones neutres peuvent suffire — le prochain run peut le faire.
            </Text>
          ) : null}
        </View>
      ) : null}

      <ToastHost state={toast} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: spacing.cardPadding },
  pressed: { opacity: 0.7 },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: colors.blanc, fontSize: fontSizes.xl, fontWeight: '700', letterSpacing: -0.5 },

  rankUpWrap: { marginTop: 16 },

  // ── Bandeau mode discret (AMENDEMENT-07 §10.3) ──
  discreetBanner: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  discreetBody: { flex: 1 },
  discreetTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  discreetText: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 4,
  },

  // ── Onglets ──
  tabs: { marginTop: 18, marginHorizontal: -spacing.cardPadding },
  tabsContent: { paddingHorizontal: spacing.cardPadding, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  tabActive: { backgroundColor: colors.carbone2, borderColor: colors.blanc },
  tabLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.4 },
  tabLabelActive: { color: colors.blanc, fontWeight: '600' },

  // ── Podium en marches ──
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  podiumCol: { flex: 1, alignItems: 'center', gap: 4 },
  podiumName: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 4,
    maxWidth: '100%',
  },
  podiumValue: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
  podiumStep: {
    alignSelf: 'stretch',
    marginTop: 6,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    alignItems: 'center',
    paddingTop: 6,
  },

  // ── Lignes 4+ ──
  list: { marginTop: 4 },
  ellipsis: {
    color: colors.gris,
    fontSize: fontSizes.md,
    textAlign: 'center',
    paddingVertical: 2,
    letterSpacing: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.noir, // invisible : réserve la place pour la bordure de MA ligne
    marginBottom: 4,
  },
  rowMe: { backgroundColor: colors.carbone, borderColor: colors.chartreuse40 },
  rank: {
    width: 30,
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rankMe: { color: colors.chartreuse },
  rowInfo: { flex: 1 },
  rowName: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500', letterSpacing: 0.4 },
  rowNameMe: { fontWeight: '700' },
  rowSub: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2, letterSpacing: 0.4 },
  rowValueWrap: { alignItems: 'flex-end' },
  rowValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rowValueLabel: { color: colors.gris, fontSize: 10, letterSpacing: 0.4 },

  // ── Visuel ville (hex pin) ──
  cityHex: {
    width: 32,
    height: 32,
    borderRadius: 9,
    transform: [{ rotate: '45deg' }],
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityHexBig: { width: 56, height: 56, borderRadius: 16 },
  cityHexMe: { borderColor: colors.chartreuse40 },
  cityIcon: { transform: [{ rotate: '-45deg' }] },

  // ── Récompenses Top 10 ──
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  top10Hint: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    marginBottom: 10,
    lineHeight: fontSizes.sm * 1.5,
  },
  rewardList: { gap: 8 },

  // ── Ligne TOI sticky ──
  toiBar: {
    position: 'absolute',
    left: spacing.cardPadding,
    right: spacing.cardPadding,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  toiTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toiRank: {
    color: colors.chartreuse,
    fontSize: fontSizes.md,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  toiName: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  toiGap: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.3,
  },
  toiHint: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 5,
    lineHeight: fontSizes.xs * 1.5,
  },
});
