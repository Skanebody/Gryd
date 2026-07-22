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
 * directs, pas des rangs anonymes) + « Voir tout » ; catalogue des récompenses
 * Top 10 (QUOI se gagne), daté « · J-n » UNIQUEMENT si une saison serveur court
 * (bornes réelles via seasonProgress) — jamais sur SEASON_DURATION_WEEKS.
 * L'écart en zones neutres est DÉRIVÉ via POINTS_NEUTRAL_HEX — aucun barème
 * local.
 * Anti-shame : jamais « dernier/lent ». Pas de gros CTA « GO » (§A.5).
 *
 * ─── UN CLASSEMENT EST RÉEL, OU IL N'EST PAS (21/07/2026) ───────────────────
 * Le mode vitrine est ABANDONNÉ : plus aucune surface n'affiche de données
 * fabriquées. Cet écran retombait sur `LEAGUE_BOARDS` — un podium de joueurs
 * qui n'existent pas — dès que la lecture serveur ne résolvait pas, et TOUJOURS
 * pour Crews/Ville. Une note « démonstration » sous un podium ne rachète pas le
 * podium : on lit les visages et les rangs, pas la note de bas de page.
 *
 * Désormais, sans exception :
 *  · Joueurs — affiché UNIQUEMENT si `source === 'server'`. Sinon, l'un des trois
 *    états honnêtes (en cours de lecture · pas connecté · rien reçu).
 *  · Crews / Ville — AUCUNE source serveur n'existe. On ne fait pas patienter
 *    devant un faux podium : on dit que ces classements ne sont pas ouverts.
 *  · Kicker — plus de « SEMAINE 3/8 (DÉMO) » : aucune fenêtre de saison n'est
 *    lue du serveur, donc aucune semaine n'est annoncée.
 */
import { flags } from '../../src/lib/flags';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  POINTS_NEUTRAL_HEX,
  colors,
  elevation,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  seasonProgress,
  spacing,
} from '@klaim/shared';
import { C } from '../../src/i18n/catalog/flagged';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { useMotivationPrefs } from '../../src/features/motivation/store';
import { TAB_CONTENT_BOTTOM_CLEARANCE } from '../../src/features/nav/metrics';
import { useSeasonLeaderboard } from '../../src/features/social/leagueBoard';
import { useActiveSeason } from '../../src/features/season/useActiveSeason';
import {
  TOP10_REWARDS,
  type LeagueBoard,
  type LeagueRow,
} from '../../src/features/social/league';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { screen } from '../../src/lib/analytics';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
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

/** Onglets RÉDUITS (AMENDEMENT-17) : 3 natures au lieu de 6 onglets coupés.
 * Labels = Entries i18n, résolus à l'affichage (le composant appelle t()). */
type PrimaryTab = 'joueurs' | 'crews' | 'ville';
const PRIMARY_TABS: readonly { id: PrimaryTab; label: Entry }[] = [
  { id: 'joueurs', label: C.tabJoueurs },
  { id: 'crews', label: C.tabCrews },
  { id: 'ville', label: C.tabVille },
];

// AMENDEMENT-35 (Europe) : le filtre de portée « Paris / France » est RETIRÉ.
// C'était un artefact de démo (Paris codé en dur = ego démo ; « France » ne
// pointait que sur des lignes factices) et le jeu vise l'Europe entière, pas un
// binaire Paris/France. La dimension géographique vit dans l'onglet « Ville »
// (les villes qui s'affrontent) ; l'onglet Joueurs = un seul classement (ta
// ville de saison, dérivé du serveur). Un vrai scope local↔large reviendra quand
// il y aura des données multi-villes réelles (jamais de scope qui ne montre que
// de la démo — règle §A + honnêteté).

/**
 * Board Joueurs = saison active RÉELLE (season_scores via la vue
 * player_leaderboard). La ligne « TOI » et l'écart en sont DÉRIVÉS dans le
 * composant (useMemo), et seulement quand la lecture serveur a résolu.
 * Crews / Ville n'ont aucune source : ils ne sont pas affichés du tout.
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

/** Suffixe « toi » adapté à la nature du board (jamais de honte, juste l'ancre).
 * Renvoie l'Entry i18n — le composant appelant la résout avec t(). */
function meSuffix(board: LeagueBoard): Entry {
  if (board.kind === 'crew') return C.suffixCrew;
  if (board.kind === 'city') return C.suffixVille;
  return C.suffixMoi;
}

/** PODIUM top 3 en marches : #2 / #1 (plus haut) / #3, médailles intégrées. */
function Podium({ board }: { board: LeagueBoard }) {
  const t = useT();
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
              {c.row.me === true ? t(meSuffix(board)) : ''}
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
  const t = useT();
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
            {row.me === true ? t(meSuffix(board)) : ''}
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

/**
 * ÉTAT VIDE d'un board : ce qui manque, puis AU PLUS une action (§A : 1 CTA
 * chartreuse max — et ici c'est le SEUL de la scène, le bloc TOI étant masqué
 * quand il n'y a pas de ligne réelle). Sans action possible, on explique et on
 * s'arrête : un bouton qui ne change rien vaut moins que la phrase honnête.
 */
function BoardEmpty({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {cta ? (
        <View style={styles.emptyCta}>
          <Button label={cta.label} onPress={cta.onPress} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * ROUTE = LE GARDE, et rien d'autre. Ce composant n'appelle AUCUN hook : sa
 * sortie anticipée est donc inoffensive. Auparavant le `Redirect` était posé
 * DEVANT les ~15 hooks de l'écran, dans le même composant — la règle des hooks
 * violée (React exige le même nombre d'appels à chaque rendu). `flags.season`
 * étant une constante de module, ça ne cassait pas ; le jour où la surface
 * deviendrait pilotable à chaud, l'écran crasherait à la bascule.
 */
export default function LeagueRoute() {
  // D8 — surface hors MVP : route masquée (les scores s'accumulent quand même).
  if (!flags.season) return <Redirect href="/" />;
  return <LeagueScreen />;
}

function LeagueScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();
  const { prefs } = useMotivationPrefs();
  const [tab, setTab] = useState<PrimaryTab>('joueurs');
  const [showAll, setShowAll] = useState(false);
  // Onglets résolus dans la langue courante (labels module = Entries).
  const tabOptions = useMemo(
    () => PRIMARY_TABS.map((o) => ({ id: o.id, label: t(o.label) })),
    [t],
  );

  useEffect(() => {
    screen('classement');
  }, []);

  // Board Joueurs·Paris réel (saison active) si session, sinon démo (`source`).
  const { joueursBoard, source, loading: boardLoading } = useSeasonLeaderboard();
  const { session, configured } = useSession();
  const signedIn = configured && session !== null;

  /**
   * Saison RÉELLE (RPC `season_current`, jamais une constante). L'horloge des
   * récompenses n'est HONNÊTE que branchée sur `season.endsAt` — décomptée par
   * le moteur pur `seasonProgress`, jamais par SEASON_DURATION_WEEKS (une durée
   * nominale n'est pas une date de fin). Le décompte et l'état « En cours » ne
   * valent QUE si une saison court MAINTENANT : `seasonStatus === 'active'` ET
   * phase dérivée du TEMPS === 'active' (une saison en clôture ne montre pas
   * « J-0 » ; un 'loading' n'affirme rien).
   */
  const { status: seasonStatus, season } = useActiveSeason();
  const prog = season ? seasonProgress(season.startsAt, season.endsAt) : null;
  const seasonActiveNow = seasonStatus === 'active' && prog?.phase === 'active';

  /**
   * Le board affiché est-il ADOSSÉ à quelque chose de réel ? Seul Joueurs a une
   * source serveur, et seulement quand la lecture a résolu (`source === 'server'`).
   * Crews / Ville n'en ont AUCUNE : ils ne seront jamais « réels » tant que rien
   * ne les alimente — ils n'affichent donc pas de podium, ils disent pourquoi.
   */
  const joueursIsReal = source === 'server';

  const discreet = prefs.discreetMode;
  /**
   * LE SEUL BOARD DE L'ÉCRAN est celui du hook (ma saison, lu du serveur).
   * Les boards démo `LEAGUE_BOARDS` (podiums de joueurs, crews et villes qui
   * n'existent pas) ne sont plus consultés du tout : ils étaient l'alimentation
   * de Crews/Ville et le repli de Joueurs. Un classement est réel, ou il n'est
   * pas — une note « démonstration » sous un podium ne rachète pas le podium :
   * on lit les visages et les rangs, pas la note de bas de page.
   */
  const board = joueursBoard;

  // Ma ligne + écart, DÉRIVÉS du board Joueurs dynamique (§17) — et SEULEMENT
  // s'il est réel : « #8 · 342 pts du #7 » calculé sur des voisins inventés
  // serait le mensonge le plus précis de l'écran.
  const meRow = useMemo(
    () => (joueursIsReal ? joueursBoard.rows.find((r) => r.me === true) : undefined),
    [joueursBoard, joueursIsReal],
  );
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
  /**
   * On n'affiche des rangs QUE sur l'onglet dont ils viennent, et QUE s'ils
   * viennent du serveur. Crews / Ville tombent donc toujours dans l'état
   * « pas ouvert » ci-dessous — ce n'est pas « vide en attendant ».
   */
  const showBoardRows = onJoueurs && joueursIsReal;

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
            nom de l'écran (« Saison ») ; le kicker NOMME la saison sans échéance
            fabriquée — `saisonKickerReal` = « SAISON 0 », jamais une « semaine N »
            devinée. Aucune fenêtre de saison n'est lue ICI : l'échéance réelle vit
            plus bas (section Récompenses), dérivée de `season.endsAt` via
            `useActiveSeason` + `seasonProgress`, et n'apparaît que si une saison
            court vraiment. AMENDEMENT-35 (Europe) : pas de suffixe de portée
            « PARIS/FRANCE » figé — l'onglet dit déjà ce qu'on regarde ; la vision
            Europe est portée par les docs, pas par un libellé plaqué sur Paris/Lille. */}
        <Text style={styles.kicker}>{t(C.saisonKickerReal)}</Text>
        <View style={styles.titleRow}>
          <Icon name="classement" size={iconSizes.lg} color={colors.blanc} />
          <Text style={styles.title}>{t(C.saisonTitle)}</Text>
        </View>

        {/* ── BLOC TOI EN HAUT (sans scroll) : rang + UNE phrase-objectif + CTA.
            3 idées max (§1 : 1 card = 1 idée, ≤ 3 infos) — le rappel Top 10
            vit dans la section Récompenses, pas ici. ── */}
        {discreet ? (
          <View style={styles.discreetBanner}>
            <Icon name="discret" size={iconSizes.md} color={colors.blanc} />
            <View style={styles.discreetBody}>
              <Text style={styles.discreetTitle}>{t(C.discreetTitle)}</Text>
              <Text style={styles.discreetText}>{t(C.discreetText)}</Text>
            </View>
          </View>
        ) : showToi ? (
          <View style={styles.toiCard}>
            {/* 1 · Mon rang + écart nommé (le #1 lit « en tête »), jamais de honte */}
            <View style={styles.toiTop}>
              <Text style={styles.toiRank}>#{meRow!.rank}</Text>
              <Text style={styles.toiName} numberOfLines={1} ellipsizeMode="clip">
                {meRow!.name}
                {t(C.suffixMoi)}
              </Text>
              <Text style={styles.toiGap}>
                {isLeader
                  ? t(C.enTete)
                  : t(C.gapPts, { pts: formatInt(gapPoints), rank: aboveRow!.rank })}
              </Text>
            </View>

            {/* 2 · UNE phrase-objectif concrète, cible nommée, sans sur-promesse.
                Le rappel de récompense (Top 10 → badge) vit dans Récompenses. */}
            <Text style={styles.toiHint}>
              {isLeader
                ? t(C.toiHintLeader)
                : t(C.toiHintChase, {
                    n: formatInt(Math.max(1, gapHexes)),
                    name: aboveRow!.name,
                  })}
            </Text>

            {/* 3 · CTA contextuel — JAMAIS un GO ; la Saison mène au planner */}
            <View style={styles.toiCta}>
              {/* Libellés COURTS qui tiennent sans jamais tronquer (§A « textes
                  jamais coupés ») — l'icône route porte le contexte « planner ». */}
              <InlineRunCTA
                label={t(isLeader ? C.ctaDefendre : C.ctaMaRoute)}
                leading={<Icon name="route" size={iconSizes.md} color={colors.noir} />}
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
            options={tabOptions}
            value={tab}
            tone="surface"
            accessibilityLabel={t(C.tabsA11y)}
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

        {showBoardRows ? (
          <>
            {/* PODIUM top 3 — remonté à chaque changement de board (key). Reçoit les
                lignes FILTRÉES (`rows`) : en mode discret je n'apparais pas non plus
                sur le podium (§10.3) — le podium gère déjà un rang manquant (case vide). */}
            <Podium key={board.id} board={{ ...board, rows }} />

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
                accessibilityLabel={t(C.seeAllBoardA11y)}
                onPress={() => setShowAll(true)}
                style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
              >
                <Text style={styles.seeAllLabel}>{t(C.seeAll)}</Text>
                <Text style={styles.seeAllCount}>+{hiddenCount}</Text>
                <Icon name="chevron" size={16} color={colors.gris} />
              </Pressable>
            ) : null}
          </>
        ) : !onJoueurs ? (
          /* Crews / Ville : aucune source serveur n'existe encore. Ce n'est pas
             « vide en attendant », c'est « pas ouvert » — et le dire évite de
             faire revenir le joueur tous les jours pour rien. */
          <BoardEmpty
            title={t(C.boardNoSourceTitle)}
            body={t(tab === 'crews' ? C.boardNoSourceCrews : C.boardNoSourceVille)}
          />
        ) : boardLoading ? (
          <Text style={styles.demoNote}>{t(C.boardLoading)}</Text>
        ) : !signedIn ? (
          /* Pas de compte = pas de saison rattachée. L'action est la connexion,
             et elle n'existe que si un backend est configuré. */
          <BoardEmpty
            title={t(C.boardSignedOutTitle)}
            body={t(C.boardSignedOutBody)}
            {...(configured
              ? { cta: { label: t(C.boardSignIn), onPress: () => router.push('/sign-in') } }
              : {})}
          />
        ) : (
          /* Connecté, lecture terminée, rien reçu. La lecture ne distingue pas
             « classement encore vide » d'un échec réseau : on énonce donc le
             FAIT observable (« aucun score reçu ») plutôt qu'une cause devinée,
             et on propose le geste qui aide dans les deux cas. */
          <BoardEmpty
            title={t(C.boardEmptyTitle)}
            body={t(C.boardEmptyBody)}
            cta={{ label: t(C.boardEmptyCta), onPress: () => router.push('/route-planner') }}
          />
        )}

        {/* Récompenses Top 10 (doc §17) — sous le fold. L'en-tête est STATIQUE
            (le catalogue des lots, montrer QUOI se gagne est licite) ; l'échéance
            réelle « · J-n » n'est suffixée QUE si une saison serveur court, dérivée
            de `season.endsAt` via seasonProgress — jamais « FIN SEMAINE 8 » (une
            durée nominale n'est pas une date de fin). Le rappel « tiens ton rang »
            vit ICI, lié aux gains — pas dans le bloc TOI. */}
        <View style={styles.sectionHead}>
          <Icon name="cadeau" size={iconSizes.sm} color={colors.gris} />
          <Text style={styles.sectionLabel}>
            {seasonActiveNow && prog
              ? `${t(C.rewardsLabelStatic)} · ${t(C.jMinus, { n: prog.joursRestants })}`
              : t(C.rewardsLabelStatic)}
          </Text>
        </View>
        {/* Aucune saison ne court : les cartes tombent en « Verrouillé ». On lève
            l'ambiguïté « jamais débloquable » par une ligne d'état honnête —
            'none' → pas encore ouverte, 'error' → indisponible ('loading'
            n'affirme rien). */}
        {!seasonActiveNow && (seasonStatus === 'none' || seasonStatus === 'error') ? (
          <Text style={styles.rewardHint}>
            {t(seasonStatus === 'error' ? C.rewardsSeasonError : C.rewardsSeasonClosed)}
          </Text>
        ) : null}
        {/* Rang perso = celui du board Joueurs (dont meRow/inTop10 sont dérivés) :
            ne l'affiche QUE sur cet onglet, jamais sur Crews/Ville où « Tu es #8 »
            n'aurait aucun rapport avec la liste visible. */}
        {!discreet && onJoueurs && inTop10 && meRow ? (
          <Text style={styles.rewardHint}>{t(C.rewardHint, { rank: meRow.rank })}</Text>
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
              // « En cours » UNIQUEMENT quand une saison réelle court ; sinon
              // « Verrouillé » (gris, neutre) — le catalogue des lots reste
              // montré à l'identique, sans affirmer aucun timing.
              state={seasonActiveNow ? 'inprogress' : 'locked'}
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
    gap: spacing.sm,
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
    marginTop: spacing.sm,
  },

  // ── État vide d'un board : prend la place du podium, même rythme vertical ──
  emptyCard: {
    marginTop: 22,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  emptyTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  emptyBody: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xs,
  },
  emptyCta: { marginTop: spacing.md },

  // ── Podium en marches ──
  podium: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  podiumCol: { flex: 1, alignItems: 'center', gap: spacing.xxs },
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
    paddingTop: spacing.xs,
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
    paddingHorizontal: spacing.sm,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.noir, // invisible : réserve la place pour la bordure de MA ligne
    marginBottom: spacing.xxs,
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
