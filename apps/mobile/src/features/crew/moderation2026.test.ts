/**
 * GRYD — LES TROIS PROMESSES DE MODÉRATION SONT RÉELLEMENT BRANCHÉES.
 *
 * Ces garde-fous lisent la SOURCE plutôt que d'exécuter React : les trois
 * surfaces concernées (`moderation.ts`, `app/member.tsx`, `app/crew-feed.tsx`)
 * tirent AsyncStorage, expo-router et supabase-js, que Deno n'a pas à résoudre
 * pour vérifier qu'un bouton appelle bien la bonne RPC. Même patron que
 * `blocklist.test.ts`, et pour la même raison : le défaut historique n'était pas
 * une logique fausse, c'était une logique BRANCHÉE NULLE PART.
 *
 * ÉTAPE 0 — CE QUI ÉTAIT FAUX AVANT LE 10/09/2026, et que ces tests empêchent
 * de revenir :
 *   · `useBlockedPseudos` ne lisait QUE `user_blocks` (legacy, indexé par
 *     pseudo), alors que le fil et le profil d'un membre écrivent dans
 *     `social_blocks_2026` (indexé par compte) : bloquer ne masquait personne
 *     dans le roster de crew ;
 *   · le profil d'un membre offrait « Bloquer » et AUCUN « Signaler » ;
 *   · le fil n'avait aucun chemin de retrait pour la direction du crew, et
 *     `reviewed_at` n'était jamais renseigné.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

const read = (relative: string) => Deno.readTextFile(new URL(relative, import.meta.url));

Deno.test('les blocages 2026 entrent dans la liste que les surfaces filtrent', async () => {
  const store = await read('./moderation.ts');
  assert(
    store.includes("supabase.rpc('social_block_list_2026')"),
    'le store doit lire la liste de blocage 2026 — c’est elle que le serveur oppose',
  );
  assert(store.includes('blockedPeople'), 'le hook doit exposer les comptes bloqués');
  // Le miroir serveur n'est JAMAIS persisté : une copie périmée d'un blocage
  // est pire qu'une absence (elle masque quelqu'un qu'on a débloqué).
  assert(
    !/JSON\.stringify\([^)]*blocked2026/.test(store),
    'la liste 2026 ne doit pas partir en AsyncStorage',
  );
  // Débloquer doit lever les DEUX mondes, sinon la relecture ramène la ligne.
  assert(
    store.includes("rpc('social_block_2026', { p_user_id: target.id, p_blocked: false })"),
    'unblockMember doit lever aussi le blocage 2026',
  );

  const sheet = await read('./PlayerModerationSheet.tsx');
  assert(
    sheet.includes('blockedPeople.map((p) => p.id)'),
    'l’index de comparaison doit contenir les ID de compte, pas seulement des noms',
  );
});

Deno.test('le profil d’un membre offre SIGNALER, pas seulement bloquer (1.2)', async () => {
  const src = await read('../../../app/member.tsx');
  assert(src.includes("'social_report_2026'"), 'le signalement doit partir par la RPC serveur');
  assert(src.includes('p_target_user_id'), 'il doit viser la PERSONNE (0137)');
  assert(src.includes("'social_block_2026'"), 'bloquer reste offert à côté');
  // Les quatre motifs du serveur, ni plus ni moins : un motif inconnu serait
  // refusé par `invalid_reason` et le joueur ne saurait pas pourquoi.
  for (const reason of ['harassment', 'privacy', 'inappropriate', 'other']) {
    assert(src.includes(`'${reason}'`), `le motif ${reason} doit être proposé`);
  }
  // Jamais en un tap : motif PUIS confirmation.
  assert(src.includes('Confirmer'), 'le signalement se confirme');
});

Deno.test('le fil du crew ouvre le retrait et le classement à la direction', async () => {
  const src = await read('../../../app/crew-feed.tsx');
  assert(src.includes("'social_moderation_queue_2026'"), 'la file des alertes doit être lue');
  assert(src.includes("'social_moderate_2026'"), 'retirer/classer doit passer par la RPC 0138');
  assert(src.includes("p_action:confirm.moderate"), 'les deux actions partent au serveur');
  // AUCUN BOUTON MORT : la capacité vient du SERVEUR, jamais d'un rôle deviné
  // côté client.
  assert(
    src.includes("moderation.data?.canModerate===true"),
    'la capacité de modérer doit être celle que le serveur annonce',
  );
  // Le chemin de l'AUTEUR reste distinct de celui de la direction.
  assert(src.includes("'social_remove_2026'"), 'retirer SON contenu reste `social_remove_2026`');
  // L'identité de celui qui signale ne transite jamais par cet écran.
  assertEquals(src.includes('reporter'), false, 'aucun rapporteur nommé dans le fil');
});
