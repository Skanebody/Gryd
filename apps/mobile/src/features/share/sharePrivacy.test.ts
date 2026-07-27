/**
 * GRYD — le masquage privacy du partage est-il celui que l'écran PROMET ?
 *
 * Ce test existe parce que `sharePrivacy.ts` est le SEUL endroit du dépôt où la
 * promesse « départ/arrivée masqués » est tenue (ou pas), et parce que l'écran
 * Confidentialité ANNONCE la distance en lisant la même constante : si la coupe
 * et l'annonce divergent, l'app ment. On vérifie donc trois choses que la spec
 * §12.1 / §1.5 exige, dans cet ordre de gravité :
 *   1. la distance est bien 250 m, et elle vient de game-rules (source unique) ;
 *   2. la coupe est « AUTOUR » du départ/arrivée — pas seulement « le long de »
 *      la polyligne (un aller-retour ne doit pas exposer le domicile) ;
 *   3. une trace trop courte ne produit JAMAIS un masquage insuffisant déguisé
 *      en masquage complet — elle ne produit rien du tout.
 * Puis les zones floutées (§12.1 « appliquer les zones floutées », §1.5 « elles
 * prévalent sur tout rendu social »).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  SHARE_SIMPLIFY_EPSILON_M as SHARED_EPSILON,
  SHARE_TRIM_M as SHARED_TRIM,
} from '@klaim/shared';
import {
  applyPrivacyZones,
  applySharePrivacy,
  haversineM,
  trimTraceEnds,
  SHARE_SIMPLIFY_EPSILON_M,
  SHARE_TRIM_M,
  type PrivacyZone,
} from './sharePrivacy.ts';
import type { LatLngPoint } from '../map/realAnchors.ts';

// Paris, un point de départ quelconque — la latitude n'est là que pour que les
// mètres soient des vrais mètres (haversine).
const HOME: LatLngPoint = { lat: 48.8566, lng: 2.3522 };
/** 1 m en degrés de latitude (méridien) — sert à fabriquer des traces mesurables. */
const DEG_PER_M = 1 / 111_320;
/** 1 m en degrés de LONGITUDE à la latitude de HOME (le méridien y est resserré). */
const LNG_DEG_PER_M = 1 / (111_320 * Math.cos((HOME.lat * Math.PI) / 180));

/** Ligne droite plein nord depuis `from`, `count` points espacés de `stepM`. */
const northLine = (from: LatLngPoint, count: number, stepM: number): LatLngPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    lat: from.lat + i * stepM * DEG_PER_M,
    lng: from.lng,
  }));

/**
 * Trace SINUEUSE plein nord : même progression que `northLine`, plus un
 * balancement latéral d'amplitude `swayM`. Une ligne parfaitement droite est le
 * cas DÉGÉNÉRÉ de la simplification (Douglas-Peucker la réduit à ses deux
 * bouts) ; une vraie course serpente, et c'est sur elle qu'on mesure ce que la
 * simplification retire vraiment.
 */
const wigglyNorthLine = (
  from: LatLngPoint,
  count: number,
  stepM: number,
  swayM: number,
): LatLngPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    lat: from.lat + i * stepM * DEG_PER_M,
    lng: from.lng + Math.sin(i / 2) * swayM * LNG_DEG_PER_M,
  }));

/** Le résultat est-il une SOUS-SUITE de l'entrée (même ordre, rien d'inventé) ? */
const isSubsequence = (
  out: readonly LatLngPoint[],
  input: readonly LatLngPoint[],
): boolean => {
  let i = 0;
  for (const p of out) {
    while (i < input.length && input[i] !== p) i++;
    if (i >= input.length) return false;
    i++;
  }
  return true;
};

/** Longueur cumulée d'une polyligne, en mètres. */
const lengthM = (trace: readonly LatLngPoint[]): number => {
  let d = 0;
  for (let i = 1; i < trace.length; i++) {
    const a = trace[i - 1];
    const b = trace[i];
    if (a && b) d += haversineM(a, b);
  }
  return d;
};

/** Le résultat est-il une TRANCHE contiguë de l'entrée (aucun point inventé) ? */
const isContiguousSlice = (
  out: readonly LatLngPoint[],
  input: readonly LatLngPoint[],
): boolean => {
  if (out.length === 0) return true;
  const first = out[0];
  if (!first) return false;
  const at = input.findIndex((p) => p.lat === first.lat && p.lng === first.lng);
  if (at < 0) return false;
  return out.every((p, i) => {
    const src = input[at + i];
    return !!src && src.lat === p.lat && src.lng === p.lng;
  });
};

// ═══ 1. LA CONSTANTE ════════════════════════════════════════════════════════

Deno.test('§12.1 : la coupe vaut 250 m — le plancher de la spec, pas 200', () => {
  assertEquals(SHARE_TRIM_M, 250);
});

Deno.test('la constante vient de game-rules (source unique) — pas d’un littéral local', () => {
  assertEquals(SHARE_TRIM_M, SHARED_TRIM);
});

// ═══ 2. LA COUPE AUX DEUX BOUTS ═════════════════════════════════════════════

Deno.test('§12.1 : un tracé est coupé d’AU MOINS 250 m aux DEUX bouts', () => {
  // 2 km plein nord, un point tous les 25 m.
  const trace = northLine(HOME, 81, 25);
  assert(Math.abs(lengthM(trace) - 2000) < 5, 'la trace de référence fait bien ~2 km');

  const out = applySharePrivacy(trace);
  assert(out.length >= 3, 'un 2 km doit rester partageable');

  const start = trace[0]!;
  const end = trace[trace.length - 1]!;
  const kept0 = out[0]!;
  const keptN = out[out.length - 1]!;

  // Distance cumulée retirée à chaque bout.
  const idx0 = trace.findIndex((p) => p.lat === kept0.lat && p.lng === kept0.lng);
  const idxN = trace.findIndex((p) => p.lat === keptN.lat && p.lng === keptN.lng);
  assert(
    lengthM(trace.slice(0, idx0 + 1)) >= SHARE_TRIM_M,
    'moins de 250 m retirés au DÉPART',
  );
  assert(
    lengthM(trace.slice(idxN)) >= SHARE_TRIM_M,
    'moins de 250 m retirés à l’ARRIVÉE',
  );
  // Et « autour » : à vol d’oiseau aussi.
  assert(haversineM(start, kept0) >= SHARE_TRIM_M, 'le 1er point rendu est trop près du départ');
  assert(haversineM(end, keptN) >= SHARE_TRIM_M, 'le dernier point rendu est trop près de l’arrivée');
});

Deno.test('la COUPE seule ne fabrique rien : tranche contiguë de l’entrée', () => {
  const trace = northLine(HOME, 81, 25);
  const out = trimTraceEnds(trace, SHARE_TRIM_M);
  assert(isContiguousSlice(out, trace), 'des points ont été inventés ou réordonnés');
});

Deno.test('le PIPELINE COMPLET ne fabrique rien : sous-suite, et les MÊMES objets', () => {
  // Après simplification le résultat n'est plus contigu (c'est le but : des
  // sommets sautent) — mais il reste une SOUS-SUITE, et chaque point rendu est
  // l'OBJET d'origine, pas une coordonnée recalculée. C'est cette identité qui
  // garantit qu'aucune position n'a été inventée entre deux points mesurés.
  const trace = wigglyNorthLine(HOME, 81, 25, 40);
  const out = applySharePrivacy(trace);
  assert(out.length >= 3, 'un 2 km sinueux doit rester partageable');
  assert(isSubsequence(out, trace), 'des points ont été inventés ou réordonnés');
  for (const p of out) {
    assert(trace.some((q) => q === p), 'un point rendu n’est pas un objet de l’entrée');
  }
});

Deno.test('§12.1 « AUTOUR » : un aller-retour qui repasse devant chez soi reste masqué', () => {
  // 150 m plein nord, retour au point de départ, puis 1,5 km plein nord.
  // Au point de retour, la distance PARCOURUE vaut 300 m (> 250) mais la
  // distance au domicile vaut ~0 : une coupe « le long de la trace » seule
  // exposerait le paillasson.
  const out150 = northLine(HOME, 7, 25); // 0 → 150 m
  const back = [...out150].reverse().slice(1); // 150 → 0 m
  const away = northLine(HOME, 61, 25).slice(1); // 0 → 1500 m
  const trace = [...out150, ...back, ...away];

  const kept = applySharePrivacy(trace);
  assert(kept.length >= 3, 'la trace est assez longue pour rester partageable');
  for (const p of kept) {
    assert(
      haversineM(HOME, p) >= SHARE_TRIM_M,
      `un point rendu est à ${Math.round(haversineM(HOME, p))} m du départ (< 250 m)`,
    );
  }
});

// ═══ 3. TROP COURT : RIEN, JAMAIS UN MASQUAGE INSUFFISANT ═══════════════════

Deno.test('trop court pour un double masquage de 250 m → RIEN (pas un tiers médian sous-masqué)', () => {
  // 400 m : 250 + 250 = 500 m > 400 m. Il n’existe aucun point publiable.
  const trace = northLine(HOME, 17, 25);
  assert(Math.abs(lengthM(trace) - 400) < 5, 'la trace de référence fait bien ~400 m');
  assertEquals(applySharePrivacy(trace), []);
});

Deno.test('une trace juste assez longue survit, et chaque point rendu respecte les 250 m', () => {
  // 900 m : il reste ~400 m au milieu.
  const trace = northLine(HOME, 37, 25);
  assert(Math.abs(lengthM(trace) - 900) < 5, 'la trace de référence fait bien ~900 m');
  const out = applySharePrivacy(trace);
  assert(out.length >= 3, 'un 900 m doit rester partageable');
  const start = trace[0]!;
  const end = trace[trace.length - 1]!;
  for (const p of out) {
    assert(haversineM(start, p) >= SHARE_TRIM_M, 'point trop près du départ');
    assert(haversineM(end, p) >= SHARE_TRIM_M, 'point trop près de l’arrivée');
  }
});

Deno.test('moins de 3 points en entrée → [] (l’appelant bascule sur « tracé inconnu »)', () => {
  assertEquals(applySharePrivacy([]), []);
  assertEquals(applySharePrivacy([HOME]), []);
  assertEquals(applySharePrivacy([HOME, { lat: HOME.lat + 0.01, lng: HOME.lng }]), []);
});

Deno.test('trimM <= 0 : la COUPE est désactivée — mais pas la §12.1 entière', () => {
  // Le réglage du joueur (`maskEndpoints`) gouverne les 250 m, PAS la
  // simplification, qui est une règle du produit : les deux bouts reviennent
  // intacts, le milieu est dégradé.
  const trace = wigglyNorthLine(HOME, 41, 25, 40);
  const out = applySharePrivacy(trace, 0);
  assertEquals(out[0], trace[0], 'le départ doit revenir intact quand la coupe est off');
  assertEquals(out[out.length - 1], trace[trace.length - 1], 'l’arrivée doit revenir intacte');
  assert(out.length < trace.length, 'la simplification doit tout de même s’appliquer');
  assert(isSubsequence(out, trace), 'sous-suite');
});

Deno.test('trimTraceEnds est PURE : l’entrée n’est pas mutée', () => {
  const trace = northLine(HOME, 81, 25);
  const before = JSON.stringify(trace);
  trimTraceEnds(trace, SHARE_TRIM_M);
  assertEquals(JSON.stringify(trace), before);
});

// ═══ 4. LES ZONES FLOUTÉES (§12.1) ══════════════════════════════════════════

Deno.test('§12.1 : les zones floutées sont APPLIQUÉES — aucun point rendu n’y tombe', () => {
  const trace = northLine(HOME, 81, 25); // 2 km
  const middle = trace[40]!; // ~1000 m
  const zone: PrivacyZone = { center: middle, radiusM: 300 };

  const out = applySharePrivacy(trace, SHARE_TRIM_M, [zone]);
  assert(out.length >= 3, 'il reste un segment publiable de part et d’autre');
  for (const p of out) {
    assert(
      haversineM(zone.center, p) > zone.radiusM,
      'un point rendu tombe DANS la zone floutée',
    );
  }
});

Deno.test('une zone qui couvre tout ce qui restait → RIEN (pas un repli sur la trace brute)', () => {
  const trace = northLine(HOME, 81, 25);
  const middle = trace[40]!;
  assertEquals(applySharePrivacy(trace, SHARE_TRIM_M, [{ center: middle, radiusM: 5000 }]), []);
});

Deno.test('§1.5 : les zones prévalent MÊME quand la coupe des extrémités est désactivée', () => {
  const trace = northLine(HOME, 81, 25);
  const middle = trace[40]!;
  const out = applySharePrivacy(trace, 0, [{ center: middle, radiusM: 300 }]);
  assert(out.length > 0, 'il reste un segment');
  for (const p of out) {
    assert(haversineM(middle, p) > 300, 'un point rendu tombe dans la zone floutée');
  }
});

Deno.test('un trou de zone n’est JAMAIS recollé — deux segments, pas une ligne droite inventée', () => {
  const trace = northLine(HOME, 81, 25);
  const middle = trace[40]!;
  const segments = applyPrivacyZones(trace, [{ center: middle, radiusM: 300 }]);
  assertEquals(segments.length, 2);
  // Le saut entre la fin du 1er segment et le début du 2e est RÉEL (> 2×rayon
  // moins un pas) : si le module recollait, il dessinerait cette ligne droite.
  const a = segments[0]!;
  const b = segments[1]!;
  const gap = haversineM(a[a.length - 1]!, b[0]!);
  assert(gap > 500, `le trou fait ${Math.round(gap)} m et il reste OUVERT`);
});

Deno.test('aucune zone déclarée → la trace ressort entière (un seul segment)', () => {
  const trace = northLine(HOME, 81, 25);
  assertEquals(applyPrivacyZones(trace, []), [trace]);
});

Deno.test('une zone de rayon 0 ne masque rien (une zone vide n’est pas une zone)', () => {
  const trace = northLine(HOME, 81, 25);
  assertEquals(applyPrivacyZones(trace, [{ center: trace[40]!, radiusM: 0 }]), [trace]);
});

Deno.test('applySharePrivacy rend le PLUS LONG segment survivant (puis le simplifie)', () => {
  const trace = wigglyNorthLine(HOME, 81, 25, 40); // 2 km
  // Zone décentrée : le segment aval est plus long que le segment amont.
  const zone: PrivacyZone = { center: trace[24]!, radiusM: 120 };
  const segments = applyPrivacyZones(trimTraceEnds(trace, SHARE_TRIM_M), [zone]);
  assert(segments.length >= 2, 'la zone coupe bien la trace en deux');
  const longest = segments.reduce((m, s) => (s.length > m.length ? s : m), segments[0]!);
  const out = applySharePrivacy(trace, SHARE_TRIM_M, [zone]);
  assert(isSubsequence(out, longest), 'le rendu doit être une sous-suite du plus long segment');
  assertEquals(out[0], longest[0], 'même début que le segment retenu');
  assertEquals(out[out.length - 1], longest[longest.length - 1], 'même fin');
});

// ═══ 5. LA SIMPLIFICATION (§12.1 « simplifier les contours ») ═══════════════

Deno.test('la tolérance vient de game-rules (source unique) — pas d’un littéral local', () => {
  assertEquals(SHARE_SIMPLIFY_EPSILON_M, SHARED_EPSILON);
});

Deno.test('§12.1 : la trace PUBLIÉE est STRICTEMENT plus courte que la trace brute', () => {
  const trace = wigglyNorthLine(HOME, 81, 25, 40); // ~2 km sinueux
  const out = applySharePrivacy(trace);
  assert(out.length >= 3, 'un 2 km doit rester partageable');
  // Moins de points…
  assert(
    out.length < trace.length,
    `la trace publiée a ${out.length} points, la brute ${trace.length}`,
  );
  // …ET moins de mètres. Les deux comptent : couper les bouts réduit déjà la
  // longueur, la simplification réduit en plus la RÉSOLUTION de ce qui reste.
  assert(
    lengthM(out) < lengthM(trace),
    `la trace publiée fait ${Math.round(lengthM(out))} m, la brute ${Math.round(lengthM(trace))} m`,
  );
  // Et la simplification a bien retiré des sommets EN PLUS de la coupe : sinon
  // ce test passerait alors que rien ne simplifie (le piège de la fondation).
  const trimmedOnly = trimTraceEnds(trace, SHARE_TRIM_M);
  assert(
    out.length < trimmedOnly.length,
    `la simplification n’a retiré aucun sommet (${out.length} vs ${trimmedOnly.length})`,
  );
});

Deno.test('ORDRE DES ÉTAPES : APRÈS simplification, les extrémités restent masquées', () => {
  const trace = wigglyNorthLine(HOME, 81, 25, 40);
  const start = trace[0]!;
  const end = trace[trace.length - 1]!;
  const out = applySharePrivacy(trace);
  assert(out.length >= 3, 'la trace reste partageable');
  for (const p of out) {
    assert(
      haversineM(start, p) >= SHARE_TRIM_M,
      `un point PUBLIÉ est à ${Math.round(haversineM(start, p))} m du départ`,
    );
    assert(
      haversineM(end, p) >= SHARE_TRIM_M,
      `un point PUBLIÉ est à ${Math.round(haversineM(end, p))} m de l’arrivée`,
    );
  }
});

Deno.test('une simplification ne peut JAMAIS ressusciter un point supprimé (coupe)', () => {
  const trace = wigglyNorthLine(HOME, 81, 25, 40);
  const survivors = new Set<LatLngPoint>(trimTraceEnds(trace, SHARE_TRIM_M));
  assert(survivors.size > 0 && survivors.size < trace.length, 'la coupe a bien retiré des points');
  for (const p of applySharePrivacy(trace)) {
    assert(survivors.has(p), 'un point coupé aux extrémités est réapparu après simplification');
  }
});

Deno.test('une simplification ne peut JAMAIS ressusciter un point supprimé (zone floutée)', () => {
  const trace = wigglyNorthLine(HOME, 81, 25, 40);
  const zone: PrivacyZone = { center: trace[40]!, radiusM: 300 };
  const out = applySharePrivacy(trace, SHARE_TRIM_M, [zone]);
  assert(out.length >= 3, 'il reste un segment publiable');
  for (const p of out) {
    assert(
      haversineM(zone.center, p) > zone.radiusM,
      'un point de la zone floutée est réapparu après simplification',
    );
  }
});

Deno.test('la simplification ne se DÉSACTIVE pas : une tolérance plus fine est ignorée', () => {
  // `SHARE_SIMPLIFY_EPSILON_M` est un plancher, pas un défaut : un appelant peut
  // flouter DAVANTAGE, jamais publier plus précis que la règle §12.1.
  const trace = wigglyNorthLine(HOME, 81, 25, 40);
  const promis = applySharePrivacy(trace);
  assertEquals(applySharePrivacy(trace, SHARE_TRIM_M, [], 0), promis, 'tolérance 0');
  assertEquals(applySharePrivacy(trace, SHARE_TRIM_M, [], -50), promis, 'tolérance négative');
  assertEquals(applySharePrivacy(trace, SHARE_TRIM_M, [], 1), promis, 'tolérance 1 m');
  // Plus grossier, en revanche, est accepté : c'est du floutage EN PLUS.
  const grossier = applySharePrivacy(trace, SHARE_TRIM_M, [], 200);
  assert(grossier.length <= promis.length, 'une tolérance plus grande ne peut pas ajouter de points');
});

Deno.test('une ligne parfaitement droite reste RENDABLE (≥ 3 points, tous réels)', () => {
  // Cas dégénéré : Douglas-Peucker réduirait le segment à ses deux bouts, et
  // `hasKnownRoute` (≥ 3 points, app/partage.tsx) lirait « tracé inconnu » —
  // un mensonge par sous-affichage, la route EST connue. Le plancher réinsère
  // le point MÉDIAN, qui est un point RÉEL de la trace conservée.
  const trace = northLine(HOME, 81, 25);
  const kept = trimTraceEnds(trace, SHARE_TRIM_M);
  const out = applySharePrivacy(trace);
  assertEquals(out.length, 3);
  for (const p of out) {
    assert(kept.includes(p), 'le point réinséré doit venir de la trace conservée');
  }
  assertEquals(out[0], kept[0]);
  assertEquals(out[2], kept[kept.length - 1]);
});

Deno.test('la simplification n’élargit jamais la fenêtre publiée', () => {
  // Propriété structurante : premier et dernier point rendus sont EXACTEMENT
  // ceux du segment conservé. La généralisation ne repousse donc jamais la
  // trace publiée vers ce que la coupe venait de retirer.
  const trace = wigglyNorthLine(HOME, 81, 25, 40);
  const kept = trimTraceEnds(trace, SHARE_TRIM_M);
  const out = applySharePrivacy(trace);
  assertEquals(out[0], kept[0]);
  assertEquals(out[out.length - 1], kept[kept.length - 1]);
});
