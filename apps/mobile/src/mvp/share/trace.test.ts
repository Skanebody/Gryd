/**
 * GRYD — la card de partage ne publie ni le domicile, ni une forme inventée.
 *
 * ─── ÉTAPE 0 — « le défaut existait » ───────────────────────────────────────
 * Ces tests ne servent à rien si le masquage peut être retiré sans qu'ils
 * rougissent. Chacun de ceux qui suivent CITE la ligne qui le ferait échouer :
 *   · retirer `maskForShare` de `shareTracePath` → le tracé publié repartirait
 *     du premier point GPS, donc du domicile : les tests ① et ② tombent ;
 *   · remplacer l'échelle unique par un étirement par axe → ④ tombe ;
 *   · retirer le `Z` → ③ tombe ;
 *   · accepter une `data:` URI de la capture web → ⑦ tombe.
 * Sans cette colonne, rien ne distinguerait ce fichier d'un test qui passe
 * parce qu'il ne demande rien.
 *
 * ⚠️ AUCUN LIEU RÉEL. Les fixtures sont construites à partir d'une latitude et
 * d'une longitude neutres et de DISTANCES en mètres : elles ne désignent aucune
 * ville et n'en fabriquent aucune (zéro donnée factice, constitution).
 */
import { SHARE_TRIM_M } from '@klaim/shared';
import { maskForShare, trimTraceEnds, type SharePoint } from './privacy';
import { estFichierPartageable, shareTracePath, TRACE_VIEWBOX } from './trace';
import { haversineM } from '../run/engine/validation';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(
      `${message}\n  attendu : ${JSON.stringify(expected)}\n  obtenu  : ${JSON.stringify(actual)}`,
    );
  }
}

// ─── Fixtures : des MÈTRES, jamais un lieu ──────────────────────────────────

/** Latitude/longitude de référence — neutres, aucun lieu nommé. */
const LAT0 = 49;
const LNG0 = 1;
const M_PAR_DEG_LAT = 111_320;
const M_PAR_DEG_LNG = M_PAR_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);

function point(xM: number, yM: number): SharePoint {
  return { lat: LAT0 + yM / M_PAR_DEG_LAT, lng: LNG0 + xM / M_PAR_DEG_LNG };
}

/**
 * Une boucle CARRÉE de `coteM` de côté, échantillonnée tous les `pasM` mètres,
 * départ = arrivée (le coin sud-ouest). C'est la forme d'un tour de pâté de
 * maisons : quatre côtés, et un retour au point de départ.
 */
function boucleCarree(coteM: number, pasM: number): SharePoint[] {
  const out: SharePoint[] = [];
  const n = Math.round(coteM / pasM);
  for (let i = 0; i < n; i++) out.push(point((i * coteM) / n, 0));
  for (let i = 0; i < n; i++) out.push(point(coteM, (i * coteM) / n));
  for (let i = 0; i < n; i++) out.push(point(coteM - (i * coteM) / n, coteM));
  for (let i = 0; i <= n; i++) out.push(point(0, coteM - (i * coteM) / n));
  return out;
}

/** 500 m de côté = 2 000 m de tour : il reste 1 500 m après les deux coupes. */
const BOUCLE = boucleCarree(500, 20);

// ─── ① Les extrémités sont MASQUÉES ─────────────────────────────────────────

Deno.test('① le tracé publié ne commence NI ne finit là où la course a commencé', () => {
  const masque = maskForShare(BOUCLE);
  const premier = BOUCLE[0];
  const dernier = BOUCLE[BOUCLE.length - 1];
  const gardePremier = masque[0];
  const gardeDernier = masque[masque.length - 1];
  assert(premier !== undefined && dernier !== undefined, 'fixture vide');
  assert(gardePremier !== undefined && gardeDernier !== undefined, 'rien de publiable');
  if (!premier || !dernier || !gardePremier || !gardeDernier) return;

  // Sans masquage, ces deux distances vaudraient 0 — c'est l'étape 0.
  assert(
    haversineM(premier, gardePremier) >= SHARE_TRIM_M,
    `départ masqué de ${Math.round(haversineM(premier, gardePremier))} m seulement`,
  );
  assert(
    haversineM(dernier, gardeDernier) >= SHARE_TRIM_M,
    `arrivée masquée de ${Math.round(haversineM(dernier, gardeDernier))} m seulement`,
  );
});

Deno.test('① bis la coupe vaut pour la distance PARCOURUE *et* à vol d’oiseau', () => {
  // Un aller-retour qui repasse devant chez soi : après 250 m de course, on est
  // revenu à 50 m du départ. Couper « 250 m le long du tracé » laisserait donc
  // le point de coupe à 50 m de la porte — d'où le second critère.
  const allerRetour: SharePoint[] = [];
  for (let i = 0; i <= 30; i++) allerRetour.push(point(i * 10, 0)); // 0 → 300 m
  for (let i = 29; i >= 0; i--) allerRetour.push(point(i * 10, 0)); // retour à 0
  for (let i = 1; i <= 120; i++) allerRetour.push(point(0, i * 10)); // puis 1 200 m
  const masque = trimTraceEnds(allerRetour, SHARE_TRIM_M);
  const depart = allerRetour[0];
  const garde = masque[0];
  assert(depart !== undefined && garde !== undefined, 'rien de publiable');
  if (!depart || !garde) return;
  assert(
    haversineM(depart, garde) >= SHARE_TRIM_M,
    `le premier point publié est à ${Math.round(haversineM(depart, garde))} m du départ`,
  );
});

// ─── ② Une trace trop courte ne se publie PAS ───────────────────────────────

Deno.test('② une trace de 3 points ne donne AUCUN chemin (rien de publiable)', () => {
  // 3 points ne peuvent pas survivre : la coupe retire au moins un point à
  // chaque bout, et il en faut 3 pour dessiner autre chose qu'un trait.
  // L'appelant n'a donc pas de card — et donc pas de bouton de partage.
  const troisPoints = [point(0, 0), point(200, 0), point(200, 200)];
  assertEquals(maskForShare(troisPoints).length, 0);
  assertEquals(shareTracePath(troisPoints), null);
});

Deno.test('② bis une boucle trop courte pour la coupe ne se publie pas non plus', () => {
  // 100 m de côté = 400 m de tour : on ne peut pas en couper 250 à chaque bout.
  // « On préfère rien à un masquage insuffisant. »
  assertEquals(shareTracePath(boucleCarree(100, 10)), null);
});

Deno.test('② ter un GPS bloqué sur place ne donne pas une forme', () => {
  const surPlace: SharePoint[] = [];
  for (let i = 0; i < 60; i++) surPlace.push(point(0, 0));
  assertEquals(shareTracePath(surPlace), null);
});

// ─── ③ Le chemin est un contour FERMÉ, dans le cadre ────────────────────────

Deno.test('③ le chemin est fermé et tient dans le viewBox', () => {
  const d = shareTracePath(BOUCLE);
  assert(d !== null, 'la boucle de 2 km doit produire un chemin');
  if (d === null) return;
  assert(d.startsWith('M '), `le chemin ne commence pas par un déplacement : ${d.slice(0, 12)}`);
  assert(d.endsWith(' Z'), 'le contour n’est pas refermé');
  assert(d.split('L').length - 1 >= 3, 'un contour demande au moins 3 segments');

  for (const n of d.match(/-?\d+(\.\d+)?/g) ?? []) {
    const v = Number(n);
    assert(v >= 0 && v <= TRACE_VIEWBOX, `coordonnée hors cadre : ${n}`);
  }
});

// ─── ④ La forme n'est pas déformée ──────────────────────────────────────────

Deno.test('④ un carré reste un carré : une seule échelle pour les deux axes', () => {
  // Étirer indépendamment x et y remplirait le cadre, et ferait d'un carré un
  // rectangle : la card raconterait une course qui n'a pas eu lieu.
  const d = shareTracePath(BOUCLE);
  assert(d !== null, 'chemin attendu');
  if (d === null) return;
  const nombres = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = nombres.filter((_, i) => i % 2 === 0);
  const ys = nombres.filter((_, i) => i % 2 === 1);
  const largeur = Math.max(...xs) - Math.min(...xs);
  const hauteur = Math.max(...ys) - Math.min(...ys);
  // Le carré est amputé de ses deux bouts : l'étendue reste égale sur les deux
  // axes à la tolérance de simplification près (15 m sur 500 m de côté ≈ 3 %).
  assert(
    Math.abs(largeur - hauteur) / Math.max(largeur, hauteur) < 0.05,
    `forme déformée : ${largeur.toFixed(1)} × ${hauteur.toFixed(1)}`,
  );
});

Deno.test('④ bis un aller-retour long et étroit reste long et étroit', () => {
  const couloir: SharePoint[] = [];
  for (let i = 0; i <= 100; i++) couloir.push(point(i * 20, 0)); // 2 000 m
  for (let i = 99; i >= 0; i--) couloir.push(point(i * 20, 40)); // retour décalé
  const d = shareTracePath(couloir);
  assert(d !== null, 'chemin attendu');
  if (d === null) return;
  const nombres = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const xs = nombres.filter((_, i) => i % 2 === 0);
  const ys = nombres.filter((_, i) => i % 2 === 1);
  const largeur = Math.max(...xs) - Math.min(...xs);
  const hauteur = Math.max(...ys) - Math.min(...ys);
  assert(largeur > hauteur * 5, `couloir aplati en ${largeur.toFixed(1)} × ${hauteur.toFixed(1)}`);
});

// ─── ⑤ Le nord reste en haut ────────────────────────────────────────────────

Deno.test('⑤ le nord est EN HAUT : l’axe y est inversé pour le SVG', () => {
  // En projection locale y monte vers le nord ; en SVG il descend. Sans
  // inversion, la card publie le miroir horizontal de la course.
  const d = shareTracePath(BOUCLE);
  assert(d !== null, 'chemin attendu');
  if (d === null) return;
  const masque = maskForShare(BOUCLE);
  const premier = masque[0];
  assert(premier !== undefined, 'rien de publiable');
  if (!premier) return;
  const plusAuNord = masque.reduce((a, b) => (b.lat > a.lat ? b : a), premier);
  const plusAuSud = masque.reduce((a, b) => (b.lat < a.lat ? b : a), premier);
  assert(plusAuNord.lat > plusAuSud.lat, 'fixture plate');

  const indexNord = masque.indexOf(plusAuNord);
  const indexSud = masque.indexOf(plusAuSud);
  const nombres = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const yNord = nombres[indexNord * 2 + 1];
  const ySud = nombres[indexSud * 2 + 1];
  assert(yNord !== undefined && ySud !== undefined, 'chemin trop court');
  if (yNord === undefined || ySud === undefined) return;
  assert(yNord < ySud, `le point le plus au nord est peint plus bas (${yNord} ≥ ${ySud})`);
});

// ─── ⑥ La résolution publiée est dégradée (§12.1, 2ᵉ moitié) ────────────────

Deno.test('⑥ la trace publiée est SIMPLIFIÉE, jamais au mètre près', () => {
  // Couper les bouts ne suffit pas : entre les deux, une trace au mètre près
  // dit quel trottoir. Les deux règles sont cumulatives (game-rules §12.1).
  const masque = maskForShare(BOUCLE);
  const coupe = trimTraceEnds(BOUCLE, SHARE_TRIM_M);
  assert(coupe.length > 0, 'fixture trop courte');
  assert(
    masque.length < coupe.length,
    `aucune simplification : ${masque.length} points publiés pour ${coupe.length} conservés`,
  );
});

Deno.test('⑥ bis la simplification ne réintroduit aucun point coupé', () => {
  // Garantie 1 de Douglas-Peucker : la sortie est une SOUS-SUITE de l'entrée,
  // avec les objets d'origine. Un point retiré par la coupe ne peut donc pas
  // revenir par la simplification.
  const coupe = trimTraceEnds(BOUCLE, SHARE_TRIM_M);
  for (const p of maskForShare(BOUCLE)) {
    assert(coupe.includes(p), 'un point publié ne vient pas de la trace coupée');
  }
});

// ─── ⑦ Ce qui peut réellement être remis à une feuille de partage ───────────

Deno.test('⑦ une capture WEB (data: URI) n’est pas partageable — donc pas de bouton', () => {
  assertEquals(estFichierPartageable('data:image/png;base64,iVBORw0KGgo='), false);
  assertEquals(estFichierPartageable('blob:http://localhost/abc'), false);
  assertEquals(estFichierPartageable('https://example.invalid/a.png'), false);
});

Deno.test('⑦ bis les fichiers temporaires natifs, eux, le sont', () => {
  assertEquals(estFichierPartageable('file:///var/mobile/tmp/ReactNative/x.png'), true);
  // Android écrit parfois `file:/…` avec un seul slash.
  assertEquals(estFichierPartageable('file:/data/user/0/run.gryd/cache/x.png'), true);
  assertEquals(estFichierPartageable('/data/user/0/run.gryd/cache/x.png'), true);
});
