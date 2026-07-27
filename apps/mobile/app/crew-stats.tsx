/**
 * GRYD — E50 « Statistiques du crew » (spec l.1738), route `/crew-stats`.
 *
 * La planche liste sept éléments : surface, rang local, défenses, distance
 * collective, courbe quatre semaines, top contributeurs, lien membres. Ils
 * viennent de DEUX sources, et le partage entre elles est le point de conception
 * de cet écran :
 *
 *   · `crew_overview()` (RPC 0044) — surface, rang local, top contributeurs.
 *     LA MÊME SOURCE QUE LE HQ CREW (`RealCrewScreen`), lue par le MÊME hook
 *     (`useRealCrew({ withOverview: true })`). Rien n'est recopié ni recalculé
 *     ici : deux chiffres pour la même chose divergeraient au premier correctif
 *     appliqué d'un seul côté, et le joueur verrait son crew à 4 zones sur un
 *     écran et 5 sur l'autre.
 *   · `crew_stats()` (RPC 0086) — défenses, distance collective, courbe. Ces
 *     trois-là n'avaient AUCUNE source avant ce chantier ; la RPC ne rend
 *     délibérément QU'ELLES, pour ne pas dupliquer les trois premières.
 *
 * ═══ « SURFACE » SE DIT ICI EN ZONES, ET C'EST DÉLIBÉRÉ ════════════════════
 * `crew_overview()` ne rend PAS d'aire (choix n°1 de 0044 : aucune n'existait
 * alors en base). L'aire existe désormais dans `crew_leaderboard` (0086) mais
 * elle y est calculée pour LE CLASSEMENT et n'est servie que par `crew_board()`,
 * qui ne parle que de la ville. Plutôt que d'ouvrir une troisième lecture pour
 * un seul chiffre — donc une troisième vérité possible — cet écran affiche ce
 * que sa source rend : le nombre de ZONES tenues. C'est une mesure exacte, elle
 * n'est ni arrondie ni convertie, et le mot « zone » est celui du produit
 * (constitution §6 : jamais « hexagone »). Le jour où `crew_overview()` rendra
 * `areaM2`, cette card gagnera une ligne — additif, sans rien réécrire.
 *
 * ═══ SIX ÉTATS DISTINCTS, JAMAIS CONFONDUS ════════════════════════════════
 * pas connecté · lecture EN COURS · échec de lecture · pas de crew · lu-mais-
 * vide · lu. Aucun n'emprunte la phrase d'un autre. En particulier : les trois
 * mesures de `crew_stats()` ont leur PROPRE état — le classement peut être lu
 * pendant que la fenêtre d'activité échoue, et l'inverse. Un bloc qui n'a pas pu
 * être lu affiche `sNoSource`, jamais un « 0 » : trois zéros diraient « ce crew
 * n'a rien défendu, rien couru », une affirmation qu'aucune panne n'autorise.
 *
 * ═══ §A ═══════════════════════════════════════════════════════════════════
 * AUCUN CTA CHARTREUSE. Cet écran ne décide rien — il décrit. Le seul contrôle
 * est un lien discret vers les membres (retour au HQ), et le commutateur
 * Run/Bike de l'en-tête, qui bascule une VRAIE lecture (les deux RPC sont
 * bornées à une discipline ; Run et Bike ne sont jamais sommés, spec E50).
 * Aucune card dans une card : les blocs sont des sections à plat.
 *
 * ═══ SPEC E50, MOT POUR MOT ═══════════════════════════════════════════════
 * « Une contribution n'est jamais présentée comme une obligation morale. » D'où
 * `sNoPressureNote` en pied de la liste des contributeurs, et l'absence totale
 * d'objectif, de jauge à remplir ou de comparaison entre membres autre que le
 * constat brut de ce que chacun tient.
 *
 * Analytics : `$screen crew_stats` à l'ouverture. Aucun autre event — cet écran
 * ne décide rien, et un event qui ne mesure aucune décision n'apprend rien
 * (arbitrage inscrit dans `packages/shared/src/events.ts`, bloc E50).
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_STATS_TOP_CONTRIBUTORS,
  colors,
  fonts,
  fontSizes,
  radii,
  spacing,
  gameColors,
} from '@klaim/shared';
import { C } from '../src/i18n/catalog/crew';
import { useLocale, useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { ActivitySwitch, useActivityLens } from '../src/ui/ActivitySwitch';
import { formatIntFor, formatKmFor } from '../src/ui/numberFormat';
import { useRealCrew } from '../src/features/crew/real';
import { useCrewStats } from '../src/features/crew/statsData';
import { trendHeights } from '../src/features/crew/stats';

/** Hauteur de la plus haute barre de la courbe (pt). Mesure d'écran, pas de jeu. */
const TREND_BAR_MAX_H = 56;

export default function CrewStatsScreen() {
  const t = useT();
  const locale = useLocale();
  // Lentille `stats` : la même que le profil-stats. E50 est une page de
  // statistiques, sa mémoire de discipline appartient à cette famille-là.
  const { activity, setActivity, switchVisible } = useActivityLens('stats');
  const { ready, loading, loadFailed, crew, overview, overviewLoading, overviewFailed } =
    useRealCrew({ withOverview: true });
  const window = useCrewStats(activity);

  useEffect(() => {
    screen('crew_stats');
  }, []);

  /** Les contributeurs les plus engagés — bornés par game-rules, jamais par un 5 écrit ici. */
  const top = useMemo(
    () => (overview?.contributions ?? []).slice(0, CREW_STATS_TOP_CONTRIBUTORS),
    [overview],
  );

  // ── 1. PAS CONNECTÉ — un fait, pas un échec, et il a son action ────────────
  if (!ready && !loading && !loadFailed) {
    return (
      <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
        <Card>
          <Text style={styles.stateTitle}>{t(C.rlSignedOutTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.rlSignedOutBody)}</Text>
          <View style={styles.stateCta}>
            <Button label={t(C.rlSignIn)} variant="ghost" onPress={() => router.push('/sign-in')} />
          </View>
        </Card>
      </Shell>
    );
  }

  // ── 2. LECTURE EN COURS — n'affirme RIEN sur le crew ───────────────────────
  if (loading || (crew !== null && overviewLoading && overview === null)) {
    return (
      <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
        <Text style={styles.note}>{t(C.sLoading)}</Text>
      </Shell>
    );
  }

  // ── 3. ÉCHEC DE LECTURE — distinct du vide ────────────────────────────────
  if (loadFailed) {
    return (
      <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
        <Card>
          <Text style={styles.stateTitle}>{t(C.sFailedTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.sFailedBody)}</Text>
        </Card>
      </Shell>
    );
  }

  // ── 4. PAS DE CREW — il n'y a pas de statistiques de crew, et c'est tout ──
  if (crew === null) {
    return (
      <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
        <Card>
          <Text style={styles.stateTitle}>{t(C.emptyTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.emptyBody)}</Text>
          <View style={styles.stateCta}>
            <Button label={t(C.sMembersLink)} variant="ghost" onPress={() => router.push('/(tabs)/crew')} />
          </View>
        </Card>
      </Shell>
    );
  }

  // ── 5. LU — les sept éléments de la planche, chacun à sa source ────────────
  const zones = overview?.territory.hexesHeld ?? null;
  const rank = overview?.territory.cityRank ?? null;
  const total = overview?.territory.crewsInCity ?? null;
  const lastCapture = overview?.territory.lastCaptureAt ?? null;
  const stats = window.status === 'ready' ? window.stats : null;
  const heights = stats ? trendHeights(stats.trend) : [];

  return (
    <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
      {/* ── EMPRISE (crew_overview) ─────────────────────────────────────── */}
      <SectionLabel>{t(C.rlTerritoryLabel)}</SectionLabel>
      <Card>
        <Metric
          label={t(C.sSurface)}
          // `zones === null` ⇒ l'overview n'a pas été lu : on ne dit pas « 0 ».
          value={zones === null ? null : formatIntFor(zones, locale)}
          empty={t(C.sSurfaceNone)}
          // Un crew RÉELLEMENT à zéro n'est pas une lecture manquante : la
          // phrase est différente, et c'est tout l'écart entre les deux états.
          isEmpty={zones === 0}
        />
        <Metric
          label={t(C.sCityRank)}
          value={
            rank !== null && total !== null
              ? t(C.rlCityRank, { rank: formatIntFor(rank, locale), total: formatIntFor(total, locale) })
              : null
          }
          empty={t(C.sCityRankNone)}
          isEmpty={zones === 0}
        />
        <Metric
          label={t(C.sLastCapture)}
          value={lastCapture === null ? null : formatDay(lastCapture, locale)}
          empty={t(C.sLastCaptureNever)}
          isEmpty={lastCapture === null && zones === 0}
        />
      </Card>

      {/* ── LA FENÊTRE (crew_stats) : défenses, distance, courbe ─────────── */}
      <SectionLabel>{t(C.sTrend)}</SectionLabel>
      <Card>
        {stats === null ? (
          /* Lecture non aboutie : UNE phrase, pas trois zéros. Un zéro
             affirmerait que le crew n'a rien défendu ni couru. */
          <>
            <Text style={styles.stateTitle}>{t(C.sNoSource)}</Text>
            <Text style={styles.stateBody}>
              {window.status === 'loading' ? t(C.sLoading) : t(C.sNoSourceBody)}
            </Text>
          </>
        ) : (
          <>
            <Metric label={t(C.sDefenses)} value={formatIntFor(stats.defenses, locale)} />
            <Metric
              label={t(C.sDistance)}
              // Mètres → km par le formateur localisé partagé. `null` (valeur
              // non formatable) retombe sur l'état vide plutôt que sur « NaN ».
              value={formatKmFor(stats.distanceM / 1000, locale)}
            />
            <View
              style={styles.trend}
              accessibilityRole="image"
              accessibilityLabel={`${t(C.sTrend)} — ${t(C.sDistance)}`}
            >
              {stats.trend.map((point, i) => (
                <View key={point.weekStart} style={styles.trendCol}>
                  <View
                    style={[
                      styles.trendBar,
                      // §C — couleur par RÔLE, jamais par crew : c'est MON
                      // crew, donc la teinte « moi », déclinée par discipline.
                      { backgroundColor: activity === 'bike' ? gameColors.bike : gameColors.crew },
                      // Une semaine à ZÉRO reste au sol : aucun moignon
                      // décoratif, qui ferait croire à une activité inexistante.
                      { height: Math.round((heights[i] ?? 0) * TREND_BAR_MAX_H) },
                    ]}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </Card>

      {/* ── TOP CONTRIBUTEURS (crew_overview) ────────────────────────────── */}
      <SectionLabel>{t(C.sTopKicker)}</SectionLabel>
      <Card>
        {/* TROIS états, jamais deux (27/07/2026). `overview === null` repliait
            « lu et vide » avec « pas pu lire » : un timeout sur crew_overview()
            faisait dire à l'écran que PERSONNE n'avait couru pour ce crew. Les
            métriques voisines étaient déjà protégées (`zones === null` →
            sNoSource) ; la garde manquait sur le seul bloc qui parle d'humains. */}
        {overviewFailed ? (
          <Text style={styles.stateBody}>{t(C.sTopUnread)}</Text>
        ) : top.length === 0 ? (
          <Text style={styles.stateBody}>{t(C.sTopEmpty)}</Text>
        ) : (
          top.map((member) => (
            <View key={member.userId} style={styles.row}>
              <Text style={styles.rowName} numberOfLines={1}>
                {member.pseudo}
              </Text>
              <Text style={styles.rowValue}>
                {t(C.sContribution, { pct: formatIntFor(member.contributionPct, locale) })}
              </Text>
            </View>
          ))
        )}
        {/* Spec E50, mot pour mot : une contribution ne réclame rien. */}
        <Text style={styles.footnote}>{t(C.sNoPressureNote)}</Text>
      </Card>

      {/* Run et Bike restent séparés (spec E50) — dit une fois, en bas. */}
      <Text style={styles.footnote}>{t(C.sActivitySeparated)}</Text>
      <View style={styles.stateCta}>
        <Button label={t(C.sMembersLink)} variant="ghost" onPress={() => router.push('/(tabs)/crew')} />
      </View>
    </Shell>
  );
}

/** Enveloppe commune : le même en-tête dans TOUS les états (jamais deux gabarits). */
function Shell({
  activity,
  setActivity,
  switchVisible,
  t,
  children,
}: {
  activity: 'run' | 'bike';
  setActivity: (a: 'run' | 'bike') => void;
  switchVisible: boolean;
  t: ReturnType<typeof useT>;
  children: React.ReactNode;
}) {
  return (
    <StackScreen
      title={t(C.sTitle)}
      icon="classement"
      backHref="/(tabs)/crew"
      headerRight={
        switchVisible ? <ActivitySwitch
            activity={activity}
            onChange={setActivity}
            runLabel={t(C.sActivityRunA11y)}
            bikeLabel={t(C.sActivityBikeA11y)}
          /> : undefined
      }
    >
      {children}
    </StackScreen>
  );
}

/**
 * Une mesure. `value === null` ⇒ la valeur n'a pas été LUE : on montre
 * `sNoSource` (« pas encore mesuré »), jamais un tiret décoratif ni un zéro.
 * `isEmpty` ⇒ elle a été lue et vaut zéro : c'est un FAIT, avec sa propre
 * phrase. Les deux ne se confondent jamais — c'est toute la doctrine sur trois
 * lignes de composant.
 */
function Metric({
  label,
  value,
  empty,
  isEmpty = false,
}: {
  label: string;
  value: string | null;
  empty?: string;
  isEmpty?: boolean;
}) {
  const t = useT();
  return (
    <View style={styles.row}>
      <Text style={styles.rowName}>{label}</Text>
      <Text style={[styles.rowValue, (value === null || isEmpty) && styles.rowValueMuted]}>
        {isEmpty && empty ? empty : value !== null ? value : t(C.sNoSource)}
      </Text>
    </View>
  );
}

/** Date courte localisée. Renvoie la chaîne brute si elle n'est pas parsable —
 *  on ne fabrique pas une date de repli. */
function formatDay(iso: string, locale: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso;
  return new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  note: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  stateTitle: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    marginBottom: spacing.xs,
  },
  stateBody: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  stateCta: { marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowName: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md, flexShrink: 1 },
  rowValue: { color: colors.blanc, fontFamily: fonts.mono, fontSize: fontSizes.md },
  rowValueMuted: { color: colors.gris },
  trend: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    height: TREND_BAR_MAX_H,
    marginTop: spacing.md,
  },
  trendCol: { flex: 1, justifyContent: 'flex-end' },
  trendBar: {
    // La COULEUR est posée à l'usage (par discipline) : la peindre ici
    // fixerait une teinte de course sur une courbe vélo.
    borderRadius: radii.sm,
    minHeight: 0,
  },
  footnote: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    marginTop: spacing.md,
  },
});
