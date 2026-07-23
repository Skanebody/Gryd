/**
 * GRYD — ouvrir une ville : ce que le client a le droit de CONCLURE d'une
 * réponse serveur.
 *
 * Ce que ces tests protègent, dans l'ordre de gravité :
 *  1. une réponse qu'on n'a pas comprise n'est JAMAIS un succès — afficher
 *     « ville ouverte » sur un corps illisible, c'est l'affirmation non lue
 *     qu'AMENDEMENT-47 interdit ;
 *  2. `zoneCreated` n'est vrai que si le serveur l'a dit — sinon l'écran
 *     annoncerait une aire de jeu que personne n'a créée ;
 *  3. trois échecs qui appellent trois gestes différents ne se disent pas de la
 *     même façon (se connecter / abandonner cette ville / réessayer) ;
 *  4. le `status: 'wild'` que la fonction renvoie n'entre PAS dans le modèle du
 *     client : c'est une absence de densité mesurée, pas un niveau.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { LOCALES } from '../../i18n/types.ts';
import { C } from '../../i18n/catalog/city.ts';
import {
  openCityFailureEntry,
  openCityFailureIsFinal,
  readOpenCityResponse,
} from './openCity.ts';

Deno.test('un succès complet est lu tel quel', () => {
  const out = readOpenCityResponse({
    ok: true,
    cityId: '2657896',
    name: 'Zürich',
    country: 'CH',
    status: 'wild',
    zoneCreated: true,
    seasonCreated: true,
    seasonId: 'abc',
    area: 'approximate_disc',
    radiusM: 15000,
  });
  assert(out.ok);
  assertEquals(out.value.cityId, '2657896');
  assertEquals(out.value.name, 'Zürich');
  assertEquals(out.value.zoneCreated, true);
  assertEquals(out.value.seasonCreated, true);
  assertEquals(out.value.radiusM, 15000);
});

Deno.test('le modèle client ne transporte NI statut de densité NI géométrie', () => {
  const out = readOpenCityResponse({
    ok: true,
    cityId: 'x',
    name: 'X',
    status: 'wild',
    zoneCreated: true,
    radiusM: 15000,
  });
  assert(out.ok);
  // Contrat FERMÉ : si `status` revenait ici, un écran finirait par peindre
  // « wild » comme un niveau de jeu que personne n'a produit.
  assertEquals(
    Object.keys(out.value).sort().join(','),
    ['cityId', 'name', 'radiusM', 'seasonCreated', 'zoneCreated'].join(','),
  );
});

Deno.test('une ville déjà ouverte n est pas maquillée en création', () => {
  const out = readOpenCityResponse({
    ok: true,
    cityId: 'paris',
    name: 'Paris',
    zoneCreated: false,
    seasonCreated: false,
    area: 'existing',
  });
  assert(out.ok);
  assertEquals(out.value.zoneCreated, false);
  // Pas de rayon annoncé quand rien n'a été créé : on n'invente pas une distance.
  assertEquals(out.value.radiusM, null);
});

Deno.test('une réponse illisible est un ÉCHEC, jamais un succès partiel', () => {
  for (const raw of [
    null,
    undefined,
    'ok',
    42,
    {},
    { ok: true },
    { ok: true, cityId: '' },
    { ok: true, cityId: 'x' },
    { ok: true, cityId: 'x', name: '' },
    { ok: true, name: 'X' },
  ]) {
    const out = readOpenCityResponse(raw);
    assertEquals(out.ok, false, `${JSON.stringify(raw)} ne doit pas passer pour un succès`);
  }
});

Deno.test('un refus nommé garde son nom', () => {
  const out = readOpenCityResponse({ ok: false, error: 'unknown_city' });
  assertEquals(out, { ok: false, reason: 'unknown_city' });
});

Deno.test('un refus sans motif ne s en invente pas un', () => {
  assertEquals(readOpenCityResponse({ ok: false }), { ok: false, reason: 'refused' });
  assertEquals(readOpenCityResponse({ ok: false, error: 42 }), { ok: false, reason: 'refused' });
});

Deno.test('trois échecs, trois phrases : elles n envoient pas au même geste', () => {
  const auth = openCityFailureEntry('missing_authorization');
  const unknown = openCityFailureEntry('unknown_city');
  const generic = openCityFailureEntry('network_or_unknown');
  assertEquals(auth, C.openFailedAuth);
  assertEquals(openCityFailureEntry('invalid_token'), C.openFailedAuth);
  assertEquals(unknown, C.openFailedUnknown);
  assertEquals(openCityFailureEntry('bad_city_id'), C.openFailedUnknown);
  assertEquals(generic, C.openFailed);
  // Un motif jamais vu ne devient pas un diagnostic fabriqué : il retombe sur
  // « ça n'a pas abouti », la seule chose qu'on sache vraiment.
  assertEquals(openCityFailureEntry('provisioning_failed'), C.openFailed);
  assertEquals(openCityFailureEntry(''), C.openFailed);
  assertEquals(new Set([auth, unknown, generic]).size, 3);
});

/**
 * LE PLAFOND EST UNE CAUSE CONNUE, PAS UN INCIDENT.
 *
 * `CITY_OPEN_LIMIT_PER_USER` fait répondre 429 `open_quota_reached` au serveur
 * (migration 0066). Tant que ce motif retombait dans le défaut « ça n'a pas
 * abouti », le joueur lisait un incident réseau là où il y avait une règle du
 * jeu — et le bouton « Réessayer » l'invitait à recommencer une action qui
 * échouera à tous les coups. Deux fautes d'un coup : une explication fausse et
 * un bouton mort.
 */
Deno.test('le plafond d ouverture se dit par son nom, et ne se réessaie pas', () => {
  assertEquals(openCityFailureEntry('open_quota_reached'), C.openFailedQuota);
  assert(openCityFailureIsFinal('open_quota_reached'));
  // Ville inconnue du référentiel serveur : insister ne changera rien non plus.
  assert(openCityFailureIsFinal('unknown_city'));
  assert(openCityFailureIsFinal('bad_city_id'));
  assert(openCityFailureIsFinal('missing_city_id'));
  // Tout le reste PEUT aboutir à la seconde suivante : le bouton reste.
  assert(!openCityFailureIsFinal('network_or_unknown'));
  assert(!openCityFailureIsFinal('missing_authorization'));
  assert(!openCityFailureIsFinal('provisioning_failed'));
  assert(!openCityFailureIsFinal(''));
});

/**
 * Le plafond est un NOMBRE de game-rules : il s'interpole, sinon le jour où
 * `CITY_OPEN_LIMIT_PER_USER` bouge, cinq traductions mentent en chœur.
 */
Deno.test('la phrase du plafond porte le nombre en variable, pas en dur', () => {
  for (const locale of LOCALES) {
    assert(C.openFailedQuota[locale].includes('{n}'), `openFailedQuota ${locale}`);
    assert(!/\b5\b/.test(C.openFailedQuota[locale]), `plafond en dur dans ${locale}`);
  }
});

Deno.test('toute la copie de l ouverture existe dans les 5 langues', () => {
  const entries = [
    C.openExplain,
    C.openCta,
    C.openBusy,
    C.openedCreated,
    C.openedExisting,
    C.openFailed,
    C.openFailedAuth,
    C.openFailedUnknown,
    C.openFailedQuota,
    C.noMatchExplain,
  ];
  for (const entry of entries) {
    for (const locale of LOCALES) {
      assert(entry[locale].trim().length > 0, `${locale} manquant`);
    }
  }
});

/**
 * Le rayon est INTERPOLÉ, jamais écrit dans la phrase : le jour où
 * `CITY_DISC_RADIUS_M` change, la copie doit suivre toute seule. Un « 15 km »
 * en dur dans les 5 langues serait un nombre magique de plus — et une phrase
 * fausse le lendemain.
 */
Deno.test('les phrases d aire de jeu portent le rayon en variable, pas en dur', () => {
  for (const locale of LOCALES) {
    assert(C.openExplain[locale].includes('{km}'), `openExplain ${locale}`);
    assert(C.openedCreated[locale].includes('{km}'), `openedCreated ${locale}`);
    assert(!/\b15\s?km\b/.test(C.openExplain[locale]), `rayon en dur dans openExplain ${locale}`);
  }
});
