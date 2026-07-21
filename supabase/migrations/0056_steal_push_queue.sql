-- GRYD — 0056 steal_push_queue : la file des vols en attente d'annonce.
--
-- POURQUOI UNE FILE, ET PAS UN ENVOI DEPUIS ingest_run.
-- Le vol est décidé par `decideClaims` pendant `ingest_run`, qui est sur le
-- CHEMIN CRITIQUE de la fin de course : le coureur attend son résultat à
-- l'écran. Trois raisons ont écarté l'envoi direct (même « non bloquant ») :
--
--   1. LATENCE. Prévenir une VICTIME demande 3 lectures (appareils,
--      journal de push, dernier push de vol) + un aller-retour HTTP vers
--      exp.host — soit ~200-600 ms qui ne servent EN RIEN au coureur qui
--      attend. Ici ingest_run n'ajoute qu'UN insert local (quelques ms).
--
--   2. VÉRITÉ DU CHIFFRE. Un envoi par course ne peut agréger que CETTE
--      course. Dix rivaux en une heure = dix invocations : la première
--      annoncerait « 5 zones » et le cooldown avalerait silencieusement les
--      neuf autres. Le joueur recevrait un nombre PÉRIMÉ. La file agrège une
--      vraie fenêtre : le message dit ce qui a réellement été pris.
--
--   3. DURABILITÉ. Un envoi lancé après la réponse HTTP meurt avec l'isolate
--      s'il est évincé — l'alerte disparaît sans trace. Une ligne en file est
--      durable : le drain suivant la reprend.
--
-- CE QUE LA TABLE EST : un journal COURT des vols pas encore annoncés. Elle ne
-- fait pas autorité sur la propriété (c'est `hex_claims`) et ne sert à aucun
-- calcul de jeu — la retirer ne changerait pas un point, seulement le silence.
--
-- VIE PRIVÉE (§7). Aucune position, aucun tracé, aucun point de départ : un
-- identifiant de cellule H3 déjà public dans `hex_claims`, et deux user_id. Le
-- voleur n'est stocké que pour COMPTER les rivaux distincts (anti-double-
-- comptage d'agrégation) ; il n'est jamais nommé dans le message envoyé.
-- `on delete cascade` des deux côtés : un compte supprimé s'efface d'ici aussi.

create table public.steal_push_queue (
  id             bigserial primary key,
  -- Le DÉPOSSÉDÉ : c'est lui qu'on notifie.
  victim_user_id uuid not null references public.users (id) on delete cascade,
  -- L'auteur du vol. Sert UNIQUEMENT à compter les rivaux distincts.
  thief_user_id  uuid not null references public.users (id) on delete cascade,
  -- game-rules: H3_RESOLUTION (res 10), même encodage bigint que hex_claims.
  h3index        bigint not null,
  stolen_at      timestamptz not null default now(),
  -- Posé par steal_push_job quand l'événement a été CONSOMMÉ (poussé, ou
  -- définitivement non poussable : pas d'appareil / canal coupé / périmé).
  -- Tant qu'il est null, l'événement compte encore dans le prochain agrégat.
  processed_at   timestamptz
);

-- Le drain ne lit QUE les lignes en attente, par ancienneté : index partiel.
create index steal_push_queue_pending_idx
  on public.steal_push_queue (stolen_at)
  where processed_at is null;
-- Purge des lignes consommées (rétention courte, cf. steal_push_job).
create index steal_push_queue_processed_idx
  on public.steal_push_queue (processed_at)
  where processed_at is not null;

alter table public.steal_push_queue enable row level security;

-- Table INTERNE aux jobs : aucun client ne la lit ni ne l'écrit. Aucune policy
-- n'est créée — RLS activée sans policy = tout est refusé sauf service_role
-- (qui la contourne). Les revokes retirent en plus les privilèges hérités :
-- PUBLIC hérite d'EXECUTE/SELECT par défaut, la RLS seule ne suffit pas comme
-- unique ligne de défense.
revoke all on table public.steal_push_queue from public, anon, authenticated;
revoke all on sequence public.steal_push_queue_id_seq from public, anon, authenticated;

-- ─── Planification du drain ──────────────────────────────────────────────────
-- Toutes les 5 minutes (infra pg_cron + pg_net + secret Vault de 0038/0039).
--
-- POURQUOI 5 MIN ET PAS 1. C'est la fenêtre d'agrégation réelle : deux courses
-- adverses qui se terminent à 3 minutes d'intervalle produisent UN message, pas
-- deux. Cinq minutes de délai sur « reviens la reprendre » ne change rien au
-- jeu (le decay, lui, prévient à J-3) ; dix messages en cinq minutes, si.
--
-- SÛRETÉ : sur une file vide, le job lit 0 ligne et sort — no-op complet, aucun
-- appel réseau. Il n'écrit JAMAIS dans hex_claims ni dans les scores.
select cron.schedule(
  'gryd_steal_push_job',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://sydwxwwirinjoheeodcg.supabase.co/functions/v1/steal_push_job',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'gryd_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $job$
);
