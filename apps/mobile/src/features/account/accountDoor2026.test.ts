/**
 * GRYD — « CRÉER UN COMPTE » DOIT ÊTRE ÉVIDENT, ET SE PROUVER SUR LE SOURCE.
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT, ET IL A ÉTÉ CONSTATÉ SUR UN IPHONE ───────
 * Le fondateur, build en main le 10/09/2026 : « je ne suis pas connecté,
 * l'application s'ouvre sur la carte, on me dit de me connecter mais je n'ai
 * aucun moyen de créer mon compte. » Rien n'était cassé. Tout était muet :
 *
 *   catalog/auth.ts   methodsTitle.fr = 'Retrouve ton terrain'   // le revenant
 *   catalog/auth.ts   kicker.fr       = 'CONNEXION'              // le revenant
 *   AuthEntry2026     <Button label={t(C.emailCta)} … />         // « Continuer
 *                                                               //   avec un
 *                                                               //   e-mail »
 *   ProfileHomeScreen … : configured ? <Pressable …>
 *                           <Text>{copy('Connexion', 'Sign in')}</Text>  // 13 pt,
 *                         </Pressable> : null                    // collé à droite
 *
 * Pas une occurrence du verbe « créer » sur la porte qui CRÉE le compte
 * (`requestEmailOtp` envoie `shouldCreateUser: true`). Et la seule porte du
 * profil invité était un lien de 13 pt à droite de l'avatar, qui disparaissait
 * PUREMENT ET SIMPLEMENT quand Supabase n'était pas configuré.
 *
 * ─── CE QUE CES TESTS PROUVENT, ET CE QU'ILS NE PEUVENT PAS ─────────────────
 * Ils lisent le SOURCE et le CATALOGUE. Aucun React ne tourne sous Deno : ils
 * ne prouvent pas un rendu, pas une position en pixels, pas un contraste. Ils
 * prouvent qu'un mot est là où il doit être, dans l'ordre où il doit l'être —
 * c'est-à-dire exactement la propriété qui manquait, et qu'aucun des 2 716
 * tests existants ne regardait.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { C } from '../../i18n/catalog/auth.ts';
import { LOCALES } from '../../i18n/types.ts';

const SRC = {
  authEntry: new URL('./AuthEntry2026.tsx', import.meta.url),
  signIn: new URL('../../../app/(auth)/sign-in.tsx', import.meta.url),
  email: new URL('../../../app/(auth)/email.tsx', import.meta.url),
  profil: new URL('../refonte/ProfileHomeScreen.tsx', import.meta.url),
} as const;

/** Le code hors commentaires : citer un défaut dans une prose ne le recrée pas. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('{/*') && !l.trim().startsWith('*'))
    .join('\n');
}

function lire(url: URL): string {
  const brut = Deno.readTextFileSync(url);
  // Un chemin faux rendrait toutes les règles vertes sans rien vérifier.
  assert(brut.length > 400, `source introuvable ou vide : ${url.pathname}`);
  return codeSeul(brut);
}

/** Apostrophes typographiques et droites comparées sur le même pied. */
function normal(texte: string): string {
  return texte.replace(/[’‘]/g, "'").toLowerCase();
}

// ─── §1 · Le titre de la porte nomme la CRÉATION ────────────────────────────

Deno.test('le titre de /sign-in dit « crée ton compte », dans les cinq langues', () => {
  const fr = normal(C.methodsTitle.fr);
  assert(
    /cr[ée]e? (ton|un) compte/.test(fr),
    `le titre de la porte ne nomme pas la création : « ${C.methodsTitle.fr} »`,
  );
  // ÉTAPE 0 : le titre PRÉCÉDENT, mot pour mot. Il ne parlait qu'aux revenants.
  assert(fr !== normal('Retrouve ton terrain'), 'le titre est revenu à « Retrouve ton terrain »');
  const CREER: Record<string, RegExp> = {
    fr: /cr[ée]/, en: /creat/, es: /cre[ae]/, de: /erstell|anleg/, pt: /cri[ae]/,
  };
  for (const locale of LOCALES) {
    assert(
      CREER[locale]!.test(normal(C.methodsTitle[locale])),
      `${locale} : le titre ne dit pas la création — « ${C.methodsTitle[locale]} »`,
    );
  }
});

Deno.test('c’est bien CE titre que l’écran peint, et le corps s’adresse à qui n’a pas de compte', () => {
  const src = lire(SRC.authEntry);
  assert(src.includes('t(C.methodsTitle)'), 'AuthEntry2026 ne rend plus `methodsTitle`');
  assert(src.includes('t(C.subtitle)'), 'AuthEntry2026 ne rend plus le corps de l’écran');
  // ⚠️ « cré » SEUL NE SUFFIT PAS COMME FILET : « ton crew » le contient, et
  // l'ancien sous-titre passait donc pour vert. On cherche le geste, pas la
  // syllabe.
  assert(
    /pas encore de compte|il se cr[ée]e|cr[ée]er/.test(normal(C.subtitle.fr)),
    `le corps ne s’adresse toujours qu’à celui qui a déjà un compte : « ${C.subtitle.fr} »`,
  );
});

// ─── §2 · La porte e-mail dit ce qu'elle fait, et les deux écrans le disent
//         AVEC LA MÊME PHRASE ───────────────────────────────────────────────

Deno.test('la phrase de la porte e-mail met la CRÉATION en premier', () => {
  for (const entry of [C.otpCreatesOrSignsInLink, C.otpCreatesOrSignsIn]) {
    const fr = normal(entry.fr);
    const cree = fr.indexOf('cr');
    const connecte = fr.indexOf('connecte');
    assert(cree >= 0 && connecte >= 0, `phrase incomplète : « ${entry.fr} »`);
    // ÉTAPE 0 : « il te connecte si ton compte existe, il le crée sinon » —
    // celui qui n'a pas de compte lisait une condition qui ne le concernait pas
    // et s'arrêtait à la virgule.
    assert(
      cree < connecte,
      `la connexion passe avant la création : « ${entry.fr} »`,
    );
  }
});

Deno.test('/sign-in et /email rendent la MÊME entrée : aucune paraphrase entre les deux écrans', () => {
  const signIn = lire(SRC.authEntry);
  const email = lire(SRC.email);
  for (const [nom, src] of [['AuthEntry2026', signIn], ['app/(auth)/email.tsx', email]] as const) {
    assert(
      /otpCreatesOrSignsInLink/.test(src) && /otpCreatesOrSignsIn\b/.test(src),
      `${nom} : les deux cadences (lien, code) ne sont pas servies depuis catalog/auth.ts`,
    );
    assert(
      /EMAIL_DELIVERY === 'code'/.test(src),
      `${nom} : la phrase doit suivre la cadence RÉELLEMENT servie — promettre un ` +
        `code non envoyé était la panne d'origine`,
    );
  }
  // La source unique : plus aucun jumeau dans le catalogue de l'écran e-mail.
  const catalogueEmail = Deno.readTextFileSync(new URL('../../i18n/catalog/authEmail.ts', import.meta.url));
  assert(
    !/^\s{2}whatHappens:/m.test(catalogueEmail),
    'catalog/authEmail.ts a repris une phrase jumelle : deux entrées finissent désaccordées',
  );
});

// ─── §3 · Une porte qui ne peut pas s'ouvrir se DIT fermée ──────────────────

Deno.test('sans serveur configuré, /sign-in ne renvoie plus à la carte en silence', () => {
  const src = lire(SRC.authEntry);
  // ÉTAPE 0, mot pour mot : `if (session || !configured) return <Redirect href="/" />;`
  assert(
    !/session\s*\|\|\s*!configured/.test(src),
    'la porte s’évapore encore : `!configured` renvoie à la carte sans un mot',
  );
  assert(
    src.includes('t(C.noBackendTitle)') && src.includes('t(C.errorNoBackend)'),
    'l’état « Serveur non configuré sur ce build » n’est peint nulle part',
  );
  assert(
    src.includes('t(C.noBackendBackCta)'),
    'cet état n’a aucune sortie : un mur sans issue est pire qu’une redirection',
  );
});

Deno.test('/email ne retombe pas sur la carte non plus : il mène à la porte qui explique', () => {
  const src = lire(SRC.email);
  assert(
    !/session\s*\|\|\s*!configured/.test(src),
    'app/(auth)/email.tsx renvoie encore à la carte quand le serveur manque',
  );
  assert(
    /!configured\s*\)\s*return\s*<Redirect href="\/sign-in"/.test(src),
    'un lien profond vers /email sans backend doit mener à l’état honnête de /sign-in',
  );
});

// ─── §4 · Le profil invité ouvre sur la porte, pas sur un lien de 13 pt ─────

Deno.test('le profil invité peint un bouton dont le libellé commence par « Créer mon compte »', () => {
  const src = lire(SRC.profil);
  const bouton = /<ProfileButton[^>]*label=\{copy\('(Créer mon compte[^']*)'/.exec(src);
  assert(
    bouton !== null,
    'aucun bouton « Créer mon compte » dans le profil : la porte est retombée à un lien',
  );
  assert(
    src.includes("copy('ou se connecter'"),
    'le bouton ne dit pas qu’il connecte aussi celui qui a déjà un compte',
  );
});

Deno.test('cette porte est EN TÊTE du profil invité : elle ne se mérite pas au scroll', () => {
  const src = lire(SRC.profil);
  const porte = src.indexOf("copy('Créer mon compte'");
  const identite = src.indexOf('<View style={local.identity}>');
  const journal = src.indexOf("copy('Journal', 'Journal')");
  assert(porte > 0 && identite > 0 && journal > 0, 'le profil a changé de structure : ancres introuvables');
  assert(porte < identite, 'la porte est peinte APRÈS la ligne d’identité : elle n’est plus la première chose vue');
  assert(porte < journal, 'la porte est peinte après le journal : il faut scroller pour créer un compte');
});

Deno.test('le mot « Connexion » seul a disparu du profil, et l’état invité reste honnête', () => {
  const src = lire(SRC.profil);
  // ÉTAPE 0 : `<Text>{copy('Connexion', 'Sign in')}</Text>` — le seul mot de la
  // porte s'adressait à ceux qui ont déjà un compte.
  assert(
    !/copy\('Connexion'/.test(src),
    'le profil repeint « Connexion » tout seul : ce mot n’ouvre rien à qui n’a pas de compte',
  );
  assert(
    src.includes("copy('Invité', 'Guest')") && src.includes("copy('Sur cet appareil'"),
    'l’état invité ne dit plus ce qu’il est : sans compte, ces sorties ne vivent que sur ce téléphone',
  );
});

Deno.test('sans serveur configuré, la porte du profil dit POURQUOI au lieu de disparaître', () => {
  const src = lire(SRC.profil);
  // ÉTAPE 0 : `… : configured ? <Pressable …>Connexion</Pressable> : null` —
  // sur un build sans Supabase, l'écran invité n'avait plus aucune porte, et
  // aucune phrase pour dire qu'il n'y en avait pas.
  assert(
    /Serveur non configuré/.test(Deno.readTextFileSync(SRC.profil)),
    'le profil invité sans backend est redevenu muet',
  );
  const sansPorte = src.indexOf('Serveur non configuré');
  const porte = src.indexOf("copy('Créer mon compte'");
  assert(porte > 0 && sansPorte > porte, 'l’état sans backend doit être l’ALTERNATIVE de la porte, pas un bloc séparé');
});

// ─── §5 · La règle de copie du fondateur, sur les textes de CETTE porte ─────

Deno.test('aucun tiret long dans les textes français de la porte de compte', () => {
  // Règle de copie du fondateur : en français, ponctuer avec des points, des
  // deux-points ou des virgules. Les entrées écrites avant cette règle ne sont
  // pas réécrites ici ; celles que la porte peint aujourd'hui, si.
  const entrees = {
    kicker: C.kicker,
    methodsTitle: C.methodsTitle,
    subtitle: C.subtitle,
    otpCreatesOrSignsIn: C.otpCreatesOrSignsIn,
    otpCreatesOrSignsInLink: C.otpCreatesOrSignsInLink,
    noBackendTitle: C.noBackendTitle,
    noBackendBackCta: C.noBackendBackCta,
  };
  for (const [cle, entry] of Object.entries(entrees)) {
    assert(
      !/[—–]/.test(entry.fr),
      `${cle}.fr contient un tiret long : « ${entry.fr} »`,
    );
  }
});
