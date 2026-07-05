/**
 * GRYD — onglet League ACTIONNABLE (AMENDEMENT-17 §1.3). Un écran = une action :
 * l'essentiel (mon rang + l'écart + le rank-up émotionnel + le CTA) tient AU-
 * DESSUS du fold, sans scroll. Ordre :
 *   1. Ma ligne « #8 KORO · 342 pts du #7 · ≈ 35 zones peuvent suffire »
 *   2. Rank-up émotionnel juste après (« Tu entres dans le Top 10… »)
 *   3. CTA [Trouver une route] (JAMAIS un GO — la League envoie vers le planner)
 * Puis, en exploration : onglets RÉDUITS (Joueurs / Crews / Ville) + filtre
 * secondaire (Paris / France / Semaine / Saison) ; podium ; top 10 COMPACT (2
 * lignes visibles + « Voir tout »). L'écart en zones neutres est DÉRIVÉ via
 * POINTS_NEUTRAL_HEX — aucun barème local. Anti-shame : jamais « dernier/lent ».
 */
import { useEffect, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CITIES,
  POINTS_NEUTRAL_HEX,
  SEASON_DURATION_WEEKS,
  colors,
  elevation,
  fontSizes,
  gameColors,
  radii,
  spacing,
} from '@klaim/shared';
import { useMotivationPrefs } from '../../src/features/motivation/store';
import { TAB_CONTENT_BOTTOM_CLEARANCE } from '../../src/features/nav/metrics';
import { MY_SOCIAL_PROFILE } from '../../src/features/social/demo';
import {
  LEAGUE_BOARDS,
  LEAGUE_SEASON_WEEK,
  TOP10_REWARDS,
  type LeagueBoard,
  type LeagueRow,
} from '../../src/features/social/league';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { screen } from '../../src/lib/analytics';
import { Icon } from '../../src/ui/Icon';
import { formatInt } from '../../src/ui/format';
import {
  CrewCrest,
  InlineRunCTA,
  LeagueMedal,
  PlayerAvatarFrame,
  RewardCard,
  Segmented,
  useSlideIn,
} from '../../src/ui/game';

/** Onglets RÉDUITS (AMENDEMENT-17) : 3 natures au lieu de 6 onglets coupés. */
type PrimaryTab = 'joueurs' | 'crews' | 'ville';
/** Filtre secondaire : portée (Paris/France) + période (Semaine/Saison). */
type ScopeFilter = 'paris' | 'france';
type PeriodFilter = 'semaine' | 'saison';

const PRIMARY_TABS: readonly { id: PrimaryTab; label: string }[] = [
  { id: 'joueurs', label: 'Joueurs' },
  { id: 'crews', label: 'Crews' },
  { id: 'ville', label: 'Ville' },
];

/** Filtre portée (segmented) — n'apparaît que pour l'onglet Joueurs. */
const SCOPE_OPTIONS: readonly { id: ScopeFilter; label: string }[] = [
  { id: 'paris', label: 'Paris' },
  { id: 'france', label: 'France' },
];

/** Filtre période (segmented). */
const PERIOD_OPTIONS: readonly { id: PeriodFilter; label: string }[] = [
  { id: 'semaine', label: 'Semaine' },
  { id: 'saison', label: 'Saison' },
];

/** Boards indexés — le filtre France sur Joueurs bascule vers le board national. */
const BOARD = (id: string): LeagueBoard =>
  LEAGUE_BOARDS.find((b) => b.id === id) ?? LEAGUE_BOARDS[0]!;

/**
 * Résout le board selon onglet + portée. Joueurs·France → classement national ;
 * Crews/Ville n'ont qu'un board (la portée est indicative). Sans nombre magique :
 * on ne fait que router vers les boards démo existants.
 */
function resolveBoard(tab: PrimaryTab, scope: ScopeFilter): LeagueBoard {
  if (tab === 'joueurs') return BOARD(scope === 'france' ? 'france' : 'joueurs');
  if (tab === 'crews') return BOARD('crews');
  return BOARD('ville');
}

/** Ma ligne du board Joueurs·Paris = l'ancre du bloc « TOI » toujours en haut. */
const JOUEURS_BOARD = BOARD('joueurs');
const ME_ROW = JOUEURS_BOARD.rows.find((r) => r.me === true);
const ABOVE_ROW = ME_ROW
  ? JOUEURS_BOARD.rows.find((r) => r.rank === ME_ROW.rank - 1)
  : undefined;
/** Écart vers le rang supérieur, converti en zones neutres (directive §17). */
const GAP_POINTS = ME_ROW && ABOVE_ROW ? ABOVE_ROW.value - ME_ROW.value : 0;
const GAP_HEXES = Math.ceil(GAP_POINTS / POINTS_NEUTRAL_HEX);
const IN_TOP10 = ME_ROW !== undefined && ME_ROW.rank <= 10;

/** Combien de lignes hors podium montrer avant « Voir tout » (compact §1.3). */
const COMPACT_ROWS = 2;

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
  const [tab, setTab] = useState<PrimaryTab>('joueurs');
  const [scope, setScope] = useState<ScopeFilter>('paris');
  const [period, setPeriod] = useState<PeriodFilter>('saison');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    screen('classement');
  }, []);

  const discreet = prefs.discreetMode;
  const board = resolveBoard(tab, scope);
  // Mode discret §10.3 : je n'apparais JAMAIS dans un leaderboard global.
  const rows = discreet ? board.rows.filter((r) => r.me !== true) : board.rows;
  const listRows = rows.filter((r) => r.rank > 3);
  const visibleRows = showAll ? listRows : listRows.slice(0, COMPACT_ROWS);
  const hiddenCount = listRows.length - visibleRows.length;
  const showToi = !discreet && ME_ROW !== undefined && ABOVE_ROW !== undefined;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 18,
            paddingBottom: insets.bottom + TAB_CONTENT_BOTTOM_CLEARANCE,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header saison — SAISON 0 · SEMAINE 2/8 + PARIS LEAGUE (doc §17) */}
        <Text style={styles.kicker}>
          SAISON 0 · SEMAINE {LEAGUE_SEASON_WEEK}/{SEASON_DURATION_WEEKS}
        </Text>
        <View style={styles.titleRow}>
          <Icon name="classement" size={22} color={colors.blanc} />
          <Text style={styles.title}>{CITIES.paris.name.toUpperCase()} LEAGUE</Text>
        </View>

        {/* ── BLOC TOI EN HAUT (sans scroll) : rang + écart + rank-up + CTA ── */}
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
        ) : showToi ? (
          <View style={styles.toiCard}>
            {/* 1 · Mon rang + écart, formulation POSITIVE */}
            <View style={styles.toiTop}>
              <Text style={styles.toiRank}>#{ME_ROW!.rank}</Text>
              <Text style={styles.toiName} numberOfLines={1}>
                {MY_SOCIAL_PROFILE.displayName} · toi
              </Text>
              <Text style={styles.toiGap}>
                {formatInt(GAP_POINTS)} pts du #{ABOVE_ROW!.rank}
              </Text>
            </View>
            <Text style={styles.toiHint}>
              ≈ {GAP_HEXES} zones peuvent suffire — le prochain run peut le faire.
            </Text>

            {/* 2 · Rank-up ÉMOTIONNEL juste après le rang. Ligne LÉGÈRE posée sur
                la surface (plus de card-dans-card §1) : séparée par l'espace, pas
                par une boîte. Le seul contour de la scène reste celui du bloc. */}
            {IN_TOP10 ? (
              <View style={styles.rankUpRow}>
                <Icon name="badge" size={16} color={colors.chartreuse} />
                <Text style={styles.rankUpText}>
                  Tu entres dans le Top 10. Tiens ton rang jusqu'au reset pour débloquer le{' '}
                  <Text style={styles.rankUpEmph}>Badge Paris</Text>.
                </Text>
              </View>
            ) : null}

            {/* 3 · CTA contextuel — JAMAIS un GO ; la League mène au planner */}
            <View style={styles.toiCta}>
              <InlineRunCTA
                label="TROUVER UNE ROUTE"
                onPress={() => router.push('/route-planner')}
              />
            </View>
          </View>
        ) : null}

        {/* ── Exploration : onglets RÉDUITS + filtre secondaire ──
            Groupes de choix = UN Segmented chacun (AMENDEMENT-22 §4), pas N
            rectangles. `tone="surface"` : le seul focus chartreuse fort de la
            scène est le CTA « Trouver une route » du bloc TOI. */}
        <View style={styles.tabsWrap}>
          <Segmented
            options={PRIMARY_TABS}
            value={tab}
            tone="surface"
            accessibilityLabel="Nature du classement"
            onChange={(id) => {
              setTab(id);
              setShowAll(false);
              screen(`classement_${id}`);
            }}
          />
        </View>

        {/* Filtre secondaire : portée (Paris/France) + période (Semaine/Saison).
            Segmented `scrollable` = largeur de CONTENU (strips légers), posés sur
            la même rangée séparés par l'espace — aucun label tronqué (pet peeve
            #1), plus léger que les onglets primaires. Portée réservée à Joueurs. */}
        <View style={styles.filterRow}>
          {tab === 'joueurs' ? (
            <Segmented
              options={SCOPE_OPTIONS}
              value={scope}
              tone="surface"
              scrollable
              accessibilityLabel="Portée du classement"
              onChange={(id) => {
                setScope(id);
                setShowAll(false);
              }}
            />
          ) : null}
          <View style={styles.filterSpacer} />
          <Segmented
            options={PERIOD_OPTIONS}
            value={period}
            tone="surface"
            scrollable
            accessibilityLabel="Période du classement"
            onChange={setPeriod}
          />
        </View>

        {/* PODIUM top 3 — remonté à chaque changement de board (key) */}
        <Podium key={board.id} board={board} />

        {/* Rangs 4+ — COMPACT : 2 visibles + « Voir tout » */}
        <View style={styles.list}>
          {visibleRows.map((row) => (
            <BoardRow key={`${board.id}-${row.rank}`} row={row} board={board} />
          ))}
        </View>
        {hiddenCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir tout le classement"
            onPress={() => setShowAll(true)}
            style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
          >
            <Text style={styles.seeAllLabel}>Voir tout</Text>
            <Text style={styles.seeAllCount}>+{hiddenCount}</Text>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
        ) : null}

        {/* Récompenses Top 10 (doc §17) — repliées sous le fold */}
        <View style={styles.sectionHead}>
          <Icon name="cadeau" size={14} color={colors.gris} />
          <Text style={styles.sectionLabel}>RÉCOMPENSES TOP 10 · FIN DE SAISON</Text>
        </View>
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

  // ── Bloc TOI en haut (l'essentiel sans scroll) ──
  toiCard: {
    marginTop: 16,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    padding: spacing.cardPadding,
    gap: 10,
  },
  toiTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toiRank: {
    color: colors.chartreuse,
    fontSize: fontSizes.xl,
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
    lineHeight: fontSizes.xs * 1.5,
  },
  // Rank-up : ligne légère posée sur la surface du bloc TOI, séparée par un
  // filet neutre discret (pas un cadre) — jamais une card-dans-card (§1).
  rankUpRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginTop: 2,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  rankUpText: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.55,
  },
  rankUpEmph: { color: colors.chartreuse, fontWeight: '700' },
  toiCta: { marginTop: 2 },

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

  // ── Onglets primaires réduits (Segmented unique) ──
  tabsWrap: { marginTop: 22 },

  // ── Filtre secondaire (deux strips content-width, séparés par l'espace) ──
  filterRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  filterSpacer: { flex: 1, minWidth: 8 },

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
  // Marche du podium : riser DISCRET posé sur l'espace, sans contour ni card
  // (§8 « podium visuel, sans gros container autour de chaque joueur »). Le seul
  // relief est un léger dégradé de surface + la médaille qui flotte dessus.
  podiumStep: {
    alignSelf: 'stretch',
    marginTop: 6,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    backgroundColor: elevation.surface,
    alignItems: 'center',
    paddingTop: 8,
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

  // ── « Voir tout » : action LÉGÈRE (§3), pas une card bordée. Texte + compteur
  // + chevron posés sur l'espace, séparés par un simple filet en haut. ──
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 14,
  },
  seeAllLabel: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  seeAllCount: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

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
  rewardList: { gap: 8 },
});
