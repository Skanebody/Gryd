/**
 * GRYD — la ligne « Créer depuis une sortie · Studio » doit MENER au Studio.
 *
 * Elle poussait `/(tabs)/profil`, c'est-à-dire le journal : le libellé promettait
 * le Studio, la navigation livrait autre chose. Ce n'est pas un bouton mort au
 * sens strict — il « marche » — mais c'est une promesse non tenue, ce que le
 * même interdit vise (« l'affichage se dérive de la capacité RÉELLE »).
 *
 * Le test lit la SOURCE : une navigation ne se vérifie pas en important un
 * composant React sous Deno, et lire le texte attrape aussi un retour en
 * arrière fait à la main dans un autre écran.
 */
import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@^1';
declare const Deno: { test(name: string, fn: () => Promise<void> | void): void; readTextFile(p: string | URL): Promise<string> };

Deno.test('collection : la ligne Studio ouvre le Studio, pas le journal', async () => {
  const source = await Deno.readTextFile(new URL('./CollectionScreen.tsx', import.meta.url));
  const row = source.split('\n').find(line => line.includes('Créer depuis une sortie'));
  assertEquals(typeof row, 'string');
  assertStringIncludes(row!, "router.push('/partage')");
  assertEquals(row!.includes('/(tabs)/profil'), false);
});
