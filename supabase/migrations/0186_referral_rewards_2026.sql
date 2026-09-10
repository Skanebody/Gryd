-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — 0186 : LES RÉCOMPENSES DE PARRAINAGE, DÉCIDÉES PAR LE SERVEUR SEUL.
--
-- Requiert 0119 (registre d'XP), 0120 (droits GRYD+), 0121 (saisons), 0140/0141
-- (notifications), 0144 (récompenses de niveau), 0184 (le code), 0185 (le lien).
--
-- ─── LES TROIS RÉCOMPENSES, ET CE QUI LES REND EXCLUSIVES ──────────────────
--  1. UNE COLLECTION QU'ON NE PEUT PAS AVOIR AUTREMENT — cadre, style de trace,
--     et le titre « Parrain » ou « Filleul ». Aucun palier de niveau (0144),
--     aucune collection de saison (0121), aucun SKU (0014, 0125) ne les
--     délivre : le seul chemin est `referral_grants_2026`. C'est LA demande du
--     fondateur (« quelque chose à gagner que les autres n'ont pas »).
--  2. UN BOOST D'XP DE PROGRESSION, ×1,5 pendant 7 jours, aux DEUX. Il ne
--     touche QUE `progress_accounts_2026.ledger.totalXp`, c'est-à-dire le
--     NIVEAU. Ni territoire, ni performance, ni défi, ni palier de collection.
--  3. UN CRÉDIT GRYD+ DE 30 JOURS, banqué (0185).
--
-- ─── CE QUI RESTE INTOUCHÉ, ET QUI EST LA CONTREPARTIE DE LA DÉROGATION ────
-- Les classements de 0160-0164 lisent `runs.points_awarded`, les surfaces
-- capturées et les métriques de performance. AUCUNE de ces colonnes n'est
-- écrite ici. Un parrain et un non-parrain qui courent la même chose finissent
-- au même rang : c'est la condition à laquelle le §15.2 accepte de plier.
--
-- ─── POURQUOI LE BOOST S'APPLIQUE DANS `commit_progress_2026` ──────────────
-- Le grand livre d'XP est un RECALCUL COMPLET et déterministe
-- (`computeProgressLedger2026`, TypeScript pur) : y injecter un multiplicateur
-- le rendrait dépendant d'une fenêtre glissante, donc non rejouable — deux
-- recalculs à deux dates rendraient deux totaux. Le bonus est donc un FAIT
-- SÉPARÉ, journalisé une fois par sortie créditée (`referral_xp_bonus_2026`),
-- puis ajouté au total. Le registre reste pur, le bonus reste auditable, et un
-- rejeu ne double rien (contrainte `unique(user_id, run_id)`).
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 1. LE CATALOGUE GELÉ DE LA COLLECTION EXCLUSIVE ═══════════════════════
-- Copie GELÉE de `REFERRAL_REWARDS_2026` (game-rules §3.7). Le test PGlite lit
-- la source TypeScript et refuse toute dérive, exactement comme 0144 le fait
-- pour les huit récompenses de niveau.
--
-- ⚠️ À LA FUSION : ces quatre `reward_id` doivent être ajoutés au catalogue
-- cosmétique mobile (`src/features/arsenal/cosmetics2026.ts`, lot en cours) —
-- ce lot ne touche PAS `arsenal/**`. Tant qu'ils n'y sont pas, `/parrainage`
-- les nomme avec le libellé du catalogue i18n et n'en peint aucun aperçu :
-- un objet sans art se DIT, il ne se dessine pas au hasard.
create table public.referral_reward_templates_2026 (
  reward_id text primary key,
  slot      text not null check (slot in ('avatarFrame', 'trace', 'title')),
  side      text not null check (side in ('both', 'referrer', 'referee'))
);
insert into public.referral_reward_templates_2026 values
  ('referral_frame',          'avatarFrame', 'both'),
  ('referral_trace',          'trace',       'both'),
  ('referral_title_parrain',  'title',       'referrer'),
  ('referral_title_filleul',  'title',       'referee');

-- ═══ 2. LE JOURNAL DES OCTROIS ═════════════════════════════════════════════
create table public.referral_grants_2026 (
  id             bigint generated always as identity primary key,
  link_id        bigint not null references public.referral_links_2026(id) on delete cascade,
  user_id        uuid not null references public.users(id) on delete cascade,
  side           text not null check (side in ('referrer', 'referee')),
  kind           text not null check (kind in ('collection', 'xp_boost', 'gryd_plus')),
  -- Jamais NULL : une contrainte d'unicité sur une colonne nullable ne
  -- dédoublonne rien (deux NULL ne sont pas égaux), et c'est justement ici que
  -- le rejeu doit être impossible.
  reward_id      text not null,
  boost_ends_at  timestamptz,
  boost_multiplier numeric,
  granted_at     timestamptz not null default now(),
  revoked_at     timestamptz,
  revoked_reason text,
  unique (link_id, user_id, kind, reward_id),
  constraint referral_grants_2026_boost_shape check (
    (kind <> 'xp_boost' and boost_ends_at is null and boost_multiplier is null)
    or (kind = 'xp_boost' and boost_ends_at is not null and boost_multiplier is not null)),
  constraint referral_grants_2026_revocation_reasoned check (
    (revoked_at is null) = (revoked_reason is null))
);
create index referral_grants_2026_user_idx on public.referral_grants_2026 (user_id, kind);

-- ═══ 3. LE JOURNAL DU BONUS D'XP ═══════════════════════════════════════════
-- Une ligne = une sortie créditée pendant une fenêtre de boost. `base_xp` est
-- l'XP que le grand livre a vraiment ajoutée, `bonus_xp` ce que le boost y
-- ajoute. Les deux sont écrits : sans `base_xp`, personne ne peut REFAIRE le
-- calcul six mois plus tard.
create table public.referral_xp_bonus_2026 (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  run_id     uuid not null references public.runs(id) on delete cascade,
  base_xp    integer not null check (base_xp > 0),
  bonus_xp   integer not null check (bonus_xp >= 0),
  multiplier numeric not null check (multiplier >= 1),
  granted_at timestamptz not null default now(),
  unique (user_id, run_id)
);

alter table public.referral_reward_templates_2026 enable row level security;
alter table public.referral_grants_2026 enable row level security;
alter table public.referral_xp_bonus_2026 enable row level security;
revoke all on public.referral_reward_templates_2026, public.referral_grants_2026,
  public.referral_xp_bonus_2026 from public, anon, authenticated;
grant all on public.referral_reward_templates_2026, public.referral_grants_2026,
  public.referral_xp_bonus_2026 to service_role;

-- ═══ 4. LES LECTURES PURES DU BOOST ════════════════════════════════════════
/**
 * Le boost est-il ouvert pour ce compte, à cet instant ?
 *
 * IL NE S'EMPILE JAMAIS. Deux parrainages aboutis dans la même semaine rendent
 * deux lignes d'octroi, et cette fonction rend `true` — une seule fois. Le
 * multiplicateur reste 1,5 : empiler ferait d'un recruteur quelqu'un qui monte
 * dix fois plus vite qu'un joueur qui court autant, ce qui est exactement le
 * « pay-to-win sans payer » que la règle 10 interdit.
 */
create function public.referral_boost_active_2026(p_user_id uuid, p_at timestamptz default now())
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.referral_grants_2026
                 where user_id = p_user_id and kind = 'xp_boost'
                   and revoked_at is null and boost_ends_at > p_at);
$$;

/** Le total des bonus déjà crédités. Additif au registre, jamais dedans. */
create function public.referral_xp_bonus_total_2026(p_user_id uuid)
returns integer language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce(sum(bonus_xp), 0)::integer from public.referral_xp_bonus_2026 where user_id = p_user_id;
$$;

/** La saison en cours, ou `hors_saison` : le plafond s'applique dans les deux cas. */
create function public.referral_season_key_2026(p_at timestamptz default now())
returns text language sql stable security definer set search_path=public,pg_temp as $$
  select coalesce((select c.id from public.season_collections_2026 c
                    where c.starts_at <= p_at and c.ends_at > p_at
                    order by c.starts_at desc limit 1), 'hors_saison');
$$;

/**
 * LA SORTIE LA PLUS RÉCENTE QUI COMPTE POUR UN PARRAINAGE, ou NULL.
 *
 * Trois conditions, toutes serveur : statut `valid` (jamais `flagged` ni
 * `rejected`), distance ≥ 1 000 m (game-rules: REFERRAL_MIN_VALIDATED_DISTANCE_M),
 * et évidence sportive ÉLIGIBLE — c'est-à-dire non gelée par l'anti-triche
 * (`eligibility = 'review'` tant qu'un humain n'a pas tranché, 0187).
 */
create function public.referral_qualifying_run_2026(p_user_id uuid)
returns uuid language sql stable security definer set search_path=public,pg_temp as $$
  select r.id from public.runs r
    join public.progress_activity_2026 e on e.run_id = r.id
   where r.user_id = p_user_id
     and r.status = 'valid'
     and coalesce(r.distance_m, 0) >= 1000  -- game-rules: REFERRAL_MIN_VALIDATED_DISTANCE_M
     and e.evidence->>'eligibility' = 'eligible'
   order by r.started_at desc, r.id
   limit 1;
$$;

-- ═══ 5. L'ATTRIBUTION ══════════════════════════════════════════════════════
/**
 * TENTE DE CLORE UN PARRAINAGE. Rend `true` si elle vient d'octroyer.
 *
 * Ordre des refus, du plus dur au plus doux :
 *  · lien révoqué ou déjà clos → rien (idempotence) ;
 *  · une des deux sorties manque → rien, on attend ;
 *  · la dernière des deux sorties est arrivée APRÈS la fenêtre de 30 jours →
 *    le lien est CLOS PAR EXPIRATION, avec son motif. Il ne reste pas
 *    éternellement « en attente » : un état qui ne bouge jamais est un mensonge
 *    de plus à l'écran.
 *
 * Le plafond de saison ne coupe QUE la part du parrain. Le filleul, lui, n'a
 * rien fait de mal : il a couru.
 */
create function public.referral_try_complete_2026(p_link_id bigint)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_link    public.referral_links_2026;
  v_last    timestamptz;
  v_capped  boolean;
  v_ends    timestamptz;
  v_reward  record;
begin
  select * into v_link from public.referral_links_2026 where id = p_link_id for update;
  if not found or v_link.revoked_at is not null or v_link.completed_at is not null then return false; end if;
  if v_link.referrer_qualified_at is null or v_link.referee_qualified_at is null then return false; end if;

  v_last := greatest(v_link.referrer_qualified_at, v_link.referee_qualified_at);
  -- game-rules: REFERRAL_COMPLETION_WINDOW_DAYS = 30
  if v_last > v_link.redeemed_at + interval '30 days' then
    update public.referral_links_2026
       set revoked_at = now(), revoked_reason = 'window_expired' where id = p_link_id;
    return false;
  end if;

  -- game-rules: REFERRAL_MAX_ACTIVE_PER_SEASON = 5
  select count(*) >= 5 into v_capped
    from public.referral_links_2026 l
   where l.referrer_id = v_link.referrer_id and l.season_key = v_link.season_key
     and l.completed_at is not null and l.revoked_at is null and not l.referrer_capped;

  -- game-rules: REFERRAL_XP_BOOST_2026.days = 7
  v_ends := now() + interval '7 days';

  update public.referral_links_2026
     set completed_at = now(), referrer_capped = v_capped where id = p_link_id;

  for v_reward in select * from public.referral_reward_templates_2026 loop
    if v_reward.side in ('both', 'referee') then
      insert into public.referral_grants_2026(link_id, user_id, side, kind, reward_id)
        values(p_link_id, v_link.referee_id, 'referee', 'collection', v_reward.reward_id)
        on conflict do nothing;
    end if;
    if not v_capped and v_reward.side in ('both', 'referrer') then
      insert into public.referral_grants_2026(link_id, user_id, side, kind, reward_id)
        values(p_link_id, v_link.referrer_id, 'referrer', 'collection', v_reward.reward_id)
        on conflict do nothing;
    end if;
  end loop;

  -- game-rules: REFERRAL_XP_BOOST_2026.multiplier = 1.5
  insert into public.referral_grants_2026(link_id, user_id, side, kind, reward_id, boost_ends_at, boost_multiplier)
    values(p_link_id, v_link.referee_id, 'referee', 'xp_boost', 'referral_xp_boost', v_ends, 1.5)
    on conflict do nothing;
  -- game-rules: REFERRAL_GRYD_PLUS_CREDIT_DAYS = 30
  insert into public.referral_gryd_plus_credits_2026(user_id, link_id, days)
    values(v_link.referee_id, p_link_id, 30) on conflict do nothing;
  insert into public.referral_grants_2026(link_id, user_id, side, kind, reward_id)
    values(p_link_id, v_link.referee_id, 'referee', 'gryd_plus', 'referral_gryd_plus')
    on conflict do nothing;

  if not v_capped then
    insert into public.referral_grants_2026(link_id, user_id, side, kind, reward_id, boost_ends_at, boost_multiplier)
      values(p_link_id, v_link.referrer_id, 'referrer', 'xp_boost', 'referral_xp_boost', v_ends, 1.5)
      on conflict do nothing;
    insert into public.referral_gryd_plus_credits_2026(user_id, link_id, days)
      values(v_link.referrer_id, p_link_id, 30) on conflict do nothing;
    insert into public.referral_grants_2026(link_id, user_id, side, kind, reward_id)
      values(p_link_id, v_link.referrer_id, 'referrer', 'gryd_plus', 'referral_gryd_plus')
      on conflict do nothing;
  end if;

  -- ── LA SEULE SOLLICITATION QUE LE PARRAINAGE PRODUIT ────────────────────
  -- `NOTIFICATION_RULES_2026.referralCompleted` : catégorie « results », NON
  -- transactionnelle (elle respecte donc la plage calme et le budget de §14.3).
  -- L'`event_id` porte l'identifiant du lien : `unique(user_id, event_id)`
  -- rend le doublon structurellement impossible, même si l'attribution est
  -- rejouée. Le parrain PLAFONNÉ n'est pas notifié : lui dire « vos récompenses
  -- sont là » alors qu'il n'en reçoit aucune serait un mensonge.
  -- Best-effort ASSUMÉ : l'octroi est déjà écrit ; un moteur de notification
  -- absent ou en panne ne doit pas annuler une récompense méritée.
  begin
    perform public.claim_notification_2026(v_link.referee_id, 'results',
      'referral_completed:' || p_link_id::text);
    if not v_capped then
      perform public.claim_notification_2026(v_link.referrer_id, 'results',
        'referral_completed:' || p_link_id::text);
    end if;
  exception when others then
    raise warning 'referral: notification indisponible pour le lien %', p_link_id;
  end;

  return true;
end $$;

/**
 * UNE SORTIE CESSE DE COMPTER : ANNULE CE QU'ELLE AVAIT PROUVÉ.
 *
 * Appelée quand l'anti-triche gèle l'évidence (`eligibility` repasse à
 * `review`, 0187) ou quand `runs.status` devient `rejected` / `flagged`.
 *
 *  · lien PAS ENCORE CLOS → la qualification est simplement effacée. Le lien
 *    repart en attente ; une autre sortie pourra la rétablir.
 *  · lien DÉJÀ CLOS → révocation : le lien, les octrois et le crédit GRYD+
 *    portent tous `revoked_at`. La collection exclusive disparaît de la lecture
 *    (`my_referral_2026` filtre `revoked_at is null`) et le boost s'éteint.
 *
 * ⚠️ CE QUI N'EST **PAS** REPRIS : les XP de bonus DÉJÀ crédités
 * (`referral_xp_bonus_2026`). Deux raisons, et elles tiennent ensemble :
 * le dépôt ne retire jamais un objet gagné (0144, « Permanence »), et faire
 * BAISSER un niveau affiché serait la seule chose pire qu'un niveau trop haut.
 * La fenêtre, elle, se ferme immédiatement : le tricheur ne gagne rien de plus.
 */
create function public.referral_unqualify_run_2026(p_run_id uuid, p_reason text)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare v_link public.referral_links_2026; v_touched integer := 0;
begin
  for v_link in
    select * from public.referral_links_2026
     where (referrer_run_id = p_run_id or referee_run_id = p_run_id)
       and revoked_at is null
     for update
  loop
    v_touched := v_touched + 1;
    if v_link.completed_at is null then
      update public.referral_links_2026
         set referrer_run_id = case when referrer_run_id = p_run_id then null else referrer_run_id end,
             referrer_qualified_at = case when referrer_run_id = p_run_id then null else referrer_qualified_at end,
             referee_run_id = case when referee_run_id = p_run_id then null else referee_run_id end,
             referee_qualified_at = case when referee_run_id = p_run_id then null else referee_qualified_at end
       where id = v_link.id;
    else
      update public.referral_links_2026
         set revoked_at = now(), revoked_reason = p_reason where id = v_link.id;
      update public.referral_grants_2026
         set revoked_at = now(), revoked_reason = p_reason
       where link_id = v_link.id and revoked_at is null;
      update public.referral_gryd_plus_credits_2026
         set revoked_at = now() where link_id = v_link.id and revoked_at is null;
    end if;
  end loop;
  return v_touched;
end $$;

-- ═══ 6. LES DEUX DÉCLENCHEURS ══════════════════════════════════════════════
/**
 * L'ÉVIDENCE SPORTIVE EST LE SEUL SIGNAL « SORTIE VALIDÉE » DU PIPELINE 2026.
 *
 * `record_progress_evidence_2026` (0119) l'écrit à chaque ingestion, avec
 * `eligibility = 'eligible'` quand la source ET l'horloge sont vérifiées et que
 * l'anti-triche ne demande pas de revue — et `resolve_anticheat_review_2026`
 * (0187) la RÉÉCRIT en `eligible` quand un modérateur blanchit la sortie. Se
 * brancher ici, plutôt que sur l'Edge Function, donne donc les deux chemins
 * (ingestion normale ET blanchiment humain) pour un seul déclencheur, et zéro
 * ligne de TypeScript à modifier.
 */
create function public.referral_activity_trigger_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_run public.runs; v_eligible boolean; v_link record;
begin
  -- Sortie immédiate pour l'immense majorité des sorties du dépôt : ce compte
  -- n'a aucun parrainage ouvert ni clos.
  if not exists(select 1 from public.referral_links_2026
                 where referrer_id = new.user_id or referee_id = new.user_id) then
    return null;
  end if;
  select * into v_run from public.runs where id = new.run_id;
  if not found then return null; end if;
  v_eligible := (new.evidence->>'eligibility') = 'eligible'
    and v_run.status = 'valid'
    and coalesce(v_run.distance_m, 0) >= 1000;  -- game-rules: REFERRAL_MIN_VALIDATED_DISTANCE_M

  if not v_eligible then
    perform public.referral_unqualify_run_2026(new.run_id, 'activity_not_eligible');
    return null;
  end if;

  -- La PREMIÈRE sortie qualifiante est celle qui compte : `… is null` garde la
  -- date d'origine, donc la fenêtre de 30 jours ne se réarme pas à chaque
  -- course.
  update public.referral_links_2026
     set referrer_run_id = new.run_id, referrer_qualified_at = now()
   where referrer_id = new.user_id and revoked_at is null
     and completed_at is null and referrer_qualified_at is null;
  update public.referral_links_2026
     set referee_run_id = new.run_id, referee_qualified_at = now()
   where referee_id = new.user_id and revoked_at is null
     and completed_at is null and referee_qualified_at is null;

  for v_link in select id from public.referral_links_2026
                 where (referrer_id = new.user_id or referee_id = new.user_id)
                   and revoked_at is null and completed_at is null
  loop
    perform public.referral_try_complete_2026(v_link.id);
  end loop;
  return null;
end $$;

create trigger referral_activity_2026
  after insert or update on public.progress_activity_2026
  for each row execute function public.referral_activity_trigger_2026();

/**
 * LE SECOND CHEMIN DE RÉVOCATION : le statut de la course elle-même. Le
 * pipeline de septembre écrit `valid` à l'insertion et ne le rétrograde pas ;
 * le pipeline historique et une intervention d'opérateur, si. Les deux
 * déclencheurs disent la même chose et n'en font qu'un — `revoked_at is null`
 * rend le second appel sans effet.
 */
create function public.referral_run_status_trigger_2026()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.status is distinct from old.status and new.status in ('rejected', 'flagged') then
    perform public.referral_unqualify_run_2026(new.id, 'run_' || new.status);
  end if;
  return null;
end $$;

create trigger referral_run_status_2026
  after update of status on public.runs
  for each row execute function public.referral_run_status_trigger_2026();

-- ═══ 7. LE BOOST ENTRE DANS LE CRÉDIT D'XP ═════════════════════════════════
/**
 * Reprise EXACTE de la version 0144, avec un seul ajout : le bonus de
 * parrainage. Tout le reste (concurrence optimiste, reçu de course dans la même
 * transaction, paliers de saison, objets de niveau) est inchangé.
 *
 * ─── L'ARITHMÉTIQUE, ÉCRITE UNE FOIS POUR TOUTES ──────────────────────────
 * Le registre rendu par le TypeScript porte le total PUR. Le total STOCKÉ porte
 * le total pur PLUS la somme des bonus déjà journalisés. On retranche donc les
 * bonus avant de comparer, et on les rajoute avant d'écrire :
 *
 *   base_avant = stocké − bonus_avant
 *   delta_base = base_nouveau − base_avant       ← ce que la sortie a vraiment valu
 *   bonus      = ⌊delta_base × (1,5 − 1)⌋        ← ce que le boost y ajoute
 *   stocké     = base_nouveau + bonus_après
 *
 * Un second appel au même `version` retrouve `delta_base = 0`, n'écrit aucun
 * bonus, recompose le MÊME registre, et ne pose donc aucune correction : la
 * contrainte `unique(user_id, version)` de `progress_corrections_2026` n'est
 * jamais heurtée. C'est la propriété qui rend cette fonction rejouable.
 *
 * `p_run_id` NULL (recalcul sans sortie) ne crédite AUCUN bonus : un boost
 * récompense une sortie, pas un recalcul.
 *
 * ⚠️ `ledger.collections` N'EST JAMAIS BOOSTÉ. Les paliers de collection de
 * saison lisent `p_ledger` (le registre pur) ci-dessous, et pas le registre
 * recomposé : un calendrier de saison n'est pas une récompense de recrutement.
 */
create or replace function public.commit_progress_2026(p_user_id uuid, p_version bigint, p_ledger jsonb, p_run_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  account public.progress_accounts_2026; xp_delta integer; run_xp integer;
  v_multiplier constant numeric := 1.5;  -- game-rules: REFERRAL_XP_BOOST_2026.multiplier
  v_bonus_before integer; v_base_before integer; v_base_new integer;
  v_base_delta integer; v_bonus integer; v_bonus_after integer; v_ledger jsonb;
begin
  select * into strict account from public.progress_accounts_2026 where user_id=p_user_id for update;
  if not exists(select 1 from public.users where id=p_user_id and deletion_requested_at is null) then raise exception 'account_unavailable'; end if;
  if account.version<>p_version then return jsonb_build_object('committed',false,'xpDelta',0); end if;
  if p_run_id is not null then select xp_awarded into strict run_xp from public.runs where id=p_run_id and user_id=p_user_id; end if;

  v_bonus_before := public.referral_xp_bonus_total_2026(p_user_id);
  v_base_before  := coalesce((account.ledger->>'totalXp')::integer,0) - v_bonus_before;
  v_base_new     := coalesce((p_ledger->>'totalXp')::integer,0);
  v_base_delta   := v_base_new - v_base_before;
  if p_run_id is not null and v_base_delta > 0 and public.referral_boost_active_2026(p_user_id, now()) then
    v_bonus := floor(v_base_delta * (v_multiplier - 1))::integer;
    if v_bonus > 0 then
      insert into public.referral_xp_bonus_2026(user_id,run_id,base_xp,bonus_xp,multiplier)
        values(p_user_id,p_run_id,v_base_delta,v_bonus,v_multiplier) on conflict do nothing;
    end if;
  end if;
  v_bonus_after := public.referral_xp_bonus_total_2026(p_user_id);
  v_ledger := jsonb_set(p_ledger,'{totalXp}',to_jsonb(v_base_new + v_bonus_after));
  xp_delta := (v_base_new + v_bonus_after) - coalesce((account.ledger->>'totalXp')::integer,0);

  if account.ledger is distinct from v_ledger then
    insert into public.progress_corrections_2026(user_id,version,previous_ledger,new_ledger) values(p_user_id,p_version,account.ledger,v_ledger);
    update public.progress_accounts_2026 set ledger=v_ledger,ledger_version=p_version where user_id=p_user_id;
    if p_run_id is not null then
      update public.runs set xp_awarded=xp_awarded+greatest(xp_delta,0) where id=p_run_id and user_id=p_user_id returning xp_awarded into run_xp;
    end if;
  else update public.progress_accounts_2026 set ledger_version=p_version where user_id=p_user_id;
  end if;
  insert into public.season_reward_ownership_2026(user_id,collection_id,reward_id,variant,ledger_version)
    select p_user_id,e.collection_id,r.reward_id,'standard',p_version
    from public.season_collection_enrollments_2026 e cross join public.season_reward_templates_2026 r
    cross join public.season_collection_rules_2026 rule
    where e.user_id=p_user_id and coalesce((p_ledger->'collections'->>e.collection_id)::integer,0)>=r.tier*rule.xp_per_tier
    on conflict do nothing;
  perform public.grant_earned_season_variants2026(p_user_id);
  perform public.grant_level_rewards_2026(p_user_id);
  return jsonb_build_object('committed',true,'xpDelta',xp_delta,'runXpAwarded',run_xp);
end $$;

-- ═══ 8. LES DEUX RPC DU CLIENT ═════════════════════════════════════════════
/**
 * SAISIR UN CODE. La seule écriture qu'un client puisse déclencher, et elle
 * n'octroie RIEN : elle noue un lien. La récompense vient d'une sortie.
 *
 * Refus NOMMÉS (jamais un « réessaie » opaque) :
 *   bad_code · unknown_code · self_referral · already_referred · reciprocity ·
 *   account_too_old
 */
create function public.redeem_referral_code_2026(p_code text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_me uuid := auth.uid();
  v_code text;
  v_owner uuid;
  v_created timestamptz;
  v_link_id bigint;
  v_run uuid;
begin
  if v_me is null then raise exception 'authentication_required'; end if;
  v_code := public.normalize_referral_code_2026(p_code);
  if v_code is null or v_code !~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;
  select created_at into v_created from public.users where id = v_me and deletion_requested_at is null;
  if v_created is null then raise exception 'account_unavailable'; end if;
  select c.user_id into v_owner from public.referral_codes_2026 c
    join public.users u on u.id = c.user_id and u.deletion_requested_at is null
   where c.code = v_code;
  if v_owner is null then return jsonb_build_object('ok', false, 'reason', 'unknown_code'); end if;
  if v_owner = v_me then return jsonb_build_object('ok', false, 'reason', 'self_referral'); end if;
  if exists(select 1 from public.referral_links_2026 where referee_id = v_me) then
    return jsonb_build_object('ok', false, 'reason', 'already_referred');
  end if;
  -- Réciprocité : A parraine B, B ne peut pas parrainer A. La paire fabriquerait
  -- deux récompenses pour zéro nouvel utilisateur.
  if exists(select 1 from public.referral_links_2026
             where referrer_id = v_me and referee_id = v_owner and revoked_at is null) then
    return jsonb_build_object('ok', false, 'reason', 'reciprocity');
  end if;
  -- game-rules: REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS = 7
  if v_created < now() - interval '7 days' then
    return jsonb_build_object('ok', false, 'reason', 'account_too_old');
  end if;

  insert into public.referral_links_2026(referrer_id, referee_id, code, season_key)
    values(v_owner, v_me, v_code, public.referral_season_key_2026(now()))
    returning id into v_link_id;

  -- RATTRAPAGE : les sorties déjà validées comptent. Un parrain qui court
  -- depuis six mois n'a pas à ressortir pour que son filleul soit récompensé,
  -- et un filleul qui a couru avant de taper le code non plus.
  v_run := public.referral_qualifying_run_2026(v_owner);
  if v_run is not null then
    update public.referral_links_2026 set referrer_run_id = v_run, referrer_qualified_at = now() where id = v_link_id;
  end if;
  v_run := public.referral_qualifying_run_2026(v_me);
  if v_run is not null then
    update public.referral_links_2026 set referee_run_id = v_run, referee_qualified_at = now() where id = v_link_id;
  end if;
  perform public.referral_try_complete_2026(v_link_id);

  return jsonb_build_object('ok', true, 'linkId', v_link_id,
    'state', (select case
        when l.completed_at is not null then 'rewarded'
        when l.referee_qualified_at is null then 'awaiting_my_run'
        else 'awaiting_sponsor_run' end
      from public.referral_links_2026 l where l.id = v_link_id));
end $$;

/** L'état d'un lien, DU POINT DE VUE de celui qui lit. Six états, jamais un de plus. */
create function public.referral_link_state_2026(p_link public.referral_links_2026, p_viewer uuid)
returns text language sql immutable set search_path=public,pg_temp as $$
  select case
    when p_link.revoked_reason = 'window_expired' then 'expired'
    when p_link.revoked_at is not null then 'revoked'
    when p_link.completed_at is not null and p_link.referrer_capped and p_link.referrer_id = p_viewer then 'capped'
    when p_link.completed_at is not null then 'rewarded'
    when p_link.referee_qualified_at is null then 'awaiting_referee_run'
    when p_link.referrer_qualified_at is null then 'awaiting_referrer_run'
    else 'awaiting_referee_run' end;
$$;

/**
 * MON PARRAINAGE, EN UNE LECTURE. Rend le code (créé à la volée si besoin),
 * l'état de chaque filleul, mes récompenses réelles et la prochaine étape.
 *
 * ⚠️ ELLE NE REND AUCUN `user_id`, ET AUCUN LIEN. Le pseudo suffit à savoir de
 * qui on parle, et l'adresse `gryd://r/<code>` est construite PAR L'APP à
 * partir de son propre schéma (`app.json`) : un serveur qui écrirait `gryd://`
 * deviendrait une seconde source de vérité pour une valeur qu'il ne peut pas
 * vérifier — exactement la faute qu'`INVITE_HOSTS` évite côté crew.
 *
 * `nextStep` est DÉRIVÉE de l'état, jamais d'un compteur : « partage »
 * (personne n'a encore saisi mon code), « cours » (c'est MOI qui manque),
 * « attends » (l'autre manque), « rien à faire ».
 */
create function public.my_referral_2026()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_me uuid := auth.uid();
  v_code text;
  v_created timestamptz;
  v_mine_qualified boolean;
  v_open integer;
  v_open_mine integer;
  v_done integer;
begin
  if v_me is null then raise exception 'authentication_required'; end if;
  select created_at into v_created from public.users where id = v_me and deletion_requested_at is null;
  if v_created is null then raise exception 'account_unavailable'; end if;
  v_code := public.ensure_referral_code_2026(v_me);
  v_mine_qualified := public.referral_qualifying_run_2026(v_me) is not null;
  select count(*) filter (where l.completed_at is null),
         count(*) filter (where l.completed_at is null
           and ((l.referrer_id = v_me and l.referrer_qualified_at is null)
             or (l.referee_id = v_me and l.referee_qualified_at is null))),
         count(*) filter (where l.completed_at is not null)
    into v_open, v_open_mine, v_done
    from public.referral_links_2026 l
   where (l.referrer_id = v_me or l.referee_id = v_me) and l.revoked_at is null;

  return jsonb_build_object(
    'code', v_code,
    'accountAgeDays', floor(extract(epoch from (now() - v_created)) / 86400)::integer,
    -- game-rules: REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS = 7
    'canRedeem', not exists(select 1 from public.referral_links_2026 where referee_id = v_me)
                 and v_created >= now() - interval '7 days',
    'redeemBlockedReason', case
      when exists(select 1 from public.referral_links_2026 where referee_id = v_me) then 'already_referred'
      when v_created < now() - interval '7 days' then 'account_too_old'
      else null end,
    'myRunDone', v_mine_qualified,
    'sponsor', (select jsonb_build_object('pseudo', u.pseudo,
        'state', public.referral_link_state_2026(l, v_me))
      from public.referral_links_2026 l join public.users u on u.id = l.referrer_id
      where l.referee_id = v_me),
    'referees', coalesce((select jsonb_agg(jsonb_build_object(
        'pseudo', u.pseudo, 'state', public.referral_link_state_2026(l, v_me),
        'redeemedAt', l.redeemed_at, 'completedAt', l.completed_at)
        order by l.redeemed_at desc)
      from public.referral_links_2026 l join public.users u on u.id = l.referee_id
      where l.referrer_id = v_me), '[]'::jsonb),
    'rewards', coalesce((select jsonb_agg(jsonb_build_object(
        'kind', g.kind, 'rewardId', g.reward_id, 'side', g.side,
        'grantedAt', g.granted_at, 'boostEndsAt', g.boost_ends_at,
        'boostMultiplier', g.boost_multiplier) order by g.granted_at, g.id)
      from public.referral_grants_2026 g
      where g.user_id = v_me and g.revoked_at is null), '[]'::jsonb),
    'boostActive', public.referral_boost_active_2026(v_me, now()),
    'bonusXp', public.referral_xp_bonus_total_2026(v_me),
    'grydPlusCredit', (select jsonb_build_object('days', sum(c.days)::integer,
        'state', case when bool_or(c.consumed_at is not null and c.ends_at > now()) then 'running'
                      when bool_or(c.consumed_at is null) then 'banked'
                      else 'ended' end,
        'endsAt', max(c.ends_at))
      from public.referral_gryd_plus_credits_2026 c
      where c.user_id = v_me and c.revoked_at is null
      having count(*) > 0),
    -- game-rules: REFERRAL_MAX_ACTIVE_PER_SEASON = 5
    'remainingThisSeason', greatest(0, 5 - (select count(*)::integer from public.referral_links_2026 l
      where l.referrer_id = v_me and l.season_key = public.referral_season_key_2026(now())
        and l.completed_at is not null and l.revoked_at is null and not l.referrer_capped)),
    'nextStep', case when v_open_mine > 0 then 'run'
                     when v_open > 0 then 'wait'
                     when v_done > 0 then 'done'
                     else 'share' end);
end $$;

revoke all on function public.referral_boost_active_2026(uuid, timestamptz),
  public.referral_xp_bonus_total_2026(uuid), public.referral_season_key_2026(timestamptz),
  public.referral_qualifying_run_2026(uuid), public.referral_try_complete_2026(bigint),
  public.referral_unqualify_run_2026(uuid, text), public.referral_activity_trigger_2026(),
  public.referral_run_status_trigger_2026(),
  public.referral_link_state_2026(public.referral_links_2026, uuid),
  public.commit_progress_2026(uuid, bigint, jsonb, uuid),
  public.redeem_referral_code_2026(text), public.my_referral_2026()
  from public, anon, authenticated;
grant execute on function public.referral_boost_active_2026(uuid, timestamptz),
  public.referral_xp_bonus_total_2026(uuid), public.referral_season_key_2026(timestamptz),
  public.referral_qualifying_run_2026(uuid), public.referral_try_complete_2026(bigint),
  public.referral_unqualify_run_2026(uuid, text),
  public.referral_link_state_2026(public.referral_links_2026, uuid),
  public.commit_progress_2026(uuid, bigint, jsonb, uuid) to service_role;
-- Les DEUX seules portes du client. `redeem` écrit un lien, jamais une
-- récompense ; `my_referral` lit, et ne rend jamais l'identifiant d'un tiers.
grant execute on function public.redeem_referral_code_2026(text) to authenticated;
grant execute on function public.my_referral_2026() to authenticated;

comment on table public.referral_grants_2026 is
  'Journal des octrois de parrainage (dérogation fondateur du 11/09/2026, '
  'ADR-017 brouillon). Collection exclusive + boost d''XP de progression + '
  'crédit GRYD+. AUCUN point de territoire, de performance ni de défi.';
comment on table public.referral_xp_bonus_2026 is
  'Bonus d''XP de progression crédité par une fenêtre de boost, une ligne par '
  'sortie. Additif au registre 0119, jamais fondu dedans : le grand livre reste '
  'un recalcul pur et rejouable.';
comment on function public.redeem_referral_code_2026(text) is
  'Saisie d''un code : noue un lien, n''octroie rien. Refus nommés : bad_code, '
  'unknown_code, self_referral, already_referred, reciprocity, account_too_old.';
comment on function public.my_referral_2026() is
  'Mon code, mes filleuls et leur état, mes récompenses réelles, la prochaine '
  'étape. Ne rend aucun user_id et aucune adresse : l''app construit son lien.';
