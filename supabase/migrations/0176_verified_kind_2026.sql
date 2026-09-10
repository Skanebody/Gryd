-- 0176_verified_kind_2026.sql
-- GRYD — LE BADGE VÉRIFIÉ SAIT DIRE « QUI » (LOT H, 10/09/2026).
--
-- DEMANDE FONDATEUR : « faut-il des profils vérifiés (badge) pour les personnes
-- ET pour les marques ? » La recommandation argumentée vit dans
-- `docs/product/GRYD_PSEUDO_ET_VERIFICATION_2026_09.md`. Ce fichier n'en pose
-- que le SCHÉMA MINIMAL, et rien d'autre.
--
-- ═══ CE QUE CETTE MIGRATION FAIT, ET CE QU'ELLE NE FAIT SURTOUT PAS ═════════
-- ELLE FAIT : une colonne `verified_kind` à trois valeurs (none | athlete |
-- brand), non écrivable par le client, cohérente avec le `verified` booléen
-- que 0047 avait déjà posé.
--
-- ELLE NE FAIT PAS : attribuer quoi que ce soit. Zéro ligne passe à autre chose
-- que « none ». Aucun formulaire, aucun critère public, aucune file de revue,
-- personne pour trancher — donc aucune promesse. « L'app ne ment jamais » :
-- une colonne prête n'est pas un circuit, et tant que le circuit humain
-- n'existe pas, l'app ne doit peindre NULLE PART un « demander la
-- vérification » ni un emplacement grisé qui laisserait croire qu'il existe.
--
-- ═══ POURQUOI DEUX GENRES, ET PAS UN BOOLÉEN DE PLUS ════════════════════════
-- Un badge unique dit « ce compte est authentique ». Il ne dit pas de QUOI. Or
-- les deux usurpations que GRYD peut réellement subir ne se ressemblent pas :
--   · celle d'une PERSONNE (« athlete ») : un coureur connu localement dont on
--     reprend le nom pour parler en son nom dans un crew ;
--   · celle d'une MARQUE (« brand ») : un équipementier, un club, une ville,
--     dont on prend le @ pour paraître officiel (0047 en réserve déjà la liste).
-- La preuve exigée n'est pas la même (pièce d'identité vs preuve de mandat), la
-- personne qui tranche n'est pas la même, et ce que le badge autorise plus tard
-- n'a pas de raison d'être le même. Écrire cette distinction MAINTENANT coûte
-- une colonne ; la rattraper après coup coûterait une migration de données sur
-- des comptes déjà badgés, et un badge dont personne ne saurait dire ce qu'il
-- promettait.
--
-- ═══ ANTI-PAY-TO-WIN (règle 10) ════════════════════════════════════════════
-- Ce badge n'est PAS achetable, et ce n'est pas une intention : c'est ce que le
-- schéma permet. Aucun grant d'écriture n'est donné à `authenticated`, aucune
-- RPC ne l'écrit, et aucun produit commercial (`commercial_*`) ne le référence.
-- Le jour où un circuit existera, il devra être une décision de MODÉRATION,
-- jamais une ligne de facture — sans quoi GRYD vendrait de la crédibilité.

alter table public.user_profiles
  add column if not exists verified_kind text not null default 'none'
    check (verified_kind in ('none', 'athlete', 'brand'));

-- Décidé serveur, comme `verified` (0047). Les grants de 0011 sont colonne par
-- colonne : une colonne ajoutée n'hérite de rien. Le revoke explicite verrouille
-- le cas d'un futur `grant update on user_profiles to authenticated` distrait.
revoke update (verified_kind) on public.user_profiles from public, anon, authenticated;
revoke insert (verified_kind) on public.user_profiles from public, anon, authenticated;

comment on column public.user_profiles.verified_kind is
  'Genre de vérification : none (100 % des comptes aujourd''hui) | athlete '
  '(personne) | brand (marque, club, ville). Attribué SERVEUR uniquement, '
  'jamais achetable, jamais demandable tant qu''aucun circuit humain de revue '
  'n''existe. Cohérent avec verified (0047) : verified_kind <> ''none'' '
  'implique verified = true, et l''inverse est refusé par la contrainte '
  'ci-dessous.';

-- L'INCOHÉRENCE EST INTERDITE EN BASE, pas seulement en intention. Sans cette
-- contrainte, un service_role distrait pourrait poser `verified_kind='brand'`
-- en laissant `verified=false` : le profil serait « une marque vérifiée » que
-- l'app n'afficherait jamais comme vérifiée, et personne ne le verrait avant
-- qu'une marque s'en plaigne. `not valid` n'est pas nécessaire : la table ne
-- contient que des lignes conformes (verified=false, verified_kind='none').
alter table public.user_profiles
  drop constraint if exists user_profiles_verified_kind_agrees_2026;
alter table public.user_profiles
  add constraint user_profiles_verified_kind_agrees_2026
  check (verified_kind = 'none' or verified);
