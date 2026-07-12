/**
 * GRYD — onglet SAISON ACTIONNABLE (AMENDEMENT-29 : ex-League ; AMENDEMENT-17
 * §1.3). Un écran = UNE décision : le bloc TOI tient au-dessus du fold (§A.18)
 * et porte UN SEUL objectif (audit zero-friction) :
 *   1. Ma ligne « #8 KORO · toi · 342 pts du #7 »
 *   2. UNE phrase-objectif concrète « ≈ 35 zones pour passer LENA_RUN. »
 *   3. CTA [TROUVER UNE ROUTE] (JAMAIS un GO — la Saison envoie vers le planner)
 * État #1 dédié : « en tête » + « Défends ton titre… » + CTA [DÉFENDRE MON RANG].
 * Le rappel de récompense (Top 10 → Badge Paris) vit dans la section Récompenses,
 * pas dans le bloc TOI (deux objectifs concurrents = friction). Le bloc TOI
 * n'apparaît QUE sur le board dont il est dérivé (Joueurs·Paris) — jamais figé
 * au-dessus d'un podium Crews/Ville/France.
 * En exploration : onglets réduits (Joueurs / Crews / Ville) + portée (Paris /
 * France) ; podium ; liste COMPACTE fenêtrée AUTOUR de ma ligne (mes voisins
 * directs, pas des rangs anonymes) + « Voir tout » ; récompenses de fin de
 * saison datées sur l'horloge unique de l'écran (la semaine de saison).
 * L'écart en zones neutres est DÉRIVÉ via POINTS_NEUTRAL_HEX — aucun barème
 * local. Honnêteté : la SEMAINE de saison est TOUJOURS une valeur démo (jamais
 * lue du serveur) → marquée « (DÉMO) » dans le kicker, quelle que soit la source
 * des lignes ; note « démonstration » sur tout board dont les lignes ne viennent
 * pas encore du serveur (Joueurs·Paris réel seulement quand source==='server').
 * Anti-shame : jamais « dernier/lent ». Pas de gros CTA « GO » (§A.5).
 */
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
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
import { useSeasonLeaderboard } from '../../src/features/social/leagueBoard';
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
const PRIMARY_TABS: readonly { id: PrimaryTab; label: string }[] = [
  { id: 'joueurs', label: 'Joueurs' },
  { id: 'crews', label: 'Crews' },
  { id: 'ville', label: 'Ville' },
];

// AMENDEMENT-35 (Europe) : le filtre de portée « Paris / France » est RETIRÉ.
// C'était un artefact de démo (Paris codé en dur = ego démo ; « France » ne
// pointait que sur des lignes factices) et le jeu vise l'Europe entière, pas un
// binaire Paris/France. La dimension géographique vit dans l'onglet « Ville »
// (les villes qui s'affrontent) ; l'onglet Joueurs = un seul classement (ta
// ville de saison, dérivé du serveur). Un vrai scope local↔large reviendra quand
// il y aura des données multi-villes réelles (jamais de scope qui ne montre que
// de la démo — règle §A + honnêteté).

/** Boards indexés (Crews / Ville — démo au MVP ; Joueurs vient du hook). */
const BOARD = (id: string): LeagueBoard =>
  LEAGUE_BOARDS.find((b) => b.id === id) ?? LEAGUE_BOARDS[0]!;

/**
 * Board Joueurs·Paris = saison active RÉELLE (season_scores via la vue
 * player_leaderboard) quand une session existe, sinon démo — voir
 * useSeasonLeaderboard. La ligne « TOI » et l'écart en sont DÉRIVÉS dans le
 * composant (useMemo), car ils dépendent du board dynamique du hook.
 * Joueurs·France / Crews / Ville restent démo (aucune source serveur au MVP).
 */

/** Lignes hors podium en compact quand JE n'y figure pas (compact §1.3). */
const COMPACT_ROWS = 2;
/** Fenêtre compacte AUTOUR de ma ligne : voisin du dessus + moi + voisin du
 * dessous — la liste parle de moi, pas de rangs anonymes (audit P2). */
const COMPACT_WINDOW = 3;

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
            <Text style={styles.podiumName} numberOfLines={1} ellipsizeMode="clip">
              {c.row.name}
              {c.row.me === true ? meSuffix(board) : ''}
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
            ellipsizeMode="clip"
          >
            {row.name}
            {row.me === true ? meSuffix(board) : ''}
          </Text>
          {row.sub ? (
            <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="clip">
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
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    screen('classement');
  }, []);

  // Board Joueurs·Paris réel (saison active) si session, sinon démo (`source`).
  const { joueursBoard, source } = useSeasonLeaderboard();

  const discreet = prefs.discreetMode;
  // Joueurs = board réel du hook (ta ville de saison) ; Crews / Ville démo au MVP.
  const board = useMemo<LeagueBoard>(() => {
    if (tab === 'joueurs') return joueursBoard;
    if (tab === 'crews') return BOARD('crews');
    return BOARD('ville');
  }, [tab, joueursBoard]);

  // Ma ligne + écart, DÉRIVÉS du board Joueurs dynamique (§17).
  const meRow = useMemo(() => joueursBoard.rows.find((r) => r.me === true), [joueursBoard]);
  const aboveRow = useMemo(
    () => (meRow ? joueursBoard.rows.find((r) => r.rank === meRow.rank - 1) : undefined),
    [joueursBoard, meRow],
  );
  const gapPoints = meRow && aboveRow ? aboveRow.value - meRow.value : 0;
  const gapHexes = Math.ceil(gapPoints / POINTS_NEUTRAL_HEX);
  const inTop10 = meRow !== undefined && meRow.rank <= 10;
  const isLeader = meRow !== undefined && meRow.rank === 1;

  // Le bloc TOI est dérivé du board Joueurs : il ne s'affiche QUE sur cet onglet
  // (jamais une ancre joueur figée au-dessus d'un podium Crews/Ville — audit P1).
  // Le #1 garde sa carte : état « en tête » dédié.
  const onJoueurs = tab === 'joueurs';
  const showToi =
    !discreet && onJoueurs && meRow !== undefined && (aboveRow !== undefined || isLeader);

  // Mode discret §10.3 : je n'apparais JAMAIS dans un leaderboard global.
  const rows = discreet ? board.rows.filter((r) => r.me !== true) : board.rows;
  const listRows = rows.filter((r) => r.rank > 3);
  // Compact : fenêtre centrée sur MA ligne quand j'y figure (mes voisins
  // directs), sinon les premières lignes. « Voir tout » déplie le reste.
  const meListIdx = listRows.findIndex((r) => r.me === true);
  const windowSize = meListIdx >= 0 ? COMPACT_WINDOW : COMPACT_ROWS;
  const windowStart =
    meListIdx >= 0 ? Math.max(0, Math.min(meListIdx - 1, listRows.length - windowSize)) : 0;
  const visibleRows = showAll ? listRows : listRows.slice(windowStart, windowStart + windowSize);
  const hiddenCount = listRows.length - visibleRows.length;
  // « ··· » si la fenêtre compacte saute des rangs après le podium (sauf si la
  // ligne porte déjà sa propre rupture gapBefore).
  const showLeadEllipsis = !showAll && windowStart > 0 && visibleRows[0]?.gapBefore !== true;
  // Honnêteté : un board est une démo tant que ses LIGNES ne viennent pas du
  // serveur. Joueurs·Paris est réel UNIQUEMENT quand la lecture serveur a résolu
  // (source==='server') ; Joueurs·France / Crews / Ville restent démo au MVP.
  const boardIsDemo = board.id === 'joueurs' ? source === 'local' : true;

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
        {/* Header SAISON (AMENDEMENT-29 : ex-« Paris League »). Le TITRE porte le
            nom de l'écran (« Saison ») ; le kicker situe la saison + la semaine —
            l'HORLOGE UNIQUE de l'écran est la semaine de saison. Honnêteté : cette
            semaine n'est JAMAIS lue du serveur (aucune fenêtre de saison n'est
            fetchée) → marquée « (DÉMO) » quelle que soit la source des lignes.
            AMENDEMENT-35 (Europe) : plus de suffixe de portée « PARIS/FRANCE »
            figé — le jeu vise l'Europe, l'onglet dit déjà ce qu'on regarde ;
            afficher « EUROPE » sur des lignes démo Paris/Lille serait un mensonge
            (la vision Europe est portée par la note démo + les docs). */}
        <Text style={styles.kicker}>
          SAISON 0 · SEMAINE {LEAGUE_SEASON_WEEK}/{SEASON_DURATION_WEEKS} (DÉMO)
        </Text>
        <View style={styles.titleRow}>
          <Icon name="classement" size={22} color={colors.blanc} />
          <Text style={styles.title}>Saison</Text>
        </View>

        {/* ── BLOC TOI EN HAUT (sans scroll) : rang + UNE phrase-objectif + CTA.
            3 idées max (§1 : 1 card = 1 idée, ≤ 3 infos) — le rappel Top 10
            vit dans la section Récompenses, pas ici. ── */}
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
            {/* 1 · Mon rang + écart nommé (le #1 lit « en tête »), jamais de honte */}
            <View style={styles.toiTop}>
              <Text style={styles.toiRank}>#{meRow!.rank}</Text>
              <Text style={styles.toiName} numberOfLines={1} ellipsizeMode="clip">
                {meRow!.name} · toi
              </Text>
              <Text style={styles.toiGap}>
                {isLeader ? 'en tête' : `${formatInt(gapPoints)} pts du #${aboveRow!.rank}`}
              </Text>
            </View>

            {/* 2 · UNE phrase-objectif concrète, cible nommée, sans sur-promesse.
                Le rappel de récompense (Top 10 → badge) vit dans Récompenses. */}
            <Text style={styles.toiHint}>
              {isLeader
                ? 'Défends ton titre jusqu’à la fin de la saison.'
                : `≈ ${formatInt(Math.max(1, gapHexes))} zones pour passer ${aboveRow!.name}.`}
            </Text>

            {/* 3 · CTA contextuel — JAMAIS un GO ; la Saison mène au planner */}
            <View style={styles.toiCta}>
              {/* Libellés COURTS qui tiennent sans jamais tronquer (§A « textes
                  jamais coupés ») — l'icône route porte le contexte « planner ». */}
              <InlineRunCTA
                label={isLeader ? 'DÉFENDRE' : 'MA ROUTE'}
                leading={<Icon name="route" size={18} color={colors.noir} />}
                onPress={() => router.push('/route-planner')}
              />
            </View>
          </View>
        ) : null}

        {/* ── Exploration : onglets RÉDUITS + filtre secondaire ──
            Groupes de choix = UN Segmented chacun (AMENDEMENT-22 §4), pas N
            rectangles. `tone="surface"` : le seul focus chartreuse fort de la
            scène est le CTA du bloc TOI (Trouver une route / Défendre mon rang). */}
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

        {/* AMENDEMENT-35 : le filtre de portée « Paris/France » a été RETIRÉ (voir
            l'en-tête du fichier) — plus léger, plus honnête, et l'onglet « Ville »
            porte déjà la géographie. */}

        {/* Honnêteté : boards dont les lignes ne viennent pas du serveur =
            démonstration, on le dit — et on situe la vision (Europe) sans mentir
            sur les données (Saison 0 ouvre Paris + Lille, le reste suit). */}
        {boardIsDemo ? (
          <Text style={styles.demoNote}>
            Classement de démonstration — Saison 0 ouvre Paris et Lille, l’Europe suit.
          </Text>
        ) : null}

        {/* PODIUM top 3 — remonté à chaque changement de board (key) */}
        <Podium key={board.id} board={board} />

        {/* Rangs 4+ — COMPACT : fenêtre autour de MA ligne + « Voir tout » */}
        <View style={styles.list}>
          {showLeadEllipsis ? <Text style={styles.ellipsis}>···</Text> : null}
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

        {/* Récompenses Top 10 (doc §17) — sous le fold, datées sur l'horloge
            unique de l'écran (semaine de saison, pas de « fin de saison »
            abstraite). Le rappel « tiens ton rang » vit ICI, lié aux gains —
            pas dans le bloc TOI où il concurrencerait l'objectif du jour. */}
        <View style={styles.sectionHead}>
          <Icon name="cadeau" size={14} color={colors.gris} />
          <Text style={styles.sectionLabel}>
            RÉCOMPENSES TOP 10 · FIN SEMAINE {SEASON_DURATION_WEEKS}
          </Text>
        </View>
        {/* Rang perso = celui du board Joueurs (dont meRow/inTop10 sont dérivés) :
            ne l'affiche QUE sur cet onglet, jamais sur Crews/Ville où « Tu es #8 »
            n'aurait aucun rapport avec la liste visible. */}
        {!discreet && onJoueurs && inTop10 && meRow ? (
          <Text style={styles.rewardHint}>
            Tu es #{meRow.rank} — reste dans le Top 10 pour les débloquer.
          </Text>
        ) : null}
        <View style={styles.rewardList}>
          {TOP10_REWARDS.map((r) => (
            <RewardCard
              key={r.label}
              icon={r.icon}
              label={r.label}
              // Libellé LOCAL : « reset de saison » (jargon, données démo
              // league.ts hors périmètre) → « fin de saison », cohérent avec
              // la copie de l'écran.
              sublabel={r.sublabel.replace('au reset de saison', 'à la fin de saison')}
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
  // Phrase-objectif UNIQUE du bloc TOI (cible nommée, pas de sur-promesse).
  toiHint: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
  },
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

  // ── Note d'honnêteté : board sans source serveur = démonstration ──
  demoNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 12,
  },

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
  // ≥ 12 px partout (accessibilité) — jamais de label sous fontSizes.xs.
  rowValueLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.4 },

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
  // Rappel « tiens ton rang » lié aux gains (déplacé hors du bloc TOI).
  rewardHint: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: -4,
    marginBottom: 10,
  },
  rewardList: { gap: 8 },
});
