/**
 * GRYD — E12 : persistance des interrupteurs de couches PAR ACTIVITÉ.
 * Même grammaire que `mapPref.ts` (mémoire → abonnés → AsyncStorage best-effort).
 * Zéro règle de jeu ici : le serveur décide toujours du claim.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import {
  DEFAULT_MAP_LAYERS,
  mapLayersStorageKey,
  parseMapLayers,
  serializeMapLayers,
  type MapLayerVisibility,
} from './mapLayers';

interface LayersSlot {
  value: MapLayerVisibility;
  load: Promise<void> | null;
  listeners: Set<(value: MapLayerVisibility) => void>;
}

const slots = new Map<Activity, LayersSlot>();

function slotOf(activity: Activity): LayersSlot {
  const existing = slots.get(activity);
  if (existing) return existing;
  const created: LayersSlot = {
    value: DEFAULT_MAP_LAYERS,
    load: null,
    listeners: new Set(),
  };
  slots.set(activity, created);
  return created;
}

function ensureLoaded(activity: Activity): Promise<void> {
  const slot = slotOf(activity);
  if (!slot.load) {
    slot.load = AsyncStorage.getItem(mapLayersStorageKey(activity))
      .then((raw) => {
        const parsed = parseMapLayers(raw);
        if (parsed === null) return;
        slot.value = parsed;
        for (const l of slot.listeners) l(parsed);
      })
      .catch(() => {
        /* best effort → défaut */
      });
  }
  return slot.load;
}

export function setMapLayers(activity: Activity, value: MapLayerVisibility): void {
  const slot = slotOf(activity);
  slot.value = value;
  slot.load = Promise.resolve();
  for (const l of slot.listeners) l(value);
  void AsyncStorage.setItem(mapLayersStorageKey(activity), serializeMapLayers(value)).catch(
    () => {},
  );
}

/**
 * Hook : visibilité des couches E12 pour UNE discipline + setter.
 * Deux disciplines = deux emplacements (spec l.922).
 */
export function useMapLayers(activity: Activity = DEFAULT_ACTIVITY): {
  layers: MapLayerVisibility;
  setLayers: (value: MapLayerVisibility) => void;
} {
  const [layers, setLocal] = useState<MapLayerVisibility>(() => slotOf(activity).value);

  useEffect(() => {
    const slot = slotOf(activity);
    const listener = (value: MapLayerVisibility) => setLocal(value);
    slot.listeners.add(listener);
    setLocal(slot.value);
    void ensureLoaded(activity);
    return () => {
      slot.listeners.delete(listener);
    };
  }, [activity]);

  return {
    layers,
    setLayers: (value: MapLayerVisibility) => setMapLayers(activity, value),
  };
}
