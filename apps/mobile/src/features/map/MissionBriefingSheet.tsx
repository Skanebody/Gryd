/**
 * GRYD — E05 « BRIEFING DE MISSION ». Transformer une INTENTION (« reprendre
 * cette zone », décidée en E04) en objectif concret SANS formulaire : kicker +
 * titre + ✕, aperçu du tracé recommandé + « Ajuster », UN SEUL bloc de
 * métriques à séparateurs, une phrase de valeur tactique, puis le CTA.
 *
 * Son unique porte d'entrée est le CTA « Reprendre » de la sheet de zone : la
 * ligne mission du haut vit dans app/(tabs)/index.tsx (composition figée) et
 * garde sa propre entrée vers le planificateur.
 *
 * ─── CE QUE CET ÉCRAN NE FAIT PAS, ET POURQUOI ─────────────────────────────
 * 1. IL N'OUVRE JAMAIS L'INVITE DE LOCALISATION. On consomme la position que la
 *    carte possède DÉJÀ (`egoPos`, acquise par un geste : Recentrer ou le
 *    premier GO). Sans elle, on le DIT et on renvoie vers le planificateur, où
 *    la demande naît d'un geste. Ouvrir la boîte système à l'ouverture d'une
 *    sheet réintroduirait exactement le défaut corrigé le 21/07 sur
 *    /route-planner (cf. son en-tête).
 * 2. IL NE PEINT AUCUNE POLYLIGNE DÉCORATIVE. La mini-carte n'affiche que le
 *    VRAI tracé OSRM, rue par rue. Les trois autres états (position inconnue /
 *    calcul en cours / échec réseau) ont chacun leur phrase, distincte — un
 *    joueur hors ligne ne doit jamais voir une boucle qui n'a pas été calculée.
 * 3. IL NE PROMET RIEN QUE L'ÉCRAN SUIVANT NE TIENNE. `/course-live` ignore
 *    volontairement tout paramètre d'objectif : la course qui démarre est une
 *    course LIBRE dont le serveur classera la capture APRÈS coup. La phrase de
 *    valeur tactique le dit mot pour mot plutôt que de laisser croire à un
 *    guidage sur le tracé.
 *
 * ─── LA DISCIPLINE (E14, 26/07/2026) ───────────────────────────────────────
 * Ce briefing est redevenu atteignable en lentille VÉLO le 26/07 (le tap de
 * zone y a été réarmé). Il partait alors avec DEUX défauts jumeaux :
 *   · son aperçu routait au profil PIÉTON, sur une distance de coureur — soit
 *     une boucle sous le périmètre minimal d'une boucle vélo (5 000 m), donc
 *     INCAPTURABLE : un tracé qu'on ne peut ni suivre ni faire compter ;
 *   · son CTA poussait `/course-live?mode=conquete` SANS déclaration, donc
 *     enregistrait une course à pied à quelqu'un qui préparait une sortie vélo.
 * Les deux se corrigent par la même prop : `activity`. Elle décide le profil de
 * routage, les distances proposées, ce qui est ÉCRIT dans le kicker, et la
 * déclaration portée par la cible de départ (`missionStartHref`).
 *
 * MÉTRIQUES : la planche en montre quatre. Une seule a une source — la distance
 * MESURÉE par OSRM. Durée (allure fixe), gain de surface (le serveur tranche
 * après la course) et difficulté (trois seuils de km non traduits) sont
 * supprimées : cf. `briefMetricKeys` et ses tests.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
// `sizes` : le plancher tactile du projet. Il était recopié en 44 dans deux
// styles de ce fichier — §A demande le TOKEN, jamais le nombre (un plancher
// recopié ne bouge pas avec la charte, et rien ne le relie au gabarit).
import { colors, fontSizes, gameColors, iconSizes, radii, sizes, typography, type Activity } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { C as M } from '../../i18n/catalog/mission';
import { C } from '../../i18n/catalog/map';
import { ACTIVITY_NAME } from '../../i18n/catalog/runGps';
import { ACTIVITY_LABELS } from '../../ui/activityLens';
import { useLocale, useT } from '../../i18n/store';
import type { Locale } from '../../i18n/types';
import { screen } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { routeLoop } from '../route/liveRouting';
import { useRouteSuggestion } from '../route/useRouteSuggestion';
import type { LatLngPoint } from './realAnchors';
import { fitTracesToBox } from './projectTrace';
import { SheetMetrics, type SheetMetric } from './SheetMetrics';
import {
  BRIEF_PREVIEW_H,
  briefMetricKeys,
  briefRouteState,
  distanceStatParts,
  type BriefRouteState,
} from './zoneDecision';

/** Marge interne de la mini-carte (le tracé ne colle jamais au bord). */
const PREVIEW_PAD = 14;
/** Marges horizontales de `styles.info` — la mini-carte occupe le reste. */
const SHEET_H_PADDING = 16;

/** « 4,2 km » — virgule décimale sauf en anglais (même règle que le reste). */
function formatKm(km: number, locale: Locale): string {
  const fixed = km.toFixed(1);
  return `${locale === 'en' ? fixed : fixed.replace('.', ',')} km`;
}

export interface MissionBriefingSheetProps {
  /** Territoire visé (clé de territoire) — sert de graine déterministe au tracé. */
  zoneId: string;
  /** Nom RÉEL du quartier si le géocodage inverse en a rendu un, sinon null. */
  zoneName: string | null;
  /**
   * Position du joueur telle que la CARTE la connaît déjà. `null` = inconnue :
   * on ne route pas, et on ne demande rien à l'OS (cf. en-tête).
   */
  egoPos: LatLngPoint | null;
  /** ✕ — revient à la sheet de zone (E04), pas à la carte nue : le briefing est
   *  une étape DANS la décision de zone, ✕ recule d'un cran. */
  onClose: () => void;
  /** « Ajuster » / repli sans position → planificateur d'itinéraire réel. */
  onOpenPlanner: () => void;
  /** CTA — démarre la sortie de conquête (dans la discipline déclarée ci-dessous). */
  onStart: () => void;
  /**
   * Discipline de la LENTILLE d'où vient ce briefing. Elle n'est pas
   * décorative : elle décide le profil de routage de l'aperçu, l'échelle des
   * distances proposées, et ce que le CTA va déclarer à `/course-live`.
   * Obligatoire — un défaut silencieux ici, c'est le tracé piéton rendu à un
   * cycliste que ce chantier supprime.
   */
  activity: Activity;
  /**
   * État du tracé remonté au parent : c'est lui qui dimensionne la sheet, et il
   * ne peut pas le deviner (le routage vit ici). Appelé à chaque transition,
   * jamais par frame.
   */
  onStateChange?: (state: BriefRouteState) => void;
  /**
   * OBJECTIF du briefing (E22, 26/07/2026). `conquest` (défaut) = « Reprendre »
   * de E04, comportement inchangé. `defense` = arrivé par DÉFENDRE de E22 : il
   * change trois choses, et TROIS SEULEMENT — le kicker devient « DÉFENSE » (label
   * planche), la boucle est routée en intention `defendre`, et la phrase tactique
   * dit la défense. Le CTA et le reste sont identiques : la course qui démarre
   * reste LIBRE, et le serveur classe la défense APRÈS coup (jamais promise ici).
   */
  objective?: 'conquest' | 'defense';
}

export function MissionBriefingSheet({
  zoneId,
  zoneName,
  egoPos,
  onClose,
  onOpenPlanner,
  onStart,
  onStateChange,
  activity,
  objective = 'conquest',
}: MissionBriefingSheetProps) {
  const t = useT();
  const locale = useLocale();
  const isDefense = objective === 'defense';
  const { width: winW } = useWindowDimensions();
  /**
   * Distance à proposer + provenance : la MÊME source que le planificateur, et
   * bornée à la MÊME discipline — sans quoi l'aperçu proposerait ici une boucle
   * que le planificateur refuserait deux écrans plus loin.
   */
  const { suggestion } = useRouteSuggestion(activity);
  const [route, setRoute] = useState<{ line: readonly LatLngPoint[]; km: number } | null>(null);
  const [loading, setLoading] = useState(false);
  /** Relance manuelle après un échec réseau (jamais un retry automatique). */
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    screen('map_mission_brief', { zone: zoneId });
  }, [zoneId]);

  // Graine DÉTERMINISTE dérivée du territoire : rouvrir le briefing de la même
  // zone propose la même boucle, pas une nouvelle à chaque tap.
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < zoneId.length; i += 1) h = (h * 31 + zoneId.charCodeAt(i)) % 100_000;
    return h;
  }, [zoneId]);

  const originLat = egoPos?.lat ?? null;
  const originLng = egoPos?.lng ?? null;
  const targetKm = suggestion.km;
  const label = zoneName ?? t(C.zoneFallback);

  useEffect(() => {
    // Pas de position ⇒ AUCUN appel, et surtout aucune demande de permission.
    if (originLat === null || originLng === null) {
      setRoute(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const planned = await routeLoop(
        { lat: originLat, lng: originLng },
        label,
        targetKm,
        // DÉFENSE (E22) : la boucle est routée en intention `defendre` — elle vise
        // à re-couvrir SA zone, pas à sortir en conquérir. Conquête sinon (E04).
        isDefense ? 'defendre' : 'conquerir',
        seed,
        activity,
        controller.signal,
      ).catch(() => null);
      if (cancelled) return;
      setLoading(false);
      // `null` = réseau/OSRM muet : on n'invente pas de boucle, l'état « échec »
      // le dira (et il est distinct de « pas de position »).
      setRoute(planned ? { line: planned.line, km: planned.distanceKm } : null);
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [originLat, originLng, targetKm, seed, label, attempt, activity]);

  const state = briefRouteState({
    hasPosition: egoPos !== null,
    loading,
    distanceKm: route?.km ?? null,
  });

  // Remontée de l'état au parent (dimensionnement de la sheet). Callback lue par
  // ref : le parent peut la redéfinir à chaque rendu sans relancer l'effet.
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  useEffect(() => {
    onStateChangeRef.current?.(state);
  }, [state]);

  const metrics: readonly SheetMetric[] = briefMetricKeys(state).map((key) => {
    // « 4,2 » (gros) + « km » (petit) : la composition « grand nombre + petite
    // unité » de la planche, via le même formateur PUR que la sheet de zone.
    const { value, unit } = distanceStatParts(route?.km ?? 0, locale);
    return { key, value, unit, label: t(M.briefMetricDistance) };
  });

  const previewW = Math.max(120, winW - SHEET_H_PADDING * 2);

  return (
    <View style={styles.info}>
      {/* ── Kicker + titre + ✕ (planche E05) ── */}
      <View style={styles.head}>
        <View style={styles.pastille} />
        {/* CE QUI VA ÊTRE ENREGISTRÉ, dit dès le sur-titre — le libellé est
            l'INVARIANT du commutateur de la Carte (RUN / BIKE), donc identique
            dans les cinq langues. `adjustsFontSizeToFit` garantit §A9 aux
            tailles système agrandies : deux mots courts, jamais coupés. */}
        <Text style={styles.kicker} numberOfLines={1} adjustsFontSizeToFit>
          {`${t(isDefense ? C.defenseBriefKicker : M.briefKicker)} · ${ACTIVITY_LABELS[activity]}`}
        </Text>
        <View style={styles.spacer} />
        {/* ✕ DANS UN DISQUE (planche E05, comme E04) — icône plutôt que texte. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(M.briefCloseA11y)}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            onClose();
          }}
          style={({ pressed }) => [styles.closeCircle, pressed && styles.pressed]}
          testID="brief-close"
        >
          <Icon name="fermer" size={iconSizes.sm} color={colors.gris} />
        </Pressable>
      </View>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
        {zoneName ? t(M.briefTitleNamed, { zone: zoneName }) : t(M.briefTitle)}
      </Text>

      {/* ── Aperçu du tracé : le VRAI tracé, ou l'état qui dit pourquoi il n'y
          en a pas. Jamais de boucle décorative. ── */}
      {state === 'ready' && route ? (
        <View
          style={[styles.preview, { width: previewW }]}
          accessibilityRole="image"
          accessibilityLabel={t(M.briefRouteA11y, { km: formatKm(route.km, locale) })}
          testID="brief-route-preview"
        >
          <RoutePreview line={route.line} width={previewW} height={BRIEF_PREVIEW_H} />
        </View>
      ) : (
        <View style={styles.stateBlock} testID={`brief-route-${state}`}>
          {state === 'loading' ? (
            <ActivityIndicator size="small" color={colors.gris} />
          ) : null}
          <Text style={styles.stateText} numberOfLines={2}>
            {t(
              state === 'no-position'
                ? M.briefRouteNoPosition
                : state === 'loading'
                  ? M.briefRouteLoading
                  : M.briefRouteFailed,
            )}
          </Text>
        </View>
      )}

      {/* Action du bloc d'aperçu — UN LIEN, jamais un 2ᵉ bouton plein (§A.4), et
          il nomme la sortie qui débloque RÉELLEMENT l'état courant :
            · tracé prêt      → « Ajuster » (le planificateur reprend la main) ;
            · échec réseau    → « Réessayer » (on relance le calcul, ici même) ;
            · position inconnue → « Planifier ce parcours » : il n'y a rien à
              ajuster, il y a une position à obtenir — et c'est le planificateur
              qui la demande, SUR UN GESTE.
          Rien pendant le calcul : un lien qui changerait d'objet en cours de
          route serait un piège sous le pouce. */}
      {state === 'loading' ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            state === 'failed'
              ? t(M.briefRetry)
              : state === 'no-position'
                ? t(M.missionPlanA11y)
                : t(M.briefAdjustA11y)
          }
          hitSlop={8}
          onPress={() => {
            haptics.light();
            if (state === 'failed') {
              setAttempt((a) => a + 1);
              return;
            }
            onOpenPlanner();
          }}
          style={({ pressed }) => [styles.linkHit, pressed && styles.pressed]}
          testID="brief-adjust"
        >
          <Text style={styles.link} numberOfLines={1}>
            {state === 'failed'
              ? t(M.briefRetry)
              : state === 'no-position'
                ? t(M.missionPlan)
                : t(M.briefAdjust)}
          </Text>
        </Pressable>
      )}

      {/* ── UN SEUL bloc de métriques à séparateurs (jamais 4 cards) ── */}
      <SheetMetrics metrics={metrics} testID="brief-metrics" />

      {/* ── Phrase de valeur tactique : neutre, non dramatisée, et VRAIE. En
          DÉFENSE (E22), elle dit la défense (refermer sa boucle, validée après). ── */}
      <Text style={styles.tactical} numberOfLines={3}>
        {t(isDefense ? C.defenseBriefTactical : M.briefTactical)}
      </Text>

      {/* ── CTA unique (GO reste retiré tant que ce sheet est ouvert) ── */}
      <Pressable
        accessibilityRole="button"
        // L'a11y est COMPOSÉE, jamais prise dans une phrase toute faite : le
        // geste (`briefStart`) puis LA DISCIPLINE, comme le GO de la Carte —
        // « Commencer la mission — sortie vélo ». L'ancienne clé figée disait
        // « démarrer une course de conquête », fausse au mot près sous lentille
        // vélo ; elle a été SUPPRIMÉE du catalogue le 26/07/2026, pas seulement
        // délaissée (cf. `i18n/catalog/mission.ts`, qui en garde le motif). Ne
        // pas la réintroduire : une phrase accessible qui nomme la course est un
        // mensonge lu à voix haute.
        accessibilityLabel={`${t(M.briefStart)} — ${t(ACTIVITY_NAME[activity])}`}
        onPress={() => {
          haptics.medium();
          onStart();
        }}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        testID="brief-start"
      >
        <Text style={styles.ctaLabel} numberOfLines={1} adjustsFontSizeToFit>
          {t(M.briefStart)}
        </Text>
      </Pressable>
      {/* Microtexte FACTUEL : la position est acquise AVANT le préflight, c'est
          l'enregistrement qui part au dernier palier du décompte. */}
      <Text style={styles.micro} numberOfLines={1} adjustsFontSizeToFit>
        {t(M.briefStartMicro)}
      </Text>
    </View>
  );
}

/**
 * Mini-carte du tracé : projection PURE partagée avec le post-run et le partage
 * (`fitTracesToBox`) — la même forme réelle, jamais un dessin d'illustration.
 * Casing sombre + cœur chartreuse, la grammaire §B de la trace héros.
 */
function RoutePreview({
  line,
  width,
  height,
}: {
  line: readonly LatLngPoint[];
  width: number;
  height: number;
}) {
  const d = useMemo(
    () => fitTracesToBox([line], width, height, PREVIEW_PAD).path(line),
    [line, width, height],
  );
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={colors.noir} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path
        d={d}
        stroke={gameColors.crew}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // Contenu posé DIRECTEMENT sur la sheet : aucune sous-card (§A).
  info: { paddingHorizontal: SHEET_H_PADDING, paddingBottom: 12, gap: 6 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Pastille chartreuse : c'est MA mission (rôle §C), pas la zone rivale.
  pastille: { width: 10, height: 10, borderRadius: 5, backgroundColor: gameColors.crew },
  kicker: {
    color: gameColors.crew,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2, // interlettrage de la planche (rôle `typography.kicker`)
  },
  spacer: { flex: 1 },
  // ✕ dans un DISQUE (planches E04/E05) — même traitement que la sheet de zone.
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  // Titre HÉROS de la planche (`typography.title`, 28 px, Inter Tight 700) — et
  // non plus un titre de 16 px : « Reprenez Saint-Rémy » domine comme en E05.
  title: {
    ...typography.title,
    color: colors.blanc,
    marginTop: 4,
  },

  preview: {
    height: BRIEF_PREVIEW_H,
    borderRadius: radii.control,
    backgroundColor: gameColors.carbon,
    overflow: 'hidden',
  },
  // État d'absence : une PHRASE, pas une carte vide qui se lirait comme un bug.
  stateBlock: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: sizes.touchTarget },
  stateText: { flex: 1, color: colors.gris, fontSize: 12.5, fontWeight: '600' },

  linkHit: { minHeight: sizes.touchTarget, justifyContent: 'center', alignSelf: 'flex-start' },
  link: { color: colors.gris, fontSize: 13, textDecorationLine: 'underline' },

  tactical: { color: colors.blanc, fontSize: 12.5, fontWeight: '600', marginTop: 2 },

  cta: {
    marginTop: 12,
    height: 54, // hauteur mesurée sur la planche (-selection11), pill
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  // Libellé NOIR sur chartreuse — jamais de chartreuse sur fond clair (charte).
  // CAPITALES (planche -selection11 « COMMENCER LA MISSION », et convention des
  // CTA GRYD — cf. `ui/Button.tsx` primaryLabel). La chaîne source reste en
  // casse mixte : `textTransform` n'agit qu'au rendu, le lecteur d'écran lit
  // « Commencer la mission » composé avec la discipline (L348).
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800', textTransform: 'uppercase' },
  // Microtexte CENTRÉ sous le CTA (planche) : « Le GPS démarre après le compte
  // à rebours. » — factuel, discret, jamais tronqué.
  micro: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 6, textAlign: 'center' },
});
