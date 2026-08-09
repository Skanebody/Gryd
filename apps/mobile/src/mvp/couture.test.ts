/**
 * GRYD — LA COUTURE : ce que les écrans reprennent aux modules purs.
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * La relecture indépendante du 03/08 a rendu un verdict NON CONFORME dont le
 * diagnostic central mérite d'être cité, parce qu'il désigne un angle mort de
 * toute la suite de tests :
 *
 *   « le défaut est systématique et il est toujours au même endroit : les
 *     écrans reprennent d'une main ce que les modules purs ont interdit de
 *     l'autre — `?? '0'` court-circuite `heroArea`, `?? 0` court-circuite
 *     `accountView`, `signedIn: boolean` écrase `restoring`. Les tests ne
 *     peuvent pas l'attraper : ils testent les modules, pas la couture. »
 *
 * La dernière phrase était vraie des tests d'ALORS, pas de la couture. Un
 * `heroArea` irréprochable ne protège personne si l'écran écrit `aire ?? '0'`
 * juste après : la garde est intacte, et le mensonge s'affiche quand même.
 *
 * ─── CE QUE CE FICHIER TESTE, ET CE QU'IL NE PEUT PAS ───────────────────────
 * Il lit le SOURCE des écrans et y cherche les tournures qui annulent une
 * garde. C'est un filet grossier — il attrape une forme, pas une intention — et
 * il ne remplace ni la relecture ni le gate `ux-gate`. Mais chacune de ces trois
 * tournures a RÉELLEMENT été écrite dans ce dépôt, et aucune n'a été attrapée
 * par les 2 400 tests existants : un filet grossier vaut mieux qu'aucun filet.
 *
 * ─── ÉTAPE 0 — le défaut existait ───────────────────────────────────────────
 * Chaque règle ci-dessous cite le code EXACT qu'elle aurait fait échouer, avec
 * son fichier. Sans cette colonne, rien ne distinguerait ce fichier d'un test
 * qui passe parce qu'il ne demande rien.
 */

declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFileSync(chemin: string | URL): string;
  readDirSync(chemin: string | URL): Iterable<{ name: string; isFile: boolean }>;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

/** Les écrans du groupe `(mvp)`, lus depuis le disque. */
function ecrans(): { nom: string; source: string }[] {
  const base = new URL('../../app/(mvp)/', import.meta.url);
  const out: { nom: string; source: string }[] = [];
  for (const e of Deno.readDirSync(base)) {
    if (!e.isFile || !e.name.endsWith('.tsx')) continue;
    out.push({ nom: e.name, source: Deno.readTextFileSync(new URL(e.name, base)) });
  }
  // Un dossier vide rendrait TOUTES les règles vertes sans rien vérifier —
  // le mode d'échec le plus banal de ce genre de test.
  assert(out.length >= 5, `couture : ${out.length} écran(s) lu(s), le chemin est faux`);
  return out;
}

/** Le code hors commentaires — sinon citer un défaut dans un commentaire le recrée. */
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

/**
 * ① `Alert` n'existe PAS sur react-native-web — `Alert.alert` y est un no-op
 * silencieux, et `app.json` déclare la cible web.
 *
 * ÉTAPE 0 : `app/(mvp)/profil.tsx` importait `Alert` et confirmait par lui la
 * suppression de compte. Sur web, taper « Supprimer mon compte » n'affichait
 * donc RIEN — sur la seule action qu'Apple 5.1.1(v) exige et que le RGPD impose.
 */
Deno.test('couture — aucun écran (mvp) ne confirme par Alert (no-op sur web)', () => {
  for (const { nom, source } of ecrans()) {
    const code = codeSeul(source);
    assert(
      !/\bAlert\s*\./.test(code) && !/[{,]\s*Alert\s*[,}]/.test(code),
      `${nom} : utilise Alert — invisible sur react-native-web. ` +
        `Une confirmation se rend DANS l'écran.`,
    );
  }
});

/**
 * ② Un `??` qui retombe sur zéro annule la garde qui vient de rendre `null`.
 *
 * `heroArea` et les `stat*` rendent `null` quand l'écran NE SAIT PAS. Écrire
 * `?? '0'` derrière, c'est répondre « zéro » à « je ne sais pas » — la forme la
 * plus banale du mensonge, et précisément ce que L12 et L19 interdisent.
 *
 * ÉTAPE 0 : deux occurrences réelles, dans le même écran —
 *   · `profil.tsx` : `<Text style={styles.hero}>{aire ?? '0'}</Text>`
 *   · `profil.tsx` : `const jours = suppression?.graceDays ?? 0;` → la
 *     confirmation promettait « Tu auras 0 jours pour changer d'avis. »
 */
Deno.test('couture — aucun écran (mvp) ne retombe sur un zéro par ??', () => {
  const zeroParDefaut = /\?\?\s*(['"`]0['"`]|0\b)/;
  for (const { nom, source } of ecrans()) {
    const fautives = codeSeul(source)
      .split('\n')
      .filter((l) => zeroParDefaut.test(l));
    assert(
      fautives.length === 0,
      `${nom} : ${fautives.length} repli sur zéro — ` +
        `${fautives.map((l) => l.trim()).join(' | ')}. ` +
        `« Je ne sais pas » ne se dit pas « 0 ».`,
    );
  }
});

/**
 * ③ Une session est un ÉTAT À TROIS VALEURS, jamais un booléen.
 *
 * `signedIn: boolean` écrase la RESTAURATION : au démarrage à froid, l'écran
 * affirme « pas de compte » à quelqu'un qui en a un. Sur `/profil`, ça masquait
 * en plus la suppression de compte exigée par l'App Store le temps d'un
 * aller-retour ; sur `/carte`, ça peignait GO alors qu'il fallait la connexion.
 *
 * ÉTAPE 0 : `profil.tsx` construisait `{ signedIn: userId !== null }`, et
 * `homeState` a porté le même défaut jusqu'à M3.
 */
/**
 * ④ L'écran doit PEINDRE toutes les décisions que le module pur peut rendre.
 *
 * Les trois règles ci-dessus interdisent des TOURNURES. Elles n'ont pas vu le
 * défaut suivant, qui est de l'ordre de l'EXHAUSTIVITÉ — et c'est le même
 * matin que je l'ai créé en corrigeant autre chose.
 *
 * ÉTAPE 0 : `homeAction` a commencé à rendre `'signIn'` (pour que GO cesse
 * d'être un bouton mort sans compte). `carte.tsx` ne connaissait pas la valeur :
 * elle tombait dans le `: null` final du ternaire, et la carte se retrouvait
 * SANS AUCUN BOUTON. Un bouton mort échangé contre un cul-de-sac — alors que L8
 * exige que tout état vide porte l'action qui le remplit.
 *
 * TypeScript ne peut pas l'attraper : une chaîne de ternaires qui finit par
 * `: null` est parfaitement typée. Il faudrait un `switch` exhaustif sur un
 * type union — ce que ce test impose de fait, en lisant les deux fichiers.
 */
Deno.test('couture — carte.tsx peint chaque action que homeAction peut rendre', () => {
  const base = new URL('./map/', import.meta.url);
  const source = Deno.readTextFileSync(new URL('homeState.ts', base));
  const debut = source.indexOf('export function homeAction');
  assert(debut >= 0, 'couture : `homeAction` introuvable — le chemin a changé');
  // Le corps s'arrête à la première accolade fermante en début de ligne.
  const fin = source.indexOf('\n}', debut);
  const corps = codeSeul(source.slice(debut, fin));

  const rendues = new Set<string>();
  for (const m of corps.matchAll(/return\s+'([a-zA-Z]+)'/g)) rendues.add(m[1]!);
  assert(rendues.size >= 3, `couture : ${rendues.size} action(s) lue(s), la lecture a échoué`);

  const ecran = codeSeul(
    Deno.readTextFileSync(new URL('../../app/(mvp)/carte.tsx', import.meta.url)),
  );
  // `none` est la SEULE valeur qu'un écran a le droit de ne pas peindre : elle
  // dit précisément « aucune action honnête n'existe ici ».
  const oubliees = [...rendues].filter((a) => a !== 'none' && !ecran.includes(`'${a}'`));
  assert(
    oubliees.length === 0,
    `carte.tsx ne traite pas : ${oubliees.join(', ')}. ` +
      `homeAction rend cette décision, l'écran doit la peindre — sinon l'écran n'a plus d'action du tout.`,
  );
});

Deno.test('couture — aucun écran (mvp) ne réduit la session à un booléen', () => {
  for (const { nom, source } of ecrans()) {
    assert(
      !/\bsignedIn\s*:\s*(true|false|userId|session|!)/.test(codeSeul(source)),
      `${nom} : passe un booléen de session à un module pur. ` +
        `Trois états — 'restoring' | 'signedOut' | 'signedIn'.`,
    );
  }
});
