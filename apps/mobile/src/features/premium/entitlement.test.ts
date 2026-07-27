/**
 * GRYD — PREMIUM : ce que la lecture du droit Pro doit tenir SEULE.
 *
 *  1. un CustomerInfo CACHÉ dont l'échéance est passée ne dit PAS « actif »
 *     (c'est le mensonge le plus facile à commettre : croire `isActive`) ;
 *  2. « jamais acheté » et « expiré » sont deux états DISTINCTS ;
 *  3. l'achat à vie n'a pas d'échéance et n'expire jamais ;
 *  4. auto-renew coupé = ENCORE actif jusqu'à l'échéance (pas « expiré ») ;
 *  5. une date illisible ne fabrique ni échéance ni expiration ;
 *  6. l'URL de gestion est réelle ou absente — jamais un lien inventé.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  DEFAULT_PRO_ENTITLEMENT_ID,
  isProActive,
  managementUrlOf,
  readProStatus,
  type CustomerInfoLike,
  type EntitlementInfoLike,
} from './entitlement.ts';

const ID = DEFAULT_PRO_ENTITLEMENT_ID;
const NOW = Date.parse('2026-07-27T12:00:00.000Z');

function info(entry: EntitlementInfoLike | null, extra: Partial<CustomerInfoLike> = {}): CustomerInfoLike {
  const all = entry ? { [ID]: entry } : {};
  const active = entry?.isActive ? { [ID]: entry } : {};
  return { entitlements: { all, active }, ...extra };
}

Deno.test('aucun droit : « none » — jamais confondu avec « expiré »', () => {
  assertEquals(readProStatus(info(null), ID, NOW).kind, 'none');
  assertEquals(readProStatus({}, ID, NOW).kind, 'none');
  assertEquals(readProStatus({ entitlements: {} }, ID, NOW).kind, 'none');
});

Deno.test('abonnement actif : échéance future, produit reporté', () => {
  const status = readProStatus(
    info({
      isActive: true,
      willRenew: true,
      periodType: 'NORMAL',
      expirationDate: '2026-08-27T12:00:00.000Z',
      productIdentifier: 'club_annual',
    }),
    ID,
    NOW,
  );
  assertEquals(status.kind, 'active');
  if (status.kind === 'active') {
    assertEquals(status.trial, false);
    assertEquals(status.lifetime, false);
    assertEquals(status.cancelled, false);
    assertEquals(status.expiresAtMs, Date.parse('2026-08-27T12:00:00.000Z'));
    assertEquals(status.productId, 'club_annual');
  }
  assertEquals(isProActive(status), true);
});

Deno.test('CACHE PÉRIMÉ : isActive=true mais échéance passée → expiré, pas actif', () => {
  const status = readProStatus(
    info({ isActive: true, expirationDate: '2026-07-26T12:00:00.000Z', productIdentifier: 'club_monthly' }),
    ID,
    NOW,
  );
  assertEquals(status.kind, 'expired');
  if (status.kind === 'expired') {
    assertEquals(status.expiredAtMs, Date.parse('2026-07-26T12:00:00.000Z'));
  }
  assertEquals(isProActive(status), false);
});

Deno.test('échéance À L’INSTANT MÊME : expiré (borne fermée, jamais d’actif gratuit)', () => {
  const at = new Date(NOW).toISOString();
  const status = readProStatus(info({ isActive: true, expirationDate: at }), ID, NOW);
  assertEquals(status.kind, 'expired');
});

Deno.test('isActive=false : expiré même si la date semble future (on ne réactive rien)', () => {
  const status = readProStatus(
    info({ isActive: false, expirationDate: '2027-01-01T00:00:00.000Z' }),
    ID,
    NOW,
  );
  assertEquals(status.kind, 'expired');
});

Deno.test('achat à vie : actif, sans échéance, jamais « expiré »', () => {
  const status = readProStatus(
    info({ isActive: true, expirationDate: null, productIdentifier: 'gryd_pro_lifetime' }),
    ID,
    NOW,
  );
  assertEquals(status.kind, 'active');
  if (status.kind === 'active') {
    assertEquals(status.lifetime, true);
    assertEquals(status.expiresAtMs, null);
    assertEquals(status.cancelled, false); // un achat à vie ne se « résilie » pas
  }
});

Deno.test('essai en cours : actif ET marqué trial', () => {
  const status = readProStatus(
    info({ isActive: true, periodType: 'TRIAL', expirationDate: '2026-08-03T12:00:00.000Z' }),
    ID,
    NOW,
  );
  assertEquals(status.kind, 'active');
  if (status.kind === 'active') assertEquals(status.trial, true);
});

Deno.test('renouvellement coupé : ENCORE actif jusqu’à l’échéance, marqué cancelled', () => {
  const status = readProStatus(
    info({ isActive: true, willRenew: false, expirationDate: '2026-08-27T12:00:00.000Z' }),
    ID,
    NOW,
  );
  assertEquals(status.kind, 'active');
  if (status.kind === 'active') assertEquals(status.cancelled, true);
});

Deno.test('date illisible : ni échéance affichée, ni expiration inventée', () => {
  const status = readProStatus(info({ isActive: true, expirationDate: 'pas-une-date' }), ID, NOW);
  assertEquals(status.kind, 'active');
  if (status.kind === 'active') {
    assertEquals(status.expiresAtMs, null);
    // Pas de date ⇒ on ne peut pas prouver l'échéance : on ne prétend pas « à vie
    // résilié ». `lifetime` reste vrai au sens « aucune échéance CONNUE ».
    assertEquals(status.cancelled, false);
  }
});

Deno.test('autre entitlement actif : ne donne PAS le droit Pro', () => {
  const status = readProStatus(
    { entitlements: { all: { autre_chose: { isActive: true } }, active: { autre_chose: { isActive: true } } } },
    ID,
    NOW,
  );
  assertEquals(status.kind, 'none');
});

Deno.test('repli sur `active` quand le SDK n’a pas fourni `all`', () => {
  const status = readProStatus(
    { entitlements: { active: { [ID]: { isActive: true, expirationDate: '2026-09-01T00:00:00.000Z' } } } },
    ID,
    NOW,
  );
  assertEquals(status.kind, 'active');
});

Deno.test('URL de gestion : réelle ou null — jamais un lien fabriqué', () => {
  assertEquals(managementUrlOf({ managementURL: 'https://apps.apple.com/account/subscriptions' }), 'https://apps.apple.com/account/subscriptions');
  assertEquals(managementUrlOf({ managementURL: null }), null);
  assertEquals(managementUrlOf({}), null);
  assertEquals(managementUrlOf({ managementURL: '   ' }), null);
  assertEquals(managementUrlOf({ managementURL: 'javascript:alert(1)' }), null);
});
