/**
 * GRYD — LA COUTURE DU MONDE CREW : créer, modifier, les rôles.
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * `memberRoles.test.ts` prouve que les RÈGLES sont justes. Il n'a jamais pu
 * prouver qu'un écran les APPELLE — et c'est exactement là qu'a vécu le défaut
 * du 10/09/2026, relevé par le fondateur après un test sur son iPhone :
 *
 *   « Sur la page Crew on me propose seulement de rejoindre un crew, jamais de
 *     créer un crew. »
 *
 * `createCrew` marchait pourtant, `create_crew` (0042 → 0097) est en
 * production, et `crewCreateDecision` était testé. Rien dans les 2 700 tests du
 * dépôt ne regardait ce que l'écran PROPOSE. Même angle mort que celui décrit
 * par `src/mvp/couture.test.ts` : « les écrans reprennent d'une main ce que les
 * modules purs ont interdit de l'autre ». Ici, l'écran CACHAIT d'une main ce
 * que le serveur offrait de l'autre.
 *
 * ─── CE QUE CES TESTS PEUVENT, ET CE QU'ILS NE PEUVENT PAS ──────────────────
 * Ils lisent le SOURCE et y cherchent des formes. Un filet grossier : il
 * n'attrape pas une hiérarchie visuelle, et il ne remplace ni la relecture ni
 * le gate `ux-gate`. Mais chacune des règles ci-dessous cite le code EXACT
 * qu'elle aurait fait échouer — sans cette colonne, rien ne distinguerait ce
 * fichier d'un test qui passe parce qu'il ne demande rien.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
};

/** Le code HORS commentaires — sinon citer un défaut dans un docblock le recrée. */
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
  assert(source.length > 500, `${chemin} : source trop courte, le chemin est faux`);
  return source;
}

const ACCUEIL = '../refonte/CrewHomeScreen.tsx';
const CREATION = '../../../app/crew-create.tsx';

/** Les lignes de code (hors commentaires) qui contiennent `motif`. */
function lignes(source: string, motif: string): string[] {
  return codeSeul(source)
    .split('\n')
    .filter((l) => l.includes(motif));
}

// ═══════════════════════════════════════════════════════════════════════════
// ① CRÉER ET REJOINDRE SONT PROPOSÉS ENSEMBLE, AU MÊME RANG
//
// ÉTAPE 0 — LE DÉFAUT EXISTAIT, et le voici mot pour mot (CrewHomeScreen.tsx,
// commit 9d1b9e7, état « connecté, sans crew ») :
//
//   <Text style={local.heroTitle}>{copy('Rejoindre un crew', 'Join a crew')}</Text>
//   …
//   {session && crew.ready ? <Pressable … onPress={() => goMode('create-name')}
//        style={local.heroAction}><Text style={local.heroActionText}>
//        {copy('Créer mon crew', 'Create my crew')}</Text>…
//   {session && crew.ready ? <View style={local.bento}>
//     <CrewTile … title={copy('Avec un code', …)} … prominent />
//     <CrewTile … title={copy('À proximité', …)} … />
//
// Le titre de l'état vide nommait UNE des deux portes ; la création était une
// ligne de texte (`heroAction`, pas de surface) sur la photo du hero ; et les
// deux seules CARTES de l'écran menaient l'une et l'autre à une adhésion.
// Trois affordances d'adhésion, zéro surface de création.
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('crew : l’état sans crew propose CRÉER et REJOINDRE, tous deux', () => {
  const code = codeSeul(lire(ACCUEIL));
  assert(code.includes("copy('Créer mon crew'"), 'l’onglet Crew ne propose plus de créer un crew');
  assert(
    code.includes("copy('Rejoindre un crew'"),
    'l’onglet Crew ne propose plus de rejoindre un crew',
  );
});

Deno.test('crew : les deux actions vivent dans le MÊME conteneur, au même rang', () => {
  const source = lire(ACCUEIL);
  const creer = lignes(source, "copy('Créer mon crew'");
  const rejoindre = lignes(source, "copy('Rejoindre un crew', 'Join a crew')").filter((l) =>
    l.includes('heroSecondary'),
  );
  assertEquals(creer.length, 1, 'la création doit être proposée une fois, et une seule');
  assertEquals(rejoindre.length, 1, 'l’adhésion doit être proposée une fois dans le hero');
  // MÊME GABARIT : `heroPrimary` et `heroSecondary` partagent hauteur, rayon et
  // padding (voir la feuille de styles) — seul l'accent les distingue. Un
  // retour à `heroAction` (une ligne de texte sans surface) échoue ici.
  assert(creer[0]!.includes('local.heroPrimary'), 'la création n’est pas rendue comme une action');
  assert(
    rejoindre[0]!.includes('local.heroSecondary'),
    'l’adhésion n’est pas rendue comme une action',
  );
  const code = codeSeul(source);
  assert(
    code.includes('local.heroActions'),
    'les deux actions ne sont plus regroupées : le rang commun n’est plus garanti',
  );
  assert(
    !code.includes('local.heroActionText'),
    'la création est redevenue une ligne de texte posée sur la photo (heroAction)',
  );
});

Deno.test('crew : le titre de l’état vide ne nomme plus UNE SEULE des deux portes', () => {
  const source = lire(ACCUEIL);
  const titres = lignes(source, 'local.heroTitle');
  assert(titres.length > 0, 'le hero de l’onglet Crew n’a plus de titre');
  for (const ligne of titres) {
    assert(
      !ligne.includes("copy('Rejoindre un crew'"),
      'le titre de l’état vide annonce « Rejoindre un crew » : la moitié de ' +
        'l’offre redevient invisible avant même le premier bouton',
    );
  }
});

Deno.test('crew : « Créer mon crew » ouvre la page de création', () => {
  const [ligne] = lignes(lire(ACCUEIL), "copy('Créer mon crew'");
  assert(ligne !== undefined);
  assert(
    ligne.includes("router.push('/crew-create')"),
    'la création ne mène pas à /crew-create',
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ② LA PORTE DE COMPTE DIT CE QU'ELLE FAIT
//
// ÉTAPE 0 — la seule porte offerte à un visiteur sans compte était :
//   <Text style={local.heroActionText}>{copy('Me connecter', 'Sign in')}</Text>
// Quelqu'un qui n'a PAS encore de compte n'y lisait rien pour lui.
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('crew : le visiteur sans compte se voit proposer d’en créer un', () => {
  const source = lire(ACCUEIL);
  const [ligne] = lignes(source, "router.push('/sign-in')");
  assert(ligne !== undefined, 'la porte vers /sign-in a disparu de l’onglet Crew');
  assert(
    ligne.includes("copy('Créer mon compte'"),
    'la porte de compte ne propose que de se connecter',
  );
  assert(
    codeSeul(source).includes("copy('ou me connecter'"),
    'le sous-titre « ou me connecter » a disparu : la connexion redevient introuvable',
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ `/crew-edit` NE SE PEINT QUE POUR QUI PEUT ÉCRIRE
//
// ÉTAPE 0 — LE DÉFAUT EXISTAIT, deux fois (CrewHomeScreen.tsx, 9d1b9e7) :
//   right={crew.crew ? <Pressable … onPress={() => router.push('/crew-edit')} …
//   <ProfileLink … title={copy('Administrer le crew', …)} …
//        onPress={() => router.push('/crew-edit')} />
// Aucune condition de rôle. Or `crew_edit` / `crew_edit_context` (0084) gatent
// leurs trois champs sur des permissions qui valent `['founder']` : six rôles
// sur sept arrivaient sur « tu n'as pas le droit ».
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('crew : toute porte vers /crew-edit est conditionnée au rôle', () => {
  const source = lire(ACCUEIL);
  const portes = lignes(source, "'/crew-edit'");
  assert(portes.length > 0, 'la porte vers /crew-edit a disparu de l’onglet Crew');
  for (const ligne of portes) {
    assert(
      ligne.includes('canEditCrew'),
      'une porte vers /crew-edit est peinte sans condition de rôle : ' +
        '0084 la refermerait pour six rôles sur sept',
    );
  }
  // Le verdict vient de la matrice, pas d'un rôle recopié dans l'écran.
  const code = codeSeul(source);
  assert(code.includes('canOpenCrewEdit('), 'le verdict d’édition n’est plus lu dans la matrice');
  assert(
    !/canEditCrew\s*=\s*myRole\s*===/.test(code),
    'le droit d’édition est redevenu un rôle écrit en dur dans l’écran',
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ LA PAGE DE CRÉATION ÉCRIT CE QUE LE SERVEUR ACCEPTE, ET RIEN D'AUTRE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('crew-create : la page appelle bien create_crew, via le hook', () => {
  const code = codeSeul(lire(CREATION));
  assert(code.includes('crew.createCrew('), '/crew-create n’écrit rien côté serveur');
});

Deno.test('crew-create : l’accès proposé vient de game-rules, jamais d’une liste locale', () => {
  const code = codeSeul(lire(CREATION));
  assert(
    code.includes('CREW_RECRUITMENT_AT_CREATION.map('),
    'les options d’accès ne sont plus dérivées de CREW_RECRUITMENT_AT_CREATION : ' +
      'une liste recopiée finirait par proposer une valeur que 0097 refuse',
  );
  // `closed` n'est PAS proposable à la création (0097 le refuse explicitement).
  assert(
    !/setAccess\('closed'\)|access === 'closed'/.test(code),
    '/crew-create propose « fermé », que le serveur refuse à la naissance',
  );
});

Deno.test('crew-create : la borne du nom vient de la DDL, pas d’un nombre écrit ici', () => {
  const code = codeSeul(lire(CREATION));
  assert(code.includes('NAME_MAX'), 'la longueur du nom n’est plus bornée par NAME_MAX');
  assert(
    !/maxLength=\{\s*\d+\s*\}/.test(code),
    'un nombre magique borne le nom du crew : il dérivera de la contrainte 0002',
  );
});

Deno.test('crew-create : l’emblème est CHOISI, plus tiré au hasard', () => {
  const creation = codeSeul(lire(CREATION));
  const accueil = codeSeul(lire(ACCUEIL));
  // ÉTAPE 0 : `crew.createCrew(name, randomCrewColor(), cityId, access)` —
  // `crews.color` était tiré au sort et jamais relu nulle part.
  assert(
    !creation.includes('randomCrewColor') && !accueil.includes('randomCrewColor'),
    'la couleur du crew est de nouveau tirée au hasard : le fondateur ne choisit rien',
  );
  assert(creation.includes('CREW_EMBLEMS.map('), 'la grille d’emblèmes a disparu');
  assert(
    creation.includes('crewEmblemSeed('),
    'l’aperçu ne dérive plus du choix : il montrerait autre chose que ce qui sera écrit',
  );
  // Et le choix est RELU quelque part, sinon le contrôle est mort (§A4).
  assert(
    accueil.includes('crewEmblemSeed(crew.crew.color)'),
    'l’emblème choisi n’est rendu nulle part : le sélecteur redevient un bouton mort',
  );
});

Deno.test('crew-create : aucune couleur écrite en dur (ADR-008)', () => {
  const code = codeSeul(lire(CREATION));
  const durs = code.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  assertEquals(durs, [], `couleurs en dur dans /crew-create : ${durs.join(', ')}`);
});

Deno.test('crew-create : les quatre états non nominaux sont distincts', () => {
  const code = codeSeul(lire(CREATION));
  for (const [garde, quoi] of [
    ['!session && !sessionLoading', 'pas connecté'],
    ['sessionLoading || crew.loading', 'lecture en cours'],
    ['crew.loadFailed', 'échec de lecture'],
    ['if (crew.crew)', 'déjà dans un crew'],
  ] as const) {
    assert(code.includes(garde), `/crew-create ne distingue plus l’état « ${quoi} »`);
  }
  // « Je n'ai pas pu lire » ne doit pas proposer de fonder : le serveur
  // répondrait `already_in_crew` à quelqu'un qui a déjà un crew.
  const echec = code.indexOf('crew.loadFailed');
  const formulaire = code.indexOf('CREW_EMBLEMS.map(');
  assert(
    echec !== -1 && formulaire !== -1 && echec < formulaire,
    'le formulaire de création se peint avant que l’échec de lecture soit tranché',
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ LES RÔLES SE VOIENT SUR LA LISTE DES MEMBRES
//
// ÉTAPE 0 — la ligne de membre rendait le rang dans la MÊME micro-ligne grise
// que « Voir le profil », et seulement s'il avait été lu :
//   <Text style={local.micro}>{hidden ? … : roleLabel ?? copy('Voir le profil', …)}</Text>
// Un capitaine et un rookie se ressemblaient donc trait pour trait, et un
// agrégat `crew_overview` en échec faisait disparaître TOUS les rangs sans que
// rien ne le dise.
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('crew : chaque membre porte un badge de rôle, et son devoir est dit', () => {
  const code = codeSeul(lire(ACCUEIL));
  assert(code.includes('local.roleBadge'), 'le badge de rôle a disparu de la ligne de membre');
  assert(code.includes('CREW_ROLE_E[memberRole]'), 'le rang n’est plus lu dans le catalogue');
  assert(code.includes('dutyOf(memberRole)'), 'le devoir du cahier §13.3 n’est plus dérivé');
  assert(
    code.includes('CREW_DUTY_HELP_E[duty]'),
    'le rôle n’est plus expliqué : « Stratège » reste un mot sans conséquence',
  );
});

Deno.test('crew : un rôle NON LU se dit, il ne se devine pas', () => {
  const code = codeSeul(lire(ACCUEIL));
  assert(
    code.includes('crew.overviewFailed'),
    'l’échec de lecture des rôles n’est plus distingué : une liste sans badge ' +
      'se lirait « ce crew n’a que des membres »',
  );
  // Le repli interdit : donner un rôle par défaut à qui n'en a pas été lu.
  assert(
    !/dutyOf\([^)]*\)\s*\?\?\s*'member'/.test(code),
    'un rôle non lu retombe sur « membre » : c’est une affirmation inventée',
  );
});
