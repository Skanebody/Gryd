# FEATURE_FLAG_ARCHITECTURE.md

> **Statut** : chantier **P1**, à exécuter **APRÈS** le chemin critique P0.1 → P0.6 (auth réelle, carte lisant `hex_claims`, test terrain, view-shot, story 9:16, deep links `gryd.app`). Ce document est l'architecture cible ; **rien ici n'est encore construit**.
> **Autorité** : AMENDEMENT-39 (arbitrages fondateur, points 4 / 6 / 7 / 8), `GRYD_REGLES_NON_NEGOCIABLES.md` §A, `CLAUDE.md`.
> **Règle dure (AMENDEMENT-39 §7)** : aucune route consommée par `territoryStatus` ou par le bouton GO n'est supprimée **sans graphe des appelants + tests de non-régression écrits AVANT**. Ce document contient ce graphe (§6), lu dans le code.

---

## 0. Ce qui existe déjà vs ce qui est à construire

| Élément | État vérifié |
|---|---|
| Système de feature flags de build | **N'EXISTE PAS.** `feature_entitlements` (IAP / GRYD Club) est un droit d'achat serveur, sans rapport. |
| `__DEV__` | **EXISTE**, déjà utilisé : `src/lib/analytics.ts:30,44`, `app/(tabs)/profil.tsx:720`. |
| Environnements de build séparés | **EXISTE** : `apps/mobile/eas.json` → profils `development` / `preview` / `production`, chacun avec `"environment"` propre. Les 4 `EXPO_PUBLIC_*` sont posées sur les 3 environnements. |
| `process.env.EXPO_PUBLIC_*` en code | **EXISTE** : `src/lib/supabase.ts:10-11`, `src/lib/analytics.ts:12,21`, `src/lib/auth.ts:91`, `src/features/sources/adapters/strava.ts:119`. |
| Nav | **5 onglets** déclarés dans `app/(tabs)/_layout.tsx:47-52` (`index`, `warroom`, `crew`, `classement`, `profil`) ; la barre custom `GrydNavBar.tsx:39-44` n'en affiche que **4** (`/`, `/crew`, `/classement`, `/profil`) — `warroom` est déjà hors barre mais **reste un onglet**. Cible AMENDEMENT-39 §4 : **3** (Carte · Crew · Profil). |
| `expo-router` | **v4** (`~4.0.0`, Expo SDK 52). ⚠ `<Stack.Protected>` n'existe **qu'à partir d'expo-router v5 / SDK 53** → indisponible ici. `Redirect` est disponible et **déjà utilisé** (`app/(tabs)/_layout.tsx:38,42`). |
| Tests | **519 tests Deno** (`supabase/functions/**/*_test.ts`, 32 fichiers). Côté mobile : **un seul** test (`src/features/sources/adapters/gpx-parse.test.ts`) et **aucun runner** (`apps/mobile/package.json` n'a que `start`/`ios`/`android`/`typecheck`). |

**Conséquence majeure** : les tests de non-régression du §6 **ne peuvent pas** être des tests de composant React aujourd'hui. Ils doivent être écrits comme des **tests Deno purs sur des modules purs** (voir §7, commit A) — ce qui est aussi la discipline du skill `gryd` (« moteur PUR + tests Deno »).

---

## 1. Le contrat imposé (forme fondateur, non négociable)

```ts
// packages/shared/src/features.ts  —  À CRÉER
/**
 * GRYD — TABLE DE VISIBILITÉ des surfaces produit (AMENDEMENT-39 §4/§6).
 * Ceci n'est PAS une règle de jeu : aucune valeur ici n'influence un claim, un
 * score, un decay ou une décision serveur (le claim est décidé serveur, CLAUDE.md).
 * Un flag ne cache QUE de l'INTERFACE. Le backend garde tout.
 */
export type FeatureKey =
  | 'missions'
  | 'season'
  | 'arsenal'
  | 'warRoom'
  | 'performance'
  | 'advancedBadges'
  | 'advancedDefense'
  | 'shop';

/** Ce que la PRODUCTION MVP expose. Tout à false = nav 3 onglets (§4). */
export const MVP_FEATURES: Record<FeatureKey, boolean> = {
  missions: false,
  season: false,
  arsenal: false,
  warRoom: false,
  performance: false,
  advancedBadges: false,
  advancedDefense: false,
  shop: false,
};
```

`Record<FeatureKey, boolean>` (et non `Readonly<Record<…>>`) est la forme imposée ; le typage exhaustif garantit qu'ajouter une clé à `FeatureKey` **casse le typecheck** tant que `MVP_FEATURES` n'est pas complété — c'est le filet.

### 1.1 Mapping clé → surfaces réelles (lu dans le code)

| `FeatureKey` | Routes | Modules | Réseau à couper |
|---|---|---|---|
| `missions` | `app/aujourdhui.tsx`, `app/challenges/index.tsx`, `app/challenges/[id].tsx`, `app/settings-motivation.tsx` | `src/features/motivation/*` | — (démo pure) |
| `warRoom` | `app/(tabs)/warroom.tsx` | `src/features/warroom/demo.ts` | — |
| `season` | `app/(tabs)/classement.tsx` | `src/features/social/league.ts`, `leagueBoard.ts` | `leagueBoard.ts:59-60` (`seasons`, `users`) |
| `arsenal` | `app/arsenal.tsx` | `src/features/arsenal/*`, `src/ui/game/ArsenalItemCard.tsx` | — |
| `performance` | `app/performance.tsx` | `src/features/performance/*` | — (`/sources` reste : `performance.tsx:40`) |
| `advancedBadges` | `app/badges.tsx` | `src/features/badges/myBadges.ts` | `myBadges.ts:66-67` (`user_badges`, `user_stats`) |
| `advancedDefense` | *(aucune route dédiée)* | rendu du statut `protegee` sur la carte + bonus Défense Critique | — |
| `shop` | *(aucune route dédiée)* | GRYD Club / IAP dans `arsenal.tsx`, `src/features/settings/sections.ts:78` | `feature_entitlements` |

### 1.2 Deux collisions de vocabulaire — à trancher, pas à ignorer

1. **`missions` vs `warRoom`** : dans le code, la route `/warroom` **est intitulée « Missions »** (`app/(tabs)/_layout.tsx:49` → `title: 'Missions'` ; `app/(tabs)/profil.tsx:226` → `{ label: 'Missions', href: '/warroom' }`). Or `missions` est une clé distincte. **Résolution proposée** : `warRoom` = la route `/warroom` (l'écran War Room) ; `missions` = la couche motivation (`/aujourdhui`, `/challenges`, `/settings-motivation`). Les deux étant `false` au MVP, la collision n'a **aucun effet de rendu** — mais elle doit être documentée en commentaire dans `features.ts`, sinon le prochain qui rallume `missions` croira rallumer `/warroom`.
2. **`arsenal` vs `shop`** : `shop` n'a pas de route propre ; c'est le **sous-bloc monétisation** de `/arsenal` (GRYD Club, objets capés). `arsenal: false` masque déjà tout. `shop` reste utile pour le jour où l'Arsenal revient (V1.5/V2, §6) **sans** sa monétisation. Documenter : `shop ⊂ arsenal`.

---

## 2. (a) Où vivent les flags

### Décision : `packages/shared/src/features.ts` — **PAS** dans `game-rules.ts`

**Pourquoi pas `game-rules.ts`** (trois raisons, toutes vérifiables) :

1. **Sémantique.** `CLAUDE.md` : « toute constante de **JEU** vient de `game-rules.ts` ». Un flag de visibilité n'est pas une constante de jeu : il ne change ni un claim, ni un score, ni un decay. L'y mettre déclencherait exactement la confusion que la règle « aucun nombre magique » veut éviter — et ferait croire qu'un flag peut modifier le jeu, ce qui violerait « tout claim est décidé serveur ».
2. **Le fichier est copié dans les Edge Functions.** `scripts/sync-game-rules.mjs` copie **byte à byte** `badges.ts`, `game-rules.ts`, `types.ts` vers `supabase/functions/_shared/`, et le drift est **testé** (`ingest_run/drift_test.ts`). Mettre les flags dans `game-rules.ts` les embarquerait dans `ingest_run` — un serveur qui connaît l'état de la nav cliente est une porte ouverte au pay-to-win par flag et une charge morte dans le bundle Deno.
3. **`__DEV__` n'existe pas en Deno.** Si un jour la résolution devait cohabiter avec les constantes copiées, elle référencerait un global absent → `deno check` rouge.

**Pourquoi `packages/shared` quand même** (et pas `apps/mobile/src/lib/`) : `apps/web` (site waitlist, puis admin) et une future surface partagée ont besoin de la **même** table de vérité pour dire ce qui est public. La table est de la donnée pure, sans dépendance.

### Les 3 garde-fous de synchronisation (**contrainte dure**)

`sync-game-rules.mjs` ne copie **que** `badges.ts`, `game-rules.ts`, `types.ts`, `bonuses.ts` (+ `packages/engine/src/*`). `features.ts` n'est **pas** dans cette liste, et ne doit **jamais** y entrer. D'où :

| Règle | Raison technique (vérifiée) |
|---|---|
| `features.ts` **n'importe rien** | Aucune dépendance = aucun couplage avec les fichiers copiés. |
| **Aucun** des 4 fichiers copiés (`game-rules`, `types`, `badges`, `bonuses`) n'importe `./features` | La copie serait dans `_shared/` avec un import vers un fichier **absent** → Deno deploy cassé. |
| **Aucun** fichier de `packages/engine/src/` n'importe `@klaim/shared/features` | `transformEngineLine` (sync-game-rules.mjs) ne réécrit que `@klaim/shared/{badges,bonuses,game-rules,types}` : un `@klaim/shared/features` resterait **tel quel** dans `_shared/engine/*.ts` → import bare non résolvable en Deno. Même piège pour `transformMobileLine` (`gps.ts`/`validation.ts` → `apps/mobile/src/features/run/gps/engine/`). |

Ces trois règles vont **en commentaire en tête de `features.ts`** et sont couvertes par un test (§7, commit A).

### Résolution : `apps/mobile/src/lib/features.ts` (à créer)

```ts
// apps/mobile/src/lib/features.ts — À CRÉER
import { MVP_FEATURES, type FeatureKey } from '@klaim/shared';

/**
 * PROD : MVP_FEATURES fait foi (tout false, AMENDEMENT-39 §4).
 * DEV  : tout est ouvert — les écrans restent accessibles au développement (§4).
 * PREVIEW (TestFlight) : override explicite par EXPO_PUBLIC_GRYD_FEATURES
 * (liste de clés séparées par des virgules), posé par ENVIRONNEMENT EAS.
 * MVP_FEATURES n'est JAMAIS muté : la table reste la vérité prod.
 */
const OVERRIDES: ReadonlySet<string> = new Set(
  (process.env.EXPO_PUBLIC_GRYD_FEATURES ?? '').split(',').map((s) => s.trim()).filter(Boolean),
);

export function isFeatureEnabled(key: FeatureKey): boolean {
  if (MVP_FEATURES[key]) return true;
  if (__DEV__) return true;
  return OVERRIDES.has(key);
}
```

`packages/shared/package.json` : ajouter `"./features": "./src/features.ts"` aux `exports` (symétrie avec `./game-rules`, `./badges`…) et `export * from './features';` dans `src/index.ts`. Le mobile consomme `@klaim/shared` (index) — comme aujourd'hui pour `colors`, `IconName`.

---

## 3. (b) Build-time vs runtime : **build-time**, avec un override d'environnement

Le fondateur demande « accessibles en **développement**, cachés en **production** ». C'est littéralement une distinction **de build**, pas de session.

| Option | Verdict |
|---|---|
| **Runtime serveur** (table `feature_flags` + RLS) | **NON au MVP.** Coût : migration + RPC + fetch au boot + états de chargement + fallback offline. Bénéfice au MVP : nul (0 run, 1 user en prod). Et un flag serveur peut échouer/mentir → un onglet qui apparaît/disparaît selon le réseau viole §A (« comprendre l'écran en <3 s »). |
| **Runtime client persisté** (AsyncStorage, menu debug) | **NON au MVP.** Cache réactivable en prod = surface d'exposition d'écrans non finis. |
| **Build-time (`__DEV__` + `EXPO_PUBLIC_*` par environnement EAS)** | **OUI.** `__DEV__` est constant-folded par Metro en release → le code mort est **éliminé du bundle prod** : les écrans cachés ne sont pas seulement invisibles, ils ne partent pas dans l'app. Les 3 environnements EAS (`development`/`preview`/`production`) existent déjà et portent déjà des variables. |

**Non-négociable** : `isFeatureEnabled` est **synchrone et pure**. Pas de hook, pas d'async, pas d'état de chargement. Un flag ne fait jamais clignoter l'UI.

**Quand passer runtime** (V1.5+, hors périmètre) : le jour où l'on veut un **kill-switch** sur une build déjà en boutique (incident) ou un **rollout progressif**. Le contrat `isFeatureEnabled(key): boolean` est alors le seul point à changer — c'est précisément pourquoi tout le reste de l'app ne doit jamais lire `MVP_FEATURES` directement.

---

## 4. (c) Masquer proprement dans expo-router

### Question 1 : une route non exposée dans la nav reste-t-elle atteignable par URL ?

**OUI. Vérifié.** Trois voies, indépendantes de la barre :

1. **Le fichier fait la route.** `expo-router` est file-based : `app/arsenal.tsx` **existe** ⇒ `/arsenal` existe. Retirer un `<Stack.Screen name="arsenal" />` de `app/_layout.tsx:47` ne supprime **rien** — cette balise ne fait que porter des `options`.
2. **Deep link par scheme.** `app.json` → `"scheme": "gryd"` ⇒ `gryd://arsenal` ouvre l'écran. *(Les Universal Links `https://` n'ouvrent rien aujourd'hui : aucun `associatedDomains`/`intentFilters` — c'est le sujet de P0.6, pas de ce document.)*
3. **URL directe sur le preview web** (`RealMap.web.tsx` existe ⇒ le web est une cible réelle) : `…/arsenal` navigue.
4. **Navigation interne survivante.** `router.push('/arsenal')` subsiste **en dur** dans `crew-edit.tsx:174`, `profil-edit.tsx:373`, `crew.tsx:1339`, `crew.tsx:2015`, `src/features/settings/sections.ts:78`. Retirer l'entrée du menu Profil (`profil.tsx:236`) laisse **5 portes ouvertes**.

⇒ **La nav n'est pas un mécanisme de sécurité.** Il faut une garde **dans la route elle-même**.

### Question 2 : redirect ou `Stack.Screen` conditionnel ?

| Approche | Verdict pour GRYD |
|---|---|
| `<Stack.Screen>` conditionnel dans `_layout.tsx` | **NON.** Ne supprime pas la route (cf. Q1) ; ne fait que perdre les `options`. |
| **Supprimer le fichier de route** | **INTERDIT** (AMENDEMENT-39 §4/§6 : « AUCUNE suppression destructive »). |
| `<Stack.Protected guard={…}>` | **INDISPONIBLE** : expo-router v4. À reconsidérer à la montée SDK 53+. |
| **`<Redirect href="/" />` en tête du composant de route** | **OUI.** C'est le pattern **déjà en place** dans `app/(tabs)/_layout.tsx:38,42`. Une seule ligne par route, zéro dépendance, cohérent avec le reste du repo. |

**Le pattern** (à créer, `apps/mobile/src/lib/FeatureGate.tsx`) :

```tsx
import { Redirect } from 'expo-router';
import type { ReactElement } from 'react';
import { isFeatureEnabled } from './features';
import type { FeatureKey } from '@klaim/shared';

/**
 * Garde de ROUTE (AMENDEMENT-39 §4). Une route cachée en prod n'est pas
 * supprimée : elle REDIRIGE vers la Carte. Jamais un écran blanc, jamais un
 * message « indisponible » (l'app ne ment pas : elle ne promet rien qu'elle
 * ne tienne — donc elle ne nomme pas la fonctionnalité cachée).
 */
export function FeatureGate({ feature, children }: { feature: FeatureKey; children: ReactElement }) {
  if (!isFeatureEnabled(feature)) return <Redirect href="/" />;
  return children;
}
```

Usage dans `app/arsenal.tsx` : envelopper l'export par défaut. **Le `<Redirect>` doit être la première chose évaluée** — avant tout `useEffect` déclenchant un fetch, sinon la surface (d) « appels réseau inutiles » n'est pas couverte.

**Cible du redirect : `/` (Carte)**, jamais `router.back()` (le back d'un deep link entrant n'a pas d'historique).

---

## 5. (d) Les 6 surfaces à masquer, et (e) ce qu'on ne masque JAMAIS

### (d) Les 6 surfaces

| # | Surface | Mécanisme | Point d'application réel |
|---|---|---|---|
| 1 | **Routes** | `<FeatureGate feature="…">` en tête du composant | `app/arsenal.tsx`, `app/performance.tsx`, `app/badges.tsx`, `app/aujourdhui.tsx`, `app/challenges/index.tsx`, `app/challenges/[id].tsx`, `app/settings-motivation.tsx`, `app/(tabs)/warroom.tsx`, `app/(tabs)/classement.tsx` |
| 2 | **Onglets** | Filtrer `TABS` **et** les `<Tabs.Screen>` | `GrydNavBar.tsx:39-44` (les 4 items) + `app/(tabs)/_layout.tsx:47-52` (les 5 `Tabs.Screen`) + `RUN_SCREEN_BY_PATH` (`GrydNavBar.tsx:53-59`) |
| 3 | **CTA / liens** | Filtrer les tableaux de liens ; **jamais** rendre un bouton désactivé | `profil.tsx:226` (`/warroom`), `:228` (`/performance`), `:236` (`/arsenal`), `:613`/`:634` (`/badges`), `:460` (`/territoire`) ; `crew.tsx:1339`, `:1681`, `:2015` ; `crew-edit.tsx:174` ; `profil-edit.tsx:373` ; `aujourdhui.tsx:179,188,198` ; `warroom.tsx:1099-1101,1146` ; `parametres/[section].tsx:217` ; `BattleMapOverlays.tsx:303,461` ; `settings/sections.ts:78` |
| 4 | **Notifications** | **Sans objet aujourd'hui** : `expo-notifications` est **absent** de `package.json` (vérifié). Le jour où elle est ajoutée : filtrer à l'**émission** (une notif « ton Arsenal t'attend » alors que l'Arsenal redirige = l'app ment). À poser comme règle dans `features.ts`, pas comme code mort. |
| 5 | **Composants** | Ne pas monter le sous-arbre | `ArsenalItemCard.tsx` dans `crew.tsx:~2015`, blocs badges de `profil.tsx:~600-640`, `src/features/performance/components.tsx` |
| 6 | **Appels réseau inutiles** | **Le garde AVANT le fetch** | `src/features/social/leagueBoard.ts:59-60` (`season`), `src/features/badges/myBadges.ts:66-67` (`advancedBadges`). Vérifié : ce sont les **seuls** fetchs des surfaces masquées. `moderation.ts:190` (crew) et `useRealRun.ts:128` (`ingest_run`) **restent** — ils sont sur le chemin critique. |

**Règle de rendu (§A)** : masquer = **retirer**, jamais griser. Un `GhostButton disabled` ou un « Bientôt » est une promesse — interdit (« l'app ne ment jamais »).

### (e) Ce qu'on ne masque JAMAIS

| Intouchable | Pourquoi | Preuve |
|---|---|---|
| **Moteurs partagés** | `packages/engine/src/*` (22 fichiers) est copié vers `_shared/engine/` et exécuté par `ingest_run`. Un flag dedans ⇒ (1) `transformEngineLine` ne réécrit pas `@klaim/shared/features` ⇒ bundle Deno cassé ; (2) `__DEV__` inexistant en Deno. | `scripts/sync-game-rules.mjs` |
| **Exports consommés par `ingest_run`** | Le claim est décidé serveur. Un flag client ne doit **jamais** pouvoir infléchir un claim, un score ou un decay — ce serait le pay-to-win par build. | `CLAUDE.md` |
| **Règles métier** | `packages/shared/src/game-rules.ts` reste la source unique. `features.ts` ne contient **aucun nombre**. | `CLAUDE.md` |
| **Tests** | Les 519 tests Deno testent le **moteur**, pas la nav. Ils ne doivent **jamais** lire un flag : baseline 519 **inchangée** par tous les commits du §7, sauf les tests **ajoutés** (commits A/B). | baseline vérifiée |
| **Statuts backend** | `advancedDefense: false` cache le **rendu** du statut `protegee` (AMENDEMENT-39 §2 : « statut backend CONSERVÉ, le RENDU passe derrière un flag OFF ») + garde le petit bouclier **au tap**. `FRESH_CAPTURE_PROTECT_HOURS`, `NEW_PLAYER_PROTECTION_DAYS`, `BONUS_PROTECTION_H` (`game-rules.ts:57,58,1346`) continuent de s'appliquer côté serveur. | AMENDEMENT-39 §2 |
| **Le code des écrans cachés** | AMENDEMENT-39 §4/§6 : « RESTENT dans le code », « AUCUNE suppression destructive », Arsenal « réactivable V1.5/V2 ». | AMENDEMENT-39 |

---

## 6. GRAPHE DES APPELANTS (obligatoire — AMENDEMENT-39 §6/§7)

> **Méthode** : `grep` exhaustif sur `router.push|navigate|replace`, `href:`, `href=`, `route:` dans `apps/mobile/{app,src}`, puis lecture de chaque fichier cité. Chiffres de ligne = état HEAD `570c868`.

### 6.0 ⚠ CORRECTION FACTUELLE PRÉALABLE (à ne pas propager)

Le brief affirme : *« territoryStatus.ts lignes 274/284 → contextualAction → bouton GO ; toute suppression de crew-discovery casse GO »*.

**C'est FAUX. Lecture du code :**

- `src/features/territory/territoryStatus.ts` est importé par **un seul fichier** : `app/(tabs)/profil.tsx:69-73`, consommé ligne 294 (`territorySummary(territoryFlag)`). *(Le seul autre hit dans le repo est un **commentaire** : `contextualAction.ts:27` — « Quand la vraie sélection existera (territoryStatus live), il suffira de la passer dans `ContextInput` ». C'est un TODO, pas un import.)*
- `src/features/nav/contextualAction.ts` **n'importe pas** `territoryStatus`. Ses imports (lignes 29-32) sont : `./runContext`, `../run/intention`, `../warroom/demo`, `@klaim/shared`.
- `deriveContextualAction` est appelée **une seule fois** : `GrydNavBar.tsx:71`, avec pour seule entrée `screen`, dérivé de `RUN_SCREEN_BY_PATH[pathname]` (`GrydNavBar.tsx:53-66`). `ContextInput.selectedZone/selectedBoundary/selectedCrewMissionId` **ne sont câblés nulle part** (V1).
- Cibles réelles de GO (`contextualAction.ts:102,114,126,139,150`) : `/course-live` et `goHref(battleContext().plan)`. **Jamais `/crew-discovery`.**

**Le vrai couplage, et il est grave quand même** :
`territoryStatus.ts:274` (`next.route`) et `:284` (`soloCrewHint.route`) → champs de `TerritorySummary` → rendus par `profil.tsx` **comme CTA de la card « MON TERRITOIRE »** → `/crew-discovery`. Cette carte n'est atteignable **que** dans le scénario `solo` (`territoryStatus.ts:262-286`), sélectionné par `?territory=solo` (`profil.tsx:95-98`).
⇒ Masquer `/crew-discovery` **ne casse pas GO**. Ça casse **le CTA du Profil en mode solo** — un bouton qui redirige silencieusement vers la Carte. Le danger est réel, le chemin n'est pas celui annoncé. **`crew-discovery` reste hors périmètre des flags** (§6.1), donc le problème ne se pose pas — mais l'affirmation devait être corrigée avant qu'elle ne devienne doctrine.

**Le vrai risque pour GO est ailleurs** : `contextualAction.ts:31` importe `MISSIONS` depuis `../warroom/demo`. Si `warRoom: false` conduisait quelqu'un à supprimer/vider `src/features/warroom/demo.ts`, **GO casse** (`joinAction` ligne 187). ⇒ **`src/features/warroom/demo.ts` est intouchable**, même avec `warRoom: false`.

---

### 6.1 `crew-discovery` — **PAS DE FLAG. HORS PÉRIMÈTRE.**

**9 références / 4 fichiers** (`grep -c` confirmé) :

| Appelant | Ligne | Contexte |
|---|---|---|
| `app/_layout.tsx` | 52 | `<Stack.Screen name="crew-discovery" />` (options seulement) |
| `src/features/territory/territoryStatus.ts` | 274 | `next.route` du scénario `solo` (CTA « Trouver un crew ») |
| " | 284 | `soloCrewHint.route` (CTA « Découvrir ») |
| `app/(tabs)/crew.tsx` | 220 | `Alert` « Créer mon crew » → bouton « Explorer » |
| " | 226 | `Alert` « Rejoindre avec un code » → bouton « Explorer » |
| " | 252 | `GhostButton` « Explorer les crews autour de moi » (état vide) |
| " | 2305 | `Pressable` « Explorer d'autres crews » (état crew existant) |
| `app/onboarding/index.tsx` | 132 | signature `finish(href: '/' \| '/crew-discovery' \| '/crew')` |
| " | 187 | `CrewStep onJoin={() => void finish('/crew-discovery')}` — **sortie d'onboarding** |

**Ce qui casse si elle disparaît de la nav** :

- 🔴 **`crew.tsx:252` — le PIÈGE.** Lecture de `crew.tsx:212-256` : `EmptyState()` a **3** boutons. `crew.tsx:214-228` : « Créer mon crew » **et** « Rejoindre avec un code » sont **des stubs** — un `Alert.alert(… 'arrive très bientôt' …)` dont le bouton **« Explorer » renvoie lui aussi vers `/crew-discovery`** (lignes 220 et 226). Donc **`/crew-discovery` est la seule issue réelle des 3 boutons**. Le masquer transforme l'onglet Crew en **cul-de-sac total** : 3 boutons, 0 destination. Et Crew est **un des 3 onglets de la nav prod cible** (AMENDEMENT-39 §4). Un onglet sur trois, mort.
- 🔴 **`onboarding/index.tsx:187`** : `CrewStep.onJoin` est une des 3 sorties du flow. `finish()` fait `update({onboardingDone:true})` **puis** `router.replace(href)`. Un redirect en cascade sur `/` juste après un `replace` = fin d'onboarding désorientante. Aggravant : `app/(tabs)/_layout.tsx:37-39` redirige vers `/onboarding` tant que `!onboardingDone` → un mauvais ordonnancement produit une **boucle de redirection**.

**Décision** : `crew-discovery` **n'est associée à aucune `FeatureKey`**. Elle n'est dans aucune des 8 clés du fondateur, elle sert le chemin critique (onboarding + Crew), et elle est la seule chose qui rende l'onglet Crew non vide. Elle est ici **uniquement pour prouver, par le graphe, qu'on n'y touche pas.**

**Test de non-régression à écrire AVANT** (`crew_discovery_guard_test.ts`) :
> Assertion statique : `MVP_FEATURES` ne contient aucune clé associée à `/crew-discovery` dans la table `ROUTE_FEATURE` (§7 commit A), **et** `/crew-discovery` figure dans une liste `CRITICAL_ROUTES` jamais gatable. Rouge si un futur commit l'y range.

---

### 6.2 `warroom` → `warRoom: false`

| Appelant | Ligne | Ce qui casse |
|---|---|---|
| `app/(tabs)/_layout.tsx` | 49 | `<Tabs.Screen name="warroom" title:'Missions' />` — **à retirer** (nav 3 onglets) |
| `app/(tabs)/profil.tsx` | 226 | Lien RACCOURCIS « Missions » → **filtrer** |
| `app/(tabs)/crew.tsx` | 1681 | `router.navigate('/warroom')` → **filtrer** |
| `app/aujourdhui.tsx` | 198 | `router.push('/warroom')` → cohérent : `missions: false` cache déjà `/aujourdhui` |
| `app/parametres/[section].tsx` | 217 | `router.push('/warroom')` → **filtrer** ; `/parametres` **n'est pas** gaté |
| `src/features/map/BattleMapOverlays.tsx` | 303, 461 | 🔴 **PIÈGE** : la **Carte** (onglet prod n°1) pousse vers `/warroom`. Deux CTA qui redirigent silencieusement. **À filtrer impérativement.** |
| `src/features/nav/GrydNavBar.tsx` | 53-59 | `RUN_SCREEN_BY_PATH['/warroom']` ; `:78` `actionOutlined = pathname === '/warroom' \|\| …` → **code inerte** si l'écran est inatteignable ; le laisser est **inoffensif** (`?? null` ⇒ défaut RUN). |
| `src/features/nav/contextualAction.ts` | 31 | 🔴 **`import { MISSIONS } from '../warroom/demo'`** — **NE PAS TOUCHER `src/features/warroom/demo.ts`**. C'est là, et seulement là, que « masquer le War Room » peut casser GO (`joinAction`, ligne 187-188). |

**Tests AVANT** : (1) `deriveContextualAction({})` retourne toujours `kind:'run'` et `deriveContextualAction({screen:'map'})` retourne `'defendre'|'conquerir'` — **indépendamment de tout flag** ; (2) `MISSIONS` non vide.

---

### 6.3 `classement` → `season: false`

| Appelant | Ligne | Ce qui casse |
|---|---|---|
| `app/(tabs)/_layout.tsx` | 51 | `<Tabs.Screen name="classement" />` → à retirer |
| `src/features/nav/GrydNavBar.tsx` | 42 | **Item de barre « Saison »** → à filtrer. 🔴 **PIÈGE GÉOMÉTRIE** : la barre est `TABS.slice(0,2)` + slot central + `TABS.slice(2)` (`GrydNavBar.tsx:120-123`). Passer de 4 à 3 items donne **2 à gauche / 1 à droite** → bouton GO **décentré**. Le slicing doit devenir dynamique (`Math.ceil(n/2)`) **et** la cible 3 onglets (Carte · Crew · Profil) impose 2/1 ou 1/2 : à trancher visuellement, pas à subir. |
| `app/(tabs)/profil.tsx` | 225 | Lien « Saison » → filtrer |
| `src/features/social/leagueBoard.ts` | 59-60 | **Surface (d)6** : `supabase.from('seasons')` + `from('users')`. Prod a **2 seasons actives** (paris, lille) → ce fetch réussit et sert à un écran inatteignable. **Couper.** |

**Test AVANT** : les items de barre dérivent de `isFeatureEnabled` ; la répartition gauche/droite reste équilibrée pour n=3 et n=4 (test pur sur la fonction de slicing extraite).

---

### 6.4 `arsenal` → `arsenal: false` (+ `shop: false`)

| Appelant | Ligne |
|---|---|
| `app/_layout.tsx` | 47 (`<Stack.Screen>`) |
| `app/(tabs)/profil.tsx` | 236 (lien « Arsenal ») |
| `app/(tabs)/crew.tsx` | 1339, 2015 |
| `app/crew-edit.tsx` | 174 |
| `app/profil-edit.tsx` | 373 |
| `src/features/settings/sections.ts` | 78 (`href: '/arsenal'`) — **donnée**, pas JSX : filtrer au **rendu** de la section, ou dériver la liste. `sections.ts` est consommé par `app/parametres/[section].tsx`, **non gaté**. |

🔴 **PIÈGE** : `crew-edit.tsx:174` et `profil-edit.tsx:373` sont des flux d'**édition** (choisir un skin/emblème). Le CTA n'est pas décoratif : il est la seule source d'items. Le retirer laisse un sélecteur **sans moyen d'obtenir** ce qu'il sélectionne. Vérifier que ces écrans restent cohérents sans Arsenal — sinon `crew-edit`/`profil-edit` doivent perdre le bloc entier, pas juste le bouton.

**Test AVANT** : aucun `href` d'Arsenal ne survit dans la liste de liens dérivée quand `arsenal:false` (test pur sur le dériveur de `LINKS` / `sections.ts`).

---

### 6.5 `performance` → `performance: false`

| Appelant | Ligne | Note |
|---|---|---|
| `app/_layout.tsx` | 50 | `<Stack.Screen>` |
| `app/(tabs)/profil.tsx` | 228 | Lien « Performance » → filtrer |
| `app/performance.tsx` | 40 | `router.push('/sources')` — **sortante**, `/sources` **n'est pas** gaté (Sources connectées reste accessible depuis `profil.tsx:239-243`). Aucun orphelin. |

*Les autres hits `grep "performance"` (`course-live.tsx`, `partage.tsx`, `history/*`, `route/types.ts`…) sont le **mot** « performance » dans du texte/typage, pas la route. Vérifié : aucun `router.push('/performance')` en dehors du menu Profil.*

**Test AVANT** : `/performance` gaté ⇒ zéro `href:'/performance'` dans les liens dérivés.

---

### 6.6 `badges` → `advancedBadges: false` — ⚠ le plus délicat

| Appelant | Ligne | Ce qui casse |
|---|---|---|
| `app/_layout.tsx` | 46 | `<Stack.Screen>` |
| `app/(tabs)/profil.tsx` | 613, 634 | **2 CTA** vers `/badges` **+ le bloc de progression de badges** rendu inline (`profil.tsx:~600-706`, dérivé de `src/features/badges/catalog.ts`) |
| `app/aujourdhui.tsx` | 179 | `router.push('/badges')` — cohérent (`missions:false` cache `/aujourdhui`) |
| `app/course-result.tsx` | — | 🔴 **PIÈGE MAJEUR** : `course-result` est **sur le chemin critique P0.3/P0.5** (retour de course → capture → partage). S'il affiche un badge gagné qui pousse vers `/badges`, le joueur tape et **atterrit sur la Carte**. **`course-result.tsx` ne doit pas être gaté** ; seul son lien sortant vers `/badges` doit l'être — et si un badge est **réellement** gagné, `advancedBadges:false` doit encore **annoncer le gain** (le serveur l'a attribué : `engine/badges.ts` + `ingest_run`), **sans** proposer la collection. Cacher le gain = l'app ment sur ce que le serveur a fait. |
| `app/crew-discovery.tsx`, `amis.tsx`, `crew-public.tsx`, `parametres/[section].tsx` | — | affichent des **badges** (composant `BadgeHex`/`BadgeCard`), pas la route `/badges`. **Ne pas confondre** : `advancedBadges` gate **la collection**, pas l'icône. |
| `src/features/badges/myBadges.ts` | 66-67 | **Surface (d)6** : `from('user_badges')` + `from('user_stats')` → couper. |

**Tests AVANT** : (1) le moteur `packages/engine/src/badges.ts` **ne lit aucun flag** (les 519 restent verts, dont `badges_test.ts`) ; (2) `course-result` n'est pas dans `ROUTE_FEATURE`.

---

### 6.7 `challenges` + `aujourdhui` → `missions: false`

| Route | Appelants |
|---|---|
| `/aujourdhui` | `_layout.tsx:59` ; `warroom.tsx:1099` (`href:'/aujourdhui'`) ; `settings-motivation.tsx` ; `crew.tsx` (icône `aujourdhui` ligne 1016 = **icône**, pas la route) |
| `/challenges` | `_layout.tsx:60-61` ; `aujourdhui.tsx:188` ; `warroom.tsx:1100,1146` ; `challenges/index.tsx:31` → `/challenges/${id}` (interne) |
| `/settings-motivation` | `_layout.tsx:62` ; `aujourdhui.tsx` ; `warroom.tsx:1101` |

**Cluster fermé** : tous les appelants externes sont `/warroom` (`warRoom:false`) et entre eux. **Aucun appelant depuis Carte / Crew / Profil.** ⇒ **le cluster le moins risqué. À faire en premier** (commit B, §7).
🔴 Sauf : `aujourdhui.tsx:78` → `/route-planner`, et `warroom.tsx:766-930` → `/route-planner?type=…`. **`/route-planner` n'est PAS gaté** (il sert la conquête / le chemin critique) : ce sont des sorties, elles ne créent pas d'orphelin. Ne pas le ranger dans `missions` par association.

---

### 6.8 `territoire` → **PAS DE FLAG**

**Aucune des 8 clés ne le couvre.** Appelé par `profil.tsx:460` (card « MON TERRITOIRE » tappable) et par **4 des 5 scénarios** de `territoryStatus.ts` (lignes 182, 204, 230, 250 — `crew_multi`, `crew_mono`, `beginner`, `under_attack`). C'est le détail du territoire = **cœur du produit**, pas une feature secondaire. **Intouchable**, et à ranger dans `CRITICAL_ROUTES` avec `crew-discovery`.
*Note : `territoire.tsx:118,137,159,190` poussent vers `/(tabs)` — sorties saines.*

### 6.9 `amis` → **PAS DE FLAG** (au MVP)

Appelants : `_layout.tsx:57`, `profil.tsx:227`. Aucune des 8 clés ne le couvre. Le social crew est dans les 3 onglets prod. **Laisser ouvert** ; si le fondateur veut le fermer, ça demande une **9e clé** — pas un détournement de `missions`.

---

### 6.10 Synthèse du graphe

| Route | Clé | Appelants ext. | Risque | Le piège en une ligne |
|---|---|---|---|---|
| `crew-discovery` | **aucune** | 4 fichiers / 9 réfs | 🔴 | Seule issue des 3 boutons stubs de Crew (`crew.tsx:220/226/252`) → onglet prod mort. |
| `warroom` | `warRoom` | 6 fichiers | 🔴 | La **Carte** y pousse (`BattleMapOverlays:303,461`) ; `warroom/demo.ts` alimente GO (`contextualAction:31`). |
| `classement` | `season` | 3 fichiers | 🟠 | Le slicing 2/2 de `GrydNavBar:120-123` décentre GO à n=3 ; fetch `leagueBoard:59-60` à couper. |
| `arsenal` | `arsenal`+`shop` | 5 fichiers | 🟠 | `crew-edit:174` / `profil-edit:373` = flux d'édition privés de leur source d'items. |
| `badges` | `advancedBadges` | 4 fichiers | 🟠 | `course-result` est chemin critique ; ne jamais cacher un gain que le serveur a attribué. |
| `performance` | `performance` | 2 fichiers | 🟢 | RAS ; `/sources` reste ouvert. |
| `aujourdhui`+`challenges`+`settings-motivation` | `missions` | cluster fermé | 🟢 | `/route-planner` n'est pas dans le cluster. |
| `territoire` | **aucune** | 5 réfs | — | Cœur produit. `CRITICAL_ROUTES`. |
| `amis` | **aucune** | 2 réfs | — | Aucune clé ne le couvre. |

---

## 7. Plan d'application — commits séparés, chacun gate-vérifiable

> **Le GATE (les 4, à chaque commit)** :
> 1. `npm run typecheck` — **par code de sortie**, jamais un grep ;
> 2. `~/.deno/bin/deno check supabase/functions/*/index.ts` — **chaque** fonction (sans ça les Edge ne sont jamais typecheckées : trou réel, a déjà laissé passer un `ReferenceError` en prod) ;
> 3. `~/.deno/bin/deno test --allow-read supabase/functions/` — **≥ 519** ;
> 4. `node scripts/sync-game-rules.mjs && git status supabase/functions/_shared` — **zéro drift**.

| # | Commit | Contenu | Vérif spécifique au-delà du gate |
|---|---|---|---|
| **A** | *feat: contrat de flags + garde-fous (aucun rendu changé)* | `packages/shared/src/features.ts` (`FeatureKey` + `MVP_FEATURES`) ; export dans `index.ts` + `package.json` ; `apps/mobile/src/lib/features.ts` (`isFeatureEnabled`) ; `src/lib/FeatureGate.tsx` ; tables **pures** `ROUTE_FEATURE` + `CRITICAL_ROUTES` (`crew-discovery`, `territoire`, `course-result`, `route-planner`, `sources`, `partage`, `course-live`) ; **+ tests Deno** : (a) `features.ts` n'importe rien ; (b) aucun fichier copié ni `packages/engine/src/*` n'importe `@klaim/shared/features` (grep programmatique — le pare-feu du §2) ; (c) `ROUTE_FEATURE ∩ CRITICAL_ROUTES = ∅`. **Zéro appel** à `isFeatureEnabled` dans un composant.| Baseline **> 519** (tests ajoutés). Aucun écran ne bouge : diff visuel nul. |
| **B** | *feat(missions): gate cluster motivation* | `<FeatureGate feature="missions">` sur `/aujourdhui`, `/challenges/index`, `/challenges/[id]`, `/settings-motivation` ; filtrer `warroom.tsx:1099-1101,1146` et `aujourdhui.tsx:188`. **Cluster fermé (§6.7)** ⇒ premier. | Dev : 4 écrans accessibles. Prod-sim (`EXPO_PUBLIC_GRYD_FEATURES=""` + build release) : `gryd://aujourdhui` → Carte. `/route-planner` **toujours** joignable. |
| **C** | *feat(performance): gate* | `<FeatureGate>` sur `/performance` ; filtrer `profil.tsx:228`. Le plus isolé après B. | `/sources` reste joignable depuis `profil.tsx:239`. |
| **D** | *feat(arsenal,shop): gate + audit des flux d'édition* | `<FeatureGate>` sur `/arsenal` ; filtrer `profil.tsx:236`, `crew.tsx:1339,2015`, `crew-edit.tsx:174`, `profil-edit.tsx:373`, `settings/sections.ts:78`. **Décider** (§6.4) si `crew-edit`/`profil-edit` perdent le bloc entier. | `crew-edit` et `profil-edit` restent **cohérents** sans Arsenal (revue §A : pas de sélecteur orphelin). |
| **E** | *feat(advancedBadges): gate collection + coupure fetch* | `<FeatureGate>` sur `/badges` ; filtrer `profil.tsx:613,634` + le bloc inline ; **garde avant** `myBadges.ts:66-67`. **`course-result` NON gaté** : le gain reste annoncé (§6.6). | Réseau : zéro requête `user_badges`/`user_stats` en prod-sim. `badges_test.ts` inchangé. |
| **F** | *feat(season): gate onglet Saison + coupure fetch + slicing de barre* | `<FeatureGate>` sur `/classement` ; retirer `<Tabs.Screen name="classement">` (`_layout.tsx:51`) ; **extraire le slicing** de `GrydNavBar.tsx:120-123` en fonction pure + test (n=3 ⇒ GO centré) ; garde avant `leagueBoard.ts:59-60`. | **Le commit qui touche la géométrie de la barre.** Test pur du slicing + capture visuelle n=3. |
| **G** | *feat(warRoom): gate — nav prod à 3 onglets* | `<FeatureGate>` sur `/warroom` ; retirer `<Tabs.Screen name="warroom">` (`_layout.tsx:49`) ; filtrer `profil.tsx:226`, `crew.tsx:1681`, `parametres/[section].tsx:217`, **`BattleMapOverlays.tsx:303,461`**. **NE PAS TOUCHER `src/features/warroom/demo.ts`** (`contextualAction.ts:31` → GO). | 🔴 Test **GO** obligatoire : `deriveContextualAction({})` ⇒ `'run'` ; `{screen:'map'}` ⇒ `'defendre'|'conquerir'`. **Test terrain** : GO depuis la Carte lance encore la course. Aucun CTA de la Carte ne redirige. |
| **H** | *feat(advancedDefense): rendu carte du statut protégé OFF (AMENDEMENT-39 §2)* | Le **rendu** carte du statut `protegee` passe derrière le flag ; **le bouclier AU TAP reste** ; statut backend intact. | Les 519 verts (`claims_test.ts`, `bonus_test.ts`) : le moteur ignore le flag. `FRESH_CAPTURE_PROTECT_HOURS`/`BONUS_PROTECTION_H` inchangés. |
| **I** | *chore: cohérence 3 onglets + doc* | `RUN_SCREEN_BY_PATH` nettoyé ; commentaires `features.ts` (collisions `missions`/`warRoom`, `shop ⊂ arsenal`, règle notifications) ; `.env.example` mobile → `EXPO_PUBLIC_GRYD_FEATURES` ; `EXPO_PUBLIC_GRYD_FEATURES` posée sur l'environnement EAS `preview`. | Preview EAS : `EXPO_PUBLIC_GRYD_FEATURES=arsenal,season` rallume 2 surfaces sans rebuild prod. |

**Ordre = risque croissant** : B (cluster fermé) → C (isolé) → D/E (liens dispersés) → F (géométrie de barre) → G (**GO + Carte**) → H (carte). Aucun commit ne touche `crew-discovery`, `territoire`, `amis`, `course-result`, `route-planner`, `sources`.

**Rollback** : chaque commit est indépendant ; en cas de casse, `EXPO_PUBLIC_GRYD_FEATURES=<clé>` rallume la surface sur preview **sans revert**, le temps de corriger.

---

## 8. Les 5 pièges, en une phrase chacun

1. **`crew.tsx:252`** — « Créer » et « Rejoindre » sont des **stubs** (`crew.tsx:214-228`) dont l'Alert renvoie elle aussi vers `/crew-discovery` : gater `/crew-discovery` tue **l'onglet Crew entier**, soit 1 des 3 onglets prod. → **Aucun flag dessus. `CRITICAL_ROUTES`.**
2. **`contextualAction.ts:31`** — GO importe `MISSIONS` de `../warroom/demo` : `warRoom:false` ne doit **jamais** dégénérer en suppression de `src/features/warroom/demo.ts`, sinon **GO casse** (`joinAction:187`).
3. **`BattleMapOverlays.tsx:303,461`** — la **Carte** (onglet n°1) pousse vers `/warroom` : sans filtrage, deux CTA du premier écran redirigent silencieusement.
4. **`GrydNavBar.tsx:120-123`** — `slice(0,2)` / `slice(2)` : à 3 onglets, le bouton **GO se décentre**. La géométrie de la barre est un effet de bord non évident du flag `season`.
5. **`course-result`** — chemin critique P0.3/P0.5 : `advancedBadges:false` peut cacher **la collection**, jamais **le gain** que le serveur a réellement attribué (`engine/badges.ts` → `ingest_run`) — sinon l'app ment.

**Et le piège méta** : la nav **n'est pas** une sécurité. `app/arsenal.tsx` existe ⇒ `/arsenal` existe ⇒ `gryd://arsenal` l'ouvre, et 5 `router.push('/arsenal')` en dur y mènent encore. **Seul le `<Redirect>` en tête de route ferme la porte** ; retirer un `<Stack.Screen>` de `app/_layout.tsx` ne ferme rien.
---

# ANNEXE — CORRECTIONS DE LA RELECTURE DE COHÉRENCE (autorité sur le corps du document)

Ces 3 documents ont été rédigés en parallèle puis relus par un agent de cohérence qui a re-vérifié le code.
**En cas de contradiction, cette annexe prime.**

## Faits VÉRIFIÉS (fiables)
- `h3-js` installé en **4.5.0** : `cellsToMultiPolygon` ET `cellArea` existent. `expo` = **52.0.49**,
  RN 0.76.9, `react-native-svg` 15.8.0 présent. Les 4 deps image sont bien ABSENTES.
- Versions Expo-compatibles EXACTES (source `expo/bundledNativeModules.json`, SDK 52) :
  `react-native-view-shot ~4.0.3` · `expo-sharing ~13.0.1` · `expo-file-system ~18.0.12` ·
  `expo-clipboard ~7.0.1` · `expo-media-library ~17.0.6` · `expo-image-manipulator ~13.0.6`.
- `cellsToTerritory()` (`map/territory.ts:258`) = fusion h3 + lissage Chaikin + simplify : **DÉJÀ ÉCRIT**.
  Son en-tête dit « conservé UNIQUEMENT pour les clusters France démo » → à re-cibler, pas à réécrire.
- `hex_claims_city_idx` (`0002_schema.sql:140`) et la policy `hex_claims_select_all` (`0003_rls.sql:114`)
  existent → la lecture carte par `city_id` marche **sans nouvelle migration ni index**.
- `SHARE_HOST` est à **`shareDeepLink.ts:20`** (et non :22).

## ERREURS À NE PAS PROPAGER
- 🔴 **`h3ToDb` / `dbToH3` NE SONT PAS RÉUTILISABLES.** Ce sont des `const` **privées, non exportées**, dans
  `supabase/functions/ingest_run/index.ts:146-148` (fichier Deno), absentes de `_shared/` et de
  `packages/shared`. Le mobile **ne peut pas les importer**. → **Chantier réel** : extraire la conversion
  bigint↔hex vers `packages/shared` (et décider si elle passe par `sync-game-rules.mjs`). Tout doc qui dit
  « déjà là, réutiliser » est faux.
- 🔴 **`territoryStatus` n'alimente PAS le bouton GO.** Il n'est importé que par `app/(tabs)/profil.tsx:73`.
  `contextualAction.ts` importe `runContext`, `intention`, `warroom/demo`, `@klaim/shared` — jamais
  `territoryStatus`. Le risque `/crew-discovery` est réel mais porte sur **Profil + onboarding + Crew**
  (9 réfs / 4 fichiers), **pas sur GO**. Voir AMENDEMENT-39 §7 (corrigé).
- 🟠 `territoryGeoByState()` / `territoryStateLayers()` : signatures **non vérifiées** — à ouvrir avant de
  planifier le diff de P0.2.

## CONTRADICTIONS ENTRE DOCS — arbitrages
| Sujet | Tranché |
|---|---|
| Fichier/timing des flags | **UN seul** module, créé au **premier besoin réel** (P0.2 a besoin du flag « rendu bleu protégé », AMENDEMENT-39 §2). Pas de doublon `lib/flags.ts` + `shared/features.ts`. |
| Chemin `mission/` | Suit `CRITICAL_PATH` : `mission` **disparaît** du modèle de partage, `defaultShareTarget` → `{kind:'zone'}`. |
| Preuve du pipeline image | **Android d'abord** (`eas build -p android` ne demande AUCUN compte Apple) → P0.4/P0.5 sont vérifiables **sans F1**. `CRITICAL_PATH` surestimait le blocage Apple sur ces 2 étapes. |
| `areaKm2` | P0.5 **dépend** de P0.2 (`cellArea` de h3-js 4.5.0 est la source honnête). Pas de surface inventée dans la story. |
| Constantes de partage (1080×1920) | Vont dans un module de config partagé, pas en dur dans la prose. |

## TROU MAJEUR — non traité par les 3 docs : AMENDEMENT-39 §3 (GO + verbes contextuels)
État réel vérifié :
- `GrydNavBar.tsx:145` rend **`GO` en dur, toujours** — le rendu **ignore `action.label`**.
- `contextualAction.ts` produit : `RUN` (:97), `DÉFENDRE` (:111), `CONQUÉRIR` (:123), `TERMINER` (:135),
  `REJOINDRE` (:154). → **`REPRENDRE` n'existe pas** ; `RUN` ≠ `GO` ; `REJOINDRE` n'est pas au menu du §3.
- Les en-têtes `contextualAction.ts:33` et `GrydNavBar.tsx:9` disent encore « **jamais GO** » (hérité de
  l'AMENDEMENT-29, contredit par l'AMENDEMENT-38 puis réconcilié par le §3).
→ **Chantier réel, non planifié, non chiffré** : brancher `action.label` sur le rendu, créer `REPRENDRE`,
  mapper `RUN`→`GO` (générique seul), purger les commentaires « jamais GO ». À insérer dans le plan.
