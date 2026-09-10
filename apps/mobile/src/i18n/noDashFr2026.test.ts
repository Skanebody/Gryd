/**
 * GRYD — LE FRANÇAIS DE L'APP N'ÉCRIT PLUS DE TIRET LONG (LOT 7, 10/09/2026).
 *
 * ─── LA DÉCISION ────────────────────────────────────────────────────────────
 * Fondateur, 10/09/2026 : « Il faut retirer tous les tirets longs du texte en
 * français. Ils existent en anglais, pas en français. » Le cadratin « — »
 * (U+2014) et le demi-cadratin « – » (U+2013) sont une ponctuation ANGLAISE ;
 * le français dit la même chose avec un point, un deux-points, une virgule,
 * une parenthèse — ou le point médian « · », déjà employé dans l'app pour les
 * libellés compacts (« 12 km · 45 min »), et qui n'est PAS un tiret.
 *
 * La règle ne vaut QUE pour le français : `en`, `es`, `de` et `pt` gardent
 * leurs tirets, et ce test ne les regarde jamais. Les COMMENTAIRES de code non
 * plus : le dépôt en compte des milliers, ce sont des séparateurs de
 * documentation, pas du texte de jeu. Ils sont blanchis avant lecture.
 *
 * ─── ÉTAPE 0, MESURÉE ───────────────────────────────────────────────────────
 * Avant le lot 7, `apps/mobile` portait 289 valeurs `fr` de catalogue et 11
 * littéraux inline (a11y, JSX, `copy(fr, en)`) contenant un tiret long, plus 1
 * titre de notification française côté serveur (`digest_job/logic.ts`). 280 ont
 * été réécrites ; les 20 restantes vivent dans les catalogues que d'autres lots
 * éditaient le même jour (`EXCLUDED_PATHS_UNTIL_2026_09_11`), et 1 est un
 * GLYPHE, pas une phrase (voir `GLYPHE_VALEUR_INCONNUE`).
 *
 * Le test `MUTATION` ci-dessous rejoue les chaînes exactes d'avant le
 * correctif : sans lui, ce fichier pourrait être vert parce qu'il ne cherche
 * rien. C'est l'étape 0 du dépôt — « le défaut existait ».
 *
 * ─── CE QU'IL LIT, ET CE QU'IL NE LIT PAS ───────────────────────────────────
 * Il lit la SOURCE, pas les modules : `app/**` est du TSX qui importe React
 * Native, Deno ne le charge pas. Trois formes sont balayées, sur `app/**` et
 * `src/**` :
 *   · `fr: '…'` — toute valeur française de catalogue, y compris les entrées
 *     écrites sur une seule ligne (`{ fr: …, en: … }`, cf. `arsenalPreview.ts`,
 *     qui avait échappé au premier inventaire justement pour cette raison) ;
 *   · `copy('…', '…')` — le PREMIER argument, celui que lit `useRefonteCopy` ;
 *   · `text('…', '…')` — le même raccourci sous son autre nom.
 * FAUX POSITIF POSSIBLE, ET ASSUMÉ : `share/StudioObjectArtwork2026.tsx` a son
 * PROPRE `text(valeur, taille)` — même nom, autre contrat. Aucun de ses
 * arguments ne porte de tiret aujourd'hui ; si l'un en portait un en anglais,
 * ce test le refuserait à tort. On préfère ce risque-là à une regex qui devine
 * la langue : un faux positif se lit et se discute, un faux négatif se tait.
 * Les fichiers `*.test.ts(x)` sont ignorés : `badges.test.ts` conserve
 * volontairement les textes d'AVANT un correctif, et les brûler ici reviendrait
 * à interdire les tests de mutation.
 *
 * LIMITE ASSUMÉE : un séparateur pur (`${a} — ${b}`) n'est pas une chaîne
 * française, ce filet ne le voit pas. Les sept qui existaient ont été réécrits
 * à la main le 10/09 — six libellés a11y (`map/prepare.tsx` ×2, `CityPicker`,
 * `MissionBriefingSheet`, `PlaceSearchScreen`, `CommuneLeaderboard2026`) et une
 * plage de dates (`SeasonCollections2026`) ; un nouveau passerait. Le jour où
 * l'on veut les tenir aussi, c'est un autre test — pas une regex de plus ici.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const RACINE = new URL('../../', import.meta.url);

/**
 * LES ZONES QU'UN AUTRE LOT ÉDITAIT LE 10/09/2026. Elles ne sont pas
 * pardonnées, elles sont DIFFÉRÉES : le fondateur vide cette liste quand les
 * lots concernés ont atterri, et le test devient alors global. Chaque entrée
 * est un PRÉFIXE de chemin relatif à `apps/mobile/` (un dossier finit par `/`,
 * un motif `result*.ts` s'écrit `…/catalog/result`).
 *
 * `packages/**` et `supabase/functions/ingest_run/**` sont hors des racines
 * balayées : inutile de les lister, ce test ne les atteint pas.
 */
export const EXCLUDED_PATHS_UNTIL_2026_09_11: readonly string[] = [
  // Vidée le 11/09/2026 : tous les lots ont atterri, le test est global.
];

/**
 * UN TIRET SEUL N'EST PAS UNE PHRASE. `flagged.walletUnknown` vaut « — » dans
 * les CINQ langues : c'est le glyphe « valeur non lue », le seul moyen de ne
 * pas écrire un « 0 » nu quand la lecture n'a pas abouti (interdit L8/L14). Le
 * remplacer en français seul décrocherait le français des quatre autres, et
 * `run/gps/liveRate.test.ts` attend littéralement cette valeur. Il reste donc,
 * et ce test le dit plutôt que de le taire.
 */
const GLYPHE_VALEUR_INCONNUE = /^\s*[—–]\s*$/;

/** Les trois portes par lesquelles une chaîne FRANÇAISE entre dans l'app. */
const SOURCES_DE_FRANCAIS: readonly RegExp[] = [
  /\bfr:\s*'((?:[^'\\\n]|\\.)*)'/g,
  /\bfr:\s*"((?:[^"\\\n]|\\.)*)"/g,
  /\bfr:\s*`((?:[^`\\]|\\.)*)`/g,
  /\bcopy\(\s*'((?:[^'\\\n]|\\.)*)'/g,
  /\bcopy\(\s*"((?:[^"\\\n]|\\.)*)"/g,
  /\bcopy\(\s*`((?:[^`\\]|\\.)*)`/g,
  /\btext\(\s*'((?:[^'\\\n]|\\.)*)'/g,
  /\btext\(\s*"((?:[^"\\\n]|\\.)*)"/g,
  /\btext\(\s*`((?:[^`\\]|\\.)*)`/g,
];

/**
 * Blanchit les commentaires SANS bouger un seul indice : chaque caractère
 * devient une espace, les retours à la ligne restent. Les numéros de ligne
 * rapportés sont donc ceux du fichier réel — un rapport qui décale d'une ligne
 * ne se relit pas, il s'ignore.
 */
export function blanchirCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (bloc) => bloc.replace(/[^\n]/g, ' '))
    .replace(/^[ \t]*\/\/[^\n]*/gm, (ligne) => ' '.repeat(ligne.length));
}

export type Trouvaille = { readonly ligne: number; readonly texte: string };

/** Les chaînes françaises d'UN fichier qui portent encore un tiret long. */
export function tiretsLongsEnFrancais(source: string): readonly Trouvaille[] {
  const propre = blanchirCommentaires(source);
  const trouvailles: Trouvaille[] = [];
  for (const motif of SOURCES_DE_FRANCAIS) {
    motif.lastIndex = 0;
    for (const m of propre.matchAll(motif)) {
      const texte = m[1] ?? '';
      if (!/[—–]/.test(texte)) continue;
      if (GLYPHE_VALEUR_INCONNUE.test(texte)) continue;
      trouvailles.push({
        ligne: propre.slice(0, m.index).split('\n').length,
        texte,
      });
    }
  }
  return trouvailles.sort((a, b) => a.ligne - b.ligne);
}

async function fichiers(rel: string, out: string[] = []): Promise<string[]> {
  for await (const e of Deno.readDir(new URL(rel, RACINE))) {
    const chemin = `${rel}${e.name}`;
    if (e.isDirectory) await fichiers(`${chemin}/`, out);
    else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) out.push(chemin);
  }
  return out;
}

const differe = (chemin: string): boolean =>
  EXCLUDED_PATHS_UNTIL_2026_09_11.some((prefixe) => chemin.startsWith(prefixe));

Deno.test('MUTATION : les chaînes d’AVANT le lot 7 sont bien repérées', () => {
  // Étape 0. Ces sept lignes existaient telles quelles le 10/09/2026 au matin
  // (crew.ts, map.ts, runGps.ts, nav.ts, arsenalPreview.ts, member.tsx). Si ce
  // test passe au vert en les laissant passer, le filet ne protège plus rien.
  const avant = [
    "  fr: 'La boucle est ouverte — qui la ferme ?',",
    "    fr: 'Déjà alerté — patiente un peu',",
    "    fr: 'GPS coupé — réactive la position dans Réglages',",
    "    fr: 'Activité — {n} zones à défendre',",
    "  'x': { fr: '{name} : des Éclats — la monnaie du style, jamais du territoire.', en: 'x' },",
    "{copy('Demande envoyée — en attente de sa réponse.','Request sent — waiting for an answer.')}",
    "{text('Surface publiée — à la capture', 'Area published at capture')}",
  ].join('\n');
  assertEquals(
    tiretsLongsEnFrancais(avant).map((t) => t.ligne),
    [1, 2, 3, 4, 5, 6, 7],
    'le balayage rate une des formes qu’il est censé tenir (fr:, entrée sur une ligne, copy(, text()',
  );
});

Deno.test('les autres langues gardent leurs tirets, et le glyphe « — » survit', () => {
  // Le contre-test : un filet qui crie sur l'anglais serait désactivé dans la
  // semaine, et un filet qui efface le glyphe « valeur non lue » ferait mentir
  // l'app (un « 0 » nu à la place d'une lecture qui n'a pas abouti).
  const echantillon = [
    "  en: 'Location not found — turn on location to start.',",
    "  de: 'Standort blockiert — Einstellungen',",
    "  pt: 'Sem sinal — continuamos',",
    "  fr: '—',",
    "{copy('Demande envoyée. En attente.','Request sent — waiting for an answer.')}",
  ].join('\n');
  assertEquals(tiretsLongsEnFrancais(echantillon), []);
});

Deno.test('un tiret long dans un COMMENTAIRE n’est jamais une faute', () => {
  const echantillon = [
    '/** GRYD — i18n : catalogue du domaine « nav-tabs ».',
    " *  Ces libellés vivaient sous la forme `text('Courir — Run', 'Run')`. */",
    "  // ── Onglets — « Crew » reste invariant ──",
    "  fr: 'Carte',",
  ].join('\n');
  assertEquals(tiretsLongsEnFrancais(echantillon), []);
});

Deno.test('AUCUNE chaîne française de l’app ne porte de tiret long', async () => {
  const tous = [...(await fichiers('app/')), ...(await fichiers('src/'))];
  // Pas de seuil chiffré : on nomme deux témoins, un par racine, tous deux
  // NICHÉS. S'ils manquent, la marche n'est pas « courte », elle est cassée —
  // et un test qui balaie zéro fichier est vert pour rien.
  for (const temoin of ['app/map/prepare.tsx', 'src/i18n/catalog/crew.ts']) {
    assert(tous.includes(temoin), `« ${temoin} » n’a pas été balayé : la marche s’est arrêtée`);
  }

  const fautes: string[] = [];
  for (const chemin of tous) {
    if (differe(chemin)) continue;
    const source = await Deno.readTextFile(new URL(chemin, RACINE));
    for (const t of tiretsLongsEnFrancais(source)) {
      fautes.push(`${chemin}:${t.ligne} — « ${t.texte} »`);
    }
  }
  assertEquals(
    fautes,
    [],
    `tiret long dans du français affiché (${fautes.length}) :\n${fautes.join('\n')}`,
  );
});

Deno.test('la liste des zones différées ne contient aucune entrée périmée', async () => {
  // Une exclusion qui ne désigne plus aucun fichier n'attend plus personne :
  // elle donne juste l'illusion d'un chantier en cours. On la fait tomber.
  const tous = [...(await fichiers('app/')), ...(await fichiers('src/'))];
  const orphelines = EXCLUDED_PATHS_UNTIL_2026_09_11.filter(
    (prefixe) => !tous.some((chemin) => chemin.startsWith(prefixe)),
  );
  assertEquals(
    orphelines,
    [],
    'ces exclusions ne désignent plus rien : retire-les de EXCLUDED_PATHS_UNTIL_2026_09_11',
  );
});
