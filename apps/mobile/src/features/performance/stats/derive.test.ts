/**
 * GRYD — tests du MOTEUR des trois blocs de l'écran E18 (`derive.ts`).
 *
 * L'écran ne fait que FORMATER ce que ce module décide : quel jour porte le
 * volume, si le delta a le droit d'exister, combien de semaines forment une
 * série, quelle semaine a le plus capturé. Une conclusion en langage naturel
 * (« Samedi est ton meilleur jour ») n'est vraie que si le NOMBRE dont elle
 * dérive l'est. Ces tests verrouillent donc les façons dont ces nombres
 * pourraient MENTIR :
 *   1. inventer un delta (« +∞ » sur une fenêtre précédente vide, « −100 % »
 *      sur une fenêtre courante vide, « +0 % » qui se lit « tu stagnes ») ;
 *   2. tirer une tendance d'une seule course (seuil MIN_RUNS_FOR_TRENDS) ;
 *   3. lire « cette course n'a rien pris » là où le payload est ILLISIBLE
 *      (le `null` doit se propager, jamais retomber sur 0) ;
 *   4. reconstruire une saison précédente qui n'existe pas (delta de saison) ;
 *   5. peindre une série là où une semaine a été sautée.
 *
 * Deno, aucun réseau, aucun mock, horloge INJECTÉE : on importe directement le
 * module de prod. Les assertions évitent de nommer un JOUR de semaine (le moteur
 * utilise le jour LOCAL, donc le fuseau du runner le déplacerait) : on vérifie
 * plutôt des invariants indépendants du fuseau.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  ACTIVE_WEEK_MIN_RUNS,
  MIN_RUNS_FOR_TRENDS,
  capturedOf,
  deriveStats,
  periodWindow,
  type StatsRunRow,
} from './derive.ts';

const MS_PER_WEEK = 7 * 86_400_000;
/** Mercredi midi UTC : loin d'une frontière de semaine, série déterministe. */
const NOW = new Date('2026-07-15T12:00:00.000Z');

/** Une ligne de `runs` plausible ; chaque test ne surcharge que l'utile. */
function run(over: Partial<StatsRunRow> = {}): StatsRunRow {
  return {
    started_at: NOW.toISOString(),
    distance_m: 5_000,
    duration_s: 1_800,
    avg_pace_s_km: 360,
    status: 'valid',
    celebration: null,
    ...over,
  };
}

/** Un payload `celebration` lisible avec les trois compteurs de capture. */
function celeb(claimed: number, stolen = 0, pioneer = 0): unknown {
  return { hexes: { claimed, stolen, pioneer } };
}

// ═══ periodWindow ════════════════════════════════════════════════════════════

Deno.test('periodWindow — semaine : une fenêtre précédente collée, sans trou', () => {
  const w = periodWindow(NOW, 'week', null);
  assertEquals(w.endMs, NOW.getTime());
  // La fenêtre précédente finit juste AVANT le début de la courante.
  assertEquals(w.previous?.endMs, w.startMs - 1);
  assertEquals(w.previous?.startMs, w.startMs - MS_PER_WEEK);
});

Deno.test('periodWindow — mois : début = 1er du mois UTC, précédent = mois d’avant', () => {
  const w = periodWindow(NOW, 'month', null);
  assertEquals(w.startMs, Date.UTC(2026, 6, 1));
  assertEquals(w.previous?.startMs, Date.UTC(2026, 5, 1));
  assertEquals(w.previous?.endMs, w.startMs - 1);
});

Deno.test('periodWindow — saison : bornes RÉELLES et AUCUNE saison précédente', () => {
  const seasonStart = Date.UTC(2026, 6, 1);
  const w = periodWindow(NOW, 'season', seasonStart);
  assertEquals(w.startMs, seasonStart);
  // Le delta de saison est interdit : pas de « saison dernière » reconstruite.
  assertEquals(w.previous, null);
});

Deno.test('periodWindow — saison sans début lu : repli sur la semaine, jamais une borne inventée', () => {
  const w = periodWindow(NOW, 'season', null);
  const week = periodWindow(NOW, 'week', null);
  assertEquals(w.startMs, week.startMs);
  assertEquals(w.previous, null);
});

// ═══ capturedOf — le null se propage, jamais un 0 fabriqué ════════════════════

Deno.test('capturedOf — payload absent ou non-objet : null (pas 0)', () => {
  assertEquals(capturedOf(null), null);
  assertEquals(capturedOf(undefined), null);
  assertEquals(capturedOf(42), null);
  assertEquals(capturedOf({}), null);
  assertEquals(capturedOf({ hexes: null }), null);
});

Deno.test('capturedOf — un compteur manquant ou aberrant rend TOUT le total null', () => {
  assertEquals(capturedOf({ hexes: { claimed: 2, stolen: 1 } }), null); // pioneer absent
  assertEquals(capturedOf({ hexes: { claimed: 2, stolen: 1, pioneer: -1 } }), null); // négatif
  assertEquals(capturedOf({ hexes: { claimed: 2, stolen: 'x', pioneer: 0 } }), null); // type
});

Deno.test('capturedOf — trois compteurs lisibles : leur somme', () => {
  assertEquals(capturedOf(celeb(3, 2, 1)), 6);
  assertEquals(capturedOf(celeb(0, 0, 0)), 0);
});

// ═══ deriveStats — volume, delta, seuils ══════════════════════════════════════

Deno.test('deriveStats — aucune course : zéro partout, aucun delta, rien à conclure', () => {
  const d = deriveStats([], NOW, 'week', null);
  assertEquals(d.countedRuns, 0);
  assertEquals(d.volume.runs, 0);
  assertEquals(d.volume.distanceM, 0);
  assertEquals(d.volume.deltaPct, null);
  assertEquals(d.volume.bestDayIndex, null);
  assertEquals(d.volume.enough, false);
  assertEquals(d.volume.days.length, 7);
});

Deno.test('deriveStats — statuts non courus écartés (comme le bloc et le palmarès)', () => {
  const rows = [run({ status: 'rejected' }), run({ status: 'flagged' })];
  const d = deriveStats(rows, NOW, 'week', null);
  assertEquals(d.countedRuns, 0);
  assertEquals(d.volume.runs, 0);
});

Deno.test('deriveStats — « partial » compte : le joueur a bien couru', () => {
  const d = deriveStats([run({ status: 'partial' })], NOW, 'week', null);
  assertEquals(d.countedRuns, 1);
  assertEquals(d.volume.runs, 1);
});

Deno.test('deriveStats — seuil de tendance : 1 course ne suffit pas, 2 oui', () => {
  const one = deriveStats([run()], NOW, 'week', null);
  assertEquals(one.volume.enough, false);
  const two = deriveStats([run(), run({ distance_m: 3_000 })], NOW, 'week', null);
  assertEquals(two.volume.runs, MIN_RUNS_FOR_TRENDS);
  assertEquals(two.volume.enough, true);
});

Deno.test('deriveStats — bestDayIndex désigne bien la colonne de distance MAX', () => {
  // Deux courses le même jour (donc même colonne) + rien ailleurs : le meilleur
  // jour est cette colonne, et sa distance est la plus grande. On ne nomme pas
  // le jour (fuseau du runner) — on vérifie la cohérence interne.
  const d = deriveStats([run({ distance_m: 4_000 }), run({ distance_m: 6_000 })], NOW, 'week', null);
  const idx = d.volume.bestDayIndex;
  assertEquals(idx !== null, true);
  const best = d.volume.days[idx as number];
  assertEquals(best?.distanceM, 10_000);
  const maxDist = Math.max(...d.volume.days.map((x) => x.distanceM));
  assertEquals(best?.distanceM, maxDist);
});

Deno.test('deriveStats — delta : une fenêtre précédente vide n’autorise AUCUN pourcentage', () => {
  // Uniquement des courses dans la semaine courante : pas de « +∞ ».
  const d = deriveStats([run(), run()], NOW, 'week', null);
  assertEquals(d.volume.deltaPct, null);
});

Deno.test('deriveStats — delta : une fenêtre courante vide n’écrit pas « −100 % »', () => {
  // Une course la semaine DERNIÈRE, rien cette semaine : pas de reproche chiffré.
  const lastWeek = new Date(NOW.getTime() - MS_PER_WEEK);
  const d = deriveStats([run({ started_at: lastWeek.toISOString() })], NOW, 'week', null);
  assertEquals(d.volume.runs, 0);
  assertEquals(d.volume.deltaPct, null);
});

Deno.test('deriveStats — delta : deux fenêtres pleines → pourcentage arrondi réel', () => {
  const lastWeek = new Date(NOW.getTime() - MS_PER_WEEK).toISOString();
  const rows = [
    run({ distance_m: 10_000 }), // courante
    run({ distance_m: 2_000 }), // courante → 12 km
    run({ started_at: lastWeek, distance_m: 10_000 }), // précédente → 10 km
  ];
  const d = deriveStats(rows, NOW, 'week', null);
  assertEquals(d.volume.distanceM, 12_000);
  assertEquals(d.volume.deltaPct, 20); // (12-10)/10 = +20 %
});

Deno.test('deriveStats — saison : jamais de delta même avec une fenêtre pleine', () => {
  const seasonStart = Date.UTC(2026, 6, 1);
  const d = deriveStats([run(), run({ distance_m: 3_000 })], NOW, 'season', seasonStart);
  assertEquals(d.volume.deltaPct, null);
});

// ═══ deriveStats — captures : null propagé, jamais 0 fabriqué ══════════════════

Deno.test('deriveStats — une capture ILLISIBLE dans la fenêtre rend le total null', () => {
  const rows = [run({ celebration: celeb(3) }), run({ celebration: null })];
  const d = deriveStats(rows, NOW, 'week', null);
  // Un payload manquant ne doit pas se lire « 3 » : on ne sait pas, donc null.
  assertEquals(d.volume.totalCaptures, null);
  assertEquals(d.capturedInPeriod, null);
});

Deno.test('deriveStats — captures toutes lisibles : leur somme, exacte', () => {
  // celeb(2,1,0) = 3 (claimed+stolen+pioneer) ; celeb(1,0,1) = 2 → total 5.
  const rows = [run({ celebration: celeb(2, 1, 0) }), run({ celebration: celeb(1, 0, 1) })];
  const d = deriveStats(rows, NOW, 'week', null);
  assertEquals(d.volume.totalCaptures, 5);
  assertEquals(d.capturedInPeriod, 5);
});

// ═══ deriveStats — horizon hebdomadaire : série & meilleure semaine ════════════

Deno.test('deriveStats — série : trois semaines consécutives comptent trois', () => {
  const rows = [
    run(),
    run({ started_at: new Date(NOW.getTime() - MS_PER_WEEK).toISOString() }),
    run({ started_at: new Date(NOW.getTime() - 2 * MS_PER_WEEK).toISOString() }),
  ];
  const d = deriveStats(rows, NOW, 'week', null);
  assertEquals(d.weekly.streakWeeks, 3);
  assertEquals(ACTIVE_WEEK_MIN_RUNS, 1);
});

Deno.test('deriveStats — série : une semaine sautée casse la série (pas de fabrication)', () => {
  // Semaine en cours + il y a DEUX semaines, mais la semaine dernière est vide.
  const rows = [run(), run({ started_at: new Date(NOW.getTime() - 2 * MS_PER_WEEK).toISOString() })];
  const d = deriveStats(rows, NOW, 'week', null);
  assertEquals(d.weekly.streakWeeks, 1);
});

Deno.test('deriveStats — meilleure semaine de capture : la plus forte, en ignorant les null', () => {
  const rows = [
    run({ celebration: celeb(5) }), // semaine en cours
    run({ started_at: new Date(NOW.getTime() - MS_PER_WEEK).toISOString(), celebration: celeb(1) }),
  ];
  const d = deriveStats(rows, NOW, 'week', null);
  const idx = d.weekly.bestCaptureWeekIndex;
  assertEquals(idx !== null, true);
  assertEquals(d.weekly.weeks[idx as number]?.capturedHexes, 5);
  assertEquals(d.weekly.capturedTotalHexes, 6);
});

Deno.test('deriveStats — un payload hebdo illisible : le total d’horizon devient null', () => {
  const rows = [
    run({ celebration: celeb(5) }),
    run({ started_at: new Date(NOW.getTime() - MS_PER_WEEK).toISOString(), celebration: null }),
  ];
  const d = deriveStats(rows, NOW, 'week', null);
  assertEquals(d.weekly.capturedTotalHexes, null);
});

Deno.test('deriveStats — moyenne : le dénominateur suit les semaines COUVERTES, pas l’horizon', () => {
  // Deux courses la même semaine, compte « vieux » d'une seule semaine :
  // moyenne = 2 / 1, jamais 2 / 12 (qui fabriquerait onze semaines creuses).
  const d = deriveStats([run(), run({ distance_m: 3_000 })], NOW, 'week', null);
  assertEquals(d.weekly.weeks.length, 1);
  assertEquals(d.weekly.avgRunsPerWeek, 2);
});
