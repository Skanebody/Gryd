/**
 * GRYD — le SDK d'achat ne se configure PAS dans un build gratuit (ADR-011).
 *
 * ─── POURQUOI CE TEST EXISTE ────────────────────────────────────────────────
 * `react-native-purchases` n'est pas qu'une dépendance inerte : dès qu'un écran
 * appelle `configurePurchases`, le SDK CONTACTE RevenueCat. C'est un appel
 * TIERS, avec un identifiant utilisateur — donc un partage de données à
 * déclarer dans les réponses « App Privacy » de l'App Store.
 *
 * Le déclarer alors qu'on ne vend rien serait absurde ; ne PAS le déclarer alors
 * que l'appel part serait une fausse déclaration. La seule position tenable est
 * que l'appel NE PARTE PAS — et ça, ça se vérifie.
 *
 * ─── CE QU'IL VERROUILLE ────────────────────────────────────────────────────
 * La liste EXACTE des écrans qui touchent au SDK. Elle est aujourd'hui de deux,
 * tous deux derrière un drapeau fermé (`flags.arsenal`, `flags.paidOffer`).
 * Si un troisième apparaît, ce test rougit — et il faudra soit le mettre
 * derrière un drapeau, soit mettre à jour les déclarations de confidentialité.
 *
 * Il lit la SOURCE plutôt que d'importer : `react-native-purchases` est un
 * module natif que Deno ne résout pas, et lire le texte attrape aussi un import
 * ajouté à la main dans un écran qu'on n'aurait pas pensé à tester.
 */
declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFile(p: string | URL): Promise<string>;
  readDir(p: string | URL): AsyncIterable<{ name: string; isDirectory: boolean; isFile: boolean }>;
};

function assertEquals(actual: unknown, expected: unknown, message = 'valeurs différentes'): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`${message}\n  attendu : ${String(expected)}\n  obtenu  : ${String(actual)}`);
  }
}

/**
 * Les SEULS fichiers autorisés à toucher au SDK, hors `features/premium/`.
 * Les deux sont derrière un drapeau FERMÉ au lancement (ADR-011).
 */
const AUTORISES = new Set(['app/arsenal.tsx', 'app/premium.tsx']);

const RACINE = new URL('../../../', import.meta.url);

async function fichiers(rel: string, out: string[] = []): Promise<string[]> {
  for await (const e of Deno.readDir(new URL(rel, RACINE))) {
    const chemin = `${rel}${e.name}`;
    if (e.isDirectory) await fichiers(`${chemin}/`, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(chemin);
  }
  return out;
}

Deno.test('ADR-011 : AUCUN écran inattendu ne touche au SDK d’achat', async () => {
  const tous = [...(await fichiers('app/')), ...(await fichiers('src/'))];
  const coupables: string[] = [];
  for (const f of tous) {
    // `features/premium/` EST la frontière avec le SDK : c'est son rôle.
    if (f.startsWith('src/features/premium/')) continue;
    const src = await Deno.readTextFile(new URL(f, RACINE));
    // Un IMPORT, pas une mention : les docblocks du dépôt citent souvent ces
    // noms pour expliquer qu'ils ne les utilisent PAS (`app/season.tsx` le fait).
    if (/^import[^\n]*\b(usePremium|useStorePrices|configurePurchases)\b/m.test(src)) {
      coupables.push(f);
    }
  }
  const inattendus = coupables.filter((f) => !AUTORISES.has(f));
  assertEquals(
    inattendus.join(', '),
    '',
    'ces fichiers configurent le SDK d’achat alors que GRYD est gratuit : ' +
      'soit ils passent derrière un drapeau, soit les déclarations « App Privacy » ' +
      'doivent être mises à jour — un appel tiers non déclaré est une fausse déclaration',
  );
});
