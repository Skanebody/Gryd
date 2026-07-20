-- 0047_handle_verification.sql
-- GRYD — @handle : vérificateur de disponibilité, noms réservés, badge vérifié.
--
-- DEMANDE FONDATEUR : « il faut un vérificateur pour ne pas avoir deux fois le
-- même handle, créer des profils vérifiés avec le badge vérifié. Bloquer tous
-- les noms de marques connues […] pour la ville il faut absolument que la ville
-- existe donc un pré-remplissage. »
--
-- CONSTAT AVANT TRAVAUX (vérifié, pas supposé) : `user_profiles.handle` est
-- DÉJÀ `text not null unique check (handle ~ '^[a-z0-9_]{3,20}$')` depuis
-- 0011_social.sql:45. L'unicité EXISTE en base et le serveur reste seul juge.
-- Ce qui manque n'est donc PAS l'unicité, c'est :
--   (a) un retour à l'utilisateur AVANT de soumettre (sinon : erreur 23505 opaque),
--   (b) le blocage des marques / termes officiels (usurpation),
--   (c) la colonne du badge vérifié, non écrivable par le client.
--
-- ─── CHOIX N°1 : on GARDE le jeu de caractères actuel (a-z0-9_), PAS de point ──
-- Instagram autorise le point ; nous non, et c'est délibéré :
--   • Le point est un séparateur QUASI INVISIBLE à petite taille : `nike.store`
--     et `nikestore` se confondent à l'œil sur un chip de leaderboard. Ajouter
--     le point MULTIPLIE les sosies d'un handle réservé au lieu de les réduire —
--     l'inverse de ce que demande le fondateur.
--   • Un handle GRYD est cité en fin de phrase dans le chat crew (« bravo @koro. »)
--     et en deep link. Un point autorisé rend la fin du token ambiguë au parsing.
--   • Instagram a ouvert le point pour une raison qui n'est pas la nôtre :
--     un espace de noms saturé par ~2 milliards de comptes. GRYD est en Saison 0.
--     Élargir l'alphabet « au cas où » se paie en usurpation immédiate.
--   • Et surtout : élargir la regex est irréversible en pratique (des handles à
--     point existeraient), alors que la restreindre plus tard casserait des
--     comptes. On garde l'option ouverte, on ne la brûle pas.
-- Restent appliquées, elles, les contraintes Instagram qui NOUS servent :
-- minuscules imposées, longueur bornée (3-20), et unicité INSENSIBLE À LA CASSE
-- — cette dernière est déjà acquise gratuitement puisque le CHECK n'admet que
-- des minuscules : le RPC `lower()` l'entrée, donc « KORO » et « koro » ne
-- peuvent pas coexister. Aucune migration de données n'est nécessaire.
--
-- ─── CHOIX N°2 : table de réservés, pas de liste en dur ──────────────────────
-- Une liste dans le corps d'une fonction se modifie par MIGRATION (donc release
-- mobile + déploiement). Une TABLE se complète par un simple insert service-role
-- le jour où une marque écrit. Le seed ci-dessous est VOLONTAIREMENT MODESTE et
-- honnête : il couvre les évidences (grands équipementiers running, plateformes
-- grand public, termes officiels GRYD, termes trompeurs). Il ne prétend PAS
-- couvrir « toutes les marques du monde » — c'est impossible et le prétendre
-- serait un mensonge produit. La vraie défense contre l'usurpation reste le
-- SIGNALEMENT + la revue humaine, déjà en place (content_reports, 0029).
--
-- Anti-contournement LÉGER : la comparaison se fait sur le handle NORMALISÉ
-- (underscores retirés), donc `n_i_k_e` et `nike_` butent sur `nike`. C'est tout :
-- on ne fait PAS de distance de Levenshtein ni de détection d'homoglyphes — ce
-- serait des faux positifs sur des pseudos légitimes pour un gain marginal.
--
-- ─── CHOIX N°3 : `verified` existe, mais PERSONNE ne l'a ─────────────────────
-- La colonne est posée et rendue non-écrivable par le client. AUCUN processus
-- d'attribution n'existe à ce jour : pas de formulaire, pas de critère, pas de
-- file de revue. Donc `verified` vaut false pour 100 % des comptes et l'app ne
-- doit RIEN afficher qui laisse croire qu'on peut la demander (pas de « demander
-- la vérification », pas de « bientôt vérifié »). Le badge n'apparaît que si le
-- serveur dit true — ce qu'il ne dira pour l'instant jamais. « L'app ne ment
-- jamais » : une colonne prête n'est pas une promesse faite à l'utilisateur.

-- ═══ 1. reserved_handles ═════════════════════════════════════════════════════
-- `handle` stocké NORMALISÉ (minuscules, sans underscore) : c'est la clé de
-- comparaison, pas un handle affichable. `reason` sert la revue humaine et un
-- éventuel message différencié plus tard (aujourd'hui l'app dit juste « réservé »).
create table if not exists public.reserved_handles (
  handle     text primary key
    check (handle ~ '^[a-z0-9]{2,30}$'),
  reason     text not null
    check (reason in ('brand', 'official', 'misleading')),
  note       text,
  created_at timestamptz not null default now()
);

comment on table public.reserved_handles is
  'Handles interdits à l''inscription (comparaison sur le handle NORMALISÉ : '
  'minuscules, underscores retirés). Seed volontairement MODESTE — il couvre les '
  'évidences, PAS « toutes les marques du monde ». La défense réelle contre '
  'l''usurpation reste le signalement + revue humaine (content_reports, 0029). '
  'Se complète par insert service-role, sans migration ni release mobile.';

alter table public.reserved_handles enable row level security;

-- Aucun client ne lit cette table : elle est consommée UNIQUEMENT par le RPC
-- SECURITY DEFINER ci-dessous. La laisser lisible donnerait gratuitement la
-- carte des noms à ne pas tester. Aucune policy → même le service_role passe
-- par son bypass, pas par une policy oubliée.
revoke all on public.reserved_handles from public, anon, authenticated;

-- ── Seed ────────────────────────────────────────────────────────────────────
insert into public.reserved_handles (handle, reason, note) values
  -- Équipementiers / marques running de premier plan (les évidences).
  ('nike',          'brand', 'équipementier'),
  ('adidas',        'brand', 'équipementier'),
  ('puma',          'brand', 'équipementier'),
  ('asics',         'brand', 'équipementier'),
  ('newbalance',    'brand', 'équipementier'),
  ('saucony',       'brand', 'équipementier'),
  ('hoka',          'brand', 'équipementier'),
  ('brooks',        'brand', 'équipementier'),
  ('salomon',       'brand', 'équipementier'),
  ('onrunning',     'brand', 'équipementier'),
  ('reebok',        'brand', 'équipementier'),
  ('underarmour',   'brand', 'équipementier'),
  ('lululemon',     'brand', 'équipementier'),
  ('decathlon',     'brand', 'distributeur sport'),
  ('kiprun',        'brand', 'marque Decathlon running'),
  -- Écosystème running / objets connectés (voisins directs de GRYD).
  ('strava',        'brand', 'plateforme running'),
  ('garmin',        'brand', 'montres GPS'),
  ('polar',         'brand', 'montres GPS'),
  ('suunto',        'brand', 'montres GPS'),
  ('coros',         'brand', 'montres GPS'),
  ('runkeeper',     'brand', 'plateforme running'),
  ('komoot',        'brand', 'plateforme outdoor'),
  ('zwift',         'brand', 'plateforme sport'),
  -- Plateformes grand public (usurpation la plus rentable).
  ('apple',         'brand', 'plateforme'),
  ('google',        'brand', 'plateforme'),
  ('microsoft',     'brand', 'plateforme'),
  ('samsung',       'brand', 'plateforme'),
  ('amazon',        'brand', 'plateforme'),
  ('meta',          'brand', 'plateforme'),
  ('facebook',      'brand', 'plateforme'),
  ('instagram',     'brand', 'plateforme'),
  ('whatsapp',      'brand', 'plateforme'),
  ('tiktok',        'brand', 'plateforme'),
  ('snapchat',      'brand', 'plateforme'),
  ('youtube',       'brand', 'plateforme'),
  ('twitter',       'brand', 'plateforme'),
  ('spotify',       'brand', 'plateforme'),
  ('netflix',       'brand', 'plateforme'),
  ('paypal',        'brand', 'paiement'),
  ('visa',          'brand', 'paiement'),
  ('mastercard',    'brand', 'paiement'),
  ('redbull',       'brand', 'sponsor sport'),
  ('cocacola',      'brand', 'sponsor sport'),
  -- Termes officiels GRYD : un compte qui porte ces noms EST perçu comme nous.
  ('gryd',          'official', 'marque GRYD'),
  ('grydapp',       'official', 'marque GRYD'),
  ('grydofficial',  'official', 'marque GRYD'),
  ('grydofficiel',  'official', 'marque GRYD'),
  ('grydsupport',   'official', 'marque GRYD'),
  ('grydteam',      'official', 'marque GRYD'),
  ('klaim',         'official', 'nom de code interne du repo'),
  ('admin',         'official', 'terme d''administration'),
  ('administrator', 'official', 'terme d''administration'),
  ('administrateur','official', 'terme d''administration'),
  ('root',          'official', 'terme d''administration'),
  ('system',        'official', 'terme d''administration'),
  ('systeme',       'official', 'terme d''administration'),
  ('support',       'official', 'relation joueur'),
  ('help',          'official', 'relation joueur'),
  ('aide',          'official', 'relation joueur'),
  ('contact',       'official', 'relation joueur'),
  ('staff',         'official', 'équipe'),
  ('team',          'official', 'équipe'),
  ('equipe',        'official', 'équipe'),
  ('moderation',    'official', 'modération'),
  ('moderator',     'official', 'modération'),
  ('moderateur',    'official', 'modération'),
  ('security',      'official', 'sécurité'),
  ('securite',      'official', 'sécurité'),
  ('legal',         'official', 'juridique'),
  ('privacy',       'official', 'juridique'),
  ('press',         'official', 'communication'),
  ('presse',        'official', 'communication'),
  ('api',           'official', 'réservé technique'),
  ('www',           'official', 'réservé technique'),
  -- Termes TROMPEURS : ils suggèrent un statut que la personne n'a pas.
  ('verified',      'misleading', 'suggère le badge vérifié'),
  ('verifie',       'misleading', 'suggère le badge vérifié'),
  ('official',      'misleading', 'suggère un compte officiel'),
  ('officiel',      'misleading', 'suggère un compte officiel'),
  ('compteverifie', 'misleading', 'suggère le badge vérifié'),
  ('grydverified',  'misleading', 'suggère le badge vérifié')
on conflict (handle) do nothing;

-- ═══ 2. Badge vérifié sur user_profiles ══════════════════════════════════════
-- `verified` : décidé SERVEUR, jamais par le client (aucun `grant update` — les
-- grants de 0011 sont COLONNE PAR COLONNE, donc une colonne ajoutée n'hérite de
-- rien). Le revoke explicite ci-dessous verrouille le cas d'un futur
-- `grant update on public.user_profiles to authenticated` posé par distraction.
alter table public.user_profiles
  add column if not exists verified    boolean not null default false,
  add column if not exists verified_at timestamptz;

revoke update (verified, verified_at) on public.user_profiles from public, anon, authenticated;
revoke insert (verified, verified_at) on public.user_profiles from public, anon, authenticated;

comment on column public.user_profiles.verified is
  'Badge vérifié. AUCUN processus d''attribution n''existe à ce jour (pas de '
  'formulaire, pas de critère public, pas de file de revue) : la valeur est '
  'false pour 100 %% des comptes et seul le service_role peut l''écrire. '
  'L''app ne doit donc RIEN afficher qui laisse croire qu''on peut la demander. '
  'Avant d''activer quoi que ce soit : définir les critères, la preuve exigée, '
  'et qui tranche.';

-- ═══ 3. RPC check_handle_available ═══════════════════════════════════════════
-- Contrat FIGÉ (jsonb) :
--   {"ok": true}
--   {"ok": false, "reason": "too_short"|"too_long"|"bad_chars"|"reserved"|"taken"}
--
-- Ce RPC est un CONFORT, pas une autorité : il évite à l'utilisateur de taper 20
-- caractères pour se prendre une 23505 au moment d'enregistrer. Le juge reste la
-- contrainte `unique` + le `check` de 0011, évalués à l'écriture — deux joueurs
-- qui valident le même handle à la même seconde ne peuvent pas tous deux l'obtenir.
--
-- Le handle de L'APPELANT ne compte JAMAIS comme pris : sans cela, un joueur ne
-- pourrait plus ré-enregistrer son propre profil (le nom qu'il porte lui serait
-- annoncé « déjà utilisé »). Ce raccourci sert AUSSI aux comptes qui portent déjà
-- un handle devenu réservé après coup : on ne leur casse pas leur profil, on
-- traitera le cas par la revue humaine, pas par un blocage automatique brutal.
create or replace function public.check_handle_available(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid    uuid := auth.uid();
  v_handle text := lower(btrim(coalesce(p_handle, '')));
  v_norm   text;
begin
  -- Court-circuit : c'est déjà MON handle → toujours disponible pour moi.
  if v_uid is not null and exists (
    select 1 from public.user_profiles up
    where up.user_id = v_uid and up.handle = v_handle
  ) then
    return jsonb_build_object('ok', true);
  end if;

  -- Longueur et alphabet : miroir EXACT du check de 0011 (^[a-z0-9_]{3,20}$),
  -- décomposé pour dire au joueur CE QUI cloche plutôt qu'un « invalide » opaque.
  if char_length(v_handle) < 3 then
    return jsonb_build_object('ok', false, 'reason', 'too_short');
  end if;
  if char_length(v_handle) > 20 then
    return jsonb_build_object('ok', false, 'reason', 'too_long');
  end if;
  if v_handle !~ '^[a-z0-9_]+$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_chars');
  end if;

  -- Réservé ? Comparaison sur la forme normalisée (underscores retirés) : `n_i_k_e`
  -- ne passe pas là où `nike` est bloqué.
  v_norm := replace(v_handle, '_', '');
  if exists (select 1 from public.reserved_handles r where r.handle = v_norm) then
    return jsonb_build_object('ok', false, 'reason', 'reserved');
  end if;

  -- Pris par QUELQU'UN D'AUTRE ? (l'égalité suffit : le check n'admet que des
  -- minuscules, donc la comparaison est déjà insensible à la casse.)
  if exists (
    select 1 from public.user_profiles up
    where up.handle = v_handle
      and (v_uid is null or up.user_id <> v_uid)
  ) then
    return jsonb_build_object('ok', false, 'reason', 'taken');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- PUBLIC hérite EXECUTE par défaut : révoquer `from authenticated` seul ne
-- fermerait RIEN (piège connu). On révoque de `public, anon` puis on regrante.
revoke all on function public.check_handle_available(text) from public, anon;
grant execute on function public.check_handle_available(text) to authenticated;

comment on function public.check_handle_available(text) is
  'Disponibilité d''un @handle AVANT soumission (confort UI). Retour jsonb : '
  '{"ok":true} ou {"ok":false,"reason":"too_short|too_long|bad_chars|reserved|taken"}. '
  'N''AUTORISE RIEN : le juge reste le unique + check de 0011 à l''écriture. '
  'Le handle de l''appelant n''est jamais compté comme pris.';
