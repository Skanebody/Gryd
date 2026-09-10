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
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { C } from '../../i18n/catalog/auth.ts';
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
