-- 0087_public_territories_respects_map_sharing.sql
-- GRYD — LE RÉGLAGE DE CARTE D'UN JOUEUR DEVIENT UNE PROTECTION SERVEUR
-- (constitution §7 « confidentialité géospatiale » ; spec produit §12.1 ; E56).
--
-- ═══ LA FAUTE QUE CETTE MIGRATION RÉPARE ════════════════════════════════════
-- `apps/mobile/src/features/social/rivalZones.ts` l'écrivait noir sur blanc
-- (« VÉRITÉ DÉSAGRÉABLE, ÉCRITE PLUTÔT QUE MAQUILLÉE ») :
--
--   « la vue `public_territories` (0077) NE CONSULTE PAS `map_sharing`. Le
--     filtre est donc une décision CLIENTE, pas une protection serveur : il
--     empêche GRYD d'afficher une carte que son propriétaire a refusé de
--     partager, il n'empêche pas un appel direct à l'API de la lire. »
--
-- Un filtre client ne protège personne : au moment où l'écran décide de ne pas
-- peindre, la donnée a DÉJÀ quitté le serveur — un `curl` avec le même jeton
-- l'obtient sans passer par l'app. Le joueur qui a coché « ne pas partager ma
-- carte » croyait pourtant avoir décidé quelque chose.
--
-- Cette migration déplace la décision là où elle vaut : dans le `where` de la
-- vue. Après elle, `map_sharing = 'none'` retire réellement les territoires de
-- la surface publique, pour TOUT lecteur, quel que soit son client.
--
-- ═══ POURQUOI UNE FONCTION `security definer`, ET PAS UNE JOINTURE ══════════
-- La jointure naïve — `join user_profiles up on up.user_id = t.owner_id` —
-- serait fausse DEUX FOIS :
--   1. la vue est `security_invoker` (0077) : la jointure subirait la RLS du
--      LECTEUR sur `user_profiles` (policy `user_profiles_select_visible`,
--      0011:201). Un joueur dont le profil est en `friends` verrait donc son
--      TERRITOIRE disparaître pour tout le monde — alors qu'il n'a jamais
--      demandé ça. La visibilité du PROFIL et le partage de la CARTE sont deux
--      réglages distincts (0011 : `profile_visibility` ≠ `map_sharing`), et
--      les confondre serait une seconde erreur de vie privée.
--   2. elle transformerait la vue en oracle : « ce territoire a disparu » se
--      lirait « son profil ne m'est pas visible ».
-- La fonction ci-dessous lit `user_profiles` avec les droits de son
-- PROPRIÉTAIRE. Elle n'en fait sortir qu'un BOOLÉEN, et uniquement celui-ci :
-- « ce propriétaire accepte-t-il que sa carte soit rendue publique ? ». Aucune
-- autre colonne du profil ne traverse cette frontière.
--
-- ═══ CE QU'ELLE RÉPOND QUAND IL N'Y A PAS DE PROFIL ═════════════════════════
-- Pas de ligne `user_profiles` ⇒ FAUX (masqué). C'est le repli PRUDENT, et il
-- est déjà celui du client : `rivalZonesRead.toMapSharing` traite toute valeur
-- inconnue comme un REFUS. Aucun écran ne régresse aujourd'hui — le seul
-- lecteur client de la vue (E15 `zones-rival`) exige d'abord une ligne
-- `user_profiles` et rend `no_profile` sans elle. La conséquence est inscrite
-- au §3 : le jour où la CARTE principale lira cette vue, créer la ligne de
-- profil à l'inscription devient un PRÉ-REQUIS, pas un détail d'onboarding.
--
-- ═══ AUCUN NOMBRE MAGIQUE, AUCUNE NOUVELLE RÈGLE DE JEU ═════════════════════
-- Le domaine de `map_sharing` (`precise | simplified | territory_only | none`)
-- est celui du CHECK de 0011 ; on ne le redéclare pas. Seule la valeur `none`
-- est traitée, parce qu'elle seule est un refus : la vue n'expose de toute
-- façon QUE la géométrie généralisée (0077), donc `precise`, `simplified` et
-- `territory_only` y sont satisfaits à l'identique.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LE PRÉDICAT DE CONSENTEMENT
-- ════════════════════════════════════════════════════════════════════════════
-- `stable` : même réponse pour la même ligne dans une même requête (Postgres
-- peut donc l'appeler une fois par propriétaire au lieu d'une fois par ligne).
-- `set search_path` : une fonction `security definer` sans search_path figé est
-- détournable par un `search_path` d'appelant qui masquerait `public`.
create or replace function public.territory_owner_shares_map(
  p_owner_type text,
  p_owner_id   uuid
) returns boolean
  language sql
  stable
  security definer
  set search_path = public, pg_temp
as $$
  select case
    -- Un territoire de CREW n'est gouverné par le réglage de personne : il
    -- n'appartient à aucun profil. (Aujourd'hui `ingest_run/territory.ts:207`
    -- écrit `owner_type = 'user'` en dur ; cette branche est l'avenir, pas une
    -- porte dérobée — elle ne peut rien rendre public qui soit personnel.)
    when p_owner_type is distinct from 'user' then true
    -- Sinon : il faut une ligne de profil ET un réglage qui ne soit pas un
    -- refus. `exists` plutôt qu'une lecture de colonne — on ne fait pas sortir
    -- la valeur du réglage, seulement le fait qu'elle autorise.
    else exists (
      select 1
      from public.user_profiles up
      where up.user_id = p_owner_id
        and up.map_sharing <> 'none'
    )
  end
$$;

comment on function public.territory_owner_shares_map(text, uuid) is
  'Le propriétaire d''un territoire accepte-t-il le rendu PUBLIC de sa carte (user_profiles.map_sharing <> ''none'') ? security definer : la réponse ne dépend pas de la visibilité du PROFIL pour le lecteur (deux réglages distincts, 0011). Ne fait sortir qu''un booléen. Absence de profil = FAUX (repli prudent, aligné sur le client).';

-- `security definer` + exécutable par tous serait un sondeur de réglages : on
-- referme, puis on n'accorde qu'à `authenticated` — le seul rôle qui peut lire
-- la vue (0077 §2). La vue étant `security_invoker`, c'est bien l'APPELANT qui
-- doit avoir ce droit d'exécution.
revoke all on function public.territory_owner_shares_map(text, uuid) from public, anon, authenticated;
grant execute on function public.territory_owner_shares_map(text, uuid) to authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 2. LA VUE, AVEC LE CONSENTEMENT DANS SON `where`
-- ════════════════════════════════════════════════════════════════════════════
-- `create or replace` : mêmes colonnes, mêmes types, même ordre — les
-- privilèges posés par 0077 survivent. Les options `security_invoker` et
-- `security_barrier` sont RE-DÉCLARÉES : les omettre ici les laisserait
-- tomber sur certaines versions, et une vue servie aux clients qui vaudrait
-- plus que son lecteur serait exactement le tunnel que 0077 refuse.
create or replace view public.public_territories
  with (security_invoker = true, security_barrier = true)
as
select
  t.id,
  t.activity,
  t.owner_type,
  t.owner_id,
  t.city_id,
  t.state,
  t.defense_level,
  t.area_m2,
  t.geometry_generalized,
  date_trunc('hour', t.controlled_since) as controlled_since_hour
from public.territories t
where
  -- §1.5 — publication différée (0077, inchangé).
  t.publish_after <= now()
  and t.geometry_generalized is not null
  -- §12.1 — LE RÉGLAGE DU PROPRIÉTAIRE, désormais opposable à tout lecteur.
  and public.territory_owner_shares_map(t.owner_type, t.owner_id);

comment on view public.public_territories is
  'RENDU PUBLIC d''un territoire (§12.1/§12.3). Ne contient QUE ce qui est publiable : géométrie GÉNÉRALISÉE (jamais le tracé exact), aucun source_run_id, controlled_since TRONQUÉ à l''heure, uniquement les lignes dont publish_after est échu (§1.5), et uniquement celles dont le propriétaire n''a pas refusé le partage de carte (map_sharing <> ''none'', 0087). security_invoker : la RLS du lecteur s''applique. C''est cette vue que les lectures client doivent viser, jamais public.territories.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. CE QUI N'EST PAS FAIT — NOMMÉ, PAS MAQUILLÉ
-- ════════════════════════════════════════════════════════════════════════════
-- 1. `map_sharing` N'EST PAS LU PAR LE CHEMIN GRILLE — mais ce chemin ne fuit
--    plus vers les tiers. RECTIFICATION DU 27/07/2026 : la première rédaction de
--    ce paragraphe affirmait que « `hex_claims_select_all` (0003:114) RESTE
--    `using (true)` ». C'ÉTAIT FAUX À LA DATE MÊME OÙ C'ÉTAIT ÉCRIT — 0079,
--    ANTÉRIEURE, fait `drop policy if exists hex_claims_select_all`
--    (0079:78) et la remplace par `hex_claims_select_own`
--    (0079:84-86, `using (owner_user_id = (select auth.uid()))`), plus
--    `revoke select on public.hex_claims from anon` (0079:98). Aucune migration
--    postérieure ne rouvre la table (seules 0003 et 0079 y posent une policy).
--    Les mentions identiques de 0074:364 et 0077:128 étaient vraies à LEUR date,
--    toutes deux antérieures à 0079 ; celle-ci ne l'était pas, et une doc fausse
--    dans une migration est un document permanent que les agents suivants
--    tiennent pour vrai (ici : « la grille fuit de toute façon », donc la vue
--    polygonale serait décorative — le contraire de la vérité).
--    ET LE VRAI TROU, QUE CETTE PHRASE FAUSSE CACHAIT : 0079 n'a pas fermé la
--    grille, elle a déplacé sa surface publique dans la vue
--    `public.public_hex_claims` (0079:152) — laquelle NE consultait PAS
--    `map_sharing`. Un joueur en refus disparaissait donc de la vue polygonale
--    (ci-dessus) et restait lisible cellule par cellule dans la vue grille : la
--    même carte, à la maille inférieure. C'est `0089` qui referme ce chemin-là,
--    avec la MÊME fonction de consentement. Rien ne change pour le
--    propriétaire : la vue grille exclut déjà ses propres cellules, qu'il lit
--    dans la table — un réglage de PARTAGE ne s'applique pas à soi-même.
--    CE QUI RESTE, ET QUI EST CÔTÉ CLIENT : basculer les lectures de carte de
--    `hex_claims` vers `public_territories` / `public_hex_claims`, sans quoi la
--    carte d'un joueur ne montrera que ses propres zones.
-- 2. LE PROFIL DEVIENT UN PRÉ-REQUIS DU RENDU PUBLIC. Sans ligne
--    `user_profiles`, un territoire ne sort plus de cette vue. Aucun écran ne
--    régresse aujourd'hui (le seul lecteur, E15, exige déjà le profil), mais le
--    jour où la carte principale lira la vue, l'inscription DEVRA créer la
--    ligne de profil. C'est une dette d'onboarding, elle est ici nommée.
-- 3. PGlite NE PROUVE PAS L'EFFET DE LA RLS (superutilisateur). Le test associé
--    prouve ce qui est role-indépendant : le `where` de la vue filtre bien selon
--    `map_sharing`, la fonction est `security definer` et ses privilèges sont
--    ceux annoncés. Qu'un rival soit RÉELLEMENT aveugle ne se constate que sur
--    un vrai Supabase.
-- 4. `activity_sharing` et `discreet_mode` (0011) ne sont PAS lus ici. Ils
--    gouvernent l'activité et la présence, pas le rendu d'un territoire ; les
--    empiler dans ce prédicat mélangerait trois réglages que le joueur a réglés
--    séparément.
