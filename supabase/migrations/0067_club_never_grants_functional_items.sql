-- GRYD — 0067 : l'abonnement cesse de DISTRIBUER des objets fonctionnels.
--
-- ─── LE TROU QUE CETTE MIGRATION FERME ──────────────────────────────────────
-- Le 23/07/2026, le chantier « vérité commerciale » a retiré du CATALOGUE toute
-- possibilité d'ACHETER un bouclier, un gel de série, un ping de reconnaissance
-- ou une alerte d'attaque : ce sont des avantages de jeu, et l'anti pay-to-win
-- est STRICT (CLAUDE.md). Le registre partagé refuse même un prix au niveau du
-- TYPE, et 0065 a mis les prix serveur à NULL avec une contrainte.
--
-- Mais ce chantier n'a corrigé que le chemin d'ACHAT. Le SERVEUR, lui, continuait
-- d'en OFFRIR — six fois, dans trois tables :
--     streak_gels   (0024:103, 0025:223)
--     scout_pings   (0024:183, 0025:166, 0025:303)
--     attack_alerts (0022:222)
-- toutes sur le même motif :
--     v_source := case when v_is_club and … then 'club' else 'inventory' end;
--
-- Autrement dit : l'abonné recevait GRATUITEMENT, chaque mois ou chaque semaine,
-- ce qu'un joueur gratuit devait posséder. Et depuis que ces objets ne sont plus
-- ni achetables ni gagnables, un non-abonné n'en obtiendra JAMAIS aucun. Le Club
-- était donc devenu la SEULE source d'un objet qui protège un multiplicateur
-- ×1,5 sur les POINTS DE TERRITOIRE (streak_gels), qui donne une information
-- tactique (scout_pings), ou qui prévient plus tôt d'une attaque (attack_alerts)
-- — ce dernier étant nommément désigné par AMENDEMENT-45 comme un avantage
-- compétitif payant, interdit.
--
-- La correction précédente n'avait touché que la constante TypeScript. La
-- fonction déployée ne l'a jamais lue : la violation est restée VIVANTE en prod.
--
-- ─── POURQUOI UNE CONTRAINTE, ET PAS UNE RÉÉCRITURE DE FONCTION ─────────────
-- `activate_arsenal_item` fait ~250 lignes et a déjà été remplacée deux fois
-- (0024 puis 0025). La réécrire une troisième fois pour changer six expressions,
-- c'est prendre le risque d'en diverger silencieusement. Une CONTRAINTE, elle,
-- vaut pour TOUTE version de la fonction — y compris une ancienne qu'on
-- redéploierait par erreur. On pose la règle là où elle ne peut pas être
-- contournée : sur la donnée.
--
-- ─── CE QUI N'EST PAS FAIT ICI, ET QUI RESTE OUVERT ────────────────────────
-- Le plafond MENSUEL du gel est écrit `>= 2` EN DUR dans 0024:92 et 0025:212,
-- alors que la source de vérité dit 1 (STREAK_FREEZE_FREE_PER_MONTH, et
-- STREAK_FREEZE_CLUB_PER_MONTH qui en dérive). L'écart ne mord qu'à partir du
-- jour où ces objets redeviennent obtenables — ce qui suppose une voie « gagné
-- en jouant » qui N'EXISTE PAS encore (aucune RPC ne crédite l'inventaire pour
-- ces clés). Le corriger exigerait de réécrire la fonction : à faire dans le
-- même geste que la création de cette voie, pas avant, et surtout pas en
-- inscrivant un barème que le code ne tient pas.

-- ─── 1. Normalisation défensive AVANT contrainte ────────────────────────────
-- La prod compte ~1 utilisateur et 0 course : ces tables sont vides. Mais un
-- environnement de dev historique pourrait porter des lignes 'club', et
-- `add constraint` échouerait alors — la migration entière ne s'appliquerait
-- pas. On requalifie ces lignes en 'inventory' : on ne détruit aucun fait de
-- jeu (l'objet a bien été activé), on corrige seulement sa PROVENANCE déclarée.
update public.streak_gels   set source = 'inventory' where source = 'club';
update public.scout_pings   set source = 'inventory' where source = 'club';
update public.attack_alerts set source = 'inventory' where source = 'club';

-- ─── 2. La règle, sur les trois tables ──────────────────────────────────────
-- `source` reste libre par ailleurs (inventory, promo, admin…) : on n'interdit
-- QUE la provenance « offerte par l'abonnement ».
alter table public.streak_gels
  drop constraint if exists streak_gels_club_never_grants;
alter table public.streak_gels
  add constraint streak_gels_club_never_grants
  check (source is distinct from 'club');

alter table public.scout_pings
  drop constraint if exists scout_pings_club_never_grants;
alter table public.scout_pings
  add constraint scout_pings_club_never_grants
  check (source is distinct from 'club');

alter table public.attack_alerts
  drop constraint if exists attack_alerts_club_never_grants;
alter table public.attack_alerts
  add constraint attack_alerts_club_never_grants
  check (source is distinct from 'club');

-- Idempotente : les `update` sont sans effet une fois la contrainte en place,
-- et chaque contrainte est reconstruite (drop if exists puis add).
