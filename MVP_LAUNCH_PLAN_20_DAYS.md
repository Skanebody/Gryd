# MVP_LAUNCH_PLAN_20_DAYS — de NO-GO à test fermé

> Objectif : ouvrir un **test fermé, 20-100 coureurs, une ville pilote**, avec une boucle réelle et mesurable.
> Ordre imposé par le prompt : auth réelle → tracking fiable → capture persistée → carte réelle → résultat réel → story exportable → deep link → analytics → test terrain → épuration.
> Chaque tâche : objectif · fichiers · deps · migrations · critère d'acceptation · event · risque.
> **Rien ici n'est encore codé** (§16). C'est le plan à valider avant d'attaquer.

---

## Jalons

| Jour | Jalon | Prouve |
|---|---|---|
| J3 | **Un humain entre dans l'app** | Auth Apple + email OTP → ligne `auth.users`+`public.users`. |
| J8 | **Première vraie capture visible** | Course réelle → hex_claims → zone peinte en live, résultat honnête. |
| J13 | **Première story partagée** | Image 9:16 exportée + lien cliquable qui ouvre la zone. |
| J16 | **Funnel mesurable** | Activation + attribution dans PostHog. |
| J20 | **Test terrain lancé** | 20+ coureurs, une ville, feedback + garde-fous verts. |

---

## Piste 1 — Authentification (J1-J3) · *entrée*

- **[FONDATEUR] Activer le provider Apple** (dashboard Supabase `sydwxwwirinjoheeodcg`) : Services ID + Team ID + Key ID + clé .p8, bundle `fr.nexus1993.gryd` dans « Client IDs ». Vérifier sur iPhone neuf jusqu'à une ligne `auth.users`+`public.users`.
  - *Critère :* une inscription réelle depuis un device produit un profil. *Event :* `signup_completed{method:'apple'}`.
- **[REPO] Filet email OTP.** `supabase.auth.signInWithOtp` + `verifyOtp` dans [sign-in.tsx](apps/mobile/app/(auth)/sign-in.tsx) et l'AccountStep onboarding.
  - *Deps :* aucune. *Critère :* inscription possible sans Apple/Google. *Event :* `signup_started`, `signup_completed{method:'otp'}`. *Risque :* deep-link email — utiliser le code OTP (pas magic-link) pour éviter un handler.
- **[REPO] Cacher le bouton Google** tant que `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` + reversed-client-id ne sont pas faits ([auth.ts:98](apps/mobile/src/lib/auth.ts:98) TODO). Un bouton mort est un mensonge.

## Piste 2 — Tracking fiable (J3-J5) · *never lose a run*

- **[REPO] Distinguer rejet serveur permanent de hors-ligne** dans [pendingUpload.ts:60](apps/mobile/src/lib/pendingUpload.ts:60) : 4xx (400/403/422) → surfacer + sortir de la file ; réseau → retenter. Aujourd'hui un 403 se retente à vie en silence.
  - *Critère :* un run rejeté affiche pourquoi ; un run hors-ligne se renvoie au retour réseau. *Event :* `run_rejected{reason}`.
- **[REPO] Garde `session===null` en cours de run** ([useRealRun.ts:126](apps/mobile/src/features/run/gps/useRealRun.ts:126)) : si session tombe, mettre en file au lieu de purger. *Risque :* faible en test fermé (users connectés), mais protège la promesse.

## Piste 3 — Capture persistée + ville (J5-J7) · *le cœur*

- **[REPO] Dériver `cityId` côté serveur** : point-in-polygon du 1er fix GPS sur `city_zones` actives, avant `claim_hexes` dans [ingest_run](supabase/functions/ingest_run/index.ts). Alternative : le faire porter par `buildPayload` ([tracker.ts:299](apps/mobile/src/features/run/gps/tracker.ts:299)).
  - *Migration :* aucune (lecture `city_zones`). *Critère :* test Deno « run dans Paris → `season_scores.paris > 0` ». *Risque :* run en bordure hors polygone → resserrer le polygone ville (Piste 9).
- **[REPO] Test bout-en-bout** déjà en place ([captureToPixel.test.ts](apps/mobile/src/features/map/captureToPixel.test.ts)) — l'étendre pour vérifier le rattachement ville.

## Piste 4 — Carte réelle (J7-J8) · *voir sa zone*

- **[REPO] Rafraîchir après capture** : consommer `reload()` ([hexClaims.ts:79](apps/mobile/src/features/map/hexClaims.ts:79)) au retour d'`ingest_run` (résultat 'sent') **et** via `useFocusEffect` à l'arrivée sur l'onglet Carte.
  - *Critère :* après une course qui capture, la zone apparaît sans redémarrer. *Event :* `territory_captured`.
- **[REPO] « Mon territoire » honnête** : brancher [TerritoryFranceMap.tsx:82](apps/mobile/src/features/territory/TerritoryFranceMap.tsx:82) + `territoire.tsx` sur `useRealTerritories`, ou l'**étiqueter « démonstration »** tant que non branché (mêmes 3 états que la Battle Map). *(Déjà noté en tâche de fond.)*

## Piste 5 — Résultat réel (J8-J9) · *ne plus mentir*

- **[REPO] KPI depuis le serveur** : dériver zones/distance/allure de `getLastRunResult()` + snapshot GPS réel ([course-result.tsx:514](apps/mobile/app/course-result.tsx:514)), **retirer le clamp 8,2 km** ([RealCourseLive.tsx:81](apps/mobile/src/features/run/gps/RealCourseLive.tsx:81)), ajouter l'état « Aucune zone capturée » + « Boucle presque fermée, il manquait N m [TERMINER] ».
  - *Critère :* deux courses différentes affichent deux résultats différents. CTA principal = `PARTAGER`.

## Piste 6 — Story exportable (J9-J13) · *la viralité*

- **[REPO] Export image 9:16.** `react-native-view-shot` (`captureRef` sur la ShareCard) + `expo-sharing` + `expo-media-library`. Rasteriser un PNG, le passer au share sheet, câbler « Sauver ».
  - *Deps :* `react-native-view-shot`, `expo-sharing`, `expo-media-library` (toutes **absentes** aujourd'hui). *Critère :* le partage produit une **vraie image**, pas du texte. *Events :* `share_preview_generated`, `share_exported`.
- **[REPO] Purger les données inventées** de la card : rang `#8`/`Paris Est`/`+3 places` ([templates.tsx:105](apps/mobile/src/features/share/templates.tsx:105)), `verified:true` en dur, « Contestée » — dériver du `serverResult` ou masquer.

## Piste 7 — Deep link (J11-J14) · *le lien qui ramène*

- **[FONDATEUR] Trancher le host** : `gryd.run` (repo actuel) ou `gryd.app` (reco produit). Le domaine doit héberger `apple-app-site-association` + `assetlinks.json` en `application/json` (**pas GitHub Pages**).
- **[REPO] Chaîne de réception** : `associatedDomains` iOS + `intentFilters` Android autoVerify + config linking expo-router (routes `z/c/d`) + handler `getInitialURL`/`useURL`, + landing web (rebond App Store, préserve l'intention).
  - *Critère :* un lien ouvre l'app **sur la bonne zone** ; post-install, l'intention est conservée. *Events :* `deep_link_created`, `deep_link_opened`, `signup_attributed`.

## Piste 8 — Analytics (J13-J16) · *mesurer*

- **[REPO] Émettre l'activation** : `territory_captured` sur capture persistée (jamais sur un bouton) + `loop_closed`/`loop_almost_closed`/`run_rejected` + toute la chaîne d'attribution (voir [MVP_ANALYTICS_TAXONOMY.md](MVP_ANALYTICS_TAXONOMY.md)).
- **[REPO] Wrapper `track`** : `event_id` unique + `event_timestamp` UTC + `city_id` contrôlé.
- **[FONDATEUR/REPO] Confirmer `EXPO_PUBLIC_POSTHOG_KEY` dans le build EAS** — sinon tout le funnel est un no-op.
- **[REPO] 4 dashboards PostHog** (Activation / Viralité / Fiabilité / Ville).

## Piste 9 — Ville pilote + épuration (J14-J18)

- **[REPO] Une seule saison active** (désactiver Lille pour un pilote mono-ville) et **resserrer le polygone** de la ville sur son emprise réelle ([0004_seed.sql](supabase/migrations/0004_seed.sql) « polygones grossiers, TODO O4 »).
- **[REPO] Feature flags** (aucun n'existe) : masquer `season/shop/arsenal/war_room/advanced_*` ; garder visible **Carte / Crew simple / Profil / Run / Résultat / Partage**. Masquer la surface, ne pas casser les moteurs.

## Piste 10 — Test terrain + support (J18-J20)

- **[FONDATEUR] Recruter 20-100 coureurs** d'une ville, à la main (pas d'acquisition nationale).
- **[REPO] Support/feedback léger** : un canal, une modération manuelle.
- **Critères de validation du pilote :** ≥ 20 activés · ≥ 70 % des runs sauvés sans incident · 1re capture réussie pour une majorité · partages réels · clics réels · quelques reprises · au moins un retour après notification.

---

## Confidentialité — déjà OK, à ne pas casser

delete_account + export_account réels, masquage départ/arrivée, RLS partout. Score 70/100. Aucune action bloquante — vérifier seulement que `delete_account`/`export_account` sont **déployées** sur le projet distant avant le test.

---

## Ce que le MVP NE fait PAS (assumé)

Pas de : pass de saison, boutique, monnaie virtuelle, War Room, Arsenal, skills, bonus, coffres, classements multiples, abonnement, A/B testing, influenceurs, data warehouse. Masqués par feature flag, pas supprimés.
