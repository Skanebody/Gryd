/**
 * GRYD — onglet SAISON = planches E11 « Classement local » + E12 « Saison & rang »
 * (recalage Claude Design, 25/07/2026). Les deux planches vivent dans CE fichier :
 * il n'existe pas d'écran E12 séparé, et en créer un ajouterait une entrée de
 * navigation que la planche ne demande pas.
 *
 * ORDRE DE LECTURE (E11 haut → E12 bas) :
 *   1. EN-TÊTE — « SAISON {n} » RÉEL (season_current) + décompte RÉEL « Se termine
 *      dans {n} j ». Aucun numéro figé, aucune échéance devinée.
 *   2. MA LIGNE ANCRÉE (sticky) — « #{rang} · [avatar] {pseudo} · {pts} » + barre
 *      de progression + écart EXPLICITE vers la place au-dessus. Elle reste
 *      visible pendant le scroll : l'objectif affiché est TOUJOURS le joueur juste
 *      au-dessus, jamais le #1 inatteignable.
 *   3. UNE phrase-objectif + UN SEUL CTA chartreuse (§A.4) → route-planner.
 *   4. CHIPS DE PROXIMITÉ (strip défilant, jamais tronqué) : Ma ville → Spécialités
 *      → Villes → Crew. Le MONDE n'existe pas sur cet écran (règle « monde caché »
 *      tenue) : la plus large portée nommée ici reste la ville.
 *   5. PODIUM 3 marches (#2 gauche · #1 centre plus grand + anneau OR · #3 droite)
 *      puis la liste FENÊTRÉE autour de ma ligne.
 *   6. E12 — card RANG (palier de fin de saison RÉEL), frise VERTICALE des paliers,
 *      règles du reset en 2 lignes.
 *
 * ─── CE QUE LA PLANCHE MONTRE ET QUE LE CODE NE TIENT PAS (donc OMIS) ─────────
 * Un contrôle sans backing réel est un bouton mort ; une valeur sans source est
 * un mensonge. Sont volontairement ABSENTS, chacun commenté à son emplacement :
 *  · le sélecteur de période « Semaine ▾ » — aucune agrégation hebdomadaire
 *    n'existe (season_scores est cumulatif sur la saison) ;
 *  · les chips « Autour de moi », « Quartier », « Amis » — aucune vue de
 *    classement par secteur/quartier, aucun board d'amis ;
 *  · les photos rondes du podium et les km² par joueur — player_leaderboard ne
 *    rend que user_id/pseudo/points, et les photos de profil ne quittent JAMAIS
 *    le téléphone (avatarPhoto.ts) ;
 *  · la colonne « crew » et la variation « ▲2 / ▼1 » — aucune jointure crew, aucun
 *    rang antérieur persisté côté client ;
 *  · le fond carto derrière le podium — aucune carte n'est rendue ici, et un fond
 *    générique qui ne serait pas la vraie ville serait une fabrication de plus ;
 *  · le rang nommé « Argent II » + « 2 340/3 000 XP » + le moment « PASSAGE DE
 *    RANG » — il n'existe ni rangs nommés, ni XP, ni snapshot de rang antérieur :
 *    une célébration qui ne se déclenche jamais est un bouton mort animé ;
 *  · la mention « · Run » (rangs Run/Bike séparés) — le vélo n'existe pas.
 *
 * ─── UN CLASSEMENT EST RÉEL, OU IL N'EST PAS (21/07/2026, toujours en vigueur) ─
 *  · Ma ville — affiché UNIQUEMENT si `source === 'server'`. Sinon l'un des états
 *    honnêtes (lecture en cours · pas connecté · ville non rattachée · échec · vide).
 *  · Villes et Crew — AUCUNE source serveur (la matview `crew_leaderboard` n'est
 *    jamais rafraîchie ; aucun agrégat inter-villes n'existe) : on dit « pas encore
 *    ouvert », on ne fait pas patienter devant un faux podium. Nommer une dimension
 *    du jeu et DIRE qu'elle n'est pas ouverte est un constat vrai — c'est fabriquer
 *    des villes, des rangs ou des rivaux qui serait le mensonge (CLAUDE.md, zéro
 *    donnée européenne factice).
 */
import { flags } from '../../src/lib/flags';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BADGE_TIER_STYLE,
  POINTS_NEUTRAL_HEX,
  colors,
  fonts,
  elevation,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  seasonProgress,
  spacing,
} from '@klaim/shared';
import { C } from '../../src/i18n/catalog/flagged';
import { C as S } from '../../src/i18n/catalog/saison';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { useMotivationPrefs } from '../../src/features/motivation/store';
import { TAB_CONTENT_BOTTOM_CLEARANCE } from '../../src/features/nav/metrics';
import {
  useSeasonLeaderboard,
  useSpecialtyLeaderboard,
  type Specialty,
  type SpecialtyLeaderboard,
} from '../../src/features/social/leagueBoard';
import { useActiveSeason } from '../../src/features/season/useActiveSeason';
import {
  rowAboveMe,
  withTiedRanks,
  type RankedLeagueRow,
} from '../../src/features/season/leagueRanking';
import {
  SEASON_REWARD_TIERS,
  seasonStanding,
  type SeasonRewardTier,
} from '../../src/features/season/seasonRewards';
import { useMyBadges } from '../../src/features/badges/myBadges';
import { useMyProfile } from '../../src/features/social/profileStore';
import type { LeagueBoard } from '../../src/features/social/league';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { screen } from '../../src/lib/analytics';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { IconPlate } from '../../src/ui/Card';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { formatInt } from '../../src/ui/format';
import {
  CrewCrest,
  InlineRunCTA,
  LeagueMedal,
  PlayerAvatarFrame,
  Segmented,
  useSlideIn,
} from '../../src/ui/game';

/**
 * CHIPS ORDONNÉES PAR PROXIMITÉ (planche E11 : autour de moi → quartier → ville →
 * amis → crew). Ce que l'écran nomme aujourd'hui :
 *  · « Ma ville »   = le classement de MA saison locale (l'ancien onglet
 *                     « Joueurs », dont le libellé ne disait pas la proximité) ;
 *  · « Spécialités » = même ville, autre métrique (compteurs de tous les temps) ;
 *  · « Villes »     = les villes qui s'affrontent — dimension du jeu, sans source ;
 *  · « Crew »       = dernier de la proximité, sans source lui aussi.
 * « Autour de moi », « Quartier » et « Amis » sont OMIS : aucune vue de secteur,
 * de quartier ni d'amitié n'alimente un classement — trois chips mortes.
 * « Villes » est REMIS (décision fondateur, 25/07/2026) : contrairement aux trois
 * précédentes, c'est une dimension ANNONCÉE du jeu, et « pas encore ouvert » est
 * un CONSTAT vrai — exactement le traitement déjà retenu pour Crew, pas un
 * troisième style d'état. Aucune ville, aucun rang, aucun rival n'est fabriqué.
 * Les `id` sont CONSERVÉS (les events PostHog `classement_{id}` restent stables).
 */
type PrimaryTab = 'joueurs' | 'specialites' | 'ville' | 'crews';
const PRIMARY_TABS: readonly { id: PrimaryTab; label: Entry }[] = [
  { id: 'joueurs', label: S.tabMaVille },
  { id: 'specialites', label: C.tabSpecialites },
  { id: 'ville', label: C.tabVille },
  { id: 'crews', label: C.tabCrews },
];

/** Spécialités §16 (vue specialty_leaderboard) : libellé + unité + colonne. */
const SPECIALTIES: readonly { id: Specialty; label: Entry; unit: Entry }[] = [
  { id: 'conqueror', label: C.specConqueror, unit: C.specUnitConqueror },
  { id: 'defender', label: C.specDefender, unit: C.specUnitDefender },
  { id: 'thief', label: C.specThief, unit: C.specUnitThief },
  { id: 'pioneer', label: C.specPioneer, unit: C.specUnitPioneer },
];

// AMENDEMENT-35 (Europe) : le filtre de portée « Paris / France » est RETIRÉ — la
// règle « le MONDE est caché » de la planche est donc déjà tenue : cet écran ne
// propose AUCUN classement au-delà de ma ville.

/** Lignes hors podium en compact quand JE n'y figure pas (compact §1.3). */
const COMPACT_ROWS = 2;
/** Fenêtre compacte AUTOUR de ma ligne : voisin du dessus + moi + voisin du
 * dessous — la liste parle de moi, pas de rangs anonymes (audit P2). */
const COMPACT_WINDOW = 3;

/** Visuel de rang : avatar joueur (défaut) ou blason crew. */
function RowVisual({ row, board, big = false }: {
  row: RankedLeagueRow;
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
  // PHOTOS RONDES DE LA PLANCHE : impossibles pour AUTRUI — player_leaderboard ne
  // renvoie que user_id/pseudo/points, et une photo de profil reste dans le
  // sandbox du téléphone (avatarPhoto.ts), jamais uploadée. Initiales pour tous ;
  // seule MA ligne ancrée peut porter MA photo (donnée réelle de ce device).
  return <PlayerAvatarFrame name={row.name} size={big ? 'l' : 's'} isMe={row.me === true} />;
}

/** Suffixe « toi » adapté à la nature du board (jamais de honte, juste l'ancre). */
function meSuffix(board: LeagueBoard): Entry {
  if (board.kind === 'crew') return C.suffixCrew;
  return C.suffixMoi;
}

/**
 * PODIUM 3 marches : #2 à gauche · #1 au CENTRE et plus grand · #3 à droite.
 * Les colonnes sont POSITIONNELLES (et non « la ligne de rang 2 ») : avec des ex
 * æquo, un rang peut manquer (1, 1, 3) — personne ne doit disparaître du podium.
 * L'ANNEAU OR discret n'entoure QUE le rang 1 (or = #1 seul, chartreuse = moi seul).
 */
function Podium({ rows, board }: { rows: readonly RankedLeagueRow[]; board: LeagueBoard }) {
  const t = useT();
  const slide = useSlideIn(14);
  const steps = [56, 84, 42];
  // Ordre d'affichage : 2ᵉ, 1ᵉʳ, 3ᵉ (le centre est la marche haute).
  const cols = [rows[1], rows[0], rows[2]];
  return (
    <Animated.View
      style={[styles.podium, { opacity: slide.opacity, transform: [{ translateY: slide.translateY }] }]}
    >
      {cols.map((row, i) =>
        row ? (
          <View key={`podium-${i}`} style={styles.podiumCol}>
            <View style={[styles.podiumRing, row.rank === 1 && styles.podiumRingGold]}>
              <RowVisual row={row} board={board} big={row.rank === 1} />
            </View>
            <Text style={styles.podiumName} numberOfLines={1} ellipsizeMode="clip">
              {row.name}
              {row.me === true ? t(meSuffix(board)) : ''}
            </Text>
            <Text style={styles.podiumValue}>{formatInt(row.value)}</Text>
            <View style={[styles.podiumStep, { height: steps[i] ?? 42 }]}>
              <LeagueMedal rank={row.rank} size={40} />
            </View>
          </View>
        ) : (
          <View key={`podium-vide-${i}`} style={styles.podiumCol} />
        ),
      )}
    </Animated.View>
  );
}

/** Ligne de classement standard (hors podium), MA ligne ancrée chartreuse. */
function BoardRow({ row, board }: { row: RankedLeagueRow; board: LeagueBoard }) {
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
          {/* ÉGALITÉ dite en TEXTE (jamais une nuance de couleur) : deux joueurs à
              points égaux partagent le rang, comme à la clôture serveur. La
              colonne « crew » de la planche reste vide — aucune source ne la
              remplit (player_leaderboard ne joint pas crew_members). */}
          {row.tied ? (
            <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="clip">
              {t(S.exAequo)}
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
 * chartreuse max — et ici c'est le SEUL de la scène, ma ligne ancrée étant
 * masquée quand il n'y a pas de ligne réelle).
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
 * CORPS D'UN BOARD : podium + liste fenêtrée. Partagé par « Ma ville » et
 * « Spécialités » — un seul rendu, donc une seule règle de podium.
 *
 * `showPodium` porte la règle psychologique de la planche : un joueur NON classé
 * ne doit JAMAIS voir un podium géant au-dessus de lui (« 22 000 pts / toi :
 * rien »). Dans ce cas les 3 premiers redescendent en lignes ordinaires.
 */
function BoardBody({
  rows,
  board,
  keyPrefix,
  showPodium,
  showAll,
  onSeeAll,
}: {
  rows: readonly RankedLeagueRow[];
  board: LeagueBoard;
  keyPrefix: string;
  showPodium: boolean;
  showAll: boolean;
  onSeeAll: () => void;
}) {
  const t = useT();
  const podiumRows = showPodium ? rows.filter((r) => r.rank <= 3).slice(0, 3) : [];
  const listRows = rows.filter((r) => !podiumRows.includes(r));
  // Compact : fenêtre centrée sur MA ligne quand j'y figure (mes voisins
  // directs), sinon les premières lignes. « Voir tout » déplie le reste.
  const meListIdx = listRows.findIndex((r) => r.me === true);
  const windowSize = meListIdx >= 0 ? COMPACT_WINDOW : COMPACT_ROWS;
  const windowStart =
    meListIdx >= 0 ? Math.max(0, Math.min(meListIdx - 1, listRows.length - windowSize)) : 0;
  const visibleRows = showAll ? listRows : listRows.slice(windowStart, windowStart + windowSize);
  const hiddenCount = listRows.length - visibleRows.length;
  const showLeadEllipsis = !showAll && windowStart > 0 && visibleRows[0]?.gapBefore !== true;

  return (
    <>
      {podiumRows.length > 0 ? <Podium rows={podiumRows} board={board} /> : null}
      <View style={styles.list}>
        {showLeadEllipsis ? <Text style={styles.ellipsis}>···</Text> : null}
        {visibleRows.map((row, i) => (
          <BoardRow key={`${keyPrefix}-${row.rank}-${i}`} row={row} board={board} />
        ))}
      </View>
      {hiddenCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.seeAllBoardA11y)}
          onPress={onSeeAll}
          style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
        >
          <Text style={styles.seeAllLabel}>{t(C.seeAll)}</Text>
          <Text style={styles.seeAllCount}>+{hiddenCount}</Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>
      ) : null}
    </>
  );
}

/**
 * §16 — bloc SPÉCIALITÉS : sous-sélecteur (Conquérant/Défenseur/Voleur/Pionnier) +
 * le board de la spécialité choisie, MÊMES 6 états honnêtes que Ma ville.
 * Compteurs LIFETIME → caption « de tous les temps ». Discret §10.3 : je
 * n'apparais pas non plus ici (filtre `me`).
 */
function SpecialtyBoards({
  specialty,
  onSpecialty,
  spec,
  discreet,
  signedIn,
  configured,
}: {
  specialty: Specialty;
  onSpecialty: (s: Specialty) => void;
  spec: SpecialtyLeaderboard;
  discreet: boolean;
  signedIn: boolean;
  configured: boolean;
}) {
  const t = useT();
  const [showAll, setShowAll] = useState(false);
  const active = SPECIALTIES.find((s) => s.id === specialty) ?? SPECIALTIES[0]!;
  // Rangs 1224 AVANT le filtre discret : filtrer d'abord décalerait les rangs.
  const ranked = useMemo(() => withTiedRanks(spec.rows), [spec.rows]);
  const iAmInBoard = ranked.some((r) => r.me === true);
  const rows = discreet ? ranked.filter((r) => r.me !== true) : ranked;
  // `id` n'est qu'un champ de type (LeagueTabId) : le board de spécialité est un
  // véhicule d'affichage (kind 'player' → avatar).
  const board: LeagueBoard = {
    id: 'joueurs',
    kind: 'player',
    label: t(active.label),
    valueLabel: t(active.unit),
    rows,
  };
  return (
    <>
      <View style={styles.subTabsWrap}>
        <Segmented
          options={SPECIALTIES.map((s) => ({ id: s.id, label: t(s.label) }))}
          value={specialty}
          tone="surface"
          scrollable
          accessibilityLabel={t(C.tabSpecialites)}
          onChange={(id) => {
            onSpecialty(id as Specialty);
            setShowAll(false);
            screen(`classement_spec_${id}`);
          }}
        />
      </View>
      {spec.status === 'ready' ? (
        <>
          {/* CUMULATIF, pas la saison — on le DIT (compteurs LIFETIME de user_stats). */}
          <Text style={styles.boardCaption}>{t(C.specAllTime)}</Text>
          {!discreet && !iAmInBoard ? (
            <Text style={styles.boardCaption}>{t(S.pasClasse)}</Text>
          ) : null}
          <BoardBody
            key={specialty}
            rows={rows}
            board={board}
            keyPrefix={specialty}
            showPodium={discreet || iAmInBoard}
            showAll={showAll}
            onSeeAll={() => setShowAll(true)}
          />
        </>
      ) : spec.loading ? (
        <Text style={styles.stateNote}>{t(C.boardLoading)}</Text>
      ) : !signedIn ? (
        <BoardEmpty
          title={t(C.boardSignedOutTitle)}
          body={t(C.boardSignedOutBody)}
          {...(configured
            ? { cta: { label: t(C.boardSignIn), onPress: () => router.push('/sign-in') } }
            : {})}
        />
      ) : spec.status === 'city_unknown' ? (
        <BoardEmpty
          title={t(C.boardCityUnknownTitle)}
          body={t(C.boardCityUnknownBody)}
          cta={{ label: t(C.boardEmptyCta), onPress: () => router.push('/route-planner') }}
        />
      ) : spec.status === 'unavailable' ? (
        // Vue 0069 pas encore déployée, ou lecture en échec : état DISTINCT du vide.
        <BoardEmpty title={t(C.boardUnavailableTitle)} body={t(C.boardUnavailableBody)} />
      ) : (
        // Vide d'une spécialité : copy CUMULATIVE (jamais « cette saison » — faux ici).
        <BoardEmpty
          title={t(C.specEmptyTitle)}
          body={t(C.specEmptyBody)}
          cta={{ label: t(C.boardEmptyCta), onPress: () => router.push('/route-planner') }}
        />
      )}
    </>
  );
}

/** Libellé d'un palier de fin de saison (« Top 10 local », « #1 local »…). */
function tierLabel(tier: SeasonRewardTier, t: ReturnType<typeof useT>): string {
  if (tier.soleWinnerOnly) return t(S.palierVainqueur);
  if (tier.maxRank <= 1) return t(S.palierPremier);
  return t(S.palierTopN, { n: tier.maxRank });
}

/** Condition EN CLAIR d'un palier (retraduite — shared la rédige en français). */
function tierCondition(tier: SeasonRewardTier, t: ReturnType<typeof useT>): string {
  if (tier.soleWinnerOnly) return t(S.conditionVainqueur);
  if (tier.maxRank <= 1) return t(S.conditionPremier);
  return t(S.conditionTopN, { n: tier.maxRank });
}

/**
 * E12-4 — UNE LIGNE de la frise verticale des paliers. La rareté vient du
 * MATÉRIAU (acier sombre → chrome → titane → élite → or limité), lu dans
 * BADGE_TIER_STYLE : aucune couleur en dur, aucun clinquant.
 * Posée sur l'ESPACE (rail + texte), jamais une card dans la card de section.
 */
function SeasonTierRow({
  tier,
  last,
  status,
}: {
  tier: SeasonRewardTier;
  last: boolean;
  /** `null` = la lecture des badges n'autorise AUCUNE affirmation. */
  status: 'earned' | 'locked' | null;
}) {
  const t = useT();
  const material = BADGE_TIER_STYLE[tier.tier];
  const earned = status === 'earned';
  return (
    <View style={styles.tierRow}>
      <View style={styles.tierRail}>
        <View style={[styles.tierDot, { borderColor: material.ring, borderWidth: material.strokeWidth }]}>
          <Icon name="bouclier" size={iconSizes.sm} color={earned ? material.ring : colors.gris} />
        </View>
        {last ? null : <View style={styles.tierLine} />}
      </View>
      <View style={styles.tierBody}>
        {/* Nom propre du catalogue @klaim/shared — invariant, jamais traduit. */}
        <Text style={styles.tierName} numberOfLines={1} ellipsizeMode="clip">
          {tier.name}
        </Text>
        <Text style={styles.tierCondition}>{tierCondition(tier, t)}</Text>
      </View>
      {/* Le statut n'est affiché QUE si `user_badges` a été lu pour CE compte —
          icône + texte (jamais la couleur seule). Sans lecture, aucune promesse. */}
      {status === null ? null : (
        <View style={styles.tierStatus}>
          <Icon
            name={earned ? 'badge' : 'verrou'}
            size={iconSizes.xs}
            color={earned ? colors.blanc : colors.grisFaible}
          />
          <Text style={[styles.tierStatusLabel, earned && styles.tierStatusEarned]}>
            {t(earned ? S.statutObtenu : S.statutVerrouille)}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * ROUTE = LE GARDE, et rien d'autre. Ce composant n'appelle AUCUN hook : sa
 * sortie anticipée est donc inoffensive (règle des hooks).
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
  const tabOptions = useMemo(
    () => PRIMARY_TABS.map((o) => ({ id: o.id, label: t(o.label) })),
    [t],
  );

  useEffect(() => {
    screen('classement');
  }, []);

  /**
   * Board de MA ville (saison active) — jamais celui d'une autre ville.
   * `boardStatus` porte l'état EXACT de la lecture (chargement / pas de compte /
   * ville non rattachée / échec / vide / prêt).
   */
  const {
    joueursBoard,
    source,
    loading: boardLoading,
    status: boardStatus,
    cityName: boardCityName,
  } = useSeasonLeaderboard();
  const { session, configured } = useSession();
  const signedIn = configured && session !== null;

  // §16 — classements par SPÉCIALITÉ. Hook appelé INCONDITIONNELLEMENT (règle des
  // hooks) ; ne sert que sous l'onglet « Spécialités ».
  const [specialty, setSpecialty] = useState<Specialty>('conqueror');
  const spec = useSpecialtyLeaderboard(specialty);

  /**
   * Saison RÉELLE (RPC `season_current`) : numéro ET bornes. Le décompte est
   * dérivé par le moteur pur `seasonProgress`, jamais par SEASON_DURATION_WEEKS
   * (une durée nominale n'est pas une date de fin).
   */
  const { status: seasonStatus, season } = useActiveSeason();
  const prog = season ? seasonProgress(season.startsAt, season.endsAt) : null;
  const seasonActiveNow = seasonStatus === 'active' && prog?.phase === 'active';
  // E11-14 · saison terminée mais clôture serveur pas encore repassée : le gel de
  // 24 h existe VRAIMENT (resetPlan). On le dit, on n'affiche pas « J-0 ».
  const seasonFrozen = seasonStatus === 'active' && prog?.phase === 'ended';

  /** Le board affiché est-il ADOSSÉ à quelque chose de réel ? */
  const joueursIsReal = source === 'server';
  const discreet = prefs.discreetMode;

  // MA PHOTO : locale à ce téléphone (jamais celle d'autrui). Tant que le store
  // n'a pas résolu, on ne passe RIEN — les initiales, elles, sont toujours vraies.
  const { profile, loading: profileLoading } = useMyProfile();
  const myPhoto = !profileLoading && profile.avatarUri ? profile.avatarUri : undefined;

  /**
   * Rangs 1224 (égalités) calculés sur les lignes SERVEUR, AVANT le filtre du
   * mode discret : filtrer d'abord décalerait tous les rangs affichés.
   */
  const rankedRows = useMemo(
    () => (joueursIsReal ? withTiedRanks(joueursBoard.rows) : []),
    [joueursBoard, joueursIsReal],
  );
  const meRow = useMemo(() => rankedRows.find((r) => r.me === true), [rankedRows]);
  const aboveRow = useMemo(() => rowAboveMe(rankedRows), [rankedRows]);

  const gapPoints = meRow && aboveRow ? Math.max(0, aboveRow.value - meRow.value) : 0;
  const gapHexes = Math.ceil(gapPoints / POINTS_NEUTRAL_HEX);
  const isLeader = meRow !== undefined && aboveRow === undefined;
  // Barre de progression HONNÊTE : mes points rapportés à ceux de la place au
  // dessus. Aucune échelle inventée — et rien du tout si personne n'est devant.
  const gapRatio =
    meRow && aboveRow && aboveRow.value > 0 ? Math.min(1, Math.max(0, meRow.value / aboveRow.value)) : 0;

  const onJoueurs = tab === 'joueurs';
  // Ma ligne ancrée est DÉRIVÉE du board de ma ville : elle n'apparaît que sur cet
  // onglet (jamais figée au-dessus d'un podium Crew) et jamais en mode discret.
  const showMine = !discreet && onJoueurs && meRow !== undefined;

  // Mode discret §10.3 : je n'apparais JAMAIS dans un leaderboard global.
  const rows = discreet ? rankedRows.filter((r) => r.me !== true) : rankedRows;
  const showBoardRows = onJoueurs && joueursIsReal;

  // ── E12 · Palier de fin de saison RÉEL (season_close) ──
  const standing = seasonStanding(meRow ? meRow.rank : null, meRow?.tied === true);
  const badges = useMyBadges();
  const badgesKnown = badges.source === 'server' && !badges.loading;
  // Les QUATRE états de la lecture des récompenses, jamais confondus.
  const badgeNote: Entry | null = badges.loading
    ? S.badgesLecture
    : !signedIn
      ? S.badgesConnexion
      : badges.failed
        ? S.badgesEchec
        : null;

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ paddingTop: insets.top + 18 }}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_CONTENT_BOTTOM_CLEARANCE },
        ]}
        // MA LIGNE (index 1) reste ANCRÉE en haut pendant le scroll : l'écart avec
        // la place au-dessus ne doit jamais quitter l'écran (planche E11 §4).
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 0 · EN-TÊTE : saison RÉELLE + décompte RÉEL ──
            Le numéro vient de `season.number` (serveur) — plus de « SAISON 0 »
            figé dans l'i18n. En 'loading' : RIEN, un chargement n'affirme rien.
            Le sélecteur de période « Semaine ▾ » de la planche est OMIS : aucune
            agrégation hebdomadaire n'existe en base (season_scores est cumulatif
            sur la saison) — la portée temporelle est nommée par la saison. */}
        <View>
          <View style={styles.kickerRow}>
            <Text style={styles.kicker} numberOfLines={1} ellipsizeMode="clip">
              {seasonStatus === 'active' && season
                ? t(S.kickerSaison, { n: season.number })
                : seasonStatus === 'none'
                  ? t(S.kickerPasOuverte)
                  : seasonStatus === 'error'
                    ? t(S.kickerIndispo)
                    : ''}
            </Text>
            {seasonActiveNow && prog ? (
              <Text style={styles.deadline} numberOfLines={1} ellipsizeMode="clip">
                {prog.joursRestants <= 0
                  ? t(S.finAujourdhui)
                  : t(S.finDansJours, { n: prog.joursRestants })}
              </Text>
            ) : null}
          </View>
          <View style={styles.titleRow}>
            <Icon name="classement" size={iconSizes.lg} color={colors.blanc} />
            <Text style={styles.title}>{t(C.saisonTitle)}</Text>
          </View>
          {seasonFrozen ? <Text style={styles.frozen}>{t(S.classementGele)}</Text> : null}
        </View>

        {/* ── 1 · MA LIGNE ANCRÉE (sticky) : rang · avatar · pseudo · pts, barre de
            progression, écart EXPLICITE vers la place au-dessus. Fond opaque : les
            lignes défilent DESSOUS. Vide quand il n'y a pas de ligne réelle à moi
            (l'index doit rester stable pour `stickyHeaderIndices`). ── */}
        <View style={[styles.stickyWrap, showMine && meRow ? styles.stickyWrapFilled : null]}>
          {showMine && meRow ? (
            <View
              style={styles.mineCard}
              accessible
              // Une seule annonce COMPLÈTE (le regroupement a11y masquerait sinon
              // les valeurs des enfants) : rôle, rang, pseudo, points, puis l'écart.
              accessibilityLabel={`${t(S.maLigneA11y)} : #${meRow.rank} ${meRow.name}, ${formatInt(meRow.value)} ${joueursBoard.valueLabel}. ${
                aboveRow
                  ? t(S.gapPourPasser, { pts: formatInt(gapPoints), rank: aboveRow.rank })
                  : t(C.enTete)
              }`}
            >
              <View style={styles.mineTop}>
                <Text style={styles.mineRank}>#{meRow.rank}</Text>
                <PlayerAvatarFrame name={meRow.name} size="s" isMe imageUri={myPhoto} />
                <Text style={styles.mineName} numberOfLines={1} ellipsizeMode="clip">
                  {meRow.name}
                  {t(C.suffixMoi)}
                </Text>
                <View style={styles.mineValueWrap}>
                  <Text style={styles.mineValue}>{formatInt(meRow.value)}</Text>
                  <Text style={styles.mineUnit}>{joueursBoard.valueLabel}</Text>
                </View>
              </View>
              {aboveRow ? (
                <>
                  <ProgressBar value={gapRatio} height={6} />
                  {/* L'unité RÉELLE du board est le POINT (les km² par joueur
                      n'existent nulle part) : on ne convertit jamais l'un en l'autre. */}
                  <Text style={styles.mineGap}>
                    {t(S.gapPourPasser, { pts: formatInt(gapPoints), rank: aboveRow.rank })}
                  </Text>
                </>
              ) : (
                <Text style={styles.mineGap}>{t(C.enTete)}</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* ── 2 · UNE phrase-objectif + LE seul CTA chartreuse de l'écran (§A.4).
            Volontairement HORS de la bande ancrée : un CTA chartreuse collé en
            permanence à l'écran redeviendrait le « gros bouton permanent »
            proscrit (§A.5). Posé sur l'espace — pas de card dans card. ── */}
        {discreet ? (
          <View style={styles.discreetBanner}>
            <Icon name="discret" size={iconSizes.md} color={colors.blanc} />
            <View style={styles.discreetBody}>
              <Text style={styles.discreetTitle}>{t(C.discreetTitle)}</Text>
              <Text style={styles.discreetText}>{t(C.discreetText)}</Text>
            </View>
          </View>
        ) : showMine && meRow ? (
          <View style={styles.goalWrap}>
            <Text style={styles.goalText}>
              {isLeader
                ? t(C.toiHintLeader)
                : t(C.toiHintChase, {
                    n: formatInt(Math.max(1, gapHexes)),
                    name: aboveRow ? aboveRow.name : '',
                  })}
            </Text>
            <InlineRunCTA
              label={t(isLeader ? C.ctaDefendre : C.ctaMaRoute)}
              leading={<Icon name="route" size={iconSizes.md} color={colors.noir} />}
              onPress={() => router.push('/route-planner')}
            />
          </View>
        ) : (
          <View />
        )}

        {/* ── 3 · CHIPS DE PROXIMITÉ — strip DÉFILANT à largeur de contenu : aucun
            libellé n'est jamais tronqué (§A.9), on fait défiler. `tone="surface"` :
            le seul accent chartreuse fort de la scène reste le CTA. ── */}
        <View style={styles.tabsWrap}>
          <Segmented
            options={tabOptions}
            value={tab}
            tone="surface"
            scrollable
            accessibilityLabel={t(C.tabsA11y)}
            onChange={(id) => {
              setTab(id);
              setShowAll(false);
              screen(`classement_${id}`);
            }}
          />
        </View>

        {/* ── 4 · Le classement, puis E12 (rang + récompenses + règles du reset) ── */}
        <View>
          {tab === 'specialites' ? (
            <SpecialtyBoards
              specialty={specialty}
              onSpecialty={setSpecialty}
              spec={spec}
              discreet={discreet}
              signedIn={signedIn}
              configured={configured}
            />
          ) : showBoardRows ? (
            <>
              {/* NOMME la ville du classement (nom LU dans `city_zones`). Absente
                  de la base = pas de légende, jamais un nom deviné. */}
              {boardCityName ? (
                <Text style={styles.boardCaption}>
                  {t(C.boardCityCaption, { ville: boardCityName })}
                </Text>
              ) : null}
              {/* Jamais « 22 000 pts » face à « toi : rien » : sans ligne à moi, le
                  podium géant disparaît (les 3 premiers redeviennent des lignes). */}
              {!discreet && meRow === undefined ? (
                <Text style={styles.boardCaption}>{t(S.pasClasse)}</Text>
              ) : null}
              <BoardBody
                key={joueursBoard.id}
                rows={rows}
                board={joueursBoard}
                keyPrefix={joueursBoard.id}
                showPodium={discreet || meRow !== undefined}
                showAll={showAll}
                onSeeAll={() => setShowAll(true)}
              />
            </>
          ) : !onJoueurs ? (
            /* Villes et Crew : aucune source serveur. La matview `crew_leaderboard`
               n'est JAMAIS rafraîchie, et aucun agrégat inter-villes n'existe. Ce
               n'est pas « vide en attendant », c'est « pas ouvert » — et on dit
               laquelle des deux dimensions attend quoi, sans nommer une seule
               ville ni avancer un seul chiffre. */
            <BoardEmpty
              title={t(C.boardNoSourceTitle)}
              body={t(tab === 'ville' ? C.boardNoSourceVille : C.boardNoSourceCrews)}
            />
          ) : boardLoading ? (
            <Text style={styles.stateNote}>{t(C.boardLoading)}</Text>
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
          ) : boardStatus === 'city_unknown' ? (
            /* Connecté, mais `users.city_id` est NULL : aucune saison n'est LA
               sienne. La ville se rattache seule au premier run compté. */
            <BoardEmpty
              title={t(C.boardCityUnknownTitle)}
              body={t(C.boardCityUnknownBody)}
              cta={{ label: t(C.boardEmptyCta), onPress: () => router.push('/route-planner') }}
            />
          ) : boardStatus === 'unavailable' ? (
            /* La lecture a ÉCHOUÉ. État DISTINCT du vide : un réseau qui lâche ne
               prouve pas que la saison est déserte. */
            <BoardEmpty title={t(C.boardUnavailableTitle)} body={t(C.boardUnavailableBody)} />
          ) : (
            /* Lecture RÉUSSIE sur la saison de MA ville, et aucune ligne. */
            <BoardEmpty
              title={t(C.boardEmptyTitle)}
              body={t(C.boardEmptyBody)}
              cta={{ label: t(C.boardEmptyCta), onPress: () => router.push('/route-planner') }}
            />
          )}

          {/* ══════════ E12 · CARD RANG ══════════
              La planche montre « Argent II · 2 340/3 000 XP · Prochain jalon :
              Argent I ». Rien de tout ça n'existe : ni rangs nommés, ni XP. On
              garde la COMPOSITION (grand bouclier + libellé fort + jalon) et on la
              remplit avec le SEUL palier réel du jeu — les médailles Season Rank
              décernées à la clôture (top 100 / 50 / 10 / 3 / #1 / vainqueur).
              Le rang et les points ne sont PAS répétés ici : ma ligne ancrée les
              porte déjà en permanence (§A.20 « répète-t-il une info visible ? »).
              Pas de barre non plus : aucun dénominateur honnête n'existe entre deux
              paliers — l'écart se dit en PLACES, qui est un nombre exact.
              Affichée seulement si le board est réel et hors mode discret. */}
          {joueursIsReal && !discreet ? (
            <>
              <View style={styles.sectionHead}>
                <Icon name="bouclier" size={iconSizes.sm} color={colors.gris} />
                <Text style={styles.sectionLabel}>{t(S.rangSectionLabel)}</Text>
              </View>
              <View style={styles.rankCard}>
                <IconPlate
                  icon="bouclier"
                  size="lg"
                  color={standing.current ? BADGE_TIER_STYLE[standing.current.tier].ring : colors.gris}
                />
                <View style={styles.rankBody}>
                  {meRow === undefined ? (
                    <>
                      <Text style={styles.rankTitle}>{t(S.rangPasClasse)}</Text>
                      <Text style={styles.rankMeta}>{t(S.rangPasClasseBody)}</Text>
                    </>
                  ) : (
                    <>
                      {standing.current ? (
                        <>
                          {/* Rien n'est acquis avant la clôture : on le DIT. */}
                          <Text style={styles.rankKicker}>{t(S.standingKicker)}</Text>
                          <Text style={styles.rankTitle}>{tierLabel(standing.current, t)}</Text>
                        </>
                      ) : null}
                      {standing.next ? (
                        <Text style={standing.current ? styles.rankMeta : styles.rankTitle}>
                          {t(S.prochainPalier, { palier: tierLabel(standing.next, t) })}
                        </Text>
                      ) : null}
                      {standing.placesToNext !== null ? (
                        <Text style={styles.rankMeta}>
                          {standing.placesToNext === 1
                            ? t(S.placeAGagner)
                            : t(S.placesAGagner, { n: formatInt(standing.placesToNext) })}
                        </Text>
                      ) : standing.next ? (
                        <Text style={styles.rankMeta}>{tierCondition(standing.next, t)}</Text>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            </>
          ) : null}

          {/* ══════════ E12 · RÉCOMPENSES DE SAISON ══════════
              Les 3 anciennes cartes (« Badge Paris Race » avec Paris codé en dur,
              « Frame Tempo », « Coffre saison » au contenu défini nulle part) sont
              SUPPRIMÉES : elles promettaient des lots qui n'existent pas. La frise
              liste les paliers RÉELS de season_close, avec leur CONDITION en clair
              et le matériau (acier → chrome → titane → élite → or) du catalogue.
              Le statut « Obtenu » est LU dans `user_badges`, jamais re-dérivé. */}
          <View style={styles.sectionHead}>
            <Icon name="cadeau" size={iconSizes.sm} color={colors.gris} />
            <Text style={styles.sectionLabel}>{t(S.recompensesSaison)}</Text>
          </View>
          {badgeNote ? <Text style={styles.stateNote}>{t(badgeNote)}</Text> : null}
          <View style={styles.frieze}>
            {SEASON_REWARD_TIERS.map((tier, i) => (
              <SeasonTierRow
                key={tier.badgeKey}
                tier={tier}
                last={i === SEASON_REWARD_TIERS.length - 1}
                status={
                  badgesKnown ? (badges.unlockedIds.has(tier.badgeKey) ? 'earned' : 'locked') : null
                }
              />
            ))}
          </View>

          {/* E12-5 · RÈGLES DU RESET, en 2 lignes, sur la page.
              ⚠ La planche écrit « vos territoires et badges restent acquis ». C'est
              FAUX pour les territoires : `season_close` phase 2 fait le WIPE des
              hex_claims et des boucliers. On écrit ce que le moteur fait vraiment. */}
          <Text style={styles.resetRule}>{t(S.resetLigne1)}</Text>
          <Text style={styles.resetRule}>{t(S.resetLigne2)}</Text>
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

  // ── En-tête : kicker saison à gauche, décompte à droite ──
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 10,
    minHeight: fontSizes.xs + 4, // la ligne garde sa place même vide (loading)
  },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
  },
  deadline: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: colors.blanc, fontSize: fontSizes.xl, fontWeight: '700', letterSpacing: -0.5 },
  frozen: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xs,
  },

  // ── MA LIGNE ANCRÉE (sticky) ──
  // Fond OPAQUE obligatoire : les lignes de classement défilent dessous. Sans
  // ligne à moi, la bande reste à hauteur ZÉRO (aucun blanc fantôme sous le titre).
  stickyWrap: { backgroundColor: colors.noir },
  stickyWrapFilled: { paddingTop: 16, paddingBottom: spacing.xs },
  mineCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    padding: spacing.md,
    gap: spacing.xs,
  },
  mineTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mineRank: {
    color: colors.chartreuse,
    fontSize: fontSizes.lg,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  mineName: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  mineValueWrap: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xxs },
  mineValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  mineUnit: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.4 },
  mineGap: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },

  // ── Phrase-objectif + unique CTA chartreuse ──
  goalWrap: { gap: 10, marginBottom: spacing.xs },
  goalText: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
  },

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

  // ── Chips de proximité / sous-chips de spécialité ──
  tabsWrap: { marginTop: 18 },
  subTabsWrap: { marginTop: spacing.md },

  // ── Ligne d'état (lecture en cours, récompenses non chargées…) ──
  stateNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.sm,
  },

  /** Légende NOMMANT la ville du classement — une ligne, jamais tronquée (§A). */
  boardCaption: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.md,
    letterSpacing: 0.4,
  },

  // ── État vide d'un board : prend la place du podium ──
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
  // Anneau du podium : transparent partout, OR sur le #1 uniquement (or = #1,
  // chartreuse = moi — jamais une couleur par identité).
  // Bordure au TOKEN de fond (donc invisible) sur les colonnes 2 et 3 : elle
  // réserve la place de l'anneau pour que les trois avatars restent alignés.
  podiumRing: {
    padding: 3,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.noir,
  },
  podiumRingGold: { borderColor: gameColors.gold },
  podiumName: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
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
  // Marche : riser DISCRET posé sur l'espace, sans contour ni card. Le fond carto
  // à 35 % de la planche est OMIS : aucune carte n'est rendue sur cet écran, et un
  // fond générique qui ne serait pas la vraie ville serait une fabrication.
  podiumStep: {
    alignSelf: 'stretch',
    marginTop: 6,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    backgroundColor: elevation.surface,
    alignItems: 'center',
    paddingTop: spacing.xs,
  },

  // ── Lignes hors podium ──
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
    fontFamily: fonts.textSemi,
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
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  // ≥ 12 px partout (accessibilité) — jamais de label sous fontSizes.xs.
  rowValueLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.4 },

  // ── « Voir tout » : action LÉGÈRE (§3), pas une card bordée ──
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
    fontFamily: fonts.textSemi,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  seeAllCount: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // ── Sections E12 ──
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },

  // ── Card RANG (une seule couche de container : la plaque d'icône est N2) ──
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
  },
  rankBody: { flex: 1, gap: 2 },
  rankKicker: { color: colors.grisFaible, fontSize: fontSizes.xs, letterSpacing: 0.4 },
  rankTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rankMeta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
  },

  // ── Frise VERTICALE des paliers : rail + lignes posées sur l'espace ──
  frieze: { marginTop: 2 },
  tierRow: { flexDirection: 'row', gap: spacing.sm },
  tierRail: { alignItems: 'center', width: 32 },
  tierDot: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.surface,
  },
  // Le fil qui relie les paliers : filet discret, jamais un cadre.
  tierLine: { flex: 1, width: 1, backgroundColor: colors.grisLigne, marginVertical: 4 },
  tierBody: { flex: 1, paddingBottom: spacing.md, gap: 2 },
  tierName: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tierCondition: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
  },
  tierStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingTop: 2 },
  tierStatusLabel: { color: colors.grisFaible, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  tierStatusEarned: { color: colors.blanc },

  // ── Règles du reset : deux lignes de texte, posées sur l'espace ──
  resetRule: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.sm,
  },
});
