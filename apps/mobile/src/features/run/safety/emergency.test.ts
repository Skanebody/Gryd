/**
 * GRYD — E25 : tests du seul module de l'app où une valeur fausse peut coûter
 * autre chose que de la frustration.
 *
 * Les trois garanties verrouillées ici :
 *  1. AUCUN numéro n'apparaît sans pays CONNU — `null` ne retombe jamais sur 112 ;
 *  2. AUCUN bouton n'apparaît si l'appareil ne sait pas téléphoner ;
 *  3. le numéro proposé est celui de `game-rules`, jamais une chaîne recopiée.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { EMERGENCY_NUMBER_EUROPE } from '@klaim/shared';
import {
  EMERGENCY_112_COUNTRIES,
  emergencyPlan,
  emergencyUrl,
  type DialCapabilities,
} from './emergency.ts';

const PHONE: DialCapabilities = { canDialNumber: true, canOpenDialer: true };
const NO_PHONE: DialCapabilities = { canDialNumber: false, canOpenDialer: false };

Deno.test('en France, le numéro proposé est celui de game-rules', () => {
  const plan = emergencyPlan('FR', PHONE);
  assertEquals(plan, { kind: 'dial', number: EMERGENCY_NUMBER_EUROPE });
  assertEquals(emergencyUrl(plan), `tel:${EMERGENCY_NUMBER_EUROPE}`);
});

Deno.test('le code pays est normalisé (casse et espaces), jamais rejeté pour la forme', () => {
  assertEquals(emergencyPlan(' de ', PHONE).kind, 'dial');
  assertEquals(emergencyPlan('Es', PHONE).kind, 'dial');
});

Deno.test('PAYS INCONNU ⇒ AUCUN numéro pré-rempli (la garantie centrale)', () => {
  assertEquals(emergencyPlan(null, PHONE), { kind: 'no-number' });
  assertEquals(emergencyPlan('', PHONE), { kind: 'no-number' });
  assertEquals(emergencyPlan('FRA', PHONE), { kind: 'no-number' }); // alpha-3 : pas notre table
});

Deno.test('hors de la table, on n’invente pas un numéro — même sur un continent voisin', () => {
  for (const iso of ['US', 'JP', 'MA', 'BR', 'AU', 'RU']) {
    assertEquals(emergencyPlan(iso, PHONE), { kind: 'no-number' }, `pays ${iso}`);
  }
});

Deno.test('un appareil qui ne téléphone pas ne montre AUCUN bouton', () => {
  assertEquals(emergencyPlan('FR', NO_PHONE), { kind: 'unavailable' });
  assertEquals(emergencyPlan(null, NO_PHONE), { kind: 'unavailable' });
  assertEquals(emergencyUrl({ kind: 'unavailable' }), null);
});

Deno.test('un appareil qui compose un numéro mais pas le composeur nu, et l’inverse', () => {
  // Numéro connu mais l'appareil refuse `tel:<numéro>` : on n'affiche pas un
  // bouton qui échouerait — on retombe sur le composeur nu s'il existe.
  assertEquals(
    emergencyPlan('FR', { canDialNumber: false, canOpenDialer: true }),
    { kind: 'no-number' },
  );
  // Composeur nu impossible, numéro connu et composable : le bouton pré-rempli.
  assertEquals(
    emergencyPlan('FR', { canDialNumber: true, canOpenDialer: false }).kind,
    'dial',
  );
  // Pays inconnu ET pas de composeur nu : rien.
  assertEquals(
    emergencyPlan(null, { canDialNumber: true, canOpenDialer: false }),
    { kind: 'unavailable' },
  );
});

Deno.test('la table ne contient que des codes alpha-2 en majuscules', () => {
  for (const iso of EMERGENCY_112_COUNTRIES) {
    assertEquals(iso, iso.toUpperCase());
    assertEquals(iso.length, 2, `code inattendu : ${iso}`);
  }
  // Garde-fou : la table couvre bien le terrain de jeu de la Saison 0.
  assert(EMERGENCY_112_COUNTRIES.has('FR'));
  assert(EMERGENCY_112_COUNTRIES.has('BE'));
});
