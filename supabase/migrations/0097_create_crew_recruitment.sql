-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — 0097 · E41 : LE FONDATEUR CHOISIT QUI PEUT ENTRER, DÈS LA CRÉATION
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ─── LE MANQUE, EXACTEMENT ─────────────────────────────────────────────────
-- `create_crew` (0042 → 0043 → 0050) n'écrit PAS `recruitment_status`. Tout crew
-- né dans GRYD tombe donc sur le défaut de la colonne — `'on_request'` (0013) —
-- sans que son fondateur l'ait décidé ni même appris.
--
-- Ce n'est pas un détail cosmétique, et c'est aujourd'hui le point de friction
-- N°1 du jeu : la base est VIDE de crews. Chaque joueur qui arrive atterrit sur
-- E38 « sans crew ». Le premier qui fonde crée mécaniquement un crew « sur
-- demande » ; les suivants le trouvent par la découverte (0083) et ne peuvent
-- que CANDIDATER — puis attendre que le fondateur revienne sur l'app pour
-- accepter. Le seul chemin d'entrée immédiat qui restait était le CODE, un
-- secret qu'il faut déjà avoir reçu de quelqu'un.
--
-- La spéc produit E41 (l.1547) le demande d'ailleurs noir sur blanc :
-- « accès : public, sur demande, privé ». Le champ manquait, pas la règle.
--
-- ─── POURQUOI CE CHAMP-LÀ ET PAS LES AUTRES DE LA PLANCHE E41 ──────────────
-- E41 liste aussi `handle`, `emblème` et `couleur validée`. Ils ne sont PAS
-- livrés ici, pour les motifs déjà établis et vérifiés dans l'en-tête de 0084 :
--   · `color` — la colonne existe, mais AUCUNE surface du dépôt ne la rend
--     (le rendu carte va par RÔLE, §C ; le blason de `CrewHero` est en tokens).
--     Un sélecteur de couleur serait un contrôle sans effet visible : la
--     définition d'un bouton mort, doublé du mensonge « ton crew est vert ».
--   · emblème / bannière — AUCUNE colonne n'existe ; ce qui existe est un
--     inventaire d'objets achetables (0014) sans notion de pièce équipée.
--   · `tag` — la colonne existe, mais son changement exige une redirection de
--     30 jours (planche E21) qu'aucune table ne porte.
-- `recruitment_status`, lui, est LU (crew_discovery + crew_public_profile, 0083)
-- et HONORÉ (crew_join_intent, 0083 §5). C'est la différence entre livrer un
-- champ et peindre un champ.
--
-- ─── ADDITIVE, ET RÉTROCOMPATIBLE AVEC LES CLIENTS DÉJÀ INSTALLÉS ──────────
-- La base est en PRODUCTION (0001-0096 appliquées, vrais comptes). Cette
-- migration :
--   · ne touche AUCUNE donnée : ni DDL de table, ni UPDATE, ni DELETE. Les crews
--     déjà créés gardent le statut qu'ils ont ;
--   · ne change AUCUN défaut : `p_recruitment_status` omis ⇒ on n'écrit pas la
--     colonne ⇒ le défaut `'on_request'` de 0013 s'applique, à l'identique
--     d'avant. Un client de l'App Store qui appelle encore la RPC avec trois
--     arguments obtient EXACTEMENT le comportement d'hier ;
--   · remplace la signature à 3 arguments par une signature à 4 dont le
--     quatrième a un DÉFAUT. C'est délibéré : garder les deux ferait deux
--     fonctions candidates pour un appel à 3 arguments — PostgREST devrait
--     trancher une ambiguïté, et le jour où l'une des deux dérive, la moitié des
--     créations passerait par la version périmée. Une seule fonction, un seul
--     comportement. `drop function` ne détruit aucune donnée.
--
-- Source de vérité des constantes : packages/shared/src/game-rules.ts. Chaque
-- valeur reprise porte son `-- game-rules: NOM`, et le test PGlite
-- `supabase/tests/create_crew_recruitment.pglite.test.mjs` RELIT le fichier
-- source pour prouver qu'aucune n'a dérivé.
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══ 1. L'ancienne signature s'en va ════════════════════════════════════════
-- `create or replace function` ne peut PAS ajouter un paramètre : il créerait
-- une surcharge. On retire donc explicitement la version à 3 arguments.
drop function if exists public.create_crew(text, smallint, text);

-- ═══ 2. create_crew, avec l'accès choisi ════════════════════════════════════
-- Corps repris VERBATIM de 0050 (modération du nom incluse), à trois ajouts
-- près, tous marqués `-- 0097` :
--   a. le paramètre `p_recruitment_status`, NULLABLE = « je ne me prononce pas » ;
--   b. sa validation contre le sous-ensemble autorisé à la création ;
--   c. son écriture, et son renvoi dans la charge utile.
create or replace function public.create_crew(
  p_name text,
  p_color smallint,
  p_city_id text,
  p_recruitment_status text default null   -- 0097 (a) — null = défaut de la colonne
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

  if p_color is null or p_color < 0 or p_color >= 12 then   -- game-rules: CREW_COLORS_COUNT
    return jsonb_build_object('ok', false, 'reason', 'bad_color');
  end if;

  -- 0097 (b) — L'ACCÈS. Trois valeurs seulement : ce sont celles que le produit
  -- propose à la naissance d'un crew (game-rules: CREW_RECRUITMENT_AT_CREATION).
  -- `closed` est volontairement HORS liste : « je ne recrute plus » n'a pas de
  -- sens pour un crew d'un membre, et le fondateur y accède plus tard par
  -- `crew_edit` (0084). Le refus est explicite plutôt que silencieusement replié
  -- sur le défaut : un client qui envoie une valeur inconnue doit l'apprendre,
  -- pas croire qu'il a été obéi.
  if p_recruitment_status is not null
     and p_recruitment_status not in ('open', 'on_request', 'invite_only') then
    return jsonb_build_object('ok', false, 'reason', 'bad_recruitment_status');
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
      -- 0097 (c) — Le défaut est REDIT ici en clair plutôt que laissé à la
      -- colonne : `coalesce` ne peut pas prendre le mot-clé `default`, et un
      -- INSERT qui omettrait la colonne selon la valeur d'un paramètre exigerait
      -- deux branches d'INSERT. Le littéral porte donc sa marque `game-rules:`,
      -- et le test PGlite vérifie qu'il vaut bien CREW_RECRUITMENT_DEFAULT ET le
      -- défaut de la colonne — les trois ne peuvent pas diverger en silence.
      insert into public.crews (name, color, city_id, code, created_by, recruitment_status)
      values (
        v_name, p_color, p_city_id, v_code, v_uid,
        coalesce(p_recruitment_status, 'on_request')   -- game-rules: CREW_RECRUITMENT_DEFAULT
      )
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
    'city_id', v_crew.city_id, 'code', v_crew.code,
    -- 0097 (c) — RENVOYÉ pour que l'écran confirme ce qui a VRAIMENT été écrit,
    -- au lieu de réafficher ce que l'utilisateur croit avoir choisi.
    'recruitment_status', v_crew.recruitment_status));
end;
$$;

revoke all on function public.create_crew(text, smallint, text, text) from public, anon;
grant execute on function public.create_crew(text, smallint, text, text) to authenticated;

comment on function public.create_crew(text, smallint, text, text) is
  'E41 — crée un crew et son fondateur. Le 4e argument (0097) porte l''ACCÈS '
  'choisi : open | on_request | invite_only (game-rules: '
  'CREW_RECRUITMENT_AT_CREATION). NULL = défaut de la colonne (on_request), donc '
  'un client à 3 arguments garde le comportement d''avant 0097. `closed` est '
  'refusé ici : il se règle plus tard par crew_edit (0084).';
