-- 0109_territory_reigns.sql
-- GRYD — « Ce quartier était à toi de mars à septembre. »
--
-- ═══ CE QUE GRYD OUBLIAIT ═══════════════════════════════════════════════════
-- AUCUNE table n'historisait la propriété. Quand `resolve_due_contests` (0080)
-- réécrit `territories.owner_id`, l'ancien propriétaire cesse simplement
-- d'exister dans les données : il n'y a plus trace qu'il a tenu ce sol. C'est
-- pourquoi « tu as perdu N zones » est déclaré INTENABLE dans E66 — on ne peut
-- même pas écrire « 0 perte » sans mentir.
--
-- Un jeu de territoire dont la promesse est la DURÉE oubliait donc exactement
-- ce qui fait sa valeur. Ce registre est cette mémoire.
--
-- ═══ POURQUOI C'EST LA SEULE CHOSE VRAIMENT VENDABLE DU CATALOGUE ══════════
-- Le joueur produit sa distance, ses zones, sa durée de contrôle : lui vendre
-- l'accès à ça serait extractif. Ici, GRYD ne restitue pas un fait du joueur —
-- il FABRIQUE et CONSERVE une mémoire qui, sans lui, n'existerait nulle part.
-- C'est de l'interprétation, pas de la restitution (capacité `ownership_history`,
-- palier `plus`).
--
-- ═══ UN TRIGGER, PAS DES APPELANTS INSTRUMENTÉS ════════════════════════════
-- La propriété change aujourd'hui à DEUX endroits (`ingest_run` crée un
-- territoire ; `resolve_due_contests` en change le propriétaire), et rien ne
-- garantit qu'il n'y en aura pas un troisième. Une histoire écrite par les
-- appelants finit TOUJOURS par avoir un trou, et un trou dans une mémoire est
-- pire que pas de mémoire — il se lit comme une absence de règne.
--
-- Le registre est donc tenu par un TRIGGER sur `territories` : quel que soit
-- l'auteur de l'écriture, le règne est ouvert et fermé. C'est la même doctrine
-- que la vie privée du dépôt — la règle s'applique LÀ OÙ LA DONNÉE EST ÉCRITE.
--
-- ═══ L'HISTOIRE COMMENCE AUJOURD'HUI, ET NE REMONTE PAS ════════════════════
-- ⚠️ AUCUN BACKFILL, et c'est un choix, pas un oubli. Reconstruire des règnes
-- passés depuis `territories.controlled_since` inventerait des dates de FIN qui
-- n'ont jamais été enregistrées, et attribuerait à des joueurs des périodes
-- devinées. Le registre part donc VIDE : tout écran qui le lit doit dire « depuis
-- le … » et jamais laisser croire qu'il connaît l'avant. La base ne contient
-- aujourd'hui aucun territoire — le coût réel de ce choix est nul.
--
-- ═══ VIE PRIVÉE : PLUS STRICT QUE LE PRÉSENT, PAS MOINS ════════════════════
-- Une HISTOIRE est plus sensible qu'un état courant : elle dessine une habitude,
-- un lieu, des horaires, sur la durée. La leçon Strava de `0104` vaut donc ici
-- au carré. Ce registre n'est JAMAIS public :
--   · aucune vue publique ne l'expose, et il n'entre dans aucun classement ;
--   · la RLS limite la lecture au PROPRIÉTAIRE (et aux membres actifs du crew
--     pour un règne de crew) ;
--   · aucune écriture cliente : `service_role` seul, via le trigger ;
--   · le règne DISPARAÎT avec le compte — voir §4 ci-dessous, et lire la suite :
--     ce n'est PAS automatique.
-- Cohérent avec §12 / E66 : « le Premium aide à comprendre SON PROPRE
-- territoire, pas à espionner ».
--
-- ⚠️ CE QUE `purge_due_accounts()` (0046) NE FAIT PAS, ET QU'ON A VÉRIFIÉ ────
-- Cette purge supprime `auth.users` et compte sur les CASCADES : tout ce qui
-- référence `public.users(id)` part avec (runs, hex_claims, season_scores…).
-- Or `owner_id` est ici POLYMORPHE (un joueur OU un crew) : il ne peut pas
-- porter de clé étrangère, donc AUCUNE cascade ne l'atteint. Sans le §4, ce
-- registre survivrait à la suppression du compte — une mémoire de lieux et de
-- dates, conservée après un droit à l'effacement exercé. §4 le supprime
-- explicitement.
--
-- ⚠️ TROU PRÉEXISTANT, NON CORRIGÉ ICI, ET DÉCLARÉ PLUTÔT QUE MASQUÉ ────────
-- `territories.owner_id` a EXACTEMENT le même problème, depuis 0074 : il est
-- polymorphe, sans clé étrangère, et rien ne supprime de territoire nulle part.
-- Un compte purgé laisse donc ses lignes `territories` derrière lui. Ce n'est
-- pas corrigé par cette migration parce que supprimer un territoire A DES
-- CONSÉQUENCES DE JEU (il disparaît de la carte de tout le monde, et la
-- contestation en cours perd son objet) : c'est un arbitrage produit, pas une
-- correction technique à glisser dans un chantier d'historique. Il est inscrit
-- ici pour être traité, pas pour être oublié.
--
-- ADDITIVE : une table, un trigger. Aucune colonne existante touchée, aucune
-- ligne réécrite. Rollback = drop du trigger puis de la table.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. Le registre
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.territory_reigns (
  id            uuid primary key default gen_random_uuid(),
  -- `on delete cascade` : si le territoire disparaît, son histoire aussi. Rien
  -- ne supprime de territoire aujourd'hui ; la cascade est la position sûre si
  -- ça change (une histoire orpheline ne peut plus être située sur une carte).
  territory_id  uuid not null references public.territories (id) on delete cascade,
  owner_type    text not null
    constraint territory_reigns_owner_type_check check (owner_type in ('user', 'crew')),
  owner_id      uuid not null,
  -- Discipline FIGÉE à l'ouverture : un règne appartient à un monde (§0070).
  activity      text not null
    constraint territory_reigns_activity_check check (activity in ('run', 'bike')),
  -- Dénormalisés À L'OUVERTURE, volontairement : ils décrivent le règne TEL
  -- QU'IL A ÉTÉ. Les relire sur `territories` donnerait l'état d'AUJOURD'HUI et
  -- réécrirait le passé à chaque changement — une mémoire qui bouge n'est pas
  -- une mémoire.
  city_id       text,
  area_m2       double precision not null
    constraint territory_reigns_area_positive check (area_m2 > 0),
  started_at    timestamptz not null default now(),
  -- `null` = règne EN COURS. C'est la seule valeur qui signifie « maintenant ».
  ended_at      timestamptz
    constraint territory_reigns_order check (ended_at is null or ended_at >= started_at),
  -- Pourquoi le règne s'est terminé. `null` tant qu'il dure.
  --   'lost'    — un autre propriétaire a pris la main (contestation résolue) ;
  --   'released'— le territoire n'a plus de propriétaire du tout.
  ended_reason  text
    constraint territory_reigns_reason_check check (
      (ended_at is null and ended_reason is null)
      or (ended_at is not null and ended_reason in ('lost', 'released'))
    )
);

-- Un seul règne EN COURS par territoire : l'invariant du registre. Sans lui,
-- deux règnes ouverts se liraient « deux propriétaires en même temps ».
create unique index if not exists territory_reigns_one_open_per_territory
  on public.territory_reigns (territory_id) where ended_at is null;

-- « Mon histoire », la lecture du produit : par propriétaire, la plus récente
-- d'abord, bornée à une discipline.
create index if not exists territory_reigns_owner_idx
  on public.territory_reigns (owner_id, activity, started_at desc);

comment on table public.territory_reigns is
  'Registre APPEND-ONLY des regnes territoriaux (qui a tenu quoi, de quand a quand). Tenu par trigger sur territories — jamais par les appelants. JAMAIS public : une histoire est plus sensible qu un etat courant.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. Le trigger : ouvrir et fermer les règnes
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.gryd_track_territory_reign()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_changed boolean;
begin
  if tg_op = 'INSERT' then
    if new.owner_id is not null and new.owner_type is not null then
      insert into public.territory_reigns
        (territory_id, owner_type, owner_id, activity, city_id, area_m2, started_at)
      values
        (new.id, new.owner_type, new.owner_id, new.activity, new.city_id, new.area_m2,
         coalesce(new.controlled_since, now()));
    end if;
    return null;
  end if;

  -- UPDATE : on ne réagit QU'À un changement de propriétaire. Une défense, un
  -- passage en contesté, un recalcul d'aire ne terminent aucun règne — le
  -- propriétaire n'a pas changé, donc il tient toujours.
  v_owner_changed :=
    new.owner_id is distinct from old.owner_id
    or new.owner_type is distinct from old.owner_type;

  if not v_owner_changed then
    return null;
  end if;

  -- Fermer le règne en cours, s'il y en a un.
  update public.territory_reigns
     set ended_at = now(),
         ended_reason = case when new.owner_id is null then 'released' else 'lost' end
   where territory_id = new.id
     and ended_at is null;

  -- Ouvrir le suivant, si le territoire a bien un nouveau propriétaire.
  if new.owner_id is not null and new.owner_type is not null then
    insert into public.territory_reigns
      (territory_id, owner_type, owner_id, activity, city_id, area_m2, started_at)
    values
      (new.id, new.owner_type, new.owner_id, new.activity, new.city_id, new.area_m2, now());
  end if;

  return null;
end;
$$;

comment on function public.gryd_track_territory_reign() is
  'Tient territory_reigns a jour depuis territories. AFTER trigger : il ne peut pas faire echouer une capture — perdre une ligne d historique ne doit jamais couter un territoire au joueur.';

-- AFTER, jamais BEFORE : ce registre est un CONFORT. S'il échouait pendant un
-- BEFORE, il annulerait la capture elle-même — un joueur perdrait du territoire
-- réel à cause d'une ligne d'historique. Même doctrine que `tracePersist`.
drop trigger if exists territories_track_reign on public.territories;
create trigger territories_track_reign
  after insert or update of owner_id, owner_type on public.territories
  for each row execute function public.gryd_track_territory_reign();

-- ════════════════════════════════════════════════════════════════════════════
-- 3. RLS — une histoire ne se lit que par celui qui l'a vécue
-- ════════════════════════════════════════════════════════════════════════════
alter table public.territory_reigns enable row level security;

-- Écriture client INTERDITE : la table est tenue par le trigger (security
-- definer), et par lui seul. Aucune policy d'insert/update/delete n'existe —
-- l'absence de policy est le refus.
revoke all on public.territory_reigns from anon, authenticated;
grant select on public.territory_reigns to authenticated;

drop policy if exists territory_reigns_select_own on public.territory_reigns;
create policy territory_reigns_select_own on public.territory_reigns
  for select to authenticated
  using (
    -- Mon propre règne.
    (owner_type = 'user' and owner_id = auth.uid())
    -- Ou un règne de MON crew, et seulement tant que j'en suis membre ACTIF :
    -- quitter un crew referme l'accès à son histoire.
    or (
      owner_type = 'crew'
      and exists (
        select 1 from public.crew_members cm
        where cm.crew_id = territory_reigns.owner_id
          and cm.user_id = auth.uid()
          and cm.left_at is null
      )
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- 4. Le registre disparaît avec le compte (droit à l'effacement)
-- ════════════════════════════════════════════════════════════════════════════
-- `owner_id` étant polymorphe, aucune cascade ne l'atteint : la suppression est
-- donc EXPLICITE, dans la même transaction que la purge. Sans ça, exercer son
-- droit à l'effacement laisserait derrière soi une carte de ses habitudes.
--
-- La fonction est recréée à l'identique de 0046, avec UNE étape ajoutée AVANT
-- la suppression des comptes — l'ordre compte : après, on ne saurait plus quels
-- identifiants purger.
create or replace function public.purge_due_accounts()
returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  v_purged integer;
begin
  -- Les comptes échus, calculés UNE fois et réutilisés : recalculer entre les
  -- deux étapes laisserait passer un compte devenu échu entre-temps, dont on
  -- effacerait le compte sans effacer l'historique.
  create temporary table if not exists _gryd_due_accounts (id uuid primary key)
    on commit drop;
  delete from _gryd_due_accounts;

  insert into _gryd_due_accounts (id)
  select id from public.users
   where deletion_requested_at is not null
     and deletion_requested_at
         + make_interval(days => public.account_deletion_grace_days()) <= now();

  -- 1. L'HISTOIRE POLYMORPHE, qu'aucune cascade n'atteint (0109).
  delete from public.territory_reigns tr
   using _gryd_due_accounts d
   where tr.owner_type = 'user' and tr.owner_id = d.id;

  -- 2. Le compte lui-même : `auth.users` suffit pour TOUT le graphe qui porte
  --    une clé étrangère vers `public.users(id)` (runs, hex_claims, …).
  with gone as (
    delete from auth.users a using _gryd_due_accounts d where a.id = d.id returning a.id
  )
  select count(*)::integer into v_purged from gone;

  return v_purged;
end $$;

comment on function public.purge_due_accounts() is
  'Purge REELLE et irreversible des comptes dont le delai de grace est echu. '
  'Ordonnancee par le cron gryd_purge_accounts (quotidien 03:40 UTC). '
  'Depuis 0109, efface AUSSI territory_reigns : owner_id y est polymorphe, donc '
  'aucune cascade ne l atteint. NOTE : territories.owner_id a le meme defaut et '
  'n est PAS traite ici (arbitrage produit, cf. en-tete de 0109).';

revoke all on function public.purge_due_accounts() from public, anon, authenticated;
grant execute on function public.purge_due_accounts() to service_role;
