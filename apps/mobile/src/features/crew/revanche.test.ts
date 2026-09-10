/**
 * GRYD — LA REVANCHE NE S'INVENTE PAS UN RIVAL.
 *
 * ─── LE DÉFAUT MESURÉ (10/09/2026) ──────────────────────────────────────────
 * `revanche.ts` posait AU PREMIER LANCEMENT une revanche fabriquée — secteur
 * « Buttes-Chaumont », rival « MEUTE 20 », « 14 zones perdues », déclenchée
 * « il y a 2 h » — et la PERSISTAIT dans AsyncStorage avec un drapeau `seeded`
 * pour ne pas la ré-armer. C'était de la donnée factice vivante : un crew qui
 * n'existe pas, un quartier de Paris pour un MVP à Rouen, et un compte à
 * rebours sur un vol qui n'a jamais eu lieu. « Zéro donnée factice » n'a pas
 * d'exception « démo » (CLAUDE.md).
 *
 * Ce test est TEXTUEL, faute de mieux et en le disant : le module importe
 * AsyncStorage et `react`, que Deno ne charge pas ici. Lire la source est la
 * seule preuve rejouable — et elle suffit, parce que ce qu'on protège est
 * l'ABSENCE d'un seed, pas le résultat d'un calcul.
 *
 * Il échoue si le seed revient, sous n'importe quel nom.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const source = await Deno.readTextFile(new URL('./revanche.ts', import.meta.url));
/**
 * Le CODE seul. Les commentaires ont le droit de nommer ce qui a été retiré —
 * c'est même leur travail : sans eux, personne ne saurait pourquoi ce fichier
 * est vide de déclencheur. Le retrait des commentaires est volontairement
 * naïf (aucune chaîne du module ne contient « // » ni « /* »).
 */
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

Deno.test('aucun déclencheur fabriqué ne peut renaître', () => {
  for (const trace of ['demoTrigger', 'DEMO_TRIGGERED_HOURS_AGO', 'seeded']) {
    assert(!code.includes(trace), `« ${trace} » est revenu dans le CODE : le seed de démonstration avec lui`);
  }
});

Deno.test('aucun nom de rival, de secteur ni de compte de zones n’est écrit ici', () => {
  // Les trois champs d'un `RevancheTrigger`. Le module les DÉCLARE (interface,
  // paramètre) mais ne doit jamais leur donner une valeur littérale : une
  // valeur, ici, c'est un crew ou un quartier inventé.
  for (const champ of ['sector', 'rivalCrew', 'zonesLost']) {
    const litteral = new RegExp(`${champ}\\s*:\\s*['"\`0-9]`);
    assert(
      !litteral.test(code),
      `${champ} reçoit une valeur en dur dans revanche.ts — c'est exactement la donnée factice retirée`,
    );
  }
});

Deno.test('un seul chemin pose une revanche, et il vient de l’extérieur', () => {
  // `trigger = { … }` : une seule construction, celle de `triggerRevanche`, qui
  // ne fabrique rien puisqu'elle reçoit ses champs. Le chargement, lui, ne fait
  // que relire ce qui avait été persisté (`trigger = parsed.trigger ?? null`).
  assertEquals(
    (code.match(/trigger = \{/g) ?? []).length,
    1,
    'plus d’un endroit construit une revanche : l’un d’eux l’invente probablement',
  );
  assert(
    /export function triggerRevanche\(input: \{/.test(code),
    'triggerRevanche ne reçoit plus ses faits de l’appelant',
  );
  assert(
    source.includes('AUCUN APPELANT AUJOURD’HUI') || source.includes("AUCUN APPELANT AUJOURD'HUI"),
    'la fonction a peut-être trouvé une source réelle : si oui, dire laquelle ici plutôt que de retirer la note',
  );
});

Deno.test('le stockage tolère l’ancien format sans le ressusciter', () => {
  // Une clé `seeded` traîne dans AsyncStorage chez qui a lancé l'app avant ce
  // correctif. On la LIT sans s'en servir : pas de migration de stockage, et
  // surtout pas de relecture d'un drapeau qui armait le faux rival.
  assert(code.includes('JSON.stringify({ trigger })'), 'le payload persisté a changé de forme sans que ce test le sache');
  assert(
    /const parsed = JSON\.parse\(raw\) as \{ trigger: RevancheTrigger \| null \}/.test(code),
    'la relecture du stockage n’est plus limitée au seul déclencheur',
  );
});
