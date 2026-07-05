# AMENDEMENT-15 — GPS réel « parfait » + objets connectés (05/07/2026)

**Décision fondateur (05/07/2026)** : « Vérifie et mets en place la partie GPS, il faut qu'elle soit parfaite et s'adapte à tous les téléphones et aussi aux principaux objets connectés utilisés pour la course. » (+ correctif tracés démo : plus jamais de vol d'oiseau — routage rue par rue, traité côté carte.)

## 0. Réalités matérielles (dites franchement)
- Le GPS réel s'exécute sur **appareil natif** (dev build Expo) — pas dans le preview web. On livre le moteur complet, testé sur ses parties pures, branché derrière un sélecteur : natif+permission → vrai GPS ; web/démo → simulation actuelle. **Test device = point ouvert O8** (dev build EAS/Xcode côté fondateur).
- Les API des montres/plateformes exigent des comptes développeur : **Strava** (app API — O7, création par le fondateur), **Garmin/WHOOP/Polar/Coros/Suunto** (programmes partenaires, délais — catalogués « Bientôt »), **Apple Health/Health Connect** (entitlements natifs, dev build). On livre l'architecture + le chemin Strava complet prêt-à-clés + les états honnêtes dans le Verify Hub.

## 1. Moteur GPS (pur, testé Deno — packages/engine/src/gps.ts)
Pipeline de nettoyage IDENTIQUE client/serveur (le client pré-filtre pour l'affichage, le serveur reste seul juge) :
- **Rejet d'outliers** : point ignoré si vitesse implicite > vitesse max course (réutilise les bornes §3.2), si `accuracy > GPS_ACCURACY_MAX_M`, si saut temporel/spatial incohérent (téléportation), si dérive en immobilité (jitter parking).
- **Lissage** : médiane glissante courte + moyenne pondérée par accuracy (pas de sur-lissage qui coupe les virages).
  - **ACTÉ (vérification 05/07/2026)** : le lissage pondéré par accuracy fait partie du nettoyage PRÉ-ENVOI — le payload `ingest_run` part nettoyé + lissé + décimé (pipeline déterministe, testé Deno). Le serveur borne le trust à la baisse (`min()` avec son propre calcul) et rejuge la totalité de la trace reçue : rien n'est « embelli » à son insu, il reste seul juge.
- **Distance** : haversine cumulée sur points VALIDES uniquement ; **pause auto** : vitesse < seuil pendant N s → segment pause (non compté, UI « En pause »).
- **Échantillonnage** : cadence FIXE (`GPS_SAMPLE_INTERVAL_MS` = 2 s + `distanceInterval` 0, le lissage fait le reste — suffisant au MVP, pas de cadence adaptative), décimation Douglas-Peucker légère avant envoi (payload borné).
- **GPS Trust** : score continu depuis accuracy moyenne/pertes de signal/ratio outliers — affiché en course (jauge existante) et envoyé au serveur.
- Constantes UNIQUEMENT dans `game-rules.ts` (bloc AMENDEMENT-15 : GPS_ACCURACY_MAX_M=35, GPS_PAUSE_SPEED_MS, GPS_PAUSE_AFTER_S, GPS_SAMPLE_INTERVAL_MS, GPS_MAX_PAYLOAD_POINTS…). Tests Deno : outliers, pause, tunnel (trou de signal), zigzag GPS urbain, distance de référence.

## 2. Tracking mobile (apps/mobile — src/features/run/gps/)
- **expo-location + expo-task-manager** (stack imposée, déjà en deps) : foreground `watchPositionAsync` (BestForNavigation, distanceInterval adapté) + tâche background (écran éteint/app en fond), notification de service Android, `UIBackgroundModes: location` iOS (app.json).
- **Permissions progressives, UX sans friction (GO-first)** : demande « pendant l'utilisation » au premier GO ; le background n'est demandé QUE quand l'utilisateur éteint l'écran/quitte (rationale claire une phrase). Refus → mode dégradé propre (« Course enregistrée quand l'app est ouverte »), jamais bloquant.
- **Tous les téléphones** : divergences iOS/Android gérées (Précision approximative iOS 14+ → bandeau « Active la position exacte » ; Android : détection des tueurs de batterie constructeurs → écran d'aide « Courir écran éteint » par constructeur ; reprise après kill process : buffer AsyncStorage + restauration de course).
- **États réels en course** (UI existante branchée sur le vrai signal) : GPS faible (accuracy), signal perdu (tunnel), autorisation coupée en course, batterie faible.
- **Fin de course** : payload `IngestRunRequest` réel (trace décimée + accuracies + steps si dispo via pedometer) → ingest_run existant. Idempotence par run_id local (UUID).

## 3. Objets connectés (Verify Hub réel)
- **Architecture adaptateur** (`src/features/sources/adapters/`) : interface unique { connect(), status(), lastSync, trust } ; le Verify Hub affiche l'état RÉEL de chaque source (Connecté / Configuration requise (clés) / Dev build requis / Bientôt (API partenaire)).
- **Strava (référence complète, prêt-à-clés O7)** : OAuth expo-auth-session (client id via env `EXPO_PUBLIC_STRAVA_CLIENT_ID`), edge function `strava_import` (échange token, fetch activités, normalisation → `imported_activities`, dédup existante, `capture_eligible` selon trust §Activity Hub) — déployée, inerte sans clés.
- **Apple Health / Health Connect** : adaptateurs prêts, gated « dev build requis » (HealthKit entitlement / Health Connect) — pas de lib hors stack sans besoin avéré : implémentation native = O8.
- **Garmin, WHOOP, Polar, Coros, Suunto** : « Bientôt » honnête (programmes partenaires — O-points documentés DISCOVERY) ; leurs activités arrivent DÉJÀ indirectement via Strava/Apple Health (messagé tel quel dans le Hub).
- Règle produit inchangée : seules les courses vérifiées capturent ; imports = stats/partiel selon trust (Activity Hub AMENDEMENT-06).

## 4. Hors scope (V1)
SDK natifs Garmin/WHOOP directs ; auto-pause musique ; guidage vocal ; multi-appareils simultanés ; export FIT/TCX.

## 5. Points ouverts créés
**O7** app API Strava (fondateur — 2 min sur strava.com/settings/api) ; **O8** dev build EAS/Xcode pour tester GPS + HealthKit/Health Connect sur appareil.
