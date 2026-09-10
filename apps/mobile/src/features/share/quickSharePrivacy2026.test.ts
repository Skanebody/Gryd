/**
 * GRYD — UNE IMAGE QUI SORT DE L'APP NE MONTRE PAS OÙ TU HABITES.
 *
 * Ce test garde la promesse du cahier de septembre (« points de départ et
 * d'arrivée masqués ») sur le chemin le plus récent et le plus court : la
 * feuille « Partager ta sortie ». Un raccourci de partage est exactement
 * l'endroit où une protection se perd — on ajoute un bouton rapide, on lui
 * passe la trace « telle quelle » pour aller vite, et l'affiche part avec le
 * pas de porte dessus.
 *
 * DEUX NIVEAUX, PARCE QU'UN SEUL NE SUFFIRAIT PAS :
 *   1. la RÈGLE : masquer retire vraiment `SHARE_TRIM_M` autour du premier et
 *      du dernier point (avec, avant elle, l'étape 0 qui montre qu'une trace
 *      non masquée les expose — sinon rien ne distinguerait cette règle d'un
 *      no-op) ;
 *   2. la COUTURE : la feuille APPELLE cette règle et ne dessine jamais autre
 *      chose. Une règle parfaite qu'un écran contourne ne protège personne, et
 *      ce dépôt l'a appris deux fois en juillet 2026.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { protectedShareSegments2026 } from './shareTrace2026.ts';
import { haversineM, SHARE_TRIM_M } from './sharePrivacy.ts';

/** Une ligne droite d'environ 1,8 km : assez pour survivre à 2 × 250 m. */
const START = { lat: 49.4431, lng: 1.0993 };
function line(points: number): { lat: number; lng: number }[] {
  // ~9 m par pas en latitude — un pas de course crédible, et une géométrie
  // dont la longueur se calcule à la main.
  return Array.from({ length: points }, (_, index) => ({
    lat: START.lat + index * 0.00008,
    lng: START.lng,
  }));
}

const RESOLVED = { resolved: true, zones: [] as never[] };

// ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ───────────────────────────────────────────

Deno.test('ÉTAPE 0 : sans masquage, la trace partagée commence EXACTEMENT au départ réel', () => {
  // Sans cette mesure, le test suivant pourrait être vert parce que la trace
  // est vide, ou parce que le masquage ne fait rien. On montre d'abord que le
  // départ EST exposé quand on ne masque pas.
  const raw = line(250);
  const kept = protectedShareSegments2026([raw], { ...RESOLVED, maskEndpoints: false });
  assertEquals(kept.length, 1);
  const first = kept[0]![0]!;
  const last = kept[0]![kept[0]!.length - 1]!;
  assert(haversineM(first, raw[0]!) < 30, `le départ réel devrait être exposé sans masquage (${haversineM(first, raw[0]!)} m)`);
  assert(haversineM(last, raw[raw.length - 1]!) < 30, 'l’arrivée réelle devrait être exposée sans masquage');
});

// ─── 1. LA RÈGLE ────────────────────────────────────────────────────────────

Deno.test('masquer retire au moins SHARE_TRIM_M autour du départ ET de l’arrivée', () => {
  const raw = line(250);
  const kept = protectedShareSegments2026([raw], { ...RESOLVED, maskEndpoints: true });
  assert(kept.length > 0, 'la trace masquée ne devrait pas être vide sur 1,8 km');
  for (const segment of kept) {
    for (const point of segment) {
      const toStart = haversineM(point, raw[0]!);
      const toFinish = haversineM(point, raw[raw.length - 1]!);
      assert(toStart >= SHARE_TRIM_M, `un point publié est à ${Math.round(toStart)} m du départ (seuil ${SHARE_TRIM_M} m)`);
      assert(toFinish >= SHARE_TRIM_M, `un point publié est à ${Math.round(toFinish)} m de l’arrivée (seuil ${SHARE_TRIM_M} m)`);
    }
  }
});

Deno.test('une sortie trop COURTE pour être masquée ne publie AUCUN tracé', () => {
  // 300 m de long : masquer 250 m de chaque côté ne laisse rien de publiable.
  // La bonne réponse est le vide, pas « on masque un peu moins ».
  const kept = protectedShareSegments2026([line(35)], { ...RESOLVED, maskEndpoints: true });
  assertEquals(kept, []);
});

Deno.test('tant que les protections ne sont pas RÉSOLUES, aucune trace ne part', () => {
  // C'est l'état « en cours de lecture » : ne rien dessiner est la seule sortie
  // honnête. Dessiner « en attendant » publierait la trace brute.
  assertEquals(protectedShareSegments2026([line(250)], { resolved: false, maskEndpoints: true, zones: [] }), []);
  assertEquals(protectedShareSegments2026([line(250)], { resolved: false, maskEndpoints: false, zones: [] }), []);
});

Deno.test('une PAUSE ne rogne pas 250 m de plus de chaque côté de chaque fragment', () => {
  // Seuls le départ et l'arrivée de l'ACTIVITÉ créent un masque. Traiter chaque
  // fragment comme une activité mangerait la trace d'une sortie à feux rouges.
  const first = line(150);
  const second = line(150).map((point) => ({ lat: point.lat + 0.02, lng: point.lng }));
  const kept = protectedShareSegments2026([first, second], { ...RESOLVED, maskEndpoints: true });
  const total = kept.reduce((sum, segment) => sum + segment.length, 0);
  assert(total > 0, 'deux fragments d’une même sortie devraient survivre au masquage');
  // La fin du premier fragment n'est PAS l'arrivée de l'activité : elle reste.
  const endOfFirst = first[first.length - 1]!;
  assert(
    kept.some((segment) => segment.some((point) => haversineM(point, endOfFirst) < SHARE_TRIM_M)),
    'la fin d’une pause a été masquée comme si c’était l’arrivée de la sortie',
  );
});

// ─── 2. LA COUTURE : L'ÉCRAN APPELLE LA RÈGLE ───────────────────────────────

const SHEET = Deno.readTextFileSync(new URL('./QuickShareSheet2026.tsx', import.meta.url));

Deno.test('la feuille courte fait passer sa trace par le masquage, sans exception', () => {
  assert(SHEET.includes('protectedShareSegments2026'), 'la feuille n’applique aucun masquage');
  // Le poster reçoit `segments`, c'est-à-dire la SORTIE du masquage. S'il
  // recevait `run.traceSegments` ou `run.card.trace`, l'affiche exportée
  // porterait la trace brute — et c'est précisément le raccourci qu'un « on
  // corrigera plus tard » introduirait.
  const posterProps = SHEET.match(/const posterProps = \{[\s\S]*?\};/);
  assert(posterProps, 'posterProps introuvable : le test doit être mis à jour avec l’écran');
  assert(posterProps[0].includes('segments,'), 'l’affiche ne reçoit pas les segments masqués');
  assert(!posterProps[0].includes('card.trace'), 'l’affiche reçoit la trace BRUTE de la carte');
  assert(!posterProps[0].includes('traceSegments'), 'l’affiche reçoit les segments BRUTS');
});

Deno.test('la feuille lit la préférence du joueur, elle ne code pas le masquage en dur', () => {
  // `maskEndpoints: true` écrit en dur serait un mensonge à l'envers : l'écran
  // Confidentialité laisse le choix, et la feuille doit le respecter — dans les
  // deux sens, en disant ce qu'elle applique.
  assert(SHEET.includes('maskEndpoints: prefs.maskEndpoints'), 'la préférence de masquage n’est pas lue');
  assert(!/maskEndpoints:\s*(true|false)/.test(SHEET), 'le masquage est codé en dur dans la feuille');
});

Deno.test('la feuille ANNONCE l’état réel des protections, dans ses quatre cas', () => {
  // Une ligne unique « départ et arrivée masqués » serait fausse trois fois sur
  // quatre. On vérifie que les quatre états produisent chacun leur phrase.
  assert(SHEET.includes('quickShareTraceState2026'), 'l’état de la trace n’est pas dérivé');
  for (const state of ['checking', 'failed', 'none']) {
    assert(SHEET.includes(`'${state}'`), `l’état « ${state} » n’a pas de phrase dédiée`);
  }
});

Deno.test('la VIDÉO passe par la même politique que l’image', () => {
  // `generateRunFilm2026` applique `protectedShareSegments2026` en interne, à
  // condition de recevoir la politique. Lui passer `resolved: true` en dur
  // publierait une trace brute dans un MP4 — plus difficile à repérer qu'une
  // image, et tout aussi public.
  const call = SHEET.match(/generateRunFilm2026\(\{[\s\S]*?\}\)/);
  assert(call, 'appel à generateRunFilm2026 introuvable');
  assert(call[0].includes('privacy:'), 'le film ne reçoit aucune politique de vie privée');
  assert(call[0].includes('resolved: privacyResolved'), 'le film reçoit un état de résolution figé');
  assert(call[0].includes('maskEndpoints: prefs.maskEndpoints'), 'le film ignore la préférence du joueur');
});

Deno.test('AUCUNE heure ne part sur une affiche : seule la date est composée', () => {
  // Publier « 07:12 » à côté d'un tracé publie une habitude, et une habitude se
  // suit aussi bien qu'une adresse. `buildShareFacts2026` ne formate que le
  // jour, le mois et l'année — on relit la source plutôt que de le supposer.
  const model = Deno.readTextFileSync(new URL('./shareModel2026.ts', import.meta.url));
  const dateFormat = model.match(/new Intl\.DateTimeFormat\([^)]*\{[^}]*\}/);
  assert(dateFormat, 'aucun formatage de date trouvé dans shareModel2026.ts');
  for (const forbidden of ['hour', 'minute', 'second', 'timeStyle']) {
    assert(!dateFormat[0].includes(forbidden), `la date de l’affiche expose « ${forbidden} »`);
  }
});
