/**
 * GRYD — tests du widget « Mon territoire » (fondation pure, spec fondateur).
 * Verrouille : la PRIORITÉ STRICTE (l'ordre de la spec est une règle, pas un
 * détail), la règle 1 état = 1 action, le français des km² et l'interdiction
 * d'inventer un nom de zone (null → « Zone »).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  buildWidgetView,
  formatKm2,
  selectWidgetState,
  type TerritoryWidgetInput,
  type UserTerritoryContext,
  type WidgetState,
} from './territoryWidget.ts';

const CALME: UserTerritoryContext = {
  hasCapturedTerritory: true,
  recentlyLostTerritory: false,
  activeAttack: false,
  incompleteLoop: false,
  urgentCrewRequest: false,
  recentShareworthyCapture: false,
  closeToNextRank: false,
};

const INPUT: TerritoryWidgetInput = {
  controlledAreaM2: 740_000,
  territoryCount: 8,
  localRank: 6,
  localRankAreaLabel: 'Paris Est',
  displayName: 'République',
  rivalName: 'Lena',
  estimatedRunDistanceM: 3200,
  remainingLoopDistanceM: 420,
  eventAreaM2: 140_000,
  minutesSinceEvent: 18,
};

Deno.test('priorité : jamais capturé prime sur TOUT (même une attaque active)', () => {
  assertEquals(
    selectWidgetState({
      ...CALME,
      hasCapturedTerritory: false,
      activeAttack: true,
      recentlyLostTerritory: true,
    }),
    'first_capture',
  );
});

Deno.test('priorité : l’ordre STRICT de la spec, testé cran par cran', () => {
  // Tous les signaux allumés → le plus prioritaire gagne, puis on l'éteint.
  const tout: UserTerritoryContext = {
    hasCapturedTerritory: true,
    recentlyLostTerritory: true,
    activeAttack: true,
    incompleteLoop: true,
    urgentCrewRequest: true,
    recentShareworthyCapture: true,
    closeToNextRank: true,
  };
  const ordre: [keyof UserTerritoryContext, WidgetState][] = [
    ['recentlyLostTerritory', 'territory_lost'],
    ['activeAttack', 'under_attack'],
    ['incompleteLoop', 'loop_incomplete'],
    ['urgentCrewRequest', 'crew_help'],
    ['recentShareworthyCapture', 'share_moment'],
    ['closeToNextRank', 'rank_progress'],
  ];
  const ctx = { ...tout };
  for (const [signal, attendu] of ordre) {
    assertEquals(selectWidgetState(ctx), attendu, `attendu ${attendu}`);
    ctx[signal] = false;
  }
  assertEquals(selectWidgetState(ctx), 'stable');
});

Deno.test('règle : 1 widget = 1 action — chaque état rend UN CTA, ≤ 2 lignes + titre', () => {
  const states: WidgetState[] = [
    'first_capture',
    'territory_lost',
    'under_attack',
    'loop_incomplete',
    'crew_help',
    'share_moment',
    'rank_progress',
    'stable',
  ];
  for (const state of states) {
    const v = buildWidgetView(state, INPUT);
    assertEquals(v.state, state);
    assert(v.title.length > 0, `${state} : titre vide`);
    assert(v.ctaLabel.length > 0, `${state} : CTA vide`);
    assert(v.lines.length <= 2, `${state} : ${v.lines.length} lignes (max 2 — pas dix KPI)`);
    // Jamais de vocabulaire technique interdit par la spec.
    const texte = [v.title, ...v.lines, v.ctaLabel].join(' ');
    assert(!/cellule|points|XP|calorie/i.test(texte), `${state} : vocabulaire interdit`);
  }
});

Deno.test('copie : les états clés collent à la spec mot à mot', () => {
  const lost = buildWidgetView('territory_lost', INPUT);
  assertEquals(lost.title, 'LENA A REPRIS RÉPUBLIQUE');
  assertEquals(lost.lines[0], 'Perdue il y a 18 min');
  assertEquals(lost.ctaLabel, 'LA REPRENDRE');

  const attack = buildWidgetView('under_attack', INPUT);
  assertEquals(attack.title, 'RÉPUBLIQUE SOUS PRESSION');
  assertEquals(attack.lines[0], '0,14 km² menacés');
  assertEquals(attack.lines[1], '3,2 km pour défendre');
  assertEquals(attack.ctaLabel, 'DÉFENDRE');

  const loop = buildWidgetView('loop_incomplete', INPUT);
  assertEquals(loop.lines[0], 'Il manque 420 m à République.');
  assertEquals(loop.ctaLabel, 'TERMINER');

  const stable = buildWidgetView('stable', INPUT);
  assertEquals(stable.lines[0], '0,74 km² · 8 zones');
  assertEquals(stable.lines[1], '#6 Paris Est');
});

Deno.test('honnêteté : displayName null → « Zone », rival null → formulation neutre, rang null → masqué', () => {
  const anonyme: TerritoryWidgetInput = {
    ...INPUT,
    displayName: null,
    rivalName: null,
    localRank: null,
    localRankAreaLabel: null,
  };
  const lost = buildWidgetView('territory_lost', anonyme);
  assertEquals(lost.title, 'ZONE A ÉTÉ REPRISE');
  const stable = buildWidgetView('stable', anonyme);
  assertEquals(stable.lines.length, 1, 'sans classement réel, pas de ligne #rang inventée');
  assert(!stable.lines[0]!.includes('#'), 'aucun rang fabriqué');
});

Deno.test('formatKm2 : français, jamais de cellules', () => {
  assertEquals(formatKm2(740_000), '0,74 km²');
  assertEquals(formatKm2(140_000), '0,14 km²');
  assertEquals(formatKm2(12_345_678), '12,3 km²');
});

Deno.test('données manquantes : les lignes optionnelles disparaissent, jamais « undefined »', () => {
  const vide: TerritoryWidgetInput = {
    controlledAreaM2: 0,
    territoryCount: 0,
    localRank: null,
    localRankAreaLabel: null,
    displayName: null,
    rivalName: null,
    estimatedRunDistanceM: null,
    remainingLoopDistanceM: null,
    eventAreaM2: null,
    minutesSinceEvent: null,
  };
  for (const state of ['first_capture', 'territory_lost', 'share_moment'] as const) {
    const v = buildWidgetView(state, vide);
    const texte = [v.title, ...v.lines].join(' ');
    assert(!/undefined|null|NaN/.test(texte), `${state} : fuite de valeur manquante`);
  }
});
