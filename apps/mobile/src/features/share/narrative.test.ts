/**
 * GRYD — le moteur narratif ne raconte QUE ce que le serveur a jugé.
 *
 * Le test central est le troisième : une course en mode conquête, jugée,
 * créditée, mais qui n'a RIEN pris, ne doit jamais produire un récit de
 * conquête. C'est exactement le chemin par lequel la card héros
 * « J'AI PRIS {ZONE} · +0 » partait en PNG.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CONQUEST_CLAIMING_STYLES,
  UNJUDGED_VERDICT,
  dominantNarrative,
  styleAllowed,
  styleForNarrative,
  type NarrativeVerdict,
} from './narrative.ts';

/** Verdict jugé + crédité, sur lequel on ne surcharge que ce qui compte. */
function judged(over: Partial<NarrativeVerdict> = {}): NarrativeVerdict {
  return { ...UNJUDGED_VERDICT, judged: true, credited: true, ...over };
}

Deno.test('aucun verdict serveur (hors-ligne) → effort, jamais un récit territorial', () => {
  assertEquals(dominantNarrative(UNJUDGED_VERDICT), 'effort');
  // Même avec des chiffres présents : sans verdict, ils ne veulent rien dire.
  assertEquals(
    dominantNarrative({ ...UNJUDGED_VERDICT, zonesClaimed: 12, zonesStolen: 3 }),
    'effort',
  );
});

Deno.test('§11 course refusée/signalée → effort (rien de festif greffé sur un refus)', () => {
  assertEquals(
    dominantNarrative({ ...UNJUDGED_VERDICT, judged: true, credited: false, zonesClaimed: 9 }),
    'effort',
  );
});

Deno.test('jugé + crédité mais ZÉRO zone → effort (variante sans capture E09)', () => {
  assertEquals(dominantNarrative(judged()), 'effort');
});

Deno.test('ordre de dominance de la planche : capture > reprise > défense > boucle', () => {
  // Tout est vrai en même temps : c'est la capture qui gagne.
  const tout = judged({
    zonesClaimed: 1,
    zonesStolen: 4,
    zonesDefended: 7,
    loopClosed: true,
    enclosedZones: 20,
    crewXp: 90,
    rankKnown: true,
    personalRecord: true,
  });
  assertEquals(dominantNarrative(tout), 'capture');
  assertEquals(dominantNarrative({ ...tout, zonesClaimed: 0 }), 'reprise');
  assertEquals(dominantNarrative({ ...tout, zonesClaimed: 0, zonesStolen: 0 }), 'defense');
  assertEquals(
    dominantNarrative({ ...tout, zonesClaimed: 0, zonesStolen: 0, zonesDefended: 0 }),
    'boucle',
  );
});

Deno.test('suite de dominance : crew > classement > record', () => {
  const base = judged({ crewXp: 40, rankKnown: true, personalRecord: true });
  assertEquals(dominantNarrative(base), 'crew');
  assertEquals(dominantNarrative({ ...base, crewXp: 0 }), 'classement');
  assertEquals(dominantNarrative({ ...base, crewXp: 0, rankKnown: false }), 'record');
});

Deno.test('boucle fermée SANS intérieur gagné n’est pas un récit de boucle', () => {
  // Fermer une boucle qui n'enferme rien n'a rien produit : on n'en fait pas
  // une histoire (le hero d'effort, lui, dit la vérité).
  assertEquals(dominantNarrative(judged({ loopClosed: true, enclosedZones: 0 })), 'effort');
});

Deno.test('chaque récit a un style, et le style d’effort ne prétend rien', () => {
  assertEquals(styleForNarrative('capture'), 'conquete');
  assertEquals(styleForNarrative('reprise'), 'avantApres');
  assertEquals(styleForNarrative('defense'), 'defense');
  assertEquals(styleForNarrative('boucle'), 'boucle');
  assertEquals(styleForNarrative('crew'), 'crew');
  assertEquals(styleForNarrative('classement'), 'classement');
  assertEquals(styleForNarrative('record'), 'simple');
  assertEquals(styleForNarrative('effort'), 'simple');
});

Deno.test('les styles qui AFFIRMENT une conquête sont interdits sans prise jugée', () => {
  for (const s of CONQUEST_CLAIMING_STYLES) {
    assertEquals(styleAllowed(s, UNJUDGED_VERDICT), false, `${s} sans verdict`);
    assertEquals(styleAllowed(s, judged()), false, `${s} avec 0 zone`);
    assertEquals(styleAllowed(s, judged({ zonesClaimed: 1 })), true, `${s} avec 1 prise`);
    assertEquals(styleAllowed(s, judged({ zonesStolen: 1 })), true, `${s} avec 1 reprise`);
    // Créditée = non ; même avec des zones, on ne propose rien d'offensif.
    assertEquals(
      styleAllowed(s, { ...judged({ zonesClaimed: 5 }), credited: false }),
      false,
      `${s} sur une course non créditée`,
    );
  }
});

Deno.test('« Carte » est le seul style TOUJOURS proposable (repli honnête)', () => {
  // Son KPI est la distance mesurée : elle existe dès qu'une course existe.
  assertEquals(styleAllowed('simple', UNJUDGED_VERDICT), true);
  assertEquals(styleAllowed('simple', judged()), true);
  assertEquals(styleAllowed('simple', { ...judged(), credited: false }), true);
});

Deno.test('chaque style exige LA grandeur qu’il affiche en géant (jamais un « +0 » exporté)', () => {
  // Défense : « +0 h · 0 zones tenues » n'a rien à faire dans une story.
  assertEquals(styleAllowed('defense', judged()), false);
  assertEquals(styleAllowed('defense', judged({ zonesDefended: 2 })), true);
  // Boucle : une boucle fermée SANS intérieur gagné n'a produit aucun bonus.
  assertEquals(styleAllowed('boucle', judged({ loopClosed: true, enclosedZones: 0 })), false);
  assertEquals(styleAllowed('boucle', judged({ enclosedZones: 8 })), false, 'sans boucle fermée');
  assertEquals(styleAllowed('boucle', judged({ loopClosed: true, enclosedZones: 8 })), true);
  // Crew : sans XP crew créditée, la card afficherait « +0 POINTS CREW ».
  assertEquals(styleAllowed('crew', judged()), false);
  assertEquals(styleAllowed('crew', judged({ crewXp: 40 })), true);
  // Classement : sans rang connu, le KPI géant serait un « — ».
  assertEquals(styleAllowed('classement', judged()), false);
  assertEquals(styleAllowed('classement', judged({ rankKnown: true })), true);
});

Deno.test('aucun style territorial ne survit à un verdict absent ou non crédité', () => {
  for (const s of ['conquete', 'avantApres', 'carte3d', 'defense', 'boucle', 'crew', 'classement'] as const) {
    assertEquals(styleAllowed(s, UNJUDGED_VERDICT), false, `${s} sans verdict`);
    const tout = judged({
      zonesClaimed: 3,
      zonesStolen: 2,
      zonesDefended: 4,
      loopClosed: true,
      enclosedZones: 9,
      crewXp: 50,
      rankKnown: true,
    });
    assertEquals(styleAllowed(s, { ...tout, credited: false }), false, `${s} non crédité`);
  }
});
