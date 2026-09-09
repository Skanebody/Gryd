import { createContext, memo, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, refonteColors as c } from '@klaim/shared';
import { useRealRun } from '../run/gps/useRealRun';
import type { RealRunGate } from '../run/gps/gateTypes';
import type { LiveRunMode } from '../run/simulation';
import { useLocale } from '../../i18n/store';
import { NAV_BAR_HEIGHT, NAV_BOTTOM_GAP, GO_BUTTON_GAP } from '../nav/metrics';
import { TranslucentBackdrop2026 } from '../../ui/gryd/TranslucentBackdrop2026';
import { GrydIcon } from '../../ui/gryd';

interface SessionContext {
  gate: RealRunGate | null;
  ensure(mode: LiveRunMode): void;
  cancelPreparation(): void;
}
const Context = createContext<SessionContext | null>(null);
/** Kept above the router: opening Crew or Profile cannot stop the GPS hook. */
const Recorder = memo(function Recorder({ mode, publish }: { mode: LiveRunMode; publish(gate: RealRunGate): void }) {
  const gate = useRealRun(mode);
  useEffect(() => publish(gate), [gate, publish]);
  return null;
});
export function RunSessionProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<LiveRunMode | null>(null);
  const [generation, setGeneration] = useState(0);
  const [rawGate, setGate] = useState<RealRunGate | null>(null);
  const publish = useCallback((gate: RealRunGate) => setGate(gate), []);
  const ensure = useCallback((next: LiveRunMode) => setMode(current => current ?? next), []);
  const cancelPreparation = useCallback(() => {
    setMode(null); setGate(null);
    setGeneration(value => value + 1);
  }, []);
  const gate = useMemo<RealRunGate | null>(() => rawGate?.kind === 'real' ? {
    ...rawGate, run: { ...rawGate.run, finish: async () => {
      const result = await rawGate.run.finish();
      setMode(null); setGate(null);
      return result;
    } },
  } : rawGate, [rawGate]);
  const value = useMemo(() => ({ gate, ensure, cancelPreparation }), [gate, ensure, cancelPreparation]);
  return <Context.Provider value={value}>
    {mode !== null && <Recorder key={generation} mode={mode} publish={publish} />}
    {children}
    <ActiveRunBanner />
  </Context.Provider>;
}
export function useRunSession() {
  const context = useContext(Context);
  if (!context) throw new Error('RunSessionProvider missing');
  return context;
}
function ActiveRunBanner() {
  const { gate } = useRunSession();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const fr = useLocale() === 'fr';
  if (gate?.kind !== 'real' || pathname === '/course-live' || pathname === '/') return null;
  return <Pressable accessibilityRole="button" onPress={() => router.push('/course-live')} style={[s.banner, { bottom: insets.bottom + NAV_BAR_HEIGHT + NAV_BOTTOM_GAP + GO_BUTTON_GAP }]}>
    <TranslucentBackdrop2026 tone="dark" radius={24} /><View style={s.indicator} /><Text style={s.text}>{gate.run.snapshot.phase === 'paused-user' ? (fr ? 'Sortie en pause' : 'Outing paused') : (fr ? 'Sortie en cours' : 'Recording in progress')}</Text><GrydIcon name="arrowUpRight" size={20} color={c.darkInk} />
  </Pressable>;
}
const s = StyleSheet.create({ banner: { position: 'absolute', left: 20, right: 20, minHeight: 48, backgroundColor: 'transparent', borderWidth: 1, borderColor: `${c.surface}22`, borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, indicator: { zIndex: 1, width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent }, text: { zIndex: 1, flex: 1, color: c.darkInk, fontFamily: fonts.textSemi, fontSize: 13 } });
