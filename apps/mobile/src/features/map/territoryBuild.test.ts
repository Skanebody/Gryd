/**
 * GRYD — P0.2 : tests de `buildTerritories`, la SEULE fonction qui transforme une
 * capture serveur en pixel sur la carte. Deno, aucun réseau, aucun mock : on importe
 * DIRECTEMENT le module de prod (comme gpx-parse.test.ts) → zéro drift.
 *
 * Contexte : avant ce fichier, toute la couche carte (mapStyle, allTerritories,
 * territory, hexClaims) n'avait AUCUN test — on pouvait casser le tap, le dimming ou
 * le contour et sortir un gate 100 % vert. Ces tests verrouillent l'arbitrage fondateur
 * du 15/07 (« l'unité de lecture est le TERRITOIRE ») et les deux régressions qui
 * feraient MENTIR la carte : la frontière inventée et les rivaux soudés.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { cellToParent, gridDisk, latLngToCell } from 'h3-js';
import { buildTerritories, dataNote, dbToH3, stateFor, type HexClaimRow } from './territoryBuild.ts';
import { LOCALES } from '../../i18n/types.ts';

const ME = 'me-uuid';
const RIVAL_A = 'rival-a-uuid';
const RIVAL_B = 'rival-b-uuid';
const H3_RES = 10;
/** Granularité « zone » (cellule parente) — celle du découpage rejeté. */
const ZONE_RES = 8;

/** Encodage EXACT d'ingest_run (index.ts:146) : la cellule H3 est stockée en BIGINT. */
const h3ToDb = (h: string): string => BigInt('0x' + h).toString();

function row(cell: string, owner: string | null, claimedAt: string | null = null): HexClaimRow {
  return {
    h3index: h3ToDb(cell),
    owner_user_id: owner,
    claim_type: 'claim',
    decay_at: null,
    claimed_at: claimedAt,
  };
}

/** Un paquet d'hexes contigus autour de République — traverse plusieurs zones res 8. */
const republique = gridDisk(latLngToCell(48.8674, 2.3636, H3_RES), 4);

Deno.test('dbToH3 : round-trip exact avec l’encodage BIGINT d’ingest_run', () => {
  for (const cell of republique.slice(0, 20)) {
    assertEquals(dbToH3(h3ToDb(cell)), cell);
  }
});

Deno.test('stateFor : à moi = crew, tout le reste = rival, non-possédé jamais crew', () => {
  assertEquals(stateFor(row('8a1fb4662b17fff', ME), ME), 'crew');
  assertEquals(stateFor(row('8a1fb4662b17fff', RIVAL_A), ME), 'rival');
  assertEquals(stateFor(row('8a1fb4662b17fff', null), ME), 'rival');
  // Déconnecté (meId null) : rien ne m'appartient — on n'invente pas une possession.
  assertEquals(stateFor(row('8a1fb4662b17fff', null), null), 'rival');
});

Deno.test('ARBITRAGE : mon territoire contigu = UNE seule forme, jamais quadrillé par zone', () => {
  const zones = new Set(republique.map((c) => cellToParent(c, ZONE_RES)));
  // Prémisse du bug : ce paquet contigu S'ÉTALE bien sur plusieurs zones res 8.
  assert(zones.size > 1, `prémisse invalide : ${zones.size} zone(s)`);

  const built = buildTerritories(republique.map((c) => row(c, ME)), ME);

  // Le groupement par zone en aurait produit un PAR ZONE (≥ 2), chacun contouré →
  // un trait chartreuse sur chaque arête commune : une frontière qui n'existe pas.
  assertEquals(built.length, 1, 'un propriétaire + un état = un seul territoire');
  assertEquals(built[0].props.status, 'crew');
  assertEquals(built[0].zoneCount, republique.length);
  // Des hexes CONTIGUS fusionnent en un seul polygone : zéro couture interne.
  assertEquals(built[0].polygons.length, 1);
});

Deno.test('ARBITRAGE : deux rivaux DISTINCTS ne sont jamais soudés en un mega-territoire', () => {
  // Deux paquets adjacents appartenant à deux adversaires différents. stateFor les
  // rend tous deux 'rival' : fusionner par ÉTAT SEUL effacerait leur vraie frontière.
  const a = gridDisk(latLngToCell(48.8674, 2.3636, H3_RES), 1);
  const b = gridDisk(latLngToCell(48.8566, 2.3522, H3_RES), 1);
  const built = buildTerritories(
    [...a.map((c) => row(c, RIVAL_A)), ...b.map((c) => row(c, RIVAL_B))],
    ME,
  );

  assertEquals(built.length, 2, 'deux propriétaires = deux territoires');
  assert(built.every((t) => t.props.status === 'rival'));
  const owners = built.map((t) => t.props.ownerId).sort();
  assertEquals(owners, [RIVAL_A, RIVAL_B]);
  // Chaque territoire porte une clé DISTINCTE → le tap et le dimming les séparent.
  assert(built[0].props.territoryId !== built[1].props.territoryId);
});

Deno.test('territoryId : déterministe (même entrée → même clé) et sensible au propriétaire', () => {
  const cells = republique.slice(0, 7);
  const first = buildTerritories(cells.map((c) => row(c, ME)), ME);
  const again = buildTerritories(cells.map((c) => row(c, ME)), ME);
  assertEquals(first[0].props.territoryId, again[0].props.territoryId);

  // Le MÊME lieu passé au rival est un AUTRE territoire (le propriétaire fait partie
  // de l'identité). Le deep link, lui, vise le LIEU — il se calcule des coordonnées.
  const stolen = buildTerritories(cells.map((c) => row(c, RIVAL_A)), ME);
  assert(stolen[0].props.territoryId !== first[0].props.territoryId);
});

Deno.test('capturedAt : la capture la PLUS RÉCENTE, jamais une ligne au hasard', () => {
  const cells = republique.slice(0, 3);
  const built = buildTerritories(
    [
      row(cells[0], ME, '2026-07-10T10:00:00Z'),
      row(cells[1], ME, '2026-07-14T18:30:00Z'), // la plus récente
      row(cells[2], ME, '2026-07-12T09:00:00Z'),
    ],
    ME,
  );
  assertEquals(built[0].props.capturedAt, '2026-07-14T18:30:00Z');
});

Deno.test('areaM2 : vraie aire H3 sommée, cohérente avec le nombre d’hexes', () => {
  const cells = republique.slice(0, 7);
  const built = buildTerritories(cells.map((c) => row(c, ME)), ME);
  // Un hex res 10 ≈ 13 400 m² → 7 hexes ≈ 94 000 m². Jamais 0 (l'ancienne valeur en dur).
  assert(built[0].props.areaM2 > 90_000 && built[0].props.areaM2 < 100_000,
    `aire inattendue : ${built[0].props.areaM2}`);
});

Deno.test('honnêteté : aucun nom inventé, aucun statut inventé', () => {
  const built = buildTerritories(republique.slice(0, 5).map((c) => row(c, ME)), ME);
  assertEquals(built[0].props.displayName, null, 'displayName null → l’UI dit « Zone »');
  assertEquals(built[0].props.ownerType, 'user');
  // Seuls 'crew' et 'rival' existent tant que la donnée de decay/contesté n'existe pas.
  assert(['crew', 'rival'].includes(built[0].props.status));
});

Deno.test('vide : zéro capture → zéro territoire (le vide réel, pas une démo)', () => {
  assertEquals(buildTerritories([], ME), []);
});

Deno.test('hexes NON CONTIGUS du même propriétaire : un territoire, plusieurs polygones', () => {
  // Deux paquets éloignés à moi (Paris + Lille) : une seule identité, deux formes —
  // et surtout AUCUN trait qui les relierait.
  const paris = gridDisk(latLngToCell(48.8674, 2.3636, H3_RES), 1);
  const lille = gridDisk(latLngToCell(50.6292, 3.0573, H3_RES), 1);
  const built = buildTerritories([...paris, ...lille].map((c) => row(c, ME)), ME);
  assertEquals(built.length, 1);
  assertEquals(built[0].polygons.length, 2, 'deux paquets séparés = deux polygones');
});

Deno.test('dataNote : les 3 cas de source ne sont JAMAIS confondus', () => {
  // Échec de lecture ≠ « tu n'as rien capturé ». Le distinguer est tout l'objet du champ
  // `failed` : un joueur connecté hors réseau lisait « pas encore tes vraies captures »,
  // sous-entendu qu'il n'avait rien pris — alors que son territoire existe.
  const echec = dataNote(false, true);
  const sansSession = dataNote(false, false);
  const vide = dataNote(true, false, 0);
  assert(echec !== null && /non chargés/.test(echec));
  assert(sansSession !== null && /[Cc]onnecte/.test(sansSession));
  assert(vide !== null && /première zone/.test(vide));
  assert(new Set([echec, sansSession, vide]).size === 3, 'trois états = trois messages distincts');

  // L'échec ne doit JAMAIS se lire comme « tu n'as rien pris ».
  assert(!/aucun/i.test(echec), 'échec de lecture ≠ vide');

  // `failed` prime : connecté + échec reste un échec.
  assertEquals(dataNote(true, true), echec);

  // Du vrai territoire affiché : rien à dire, on n'ajoute pas de bruit à l'écran.
  assertEquals(dataNote(true, false, 3), null);
});

Deno.test('dataNote : plus AUCUN message ne parle de « démonstration »', () => {
  // 21/07/2026 — fin du mode vitrine. Le paramètre `demoPainted` et la copie
  // « Territoires de démonstration » ont disparu : aucune surface ne peint plus de
  // démo, donc l'étiqueter n'a plus d'objet. Ce test est le garde-fou : si un jour
  // quelqu'un réintroduit une note « démo », il échoue.
  for (const locale of LOCALES) {
    for (const note of [
      dataNote(false, true, 0, locale),
      dataNote(false, false, 0, locale),
      dataNote(true, false, 0, locale),
    ]) {
      assert(note !== null);
      assert(
        !/démonstration|demo|demostraci|Demo-|demonstra/i.test(note),
        `${locale} : « ${note} » parle encore de démonstration`,
      );
    }
  }
});

Deno.test('dataNote : i18n — 3 messages distincts dans CHAQUE langue, null reste null', () => {
  for (const locale of LOCALES) {
    const notes = [
      dataNote(false, true, 0, locale),
      dataNote(false, false, 0, locale),
      dataNote(true, false, 0, locale),
    ];
    assert(notes.every((n) => n !== null && n.length > 0), `${locale} : note vide`);
    assert(new Set(notes).size === 3, `${locale} : trois états = trois messages distincts`);
    assertEquals(dataNote(true, false, 3, locale), null);
  }
  // Le défaut (sans locale) reste le français.
  assertEquals(dataNote(false, false), dataNote(false, false, 0, 'fr'));
});

Deno.test('dataNote : la note reste COMPACTE (retour terrain « le bloc est trop large »)', () => {
  // La note est une pill flottante posée sur la carte, à ~86 % d'un écran de 375 px.
  // Au-delà de ce budget elle repasse sur deux lignes ou rétrécit sa police : le bloc
  // redevient le bandeau pleine largeur que le fondateur a signalé. Garde-fou dur.
  const MAX = 38;
  for (const locale of LOCALES) {
    for (const note of [
      dataNote(false, true, 0, locale),
      dataNote(false, false, 0, locale),
      dataNote(true, false, 0, locale),
    ]) {
      assert(note !== null);
      assert(note.length <= MAX, `${locale} : « ${note} » = ${note.length} > ${MAX} caractères`);
      // UNE proposition, pas deux : pas de tiret cadratin ni de deux-points de liaison.
      assert(!/—|: /.test(note), `${locale} : « ${note} » enchaîne deux propositions`);
    }
  }
});

// ─── Crew réel 2/3 : l'union du territoire crew (§C « moi/mon crew = chartreuse ») ───

Deno.test('stateFor + crewIds : membre de mon crew = crew, étranger = rival, moi inchangé', () => {
  const MATE = 'mate-uuid';
  const crewIds = new Set([ME, MATE]);
  const cell = '8a1fb4662b17fff';
  assertEquals(stateFor(row(cell, ME), ME, crewIds), 'crew');
  assertEquals(stateFor(row(cell, MATE), ME, crewIds), 'crew');
  assertEquals(stateFor(row(cell, RIVAL_A), ME, crewIds), 'rival');
  // Non-possédé : jamais chartreuse, même si le Set contenait n'importe quoi.
  assertEquals(stateFor(row(cell, null), ME, crewIds), 'rival');
  // Sans roster (null / absent / vide) : comportement historique intact.
  assertEquals(stateFor(row(cell, MATE), ME, null), 'rival');
  assertEquals(stateFor(row(cell, MATE), ME), 'rival');
  assertEquals(stateFor(row(cell, MATE), ME, new Set<string>()), 'rival');
});

Deno.test('buildTerritories + crewIds : même COULEUR, frontières VRAIES — deux membres = deux territoires', () => {
  const MATE = 'mate-uuid';
  const crewIds = new Set([ME, MATE]);
  const mine = republique.slice(0, 6);
  const mates = republique.slice(6, 12);
  const built = buildTerritories(
    [...mine.map((c) => row(c, ME)), ...mates.map((c) => row(c, MATE))],
    ME,
    undefined,
    crewIds,
  );
  // §C : le rôle (couleur) est partagé…
  assertEquals(built.length, 2, 'deux propriétaires = deux territoires, jamais soudés');
  assert(built.every((t) => t.props.status === 'crew'), 'les zones du membre sont chartreuse');
  // …mais le TAP sait toujours QUI tient quoi (ownerId préservé par territoire).
  const owners = new Set(built.map((t) => t.props.ownerId));
  assertEquals(owners, new Set([ME, MATE]));
});

Deno.test('buildTerritories + crewIds : un ANCIEN membre (hors roster actif) redevient rival', () => {
  const EX_MATE = 'ex-mate-uuid';
  const built = buildTerritories(
    republique.slice(0, 4).map((c) => row(c, EX_MATE)),
    ME,
    undefined,
    new Set([ME]), // roster actif sans lui
  );
  assertEquals(built.length, 1);
  assertEquals(built[0].props.status, 'rival');
});
