# GRYD — Partager sa sortie (audit + livraison du 10/09/2026)

> Demande fondateur : « Comment se passe le partage du run ? Est-ce que tout est mis en place
> pour pouvoir partager sur les réseaux sociaux facilement ? »

Rang : document de lot, subordonné au cahier de septembre
(`docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md`, rang 0) et à `docs/DECISIONS.md`.
Il ne décide aucune mécanique de jeu. Il décrit ce qui existe, ce qui manque et ce qui a été livré.

---

## 1. Réponse courte

Le partage **existait déjà, et il était bon** : affiche 9:16, PNG haute définition, sticker à fond
transparent, film MP4 encodé en natif, masquage des extrémités du tracé. Il était **loin**, pas
absent : le bouton « Partager » d'une fin de sortie poussait un ÉCRAN de composition
(le Studio, quatre familles, cinq compositions, trois formats, deux fonds) avant qu'une seule
image ne parte.

Ce lot ne réécrit rien de tout cela. Il **raccourcit le geste** : la feuille « Partager ta sortie »
s'ouvre par-dessus l'écran où l'on est, avec l'affiche déjà rendue, et remet l'image à la feuille
système en un tap. Le Studio reste entier, à un lien de là.

---

## 2. Audit — chaque chemin de partage au 10/09/2026 (avant ce lot)

### 2.1 Les portes

| Porte | Fichier | Ce qu'elle faisait |
|---|---|---|
| Fin de sortie | `apps/mobile/src/features/refonte/RunResult.tsx:139-154` | `setShareRun(...)` puis `router.push('/partage')` — une navigation |
| Détail d'une sortie | `apps/mobile/app/course/[id].tsx:347-384` | idem, avec la trace relue en base |
| Studio | `apps/mobile/app/partage.tsx:1` | une ligne : `export { default } from '../src/features/share/ShareStudio2026'` |
| Crew | `src/features/social/SocialPublicationAction2026.tsx:8` | pousse `/crew-publish` — publication interne, hors réseaux |

### 2.2 Ce que le Studio produit — et il produit vraiment

`src/features/share/ShareStudio2026.tsx` (940 lignes) : quatre familles (`Trace`, `Photo`,
`Sticker`, `Replay`), trois formats (`story` 1080×1920, `portrait` 1080×1350, `square` 1080×1080),
deux fonds, cinq compositions dont quatre payantes, objets de collection.

- **Image** : `shareAsImage` (`shareActions.ts:125-141`) capture l'étage hors écran
  (`ShareExportStage.tsx`) avec `react-native-view-shot@4.0.3` puis remet le PNG à `expo-sharing`.
  La définition vient de la **largeur de montage**, jamais d'une option de redimensionnement —
  le raisonnement est dans `shareActions.ts:151-167`, et il est juste.
- **Sticker** : `shareStickerImage` (`shareActions.ts:209-225`), PNG à canal alpha, avec filet
  TEXTE nommé comme tel (jamais annoncé « PNG » quand c'en est pas un).
- **Film** : `generateRunFilm2026` (`share/film/generateRunFilm2026.ts`) → module natif local
  `modules/gryd-run-film`. **Ce n'est pas une maquette** : `ios/RunFilmEncoder.swift` produit un
  MP4 H.264 de 8 s, sans audio, via AVAssetWriter ; `android/…/RunFilmEncoder.kt` fait l'équivalent
  en MediaCodec/MediaMuxer. Export borné (215 s), annulable, fichiers partiels supprimés, cache
  purgé à 24 h. Vérifié le 09/09/2026 par compilation `swiftc` et décodage des trois MP4 sur macOS
  (`src/features/share/film/README.md`) ; **jamais exécuté sur un appareil**.
- **Vie privée** : `protectedShareSegments2026` (`shareTrace2026.ts`) → `sharePrivacy.ts` →
  `packages/engine/src/tracePrivacy.ts`, avec `SHARE_TRIM_M = 250` m et
  `SHARE_SIMPLIFY_EPSILON_M = 15` m de `packages/shared/src/game-rules.ts:1313,1343`. C'est le
  **même code que l'ingestion serveur** : la trace publiée ne peut pas être plus fine que la trace
  stockée.

### 2.3 Ce qui était mort, ou absent

| Sujet | État mesuré | Preuve |
|---|---|---|
| **Raccourci Instagram / TikTok** | Aucun bouton, jamais peint | `shareTargets.ts:266-272` : `DECLARED_QUERIES` valait `[]` |
| **`LSApplicationQueriesSchemes`** | **Absent d'`app.json`** | `grep -c` → 0 |
| **Page publique d'une sortie** | **N'existe pas** | `apps/web/app/` : landing, `cgv`, `conditions`, `confidentialite`, `mentions-legales`, `abonnement`, `admin`. Aucune route `/u/`, `/c/`, `/run/` |
| **`buildShareLink`** (`shareDeepLink.ts:57`) | Fabrique `https://gryd.run/…` — **domaine non possédé** (point ouvert O10, `app.json:_note_deeplink_invite_o10`) | Un « Copier le lien » copierait une URL morte |
| **Sauvegarde dans la pellicule** | Impossible | `expo-media-library` absent de `package.json` |
| **Commune sur l'affiche** | Aucune source | La commune n'est attachée à aucune sortie ; seul `CommuneLeaderboard2026` en connaît une, pour le classement |
| **Dénivelé sur l'affiche** | Impossible avant le 10/09 | `RunPoint` = `{lat,lng,t,acc}` ; `RunPoint.alt` est arrivé le 10/09/2026 (commit `43ea6dc`, lot parallèle) |

### 2.4 Le verrou Instagram, en deux temps

Ce n'est pas une seule marche, c'en est deux — et les confondre est la raison pour laquelle
« il suffit de déclarer le schéma » est faux.

**Marche 1 — SAVOIR (levée par ce lot).** Sur iOS,
`Linking.canOpenURL('instagram-stories://…')` ne consulte pas le système tant que le schéma n'est
pas dans `LSApplicationQueriesSchemes`. Non déclaré, il répond `false` **même quand Instagram est
installé**. Sans la déclaration, aucune sonde ne peut rien mesurer.

**Marche 2 — POUVOIR (toujours en place).** Instagram Stories attend l'image sur `UIPasteboard`
sous des types **propriétaires** :

```
com.instagram.sharedSticker.backgroundImage   (le fond)
com.instagram.sharedSticker.stickerImage      (le sticker)
```

`expo-clipboard@7.0.1` **ne sait pas les écrire**. Son natif fait exactement une chose :

```swift
// node_modules/expo-clipboard/ios/ClipboardModule.swift:54-60
AsyncFunction("setImageAsync") { (content: String) in
  guard let data = Data(base64Encoded: content), let image = UIImage(data: data) else { … }
  UIPasteboard.general.image = image          // ← public.png, et rien d'autre
}
```

Il n'existe aucune API JS pour `UIPasteboard.setItems([[type: data]], options:)`. Ouvrir
`instagram-stories://share` sans la charge utile ouvre **Instagram sans l'image** : un bouton qui
promet un partage et livre autre chose, c'est-à-dire le « bouton mort » que la constitution
interdit. S'ajoute un second obstacle : Meta exige un **App ID Facebook** dans
`source_application`, et GRYD n'en a pas.

**Ce qu'il faudrait pour lever la marche 2** (chiffré, non fait) : un module natif local sur le
patron de `gryd-run-film` (~50 lignes Swift + ~40 Kotlin pour l'`Intent`
`com.instagram.share.ADD_TO_STORY`), un App ID Facebook enregistré, et **un nouveau build EAS**.
Tant que ce n'est pas fait, `shareTargets.ts` répond `no_payload_bridge` et aucun bouton n'apparaît.

**Et ce n'est pas bloquant pour le fondateur** : la feuille système iOS contient déjà l'extension
Instagram, qui propose « Stories » et « Fil ». Ce chemin marche aujourd'hui, sur un binaire déjà
installé. Le raccourci ne ferait gagner qu'un tap.

---

## 3. Benchmark court (2026)

| App | Image | Vidéo | Stories | Ce qu'on en retient |
|---|---|---|---|---|
| **Strava** | Carte + stats, plusieurs mises en page, choix du fond (photo, carte, uni) | « Flyover » 3D animé | Raccourci direct | La feuille s'ouvre **sur l'activité**, jamais sur un écran séparé. C'est le point que ce lot copie |
| **Nike Run Club** | Photo + stickers de stats | Non | Direct | Les stickers marchent parce qu'ils sont **transparents** — GRYD l'a déjà (`shareStickerImage`) |
| **INTVL** | Carte de séance, très typographique | Non | Feuille système | La densité de texte est la marque ; les chiffres sont énormes |

**Ce qui marche le mieux en 2026** : 9:16 lisible **au pouce dans un fil**, une mesure dominante
(pas cinq à égalité), une seule couleur d'accent, la marque discrète. Toute stat qu'on ne peut pas
lire en 1 seconde est du bruit — c'est la raison de la correction du pied décrite en §4.3.

---

## 4. Ce qui est livré

### 4.1 La feuille « Partager ta sortie »

`apps/mobile/src/features/share/QuickShareSheet2026.tsx` (nouveau) — modèle pur dans
`quickShare2026.ts`, testé en Deno.

- S'ouvre **par-dessus** la fin de sortie et le détail d'une sortie. Aucune navigation.
- Aperçu **réel** : le même `SharePoster2026` que le Studio exporte, monté à la largeur d'aperçu,
  et un `ShareExportStage` hors écran à la largeur qui décide les pixels (1080 px de large).
- Deux cadres : **Story 9:16** et **Carré 1:1**, distingués par un motif ET un libellé (L15).
- Trois fonds : **Noir** (défaut), **Chartreuse**, **Minimal**.
- Un bouton primaire : « Partager l'image » → feuille système (Instagram, TikTok, WhatsApp,
  Messages, AirDrop, Enregistrer dans Photos).
- « Partager la vidéo · 8 s » **seulement si** le module natif répond présent dans ce binaire.
- « Plus d'options dans le Studio » pour tout le reste.
- Haptique sur chaque action, plus marquée sur la remise réussie (L6).

**Gestes** : fin de course → `Partager` → la feuille est là, image prête → `Partager l'image` →
feuille système. Deux taps, sans quitter l'écran, sans choix imposé.

### 4.2 Les fonds

| Fond | Rendu | Pourquoi ainsi |
|---|---|---|
| Noir | `theme: 'dark'`, accent sur le seul terrain gagné | Le défaut GRYD |
| Chartreuse | `theme: 'dark'` + mesure principale en `colors.chartreuse` | **N'est pas un troisième thème** : `ShareTheme2026` voyage jusqu'au natif du film (Codable strict) — une troisième valeur casserait le décodage d'un binaire déjà installé |
| Minimal | `theme: 'light'`, **jamais** d'accent | Chartreuse sur blanc est illisible ; c'est testé |

### 4.3 L'affiche

`SharePoster2026.tsx` — trois ajouts, tous conditionnels :

1. **Ligne de contexte** sous la marque : `commune · date`. Seuls **jour, mois, année** —
   jamais l'heure. Publier « 07:12 » à côté d'un tracé publie une habitude, et une habitude se
   suit aussi bien qu'une adresse. La commune n'est alimentée par **aucun appelant** aujourd'hui
   (voir §2.3) et **ne doit jamais** déclencher un géocodage inverse du point de départ.
2. **Dénivelé**, si et seulement s'il a été mesuré (`elevationFrom`, avec son seuil anti-bruit).
   Rendu possible par `RunPoint.alt` (10/09/2026) ; les sorties archivées avant n'en portent pas
   et n'affichent alors **aucune** ligne — un `0` y ferait passer une côte pour du plat.
3. **Pied sur deux lignes au-delà de trois mesures.** Mesuré en aperçu web : à quatre colonnes,
   « 5:00 /km » devenait « 5:00… » et « +0,01 km² » devenait « +0,0… ». En carré, le titre cède
   quelques points pour que la trace reste visible.

### 4.4 Le manifeste (décision fondateur appliquée)

`apps/mobile/app.json` — `ios.infoPlist.LSApplicationQueriesSchemes: ["instagram-stories",
"instagram"]`, et rien d'autre. Sans permission, sans collecte, sans effet sur le manifeste de
confidentialité (sonder un schéma n'est pas une collecte — c'est testé).
`shareTargets.ts:DECLARED_QUERIES.ios` recopie la liste, et deux tests refusent la divergence.

**Un nouveau build EAS est nécessaire** pour que cette déclaration existe dans le binaire.

---

## 5. Ce qui n'est PAS livré, et pourquoi

| Non livré | Raison | Ce qu'il faudrait |
|---|---|---|
| Bouton « Instagram Stories » | Aucun pont ne peut remettre l'image (§2.4) | Module natif + App ID Facebook + build EAS |
| Bouton « TikTok » | TikTok n'a pas de schéma d'URL qui transporte un média | OpenSDK natif + client key |
| « Copier le lien » | **Aucune page publique n'existe** et `gryd.run` n'est pas possédé | Une page `apps/web/app/run/[id]` + le domaine (O10) |
| « Enregistrer dans Photos » | `expo-media-library` n'est pas installé | La feuille système le propose déjà via « Enregistrer l'image » |
| Commune sur l'affiche | Aucune source sans appel réseau | Attacher la commune à la sortie côté serveur |

---

## 6. Preuves

- `quickShare2026.test.ts` — 16 tests purs (cadres, fonds, capacités, quatre états, mesures).
- `quickSharePrivacy2026.test.ts` — 10 tests, dont l'**étape 0** (« sans masquage, la trace
  commence au départ réel ») puis la règle et la couture.
- `quickShareWiring2026.test.ts` — 12 tests de couture (les deux portes, le manifeste, L6, L15,
  aucune couleur en dur).
- `shareModel2026.test.ts` — 5 tests ajoutés (date sans heure, dénivelé mesuré, contexte).
- `shareTargets.test.ts` — test réécrit : ce qui écarte Instagram n'est plus l'ignorance
  (`probe_not_declared`) mais l'incapacité de livrer (`no_payload_bridge`), et un second test
  prouve que la déclaration **sert** à quelque chose.
- Captures des trois fonds × deux cadres, relues à l'œil (bundle web réel, Playwright).

**Non vérifiable sans appareil** : Instagram réel, l'encodeur vidéo natif sur iPhone/Android, et
la présence de `LSApplicationQueriesSchemes` dans le binaire. Les trois demandent un build EAS.
