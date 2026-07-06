/**
 * GRYD — on-ramp « capture depuis run synchronisé », version DÉMO (AMENDEMENT-30
 * §2, stratégie §6). « Tu ne dois pas courir dans GRYD. Cours comme tu veux —
 * GRYD transforme ta course en conquête. » Ici on SIMULE l'import d'un run
 * récent (Apple Health / Strava — libellés depuis sources/catalog) : détection →
 * nettoyage → boucle → 1re zone capturée EN SECONDES → moment signature.
 *
 * CÂBLÉ DÉMO (l'intention est réelle) : le backend prod = `strava_import`
 * (déployé, prêt-à-clés O7) + HealthKit (O8, dev build). Aucun réseau, aucun
 * SDK ici — un déroulé scénarisé déterministe, comme les autres demo.ts. Le
 * client n'attribue JAMAIS un hex pour de vrai ; « estimé » partout, le serveur
 * (ingest_run) reste seul décideur en prod. Les zones affichées sont des
 * DONNÉES DÉMO (comme « +214 » du doc §10), pas des règles de jeu.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useReduceMotion } from '../../ui/game';
import type { IconName } from '@klaim/shared';

/** Sources synchronisables mises en scène (libellés = sources/catalog). */
export type SyncSourceKey = 'apple_health' | 'strava';

export interface SyncSourceDef {
  key: SyncSourceKey;
  /** Libellé visible (identique à VERIFY_SOURCES). */
  name: string;
  icon: IconName;
  /** Niveau de confiance résumé (copy A-10 §6 : Apple = élevé, Strava = moyen). */
  trust: string;
}

/**
 * Deux sources proposées à l'étape 4a. Ordre : santé OS d'abord (trust élevé),
 * puis Strava (trust moyen — vérif requise). Miroir de sources/catalog, mais
 * réduit aux DEUX branchées en démo (les montres restent « Bientôt » ailleurs).
 */
export const SYNC_SOURCES: readonly SyncSourceDef[] = [
  { key: 'apple_health', name: 'Apple Health', icon: 'lien', trust: 'Trust élevé' },
  { key: 'strava', name: 'Strava', icon: 'route', trust: 'Trust moyen' },
] as const;

/** Retrouve la définition d'une source (défaut Apple Health — jamais de crash). */
export function syncSource(key: SyncSourceKey): SyncSourceDef {
  return SYNC_SOURCES.find((s) => s.key === key) ?? SYNC_SOURCES[0]!;
}

// ─── Phases du pipeline (miroir démo du pipeline réel §6) ────────────────────

/**
 * Étapes visibles de l'import (le même pipeline que le run in-app, §6 :
 * nettoyage → boucle → polygone → attribution). Chaque phase a un libellé de
 * jeu COURT (jamais tronqué, §A9) et une part du temps total.
 */
export type SyncPhase = 'detect' | 'clean' | 'loop' | 'capture' | 'done';

export interface SyncPhaseDef {
  key: SyncPhase;
  /** Libellé de l'étape en cours (présent progressif — « on fait »). */
  label: string;
  /** Fin de la phase, en fraction 0..1 du déroulé. */
  until: number;
}

/**
 * Séquence temporelle de l'import démo. Volontairement RAPIDE (« 1re zone en
 * secondes », §2) : le run est déjà couru, GRYD ne fait que le transformer. Les
 * bornes `until` découpent une progression 0..1 unique (useSyncDemo).
 */
export const SYNC_PHASES: readonly SyncPhaseDef[] = [
  { key: 'detect', label: 'Run détecté', until: 0.22 },
  { key: 'clean', label: 'Nettoyage du tracé', until: 0.52 },
  { key: 'loop', label: 'Boucle reconnue', until: 0.8 },
  { key: 'capture', label: 'Zone capturée', until: 1 },
] as const;

/** Phase active à la progression p (0..1). `done` une fois p complet. */
export function syncPhaseAt(p: number): SyncPhase {
  if (p >= 1) return 'done';
  for (const ph of SYNC_PHASES) {
    if (p < ph.until) return ph.key;
  }
  return 'capture';
}

/** Index de la phase active (0-based) — pour la liste d'étapes cochées. */
export function syncPhaseIndex(p: number): number {
  const key = syncPhaseAt(p);
  if (key === 'done') return SYNC_PHASES.length;
  return SYNC_PHASES.findIndex((ph) => ph.key === key);
}

// ─── Données démo du run importé (cohérentes avec l'écosystème demo) ─────────

/**
 * Le run importé mis en scène. Distance/allure = un run « déjà couru »
 * plausible ; `zones` = zones estimées capturées (donnée démo, pas une règle).
 * Cohérent avec le vocabulaire de la boucle (AMENDEMENT-12 : « dont N en boucle »).
 * Zone nommée reprise de l'écosystème Paris (course-result : « Paris Est »).
 */
export const SYNC_DEMO_RUN = {
  /** Distance du run importé (m) — « 6,4 km ». */
  distanceM: 6_400,
  /** Allure moyenne (s/km) — « 5'42 ». */
  paceSPerKm: 342,
  /** Il y a combien de temps (copy « ce matin »). */
  whenLabel: 'ce matin',
  /** Zones totales estimées capturées à la fermeture. */
  zones: 47,
  /** Dont N à l'intérieur de la boucle (le reste = couloir du tracé). */
  enclosedZones: 29,
  /** Quartier pris (démo — cohérent Paris). */
  zoneName: 'Paris Est',
} as const;

// ─── Hook de progression du déroulé (cross-platform, reduce motion) ──────────

/**
 * Progression 0..1 state-driven du déroulé d'import (listener JS — pilote des
 * props SVG/compteur que le driver natif ne sait pas animer, comme useCountUp).
 * `run` déclenche le déroulé ; reduce motion → saute directement à la fin (la
 * valeur — 1re zone capturée — reste lisible, jamais dépendante de l'anim §4).
 * Rappelle `onDone` UNE fois à la complétion (enchaîne vers le moment signature).
 */
export function useSyncDemo(
  run: boolean,
  durationMs: number,
  onDone?: () => void,
): number {
  const reduce = useReduceMotion();
  const [p, setP] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!run) return;
    doneRef.current = false;
    if (reduce) {
      setP(1);
      doneRef.current = true;
      onDoneRef.current?.();
      return;
    }
    const id = anim.addListener(({ value }) => {
      setP(value);
      if (value >= 1 && !doneRef.current) {
        doneRef.current = true;
        onDoneRef.current?.();
      }
    });
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false, // listener JS : pilote des props SVG + un compteur
    }).start();
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [run, reduce, durationMs, anim]);

  return reduce && run ? 1 : p;
}
