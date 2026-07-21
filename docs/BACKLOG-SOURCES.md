# GRYD — sources de connexion : ce qui marche, ce qui attend le fondateur

Établi le 21/07/2026 (PÉRIMÈTRE 5). Règle appliquée, demandée explicitement par
le fondateur : **une source qui dépend de son intervention ne reste pas affichée
en « Bientôt »** — elle sort de l'écran et atterrit ici, avec la liste exacte de
ce qu'il doit faire.

L'écran concerné : `apps/mobile/app/sources.tsx` (GRYD Verify Hub).
Le catalogue : `apps/mobile/src/features/sources/catalog.ts`.
Le registre d'adaptateurs : `apps/mobile/src/features/sources/adapters/registry.ts`.

---

## Actives aujourd'hui (aucune action requise)

### GRYD Live GPS
Capture directe native (`src/features/run/gps/`). Toujours active, aucun
branchement. Trust élevé.

### Import GPX — **activé dans ce chantier**
Chaîne réelle de bout en bout :
`expo-document-picker` (choix du fichier) → `expo-file-system` (lecture locale)
→ `parseGpx` (pur, testé) → `ingest_run` (Edge Function, **seul juge du claim**).

Ce que ça change concrètement : n'importe quelle montre (Garmin, Coros, Suunto,
Polar…) ou app de course exporte un `.gpx`. Ce fichier **est** la trace. Il n'y a
donc pas besoin d'un partenariat constructeur pour récupérer une course — juste
un fichier. C'est la porte de sortie gratuite face aux intégrations verrouillées.

Effets de bord de l'activation, déjà faits :
- `RunSource` accepte `'gpx'` (`packages/shared/src/types.ts`, synchronisé
  vers `supabase/functions/_shared/`) ;
- `ingest_run` valide et **persiste** cette provenance telle quelle ;
- migration `0045_source_gpx.sql` : `runs.source` et
  `imported_activities.source` acceptent `'gpx'` (vérifiée PGlite, 12/12) ;
- deux dépendances Expo ajoutées à `apps/mobile/package.json` :
  `expo-document-picker`, `expo-file-system`.

> **Une seule chose reste à faire côté fondateur, et elle est mécanique :**
> ces deux dépendances sont des modules natifs. Elles n'entrent dans l'app qu'au
> **prochain build EAS**. Sur un build antérieur, l'adaptateur détecte leur
> absence et affiche « Sélecteur de fichier indisponible sur cet appareil » —
> il ne plante pas. Ce n'est pas un compte à créer ni une clé à obtenir : c'est
> le cycle de build normal.

---

## Retirées de l'écran — en attente d'une action du fondateur

### 1. Strava — le plus proche du but

**Déjà écrit et prêt, rien à recoder :**
- `adapters/strava.ts` : OAuth complet via `expo-auth-session`, refresh token
  stocké sur l'appareil uniquement (jamais en base), tous les états d'échec
  gérés sans exception vers l'UI ;
- `supabase/functions/strava_import/` : échange du code, refresh, fetch des
  activités, normalisation pure, déduplication Activity Hub, insertion
  service-role, idempotence par index unique. Répond proprement `503
  configuration_required` tant que le secret manque.

**Ce qui manque, et que seul le titulaire du compte Strava peut faire :**

1. Aller sur https://www.strava.com/settings/api et créer une application
   (~2 min). Renseigner :
   - *Authorization Callback Domain* : `gryd` (le scheme de l'app).
2. Récupérer les deux valeurs affichées : **Client ID** et **Client Secret**.
3. Poser le Client ID (public) dans `apps/mobile/.env` :
   ```
   EXPO_PUBLIC_STRAVA_CLIENT_ID=<client id>
   ```
4. Poser les deux côté serveur (le secret ne doit **jamais** aller dans l'app) :
   ```
   npx supabase secrets set STRAVA_CLIENT_ID=<client id> STRAVA_CLIENT_SECRET=<client secret>
   ```
5. Vérifier les **conditions d'accès à l'API Strava** en vigueur : l'accès aux
   données d'activité a été restreint côté Strava. C'est le point à trancher
   avant d'investir plus — c'est une décision produit, pas technique.
6. Re-lister la source : une entrée dans `catalog.ts`, une ligne dans
   `registry.ts`. Rien d'autre.

### 2. Apple Health (HealthKit)

**Écrit :** `adapters/appleHealth.ts` documente précisément le chemin
d'intégration (permissions, requêtes `HKWorkout`, routes, normalisation vers
`IngestRunRequest`). Le gabarit de configuration est dans `app.json`
(`_healthkit_o8`).

**Ce qui manque :**
1. Activer la capacité **HealthKit** sur l'App ID, dans le compte développeur
   Apple (action fondateur — c'est son compte).
2. Installer un module natif HealthKit et l'ajouter aux plugins Expo.
3. Régénérer un dev build EAS et tester sur appareil réel.
4. Prévoir que l'usage de HealthKit est **revu par Apple** à la soumission : il
   faut justifier la lecture des données de santé dans la fiche App Store.

### 3. Health Connect (Android)

**Écrit :** `adapters/healthConnect.ts` documente le chemin
(`androidx.health.connect`, permissions `health.READ_EXERCISE` /
`READ_DISTANCE`, lecture des `ExerciseSessionRecord`).

**Ce qui manque :** un module natif + un build Android + un appareil Android
pour tester. Aucun blocage de compte — mais rien de vérifiable tant qu'il n'y a
pas de build Android testé. Priorité basse tant que le pilote est iOS.

### 4. Garmin · WHOOP · Fitbit · Polar · Coros · Suunto

**Ce qui manque :** un **programme partenaire** par constructeur — dossier de
candidature, compte développeur, validation, délais (souvent des semaines), et
parfois des conditions commerciales.

**Recommandation :** ne rien engager. L'import GPX couvre déjà ces écosystèmes
sans négociation : ces montres exportent toutes du `.gpx`. Ces intégrations ne
valent le coût qu'une fois qu'il existe des utilisateurs qui les réclament — pas
avant.

---

## Ce que l'écran dit maintenant

Deux lignes, toutes les deux vraies : **GRYD Live GPS** (Actif) et
**Import GPX** (Importer). Plus une phrase qui explique pourquoi la liste est
courte :

> « Cette liste ne montre que les sources qui fonctionnent aujourd'hui. Les
> autres apparaîtront le jour où elles marcheront vraiment — pas avant. »

Aucun code n'a été supprimé : re-lister une source retirée est une ligne dans
`catalog.ts` et une ligne dans `registry.ts`.

---

# Notifications push (decay) — PÉRIMÈTRE 3, 21/07/2026

Même règle que les sources : ce qui dépend du fondateur est **écrit ici**, pas
caché derrière un bouton qui ne fait rien.

## Le problème que ça règle

Le decay serveur est réel depuis longtemps : `decay_job` (cron 0038/0039)
neutralise les hexes échus et, **trois jours avant** (`DECAY_WARNING_DAYS_BEFORE`),
insère un avertissement groupé — **une alerte par joueur**, jamais une par hex.
Mais cet avertissement n'existait que dans la table `notifications`, que rien
ne lit encore. Concrètement : **un joueur perdait son quartier sans jamais
avoir su qu'il pouvait le défendre.** C'est la mécanique de retour la plus
rentable du jeu, et il n'y manquait que le destinataire.

## Ce qui est réel aujourd'hui (aucune action requise)

| Chaînon | Où | État |
| --- | --- | --- |
| Détection J-3, groupée par joueur | `supabase/functions/decay_job/logic.ts` | déjà là |
| Table des appareils + RLS + RPC | `supabase/migrations/0048_push_devices.sql` | vérifiée PGlite, 30/30 |
| Préférences, quiet hours, cap | `supabase/functions/_shared/push.ts` | pur, 16 tests Deno |
| Envoi réel Expo | `supabase/functions/_shared/expo-push.ts` | POST `exp.host` |
| Orchestration + `push_log` | `supabase/functions/decay_job/index.ts` | branché |
| Enregistrement de l'appareil | `apps/mobile/src/features/notifications/push.ts` | branché |
| Écran Réglages > Notifications | `apps/mobile/app/parametres/[section].tsx` | branché |

Garanties déjà tenues, sans intervention :

- **actionnable ou rien** : un push de decay dit ce qui se passe (« {n} zones
  redeviennent neutres dans {d} j ») **et** ce qui le règle (« une course dessus
  les garde »). Aucun reproche, aucun compte à rebours anxiogène ;
- **jamais une notification par course** : le groupage est fait en amont ;
- **quiet hours** `PUSH_QUIET_HOURS_START`→`PUSH_QUIET_HOURS_END` calculées dans
  le **fuseau réel de l'appareil**, plus dans un Europe/Paris supposé ;
- **plafond** `PUSH_MAX_PER_DAY` par joueur, tous types confondus — deux
  téléphones ne comptent pas double ;
- **préférences respectées côté serveur** : les canaux choisis dans Réglages
  sont poussés dans `push_devices` à chaque changement. Couper tous les canaux
  (`off`) **supprime réellement** l'appareil de la base ;
- **cinq langues** : le texte du push est rédigé dans la langue de l'appareil.

## Ce qui attend le fondateur (et pourquoi le code ne peut pas le faire)

Un ExpoPushToken n'existe que si le **build** porte les credentials du service
de push. Ce sont des secrets liés à des comptes Apple/Google/Expo : aucun code
ne peut les fabriquer.

1. **Clé APNs (iOS)** — `eas credentials` → iOS → *Push Notifications: Manage
   your Apple Push Notifications Key* → générer (ou uploader) la clé `.p8` sur
   le projet EAS `4c80219c-3a84-445a-9add-5e5afade6d14`.
2. **FCM (Android)** — `eas credentials` → Android → uploader le
   `google-services.json` / la clé FCM v1 du projet Firebase.
3. **Rebuilder l'app.** `expo-notifications` vient d'être ajouté
   (`apps/mobile/package.json` + `expo.plugins` dans `app.json`, qui pose
   l'entitlement `aps-environment`). Comme pour l'import GPX : c'est un module
   natif, il n'entre dans l'app qu'au prochain build EAS.
4. **Optionnel** — uniquement si *Enhanced Security for Push Notifications* est
   activé sur le compte Expo :
   `npx supabase secrets set EXPO_ACCESS_TOKEN=<token>`. Sans cette option,
   l'envoi fonctionne sans jeton.

**Tant que 1–3 ne sont pas faits :** `getExpoPushTokenAsync` échoue,
`registerPushDevice` renvoie `unavailable`, et l'écran affiche « Pas encore
disponibles sur cette version de l'app ». Aucun appareil n'est enregistré, donc
`decay_job` n'appelle même pas Expo — il continue d'écrire l'inbox, comme
avant. **Rien ne ment, rien ne casse.**

## Un mensonge corrigé au passage

`digest_job` écrivait une ligne dans `push_log` alors qu'aucun push n'était
envoyé (l'envoi Expo y était un `TODO`). Deux conséquences réelles : les
statistiques d'envoi étaient fausses, et surtout le plafond `PUSH_MAX_PER_DAY`
était consommé par des envois fantômes — l'avertissement de decay, lui bien
réel, aurait pu être supprimé pour « cap atteint » à cause d'un digest jamais
parti. Le job ne journalise plus rien.

Le digest **n'est toujours pas poussé**, et c'est délibéré : `buildDigest`
compose son texte en français en dur, alors que `push_devices.locale` sait dans
quelle langue écrire au joueur. Le pousser en l'état enverrait du français à un
joueur allemand. C'est un chantier d'i18n serveur, pas une case à cocher.

## Encore à faire côté produit (aucune dépendance externe)

- **Écran Inbox** : la table `notifications` se remplit (decay, digest, saison,
  vol) et rien ne la lit. Le push est un raccourci vers l'inbox — l'inbox
  elle-même reste à construire.
- **Ouverture profonde** : le payload porte `{ type: 'decay_warning',
  cta: 'defend' }` ; reste à router le tap vers la carte centrée sur les zones
  menacées.
- **Analytics** : `push_sent` / `push_suppressed` (`packages/shared/src/events.ts`)
  ne sont pas encore émis par les jobs — `decay_job` renvoie déjà les compteurs
  dans sa réponse HTTP.
