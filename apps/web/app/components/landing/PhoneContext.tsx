'use client';

/**
 * État partagé du téléphone du hero : la section Carte (city-dots) met à jour
 * la zone affichée, et le CTA « Simuler une course » du hero déclenche la
 * simulation dans le mockup (compteur d'événements simTick).
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/**
 * Le hover d'une ville ne transporte plus que son NOM. La `density` a été
 * retirée : attribuer un type de zone (active/émergente/pionnière/sauvage) à
 * une ville, c'est affirmer une densité de coureurs que personne n'a mesurée.
 */
export type PhoneZone = { name: string };

type PhoneContextValue = {
  zone: PhoneZone | null;
  setZone: (zone: PhoneZone) => void;
  simTick: number;
  requestSim: () => void;
};

const PhoneContext = createContext<PhoneContextValue | null>(null);

export function PhoneProvider({ children }: { children: ReactNode }) {
  const [zone, setZone] = useState<PhoneZone | null>(null);
  const [simTick, setSimTick] = useState(0);

  const value = useMemo<PhoneContextValue>(
    () => ({
      zone,
      setZone,
      simTick,
      requestSim: () => setSimTick((tick) => tick + 1),
    }),
    [zone, simTick],
  );

  return <PhoneContext.Provider value={value}>{children}</PhoneContext.Provider>;
}

export function usePhone(): PhoneContextValue {
  const ctx = useContext(PhoneContext);
  if (!ctx) throw new Error('usePhone doit être appelé sous <PhoneProvider>.');
  return ctx;
}
