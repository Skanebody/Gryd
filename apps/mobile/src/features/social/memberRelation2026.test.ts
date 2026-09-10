/**
 * GRYD — LE PROFIL D'UN MEMBRE NE PEINT QUE CE QUI PEUT ABOUTIR.
 *
 * Ces gardes lisent la SOURCE de `app/member.tsx` : l'écran tire expo-router,
 * supabase-js et AsyncStorage, que Deno n'a pas à résoudre pour vérifier quelle
 * action est peinte dans quel état. Même patron que `moderation2026.test.ts`.
 *
 * ─── ÉTAPE 0 — CE QUI ÉTAIT FAUX, ET QUE CES TESTS EMPÊCHENT DE REVENIR ─────
 *   · « Demander en ami », « Suivre » et « Ne plus suivre » étaient peints
 *     ENSEMBLE, sans qu'aucune relation ne soit lue : deux boutons morts sur
 *     trois, toujours (la migration 0153 ajoute `relation` à
 *     `social_member_2026`) ;
 *   · « Bloquer ce membre » partait au PREMIER TAP, sans un mot sur ce que
 *     bloquer fait — alors que l'appel supprime les abonnements dans les DEUX
 *     sens et rejette l'amitié en cours (`social_block_2026`, 0124:216), et que
 *     le fil du crew, lui, demandait déjà confirmation ;
 *   · une personne DÉJÀ bloquée se voyait proposer « Suivre » : un geste qui se
 *     défait au moment même où il se fait.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const source = await Deno.readTextFile(new URL('../../../app/member.tsx', import.meta.url));

Deno.test('aucune action de relation n’est peinte sans relation lue', () => {
  assert(source.includes('const relation=person.data?.relation ?? null'), 'l’écran doit lire MA relation, pas la supposer');
  // `relation` absente (serveur en retard d'une migration) n'est pas « aucune
  // relation » : l'écran le DIT au lieu de peindre trois boutons au hasard.
  assert(
    source.includes('{!relation?<Text'),
    'sans relation lue, l’écran doit expliquer — et ne rien proposer',
  );
  for (const etat of ['relation.friend', 'relation.requestReceived', 'relation.requestSent', 'relation.following']) {
    assert(source.includes(etat), `l’état « ${etat} » n’est plus consulté : un bouton mort peut revenir`);
  }
});

Deno.test('bloquer se demande, et se dit, avant de partir', () => {
  // La RPC de blocage ne doit apparaître qu'à DEUX endroits : la confirmation
  // (p_blocked:true) et le déblocage (p_blocked:false). Trois, c'est qu'un tap
  // direct est revenu quelque part.
  assertEquals(
    (source.match(/'social_block_2026'/g) ?? []).length,
    2,
    'social_block_2026 est appelée plus de deux fois : un blocage part probablement sans confirmation',
  );
  const bouton = source.indexOf("copy('Bloquer ce membre','Block member')");
  assert(bouton > 0, 'la ligne « Bloquer ce membre » a disparu du profil');
  const ligne = source.slice(bouton, source.indexOf('\n', bouton));
  assert(!ligne.includes('social_block_2026'), 'la ligne « Bloquer » appelle encore la RPC directement : c’est le tap unique');
  assert(ligne.includes('setBlocking(true)'), 'la ligne « Bloquer » doit ouvrir la confirmation');
  assert(
    source.includes("copy('Confirmer le blocage','Confirm block')"),
    'la confirmation doit porter un libellé qui nomme le geste',
  );
  // Ce que bloquer FAIT est écrit avant, pas découvert après.
  for (const consequence of ['publications', 'demande d’ami', 'n’en est pas informée']) {
    assert(source.includes(consequence), `la confirmation ne dit plus « ${consequence} »`);
  }
});

Deno.test('une personne déjà bloquée n’a plus qu’un geste : revenir en arrière', () => {
  assert(source.includes('relation.blocked?'), 'l’état bloqué doit court-circuiter les actions d’ami et d’abonnement');
  assert(source.includes("copy('Débloquer','Unblock')"), 'débloquer doit être offert depuis ce profil');
  assert(source.includes('p_blocked:false'), 'débloquer doit lever le blocage côté serveur');
  assert(
    source.includes('{relation?.blocked?null:<ProfileLink title={copy(\'Bloquer ce membre\',\'Block member\')}'),
    'la ligne « Bloquer » doit disparaître quand la personne est déjà bloquée',
  );
});
