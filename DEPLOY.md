# GRYD — Déploiement staging & TestFlight

Guide opérationnel pour O1 (Supabase) et O8 (TestFlight).

## Prérequis one-time

### 1. Supabase staging (`sydwxwwirinjoheeodcg`)

1. Créer un [access token](https://supabase.com/dashboard/account/tokens)
2. Récupérer la clé **anon** du projet : Settings → API → `anon` `public`

### 2. Expo / EAS (Option C)

```bash
# 1. Token Expo (Chrome → expo.dev/settings/access-tokens)
export EXPO_TOKEN=...

# 2. Anon key Supabase (Chrome → project settings → API)
export EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# 3. Lier le projet (une fois)
cd apps/mobile
npx eas-cli login
npx eas-cli init

# 4. Pousser les secrets EAS (preview + development)
cd ../..
npm run setup:eas
```

Vérification :

```bash
cd apps/mobile && npx eas-cli env:list --environment preview
```

L'`eas.json` référence déjà `@EXPO_PUBLIC_SUPABASE_ANON_KEY` sur les profils `preview` et `development`.

### 3. GitHub Actions (optionnel)

Ajouter dans **Settings → Secrets → Actions** :

| Secret | Source |
|--------|--------|
| `SUPABASE_ACCESS_TOKEN` | Supabase dashboard |
| `SUPABASE_PROJECT_REF` | `sydwxwwirinjoheeodcg` |
| `EXPO_TOKEN` | expo.dev → Access Tokens |

---

## Commandes locales

```bash
# Sync constantes jeu → edge functions
npm run sync:rules

# Déployer migrations + edge functions staging
export SUPABASE_ACCESS_TOKEN=...
npm run deploy:staging

# Preview sans exécuter
npm run deploy:staging:dry

# Build iOS TestFlight (internal, profil preview)
export EXPO_TOKEN=...
npm run testflight:ios

# Tout enchaîner
export SUPABASE_ACCESS_TOKEN=... EXPO_TOKEN=...
npm run ship:staging
```

---

## GitHub Actions (manuel)

| Workflow | Action |
|----------|--------|
| **Deploy Staging** | `db push` + deploy `ingest_run`, `crew_membership`, `decay_job`, `digest_job` |
| **TestFlight iOS** | `eas build --platform ios --profile preview` |

---

## Ce qui est déployé

### Migration `0018_map_and_crew.sql`

- RPC `hex_claims_for_city(p_city_id)` — lecture carte mobile
- RPC `generate_crew_code()` — service_role only

### Edge Functions

| Function | Rôle |
|----------|------|
| `ingest_run` | GPS → claims serveur |
| `crew_membership` | create / join_by_code / leave |
| `decay_job` | decay territoire (cron) |
| `digest_job` | notifications digest (cron) |

---

## Vérification post-deploy

```bash
# Tests edge functions (local, sans Docker)
~/.deno/bin/deno test --allow-read supabase/functions/

# Typecheck monorepo
npm run typecheck
```

Côté mobile : build preview avec `EXPO_PUBLIC_SUPABASE_URL` déjà dans `eas.json` + anon key via secret EAS.

---

## Blocages connus

| Item | Débloqueur |
|------|------------|
| Pas de `SUPABASE_ACCESS_TOKEN` | Token dashboard Supabase |
| Pas de `EXPO_TOKEN` | Token expo.dev |
| `eas init` non fait | `cd apps/mobile && eas init` |
| Apple credentials | `eas credentials` + compte Apple Developer |
