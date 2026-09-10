/**
 * GRYD — TESTS DES MESURES DE L'ÉCRAN DE COURSE (LOT R, 11/09/2026).
 *
 * ═══ ÉTAPE 0 : CE QUE L'ÉCRAN NE SAVAIT PAS MESURER ═════════════════════════
 * `RealCourseLive.tsx` affichait TROIS chiffres et rien d'autre :
 *
 *     <Text style={s.distance}>{(snapshot.distanceM / 1000)…}</Text>
 *     <Text style={s.number}>{clock(snapshot.activeS)}</Text>
 *     <Text style={s.number}>{liveRateDisplay(run.activity, snapshot.paceSPerKm, …).value}</Text>
 *
 * et `snapshot.paceSPerKm` vaut `activeS / km` — l'allure MOYENNE depuis le
 * départ, celle qui ne bouge plus au bout d'une heure. Il n'existait dans tout
 * le dépôt AUCUNE fonction rendant une allure instantanée, une cadence, un
 * dénivelé live ou un tour manuel : chacun des tests ci-dessous échouait par
 * `undefined is not a function`. Les splits, eux, existaient (`splitsFrom`) mais
 * n'avaient qu'un appelant — le détail de sortie, lu le soir.
 *
 * ═══ CE QUE CES TESTS VERROUILLENT, ET QUI EST LE VRAI SUJET ════════════════
 * Pas « le calcul est juste » (les fonctions réutilisées sont déjà testées chez
 * elles), mais « la mesure DISPARAÎT quand elle n'a pas eu lieu ». C'est la loi
 * L8, et c'est la seule chose qu'un écran lu en courant peut trahir sans que
 * personne ne s'en aperçoive : un « 0 » sous un libellé de mesure se lit comme
 * une performance nulle, pas comme une absence.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { GPS_PAUSE_SPEED_MS, LIVE_LAP_MIN_DURATION_S, LIVE_PACE_WINDOW_S } from '@klaim/shared';
import {
  cadenceSpm,
  canMarkLap,
  journalPointsFrom,
  lapsFrom,
  lastCompleteSplit,
  liveElevationGainM,
  livePaceSPerKm,
  liveSplits,
} from './liveMetrics2026.ts';
import { cleanTrace, smoothTrace, type CleanFix } from './engine/gps.ts';

// ─── Fabrique de traces ──────────────────────────────────────────────────────
//
// Plein est à latitude constante (Rouen) : la conversion mètres → degrés est
// exacte au premier ordre, donc une distance demandée est celle que mesure la
// haversine du moteur. Rien n'est tiré au hasard.

const EARTH_RADIUS_M = 6_371_000;
const RAD_PER_DEG = Math.PI / 180;
const ORIGINE = { lat: 49.4431, lng: 1.0993 };
const COS_LAT0 = Math.cos(ORIGINE.lat * RAD_PER_DEG);
const MS_PER_S = 1_000;
/** 11 septembre 2026, 07:00 UTC — date fixe, jamais `Date.now()`. */
const T0 = Date.UTC(2026, 8, 11, 7, 0, 0);

function fix(xM: number, tS: number, extra: Partial<CleanFix> = {}): CleanFix {
  return {
    lat: ORIGINE.lat,
    lng: ORIGINE.lng + xM / (RAD_PER_DEG * EARTH_RADIUS_M * COS_LAT0),
    ts: T0 + Math.round(tS * MS_PER_S),
    accuracy: 5,
    ...extra,
  };
}

/** `n` relevés à 1 Hz, à `speedMs` m/s, avec une altitude optionnelle. */
function ligne(n: number, speedMs: number, alt?: (i: number) => number): CleanFix[] {
  const out: CleanFix[] = [];
  for (let i = 0; i < n; i++) {
    out.push(fix(i * speedMs, i, alt === undefined ? {} : { alt: alt(i) }));
  }
  return out;
}

const finTs = (points: readonly CleanFix[]): number => points[points.length - 1]!.ts;

// ════════════════════════════════════════════════════════════════════════════
// 1. ALLURE INSTANTANÉE — elle bouge, et elle disparaît à l'arrêt
// ════════════════════════════════════════════════════════════════════════════

Deno.test('allure instantanée : elle mesure la FENÊTRE, pas toute la sortie', () => {
  // Dix minutes à 2 m/s (8'20/km), puis quinze secondes à 4 m/s (4'10/km).
  const lent = ligne(600, 2);
  const rapide: CleanFix[] = [];
  const depart = 600 * 2;
  for (let i = 1; i <= LIVE_PACE_WINDOW_S; i++) {
    rapide.push(fix(depart + i * 4, 599 + i));
  }
  const trace = [...lent, ...rapide];
  const instant = livePaceSPerKm(trace, finTs(trace));
  assert(instant !== null, 'la fenêtre contient deux relevés : l’allure est mesurable');
  // ~250 s/km. La moyenne de la sortie, elle, vaut encore ~497 s/km : c'est
  // exactement l'écart que l'ancien bandeau ne montrait jamais.
  assert(Math.abs(instant - 250) < 15, `allure instantanée attendue ~250 s/km, obtenue ${instant}`);
});

Deno.test('allure instantanée : à l’arrêt, elle DISPARAÎT (jamais « 47’12 »)', () => {
  // Le coureur est au feu rouge : le capteur dérive de quelques centimètres.
  const trace = [...ligne(60, 3), fix(180.02, 61), fix(180.05, 62), fix(180.03, 75)];
  const instant = livePaceSPerKm(trace, finTs(trace));
  assertEquals(instant, null,
    'sous GPS_PAUSE_SPEED_MS le moteur nous dit arrêtés : l’écran n’affiche pas d’allure');
  assert(GPS_PAUSE_SPEED_MS > 0, 'le seuil vient de game-rules, jamais d’un nombre posé ici');
});

Deno.test('allure instantanée : au tout premier relevé, il n’y a rien à dire', () => {
  assertEquals(livePaceSPerKm([], T0), null, 'trace vide');
  assertEquals(livePaceSPerKm([fix(0, 0)], T0), null, 'un seul point ne fait pas une vitesse');
});

Deno.test('allure instantanée : un trou de signal ne devient pas de la vitesse', () => {
  // Deux tronçons séparés par une coupure attestée : les 400 m qui les séparent
  // n'ont JAMAIS été mesurés. Les compter donnerait une allure de champion.
  const trace: CleanFix[] = [
    fix(0, 0), fix(3, 1), fix(6, 2),
    { ...fix(406, 3), gapBefore: true }, { ...fix(409, 4) },
  ];
  const instant = livePaceSPerKm(trace, finTs(trace));
  assert(instant !== null && instant > 200,
    'le saut de 400 m ne doit pas produire une allure de 2 s/km');
});

// ════════════════════════════════════════════════════════════════════════════
// 2. SPLITS — les mêmes objets que le journal, pendant la course
// ════════════════════════════════════════════════════════════════════════════

Deno.test('splits : un kilomètre bouclé donne un split complet', () => {
  // 1 200 m à 3 m/s → un km complet (333 s) + un résidu de 200 m.
  const trace = ligne(401, 3);
  const splits = liveSplits(trace, 'run');
  assert(splits.length >= 1, 'un kilomètre parcouru donne au moins un split');
  const premier = splits[0]!;
  assertEquals(premier.complete, true, 'le premier kilomètre est complet');
  assert(Math.abs(premier.paceSPerKm - 333) < 5, `allure du km attendue ~333 s/km, obtenue ${premier.paceSPerKm}`);
});

Deno.test('splits : le dernier kilomètre COMPLET ignore le kilomètre entamé', () => {
  const trace = ligne(401, 3); // 1 200 m : un km complet + 200 m entamés
  const splits = liveSplits(trace, 'run');
  const dernier = lastCompleteSplit(splits);
  assert(dernier !== null, 'un kilomètre entier a été bouclé');
  assertEquals(dernier.complete, true, 'on n’annonce jamais un résidu comme un split');
  assertEquals(dernier.index, 1, 'c’est bien le 1er km, pas le 2ᵉ entamé');
});

Deno.test('splits : avant le premier kilomètre, il n’y a aucun split COMPLET', () => {
  const trace = ligne(100, 3); // 297 m
  assertEquals(lastCompleteSplit(liveSplits(trace, 'run')), null,
    'aucun kilomètre bouclé ⇒ rien à annoncer (jamais un « 1er km » extrapolé)');
});

// ════════════════════════════════════════════════════════════════════════════
// 3. DÉNIVELÉ — mesuré s'il y a une source, absent sinon
// ════════════════════════════════════════════════════════════════════════════

/**
 * Le D+ se lit sur la trace TELLE QUE LE SNAPSHOT LA CALCULE : nettoyée puis
 * lissée. C'est `smoothTrace` qui moyenne l'altitude sur
 * `ELEVATION_SMOOTH_WINDOW_S` — la mesurer sur les fixes bruts, ici, testerait
 * un chemin que l'écran n'emprunte jamais.
 */
const pipeline = (fixes: readonly CleanFix[]): CleanFix[] =>
  smoothTrace(cleanTrace(fixes, 'run').points);

Deno.test('dénivelé : sans altitude dans la trace, il n’existe pas', () => {
  assertEquals(liveElevationGainM(pipeline(ligne(200, 3)), 'run'), null,
    'une plateforme sans altimètre ne doit pas produire « 0 m D+ »');
});

Deno.test('dénivelé : une vraie montée est comptée', () => {
  // 200 relevés, +0,5 m par relevé = +99,5 m réels.
  const gain = liveElevationGainM(pipeline(ligne(200, 3, (i) => 100 + i * 0.5)), 'run');
  assert(gain !== null, 'la trace porte une altitude : le D+ est mesurable');
  assert(gain > 80 && gain < 100, `D+ attendu ~99 m (hystérésis comprise), obtenu ${gain}`);
});

Deno.test('dénivelé : le bruit d’altitude à plat ne fabrique AUCUN relief', () => {
  // ÉTAPE 0 DU LOT : sortie parfaitement plate de 900 m, altitude oscillant de
  // ±2 m (4 m crête à crête — ce qu'un GPS de téléphone produit couramment).
  // Chaque oscillation franchit l'hystérésis de 3 m : le D+ annoncé valait
  // **596 m**, sur une trace où personne n'avait monté un seul mètre. C'est
  // `ELEVATION_SMOOTH_WINDOW_S`, appliqué dans `smoothTrace`, qui referme ça —
  // donc AUSSI pour le détail de sortie, qui relit la même altitude archivée.
  const gain = liveElevationGainM(
    pipeline(ligne(300, 3, (i) => 100 + (i % 2 === 0 ? 2 : -2))),
    'run',
  );
  assert(gain !== null, 'la trace porte bien une altitude');
  assert(gain < 5, `une sortie plate doit rendre ~0 m de D+, obtenu ${gain}`);
});

// ════════════════════════════════════════════════════════════════════════════
// 4. CADENCE — une mesure, ou rien
// ════════════════════════════════════════════════════════════════════════════

Deno.test('cadence : sans podomètre, elle n’existe pas (jamais « 0 spm »)', () => {
  assertEquals(cadenceSpm([], T0), null, 'aucun échantillon = aucun capteur');
  assertEquals(cadenceSpm([{ ts: T0, steps: 0 }], T0), null, 'un seul échantillon ne fait pas une cadence');
});

Deno.test('cadence : 90 pas en 30 s font 180 pas/minute', () => {
  const samples = [
    { ts: T0, steps: 0 },
    { ts: T0 + 15_000, steps: 45 },
    { ts: T0 + 30_000, steps: 90 },
  ];
  const spm = cadenceSpm(samples, T0 + 30_000);
  assert(spm !== null, 'deux échantillons dans la fenêtre : la cadence est mesurable');
  assertEquals(Math.round(spm), 180, 'cadence de course typique');
});

Deno.test('cadence : un podomètre qui a tourné sans compter rend bien ZÉRO', () => {
  // C'est une MESURE, pas une absence : la signature d'un déplacement non
  // pédestre (cf. motionIntegrity.ts, qui l'envoie au serveur pour ça).
  const samples = [
    { ts: T0, steps: 12 },
    { ts: T0 + 30_000, steps: 12 },
  ];
  assertEquals(cadenceSpm(samples, T0 + 30_000), 0, 'zéro pas mesuré est un zéro légitime');
});

Deno.test('cadence : la fenêtre garde sa borne gauche hors fenêtre', () => {
  // Le podomètre n'émet pas à intervalle régulier : un seul relevé peut tomber
  // dans les 30 dernières secondes. Sans la borne antérieure, la cadence
  // disparaîtrait alors qu'on sait exactement combien de pas ont été faits.
  const samples = [
    { ts: T0, steps: 0 },
    { ts: T0 + 40_000, steps: 120 },
  ];
  const spm = cadenceSpm(samples, T0 + 40_000);
  assert(spm !== null, 'la borne gauche antérieure à la fenêtre est retenue');
  assertEquals(Math.round(spm), 180, '120 pas en 40 s = 180 spm');
});

// ════════════════════════════════════════════════════════════════════════════
// 5. TOURS MANUELS — le « lap » d'INTVL
// ════════════════════════════════════════════════════════════════════════════

Deno.test('tours : sans aucune marque, la sortie est UN seul tour en cours', () => {
  const trace = ligne(100, 3);
  const laps = lapsFrom(trace, [], finTs(trace));
  assertEquals(laps.length, 1, 'un tour implicite : celui qui court depuis le départ');
  assertEquals(laps[0]!.closed, false, 'il n’est pas bouclé, et l’écran doit le dire');
});

Deno.test('tours : deux marques découpent trois tours, et la somme retombe juste', () => {
  const trace = ligne(301, 3); // 900 m en 300 s
  const laps = lapsFrom(trace, [T0 + 100_000, T0 + 200_000], finTs(trace));
  assertEquals(laps.length, 3, 'départ → marque 1 → marque 2 → maintenant');
  assertEquals(laps.map((l) => l.closed), [true, true, false], 'seul le dernier est ouvert');
  const total = laps.reduce((sum, l) => sum + l.distanceM, 0);
  // La somme des tours ne peut pas dépasser la sortie : les tours se lisent sur
  // la MÊME trace, jamais sur un compteur séparé.
  assert(Math.abs(total - 900) < 5, `somme des tours attendue ~900 m, obtenue ${total}`);
  for (const lap of laps) assert(Math.abs(lap.distanceM - 300) < 5, 'trois tours de 300 m');
});

Deno.test('tours : un double appui ne crée pas un tour de 0,2 s', () => {
  const trace = ligne(301, 3);
  const rebond = T0 + 100_000;
  const laps = lapsFrom(trace, [rebond, rebond + 200], finTs(trace));
  assertEquals(laps.length, 2, 'la seconde marque, trop rapprochée, est ignorée');
});

Deno.test('tours : le bouton se DÉSACTIVE pendant le plancher, il ne refuse pas en silence', () => {
  const marque = T0 + 60_000;
  assertEquals(canMarkLap(T0, [marque], marque + 1_000), false, 'trop tôt : bouton désactivé');
  assertEquals(
    canMarkLap(T0, [marque], marque + LIVE_LAP_MIN_DURATION_S * MS_PER_S),
    true,
    'au plancher exactement, le tour est recevable',
  );
  assertEquals(canMarkLap(T0, [], T0 + 1_000), false, 'le plancher court aussi depuis le DÉPART');
});

// ════════════════════════════════════════════════════════════════════════════
// 6. LA TRADUCTION DE VOCABULAIRE — une seule fois, sans perdre les ruptures
// ════════════════════════════════════════════════════════════════════════════

Deno.test('traduction : ts → t, accuracy → acc, gapBefore → breakBefore, alt conservée', () => {
  const points = journalPointsFrom([
    fix(0, 0, { alt: 120.5 }),
    { ...fix(3, 1), gapBefore: true },
  ]);
  assertEquals(points[0], { lat: ORIGINE.lat, lng: points[0]!.lng, t: T0, acc: 5, alt: 120.5 });
  assertEquals(points[1]!.breakBefore, true,
    'une rupture perdue ici ferait compter à un split les mètres d’un trou de signal');
  assert(!('alt' in points[1]!), 'un relevé sans altitude n’en reçoit pas une');
});
