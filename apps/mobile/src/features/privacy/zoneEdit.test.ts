/**
 * GRYD — E77 : la décision de déclarer une zone protégée, prouvée.
 *
 * Ce que ces tests gardent, et qui n'est pas cosmétique : une zone protégée est
 * la SEULE chose qui retire le domicile d'un joueur de la trace persistée en
 * base depuis le 28/07. Une décision fausse ici ne produit pas un bug
 * d'affichage — elle laisse une porte d'entrée dans `runs.polyline_masked`.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  PRIVACY_ZONES_MAX,
  PRIVACY_ZONE_RADIUS_MAX_M,
  PRIVACY_ZONE_RADIUS_MIN_M,
} from '@klaim/shared';
import { clampRadiusM, isUsablePoint, slotsLeft, zoneEditPlan } from './zoneEdit.ts';

const PARIS = { lat: 48.8566, lng: 2.3522, radiusM: 300 };

Deno.test('une lecture qui n’a PAS abouti ne décide rien (jamais un défaut)', () => {
  // Le piège que ce test interdit : traiter `null` comme « aucune zone » et
  // écrire sur l'index 0 — donc ÉCRASER une zone existante, c'est-à-dire
  // retirer une protection que le joueur croit active.
  assertEquals(zoneEditPlan(PARIS, null).kind, 'unknown');
  assertEquals(slotsLeft(null), null);
});

Deno.test('aucune zone déclarée : le premier emplacement est proposé', () => {
  const plan = zoneEditPlan(PARIS, []);
  assertEquals(plan.kind, 'write');
  if (plan.kind === 'write') assertEquals(plan.index, 0);
  assertEquals(slotsLeft([]), PRIVACY_ZONES_MAX);
});

Deno.test('les emplacements se remplissent dans les TROUS, pas à la suite', () => {
  // Après suppression de la zone 1, l'écran doit réutiliser l'index 1 — sinon
  // il déborderait de PRIVACY_ZONES_MAX en croyant avoir la place.
  const plan = zoneEditPlan(PARIS, [0, 2]);
  assertEquals(plan.kind, 'write');
  if (plan.kind === 'write') assertEquals(plan.index, 1);
  assertEquals(slotsLeft([0, 2]), 1);
});

Deno.test('trois zones : on REFUSE, et le refus est nommé', () => {
  const plan = zoneEditPlan(PARIS, [0, 1, 2]);
  assertEquals(plan.kind, 'full');
  assertEquals(slotsLeft([0, 1, 2]), 0);
});

Deno.test('un point inexploitable ne devient jamais une zone', () => {
  for (const bad of [
    { lat: NaN, lng: 2.35, radiusM: 300 },
    { lat: 48.85, lng: Infinity, radiusM: 300 },
    { lat: 91, lng: 2.35, radiusM: 300 },
    { lat: 48.85, lng: 181, radiusM: 300 },
    // « null island » : un capteur muet rend souvent (0, 0). Poser une zone là
    // protégerait un point au large du Ghana, et laisserait le domicile nu.
    { lat: 0, lng: 0, radiusM: 300 },
  ]) {
    assertEquals(zoneEditPlan(bad, []).kind, 'no-position', `${bad.lat},${bad.lng}`);
  }
  assertEquals(zoneEditPlan(null, []).kind, 'no-position');
});

Deno.test('un rayon hors bornes est RAMENÉ dans la plage, jamais refusé', () => {
  // Refuser ferait buter le joueur sur un curseur ; les CHECK de 0002 restent
  // le juge, on lui évite seulement un aller-retour incompréhensible.
  assertEquals(clampRadiusM(10), PRIVACY_ZONE_RADIUS_MIN_M);
  assertEquals(clampRadiusM(9000), PRIVACY_ZONE_RADIUS_MAX_M);
  assertEquals(clampRadiusM(NaN), PRIVACY_ZONE_RADIUS_MIN_M);
  assertEquals(clampRadiusM(317.6), 318);
  assertEquals(clampRadiusM(PRIVACY_ZONE_RADIUS_MIN_M), PRIVACY_ZONE_RADIUS_MIN_M);
});

Deno.test('le rayon écrit respecte TOUJOURS les bornes du serveur', () => {
  // Balayage : quelle que soit l'entrée, ce qui part vers la base est dans la
  // plage acceptée par le CHECK de 0002. Sinon l'écran promettrait une zone que
  // le serveur refuse — un bouton qui échoue toujours.
  for (const r of [-100, 0, 1, 199, 200, 350, 500, 501, 5000]) {
    const plan = zoneEditPlan({ ...PARIS, radiusM: r }, []);
    assert(plan.kind === 'write');
    assert(
      plan.radiusM >= PRIVACY_ZONE_RADIUS_MIN_M && plan.radiusM <= PRIVACY_ZONE_RADIUS_MAX_M,
      `rayon ${r} → ${plan.radiusM} hors bornes`,
    );
  }
});

Deno.test('isUsablePoint accepte les coordonnées légitimes des bords du monde', () => {
  assert(isUsablePoint(48.8566, 2.3522));
  assert(isUsablePoint(-33.87, 151.21));
  assert(isUsablePoint(90, 180));
  assert(isUsablePoint(-90, -180));
  // Longitude nulle SEULE reste légitime (Greenwich) : seul (0, 0) est écarté.
  assert(isUsablePoint(51.48, 0));
});
