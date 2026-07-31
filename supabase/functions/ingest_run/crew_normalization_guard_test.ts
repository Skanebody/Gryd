/**
 * GRYD — GARDE-FOU : aucun appelant de `add_crew_xp` ne passe la table BRUTE.
 *
 * ─── POURQUOI CE GARDE-FOU EXISTE ───────────────────────────────────────────
 * Depuis la migration `0107`, le barème de niveau de crew est NORMALISÉ par la
 * taille du crew, et cette normalisation vit dans le moteur pur
 * (`crewXpTableFor(memberCount)`), pas en SQL. Le choix était délibéré :
 * `add_crew_xp` reçoit déjà la table pour ne pas dupliquer `CREW_XP_TABLE` en
 * SQL (0010), et sa signature est partagée avec `finalize_offensive` (0064), que
 * changer aurait obligé à recréer avec ses droits et ses appelants.
 *
 * Le prix de ce choix est CE fichier : la règle n'est plus tenue par le type,
 * elle est tenue par la discipline des appelants. Passer `CREW_XP_TABLE` brute
 * rétablirait EN SILENCE le barème qui récompense la taille — un crew de 50
 * franchirait la table dix fois plus vite qu'un crew de 5 à engagement par tête
 * égal, sans qu'aucun test de niveau ne rougisse (ils passent tous à la taille
 * de référence, où le multiplicateur vaut 1).
 *
 * C'est exactement la forme de régression que ce dépôt a déjà payée : un défaut
 * invisible parce qu'aucun test ne regardait l'endroit où il vit.
 */
declare const Deno: {
  test(nom: string, fn: () => void | Promise<void>): void;
  readTextFile(chemin: string): Promise<string>;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const ICI = (import.meta as unknown as { readonly dirname: string }).dirname;

/** Les DEUX Edge Functions qui créditent de l'XP crew, chemin depuis ce fichier. */
const APPELANTS = [
  `${ICI}/index.ts`,
  `${ICI}/../close_offensives/index.ts`,
] as const;

Deno.test('aucun appelant ne passe CREW_XP_TABLE brute à p_xp_table', async () => {
  for (const chemin of APPELANTS) {
    const src = await Deno.readTextFile(chemin);
    // On cherche l'AFFECTATION du paramètre, pas la mention du nom : les
    // commentaires citent légitimement `CREW_XP_TABLE` pour expliquer la règle.
    const brut = /p_xp_table\s*:\s*CREW_XP_TABLE\b/.test(src);
    assert(
      !brut,
      `${chemin} passe la table BRUTE : le barème redeviendrait dépendant de la taille du crew`,
    );
  }
});

Deno.test('les deux appelants passent bien le barème normalisé', async () => {
  for (const chemin of APPELANTS) {
    const src = await Deno.readTextFile(chemin);
    assert(
      /p_xp_table\s*:\s*crewXpTableFor\(/.test(src),
      `${chemin} doit passer crewXpTableFor(nombre de membres actifs)`,
    );
  }
});

Deno.test('le nombre de membres compté EXCLUT ceux qui sont partis', async () => {
  // `crew_members` garde l'historique des adhésions (`left_at`) pour le cooldown
  // de changement de crew. Compter sans ce filtre gonflerait la taille du crew
  // avec ses anciens membres, donc DURCIRAIT le barème pour ceux qui restent :
  // un crew que des gens ont quitté deviendrait plus difficile à faire monter
  // qu'un crew neuf de même taille réelle.
  for (const chemin of APPELANTS) {
    const src = await Deno.readTextFile(chemin);
    const bloc = src.slice(src.indexOf("from('crew_members')"));
    assert(
      /\.is\('left_at',\s*null\)/.test(bloc.slice(0, 400)),
      `${chemin} doit compter les membres ACTIFS (left_at is null)`,
    );
  }
});
