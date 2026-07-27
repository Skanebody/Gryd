-- 0081_anticheat_review.sql
-- GRYD — LA REVUE ANTI-TRICHE EXISTE ENFIN, ET AVEC ELLE LE DROIT D'APPEL
-- (spec produit §11.3 « décisions », §11.4 « appel »). LOT 9.
--
-- ═══ CE QUE CETTE MIGRATION RÉPARE ══════════════════════════════════════════
-- Jusqu'ici, `runs.status = 'flagged'` (0002_schema.sql:105) était un état
-- TERMINAL : aucune table de revue, aucune file, aucun opérateur, aucun endpoint
-- d'appel, aucune notification de décision. Une course y entrait pour toujours.
-- Et l'écran de résultat, lui, annonçait « GRYD Verify examine cette course » —
-- une revue qui n'existait nulle part. La copie a dû être retirée (le docblock
-- de `flaggedWhy`, apps/mobile/src/i18n/catalog/result.ts, interdit d'en
-- reparler tant que la revue n'existe pas). Ces deux tables sont ce qui manquait
-- pour que la phrase puisse un jour redevenir vraie.
--
-- ═══ CE QU'ELLE FAIT, ET CE QU'ELLE NE FAIT PAS ═════════════════════════════
-- FAIT :
--   · `anticheat_reviews` — une course NON CRÉDITÉE et la raison chiffrée qui
--     l'a décidée (décision système, score, signaux avec leurs preuves), plus
--     l'état de son traitement et sa décision finale ;
--   · `anticheat_appeals` — la contestation du joueur : un appel par revue, sur
--     SA course, avec son message, son statut et sa décision ;
--   · la RLS qui fait qu'un joueur voit SES revues et SES appels, jamais ceux
--     d'un autre, et qu'il ne peut écrire QUE la création d'un appel — et
--     seulement les trois colonnes qui lui appartiennent.
-- NE FAIT PAS :
--   · aucune écriture. `ingest_run` n'appelle pas encore
--     `packages/engine/src/anticheat.ts` (câblage hors périmètre du lot 9) :
--     AUCUNE ligne n'entre dans ces tables aujourd'hui. Elles sont VIDES, et une
--     table vide ne ment à personne ;
--   · aucun opérateur. Rien ne dépile la file. C'est un fait, pas un oubli : il
--     est écrit ici ET dans l'écran E28 (`apps/mobile/app/appel.tsx`), qui ne
--     promet donc AUCUN délai. Promettre « une personne examine sous 48 h »
--     serait refaire, un cran plus loin, exactement la faute qu'on répare ;
--   · aucune notification. §11.4 demande que la décision finale soit portée à la
--     connaissance du joueur : le champ existe, le canal non (inscrit en suspens).
-- Rollback = `drop table public.anticheat_appeals, public.anticheat_reviews` :
-- rien d'acquis n'est détruit, par construction.
--
-- ═══ LA BASE STOCKE, LE MOTEUR DÉCIDE ═══════════════════════════════════════
-- Même partage qu'en 0074/0078. AUCUN seuil de décision n'apparaît dans ce
-- fichier : ni `ANTICHEAT_REVIEW_AT`, ni `ANTICHEAT_REJECT_AT`, ni un poids de
-- signal. `system_decision` et `suspicion` sont des RÉSULTATS déjà calculés par
-- `scoreRun` (moteur pur, temps injecté) ; les CHECK d'ici ne vérifient que des
-- formes et des cohérences internes à une ligne — jamais une règle de jeu.
--
-- ═══ VIE PRIVÉE (§12) ═══════════════════════════════════════════════════════
-- `signals` porte les PREUVES CHIFFRÉES d'une décision (parts de durée, nombres
-- de sauts, écarts d'allure), jamais des coordonnées : le rapport du moteur
-- n'en émet aucune, précisément parce qu'il voyage. Une revue reste malgré tout
-- une donnée sensible — elle dit qu'un compte a été suspecté — d'où une RLS
-- STRICTEMENT personnelle, sans exception « membres du crew » comme en 0078.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA REVUE
-- ════════════════════════════════════════════════════════════════════════════
create table public.anticheat_reviews (
  id uuid primary key default gen_random_uuid(),

  -- LA COURSE JUGÉE. `unique` : une course produit AU PLUS une revue — sans
  -- cette contrainte, un retry d'ingestion (idempotent côté `runs` grâce à
  -- `runs_user_client_run_unique`) pourrait empiler deux revues du même fait, et
  -- la file en montrerait deux. `on delete cascade` : une revue sans course ne
  -- s'interprète pas.
  run_id uuid not null unique references public.runs (id) on delete cascade,

  -- LE JOUEUR. Dénormalisé depuis `runs.user_id` EXPRÈS : la policy RLS le lit à
  -- chaque ligne, et la faire passer par une jointure sur `runs` (dont la RLS
  -- est elle-même restrictive) rendrait la politique dépendante d'une seconde
  -- politique. Ici, la règle « je vois mes revues » tient en une comparaison.
  user_id uuid not null references public.users (id) on delete cascade,

  -- LA DÉCISION SYSTÈME (§11.3). Deux valeurs seulement, et c'est structurel :
  -- une ligne de revue existe EXACTEMENT quand la capture n'a pas été créditée.
  -- `PASS` et `PASS_WITH_EXCLUSIONS` créditent — elles n'ont rien à faire ici, et
  -- les autoriser laisserait croire qu'une sortie créditée est « en revue ».
  system_decision text not null
    check (system_decision in ('MANUAL_REVIEW', 'REJECT')),

  -- Le score pondéré 0-100 rendu par le moteur, et les signaux qui l'ont produit
  -- (tableau `AntiCheatSignal[]` sérialisé : id, disponibilité, sévérité, poids,
  -- preuves chiffrées, et la RAISON quand un signal était indisponible).
  suspicion smallint not null check (suspicion between 0 and 100),
  signals jsonb not null default '[]'::jsonb check (jsonb_typeof(signals) = 'array'),

  -- L'ÉTAT DU TRAITEMENT. `open` est le défaut : personne n'a encore regardé.
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'closed')),

  opened_at timestamptz not null default now(),
  closed_at timestamptz,

  -- LA DÉCISION FINALE (§11.4). Nulle tant que la revue n'est pas close.
  -- `overturned` = la course est réhabilitée ; `partially_overturned` = seule
  -- une partie l'est (§11.3 PASS_WITH_EXCLUSIONS) ; `upheld` = la décision
  -- système tient.
  final_decision text
    check (final_decision in ('upheld', 'overturned', 'partially_overturned')),

  -- L'OPÉRATEUR qui a tranché. `on delete set null` : un compte d'opérateur
  -- supprimé ne doit pas emporter l'historique des décisions rendues.
  operator_id uuid references public.users (id) on delete set null,
  operator_note text,

  updated_at timestamptz not null default now(),

  -- Une revue est close SI ET SEULEMENT SI elle porte sa date de clôture.
  constraint anticheat_reviews_closed_coherent
    check ((status = 'closed') = (closed_at is not null)),
  -- Aucune décision finale sur une revue encore ouverte : ce serait une
  -- conclusion sans dossier.
  constraint anticheat_reviews_decision_when_closed
    check (final_decision is null or status = 'closed'),
  -- Une revue close DIT ce qu'elle a décidé — sinon la clôture est muette.
  constraint anticheat_reviews_closed_has_decision
    check (status <> 'closed' or final_decision is not null),
  constraint anticheat_reviews_closed_after_opened
    check (closed_at is null or closed_at >= opened_at)
);

comment on table public.anticheat_reviews is
  'Spec §11.3 — une course NON créditée par l''anti-triche, avec le score et les signaux qui l''ont décidé. VIDE tant qu''ingest_run n''appelle pas packages/engine/src/anticheat.ts. Aucun opérateur ne dépile cette file à ce jour : aucune surface ne doit promettre de délai de traitement.';
comment on column public.anticheat_reviews.signals is
  'Rapport du moteur (AntiCheatSignal[]) : sévérités, poids, PREUVES CHIFFRÉES, et la raison des signaux indisponibles. Aucune coordonnée — le rapport voyage (§12).';
comment on column public.anticheat_reviews.system_decision is
  'MANUAL_REVIEW ou REJECT uniquement : une ligne existe exactement quand la capture n''a PAS été créditée.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. L'APPEL (§11.4)
-- ════════════════════════════════════════════════════════════════════════════
-- Les six éléments demandés par §11.4 et OÙ ils vivent :
--   · motif             → `anticheat_reviews.system_decision` + `.signals` ;
--   · données concernées→ `anticheat_reviews.run_id` + `.signals` (preuves) ;
--   · bouton d'appel    → E28, `apps/mobile/app/appel.tsx` → insert ici ;
--   · délai             → AUCUN. Il n'y a pas de colonne d'échéance, parce
--                         qu'aucun engagement de traitement n'est tenu par du
--                         code. Une colonne `sla_due_at` remplie par défaut
--                         serait une promesse écrite avant que quiconque la
--                         tienne — la faute que CLAUDE.md nomme explicitement ;
--   · statut            → `anticheat_appeals.status` ;
--   · décision finale   → `anticheat_appeals.decision` (+ celle de la revue).
create table public.anticheat_appeals (
  id uuid primary key default gen_random_uuid(),

  -- UN APPEL PAR REVUE (`unique`). Ce n'est pas une restriction de confort :
  -- sans elle, un tap répété sur le bouton d'appel créerait dix lignes du même
  -- recours, et la file compterait dix dossiers là où il y en a un.
  review_id uuid not null unique
    references public.anticheat_reviews (id) on delete cascade,

  -- Redondant avec `anticheat_reviews.user_id` — et nécessaire : la policy
  -- d'INSERT doit pouvoir vérifier l'appartenance SANS dépendre d'une lecture
  -- autorisée sur la revue. La cohérence des deux est garantie par le `with
  -- check` de la policy (qui exige que la revue visée soit celle du même joueur).
  user_id uuid not null references public.users (id) on delete cascade,

  -- Le mot du joueur. Facultatif : exiger une justification pour ouvrir un
  -- recours serait une friction posée du mauvais côté. Borné pour ne pas faire
  -- de cette colonne un dépotoir.
  message text check (message is null or char_length(message) <= 2000),

  status text not null default 'received'
    check (status in ('received', 'in_progress', 'closed')),

  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decision text
    check (decision in ('upheld', 'overturned', 'partially_overturned')),
  operator_id uuid references public.users (id) on delete set null,
  operator_note text,
  updated_at timestamptz not null default now(),

  constraint anticheat_appeals_closed_coherent
    check ((status = 'closed') = (decided_at is not null)),
  constraint anticheat_appeals_decision_when_closed
    check (decision is null or status = 'closed'),
  constraint anticheat_appeals_closed_has_decision
    check (status <> 'closed' or decision is not null),
  constraint anticheat_appeals_decided_after_created
    check (decided_at is null or decided_at >= created_at)
);

comment on table public.anticheat_appeals is
  'Spec §11.4 — le recours d''un joueur contre une revue anti-triche. Un appel par revue. AUCUNE colonne d''échéance : aucun délai n''est promis, parce qu''aucun code ne le tient.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. INDEX — LA FILE SE LIT PAR LE STATUT
-- ════════════════════════════════════════════════════════════════════════════
-- PARTIELS sur « pas encore close » : à terme les dossiers clos sont la
-- majorité, et ils n'ont aucune raison d'alourdir le balayage de la file. Le
-- prédicat reste immuable (un `where opened_at < now()` serait refusé par
-- Postgres, et faux la seconde d'après).
create index anticheat_reviews_open_idx
  on public.anticheat_reviews (status, opened_at)
  where status <> 'closed';

comment on index public.anticheat_reviews_open_idx is
  'La file de revue se lit par le statut, du plus ancien au plus récent. Partiel : les dossiers clos n''y entrent jamais.';

create index anticheat_appeals_open_idx
  on public.anticheat_appeals (status, created_at)
  where status <> 'closed';

comment on index public.anticheat_appeals_open_idx is
  'La file d''appel, même forme que celle des revues. Partiel sur les dossiers non clos.';

-- La lecture du JOUEUR (écran E28) : « mes revues, les plus récentes d'abord ».
-- Non partiel : un joueur doit pouvoir relire une revue close, c'est justement
-- là que se trouve sa décision finale.
create index anticheat_reviews_user_idx
  on public.anticheat_reviews (user_id, opened_at desc);

create index anticheat_appeals_user_idx
  on public.anticheat_appeals (user_id, created_at desc);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. RLS — UNE SUSPICION EST STRICTEMENT PERSONNELLE
-- ════════════════════════════════════════════════════════════════════════════
-- Patron de 0003/0074/0078, avec UNE différence assumée : pas d'exception
-- « membres du crew ». Une contestation de territoire concerne deux camps ; une
-- revue anti-triche ne concerne QUE la personne visée. Qu'un coéquipier puisse
-- lire « ce compte a été suspecté » serait une fuite, pas une transparence.
--
-- `(select auth.uid())` plutôt que `auth.uid()` : initplan évalué une fois par
-- requête au lieu d'une fois par ligne (même raison qu'en 0003:11, 0074, 0078).

alter table public.anticheat_reviews enable row level security;
revoke all on public.anticheat_reviews from anon, authenticated;
grant select on public.anticheat_reviews to authenticated;

create policy anticheat_reviews_select_own on public.anticheat_reviews
  for select to authenticated
  using (user_id = (select auth.uid()));

comment on policy anticheat_reviews_select_own on public.anticheat_reviews is
  'Un joueur lit SES revues, jamais celles d''un autre — et jamais celles de son crew : une suspicion ne se partage pas. Aucune policy d''écriture : seules les Edge Functions (service_role) écrivent.';

alter table public.anticheat_appeals enable row level security;
revoke all on public.anticheat_appeals from anon, authenticated;
grant select on public.anticheat_appeals to authenticated;

-- ÉCRITURE CLIENT — LA SEULE DU DÉPÔT SUR CE DOMAINE, ET ELLE EST BORNÉE DEUX
-- FOIS. La policy dit QUELLES LIGNES ; les privilèges de COLONNE disent QUELS
-- CHAMPS. Sans le second, une policy `with check (user_id = auth.uid())`
-- laisserait un joueur poster son propre appel avec `status = 'closed'` et
-- `decision = 'overturned'` : il se rendrait justice tout seul. Les trois
-- colonnes accordées sont exactement celles qui lui appartiennent ; tout le
-- reste part des DEFAULT (`status = 'received'`, `created_at = now()`).
grant insert (review_id, user_id, message) on public.anticheat_appeals to authenticated;

create policy anticheat_appeals_select_own on public.anticheat_appeals
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy anticheat_appeals_insert_own on public.anticheat_appeals
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    -- ET la revue visée doit être la SIENNE : sans ce test, un joueur pourrait
    -- ouvrir un appel signé de son nom sur la revue de quelqu'un d'autre — donc
    -- écrire dans le dossier d'un tiers, et découvrir par l'erreur d'unicité
    -- qu'une revue existe pour lui.
    and exists (
      select 1
      from public.anticheat_reviews r
      where r.id = anticheat_appeals.review_id
        and r.user_id = (select auth.uid())
    )
  );

comment on policy anticheat_appeals_insert_own on public.anticheat_appeals is
  'Un joueur ouvre un appel sur SA propre revue, et seulement là. Complétée par des privilèges de COLONNE (review_id, user_id, message) : il ne peut écrire ni le statut, ni la décision, ni la note d''opérateur.';

-- AUCUNE policy UPDATE ni DELETE, volontairement : un appel déposé ne se
-- modifie pas et ne s'efface pas côté client. Le retrait d'un recours, s'il
-- devient nécessaire, sera une action serveur explicite — pas un `delete` qui
-- ferait disparaître la trace d'une décision.

-- ════════════════════════════════════════════════════════════════════════════
-- 5. `updated_at` NE MENT PAS
-- ════════════════════════════════════════════════════════════════════════════
-- On RÉUTILISE `public.territories_touch_updated_at()` (0074) : elle ne
-- référence aucune colonne propre à `territories` (`new.updated_at := now()`),
-- et deux fonctions identiques sont deux fonctions qui finissent par diverger.
-- Son nom garde le préfixe de sa migration d'origine — la renommer casserait les
-- triggers de 0074 et 0078 pour une question de cosmétique.
create trigger anticheat_reviews_touch_updated_at_trg
  before update on public.anticheat_reviews
  for each row
  execute function public.territories_touch_updated_at();

create trigger anticheat_appeals_touch_updated_at_trg
  before update on public.anticheat_appeals
  for each row
  execute function public.territories_touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- LA PREUVE DE CETTE MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/anticheat_review.pglite.test.mjs` exécute le VRAI SQL de ce
-- fichier sur un Postgres réel (PGlite, WASM), par-dessus la lignée COMPLÈTE des
-- migrations : refus de chaque CHECK (décision système inconnue, `PASS` refusé,
-- score hors [0, 100], clôture sans date, décision sans clôture, clôture sans
-- décision, date de clôture antérieure à l'ouverture, message trop long),
-- acceptation des bornes 0 et 100, unicité de la revue par course, unicité de
-- l'appel par revue, forme des index, RLS activée, texte des policies,
-- privilèges de COLONNE de l'insert client (le point le plus facile à casser
-- sans s'en apercevoir), cascades, et triggers `updated_at`.
--
-- CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire : l'EFFET RÉEL DE LA
-- RLS. PGlite tourne en SUPERUTILISATEUR — les policies ne s'y appliquent pas et
-- `auth.uid()` y est un bouchon qui rend NULL. Ce qui est vérifié, c'est que les
-- policies EXISTENT, ce que leur expression NOMME, et l'état exact du catalogue
-- de privilèges. Qu'un tiers soit RÉELLEMENT aveugle ne pourra être prouvé que
-- sur un vrai Supabase (même limite qu'en 0074/0078/0079).
--
-- POUR LE REJOUER :
--   mkdir -p /tmp/pglite && cd /tmp/pglite
--   echo '{"name":"pglite-scratch","private":true}' > package.json
--   npm i --ignore-scripts @electric-sql/pglite
--   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
--     node supabase/tests/anticheat_review.pglite.test.mjs

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 27/07/2026
-- ════════════════════════════════════════════════════════════════════════════
--  1. AUCUN ÉCRIVAIN. `ingest_run` n'appelle pas `scoreRun` : ces deux tables
--     restent vides. Tant que ce câblage n'existe pas, aucune surface ne doit
--     dire qu'une course « est en revue » — elle ne l'est pas.
--  2. AUCUN OPÉRATEUR. Rien ni personne ne dépile `status = 'open'`. Le champ
--     `operator_id` attend une notion d'opérateur qui n'existe pas encore dans
--     le schéma (aucun rôle, aucune table d'habilitation) : c'est aujourd'hui un
--     `users.id` par convention, ce qui est une convention, pas une garantie.
--  3. AUCUNE NOTIFICATION. §11.4 demande que la décision finale parvienne au
--     joueur. Le champ existe, le canal non — E28 se lit donc à la demande, et
--     ne prétend pas prévenir.
--  4. AUCUN DÉLAI, nulle part : ni colonne, ni défaut, ni copie. C'est délibéré
--     (voir §2 ci-dessus) et cela doit le rester tant que personne ne traite la
--     file.
--  5. `runs.status` N'EST PAS TOUCHÉ. `flagged` reste ce qu'il est ; aucune
--     valeur n'est ajoutée à sa contrainte, aucune ligne n'est migrée. Relier
--     l'état d'une course à l'issue de sa revue est le travail du lot de câblage.
--  6. PURGE / RGPD. Ces lignes suivent la course (`on delete cascade`) et le
--     compte. Aucune durée de conservation PROPRE n'est définie pour une revue
--     close — à trancher avec la politique de rétention (§12), pas ici.
