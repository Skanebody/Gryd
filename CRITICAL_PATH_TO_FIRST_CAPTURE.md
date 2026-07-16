# CRITICAL_PATH_TO_FIRST_CAPTURE — les 15 étapes, état réel

> Le scénario minimal d'un test fermé : une vraie personne → une vraie course → une vraie capture → une vraie zone visible → une vraie story → un vrai deep link.
> État par étape, prouvé `fichier:ligne`. **Remplace** le `CRITICAL_PATH_TO_FIRST_REAL_CAPTURE.md` de l'AMENDEMENT-39, dont la ligne 31 (« zéro lecture de hex_claims ») est **périmée** depuis P0.2.

Légende : ✅ OPÉRATIONNEL · 🟡 PARTIEL · 🎭 SIMULÉ (démo présentée comme réel) · ⛔ ABSENT · 🔒 BLOQUANT

| # | Étape | État | Preuve |
|---|---|---|---|
| 1 | Inscription (compte + atteindre les tabs) | 🔒 | App = Apple+Google seuls ([auth.ts:76,117](apps/mobile/src/lib/auth.ts:76)), OFF serveur (vérifié prod), gate [(tabs)/_layout.tsx:42](apps/mobile/app/(tabs)/_layout.tsx:42), aucun skip, aucun email. |
| 2 | Provisioning `public.users` | ✅ | Trigger `on_auth_user_created` SECURITY DEFINER (0028) + backfill. Prod : **0 orphelin**. Jamais exercé (0 inscription). |
| 3 | Restauration de session (relaunch) | ✅ | [supabase.ts:16](apps/mobile/src/lib/supabase.ts:16) `persistSession + AsyncStorage` + [session.tsx:31](apps/mobile/src/lib/session.tsx:31) getSession + onAuthStateChange. |
| 4 | Permission GPS au 1er run | ✅ | [useRealRun.ts:166](apps/mobile/src/features/run/gps/useRealRun.ts:166) request + `app.json` NSLocation*/ACCESS_*. *Déclenchement système non vérifiable sans device (O8).* |
| 5 | Tracking foreground + background | ✅ | [provider.ts:60](apps/mobile/src/features/run/gps/provider.ts:60) `TaskManager.defineTask` + foregroundService. *Comportement headless non vérifiable en statique.* |
| 6 | Sauvegarde + restauration crash/kill | ✅ | runStore ACTIVE/CURRENT/BG_FIXES + flush 30 ticks + drain background. **Fenêtre de perte foreground ~30 s** (🟡, P2). |
| 7 | **Guidage live de fermeture de boucle** | ⛔ | `RealCourseLive.tsx` (seul chemin réel) n'affiche aucun guidage ; `loopStatusAt`/timeline n'existent que dans le flux **démo**. La 1re capture se fait **à l'aveugle**. |
| 8 | Fin de course → envoi `ingest_run` | 🟡 | OK avec session ([useRealRun.ts:124](apps/mobile/src/features/run/gps/useRealRun.ts:124)). Mais `if(session===null) return 'none'` → course trackée puis **buffers purgés sans envoi**. **403/422 permanent confondu avec hors-ligne** → retenté à vie ([pendingUpload.ts:60](apps/mobile/src/lib/pendingUpload.ts:60)). |
| 9 | Décision serveur du claim | ✅ | `decideClaims`/`validateRun`/`detectLoop` purs, testés. Jamais exercé en prod. |
| 10 | Persistance `hex_claims` (RPC atomique) | ✅ | [ingest_run:1523](supabase/functions/ingest_run/index.ts:1523) `claim_hexes` + partial_boundaries + openBoundary. |
| 11 | Rattachement ville → classement local | 🔒 | [tracker.ts:299](apps/mobile/src/features/run/gps/tracker.ts:299) buildPayload **sans cityId** → `p_city_id` NULL → `v_season_id` NULL → **`season_scores` jamais incrémenté**. |
| 12 | Écran résultat honnête | 🎭 | [course-result.tsx:514](apps/mobile/app/course-result.tsx:514) buildRunSimulation → KPI démo ; [RealCourseLive.tsx:81](apps/mobile/src/features/run/gps/RealCourseLive.tsx:81) clampe à 8,2 km. serverResult n'override que badge/bonus/défendues. **Aucune branche « Aucune zone capturée ».** |
| 13 | Carte se rafraîchit après capture | 🔒 | `reload()` défini/retourné [hexClaims.ts:79](apps/mobile/src/features/map/hexClaims.ts:79) mais **aucun consommateur** ; refetch sur `[session,tick]` seul, aucun realtime/useFocusEffect. |
| 14 | Story image 9:16 exportée | ⛔ | Deps view-shot/sharing/file-system/media-library **absentes** ; [shareActions.ts:96](apps/mobile/src/features/share/shareActions.ts:96) `Share.share({message})` texte seul. Style Classement = rang **#8/Paris Est** démo ([templates.tsx:105](apps/mobile/src/features/share/templates.tsx:105)). |
| 15 | Ouverture d'une zone depuis un lien | ⛔ | 0 associatedDomains/applinks/intentFilters/getInitialURL ; `apps/web` sans routes `z/c/d` ni `.well-known/apple-app-site-association`. Host émis = `gryd.run` ([shareDeepLink.ts:20](apps/mobile/src/features/share/shareDeepLink.ts:20)) ≠ reco `gryd.app`. `buildShareDeepLink` **sans appelant**. |

---

## Ce qui bloque, en une phrase chacun

- **Étape 1 (🔒 fondateur+repo)** — personne ne peut entrer : activer Apple serveur + tester device, et livrer un **email OTP** en filet.
- **Étape 7 (⛔ repo)** — la 1re capture est à l'aveugle : porter le guidage boucle (distance restante, « il manque 110 m ») du flux démo vers `RealCourseLive`.
- **Étape 8 (🟡 repo)** — un rejet serveur définitif se lit comme un hors-ligne : distinguer 4xx (afficher/abandonner) de réseau (retenter) dans `pendingUpload`.
- **Étape 11 (🔒 repo)** — le classement local ne se peuplera jamais : **dériver `cityId` côté serveur** (point-in-polygon du 1er fix sur `city_zones` actives) avant `claim_hexes`.
- **Étape 12 (🎭 repo)** — l'app ment sur SA course : dériver le KPI de `getLastRunResult()`/snapshot GPS réel, **retirer le clamp 8,2 km**, ajouter l'état vide honnête.
- **Étape 13 (🔒 repo)** — la zone n'apparaît pas : consommer `reload()` au retour d'`ingest_run` / `useFocusEffect` sur l'onglet Carte.
- **Étape 14 (⛔ repo)** — pas de story : `react-native-view-shot` (captureRef sur la ShareCard) + `expo-sharing` + `expo-media-library`, rasteriser un PNG, dériver « GRYD Verified »/rang du serveur.
- **Étape 15 (⛔ fondateur+repo)** — le lien mène nulle part : associatedDomains iOS + intentFilters Android + routes expo-router `z/c/d` + landing web + `apple-app-site-association`/`assetlinks` servis en `application/json` (hébergeur ≠ GitHub Pages). **Arbitrage : host `gryd.run` (repo actuel) vs `gryd.app` (reco produit) — à trancher.**

---

## Le minimum vital pour « une vraie capture visible » (sans la viralité)

Pour prouver le **cœur** — vraie personne → vraie course → vraie zone visible — il suffit des étapes **1, 8, 11, 12, 13**. Les étapes 7 (guidage), 14 (story) et 15 (deep link) sont nécessaires pour la **boucle virale**, pas pour la première capture. Ordonnancement dans [MVP_LAUNCH_PLAN_20_DAYS.md](MVP_LAUNCH_PLAN_20_DAYS.md).
