-- 0030_security_hardening.sql
-- GRYD — Durcissement RLS pré-production (audit de mise en prod : P0 privacy + anti pay-to-win).
--
-- L'audit de readiness a relevé trois policies/grants trop permissifs qui ouvrent
-- une brèche dès qu'un vrai utilisateur existe :
--   1. routes           : lisible par TOUT authentifié (using true) → fuite du domicile
--                         (user_id + cellules H3 res 10 ~65 m départ/arrivée de chaque course).
--   2. crew_members     : insert direct client → rejoindre N'IMPORTE quel crew_id, donc lire
--                         son chat privé, ET contourner le cooldown de changement de crew.
--   3. crews.name       : update direct client → renommage payant (CREW_RENAME_FOULEES = 300)
--                         contourné (le débit de monnaie ne vit que dans l'Edge Function).
--
-- AUDIT AVANT CODE (règle gryd) : vérifié qu'AUCUN flux client existant ne s'appuie sur ces
-- écritures/lectures — 0 lecture `routes`, 0 insert `crew_members`, 0 update `crews` côté
-- mobile (les « itinéraires populaires », l'adhésion et le renommage sont encore démo/locaux
-- et passeront par des vues agrégées / Edge Functions service_role). Ces retraits ne cassent
-- donc rien de câblé : ils referment les brèches avant la bascule hors mode démo.
-- Rappel : le service_role (Edge Functions) IGNORE RLS et grants — les flux serveur ne sont
-- pas affectés.

-- ─── 1. routes : lecture réservée au propriétaire ───────────────────────────────
-- Principe §7 « jamais la trace d'autrui » + raison d'être des privacy_zones. Les
-- itinéraires populaires (V1) devront s'appuyer sur une vue AGRÉGÉE anonymisée
-- (sans user_id ni endpoints exacts), pas sur la table brute.
drop policy if exists routes_select_all on public.routes;

create policy routes_select_own on public.routes
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── 2. crew_members : fin de l'insert direct (adhésion arbitrée serveur) ────────
-- L'insert direct autorisait crew_id arbitraire (seule garde : user_id = soi), donc
-- l'auto-inscription à tout crew (lecture du chat privé via crew_members_select_all)
-- et le contournement de CREW_SWITCH_COOLDOWN_DAYS. L'adhésion doit passer par une
-- Edge Function service_role (invitation/candidature + cooldown). On retire le
-- privilège d'insert ET la policy d'insert self.
-- (grant update(left_at) conservé : quitter son propre crew reste légitime.)
revoke insert (crew_id, user_id) on public.crew_members from authenticated;

drop policy if exists crew_members_insert_self on public.crew_members;

-- ─── 3. crews : fin du renommage direct (débit 300 Foulées via Edge Function) ────
-- On conserve update(color) (cosmétique gratuit) ; on retire update(name) pour que
-- le renommage payant ne puisse jamais court-circuiter le débit de monnaie.
revoke update (name) on public.crews from authenticated;
