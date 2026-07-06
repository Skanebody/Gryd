# AMENDEMENT-34 — Emprunts Clash of Clans → GRYD (delta) (06/07/2026)

**Statut : actif. Étend `packages/shared/src/game-rules.ts` + `packages/engine`.**
Source : le doc **« Clash → GRYD »** du fondateur (cadences façon clan Supercell, **sans obliger à courir tous les jours**). Aucune règle de jeu existante n'est modifiée dans son barème — seul le **delta** est ajouté.

> **ANTI PAY-TO-WIN STRICT.** Aucune constante ni fonction de cet amendement ne donne **territoire, points, vitesse ou protection**. Que du **social / statut / mise en scène temporelle** et une **jauge collective**. Le seul multiplicateur ajouté (coffre quotidien) agit — comme le Crew Boost payant existant — sur la **progression du coffre crew UNIQUEMENT**, jamais sur les points/XP/leaderboard, et il est **gratuit**.

---

## 0. Ce qui existait déjà (~85 % du mapping Clash)

Cet amendement n'ajoute que le **delta**. Étaient DÉJÀ en place et non retouchés :

- **Crews façon clan** : rôles hiérarchiques (`CREW_ROLES` rookie→founder), matrice de permissions complète (`CREW_PERMISSIONS`), période d'essai rookie (`ROOKIE_TRIAL_DAYS`), recrutement (`CREW_RECRUITMENT_STATUSES`), tags de style (`CREW_TAGS`).
- **Progression de clan** : `CREW_XP_TABLE` (L1-10), `CREW_XP_SOURCES` + caps anti-farm, `CREW_PERKS` par niveau (data-driven, jamais pay-to-win), cadres de blason (`CREW_FRAME_THRESHOLDS`).
- **Guerres / offensives** : `OFFENSIVE_*`, `DEFENSE_MISSION_DURATION_H`, `offensiveResult` (engine/crew.ts).
- **Requêtes & dons de clan** : requêtes crew + dons (AMENDEMENT-18 A2), Crew Chest hebdo (`CREW_CHEST_*`), Crew Boost payant capé coffre-only (`CREW_BOOST_CHEST_MULTIPLIER`, engine/crew.ts `boostChestMultiplier`).
- **Journal / social de clan** : feed crew, crew log, discovery/finder (crew-discovery), défense graduée par couverture de frontière (engine/coverage.ts), fermeture de boucle crew collaborative (AMENDEMENT-17 chantier 2).

Le delta ci-dessous = **4 emprunts** qui manquaient : **gros crews**, **raid**, **revanche**, **coffre quotidien**.

---

## 1. Les 4 deltas

| Delta | Emprunt Clash | Ce que GRYD en fait | Anti-P2W |
|---|---|---|---|
| **Gros crews + score capé** | Clan jusqu'à 50 membres | `CREW_MAX_MEMBERS` 10 → **50** ; score de saison sur les **30 plus actifs** seulement (`CREW_SCORE_TOP_ACTIVE`) | Un gros crew n'écrase **pas** par le nombre : la taille est plafonnée au score, elle ne s'achète pas et ne donne aucun territoire. |
| **Raid crew** | Clan War / Raid Weekend | Offensive collective à **fenêtre 48 h** (`RAID_DURATION_HOURS`) avec **jauge de zones** (`RAID_DEMO_TARGET_ZONES`) ; statut active/complete/expired (engine/raid.ts) | Le raid **met en scène** dans le temps la conquête que le crew fait de toute façon — **zéro** territoire/point bonus. |
| **Revanche** | « Rendre la pareille » après une attaque | Fenêtre **24 h** (`REVANCHE_WINDOW_HOURS`) après un vol/attaque rival → marqueur social « prends ta revanche » (engine/revanche.ts) | Marqueur **temporel** uniquement : le gain reste celui des règles normales de reprise/vol §3.4. Ni point, ni protection. |
| **Coffre quotidien** | Récompense de connexion du jour | **1 boost/jour** gratuit (`DAILY_CHEST_BOOST_PER_DAY`), petit **+2 %** (`DAILY_CHEST_BOOST_PCT`) sur la progression du coffre crew | **Gratuit** (jamais acheté), effet marginal (agrément), coffre-only comme le Crew Boost payant. Accroche de rétention **douce**, sans obliger à courir tous les jours. |

---

## 2. Constantes ajoutées (`packages/shared/src/game-rules.ts`)

SOURCE DE VÉRITÉ unique — aucun nombre magique ailleurs. Chaque constante est commentée à la source.

```ts
// §3.5 Crews
CREW_MAX_MEMBERS      = 50   // (était 10)
CREW_SCORE_TOP_ACTIVE = 30   // seuls les 30 plus actifs comptent au score de saison

// AMENDEMENT-34 §DELTA-CLASH (fin de fichier)
RAID_DURATION_HOURS      = 48      // fenêtre d'un raid crew
RAID_DEMO_TARGET_ZONES   = 1_000   // cible de démo (seed, TUNABLE)
REVANCHE_WINDOW_HOURS    = 24      // fenêtre de revanche après attaque
DAILY_CHEST_BOOST_PER_DAY = 1      // 1 boost gratuit / jour
DAILY_CHEST_BOOST_PCT    = 0.02    // +2 % coffre crew, GRATUIT (coffre-only)
```

`CREW_MAX_MEMBERS` est déjà consommé par `apps/web` (Hero.tsx, WarRoom.tsx affichent `X / CREW_MAX_MEMBERS`) — l'affichage **s'adapte automatiquement** à 50, aucun libellé ne code « 10 » en dur. Les démos de crew à plus de 10 membres sont désormais valides.

---

## 3. Moteur pur ajouté (`packages/engine/src`)

Fonctions **PURES** (aucune I/O, horloge fournie par l'appelant), copiées en `supabase/functions/_shared/engine/` par `node scripts/sync-game-rules.mjs` (drift testé, jamais édité à la main).

### `crew.ts` (ajout)
- `crewSeasonScore(contribs: readonly number[], topN = CREW_SCORE_TOP_ACTIVE): number`
  Somme des **topN plus grandes** contributions (tri desc, slice topN). Contributions négatives ignorées (plancher 0/membre) ; `topN ≤ 0` → 0.

### `raid.ts` (nouveau)
- Type `RaidState { now, endsAt, progress, target }` + `RaidStatus`.
- `raidStatus(state): 'active' | 'complete' | 'expired'` — **complete** (`progress ≥ target`) **prime** sur l'échéance ; sinon **active** avant `endsAt`, **expired** après.
- `raidProgressPct(progress, target): number` — fraction **bornée [0, 1]** ; cible ≤ 0 → 0.

### `revanche.ts` (nouveau)
- `revancheExpiry(triggeredAt, windowH = REVANCHE_WINDOW_HOURS): Date`
- `revancheActive(triggeredAt, now, windowH?): boolean` — fenêtre `[triggeredAt, expiry)`, bornes incluses/exclues exactes.
- `revancheHoursLeft(triggeredAt, now, windowH?): number` — planché à 0.

Exportés depuis `packages/engine/src/index.ts` (`export * from './raid.ts'` / `'./revanche.ts'`).

---

## 4. Tests (moteur PUR, filet Deno)

`~/.deno/bin/deno test --allow-read supabase/functions/` : **449 → 473** (+24, 0 échec).

- `ingest_run/crew_test.ts` : +6 tests `crewSeasonScore` (sous le seuil, topN, gros crew capé, négatifs ignorés, topN ≤ 0).
- `ingest_run/raid_test.ts` (nouveau) : 9 tests (active/complete/expired, complete prime sur l'échéance, cible ≤ 0, pct borné).
- `ingest_run/revanche_test.ts` (nouveau) : 9 tests (fenêtre défaut/custom, bornes exactes, now antérieur, heures restantes planchées).

---

## 5. Validation

- `~/.deno/bin/deno test --allow-read supabase/functions/` → **473 passed / 0 failed** (drift_test inclus : les copies `_shared/` matchent la source).
- `npm run typecheck` → **4/4** workspaces verts (engine, shared, mobile, web).
- `git status supabase/functions/_shared/` → **seulement les copies générées** (crew.ts, index.ts, game-rules.ts modifiés ; raid.ts, revanche.ts ajoutés). Aucune édition manuelle.

---

## 6. Suite (agents écrans)

Ce chantier est **FONDATION uniquement** (constantes + moteur pur). Les écrans mobiles consommeront :
- **Crews** : `CREW_MAX_MEMBERS` (50) pour l'affichage `X/50`, `crewSeasonScore` pour le classement de saison.
- **Raid** : `raidStatus` / `raidProgressPct` + `RAID_DURATION_HOURS` / `RAID_DEMO_TARGET_ZONES` pour l'écran de raid crew (jauge, compte à rebours).
- **Revanche** : `revancheActive` / `revancheHoursLeft` + `REVANCHE_WINDOW_HOURS` pour le marqueur social « prends ta revanche ».
- **Coffre quotidien** : `DAILY_CHEST_BOOST_PER_DAY` / `DAILY_CHEST_BOOST_PCT` (à brancher côté progression coffre crew, façon `boostChestMultiplier`).

Charte inchangée : noir/blanc/chartreuse #B4FF0D, §A (1 écran = 1 décision, 1 CTA, pas de card-dans-card, textes non tronqués).
