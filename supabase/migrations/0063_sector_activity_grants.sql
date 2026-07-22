-- GRYD — 0063 : la vue `sector_activity` cesse d'être lisible par tout le monde.
--
-- LE DÉFAUT (pré-existant, introduit par 0040, révélé par la revue du 23/07/2026).
-- `0040_sector_activity.sql:42` fait `grant select on public.sector_activity to
-- service_role;` — et s'arrête là. Or Supabase accorde PAR DÉFAUT les objets du
-- schéma `public` aux rôles `anon` et `authenticated` : un GRANT explicite au
-- service_role n'ENLÈVE rien à personne. La vue est donc aujourd'hui lisible par
-- n'importe quel porteur de la clé anon, c'est-à-dire par n'importe qui — la clé
-- anon est publique par design (elle est inlinée dans le bundle mobile).
--
-- CE QUE ÇA EXPOSE. `sector_activity` agrège l'activité récente par secteur :
-- zones perdues, reprises rivales sous 24 h, dernière attaque, fraction décayée.
-- C'est de la donnée de JEU sensible (elle dit où et quand ça bouge), pensée pour
-- être consommée par le job `recompute_sectors` en service_role, jamais lue en
-- direct par un client. Le produit ne la lit d'ailleurs nulle part côté client :
-- personne ne perd d'accès, on ferme une porte que personne n'utilisait.
--
-- C'EST EXACTEMENT LE PIÈGE QUE 0061 A DÉJÀ FERMÉ pour `sector_holdings` :
-- `revoke all on public.sector_holdings from public, anon, authenticated;`. Cette
-- migration applique la même fermeture, en arrière, à la vue soeur.
--
-- ⚠ `public` doit figurer dans le revoke : les autres rôles HÉRITENT de PUBLIC.
-- Révoquer anon+authenticated sans révoquer PUBLIC ne ferme rien.
--
-- Idempotente : revoke et grant sont rejouables sans effet de bord.

revoke all on public.sector_activity from public, anon, authenticated;

-- Le seul lecteur légitime : le job de recalcul (recompute_sectors), qui tourne
-- en service_role via pg_cron (0038).
grant select on public.sector_activity to service_role;
