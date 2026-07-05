/**
 * GRYD — INTENTIONS de course (AMENDEMENT-16 §1, doc §1-§3) : RUN libre par
 * défaut, Conquérir/Défendre OPTIONNELS à l'appui long. « L'intention guide
 * l'expérience live, le tracé réel décide du résultat » : le paramètre
 * `intention` est 100 % CLIENT — il teinte les bandeaux du live et rien
 * d'autre, il ne part JAMAIS au serveur pour l'attribution (ingest_run ne le
 * lit pas, le tracé seul décide). Copy gelée doc §28 + libellés démo §3.3
 * (zones à défendre). Les seuils de boucle viennent de @klaim/shared
 * (LOOP_MIN_PERIMETER_M — aucun nombre magique) ; les distances des boucles
 * défense sont des étiquettes de SCÉNARIO (doc §3.3), comme route/demo.ts.
 */
import { LOOP_MIN_PERIMETER_M } from '@klaim/shared';
import type { LoopPhase } from './loop';

// ─── Copy gelée (doc §28) ────────────────────────────────────────────────────

/** Run libre (§28) — sous-titre de l'entrée RUN du sheet. */
export const FREE_RUN_COPY =
  'Cours librement. GRYD calcule ce que tu as pris, défendu ou ouvert.';
/** Conquête (§28) — aide de la section Conquérir. */
export const CONQUEST_COPY = 'Trace une boucle. Ferme-la. La zone est à toi.';
/** Défense (§28) — sous-titre de l'entrée Défendre. */
export const DEFENSE_COPY = 'Reviens sur tes frontières avant qu’elles tombent.';
/** Conseil Conquérir (doc §3.2) — sous-titre de l'entrée Conquérir. */
export const CONQUEST_ADVICE =
  'Trace une boucle pour créer une zone. Distance conseillée : 2 à 5 km.';

// ─── Intention (client only — jamais envoyée au serveur) ─────────────────────

/** Les deux intentions optionnelles (l'absence = run libre). */
export type RunIntention = 'conquest' | 'defense';

/** Parse le param de route `intention` — inconnu/absent → null (run libre). */
export function intentionFromParam(
  param: string | string[] | undefined,
): RunIntention | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === 'conquest' || value === 'defense') return value;
  return null;
}

// ─── Zones à défendre (démo doc §3.3 — la vraie liste est serveur, V1) ──────

export interface DefenseTargetDemo {
  /** Zone (vocabulaire territoire — jamais « hex »). */
  zone: string;
  /** Urgence affichée (« Expire dans 18 h » / « Contesté »). */
  urgency: string;
  /** Boucle défense conseillée (km) — étiquette scénario doc §3.3. */
  loopKm: number;
  /** Itinéraire démo routé lancé au tap (route/demo.ts). */
  routeId: string;
}

/** Liste démo des zones à défendre (doc §3.3 : République · Canal). */
export const DEFENSE_TARGETS_DEMO: readonly DefenseTargetDemo[] = [
  {
    zone: 'République',
    urgency: 'Expire dans 18 h',
    loopKm: 3.1,
    routeId: 'route_c_defense',
  },
  {
    zone: 'Canal',
    urgency: 'Contesté',
    loopKm: 4.6,
    routeId: 'route_b_optimisee',
  },
];

/** « Boucle 3,1 km » — virgule FR, étiquette du sheet. */
export function defenseLoopLabel(target: DefenseTargetDemo): string {
  return `Boucle ${target.loopKm.toFixed(1).replace('.', ',')} km`;
}

/** Zone défendue selon le param `route=` du live — défaut : première cible. */
export function defenseZoneForRoute(param: string | string[] | undefined): string {
  const raw = (Array.isArray(param) ? param[0] : param)?.toLowerCase().replace(/-/g, '_');
  const hit = DEFENSE_TARGETS_DEMO.find((t) => t.routeId === raw);
  return (hit ?? DEFENSE_TARGETS_DEMO[0]!).zone;
}

// ─── Bandeaux live (AMENDEMENT-16 §1 — l'intention guide, le tracé décide) ──

/** Arrondi 10 m des distances lisibles (même règle que la lecture nav). */
const BANNER_ROUND_M = 10;

/**
 * Bandeau Conquérir : « Boucle en cours · Fermeture 72 % · ~280 m pour
 * fermer » (les seuils/états boucle EXISTANTS : phase de loop.ts, périmètre
 * minimal des règles). Fermeture % = part du tour déjà courue
 * (distance courue / (distance courue + retour au départ à vol d'oiseau)).
 */
export function conquestBannerLabel(
  phase: LoopPhase,
  distToStartM: number,
  distanceM: number,
): string {
  if (phase === 'closed') return 'Boucle fermée · La zone est à toi';
  if (distanceM < LOOP_MIN_PERIMETER_M) {
    return 'Boucle en cours · Trace ta boucle · 2 à 5 km conseillés';
  }
  const pct = Math.min(99, Math.round((distanceM / (distanceM + distToStartM)) * 100));
  const remaining = Math.max(
    BANNER_ROUND_M,
    Math.round(distToStartM / BANNER_ROUND_M) * BANNER_ROUND_M,
  );
  return `Boucle en cours · Fermeture ${pct} % · ~${remaining} m pour fermer`;
}

/** % démo de frontière couverte : cellules propres traversées / cellules du tour. */
export function defenseCoveragePct(litCount: number, totalCells: number): number {
  return Math.min(100, Math.round((100 * litCount) / Math.max(1, totalCells)));
}

/** Bandeau Défendre : « Défense République · Frontière couverte : 64 % ». */
export function defenseBannerLabel(zone: string, coveredPct: number): string {
  return `Défense ${zone} · Frontière couverte : ${coveredPct} %`;
}

// ─── Synthèse multi-résultats (doc §2 / §3.1 — « l'intention guide, le tracé
//     décide ») ──────────────────────────────────────────────────────────────
// Le tracé réel produit PLUSIEURS effets, quelle que soit l'intention : la
// synthèse liste ce que la course a pris/défendu/repris/ouvert. Étiquettes de
// SCÉNARIO démo (le vrai bilan vient d'ingest_run côté serveur, jamais du
// client). L'intention ne teinte que l'ordre/l'accent — pas l'attribution.

/** Une ligne de la synthèse : icône + texte, `accent` = mise en avant chartreuse. */
export interface ResultSummaryLine {
  icon: 'cible' | 'bouclier' | 'route' | 'crew';
  text: string;
  accent?: boolean;
}

/** Titre + copy §28 selon l'intention (Conquête / Défense / Run libre). */
export function summaryHeader(intention: RunIntention | null): {
  kicker: string;
  copy: string;
} {
  if (intention === 'conquest') return { kicker: 'CONQUÊTE', copy: CONQUEST_COPY };
  if (intention === 'defense') return { kicker: 'DÉFENSE', copy: DEFENSE_COPY };
  return { kicker: 'RUN LIBRE', copy: FREE_RUN_COPY };
}

/**
 * Synthèse multi-résultats (doc §2/§3.1). `zoneName`/`zonePctDelta` viennent
 * des stats démo (le serveur reste décideur). Chaque intention met en avant SON
 * effet, mais tous les effets du tracé sont listés (« pas une prison » §2) :
 *  - Conquérir : +1 zone conquise (accent) · 2 défendues · 1 route ouverte
 *  - Défendre  : 2 zones défendues (accent) · 1 petite zone conquise · 1 route
 *  - Run libre : +1 conquise · 2 défendues · 1 route ouverte (analyse auto)
 * La ligne zone crew (« Paris Est +3 % ») clôt toujours la synthèse.
 */
export function resultSummaryLines(
  intention: RunIntention | null,
  zoneName: string,
  zonePctDelta: number,
): ResultSummaryLine[] {
  const conquered: ResultSummaryLine = {
    icon: 'cible',
    text: '+1 zone conquise',
    accent: intention !== 'defense',
  };
  const defended: ResultSummaryLine = {
    icon: 'bouclier',
    text: '2 zones défendues',
    accent: intention === 'defense',
  };
  const opened: ResultSummaryLine = { icon: 'route', text: '1 route ouverte' };
  const crewLine: ResultSummaryLine = {
    icon: 'crew',
    text: `${zoneName} +${zonePctDelta} %`,
  };
  if (intention === 'defense') {
    // Défendre : la défense prime, la conquête au passage est « petite ».
    return [
      defended,
      { ...conquered, text: '1 petite zone conquise', accent: false },
      opened,
      crewLine,
    ];
  }
  return [conquered, defended, opened, crewLine];
}
