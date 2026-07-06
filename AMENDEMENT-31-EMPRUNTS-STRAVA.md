# AMENDEMENT-31 — Emprunts Strava : invite crew + réactions conquête + leaderboard zone + site abonnement (06/07/2026)

**Décision fondateur (06/07/2026).** Source : `GRYD_TEARDOWN_STRAVA_COMPLET.md`. On prend ce qui est bon chez Strava et on le rend GRYD. 4 chantiers en parallèle (mobile ×3 + web ×1).

## 1. [P0] Invite crew / seeding densité (onboarding)
La machine de croissance n°1 de Strava = inviter des amis. Pour GRYD c'est le **moat densité** (crew = rétention + clustering géo). → Nouvelle étape « **Amène ton crew** » dans l'onboarding (après la 1re capture, AMENDEMENT-30 étape 7) : **lien de partage** + « invitez-vous, prenez le quartier ensemble » + [Passer]. Câblé démo (le lien réel = deep link prod). Jamais imposé (§7 : après la valeur).

## 2. [P1] Réactions sur les conquêtes (kudos GRYD)
Le kudos de Strava = boucle sociale légère (dopamine + colle). → Réactions sur la **capture d'un coéquipier** dans le crew feed : `Respect · Feu · Défends-la` (picto GRYD, pas emoji). Étend le store `reactions` existant (A-18). Anti-shame : pas de compteur négatif, jamais de « perdu » mis en avant.

## 3. [P1] Leaderboard par zone (analogue segment)
Le segment + KOM/QOM = le moat compétitif de Strava. GRYD : chaque **zone/secteur a son classement** (top conquérants / top défenseurs) → hook compétitif + raison de revenir sur un lieu. Utilise le moteur `sectors` (§C) + données démo. Affiché dans Mon Territoire (`/territoire`) et/ou le détail de zone. UI en scènes (§A), couleurs par rôle.

## 4. Site d'abonnement (apps/web) — « GRYD Premium », façon Strava
> **Règle absolue : l'abonnement est sur la couche STATUT/COSMÉTIQUES/SUPPORTER — JAMAIS sur le jeu.** Aucun avantage territorial/points/victoire. Anti pay-to-win (§A, doc stratégie §3.5). Payer améliore le style et soutient, jamais la conquête.
- Page web dédiée (`/abonnement` ou `/premium`) : hero, **plans** (Gratuit — le jeu complet / **GRYD Premium** — cosmétiques, templates de partage, analytics perso, badge supporter / **Founder Pack** — édition limitée early). Prix **élevé + annuel par défaut** (filtre qualité, doc stratégie ; ex. 59-79 €/an).
- **Timeline d'essai transparente** (emprunt Strava /subscribe) : aujourd'hui (accès) → rappel avant fin → débit. Réduit le backlash.
- **Gérer son abonnement** (voir statut / annuler) — stub, prod = Stripe (compte + clés = O-item côté fondateur). Câblé démo.
- Réutilise le design de `apps/web` (landing, PricingSection). Dark-first, charte.
- Mention claire « Le territoire ne s'achète jamais » (cohérence bannière Arsenal).

## 5. Build
Workflow, 4 agents parallèles (fichiers disjoints) : (a) onboarding-invite (app/onboarding + src/features/onboarding + crew/invite) ∥ (b) reactions-conquete (crew.tsx + crew/reactions + conquestReactions) ∥ (c) leaderboard-zone (territoire.tsx + nouveau composant, moteur sectors) ∥ (d) web-abonnement (apps/web pages/plans/essai/gérer). Puis vérif (mobile visuel + build web/mobile) + fix. Charte, §A, anti pay-to-win, reduce motion, textes non tronqués. Paiement réel = Stripe (O-item).
