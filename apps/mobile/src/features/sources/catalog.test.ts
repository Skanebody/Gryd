/**
 * GRYD — G26 : le Hub liste les sources avec leur ÉTAT RÉEL.
 *
 * Santé, Strava et Garmin avaient été RETIRÉES de l'écran (filtre
 * `availability !== 'native'` sur un catalogue qui n'en comptait que deux). Une
 * source absente n'explique rien, et le cahier interdit surtout l'inverse :
 * « ne pas montrer Garmin ou Strava comme "connecté" sur la seule présence d'un
 * logo ». Ce test verrouille les deux moitiés de la règle.
 */
import { assertEquals } from 'jsr:@std/assert@^1';
import { VERIFY_SOURCES } from './catalog.ts';
import { sourceRowKind } from './rowView.ts';

Deno.test('G26 : les trois sources nommées par le cahier sont listées', () => {
  const keys = VERIFY_SOURCES.map(source => source.key);
  for (const key of ['health', 'strava', 'garmin']) assertEquals(keys.includes(key), true, key);
  // Et elles ne sont pas raccordables ici : aucune action ne serait honnête.
  for (const key of ['health', 'strava', 'garmin']) {
    assertEquals(VERIFY_SOURCES.find(source => source.key === key)?.availability, 'unavailable');
  }
});
Deno.test('G26 : une source indisponible porte un état, et jamais « connecté »', () => {
  for (const source of VERIFY_SOURCES) {
    // Chaque ligne dit ce qu'elle apporte : le Hub écrivait « Fichier .gpx »
    // pour toutes, ce qui devenait faux dès la deuxième source.
    assertEquals(typeof source.summary?.fr, 'string');
    if (source.availability !== 'unavailable') continue;
    assertEquals(typeof source.state?.fr, 'string');
    // L'état est écrit dans les cinq langues du sélecteur, pas seulement en français.
    for (const locale of ['fr', 'en', 'es', 'de', 'pt'] as const) {
      assertEquals(typeof source.state?.[locale], 'string', `${source.key}/${locale}`);
    }
    // Aucun statut d'adaptateur ne peut la requalifier.
    for (const status of [undefined, 'connected', 'disconnected'] as const) {
      assertEquals(sourceRowKind({ availability: source.availability, action: source.action, status, busy: false, signedIn: true }), 'unavailable');
    }
  }
});
