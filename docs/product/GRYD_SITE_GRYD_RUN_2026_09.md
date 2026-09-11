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

Les quatre pages légales sont liées depuis le pied du site
(`apps/web/components/ui/SiteFooter.tsx`, colonne « légal et contact »), qui lit
`apps/web/lib/site2026.ts` : une seule liste, donc aucun lien mort possible. Le pied de
l'ancienne landing qui les portait (`app/components/landing/Footer.tsx`) a été supprimé avec
le reste de la landing morte (lot W3).

⚠️ **Ce tableau décrit ce qui est EN LIGNE**, et il ne dit pas tout : les huit pages du lot W3
(§8) sont servies **depuis le 12/09 à 15:21**, par le lot W4 (§10). Ce tableau garde les adresses
fondatrices ; le §10 porte la liste complète et ses codes.

---

## 3. La page `/callback`

`apps/web/app/callback/page.tsx` est un composant **client** : le fragment `#access_token=…`
n'est jamais envoyé au serveur, il ne peut être lu que par le navigateur. Le titre et le
`noindex` sont portés par `apps/web/app/callback/layout.tsx` (Next interdit d'exporter
`metadata` depuis un composant client).

**Elle ne décide rien elle-même.** Le plan vient de `handoffPlan2026`
(`apps/web/lib/authHandoff2026.ts`, 13 tests) et le verdict de repli de
`readAuthCallbackLink2026` (`apps/web/lib/authCallbackLink2026.ts`, 18 tests) — deux fonctions
**pures**, miroirs de `parseAuthCallback2026` côté mobile, jouées par `npm run test:web`,
dans le gate.

### La page VALIDE, et rend la session à l'app (lot E5, 12/09/2026)

Décision du fondateur, mot pour mot : « vas juste vers une page qui dit que ça a été bien validé
mais derrière il faut que le compte fonctionne dans l'application ».

**Ce qui a changé, et pourquoi ça renverse une décision de E4.** E4 interdisait à cette page de
vérifier le haché : il ne sert qu'une fois, et le consommer ici le rendrait mort pour l'app.
L'argument était juste, et il reposait sur une hypothèse — que l'app puisse recevoir le lien. Elle
ne le peut pas : le lien universel exige la capacité Apple « Associated Domains », absente du profil
de signature (build `fe030292` **ERRORED**). E5 lève l'hypothèse plutôt que la conclusion.

Quand l'adresse porte un **nonce** (`?n=<64 hex>`, écrit par l'app dans sa propre demande de lien) :

1. `verifyOtp({ token_hash, type })` — la page vérifie, et obtient une **vraie session** ;
2. `auth_handoff_deposit_2026` — elle dépose son `refresh_token` contre `sha256(nonce)`
   (migration `0198_auth_handoff_2026.sql`). Cinq minutes, un seul usage ;
3. `signOut({ scope: 'local' })` — **le navigateur ne garde rien**. `persistSession: false` :
   aucune session n'est écrite sur le disque, aucune ne survit à cet onglet. Le `scope: 'local'` ne
   révoque **pas** le jeton côté serveur, ce serait détruire ce qu'on vient de déposer pour l'app ;
4. elle affiche **« C'est validé. »**, et l'app — restée sur « Lien envoyé » — réclame le jeton et
   se connecte toute seule.

Trois options du client Supabase, et chacune retire quelque chose : `persistSession: false` (rien
sur le disque), `autoRefreshToken: false` (sinon le SDK pourrait rafraîchir en arrière-plan et
**invalider** le jeton qu'on vient de déposer — la rotation est active sur le projet),
`detectSessionInUrl: false` (c'est le code de la page qui lit l'adresse, une fois, au moment choisi).

**L'adresse est nettoyée de l'historique** dès qu'elle a été lue — `history.replaceState` vers
`/callback` nu, avant même l'appel réseau. Ce que ce nettoyage ne fait pas, et il faut le dire : la
requête HTTP est déjà partie avec sa query, l'hébergeur a pu la voir. C'est une propriété du lien de
E4 (le haché y voyage aussi), pas une régression de E5 — et c'est pour ça que la remise vit cinq
minutes et ne sert qu'une fois.

**Sans nonce, rien ne change.** Un lien parti avant ce lot n'en porte pas : la page ne vérifie alors
**rien** et rend exactement les six verdicts E4 ci-dessous. Un refus serveur déjà écrit dans l'URL,
une session dans le fragment, un code PKCE, un `type` inconnu : tous retombent sur E4, sans rien
consommer.

### Les quatre états de la validation (E5)

| État | Quand | Titre affiché |
|---|---|---|
| en cours | l'aller-retour serveur n'a pas répondu | « On valide ton lien. » |
| validé | vérifié **et** déposé | « C'est validé. » + « Ton compte Gryd est confirmé pour {email}. Retourne dans l'app : tu es connecté. » — et, pour un compte neuf (`type=signup`), « Félicitations, ton compte est créé. » |
| validé, remise ratée | vérifié, mais le dépôt a échoué | « Ton compte Gryd est confirmé. » + « La connexion automatique n'a pas abouti. Ouvre Gryd et demande un nouveau lien. » |
| refusé | `verifyOtp` a dit non | « Ce lien a expiré. » ou « Ce lien n'a pas pu être validé. » |

Le demi-succès a sa propre phrase, et ce n'est pas un détail : annoncer « tu es connecté » quand le
dépôt a échoué serait faux, et tendre un bouton serait pire — le haché est consommé, il ne servira
plus. On dit ce qui est vrai (le compte est confirmé) et ce qu'il reste à faire (redemander un lien,
qui connectera).

### Les six verdicts de repli, et le septième état

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
4. **Aucune journalisation.** L'adresse porte un haché à usage unique **et** un nonce de remise :
   pas de `console.log`, pas d'analytics, et `noindex, nofollow` pour la même raison.
5. **Aucune vérification sans nonce.** La page ne consomme un haché que lorsqu'elle a de quoi le
   rendre à l'app. Un nonce de forme douteuse, un `type` inconnu, une clé Supabase absente du
   build : dans les trois cas elle retombe sur E4 sans rien toucher — le haché reste intact, donc
   le bouton « Ouvrir Gryd » vaut encore quelque chose.

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

Les chemins sont le **miroir exact** de `UNIVERSAL_LINK_SEGMENTS` dans
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

**Cette page reste indispensable, et son rôle a changé DEUX FOIS.** En E4, sans l'app, elle
recevait le haché et **ne le vérifiait pas** : un `token_hash` ne sert qu'une fois, le consommer
ici l'aurait rendu mort pour l'app. Depuis **E5**, quand le lien porte un nonce (`?n=…`), elle
**vérifie**, **dépose** la session pour l'app (migration 0198) et se déconnecte localement — c'est
le chemin normal tant qu'aucun build signé ne porte les `associatedDomains`. Sans nonce, elle garde
mot pour mot le comportement E4 : « Ton lien de connexion est prêt. » et le bouton
`gryd://callback?token_hash=…&type=…`. Voir §3 pour le détail.

**Le lot E5 a changé le format du lien une seconde fois** : les gabarits rendent désormais
`{{ if .RedirectTo }}{{ .RedirectTo }}&token_hash=…{{ else }}{{ .SiteURL }}/callback?token_hash=…{{ end }}`.
`{{ .RedirectTo }}` porte l'adresse que l'app a demandée, **nonce compris** ; le repli garde la
forme E4 pour les liens demandés sans redirection. GoTrue conserve la query de cette adresse —
vérifié le 12/09/2026 (`GET /auth/v1/verify` avec un jeton faux : le `Location` rend
`https://gryd.run/callback?n=…#error=…`, là où une adresse non autorisée retombe en silence sur
`https://gryd.run`).

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

**État constaté le 12/09/2026 à 12 h 30** : le CNAME `www` était posé, mais l'apex `gryd.run` ne
portait que **deux AAAA** et **aucun A** — un réseau sans IPv6 ne trouvait rien du tout.

**C'est réparé, et vérifié le 12/09 au moment du déploiement du lot W4.** Relevé auprès des
serveurs faisant autorité (`ns11`/`ns12.infomaniak.ch`), confirmé par `1.1.1.1` et `8.8.8.8` :

| Enregistrement | Valeurs servies |
|---|---|
| A `@` | `185.199.108.153`, `109.153`, `110.153`, `111.153` — **les quatre** |
| AAAA `@` | `2606:50c0:8000::153`, `8001::153`, `8002::153`, `8003::153` — **les quatre** |
| CNAME `www` | `skanebody.github.io.` |

`curl -4 https://gryd.run/` rend **200** (via `185.199.110.153`) : un réseau sans IPv6 atteint
désormais le site. `https://www.gryd.run/` rend **301** vers `https://gryd.run/`. Le point DNS
qui restait ouvert dans la version précédente de ce document est donc **clos**.

---

## 6. Redéployer

```bash
# 1. Le gate doit être vert (il joue npm run test:web : 52 tests, dont /callback E4+E5).
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

1. **Le build iOS — et ce n'est plus un bloquant.** Les entitlements `associated-domains` sont
   posés **à la compilation**, et la capacité Apple correspondante manque au profil de signature
   (build `fe030292` **ERRORED**). Tant qu'un nouveau build signé n'est pas installé, le lien
   universel ouvre Safari. **Le lot E5 rend ça sans conséquence** : la page valide, dépose la
   session contre le nonce, et l'app la réclame seule. Le build reste souhaitable (zéro clic au
   lieu d'un aller-retour de trois secondes), il n'est plus nécessaire.
2. **`assetlinks.json`** (voir §4) : au premier build Android.

### Résolu depuis

- **Point 3 de la version précédente (« obtenir l'ouverture directe sans clic »)** : fait par le
  lot E4 — le gabarit d'e-mail vise `gryd.run/callback?token_hash=…&type=…`, sans redirection.
  Voir §4 ci-dessus et `GRYD_ONBOARDING_2026_09.md` §2.3.
- **L'`uri_allow_list` de Supabase** : relue le 12/09/2026 par
  `GET /v1/projects/<ref>/config/auth`, elle contient `https://gryd.run/**`, et `site_url` vaut
  `https://gryd.run`. C'est `{{ .SiteURL }}` qui fabrique désormais le lien, donc cette valeur
  compte plus que jamais : la changer déplacerait le lien de tous les e-mails.
4. ~~**Pages d'atterrissage `/c/*`, `/r/*`, `/u/*`**~~ : **clos**. Bâties par le lot W3 (§8),
   **publiées par le lot W4** le 12/09 (§10). `404.html` fait le routage : `https://gryd.run/c/TEST`
   rend l'invitation en ligne. Le statut HTTP reste 404 — c'est la seule forme qu'un export
   statique sur Pages sache prendre, et ces adresses ne valent que pour une personne précise.
5. **Le chemin sans clic** (§4) : dépend du gabarit d'e-mail et de `verifyOtp` côté app.
6. **Le vrai clic dans le vrai courrier.** Que le bouton de l'e-mail ouvre bien cette page, et que
   l'app suive dans la seconde, ne se constate qu'en ouvrant un e-mail réel — **après** la poussée
   de `0198` en production et le redéploiement de `gryd.run`. Aucun harnais ne peut le dire.

---

## 8. Pages livrées (W3)

Lot **W3**, 12/09/2026 : le site refait de zéro à partir de
`docs/product/GRYD_SITE_CONTENU_2026_09.md` (le contenu fait foi) sur le système de design du
lot W2 (`apps/web/components/README.md`). **Rien n'était déployé par ce lot** : le déploiement a
été fait par le lot W4, le 12/09 à 15:21 (§10).

| Adresse | Sections | Photo | Données structurées | Source |
|---|---|---|---|---|
| `/comment-ca-marche/` | sommaire + 7 chapitres ancrés `#bouger` `#boucle` `#terrain` `#points` `#crew` `#saison` `#fair-play` | `gryd-coureurs-vue-plongeante-paves` | — | `lib/guideCopy2026.ts` |
| `/crews/` | rejoindre · créer · gérer · se retrouver · le défi | `gryd-crew-femmes-cercle-selfie-ciel`, `gryd-crew-pause-cafe-terrasse` | — | `lib/crewsCopy2026.ts` |
| `/saison/` | Saison 0 · ouverture par présence · deux compteurs · classement de commune · défis de la semaine · fair-play | `gryd-foule-place-depart-collectif` | — | `lib/saisonCopy2026.ts` |
| `/gryd-plus/` | encart « pas en vente » · contenu · jamais · prix prévu · si tu arrêtes | `gryd-materiel-sol-apres-course-medailles` | — | `lib/offerCopy2026.ts` |
| `/securite-et-vie-privee/` | extrémités coupées · conservation · zones protégées · décision serveur · anti-triche · droits | `gryd-coureur-nuit-pluie-eclairs` | — | `lib/privacyCopy2026.ts` |
| `/faq/` | 5 groupes, 13 questions (`<details>` natifs) | `gryd-coureuse-lunettes-chartreuse-portrait-groupe` | **`FAQPage`** | `lib/faqCopy2026.ts` |
| `/telecharger/` | état réel · liste d'attente (RPC `waitlist_join`) · ce qu'il faut savoir | `gryd-duo-traversee-passage-pieton-pluie` | **`SoftwareApplication`** | `lib/downloadCopy2026.ts` |
| `/confidentialite/` `/conditions/` `/cgv/` `/mentions-legales/` | inchangées au mot près, mise en page seulement | — | aucune | leurs pages |
| `/abonnement/` | **redirection** vers `/gryd-plus/` (`meta refresh` + lien), `noindex` | — | aucune | `app/abonnement/page.tsx` |
| `404.html` | routeur `/c/` `/r/` `/u/` + vraie 404, `noindex` | `gryd-groupe-hommes-course-pluie-brique`, `gryd-coureurs-vitesse-file-rue` | aucune | `app/not-found.tsx` + `lib/deepLinkCopy2026.ts` |

Avec `Organization` (déjà sur `/`), le site porte **trois** blocs de données structurées, pas un
de plus : la règle du cahier §3.10.

### Les trois décisions techniques qui portent le lot

1. **Aucun chiffre n'est écrit dans une page.** `lib/facts2026.ts` est la seule porte par
   laquelle un nombre entre : il lit `@klaim/shared` et met en forme. Chaque chiffre affiché
   porte le nom de sa constante en `data-rule` dans le DOM. `lib/siteCopy2026.test.ts` relit
   **chaque phrase du site** et refuse toute suite de chiffres qui ne vienne pas de cette table
   — trois exceptions seulement, nommées : les deux bornes de la Saison 0
   (`lib/season2026.ts`, miroir de `season_collections_2026`), les numéros de chapitre, et la
   date du constat « pas encore sur l'App Store ».
2. **`404.html` fait le routage des liens partagés.** Un export statique ne pré-génère pas une
   page par code inconnu, et Pages n'a ni réécriture ni 301. Le script ne touche que ce que
   React ne gère pas (un attribut sur `<html>`, deux conteneurs opaques) : un `hidden` basculé
   sur un nœud rendu par React serait repris à l'hydratation. Sans JavaScript, aucun bouton
   `gryd://` n'existe, donc aucun bouton mort ; un `<noscript>` dit pourquoi.
3. **Le plan du site est publié et vérifié.** `public/sitemap.xml` (12 adresses) et
   `public/robots.txt` ; le test compare le fichier au registre des pages, et refuse une page
   ajoutée sans entrée, une entrée sans page, ou l'apparition de `/callback/`, `/404.html` ou
   `/abonnement/` dans le plan.

### Preuve

| Vérification | Résultat |
|---|---|
| `npm run test:web` | **39 tests verts** (25 avant le lot ; 14 posés par `siteCopy2026.test.ts`) |
| `npm run typecheck` | 4/4 |
| `DRY_RUN=1 bash scripts/deploy-web-ghpages.sh` | export complet, `out/404.html` produit, `CNAME` + `apple-app-site-association` + `/callback/` vérifiés par le script |
| Captures Playwright, 375 et 1280 px, 17 écrans | aucun débordement horizontal, **jamais deux CTA chartreuse sur un même écran**, un `<h1>` visible par écran, aucune erreur de console (hors le 404 HTTP des trois pages d'arrivée, qui est leur statut réel) |
| Export servi comme Pages le sert | `/c/A1B2C3` peint l'invitation avec son code et son bouton, `/u/benjamin` affiche `@benjamin`, `/nimportequoi` rend la vraie 404, `/abonnement/` arrive sur `/gryd-plus/` |

**Non vérifié ici** : le rendu en ligne (rien n'est déployé), le comportement réel d'iOS sur les
liens universels (il exige un build qui embarque l'entitlement), et l'envoi d'un e-mail aux
inscrits de la liste d'attente (décision n° 4 du cahier de contenu, toujours ouverte).

### Le verdict `ux-gate`, et ce qu'il a changé

Passé sur les dix-sept écrans, aux deux largeurs. **Quatre réserves corrigées** :

| Réserve | Loi | Correctif |
|---|---|---|
| `/comment-ca-marche/` : sept chiffres de même taille, tous plus gros que le titre du chapitre | **L12**, « un chiffre héros par écran » | Au delà de trois faits, la rangée redéfinit `--t-stat` sous `--t-h2` (`.denseFacts`). Le titre reprend la tête. |
| `/telecharger/` : la limite des deux champs tenait 1,36:1 contre 3:1 exigés | **L15** (WCAG 2.1 SC 1.4.11) | Le filet passe à `--gryd-muted`, 7,8:1. Le seul formulaire du site se voit enfin autrement que par son libellé. |
| `404.html` : « L'accueil » et l'action collante de l'en-tête avaient le même poids | **L2** | « L'accueil » devient l'action principale : c'est la seule qu'on veuille vraiment depuis une adresse qui n'existe pas. |
| `/confidentialite/` à 375 px : le tableau RGPD est coupé à 48 %, sans rien pour le dire | « rien de tronqué » | Deux dégradés attachés au CONTENU (`background-attachment: local`) : ils n'apparaissent que du côté où il reste à lire, et disparaissent au bout. |

**Cinq réserves laissées ouvertes, et pourquoi** :

1. **« au 12 septembre 2026 »** sur `/telecharger/` date l'état réel d'un jour qui n'est pas
   encore passé selon l'horloge de la machine (11/09). La phrase est celle du cahier de contenu
   §3.8, mot pour mot, et tout le lot W1/W2/W3 est daté du 12/09. **Arbitrage fondateur**, pas
   une correction de mise en page.
2. **`/c/`, `/r/`, `/u/` : « Ouvrir Gryd » est chartreuse même sur un écran de bureau**, où
   `gryd://` ne peut pas résoudre. L'ordre et les libellés viennent du cahier §3.9. Corriger
   demanderait de déduire la plateforme, donc de renifler l'agent utilisateur : à trancher, pas
   à improviser.
3. **`/` : « Télécharger » apparaît deux fois au même poids** (en-tête collant + action
   secondaire du héros). L'accueil appartient au lot W2 ; le défaut est réel et se corrige en un
   mot.
4. **L18, textes en dur** : `SiteHeader`, `SiteFooter` et `Diagram` portent des chaînes
   françaises écrites dans le composant. Le site est **français seul en v1** (cahier §4.1) et
   l'anglais est un lot à part : le point reste ouvert, il n'est pas ignoré.
5. **Pas de désinscription de la liste d'attente sur l'écran qui la remplit** (L17). C'est la
   décision n° 4 du cahier, déjà ouverte : si personne n'écrit aux inscrits, le formulaire doit
   disparaître ; s'il reste, il lui faut une sortie.

Le gate a aussi relevé une faute de **procédure** : une capture pleine hauteur d'un document de
12 000 px ne prouve aucune lisibilité. Des recadrages à hauteur d'écran (375 × 812 et
1280 × 900) ont été produits pour les cinq pages concernées, et c'est sur eux que les quatre
correctifs ci-dessus ont été jugés.

---

## 9. QA W4

Recette jouée le 12/09/2026 **avant** le déploiement, puis **rejouée à l'identique en ligne**.
Le harnais n'est pas dans le dépôt : c'est un instrument de mesure, pas un test de non-régression.
Ce que le dépôt garde du lot, ce sont les 52 tests de `npm run test:web`, déjà dans le gate.

### Le banc : un serveur qui ment comme GitHub Pages

Servir `apps/web/out` avec un serveur statique ordinaire ne prouve rien : il rend 404 « nu » là où
Pages rend `404.html`, et c'est précisément ce routage qui fait vivre `/c/*`, `/r/*` et `/u/*`.
Le banc reproduit donc les quatre règles mesurées sur `gryd.run` : `/chemin/` →
`<chemin>/index.html`, `/chemin` → 301 vers `/chemin/`, adresse inconnue → `404.html` **avec le
statut 404**, fichier sans extension → `application/octet-stream`.

### Ce qui a été mesuré, et les nombres

| Vérification | Portée | Résultat |
|---|---|---|
| Statut HTTP | 18 écrans × 2 largeurs (375 × 812, 1280 × 900) | 200 partout, **sauf** les quatre écrans servis par `404.html` (`/c/`, `/r/`, `/u/`, adresse inconnue), dont 404 est le statut réel et voulu |
| Erreurs de console et requêtes en échec | 36 chargements | **zéro** |
| Débordement horizontal | 36 chargements | **zéro** (`scrollWidth − clientWidth = 0` partout) |
| `<h1>` visible | 36 chargements | **exactement un** par écran |
| CTA chartreuse | 36 chargements | **jamais deux dans une même fenêtre**. `/` en porte deux dans le DOCUMENT (« Comment ça marche » à y=374, « Me prévenir » à y=5737 à 375 px) : plus de 5 000 px les séparent, ils ne sont jamais vus ensemble. Le lien d'évitement est chartreuse mais `position: fixed; top: -100px` : il n'est peint qu'au focus clavier |
| `alt` sur les images | 36 chargements | **zéro image sans `alt`** |
| `lang` et `meta viewport` | 36 chargements | `lang="fr"` et `width=device-width, initial-scale=1` partout |
| Liens internes | **22 `href` distincts**, relevés dans les 16 fichiers HTML exportés (pas seulement dans le DOM visité) | **tous 200** |
| `/abonnement/` | 2 largeurs | `<meta http-equiv="refresh" content="0; url=/gryd-plus/">` dans la source, lien visible en repli, et le navigateur **arrive** bien sur `/gryd-plus/` |
| `/c/ABC123`, `/r/ABC123`, `/u/pseudo` | 2 largeurs | l'invitation est peinte, le code est affiché, le bouton `gryd://c/ABC123` (resp. `r`, `u`) existe |
| `/callback/?n=<64 hex>&token_hash=x&type=magiclink` | contre le **vrai** serveur Supabase | « Ce lien a expiré. » — le serveur refuse un haché bidon — et **aucune clé `sb-*`** en `localStorage` (`localStorage` entièrement vide) |
| `/callback/` sans paramètre | — | « Ce lien est incomplet. » |
| Tiret long hors pages légales | texte rendu de 13 écrans (les 18 moins les 4 légales et `/abonnement/`, qui arrive sur `/gryd-plus/`) | **zéro** |

### Poids et référencement

- **JavaScript initial de `/` : 115,8 Ko gzip** (les neuf `<script>` de la page, moins
  `polyfills-*.js` qui porte `noModule` et n'est donc chargé par aucun navigateur moderne).
  Sous les 150 Ko posés par le lot W2. Avec les polyfills : 154,3 Ko gzip, 493,5 Ko brut.
- **CSS 7,3 Ko gzip**, **HTML de l'accueil 14,6 Ko gzip**.
- **Photo du héros : 194,9 Ko** réellement téléchargés aux deux largeurs (la variante `-800`,
  choisie par le `srcset`). La plus lourde image de l'accueil est celle du crew à 1280 px :
  353,8 Ko. Les deux sous les 400 Ko.
- **Aucune requête vers un tiers.** Mesuré sur `/`, `/telecharger/`, `/faq/` et `/callback/` :
  un seul hôte contacté, celui du site. Les polices sont servies depuis `gryd.run`
  (`next/font`), PostHog n'est pas chargé par le site statique. Donc pas de bandeau de consentement
  à inventer.
- `og:image` = `gryd-og.jpg`, **1200 × 630**, 114 Ko, servie en `image/jpeg`.
- `robots.txt` et `sitemap.xml` servis à la racine ; le plan compte **12 adresses**, et
  `siteCopy2026.test.ts` le compare au registre des pages à chaque gate.

### Accessibilité

`axe-core` n'est pas dans `node_modules` : la vérification a été faite à la main, sur les jetons
et sur le DOM.

| Point | Constat |
|---|---|
| Contraste des jetons sur carbone `#0a0a0a` | `--gryd-ink` **18,97:1** · `--gryd-muted` **7,85:1** · `--gryd-accent` **16,26:1** · carbone SUR accent (le bouton) **16,26:1** · sur accent pressé **12,19:1**. Tous au dessus du AA petit texte |
| `--gryd-steel` (4,42:1, sous le seuil) | **défini et jamais utilisé** hors du bloc `:root` — vérifié par recherche dans `app/` et `components/`. Le commentaire qui le réserve au décor n'est donc contredit nulle part |
| Focus visible | contour **2 px solide** en `rgb(180, 255, 13)`, et le CSS porte de vraies règles `:focus-visible` |
| `prefers-reduced-motion` | honoré (règles présentes dans la feuille) |
| `lang="fr"` | sur les 18 écrans |
| Cibles tactiles | voir la réserve n° 1 ci-dessous |

### Réserves, non corrigées par ce lot

1. **Les sommaires des quatre pages légales ont des liens de 28 px de haut, espacés de 6 px**
   (`.tocLink`, `legal.module.css` : `font-size: 13.5px`, `padding: 4px 0`). C'est **au dessus**
   du minimum WCAG 2.2 AA (SC 2.5.8, 24 × 24 px) et **en dessous** des 44 pt recommandés par
   Apple. Passer à 44 px allongerait chaque sommaire de treize entrées d'environ 200 px sur
   mobile : c'est un arbitrage de mise en page sur quatre documents déjà passés au `ux-gate`,
   pas une correction de W4.
2. **Six pages de contenu ne portent aucun aplat chartreuse** (`/comment-ca-marche/`, `/crews/`,
   `/saison/`, `/gryd-plus/`, `/securite-et-vie-privee/`, `/faq/`). La règle « un seul CTA par
   écran » est tenue ; la question inverse — faut-il **une** action au bas de chaque page de
   contenu — appartient au cahier de contenu, pas à la recette.
3. **Les cinq réserves du `ux-gate` de W3** (§8) restent ouvertes telles quelles : la date
   « au 12 septembre 2026 », le bouton `gryd://` chartreuse sur un écran de bureau, le double
   « Télécharger » de l'accueil, les textes en dur de `SiteHeader`/`SiteFooter`/`Diagram`, et
   l'absence de sortie de la liste d'attente.

---

## 10. Mise en ligne du 12/09

**Le site refait de zéro est en ligne.** `bash scripts/deploy-web-ghpages.sh` a poussé
`gh-pages` ; GitHub a reconstruit en **21 secondes**.

- Commit `gh-pages` : **`41b8acb2b160a2aca0ef59438fee36680588acf1`**, construit à **15:21** (heure
  de Paris). Le script a vérifié avant de pousser : `CNAME` = `gryd.run`,
  `apple-app-site-association` présent et JSON valide, `/callback/index.html` présent.
- `gh api repos/Skanebody/Gryd/pages` : `status: built` · `cname: gryd.run` ·
  `https_enforced: true` · `build_type: legacy` · source `gh-pages` `/` · certificat **`approved`**
  pour `gryd.run` **et** `www.gryd.run`, jusqu'au 10/12/2026.

### Ce que le déploiement a changé

Relevé **avant** la poussée : `/faq/`, `/crews/`, `/comment-ca-marche/` répondaient **404**,
`/c/TEST` aussi. Les huit pages du lot W3 existaient dans le dépôt et n'étaient servies nulle
part. C'est ce que ce lot répare.

### Preuves en ligne, adresse par adresse

| Adresse | Code | Ce qui a été vu |
|---|---|---|
| `https://gryd.run/` | **200** | l'accueil, aux deux largeurs (captures ci-dessous) |
| `/comment-ca-marche/` `/crews/` `/saison/` `/gryd-plus/` `/securite-et-vie-privee/` `/faq/` `/telecharger/` | **200** (7/7) | les sept pages de contenu du lot W3, servies pour la première fois |
| `/confidentialite/` `/conditions/` `/cgv/` `/mentions-legales/` | **200** (4/4) | les quatre pages légales, mise en page W3 |
| `/callback/` | **200** | titre « GRYD : ton compte », `noindex, nofollow` |
| `/callback?token_hash=…&type=magiclink` | **301** | vers `/callback/?token_hash=…&type=magiclink` — **la query est reconduite** |
| `/.well-known/apple-app-site-association` | **200**, sans redirection | `application/octet-stream`, **JSON intact** : `NXGNDQBUMB.fr.nexus1993.gryd`, composants `/callback` `/callback/` `/c/*` `/r/*` `/u/*`, `webcredentials` identique |
| CDN d'Apple (`app-site-association.cdn-apple.com/a/v1/gryd.run`) | **200** | le cache d'Apple a bien le fichier |
| `/email/gryd-logo-email.png` `/email/gryd-bienvenue-email.jpg` `/email/gryd-lien-email.jpg` | **200** (3/3) | les images des gabarits d'e-mail |
| `/og/gryd-og.jpg` | **200** | `image/jpeg`, 114 016 octets, 1200 × 630 |
| `/sitemap.xml` `/robots.txt` | **200** | le plan en ligne compte bien **12** `<loc>` |
| `/abonnement/` | **200** | sert la redirection : `<meta http-equiv="refresh" content="0; url=/gryd-plus/">` |
| `/c/TEST` | **404**, contenu présent | « On t'invite dans un crew » — le routeur de `404.html` fonctionne en ligne. `/r/TEST` et `/u/benjamin` de même |
| `https://www.gryd.run/` | **301** vers `https://gryd.run/` | le sous-domaine `www` retombe sur l'apex |
| `https://skanebody.github.io/Gryd/` | **301** vers `https://gryd.run/` | l'ancien lien public n'est pas perdu |
| `curl -4 https://gryd.run/` | **200** | résolu en IPv4 pur (`185.199.110.153`) : le trou DNS du §5 est bouché |

La recette complète du §9 a été **rejouée contre `https://gryd.run`** : mêmes 18 écrans, mêmes
deux largeurs, **zéro bloquant**, et les quatre mêmes informations sur les cibles tactiles. Le
`/callback/` en ligne, interrogé avec un nonce de 64 hex et un haché bidon, rend bien
« Ce lien a expiré. » — c'est le **vrai** serveur qui refuse — **sans laisser une seule clé
`sb-*`** en `localStorage`.

### Ce que ce lot ne prouve toujours pas

1. **L'ouverture réelle de l'app par un lien universel** : elle exige un build iOS qui embarque
   l'entitlement `associated-domains` (§7, point 1). Le lot E5 rend ça sans conséquence, il ne le
   remplace pas.
2. **Le clic dans un vrai e-mail.** Aucun harnais ne peut le dire : il faut ouvrir un courrier.
3. **Le rendu sur un vrai iPhone.** Les captures sont faites par un Chromium sans interface, à
   375 × 812 et 1280 × 900 ; ce n'est pas Safari iOS.
