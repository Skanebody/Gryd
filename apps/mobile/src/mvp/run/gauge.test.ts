/**
 * GRYD — la jauge ne promet pas une boucle que le moteur refusera (lot M5).
 *
 * Le premier test est le plus important du fichier : trois secondes après le
 * GO, le départ et le point courant sont confondus, donc l'écart vaut zéro et
 * `loopClosureVerdict` dit « fermée ». Affiché tel quel, GRYD annoncerait une
 * boucle bouclée à quelqu'un qui n'a pas quitté son trottoir. Ça arriverait à
 * TOUS les joueurs, à CHAQUE course.
 */
import { gauge } from './gauge';
import { type LatLngPoint } from './engine/closure';

declare const Deno: { test(nom: string, fn: () => void | Promise<void>): void };

function assert(condition: boolean, message = 'assertion échouée'): void {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

/** ~1 m de latitude en degrés — de quoi construire des traces à la bonne échelle. */
const M_EN_DEG = 1 / 111_195;

/** Rouen, comme partout ailleurs dans le dépôt. */
const DEPART: LatLngPoint = { lat: 49.4431, lng: 1.0993 };

/**
 * Un carré de `coteM` mètres de côté, échantillonné tous les ~10 m, refermé à
 * `ecartM` mètres du départ. Périmètre ≈ 4 × coteM.
 */
function carre(coteM: number, ecartM: number): LatLngPoint[] {
  const pts: LatLngPoint[] = [];
  const d = M_EN_DEG;
  const cosLat = Math.cos((DEPART.lat * Math.PI) / 180);
  const pas = 10;
  const pousse = (dxM: number, dyM: number) => {
    const dernier = pts[pts.length - 1] ?? DEPART;
    pts.push({ lat: dernier.lat + dyM * d, lng: dernier.lng + (dxM * d) / cosLat });
  };
  pts.push({ ...DEPART });
  for (let i = 0; i < coteM; i += pas) pousse(pas, 0);
  for (let i = 0; i < coteM; i += pas) pousse(0, pas);
  for (let i = 0; i < coteM; i += pas) pousse(-pas, 0);
  // Dernier côté : on s'arrête `ecartM` avant de boucler.
  for (let i = 0; i < coteM - ecartM; i += pas) pousse(0, -pas);
  return pts;
}

// ─── LE test : le silence des premières secondes ────────────────────────────

Deno.test('les premières secondes NE DISENT RIEN, même si l’écart vaut zéro', () => {
  // Départ et point courant confondus → `loopClosureVerdict` dit « closed ».
  // La jauge, elle, se tait : la trace n'est pas encore un candidat.
  const surPlace: LatLngPoint[] = [DEPART, { ...DEPART }, { ...DEPART }];
  assertEquals(gauge(surPlace).kind, 'silent');

  // Même chose après 200 m — bien en dessous du périmètre minimal.
  assertEquals(gauge(carre(50, 0)).kind, 'silent');
});

Deno.test('une trace VIDE ou d’un seul point ne dit rien non plus', () => {
  assertEquals(gauge([]).kind, 'silent');
  assertEquals(gauge([DEPART]).kind, 'silent');
});

// ─── Une fois la trace candidate ────────────────────────────────────────────

Deno.test('boucle assez longue et refermée → « fermée »', () => {
  // 4 × 250 m = 1 km de périmètre, largement au-dessus du minimum, écart nul.
  assertEquals(gauge(carre(250, 0)).kind, 'closed');
});

Deno.test('dans la bande assistée → « presque », JAMAIS confondu avec fermée', () => {
  // GRYD refermera à sa place : le produit doit savoir ce qu'il a donné.
  const g = gauge(carre(250, 50));
  assertEquals(g.kind, 'almost', `écart de 50 m lu « ${g.kind} »`);
});

Deno.test('ouverte mais à portée → le manque EN MÈTRES, toujours > 0', () => {
  const g = gauge(carre(250, 120));
  assertEquals(g.kind, 'missing');
  if (g.kind !== 'missing') return;
  assert(g.missingM > 0, `« 0 m restants » affiché sur une boucle non accordée`);
  // Le manque se mesure depuis la BANDE ASSISTÉE, pas depuis le départ :
  // annoncer plus que le vrai découragerait pour rien.
  assert(g.missingM < 120, `manque surestimé : ${g.missingM} m pour un écart de 120 m`);
});

Deno.test('trop loin de la fermeture → SILENCE, pas « il te manque 2 400 m »', () => {
  // Le joueur n'est pas en train de refermer, il court. Une jauge qui parle
  // tout le temps ne se lit plus (L5).
  const ligneDroite: LatLngPoint[] = [];
  for (let i = 0; i < 300; i += 1) {
    ligneDroite.push({ lat: DEPART.lat + i * 10 * M_EN_DEG, lng: DEPART.lng });
  }
  assertEquals(gauge(ligneDroite).kind, 'silent');
});

// ─── Le sens du doute sur la première capture ───────────────────────────────

Deno.test('par défaut, la jauge parle PLUS TARD — jamais plus tôt', () => {
  // Le seuil de première capture est plus BAS. Le défaut prend le plus HAUT :
  // se tromper fait dire moins qu'on pourrait, au lieu de promettre une boucle
  // que le moteur refuserait.
  const courte = carre(120, 0); // ~480 m de périmètre
  assertEquals(gauge(courte).kind, 'silent');
  assertEquals(gauge(courte, 'run', true).kind, 'closed');
});
