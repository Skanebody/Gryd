/**
 * GRYD — TERRITOIRE DU RÉSULTAT (planche E09, §25 pic peak-end). Le VRAI
 * parcours couru se DESSINE à l'ouverture de l'écran, la « plume » avançant
 * jusqu'au point d'arrivée — qui, sur une boucle fermée, revient sur le départ :
 * la fermeture se VOIT. Le composant est monté DANS le hero (`ResultReveal
 * haptic="success"`), donc le dessin démarre exactement à l'instant du retour
 * haptique de validation — on renforce le pic, on ne s'y substitue pas.
 *
 * Il rend le HERO CARTE 44 % de la planche : le tracé mesuré PLUS les cellules
 * réellement décidées par le serveur, avec la bascule « Avant ⇄ Après ».
 *
 * Rendu SVG (react-native-svg) → visible en preview web ET natif. Le dessin
 * progressif réutilise `tracePrefix` (features/map/projectTrace), sous-polyligne
 * fiable natif + react-native-web (contrairement à strokeDashoffset). Piloté par
 * une Animated.Value à listener JS (même patron que `useCountUp`) : reduce motion
 * → tracé complet d'emblée, aucun mouvement.
 *
 * HONNÊTE : ne rend RIEN sans géométrie réelle (jamais un segment fabriqué, ni
 * un cadre vide). Le halo de fermeture n'est renforcé QUE si le SERVEUR a jugé
 * la boucle fermée (`loopClosed`) — jamais une fermeture déduite d'une
 * géométrie approximative.
 * Aucune donnée d'authoring : c'est la trace mesurée du coureur, et rien d'autre.
 * PUR d'i18n : le libellé accessible arrive en prop, résolu par l'écran.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { cellToBoundary } from 'h3-js';
import { colors, motion } from '@klaim/shared';
import { fitTracesToBox, tracePrefix } from '../map/projectTrace';
import { territoryStyle, traceStyle, withAlpha } from '../map/mapStyle';
import { useReduceMotion } from '../../ui/game/anim';
import type { LatLngPoint } from '../map/realAnchors';

// ─── `ResultTrace` (VIGNETTE 260 × 92) SUPPRIMÉ — recalage E09, 25/07/2026 ───
// Il rendait le tracé dans une petite vignette large-et-courte AU MILIEU du
// hero, sous le KPI. La planche E09 demande l'inverse : le territoire d'abord,
// en HERO à 44 % de la hauteur, avec la bascule « Avant ⇄ Après ». Une vignette
// et un hero carte au même endroit auraient dit deux fois la même chose, la
// petite version affaiblissant la grande (§A r.1). Tout ce qu'il faisait bien —
// dessin progressif par sous-polyligne, casing + core §B, halo de fermeture
// conditionné au verdict serveur, reduce motion → état final — est repris tel
// quel par `ResultHeroMap` ci-dessous.

// ═══ E09 — HERO CARTE 44 % AVEC BASCULE « AVANT ⇄ APRÈS » ═══════════════════
//
// La planche impose l'IMPACT TERRITORIAL avant les métriques sportives : un hero
// carte à 44 % de la hauteur, et une bascule « Avant ⇄ Après » à **caméra et
// zoom STRICTEMENT identiques**. C'est la contrainte cardinale : deux cadrages
// différents feraient mentir la comparaison (une zone « qui grandit » ne serait
// qu'un zoom). Ici la projection est calculée UNE FOIS sur l'union
// tracé + toutes les cellules, puis PARTAGÉE par les deux états — la bascule ne
// touche QUE des opacités de remplissage, jamais le cadrage.
//
// ─── CE QUE CHAQUE ÉTAT A LE DROIT DE MONTRER ──────────────────────────────
// Le serveur ne renvoie AUCUN état antérieur du territoire (`beforeState` est
// armé à `null` côté Résultat, cf. templates.tsx). La seule chose qu'il dise du
// PASSÉ, c'est l'outcome `defended` : une zone défendue était déjà à moi AVANT
// cette course. D'où :
//   · AVANT  = uniquement les cellules `defended` (verdict serveur) ;
//   · APRÈS  = celles-là PLUS les cellules réellement prises (claimed/stolen).
// Rien d'autre n'est dessiné. Si le serveur n'a rendu aucune cellule (hors-ligne,
// verdict en attente), l'écran ne propose PAS de bascule : on ne compare pas un
// « avant » qu'on aurait inventé.

/** Cellules H3 d'un état de territoire, telles que le serveur les a décidées. */
export interface HeroCells {
  /** Déjà à moi AVANT la course (outcome `defended`). */
  readonly held: readonly string[];
  /** PRISES par cette course (claimed_neutral / stolen / pionnier). */
  readonly gained: readonly string[];
}

/**
 * Plafond de rendu (§C scalabilité) : au-delà, on ne dessine pas 5 000 polygones
 * dans une vignette de 44 % d'écran — ils seraient de toute façon illisibles à
 * cette échelle. Le CHIFFRE, lui, reste le total exact du verdict serveur : ce
 * plafond borne le DESSIN, jamais ce que l'écran affirme.
 */
const HERO_CELLS_MAX = 600;

/** Marge intérieure du hero : le territoire ne touche jamais le bord du cadre. */
const HERO_PAD = 18;

/** Contour d'une cellule H3 en lat/lng (h3-js rend [lat, lng]). */
function cellRing(h3: string): LatLngPoint[] {
  try {
    return cellToBoundary(h3).map(([lat, lng]) => ({ lat, lng }));
  } catch {
    // Index invalide (skew serveur / donnée corrompue) : on ne dessine rien
    // plutôt que de faire tomber tout l'écran de résultat.
    return [];
  }
}

/** Un seul `Path` pour N cellules (sous-chemins « M…Z ») — 1 nœud SVG, pas N. */
function cellsPath(
  cells: readonly string[],
  project: (p: LatLngPoint) => { x: number; y: number },
): string {
  let d = '';
  for (const h3 of cells) {
    const ring = cellRing(h3);
    if (ring.length < 3) continue;
    ring.forEach((p, i) => {
      const { x, y } = project(p);
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    d += ' Z';
  }
  return d;
}

export interface ResultHeroMapProps {
  /** Tracé MESURÉ de la course (vue locale du coureur, non trimée). */
  points: readonly { lat: number; lng: number }[];
  /** Cellules décidées SERVEUR. `held`/`gained` vides = rien à remplir. */
  cells: HeroCells;
  /** Le SERVEUR a jugé la boucle fermée (renforce la plume d'arrivée). */
  loopClosed: boolean;
  /** `true` = état AVANT (press-and-hold) — même caméra, remplissage réduit. */
  showBefore: boolean;
  /**
   * Dimensions du hero (44 % de la hauteur d'écran), passées par l'écran plutôt
   * que mesurées : la viewBox doit être connue AU PREMIER rendu, sinon la carte
   * apparaît vide une frame puis saute — exactement le genre de saut que la
   * comparaison Avant/Après ne peut pas se permettre.
   */
  width: number;
  height: number;
  /** Le tracé se dessine à l'ouverture (coupé si reduce motion). */
  animated: boolean;
  accessibilityLabel: string;
}

/**
 * Hero carte du Résultat : territoire réellement décidé par le serveur + tracé
 * réellement couru. Ne rend RIEN sans tracé ni cellule (l'écran dit alors ce
 * qu'il sait ailleurs) — jamais un cadre vide, jamais une géométrie d'authoring.
 */
export function ResultHeroMap({
  points,
  cells,
  loopClosed,
  showBefore,
  width,
  height,
  animated,
  accessibilityLabel,
}: ResultHeroMapProps) {
  const reduce = useReduceMotion();
  const play = animated && !reduce;
  const anim = useRef(new Animated.Value(play ? 0 : 1)).current;
  const [progress, setProgress] = useState(play ? 1 : 1);

  useEffect(() => {
    if (!play) {
      setProgress(1);
      return;
    }
    setProgress(0);
    const id = anim.addListener(({ value }) => setProgress(value));
    anim.setValue(0);
    const run = Animated.timing(anim, {
      toValue: 1,
      duration: motion.traceDrawMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // listener JS : pilote une sous-polyligne, pas un style natif
    });
    run.start();
    return () => {
      anim.removeListener(id);
      run.stop();
    };
  }, [play, anim]);

  // Bornage §C : on dessine au plus HERO_CELLS_MAX cellules par couche.
  const held = useMemo(() => cells.held.slice(0, HERO_CELLS_MAX), [cells.held]);
  const gained = useMemo(() => cells.gained.slice(0, HERO_CELLS_MAX), [cells.gained]);

  // ─── LA BBOX : CALCULÉE UNE FOIS, PARTAGÉE PAR LES DEUX ÉTATS ─────────────
  // `showBefore` n'entre PAS dans ces dépendances, et c'est tout l'enjeu : la
  // caméra ne peut structurellement pas bouger entre « avant » et « après ».
  const geo = useMemo(() => {
    const rings = [...held, ...gained].map(cellRing).filter((r) => r.length >= 3);
    const traces = points.length >= 2 ? [points] : [];
    if (traces.length === 0 && rings.length === 0) return null;
    const proj = fitTracesToBox([...traces, ...rings], width, height, HERO_PAD);
    return {
      proj,
      heldPath: cellsPath(held, proj.project),
      gainedPath: cellsPath(gained, proj.project),
    };
  }, [points, held, gained, width, height]);

  // Rien de mesuré ET rien de jugé : aucun dessin (l'écran ne fabrique rien).
  if (!geo) return null;

  const drawn = points.length >= 2 ? tracePrefix(points, progress) : [];
  const poly = geo.proj.points(drawn);
  const tip = drawn[drawn.length - 1];
  const head = tip ? geo.proj.project(tip) : null;
  const closed = progress >= 1 && loopClosed;
  // « Avant » : le territoire pris par CETTE course s'efface (opacité 0) ; les
  // zones déjà tenues restent. Les deux couches existent toujours dans le DOM
  // SVG — seule l'opacité change, donc aucun re-cadrage possible.
  const gainedOpacity = showBefore ? 0 : 1;

  return (
    <View
      style={[styles.heroWrap, { width, height }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Zones DÉJÀ tenues avant la course (outcome `defended`) — présentes
            dans les deux états : c'est ce qui n'a pas changé. */}
        {geo.heldPath ? (
          <Path
            d={geo.heldPath}
            fill={territoryStyle.crewFill}
            stroke={territoryStyle.crewStroke}
            strokeWidth={0.6}
            fillOpacity={showBefore ? 1 : 0.55}
            strokeOpacity={showBefore ? 1 : 0.5}
          />
        ) : null}
        {/* Zones PRISES par cette course — la différence, et rien d'autre. */}
        {geo.gainedPath ? (
          <Path
            d={geo.gainedPath}
            fill={territoryStyle.crewFill}
            stroke={territoryStyle.crewStroke}
            strokeWidth={0.9}
            opacity={gainedOpacity}
          />
        ) : null}

        {/* §B — casing sombre puis core chartreuse, joints/bouts arrondis. */}
        {poly ? (
          <>
            <Polyline
              points={poly}
              stroke={traceStyle.casing}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <Polyline
              points={poly}
              stroke={traceStyle.core}
              strokeWidth={2.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              // « Avant » atténue le tracé : la course n'avait pas encore eu lieu.
              opacity={showBefore ? 0.35 : 1}
            />
          </>
        ) : null}

        {head && !showBefore ? (
          <>
            <Circle
              cx={head.x}
              cy={head.y}
              r={closed ? 8 : 6}
              fill={withAlpha(colors.chartreuse, closed ? 0.3 : 0.18)}
            />
            <Circle cx={head.x} cy={head.y} r={3} fill={colors.chartreuse} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  // Hero : la carte FLOTTE sur le noir (aucune card autour — §A, pas de
  // card-dans-card). Le clipping évite qu'une cellule déborde du cadre.
  heroWrap: { alignSelf: 'center', overflow: 'hidden' },
});
