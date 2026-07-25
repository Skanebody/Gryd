/**
 * GRYD — Commutateur Run / Bike (univers séparés).
 * Territoires, classements et missions ne se mélangent jamais entre modes.
 * Persistance locale (AsyncStorage) — flip immédiat, sans écran de choix.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ActivityMode = 'run' | 'bike';

const STORAGE_KEY = 'gryd.activityMode.v1';

let cached: ActivityMode = 'run';
const listeners = new Set<(mode: ActivityMode) => void>();

function notify(mode: ActivityMode) {
  cached = mode;
  listeners.forEach((l) => l(mode));
}

async function read(): Promise<ActivityMode> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'bike' || raw === 'run') return raw;
  } catch {
    /* storage illisible → défaut run */
  }
  return 'run';
}

async function write(mode: ActivityMode): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* best-effort */
  }
}

/** Hook : mode actif + setter (haptique à la charge de l'UI). */
export function useActivityMode(): {
  mode: ActivityMode;
  setMode: (mode: ActivityMode) => void;
  toggle: () => void;
} {
  const [mode, setLocal] = useState<ActivityMode>(cached);

  useEffect(() => {
    let alive = true;
    void read().then((m) => {
      if (!alive) return;
      notify(m);
      setLocal(m);
    });
    const onChange = (m: ActivityMode) => setLocal(m);
    listeners.add(onChange);
    return () => {
      alive = false;
      listeners.delete(onChange);
    };
  }, []);

  const setMode = useCallback((next: ActivityMode) => {
    if (next === cached) return;
    void write(next);
    notify(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(cached === 'run' ? 'bike' : 'run');
  }, [setMode]);

  return { mode, setMode, toggle };
}
