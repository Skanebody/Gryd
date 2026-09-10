/**
 * GRYD — LA COUTURE DE L'INVITATION ET DU SCANNER (LOT Q4, 11/09/2026).
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * `scanTarget2026.test.ts` prouve que le PARSING est juste. `inviteToken.test.ts`
 * prouve que les liens sont bien formés. Aucun des deux ne peut prouver qu'un
 * écran les APPELLE, ni qu'un membre trouve le bouton. C'est le même angle mort
 * que celui de `crewCouture.test.ts` (10/09/2026), où le fondateur avait dû
 * signaler depuis son iPhone qu'« on me propose seulement de rejoindre un crew,
 * jamais d'en créer un » : le code marchait, l'écran ne l'offrait pas.
 *
 * Ces tests lisent le SOURCE et y cherchent des formes. Filet grossier : il
 * n'attrape ni une hiérarchie visuelle ni un contraste. Mais chaque règle cite
 * le code EXACT qu'elle aurait fait échouer.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
  statSync(chemin: string | URL): { isFile: boolean };
};

/** Le code HORS commentaires : citer un défaut dans un docblock ne le recrée pas. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

function lire(chemin: string): string {
  const source = Deno.readTextFileSync(new URL(chemin, import.meta.url));
  // Un chemin faux rendrait toutes les règles vertes sans rien vérifier : c'est
  // le mode d'échec le plus banal de ce genre de test.
  assert(source.length > 400, `${chemin} : source trop courte, le chemin est faux`);
  return source;
}

const ACCUEIL = '../refonte/CrewHomeScreen.tsx';
const AFFICHE = './CrewInvitationScreen2026.tsx';
const ROUTE = '../../../app/crew-invitation.tsx';
const QR = '../../../app/qr.tsx';
const PANNEAU = '../scan/QRScannerPanel2026.tsx';

// ═══════════════════════════════════════════════════════════════════════════
// ① INVITER EST À UN TAP, DEPUIS LA PAGE DU CREW
//
// ÉTAPE 0 — LE DÉFAUT EXISTAIT (CrewHomeScreen.tsx, commit 685e769) :
//
//   if (mode === 'invite' && crew.crew) return <CrewInviteScreen … />;
//
// L'affiche n'était pas un écran mais un MODE. Conséquences payées : aucune
// adresse à ouvrir, aucun retour système (le geste iOS de retour sortait de
// l'onglet au lieu de refermer l'affiche), et `scripts/audit-routes.mjs` ne
// voyait rien. Le geste MARCHAIT ; c'est sa nature qui était fausse.
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('invitation : la route `/crew-invitation` existe et sert l’écran', () => {
  assert(Deno.statSync(new URL(ROUTE, import.meta.url)).isFile, 'app/crew-invitation.tsx manquant');
  const code = codeSeul(lire(ROUTE));
  assert(
    code.includes('CrewInvitationScreen2026'),
    'la route ne sert pas l’écran d’invitation',
  );
});

Deno.test('invitation : la page du crew y mène, et l’ancien MODE a disparu', () => {
  const code = codeSeul(lire(ACCUEIL));
  assert(code.includes("router.push('/crew-invitation')"), 'aucune porte vers l’invitation');
  assert(
    !code.includes('CrewInviteScreen'),
    'l’ancien écran-mode est toujours monté : deux affiches à tenir d’accord',
  );
  assert(
    !/mode === 'invite'/.test(code),
    'l’invitation est encore un mode de l’écran Crew',
  );
});

Deno.test('invitation : elle est atteignable en UN tap, par plusieurs affordances', () => {
  const code = codeSeul(lire(ACCUEIL));
  // Un membre lit soit l'en-tête, soit les raccourcis, soit la liste des
  // membres. Une seule de ces trois portes suffirait à « exister » mais pas à
  // être TROUVÉE : c'est exactement le reproche du 10/09 sur la création.
  const portes = code.split('onPress={openInvite}').length - 1;
  assert(portes >= 3, `l’invitation n’a plus que ${portes} porte(s) sur la page du crew`);
  // Et toutes poussent la MÊME route : deux chemins divergeraient au premier
  // changement d'adresse.
  assertEquals(
    code.split("router.push('/crew-invitation')").length - 1,
    1,
    'l’adresse de l’invitation est écrite plus d’une fois',
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ② L'AFFICHE DIT LE CREW, ET NE PROMET PAS CE QUE LA BASE NE SAIT PAS FAIRE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('invitation : le blason et le nom EXACT du crew sont sur l’affiche (G19)', () => {
  const code = codeSeul(lire(AFFICHE));
  assert(code.includes('CrewCrest'), 'l’affiche n’a pas de blason');
  assert(code.includes('crew.crew.name'), 'l’affiche ne nomme pas le crew');
  // Le nom n'est jamais tronqué : un nom coupé est un nom qu'on ne reconnaît pas.
  assert(!/numberOfLines/.test(code), 'le nom du crew peut être tronqué');
});

Deno.test('invitation : AUCUN bouton « révoquer », parce qu’aucune RPC ne révoque', () => {
  /*
   * `crews.code` (0002, rendu par `my_crew_code()` 0042) est PERMANENT :
   * aucune migration du dépôt ne le fait tourner. Le jeton révocable de 0090
   * existe en base, mais aucun écran ne le consomme (ni route `/i/[token]`, ni
   * appel à `redeem_crew_invite` dans tout apps/mobile). Peindre « Révoquer »
   * ici ne révoquerait rien : c'est la définition du bouton mort.
   */
  const code = codeSeul(lire(AFFICHE));
  assert(!/revoke_crew_invite|create_crew_invite/.test(code), 'jeton 0090 câblé à moitié');
  assert(!/Révoquer/.test(code), 'un bouton « Révoquer » qui ne révoque rien');
  // Et l'écran DIT ce qu'il ne peut pas faire, plutôt que de le taire.
  assert(
    /ne s’annule pas/.test(lire(AFFICHE)),
    'l’affiche ne dit pas que ce code est permanent avant qu’on le donne',
  );
});

Deno.test('invitation : cinq états distincts, et aucun ne se confond', () => {
  const code = codeSeul(lire(AFFICHE));
  // Sans backend, un « Réessayer » tournerait dans le vide.
  assert(code.includes('if (!configured)'), 'l’état hors ligne n’est pas séparé');
  /*
   * ÉTAPE 0 (11/09/2026, relevé en preview headless) : sans cette branche,
   * un visiteur arrivé par lien profond lisait « Aucun crew à faire rejoindre.
   * Crée le tien, ou rejoins-en un » — vrai sur le fond, faux sur la cause, et
   * les deux gestes proposés le renvoyaient sur la même porte de connexion un
   * écran plus loin.
   */
  assert(
    code.includes('if (!session && !sessionLoading)'),
    '« pas de compte » est confondu avec « pas de crew »',
  );
  assert(code.includes('if (!crew.crew)'), '« aucun crew » n’est pas séparé de l’échec');
  assert(code.includes('if (failed || !code)'), 'l’échec de lecture n’est pas séparé du vide');
  assert(/crew\.loading/.test(code), 'la lecture en cours n’est pas séparée');
  // La porte de compte est la MÊME que partout ailleurs : sept portes fondues
  // en une (lot 11), on n'en rouvre pas une huitième à la main.
  assert(code.includes('AccountDoor2026'), 'une porte de compte locale a été recréée');
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ LE SCANNER EST GARDÉ PAR LA CAPACITÉ RÉELLE DU BINAIRE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('scanner : l’onglet se dérive de `scanCapability2026`, jamais de Platform.OS seul', () => {
  const code = codeSeul(lire(QR));
  assert(code.includes('scanAvailable2026()'), 'l’onglet n’est pas dérivé du binaire');
  assert(
    code.includes("scan !== 'unsupported_platform'"),
    'l’onglet est peint sur le web, où rien ne peut scanner',
  );
});

Deno.test('scanner : le module natif est requis PARESSEUSEMENT, jamais importé en tête', () => {
  // Un `import { CameraView } from 'expo-camera'` ferait entrer le natif dans
  // le bundle web et casserait un build qui ne l'embarque pas : le panneau
  // doit pouvoir répondre « needs_build » au lieu de planter au chargement.
  const code = codeSeul(lire(PANNEAU));
  assert(!/from 'expo-camera'/.test(code), 'expo-camera est importé statiquement');
  assert(code.includes('loadCameraModule2026()'), 'le module n’est pas chargé paresseusement');
});

Deno.test('scanner : la permission part au GESTE, jamais au montage de l’écran', () => {
  const code = codeSeul(lire(PANNEAU));
  // `requestCameraPermissionsAsync` dans un `useEffect` ferait surgir la
  // feuille système à l'ouverture de l'onglet, avant que quiconque ait demandé
  // à scanner (Guideline 5.1.1 : on demande quand on s'en sert).
  const demande = code.indexOf('requestCameraPermissionsAsync()');
  assert(demande > 0, 'aucune demande de permission');
  const dansEffet = code.slice(0, demande).lastIndexOf('useEffect(');
  const dansCallback = code.slice(0, demande).lastIndexOf('useCallback(');
  assert(dansCallback > dansEffet, 'la permission est demandée au montage');
});

Deno.test('scanner : QR SEULEMENT, aucun autre code-barres', () => {
  const code = codeSeul(lire(PANNEAU));
  assert(
    code.includes("barcodeTypes: ['qr']"),
    'la caméra cherche autre chose que des QR',
  );
});

Deno.test('scanner : un code non GRYD ne verrouille pas le viseur et le DIT', () => {
  const code = codeSeul(lire(PANNEAU));
  assert(code.includes('C.scanUnknown'), 'un code inconnu ne dit rien');
  // `settled` ne doit être posé QUE sur une navigation : le poser sur un code
  // inconnu figerait le viseur sur le premier carton venu.
  const avant = code.indexOf('settled.current = true');
  const inconnu = code.indexOf('C.scanUnknown');
  assert(avant > 0 && avant < inconnu, 'le verrou est posé avant de savoir quoi faire');
  assert(
    code.slice(avant, inconnu).includes('router.push(target.path)'),
    'le verrou n’accompagne pas une navigation',
  );
});

Deno.test('scanner : haptique sur CHAQUE issue (L6)', () => {
  const code = codeSeul(lire(PANNEAU));
  assert(code.includes('haptics.success()'), 'aucune haptique sur un code reconnu');
  assert(code.includes('haptics.error()'), 'aucune haptique sur un code refusé');
});
