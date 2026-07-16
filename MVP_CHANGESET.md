# MVP_CHANGESET — exactement quoi RETIRER, CHANGER, AJOUTER

> Liste atomique pour passer du NO-GO au test fermé. Chaque item = un fichier + une opération précise.
> Complément d'exécution de [MVP_LAUNCH_PLAN_20_DAYS.md](MVP_LAUNCH_PLAN_20_DAYS.md) (l'ordre) et de [CRITICAL_PATH_TO_FIRST_CAPTURE.md](CRITICAL_PATH_TO_FIRST_CAPTURE.md) (les preuves).
> `[REPO]` = je peux le faire. `[FONDATEUR]` = toi seul (dashboard, device, domaine, argent).
> Priorité : **P0** = bloque la 1re capture visible ou la mesure ; **P1** = bloque la boucle virale ; **P2** = confort/robustesse.

---

## A. FONDATEUR — hors repo, à faire en parallèle

1. **[P0] Activer le provider Apple** — dashboard Supabase `sydwxwwirinjoheeodcg` → Authentication → Providers → Apple : Services ID + Team ID + Key ID + clé .p8, bundle `fr.nexus1993.gryd` dans « Client IDs ». Vérifier sur un iPhone neuf : une inscription réelle doit créer une ligne `auth.users` + `public.users`.
2. **[P0] Confirmer que `EXPO_PUBLIC_POSTHOG_KEY` est dans le build EAS** du profil pilote — sinon tout le funnel est un no-op silencieux.
3. **[P1] Trancher le host des deep links** : `gryd.run` (repo actuel) ou `gryd.app` (reco produit). Le domaine choisi doit servir `apple-app-site-association` + `assetlinks.json` en `application/json` — **pas GitHub Pages** (qui ne fixe pas le content-type).
4. **[P2] Vérifier le déploiement** de `delete_account` et `export_account` sur le projet distant.

---

## B. RETIRER (supprimer ou cesser d'utiliser)

| # | P | Fichier | Quoi retirer |
|---|---|---|---|
| B1 | P0 | [RealCourseLive.tsx:81-84](apps/mobile/src/features/run/gps/RealCourseLive.tsx:81) | Le **clamp `Math.min(SIM_LAST_TICK, …)` sur la distance affichée** (toute course > 8,2 km montre 8,2 km). Cesser de dériver le résultat de `DEMO_TOTAL_DISTANCE_M`. |
| B2 | P0 | [course-result.tsx:514,526](apps/mobile/app/course-result.tsx:514) | L'usage de **`buildRunSimulation`** pour les KPI de la vraie course. La simulation reste pour le mode démo uniquement (pas de session). |
| B3 | P0 | [templates.tsx:105-107](apps/mobile/src/features/share/templates.tsx:105) | Le **rang inventé `#8` / `Paris Est` / `+3 places`** du style Classement. `verified: true` en dur (×8, templates.tsx:195→302). La mention **`Contestée`** codée en dur (templates.tsx:143). |
| B4 | P0 | [territoire.tsx](apps/mobile/app/(tabs)/territoire.tsx) + [TerritoryFranceMap.tsx:82](apps/mobile/src/features/territory/TerritoryFranceMap.tsx:82) | `TERRITORY_PAGE_DEMO` présenté comme le joueur (« Territoire de [runner démo] · N zones »). Soit brancher le réel (voir C7), soit **étiqueter « démonstration »** — ne plus le montrer comme vrai. |
| B5 | P1 | [sign-in.tsx:169-176](apps/mobile/app/(auth)/sign-in.tsx:169) | Le **bouton Google** tant que `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + reversed-client-id ne sont pas faits ([auth.ts:98](apps/mobile/src/lib/auth.ts:98) TODO). Un bouton mort est un mensonge. |
| B6 | P1 | [shareActions.ts:96](apps/mobile/src/features/share/shareActions.ts:96) | Le partage **texte-seul** `Share.share({message})` comme SEUL mode — remplacé par le partage de fichier image (voir D6). Le « GRYD Verified » codé en dur (stickerText:119). |
| B7 | P2 | nav / `(tabs)` | La **visibilité** des surfaces hors-MVP (season, shop, arsenal, war_room, advanced_*) — via feature flag (D8), **pas** en supprimant les moteurs. |

> Rien d'autre n'est supprimé. Aucun moteur, aucune migration, aucun test.

---

## C. CHANGER (modifier l'existant)

| # | P | Fichier | Quoi changer |
|---|---|---|---|
| C1 | P0 | [course-result.tsx](apps/mobile/app/course-result.tsx) | Dériver **distance / durée / allure / nb de zones** de `getLastRunResult()` (déjà armé par [useRealRun.ts:132](apps/mobile/src/features/run/gps/useRealRun.ts:132)). Ces champs existent **déjà** dans `IngestRunResponse` (`distanceM`, `durationS`, `avgPaceSKm`, `hexes.claimed/stolen/defended`) — aucun changement serveur. Ajouter les **deux états manquants** : « Aucune zone capturée » (hexes = 0) et « Boucle presque fermée · il manquait N m · [TERMINER] » (openBoundary présent). CTA principal = `PARTAGER`. |
| C2 | P0 | [pendingUpload.ts:60](apps/mobile/src/lib/pendingUpload.ts:60) | Distinguer **rejet permanent (4xx : 400/403/422)** → sortir de la file + surfacer, de **hors-ligne/5xx** → retenter. Aujourd'hui `if(error) return` retente un 403 `unknown_user` à vie en silence. |
| C3 | P0 | [useRealRun.ts:126](apps/mobile/src/features/run/gps/useRealRun.ts:126) | Sur `session===null` en cours de run : **mettre le payload en file** (pendingUpload) au lieu de purger les buffers sans envoi ni file. |
| C4 | P0 | [ingest_run/index.ts](supabase/functions/ingest_run/index.ts) (~334, ~1526) | **Dériver `cityId` côté serveur** : point-in-polygon du 1er fix GPS sur `city_zones` actives, avant `claim_hexes` (aujourd'hui `p_city_id` vient de `request.cityId` jamais fourni → NULL → `season_scores` vide). Régénérer la copie `_shared` via `sync-game-rules.mjs`. |
| C5 | P0 | [MapScreen.tsx:246](apps/mobile/src/features/map/MapScreen.tsx:246) + [.web:275](apps/mobile/src/features/map/MapScreen.web.tsx:275) | **Consommer `reload()`** (aujourd'hui code mort) : appeler au retour d'`ingest_run` (résultat 'sent') **et** via `useFocusEffect` à l'arrivée sur l'onglet Carte. La zone doit apparaître sans redémarrer. |
| C6 | P0 | [analytics.ts](apps/mobile/src/lib/analytics.ts) (wrapper `track`) | Ajouter à chaque event : **`event_id` unique** (dédup), **`event_timestamp` UTC**, **`city_id` depuis `CITIES`** (jamais texte libre). |
| C7 | P0 | [TerritoryFranceMap.tsx:82](apps/mobile/src/features/territory/TerritoryFranceMap.tsx:82) + [allTerritories.ts:743](apps/mobile/src/features/map/allTerritories.ts:743) (`possessionsBounds`) | Passer `real` (via `useRealTerritories`) à `territoryStateLayers` **et** à `possessionsBounds` (qui doit cesser de cacher son extent). Sinon : étiqueter démo (B4). *(Déjà en tâche de fond.)* |
| C8 | P1 | [templates.tsx](apps/mobile/src/features/share/templates.tsx) | Alimenter la card depuis `serverResult`/vraie zone (nom, aire, rang réel si dispo) au lieu des constantes `SHARE_DEMO`. Ce qui n'a pas de source serveur (rang, nom de zone absent) : masquer, pas inventer. |
| C9 | P1 | [ShareMap.tsx:173-175](apps/mobile/src/features/share/ShareMap.tsx:173) | Cadrer `fit` sur la **vraie géométrie** de la zone capturée (la prop `trace` n'entre pas dans `fit` aujourd'hui → une trace hors République sort de la viewBox). |
| C10 | P1 | [app.json](apps/mobile/app.json) | Ajouter **`associatedDomains` iOS** (`applinks:<host>`) + **`intentFilters` Android autoVerify** pour le host retenu (A3). |
| C11 | P1 | [0004_seed.sql](supabase/migrations/0004_seed.sql) (nouvelle migration) | Pour un pilote mono-ville : **une seule saison active** (désactiver Lille) + **resserrer le polygone** de la ville sur son emprise réelle (les polygones actuels sont « grossiers, TODO O4 »). Via une **nouvelle migration** (ne jamais éditer un seed appliqué). |

---

## D. AJOUTER (nouveaux fichiers / deps / events / config)

| # | P | Où | Quoi ajouter |
|---|---|---|---|
| D1 | P0 | [sign-in.tsx](apps/mobile/app/(auth)/sign-in.tsx) + [auth.ts](apps/mobile/src/lib/auth.ts) + onboarding AccountStep | **Email OTP** : `supabase.auth.signInWithOtp({email})` + écran de saisie du code + `verifyOtp`. Filet indépendant d'Apple/Google. (OTP par **code**, pas magic-link → pas de handler de lien à faire.) |
| D2 | P0 | [events.ts](packages/shared/src/events.ts) + points d'émission | **Émettre l'activation** : `territory_captured` sur capture PERSISTÉE (depuis `IngestRunResponse.hexes`, jamais depuis l'UI). Ajouter/émettre `loop_closed`, `loop_almost_closed{missing_m}`, `run_rejected{reason}`. Émettre `signup_completed{method}` sur la méthode réellement active. |
| D3 | P0 | test Deno | **Test « run dans la ville pilote → `season_scores.<ville> > 0` »** (verrouille C4). Ajouter à `npm run test:map` ou aux tests functions. |
| D4 | P1 | [RealCourseLive.tsx](apps/mobile/src/features/run/gps/RealCourseLive.tsx) | **Guidage live de boucle** : distance restante / « il manque N m pour fermer », porté depuis la logique du flux démo (`loopStatusAt`) vers le chemin RÉEL. Sans lui, la 1re capture est à l'aveugle. |
| D5 | P1 | [package.json](apps/mobile/package.json) | **Deps export image** : `react-native-view-shot`, `expo-sharing`, `expo-media-library`. (`expo-file-system`/`expo-clipboard` si sauvegarde/copie voulues.) Toutes **absentes** aujourd'hui. |
| D6 | P1 | [shareActions.ts](apps/mobile/src/features/share/shareActions.ts) + ShareCard | **Export PNG 9:16** : `captureRef` sur la ShareCard → fichier → `Sharing.shareAsync(fileUri)` + action « Sauver » (`MediaLibrary`). Events `share_preview_generated`, `share_exported`. |
| D7 | P1 | `apps/mobile` (linking) + `apps/web` (routes) + domaine | **Chaîne de réception deep link** : config linking expo-router (routes `z/c/d`), handler `getInitialURL`/`useURL` (préserve l'intention post-install), landing web + rebond App Store, fichiers `apple-app-site-association` / `assetlinks.json`. Events `deep_link_created`, `deep_link_opened`, `signup_attributed`, `first_capture_attributed`. |
| D8 | P2 | nouveau `src/lib/flags.ts` | **Système de feature flags minimal** (aucun n'existe) : masquer season/shop/arsenal/war_room/advanced_*. Surface visible = Carte / Crew simple / Profil / Run / Résultat / Partage. Masquer la surface, pas casser les moteurs. |
| D9 | P2 | 4 dashboards PostHog | Activation / Viralité / Fiabilité / Ville (voir [MVP_ANALYTICS_TAXONOMY.md](MVP_ANALYTICS_TAXONOMY.md)). Filtres : ville, version, plateforme, source, cohorte. |

---

## E. NE PAS TOUCHER (solide, vérifié, testé)

Moteur territorial (`packages/engine` : detectLoop/decideClaims/validateRun) · RPC `claim_hexes` + idempotence + garde TOCTOU · trigger provisioning 0028 (0 orphelin prod) · Battle Map réelle P0.2/P0.3 (`useRealTerritories`/`buildTerritories`, 15 tests) · delete_account/export_account · masquage privacy · RLS.

---

## F. Récap par priorité

- **P0 (1re capture visible + mesure)** : A1, A2, B1, B2, B4, C1, C2, C3, C4, C5, C6, C7, D1, D2, D3.
- **P1 (boucle virale)** : A3, B5, B6, C8, C9, C10, C11, D4, D5, D6, D7.
- **P2 (confort/robustesse)** : A4, B7, D8, D9 + fenêtre de perte GPS ~30 s.

**Gate à chaque lot** : `npm run typecheck` (exit code) · `deno check` sur chaque `functions/*/index.ts` · `deno test functions/` (≥519) · `npm run test:map` (≥15) · `sync-game-rules.mjs` sans drift · preview mobile-web console propre.
