-- GRYD — 0057 : le drainage de `steal_push_queue` devient ATOMIQUE et IDEMPOTENT.
--
-- ─── LE DÉFAUT QUE CETTE MIGRATION FERME ─────────────────────────────────────
-- 0056 a livré la file, et `steal_push_job` la drainait ainsi :
--   lire (`processed_at is null`) → envoyer les pushs → écrire push_log →
--   désactiver les tokens morts → écrire l'inbox → PUIS marquer `processed_at`.
-- Trois conséquences, toutes du même défaut — la consommation arrivait DERNIÈRE :
--   1. `.is('processed_at', null)` est une LECTURE, pas une réservation. Deux
--      drains qui se chevauchent (cron qui tique pendant qu'un drain lent tourne)
--      lisent le MÊME lot et envoient DEUX FOIS le même message.
--   2. Toute erreur d'écriture APRÈS l'envoi Expo empêchait d'atteindre le
--      marquage : le lot entier repartait au créneau suivant. Toutes les 5
--      minutes. Pendant 24 h.
--   3. Une ligne écartée pour une raison de TIMING restait en file sans marque.
--      À l'échelle, les plus vieilles jamais consommées saturaient le lot et les
--      vols RÉCENTS n'étaient plus jamais lus : une FAMINE visant les actifs.
--
-- ─── LE PRINCIPE QUI TRANCHE ─────────────────────────────────────────────────
-- Pour une notification push, « AU PLUS UNE FOIS » vaut mieux que « au moins une
-- fois ». Perdre une alerte est un désagrément ; en envoyer dix est une raison
-- de désinstaller. La réservation PRÉCÈDE donc l'envoi : les lignes sont prises
-- AVANT l'appel à Expo, quitte à perdre une notification si le job meurt entre
-- les deux. Ce compromis n'est pas implicite — il est écrit ici, il a un nom
-- (`outcome = 'abandoned'`) et il est COMPTÉ.
--
-- Rien ici ne touche au JEU : ni hex_claims, ni scores, ni horloge de decay.
-- Cette migration ne change que le droit de déranger quelqu'un.
--
-- ANTI PAY-TO-WIN (§22) : aucune colonne, aucun tri, aucun filtre ne lit un
-- abonnement, un pass ou un niveau. L'ordre de service est l'ANCIENNETÉ du vol
-- (`min(stolen_at)`), identique pour tous — être prévenu plus tôt d'une attaque
-- reste inachetable.

-- ─── 1. Colonnes de drainage ─────────────────────────────────────────────────

-- Réservation : posée AVANT l'appel Expo, effacée si la ligne est reportée.
-- Une ligne réservée est INVISIBLE des autres drains — c'est ce qui rend le
-- doublon impossible même si deux drains passent la porte en même temps.
alter table public.steal_push_queue add column reserved_at timestamptz;

-- Report : instant à partir duquel la ligne redevient LISIBLE. Posé quand la
-- suppression parle du MOMENT (seuil non atteint, cooldown, quiet hours, cap).
-- C'est l'antidote à la famine : une ligne qui ne peut rien produire avant 3 h
-- cesse d'occuper une place dans le lot.
alter table public.steal_push_queue add column next_attempt_at timestamptz;

-- Nombre de drains ayant réservé cette ligne. Diagnostic seulement : sous
-- « au plus une fois », une ligne saine vaut 1. Un 2 signale un report (normal),
-- un nombre qui grimpe signale une boucle (anormal) — sans ce compteur, une
-- boucle est invisible jusqu'à ce qu'un joueur se plaigne.
alter table public.steal_push_queue add column attempts integer not null default 0;

-- Issue de la consommation. `processed_at` disait QUE la ligne était consommée,
-- jamais POURQUOI — donc « annoncé au joueur » et « perdu par un crash » se
-- ressemblaient dans les métriques. Ils ne doivent pas.
--   pushed        — un push a été TENTÉ pour cette victime (voir la nuance sur
--                   l'issue de transport dans steal_push_job/logic.ts).
--   undeliverable — aucun appareil, ou canal `competition` coupé. L'inbox, elle,
--                   est écrite : couper le push ne coupe pas l'inbox.
--   expired       — plus vieux que STEAL_QUEUE_MAX_AGE_HOURS. Périmé, pas nié.
--   invalid       — n'a jamais pu produire de message (vol de soi-même, id vide).
--   abandoned     — réservé par un drain qui n'a jamais fini. Le prix ASSUMÉ du
--                   « au plus une fois ». Compté pour rester visible.
alter table public.steal_push_queue add column outcome text
  check (outcome is null or outcome in
    ('pushed', 'undeliverable', 'expired', 'invalid', 'abandoned'));

-- ─── 2. Index : coller au prédicat de lecture, sinon il ne sert à rien ───────
-- L'index partiel de 0056 portait sur (stolen_at) where processed_at is null. Le
-- drain ne lit plus « en attente » mais « en attente ET non réservée ET due ».
-- Un index qui ne couvre pas le prédicat réel fait scanner la file entière.
drop index if exists public.steal_push_queue_pending_idx;

-- Lecture du drain : lignes DUES (non consommées, non réservées), par victime,
-- triées par ancienneté. `victim_user_id` en tête parce que l'unité de travail
-- est la VICTIME (un message = une victime), pas la ligne.
create index steal_push_queue_due_idx
  on public.steal_push_queue (victim_user_id, stolen_at)
  where processed_at is null and reserved_at is null;

-- Le réapeur des réservations abandonnées : petit index dédié, sinon retrouver
-- les orphelines imposerait un scan complet à chaque drain.
create index steal_push_queue_reserved_idx
  on public.steal_push_queue (reserved_at)
  where processed_at is null and reserved_at is not null;

-- ─── 3. claim_steal_push_batch : la RÉSERVATION ──────────────────────────────
--
-- POURQUOI CE MÉCANISME TIENT SOUS CONCURRENCE RÉELLE (et pas seulement au cas
-- nominal). Trois lignes de défense, indépendantes :
--
--   (a) VERROU CONSULTATIF DE TRANSACTION. `pg_try_advisory_xact_lock` est pris
--       en premier. Deux drains ne se chevauchent JAMAIS : le second obtient le
--       verrou refusé et sort avec zéro ligne, sans erreur et sans attente. Ce
--       n'est pas du confort — c'est ce qui garantit que la FENÊTRE
--       D'AGRÉGATION d'une victime n'est jamais coupée en deux. Sans lui, deux
--       drains pourraient se partager les lignes d'une même victime et envoyer
--       « 5 zones » et « 12 zones » pour un seul événement vécu. Le verrou est
--       `xact` : il tombe au COMMIT comme au ROLLBACK comme à la mort du
--       backend — un job tué ne laisse aucun verrou orphelin.
--
--   (b) `for update ... skip locked`. Défense en profondeur si quelqu'un appelle
--       un jour cette fonction hors du cron, ou si le verrou (a) est retiré. La
--       SÉLECTION et l'UPDATE sont UNE SEULE instruction dans UNE SEULE
--       transaction : il n'existe aucune fenêtre entre « j'ai lu » et « j'ai
--       marqué » où un concurrent pourrait s'insérer. C'est exactement la
--       fenêtre où `.is('processed_at', null)` échouait.
--
--   (c) `reserved_at` PERSISTANT. Les verrous (a) et (b) meurent avec la
--       transaction ; la réservation, elle, survit. Après le COMMIT, les lignes
--       sont exclues du prédicat de lecture par une COLONNE, pas par un verrou.
--       C'est ce qui protège du cas « le drain a réservé puis l'isolate est
--       mort » : au drain suivant les verrous ont disparu, mais `reserved_at`
--       est toujours là, et les lignes ne repartent pas.
--
-- L'unité de travail est la VICTIME. `due_victims` choisit d'abord QUI traiter
-- (les victimes ayant au moins une ligne due), puis `picked` prend TOUTES leurs
-- lignes en attente — y compris celles encore reportées (`next_attempt_at` dans
-- le futur). C'est indispensable : le total annoncé doit couvrir tout ce que la
-- victime a perdu, sinon le message ment. C'est aussi ce qui rend le report
-- inoffensif — une ligne sous le seuil n'est jamais orpheline, elle revient dès
-- qu'un nouveau vol réveille sa victime.
create or replace function public.claim_steal_push_batch(
  p_max_victims  integer,
  p_now          timestamptz,
  p_grace_minutes integer
)
returns table (
  id             bigint,
  victim_user_id uuid,
  thief_user_id  uuid,
  h3index        bigint,
  stolen_at      timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
-- Les OUT params de `returns table` sont des variables plpgsql homonymes de
-- colonnes réelles (`id`, `stolen_at`…). Sans cette directive, une référence
-- non qualifiée résoudrait vers la VARIABLE, silencieusement.
#variable_conflict use_column
declare
  -- Clé arbitraire mais STABLE du verrou de drain (une seule dans le repo).
  v_lock_key constant bigint := 570056;
begin
  -- (a) Un seul drain à la fois. Refusé = un drain tourne déjà : on sort à vide.
  -- Zéro ligne n'est pas un échec — le drain suivant reprendra dans 5 minutes.
  if not pg_try_advisory_xact_lock(v_lock_key) then
    return;
  end if;

  -- RÉAPEUR — réservations jamais finalisées (isolate mort entre la réservation
  -- et la fin). On ne les REMET PAS en file : « au plus une fois ». On les
  -- consomme en le DISANT, pour que la perte se compte au lieu de se taire.
  update public.steal_push_queue q
     set processed_at = p_now,
         outcome      = 'abandoned'
   where q.processed_at is null
     and q.reserved_at is not null
     and q.reserved_at < p_now - make_interval(mins => p_grace_minutes);

  return query
  with due_victims as (
    -- QUI traiter : victimes ayant au moins une ligne DUE maintenant.
    -- Ordre = ancienneté du plus vieux vol non annoncé. Aucun critère de statut,
    -- de paiement ni de niveau n'entre ici (§22).
    select q.victim_user_id as vid
      from public.steal_push_queue q
     where q.processed_at is null
       and q.reserved_at is null
       and (q.next_attempt_at is null or q.next_attempt_at <= p_now)
     group by q.victim_user_id
     order by min(q.stolen_at) asc
     limit p_max_victims
  ),
  picked as (
    -- QUOI prendre : TOUTES les lignes en attente de ces victimes, reportées
    -- comprises. Un agrégat partiel annoncerait un nombre faux.
    select q.id as qid
      from public.steal_push_queue q
      join due_victims v on v.vid = q.victim_user_id
     where q.processed_at is null
       and q.reserved_at is null
     order by q.id
       for update of q skip locked          -- (b) défense en profondeur
  ),
  reserved as (
    update public.steal_push_queue q
       set reserved_at     = p_now,         -- (c) marque qui survit au COMMIT
           attempts        = q.attempts + 1,
           next_attempt_at = null           -- le report est consommé par la prise
      from picked p
     where q.id = p.qid
    returning q.id, q.victim_user_id, q.thief_user_id, q.h3index, q.stolen_at
  )
  select r.id, r.victim_user_id, r.thief_user_id, r.h3index, r.stolen_at
    from reserved r;
end;
$$;

-- ─── 4. finalize_steal_push_batch : consommer ET reporter, EN UN SEUL ACTE ───
--
-- POURQUOI UNE SEULE FONCTION POUR LES DEUX. La consommation et le report sont
-- les deux moitiés d'une même décision, prise en PUR dans logic.ts. Les appliquer
-- en deux requêtes distinctes rouvrirait exactement le défaut qu'on ferme : un
-- échec entre les deux laisserait des lignes réservées sans issue. Ici, c'est
-- une transaction ou rien.
--
-- Appelée AVANT l'envoi Expo. C'est le point de non-retour : une fois cette
-- fonction revenue, plus AUCUNE erreur en aval ne peut provoquer de renvoi.
--
-- Idempotente : la clause `reserved_at is not null` fait qu'un rejeu
-- (retry réseau du client Supabase, par exemple) ne repasse pas sur des lignes
-- déjà finalisées — elles ne sont plus réservées.
create or replace function public.finalize_steal_push_batch(
  p_consumed jsonb,   -- [{"id": 1, "outcome": "pushed"}, …]
  p_deferred jsonb,   -- [{"id": 2, "next_attempt_at": "2026-…"}, …]
  p_now      timestamptz
)
returns table (consumed_count integer, deferred_count integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_consumed integer := 0;
  v_deferred integer := 0;
begin
  -- CONSOMMÉES : l'événement ne reviendra jamais dans un lot.
  with src as (
    select (e ->> 'id')::bigint as id, e ->> 'outcome' as outcome
      from jsonb_array_elements(coalesce(p_consumed, '[]'::jsonb)) e
  )
  update public.steal_push_queue q
     set processed_at = p_now,
         outcome      = src.outcome,
         reserved_at  = null
    from src
   where q.id = src.id
     and q.processed_at is null
     and q.reserved_at is not null;
  get diagnostics v_consumed = row_count;

  -- REPORTÉES : rendues au lot, mais pas avant `next_attempt_at`. Libérer la
  -- réservation SANS poser de date les ferait relire au drain suivant — donc
  -- réoccuper le lot, donc affamer les vols récents. Les deux écritures vont
  -- ensemble ou pas du tout.
  with src as (
    select (e ->> 'id')::bigint            as id,
           (e ->> 'next_attempt_at')::timestamptz as next_at
      from jsonb_array_elements(coalesce(p_deferred, '[]'::jsonb)) e
  )
  update public.steal_push_queue q
     set reserved_at     = null,
         next_attempt_at = src.next_at
    from src
   where q.id = src.id
     and q.processed_at is null
     and q.reserved_at is not null;
  get diagnostics v_deferred = row_count;

  return query select v_consumed, v_deferred;
end;
$$;

-- ─── 5. Privilèges ───────────────────────────────────────────────────────────
-- Ces deux fonctions drainent une file INTERNE et sont `security definer` : les
-- exposer à un client lui donnerait le pouvoir de consommer les alertes d'autrui
-- — un déni de notification silencieux. Seul le service_role (Edge Function)
-- les appelle ; il contourne le RLS par nature et n'a besoin d'aucun grant.
-- PUBLIC hérite d'EXECUTE À LA CRÉATION : révoquer d'`anon` seul ne suffirait
-- pas (piège prouvé du repo), il FAUT révoquer `from public`.
revoke all on function public.claim_steal_push_batch(integer, timestamptz, integer)
  from public, anon, authenticated;
revoke all on function public.finalize_steal_push_batch(jsonb, jsonb, timestamptz)
  from public, anon, authenticated;

comment on function public.claim_steal_push_batch(integer, timestamptz, integer) is
  'GRYD 0057 — réserve un lot de vols à annoncer, PAR VICTIME (un message = une '
  'victime, donc jamais un agrégat coupé en deux). Verrou consultatif de '
  'transaction + for update skip locked + reserved_at persistant : deux drains '
  'simultanés ne peuvent pas envoyer le même message. Réape au passage les '
  'réservations abandonnées (outcome=abandoned) — le prix assumé du « au plus '
  'une fois », compté plutôt que tu.';

comment on function public.finalize_steal_push_batch(jsonb, jsonb, timestamptz) is
  'GRYD 0057 — applique EN UNE TRANSACTION la décision pure de logic.ts : '
  'consommation (processed_at + outcome) et report (next_attempt_at). Appelée '
  'AVANT l''envoi Expo : une fois revenue, aucune erreur en aval ne peut '
  'provoquer de renvoi.';

comment on column public.steal_push_queue.reserved_at is
  'Posé AVANT l''appel Expo. Une ligne réservée est invisible des autres drains, '
  'et le reste après le COMMIT : c''est la marque qui survit à la mort du job.';
comment on column public.steal_push_queue.next_attempt_at is
  'Report des suppressions de TIMING. Sans lui, les lignes jamais consommées '
  'saturent le lot et affament les vols récents.';
comment on column public.steal_push_queue.outcome is
  'Pourquoi la ligne a été consommée. « annoncé » et « perdu par un crash » ne '
  'doivent pas se ressembler dans les métriques.';
