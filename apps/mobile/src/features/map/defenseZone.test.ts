/**
 * GRYD — tests PURS de la logique E22 « Défense · Zone attaquée ».
 *
 * Ce qui est verrouillé ici (chaque test protège une règle d'honnêteté) :
 *  1. E22 ne s'ouvre QUE sur ma zone contestée — jamais sur une zone rivale ni
 *     sur une zone à moi calme.
 *  2. Le compte à rebours est en HEURES, borné à 0, `null` sans source.
 *  3. La couverture rivale est un pourcentage borné, `null` sans source.
 *  4. Une métrique sans source DISPARAÎT (jamais un « 0 » ni un « — »).
 *  5. Le verdict d'alerte crew se traduit en une issue stable, jamais muette.
 *  6. La hauteur de sheet croît avec les blocs réellement rendus.
 *
 * Deno charge le module tel quel (zéro React/RN).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  crewAlertOutcome,
  defenseCoveragePercent,
  defenseHoursRemaining,
  defenseMetricKeys,
  defenseSheetHeight,
  defenseUrgency,
  deriveDefenseView,
  isDefenseZone,
  DEFENSE_IMMINENT_HOURS,
} from './defenseZone.ts';

// ─── 1. Sélection ────────────────────────────────────────────────────────────

Deno.test('isDefenseZone : ma zone contestée ⇒ oui', () => {
  assert(isDefenseZone({ role: 'mine', contested: true }));
});

Deno.test('isDefenseZone : ma zone NON contestée ⇒ non (info sans décision)', () => {
  assertEquals(isDefenseZone({ role: 'mine', contested: false }), false);
});

Deno.test('isDefenseZone : zone rivale, même contestée ⇒ non (c’est E04 « Reprendre »)', () => {
  assertEquals(isDefenseZone({ role: 'rival', contested: true }), false);
  assertEquals(isDefenseZone({ role: 'rival', contested: false }), false);
});

// ─── 2. Échéance en heures ───────────────────────────────────────────────────

Deno.test('defenseHoursRemaining : arrondi au supérieur, en heures', () => {
  const now = new Date('2026-07-26T00:00:00Z');
  // +18 h pile
  assertEquals(defenseHoursRemaining('2026-07-26T18:00:00Z', now), 18);
  // +17 h 01 min → 18 h (jamais annoncer moins que le réel)
  assertEquals(defenseHoursRemaining('2026-07-26T17:01:00Z', now), 18);
});

Deno.test('defenseHoursRemaining : échéance dépassée ⇒ 0, jamais négatif', () => {
  const now = new Date('2026-07-26T12:00:00Z');
  assertEquals(defenseHoursRemaining('2026-07-26T09:00:00Z', now), 0);
});

Deno.test('defenseHoursRemaining : date absente/illisible ⇒ null (pas d’échéance inventée)', () => {
  const now = new Date('2026-07-26T00:00:00Z');
  assertEquals(defenseHoursRemaining(null, now), null);
  assertEquals(defenseHoursRemaining('pas-une-date', now), null);
});

Deno.test('defenseUrgency : ≤ seuil ⇒ imminent (or) ; au-dessus ⇒ normal ; null ⇒ normal', () => {
  assertEquals(defenseUrgency(DEFENSE_IMMINENT_HOURS), 'imminent');
  assertEquals(defenseUrgency(1), 'imminent');
  assertEquals(defenseUrgency(0), 'imminent');
  assertEquals(defenseUrgency(DEFENSE_IMMINENT_HOURS + 1), 'normal');
  assertEquals(defenseUrgency(48), 'normal');
  assertEquals(defenseUrgency(null), 'normal');
});

// ─── 3. Couverture rivale approximative ──────────────────────────────────────

Deno.test('defenseCoveragePercent : fraction → pourcentage entier borné', () => {
  assertEquals(defenseCoveragePercent(0.6), 60);
  assertEquals(defenseCoveragePercent(0.604), 60);
  assertEquals(defenseCoveragePercent(1), 100);
  assertEquals(defenseCoveragePercent(1.4), 100); // borné, jamais « 140 % »
});

Deno.test('defenseCoveragePercent : part nulle ou absente ⇒ null (ligne neutre à la place)', () => {
  assertEquals(defenseCoveragePercent(0), null);
  assertEquals(defenseCoveragePercent(null), null);
  assertEquals(defenseCoveragePercent(Number.NaN), null);
  assertEquals(defenseCoveragePercent(0.004), null); // arrondit à 0 → pas de ligne
});

// ─── 4. Métriques : une source manquante fait DISPARAÎTRE la ligne ──────────

Deno.test('defenseMetricKeys : les deux sourcées ⇒ échéance puis surface', () => {
  assertEquals(defenseMetricKeys({ hoursRemaining: 18, areaKm2: 0.42 }), ['deadline', 'area']);
});

Deno.test('defenseMetricKeys : pas d’échéance ⇒ seule la surface (jamais un « — »)', () => {
  assertEquals(defenseMetricKeys({ hoursRemaining: null, areaKm2: 0.42 }), ['area']);
});

Deno.test('defenseMetricKeys : surface nulle ⇒ seule l’échéance (jamais un « 0 km² »)', () => {
  assertEquals(defenseMetricKeys({ hoursRemaining: 6, areaKm2: 0 }), ['deadline']);
});

Deno.test('defenseMetricKeys : aucune source ⇒ aucune métrique (pas de rangée vide)', () => {
  assertEquals(defenseMetricKeys({ hoursRemaining: null, areaKm2: 0 }), []);
});

// ─── 5. Issue de l’alerte crew ───────────────────────────────────────────────

Deno.test('crewAlertOutcome : ok ⇒ sent', () => {
  assertEquals(crewAlertOutcome({ ok: true }), 'sent');
});

Deno.test('crewAlertOutcome : chaque refus a une issue distincte, jamais muette', () => {
  assertEquals(crewAlertOutcome({ ok: false, reason: 'no_crew' }), 'no_crew');
  assertEquals(crewAlertOutcome({ ok: false, reason: 'cooldown' }), 'cooldown');
  assertEquals(crewAlertOutcome({ ok: false, reason: 'sector_not_allowed' }), 'not_crew_sector');
  assertEquals(crewAlertOutcome({ ok: false, reason: 'sector_unnamed' }), 'not_crew_sector');
  assertEquals(crewAlertOutcome({ ok: false, reason: 'signed_out' }), 'signed_out');
  assertEquals(crewAlertOutcome({ ok: false, reason: 'network' }), 'failed');
  assertEquals(crewAlertOutcome({ ok: false, reason: 'bad_signal' }), 'failed');
  assertEquals(crewAlertOutcome({ ok: false }), 'failed'); // reason absent ⇒ jamais vide
});

// ─── 5bis. Vue dérivée : une seule source pour l’écran ET la hauteur ────────

Deno.test('deriveDefenseView : agrège échéance, urgence, couverture, métriques', () => {
  const now = new Date('2026-07-26T00:00:00Z');
  const view = deriveDefenseView(
    { decayAt: '2026-07-26T18:00:00Z', rivalPercent: 0.6, areaKm2: 0.42 },
    now,
  );
  assertEquals(view.hoursRemaining, 18);
  assertEquals(view.urgency, 'normal');
  assertEquals(view.coveragePercent, 60);
  assertEquals(view.metrics, ['deadline', 'area']);
});

Deno.test('deriveDefenseView : échéance imminente + sans part rivale ⇒ or + ligne neutre', () => {
  const now = new Date('2026-07-26T00:00:00Z');
  const view = deriveDefenseView(
    { decayAt: '2026-07-26T01:00:00Z', rivalPercent: null, areaKm2: 0 },
    now,
  );
  assertEquals(view.hoursRemaining, 1);
  assertEquals(view.urgency, 'imminent');
  assertEquals(view.coveragePercent, null); // → l'écran montre la ligne neutre
  assertEquals(view.metrics, ['deadline']); // surface nulle ⇒ pas de cellule
});

// ─── 6. Hauteur ──────────────────────────────────────────────────────────────

Deno.test('defenseSheetHeight : croît avec chaque bloc réellement rendu', () => {
  const base = defenseSheetHeight({
    metrics: 0,
    hasCoverageLine: false,
    hasUrgencyNote: false,
    hasSecondary: false,
  });
  const withMetrics = defenseSheetHeight({
    metrics: 2,
    hasCoverageLine: false,
    hasUrgencyNote: false,
    hasSecondary: false,
  });
  const full = defenseSheetHeight({
    metrics: 2,
    hasCoverageLine: true,
    hasUrgencyNote: true,
    hasSecondary: true,
  });
  assert(withMetrics > base, 'un bloc de métriques ajoute de la hauteur');
  assert(full > withMetrics, 'couverture + urgence + secondaire ajoutent encore');
  // Un ordre de grandeur cohérent avec un peek de décision (ni ras, ni géant).
  assert(full > 300 && full < 560, `hauteur pleine hors plage : ${full}`);
});
