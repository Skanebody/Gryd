# AMENDEMENT-07 — Social/communauté + motivation/challenges sains (03/07/2026)

**Sources : `docs/product/GRYD_social_communaute_recrutement_runs_groupes.md` + `GRYD_motivation_challenges_sains_neuropsychologie.md`.** Complète AMENDEMENT-06 (crews). Périmètre = **MVP §52 (social) et §22 (motivation)** ; V1/V2 explicitement HORS scope (marqués dans chaque doc). Principe transverse : « GRYD = communauté de crews qui recrutent/courent/attaquent/défendent ensemble » + « rendre l'effort visible, la progression désirable, la compétition CHOISIE ». Zéro position live, zéro shame, pas de pay-to-win, anti-spam.

## 1. Profils motivationnels (motivation §2-§4) — colonne unique
`user_profiles.play_style` ∈ `focus_solo | mixte | crew_war` (défaut mixte) — choisi à l'onboarding, changeable à tout moment (Motivation Settings). Effets = filtrage UI/notifs (§3), pas de gameplay différent. `visibility` (§4/§34) : `profile_visibility` ∈ `private | friends | crew | public` (défaut crew) ; `activity_sharing` ∈ `private | friends | crew | stats_only` (défaut crew) ; `map_sharing` ∈ `precise | simplified | territory_only | none` (défaut simplified) ; `discreet_mode` bool (défaut false → hors leaderboards globaux). Défauts : profil visible en jeu, activités crew, PAS de position live, traces simplifiées, santé masquée.

## 2. Modes de course (social §10) — au départ d'une course
`RunMode` ∈ `conquete | social_run | course_privee` (+ `race_mode`/`event_run` = V1, catalogués mais désactivés) dans @klaim/shared. Effets sur ingest_run :
- **conquete** : capture normale + règles run groupé §4 ci-dessous.
- **social_run** : stats + badges + XP perso, **capture territoire désactivée** (hexes traversés → statut `stats_only`, aucun claim).
- **course_privee** : stats perso uniquement, aucun claim, aucun partage, aucune entrée feed.
Le client envoie `runMode` dans IngestRunRequest (défaut conquete).

## 3. Runs groupés & anti-farm (social Partie A) — dans le moteur
Détection (pure, engine `detectGroupRun`) : deux courses valides, départ ≤ 3 min, chevauchement de trace ≥ 70 % (approx MVP : ratio d'hexes communs), écart moyen faible → **Group Run**. Constantes GROUP_RUN_* dans game-rules (START_TOLERANCE_MIN=3, OVERLAP_MIN=0.7, HEX_SHARE_MIN=0.7).
Résolution des hexes communs (`resolveContestedHex` pur) :
- **Même crew** : capturé UNE fois par le premier ; contributeurs suivants → contribution crew plafonnée (§6 : +30 %/+20 %/+10 %/+10 %…), PAS de multiplication du territoire.
- **Crews différents** : hex commun → statut `contested` ; résolu au crew à plus forte **contribution pondérée** (nb coureurs validés × trust) ; **égalité → reste neutre/contesté, jamais volé** ; un hex possédé n'est jamais volé automatiquement en égalité de présence.
- **Anti-collusion** (§11) : mêmes crews qui s'échangent les mêmes hexes trop souvent (table `contested_group_runs` + historique) → bonus vol retiré, statut `stats_only`, message doux « Bonus territoire réduit : reprise répétée entre mêmes crews ». MVP : détection simple (compteur d'alternances sur fenêtre) ; graphe avancé = V1.
Le résumé de course explicite les hexes contestés/défendus (social §13).
**MVP réaliste** : la co-présence temps réel de 2 courses distinctes suppose l'ingestion des deux ; en MVP mono-course, `contested` est calculé au 2ᵉ ingest sur la même fenêtre (le 1ᵉʳ a claimé, le 2ᵉ d'un autre crew ≤ lock → bascule contested au lieu de bloqué_lock). Documenter cette approximation.

## 4. Social — tables (social Partie D, MVP §52)
Migration 0011 : `user_profiles` (§44 : handle unique, display_name, avatar_url, avatar_shape default 'hex', bio, main_city, main_country, play_style, profile_visibility, activity_sharing, map_sharing, discreet_mode) ; `friendships` (§45 : requester/addressee/status pending|accepted|blocked|rejected, unique paire) ; `crew_applications` (§48) ; `group_runs` (§49) ; `crew_feed_events` (§50) ; `contested_group_runs` (§51). `crews` gagne slug/tag/recruitment_status/crew_type/league si absents (certains posés en 0010 — vérifier, ne pas dupliquer). RLS : profil selon profile_visibility (lecture publique du profil public, sinon amis/crew) ; friendships owner-only ; crew_applications lisibles par le candidat + captains/leader du crew (via crew_members role) ; group_runs/crew_feed lisibles par le crew ; écriture service_role + endpoints rôle-gated en TODO (comme 0010). `@handle` : contrainte unique, regex `^[a-z0-9_]{3,20}$`.

## 5. Challenges (motivation §15-§16) — tables + moteur
Migration 0012 : `challenges` (challenge_id, type solo|crew|rivalry|event|season, name, description, starts_at, ends_at, difficulty, visibility, primary_goal jsonb {metric,target}, personal_minimum jsonb, collective_goal jsonb, reward_personal, reward_collective, share_template, privacy_mode, anti_abuse) + `challenge_progress` (challenge_id, user_id|crew_id, progress, done_at, contribution jsonb). Seed MVP : solo Consistency II (3 courses/sem), Distance (10 km cumulés), Defense (30 hexes) ; crew Defense Week (300 hexes, min perso 20) ; rivalry Night Pacers vs Canal (48 h, Paris Est). Moteur `engine/challenge.ts` pur : `challengeProgress(type, stat)`, `meetsPersonalMinimum`, `coopetitionScore` (multi-critères §9.2 : régularité/défense/participation/exploration/fiabilité, pas que la vitesse). ingest_run met à jour challenge_progress des challenges actifs du user/crew.

## 6. Badges motivationnels manquants (motivation §19) — ajouter au catalogue
Ajouter à badges.ts (familles existantes, pas de nouvelle famille) : **social/crew** → Crew Helper, First Invite, Recruiter (5 recrues), Group Run, Encourager ; **healthy** (nouvelle sous-famille 'healthy' OU réparti en performance) → Easy Run, Recovery Run, Balanced Week, No Pressure Week, Smart Runner ; **mastery** → Personal Best, Clean Week (déjà Clean Runner). Chacun avec metric alimentable (invitesSent, referralsActivated déjà là, groupRuns, easyRuns=courses sans objectif vitesse, recoveryRuns…). Total badges → ~200+ (conforme cible V1 du doc). Migration 0012 reseed additif (ne PAS casser 0009, keys nouvelles seulement).

## 7. Leaderboards gradués + mode discret (motivation §10) — UI + règles
Niveaux : Personnel/Crew/Amis/Local/Ville/Région/France/Global. Visibilité par défaut selon play_style (§10.2 : nouveau → perso+crew ; crew → +local ; competitive → +ville/France). `discreet_mode` → jamais en leaderboard global, profil limité, partage manuel. Anti-shame (§11) : JAMAIS « tu es lent/dernier/tu fais perdre » ; formulations positives (« tu as contribué à 12 % du coffre », « à 1 run de ton objectif »).

## 8. Mobile (social Partie C + motivation §17) — MVP
- **Onboarding motivationnel** : écrans « Ton style GRYD » (Focus Solo/Mixte/Crew War) + visibilité — insérés dans le flux onboarding existant.
- **Profil renforcé** : avatar hexagonal (frame par tier joueur, mini-badge crew), @handle, ville, rang saison, niveau, titre, badges rares, Score Forme, territoire, contribution crew ; boutons Ajouter/Inviter crew/Partager profil.
- **Page Amis** : mes amis / demandes / suggestions / QR / recherche @handle.
- **Crew recruitment** : page crew publique (level, league, membres, statut, recherche rôles), boutons Demander à rejoindre/Partager/Copier lien ; candidature si « sur demande ». **Crew Discovery** (déjà ébauché en AMENDEMENT-06) : enrichir filtres/cards §27.
- **Crew Feed** : entrées §28 (capture/défense/badge/rank up/coffre), réactions GRYD custom (Raid/Défense/Clean/Fast/Rank up/Hold/Respect/Legend — icônes, pas emojis) ; chat crew simple (MVP : liste de messages + réactions, pas de DM).
- **Page Aujourd'hui** (Focus Solo) : Score Forme, objectif du jour, progression semaine, CTA Courir — accessible depuis Carte/Profil selon play_style.
- **Challenges** : détail solo/crew/rivalry (§17.3-17.6) — intégrés à War Room (crew/rivalry) et Aujourd'hui (solo).
- **Motivation Settings** (§21) : style de jeu, classements, notifications, visibilité, mode discret.
- **Sélecteur de mode** au départ de course : Conquête/Social Run/Course privée.
- Sélecteur de course (départ) : réutilise l'écran course existant. Icônes du set @klaim/shared ; ajouter les icônes manquantes (ami, ajouter-ami, feed, reactions, aujourd'hui, discret) à icons.ts.

## 9. Notifications & upsell sains (motivation §12-§13) — data/règles
Formulations non culpabilisantes (§12) dans les templates de notif (digest_job) ; upsell UNIQUEMENT sur micro-victoire (§13.1 : badge/challenge réussi/coffre/record/rank up), jamais sur échec. MVP : appliquer les formulations + moments dans le code de notif existant, pas de nouvel écran.

## 10. Priorités de build (workflow)
1. Backend social (0011 + run modes + group-run/contested moteur + wiring ingest) → 2. Backend motivation (0012 challenges + badges motivationnels + challenge moteur + wiring) → 3. Mobile lot A (Profil/Amis/Crew recruitment/Feed) ∥ lot B (Onboarding motiv/Aujourd'hui/Challenges/Motiv Settings/mode course) → 4. Landing add-on : section « Connect Your Gear » (AMENDEMENT-05 reliquat §4.10) + social proof léger → 5. Vérif transverse + correctifs. Déploiement Supabase (0011/0012 + edge functions) obligatoire. Tests Deno + typechecks 4 workspaces + build web VERTS. Rien de pay-to-win, zéro position live, anti-shame partout.
