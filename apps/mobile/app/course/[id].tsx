/**
 * GRYD — DÉTAIL D'UNE COURSE (AMENDEMENT-17 CHANTIER 3). « Effort + impact
 * territorial », résumé + détail : au-dessus du fold on lit le nom, l'effort
 * (3 stats), l'impact OU la raison honnête d'un refus. Plus bas : mini-carte
 * AVANT/APRÈS (si boucle fermée — traits nets §4ter, jamais de cellule/blob),
 * lignes d'impact variées, segments (valide / GPS faible / pause), et le bloc
 * RAISON explicite quand la capture n'a pas eu lieu (« Boucle non fermée · il
 * manquait 240 m » / « Zone trop fine » / « GPS instable → stats only » /
 * « Vitesse incohérente → refusé »). CTA : Partager · Voir sur la carte ·
 * Signaler. Aucune valeur de jeu calculée ici (miroir des runs/claims serveur).
 * Analytics : screen('course_detail'), recordShared au partage.
 *
 * DÉTAIL DU CALCUL (AMENDEMENT-23 §B.5, explicabilité) : au tap, une scène
 * dépliable décompose la course en chiffres DÉJÀ décidés serveur (zones par
 * trace, zones par boucle + gain, zones défendues, segments exclus, GRYD Verify)
 * et révèle le schéma pédagogique pertinent (socle explain). Elle PROLONGE le
 * bloc « La boucle fait la zone » (RunLoopMap) sans le dupliquer : la carte
 * avant/après montre le geste, cette scène montre le calcul + les seuils réels
 * (verify 80/60 via labels dérivés de game-rules, aucun nombre magique).
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fontSizes, gameColors, iconSizes, radii, sizes, spacing } from '@klaim/shared';
import { EVENTS, screen, track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { Icon } from '../../src/ui/Icon';
import { Button } from '../../src/ui/Button';
import { StackScreen } from '../../src/ui/StackScreen';
import { Segmented, StatePill, type GameVisualState } from '../../src/ui/game';
import { RunLoopMap, RunTrace2D } from '../../src/features/history/RunLoopMap';
import { RunRoute3D } from '../../src/features/history/RunRoute3D';
import { runTrace } from '../../src/features/history/demoRuns';
import {
  fmtDuration,
  fmtKm,
  fmtPace,
  type RefusalReason,
  type RunHistoryEntry,
  type SegmentState,
} from '../../src/features/history/demo';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { C } from '../../src/i18n/catalog/historique';
import { BoucleFaitLaZone, VerifySchema } from '../../src/features/explain/schemas';
import { verifyTiersSentence } from '../../src/features/explain/labels';
import {
  BOUCLE_BASTILLE,
  BOUCLE_REPUBLIQUE,
  type LatLngPoint,
} from '../../src/features/map/realAnchors';

/** Trace d'authoring pour la mini-carte avant/après (réutilise realAnchors). */
const LOOP_TRACE: Record<string, readonly LatLngPoint[]> = {
  republique: BOUCLE_REPUBLIQUE,
  bastille: BOUCLE_BASTILLE,
};

/** Métadonnées d'affichage d'un état de segment (couleur + libellé + icône). */
const SEGMENT_META: Record<
  SegmentState,
  { label: Entry; tint: string; icon: import('@klaim/shared').IconName }
> = {
  valid: { label: C.segValid, tint: gameColors.verify, icon: 'gps' },
  weak_gps: { label: C.segWeakGps, tint: colors.gris, icon: 'alerte' },
  pause: { label: C.segPause, tint: colors.gris, icon: 'sablier' },
};

/** Titres traduits du motif de refus (bloc raison) — résolus à l'affichage. */
const REFUSAL_TITLE_ENTRIES: Record<Exclude<RefusalReason, null>, Entry> = {
  loop_open: C.refusalLoopOpen,
  zone_thin: C.refusalZoneThin,
  gps_unstable: C.refusalGpsUnstable,
  speed_incoherent: C.refusalSpeed,
};

/** Pastille Verify d'en-tête (miroir de la card) — libellé résolu au rendu. */
function headerPill(entry: RunHistoryEntry): { state: GameVisualState; label: Entry } {
  if (entry.refusal === 'speed_incoherent') return { state: 'rejected', label: C.verifyRejected };
  if (entry.verify === 'verified') return { state: 'verified', label: C.verifyVerified };
  if (entry.verify === 'partial') return { state: 'contested', label: C.verifyPartial };
  return { state: 'statsonly', label: C.verifyStatsOnly };
}

// ─── Détail du calcul (explicabilité §B.5) ───────────────────────────────────

/** Une ligne de la décomposition : libellé + valeur + accent gain optionnel. */
interface CalcRow {
  icon: import('@klaim/shared').IconName;
  label: string;
  value: string;
  gain?: boolean;
}

/**
 * Décompose une course en chiffres DÉJÀ décidés serveur (miroir demo). Zéro
 * calcul de jeu : on lit `loopMap` (trace/boucle), on COMPTE les segments
 * `weak_gps` (exclus) et on mappe le statut Verify. Rien n'est fabriqué : une
 * ligne n'apparaît que si sa donnée existe sur l'entrée. `t` vient du composant
 * appelant (résolution de langue à l'affichage, re-render à la bascule).
 */
function calcRows(entry: RunHistoryEntry, t: ReturnType<typeof useT>): readonly CalcRow[] {
  const rows: CalcRow[] = [];
  if (entry.loopMap) {
    const gain = entry.loopMap.afterZones - entry.loopMap.beforeZones;
    rows.push({ icon: 'route', label: t(C.calcZonesTrace), value: `+${entry.loopMap.beforeZones}` });
    rows.push({
      icon: 'boucle_fermee',
      label: t(C.calcZonesLoop),
      value: `+${entry.loopMap.afterZones}`,
      gain: true,
    });
    if (gain > 0) {
      rows.push({
        icon: 'conquete',
        label: t(C.calcClosureGain),
        value: `+${gain}`,
        gain: true,
      });
    }
  }
  const excluded = entry.segments.filter((s) => s.state === 'weak_gps');
  rows.push({
    icon: 'segment_exclu',
    label: t(C.calcExcludedSegments),
    value: excluded.length === 0 ? t(C.calcNone) : String(excluded.length),
  });
  return rows;
}

/**
 * Ligne « zones défendues » honnête (déjà décidée serveur) : la phrase d'impact
 * portée par l'entrée (bouclier + gain), affichée en pleine largeur car le texte
 * est descriptif — jamais forcé dans une colonne de valeur. `null` si la course
 * n'a rien défendu.
 */
function defendedLabel(entry: RunHistoryEntry): string | null {
  const line = entry.impactLines.find((l) => l.icon === 'bouclier' && l.gain);
  return line ? line.label : null;
}

/** Libellé + état de la ligne « GRYD Verify » du détail (résolu au rendu). */
function verifyLine(entry: RunHistoryEntry): { label: Entry; tint: string } {
  if (entry.refusal === 'speed_incoherent') return { label: C.verifyRejected, tint: gameColors.danger };
  if (entry.verify === 'verified') return { label: C.verifyVerified, tint: gameColors.verify };
  if (entry.verify === 'partial') return { label: C.verifyPartial, tint: gameColors.verify };
  return { label: C.verifyStatsOnly, tint: colors.gris };
}

/**
 * « Détail du calcul » — scène dépliable au tap. Résumé fermé (une phrase),
 * détail ouvert : rangées de décomposition + schéma pédagogique du socle
 * (boucle → BoucleFaitLaZone ; sinon Verify) + phrase des seuils Verify réels.
 * Un seul lien vers la page complète. Contours d'état, pas de card-dans-card.
 */
function CalcDetail({ entry }: { entry: RunHistoryEntry }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rows = calcRows(entry, t);
  const verify = verifyLine(entry);
  const defended = defendedLabel(entry);
  const hasLoop = Boolean(entry.loopMap);

  const toggle = () => {
    haptics.light();
    setOpen((v) => !v);
    if (!open) screen('calc_detail', { run: entry.id });
  };
  const openCalcPage = () => {
    haptics.light();
    router.push('/calcul-zones');
  };

  return (
    <View style={styles.calcBlock}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t(C.a11yCalcDetail)}
        onPress={toggle}
        style={({ pressed }) => [styles.calcHead, pressed && styles.pressed]}
      >
        <Icon name="badge" size={iconSizes.md} color={colors.blanc} />
        <View style={styles.calcHeadText}>
          <Text style={styles.calcTitle}>{t(C.calcTitle)}</Text>
          <Text style={styles.calcSub} numberOfLines={1}>
            {open ? t(C.calcSubOpen) : t(C.calcSubClosed)}
          </Text>
        </View>
        <View style={open ? styles.chevronOpen : undefined}>
          <Icon name="chevron" size={16} color={colors.gris} />
        </View>
      </Pressable>

      {open ? (
        <View style={styles.calcBody}>
          {/* Décomposition en chiffres (déjà décidés serveur) */}
          <View style={styles.calcRows}>
            {rows.map((row) => (
              <View key={row.label} style={styles.calcRow}>
                <Icon
                  name={row.icon}
                  size={16}
                  color={row.gain ? gameColors.crew : colors.gris}
                />
                <Text style={styles.calcRowLabel} numberOfLines={2}>
                  {row.label}
                </Text>
                <Text
                  style={[styles.calcRowValue, row.gain && styles.calcRowValueGain]}
                  numberOfLines={1}
                >
                  {row.value}
                </Text>
              </View>
            ))}
            {/* GRYD Verify : score de la course */}
            <View style={styles.calcRow}>
              <Icon name="badge" size={16} color={verify.tint} />
              <Text style={styles.calcRowLabel} numberOfLines={2}>
                GRYD Verify
              </Text>
              <Text style={[styles.calcRowValue, { color: verify.tint }]} numberOfLines={1}>
                {t(verify.label)}
              </Text>
            </View>
          </View>

          {/* Zones défendues (texte descriptif, pleine largeur) */}
          {defended ? (
            <View style={styles.calcDefended}>
              <Icon name="bouclier" size={16} color={gameColors.crew} />
              <Text style={styles.calcDefendedText}>{defended}</Text>
            </View>
          ) : null}

          {/* Schéma pédagogique (socle) — la boucle si fermée, sinon Verify */}
          <View style={styles.calcSchema}>
            {hasLoop && entry.loopMap ? (
              <BoucleFaitLaZone
                size={264}
                traceZones={entry.loopMap.beforeZones}
                loopZones={entry.loopMap.afterZones}
                loopGain={entry.loopMap.afterZones - entry.loopMap.beforeZones}
                accessibilityLabel={t(C.a11ySchemaLoop)}
              />
            ) : (
              <VerifySchema size={264} />
            )}
          </View>

          {/* Seuils Verify RÉELS (labels dérivés de game-rules, pas de littéral) */}
          <Text style={styles.calcNote}>{verifyTiersSentence()}</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.a11yOpenCalcPage)}
            onPress={openCalcPage}
            style={({ pressed }) => [styles.calcLink, pressed && styles.pressed]}
          >
            <Text style={styles.calcLinkText}>{t(C.calcLink)}</Text>
            <Icon name="chevron" size={iconSizes.sm} color={colors.chartreuse} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// ─── Parcours : le TRACÉ du run, toggle 2D / 3D (AMENDEMENT-25 §2) ───────────

/** Mode d'affichage du tracé : carte 2D nette OU vue 3D GRYD Conquest. */
type RouteViewMode = '2d' | '3d';

/**
 * Segments du toggle 2D/3D (segmented AMENDEMENT-22 — labels courts, jamais
 * tronqués). Pas d'icône : « 2D »/« 3D » sont déjà sans ambiguïté, et une icône
 * ferait déborder le label sur un segment étroit (pet peeve : zéro « … »).
 */
const ROUTE_VIEW_OPTIONS = [
  { id: '2d' as const, label: '2D' },
  { id: '3d' as const, label: '3D' },
];

/**
 * Scène « PARCOURS » du détail (AMENDEMENT-25 §2) : le dessin du tracé de la
 * course avec un toggle 2D / 3D. 2D = `RunTrace2D` (carte nette, aire enfermée
 * si boucle) ; 3D = `RunRoute3D` (style GRYD 3D Conquest — carte dark pitchée +
 * trace chartreuse épaisse + zone extrudée si boucle fermée, réutilise RealMap/
 * ShareMap3D). Une seule surface, un seul segmented (pas de card-dans-card,
 * AMENDEMENT-22). Le tracé vient de `demoRuns` (source unique). Reduce motion :
 * porté par RealMap (pitch fixe). `runId` scope l'event d'analytics.
 */
function RunRouteScene({ runId }: { runId: string }) {
  const t = useT();
  const [mode, setMode] = useState<RouteViewMode>('2d');
  const trace = runTrace(runId);
  if (!trace) return null;

  const pick = (next: RouteViewMode) => {
    if (next === mode) return;
    setMode(next);
    screen('course_route_view', { run: runId, view: next });
  };

  return (
    <View style={styles.routeScene}>
      <View style={styles.routeHead}>
        <Text style={styles.sectionLabelInline}>{t(C.routeSection)}</Text>
        <Segmented
          options={ROUTE_VIEW_OPTIONS}
          value={mode}
          onChange={pick}
          tone="surface"
          accessibilityLabel={t(C.a11yRouteToggle)}
          style={styles.routeToggle}
        />
      </View>
      {mode === '2d' ? (
        <RunTrace2D trace={trace} />
      ) : (
        <RunRoute3D trace={trace} style={styles.route3d} />
      )}
    </View>
  );
}

/**
 * SEAM de la lecture RÉELLE — TODO(O1) : lire `runs` filtrée par id (policy
 * `runs_select_own`, jamais un autre coureur) et bâtir un `RunHistoryEntry`.
 *
 * Tant que cette lecture n'existe pas, la fonction renvoie `undefined` et
 * l'écran affiche son état vide. Elle est une FONCTION, pas une constante, pour
 * que la mise en page du détail (ci-dessous) reste typée et compilée : elle sera
 * réutilisée telle quelle le jour où la requête sera branchée.
 */
function findRealRun(_id: string | undefined): RunHistoryEntry | undefined {
  return undefined;
}

export default function CourseDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  // FUITE COLMATÉE (21/07/2026) : `findRun` lit le catalogue de DÉMO. L'écran
  // n'avait aucun gate — un lien /course/republique ouvert sur un téléphone
  // neuf affichait une course inventée, tracé et zones compris, comme si elle
  // était au coureur. Le mode vitrine ayant été abandonné, ce catalogue n'est
  // plus lu du tout : tant que le détail d'une course RÉELLE n'est pas câblé
  // (lecture de `runs` par id, O1), l'écran répond honnêtement qu'il n'a pas
  // cette course. Mieux vaut ne rien montrer que montrer celle d'un autre.
  const entry = findRealRun(typeof id === 'string' ? id : undefined);

  useEffect(() => {
    screen('course_detail', { id: id ?? '' });
  }, [id]);

  if (!entry) {
    return (
      <StackScreen title={t(C.runFallbackTitle)} icon="historique">
        <Text style={styles.empty}>{t(C.runNotYours)}</Text>
      </StackScreen>
    );
  }

  const pill = headerPill(entry);
  const loopTrace = entry.loopMap ? LOOP_TRACE[entry.loopMap.anchor] : undefined;

  const share = () => {
    haptics.light();
    track(EVENTS.shareCardGenerated, { source: 'course_detail', run: entry.id });
    router.push('/course-result?mode=social_run');
  };
  const seeOnMap = () => {
    haptics.light();
    router.push('/(tabs)');
  };
  const report = () => {
    haptics.light();
    router.push('/support');
  };

  return (
    <StackScreen
      title={entry.name}
      icon="historique"
      kicker={`${entry.area} · ${entry.when}`.toUpperCase()}
    >
      {/* Effort héro : 3 stats sans scroll */}
      <View style={styles.effortCard}>
        <View style={styles.effortCell}>
          <Text style={styles.effortValue}>{fmtKm(entry.km)}</Text>
          <Text style={styles.effortLabel}>{t(C.statDistance)}</Text>
        </View>
        <View style={styles.effortDivider} />
        <View style={styles.effortCell}>
          <Text style={styles.effortValue}>{fmtDuration(entry.durationS)}</Text>
          <Text style={styles.effortLabel}>{t(C.statDuration)}</Text>
        </View>
        <View style={styles.effortDivider} />
        <View style={styles.effortCell}>
          <Text style={styles.effortValue}>{fmtPace(entry.paceSPerKm)}</Text>
          <Text style={styles.effortLabel}>{t(C.statPace)}</Text>
        </View>
      </View>

      <View style={styles.pillRow}>
        <StatePill state={pill.state} label={t(pill.label)} />
      </View>

      {/* PARCOURS : le dessin du tracé, toggle 2D / 3D (AMENDEMENT-25 §2) */}
      <RunRouteScene runId={entry.id} />

      {/* RAISON (si capture refusée / partielle) — factuelle, jamais de blâme */}
      {entry.refusal || entry.refusalDetail ? (
        <View
          style={[
            styles.reasonCard,
            entry.refusal === 'speed_incoherent' && styles.reasonCardHot,
          ]}
        >
          <View style={styles.reasonHead}>
            <Icon
              name={entry.verify === 'partial' ? 'gps' : 'alerte'}
              size={iconSizes.md}
              color={entry.refusal === 'speed_incoherent' ? gameColors.danger : colors.gris}
            />
            <Text style={styles.reasonTitle}>
              {entry.refusal
                ? t(REFUSAL_TITLE_ENTRIES[entry.refusal])
                : t(C.verifyPartial)}
            </Text>
          </View>
          {entry.refusalDetail ? (
            <Text style={styles.reasonBody}>{entry.refusalDetail}</Text>
          ) : null}
        </View>
      ) : null}

      {/* Mini-carte AVANT/APRÈS (boucle fermée uniquement) */}
      {loopTrace && entry.loopMap ? (
        <View style={styles.block}>
          <RunLoopMap
            trace={loopTrace}
            beforeZones={entry.loopMap.beforeZones}
            afterZones={entry.loopMap.afterZones}
          />
        </View>
      ) : null}

      {/* Détail du calcul (au tap) — prolonge « La boucle fait la zone » */}
      <View style={styles.block}>
        <CalcDetail entry={entry} />
      </View>

      {/* Impact territorial : lignes variées */}
      <Text style={styles.sectionLabel}>{t(C.impactSection)}</Text>
      <View style={styles.impactList}>
        {entry.impactLines.map((line, i) => (
          <View key={i} style={styles.impactRow}>
            <View
              style={[styles.impactIcon, line.gain && { borderColor: gameColors.crew }]}
            >
              <Icon
                name={line.icon}
                size={16}
                color={line.gain ? gameColors.crew : colors.gris}
              />
            </View>
            <Text
              style={[styles.impactText, line.gain && styles.impactTextGain]}
              numberOfLines={2}
            >
              {line.label}
            </Text>
          </View>
        ))}
      </View>

      {entry.crewNote ? <Text style={styles.crewNote}>{entry.crewNote}</Text> : null}

      {/* Segments : valide / GPS faible / pause */}
      <Text style={styles.sectionLabel}>{t(C.segmentsSection)}</Text>
      <View style={styles.segList}>
        {entry.segments.map((seg, i) => {
          const meta = SEGMENT_META[seg.state];
          return (
            <View key={i} style={styles.segRow}>
              <Icon name={meta.icon} size={16} color={meta.tint} />
              <Text style={styles.segLabel} numberOfLines={1}>
                {seg.label}
              </Text>
              {seg.km > 0 ? (
                <Text style={styles.segKm}>{fmtKm(seg.km)}</Text>
              ) : null}
              <Text style={[styles.segState, { color: meta.tint }]}>{t(meta.label)}</Text>
            </View>
          );
        })}
      </View>

      {/* CTA : Partager · Voir sur la carte · Signaler */}
      <View style={styles.ctaBlock}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yShareRun)}
          onPress={share}
          style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
        >
          <Icon name="partage" size={iconSizes.md} color={colors.noir} />
          <Text style={styles.primaryLabel}>{t(C.share)}</Text>
        </Pressable>
        <Button variant="ghost" size="md" label={t(C.seeOnMap)} icon="carte" onPress={seeOnMap} />
        <Button variant="ghost" size="md" label={t(C.reportProblem)} icon="alerte" onPress={report} />
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  empty: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 20 },
  // ── Effort héro ──
  effortCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 18,
    marginTop: spacing.xs,
  },
  effortCell: { flex: 1, alignItems: 'center', gap: 4 },
  effortValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  effortLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1.5 },
  effortDivider: { width: 1, height: 34, backgroundColor: colors.grisLigne },
  pillRow: { flexDirection: 'row', marginTop: 14 },
  // ── Raison de refus ──
  reasonCard: {
    marginTop: 14,
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.md,
    gap: 8,
  },
  reasonCardHot: { borderColor: gameColors.danger },
  reasonHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reasonTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  reasonBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  block: { marginTop: spacing.md },
  // ── Parcours (tracé + toggle 2D/3D, AMENDEMENT-25 §2) ──
  // Scène posée sur le fond : pas de card autour (le tracé EST la surface).
  routeScene: { marginTop: 18, gap: 10 },
  routeHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLabelInline: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },
  // Toggle compact (2 segments courts) — largeur au contenu, aligné à droite.
  routeToggle: { alignSelf: 'flex-end', minWidth: 132 },
  // La vue 3D occupe le même cadre 2D (aspect paysage lisible en perspective).
  route3d: { width: '100%', aspectRatio: 1.6, borderRadius: 16 },
  // ── Détail du calcul (scène dépliable) ──
  calcBlock: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    overflow: 'hidden',
  },
  calcHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  calcHeadText: { flex: 1, gap: spacing.xxs },
  calcTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  calcSub: { color: colors.gris, fontSize: fontSizes.xs },
  chevronOpen: { transform: [{ rotate: '90deg' }] },
  calcBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
    paddingTop: 16,
  },
  calcRows: { gap: 12 },
  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  calcRowLabel: {
    flex: 1,
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.35,
  },
  calcRowValue: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  calcRowValueGain: { color: gameColors.crew },
  calcDefended: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  calcDefendedText: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    lineHeight: fontSizes.sm * 1.35,
  },
  calcSchema: { alignItems: 'center', paddingVertical: 4 },
  calcNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    textAlign: 'center',
  },
  calcLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    minHeight: sizes.touchTarget,
  },
  calcLinkText: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '600' },
  // ── Sections ──
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  impactList: { gap: 10 },
  impactRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  impactIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  impactText: { flex: 1, color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.4 },
  impactTextGain: { color: colors.blanc, fontWeight: '600' },
  crewNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 14,
    fontStyle: 'italic',
  },
  // ── Segments ──
  segList: { gap: 8 },
  segRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.carbone,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
  },
  segLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm },
  segKm: { color: colors.gris, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
  segState: { fontSize: fontSizes.xs, fontWeight: '700' },
  // ── CTA ──
  ctaBlock: { gap: 10, marginTop: spacing.xl },
  primaryCta: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
