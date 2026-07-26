#!/usr/bin/env bash
# GRYD — déploiement du SITE PUBLIC (apps/web) sur GitHub Pages (AMENDEMENT-47).
#
# Le lien public https://skanebody.github.io/Gryd/ sert le VRAI produit web
# (waitlist + légal), plus jamais le bundle mobile-web de démo. Le formulaire
# waitlist fonctionne en statique : appel client de la RPC `waitlist_join`
# (0034, clé anon publique) — cf. apps/web/lib/waitlistJoin.ts.
#
# /admin est EXCLU du site public : c'est un outil fondateur (server actions +
# cookies) qui ne peut pas fonctionner en statique — publier sa porte de login
# serait un bouton mort. Le dossier est déplacé pendant le build puis TOUJOURS
# restauré (trap), même si le build échoue.
#
# Usage : bash scripts/deploy-web-ghpages.sh          (build + push gh-pages)
#         DRY_RUN=1 bash scripts/deploy-web-ghpages.sh (build seul, pas de push)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ADMIN_DIR="$ROOT/apps/web/app/admin"
ADMIN_PARK="$(mktemp -d)/admin"
OUT_DIR="$ROOT/apps/web/out"
STAGE="$(mktemp -d)/site"
REMOTE="https://github.com/Skanebody/Gryd.git"

# Les clés NEXT_PUBLIC_* (anon, publiques par design) doivent exister au build,
# sinon le formulaire rendrait « indisponible » en dur dans le bundle.
if ! grep -qs "NEXT_PUBLIC_SUPABASE_URL" "$ROOT/apps/web/.env.local"; then
  echo "✗ apps/web/.env.local sans NEXT_PUBLIC_SUPABASE_URL — le formulaire serait mort. Stop." >&2
  exit 1
fi

restore_admin() {
  if [ -d "$ADMIN_PARK" ] && [ ! -d "$ADMIN_DIR" ]; then
    mv "$ADMIN_PARK" "$ADMIN_DIR"
    echo "· /admin restauré"
  fi
}
trap restore_admin EXIT

echo "· exclusion de /admin du build public"
mv "$ADMIN_DIR" "$ADMIN_PARK"

echo "· build export statique (STATIC_EXPORT=1, basePath /Gryd)"
rm -rf "$ROOT/apps/web/.next" "$OUT_DIR"
(cd "$ROOT" && STATIC_EXPORT=1 npm run build -w @klaim/web)

restore_admin
trap - EXIT

[ -f "$OUT_DIR/index.html" ] || { echo "✗ out/index.html absent — export raté" >&2; exit 1; }

echo "· staging Pages"
cp -R "$OUT_DIR/." "$STAGE"
# Sans .nojekyll, Jekyll ignore les dossiers _next/ → assets 404.
touch "$STAGE/.nojekyll"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "✓ DRY_RUN : export prêt dans $STAGE (pas de push)"
  exit 0
fi

echo "· push gh-pages"
(
  cd "$STAGE"
  git init -q
  git checkout -qb gh-pages
  git add -A
  git commit -qm "GRYD site public (apps/web, export statique) — AMENDEMENT-47 : fin de la démo publique"
  git remote add origin "$REMOTE"
  git push -qf origin gh-pages
)
echo "✓ déployé — https://skanebody.github.io/Gryd/ (~1 min de reconstruction Pages)"
