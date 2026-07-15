# CRITICAL_PATH_TO_FIRST_REAL_CAPTURE.md

> **But unique** : une vraie personne se connecte, court dehors, ferme une boucle, voit SA zone sur la carte, publie une story avec un deep link qui ouvre l'app.
> Tant que ce parcours n'est pas fait **une fois, en vrai, dehors**, rien d'autre ne compte. Aucun écran supplémentaire, aucune mécanique, aucun amendement.
>
> **Cadre** : AMENDEMENT-39 (arbitrages fermes, appliqués, non rediscutés). Aucune suppression destructive. Aucune donnée factice.

---

## 0. État de départ — ce qui est VRAI aujourd'hui

| Brique | État réel | Preuve |
|---|---|---|
| Backend | 36 migrations appliquées, 8 Edge Functions déployées, RLS partout | `supabase/migrations/0001…0036` |
| Données prod | **1 user, 0 run, 0 hex_claims, 0 crew, 0 secteur** ; 2 saisons actives (paris, lille) ; `city_zones` = vrais contours (0033) | requête prod |
| `ingest_run` | Complet : anti-triche, throttle (0035), `detectLoop`, décide TOUS les claims, renvoie `results: HexClaimResult[]` avec les `h3` string | `supabase/functions/ingest_run/index.ts`, `packages/shared/src/types.ts:129` |
| Auth | Flux Apple **codé et correct** (nonce hashé/brut, `signInWithIdToken`) | `apps/mobile/src/lib/auth.ts` |
| Session | Persistance AsyncStorage + `onAuthStateChange` **déjà branchés** | `apps/mobile/src/lib/session.tsx`, `src/lib/supabase.ts` |
| Provisioning user | Trigger 0028 auto-crée `public.users` à l'inscription | `supabase/migrations/0028_*.sql` |
| Carte | **Zéro lecture de `hex_claims`** — les 9 occurrences dans `apps/mobile` sont des commentaires TODO | grep |
| Fusion H3 → polygones lissés | **DÉJÀ ÉCRITE** : `cellsToTerritory()` (h3 `cellsToMultiPolygon` + Chaikin + simplify) | `apps/mobile/src/features/map/territory.ts:258` |
| Rendu par état | `territoryStateLayers(emph, basemap, selectedZoneId)` consomme `territoryGeoByState()` | `mapStyle.ts:1321`, `allTerritories.ts:278` |
| Partage | Templates + `ShareMap.tsx` (react-native-svg) + privacy (masquage domicile) OK — mais `openShareSheet()` fait `Share.share({message})` = **TEXTE SEUL** | `src/features/share/shareActions.ts` |
| Deep links | Host `gryd.run`, chemins `zone/`, `crew/`, `mission/`, `run/share/` — **aucun `associatedDomains`, aucun `intentFilters`** dans `app.json` ⇒ un lien https **n'ouvre jamais l'app** | `shareDeepLink.ts`, `apps/mobile/app.json` |
| Deps image | `react-native-view-shot`, `expo-sharing`, `expo-file-system`, `expo-clipboard` : **toutes absentes** de `apps/mobile/package.json` |  |
| Feature flags | **N'existe pas** (`feature_entitlements` = IAP/club, sans rapport) |  |

**Environnement figé** : Expo SDK `~52.0.0`, React Native `0.76.9`, React `18.3.1`, `newArchEnabled: false`, bundle `fr.nexus1993.gryd`, scheme `gryd`, EAS projectId `4c80219c-…`. Les 4 `EXPO_PUBLIC_*` sont posées sur les 3 profils EAS.

---

## 1. Graphe de dépendance et parallélisation

```
FONDATEUR                              MOI (code)
─────────────────────────────────────────────────────────────────
[F1] Apple Developer Program  ──┐
[F2] Provider Apple / Supabase ─┼──►  P0.1 Auth réelle
                                │       │
                                │       ▼
                                │     P0.2 Carte lit hex_claims  ◄── (indépendant de F1/F2)
                                │       │
                                └──►  P0.3 TEST TERRAIN  ◄─ dev build EAS (dépend de F1)
                                        │
                     ┌──────────────────┴──────────────────┐
                     ▼                                     ▼
                   P0.4 deps image                       P0.6 deep links
                     │                                     │
                     ▼                              [F3] DNS gryd.app
                   P0.5 Story 9:16 réelle           [F4] hébergement AASA/assetlinks
```

**Parallélisable dès maintenant, sans rien attendre du fondateur :**
- **P0.2** en entier (code + tests) — c'est la plus grosse pièce et elle ne dépend d'aucun credential.
- **P0.4** (installation + câblage des deps) et le rendu **P0.5** — vérifiables en dev build ou simulateur.
- La **partie code** de P0.6 (unification des chemins, `associatedDomains`/`intentFilters`, routes expo-router, génération des fichiers AASA/assetlinks) — seule leur **mise en ligne** attend le fondateur.

**Séquentiel dur :** P0.3 ne peut pas précéder P0.1 + P0.2 (il les valide). P0.5 ne peut pas précéder P0.4. La validation finale de P0.6 ne peut pas précéder F3+F4 + un build signé.

**Ordre recommandé (réel) :** `P0.2 ∥ P0.4 ∥ (code de P0.6)` → `P0.1` (dès que F1/F2 tombent) → `P0.3` → `P0.5` → `P0.6 validé`.

---

## P0.1 — Auth Apple réelle, session persistante, profil minimal

### (a) Objectif
Un inconnu ouvre GRYD, tape « Continuer avec Apple », et se retrouve sur la carte avec un compte réel qui survit au redémarrage de l'app.

### (b) État réel — **ne rien reconstruire**
- `apps/mobile/src/lib/auth.ts` : `signInWithApple()` **complet et juste**. Nonce SHA-256 chez Apple / brut chez Supabase. Gère `ERR_REQUEST_CANCELED` → `cancelled` (jamais un mur).
- `apps/mobile/src/lib/session.tsx` : `SessionProvider` avec `getSession()` + `onAuthStateChange`. `supabase.ts` : `persistSession: true`, `storage: AsyncStorage`, `autoRefreshToken: true`. **La persistance est déjà là.**
- `app.json` : plugin `expo-apple-authentication` déjà déclaré, `expo-apple-authentication ~7.1.3` installé.
- `supabase/migrations/0028_*` : trigger → `public.users` auto-provisionné. **Pas de code de création de profil à écrire.**
- `apps/mobile/app/(auth)/sign-in.tsx` : redirige vers `/` si `!configured`.

**Conclusion honnête : il ne manque quasiment pas de code. Il manque des credentials.**

### (c) Ce qu'il faut faire précisément
| Qui | Quoi |
|---|---|
| MOI | `sign-in.tsx` : afficher les erreurs réelles. Aujourd'hui `AuthFailureReason` a 5 valeurs ; l'écran doit distinguer `cancelled` (silence, on ne dit rien), `no_identity_token` / `auth_error` (message + retry), `google_not_configured` (bouton Google **caché**, pas grisé — un bouton mort est un mensonge). |
| MOI | Vérifier que `app/_layout.tsx` bloque bien l'accès à `(tabs)` quand `configured && !session && !loading`. Ne PAS ajouter un splash : `loading` existe déjà. |
| MOI | `signOut()` existe (`auth.ts`) — s'assurer qu'il est atteignable depuis Profil (chemin de sortie obligatoire pour le test terrain). |
| MOI | **Google : ne rien faire.** `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` absent ⇒ `google_not_configured`. Apple seul suffit pour la première capture réelle (test iPhone). Google = post-P0.3. |
| **FONDATEUR** | **[F1]** Apple Developer Program (99 $/an) — bloquant pour TOUT dev build signé, donc pour P0.3. |
| **FONDATEUR** | **[F1b]** Créer l'App ID `fr.nexus1993.gryd`, activer la capability **Sign In with Apple**. |
| **FONDATEUR** | **[F2]** Supabase → Authentication → Providers → **Apple** : activer, renseigner Services ID / Team ID / Key ID / clé `.p8`. |
| **FONDATEUR** | Ajouter `fr.nexus1993.gryd` dans le champ « Client IDs » du provider Apple Supabase (**piège classique** : sans le bundle id natif, `signInWithIdToken` renvoie `invalid audience`). |

**Aucune migration SQL. Aucune dépendance à ajouter.**

### (d) Qui fait quoi
- **FONDATEUR** : F1, F1b, F2 (~1 h de console, 0 ligne de code).
- **MOI** : durcissement des erreurs `sign-in.tsx`, garde de session, sortie signOut.

### (e) Vérification observable
> Sur un **iPhone physique** avec dev build : je tape « Continuer avec Apple », la feuille Apple native s'ouvre, je valide Face ID → j'arrive sur la carte.
> Je **tue l'app** (swipe up), je la rouvre → **je suis toujours connecté, aucune feuille d'auth**.
> En base : `select count(*) from auth.users` = 2, et `select count(*) from public.users` = 2 (le trigger 0028 a fait son travail).

« Ça compile » ne prouve rien ici. Le seul critère est : **une deuxième ligne dans `auth.users` créée par un vrai Face ID.**

### (f) Risques & pièges
- **Sign In with Apple ne fonctionne PAS dans Expo Go ni sur simulateur non signé.** Dev build EAS obligatoire ⇒ F1 est le vrai chemin critique.
- Bundle id ≠ Services ID : Apple en veut deux. Le natif utilise le **bundle id** comme audience.
- Horloge décalée sur l'appareil → `identityToken` rejeté. Rare mais brutal à diagnostiquer.
- `makeRedirectUri({ scheme: 'gryd' })` dans `signInWithGoogle` a un TODO connu (reversed client id) : **hors périmètre P0**, ne pas y toucher.

---

## P0.2 — La carte lit les vraies captures (territoires **fusionnés**, pas une mosaïque)

### (a) Objectif
Les hexagones réellement capturés en base apparaissent sur la carte comme **une surface unique lissée**, pas comme un nid d'abeilles.

### (b) État réel — **la moitié du travail est déjà écrite**
- **Fusion** : `apps/mobile/src/features/map/territory.ts:258` → `cellsToTerritory(cells, state)` fait exactement ce qu'il faut : `cellsToMultiPolygon(cells, true)` → `[lng,lat]`, anneaux fermés → `openRing` → `smoothRing` (Chaikin 2 itérations, ratio 0,25, simplify 24 m). Il renvoie `{ state, polygons, labelAnchor, zoneCount }`.
  ⚠️ **Son en-tête dit que ses polygones « ne sont plus jamais dessinés »** (AMENDEMENT-13 §4ter, « la frontière EST le tracé du coureur »). Seul consommateur restant : `franceTerritories.ts` pour du comptage. **P0.2 ressuscite ce pipeline pour le rendu**, ce qui est un changement de doctrine à assumer explicitement : la démo dessine des tracés d'authoring ; la prod dessinera des **cellules fusionnées**, parce que c'est la seule vérité que le serveur possède.
- **Rendu** : `mapStyle.ts:1321` `territoryStateLayers(emph, basemap, selectedZoneId)` appelle `territoryGeoByState()` (`allTerritories.ts:278`), qui renvoie une `ReadonlyMap<TerritoryState, FeatureCollection>` **entièrement démo/mémoïsée** (`geoByStateCache`).
- **Contrat de feature déjà établi** : chaque feature porte `properties: { state, zoneId }` — lu au tap (`queryRenderedFeatures`) et au dimming. **À respecter.**
- **Retour serveur** : `IngestRunResponse.results: HexClaimResult[]` contient les `h3` en string + l'`outcome`. **La liste des hexes gagnés est déjà dans la réponse de capture** — pas besoin de refetch pour le feedback immédiat.
- **Index** : `hex_claims_city_idx on (city_id) where city_id is not null` **existe** (0002). Aucun index spatial lat/lng, aucune extension h3 côté Postgres (vérifié : `pg_available_extensions` n'en propose aucune ; postgis est là mais inutile ici).
- **RLS** : `hex_claims_select_all` (0003) = **lecture publique déjà autorisée** au client anon/authenticated. Écriture révoquée. **Zéro migration RLS à écrire.**

### (c) Ce qu'il faut faire — le chemin le plus court qui marche

**La requête la plus simple qui marche (et rien de plus) :**

```
select h3index, owner_user_id, claim_type, decay_at, shielded_until, locked_until
from hex_claims
where city_id = 'paris'
```

- Filtre `city_id` ⇒ **utilise l'index existant**, zéro migration.
- Volumes MVP (Paris + Lille, poignée de coureurs) ⇒ **pas de filtre viewport, pas de LOD, pas de cellules parentes, pas de pagination.** Le faire maintenant serait de l'optimisation prématurée sur 0 ligne de données.
- `h3index` est un **bigint** en base. `ingest_run` a déjà `h3ToDb` / `dbToH3` : **réutiliser la même conversion côté client**, ne pas en réécrire une (`Number` sur un h3 res 10 perd des bits — c'est le piège n°1).

**Fichiers à CRÉER :**

| Fichier | Rôle |
|---|---|
| `apps/mobile/src/features/map/liveClaims.ts` | **Pur** : `HexClaimRow[] → ReadonlyMap<TerritoryState, FeatureCollection>`. Groupe les lignes par `TerritoryState` (voir mapping ci-dessous), appelle `cellsToTerritory()` par groupe, émet des `Polygon`/`MultiPolygon` avec `properties: { state, zoneId }`. **Zéro I/O, zéro règle de jeu, testable.** |
| `apps/mobile/src/features/map/useLiveClaims.ts` | Hook : `supabase.from('hex_claims').select(...).eq('city_id', cityId)` → `liveClaims.ts`. Gère `loading` / `error` / `refresh()`. Si `!supabase` → renvoie `null` (mode dev, la démo reprend la main). |

**Fichiers à MODIFIER :**

| Fichier | Modification |
|---|---|
| `allTerritories.ts:278` | `territoryGeoByState()` prend un argument optionnel : `territoryGeoByState(live?: ReadonlyMap<TerritoryState, GameCollection>)`. Si `live` fourni → le renvoyer ; sinon → cache démo actuel. **Le cache `geoByStateCache` ne doit PAS mémoïser le live.** |
| `mapStyle.ts:1321` | `territoryStateLayers(emph, basemap, selectedZoneId, live?)` → propage `live` à `territoryGeoByState`. Tout le reste (fills LOD, `terr-hit`, casing, dimming) **fonctionne tel quel** : ce sont des couches génériques par `state`. |
| `MapScreen.tsx` / `MapScreen.web.tsx` | Appeler `useLiveClaims(cityId)` et passer le résultat à `battleGameLayers(...)`. Si `live === null` → comportement actuel inchangé. |
| `RoutePlannerMap.tsx:173` | Passe `territoryStateLayers(emph)` — laisser tel quel (démo) tant que P0.2 n'est pas validé sur la carte principale. |

**Mapping `hex_claims` → `TerritoryState` (rôle, jamais identité — REGLES §C) :**

| Condition (ordre de priorité) | `TerritoryState` |
|---|---|
| `owner_user_id = moi` | `crew` (chartreuse) |
| `owner_user_id ≠ moi` | `rival` (orange) |
| `decay_at` proche (seuils depuis `game-rules.ts`, **jamais un nombre en dur**) | `decay` / `decayUrgent` |
| `shielded_until > now()` | ⚠️ **AMENDEMENT-39 §2 : rendu OFF au MVP.** L'état `protected` reste dans le code et dans le mapping, mais la couche est **derrière un flag** — pas de bleu sur la carte. Bouclier visible **au tap uniquement**. |
| `contested` | **hors P0.2** : le serveur ne renvoie `contestedHexes` que dans `IngestRunResponse`, il n'y a pas de colonne `contested` sur `hex_claims`. Le rendu contour-violet d'AMENDEMENT-39 §1 attend un deuxième coureur réel. Ne rien inventer. |

**Mise à jour après capture (le moment qui compte) :**
1. `ingest_run` répond → `results[]` contient les `h3` avec `outcome ∈ {claimed_neutral, stolen, defended}`.
2. **Injection optimiste** : ces `h3` sont ajoutés au groupe `crew` localement → `cellsToTerritory` → la zone apparaît **instantanément** sur le post-run. Le serveur reste seul juge : on n'affiche que ce qu'**il** a accordé.
3. Au retour sur l'onglet Carte → `refresh()` → refetch `hex_claims` → source de vérité. L'optimiste est écrasé, pas additionné.

**Feature flags (AMENDEMENT-39 §4/§6) — à créer, minimal :**
`apps/mobile/src/lib/flags.ts` : constantes `as const` lues depuis `process.env.EXPO_PUBLIC_*` avec défaut prod = OFF. `SHIELD_MAP_RENDER: false`, `NAV_TAB_MISSIONS: false`, `NAV_TAB_SAISON: false`, `NAV_TAB_ARSENAL: false`, `NAV_TAB_WARROOM: false`, `NAV_TAB_PERFORMANCE: false`. Les écrans **restent dans le repo, les routes restent enregistrées**, seule la nav prod les cache. Zéro suppression.
⚠️ **`crew-discovery` est intouchable** : `territoryStatus.ts:274` et `:284` y routent et alimentent `contextualAction` (le bouton GO). 9 références / 4 fichiers. Le cacher casse GO.

**Rien à écrire côté SQL. Rien à ajouter côté deps** (`h3-js ^4.1.0` est là et expose `cellsToMultiPolygon`).

### (d) Qui fait quoi
- **MOI** : intégralité. **Zéro dépendance fondateur.** → **à démarrer immédiatement, en parallèle de F1/F2.**

### (e) Vérification observable
> **Insertion contrôlée** (pas de fixture prod, pas de ville factice) : sur la **base locale** (`npx supabase start`), j'insère ~15 `hex_claims` `city_id='paris'` autour d'un point réel, `owner_user_id` = mon compte de test.
> Sur l'appareil pointé sur la base locale : **une surface chartreuse continue aux bords arrondis** apparaît — **je ne dois voir AUCUNE arête d'hexagone à l'intérieur**. Je zoome à z17 : toujours pas de mosaïque, juste un contour lissé.
> J'insère 5 hexes de plus adjacents → refresh → la surface **s'agrandit sans coupure** (preuve que `cellsToMultiPolygon` fusionne au lieu de juxtaposer).
> Je tape la surface → la zone se sélectionne (`zoneId` lu) → le contrat C1 tient.

Le juge final reste **P0.3** : la même surface, mais issue d'une vraie course.

### (f) Risques & pièges
- **`h3index` bigint → JS**. Un h3 res 10 dépasse `Number.MAX_SAFE_INTEGER`. Supabase-js renvoie les bigint en **string** par défaut ⇒ passer par la même paire `h3ToDb`/`dbToH3` que `ingest_run`. Ne jamais faire `Number(row.h3index)`.
- **`geoByStateCache`** : `territoryGeoByState()` mémoïse. Un live mémoïsé = carte figée après capture. Le cache ne doit couvrir que la branche démo.
- **Doctrine** : `territory.ts` documente que son pipeline Chaikin est mort. En le rallumant, **mettre à jour son en-tête** — sinon le prochain agent le supprimera comme du code mort et cassera la carte prod.
- **Chaikin sur des cellules disjointes** : deux hexes non adjacents produisent deux polygones. Normal. Ne pas « réparer » en les reliant — ce serait mentir sur ce qui a été couru.
- **Trous** : `cellsToMultiPolygon` gère les anneaux intérieurs (index 1+). `TerritoryPolygon` les supporte déjà. Le rendu MapLibre `fill` les respecte. Vérifier sur un cas en donut.
- **Ce qui devra changer à l'échelle — et qu'on ne fait PAS maintenant** :
  - filtre par **viewport** (bbox) plutôt que par ville entière ;
  - **cellules parentes** (res 8/7) précalculées côté serveur pour le dézoom, au lieu de fusionner 200k cellules res 10 dans le thread JS ;
  - un **index spatial** (colonne `centroid geography` + GiST, postgis est déjà installé) ;
  - une **vue matérialisée** de territoire par crew/secteur.
  Aucune de ces quatre choses n'a la moindre valeur sur 0 ligne. On les fera quand le profiler le dira, pas avant.

---

## P0.3 — Le test terrain (le seul juge)

### (a) Objectif
Prouver, dehors, une fois, que la chaîne login → GO → GPS → boucle → serveur → carte tient debout.

### (b) État réel
- Tracking GPS réel : `expo-location` + `expo-task-manager` + `UIBackgroundModes: ["location"]` + foreground service Android → **déjà configurés** (`app.json`, AMENDEMENT-15 §2).
- `ingest_run` : anti-triche + throttle + `detectLoop` (fermeture ≤ `LOOP_CLOSE_TOLERANCE_M` **ou** auto-intersection) **déjà déployé**.
- Idempotence : `clientRunId` généré avant la course, retry offline safe. `pendingUpload.ts` existe.
- **Ce test n'a jamais été fait. `runs` = 0. `hex_claims` = 0.**

### (c) Protocole exact — à suivre à la lettre

**Préparation**
1. `eas build --profile development --platform ios` (profil `development` : les 4 `EXPO_PUBLIC_*` y sont déjà posées ⇒ le build **atteint la prod**).
2. Installer sur un iPhone physique. **Simulateur interdit** : pas de vrai GPS, pas de Sign In with Apple, pas de podomètre.
3. Compte : **un vrai Apple ID**, connexion via Face ID. Pas de compte de service, pas de seed.

**Sur le terrain**
| Paramètre | Valeur imposée | Pourquoi |
|---|---|---|
| Ville | **Paris ou Lille** | Ce sont les 2 seules `seasons` actives. Ailleurs, `city_id` sera null → la carte ne trouvera rien. **Rouen = fixture/dev, jamais prod.** |
| Forme | **Boucle FERMÉE** | `detectLoop` : retour à ≤ `LOOP_CLOSE_TOLERANCE_M` (80 m) du départ, **ou** auto-intersection. Un aller-retour ne ferme rien. |
| Distance | **1,5 – 3 km** | Assez pour passer les seuils anti-triche, assez court pour rejouer 3 fois dans l'heure si ça casse. |
| Allure | **Course réelle** (5–7 min/km) | Trop lent = rejet allure. Trop rapide = rejet. Marcher **fera échouer le test** — c'est le comportement voulu. |
| Écran | **Verrouiller le téléphone au milieu** | Valide `UIBackgroundModes` / foreground service. C'est le point de casse le plus probable. |
| Permissions | Accepter « Toujours » | « Quand l'app est active » suffit écran allumé mais tue la capture écran verrouillé. |

**Après la course** : fermer la course dans l'app → observer le post-run → **revenir sur l'onglet Carte**.

### (d) Qui fait quoi
- **FONDATEUR** : F1 (le build signé n'existe pas sans), **et court dehors**. Personne d'autre ne peut faire ce test.
- **MOI** : préparer le build, fournir les 4 requêtes de vérification ci-dessous, instrumenter les logs.

### (e) Vérification observable — **ce qu'on regarde en base**

```sql
-- 1) La course existe et est ACCEPTÉE
select id, user_id, status, reject_reason, distance_m, duration_s,
       city_id, source, created_at
from runs order by created_at desc limit 1;
--   ✅ status = 'accepted' (PAS 'rejected', PAS 'frozen')
--   ✅ reject_reason IS NULL
--   ✅ distance_m cohérent avec ce que la montre/l'app affichait (±10 %)
--   ✅ city_id = 'paris' ou 'lille' — s'il est NULL, la carte ne verra rien

-- 2) Des hexes ont été capturés, et ils sont à MOI
select claim_type, count(*)
from hex_claims where run_id = (select id from runs order by created_at desc limit 1)
group by claim_type;
--   ✅ au moins une ligne, claim_type ∈ ('neutral','pioneer')
--       (0 user avant moi ⇒ 'pioneer' est le résultat attendu, 'stolen' impossible)

-- 3) Les hexes sont rattachés à la ville → l'index de P0.2 les trouvera
select count(*) from hex_claims
where city_id = 'paris' and owner_user_id = '<mon-uuid>';
--   ✅ = le compte de la requête 2. Si 0 ici mais >0 en 2 → city_id NULL → P0.2 aveugle.

-- 4) La boucle a bien été détectée
--    (côté client : IngestRunResponse.loopClosed === true
--     et hexes.claimed > le nombre d'hexes strictement traversés
--     ⇒ l'INTÉRIEUR de la boucle a été rempli)
```

**Verdict « validé » = les 4 requêtes vertes ET, sur l'écran :**
> je reviens sur l'onglet Carte, et **je vois la forme de ma boucle**, en chartreuse, remplie, aux bords lissés, **là où j'ai physiquement couru**. Pas un hexagone. Pas une approximation. Ma boucle.

C'est ça, la première capture réelle. Tout le reste du document existe pour amener à cette phrase.

### (f) Risques & pièges
- **Le throttle (0035) va se déclencher** si je relance 5 fois pour débugger. Connaître la limite avant de partir.
- **Idempotence** : si le réseau tombe et que le client retry, `clientRunId` garantit `replayed: true` au lieu d'un doublon. **Le tester exprès** : mode avion à la fermeture, puis réseau → la course doit remonter une fois, pas deux.
- **`city_id` NULL** = le scénario d'échec silencieux le plus vicieux : la course est acceptée, les hexes existent, et la carte reste vide. La requête 3 est là uniquement pour ça.
- **Pionnier par densité** (AMENDEMENT-02) : avec 1 user en base, presque tout sera `pioneer`. C'est correct, pas un bug.
- **GPS urbain** : les canyons de rues parisiens dégradent l'accuracy. `gpsTrust` peut chuter et le serveur borner. Si rejet pour GPS : **ne pas assouplir les seuils**. Recourir dans un parc, puis diagnostiquer.
- **Ne jamais « réparer » un test terrain raté en insérant à la main dans `hex_claims`.** Une capture fabriquée invalide tout le point de ce document.

---

## P0.4 — Installer + câbler les dépendances image

### (a) Objectif
Donner à l'app la capacité technique de transformer une vue à l'écran en fichier PNG partageable.

### (b) État réel
- `react-native-svg 15.8.0` **est présent** ⇒ `captureRef` peut snapshoter la vue native qui contient le `<Svg>` de `ShareMap.tsx`. **C'est la brique difficile et elle est déjà là.**
- **Absentes** de `apps/mobile/package.json` : `react-native-view-shot`, `expo-sharing`, `expo-file-system`, `expo-clipboard`.
- `shareActions.ts` charge déjà `expo-clipboard` en **require dynamique tolérant** (`clipboardMod = null` si absent) — le pattern est prêt, la dep manque.

### (c) Ce qu'il faut faire

```bash
npx expo install react-native-view-shot expo-sharing expo-file-system expo-clipboard
```

**Utiliser `npx expo install`, jamais `npm install` avec une version à la main** : c'est le resolver Expo qui garantit l'alignement SDK 52. Résolutions attendues pour SDK 52 / RN 0.76.9 :

| Package | Version attendue (SDK 52) | Rôle |
|---|---|---|
| `react-native-view-shot` | `4.0.3` | `captureRef(ref, { format:'png', quality:1, result:'tmpfile' })` |
| `expo-sharing` | `~13.0.1` | `shareAsync(uri, { mimeType:'image/png', UTI:'public.png' })` |
| `expo-file-system` | `~18.0.x` | `cacheDirectory`, `moveAsync`, `deleteAsync` |
| `expo-clipboard` | `~7.0.1` | active le chemin `clipboard` déjà codé dans `shareActions.ts` |

Puis :
1. **`app.json`** : aucun plugin à ajouter (aucune de ces 4 libs n'en expose). Vérifier quand même après install.
2. **Rebuild dev EAS obligatoire** : `react-native-view-shot` est natif. Un simple reload Metro ne le verra pas.
3. **Ne PAS casser le web** : `apps/mobile` build en Expo Web (`output: single`). `react-native-view-shot` n'existe pas sur web ⇒ **garder le pattern require-dynamique de `shareActions.ts`** ou passer par un fichier `.web.ts`. C'est exactement le piège que `app.json` documente déjà pour HealthKit (`_healthkit_o8`).

### (d) Qui fait quoi
- **MOI** : intégralité. **Aucune dépendance fondateur.** → parallélisable avec P0.2.

### (e) Vérification observable
> Sur dev build : un bouton dev appelle `captureRef` sur la vue `ShareMap` → **un fichier PNG existe dans `FileSystem.cacheDirectory`**, taille > 0, et je peux l'ouvrir dans l'app Fichiers d'iOS et **y voir mon tracé**.
> `console.log(await FileSystem.getInfoAsync(uri))` → `{ exists: true, size: > 50000 }`.
> Et : `npx expo export --platform web` **passe toujours** (preuve que le require dynamique protège le web).

### (f) Risques & pièges
- **`newArchEnabled: false`** : `react-native-view-shot@4.0.3` est bien compatible ancienne archi sur RN 0.76. Ne pas basculer la New Architecture « au passage » — ce serait un chantier séparé.
- `captureRef` sur une vue **hors écran ou de taille 0** renvoie une image vide sans lever d'erreur. La vue doit être montée et mesurée.
- Le monorepo a **deux React** (racine 18 / `apps/web` 19). Ces 4 deps vont dans `apps/mobile/package.json` **uniquement**. Ne pas toucher à `styled-jsx` (voir CLAUDE.md, piège documenté).

---

## P0.5 — Story 9:16 réelle : de l'écran au partage

### (a) Objectif
Fermer une course, taper « Partager », et voir apparaître la feuille de partage iOS **avec une image** — pas avec un bloc de texte.

### (b) État réel — l'honnêteté est déjà codée, la capacité manque
- `apps/mobile/app/partage.tsx` + `src/features/share/templates.tsx` : templates existants.
- `ShareMap.tsx` (9 733 o, `react-native-svg`, `<Svg viewBox>`) : **le rendu visuel existe déjà et affiche de vrais tracés animés** (chantier « blobs → vrais tracés » livré).
- `sharePrivacy.ts` : masquage du domicile, **pur et correct**. Non négociable dans le pipeline image.
- `shareRun.ts` : `setShareRun()` / `getShareRun()` — le Résultat **arme déjà** les données avant `router.push('/partage')`. Sans course armée, `/partage` retombe sur `SHARE_DEMO` et **se présente comme EXEMPLE** (§A : l'app ne ment pas).
- `shareActions.ts` : `openShareSheet(text)` → `Share.share({ message })`. **Texte seulement.** Son en-tête l'assume : « Le PNG sticker transparent reste un TODO natif (react-native-view-shot, O1) ». `stickerText()` en est l'équivalent texte honnête.

### (c) Ce qu'il faut faire

**Fichier à CRÉER : `apps/mobile/src/features/share/shareImage.ts`**
```
captureShareImage(ref, opts) → Promise<{ ok: true; uri: string } | { ok: false; reason }>
  1. captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1920 })
  2. FileSystem.moveAsync → cacheDirectory/gryd-share-<clientRunId>.png
  3. renvoie l'uri — jamais une exception propagée (même contrat que ShareActionResult)
```

**Fichier à MODIFIER : `shareActions.ts`**
- **Ajouter** `openShareSheetImage(uri, message)` → `Sharing.shareAsync(uri, { mimeType:'image/png', UTI:'public.png', dialogTitle:'GRYD' })`.
- **Ne PAS supprimer** `openShareSheet(text)` : c'est le **fallback réel** si `expo-sharing` est indisponible (web, dep absente). Étendre `ShareActionResult` : `via: 'clipboard' | 'share' | 'webshare' | 'image'`.
- **Conserver la règle d'honnêteté** : l'UI ne dit « partagé » que si `ok: true`. Un `dismissed` n'est pas un succès.

**Fichier à MODIFIER : `apps/mobile/app/partage.tsx`**
- Poser un `ref` sur le conteneur 9:16 (`ViewShot` ou `View` + `collapsable={false}` — **`collapsable={false}` est obligatoire sur Android**, sinon la vue est optimisée hors de l'arbre natif et `captureRef` échoue).
- Le CTA appelle `captureShareImage` → `openShareSheetImage`. **Un seul CTA chartreuse** (§A).
- **Format** : 1080×1920 = 9:16 exact. Le `viewBox` de `ShareMap.tsx` doit être conservé — le SVG scale, il ne se déforme pas.
- **`sharePrivacy.ts` s'applique AVANT le rendu**, pas après la capture. Une capture d'une vue non masquée est une fuite d'adresse domicile.

**Le lien va dans le corps du partage** (`message`), pas dans l'image : un lien pixellisé n'est pas cliquable. L'image porte le visuel, le message porte l'URL — c'est ce que `stickerText()` fait déjà.

### (d) Qui fait quoi
- **MOI** : intégralité. Dépend de **P0.4** uniquement.

### (e) Vérification observable
> Je termine une course (ou j'ouvre le Résultat armé), je tape « Partager » → **la feuille de partage iOS s'ouvre avec une vignette d'image**, pas un aperçu de texte.
> Je choisis « Enregistrer l'image » → **la story 9:16 est dans ma pellicule**, avec mon tracé, mes stats, le badge GRYD Verified.
> J'ouvre Instagram → Story → l'image est proposée dans les récents → **je peux la poster**.
> Contrôle privacy : je pars de chez moi → **le début du tracé est masqué sur l'image exportée**, pas seulement à l'écran.

### (f) Risques & pièges
- **Android + `collapsable`** : cause n°1 des captures vides.
- `result: 'tmpfile'` plutôt que `'base64'` : un PNG 1080×1920 en base64 ≈ 4 Mo de string en mémoire → OOM sur les vieux appareils.
- `expo-sharing` **n'existe pas sur web** ⇒ garder le fallback Web Share API déjà écrit.
- **Nettoyage** : les fichiers de `cacheDirectory` s'accumulent. `deleteAsync` après partage ou au boot.
- **Ne pas régresser l'honnêteté** : si `/partage` s'ouvre sans course armée, il doit **toujours** se présenter comme un exemple. Une story exportée depuis `SHARE_DEMO` sans mention « exemple » serait une donnée factice publiée — violation directe de CLAUDE.md.

---

## P0.6 — Unifier les deep links sur `https://gryd.app`

### (a) Objectif
Qu'un lien partagé dans une story **ouvre l'app GRYD** au bon endroit — et rebondisse vers l'App Store si elle n'est pas installée.

### (b) État réel — le diagnostic est brutal et il faut le dire

| Constat | Preuve |
|---|---|
| Host en circulation = **`gryd.run`** (pas `gryd.app`) | `shareDeepLink.ts:20` `const SHARE_HOST = 'gryd.run'` |
| Chemins **incohérents** : `zone/`, `crew/`, `mission/`, `run/share/` | `shareDeepLink.ts` `targetPath()` |
| `crew/invite.ts`, `crew/publicDemo.ts`, `social/demo.ts` utilisent aussi `gryd.run` | grep |
| **Aucun `associatedDomains` dans `app.json`** | `app.json` `expo.ios` — absent |
| **Aucun `intentFilters` dans `app.json`** | `app.json` `expo.android` — absent |
| ⇒ **Aujourd'hui, un lien `https://gryd.run/...` n'ouvre PAS l'app. Jamais. Sur aucun appareil.** Il ouvre Safari, qui affiche une 404 (ou rien, si le domaine n'est pas hébergé). |
| Le scheme `gryd://` est déclaré (`app.json`) et fonctionne — mais il n'est **pas cliquable** depuis une story Instagram. | |
| ⚠️ **`gryd.run` est déjà écrit dans les documents légaux** : `support@gryd.run`, `privacy@gryd.run`, « le site gryd.run » dans `mentions-legales`, `cgv`, `confidentialite`. | `apps/web/app/**` |

### (c) Ce qu'il faut faire

**Décision préalable à trancher par le fondateur (5 minutes, bloquante) :**

> AMENDEMENT-39 impose `https://gryd.app`. Mais `gryd.run` est **gravé dans les mentions légales, les CGV et la politique de confidentialité**, et sert d'adresse e-mail de contact (`support@`, `privacy@`).
> **Deux options honnêtes :**
> - **(A)** `gryd.app` = domaine app/deep-links, `gryd.run` = site + e-mails. Deux domaines, aucune réécriture légale. **Recommandé.**
> - **(B)** Tout migrer sur `gryd.app` → il faut réécrire les 4 pages légales et migrer les e-mails.
>
> **Je ne tranche pas ça.** Je code (A) par défaut, car c'est le plus petit changement qui satisfait AMENDEMENT-39 sans toucher au juridique.

**Mapping des chemins — état actuel → cible :**

| Actuel | Cible | Note |
|---|---|---|
| `gryd.run/zone/republique` | `gryd.app/z/republique` | ✅ direct |
| `gryd.run/crew/{slug}` **et** `gryd.run/c/foulees93` | `gryd.app/c/{slug}` | ⚠️ **deux formes en circulation aujourd'hui** (`shareDeepLink` émet `crew/`, `crew/invite.ts` émet `/c/`). L'unification en corrige une vraie incohérence. |
| `gryd.run/run/share/{id}` | `gryd.app/d/{id}` | `d` = *détail de course*. |
| `gryd.run/mission/defend-republique` | **❓ ambigu** | AMENDEMENT-39 ne donne que 3 chemins pour 4 cibles. **Proposition par défaut** : une mission de défense EST une zone ⇒ `defaultShareTarget` renvoie `{kind:'zone'}` au lieu de `{kind:'mission'}` pour `intention === 'defense'`, et le type `ShareLinkTarget.mission` disparaît de la surface de partage (le code reste). **À confirmer par le fondateur** — je ne devine pas une règle produit. |

**Fichiers à MODIFIER — MOI :**

| Fichier | Modification |
|---|---|
| `apps/mobile/src/features/share/shareDeepLink.ts` | `SHARE_HOST = 'gryd.app'` ; `targetPath()` → `z/`, `c/`, `d/` ; garder `slugify` inchangé (il est correct) ; mettre à jour l'en-tête (il documente les vieux chemins). |
| `apps/mobile/src/features/crew/invite.ts` | Aligner sur `buildShareLink({kind:'crew'})` — **supprimer le host codé en dur en doublon**. Une seule source d'URL. |
| `apps/mobile/app.json` | `ios.associatedDomains: ["applinks:gryd.app"]` ; `android.intentFilters` (`VIEW`, `BROWSABLE`, `DEFAULT`, scheme `https`, host `gryd.app`, `autoVerify: true`). |
| `apps/mobile/app/z/[slug].tsx`, `app/c/[slug].tsx`, `app/d/[id].tsx` | **Routes expo-router à créer** — sinon le lien ouvre l'app sur un 404 interne, ce qui est pire qu'un lien mort. |
| `apps/web/public/.well-known/apple-app-site-association` | **Fichier à générer** (voir ci-dessous). |
| `apps/web/public/.well-known/assetlinks.json` | **Fichier à générer.** |
| `apps/web/app/z/[slug]/page.tsx` etc. | Pages de rebond : si l'app n'est pas installée → App Store. Contenu **réel uniquement** (nom de zone) — **aucun classement, aucun rival, aucune ville inventée.** |

**`apple-app-site-association`** — servi sur `https://gryd.app/.well-known/apple-app-site-association` :
```json
{ "applinks": { "details": [ {
  "appIDs": ["<TEAM_ID>.fr.nexus1993.gryd"],
  "components": [
    { "/": "/z/*" }, { "/": "/c/*" }, { "/": "/d/*" }
  ] } ] } }
```
Contraintes Apple, non négociables : **`Content-Type: application/json`**, **pas d'extension `.json` dans l'URL**, **HTTPS valide**, **aucune redirection**. Le `TEAM_ID` vient de **F1**.

**`assetlinks.json`** — `https://gryd.app/.well-known/assetlinks.json` : nécessite le **SHA-256 du certificat de signature Android** (EAS le fournit : `eas credentials`).

**FONDATEUR :**
| Ref | Action |
|---|---|
| **[F3]** | **Acheter/pointer le domaine `gryd.app`** (DNS). Sans ça, tout P0.6 est théorique. |
| **[F4]** | **Héberger** `apps/web` sur `gryd.app` (ou au minimum les deux fichiers `.well-known/` en HTTPS sans redirection). Aujourd'hui le web est sur GitHub Pages — **GitHub Pages ne permet pas de forcer le `Content-Type` d'un fichier sans extension** ⇒ **il faudra un autre hébergeur** (Vercel/Netlify/Cloudflare). C'est un vrai blocage, pas un détail. |
| **[F1]** | Fournir le **Team ID** Apple (AASA) — déjà nécessaire pour P0.1. |
| **[F5]** | Trancher **(A) vs (B)** sur le domaine légal, et trancher le chemin `mission/`. |

### (d) Qui fait quoi
- **FONDATEUR** : F3 (DNS), F4 (hébergement + Content-Type), F1 (Team ID), F5 (2 décisions).
- **MOI** : tout le code, les 2 fichiers `.well-known` générés, les 3 routes expo-router, les 3 pages web de rebond, l'unification des hosts en doublon.

### (e) Vérification observable
> **1. Le fichier est bien servi** : `curl -sI https://gryd.app/.well-known/apple-app-site-association` → `200`, `content-type: application/json`, **zéro `location:`**.
> **2. Apple l'a bien avalé** : le validateur d'Apple (`app-site-association.cdn-apple.com/a/v1/gryd.app`) renvoie le JSON.
> **3. Le vrai test** : je m'envoie `https://gryd.app/z/republique` **par iMessage**, je tape le lien depuis mon iPhone → **GRYD s'ouvre directement sur la zone**. Safari ne s'ouvre pas. C'est binaire : ça marche ou ça ne marche pas.
> **4. Le test qui compte vraiment** : je poste la story de P0.5, un **ami** tape le lien depuis SA story → l'app s'ouvre (installée) **ou** l'App Store s'ouvre (pas installée). Jamais une page blanche.
> **5. Android** : `adb shell pm get-app-links fr.nexus1993.gryd` → `verified`.

### (f) Risques & pièges
- **L'AASA est mis en cache par Apple pendant ~24 h** (CDN). Une erreur de contenu se paie en un jour d'attente. Valider le JSON **avant** de publier.
- **Universal Links ne se déclenchent pas** quand on tape un lien **sur la même origine** (Safari sur gryd.app → gryd.app), ni depuis certaines webviews in-app. Tester depuis iMessage/Notes, jamais depuis Safari.
- **`autoVerify: true` (Android) échoue silencieusement** si le SHA-256 ne correspond pas au keystore de build. Le SHA du build **development** ≠ celui du build **production** : mettre **les deux** dans `assetlinks.json`.
- **GitHub Pages** (hébergement actuel) : contrainte réelle sur le `Content-Type` d'un fichier sans extension ⇒ prévoir la migration d'hébergement dans le chiffrage de F4.
- **Le rebond web ne doit rien inventer.** Une page `/z/republique` qui affiche « 3e crew du secteur » alors que la base contient 0 crew serait une donnée factice publique. Si la donnée n'existe pas, la page affiche le nom et un CTA. Rien d'autre.
- **`slugify` n'est pas réversible.** `zone/republique` ne permet pas de retrouver une zone en base sans une table de résolution de slug. Aujourd'hui le slug vient du **nom côté client** (`shareDeepLink.ts` le documente : « en prod le serveur émet un id de partage suivi »). **Au MVP** : la route `/z/[slug]` peut ouvrir la carte centrée sur la zone si on la résout, sinon elle ouvre la carte tout court — **jamais une erreur**. La résolution serveur des slugs est un chantier post-P0.

---

## 2. Le gate — les 4 ensemble, à chaque étape, sans exception

Aucune des 6 étapes n'est « faite » sans les 4, **par code de sortie, jamais par un grep** :

```bash
npm run typecheck                                   # racine → workspaces
for f in supabase/functions/*/index.ts; do          # sinon les edge ne sont JAMAIS typecheckées
  ~/.deno/bin/deno check "$f" || exit 1             # trou réel : a déjà laissé passer un ReferenceError en PROD
done
~/.deno/bin/deno test --allow-read supabase/functions/   # baseline 519 — jamais moins
node scripts/sync-game-rules.mjs && git status --porcelain supabase/functions/_shared  # doit être VIDE
```

Plus, propre à ce chemin :
- **P0.2** : tests Deno/unitaires sur `liveClaims.ts` (moteur **pur** : rows → FeatureCollection). Aucun nombre magique — seuils de decay depuis `packages/shared/src/game-rules.ts`.
- **P0.4/P0.5** : `npx expo export --platform web` doit **continuer à passer** (les libs natives ne doivent pas casser le bundle web).
- **Règle dure AMENDEMENT-39 §7** : avant de retirer/cacher quoi que ce soit touchant `territoryStatus.ts` ou GO → **graphe des appelants + test de non-régression d'abord**. `crew-discovery` : 9 références, 4 fichiers, alimente `contextualAction`.

---

## 3. Ce qui est décidé, et ce qui attend le fondateur

**Décidé (AMENDEMENT-39, appliqué sans discussion) :** violet en contour seul · bouclier flag OFF au MVP · GO générique + verbes contextuels · nav prod 3 onglets, le reste caché et vivant · Arsenal conservé · Paris + Lille seuls en prod · aucune suppression destructive.

**Bloquant, en attente du fondateur :**

| Ref | Attente | Bloque |
|---|---|---|
| **F1** | Apple Developer Program + App ID + Sign In with Apple | **P0.1, P0.3, P0.6** — c'est LE goulot |
| **F2** | Provider Apple activé dans Supabase (+ bundle id en audience) | P0.1 |
| **F3** | Domaine `gryd.app` | P0.6 |
| **F4** | Hébergement HTTPS servant `.well-known/` (≠ GitHub Pages) | P0.6 |
| **F5** | (A) ou (B) sur le domaine légal · sort du chemin `mission/` | P0.6 |
| **—** | **Courir dehors, à Paris ou Lille, une boucle fermée de 2 km** | **P0.3 — personne ne peut le faire à sa place** |

**Non bloquant, je démarre maintenant :** **P0.2** en entier, **P0.4**, le rendu de **P0.5**, et tout le code de **P0.6**.

---

## 4. Hors périmètre — explicitement, pour éviter la dérive

Ne pas faire tant que P0.3 n'est pas vert : LOD / cellules parentes / index spatial · rendu du contesté (il faut un 2ᵉ coureur réel) · rendu du bouclier (flag OFF) · Google Sign-In · création/adhésion de crew (`crew.tsx:212-229` = `Alert` stub assumé) · résolution serveur des slugs de partage · migration Arsenal/Missions/Saison · toute donnée européenne.

**La seule question qui compte reste :** *est-ce qu'une vraie personne a couru, et a vu sa zone ?* Aujourd'hui : `runs = 0`.
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
