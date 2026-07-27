/**
 * GRYD — §12 : AUCUNE POSITION EXACTE NE PART VERS LE ROUTEUR TIERS.
 *
 * POURQUOI CE FICHIER EXISTE (27/07/2026). `routeOsrm` écrit les coordonnées à
 * SIX décimales (≈ 0,11 m) dans le CHEMIN de l'URL — journalisable en clair —
 * vers `routing.openstreetmap.de` (FOSSGIS e.V., un tiers). Et le premier
 * waypoint de la rosace EST l'origine (`jitter[0] = 0`). Chaque planification
 * envoyait donc le fix GPS du joueur au décimètre à une infrastructure tierce ;
 * depuis que E16/E17 montent un aperçu de boucle AU MONTAGE, ça partait même
 * sans geste de l'utilisateur.
 *
 * Le remède vit dans `coarseRoutingOrigin`, appelé à la PREMIÈRE ligne de
 * `routeLoop`. Ce test le verrouille SANS RÉSEAU — c'est la seule façon de
 * vérifier une garantie de vie privée : en la rendant vraie sur le papier, pas
 * en espérant qu'un serveur distant se comporte bien.
 *
 * PUR : aucun import React Native, aucun fetch.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { REAL_M_PER_DEG_LAT } from '../map/realAnchors.ts';
import { ROUTING_ORIGIN_DECIMALS, coarseRoutingOrigin } from './liveRouting.ts';

/** Un fix GPS RÉALISTE : ce que `expo-location` rend, décimales comprises. */
const FIX = { lat: 48.8656789, lng: 2.3512345 };

Deno.test('§12 — l’origine envoyée au routeur perd les décimales exploitables', () => {
  const sent = coarseRoutingOrigin(FIX);
  for (const value of [sent.lat, sent.lng]) {
    const decimals = (String(value).split('.')[1] ?? '').length;
    assert(
      decimals <= ROUTING_ORIGIN_DECIMALS,
      `${value} porte ${decimals} décimales — le fix exact fuiterait dans l’URL`,
    );
  }
  // Et ce n'est PAS le fix : sinon l'arrondi ne servirait à rien.
  assert(sent.lat !== FIX.lat || sent.lng !== FIX.lng);
});

Deno.test('§12 — le carreau est assez GROS pour ne désigner aucun domicile', () => {
  // ≥ 100 m de côté en latitude : un pâté de maisons, pas une porte d'entrée.
  const stepDeg = 10 ** -ROUTING_ORIGIN_DECIMALS;
  const stepM = stepDeg * REAL_M_PER_DEG_LAT;
  assert(stepM >= 100, `carreau de ${stepM.toFixed(0)} m — trop fin pour §12`);
  // …et assez PETIT pour que la boucle proposée parte bien d'à côté de toi. Un
  // départ à 1 km serait un bouton qui ment (constitution §2).
  assert(stepM <= 250, `carreau de ${stepM.toFixed(0)} m — la boucle partirait trop loin`);
});

Deno.test('§12 — l’arrondi est DÉTERMINISTE et stable (aucun bruit aléatoire)', () => {
  // Deux appels au même endroit doivent rendre le même carreau : un arrondi qui
  // bougerait à chaque appel donnerait au routeur plusieurs points par sortie,
  // dont la moyenne reconstituerait la position exacte.
  assertEquals(coarseRoutingOrigin(FIX), coarseRoutingOrigin({ ...FIX }));
  // Deux fix à 10 m l'un de l'autre tombent dans le même carreau.
  const dixMetres = 10 / REAL_M_PER_DEG_LAT;
  assertEquals(
    coarseRoutingOrigin({ lat: 48.8650001, lng: 2.3510001 }),
    coarseRoutingOrigin({ lat: 48.8650001 + dixMetres, lng: 2.3510001 }),
  );
});

Deno.test('§12 — l’hémisphère sud et les longitudes négatives sont traités pareil', () => {
  // Un `Math.trunc` au lieu d'un `Math.round` casserait la symétrie et laisserait
  // fuiter plus de précision d'un côté de l'équateur que de l'autre.
  const sud = coarseRoutingOrigin({ lat: -33.8688123, lng: -70.6692987 });
  for (const value of [sud.lat, sud.lng]) {
    const decimals = (String(value).split('.')[1] ?? '').length;
    assert(decimals <= ROUTING_ORIGIN_DECIMALS, `${value} : trop de décimales au sud`);
  }
});
