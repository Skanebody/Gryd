-- 0085_crew_outing_create.sql
-- GRYD — E49 · CRÉER UNE SORTIE CREW DEVIENT POSSIBLE (le serveur seul juge).
--
-- ═══ CONSTAT AVANT TRAVAUX (vérifié fichier par fichier, pas supposé) ════════
--
--   • La table `crew_events` EXISTE depuis 0019, avec ses cinq colonnes de
--     contenu (title, when_label, place_label, zone_label, objective) et sa
--     policy de lecture « membres actifs du crew ». Elle N'A JAMAIS EU DE
--     CHEMIN D'ÉCRITURE : 0019:163 révoque `insert, update, delete` pour
--     `anon` et `authenticated`, et AUCUNE Edge Function, AUCUNE RPC du dépôt
--     ne l'écrit (grep `crew_events` sur apps/ packages/ supabase/, 27/07/2026 :
--     seules des migrations et des COMMENTAIRES la citent).
--
--   • CE VIDE ÉTAIT DOCUMENTÉ, ET C'ÉTAIT LA BONNE CONDUITE.
--     `game-rules.ts` portait `CREW_OUTING_WRITE_PATH_EXISTS = false` ;
--     `events.ts` refusait d'ajouter `crew_outing_created` (« un event
--     défini-jamais-émis décrit une fonctionnalité qui n'existe pas ») ; le
--     catalogue i18n portait `oUnavailable*` pour que l'écran DISE qu'il ne
--     peut pas publier au lieu de peindre un bouton condamné. Cette migration
--     est ce que ces trois fichiers attendaient.
--
--   • TROIS CHAMPS DE LA SPEC E49 N'AVAIENT AUCUNE COLONNE (§1 les pose) :
--     l'activité Run/Bike, le nombre de places, et une VRAIE date-heure —
--     `when_label` est du texte libre, donc rien ne pouvait trier une liste
--     « à venir », faire expirer une sortie ni dériver un compte à rebours.
--
-- ═══ CE QUE CETTE MIGRATION AJOUTE ══════════════════════════════════════════
--   1. `starts_at`, `activity`, `capacity` sur `crew_events` (+ `when_label` et
--      `zone_label` rendus NULLABLE, cf. §1).
--   2. `crew_outing_place_fold` / `crew_outing_place_refusal` — la garde de VIE
--      PRIVÉE du point de rendez-vous (§3), miroir du module pur
--      `apps/mobile/src/features/crew/crewOuting.ts`.
--   3. `crew_outing_context()` — ce que l'écran a le droit de LIRE et de FAIRE.
--   4. `crew_outing_create()` — l'écriture, rôle-gatée, validée, modérée,
--      bornée et IDEMPOTENTE.
--
-- ═══ CONFIDENTIALITÉ : CE QUI EST LIVRÉ, ET CE QUI NE L'EST PAS ═════════════
-- La spec E49 dit : « L'adresse exacte n'est visible qu'aux participants
-- acceptés et peut être remplacée par un lieu public. »
--
--   CE QUI N'EST PAS LIVRÉ, ET POURQUOI CE N'EST PAS UN OUBLI : la visibilité
--   « participants acceptés seulement ». Il n'existe AUCUN chemin d'écriture
--   pour `crew_event_rsvps` (0019 la révoque aussi, et rien ne l'écrit).
--   Personne ne peut donc devenir participant : un champ « visible par les
--   participants » cacherait le lieu à TOUT LE MONDE, y compris à ceux qui
--   viennent. Ce serait un réglage sans effet utile — un bouton mort déguisé
--   en garantie de vie privée. Inscrit en suspens dans `game-rules.ts`.
--
--   CE QUI EST LIVRÉ À LA PLACE, et qui tient sans RSVP :
--     · PÉRIMÈTRE DE LECTURE RÉEL — `crew_events_select_member` (0019) : seuls
--       les membres ACTIFS du crew lisent la ligne. Quitter le crew, c'est
--       cesser de voir le lieu. L'écran l'écrit mot pour mot.
--     · AUCUNE COORDONNÉE N'EST COLLECTÉE. Ni lat/lng exacte, ni arrondie. Le
--       dépôt coupe déjà `SHARE_TRIM_M` (250 m) autour du départ et de
--       l'arrivée d'une trace publiée (`features/share/sharePrivacy.ts`) ; ici
--       l'équivalent le plus fort est de ne rien géocoder du tout. Une
--       coordonnée qu'aucun écran n'affiche serait de la collecte sans usage.
--     · LE LIBELLÉ EST REFUSÉ s'il désigne une porte (§3) : numéro + type de
--       voie dans les deux ordres (« 12 rue X », « Hauptstrasse 4 ») ou
--       vocabulaire d'entrée (digicode, interphone, appartement, étage). Le
--       refus vient AVANT l'écriture, et il est rendu au client avec son motif
--       — contrairement à la modération de langage, qui reste opaque (§3).
--
--   CE QUE CETTE GARDE NE PRÉTEND PAS : c'est une heuristique de FORME. Elle
--   n'attrape ni « chez moi », ni le nom d'une résidence privée. Elle réduit la
--   faute la plus courante ; elle ne rend pas un champ de texte sûr.
--
-- ═══ CE QUE CETTE MIGRATION NE PRÉTEND PAS NON PLUS ═════════════════════════
--   · Elle n'ajoute AUCUN RSVP, aucune notification, aucun rappel. Une sortie
--     créée est LUE par le crew ; personne ne peut encore répondre présent, et
--     `capacity` est donc un nombre ANNONCÉ, jamais un quota appliqué. Aucun
--     écran ne doit afficher « 3/10 ».
--   · Elle ne supprime pas les sorties passées. Aucun job ne tourne dessus ; la
--     lecture « à venir » filtre sur l'horloge SERVEUR, ce qui suffit à ne
--     jamais montrer un rendez-vous périmé comme s'il arrivait.
--   · Elle n'ajoute aucun historique d'édition ni d'annulation : on ne peut pas
--     encore modifier ni annuler une sortie. Dit ici plutôt que laissé croire.
--
-- Source de vérité des constantes : packages/shared/src/game-rules.ts. Chaque
-- valeur reprise porte son commentaire `-- game-rules: NOM`, et le test PGlite
-- `supabase/tests/crew_outing_create.pglite.test.mjs` RELIT le fichier source
-- pour prouver qu'aucune n'a dérivé.

-- ═══ 1. Les colonnes manquantes ═════════════════════════════════════════════
-- `starts_at` NULLABLE et non NOT NULL : les lignes ANTÉRIEURES (s'il en existe
-- dans un environnement) n'ont pas d'instant et on ne peut pas en inventer un.
-- Le chemin d'écriture, lui, le remplit TOUJOURS (§5), et l'index partiel plus
-- bas ne s'applique qu'aux lignes qui en ont un.
alter table public.crew_events
  add column if not exists starts_at timestamptz;

-- La discipline. Même vocabulaire fermé que `runs.activity` (0070) : deux
-- mondes, jamais une somme des deux. NULLABLE pour la même raison que ci-dessus.
alter table public.crew_events
  add column if not exists activity text;

-- Les places. NULLABLE = « pas de limite », ce qui est un fait distinct de
-- « zéro place » — un `0` voudrait dire que personne ne peut venir.
alter table public.crew_events
  add column if not exists capacity integer;

do $$ begin
  alter table public.crew_events
    add constraint crew_events_activity_check
    check (activity is null or activity in ('run', 'bike')); -- game-rules: ACTIVITIES
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.crew_events
    add constraint crew_events_capacity_check
    -- game-rules: CREW_OUTING_CAPACITY_MIN (2) / CREW_OUTING_CAPACITY_MAX
    -- (= CREW_MAX_MEMBERS, 50). MIN=2 : une sortie à une place est une course
    -- solo, pas un rendez-vous. MAX = la taille d'un crew : annoncer plus de
    -- places qu'il n'existe de membres serait un nombre sans objet.
    check (capacity is null or capacity between 2 and 50);
exception when duplicate_object then null;
end $$;

-- ─── `when_label` et `zone_label` deviennent NULLABLE ───────────────────────
-- when_label : c'était la SEULE façon de dire l'heure, en texte libre. Avec
-- `starts_at`, la garder obligatoire créerait DEUX vérités sur le même fait —
-- et rien n'empêcherait « 19 h » à côté d'un instant à 20 h. Le chemin
-- d'écriture de §5 ne l'écrit plus JAMAIS ; elle survit en lecture pour ne pas
-- rendre muettes d'éventuelles lignes antérieures.
-- zone_label : la spec dit « objectif OU zone ». `objective` reste obligatoire
-- (il est le vocabulaire fermé du jeu) ; exiger EN PLUS une zone imposerait un
-- champ que la planche présente comme facultatif.
alter table public.crew_events alter column when_label drop not null;
alter table public.crew_events alter column zone_label drop not null;

-- Une sortie doit rester LISIBLE : au moins une des deux façons de dire quand.
-- Sans ce garde-fou, un futur appelant pourrait insérer une ligne sans heure du
-- tout, et l'écran afficherait une sortie sans date — ni fausse, ni utile.
do $$ begin
  alter table public.crew_events
    add constraint crew_events_when_present_check
    check (starts_at is not null or when_label is not null);
exception when duplicate_object then null;
end $$;

-- La lecture de l'écran : les sorties À VENIR d'un crew, les plus proches
-- d'abord. Partiel : les lignes sans instant n'y ont pas leur place.
create index if not exists crew_events_crew_upcoming_idx
  on public.crew_events (crew_id, starts_at)
  where starts_at is not null;

-- ─── IDEMPOTENCE, au niveau du schéma ──────────────────────────────────────
-- Le même auteur, le même crew, le même instant, le même titre (aux espaces et
-- à la casse près) = LA MÊME sortie. Sans cet index, un double-tap sur
-- « Publier », un retry réseau ou un rejeu de requête créerait deux rendez-vous
-- identiques sur le mur du crew — et il n'existe aucun écran pour en supprimer
-- un. La contrainte est au SCHÉMA et pas seulement dans la fonction : une
-- vérification en PL/pgSQL perdrait la course entre deux appels concurrents.
create unique index if not exists crew_events_no_duplicate_idx
  on public.crew_events (crew_id, created_by, starts_at, lower(btrim(title)))
  where starts_at is not null;

comment on column public.crew_events.starts_at is
  'Instant RÉEL du rendez-vous (E49). NULL = ligne antérieure à 0085, dont '
  'l''heure n''existe qu''en texte libre dans when_label. Écriture réservée à '
  'crew_outing_create().';
comment on column public.crew_events.activity is
  'Discipline de la sortie — même vocabulaire fermé que runs.activity (0070). '
  'NULL = ligne antérieure à 0085 : la sortie n''a pas de discipline déclarée, '
  'ce qui n''est PAS « course à pied par défaut » ici (une sortie n''est pas '
  'une course enregistrée, aucune rétro-compat ne l''impose).';
comment on column public.crew_events.capacity is
  'Places ANNONCÉES (facultatif). NULL = pas de limite, jamais 0. ⚠ Aucun RSVP '
  'ne les décompte : c''est un nombre communiqué à des humains, pas un quota. '
  'Aucun écran ne doit afficher « k/N » tant que crew_event_rsvps n''a pas de '
  'chemin d''écriture.';

-- ═══ 2. Les bornes viennent du SERVEUR, jamais des paramètres ═══════════════
-- Même correctif que 0051 (crew_ping_zone) : recevoir un plafond du client
-- rendait l'anti-inondation contournable. Ces fonctions sont le miroir de
-- game-rules.ts, et le test PGlite compare les deux.
-- game-rules: CREW_OUTING_HORIZON_DAYS
create or replace function public.crew_outing_horizon_days()
returns integer language sql immutable as $$ select 90 $$;
-- game-rules: CREW_OUTING_MAX_UPCOMING_PER_CREW
create or replace function public.crew_outing_max_upcoming()
returns integer language sql immutable as $$ select 20 $$;

revoke all on function public.crew_outing_horizon_days() from public, anon, authenticated;
revoke all on function public.crew_outing_max_upcoming() from public, anon, authenticated;

-- ═══ 3. La garde de VIE PRIVÉE du point de rendez-vous ══════════════════════
/**
 * Forme normalisée d'un libellé de lieu : minuscules, ß→ss, accents retirés,
 * tout ce qui n'est ni lettre ni chiffre devient une espace, chaîne encadrée
 * d'espaces (recherche « mot entier » par simple motif).
 *
 * ⚠ CE N'EST PAS `moderation_fold` (0050), ET C'EST DÉLIBÉRÉ. Celui-là replie
 * le « leet » : 0→o, 1→i, 3→e, 4→a, 5→s, 7→t, 8→b. Il transformerait « 12 rue »
 * en « i2 rue » et rendrait la détection d'un NUMÉRO DE VOIE impossible. Les
 * deux besoins sont opposés : la modération cherche des mots MALGRÉ les
 * chiffres, cette garde-ci cherche précisément les chiffres.
 */
create or replace function public.crew_outing_place_fold(p_text text)
returns text language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select ' ' || btrim(regexp_replace(
    translate(
      lower(replace(coalesce(p_text, ''), 'ß', 'ss')),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ',
      'aaaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+', ' ', 'g')) || ' '
$$;

/**
 * Le libellé désigne-t-il une PORTE D'ENTRÉE ? Motif ou NULL.
 * Valeurs : 'street_address' | 'door_detail'.
 *
 * MIROIR EXACT de `meetingPointRefusal` (features/crew/crewOuting.ts). Le test
 * PGlite fait passer LA MÊME liste de cas dans les deux implémentations et
 * exige le même verdict : sans ça, l'écran promettrait un refus que le serveur
 * ignore (fuite silencieuse), ou peindrait un CTA valide que le serveur refuse
 * (bouton mort).
 *
 * ── CE MOTIF-LÀ EST DIT AU CLIENT, contrairement à la modération de langage ──
 * 0050 garde ses verdicts opaques parce que les détailler serait un mode
 * d'emploi du contournement. Ici c'est l'INVERSE : la personne n'essaie pas de
 * contourner, elle essaie d'être utile à son crew. Lui dire « écris un lieu
 * public, pas une adresse numérotée » est exactement l'information qui la fait
 * corriger. Taire le motif la ferait recommencer à l'identique.
 *
 * ── LES ABSENTS DE LA LISTE, ET POURQUOI ────────────────────────────────────
 * `st` (« Saint »), `place`/`platz` seuls (« Place de la République » EST le
 * lieu public qu'on recommande), `porte` (« Porte de Vincennes » est une
 * station de métro), `via`, `dr`. Chacun produirait plus de faux refus que de
 * vraies détections — et un faux refus pousse à écrire l'adresse autrement,
 * c'est-à-dire à contourner la garde qu'on croyait poser.
 */
create or replace function public.crew_outing_place_refusal(p_text text)
returns text language plpgsql immutable
set search_path = public, pg_temp
as $$
declare
  v text := public.crew_outing_place_fold(p_text);
begin
  if btrim(v) = '' then
    return null;   -- vide : c'est « champ obligatoire », pas un refus de vie privée
  end if;

  -- Vocabulaire d'ENTRÉE (5 langues). Plus grave que l'adresse : il n'y a
  -- aucune raison légitime de publier un digicode à vingt personnes.
  if v ~ ('(^| )(digicode|interphone|intercom|sonnette|doorbell|klingel|'
       || 'appartement|appart|apartamento|apartment|apt|'
       || 'escalier|staircase|treppenhaus|etage)( |$)') then
    return 'door_detail';
  end if;

  -- Numéro PUIS type de voie, avec AU PLUS DEUX MOTS entre les deux.
  -- Les langues ne rangent pas l'adresse pareil : « 12 rue de la Paix » (zéro
  -- mot), « 221 Baker Street » (un), « 45 bis boulevard Voltaire » (un). Trois
  -- autoriserait « 18 h devant la rue X », qui n'est pas une adresse.
  if v ~ ('(^| )[0-9]{1,4}[a-z]? ([a-z]+ ){0,2}'
       || '(rue|avenue|av|ave|boulevard|bd|blvd|impasse|allee|chemin|quai|route|rte|passage|'
       || 'street|road|rd|lane|drive|calle|avenida|paseo|rua|travessa|estrada|'
       || '[a-z]*strasse|[a-z]*weg|[a-z]*gasse|[a-z]*damm)( |$)') then
    return 'street_address';
  end if;

  -- Type de voie PUIS numéro (germanique) : « Hauptstrasse 4 ».
  if v ~ '(^| )[a-z]*(strasse|weg|gasse|damm|allee) [0-9]{1,4}( |$)' then
    return 'street_address';
  end if;

  return null;
end;
$$;

comment on function public.crew_outing_place_refusal(text) is
  'Motif de refus d''un point de rendez-vous qui désigne une porte d''entrée : '
  '''street_address'' (numéro + type de voie, les deux ordres) | ''door_detail'' '
  '(digicode, interphone, appartement, étage…) | NULL. Miroir du module pur '
  'features/crew/crewOuting.ts (comparé par le test PGlite). Heuristique de '
  'FORME : n''attrape ni « chez moi » ni un nom de résidence.';

-- Contrairement aux verdicts de modération (0050/0084), celui-ci est rendu au
-- client AVEC son motif — il n'y a rien à protéger et tout à expliquer. On ne
-- l'expose pas pour autant comme fonction appelable : le client a déjà le même
-- verdict en local, et `crew_outing_create` reste seul juge.
revoke all on function public.crew_outing_place_refusal(text) from public, anon, authenticated;
revoke all on function public.crew_outing_place_fold(text)    from public, anon, authenticated;

-- ═══ 4. La forme JSON d'une sortie — écrite UNE fois ════════════════════════
-- Deux RPC la rendent (le contexte et la création). La dupliquer aurait garanti
-- qu'un champ ajouté un jour n'apparaisse que d'un côté, et que le client, lui,
-- le lise des deux — un `null` inexplicable à l'écran.
--
-- AUCUNE PHRASE N'EST COMPOSÉE ICI (doctrine 0051) : ni date formatée, ni
-- « Sortie de KORO ». Le pseudo et l'instant sont des RÉFÉRENCES ; la phrase
-- s'assemble à l'écran, dans la langue du lecteur.
create or replace function public.crew_outing_row(p_event_id uuid)
returns jsonb language sql stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id',         e.id,
    'title',      e.title,
    'startsAt',   e.starts_at,
    'whenLabel',  e.when_label,
    'activity',   e.activity,
    'objective',  e.objective,
    'placeLabel', e.place_label,
    'zoneLabel',  e.zone_label,
    'capacity',   e.capacity,
    'hostPseudo', pp.pseudo
  )
  from public.crew_events e
  left join public.public_profiles pp on pp.id = e.created_by
  where e.id = p_event_id
$$;

revoke all on function public.crew_outing_row(uuid) from public, anon, authenticated;

-- ═══ 5. crew_outing_context : ce que l'écran a le DROIT de faire ════════════
/**
 * Lecture PRÉALABLE de l'écran /crew-sortie. Elle rend TROIS choses :
 *   · le rôle du joueur et `canCreate` — tranché SERVEUR depuis
 *     CREW_PERMISSIONS.createOuting, jamais dérivé par le client (qui
 *     afficherait sa propre idée de la matrice, potentiellement périmée) ;
 *   · les sorties À VENIR du crew — pour que ce qu'on publie soit VISIBLE
 *     quelque part le jour même. Sans cette liste, la création écrirait dans
 *     une table qu'aucun écran ne rend : une action sans preuve, donc une
 *     action à laquelle il faudrait croire sur parole ;
 *   · le plafond serveur de sorties à venir, pour que l'écran puisse dire
 *     POURQUOI il ne propose plus de publier au lieu d'essuyer un refus.
 *
 * « À venir » se calcule sur l'horloge SERVEUR (`now()`), jamais sur celle du
 * téléphone : une horloge client en arrière ferait réapparaître des rendez-vous
 * passés en tête de liste.
 */
create or replace function public.crew_outing_context()
returns jsonb language plpgsql stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_crew_id  uuid;
  v_role     text;
  v_upcoming jsonb;
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

  select coalesce(jsonb_agg(public.crew_outing_row(e.id) order by e.starts_at asc), '[]'::jsonb)
  into v_upcoming
  from public.crew_events e
  where e.crew_id = v_crew_id
    and e.starts_at is not null
    and e.starts_at > now();

  return jsonb_build_object(
    'ok',          true,
    'role',        v_role,
    -- game-rules: CREW_PERMISSIONS.createOuting
    'canCreate',   v_role in ('captain', 'co_captain', 'founder'),
    'upcoming',    coalesce(v_upcoming, '[]'::jsonb),
    'maxUpcoming', public.crew_outing_max_upcoming()
  );
end;
$$;

-- ═══ 6. crew_outing_create : L'ÉCRITURE — le serveur seul juge ══════════════
/**
 * Publie une sortie dans le crew du joueur. TOUT est tranché ici : identité,
 * appartenance, rôle, bornes, horizon, vie privée du lieu, modération du texte,
 * plafond anti-inondation. Le client n'apporte que des intentions.
 *
 * ── L'ORDRE DES CONTRÔLES N'EST PAS ARBITRAIRE ─────────────────────────────
 * identité → appartenance → RÔLE → bornes de forme → horizon → VIE PRIVÉE du
 * lieu → modération → plafond → écriture. La vie privée passe avant la
 * modération parce qu'elle est la seule dont le motif est RENDU au joueur : il
 * doit pouvoir corriger. Le plafond passe en dernier parce qu'il est le seul
 * refus qui ne dépend pas de ce que la personne vient d'écrire.
 *
 * ── IDEMPOTENCE ────────────────────────────────────────────────────────────
 * Republier exactement la même sortie (même crew, même auteur, même instant,
 * même titre à la casse et aux espaces près) ne crée PAS de doublon : l'index
 * partiel unique `crew_events_no_duplicate_idx` l'attrape, et la fonction rend
 * la ligne EXISTANTE avec `duplicate: true`. Un double-tap, un retry réseau ou
 * un rejeu de requête publient UNE sortie — jamais deux, et il n'existe aucun
 * écran pour en supprimer une.
 *
 * ── CE QUI N'EST PAS ÉCRIT, ET POURQUOI ────────────────────────────────────
 * `when_label` reste NULL : `starts_at` est la vérité, et une seconde
 * représentation de l'heure finirait par la contredire. Aucune coordonnée n'est
 * reçue ni stockée (cf. l'en-tête).
 */
create or replace function public.crew_outing_create(
  p_title       text,
  p_starts_at   timestamptz,
  p_activity    text,
  p_objective   text,
  p_place_label text,
  p_zone_label  text    default null,
  p_capacity    integer default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_crew_id  uuid;
  v_role     text;
  v_title    text;
  v_place    text;
  v_zone     text;
  v_refusal  text;
  v_count    integer;
  v_id       uuid;
  v_dup      boolean := false;
begin
  -- ── Identité ─────────────────────────────────────────────────────────────
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- ── Appartenance + rôle — la source est crew_members, jamais le client ───
  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- game-rules: CREW_PERMISSIONS.createOuting — rookie, runner, scout et
  -- strategist sont REFUSÉS parce que la matrice dit capitaine et au-dessus,
  -- pas parce qu'on l'a décidé ici.
  if v_role not in ('captain', 'co_captain', 'founder') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  -- ── Bornes de forme (miroir des CHECK de 0019 + game-rules) ─────────────
  v_title := btrim(coalesce(p_title, ''));
  -- game-rules: CREW_OUTING_TITLE_MIN / CREW_OUTING_TITLE_MAX
  if char_length(v_title) < 1 or char_length(v_title) > 80 then
    return jsonb_build_object('ok', false, 'reason', 'bad_title');
  end if;

  v_place := btrim(coalesce(p_place_label, ''));
  -- game-rules: CREW_OUTING_PLACE_LABEL_MIN / CREW_OUTING_PLACE_LABEL_MAX
  if char_length(v_place) < 1 or char_length(v_place) > 80 then
    return jsonb_build_object('ok', false, 'reason', 'bad_place');
  end if;

  v_zone := nullif(btrim(coalesce(p_zone_label, '')), '');
  -- game-rules: CREW_OUTING_ZONE_LABEL_MAX. La zone est FACULTATIVE : une
  -- chaîne vide devient NULL (un seul encodage du vide), elle n'est pas refusée.
  if v_zone is not null and char_length(v_zone) > 80 then
    return jsonb_build_object('ok', false, 'reason', 'bad_zone');
  end if;

  if p_activity is null or p_activity not in ('run', 'bike') then -- game-rules: ACTIVITIES
    return jsonb_build_object('ok', false, 'reason', 'bad_activity');
  end if;

  if p_objective is null or p_objective not in ('defense', 'conquete') then
    return jsonb_build_object('ok', false, 'reason', 'bad_objective');
  end if;

  -- game-rules: CREW_OUTING_CAPACITY_MIN / CREW_OUTING_CAPACITY_MAX
  if p_capacity is not null and (p_capacity < 2 or p_capacity > 50) then
    return jsonb_build_object('ok', false, 'reason', 'bad_capacity');
  end if;

  -- ── L'instant : présent, futur, et pas au-delà de l'horizon ─────────────
  -- Comparé à l'horloge SERVEUR. Un téléphone dont l'horloge retarde de deux
  -- heures publierait sinon un rendez-vous déjà commencé.
  if p_starts_at is null then
    return jsonb_build_object('ok', false, 'reason', 'bad_starts_at');
  end if;
  if p_starts_at <= now() then
    return jsonb_build_object('ok', false, 'reason', 'starts_at_past');
  end if;
  if p_starts_at > now() + make_interval(days => public.crew_outing_horizon_days()) then
    return jsonb_build_object('ok', false, 'reason', 'starts_at_too_far');
  end if;

  -- ── VIE PRIVÉE du point de rendez-vous — motif RENDU au joueur ──────────
  v_refusal := public.crew_outing_place_refusal(v_place);
  if v_refusal is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'place_looks_like_address',
      -- Le sous-motif permet à l'écran de dire la bonne phrase (adresse
      -- numérotée vs détail de porte) sans deviner laquelle a mordu.
      'kind', v_refusal
    );
  end if;

  -- ── Modération du TEXTE LIBRE — motif OPAQUE (doctrine 0050/0084) ───────
  -- `crew_description_refusal` (0084) est le filtre de PROSE du dépôt : mot
  -- entier + début de mot, jamais le squash intégral. Les trois textes d'une
  -- sortie sont courts mais restent de la prose écrite par un humain et lue par
  -- vingt autres — les laisser passer ferait de cet écran le seul champ libre
  -- non modéré du produit.
  if public.crew_description_refusal(v_title) is not null
     or public.crew_description_refusal(v_place) is not null
     or (v_zone is not null and public.crew_description_refusal(v_zone) is not null) then
    return jsonb_build_object('ok', false, 'reason', 'place_unavailable');
  end if;

  -- ── Plafond anti-inondation, SERVEUR ────────────────────────────────────
  -- Par CREW et non par membre : c'est le mur du crew qu'on protège, et un
  -- capitaine seul peut l'inonder. Même raison que CREW_PING_MAX_ACTIVE (0051) :
  -- une surface sociale inondable est un vecteur de harcèlement.
  select count(*)::integer into v_count
  from public.crew_events e
  where e.crew_id = v_crew_id and e.starts_at is not null and e.starts_at > now();

  if v_count >= public.crew_outing_max_upcoming() then
    return jsonb_build_object(
      'ok', false,
      'reason', 'too_many_upcoming',
      'max', public.crew_outing_max_upcoming()
    );
  end if;

  -- ── L'écriture ──────────────────────────────────────────────────────────
  insert into public.crew_events
    (crew_id, title, when_label, place_label, zone_label, objective,
     starts_at, activity, capacity, created_by)
  values
    (v_crew_id, v_title, null, v_place, v_zone, p_objective,
     p_starts_at, p_activity, p_capacity, v_uid)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    -- L'index partiel unique a mordu : la sortie EXISTE déjà. On rend la
    -- ligne existante plutôt qu'une erreur — un retry réseau n'est pas une
    -- faute du joueur, et lui dire « échec » le pousserait à republier.
    v_dup := true;
    select e.id into v_id
    from public.crew_events e
    where e.crew_id = v_crew_id
      and e.created_by = v_uid
      and e.starts_at = p_starts_at
      and lower(btrim(e.title)) = lower(v_title);
    if v_id is null then
      -- Conflit sur une contrainte qu'on n'a pas prévue : on ne devine pas.
      return jsonb_build_object('ok', false, 'reason', 'bad_title');
    end if;
  end if;

  return jsonb_build_object(
    'ok',        true,
    'duplicate', v_dup,
    'outing',    public.crew_outing_row(v_id)
  );
end;
$$;

-- ═══ 7. Grants ══════════════════════════════════════════════════════════════
-- `from public, anon` et PAS `from anon` seul : Postgres accorde d'office
-- EXECUTE à PUBLIC à la création de toute fonction, et anon est membre de
-- PUBLIC — révoquer sur anon seul laisserait le droit HÉRITÉ intact.
-- Patron 0084:§8 / 0051:§3.
revoke all on function public.crew_outing_context() from public, anon;
grant execute on function public.crew_outing_context() to authenticated;

revoke all on function public.crew_outing_create(text, timestamptz, text, text, text, text, integer)
  from public, anon;
grant execute on function public.crew_outing_create(text, timestamptz, text, text, text, text, integer)
  to authenticated;

-- L'écriture directe reste FERMÉE (0019:163 l'avait déjà révoquée ; on le
-- réaffirme pour que cette migration soit lisible seule, et pour qu'un grant
-- ajouté entre-temps ne survive pas).
revoke insert, update, delete on public.crew_events from anon, authenticated;

comment on function public.crew_outing_context() is
  'E49 — contexte de l''écran « créer une sortie » : rôle, droit de créer '
  '(CREW_PERMISSIONS.createOuting, tranché serveur), sorties À VENIR du crew '
  '(horloge SERVEUR) et plafond. LECTURE SEULE.';

comment on function public.crew_outing_create(text, timestamptz, text, text, text, text, integer) is
  'E49 — SEUL chemin d''écriture d''une sortie crew. Revérifie appartenance, '
  'rôle, bornes, horizon (CREW_OUTING_HORIZON_DAYS), vie privée du point de '
  'rendez-vous (crew_outing_place_refusal — motif RENDU au joueur), modération '
  'des textes (motif OPAQUE) et plafond de sorties à venir. IDEMPOTENTE : le '
  'rejeu rend la sortie existante avec duplicate=true. N''écrit JAMAIS '
  'when_label (starts_at est la seule vérité sur l''heure) et ne reçoit AUCUNE '
  'coordonnée.';
