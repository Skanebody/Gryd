/**
 * GRYD — LE BLOC SOCIAL DU PROFIL : ce qu'il promet, et ce qu'il n'a pas le
 * droit de promettre.
 *
 * ═══ POURQUOI CE FICHIER EXISTE ════════════════════════════════════════════
 * Le lot « Réglages et Profil » a posé trois gestes sous l'identité (inviter,
 * ajouter, montrer son code) après un benchmark d'INTVL, dont l'écran de
 * réglages ouvre sur « Refer a friend — Earn 10xp for each friend you refer ».
 * Le cahier de septembre, rang 0, interdit exactement cette phrase (§15.2 :
 * « le parrainage ne donne ni XP ni points ni chance supplémentaire de gagner
 * un prix »). Un test qui lit la SOURCE est le seul moyen de garantir qu'une
 * bonne idée de croissance ne la réintroduise pas dans six semaines, sans que
 * personne ne relise le cahier.
 *
 * Il lit l'écran comme du TEXTE, hors commentaires — le patron de
 * `src/mvp/couture.test.ts` : citer une faute en prose ne doit pas la recréer.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';

async function code(chemin: string): Promise<string> {
  const source = await Deno.readTextFile(new URL(chemin, import.meta.url));
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const PROFIL = '../refonte/ProfileHomeScreen.tsx';

Deno.test('profil : les trois gestes sociaux sont peints sous l’identité', async () => {
  const src = await code(PROFIL);
  assert(src.includes('Inviter un ami'), 'l’invitation a disparu du Profil');
  assert(src.includes('Ajouter des amis'), 'l’ajout d’amis a disparu du Profil');
  assert(src.includes("router.push('/amis')"), '« Ajouter des amis » ne mène plus nulle part');
  assert(src.includes("router.push('/qr')"), '« Mon code » ne mène plus nulle part');

  // L'ordre compte : le bloc social vit AVANT le héros « Ton mouvement », donc
  // sans scroll. C'est la seule chose qu'INTVL fait mieux que nous, et la seule
  // qu'on lui reprend (cahier §15.2, « Rendez-vous → membres »).
  const social = src.indexOf('Inviter un ami');
  const hero = src.indexOf('Ton mouvement');
  assert(social > 0 && hero > 0 && social < hero, 'le bloc social est passé sous le héros : il faut scroller pour inviter');
});

/**
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTE AILLEURS, ET IL EST NOMMÉ ──────────────────
 * `docs/product/GRYD_INTVL_ANALYSE_2026_09_10.md` §1.1 rend le verdict sur
 * « Earn 10xp for each friend you refer » : REJETER. Ce test refuse toute
 * récompense chiffrée attachée à l'invitation dans la source du Profil.
 */
Deno.test('profil : inviter ne paie RIEN (cahier §15.2)', async () => {
  const src = await code(PROFIL);
  const invite = src.slice(src.indexOf('Inviter un ami') - 1200, src.indexOf('Inviter un ami') + 1200);
  for (const appat of ['XP pour', 'xp pour', 'Gagne ', 'Earn ', 'points pour', 'récompense pour', 'remise', 'discount']) {
    assert(
      !invite.includes(appat),
      `« ${appat} » près du bouton d’invitation : le parrainage ne donne ni XP ni points ni chance supplémentaire de gagner un prix (§15.2)`,
    );
  }
});

/**
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT, ET IL A DÉJÀ ÉTÉ CORRIGÉ UNE FOIS ───────
 * `shareActions.stickerText` a expédié pendant des jours un « GRYD Verified »
 * écrit en dur sur des courses jamais jugées : « le mensonge SORTAIT de
 * l'app ». Même classe de faute ici, avec le lien de profil : `buildProfileLink`
 * rend une URL BIEN FORMÉE mais aucune page ne répond dessus (l'arbitrage de
 * domaine n'est pas rendu, O10 ; `apps/web` n'a pas de route `/u/`), et `/qr`
 * l'écrit noir sur blanc (« le domaine GRYD n'est pas encore en ligne »).
 *
 * Une note en bas d'écran protège CELUI QUI PARTAGE. Elle ne protège pas celui
 * qui reçoit : lui n'a que le message. Le message ne porte donc pas d'URL.
 */
Deno.test('profil : le message d’invitation ne fait pas sortir une adresse morte', async () => {
  const src = await code(PROFIL);
  const debut = src.indexOf('const inviteMessage');
  assert(debut > 0, 'le message d’invitation a changé de nom : ce test ne lit plus rien');
  const message = src.slice(debut, src.indexOf('function invite()'));
  assert(message.length > 40, 'le message d’invitation est vide');
  for (const mort of ['gryd.run', 'gryd.app', 'https://', 'profileLink}', '${profileLink']) {
    assert(
      !message.includes(mort),
      `le message d’invitation emporte « ${mort} » : le destinataire, lui, n’a pas la note d’écran qui dit que le domaine n’est pas en ligne`,
    );
  }
  // Ce qu'il emporte à la place, et qui MARCHE aujourd'hui : le pseudo, que
  // `/amis` sait chercher (recherche « Nom ou pseudo » servie par le serveur).
  assert(message.includes('profile.handle'), 'le message ne porte plus le pseudo : il ne reste rien d’utilisable');
});

/**
 * ─── ÉTAPE 0 : LE SERVEUR N'A PAS DE PARRAINAGE, ET ON NE LE PEINT PAS ─────
 * `supabase/migrations/0002_schema.sql` crée bien `public.referrals` et une
 * colonne `users.referral_code` — et c'est précisément le piège : le schéma
 * suffit à faire croire que la fonction existe. Rien ne l'écrit. Aucune RPC ne
 * transforme un code en lien ; aucune Edge Function ne pose `activated_at` ; et
 * la seule policy d'insertion exige que le CLIENT connaisse l'`user_id` du
 * filleul, que l'app n'expose jamais. Un champ « Entrer un code de parrainage »
 * serait donc un bouton mort, doublé d'une promesse de récompense interdite.
 */
Deno.test('profil : aucun champ « code de parrainage » tant que le serveur n’en a pas', async () => {
  const src = await code(PROFIL);
  for (const appat of ['code de parrainage', 'referral code', 'Entrer un code', 'Enter code']) {
    assert(
      !src.includes(appat),
      `« ${appat} » est peint alors qu’aucune RPC ne peut l’honorer — voir docs/product/GRYD_REGLAGES_PROFIL_AUDIT_2026_09.md, § Parrainage`,
    );
  }
});

/**
 * ─── ÉTAPE 0 : LE DÉFAUT EXISTAIT ──────────────────────────────────────────
 * Le Profil portait « Amis » en bas ET rien en haut ; « Sources et appareils »
 * y vivait aussi, alors que Réglages lui donne désormais un groupe entier.
 * Deux portes pour un même geste, c'est une de trop, et c'est toujours la plus
 * basse qui traîne (elle arrivait après le journal et la collection).
 */
Deno.test('profil : pas deux portes pour le même geste', async () => {
  const src = await code(PROFIL);
  const amis = [...src.matchAll(/router\.push\('\/amis'\)/g)];
  assert(amis.length === 1, `/amis est poussé ${amis.length} fois depuis le Profil : une porte, pas deux`);
  assert(
    !src.includes("router.push('/sources')"),
    '« Sources et appareils » est revenu sur le Profil : il a son groupe dans Réglages, comme chez INTVL et Strava',
  );
});
