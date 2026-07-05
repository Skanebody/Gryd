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

// ─── AMENDEMENT-17 §CH2 — Frontière crew : ouverture + complétion (démo UX) ──
// « Ouvre une frontière. Ton crew peut la fermer. » Côté UX pur : le résultat
// d'une course VALIDE non bouclée mais fermable montre l'état FRONTIÈRE OUVERTE
// (il manque N m) ; la course d'un membre qui referme la boucle montre BOUCLE
// CREW FERMÉE + contributions. En prod, ces données viennent d'ingest_run
// (IngestRunResponse.openBoundary / boundaryCompleted) ; ici on MIROIRE cette
// forme en démo déterministe (le serveur reste seul décideur). Jamais de
// polyline, de score de géométrie, de cellule ni de % de géométrie exposé :
// on affiche « Il manque 620 m. Expire dans 23 h. »

/**
 * Mode « terminer » du live (chantier 2) : un membre reprend une frontière
 * ouverte par son crew pour la refermer. 100 % CLIENT (comme conquest/defense) —
 * `boundary=<id>` accompagne le param pour rejouer la bonne frontière démo.
 */
export type CompleteIntention = 'complete';

/** Vrai si le live tourne en mode « terminer une frontière » (param intention). */
export function isCompleteParam(param: string | string[] | undefined): boolean {
  const value = Array.isArray(param) ? param[0] : param;
  return value === 'complete';
}

/**
 * Frontière partielle démo (miroir UX de PartialBoundary / openBoundary — la
 * géométrie serveur n'est jamais exposée). `missingM` = mètres restants affichés
 * tels quels (« Il manque 620 m ») ; `ttlHoursLeft` alimente « Expire dans 23 h »
 * (le vrai `expiresAt` vient du serveur). `openerName` = l'ouvreur (« Ouvert par
 * KORO »). `contributions` = répartition au prorata démo pour l'écran complétion.
 */
export interface PartialBoundaryDemo {
  id: string;
  zone: string;
  tracedKm: number;
  missingM: number;
  ttlHoursLeft: number;
  openerName: string;
  routeId: string;
  /** Répartition au prorata (somme des share = 1) — miroir contributionSplit. */
  contributions: readonly { name: string; share: number }[];
  /** Points crew de la zone capturée à la fermeture (démo). */
  crewPoints: number;
}

/**
 * Frontières partielles démo (doc §CH2 : « Il manque 620 m pour prendre
 * République »). Une seule cible principale (République, 620 m) + une secondaire.
 * La vraie liste est serveur (partial_boundaries du crew, RLS lecture crew).
 */
export const PARTIAL_BOUNDARIES_DEMO: readonly PartialBoundaryDemo[] = [
  {
    id: 'republique',
    zone: 'République',
    tracedKm: 2.4,
    missingM: 620,
    ttlHoursLeft: 23,
    openerName: 'KORO',
    routeId: 'route_c_defense',
    // Ouvreur ~79 % / finisher ~21 % (prorata longueur validée — miroir moteur).
    contributions: [
      { name: 'Benjamin', share: 0.79 },
      { name: 'Lena', share: 0.21 },
    ],
    crewPoints: 420,
  },
  {
    id: 'canal',
    zone: 'Canal',
    tracedKm: 3.1,
    missingM: 480,
    ttlHoursLeft: 17,
    openerName: 'KORO',
    routeId: 'route_b_optimisee',
    contributions: [
      { name: 'Benjamin', share: 0.72 },
      { name: 'Lena', share: 0.28 },
    ],
    crewPoints: 360,
  },
];

/** Frontière démo par id (`boundary=<id>`) — défaut : la première (République). */
export function partialBoundaryById(
  param: string | string[] | undefined,
): PartialBoundaryDemo {
  const raw = (Array.isArray(param) ? param[0] : param)?.toLowerCase();
  const hit = PARTIAL_BOUNDARIES_DEMO.find((b) => b.id === raw);
  return hit ?? PARTIAL_BOUNDARIES_DEMO[0]!;
}

/** « 2,4 km » — virgule FR, distance tracée (copy « Tu as tracé 2,4 km »). */
export function tracedKmLabel(boundary: PartialBoundaryDemo): string {
  return `${boundary.tracedKm.toFixed(1).replace('.', ',')} km`;
}

/** « Expire dans 23 h » — TTL restant lisible (jamais l'ISO brut). */
export function boundaryExpiryLabel(boundary: PartialBoundaryDemo): string {
  return `Expire dans ${boundary.ttlHoursLeft} h`;
}

/**
 * Part affichée « 79 % » d'une contribution (arrondi entier — jamais un % de
 * géométrie trop précis, juste la répartition lisible du prorata).
 */
export function contributionPct(share: number): number {
  return Math.round(Math.max(0, Math.min(1, share)) * 100);
}

/**
 * Bandeau live du mode « terminer » (chantier 2, doc §CH2) :
 * « Terminer République · 420 m restants · Frontière couverte : 68 % ».
 * `remainingM` = ce qu'il reste à couvrir (démo : missing × (1 − progress)) ;
 * `coveredPct` = frontière couverte (métrique démo, pas une polyline technique).
 * Aucune de ces valeurs ne part au serveur — pur affichage.
 */
export function completeBannerLabel(
  zone: string,
  remainingM: number,
  coveredPct: number,
): string {
  const m = Math.max(0, Math.round(remainingM / BANNER_ROUND_M) * BANNER_ROUND_M);
  // Bandeau 2 segments (tient sur 1 ligne à 375px) : le % de couverture est déjà
  // porté par la barre de progression + la card live (anti-troncature Partie D).
  void coveredPct;
  return `Terminer ${zone} · ${m} m restants`;
}

// ─── AMENDEMENT-20 §1 — BANDEAU MISSION épuré (fusion ETA + intention) ────────
// « Strava partage une conquête. » Un SEUL bandeau en haut, textes RADICALEMENT
// courts : « DÉFENSE · République · 80 % », « BOUCLE · 72 % · 320 m », « RUN
// LIBRE · 4,2 km · 5’38/km ». Plus jamais « Défense République · Frontière
// couverte : 80 % ». Ces libellés sont 100 % CLIENT (pur affichage, le tracé
// décide). Le sous-libellé ETA (« 9 min ») vit à côté, porté par course-live.

/**
 * Bandeau mission DÉFENSE (court) : « DÉFENSE · République · 80 % ».
 * Le % est la frontière couverte (métrique démo), lu d'un coup d'œil.
 */
export function defenseMissionLabel(zone: string, coveredPct: number): string {
  return `DÉFENSE · ${zone} · ${coveredPct} %`;
}

/**
 * Bandeau mission CONQUÊTE (court) : « BOUCLE · 72 % · 320 m » (fermeture % +
 * distance pour fermer). Avant le seuil de périmètre : « BOUCLE · trace 2-5 km ».
 * Fermée : « BOUCLE FERMÉE · zone prise ».
 */
export function conquestMissionLabel(
  phase: LoopPhase,
  distToStartM: number,
  distanceM: number,
): string {
  if (phase === 'closed') return 'BOUCLE FERMÉE · zone prise';
  if (distanceM < LOOP_MIN_PERIMETER_M) return 'BOUCLE · trace 2-5 km';
  const pct = Math.min(99, Math.round((distanceM / (distanceM + distToStartM)) * 100));
  const remaining = Math.max(
    BANNER_ROUND_M,
    Math.round(distToStartM / BANNER_ROUND_M) * BANNER_ROUND_M,
  );
  return `BOUCLE · ${pct} % · ${remaining} m`;
}

/**
 * Bandeau mission TERMINER (court) : « TERMINER · République · 320 m ».
 * `remainingM` = mètres restants pour refermer la frontière crew.
 */
export function completeMissionLabel(zone: string, remainingM: number): string {
  const m = Math.max(0, Math.round(remainingM / BANNER_ROUND_M) * BANNER_ROUND_M);
  return `TERMINER · ${zone} · ${m} m`;
}

/**
 * Bandeau mission RUN LIBRE (court) : « RUN LIBRE · 4,2 km · 5’38/km ».
 * `kmLabel` et `paceLabel` sont formatés en amont (formatKm / formatPace).
 */
export function freeRunMissionLabel(kmLabel: string, paceLabel: string): string {
  return `RUN LIBRE · ${kmLabel} km · ${paceLabel}/km`;
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
