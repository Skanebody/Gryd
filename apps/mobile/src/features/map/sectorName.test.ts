/**
 * GRYD — tests du nommage de secteur (hiérarchie de repli « partout en Europe »).
 * PURE : on nourrit des adresses Nominatim réalistes et on vérifie le choix.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  gridFallbackLabel,
  pickSectorName,
  sectorNameFromAddress,
} from '@klaim/shared';

const FALLBACK = 'Secteur X';

Deno.test('dense (Paris) : le quartier prime sur le district et la ville', () => {
  const name = sectorNameFromAddress(
    { neighbourhood: 'République', suburb: 'Le Marais', city: 'Paris', road: 'Rue du Temple' },
    FALLBACK,
  );
  assertEquals(name, 'République');
});

Deno.test('district quand pas de quartier (« Le Marais » avant « Paris »)', () => {
  assertEquals(
    sectorNameFromAddress({ suburb: 'Le Marais', city: 'Paris' }, FALLBACK),
    'Le Marais',
  );
});

Deno.test('rural (Ouville-la-Rivière) : hameau > village > commune', () => {
  // Un hameau nommé prime.
  assertEquals(
    sectorNameFromAddress(
      { hamlet: 'Le Bourg', village: 'Ouville-la-Rivière', municipality: 'Ouville-la-Rivière' },
      FALLBACK,
    ),
    'Le Bourg',
  );
  // Sinon le village.
  assertEquals(
    sectorNameFromAddress({ village: 'Ouville-la-Rivière', county: 'Seine-Maritime' } as never, FALLBACK),
    'Ouville-la-Rivière',
  );
});

Deno.test('faute de lieu nommé, la rue sert de repère (jamais avant un quartier)', () => {
  assertEquals(
    sectorNameFromAddress({ road: "Rue de l'Église" }, FALLBACK),
    "Rue de l'Église",
  );
});

Deno.test('aucun champ nommant → pickSectorName renvoie null (pour ne pas cacher un repli)', () => {
  assertEquals(pickSectorName({}), null);
  assertEquals(pickSectorName(undefined), null);
  assertEquals(pickSectorName({ neighbourhood: '   ' }), null); // vide après trim
  // Et sectorNameFromAddress retombe alors sur le repli de grille.
  assertEquals(sectorNameFromAddress(null, FALLBACK), FALLBACK);
});

Deno.test('repli de grille : coordonnées lisibles FR, hémisphères N/S · E/O', () => {
  assertEquals(gridFallbackLabel(49.72, 1.03), 'Secteur 49,7N · 1,0E');
  // Ouest de Greenwich (Londres) → « O » ; sud de l'équateur → « S ».
  assertEquals(gridFallbackLabel(51.5, -0.12), 'Secteur 51,5N · 0,1O');
  assertEquals(gridFallbackLabel(-33.9, 18.4), 'Secteur 33,9S · 18,4E');
});
