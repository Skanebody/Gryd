/**
 * GRYD — PLAN AUTO du départ de course (AMENDEMENT-14 §1-3, précise
 * AMENDEMENT-12 §A). L'objectif est un RÉSULTAT, pas une question : le joueur
 * ne choisit jamais conquérir/défendre — le moteur classe déjà chaque zone
 * serveur-side. Ici on DÉRIVE (données démo déterministes, jamais saisi) :
 *   lecture `defense`   zones en decay urgent sur la Battle Map OU mission
 *                       défense active (warroom/demo DEFENSE_MISSION)
 *   lecture `conquete`  sinon (défaut)
 * et le PLAN AUTO en une phrase + un itinéraire démo (« Défends le Canal ·
 * 3 zones à sauver » → route défense ; « Conquiers République · +94 zones » →
 * route recommandée). Le tap sur le bouton de départ = départ immédiat sur ce
 * plan ; le Route Planner devient un outil OPTIONNEL. Le serveur décide
 * toujours du territoire — la lecture ne teinte que kicker/sheet, plus jamais
 * le libellé du bouton.
 */
import { battleMapData, battleMapSummary, type BattleMapSummary } from '../map/fakeHexes';
import { DEFENSE_MISSION, OFFENSIVE } from '../warroom/demo';
import { ROUTES_DEMO, ROUTE_ID_BY_OBJECTIVE } from '../route/demo';
import type { RunButtonMode } from '../../ui/game';

/** La règle du jeu en UNE phrase (AMENDEMENT-14 §1) — répétée partout. */
export const RULE_PHRASE =
  "Cours. Tu conquiers ce que tu traverses, tu défends ce que tu possèdes, tu prends l'intérieur de tes boucles. GRYD s'occupe du reste.";

/** Lecture du plan auto — teinte kicker/sheet uniquement (pas un choix). */
export type RunLecture = 'conquete' | 'defense';

/** Le plan auto (smart default démo) affiché au-dessus du bouton de départ. */
export interface AutoRunPlan {
  lecture: RunLecture;
  /** Itinéraire démo pré-choisi (ids de features/route/demo). */
  routeId: string;
  /** UNE phrase : « Défends le Canal · 3 zones à sauver ». */
  phrase: string;
}

export interface BattleContext {
  /** Lecture 2 verbes conservée (AMENDEMENT-12 §A) — kicker/teinte seulement. */
  mode: RunButtonMode;
  summary: BattleMapSummary;
  plan: AutoRunPlan;
}

/** Import défensif des routes démo : id validé, sinon première route connue. */
function demoRouteId(objective: keyof typeof ROUTE_ID_BY_OBJECTIVE): string {
  const id = ROUTE_ID_BY_OBJECTIVE[objective];
  if (ROUTES_DEMO.some((r) => r.id === id)) return id;
  return ROUTES_DEMO[0]?.id ?? '';
}

/** Phrase + itinéraire du plan (données démo — le vrai algo est hors scope). */
function buildPlan(mode: RunButtonMode, summary: BattleMapSummary): AutoRunPlan {
  if (mode === 'DEFENDRE') {
    const routeId = demoRouteId('defendre');
    // La phrase suit la ZONE DE LA ROUTE résolue (le départ y mène vraiment) —
    // pas la mission War Room, qui peut viser une autre zone dans la démo.
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
    phrase: `Conquiers ${OFFENSIVE.zone} · +${route?.zones ?? 0} zones`,
  };
}

/**
 * DIRECTIVE de la carte (AMENDEMENT-17 §1.2) : la bottom sheet n'expose qu'UNE
 * consigne + UN CTA. Dérive du plan auto + de la route résolue :
 *   défense  `DÉFENSE RECOMMANDÉE` — « République est attaqué. »
 *            « Cours 4,4 km pour sauver 3 zones. »  ctaLabel `DÉFENDRE`
 *   conquête `CONQUÊTE` — « République est ouvert. »
 *            « Cours 5,1 km pour prendre 94 zones. »  ctaLabel `CONQUÉRIR`
 * Le CTA reste le SEUL point de départ (RunButton dans la sheet). Les % de
 * contrôle NE vivent PAS ici (détail au tap de la pill) — la directive dit
 * quoi faire, pas l'état complet du secteur.
 */
export interface MapDirective {
  kicker: string;
  /** « République est attaqué. » — le sujet de la consigne. */
  headline: string;
  /** « Cours 4,4 km pour sauver 3 zones. » — l'ordre chiffré. */
  order: string;
  /** Libellé du CTA de départ (DÉFENDRE / CONQUÉRIR). */
  ctaLabel: string;
  lecture: RunLecture;
}

/** « 4,4 km » — décimale française, pas d'Intl (parité Hermes). */
function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function mapDirective(): MapDirective {
  const { mode, summary, plan } = battleContext();
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

let cached: BattleContext | null = null;

/** Contexte de bataille partagé bouton de départ / HUD carte (calculé une fois — démo). */
export function battleContext(): BattleContext {
  if (cached) return cached;
  const summary = battleMapSummary(battleMapData().collection);
  const defenseMissionActive = DEFENSE_MISSION.expiresInH > 0;
  const mode: RunButtonMode =
    summary.decayUrgent > 0 || defenseMissionActive ? 'DEFENDRE' : 'CONQUERIR';
  cached = { mode, summary, plan: buildPlan(mode, summary) };
  return cached;
}

export function deriveRunButtonMode(): RunButtonMode {
  return battleContext().mode;
}

/** Le plan auto courant (phrase + route) — bandeau carte, Today, bouton de départ. */
export function deriveAutoPlan(): AutoRunPlan {
  return battleContext().plan;
}

/** Départ immédiat : toujours mode conquête + itinéraire du plan auto. */
export function goHref(plan: AutoRunPlan): string {
  return `/course-live?mode=conquete&route=${plan.routeId}`;
}

/**
 * Départ avec INTENTION (AMENDEMENT-16 §1) : le param `intention` teinte le live
 * (bandeaux Conquérir/Défendre) mais reste 100 % CLIENT — il ne part JAMAIS au
 * serveur pour l'attribution (le tracé réel seul décide). Le runMode reste
 * `conquete` : capturer/défendre = le moteur de zones, l'intention n'est qu'un
 * guide d'expérience. `route` optionnel (Défendre pointe une zone précise).
 */
export function intentionHref(intention: 'conquest' | 'defense', routeId?: string): string {
  const base = `/course-live?mode=conquete&intention=${intention}`;
  return routeId ? `${base}&route=${routeId}` : base;
}
