/**
 * GRYD — LA COUTURE DU PARRAINAGE : ce que les ÉCRANS proposent vraiment.
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * `referral2026.test.ts` prouve que les RÈGLES sont justes, et
 * `supabase/tests/referral_2026.pglite.test.mjs` que le serveur les applique.
 * Aucun des deux ne peut prouver qu'un écran les APPELLE — et c'est exactement
 * là qu'a vécu le défaut jusqu'au 11/09/2026 : la table `public.referrals`
 * existait depuis `0002_schema.sql`, sa policy d'insertion aussi, et le bloc
 * social du Profil portait ce commentaire, mot pour mot :
 *
 *   « ⚠️ PAS DE "ENTRER UN CODE DE PARRAINAGE". La table `public.referrals`
 *     existe dans le schéma (0002) mais RIEN ne l'écrit […] Peindre le champ
 *     serait un bouton mort. »
 *
 * Il avait raison. Le serveur existe maintenant : ces règles vérifient que
 * l'app s'en sert, et qu'elle n'a rien repris d'une main de ce que la
 * dérogation donne de l'autre.
 *
 * ─── CE QU'ELLES PEUVENT, ET CE QU'ELLES NE PEUVENT PAS ─────────────────────
 * Elles lisent le SOURCE et y cherchent des formes. Un filet grossier : il
 * n'attrape ni une hiérarchie visuelle ni une troncature, et il ne remplace ni
 * la relecture ni `ux-gate`. Chaque règle cite en revanche le code EXACT
 * qu'elle aurait fait échouer.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  REFERRAL_CODE_ALPHABET, REFERRAL_MAX_ACTIVE_PER_SEASON,
  REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS, REFERRAL_XP_BOOST_2026,
} from '@klaim/shared';

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

/**
 * Le bloc d'UNE entrée du catalogue. `indexOf('},')` ne suffit pas : une valeur
 * peut contenir « {code}, » — c'est le cas de `partageMessage`, et la première
 * version de ce test coupait donc le bloc au milieu de la phrase et déclarait
 * le lien absent. On coupe sur la FERMETURE indentée, la seule qui soit une
 * fin de bloc.
 */
function bloc(catalogue: string, entree: string): string {
  const debut = catalogue.indexOf(`${entree}: {`);
  assert(debut >= 0, `${entree} est absente du catalogue`);
  const fin = catalogue.indexOf('\n  },', debut);
  assert(fin > debut, `${entree} : bloc non fermé`);
  return catalogue.slice(debut, fin);
}

function lire(chemin: string, minimum = 500): string {
  const source = Deno.readTextFileSync(new URL(chemin, import.meta.url));
  // Un chemin faux rendrait toutes les règles vertes sans rien vérifier : c'est
  // le mode d'échec le plus banal de ce genre de test.
  assert(source.length > minimum, `${chemin} : source trop courte, le chemin est faux`);
  return source;
}

const ECRAN = './ReferralScreen2026.tsx';
const ATTERRISSAGE = './ReferralLanding2026.tsx';
const DONNEES = './useMyReferral2026.ts';
const PROFIL = '../refonte/ProfileHomeScreen.tsx';
const ROUTE = '../../../app/parrainage.tsx';
const ROUTE_LIEN = '../../../app/r/[code].tsx';
const LAYOUT = '../../../app/_layout.tsx';
const CATALOGUE = '../../i18n/catalog/referral.ts';

// ═══════════════════════════════════════════════════════════════════════════
// ① LES DEUX ROUTES EXISTENT ET SERVENT LES BONS ÉCRANS
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('couture : /parrainage sert ReferralScreen2026, /r/[code] sert l’atterrissage', () => {
  assert(lire(ROUTE, 40).includes('ReferralScreen2026'), '/parrainage doit servir l’écran');
  assert(lire(ROUTE_LIEN, 40).includes('ReferralLanding2026'), '/r/[code] doit servir l’atterrissage');
});

Deno.test('couture : le Profil ouvre /parrainage, et l’atterrissage y ramène', () => {
  // ÉTAPE 0 : avant ce lot, `grep -rn "'/parrainage'" apps/mobile` ne rendait
  // RIEN — la route n'existait pas, et aucune surface ne la nommait.
  const profil = codeSeul(lire(PROFIL));
  assert(profil.includes("router.push('/parrainage')"), 'le bloc social doit ouvrir /parrainage');
  const atterrissage = codeSeul(lire(ATTERRISSAGE));
  assert(atterrissage.includes("'/parrainage'"), 'l’atterrissage ramène toujours sur /parrainage');
});

Deno.test('couture : la reprise après inscription vit dans le layout RACINE', () => {
  // Une reprise posée dans l'écran d'atterrissage ne s'exécuterait JAMAIS : la
  // redirection post-inscription le démonte à l'instant où la session arrive.
  // C'est la faute déjà payée une fois sur l'invitation crew (pendingInvite).
  const layout = codeSeul(lire(LAYOUT));
  assert(layout.includes('startPendingReferralWatcher()'), 'le watcher est branché au layout racine');
  assert(!codeSeul(lire(ECRAN)).includes('startPendingReferralWatcher'),
    'l’écran ne doit PAS porter le watcher');
});

// ═══════════════════════════════════════════════════════════════════════════
// ② LE CLIENT NE S'OCTROIE RIEN
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('couture : les écrans n’appellent QUE les deux RPC ouvertes au client', () => {
  const AUTORISEES = ['my_referral_2026', 'redeem_referral_code_2026'];
  for (const chemin of [ECRAN, ATTERRISSAGE, DONNEES, './pendingReferral.ts']) {
    const source = codeSeul(lire(chemin, 200));
    for (const appel of source.matchAll(/\.rpc\(\s*'([a-z0-9_]+)'/g)) {
      assert(AUTORISEES.includes(appel[1]), `${chemin} appelle la RPC ${appel[1]}`);
    }
    // Et surtout AUCUNE écriture directe sur une table de jeu : tout claim est
    // décidé serveur (constitution), et les tables de parrainage sont fermées
    // à `authenticated` (0184-0186, `revoke all`).
    for (const table of ['referral_grants_2026', 'referral_links_2026', 'referral_codes_2026',
      'referral_xp_bonus_2026', 'referral_gryd_plus_credits_2026']) {
      assertEquals(source.includes(`.from('${table}')`), false, `${chemin} écrit dans ${table}`);
    }
  }
});

Deno.test('couture : le refus serveur est TYPÉ à l’écran, jamais un « réessaie » nu', () => {
  const source = codeSeul(lire(ECRAN));
  for (const refus of ['bad_code', 'unknown_code', 'self_referral', 'already_referred',
    'reciprocity', 'account_too_old']) {
    assert(source.includes(`'${refus}'`), `le refus ${refus} doit avoir SA phrase`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ AUCUN NOMBRE MAGIQUE : LES CHIFFRES VIENNENT DE game-rules
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('couture : l’écran lit les constantes partagées, il ne les recopie pas', () => {
  const source = codeSeul(lire(ECRAN));
  for (const constante of ['REFERRAL_CODE_LENGTH', 'REFERRAL_COMPLETION_WINDOW_DAYS',
    'REFERRAL_MAX_ACTIVE_PER_SEASON', 'REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS']) {
    assert(source.includes(constante), `${constante} doit venir de @klaim/shared`);
  }
  // Les valeurs elles-mêmes n'apparaissent nulle part en dur.
  assertEquals(/\b(?:30|7|5)\s*(?:jours|days)\b/.test(source), false, 'aucun chiffre en dur');
});

Deno.test('couture : le catalogue interpole les chiffres, il ne les écrit pas', () => {
  const catalogue = lire(CATALOGUE);
  for (const [entree, marqueur] of [['regle1', '{jours}'], ['saisieAide', '{n}'],
    ['etatExpire', '{jours}'], ['objetBoost', '{x}'], ['objetGrydPlus', '{n}']] as const) {
    assert(bloc(catalogue, entree).includes(marqueur), `${entree} doit interpoler ${marqueur}`);
  }
  // Les valeurs réelles ne sont donc jamais gelées dans une traduction.
  assertEquals(catalogue.includes(`${REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS} premiers jours`), false);
  assertEquals(catalogue.includes(`${REFERRAL_MAX_ACTIVE_PER_SEASON} parrainages récompensés de la saison`), false);
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ CE QUE L'ÉCRAN NE DIT JAMAIS
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('couture : aucun texte ne promet un point, un classement ni un lot', () => {
  // La dérogation du fondateur donne des OBJETS, un boost d'XP de progression
  // et des jours de GRYD+. Elle ne touche NI les classements (0160-0164), NI
  // les points de territoire, NI les défis. Un texte qui le laisserait croire
  // serait faux — et le cahier §15.2 n'a plié que sur ce point précis.
  //
  // « ne changent aucun classement » est la SEULE occurrence tolérée : elle NIE,
  // elle ne promet pas. On la retire AVANT de chercher, dans les cinq langues.
  // HORS COMMENTAIRES : ce fichier NOMME les interdits dans son propre
  // docblock (« AUCUN POINT, AUCUN CLASSEMENT »). Les lire comme du texte de
  // jeu ferait échouer la règle sur la phrase qui l'énonce.
  const catalogue = codeSeul(lire(CATALOGUE)).toLowerCase()
    .replace(/ne changent aucun classement/g, '')
    .replace(/change no ranking/g, '')
    .replace(/no cambian ninguna clasificación/g, '')
    .replace(/sie ändern keine rangliste/g, '')
    .replace(/não mudam nenhuma classificação/g, '');
  for (const mot of ['classement', 'ranking', 'point de territoire',
    'tirage au sort', 'chance de gagner', 'leaderboard']) {
    assertEquals(catalogue.includes(mot), false, `le catalogue promet « ${mot} »`);
  }
});

Deno.test('couture : le boost annonce sa PORTÉE partout où il est nommé', () => {
  const source = codeSeul(lire(ECRAN));
  assert(source.includes('C.boostPortee'), 'la ligne du boost doit dire ce qu’il ne touche pas');
  const catalogue = lire(CATALOGUE);
  const portee = bloc(catalogue, 'boostPortee');
  for (const mot of ['territoire', 'performance', 'défi']) {
    assert(portee.includes(mot), `la portée doit nommer « ${mot} »`);
  }
  assertEquals(REFERRAL_XP_BOOST_2026.multiplier, 1.5, 'le multiplicateur reste celui de game-rules');
});

Deno.test('couture : aucun compteur factice — un crédit absent ne se peint pas', () => {
  const source = codeSeul(lire(ECRAN));
  // La ligne GRYD+ ne s'imprime que si le serveur a rendu un crédit ; sinon
  // `rewards` ne porte aucune entrée `gryd_plus` et rien n'est peint.
  assert(source.includes('data.rewards.length === 0'), 'le vide se dit avec une phrase');
  assert(source.includes('C.recompensesVide'), 'et cette phrase existe');
  assert(source.includes('C.filleulsVide'), 'la liste vide de filleuls aussi');
  assertEquals(/>\s*0\s*</.test(source), false, 'aucun « 0 » nu dans le JSX');
});

Deno.test('couture : les quatre états sont distincts, et la porte de compte est celle du dépôt', () => {
  const source = codeSeul(lire(ECRAN));
  for (const etat of ["'signed-out'", "'unavailable'", "'loading'", "'ready'"]) {
    assert(source.includes(etat), `l’état ${etat} doit être nommé`);
  }
  assert(source.includes('<AccountDoor2026'), 'la porte de compte unique, jamais une locale');
  assert(source.includes('C.actionReessayer'), 'l’échec propose une reprise');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ LE MESSAGE QUI SORT DE L'APP
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('couture : le message d’invitation porte le code ET le lien, jamais une adresse morte', () => {
  const catalogue = lire(CATALOGUE);
  const message = bloc(catalogue, 'partageMessage');
  assert(message.includes('{code}') && message.includes('{lien}'), 'le message interpole le code et le lien');
  // AUCUN hôte web en dur : `apps/web` n'a pas de route `/r/`, et O10 n'est pas
  // tranché. Le message ne peut pas porter une adresse qui ne répond pas.
  for (const hote of ['gryd.run', 'gryd.app', 'http']) {
    assertEquals(message.includes(hote), false, `le message porte ${hote}`);
  }
  // Et il ne promet pas GRYD+ : le crédit est banqué jusqu'à l'ouverture.
  assertEquals(message.includes('GRYD+'), false, 'le message ne promet pas une boutique fermée');
});

Deno.test('couture : le Profil construit le lien depuis le code SERVEUR', () => {
  const profil = codeSeul(lire(PROFIL));
  assert(profil.includes('useMyReferral2026()'), 'le code vient de la lecture serveur');
  assert(profil.includes('buildReferralDeepLink('), 'le lien est construit, jamais reçu de la base');
  assert(profil.includes('referralCopy.partageMessage'), 'le message vient du catalogue');
  // Le repli reste HONNÊTE : sans code lu, on garde le message au @pseudo, sans
  // promesse de récompense.
  assert(profil.includes('referralCode && referralLink'), 'la promesse est conditionnée au code réel');
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑥ L'ALPHABET DU CHAMP DE SAISIE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('couture : le champ met en majuscules et refuse une longueur qui n’est pas la bonne', () => {
  const source = codeSeul(lire(ECRAN));
  assert(source.includes('autoCapitalize="characters"'), 'un code se tape en majuscules');
  assert(source.includes('normalizeReferralCode(draft) === null'),
    'le bouton reste éteint tant que le code n’a pas la bonne forme');
  // L'alphabet lui-même n'est jamais recopié dans l'écran.
  assertEquals(source.includes(REFERRAL_CODE_ALPHABET), false, 'l’alphabet vit dans game-rules');
});
