#!/usr/bin/env bash
# GRYD — déploiement du SITE PUBLIC (apps/web) sur GitHub Pages (AMENDEMENT-47).
#
# DEPUIS LE 12/09/2026 LE SITE EST SERVI SUR https://gryd.run/ — plus sous le
# sous-chemin /Gryd de github.io. Ce n'est pas cosmétique : trois adresses ne
# peuvent exister QU'À la racine d'un domaine.
#   · /.well-known/apple-app-site-association — Apple ne le cherche nulle part
#     ailleurs ; sans lui, aucun lien universel n'est vérifié ;
#   · /callback — l'adresse que Supabase met dans l'e-mail de connexion
#     (apps/mobile/src/lib/links.ts). C'est la réparation du défaut fondateur du
#     12/09 : « le bouton pour s'inscrire mène vers rien du tout » ;
#   · /c/*, /r/*, /u/* — les liens de crew, de parrainage et de profil.
# Le domaine custom de GitHub Pages est porté par apps/web/public/CNAME. Ce
# script force-pousse une branche gh-pages NEUVE : sans ce fichier dans l'export,
# GitHub RETIRE le domaine à chaque déploiement. D'où la vérification dure plus bas.
#
# Le lien public sert le VRAI produit web (waitlist + légal), plus jamais le
# bundle mobile-web de démo. Le formulaire waitlist fonctionne en statique :
# appel client de la RPC `waitlist_join` (0034, clé anon publique) — cf.
# apps/web/lib/waitlistJoin.ts.
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

echo "· build export statique (STATIC_EXPORT=1, racine du domaine)"
rm -rf "$ROOT/apps/web/.next" "$OUT_DIR"
(cd "$ROOT" && STATIC_EXPORT=1 npm run build -w @klaim/web)

restore_admin
trap - EXIT

[ -f "$OUT_DIR/index.html" ] || { echo "✗ out/index.html absent — export raté" >&2; exit 1; }

echo "· staging Pages"
cp -R "$OUT_DIR/." "$STAGE"
# Sans .nojekyll, Jekyll ignore les dossiers _next/ ET les dossiers commençant
# par un point : ni les assets ni /.well-known/ ne seraient servis.
touch "$STAGE/.nojekyll"

# ── CE QUI DOIT AVOIR SURVÉCU À L'EXPORT ────────────────────────────────────
# Trois fichiers viennent de apps/web/public/. Next les recopie tels quels, mais
# un échec est SILENCIEUX : le site se déploierait, joli, avec le domaine perdu
# et les liens universels morts. On refuse de pousser plutôt que de le découvrir
# par un e-mail qui ne marche pas.
[ "$(tr -d '[:space:]' < "$STAGE/CNAME" 2>/dev/null)" = "gryd.run" ] || {
  echo "✗ CNAME absent ou faux dans l'export — GitHub retirerait le domaine gryd.run. Stop." >&2
  exit 1
}
AASA="$STAGE/.well-known/apple-app-site-association"
[ -f "$AASA" ] || { echo "✗ /.well-known/apple-app-site-association absent de l'export. Stop." >&2; exit 1; }
node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))" "$AASA" || {
  echo "✗ apple-app-site-association n'est pas du JSON valide — Apple le rejetterait. Stop." >&2
  exit 1
}
[ -f "$STAGE/callback/index.html" ] || {
  echo "✗ /callback absent de l'export — le lien des e-mails tomberait sur le 404. Stop." >&2
  exit 1
}
echo "· vérifié : CNAME gryd.run · apple-app-site-association · /callback"

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
echo "✓ déployé — https://gryd.run/ (~1 min de reconstruction Pages)"
echo "  rappel : le domaine custom se relit avec \`gh api repos/Skanebody/Gryd/pages\`"
echo "  (champs cname, status, https_enforced) — cf. docs/product/GRYD_SITE_GRYD_RUN_2026_09.md"
