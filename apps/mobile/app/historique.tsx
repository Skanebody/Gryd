/**
 * GRYD — HISTORIQUE (/historique, planche E24). Un JOURNAL DE CONQUÊTE, pas un
 * tableau de séances : chaque ligne raconte d'abord son IMPACT territorial,
 * colorée par rôle, et les lignes sont groupées PAR SEMAINE.
 *
 * ─── ORDRE DE COMPOSITION (planche E24) ─────────────────────────────────────
 *   1. `StackScreen` : retour + titre + kicker + sous-titre, et le commutateur
 *      Run / Bike en `headerRight` (lentille mémorisée POUR CET ONGLET) ;
 *   2. l'ÉTAT de la page — un seul à la fois (chargement / pas connecté / sans
 *      backend / échec / lu-et-vide) ;
 *   3. le BANDEAU DE SYNTHÈSE (`SheetMetrics`) : sorties · distance · captures ·
 *      défenses — QUE des faits serveur ;
 *   4. les GROUPES PAR SEMAINE (« Cette semaine », « Semaine dernière »,
 *      « Semaine du … ») : un `SectionLabel` puis les lignes (`RealRunCard`),
 *      chacune TAPABLE — elle ouvre E68 `/course/[id]` (28/07/2026 : la lecture
 *      d'une sortie par identifiant existe, cf. `features/history/detailRead.ts`,
 *      et la note de pied « ces lignes ne s'ouvrent pas » a donc été RETIRÉE —
 *      la garder aurait été le mensonge symétrique).
 *
 * ─── CE QUI A CHANGÉ POUR COLLER À LA PLANCHE E24 (26/07/2026) ───────────────
 * L'écran groupait par FILTRE (Tout / Conquêtes / Défenses / Stats) — une barre
 * `Segmented` que la planche E24 ne montre pas. E24 groupe par SEMAINE et code le
 * TYPE par la COULEUR (Capture chartreuse, Reprise orange, Défense bleu, libre
 * neutre). Trois changements, tous adossés à des fonctions PURES testées
 * (`historyView`) :
 *   · la barre de filtres est RETIRÉE ; à sa place, le bandeau de synthèse et le
 *     découpage par semaine (`groupRunsByWeek`) ;
 *   · le TYPE d'une ligne est dérivé de l'impact serveur, REPRISE incluse
 *     (`hexes.stolen` → orange), par `runStory` — c'est `RealRunCard` qui rend ;
 *   · le bandeau (`summarizeHistory`) ne compte que des faits (captures =
 *     `captured > 0`, défenses = `defended > 0`, distance = somme réelle).
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE (inchangés — honnêteté au-dessus du pixel) ──
 * · PAS DE VIGNETTE DE TRACÉ : `runs.polyline_masked` existe en base mais
 *   `ingest_run` ne l'écrit JAMAIS (il ne garde qu'un SHA-256 irréversible —
 *   `anticheat_wiring.ts:178`). Il n'y a donc aucun tracé à décoder : la tuile
 *   de ligne porte le PICTO DE TYPE coloré, pas une géométrie inventée. Le
 *   détail E68 dit la même chose, à sa place (cf. `app/course/[id].tsx`).
 * · PAS DE « repris à X » : le nom d'un adversaire exige une identité
 *   cross-joueur (O1). Une reprise reste neutre (« Reprise · {n} zones »).
 * · LECTURE bornée à 200 sorties (`HISTORY_LIMIT`) : au-delà, un vrai « plus
 *   ancien » (pas une troncature silencieuse) — inscrit en suspens.
 *
 * ─── LES CINQ ÉTATS, JAMAIS CONFONDUS ───────────────────────────────────────
 *   · chargement   → on n'affirme RIEN tant qu'on ne sait pas ;
 *   · pas connecté → l'historique vit sur le compte → CTA « Se connecter » ;
 *   · sans backend → il n'y a personne au bout : une phrase, PAS de bouton ;
 *   · échec        → on le dit, et on propose de réessayer ;
 *   · lu, vide     → LÀ, et seulement là, « Lance-toi ! » est vrai.
 *
 * ─── COMMUTATEUR RUN / BIKE (lentille E14) ──────────────────────────────────
 * Mémorisé POUR CET ONGLET (`useActivityLens`, clé `gryd.activity.historique`) :
 * la basculer ici ne touche ni la Carte ni le Classement. La lecture SUIT la
 * lentille (`useMyRunHistory(activity)`, `.eq('activity', …)`) : deux mondes,
 * deux listes, jamais une somme. La copie qui NOMME l'effort (kicker, sous-titre,
 * états) est indexée par `Activity` (`historyCopy`, `statsCopy`) ; les libellés
 * de TYPE et d'IMPACT, eux, sont NEUTRES aux deux mondes (ils nomment l'acte de
 * jeu, pas le sport — cf. le bloc E24 de `catalog/historique.ts`).
 *
 * Analytics : screen('historique') au montage (§8). Aucun event inventé pour un
 * changement de lentille — on n'en crée pas hors `packages/shared/src/events.ts`.
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, spacing, typography } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { SheetMetrics, type SheetMetric } from '../src/features/map/SheetMetrics';
import { ActivitySwitch, useActivityLens } from '../src/ui/ActivitySwitch';
import { startSortieHref } from '../src/ui/activityLens';
import { formatKm } from '../src/ui/format';
import { useSession } from '../src/lib/session';
import { RealRunCard } from '../src/features/history/RealRunCard';
import { groupRunsByWeek, summarizeHistory, type WeekBucket } from '../src/features/history/historyView';
import { useMyRunHistory } from '../src/features/history/real';
import { useLocale, useT } from '../src/i18n/store';
import type { Locale } from '../src/i18n/types';
import { C, historyCopy } from '../src/i18n/catalog/historique';
import { C as PC, statsCopy } from '../src/i18n/catalog/performance';

/**
 * Card d'état : ce qui se passe, et AU PLUS une action (§A — un seul CTA
 * chartreuse, et seulement là où il change quelque chose).
 */
function StateCard({
  title,
  body,
  note,
  cta,
}: {
  title?: string;
  body: string;
  /** Seconde ligne FACTUELLE (ex. « tes courses à pied restent intactes »). */
  note?: string;
  cta?: { label: string; a11y: string; analyticsId: string; onPress: () => void };
}) {
  return (
    <Card style={styles.state}>
      {title !== undefined ? <Text style={styles.stateTitle}>{title}</Text> : null}
      <Text style={styles.stateBody}>{body}</Text>
      {note !== undefined ? <Text style={styles.stateBody}>{note}</Text> : null}
      {cta ? (
        <View style={styles.stateCta}>
          <Button
            label={cta.label}
            accessibilityLabel={cta.a11y}
            analyticsId={cta.analyticsId}
            size="md"
            onPress={cta.onPress}
          />
        </View>
      ) : null}
    </Card>
  );
}

/** Lundi d'une semaine plus ancienne, formaté « 7 juil. » dans la langue. */
function formatWeekDate(ms: number, locale: Locale): string {
  const d = new Date(ms);
  try {
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    return `${d.getDate()}/${d.getMonth() + 1}`;
  }
}

export default function HistoriqueScreen() {
  const t = useT();
  const locale = useLocale();
  // LENTILLE de CET onglet (E14, « mémorisé par onglet ») + éligibilité du
  // commutateur (flags.bike, retiré pendant une course).
  const { activity, setActivity, switchVisible } = useActivityLens('historique');
  // La lecture SUIT la lentille : deux mondes, deux listes, jamais une somme.
  const { status, runs, reload } = useMyRunHistory(activity);
  // `configured` = un backend existe. Sans lui, proposer « Se connecter » serait
  // un cul-de-sac : il n'y a personne au bout (le bouton mort de §A).
  const { configured } = useSession();
  const bike = activity === 'bike';
  // La copie qui NOMME l'effort suit la lentille (jamais un `bike ? … : …` dans
  // le JSX — c'est la forme qui avait laissé passer la moitié de l'écran).
  const H = historyCopy(activity);
  const S = statsCopy(activity);

  useEffect(() => {
    screen('historique');
  }, []);

  const summary = useMemo(() => summarizeHistory(runs), [runs]);
  // Groupé par semaine civile ; `Date.now()` injecté (jamais en dur dans le pur).
  const groups = useMemo(() => groupRunsByWeek(runs, Date.now()), [runs]);

  const summaryMetrics: SheetMetric[] = [
    { key: 'runs', value: String(summary.runs), label: t(C.summaryRuns) },
    {
      key: 'dist',
      value: formatKm(summary.km) ?? '—',
      unit: t(C.summaryKmUnit),
      label: t(C.summaryDistance),
    },
    { key: 'captures', value: String(summary.captures), label: t(C.summaryCaptures) },
    { key: 'defenses', value: String(summary.defenses), label: t(C.summaryDefenses) },
  ];

  const weekLabel = (bucket: WeekBucket, weekStartMs: number): string =>
    bucket === 'this'
      ? t(C.weekThis)
      : bucket === 'last'
        ? t(C.weekLast)
        : t(C.weekOlder, { date: formatWeekDate(weekStartMs, locale) });

  return (
    <StackScreen
      title={t(C.historiqueTitle)}
      icon="historique"
      kicker={t(H.kicker)}
      subtitle={t(H.subtitle)}
      {...(switchVisible
        ? {
            headerRight: (
              <ActivitySwitch
                activity={activity}
                onChange={setActivity}
                runLabel={t(C.activityRunA11y)}
                bikeLabel={t(C.activityBikeA11y)}
                testID="historique-activity-switch"
              />
            ),
          }
        : {})}
    >
      {/* ── 1. On ne sait pas encore : une LIGNE grise, pas une card. ── */}
      {status === 'loading' ? <Text style={styles.stateInline}>{t(S.loading)}</Text> : null}

      {/* ── 2. Pas de compte : l'historique vit dessus. Le CTA n'apparaît que
             s'il mène quelque part — sans backend, une phrase le remplace. ── */}
      {status === 'signed-out' ? (
        <StateCard
          {...(configured ? {} : { title: t(S.noBackendTitle) })}
          body={configured ? t(H.emptySignedOut) : t(PC.noBackendBody)}
          {...(configured
            ? {
                cta: {
                  label: t(C.emptySignedOutCta),
                  a11y: t(H.a11ySignIn),
                  analyticsId: 'historique_sign_in',
                  onPress: () => router.push('/sign-in'),
                },
              }
            : {})}
        />
      ) : null}

      {/* ── 3. Échec : ses sorties existent, on n'a pas su les lire. ── */}
      {status === 'failed' ? (
        <StateCard
          title={t(S.failedTitle)}
          body={t(PC.failedBody)}
          cta={{
            label: t(PC.retry),
            a11y: t(PC.retry),
            analyticsId: 'historique_retry',
            onPress: reload,
          }}
        />
      ) : null}

      {/* ── 4. Lu. Zéro sortie est alors un FAIT, pas un trou — et la LENTILLE
             choisit les mots parce qu'elle choisit le geste. ── */}
      {status === 'ready' && runs.length === 0 ? (
        bike ? (
          <StateCard
            title={t(C.bikeEmptyTitle)}
            body={t(C.bikeEmptyBody)}
            note={t(C.bikeEmptyRunSafe)}
            cta={{
              label: t(C.bikeEmptyCta),
              a11y: t(C.bikeEmptyCta),
              analyticsId: 'historique_bike_start',
              onPress: () => router.push(startSortieHref('bike')),
            }}
          />
        ) : (
          <StateCard body={t(C.emptyRealUser)} />
        )
      ) : null}

      {/* ── 5. Lu, peuplé : bandeau de synthèse + groupes par semaine. ── */}
      {status === 'ready' && runs.length > 0 ? (
        <>
          <SheetMetrics metrics={summaryMetrics} testID="historique-summary" />
          {groups.map((group) => (
            <View key={group.weekStartMs} style={styles.group}>
              <SectionLabel style={styles.weekLabel}>
                {weekLabel(group.bucket, group.weekStartMs)}
              </SectionLabel>
              <View style={styles.list}>
                {group.entries.map((entry) => (
                  <RealRunCard key={entry.id} entry={entry} />
                ))}
              </View>
            </View>
          ))}
        </>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: spacing.xl },
  weekLabel: { marginBottom: spacing.sm },
  list: { gap: spacing.sm },

  // Card fournit fond/rayon/padding (sans contour, règle 80/20) : on ne garde
  // que le centrage et le rythme interne.
  state: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  // R3 — titre de card : le rôle typo, jamais une famille + un poids recodés.
  stateTitle: { ...typography.cardTitle, color: colors.blanc, textAlign: 'center' },
  stateBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
  },
  stateCta: { alignSelf: 'stretch', marginTop: spacing.xxs },
  // LECTURE EN COURS — une ligne, non tapable, jamais un spinner plein écran.
  stateInline: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.md,
  },
});
