/**
 * GRYD — LE MIROIR DE MASQUAGE NE DÉRIVE PAS DU MOTEUR.
 *
 * ─── POURQUOI CE TEST EXISTE ────────────────────────────────────────────────
 * `share/privacy.ts` recopie la règle de confidentialité qui vit dans
 * `packages/engine/src/tracePrivacy.ts` — la MÊME que le serveur exécute avant
 * d'écrire `runs.polyline_masked`. Le dépôt sait ce que coûte une seconde
 * implémentation : « deux implémentations "équivalentes" divergent toujours, et
 * le joueur découvre l'écart au pire moment ». Ici l'écart ne serait pas un
 * chiffre faux, ce serait un domicile publié.
 *
 * Ce fichier est la seule chose qui rend la copie acceptable : il importe la
 * VRAIE source et exige une sortie identique, point par point.
 *
 * ─── POURQUOI CET IMPORT EST POSSIBLE ICI, ET NULLE PART DANS L'APP ─────────
 * `tracePrivacy.ts` importe `./polygon.ts` AVEC l'extension (Deno l'exige, le
 * tsconfig d'Expo la refuse : TS5097). Un test n'est pas typechecké par Expo —
 * `apps/mobile/tsconfig.json` exclut les fichiers `.test.ts` — et Deno, lui,
 * résout ce chemin nativement. C'est donc le seul endroit du mobile qui peut
 * tenir les deux sources dans la même main.
 *
 * ⚠️ SI CE TEST DEVIENT ROUGE : ce n'est jamais le miroir qui a raison. La
 * source est `packages/engine/`, et la bonne réparation est de recopier — ou
 * mieux, d'ajouter `tracePrivacy.ts` + `polygon.ts` à `MOBILE_ENGINE_TARGETS`
 * (`scripts/sync-game-rules.mjs`) vers `src/mvp/share/engine/`, ce qui
 * supprimerait ce fichier ET le miroir.
 */
import { SHARE_SIMPLIFY_EPSILON_M, SHARE_TRIM_M } from '@klaim/shared';
import { applyTracePrivacy, trimTraceEnds as trimMoteur } from '../../../../../packages/engine/src/tracePrivacy.ts';
import { maskForShare, trimTraceEnds, type SharePoint } from './privacy';
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

const LAT0 = 49;
const LNG0 = 1;
const M_PAR_DEG_LAT = 111_320;
const M_PAR_DEG_LNG = M_PAR_DEG_LAT * Math.cos((LAT0 * Math.PI) / 180);

function point(xM: number, yM: number): SharePoint {
  return { lat: LAT0 + yM / M_PAR_DEG_LAT, lng: LNG0 + xM / M_PAR_DEG_LNG };
}

/** Boucle carrée échantillonnée — la forme d'un tour de quartier. */
function boucleCarree(coteM: number, pasM: number): SharePoint[] {
  const out: SharePoint[] = [];
  const n = Math.round(coteM / pasM);
  for (let i = 0; i < n; i++) out.push(point((i * coteM) / n, 0));
  for (let i = 0; i < n; i++) out.push(point(coteM, (i * coteM) / n));
  for (let i = 0; i < n; i++) out.push(point(coteM - (i * coteM) / n, coteM));
  for (let i = 0; i <= n; i++) out.push(point(0, coteM - (i * coteM) / n));
  return out;
}

/** Trace bruitée : un GPS ne rend jamais des sommets parfaitement alignés. */
function bruitee(base: readonly SharePoint[], amplitudeM: number): SharePoint[] {
  // Pseudo-aléatoire DÉTERMINISTE (aucune horloge, aucun `Math.random`) : un
  // test qui ne rejoue pas à l'identique ne prouve rien le lendemain.
  let graine = 42;
  const suivant = (): number => {
    graine = (graine * 1103515245 + 12345) % 2147483648;
    return graine / 2147483648 - 0.5;
  };
  return base.map((p) => ({
    lat: p.lat + (suivant() * amplitudeM) / M_PAR_DEG_LAT,
    lng: p.lng + (suivant() * amplitudeM) / M_PAR_DEG_LNG,
  }));
}

const FIXTURES: { readonly nom: string; readonly trace: readonly SharePoint[] }[] = [
  { nom: 'boucle 2 km, pas de 20 m', trace: boucleCarree(500, 20) },
  { nom: 'boucle 2 km bruitée (±4 m)', trace: bruitee(boucleCarree(500, 20), 4) },
  { nom: 'boucle 1,2 km, pas de 10 m', trace: boucleCarree(300, 10) },
  { nom: 'boucle 400 m (trop courte pour la coupe)', trace: boucleCarree(100, 10) },
  { nom: 'ligne droite de 3 km', trace: Array.from({ length: 151 }, (_, i) => point(i * 20, 0)) },
  { nom: 'trace de 3 points', trace: [point(0, 0), point(400, 0), point(400, 400)] },
  { nom: 'trace vide', trace: [] },
];

Deno.test('drift — la coupe des extrémités est celle du moteur, point par point', () => {
  for (const { nom, trace } of FIXTURES) {
    const attendu = trimMoteur(trace, SHARE_TRIM_M);
    const obtenu = trimTraceEnds(trace, SHARE_TRIM_M);
    assertEquals(obtenu.length, attendu.length, `${nom} : nombre de points coupés différent`);
    for (let i = 0; i < attendu.length; i++) {
      assertEquals(obtenu[i]?.lat, attendu[i]?.lat, `${nom} : latitude du point ${i}`);
      assertEquals(obtenu[i]?.lng, attendu[i]?.lng, `${nom} : longitude du point ${i}`);
    }
  }
});

Deno.test('drift — le masquage complet est celui du moteur (zéro zone floutée)', () => {
  // ⚠️ `[]` n'est pas une simplification de confort : c'est l'état RÉEL du MVP.
  // Rien dans l'app n'écrit `privacy_zones` et cet écran ne lit aucun réseau —
  // l'en-tête du moteur le dit lui-même. Le jour où une zone peut exister, ce
  // test devient FAUX et le miroir doit être étendu (§1.5 : les zones
  // « prévalent sur tout rendu social »).
  for (const { nom, trace } of FIXTURES) {
    const attendu = applyTracePrivacy(trace, SHARE_TRIM_M, [], SHARE_SIMPLIFY_EPSILON_M);
    const obtenu = maskForShare(trace);
    assertEquals(obtenu.length, attendu.length, `${nom} : nombre de points publiés différent`);
    for (let i = 0; i < attendu.length; i++) {
      assertEquals(obtenu[i]?.lat, attendu[i]?.lat, `${nom} : latitude du point ${i}`);
      assertEquals(obtenu[i]?.lng, attendu[i]?.lng, `${nom} : longitude du point ${i}`);
    }
  }
});

Deno.test('drift — les fixtures exercent VRAIMENT les deux branches', () => {
  // Un test de drift dont toutes les fixtures rendraient `[]` serait vert sans
  // rien comparer : le mode d'échec le plus banal de ce genre de fichier.
  const publiees = FIXTURES.filter(({ trace }) => maskForShare(trace).length > 0);
  const vides = FIXTURES.filter(({ trace }) => maskForShare(trace).length === 0);
  assert(publiees.length >= 3, `${publiees.length} fixture(s) publiable(s) — trop peu`);
  assert(vides.length >= 2, `${vides.length} fixture(s) non publiable(s) — trop peu`);
});

Deno.test('drift — le miroir applique le PLANCHER, pas un réglage', () => {
  // Le legacy exposait `maskEndpoints`, qui pouvait passer `trimM = 0`. Le MVP
  // n'a pas cet écran : `maskForShare` ne prend aucun paramètre, et sa sortie
  // doit donc toujours valoir celle du moteur à `SHARE_TRIM_M` — jamais celle
  // à 0, qui publierait la trace brute.
  const trace = boucleCarree(500, 20);
  const brute = applyTracePrivacy(trace, 0, [], SHARE_SIMPLIFY_EPSILON_M);
  const masquee = maskForShare(trace);
  const depart = brute[0];
  const publie = masquee[0];
  assert(depart !== undefined && publie !== undefined, 'fixture trop courte');
  if (!depart || !publie) return;
  // ⚠️ Comparer les longueurs ne suffit PAS : sur une boucle carrée, les deux
  // pipelines rendent 5 sommets (les quatre coins plus une extrémité). C'est la
  // POSITION du premier point publié qui dit si la coupe a eu lieu.
  assert(
    haversineM(depart, publie) >= SHARE_TRIM_M,
    `le premier point publié n'est qu'à ${Math.round(haversineM(depart, publie))} m du départ réel`,
  );
});
