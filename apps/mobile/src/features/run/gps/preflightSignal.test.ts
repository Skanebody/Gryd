/**
 * GRYD — E19 : ce que l'anneau de précision a le droit d'affirmer.
 *
 * Ces tests verrouillent la seule chose qui compte vraiment sur cet écran :
 * l'app ne prétend JAMAIS connaître une précision qu'elle n'a pas mesurée, et
 * ne peint jamais un départ « propre » sur un signal qui ne l'est pas.
 *
 * Les seuils eux-mêmes (15 m / 30 m) sont testés à leur source
 * (`packages/shared/src/game-rules.test.ts`) : ici on teste la TRADUCTION —
 * qu'aucune des quatre situations réelles ne se confonde avec une autre.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { GPS_READY_ACCURACY_M, GPS_USABLE_ACCURACY_M } from '@klaim/shared';
import {
  PREFLIGHT_PROBE_HINT_MS,
  type PreflightSignal,
  accuracyDigits,
  preflightReadiness,
  probeTakingLong,
  signalGrade,
} from './preflightSignal.ts';

Deno.test('AVANT le premier fix, aucune bande n’est peinte et aucun départ n’est promis', () => {
  for (const signal of [{ kind: 'idle' }, { kind: 'probing' }] as PreflightSignal[]) {
    const r = preflightReadiness(signal);
    assertEquals(r.ring, 'searching', 'un anneau NEUTRE, jamais une bande');
    assertEquals(r.accuracyM, null, 'aucun chiffre : il n’en existe pas encore');
    assertEquals(r.startNow, false);
    assertEquals(r.startAnyway, false);
  }
});

Deno.test('une acquisition en cours n’est JAMAIS confondue avec un mauvais signal', () => {
  // Le piège que la constitution nomme : afficher rouge à l'ouverture revient à
  // affirmer un mauvais GPS sur une mesure qui n'existe pas.
  assert(preflightReadiness({ kind: 'probing' }).ring !== 'poor');
  assert(preflightReadiness({ kind: 'idle' }).ring !== 'poor');
});

Deno.test('bande VERTE : le CTA « DÉMARRER MAINTENANT » et lui seul', () => {
  const r = preflightReadiness({ kind: 'measured', accuracyM: GPS_READY_ACCURACY_M });
  assertEquals(r.ring, 'ready');
  assertEquals(r.accuracyM, GPS_READY_ACCURACY_M);
  assertEquals(r.startNow, true);
  assertEquals(r.startAnyway, false, '§A4 : jamais deux départs peints en même temps');
});

Deno.test('bande ORANGE : le LIEN « Démarrer quand même », jamais le CTA', () => {
  for (const m of [GPS_READY_ACCURACY_M + 0.1, 20, GPS_USABLE_ACCURACY_M]) {
    const r = preflightReadiness({ kind: 'measured', accuracyM: m });
    assertEquals(r.ring, 'usable', `${m} m`);
    assertEquals(r.startNow, false, `${m} m : le CTA promettrait un départ propre`);
    assertEquals(r.startAnyway, true, `${m} m`);
  }
});

Deno.test('bande ROUGE : le LIEN reste peint — jamais le CTA, mais jamais rien non plus', () => {
  // CORRECTIF 27/07. Ce test affirmait l'inverse (« aucun départ peint »), et
  // verrouillait donc une régression de capacité : cet écran étant la porte
  // UNIQUE du départ (`confirmStart` n'a qu'un appelant), un signal > 30 m —
  // canyon urbain, intérieur, premiers fixes d'un démarrage à froid, permission
  // Android « coarse », géoloc Wi-Fi du bundle web — rendait toute sortie
  // impossible à enregistrer. Le filtre §3.2 écarte des POINTS, pas une course.
  for (const m of [GPS_USABLE_ACCURACY_M + 0.1, 45, 1200]) {
    const r = preflightReadiness({ kind: 'measured', accuracyM: m });
    assertEquals(r.ring, 'poor', `${m} m`);
    assertEquals(r.startNow, false, `${m} m : le CTA affirmerait « c’est propre »`);
    assertEquals(r.startAnyway, true, `${m} m : la sortie reste enregistrable`);
    assertEquals(r.accuracyM, m, 'le chiffre RÉEL reste affiché');
  }
});

Deno.test('INVARIANT : un chemin de départ existe TOUJOURS après le premier fix', () => {
  // La règle que la régression du 26/07 avait cassée, énoncée une fois pour
  // toutes : dès qu'une position est arrivée, exactement UNE des deux
  // affordances est peinte. Jamais deux (§A4), jamais zéro (sinon l'écran de
  // départ n'offre plus de départ).
  const measured: PreflightSignal[] = [
    { kind: 'measured', accuracyM: null },
    { kind: 'measured', accuracyM: -1 },
    { kind: 'measured', accuracyM: 0 },
    { kind: 'measured', accuracyM: GPS_READY_ACCURACY_M },
    { kind: 'measured', accuracyM: GPS_READY_ACCURACY_M + 0.1 },
    { kind: 'measured', accuracyM: GPS_USABLE_ACCURACY_M },
    { kind: 'measured', accuracyM: GPS_USABLE_ACCURACY_M + 0.1 },
    { kind: 'measured', accuracyM: 5000 },
    { kind: 'unavailable' },
  ];
  for (const signal of measured) {
    const r = preflightReadiness(signal);
    assertEquals(
      Number(r.startNow) + Number(r.startAnyway),
      1,
      `exactement un départ peint — ${JSON.stringify(signal)}`,
    );
  }
});

Deno.test('capteur indisponible : AUCUN anneau — on ne peint pas ce qui ne mesure rien', () => {
  const r = preflightReadiness({ kind: 'unavailable' });
  assertEquals(r.ring, 'none');
  assertEquals(r.accuracyM, null);
  assertEquals(r.startNow, false, 'le CTA affirmerait « c’est propre » sans mesure');
  assertEquals(r.startAnyway, true, 'et personne n’est enfermé : la sortie reste enregistrable');
});

Deno.test('position reçue SANS précision chiffrée : ni bande, ni recherche, ni chiffre inventé', () => {
  // Vieux Android / source wifi : la position existe, sa précision n'est pas
  // chiffrée. `provider.toRawFix` y substitue 35 m pour le MOTEUR ; ici, une
  // telle substitution afficherait une bande ROUGE mesurée sur un chiffre
  // fabriqué.
  const r = preflightReadiness({ kind: 'measured', accuracyM: null });
  assertEquals(r.ring, 'none');
  assertEquals(r.accuracyM, null);
  assertEquals(r.startNow, false);
  assertEquals(r.startAnyway, true);
});

Deno.test('une précision NÉGATIVE (fix invalide) ne passe jamais pour « ≤ 15 m »', () => {
  const r = preflightReadiness({ kind: 'measured', accuracyM: -1 });
  assertEquals(r.ring, 'none');
  assertEquals(r.startNow, false);
});

Deno.test('signalGrade transmet le grade RÉEL, jamais une supposition', () => {
  assertEquals(signalGrade({ kind: 'measured', accuracyM: 8 }), 'ready');
  assertEquals(signalGrade({ kind: 'measured', accuracyM: 22 }), 'usable');
  assertEquals(signalGrade({ kind: 'measured', accuracyM: 99 }), 'poor');
  assertEquals(signalGrade({ kind: 'measured', accuracyM: null }), 'unknown');
  assertEquals(signalGrade({ kind: 'probing' }), 'unknown');
  assertEquals(signalGrade({ kind: 'idle' }), 'unknown');
  assertEquals(signalGrade({ kind: 'unavailable' }), 'unknown');
});

Deno.test('« ça prend du temps » ne se dit QUE pendant un sondage réellement ouvert', () => {
  const long = PREFLIGHT_PROBE_HINT_MS;
  assertEquals(probeTakingLong({ kind: 'probing' }, long - 1), false);
  assertEquals(probeTakingLong({ kind: 'probing' }, long), true);
  // idle : rien n'a encore été demandé au capteur — on ne lui reproche rien.
  assertEquals(probeTakingLong({ kind: 'idle' }, long * 10), false);
  // La question ne se pose plus une fois qu'on sait.
  assertEquals(probeTakingLong({ kind: 'measured', accuracyM: 12 }, long * 10), false);
  assertEquals(probeTakingLong({ kind: 'unavailable' }, long * 10), false);
});

Deno.test('le chiffre de l’anneau n’affiche JAMAIS un « 0 » nu', () => {
  assertEquals(accuracyDigits(12.4), '12');
  assertEquals(accuracyDigits(12.5), '13');
  assertEquals(accuracyDigits(0.5), '1');
  // Sous le demi-mètre, l'arrondi donnerait « ± 0 m » : une certitude absolue
  // qu'aucun GPS n'a jamais eue.
  assertEquals(accuracyDigits(0.4), '0.4');
  assertEquals(accuracyDigits(0), '0.0');
  assert(!/^0$/.test(accuracyDigits(0.2)));
});

Deno.test('un anneau sans chiffre n’est jamais un anneau coloré (et réciproquement)', () => {
  // Invariant transversal : une bande (ready/usable/poor) implique un chiffre
  // réel, et l'absence de chiffre implique l'absence de bande. Sans lui, une
  // future régression pourrait peindre du vert avec un centre vide.
  const cases: PreflightSignal[] = [
    { kind: 'idle' },
    { kind: 'probing' },
    { kind: 'unavailable' },
    { kind: 'measured', accuracyM: null },
    { kind: 'measured', accuracyM: 3 },
    { kind: 'measured', accuracyM: 18 },
    { kind: 'measured', accuracyM: 120 },
  ];
  for (const signal of cases) {
    const r = preflightReadiness(signal);
    const banded = r.ring === 'ready' || r.ring === 'usable' || r.ring === 'poor';
    assertEquals(banded, r.accuracyM !== null, JSON.stringify(signal));
  }
});
