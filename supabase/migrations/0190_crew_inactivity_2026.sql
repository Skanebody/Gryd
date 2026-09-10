-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║ 0190 — LE SERVEUR APPLIQUE LES RÈGLES, ET UN CREW PEUT SE DISSOUDRE.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
--
-- Spécification : docs/product/GRYD_GESTION_CREW_2026_09.md §2.3, §2.7, §3.3.
-- Dissolution : DÉCISION DU FONDATEUR du 11/09/2026, « dissoudre un crew : oui,
-- à mettre en place ». Les cinq décisions du lot sont consignées en tête de 0188.
--
-- ═══ CE QUE CE FICHIER POSE ════════════════════════════════════════════════
--  1. `crews.archived_at` / `archived_by` / `archived_reason` / `name_available_at` ;
--  2. `crew_dissolve_2026(reason)` — fondateur seul, crew ARCHIVÉ, jamais supprimé ;
--  3. `create_crew` REMPLACÉE : le nom d'un crew archivé est tenu
--     `CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS` jours ;
--  4. `join_crew_by_code` et `crew_join_intent` REMPLACÉES : un retrait
--     AUTOMATIQUE n'est pas un départ volontaire, et un crew ARCHIVÉ ne recrute pas ;
--  5. `crew_resolve_warning_2026` — un officier lève ce qu'il a posé ;
--  6. `crew_invite_by_handle_2026` — la porte humaine qui outrepasse les exigences ;
--  7. `crew_discovery_2026` — la recherche à filtres, dont « je suis éligible » ;
--  8. `sweep_crew_inactivity_2026` + son journal + le job `pg_cron` quotidien.
--
-- ═══ POURQUOI `active_challenge` REFUSE AU LIEU D'ARCHIVER APRÈS COUP ══════
-- Le cahier §G20 pose qu'« un défi a un résultat » et qu'« un nul est un vrai
-- résultat ». Dissoudre pendant un défi en cours priverait de leur résultat les
-- joueurs des DEUX crews — dont un crew tiers qui n'a rien décidé et n'a aucun
-- recours. L'alternative `archived_after_challenge` (armer la dissolution pour
-- la clôture) aurait créé une bombe à retardement invisible : les membres
-- continueraient à courir pour un crew déjà condamné, ce qui est exactement le
-- genre de mensonge d'état que L8 interdit. Le capitaine attend donc la fin du
-- défi — au plus `CHALLENGE_RULES_2026.durationDays` jours — et la réponse le
-- DIT en rendant la date de clôture (`endsAt`), pour que le refus ne soit pas un
-- cul-de-sac.
--
-- ═══ DISSOUDRE N'EST PAS SUPPRIMER ═════════════════════════════════════════
-- Aucune ligne n'est effacée : ni le crew, ni son historique d'adhésions, ni les
-- `capture_events_2026` de ses membres, ni les défis joués, ni le journal des
-- décisions. Le titre territorial est INDIVIDUEL (0126) : la dissolution ne
-- retire donc AUCUN mètre carré à personne — les zones de chaque membre restent
-- les siennes, exactement comme après une exclusion (0093 §4).
--
-- ═══ LE FUSEAU DU JOB, DIT FRANCHEMENT ═════════════════════════════════════
-- `pg_cron` planifie en UTC : `'10 3 * * *'` tombe à 4 h 10 ou 5 h 10 heure de
-- Paris selon la saison. C'est acceptable PARCE QUE le job est IDEMPOTENT
-- (unique partielle de `crew_warnings_2026`, 0189 §2), et parce que les fenêtres
-- de mesure sont calculées en `Europe/Paris` DANS la fonction, comme
-- `leaderboard_week_bounds_2026` (0160). Si quelqu'un retire l'unique partielle,
-- le risque revient intact.
--
-- ═══ LE MODE ACCÉLÉRÉ DES TESTS ════════════════════════════════════════════
-- `p_at timestamptz default now()` EST le mode accéléré : les tests avancent
-- l'horloge en paramètre au lieu d'attendre des jours. Aucune variable
-- d'environnement, aucun drapeau caché — un mode de test qui ne se lit pas dans
-- la signature finit par diverger du mode réel.
--
-- ═══ ADDITIVE ═══════════════════════════════════════════════════════════════
-- Quatre colonnes ajoutées à `crews`, une table de journal de passage, sept
-- fonctions neuves, trois fonctions existantes remplacées par `create or
-- replace` en conservant signature ET grants. Aucune donnée existante n'est
-- modifiée. Rollback : réappliquer 0050 §5, 0093 §7 et §8, puis `drop` du reste.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- 1. UN CREW PEUT ÊTRE ARCHIVÉ
-- ════════════════════════════════════════════════════════════════════════════
alter table public.crews
  add column if not exists archived_at        timestamptz,
  add column if not exists archived_by        uuid references public.users (id) on delete set null,
  add column if not exists archived_reason    text,
  add column if not exists name_available_at  timestamptz;

comment on column public.crews.archived_at is
  'Instant de la DISSOLUTION (crew_dissolve_2026, 0190). NULL = crew vivant. La '
  'ligne, son nom, ses adhésions passées et l''historique territorial de ses '
  'membres sont CONSERVÉS : dissoudre n''est pas supprimer.';
comment on column public.crews.name_available_at is
  'Instant à partir duquel le NOM d''un crew archivé redevient prenable '
  '(game-rules: CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS). ⚠ crews.name n''a AUCUNE '
  'contrainte d''unicité (0002) : ce délai est la SEULE réservation de nom qui '
  'existe, et elle ne vaut que pour les crews archivés.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. `crew_dissolve_2026` — LE GESTE LE PLUS IRRÉVERSIBLE APRÈS LE TRANSFERT
--
-- game-rules: CREW_PERMISSIONS.archiveCrew === ['founder'].
--
-- LE MOTIF `not_founder` PLUTÔT QUE `forbidden` : un co_captain qui lit
-- « interdit » cherche quel réglage lui manque ; « tu n'es pas le fondateur »
-- dit une impossibilité de nature — la même distinction que 0093 §4 fait entre
-- `cannot_target_lead` et `out_of_scope`.
--
-- LA CONFIRMATION EST CÔTÉ CLIENT, LA BORNE EST ICI. L'écran confirme en deux
-- temps (§4.1 E) ; le serveur, lui, ne demande rien : il vérifie.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_dissolve_2026(p_reason text default null) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid       uuid := auth.uid();
  v_crew_id   uuid;
  v_role      text;
  v_crew      public.crews%rowtype;
  v_challenge record;
  v_free_at   timestamptz;
  v_members   integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  -- game-rules: CREW_PERMISSIONS.archiveCrew
  if v_role is distinct from 'founder' then
    return jsonb_build_object('ok', false, 'reason', 'not_founder');
  end if;

  -- Verrou de crew AVANT toute lecture d'état : deux dissolutions concurrentes,
  -- ou une dissolution qui croise un transfert de propriété, ne doivent pas
  -- lire le même « avant ».
  select * into v_crew from public.crews c where c.id = v_crew_id for update;
  if v_crew.archived_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_archived',
      'archivedAt', v_crew.archived_at);
  end if;

  -- UN DÉFI EN COURS INTERDIT LA DISSOLUTION (voir le docblock). La réponse
  -- rend la date de clôture : un refus sans échéance serait un cul-de-sac.
  select c2.id, c2.title, c2.ends_at into v_challenge
  from public.challenge_teams_2026 ct
  join public.crew_challenges_2026 c2 on c2.id = ct.challenge_id
  where ct.crew_id = v_crew_id
    and c2.status not in ('cancelled', 'final')
    and c2.ends_at > now()
  order by c2.ends_at asc
  limit 1;
  if found then
    return jsonb_build_object('ok', false, 'reason', 'active_challenge',
      'challengeId', v_challenge.id, 'endsAt', v_challenge.ends_at);
  end if;

  v_free_at := now() + make_interval(days => public.crew_name_hold_after_archive_days());

  update public.crews c
  set archived_at = now(), archived_by = v_uid,
      archived_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      name_available_at = v_free_at,
      -- L'accueil se referme dans la même écriture : `crew_join_intent` (§4) et
      -- `crew_discovery` (0152) rendent alors « fermé » sans rien connaître de
      -- l'archivage. Une seule vérité pour « on ne peut pas entrer ici ».
      recruitment_status = 'closed'
  where c.id = v_crew_id;

  -- LES MEMBRES SORTENT, ET LEUR SORTIE N'EST PAS LA LEUR. `removed_by` porte
  -- le fondateur : ils échappent donc au cooldown de changement de crew (0093 :
  -- il vise le nomadisme, pas quelqu'un dont le crew vient de disparaître), et
  -- peuvent en rejoindre un autre le jour même.
  update public.crew_members cm
  set left_at = now(), removed_by = v_uid
  where cm.crew_id = v_crew_id and cm.left_at is null and cm.user_id <> v_uid;
  get diagnostics v_members = row_count;

  -- LE FONDATEUR, LUI, A CHOISI. `removed_by` reste NULL : le cooldown de 7
  -- jours s'applique à lui, et c'est juste — dissoudre pour re-fonder ailleurs
  -- dans la foulée serait exactement le nomadisme que la règle vise.
  update public.crew_members cm
  set left_at = now()
  where cm.crew_id = v_crew_id and cm.left_at is null and cm.user_id = v_uid;

  -- Les avertissements ouverts n'ont plus d'objet : ils portaient sur une
  -- appartenance qui n'existe plus.
  update public.crew_warnings_2026 w
  set resolved_at = now()
  where w.crew_id = v_crew_id and w.resolved_at is null;

  -- Les candidatures en attente ne peuvent plus être tranchées par personne.
  update public.crew_applications ca
  set status = 'withdrawn', decided_at = now(), decided_by = v_uid
  where ca.crew_id = v_crew_id and ca.status = 'pending';

  -- Les liens d'invitation vivants sont refermés : un QR imprimé ne doit pas
  -- ouvrir la porte d'un crew qui n'existe plus.
  update public.crew_invites i
  set revoked_at = now()
  where i.crew_id = v_crew_id and i.revoked_at is null and i.expires_at > now();

  insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail)
  values (v_crew_id, 'dissolution', v_uid, null,
          nullif(btrim(coalesce(p_reason, '')), ''),
          jsonb_build_object('membersRemoved', v_members, 'nameAvailableAt', v_free_at));

  -- §3.4 `dissolved` — TRANSACTIONNEL, à chaque ancien membre SAUF au fondateur
  -- (il vient de le décider ; le lui annoncer serait un accusé de réception).
  -- Texte de référence FR pour le lot Q3, sans tiret long, au tutoiement :
  -- « Le crew [nom] a été dissous par son capitaine. » Aucun jugement, aucun
  -- score, aucune invitation à en refonder un dans la foulée.
  perform public.crew_notify_2026(cm.user_id, 'dissolved', v_crew_id, v_crew_id::text,
    jsonb_build_object('archivedAt', now()))
  from public.crew_members cm
  where cm.crew_id = v_crew_id and cm.left_at is not null
    and cm.user_id <> v_uid and cm.removed_by = v_uid;

  return jsonb_build_object(
    'ok', true, 'effect', 'archived',
    'crewId', v_crew_id,
    'membersRemoved', v_members,
    'nameAvailableAt', v_free_at);
end;
$$;

comment on function public.crew_dissolve_2026(text) is
  'Dissout un crew : il passe ARCHIVÉ, jamais supprimé (historique et '
  'capture_events_2026 conservés, titre territorial individuel intact — 0126). '
  'Fondateur SEUL (CREW_PERMISSIONS.archiveCrew). Refus nommés : not_founder · '
  'active_challenge (+endsAt : un défi a un résultat, §G20) · already_archived. '
  'Retire tous les membres (removed_by = le fondateur : ils échappent au '
  'cooldown), notifie chacun, referme candidatures et liens, journalise, et '
  'tient le NOM jusqu''à name_available_at.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. `create_crew` — LE NOM D'UN CREW DISSOUS EST TENU, PUIS RENDU
--
-- Copie CONFORME de 0050 §5 (elle-même reprise de 0043), à UN contrôle près.
-- Recopier la fonction entière plutôt que la « patcher » est le patron du dépôt
-- (0182 §1) : `create or replace` remplace le corps en bloc, et un fichier qui
-- ne dit pas TOUT ce que la fonction fait devient illisible à la migration
-- suivante.
--
-- ⚠ LA COMPARAISON EST EXACTE, sur le nom réduit (`lower(btrim(...))`), et pas
-- une similarité : la chaîne de modération de 0050 (`moderation_fold` /
-- `moderation_squash`) reste STRICTEMENT à sa place et n'est pas détournée en
-- moteur d'anti-squat. Un rapprochement approximatif refuserait des noms
-- légitimes sans jamais pouvoir dire lequel il a cru reconnaître.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.create_crew(
  p_name text,
  p_color smallint,
  p_city_id text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_last_left timestamptz;
  v_days_left integer;
  v_code char(6);
  v_crew public.crews%rowtype;
  v_try integer := 0;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    return jsonb_build_object('ok', false, 'reason', 'bad_name');
  end if;

  -- MODÉRATION (0050). Un seul motif côté joueur, quelle que soit la règle.
  if public.crew_name_refusal(v_name) is not null then
    return jsonb_build_object('ok', false, 'reason', 'name_unavailable');
  end if;

  -- NOM TENU APRÈS UNE DISSOLUTION (0190). Le MÊME motif que la modération, et
  -- c'est délibéré : détailler « ce nom a appartenu à un crew dissous le 3
  -- septembre » raconterait l'histoire d'un groupe à quelqu'un qui n'en était
  -- pas. On dit « indisponible », on ne dit pas pourquoi.
  if exists (
    select 1 from public.crews c
    where c.archived_at is not null
      and c.name_available_at is not null
      and c.name_available_at > now()   -- game-rules: CREW_NAME_HOLD_AFTER_ARCHIVE_DAYS
      and lower(btrim(c.name)) = lower(v_name)
  ) then
    return jsonb_build_object('ok', false, 'reason', 'name_unavailable');
  end if;

  if p_color is null or p_color < 0 or p_color >= 12 then   -- game-rules: CREW_COLORS_COUNT
    return jsonb_build_object('ok', false, 'reason', 'bad_color');
  end if;
  if not exists (select 1 from public.city_zones z where z.city_id = p_city_id) then
    return jsonb_build_object('ok', false, 'reason', 'bad_city');
  end if;
  if exists (
    select 1 from public.crew_members cm where cm.user_id = v_uid and cm.left_at is null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_in_crew');
  end if;

  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  -- Code 6 chars A-Z0-9 généré SERVEUR (0036 : jamais lisible côté client).
  loop
    v_try := v_try + 1;
    select string_agg(
             substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
                    (get_byte(b, i) % 36) + 1, 1), '')
      into v_code
    from (select extensions.gen_random_bytes(6) as b) g,
         generate_series(0, 5) as i;
    begin
      insert into public.crews (name, color, city_id, code, created_by)
      values (v_name, p_color, p_city_id, v_code, v_uid)
      returning * into v_crew;
      exit;
    exception when unique_violation then
      if v_try >= 5 then raise; end if;
    end;
  end loop;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'founder');

  return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
    'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color,
    'city_id', v_crew.city_id, 'code', v_crew.code));
end;
$$;

revoke all on function public.create_crew(text, smallint, text) from public, anon;
grant execute on function public.create_crew(text, smallint, text) to authenticated;

comment on function public.create_crew(text, smallint, text) is
  'Créer un crew. Modération de nom (0050) + NOM TENU d''un crew dissous '
  '(0190, même motif name_unavailable : on ne raconte pas l''histoire d''un '
  'groupe à qui n''en était pas). Cooldown CREW_SWITCH_COOLDOWN_DAYS, code '
  'généré serveur, le créateur entre en founder.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. `join_crew_by_code` ET `crew_join_intent` — DEUX CORRECTIONS, LES MÊMES
--
-- Copies conformes de 0093 §7 et §8, à deux ajouts près, tous deux justifiés :
--   · UN RETRAIT AUTOMATIQUE N'EST PAS UN DÉPART VOLONTAIRE. 0093 lit
--     `removed_by is null` pour dire « il est parti de lui-même » ; le job
--     d'inactivité (§8) ne peut pas renseigner `removed_by`, faute d'auteur
--     humain. Sans `removed_by_server`, un membre RETIRÉ par le serveur serait
--     traité comme un nomade et se verrait infliger les 7 jours que 0093 refuse
--     précisément d'infliger à quelqu'un qu'on met dehors ;
--   · UN CREW ARCHIVÉ NE RECRUTE PAS. `dead_crew` le dit déjà par ricochet
--     (plus aucun membre actif), mais un crew archivé dont un membre serait
--     réinséré par une voie tierce redeviendrait joignable : la garde porte donc
--     sur l'ARCHIVAGE lui-même, pas sur son effet de bord.
-- Le reste — plafond, casse du code, idempotence, motif unique `bad_code` —
-- est INCHANGÉ.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.join_crew_by_code(p_code text) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_code char(6);
  v_crew public.crews%rowtype;
  v_last_left timestamptz;
  v_days_left integer;
  v_active_count integer;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code !~ '^[A-Z0-9]{6}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;
  select * into v_crew from public.crews c where c.code = v_code;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'bad_code');
  end if;

  -- Idempotent : déjà membre actif de CE crew → succès sans rien changer.
  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.crew_id = v_crew.id and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
      'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
  end if;

  -- CREW ARCHIVÉ (0190) : le code d'un crew dissous n'ouvre plus rien.
  if v_crew.archived_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'dead_crew');
  end if;

  -- Le cooldown ne compte que les départs CHOISIS (0093 + 0190).
  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null
    and cm.removed_by is null and cm.removed_by_server = false;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', false, 'reason', 'cooldown', 'daysLeft', v_days_left);
  end if;

  perform 1 from public.crews c where c.id = v_crew.id for update;
  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = v_crew.id and cm.left_at is null;

  if v_active_count = 0 then
    return jsonb_build_object('ok', false, 'reason', 'dead_crew');
  end if;

  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  update public.crew_members cm
  set left_at = now()
  where cm.user_id = v_uid and cm.left_at is null;

  insert into public.crew_members (crew_id, user_id, role)
  values (v_crew.id, v_uid, 'rookie');   -- game-rules: CREW_ENTRY_ROLE

  return jsonb_build_object('ok', true, 'crew', jsonb_build_object(
    'id', v_crew.id, 'name', v_crew.name, 'color', v_crew.color, 'city_id', v_crew.city_id));
end;
$$;

comment on function public.join_crew_by_code(text) is
  'Rejoindre un crew par code. Motif UNIQUE bad_code (zéro énumération). '
  'Cooldown CREW_SWITCH_COOLDOWN_DAYS sur les seuls départs VOLONTAIRES '
  '(removed_by is null ET removed_by_server false, 0190). Refuse un crew sans '
  'membre actif ET un crew ARCHIVÉ (dead_crew).';

create or replace function public.crew_join_intent(p_crew_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid          uuid := auth.uid();
  v_crew         public.crews%rowtype;
  v_last_left    timestamptz;
  v_days_left    integer;
  v_active_count integer;
  v_pending      boolean;
begin
  if v_uid is null then
    return jsonb_build_object('ok', true, 'intent', 'signed_out');
  end if;

  select * into v_crew from public.crews c where c.id = p_crew_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.crew_id = p_crew_id and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'intent', 'member');
  end if;

  -- CREW ARCHIVÉ (0190) : la fiche reste lisible — l'histoire ne s'efface pas —
  -- mais aucun geste n'y est possible, et l'écran doit le dire au lieu de
  -- peindre un bouton qui échouera.
  if v_crew.archived_at is not null then
    return jsonb_build_object('ok', true, 'intent', 'archived');
  end if;

  if exists (
    select 1 from public.crew_members cm
    where cm.user_id = v_uid and cm.left_at is null
  ) then
    return jsonb_build_object('ok', true, 'intent', 'already_in_crew');
  end if;

  select max(cm.left_at) into v_last_left
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is not null
    and cm.removed_by is null and cm.removed_by_server = false;
  if v_last_left is not null
     and v_last_left > now() - interval '7 days' then   -- game-rules: CREW_SWITCH_COOLDOWN_DAYS
    v_days_left := ceil(extract(epoch from (v_last_left + interval '7 days' - now())) / 86400.0);
    return jsonb_build_object('ok', true, 'intent', 'cooldown', 'daysLeft', v_days_left);
  end if;

  select count(*) into v_active_count
  from public.crew_members cm
  where cm.crew_id = p_crew_id and cm.left_at is null;
  if v_active_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', true, 'intent', 'full');
  end if;

  select exists (
    select 1 from public.crew_applications ca
    where ca.crew_id = p_crew_id and ca.user_id = v_uid and ca.status = 'pending'
  ) into v_pending;
  if v_pending then
    return jsonb_build_object('ok', true, 'intent', 'pending');
  end if;

  return jsonb_build_object('ok', true, 'intent',
    case v_crew.recruitment_status
      when 'open' then 'join'
      when 'closed' then 'closed'
      when 'invite_only' then 'invite_only'
      else 'request'
    end);
end;
$$;

comment on function public.crew_join_intent(uuid) is
  'Ce que je peux RÉELLEMENT faire face à ce crew (E39/E40, G16). Depuis 0190 : '
  'rend `archived` pour un crew dissous, et le cooldown ne compte plus un '
  'retrait AUTOMATIQUE comme un départ volontaire. ⚠ Ne connaît NI les '
  'exigences NI la charte : l''écran appelle crew_eligibility_2026 (0188) avant '
  'de peindre le bouton.';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. `crew_resolve_warning_2026` — UN OFFICIER LÈVE CE QU'IL A POSÉ
--
-- HORS DES 13 RPC DE LA SPEC, ET ASSUMÉ. Le garde-fou ③ de la décision 1 dit
-- « un avertissement se LÈVE dès que le fait qui l'a produit cesse ». Le job
-- (§8) lève les trois avertissements MESURÉS ; l'avertissement `manual` n'a
-- aucun fait mesurable, donc rien ne pouvait le lever — il serait resté ouvert à
-- vie, y compris posé par erreur. Une sanction sans voie de retour n'est pas une
-- règle, c'est une trace indélébile.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_resolve_warning_2026(p_warning_id uuid) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_role    text;
  v_w       public.crew_warnings_2026%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  -- game-rules: CREW_PERMISSIONS.kick
  if v_role is null or v_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  select * into v_w from public.crew_warnings_2026 w
  where w.id = p_warning_id and w.crew_id = v_crew_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_w.resolved_at is not null then
    return jsonb_build_object('ok', true, 'effect', 'already_resolved');
  end if;

  update public.crew_warnings_2026 w set resolved_at = now() where w.id = v_w.id;

  insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail)
  values (v_crew_id, 'warning', v_uid, v_w.user_id, 'resolved',
          jsonb_build_object('warningId', v_w.id, 'kind', v_w.kind));

  return jsonb_build_object('ok', true, 'effect', 'resolved');
end;
$$;

comment on function public.crew_resolve_warning_2026(uuid) is
  'Lève un avertissement de SON crew (CREW_PERMISSIONS.kick). Existe pour '
  'l''avertissement `manual`, que le job ne peut pas lever faute de fait '
  'mesurable — sans elle, un avertissement posé par erreur resterait ouvert à '
  'vie. Remet à zéro l''horloge du retrait quand il s''agit d''une inactivité.';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. `crew_invite_by_handle_2026` — LA PORTE HUMAINE
--
-- game-rules: CREW_PERMISSIONS.invite === ['co_captain', 'founder'].
--
-- ELLE OUTREPASSE LES EXIGENCES, ET C'EST TOUT SON INTÉRÊT (leçon ② de Clash,
-- spec §1.3) : sans porte humaine à côté du seuil, l'exigence devient un mur et
-- les débutants ne trouvent plus de place. L'invitation ne consulte donc NI
-- `crew_rules_2026.requirements` NI la charte.
--
-- ⚠ AUCUNE TABLE D'INVITATION NOMINATIVE N'EST CRÉÉE, et c'est délibéré : le
-- jeton de 0090 EXISTE, il est révocable, expirable, plafonné, et son
-- acceptation (`redeem_crew_invite`) est déjà écrite et testée. Cette RPC pose
-- donc un jeton et le remet à la personne visée DANS SA BOÎTE DE RÉCEPTION —
-- `notifications` est en lecture PROPRIÉTAIRE SEUL (0006). Fabriquer une
-- seconde mécanique d'acceptation aurait dupliqué le seul chemin d'entrée déjà
-- éprouvé, donc ouvert un second endroit où oublier une borne.
--
-- ⚠ ZÉRO ÉNUMÉRATION : un pseudo inconnu, un compte en suppression et un compte
-- déjà dans un crew rendent des motifs distincts uniquement quand le fait est
-- déjà connu de l'appelant. `not_found` couvre l'inconnu ET le supprimé.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_invite_by_handle_2026(p_handle text) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_crew_id  uuid;
  v_role     text;
  v_handle   text := lower(btrim(coalesce(p_handle, '')));
  v_target   uuid;
  v_count    integer;
  v_invite   jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;
  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;
  -- game-rules: CREW_PERMISSIONS.invite
  if v_role is null or v_role not in ('co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;
  if v_handle !~ '^[a-z0-9_]{3,20}$' then   -- game-rules: HANDLE_REGEX
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select up.user_id into v_target
  from public.user_profiles up
  join public.users u on u.id = up.user_id and u.deletion_requested_at is null
  where up.handle = v_handle;
  if v_target is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;
  if v_target = v_uid then
    return jsonb_build_object('ok', false, 'reason', 'self');
  end if;
  if exists (select 1 from public.crew_members cm
             where cm.user_id = v_target and cm.crew_id = v_crew_id and cm.left_at is null) then
    return jsonb_build_object('ok', true, 'effect', 'already_member');
  end if;
  if exists (select 1 from public.crew_members cm
             where cm.user_id = v_target and cm.left_at is null) then
    return jsonb_build_object('ok', false, 'reason', 'already_in_crew');
  end if;

  perform 1 from public.crews c where c.id = v_crew_id for update;
  select count(*) into v_count from public.crew_members cm
  where cm.crew_id = v_crew_id and cm.left_at is null;
  if v_count >= 50 then   -- game-rules: CREW_MAX_MEMBERS
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  -- Le jeton de 0090, avec ses bornes : TTL par défaut, plafond d'invitations
  -- vivantes, révocabilité. Un refus de `create_crew_invite` remonte tel quel.
  v_invite := public.create_crew_invite(null);
  if not (v_invite->>'ok')::boolean then
    return v_invite;
  end if;

  -- §3.4 `invited`. Le jeton voyage dans le payload d'une ligne que SEUL le
  -- destinataire peut lire (RLS propriétaire, 0006). Texte de référence FR pour
  -- Q3, tutoiement, sans tiret long : « [crew] t'invite à le rejoindre. »
  perform public.crew_notify_2026(v_target, 'invited', v_crew_id,
    (v_invite->'invite'->>'id'),
    jsonb_build_object(
      'token',     v_invite->'invite'->>'token',
      'prefix',    v_invite->'invite'->>'prefix',
      'expiresAt', v_invite->'invite'->>'expiresAt',
      'invitedBy', (select u.pseudo from public.users u where u.id = v_uid)));

  insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail)
  values (v_crew_id, 'application', v_uid, v_target, 'invited',
          jsonb_build_object('inviteId', v_invite->'invite'->>'id'));

  -- Le jeton NE REVIENT PAS à l'inviteur : il a été remis à la personne visée.
  -- Le lui rendre aussi ferait deux porteurs pour une invitation nominative.
  return jsonb_build_object('ok', true, 'effect', 'invited',
    'expiresAt', v_invite->'invite'->>'expiresAt');
end;
$$;

comment on function public.crew_invite_by_handle_2026(text) is
  'Invite une personne PAR SON PSEUDO (CREW_PERMISSIONS.invite). OUTREPASSE les '
  'exigences d''entrée et la charte : c''est la porte humaine sans laquelle un '
  'seuil devient un mur. Pose un jeton 0090 et le remet dans la boîte de '
  'réception du destinataire ; l''acceptation reste redeem_crew_invite. '
  'not_found couvre le pseudo inconnu ET le compte en suppression.';

-- ════════════════════════════════════════════════════════════════════════════
-- 7. `crew_discovery_2026` — CHERCHER SUR DES FAITS
--
-- `crew_discovery` (0152) prend DEUX paramètres. Celle-ci en prend neuf, tous
-- portant sur des faits que `crews` ou `crew_facts_2026` rendent déjà. Elle ne
-- REMPLACE pas 0152 : le client actuel l'appelle, et casser sa signature aurait
-- éteint la découverte le temps que Q3 sorte.
--
-- ⚠ « JE SUIS ÉLIGIBLE » NE REND JAMAIS LE DÉTAIL D'UN CREW QU'IL ÉCARTE. Le
-- filtre compare les mesures de l'appelant aux exigences de chaque crew CÔTÉ
-- SERVEUR ; un crew écarté disparaît, sans dire lequel de ses seuils a mordu.
-- Le détail n'appartient qu'à la fiche du crew (`crew_eligibility_2026`).
--
-- ⚠ LES CREWS ARCHIVÉS N'APPARAISSENT PAS. Leur histoire reste lisible par leur
-- fiche ; les proposer dans une recherche serait proposer une porte fermée.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.crew_discovery_2026(
  p_city_id      text default null,
  p_query        text default null,
  p_activity     text default null,
  p_recruitment  text default null,
  p_min_members  integer default null,
  p_max_members  integer default null,
  p_requirements text default null,
  p_active_only  boolean default false,
  p_tags         text[] default null
) returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_city     text;
  v_q        text;
  v_measures jsonb;
  v_rows     jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  v_city := nullif(btrim(coalesce(p_city_id, '')), '');
  if v_city is null then
    select u.city_id into v_city from public.users u where u.id = v_uid;
  end if;
  if v_city is null then
    return jsonb_build_object('ok', false, 'reason', 'no_city');
  end if;
  v_q := nullif(btrim(coalesce(p_query, '')), '');

  if p_activity is not null and p_activity not in ('run', 'bike') then
    return jsonb_build_object('ok', false, 'reason', 'bad_activity');
  end if;
  if p_recruitment is not null
     and p_recruitment not in ('open', 'on_request', 'invite_only') then
    return jsonb_build_object('ok', false, 'reason', 'bad_recruitment');
  end if;
  if p_requirements is not null
     and p_requirements not in ('none', 'any', 'eligible') then
    return jsonb_build_object('ok', false, 'reason', 'bad_requirements');
  end if;

  -- Mesurées UNE fois, pas une fois par crew : le filtre « je suis éligible »
  -- compare la même personne à N exigences.
  v_measures := public.crew_member_measures_2026(v_uid, now());

  with matched as (
    select c.id, c.name, c.tag, c.color, c.city_id, c.recruitment_status, c.created_at, c.tags
    from public.crews c
    where c.city_id = v_city
      and c.archived_at is null
      and (p_recruitment is null or c.recruitment_status = p_recruitment)
      -- `closed` n'apparaît jamais : un crew qui ne recrute plus n'est pas un
      -- résultat de recherche de crew.
      and c.recruitment_status <> 'closed'
      and (p_tags is null or array_length(p_tags, 1) is null or c.tags && p_tags)
      and (
        v_q is null
        or c.name ilike '%' || v_q || '%'
        or coalesce(c.tag, '') ilike '%' || v_q || '%'
      )
    order by c.created_at asc, c.id asc
    limit 200
  ),
  fp as (select * from public.crew_facts_2026(array(select m.id from matched m))),
  ru as (
    select cr.crew_id, cr.charter, cr.charter_version,
           coalesce(cr.requirements, '{}'::jsonb) as requirements
    from public.crew_rules_2026 cr
    where cr.crew_id in (select m.id from matched m)
  ),
  mine as (
    select ca.crew_id from public.crew_applications ca
    where ca.user_id = v_uid and ca.status = 'pending'
  ),
  kept as (
    select m.*, fp.member_count, fp.members_holding, fp.holds_run, fp.holds_bike,
           fp.last_capture, fp.upcoming_outings, fp.next_outing_at,
           coalesce(ru.requirements, '{}'::jsonb) as requirements,
           ru.charter is not null as has_charter,
           (mine.crew_id is not null) as my_request_pending,
           public.crew_missing_requirements_2026(coalesce(ru.requirements, '{}'::jsonb), v_measures) as missing
    from matched m
    join fp on fp.crew_id = m.id
    left join ru on ru.crew_id = m.id
    left join mine on mine.crew_id = m.id
    where (p_activity is null
           or (p_activity = 'run' and fp.holds_run) or (p_activity = 'bike' and fp.holds_bike))
      and (p_min_members is null or fp.member_count >= p_min_members)
      and (p_max_members is null or fp.member_count <= p_max_members)
      -- Actif = une sortie à venir OU une prise de contrôle récente. Aucune de
      -- ces deux mesures n'est un classement.
      and (not coalesce(p_active_only, false)
           or fp.next_outing_at is not null
           or fp.last_capture >= now() - interval '14 days')
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', k.id, 'name', k.name, 'tag', k.tag, 'color', k.color, 'cityId', k.city_id,
      'tags', to_jsonb(k.tags),
      'recruitmentStatus', k.recruitment_status,
      'memberCount', k.member_count,
      'upcomingOutings', k.upcoming_outings,
      'nextOutingAt', k.next_outing_at,
      'membersHolding', k.members_holding,
      'holdsRun', k.holds_run,
      'holdsBike', k.holds_bike,
      'lastCaptureAt', k.last_capture,
      'myRequestPending', k.my_request_pending,
      -- CE QUE LE CREW DEMANDE, sans le DÉTAIL de ce qui me manque : la liste
      -- `missing` n'appartient qu'à la fiche du crew (crew_eligibility_2026).
      'hasRequirements', k.requirements <> '{}'::jsonb,
      'hasCharter', k.has_charter,
      'iAmEligible', jsonb_array_length(k.missing) = 0
    )
    order by k.created_at asc, k.id asc
  ), '[]'::jsonb)
  into v_rows
  from kept k
  where p_requirements is null
     or (p_requirements = 'any')
     or (p_requirements = 'none'     and k.requirements = '{}'::jsonb)
     or (p_requirements = 'eligible' and jsonb_array_length(k.missing) = 0);

  return jsonb_build_object(
    'ok', true,
    'cityId', v_city,
    'cityName', (select z.name from public.city_zones z where z.city_id = v_city),
    'rows', v_rows
  );
end;
$$;

comment on function public.crew_discovery_2026(text, text, text, text, integer, integer, text, boolean, text[]) is
  'Découverte À FILTRES (§2.7) : commune, texte, discipline, accueil, taille, '
  'exigences (none/any/eligible), activité récente, étiquettes. N''expose ni '
  'code de crew (0036), ni identité de membre, ni lieu de rendez-vous (0085), '
  'ni surface (0126). « eligible » écarte un crew sans jamais dire lequel de '
  'ses seuils a mordu. Les crews ARCHIVÉS et `closed` n''apparaissent pas.';

-- ════════════════════════════════════════════════════════════════════════════
-- 8. LE JOB D'INACTIVITÉ
--
-- « Le job a-t-il tourné ? » doit avoir une réponse autre qu'un silence
-- (spec §3.3 ⑤) : chaque passage écrit une ligne, même quand il n'a rien
-- trouvé. Sans elle, un job mort et un job sans travail se ressemblent
-- exactement — et c'est le piège que `crew_leaderboard` a déjà tendu au dépôt.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.crew_sweep_log_2026 (
  id         bigint generated always as identity primary key,
  ran_at     timestamptz not null default now(),
  measured_at timestamptz not null,
  crews_seen integer not null default 0,
  warned     integer not null default 0,
  resolved   integer not null default 0,
  removed    integer not null default 0
);
alter table public.crew_sweep_log_2026 enable row level security;
revoke all on public.crew_sweep_log_2026 from public, anon, authenticated;
grant all on public.crew_sweep_log_2026 to service_role;

comment on table public.crew_sweep_log_2026 is
  'Une ligne PAR PASSAGE de sweep_crew_inactivity_2026, même à vide. C''est la '
  'seule façon de distinguer « le job n''a rien trouvé » de « le job ne tourne '
  'plus » — la question que crew_leaderboard (0002) n''a jamais pu répondre.';

/**
 * Applique les règles ACTIVES de chaque crew, à l'instant `p_at`.
 *
 * `p_at` EST LE MODE ACCÉLÉRÉ : les tests avancent l'horloge en paramètre. La
 * valeur par défaut `now()` est celle qu'utilise le job réel.
 *
 * Réservée à `service_role`. Aucun client ne l'appelle : un joueur qui pourrait
 * déclencher le balayage de son propre crew choisirait le moment de son
 * avertissement.
 *
 * L'ORDRE COMPTE : on LÈVE avant d'ÉCRIRE, et on écrit avant de RETIRER. Lever
 * en dernier retirerait quelqu'un dont l'avertissement venait d'être levé par
 * une sortie enregistrée la veille.
 */
create or replace function public.sweep_crew_inactivity_2026(p_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_at       timestamptz := coalesce(p_at, now());
  v_crews    integer := 0;
  v_warned   integer := 0;
  v_resolved integer := 0;
  v_removed  integer := 0;
  v_week     date;
  v_n        integer;
  -- ⚠ NOMMÉE `v_row` ET PAS `r` : `r` est aussi l'alias naturel de
  -- `crew_rules_2026` dans les requêtes ci-dessous, et plpgsql résout une
  -- VARIABLE avant un alias de table. La collision ne se voit pas à la
  -- création — elle lève « record r is not assigned yet » à l'exécution.
  v_row      record;
begin
  -- Le lundi de la semaine ÉCOULÉE, à Paris (mêmes bornes que
  -- `leaderboard_week_bounds_2026`, 0160 : fuseau NOMMÉ, jamais un décalage
  -- fixe, sinon la fenêtre glisserait d'une heure deux fois par an).
  v_week := (date_trunc('week', (v_at at time zone 'Europe/Paris')) - interval '7 days')::date;

  select count(*)::integer into v_crews
  from public.crew_rules_2026 ru
  join public.crews c on c.id = ru.crew_id and c.archived_at is null
  where coalesce((ru.enforcement->>'min_weekly_outings')::numeric, 0) > 0
     or coalesce((ru.enforcement->>'min_challenge_days')::numeric, 0) > 0
     or coalesce((ru.enforcement->>'max_inactivity_days')::numeric, 0) > 0;

  -- ═══ ① LEVER LES AVERTISSEMENTS DONT LE FAIT A CESSÉ ═══════════════════
  -- Inactivité : une sortie enregistrée depuis annule l'avertissement, et
  -- l'horloge du retrait repart de zéro (garde-fou ③ de la décision 1).
  update public.crew_warnings_2026 w
  set resolved_at = v_at
  from public.crew_rules_2026 ru
  where w.crew_id = ru.crew_id and w.kind = 'inactivity' and w.resolved_at is null
    and coalesce((ru.enforcement->>'max_inactivity_days')::numeric, 0) > 0
    and exists (
      select 1 from public.runs rr
      where rr.user_id = w.user_id and rr.status in ('valid', 'partial')
        and rr.started_at > v_at - make_interval(days => (ru.enforcement->>'max_inactivity_days')::integer)
    );
  get diagnostics v_n = row_count; v_resolved := v_resolved + v_n;

  -- Sorties de la semaine : une course ingérée en retard peut rendre la semaine
  -- conforme après coup. Ne pas lever l'avertissement laisserait quelqu'un
  -- « averti » pour une semaine qu'il a en réalité tenue.
  update public.crew_warnings_2026 w
  set resolved_at = v_at
  from public.crew_rules_2026 ru
  where w.crew_id = ru.crew_id and w.kind = 'weekly_outings' and w.resolved_at is null
    and coalesce((ru.enforcement->>'min_weekly_outings')::numeric, 0) > 0
    and (
      select count(*) from public.runs rr
      where rr.user_id = w.user_id and rr.status in ('valid', 'partial')
        and (rr.started_at at time zone 'Europe/Paris')::date >= w.week_key::date
        and (rr.started_at at time zone 'Europe/Paris')::date < w.week_key::date + 7
    ) >= (ru.enforcement->>'min_weekly_outings')::numeric;
  get diagnostics v_n = row_count; v_resolved := v_resolved + v_n;

  -- Défi : une journée re-validée après un retrait (0148) rend la conformité.
  update public.crew_warnings_2026 w
  set resolved_at = v_at
  from public.crew_rules_2026 ru
  where w.crew_id = ru.crew_id and w.kind = 'challenge' and w.resolved_at is null
    and coalesce((ru.enforcement->>'min_challenge_days')::numeric, 0) > 0
    and (
      select count(distinct cc.day) from public.challenge_contributions_2026 cc
      where cc.challenge_id = w.week_key::uuid and cc.player_id = w.user_id
        and cc.crew_id = w.crew_id and cc.withdrawn = false
    ) >= (ru.enforcement->>'min_challenge_days')::numeric;
  get diagnostics v_n = row_count; v_resolved := v_resolved + v_n;

  -- ═══ ② ÉCRIRE LES AVERTISSEMENTS DUS ═══════════════════════════════════
  -- L'unique PARTIELLE fait tout le travail d'idempotence : `on conflict do
  -- nothing` sur (crew, membre, nature, clé) tant que rien n'est résolu.
  --
  -- INACTIVITÉ. `week_key = ''` : UN SEUL avertissement ouvert à la fois, dont
  -- `issued_at` porte l'horloge du retrait. Un arrivant récent n'est jamais
  -- averti : on n'exige pas de quelqu'un qu'il ait couru avant d'arriver.
  for v_row in
    select w.crew_id, w.user_id, w.after_days
    from (
      select cm.crew_id, cm.user_id,
             nullif(coalesce((ru.enforcement->>'auto_remove_after_days')::integer, 0), 0) as after_days
      from public.crew_members cm
      join public.crew_rules_2026 ru on ru.crew_id = cm.crew_id
      join public.crews c on c.id = cm.crew_id and c.archived_at is null
      where cm.left_at is null
        and coalesce((ru.enforcement->>'max_inactivity_days')::numeric, 0) > 0
        and cm.joined_at <= v_at - make_interval(days => (ru.enforcement->>'max_inactivity_days')::integer)
        and not exists (
          select 1 from public.runs rr
          where rr.user_id = cm.user_id and rr.status in ('valid', 'partial')
            and rr.started_at > v_at - make_interval(days => (ru.enforcement->>'max_inactivity_days')::integer)
        )
    ) w
  loop
    insert into public.crew_warnings_2026 (crew_id, user_id, kind, issued_by, issued_at, week_key)
    values (v_row.crew_id, v_row.user_id, 'inactivity', null, v_at, '')
    on conflict (crew_id, user_id, kind, week_key) where resolved_at is null do nothing;
    if found then
      v_warned := v_warned + 1;
      insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail, decided_at)
      values (v_row.crew_id, 'warning', null, v_row.user_id, 'inactivity', '{}'::jsonb, v_at);
      -- §3.4 `warning_issued`, TRANSACTIONNEL (décision 4). Texte de référence
      -- FR pour Q3, tutoiement, sans tiret long : « [crew] : ta dernière sortie
      -- remonte à plus de [n] jours. » Aucune injonction à courir (§14.2).
      --
      -- `removalAt` VOYAGE AVEC L'AVERTISSEMENT, et il n'existe PAS de second
      -- message « retrait imminent » : la spec §3.4 en nommait un, mais deux
      -- sollicitations pour le MÊME fait sont exactement ce que §14.3 demande
      -- de regrouper. `null` quand le retrait n'est pas armé — donc l'écran
      -- n'annonce jamais un risque qui n'existe pas.
      perform public.crew_notify_2026(v_row.user_id, 'warning_issued', v_row.crew_id,
        v_row.crew_id::text || ':inactivity:' || to_char(v_at, 'YYYY-MM-DD'),
        jsonb_build_object(
          'kind', 'inactivity',
          'removalAt', case when v_row.after_days is not null
                            then v_at + make_interval(days => v_row.after_days) end),
        v_at);
    end if;
  end loop;

  -- SORTIES DE LA SEMAINE ÉCOULÉE. Évaluée chaque jour mais CLÉE par le lundi
  -- de la semaine mesurée : le premier passage de la semaine écrit, les six
  -- suivants ne font rien. Un membre arrivé en cours de semaine n'est pas jugé
  -- sur une semaine qu'il n'a pas vécue.
  for v_row in
    select cm.crew_id, cm.user_id
    from public.crew_members cm
    join public.crew_rules_2026 ru on ru.crew_id = cm.crew_id
    join public.crews c on c.id = cm.crew_id and c.archived_at is null
    where cm.left_at is null
      and coalesce((ru.enforcement->>'min_weekly_outings')::numeric, 0) > 0
      and (cm.joined_at at time zone 'Europe/Paris')::date <= v_week
      and (
        select count(*) from public.runs rr
        where rr.user_id = cm.user_id and rr.status in ('valid', 'partial')
          and (rr.started_at at time zone 'Europe/Paris')::date >= v_week
          and (rr.started_at at time zone 'Europe/Paris')::date < v_week + 7
      ) < (ru.enforcement->>'min_weekly_outings')::numeric
  loop
    insert into public.crew_warnings_2026 (crew_id, user_id, kind, issued_by, issued_at, week_key)
    values (v_row.crew_id, v_row.user_id, 'weekly_outings', null, v_at, v_week::text)
    on conflict (crew_id, user_id, kind, week_key) where resolved_at is null do nothing;
    if found then
      v_warned := v_warned + 1;
      insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail, decided_at)
      values (v_row.crew_id, 'warning', null, v_row.user_id, 'weekly_outings',
              jsonb_build_object('week', v_week), v_at);
      perform public.crew_notify_2026(v_row.user_id, 'warning_issued', v_row.crew_id,
        v_row.crew_id::text || ':weekly:' || v_week::text,
        jsonb_build_object('kind', 'weekly_outings', 'week', v_week), v_at);
    end if;
  end loop;

  -- DÉFI CLOS. Seuls les joueurs RÉELLEMENT inscrits au défi sont jugés : un
  -- membre hors roster n'a jamais pu contribuer, et l'avertir serait absurde.
  for v_row in
    select ct.crew_id, ro.player_id as user_id, ct.challenge_id
    from public.challenge_teams_2026 ct
    join public.crew_challenges_2026 c2 on c2.id = ct.challenge_id
    join public.challenge_roster_2026 ro
      on ro.challenge_id = ct.challenge_id and ro.crew_id = ct.crew_id and ro.reserved
    join public.crew_rules_2026 ru on ru.crew_id = ct.crew_id
    join public.crews c on c.id = ct.crew_id and c.archived_at is null
    join public.crew_members cm on cm.crew_id = ct.crew_id and cm.user_id = ro.player_id and cm.left_at is null
    where coalesce((ru.enforcement->>'min_challenge_days')::numeric, 0) > 0
      and c2.status <> 'cancelled'
      and c2.ends_at <= v_at
      -- Fenêtre de rattrapage : on ne réveille pas des défis d'il y a six mois
      -- le jour où un capitaine arme la règle.
      and c2.ends_at > v_at - interval '7 days'
      and (
        select count(distinct cc.day) from public.challenge_contributions_2026 cc
        where cc.challenge_id = ct.challenge_id and cc.player_id = ro.player_id
          and cc.crew_id = ct.crew_id and cc.withdrawn = false
      ) < (ru.enforcement->>'min_challenge_days')::numeric
  loop
    insert into public.crew_warnings_2026 (crew_id, user_id, kind, issued_by, issued_at, week_key)
    values (v_row.crew_id, v_row.user_id, 'challenge', null, v_at, v_row.challenge_id::text)
    on conflict (crew_id, user_id, kind, week_key) where resolved_at is null do nothing;
    if found then
      v_warned := v_warned + 1;
      insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail, decided_at)
      values (v_row.crew_id, 'warning', null, v_row.user_id, 'challenge',
              jsonb_build_object('challengeId', v_row.challenge_id), v_at);
      perform public.crew_notify_2026(v_row.user_id, 'warning_issued', v_row.crew_id,
        v_row.crew_id::text || ':challenge:' || v_row.challenge_id::text,
        jsonb_build_object('kind', 'challenge', 'challengeId', v_row.challenge_id), v_at);
    end if;
  end loop;

  -- ═══ ③ RETIRER — sous les TROIS garde-fous de la décision 1 ═════════════
  for v_row in
    select w.id as warning_id, w.crew_id, w.user_id, w.issued_at, cm.role,
           (ru.enforcement->>'auto_remove_after_days')::integer as after_days
    from public.crew_warnings_2026 w
    join public.crew_rules_2026 ru on ru.crew_id = w.crew_id
    join public.crews c on c.id = w.crew_id and c.archived_at is null
    join public.crew_members cm
      on cm.crew_id = w.crew_id and cm.user_id = w.user_id and cm.left_at is null
    where w.kind = 'inactivity' and w.resolved_at is null
      -- garde-fou ① : la règle est ARMÉE, et elle exige un avertissement
      -- préalable — qui est précisément la ligne qu'on est en train de lire.
      and coalesce((ru.enforcement->>'auto_remove_after_days')::numeric, 0) > 0
      and v_at >= w.issued_at + make_interval(days => (ru.enforcement->>'auto_remove_after_days')::integer)
      -- DÉCISION 4 : jamais retiré sans avertissement LU, ou vieux de N jours.
      and (w.acknowledged_at is not null
           or v_at >= w.issued_at + make_interval(days => public.crew_warning_grace_days()))
      -- garde-fou ② : un crew ne se décapite pas tout seul.
      and cm.role not in ('founder', 'co_captain')
    for update of w, cm
  loop
    update public.crew_members cm
    set left_at = v_at, removed_by_server = true
    where cm.crew_id = v_row.crew_id and cm.user_id = v_row.user_id and cm.left_at is null;

    update public.crew_warnings_2026 w set resolved_at = v_at
    where w.crew_id = v_row.crew_id and w.user_id = v_row.user_id and w.resolved_at is null;

    insert into public.crew_kicks_2026 (crew_id, user_id, reason, note, decided_by, decided_at, rejoin_allowed_at)
    values (v_row.crew_id, v_row.user_id, 'inactivity', null, null, v_at,
            v_at + make_interval(days => public.crew_rejoin_after_kick_days()));

    insert into public.crew_decisions_2026 (crew_id, kind, actor_id, target_id, reason, detail, decided_at)
    values (v_row.crew_id, 'removal', null, v_row.user_id, 'inactivity',
            jsonb_build_object('previousRole', v_row.role, 'warningIssuedAt', v_row.issued_at,
                               'afterDays', v_row.after_days), v_at);

    -- §3.4 `removed`, TRANSACTIONNEL. Texte de référence FR pour Q3 :
    -- « Tu ne fais plus partie de [crew]. Motif indiqué : inactivité. »
    perform public.crew_notify_2026(v_row.user_id, 'removed', v_row.crew_id,
      v_row.crew_id::text || ':auto:' || to_char(v_at, 'YYYY-MM-DD'),
      jsonb_build_object('reason', 'inactivity', 'automatic', true), v_at);

    v_removed := v_removed + 1;
  end loop;

  insert into public.crew_sweep_log_2026 (ran_at, measured_at, crews_seen, warned, resolved, removed)
  values (now(), v_at, v_crews, v_warned, v_resolved, v_removed);

  return jsonb_build_object(
    'ok', true, 'crews', v_crews, 'warned', v_warned,
    'resolved', v_resolved, 'removed', v_removed, 'at', v_at);
end;
$$;

comment on function public.sweep_crew_inactivity_2026(timestamptz) is
  'Applique les règles ACTIVES de chaque crew : lève les avertissements dont le '
  'fait a cessé, écrit ceux qui sont dus, retire les inactifs sous les trois '
  'garde-fous (règle armée + avertissement préalable · jamais founder ni '
  'co_captain · avertissement acquitté ou vieux de CREW_WARNING_GRACE_DAYS). '
  'IDEMPOTENT par l''unique partielle de crew_warnings_2026. p_at est le mode '
  'accéléré des tests. service_role SEUL.';

revoke all on function public.join_crew_by_code(text) from public, anon;
revoke all on function public.crew_join_intent(uuid) from public, anon;
revoke all on function public.crew_dissolve_2026(text) from public, anon;
revoke all on function public.crew_resolve_warning_2026(uuid) from public, anon;
revoke all on function public.crew_invite_by_handle_2026(text) from public, anon;
revoke all on function public.crew_discovery_2026(text, text, text, text, integer, integer, text, boolean, text[])
  from public, anon;
-- Le balayage n'est JAMAIS appelable par un client : quelqu'un qui pourrait le
-- déclencher choisirait le moment de son propre avertissement.
revoke all on function public.sweep_crew_inactivity_2026(timestamptz)
  from public, anon, authenticated;

grant execute on function public.join_crew_by_code(text) to authenticated;
grant execute on function public.crew_join_intent(uuid) to authenticated;
grant execute on function public.crew_dissolve_2026(text) to authenticated;
grant execute on function public.crew_resolve_warning_2026(uuid) to authenticated;
grant execute on function public.crew_invite_by_handle_2026(text) to authenticated;
grant execute on function public.crew_discovery_2026(text, text, text, text, integer, integer, text, boolean, text[])
  to authenticated;
grant execute on function public.sweep_crew_inactivity_2026(timestamptz) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 9. L'HORLOGE — patron de 0163 §3 et 0168, conditionnel au schéma `cron`
--
-- `pg_cron` 1.6.4 est INSTALLÉ en production (vérifié le 09/09/2026, 0163) avec
-- des jobs qui appellent du SQL sans passer par le réseau. Le `do $$ … $$`
-- conditionnel garde ce fichier REJOUABLE sur une base de test où le schéma
-- `cron` n'existe pas — PGlite, notamment. `cron.schedule` sur un nom existant
-- REMPLACE la planification : réappliquer la migration ne crée pas un doublon.
-- ════════════════════════════════════════════════════════════════════════════
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule(
      'crew-inactivity-sweep-2026',
      '10 3 * * *',   -- quotidien, UTC ; l'idempotence rend le fuseau sans effet
      'select public.sweep_crew_inactivity_2026()'
    );
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS (dit ici plutôt que laissé croire)
--
-- · UNE DISSOLUTION NE SE DÉFAIT PAS. Aucune RPC ne « désarchive » : rendre un
--   crew à la vie demanderait de décider qui en reprend la direction et qui y
--   rentre, ce qui est une décision de produit, pas de plomberie. La ligne, elle,
--   est intacte : le jour où cette décision est prise, rien n'aura été perdu.
-- · `redeem_crew_invite` (0090) APPLIQUE LE COOLDOWN À TOUS LES DÉPARTS, y
--   compris aux exclusions (`left_at is not null` sans `removed_by is null`) —
--   divergence héritée de 0043 que ce lot ne corrige pas, faute de mandat. Une
--   personne exclue ailleurs il y a moins de 7 jours ne peut donc pas encore
--   accepter une invitation par pseudo.
-- · `crew_discovery` (0152) N'EST PAS REMPLACÉE : deux découvertes coexistent
--   jusqu'à ce que Q3 bascule l'appel. L'ancienne montre encore les crews
--   ARCHIVÉS (avec un effectif de zéro et un accueil « fermé »).
-- · LE JOB NE TOURNE QUE LÀ OÙ `pg_cron` EST INSTALLÉ. Ailleurs, aucune règle
--   n'est appliquée — et aucune ligne de `crew_sweep_log_2026` ne le laissera
--   croire : l'absence de passage se lit, elle ne se devine pas.
-- · AUCUN `min_weekly_outings` NE COMPTE LES SORTIES DE GROUPE. La règle mesure
--   des COURSES (`runs`), pas des présences à un rendez-vous : exiger la
--   présence à une sortie de crew ferait dépendre l'appartenance de la
--   disponibilité d'un soir, ce que §14.2 refuse.
-- ════════════════════════════════════════════════════════════════════════════
