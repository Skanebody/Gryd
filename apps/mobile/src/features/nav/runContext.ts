/**
 * GRYD — PLAN AUTO du bouton GO (AMENDEMENT-14 §1-3, précise AMENDEMENT-12 §A).
 * En mode live : dérivé du résumé carte + missions War Room (battleContextStore).
 * Hors backend : lecture neutre ou preview démo (O1 uniquement).
 */
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  getLiveBattleSummary,
  getLiveDefenseMission,
  getLiveOpenBoundaries,
} from './battleContextStore';
import { battleMapData, battleMapSummary, type BattleMapSummary } from '../map/fakeHexes';
import { DEFENSE_MISSION, OFFENSIVE } from '../warroom/demo';
import { ROUTES_DEMO, ROUTE_ID_BY_OBJECTIVE } from '../route/demo';
import type { RunButtonMode } from '../../ui/game';

export const RULE_PHRASE =
  "Cours. Tu conquiers ce que tu traverses, tu défends ce que tu possèdes, tu prends l'intérieur de tes boucles. GRYD s'occupe du reste.";

export type RunLecture = 'conquete' | 'defense';

export interface AutoRunPlan {
  lecture: RunLecture;
  routeId: string;
  phrase: string;
}

export interface BattleContext {
  mode: RunButtonMode;
  summary: BattleMapSummary;
  plan: AutoRunPlan;
}

export interface MapDirective {
  kicker: string;
  headline: string;
  order: string;
  ctaLabel: string;
  lecture: RunLecture;
}

function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function demoRouteId(objective: keyof typeof ROUTE_ID_BY_OBJECTIVE): string {
  const id = ROUTE_ID_BY_OBJECTIVE[objective];
  if (ROUTES_DEMO.some((r) => r.id === id)) return id;
  return ROUTES_DEMO[0]?.id ?? '';
}

function buildLivePlan(mode: RunButtonMode, summary: BattleMapSummary): AutoRunPlan {
  const defense = getLiveDefenseMission();
  if (mode === 'DEFENDRE') {
    const zone = defense?.zone ?? 'ton territoire';
    const n = Math.max(1, summary.decayUrgent || summary.decay);
    return {
      lecture: 'defense',
      routeId: '',
      phrase: `Défends ${zone} · ${n} zone${n > 1 ? 's' : ''} à sauver`,
    };
  }
  const boundary = getLiveOpenBoundaries()[0];
  const zone = boundary?.zone ?? 'le terrain autour de toi';
  return {
    lecture: 'conquete',
    routeId: '',
    phrase: `Conquiers ${zone} · pars courir`,
  };
}

function buildDevPlan(mode: RunButtonMode, summary: BattleMapSummary): AutoRunPlan {
  if (mode === 'DEFENDRE') {
    const routeId = demoRouteId('defendre');
    const route = ROUTES_DEMO.find((r) => r.id === routeId);
    const zone = route?.zone ?? DEFENSE_MISSION.zone;
    const n = Math.max(1, summary.decay);
    return {
      lecture: 'defense',
      routeId,
      phrase: `Défends ${zone} · ${n} zone${n > 1 ? 's' : ''} à sauver`,
    };
  }
  const routeId = demoRouteId('conquerir');
  const route = ROUTES_DEMO.find((r) => r.id === routeId);
  return {
    lecture: 'conquete',
    routeId,
    phrase: `Conquiers ${route?.zone ?? OFFENSIVE.zone} · +${route?.zones ?? 0} zones`,
  };
}

let devCached: BattleContext | null = null;

function liveBattleContext(): BattleContext {
  const summary = getLiveBattleSummary();
  const defense = getLiveDefenseMission();
  const defenseMissionActive = (defense?.expiresInH ?? 0) > 0;
  const mode: RunButtonMode =
    summary.decayUrgent > 0 || defenseMissionActive ? 'DEFENDRE' : 'CONQUERIR';
  return { mode, summary, plan: buildLivePlan(mode, summary) };
}

function devBattleContext(): BattleContext {
  if (devCached) return devCached;
  const summary = battleMapSummary(battleMapData().collection);
  const defenseMissionActive = DEFENSE_MISSION.expiresInH > 0;
  const mode: RunButtonMode =
    summary.decayUrgent > 0 || defenseMissionActive ? 'DEFENDRE' : 'CONQUERIR';
  devCached = { mode, summary, plan: buildDevPlan(mode, summary) };
  return devCached;
}

export function mapDirective(): MapDirective {
  const { mode, summary, plan } = battleContext();
  if (isSupabaseConfigured) {
    if (mode === 'DEFENDRE') {
      const n = Math.max(1, summary.decayUrgent || summary.decay);
      const zone = getLiveDefenseMission()?.zone ?? 'Ton territoire';
      return {
        kicker: 'DÉFENSE RECOMMANDÉE',
        headline: `${zone} est attaqué.`,
        order: `Pars courir pour sauver ${n} zone${n > 1 ? 's' : ''}.`,
        ctaLabel: 'DÉFENDRE',
        lecture: 'defense',
      };
    }
    const zone = getLiveOpenBoundaries()[0]?.zone ?? 'Le terrain';
    return {
      kicker: 'CONQUÊTE OUVERTE',
      headline: `${zone} est à prendre.`,
      order: 'Pars courir pour capturer des zones.',
      ctaLabel: 'CONQUÉRIR',
      lecture: 'conquete',
    };
  }
  const route = ROUTES_DEMO.find((r) => r.id === plan.routeId);
  const km = route ? formatKm(route.distanceKm) : 'quelques km';
  const zone = route?.zone ?? OFFENSIVE.zone;
  if (mode === 'DEFENDRE') {
    const n = Math.max(1, summary.decay);
    return {
      kicker: 'DÉFENSE RECOMMANDÉE',
      headline: `${zone} est attaqué.`,
      order: `Cours ${km} pour sauver ${n} zone${n > 1 ? 's' : ''}.`,
      ctaLabel: 'DÉFENDRE',
      lecture: 'defense',
    };
  }
  const n = route?.zones ?? 0;
  return {
    kicker: 'CONQUÊTE OUVERTE',
    headline: `${zone} est à prendre.`,
    order: `Cours ${km} pour capturer ${n} zones.`,
    ctaLabel: 'CONQUÉRIR',
    lecture: 'conquete',
  };
}

export function battleContext(): BattleContext {
  if (isSupabaseConfigured) return liveBattleContext();
  return devBattleContext();
}

export function deriveRunButtonMode(): RunButtonMode {
  return battleContext().mode;
}

export function deriveAutoPlan(): AutoRunPlan {
  return battleContext().plan;
}

export function goHref(plan: AutoRunPlan): string {
  const base = '/course-live?mode=conquete';
  return plan.routeId ? `${base}&route=${plan.routeId}` : base;
}

export function intentionHref(intention: 'conquest' | 'defense', routeId?: string): string {
  const base = `/course-live?mode=conquete&intention=${intention}`;
  return routeId ? `${base}&route=${routeId}` : base;
}
