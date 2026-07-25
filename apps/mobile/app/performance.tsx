/**
 * GRYD — page PERFORMANCE (AMENDEMENT-17 CHANTIER 3). Running + impact GRYD,
 * PAS une copie Strava. Résumé + détail : au-dessus du fold on décide en un
 * regard (Cette semaine), le détail (Progression avec UN mini-graph, Records,
 * GRYD Verify) est plus bas, au scroll. Pas 15 graphiques.
 *
 * ─── LE MENSONGE COLMATÉ (21/07/2026) ────────────────────────────────────────
 * Cette page rendait `features/performance/demo.ts` SANS AUCUNE GARDE. Un iPhone
 * fraîchement installé, sans compte, sans une seule course, affichait :
 * « Score Forme 78 », « 3 courses · 18,4 km · 1h42 », un record « 5 km 26:40 »,
 * un plus long parcours « République », « 92 % de tes courses fiables » et un
 * Impact GRYD de 12 zones défendues. Le bandeau « données de démonstration »
 * ne rachetait rien : ce sont des chiffres qu'on lit, pas une note de bas de
 * page — et le profil, qui MÈNE ici, refusait au même moment d'afficher ce
 * Score Forme hors vitrine. L'app se contredisait elle-même.
 *
 * MAINTENANT, la page ne montre que ce que les COURSES du joueur prouvent
 * (`features/performance/real` → `derive`, table `runs`, policy RLS
 * `runs_select_own`), et distingue les trois absences :
 *   · pas de compte  → on invite à se connecter ;
 *   · compte, 0 course → on invite à courir (état réel VALIDE, pas un trou) ;
 *   · lecture en échec → on l'avoue et on propose de réessayer.
 * Ce qui n'a aucune source ne s'affiche plus du tout : Score Forme (colonne
 * `forme_score` jamais écrite), Impact GRYD, objectif hebdo. Le mode vitrine
 * ayant été abandonné (21/07/2026), le persona de démonstration n'est plus
 * rendu nulle part — le type `PerfRecord` reste importé de `demo.ts` parce que
 * c'est là que vit la FORME d'un record, pas ses valeurs.
 *
 * Analytics : event §8 `performance_page_viewed` à l'ouverture.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, radii, sizes, spacing } from '@klaim/shared';
import { EVENTS, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { useSession } from '../src/lib/session';
import { useMyPerformance } from '../src/features/performance/real';
import type { PerfRecord } from '../src/features/performance/types';
import type { RealPerformance } from '../src/features/performance/derive';
import {
  ProgressionCard,
  RecordsCard,
  VerifyCard,
  WeekCard,
} from '../src/features/performance/components';
import { useLocale, useT } from '../src/i18n/store';
import type { Locale } from '../src/i18n/types';
import { C } from '../src/i18n/catalog/performance';
import { C as CH } from '../src/i18n/catalog/historique';

// ─────────────────────────────────────────────────────────────────────────────
// FORMATAGE — des nombres du moteur vers du texte lisible. Le séparateur
// décimal suit la langue (18,4 en fr · 18.4 en en) ; les unités (km, /km, h)
// sont des invariants jamais traduits.
// ─────────────────────────────────────────────────────────────────────────────

function fmtKm(distanceM: number, locale: Locale): string {
  return (distanceM / 1000).toLocaleString(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** « 1h42 » au-delà de l'heure, « 42 min » en dessous, « 0 min » à zéro. */
function fmtDuration(totalS: number): string {
  const minutes = Math.round(totalS / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

/** « 5:32 /km ». `null` (aucun kilomètre) → tiret cadratin, jamais un faux 0. */
function fmtPace(paceSKm: number | null): string {
  if (paceSKm === null || paceSKm <= 0) return '—';
  const m = Math.floor(paceSKm / 60);
  const s = Math.round(paceSKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAT VIDE — un bloc, un message, au plus une action (§A : 1 écran = 1
// décision). Les trois cas ont chacun leur copie : ils ne veulent pas dire la
// même chose et ne se remplacent jamais l'un l'autre.
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
// LA PAGE RÉELLE — uniquement ce que les courses du joueur prouvent.
// ─────────────────────────────────────────────────────────────────────────────

function RealPerformanceBody({ data }: { data: RealPerformance }) {
  const t = useT();
  const locale = useLocale();

  const trend = data.trend.map((w) => ({
    label:
      w.weeksAgo === 0 ? t(C.trendThisWeek) : t(C.trendWeekAgo, { n: w.weeksAgo }),
    km: w.distanceM / 1000,
  }));

  // Records : UNIQUEMENT ceux qu'une course fonde. Une case manquante disparaît
  // — un record « — » se lirait comme un échec, alors que c'est juste l'absence
  // d'une donnée (avg_pace_s_km est nullable en base, par exemple).
  const records: PerfRecord[] = [];
  const r = data.records;
  if (r.longestDistance) {
    records.push({
      key: 'longest',
      label: t(C.recordLongest),
      value: `${fmtKm(r.longestDistance.value, locale)} km`,
    });
  }
  if (r.bestPace) {
    records.push({
      key: 'pace',
      label: t(C.recordBestPace),
      value: fmtPace(r.bestPace.value),
      meta: t(C.recordOverKm, { km: fmtKm(r.bestPace.distanceM, locale) }),
    });
  }
  if (r.longestDuration) {
    records.push({
      key: 'duration',
      label: t(C.recordDuration),
      value: fmtDuration(r.longestDuration.value),
      meta: t(C.recordOverKm, { km: fmtKm(r.longestDuration.distanceM, locale) }),
    });
  }
  if (data.regularityWeeks > 0) {
    records.push({
      key: 'streak',
      label: t(C.recordStreak),
      value: t(C.weeksShort, { n: data.regularityWeeks }),
    });
  }

  const channels: string[] = [];
  if (data.verify?.channels.gps) channels.push(t(C.channelGps));
  if (data.verify?.channels.motion) channels.push(t(C.channelMotion));
  if (data.verify?.channels.steps) channels.push(t(C.channelSteps));

  const openSources = () => {
    haptics.light();
    router.push('/sources');
  };

  return (
    <View style={styles.stack}>
      <WeekCard
        runs={data.week.runs}
        km={fmtKm(data.week.distanceM, locale)}
        duration={fmtDuration(data.week.durationS)}
        pace={fmtPace(data.week.paceSKm)}
      />

      <ProgressionCard
        distancePct={data.distancePct}
        paceGainSKm={data.paceGainSKm}
        regularityWeeks={data.regularityWeeks}
        trend={trend}
      />

      {records.length > 0 ? (
        <RecordsCard records={records} title={t(C.recordsTitle)} />
      ) : null}

      {data.verify ? (
        <>
          <VerifyCard
            reliablePct={data.verify.reliablePct}
            channels={channels}
            meta={t(C.verifyOnRuns, { n: data.verify.totalRuns })}
          />
          {/* Lien vers le hub GRYD Verify (détail des sources / fiabilité). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(CH.a11yPerfVerifyLink)}
            onPress={openSources}
            style={({ pressed }) => [styles.verifyLink, pressed && styles.pressed]}
          >
            <Text style={styles.verifyLinkText}>{t(CH.perfVerifyLink)}</Text>
            <Icon name="chevron" size={16} color={colors.gris} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

export default function PerformanceScreen() {
  const t = useT();
  const { configured, session } = useSession();
  // Règle des hooks : `useMyPerformance` est appelé INCONDITIONNELLEMENT, avant
  // toute branche — il se met lui-même en veille quand il n'y a pas de session.
  const perf = useMyPerformance();

  useEffect(() => {
    track(EVENTS.performancePageViewed);
  }, []);

  /** Un écran de connexion qui MARCHE existe-t-il ? Sans backend, /sign-in
   *  redirige vers la carte : proposer le bouton enverrait dans un cul-de-sac. */
  const canSignIn = configured && !session;

  let body: React.ReactNode;
  switch (perf.status) {
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
      // Une ligne, pas un spinner plein écran. Cet état est BORNÉ : la lecture
      // aboutit ou bascule sur `failed`.
      body = <Text style={styles.stateInline}>{t(C.loading)}</Text>;
      break;
    case 'failed':
      body = (
        <StateBlock
          title={t(C.failedTitle)}
          body={t(C.failedBody)}
          ctaLabel={t(C.retry)}
          onPress={perf.reload}
        />
      );
      break;
    case 'ready':
      body =
        perf.data && perf.data.countedRuns > 0 ? (
          <RealPerformanceBody data={perf.data} />
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
    <StackScreen title={t(CH.perfTitle)} icon="performance" kicker={t(CH.perfKicker)}>
      {body}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm, marginTop: spacing.xxs },
  verifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    minHeight: sizes.touchTarget, // P1 : le lien était ~41 px de haut
    paddingVertical: spacing.sm,
  },
  verifyLinkText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.6 },

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
  stateTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
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
  stateCtaLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800' },
  stateInline: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
  },
});
