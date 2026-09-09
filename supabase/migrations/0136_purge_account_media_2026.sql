-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — LA PURGE DE COMPTE EMPORTE AUSSI LES MÉDIAS (RGPD art. 17).
--
-- LE DÉFAUT CORRIGÉ : `purge_due_accounts()` (0046) supprime `auth.users` et
-- s'en remet aux CASCADES. Elles couvrent tout ce qui référence
-- `public.users(id)` — donc la quasi-totalité des tables `*_2026`. Mais
-- `storage.objects` ne référence RIEN : les photos de profil et les images de
-- publication déposées dans le bucket `social-2026` (0124) survivaient à la
-- purge. Un visage, dans un bucket, après un droit à l'effacement exercé.
-- Le chemin de ces objets commence par l'UUID du compte (contrainte de la
-- policy `social_media_insert_2026`), c'est donc un préfixe exact — aucune
-- heuristique, aucun risque d'emporter le média d'un autre.
--
-- ⚠️ CE QUE CETTE MIGRATION NE FAIT PAS, ET QU'IL FAUT SAVOIR :
-- supprimer la ligne `storage.objects` retire l'objet de l'API Storage, de
-- toutes les policies et de tout listing — plus personne, jamais, ne peut le
-- lire ni même savoir qu'il a existé. Le BLOB sous-jacent, lui, relève du
-- nettoyage du service de stockage : ce n'est pas atteignable depuis SQL, et on
-- ne prétend donc pas ici l'avoir effacé du disque.
--
-- ⚠️ CE QUI SURVIT DÉ-IDENTIFIÉ, ET POURQUOI C'EST UN CHOIX ASSUMÉ :
--   · `capture_events_2026` (0118:76-77) a `run_id` et `owner_id` en
--     `on delete set null`. La GÉOMÉTRIE de la capture reste donc en base après
--     la suppression du compte, sans propriétaire. C'est la lignée
--     territoriale : chaque capture explique qui a pris quoi à qui, et
--     l'effacer réécrirait l'histoire des territoires de joueurs ENCORE
--     inscrits. On ne change pas cette cascade ici (ce serait un arbitrage de
--     jeu, pas un correctif technique) — on l'ÉCRIT dans la politique de
--     confidentialité, in-app et sur le web, pour qu'elle soit déclarée plutôt
--     que subie.
--   · `challenge_roster_2026.user_id` est aussi `on delete set null` (0122) :
--     la ligne de participation survit pour que le résultat d'un défi déjà
--     publié reste vérifiable par les crews adverses. Son `player_id` conserve
--     l'ancien UUID — qui n'est plus résoluble vers une personne une fois
--     `users` et `auth.users` supprimés.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.purge_due_accounts()
returns integer
language plpgsql volatile security definer set search_path = public, storage, pg_temp as $$
declare
  v_purged integer;
begin
  -- UNE SEULE INSTRUCTION, donc un seul instantané et une seule transaction :
  -- les médias et le compte partent ensemble ou pas du tout. Un `with` qui
  -- MODIFIE s'exécute toujours en entier, même si la requête principale ne lit
  -- pas sa sortie — c'est ce qui permet d'y suspendre la suppression des
  -- objets sans passer par une table temporaire (qui, elle, exploserait sur un
  -- second appel dans la même transaction).
  with due as (
    select id from public.users
     where deletion_requested_at is not null
       and deletion_requested_at
           + make_interval(days => public.account_deletion_grace_days()) <= now()
  ), media as (
    -- `split_part(name,'/',1)` est exactement le découpage qu'impose la policy
    -- d'écriture du bucket (0124) : le premier segment EST l'UUID du
    -- propriétaire. Comparer sur ce segment, jamais sur un `like 'uuid%'` qui
    -- attraperait un chemin voisin.
    delete from storage.objects o
     using due d
     where o.bucket_id = 'social-2026'
       and split_part(o.name, '/', 1) = d.id::text
    returning o.id
  ), gone as (
    -- Supprimer auth.users suffit pour le reste : public.users référence
    -- auth.users(id) en `on delete cascade` (0002), et tout le graphe applicatif
    -- (runs, hex_claims, season_scores, user_badges, crew_members, et les tables
    -- *_2026 de 0118-0127) référence public.users(id) en cascade à son tour.
    delete from auth.users a using due d where a.id = d.id returning a.id
  )
  select count(*)::integer into v_purged from gone;

  return v_purged;
end $$;

comment on function public.purge_due_accounts() is
  'Purge RÉELLE et irréversible des comptes dont le délai de grâce est échu. '
  'Ordonnancée par le cron gryd_purge_accounts (quotidien 03:40 UTC). '
  'Depuis 0136 : emporte AUSSI les objets du bucket social-2026 déposés par ces '
  'comptes (aucune clé étrangère ne les atteignait, ils survivaient à '
  'l''effacement). Ne touche pas capture_events_2026 ni challenge_roster_2026, '
  'dont les colonnes d''identité passent à NULL par `on delete set null` : la '
  'lignée territoriale et les résultats de défis déjà publiés survivent '
  'dé-identifiés, et la politique de confidentialité le déclare.';

-- Les privilèges de 0046 sont conservés par CREATE OR REPLACE ; on les repose
-- explicitement, parce qu'un `replace` qui changerait de propriétaire un jour
-- laisserait un EXECUTE hérité par PUBLIC.
revoke all on function public.purge_due_accounts() from public, anon, authenticated;
grant execute on function public.purge_due_accounts() to service_role;
