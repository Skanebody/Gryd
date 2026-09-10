-- 0187_anticheat_operator_2026.sql
-- GRYD — QUELQU'UN DÉPILE ENFIN LA FILE DE REVUE ANTI-TRICHE.
--
-- ═══ LE DÉFAUT QUE CETTE MIGRATION FERME ════════════════════════════════════
-- ADR-015 (11/09/2026) le nomme en toutes lettres, et c'est son chantier n° 1 :
-- « L'opérateur de revue : qui, sous quelle habilitation, avec quel délai. Sans
-- lui, une vérification est en pratique un refus définitif. »
-- Depuis le lot anti-triche du 11/09, une sortie dont les signaux convergent
-- ENTRE dans `anticheat_reviews` (0081) et sa capture est gelée
-- (`verification_required`, 0155). Mais AUCUNE fonction du dépôt ne passait une
-- revue en `closed` : ni rôle, ni habilitation, ni endpoint. La suspicion était
-- donc une condamnation muette, et l'écran d'appel (E28) ne pouvait qu'annoncer
-- « aucun délai ne t'est annoncé, parce qu'aucun ne serait vrai ».
--
-- ═══ CE QUE CETTE MIGRATION AJOUTE, ET RIEN DE PLUS ═════════════════════════
--   1. `moderators_2026` — l'habilitation, une ligne par personne, lisible par
--      son seul titulaire. AUCUNE ligne n'est insérée ici (la base a 3 comptes
--      et 0 donnée de jeu : un modérateur inventé serait une donnée fabriquée).
--      Le fondateur se nomme lui-même, en une commande, documentée dans
--      `docs/product/GRYD_REVUE_ANTITRICHE_PROCEDURE_2026_09.md`.
--   2. `am_i_moderator_2026()` — la question que l'app pose avant de peindre
--      quoi que ce soit. Aucun bouton mort : la ligne « Modération » des
--      Réglages n'existe QUE si cette fonction rend `true`.
--   3. `anticheat_reviews_pending_2026(int)` — la file, réservée aux
--      modérateurs, avec les signaux et leurs preuves chiffrées telles que le
--      lot A les a écrites.
--   4. `anticheat_review_journal_2026` — qui, quand, quoi. Une décision de
--      modération sans journal n'est pas auditable.
--   5. `resolve_anticheat_review_2026(uuid, text, text)` — la clôture, avec ses
--      effets RÉELS sur la sortie.
--   6. `runs.anticheat_cleared_2026` — le fait durable « un humain a validé
--      cette sortie », lu par `ingest_run` pour ne pas re-geler ce qu'un humain
--      vient de dégeler.
--
-- ═══ POURQUOI UN RÔLE NEUF, ALORS QUE 0138 REFUSAIT D'EN CRÉER UN ═══════════
-- 0138 (§ « PAS DE RÔLE `moderator` GLOBAL ») a refusé d'en inventer un pour la
-- modération SOCIALE, et sa raison était juste : « décider seul qui l'attribue,
-- par quelle surface, et avec quel journal » était un arbitrage produit, pas un
-- correctif. Cet arbitrage a maintenant été rendu — ADR-015 le pose comme
-- chantier n° 1, et le fondateur a tranché « fais comme tu veux ». La même
-- migration répond donc aux trois questions que 0138 laissait ouvertes :
-- l'attribution est une commande SQL nominative, la surface est l'écran
-- `/moderation`, le journal est `anticheat_review_journal_2026`.
-- UN SEUL rôle, pas deux : le jour où la modération sociale voudra une
-- habilitation centrale, `social_moderation_role_2026` (0138) ajoutera
-- `public.am_i_moderator_2026()` à sa garde — un seul endroit à changer, comme
-- son commentaire le prévoit. Ce fichier ne touche PAS 0138.
--
-- ═══ VIE PRIVÉE (§12, 0081) ═════════════════════════════════════════════════
-- Une revue dit qu'un compte a été suspecté : c'est une donnée sensible, et sa
-- RLS reste STRICTEMENT personnelle. La file ne s'ouvre donc pas par une
-- policy — elle passe par une fonction SECURITY DEFINER gardée par
-- `am_i_moderator_2026()`, exactement comme `admin_reports_queue` (0046 §8)
-- passait par `service_role`. Aucune policy n'est ajoutée sur
-- `anticheat_reviews` ni sur `anticheat_appeals` : personne n'y gagne un droit
-- de lecture large.
-- La file NOMME le joueur par son pseudo public (`user_profiles.handle`) ou, à
-- défaut, par les 8 premiers caractères de son identifiant. Le modérateur doit
-- pouvoir reconnaître un dossier récurrent ; il n'a besoin ni de l'e-mail, ni
-- des coordonnées de la trace — et le rapport du moteur n'en contient aucune.
--
-- Rollback : `drop function` des trois fonctions, `drop table`
-- `anticheat_review_journal_2026` puis `moderators_2026`, et
-- `alter table public.runs drop column anticheat_cleared_2026`. Rien d'acquis
-- n'est détruit, par construction.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. L'HABILITATION
-- ════════════════════════════════════════════════════════════════════════════
-- `auth.users` et NON `public.users` : une habilitation appartient au COMPTE
-- D'AUTHENTIFICATION, pas au profil de jeu. Un profil de jeu se purge (RGPD,
-- 0111/0136) ; tant que le compte existe, l'habilitation doit survivre à cette
-- purge ou disparaître avec lui — c'est ce que dit `on delete cascade` ici.
create table public.moderators_2026 (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now(),
  -- Pourquoi cette personne. Une habilitation sans motif écrit finit par être
  -- une habilitation dont plus personne ne sait qui l'a donnée.
  note       text check (note is null or char_length(note) <= 200)
);

comment on table public.moderators_2026 is
  'Habilitation de modération GRYD (ADR-015, chantier n° 1). Une ligne par '
  'personne. AUCUNE écriture client : l''attribution est une commande SQL '
  'nominative exécutée par le fondateur (docs/product/'
  'GRYD_REVUE_ANTITRICHE_PROCEDURE_2026_09.md). Un titulaire lit SA ligne et '
  'aucune autre : la liste des modérateurs n''est pas une donnée publique.';

alter table public.moderators_2026 enable row level security;
revoke all on public.moderators_2026 from public, anon, authenticated;
grant select on public.moderators_2026 to authenticated;
grant all on public.moderators_2026 to service_role;

-- Un titulaire voit SA ligne. Pas la liste : savoir QUI modère est une
-- information qu'un compte suspecté n'a aucune raison d'obtenir.
create policy moderators_2026_select_self on public.moderators_2026
  for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy moderators_2026_select_self on public.moderators_2026 is
  'Chacun lit SA propre habilitation, jamais celle d''un autre. Aucune policy '
  'd''écriture : nul ne se nomme modérateur depuis l''application.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. « SUIS-JE MODÉRATEUR ? »
-- ════════════════════════════════════════════════════════════════════════════
-- Rend `false` hors session au lieu de LEVER : l'app la pose sur l'écran
-- Réglages de TOUT LE MONDE, et un écran de réglages qui plante pour un joueur
-- ordinaire serait un défaut bien pire que l'absence de la ligne.
create function public.am_i_moderator_2026()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.moderators_2026 m where m.user_id = (select auth.uid())
  );
$$;

comment on function public.am_i_moderator_2026() is
  'Vrai si le compte appelant porte une habilitation de modération (0187). '
  'Rend false hors session — jamais une erreur : c''est la question que l''écran '
  'Réglages pose avant de peindre la ligne « Modération ».';

revoke all on function public.am_i_moderator_2026() from public, anon;
grant execute on function public.am_i_moderator_2026() to authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. LA FILE
-- ════════════════════════════════════════════════════════════════════════════
-- Bornes de page. Ce ne sont PAS des constantes de jeu (ADR-003) : elles ne
-- décident rien, elles taillent une lecture. Aucune règle de jeu n'apparaît
-- dans ce fichier — les seuils de l'anti-triche vivent dans le moteur pur.
create function public.anticheat_reviews_pending_2026(p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_limit integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if not public.am_i_moderator_2026() then raise exception 'forbidden'; end if;
  v_limit := least(greatest(coalesce(p_limit, 25), 1), 100);

  return coalesce((
    select jsonb_agg(dossier order by (dossier->>'openedAt'))
    from (
      select jsonb_build_object(
        'reviewId',       r.id,
        'runId',          r.run_id,
        -- Le pseudo PUBLIC, ou les 8 premiers caractères de l'identifiant. Ni
        -- e-mail, ni nom réel : un modérateur reconnaît un dossier récurrent,
        -- il n'enquête pas sur une personne.
        'player',         coalesce(p.handle, left(r.user_id::text, 8)),
        'systemDecision', r.system_decision,
        'suspicion',      r.suspicion,
        -- Les signaux TELS QUE LE LOT A LES A ÉCRITS : identifiants,
        -- disponibilité, sévérité, poids et preuves chiffrées. C'est la matière
        -- de la décision ; la tronquer ferait juger sur un résumé.
        'signals',        r.signals,
        'status',         r.status,
        'openedAt',       r.opened_at,
        -- La sortie elle-même : de quoi juger sans quitter l'écran.
        'run', jsonb_build_object(
          'startedAt',     run.started_at,
          'activity',      run.activity,
          'source',        run.source,
          'distanceM',     run.distance_m,
          'durationS',     run.duration_s,
          'avgPaceSKm',    run.avg_pace_s_km,
          'captureStatus', run.game_status_2026,
          'rulesetVersion', run.ruleset_version,
          'clearedAt',     run.anticheat_cleared_2026),
        -- L'appel du joueur s'il existe. C'est la moitié du dossier que §11.4
        -- lui promet : la lui demander puis ne pas la lire serait pire que ne
        -- pas la lui demander.
        'appeal', case when a.id is null then null else jsonb_build_object(
          'appealId',  a.id,
          'message',   a.message,
          'status',    a.status,
          'createdAt', a.created_at) end
      ) as dossier
      from public.anticheat_reviews r
      join public.runs run on run.id = r.run_id
      left join public.user_profiles p on p.user_id = r.user_id
      left join public.anticheat_appeals a on a.review_id = r.id
      where r.status <> 'closed'
      -- Le plus ancien d'abord : une file se dépile par le bas, sinon les
      -- dossiers du fond n'ont jamais leur tour.
      order by r.opened_at
      limit v_limit
    ) q
  ), '[]'::jsonb);
end $$;

comment on function public.anticheat_reviews_pending_2026(integer) is
  'La file de revue anti-triche NON close, du plus ancien au plus récent. '
  'Modérateurs uniquement (am_i_moderator_2026). Rend un tableau JSON : '
  'identifiants, pseudo public, score, signaux avec leurs preuves chiffrées '
  '(0081), la sortie, et l''appel du joueur s''il existe. Aucune coordonnée : le '
  'rapport du moteur n''en émet aucune (§12).';

revoke all on function public.anticheat_reviews_pending_2026(integer) from public, anon;
grant execute on function public.anticheat_reviews_pending_2026(integer) to authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 4. LE JOURNAL — QUI, QUAND, QUOI
-- ════════════════════════════════════════════════════════════════════════════
-- `anticheat_reviews` porte déjà `operator_id`, `closed_at`, `final_decision` et
-- `operator_note`. Ce journal n'est pas un doublon : ces colonnes décrivent
-- l'ÉTAT COURANT d'un dossier et un `update` les remplace. Le journal, lui,
-- s'ajoute et ne se modifie pas — c'est la différence entre « la revue dit
-- overturned » et « le 14/09 à 21 h, telle personne a écrit overturned ».
create table public.anticheat_review_journal_2026 (
  id           bigint generated always as identity primary key,
  review_id    uuid not null references public.anticheat_reviews (id) on delete cascade,
  -- Copié, PAS joint : le run_id doit rester lisible dans la ligne de journal
  -- même si la lecture de la revue devient impossible.
  run_id       uuid not null,
  moderator_id uuid references auth.users (id) on delete set null,
  verdict      text not null check (verdict in ('validated', 'rejected')),
  note         text check (note is null or char_length(note) <= 2000),
  decided_at   timestamptz not null default now()
);

create index anticheat_review_journal_2026_review_idx
  on public.anticheat_review_journal_2026 (review_id, decided_at desc);

comment on table public.anticheat_review_journal_2026 is
  'Journal APPEND-ONLY des décisions de modération anti-triche : qui, quand, '
  'quoi, et la note. `on delete cascade` depuis la revue : la suppression d''un '
  'compte (RGPD) emporte ses dossiers ET leur journal — la conservation ne prime '
  'pas sur l''effacement. Aucun droit client, en lecture comme en écriture.';

alter table public.anticheat_review_journal_2026 enable row level security;
revoke all on public.anticheat_review_journal_2026 from public, anon, authenticated;
grant all on public.anticheat_review_journal_2026 to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 5. LE FAIT DURABLE : « UN HUMAIN A VALIDÉ CETTE SORTIE »
-- ════════════════════════════════════════════════════════════════════════════
-- Sans cette colonne, la validation serait RÉVERSIBLE PAR ACCIDENT : un renvoi
-- du même `clientRunId` fait re-tourner `scoreRun` sur l'évidence scellée
-- (`refonte2026.ts`), qui rendrait la MÊME décision `MANUAL_REVIEW` — et
-- `stage_capture_2026` regèlerait la face que le modérateur vient de dégeler.
-- Le moteur est déterministe : c'est une garantie, et ici c'est le problème.
-- `ingest_run` lit donc ce fait AVANT de redemander une vérification.
alter table public.runs add column if not exists anticheat_cleared_2026 timestamptz;

comment on column public.runs.anticheat_cleared_2026 is
  'Non nul : un modérateur a jugé cette sortie honnête (0187, verdict '
  '« validated »). Lu par ingest_run pour ne pas redemander une vérification '
  'déjà rendue. NULL = aucune décision humaine, OU décision « rejected » — la '
  'décision elle-même vit dans anticheat_reviews.final_decision, jamais ici.';

-- ════════════════════════════════════════════════════════════════════════════
-- 6. LA CLÔTURE
-- ════════════════════════════════════════════════════════════════════════════
--
-- ─── CE QU'UNE VALIDATION FAIT RÉELLEMENT, ET CE QU'ELLE NE FAIT PAS ───────
-- La sortie SPORTIVE n'a jamais été perdue : depuis la refonte, `runs.status`
-- vaut `'valid'` dès l'enregistrement (§5.2 interdit de présenter une sortie
-- sans terrain comme un échec). Ce qu'une vérification gèle, ce sont DEUX
-- choses, et ce sont exactement celles que cette fonction dégèle :
--
--   · LE TERRAIN. Les faces de la sortie sont `pending` avec le motif
--     `verification_required` (0155 §4). Une validation les RÉADMET ; un refus
--     en fait un refus DATÉ au lieu de laisser l'expiration s'en charger.
--   · LES XP. `progress_activity_2026.evidence.eligibility` vaut `'review'`, et
--     `computeProgressLedger2026` IGNORE une activité qui n'est pas `eligible`
--     (progression2026.ts). Une validation corrige cette évidence.
--
-- ─── LA RÉADMISSION D'UNE FACE, ET POURQUOI ELLE NE REJOUE PAS TOUT ────────
-- `capture_admission_2026` (0155 §4) a quatre portes, dans cet ordre : dérive
-- d'horloge, fenêtre de réception, VÉRIFICATION, origine confirmée.
--   · Les deux premières portes ont DÉJÀ été franchies — sinon la face serait
--     `rejected` et non `pending` — et elles se jugent sur `closed_at` /
--     `received_at`, FIGÉS avec la face. Les rejouer rendrait la même réponse :
--     c'est pourquoi cette fonction n'a besoin d'AUCUNE constante de jeu.
--   · La troisième est celle que le modérateur vient de rendre.
--   · La quatrième est OMBRAGÉE par la troisième : une face
--     `verification_required` peut cacher une origine non confirmée. Cette
--     fonction ne rejoue PAS `sourceClockVerdict2026` — elle vit dans l'Edge et
--     lit la session d'enregistrement point par point. Elle exige la seule
--     condition NÉCESSAIRE qu'elle sache lire : la sortie porte une session
--     d'enregistrement. Sans session, `sourceClockVerdict2026` refuse TOUJOURS
--     (`no_recording_session`) — la face reste donc `pending` avec CE motif-là,
--     qui est le vrai, et suivra le sort des autres attentes (expiration, 0156).
--
-- ─── LA FENÊTRE DE 24 h, DITE PLUTÔT QUE CACHÉE ────────────────────────────
-- `resolve_pending_captures_2026` (0156) rejette toute face `pending` dont la
-- fermeture date de plus de `captureReceiptMaxAgeHours` (24 h), à CHAQUE tick de
-- publication. Une revue tranchée après ce délai trouve donc une face déjà
-- `rejected` : la validation reste vraie — la sortie est honnête, les XP
-- reviennent, le dossier est clos — mais LE TERRAIN NE REVIENT PAS. Ce fichier
-- ne ressuscite pas une face expirée : réécrire la carte plusieurs jours après
-- coup est précisément ce que §5.5 refuse. Le compte des faces expirées est
-- RENDU (`captureExpired`) pour que l'écran de modération et la procédure
-- puissent le dire, au lieu de laisser croire à une réhabilitation complète.
--
-- ─── CE QUE CETTE FONCTION NE TOUCHE PAS, EXPRÈS ───────────────────────────
--   · `runs.status`. Il vaut `'valid'` dans le pipeline actif : il n'y a rien à
--     y réparer. Sur une sortie du pipeline HISTORIQUE (`ruleset_version <>
--     '2026.1'`), il vaut `'flagged'` — et le repasser à `'valid'` afficherait
--     une course « valide » créditée de zéro point, zéro XP et zéro hex, parce
--     que le pipeline qui aurait crédité tout cela ne tourne plus (ADR-015).
--     Ce serait échanger un mensonge contre un autre. Le verdict reste lisible
--     là où il est vrai : `anticheat_reviews.final_decision`.
--   · Le classement, les badges, la série. Ils DÉRIVENT des faits ci-dessus ;
--     aucune ligne de score n'est écrite à la main ici.
create function public.resolve_anticheat_review_2026(
  p_review_id uuid, p_verdict text, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid        uuid := (select auth.uid());
  v_review     public.anticheat_reviews;
  v_run        public.runs;
  v_note       text;
  v_final      text;
  v_event      public.capture_events_2026;
  v_readmitted integer := 0;
  v_unconfirmed integer := 0;
  v_refused    integer := 0;
  v_expired    integer := 0;
  v_appeal     integer := 0;
  v_evidence   jsonb;
  v_xp         boolean := false;
  v_source_ok  boolean;
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not public.am_i_moderator_2026() then raise exception 'forbidden'; end if;
  if p_verdict is null or p_verdict not in ('validated', 'rejected') then
    raise exception 'invalid_verdict';
  end if;
  v_note := nullif(btrim(coalesce(p_note, '')), '');
  if v_note is not null and char_length(v_note) > 2000 then raise exception 'note_too_long'; end if;

  -- `for update` : deux modérateurs sur la même file ne peuvent pas trancher le
  -- même dossier en même temps. Le second attend, puis lit `status = 'closed'`
  -- et ressort par l'idempotence — jamais deux décisions du même fait.
  select * into v_review from public.anticheat_reviews where id = p_review_id for update;
  if not found then raise exception 'review_not_found'; end if;

  -- JAMAIS SA PROPRE SORTIE. Ce refus est le plus important du fichier : sans
  -- lui, l'habilitation de modération serait une machine à se rendre justice,
  -- et l'anti-triche protégerait tout le monde sauf contre celui qui l'opère.
  if v_review.user_id = v_uid then raise exception 'own_run_forbidden'; end if;

  -- IDEMPOTENCE. Un double tap, un renvoi réseau, deux modérateurs : le dossier
  -- rend sa décision DÉJÀ prise, sans la rejouer et sans lever. `alreadyClosed`
  -- le dit à l'écran, qui n'a donc pas à deviner s'il a réussi.
  if v_review.status = 'closed' then
    return jsonb_build_object(
      'reviewId', v_review.id, 'alreadyClosed', true,
      'finalDecision', v_review.final_decision, 'closedAt', v_review.closed_at,
      'captureReadmitted', 0, 'captureUnconfirmed', 0, 'captureRefused', 0,
      'captureExpired', 0, 'appealClosed', false, 'xpUnblocked', false);
  end if;

  -- L'opérateur doit exister côté jeu : `anticheat_reviews.operator_id`
  -- référence `public.users` (0081). On le DIT plutôt que de laisser une
  -- violation de clé étrangère raconter la même chose en moins clair.
  if not exists (select 1 from public.users u where u.id = v_uid) then
    raise exception 'moderator_profile_missing';
  end if;

  select * into v_run from public.runs where id = v_review.run_id for update;

  v_final := case p_verdict when 'validated' then 'overturned' else 'upheld' end;

  update public.anticheat_reviews
     set status = 'closed', closed_at = now(), final_decision = v_final,
         operator_id = v_uid, operator_note = v_note
   where id = v_review.id;

  -- L'appel du joueur suit la décision de la revue. Il ne peut PAS diverger :
  -- un appel « encore en cours » sur une revue close serait un dossier qui
  -- attend une réponse déjà donnée.
  update public.anticheat_appeals
     set status = 'closed', decided_at = now(), decision = v_final,
         operator_id = v_uid, operator_note = v_note
   where review_id = v_review.id and status <> 'closed';
  get diagnostics v_appeal = row_count;

  insert into public.anticheat_review_journal_2026(review_id, run_id, moderator_id, verdict, note)
  values (v_review.id, v_review.run_id, v_uid, p_verdict, v_note);

  -- Les faces que l'EXPIRATION a déjà emportées avant que quiconque tranche.
  -- Comptées AVANT toute écriture : c'est un constat, pas un effet.
  select count(*)::integer into v_expired
    from public.capture_events_2026 e
   where e.run_id = v_review.run_id and e.status = 'rejected'
     and e.reason = 'verification_required';

  if p_verdict = 'validated' then
    update public.runs set anticheat_cleared_2026 = now() where id = v_review.run_id;

    -- La condition NÉCESSAIRE que ce fichier sait lire (voir le docblock).
    v_source_ok := v_run.recording_session_id_2026 is not null;

    -- L'état d'arrivée. `scheduled` est EXACTEMENT ce que
    -- `capture_admission_2026` rend quand ses quatre portes passent ; les deux
    -- portes d'horloge ayant déjà été franchies sur des bornes FIGÉES (voir le
    -- docblock), les rejouer avec des paramètres reconstitués n'ajouterait
    -- aucune vérité et laisserait croire à un contrôle qui n'en serait pas un.
    -- Quand l'origine n'est pas confirmable, la FAMILLE du motif est décidée
    -- par 0155 et non par ce fichier : une seule définition de « ce motif
    -- est-il résoluble ou terminal ».
    for v_event in
      select * from public.capture_events_2026
       where run_id = v_review.run_id and status = 'pending'
         and reason = 'verification_required'
       for update
    loop
      if v_source_ok then
        update public.capture_events_2026 set status = 'scheduled', reason = null
         where id = v_event.id;
        v_readmitted := v_readmitted + 1;
      else
        update public.capture_events_2026
           set status = public.capture_state_for_reason_2026('no_recording_session'),
               reason = 'no_recording_session'
         where id = v_event.id;
        v_unconfirmed := v_unconfirmed + 1;
      end if;
    end loop;

    -- LES XP. L'évidence sportive porte `eligibility = 'review'`, et le grand
    -- livre IGNORE une activité qui n'est pas `eligible`. On la corrige par la
    -- fonction qui l'écrit déjà (0119) plutôt qu'en touchant la table : elle
    -- verrouille le compte, incrémente sa version, et c'est cette version qui
    -- fait qu'un recalcul aura lieu.
    -- ⚠️ LE GRAND LIVRE N'EST PAS RECALCULÉ ICI, et c'est dit plutôt que caché :
    -- `computeProgressLedger2026` est du TypeScript PUR (packages/shared), sans
    -- équivalent SQL. Les XP reviennent au prochain passage de
    -- `recomputeProgression2026`, c'est-à-dire à la prochaine sortie de ce
    -- joueur. En réécrire une version en PL/pgSQL donnerait deux calculs d'XP
    -- qui divergeraient au premier changement de règle.
    if v_run.ruleset_version = '2026.1' then
      select evidence into v_evidence from public.progress_activity_2026 where run_id = v_review.run_id;
      if v_evidence is not null and v_evidence->>'eligibility' = 'review' then
        perform public.record_progress_evidence_2026(
          v_review.run_id,
          jsonb_set(
            jsonb_set(v_evidence, '{eligibility}', '"eligible"'),
            '{revision}', to_jsonb(coalesce((v_evidence->>'revision')::integer, 1) + 1)));
        v_xp := true;
      end if;
    end if;
  else
    -- REFUS. La face gelée par CETTE vérification devient un refus daté, avec
    -- SON motif conservé — même choix qu'à l'expiration (0156) : c'est le
    -- STATUT qui porte la finalité, la raison continue de porter la cause.
    update public.capture_events_2026
       set status = 'rejected'
     where run_id = v_review.run_id and status = 'pending'
       and reason = 'verification_required';
    get diagnostics v_refused = row_count;
  end if;

  -- Le statut TERRITORIAL de la sortie se DÉRIVE de ses faces, en un seul
  -- endroit (0155 §5). On ne l'écrit jamais à la main.
  update public.runs r
     set game_status_2026 = public.run_capture_status_2026(v_review.run_id)
   where r.id = v_review.run_id;

  return jsonb_build_object(
    'reviewId', v_review.id, 'alreadyClosed', false,
    'finalDecision', v_final, 'closedAt', now(),
    'captureReadmitted', v_readmitted,
    'captureUnconfirmed', v_unconfirmed,
    'captureRefused', v_refused,
    'captureExpired', v_expired,
    'appealClosed', v_appeal > 0,
    'xpUnblocked', v_xp);
end $$;

comment on function public.resolve_anticheat_review_2026(uuid, text, text) is
  'Clôt une revue anti-triche (ADR-015). Modérateurs uniquement, JAMAIS sur sa '
  'propre sortie, idempotente, journalisée. « validated » : la sortie est '
  'marquée honnête (runs.anticheat_cleared_2026), ses faces encore en attente de '
  'vérification sont réadmises, et son évidence sportive redevient éligible aux '
  'XP (recalculées à la prochaine sortie du joueur). « rejected » : ces mêmes '
  'faces deviennent un refus daté, motif conservé. Une face déjà expirée (24 h, '
  '0156) n''est PAS ressuscitée — le compte est rendu dans captureExpired.';

revoke all on function public.resolve_anticheat_review_2026(uuid, text, text) from public, anon;
grant execute on function public.resolve_anticheat_review_2026(uuid, text, text) to authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- LA PREUVE DE CETTE MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/anticheat_operator_2026.pglite.test.mjs` rejoue ce fichier sur
-- un Postgres réel (PGlite, WASM) : étape 0 (avant 0187, AUCUNE fonction ne
-- clôt une revue), non-modérateur refusé, modérateur qui clôt, idempotence, sa
-- propre sortie refusée, réadmission d'une face gelée, refus qui date la face,
-- face expirée non ressuscitée, évidence d'XP corrigée, journal écrit, et
-- `has_function_privilege('anon', …)` faux partout.
--
-- CE QU'IL NE PROUVE PAS : PGlite tourne en SUPERUTILISATEUR — les policies ne
-- s'y appliquent pas. Ce qui est vérifié, c'est que la policy EXISTE, ce que son
-- expression NOMME, et l'état exact du catalogue de privilèges. Que la liste des
-- modérateurs soit RÉELLEMENT invisible aux autres ne se prouve que sur un vrai
-- Supabase (`npm run verify:rls`), même limite qu'en 0074/0078/0081.
--
-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 14/09/2026
-- ════════════════════════════════════════════════════════════════════════════
--  1. AUCUNE NOTIFICATION. §11.4 demande que la décision parvienne au joueur.
--     `can_notify_2026` / `claim_notification_2026` (0141) DÉCIDENT d'un envoi,
--     mais AUCUN code du dépôt ne les appelle : il n'existe aujourd'hui aucun
--     émetteur branché sur ce moteur. Écrire une règle « vérification terminée »
--     dans `NOTIFICATION_RULES_2026` produirait une promesse sans canal — la
--     faute exacte que 0081 avait refusé de commettre. Le joueur lit donc la
--     décision là où il est déjà allé la chercher : l'écran d'appel (E28), qui
--     affiche `final_decision` dès qu'elle existe.
--  2. AUCUN DÉLAI ANNONCÉ, et ce n'est plus par absence d'opérateur : c'est
--     parce qu'un opérateur seul, non astreint, ne tient aucune échéance. La
--     seule échéance RÉELLE du système est la fenêtre de 24 h de 0156, et elle
--     n'appartient pas au modérateur — elle appartient à l'horloge. La procédure
--     l'écrit ; la copie de E28 continue de ne rien promettre.
--  3. UNE FACE EXPIRÉE NE REVIENT PAS. Si la revue mérite d'être tranchée plus
--     vite que 24 h, c'est un arbitrage produit (allonger la fenêtre pour les
--     seules faces `verification_required`) : il se décidera avec des dossiers
--     réels, pas ici.
--  4. AUCUNE HABILITATION N'EST CRÉÉE. La base a 3 comptes et 0 donnée de jeu.
--     La commande de nomination est dans la procédure, avec l'e-mail du
--     fondateur pour seule variable.
