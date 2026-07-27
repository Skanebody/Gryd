/**
 * GRYD — LA MINI-CARTE de E16 (« carte », spec l.1009) et de E17 (« mini-carte
 * de la cible », spec l.1028) : le VRAI tracé, ou la phrase qui dit pourquoi il
 * n'y en a pas.
 *
 * ─── POURQUOI UNE BOUCLE ROUTÉE, ET PAS LE CONTOUR DE LA ZONE ───────────────
 * La cible d'une mission est un territoire. Le dessiner serait plus direct —
 * et interdit aujourd'hui : un territoire n'est encore stocké que comme un jeu
 * de cellules H3, et en peindre le contour reviendrait à afficher des HEXAGONES
 * (constitution §6 : « aucun hexagone visible, H3 est un index spatial
 * interne »). Le jour où la géométrie polygonale existera (lot « Géométrie
 * polygonale », backlog), cette mini-carte pourra montrer la zone elle-même.
 * D'ici là, ce qui est à la fois RÉEL et affichable, c'est l'itinéraire : une
 * boucle calculée par OSRM, rue par rue, depuis la position que l'app possède
 * DÉJÀ.
 *
 * ─── CE QU'ELLE NE FAIT JAMAIS ──────────────────────────────────────────────
 * 1. ELLE N'OUVRE AUCUNE INVITE DE LOCALISATION. Même doctrine que
 *    `MissionBriefingSheet` : on consomme la position acquise par un geste
 *    antérieur ; sans elle, on le DIT. Une boîte système à l'ouverture d'un
 *    écran est le défaut corrigé le 21/07 sur `/route-planner`.
 * 2. ELLE NE PEINT AUCUNE POLYLIGNE DÉCORATIVE. Les quatre états
 *    (`briefRouteState`, pur et testé) sont distincts et le restent : position
 *    inconnue / calcul en cours / échec réseau / tracé réel.
 * 3. ELLE NE PROMET AUCUNE CAPTURE. La boucle est une SUGGESTION ; le serveur
 *    tranche sur ce qui a été réellement couru (constitution §4).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, gameColors, radii, type Activity } from '@klaim/shared';
import { fitTracesToBox } from '../map/projectTrace';
import type { LatLngPoint } from '../map/realAnchors';
import { briefRouteState, type BriefRouteState } from '../map/zoneDecision';
import { routeLoop } from '../route/liveRouting';
import type { PlannerIntention } from '../route/types';

/** Marge interne : le tracé ne colle jamais au bord (même valeur qu'en E05). */
const PREVIEW_PAD = 14;

/**
 * Graine DÉTERMINISTE dérivée d'une chaîne stable (la clé de mission). Rouvrir
 * la même mission propose la même boucle — pas une nouvelle à chaque écran, ce
 * qui donnerait l'impression que l'app change d'avis.
 */
export function loopSeed(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) % 100_000;
  return h;
}

export interface MissionLoopInput {
  /** Position que l'app possède DÉJÀ (`null` = inconnue : aucun appel). */
  ego: LatLngPoint | null;
  /** Nom RÉEL de la cible si on en a un, sinon un libellé neutre. */
  label: string;
  /** Distance visée (km) — vient de la même source que le planificateur. */
  targetKm: number;
  intention: PlannerIntention;
  /** Clé stable de la mission (graine du tracé). */
  seedKey: string;
  /** Discipline : elle décide le profil de routage ET l'échelle des distances. */
  activity: Activity;
}

export interface MissionLoopResult {
  state: BriefRouteState;
  line: readonly LatLngPoint[] | null;
  /** Distance MESURÉE par le routeur (km) — jamais la distance demandée. */
  km: number | null;
  /** Relance manuelle après un échec réseau (jamais un retry automatique). */
  retry: () => void;
}

export function useMissionLoop({
  ego,
  label,
  targetKm,
  intention,
  seedKey,
  activity,
}: MissionLoopInput): MissionLoopResult {
  const [route, setRoute] = useState<{ line: readonly LatLngPoint[]; km: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const lat = ego?.lat ?? null;
  const lng = ego?.lng ?? null;
  const seed = useMemo(() => loopSeed(seedKey), [seedKey]);

  useEffect(() => {
    // Pas de position ⇒ AUCUN appel, et surtout aucune demande de permission.
    if (lat === null || lng === null) {
      setRoute(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const planned = await routeLoop(
        { lat, lng },
        label,
        targetKm,
        intention,
        seed,
        activity,
        controller.signal,
      ).catch(() => null);
      if (cancelled) return;
      setLoading(false);
      // `null` = OSRM/réseau muet : on n'invente pas de boucle, l'état « échec »
      // le dira (et il est DISTINCT de « pas de position »).
      setRoute(planned ? { line: planned.line, km: planned.distanceKm } : null);
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [lat, lng, targetKm, intention, seed, label, activity, attempt]);

  const retryRef = useRef(() => setAttempt((a) => a + 1));

  return {
    state: briefRouteState({
      hasPosition: ego !== null,
      loading,
      distanceKm: route?.km ?? null,
    }),
    line: route?.line ?? null,
    km: route?.km ?? null,
    retry: retryRef.current,
  };
}

/**
 * Le dessin. Projection PURE partagée avec le post-run et le partage
 * (`fitTracesToBox`) : la même forme réelle, jamais une illustration. Casing
 * sombre + cœur chartreuse — la grammaire §B de la trace héros.
 */
export function MissionLoopPreview({
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
    <View style={[styles.frame, { width, height }]}>
      <Svg width={width} height={height}>
        <Path
          d={d}
          stroke={colors.noir}
          strokeWidth={7}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d={d}
          stroke={gameColors.crew}
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radii.control,
    backgroundColor: gameColors.carbon,
    overflow: 'hidden',
  },
});
