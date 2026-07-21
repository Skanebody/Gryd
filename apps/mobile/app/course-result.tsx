/**
 * GRYD — RÉSULTAT DE COURSE (AMENDEMENT-20 §2, épuré zéro-friction) :
 * LE moment dopamine en UN SEUL état final, actionnable immédiatement (aucun
 * temps mort) : titre selon l'intention (TERRITOIRE ÉTENDU / ZONE DÉFENDUE) +
 * pill GRYD VERIFIED (la validation vit dans le badge, pas dans le titre) +
 * KPI géant (compteur useCountUp) + le POURQUOI au niveau 1 (« Boucle fermée ·
 * +N zones d'un coup ») + mini-bandeau tappable si un badge est débloqué.
 * CTA unique [Partager] (arme les VRAIES stats du run via share/shareRun.ts
 * avant de pousser /partage) ; secondaire « Voir mon territoire » ; le
 * technique (impact, GPS/Motion, analyse boucle, calcul, frontière, crew,
 * bonus, badge) se déplie au tap « Comment j'ai gagné ces zones ».
 * Hors conquête (AMENDEMENT-07) : social_run = stats + partage sans capture ;
 * course_privee = stats seules, aucun partage.
 *
 * ─── ZÉRO SIMULATION (21/07/2026) ──────────────────────────────────────────
 * Cet écran ne construit PLUS aucune course de démonstration. Il n'affiche que
 * ce que deux sources réelles lui donnent :
 *   1. `getLastRunResult()` — le verdict d'ingest_run (SEUL juge des zones,
 *      points, boucle, badges, série, verified) ;
 *   2. les params `dist`/`dur` — les mètres et secondes MESURÉS par le tracker
 *      GPS, quand la course n'a pas encore pu être jugée (hors-ligne).
 * Ce que ni l'un ni l'autre ne dit n'existe pas ici : `stats.zones` vaut `null`
 * tant que le serveur n'a pas jugé, et tout ce qui parle de conquête (KPI,
 * IMPACT, décomposition du calcul) disparaît alors — plutôt un bloc absent
 * qu'un « 0 » qui se lit comme un verdict.
 */
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  spacing,
  type IngestRunResponse,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { C } from '../src/i18n/catalog/result';
import { useT } from '../src/i18n/store';
import { Icon } from '../src/ui/Icon';
import { formatInt } from '../src/ui/format';
import {
  BadgeCard,
  StatePill,
  StreakBlock,
  type StreakView,
  useCountUp,
  useReveal,
} from '../src/ui/game';
import {
  BADGE_FAMILIES,
  badgeById,
  badgeColor,
} from '../src/features/badges/catalog';
import { GripMascot } from '../src/features/social/GripMascot';
import { gripRankForLevel, playerLevelForXp } from '../src/features/crew/rules';
import { useMyEconomy } from '../src/features/social/economy';
import { ResultReveal } from '../src/features/run/ResultReveal';
import {
  boundaryExpiryLabel,
  contributionPct,
  intentionFromParam,
  partialBoundaryById,
  summaryHeader,
  tracedKmLabel,
  type PartialBoundaryDemo,
  type ResultSummaryLine,
} from '../src/features/run/intention';
import { getLastRunResult } from '../src/features/run/runResult';
import { useRealCrew } from '../src/features/crew/real';
import { setShareRun, shareCardFromResult } from '../src/features/share/shareRun';
// NOTE (21/07/2026) : `buildRunSimulation` / `buildLiveNav` / `buildRunLoop` ne
// sont PLUS importés ici. Seuls les formateurs purs et le parsing de mode
// survivent de simulation.ts — aucune course fabriquée n'entre dans cet écran.
import {
  formatClock,
  formatKm,
  formatPace,
  runModeFromParam,
  type LiveRunMode,
} from '../src/features/run/simulation';
// AMENDEMENT-23 §B.4 — explicabilité post-run : schéma « la boucle fait la zone »
// (réutilisé, DÉMO surchargée par les vrais totaux du run) + verify en libellé
// dérivé des constantes gelées (jamais de nombre magique).
import { BoucleFaitLaZone } from '../src/features/explain/schemas';
import { verifyTiersLabel } from '../src/features/explain/labels';
type StepId =
  | 'validated'
  | 'zones'
  | 'sector'
  | 'crew'
  | 'perf'
  | 'bonus'
  | 'badge'
  | 'share'
  | 'stats';

const STEPS_BY_MODE: Record<LiveRunMode, readonly StepId[]> = {
  conquete: ['validated', 'zones', 'sector', 'crew', 'perf', 'bonus', 'badge', 'share'],
  social_run: ['validated', 'stats', 'share'],
  course_privee: ['validated', 'stats'],
};

// ─── AUCUNE GÉOMÉTRIE FABRIQUÉE (21/07/2026) ────────────────────────────────
// Ici vivaient les mini-cartes AVANT/APRÈS du secteur et de la boucle. Elles
// dessinaient la boucle de la place de la République et le ruban de la rue du
// Faubourg-du-Temple — géométries d'AUTHORING, identiques pour tout le monde —
// au-dessus du titre « ANALYSE · LA BOUCLE FAIT LA ZONE ». Comme cet écran ne
// s'ouvre plus que sur une VRAIE course, un coureur lillois voyait donc l'
// analyse de SA boucle tracée à Paris, sous son nom. Même faute que le
// route-planner qui recentrait sur République.
//
// Le tracé réel de la course n'est PAS disponible dans cet écran : il vit dans
// le RunTracker (features/run/gps/tracker.ts, `smoothTrace(cleanTrace(fixes))`)
// et meurt à la fin de la course — `RealCourseLive.finish()` ne transmet que
// `dist` et `dur`, et `IngestRunResponse` ne renvoie aucune trace. Le rebrancher
// demande un store de trace (comme route/plannedRoute.ts) armé par useRealRun :
// un chantier qui sort de ce lot. En attendant, le bloc est RETIRÉ — un bloc
// absent vaut infiniment mieux qu'un bloc qui dessine Paris sous les pieds d'un
// Lillois. Voir le rapport de lot pour le câblage restant.

/** Param numérique optionnel (dist/dur réels) — null si absent/invalide. */
function numParam(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  const n = raw !== undefined ? Number(raw) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Verdict de CONQUÊTE de la course — n'existe QUE si ingest_run a jugé. Il n'y
 * a délibérément pas de valeur par défaut : sans verdict, l'objet est `null` et
 * tout ce qui parle de zones disparaît de l'écran. Un `0` par défaut se serait
 * lu « ta course n'a rien pris », ce que personne n'a mesuré.
 */
interface ZonesVerdict {
  /** Zones capturées (claimed + stolen + pioneer) — décidé serveur. */
  total: number;
  /** Zones intérieures, DÉJÀ comptées dans `total` (« dont N »). */
  enclosed: number;
  loopClosed: boolean;
  pointsAwarded: number;
}

/**
 * Ce que l'écran sait VRAIMENT de la course. Aucun socle de simulation : chaque
 * champ vient du serveur (seul juge) ou des mesures du tracker GPS.
 */
interface ResultView {
  /** Mètres MESURÉS (serveur, sinon tracker). */
  distanceM: number;
  /** Secondes MESURÉES (serveur, sinon tracker). */
  durationS: number;
  paceSPerKm: number;
  /** Affirmation du SERVEUR — jamais un défaut de rendu. */
  verified: boolean;
  /** Nom de zone neutre : aucun secteur réel n'est câblé (jamais un faux nom). */
  zoneName: string;
  /** `null` = le serveur n'a pas (encore) jugé la conquête. */
  zones: ZonesVerdict | null;
}

/** État de frontière crew à afficher au résultat (chantier 2, param démo). */
type BoundaryState = 'open' | 'completed';

/** Parse le param `boundary_state` — sinon null (séquence dopamine normale). */
function boundaryStateFromParam(
  param: string | string[] | undefined,
): BoundaryState | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === 'open' || value === 'completed') return value;
  return null;
}

/**
 * AUCUN RÉSULTAT À MONTRER — état vide honnête (jamais un écran blanc, jamais
 * une célébration empruntée). Une phrase qui dit pourquoi, un seul CTA de
 * sortie : cet écran n'a rien à réparer, seulement à ne pas mentir (§A).
 */
function NoResultScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    screen('course_result_empty');
  }, []);

  const back = () => {
    haptics.light();
    router.replace('/(tabs)');
  };

  return (
    <View
      style={[
        styles.noResultRoot,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
      ]}
    >
      <View style={styles.noResultBlock}>
        <Icon name="historique" size={28} color={colors.gris} />
        <Text style={styles.noResultTitle}>{t(C.noResultTitle)}</Text>
        <Text style={styles.noResultBody}>{t(C.noResultBody)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.noResultCta)}
        onPress={back}
        style={({ pressed }) => [styles.noResultCta, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.noResultCtaLabel}>{t(C.noResultCta)}</Text>
      </Pressable>
    </View>
  );
}

export default function CourseResultScreen() {
  const params = useLocalSearchParams<{
    mode?: string;
    queued?: string;
    /** P0 C1 — distance (m) et durée (s) RÉELLES mesurées par le tracker (chemin GPS). */
    dist?: string;
    dur?: string;
    intention?: string;
    /** AMENDEMENT-17 §CH2 — id de la frontière crew rejouée (démo). */
    boundary?: string;
    /** AMENDEMENT-17 §CH2 — `open` (fermable) ou `completed` (boucle crew fermée). */
    boundary_state?: string;
  }>();
  // NOTE (21/07/2026) : `t`, `route` et `planned` ne sont plus lus. Ils
  // pilotaient la simulation (tick rejoué, itinéraire démo, parcours planifié)
  // qui n'entre plus dans cet écran. RealCourseLive continue de passer `t` —
  // c'est sans effet, et volontairement : aucun paramètre d'URL ne doit pouvoir
  // (re)fabriquer un résultat.

  // ─── FUITE COLMATÉE (21/07/2026) : plus de résultat sans course ────────────
  // Cet écran retombait sur `demoStats` (scénario République : +47 zones, badge
  // « Route Opened III », bonus Finisher) dès que ni ingest_run ni le tracker
  // n'avaient parlé. Ouvert par un lien, un retour arrière ou une course non
  // mesurée, il célébrait donc une conquête qui n'a jamais eu lieu — au nom du
  // coureur. Le vrai produit ne fabrique pas un résultat : il dit qu'il n'en a
  // pas. Plus aucune exception, sur aucune plateforme.
  const hasRealRun = getLastRunResult() !== null || numParam(params.dist) !== null;
  if (!hasRealRun) return <NoResultScreen />;

  // AMENDEMENT-17 §CH2 — la frontière crew court-circuite la séquence dopamine :
  // un seul écran = une seule action (ouvrir/terminer). Piloté par `boundary` +
  // `boundary_state` (démo) — en prod ces états viennent d'IngestRunResponse
  // (openBoundary / boundaryCompleted). Le serveur reste seul décideur.
  const boundaryState = boundaryStateFromParam(params.boundary_state);
  if (boundaryState !== null) {
    const boundary = partialBoundaryById(params.boundary);
    return boundaryState === 'open' ? (
      <OpenBoundaryResult boundary={boundary} />
    ) : (
      <CompletedBoundaryResult boundary={boundary} />
    );
  }

  return <ConquestResultScreen params={params} />;
}

function ConquestResultScreen({
  params,
}: {
  params: {
    mode?: string;
    queued?: string;
    /** P0 C1 — distance (m) / durée (s) RÉELLES du tracker (chemin GPS). */
    dist?: string;
    dur?: string;
    intention?: string;
  };
}) {
  const insets = useSafeAreaInsets();
  const t = useT();
  // ─── LE RANG AFFICHÉ ÉTAIT CELUI D'UN AUTRE (21/07/2026) ──────────────────
  // `gripRankForLevel(playerLevelForXp(MY_SOCIAL_PROFILE.xp))` : l'XP du persona
  // de démo KORO (4 210 → niveau 12 → « Éclaireur »), sans aucune garde, rendu à
  // l'intérieur du ResultReveal héros — donc AUSSI sur la branche vraie course.
  // Un joueur qui finissait sa toute PREMIÈRE course voyait la mascotte au rang
  // Éclaireur au moment dopamine, pendant que l'onglet Profil lui affichait
  // « Rookie » calculé sur son XP réelle : deux rangs contradictoires pour le
  // même joueur, au même instant.
  // Même source que le Profil désormais (useMyEconomy → users.xp). Sans session,
  // lecture vide ou lecture en échec : 0 XP → niveau 1 → `rookie`, le rang de
  // départ, qui est vrai.
  const economy = useMyEconomy();
  const gripRank = gripRankForLevel(playerLevelForXp(economy.xp));
  const mode = runModeFromParam(params.mode);
  // Intention (AMENDEMENT-16 §1) : teinte la SYNTHÈSE multi-résultats + la copy
  // §28 (Conquête/Défense/Run libre) — jamais l'attribution (le serveur décide).
  const intention = intentionFromParam(params.intention);
  // ─── SOURCES RÉELLES UNIQUEMENT (21/07/2026) ──────────────────────────────
  // Ici vivaient `buildRunSimulation` → `buildLiveNav` → `buildRunLoop` →
  // `resultStats`. Cette chaîne produisait la course de démonstration ancrée
  // place de la République (NAV_DEFAULT_ANCHOR = ROUTES_DEMO[0].line[0]) et
  // servait de SOCLE à `stats` : le `...demoStats` répandait, sur une vraie
  // course, tout ce que les branches réelles n'écrasaient pas — le tracé de la
  // boucle, mais aussi les scores GPS/mouvement, le rang de crew, et jusqu'aux
  // identités KORO / LES FOULÉES 9³. Plus de socle : chaque champ est construit,
  // et ce qui n'a pas de source RESTE ABSENT.
  const serverResult = getLastRunResult();
  // Crew réel 3/3 : roster RÉEL (hook silencieux — vide sans session/crew).
  // Compte des coéquipiers (moi exclu) pour la ligne de conséquence collective.
  const { members: crewMembers } = useRealCrew();
  const crewTeammates = crewMembers.filter((m) => !m.isMe).length;
  const realDistM = numParam(params.dist);
  const realDurS = numParam(params.dur);
  const stats: ResultView = useMemo(() => {
    // 1. Le serveur a jugé : il est SEUL juge, tout vient de lui.
    if (serverResult) {
      return {
        distanceM: serverResult.distanceM,
        durationS: serverResult.durationS,
        paceSPerKm: serverResult.avgPaceSKm,
        verified: serverResult.status === 'valid' || serverResult.status === 'partial',
        // Aucun secteur réel câblé : « Zone », jamais un faux nom (charte).
        zoneName: t(C.zoneFallback),
        zones: {
          total:
            serverResult.hexes.claimed + serverResult.hexes.stolen + serverResult.hexes.pioneer,
          enclosed: serverResult.enclosedZones ?? 0,
          loopClosed: serverResult.loopClosed === true,
          pointsAwarded: serverResult.pointsAwarded,
        },
      };
    }
    // 2. Mesuré par le tracker, PAS ENCORE jugé (hors-ligne, payload en file) :
    //    les mètres et les secondes sont vrais, la conquête est INCONNUE.
    //    `zones: null` — surtout pas 0, que le joueur lirait « tu n'as rien pris ».
    const distanceM = realDistM ?? 0;
    return {
      distanceM,
      durationS: realDurS ?? 0,
      paceSPerKm: distanceM > 0 && realDurS ? realDurS / (distanceM / 1000) : 0,
      verified: false,
      zoneName: t(C.zoneFallback),
      zones: null,
    };
    // `t` (stable par langue) : le nom de zone neutre suit la bascule de langue.
  }, [serverResult, realDistM, realDurS, t]);
  /** Raccourci de lecture — `null` tant que le serveur n'a pas jugé. */
  const zones = stats.zones;

  const conquest = mode === 'conquete';
  const isPrivate = mode === 'course_privee';

  // LOT 1 — la série APRÈS cette course, telle que le SERVEUR l'a calculée à
  // partir des courses réelles du joueur (jamais reconstruite ici, jamais
  // simulée en démo). `undefined` (course démo, hors-ligne, serveur muet) ⇒
  // aucun bloc : l'app préfère se taire que d'afficher une série inventée.
  const streakView: StreakView | null = useMemo(() => {
    const s = serverResult?.streakAfter;
    if (!s || s.status === 'none') return null;
    return {
      status: s.status,
      weeks: s.weeks,
      multiplier: s.multiplier,
      runsToValidate: s.runsToValidate,
      best: s.best,
    };
  }, [serverResult]);

  // AMENDEMENT-20 §2 — l'écran 1 est ULTRA simple ET actionnable dès l'affichage
  // (aucun temps mort : titre + KPI géant + pourquoi + [Partager]). Le compteur
  // du KPI anime la dopamine, les contrôles ne sont jamais bloqués. Tous les
  // détails techniques (Impact, GRYD Verified, analyse boucle) se déplient AU
  // TAP « Comment j'ai gagné ces zones », pas sur le premier écran.
  const [showDetails, setShowDetails] = useState(false);
  // AMENDEMENT-23 §B.4 — sous-accordéon « Comment est calculé ce résultat ? »
  // (dans « Comment j'ai gagné ces zones », replié par défaut — détail au tap).
  const [showCalc, setShowCalc] = useState(false);

  // Un badge n'est décerné QUE par ingest_run (service_role). Sans verdict
  // serveur, il n'y a pas de badge à annoncer — un badge « débloqué » que le
  // serveur n'a jamais accordé est une récompense inventée.
  const badgeId = serverResult ? serverResult.newBadges[0] : undefined;
  const badge = badgeId ? badgeById(badgeId) : undefined;
  const badgeFamily = badge ? BADGE_FAMILIES.find((f) => f.id === badge.family) : undefined;

  // AMENDEMENT-19 §4/§7 — bonus ciblé appliqué. Vient EXCLUSIVEMENT de
  // IngestRunResponse.bonusApplied : le serveur seul décide d'un bonus.
  const bonusApplied: IngestRunResponse['bonusApplied'] | undefined =
    serverResult?.bonusApplied;

  useEffect(() => {
    screen('course_result', { mode });
    track(EVENTS.celebrationViewed, { mode });
  }, [mode]);

  const goMap = () => router.replace('/(tabs)');
  // Partage VRAI : on arme les stats de LA course affichée (shareRun.ts) avant
  // de pousser /partage — l'aperçu partagé montre CE run, jamais la démo figée.
  const share = () => {
    haptics.medium();
    track(EVENTS.shareCardGenerated);
    setShareRun({
      mode,
      intention,
      card: shareCardFromResult({
        // playerName / crewName sont posés PLUS BAS à la chaîne vide : aucune
        // identité de démo (KORO / LES FOULÉES 9³) ne signe jamais un vrai run.
        zoneName: stats.zoneName,
        // Zones/points : le verdict serveur, ou les valeurs NEUTRES de
        // NEUTRAL_SHARE_CARD (0) quand personne n'a jugé. Ce 0-là n'est pas un
        // résultat affiché au joueur : c'est l'absence de chiffre sur la card,
        // que les templates lisent comme « rien à annoncer ».
        zonesGained: zones?.total ?? 0,
        loopBonusZones: zones?.enclosed ?? 0,
        crewPoints: zones?.pointsAwarded ?? 0,
        // Style DÉFENSE : ne JAMAIS laisser passer les valeurs démo (+48 h /
        // 2 zones tenues) comme si c'était CE run. Les zones tenues = zones
        // réellement couvertes par ce run (dérivé) ; la durée de tenue est
        // décidée serveur (indispo côté client) → valeur neutre honnête 0,
        // jamais une défense inventée. TODO(O1) : holdHours réel via ingest_run.
        zonesDefended: zones?.total ?? 0,
        holdHours: 0,
        distanceKm: formatKm(stats.distanceM),
        paceLabel: formatPace(stats.paceSPerKm),
        clockLabel: formatClock(stats.durationS),
        // ─── FUITE COLMATÉE (21/07/2026) ────────────────────────────────────
        // Ce `trace` était annoncé comme « le parcours réellement couru ». Il
        // ne l'était pas : il venait de la simulation déterministe — donc de la
        // boucle République, TOUJOURS, course réelle comprise. Un coureur
        // d'Ouville partageait ainsi une carte de Paris signée de son nom. Le
        // Résultat n'a AUCUNE géométrie réelle à sa disposition (ingest_run ne
        // renvoie pas la trace, et le tracé du tracker meurt à la fin de la
        // course) : tableau vide, que ShareMap lit comme « aucun tracé connu »
        // → il ne dessine aucune géographie. Même raison que le bloc d'analyse
        // de boucle retiré plus haut.
        trace: [],
        // P1 C8/B3 — course RÉELLE : zéro invention résiduelle sur la card.
        // verified vient du serveur (stats l'est déjà), le rang n'existe pas
        // encore (season_scores) → styles Classement neutralisés plutôt que
        // « #8 Paris Est », l'état AVANT est inconnu → ligne masquée, et les
        // identités démo (KORO / LES FOULÉES 9³) ne signent jamais un vrai run.
        verified: stats.verified,
        rankLabel: null,
        rankZone: null,
        rankDelta: null,
        beforeState: null,
        // Pas d'identité de remplissage : sans pseudo chargé, la card signe par
        // la ZONE (helper who() des templates), jamais par KORO.
        playerName: '',
        crewName: '',
      }),
    });
    router.push({ pathname: '/partage', params: { mode, intention: params.intention ?? '' } });
  };
  const toggleDetails = () => {
    haptics.light();
    setShowDetails((v) => !v);
  };
  // Le mini-bandeau badge du niveau 1 OUVRE les détails (le BadgeCard y vit).
  const openBadgeDetails = () => {
    haptics.light();
    setShowDetails(true);
  };
  const toggleCalc = () => {
    haptics.light();
    setShowCalc((v) => !v);
  };

  // AMENDEMENT-23 §B.4 — décomposition zones de CE run : le trait capture le
  // passage, la boucle ajoute l'intérieur (mêmes totaux que l'IMPACT). Chiffres
  // du VERDICT SERVEUR uniquement — `zones === null` ⇒ le bloc entier ne rend
  // rien (voir plus bas), plutôt qu'un « +0 / +0 / +0 » qui se lit comme un
  // résultat mesuré alors que rien n'a été jugé.
  const traceZones = zones ? Math.max(0, zones.total - zones.enclosed) : 0;
  const loopGain = zones?.enclosed ?? 0;
  const totalZones = zones?.total ?? 0;
  const verifyTiers = verifyTiersLabel();
  /** Promesse du panneau de détails — jamais plus que ce qu'il contient. */
  const detailsLabel = conquest && zones ? t(C.howIWon) : t(C.seeMyStats);

  // AMENDEMENT-23 §B.4 / honnêteté §A — décomposition technique du calcul.
  // `defended` est RÉEL dès qu'une vraie course a été jugée par ingest_run
  // (serverResult.hexes.defended, seul juge) ; routes ouvertes / segments exclus
  // ne sont pas encore renvoyés par le serveur → restent un scénario démo,
  // étiqueté « démo » pour ne jamais se confondre avec les vraies valeurs
  // GPS/MOUVEMENT/VALIDÉ (dérivées du run) dans la même grille.
  // TODO(O1) : exposer routesOpened/segmentsExcluded côté ingest_run.
  // `null` = le serveur n'a pas (encore) jugé : la case DISPARAÎT plutôt que
  // d'afficher un chiffre de scénario. Une valeur étiquetée « démo » reste une
  // valeur inventée dans la grille d'un vrai run.
  const zonesDefended: number | null = serverResult ? serverResult.hexes.defended : null;

  // Synthèse multi-résultats (doc §2/§3.1) — conquête seulement (les modes
  // social/privé gardent leur bilan stats). L'intention teinte l'accent + la
  // copy §28 ; le tracé (démo) produit tous les effets listés.
  const summary = summaryHeader(intention);
  // §A r.1/r.20 — l'IMPACT ne répète pas le % de zone : la ligne `crew`
  // (« {zone} +X % ») est déjà portée par la section CONTRIBUTION CREW plus bas
  // ET par la heroLine de l'écran 1. On la retire ici pour tenir la card à 3
  // idées (conquête · défense · route) et supprimer la redondance.
  // Aucun % de secteur n'est câblé côté serveur : la synthèse ne fabrique rien.
  const summaryLines: readonly ResultSummaryLine[] = [];
  // Ligne émotionnelle de l'écran 1 (courte, jamais tronquée) :
  // « République défendue · Paris Est +5 % ».
  const heroLine = conquest
    ? `${summary.kicker} · ${formatKm(stats.distanceM)} km`
    : isPrivate
      ? t(C.privateLine)
      : t(C.socialRunLine, { km: formatKm(stats.distanceM) });
  // Titre du moment dopamine : le RÉSULTAT (territoire/zone), jamais un tampon
  // administratif — la validation vit dans la pill GRYD VERIFIED, séparée.
  // « TERRITOIRE ÉTENDU » / « ZONE DÉFENDUE » sont des AFFIRMATIONS de conquête :
  // elles exigent le verdict serveur. Sans lui (hors-ligne), le titre retombe sur
  // « COURSE TERMINÉE » — vrai, lui, et déjà traduit dans les 5 langues.
  const heroTitle = isPrivate
    ? t(C.heroPrivate)
    : !conquest || !zones
      ? t(C.heroDone)
      : intention === 'defense'
        ? t(C.heroDefended)
        : t(C.heroExtended);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      {/* Barre : kicker seul — l'écran 1 est déjà l'état final, rien à passer. */}
      <View style={styles.bar}>
        <Text style={styles.barKicker}>{t(C.barKicker)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── ÉCRAN 1 — émotionnel d'abord, lisible en 2 s (AMENDEMENT-20 §2) ───
             Titre résultat + pill VERIFIED + KPI GÉANT + le POURQUOI + badge.
             Le technique (GPS/Motion, impact, analyse boucle) reste AU TAP. */}
        <ResultReveal visible haptic="success" style={styles.hero}>
          {/* GRIP célèbre — petit, au-dessus du KPI (il personnalise, il ne vole pas la vedette). */}
          <View style={styles.heroGrip}>
            <GripMascot rank={gripRank} size={64} />
          </View>
          <Text style={styles.heroTitle}>{heroTitle}</Text>
          {/* La VALIDATION vit dans sa pill (séparée du titre — jamais « validée »
              en guise de victoire). Jargon banni : « stats only » → français. */}
          {!isPrivate && serverResult ? (
            stats.verified ? (
              <StatePill state="verified" label="GRYD VERIFIED" />
            ) : (
              <StatePill state="statsonly" label={t(C.statsOnlyPill)} />
            )
          ) : null}

          {/* KPI géant — le chiffre qui se comprend en 2 s. Les ZONES ne
              s'affichent que si le serveur les a jugées ; sinon le KPI retombe
              sur les KM, qui eux ont bien été MESURÉS (hors-ligne, verdict en
              attente). Jamais un « +0 zones » à la place d'un inconnu. */}
          {conquest && zones ? (
            <View style={styles.heroKpi}>
              <ZoneCountUp value={zones.total} />
              <Text style={styles.heroKpiLabel}>{t(C.zonesCaptured)}</Text>
            </View>
          ) : (
            <View style={styles.heroKpi}>
              <Text style={styles.zonesHero}>{formatKm(stats.distanceM)}</Text>
              <Text style={styles.heroKpiLabel}>KM</Text>
            </View>
          )}

          {/* Le POURQUOI du chiffre, au niveau 1 (verdict serveur uniquement). */}
          {conquest && zones?.loopClosed ? (
            <Text style={styles.heroWhy} numberOfLines={1} ellipsizeMode="clip">
              {t(C.loopClosedBurst, { n: formatInt(zones.enclosed) })}
            </Text>
          ) : null}

          {/* P0 C1 — l'échec est EXPLIQUÉ, jamais un simple « 0 » sec (copy gelée §CH2). */}
          {conquest && serverResult?.openBoundary ? (
            <Text style={styles.heroWhy} numberOfLines={1} ellipsizeMode="clip">
              {t(C.almostClosed, { m: formatInt(serverResult.openBoundary.missingM) })}
            </Text>
          ) : null}
          {conquest && zones?.total === 0 && !serverResult?.openBoundary ? (
            <Text style={styles.heroWhy} numberOfLines={1} ellipsizeMode="clip">
              {t(C.noZones)}
            </Text>
          ) : null}

          {/* 1 ligne émotionnelle, courte, jamais tronquée. */}
          <Text style={styles.heroLine} numberOfLines={1} adjustsFontSizeToFit>
            {heroLine}
          </Text>

          {/* BADGE DÉBLOQUÉ — hook de rétention VISIBLE au niveau 1, tappable
              (ouvre les détails où vit le BadgeCard complet). */}
          {conquest && badge ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.badgeUnlockedA11y, { name: badge.name })}
              onPress={openBadgeDetails}
              style={({ pressed }) => [styles.heroBadge, pressed && styles.pressed]}
            >
              <Icon name="badge" size={16} color={badgeColor(badge)} />
              <Text style={styles.heroBadgeText} numberOfLines={1} adjustsFontSizeToFit>
                {t(C.badgeUnlockedBanner, { name: badge.name })}
              </Text>
              <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
            </Pressable>
          ) : null}

          {/* Fin hors-ligne (AMENDEMENT-15 §2) : discret, anti-shame, jamais bloquant. */}
          {params.queued === '1' ? (
            <Text style={styles.heroQueued} numberOfLines={1}>
              {t(C.queuedNote)}
            </Text>
          ) : null}

          {/* A-41 (LE RELAIS) : zones co-courues payées 1/rang — le co-coureur
              voit POURQUOI il n'a pas « pris » la zone mais n'est pas reparti
              à zéro. Discret, même gabarit que la note hors-ligne. */}
          {serverResult?.hexes.coCaptured !== undefined && serverResult.hexes.coCaptured > 0 ? (
            <Text style={styles.heroQueued} numberOfLines={2}>
              {t(C.coCapturedNote, { n: serverResult.hexes.coCaptured })}
            </Text>
          ) : null}

          {/* Crew réel 3/3 : la conséquence COLLECTIVE — vraie (union carte 2/3),
              jamais fabriquée : uniquement si le SERVEUR a jugé des captures ET
              que le roster réel a d'autres membres. Même gabarit discret. */}
          {zones !== null && zones.total > 0 && crewTeammates > 0 ? (
            <Text style={styles.heroQueued} numberOfLines={2}>
              {crewTeammates === 1
                ? t(C.crewImpactOne)
                : t(C.crewImpactMany, { n: crewTeammates })}
            </Text>
          ) : null}
        </ResultReveal>

        {/* LA SÉRIE (LOT 1 « LA SÉRIE VISIBLE ») — niveau 1 du post-run, juste
            sous le KPI : c'est la raison de revenir courir, elle n'a rien à
            faire dans un accordéon. Vient EXCLUSIVEMENT du serveur
            (`streakAfter`, dérivé des courses réelles) — absent ⇒ rien affiché,
            jamais un « 0 » ni une série de démo. Aucun bouton : le CTA unique
            de l'écran reste [Partager]. */}
        {streakView ? (
          <StreakBlock state={streakView} weeksBefore={serverResult?.streakAfter?.weeksBefore} />
        ) : null}

        {/* CTA — [Partager] IMMÉDIAT (façon Strava), « Voir mon territoire » en
             vraie action secondaire (la récompense), puis le toggle détails.
             Actionnable dès l'affichage — aucun temps mort. */}
        <ResultReveal visible haptic="none" style={styles.actions}>
          {!isPrivate ? (
            <Pressable
              accessibilityRole="button"
              onPress={share}
              style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
            >
              <Icon name="partage" size={iconSizes.md} color={colors.noir} />
              <Text style={styles.shareLabel}>{t(C.share)}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.seeTerritory)}
            onPress={goMap}
            style={({ pressed }) => [styles.boundarySecondary, pressed && styles.pressed]}
          >
            <Icon name="carte" size={iconSizes.sm} color={colors.blanc} />
            <Text style={styles.boundarySecondaryLabel}>{t(C.seeTerritory)}</Text>
          </Pressable>
          {/* Le libellé suit `zones`, pas `conquest` : sans verdict serveur,
              « Comment j'ai gagné ces zones » promettrait l'explication de zones
              que personne n'a encore comptées. Dans ce cas le panneau ne contient
              que des mesures — il s'annonce donc « Voir mes stats ». */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              showDetails ? t(C.hideDetails) : detailsLabel
            }
            onPress={toggleDetails}
            style={({ pressed }) => [styles.detailsToggle, pressed && styles.pressed]}
          >
            <Text style={styles.detailsToggleLabel}>
              {showDetails ? t(C.hideDetails) : detailsLabel}
            </Text>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
        </ResultReveal>

        {/* ─── « COMMENT J'AI GAGNÉ CES ZONES » — technique, au tap ────────────
             Impact · GRYD Verified · Analyse « La boucle fait la zone » · calcul
             · frontière · crew · bonus · badge. Replié par défaut : l'écran 1
             reste lisible en 2 s. */}
        {showDetails ? (
          <View style={styles.detailsWrap}>
            {/* IMPACT — total de conquête. Conditionné à `zones` : hors-ligne
                (verdict en attente), ce bloc affichait « TOTAL +0 », un zéro nu
                que le joueur lisait comme « ta course n'a rien pris ». Il
                disparaît maintenant jusqu'à ce que le serveur ait jugé. */}
            {conquest && zones ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>{t(C.impactKicker)}</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryLines}>
                    {summaryLines.map((line) => (
                      <SummaryLine key={line.icon} line={line} />
                    ))}
                  </View>
                  <View style={styles.impactTotalRow}>
                    <Text style={styles.impactTotalLabel}>{t(C.totalLabel)}</Text>
                    <Text style={styles.impactTotalValue}>
                      +{formatInt(zones.total)}
                      {zones.loopClosed ? (
                        <Text style={styles.impactTotalSub}>
                          {'  '}
                          {t(C.ofWhichLoop, { n: formatInt(zones.enclosed) })}
                        </Text>
                      ) : null}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Stats MESURÉES — social / privé, mais AUSSI conquête sans verdict
                serveur : le temps et l'allure ont bien été mesurés par le
                tracker, eux. Sans ce cas, un coureur hors-ligne ouvrait
                « Voir mes stats » sur un panneau quasi vide (l'IMPACT et le
                calcul étant à juste titre masqués). La NOTE de mode ne suit pas :
                sa copy décrit social/privé, elle serait fausse en conquête. */}
            {!conquest || !zones ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>{t(C.detailsKicker)}</Text>
                <View style={styles.statsCard}>
                  <View style={styles.statsRow}>
                    <MiniStat label={t(C.timeLabel)} value={formatClock(stats.durationS)} />
                    <MiniStat label={t(C.paceLabel)} value={`${formatPace(stats.paceSPerKm)}/km`} />
                  </View>
                  {!conquest ? (
                    <Text style={styles.statsNote}>
                      {isPrivate ? t(C.privateNote) : t(C.socialNote)}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* GRYD VERIFIED — la confiance de l'effort (technique). */}
            {!isPrivate ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>GRYD VERIFIED</Text>
                <View style={styles.verifiedCard}>
                  {stats.verified ? (
                    <StatePill state="verified" label="GRYD VERIFIED" />
                  ) : (
                    <StatePill state="statsonly" label={t(C.statsSavedPill)} />
                  )}
                  {/* Scores GPS/mouvement RETIRÉS (21/07/2026) : ils venaient de
                      `resultStats`, c'est-à-dire de la SIMULATION, et le serveur ne
                      les renvoie pas encore (O1). Cet écran ne s'ouvre plus que sur
                      une vraie course : les afficher aurait collé une qualité de
                      signal fabriquée sur le run du joueur. Le statut
                      « GRYD VERIFIED », lui, vient bien du serveur (stats.verified). */}
                </View>
              </View>
            ) : null}

            {/* ─── BLOC « ANALYSE · LA BOUCLE FAIT LA ZONE » RETIRÉ ───────────
                Il montrait deux mini-cartes AVANT/APRÈS construites sur
                `loop.traceGeo`, c'est-à-dire sur les ticks de la SIMULATION
                ancrée place de la République — jamais sur la course du joueur.
                Un Lillois voyait l'analyse de SA boucle dessinée à Paris.
                La pédagogie « la boucle fait la zone » survit sans géométrie
                fabriquée : le schéma abstrait de l'accordéon « Comment est
                calculé ce résultat ? » (BoucleFaitLaZone, juste en dessous)
                explique la règle avec les VRAIS totaux du run, sans prétendre
                dessiner un territoire. Le bloc reviendra le jour où le tracé
                réel remontera jusqu'ici (voir la note en tête de fichier). */}

            {/* COMMENT EST CALCULÉ CE RÉSULTAT ? — explicabilité post-run
                (AMENDEMENT-23 §B.4). Un accordéon replié : au tap, le schéma
                « la boucle fait la zone » (trace / boucle / gain) + la
                décomposition (défense · routes · segments exclus · GPS · Motion
                · verify). Décrit le moteur réel ; seuils verify dérivés des
                constantes gelées (jamais de littéral).
                Conditionné à `zones` : sans verdict serveur, le schéma et la
                décomposition n'auraient que des zéros à montrer, et la ligne
                « validé » affirmerait un échec de vérification que personne n'a
                prononcé. Rien à expliquer tant que rien n'est calculé. */}
            {conquest && zones ? (
              <View style={styles.block}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showCalc ? t(C.calcHideA11y) : t(C.calcQuestion)}
                  onPress={toggleCalc}
                  style={({ pressed }) => [styles.calcHeader, pressed && styles.pressed]}
                >
                  <Icon name="boucle_fermee" size={16} color={colors.chartreuse} />
                  <Text style={styles.calcHeaderLabel}>{t(C.calcQuestion)}</Text>
                  <Icon name="chevron" size={16} color={colors.gris} />
                </Pressable>

                {showCalc ? (
                  <View style={styles.calcBody}>
                    {/* Schéma réutilisé — surchargé par les vrais totaux du run. */}
                    <View style={styles.calcSchema}>
                      <BoucleFaitLaZone
                        traceZones={traceZones}
                        loopZones={totalZones}
                        loopGain={loopGain}
                      />
                    </View>

                    {/* Décomposition en 3 lignes (trace / boucle / gain). */}
                    <View style={styles.calcZonesRows}>
                      <CalcZoneRow label={t(C.traceOnly)} value={`+${formatInt(traceZones)}`} />
                      <CalcZoneRow
                        label={t(C.loopClosedRow)}
                        value={`+${formatInt(totalZones)}`}
                        accent
                      />
                      <CalcZoneRow label={t(C.loopGainRow)} value={`+${formatInt(loopGain)}`} />
                    </View>

                    {/* Grille technique : le reste du calcul, valeurs brutes. */}
                    <View style={styles.calcGrid}>
                      {/* Zones défendues : uniquement le verdict serveur. */}
                      {zonesDefended !== null ? (
                        <View style={styles.calcCell}>
                          <MiniStat
                            label={t(C.defendedLabel)}
                            value={`+${formatInt(zonesDefended)}`}
                          />
                        </View>
                      ) : null}
                      {/* Routes ouvertes / segments exclus : ingest_run ne les
                          renvoie pas encore (TODO O1). Tant qu'aucune source ne
                          les mesure, la grille ne les affiche pas du tout —
                          plutôt une case en moins qu'un chiffre inventé.
                          MÊME RAISON POUR GPS / MOUVEMENT (21/07/2026) : ces deux
                          scores sont produits par `resultStats` (la SIMULATION),
                          pas par le serveur. Cette grille ne s'ouvre plus que sur
                          une vraie course — les y laisser aurait collé une qualité
                          de signal fabriquée sur le run que le joueur vient de
                          faire. Ils reviendront avec le breakdown d'ingest_run. */}
                      <View style={styles.calcCell}>
                        <MiniStat
                          label={t(C.validLabel)}
                          value={
                            stats.verified ? `≥ ${verifyTiers.full}` : `< ${verifyTiers.partial}`
                          }
                        />
                      </View>
                    </View>

                    {/* Statut verify — la conclusion, en une ligne. */}
                    <Text style={styles.calcVerifyNote} numberOfLines={2}>
                      {stats.verified ? t(C.verifyOk) : t(C.verifyKo)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* SECTEUR + CONTRIBUTION CREW — RETIRÉS (21/07/2026).
                Les deux blocs affichaient un « % de secteur » (avant/après) et une
                montée de crew tirés de `resultStats`, donc de la simulation : aucun
                secteur réel n'est câblé côté serveur. Ils n'étaient rendus que sur
                une course NON réelle — un cas qui n'existe plus depuis que l'écran
                exige une vraie course. Ils reviendront quand ingest_run renverra un
                vrai découpage par secteur. */}

            {/* BONUS APPLIQUÉ (AMENDEMENT-19 §4) — ligne sobre. */}
            {conquest && bonusApplied ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>{t(C.bonusAppliedKicker)}</Text>
                <View style={styles.bonusCard}>
                  <View style={styles.bonusIcon}>
                    <Icon name="cadeau" size={20} color={gameColors.crew} />
                  </View>
                  <View style={styles.bonusTextWrap}>
                    <Text style={styles.bonusName} numberOfLines={1}>
                      {bonusApplied.name}
                    </Text>
                    <Text style={styles.bonusEffect} numberOfLines={1}>
                      {t(C.bonusAppliedLine, { effect: bonusApplied.effect })}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* BADGE DÉBLOQUÉ — inline (le reveal plein écran n'encombre plus l'écran 1). */}
            {conquest && badge && badgeFamily ? (
              <View style={styles.block}>
                <Text style={styles.stepKicker}>{t(C.badgeUnlockedKicker)}</Text>
                <BadgeCard
                  name={badge.name}
                  family={badge.family}
                  familyLabel={badgeFamily.name}
                  familyColor={badgeColor(badge)}
                  tier={badge.tier}
                  state="unlocked"
                  requirement={badge.requirement}
                  reward={t(C.badgeReward)}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Compteur « +214 » qui monte dès l'affichage (useCountUp — saut direct si
    reduce motion) : la dopamine vit dans l'animation, jamais dans un blocage. */
function ZoneCountUp({ value }: { value: number }) {
  const display = useCountUp(value);
  return <Text style={styles.zonesHero}>+{formatInt(display)}</Text>;
}

/** Une ligne de la synthèse multi-résultats (icône + texte, accent chartreuse). */
function SummaryLine({ line }: { line: ResultSummaryLine }) {
  return (
    <View style={styles.summaryLine}>
      <Icon name={line.icon} size={16} color={line.accent ? colors.chartreuse : colors.gris} />
      <Text style={[styles.summaryLineText, line.accent && styles.summaryLineAccent]} numberOfLines={1}>
        {line.text}
      </Text>
    </View>
  );
}

/** Une ligne « libellé … valeur » de la décomposition zones post-run (§B.4). */
function CalcZoneRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.calcZoneRow}>
      <Text style={styles.calcZoneLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.calcZoneValue, accent && styles.calcZoneValueAccent]}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
      {note ? (
        <Text style={styles.miniStatNote} numberOfLines={1}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

// ─── AMENDEMENT-17 §CH2 — Résultat FRONTIÈRE OUVERTE (fermable non fermée) ───
// « Ouvre une frontière. Ton crew peut la fermer. » Un run VALIDE, long, NON
// bouclé mais FERMABLE : au lieu de jeter la course, on propose de la fermer
// (soi-même maintenant) OU de la confier au crew. UX simple, vocabulaire
// frontière/zone, jamais de polyline/cellule/% de géométrie : « Il manque
// 620 m. Expire dans 23 h. » Un écran = une action (les deux CTA cadrent la
// même décision : refermer la boucle).

function OpenBoundaryResult({ boundary }: { boundary: PartialBoundaryDemo }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const [askedToast, setAskedToast] = useState(false);

  useEffect(() => {
    screen('course_result', { mode: 'conquete', boundary: 'open' });
    track(EVENTS.celebrationViewed, { mode: 'conquete' });
    // Haptic d'ouverture : une frontière est née — success léger, jamais de shame.
    haptics.success();
  }, []);

  // « Demander au crew » (démo) : la mission part dans la War Room. Toast
  // éphémère (auto-dismiss) — pas de vraie notif ici (V1 : notif crew serveur).
  useEffect(() => {
    if (!askedToast) return;
    const id = setTimeout(() => setAskedToast(false), 2_600);
    return () => clearTimeout(id);
  }, [askedToast]);

  const finishNow = () => {
    haptics.medium();
    // Reprend la course en mode « terminer » : le live couvre le segment manquant.
    router.replace({
      pathname: '/course-live',
      params: { mode: 'conquete', intention: 'complete', boundary: boundary.id },
    });
  };
  const askCrew = () => {
    haptics.light();
    track(EVENTS.shareCardGenerated);
    setAskedToast(true);
  };
  const goMap = () => router.replace('/(tabs)');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      <View style={styles.bar}>
        <Text style={styles.barKicker}>{t(C.barKicker)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Course validée + GRYD VERIFIED (le run compte — anti-shame). */}
        <ResultReveal visible haptic="none" style={styles.block}>
          <View style={styles.validated}>
            <Text style={styles.validatedTitle}>{t(C.runValidated)}</Text>
            <StatePill state="verified" label="GRYD VERIFIED" />
          </View>
        </ResultReveal>

        {/* FRONTIÈRE OUVERTE : le KPI = mètres manquants, pas un % de géométrie. */}
        <ResultReveal visible haptic="none" style={styles.block}>
          <View style={styles.boundaryCard}>
            <View style={styles.boundaryHead}>
              <Icon name="route" size={16} color={colors.chartreuse} />
              <Text style={styles.boundaryKicker}>{t(C.openBoundaryKicker)}</Text>
            </View>
            <Text style={styles.boundaryLead}>
              {t(C.tracedPrefix)}{' '}
              <Text style={styles.boundaryLeadAccent}>{tracedKmLabel(boundary)}</Text>{' '}
              {t(C.tracedSuffix, { zone: boundary.zone })}
            </Text>
            <Text style={styles.boundaryMissing}>
              {t(C.missingPrefix)}{' '}
              <Text style={styles.boundaryMissingAccent}>{formatInt(boundary.missingM)} m</Text>{' '}
              {t(C.missingSuffix)}
            </Text>
            <View style={styles.boundaryMetaRow}>
              <Icon name="verrou" size={iconSizes.xs} color={colors.gris} />
              <Text style={styles.boundaryMeta}>{boundaryExpiryLabel(boundary)}</Text>
            </View>
          </View>
        </ResultReveal>
      </ScrollView>

      {/* Actions : Terminer maintenant (principal) · Demander au crew (secondaire). */}
      <View style={[styles.boundaryActions, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={finishNow}
          style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
        >
          <Icon name="route" size={iconSizes.md} color={colors.noir} />
          <Text style={styles.shareLabel}>{t(C.finishNow)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={askCrew}
          style={({ pressed }) => [styles.boundarySecondary, pressed && styles.pressed]}
        >
          <Icon name="crew" size={iconSizes.sm} color={colors.blanc} />
          <Text style={styles.boundarySecondaryLabel}>{t(C.askCrew)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.seeTerritory)}
          onPress={goMap}
          hitSlop={8}
          style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
        >
          <Text style={styles.mapLinkLabel}>{t(C.seeTerritory)}</Text>
        </Pressable>
      </View>

      {/* Toast « Mission envoyée dans la War Room. » (démo — auto-dismiss). */}
      {askedToast ? (
        <BoundaryToast bottom={insets.bottom + 96} text={t(C.missionSentToast)} />
      ) : null}
    </View>
  );
}

// ─── AMENDEMENT-17 §CH2 — Résultat BOUCLE CREW FERMÉE (complétion) ───────────
// Un membre a couru le segment manquant : la boucle se referme, la zone est
// CREW, les contributions se répartissent au prorata de la longueur validée.
// Copy gelée : « Boucle crew fermée · République capturée · Benjamin 79 % ·
// Lena 21 % · Crew +420 pts. » Simple, jamais de détail technique.

function CompletedBoundaryResult({ boundary }: { boundary: PartialBoundaryDemo }) {
  const insets = useSafeAreaInsets();
  const t = useT();

  useEffect(() => {
    screen('course_result', { mode: 'conquete', boundary: 'completed' });
    track(EVENTS.celebrationViewed, { mode: 'conquete' });
    // La zone crew tombe : célébration franche (heavy) — le geste signature.
    haptics.heavy();
  }, []);

  const share = () => {
    haptics.medium();
    track(EVENTS.shareCardGenerated);
    // Partage VRAI : la card montre CETTE zone crew (nom + points), pas la démo.
    setShareRun({
      mode: 'conquete',
      intention: 'conquest',
      card: shareCardFromResult({
        zoneName: boundary.zone,
        crewPoints: boundary.crewPoints,
      }),
    });
    router.push({
      pathname: '/partage',
      params: { mode: 'conquete', intention: 'conquest', template: 'crew' },
    });
  };
  const goMap = () => router.replace('/(tabs)');

  return (
    <View style={[styles.root, { paddingTop: insets.top + 10 }]}>
      <View style={styles.bar}>
        <Text style={styles.barKicker}>{t(C.barKicker)}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Le titre = le geste : la boucle crew est fermée, la zone capturée. */}
        <ResultReveal visible haptic="success" style={styles.block}>
          <View style={styles.validated}>
            <Text style={styles.validatedTitle}>{t(C.crewLoopClosed)}</Text>
            <StatePill state="verified" label="GRYD VERIFIED" />
          </View>
        </ResultReveal>

        {/* KPI géant : la zone capturée (chartreuse). */}
        <ResultReveal visible style={styles.block}>
          <View style={styles.zonesBlock}>
            <Text style={styles.boundaryZoneHero} numberOfLines={1}>
              {boundary.zone}
            </Text>
            <Text style={styles.zonesLabel}>{t(C.zoneCapturedLabel)}</Text>
          </View>
        </ResultReveal>

        {/* Contributions crew au prorata (moteur) — simple, sans géométrie. */}
        <ResultReveal visible style={styles.block}>
          <Text style={styles.stepKicker}>{t(C.crewContribKicker)}</Text>
          <View style={styles.contribCard}>
            {boundary.contributions.map((c) => (
              <View key={c.name} style={styles.contribRow}>
                <View style={styles.contribAvatar}>
                  <Text style={styles.contribAvatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.contribName} numberOfLines={1}>
                  {c.name}
                </Text>
                <Text style={styles.contribPct}>{contributionPct(c.share)} %</Text>
              </View>
            ))}
            <View style={styles.contribDivider} />
            <View style={styles.contribRow}>
              <Icon name="coffre" size={iconSizes.sm} color={gameColors.gold} />
              <Text style={styles.contribName}>Crew</Text>
              <Text style={[styles.contribPct, styles.contribCrewPts]}>
                {t(C.crewPts, { n: formatInt(boundary.crewPoints) })}
              </Text>
            </View>
          </View>
        </ResultReveal>
      </ScrollView>

      <View style={[styles.boundaryActions, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={share}
          style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
        >
          <Icon name="partage" size={iconSizes.md} color={colors.noir} />
          <Text style={styles.shareLabel}>{t(C.shareConquest)}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.seeTerritory)}
          onPress={goMap}
          hitSlop={8}
          style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}
        >
          <Text style={styles.mapLinkLabel}>{t(C.seeTerritory)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Toast bas éphémère (démo « Demander au crew ») — fondu simple, anti-bruit. */
function BoundaryToast({ bottom, text }: { bottom: number; text: string }) {
  const { opacity, scale } = useReveal(true);
  return (
    <Animated.View
      style={[styles.toastWrap, { bottom, opacity, transform: [{ scale }] }]}
      pointerEvents="none"
    >
      <View style={styles.toast}>
        <Icon name="crew" size={16} color={colors.chartreuse} />
        <Text style={styles.toastText} numberOfLines={1}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },

  // ── Aucun résultat à montrer (état vide honnête) ──
  noResultRoot: {
    flex: 1,
    backgroundColor: colors.noir,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  noResultBlock: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  noResultTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  noResultBody: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
  },
  noResultCta: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Chartreuse = fond, texte NOIR (jamais de chartreuse sur clair — charte).
  noResultCtaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '700' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: spacing.xs,
  },
  barKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  content: { paddingHorizontal: spacing.cardPadding, gap: 18, paddingTop: spacing.xs },
  block: { gap: 10 },
  pressed: { opacity: 0.75 },

  // ── ÉCRAN 1 — émotionnel d'abord (AMENDEMENT-20 §2) ──
  hero: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl, paddingBottom: spacing.xs },
  heroGrip: { alignItems: 'center' },
  heroTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  heroKpi: { alignItems: 'center', gap: 2 },
  heroKpiLabel: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    letterSpacing: 4,
  },
  heroLine: {
    color: colors.chartreuse,
    fontSize: fontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Le POURQUOI du chiffre (« Boucle fermée · +42 zones d'un coup ») — niveau 1.
  heroWhy: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Mini-bandeau badge tappable (hook de rétention visible, ≥ 44 px).
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    backgroundColor: gameColors.carbon,
    marginTop: 2,
  },
  heroBadgeText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  heroQueued: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },

  // Toggle détails — secondaire discret, sous le CTA principal (cible ≥ 44 px).
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  detailsToggleLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  detailsWrap: { gap: 18, marginTop: 4 },

  // ── Détails : Impact total ──
  impactTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: spacing.sm,
  },
  impactTotalLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },
  impactTotalValue: {
    color: colors.chartreuse,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  impactTotalSub: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },

  // ── Détails : GRYD Verified ──
  verifiedCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 14,
    alignItems: 'flex-start',
  },
  verifiedTrust: { flexDirection: 'row', gap: spacing.xl, alignSelf: 'stretch' },


  // ── Explicabilité post-run « Comment est calculé ce résultat ? » (§B.4) ──
  // Accordéon replié : en-tête tappable + corps (schéma + décomposition). Pas
  // de card-dans-card : le corps est séparé par l'espace, contour d'état only.
  calcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    backgroundColor: gameColors.carbon,
  },
  calcHeaderLabel: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
  calcBody: { gap: spacing.md, paddingTop: spacing.xxs },
  calcSchema: { alignItems: 'center' },
  calcZonesRows: { gap: spacing.xs },
  calcZoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcZoneLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  calcZoneValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  calcZoneValueAccent: { color: colors.chartreuse },
  calcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: spacing.md,
  },
  // 3 par ligne (33 %) — MiniStat garde son flex:1 dans sa cellule.
  calcCell: { width: '33%', flexDirection: 'row' },
  calcVerifyNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },

  stepKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // ── Synthèse multi-résultats (AMENDEMENT-16 §1) ──
  summaryCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  summaryHead: { gap: 4 },
  summaryKicker: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
  },
  summaryCopy: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 18 },
  summaryLines: { gap: spacing.xs },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryLineText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  summaryLineAccent: { color: colors.chartreuse, fontWeight: '800' },

  validated: { alignItems: 'center', gap: 10, paddingVertical: spacing.xs },
  validatedTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  validatedSub: { color: colors.gris, fontSize: fontSizes.sm, textAlign: 'center' },

  zonesBlock: { alignItems: 'center', gap: spacing.xxs, paddingVertical: 6 },
  zonesHero: {
    color: colors.chartreuse,
    fontSize: fontSizes.hero,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  zonesLabel: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 2,
  },
  zonesSub: { color: colors.gris, fontSize: fontSizes.xs, textAlign: 'center' },
  /** « dont N en boucle fermée » — le geste signature, en chartreuse. */
  zonesLoop: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  // ── Contribution crew : KPI géant ──
  crewKpiBlock: { alignItems: 'center', gap: 2, paddingVertical: 4 },
  crewKpi: {
    color: colors.chartreuse,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  crewKpiLabel: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  statsCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  statsHero: {
    color: colors.blanc,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statsHeroUnit: { color: colors.gris, fontSize: fontSizes.lg, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  miniStat: { flex: 1, gap: 2 },
  miniStatValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  miniStatLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  // Repère « démo » discret : distingue une valeur de scénario d'une vraie mesure
  // (honnêteté §A) — jamais mêlée sans distinction aux vraies stats GPS/MOUVEMENT.
  miniStatNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: 1,
  },
  statsNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },

  crewLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  crewText: { color: colors.blanc, fontSize: fontSizes.sm, flex: 1, lineHeight: 20 },
  crewPct: { color: colors.chartreuse, fontWeight: '800' },

  perfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
  },
  perfTextWrap: { flex: 1, gap: 2 },
  perfTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  perfSub: { color: colors.gris, fontSize: fontSizes.xs },

  // ── Bonus appliqué (AMENDEMENT-19 §4) : ligne sobre, liseré chartreuse ──
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    padding: 14,
  },
  bonusIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.control,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.carbone,
  },
  bonusTextWrap: { flex: 1, gap: 2 },
  bonusName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  bonusEffect: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '800' },

  actions: { gap: 10, marginTop: 4 },
  shareButton: {
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Libellé NOIR sur chartreuse (charte — jamais de chartreuse sur fond clair).
  shareLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },
  // « Voir mon territoire » (écrans frontière) — lien discret sous 2 boutons
  // (cible ≥ 44 px avec le hitSlop).
  mapLink: { alignItems: 'center', paddingVertical: 12 },
  mapLinkLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },

  // ── AMENDEMENT-17 §CH2 — Frontière crew (ouverte / fermée) ──
  boundaryCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    padding: spacing.cardPadding,
    gap: 10,
  },
  boundaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boundaryKicker: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
  },
  boundaryLead: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600', lineHeight: 24 },
  boundaryLeadAccent: { color: colors.chartreuse, fontWeight: '800' },
  boundaryMissing: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', lineHeight: 26 },
  boundaryMissingAccent: {
    color: colors.chartreuse,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  boundaryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  boundaryMeta: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // Actions ancrées bas (pas dans le ScrollView — un écran = une action).
  boundaryActions: {
    paddingHorizontal: spacing.cardPadding,
    gap: 10,
    paddingTop: 6,
  },
  boundarySecondary: {
    height: 50,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  boundarySecondaryLabel: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },

  // Boucle crew fermée : hero de zone + contributions.
  boundaryZoneHero: {
    color: colors.chartreuse,
    fontSize: fontSizes.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  contribCard: {
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  contribAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.chartreuse14,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contribAvatarText: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '800' },
  contribName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', flex: 1 },
  contribPct: {
    color: colors.chartreuse,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  contribDivider: { height: 1, backgroundColor: colors.grisLigne },
  contribCrewPts: { color: gameColors.gold },

  // Toast bas éphémère (« Mission envoyée dans la War Room. »).
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    maxWidth: 340,
  },
  toastText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
});
