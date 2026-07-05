/**
 * GRYD — préférence de FOND DE CARTE (demande fondateur : « possibilité de
 * mettre aussi la carte en couleur comme sur Plan d'iPhone »). Deux fonds :
 *   'dark'  — CARTO dark-matter, l'esthétique GRYD dark-first — DÉFAUT ;
 *   'color' — CARTO Voyager, rues/parcs/eau colorés type Apple Plan.
 * Persisté sous la clé 'gryd.basemap' (AsyncStorage) — même grammaire que le
 * wrapper haptics (src/lib/haptics.ts) : valeur en MÉMOIRE qui fait foi, lecture
 * unique et LAZY au premier accès, best-effort (stockage indisponible → défaut).
 * `useBasemapStyle()` expose la valeur courante + un setter et re-rend les
 * abonnés à chaque bascule (les deux forks MapScreen partagent l'état).
 * Aucune règle de jeu ici — pur réglage d'affichage.
 */
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAP_BASEMAP_STYLES, type BasemapKey } from './mapStyle';

/** Clé de persistance du réglage « Fond de carte ». */
const BASEMAP_STORAGE_KEY = 'gryd.basemap';
/** Défaut imposé : sombre (l'esthétique GRYD reste dark-first). */
const DEFAULT_BASEMAP: BasemapKey = 'dark';

/** Réglage en mémoire — fait foi dès le premier `setBasemap`. */
let current: BasemapKey = DEFAULT_BASEMAP;
/** Lecture unique et LAZY du réglage persisté (déclenchée au premier montage). */
let loadPromise: Promise<void> | null = null;
/** Abonnés (hooks montés) notifiés à chaque changement de valeur. */
const listeners = new Set<(value: BasemapKey) => void>();

/** Une valeur brute stockée est-elle une clé de fond connue ? */
function isBasemapKey(raw: string | null): raw is BasemapKey {
  return raw !== null && raw in MAP_BASEMAP_STYLES;
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(BASEMAP_STORAGE_KEY)
      .then((raw) => {
        if (isBasemapKey(raw) && raw !== current) {
          current = raw;
          for (const l of listeners) l(current);
        }
      })
      .catch(() => {
        // Best effort : stockage indisponible → défaut (sombre).
      });
  }
  return loadPromise;
}

/** Lit le réglage persisté (résout le défaut si absent/illisible). */
export async function getBasemap(): Promise<BasemapKey> {
  await ensureLoaded();
  return current;
}

/** Fixe le fond de carte, notifie les abonnés et persiste sous 'gryd.basemap'. */
export function setBasemap(value: BasemapKey): void {
  if (value === current) return;
  current = value;
  // La valeur en mémoire fait foi désormais — inutile de relire le stockage.
  loadPromise = Promise.resolve();
  for (const l of listeners) l(current);
  void AsyncStorage.setItem(BASEMAP_STORAGE_KEY, value).catch(() => {});
}

/**
 * Hook : fond de carte courant + setter + bascule dark↔color. La valeur
 * persistée est chargée LAZY au montage (le défaut sombre s'affiche d'abord,
 * puis la valeur stockée si différente) — jamais de flash au reload puisque le
 * défaut EST déjà le sombre.
 */
export function useBasemapStyle(): {
  basemap: BasemapKey;
  styleUrl: string;
  setBasemap: (value: BasemapKey) => void;
  toggle: () => void;
} {
  const [basemap, setLocal] = useState<BasemapKey>(current);

  useEffect(() => {
    const listener = (value: BasemapKey) => setLocal(value);
    listeners.add(listener);
    // Aligne l'état local si la valeur a bougé entre le rendu et l'effet.
    if (current !== basemap) setLocal(current);
    // Charge la valeur persistée (une seule fois, partagée).
    void ensureLoaded();
    return () => {
      listeners.delete(listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    basemap,
    styleUrl: MAP_BASEMAP_STYLES[basemap],
    setBasemap,
    toggle: () => setBasemap(current === 'dark' ? 'color' : 'dark'),
  };
}
