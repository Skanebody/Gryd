/**
 * GRYD — E68 « DÉTAIL HISTORIQUE » (route `/course/[id]`).
 *
 * ═══ CE QUI A CHANGÉ LE 28/07/2026, ET POURQUOI ═════════════════════════════
 * Cet écran était une PAGE D'ÉTAT et rien d'autre : « GRYD ne sait pas encore
 * ouvrir une sortie une par une », plus un renvoi vers l'historique. Son
 * docblock, `RealRunCard`, le catalogue i18n et `scripts/audit-routes.mjs`
 * répétaient tous la même justification : « aucune lecture d'une course PAR
 * IDENTIFIANT n'existe (O1) : ni requête ni RPC ».
 *
 * La phrase décrivait le CODE, pas le DROIT — et c'est toute la différence :
 *   · la policy `runs_select_own` (0003_rls.sql:107) ouvre déjà `select` sur SES
 *     lignes de `runs`, et `features/history/real.ts` s'en sert pour la LISTE ;
 *   · lire la même table filtrée par `id` ne demande donc ni RPC, ni migration,
 *     ni droit neuf. Personne n'avait écrit la requête, c'est tout.
 * Elle est écrite (`features/history/detailRead.ts`), cet écran la rend, et
 * l'historique s'ouvre au tap.
 *
 * ═══ ORDRE DE COMPOSITION ═══════════════════════════════════════════════════
 *   1. `StackScreen` : retour vers l'historique + titre + kicker (le monde de
 *      LA SORTIE, lu dans `runs.activity`) + la date en sous-titre ;
 *   2. l'ÉTAT — un seul à la fois (chargement / pas connecté / sans backend /
 *      échec / pas dans ton historique / lu) ;
 *   2bis. LA CARTE : le tracé réel de la sortie (cahier G12 — « la trace devient
 *      l'image principale »), ou l'état honnête qui dit ce qui manque ;
 *   3. le BANDEAU : tuile de type colorée PAR RÔLE + type + impact dominant +
 *      pastille GRYD Verify. Exactement la grammaire de la ligne d'où l'on
 *      vient (`runStoryUi`, partagé) — l'écran ouvert ne doit pas se lire
 *      autrement que la ligne tapée ;
 *   4. EFFORT : distance · durée · allure, uniquement ce qui est MESURÉ ;
 *   5. IMPACT TERRITORIAL : le détail des compteurs serveur, chacun présent
 *      seulement s'il est lisible ;
 *   6. CE QUE GRYD A RETENU : l'explication d'une invalidation (partielle /
 *      stats seules / refus + motif) ;
 *   7. PARTAGER : la sortie archivée arme le studio de partage, comme le fait
 *      le Résultat — le « partage rétroactif » que cet en-tête annonçait comme
 *      impossible n'attendait que la trace.
 *
 * ═══ AUCUN CHIFFRE FABRIQUÉ, ET LA DISTINCTION QUI COMPTE ══════════════════
 * L'impact vient du payload `celebration` que le SERVEUR a persisté à
 * l'ingestion — jamais d'un comptage de `hex_claims` par `run_id`, qui rétrécit
 * quand un rival reprend une zone (la sortie d'il y a un mois afficherait « +3 »
 * là où elle en avait pris 18 ; raison écrite au long dans `history/real.ts`).
 * Deux « rien » y sont distingués sans exception :
 *   · le serveur a DÉCIDÉ zéro → le chiffre s'affiche, c'est un fait ;
 *   · le serveur n'a RIEN DIT (payload absent/tronqué) → aucun chiffre, et la
 *     raison est écrite (`detailImpactUnknown`).
 * `points_awarded` / `xp_awarded` sont, eux, `not null default 0` : un 0 y est
 * TOUJOURS une décision serveur, jamais un trou. Les deux régimes ne se
 * mélangent pas — c'est `features/history/runDetail.ts` (pur, testé) qui tranche.
 *
 * ═══ RUN ET BIKE NE SE MÉLANGENT PAS ═══════════════════════════════════════
 * L'écran ne porte PAS le commutateur E14 : il n'y a rien à commuter, on regarde
 * UNE sortie, et sa discipline est un FAIT (`runs.activity`, migration 0070),
 * pas une préférence d'affichage. Toute la copie qui nomme l'effort est indexée
 * par cette discipline (`runDetailCopy`), y compris le motif de refus
 * (`REJECT_REASON_COPY_BY_ACTIVITY` : à pied « allure trop rapide » est la borne
 * anti-vélo, à vélo c'est la borne anti-véhicule motorisé — servir la mauvaise
 * expliquerait le refus par une règle qui ne s'applique pas).
 *
 * ═══ LE TRACÉ, LES SPLITS ET LA COURBE (10/09/2026) ════════════════════════
 * Cet en-tête a longtemps dit : « GRYD N'ARCHIVE AUCUN TRACÉ ». La phrase citait
 * `anticheat_wiring.ts:178` — un commentaire du serveur de juillet. Le serveur
 * d'aujourd'hui garde DEUX formes de trace, et la RLS `runs_select_own` les
 * rendait déjà lisibles :
 *   · `runs.trace_points_2026` (migration 0118, écrite par `refonte2026.ts:167`)
 *     — les points COMPLETS, horodatés : c'est ce qui rend possibles les splits,
 *     la courbe d'allure et le temps en mouvement ;
 *   · `runs.polyline_masked` (écrite par `index.ts:3146`, purgée à 90 jours par
 *     la migration 0101) — la géométrie déjà expurgée : une carte, sans temps.
 * L'écran rend donc la carte (SVG, `features/journal/TraceMap2026`) et l'analyse
 * (`RunAnalysisBlocks2026`), et il DIT ce qui manque quand il manque : trace
 * absente, ou trace masquée donc sans split. Rien n'est extrapolé de l'allure
 * moyenne, et aucune boucle décorative n'est dessinée.
 *
 * CONFIDENTIALITÉ, ET LEQUEL DES DEUX CAS S'APPLIQUE : sa propre sortie, vue par
 * lui, sur son écran → AUCUN masquage d'extrémités (les lui cacher à lui-même
 * n'ajoute pas un gramme de vie privée et rendrait l'écran moins vrai que la
 * réalité) ; toute sortie SORTANTE → le studio de partage applique
 * `protectedShareSegments2026` avant la moindre image. La règle est indexée sur
 * la DESTINATION, jamais sur l'écran (`runDetail.runTraceState`, testé).
 *
 * Analytics : `screen('course_detail')` SANS propriété — l'identifiant vient
 * d'une URL fabriquée par l'extérieur, et le suivi automatique normalise déjà le
 * chemin en `/course/[id]` (`lib/screenName.ts`). Aucun event inventé hors
 * `packages/shared/src/events.ts`.
 */
import { useEffect, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, fontSizes, radii, spacing, typography } from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { Icon } from '../../src/ui/Icon';
import { SectionLabel } from '../../src/ui/SectionLabel';
import { StackScreen } from '../../src/ui/StackScreen';
import { StatePill, type GameVisualState } from '../../src/ui/game';
import { SheetMetrics, type SheetMetric } from '../../src/features/map/SheetMetrics';
import { useSession } from '../../src/lib/session';
import { formatIntFor } from '../../src/ui/numberFormat';
import { fmtDuration, fmtKm, fmtPace } from '../../src/features/history/format';
import { runColorRole, runStory } from '../../src/features/history/historyView';
import { TYPE_ICON, TYPE_LABEL, impactText, roleToken } from '../../src/features/history/runStoryUi';
import {
  capturedTotal,
  effortIsMeasured,
  impactBreakdown,
  impactIsKnown,
  runAwards,
  runVerdict,
  verdictAllowsImpact,
  type RunDetailInput,
} from '../../src/features/history/runDetail';
import { useRunDetail } from '../../src/features/history/detailRead';
import {
  captureAreaLabel2026,
  captureExplanation2026,
  territoryFromCelebration2026,
} from '../../src/features/refonte/captureReceipt2026';
import { RunAnalysisBlocks2026 } from '../../src/features/journal/RunAnalysisBlocks2026';
import { TraceMap2026 } from '../../src/features/journal/TraceMap2026';
import { decimateForDisplay, traceSegments } from '../../src/features/journal/traceRead';
import { DETAIL_MAP_HEIGHT, TRACE_DISPLAY_MAX_POINTS } from '../../src/features/journal/display';
import { setShareRun, shareCardFromResult } from '../../src/features/share/shareRun';
import { UNJUDGED_VERDICT } from '../../src/features/share/narrative';
import { useResultOwner2026 } from '../../src/features/run/useResultOwner2026';
import { formatClock, formatKm2, formatRate } from '../../src/features/journal/format';
import { decimalSeparator } from '../../src/ui/format';
import { useLocale, useT } from '../../src/i18n/store';
import type { Entry, Locale } from '../../src/i18n/types';
import { C, runDetailCopy } from '../../src/i18n/catalog/historique';
import { C as JC } from '../../src/i18n/catalog/journal';
import type { IngestRunResponse } from '@klaim/shared';
import { C as PC } from '../../src/i18n/catalog/performance';
import { REJECT_REASON_COPY_BY_ACTIVITY } from '../../src/i18n/catalog/result';

/** Côté de la tuile de type — la même que la ligne d'historique (planche E24). */
const TILE = 76;

/** Statut serveur → pastille d'état de jeu + libellé. Même table que la ligne. */
function verifyPill(status: RunDetailInput['status']): { state: GameVisualState; label: Entry } {
  switch (status) {
    case 'valid':
      return { state: 'verified', label: C.verifyVerified };
    case 'partial':
      return { state: 'contested', label: C.verifyPartial };
    case 'rejected':
      return { state: 'rejected', label: C.verifyRejected };
    default:
      // 'flagged' : la sortie compte comme effort, pas comme capture.
      return { state: 'statsonly', label: C.verifyStatsOnly };
  }
}

/**
 * Date + heure de départ, dans la langue. `Intl` n'est pas garanti sur tous les
 * moteurs JS embarqués : en cas d'erreur, format numérique non ambigu plutôt
 * qu'une chaîne vide. Une date illisible ne se remplace PAS par « aujourd'hui ».
 */
function formatWhen(ms: number, locale: Locale): string | null {
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  try {
    return d.toLocaleString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    const p2 = (n: number) => n.toString().padStart(2, '0');
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} · ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }
}

/** Card d'état : ce qui se passe, et AU PLUS une action (§A — un seul CTA). */
function StateCard({
  title,
  body,
  cta,
}: {
  title?: string;
  body: string;
  cta?: { label: string; analyticsId: string; onPress: () => void };
}) {
  return (
    <Card style={styles.state}>
      {title !== undefined ? <Text style={styles.stateTitle}>{title}</Text> : null}
      <Text style={styles.stateBody}>{body}</Text>
      {cta ? (
        <View style={styles.stateCta}>
          <Button
            label={cta.label}
            accessibilityLabel={cta.label}
            analyticsId={cta.analyticsId}
            size="md"
            onPress={cta.onPress}
          />
        </View>
      ) : null}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LE CORPS « LU »
// ═══════════════════════════════════════════════════════════════════════════

function DetailBody({ run, locale }: { run: RunDetailInput; locale: Locale }) {
  const t = useT();
  const D = runDetailCopy(run.activity);
  // Largeur MESURÉE : la carte et la courbe sont des SVG, ils ne se cadrent pas
  // sans elle. Tant qu'elle vaut 0, ils ne peignent rien (pas un cadre vide).
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  // Le propriétaire courant du résultat : c'est LUI qui autorise l'armement du
  // studio de partage (`setShareRun` refuse tout autre compte, et le refus
  // n'est pas silencieux — le bouton n'existe que si l'armement est possible).
  const { ownerId } = useResultOwner2026();

  /**
   * ─── LE MONDE DE SEPTEMBRE SE LIT DANS SON PROPRE REÇU (10/09/2026) ───────
   * Cet écran ne lisait que `celebration.hexes`, les compteurs de cellules H3
   * du monde d'août. `ingest_run/refonte2026.ts` les écrit à ZÉRO pour toute
   * sortie de septembre : le détail d'une sortie qui avait pris du terrain
   * affichait donc « Sans capture », et un « 0 » nu en Points. Le reçu
   * territorial était dans le même payload, à côté, jamais lu.
   *
   * Les deux mondes ne se mélangent pas : quand un reçu 2026 existe, les
   * surfaces remplacent les cellules et la ligne « Points » disparaît — le
   * serveur de septembre l'écrit à zéro en dur, et un zéro qui ne décide de
   * rien n'est pas un fait à afficher (L14).
   */
  const receipt2026 = territoryFromCelebration2026(run.celebration);
  const gain2026 = receipt2026?.status === 'published' ? receipt2026.newTerrainM2 : null;
  const explanation2026 = captureExplanation2026(receipt2026 ?? undefined, locale === 'fr');
  const area2026 = (m2: number | null | undefined) => captureAreaLabel2026(m2, locale === 'fr');
  const breakdown = impactBreakdown(run.celebration);
  const total = receipt2026 ? null : capturedTotal(breakdown);
  // Le TYPE et l'impact DOMINANT sont dérivés exactement comme sur la ligne
  // d'historique (`runStory`, pur et testé) : le détail ne doit pas raconter une
  // autre histoire que la ligne d'où on l'a tapé.
  // Dans le monde des surfaces, « combien de zones » n'a pas de sens : le
  // bandeau raconte la capture par sa SURFACE, ou par le motif exact du reçu.
  const story = receipt2026
    ? ((gain2026 ?? 0) > 0 ? { type: 'capture' as const, zones: 0 } : { type: 'free' as const })
    : runStory({
        captured: total,
        retaken: breakdown.stolen,
        defended: breakdown.defended,
      });
  const roleColor = roleToken(runColorRole(story.type));
  const impact = receipt2026
    ? (area2026(gain2026) !== null ? `+${area2026(gain2026)}` : explanation2026?.title ?? null)
    : impactText(story, t);
  const pill = verifyPill(run.status);
  const verdict = runVerdict(run.status, run.rejectReason);
  const awards = runAwards(run);

  // ── EFFORT : uniquement ce qui est MESURÉ. Un 0 n'est pas une performance,
  //    c'est une valeur absente — la métrique disparaît plutôt que de mentir.
  const effort: SheetMetric[] = [];
  if (effortIsMeasured(run.km)) {
    const km = fmtKm(run.km);
    if (km !== null) effort.push({ key: 'km', value: km, label: t(C.detailDistance) });
  }
  if (effortIsMeasured(run.durationS)) {
    const dur = fmtDuration(run.durationS);
    if (dur !== null) effort.push({ key: 'dur', value: dur, label: t(C.detailDuration) });
  }
  if (run.paceSPerKm !== null && effortIsMeasured(run.paceSPerKm)) {
    effort.push({ key: 'pace', value: fmtPace(run.paceSPerKm), label: t(C.detailPace) });
  }

  // ── IMPACT : un compteur ABSENT disparaît, il ne devient jamais « 0 ». On ne
  //    peint pas non plus six cases à zéro : seules les grandeurs NON NULLES
  //    racontent quelque chose, et le type de la sortie (« Sans capture »,
  //    chapeau du bandeau) porte déjà le « rien pris » quand c'est le cas.
  const impactMetrics: SheetMetric[] = [];
  const push = (key: string, value: number | null, label: Entry) => {
    if (receipt2026) return; // monde des surfaces : aucune cellule à compter
    if (value !== null && value > 0) {
      impactMetrics.push({ key, value: formatIntFor(value, locale), label: t(label) });
    }
  };
  const pushArea = (key: string, m2: number | null | undefined, label: Entry) => {
    const value = area2026(m2);
    if (value !== null) impactMetrics.push({ key, value, label: t(label) });
  };
  if (receipt2026) {
    pushArea('loop', receipt2026.loopAreaM2, C.detailLoopArea);
    pushArea('new', gain2026, C.detailNewTerrain);
    pushArea('owned', receipt2026.alreadyOwnedM2, C.detailAlreadyOwned);
  }
  if (total !== null && total > 0) {
    impactMetrics.push({
      key: 'total',
      value: formatIntFor(total, locale),
      label: t(C.detailZonesTotal),
    });
  }
  push('new', breakdown.claimed, C.detailZonesNew);
  push('stolen', breakdown.stolen, C.detailZonesStolen);
  push('pioneer', breakdown.pioneer, C.detailZonesPioneer);
  push('defended', breakdown.defended, C.detailZonesDefended);
  push('relay', breakdown.coCaptured, C.detailZonesRelay);
  push('blocked', breakdown.blocked, C.detailZonesBlocked);

  // ── POINTS / XP : colonnes NOT NULL — un 0 y est une décision, pas un trou.
  const awardMetrics: SheetMetric[] = [];
  if (awards.points !== null && !receipt2026) {
    awardMetrics.push({
      key: 'pts',
      value: formatIntFor(awards.points, locale),
      label: t(C.detailPoints),
    });
  }
  if (awards.xp !== null) {
    awardMetrics.push({ key: 'xp', value: formatIntFor(awards.xp, locale), label: t(C.detailXp) });
  }

  const showImpact = verdictAllowsImpact(verdict);

  // ── LA TRACE : décimée pour le dessin, jamais déplacée ────────────────────
  const points = decimateForDisplay(run.trace.points, TRACE_DISPLAY_MAX_POINTS);
  const hasTrace = run.trace.source !== 'none' && points.length >= 2;

  /**
   * PARTAGER UNE SORTIE ARCHIVÉE. Le studio lit ce qui vient d'être armé
   * (`getShareRun`) et applique LUI-MÊME la protection de vie privée sur les
   * segments (`protectedShareSegments2026`) : on lui passe la trace telle
   * qu'elle est lue, jamais une trace « pré-masquée » deux fois.
   *
   * `clientRunId` reçoit l'identifiant SERVEUR de la sortie : ce champ est la
   * clé de portée de la mémoire de partage (`resultOwner2026`), pas une
   * revendication d'identité d'enregistrement. Une sortie archivée n'a pas
   * d'autre identité stable côté client.
   *
   * VERDICT : `credited` est vrai UNIQUEMENT si le serveur a publié une
   * capture. Sans ça, le studio proposerait une affiche de victoire pour une
   * boucle refusée — le bug que `narrative.ts` a été écrit pour fermer.
   */
  const share = () => {
    // La session n'a pas fini de se résoudre : on n'arme rien plutôt que
    // d'armer sous un propriétaire inconnu (le studio refuserait de toute
    // façon, mais silencieusement — et un tap sans effet est un bouton mort).
    if (ownerId === undefined) return;
    const armed = setShareRun(
      {
        card: shareCardFromResult({
          activity: run.activity,
          distanceKm: formatKm2(run.km, decimalSeparator()) ?? '',
          clockLabel: formatClock(run.durationS) ?? '',
          paceLabel: formatRate(run.activity, run.paceSPerKm, decimalSeparator())?.value ?? '',
          surfaceValue: gain2026 !== null && gain2026 > 0 ? area2026(gain2026) ?? '' : '',
          surfaceUnit: '',
          trace: points.map((point) => ({ lat: point.lat, lng: point.lng })),
          verified: false,
        }),
        traceSegments: traceSegments(points).map((segment) =>
          segment.map((point) => ({ lat: point.lat, lng: point.lng })),
        ),
        // Le reçu tel que le serveur l'a persisté. Le type partagé ferme le
        // `status` à ce que ce client connaît ; le reçu, lui, reste ouvert
        // (`captureReceipt2026`) — d'où la conversion, explicite et unique.
        ...(receipt2026
          ? { territory2026: receipt2026 as NonNullable<IngestRunResponse['territory2026']> }
          : {}),
        intention: null,
        mode: 'conquete',
        verdict: {
          ...UNJUDGED_VERDICT,
          judged: true,
          credited: receipt2026?.status === 'published' && (gain2026 ?? 0) > 0,
          loopClosed: receipt2026?.status === 'published',
        },
      },
      { ownerId, clientRunId: run.id },
    );
    if (armed) router.push('/partage');
  };

  return (
    <View onLayout={onLayout}>
      {/* ── 2bis. LA CARTE : la trace RÉELLE, ou ce qui manque, dit ───────── */}
      {hasTrace ? (
        <Card style={styles.mapCard}>
          <TraceMap2026
            points={points}
            width={Math.max(0, width - spacing.cardPadding * 2)}
            height={DETAIL_MAP_HEIGHT}
            tone="dark"
            showStart={run.trace.source === 'full'}
            testID="course-detail-trace"
          />
          {run.trace.source === 'masked' ? (
            <Text style={styles.note}>{t(JC.traceMasked)}</Text>
          ) : null}
        </Card>
      ) : (
        <Text style={styles.footnote}>{t(JC.traceNone)}</Text>
      )}

      {/* ── 3. BANDEAU : la même grammaire que la ligne tapée ─────────────── */}
      <Card style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.tile}>
            <Icon name={TYPE_ICON[story.type]} size={34} color={roleColor} />
          </View>
          <View style={styles.headerBody}>
            <Text style={[styles.type, { color: roleColor }]} numberOfLines={1}>
              {t(TYPE_LABEL[story.type])}
            </Text>
            {impact !== null ? (
              <Text
                style={styles.impact}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {impact}
              </Text>
            ) : null}
            <View style={styles.pillRow}>
              <StatePill state={pill.state} label={t(pill.label)} />
            </View>
          </View>
        </View>
      </Card>

      {/* ── 4. EFFORT ────────────────────────────────────────────────────── */}
      {effort.length > 0 ? (
        <>
          <SectionLabel style={styles.sectionLabel}>{t(C.detailEffortLabel)}</SectionLabel>
          <SheetMetrics metrics={effort} testID="course-detail-effort" />
        </>
      ) : null}

      {/* ── 4bis. L'ANALYSE SPORTIVE : splits, courbe, altitude si elle existe.
             Le même composant que le Résultat — une seule grammaire. ─────── */}
      {hasTrace ? (
        <View style={styles.analysis}>
          <RunAnalysisBlocks2026
            activity={run.activity}
            points={run.trace.points}
            tone="dark"
            testID="course-detail-analysis"
          />
        </View>
      ) : null}

      {/* ── 5. IMPACT TERRITORIAL — jamais sous une sortie refusée ou gelée :
             elle n'en a AUCUN par construction serveur (aucune écriture hex),
             et un bloc vide s'y lirait comme une perte. ───────────────────── */}
      {showImpact ? (
        <>
          <SectionLabel style={styles.sectionLabel}>{t(C.detailImpactLabel)}</SectionLabel>
          {receipt2026 || impactIsKnown(breakdown) ? (
            <>
              {impactMetrics.length > 0 ? (
                <SheetMetrics metrics={impactMetrics} testID="course-detail-impact" />
              ) : null}
              {explanation2026 !== null ? (
                <Text style={styles.note}>{explanation2026.body}</Text>
              ) : null}
              {breakdown.blocked !== null && breakdown.blocked > 0 && !receipt2026 ? (
                <Text style={styles.note}>{t(C.detailBlockedNote)}</Text>
              ) : null}
            </>
          ) : (
            // Payload illisible : on dit la cause plutôt que de laisser une
            // section vide qui se lirait comme un échec sportif.
            <Text style={styles.note}>{t(C.detailImpactUnknown)}</Text>
          )}
          {awardMetrics.length > 0 ? (
            <View style={styles.awards}>
              <SheetMetrics metrics={awardMetrics} testID="course-detail-awards" />
            </View>
          ) : null}
        </>
      ) : null}

      {/* ── 6. CE QUE GRYD A RETENU : l'explication d'une invalidation ────── */}
      {verdict.kind !== 'valid' ? (
        <>
          <SectionLabel style={styles.sectionLabel}>{t(C.detailVerdictLabel)}</SectionLabel>
          {verdict.kind === 'partial' ? (
            <Text style={styles.line}>{t(C.detailVerdictPartial)}</Text>
          ) : null}
          {verdict.kind === 'flagged' ? (
            <Text style={styles.line}>{t(D.verdictFlagged)}</Text>
          ) : null}
          {verdict.kind === 'rejected' ? (
            <>
              <Text style={styles.line}>{t(D.verdictRejected)}</Text>
              {/* La CAUSE est indexée par la DISCIPLINE : les bornes d'allure ne
                  sont pas les mêmes à pied et à vélo, et servir la mauvaise
                  expliquerait le refus par une règle qui ne s'applique pas.
                  Motif inconnu → aucune cause inventée. */}
              <Text style={styles.note}>
                {verdict.reason === null
                  ? t(C.detailVerdictRejectedNoReason)
                  : t(REJECT_REASON_COPY_BY_ACTIVITY[run.activity][verdict.reason])}
              </Text>
            </>
          ) : null}
        </>
      ) : null}

      {/* ── 7. PARTAGER — le CTA n'apparaît QUE s'il mène quelque part : sans
             trace, le studio n'aurait aucune image à composer (§A, aucun
             bouton mort), et la phrase le dit à sa place. ────────────────── */}
      {hasTrace && ownerId !== undefined ? (
        <View style={styles.shareCta}>
          <Button
            label={t(JC.shareCta)}
            accessibilityLabel={t(JC.shareCta)}
            analyticsId="course_detail_share"
            icon="partage"
            size="md"
            onPress={share}
          />
        </View>
      ) : hasTrace ? null : (
        <Text style={styles.footnote}>{t(JC.shareNoTrace)}</Text>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════

export default function CourseDetailScreen() {
  const t = useT();
  const locale = useLocale();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { status, run, reload } = useRunDetail(id);
  // `configured` = un backend existe. Sans lui, proposer « Se connecter »
  // enverrait dans un cul-de-sac (le bouton mort de §A).
  const { configured } = useSession();

  useEffect(() => {
    // Sans propriété : l'identifiant vient d'une URL externe, et le suivi
    // automatique normalise déjà le chemin en `/course/[id]`.
    screen('course_detail');
  }, []);

  // ⚠ LES QUATRE ÉTATS D'AVANT LA LECTURE SONT NEUTRES, et ce n'est pas un
  // oubli de jumelage : tant que la ligne n'est pas lue, `runs.activity` est
  // INCONNUE. Servir ici le vocabulaire coureur serait une supposition sur le
  // sport de quelqu'un ; servir le vocabulaire vélo le serait tout autant.
  // C'est l'écart assumé avec /performance et /historique, où le commutateur
  // E14 AFFICHE le monde regardé pendant ces mêmes états — donc la copie doit
  // l'y suivre. Ici, rien à l'écran ne revendique un monde.
  //
  // `runDetailCopy` n'est donc appelé QUE dans `DetailBody`, avec une sortie
  // réellement lue.
  const when = run ? formatWhen(run.startedAtMs, locale) : null;

  return (
    <StackScreen
      title={t(C.detailTitle)}
      icon="historique"
      backHref="/historique"
      {...(run ? { kicker: t(runDetailCopy(run.activity).kicker) } : {})}
      {...(when !== null ? { subtitle: when } : {})}
    >
      {/* ── 1. On ne sait pas encore : une LIGNE grise, jamais un spinner. ── */}
      {status === 'loading' ? <Text style={styles.stateInline}>{t(C.detailLoading)}</Text> : null}

      {/* ── 2. Pas de compte : une sortie vit dessus. Le CTA n'apparaît que
             s'il mène quelque part — sans backend, une phrase le remplace. ── */}
      {status === 'signed-out' ? (
        <StateCard
          {...(configured ? {} : { title: t(C.detailNoBackendTitle) })}
          body={configured ? t(C.detailSignedOutBody) : t(PC.noBackendBody)}
          {...(configured
            ? {
                cta: {
                  label: t(C.emptySignedOutCta),
                  analyticsId: 'course_detail_sign_in',
                  onPress: () => router.push('/sign-in'),
                },
              }
            : {})}
        />
      ) : null}

      {/* ── 3. Échec : sa sortie existe peut-être, on n'a pas su la lire. ── */}
      {status === 'failed' ? (
        <StateCard
          title={t(C.detailFailedTitle)}
          body={t(PC.failedBody)}
          cta={{ label: t(PC.retry), analyticsId: 'course_detail_retry', onPress: reload }}
        />
      ) : null}

      {/* ── 4. Lu, et aucune ligne. C'est un FAIT sur SON historique — et il
             couvre les deux causes que la RLS rend (volontairement)
             indistinguables : identifiant inconnu, ou sortie d'autrui. ────── */}
      {status === 'not-found' ? (
        <StateCard
          title={t(C.detailNotFoundTitle)}
          body={t(C.detailNotFoundBody)}
          cta={{
            label: t(C.runDetailPendingCta),
            analyticsId: 'course_detail_to_history',
            onPress: () => router.replace('/historique'),
          }}
        />
      ) : null}

      {/* ── 5. Lu. ── */}
      {status === 'ready' && run ? <DetailBody run={run} locale={locale} /> : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },

  // ── La carte : `Card` fournit la surface, le SVG occupe sa largeur utile ──
  mapCard: { marginTop: spacing.md, gap: spacing.sm },
  analysis: { marginTop: spacing.xl },
  shareCta: { marginTop: spacing.xl },

  // ── Bandeau : `Card` fournit surface, rayon et padding (sans contour) ──
  header: { marginTop: spacing.md },
  headerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radii.control,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBody: { flex: 1, gap: spacing.xxs },
  type: { fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.2 },
  // Rôle R6 « stat » recopié à la main, comme dans `StatBlock` et `RealRunCard` :
  // `typography.stat` porte un `fontVariant` en LECTURE SEULE que `StyleSheet`
  // refuse à l'étalement. Un chiffre porte toujours une typo de chiffre.
  impact: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.lg,
  },
  pillRow: { flexDirection: 'row', marginTop: spacing.xxs },

  awards: { marginTop: spacing.md },

  line: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  note: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.sm,
  },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.lg,
  },

  // ── États (même grammaire que /historique : une seule dans l'app) ──
  state: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
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
