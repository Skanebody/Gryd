/**
 * GRYD — Contexte de jeu : activité (Run | Bike) × social (Solo | Crew).
 *
 * Deux axes orthogonaux, univers strictement séparés :
 *   · Run / Bike : territoires, classements, missions, CTA ne se mélangent jamais
 *     (planche E14).
 *   · Solo / Crew : attribution et lecture sociale (perso vs collectif). Les
 *     crews hybrides = deux métriques côte à côte, jamais sommées (E14).
 *
 * Persistance locale (AsyncStorage) — flip immédiat, sans écran de choix.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActivityMode = 'run' | 'bike';
export type SocialScope = 'solo' | 'crew';

export interface PlayContext {
  activity: ActivityMode;
  social: SocialScope;
}

const STORAGE_KEY = 'gryd.playContext.v1';
/** Legacy — migré une fois vers playContext. */
const LEGACY_ACTIVITY_KEY = 'gryd.activityMode.v1';

const DEFAULT: PlayContext = { activity: 'run', social: 'solo' };

let cached: PlayContext = DEFAULT;
const listeners = new Set<(ctx: PlayContext) => void>();

function notify(ctx: PlayContext) {
  cached = ctx;
  listeners.forEach((l) => l(ctx));
}

function parse(raw: string | null): PlayContext | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<PlayContext>;
    const activity = o.activity === 'bike' || o.activity === 'run' ? o.activity : null;
    const social = o.social === 'crew' || o.social === 'solo' ? o.social : null;
    if (!activity || !social) return null;
    return { activity, social };
  } catch {
    return null;
  }
}

async function read(): Promise<PlayContext> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = parse(raw);
    if (parsed) return parsed;
    // Migration depuis l'ancien store activité seule.
    const legacy = await AsyncStorage.getItem(LEGACY_ACTIVITY_KEY);
    if (legacy === 'bike' || legacy === 'run') {
      const migrated: PlayContext = { activity: legacy, social: 'solo' };
      await write(migrated);
      return migrated;
    }
  } catch {
    /* storage illisible → défaut */
  }
  return DEFAULT;
}

async function write(ctx: PlayContext): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    /* best-effort */
  }
}

function patch(partial: Partial<PlayContext>): void {
  const next = { ...cached, ...partial };
  if (next.activity === cached.activity && next.social === cached.social) return;
  void write(next);
  notify(next);
}

/** Hook : contexte de jeu complet. */
export function usePlayContext(): {
  activity: ActivityMode;
  social: SocialScope;
  setActivity: (mode: ActivityMode) => void;
  setSocial: (scope: SocialScope) => void;
  toggleActivity: () => void;
  toggleSocial: () => void;
} {
  const [ctx, setLocal] = useState<PlayContext>(cached);

  useEffect(() => {
    let alive = true;
    void read().then((m) => {
      if (!alive) return;
      notify(m);
      setLocal(m);
    });
    const onChange = (m: PlayContext) => setLocal(m);
    listeners.add(onChange);
    return () => {
      alive = false;
      listeners.delete(onChange);
    };
  }, []);

  const setActivity = useCallback((activity: ActivityMode) => {
    patch({ activity });
  }, []);

  const setSocial = useCallback((social: SocialScope) => {
    patch({ social });
  }, []);

  const toggleActivity = useCallback(() => {
    patch({ activity: cached.activity === 'run' ? 'bike' : 'run' });
  }, []);

  const toggleSocial = useCallback(() => {
    patch({ social: cached.social === 'solo' ? 'crew' : 'solo' });
  }, []);

  return {
    activity: ctx.activity,
    social: ctx.social,
    setActivity,
    setSocial,
    toggleActivity,
    toggleSocial,
  };
}

/**
 * Compat E14 — même API que l'ancien `useActivityMode`.
 * Préférer `usePlayContext` pour le couple activité × social.
 */
export function useActivityMode(): {
  mode: ActivityMode;
  setMode: (mode: ActivityMode) => void;
  toggle: () => void;
} {
  const { activity, setActivity, toggleActivity } = usePlayContext();
  return { mode: activity, setMode: setActivity, toggle: toggleActivity };
}
