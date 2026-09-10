/**
 * GRYD — CE QUE LA PHOTOTHÈQUE PROMET, ET CE QUE LE BINAIRE PAIE (LOT P, 10/09/2026).
 *
 * ─── POURQUOI CE TEST LIT DU TEXTE ──────────────────────────────────────────
 * `photoLibrary2026.ts` et `brandImagery.ts` contiennent des `require()`, que
 * seul Metro sait résoudre : les importer sous Deno lèverait une
 * `ReferenceError` avant la première assertion. Ils sont donc lus comme des
 * SOURCES, exactement comme `src/i18n/noDashFr2026.test.ts` lit les catalogues.
 * En échange, chaque chemin cité est vérifié sur le DISQUE : un `require()` qui
 * désigne un fichier absent casse le build Metro, pas la compilation TypeScript.
 *
 * ─── LES QUATRE PROMESSES TENUES ICI ────────────────────────────────────────
 *  1. le héros du Profil n'est plus la photo de la découverte (le doublon) ;
 *  2. le fichier du héros existe, et pèse moins que le plafond de 450 Ko ;
 *  3. le stock ne coûte RIEN au binaire : un seul `require()` de photothèque,
 *     et aucun fichier de `assets/photos/` requis ailleurs dans `src/` ;
 *  4. le registre et le dossier disent la même chose : aucune entrée fantôme,
 *     aucun fichier orphelin.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const MOBILE = new URL('../../../', import.meta.url);
const REGISTRE = new URL('src/ui/gryd/photoLibrary2026.ts', MOBILE);
const IMAGERIE = new URL('src/ui/gryd/brandImagery.ts', MOBILE);
const DOSSIER = new URL('assets/photos/', MOBILE);

/** Le plafond annoncé au fondateur : 450 Ko par photo, héros compris. */
const PLAFOND_OCTETS = 450 * 1024;

const lire = (url: URL): Promise<string> => Deno.readTextFile(url);

/** Blanchit les commentaires : un chemin cité en prose n'est pas un `require()`. */
function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (bloc) => bloc.replace(/[^\n]/g, ' '))
    .replace(/^[ \t]*\/\/[^\n]*/gm, (ligne) => ' '.repeat(ligne.length));
}

/** Tous les chemins passés à `require()` dans un fichier, commentaires exclus. */
export function cheminsRequis(source: string): readonly string[] {
  return [...sansCommentaires(source).matchAll(/require\(\s*'([^']+)'\s*\)/g)].map((m) => m[1] ?? '');
}

/** Toutes les valeurs `file: '…'` du registre. */
export function fichiersDeclares(source: string): readonly string[] {
  return [...sansCommentaires(source).matchAll(/\bfile:\s*'([^']+)'/g)].map((m) => m[1] ?? '');
}

async function fichiersDuDossier(): Promise<string[]> {
  const noms: string[] = [];
  for await (const entree of Deno.readDir(DOSSIER)) if (entree.isFile) noms.push(entree.name);
  return noms.sort();
}

Deno.test('MUTATION : la lecture des require et des fichiers déclarés voit ce qu’elle prétend voir', () => {
  // Étape 0. Sans ces quatre lignes, les regex ci-dessus pourraient ne rien
  // trouver et tout ce fichier serait vert pour rien. La troisième est un
  // require EN COMMENTAIRE : il ne doit jamais compter.
  const echantillon = [
    "  source: require('../../../assets/photos/a.jpg') as ImageSourcePropType,",
    "  file: 'a.jpg',",
    "  // source: require('../../../assets/photos/jamais.jpg'),",
    "/** file: 'fantome.jpg' */",
  ].join('\n');
  assertEquals(cheminsRequis(echantillon), ['../../../assets/photos/a.jpg']);
  assertEquals(fichiersDeclares(echantillon), ['a.jpg']);
});

Deno.test('le héros du Profil n’est plus la photo de la découverte', async () => {
  const imagerie = await lire(IMAGERIE);
  const profil = await lire(new URL('src/features/refonte/ProfileHomeScreen.tsx', MOBILE));

  // `movement` reste la photo de la découverte et de la porte de compte : c'est
  // leur paire, on ne la défait pas. Ce qui doit changer, c'est le Profil.
  assert(
    cheminsRequis(imagerie).includes('../../../assets/onboarding/e01-crew.jpg'),
    'la découverte a perdu SA photo : `movement` ne require plus e01-crew.jpg',
  );
  assert(
    /brandImagery\.profileMovement\.source/.test(profil),
    'le bloc « Tout commence dehors » ne lit pas `brandImagery.profileMovement`',
  );
  assert(
    !/brandImagery\.movement\b/.test(profil),
    'le Profil lit encore `brandImagery.movement` : le doublon avec la découverte est de retour',
  );
});

Deno.test('le fichier du héros existe et tient sous le plafond', async () => {
  const registre = await lire(REGISTRE);
  const requis = cheminsRequis(registre);
  assertEquals(requis.length, 1, `la photothèque require ${requis.length} images au lieu d’une seule`);

  const chemin = requis[0] ?? '';
  assert(
    chemin.endsWith('-heros-profil.jpg'),
    `le require de la photothèque ne pointe pas le recadrage du héros : « ${chemin} »`,
  );
  const fichier = new URL(chemin.replace('../../../', ''), MOBILE);
  const info = await Deno.stat(fichier);
  assert(info.isFile, `« ${chemin} » n’existe pas sur le disque : Metro casserait au build`);
  assert(
    info.size <= PLAFOND_OCTETS,
    `le héros pèse ${Math.round(info.size / 1024)} Ko, plafond ${PLAFOND_OCTETS / 1024} Ko`,
  );
});

Deno.test('aucune photo de stock n’entre dans le binaire', async () => {
  // Un `require()` de plus, c'est du poids de plus à CHAQUE téléchargement de
  // l'app. Tant qu'aucun écran n'affiche une photo, elle reste un chemin en
  // chaîne. Le jour où l'on en peint une, cette liste s'allonge sciemment.
  const attendus = ['gryd-crew-course-montee-ville-foule-heros-profil.jpg'];
  const requis: string[] = [];
  const marche = async (rel: string): Promise<void> => {
    for await (const entree of Deno.readDir(new URL(rel, MOBILE))) {
      const chemin = `${rel}${entree.name}`;
      if (entree.isDirectory) await marche(`${chemin}/`);
      else if (/\.tsx?$/.test(entree.name) && !/\.test\.tsx?$/.test(entree.name)) {
        for (const cite of cheminsRequis(await lire(new URL(chemin, MOBILE)))) {
          if (cite.includes('assets/photos/')) requis.push(cite.split('/').pop() ?? cite);
        }
      }
    }
  };
  await marche('src/');
  await marche('app/');
  assertEquals(
    [...new Set(requis)].sort(),
    attendus,
    'une photo de stock est requise quelque part : elle part dans le binaire sans qu’un écran la montre',
  );
});

Deno.test('le registre et le dossier disent la même chose', async () => {
  const declares = [...fichiersDeclares(await lire(REGISTRE))].sort();
  const surDisque = await fichiersDuDossier();

  assertEquals(
    declares,
    surDisque,
    'le registre et `assets/photos/` divergent : entrée sans fichier, ou fichier sans entrée',
  );
  assert(declares.length >= 13, `la photothèque ne compte que ${declares.length} entrées`);

  for (const nom of surDisque) {
    assert(
      /^gryd-[a-z0-9]+(-[a-z0-9]+)*\.jpg$/.test(nom),
      `« ${nom} » n’est pas un nom SEO : préfixe gryd-, minuscules sans accent, tirets, .jpg`,
    );
    const info = await Deno.stat(new URL(nom, DOSSIER));
    assert(
      info.size <= PLAFOND_OCTETS,
      `« ${nom} » pèse ${Math.round(info.size / 1024)} Ko, plafond ${PLAFOND_OCTETS / 1024} Ko`,
    );
  }
});
