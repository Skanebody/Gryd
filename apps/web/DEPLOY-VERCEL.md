# Déployer le lien public GRYD sur Vercel (`apps/web`)

But : le **lien public** de GRYD doit servir `apps/web` (le vrai site — waitlist + pages
légales + admin), et non plus le bundle mobile-web de démo (AMENDEMENT-47 : « le lien public
sert `apps/web` ; le bundle mobile-web redevient l'instrument de preview du fondateur sur
localhost »).

`apps/web` est un **Next.js 15 avec des parties serveur** (la server action du formulaire
waitlist `app/actions.ts`, et le panneau `/admin/*` rendu à la demande). **GitHub Pages ne
peut pas l'héberger** (statique seul). L'hôte natif de Next.js est **Vercel** — gratuit pour
ce volume. Ces étapes ne peuvent être faites que par toi (connexion à ton compte) ; tout le
reste est prêt (`npm run build -w @klaim/web` passe au vert, cf. routes ci-dessous).

## 1. Importer le repo
1. Va sur https://vercel.com → **Add New… → Project**.
2. Connecte GitHub, choisis **`Skanebody/Gryd`**.
3. **Root Directory** = **`apps/web`** (bouton *Edit* à côté du repo). Vercel détecte
   automatiquement Next.js et le monorepo npm workspaces (il installe depuis la racine, ce
   qui résout `@klaim/shared` / `@klaim/engine`). Ne change ni Build ni Install (auto).

## 2. Variables d'environnement (onglet *Environment Variables*)
Ajoute-les toutes en **Production** (et *Preview* si tu veux tester les branches).
Les valeurs `NEXT_PUBLIC_*` sont publiques par nature (clés client, RLS active) ; les autres
sont **secrètes** — tu les as en local dans `scratchpad-secrets.local` et sur le dashboard
Supabase (Project → Settings → API). **Ne les mets jamais en dur dans le repo.**

| Variable | Rôle | Où la trouver | Public ? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (client) | Supabase → Settings → API → Project URL | oui |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon (client, RLS) | Supabase → Settings → API → anon public | oui |
| `NEXT_PUBLIC_POSTHOG_KEY` | Clé projet PostHog (analytics client) | PostHog → Project settings | oui |
| `NEXT_PUBLIC_POSTHOG_HOST` | Hôte PostHog (ex. `https://eu.i.posthog.com`) | PostHog | oui |
| `SUPABASE_URL` | Même URL, côté serveur (admin) | = `NEXT_PUBLIC_SUPABASE_URL` | — |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (admin lit/écrit hors RLS) | Supabase → Settings → API → service_role | **SECRET** |
| `ADMIN_SESSION_SECRET` | Signe le cookie de session admin (≥ 32 car.) | `scratchpad-secrets.local` | **SECRET** |
| `ADMIN_EMAIL` | Identifiant de login `/admin` | ton choix | — |
| `ADMIN_PASSWORD` | Mot de passe `/admin` (≥ 12 car.) | ton choix, FORT | **SECRET** |

Note sécurité : en **production**, le code REFUSE de démarrer l'admin si `ADMIN_SESSION_SECRET`
/ `ADMIN_EMAIL` / `ADMIN_PASSWORD` sont absents ou trop courts (fail-closed, `session.ts`) —
c'est voulu (repo public). Choisis un `ADMIN_PASSWORD` réellement fort : `/admin` sera
accessible sur Internet. Si tu préfères, tu peux ajouter en plus la **Vercel Password
Protection** (Project → Settings → Deployment Protection) ou restreindre `/admin` — mais le
login applicatif suffit à démarrer.

## 3. Déployer et vérifier
1. **Deploy**. Tu obtiens une URL `https://gryd-*.vercel.app`.
2. Vérifie : la page d'accueil (waitlist), les pages légales `/cgv` `/conditions`
   `/confidentialite` `/mentions-legales`, et le login `/admin/login`.
3. Teste une inscription waitlist → elle doit apparaître dans la table `waitlist` (Supabase).
   Le formulaire renvoie une **erreur nommée** si l'env Supabase manque (jamais un faux
   « succès » — charte « l'app ne ment jamais »).

## 4. Domaine + retrait de l'ancien lien démo
- (Optionnel) Project → Settings → **Domains** : branche `gryd.app` / `gryd.run` quand
  l'arbitrage O10 est tranché.
- Une fois le lien Vercel en place, **retire la démo GitHub Pages** pour ne pas laisser deux
  faces publiques : supprime la branche `gh-pages` (`git push origin --delete gh-pages`) ou
  désactive Pages (repo → Settings → Pages → Source: None). Le bundle mobile-web reste servi
  en local pour ta preview (`mobile-web`, port 8081).

## Routes (sortie de `next build`, pour référence)
- **Statique** (`○`) : `/`, `/cgv`, `/conditions`, `/confidentialite`, `/mentions-legales`, `/abonnement`.
- **Serveur à la demande** (`ƒ`) : `/admin` et `/admin/*` (auth, simulateur, signalements…).
  C'est précisément ce que GitHub Pages ne sait pas faire et que Vercel gère nativement.
