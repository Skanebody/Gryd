# UX-GATE — Phase 1, les 8 écrans (L1–L19)

> **Portée** : les écrans du groupe `(mvp)`, au 03/08/2026.
> **Méthode** : relecture loi par loi contre le code et contre des captures
> 375 × 812 prises en preview (`mobile-web`). Ce verdict est le MIEN, pas celui
> d'un relecteur tiers — c'est une limite, elle est dite plutôt que masquée.
> **Verdict global : CONFORME SOUS RÉSERVE.** Deux lois sont PARTIELLES (L7,
> L13) et une n'est pas vérifiable avant la bascule d'entrée (L3). Aucune loi
> n'est violée.

## Les écrans

| # | Écran | Route | Capture |
|---|---|---|---|
| 1 | Onboarding | `/bienvenue` | ✅ |
| 2 | Priming permission | `/position` | ✅ (nominal + refus) |
| 3 | Home Map — vide | `/carte` | ✅ (états `unavailable` et `interrupted`) |
| 4 | Home Map — actif | `/carte` | ⚠️ non capturé : la base est VIDE et le build local n'a pas de `.env`. Le rendu des polygones est couvert par `territoryGeo.test.ts`, pas par une image |
| 5 | Préflight + décompte | `/prete` | ✅ |
| 6 | Live Run | `/course` | ✅ (départ, reprise à 0,43 km) |
| 7 | Capture | `/resultat` | ✅ (42 350 m²) |
| 8 | Résultat (refus / attente) | `/resultat` | ✅ (manque 23 m, attente, intérieur partiel) |

## Verdict loi par loi

| Loi | Verdict | Preuve / réserve |
|---|---|---|
| **L1** — 3 questions en < 1 s | ✅ | `homeState` répond aux trois : la carte (où), une phrase ou un chiffre (à moi), une action dérivée de la capacité réelle (quoi faire). Sans autorisation, la carte ouvre sur la ville et ne peint AUCUN point — elle ne prétend pas savoir où l'on est |
| **L2** — une action primaire | ✅ | `Stage` n'accepte qu'un `cta` (objet, pas tableau) : un second bouton de même poids est impossible à écrire. Sur `/carte` et `/course`, les sorties secondaires sont des TEXTES |
| **L3** — 2 taps max jusqu'au départ | ⚠️ **NON VÉRIFIABLE** | Par construction : ouvrir → GO → décompte, et le préflight se déroule seul (aucun « confirmer »). Mais l'app n'ouvre PAS encore sur `/carte` — la bascule d'entrée n'a pas eu lieu. Vérifiable seulement après |
| **L4** — zone du pouce, ≥ 44 pt | ✅ | CTA dans un `footer` SŒUR du contenu défilant (donc ancré quoi qu'on mette au-dessus) ; `minHeight: 44` sur chaque cible |
| **L5** — Live Run ≤ 5 infos, ≤ 8 mots | ✅ | 4 blocs : distance (ou chrono), chrono, jauge, signal. `mvp.test.ts` vérifie la limite de 8 mots sur les 5 langues |
| **L6** — feedback < 100 ms, haptique | ✅ | `ctaPressed` sur chaque bouton ; haptique aux 4 événements de jeu du MVP (départ, quasi-fermeture, fermeture, perte de signal, capture) via `feedback.ts`. ⚠️ Déclenchée sur TRANSITION et non sur état : sur l'état, le téléphone vibrerait ~1 ×/s pendant tout le retour |
| **L7** — célébration 2–3 s, skippable | ⚠️ **PARTIEL** | Fait : apparition de l'objet puis révélation du chiffre (1,1 s), skippable au tap, désactivée sous Reduce Motion, haptique `success`. **Manque** : la chorégraphie complète en trois temps (contour se stabilise → remplissage → gain) et le SON. Inscrit au BACKLOG |
| **L8** — aucun écran vide | ✅ | `emptyMap` porte l'action qui la remplit, et `mvp.test.ts` vérifie qu'elle contient bien DEUX phrases (constat + action) |
| **L9** — onboarding ≤ 3, valeur avant permission | ✅ | 2 écrans. L9 pose un plafond, pas un objectif : le jeu tient en une phrase. La forme signature est montrée AVANT toute demande |
| **L10** — progressive disclosure | ✅ | Aucune mécanique n'est expliquée avant de servir : la jauge n'apparaît qu'une fois la trace candidate, le décompte ne parle que du signal |
| **L11** — une seule cible | — | Sans objet au MVP : ni objectif du jour ni rival (Phase 2) |
| **L12** — un chiffre héros | ✅ | Un seul par écran, et JAMAIS un zéro nu : `heroArea` et `heroAreaM2` rendent `null` hors d'un état qui sait ; sur la course, le chrono est le héros tant qu'aucun mètre n'est parcouru |
| **L13** — partage en 1 tap | ❌ **ABSENT** | Phase 3 (§5.2). Aucune surface de partage n'est peinte — donc aucun bouton mort non plus |
| **L14** — 60 fps, pas de spinner > 1 s | ⚠️ **PARTIEL** | Aucun spinner bloquant nulle part ; le chargement de la carte est une PHRASE, pas un sablier. **Manque** : un skeleton, et une mesure réelle de 60 fps sur appareil |
| **L15** — accessibilité | ✅ | Libellés = `accessibilityLabel` par construction ; `TerritoryMark` masqué aux lecteurs d'écran (l'information est portée par le texte) ; Reduce Motion respecté. ⚠️ « jamais la couleur seule » n'est pas encore éprouvé : le MVP ne peint QU'UN rôle (moi), donc aucune distinction ne repose sur la teinte — la loi redeviendra mordante à l'arrivée des rivaux |
| **L16** — notifications | — | Sans objet au MVP (Phase 2) |
| **L17** — zéro dark pattern | ✅ | « Voir la carte d'abord » toujours offert au priming ; « Annuler » disponible jusqu'au bout du décompte ; aucun compte à rebours factice ; un refus de permission background n'arrête pas la course |
| **L18** — i18n dès le 1ᵉʳ commit | ✅ | Aucun texte en dur ; `Entry` = `Record<Locale, string>` COMPLET, donc une clé sans ses 5 langues est une erreur TypeScript ; `registre.test.ts` vérifie jusqu'au registre (le portugais est brésilien) |
| **L19** — l'app n'accuse jamais | ✅ | Testé : aucun mot d'accusation sur les 5 langues, le manque se dit en MÈTRES, et un INVARIANT vérifie que les stats locales sont affichées dans les 13 issues de résultat — y compris les refus |

## Ce qui reste à prouver, et qui ne peut pas l'être ici

1. **Home Map actif** — il faut des territoires en base. La base est vide.
2. **Chaîne contre un vrai serveur** — `.env` absent en local.
3. **Never-lose-a-run par un kill réel** — prouvé en preview (buffer → offre →
   reprise à 0,43 km avec chrono continu → effacement), pas par un kill de
   process sur appareil.
4. **e2e Maestro GPS mocké** — gate Phase 1 non tenu.
5. **60 fps mesurés** — demande un appareil.

Ces cinq points sont la même preuve : celle de l'Annexe D, une course réelle à
Rouen sur un build de développement. Tant qu'elle manque, Phase 1 n'est pas
close, quelle que soit la couleur du gate CI.
