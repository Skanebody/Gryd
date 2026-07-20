# AMENDEMENT-42 — Positionnement « Cours pour ton crew. Conquiers ta ville. »

**Statut : ACTIF — décision fondateur du 20/07/2026 (« ok vas y »), issue de
l'analyse concurrentielle INTVL n°2.** Remplace l'ancienne tagline
« Cours. Capture. Défends. » sur TOUTES les surfaces publiques.

## 1. La décision

INTVL a validé la catégorie (fitness territorial) mais ne l'a pas verrouillée :
nom faible, English-only, GPS peu fiable, complexité UX. GRYD prend la position
que l'analyse identifie comme défendable : **le crew d'abord, la ville comme
enjeu, l'effort qui compte vraiment**.

- **Descripteur de catégorie** : « Le jeu de guerre territoriale entre crews de running. »
- **Tagline principale** : « Cours pour ton crew. Conquiers ta ville. »
- **Phrase d'appui** : « Chaque run change la carte. »

Rappel inchangé : **clearance INPI à faire avant usage commercial du nom GRYD**
(la tagline n'y change rien).

## 2. Copie exacte par langue (source unique — ne pas retraduire ailleurs)

| | Tagline | Phrase d'appui |
|---|---|---|
| fr | Cours pour ton crew. Conquiers ta ville. | Chaque run change la carte. |
| en | Run for your crew. Conquer your city. | Every run changes the map. |
| es | Corre por tu crew. Conquista tu ciudad. | Cada carrera cambia el mapa. |
| de | Lauf für deine Crew. Erobere deine Stadt. | Jeder Lauf verändert die Karte. |
| pt | Corra pelo seu crew. Conquiste sua cidade. | Cada corrida muda o mapa. |

(pt = style brésilien, cohérent avec les catalogues existants « seu crew / sua cidade ».)

## 3. Application par surface

| Surface | Application |
|---|---|
| Sign-in mobile (`i18n/catalog/auth.ts` title) | Tagline en 2 lignes (`\n` entre les 2 phrases). Le sous-titre existant (« Chaque course capture des zones… ») reste : il est concret et complémentaire. |
| Onboarding (`i18n/catalog/onboarding.ts`) | Tagline seule (l'ancien descripteur « pour run clubs » saute — §A minimal). |
| Réglages / À propos (`i18n/catalog/reglages.ts`) | Tagline sur une ligne. |
| Partage post-run (`i18n/catalog/result.ts`) | `{km} km sur GRYD. ` + phrase d'appui (le partage prouve « chaque run change la carte »). |
| Web waitlist H1 (`apps/web …/dictionary.ts`) | Tagline en 2 lignes de H1 (l'accent visuel porte la 2ᵉ ligne). |
| Web metadata (`apps/web/app/layout.tsx`) | `GRYD — Cours pour ton crew. Conquiers ta ville.` + description = descripteur + phrase d'appui. |
| App Store sous-titre (`GRYD_APPSTORE_CHECKLIST.md`) | **Limite Apple 30 caractères** → « Conquiers ta ville en courant » (29). La tagline complète va dans le texte promotionnel + description. |
| `CLAUDE.md` en-tête | Nouveau descripteur + tagline, référence A-42. |

## 4. Ce que l'amendement NE change PAS

- Le nom **GRYD** (INPI toujours en attente).
- La grammaire produit (capture/défense/decay) — c'est du positionnement, pas du gameplay.
- Le kicker géographique du web (« La France est ouverte. ») — chantier Europe A-35 séparé.
- Aucune promesse chiffrée, aucun classement inventé (zéro donnée factice).
