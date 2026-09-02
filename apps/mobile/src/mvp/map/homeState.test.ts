/**
 * GRYD — l'accueil ne peut pas affirmer ce qu'il ne sait pas (lot M3).
 *
 * Ces tests portent sur la faute la plus facile à commettre et la plus dure à
 * voir : rendre « pas de territoire » alors que la lecture est en cours, a
 * échoué, ou n'a jamais eu de serveur à joindre. À l'écran les trois cas se
 * ressemblent — une carte sans forme chartreuse — et c'est précisément pour ça
 * qu'aucune revue visuelle ne les distingue. Seul un test le peut.
 *
 * Le balayage EXHAUSTIF plus bas (144 combinaisons) n'est pas du zèle : chacune
 * de ces combinaisons arrivera chez un vrai joueur, et deux d'entre elles ne se
 * provoquent pas à la main (backend absent, permission définitivement bloquée).
 */
import {
  canCenterOnPlayer,
  canRetryRead,
  heroAreaM2,
  homeAction,
  homeStatus,
  openingFraming,
  framingKey,
  pendingNotice,
  territoryBounds,
  type BackendReach,
  type HomeInput,
  type LocationAccess,
  type SessionState,
  type TerritoryRead,
} from './homeState';
import type { TerritoryFeatureCollection } from './territoryGeo';

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
};

/**
 * `asserts condition` et non `void` : sans cette signature, TypeScript ne tire
 * RIEN de `assert(cadre !== null && cadre.kind === 'bounds')`, et chaque test de
 * cadrage devrait re-narrower à la main — ou pire, se contenter d'un `!`.
 */
function assert(condition: boolean, message = 'assertion échouée'): asserts condition {
  if (!condition) throw new Error(message);
}
function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

const OK_VIDE: TerritoryRead = { kind: 'ok', ownedCount: 0, areaM2: 0 };
const OK_PLEIN: TerritoryRead = { kind: 'ok', ownedCount: 3, areaM2: 128_400 };

/** Cas nominal : tout va bien, le joueur possède. On en dérive les variantes. */
function jeu(patch: Partial<HomeInput> = {}): HomeInput {
  return { backend: 'configured', session: 'signedIn', read: OK_PLEIN, location: 'granted', ...patch };
}

// ─── Les six réponses, et leur ORDRE ────────────────────────────────────────

Deno.test('lu et non vide → `owned` ; lu et vide → `empty`', () => {
  assertEquals(homeStatus(jeu()), 'owned');
  assertEquals(homeStatus(jeu({ read: OK_VIDE })), 'empty');
});

Deno.test('lecture EN COURS → `loading`, JAMAIS `empty`', () => {
  // Le mensonge le plus courant des apps de jeu : afficher le vide en attendant.
  assertEquals(homeStatus(jeu({ read: { kind: 'loading' } })), 'loading');
});

Deno.test('lecture PAS ENCORE LANCÉE → `loading` elle aussi', () => {
  // N'avoir pas encore demandé n'autorise pas plus à conclure qu'attendre.
  assertEquals(homeStatus(jeu({ read: { kind: 'idle' } })), 'loading');
});

Deno.test('lecture ÉCHOUÉE → `failed`, et surtout pas `empty`', () => {
  assertEquals(homeStatus(jeu({ read: { kind: 'failed' } })), 'failed');
});

Deno.test('pas de compte → `signedOut` : « à moi » n’a pas encore de référent', () => {
  assertEquals(homeStatus(jeu({ session: 'signedOut', read: OK_VIDE })), 'signedOut');
});

Deno.test('session EN COURS DE RESTAURATION → `loading`, jamais `signedOut`', () => {
  // Le démarrage à froid lit la session depuis le stockage. Conclure « pas de
  // compte » pendant ce temps affiche une fausseté à tous les joueurs, à chaque
  // ouverture — brève, donc jamais attrapée par une revue visuelle.
  assertEquals(homeStatus(jeu({ session: 'restoring' })), 'loading');
  assertEquals(homeStatus(jeu({ session: 'restoring', read: OK_VIDE })), 'loading');
  assertEquals(homeStatus(jeu({ session: 'restoring', read: { kind: 'failed' } })), 'loading');
});

Deno.test('backend injoignable → `unavailable`, quoi qu’en dise la lecture', () => {
  // Une lecture « réussie » sans backend ne peut venir que d'un cache ou d'un
  // repli : on ne la croit pas. L'ordre des tests le garantit structurellement.
  assertEquals(homeStatus(jeu({ backend: 'absent' })), 'unavailable');
  assertEquals(homeStatus(jeu({ backend: 'absent', read: OK_VIDE })), 'unavailable');
  assertEquals(homeStatus(jeu({ backend: 'absent', read: { kind: 'failed' } })), 'unavailable');
});

// ─── L'INVARIANT CENTRAL, balayé sur TOUT l'espace d'entrée ─────────────────

const BACKENDS: readonly BackendReach[] = ['configured', 'absent'];
const SESSIONS: readonly SessionState[] = ['signedIn', 'signedOut', 'restoring'];
const LIEUX: readonly LocationAccess[] = ['granted', 'unknown', 'blocked'];
const LECTURES: readonly TerritoryRead[] = [
  { kind: 'idle' },
  { kind: 'loading' },
  { kind: 'failed' },
  OK_VIDE,
];

function toutesLesEntrees(): HomeInput[] {
  const out: HomeInput[] = [];
  for (const backend of BACKENDS)
    for (const session of SESSIONS)
      for (const location of LIEUX)
        for (const read of LECTURES)
          for (const interrupted of [false, true])
            // La course EN ATTENTE D'ENVOI entre dans le balayage : sans elle,
            // l'invariant `empty` ne verrait jamais le cas où le serveur a
            // répondu « rien » pendant qu'une sortie dormait sur le disque.
            for (const pending of [false, true])
              out.push({ backend, session, location, read, interrupted, pending });
  return out;
}

Deno.test('INVARIANT : `empty` exige une lecture RÉUSSIE et vide — sans exception', () => {
  for (const e of toutesLesEntrees()) {
    if (homeStatus(e) !== 'empty') continue;
    assert(e.backend === 'configured', `${JSON.stringify(e)} : vide affirmé sans backend`);
    assert(e.session === 'signedIn', `${JSON.stringify(e)} : vide affirmé sans compte connu`);
    assert(e.read.kind === 'ok', `${JSON.stringify(e)} : vide affirmé sans lecture aboutie`);
    assert(
      e.pending !== true,
      `${JSON.stringify(e)} : vide affirmé alors qu'une course attend d'être envoyée`,
    );
  }
  // …et le cas légitime existe bel et bien, sinon l'invariant serait vide de sens.
  assertEquals(homeStatus(jeu({ read: OK_VIDE })), 'empty');
});

Deno.test('INVARIANT : un chiffre héros ne sort JAMAIS d’un état qui ne sait pas', () => {
  for (const e of toutesLesEntrees()) {
    const m2 = heroAreaM2(e);
    if (m2 === null) continue;
    assertEquals(homeStatus(e), 'owned', `${JSON.stringify(e)} : chiffre hors de l'état possédé`);
  }
  assertEquals(heroAreaM2(jeu()), 128_400);
});

Deno.test('« 0 m² » ne s’affiche pas : l’état vide PARLE, il ne compte pas', () => {
  // La constitution interdit le « 0 » nu. `null` force l'écran à sortir la
  // phrase de L8 (« Ta ville est vierge. Ferme ta première boucle. ») au lieu
  // d'un compteur qui se lit comme un échec.
  assertEquals(heroAreaM2(jeu({ read: OK_VIDE })), null);
  assertEquals(heroAreaM2(jeu({ read: { kind: 'loading' } })), null);
  assertEquals(heroAreaM2(jeu({ read: { kind: 'failed' } })), null);
  assertEquals(heroAreaM2(jeu({ backend: 'absent' })), null);
});

// ─── UNE COURSE ATTEND D'ÊTRE ENVOYÉE ──────────────────────────────────────
//
// ÉTAPE 0 — LE DÉFAUT EXISTAIT, et il était exactement du genre que ce module
// prétend interdire. Une course terminée hors réseau part en file
// (`lib/pendingUpload.ts`) ; l'écran de résultat le dit honnêtement (« Course
// enregistrée. Envoi dès que possible. »). De retour sur la carte, `homeStatus`
// n'avait AUCUNE valeur pour ce fait et `carte.tsx` ne lisait jamais la file :
// pour un joueur dont c'était la PREMIÈRE boucle, la lecture serveur rendait
// zéro territoire et l'accueil affirmait `empty` — « Ta ville est vierge.
// Ferme ta première boucle. » Il venait de la fermer.
//
// C'est le mensonge par omission du module lui-même : la lecture est honnête
// sur ce que le SERVEUR sait, et le serveur ne sait pas tout.

Deno.test('une course EN ATTENTE D’ENVOI interdit `empty` — le serveur ne sait pas tout', () => {
  assertEquals(homeStatus(jeu({ read: OK_VIDE, pending: true })), 'pending');
});

Deno.test('…mais elle n’EFFACE PAS ce qui est déjà acquis', () => {
  // Un état « en attente » n'annule pas un territoire tenu : le chiffre héros
  // reste, et c'est une NOTE qui porte le fait (`pendingNotice`). L'inverse
  // ferait disparaître les m² du joueur pour cause de réseau coupé.
  assertEquals(homeStatus(jeu({ pending: true })), 'owned');
  assertEquals(heroAreaM2(jeu({ pending: true })), 128_400);
});

Deno.test('l’attente ne passe JAMAIS devant une raison de ne pas savoir', () => {
  // L'ordre est le fond du sujet (voir l'en-tête de `homeStatus`). « En
  // attente » est une RÉSERVE sur une réponse ; tant qu'il n'y a pas de
  // réponse, la réserve n'a rien à qualifier.
  //   · backend absent  → `unavailable` : rien ne partira jamais de ce build ;
  //   · session         → on ne sait pas encore de QUI on parle ;
  //   · lecture en vol  → la réponse arrive, elle dira peut-être « owned » ;
  //   · lecture échouée → on ne sait pas ce qu'on tient, réserve ou pas.
  assertEquals(homeStatus(jeu({ read: OK_VIDE, pending: true, backend: 'absent' })), 'unavailable');
  assertEquals(homeStatus(jeu({ read: OK_VIDE, pending: true, session: 'restoring' })), 'loading');
  assertEquals(homeStatus(jeu({ read: OK_VIDE, pending: true, session: 'signedOut' })), 'signedOut');
  assertEquals(homeStatus(jeu({ read: { kind: 'loading' }, pending: true })), 'loading');
  assertEquals(homeStatus(jeu({ read: { kind: 'idle' }, pending: true })), 'loading');
  assertEquals(homeStatus(jeu({ read: { kind: 'failed' }, pending: true })), 'failed');
});

Deno.test('INVARIANT : `pending` ne sort QUE d’une lecture réussie et VIDE', () => {
  // Sinon il deviendrait un fourre-tout qui masquerait un échec ou une absence
  // de compte — c'est-à-dire la faute même que ce module empêche.
  for (const e of toutesLesEntrees()) {
    if (homeStatus(e) !== 'pending') continue;
    assertEquals(e.backend, 'configured', `${JSON.stringify(e)} : attente annoncée sans backend`);
    assertEquals(e.session, 'signedIn', `${JSON.stringify(e)} : attente annoncée sans compte connu`);
    assert(e.read.kind === 'ok', `${JSON.stringify(e)} : attente annoncée sans lecture aboutie`);
    assert(e.pending === true, `${JSON.stringify(e)} : attente annoncée sans course en file`);
  }
});

Deno.test('la NOTE d’attente ne double jamais la phrase, et ne promet rien d’intenable', () => {
  // Elle s'ajoute là où le bandeau parle d'autre chose et où l'envoi reste
  // réellement attendu…
  assert(pendingNotice(jeu({ pending: true })), 'territoire tenu : la course en file reste tue');
  assert(pendingNotice(jeu({ pending: true, read: { kind: 'loading' } })), 'lecture en vol : note absente');
  assert(pendingNotice(jeu({ pending: true, read: { kind: 'failed' } })), 'lecture échouée : note absente');
  // …jamais là où la phrase le dit DÉJÀ…
  assert(!pendingNotice(jeu({ pending: true, read: OK_VIDE })), 'note en doublon de la phrase');
  // …et jamais là où « elle partira » serait une promesse que rien ne tient :
  // sans serveur, ce build n'enverra jamais rien ; sans compte, la file ne
  // draine pas (`retryPendingUploadOnce` s'arrête sur `no_session`). Dans les
  // deux cas le bandeau nomme déjà le vrai blocage et porte son action.
  assert(!pendingNotice(jeu({ pending: true, backend: 'absent' })), 'promesse d’envoi sans serveur');
  assert(!pendingNotice(jeu({ pending: true, session: 'signedOut' })), 'promesse d’envoi sans compte');
  // Rien en file : rien à dire.
  assert(!pendingNotice(jeu()), 'note affichée sans course en attente');
});

Deno.test('AUCUNE action nouvelle : « renvoyer » n’est pas une capacité du joueur', () => {
  // Le drain part tout seul (au lancement, au retour au premier plan, à la fin
  // de la course suivante). Un bouton « Renvoyer » hors ligne ne ferait RIEN de
  // visible — bouton mort — et déloger GO pour ça casserait L2. L'attente se
  // DIT ; elle ne se tape pas.
  assertEquals(homeAction(jeu({ pending: true })), 'go');
  assertEquals(homeAction(jeu({ pending: true, read: OK_VIDE })), 'go');
});

// ─── L'action primaire : aucun bouton mort ──────────────────────────────────

Deno.test('position accordée → GO, MÊME pendant le chargement, MÊME après un échec', () => {
  // Courir ne dépend pas de savoir ce qu'on possède déjà. Faire attendre le
  // départ derrière un aller-retour réseau casserait L3 pour rien.
  assertEquals(homeAction(jeu()), 'go');
  assertEquals(homeAction(jeu({ read: { kind: 'loading' } })), 'go');
  assertEquals(homeAction(jeu({ read: { kind: 'failed' } })), 'go');
  assertEquals(homeAction(jeu({ read: OK_VIDE })), 'go');
});

Deno.test('permission pas encore accordée → on la demande, on n’envoie PAS aux réglages', () => {
  assertEquals(homeAction(jeu({ location: 'unknown' })), 'askLocation');
});

Deno.test('permission BLOQUÉE → les réglages, seule sortie réelle', () => {
  assertEquals(homeAction(jeu({ location: 'blocked' })), 'openSettings');
});

Deno.test('une course INTERROMPUE prime sur le départ d’une nouvelle', () => {
  // C'est la seule chose à l'écran qui puisse encore être perdue.
  assertEquals(homeAction(jeu({ interrupted: true })), 'resume');
});

Deno.test('…et elle prime AUSSI sur un backend injoignable', () => {
  // Constaté en preview : sans cet ordre, l'accueil ANNONÇAIT la course
  // retrouvée sans offrir aucun moyen de l'ouvrir. Dire qu'une chose existe
  // sans permettre d'y accéder est pire que se taire.
  assertEquals(homeAction(jeu({ interrupted: true, backend: 'absent' })), 'resume');
});

Deno.test('…et elle prime AUSSI sur la demande de permission', () => {
  // Rouvrir une course qui attend ne demande pas d'enregistrer de nouveaux
  // points : on peut la clore telle quelle. La cacher derrière « Autoriser »
  // la ferait disparaître pour quiconque a refusé — la garantie tomberait.
  assertEquals(homeAction(jeu({ interrupted: true, location: 'unknown' })), 'resume');
  assertEquals(homeAction(jeu({ interrupted: true, location: 'blocked' })), 'resume');
});

Deno.test('session EN RESTAURATION → AUCUNE action : on ne sait pas encore', () => {
  // Peindre GO ferait partir quelqu'un qui se révélera déconnecté ; peindre
  // « Se connecter » le dirait à quelqu'un déjà connecté. L'attente dure le
  // temps de lire un jeton, et le bandeau dit déjà « Lecture en cours ».
  assertEquals(homeAction(jeu({ session: 'restoring' })), 'none');
});

Deno.test('SANS COMPTE, l’action est SE CONNECTER — pas GO', () => {
  // Une course lancée sans compte s'enregistre, mais ne deviendra jamais un
  // territoire : personne à qui l'attribuer. GO y promet ce qui ne viendra pas.
  // Et c'est l'action qui remplit l'état vide « sans compte » (L8).
  assertEquals(homeAction(jeu({ session: 'signedOut' })), 'signIn');
  assertEquals(homeAction(jeu({ session: 'signedOut', location: 'unknown' })), 'signIn');
});

Deno.test('une course interrompue passe même DEVANT la connexion', () => {
  // Elle est déjà sur le disque : la clore ne demande pas de compte, et c'est
  // la seule chose qui puisse encore être perdue.
  assertEquals(homeAction(jeu({ session: 'signedOut', interrupted: true })), 'resume');
});

Deno.test('INVARIANT : GO n’est jamais peint sans position ET sans backend', () => {
  // Un GO sans position ne produit aucune trace ; un GO sans backend produit
  // une course que rien ne pourra jamais transformer en territoire. Les deux
  // « marchent » et ne tiennent pas la promesse : bouton mort.
  for (const e of toutesLesEntrees()) {
    if (homeAction(e) !== 'go') continue;
    assertEquals(e.location, 'granted', `${JSON.stringify(e)} : GO sans position`);
    assertEquals(e.backend, 'configured', `${JSON.stringify(e)} : GO sans backend`);
    assertEquals(e.interrupted, false, `${JSON.stringify(e)} : GO alors qu'une course attend`);
    assertEquals(e.session, 'signedIn', `${JSON.stringify(e)} : GO sans compte — le territoire ne viendra jamais`);
  }
});

Deno.test('INVARIANT : « Ouvrir les réglages » n’apparaît que si l’OS a fermé la porte', () => {
  for (const e of toutesLesEntrees()) {
    if (homeAction(e) !== 'openSettings') continue;
    assertEquals(e.location, 'blocked', `${JSON.stringify(e)} : réglages proposés pour rien`);
  }
});

Deno.test('backend absent → AUCUNE action primaire, plutôt qu’une action qui ment', () => {
  // L2 pose un plafond (« une seule »), pas un plancher. Un écran honnête sans
  // action possible vaut mieux qu'un bouton qui promet ce qu'il ne tiendra pas.
  for (const location of LIEUX) {
    assertEquals(homeAction(jeu({ backend: 'absent', location })), 'none');
  }
  // …sauf s'il y a une course à sauver — le seul cas qui passe devant.
  assertEquals(homeAction(jeu({ backend: 'absent', interrupted: true })), 'resume');
});

// ─── Réessayer reste secondaire ─────────────────────────────────────────────

Deno.test('« réessayer » n’existe QUE sur un échec de lecture, et ne déloge pas GO', () => {
  assert(canRetryRead(jeu({ read: { kind: 'failed' } })), 'échec sans possibilité de réessai');
  assertEquals(homeAction(jeu({ read: { kind: 'failed' } })), 'go');
  for (const e of toutesLesEntrees()) {
    if (canRetryRead(e)) assertEquals(homeStatus(e), 'failed', JSON.stringify(e));
  }
});

// ─── « Où suis-je ? » (L1) ──────────────────────────────────────────────────

Deno.test('sans autorisation, la carte ne prétend PAS savoir où l’on est', () => {
  // Un point au centre par défaut serait une position inventée.
  assert(canCenterOnPlayer(jeu()), 'position accordée mais recentrage refusé');
  assert(!canCenterOnPlayer(jeu({ location: 'unknown' })), 'position inventée sans autorisation');
  assert(!canCenterOnPlayer(jeu({ location: 'blocked' })), 'position inventée malgré un blocage');
});

// ─── OÙ LA CARTE REGARDE (L1, q.1 et q.2) ───────────────────────────────────
//
// ÉTAPE 0 — LE DÉFAUT EXISTAIT, et il touchait TOUT LE MONDE À CHAQUE
// OUVERTURE. `MapCanvas` posait sa caméra par `defaultSettings`, donc au
// MONTAGE ; `center` n'arrive qu'ensuite, depuis un effet de l'écran. La carte
// ouvrait donc toujours sur le repli de ville (Rouen, z12,5) et `ZOOM_EGO`
// n'était jamais appliqué — à cette échelle, la boucle qu'on vient de fermer
// tient dans un pixel. Aucun test ne pouvait le voir : il n'existait AUCUNE
// fonction de cadrage à interroger.

/** Un carré de `cote` degrés, coin sud-ouest en (lng, lat). */
function carre(lng: number, lat: number, cote: number): TerritoryFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 't1',
        properties: { areaM2: 1 },
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [lng, lat],
              [lng + cote, lat],
              [lng + cote, lat + cote],
              [lng, lat + cote],
              [lng, lat],
            ],
          ],
        },
      },
    ],
  };
}

const ROUEN = { lng: 1.0993, lat: 49.4431 };
const ZOOM_EGO = 15;

Deno.test('sans territoire NI position, la carte ne cadre RIEN — elle n’invente pas', () => {
  // `null` n'est pas un repli : c'est le refus de pointer une caméra quelque
  // part. L'ouverture de ville reste, et elle ne prétend pas qu'on y est.
  assertEquals(openingFraming({ territories: null, center: null, zoom: ZOOM_EGO }), null);
  const vide: TerritoryFeatureCollection = { type: 'FeatureCollection', features: [] };
  assertEquals(openingFraming({ territories: vide, center: null, zoom: ZOOM_EGO }), null);
});

Deno.test('position connue et rien de tenu → cadrage sur MOI, au zoom du quartier', () => {
  // C'est exactement ce que `defaultSettings` n'appliquait jamais.
  const cadre = openingFraming({ territories: null, center: ROUEN, zoom: ZOOM_EGO });
  assert(cadre !== null && cadre.kind === 'point', 'aucun cadrage sur la position');
  assertEquals(cadre.center.lng, ROUEN.lng);
  assertEquals(cadre.center.lat, ROUEN.lat);
  assertEquals(cadre.zoom, ZOOM_EGO);
});

Deno.test('un territoire tenu PASSE DEVANT la position : on ouvre pour VOIR ce qu’on a', () => {
  const cadre = openingFraming({ territories: carre(1.09, 49.44, 0.01), center: ROUEN, zoom: ZOOM_EGO });
  assert(cadre !== null && cadre.kind === 'bounds', 'la surface tenue n’est pas cadrée');
});

Deno.test('les bornes CONTIENNENT toute la surface — aucun sommet dehors', () => {
  // Une emprise qui coupe le territoire montrerait moins que ce qu'on possède :
  // la sous-déclaration silencieuse que `territoryGeo` refuse déjà.
  // ⚠️ Les coins se RECALCULENT comme le carré les a produits (1,09 + 0,01 ne
  // fait pas 1,1 en binaire) : comparer à un littéral arrondi ferait échouer un
  // cadrage pourtant juste — le test mentirait avant le code.
  const [lng, lat, cote] = [1.09, 49.44, 0.01];
  const bornes = territoryBounds(carre(lng, lat, cote));
  assert(bornes !== null, 'aucune emprise pour une surface pourtant lisible');
  assert(bornes.sw.lng <= lng && bornes.ne.lng >= lng + cote, 'emprise trop étroite en longitude');
  assert(bornes.sw.lat <= lat && bornes.ne.lat >= lat + cote, 'emprise trop étroite en latitude');
});

Deno.test('un territoire MINUSCULE est élargi, jamais collé au ras de l’écran', () => {
  // ~1 m de côté. Sans élargissement, `fitBounds` monterait à un zoom où l'on
  // voit la forme et plus rien autour — on ne saurait plus OÙ elle est.
  const minus = carre(1.09, 49.44, 0.00001);
  const cadre = openingFraming({ territories: minus, center: null, zoom: ZOOM_EGO });
  assert(cadre !== null && cadre.kind === 'bounds', 'pas de cadrage sur une petite surface');
  const spanLatM = (cadre.ne.lat - cadre.sw.lat) * 111_320;
  // 800 m de périmètre minimum (RUN_MIN_DISTANCE_M) ⇒ ~255 m de diamètre.
  assert(spanLatM > 200, `emprise de ${Math.round(spanLatM)} m — le nez collé sur la forme`);
  // …et la forme reste ENTIÈREMENT dedans.
  assert(cadre.sw.lat <= 49.44 && cadre.ne.lat >= 49.44001, 'l’élargissement a perdu la forme');
});

Deno.test('une surface DÉGÉNÉRÉE ne rend jamais une emprise de span nul', () => {
  // Un anneau réduit à un point ferait diverger `fitBounds` sur les deux forks.
  const point = carre(1.09, 49.44, 0);
  const cadre = openingFraming({ territories: point, center: null, zoom: ZOOM_EGO });
  assert(cadre !== null && cadre.kind === 'bounds', 'pas de cadrage sur une surface dégénérée');
  assert(cadre.ne.lat > cadre.sw.lat, 'emprise plate en latitude');
  assert(cadre.ne.lng > cadre.sw.lng, 'emprise plate en longitude');
});

Deno.test('une surface à cheval sur l’antiméridien : on se TAIT, on ne montre pas la planète', () => {
  const cheval: TerritoryFeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 't1',
        properties: { areaM2: 1 },
        geometry: {
          type: 'Polygon',
          coordinates: [[[-179.9, 10], [179.9, 10], [179.9, 10.1], [-179.9, 10.1], [-179.9, 10]]],
        },
      },
    ],
  };
  assertEquals(territoryBounds(cheval), null);
  // …et l'écran retombe alors sur la position, pas sur un cadrage absurde.
  const cadre = openingFraming({ territories: cheval, center: ROUEN, zoom: ZOOM_EGO });
  assert(cadre !== null && cadre.kind === 'point', 'la planète cadrée pour un pâté de maisons');
});

Deno.test('LA CLÉ COMPARE DES VALEURS, PAS DES IDENTITÉS — c’est ce qui évite le combat caméra/doigts', () => {
  // Le nœud du bug historique. `territories` est un objet NEUF à chaque lecture ;
  // un effet qui dépendrait de son identité repartirait à chaque re-rendu et
  // ré-appliquerait un `easeTo` en plein pincement — « le zoom revient en
  // arrière ». Deux collections DISTINCTES de même géométrie doivent rendre la
  // MÊME clé, sinon la garde « une seule fois » ne tient pas.
  const a = openingFraming({ territories: carre(1.09, 49.44, 0.01), center: null, zoom: ZOOM_EGO });
  const b = openingFraming({ territories: carre(1.09, 49.44, 0.01), center: null, zoom: ZOOM_EGO });
  assert(a !== b, 'le test ne prouverait rien si les deux objets étaient le même');
  assertEquals(framingKey(a), framingKey(b));
  // Une géométrie AUTRE rend une clé autre — sinon la clé ne dirait plus rien.
  const c = openingFraming({ territories: carre(2.35, 48.85, 0.01), center: null, zoom: ZOOM_EGO });
  assert(framingKey(a) !== framingKey(c), 'deux territoires éloignés partagent une clé');
  // Et un même point rendu deux fois reste une seule et même clé.
  assertEquals(
    framingKey(openingFraming({ territories: null, center: { ...ROUEN }, zoom: ZOOM_EGO })),
    framingKey(openingFraming({ territories: null, center: { ...ROUEN }, zoom: ZOOM_EGO })),
  );
  assertEquals(framingKey(null), null);
});

// ─── COUTURE CAMÉRA : les deux forks appliquent VRAIMENT cette décision ─────
//
// ÉTAPE 0 : avant ce lot, ni `MapCanvas.tsx` ni `MapCanvas.web.tsx` ne
// contenaient le moindre appel impératif — leur seule caméra était
// `defaultSettings` / le `center` passé au constructeur, tous deux lus AU
// MONTAGE. Ce test échouait donc sur les deux fichiers, avec le message
// « n’applique aucun cadrage ». Un module pur qui décide sans que personne
// n'applique est un module qui ne corrige rien.

/** Le code hors commentaires — sinon citer un défaut dans un commentaire le recrée. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

Deno.test('couture caméra — les DEUX forks appliquent le cadrage, une seule fois', () => {
  for (const fichier of ['MapCanvas.tsx', 'MapCanvas.web.tsx']) {
    const code = codeSeul(Deno.readTextFileSync(new URL(`./${fichier}`, import.meta.url)));
    assert(
      code.includes('openingFraming'),
      `${fichier} : n’applique aucun cadrage — la caméra ne regarde jamais le joueur`,
    );
    assert(
      code.includes('framingKey'),
      `${fichier} : déclenche sur autre chose qu’une clé de VALEUR — ` +
        `l’identité de \`territories\` ferait rejouer la caméra à chaque rendu`,
    );
    assert(
      /cadreFait/.test(code),
      `${fichier} : aucune garde « une seule fois » — sans elle, chaque re-rendu ` +
        `ré-applique la caméra et se bat contre les doigts du joueur`,
    );
    assert(
      code.includes('fitBounds'),
      `${fichier} : ne sait pas cadrer sur une EMPRISE — le territoire tenu ne serait jamais montré`,
    );
  }
});

Deno.test('couture caméra — la caméra native n’est JAMAIS repassée en CONTRÔLÉE', () => {
  // Le bug payé cher : `<Camera centerCoordinate={…} zoomLevel={…} />` est
  // recréé à chaque rendu du parent et ré-applique un `easeTo` pendant un
  // pincement. `defaultSettings` (au montage) + impératif (une fois) : rien
  // d'autre n'a le droit d'exister sur cet élément.
  const code = codeSeul(
    Deno.readTextFileSync(new URL('./MapCanvas.tsx', import.meta.url)),
  );
  const debut = code.indexOf('<Camera');
  assert(debut >= 0, 'couture : `<Camera` introuvable — le fork natif a changé de forme');
  const element = code.slice(debut, code.indexOf('/>', debut));
  for (const prop of ['centerCoordinate', 'zoomLevel', 'bounds', 'followUserLocation']) {
    assert(
      !new RegExp(`\\b${prop}\\s*=`).test(element),
      `MapCanvas.tsx : \`${prop}\` posé en PROP sur <Camera> — caméra contrôlée, ` +
        `elle se battra contre les gestes du joueur à chaque re-rendu`,
    );
  }
  assert(
    element.includes('defaultSettings'),
    'MapCanvas.tsx : <Camera> a perdu son `defaultSettings` — plus rien ne cadre le montage',
  );
});
