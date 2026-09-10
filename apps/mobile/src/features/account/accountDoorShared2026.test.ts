/**
 * GRYD — UNE SEULE PORTE DE COMPTE, ET ELLE SE PROUVE SUR LE SOURCE (lot 9).
 *
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT, TREIZE FOIS, MOT POUR MOT ────────────────
 * Le lot 1 avait corrigé `/sign-in` et le profil invité après le constat du
 * fondateur (10/09/2026) : « on me dit de me connecter mais je n'ai aucun moyen
 * de créer mon compte ». `accountDoor2026.test.ts` verrouille CES DEUX
 * écrans-là. Le grep qui a ouvert ce lot en a trouvé onze autres, et chacun
 * répétait le même défaut avec ses propres mots :
 *
 *   app/badges.tsx                      copy('Se connecter', 'Sign in')
 *   app/amis.tsx                        copy('Connexion', 'Sign in')
 *   app/crew-feed.tsx                   copy('Connexion', 'Sign in')
 *   app/profil-edit.tsx                 copy('Connexion', 'Sign in')
 *   app/abonnement.tsx                  copy('Me connecter', 'Sign in')
 *   app/sources.tsx                     copy('Me connecter pour importer', …)
 *   SeasonJourneyScreen.tsx             copy('Me connecter', 'Sign in')
 *   CollectionScreen.tsx                copy('Me connecter', 'Sign in')
 *   WeeklyQuests2026.tsx                t(C.actionConnexion) = « Me connecter »
 *   CrewChallenges2026Screen.tsx        copy('Me connecter', 'Sign in')
 *   CrewOutings2026Screen.tsx           copy('Me connecter', 'Sign in')
 *   ProfileComparisonScreen.tsx         copy('Me connecter', 'Sign in')
 *   CrewConversationScreen2026.tsx      copy('Connexion', 'Sign in')
 *
 * Neuf d'entre eux étaient en plus gardés par `{configured ? <Bouton/> : null}`
 * : sur un build sans adresse Supabase, l'écran ne proposait plus rien ET
 * n'expliquait rien. C'est le repli muet que la constitution interdit (L8, L14,
 * L19 : quatre états distincts, jamais un « 0 » nu ni une disparition).
 *
 * ─── CE QUE CES TESTS PROUVENT, ET CE QU'ILS NE PEUVENT PAS ─────────────────
 * Ils lisent le SOURCE et le CATALOGUE. Aucun React ne tourne sous Deno : ni
 * rendu, ni pixel, ni contraste. Ils prouvent qu'il n'existe plus qu'UN
 * composant de porte, que les treize écrans l'appellent, et qu'aucun d'eux n'a
 * gardé son libellé d'avant. C'est exactement la propriété qui manquait — et
 * qu'aucun des 2 858 tests existants ne regardait.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { C } from '../../i18n/catalog/auth.ts';
import { C as CLASSEMENT } from '../../i18n/catalog/classement.ts';
import { LOCALES } from '../../i18n/types.ts';

const PORTE = new URL('./AccountDoor2026.tsx', import.meta.url);

/**
 * Les treize écrans repris par le lot 9, avec le libellé EXACT qu'ils
 * peignaient avant. Sans cette seconde colonne, la règle « le mot a disparu »
 * ne vaudrait rien : rien ne distinguerait un écran corrigé d'un écran qui
 * n'a jamais eu de porte.
 */
const ECRANS: readonly { chemin: string; avant: string }[] = [
  { chemin: '../../../app/badges.tsx', avant: "copy('Se connecter', 'Sign in')" },
  { chemin: '../../../app/amis.tsx', avant: "copy('Connexion','Sign in')" },
  { chemin: '../../../app/crew-feed.tsx', avant: "copy('Connexion','Sign in')" },
  { chemin: '../../../app/profil-edit.tsx', avant: "copy('Connexion','Sign in')" },
  { chemin: '../../../app/abonnement.tsx', avant: "copy('Me connecter', 'Sign in')" },
  { chemin: '../../../app/sources.tsx', avant: "copy('Me connecter pour importer', 'Sign in to import')" },
  { chemin: '../refonte/SeasonJourneyScreen.tsx', avant: "copy('Me connecter', 'Sign in')" },
  { chemin: '../refonte/CollectionScreen.tsx', avant: "copy('Me connecter', 'Sign in')" },
  { chemin: '../refonte/WeeklyQuests2026.tsx', avant: 't(C.actionConnexion)' },
  { chemin: '../refonte/CrewChallenges2026Screen.tsx', avant: "copy('Me connecter', 'Sign in')" },
  { chemin: '../refonte/CrewOutings2026Screen.tsx', avant: "copy('Me connecter','Sign in')" },
  { chemin: '../refonte/ProfileComparisonScreen.tsx', avant: "copy('Me connecter', 'Sign in')" },
  { chemin: '../crew/CrewConversationScreen2026.tsx', avant: "copy('Connexion', 'Sign in')" },
] as const;

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

// ─── §1 · La porte partagée rend la grammaire du lot 1, en entier ───────────

Deno.test('AccountDoor2026 rend le titre, le CTA « Créer mon compte » et le sous-titre', () => {
  const src = lire(PORTE);
  assert(src.includes('t(C.methodsTitle)'), 'la porte ne rend pas le titre qui nomme la CRÉATION');
  assert(src.includes('t(C.doorCta)'), 'la porte ne rend pas le bouton « Créer mon compte »');
  assert(src.includes('t(C.doorOrSignIn)'), 'la porte ne dit plus qu’elle connecte aussi les revenants');
  assert(
    src.includes("router.push('/sign-in')"),
    'la porte n’ouvre plus /sign-in : elle ne mène nulle part',
  );
});

Deno.test('sans serveur, la porte se DIT fermée au lieu de disparaître', () => {
  const src = lire(PORTE);
  // ÉTAPE 0, mot pour mot, dans neuf écrans : `{configured ? <Bouton/> : null}`.
  assert(
    !/configured\s*\?[^]*?:\s*null/.test(src),
    'la porte est redevenue muette sans backend : `configured ? … : null`',
  );
  assert(
    src.includes('t(C.noBackendTitle)') && src.includes('t(C.errorNoBackend)'),
    'l’état « Serveur non configuré sur ce build » n’est peint nulle part',
  );
  // « jamais null » : aucune sortie anticipée du composant.
  assert(
    !/return\s+null/.test(src),
    'la porte peut rendre `null` : c’est exactement le repli muet qu’on retire',
  );
});

Deno.test('la porte ne devine pas la session : c’est l’écran qui sait', () => {
  const src = lire(PORTE);
  // Une seconde garde ici peindrait « Crée ton compte » PENDANT la restauration
  // de session, c'est-à-dire à quelqu'un de déjà connecté (défaut payé une fois
  // sur ProfileHomeScreen, d'où son `!session && !sessionLoading`).
  assert(
    !/\bsession\b\s*(\?|&&|\|\|)/.test(src) && !/!\s*session\b/.test(src),
    'la porte rebranche une garde de session : elle doublonnerait celle de l’écran',
  );
});

// ─── §2 · Les treize écrans passent par elle, et par elle seule ─────────────

for (const { chemin, avant } of ECRANS) {
  const nom = chemin.split('/').pop()!;

  Deno.test(`${nom} : la porte de compte est le composant partagé`, () => {
    const src = lire(new URL(chemin, import.meta.url));
    assert(
      /import \{ AccountDoor2026 \} from '[^']*AccountDoor2026'/.test(src),
      `${nom} n’importe pas AccountDoor2026 : il a gardé sa porte à lui`,
    );
    assert(src.includes('<AccountDoor2026'), `${nom} importe la porte sans la rendre`);
  });

  Deno.test(`${nom} : plus aucune porte locale vers /sign-in`, () => {
    const src = lire(new URL(chemin, import.meta.url));
    // ÉTAPE 0 : chaque écran poussait /sign-in depuis son propre bouton.
    assert(
      !src.includes("router.push('/sign-in')"),
      `${nom} rouvre une porte à lui : deux portes finissent toujours par diverger`,
    );
    // ÉTAPE 0 : le libellé EXACT d'avant, celui qui ne parlait qu'aux revenants.
    assert(
      !src.includes(avant),
      `${nom} repeint « ${avant} » : ce mot n’ouvre rien à qui n’a pas de compte`,
    );
  });
}

// ─── §3 · Le catalogue tient les deux mots que la porte ajoute ──────────────

Deno.test('« Créer mon compte » nomme la création dans les cinq langues', () => {
  const CREER: Record<string, RegExp> = {
    fr: /cr[ée]er/i, en: /creat/i, es: /crear/i, de: /erstell/i, pt: /criar/i,
  };
  for (const locale of LOCALES) {
    assert(
      CREER[locale]!.test(C.doorCta[locale]),
      `${locale} : le bouton ne dit pas la création — « ${C.doorCta[locale]} »`,
    );
  }
  // ÉTAPE 0 : les libellés remplacés, dans leurs deux langues servies.
  for (const mort of ['Se connecter', 'Me connecter', 'Connexion', 'Sign in']) {
    assert(
      C.doorCta.fr !== mort && C.doorCta.en !== mort,
      `le bouton est retombé sur « ${mort} »`,
    );
  }
});

Deno.test('le sous-titre garde la moitié que le bouton ne dit pas', () => {
  assert(
    /connecter/i.test(C.doorOrSignIn.fr) && /sign in/i.test(C.doorOrSignIn.en),
    `« ${C.doorOrSignIn.fr} » ne dit plus que la même porte connecte les revenants`,
  );
  for (const locale of LOCALES) {
    assert(C.doorOrSignIn[locale].length > 0, `${locale} : sous-titre vide`);
  }
});

Deno.test('règle de copie du fondateur : aucun tiret long dans les textes de la porte', () => {
  for (const [cle, entry] of Object.entries({ doorCta: C.doorCta, doorOrSignIn: C.doorOrSignIn })) {
    assert(!/[—–]/.test(entry.fr), `${cle}.fr contient un tiret long : « ${entry.fr} »`);
  }
});

// ─── §4 · Le mot mort n'est plus proposé nulle part ailleurs ────────────────

Deno.test('sources.tsx ne peint plus UNE porte PAR source connectable', () => {
  const src = lire(new URL('../../../app/sources.tsx', import.meta.url));
  // ÉTAPE 0 : le bouton vivait DANS la boucle `VERIFY_SOURCES.filter(…).map(…)`,
  // donc quatre boutons identiques pour un seul geste.
  const boucle = src.indexOf(".map(source => {");
  const porte = src.indexOf('<AccountDoor2026');
  assert(boucle > 0 && porte > 0, 'sources.tsx a changé de structure : ancres introuvables');
  assert(porte < boucle, 'la porte est repassée dans la boucle des sources : une par ligne');
});

// ═══════════════════════════════════════════════════════════════════════════
// §5 · LOT 11 — LES DEUX PORTES `profile` QUE LE LOT 9 N'AVAIT PAS VUES
// ═══════════════════════════════════════════════════════════════════════════
/**
 * ÉTAPE 0 (10/09/2026). Le lot 9 a cherché les portes dans `app/**` et dans
 * les écrans de profil ; deux vivaient ailleurs, dans des écrans `refonte` que
 * d'autres routes rendent, et elles répétaient le même mot :
 *
 *   CommuneLeaderboard2026.tsx:149  t(C.connexionAction)          « Se connecter »
 *   ProfilePremiumScreen.tsx:122    copy('Me connecter','Sign in') « Me connecter »
 *
 * La seconde était EN PLUS gardée par `premium.canSignIn` (= `configured &&
 * !userId && !sessionLoading`) : sur un build sans adresse Supabase, l'écran
 * imprimait « Connecte-toi pour voir les offres » et RETIRAIT le bouton. Une
 * phrase qui ordonne un geste, à côté du vide où ce geste devrait être.
 *
 * LE TON N'EST PAS UN DÉTAIL ICI. Ces deux écrans sont CLAIRS (`ProfilePage
 * tone="light"`). La porte peint par défaut l'échelle sombre (`c.darkInk` sur
 * `c.darkSurface`) : la poser sans `tone="light"` écrirait du quasi-blanc sur
 * du quasi-blanc. Le mot serait là, et personne ne le lirait — la régression
 * la plus silencieuse de tout ce chantier, invisible en revue de diff.
 */
const ECRANS_LOT_11: readonly { chemin: string; avant: string }[] = [
  { chemin: '../refonte/CommuneLeaderboard2026.tsx', avant: 't(C.connexionAction)' },
  { chemin: '../refonte/ProfilePremiumScreen.tsx', avant: "copy('Me connecter', 'Sign in')" },
] as const;

/**
 * LES QUATRE FAUTES qu'une porte `profile` convertie peut reprendre. PURE, pour
 * qu'une mutation puisse la rejouer sur une copie du source : une règle qu'on
 * ne sait pas faire échouer ne prouve rien.
 */
function fautesDePorteClaire(source: string, avant: string): readonly string[] {
  const fautes: string[] = [];
  if (/router\.(?:push|replace|navigate)\([^)\n]*\/sign-in/.test(source)) {
    fautes.push('porte locale vers /sign-in');
  }
  if (source.includes(avant)) fautes.push(`libellé d’avant : ${avant}`);
  // Sans backend, la porte se DIT fermée ; elle ne s'efface pas (L8/L14/L19).
  if (/(?:configured|canSignIn)\s*(?:\?|&&)\s*\(?\s*<AccountDoor2026/.test(source)) {
    fautes.push('porte gardée : elle redisparaît sans backend');
  }
  // Écran clair + porte sombre = un texte quasi invisible.
  if (/<AccountDoor2026(?![^>]*tone="light")/.test(source)) {
    fautes.push('porte sombre sur un écran clair : `tone="light"` manque');
  }
  return fautes;
}

for (const { chemin, avant } of ECRANS_LOT_11) {
  const nom = chemin.split('/').pop()!;

  Deno.test(`${nom} : la porte de compte est le composant partagé`, () => {
    const src = lire(new URL(chemin, import.meta.url));
    assert(
      /import \{ AccountDoor2026 \} from '[^']*AccountDoor2026'/.test(src),
      `${nom} n’importe pas AccountDoor2026 : il a gardé sa porte à lui`,
    );
    assertEquals(
      src.split('<AccountDoor2026').length - 1,
      1,
      `${nom} ne rend pas sa porte de compte, ou en rend deux`,
    );
    // La RAISON est locale : « le classement » n'est pas « l'abonnement ».
    assert(
      /<AccountDoor2026[^>]*reason=/.test(src),
      `${nom} rend une porte sans dire ce que le compte débloque ICI`,
    );
  });

  Deno.test(`${nom} : plus aucune porte locale, plus aucun libellé d’avant`, () => {
    const src = lire(new URL(chemin, import.meta.url));
    assertEquals(fautesDePorteClaire(src, avant), [], `${nom} a repris une faute de porte`);
  });
}

Deno.test('la raison du classement reste un FAIT, dans les cinq langues', () => {
  // Le titre local (« Le classement demande un compte ») cède la place à celui
  // de la porte ; la raison, elle, reste locale — c'est la seule phrase qui
  // explique POURQUOI la lecture est refusée, et elle ne s'invente pas ailleurs.
  for (const locale of LOCALES) {
    assert(
      CLASSEMENT.connexionCorps[locale].trim().length > 0,
      `classement.connexionCorps.${locale} est vide`,
    );
  }
  assert(
    !/connecte-toi pour/i.test(CLASSEMENT.connexionCorps.fr),
    `« ${CLASSEMENT.connexionCorps.fr} » ordonne une connexion à qui n’a pas de compte`,
  );
  assert(
    !/[—–]/.test(CLASSEMENT.connexionCorps.fr),
    'classement.connexionCorps.fr contient un tiret long',
  );
});

Deno.test('MUTATION : la porte de /premium regardée par `canSignIn` fait rougir la règle', () => {
  const src = lire(new URL('../refonte/ProfilePremiumScreen.tsx', import.meta.url));
  assertEquals(fautesDePorteClaire(src, "copy('Me connecter', 'Sign in')"), []);
  // ÉTAPE 0, mot pour mot : la garde qui effaçait le bouton sans backend.
  const garde = src.replace('<AccountDoor2026', 'premium.canSignIn ? <AccountDoor2026');
  assertEquals(fautesDePorteClaire(garde, "copy('Me connecter', 'Sign in')"), [
    'porte gardée : elle redisparaît sans backend',
  ]);
});

Deno.test('MUTATION : une porte SOMBRE sur le classement clair fait rougir la règle', () => {
  const src = lire(new URL('../refonte/CommuneLeaderboard2026.tsx', import.meta.url));
  assertEquals(fautesDePorteClaire(src, 't(C.connexionAction)'), []);
  // La régression invisible : on retire `tone="light"` DE LA PORTE, tout
  // compile, et l'écran rend une porte dont on ne lit plus un mot. On vise la
  // balise, pas la première occurrence du fichier : `ProfilePage` et
  // `ProfileSegments` portent le même réglage bien avant elle, et une mutation
  // qui les toucherait ne prouverait rien de la porte.
  const sombre = src.replace('<AccountDoor2026 tone="light"', '<AccountDoor2026');
  assertEquals(fautesDePorteClaire(sombre, 't(C.connexionAction)'), [
    'porte sombre sur un écran clair : `tone="light"` manque',
  ]);
});
