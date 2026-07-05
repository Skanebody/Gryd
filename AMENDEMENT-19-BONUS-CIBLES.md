# AMENDEMENT-19 — Bonus aléatoires CIBLÉS (moteur d'opportunités) (05/07/2026)

**Décision fondateur (05/07/2026).** *« GRYD ne te donne pas des bonus au hasard. Il révèle les bons moments pour agir. »* Bonus **imprévisible dans l'apparition, ciblé dans la pertinence, capé dans l'impact, clair dans l'UX, non pay-to-win dans la récompense.** À construire dans la séquence AMENDEMENT-18 (le bonus **Finisher** en premier — il relie boucle incomplète + crew + entraide + War Room + retour à l'app).

## 1. Règle d'or (les 5 contraintes)
Aléatoire dans l'apparition · Ciblé dans la pertinence (bon joueur/endroit/moment) · Capé dans l'impact · Clair dans l'UX · **Jamais de victoire achetée**. Un bonus ne change JAMAIS la propriété/points/classement — il booste **coffre crew / XP / progression badge / cosmétique / durée de protection**, rien d'autre.

## 2. Moteur (config-driven, pas de random nu)
- **Définitions = DATA** : `packages/shared/src/bonuses.ts` — chaque bonus a une fiche : `id, name, type, rarity, targetScope, trigger[], eligibility[], durationH, reward, cap, cooldownH, visibility[], cta, antiAbuse[], copy{title,body,button}`. Aucun nombre magique hors game-rules (caps/cooldowns) et cette DATA.
- **Sélecteur PUR** (`packages/engine/src/bonus.ts`, testé Deno) : `selectBonus(context, screen)` → LE bonus le plus pertinent pour cet écran, pondéré par le contexte (jamais totalement aléatoire) ; `applyBonusReward(bonus, run)` (coffre/XP/badge, capé). Contexte : **joueur** (niveau/historique/fréquence/dernière activité/zone habituelle/risque d'abandon), **crew** (activité/zones menacées/membres actifs/coffre %/boucles ouvertes/attaque rival), **carte** (zones neutres/contestées/expirantes/routes sûres/distance), **temps** (heure/jour/week-end/début-fin de saison).
- 8 FAMILLES cataloguées : zone · route · crew · défense · conquête · exploration · streak/régularité · social/entraide.

## 3. Rareté (pas de casino)
Commun (fréquent : +10 % XP, fragment, route reco) · Rare (+25 % coffre, scout report, boost défense) · Épique (événements crew) · Légendaire (très rare, **cosmétique** : skin/badge/frame). Pas de loot gambling agressif, pas de notifications permanentes.

## 4. Affichage : UN SEUL bonus principal par écran
GRYD choisit le meilleur selon l'écran. **Priorité** : 1 défense urgente · 2 boucle à terminer · 3 mission crew active · 4 coffre presque ouvert · 5 retour/streak perso · 6 exploration · 7 cosmétique/événement.
Placement : **Carte** = bonus proche pertinent (`BONUS ACTIF · Terminer République · 620 m`) · **War Room** = bonus crew · **Post-run** = bonus gagné · **Crew Chat** = bonus social · **Profil** = récompenses gagnées seulement (pas les bonus actifs).

## 5. Anti-abus & monétisation (cap strict)
- **Un seul multiplicateur actif à la fois** : bonus système + Crew Boost acheté ne se cumulent PAS multiplicativement → **le meilleur s'applique, cap total +35 %** (`BONUS_MAX_TOTAL_PCT = 0.35`). Le boost payant reste ciblable (coffre/défense/exploration/sortie/finisher) mais jamais de victoire directe.
- antiAbuse par bonus : pas de véhicule (Motion Trust), pas de micro-segment de dernière minute, GPS trust min, cooldown même zone, caps par joueur/jour + par crew/jour.
- Ex. « Offrir un Boost Finisher 1,99 € » → le membre qui ferme une boucle ouverte gagne une récompense COSMÉTIQUE bonus (pousse l'entraide, zéro pay-to-win).

## 6. MVP — 6 bonus (pas 50)
1. **Bonus Finisher** (social) — trigger : boucle crew ouverte, segment manquant < 800 m, expire bientôt ; reward : +25 % coffre + XP crew + progrès badge Finisher ; cap 3/sem/joueur, 5/j/crew, cooldown zone 24 h ; visible map+war room+chat ; CTA TERMINER. **← à livrer EN PREMIER** (branche sur les partial_boundaries déjà en place, AMENDEMENT-17 ch2).
2. **Défense Critique** (défense) — zone crew expire < 12 h → +25 % coffre + durée protection + badge Defender ; 1/j/crew ; CTA DÉFENDRE.
3. **Coffre Crew** (crew) — coffre 80-95 % → +20 % progression coffre sur runs vérifiés, 6 h ; 1/sem/crew ; CTA VOIR MISSIONS.
4. **Retour** (streak) — joueur absent 5-10 j → fragment Streak Gel / template share / XP, 24 h ; 1/14 j ; CTA « 2 km suffisent » (anti-shame, jamais « tu vas perdre ta série »).
5. **Exploration** (exploration) — secteur vierge/peu couru proche → XP + badge Pioneer + route ouverte, 48 h ; 2/sem/joueur ; CTA OUVRIR ROUTE.
6. **Boucle Propre** (conquête) — boucle bien fermée, compacité OK, GPS trust élevé → progrès badge + XP + animation post-run.

## 7. Wiring
- **Affichage** : la Carte (bonus proche), War Room (bonus crew), Crew Chat (bonus social — carte d'action), Post-run (bonus appliqué) lisent `selectBonus(context, screen)`.
- **Récompense serveur** : `ingest_run` applique `applyBonusReward` (coffre/XP/badge) avec le cap +35 % et l'anti-abus, `digest_job` expire les fenêtres. Migration `active_bonuses` (crew/player, type, expires_at, claimed) + `player_bonus_claims` (caps/cooldowns) — RLS crew/owner, service-role.
- Constantes game-rules (bloc AMENDEMENT-19) : BONUS_MAX_TOTAL_PCT=0.35, FINISHER_BONUS_MISSING_MAX_M=800, et les caps/cooldowns.

## 8. Hors MVP
Bonus météo, événements Raid live, économie de bonus avancée, personnalisation de bonus, > 6 familles actives. Toujours : jamais fréquent au point de saturer, jamais incompréhensible, jamais achetable-pour-gagner, jamais cumulable, jamais visible partout.

## 9. Séquence
Le bonus engine s'insère APRÈS le socle AMENDEMENT-18 A1-A2 (chat actionnable + requêtes/dons, où les bonus s'affichent) : **Finisher d'abord** (branché sur les frontières partielles), puis Défense Critique + Coffre Crew (War Room), puis Retour + Exploration + Boucle Propre.
