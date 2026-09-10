/**
 * GRYD — LES MESURES D'UNE SORTIE : ce que les splits, l'allure et le dénivelé
 * n'ont pas le droit de raconter.
 *
 * ─── ÉTAPE 0 — le défaut existait ───────────────────────────────────────────
 * Chaque cas ci-dessous cite le mensonge qu'il ferait échouer. Sans cette
 * colonne, rien ne distinguerait ce fichier d'un test qui passe parce qu'il ne
 * demande rien :
 *   · avant ce module, `/course/[id]` affirmait « GRYD n'archive aucun tracé »
 *     alors que `ingest_run` écrit `runs.polyline_masked` (tracePersist.ts) et
 *     `runs.trace_points_2026` (refonte2026.ts:167). Il n'y avait donc NI
 *     split NI courbe, et la seule façon d'en fabriquer aurait été d'étaler
 *     l'allure moyenne sur des kilomètres jamais mesurés ;
 *   · une somme naïve des variations d'altitude fabrique des dizaines de mètres
 *     de dénivelé sur une sortie plate — c'est le « chiffre inventé » type ;
 *   · un module qui accumulerait la distance sur TOUTES les paires de points
 *     produirait un total différent de `runs.distance_m` sous les yeux du
 *     joueur, sur le même écran.
 *
 * ⚠ LA TRACE UTILISÉE ICI EST SYNTHÉTIQUE, ET ELLE NE SORT PAS DE CE FICHIER.
 * Elle sert à vérifier une ARITHMÉTIQUE ; aucune de ces coordonnées n'alimente
 * un écran, un état vide ou une démo (zéro donnée factice, CLAUDE.md).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { activityRules } from '@klaim/shared';
import {
  ELEVATION_NOISE_M,
  SPLIT_DISTANCE_M,
  bestSplitIndex,
  closureGapM,
  elevationFrom,
  hasTiming,
  paceSeries,
  splitsFrom,
  traceTotals,
  type JournalPoint,
} from './metrics.ts';

/**
 * Rayon terrestre du moteur (`features/run/gps/engine/validation.ts`) : le long
 * d'un méridien, la distance haversine vaut exactement `R × Δlat`. Une trace de
 * test construite ainsi a une longueur EXACTE, donc les assertions portent sur
 * l'arithmétique du module et non sur une approximation de projection.
 */
const EARTH_RADIUS_M = 6_371_000;
const DEG_PER_M = 180 / (Math.PI * EARTH_RADIUS_M);

interface TraceOptions {
  readonly metres: number;
  readonly pasM?: number;
  readonly allureSPerKm?: number;
  readonly altitudes?: (index: number) => number;
  readonly departMs?: number;
}

/** Trace DE TEST : ligne droite plein nord, pas régulier, allure constante. */
function traceDeTest(options: TraceOptions): JournalPoint[] {
  const pasM = options.pasM ?? 10;
  const allure = options.allureSPerKm ?? 360; // 6’00/km
  const depart = options.departMs ?? Date.UTC(2026, 8, 10, 8, 0, 0);
  const count = Math.floor(options.metres / pasM);
  const out: JournalPoint[] = [];
  for (let i = 0; i <= count; i++) {
    const alt = options.altitudes?.(i);
    out.push({
      lat: 49.44 + i * pasM * DEG_PER_M,
      lng: 1.1,
      t: depart + Math.round((i * pasM * allure) / 1000) * 1000,
      acc: 5,
      ...(alt === undefined ? {} : { alt }),
    });
  }
  return out;
}

// ─── SPLITS ─────────────────────────────────────────────────────────────────

Deno.test('splits — 3,5 km à allure constante : 3 kilomètres entiers + 1 partiel', () => {
  const splits = splitsFrom(traceDeTest({ metres: 3_500 }), 'run');
  assertEquals(splits.length, 4);
  for (const split of splits.slice(0, 3)) {
    assertEquals(split.complete, true);
    assertEquals(split.distanceM, SPLIT_DISTANCE_M);
    // 6’00/km à ±1 s : la borne du kilomètre tombe entre deux points relevés,
    // l'interpolation la place au prorata de la distance.
    assert(
      Math.abs(split.paceSPerKm - 360) <= 1,
      `allure du km ${split.index} : ${split.paceSPerKm}`,
    );
  }
  const last = splits[3]!;
  assertEquals(last.complete, false);
  assert(Math.abs(last.distanceM - 500) <= 1, `reste : ${last.distanceM} m`);
});

Deno.test('splits — le kilomètre partiel n’est JAMAIS le meilleur km', () => {
  // Le résidu de 200 m est couru deux fois plus vite : une comparaison naïve
  // couronnerait un kilomètre qui n'a pas été couru.
  const points = [
    ...traceDeTest({ metres: 1_000, allureSPerKm: 360 }),
    ...traceDeTest({
      metres: 200,
      allureSPerKm: 180,
      departMs: Date.UTC(2026, 8, 10, 8, 6, 1),
    }).map((p) => ({ ...p, lat: p.lat + 1_000 * DEG_PER_M })),
  ];
  const splits = splitsFrom(points, 'run');
  assert(splits.length >= 2, 'deux splits attendus');
  assertEquals(splits[splits.length - 1]!.complete, false);
  assertEquals(bestSplitIndex(splits), 1);
});

Deno.test('splits — sans horodatage, aucun split (jamais une allure étalée)', () => {
  const geometrie = traceDeTest({ metres: 3_000 }).map(({ lat, lng }) => ({ lat, lng }));
  assertEquals(hasTiming(geometrie), false);
  assertEquals(splitsFrom(geometrie, 'run').length, 0);
  assertEquals(paceSeries(geometrie, 'run').length, 0);
  // La géométrie reste exploitable pour la CARTE : elle a bien une distance.
  assert(traceTotals(geometrie, 'run').distanceM > 2_900);
});

Deno.test('splits — un silence GPS ne compte pas : la convention du serveur', () => {
  const rules = activityRules('run');
  const debut = traceDeTest({ metres: 1_000 });
  const dernier = debut[debut.length - 1]!;
  // Trou plus long que `pointMaxGapS` : `analyzeTrace2026` saute la paire, donc
  // ce module aussi. Sans cette règle, la distance affichée sous les splits
  // dépasserait celle que le serveur a écrite dans `runs.distance_m`.
  const apres = traceDeTest({
    metres: 1_000,
    departMs: dernier.t! + (rules.pointMaxGapS + 60) * 1000,
  }).map((p) => ({ ...p, lat: p.lat + 5_000 * DEG_PER_M }));
  const totals = traceTotals([...debut, ...apres], 'run');
  assert(
    Math.abs(totals.distanceM - 2_000) < 5,
    `le saut ne doit pas être compté : ${totals.distanceM} m`,
  );
});

Deno.test('splits — une pause immobile allonge le kilomètre en cours', () => {
  const debut = traceDeTest({ metres: 500 });
  const dernier = debut[debut.length - 1]!;
  const arret: JournalPoint[] = [
    { ...dernier, t: dernier.t! + 30_000 },
    { ...dernier, t: dernier.t! + 60_000 },
  ];
  const suite = traceDeTest({ metres: 700, departMs: dernier.t! + 63_600 }).map((p) => ({
    ...p,
    lat: p.lat + 500 * DEG_PER_M,
  }));
  const splits = splitsFrom([...debut, ...arret, ...suite], 'run');
  const premier = splits[0]!;
  assertEquals(premier.complete, true);
  // 6’00/km + 60 s d'arrêt : le kilomètre a bien duré 7’00 environ.
  assert(
    premier.paceSPerKm > 400 && premier.paceSPerKm < 430,
    `le temps d'arrêt appartient au split : ${premier.paceSPerKm}`,
  );
});

// ─── COURBE D'ALLURE ────────────────────────────────────────────────────────

Deno.test('allure — à vitesse constante, la courbe est plate (le lissage n’invente rien)', () => {
  const series = paceSeries(traceDeTest({ metres: 2_000 }), 'run');
  assert(series.length >= 8, `échantillons : ${series.length}`);
  for (const sample of series) {
    assert(Math.abs(sample.paceSPerKm - 360) <= 2, `allure lissée : ${sample.paceSPerKm}`);
  }
  // L'axe reste borné par la trace : aucun échantillon hors du parcours.
  assert(series[0]!.distanceM >= 0);
  assert(series[series.length - 1]!.distanceM <= 2_000);
});

Deno.test('allure — une trace plus courte que la fenêtre ne produit pas de courbe', () => {
  assertEquals(paceSeries(traceDeTest({ metres: 120 }), 'run').length, 0);
});

Deno.test('allure — une accélération se voit dans la courbe', () => {
  const lent = traceDeTest({ metres: 1_000, allureSPerKm: 420 });
  const dernier = lent[lent.length - 1]!;
  const rapide = traceDeTest({
    metres: 1_000,
    allureSPerKm: 300,
    departMs: dernier.t! + 1_000,
  }).map((p) => ({ ...p, lat: p.lat + 1_000 * DEG_PER_M }));
  const series = paceSeries([...lent, ...rapide], 'run');
  const debut = series[0]!;
  const fin = series[series.length - 1]!;
  assert(debut.paceSPerKm > fin.paceSPerKm + 60, `${debut.paceSPerKm} → ${fin.paceSPerKm}`);
});

// ─── DÉNIVELÉ ───────────────────────────────────────────────────────────────

Deno.test('dénivelé — sans altitude, aucun profil (et surtout aucun zéro affirmé)', () => {
  const profil = elevationFrom(traceDeTest({ metres: 2_000 }), 'run');
  assertEquals(profil.available, false);
  assertEquals(profil.samples.length, 0);
  assertEquals(profil.minM, null);
});

Deno.test('dénivelé — le bruit du capteur ne fabrique pas de montée', () => {
  // Plat à 40 m, oscillation de ±1 m (2 m crête à crête, sous le seuil de 3 m) :
  // l'hystérésis ne déplace jamais sa référence, donc rien ne monte.
  const bruit = traceDeTest({
    metres: 2_000,
    altitudes: (i) => 40 + (i % 2 === 0 ? 1 : -1),
  });
  const profil = elevationFrom(bruit, 'run');
  assertEquals(profil.available, true);
  assertEquals(Math.round(profil.gainM), 0);
  assertEquals(Math.round(profil.lossM), 0);
});

Deno.test('dénivelé — une vraie côte est comptée, une fois', () => {
  // 200 points, +0,5 m tous les 10 m sur la première moitié puis plat.
  const cote = traceDeTest({
    metres: 2_000,
    altitudes: (i) => 40 + Math.min(i, 100) * 0.5,
  });
  const profil = elevationFrom(cote, 'run');
  assertEquals(profil.available, true);
  assert(Math.abs(profil.gainM - 50) <= ELEVATION_NOISE_M, `gain : ${profil.gainM}`);
  assertEquals(Math.round(profil.lossM), 0);
  assertEquals(profil.minM, 40);
  assertEquals(profil.maxM, 90);
});

// ─── FORME DE LA SORTIE ─────────────────────────────────────────────────────

Deno.test('boucle — l’écart départ/arrivée est une mesure, jamais un verdict', () => {
  const droite = traceDeTest({ metres: 1_000 });
  assert(Math.abs(closureGapM(droite)! - 1_000) < 2);
  const boucle = [...droite, ...droite.slice().reverse().map((p, i) => ({ ...p, t: p.t! + 1 + i }))];
  assert(closureGapM(boucle)! < 2, 'retour au départ');
  assertEquals(closureGapM([{ lat: 49.4, lng: 1.1 }]), null);
});

// ─── MIROIR DU MOTEUR ───────────────────────────────────────────────────────

Deno.test('miroir — la règle d’accumulation est celle de analyzeTrace2026', () => {
  const source = Deno.readTextFileSync(
    new URL('../../../../../packages/engine/src/capture2026.ts', import.meta.url),
  );
  // Les trois conditions de saut du moteur, telles qu'il les écrit. Si l'une
  // change là-bas, ce test échoue ici — et les splits doivent suivre AVANT
  // qu'un joueur ne lise deux totaux différents sur le même écran.
  assert(
    source.includes('current.breakBefore === true || gap <= 0 || gap > maxGapMs'),
    'la règle de saut du moteur a changé : aligner features/journal/metrics.ts',
  );
  assert(
    source.includes('limits.pointMaxGapS'),
    'le moteur ne lit plus pointMaxGapS : aligner la fenêtre des splits',
  );
});

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
};
