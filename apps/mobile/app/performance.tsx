/**
 * GRYD — E18 « STATISTIQUES & DATA » (recalage planche, 25/07/2026).
 *
 * Un écran d'ANALYSE, pas un tableau de bord SaaS. TROIS blocs, et trois
 * seulement — volume · territoire · régularité — qui suivent STRICTEMENT la même
 * grammaire :  CHIFFRE → GRAPHIQUE → CONCLUSION EN LANGAGE NATUREL.
 * Le regard obtient la réponse SANS lire un axe : la valeur qui porte le message
 * est écrite à côté de sa marque, et la phrase du bas dit ce qu'il faut retenir.
 *
 * ─── CE QUI A REMPLACÉ QUOI ─────────────────────────────────────────────────
 * L'écran s'appelait « Performance » et empilait quatre cards (Cette semaine ·
 * Progression · Records · GRYD Verify). La planche demande trois blocs et un
 * commutateur de période : GRYD Verify SORT (voir « écarts »).
 *
 * ─── RETOUR DES RECORDS PERSONNELS (25/07/2026, décision fondateur) ─────────
 * Le recalage les avait sortis de l'app ENTIÈRE — plus aucune surface ne portait
 * le palmarès. Ils reviennent SOUS les trois blocs, et sous une autre forme :
 * une liste factuelle, sans graphique ni conclusion (cf. l'en-tête de
 * `stats/RecordsSection.tsx`). La règle des trois blocs vise la grammaire
 * d'ANALYSE ; un palmarès constate, il n'analyse pas — l'habiller en quatrième
 * bloc lui promettrait une tendance et une interprétation qu'il n'a pas.
 * Ils se dérivent de la lecture DÉJÀ FAITE par `useStats` (`stats/records.ts`) :
 * l'ancienne lecture `useMyPerformance` n'est PAS rouverte — deux lectures des
 * mêmes `runs` finissent par se contredire à l'écran.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE (aucun n'est masqué) ───────────────────────
 * 1. COMMUTATEUR RUN/BIKE — OMIS entièrement. Il n'existe aucun drapeau `bike`
 *    dans `lib/flags.ts`, `runs` n'a aucune colonne de type d'activité (`source`
 *    ∈ gps|healthkit|strava|gpx) et le vélo est un chantier non commencé. Le
 *    peindre — même « masqué par un drapeau OFF » — serait un contrôle mort.
 * 2. SEGMENT « SAISON » — rendu UNIQUEMENT quand une saison RÉELLE est ouverte
 *    (`useActiveSeason().status === 'active'`). Sans saison en base, l'onglet
 *    serait vide à vie. L'absence d'un contrôle n'est pas un mensonge ; un
 *    contrôle qui échoue toujours en est un.
 * 3. COURBE DE SURFACE TENUE — INTENABLE. `hex_claims` ne garde que le
 *    propriétaire COURANT : une zone perdue disparaît sans trace, aucune table
 *    n'historise les pertes. Une courbe reconstruite serait croissante par
 *    construction, donc affirmerait qu'on n'a jamais rien perdu. Remplacée par
 *    l'aire des GAINS par semaine, titrée sans ambiguïté.
 * 4. « Aucune perte de zone depuis 12 jours » — SUPPRIMÉ : strictement
 *    indérivable (les pertes ne sont nulle part). Remplacé par la meilleure
 *    semaine de capture, qui, elle, se lit dans les payloads serveur.
 * 5. ÉTAT HORS LIGNE (« dernier calcul + horodatage ») — pas d'infra : rien ne
 *    persiste un dernier calcul côté client. Servi par l'état `failed`, honnête,
 *    plutôt que par un horodatage inventé.
 * 6. LIGNE PREMIUM — rendue seulement si `flags.arsenal` : sur le pilote fermé
 *    `/arsenal` redirige vers la carte, la ligne serait un contrôle mort.
 *
 * ─── PORTÉE DU COMMUTATEUR ─────────────────────────────────────────────────
 * Semaine/Mois/Saison pilote le BLOC 1 (et le gain territorial de la période).
 * Les deux lectures HEBDOMADAIRES (aire des gains, carrés de régularité) gardent
 * leur propre horizon : une régularité ne se lit pas sur sept jours, et une aire
 * à un seul point n'est pas une aire. Leur portée est écrite dans leur copie.
 *
 * Analytics : `performance_page_viewed` à l'ouverture (avec la période), puis un
 * `$screen` par bascule — aucun nom d'event inventé hors `events.ts`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  OFFENSIVE_HEX_AREA_KM2,
  colors,
  fonts,
  fontSizes,
  radii,
  sizes,
  spacing,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { flags } from '../src/lib/flags';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { Segmented, type SegmentedOption } from '../src/ui/game';
import { useSession } from '../src/lib/session';
import { useRealTerritories } from '../src/features/map/hexClaims';
import { useActiveSeason } from '../src/features/season/useActiveSeason';
import { useStats } from '../src/features/performance/stats/useStats';
import {
  MIN_RUNS_FOR_TRENDS,
  deriveStats,
  type DerivedStats,
  type StatsPeriod,
} from '../src/features/performance/stats/derive';
import { AreaMini, Bars7, WeekSquares } from '../src/features/performance/stats/charts';
import { StatBlock } from '../src/features/performance/stats/StatBlock';
import { RecordsSection } from '../src/features/performance/stats/RecordsSection';
import {
  deriveRecords,
  type PersonalRecords,
} from '../src/features/performance/stats/records';
import { decimalSeparator } from '../src/ui/format';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { C } from '../src/i18n/catalog/performance';

// ─────────────────────────────────────────────────────────────────────────────
// FORMATAGE — séparateur décimal de la langue, SANS Intl (Hermes n'embarque pas
// ICU : `toLocaleString` n'y est pas fiable). Les unités (km, km²) sont des
// invariants jamais traduits.
// ─────────────────────────────────────────────────────────────────────────────

function fmtNum(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', decimalSeparator());
}

/** Les 7 jours, lundi → dimanche : abréviation d'axe et nom complet (a11y + phrase). */
const DAY_SHORT: readonly Entry[] = [
  C.dayMon,
  C.dayTue,
  C.dayWed,
  C.dayThu,
  C.dayFri,
  C.daySat,
  C.daySun,
];
const DAY_FULL: readonly Entry[] = [
  C.dayMonFull,
  C.dayTueFull,
  C.dayWedFull,
  C.dayThuFull,
  C.dayFriFull,
  C.daySatFull,
  C.daySunFull,
];

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAT VIDE — un bloc, un message, au plus une action (§A : 1 écran = 1
// décision). Les cas ne se remplacent JAMAIS l'un l'autre : ils ne disent pas
// la même chose.
// ─────────────────────────────────────────────────────────────────────────────

function StateBlock({
  title,
  body,
  ctaLabel,
  onPress,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {ctaLabel && onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          onPress={onPress}
          style={({ pressed }) => [styles.stateCta, pressed && styles.pressed]}
        >
          <Text style={styles.stateCtaLabel} numberOfLines={1}>
            {ctaLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LES TROIS BLOCS — uniquement ce que les courses et les captures du joueur
// prouvent. Chaque emplacement disparaît quand sa source manque.
// ─────────────────────────────────────────────────────────────────────────────

interface TerritoryRead {
  /** null tant que la lecture n'a pas répondu — on n'affiche alors RIEN. */
  areaKm2: number | null;
  zones: number;
  loading: boolean;
  failed: boolean;
}

function StatsBody({
  data,
  period,
  territory,
  records,
}: {
  data: DerivedStats;
  period: StatsPeriod;
  territory: TerritoryRead;
  /** Palmarès dérivé des MÊMES lignes que les blocs (jamais d'une 2e lecture). */
  records: PersonalRecords;
}) {
  const t = useT();
  const { volume, weekly } = data;

  // ── Repère temporel d'une semaine, en toutes lettres (VoiceOver + bulles) ──
  const whenLabel = (weeksAgo: number): string =>
    weeksAgo === 0
      ? t(C.weekCurrentLong)
      : weeksAgo === 1
        ? t(C.weekAgoOne)
        : t(C.weeksAgoLong, { n: weeksAgo });

  // ═══ BLOC 1 — VOLUME D'ACTIVITÉ ═══════════════════════════════════════════
  const dayKm = volume.days.map((d) => d.distanceM / 1000);
  const dayTexts = dayKm.map((km, i) =>
    t(C.dayValueA11y, { day: t(DAY_FULL[i] ?? C.dayMonFull), km: fmtNum(km, 1) }),
  );

  // Le delta n'existe que si la fenêtre PRÉCÉDENTE portait des kilomètres :
  // pas de « +0 % » (qui se lit « tu stagnes »), pas de « +∞ », pas de « −100 % »
  // sur une semaine encore vide.
  let deltaEntry: Entry | null = null;
  if (volume.deltaPct !== null) {
    if (period === 'week') deltaEntry = volume.deltaPct >= 0 ? C.volumeUpWeek : C.volumeDownWeek;
    else if (period === 'month')
      deltaEntry = volume.deltaPct >= 0 ? C.volumeUpMonth : C.volumeDownMonth;
    // Saison : aucune « saison précédente » n'est lue — donc aucun delta.
  }

  const bestKm = volume.bestDayIndex === null ? null : (dayKm[volume.bestDayIndex] ?? null);

  let volumeConclusion: string | null = null;
  let volumeNote: string | null = null;
  if (volume.runs === 0) {
    // Fenêtre sans course : les 7 barres restent affichées à plat (c'est une
    // vérité — on est lundi matin), ton NEUTRE, aucune conclusion.
    volumeNote =
      period === 'week'
        ? t(C.weekNoRun)
        : period === 'month'
          ? t(C.volumeNoRunMonth)
          : t(C.volumeNoRunSeason);
  } else if (!volume.enough) {
    volumeNote = t(C.notEnoughData, { n: MIN_RUNS_FOR_TRENDS });
  } else if (volume.bestDayIndex !== null) {
    const day = t(DAY_FULL[volume.bestDayIndex] ?? C.dayMonFull);
    // Variante « captures » seulement si TOUS les payloads de la fenêtre sont
    // lisibles ET qu'il y a bien eu des captures. Sinon repli sur les courses —
    // jamais un compteur de captures reconstitué.
    volumeConclusion =
      volume.totalCaptures !== null &&
      volume.totalCaptures > 0 &&
      volume.bestDayCaptures !== null &&
      volume.bestDayCaptures > 0
        ? t(C.volumeBestDayCaptures, {
            day,
            n: volume.bestDayCaptures,
            total: volume.totalCaptures,
          })
        : t(C.volumeBestDayRuns, { day, n: volume.bestDayRuns, total: volume.runs });
  }

  // ═══ BLOC 2 — PROGRESSION TERRITORIALE ════════════════════════════════════
  const gainHexes = data.capturedInPeriod;
  const gainEntry =
    period === 'week'
      ? C.territoryGainedWeek
      : period === 'month'
        ? C.territoryGainedMonth
        : C.territoryGainedSeason;

  const areaValues = weekly.weeks.map((w) => (w.capturedHexes ?? 0) * OFFENSIVE_HEX_AREA_KM2);
  const areaTexts = weekly.weeks.map((w, i) =>
    t(C.weekAreaA11y, { when: whenLabel(w.weeksAgo), km2: fmtNum(areaValues[i] ?? 0, 2) }),
  );
  const enoughWeeks = weekly.weeks.length >= 2;
  const captured = weekly.capturedTotalHexes;
  const showArea = enoughWeeks && captured !== null && captured > 0;

  let territoryNote: string | null = null;
  if (territory.loading) territoryNote = t(C.territoryLoading);
  else if (territory.failed || territory.areaKm2 === null) territoryNote = t(C.territoryFailed);
  else if (!enoughWeeks) territoryNote = t(C.notEnoughData, { n: MIN_RUNS_FOR_TRENDS });
  else if (captured === null) territoryNote = t(C.territoryImpactUnknown);
  else if (captured === 0) territoryNote = t(C.territoryNoCapture);

  const bestWeek =
    weekly.bestCaptureWeekIndex === null ? null : weekly.weeks[weekly.bestCaptureWeekIndex];

  // ═══ BLOC 3 — RÉGULARITÉ ══════════════════════════════════════════════════
  const squares = weekly.weeks.map((w) => w.runs > 0);
  const squareTexts = weekly.weeks.map((w) =>
    t(w.runs > 0 ? C.weekActiveA11y : C.weekIdleA11y, { when: whenLabel(w.weeksAgo) }),
  );

  const openPremium = () => {
    haptics.light();
    router.push('/arsenal');
  };

  return (
    <View style={styles.stack}>
      <StatBlock
        title={t(C.volumeTitle)}
        value={fmtNum(volume.distanceM / 1000, 1)}
        unit={t(C.weekKm)}
        delta={
          deltaEntry && volume.deltaPct !== null
            ? {
                text: t(deltaEntry, { pct: Math.abs(volume.deltaPct) }),
                positive: volume.deltaPct >= 0,
              }
            : null
        }
        chart={
          <Bars7
            values={dayKm}
            bestIndex={volume.bestDayIndex}
            shortLabels={DAY_SHORT.map((e) => t(e))}
            a11yLabels={dayTexts}
            tooltips={dayTexts}
            groupLabel={t(C.chartBarsA11y)}
            bestValueLabel={bestKm === null ? null : `${fmtNum(bestKm, 1)} ${t(C.weekKm)}`}
          />
        }
        conclusion={volumeConclusion}
        note={volumeNote}
      />

      <StatBlock
        title={t(C.territoryTitle)}
        // Aucune valeur par défaut avant hydratation : tant que `hex_claims`
        // n'a pas répondu, pas de « 0,00 km² » (ce serait une affirmation).
        value={territory.areaKm2 === null ? null : fmtNum(territory.areaKm2, 2)}
        unit={territory.areaKm2 === null ? null : t(C.territoryUnit)}
        sub={
          territory.areaKm2 === null ? null : t(C.territoryZonesHeld, { n: territory.zones })
        }
        // GAIN de la période, jamais un solde net : les pertes ne sont mesurées
        // nulle part, présenter « +x vs la semaine dernière » serait un mensonge.
        delta={
          gainHexes !== null && gainHexes > 0
            ? {
                text: t(gainEntry, { km2: fmtNum(gainHexes * OFFENSIVE_HEX_AREA_KM2, 2) }),
                positive: true,
              }
            : null
        }
        chart={
          showArea ? (
            <AreaMini
              values={areaValues}
              a11yLabels={areaTexts}
              tooltips={areaTexts}
              groupLabel={t(C.chartAreaA11y)}
              firstLabel={t(C.trendWeekAgo, { n: weekly.weeks[0]?.weeksAgo ?? 0 })}
              lastLabel={t(C.trendThisWeek)}
            />
          ) : null
        }
        caption={showArea ? t(C.territoryChartCaption) : null}
        conclusion={
          showArea && bestWeek && bestWeek.capturedHexes
            ? t(C.territoryBestWeek, { n: bestWeek.capturedHexes })
            : null
        }
        note={territoryNote}
      />

      <StatBlock
        title={t(C.regularityTitle)}
        value={enoughWeeks ? fmtNum(weekly.avgRunsPerWeek, 1) : null}
        unit={enoughWeeks ? t(C.regularityUnit) : null}
        sub={enoughWeeks ? t(C.regularityAverageOver, { n: weekly.weeks.length }) : null}
        chart={
          enoughWeeks ? (
            <WeekSquares
              active={squares}
              a11yLabels={squareTexts}
              tooltips={squareTexts}
              groupLabel={t(C.chartSquaresA11y)}
            />
          ) : null
        }
        conclusion={
          enoughWeeks
            ? weekly.streakWeeks >= 2
              ? t(C.regularityStreak, { n: weekly.streakWeeks })
              : t(C.regularityBuilding)
            : null
        }
        note={enoughWeeks ? null : t(C.notEnoughData, { n: MIN_RUNS_FOR_TRENDS })}
      />

      {/* LE PALMARÈS — sous les trois blocs, jamais à leur niveau : liste de
          faits, sans graphique ni conclusion (cf. `RecordsSection`). Il ne suit
          PAS le commutateur de période : un record est « de tous les temps »
          par définition — le filtrer sur la semaine en ferait un simple
          maximum hebdomadaire déguisé en record. */}
      <RecordsSection records={records} />

      {/* Entrée Premium : une LIGNE légère en bas du gratuit, sans pression et
          sans jamais laisser croire que la heatmap existe déjà. Rendue seulement
          si la surface Arsenal existe — sinon `/arsenal` redirige vers la carte
          et ce serait un contrôle mort. */}
      {flags.arsenal ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.premiumA11y)}
          onPress={openPremium}
          style={({ pressed }) => [styles.premiumRow, pressed && styles.pressed]}
        >
          <Text style={styles.premiumText}>{t(C.premiumRow)}</Text>
          <Text style={styles.premiumCta}>{t(C.premiumCta)}</Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PerformanceScreen() {
  const t = useT();
  const { configured, session } = useSession();
  // Règle des hooks : tout est appelé INCONDITIONNELLEMENT, avant toute branche.
  const stats = useStats();
  const seasonState = useActiveSeason();
  // MÊME source et MÊME hook que la carte et /territoire : les trois écrans ne
  // doivent pas pouvoir se contredire sur le km² tenu. Sans `crewIds`, seul ce
  // qui m'appartient est classé 'crew' — le périmètre de « ma » surface.
  const territories = useRealTerritories();
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const firstRender = useRef(true);

  const rawSeasonStart = seasonState.season ? Date.parse(seasonState.season.startsAt) : Number.NaN;
  const seasonStartMs =
    seasonState.status === 'active' && Number.isFinite(rawSeasonStart) ? rawSeasonStart : null;

  // Si la saison se referme (ou n'a jamais existé) pendant qu'on la regarde, la
  // période retombe sur la semaine : aucun segment ne survit à sa donnée.
  useEffect(() => {
    if (seasonStartMs === null && period === 'season') setPeriod('week');
  }, [seasonStartMs, period]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      track(EVENTS.performancePageViewed, { period });
      return;
    }
    // Pas d'event §8 pour un changement de période : on n'en invente pas.
    screen(`performance_${period}`);
  }, [period]);

  const derived = useMemo(
    () => (stats.rows ? deriveStats(stats.rows, new Date(), period, seasonStartMs) : null),
    [stats.rows, period, seasonStartMs],
  );

  // MÊMES lignes que les trois blocs — aucune seconde lecture de `runs`. Le
  // palmarès ne dépend ni de la période ni de l'horloge : il ne se recalcule
  // qu'au changement de données.
  const records = useMemo(() => (stats.rows ? deriveRecords(stats.rows) : null), [stats.rows]);

  const territory = useMemo<TerritoryRead>(() => {
    const mine = (territories.territories ?? []).filter((x) => x.props.status === 'crew');
    return {
      areaKm2:
        territories.territories === null
          ? null
          : mine.reduce((sum, x) => sum + x.props.areaM2, 0) / 1_000_000,
      zones: mine.reduce((sum, x) => sum + x.zoneCount, 0),
      loading: territories.loading,
      failed: territories.failed,
    };
  }, [territories.territories, territories.loading, territories.failed]);

  /** Un écran de connexion qui MARCHE existe-t-il ? Sans backend, /sign-in
   *  redirige vers la carte : proposer le bouton enverrait dans un cul-de-sac. */
  const canSignIn = configured && !session;

  const periodOptions: SegmentedOption<StatsPeriod>[] = [
    { id: 'week', label: t(C.periodWeek) },
    { id: 'month', label: t(C.periodMonth) },
  ];
  // « Saison » n'apparaît QUE si une saison réelle est ouverte (cf. écart n° 2).
  if (seasonStartMs !== null) periodOptions.push({ id: 'season', label: t(C.periodSeason) });

  let body: React.ReactNode;
  switch (stats.status) {
    case 'signed-out':
      body = canSignIn ? (
        <StateBlock
          title={t(C.signedOutTitle)}
          body={t(C.signedOutBody)}
          ctaLabel={t(C.signIn)}
          onPress={() => router.push('/sign-in')}
        />
      ) : (
        <StateBlock title={t(C.noBackendTitle)} body={t(C.noBackendBody)} />
      );
      break;
    case 'loading':
      // Une ligne, pas un spinner plein écran. État BORNÉ : la lecture aboutit
      // ou bascule sur `failed`. Un chargement n'affirme RIEN sur le joueur.
      body = <Text style={styles.stateInline}>{t(C.loading)}</Text>;
      break;
    case 'failed':
      body = (
        <StateBlock
          title={t(C.failedTitle)}
          body={t(C.failedBody)}
          ctaLabel={t(C.retry)}
          onPress={stats.reload}
        />
      );
      break;
    case 'ready':
      body =
        derived && records && derived.countedRuns > 0 ? (
          <>
            {/* Le seul groupe de choix de l'écran. `tone="surface"` : la
                chartreuse est ici une couleur de DONNÉE (rôle « moi »), elle ne
                doit pas être dépensée sur un filtre. */}
            <Segmented
              options={periodOptions}
              value={period}
              onChange={setPeriod}
              tone="surface"
              accessibilityLabel={t(C.periodA11y)}
              style={styles.periods}
            />
            <StatsBody
              data={derived}
              period={period}
              territory={territory}
              records={records}
            />
          </>
        ) : (
          // Compte relié, zéro course ingérée : ce n'est pas une panne, c'est
          // son point de départ. On dit ce que la page contiendra, et le seul
          // geste qui la remplit.
          <StateBlock
            title={t(C.emptyTitle)}
            body={t(C.emptyBody)}
            ctaLabel={t(C.emptyCta)}
            onPress={() => router.push('/')}
          />
        );
      break;
  }

  return (
    <StackScreen title={t(C.title)} icon="performance">
      {body}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  periods: { marginTop: spacing.xxs, marginBottom: spacing.sm },
  stack: { gap: spacing.sm },
  pressed: { opacity: 0.6 },

  // ── Entrée Premium : une ligne, jamais une card, jamais un CTA chartreuse ──
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
  },
  premiumText: { flex: 1, color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  premiumCta: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },

  // ── États vides (mêmes formes que le profil : une seule grammaire) ──
  stateCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  stateTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
  },
  stateBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  // CTA chartreuse sur fond SOMBRE, texte noir dessus (jamais l'inverse).
  stateCta: {
    marginTop: spacing.xs,
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  stateCtaLabel: {
    color: colors.noir,
    fontSize: fontSizes.sm,
    fontFamily: fonts.display,
    fontWeight: '800',
  },
  stateInline: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
  },
});
