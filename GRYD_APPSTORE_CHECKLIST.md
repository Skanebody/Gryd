# GRYD — Checklist de soumission App Store

**Statut : document de soumission (AMENDEMENT-33 §7).** Réunit tout ce qu'il faut fournir à App Store Connect pour un premier passage en review, plus les **notes de review**, l'**App Privacy nutrition label**, le **mapping guideline → statut** et la **vérification anti-steering (3.1.1)**.

> Périmètre : ce document couvre la conformité **structurelle**. Ce qui dépend d'O3 (IAP réel via RevenueCat) et O8 (HealthKit sur appareil) est **câblé démo** dans l'app et signalé ici comme « à activer avant soumission publique ». Le reste (permissions, modération UGC, suppression de compte, Sign in with Apple, URLs légales) est en place et testable.

---

## 1. Checklist de soumission

### 1.1 Build & identité

| Élément | Valeur | Source / statut |
|---|---|---|
| Nom public | **GRYD** | `apps/mobile/app.json` → `expo.name` |
| Bundle ID iOS | **`fr.nexus1993.gryd`** | `app.json` → `ios.bundleIdentifier` |
| Package Android | `fr.nexus1993.gryd` | `app.json` → `android.package` |
| Version marketing | **0.1.0** | `app.json` → `expo.version` |
| Build number iOS | auto-incrémenté | `eas.json` → profil `production.autoIncrement: true` |
| Scheme (deep link) | `gryd` | `app.json` → `expo.scheme` |
| UI style | dark forcé | `app.json` → `userInterfaceStyle: "dark"` (charte dark-first) |
| Chiffrement non-exempté | déclaré `false` | `app.json` → `ios.config.usesNonExemptEncryption: false` |
| New Architecture | désactivée | `app.json` → `newArchEnabled: false` |
| Tablette | non supportée | `app.json` → `ios.supportsTablet: false` |

**Clearance nom** : rappel projet — **clearance INPI GRYD à faire avant usage public**. Vérifier aussi la disponibilité du nom « GRYD » dans App Store Connect (unicité du nom d'app).

### 1.2 Build EAS (à produire)

- Profil de build à utiliser : **`production`** (`eas build --platform ios --profile production`).
- `appVersionSource: "remote"` (le build number est géré côté EAS/App Store Connect).
- **Secrets** : jamais en dur. `SUPABASE_URL` est dans `eas.json` ; `SUPABASE_ANON_KEY` (publishable uniquement) via `npm run setup:eas` → EAS sensitive → `app.config.ts` → `extra`. PostHog / RevenueCat (O3) idem. Jamais `sb_secret_*` côté mobile.
- Point ouvert **O8** : le build production doit être un **dev/prod build EAS ou Xcode** pour tester le GPS réel et le podomètre (pas Expo Go / web).

### 1.3 Icône & splash

- [ ] **Icône App Store 1024×1024** (sans alpha, sans coins arrondis appliqués — Apple les applique). Fond noir `#0A0B09` de la charte, marque chartreuse `#B4FF0D` — **jamais de chartreuse sur fond clair**.
- [ ] Icônes adaptatives fournies via config Expo (à confirmer dans `app.json` — actuellement `splash.backgroundColor: #0A0B09`, vérifier la présence d'un asset `icon` / `ios.icon` avant build).
- [ ] Splash : fond `#0A0B09`, `resizeMode: contain` (déjà configuré).

### 1.4 Screenshots (par device, requis App Store Connect)

Fournir des captures **dark-first** conformes charte (aucune chartreuse sur clair). Tailles requises par Apple :

- [ ] **iPhone 6,9" (16 Pro Max / 15 Pro Max)** — 1320×2868 ou 2868×1320. **Obligatoire.**
- [ ] **iPhone 6,5"** (fallback historique) — 1284×2778 (recommandé si l'app cible des OS plus anciens).
- iPad : **non requis** (`supportsTablet: false`).

Écrans à capturer (parcours de démo, montrent la valeur avant compte) :
1. **Carte / Battle Map** — territoire chartreuse « à moi », zone contestée (violet + double contour).
2. **Live Run** — trace GPS héros façon Strava, objectif + progression.
3. **Post-run / capture** — « Course validée » + zones capturées + Partager.
4. **Crew / War Room** — social sain (pas de classement de payeurs).
5. **Arsenal** — bannière anti-pay-to-win « Le territoire ne s'achète pas ».

> Ne pas mettre en avant du texte marketing trompeur (guideline 2.3). Les captures doivent refléter des écrans réels de l'app.

### 1.5 Métadonnées App Store Connect

| Champ | Proposition |
|---|---|
| **Nom** | GRYD |
| **Sous-titre** | Cours. Capture. Défends. |
| **Catégorie principale** | **Health & Fitness** |
| **Catégorie secondaire** | Sports *(ou Games — à décider ; Health & Fitness reste la primaire car l'app est fondée sur la course réelle)* |
| **Description** | Jeu de conquête de territoire par la course à pied. Cours dans ta ville pour capturer des zones sur la carte, défends ton territoire avec ton crew, et grimpe dans la ligue. GRYD transforme chaque sortie running en conquête : la trace GPS de ta course dessine les zones que tu revendiques. Rejoins un run club, coordonne les défenses, et fais grandir ton territoire — **le territoire ne s'achète jamais, il se court.** Saison 0 : Paris et Lille. *(rédaction finale à valider — pas de promesse de fonctionnalité non livrée, guideline 2.3.1)* |
| **Mots-clés** | running, course à pied, territoire, conquête, crew, run club, GPS, carte, fitness, jeu, Paris, Lille, sport |
| **Âge (rating)** | **12+** *(voir §1.6)* |
| **URL de support** | `https://gryd.run/support` *(à publier — page de contact réelle, guideline 1.5)* |
| **URL marketing** | `https://gryd.run` *(site waitlist apps/web)* |
| **URL politique de confidentialité** | `https://gryd.run/confidentialite` *(apps/web — agent web-legal ; obligatoire)* |
| **URL conditions (CGU)** | `https://gryd.run/conditions` *(apps/web — agent web-legal)* |

> Les hôtes `gryd.run` sont **à réserver / configurer** (aujourd'hui utilisés en démo pour les liens d'invite crew `gryd.run/c/…`). Les URLs de confidentialité et de conditions **doivent être vivantes et publiques** au moment de la soumission (App Store Connect et HealthKit les exigent).

### 1.6 Classification d'âge (Age Rating questionnaire)

Réponses proposées au questionnaire App Store Connect :
- **Contenu généré par l'utilisateur** : **OUI** (chat crew, pseudos, noms de crew) → déclenche l'obligation modération §1.2 (voir mapping guideline 1.2).
- Violence, contenu sexuel, jeux d'argent, drogues : **NON**.
- **Localisation** : l'app utilise la position (fonctionnalité) — pas un critère d'âge en soi.
- Résultat attendu : **12+** (à cause de l'UGC social non filtré exhaustivement / interactions entre utilisateurs). Confirmer selon les réponses exactes du questionnaire.

---

## 2. Notes de review pour Apple (App Review Information)

> À coller dans le champ **« Notes »** de la soumission. Rédigées pour un reviewer qui teste en quelques minutes.

```
GRYD is a running game: you run in your real city and the GPS trace of your
run captures territory on a map.

HOW TO TEST WITHOUT AN ACCOUNT
- The app is playable BEFORE any sign-in. On first launch, the onboarding
  shows your city, then lets you experience a first capture and see the map —
  the account step comes AFTER the value and can be skipped ("Plus tard").
  You do NOT need to create an account to review core gameplay.
- Sign in with Apple is offered (Guideline 4.8). A back-up demo account can be
  provided on request if you prefer to test the signed-in state.

GPS / OUTDOOR
- Core capture requires real GPS movement outdoors. In the simulator, the
  onboarding capture and map are wired in DEMO mode so the flow can be
  reviewed end-to-end without going outside. To see live territory capture,
  test on a device while walking/running outdoors — the app tracks your route
  and claims the hexes you cross.

IN-APP PURCHASES
- Digital goods (cosmetics, GRYD Club, Founder Pack) are purchased IN-APP via
  Apple In-App Purchase. There is NO external web checkout inside the app for
  digital goods (Guideline 3.1.1). IAP wiring is being finalized via
  RevenueCat; purchase flows currently reveal the item in a demo state and do
  not charge. No button in the app links out to a web payment page.

ACCOUNT DELETION
- Account deletion is available in-app: Settings > Confidentialité >
  "Supprimer mon compte" (Guideline 5.1.1(v)).

MODERATION (UGC)
- Crew chat, usernames and crew names are user-generated. The app provides
  report + block flows, a word filter, and a Code of Conduct, with a support
  contact. Reports are processed within 24h.
```

**Compte démo de secours (à fournir dans les champs Username/Password de la review si demandé)** :
- Créer un compte de test dédié (e-mail neutre, ex. `review@gryd.run`) avec quelques zones/crew pré-remplis, et le renseigner dans App Store Connect. **Ne jamais** mettre de vrais identifiants personnels.

---

## 3. App Privacy — Nutrition Label (Data Types à déclarer)

Renseigner dans App Store Connect → **App Privacy**. Aucun tracking publicitaire.

| Donnée collectée | Catégorie Apple | Usage déclaré | Lié à l'identité ? | Utilisé pour le tracking ? | Notes |
|---|---|---|---|---|---|
| **Localisation précise** (GPS pendant la course) | Location → *Precise Location* | **App Functionality** (capture de territoire, carte) | Oui (rattachée au compte) | **Non** | Jamais suivie hors course ; jamais dans les zones privées (voir strings `app.json`). |
| **Santé & fitness** (pas / podomètre, et FC/allure via HealthKit à O8) | Health & Fitness | **App Functionality** (GRYD Verify : vérifier l'effort réel) — **optionnel** | Oui | **Non** | Motion string présente ; HealthKit = câblage O8. Données santé **jamais** utilisées pour tracking ni publicité (exigence HealthKit). |
| **Adresse e-mail** | Contact Info → *Email Address* | **App Functionality** (compte, connexion) | Oui | **Non** | Via Sign in with Apple / Google. Apple peut fournir un e-mail relais. |
| **Identifiant utilisateur** (user id compte) | Identifiers → *User ID* | **App Functionality** (compte, sauvegarde territoire) | Oui | **Non** | — |
| **Contenu utilisateur** (messages de chat crew, pseudo, nom de crew) | User Content | **App Functionality** (social crew) | Oui | **Non** | UGC modéré (report/block/filtre, §1.2). |
| **Données d'usage / diagnostics** (events produit PostHog) | Usage Data + Diagnostics | **Analytics** (amélioration produit) | À confirmer selon config PostHog (privilégier *non lié* / anonymisé) | **Non** | PostHog EU (`eu.i.posthog.com`). Aucun SDK publicitaire tiers. |

**Points fermes** :
- **Aucune donnée n'est utilisée pour le TRACKING publicitaire** → répondre « No » à la question tracking (pas d'ATT/`AppTrackingTransparency` requis tant qu'aucun tracker cross-app n'est ajouté).
- La **position publique n'est jamais exposée** (mode privé, zones masquées — cf. `confidentialite.tsx`).
- Vérifier que la déclaration correspond EXACTEMENT au comportement réel avant soumission (une divergence = rejet 5.1.1 / retrait).

---

## 4. Mapping Guideline → statut

| Guideline | Sujet | Statut GRYD | Preuve / emplacement |
|---|---|---|---|
| **1.2** | Modération UGC (report, block, filtre, Code de conduite, contact) | **OK (structurel)** | Flux report/block + filtre + Code de conduite (agent moderation-safety) ; contact via `app/support.tsx` (« Signaler »). Traitement < 24 h documenté. |
| **2.1** | App complète / testable | **OK** | App jouable avant compte ; démo câblée là où O8/O3 bloque (voir notes de review §2). |
| **2.3.1** | Métadonnées non trompeuses | **À valider** | Description/screenshots à finaliser sans promettre de fonctionnalité non livrée (GPS réel = O8). |
| **3.1.1** | Achats intégrés (IAP, anti-steering) | **OK structurel / IAP réel = O3** | Paywall Arsenal 100 % in-app, **aucun lien vers paiement web** (voir §5). IAP RevenueCat = O3 (câblé démo). |
| **4.8** | Sign in with Apple | **OK** | `expo-apple-authentication` (`app.json` plugins) ; bouton système natif iOS (`AccountStep`, onboarding). Apple reste proposé quand Google sera actif. |
| **5.1.1** | Permissions & strings d'usage | **OK** | `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, motion (`expo-sensors` `motionPermission`) — toutes explicites (le POURQUOI). HealthKit string à ajouter au câblage O8. |
| **5.1.1(v)** | Suppression de compte in-app | **OK** | `app/confidentialite.tsx` → « Supprimer mon compte » (+ purge données) ; aussi listé dans Paramètres. Backend suppression = appel serveur (démo → réel). |
| **5.1.2 / 5.1.3** | Données santé (HealthKit) | **À activer (O8)** | Health = App Functionality, **optionnel**, jamais tracking/pub. String + entitlement HealthKit à ajouter avant d'activer la lecture santé réelle. |
| **5.1.5** | Services de localisation | **OK** | Position utilisée seulement pendant la course, jamais hors course ni zones privées (strings + mode privé). |

> Cases « À valider / À activer » = travail restant côté fondateur (O3, O8) ou finalisation métadonnées, pas des trous structurels.

---

## 5. Vérification anti-steering (Guideline 3.1.1)

**Question :** un écran mobile renvoie-t-il vers un paiement WEB externe pour un bien numérique ?

**Réponse : NON. Aucun steering détecté.** L'app est conforme.

**Méthode & preuves (lecture seule de `apps/mobile`)** :

1. **Aucun appel d'ouverture d'URL externe pour payer.** Recherche exhaustive dans `apps/mobile/app` et `apps/mobile/src` de `Linking.openURL`, `WebBrowser.openBrowserAsync`, `openAuthSessionAsync` → **0 résultat**. Le seul usage de `expo-web-browser` est `WebBrowser.maybeCompleteAuthSession()` (OAuth Google/Strava — pas un paiement).

2. **Le paywall Arsenal est 100 % in-app.** `apps/mobile/app/arsenal.tsx` — l'achat en euros (`buy()`, ligne ~141) ne fait **aucun** appel réseau vers le web : en démo il révèle l'item (`flashLoot`), et le commentaire code indique explicitement « paiement réel = O3 » (RevenueCat/Apple IAP). Les packs affichent « Paiement bientôt disponible » — pas de lien sortant. Aucun bouton ne mène à un checkout web.

3. **Le lien Paramètres « Abonnement & achats » pointe vers l'app, pas le web.** `apps/mobile/src/features/settings/sections.ts` (ligne 77-82) : `href: '/arsenal'` (route interne), **pas** vers le site `/abonnement`.

4. **Le site `apps/web/app/abonnement/page.tsx` existe mais est un SITE, séparé de l'app.** Son en-tête documente « CÂBLE DÉMO : paiement = intention Stripe (toast + stub) ». Il n'est **jamais** ouvert depuis le mobile (confirmé par le point 1). Conformément à AMENDEMENT-33 §4, le web `/abonnement` reste un site légal/marketing distinct du parcours d'achat in-app.

**Findings à corriger : AUCUN.** Si un futur écran ajoute un `Linking.openURL(...)` ou un `WebBrowser.openBrowserAsync(...)` vers une page de paiement (ex. `gryd.run/abonnement`) pour acheter un bien numérique, ce serait un **rejet 3.1.1** — à bannir. Les seuls usages autorisés de navigateur restent l'OAuth (auth) et d'éventuelles pages purement informatives sans achat.

---

## 6. Récapitulatif avant « Submit for Review »

- [ ] Icône 1024 (dark, chartreuse jamais sur clair) + assets icônes dans `app.json`.
- [ ] Screenshots 6,9" (min.) conformes charte.
- [ ] URLs **vivantes** : support, marketing, `/confidentialite`, `/conditions`.
- [ ] App Privacy renseigné (§3) — cohérent avec le comportement réel, tracking = No.
- [ ] Age Rating rempli (UGC = Oui → 12+).
- [ ] Notes de review + compte démo de secours (§2) renseignés.
- [ ] IAP RevenueCat activé (**O3**) et products créés dans App Store Connect **avant** soumission publique.
- [ ] HealthKit string + entitlement ajoutés si la lecture santé réelle est activée (**O8**).
- [ ] Modération UGC (report/block/filtre/Code de conduite) testable in-app (**§1.2**).
- [ ] Suppression de compte in-app testable (**5.1.1(v)**).
- [ ] Anti-steering : re-vérifier (grep `openURL`/`openBrowserAsync`) qu'aucun lien de paiement web n'a été ajouté (**§5**).
