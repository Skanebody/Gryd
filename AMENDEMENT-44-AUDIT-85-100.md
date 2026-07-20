# AMENDEMENT-44 — Les 15 actions issues de l'audit 85/100

**Reçu le 21/07/2026.** L'audit note le MVP 85/100 et liste 8 axes d'amélioration.
Ce document les convertit en **15 actions concrètes**, après confrontation au
CODE RÉEL — l'audit a évalué un *document*, pas l'implémentation.

---

## §0 — Ce que la confrontation au code change (à lire avant tout)

**Quatre « manques » de l'audit n'en sont pas. Le code les implémente déjà ;
ils sont seulement MASQUÉS derrière les flags du pilote fermé.**

| Reproche de l'audit | Réalité du code |
|---|---|
| « Progression vide, pas de niveaux, pas de paliers » | `PLAYER_LEVEL_MAX = 50`, courbe d'XP (`PLAYER_LEVEL_XP_BASE/RATIO`), tiers Road→Legend, `playerLevelForXp` — **existe**, masqué par `flags.season` |
| « Pas de streaks » | `STREAK_MIN_RUNS_PER_WEEK`, `STREAK_MULTIPLIER_STEP/CAP`, `STREAK_FREEZE_*` — **existe** |
| « Pas de défis » | `0012_challenges_badges.sql`, 5 défis seedés + `challenge_progress` — **existe** |
| « Anti-triche facilement contournable, pas de détection de mouvement » | **GRYD Verify existe et gate déjà les points** : `stepCount`, `STEP_COHERENCE_MIN_STEPS_PER_M`, Motion Trust, `verifyFactor` par paliers (`engine/validation.ts`, `engine/bonus.ts`) |

**Conséquence stratégique** : la moitié du chemin vers « 92-94/100 » n'est pas du
développement, c'est une **décision de périmètre** — rouvrir ou non ce qui est
masqué. Cette décision appartient au fondateur (elle rouvre aussi l'Arsenal,
donc le bouclier payant, cf. §3).

---

## §1 — L'erreur économique de l'audit (le point le plus important)

L'audit conclut « vache à lait » sur un modèle qui, **avec ses propres chiffres,
perd de l'argent sur chaque utilisateur acquis**.

- Revenu **B2C** annoncé : **739 €/mois pour 10 000 utilisateurs** → ARPU réel
  **0,074 €/mois**, soit **≈ 0,89 € de LTV sur 12 mois**.
- L'audit annonce « ARPU 0,22 € / LTV 2,64 € » en **incluant les 1 500 € de
  sponsoring B2B** dans le calcul par utilisateur. Mélanger un revenu de
  partenariat (piloté par de la vente, pas par le produit) dans un ARPU est
  trompeur : ces 1 500 € n'augmentent pas avec le nombre d'utilisateurs.
- L'audit rappelle lui-même un **CPI running de 2 à 5 €**. Avec 0,89 € de LTV,
  **chaque utilisateur acheté coûte 1 à 4 € net**. Le Pass de Saison ne renverse
  pas ça : il l'améliore à la marge.

**Ce que ça dit vraiment** : GRYD ne peut pas s'acheter sa croissance. Elle doit
être **organique** — crew, QR, partage, densité locale. C'est exactement l'axe
travaillé depuis le 20/07 (QR de recrutement, inscription différée, LE RELAIS,
union du territoire crew). L'audit valide donc la direction produit tout en
tirant la mauvaise conclusion sur la monétisation.

**Corollaire** : la priorité n'est pas d'ajouter un Pass de Saison, c'est de
faire fonctionner la boucle virale — puis de monétiser une base qui existe.

---

## §2 — LES 15 ACTIONS

### A. À FAIRE — aucune contradiction, valeur nette (7)

| # | Action | Effort | Pourquoi |
|---|---|---|---|
| **A1** | **Zone du Jour** — une zone désignée chaque jour, dérivée du RÉEL (une zone neutre ou fragile proche du joueur). Capture = marquage visuel temporaire. | M | Seule vraie « raison quotidienne » manquante. Interdit : la fabriquer si aucune zone réelle ne convient → état honnête « pas de zone du jour aujourd'hui ». |
| **A2** | **Rendre la série VISIBLE** — le moteur existe, rien ne l'affiche. Surface sur Aujourd'hui + résultat post-run. | S | On a construit une mécanique de rétention que personne ne voit. |
| **A3** | **Défi 7 jours d'accueil** — progression 3 km → 5 km → boucle → capture → partage, en réutilisant `challenge_progress` (0012). | M | Couvre la première semaine, celle où l'on perd les gens. |
| **A4** | **Messages crew contextuels** — passer de 5 génériques à 10-15 **dépendant de la situation** (défense / attaque / rassemblement). | S | Demande audit n°5, sans ouvrir un chat libre (que la doctrine §9 refuse). |
| **A5** | **Ping de zone** — épingler une zone avec un message auto-généré (« KORO a pingé République »). | M | Coordination réelle sans messagerie libre ni modération lourde. |
| **A6** | **Widget avec compte à rebours** — « Canal tombe dans 2 h » + action Défendre, au lieu d'un widget passif. | M | Demande audit n°8. Dépend du chantier widget OS (bloqué O8). |
| **A7** | **Programme ambassadeur — le DOCUMENT** (critères, contreparties, engagement, budget). | S | L'audit a raison : « créateurs, run clubs, étudiants » n'est pas un programme. Le doc, pas le recrutement : c'est du ressort du fondateur. |

### B. EXISTE DÉJÀ — décision de périmètre, pas de développement (3)

| # | Action | Décision requise |
|---|---|---|
| **B1** | **Niveaux 1-50 + tiers** : rouvrir `flags.season` ? | Rouvre aussi les classements de saison. |
| **B2** | **Renforcer GRYD Verify** : les paliers existent ; faut-il durcir les seuils (vélo/voiture) ? | Arbitrage d'équilibre, pas de code neuf. |
| **B3** | **Défis existants (0012)** : les surfacer ou les garder masqués ? | Cohérence avec la doctrine « MVP nu ». |

### C. CONTREDIT LA CONSTITUTION — arbitrage fondateur obligatoire (5)

| # | Recommandation de l'audit | Le conflit |
|---|---|---|
| **C1** | **Pass de Saison incluant « notifications prioritaires »** | Ta doctrine §22 interdit explicitement de vendre « notification plus rapide ». Être prévenu plus tôt qu'une zone est attaquée = **pouvoir la défendre en premier**. C'est un avantage compétitif payant, l'inverse exact de l'anti-pay-to-win. **Le Pass reste possible SANS cet item.** |
| **C2** | **« 200 Cristaux » (monnaie du Pass)** | Une **troisième** monnaie (Foulées, Éclats existent) alors que la doctrine §16 exclut la monnaie virtuelle du MVP. |
| **C3** | **Fatigue territoriale / limite de 5 zones** | Change les **règles de jeu gelées** (§3). Un joueur perdrait des zones gagnées sans avoir rien fait de mal. Rééquilibrer par la **fréquence de défense** (ce que le decay fait déjà) plutôt que par un plafond arbitraire est probablement plus juste — mais c'est ton arbitrage. |
| **C4** | **« Zone Légendaire » — son nom sur la carte de tous** | Ta doctrine §22 interdit de vendre de la « visibilité supérieure sur la carte ». Et c'est du **texte libre sur une carte partagée** : la modération qu'on vient de construire pour les noms de crew devrait s'y appliquer intégralement. |
| **C5** | **Selfie à l'arrivée pour les zones contestées** | Contredit le choix d'anonymat du 21/07, ajoute une friction au moment exact de la célébration, et une photo de visage est une donnée sensible (RGPD). **Recommandation : ne pas faire.** GRYD Verify (mouvement) est une preuve plus solide et non intrusive. |

---

## §3 — Ce qui reste à trancher, en une liste

1. Rouvrir ou non les surfaces masquées (`season`, `warRoom`, `arsenal`) — rouvre
   aussi bouclier + scout_ping payants, contradiction anti-P2W déjà ouverte.
2. Pass de Saison : oui/non, et **sans** notifications prioritaires ni Cristaux.
3. Fatigue territoriale : rééquilibrage ou statu quo.
4. Zone Légendaire : prestige acceptable ou visibilité payante refusée.
5. Modèle de monétisation global (abonnement+Éclats existant vs 4 packs A-43 vs
   Pass) — **trois modèles incompatibles sont aujourd'hui sur la table**.

> Rappel : rien de §C n'est implémenté sans réponse explicite. Les actions §A
> sont engagées.
