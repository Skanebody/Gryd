-- GRYD — 0051 crew_pings : coordonner un crew de 20 SANS ouvrir un chat libre.
-- AMENDEMENT-44 A4 (messages contextuels) + A5 (ping de zone).
--
-- ═══ POURQUOI CETTE TABLE EXISTE ════════════════════════════════════════════
-- Cinq messages génériques ne permettent pas à vingt personnes de s'organiser.
-- Mais ouvrir la saisie libre est REFUSÉ par la doctrine (A-43 §9 : modération,
-- sécurité des mineurs, signalements, charge juridique). Cette table est la
-- troisième voie : un ping n'est PAS un message, c'est un COUPLE
--   (clé de signal issue d'un catalogue fermé)  ×  (secteur RÉEL du crew).
-- Le texte affiché est composé à l'écran, dans la langue du lecteur, à partir de
-- ces deux références. Aucun caractère saisi par un humain n'est stocké ici.
--
-- ═══ CE QUI REND LA MODÉRATION INUTILE (et non « allégée ») ═════════════════
-- `signal` est contraint par forme : ^[a-z_]{3,32}$. Ni espace, ni chiffre, ni
-- accent, ni ponctuation, ni majuscule, 32 caractères max. Il est donc
-- IMPOSSIBLE d'y faire passer une phrase, une insulte, un pseudo ou une URL,
-- même en forgeant l'appel HTTP à la main.
--
-- Le catalogue des 15 clés valides n'est volontairement PAS répliqué en SQL :
-- sa source unique est packages/engine/src/crewSignals.ts (`CREW_SIGNALS`).
-- Une liste ici serait une deuxième vérité, qui dériverait au premier signal
-- ajouté — et un `check` obsolète refuserait un signal légitime en production.
-- Une clé hors catalogue reste donc insérable, et c'est assumé : elle n'est
-- JAMAIS rendue (visibleCrewPings l'écarte, cf. le test « un signal inconnu du
-- client est écarté, pas rendu en clair »). Elle ne peut donc rien communiquer.
--
-- ═══ CE QUI EST DÉLIBÉRÉMENT ABSENT ═════════════════════════════════════════
--   · aucune colonne de texte libre, aucun champ « note », aucune pièce jointe ;
--   · aucun h3index (« tout claim est décidé serveur » : un ping ne désigne
--     jamais une zone précise à capturer, seulement un SECTEUR) ;
--   · aucune identité de crew adverse (la doctrine bannit les rivaux fabriqués
--     et nommer un vrai crew ouvrirait un vecteur de harcèlement) ;
--   · aucun destinataire : un ping s'adresse au crew, pas à une personne. Il n'y
--     a donc pas de message privé possible, même détourné.
--
-- ═══ BORNES ANTI-SPAM : PARAMÈTRES, JAMAIS EN DUR ═══════════════════════════
-- TTL, cooldown et nombre de pings actifs par membre sont des RÈGLES DE JEU :
-- leur source unique est packages/shared/src/game-rules.ts
-- (CREW_PING_TTL_H, CREW_PING_COOLDOWN_MIN, CREW_PING_MAX_ACTIVE_PER_MEMBER).
-- La RPC les REÇOIT, exactement comme les fenêtres de `crew_mission_inputs`
-- (0049), et refuse une valeur absente ou absurde plutôt que d'y substituer un
-- défaut que personne n'a décidé.

create table public.crew_pings (
  id             uuid primary key default gen_random_uuid(),
  crew_id        uuid not null references public.crews (id) on delete cascade,
  author_user_id uuid not null references public.users (id) on delete cascade,
  -- Clé de catalogue, jamais du texte. Voir l'exposé ci-dessus sur le `check`.
  signal         text not null check (signal ~ '^[a-z_]{3,32}$'),
  -- null = signal de portée « crew » (« sortie ce soir ? ») : il n'a pas de lieu.
  -- Ce n'est pas un lieu manquant, c'est un signal qui n'en a pas besoin.
  sector_id      uuid references public.sectors (id) on delete cascade,
  created_at     timestamptz not null default now(),
  -- Portée par le SERVEUR, jamais par un timer client (qui mentirait après un
  -- vol long-courrier ou une horloge décalée).
  expires_at     timestamptz not null
);

-- Lecture du mur : les pings VIVANTS d'un crew, les plus récents d'abord.
create index crew_pings_crew_idx
  on public.crew_pings (crew_id, created_at desc);

-- Compte des pings actifs d'un membre + cooldown : les deux requêtes de la RPC.
create index crew_pings_author_idx
  on public.crew_pings (author_user_id, created_at desc);

alter table public.crew_pings enable row level security;

-- Écriture client INTERDITE en direct (doctrine repo) : le seul chemin est
-- `crew_ping_zone`, SECURITY DEFINER à search_path épinglé, qui re-vérifie tout.
revoke insert, update, delete on public.crew_pings from anon, authenticated;
revoke select on public.crew_pings from anon;

-- Lecture réservée aux membres ACTIFS du même crew. Un ping n'est ni public ni
-- archivé : quitter le crew, c'est cesser de le voir.
create policy crew_pings_select_crewmates on public.crew_pings
  for select to authenticated
  using (
    exists (
      select 1
      from public.crew_members cm
      where cm.crew_id = crew_pings.crew_id
        and cm.user_id = (select auth.uid())
        and cm.left_at is null
    )
  );

-- ═══ 1. crew_ping_zone() — le seul chemin d'écriture ════════════════════════
-- Re-vérifie SERVEUR tout ce que l'écran a anticipé côté client
-- (`crewPingDecision`, moteur pur testé) : le client n'a jamais le dernier mot.
-- ═══════════════════════════════════════════════════════════════════════════
-- CORRECTIF ANTI-SPAM (vérification adversariale 21/07) — LES BORNES SONT AU
-- SERVEUR, PAS DANS LES PARAMÈTRES.
--
-- La version initiale recevait ttl/cooldown/max_active DU CLIENT et ne validait
-- que leur plausibilité (> 0). Prouvé au harnais : avec cooldown=0 et
-- max_active=1000, 12 pings passaient d'affilée et 13 restaient actifs contre
-- un plafond de 2. Le commentaire « le client n'a jamais le dernier mot » était
-- donc faux pour la seule chose qui comptait — sur une surface sociale dont
-- toute la justification est « pas besoin de modération ». Un mur de crew
-- inondable est un vecteur de harcèlement.
--
-- Les bornes sont désormais des FONCTIONS SERVEUR, miroir de game-rules.ts
-- (même patron que account_deletion_grace_days(), 0046). Les paramètres du
-- client sont IGNORÉS — ils restent dans la signature pour ne casser aucun
-- appelant, mais n'ont plus d'effet.
-- ═══════════════════════════════════════════════════════════════════════════

-- game-rules: CREW_PING_TTL_H
create or replace function public.crew_ping_ttl_h()
returns integer language sql immutable as $$ select 12 $$;
-- game-rules: CREW_PING_COOLDOWN_MIN
create or replace function public.crew_ping_cooldown_min()
returns integer language sql immutable as $$ select 5 $$;
-- game-rules: CREW_PING_MAX_ACTIVE_PER_MEMBER
create or replace function public.crew_ping_max_active()
returns integer language sql immutable as $$ select 1 $$;

revoke all on function public.crew_ping_ttl_h()        from public, anon, authenticated;
revoke all on function public.crew_ping_cooldown_min() from public, anon, authenticated;
revoke all on function public.crew_ping_max_active()   from public, anon, authenticated;

create or replace function public.crew_ping_zone(
  p_signal           text,
  p_sector_id        uuid,
  p_ttl_h            integer,
  p_cooldown_min     integer,
  p_max_active       integer,
  p_reclaim_window_h integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_crew_id   uuid;
  v_last      timestamptz;
  v_active    integer;
  v_ok_sector boolean;
  v_expires   timestamptz;
  v_id        uuid;
  v_replaced  boolean := false;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- ⚠ LES BORNES VIENNENT DU SERVEUR, PAS DES PARAMÈTRES (correctif 21/07).
  -- p_ttl_h / p_cooldown_min / p_max_active sont IGNORÉS : les accepter du
  -- client rendait l'anti-spam contournable (cooldown=0, max_active=1000 →
  -- mur de crew inondable, donc vecteur de harcèlement). Ils restent dans la
  -- signature pour ne casser aucun appelant, et sont écrasés ici.
  p_ttl_h        := public.crew_ping_ttl_h();
  p_cooldown_min := public.crew_ping_cooldown_min();
  p_max_active   := public.crew_ping_max_active();
  -- Seule la fenêtre de reprise reste un paramètre de LECTURE (elle ne borne
  -- aucun quota, elle qualifie la pertinence d'un signal) — validée quand même.
  if p_reclaim_window_h is null or p_reclaim_window_h < 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_bounds');
  end if;

  -- Forme du signal re-vérifiée AVANT toute écriture : le `check` de table
  -- lèverait bien une exception, mais elle remonterait en erreur opaque au
  -- client là où le contrat de cette RPC est de renvoyer un motif nommé.
  if p_signal is null or p_signal !~ '^[a-z_]{3,32}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_signal');
  end if;

  -- Adhésion ACTIVE unique (index partiel crew_members_one_active_per_user).
  select cm.crew_id into v_crew_id
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- ─── Le secteur est-il RÉELLEMENT au crew ? ──────────────────────────────
  -- Miroir exact de `pingableSectors` (moteur) : le crew y tient des zones
  -- vivantes, OU il vient d'y perdre dans la fenêtre de reprise. Sans cette
  -- vérification, un client forgé pourrait épingler n'importe quel quartier de
  -- la ville — l'app afficherait alors un lieu où le crew n'a jamais couru.
  if p_sector_id is not null then
    select exists (
      select 1
      from public.hex_claims hc
      join public.crew_members cm
        on cm.user_id = hc.owner_user_id
       and cm.crew_id = v_crew_id
       and cm.left_at is null
      where hc.sector_id = p_sector_id
        and (hc.decay_at is null or hc.decay_at > now())
    ) or exists (
      select 1
      from public.contested_group_runs cg
      join public.hex_claims hc2 on hc2.h3index = cg.h3index
      where hc2.sector_id = p_sector_id
        and cg.prev_owner_crew_id = v_crew_id
        and cg.winner_crew_id is not null
        and cg.winner_crew_id <> v_crew_id
        and cg.created_at >= now() - make_interval(hours => p_reclaim_window_h)
    ) into v_ok_sector;

    if not v_ok_sector then
      return jsonb_build_object('ok', false, 'reason', 'sector_not_allowed');
    end if;

    -- Le secteur doit aussi porter un nom NON VIDE. `sectors.name` est NOT NULL
    -- (0002:84), donc ce cas ne vient pas d'un secteur « pas encore géocodé » —
    -- celui-là n'a tout simplement pas de ligne, et `p_sector_id` serait alors
    -- introuvable. Le garde vise le nom BLANC, qui passerait le NOT NULL et
    -- ferait afficher « KORO a pingé  » : un lieu vide est un mensonge muet.
    if not exists (
      select 1 from public.sectors s
      where s.id = p_sector_id and s.name is not null and btrim(s.name) <> ''
    ) then
      return jsonb_build_object('ok', false, 'reason', 'sector_unnamed');
    end if;
  end if;

  -- ─── Cooldown ────────────────────────────────────────────────────────────
  -- Calculé sur l'horloge SERVEUR : une horloge client en arrière ne l'ouvre pas.
  select max(created_at) into v_last
  from public.crew_pings
  where author_user_id = v_uid;

  if v_last is not null and v_last > now() - make_interval(mins => p_cooldown_min) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'cooldown',
      -- Arrondi vers le HAUT : annoncer 4 s quand il en reste 4,2 ferait échouer
      -- la seconde tentative — « ça ne marche pas » est pire qu'attendre.
      'retryInS', ceil(extract(epoch from (v_last + make_interval(mins => p_cooldown_min)) - now()))::integer
    );
  end if;

  -- ─── Plafond de pings actifs : le nouveau REMPLACE l'ancien ──────────────
  -- Remplacer plutôt que refuser : refuser obligerait à comprendre une règle
  -- invisible pour corriger une simple erreur de tap. La suppression garde les
  -- (p_max_active - 1) plus RÉCENTS, pour que le ping conservé soit celui qui
  -- décrit le mieux l'intention actuelle.
  select count(*)::integer into v_active
  from public.crew_pings
  where author_user_id = v_uid and expires_at > now();

  if v_active >= p_max_active then
    v_replaced := true;
    delete from public.crew_pings
    where id in (
      select id from public.crew_pings
      where author_user_id = v_uid and expires_at > now()
      order by created_at desc
      offset greatest(p_max_active - 1, 0)
    );
  end if;

  v_expires := now() + make_interval(hours => p_ttl_h);

  insert into public.crew_pings (crew_id, author_user_id, signal, sector_id, expires_at)
  values (v_crew_id, v_uid, p_signal, p_sector_id, v_expires)
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'expiresAt', v_expires,
    'replaced', v_replaced
  );
end;
$$;

-- ═══ 2. crew_pings_feed() — la lecture de l'écran ═══════════════════════════
-- Une seule RPC plutôt que trois requêtes client : le mur, PLUS ce que le client
-- doit connaître de MOI pour anticiper honnêtement le prochain ping (compte
-- actif, dernier envoi). Sans ces deux valeurs, l'écran proposerait « Pinger »
-- puis essuierait un refus serveur — c'est-à-dire mentirait sur l'issue.
create or replace function public.crew_pings_feed(
  p_limit integer
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_pings   jsonb;
  v_active  integer;
  v_last    timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if p_limit is null or p_limit < 1 then
    return jsonb_build_object('ok', false, 'reason', 'bad_limit');
  end if;

  select cm.crew_id into v_crew_id
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- Le pseudo vient de public_profiles (modéré à l'inscription, 0047) — jamais
  -- d'une colonne libre. Le nom de secteur vient de sectors.name (géocodé réel).
  -- Les DEUX sont des références, aucune n'est composée ici : la phrase
  -- « KORO a pingé République » est assemblée à l'écran, dans la langue du
  -- lecteur. Composer du français en SQL casserait l'i18n 5 langues.
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',           p.id,
        'authorUserId', p.author_user_id,
        'authorPseudo', pp.pseudo,
        'signal',       p.signal,
        'sectorId',     p.sector_id,
        'sectorName',   s.name,
        'createdAt',    p.created_at,
        'expiresAt',    p.expires_at
      )
      order by p.created_at desc, p.id asc
    ),
    '[]'::jsonb
  )
  into v_pings
  from (
    select cp.*
    from public.crew_pings cp
    where cp.crew_id = v_crew_id
      and cp.expires_at > now()
    order by cp.created_at desc, cp.id asc
    limit p_limit
  ) p
  left join public.public_profiles pp on pp.id = p.author_user_id
  left join public.sectors s on s.id = p.sector_id;

  select count(*)::integer, max(created_at)
  into v_active, v_last
  from public.crew_pings
  where author_user_id = v_uid and expires_at > now();

  return jsonb_build_object(
    'ok', true,
    'pings', coalesce(v_pings, '[]'::jsonb),
    'mine', jsonb_build_object(
      'activeCount', coalesce(v_active, 0),
      -- max() sur des lignes VIVANTES seulement : ce champ sert au cooldown, or
      -- un ping expiré n'a pas à rouvrir un droit d'envoi. La RPC d'écriture
      -- reste de toute façon seule juge (elle regarde TOUT l'historique).
      'lastPingAt', v_last
    )
  );
end;
$$;

-- ═══ 3. Grants ═══════════════════════════════════════════════════════════════
-- `from public, anon` et PAS `from anon` seul : Postgres accorde d'office
-- EXECUTE à PUBLIC à la création de toute fonction, et anon est membre de
-- PUBLIC — révoquer sur anon seul laisserait le droit HÉRITÉ intact
-- (has_function_privilege('anon', …) resterait TRUE). Patron 0049:§2 / 0044:§2.
revoke all on function public.crew_ping_zone(text, uuid, integer, integer, integer, integer)
  from public, anon;
grant execute on function public.crew_ping_zone(text, uuid, integer, integer, integer, integer)
  to authenticated;

revoke all on function public.crew_pings_feed(integer) from public, anon;
grant execute on function public.crew_pings_feed(integer) to authenticated;

comment on table public.crew_pings is
  'AMENDEMENT-44 A5 — pings de zone. Un ping = (clé de signal du catalogue '
  'fermé engine/crewSignals.ts) × (secteur RÉEL du crew, ou null pour un signal '
  'de crew). AUCUN texte libre n''est stockable : `signal` est contraint par '
  'forme (^[a-z_]{3,32}$) et le libellé est composé à l''écran dans la langue du '
  'lecteur. Écriture client interdite : seule crew_ping_zone() écrit.';

comment on function public.crew_ping_zone(text, uuid, integer, integer, integer, integer) is
  'Seul chemin d''écriture d''un ping. Re-vérifie SERVEUR ce que le moteur pur '
  'crewPingDecision anticipe côté écran : forme du signal, appartenance RÉELLE '
  'du secteur au crew (zones tenues OU perdues dans la fenêtre de reprise), '
  'secteur NOMMÉ, cooldown sur horloge serveur, plafond de pings actifs (le '
  'nouveau remplace le plus ancien). TTL / cooldown / plafond / fenêtre de '
  'reprise sont des PARAMÈTRES : leur source unique est game-rules.ts ; une '
  'valeur absente ou absurde est refusée, jamais remplacée par un défaut.';

comment on function public.crew_pings_feed(integer) is
  'Mur des pings VIVANTS de mon crew (pseudo + nom de secteur résolus par '
  'référence, jamais de phrase composée en SQL) + `mine` (pings actifs, dernier '
  'envoi) pour que l''écran anticipe honnêtement le prochain ping au lieu de '
  'proposer une action qui sera refusée. LECTURE SEULE.';
