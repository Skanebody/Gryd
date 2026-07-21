-- GRYD — 0058 : l'agrégat du vol subi cesse de pouvoir annoncer un nombre FAUX.
--
-- 0057 a rendu le drainage atomique (réservation → décision → finalisation →
-- envoi). Il restait TROIS défauts, tous du même genre : le code affirmait plus
-- que ce qu'il tenait.
--
--   1. AGRÉGAT TRONQUÉ. `picked` prenait « toutes les lignes en attente NON
--      RÉSERVÉES » de la victime. Si un drain mort tenait 12 de ses lignes, le
--      drain suivant n'en voyait que les 5 nouvelles et annonçait « 5 zones
--      reprises » alors que 17 l'avaient été. Le commentaire de 0057 prétendait
--      pourtant empêcher exactement ça (« un agrégat coupé en deux annoncerait
--      un nombre faux »). Réservé ≠ absent : une ligne réservée est DUE à la
--      victime, elle est simplement en cours de traitement ailleurs.
--      → Une victime dont UNE ligne est réservée est écartée du lot ENTIÈRE.
--        Soit on l'agrège complètement, soit on attend. L'attente est bornée par
--        STEAL_QUEUE_RESERVATION_GRACE_MINUTES (le réapeur, ci-dessous).
--
--   2. INDEX HORS SUJET. `steal_push_queue_due_idx` portait sur
--      (victim_user_id, stolen_at) alors que le prédicat réel filtre AUSSI
--      `next_attempt_at` — et le report est le cas DOMINANT en volume (toute
--      perte sous le seuil dort jusqu'à sa péremption). L'index ne couvrait donc
--      pas la colonne qui écarte l'essentiel des lignes, et le commentaire de
--      0057 annonçait « coller au prédicat de lecture ». Il ne collait pas.
--
--   3. COOLDOWN DÉSARMÉ PAR UNE PANNE. Le cooldown de 3 h est l'unique garde
--      contre le renvoi entre deux drains, et il était lu sur `push_log` —
--      écrit uniquement pour les issues `delivered`, et en best-effort. Une
--      panne Expo, ou un simple échec d'insert du journal, rouvrait donc le
--      droit de repousser. Une panne de TRANSPORT ne doit jamais élargir le
--      droit de DÉRANGER quelqu'un.
--      → L'horloge du cooldown devient `steal_push_queue.processed_at` des
--        lignes consommées `outcome = 'pushed'` : écrite dans la transaction de
--        `finalize_steal_push_batch`, donc AVANT tout appel réseau, donc armée
--        par la DÉCISION d'envoyer et non par la preuve de livraison.
--        `push_log` garde son rôle propre : le cap journalier tous types
--        confondus, qui lui doit rester adossé à un envoi réellement accepté.
--
-- Rien ici ne touche au JEU : ni hex_claims, ni scores, ni horloge de decay.
-- Cette migration ne change que le droit de déranger quelqu'un, et l'exactitude
-- du nombre qu'on lui annonce.
--
-- ANTI PAY-TO-WIN (§22) : aucune colonne, aucun tri, aucun filtre ajouté ici ne
-- lit un abonnement, un pass ni un niveau. L'ordre de service reste l'ANCIENNETÉ
-- du vol (`min(stolen_at)`), identique pour tous.

-- ─── 1. Index : coller au prédicat RÉEL, cette fois ──────────────────────────

-- Prédicat du drain, mot pour mot :
--   processed_at is null
--   and reserved_at is null
--   and coalesce(next_attempt_at, '-infinity') <= p_now
-- La condition `next_attempt_at is null or next_attempt_at <= p_now` de 0057 est
-- réécrite en `coalesce(...)` pour deux raisons : un OR sur NULL n'est pas un
-- intervalle indexable, et l'expression peut alors être la CLÉ DE TÊTE de
-- l'index. Le texte de l'expression ci-dessous doit rester IDENTIQUE à celui de
-- la fonction, sinon le planificateur ne les rapproche pas.
--
-- CLÉ DE TÊTE = la date de réveil, pas la victime. C'est la colonne SÉLECTIVE :
-- à l'échelle, l'écrasante majorité des lignes en attente dorment (une perte
-- sous le seuil est endormie jusqu'à sa péremption). `victim_user_id` et
-- `stolen_at` suivent pour servir le regroupement et le tri par ancienneté.
drop index if exists public.steal_push_queue_due_idx;
create index steal_push_queue_due_idx
  on public.steal_push_queue
     ((coalesce(next_attempt_at, '-infinity'::timestamptz)), victim_user_id, stolen_at)
  where processed_at is null and reserved_at is null;

-- Exclusion des victimes ayant une réservation en cours (défaut 1). Sans cet
-- index, le `not exists` ferait un scan de toutes les lignes réservées à chaque
-- victime candidate. `steal_push_queue_reserved_idx` (0057) porte sur
-- `reserved_at` : il sert au réapeur, pas à une recherche par victime.
create index steal_push_queue_reserved_victim_idx
  on public.steal_push_queue (victim_user_id)
  where processed_at is null and reserved_at is not null;

-- Horloge du cooldown de vol (défaut 3) : dernière consommation `pushed` d'une
-- victime. `processed_at desc` pour que le `max()` soit un parcours d'index
-- descendant qui s'arrête à la première ligne.
create index steal_push_queue_pushed_idx
  on public.steal_push_queue (victim_user_id, processed_at desc)
  where outcome = 'pushed';

-- ─── 2. claim_steal_push_batch : complet, ou rien ────────────────────────────
--
-- La signature de RETOUR change (colonne `last_pushed_at`) : `create or replace`
-- ne le permet pas, il faut supprimer puis recréer.
drop function if exists public.claim_steal_push_batch(integer, timestamptz, integer);

-- CE QUI PROTÈGE RÉELLEMENT L'AGRÉGAT — et ce que chaque garde fait VRAIMENT.
-- 0057 écrivait « deux drains ne se chevauchent JAMAIS ». C'était faux, et
-- c'était la phrase qui masquait le défaut 1. Rectification :
--
--   (a) VERROU CONSULTATIF DE TRANSACTION (`pg_try_advisory_xact_lock`). Il ne
--       couvre QUE la transaction de cette fonction, pas la durée du drain : il
--       tombe au retour de la RPC, alors que l'Edge Function continue de lire,
--       de décider, d'écrire l'inbox, de finaliser et d'envoyer. Un second drain
--       PEUT donc démarrer pendant qu'un premier est entre sa réservation et sa
--       finalisation. Ce que le verrou garantit, exactement : deux RÉSERVATIONS
--       ne s'entrelacent pas — aucun drain ne peut prendre la moitié des lignes
--       qu'un autre est en train de prendre. Rien de plus.
--
--   (b) EXCLUSION DE LA VICTIME ENTIÈRE. C'est ELLE, et non le verrou, qui
--       garantit qu'un message n'annonce jamais un compte tronqué. Une victime
--       dont au moins une ligne est encore réservée (drain vivant en cours, ou
--       drain mort pas encore réapé) n'entre pas dans le lot. Elle attend :
--       jusqu'à la finalisation du drain qui la tient, ou au pire jusqu'à ce que
--       le réapeur déclare cette réservation `abandoned`
--       (STEAL_QUEUE_RESERVATION_GRACE_MINUTES). Retard borné contre chiffre
--       faux : le retard est le moindre mal, et c'est un arbitrage, pas un
--       hasard.
--
--   (c) `for update` SANS `skip locked`. 0057 utilisait `skip locked` : sauter
--       une ligne verrouillée aurait produit précisément l'agrégat tronqué qu'on
--       interdit. On préfère ATTENDRE le verrou. L'attente est en pratique nulle
--       — le verrou (a) exclut toute autre réservation, et `finalize` ne touche
--       que des lignes réservées, donc appartenant à des victimes exclues par
--       (b) — et l'ordre de verrouillage est stable (`order by q.id`), ce qui
--       écarte l'interblocage. LIMITE ASSUMÉE : si un jour un tiers verrouille
--       ces lignes hors de ces deux fonctions, cette requête attendra au lieu de
--       mentir. C'est le comportement voulu.
--
--   (d) `reserved_at` PERSISTANT. Les verrous (a) et (c) meurent avec la
--       transaction ; la réservation survit au COMMIT. C'est ce qui protège du
--       cas « le drain a réservé puis l'isolate est mort » : au drain suivant
--       les verrous ont disparu, mais la COLONNE est toujours là.
--
-- L'unité de travail reste la VICTIME. `due_victims` choisit QUI traiter, puis
-- `picked` prend TOUTES ses lignes en attente — y compris celles encore
-- reportées (`next_attempt_at` dans le futur) : le total annoncé doit couvrir
-- tout ce que la victime a perdu.
create function public.claim_steal_push_batch(
  p_max_victims  integer,
  p_now          timestamptz,
  p_grace_minutes integer
)
returns table (
  id             bigint,
  victim_user_id uuid,
  thief_user_id  uuid,
  h3index        bigint,
  stolen_at      timestamptz,
  -- Dernière fois qu'un push de vol a été DÉCIDÉ pour cette victime (identique
  -- sur toutes ses lignes). Lu ici, et non dans une requête séparée, pour que
  -- l'horloge du cooldown vienne du MÊME instantané que la réservation.
  last_pushed_at timestamptz
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
  -- (a) Une seule RÉSERVATION à la fois. Refusé = une réservation est en cours :
  -- on sort à vide. Zéro ligne n'est pas un échec — le drain suivant reprendra.
  if not pg_try_advisory_xact_lock(v_lock_key) then
    return;
  end if;

  -- RÉAPEUR — réservations jamais finalisées (isolate mort entre la réservation
  -- et la fin). On ne les REMET PAS en file : « au plus une fois ». On les
  -- consomme en le DISANT, pour que la perte se compte au lieu de se taire.
  -- Il tourne AVANT la sélection : c'est lui qui borne l'attente imposée par (b).
  update public.steal_push_queue q
     set processed_at = p_now,
         outcome      = 'abandoned'
   where q.processed_at is null
     and q.reserved_at is not null
     and q.reserved_at < p_now - make_interval(mins => p_grace_minutes);

  return query
  with due_victims as (
    -- QUI traiter : victimes ayant au moins une ligne DUE maintenant, ET aucune
    -- ligne encore réservée (b). Ordre = ancienneté du plus vieux vol non
    -- annoncé. Aucun critère de statut, de paiement ni de niveau (§22).
    select q.victim_user_id as vid
      from public.steal_push_queue q
     where q.processed_at is null
       and q.reserved_at is null
       and coalesce(q.next_attempt_at, '-infinity'::timestamptz) <= p_now
       and not exists (
         select 1
           from public.steal_push_queue h
          where h.victim_user_id = q.victim_user_id
            and h.processed_at is null
            and h.reserved_at is not null
       )
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
     order by q.id
       for update of q                       -- (c) attendre plutôt que tronquer
  ),
  reserved as (
    update public.steal_push_queue q
       set reserved_at     = p_now,          -- (d) marque qui survit au COMMIT
           attempts        = q.attempts + 1,
           next_attempt_at = null            -- le report est consommé par la prise
      from picked p
     where q.id = p.qid
    returning q.id, q.victim_user_id, q.thief_user_id, q.h3index, q.stolen_at
  )
  select r.id,
         r.victim_user_id,
         r.thief_user_id,
         r.h3index,
         r.stolen_at,
         -- Horloge du cooldown (défaut 3). Lue sur les CONSOMMATIONS `pushed`,
         -- pas sur push_log : elle est ainsi armée par la décision d'envoyer.
         -- Les lignes en cours de réservation ont `outcome is null` et ne
         -- peuvent donc pas s'auto-compter.
         (select max(l.processed_at)
            from public.steal_push_queue l
           where l.victim_user_id = r.victim_user_id
             and l.outcome = 'pushed') as last_pushed_at
    from reserved r;
end;
$$;

-- ─── 3. Privilèges (la fonction recréée les a perdus) ────────────────────────
-- PUBLIC hérite d'EXECUTE À LA CRÉATION : révoquer d'`anon` seul ne suffirait
-- pas (piège prouvé du repo), il FAUT révoquer `from public`. Seul le
-- service_role (Edge Function) appelle ces fonctions ; il contourne le RLS par
-- nature et n'a besoin d'aucun grant.
revoke all on function public.claim_steal_push_batch(integer, timestamptz, integer)
  from public, anon, authenticated;

comment on function public.claim_steal_push_batch(integer, timestamptz, integer) is
  'GRYD 0058 — réserve un lot de vols à annoncer, PAR VICTIME. Une victime dont '
  'une ligne est déjà réservée est écartée ENTIÈRE : un agrégat tronqué '
  'annoncerait un nombre faux, attendre non. Le verrou consultatif ne couvre que '
  'la transaction de cette fonction (pas la durée du drain) ; c''est cette '
  'exclusion, plus `reserved_at` persistant, qui empêche le doublon et le compte '
  'partiel. Renvoie aussi `last_pushed_at` — l''horloge du cooldown de vol, lue '
  'sur les consommations `pushed`, donc armée par la DÉCISION d''envoyer et non '
  'par une preuve de livraison.';

comment on index public.steal_push_queue_due_idx is
  'GRYD 0058 — couvre le prédicat RÉEL du drain, `next_attempt_at` compris '
  '(réécrit en coalesce pour être indexable). L''index de 0057 l''ignorait, alors '
  'que le report est le cas dominant en volume.';
comment on index public.steal_push_queue_reserved_victim_idx is
  'GRYD 0058 — sert l''exclusion « cette victime a-t-elle une réservation en '
  'cours ? ». Recherche par victime, là où steal_push_queue_reserved_idx sert le '
  'réapeur (recherche par ancienneté de réservation).';
comment on index public.steal_push_queue_pushed_idx is
  'GRYD 0058 — horloge du cooldown de vol : dernière ligne consommée `pushed` '
  'd''une victime. Sa rétention est bornée par la purge '
  '(STEAL_QUEUE_MAX_AGE_HOURS = 24 h), qui doit rester supérieure au cooldown '
  '(STEAL_PUSH_COOLDOWN_MINUTES = 3 h).';
