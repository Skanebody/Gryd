-- 0084_crew_edit_rpc.sql
-- GRYD — L'ÉDITION DE CREW DEVIENT POSSIBLE (le serveur seul juge).
--
-- ═══ CONSTAT AVANT TRAVAUX (vérifié fichier par fichier, pas supposé) ════════
--
--   • `apps/mobile/app/crew-edit.tsx` est une ROUTE ARCHIVÉE : un simple
--     `<Redirect href="/crew"/>`. La version d'avant éditait un crew de DÉMO
--     dans un store AsyncStorage local qui n'écrivait sur AUCUNE table. Son
--     propre docblock nomme la dette : « L'ÉDITION RÉELLE RESTE À FAIRE […]
--     exige une RPC serveur rôle-gatée ». Cette migration EST cette RPC.
--
--   • IL N'EXISTE AUCUN CHEMIN D'ÉDITION SERVEUR. `create_crew` (0042 → 0043 →
--     0050) écrit un crew ; `join_crew_by_code`, `leave_crew`,
--     `crew_join_intent`, `crew_decide_join_request` bougent des ADHÉSIONS.
--     Aucune fonction du dépôt ne touche `name`, `recruitment_status` ou `tags`
--     après la création. Un fondateur ne peut RIEN corriger de son crew.
--
--   • UN TROU D'ÉCRITURE DIRECTE EST RESTÉ OUVERT (relevé ici, fermé plus bas).
--     0003 accordait `update (name, color) on public.crews to authenticated` +
--     la policy `crews_update_creator`. 0030 n'a révoqué QUE la colonne `name`
--     (« renommage payant »). Conséquence restée vraie jusqu'à aujourd'hui :
--     `update crews set color = … where id = …` PASSE depuis le client pour le
--     créateur du crew. C'est la contradiction exacte de « tout claim est décidé
--     serveur » appliquée à l'identité : un champ de crew s'écrit sans qu'aucune
--     règle ne soit consultée. §7 le referme.
--
-- ═══ CE QUE CETTE MIGRATION AJOUTE ══════════════════════════════════════════
--   1. `crews.description` — la colonne N'EXISTAIT PAS (vérifié : aucune des 82
--      migrations ne la pose). Sans elle, « décrire son crew » serait une
--      promesse d'écran sans donnée derrière.
--   2. `crew_description_refusal` — modération du texte libre, bâtie sur les
--      PRIMITIVES de 0050 (même normalisation, MÊME table de termes), avec une
--      politique de correspondance différente et justifiée (cf. §3).
--   3. `crew_edit_context()` — ce que l'écran a le droit de lire ET de faire.
--      Sans elle, l'écran peindrait des champs que le serveur refusera :
--      exactement le bouton mort que la constitution interdit.
--   4. `crew_edit()` — l'écriture, rôle-gatée par CREW_PERMISSIONS, validée,
--      modérée, idempotente, et payante là où le barème dit qu'elle l'est.
--   5. La fermeture du trou d'écriture directe (§7).
--
-- ═══ CE QUI EST ÉDITABLE — ET CE QUI NE L'EST PAS, AVEC LE MOTIF ════════════
--
--   ÉDITABLE (la colonne existe, la donnée est LUE quelque part, la règle est
--   connue du serveur) :
--     · `name`               — CREW_PERMISSIONS.changeNameEmblem
--     · `description`        — CREW_PERMISSIONS.changeSettings      (posée ici)
--     · `recruitment_status` — CREW_PERMISSIONS.manageRecruitment
--     · `tags`               — CREW_PERMISSIONS.manageRecruitment
--
--   PAS ÉDITABLE, et ce n'est PAS un oubli :
--
--     · `color` — la colonne existe (0..CREW_COLORS_COUNT-1, tirée au hasard à
--       la création) mais AUCUNE surface du dépôt ne la rend. Le rendu carte va
--       par RÔLE, jamais par identité de crew (GRYD_REGLES_NON_NEGOCIABLES §C,
--       AMENDEMENT-01) ; `game-rules.ts` l'écrit à la ligne même de la
--       constante : « identité en DB ; rendu carte = AMENDEMENT-01 ». Un
--       sélecteur de couleur serait donc un contrôle sans effet visible nulle
--       part : la définition littérale d'un bouton mort, avec en prime le
--       mensonge « ton crew a maintenant cette couleur ». Le jour où une surface
--       affiche vraiment `crews.color`, le champ s'ajoute ici en trois lignes.
--
--     · EMBLÈME / BANNIÈRE — il N'EXISTE AUCUNE COLONNE. Ce qui existe est un
--       INVENTAIRE : `items` porte des `banner_crew` / `emblem_crew` achetables
--       (0014), sans aucune notion de « pièce équipée par le crew ». Poser un
--       champ « emblème » ici reviendrait à inventer la moitié d'un système
--       d'équipement crew au détour d'une RPC d'édition. La planche E21 le
--       demande ; ce chantier ne le livre pas et ne fait pas semblant.
--
--     · `tag` (l'abréviation courte) — la colonne existe, mais le produit lui
--       attache une REDIRECTION DE 30 JOURS au changement (planche E21) : sans
--       elle, changer de tag casse en silence tout lien déjà partagé. Aucune
--       table de redirection n'existe. On ne livre pas la moitié dangereuse.
--
--     · `slug`, `league`, `xp`, `level`, `activity_score`, `crew_type`,
--       `objectif`, `langue`, `statut` — soit dérivés par des jobs (jamais
--       déclarés par un humain), soit jamais lus par aucune surface. `statut`
--       (0010) mérite sa mention : c'est un DOUBLON mort de
--       `recruitment_status` — aucune requête du dépôt ne le lit. On ne le
--       synchronise pas : entretenir un champ mort le ferait passer pour vivant.
--
-- ═══ CE QUE CETTE MIGRATION NE PRÉTEND PAS ══════════════════════════════════
--   · Elle ne rend pas la modération infaillible : l'en-tête de 0050 dit
--     pourquoi aucune liste ne couvre tout, et la vraie défense reste le
--     signalement + la revue humaine (`content_reports`, 0029). Le filtre de
--     description hérite de TOUTES ces limites, plus une (cf. §3).
--   · Elle n'ajoute AUCUN historique d'édition. Savoir « qui a renommé le crew
--     et quand » est un vrai besoin de modération ; le livrer exigerait une
--     table d'audit et sa politique de rétention. Inscrit en suspens, pas
--     bricolé.
--
-- Source de vérité des constantes : packages/shared/src/game-rules.ts.
-- Chaque valeur reprise ici porte son commentaire `-- game-rules: NOM`, et le
-- test PGlite `supabase/tests/crew_edit_rpc.pglite.test.mjs` RELIT le fichier
-- source pour prouver qu'aucune n'a dérivé.

-- ═══ 1. crews.description : la colonne manquante ════════════════════════════
-- BORNE : 280 caractères. Ce n'est pas un nombre tiré d'un chapeau — c'est la
-- SEULE borne de texte libre déjà posée par le schéma (`user_profiles.bio`,
-- 0011). En reprendre une deuxième, différente, obligerait tout lecteur à se
-- demander laquelle fait autorité. Le client la relit dans
-- `apps/mobile/src/features/crew/crewEdit.ts` et le test PGlite compare les
-- deux : la dérive est impossible sans faire rougir le gate.
--
-- NULL vs '' : la colonne est NULLABLE et ne stocke JAMAIS la chaîne vide.
-- « pas de description » est un fait unique, il n'a pas droit à deux
-- représentations — sinon un écran finirait par afficher un paragraphe vide
-- plutôt qu'un état « rien à dire pour l'instant ».
alter table public.crews
  add column if not exists description text;

do $$ begin
  alter table public.crews
    add constraint crews_description_check
    check (description is null or char_length(description) between 1 and 280);
exception when duplicate_object then null;
end $$;

comment on column public.crews.description is
  'Présentation / règles du crew, écrite par le fondateur. NULL = aucune '
  'description (jamais la chaîne vide : un seul encodage du vide). Borne 280 = '
  'celle de user_profiles.bio (0011), unique borne de texte libre du schéma. '
  'Écriture RÉSERVÉE à la RPC crew_edit : aucun grant client sur cette colonne.';

-- ═══ 2. crews.tags : la liste de référence reste celle de 0013 ══════════════
-- On ne redéclare RIEN. Le CHECK `crews_tags_check` (0013) porte déjà les 9
-- clés de CREW_TAGS et fait autorité. `crew_edit` valide en amont pour rendre
-- un motif propre au joueur au lieu de laisser le CHECK lever une exception —
-- mais si les deux divergeaient un jour, c'est le CHECK qui gagnerait, et le
-- test PGlite compare les deux listes à game-rules.ts.

-- ═══ 3. Modération du TEXTE LIBRE ═══════════════════════════════════════════
/**
 * Motif INTERNE de refus d'une description de crew, ou NULL.
 * Valeurs : 'invisible' | 'blocked_term'.
 *
 * ── POURQUOI PAS `crew_name_refusal` TEL QUEL ───────────────────────────────
 * Réutiliser la fonction de 0050 sans réfléchir aurait été le geste paresseux :
 * elle est calibrée pour un NOM (deux ou trois mots), pas pour de la PROSE. Deux
 * de ses quatre verdicts deviennent faux sur un paragraphe :
 *
 *   · 'reserved' — un nom de crew « Nike Runners » usurpe une marque. Une
 *     description « on court en Nike, RDV devant le Decathlon » ne l'usurpe pas,
 *     elle raconte une sortie. Appliquer la liste des marques à du texte libre
 *     refuserait des descriptions parfaitement légitimes, en boucle, sans que le
 *     joueur comprenne jamais quoi.
 *
 *   · LE 'squash' INTÉGRAL (coller TOUT le texte, séparateurs retirés) — sur un
 *     nom court, il démasque `c.o.n.n.a.r.d`. Sur 280 caractères, il fabrique
 *     une chaîne de 250 lettres d'affilée où un terme de 4 ou 5 lettres finit
 *     par apparaître à cheval sur deux mots parfaitement innocents. Le
 *     contournement qu'il attrape est rare ; le faux positif qu'il crée est
 *     STRUCTUREL — il grandit avec la longueur du texte.
 *
 *   · 'mixed_scripts' — un nom qui mélange cyrillique et latin est presque
 *     toujours un homoglyphe. Une description peut légitimement citer un mot
 *     grec, un prénom, une ville. Retiré pour la même raison.
 *
 * ── CE QUI S'APPLIQUE, ET AVEC QUELLE PRÉCISION ────────────────────────────
 * Les caractères invisibles (aucune raison honnête d'en poser dans une
 * description) et les insultes / slurs / sexuel / haine. La correspondance suit
 * `match_mode`, c'est-à-dire LA CURATION QUE 0050 A DÉJÀ FAITE, sans la refaire :
 *
 *   · 'word'   → le terme doit être un MOT ENTIER. C'est le mode que 0050 pose
 *     sur les termes courts ou sous-chaînes de mots légitimes (`cunt` dans
 *     Scunthorpe, `sex` dans Essex, `viol` dans violet, `fag` dans fagot). On ne
 *     l'assouplit pas d'un pouce : c'est exactement ce qui empêche les faux
 *     positifs les plus connus.
 *
 *   · 'squash' → le terme doit COMMENCER UN MOT, suffixe libre. 0050 réserve ce
 *     mode aux termes « assez longs et assez distinctifs » ; on hérite de ce
 *     jugement pour attraper les FLEXIONS, qui sont la forme d'évasion la plus
 *     banale dans de la prose (`connards`, `fucking`, `salopes`). Une insulte au
 *     pluriel n'est pas un contournement subtil : c'est la façon NORMALE
 *     d'écrire une phrase, et un filtre qui la rate ne filtre rien.
 *
 * ── CE QUE CE FILTRE NE FAIT PAS, DIT ICI PLUTÔT QUE LAISSÉ CROIRE ─────────
 * Il n'attrape PAS le fractionnement par séparateurs (`c-o-n-n-a-r-d`), que le
 * filtre des NOMS attrape. C'est le prix assumé de ne pas recoller 280
 * caractères. Il hérite par ailleurs de TOUTES les limites de 0050 (deux langues
 * seulement, lettres répétées, insulte contextuelle…). La vraie défense reste le
 * signalement + la revue humaine — `content_reports` (0029), pas ce `where`.
 *
 * ── CE QUI EST RÉUTILISÉ, ET NE L'EST PAS DUPLIQUÉ ──────────────────────────
 * La table `blocked_name_terms` (0050) : la MÊME, pas une copie. La
 * normalisation `moderation_fold` (0050) : la MÊME, pas une variante. Le
 * `match_mode` de chaque terme : le MÊME jugement, lu et respecté. Seule la
 * façon de consommer ce mode change, et elle tient en une clause `where`.
 * Enrichir la liste protège donc les deux surfaces d'un seul insert.
 *
 * SECURITY DEFINER : `blocked_name_terms` est révoquée à tout le monde.
 * search_path épinglé — obligatoire sur tout SECURITY DEFINER.
 */
create or replace function public.crew_description_refusal(p_text text)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_fold text;
begin
  if p_text is null or btrim(p_text) = '' then
    return null;             -- pas de description : rien à modérer
  end if;
  if public.moderation_has_invisible(p_text) then
    return 'invisible';
  end if;

  v_fold := public.moderation_fold(p_text);
  if v_fold = ' ' or v_fold = '' then
    -- Rien de latin/numérique à examiner (écriture non couverte). On ne refuse
    -- pas ce qu'on ne sait pas lire — même arbitrage que 0050.
    return null;
  end if;

  -- `match_mode` de 0050, consommé pour de la PROSE (cf. le docblock) :
  --   'word'   → mot entier          (protège Scunthorpe, Essex, violet, fagot)
  --   'squash' → début de mot        (attrape les flexions : connards, fucking)
  -- Jamais le squash INTÉGRAL : recoller 280 caractères invente des mots.
  if exists (
    select 1 from public.blocked_name_terms t
    where (t.match_mode = 'word'   and v_fold like '% ' || t.term || ' %')
       or (t.match_mode = 'squash' and v_fold like '% ' || t.term || '%')
  ) then
    return 'blocked_term';
  end if;

  return null;
end;
$$;

-- Même doctrine que 0050 : aucun client n'a de raison d'appeler ce verdict, et
-- lui donner l'accès offrirait un oracle pour tester la liste mot par mot.
revoke all on function public.crew_description_refusal(text)
  from public, anon, authenticated;

comment on function public.crew_description_refusal(text) is
  'Motif INTERNE de refus d''une description de crew, ou NULL. '
  '''invisible''|''blocked_term''. Réutilise la table blocked_name_terms, la '
  'normalisation moderation_fold ET le match_mode de 0050 : ''word'' = mot entier, '
  '''squash'' = DÉBUT de mot (les flexions, connards/fucking). Jamais le squash '
  'INTÉGRAL ni la liste des marques : recoller 280 caractères invente des mots, et '
  'citer une marque dans un texte n''est pas l''usurper. Ne rattrape donc PAS le '
  'fractionnement par séparateurs, contrairement au filtre des noms. Jamais '
  'renvoyé tel quel au client.';

-- ═══ 4. crew_edit_context : ce que l'écran a le DROIT de faire ══════════════
/**
 * Lecture PRÉALABLE de l'écran /crew-edit. Elle renvoie l'état ÉDITABLE du crew
 * du joueur ET, champ par champ, s'il a le droit d'y toucher.
 *
 * ── POURQUOI DES DROITS PAR CHAMP, ET PAS UN SEUL BOOLÉEN ───────────────────
 * Aujourd'hui les trois entrées de CREW_PERMISSIONS concernées valent toutes
 * ['founder'] : un booléen unique suffirait — et deviendrait FAUX en silence le
 * jour où la matrice s'ouvre au co-capitaine sur le seul recrutement. Trois
 * drapeaux nommés d'après les trois entrées de la matrice, c'est le contrat qui
 * survit à ce changement, et le test PGlite compare chacun à game-rules.ts.
 *
 * ── POURQUOI ELLE PORTE LE COÛT ET LE SOLDE ────────────────────────────────
 * Le renommage est PAYANT (CREW_RENAME_FOULEES — 0030 le dit noir sur blanc).
 * Un écran qui l'ignore peint un bouton « Enregistrer » qui échouera à coup sûr
 * pour un fondateur à sec : bouton mort. En rendant `renameCostFoulees` et
 * `myFoulees`, l'écran annonce le prix AVANT le geste et bloque avec un motif
 * lisible plutôt qu'après coup. La règle reste tranchée SERVEUR : ces deux
 * nombres informent l'affichage, ils n'autorisent rien.
 *
 * Elle ne renvoie NI `code` (secret depuis 0036), NI `color` (jamais rendue,
 * donc jamais éditable ici), NI aucune identité de membre (§12).
 */
create or replace function public.crew_edit_context() returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_role    text;
  v_crew    public.crews%rowtype;
  v_foulees integer;
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

  select * into v_crew from public.crews c where c.id = v_crew_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  select u.foulees into v_foulees from public.users u where u.id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'role', v_role,
    'crew', jsonb_build_object(
      'id',                v_crew.id,
      'name',              v_crew.name,
      'description',       v_crew.description,
      'recruitmentStatus', v_crew.recruitment_status,
      'tags',              to_jsonb(v_crew.tags)
    ),
    'can', jsonb_build_object(
      -- game-rules: CREW_PERMISSIONS.changeNameEmblem
      'name',        v_role in ('founder'),
      -- game-rules: CREW_PERMISSIONS.changeSettings
      'description', v_role in ('founder'),
      -- game-rules: CREW_PERMISSIONS.manageRecruitment
      'recruitment', v_role in ('founder')
    ),
    'renameCostFoulees', 300,                       -- game-rules: CREW_RENAME_FOULEES
    'myFoulees',         coalesce(v_foulees, 0),
    'descriptionMax',    280                        -- borne DDL crews_description_check
  );
end;
$$;

-- ═══ 5. crew_edit : L'ÉCRITURE — le serveur seul juge ═══════════════════════
/**
 * Édite le crew du joueur. TOUT est tranché ici : appartenance, rôle, bornes,
 * modération, coût. Le client n'apporte que des intentions.
 *
 * ── LA CONVENTION DES PARAMÈTRES ────────────────────────────────────────────
 * `null` = « ne touche pas à ce champ ». L'écran n'envoie donc QUE ce que le
 * joueur a modifié, et un fondateur qui corrige une faute dans sa description
 * ne risque jamais de repayer un renommage au passage.
 * Corollaire nécessaire : EFFACER la description s'exprime par la CHAÎNE VIDE,
 * pas par `null` (qui voudrait dire « laisse-la »). La chaîne vide est convertie
 * en NULL en base — un seul encodage du vide (cf. §1).
 *
 * ── IDEMPOTENCE ────────────────────────────────────────────────────────────
 * Réappliquer exactement la même édition ne fait RIEN et ne coûte RIEN : chaque
 * champ est comparé à sa valeur actuelle (`is not distinct from`, qui traite
 * NULL comme une valeur et non comme un trou), et le renommage n'est facturé
 * que si le nom CHANGE VRAIMENT. Un double-tap sur « Enregistrer », un retry
 * réseau ou un rejeu de la requête débitent 300 foulées UNE fois — jamais deux.
 * Le verrou `for update` sur la ligne crew sérialise deux appels concurrents,
 * sans quoi deux renommages simultanés liraient le même « ancien » nom et
 * factureraient deux fois.
 *
 * ── L'ORDRE DES CONTRÔLES N'EST PAS ARBITRAIRE ─────────────────────────────
 * Identité → appartenance → rôle → bornes → MODÉRATION → verrou → débit →
 * écriture. La modération passe AVANT le débit : un nom refusé ne coûte rien.
 * Le débit passe avant l'écriture, dans la même transaction : si l'un échoue,
 * les deux sont annulés — on ne renomme jamais gratuitement, on ne facture
 * jamais un renommage qui n'a pas eu lieu.
 *
 * ── CE QUE LE JOUEUR VOIT ──────────────────────────────────────────────────
 * Motifs explicites SAUF pour la modération, qui rend un unique
 * `name_unavailable` / `description_unavailable` : détailler la règle qui a
 * mordu serait un mode d'emploi du contournement (doctrine 0050).
 */
create or replace function public.crew_edit(
  p_name               text   default null,
  p_description        text   default null,
  p_recruitment_status text   default null,
  p_tags               text[] default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_crew_id uuid;
  v_role    text;
  v_crew    public.crews%rowtype;

  -- Droits par champ, nommés d'après les entrées de CREW_PERMISSIONS.
  v_can_name        boolean;
  v_can_settings    boolean;
  v_can_recruitment boolean;

  v_new_name   text;
  v_new_desc   text;
  v_new_status text;
  v_new_tags   text[];

  v_renamed   boolean := false;
  v_spent     integer := 0;
  v_debited   integer;
  v_foulees   integer;
begin
  -- ── Identité ──────────────────────────────────────────────────────────────
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'signed_out');
  end if;

  -- ── Appartenance + rôle — la source est crew_members, jamais le client ────
  -- `left_at is null` = adhésion EN COURS. L'index unique
  -- `crew_members_one_active_per_user` (0002) garantit qu'il y en a au plus une :
  -- un joueur n'édite donc jamais « un » crew, il édite LE SIEN.
  select cm.crew_id, cm.role into v_crew_id, v_role
  from public.crew_members cm
  where cm.user_id = v_uid and cm.left_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- On VERROUILLE la ligne crew : sans ce `for update`, deux appels concurrents
  -- liraient le même « ancien » nom, se croiraient tous deux renommants, et
  -- factureraient deux fois le même changement.
  select * into v_crew from public.crews c where c.id = v_crew_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_crew');
  end if;

  -- ── Rôle : la matrice CREW_PERMISSIONS, champ par champ ──────────────────
  -- Un membre simple, un rookie, un capitaine, un co-capitaine : REFUSÉS sur
  -- ces trois champs tant que la matrice dit ['founder']. Un non-membre n'est
  -- même pas arrivé jusqu'ici (`no_crew` ci-dessus).
  v_can_name        := v_role in ('founder');  -- game-rules: CREW_PERMISSIONS.changeNameEmblem
  v_can_settings    := v_role in ('founder');  -- game-rules: CREW_PERMISSIONS.changeSettings
  v_can_recruitment := v_role in ('founder');  -- game-rules: CREW_PERMISSIONS.manageRecruitment

  if p_name is not null and not v_can_name then
    return jsonb_build_object('ok', false, 'reason', 'forbidden', 'field', 'name');
  end if;
  if p_description is not null and not v_can_settings then
    return jsonb_build_object('ok', false, 'reason', 'forbidden', 'field', 'description');
  end if;
  if (p_recruitment_status is not null or p_tags is not null) and not v_can_recruitment then
    return jsonb_build_object('ok', false, 'reason', 'forbidden', 'field', 'recruitment');
  end if;

  -- ── Bornes + modération, champ par champ ─────────────────────────────────

  -- NOM (1..40, borne DDL de 0002 — jamais un autre chiffre ici).
  if p_name is not null then
    v_new_name := btrim(p_name);
    if char_length(v_new_name) < 1 or char_length(v_new_name) > 40 then
      return jsonb_build_object('ok', false, 'reason', 'bad_name');
    end if;
    -- Un seul motif côté joueur, quelle que soit la règle (doctrine 0050).
    if public.crew_name_refusal(v_new_name) is not null then
      return jsonb_build_object('ok', false, 'reason', 'name_unavailable');
    end if;
  end if;

  -- DESCRIPTION ('' = effacer ; borne 280 = crews_description_check).
  if p_description is not null then
    v_new_desc := btrim(p_description);
    if v_new_desc = '' then
      v_new_desc := null;                       -- un seul encodage du vide
    elsif char_length(v_new_desc) > 280 then    -- borne DDL crews_description_check
      return jsonb_build_object('ok', false, 'reason', 'bad_description');
    elsif public.crew_description_refusal(v_new_desc) is not null then
      return jsonb_build_object('ok', false, 'reason', 'description_unavailable');
    end if;
  end if;

  -- RECRUTEMENT (les 4 statuts de 0013 = CREW_RECRUITMENT_STATUSES).
  if p_recruitment_status is not null then
    v_new_status := p_recruitment_status;
    -- game-rules: CREW_RECRUITMENT_STATUSES
    if v_new_status not in ('open', 'on_request', 'invite_only', 'closed') then
      return jsonb_build_object('ok', false, 'reason', 'bad_recruitment_status');
    end if;
  end if;

  -- TAGS (sous-ensemble des 9 clés de 0013 = CREW_TAGS ; dédoublonnés, triés).
  -- Le tri n'est pas cosmétique : sans lui, ['casual','raid'] et
  -- ['raid','casual'] seraient « différents » et l'idempotence tomberait.
  if p_tags is not null then
    select coalesce(array_agg(distinct x order by x), '{}'::text[])
      into v_new_tags
    from unnest(p_tags) as x
    where x is not null;
    -- game-rules: CREW_TAGS (mêmes 9 clés que crews_tags_check, 0013)
    if not (v_new_tags <@ array[
      'casual', 'competitif', 'defense', 'raid', 'exploration',
      'performance', 'run_club', 'debutants_ok', 'pionnier'
    ]::text[]) then
      return jsonb_build_object('ok', false, 'reason', 'bad_tags');
    end if;
  end if;

  -- ── Le renommage est PAYANT — et seulement s'il change vraiment le nom ────
  if v_new_name is not null and v_new_name is distinct from v_crew.name then
    -- Débit ATOMIQUE : la clause `foulees >= 300` fait du contrôle de solde et
    -- du retrait UNE seule opération. Un `select` puis un `update` laisseraient
    -- une fenêtre où deux dépenses concurrentes passeraient toutes les deux.
    update public.users u
    set foulees = u.foulees - 300                 -- game-rules: CREW_RENAME_FOULEES
    where u.id = v_uid and u.foulees >= 300       -- game-rules: CREW_RENAME_FOULEES
    returning u.foulees into v_debited;

    if v_debited is null then
      select u.foulees into v_foulees from public.users u where u.id = v_uid;
      return jsonb_build_object(
        'ok', false, 'reason', 'not_enough_foulees',
        'need', 300,                              -- game-rules: CREW_RENAME_FOULEES
        'have', coalesce(v_foulees, 0));
    end if;
    v_renamed := true;
    v_spent   := 300;                             -- game-rules: CREW_RENAME_FOULEES
  end if;

  -- ── Rien de demandé = rien d'écrit ───────────────────────────────────────
  -- Un appel dont TOUS les paramètres sont NULL n'a rien à faire : sans ce
  -- retour, il exécuterait un UPDATE qui réécrit les mêmes valeurs (et
  -- réveillerait le trigger de modération) pour un appelant qui n'a peut-être
  -- aucun droit. Une écriture sans effet reste une écriture.
  if p_name is null and p_description is null
     and p_recruitment_status is null and p_tags is null then
    return jsonb_build_object(
      'ok', true, 'renamed', false, 'fouleesSpent', 0,
      'fouleesLeft', (select u.foulees from public.users u where u.id = v_uid),
      'crew', jsonb_build_object(
        'id',                v_crew.id,
        'name',              v_crew.name,
        'description',       v_crew.description,
        'recruitmentStatus', v_crew.recruitment_status,
        'tags',              to_jsonb(v_crew.tags)
      ));
  end if;

  -- ── Écriture — `coalesce` sur la valeur ACTUELLE = « ne touche pas » ──────
  -- La description est le seul champ qui puisse redevenir NULL volontairement :
  -- elle ne passe donc pas par coalesce mais par un CASE explicite.
  update public.crews c
  set name               = coalesce(v_new_name, c.name),
      description        = case when p_description is null then c.description
                                else v_new_desc end,
      recruitment_status = coalesce(v_new_status, c.recruitment_status),
      tags               = coalesce(v_new_tags, c.tags)
  where c.id = v_crew.id
  returning * into v_crew;

  select u.foulees into v_foulees from public.users u where u.id = v_uid;

  return jsonb_build_object(
    'ok', true,
    'renamed', v_renamed,
    'fouleesSpent', v_spent,
    'fouleesLeft', coalesce(v_foulees, 0),
    'crew', jsonb_build_object(
      'id',                v_crew.id,
      'name',              v_crew.name,
      'description',       v_crew.description,
      'recruitmentStatus', v_crew.recruitment_status,
      'tags',              to_jsonb(v_crew.tags)
    ));
end;
$$;

-- ═══ 6. Grants : les deux RPC, à `authenticated` UNIQUEMENT ═════════════════
-- PUBLIC hérite EXECUTE par défaut : révoquer `from authenticated` seul ne
-- fermerait rien (doctrine 0050/0083).
revoke all on function public.crew_edit_context()                     from public, anon;
revoke all on function public.crew_edit(text, text, text, text[])     from public, anon;
grant execute on function public.crew_edit_context()                  to authenticated;
grant execute on function public.crew_edit(text, text, text, text[])  to authenticated;

comment on function public.crew_edit_context() is
  'État ÉDITABLE du crew du joueur + ses droits PAR CHAMP (CREW_PERMISSIONS) + '
  'le coût du renommage et son solde. Existe pour que l''écran ne peigne AUCUN '
  'contrôle que le serveur refusera. Ne renvoie ni crews.code (secret 0036), ni '
  'crews.color (jamais rendue), ni aucune identité de membre.';

comment on function public.crew_edit(text, text, text, text[]) is
  'Édition rôle-gatée du crew du joueur — le SERVEUR seul juge. NULL = « ne '
  'touche pas à ce champ » ; chaîne vide sur la description = l''effacer. '
  'IDEMPOTENTE : réappliquer la même édition n''écrit rien de neuf et ne débite '
  'pas deux fois (le renommage n''est facturé CREW_RENAME_FOULEES que si le nom '
  'change réellement, sous verrou de ligne). Modération AVANT débit.';

-- ═══ 7. FERMETURE DU TROU D'ÉCRITURE DIRECTE (le constat de l'en-tête) ══════
-- 0003 accordait `update (name, color)` au créateur du crew ; 0030 n'a révoqué
-- que `name`. `color` restait donc écrivable directement depuis le client, sans
-- qu'aucune règle ne soit consultée — l'exact contraire de « tout est décidé
-- serveur ». Maintenant qu'une voie serveur existe pour éditer un crew, la
-- porte dérobée n'a plus la moindre justification : on révoque l'UPDATE en
-- entier (colonne par colonne, un `revoke update` global ne retire pas les
-- grants posés par colonne).
revoke update (name, color) on public.crews from authenticated, anon;
revoke update              on public.crews from authenticated, anon;

-- La policy `crews_update_creator` (0003) n'autorise plus rien, faute de grant.
-- On la SUPPRIME plutôt que de la laisser : une policy qui décrit un droit
-- inexistant est une fausse piste pour le prochain lecteur, et le jour où
-- quelqu'un re-grante un UPDATE « juste pour tester », elle le laisserait
-- passer en silence. La règle vit dans crew_edit, et nulle part ailleurs.
drop policy if exists crews_update_creator on public.crews;

comment on table public.crews is
  'Crews. AUCUNE écriture client directe : insert via create_crew (0050), update '
  'via crew_edit (0084), lecture via les RPC SECURITY DEFINER (select révoqué '
  'depuis 0036 — crews.code est un secret). Les colonnes dérivées (xp, level, '
  'activity_score, league, signaux discovery) appartiennent aux jobs, pas aux '
  'humains.';
