-- 0069 — CLASSEMENTS PAR SPÉCIALITÉ (§16 : Conquérant / Défenseur / Voleur / Pionnier).
--
-- Les compteurs (hexes_captured / steals / defends / pioneer_hexes) sont écrits
-- LIVE par ingest_run dans user_stats — mais user_stats est en RLS OWNER-ONLY
-- (user_stats_select_own, 0007) : un joueur ne voit QUE sa propre ligne, donc
-- aucun classement de spécialité n'était possible côté client.
--
-- Cette VUE les expose EN LECTURE, cross-user, par ville — EXACTEMENT le patron
-- de player_leaderboard (0046) pour les points : une vue « definer » (le
-- propriétaire postgres contourne la RLS de user_stats, qui n'a pas de FORCE),
-- grantée en SELECT aux seuls authenticated (jamais anon/public). Aucune écriture
-- client (user_stats reste service-role en écriture). Comptes en suppression exclus.
--
-- Compteurs LIFETIME (user_stats est cumulatif, pas par saison) : ces classements
-- sont « de tous les temps », pas « de la saison » — l'UI le nomme honnêtement.
-- Ne PAS exposer de colonne sensible : seuls pseudo + compteurs de jeu + city_id.
drop view if exists public.specialty_leaderboard;
create view public.specialty_leaderboard as
select
  us.user_id,
  u.pseudo,
  u.city_id,
  us.hexes_captured,
  us.steals,
  us.defends,
  us.pioneer_hexes
from public.user_stats us
join public.users u on u.id = us.user_id
where u.deletion_requested_at is null;

revoke all on public.specialty_leaderboard from public, anon;
grant select on public.specialty_leaderboard to authenticated;
