/**
 * GRYD — E39 · la PERTINENCE de la découverte, prouvée critère par critère.
 *
 * Trois familles, et les trois comptent :
 *   1. LA LECTURE DÉFENSIVE du jsonb — un serveur qui répond mal ne doit pas
 *      faire mentir l'écran. Le cas décisif : `{ok:false}` ne devient JAMAIS une
 *      liste vide, parce qu'une liste vide AFFIRME « aucun crew ici » alors
 *      qu'on n'a rien lu du tout.
 *   2. L'ORDRE DE §E39, testé critère par critère et DANS L'ORDRE : chaque test
 *      neutralise les critères précédents pour isoler celui qu'il mesure. Sans
 *      ça, un comparateur qui inverserait deux critères resterait vert.
 *   3. L'AFFORDANCE — quel bouton l'écran a le droit de peindre. C'est la règle
 *      « aucun bouton mort » (§A4) exprimée en fonction pure : elle échoue sur
 *      un code qui proposerait « Rejoindre » un crew plein ou fermé.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CREW_MAX_MEMBERS } from '@klaim/shared';
import {
  activityFit,
  applyFilter,
  compareCrewRelevance,
  crewActivityProfile,
  isJoinable,
  joinAffordance,
  parseDiscoveryCrew,
  parseDiscoveryPage,
  rankCrews,
  refusalOf,
  refusalView,
  seatsLeft,
  type DiscoveryCrew,
  type RelevanceContext,
} from './discovery.ts';

const PARIS = 'paris';

/** Crew NEUTRE : aucun critère ne le distingue tant qu'on ne change rien. */
const crew = (over: Partial<DiscoveryCrew> = {}): DiscoveryCrew => ({
  id: 'c-0',
  name: 'Neutre',
  tag: null,
  color: 0,
  cityId: PARIS,
  recruitmentStatus: 'open',
  memberCount: 4,
  hexesHeld: 0,
  hexesRun: 0,
  hexesBike: 0,
  lastCaptureAtMs: null,
  friendsInside: 0,
  myRequestPending: false,
  ...over,
});

const CTX: RelevanceContext = {
  viewerCityId: PARIS,
  viewerInCrew: false,
  viewerActivity: null,
};

// ═══ 1. LECTURE DÉFENSIVE ═══════════════════════════════════════════════════

Deno.test('un refus ne devient JAMAIS une liste vide (deux états distincts)', () => {
  // Le mensonge qu'on empêche : « aucun crew dans ta ville » alors que la
  // lecture a échoué. L'écran doit pouvoir distinguer les deux.
  assertEquals(parseDiscoveryPage({ ok: false, reason: 'no_city' }), null);
  assertEquals(refusalOf({ ok: false, reason: 'no_city' }), 'no_city');

  const empty = parseDiscoveryPage({ ok: true, cityId: PARIS, crews: [] });
  assert(empty !== null, 'une page valide et vide doit être lue comme une page');
  assertEquals(empty.crews.length, 0);
  assertEquals(refusalOf({ ok: true, cityId: PARIS, crews: [] }), null);
});

Deno.test('une réponse informe (null, chaîne, tableau) ne casse rien', () => {
  for (const junk of [null, undefined, 'oops', 42, []]) {
    assertEquals(parseDiscoveryPage(junk), null);
  }
});

Deno.test('un crew sans identité est écarté, pas rendu à moitié', () => {
  assertEquals(parseDiscoveryCrew({ name: 'Sans id', cityId: PARIS }), null);
  assertEquals(parseDiscoveryCrew({ id: 'x', cityId: PARIS }), null);
  const page = parseDiscoveryPage({
    ok: true,
    cityId: PARIS,
    crews: [{ id: 'ok', name: 'Bon', cityId: PARIS }, { name: 'cassé' }],
  });
  assertEquals(page?.crews.map((c) => c.id), ['ok']);
});

Deno.test('un statut de recrutement INCONNU se ferme, il ne s’ouvre pas', () => {
  // Au pire on cache une action qui aurait marché ; l'inverse peindrait un
  // bouton qui échoue — et c'est ça qui est interdit.
  const c = parseDiscoveryCrew({ id: 'x', name: 'X', cityId: PARIS, recruitmentStatus: 'martien' });
  assertEquals(c?.recruitmentStatus, 'closed');
  assertEquals(joinAffordance(c!, { viewerInCrew: false }), 'none');
});

Deno.test('les compteurs négatifs ou absents retombent à 0, jamais à NaN', () => {
  const c = parseDiscoveryCrew({
    id: 'x', name: 'X', cityId: PARIS, memberCount: -3, friendsInside: null, hexesHeld: 'oops',
  });
  assertEquals(c?.memberCount, 0);
  assertEquals(c?.friendsInside, 0);
  assertEquals(c?.hexesHeld, 0);
  assertEquals(c?.lastCaptureAtMs, null);
});

// ═══ 2. L'ORDRE DE §E39, CRITÈRE PAR CRITÈRE ════════════════════════════════

Deno.test('critère 1 — la ville du joueur passe avant tout le reste', () => {
  const ici = crew({ id: 'ici', cityId: PARIS });
  // L'AILLEURS est meilleur sur TOUS les critères suivants (amis, activité,
  // places) : si la ville ne primait pas, il passerait devant.
  const ailleurs = crew({
    id: 'ailleurs', cityId: 'lille', friendsInside: 9, lastCaptureAtMs: 9_999, memberCount: 1,
  });
  assertEquals(rankCrews([ailleurs, ici], CTX).map((c) => c.id), ['ici', 'ailleurs']);
});

Deno.test('critère 2 — à ville égale, les amis déjà présents priment', () => {
  const avec = crew({ id: 'avec', friendsInside: 1 });
  // `sans` est meilleur sur activité ET places : seuls les amis doivent trancher.
  const sans = crew({ id: 'sans', friendsInside: 0, lastCaptureAtMs: 9_999, memberCount: 1 });
  assertEquals(rankCrews([sans, avec], CTX).map((c) => c.id), ['avec', 'sans']);
});

Deno.test('critère 3 — à amis égaux, l’activité la plus récente passe devant', () => {
  const frais = crew({ id: 'frais', lastCaptureAtMs: 2_000, memberCount: 40 });
  const vieux = crew({ id: 'vieux', lastCaptureAtMs: 1_000, memberCount: 2 });
  assertEquals(rankCrews([vieux, frais], CTX).map((c) => c.id), ['frais', 'vieux']);
});

Deno.test('un crew qui n’a JAMAIS capturé passe après tous ceux qui l’ont fait', () => {
  // « jamais » n'est pas « il y a très longtemps » : sans ce cas explicite, un
  // null trié comme un 0 aurait pu se retrouver devant.
  const jamais = crew({ id: 'jamais', lastCaptureAtMs: null, memberCount: 2 });
  const ancien = crew({ id: 'ancien', lastCaptureAtMs: 1, memberCount: 40 });
  assertEquals(rankCrews([jamais, ancien], CTX).map((c) => c.id), ['ancien', 'jamais']);
});

Deno.test('critère 4 — à activité égale, la capacité disponible départage', () => {
  const large = crew({ id: 'large', memberCount: 2, lastCaptureAtMs: 5 });
  const serre = crew({ id: 'serre', memberCount: CREW_MAX_MEMBERS - 1, lastCaptureAtMs: 5 });
  assertEquals(rankCrews([serre, large], CTX).map((c) => c.id), ['large', 'serre']);
});

Deno.test('critère 5 — à capacité égale, la discipline du joueur départage', () => {
  const courseurs = crew({ id: 'run', hexesHeld: 4, hexesRun: 4, hexesBike: 0, lastCaptureAtMs: 5 });
  const cyclistes = crew({ id: 'bike', hexesHeld: 4, hexesRun: 0, hexesBike: 4, lastCaptureAtMs: 5 });
  const ctx = { ...CTX, viewerActivity: 'bike' as const };
  assertEquals(rankCrews([courseurs, cyclistes], ctx).map((c) => c.id), ['bike', 'run']);
  // Discipline du joueur INCONNUE → le critère ne départage plus personne, et
  // le tri retombe sur le départage alphabétique déterministe.
  assertEquals(activityFit(courseurs, null), 1);
  assertEquals(rankCrews([cyclistes, courseurs], CTX).map((c) => c.id).length, 2);
});

Deno.test('un crew mixte ou sans emprise ne se voit pas prêter une discipline', () => {
  assertEquals(crewActivityProfile(crew({ hexesRun: 0, hexesBike: 0 })), 'unknown');
  assertEquals(crewActivityProfile(crew({ hexesRun: 3, hexesBike: 2 })), 'mixed');
  assertEquals(crewActivityProfile(crew({ hexesRun: 3, hexesBike: 0 })), 'run');
  assertEquals(crewActivityProfile(crew({ hexesRun: 0, hexesBike: 3 })), 'bike');
  // L'indéterminé se range ENTRE « ma discipline » et « l'autre ».
  assertEquals(activityFit(crew({ hexesRun: 3, hexesBike: 2 }), 'run'), 1);
  assertEquals(activityFit(crew({ hexesRun: 3 }), 'run'), 2);
  assertEquals(activityFit(crew({ hexesBike: 3 }), 'run'), 0);
});

Deno.test('le départage final est DÉTERMINISTE : deux tris rendent le même ordre', () => {
  // Une liste dont AUCUN critère ne sépare les membres. Si le comparateur
  // retombait sur 0, l'ordre dépendrait de l'entrée et la liste bougerait sous
  // le doigt d'un rafraîchissement à l'autre.
  const a = crew({ id: 'a', name: 'Alpha' });
  const b = crew({ id: 'b', name: 'Beta' });
  const c = crew({ id: 'c', name: 'Alpha' }); // même nom que `a` : l'id tranche
  assertEquals(rankCrews([b, c, a], CTX).map((x) => x.id), ['a', 'c', 'b']);
  assertEquals(rankCrews([a, b, c], CTX).map((x) => x.id), ['a', 'c', 'b']);
});

Deno.test('rankCrews ne mute pas son entrée', () => {
  const src = [crew({ id: 'z', name: 'Zoulou' }), crew({ id: 'a', name: 'Alpha' })];
  const before = src.map((c) => c.id);
  rankCrews(src, CTX);
  assertEquals(src.map((c) => c.id), before);
});

// ═══ 3. PARTITION « JOIGNABLE » ET AFFORDANCE ═══════════════════════════════

Deno.test('un crew injoignable est rendu APRÈS, même s’il gagne tous les critères', () => {
  // Le leurre qu'on interdit : le meilleur crew de la ville, plein d'amis,
  // très actif… et impossible à rejoindre, posé en tête d'un écran dont le but
  // est de rejoindre.
  const ferme = crew({
    id: 'ferme', recruitmentStatus: 'closed', friendsInside: 5, lastCaptureAtMs: 9_999,
  });
  const banal = crew({ id: 'banal' });
  assertEquals(rankCrews([ferme, banal], CTX).map((c) => c.id), ['banal', 'ferme']);
  // …mais il reste VISIBLE : son existence est une information sur le quartier.
  assertEquals(rankCrews([ferme, banal], CTX).length, 2);
});

Deno.test('l’affordance ne peint jamais une action qui échouerait', () => {
  const solo = { viewerInCrew: false };
  assertEquals(joinAffordance(crew({ recruitmentStatus: 'open' }), solo), 'join');
  assertEquals(joinAffordance(crew({ recruitmentStatus: 'on_request' }), solo), 'request');
  assertEquals(joinAffordance(crew({ recruitmentStatus: 'closed' }), solo), 'none');
  assertEquals(joinAffordance(crew({ recruitmentStatus: 'invite_only' }), solo), 'none');
  // Crew PLEIN : `crew_join_intent` répondrait `full` (0083) — donc aucun bouton.
  assertEquals(
    joinAffordance(crew({ recruitmentStatus: 'open', memberCount: CREW_MAX_MEMBERS }), solo),
    'none',
  );
  // Candidature EN COURS : ni « Rejoindre » ni un second envoi — un état, pas une action.
  assertEquals(joinAffordance(crew({ myRequestPending: true }), solo), 'pending');
  // DÉJÀ dans un crew : aucune adhésion ne passerait (`already_in_crew`).
  assertEquals(joinAffordance(crew({ recruitmentStatus: 'open' }), { viewerInCrew: true }), 'none');
});

Deno.test('les places restantes viennent de game-rules, jamais d’un 50 écrit à la main', () => {
  assertEquals(seatsLeft(crew({ memberCount: 0 })), CREW_MAX_MEMBERS);
  assertEquals(seatsLeft(crew({ memberCount: CREW_MAX_MEMBERS })), 0);
  // Effectif au-dessus du plafond (théoriquement impossible) : jamais un négatif à l'écran.
  assertEquals(seatsLeft(crew({ memberCount: CREW_MAX_MEMBERS + 5 })), 0);
});

Deno.test('les filtres §E39 filtrent VRAIMENT, et « tous » ne retire rien', () => {
  const solo = { viewerInCrew: false };
  const amis = crew({ id: 'amis', friendsInside: 2 });
  const ferme = crew({ id: 'ferme', recruitmentStatus: 'closed' });
  const ouvert = crew({ id: 'ouvert', recruitmentStatus: 'open' });
  const all = [amis, ferme, ouvert];
  assertEquals(applyFilter(all, 'all', solo).length, 3);
  assertEquals(applyFilter(all, 'friends', solo).map((c) => c.id), ['amis']);
  assertEquals(applyFilter(all, 'open', solo).map((c) => c.id), ['amis', 'ouvert']);
  assert(!isJoinable(ferme, solo), 'un crew fermé ne doit pas passer le filtre « ouverts »');
});

Deno.test('quand je suis DÉJÀ dans un crew, le filtre « ouverts » ne ment pas', () => {
  // Aucun crew n'est joignable dans cet état : le filtre doit rendre une liste
  // VIDE plutôt que des crews qu'on ne peut pas rejoindre.
  const dansUnCrew = { viewerInCrew: true };
  const all = [crew({ id: 'a', recruitmentStatus: 'open' }), crew({ id: 'b' })];
  assertEquals(applyFilter(all, 'open', dansUnCrew).length, 0);
});

// ─── Refus → ce que l'écran a le droit de peindre ────────────────────────────
//
// POURQUOI CE VERROU (27/07/2026). E39 ne rendait que `no_city`, E40 que
// `not_found` : `signed_out` (0083:267 et :385) tombait dans un TROU. E40 y
// laissait un spinner tourner pour toujours, E39 rendait une liste muette qui
// se lit « aucun crew ici ». La règle n'est pas « traiter signed_out » — c'est
// qu'AUCUN motif, présent ou futur, ne peut échapper à un rendu.

Deno.test('REFUS : chaque motif du contrat a un écran, aucun n’est muet', () => {
  assertEquals(refusalView(null), null); // succès : pas d'écran de refus
  assertEquals(refusalView('no_city'), 'no_city');
  assertEquals(refusalView('not_found'), 'not_found');
  // Le refus qui manquait : le SERVEUR dit « pas connecté » alors que l'app
  // tient une session. Jeton expiré — distinct d'un « jamais connecté ».
  assertEquals(refusalView('signed_out'), 'session_expired');
  // Vocabulaire d'ADHÉSION reçu sur une LECTURE : on ne devine pas, on dit
  // qu'on n'a pas pu lire.
  for (const r of ['already_in_crew', 'cooldown', 'closed', 'full'] as const) {
    assertEquals(refusalView(r), 'unreadable', `${r} n’a pas d’écran`);
  }
});

Deno.test('REFUS : un motif serveur INCONNU est peint, jamais avalé', () => {
  // `refusalOf` caste la chaîne serveur telle quelle dans le type : un motif
  // ajouté demain en base ne doit pas rendre un écran vide chez un joueur qui
  // n'a pas mis l'app à jour.
  const futur = refusalOf({ ok: false, reason: 'region_locked' });
  assertEquals(futur, 'region_locked' as never);
  assertEquals(refusalView(futur), 'unreadable');
});
