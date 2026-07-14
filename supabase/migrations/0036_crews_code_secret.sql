-- 0036_crews_code_secret.sql
-- GRYD — Sécurité (audit offensif) : le code d'invitation d'un crew n'est plus public.
--
-- BUG : `crews.code` est un char(6) unique — le SECRET d'adhésion à un crew. Or la policy
-- crews_select_all (0003:70-72) `for select to authenticated using (true)` combinée au GRANT
-- SELECT sur TOUTE la table exposait la colonne `code` de TOUS les crews à N'IMPORTE QUEL
-- utilisateur authentifié (un simple `select code from crews` via PostgREST). Le futur
-- join-by-code serait donc contournable dès sa mise en service : n'importe qui rejoindrait
-- n'importe quel crew privé sans invitation. Faille LATENTE (crews pas encore câblés) — on la
-- referme AVANT qu'elle ne devienne exploitable, pas après.
--
-- FIX : la RLS est row-level, mais les GRANTs sont COLUMN-level → on révoque le SELECT global
-- et on ne re-grante que les colonnes publiques. `code` n'est plus lisible que par le
-- service_role (Edge Functions), qui IGNORE grants et RLS → l'adhésion par code restera
-- arbitrable serveur.
--
-- Audit avant code : AUCUN client (mobile/web) ne lit `crews` — seules 3 Edge Functions le
-- font (ingest_run:753, rc_webhook:168, digest_job:407), toutes en service_role → ce retrait
-- ne casse aucun flux. La policy crews_select_all est conservée (les crews restent
-- listables/découvrables), seule la colonne secrète sort du périmètre client.

revoke select on public.crews from anon, authenticated;

grant select (id, name, color, city_id, created_by, created_at)
  on public.crews to authenticated;
