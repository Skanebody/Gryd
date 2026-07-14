-- 0032_drop_stale_claim_hexes_4arg.sql
-- GRYD — Supprime la surcharge 4-args PÉRIMÉE de claim_hexes (drift historique prod).
--
-- Constat (recon prod, 14/07, après application de 0031) : la base porte DEUX claim_hexes —
-- la 4-args de 0017 (SANS la garde TOCTOU) ET la 5-args de 0031 (AVEC la garde). La migration
-- 0018 (qui devait drop la 4-args + créer la 5-args) est marquée appliquée dans l'historique
-- mais son CORPS n'a jamais tourné sur cette base : le repo a été réconcilié après coup sur
-- l'historique prod, si bien que la 4-args de 0017 a survécu. Conséquence : le chemin
-- boucle-crew d'ingest_run (appel 4-args, index.ts:1509) résolvait la 4-args NON gardée →
-- le correctif d'intégrité 0031 ne couvrait PAS les captures de boucle crew.
--
-- FIX : on drop la 4-args, exactement comme 0018 l'intendait. L'appel 4-args (PostgREST,
-- p_xp omis) résout alors la 5-args GARDÉE avec p_xp = null (rétro-compat XP, correct pour la
-- boucle qui ne fournit pas score.xp). Seuls appelants vérifiés = ingest_run (boucle 4-args +
-- course 5-args) ; aucune autre référence dans les Edge Functions. Idempotent (if exists).

drop function if exists public.claim_hexes(uuid, uuid, text, jsonb);
