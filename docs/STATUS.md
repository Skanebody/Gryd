# GRYD — STATUS (tableau de vérité)

> Règle (MASTER Phase 0.c-8 + ADR-001) : tout démarre **ABSENT**, y compris ce qui
> existe dans le code conservé. **L'existence n'est jamais une preuve.** Seule une
> preuve `qa-verify` exécutée dans le contexte MVP fait passer une ligne à
> PARTIEL ou OPÉRATIONNEL — avec le lien vers la preuve (test, capture, log).

| Fonctionnalité (périmètre IN, §7) | État | Preuve |
|---|---|---|
| Onboarding 3 écrans + priming permissions | **ABSENT** | — |
| Carte sombre 60 fps + zones organiques (moi/neutre/fragile) | **ABSENT** | — |
| GO en 2 taps | **ABSENT** | — |
| Live Run minimal (jauge de fermeture, ≤ 5 infos) | **ABSENT** | — |
| Never-lose-a-run (kill → reprise) | **ABSENT** | — |
| Pipeline territorial (8 fixtures GPX, codes de raison) | **PARTIEL** | bornes Annexe A posées + gate vert (`npm run gate`, 3 962 tests) ; fixtures GPX, fermeture assistée (G1b) et codes de raison SPEC-GEO restent ABSENTS |
| Verify v0 (VALIDATED/PARTIAL/STATS_ONLY) | **ABSENT** | — |
| Bouclier 24 h | **ABSENT** | — |
| Decay fragile J+7 | **ABSENT** | — |
| Decay neutre J+14 | **ABSENT** | — |
| Rafraîchissement par passage | **ABSENT** | — |
| Reprise de territoire (ST_Difference, zones protégées intouchées) | **ABSENT** | — |
| Objectif du jour (1 suggestion serveur) | **ABSENT** | — |
| Classement quartier hebdo (cohortes 30–60) | **ABSENT** | — |
| Streak hebdo + 1 joker | **ABSENT** | — |
| Crew : créer / rejoindre (code + deep link), max 20 | **ABSENT** | — |
| Territoire crew = union rendue avec motif | **ABSENT** | — |
| Classement crews ville | **ABSENT** | — |
| Réactions prédéfinies + ping « je sors à Xh » | **ABSENT** | — |
| Écran résultat ordonné (territoire → avant/après → points → crew → stats → partage) | **ABSENT** | — |
| Carte de partage 1 tap (Story 9:16 + 1:1, géométrie sociale) | **ABSENT** | — |
| Deep links (zone/crew/défi, test à froid) | **ABSENT** | — |
| Pages web publiques zones/crews + OG dynamiques | **ABSENT** | — |
| Referral validé à la 1ʳᵉ course | **ABSENT** | — |
| Notifications événementielles (défense, fragile, crew, classement) | **ABSENT** | — |
| Profil minimal (m², zones, historique, badges S0) | **ABSENT** | — |
| Saison 0 Rouen (8 sem., points, caps, reset festif, poster) | **ABSENT** | — |
| Confidentialité (zones privées, masque domicile 200 m, suppression, export) | **ABSENT** | — |
| Analytics Annexe B (funnel d'activation) | **ABSENT** | — |
| i18n FR/EN (aucun texte en dur) | **ABSENT** | — |

**Compteur : 0 opérationnel · 1 partiel · 29 absent.** (delta vs init : +1 partiel)
