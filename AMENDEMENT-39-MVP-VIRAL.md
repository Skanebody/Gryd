# AMENDEMENT-39 — MVP viral : chemin critique d'abord, épuration par flags ensuite

> **Rang documentaire** : amendement le plus récent → **prime sur AMENDEMENT-02..38** et sur les points de
> `GRYD_REGLES_NON_NEGOCIABLES.md` / `ADDENDUM-DESIGN-v0.1.md` qu'il traite EXPLICITEMENT ci-dessous.
> Sur tout le reste, la constitution et les amendements antérieurs **restent intégralement en vigueur**.
> Source : prompt maître fondateur « épurer le MVP, maximiser la viralité » (15/07/2026) + arbitrages fondateur
> rendus après l'audit `MVP_REDUCTION_AUDIT.md`.
> **Statut : décisions FERMES. Ce document est l'autorité de référence pour le MVP.**

---

## §0 — Décision structurante : l'ordre

L'audit `MVP_REDUCTION_AUDIT.md` (Sprint 1) et son contre-audit adversarial ont établi un fait :
**retirer l'Arsenal ne fait capturer aucune zone.** Aujourd'hui personne ne peut se connecter (O2), la carte
ne lit jamais `hex_claims`, et aucune image ne peut sortir de l'app.

**L'ordre est donc inversé par rapport au prompt maître :**

```txt
1. AMENDEMENT-39 (ce document) — figer les arbitrages
2. CHEMIN CRITIQUE  — O2 → première capture réelle → première story réelle
3. ÉPURATION        — feature flags, nav 3 onglets, surface masquée
```

L'épuration reste **nécessaire** ; elle n'est pas **urgente**. Elle vient juste après, et **par feature flags**,
jamais par suppression destructive.

**Objectif de validation n°1 — tant qu'il n'est pas atteint, aucune autre fonctionnalité n'est prioritaire :**

```txt
Une personne réelle se connecte, court dehors, ferme une boucle,
voit sa zone sur la carte, et publie une vraie story contenant un deep link fonctionnel.
```

---

## §1 — Carte : le violet reste, mais en contour

**Ce que dit l'existant** : `GRYD_REGLES_NON_NEGOCIABLES.md §C` — couleurs par RÔLE, **violet = contesté**.
**Ce que demandait le prompt maître** : supprimer le violet, contesté = double contour chartreuse/orange.
**ARBITRAGE : la constitution tient. Le violet reste le statut officiel « contesté ».**

Mais le rendu change — le violet ne doit **jamais** devenir un aplat saturé :

```txt
Zone contestée :
- remplissage du PROPRIÉTAIRE ACTUEL conservé (chartreuse si moi/crew, orange si rival) ;
- contour VIOLET ;
- double contour propriétaire/rival au zoom rapproché uniquement ;
- AUCUN violet massif sur toute la surface.
```

→ La constitution est respectée **et** la carte reste lisible. Compatible avec AMENDEMENT-37 (fills LOD 16 %,
`fillLodStops`) : c'est le **contour** qui porte l'information de contestation, pas le remplissage.

---

## §2 — Bleu protégé : moteur conservé, rendu derrière flag

**Ce que dit l'existant** : AMENDEMENT-37 — protégé = bleu électrique (`gameColors.electricBlue`).
**Ce que demandait le prompt maître** : pas de bleu protégé au MVP.
**ARBITRAGE : les deux, séparés proprement.**

```txt
protected  = statut BACKEND conservé (moteur, RLS, decay, boucliers) — inchangé
rendu bleu = feature flag DÉSACTIVÉ au lancement
MVP        = une zone protégée affiche un petit BOUCLIER AU TAP, rien sur la carte
```

→ Aucune fonctionnalité déjà intégrée n'est supprimée ; la carte MVP n'est pas polluée.

---

## §3 — Le bouton : GO générique + verbes contextuels

**Ce que dit l'existant** : AMENDEMENT-38 (override fondateur explicite) — le bouton central dit **GO**.
**Ce que demandait le prompt maître** : `[RUN]`.
**ARBITRAGE : AMENDEMENT-38 tient — GO reste.** Mais **on arrête d'utiliser GO partout.**

| Contexte | Libellé |
|---|---|
| Carte libre (aucun contexte) | **GO** |
| Zone adverse sélectionnée | **REPRENDRE** |
| Zone neutre sélectionnée | **CONQUÉRIR** |
| Boucle ouverte en cours | **TERMINER** |
| Demande de défense crew | **DÉFENDRE** |

```txt
GO             = démarrage GÉNÉRIQUE
verbe contextuel = action PRÉCISE dès qu'un contexte existe
```

Le bouton flottant conserve son icône (basket en feu) et n'affiche `GO` que dans l'état générique.
→ Réconcilie AMENDEMENT-38 (GO) et AMENDEMENT-29 (verbes contextuels) : ils ne s'excluent plus, ils se
répartissent. **`territoryStatus.ts` / `contextualAction` restent la source de vérité du libellé.**

---

## §4 — Navigation : 3 onglets en production, 0 suppression

**ARBITRAGE :**

```txt
Navigation PRODUCTION MVP : Carte · Crew · Profil
```

Le classement est accessible **depuis** la Carte, le Profil et le Crew — il n'est plus un onglet.
Le bouton d'action reste **flottant et contextuel**, jamais un onglet.

**Ces écrans NE SONT PAS SUPPRIMÉS** — Missions, Saison, Arsenal, War Room, Performance :

```txt
- restent dans le repository ;
- restent accessibles en DÉVELOPPEMENT ;
- sont cachés par feature flags ;
- ne sont pas exposés dans la navigation de production.
```

→ **Aucune suppression destructive.** Voir `FEATURE_FLAG_ARCHITECTURE.md`.

---

## §5 — Saison 0 : Paris + Lille en production, Rouen en fixture

**ARBITRAGE — séparation stricte :**

```txt
Exemples UX / fixtures / dev : République, Rouen, Paris Est, Lille
Production Saison 0          : Paris + Lille UNIQUEMENT
```

Les textes génériques utilisent des **jetons**, jamais une ville en dur :

```txt
[VILLE]  [SECTEUR]  [CREW]
```

Rouen peut rester : environnement local de test, ville pilote future, fixture de développement.
**Aucune donnée de classement fictive ne doit apparaître en production** — confirme et renforce la règle
CLAUDE.md « zéro donnée factice » et la rétractation d'AMENDEMENT-35 §6.

---

## §6 — Arsenal : conservé, désactivé

**ARBITRAGE :**

```txt
Arsenal :
- conservé dans le repository ;
- caché en production ;
- route non accessible depuis la navigation ;
- feature flag OFF ;
- réactivable en V1.5 / V2.
```

Le travail (≈ 4 093 lignes, dont les aperçus « à quoi ça sert » construits le 14/07) **n'est pas perdu**.
Il ne doit simplement pas alourdir le MVP. Même traitement pour War Room, Performance, badges avancés.

---

## §7 — Règle dure : ne rien casser de GO

```txt
Ne supprimer AUCUNE route consommée par territoryStatus ou par le bouton GO
sans produire d'abord :
  1. un graphe des appelants ;
  2. des tests de non-régression.
```

**Motif — et correction d'une erreur de chaîne** : le contre-audit a affirmé que `territoryStatus.ts:274/284`
alimentaient `contextualAction` → le bouton GO. **C'est FAUX, vérifié** : `territoryStatus` n'est importé que
par `app/(tabs)/profil.tsx:73` ; `contextualAction.ts` importe `runContext`, `intention`, `warroom/demo`,
`@klaim/shared` — **jamais** `territoryStatus`.

Ce qui reste **VRAI et suffit à fonder la règle** : `territoryStatus.ts:274/284` routent bien vers
`/crew-discovery`, et cette route a **9 références dans 4 fichiers** (`territoryStatus` → Profil, `_layout.tsx`,
`crew.tsx:220/226/252/2305`, `onboarding:132/187`). La masquer naïvement casse le **Profil**, la fin de
l'**onboarding**, et vide l'onglet **Crew** de son seul CTA d'état vide (`crew.tsx:252`, alors que
créer/rejoindre sont des stubs `Alert`).

**La leçon vaut plus que l'exemple** : une affirmation « X alimente Y » n'est vraie qu'une fois la CHAÎNE
D'IMPORTS vérifiée, pas seulement la ligne. D'où la règle ci-dessus : **graphe des appelants AVANT toute
suppression**, sans exception.

**Préservés en toutes circonstances :**

```txt
- moteurs partagés (packages/engine) ;
- exports consommés par ingest_run / digest_job (badges, skills, bonuses) ;
- règles métier ;
- les 519 tests Deno (baseline).
```

L'épuration vise la **SURFACE**, jamais le **CALCUL**.

---

## §8 — Ordre des priorités

### P0 — Débloquer une vraie boucle utilisateur → `CRITICAL_PATH_TO_FIRST_REAL_CAPTURE.md`

| # | Étape | Bloqueur principal |
|---|---|---|
| P0.1 | Authentification Apple réelle (session, profil minimal, erreurs) | **fondateur** (compte Apple Developer) |
| P0.2 | La carte lit les vraies captures (`hex_claims` → territoires **fusionnés/lissés**) | moi |
| P0.3 | Test terrain complet : login → GO → tracking → fermeture → serveur → carte | fondateur + moi |
| P0.4 | `react-native-view-shot` + `expo-sharing` + `expo-file-system` | moi |
| P0.5 | Story 9:16 réelle générée et partagée | moi |
| P0.6 | Unification du host des deep links sur `https://gryd.app` | **fondateur** (domaine) + moi |

**Note technique P0.2** : le backend conserve les **hexagones techniques** ; la carte affiche des
**territoires fusionnés ou lissés**, jamais une mosaïque d'hexes.

### P1 — Épuration de production → `FEATURE_FLAG_ARCHITECTURE.md`

**Uniquement une fois la boucle réelle fonctionnelle** (auth → run → capture → carte à jour → story partagée).
Masquer : routes, onglets, CTA, notifications, composants, **et les appels réseau inutiles**.

### P2 — Viralité complète → `SHARE_TECHNICAL_SPIKE.md`

Dans l'ordre : story conquête → deep link zone → landing dynamique → attribution du clic → attribution
installation → première capture de l'invité → **récompense cosmétique du parrain**.

**Un seul template au départ :**

```txt
J'AI PRIS [ZONE]

[CARTE + TERRITOIRE]

0,14 km² · 3,2 km

PRENDS-LA-MOI
```

Ne pas commencer avec : dix templates, replay 3D, sticker animé, éditeur complet, TikTok spécifique, premium.

**Referral — récompenses COSMÉTIQUES uniquement** (badge Recruiter, frame social, template story, skin de
trace, titre Founding Recruiter). **Jamais** : zones, points territoriaux, rank, victoire.
→ Confirme l'anti pay-to-win STRICT de CLAUDE.md.

---

## §9 — Ce que cet amendement NE règle pas

Honnêteté (charte §1) — ces points restent ouverts et **aucun n'est résolu par l'épuration** :

| Point | État |
|---|---|
| **O2 — auth Apple/Google** | bloquant absolu : sans lui, zéro utilisateur, zéro capture, zéro story |
| **Attestation d'appareil** (App Attest / Play Integrity) | absente → une capture reste forgeable ; dépend d'O2 |
| **INPI / EUIPO** | non fait → **aucun usage public légal** sous le nom GRYD |
| **Production vide** | 1 user, 0 run, 0 hex_claim, 0 crew, 0 secteur |
| **Universal Links** | `associatedDomains` absent → un lien `https` n'ouvre pas l'app |

---

## §10 — Journal des arbitrages

| Sujet | Existant | Prompt maître | **Arbitrage retenu** |
|---|---|---|---|
| Contesté | violet (REGLES §C) | double contour, pas de violet | **violet en CONTOUR**, remplissage propriétaire conservé |
| Protégé | bleu (AMD-37) | à retirer | **statut gardé**, rendu derrière flag OFF, bouclier au tap |
| Bouton | GO (AMD-38) | RUN | **GO générique** + verbes contextuels |
| Nav | 5 onglets | 3 onglets | **3 en prod**, routes conservées derrière flags |
| Villes | Paris + Lille | exemples « Rouen » | **Paris+Lille en prod**, Rouen = fixture, jetons `[VILLE]` |
| Arsenal | construit 14/07 | « retirer » | **conservé**, flag OFF, réactivable V1.5 |
| Ordre | — | épurer d'abord | **chemin critique d'abord**, épuration ensuite |
