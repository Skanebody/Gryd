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
 * ─── COMMUTATEUR RUN / BIKE (planche E14, propagé le 25/07/2026) ────────────
 * L'écart n° 1 de cet en-tête disait « OMIS entièrement — aucun drapeau `bike`,
 * `runs` sans colonne d'activité ». LES DEUX RAISONS ONT SAUTÉ : `flags.bike`
 * est ouvert (décision fondateur) et `runs.activity` existe (migration 0070).
 * Le commutateur est donc ici, dans `headerRight` — visible seulement si Bike
 * est activé, RETIRÉ (jamais grisé) pendant une course, et sa lentille est
 * mémorisée POUR CET ONGLET (`useActivityLens('stats')`, clé `gryd.activity.stats`).
 * Pendant une course, cette lentille est mise EN VEILLE et la page montre le
 * monde de la course en cours : sans ça, un joueur resté en Bike se retrouverait
 * devant un état vide qu'aucun contrôle visible ne pourrait quitter.
 *
 * CE QU'IL CHANGE DEPUIS LE 26/07/2026 : il BASCULE UNE VRAIE LECTURE. En
 * lentille Bike, les trois blocs DISPARAISSAIENT — c'était juste tant que
 * `runs` ne portait que des courses à pied. Le vélo enregistre désormais
 * (décision fondateur ; `runs.activity`, migration 0070 appliquée) :
 * `useStats(activity)` et `useRealTerritories(undefined, activity)` bornent
 * leurs lectures par `.eq('activity', …)`, et les trois blocs — volume,
 * territoire, régularité — décrivent LA DISCIPLINE CHOISIE.
 *
 * CE QU'IL NE RÉÉTIQUETTE TOUJOURS PAS : aucune ligne de course à pied
 * n'apparaît sous une étiquette vélo. Ce n'est plus une branche d'affichage qui
 * le garantit, c'est le filtre SQL — donc ça ne peut pas être oublié dans un
 * coin de l'écran. Le PALMARÈS suit la même lecture (`records.ts` dérive des
 * MÊMES lignes) : « ton meilleur 5 km » à vélo est le meilleur 5 km à vélo, pas
 * un record de course affiché ailleurs.
 * Quand la lentille vélo est vide, ce n'est plus l'absence d'une fonctionnalité
 * mais le début de CE joueur : la planche E18 a la phrase (« roule deux fois et
 * tes premières tendances apparaissent »), et le CTA DÉCLARE ce qu'il lance.
 *
 * ─── LA COPIE SUIT LA LECTURE (26/07/2026, seconde passe) ───────────────────
 * La bascule de LECTURE était juste ; les MOTS ne suivaient que dans l'état
 * vide. La branche `bike` de cet écran n'est atteinte QUE si la page n'a PAS de
 * données : un cycliste qui a des sorties lisait donc tout le corps en
 * vocabulaire coureur — « courses / sem. » sous le chiffre héros du bloc 3,
 * « {n} de tes {total} courses » en conclusion du bloc 1, « Semaine sans
 * course » à voix haute sur chaque carré éteint, « L'impact de certaines
 * courses n'a pas été enregistré », et surtout « COURS 2 fois pour tes
 * premières tendances » (« LAUF 2 Mal ») : un IMPÉRATIF qui ordonne de courir à
 * quelqu'un qui roule, servi par les TROIS blocs. Les trois états de lecture
 * (pas connecté / sans serveur / échec / chargement) fuyaient de la même façon,
 * alors que le commutateur reste visible dans la barre pendant ces états.
 *
 * Le correctif n'ajoute PAS de `bike ? … : …` : les libellés qui NOMMENT
 * l'effort sont indexés par `Activity` dans le catalogue (`statsCopy` →
 * `STATS_COPY`), l'écran et `StatsBody` lisent ce jeu-là, et `RecordsSection`
 * reçoit la discipline comme `ZoneLeaderboard` — sans défaut, parce qu'un
 * défaut ferait retomber en silence sur la course. Ce qui est déjà NEUTRE
 * (« Volume d'activité », « Semaine active », « Meilleure allure », les
 * légendes de graphique) reste UNIQUE : dupliquer à l'identique créerait deux
 * vérités à maintenir.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE (aucun n'est masqué) ───────────────────────
 * 1. SEGMENT « SAISON » — rendu UNIQUEMENT quand une saison RÉELLE est ouverte
 *    (`useActiveSeason().status === 'active'`). Sans saison en base, l'onglet
 *    serait vide à vie. L'absence d'un contrôle n'est pas un mensonge ; un
 *    contrôle qui échoue toujours en est un.
 * 2. COURBE DE SURFACE TENUE — INTENABLE. `hex_claims` ne garde que le
 *    propriétaire COURANT : une zone perdue disparaît sans trace, aucune table
 *    n'historise les pertes. Une courbe reconstruite serait croissante par
 *    construction, donc affirmerait qu'on n'a jamais rien perdu. Remplacée par
 *    l'aire des GAINS par semaine, titrée sans ambiguïté.
 * 3. « Aucune perte de zone depuis 12 jours » — SUPPRIMÉ : strictement
 *    indérivable (les pertes ne sont nulle part). Remplacé par la meilleure
 *    semaine de capture, qui, elle, se lit dans les payloads serveur.
 * 4. ÉTAT HORS LIGNE (« dernier calcul + horodatage ») — pas d'infra : rien ne
 *    persiste un dernier calcul côté client. Servi par l'état `failed`, honnête,
 *    plutôt que par un horodatage inventé.
 * 5. LIGNE PREMIUM — rendue seulement si `flags.arsenal` : sur le pilote fermé
 *    `/arsenal` redirige vers la carte, la ligne serait un contrôle mort.
 *
 * ─── PORTÉE DU COMMUTATEUR DE PÉRIODE ──────────────────────────────────────
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
  type Activity,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { flags } from '../src/lib/flags';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { ActivitySwitch, useActivityLens } from '../src/ui/ActivitySwitch';
import { startSortieHref } from '../src/ui/activityLens';
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
import { C, statsCopy } from '../src/i18n/catalog/performance';
// E66 : les libellés de la ligne « Analyse territoriale » vivent dans le
// catalogue de CETTE fonctionnalité, pas ici — un seul fichier bouge si elle
// change de nom.
import { C as CA } from '../src/i18n/catalog/premiumAnalytics';

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
  note,
  ctaLabel,
  onPress,
}: {
  title: string;
  body: string;
  /** Seconde ligne FACTUELLE (ex. « tes statistiques à pied restent intactes »). */
  note?: string;
  ctaLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {note !== undefined ? <Text style={styles.stateBody}>{note}</Text> : null}
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
  activity,
}: {
  data: DerivedStats;
  period: StatsPeriod;
  territory: TerritoryRead;
  /** Palmarès dérivé des MÊMES lignes que les blocs (jamais d'une 2e lecture). */
  records: PersonalRecords;
  /**
   * LA DISCIPLINE LUE. Obligatoire, sans défaut : ce corps ne s'affichait
   * qu'avec des données, donc c'est ici — et nulle part ailleurs — qu'un
   * cycliste lisait tout l'écran en vocabulaire coureur. Un défaut ferait
   * retomber en silence sur la course, c'est-à-dire sur le bug lui-même.
   */
  activity: Activity;
}) {
  const t = useT();
  const { volume, weekly } = data;
  /** Les libellés qui NOMMENT l'effort, indexés par discipline (`STATS_COPY`). */
  const S = statsCopy(activity);

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
        ? t(S.weekNoRun)
        : period === 'month'
          ? t(S.volumeNoRunMonth)
          : t(S.volumeNoRunSeason);
  } else if (!volume.enough) {
    volumeNote = t(S.notEnoughData, { n: MIN_RUNS_FOR_TRENDS });
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
        : t(S.volumeBestDayRuns, { day, n: volume.bestDayRuns, total: volume.runs });
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
  else if (!enoughWeeks) territoryNote = t(S.notEnoughData, { n: MIN_RUNS_FOR_TRENDS });
  else if (captured === null) territoryNote = t(S.territoryImpactUnknown);
  else if (captured === 0) territoryNote = t(C.territoryNoCapture);

  const bestWeek =
    weekly.bestCaptureWeekIndex === null ? null : weekly.weeks[weekly.bestCaptureWeekIndex];

  // ═══ BLOC 3 — RÉGULARITÉ ══════════════════════════════════════════════════
  const squares = weekly.weeks.map((w) => w.runs > 0);
  // « Semaine active » est déjà neutre et reste unique ; seul le carré ÉTEINT
  // nommait le sport (« Semaine sans course », lu à voix haute).
  const squareTexts = weekly.weeks.map((w) =>
    t(w.runs > 0 ? C.weekActiveA11y : S.weekIdleA11y, { when: whenLabel(w.weeksAgo) }),
  );

  const openPremium = () => {
    haptics.light();
    router.push('/arsenal');
  };

  /** E66 — l'écran d'analyse territoriale (Club). Voir la ligne en bas de page. */
  const openTerritoryAnalytics = () => {
    haptics.light();
    router.push('/premium-analytics');
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
        unit={enoughWeeks ? t(S.regularityUnit) : null}
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
        note={enoughWeeks ? null : t(S.notEnoughData, { n: MIN_RUNS_FOR_TRENDS })}
      />

      {/* LE PALMARÈS — sous les trois blocs, jamais à leur niveau : liste de
          faits, sans graphique ni conclusion (cf. `RecordsSection`). Il ne suit
          PAS le commutateur de période : un record est « de tous les temps »
          par définition — le filtrer sur la semaine en ferait un simple
          maximum hebdomadaire déguisé en record. */}
      <RecordsSection records={records} activity={activity} />

      {/* E66 « Analyse territoriale » (27/07/2026) — la heatmap et les stats
          avancées que le catalogue Arsenal vend au Club EXISTENT désormais
          (`app/premium-analytics.tsx`, calcul pur dans
          `features/premium/analytics/`). La ligne est donc TOUJOURS tappable, et
          ce n'est pas un bouton mort : l'écran d'arrivée sait dire lui-même son
          état — pas connecté / pas encore Club (aperçu honnête + renvoi vers
          /premium) / échec / lu. Rien n'y est floué ni fabriqué. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(CA.entryA11y)}
        onPress={openTerritoryAnalytics}
        style={({ pressed }) => [styles.premiumRow, pressed && styles.pressed]}
      >
        <Text style={styles.premiumText}>{t(CA.entryRow)}</Text>
        <Text style={styles.premiumCta}>{t(CA.entryCta)}</Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>

      {/* Entrée Premium : une LIGNE légère en bas du gratuit, sans pression.
          La planche pose ce renvoi ; on le garde TOUJOURS présent, mais son état
          suit la RÉALITÉ.
          · surface premium ouverte (`flags.arsenal`) → ligne tappable vers
            l'Arsenal, « Premium › » ;
          · sinon → l'achat (RevenueCat, O3) n'est pas branché : le seul renvoi
            honnête est « Bientôt », une ligne NON cliquable (pas de chevron, pas
            de `Pressable`) — jamais un contrôle mort ni un faux paywall.
          (La mention « la heatmap n'existe pas encore » a sauté le 27/07/2026 :
          elle est construite — voir la ligne E66 juste au-dessus.) */}
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
      ) : (
        <View
          accessibilityRole="text"
          accessibilityLabel={t(C.premiumSoonA11y)}
          style={styles.premiumRow}
        >
          <Text style={styles.premiumText}>{t(C.premiumRow)}</Text>
          {/* Puce « Bientôt » à la place du « Premium › » : elle DIT que c'est à
              venir, elle n'invite pas à un achat qui n'existe pas encore. */}
          <View style={styles.soonPill}>
            <Text style={styles.soonPillText}>{t(C.premiumSoon)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PerformanceScreen() {
  const t = useT();
  const { configured, session } = useSession();
  // Règle des hooks : tout est appelé INCONDITIONNELLEMENT, avant toute branche.
  // LENTILLE de CET onglet (planche E14, « mémorisé par onglet ») + éligibilité
  // du commutateur (flags.bike, retiré pendant une course). Déclarée AVANT les
  // lectures : ce sont elles qui en dépendent, plus l'inverse.
  const { activity, setActivity, switchVisible } = useActivityLens('stats');
  const bike = activity === 'bike';
  /**
   * LES ÉTATS DE LECTURE PARLENT AUSSI DU MONDE REGARDÉ (26/07/2026). Le
   * commutateur vit dans la barre, hors de `stats.status` : un cycliste
   * déconnecté, en échec ou en cours de lecture voit sa lentille affichée et
   * lisait pourtant « tes courses ». Trois libellés, un seul aiguillage.
   */
  const S = statsCopy(activity);
  const stats = useStats(activity);
  const seasonState = useActiveSeason();
  // MÊME source et MÊME hook que la carte et /territoire : les trois écrans ne
  // doivent pas pouvoir se contredire sur le km² tenu. Sans `crewIds`, seul ce
  // qui m'appartient est classé 'crew' — le périmètre de « ma » surface. La
  // lentille est passée : le km² affiché ici est celui de LA discipline lue par
  // les trois blocs, sinon le bloc « territoire » raconterait un autre monde que
  // le bloc « volume », dans le même écran.
  const territories = useRealTerritories(undefined, activity);
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
  // « Saison » n'apparaît QUE si une saison réelle est ouverte (cf. écart n° 1).
  if (seasonStartMs !== null) periodOptions.push({ id: 'season', label: t(C.periodSeason) });

  let body: React.ReactNode;
  switch (stats.status) {
    case 'signed-out':
      body = canSignIn ? (
        <StateBlock
          title={t(S.signedOutTitle)}
          body={t(C.signedOutBody)}
          ctaLabel={t(C.signIn)}
          onPress={() => router.push('/sign-in')}
        />
      ) : (
        <StateBlock title={t(S.noBackendTitle)} body={t(C.noBackendBody)} />
      );
      break;
    case 'loading':
      // Une ligne, pas un spinner plein écran. État BORNÉ : la lecture aboutit
      // ou bascule sur `failed`. Un chargement n'affirme RIEN sur le joueur.
      body = <Text style={styles.stateInline}>{t(S.loading)}</Text>;
      break;
    case 'failed':
      body = (
        <StateBlock
          title={t(S.failedTitle)}
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
            {/* Le seul groupe de choix DU CONTENU (le commutateur Run/Bike
                vit dans la barre, pas dans la page : il change de MONDE, pas
                de fenêtre temporelle). `tone="surface"` : la chartreuse est
                ici une couleur de DONNÉE (rôle « moi »), elle ne doit pas être
                dépensée sur un filtre. */}
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
              activity={activity}
            />
          </>
        ) : bike ? (
          // Compte relié, zéro sortie VÉLO ingérée. Ce n'est ni une panne ni
          // une fonctionnalité manquante : c'est le point de départ de ce
          // joueur dans cette discipline. Le CTA DÉCLARE le vélo
          // (`startSortieHref`) — il ne le devine pas depuis la lentille, ce
          // qui serait précisément l'interdit du 25/07.
          <StateBlock
            title={t(C.bikeEmptyTitle)}
            body={t(C.bikeEmptyBody)}
            note={t(C.bikeEmptyRunSafe)}
            ctaLabel={t(C.bikeEmptyCta)}
            onPress={() => router.push(startSortieHref('bike'))}
          />
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
    <StackScreen
      title={t(C.title)}
      icon="performance"
      {...(switchVisible
        ? {
            headerRight: (
              <ActivitySwitch
                activity={activity}
                onChange={setActivity}
                runLabel={t(C.activityRunA11y)}
                bikeLabel={t(C.activityBikeA11y)}
                testID="performance-activity-switch"
              />
            ),
          }
        : {})}
    >
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
  // Puce « Bientôt » — neutre (jamais chartreuse : ce n'est ni l'action de
  // l'écran ni une donnée « moi »), contour discret, dit « à venir » sans vendre.
  soonPill: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  soonPillText: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.xs,
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
