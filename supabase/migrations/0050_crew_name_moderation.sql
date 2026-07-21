-- 0050_crew_name_moderation.sql
-- GRYD — MODÉRATION SERVEUR DU NOM DE CREW (AMENDEMENT-33 §1, App Store 1.2).
--
-- CONSTAT AVANT TRAVAUX (vérifié, pas supposé) :
--   • `create_crew` (0042 puis 0043) ne contrôle QUE la longueur du nom
--     (1..40) : n'importe quelle insulte, marque ou « GRYD Officiel » est
--     acceptée telle quelle par le serveur.
--   • Le seul filtre existant — apps/mobile/src/features/crew/moderation.ts,
--     ~8 racines françaises en dur — est LOCAL, démo, et ne sert QUE le chat.
--     Il n'a jamais été appelé à la création d'un crew.
--   • Il n'existe AUCUN RPC de renommage : 0030 a révoqué
--     `update (name) on public.crews from authenticated`. Le renommage payant
--     (CREW_RENAME_FOULEES) est encore à écrire. On ne l'invente pas ici — mais
--     le trigger posé plus bas fait que le jour où il existera, quelle que soit
--     la voie (RPC, Edge Function, update direct), il passera par ce filtre.
--
-- Un nom de crew est du contenu généré par l'utilisateur AFFICHÉ AUX AUTRES
-- (carte, classements, chat) : c'est exactement ce que la Guideline 1.2 exige de
-- modérer, et c'est un risque réputationnel avant d'être un risque de rejet.
--
-- ═══ CE QUE CE FILTRE FAIT — ET CE QU'IL NE FAIT PAS ═════════════════════════
--
-- HONNÊTETÉ SUR LA PORTÉE. Un filtre par liste est FAILLIBLE PAR CONSTRUCTION.
-- Il n'existe pas de liste des insultes du monde, et il n'en existera pas :
-- l'argot se renouvelle plus vite qu'une migration, et une insulte n'est souvent
-- insultante qu'en contexte. Ce filtre attrape le grossier et le paresseux, ce
-- qui est déjà l'essentiel du volume. Il n'attrape PAS l'inventif.
--   • COUVERT : français et anglais (les deux langues où la quasi-totalité des
--     insultes internationales circulent), les marques et termes officiels
--     (via reserved_handles, 0047), et les contournements MÉCANIQUES —
--     séparateurs (c.o.n.n.a.r.d), leet (s4l0pe), accents (enculé), casse,
--     caractères invisibles (zero-width), homoglyphes (Nikе cyrillique).
--   • NON COUVERT, ASSUMÉ : l'espagnol, l'allemand et le portugais (l'app est
--     traduite en 5 langues, le filtre n'en couvre que 2 — le dire est plus
--     utile que de bricoler 3 listes qu'aucun locuteur natif n'a relues) ;
--     les lettres répétées (connnard) ; les substitutions d'alphabet COMPLÈTES
--     (un mot 100 % cyrillique passe s'il n'a pas de sosie latin) ; les fautes
--     volontaires ; l'insulte contextuelle, l'ironie, le nom propre détourné ;
--     toutes les langues à écriture non latine.
--   • DÉLIBÉRÉMENT EXCLUS de la liste, pour cause de collision entre langues —
--     un faux positif coûte plus cher qu'un faux négatif sur ces mots-là :
--     « retard » (insulte EN mais = du retard en FR), « con » (insulte FR mais
--     = « avec » en ES), « negro » (slur EN mais = la couleur en ES/PT).
--
-- LA VRAIE DÉFENSE RESTE LE SIGNALEMENT + LA REVUE HUMAINE — content_reports
-- (0029), désormais remonté à l'admin. Ce filtre est la première porte, pas la
-- serrure. Toute décision produit qui s'appuierait sur « le filtre nous protège »
-- serait fausse.
--
-- ═══ CE QUE LE JOUEUR VOIT ═══════════════════════════════════════════════════
-- Un seul motif renvoyé au client : `name_unavailable`. Le serveur ne dit
-- JAMAIS quelle règle a mordu ni quel mot a été reconnu : ce serait un mode
-- d'emploi du contournement (« ah, c'est le mot X → j'écris Xx »). Le motif
-- précis reste en base, pour la revue humaine, jamais dans la réponse.

-- ═══ 1. Réutilisation de reserved_handles (0047) ═════════════════════════════
-- On ne crée PAS une deuxième table de marques : 0047 en a déjà une, seedée et
-- complétable par insert service-role sans release mobile. On l'étend de deux
-- colonnes qui n'existent que pour l'usage « nom de crew », parce qu'un handle
-- et un nom de crew ne se comparent pas pareil :
--   • un handle est UN seul mot (`nike`) — l'égalité suffit ;
--   • un nom de crew est une PHRASE (`Nike Runners Paris`) — il faut chercher le
--     terme À L'INTÉRIEUR, donc décider mot-à-mot ou en sous-chaîne, terme par terme.
--
-- `blocks_crew_name` : faux pour les termes qui sont LÉGITIMES dans un nom
-- d'équipe. `team`, `équipe`, `staff`, `contact`, `presse` sont réservés en
-- handle (un @support qui parle au nom de GRYD, c'est de l'usurpation) mais
-- « Team Paris » est un nom de crew parfaitement normal. Bloquer les deux au
-- même endroit produirait un faux positif à chaque inscription.
--
-- `crew_match_mode` : 'word' = le terme doit être un MOT du nom ;
-- 'squash' = le terme est cherché dans le nom dont on a retiré TOUS les
-- séparateurs (donc `N.I.K.E Runners` mord aussi). 'squash' n'est mis que sur
-- les termes assez longs et assez distinctifs pour ne pas apparaître par hasard
-- dans un mot légitime — `apple` reste en 'word', sinon « Pineapple Runners »
-- serait refusé.
alter table public.reserved_handles
  add column if not exists blocks_crew_name boolean not null default true,
  add column if not exists crew_match_mode  text    not null default 'word';

do $$ begin
  alter table public.reserved_handles
    add constraint reserved_handles_crew_match_mode_chk
    check (crew_match_mode in ('word', 'squash'));
exception when duplicate_object then null;
end $$;

comment on column public.reserved_handles.blocks_crew_name is
  'false = terme réservé en @handle mais LÉGITIME dans un nom de crew '
  '(« Team Paris », « Contact Runners »). Évite un faux positif à chaque création.';
comment on column public.reserved_handles.crew_match_mode is
  '''word'' = mot entier du nom ; ''squash'' = cherché aussi dans le nom privé de '
  'séparateurs (N.I.K.E). ''squash'' réservé aux termes longs et distinctifs.';

-- Termes légitimes dans un nom d'équipe → ne bloquent QUE le handle.
update public.reserved_handles set blocks_crew_name = false
where handle in (
  'team', 'equipe', 'staff', 'aide', 'help', 'contact', 'support',
  'press', 'presse', 'api', 'www', 'root', 'system', 'systeme',
  'security', 'securite', 'legal', 'privacy',
  'moderation', 'moderator', 'moderateur', 'visa'
);

-- Marques et termes GRYD assez distinctifs pour la recherche en sous-chaîne.
-- Volontairement PAS : apple (« Pineapple Runners »), nike (« Techniker Team »
-- contient tech-NIKE-r), meta, puma, hoka, coros, polar, visa — trop courts ou
-- trop proches de mots communs. Le prix assumé : `N.I.K.E Paris` passe. On préfère
-- laisser filer une évasion rare plutôt que refuser un nom allemand légitime —
-- et c'est exactement là que le signalement prend le relais.
update public.reserved_handles set crew_match_mode = 'squash'
where handle in (
  'adidas', 'asics', 'newbalance', 'saucony', 'brooks', 'salomon', 'onrunning',
  'reebok', 'underarmour', 'lululemon', 'decathlon', 'kiprun',
  'strava', 'garmin', 'suunto', 'runkeeper', 'komoot', 'zwift',
  'google', 'microsoft', 'samsung', 'amazon', 'facebook', 'instagram',
  'whatsapp', 'tiktok', 'snapchat', 'youtube', 'twitter', 'spotify',
  'netflix', 'paypal', 'mastercard', 'redbull', 'cocacola',
  'gryd', 'grydapp', 'grydofficial', 'grydofficiel', 'grydsupport',
  'grydteam', 'klaim', 'grydverified', 'compteverifie'
);

-- ═══ 2. blocked_name_terms : insultes et contenus haineux ════════════════════
-- Table, PAS liste en dur : elle se complète par insert service-role le jour où
-- un signalement révèle un trou, sans migration ni release mobile — exactement
-- le raisonnement de reserved_handles (0047, CHOIX N°2).
-- `term` est stocké DÉJÀ NORMALISÉ (minuscules, sans accent, espaces simples) :
-- c'est une clé de comparaison, pas un mot affichable.
create table if not exists public.blocked_name_terms (
  term       text primary key
    check (term ~ '^[a-z0-9]+( [a-z0-9]+)*$' and char_length(term) between 2 and 40),
  category   text not null check (category in ('insult', 'slur', 'sexual', 'hate')),
  lang       text not null check (lang in ('fr', 'en', 'xx')),
  match_mode text not null default 'word' check (match_mode in ('word', 'squash')),
  note       text,
  created_at timestamptz not null default now()
);

comment on table public.blocked_name_terms is
  'Termes interdits dans un nom de crew (insultes / slurs / sexuel / haine), '
  'stockés NORMALISÉS. Couvre le français et l''anglais UNIQUEMENT — pas es/de/pt, '
  'et aucune liste ne couvrira jamais tout : la défense réelle contre le contenu '
  'objectionnable reste le signalement + la revue humaine (content_reports, 0029). '
  'match_mode ''word'' = mot entier (obligatoire pour les termes courts ou '
  'sous-chaînes de mots légitimes : cunt/Scunthorpe, sex/Essex, viol/violet).';

alter table public.blocked_name_terms enable row level security;

-- Aucun client ne lit cette table : elle n'est consommée que par la fonction
-- SECURITY DEFINER ci-dessous. La rendre lisible reviendrait à publier la carte
-- exacte de ce qu'il faut déguiser. Aucune policy → seul le service_role passe,
-- par son bypass.
revoke all on public.blocked_name_terms from public, anon, authenticated;

insert into public.blocked_name_terms (term, category, lang, match_mode, note) values
  -- ── Français : insultes ────────────────────────────────────────────────────
  ('connard',     'insult', 'fr', 'squash', null),
  ('connasse',    'insult', 'fr', 'squash', null),
  ('salope',      'insult', 'fr', 'squash', null),
  ('salaud',      'insult', 'fr', 'squash', null),
  ('encule',      'insult', 'fr', 'squash', null),
  ('enfoire',     'insult', 'fr', 'squash', null),
  ('pouffiasse',  'insult', 'fr', 'squash', null),
  ('batard',      'insult', 'fr', 'squash', null),
  ('ducon',       'insult', 'fr', 'squash', null),
  ('trouduc',     'insult', 'fr', 'squash', null),
  ('nique ta',    'insult', 'fr', 'word',   'nique ta mère / ta race'),
  ('ta gueule',   'insult', 'fr', 'word',   null),
  ('pute',        'insult', 'fr', 'word',   'mot entier : « computer », « députés » contiennent la suite'),
  ('putain',      'insult', 'fr', 'word',   null),
  ('merde',       'insult', 'fr', 'word',   null),
  ('cul',         'insult', 'fr', 'word',   'mot entier : « culture », « bousculade »'),
  ('bite',        'sexual', 'fr', 'word',   'mot entier : « arbitre », « orbite »'),
  ('couille',     'insult', 'fr', 'word',   null),
  ('chatte',      'sexual', 'fr', 'word',   null),
  -- ── Français : slurs et haine ──────────────────────────────────────────────
  ('pd',          'slur',   'fr', 'word',   'mot entier : « rapide », « speed »'),
  ('pede',        'slur',   'fr', 'word',   'mot entier : « impede », « vélocipède »'),
  ('tapette',     'slur',   'fr', 'squash', null),
  ('gouine',      'slur',   'fr', 'squash', null),
  ('bougnoule',   'slur',   'fr', 'squash', null),
  ('youpin',      'slur',   'fr', 'squash', null),
  ('chinetoque',  'slur',   'fr', 'squash', null),
  ('negre',       'slur',   'fr', 'word',   'mot entier ; « negro » EXCLU (= la couleur en es/pt)'),
  ('sale race',   'hate',   'fr', 'word',   null),
  ('sale juif',   'hate',   'fr', 'word',   null),
  ('sale arabe',  'hate',   'fr', 'word',   null),
  ('sale noir',   'hate',   'fr', 'word',   null),
  -- ── Anglais : insultes ─────────────────────────────────────────────────────
  ('fuck',        'insult', 'en', 'squash', null),
  ('motherfucker','insult', 'en', 'squash', null),
  ('shit',        'insult', 'en', 'squash', null),
  ('bitch',       'insult', 'en', 'squash', null),
  ('asshole',     'insult', 'en', 'squash', null),
  ('dickhead',    'insult', 'en', 'squash', null),
  ('bastard',     'insult', 'en', 'squash', null),
  ('wanker',      'insult', 'en', 'squash', null),
  ('whore',       'insult', 'en', 'squash', null),
  ('slut',        'insult', 'en', 'squash', null),
  ('cunt',        'insult', 'en', 'word',   'mot entier : Scunthorpe'),
  ('twat',        'insult', 'en', 'word',   null),
  ('prick',       'insult', 'en', 'word',   null),
  -- ── Anglais : slurs et haine ───────────────────────────────────────────────
  ('nigger',      'slur',   'en', 'squash', null),
  ('nigga',       'slur',   'en', 'squash', null),
  ('faggot',      'slur',   'en', 'squash', null),
  ('fag',         'slur',   'en', 'word',   'mot entier : « fagot » (FR), « fagus »'),
  ('tranny',      'slur',   'en', 'squash', null),
  ('chink',       'slur',   'en', 'word',   null),
  ('spic',        'slur',   'en', 'word',   null),
  ('kike',        'slur',   'en', 'word',   null),
  ('nazi',        'hate',   'xx', 'word',   null),
  ('hitler',      'hate',   'xx', 'squash', null),
  ('heil hitler', 'hate',   'xx', 'word',   null),
  ('sieg heil',   'hate',   'xx', 'word',   null),
  ('kkk',         'hate',   'en', 'word',   null),
  ('white power', 'hate',   'en', 'word',   null),
  -- ── Sexuel / criminel ──────────────────────────────────────────────────────
  ('porn',        'sexual', 'xx', 'squash', null),
  ('pornhub',     'sexual', 'xx', 'squash', null),
  ('pedophile',   'sexual', 'xx', 'squash', null),
  ('pedophilie',  'sexual', 'fr', 'squash', null),
  ('pedo',        'sexual', 'xx', 'word',   null),
  ('rape',        'sexual', 'en', 'word',   'mot entier : « grape », « drape »'),
  ('viol',        'sexual', 'fr', 'word',   'mot entier : « violet », « violence »'),
  ('sex',         'sexual', 'en', 'word',   'mot entier : « Essex », « Sussex »'),
  ('sexe',        'sexual', 'fr', 'word',   null)
on conflict (term) do nothing;

-- ═══ 3. Normalisation : neutraliser les contournements mécaniques ════════════
-- L'ordre compte. On retire d'abord l'invisible (sinon il coupe les mots), puis
-- on replie les alphabets sosies, PUIS on décompose les accents.

-- Classe des caractères INVISIBLES / de contrôle de direction. Construite par
-- chr() plutôt qu'écrite littéralement : un caractère invisible dans un fichier
-- source est illisible en revue et se perd au copier-coller.
--   00AD soft hyphen · 034F combining grapheme joiner · 180E mongolian vowel sep
--   200B-200F zero-width space/non-joiner/joiner + marques de direction
--   2028-202F séparateurs de ligne/paragraphe + overrides bidi + espaces fins
--   2060-2064 word joiner et invisibles mathématiques
--   FEFF BOM · FE00-FE0F variation selectors
create or replace function public.moderation_invisible_class()
returns text language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select '[' || chr(173) || chr(847) || chr(6158)
             || chr(8203) || '-' || chr(8207)
             || chr(8232) || '-' || chr(8239)
             || chr(8288) || '-' || chr(8292)
             || chr(65279)
             || chr(65024) || '-' || chr(65039)
             || ']'
$$;

/**
 * true si le texte contient au moins un caractère invisible. C'est le
 * contournement CLASSIQUE : `con<zero-width>nard` s'affiche « connard » et passe
 * toute recherche naïve. Aucun nom de crew légitime n'a besoin d'un tel
 * caractère → sa seule présence suffit à refuser, avant même de lire le mot.
 */
create or replace function public.moderation_has_invisible(p_text text)
returns boolean language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select coalesce(p_text, '') ~ public.moderation_invisible_class()
$$;

/**
 * true si le texte MÉLANGE l'alphabet latin avec le cyrillique ou le grec.
 * Un nom entièrement cyrillique est légitime (un crew russe) ; un nom qui mêle
 * les deux ne l'est quasiment jamais — c'est la signature de l'homoglyphe
 * (« Nikе » avec un е cyrillique est indiscernable à l'œil de « Nike »).
 * On refuse le MÉLANGE, pas l'alphabet.
 */
create or replace function public.moderation_mixed_scripts(p_text text)
returns boolean language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select
    -- latin de base
    coalesce(p_text, '') ~ '[A-Za-z]'
    and (
      -- cyrillique U+0400..U+04FF
      coalesce(p_text, '') ~ ('[' || chr(1024) || '-' || chr(1279) || ']')
      or
      -- grec U+0370..U+03FF
      coalesce(p_text, '') ~ ('[' || chr(880) || '-' || chr(1023) || ']')
    )
$$;

/**
 * Forme NORMALISÉE d'un nom, sur laquelle TOUTES les comparaisons se font :
 *   1. invisibles retirés         (con<ZWSP>nard → connard)
 *   2. minuscules
 *   3. homoglyphes cyrilliques et grecs repliés vers le latin (Nikе → nike)
 *   4. lettres latines exotiques repliées (ø → o, ł → l, ß → s)
 *   5. accents décomposés puis retirés, et tout non-ASCII éliminé (enculé → encule)
 *   6. leet replié (s4l0pe → salope)
 * Le résultat est encadré d'espaces et ne contient plus qu'a-z, 0-9 et l'espace
 * simple : `' connard runners '`. La recherche « mot entier » est alors un
 * simple `like '% terme %'`, sans regex ni bordure ambiguë.
 *
 * LIMITE ASSUMÉE du repli leet : il s'applique à TOUT le nom, donc « Crew 75 »
 * devient « crew ts ». Le prix est un faux positif théorique (un nom purement
 * numérique qui formerait un mot interdit) contre un vrai contournement bloqué.
 */
create or replace function public.moderation_fold(p_text text)
returns text language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select ' ' || btrim(regexp_replace(
    translate(
      regexp_replace(
        normalize(
          translate(
            translate(
              lower(regexp_replace(coalesce(p_text, ''), public.moderation_invisible_class(), '', 'g')),
              -- cyrillique → latin (24 paires)
              'авеёзкмнорстухіјѕԁһӏүғқә',
              'abeezkmhopctyxijsdhlyfka'),
            -- grec → latin (24 paires)
            'αβγδεζηθικλμνοπρσςτυφχψω',
            'abydezno' || 'iklmvonpostuoxyw'),
          nfd),
        '[^ -~]', '', 'g'),
      -- leet → lettres (11 paires)
      '0134578@$!|',
      'oieastbasii'),
    '[^a-z0-9]+', ' ', 'g')) || ' '
$$;

comment on function public.moderation_fold(text) is
  'Forme normalisée d''un nom pour la modération : invisibles retirés, minuscules, '
  'homoglyphes cyrilliques/grecs repliés, accents et non-ASCII retirés, leet replié. '
  'Encadrée d''espaces → la recherche « mot entier » est un simple LIKE ''% x %''.';

/** Même forme, mais SANS aucun séparateur : `c.o.n.n.a.r.d` → `connard`. */
create or replace function public.moderation_squash(p_text text)
returns text language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select replace(public.moderation_fold(p_text), ' ', '')
$$;

-- ═══ 4. Le verdict ═══════════════════════════════════════════════════════════
/**
 * Motif INTERNE de refus d'un nom de crew, ou NULL si le nom passe.
 * Valeurs : 'invisible' | 'mixed_scripts' | 'reserved' | 'blocked_term'.
 *
 * Ce motif ne sort JAMAIS tel quel vers le client : `create_crew` le convertit
 * en un unique `name_unavailable`. Distinguer les cas côté joueur reviendrait à
 * lui apprendre quelle contrainte contourner, et à quel mot il a touché.
 *
 * SECURITY DEFINER : reserved_handles et blocked_name_terms sont révoquées à
 * tout le monde (leur contenu est précisément ce qu'on ne veut pas publier).
 * search_path épinglé — obligatoire sur tout SECURITY DEFINER.
 */
create or replace function public.crew_name_refusal(p_name text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_raw    text := coalesce(p_name, '');
  v_fold   text;
  v_squash text;
begin
  if public.moderation_has_invisible(v_raw) then
    return 'invisible';
  end if;
  if public.moderation_mixed_scripts(v_raw) then
    return 'mixed_scripts';
  end if;

  v_fold   := public.moderation_fold(v_raw);
  v_squash := public.moderation_squash(v_raw);

  -- Rien de latin/numérique à examiner (nom dans une écriture non couverte) :
  -- on ne refuse pas — on ne sait simplement pas lire. Le signalement prend le
  -- relais. Refuser ici bloquerait des noms parfaitement légitimes.
  if v_squash = '' then
    return null;
  end if;

  -- Marques, termes officiels GRYD, termes trompeurs (reserved_handles, 0047).
  if exists (
    select 1 from public.reserved_handles r
    where r.blocks_crew_name
      and (
        v_fold like '% ' || r.handle || ' %'
        or (r.crew_match_mode = 'squash' and v_squash like '%' || r.handle || '%')
      )
  ) then
    return 'reserved';
  end if;

  -- Insultes / slurs / sexuel / haine.
  if exists (
    select 1 from public.blocked_name_terms t
    where v_fold like '% ' || t.term || ' %'
       or (t.match_mode = 'squash' and v_squash like '%' || replace(t.term, ' ', '') || '%')
  ) then
    return 'blocked_term';
  end if;

  return null;
end;
$$;

-- PUBLIC hérite EXECUTE par défaut : révoquer `from authenticated` seul ne
-- fermerait rien. On révoque de public, anon ET authenticated, et on ne
-- regrante à PERSONNE : aucun client n'a de raison d'appeler ce verdict, et
-- lui donner l'accès offrirait un oracle pour tester la liste mot par mot.
-- Les seuls appelants sont `create_crew` et le trigger, tous deux SECURITY
-- DEFINER (donc exécutés avec les droits du propriétaire).
revoke all on function public.crew_name_refusal(text) from public, anon, authenticated;
revoke all on function public.moderation_fold(text)   from public, anon, authenticated;
revoke all on function public.moderation_squash(text) from public, anon, authenticated;

comment on function public.crew_name_refusal(text) is
  'Motif INTERNE de refus d''un nom de crew, ou NULL. '
  '''invisible''|''mixed_scripts''|''reserved''|''blocked_term''. Jamais renvoyé tel '
  'quel au client (create_crew renvoie un unique ''name_unavailable'') : détailler '
  'la règle qui a mordu serait un mode d''emploi du contournement.';

-- ═══ 5. create_crew : le filtre à la création ════════════════════════════════
-- Repris VERBATIM de 0043 (rôle 'founder' inclus), à l'ajout près du contrôle de
-- modération, placé APRÈS la longueur et AVANT toute écriture. On retourne un
-- jsonb `{ok:false}` propre plutôt que de laisser le trigger lever : une
-- exception annulerait la transaction et remonterait au client comme une erreur
-- réseau opaque.
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

-- ═══ 6. Trigger : le filtre suit la COLONNE, pas la fonction ═════════════════
-- `create_crew` est aujourd'hui la seule voie d'écriture d'un nom. Elle ne le
-- restera pas : le renommage payant (CREW_RENAME_FOULEES) viendra, sans doute
-- par une Edge Function service_role — qui ignore RLS et grants, et qui pourrait
-- donc écrire un nom sans repasser par le RPC. Un contrôle posé UNIQUEMENT dans
-- create_crew serait alors silencieusement contourné.
-- Le trigger déplace la garantie de la fonction vers la donnée : toute écriture
-- d'un nom, par n'importe quelle voie, est filtrée. Il ne se déclenche qu'au
-- CHANGEMENT du nom — un update de couleur ou de saison ne repaie jamais le coût,
-- et un nom devenu interdit après coup (la liste s'enrichit) ne gèle pas les
-- lignes existantes : c'est la revue humaine qui traite ces cas, pas un blocage
-- automatique brutal.
create or replace function public.crews_enforce_name_moderation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and new.name is not distinct from old.name then
    return new;
  end if;
  if public.crew_name_refusal(new.name) is not null then
    -- Message générique + SQLSTATE dédié : même côté serveur, la trace ne dit
    -- pas quel mot a mordu (les logs se lisent à plusieurs).
    raise exception 'crew name unavailable' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists crews_name_moderation on public.crews;
create trigger crews_name_moderation
  before insert or update of name on public.crews
  for each row execute function public.crews_enforce_name_moderation();

comment on function public.crews_enforce_name_moderation() is
  'Garde-fou : tout nom de crew écrit par N''IMPORTE quelle voie (RPC, Edge '
  'Function service_role, update direct) passe par crew_name_refusal. Ne se '
  'déclenche qu''au changement du nom : les lignes existantes ne sont jamais '
  'gelées par un enrichissement ultérieur de la liste.';

-- Uniformité du resserrage (relevé par la vérification adversariale) : ces trois
-- helpers restaient EXECUTE pour PUBLIC alors que leurs voisines étaient
-- révoquées. Elles ne divulguent aucun terme de la liste (elles répondent
-- seulement « cette chaîne contient-elle un invisible / mélange-t-elle les
-- alphabets »), donc aucun oracle mot-à-mot n'était ouvert — mais la règle
-- « on ne regrante à personne » doit s'appliquer partout, sans exception à
-- expliquer au prochain lecteur.
revoke all on function public.moderation_invisible_class() from public, anon, authenticated;
revoke all on function public.moderation_has_invisible(text)  from public, anon, authenticated;
revoke all on function public.moderation_mixed_scripts(text)  from public, anon, authenticated;
