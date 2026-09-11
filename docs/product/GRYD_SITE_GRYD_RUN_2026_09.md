# GRYD — le site public sur gryd.run (12/09/2026)

Ce document décrit **ce qui est réellement en ligne**, à quelles adresses, comment on le
republie, et ce qui n'est pas encore prouvé. Il ne promet rien que le dépôt ne contienne.

---

## 1. Le défaut réparé

Retour du fondateur, 12/09/2026 :

> « Le bouton pour s'inscrire mène vers rien du tout ; il faudrait simplement qu'appuyer sur
> le lien dise félicitations, vous êtes inscrit. »

La cause était exacte et technique. Le lien magique envoyé par Supabase redirigeait vers
`gryd://callback`, un **schéma privé**. Un client mail ne rend cliquable que `http`/`https` ;
un Mac, un webmail ou Gmail (qui réécrit chaque lien par son proxy) ne savent pas ouvrir
`gryd://`. Le lien existait et était **inatteignable** : un bouton mort à l'endroit précis où
l'on demande à quelqu'un de créer son compte.

Le retour passe maintenant par une **URL HTTPS réelle**, `https://gryd.run/callback`, servie
par `apps/web`. La page félicite, puis rend la session à l'app.

---

## 2. Ce qui est en ligne, adresse par adresse

| Adresse | Ce que c'est | Fichier source |
|---|---|---|
| `https://gryd.run/` | Landing waitlist (le vrai produit web, pas la démo) | `apps/web/app/page.tsx` |
| `https://gryd.run/callback` | Arrivée du lien de connexion | `apps/web/app/callback/page.tsx` |
| `https://gryd.run/.well-known/apple-app-site-association` | Liens universels iOS | `apps/web/public/.well-known/apple-app-site-association` |
| `https://gryd.run/confidentialite/` | Politique de confidentialité (pied des e-mails, App Store Connect) | `apps/web/app/confidentialite/page.tsx` |
| `https://gryd.run/conditions/` | CGU | `apps/web/app/conditions/page.tsx` |
| `https://gryd.run/cgv/` | CGV | `apps/web/app/cgv/page.tsx` |
| `https://gryd.run/mentions-legales/` | Mentions légales (LCEN) | `apps/web/app/mentions-legales/page.tsx` |
| `https://gryd.run/email/gryd-logo-email.png` | Logo des e-mails, 240 × 240 | lot E1 (`apps/web/public/email/`) |
| `https://gryd.run/email/gryd-hero-email.jpg` | Héros des e-mails, 1200 × 600 | lot E1 (`apps/web/public/email/`) |

**L'export ajoute un slash final** (`trailingSlash: true`, la seule forme que GitHub Pages
sait servir depuis un dossier). `https://gryd.run/callback` fonctionne : Pages répond 301 vers
`/callback/`, et le navigateur **reconduit le fragment** — les jetons ne sont pas perdus. Les
deux formes sont d'ailleurs déclarées dans le fichier Apple.

Les quatre pages légales sont liées depuis le pied de la landing
(`apps/web/app/components/landing/Footer.tsx`) : rien à ajouter, c'était déjà fait
(AMENDEMENT-33 §6).

---

## 3. La page `/callback`

`apps/web/app/callback/page.tsx` est un composant **client** : le fragment `#access_token=…`
n'est jamais envoyé au serveur, il ne peut être lu que par le navigateur. Le titre et le
`noindex` sont portés par `apps/web/app/callback/layout.tsx` (Next interdit d'exporter
`metadata` depuis un composant client).

**Elle ne décide rien elle-même.** Le verdict vient de `readAuthCallbackLink2026`
(`apps/web/lib/authCallbackLink2026.ts`), fonction **pure**, miroir de `parseAuthCallback2026`
côté mobile, couverte par 18 tests (`npm run test:web`, dans le gate).

### Les six verdicts, et le septième état

| Verdict | Ce que le lien contient | Titre affiché | Bouton |
|---|---|---|---|
| `token_hash` | `?token_hash=…&type=…` (le lien direct, lot E4) — **rien n'est vérifié** | « Ton lien de connexion est prêt. » | oui, `gryd://callback?token_hash=…` |
| `signup` | jetons + `type=signup` | « Félicitations, ton compte GRYD est créé. » | oui |
| `return` | jetons (magiclink, recovery, email_change) ou code PKCE | « Bon retour sur GRYD. » | oui |
| `expired` | `error_code`/`error_description` contenant `expired` | « Ce lien a expiré. » | non |
| `failed` | une autre erreur serveur | « Ce lien n'a pas pu être validé. » | non |
| `incomplete` | ni jetons, ni code, ni erreur | « Ce lien est incomplet. » | non |

Le septième état est **EN COURS** : le HTML statique est produit au build, où `window` n'existe
pas ; le lien n'est donc lu qu'au montage. Cet instant est nommé (« Lecture de ton lien. »)
plutôt que déguisé en réussite (L8/L14). Sans JavaScript il ne se résoudrait jamais : un
`<noscript>` le remplace alors par une phrase vraie.

### Quatre refus assumés

1. **Aucune ouverture automatique de `gryd://`.** Une redirection vers un schéma privé produit
   une alerte système partout où l'app n'est pas là (Mac, webmail, navigateur intégré). On
   propose, on n'impose pas.
2. **Aucun lien App Store.** GRYD n'y est pas publié : aucune adresse `apps.apple.com/…/gryd`
   n'existe dans le dépôt. Un bouton « Télécharger » serait un bouton mort (MASTER §12).
3. **Aucun bouton sur un lien expiré, refusé ou incomplet.** `appUrl` vaut `null` : ouvrir
   l'app ne rattraperait pas ce que le serveur a déjà refusé.
4. **Aucune journalisation.** Le fragment porte des jetons de session : pas de `console.log`,
   pas d'analytics, et `noindex, nofollow` pour la même raison.

---

## 4. Liens universels iOS

`apps/web/public/.well-known/apple-app-site-association` — fichier **sans extension**, servi en
HTTPS, **sans redirection**, à la racine du domaine (Apple ne le cherche nulle part ailleurs).

```json
{ "applinks": { "details": [ { "appIDs": ["NXGNDQBUMB.fr.nexus1993.gryd"],
  "components": [ {"/": "/callback"}, {"/": "/callback/"},
                  {"/": "/c/*"}, {"/": "/r/*"}, {"/": "/u/*"} ] } ] },
  "webcredentials": { "apps": ["NXGNDQBUMB.fr.nexus1993.gryd"] } }
```

Les chemins sont le **miroir exact** de `UNIVERSAL_LINK_PATHS` dans
`apps/mobile/src/lib/links.ts`, et `webcredentials` le miroir de `ios.associatedDomains` dans
`apps/mobile/app.json` : une divergence casserait la vérification côté Apple.

### Content-Type : ce que GitHub Pages sert réellement

Apple demande `application/json`. GitHub Pages ne permet pas de choisir un en-tête, et sert un
fichier sans extension en `application/octet-stream`. **Mesuré le 12/09/2026** :

```
$ curl -sI https://gryd.run/.well-known/apple-app-site-association
HTTP/2 200
server: GitHub.com
content-type: application/octet-stream
```

**Et Apple l'accepte** : depuis iOS 9.3 la validation passe par le CDN d'Apple, qui récupère le
fichier, vérifie que c'est du JSON et le met en cache. **Vérifié le même jour** :
`curl https://app-site-association.cdn-apple.com/a/v1/gryd.run` rend **200** avec exactement
notre contenu. Ce qui serait rédhibitoire, c'est une redirection, un 404 ou du HTML — pas un
octet-stream. S'il fallait un jour `application/json`, il faudrait changer d'hébergeur
(Cloudflare Pages, Vercel), pas de fichier.

### Ce qui n'est PAS fait, et pourquoi

- **`assetlinks.json` (Android) n'est pas publié.** `apps/mobile/app.json` déclare bien un
  `android.package` (`fr.nexus1993.gryd`), mais le fichier exige l'empreinte **SHA-256 du
  certificat de signature** (`eas credentials` → Android → Keystore). Aucun build Android
  n'existe à ce jour : écrire le fichier avec une empreinte inventée ou vide serait une
  fiction, et une fiction qui casse la vérification. Le repli est identique au chemin
  d'aujourd'hui : Android ouvre le navigateur, le navigateur sert `/callback`, le bouton fait
  `gryd://callback#…`. À faire le jour du premier build Android — c'est un fichier de plus
  dans `apps/web/public/.well-known/`, rien d'autre.
- **`/c/*`, `/r/*` et `/u/*` n'ont aucune page web.** Sur un appareil où GRYD est installé,
  iOS remet ces adresses à l'app. **Sans l'app, elles tombent sur le 404 du site.** C'est une
  dette ouverte (une page d'atterrissage d'invitation), pas un effet de ce lot.

### Le chemin « sans clic » est devenu celui de l'e-mail (lot E4, 12/09/2026)

Un lien universel s'ouvre dans l'app quand l'utilisateur **tape le lien** (Mail, Messages, une
page web). Il ne s'ouvre **pas** à la fin d'une chaîne de redirections : Safari qui suit un 302
ne passe pas la main à l'app. Or l'e-mail de Supabase pointait sur
`https://<projet>.supabase.co/auth/v1/verify?…`, qui redirigeait ensuite vers
`gryd.run/callback`. Sur ce chemin, c'était le bouton « Ouvrir GRYD » qui faisait le travail.

**Le lot E4 a supprimé la redirection.** Les gabarits `confirmation.html` et `magic-link.html`
écrivent maintenant l'adresse finale eux-mêmes :

```
{{ .SiteURL }}/callback?token_hash={{ .TokenHash }}&type=signup      (Confirm signup)
{{ .SiteURL }}/callback?token_hash={{ .TokenHash }}&type=magiclink   (Magic Link)
```

(`{{ .Type }}` n'existe pas dans les variables de gabarit de Supabase : le type est écrit en
dur, un par gabarit.) L'app lit `?token_hash=` et l'échange elle-même
(`supabase.auth.verifyOtp`) — voir `GRYD_ONBOARDING_2026_09.md` §2.3 pour la chaîne complète.

**Cette page reste indispensable, et son rôle a changé.** Sans l'app, elle reçoit le haché et
**ne le vérifie pas** : un `token_hash` ne sert qu'une fois, le consommer ici le rendrait mort
pour l'app. Elle dit « Ton lien de connexion est prêt. » et tend le bouton
`gryd://callback?token_hash=…&type=…`.

**Vérifié en ligne le 12/09/2026** : `https://gryd.run/callback?token_hash=…&type=magiclink`
répond 301 vers `/callback/?token_hash=…&type=magiclink` — **GitHub Pages reconduit la query**,
comme il reconduit le fragment. Les deux formes (`/callback` et `/callback/`) sont déclarées
dans l'`apple-app-site-association`, donc iOS n'a de toute façon aucune redirection à suivre.

---

## 5. Hébergement : GitHub Pages sur domaine custom

- Dépôt `Skanebody/Gryd`, branche **`gh-pages`**, `build_type: legacy` (pas d'Action).
- Domaine custom **`gryd.run`** (Infomaniak, expire le 15/07/2027), porté par
  `apps/web/public/CNAME`.
- **Le fichier `CNAME` n'est pas décoratif.** `scripts/deploy-web-ghpages.sh` force-pousse une
  branche `gh-pages` **neuve** à chaque déploiement : sans ce fichier dans l'export, GitHub
  **retire** le domaine custom. Le script refuse maintenant de pousser s'il manque.
- **`basePath` est vide** (`apps/web/next.config.ts`). Le site vivait sous
  `https://skanebody.github.io/Gryd/`, d'où un `basePath: '/Gryd'`. À la racine d'un domaine il
  n'a plus lieu d'être — et il rendrait `/.well-known/…` et `/callback` introuvables.
  `PAGES_BASE_PATH` reste une porte de secours pour republier temporairement sous un
  sous-chemin.
- **`.nojekyll`** est posé par le script dans l'export. Sans lui, Jekyll ignore `_next/` **et
  les dossiers commençant par un point** : ni les assets ni `/.well-known/` ne seraient servis.

### DNS à poser chez Infomaniak

| Type | Nom | Valeur |
|---|---|---|
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| CNAME | `www` | `skanebody.github.io.` |

Le compte GitHub Pages est bien `skanebody`. **Ne pas toucher aux MX, SPF ni DMARC** : ils
servent la boîte `no-reply@gryd.run` (Infomaniak) et n'ont rien à voir avec Pages.

**État constaté le 12/09/2026 à 12 h 30** : le CNAME `www` est posé et résout bien vers les
quatre adresses IPv4 de Pages ; l'apex `gryd.run` ne porte que **deux AAAA**
(`2606:50c0:8000::153`, `2606:50c0:8001::153`) et **aucun A**. Le site répond malgré tout — le
certificat est émis, le contenu est servi — parce que la résolution tombe sur IPv6.

**Il reste à poser les quatre A sur l'apex.** Ce n'est pas de la redondance de confort : un
réseau sans IPv6 (beaucoup de réseaux mobiles et d'entreprises) ne trouve aujourd'hui
**rien du tout** sur `gryd.run`, alors que `www.gryd.run` lui répond. Les deux AAAA restants
(`8002::153`, `8003::153`) complètent ensuite la redondance.

---

## 6. Redéployer

```bash
# 1. Le gate doit être vert (il joue npm run test:web, les 18 tests de /callback).
npm run gate

# 2. Export + push gh-pages. Exige apps/web/.env.local (clés NEXT_PUBLIC_*).
bash scripts/deploy-web-ghpages.sh
#    DRY_RUN=1 bash scripts/deploy-web-ghpages.sh  → build seul, aucun push

# 3. Relire l'état de Pages (cname, status, https_enforced)
gh api repos/Skanebody/Gryd/pages
```

Le script vérifie avant de pousser : `CNAME` = `gryd.run`, `apple-app-site-association` présent
et JSON valide, `/callback/index.html` présent. Il échoue plutôt que de publier un site joli
dont le domaine est perdu et les liens universels morts.

### Domaine custom et certificat (une seule fois)

```bash
gh api -X PUT repos/Skanebody/Gryd/pages -f cname=gryd.run
# puis, une fois le certificat Let's Encrypt émis (quelques minutes après le DNS) :
gh api -X PUT repos/Skanebody/Gryd/pages -F https_enforced=true
```

### Recette en ligne

```bash
curl -I  https://gryd.run/.well-known/apple-app-site-association   # 200, sans redirection
curl -s  https://gryd.run/callback/ | head                          # HTML de la page
curl -sI https://gryd.run/confidentialite/ | head -1                # 200
curl -s https://app-site-association.cdn-apple.com/a/v1/gryd.run    # cache d'Apple
```

**Relevé du 12/09/2026, site en ligne :**

| Vérification | Résultat |
|---|---|
| `gh api repos/Skanebody/Gryd/pages` | `status: built` · `cname: gryd.run` · `https_enforced: true` · certificat `approved` (gryd.run + www.gryd.run, jusqu'au 10/12/2026) |
| `https://gryd.run/callback` | 301 vers `https://gryd.run/callback/` (le fragment est reconduit par le navigateur) |
| `https://gryd.run/callback/` | 200 `text/html` — titre « GRYD : ton compte », `noindex, nofollow` |
| `?token_hash=…&type=magiclink` | 301 vers `/callback/?token_hash=…&type=magiclink` — **la query est reconduite** (relevé du 12/09/2026, lot E4) |
| `#…&type=signup` en navigateur réel | « Félicitations, ton compte GRYD est créé. » et bouton `gryd://callback#access_token=…&type=signup` |
| `#error=…&error_code=otp_expired` | « Ce lien a expiré. » et **aucun bouton** |
| sans fragment | « Ce lien est incomplet. » |
| `/.well-known/apple-app-site-association` | 200, `application/octet-stream`, JSON intact, aucune redirection |
| CDN d'Apple | 200, contenu identique |
| `/`, `/confidentialite/`, `/conditions/`, `/cgv/`, `/mentions-legales/` | 200 |
| `/email/gryd-logo-email.png`, `/email/gryd-hero-email.jpg` | 200 `image/png`, 200 `image/jpeg` |
| `https://skanebody.github.io/Gryd/` | 301 vers `https://gryd.run/` — l'ancien lien public n'est pas perdu |

Non vérifiable depuis ici : **l'ouverture réelle de l'app par un lien universel** (elle exige un
build iOS qui embarque l'entitlement, cf. §7) et **la réception d'un vrai e-mail de connexion**.

---

## 7. Ce qui reste ouvert

1. **Le build iOS.** Les entitlements `associated-domains` sont posés **à la compilation** : le
   binaire installé sur l'iPhone du fondateur ignore tout de `gryd.run`. Tant qu'un nouveau
   build EAS n'est pas installé, le chemin est « page web + bouton », jamais l'ouverture
   directe. C'est désormais le **seul** obstacle à l'ouverture sans clic : le lot E4 a retiré
   l'autre (la chaîne de redirections).
2. **`assetlinks.json`** (voir §4) : au premier build Android.

### Résolu depuis

- **Point 3 de la version précédente (« obtenir l'ouverture directe sans clic »)** : fait par le
  lot E4 — le gabarit d'e-mail vise `gryd.run/callback?token_hash=…&type=…`, sans redirection.
  Voir §4 ci-dessus et `GRYD_ONBOARDING_2026_09.md` §2.3.
- **L'`uri_allow_list` de Supabase** : relue le 12/09/2026 par
  `GET /v1/projects/<ref>/config/auth`, elle contient `https://gryd.run/**`, et `site_url` vaut
  `https://gryd.run`. C'est `{{ .SiteURL }}` qui fabrique désormais le lien, donc cette valeur
  compte plus que jamais : la changer déplacerait le lien de tous les e-mails.
4. **Pages d'atterrissage `/c/*`, `/r/*`, `/u/*`** : aujourd'hui un 404 pour qui n'a pas l'app.
5. **Le chemin sans clic** (§4) : dépend du gabarit d'e-mail et de `verifyOtp` côté app.
