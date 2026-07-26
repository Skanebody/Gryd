/**
 * GRYD — LE QUATRIÈME CHEMIN DE DÉPART DÉCLARE, LUI AUSSI.
 *
 * `intentionHref` construisait `/course-live?mode=conquete&intention=…` sans
 * jamais nommer de discipline. Ce n'était pas un défaut vivant — la Carte
 * re-déclare au moment du push, et l'autre appelant (`/aujourdhui`) n'a
 * aujourd'hui aucune porte d'entrée — mais un chemin de départ MUET renaît le
 * jour où quelqu'un le câble, et il renaît en silence : la sortie repart dans
 * la discipline par défaut sans la moindre erreur.
 *
 * Deux propriétés à tenir en même temps, et c'est là qu'est le piège :
 *   1. un appelant qui déclare une discipline la voit arriver jusqu'au départ ;
 *   2. un appelant qui ne déclare rien produit l'URL HISTORIQUE, au caractère
 *      près — sinon cette migration changerait le sens de chemins existants
 *      qu'elle n'a pas le droit de toucher.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { ACTIVITIES, DEFAULT_ACTIVITY } from '@klaim/shared';
import { parseStartActivity, START_ACTIVITY_PARAM } from '../run/gps/runActivity.ts';
import { intentionHref } from './runContext.ts';

/** Ce que le départ lit vraiment de cette URL (relecture, pas inspection). */
function declaredActivity(href: string): string {
  const query = new URL(href, 'gryd:///').searchParams;
  return parseStartActivity(query.getAll(START_ACTIVITY_PARAM));
}

Deno.test('la discipline déclarée arrive jusqu’au départ, avec ou sans route', () => {
  for (const activity of ACTIVITIES) {
    assertEquals(declaredActivity(intentionHref('conquest', undefined, activity)), activity);
    assertEquals(declaredActivity(intentionHref('defense', 'zone-42', activity)), activity);
  }
});

Deno.test('un appelant MUET obtient l’URL historique, au caractère près', () => {
  // Les `targetHref` de `deriveContextualAction` passent par ici sans rien
  // déclarer : la Carte re-déclare par-dessus au push. Si cette fonction se
  // mettait à écrire « activity=run », le paramètre existerait DEUX fois.
  assertEquals(intentionHref('conquest'), '/course-live?mode=conquete&intention=conquest');
  assertEquals(
    intentionHref('defense', 'zone-42'),
    '/course-live?mode=conquete&intention=defense&route=zone-42',
  );
});

Deno.test('déclarer la course à pied ne duplique pas le paramètre', () => {
  // La discipline par défaut ne s'écrit pas dans l'URL (contrat de
  // `withStartActivity`) : un écran qui la déclare explicitement obtient donc
  // le même lien qu'un écran muet — et le départ lit la même chose.
  const href = intentionHref('conquest', undefined, DEFAULT_ACTIVITY);
  assertEquals(href, intentionHref('conquest'));
  assertEquals(new URL(href, 'gryd:///').searchParams.getAll(START_ACTIVITY_PARAM).length, 0);
  assertEquals(declaredActivity(href), DEFAULT_ACTIVITY);
});

Deno.test('la discipline n’est jamais écrite deux fois sur une même cible', () => {
  // Un lecteur qui devrait CHOISIR entre deux valeurs est un lecteur dont le
  // résultat dépend de l'ordre d'écriture — donc un bug qui n'arrive qu'en prod.
  for (const activity of ACTIVITIES) {
    const query = new URL(intentionHref('defense', 'zone-42', activity), 'gryd:///').searchParams;
    assertEquals(query.getAll(START_ACTIVITY_PARAM).length <= 1, true, activity);
  }
});
