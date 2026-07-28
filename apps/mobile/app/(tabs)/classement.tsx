/**
 * GRYD — onglet SAISON = planches E11 « Classement local » + E12 « Saison & rang »
 * (recalage Claude Design, 25/07/2026). Les deux planches vivent dans CE fichier :
 * il n'existe pas d'écran E12 séparé, et en créer un ajouterait une entrée de
 * navigation que la planche ne demande pas.
 *
 * ORDRE DE LECTURE (E11 haut → E12 bas) :
 *   1. EN-TÊTE — « SAISON {n} » RÉEL (season_current) + décompte RÉEL « Se termine
 *      dans {n} j ». Aucun numéro figé, aucune échéance devinée.
 *   2. MA LIGNE ANCRÉE (sticky) — « #{rang} · [avatar] {pseudo} · {surface} » + barre
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
 * ─── L'AXE EST LA SURFACE, PLUS LES POINTS (E53 §10.1, 28/07/2026) ───────────
 * Cet écran classait en POINTS (`season_scores` via `player_leaderboard`). La
 * spec §10.1 dit « surface contrôlée validée » ; le point est l'axe de
 * PROGRESSION (§10.5) et un rang en points est OPAQUE — le joueur ne peut pas
 * le relier à ce qu'il voit sur la carte. Les valeurs affichées (lignes, podium,
 * ma ligne ancrée, écart) sont désormais des SURFACES, dans une unité UNIQUE
 * pour tout le tableau (m² ou km², choisie sur la plus grande valeur, jamais un
 * arrondi qui ferait disparaître une surface réelle derrière « 0 » — sous ce
 * seuil, `formatSurface` écrit « < 0,01 ». Ce plancher a été POSÉ le
 * 28/07/2026 : la garantie était écrite ici avant que le code la tienne).
 * L'égalité suit les TROIS critères de §10.2 disponibles, pas la seule valeur
 * affichée : deux joueurs à surface égale que leurs défenses séparent ne portent
 * pas la mention « ex æquo ». Le 4ᵉ critère (snapshot précédent) n'existe pas —
 * une égalité parfaite RESTE une égalité, et l'écran la nomme.
 *
 * ─── CE QUE LA PLANCHE MONTRE ET QUE LE CODE NE TIENT PAS (donc OMIS) ─────────
 * Un contrôle sans backing réel est un bouton mort ; une valeur sans source est
 * un mensonge. Sont volontairement ABSENTS, chacun commenté à son emplacement :
 *  · le sélecteur de période « Semaine ▾ » — aucune agrégation hebdomadaire
 *    n'existe (season_scores est cumulatif sur la saison) ;
 *  · les chips « Autour de moi », « Quartier », « Amis » — aucune vue de
 *    classement par secteur/quartier, aucun board d'amis ;
 *  · les photos rondes du podium — la source du classement ne rend qu'un pseudo
 *    et des mesures, et les photos de profil ne quittent JAMAIS le téléphone
 *    (avatarPhoto.ts). Les km² par joueur, EUX, EXISTENT DEPUIS LE 28/07/2026 :
 *    ils SONT l'axe du classement (§10.1, migration 0091) ;
 *  · la colonne « crew » et la variation « ▲2 / ▼1 » — aucune jointure crew, et
 *    aucun SNAPSHOT de classement n'est pris (§10.3, suspens 1 de la migration
 *    0082) : un « ▲2 » sans rang antérieur réel serait une flèche inventée ;
 *  · le sélecteur « Semaine / Saison » — les bornes de période existent côté
 *    serveur, mais elles ne bornent que les DÉPARTAGES (défenses, conquête) ;
 *    la métrique principale est la surface tenue MAINTENANT. Un contrôle dont
 *    l'effet serait invisible est un contrôle qui ment ;
 *  · le fond carto derrière le podium — aucune carte n'est rendue ici, et un fond
 *    générique qui ne serait pas la vraie ville serait une fabrication de plus ;
 *  · le rang nommé « Argent II » + « 2 340/3 000 XP » + le moment « PASSAGE DE
 *    RANG » — il n'existe ni rangs nommés, ni XP, ni snapshot de rang antérieur :
 *    une célébration qui ne se déclenche jamais est un bouton mort animé.
 *
 * ─── COMMUTATEUR RUN / BIKE (planche E14, propagé le 25/07/2026) ─────────────
 * Cette liste portait « la mention "· Run" (rangs Run/Bike séparés) — le vélo
 * n'existe pas ». LA MOITIÉ DE CE CONSTAT A SAUTÉ : les rangs SONT désormais
 * séparés en base (`season_scores` a une colonne `activity` et une clé
 * (saison, joueur, discipline) — migration 0070), et la lecture est bornée à UNE
 * discipline (`useSeasonLeaderboard(activity)`). Le commutateur est donc dans le
 * titre, à droite : visible seulement si Bike est activé, RETIRÉ (jamais grisé)
 * pendant une course, lentille mémorisée POUR CET ONGLET (`useActivityLens`,
 * clé `gryd.activity.classement`) et mise EN VEILLE le temps d'une course —
 * sinon un joueur resté en Bike se retrouverait devant un état vide qu'aucun
 * contrôle visible ne pourrait quitter.
 *
 * IL BASCULE UNE VRAIE LECTURE, PAS UNE ÉTIQUETTE. En lentille Bike, le board
 * lu est celui de la discipline `bike`. Jusqu'au 26/07/2026 il revenait
 * NÉCESSAIREMENT vide (aucun chemin de départ ne déclarait le vélo) ; ce n'est
 * plus le cas — le vélo enregistre, et ce classement affiche ses lignes dès
 * qu'un joueur de la ville en a. Son état vide garde une copie DISTINCTE de
 * celle du monde course, non plus parce que la cause diffère (elle est
 * désormais la même : personne n'a encore de points) mais parce que L'ACTION
 * diffère — « lance une sortie vélo », et le CTA déclare cette discipline au
 * lieu de la deviner.
 *
 * CE QUI SE RETIRE EN LENTILLE BIKE, ET POURQUOI (§ séparation stricte : jamais
 * Run + Bike dans une même lecture compétitive, jamais de somme) :
 *  · la chip « Spécialités » — la vue `specialty_leaderboard` s'appuie sur
 *    `user_stats`, MONO-POT (0070 « en suspens » §2). Ses compteurs mélangent
 *    les disciplines ; les servir sous une étiquette vélo serait exactement la
 *    somme interdite. On retire la chip plutôt que de la griser : l'absence d'un
 *    contrôle n'est pas un mensonge, un contrôle qui ment en est un ;
 *  · le bloc E12 (rang de fin de saison + frise des récompenses) — son statut
 *    « Obtenu » est lu dans `user_badges`, mono-pot lui aussi (0070 §3).
 *
 * ─── CE QUI A CESSÉ DE SE RETIRER : « MA ROUTE » (26/07/2026) ─────────────────
 * Ce CTA a été retiré en lentille vélo tant que le planificateur codait en dur
 * l'instance OSRM `routed-foot` : proposer « MA ROUTE » à un cycliste lui
 * promettait alors une boucle à l'échelle du piéton. CE MOTIF EST MORT —
 * `features/route/liveRouting.ts` construit son endpoint depuis
 * `plannerRoutingProfile(activity)`, et `/route-planner` borne ses distances sur
 * `plannerBounds(activity)`.
 *
 * Restait la vraie raison de ne PAS le rouvrir tel quel : cet écran poussait
 * `/route-planner` SANS paramètre, et le planificateur retombe alors par défaut
 * sur la course à pied (`parseStartActivity`, lecture défensive). Un cycliste y
 * aurait ouvert un planificateur de COURSE — le mensonge déplacé d'un cran, pas
 * supprimé. On pousse donc `plannerHref(activity)` : la discipline VOYAGE, et le
 * CTA existe dans les deux mondes parce qu'il tient sa promesse dans les deux.
 *
 * Ni le libellé ni la phrase-objectif n'ont eu besoin d'un jumeau : « MA ROUTE »,
 * « DÉFENDRE » et « ≈ n zones pour passer X » ne NOMMENT aucun effort. Dupliquer
 * une clé déjà neutre créerait deux vérités à maintenir.
 *
 * ─── UN CLASSEMENT EST RÉEL, OU IL N'EST PAS (21/07/2026, toujours en vigueur) ─
 *  · Ma ville — affiché UNIQUEMENT si `source === 'server'`. Sinon l'un des états
 *    honnêtes (lecture en cours · pas connecté · ville non rattachée · échec · vide).
 *  · Villes — AUCUNE source serveur : aucun agrégat inter-villes n'existe. On dit
 *    « pas encore ouvert », on ne fait pas patienter devant un faux podium. Nommer
 *    une dimension du jeu et DIRE qu'elle n'est pas ouverte est un constat vrai —
 *    c'est fabriquer des villes, des rangs ou des rivaux qui serait le mensonge
 *    (CLAUDE.md, zéro donnée européenne factice).
 *  · Crew — A UNE SOURCE DEPUIS LE 27/07/2026 (migration 0086). La matview
 *    `crew_leaderboard` était jusque-là rafraîchie par AUCUN job du dépôt (l'appel
 *    n'existait que dans un commentaire de 0002, constat 0044) ; elle l'est
 *    désormais, et chaque passage est horodaté. L'onglet est donc branché
 *    (`CrewBoardSection`) — MAIS la base est vide, donc il rendra une liste vide.
 *    Deux vides que rien ne doit refondre : « GRYD n'a pas encore calculé »
 *    (`never_refreshed`) et « calculé, personne ne tient de terrain ici »
 *    (`empty`). Aucun crew, aucun rang, aucune ville n'est fabriqué dans un cas
 *    comme dans l'autre.
 */
import { flags } from '../../src/lib/flags';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BADGE_TIER_STYLE,
  colors,
  fonts,
  elevation,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  seasonProgress,
  sizes,
  spacing,
  type Activity,
} from '@klaim/shared';
import { C } from '../../src/i18n/catalog/flagged';
import { C as S } from '../../src/i18n/catalog/saison';
import { useLocale, useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { useMotivationPrefs } from '../../src/features/motivation/store';
import { TAB_CONTENT_BOTTOM_CLEARANCE } from '../../src/features/nav/metrics';
// ── Guideline 1.2 : le classement est la 2ᵉ surface qui affiche le pseudo d'un
// tiers. Bloquer y agit (le pseudo devient « Joueur bloqué », la ligne garde son
// rang) et signaler part d'ici, pré-rempli. La copie de modération vit dans le
// catalogue `crew` avec le code qui la sert — une seule source pour les deux
// surfaces, sinon elles se contrediraient au premier correctif.
import { C as CMod } from '../../src/i18n/catalog/crew';
import {
  PlayerActionsButton,
  PlayerModerationSheet,
  useBlockedPseudos,
} from '../../src/features/crew/PlayerModerationSheet';
import { canModeratePlayer, displayedPseudo } from '../../src/features/crew/blocklist';
import {
  useSeasonLeaderboard,
  useSpecialtyLeaderboard,
  type Specialty,
  type SpecialtyLeaderboard,
} from '../../src/features/social/leagueBoard';
import { useActiveSeason } from '../../src/features/season/useActiveSeason';
import {
  leagueGap,
  rowAboveMe,
  withTiedRanks,
  type RankedLeagueRow,
} from '../../src/features/season/leagueRanking';
import { seasonStanding } from '../../src/features/season/seasonRewards';
// `tierLabel` / `tierCondition` vivaient ICI. Ils sont partis avec la frise dans
// le composant partagé, pour qu'E53 et E59 nomment un palier de la MÊME façon.
import { tierCondition, tierLabel } from '../../src/features/season/SeasonTierList';
// E54 — le classement des CREWS a enfin une source (migration 0086 :
// `crew_leaderboard` est rafraîchie pour de vrai, et `crew_board()` sait REFUSER
// une vue jamais calculée). La lecture est pure et testée en Deno
// (`features/crew/stats.ts`), le câblage n'a rien à décider.
import { useCrewBoard } from '../../src/features/crew/statsData';
import { useMyProfile } from '../../src/features/social/profileStore';
import type { LeagueBoard } from '../../src/features/social/league';
// E53 §10.1 — l'axe du classement est la SURFACE. Le formatage (unité unique du
// tableau, séparateur décimal localisé) vit dans un module PUR testé en Deno :
// l'écran n'invente ni arrondi ni unité.
import { formatSurface, surfaceUnitLabel } from '../../src/features/social/surfaceBoard';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { screen } from '../../src/lib/analytics';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { IconPlate } from '../../src/ui/Card';
import { ActivitySwitch, useActivityLens } from '../../src/ui/ActivitySwitch';
import { startSortieHref } from '../../src/ui/activityLens';
import { competitiveReadAllowed } from '../../src/ui/activityLens';
// La cible du planificateur est CONSTRUITE, jamais écrite à la main : le même
// helper pur (testé sous Deno) sert la Carte et cet écran, donc la discipline
// voyage par UN seul contrat de paramètre au lieu de deux chaînes divergentes.
import { plannerHref } from '../../src/features/route/startTargets';
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

/**
 * MODÉRATION D'UNE LIGNE — ce que les lignes de classement doivent savoir de
 * mes blocages, passé en UN objet plutôt qu'en trois props à chaque étage.
 */
interface RowModeration {
  /** Pseudos bloqués, forme de comparaison (mémoïsée une fois par écran). */
  blocked: ReadonlySet<string>;
  /** Le signalement part-il vraiment ? (session requise, cf. moderation.ts) */
  canReport: boolean;
  /** Ouvre la feuille { Signaler · Bloquer } pré-remplie sur ce pseudo. */
  onModerate: (pseudo: string) => void;
}

/** Visuel de rang : avatar joueur (défaut) ou blason crew. */
function RowVisual({ row, board, big = false, name }: {
  row: RankedLeagueRow;
  board: LeagueBoard;
  big?: boolean;
  /**
   * Nom AFFICHÉ (déjà masqué si le joueur est bloqué) : les initiales en
   * dérivent, sinon un joueur bloqué reviendrait par sa pastille — « K.R »
   * suffit à le reconnaître dans un classement de sa propre ville.
   */
  name: string;
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
  return <PlayerAvatarFrame name={name} size={big ? 'l' : 's'} isMe={row.me === true} />;
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
function Podium({
  rows,
  board,
  mod,
}: {
  rows: readonly RankedLeagueRow[];
  board: LeagueBoard;
  mod: RowModeration;
}) {
  const t = useT();
  const slide = useSlideIn(14);
  const steps = [56, 84, 42];
  // Ordre d'affichage : 2ᵉ, 1ᵉʳ, 3ᵉ (le centre est la marche haute).
  const cols = [rows[1], rows[0], rows[2]];
  return (
    <Animated.View
      style={[styles.podium, { opacity: slide.opacity, transform: [{ translateY: slide.translateY }] }]}
    >
      {cols.map((row, i) => {
        if (!row) {
          return <View key={`podium-vide-${i}`} style={styles.podiumCol} />;
        }
        const shown = displayedPseudo(mod.blocked, row.name, t(CMod.blockedPlayerRow));
        // Le podium PORTE aussi l'affordance : c'est là que se trouvent les
        // joueurs les plus exposés, et les laisser hors d'atteinte rendrait le
        // mécanisme de signalement partiel — donc absent aux yeux de la 1.2.
        const canModerate = canModeratePlayer({
          pseudo: row.name,
          isMe: row.me === true,
          canReport: mod.canReport,
          blocked: mod.blocked,
        });
        return (
          <View key={`podium-${i}`} style={styles.podiumCol}>
            {/* COURONNE DU #1 (planche E11 « couronne sur #1 ») : l'icône `couronne`
                du catalogue @klaim/shared, remplie OR — or = #1 uniquement, jamais
                une couleur par identité, exactement la règle de l'anneau doré. Rien
                à réserver sur les colonnes 2 et 3 : la rangée est alignée par le BAS
                (`flex-end`), la couronne ne fait que dépasser au-dessus de la marche
                haute sans déplacer les trois avatars. La même condition `rank === 1`
                que `podiumRingGold` : couronne et anneau s'accordent toujours, y
                compris sur un #1 ex æquo (deux #1 → deux couronnes, comme les rangs). */}
            {row.rank === 1 ? (
              <View style={styles.podiumCrown}>
                <Icon name="couronne" size={iconSizes.md} color={gameColors.gold} active />
              </View>
            ) : null}
            <View style={[styles.podiumRing, row.rank === 1 && styles.podiumRingGold]}>
              <RowVisual row={row} board={board} big={row.rank === 1} name={shown} />
            </View>
            <Text
              style={[styles.podiumName, shown !== row.name && styles.nameBlocked]}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {shown}
              {row.me === true ? t(meSuffix(board)) : ''}
            </Text>
            {/* `valueText` = valeur déjà formatée dans l'unité du tableau (E53 :
                m² ou km², séparateur décimal localisé). Absent sur les boards qui
                comptent des entiers (spécialités) : on retombe sur `formatInt`. */}
            <Text style={styles.podiumValue}>{row.valueText ?? formatInt(row.value)}</Text>
            {/* Hauteur RÉSERVÉE, occupée ou non : sans elle, la colonne qui ne
                porte pas l'action (la mienne) ferait remonter sa marche, et le
                podium ne serait plus aligné. */}
            <View style={styles.podiumActions}>
              {canModerate ? (
                <PlayerActionsButton name={shown} onPress={() => mod.onModerate(row.name)} />
              ) : null}
            </View>
            <View style={[styles.podiumStep, { height: steps[i] ?? 42 }]}>
              <LeagueMedal rank={row.rank} size={40} />
            </View>
          </View>
        );
      })}
    </Animated.View>
  );
}

/** Ligne de classement standard (hors podium), MA ligne ancrée chartreuse. */
function BoardRow({
  row,
  board,
  mod,
}: {
  row: RankedLeagueRow;
  board: LeagueBoard;
  mod: RowModeration;
}) {
  const t = useT();
  /**
   * B3 — LA LIGNE RESTE, L'IDENTITÉ PART. Retirer la ligne d'un joueur bloqué
   * décalerait d'un cran tout le monde en dessous (le rang est dérivé de
   * l'ordre serveur) : le classement affiché ne serait plus celui de la saison,
   * et le joueur croirait à un bug plutôt qu'à sa propre décision.
   */
  const shown = displayedPseudo(mod.blocked, row.name, t(CMod.blockedPlayerRow));
  const canModerate = canModeratePlayer({
    pseudo: row.name,
    isMe: row.me === true,
    canReport: mod.canReport,
    blocked: mod.blocked,
  });
  return (
    <>
      {row.gapBefore === true ? <Text style={styles.ellipsis}>···</Text> : null}
      <View style={[styles.row, row.me === true && styles.rowMe]}>
        <Text style={[styles.rank, row.me === true && styles.rankMe]}>{row.rank}</Text>
        <RowVisual row={row} board={board} name={shown} />
        <View style={styles.rowInfo}>
          <Text
            style={[
              styles.rowName,
              row.me === true && styles.rowNameMe,
              shown !== row.name && styles.nameBlocked,
            ]}
            numberOfLines={1}
            ellipsizeMode="clip"
          >
            {shown}
            {row.me === true ? t(meSuffix(board)) : ''}
          </Text>
          {/* ÉGALITÉ dite en TEXTE (jamais une nuance de couleur) : deux joueurs à
              mesures égales (§10.2) partagent le rang, comme à la clôture serveur. La
              colonne « crew » de la planche reste vide — aucune source ne la
              remplit (player_leaderboard ne joint pas crew_members). */}
          {row.tied ? (
            <Text style={styles.rowSub} numberOfLines={1} ellipsizeMode="clip">
              {t(S.exAequo)}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowValueWrap}>
          <Text style={styles.rowValue}>{row.valueText ?? formatInt(row.value)}</Text>
          <Text style={styles.rowValueLabel}>{board.valueLabel}</Text>
        </View>
        {/* B4 — l'affordance qui manquait : « … » gris, jamais chartreuse (le
            seul CTA chartreuse de l'écran reste « MA ROUTE », §A4). */}
        {canModerate ? (
          <PlayerActionsButton name={shown} onPress={() => mod.onModerate(row.name)} />
        ) : null}
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
  note,
  cta,
}: {
  title: string;
  body: string;
  /** Seconde ligne FACTUELLE (ex. la séparation stricte Run/Bike). */
  note?: string;
  cta?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {note !== undefined ? <Text style={styles.emptyBody}>{note}</Text> : null}
      {cta ? (
        <View style={styles.emptyCta}>
          <Button label={cta.label} onPress={cta.onPress} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * E54 — CLASSEMENT DES CREWS. Le seul board de cet écran qui ne passe PAS par
 * `BoardBody` : il ne classe pas des joueurs mais des équipes, et la planche lui
 * demande d'autres colonnes (crews ; membres ; surface). Un podium à trois
 * marches n'aurait rien à mettre dessus — un crew n'a ni avatar ni médaille.
 *
 * ═══ CE QUI A CHANGÉ LE 27/07/2026, ET CE QUI N'A PAS CHANGÉ ═══════════════
 * Jusqu'ici cet onglet affichait `boardNoSourceCrews` (« pas encore ouvert »),
 * et c'était VRAI : la matview `crew_leaderboard` n'était rafraîchie par aucun
 * job du dépôt — l'appel n'existait que dans un commentaire de 0002, constat
 * posé par 0044. La migration 0086 la rafraîchit pour de bon (via
 * `recompute_sectors`, déjà planifié) et horodate chaque passage.
 *
 * CE QUI N'A PAS CHANGÉ : la base est VIDE. Aucun crew réel n'existe, donc ce
 * board rendra une liste vide. C'est le bon comportement, et il est DIT avec ses
 * propres mots (`crewBoardEmpty`) — jamais avec ceux de « pas encore ouvert ».
 * Les deux vides ne racontent pas la même chose :
 *   · `never_refreshed` → GRYD n'a pas encore calculé. Un fait sur GRYD ;
 *   · `empty`           → calculé, personne ne tient de terrain ici. Un fait sur
 *                         le MONDE.
 * Les fondre transformerait un job absent en jugement sur les joueurs.
 *
 * ═══ CE QUE CE BOARD NE MONTRE PAS ════════════════════════════════════════
 * LA « PROGRESSION » de la planche. Elle exige de comparer au relevé précédent,
 * donc les snapshots de 0082 — dont personne ne prend encore. Une flèche
 * fabriquée serait pire qu'une flèche absente ; les clés i18n
 * `crewProgressUp/Down/Unknown` attendent leur source sans être rendues.
 */
function CrewBoardSection({
  activity,
  configured,
}: {
  activity: Activity;
  /** Un backend est-il configuré ? Sans lui, « se connecter » est un bouton mort. */
  configured: boolean;
}) {
  const t = useT();
  const board = useCrewBoard(activity);

  // Un état = une phrase. Aucune ne se substitue à une autre.
  switch (board.status) {
    case 'loading':
      // Un chargement n'affirme RIEN sur les crews.
      return <Text style={styles.stateNote}>{t(C.boardLoading)}</Text>;
    case 'signed_out':
      return (
        <BoardEmpty
          title={t(C.boardSignedOutTitle)}
          body={t(C.boardSignedOutBody)}
          {...(configured
            ? { cta: { label: t(C.boardSignIn), onPress: () => router.push('/sign-in') } }
            : {})}
        />
      );
    case 'city_unknown':
      // Connecté, mais aucune ville rattachée : il n'y a pas de « crews d'ici ».
      return (
        <BoardEmpty
          title={t(C.boardCityUnknownTitle)}
          body={t(C.boardCityUnknownBody)}
          cta={{ label: t(C.boardEmptyCta), onPress: () => router.push('/route-planner') }}
        />
      );
    case 'never_refreshed':
      // GRYD n'a jamais calculé ce classement — la phrase historique, et elle
      // reste EXACTE dans ce cas précis (job non déployé, par exemple).
      return <BoardEmpty title={t(C.boardNoSourceTitle)} body={t(C.boardNoSourceCrews)} />;
    case 'unavailable':
      // La lecture a ÉCHOUÉ : une panne ne prouve pas que la ville est déserte.
      return <BoardEmpty title={t(C.boardUnavailableTitle)} body={t(C.boardUnavailableBody)} />;
    case 'empty':
      return (
        <BoardEmpty
          title={t(C.boardNoSourceTitle)}
          body={t(C.crewBoardEmpty)}
          // La DATE survit au vide : « rien, mesuré à telle heure » est plus
          // honnête que « rien ».
          {...(board.refreshedAt !== null
            ? { note: t(C.crewBoardAsOf, { time: asOfLabel(board.refreshedAt) }) }
            : {})}
        />
      );
    case 'ready':
      break;
  }

  const truncated = board.rankedTotal > board.rows.length;
  return (
    <View>
      {/* Portée : la ville, jamais le monde (§10). Sans nom en base, pas de
          légende — un « Paris » par défaut serait une ville inventée. */}
      {board.cityName !== null ? (
        <Text style={styles.boardCaption}>
          {t(C.crewBoardScope, { city: board.cityName })}
        </Text>
      ) : null}

      {board.rows.map((row) => (
        <View
          key={row.crewId}
          style={[styles.crewRow, row.crewId === board.myCrewId && styles.crewRowMine]}
          accessibilityLabel={t(C.crewRowA11y, {
            rank: formatInt(row.rank),
            name: row.name,
            members: formatInt(row.membersActive),
            zones: formatInt(row.zonesHeld),
          })}
        >
          <Text style={styles.crewRank}>{formatInt(row.rank)}</Text>
          <View style={styles.crewIdentity}>
            {/* Une seule ligne, jamais tronquée par « … » (§A.9). */}
            <Text style={styles.crewName} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={styles.crewMeta}>
              {`${t(C.crewColMembers)} ${formatInt(row.membersActive)}`}
            </Text>
          </View>
          {/* « Zones », jamais « hexagones » (constitution §6). */}
          <Text style={styles.crewZones}>{formatInt(row.zonesHeld)}</Text>
        </View>
      ))}

      {truncated ? (
        <Text style={styles.stateNote}>
          {t(C.crewBoardTruncated, { n: formatInt(board.rows.length) })}
        </Text>
      ) : null}

      {/* MON CREW, épinglé — planche E54 « crew utilisateur sticky ». Trois cas,
          trois phrases : pas de crew · crew non classé · crew classé (déjà
          surligné dans la liste, donc rien à répéter). */}
      {board.myCrewId === null ? (
        <Text style={styles.stateNote}>{t(C.crewStickyNoCrew)}</Text>
      ) : board.myRank === null ? (
        <Text style={styles.stateNote}>{t(C.crewStickyUnranked)}</Text>
      ) : null}

      {board.refreshedAt !== null ? (
        <Text style={styles.stateNote}>
          {t(C.crewBoardAsOf, { time: asOfLabel(board.refreshedAt) })}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Heure du dernier calcul, format court local. Si l'horodatage n'est pas
 * parsable on rend la chaîne BRUTE : un classement daté « à l'instant » par
 * défaut serait exactement le mensonge que 0086 vient de rendre impossible.
 */
function asOfLabel(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/**
 * CORPS D'UN BOARD : podium + liste fenêtrée. Partagé par « Ma ville » et
 * « Spécialités » — un seul rendu, donc une seule règle de podium.
 *
 * `showPodium` porte la règle psychologique de la planche : un joueur NON classé
 * ne doit JAMAIS voir un podium géant au-dessus de lui (« 12 km² / toi : rien »).
 * Dans ce cas les 3 premiers redescendent en lignes ordinaires.
 */
function BoardBody({
  rows,
  board,
  keyPrefix,
  showPodium,
  showAll,
  onSeeAll,
  mod,
}: {
  rows: readonly RankedLeagueRow[];
  board: LeagueBoard;
  keyPrefix: string;
  showPodium: boolean;
  showAll: boolean;
  onSeeAll: () => void;
  mod: RowModeration;
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
      {podiumRows.length > 0 ? <Podium rows={podiumRows} board={board} mod={mod} /> : null}
      <View style={styles.list}>
        {showLeadEllipsis ? <Text style={styles.ellipsis}>···</Text> : null}
        {visibleRows.map((row, i) => (
          <BoardRow key={`${keyPrefix}-${row.rank}-${i}`} row={row} board={board} mod={mod} />
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
  mod,
}: {
  specialty: Specialty;
  onSpecialty: (s: Specialty) => void;
  spec: SpecialtyLeaderboard;
  discreet: boolean;
  signedIn: boolean;
  configured: boolean;
  mod: RowModeration;
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
            mod={mod}
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
  // LENTILLE de CET onglet (planche E14, « mémorisé par onglet ») + éligibilité
  // du commutateur (flags.bike, retiré pendant une course).
  const { activity, setActivity, switchVisible } = useActivityLens('classement');
  const bike = activity === 'bike';

  /**
   * Chips de proximité RENDUES. « Spécialités » disparaît en lentille Bike : sa
   * source (`specialty_leaderboard` → `user_stats`) est MONO-POT, donc son
   * contenu mélange les disciplines. La règle est dérivée, pas écrite à la main
   * (`competitiveReadAllowed`, testée) : le jour où `user_stats` sera discipliné,
   * un seul `true` rouvrira la chip.
   */
  const shownTabs = useMemo(
    () =>
      PRIMARY_TABS.filter((o) => o.id !== 'specialites' || competitiveReadAllowed(activity, false)),
    [activity],
  );
  const tabOptions = useMemo(
    () => shownTabs.map((o) => ({ id: o.id, label: t(o.label) })),
    [shownTabs, t],
  );

  /**
   * Onglet EFFECTIVEMENT rendu. Basculer en Bike alors qu'on regardait
   * « Spécialités » laisserait sélectionné un onglet qui n'est plus proposé.
   * On le corrige au RENDU, pas seulement dans l'effet ci-dessous : un effet
   * s'exécute APRÈS la peinture, et cette frame-là aurait affiché des compteurs
   * mono-pot sous une étiquette vélo. Une trame de mensonge reste un mensonge.
   */
  const activeTab: PrimaryTab = shownTabs.some((o) => o.id === tab) ? tab : 'joueurs';

  // L'effet ne fait que RANGER l'état derrière ce que le rendu montre déjà
  // (et remet la liste en vue compacte, cohérente avec un board qui change).
  useEffect(() => {
    if (activeTab !== tab) {
      setTab(activeTab);
      setShowAll(false);
    }
  }, [activeTab, tab]);

  useEffect(() => {
    screen('classement');
  }, []);

  /**
   * Board de MA ville (saison active) — jamais celui d'une autre ville, et
   * jamais deux disciplines mélangées : la lecture est bornée à la lentille
   * courante (`p_activity` de la RPC `city_player_surface_board`, migration
   * 0091 — cf. leagueBoard.ts). Les VALEURS sont des SURFACES en m² (§10.1),
   * plus des points ; `surfaceUnit` dit dans quelle unité le tableau les rend.
   * `boardStatus` porte l'état EXACT de la lecture (chargement / pas de compte /
   * ville non rattachée / échec / vide / prêt).
   */
  const {
    joueursBoard,
    source,
    loading: boardLoading,
    status: boardStatus,
    cityName: boardCityName,
    surfaceUnit,
  } = useSeasonLeaderboard(activity);
  const locale = useLocale();
  const { session, configured } = useSession();
  const signedIn = configured && session !== null;

  /**
   * MODÉRATION (Guideline 1.2 — audit B3/B4). Un seul objet descendu dans les
   * lignes : la liste des bloqués (le classement les MASQUE sans les retirer),
   * la capacité RÉELLE de signaler (session requise : `reportContent` n'écrit
   * dans `content_reports` que sous session), et l'ouverture de la feuille
   * pré-remplie.
   */
  const blockedPseudos = useBlockedPseudos();
  const [moderationTarget, setModerationTarget] = useState<string | null>(null);
  const mod = useMemo<RowModeration>(
    () => ({
      blocked: blockedPseudos,
      canReport: signedIn,
      onModerate: (pseudo: string) => setModerationTarget(pseudo),
    }),
    [blockedPseudos, signedIn],
  );

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

  // ÉCART vers la place au-dessus — dérivation PURE (leagueGap, testée sous Deno) :
  // points d'écart, conversion en zones pour la phrase-objectif, remplissage 0..1
  // de la barre (mes points rapportés à ceux du dessus, aucune échelle inventée,
  // rien du tout si personne n'est devant) et « suis-je en tête ». Un seul contrat
  // pour l'écran et son test, plus d'arithmétique dispersée dans le rendu.
  // `gapPoints` porte ici un écart de SURFACE (m²) : depuis E53 la valeur d'une
  // ligne EST la surface contrôlée. Le 3ᵉ argument (points par zone neutre) ne
  // sert qu'à la conversion « écart → zones », qui n'a plus de sens sur des m² —
  // estimer un nombre de zones exigerait une aire de zone MOYENNE que rien ne
  // mesure. On passe donc 0, `gapHexes` vaut 0 et n'est plus lu : l'écart est dit
  // dans l'unité du tableau, jamais habillé en une estimation inventée.
  const { gapPoints: gapAreaM2, gapRatio, isLeader } = leagueGap(meRow, aboveRow, 0);
  // Écart affiché : même unité que les lignes, séparateur décimal de la langue.
  const gapSurfaceText = `${formatSurface(gapAreaM2, surfaceUnit, locale)} ${surfaceUnitLabel(surfaceUnit)}`;
  /**
   * ── ÉCART NUL : LA PHRASE GÉNÉRIQUE Y ÉTAIT ABSURDE (28/07/2026) ──────────
   * §10.2 départage sur trois critères, et `surfaceTieKey` en tire la
   * conséquence : deux joueurs à surface ÉGALE que leurs défenses séparent ont
   * DEUX rangs distincts (ils ne sont pas ex æquo). `leagueGap` rend alors
   * `gapPoints = 0`, et l'écran écrivait « 0,00 km² pour passer #3 » — un
   * objectif inatteignable par construction, pas un cas limite improbable.
   * Ce booléen aiguille vers la phrase qui dit la vérité de la situation.
   */
  const gapIsTie = aboveRow !== undefined && gapAreaM2 === 0;

  const onJoueurs = activeTab === 'joueurs';
  // Ma ligne ancrée est DÉRIVÉE du board de ma ville : elle n'apparaît que sur cet
  // onglet (jamais figée au-dessus d'un podium Crew) et jamais en mode discret.
  const showMine = !discreet && onJoueurs && meRow !== undefined;

  // ── MODE DISCRET §10.3 — CE FILTRE N'EST QUE LA MOITIÉ VISIBLE ────────────
  // Ce commentaire affirmait « je n'apparais JAMAIS dans un leaderboard global »
  // au-dessus d'un filtre CLIENT portant sur MA seule ligne, sur MON seul écran.
  // C'était faux dans le sens qui compte : ma ligne partait quand même à tous
  // les autres clients. Depuis le 28/07/2026, la RPC `city_player_surface_board`
  // lit `user_profiles.discreet_mode` et retire la ligne pour TOUT LE MONDE
  // (migration 0092), et l'interrupteur écrit réellement cette colonne
  // (`features/motivation/discreetSync.ts`, qui DIT quand l'écriture échoue).
  // Ce filtre-ci reste utile et n'est plus un mensonge : il couvre l'instant où
  // le serveur n'a pas encore vu le réglage (écriture en vol, cache de lecture,
  // ou compte sans ligne `user_profiles`). Il ne PROMET plus rien à lui seul.
  const rows = discreet ? rankedRows.filter((r) => r.me !== true) : rankedRows;
  const showBoardRows = onJoueurs && joueursIsReal;

  // ── Palier de fin de saison RÉEL (season_close) — PROVISOIRE tant que la
  //    saison court, et l'écran le dit (`standingKicker`). La LECTURE des badges
  //    n'est plus ici : elle a suivi la frise des récompenses sur `/season`.
  const standing = seasonStanding(meRow ? meRow.rank : null, meRow?.tied === true);

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
          {/* Titre + commutateur Run/Bike « en haut à droite » (planche E14).
              Une cale ÉLASTIQUE (et non une marge fixe) sépare les deux : le
              commutateur reste collé au bord droit dans les 5 langues. Si un
              titre traduit venait à le croiser, c'est le TITRE qui cède, coupé
              net (jamais « … », §A.9) — le contrôle, lui, reste atteignable. */}
          <View style={styles.titleRow}>
            <Icon name="classement" size={iconSizes.lg} color={colors.blanc} />
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="clip">
              {t(C.saisonTitle)}
            </Text>
            <View style={styles.titleSpacer} />
            {switchVisible ? (
              <ActivitySwitch
                activity={activity}
                onChange={setActivity}
                runLabel={t(S.activityRunA11y)}
                bikeLabel={t(S.activityBikeA11y)}
                testID="classement-activity-switch"
              />
            ) : null}
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
              accessibilityLabel={`${t(S.maLigneA11y)} : #${meRow.rank} ${meRow.name}, ${meRow.valueText ?? formatInt(meRow.value)} ${joueursBoard.valueLabel}. ${
                aboveRow
                  ? gapIsTie
                    ? t(S.gapSurfaceEgalite, { rank: aboveRow.rank })
                    : t(S.gapSurfacePourPasser, { surface: gapSurfaceText, rank: aboveRow.rank })
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
                  <Text style={styles.mineValue}>{meRow.valueText ?? formatInt(meRow.value)}</Text>
                  <Text style={styles.mineUnit}>{joueursBoard.valueLabel}</Text>
                </View>
              </View>
              {aboveRow ? (
                <>
                  <ProgressBar value={gapRatio} height={6} />
                  {/* L'unité RÉELLE du board est la SURFACE (§10.1) : l'écart est
                      dit en m²/km², dans la MÊME unité que les lignes — jamais
                      converti en points, ni en un nombre de zones estimé. */}
                  <Text style={styles.mineGap}>
                    {gapIsTie
                      ? t(S.gapSurfaceEgalite, { rank: aboveRow.rank })
                      : t(S.gapSurfacePourPasser, { surface: gapSurfaceText, rank: aboveRow.rank })}
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
          /* CE BLOC EXISTE DANS LES DEUX MONDES DEPUIS LE 26/07/2026. Il
             disparaissait en lentille vélo parce que « MA ROUTE » ouvrait un
             planificateur PIÉTON ; ce motif est mort (`plannerRoutingProfile`),
             et la cible porte désormais la discipline — `plannerHref(activity)`
             au lieu d'un `/route-planner` nu, qui retombait sur la course.
             L'écart affiché est celui de LA lentille courante : le board est lu
             par `useSeasonLeaderboard(activity)`, jamais sommé entre les mondes.
             La phrase-objectif dit l'écart en SURFACE — une unité qui ne dépend
             d'aucune discipline : elle reste vraie au mot près pour un cycliste. */
          <View style={styles.goalWrap}>
            <Text style={styles.goalText}>
              {isLeader
                ? t(C.toiHintLeader)
                : gapIsTie && aboveRow
                  ? t(S.goalSurfaceEgalite, { name: aboveRow.name })
                  : t(S.goalSurfaceChase, {
                      surface: gapSurfaceText,
                      name: aboveRow ? aboveRow.name : '',
                    })}
            </Text>
            <InlineRunCTA
              label={t(isLeader ? C.ctaDefendre : C.ctaMaRoute)}
              leading={<Icon name="route" size={iconSizes.md} color={colors.noir} />}
              onPress={() => router.push(plannerHref(activity))}
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
            value={activeTab}
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
          {activeTab === 'specialites' ? (
            <SpecialtyBoards
              specialty={specialty}
              onSpecialty={setSpecialty}
              spec={spec}
              discreet={discreet}
              signedIn={signedIn}
              configured={configured}
              mod={mod}
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
              {/* Jamais « 12 km² » face à « toi : rien » : sans ligne à moi, le
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
                mod={mod}
              />
            </>
          ) : activeTab === 'crews' ? (
            /* CREWS — la source EXISTE depuis 0086 (la matview est enfin
               rafraîchie, et `crew_board()` refuse de servir une vue jamais
               calculée). Le composant porte les six états ; aucun n'emprunte la
               phrase d'un autre, et le vide d'aujourd'hui — la base ne contient
               aucun crew — se dit avec ses propres mots. */
            <CrewBoardSection activity={activity} configured={configured} />
          ) : !onJoueurs ? (
            /* VILLES : aucune source serveur — aucun agrégat inter-villes
               n'existe. Ce n'est pas « vide en attendant », c'est « pas
               ouvert », sans nommer une seule ville ni avancer un chiffre.
               (Le cas CREW est traité juste au-dessus depuis le 27/07/2026 :
               les deux dimensions ne partagent plus le même état.) */
            <BoardEmpty title={t(C.boardNoSourceTitle)} body={t(C.boardNoSourceVille)} />
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
               sienne. La ville se rattache seule au premier EFFORT compté —
               `ensureHomeCity` (ingest_run:550) n'a aucun filtre d'activité, une
               sortie vélo domicilie aussi. Le corps de la card est donc NEUTRE
               (un seul `users.city_id`, une seule règle) ; seul le CTA se
               décline, parce que lui doit déclarer ce qu'il lance. */
            <BoardEmpty
              title={t(C.boardCityUnknownTitle)}
              body={t(C.boardCityUnknownBody)}
              cta={
                bike
                  ? // La ville se rattache au premier effort compté, quelle que
                    // soit la discipline : depuis le 26/07 une sortie vélo la
                    // rattache aussi. Le CTA existe donc dans les deux mondes —
                    // il DÉCLARE simplement celui qu'il lance.
                    {
                      label: t(S.bikeBoardCta),
                      onPress: () => router.push(startSortieHref('bike')),
                    }
                  : { label: t(C.boardEmptyCta), onPress: () => router.push('/route-planner') }
              }
            />
          ) : boardStatus === 'unavailable' ? (
            /* La lecture a ÉCHOUÉ. État DISTINCT du vide : un réseau qui lâche ne
               prouve pas que la saison est déserte. */
            <BoardEmpty title={t(C.boardUnavailableTitle)} body={t(C.boardUnavailableBody)} />
          ) : bike ? (
            /* Lecture RÉUSSIE sur la discipline VÉLO, et aucune ligne.
               ─── RÉÉCRIT LE 26/07/2026 ────────────────────────────────────
               La cause invoquée jusqu'ici (« GRYD ne chronomètre pas encore le
               vélo, donc personne ne PEUT avoir de points vélo ») est devenue
               fausse le jour où le vélo est devenu réel. Le seul fait que la
               lecture établit est plus modeste, et c'est celui-là qu'on dit :
               aucun joueur classé en vélo DANS CETTE VILLE, CETTE SAISON.
               L'action existe désormais, et elle DÉCLARE sa discipline
               (`startSortieHref('bike')`) au lieu de renvoyer vers un départ
               qui enregistrerait une course à pied. La mention de séparation
               stricte RESTE : c'est elle qui explique pourquoi ce tableau peut
               être vide alors que le tableau à pied ne l'est pas. */
            <BoardEmpty
              title={t(S.bikeBoardTitle)}
              body={t(S.bikeBoardBody)}
              note={t(S.bikeBoardSeparate)}
              cta={{
                label: t(S.bikeBoardCta),
                onPress: () => router.push(startSortieHref('bike')),
              }}
            />
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
              Affichée seulement si le board est réel et hors mode discret — et
              seulement sous une lentille dont la SOURCE est disciplinée. Le
              palier est adossé aux badges Season Rank, lus dans `user_badges`,
              qui reste MONO-POT (0070 « en suspens » §3) même depuis que le
              vélo est réel : annoncer « Top 10 local » sous une étiquette vélo
              attribuerait au monde vélo une récompense gagnée en courant — la
              somme que la planche interdit.
              La condition est DÉRIVÉE (`competitiveReadAllowed`, testée) et non
              écrite `!bike` : le jour où `user_stats`/`user_badges` seront
              disciplinés, un seul `true` rouvrira ce bloc dans les deux mondes,
              sans qu'on ait à retrouver cette ligne. */}
          {competitiveReadAllowed(activity, false) && joueursIsReal && !discreet ? (
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

          {/* ══════════ VERS E59 · L'ÉCRAN SAISON ══════════
              CE QUI VIVAIT ICI ET QUI N'Y EST PLUS (27/07/2026) : la frise des
              paliers de fin de saison et les deux lignes de règles du reset.
              Elles sont parties sur `/season`, l'écran que la spéc E59 exige et
              qui n'existait pas — la spéc SÉPARE E53 « Classement joueurs » de
              E59 « Saison », et §A tranche pareil (un écran = une décision).
              Rien n'a été RECOPIÉ : la frise est devenue un composant partagé
              (`features/season/SeasonTierList.tsx`), pour qu'un seul barème soit
              rendu à un seul endroit. Cet onglet garde ce qui répond à « qui est
              devant qui » ; la progression personnelle (XP, rang, jalon,
              récompenses, règles, saison précédente) se lit là-bas.

              Le lien N'EST PAS un CTA chartreuse : l'unique décision de cet écran
              reste « MA ROUTE » (§A.4). */}
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/season')}
            style={({ pressed }) => [styles.seasonLink, pressed && styles.pressed]}
          >
            <Icon name="couronne" size={iconSizes.sm} color={colors.gris} />
            {/* §A.9 — jamais tronqué par une ellipse : coupe nette si besoin. */}
            <Text style={styles.seasonLinkLabel} numberOfLines={1} ellipsizeMode="clip">
              {t(S.ecranTitre)}
            </Text>
            <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
          </Pressable>
        </View>
      </ScrollView>

      {/* La feuille { Signaler · Bloquer }, PRÉ-REMPLIE avec le joueur de la
          ligne tapée — montée une seule fois pour tout l'écran. */}
      <PlayerModerationSheet
        pseudo={moderationTarget}
        onClose={() => setModerationTarget(null)}
      />
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
  // `flexShrink` : si un titre traduit long croisait le commutateur, c'est le
  // TITRE qui cède (coupé net par `clip`, §A.9) — jamais le contrôle qui sort de
  // l'écran, ce qui le rendrait inatteignable.
  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  // Pousse le commutateur Run/Bike au bord droit (planche E14) sans jamais
  // comprimer le titre : c'est l'ESPACE qui s'étire, pas le texte (§A.9).
  titleSpacer: { flex: 1, minWidth: spacing.sm },
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

  // ── E54 · une ligne de crew : rang · identité (nom + effectif) · zones ──
  // Pas de card : des lignes à plat, comme les lignes de joueurs. Une card par
  // crew à l'intérieur de la card d'écran serait exactement la card-dans-card
  // que §A interdit.
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    // 44 pt RÉELS : la ligne est lue à voix haute d'un bloc (a11y) et reste
    // atteignable si elle devient tapable un jour.
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
  },
  /** MON crew, surligné dans la liste (planche E54 : « crew utilisateur sticky »). */
  crewRowMine: {
    backgroundColor: elevation.raised,
    borderRadius: radii.control,
    paddingHorizontal: spacing.sm,
  },
  crewRank: {
    color: colors.gris,
    fontFamily: fonts.mono,
    fontSize: fontSizes.md,
    minWidth: 28,
    textAlign: 'right',
  },
  crewIdentity: { flex: 1, minWidth: 0 },
  crewName: { color: colors.blanc, fontFamily: fonts.textMedium, fontSize: fontSizes.md },
  crewMeta: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.xs },
  crewZones: { color: colors.blanc, fontFamily: fonts.mono, fontSize: fontSizes.md },

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
  // Couronne du #1 : posée au-dessus de l'anneau, léger décollement pour ne pas
  // toucher l'avatar. N'existe que sur la colonne centrale (#1), ne déplace rien.
  podiumCrown: { marginBottom: 3 },
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
  // Emplacement de l'affordance « … » : hauteur CONSTANTE, occupée ou non (la
  // colonne « moi » n'en porte pas). Mesure de composition, pas de règle de jeu
  // — comme `steps` juste au-dessus. Vaut la cible tactile du glyphe (22 pt).
  podiumActions: { height: 22, alignItems: 'center', justifyContent: 'center' },
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
  // « Joueur bloqué » n'est pas un pseudo : gris + italique, pour qu'on ne le
  // confonde jamais avec le nom de quelqu'un (podium ET liste).
  nameBlocked: { color: colors.gris, fontStyle: 'italic' },
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

  // ── Lien vers E59 (`/season`) : une ligne, pas une card ──
  // `minHeight` = plancher tactile RÉEL (§22) : une ligne de texte seule ferait
  // une cible de 20 px de haut.
  seasonLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    marginTop: 26,
  },
  seasonLinkLabel: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
