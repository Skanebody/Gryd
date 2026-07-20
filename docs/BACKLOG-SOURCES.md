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
