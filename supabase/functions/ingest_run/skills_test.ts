/**
 * Tests SKILLS (AMENDEMENT-23 §C, doc §28-§29) : catalogue self-contained
 * (8 familles · 3 niveaux · seuils gelés strictement croissants · metric ⊆
 * LifetimeStats · icônes résolues) + dérivation PURE (niveaux 0/I/II/III,
 * ex-aequo au seuil, progression, reco War Room). AUCUN réseau ici.
 *
 * Le catalogue est chargé depuis la SOURCE packages/shared/src/skills.ts (pas
 * de copie _shared/skills.ts : ce catalogue n'est PAS consommé par les Edge
 * Functions ; il est self-contained et sans import runtime → Deno le lit tel
 * quel, comme drift_test.ts lit les sources). La dérivation vient de la copie
 * générée _shared/engine/skills.ts, et les stats de _shared/engine/badges.ts
 * (MÊME source de stats que les badges).
 */
import { assert, assertEquals, assertFalse } from 'jsr:@std/assert@^1';
import {
  SKILL_COUNT,
  SKILL_FAMILY_ORDER,
  SKILL_MAX_LEVEL,
  SKILL_ROMAN,
  SKILLS,
  SKILLS_BY_ID,
  skillIconName,
  type SkillFamilyId,
} from '../../../packages/shared/src/skills.ts';
import { ICONS } from '../../../packages/shared/src/icons.ts';
import {
  deriveSkill,
  deriveSkills,
  rankSkillsForRecommendation,
} from '../_shared/engine/skills.ts';
import { emptyLifetimeStats, type LifetimeStats } from '../_shared/engine/badges.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Stats vierges + surcharges ponctuelles de compteurs. */
function stats(over: Partial<LifetimeStats> = {}): LifetimeStats {
  return { ...emptyLifetimeStats(), ...over };
}

const skill = (id: SkillFamilyId) => SKILLS_BY_ID.get(id)!;

// ─── Catalogue : intégrité structurelle ──────────────────────────────────────

Deno.test('catalogue : 8 familles, ids uniques snake_case, ordre canonique complet', () => {
  assertEquals(SKILL_COUNT, 8);
  assertEquals(SKILLS.length, 8);
  const ids = SKILLS.map((s) => s.id);
  assertEquals(new Set(ids).size, 8, 'ids dupliqués');
  for (const s of SKILLS) {
    assert(/^[a-z_]+$/.test(s.id), `id non snake_case : ${s.id}`);
  }
  // SKILL_FAMILY_ORDER couvre exactement le catalogue.
  assertEquals([...SKILL_FAMILY_ORDER].sort(), [...ids].sort());
  // L'ordre du catalogue suit l'ordre canonique déclaré.
  assertEquals(ids, [...SKILL_FAMILY_ORDER]);
});

Deno.test('catalogue : 3 niveaux I/II/III par famille, noms/romains cohérents', () => {
  for (const s of SKILLS) {
    assertEquals(s.levels.length, SKILL_MAX_LEVEL);
    s.levels.forEach((lvl, i) => {
      assertEquals(lvl.level, i + 1, `niveau attendu ${i + 1} pour ${s.id}`);
      assertEquals(lvl.roman, SKILL_ROMAN[i]);
      assertEquals(lvl.name, `${s.name} ${SKILL_ROMAN[i]}`);
      assert(lvl.requirement.length > 0, `requirement vide : ${s.id} niv ${lvl.level}`);
      // Le seuil apparaît (formaté FR) dans la condition affichée.
      assert(
        lvl.requirement.includes(lvl.threshold.toLocaleString('fr-FR')),
        `requirement sans seuil : ${s.id} → "${lvl.requirement}"`,
      );
    });
  }
});

Deno.test('catalogue : seuils STRICTEMENT croissants (I < II < III)', () => {
  for (const s of SKILLS) {
    const [i, ii, iii] = s.levels.map((l) => l.threshold);
    assert(i! < ii! && ii! < iii!, `seuils non croissants ${s.id} : ${i}/${ii}/${iii}`);
    assert(i! > 0, `seuil I doit être > 0 : ${s.id}`);
  }
});

Deno.test('catalogue : metric ⊆ LifetimeStats et compteur numérique', () => {
  const empty = emptyLifetimeStats();
  for (const s of SKILLS) {
    assert(s.metric in empty, `metric hors LifetimeStats : ${s.id} → ${s.metric}`);
    assertEquals(typeof empty[s.metric], 'number', `metric non numérique : ${s.metric}`);
  }
});

Deno.test('catalogue : Defender = 10/50/150 zones défendues (bornes EXACTES du doc §28)', () => {
  const d = skill('defender');
  assertEquals(d.metric, 'defends');
  assertEquals(d.levels.map((l) => l.threshold), [10, 50, 150]);
});

Deno.test('catalogue : chaque famille mappe le compteur de comportement attendu (doc §28)', () => {
  const expected: Record<SkillFamilyId, string> = {
    defender: 'defends',
    finisher: 'loopRuns',
    scout: 'pioneerHexes',
    route_maker: 'routes',
    conqueror: 'hexesCaptured',
    strategist: 'offensivesJoined',
    supporter: 'crewContributions',
    streak_runner: 'weeksActive',
  };
  for (const s of SKILLS) assertEquals(s.metric, expected[s.id], `metric ${s.id}`);
});

Deno.test('catalogue : icônes résolues dans ICONS + triggers non vides', () => {
  for (const s of SKILLS) {
    assert(s.icon in ICONS, `icône inconnue : ${s.id} → ${s.icon}`);
    assertEquals(skillIconName(s.id), s.icon);
    assert(s.triggers.length >= 1, `aucun déclencheur : ${s.id}`);
    assert(s.role.length > 0, `rôle vide : ${s.id}`);
  }
});

Deno.test('anti pay-to-win : Supporter = crew, aucun compteur territorial', () => {
  const sup = skill('supporter');
  // Le compteur de Supporter est du SOUTIEN (contributions), jamais une prise
  // de terrain (defends/hexesCaptured/steals/pioneerHexes/routes).
  const territorial = ['defends', 'hexesCaptured', 'pioneerHexes', 'routes'];
  assertFalse(territorial.includes(sup.metric), 'Supporter ne doit pas dériver de territoire');
  assertEquals(sup.metric, 'crewContributions');
});

// ─── Dérivation : niveaux atteints ───────────────────────────────────────────

Deno.test('deriveSkill : 0 → verrouillé, progression partant de 0', () => {
  const d = deriveSkill(stats(), skill('defender'));
  assertEquals(d.level, 0);
  assertFalse(d.maxed);
  assertEquals(d.value, 0);
  assertEquals(d.currentThreshold, 0);
  assertEquals(d.nextThreshold, 10);
  assertEquals(d.remaining, 10);
  assertEquals(d.progress, 0);
});

Deno.test('deriveSkill : ex-aequo au seuil = niveau ATTEINT (>=)', () => {
  // Pile 10 défenses → Defender I atteint, prochain 50.
  const at10 = deriveSkill(stats({ defends: 10 }), skill('defender'));
  assertEquals(at10.level, 1);
  assertEquals(at10.currentThreshold, 10);
  assertEquals(at10.nextThreshold, 50);
  assertEquals(at10.progress, 0); // tout juste sur le palier
  assertEquals(at10.remaining, 40);

  // Pile 50 → II. Pile 150 → III (max).
  assertEquals(deriveSkill(stats({ defends: 50 }), skill('defender')).level, 2);
  const iii = deriveSkill(stats({ defends: 150 }), skill('defender'));
  assertEquals(iii.level, 3);
  assert(iii.maxed);
});

Deno.test('deriveSkill : juste SOUS un seuil reste au niveau inférieur', () => {
  assertEquals(deriveSkill(stats({ defends: 9 }), skill('defender')).level, 0);
  assertEquals(deriveSkill(stats({ defends: 49 }), skill('defender')).level, 1);
  assertEquals(deriveSkill(stats({ defends: 149 }), skill('defender')).level, 2);
});

Deno.test('deriveSkill : niveau max III → maxed, nextThreshold null, progress 1', () => {
  const d = deriveSkill(stats({ defends: 10_000 }), skill('defender'));
  assertEquals(d.level, 3);
  assert(d.maxed);
  assertEquals(d.nextThreshold, null);
  assertEquals(d.remaining, 0);
  assertEquals(d.progress, 1);
  assertEquals(d.currentThreshold, 150);
});

Deno.test('deriveSkill : progression LINÉAIRE à l\'intérieur du niveau courant', () => {
  // Finisher : seuils 5/25/100. À 15 boucles → niveau I (>=5, <25),
  // progression (15-5)/(25-5) = 0,5, reste 25-15 = 10.
  const f = deriveSkill(stats({ loopRuns: 15 }), skill('finisher'));
  assertEquals(f.level, 1);
  assertEquals(f.currentThreshold, 5);
  assertEquals(f.nextThreshold, 25);
  assertEquals(f.progress, 0.5);
  assertEquals(f.remaining, 10);
});

Deno.test('deriveSkill : valeurs négatives/absentes bornées à 0', () => {
  // Compteur non alimenté (offensivesJoined = 0) → Strategist verrouillé.
  const strat = deriveSkill(stats(), skill('strategist'));
  assertEquals(strat.value, 0);
  assertEquals(strat.level, 0);
  // Garde-fou : une stat négative (jamais produite en prod) ne casse rien.
  const neg = deriveSkill(stats({ defends: -5 } as Partial<LifetimeStats>), skill('defender'));
  assertEquals(neg.value, 0);
  assertEquals(neg.level, 0);
  assertEquals(neg.progress, 0);
});

// ─── Dérivation : catalogue complet ──────────────────────────────────────────

Deno.test('deriveSkills : dérive les 8 familles en conservant l\'ordre du catalogue', () => {
  const all = deriveSkills(stats(), SKILLS);
  assertEquals(all.length, 8);
  assertEquals(all.map((d) => d.id), [...SKILL_FAMILY_ORDER]);
  for (const d of all) assertEquals(d.level, 0); // joueur vierge
});

Deno.test('deriveSkills : profil réaliste — niveaux mixtes cohérents', () => {
  // Un profil « défenseur/finisher » plausible.
  const all = deriveSkills(
    stats({ defends: 60, loopRuns: 8, hexesCaptured: 120, weeksActive: 5 }),
    SKILLS,
  );
  const byId = new Map(all.map((d) => [d.id, d]));
  assertEquals(byId.get('defender')!.level, 2); // 60 ≥ 50
  assertEquals(byId.get('finisher')!.level, 1); // 8 ≥ 5, < 25
  assertEquals(byId.get('conqueror')!.level, 1); // 120 ≥ 100, < 500
  assertEquals(byId.get('streak_runner')!.level, 1); // 5 ≥ 4, < 12
  assertEquals(byId.get('scout')!.level, 0); // pioneerHexes 0
});

// ─── Reco War Room ───────────────────────────────────────────────────────────

Deno.test('rankSkillsForRecommendation : niveau élevé d\'abord, puis progression', () => {
  const derived = deriveSkills(
    stats({
      defends: 50, // Defender II (level 2, progress 0)
      loopRuns: 20, // Finisher I, progress (20-5)/(25-5)=0,75
      hexesCaptured: 100, // Conqueror I, progress 0
    }),
    SKILLS,
  );
  const ranked = rankSkillsForRecommendation(derived);
  // Defender II domine (niveau le plus haut).
  assertEquals(ranked[0]!.id, 'defender');
  assertEquals(ranked[0]!.level, 2);
  // Parmi les niveaux I, Finisher (0,75) passe devant Conqueror (0).
  const finisherIdx = ranked.findIndex((d) => d.id === 'finisher');
  const conquerorIdx = ranked.findIndex((d) => d.id === 'conqueror');
  assert(finisherIdx < conquerorIdx, 'Finisher (mieux avancé) doit précéder Conqueror');
});

Deno.test('rankSkillsForRecommendation : ex-aequo niveau+progression → ordre catalogue stable', () => {
  // Tous à 0 → même niveau (0) et même progression (0) → ordre du catalogue.
  const ranked = rankSkillsForRecommendation(deriveSkills(stats(), SKILLS));
  assertEquals(ranked.map((d) => d.id), [...SKILL_FAMILY_ORDER]);
});

Deno.test('reco War Room : « Finisher · N restants » se lit depuis la dérivation', () => {
  // Scénario doc §29 : un finisher à qui il « reste » un segment. Ici 22
  // boucles → Finisher I, prochain seuil 25, reste 3 (le libellé UI compose
  // « Finisher I · 3 boucles restantes »).
  const f = deriveSkill(stats({ loopRuns: 22 }), skill('finisher'));
  assertEquals(f.level, 1);
  assertEquals(f.remaining, 3);
  assertEquals(f.nextThreshold, 25);
  assertFalse(f.maxed);
});
