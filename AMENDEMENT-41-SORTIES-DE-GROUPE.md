# AMENDEMENT-41 — Sorties de groupe : LE RELAIS

**Statut : ACTIF (décision fondateur 21/07/2026 — « prends la décision la plus smart »).**
Complète SPEC §3.3/§3.4 et AMENDEMENT-02 §2/§3. Tranche l'ambiguïté joueur/crew de
MASTER_SPEC §6 et AMENDEMENT-17 §CH2. **Rapatrie** les mécaniques de groupe orphelines
(`GROUP_CAPTURE_BONUS_*`, `CREW_STREAK_*`, `engine/group.ts`) qui citaient un
« AMENDEMENT-35 §1/§2 » inexistant — leur document d'autorité est désormais CE fichier (§4).

## §0 — Le problème (constaté sur le code, pas supposé)

Un run club sort à 30 sur la même boucle. Aujourd'hui : le premier téléphone qui
uploade prend 100 % du territoire et 100 % des points ; les 29 autres tombent sur
`blocked_fresh_protection` (priorité sur le lock pendant FRESH_CAPTURE_PROTECT_HOURS)
→ **0 point, 0 zone, 0 XP**. Conséquences mesurées :

- `groupCaptureBonusPct` est **structurellement inopérant** : celui qui capture a
  toujours `runners = 1` ; ceux qui ont un bonus ne capturent rien. Calculé puis jeté.
- Toute la contestation inter-crews (`resolveContestedHex`, `contested_group_runs`,
  `collusionPenalty`) est **inatteignable en sortie simultanée** : elle ne filtre que
  `blocked_lock`, or fresh est prioritaire 6 h.
- Les joueurs **sans crew** sont les plus lésés (pas même l'XP crew de consolation).
- La sortie de groupe devient une course à « qui synchronise en premier ».

## §1 — La décision (une phrase par règle)

> **Une zone ne se prend qu'une fois — mais tous ceux qui l'ont courue sont payés :
> ta part = 1 ÷ ton rang d'arrivée sur la zone.**
>
> **Seul tu prends. Ensemble ça tient.**

Trois horloges, JAMAIS confondues :

| Horloge | Règle | Change ? |
|---|---|---|
| **Revendication** | `hex_claims.owner_user_id` — un hex = UN propriétaire = UN JOUEUR (jamais un crew ; le territoire crew reste l'UNION des hexes de ses membres, SPEC §3.5). Premier run ingéré. | ❌ inchangé |
| **Protection** (lock, decay, fresh) | Appartiennent au SEUL propriétaire. **Un relais n'y écrit JAMAIS** (invariant testé chantier 0, structurel en SQL chantier 1). | ❌ inchangé |
| **Récompense** | La valeur d'un hex est frappée par la formule §23 puis **répartie** : propriétaire ×1, relayeurs ×1/rang. | ✅ nouveau |

## §2 — La loi harmonique (pourquoi pas un barème)

`coCaptureShare(rang) = 1/rang` (rang ≥ 2 ; le propriétaire est le rang 1).

- **Zéro constante à calibrer** (remplace pool + plancher + paliers envisagés).
- **Explicable en une phrase** (§A) : « le 2ᵉ touche la moitié, le 3ᵉ le tiers, le
  30ᵉ le trentième ».
- **Plancher anti-shame émergent** : 1/30 ≈ 0,033 — jamais zéro, sans rustine.
- **Auto-limitée** : total ≈ H(n) — 30 coureurs ≈ 4× la valeur solo, 200 ≈ 5,9×
  (croissance logarithmique ; pas d'inflation linéaire).
- **Course à l'upload divisée par 2** : 1,0 contre 0,5 au lieu de 1,0 contre 0.
- **Le gradient de conquête tient** : 2 amis ensemble = 1,5 part totale ; séparés =
  2,0 et deux fois plus de territoire. Se disperser reste optimal pour CONQUÉRIR ;
  se regrouper devient agréable au lieu d'être puni.
- `SAME_CREW_CONTRIB_STEPS` (jamais câblé) est **remplacé** par cette loi pour le
  relais ; la constante reste en place pour son usage d'origine (contributions §6).

Cooldown : un même coureur n'est crédité qu'**une fois par hex par
DEFEND_COOLDOWN_HOURS** (symétrie exacte avec `already_owned_cooldown`) →
`co_captured_cooldown`, 0 pt. Anti-farm de base.

Borne quotidienne : `CO_CAPTURE_DAILY_POINTS_CAP` (game-rules) plafonne les points
de relais par compte et par jour — borne le multi-compte en attendant §5.3.

## §3 — Les 6 scénarios canoniques (boucle ≈ 200 hexes ≈ 2 000 pts)

| Scénario | Résultat |
|---|---|
| 1. Seul sans crew | 200 hexes, 2 000 pts — **bit-à-bit identique à aujourd'hui** (invariant testé). Le solo reste le plus rentable au km. |
| 2. Seul, en crew | Identique + XP crew + couleur. Rejoindre un crew ne retire rien. |
| 3. À 2, même crew | A : tout. B : **1 000 pts** (1/2) + ses hexes de frange pleins. |
| 4. À 30, même crew | #1 : 2 000 · #2 : 1 000 · #3 : 667 · … · #30 : **67 pts**. Surface inchangée ; la zone **tient jusqu'à +40 % plus longtemps** (§4). |
| 5. À 3, 3 crews | Même barème, crew-agnostique. Personne ne rafraîchit l'horloge du propriétaire : l'anti-harcèlement tient, la zone est reprenable demain. |
| 6. À 30, 8 crews + 3 solos | **Même règle pour les 33.** Les sans-crew sont traités comme tout le monde. |

L'écran du 30ᵉ dit, dans cet ordre : (1) ses km et son allure, pleins ; (2) « la
zone tient plus longtemps grâce à vous » ; (3) ses points. Le mot « bloqué »
n'apparaît jamais pour un co-coureur.

## §4 — « Ensemble ça tient » (rapatriement des orphelins A-35)

`groupCaptureBonusPct(runners)` (lock +15/25/35/40 %, capé) et `crewStreakTier`
sont désormais régis par CET amendement. Chantier 1 les recâble sur la réalité :
`runners` = 1 (propriétaire) + nombre de relayeurs `co_captured` de la fenêtre —
le bonus cesse d'être mort-né et devient LA signature du jeu en groupe : le solo
conquiert plus vite, le groupe rend le territoire durable. Anti pay-to-win intact :
du TEMPS, jamais des points ni de la surface.

## §5 — Chantiers

1. **Chantier 0 (CE commit) — moteur pur, zéro consommateur, zéro risque prod** :
   `coCaptureShare` (engine/social), outcomes `co_captured`/`co_captured_cooldown`,
   branche 6.0-bis dans `decideClaims` (AVANT fresh-protection), compteur
   `totals.coCaptured` (jamais dans `blocked`, ne consomme pas le plafond claims),
   constante `CO_CAPTURE_DAILY_POINTS_CAP`. Tests : loi, branche, cooldown,
   **non-régression bit-à-bit sans les nouveaux inputs**.
2. **Chantier 1 — persistance + câblage** : table `hex_co_captures` (RLS,
   service-role only), outcome `support` dans `claim_hexes` (points sans AUCUNE
   écriture `hex_claims` — invariant structurel testé en SQL), ingest : calcul du
   rang par hex + cooldown + cap quotidien + `runners` réel pour le lock.
3. **Chantier 2 — UI/explicabilité** : résultat de course (« Zone à X · ta part
   1/3 »), zone-sheet avec contributeurs nommés (patron Ingress), calcul-zones/FAQ,
   i18n 5 langues (Entry).
4. **Chantier 3 — séparation plausible des traces** (anti multi-téléphone réel).

## §6 — Risques assumés (nommés, pas cachés)

- **Multi-téléphone rentabilisé** : 5 comptes sur un corps ≈ 2,28 parts. Borné
  (cap quotidien + 1 relais/hex/24 h + run vérifié requis), fermé seulement au
  chantier 3. Fenêtre assumée.
- **Course à l'upload atténuée, pas supprimée** (1,0 vs 0,5). La bufferisation
  casserait la célébration < 3 s et l'idempotence D14 — refusée pour l'instant.
- **Découplage points/conquête** : monter au classement en relayant sans jamais
  posséder. Garde-fou arithmétique (0,5 < 1,0 < 1,3 du vol) — à surveiller en
  saison réelle. Un relayeur COURT réellement : c'est le produit.
- Queue harmonique non bornée en théorie (H(n) croît) — log-lente, réévaluer si
  des sorties > 100 coureurs sur trace identique apparaissent.

## §7 — Alternatives rejetées (ne pas rouvrir sans nouveau fait)

- **Copropriété d'hex** : coût d'entretien divisé par N → la carte devient crew par
  arithmétique en 3 semaines ; squat perpétuel sous protection. `owner_user_id NOT
  NULL` est un garde-fou, pas une limitation.
- **`owner_crew_id`** : tue le joueur sans crew (3 scénarios sur 6) ; contredit
  SPEC §3.5. Les deux passages de doc qui promettaient « la zone appartient au
  crew » (AMENDEMENT-17 §CH2, calcul-zones Q20) sont AMENDÉS par le présent : c'est
  la doc qui se range du côté du schéma, pas l'inverse.
- **100 % pour tous (modèle Turf)** : inflation ×N frontale — Turf le supporte car
  sa rente (PPH) est découplée ; GRYD n'a qu'une monnaie.
- **Baisser FRESH_CAPTURE_PROTECT_HOURS** : transforme 29 zéros en 29 vols entre
  coéquipiers + détruit l'anti-harcèlement pour les vrais rivaux.
