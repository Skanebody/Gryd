/**
 * GRYD — tests de la micro-démonstration d'onboarding (timeline + géométrie).
 *
 * POURQUOI CES TESTS EXISTENT. Dans l'aperçu headless,
 * `document.visibilityState` vaut "hidden" : `requestAnimationFrame` y produit
 * ZÉRO image par seconde, donc TOUTE animation JS y paraît figée. Une capture
 * d'écran ne prouve RIEN — le piège a déjà été payé trois fois sur ce dépôt.
 * Ce qui est prouvable sans écran l'est donc ici ; ce qui ne l'est pas (que
 * React Native fasse réellement avancer la valeur animée) est signalé comme tel,
 * pas maquillé.
 *
 * Deux familles d'assertions :
 *   · le STORYBOARD demandé (bornes exactes, ordre, monotonie, état final) ;
 *   · les INVARIANTS DE SENS — ce que l'image enseigne doit être la règle du
 *     jeu (rien n'est pris avant que la boucle soit fermée ; une zone ne devient
 *     contestée qu'après l'arrivée d'un rival). Une illustration qui inverserait
 *     ces ordres enseignerait une règle fausse : c'est le seul mensonge qu'un
 *     exemple pédagogique peut commettre en silence.
 */
import {
  assert,
  assertAlmostEquals,
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CAPTURE_BEATS,
  CAPTURE_FINAL,
  CAPTURE_LOOP,
  CAPTURE_PROJ,
  DEMO_BOARD_H,
  DEMO_BOARD_W,
  DEMO_CYCLE_MS,
  DEMO_HOLD_MS,
  DEMO_PLAY_MS,
  RIVAL_LOOP,
  RIVALRY_BEATS,
  RIVALRY_FINAL,
  RIVALRY_PROJ,
  capturePhases,
  demoElapsedMs,
  easeInOut,
  rampAt,
  rivalryPhases,
} from './demoPhases.ts';
import { tracePrefix } from '../map/projectTrace.ts';

// ─── Le storyboard, au millième près ─────────────────────────────────────────

Deno.test('les bornes sont EXACTEMENT celles du storyboard demandé', () => {
  // trace 0-0,8 s · fermeture 0,8-1,5 s · remplissage 1,5-2,1 s · label 2,1-3 s.
  assertEquals(CAPTURE_BEATS.close.from, 800);
  assertEquals(CAPTURE_BEATS.draw.to, 1500);
  assertEquals(CAPTURE_BEATS.close.to, 1500);
  assertEquals(CAPTURE_BEATS.fill.from, 1500);
  assertEquals(CAPTURE_BEATS.fill.to, 2100);
  assertEquals(CAPTURE_BEATS.label.from, 2100);
  assertEquals(CAPTURE_BEATS.label.to, DEMO_PLAY_MS);
  assertEquals(DEMO_PLAY_MS, 3000);
  assertEquals(DEMO_CYCLE_MS, DEMO_PLAY_MS + DEMO_HOLD_MS);
});

Deno.test('les deux cartes partagent la MÊME grammaire de temps', () => {
  // Deux visuels qui se lisent pareil : le label tombe au même moment, et la
  // démonstration dure autant. Sinon les cartes 1 et 2 se lisent comme deux
  // objets différents au lieu d'une même leçon en deux temps.
  assertEquals(RIVALRY_BEATS.label.from, CAPTURE_BEATS.label.from);
  assertEquals(RIVALRY_BEATS.label.to, CAPTURE_BEATS.label.to);
  assertEquals(RIVALRY_BEATS.mine.to, RIVALRY_BEATS.threat.from);
  assertEquals(RIVALRY_BEATS.threat.to, RIVALRY_BEATS.contested.from);
});

// ─── Carte 1 — MÉCANIQUE ─────────────────────────────────────────────────────

Deno.test('à t=0, rien n’est dessiné et RIEN n’est attribué', () => {
  const p = capturePhases(0);
  assertEquals(p.draw, 0);
  assertEquals(p.close, 0);
  assertEquals(p.fill, 0);
  assertEquals(p.label, 0);
  assertEquals(p.head, false);
});

Deno.test('à la fin, l’état est COMPLET et lisible (c’est l’état « mouvement réduit »)', () => {
  // Reduce motion n'affiche pas une animation dégradée ni un écran vide : il
  // affiche cet état — boucle fermée, zone remplie, label posé.
  assertEquals(CAPTURE_FINAL.draw, 1);
  assertEquals(CAPTURE_FINAL.close, 1);
  assertEquals(CAPTURE_FINAL.fill, 1);
  assertEquals(CAPTURE_FINAL.label, 1);
  // Plus personne ne court : le repère de position disparaît.
  assertEquals(CAPTURE_FINAL.head, false);
  assertEquals(RIVALRY_FINAL.mine, 1);
  assertEquals(RIVALRY_FINAL.threat, 1);
  assertEquals(RIVALRY_FINAL.contested, 1);
  assertEquals(RIVALRY_FINAL.label, 1);
});

Deno.test('INVARIANT : aucune zone ne se remplit avant que la boucle soit fermée', () => {
  for (let ms = 0; ms <= DEMO_PLAY_MS; ms += 10) {
    const p = capturePhases(ms);
    if (p.fill > 0) {
      assertEquals(p.draw, 1, `remplissage à ${ms} ms alors que le tracé est à ${p.draw}`);
      assertEquals(p.close, 1, `remplissage à ${ms} ms alors que la boucle n’est pas fermée`);
    }
  }
});

Deno.test('INVARIANT : le label ne tombe qu’une fois la zone entièrement prise', () => {
  for (let ms = 0; ms <= DEMO_PLAY_MS; ms += 10) {
    const p = capturePhases(ms);
    if (p.label > 0) assertEquals(p.fill, 1, `label à ${ms} ms sur une zone incomplète`);
  }
});

Deno.test('le repère de position n’existe QUE pendant la course', () => {
  assertEquals(capturePhases(1).head, true);
  assertEquals(capturePhases(700).head, true);
  assertEquals(capturePhases(1499).head, true);
  assertEquals(capturePhases(1500).head, false);
  assertEquals(capturePhases(2500).head, false);
});

Deno.test('chaque temps est croissant et borné à [0,1] (jamais de marche arrière)', () => {
  let prev = capturePhases(0);
  for (let ms = 0; ms <= DEMO_PLAY_MS; ms += 25) {
    const p = capturePhases(ms);
    for (const k of ['draw', 'close', 'fill', 'label'] as const) {
      assert(p[k] >= 0 && p[k] <= 1, `${k} hors bornes à ${ms} ms : ${p[k]}`);
      assert(p[k] >= prev[k] - 1e-9, `${k} recule à ${ms} ms`);
    }
    prev = p;
  }
});

Deno.test('le tracé part doucement et finit posé (la course n’est pas un trait qui pousse)', () => {
  const at = (frac: number) => capturePhases(CAPTURE_BEATS.draw.to * frac).draw;
  assert(at(0.25) < 0.25, 'le départ n’est pas amorti');
  assert(at(0.75) > 0.75, 'l’arrivée n’est pas amortie');
  assertAlmostEquals(at(0.5), 0.5, 1e-9);
});

// ─── Carte 2 — RIVALITÉ ──────────────────────────────────────────────────────

Deno.test('INVARIANT : on ne menace qu’une zone déjà tenue, on ne conteste qu’après la menace', () => {
  for (let ms = 0; ms <= DEMO_PLAY_MS; ms += 10) {
    const p = rivalryPhases(ms);
    if (p.threat > 0) assertEquals(p.mine, 1, `menace à ${ms} ms sur une zone non tenue`);
    if (p.contested > 0) assertEquals(p.threat, 1, `contestée à ${ms} ms sans rival arrivé`);
    if (p.label > 0) assertEquals(p.contested, 1, `label à ${ms} ms avant la bascule`);
  }
});

Deno.test('la rivalité aussi est monotone et bornée', () => {
  let prev = rivalryPhases(0);
  for (let ms = 0; ms <= DEMO_PLAY_MS; ms += 25) {
    const p = rivalryPhases(ms);
    for (const k of ['mine', 'threat', 'contested', 'label'] as const) {
      assert(p[k] >= 0 && p[k] <= 1, `${k} hors bornes à ${ms} ms`);
      assert(p[k] >= prev[k] - 1e-9, `${k} recule à ${ms} ms`);
    }
    prev = p;
  }
});

// ─── La boucle : jouer, TENIR, repartir ──────────────────────────────────────

Deno.test('le cycle joue la démonstration puis TIENT l’état final avant de repartir', () => {
  assertEquals(demoElapsedMs(0), 0);
  // Fin exacte de la démonstration…
  assertAlmostEquals(demoElapsedMs(DEMO_PLAY_MS / DEMO_CYCLE_MS), DEMO_PLAY_MS, 1e-6);
  // …puis la tenue : la valeur brute continue d'avancer, l'image ne bouge plus.
  assertEquals(demoElapsedMs(0.99), DEMO_PLAY_MS);
  assertEquals(demoElapsedMs(1), DEMO_PLAY_MS);
});

Deno.test('le cycle est linéaire pendant la démonstration (une seule timing, cf. rn-web)', () => {
  const half = DEMO_PLAY_MS / 2 / DEMO_CYCLE_MS;
  assertAlmostEquals(demoElapsedMs(half), DEMO_PLAY_MS / 2, 1e-6);
});

Deno.test('valeurs brutes aberrantes : bornées, jamais de NaN', () => {
  assertEquals(demoElapsedMs(-3), 0);
  assertEquals(demoElapsedMs(42), DEMO_PLAY_MS);
  assertEquals(demoElapsedMs(Number.NaN), 0);
  assertEquals(demoElapsedMs(0.5, 0, 0), 0);
  assert(Number.isFinite(demoElapsedMs(0.5, 1000, 0)));
});

Deno.test('rampAt et easeInOut ne produisent jamais de NaN ni de hors-bornes', () => {
  assertEquals(rampAt(500, { from: 500, to: 500 }), 0);
  assertEquals(rampAt(501, { from: 500, to: 500 }), 1);
  assertEquals(rampAt(Number.NaN, CAPTURE_BEATS.fill), 0);
  assertEquals(easeInOut(-1), 0);
  assertEquals(easeInOut(2), 1);
});

// ─── La géométrie rendue (mêmes constantes que le composant) ─────────────────

Deno.test('la boucle héros se REFERME vraiment sur son point de départ', () => {
  // C'est la promesse de la carte 1 (« ferme une boucle »). Si la géométrie ne
  // se refermait pas, l'animation montrerait un trait ouvert et enseignerait
  // autre chose que la règle du jeu.
  const a = CAPTURE_PROJ.project(CAPTURE_LOOP[0]!);
  const b = CAPTURE_PROJ.project(CAPTURE_LOOP[CAPTURE_LOOP.length - 1]!);
  assert(Math.hypot(b.x - a.x, b.y - a.y) < 6, 'le départ et l’arrivée ne se rejoignent pas');
});

Deno.test('la boucle projetée tient dans le plateau et l’occupe vraiment', () => {
  const pts = CAPTURE_LOOP.map((p) => CAPTURE_PROJ.project(p));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  assert(Math.min(...xs) >= 0 && Math.max(...xs) <= DEMO_BOARD_W, 'débordement horizontal');
  assert(Math.min(...ys) >= 0 && Math.max(...ys) <= DEMO_BOARD_H, 'débordement vertical');
  // Un plateau à moitié vide se lit comme « un petit polygone perdu » (le
  // reproche exact du fondateur) : la boucle doit remplir le cadre.
  assert(Math.max(...xs) - Math.min(...xs) > DEMO_BOARD_W * 0.7, 'la boucle est trop petite');
});

Deno.test('carte 2 : ma zone et la zone d’à côté ne se recouvrent pas', () => {
  const box = (trace: readonly { lat: number; lng: number }[]) => {
    const pts = trace.map((p) => RIVALRY_PROJ.project(p));
    return {
      x0: Math.min(...pts.map((p) => p.x)),
      x1: Math.max(...pts.map((p) => p.x)),
      y0: Math.min(...pts.map((p) => p.y)),
      y1: Math.max(...pts.map((p) => p.y)),
    };
  };
  const mine = box(CAPTURE_LOOP);
  const rival = box(RIVAL_LOOP);
  // Deux zones distinctes, sinon « ta zone » et « la sienne » se confondent.
  assert(rival.x1 < mine.x0 || mine.x1 < rival.x0, 'les deux zones se chevauchent');
  // …mais bien VOISINES : la menace vient d'à côté, pas d'un autre continent.
  const gap = Math.min(Math.abs(mine.x0 - rival.x1), Math.abs(rival.x0 - mine.x1));
  assert(gap < DEMO_BOARD_W * 0.3, 'les zones sont trop éloignées pour se lire comme voisines');
});

Deno.test('à draw=1 la sous-polyligne rendue EST la boucle entière', () => {
  // Le dessin progressif se fait par SOUS-POLYLIGNE (strokeDashoffset n'est pas
  // fiable ici) : à la fin, aucun point ne doit manquer.
  assertEquals(tracePrefix(CAPTURE_LOOP, CAPTURE_FINAL.draw).length, CAPTURE_LOOP.length);
  assert(tracePrefix(CAPTURE_LOOP, 0).length >= 2, 'le prefix minimal reste traçable');
});
