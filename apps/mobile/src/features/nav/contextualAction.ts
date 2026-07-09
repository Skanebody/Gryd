/**
 * GRYD — DÉRIVATION de l'ACTION contextuelle du bouton flottant (AMENDEMENT-29).
 * En mode live : lit battleContextStore + battleContext (pas de données démo).
 */
import { isSupabaseConfigured } from '../../lib/supabase';
import { battleContext, goHref, intentionHref } from './runContext';
import {
  getLiveDefenseMission,
  getLiveOpenBoundaries,
} from './battleContextStore';
import {
  PARTIAL_BOUNDARIES_DEMO,
  type PartialBoundaryDemo,
} from '../run/intention';
import { MISSIONS, OPEN_BOUNDARIES, type OpenBoundaryDemo } from '../warroom/demo';
import type { IconName } from '@klaim/shared';

export type ContextualActionKind =
  | 'run'
  | 'defendre'
  | 'conquerir'
  | 'terminer'
  | 'rejoindre';

export interface ContextualAction {
  kind: ContextualActionKind;
  label: string;
  icon: IconName;
  intention: 'conquest' | 'defense' | 'complete' | null;
  targetHref: string;
  a11yLabel: string;
}

export interface ContextInput {
  screen?: 'map' | 'missions' | 'zone' | 'route' | 'loop';
  selectedZone?: { kind: 'attacked' | 'neutral' | 'rival'; routeId?: string } | null;
  selectedBoundary?: PartialBoundaryDemo | null;
  selectedCrewMissionId?: string | null;
}

function runAction(): ContextualAction {
  return {
    kind: 'run',
    label: 'RUN',
    icon: 'foulees',
    intention: null,
    targetHref: goHref(battleContext().plan),
    a11yLabel: 'Lancer une course libre',
  };
}

function defendAction(zone: string, routeId?: string): ContextualAction {
  return {
    kind: 'defendre',
    label: 'DÉFENDRE',
    icon: 'bouclier',
    intention: 'defense',
    targetHref: intentionHref('defense', routeId),
    a11yLabel: `Défendre ${zone} — lancer la course de défense`,
  };
}

function conquerAction(zone: string, routeId?: string): ContextualAction {
  return {
    kind: 'conquerir',
    label: 'CONQUÉRIR',
    icon: 'cible',
    intention: 'conquest',
    targetHref: intentionHref('conquest', routeId),
    a11yLabel: `Conquérir ${zone} — lancer la course de conquête`,
  };
}

function completeAction(boundary: PartialBoundaryDemo): ContextualAction {
  return {
    kind: 'terminer',
    label: 'TERMINER',
    icon: 'boucle_fermee',
    intention: 'complete',
    targetHref: `/course-live?mode=conquete&intention=complete&boundary=${boundary.id}`,
    a11yLabel: `Terminer ${boundary.zone} — refermer la boucle du crew`,
  };
}

function joinAction(missionLabel: string, boundaryId?: string): ContextualAction {
  const href = boundaryId
    ? `/course-live?mode=conquete&intention=complete&boundary=${boundaryId}`
    : intentionHref('conquest');
  return {
    kind: 'rejoindre',
    label: 'REJOINDRE',
    icon: 'crew',
    intention: boundaryId ? 'complete' : 'conquest',
    targetHref: href,
    a11yLabel: `Rejoindre la mission du crew — ${missionLabel}`,
  };
}

function liveBoundaryToPartial(b: OpenBoundaryDemo): PartialBoundaryDemo {
  return {
    id: b.boundaryId,
    zone: b.zone,
    tracedKm: 0,
    missingM: b.missingM,
    ttlHoursLeft: Math.max(1, Math.ceil(b.expiresInMin / 60)),
    openerName: b.opener,
    routeId: '',
    contributions: [],
    crewPoints: 0,
  };
}

function nearlyClosedBoundary(): PartialBoundaryDemo | null {
  if (isSupabaseConfigured) {
    const live = getLiveOpenBoundaries()[0];
    return live ? liveBoundaryToPartial(live) : null;
  }
  return PARTIAL_BOUNDARIES_DEMO[0] ?? null;
}

function openCrewMission(): { label: string; boundaryId?: string } | null {
  if (isSupabaseConfigured) return null;
  const crew = MISSIONS.find((m) => m.kind === 'crew' && m.progress < m.target);
  if (!crew) return null;
  const boundaryId = OPEN_BOUNDARIES[0]?.boundaryId;
  return { label: crew.label, boundaryId };
}

export function deriveContextualAction(input: ContextInput = {}): ContextualAction {
  if (input.selectedBoundary) return completeAction(input.selectedBoundary);
  if (input.selectedZone) {
    const { kind, routeId } = input.selectedZone;
    return kind === 'attacked'
      ? defendAction('cette zone', routeId)
      : conquerAction('cette zone', routeId);
  }
  if (input.selectedCrewMissionId) {
    const m = MISSIONS.find((x) => x.key === input.selectedCrewMissionId);
    return joinAction(m?.label ?? 'mission crew');
  }

  const ctx = battleContext();

  if (input.screen === 'missions') {
    const boundary = nearlyClosedBoundary();
    if (boundary) return completeAction(boundary);
    const crew = openCrewMission();
    if (crew) return joinAction(crew.label, crew.boundaryId);
    if (ctx.mode === 'DEFENDRE') {
      const zone = getLiveDefenseMission()?.zone ?? 'ta zone';
      return defendAction(zone, ctx.plan.routeId || undefined);
    }
    return conquerAction('une zone', ctx.plan.routeId || undefined);
  }

  if (
    input.screen === 'map' ||
    input.screen === 'zone' ||
    input.screen === 'route' ||
    input.screen === 'loop'
  ) {
    if (ctx.mode === 'DEFENDRE') {
      const zone = getLiveDefenseMission()?.zone ?? 'ta zone';
      return defendAction(zone, ctx.plan.routeId || undefined);
    }
    return conquerAction('ta zone', ctx.plan.routeId || undefined);
  }

  return runAction();
}
