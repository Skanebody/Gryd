/**
 * GRYD — E70 « ZONE ATTAQUÉE » (spec produit UI/UX l.2177).
 * Route : `/zone-attaquee/[contestId]`.
 *
 * ═══ CET ÉCRAN EST UNE ALERTE SUR UN FAIT SERVEUR ═══════════════════════════
 * Il ne DEVINE jamais une attaque. Son unique source est une ligne de
 * `public.territory_contests` (migration 0078), lue PAR IDENTIFIANT, dont la
 * policy `territory_contests_select_parties` décide seule si elle m'est visible.
 * Aucun état de carte, aucune course récente, aucun `territories.state` n'entre
 * dans la décision : si le fait n'arrive pas, l'écran dit qu'il n'a rien trouvé
 * (`not_found`), il ne fabrique pas une attaque de repli. La chaîne est réelle
 * de bout en bout — `ingest_run` OUVRE les contestations (`contest_wiring.ts`),
 * `resolve_due_contests` (0080) les tranche à l'échéance.
 *
 * ═══ COMMENT ON Y ENTRE ═════════════════════════════════════════════════════
 * Spec : « notification ou tap sur zone contestée ». Aujourd'hui, la porte RÉELLE
 * est le flux d'activité E69 (`/activite`) : sa ligne « À DÉFENDRE » naît de la
 * MÊME table et porte l'identifiant de la contestation. La cloche du Home
 * (`bell.ts`) allume ce flux dès qu'une contestation actionnable existe. Le tap
 * depuis la carte viendra quand la feuille de zone E14 saura remonter un
 * `contest_id` — ce n'est pas le cas, et on ne peint donc pas ce chemin.
 *
 * ═══ ORDRE DE COMPOSITION (planche E70) ═════════════════════════════════════
 *   1. barre d'en-tête : retour (cible 44×44 RÉELLE) + titre ;
 *   2. la CARTE en haut : le polygone contesté SEUL, sans fond de rues ;
 *   3. la feuille basse : titre d'alerte · rival · temps restant · surface ·
 *      couverture mesurée · l'unique CTA chartreuse `DÉFENDRE` ;
 *   4. en gris, en bas : ce qui n'existe pas encore, nommé.
 *
 * ═══ CE QUE LA PLANCHE DEMANDE ET QUE CET ÉCRAN NE PEINT PAS ════════════════
 * · « BOUCLE DE DÉFENSE ESTIMÉE ». Rien dans le dépôt ne sait produire, POUR CE
 *   POLYGONE, une distance de défense qui ne soit pas une invention. La ligne
 *   est absente, son absence est DITE (`absenceBoucleEstimee`).
 * · « ALERTER LE CREW » (secondaire). Aucune surface de l'app n'écrit dans
 *   `crew_messages` : le bouton échouerait à 100 %. Absent, et dit
 *   (`absenceAlerteCrew`). Les libellés restent au catalogue pour le jour où
 *   l'écriture existera.
 * · « NOM DE ZONE ». `territories` ne porte aucun libellé, et aucune RPC ne
 *   nomme un polygone. On ne fabrique pas un nom de quartier : la zone est
 *   identifiée par sa FORME (la carte) et sa SURFACE.
 * · LE RIVAL n'est nommé que si son profil est visible (`user_profiles`, policy
 *   0011:201). Sinon « Non public » — jamais un pseudo inventé.
 *
 * ═══ ANTI-PAY-TO-WIN, À L'ENDROIT EXACT OÙ L'ENVIE D'ACHETER NAÎT ═══════════
 * C'est l'écran le plus tentant du jeu pour vendre une protection. La ligne sous
 * le CTA dit l'inverse en toutes lettres : rebouler la zone est le SEUL moyen de
 * la garder, aucun achat ne défend un territoire. Aucun lien vers la boutique,
 * aucun « bouclier » proposé, aucun compte à rebours dramatisé.
 *
 * ═══ TON (spec) ═════════════════════════════════════════════════════════════
 * « Des faits, une échéance, une décision. Pas d'alarme anxiogène. » Le temps
 * restant est rendu en heures (ou « moins d'une heure »), jamais à la seconde,
 * jamais en rouge clignotant. Aucun palier d'urgence n'est dérivé : il
 * n'existerait dans aucune constante de jeu.
 *
 * Analytics : `screen('zone_attaquee')` au montage (nom de ROUTE, jamais le
 * pathname — le segment est un identifiant de contestation, rédigé par
 * `screenName.ts`) ; `zone_detail_viewed { state: 'contested' }` UNIQUEMENT
 * quand une zone contestée a réellement été rendue ; le CTA est un `cta_tapped`
 * via `analyticsId` (§18, décisions inscrites dans `events.ts`).
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  EVENTS,
  colors,
  fonts,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
  withAlpha,
} from '@klaim/shared';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { formatKm2For } from '../../src/ui/numberFormat';
import { goBack } from '../../src/lib/nav';
import { screen, track } from '../../src/lib/analytics';
import { useLocale, useT } from '../../src/i18n/store';
import { C } from '../../src/i18n/catalog/zoneAttaquee';
import { frameFor, type FrameRing, type MapFrame } from '../../src/features/share/mapFrame';
import { REAL_M_PER_DEG_LAT } from '../../src/features/map/realAnchors';
import { centerLatitudeOf, metersPerDegreeLng } from '../../src/features/premium/analytics/derive';
import {
  contestedZoneAnalyticsState,
  resolveContestedZone,
  type ContestedZoneView,
  type ZoneRing,
} from '../../src/features/notifications/contestedZone';
import { useContestedZone } from '../../src/features/notifications/useContestedZone';

/** m² → km². Conversion d'unités, jamais une règle de jeu. */
const M2_PER_KM2 = 1_000_000;

/**
 * La zone est CONTESTÉE : sa couleur est celle du RÔLE « contesté » (violet,
 * §C), jamais celle du crew qui l'attaque ni celle du joueur. Remplissage bas —
 * c'est le CONTOUR qui porte l'information de forme.
 */
const FILL_ALPHA = 0.18;
const STROKE_WIDTH = 1.4;

type Translate = ReturnType<typeof useT>;

export default function ZoneAttaqueeRoute() {
  const t = useT();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ contestId?: string }>();
  const contestId = (params.contestId ?? '').trim();

  const { read, reload } = useContestedZone(contestId);
  // `Date.now()` est lu UNE fois par composition et PASSÉ au moteur : l'écran
  // n'a pas d'horloge qui court, et la décision reste pure et reproductible.
  const view = useMemo<ContestedZoneView>(
    () => resolveContestedZone(read, Date.now()),
    [read],
  );

  useEffect(() => {
    screen('zone_attaquee');
  }, []);

  // §18 : on ne compte QUE ce qui a été rendu. Un chargement, une contestation
  // introuvable ou déjà tranchée ne sont pas des « détails de zone vus ».
  const analyticsState = contestedZoneAnalyticsState(view);
  useEffect(() => {
    if (analyticsState === null) return;
    track(EVENTS.zoneDetailViewed, { state: analyticsState });
  }, [analyticsState]);

  return (
    <View style={styles.root}>
      <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => goBack()}
          accessibilityRole="button"
          accessibilityLabel={t(C.backA11y)}
          hitSlop={spacing.sm}
          style={styles.back}
        >
          {/* Le tracé du chevron pointe à droite → miroir, comme StackScreen. */}
          <View style={styles.mirror}>
            <Icon name="chevron" size={iconSizes.md} color={colors.blanc} />
          </View>
        </Pressable>
        {/* §A.9 — un titre de barre n'est JAMAIS coupé par « … ». */}
        <Text style={styles.barTitle} numberOfLines={1} ellipsizeMode="clip">
          {t(C.screenTitle)}
        </Text>
      </View>

      {view.status === 'under_attack' ? (
        <UnderAttackBody view={view} locale={locale} t={t} />
      ) : (
        <StateBody view={view} onRetry={reload} t={t} />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LE SEUL ÉTAT QUI ALARME — carte en haut, feuille basse
// ═══════════════════════════════════════════════════════════════════════════

function UnderAttackBody({
  view,
  locale,
  t,
}: {
  view: Extract<ContestedZoneView, { status: 'under_attack' }>;
  locale: ReturnType<typeof useLocale>;
  t: Translate;
}) {
  const { facts } = view;

  // Le cadre se calcule sur le slot MESURÉ : sans mesure, `frameFor` retomberait
  // sur un carré et écraserait l'emprise. Tant que la mesure n'est pas arrivée,
  // on ne dessine pas — on ne devine pas une échelle.
  const [slot, setSlot] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSlot({ w: width, h: height });
  };

  const rings: ZoneRing[] = facts.rings ?? [];
  const frame = useMemo<MapFrame | null>(() => {
    if (!slot || rings.length === 0) return null;
    // La latitude de LA zone, pas un ancrage parisien figé : sinon une emprise
    // lilloise serait écrasée horizontalement.
    const lat = centerLatitudeOf(rings as FrameRing[]) ?? 0;
    return frameFor(
      rings as FrameRing[],
      slot.w / slot.h,
      metersPerDegreeLng(lat, REAL_M_PER_DEG_LAT),
      REAL_M_PER_DEG_LAT,
    );
  }, [rings, slot]);

  // Une surface qu'on ne sait pas formater est OMISE, jamais rendue en « 0 »
  // ni en « NaN » : l'absence est vraie, le zéro serait faux.
  const areaKm2 = facts.areaM2 === null ? null : formatKm2For(facts.areaM2 / M2_PER_KM2, locale);

  return (
    <>
      <View style={styles.mapSlot} onLayout={onLayout}>
        {frame ? (
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${frame.vbW} ${frame.vbH}`}
            accessibilityRole="image"
            accessibilityLabel={t(C.a11yZoneContestee)}
          >
            {rings.map((ring, i) => (
              <Path
                key={i}
                d={ringPath(ring, frame)}
                // `evenodd` : un territoire peut avoir des trous (zone privée
                // exclue, §12). Les remplir peindrait comme sien un morceau qui
                // ne l'est pas.
                fillRule="evenodd"
                fill={withAlpha(gameColors.contested, FILL_ALPHA)}
                stroke={gameColors.contested}
                strokeWidth={STROKE_WIDTH}
              />
            ))}
          </Svg>
        ) : null}
      </View>

      {/* ── La feuille basse : un fait, une échéance, une décision ───────────── */}
      <View style={styles.sheet}>
        <Text style={styles.alertTitle}>{t(C.titre)}</Text>

        {/* L'ÉCHÉANCE d'abord : c'est elle qui rend la décision urgente ou non.
            En heures, ou « moins d'une heure » — jamais un rebours à la seconde
            (le ton exigé est « pas d'alarme anxiogène »). */}
        <View style={styles.factRow}>
          <Text style={styles.factLabel}>{t(C.labelTempsRestant)}</Text>
          <Text style={styles.factValue}>
            {facts.remaining.hours >= 1
              ? t(C.restantHeures, { n: facts.remaining.hours })
              : t(C.restantMoinsUneHeure)}
          </Text>
        </View>

        {/* LE RIVAL : nommé seulement s'il a consenti (RLS `user_profiles`). */}
        <View style={styles.factRow}>
          <Text style={styles.factLabel}>{t(C.labelRival)}</Text>
          <Text style={styles.factValue}>{facts.rivalName ?? t(C.rivalInconnu)}</Text>
        </View>

        {areaKm2 !== null ? (
          <View style={styles.factRow}>
            <Text style={styles.factLabel}>{t(C.labelSurface)}</Text>
            <Text style={styles.factValue}>{`${areaKm2} km²`}</Text>
          </View>
        ) : null}

        {/* Le recouvrement est MESURÉ et persisté serveur (0078), pas estimé. */}
        {facts.overlapPercent !== null ? (
          <Text style={styles.note}>{t(C.couverture, { p: facts.overlapPercent })}</Text>
        ) : null}

        {/* Contour absent : on le DIT, sinon la carte vide passe pour une panne. */}
        {facts.rings === null ? <Text style={styles.note}>{t(C.contourAbsent)}</Text> : null}

        {/* L'UNIQUE CTA chartreuse de l'écran (§A4). Il n'est pas mort : la
            préparation d'activité avec l'objectif « défendre » existe et
            fonctionne (`/map/prepare`, E17). Elle ne cible pas encore CETTE
            zone — l'objectif est transmis, pas le polygone. */}
        <View style={styles.cta}>
          <Button
            label={t(C.ctaDefendre)}
            accessibilityLabel={t(C.a11yDefendre)}
            analyticsId="zone_attaquee_defend"
            onPress={() => router.push('/map/prepare?objective=defend')}
          />
        </View>
        {/* ANTI-PAY-TO-WIN, à l'endroit exact où l'envie d'acheter naîtrait. */}
        <Text style={styles.note}>{t(C.defendreExplication)}</Text>
        <Text style={styles.note}>{t(C.serveurDecide)}</Text>

        {/* ── Ce qui n'existe pas encore, dit à sa place ─────────────────────── */}
        <Text style={styles.absence}>{t(C.absenceBoucleEstimee)}</Text>
        <Text style={styles.absence}>{t(C.absenceAlerteCrew)}</Text>
      </View>
    </>
  );
}

/** Anneau `[lng, lat]` → commande SVG fermée, dans le cadre projeté. */
function ringPath(ring: ZoneRing, frame: MapFrame): string {
  let d = '';
  ring.forEach((point, i) => {
    const p = frame.project(point[0], point[1]);
    d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
  });
  return `${d}Z`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LES SIX AUTRES ÉTATS — aucun n'est le repli d'un autre
// ═══════════════════════════════════════════════════════════════════════════

function StateBody({
  view,
  onRetry,
  t,
}: {
  view: Exclude<ContestedZoneView, { status: 'under_attack' }>;
  onRetry: () => void;
  t: Translate;
}) {
  switch (view.status) {
    case 'loading':
      // Aucun spinner infini, aucun écran blanc : une phrase qui dit ce qui se
      // passe et n'affirme RIEN sur le territoire du joueur.
      return <Panel body={t(C.etatChargement)} />;
    case 'signed_out':
      return <Panel title={t(C.etatDeconnecteTitre)} body={t(C.etatDeconnecteCorps)} />;
    case 'not_found':
      return <Panel title={t(C.etatIntrouvableTitre)} body={t(C.etatIntrouvableCorps)} />;
    case 'not_defender':
      return <Panel title={t(C.etatPasDefenseurTitre)} body={t(C.etatPasDefenseurCorps)} />;
    case 'window_closed':
      return <Panel title={t(C.etatFenetreFermeeTitre)} body={t(C.etatFenetreFermeeCorps)} />;
    case 'closed':
      return (
        <Panel
          title={t(C.etatResolueTitre)}
          body={t(
            view.outcome === 'defended'
              ? C.etatResolueDefendue
              : view.outcome === 'transferred'
                ? C.etatResolueTransferee
                : view.outcome === 'cancelled'
                  ? C.etatResolueAnnulee
                  : // Statut ajouté par une migration future : on ne devine pas
                    // son sens, on dit qu'on ne sait pas le dire.
                    C.etatResolueCorps,
          )}
        />
      );
    case 'failed':
      return (
        <Panel title={t(C.etatEchecTitre)} body={t(C.etatEchecCorps)}>
          {/* Le seul CTA de cet état, et il n'existe QUE là où réessayer a un
              sens (§A4) — jamais en même temps que DÉFENDRE. */}
          <Button label={t(C.reessayer)} onPress={onRetry} analyticsId="zone_attaquee_retry" />
        </Panel>
      );
  }
}

function Panel({
  title,
  body,
  children,
}: {
  title?: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.stateWrap}>
      {/* Plaque de RÔLE « contesté » (violet), VIDE : aucun contour n'est
          dessiné, et on ne peint pas une emprise d'illustration à la place. */}
      <View style={styles.roleMark}>
        <Icon name="bouclier" size={iconSizes.lg} color={gameColors.contested} />
      </View>
      <View style={styles.statePanel}>
        {title !== undefined ? <Text style={styles.stateTitle}>{title}</Text> : null}
        <Text style={styles.stateBody}>{body}</Text>
      </View>
      {children !== undefined ? <View style={styles.stateCta}>{children}</View> : null}
    </View>
  );
}

const ROLE_MARK_PX = 72;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  // Cible tactile RÉELLE 44×44 (plancher a11y), pas seulement l'icône.
  back: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  barTitle: { flex: 1, color: colors.blanc, fontSize: fontSizes.md, fontFamily: fonts.displaySemi },
  mirror: { transform: [{ scaleX: -1 }] },

  // La carte occupe le haut ; la feuille prend ce qu'il lui faut.
  mapSlot: { flex: 1 },

  // Feuille basse — surface N1 unique. AUCUNE card dans une card (§A).
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  alertTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontFamily: fonts.display,
    marginBottom: spacing.xxs,
  },
  factRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  factLabel: { color: colors.gris, fontSize: fontSizes.sm },
  factValue: { color: colors.blanc, fontSize: fontSizes.sm, fontFamily: fonts.textSemi },
  cta: { marginTop: spacing.sm },
  note: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.6 },
  absence: { color: colors.grisFaible, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.6 },

  // Les états sans carte occupent la place de la carte : l'écran ne se vide
  // pas, il DIT quelque chose.
  stateWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  roleMark: {
    width: ROLE_MARK_PX,
    height: ROLE_MARK_PX,
    borderRadius: ROLE_MARK_PX / 2,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(gameColors.contested, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(gameColors.contested, 0.4),
  },
  statePanel: {
    backgroundColor: withAlpha(colors.blanc, 0.04),
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  stateTitle: { color: colors.blanc, fontSize: fontSizes.md, fontFamily: fonts.display },
  stateBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.6 },
  stateCta: { marginTop: spacing.xxs },
});
