-- 0096_crew_announcements.sql
-- GRYD — E48 · ACTIVITÉ ET ANNONCES CREW : l'annonce épinglée devient un objet.
--
-- ⚠️ NUMÉROTÉE 0096 ET NON 0094 : trois agents de la même vague ont écrit un
-- `0093_*` en parallèle. `node scripts/audit-migrations.mjs` a attrapé la
-- collision (`supabase db push` en aurait sauté deux). Ce fichier a pris le
-- premier numéro sûr au-delà de la mêlée ; les deux `0093_*` restants ne sont
-- pas de ce chantier et ne sont pas renumérotés ici. Le trou 0094-0095 est
-- volontaire et sans effet : `db push` applique par ordre de nom, pas par
-- suite continue.
--
-- ═══ CONSTAT AVANT TRAVAUX (vérifié fichier par fichier, pas supposé) ═══════
--
-- La spéc E48 (l.1698) range l'écran en QUATRE sections. Voici l'état réel de
-- chacune au 28/07/2026, relevé par grep sur supabase/, apps/ et packages/ :
--
--   1. ANNONCES ÉPINGLÉES — N'EXISTENT PAS. Aucune table, aucune RPC, aucun
--      écran. `CREW_PERMISSIONS.pinMessage = ['co_captain','founder']`
--      (game-rules.ts:1350) décrivait donc un DROIT SUR UN OBJET QUI N'EXISTE
--      PAS. Le constat était déjà écrit noir sur blanc dans
--      `packages/shared/src/events.ts` (bloc « E48 », relevé du 28/07/2026) —
--      cette migration est ce que ce bloc attendait.
--
--   2. PROPOSITIONS DE SORTIE — EXISTENT (table `crew_events` 0019, écriture
--      `crew_outing_create` 0085, écran E49 `/crew-sortie`). RIEN À REFAIRE :
--      le fil d'E48 relit `crew_outing_context()`, il ne duplique pas sa
--      logique et n'ouvre pas un second chemin d'écriture.
--
--   3. CAPTURES ET DÉFENSES — la table `crew_feed_events` (0011) existe, elle
--      est ÉCRITE par `ingest_run`, et AUCUN CLIENT NE LA LIT (grep : seules
--      des migrations et `ingest_run` la citent ; `features/crew/feed.ts:13`
--      dit explicitement « se rebranchera sur crew_feed_events le jour où il
--      existera »). Ce jour est arrivé — mais avec une nuance que la section §5
--      détaille : sur les DIX `event_type` autorisés par le CHECK, DEUX
--      SEULEMENT sont réellement écrits.
--
--   4. DEMANDES D'AIDE — `crew_requests` (0019) existe, son `insert` est
--      RÉVOQUÉ (0019:167) et aucune RPC ne l'écrit. Cette migration NE LUI EN
--      DONNE PAS : la demande d'aide qui EXISTE vraiment dans le dépôt est le
--      PING DE ZONE (`crew_pings`, 0051, lu par `crew_pings_feed`). L'écran
--      relit cette RPC-là. `CREW_ACTIVITY_HELP_REQUESTS_HAVE_WRITE_PATH = false`
--      (game-rules) inscrit le trou plutôt que de le peindre.
--
-- ═══ CE QUE CETTE MIGRATION AJOUTE — ET RIEN DE PLUS ═══════════════════════
--   §1. `crew_announcements` — la table de la section 1, la SEULE qui manquait.
--   §2. Les bornes serveur, relues de game-rules.ts.
--   §3. `crew_announcement_refusal` — la garde de VIE PRIVÉE du corps libre.
--   §4. `crew_announcement_row` — la forme JSON, écrite UNE fois.
--   §5. `crew_activity_feed` — la LECTURE d'E48 : annonces + faits du crew.
--   §6. `crew_announcement_post` — l'écriture, seul juge.
--   §7. `crew_announcement_remove` — le RETRAIT (Apple 1.2, contraignant).
--   §8. Grants.
--
-- ═══ UNE ANNONCE EST DE L'UGC. LES QUATRE OBLIGATIONS SONT TENUES. ═════════
-- Apple Guideline 1.2 exige, pour tout contenu généré par les utilisateurs :
-- un FILTRAGE, un SIGNALEMENT, un BLOCAGE et un RETRAIT.
--   · FILTRAGE   → `crew_description_refusal` (0084), le filtre de prose du
--                  dépôt, appliqué AVANT l'écriture (§6). Verdict OPAQUE, comme
--                  0050/0084 : le détailler serait un mode d'emploi.
--   · SIGNALEMENT→ `content_reports` (0029) + `features/crew/moderation.ts`.
--                  RIEN N'EST RÉÉCRIT ICI : l'écran branche l'existant.
--   · BLOCAGE    → `user_blocks` (0029) + `features/crew/blocklist.ts`. Le fil
--                  masque l'auteur bloqué CÔTÉ CLIENT, comme le roster du crew
--                  le fait déjà (RealCrewScreen `stripMembers`).
--   · RETRAIT    → §7. C'est la seule des quatre qui manquait vraiment.
--
-- ═══ CONFIDENTIALITÉ (constitution §7) — CE QUI EST TENU, ET COMMENT ═══════
--   · LES FAITS DU CREW SONT PUBLIÉS EN DIFFÉRÉ. Une ligne « boucle fermée »
--     rendue trois secondes après la fin d'un run dit OÙ QUELQU'UN COURT EN CE
--     MOMENT. Le fil applique donc le MÊME différé que la publication d'un
--     territoire — `TERRITORY_PUBLISH_DELAY_MINUTES` (60), la constante que
--     `public_territories` (0077) utilise déjà. Ce n'est pas une précaution
--     inventée ici : c'est la règle du dépôt, appliquée à une seconde surface
--     qui expose la même information.
--   · AUCUN HORODATAGE FIN. `created_at` des faits sort tronqué à
--     `PUBLIC_TIMESTAMP_TRUNC` ('hour'), comme `public_territories` — §12.1 :
--     « une minute exacte, répétée, trahit une habitude ».
--   · AUCUNE COORDONNÉE, JAMAIS. `crew_feed_events.payload` contient `h3`
--     (l'index de la cellule contestée, écrit par `ingest_run:1917`) et, pour
--     `boundary_completed`, la liste des `user_id` contributeurs. La RPC ne
--     rend JAMAIS `payload` en bloc : elle en extrait une LISTE BLANCHE de deux
--     champs. Un `select payload` aurait publié une position exacte.
--   · LE CORPS D'UNE ANNONCE EST GARDÉ contre l'adresse (§3) : coordonnées
--     décimales, adresse numérotée, détail de porte. C'est une heuristique de
--     FORME — elle ne rend pas un champ libre sûr, elle réduit la faute la plus
--     courante.
--
-- ═══ CE QUE CETTE MIGRATION NE PRÉTEND PAS ════════════════════════════════
--   · Elle n'ouvre AUCUN chat. Une annonce est un objet rare (3 par crew), long
--     de 280 signes, réservé à la direction — pas un fil de messages. La spéc
--     E48 le dit (« la V1 privilégie les objets structurés ») et A-43 §9 aussi.
--   · Elle n'ajoute AUCUNE réaction persistée, AUCUN RSVP, AUCUNE notification.
--   · Elle ne crée aucun `event_type` sur `crew_feed_events` : lire ne change
--     pas ce qui s'écrit. Les types `capture` et `defense` du CHECK de 0011
--     restent NON ÉCRITS — voir §5, qui refuse de peindre ce qui n'existe pas.
--   · Elle n'édite pas une annonce publiée. On retire, on republie.
--
-- Source de vérité des constantes : packages/shared/src/game-rules.ts. Chaque
-- valeur reprise porte son commentaire `-- game-rules: NOM`, et le test PGlite
-- `supabase/tests/crew_announcements.pglite.test.mjs` les compare au fichier.
--
-- ADDITIVE : aucune table existante n'est modifiée, aucune donnée touchée.

-- ═══ §1. La table ══════════════════════════════════════════════════════════
-- `removed_at` plutôt qu'un DELETE : une annonce retirée doit rester
-- consultable par la modération (le signalement qui la vise arrive APRÈS son
-- retrait, et un signalement qui pointe vers rien n'est pas traitable).
create table if not exists public.crew_announcements (
  id         uuid primary key default gen_random_uuid(),
  crew_id    uuid not null references public.crews (id) on delete cascade,
  author_id  uuid not null references public.users (id) on delete cascade,
  -- game-rules: CREW_ANNOUNCEMENT_BODY_MIN / CREW_ANNOUNCEMENT_BODY_MAX
  -- Le CHECK porte sur le corps DÉTOURÉ : « 280 espaces » n'est pas une annonce.
  body       text not null check (char_length(btrim(body)) between 1 and 280),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by uuid references public.users (id) on delete set null
);

comment on table public.crew_announcements is
  'E48 §1 — annonces ÉPINGLÉES d''un crew (UGC). Écriture service_role / RPC '
  'SECURITY DEFINER uniquement ; lecture par les membres ACTIFS du crew. '
  'Retrait = removed_at (jamais DELETE : un signalement doit rester traçable).';

-- Lecture du fil : les vivantes d'un crew, plus récentes d'abord.
create index if not exists crew_announcements_live_idx
  on public.crew_announcements (crew_id, created_at desc)
  where removed_at is null;

-- IDEMPOTENCE (patron `crew_events_no_duplicate_idx`, 0085) : un double-tap ou
-- un retry réseau ne publie pas deux fois la même annonce. Sur le corps
-- NORMALISÉ (casse + espaces de bord), et seulement parmi les VIVANTES : une
-- annonce retirée peut être republiée, sinon le retrait serait définitif.
create unique index if not exists crew_announcements_no_duplicate_idx
  on public.crew_announcements (crew_id, author_id, lower(btrim(body)))
  where removed_at is null;

alter table public.crew_announcements enable row level security;

-- Écriture client INTERDITE (patron 0011/0019/0051) : `revoke ... from public`
-- et pas seulement `from anon`, parce que PUBLIC porte les droits hérités.
revoke all on public.crew_announcements from public, anon, authenticated;
grant select on public.crew_announcements to authenticated;

-- Lecture : membres ACTIFS du crew, et uniquement les annonces VIVANTES.
-- Quitter le crew, c'est cesser de les voir (miroir de crew_events, 0019:175).
drop policy if exists crew_announcements_select_member on public.crew_announcements;
create policy crew_announcements_select_member on public.crew_announcements
  for select to authenticated
  using (
    removed_at is null
    and exists (
      select 1 from public.crew_members cm
      where cm.crew_id = crew_announcements.crew_id
        and cm.user_id = auth.uid()
        and cm.left_at is null
    )
  );

-- ═══ §2. Les bornes serveur (patron 0085 §2) ═══════════════════════════════
-- Des fonctions et non des littéraux disséminés : le test PGlite les compare à
-- game-rules.ts, et une valeur qui dérive casse le gate au lieu de mentir.
create or replace function public.crew_announcement_max_active()
returns integer language sql immutable as
  $$ select 3 $$;               -- game-rules: CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW

create or replace function public.crew_announcement_body_max()
returns integer language sql immutable as
  $$ select 280 $$;             -- game-rules: CREW_ANNOUNCEMENT_BODY_MAX

create or replace function public.crew_activity_conquest_max()
returns integer language sql immutable as
  $$ select 10 $$;              -- game-rules: CREW_ACTIVITY_CONQUEST_MAX

create or replace function public.crew_activity_window_days()
returns integer language sql immutable as
  $$ select 14 $$;              -- game-rules: CREW_ACTIVITY_WINDOW_DAYS

create or replace function public.crew_activity_publish_delay_min()
returns integer language sql immutable as
  $$ select 60 $$;              -- game-rules: TERRITORY_PUBLISH_DELAY_MINUTES

revoke all on function public.crew_announcement_max_active()      from public, anon, authenticated;
revoke all on function public.crew_announcement_body_max()        from public, anon, authenticated;
revoke all on function public.crew_activity_conquest_max()        from public, anon, authenticated;
revoke all on function public.crew_activity_window_days()         from public, anon, authenticated;
revoke all on function public.crew_activity_publish_delay_min()   from public, anon, authenticated;

-- ═══ §3. La garde de VIE PRIVÉE du corps libre ═════════════════════════════
/**
 * Le corps d'une annonce désigne-t-il un LIEU PRÉCIS ? Motif ou NULL.
 * Valeurs : 'coordinates' | 'street_address' | 'door_detail'.
 *
 * MIROIR EXACT de `announcementPrivacyRefusal`
 * (apps/mobile/src/features/crew/crewActivity.ts). Le test PGlite fait passer
 * LA MÊME liste de cas dans les deux implémentations et exige le même verdict :
 * sans ça, l'écran promettrait un refus que le serveur ignore (fuite
 * silencieuse), ou peindrait un CTA valide que le serveur refuse (bouton mort).
 *
 * ── LES DEUX MOTIFS D'ADRESSE SONT DÉLÉGUÉS, PAS RECOPIÉS ──────────────────
 * `crew_outing_place_refusal` (0085 §3) sait déjà reconnaître « 12 rue X »,
 * « Hauptstrasse 4 » et le vocabulaire d'entrée (digicode, interphone, étage…)
 * en cinq langues. Le réécrire ici aurait garanti que les deux listes divergent
 * au premier ajout. Un point de rendez-vous et une annonce posent EXACTEMENT le
 * même risque : publier le domicile de quelqu'un à vingt personnes.
 *
 * ── CE QUE CETTE FONCTION AJOUTE : LES COORDONNÉES ────────────────────────
 * Un point de rendez-vous est un LIBELLÉ (« devant la fontaine ») ; personne
 * n'y colle un couple décimal. Une annonce est un champ libre où l'on colle ce
 * qu'on a — et « 48.8566, 2.3522 » est une position EXACTE, précisément ce que
 * la constitution §7 interdit de faire circuler. Le motif se déclenche sur un
 * couple de décimaux séparés par une virgule ou un point-virgule, dans les
 * bornes du monde, avec AU MOINS TROIS décimales de chaque côté.
 *
 * TROIS décimales et pas une : à trois, on est à ~100 m — c'est une position.
 * À une ou deux, on attraperait « 3,5 km en 18,2 min », qui n'a rien à voir.
 * La borne est un compromis assumé, pas une preuve : « 48.85 2.35 » (sans
 * séparateur, deux décimales) passe. Une heuristique de FORME ne rend pas un
 * champ de texte sûr — elle réduit la faute la plus courante.
 *
 * ── POURQUOI CE MOTIF-LÀ EST DIT AU JOUEUR ────────────────────────────────
 * Même arbitrage que 0085 §3 : la personne n'essaie pas de contourner, elle
 * essaie d'être utile à son crew. Lui dire « écris un lieu, pas des
 * coordonnées » est exactement ce qui la fait corriger. Taire le motif la
 * ferait recommencer à l'identique. (La MODÉRATION de langage, elle, reste
 * opaque — §6.)
 */
create or replace function public.crew_announcement_refusal(p_text text)
returns text language plpgsql stable
set search_path = public, pg_temp
as $$
declare
  v text := coalesce(p_text, '');
begin
  if btrim(v) = '' then
    return null;   -- vide : c'est « champ obligatoire », pas un refus de vie privée
  end if;

  -- Couple de décimaux « latitude , longitude » (virgule décimale acceptée :
  -- l'Europe l'écrit comme ça, et un couple « 48,8566 ; 2,3522 » est tout
  -- aussi précis). Les bornes du monde évitent de mordre sur « 300,500 » ou
  -- une plage de dossards.
  if v ~ ('(^|[^0-9.,-])[+-]?([0-8]?[0-9][.,][0-9]{3,}|90[.,]0+)'
       || '[[:space:]]*[,;][[:space:]]*'
       || '[+-]?(1[0-7][0-9]|[0-9]{1,2})[.,][0-9]{3,}([^0-9.,]|$)') then
    return 'coordinates';
  end if;

  -- Adresse numérotée et détail de porte : la liste vit dans 0085, en cinq
  -- langues, avec ses absents motivés. On la RÉUTILISE.
  return public.crew_outing_place_refusal(v);
end;
$$;

comment on function public.crew_announcement_refusal(text) is
  'E48 — motif de refus du corps d''une annonce qui désigne un lieu précis : '
  '''coordinates'' (couple décimal ≥3 décimales) | ''street_address'' | '
  '''door_detail'' (délégués à crew_outing_place_refusal, 0085) | NULL. Miroir '
  'du module pur features/crew/crewActivity.ts (comparé par le test PGlite). '
  'Heuristique de FORME : ne rend pas un champ libre sûr.';

revoke all on function public.crew_announcement_refusal(text) from public, anon, authenticated;

-- ═══ §4. La forme JSON d'une annonce — écrite UNE fois (patron 0085 §4) ════
-- Deux RPC la rendent (le fil et la publication). La dupliquer aurait garanti
-- qu'un champ ajouté un jour n'apparaisse que d'un côté.
--
-- AUCUNE PHRASE N'EST COMPOSÉE ICI (doctrine 0051) : ni date formatée, ni
-- « Annonce de KORO ». Le pseudo et l'instant sont des RÉFÉRENCES ; la phrase
-- s'assemble à l'écran, dans la langue du lecteur. `authorId` sort parce que le
-- client en a besoin pour DEUX gestes légitimes et pour eux seuls : savoir si
-- l'annonce est la sienne (retrait), et la masquer si son auteur est bloqué.
create or replace function public.crew_announcement_row(p_id uuid)
returns jsonb language sql stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id',           a.id,
    'body',         a.body,
    'authorId',     a.author_id,
    'authorPseudo', pp.pseudo,
    'createdAt',    a.created_at
  )
  from public.crew_announcements a
  left join public.public_profiles pp on pp.id = a.author_id
  where a.id = p_id
$$;

revoke all on function public.crew_announcement_row(uuid) from public, anon, authenticated;

-- ═══ §5. crew_activity_feed : la LECTURE d'E48 ═════════════════════════════
/**
 * Ce que l'écran /crew-activite a le droit de LIRE et de FAIRE.
 *
 * ── CE QU'ELLE REND, ET CE QU'ELLE NE REND PAS ────────────────────────────
 * Elle rend DEUX des quatre sections d'E48 : les ANNONCES et les FAITS DU CREW.
 * Les deux autres sont déjà servies par des RPC existantes, que l'écran appelle
 * DIRECTEMENT :
 *   · propositions de sortie → `crew_outing_context()` (0085) ;
 *   · demandes d'aide        → `crew_pings_feed()` (0051).
 * Les recopier ici aurait créé un SECOND fil, divergeant du premier au premier
 * changement de règle. Une RPC de plus ne vaut jamais deux vérités.
 *
 * ── « CAPTURES ET DÉFENSES » : CE QUE LA BASE CONTIENT VRAIMENT ────────────
 * Le CHECK de `crew_feed_events` (0011, étendu par 0015) autorise DIX
 * `event_type`. `ingest_run` n'en écrit que DEUX (grep du 28/07/2026, deux
 * `insert` : lignes 1915 et 2141) :
 *   · 'boundary_completed' — une boucle crew fermée. C'est LA capture

 *     collective du dépôt. `payload.name` porte le nom RÉEL de la frontière.
 *   · 'contested'          — une cellule contestée pendant une sortie de
 *     groupe. Elle est insérée POUR LES DEUX CREWS (challenger ET ancien
 *     propriétaire) avec le MÊME payload : rien dedans ne dit de quel côté on
 *     est. La RPC ne compose donc aucune phrase directionnelle, et l'écran rend
 *     un fait neutre. Prétendre « vous avez repris » d'après cette ligne serait
 *     faux une fois sur deux — et « vous avez perdu » violerait l'anti-shame.
 * Les huit autres types ('capture', 'defense', 'badge', 'rank_up', 'chest',
 * 'group_run', 'join', 'offensive') NE SONT ÉCRITS PAR RIEN. On ne les filtre
 * pas pour autant : le `where` liste les deux qu'on sait RENDRE, ce qui fait
 * qu'un type écrit demain n'apparaîtra qu'avec sa ligne d'affichage — jamais en
 * ligne muette.
 *
 * ── LES TROIS GARDES DE VIE PRIVÉE, DANS LE `select` ──────────────────────
 *  1. DIFFÉRÉ — `created_at <= now() - TERRITORY_PUBLISH_DELAY_MINUTES`. Sans
 *     lui, le fil dirait où quelqu'un court EN CE MOMENT.
 *  2. TRONCATURE — `date_trunc(PUBLIC_TIMESTAMP_TRUNC, created_at)`. Pas de
 *     minute exacte : §12.1.
 *  3. LISTE BLANCHE — `payload` n'est JAMAIS rendu en bloc. Il contient `h3`
 *     (une position) pour 'contested', et les `user_id` des contributeurs pour
 *     'boundary_completed'. Seul `payload->>'name'` sort, et seulement pour le
 *     type où il désigne une frontière nommée.
 *
 * ── L'HORLOGE EST CELLE DU SERVEUR ────────────────────────────────────────
 * Fenêtre, différé et « à venir » se calculent sur `now()`. Un téléphone dont
 * l'horloge retarde ne doit pas voir apparaître un fait encore sous embargo.
 */
create or replace function public.crew_activity_feed()
returns jsonb language plpgsql stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_crew_id   uuid;
  v_role      text;
  v_announce  jsonb;
  v_conquests jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- Adhésion ACTIVE unique (index crew_members_one_active_per_user, 0002) :
  -- un joueur ne lit jamais « un » crew, il lit LE SIEN.
  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select coalesce(jsonb_agg(public.crew_announcement_row(a.id) order by a.created_at desc), '[]'::jsonb)
  into v_announce
  from public.crew_announcements a
  where a.crew_id = v_crew_id and a.removed_at is null;

  select coalesce(jsonb_agg(x.row order by x.created_at desc), '[]'::jsonb)
  into v_conquests
  from (
    select
      jsonb_build_object(
        'id',   e.id,
        'kind', e.event_type,
        -- LISTE BLANCHE (cf. l'en-tête) : jamais `payload` en bloc.
        -- `name` n'existe que pour 'boundary_completed' (ingest_run:2145) ;
        -- pour 'contested', il vaut NULL et l'écran rend un fait sans nom.
        'name', case when e.event_type = 'boundary_completed'
                     then nullif(btrim(coalesce(e.payload->>'name', '')), '')
                     else null end,
        'actorPseudo', pp.pseudo,
        -- game-rules: PUBLIC_TIMESTAMP_TRUNC — jamais la minute exacte.
        'createdAt', date_trunc('hour', e.created_at)
      ) as row,
      e.created_at
    from public.crew_feed_events e
    left join public.public_profiles pp on pp.id = e.actor_id
    where e.crew_id = v_crew_id
      and e.event_type in ('boundary_completed', 'contested')
      -- game-rules: TERRITORY_PUBLISH_DELAY_MINUTES — publication DIFFÉRÉE.
      and e.created_at <= now() - make_interval(mins => public.crew_activity_publish_delay_min())
      -- game-rules: CREW_ACTIVITY_WINDOW_DAYS — fenêtre d'affichage.
      and e.created_at >= now() - make_interval(days => public.crew_activity_window_days())
    order by e.created_at desc
    -- game-rules: CREW_ACTIVITY_CONQUEST_MAX — plafond de LECTURE (aucun
    -- compte n'est affirmé à l'écran, donc tronquer la liste ne ment pas).
    limit public.crew_activity_conquest_max()
  ) x;

  return jsonb_build_object(
    'ok',               true,
    'role',             v_role,
    -- game-rules: CREW_PERMISSIONS.pinMessage — tranché SERVEUR, jamais dérivé
    -- par le client (qui afficherait sa propre idée de la matrice).
    'canPost',          v_role in ('co_captain', 'founder'),
    'announcements',    coalesce(v_announce, '[]'::jsonb),
    'conquests',        coalesce(v_conquests, '[]'::jsonb),
    'maxAnnouncements', public.crew_announcement_max_active(),
    'bodyMax',          public.crew_announcement_body_max()
  );
end;
$$;

-- ═══ §6. crew_announcement_post : L'ÉCRITURE — le serveur seul juge ════════
/**
 * Publie une annonce épinglée dans le crew du joueur.
 *
 * ── L'ORDRE DES CONTRÔLES N'EST PAS ARBITRAIRE (patron 0085 §6) ───────────
 * identité → appartenance → RÔLE → bornes de forme → VIE PRIVÉE → modération
 * → plafond → écriture. La vie privée passe avant la modération parce qu'elle
 * est la seule dont le motif est RENDU au joueur : il doit pouvoir corriger. Le
 * plafond passe en dernier parce qu'il est le seul refus qui ne dépend pas de
 * ce que la personne vient d'écrire.
 *
 * ── IDEMPOTENCE ──────────────────────────────────────────────────────────
 * Republier exactement la même annonce (même crew, même auteur, même corps à la
 * casse et aux espaces de bord près) ne crée PAS de doublon : l'index partiel
 * unique l'attrape et la fonction rend la ligne EXISTANTE avec
 * `duplicate: true`. Un double-tap ou un retry réseau publie UNE annonce.
 *
 * ── CE QUI N'EST PAS VÉRIFIÉ ICI, ET POURQUOI ────────────────────────────
 * Le contenu au sens humain. `crew_description_refusal` attrape un vocabulaire,
 * pas une intention : une annonce blessante écrite proprement passera. C'est
 * exactement pourquoi le SIGNALEMENT et le RETRAIT (§7) existent, et pourquoi
 * ils ne sont pas facultatifs.
 */
create or replace function public.crew_announcement_post(p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_role    text;
  v_body    text;
  v_refusal text;
  v_count   integer;
  v_id      uuid;
  v_dup     boolean := false;
begin
  -- ── Identité ────────────────────────────────────────────────────────────
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- ── Appartenance + rôle — la source est crew_members, jamais le client ──
  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- game-rules: CREW_PERMISSIONS.pinMessage — épingler est un geste de
  -- DIRECTION : l'annonce reste affichée à tout le crew jusqu'à retrait.
  -- captain, strategist, scout, runner et rookie sont refusés parce que la
  -- matrice dit co-capitaine et au-dessus, pas parce qu'on l'a décidé ici.
  if v_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- ── Bornes de forme (miroir du CHECK de §1 + game-rules) ───────────────
  v_body := btrim(coalesce(p_body, ''));
  -- game-rules: CREW_ANNOUNCEMENT_BODY_MIN / CREW_ANNOUNCEMENT_BODY_MAX
  if char_length(v_body) < 1
     or char_length(v_body) > public.crew_announcement_body_max() then
    return jsonb_build_object(
      'ok', false, 'reason', 'bad_body', 'max', public.crew_announcement_body_max());
  end if;

  -- ── VIE PRIVÉE — motif RENDU au joueur (§3) ────────────────────────────
  v_refusal := public.crew_announcement_refusal(v_body);
  if v_refusal is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'body_looks_like_place',
      -- Le sous-motif permet à l'écran de dire la bonne phrase (coordonnées vs
      -- adresse vs détail de porte) sans deviner laquelle a mordu.
      'kind', v_refusal
    );
  end if;

  -- ── Modération du TEXTE LIBRE — motif OPAQUE (doctrine 0050/0084) ──────
  if public.crew_description_refusal(v_body) is not null then
    return jsonb_build_object('ok', false, 'reason', 'body_unavailable');
  end if;

  -- ── Plafond anti-inondation, SERVEUR ───────────────────────────────────
  -- Par CREW et non par membre : c'est le mur du crew qu'on protège, et un
  -- fondateur seul peut l'inonder. Ne compte que les VIVANTES — retirer une
  -- annonce libère une place.
  select count(*)::integer into v_count
  from public.crew_announcements a
  where a.crew_id = v_crew_id and a.removed_at is null;

  if v_count >= public.crew_announcement_max_active() then
    return jsonb_build_object(
      'ok', false,
      'reason', 'too_many_active',
      'max', public.crew_announcement_max_active()
    );
  end if;

  -- ── L'écriture ─────────────────────────────────────────────────────────
  insert into public.crew_announcements (crew_id, author_id, body)
  values (v_crew_id, v_uid, v_body)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    -- L'index partiel unique a mordu : l'annonce EXISTE déjà. On rend la ligne
    -- existante plutôt qu'une erreur — un retry réseau n'est pas une faute du
    -- joueur, et lui dire « échec » le pousserait à republier.
    v_dup := true;
    select a.id into v_id
    from public.crew_announcements a
    where a.crew_id = v_crew_id
      and a.author_id = v_uid
      and lower(btrim(a.body)) = lower(v_body)
      and a.removed_at is null;
    if v_id is null then
      -- Conflit sur une contrainte qu'on n'a pas prévue : on ne devine pas.
      return jsonb_build_object('ok', false, 'reason', 'bad_body');
    end if;
  end if;

  return jsonb_build_object(
    'ok',           true,
    'duplicate',    v_dup,
    'announcement', public.crew_announcement_row(v_id)
  );
end;
$$;

-- ═══ §7. crew_announcement_remove : LE RETRAIT (Apple 1.2, contraignant) ═══
/**
 * Retire une annonce. C'est la quatrième obligation d'Apple 1.2 pour l'UGC, et
 * la seule qui manquait au dépôt.
 *
 * ── RETIRER EST PLUS PERMISSIF QUE PUBLIER (patron 0090 §7) ──────────────
 * Publier exige `pinMessage` (co-capitaine et fondateur). Retirer est ouvert à
 * ces deux rôles ET à l'AUTEUR de la ligne, quel que soit son rôle du jour.
 * Un co-capitaine rétrogradé doit pouvoir refermer sa propre porte : sinon son
 * texte resterait épinglé devant tout le crew sans que personne d'autre s'en
 * sente responsable.
 *
 * ── `not_found` PLUTÔT QUE `forbidden` POUR L'ANNONCE D'UN AUTRE CREW ────
 * Répondre « interdit » ferait de cette RPC un ORACLE D'EXISTENCE : en essayant
 * des identifiants, on distinguerait « existe ailleurs » de « n'existe pas ».
 * Même arbitrage que `revoke_crew_invite` (0090).
 *
 * ── IDEMPOTENTE ─────────────────────────────────────────────────────────
 * Retirer deux fois rend `ok` sans DÉPLACER `removed_at` ni réécrire
 * `removed_by` : la trace de modération garde l'instant du VRAI retrait.
 */
create or replace function public.crew_announcement_remove(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_role    text;
  v_author  uuid;
  v_removed timestamptz;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- Bornée au crew du demandeur : une annonce d'ailleurs est introuvable.
  select a.author_id, a.removed_at into v_author, v_removed
  from public.crew_announcements a
  where a.id = p_id and a.crew_id = v_crew_id
  for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if v_author <> v_uid and v_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  if v_removed is not null then
    -- Déjà retirée : succès, et on ne touche NI l'instant NI l'auteur du
    -- retrait — la trace de modération doit rester celle du vrai geste.
    return jsonb_build_object('ok', true, 'alreadyRemoved', true);
  end if;

  update public.crew_announcements
  set removed_at = now(), removed_by = v_uid
  where id = p_id;

  return jsonb_build_object('ok', true, 'alreadyRemoved', false);
end;
$$;

-- ═══ §8. Grants ════════════════════════════════════════════════════════════
-- `from public, anon` et PAS `from anon` seul : Postgres accorde d'office
-- EXECUTE à PUBLIC à la création de toute fonction, et anon est membre de
-- PUBLIC — révoquer sur anon seul laisserait le droit HÉRITÉ intact.
-- Patron 0085 §7 / 0084 §8 / 0051 §3.
revoke all on function public.crew_activity_feed() from public, anon;
grant execute on function public.crew_activity_feed() to authenticated;

revoke all on function public.crew_announcement_post(text) from public, anon;
grant execute on function public.crew_announcement_post(text) to authenticated;

revoke all on function public.crew_announcement_remove(uuid) from public, anon;
grant execute on function public.crew_announcement_remove(uuid) to authenticated;

comment on function public.crew_activity_feed() is
  'E48 — fil d''activité du crew : annonces VIVANTES + faits du crew '
  '(crew_feed_events, types RÉELLEMENT écrits uniquement), publiés en DIFFÉRÉ '
  '(TERRITORY_PUBLISH_DELAY_MINUTES) et horodatés à l''heure '
  '(PUBLIC_TIMESTAMP_TRUNC). Ne rend JAMAIS payload en bloc (il contient h3). '
  'Sorties et pings restent servis par crew_outing_context()/crew_pings_feed(). '
  'LECTURE SEULE.';

comment on function public.crew_announcement_post(text) is
  'E48 — SEUL chemin d''écriture d''une annonce épinglée. Revérifie '
  'appartenance, rôle (CREW_PERMISSIONS.pinMessage), bornes, vie privée du '
  'corps (crew_announcement_refusal — motif RENDU au joueur), modération '
  '(motif OPAQUE) et plafond (CREW_ANNOUNCEMENT_MAX_ACTIVE_PER_CREW). '
  'IDEMPOTENTE : le rejeu rend l''annonce existante avec duplicate=true.';

comment on function public.crew_announcement_remove(uuid) is
  'E48 — RETRAIT d''une annonce (Apple 1.2). Auteur OU pinMessage. Marque '
  'removed_at (jamais DELETE : un signalement doit rester traçable). '
  'IDEMPOTENTE, et ne déplace pas removed_at au second appel. Une annonce d''un '
  'autre crew rend not_found, jamais forbidden (pas d''oracle d''existence).';
