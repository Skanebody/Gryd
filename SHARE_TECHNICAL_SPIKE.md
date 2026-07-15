```markdown
# SHARE_TECHNICAL_SPIKE.md

**Spike technique — Partage image (P0.4 / P0.5) + Deep links (P0.6)**
Statut : spike de conception. Aucune ligne de code n'est écrite par ce document.
Périmètre : `apps/mobile/src/features/share/`, `apps/mobile/app/partage.tsx`, `app.json`, `supabase/migrations/`.
Autorité : CLAUDE.md · `GRYD_REGLES_NON_NEGOCIABLES.md` §A · AMENDEMENT-39 (arbitrages fermes).

---

## 0. Constat de départ (vérifié, pas supposé)

**Aucune image ne peut sortir de l'app aujourd'hui.** Ce n'est pas une régression, c'est un trou jamais comblé.

| Fait | Preuve (fichier / ligne) |
|---|---|
| `openShareSheet` ne passe qu'une **string** | `share/shareActions.ts` : `await Share.share({ message })` — l'API RN `Share` n'accepte `url` que sur iOS, jamais un buffer image |
| `react-native-view-shot` absent | `apps/mobile/package.json` — non listé |
| `expo-sharing` absent | idem |
| `expo-file-system` absent | idem |
| `expo-clipboard` **absent mais déjà appelé** | `shareActions.ts:getClipboard()` fait un `require('expo-clipboard')` dans un `try/catch` → **retourne toujours `null` en prod** → `copyText()` retombe systématiquement sur la feuille de partage. Le code est correct et honnête, mais la branche « clipboard » est **morte** aujourd'hui. |
| `react-native-svg` **présent** | `package.json` : `"react-native-svg": "15.8.0"` (= version épinglée SDK 52, aucune migration à faire) |
| `ShareMap` est du SVG dans une `<View>` | `share/ShareMap.tsx` : `<View style={styles.wrap}><Svg viewBox…>` → **capturable par `captureRef` sur le wrapper natif** |
| L'écran sait déjà qu'il ment par omission | `app/partage.tsx:21-22` (commentaire) : « en web/démo, capture & Share natives indisponibles → toasts. En prod : ViewShot + Share + expo-media-library (O1) » |

Conséquence : le bouton « Partager en story » (`partage.tsx:402`) appelle `openShareSheet(shareMessage)` → **une story GRYD est aujourd'hui un SMS**. Le toast dit « Story prête. » alors qu'aucune story n'existe. C'est le seul point du partage qui viole « l'app ne ment jamais » — il est traité en P0.5.

**Version Expo du projet** (lue, pas devinée) : `node_modules/expo/package.json` → **52.0.49**. Toutes les versions ci-dessous viennent de `node_modules/expo/bundledNativeModules.json`, c'est-à-dire du manifest officiel du SDK — pas d'un `npm view`.

---

## (a) Pipeline exact de capture image

### a.1 Dépendances à installer — versions SDK 52 exactes

| Package | Version SDK 52 | Rôle | P0 ? |
|---|---|---|---|
| `react-native-view-shot` | `~4.0.3` | `captureRef` → PNG du composant story | **P0.4** |
| `expo-sharing` | `~13.0.1` | `shareAsync(uri)` → feuille native **avec fichier** | **P0.4** |
| `expo-file-system` | `~18.0.12` | `cacheDirectory`, `moveAsync`, `deleteAsync` | **P0.4** |
| `expo-clipboard` | `~7.0.1` | ranime la branche morte de `shareActions.ts` | P1 (voir §c) |
| `expo-media-library` | `~17.0.6` | bouton « Sauver » (pellicule) | **P1 — pas P0** |
| `expo-image-manipulator` | `~13.0.6` | non requis | non |

Commande : `npx expo install react-native-view-shot expo-sharing expo-file-system` (jamais `npm i` direct — `expo install` résout contre le manifest SDK).

`expo-file-system@18` (SDK 52) = **API classique** (`FileSystem.cacheDirectory`, `moveAsync`). L'API `expo-file-system/next` (classes `File`/`Directory`) n'arrive stable qu'après. Ne pas écrire du code SDK 53+.

> `react-native-view-shot` et `expo-sharing` ont du code natif → **le partage image ne marchera JAMAIS dans Expo Go ni en Expo Web**. Il exige un dev build (O8). Voir §f.

### a.2 Que réutilise-t-on de l'existant ?

**Réutilisé tel quel — zéro réécriture :**

| Brique existante | Chemin | Rôle dans le pipeline |
|---|---|---|
| `ShareCard` | `src/ui/game/ShareCard.tsx` | **est déjà le composant story**. `SHARE_CARD_ASPECT.story = 9/16` et la prop `width` existent (`ShareCard.tsx:29-36, 86-87`) → `<ShareCard ratio="story" width={360}/>` produit exactement 360×640. Rien à créer. |
| `ShareMap` | `share/ShareMap.tsx` | le visuel SVG capturable. Props `trace`, `animated`, `replayKey`, `captured` déjà là. |
| `applySharePrivacy` | `share/sharePrivacy.ts` | pur, testé, correct. Appelé **avant** le rendu offscreen. |
| `SHARE_TEMPLATES_BY_ID.conquete` | `share/templates.tsx` | déjà le template « SECTEUR PRIS · +47 · Zones · République ». |
| `getShareRun()` | `share/shareRun.ts` | fournit les stats réelles de la course affichée. |

**À construire (petit) :**
- `share/StoryShot.tsx` — hôte offscreen : une `<View collapsable={false} ref={…}>` qui monte `<ShareCard ratio="story" width={STORY_W} {...template.build(data, view)} />`. **C'est tout.** Pas de nouveau design, pas de nouveau template.
- `share/captureStory.ts` — la fonction impure de capture (ci-dessous).

### a.3 Le pipeline, étape par étape

```
données réelles (getShareRun)
  └→ applySharePrivacy(trace)                    [existe, pur]
      └→ <StoryShot ref> monté OFFSCREEN          [à construire, ~30 lignes]
          └→ onLayout OK + animated=false         [garde-fou §a.4]
              └→ captureRef(ref, {format:'png', result:'tmpfile', width, height})
                  └→ uri tmpfile (nom aléatoire)
                      └→ FileSystem.moveAsync → cacheDirectory + 'gryd-story-<ts>.png'
                          └→ Sharing.isAvailableAsync()
                              └→ Sharing.shareAsync(uri, {mimeType:'image/png', UTI:'public.png', dialogTitle:'Partager ta conquête'})
                                  └→ feuille de partage NATIVE avec l'IMAGE
                                      └→ finally: FileSystem.deleteAsync(uri, {idempotent:true})
```

**Paramètres de `captureRef` :**
```
{ format: 'png',            // PNG : la card est un dégradé sombre → JPEG banding visible
  result: 'tmpfile',        // 'base64' = OOM sur 1080×1920, 'data-uri' idem. tmpfile obligatoire.
  width: 1080, height: 1920 // sortie DÉTERMINISTE, indépendante du scale de l'appareil
}
```
- **`quality` est ignoré en PNG** (n'a d'effet qu'en `jpg`). Ne pas le mettre : ce serait du bruit.
- `result:'tmpfile'` renvoie un chemin du type `/…/ReactNative-snapshot-image<rand>.png`. Le **nom de fichier est visible dans la feuille de partage** (AirDrop, Fichiers, Mail) → le `moveAsync` vers `gryd-story-<ts>.png` n'est pas cosmétique.

### a.4 Dimensions / pixelRatio pour du 9:16 net

Cible : **1080 × 1920** (standard story Instagram / TikTok / Snap).

Deux façons, une seule bonne :

| Approche | Verdict |
|---|---|
| Monter la card à 360×640 pt et laisser le scale de l'appareil faire le job | **NON.** iPhone SE/8 = @2x → 720×1280 (flou en story). iPhone 15 = @3x → 1080×1920. **Résultat différent selon l'appareil = inacceptable.** |
| Monter la card à 360×640 pt et **imposer `width:1080, height:1920`** dans les options | **OUI.** `view-shot` rend puis redimensionne vers la cible exacte. Sortie identique partout. |

Piège : le ratio de rendu (360/640 = 0.5625) **doit** égaler le ratio de sortie (1080/1920 = 0.5625), sinon `view-shot` étire sans préserver l'aspect. `SHARE_CARD_ASPECT.story = 9/16` garantit déjà 0.5625 → poser `STORY_W = 360` et laisser `aspectRatio` calculer la hauteur. **Ne jamais coder 640 en dur** (CLAUDE.md — aucun nombre magique : `STORY_W`, `STORY_EXPORT_W`, `STORY_EXPORT_H` vont dans `packages/shared/src/game-rules.ts`… ou plutôt voir l'arbitrage §f.3, ce ne sont pas des règles de jeu).

Le texte reste net : la card est du texte RN + du SVG vectoriel, tout est rastérisé **à la résolution de sortie**. Aucun asset bitmap n'est agrandi.

### a.5 Pièges connus — la vraie valeur de ce spike

| # | Piège | Symptôme | Parade |
|---|---|---|---|
| 1 | **Android collapse les Views sans fond** | capture blanche ou vue voisine capturée | `collapsable={false}` **obligatoire** sur la View portant la `ref`. Non négociable sur Android. |
| 2 | **Rendu offscreen : `display:'none'` / démontage** | capture blanche | La vue **doit être montée et layoutée**. Utiliser `position:'absolute', left:-9999, top:0` (hors écran mais dans la hiérarchie native). **Jamais** `display:none`, `opacity:0` (Android peut sauter le rendu), ni `width:0`. |
| 3 | **Capture avant layout** | capture blanche/partielle, aléatoire | Attendre `onLayout` de `StoryShot` **avant** `captureRef`. Un `setTimeout` est un bug de course, pas une parade. |
| 4 | **`ShareMap` est ANIMÉE** | trace capturée à mi-dessin (`progress` 0→1, `ShareMap.tsx:145-175`) | Passer `animated={false}` au StoryShot → `progress` est initialisé à `1` (`useState(play ? 0 : 1)`) → état final immédiat. **Ne pas** capturer la preview animée à l'écran. |
| 5 | **`captureRef` sur `ShareMap3D` (MapLibre)** | **noir ou blanc**, surtout Android | Une surface GL native ne se capture pas de façon fiable via `captureRef`. → **Le template MVP N'UTILISE PAS `carte3d`.** Il utilise `ShareMap` (SVG). Cadre parfaitement avec le template unique imposé (§b). Une story 3D exigerait `MapView.takeSnap()` de MapLibre → hors P0. |
| 6 | **SVG + `captureRef`** | rumeur de blanc sur Android | Faux positif en général : `react-native-svg` rend dans une View Android standard, `view-shot` la capture. Les échecs rapportés sont presque toujours le piège #1 ou #2. **À confirmer sur device (§f)** — c'est le seul point du pipeline que je ne peux pas prouver sans build. |
| 7 | **Permissions** | prompt inattendu → rejet App Store 5.1.1 | `expo-sharing` **ne demande AUCUNE permission** (pas d'accès pellicule). C'est l'argument massue pour P0 : zéro `NSPhotoLibraryAddUsageDescription`, zéro friction. Le bouton « Sauver » (`expo-media-library`) en exigerait un → **c'est pourquoi « Sauver » est P1, pas P0**. |
| 8 | **UTI iOS** | l'image arrive en « fichier » générique, Instagram la refuse | `shareAsync(uri, { UTI: 'public.png', mimeType: 'image/png' })`. **iOS lit `UTI`, Android lit `mimeType`** — fournir **les deux**, toujours. |
| 9 | **URI sans schéma `file://`** | `shareAsync` throw | `captureRef` peut renvoyer un chemin nu selon la plateforme. Normaliser : `uri.startsWith('file://') ? uri : 'file://' + uri`. |
| 10 | **`Sharing.isAvailableAsync()` non testé** | crash sur web/simulateur | Toujours garder. Si `false` → retomber sur `openShareSheet(text)` **et dire la vérité** (« Image indisponible ici », pas « Story prête. »). |
| 11 | **Web (`react-native-web`)** | build ou runtime cassé | `view-shot` et `expo-sharing` n'ont pas d'implémentation web utilisable. La preview Expo Web est un outil de travail réel ici → **garder `Platform.OS === 'web'` avant tout `require`**, même pattern que `getClipboard()` déjà en place. |
| 12 | **Fuite disque** | cache qui gonfle | `deleteAsync(uri, {idempotent:true})` en `finally`. `cacheDirectory` est purgeable par l'OS, mais ne pas s'en remettre à ça. |
| 13 | **Nouvelle archi** | — | `app.json` : `"newArchEnabled": false`. `view-shot@4.0.3` supporte les deux → **aucun risque**, et aucune raison de toucher au flag. |

---

## (b) Le template MVP UNIQUE

**Arbitrage fondateur : UN template. Pas dix. Pas de replay 3D, pas de sticker animé, pas d'éditeur.**

Contenu imposé :
```
J'AI PRIS RÉPUBLIQUE
   [ carte / territoire ]
0,14 km² · 3,2 km
PRENDS-LA-MOI
```

### b.1 Composition avec l'existant — mapping exact

Le template `conquete` (`templates.tsx:180-193`) est **à 90 % le bon**. Il n'y a pas de composant à créer, seulement un `build` à ajuster :

| Slot `ShareCardProps` | Aujourd'hui (`conquete`) | Cible MVP |
|---|---|---|
| `kicker` | `'SECTEUR PRIS'` | `` `J'AI PRIS ${zoneName.toUpperCase()}` `` |
| `children` | `map(d, view)` → `<ShareMap>` | **inchangé** (SVG, capturable) |
| `stat` / `statLabel` | `+47` / `Zones · République` | `0,14 km²` / `Territoire pris` |
| `stats` (pied ≤3) | absent | `[{value:'3,2 km', label:'Distance'}]` |
| `subtitle` | `'République passe côté crew'` | `'PRENDS-LA-MOI'` |
| `verified` | `true` | **inchangé** (sceau de confiance, doc §4.1) |
| `privacyNote` | non passé | `'Départ et arrivée masqués'` ← **le slot existe déjà** (`ShareCard.tsx:75-81`) et n'est pas câblé. |
| `mapBackground` | non | **jamais** (= `ShareMap3D` = piège #5) |
| `ratio` | — | `'story'` |

### b.2 Le champ qui manque vraiment

`ShareDemoData` (`templates.tsx:66-86`) porte `zonesGained`, `distanceKm`, `paceLabel`… mais **pas de surface**. Le template MVP exige `0,14 km²`.

→ **Champ à ajouter : `areaKm2: string`.**
→ **Il ne s'invente pas côté client.** CLAUDE.md : « tout claim est décidé serveur ». La surface = f(nombre d'hexes capturés, résolution H3). Deux options :
1. `ingest_run` renvoie la surface dans `IngestRunResponse` → **la bonne** (le serveur reste seul juge).
2. Le client la dérive de `h3-js` (`cellArea`) × nb d'hexes → acceptable **uniquement** si les hexes viennent de la réponse serveur, pas d'un calcul local.

Tant que P0.2 (la carte lit `hex_claims`) n'est pas livré, `areaKm2` n'a pas de source honnête. **Dépendance dure : P0.5 ne peut pas afficher une surface VRAIE avant P0.2/P0.3.** Le template peut être construit et capturé avant, sur `SHARE_DEMO`, mais l'écran doit alors se présenter comme EXEMPLE — ce que `partage.tsx` fait déjà (`shareRun.ts` : « jamais comme "ta course" »). Ne pas casser ça.

### b.3 Et les 7 autres templates ?

**Aucune suppression** (AMENDEMENT-39 §4/§6 : « le travail n'est pas perdu »). `SHARE_TEMPLATES` reste à 8 entrées. Le segmented « Style » de `partage.tsx:79-88` passe derrière le même mécanisme de feature flags que le reste de la nav. En prod MVP : **le template `conquete` (retitré) est le seul chemin**, le segmented « Style » est masqué → §A « 1 écran = 1 décision, 1 CTA chartreuse max ». En dev : les 8 restent accessibles.

Note : ce spike **n'invente pas** le système de flags. Il n'en existe aucun (`feature_entitlements` = IAP, sans rapport). C'est un chantier commun avec P0-nav, pas un sous-produit du partage.

---

## (c) Sticker transparent PNG — faisable ? P0 ou P1 ?

**Faisable : oui, techniquement, presque gratuitement.**
- `captureRef` accepte `{ format:'png' }` + un fond transparent : `ShareCard` a un fond opaque, mais `ShareMap.styles.wrap` est déjà `backgroundColor:'transparent'` (`ShareMap.tsx:268-272`). Un `StickerShot` qui monte **`<ShareMap>` seul** (sans `ShareCard`) produit un PNG à canal alpha. PNG conserve l'alpha, JPEG non.
- Coller l'image : `expo-clipboard@~7.0.1` expose `setImageAsync(base64)` — **base64 obligatoire**, pas un chemin. Or `result:'base64'` sur une image de taille sticker (≈600×600) est acceptable en mémoire (contrairement au 1080×1920 du §a.3).

**Verdict : P1. Pas P0.** Raisons, dans l'ordre :
1. **La 1re story ne passe pas par le presse-papier.** `Sharing.shareAsync` suffit et couvre Instagram/TikTok/Snap/WhatsApp/Messages. Le clipboard sert au geste « coller sur MA photo », qui est un usage de niveau 2.
2. **Le presse-papier image est un chemin natif de plus à faire échouer** (iOS colle en `public.png`, Android en `image/png`, comportements divergents dans Instagram) pour un gain nul sur P0.5.
3. **`shareActions.ts` est déjà honnête sans lui** : `stickerText()` livre l'équivalent TEXTE, explicitement documenté comme tel. Ce n'est pas un mensonge, c'est un fallback assumé.
4. Le fondateur le dit lui-même : « le clipboard est utile ensuite, pas indispensable pour la 1re story ».

**Dette à ne pas oublier** : installer `expo-clipboard` **ranime silencieusement** la branche morte de `copyText()` (`getClipboard()` cessera de renvoyer `null`). Le comportement de « Copier » **changera** le jour de l'install — c'est un effet de bord réel à tester, pas un non-événement.

---

## (d) DEEP LINKS

### d.1 État réel (vérifié par grep)

| Constat | Preuve |
|---|---|
| Host en circulation = **`gryd.run`**, pas `gryd.app` | `share/shareDeepLink.ts:22` : `const SHARE_HOST = 'gryd.run'` |
| Le host est **dupliqué**, pas centralisé | `shareDeepLink.ts:22`, `crew/invite.ts`, `app/parametres/[section].tsx:52` (`const GRYD_SITE = 'https://gryd.run'`), `web/app/components/landing/CrewBuilder.tsx:121` (`https://gryd.run/crew/${slug}?code=`), `crew/publicDemo.ts:64,70,76` (`gryd.run/c/nord11`) |
| **5 chemins incohérents** | `/zone/{slug}`, `/crew/{slug}`, `/c/{slug}`, `/mission/defend-{zone}`, `/run/share/{id}` — `/crew/` et `/c/` désignent **la même chose** |
| `scheme` natif = `gryd` | `app.json` → `"scheme": "gryd"` ✔ |
| **AUCUN `associatedDomains`** | `app.json` → `ios` ne contient que `bundleIdentifier`, `supportsTablet`, `config`, `infoPlist` |
| **AUCUN `intentFilters`** | `app.json` → `android` ne contient que `package`, `adaptiveIcon`, `permissions` |
| `expo-linking` **présent** | `package.json` : `~7.0.5` |

**Conclusion dure : aujourd'hui, un lien `https://gryd.run/zone/republique` partagé dans une story n'ouvrira JAMAIS l'app.** Il ouvre Safari, sur un site qui n'a pas cette route (`apps/web/app/` ne contient ni `zone/`, ni `crew/`, ni `c/`, ni `z/`). **Le lien de chaque story est un 404.** Le commentaire de `shareDeepLink.ts` (« rebond App Store si l'app n'est pas installée ») décrit une intention, pas un fait. C'est le vrai bug de P0.6, plus grave que l'incohérence des chemins.

### d.2 Cible

`https://gryd.app` + 3 chemins : `/z/{slug}` (zone) · `/c/{slug}` (crew) · `/d/{id}` (détail run).

Problème de modèle : `ShareLinkTarget` a **4** variantes (`zone | crew | mission | run`, `shareDeepLink.ts:28-32`) pour **3** chemins cibles. Arbitrage proposé : **`mission` est une vue de `zone`** → `/z/{slug}?a=defend`. Aucune 4ᵉ route, `defaultShareTarget()` conserve sa logique.

### d.3 Mapping des anciens chemins

| Ancien (en circulation) | Cible | Émetteur à corriger |
|---|---|---|
| `gryd.run/zone/{slug}` | `gryd.app/z/{slug}` | `shareDeepLink.ts:targetPath` |
| `gryd.run/crew/{slug}` | `gryd.app/c/{slug}` | `shareDeepLink.ts`, `web/CrewBuilder.tsx:121` |
| `gryd.run/c/{slug}` | `gryd.app/c/{slug}` (host seul) | `crew/publicDemo.ts:64,70,76`, `crew/invite.ts` |
| `gryd.run/mission/defend-{zone}` | `gryd.app/z/{zone}?a=defend` | `shareDeepLink.ts:defaultShareTarget` |
| `gryd.run/run/share/{id}` | `gryd.app/d/{id}` | `shareDeepLink.ts:targetPath` |

Les **anciens liens déjà partagés** doivent survivre : `gryd.run/*` → redirection 301 vers `gryd.app/*` selon cette table, **côté web**. Coût réel : 0 lien en circulation (prod = 1 user, 0 run, 0 crew). **La fenêtre pour renommer sans dette est maintenant.** Le seul usage de `gryd.run` à **ne PAS** toucher : les adresses e-mail légales (`support@gryd.run`, `privacy@gryd.run` dans `web/app/mentions-legales`, `cgv`, `confidentialite`) — changer une mention légale n'est pas une tâche de code.

### d.4 `app.json` — le diff exact

```jsonc
"ios": {
  "bundleIdentifier": "fr.nexus1993.gryd",
  "associatedDomains": ["applinks:gryd.app", "applinks:www.gryd.app"],
  …
},
"android": {
  "package": "fr.nexus1993.gryd",
  "intentFilters": [{
    "action": "VIEW",
    "autoVerify": true,
    "data": [
      { "scheme": "https", "host": "gryd.app", "pathPrefix": "/z" },
      { "scheme": "https", "host": "gryd.app", "pathPrefix": "/c" },
      { "scheme": "https", "host": "gryd.app", "pathPrefix": "/d" }
    ],
    "category": ["BROWSABLE", "DEFAULT"]
  }],
  …
}
```
`associatedDomains` est un **entitlement** → régénération du provisioning profile → **nouveau build EAS obligatoire**. Ce n'est pas un OTA.

Routes `expo-router` à créer : `app/z/[slug].tsx`, `app/c/[slug].tsx`, `app/d/[id].tsx`. `expo-router` mappe automatiquement le path de l'URL au path de fichier — **c'est pour ça que les chemins courts doivent être figés avant** d'écrire ces fichiers.

### d.5 AASA — `https://gryd.app/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "details": [{
      "appIDs": ["<TEAM_ID>.fr.nexus1993.gryd"],
      "components": [
        { "/": "/z/*" },
        { "/": "/c/*" },
        { "/": "/d/*" }
      ]
    }]
  }
}
```
Contraintes Apple, toutes bloquantes si violées :
- **`Content-Type: application/json`** ;
- **pas d'extension `.json`** dans l'URL ;
- **HTTPS, aucune redirection** (un 301 → échec silencieux) ;
- **pas d'authentification** ;
- `<TEAM_ID>` = **fondateur** (il n'existe pas dans le repo).

⚠️ **Piège d'hébergement à trancher** : le site est actuellement sur **GitHub Pages** (`skanebody.github.io/Gryd`). Jekyll **ignore les fichiers commençant par un point** → `.well-known/` peut ne jamais être publié sans un fichier `.nojekyll` à la racine. Et GH Pages sert un fichier sans extension avec un `Content-Type` non garanti → **risque réel de non-respect d'Apple**. Un hébergeur avec règles d'en-têtes (Vercel/Netlify/Cloudflare) rend cette contrainte triviale. **Décision fondateur, pas décision code** (§d.7).

### d.6 assetlinks.json — `https://gryd.app/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "fr.nexus1993.gryd",
    "sha256_cert_fingerprints": ["<SHA256_DU_CERTIFICAT_DE_SIGNATURE_APP>"]
  }
}]
```
⚠️ **Le piège qui coûte une journée** : avec **Play App Signing** (par défaut), Google **resigne** l'APK. L'empreinte à publier est celle de la **clé de signature d'application** (Play Console → Intégrité de l'app → *App signing key certificate*), **PAS** celle de la clé d'upload que renvoie `eas credentials`. Publier l'empreinte d'upload → `autoVerify` échoue en silence, le lien ouvre Chrome, et rien n'explique pourquoi.

### d.7 Fallback App Store

L'app installée n'est **pas** le cas majoritaire d'une story virale — c'est même l'inverse : **le partage sert à toucher ceux qui n'ont pas l'app**. Donc `gryd.app/z/{slug}` **doit être une vraie page web** :
- rend un aperçu honnête de la zone (**pas de données inventées** — cf. mémoire « zéro donnée EU factice » ; si la zone n'a pas de données réelles, la page montre l'app, pas un faux classement) ;
- balises **OG/Twitter** → l'aperçu riche dans les DM/stories **est** le premier moteur d'acquisition ;
- bouton App Store, avec le token de partage en query pour §e ;
- iOS ouvre l'app **automatiquement** si installée (Universal Link) — la page n'est jamais vue dans ce cas.

**Ordre correct : la page web AVANT l'entitlement.** Une page qui rebondit vers l'App Store fonctionne pour 100 % des liens sans Team ID ni build. `associatedDomains` n'améliore que le cas « app déjà installée ». **Le fallback est le chemin critique, pas le luxe.**

### d.8 Partage FONDATEUR / MOI

| **FONDATEUR** (je ne peux pas) | **MOI** (code, config, mapping) |
|---|---|
| Acheter/pointer le domaine **`gryd.app`** (INPI : clearance nom encore à faire — CLAUDE.md) | `shareDeepLink.ts` : host unique + 3 chemins + `mission` → `/z/?a=defend` |
| Choisir l'hébergement (contrainte `.well-known` + `Content-Type`) | Sweep des 4 émetteurs dupliqués (`invite.ts`, `publicDemo.ts`, `parametres/[section].tsx`, `CrewBuilder.tsx`) |
| Fournir le **Team ID Apple** (⊂ O2) | Écrire le contenu AASA + assetlinks (`<TEAM_ID>`/SHA256 en placeholder) |
| Récupérer le **SHA-256 de la clé de signature Play** | Diff `app.json` (`associatedDomains` + `intentFilters`) |
| Déployer `/.well-known/` (2 fichiers, en-têtes corrects) | Routes `app/z/[slug].tsx`, `app/c/[slug].tsx`, `app/d/[id].tsx` |
| Redirections 301 `gryd.run/*` → `gryd.app/*` | Pages web `/z /c /d` + OG + rebond App Store |
| Lancer le build EAS (nouvel entitlement) | Tests Deno du mapping/slugify (purs) |

---

## (e) Modèle de données viral

Objectif : attribuer **clic → install → signup → 1re capture**. Minimum viable, RLS obligatoire (CLAUDE.md), pattern `0034_waitlist_lockdown.sql` : **aucun insert client direct, RPC `security definer` ou service-role via Edge Function.**

### e.1 Le minimum — 3 tables

**`share_links`** — le serveur émet le token (ce que `shareDeepLink.ts:16-18` annonce déjà : « en prod le serveur émet un id de partage suivi »).
```
id            text primary key         -- token court, généré serveur (jamais un slug devinable)
owner_user_id uuid references public.users(id) on delete cascade
kind          text check (kind in ('zone','crew','run'))
target_slug   text not null
created_at    timestamptz default now()
```
RLS : `enable row level security` · `revoke insert, update, delete on share_links from anon, authenticated` · policy `select` **owner uniquement** · émission par RPC `security definer` `share_link_issue(kind, target_slug)` qui **valide `kind` et le format du slug côté serveur** et rate-limite par user (réutiliser le throttle de `0035`).

**`share_clicks`** — le seul signal réellement mesurable côté web.
```
id            bigserial primary key
share_link_id text references share_links(id) on delete cascade
clicked_at    timestamptz default now()
ip_hash       text          -- sha256(ip || pepper serveur). JAMAIS l'IP brute (RGPD + confidentialite/page.tsx)
ua_family     text          -- 'ios' | 'android' | 'other'. Pas l'UA complet (fingerprinting).
```
RLS : `enable row level security`, **aucune policy `select` client**, insert **service-role only** depuis l'Edge Function de redirection. Agrégats exposés par RPC `security definer` qui ne renvoie que des **compteurs** au propriétaire du lien. Ne jamais laisser un user lire les clics ligne à ligne (c'est une liste d'IP hashées).

**`referrals`** — la jointure install→signup.
```
referred_user_id uuid primary key references public.users(id) on delete cascade  -- 1 seul parrain, à vie
share_link_id    text references share_links(id)
referrer_user_id uuid references public.users(id)
matched_via      text check (matched_via in ('universal_link','manual_code'))
matched_at       timestamptz default now()
check (referred_user_id <> referrer_user_id)   -- auto-parrainage fermé au niveau SQL
```
RLS : insert **service-role only**, une seule fois (PK = anti-rejeu). `select` : owner des deux côtés.

**« 1re capture »** ne nécessite **aucune table** : c'est `select min(created_at) from hex_claims where owner_user_id = …` joint sur `referrals`. Ajouter une table pour ça serait de la dette.

### e.2 Ce qui peut attendre

| Table / champ | Verdict |
|---|---|
| **`share_exports`** | **Attend.** PostHog couvre déjà : `share_card_generated`, `share_completed{channel}`, `share_template_changed` (`packages/shared/src/events.ts:29-31`). Une table SQL en doublon d'un event PostHog = deux vérités. |
| Géoloc/pays des clics | Attend. |
| Attribution multi-touch | Attend. |
| **Récompenses de parrainage** | **Attend, et prudemment.** CLAUDE.md : anti pay-to-win **STRICT**. Un avantage de jeu pour un parrainage = pay-to-win par la porte sociale. Cosmétique uniquement, et pas au MVP. |

### e.3 L'honnêteté sur ce qui est mesurable

**Le clic → install n'est PAS attribuable proprement au MVP.** À dire franchement, parce que « l'app ne ment jamais » vaut aussi pour les métriques internes :

| Cas | Attribution | Comment |
|---|---|---|
| App **déjà installée**, tap sur le lien | **exacte** | Universal Link → `app/z/[slug].tsx` reçoit le token → stocké → posé à l'inscription. |
| App **pas installée** → App Store → 1er lancement | **impossible proprement** | Le token est perdu. Pas de fingerprinting (interdit + RGPD). Lire le presse-papier au 1er lancement → bandeau « collé depuis Safari » = **creepy**, et Apple le décourage. |

Options honnêtes pour le 2ᵉ cas, **en P1** : (a) l'onboarding demande « un ami t'a invité ? » (`matched_via='manual_code'`) — franc, imparfait, sans surveillance ; (b) Apple AdServices / custom product pages — lourd, ⊂ O2.
**Au MVP : `share_clicks` est réel et fiable, `referrals` ne couvre que le cas « app installée ». Aucune ligne de dashboard ne doit prétendre à un taux clic→install.**

---

## (f) Vérifiable SANS O2 / ce qui ne l'est pas

*(O2 = Apple/Google OAuth ⊃ compte Apple Developer, Team ID, provider Apple activé.)*

### f.1 Vérifiable SANS O2 — plus que prévu

| Élément | Comment |
|---|---|
| Résolution des versions SDK 52 | `npx expo install --check` — code de sortie |
| **Gate obligatoire (4/4)** | `npm run typecheck` **par code de sortie, jamais un grep** · `deno check` de **chaque** `supabase/functions/*/index.ts` · `deno test --allow-read supabase/functions/` (baseline **519**) · `sync-game-rules` + `git status _shared` (zéro drift) |
| `slugify`, `targetPath`, `buildShareLink`, mapping ancien→nouveau | **Purs** → tests Deno. Aucun device. |
| `applySharePrivacy` | Déjà pur et testé. |
| Composition visuelle de la story 9:16 | **Expo Web** : `ShareCard ratio="story"` + `ShareMap` rendent en RN-Web → on **voit** la card. On ne peut pas la capturer, on peut la valider. |
| Migrations `share_links`/`share_clicks`/`referrals` + **RLS** | **PGlite** (Postgres WASM) — procédure déjà en mémoire projet, aucun Docker. Y compris les tentatives d'insert `anon` qui **doivent** échouer. |
| Forme JSON de l'AASA / assetlinks | Validable hors ligne (les valeurs restent des placeholders). |
| Diff `app.json` | Relecture + `expo config --type prebuild`. |
| **🔑 Pipeline image COMPLET sur ANDROID** | **`eas build -p android --profile development` ne demande AUCUN compte Apple.** `captureRef` + `expo-file-system` + `expo-sharing` + **App Links `autoVerify`** se prouvent **entièrement sur Android sans O2.** C'est le levier le plus sous-estimé de ce spike : les pièges #1, #2, #3, #4, #6 sont **tous** des pièges Android, et **tous** testables tout de suite. |

### f.2 NON vérifiable sans O2

| Élément | Bloqueur |
|---|---|
| `captureRef` sur **device iOS** | dev build iOS → compte Apple Developer |
| **Universal Links iOS** | `associatedDomains` = entitlement → Team ID + provisioning |
| AASA servi correctement | domaine `gryd.app` + hébergement → **fondateur** (⊄ O2, mais bloquant pareil) |
| Feuille de partage iOS + **UTI `public.png`** | device iOS |
| Rendu Instagram/TikTok réel | device + apps installées |
| **P0.3 test terrain complet** | GPS réel + login Apple → O2 + O8 |
| `areaKm2` **vrai** | P0.2 (carte lit `hex_claims`) — dépendance produit, pas O2 |

### f.3 Points à trancher avant d'écrire une ligne

1. **`STORY_EXPORT_W/H`, `SHARE_HOST`, chemins : où ?** CLAUDE.md impose `packages/shared/src/game-rules.ts` comme source unique — mais un host et une taille d'export **ne sont pas des règles de jeu** (elles ne sont consommées par aucune Edge Function ; `game-rules.ts` est synchronisé vers `_shared` pour les fonctions Deno, ce serait du poids mort). **Proposition : `packages/shared/src/share-config.ts`**, exporté par `index.ts`. La règle « aucun nombre magique » est respectée (constante nommée, source unique) sans polluer le fichier synchronisé. **Arbitrage fondateur requis** — je ne modifie pas unilatéralement l'interprétation de CLAUDE.md.
2. **`gryd.app` est-il acquis ?** Tout P0.6 en dépend, et la **clearance INPI du nom GRYD n'est pas faite** (CLAUDE.md). Acheter le domaine avant la clearance est une décision fondateur.
3. **`SHARE_TRIM_M = 200`** (`sharePrivacy.ts:20`) est un nombre magique **nommé mais local**, hors `game-rules.ts`. Pré-existant, hors périmètre de ce spike, mais à noter : c'est exactement le genre de constante que la règle vise.

---

## Séquence recommandée

| Étape | Contenu | Dépend de |
|---|---|---|
| **1** | `npx expo install` des 3 deps P0.4 + gate 4/4 | — |
| **2** | `share/StoryShot.tsx` + `share/captureStory.ts` (garde web, `collapsable={false}`, `onLayout`, `animated={false}`) | 1 |
| **3** | Template MVP : `conquete` retitré + `areaKm2` + `privacyNote` câblé | 2 |
| **4** | `partage.tsx` : le CTA appelle `captureStory` → `shareAsync`. **Le toast dit la vérité** si l'image échoue. | 3 |
| **5** | **Build Android dev → preuve du pipeline complet** | 4 |
| **6** | `shareDeepLink.ts` : host + 3 chemins + mapping + tests Deno purs | — (parallélisable) |
| **7** | Pages web `/z /c /d` + OG + rebond App Store | 6 + domaine |
| **8** | Migrations `share_links`/`share_clicks`/`referrals` + RLS (vérif PGlite) | 6 |
| **9** | `app.json` entitlements + `.well-known/` + build iOS | **O2 + fondateur** |

**Étapes 1→8 : faisables sans O2.** Seule la 9 est bloquée.
La 5 est le point de bascule : elle transforme « aucune image ne peut sortir de l'app » en fait historique — **sans attendre Apple**.
```
---

# ANNEXE — CORRECTIONS DE LA RELECTURE DE COHÉRENCE (autorité sur le corps du document)

Ces 3 documents ont été rédigés en parallèle puis relus par un agent de cohérence qui a re-vérifié le code.
**En cas de contradiction, cette annexe prime.**

## Faits VÉRIFIÉS (fiables)
- `h3-js` installé en **4.5.0** : `cellsToMultiPolygon` ET `cellArea` existent. `expo` = **52.0.49**,
  RN 0.76.9, `react-native-svg` 15.8.0 présent. Les 4 deps image sont bien ABSENTES.
- Versions Expo-compatibles EXACTES (source `expo/bundledNativeModules.json`, SDK 52) :
  `react-native-view-shot ~4.0.3` · `expo-sharing ~13.0.1` · `expo-file-system ~18.0.12` ·
  `expo-clipboard ~7.0.1` · `expo-media-library ~17.0.6` · `expo-image-manipulator ~13.0.6`.
- `cellsToTerritory()` (`map/territory.ts:258`) = fusion h3 + lissage Chaikin + simplify : **DÉJÀ ÉCRIT**.
  Son en-tête dit « conservé UNIQUEMENT pour les clusters France démo » → à re-cibler, pas à réécrire.
- `hex_claims_city_idx` (`0002_schema.sql:140`) et la policy `hex_claims_select_all` (`0003_rls.sql:114`)
  existent → la lecture carte par `city_id` marche **sans nouvelle migration ni index**.
- `SHARE_HOST` est à **`shareDeepLink.ts:20`** (et non :22).

## ERREURS À NE PAS PROPAGER
- 🔴 **`h3ToDb` / `dbToH3` NE SONT PAS RÉUTILISABLES.** Ce sont des `const` **privées, non exportées**, dans
  `supabase/functions/ingest_run/index.ts:146-148` (fichier Deno), absentes de `_shared/` et de
  `packages/shared`. Le mobile **ne peut pas les importer**. → **Chantier réel** : extraire la conversion
  bigint↔hex vers `packages/shared` (et décider si elle passe par `sync-game-rules.mjs`). Tout doc qui dit
  « déjà là, réutiliser » est faux.
- 🔴 **`territoryStatus` n'alimente PAS le bouton GO.** Il n'est importé que par `app/(tabs)/profil.tsx:73`.
  `contextualAction.ts` importe `runContext`, `intention`, `warroom/demo`, `@klaim/shared` — jamais
  `territoryStatus`. Le risque `/crew-discovery` est réel mais porte sur **Profil + onboarding + Crew**
  (9 réfs / 4 fichiers), **pas sur GO**. Voir AMENDEMENT-39 §7 (corrigé).
- 🟠 `territoryGeoByState()` / `territoryStateLayers()` : signatures **non vérifiées** — à ouvrir avant de
  planifier le diff de P0.2.

## CONTRADICTIONS ENTRE DOCS — arbitrages
| Sujet | Tranché |
|---|---|
| Fichier/timing des flags | **UN seul** module, créé au **premier besoin réel** (P0.2 a besoin du flag « rendu bleu protégé », AMENDEMENT-39 §2). Pas de doublon `lib/flags.ts` + `shared/features.ts`. |
| Chemin `mission/` | Suit `CRITICAL_PATH` : `mission` **disparaît** du modèle de partage, `defaultShareTarget` → `{kind:'zone'}`. |
| Preuve du pipeline image | **Android d'abord** (`eas build -p android` ne demande AUCUN compte Apple) → P0.4/P0.5 sont vérifiables **sans F1**. `CRITICAL_PATH` surestimait le blocage Apple sur ces 2 étapes. |
| `areaKm2` | P0.5 **dépend** de P0.2 (`cellArea` de h3-js 4.5.0 est la source honnête). Pas de surface inventée dans la story. |
| Constantes de partage (1080×1920) | Vont dans un module de config partagé, pas en dur dans la prose. |

## TROU MAJEUR — non traité par les 3 docs : AMENDEMENT-39 §3 (GO + verbes contextuels)
État réel vérifié :
- `GrydNavBar.tsx:145` rend **`GO` en dur, toujours** — le rendu **ignore `action.label`**.
- `contextualAction.ts` produit : `RUN` (:97), `DÉFENDRE` (:111), `CONQUÉRIR` (:123), `TERMINER` (:135),
  `REJOINDRE` (:154). → **`REPRENDRE` n'existe pas** ; `RUN` ≠ `GO` ; `REJOINDRE` n'est pas au menu du §3.
- Les en-têtes `contextualAction.ts:33` et `GrydNavBar.tsx:9` disent encore « **jamais GO** » (hérité de
  l'AMENDEMENT-29, contredit par l'AMENDEMENT-38 puis réconcilié par le §3).
→ **Chantier réel, non planifié, non chiffré** : brancher `action.label` sur le rendu, créer `REPRENDRE`,
  mapper `RUN`→`GO` (générique seul), purger les commentaires « jamais GO ». À insérer dans le plan.
