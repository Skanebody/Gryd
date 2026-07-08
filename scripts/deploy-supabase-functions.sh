#!/usr/bin/env bash
# GRYD — déploiement migrations + Edge Functions Supabase (projet distant).
# Prérequis : SUPABASE_ACCESS_TOKEN (Dashboard → Account → Access Tokens).
# Usage :
#   export SUPABASE_ACCESS_TOKEN="sbp_…"
#   ./scripts/deploy-supabase-functions.sh
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-sydwxwwirinjoheeodcg}"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Erreur : SUPABASE_ACCESS_TOKEN non défini." >&2
  echo "Crée un token sur https://supabase.com/dashboard/account/tokens puis :" >&2
  echo "  export SUPABASE_ACCESS_TOKEN=\"sbp_…\"" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Sync game-rules vers supabase/functions/_shared"
node scripts/sync-game-rules.mjs

echo "→ Push migrations (0019 crew social, 0020 realtime, …)"
npx supabase db push --project-ref "$PROJECT_REF"

echo "→ Deploy Edge Functions"
npx supabase functions deploy claim_crew_chest crew_social --project-ref "$PROJECT_REF"

echo "✓ Déploiement terminé sur $PROJECT_REF"
