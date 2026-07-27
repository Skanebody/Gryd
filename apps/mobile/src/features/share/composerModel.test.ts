/**
 * GRYD — ce que le compositeur de partage n'a pas le droit de faire.
 *
 * Deux propriétés gardées ici, parce qu'elles sortent de l'app dans un PNG :
 *   1. `APPLIQUER` ne peut pas déclarer avoir appliqué ce qui n'a pas changé
 *      (sinon `share_customize_applied` compte des réglages fantômes) ;
 *   2. le badge « Protégé » ne peut pas revendiquer une protection que l'état
 *      courant ne tient pas — en particulier un masquage de départ/arrivée sur
 *      une carte qui ne publie AUCUN tracé, ou des zones privées que le joueur
 *      n'a aucun moyen de déclarer aujourd'hui.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  CUSTOMIZE_SECTIONS,
  changedSections,
  protectionLines,
  type ComposerDraft,
} from './composerModel.ts';

const BASE: ComposerDraft = {
  ratio: 'story',
  style: 'auto',
  hero: 'auto',
  showChallenge: true,
  showContext: true,
  maskEndpoints: true,
};

Deno.test('la section PHOTO n’est pas peinte (app.json ne la couvre pas)', () => {
  assertEquals(CUSTOMIZE_SECTIONS.length, 5);
  assert(!CUSTOMIZE_SECTIONS.includes('media' as never));
  assertEquals([...CUSTOMIZE_SECTIONS], ['format', 'style', 'data', 'text', 'privacy']);
});

Deno.test('aucun changement ⇒ aucune section appliquée', () => {
  assertEquals(changedSections(BASE, { ...BASE }), []);
});

Deno.test('chaque champ remonte SA section, et une seule', () => {
  assertEquals(changedSections(BASE, { ...BASE, ratio: 'square' }), ['format']);
  assertEquals(changedSections(BASE, { ...BASE, style: 'conquete' }), ['style']);
  assertEquals(changedSections(BASE, { ...BASE, hero: 'surface' }), ['data']);
  assertEquals(changedSections(BASE, { ...BASE, showChallenge: false }), ['text']);
  assertEquals(changedSections(BASE, { ...BASE, showContext: false }), ['text']);
  assertEquals(changedSections(BASE, { ...BASE, maskEndpoints: false }), ['privacy']);
});

Deno.test('les deux réglages de texte ne comptent qu’UNE section', () => {
  assertEquals(
    changedSections(BASE, { ...BASE, showChallenge: false, showContext: false }),
    ['text'],
  );
});

Deno.test('l’ordre des sections changées suit CUSTOMIZE_SECTIONS', () => {
  const all = changedSections(BASE, {
    ratio: 'feed',
    style: 'defense',
    hero: 'zones',
    showChallenge: false,
    showContext: false,
    maskEndpoints: false,
  });
  assertEquals([...all], [...CUSTOMIZE_SECTIONS]);
});

// ─── Badge « Protégé » ──────────────────────────────────────────────────────

Deno.test('sans tracé publié, RIEN de géométrique n’est promis', () => {
  const lines = protectionLines({
    routePublished: false,
    maskEndpoints: true,
    declaredZones: 0,
  });
  assert(!lines.includes('endpoints'), 'un masquage ne peut pas masquer un tracé absent');
  assert(!lines.includes('simplify'));
  assert(!lines.includes('zonesApplied'));
  assertEquals([...lines], ['noRoute', 'noClock']);
});

Deno.test('masquage désactivé ⇒ le détail ne revendique pas les extrémités', () => {
  const lines = protectionLines({
    routePublished: true,
    maskEndpoints: false,
    declaredZones: 0,
  });
  assert(!lines.includes('endpoints'));
  // La simplification, elle, n'est PAS un réglage : elle reste due.
  assert(lines.includes('simplify'));
});

Deno.test('zéro zone déclarée ⇒ on l’AVOUE, on ne revendique pas une exclusion', () => {
  const lines = protectionLines({
    routePublished: true,
    maskEndpoints: true,
    declaredZones: 0,
  });
  assert(lines.includes('zonesNone'));
  assert(!lines.includes('zonesApplied'));
});

Deno.test('des zones réelles ⇒ la ligne d’exclusion devient légitime', () => {
  const lines = protectionLines({
    routePublished: true,
    maskEndpoints: true,
    declaredZones: 2,
  });
  assert(lines.includes('zonesApplied'));
  assert(!lines.includes('zonesNone'));
  assertEquals([...lines], ['endpoints', 'simplify', 'zonesApplied', 'noClock']);
});

Deno.test('aucune heure d’horloge, dans tous les états', () => {
  for (const routePublished of [true, false]) {
    for (const maskEndpoints of [true, false]) {
      for (const declaredZones of [0, 3]) {
        assert(
          protectionLines({ routePublished, maskEndpoints, declaredZones }).includes('noClock'),
        );
      }
    }
  }
});
