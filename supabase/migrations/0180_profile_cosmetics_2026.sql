-- ════════════════════════════════════════════════════════════════════════════
-- 0180 — LES COSMÉTIQUES DE PROFIL : SEPT EMPLACEMENTS, ET UN SERVEUR QUI DIT NON
-- ════════════════════════════════════════════════════════════════════════════
--
-- DEMANDE FONDATEUR (10/09/2026) : « Est-ce qu'il y a d'autres moyens de
-- personnalisation de profil qu'utilisent d'autres applications, que l'on peut
-- faire payer in-app, qui ne seraient que du code et qui ne coûtent rien ? »
--
-- ─── LE DÉFAUT QUE CETTE MIGRATION RÉPARE ───────────────────────────────────
-- Le schéma ne connaissait QUE DEUX emplacements d'identité, et ils étaient
-- pris : `frame` et `title` (0121 saison, 0144 niveau), plus `frame`/`emblem`
-- côté commercial (0125). Aucune table ne pouvait porter une couleur de nom,
-- une bannière, un style de trace, un style de pin ni un thème de carte. Un
-- écran qui les aurait peints n'aurait rien pu ENREGISTRER : l'objet aurait
-- disparu au premier changement d'appareil, ce qui est exactement le contraire
-- de « permanent » (§7.5).
--
-- ─── POURQUOI UNE HUITIÈME MAISON, ET PAS L'UNE DES TROIS EXISTANTES ────────
--  · `season_reward_ownership_2026` (0121) est clé sur une collection PUBLIÉE
--    (FK `season_collections_2026`). Aucune saison n'est publiée en production ;
--    y ranger un cosmétique obligerait à inventer un calendrier.
--  · `level_reward_ownership_2026` (0144) est clé sur un instantané GELÉ dont
--    `level` et `min_xp` sont UNIQUE. Deux cosmétiques ouverts au même niveau
--    (et il y en a) casseraient l'instantané et son test de dérive.
--  · `commercial_ownership_2026` (0125) enregistre un REÇU DU STORE
--    (`check(not owned or product_id is not null)`). Un cosmétique gratuit n'a
--    pas de reçu, et en forger un décrirait un achat qui n'a pas eu lieu.
-- On reprend donc la FORME éprouvée de 0144 — un instantané de modèles gelé,
-- plus une table d'équipement à clé `(user_id, slot)` — sans dupliquer aucune
-- possession : la possession est LUE dans les trois maisons existantes, elle
-- n'est pas recopiée ici.
--
-- ─── CE QUI REND CE MODÈLE INFALSIFIABLE PAR LE CLIENT ──────────────────────
--  1. Aucune écriture directe : `revoke all … from anon, authenticated`. Le seul
--     chemin est `equip_cosmetic_2026`, en `security definer`.
--  2. La RPC RE-VÉRIFIE l'obtention côté serveur, même si l'écran a proposé
--     l'objet par erreur. Un client modifié qui appelle avec « frame_hexagone »
--     sans posséder la collection reçoit `cosmetic_not_unlocked`.
--  3. `(item_id, slot)` est une clé étrangère COMPOSITE : une bannière ne peut
--     pas occuper l'emplacement du pin, même par une écriture de service_role.
--  4. `primary key(user_id, slot)` : un seul objet par emplacement, jamais deux
--     cadres sur un même profil.
--
-- ─── ANTI PAY-TO-WIN ────────────────────────────────────────────────────────
-- Aucune colonne de ce fichier n'entre dans un calcul de capture, d'XP, de
-- points de défi ou de classement. Un cosmétique change ce qu'on MONTRE. Le
-- test PGlite le vérifie en jouant une capture avant/après équipement.
--
-- Requiert : 0119 (registre d'XP), 0120 (droits GRYD+), 0121 (objets de
-- saison), 0125 (collections commerciales permanentes).

-- ── 1. L'INSTANTANÉ GELÉ DU CATALOGUE ───────────────────────────────────────
-- Miroir de `apps/mobile/src/features/arsenal/cosmetics2026.ts`. Les seuils en
-- XP sont la traduction des NIVEAUX de `PROFILE_COSMETIC_LEVELS_2026`
-- (game-rules.ts) par la formule du cahier, XP(N) = 100×(N−1) + 10×(N−1)×(N−2),
-- celle-là même que `xpForLevel2026` applique. Les deux tests refusent l'écart :
-- `cosmetics2026.test.ts` compare les identifiants, et
-- `profile_cosmetics_2026.pglite.test.mjs` recalcule chaque `min_xp`.
create table public.profile_cosmetic_items_2026 (
  item_id text primary key,
  -- Les sept emplacements de `PROFILE_COSMETIC_SLOTS_2026`, ni plus ni moins.
  slot text not null check(slot in ('nameColor','avatarFrame','banner','trace','pin','titleBadge','cardTheme')),
  obtain text not null check(obtain in ('level','season','gryd_plus','collection')),
  min_level integer check(min_level>=1),
  min_xp integer check(min_xp>=0),
  season_reward_id text,
  collection_id text references public.commercial_collections_2026(id),
  -- Une origine, une seule condition : un objet ne peut pas être à la fois
  -- gagné au niveau 8 et vendu dans une collection. Sans ce `check`, la RPC
  -- devrait ARBITRER entre deux conditions, et le joueur ne saurait plus ce
  -- qu'on lui demande.
  check(
    (obtain='level' and min_level is not null and min_xp is not null and season_reward_id is null and collection_id is null)
    or (obtain='season' and season_reward_id is not null and min_level is null and min_xp is null and collection_id is null)
    or (obtain='gryd_plus' and min_level is null and min_xp is null and season_reward_id is null and collection_id is null)
    or (obtain='collection' and collection_id is not null and min_level is null and min_xp is null and season_reward_id is null)
  ),
  -- Rend possible la clé étrangère COMPOSITE de la table d'équipement.
  unique(item_id,slot)
);

insert into public.profile_cosmetic_items_2026(item_id,slot,obtain,min_level,min_xp,season_reward_id,collection_id) values
  -- (a) couleur du nom et du @pseudo
  ('name_ivoire','nameColor','level',1,0,null,null),
  ('name_chartreuse','nameColor','level',2,100,null,null),
  ('name_aurore','nameColor','level',8,1120,null,null),
  ('name_givre','nameColor','gryd_plus',null,null,null,null),
  ('name_lave','nameColor','collection',null,null,null,'contour'),
  -- (b) cadres d'avatar
  ('frame_nu','avatarFrame','level',1,0,null,null),
  ('frame_lisere','avatarFrame','level',2,100,null,null),
  ('frame_double','avatarFrame','level',4,360,null,null),
  ('frame_couture','avatarFrame','level',14,2860,null,null),
  ('frame_pulsation','avatarFrame','gryd_plus',null,null,null,null),
  ('frame_hexagone','avatarFrame','collection',null,null,null,'relief'),
  -- (c) bannières de profil
  ('banner_carbone','banner','level',1,0,null,null),
  ('banner_trame','banner','level',4,360,null,null),
  ('banner_hachures','banner','level',8,1120,null,null),
  ('banner_aurore','banner','gryd_plus',null,null,null,null),
  ('banner_courbes','banner','collection',null,null,null,'contour'),
  -- (d) style de la trace
  ('trace_chartreuse','trace','level',1,0,null,null),
  ('trace_ivoire','trace','level',2,100,null,null),
  ('trace_large','trace','level',8,1120,null,null),
  ('trace_neon','trace','gryd_plus',null,null,null,null),
  ('trace_relief','trace','collection',null,null,null,'relief'),
  -- (e) style du pin « moi »
  ('pin_goutte','pin','level',1,0,null,null),
  ('pin_hexagone','pin','level',4,360,null,null),
  ('pin_eclair','pin','level',25,7920,null,null),
  ('pin_couronne','pin','season',null,null,'title',null),
  ('pin_blason','pin','collection',null,null,null,'clubhouse'),
  -- (g) badges de titre
  ('title_simple','titleBadge','level',1,0,null,null),
  ('title_capitales','titleBadge','level',2,100,null,null),
  ('title_contour','titleBadge','level',8,1120,null,null),
  ('title_grave','titleBadge','collection',null,null,null,'clubhouse'),
  -- (f) thèmes de carte de résultat et de partage
  ('card_sombre','cardTheme','level',1,0,null,null),
  ('card_minimal','cardTheme','level',4,360,null,null),
  ('card_inverse','cardTheme','level',14,2860,null,null),
  ('card_affiche','cardTheme','gryd_plus',null,null,null,null);

-- Chaque emplacement DOIT porter un objet livré avec le compte (niveau 1) :
-- sans lui, « retirer » un cosmétique n'aurait aucun état de retour, et le
-- serveur devrait inventer un état « rien » qu'aucune table ne nomme.
do $$
declare manquant text;
begin
  select string_agg(s,',') into manquant from unnest(array['nameColor','avatarFrame','banner','trace','pin','titleBadge','cardTheme']) s
  where not exists(select 1 from public.profile_cosmetic_items_2026 i where i.slot=s and i.obtain='level' and i.min_xp=0);
  if manquant is not null then raise exception 'slots_without_included_item: %',manquant; end if;
end $$;

-- ── 2. CE QUE LE JOUEUR PORTE ───────────────────────────────────────────────
create table public.profile_cosmetics_2026 (
  user_id uuid not null references public.users(id) on delete cascade,
  slot text not null,
  item_id text not null,
  equipped_at timestamptz not null default now(),
  primary key(user_id,slot),
  -- Composite : l'objet doit appartenir à CET emplacement. Une bannière dans
  -- l'emplacement du pin est structurellement impossible, pas seulement
  -- déconseillée.
  foreign key(item_id,slot) references public.profile_cosmetic_items_2026(item_id,slot)
);
create index profile_cosmetics_2026_item on public.profile_cosmetics_2026(item_id);

alter table public.profile_cosmetic_items_2026 enable row level security;
alter table public.profile_cosmetics_2026 enable row level security;
revoke all on public.profile_cosmetic_items_2026,public.profile_cosmetics_2026 from public,anon,authenticated;
grant all on public.profile_cosmetic_items_2026,public.profile_cosmetics_2026 to service_role;

-- ── 3. L'OBTENTION, TRANCHÉE PAR LE SERVEUR ─────────────────────────────────
-- La MÊME règle que le client affiche (`isCosmeticUnlocked2026`), mais c'est
-- CELLE-CI qui décide. Elle ne lit que des faits déjà écrits par d'autres
-- migrations : le registre d'XP (0119), les objets de saison possédés (0121),
-- les droits GRYD+ (0120), les collections achetées (0125). Aucune possession
-- n'est dupliquée ici, donc aucune ne peut diverger.
create function public.cosmetic_unlocked_2026(p_user_id uuid,p_item_id text)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare model public.profile_cosmetic_items_2026;
begin
  select * into model from public.profile_cosmetic_items_2026 where item_id=p_item_id;
  if not found or p_user_id is null then return false; end if;
  if model.obtain='level' then
    -- Un compte sans registre a 0 XP : les objets livrés (min_xp = 0) passent,
    -- les autres non. Aucune création de compte de progression n'est déclenchée
    -- par une lecture : équiper « Ivoire » ne doit pas écrire une ligne d'XP.
    return coalesce((select (ledger->>'totalXp')::integer from public.progress_accounts_2026 where user_id=p_user_id),0) >= model.min_xp;
  elsif model.obtain='season' then
    return exists(select 1 from public.season_reward_ownership_2026 where user_id=p_user_id and reward_id=model.season_reward_id);
  elsif model.obtain='collection' then
    return exists(select 1 from public.commercial_ownership_2026 where user_id=p_user_id and collection_id=model.collection_id and owned);
  else
    return public.has_gryd_plus_access_2026(p_user_id);
  end if;
end $$;

-- ÉQUIPER. `p_item_id` nul REMET l'objet livré avec le compte : c'est la seule
-- façon de « retirer » sans laisser un emplacement vide que rien ne nomme.
create function public.equip_cosmetic_2026(p_slot text,p_item_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare owner uuid:=auth.uid(); model public.profile_cosmetic_items_2026;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.users where id=owner and deletion_requested_at is null) then raise exception 'account_unavailable'; end if;
  if p_item_id is null then
    delete from public.profile_cosmetics_2026 where user_id=owner and slot=p_slot;
    return jsonb_build_object('slot',p_slot,'itemId',null,'equipped',false);
  end if;
  select * into model from public.profile_cosmetic_items_2026 where item_id=p_item_id;
  if not found or model.slot is distinct from p_slot then raise exception 'unknown_cosmetic'; end if;
  if not public.cosmetic_unlocked_2026(owner,p_item_id) then raise exception 'cosmetic_not_unlocked'; end if;
  insert into public.profile_cosmetics_2026(user_id,slot,item_id) values(owner,p_slot,p_item_id)
    on conflict(user_id,slot) do update set item_id=excluded.item_id,equipped_at=now();
  return jsonb_build_object('slot',p_slot,'itemId',p_item_id,'equipped',true);
end $$;

-- ── 4. LA LECTURE DE MON ÉQUIPEMENT ─────────────────────────────────────────
-- Un objet par emplacement, et RIEN d'autre : ni la liste des débloqués (le
-- client la dérive de faits qu'il lit déjà : niveau, objets de saison,
-- collections, GRYD+), ni un compteur, ni une date de fin. Ce que cette RPC ne
-- renvoie pas ne peut pas être peint faussement.
create function public.get_profile_cosmetics_2026()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(jsonb_object_agg(slot,item_id),'{}'::jsonb)
  from public.profile_cosmetics_2026 where user_id=auth.uid();
$$;

comment on function public.equip_cosmetic_2026(text,text) is
  'Équipe un cosmétique de profil. Le serveur RE-VÉRIFIE l''obtention '
  '(cosmetic_unlocked_2026) : un client modifié ne peut pas porter un objet '
  'qu''il n''a pas. `p_item_id` nul remet l''objet livré avec le compte.';
comment on table public.profile_cosmetics_2026 is
  'Ce que porte un joueur, un objet par emplacement. Aucune colonne n''entre '
  'dans un calcul de capture, d''XP ou de classement (anti pay-to-win, §16.2).';

revoke all on function public.cosmetic_unlocked_2026(uuid,text) from public,anon,authenticated;
grant execute on function public.cosmetic_unlocked_2026(uuid,text) to service_role;
revoke all on function public.equip_cosmetic_2026(text,text),public.get_profile_cosmetics_2026() from public,anon;
grant execute on function public.equip_cosmetic_2026(text,text),public.get_profile_cosmetics_2026() to authenticated;
