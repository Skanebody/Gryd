-- ════════════════════════════════════════════════════════════════════════════
-- 0191 — LES OBJETS DE PARRAINAGE ENTRENT DANS LE CATALOGUE COSMÉTIQUE
-- ════════════════════════════════════════════════════════════════════════════
--
-- ─── LE DÉFAUT QUE CETTE MIGRATION RÉPARE ───────────────────────────────────
-- 0186 octroie quatre objets EXCLUSIFS dans `referral_grants_2026` et le dit
-- lui-même, en tête de fichier : « ⚠️ À LA FUSION : ces quatre `reward_id`
-- doivent être ajoutés au catalogue cosmétique ». Ils ne l'ont jamais été.
-- Résultat mesurable AVANT ce fichier :
--
--   select public.equip_cosmetic_2026('avatarFrame','referral_frame');
--   → ERROR: unknown_cosmetic
--
-- et ce refus tombait même sur quelqu'un qui portait la ligne d'octroi dans
-- `referral_grants_2026`. Le parrainage promettait donc un objet que le serveur
-- ne savait pas poser sur un profil : `/parrainage` le NOMMAIT et disait « leur
-- dessin arrive » — une promesse au-delà du code, tenue par personne.
--
-- ─── CE QUE CE FICHIER AJOUTE, ET CE QU'IL NE TOUCHE PAS ────────────────────
--  1. Une CINQUIÈME origine d'obtention, `referral`, dans l'instantané gelé de
--     0180. Elle est GRATUITE (elle se gagne en parrainant) et n'est vendue
--     nulle part : aucun SKU, aucun palier de niveau, aucune saison.
--  2. DEUX objets — `referral_frame` (avatarFrame) et `referral_trace` (trace).
--     Ce sont les deux seuls `referral_reward_templates_2026` dont le `slot`
--     est un emplacement cosmétique. Les DEUX AUTRES sont des TITRES
--     (`referral_title_parrain`, `referral_title_filleul`, slot `title`) et
--     restent hors de ce catalogue : voir la note « LES DEUX TITRES » ci-après.
--  3. La branche `referral` de `cosmetic_unlocked_2026`, le juge unique de
--     l'obtention (0180 §3). `equip_cosmetic_2026` N'EST PAS RÉÉCRITE : elle
--     appelle ce juge et rien d'autre, donc recopier son corps ici n'aurait
--     ajouté aucune règle et aurait créé une seconde version d'un texte qui
--     doit rester unique. Toutes les autres branches sont reprises MOT POUR
--     MOT de 0180.
--  4. Le retrait automatique d'un objet dont l'octroi est RÉVOQUÉ.
--
-- ─── POURQUOI LA RÉVOCATION DÉSÉQUIPE, ALORS QUE §7.5 DIT « PERMANENT » ─────
-- §7.5 protège un objet GAGNÉ. Une révocation de parrainage dit exactement le
-- contraire : la sortie qui l'avait mérité n'était pas honnête (`rejected` /
-- `flagged`, ou l'évidence regelée par l'anti-triche, 0186/0187). 0186 ferme
-- déjà toutes les autres portes — `my_referral_2026` filtre `revoked_at is
-- null`, le boost s'éteint, le crédit GRYD+ est révoqué. SANS le déclencheur
-- ci-dessous, un seul reste ouvert : le cadre resterait PEINT sur le profil,
-- et sur celui que les autres voient (0181). L'app dirait alors « cette
-- personne a parrainé » d'un octroi annulé. Le déclencheur ne retire QUE ce que
-- plus AUCUN octroi vivant ne justifie : deux parrainages aboutis donnent deux
-- lignes pour le même objet, en révoquer une n'enlève rien.
--
-- ─── LES DEUX TITRES, ET POURQUOI ILS N'ENTRENT PAS ICI ─────────────────────
-- `referral_title_parrain` et `referral_title_filleul` sont des TITRES : des
-- MOTS affichés sous le nom. Le dépôt a deux maisons de titres, et les deux
-- les refusent structurellement, sans réécriture lourde :
--  · 0121 (saison) — `season_reward_ownership_2026.collection_id` est une clé
--    étrangère vers `season_collections_2026`, une saison PUBLIÉE. Aucune n'est
--    publiée en production ; en fabriquer une pour y ranger deux titres
--    inventerait un calendrier de jeu (zéro donnée factice).
--  · 0144 (niveau) — `level_reward_templates_2026.level` et `min_xp` sont
--    UNIQUE, et l'instantané est confronté à `xpForLevel2026` par le test SQL.
--    Y ranger un titre de parrainage obligerait à lui inventer un niveau et un
--    seuil d'XP qu'il n'a pas.
-- Le troisième chemin — les faire passer pour des `titleBadge` — serait pire :
-- `titleBadge` est la TYPOGRAPHIE du titre équipé (0180, famille (g)), pas un
-- titre. Équiper « Titre Parrain » n'afficherait alors aucun mot tant qu'aucun
-- titre de saison ou de niveau n'est équipé, et écraserait le libellé du titre
-- gagné dans le cas contraire. Un bouton qui ne fait rien, ou qui efface autre
-- chose, n'est pas une récompense.
-- Les deux titres restent donc EXACTEMENT ce qu'ils sont : deux lignes
-- d'octroi dans `referral_grants_2026`, lues par `my_referral_2026`, nommées
-- sur `/parrainage`, et NON PORTABLES tant qu'une maison de titres sait les
-- porter. L'écran le dit, au lieu de peindre un objet qui ne se pose nulle part.
--
-- ─── ANTI PAY-TO-WIN ────────────────────────────────────────────────────────
-- Aucune colonne de ce fichier n'entre dans un calcul de capture, d'XP, de
-- points de défi ou de classement. Ces deux objets se GAGNENT (un parrainage
-- abouti), ne se vendent nulle part, et changent ce qu'on MONTRE.
--
-- Requiert : 0180 (le catalogue cosmétique), 0186 (les octrois de parrainage).

-- ── 1. UNE CINQUIÈME ORIGINE D'OBTENTION ────────────────────────────────────
-- Les deux contraintes de 0180 sont retirées PAR LEUR NOM (noms générés par
-- Postgres et vérifiés dans `referral_cosmetics_2026.pglite.test.mjs`), puis
-- reposées élargies. Une contrainte remplacée, jamais une migration réécrite.
alter table public.profile_cosmetic_items_2026
  drop constraint profile_cosmetic_items_2026_obtain_check,
  drop constraint profile_cosmetic_items_2026_check;

alter table public.profile_cosmetic_items_2026
  add constraint profile_cosmetic_items_2026_obtain_check
    check(obtain in ('level','season','gryd_plus','collection','referral')),
  -- Même règle qu'en 0180 : UNE origine, UNE seule condition. `referral` ne
  -- porte aucune des quatre colonnes de condition — la sienne est une LIGNE
  -- ailleurs (`referral_grants_2026`), pas un seuil écrit ici.
  add constraint profile_cosmetic_items_2026_check check(
    (obtain='level' and min_level is not null and min_xp is not null and season_reward_id is null and collection_id is null)
    or (obtain='season' and season_reward_id is not null and min_level is null and min_xp is null and collection_id is null)
    or (obtain='gryd_plus' and min_level is null and min_xp is null and season_reward_id is null and collection_id is null)
    or (obtain='collection' and collection_id is not null and min_level is null and min_xp is null and season_reward_id is null)
    or (obtain='referral' and min_level is null and min_xp is null and season_reward_id is null and collection_id is null)
  );

-- ── 2. LES DEUX OBJETS ──────────────────────────────────────────────────────
-- Les identifiants sont ceux de `referral_reward_templates_2026` (0186), qui
-- sont eux-mêmes ceux de `REFERRAL_REWARDS_2026` (game-rules §3.7). Trois
-- copies, un seul mot : le bloc de garde ci-dessous refuse la dérive.
insert into public.profile_cosmetic_items_2026(item_id,slot,obtain,min_level,min_xp,season_reward_id,collection_id) values
  ('referral_frame','avatarFrame','referral',null,null,null,null),
  ('referral_trace','trace','referral',null,null,null,null);

-- Le jour où 0186 octroiera un troisième objet dont le `slot` est un
-- emplacement cosmétique, cette migration-ci ne suffira plus — et le déploiement
-- s'arrêtera ici plutôt que de livrer un objet promis que rien ne sait poser.
do $$
declare manquant text;
begin
  select string_agg(t.reward_id,',') into manquant
    from public.referral_reward_templates_2026 t
   where t.slot in (select slot from public.profile_cosmetic_items_2026 group by slot)
     and not exists(select 1 from public.profile_cosmetic_items_2026 i
                     where i.item_id=t.reward_id and i.slot=t.slot and i.obtain='referral');
  if manquant is not null then raise exception 'referral_rewards_without_cosmetic: %',manquant; end if;
end $$;

-- ── 3. L'OBTENTION, TRANCHÉE PAR LE SERVEUR ─────────────────────────────────
-- Corps de 0180 §3, à l'identique, plus UNE branche. Les quatre autres ne sont
-- pas réécrites : elles sont recopiées ligne pour ligne.
create or replace function public.cosmetic_unlocked_2026(p_user_id uuid,p_item_id text)
returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare model public.profile_cosmetic_items_2026;
begin
  select * into model from public.profile_cosmetic_items_2026 where item_id=p_item_id;
  if not found or p_user_id is null then return false; end if;
  if model.obtain='level' then
    return coalesce((select (ledger->>'totalXp')::integer from public.progress_accounts_2026 where user_id=p_user_id),0) >= model.min_xp;
  elsif model.obtain='season' then
    return exists(select 1 from public.season_reward_ownership_2026 where user_id=p_user_id and reward_id=model.season_reward_id);
  elsif model.obtain='collection' then
    return exists(select 1 from public.commercial_ownership_2026 where user_id=p_user_id and collection_id=model.collection_id and owned);
  elsif model.obtain='referral' then
    -- LA SEULE PORTE : une ligne d'octroi VIVANTE, écrite par
    -- `referral_try_complete_2026` (0186) et par personne d'autre. Le client
    -- n'a aucun droit sur `referral_grants_2026` (0186 le révoque à `anon` et
    -- `authenticated`) : il ne peut donc pas s'en fabriquer une.
    -- `kind='collection'` isole la collection exclusive du boost d'XP et du
    -- crédit GRYD+, qui sont des octrois du même journal et ne s'équipent pas.
    return exists(select 1 from public.referral_grants_2026
                   where user_id=p_user_id and kind='collection'
                     and reward_id=p_item_id and revoked_at is null);
  else
    return public.has_gryd_plus_access_2026(p_user_id);
  end if;
end $$;

-- ── 4. UN OCTROI RÉVOQUÉ CESSE D'ÊTRE PORTÉ ─────────────────────────────────
create function public.referral_cosmetic_revoked_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  -- Un AUTRE parrainage abouti peut justifier le même objet : on ne retire que
  -- ce que plus rien ne justifie.
  if exists(select 1 from public.referral_grants_2026
             where user_id=new.user_id and kind='collection'
               and reward_id=new.reward_id and revoked_at is null) then
    return null;
  end if;
  -- L'emplacement redevient VIDE, donc l'objet livré avec le compte
  -- (`defaultCosmetic2026`) : c'est le même état que « retirer », celui que le
  -- client sait déjà peindre. Aucun état « rien » n'est inventé.
  delete from public.profile_cosmetics_2026
   where user_id=new.user_id and item_id=new.reward_id;
  return null;
end $$;

create trigger referral_cosmetic_revoked_2026
  after update of revoked_at on public.referral_grants_2026
  for each row when (new.revoked_at is not null and old.revoked_at is null and new.kind='collection')
  execute function public.referral_cosmetic_revoked_2026();

-- ── 5. LES DROITS N'ONT PAS BOUGÉ ───────────────────────────────────────────
-- `create or replace` conserve les privilèges existants ; on les REDIT quand
-- même, parce qu'un droit qu'on croit acquis est un droit que personne ne
-- vérifie. La nouvelle fonction de déclencheur n'est appelée par personne
-- d'autre que Postgres : elle n'est exposée à aucun rôle client.
revoke all on function public.cosmetic_unlocked_2026(uuid,text),
  public.referral_cosmetic_revoked_2026() from public,anon,authenticated;
grant execute on function public.cosmetic_unlocked_2026(uuid,text) to service_role;

comment on function public.cosmetic_unlocked_2026(uuid,text) is
  'Le juge UNIQUE de l''obtention d''un cosmétique de profil. Cinq origines : '
  'niveau (0119), saison (0121), GRYD+ (0120), collection permanente (0125), '
  'parrainage (0186, octroi vivant seulement). `equip_cosmetic_2026` ne '
  'décide rien : elle appelle cette fonction.';
comment on function public.referral_cosmetic_revoked_2026() is
  'Un octroi de parrainage révoqué (sortie rejetée, gelée par l''anti-triche) '
  'cesse d''être PORTÉ. Retire l''objet de `profile_cosmetics_2026` seulement '
  'si plus aucun octroi vivant ne le justifie ; l''emplacement revient à '
  'l''objet livré avec le compte.';
