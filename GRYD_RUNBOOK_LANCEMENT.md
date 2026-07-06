# GRYD — Runbook de lancement (06/07/2026)

De « produit dense » à « beta live ». Chaque étape : **qui fait quoi**, dépendances, et ce que je câble dès que c'est débloqué. Rien de public avant l'INPI.

## 0. Ce qui est DÉJÀ fait (rappel)
- **Produit** : 31 amendements — carte 3D/satellite, trace héros, onboarding sans friction, crews/War Room/missions, explicabilité, skills, bouton contextuel, leaderboard zone, réactions, site GRYD Premium. Constitution UI figée.
- **Backend déployé (prod)** : moteur (boucle/zones/défense graduée/decay/points), migration `0017`, `ingest_run` redéployé. Supabase live, apps câblées au vrai projet.
- **Reste = comptes/clés/build + INPI**, pas des features.

## 1. 🔴 INPI — le seul vrai gate (AVANT tout public)
- **Toi (+ conseil PI idéalement)** : recherche d'antériorité sur `data.inpi.fr` (marques + sociétés) pour « GRYD » ; dépôt de marque UE/FR classes **9** (logiciel), **41** (sport/divertissement), **42** (SaaS). ~250 € (FR) / ~850 € (UE), délai d'opposition ~3 mois.
- **Bloque** : tout déploiement public (site + stores + comms). Le repo/dev continue sans risque.
- **Si GRYD est pris** : plan B de nom prêt à basculer (le code référence le nom en un point ; renommage rapide).

## 2. 🟡 Paiements — Stripe (web) + RevenueCat (mobile)
- **Stripe (web /abonnement)** : tu crées le compte `stripe.com` → tu me donnes `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` + tu crées les produits (Premium 69 €/an, Founder 149 €). **Je câble** : checkout Stripe sur la page `/abonnement`, webhook `rc_webhook`/nouveau `stripe_webhook` (edge function), page « gérer mon abo » (portail Stripe). ~1 session.
- **RevenueCat (IAP mobile)** : tu crées le compte + configures les produits dans App Store Connect / Play Console → clé RevenueCat. **Je câble** : le SDK (déjà prévu O3), le paywall Premium/Founder in-app, le `rc_webhook` (edge function déjà écrite). Dépend du compte Apple Developer (§5).

## 3. 🟡 Strava API (O7) — import réel « transforme ta dernière course »
- **Toi** : `strava.com/settings/api` → crée une application (nom, domaine de callback) → récupère **Client ID + Client Secret**.
- **Moi** (2 min) : `SUPABASE_ACCESS_TOKEN=… npx supabase secrets set STRAVA_CLIENT_ID=… STRAVA_CLIENT_SECRET=…` (avec le token `gryd-cli-deploy` du fichier secrets) → l'OAuth + l'import `strava_import` (déjà déployé) devient réel + je branche le bouton « J'ai déjà des runs » de l'onboarding dessus.

## 4. 🟡 PostHog (analytics/rétention)
- **Toi** : crée le projet `posthog.com` → **clé projet**.
- **Moi** : remplis `EXPO_PUBLIC_POSTHQ_KEY` (mobile) + web → les events du §8 (déjà instrumentés) remontent. Métrique nord = 1re capture J1 (doc stratégie).

## 5. 🔴 Apple Developer + dev build EAS (O8) — GPS/HealthKit réels + TestFlight
- **Toi** : enrôlement **Apple Developer** (99 $/an, `developer.apple.com`) + (Android) compte Play Console (25 $ une fois).
- **Séquence exacte** (une fois le compte Apple prêt) : `eas login` (ton compte Expo) → `npx expo install expo-dev-client` (absent aujourd'hui — requis par le profil `development`) → `eas init` (lie le projet, écrit `extra.eas.projectId` dans app.json) → `eas build --profile development --platform ios` → installe sur ton iPhone. Là seulement : **vrai GPS**, capture d'une vraie course. Pour **HealthKit** (Apple Health) : à ce moment j'ajoute `react-native-health` + l'entitlement HealthKit + `NSHealthShareUsageDescription` dans app.json (l'adaptateur `appleHealth.ts` est un stub honnête qui documente ce câblage). Puis **TestFlight** pour la beta fermée.
- **Déjà prêt de mon côté** : `eas.json` (profils development/preview/production, build device pour le GPS, env Supabase) ; `app.json` (permissions GPS iOS/Android + background location). Le build part dès `expo-dev-client` + `eas init`.
- **Sans ça** : la base reste vide (aucune vraie course possible). C'est LE mur.

## 6. 🟢 Tuiles prod (O6) — optionnel
- Aujourd'hui : CARTO + Esri satellite + Terrarium DEM, **keyless**, ça suffit pour la beta. Provider dédié (MapTiler/Protomaps + terrain) = confort/robustesse plus tard, pas bloquant.

## 7. Séquence de lancement (ordre recommandé)
1. **INPI** (lancer le dépôt — c'est long, à faire EN PREMIER).
2. **Apple Developer + dev build** (débloque le GPS réel → tester le moteur sur de vraies courses = valider le cœur).
3. **Strava + PostHog** (2 clés → import réel + mesure).
4. **Stripe/RevenueCat** (monétisation — peut attendre la beta).
5. **Beachhead beta** (doc stratégie §8) : choisir la ville où l'exécution présentielle est la plus facile (valider la densité run clubs), recruter ~10 crews / 500 inscrits, Saison 1, sponsors locaux. Objectifs : D1 ≥ 30 %, D7 ≥ 12 %, D30 ≥ 8 %, suivi par cohorte de ville.

## 8. Ce que JE peux faire pendant que tu débloques
- Câbler chaque intégration **dès que tu me passes la clé** (Stripe, Strava, PostHog en minutes).
- Préparer le **profil EAS** (`eas.json` dev/preview/prod) + vérifier `app.json` (permissions GPS/Health, entitlements) pour que le build parte du premier coup.
- Continuer le **backlog produit** (P2/P3 du teardown : events de crew, itinéraires populaires, challenges sponsorisés) — pur code, sans dépendance externe.
- Écrire la **checklist beta** (onboarding des 10 premiers crews, kit sponsor, calendrier Saison 1).

> Résumé : le produit est prêt. Le lancement dépend de **l'INPI + un compte Apple Developer + 3-4 clés**. Donne-m'en une, je la branche ; ou dis-moi de préparer le profil EAS / continuer le backlog.
