-- 0111_purge_territories_with_account.sql
-- GRYD — Un compte supprimé n'abandonne plus ses territoires derrière lui.
--
-- ═══ LE TROU, ET POURQUOI C'EST UNE OBLIGATION, PAS UNE OPTION ═════════════
-- `purge_due_accounts()` (0046) supprime `auth.users` et compte sur les
-- CASCADES : tout ce qui porte une clé étrangère vers `public.users(id)` part
-- avec (runs, hex_claims, season_scores, crew_members…).
--
-- `territories.owner_id` n'en porte PAS : il est POLYMORPHE (un joueur OU un
-- crew), donc aucune clé étrangère n'est possible et aucune cascade ne
-- l'atteint. Depuis `0074`, un compte purgé laissait donc derrière lui des
-- lignes qui associent une PERSONNE à un POLYGONE et à des DATES — c'est-à-dire
-- une donnée personnelle, conservée après l'exercice d'un droit à l'effacement.
--
-- La question n'est pas « a-t-on le droit de supprimer » mais « a-t-on le droit
-- de garder ». RGPD art. 17 : à la demande, la donnée doit être effacée.
-- ⚠️ Ce raisonnement n'est pas un avis juridique : `GRYD_LEGAL_A_COMPLETER.md`
-- exige une relecture par un juriste avant mise en ligne, et elle reste due.
--
-- ═══ SUPPRIMER PLUTÔT QU'ANONYMISER, ET POURQUOI ÇA NE COÛTE RIEN AU JEU ═══
-- L'autre option était de relâcher le territoire (`owner_id = null`, état
-- `unowned`) : la donnée cesse d'être personnelle, le polygone reste.
--
-- Elle a été écartée pour deux raisons, dans cet ordre :
--   1. UN TERRITOIRE `unowned` N'EST PAS PEINT. `territoriesSource.ts` est
--      explicite — « le neutre n'existe pas : c'est la basemap ». Relâcher et
--      supprimer ont donc EXACTEMENT le même effet visible : aucun. Le coût de
--      jeu supposé de la suppression n'existe pas.
--   2. UN POLYGONE RESTE DÉRIVÉ D'UNE COURSE. Une boucle de quelques centaines
--      de mètres, en zone peu dense, peut désigner une personne et un lieu —
--      c'est précisément la leçon Strava que `0104`/`0105` ont traitée pour la
--      publication. Garder la géométrie obligerait à re-justifier son anonymat
--      cas par cas. La supprimer clôt la question.
--
-- ═══ CE QUE LES CASCADES EMPORTENT AVEC, ET C'EST VOULU ════════════════════
--   · `territory_contests` (0078) — une contestation EN COURS sur ce territoire
--     disparaît. C'est le bon résultat : il n'y a plus rien à prendre.
--     L'attaquant ne perd aucun acquis, exactement comme si le territoire avait
--     décliné tout seul.
--   · `territory_reigns` (0109) — l'histoire ATTACHÉE à ce territoire.
--
-- ⚠️ LA SUPPRESSION EXPLICITE DE `territory_reigns` (0109 §4) RESTE
-- INDISPENSABLE et n'est pas redondante avec cette migration : elle couvre les
-- règnes du joueur sur des territoires qui appartiennent AUJOURD'HUI À
-- QUELQU'UN D'AUTRE. Anne a tenu un quartier, Bruno le lui a pris : le
-- territoire est à Bruno, il n'est donc pas supprimé ici — mais le règne d'Anne
-- doit disparaître. Les deux mécanismes couvrent deux ensembles différents.
--
-- ═══ COHÉRENCE GAGNÉE AU PASSAGE ═══════════════════════════════════════════
-- `hex_claims` cascade DÉJÀ depuis `users` (0002). Après une purge, les
-- territoires du compte étaient donc des polygones sans les claims dont ils
-- dérivent. Cette migration supprime aussi cette incohérence.
--
-- ADDITIVE : aucune table, aucune colonne. La fonction est remplacée.
-- Rollback = restaurer la définition de 0109 §4.

create or replace function public.purge_due_accounts()
returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  v_purged integer;
begin
  -- Les comptes échus, calculés UNE fois et réutilisés : recalculer entre les
  -- étapes laisserait passer un compte devenu échu entre-temps, dont on
  -- effacerait le compte sans effacer ses traces.
  create temporary table if not exists _gryd_due_accounts (id uuid primary key)
    on commit drop;
  delete from _gryd_due_accounts;

  insert into _gryd_due_accounts (id)
  select id from public.users
   where deletion_requested_at is not null
     and deletion_requested_at
         + make_interval(days => public.account_deletion_grace_days()) <= now();

  -- 1. L'HISTOIRE du joueur, y compris sur des territoires devenus ceux d'un
  --    AUTRE (le §2 ne les atteindrait pas). Avant le §2, qui la ferait
  --    disparaître par cascade sans qu'on sache si elle a bien été traitée.
  delete from public.territory_reigns tr
   using _gryd_due_accounts d
   where tr.owner_type = 'user' and tr.owner_id = d.id;

  -- 2. LES TERRITOIRES du joueur. `owner_id` est polymorphe, donc aucune
  --    cascade ne les atteint : la suppression est explicite. Emporte par
  --    cascade les contestations en cours (0078) et les règnes attachés (0109).
  delete from public.territories t
   using _gryd_due_accounts d
   where t.owner_type = 'user' and t.owner_id = d.id;

  -- 3. Le compte lui-même : `auth.users` suffit pour TOUT le graphe qui porte
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
  'Efface AUSSI territory_reigns (0109) et territories (0111) : owner_id y est '
  'POLYMORPHE, donc aucune cascade ne les atteint. Un territoire unowned n etant '
  'pas peint, la suppression n a aucun effet visible de moins que le relachement.';

revoke all on function public.purge_due_accounts() from public, anon, authenticated;
grant execute on function public.purge_due_accounts() to service_role;
