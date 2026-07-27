-- 0078_territory_contests.sql
-- GRYD — LE VOL CESSE D'ÊTRE INSTANTANÉ (spec §9, §19.3). LOT 3, ÉTAPE 1.
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET CE QU'ELLE NE FAIT PAS ═════════════════
-- FAIT   : crée `public.territory_contests` — la trace d'une contestation :
--          qui attaque, quel territoire, avec quel recouvrement, depuis quand,
--          jusqu'à quand, et comment elle s'est terminée. Avec la garantie
--          structurelle qui compte le plus ici : UNE SEULE contestation ACTIVE
--          par territoire à la fois.
-- NE FAIT PAS : aucune écriture, aucun déclencheur de contestation, aucun cron
--          d'échéance, aucun transfert. `claim_hexes` (0070:610) CONTINUE de
--          faire `on conflict do update set owner_user_id = excluded.owner_user_id` :
--          EN PRODUCTION, LE VOL RESTE INSTANTANÉ. Cette table est vide, et une
--          table vide ne ment à personne. Le câblage (ingest_run écrivain de
--          contestation, cron d'échéance, bascule de `claim_hexes`) est un lot
--          suivant — le dire ici plutôt que laisser croire que poser le schéma
--          a changé le jeu.
-- Rollback = `drop table public.territory_contests` : rien d'acquis n'est
-- détruit, par construction.
--
-- ═══ LA DÉCISION DE FOND : ON N'EMPILE PAS LES DEUX MODÈLES ═════════════════
-- Le dépôt protège déjà le territoire autrement (AMENDEMENT-23 §D) : fraîcheur
-- 6 h, lock 24 h, bouclier 48 h, nouveau joueur 14 j — quatre garde-fous qui
-- INTERDISENT le vol. Superposer « involable 48 h » ET « 18 h de contestation »
-- donnerait un territoire imprenable 66 h : injouable. La spec l'emporte
-- (AUDIT_GRYD.md §3.2), et les quatre protections se RÉEXPRIMENT en niveaux de
-- fortification. Le tableau de correspondance, protection par protection, est
-- écrit UNE fois et à un seul endroit — le docblock de
-- `packages/engine/src/contest.ts`. Il n'est pas recopié ici : deux copies d'une
-- décision, c'est une copie qui dérive.
--
-- ═══ LA BASE STOCKE, LE MOTEUR DÉCIDE ═══════════════════════════════════════
-- Même partage qu'en 0074. Aucun seuil de jeu n'apparaît dans ce fichier : ni
-- les 60 % de CONTEST_INTERSECTION_THRESHOLD, ni les 18/24/30/36 h de
-- FORTIFICATION_WINDOW_HOURS_BY_LEVEL. `expires_at` est un INSTANT déjà calculé
-- par l'appelant (`contestDeadline`, moteur pur) : un défaut du type
-- `now() + interval '18 hours'` aurait enterré une constante de jeu dans le
-- schéma — interdit (CLAUDE.md). Les CHECK d'ici ne vérifient que des FORMES et
-- des cohérences internes à une ligne, jamais une règle de jeu.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA TABLE
-- ════════════════════════════════════════════════════════════════════════════
create table public.territory_contests (
  id uuid primary key default gen_random_uuid(),

  -- LE TERRITOIRE VISÉ. `on delete cascade` (et non `set null`) : une
  -- contestation sans territoire ne veut rien dire — ce n'est pas de
  -- l'historique, c'est une ligne orpheline qu'aucune lecture ne saurait
  -- interpréter. L'historique de propriété vit sur `territories`, qui survit.
  territory_id uuid not null
    references public.territories (id) on delete cascade,

  -- L'ASSAILLANT, polymorphe comme `territories.owner_*` (§19.3
  -- `attackerType`/`attackerId`) : un joueur ou un crew. Deux tables cibles ⇒
  -- aucune clé étrangère possible (Postgres ne fait pas de FK conditionnelle).
  -- Le trou d'intégrité est RÉEL et inscrit en suspens en fin de fichier ; il
  -- n'est pas maquillé par une contrainte qui ne contraindrait rien.
  -- `not null` tous les deux : une contestation SANS assaillant n'existe pas —
  -- contrairement à un territoire, qui peut légitimement n'appartenir à personne.
  attacker_type text not null
    constraint territory_contests_attacker_type_check check (attacker_type in ('user', 'crew')),
  attacker_id uuid not null,

  -- L'ACTIVITÉ QUI A OUVERT LA CONTESTATION (§19.3 `sourceActivityId`).
  -- POURQUOI CE NOM ALORS QUE 0074 DIT `source_run_id` : la spec parle
  -- d'activités (§19.1 `activities`, §20 `POST /activities`) et le lot 2 les
  -- introduira. La cible d'aujourd'hui reste `public.runs`, parce que c'est
  -- CELA, aujourd'hui, la table d'activité — pas une table inventée pour faire
  -- joli. Le nom anticipe, la référence dit le vrai.
  -- NULLABLE + `on delete set null`, exactement comme `territories.source_run_id` :
  -- si la course est purgée (rétention §7), LA CONTESTATION SURVIT. Elle a eu
  -- lieu ; elle ne disparaît pas avec sa trace.
  source_activity_id uuid
    references public.runs (id) on delete set null,

  -- LE RECOUVREMENT MESURÉ ∈ [0, 1] (fraction de l'aire du territoire visé
  -- couverte par la boucle attaquante), calculé par le moteur pur
  -- (`intersectionRatio`), jamais en SQL. Il est PERSISTÉ et pas seulement
  -- comparé : l'écran doit pouvoir dire « ta zone a été couverte à 78 % » des
  -- mois plus tard, même après un changement de seuil. Les bornes sont
  -- inclusives — 0 et 1 sont des mesures parfaitement valides.
  overlap_ratio double precision not null
    constraint territory_contests_overlap_ratio_range check (overlap_ratio between 0 and 1),

  -- LA FENÊTRE DE DÉFENSE (§9.1/§9.2). `expires_at` = `started_at` + la fenêtre
  -- du niveau de fortification du territoire, calculée par `contestDeadline`.
  -- Aucune durée n'est écrite ici (cf. en-tête). `not null` SANS DÉFAUT sur les
  -- deux : l'écrivain DOIT décider, il ne peut pas oublier.
  started_at timestamptz not null,
  expires_at timestamptz not null,

  -- LES 4 STATUTS DE §19.3, en minuscules — comme tous les énumérés du dépôt
  -- (`territories.state`, `runs.status`, `hex_claims.claim_type`). La spec les
  -- écrit en majuscules ; s'aligner sur sa casse aurait créé DEUX vocabulaires
  -- pour la même chose dans la même base (même arbitrage qu'en 0074 pour
  -- `activity`). Défaut 'active' : une contestation naît ouverte, c'est le seul
  -- état dans lequel elle peut naître.
  status text not null default 'active'
    constraint territory_contests_status_check check (
      status in ('active', 'defended', 'transferred', 'cancelled')
    ),

  -- QUAND ELLE A ÉTÉ TRANCHÉE. Le moteur y écrit l'ÉCHÉANCE, pas l'heure du
  -- cron (`resolveContest` : « résolu à l'échéance, jamais à nowMs ») — ainsi un
  -- cron en retard, rejoué ou dupliqué produit toujours la même histoire.
  resolved_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ── COHÉRENCES INTERNES À UNE LIGNE ───────────────────────────────────────
  -- (a) Une fenêtre de défense a une durée STRICTEMENT positive. Une échéance
  --     antérieure ou égale à l'ouverture serait une contestation déjà expirée
  --     à la naissance : le propriétaire n'aurait jamais eu sa chance.
  constraint territory_contests_window_positive check (expires_at > started_at),
  -- (b) Le statut et la date de résolution ne peuvent pas se contredire :
  --     ouverte ⇒ pas encore résolue ; tranchée ⇒ on sait quand. Une
  --     contestation 'transferred' sans `resolved_at` serait une propriété qui a
  --     changé de main à une date inconnue — de l'histoire qui manque.
  constraint territory_contests_resolution_coherent check (
    (status = 'active' and resolved_at is null)
    or (status <> 'active' and resolved_at is not null)
  ),
  -- (c) On ne tranche pas avant d'avoir commencé.
  constraint territory_contests_resolved_after_start check (
    resolved_at is null or resolved_at >= started_at
  )
);

comment on table public.territory_contests is
  'Contestation d''un territoire polygonal (§9, §19.3) : le vol n''est plus instantané, il ouvre une fenêtre de défense. LOT 3 ÉTAPE 1 : la table existe, PERSONNE n''écrit dedans — claim_hexes (0070:610) transfère toujours la propriété dans la transaction. Le modèle de réexpression des anciennes protections (lock/bouclier/fraîcheur/nouveau joueur → fortification) est documenté dans packages/engine/src/contest.ts.';
comment on column public.territory_contests.overlap_ratio is
  'Fraction ∈ [0,1] de l''aire du territoire VISÉ couverte par la boucle attaquante, mesurée par le moteur pur. Persistée pour rester explicable après un changement de seuil — la base ne la calcule ni ne la vérifie géométriquement.';
comment on column public.territory_contests.expires_at is
  'Échéance de la fenêtre de défense (§9.1/§9.2), déjà calculée par le moteur (contestDeadline) depuis FORTIFICATION_WINDOW_HOURS_BY_LEVEL. Aucune durée n''est écrite dans ce schéma : ce sont des constantes de jeu.';
comment on column public.territory_contests.resolved_at is
  'Instant de résolution — le moteur y écrit l''ÉCHÉANCE, pas l''heure du cron : un cron en retard ou rejoué produit ainsi la même histoire (résolution idempotente).';
comment on column public.territory_contests.source_activity_id is
  'Activité ayant ouvert la contestation (§19.3 sourceActivityId). Référence `runs` — la table d''activité d''aujourd''hui. NULL si la course a été purgée (§7) : la contestation a eu lieu, elle survit à sa trace.';
comment on column public.territory_contests.attacker_id is
  'Joueur (users.id) ou crew (crews.id) selon attacker_type. AUCUNE clé étrangère : Postgres ne sait pas cibler deux tables. Intégrité à la charge de l''écrivain — inscrit en suspens en fin de fichier.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. UNE SEULE CONTESTATION ACTIVE PAR TERRITOIRE
-- ════════════════════════════════════════════════════════════════════════════
-- C'EST LA CONTRAINTE CENTRALE DE CETTE MIGRATION, et le cas qu'elle vise est
-- RÉEL, pas théorique : deux rivaux qui bouclent le même quartier à dix minutes
-- d'intervalle. Sans elle, on obtiendrait deux fenêtres de défense concurrentes
-- sur la même zone, deux échéances, et à l'arrivée deux transferts — le
-- territoire serait attribué deux fois, et l'ordre des crons déciderait du
-- vainqueur. Une règle de jeu tranchée par une condition de course n'est pas une
-- règle de jeu.
--
-- Index unique PARTIEL : la contrainte ne porte QUE sur les lignes ouvertes.
-- L'historique reste libre — un territoire peut avoir été contesté cent fois,
-- il ne peut l'être qu'une à la fois. Le prédicat `status = 'active'` est
-- IMMUABLE (comparaison à une constante), donc indexable, contrairement à un
-- `where expires_at > now()` que Postgres refuserait.
--
-- QUI ARBITRE LE SECOND ASSAILLANT : pas cette contrainte. Elle REFUSE, elle ne
-- choisit pas. La politique (le second est ignoré ? mis en file ? il rejoint la
-- contestation en cours ?) appartient au lot de câblage, qui devra écrire son
-- `on conflict` en connaissance de cause. Ce qui est garanti ici, c'est qu'aucun
-- chemin d'écriture ne pourra créer l'ambiguïté par distraction.
create unique index territory_contests_one_active_per_territory
  on public.territory_contests (territory_id)
  where status = 'active';

comment on index public.territory_contests_one_active_per_territory is
  'UNE SEULE contestation active par territoire (§9). Deux rivaux qui bouclent la même zone à dix minutes d''intervalle est le cas réel : sans cet index, deux fenêtres de défense concurrentes attribueraient le territoire deux fois. Partiel : l''historique des contestations closes reste libre.';

-- ════════════════════════════════════════════════════════════════════════════
-- 3. INDEX DE LECTURE
-- ════════════════════════════════════════════════════════════════════════════
-- « Les contestations de ce territoire », et surtout « celle qui est en cours » :
-- la lecture de l'écran E70 (zone attaquée) et de la fiche territoire.
create index territory_contests_territory_status_idx
  on public.territory_contests (territory_id, status);

-- LE CRON D'ÉCHÉANCE. Il ne cherche jamais que des contestations OUVERTES dont
-- l'échéance est passée : l'index est donc PARTIEL sur `status = 'active'`, ce
-- qui le garde petit (les closes, majoritaires à terme, n'y entrent pas) et
-- évite au balayage de les traverser. Le prédicat reste immuable — un
-- `where expires_at <= now()` serait refusé par Postgres, et faux dès la
-- seconde suivante.
create index territory_contests_expires_at_idx
  on public.territory_contests (expires_at)
  where status = 'active';

comment on index public.territory_contests_expires_at_idx is
  'Balayage du cron d''échéance (§9.4) : les contestations ACTIVES par échéance. Partiel — les contestations closes ne l''alourdissent jamais.';

-- ════════════════════════════════════════════════════════════════════════════
-- 4. RLS — UNE CONTESTATION N'EST PAS UNE INFORMATION PUBLIQUE
-- ════════════════════════════════════════════════════════════════════════════
-- Patron de 0003/0074 : RLS activée, ZÉRO policy d'écriture (seules les Edge
-- Functions en service_role écrivent, elles contournent la RLS par nature), et
-- révocation en profondeur des privilèges que Supabase accorde par défaut —
-- sans ce `revoke`, la RLS serait la SEULE ligne de défense.
--
-- QUI VOIT UNE CONTESTATION : les DEUX PARTIES, et personne d'autre.
--   · le camp qui ATTAQUE (le joueur, ou tout membre actif du crew attaquant) ;
--   · le camp qui DÉFEND (le propriétaire du territoire, ou tout membre actif
--     du crew propriétaire) — c'est lui qu'on notifie (§9.4).
-- Pas de troisième cas, et c'est délibéré : cette ligne dit « quelqu'un a couru
-- ici, à cette heure-là, et voici son identité ». C'est exactement le genre de
-- donnée que §12 protège, et que la publication différée de 0074 refermait pour
-- les territoires. Le fait qu'une zone SOIT contestée reste, lui, visible par
-- `territories.state` — la carte n'a pas besoin de savoir QUI attaque pour
-- afficher une zone en violet.
alter table public.territory_contests enable row level security;

revoke all on public.territory_contests from anon, authenticated;
grant select on public.territory_contests to authenticated;

-- `(select auth.uid())` plutôt que `auth.uid()` : initplan évalué une fois par
-- requête au lieu d'une fois par ligne (même raison qu'en 0003:11, 0074).
create policy territory_contests_select_parties on public.territory_contests
  for select to authenticated
  using (
    -- Camp attaquant
    (attacker_type = 'user' and attacker_id = (select auth.uid()))
    or (
      attacker_type = 'crew'
      and exists (
        select 1
        from public.crew_members cm
        where cm.crew_id = territory_contests.attacker_id
          and cm.user_id = (select auth.uid())
          and cm.left_at is null
      )
    )
    -- Camp défenseur (via le territoire visé)
    or exists (
      select 1
      from public.territories t
      where t.id = territory_contests.territory_id
        and (
          (t.owner_type = 'user' and t.owner_id = (select auth.uid()))
          or (
            t.owner_type = 'crew'
            and exists (
              select 1
              from public.crew_members cm2
              where cm2.crew_id = t.owner_id
                and cm2.user_id = (select auth.uid())
                and cm2.left_at is null
            )
          )
        )
    )
  );

comment on policy territory_contests_select_parties on public.territory_contests is
  'Une contestation est visible des DEUX PARTIES seulement (assaillant et propriétaire, joueur ou membre actif du crew). Elle révèle qui a couru où et quand : un tiers n''y a pas accès. Que la zone soit contestée reste lisible via territories.state, sans nommer l''assaillant.';

-- ════════════════════════════════════════════════════════════════════════════
-- 5. `updated_at` NE MENT PAS
-- ════════════════════════════════════════════════════════════════════════════
-- On RÉUTILISE `public.territories_touch_updated_at()` (0074) plutôt que d'en
-- écrire une copie : la fonction ne fait référence à aucune colonne propre à
-- `territories` (`new.updated_at := now()`), et deux fonctions identiques sont
-- deux fonctions qui finissent par diverger. Son nom garde le préfixe de sa
-- migration d'origine — la renommer aurait cassé le trigger de 0074 pour une
-- question de cosmétique.
create trigger territory_contests_touch_updated_at_trg
  before update on public.territory_contests
  for each row
  execute function public.territories_touch_updated_at();

-- ════════════════════════════════════════════════════════════════════════════
-- LA PREUVE DE CETTE MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/territory_contests.pglite.test.mjs` exécute le VRAI SQL de ce
-- fichier sur un Postgres réel (PGlite, WASM), par-dessus la lignée complète des
-- migrations : refus de chaque CHECK (statut inconnu, type d'assaillant inconnu,
-- ratio hors [0,1], fenêtre nulle ou inversée, résolution incohérente avec le
-- statut), acceptation des bornes 0 et 1, UNICITÉ de la contestation active (les
-- deux assaillants simultanés), libération de la contrainte une fois la
-- contestation close, existence et forme des trois index, RLS activée, texte de
-- la policy, privilèges clients révoqués, cascade à la suppression du
-- territoire, survie à la purge de la course, et trigger `updated_at`.
--
-- CE QU'IL NE PROUVE PAS, dit ici plutôt que laissé croire : l'EFFET de la RLS.
-- PGlite tourne en SUPERUTILISATEUR — les policies ne s'y appliquent pas et
-- `auth.uid()` y est un bouchon qui rend NULL. Ce qui est vérifié, c'est que la
-- policy EXISTE, que son expression nomme bien les deux camps, et que les
-- privilèges d'écriture sont révoqués. Qu'un tiers soit RÉELLEMENT aveugle ne
-- pourra être prouvé que sur un vrai Supabase (même limite qu'en 0074/0075/0076).
--
-- POUR LE REJOUER :
--   mkdir -p /tmp/pglite && cd /tmp/pglite
--   echo '{"name":"pglite-scratch","private":true}' > package.json
--   npm i --ignore-scripts @electric-sql/pglite
--   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
--     node supabase/tests/territory_contests.pglite.test.mjs

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 27/07/2026
-- (un point refermé se RETIRE d'ici ; il ne se laisse pas traîner comme ouvert)
-- ════════════════════════════════════════════════════════════════════════════
-- 1. PERSONNE N'ÉCRIT DANS CETTE TABLE, ET LE VOL RESTE INSTANTANÉ. `ingest_run`
--    n'ouvre aucune contestation, aucun cron ne résout d'échéance, et
--    `claim_hexes` (0070:610) transfère toujours la propriété dans la
--    transaction. Les règles existent (`packages/engine/src/contest.ts`, 36
--    tests), le schéma existe, le CÂBLAGE N'EXISTE PAS. Aucun joueur ne voit la
--    moindre différence aujourd'hui.
-- 2. LES DEUX MODÈLES COEXISTENT ENCORE DANS LE CODE (pas dans le jeu) : lock 24 h,
--    bouclier 48 h, fraîcheur 6 h et protection nouveau joueur 14 j sont toujours
--    APPLIQUÉS par `claims.ts` étape 6. Leur retrait est atomique avec la bascule
--    du lot de câblage — les retirer maintenant enlèverait les protections SANS
--    donner la contestation en échange, c'est-à-dire en rendant le jeu plus
--    brutal qu'avant et qu'après.
-- 3. AUCUN LIEN IMPOSÉ AVEC `territories.state`. Rien en base n'oblige un
--    territoire à passer `contested` quand une contestation s'ouvre sur lui, ni
--    à revenir `owned_*` quand elle se ferme. La machine à états §5.3 vit dans le
--    moteur et dans la future RPC ; un trigger de cohérence serait à poser AVEC
--    le premier écrivain, pas avant (un garde-fou sur une table que personne
--    n'alimente ne garde rien — même raison qu'en 0074).
-- 4. `attacker_id` N'A AUCUNE CLÉ ÉTRANGÈRE (polymorphe : `users` ou `crews`).
--    Rien n'empêche donc un assaillant qui ne désigne personne, ni la survie
--    d'une contestation dont le crew a été dissous. Même dette, et même
--    échéance, que `territories.owner_id`.
-- 5. LE SECOND ASSAILLANT N'A PAS DE POLITIQUE. L'index unique REFUSE la seconde
--    contestation active ; ce qu'il advient de ce rival (ignoré, mis en file,
--    associé à la contestation en cours) n'est pas tranché — et ce n'est pas au
--    schéma de le trancher. À décider explicitement au câblage, en écrivant le
--    `on conflict` correspondant.
-- 6. `cancelled` N'EST PRODUIT PAR RIEN. Le statut existe (§19.3) et
--    `resolveContest` sait le RECONNAÎTRE, mais aucun chemin ne l'écrit : les
--    causes d'annulation (activité attaquante invalidée a posteriori, compte
--    supprimé, territoire disparu) appartiennent au câblage.
