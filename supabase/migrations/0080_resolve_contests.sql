-- 0080_resolve_contests.sql
-- GRYD — L'ÉCHÉANCE DE LA CONTESTATION (spec §9.4). LOT 3, ÉTAPE 3.
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET CE QU'ELLE NE FAIT PAS ═════════════════
-- FAIT   : `public.resolve_due_contests(p_now, p_limit)` — la fonction qui, à
--          l'échéance, TRANSFÈRE le territoire faute de défense valide, et
--          referme la contestation. C'est le seul endroit du dépôt où un
--          territoire polygonal change de propriétaire sans qu'une course soit
--          en train d'être ingérée. Plus sa planification pg_cron, POSÉE
--          SEULEMENT SI l'extension est déjà là (cf. §4).
-- NE FAIT PAS : elle ne juge AUCUNE défense (elle ne sait pas calculer une
--          intersection, et §9.3 est de la géométrie), elle ne touche PAS
--          `hex_claims` (la propriété opérationnelle reste hexagonale et le vol
--          y reste instantané — cf. §5), elle n'écrit jamais 'defended' ni
--          'cancelled'.
-- Rollback = `drop function public.resolve_due_contests(timestamptz, integer)` :
-- les contestations restent ouvertes, aucune donnée acquise n'est détruite.
--
-- ═══ POURQUOI DU SQL PEUT TRANCHER §9.4 SANS RÉÉCRIRE LE MOTEUR ═════════════
-- C'est LA question à se poser devant ce fichier, parce que dupliquer une règle
-- de jeu en SQL est exactement la faute que `game-rules.ts` existe pour
-- empêcher. La réponse tient au découpage choisi au câblage
-- (`supabase/functions/ingest_run/contest_wiring.ts`, décision 4) :
--
--   UNE DÉFENSE VALIDE CLÔT LA CONTESTATION À L'INGESTION DE LA COURSE.
--   `isDefenseValid` (moteur pur, géométrie comprise) tourne au moment où la
--   course défensive arrive ; si elle est valide, la contestation passe
--   'defended' TOUT DE SUITE.
--
-- Il ne reste donc, à l'échéance, QUE des contestations encore 'active',
-- c'est-à-dire celles qu'AUCUNE défense valide n'a fermées. Et sur cette
-- branche-là, `resolveContest` ne fait qu'une chose (`packages/engine/src/
-- contest.ts`, §9.4) :
--     status = 'transferred', resolvedAt = ÉCHÉANCE (jamais « maintenant »),
--     newOwner = l'assaillant, defenseLevel = 0.
-- Aucune géométrie, aucun seuil, aucune durée : trois affectations. Ce fichier
-- les applique, il ne les décide pas. Un seuil de jeu apparaissant ici serait un
-- bug — il n'y en a aucun, et `expires_at` est un instant DÉJÀ CALCULÉ par
-- `contestDeadline` à l'ouverture.
--
-- LE DEFENSE_LEVEL REMIS À 0 est la seule valeur écrite en dur, et ce n'est pas
-- un curseur d'équilibrage : c'est `nextDefenseLevel(x, 'transferred') → 0`,
-- « le nouveau propriétaire N'HÉRITE PAS du bouclier de celui qu'il vient de
-- battre ». Zéro n'est pas réglable — c'est l'absence de fortification.
--
-- ⚠ LE POINT FAIBLE DE CE DÉCOUPAGE, dit ici plutôt que découvert plus tard :
-- si le câblage d'ingestion échoue à enregistrer une défense pourtant valide
-- (il est best-effort, comme l'écriture de `territories`), la contestation reste
-- 'active' et CE JOB TRANSFÈRE. Le joueur aura défendu pour rien. C'est inscrit
-- en suspens ; le correctif est de rendre la clôture de défense non
-- best-effort, ce qui suppose de la faire dans la même transaction que
-- `claim_hexes` — donc à la bascule, pas avant.
--
-- ═══ LE TEMPS EST INJECTÉ ═══════════════════════════════════════════════════
-- `p_now` est un PARAMÈTRE, défaut `now()`. Même exigence que le moteur (« aucune
-- horloge, `nowMs` est TOUJOURS un paramètre ») et même bénéfice : le test
-- PGlite fait avancer l'horloge sans attendre 18 heures, et il mesure la VRAIE
-- fonction, pas une variante d'essai.

-- ════════════════════════════════════════════════════════════════════════════
-- 1. LA FONCTION
-- ════════════════════════════════════════════════════════════════════════════
-- Noms de sortie préfixés `out_` : sans cela, `resolved_at` désignerait à la
-- fois une colonne de `territory_contests` et une variable de la fonction, et
-- plpgsql refuserait la référence comme ambiguë. Laid mais explicite, plutôt que
-- `#variable_conflict` qui déplacerait le piège sans le retirer.
create or replace function public.resolve_due_contests(
  p_now timestamptz default now(),
  p_limit integer default 500
)
returns table (
  out_contest_id uuid,
  out_territory_id uuid,
  out_new_owner_type text,
  out_new_owner_id uuid,
  out_resolved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due record;
begin
  -- ─── LE BALAYAGE ──────────────────────────────────────────────────────────
  -- `for update skip locked` : deux passages du cron (ou un passage et un appel
  -- manuel) peuvent se croiser sans se bloquer ni traiter deux fois la même
  -- ligne. `order by expires_at` : les contestations les plus anciennes d'abord
  -- — après une panne, on rattrape dans l'ordre où le jeu s'est déroulé, jamais
  -- dans l'ordre physique de la table.
  -- `p_limit` borne un passage : une reprise après incident ne doit pas verrouiller
  -- des milliers de lignes d'un coup. Le passage SUIVANT reprend le reste — c'est
  -- le même patron qu'en 0064 (« le passage de cron SUIVANT la reprend »).
  -- `greatest(p_limit, 0)` : un appel avec une limite négative ne doit pas faire
  -- échouer le job entier, il ne doit simplement rien faire.
  for v_due in
    select c.id, c.territory_id, c.attacker_type, c.attacker_id, c.expires_at
    from public.territory_contests c
    where c.status = 'active'
      and c.expires_at <= p_now
    order by c.expires_at asc, c.id asc
    limit greatest(coalesce(p_limit, 0), 0)
    for update skip locked
  loop
    -- ─── (a) FERMER LA CONTESTATION — C'EST CE PAS QUI ARBITRE ──────────────
    -- Le `and status = 'active'` n'est pas une ceinture de plus : c'est LE
    -- verrou d'idempotence. Une seconde exécution (cron rejoué, appel manuel
    -- concurrent, reprise après timeout) ne trouve plus de ligne 'active' et
    -- `found` vaut false — on passe à la suivante SANS toucher au territoire.
    -- Le transfert ne peut donc pas avoir lieu deux fois, même si la lecture
    -- ci-dessus avait rendu la ligne deux fois.
    --
    -- `resolved_at = expires_at`, jamais `p_now` : c'est la règle
    -- d'idempotence de `resolveContest` (« résolu à l'échéance, jamais à
    -- nowMs »). Un cron en retard de trois jours produit ainsi exactement la
    -- même histoire qu'un cron à l'heure.
    update public.territory_contests c
       set status = 'transferred',
           resolved_at = v_due.expires_at
     where c.id = v_due.id
       and c.status = 'active';
    if not found then
      continue;
    end if;

    -- ─── (b) TRANSFÉRER LE TERRITOIRE ──────────────────────────────────────
    -- `owner_type`/`owner_id` = l'assaillant ; `state` = l'état de propriété
    -- correspondant (contrainte `territories_state_owner_type` de 0074 :
    -- owned_personal ⇔ user, owned_crew ⇔ crew — les écrire de travers ferait
    -- échouer l'update, pas passer une incohérence).
    -- `controlled_since` = l'ÉCHÉANCE, pas `p_now` : la zone a changé de mains
    -- au moment où la fenêtre s'est fermée, pas au réveil du job. C'est cette
    -- date que lira le decay (§3.3) et l'écran « tenue depuis ».
    -- Aujourd'hui l'assaillant est toujours un joueur (`contest_wiring.ts`,
    -- décision 2) ; le `case` traite quand même le cas crew, parce que la table
    -- l'autorise et qu'un `owned_personal` posé sur un propriétaire crew
    -- violerait la contrainte le jour du LOT 7.
    update public.territories t
       set owner_type = v_due.attacker_type,
           owner_id = v_due.attacker_id,
           state = case v_due.attacker_type
                     when 'crew' then 'owned_crew'
                     else 'owned_personal'
                   end,
           defense_level = 0,
           controlled_since = v_due.expires_at
     where t.id = v_due.territory_id;

    out_contest_id := v_due.id;
    out_territory_id := v_due.territory_id;
    out_new_owner_type := v_due.attacker_type;
    out_new_owner_id := v_due.attacker_id;
    out_resolved_at := v_due.expires_at;
    return next;
  end loop;
end;
$$;

comment on function public.resolve_due_contests(timestamptz, integer) is
  'Échéance des contestations (§9.4) : une contestation encore ACTIVE à son expires_at n''a reçu aucune défense valide (elles sont closes à l''ingestion par contest_wiring.ts) — le territoire est donc TRANSFÉRÉ à l''assaillant, defense_level remis à 0, resolved_at = l''échéance (jamais l''heure du job, pour qu''un cron en retard produise la même histoire). Rejouable sans effet : la garde `status = ''active''` de l''update interdit le second transfert. `hex_claims` n''est PAS touchée — la propriété opérationnelle reste hexagonale pendant la transition.';

-- ════════════════════════════════════════════════════════════════════════════
-- 2. QUI PEUT L'APPELER
-- ════════════════════════════════════════════════════════════════════════════
-- `security definer` + `revoke` en profondeur, patron de 0064 : un joueur qui
-- pourrait déclencher la résolution choisirait le moment où il gagne. Le revoke
-- seul laisserait l'exécution dépendre des default privileges — on NOMME donc
-- le seul appelant légitime.
revoke all on function public.resolve_due_contests(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.resolve_due_contests(timestamptz, integer) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- 3. L'INDEX QUI SERT CE BALAYAGE EXISTE DÉJÀ
-- ════════════════════════════════════════════════════════════════════════════
-- `territory_contests_expires_at_idx` (0078 §3) : partiel sur `status = 'active'`,
-- trié par `expires_at`. C'est EXACTEMENT la requête ci-dessus. Aucun index
-- n'est créé ici — en ajouter un second, redondant, coûterait à chaque écriture
-- sans rien accélérer.

-- ════════════════════════════════════════════════════════════════════════════
-- 4. LA PLANIFICATION — POSÉE SI ET SEULEMENT SI pg_cron EST DÉJÀ LÀ
-- ════════════════════════════════════════════════════════════════════════════
-- Les crons du dépôt (0038, 0039, 0064) font `create extension if not exists
-- pg_cron;` puis `select cron.schedule(…)`. On NE le refait PAS ici, et c'est
-- délibéré : cette migration doit s'appliquer telle quelle sur un Postgres NU —
-- c'est la condition pour que son test l'exécute vraiment (PGlite n'embarque pas
-- pg_cron, et les tests du dépôt SAUTENT purement et simplement 0038/0039/0064
-- pour cette raison ; un fichier sauté est un fichier non prouvé).
--
-- Le garde `if exists (… pg_extension …)` rend donc la planification
-- OPTIONNELLE et la fonction TOUJOURS APPELABLE À LA MAIN :
--     select * from public.resolve_due_contests();
-- Sur un vrai Supabase, 0038 a créé l'extension bien avant : la branche passe et
-- le job est posé. Sur un socle sans pg_cron, la migration s'applique quand même
-- et laisse une NOTICE — plutôt qu'un échec de migration pour une dépendance
-- d'ordonnancement.
--
-- FRÉQUENCE : toutes les 5 minutes. Ce n'est pas une constante de jeu (aucune
-- règle ne change avec elle) mais une GRANULARITÉ D'EXÉCUTION : une échéance est
-- tranchée au plus tard 5 min après l'heure. `resolved_at` restant l'échéance
-- exacte, ce retard ne se voit ni dans l'histoire, ni dans le classement.
--
-- `cron.schedule` avec un nom déjà pris REMPLACE le job (pg_cron ≥ 1.4) : la
-- migration reste rejouable.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'gryd-resolve-due-contests',
      '*/5 * * * *',
      $cron$select public.resolve_due_contests()$cron$
    );
  else
    raise notice
      'pg_cron absent : resolve_due_contests() n''est PAS planifiée. La fonction reste appelable à la main (select * from public.resolve_due_contests()).';
  end if;
end
$$;

-- ════════════════════════════════════════════════════════════════════════════
-- LA PREUVE DE CETTE MIGRATION
-- ════════════════════════════════════════════════════════════════════════════
-- `supabase/tests/resolve_contests.pglite.test.mjs` exécute le VRAI SQL de ce
-- fichier sur un Postgres réel (PGlite, WASM), par-dessus la lignée complète :
-- transfert à l'échéance, `resolved_at` = échéance et non heure du job,
-- `defense_level` remis à 0, `controlled_since` = échéance, DOUBLE EXÉCUTION
-- sans second transfert, contestation non échue laissée intacte, contestation
-- déjà 'defended' jamais transférée, deux territoires échus traités dans l'ordre
-- des échéances, `p_limit` respecté, et cohérence de l'état écrit avec la
-- contrainte `territories_state_owner_type`.
--
-- CE QU'IL NE PROUVE PAS : que pg_cron déclenche réellement le job (PGlite ne
-- l'embarque pas — seul un vrai Supabase peut le montrer), et que les défenses
-- soient jugées correctement (c'est `contest.ts` + `contest_wiring.ts`, testés
-- ailleurs et en Deno).
--
-- POUR LE REJOUER :
--   mkdir -p /tmp/pglite && cd /tmp/pglite
--   echo '{"name":"pglite-scratch","private":true}' > package.json
--   npm i --ignore-scripts @electric-sql/pglite
--   cd <repo> && GRYD_PGLITE=/tmp/pglite/node_modules/@electric-sql/pglite/dist/index.js \
--     node supabase/tests/resolve_contests.pglite.test.mjs

-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE EN SUSPENS — état DATÉ du 27/07/2026
-- (un point refermé se RETIRE d'ici ; il ne se laisse pas traîner comme ouvert)
-- ════════════════════════════════════════════════════════════════════════════
-- 1. LE TRANSFERT NE DÉPLACE QUE LE POLYGONE. `hex_claims` garde ses
--    propriétaires (et son vol instantané en 0070:610) : après un transfert de
--    territoire, les CELLULES peuvent appartenir à quelqu'un d'autre que le
--    nouveau propriétaire de la zone. Les points, les classements et le decay
--    suivent toujours les cellules. Résorber l'écart = retirer le vol instantané
--    de `claim_hexes` ET les quatre protections d'AMENDEMENT-23 §D en même
--    temps ; c'est la bascule, elle est atomique, et elle n'est pas faite.
-- 2. UNE DÉFENSE PERDUE PAR UN ÉCHEC DE CÂBLAGE FAIT PERDRE LA ZONE (cf. le
--    « point faible » en en-tête). Aucune relecture de secours ne rejuge les
--    défenses à l'échéance.
-- 3. AUCUNE NOTIFICATION. §9.4 veut que le propriétaire soit averti. Ce job
--    transfère en silence : `steal_push_queue` n'est alimentée que par le vol
--    hexagonal (`ingest_run`). Un joueur peut perdre une zone sans l'apprendre.
-- 4. `cancelled` N'EST PRODUIT PAR RIEN. Une course attaquante invalidée a
--    posteriori laisse sa contestation courir jusqu'à l'échéance, et donc
--    jusqu'au transfert.
-- 5. LA PLANIFICATION N'EST PAS PROUVÉE. Le test montre que la FONCTION fait ce
--    qu'elle dit ; que pg_cron l'appelle toutes les 5 minutes ne se vérifie que
--    sur un vrai Supabase (`select * from cron.job`).
