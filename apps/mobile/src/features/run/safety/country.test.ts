/**
 * GRYD — E25 : LA POSITION QUI SORT DE L'APPAREIL EST ARRONDIE, ET ON LE PROUVE.
 *
 * `countryIsoAt` fait un appel réseau, donc il n'est pas testable ici sans
 * fabriquer un serveur. Ce qui EST testable — et qui est la seule garantie de
 * vie privée que ce module offre — c'est l'arrondi appliqué aux coordonnées
 * AVANT qu'elles ne quittent le téléphone. Il est isolé exprès pour ça.
 *
 * Le défaut corrigé le 27/07 : la latitude et la longitude en pleine précision
 * du coureur EN COURS DE SORTIE partaient vers `nominatim.openstreetmap.org`,
 * pendant que le docblock du même fichier écrivait « Aucune position n'est
 * stockée ni transmise ailleurs ».
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { COUNTRY_LOOKUP_DECIMALS, coarseForCountryLookup } from './country.ts';

Deno.test('la position envoyée est arrondie au dixième de degré (~11 km)', () => {
  assertEquals(COUNTRY_LOOKUP_DECIMALS, 1);
  assertEquals(coarseForCountryLookup(48.856_614), 48.9);
  assertEquals(coarseForCountryLookup(2.352_222), 2.4);
  assertEquals(coarseForCountryLookup(-0.049_9), -0.0);
  assertEquals(coarseForCountryLookup(0), 0);
});

Deno.test('aucune coordonnée ne garde plus d’une décimale une fois arrondie', () => {
  // La forme du test importe : ce n'est pas « la valeur attendue » qu'on
  // verrouille, c'est l'IMPOSSIBILITÉ qu'une position fine sorte.
  const positions = [
    48.858_370_1, -33.868_820, 2.294_481_2, 139.691_706, -74.005_974, 0.000_001,
  ];
  for (const p of positions) {
    const coarse = coarseForCountryLookup(p);
    const decimals = String(coarse).split('.')[1] ?? '';
    assert(
      decimals.length <= COUNTRY_LOOKUP_DECIMALS,
      `${p} → ${coarse} garde ${decimals.length} décimales`,
    );
  }
});

Deno.test('l’arrondi déplace de moins de 6 km : le PAYS reste le bon', () => {
  // Un dixième de degré ≈ 11 km, donc l'écart maximal d'un arrondi est de la
  // moitié : ~5,6 km en latitude. C'est ce qui autorise à réduire la précision
  // sans risquer de pré-remplir le numéro de secours d'un pays voisin.
  const step = 10 ** -COUNTRY_LOOKUP_DECIMALS;
  for (let i = 0; i < 200; i++) {
    const value = -90 + (i * 180) / 200 + 0.0371;
    assert(Math.abs(coarseForCountryLookup(value) - value) <= step / 2 + 1e-9, `${value}`);
  }
});
