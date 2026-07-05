-- GRYD — 0015 Frontières partielles crew (AMENDEMENT-17 §CHANTIER 2, 05/07/2026).
-- « Ouvre une frontière. Ton crew peut la fermer. »
-- Source de vérité des constantes : packages/shared/src/game-rules.ts
--   (PARTIAL_BOUNDARY_TTL_H, PARTIAL_JOIN_TOLERANCE_M, FINISHER_MIN_SEGMENT_M,
--    FINISHER_MIN_SHARE). La géométrie (segments/missing_segment) est décidée
--    par le moteur pur engine/boundary.ts — la DB ne stocke que l'état.
--
-- Un run VALIDE, long, NON bouclé mais FERMABLE crée une partial_boundary `open`
-- du crew (gardée PARTIAL_BOUNDARY_TTL_H). Un membre du MÊME crew qui court le
-- segment manquant referme la boucle → status `completed`, zone attribuée au
-- crew (cellules intérieures via le moteur AMENDEMENT-12), contributions
-- réparties au prorata de la longueur validée (boundary_contributions).
--
-- ANTI-ABUS (appliqué par ingest_run, moteur pur testé) : même crew uniquement
-- (rival qui chevauche → status `contested`, pas de complétion au MVP) ; TTL
-- 24 h (expiré → status `expired`, segments comptés en exploration, pas de
-- zone) ; tous segments GRYD Verified ; contribution min du finisher ; jamais
-- de complétion par achat.
--
-- RLS (style 0003/0010/0014) : SELECT par membre ACTIF du crew (via
-- crew_members) — la géométrie fine (segments/polylines) n'est de toute façon
-- PAS renvoyée au client par les Edge Functions ; ÉCRITURE service_role only
-- partout (le client n'ouvre/ne ferme jamais une frontière côté DB).

-- ═══ 1. partial_boundaries : frontières ouvertes/fermées ═════════════════════
create table if not exists public.partial_boundaries (
  id                uuid primary key default gen_random_uuid(),
  crew_id           uuid not null references public.crews (id) on delete cascade,
  opener_user_id    uuid not null references public.users (id) on delete cascade,
  -- Ville de rattachement déclarée (classements) — nullable (France entière).
  -- FK city_zones.city_id, comme runs/crews (0002/0010).
  city_id           text references public.city_zones (city_id) on delete set null,
  -- Nom lisible de la frontière (secteur/zone, ex. « République ») — UX.
  name              text not null,
  -- Contributions validées [{ userId, validatedLengthM }] (ouvreur + finisher).
  -- Géométrie serveur only : jamais renvoyée au client (pas de polyline exposée).
  segments          jsonb not null default '[]'::jsonb,
  -- Anneau OUVERT tracé par l'ouvreur ([{lat,lng}, …], serveur only) : requis
  -- pour recalculer l'INTÉRIEUR de la boucle une fois fermée (enclosedCells,
  -- moteur AMENDEMENT-12) et décider les claims serveur. JAMAIS renvoyé au
  -- client (aucune Edge Function ne met de polyline dans la réponse).
  opener_ring       jsonb not null default '[]'::jsonb,
  total_length_m    numeric(10, 2) not null check (total_length_m >= 0),
  -- Mètres restants pour fermer la boucle (segment manquant). UX : « il manque N m ».
  missing_m         numeric(10, 2) not null check (missing_m >= 0),
  -- Les deux bouts ouverts [{lat,lng},{lat,lng}] du segment manquant (serveur only).
  missing_segment   jsonb not null,
  -- Aire estimée (km²) de la zone si fermée — indicatif.
  zone_estimate_km2 numeric(8, 4) not null default 0 check (zone_estimate_km2 >= 0),
  status            text not null default 'open'
                      check (status in ('open', 'completed', 'expired', 'contested')),
  created_at        timestamptz not null default now(),
  -- Expiration = created_at + PARTIAL_BOUNDARY_TTL_H (posée par ingest_run).
  expires_at        timestamptz not null
);

-- Index (crew_id, status, expires_at) : chargement des frontières OUVERTES d'un
-- crew (ingest_run : complétion) et balayage des expirées (digest_job).
create index if not exists partial_boundaries_crew_status_idx
  on public.partial_boundaries (crew_id, status, expires_at);

-- ═══ 2. boundary_contributions : parts d'une frontière fermée ════════════════
-- Une ligne par membre ayant contribué (ouvreur + finisher), avec sa longueur
-- validée et sa part au prorata (contributionSplit, somme = 1 par frontière).
create table if not exists public.boundary_contributions (
  id                 uuid primary key default gen_random_uuid(),
  boundary_id        uuid not null references public.partial_boundaries (id) on delete cascade,
  user_id            uuid not null references public.users (id) on delete cascade,
  validated_length_m numeric(10, 2) not null check (validated_length_m >= 0),
  share              numeric(6, 5) not null check (share >= 0 and share <= 1),
  created_at         timestamptz not null default now(),
  unique (boundary_id, user_id)
);
create index if not exists boundary_contributions_boundary_idx
  on public.boundary_contributions (boundary_id);

-- ═══ 3. RLS (style 0003/0010/0014) ═══════════════════════════════════════════
-- AUCUNE policy d'écriture : seules les Edge Functions (service_role, bypass
-- RLS) écrivent — le client n'ouvre/ne ferme jamais une frontière.
alter table public.partial_boundaries    enable row level security;
alter table public.boundary_contributions enable row level security;

revoke insert, update, delete on public.partial_boundaries    from anon, authenticated;
revoke insert, update, delete on public.boundary_contributions from anon, authenticated;

-- Frontières : membres ACTIFS du crew (transparence — « À TERMINER » de la War
-- Room). La géométrie fine reste filtrée côté Edge Functions (jamais de polyline
-- renvoyée) ; ici on autorise la LECTURE de la ligne pour le crew concerné.
create policy partial_boundaries_select_member on public.partial_boundaries
  for select to authenticated
  using (exists (
    select 1 from public.crew_members cm
    where cm.crew_id = partial_boundaries.crew_id
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
  ));

-- Contributions : membres ACTIFS du crew propriétaire de la frontière (résultat
-- « Benjamin 79 % · Lena 21 % »).
create policy boundary_contributions_select_member on public.boundary_contributions
  for select to authenticated
  using (exists (
    select 1
    from public.partial_boundaries pb
    join public.crew_members cm on cm.crew_id = pb.crew_id
    where pb.id = boundary_contributions.boundary_id
      and cm.user_id = (select auth.uid())
      and cm.left_at is null
  ));

-- ═══ 4. Feed crew : nouvel event_type 'boundary_completed' (AMENDEMENT-17) ════
-- Étend le CHECK posé par 0011 (ne le duplique pas) : la fermeture d'une
-- frontière crew alimente le feed (« Boucle crew fermée · République capturée »).
-- Les valeurs existantes restent valides (aucun UPDATE de données nécessaire).
alter table public.crew_feed_events
  drop constraint if exists crew_feed_events_event_type_check;
alter table public.crew_feed_events
  add constraint crew_feed_events_event_type_check check (event_type in
    ('capture', 'defense', 'badge', 'rank_up', 'chest', 'group_run',
     'contested', 'join', 'offensive', 'boundary_completed'));
