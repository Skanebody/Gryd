# GRYD — Dossier de soumission App Store

**Révision du 26/07/2026.** Ce document exécute les conclusions de
`docs/APP_STORE_CONFORMITE.md` (audit du 26/07/2026) sur le **dossier** :
notes de review (**B10**), App Privacy label (**B9**), métadonnées, et
préparation du jour où le domaine existera (**B1/B2**, bloqués sur O10).

---

## 0. Comment lire ce document

**Ce dossier PRESCRIT et VERROUILLE — il n'affirme pas.** Chaque ligne est soit
une valeur à recopier dans App Store Connect, soit une **vérification à
exécuter** avant de la recopier. C'est délibéré : la version précédente
*affirmait* l'état de l'app, et ces affirmations avaient survécu au code
(elles décrivaient des achats en démo et un mode démo supprimé le 21/07/2026).
Un dossier qui affirme vieillit et ment ; un dossier qui vérifie ne le peut pas.

**La règle qui gouverne le tout** (l'app n'a jamais été soumise — il n'y a donc
eu aucun rejet ; c'est un risque écarté avant la soumission, pas un incident) :

> Ce que le dossier RACONTE est lu par le reviewer **avant** qu'il n'ouvre
> l'app. Un texte de soumission qui décrit une app plus riche que le binaire est
> un motif de rejet à lui seul (2.3.1 « metadata … should not include … features
> that are not available », 2.1(a) « placeholder text … should be scrubbed
> before submission ») — même quand le code, lui, est irréprochable.

Trois marqueurs, jamais confondus :

| Marqueur | Sens |
|---|---|
| **[VALEUR]** | À recopier tel quel dans App Store Connect. |
| **[GATE]** | Vérification à exécuter. Si elle échoue, **on ne soumet pas**. |
| **[FONDATEUR]** | Hors code : décision, achat, ou action dans une console. |

---

## 1. Build & identité

Valeurs relues dans `apps/mobile/app.json` le 26/07/2026.

| Élément | Valeur | Source |
|---|---|---|
| Nom public | **GRYD** | `expo.name` |
| Bundle ID iOS | **`fr.nexus1993.gryd`** | `expo.ios.bundleIdentifier` |
| Package Android | `fr.nexus1993.gryd` | `expo.android.package` |
| Version marketing | **0.1.0** | `expo.version` |
| Build number iOS | auto-incrémenté | `eas.json` → `production.autoIncrement` |
| Scheme (deep link) | `gryd` | `expo.scheme` |
| UI style | dark forcé | `expo.userInterfaceStyle: "dark"` |
| Chiffrement non-exempté | `false` | `expo.ios.config.usesNonExemptEncryption` |
| New Architecture | désactivée | `expo.newArchEnabled: false` |
| Tablette | non supportée | `expo.ios.supportsTablet: false` |

**[FONDATEUR] Clearance nom** : clearance INPI « GRYD » à faire avant usage
public + vérifier l'unicité du nom dans App Store Connect.

### 1.1 Build EAS

- Profil : **`production`** (`eas build --platform ios --profile production`).
- `appVersionSource: "remote"`.
- **Secrets jamais en dur** : `EXPO_PUBLIC_SUPABASE_URL` / clé anon / PostHog via
  `eas secret` ou variables de profil.
- **[GATE] O8** — le binaire soumis doit avoir été lancé au moins une fois sur un
  **appareil réel** : le GPS d'arrière-plan, le podomètre et l'entitlement Sign in
  with Apple ne sont pas observables autrement (ni en Expo Go, ni sur le web).

### 1.2 Icône & splash

- [ ] **Icône App Store 1024×1024**, sans alpha, sans coins arrondis appliqués.
      Fond `#0A0B09`, marque chartreuse `#B4FF0D` — jamais de chartreuse sur clair.
- [ ] Assets `icon` / `ios.icon` présents dans `app.json` avant build.
- [ ] Splash : fond `#0A0B09`, `resizeMode: contain`.

### 1.3 Screenshots

**[GATE] Une capture ne montre QUE des écrans présents dans le build soumis.**
Guideline 2.3.3 : « screenshots should show the app in use ». La liste
précédente demandait des captures d'**Arsenal** et de la **War Room** : ces deux
surfaces sont masquées par `flags.arsenal` / `flags.warRoom`
(`apps/mobile/src/lib/flags.ts`), donc **absentes du build**. Les capturer aurait
été une promesse de fonctionnalité indisponible.

Écrans capturables, parce qu'ils existent sans drapeau :

1. **Carte** — territoire par rôle (chartreuse = moi, orange = rival, violet = contesté).
2. **Course en cours** — trace GPS héros, objectif, progression.
3. **Post-course** — « Course validée » + zones capturées.
4. **Crew** — l'écran crew réel (roster, signaux).
5. **Profil / Confidentialité** — export et suppression de compte visibles.

- [ ] **iPhone 6,9"** — 1320×2868. **Obligatoire.**
- [ ] iPhone 6,5" — 1284×2778 (si OS anciens ciblés).
- iPad : non requis (`supportsTablet: false`).

> Les captures doivent montrer un compte réel avec de vraies données de course,
> **ou** les états vides tels qu'ils s'affichent. Jamais un montage : l'app ne
> fabrique aucune donnée, son dossier non plus.

### 1.4 Métadonnées

| Champ | Valeur |
|---|---|
| **Nom** | GRYD |
| **Sous-titre** | Conquiers ta ville en courant |
| **Catégorie principale** | Health & Fitness |
| **Catégorie secondaire** | Sports |
| **Tagline** (texte promotionnel) | Cours pour ton crew. Conquiers ta ville. |
| **Mots-clés** | running, course à pied, territoire, conquête, crew, run club, GPS, carte, fitness, jeu, Paris, Lille, sport |
| **Description** | voir ci-dessous |
| **URL de support** | **[FONDATEUR] bloqué par O10 — voir §7** |
| **URL marketing** | **[FONDATEUR] bloqué par O10 — voir §7** |
| **URL politique de confidentialité** | **[FONDATEUR] bloqué par O10 — voir §7** (champ **obligatoire**) |
| **URL conditions (CGU)** | **[FONDATEUR] bloqué par O10 — voir §7** |

**[VALEUR] Description :**

> Jeu de conquête de territoire par la course à pied. Cours dans ta ville pour
> capturer des zones sur la carte, défends ton territoire avec ton crew, et
> grimpe dans la ligue. GRYD transforme chaque sortie running en conquête : la
> trace GPS de ta course dessine les zones que tu revendiques. Rejoins un run
> club, coordonne les défenses, et fais grandir ton territoire — le territoire ne
> s'achète jamais, il se court. Saison 0 : Paris et Lille.

**[GATE] 2.3.1 — la description ne nomme aucune fonctionnalité masquée.**
Relire cette description contre `flags.ts` avant de la coller : elle ne doit citer
ni boutique, ni abonnement, ni classement de saison si le drapeau correspondant
est fermé. En l'état, « grimpe dans la ligue » est la seule formule limite —
l'onglet Saison étant derrière `flags.season`. **La retirer si le drapeau reste
fermé.**

### 1.5 Classification d'âge

**⚠️ Le palier « 12+ » n'existe plus.** Vérifié le 26/07/2026 sur
`developer.apple.com/help/app-store-connect/reference/age-ratings` : les paliers
actuels sont **4+, 9+, 13+, 16+, 18+** (et Unrated). La version précédente de ce
dossier visait « 12+ » à trois endroits — une valeur qu'aucun formulaire ne
propose plus.

Réponses au questionnaire, alignées sur le binaire réel :

- **Contenu généré par l'utilisateur : OUI**, mais borné — **il n'y a pas de
  chat**. L'UGC se limite à : un pseudo, un nom de crew (filtré côté serveur
  avant insertion), et un vocabulaire **fermé** de signaux de crew. Répondre
  « oui » aux interactions entre utilisateurs, et le préciser dans les notes.
- Violence, contenu sexuel, jeux d'argent, drogues, contenu horrifique : **NON**.
- Localisation : utilisée, mais ce n'est pas un critère d'âge en soi.

**[GATE] Cohérence rating ↔ gate d'âge.** L'app **refuse les moins de 16 ans** au
point de création de compte (`MIN_AGE_YEARS`, gate rendu dans `sign-in.tsx`).
Déclarer un rating **inférieur à 16+** tout en refusant les moins de 16 ans est
une incohérence relevable. Deux issues, à trancher : aligner le rating sur 16+,
ou expliquer le gate dans les notes (motif : traitement de données de mineurs
sous RGPD). **Ne pas laisser les deux valeurs se contredire en silence.**

---

## 2. Notes de review (App Review Information)

> **[GATE] NE PAS COLLER CE BLOC TANT QUE LE GATE §6.1 N'EST PAS VERT.** Il
> décrit le binaire ; si le binaire change, il change. Les vérifications de §6.1
> sont exactement les points que ce texte affirme.

**Ce qui a été retiré, et pourquoi — à ne jamais réintroduire :**

| Phrase retirée | Pourquoi c'était un rejet |
|---|---|
| « purchase flows currently reveal the item in a demo state and do not charge » | **3.1.1** interdit explicitement : « Apps may not use their own mechanisms to unlock content or functionality ». La phrase décrivait mot pour mot le mécanisme interdit — alors que le code, lui, ne déverrouille rien (aucune lib d'achat, `grantLocalItem()`/`spendEclats()` supprimés à la source, CTA d'achat non pressable). Le rejet serait venu du **texte**, pas du code. |
| « IAP wiring is being finalized via RevenueCat » | Annonce d'un chantier en cours dans un champ de soumission : 2.1(a) (placeholder à nettoyer). |
| « the onboarding capture and map are wired in DEMO mode » | Le mode démo a été **supprimé le 21/07/2026** (AMENDEMENT-47). Décrire un mode qui n'existe plus envoie le reviewer chercher un comportement introuvable. |
| « The app is playable BEFORE any sign-in » | **Faux dans le build soumis** : avec un backend configuré, l'app redirige vers `/sign-in` après l'onboarding (`app/(tabs)/_layout.tsx`), et « Plus tard » n'est proposé **que** sans backend. Le reviewer se serait heurté à un mur au premier écran. |
| « Crew chat … are user-generated » | Il n'y a **aucune messagerie** (`grep -rn crew_messages apps/mobile/app apps/mobile/src packages/ supabase/functions/` → 0 ; la table ne survit qu'en migration 0019/0020, sans aucun code applicatif). Déclarer un chat appelle les obligations 1.2 sur une surface inexistante : le reviewer cherche les outils de modération du chat, ne trouve ni l'un ni l'autre. |
| « Reports are processed within 24h » | Engagement de délai qu'aucun SLA ne tient. |

**[VALEUR] Bloc à coller dans le champ « Notes » :**

```
GRYD is a running game: you run in your real city, and the GPS trace of your run
captures territory on a map.

1. AN ACCOUNT IS REQUIRED — HOW TO SIGN IN
Playing requires an account: territory is claimed server-side, and crews and
leaderboards are account-based features. First launch shows a 4-step onboarding
(the gesture, the rivalry, your city, then the account step); the game opens
after sign-in.
- Sign in with Apple is offered first on iOS (Guideline 4.8). Signing in with
  your own Apple ID creates a fresh empty account in seconds — nothing to type,
  no email to receive. This is the fastest way to review the app.
- The alternative is a one-time code sent by email.
- Sign-in options are derived from what actually works on the current build: a
  provider whose client is not configured is not displayed at all, rather than
  displayed and failing.
- Minimum age is 16, asked once at account creation, because of the personal
  data involved (precise location).

2. WHAT A BRAND-NEW ACCOUNT LOOKS LIKE — THIS IS NOT A BUG
GRYD never displays fabricated data. A new account owns no territory: the map
shows your city with no zones held, leaderboards are empty, history is empty.
These empty states are intentional and are worded as such on screen. There is no
demo mode and no sample data anywhere in this build.

3. GPS — WHAT ACTUALLY CAPTURES TERRITORY
Territory is captured by real movement. Press GO, move outdoors, then finish the
run: the hexes your route crossed are claimed server-side.
- Location permission is requested on the GO gesture, not at launch. "Always" is
  only offered after the app has actually gone to background during an active
  run, and the iOS background location indicator stays on while it runs.
- In the Simulator, a simulated location route (Simulator menu: Features >
  Location > City Run; or Xcode: Debug > Simulate Location with a GPX file)
  exercises the same capture path. The step-count signal is optional and is
  treated as neutral when the sensor is unavailable, so a simulated run is not
  penalized for having no steps.
- Without movement, nothing is captured. An empty map is the correct result.

4. IN-APP PURCHASES: NONE IN THIS BUILD
This build contains no in-app purchases and no subscription. There is no store,
no paywall and no purchase button anywhere in the app, and no purchase framework
is linked into the binary. Accordingly, no IAP products are submitted with this
build.
The store surface exists in the source tree behind a build-time flag that is off.
Expo inlines EXPO_PUBLIC_* variables at bundle time, so this surface cannot be
switched on remotely after review — it would require a new build and a new
review. We prefer to state this rather than leave it unsaid.

5. ACCOUNT DELETION (5.1.1(v))
Profile > Settings > Privacy > "Delete my account". (The app follows the device
language and ships in 5 languages; on a French device the same path reads
Confidentialité > "Supprimer mon compte".)
The profile becomes invisible immediately; server data is purged after a 30-day
grace period by a scheduled job. Signing back in during that period cancels the
deletion, and the app says so. A full data export is available from the same
screen.

6. USER CONTENT & MODERATION (1.2)
There is NO chat in GRYD. User-generated content is limited to: a username, a
crew name, and a closed catalogue of crew signals (fixed choices, not free text).
Crew names are filtered server-side before insertion. Report and Block are
available from a player's row (crew roster and leaderboard) and from Settings >
Privacy. Blocking hides the blocked player where GRYD would show them. Reports
go to a moderation queue reviewed by a human.

7. HEALTH DATA: NONE
GRYD reads no health data. It is connected to neither HealthKit nor Health
Connect, and the binary declares no HealthKit entitlement. The only motion data
used is the step count during a run, for anti-cheat validation, and it is never
used for advertising.

8. LANGUAGES
French, English, Spanish, German and Portuguese, following the device language.
```

### 2.1 Compte de démonstration — ce qu'on peut fournir, et ce qu'on ne peut pas

**[FONDATEUR]** Apple exige des identifiants de démonstration quand la connexion
est obligatoire. Ici, il faut regarder ce que le code permet vraiment :

| Voie de connexion | Utilisable comme compte de review ? |
|---|---|
| **Sign in with Apple** | **Oui, et c'est la voie recommandée.** Le reviewer se connecte avec son propre Apple ID et obtient un compte vierge immédiatement. Aucun identifiant à transmettre. C'est ce que dit le §1 des notes. |
| **Code à usage unique par e-mail (OTP)** | **Non, en l'état.** Le code part vers une boîte que le reviewer ne peut pas lire. Un « compte de démo » avec e-mail + OTP est **inutilisable** tant que personne ne peut relayer le code au reviewer. |
| Mot de passe | N'existe pas — aucune authentification par mot de passe dans le code. |

**Aucun identifiant n'est inventé dans ce document.** Si App Store Connect exige
malgré tout de remplir les champs Username/Password :

- [ ] **[FONDATEUR]** créer un compte dédié sur une adresse **que tu contrôles**,
      et **rester joignable pendant la revue** pour relayer le code OTP ; ou
- [ ] renvoyer explicitement à Sign in with Apple dans les notes (déjà fait, §1),
      et laisser les champs vides.

Ne **jamais** mettre d'identifiants personnels réels.

---

## 3. App Privacy — nutrition label

Renseigner dans App Store Connect → **App Privacy**.

**⚠️ Ce tableau déclarait « Santé & fitness … FC/allure via HealthKit ».** Suivre
cette consigne aurait produit un label affirmant une collecte que le binaire ne
peut pas faire — l'un des écarts les plus systématiquement relevés en revue.
**Ne déclarer que ce dont la collecte est prouvée par du code**, une preuve par
ligne :

| Donnée collectée | Catégorie Apple | Usage | Liée à l'identité | Tracking | Preuve dans le code |
|---|---|---|---|---|---|
| **Localisation précise** (GPS pendant la course) | Location → *Precise Location* | App Functionality | Oui | **Non** | `features/run/gps/provider.ts` (watch ouvert par `startSensors()` uniquement), `runs` côté serveur |
| **Fitness** (nombre de pas pendant la course) | Health & Fitness → *Fitness* | App Functionality (anti-triche GRYD Verify) | Oui | **Non** | `features/run/gps/tracker.ts` → `Pedometer` (expo-sensors), colonne `runs.step_count`, lue par `engine/validation.ts` |
| **Adresse e-mail** | Contact Info → *Email Address* | App Functionality (compte) | Oui | **Non** | `lib/auth.ts` (Sign in with Apple / OTP e-mail). Apple peut fournir un relais. |
| **Identifiant utilisateur** | Identifiers → *User ID* | App Functionality | Oui | **Non** | UUID Supabase ; `identify()` n'envoie que lui (`lib/analytics.ts`) |
| **Contenu utilisateur** (pseudo, nom de crew, signalements) | User Content → *Other User Content* | App Functionality | Oui | **Non** | `users.pseudo`, `crews.name` (filtré serveur, migration 0050), `content_reports` |
| **Données d'usage / diagnostics** (events produit) | Usage Data + Diagnostics | Analytics | Non lié de préférence | **Non** | PostHog hébergé UE. Aucune position ni identité dans les charges : les 66 appels `track()` ne portent que des étiquettes (`template`, `mode`, `platform`, `result`, `phase`…). Re-vérifiable : `grep -rn "track(" apps/mobile/app apps/mobile/src \| grep -iE "lat\|lng\|h3\|hex"` → 7 hits, **tous des faux positifs** (« temp**lat**e », « p**lat**form »), zéro donnée de position |

**Ce qu'il ne faut PAS déclarer, et pourquoi :**

- **Health (santé)** — *aucune* donnée de santé n'est lue. `SOURCE_ADAPTERS` ne
  contient que `gpx`, `adapters/appleHealth.ts` est un stub `needs_dev_build`,
  et l'entitlement `com.apple.developer.healthkit` n'est pas dans `expo.ios`.
  Déclarer « Health » ouvrirait en plus l'examen renforcé 5.1.3.
  ⚠️ « Fitness » (les pas) et « Health » (FC, poids, historique d'entraînement)
  sont **deux sous-catégories distinctes** du même groupe : on déclare la
  première, pas la seconde.
- **Contacts, Photos, Navigation, Publicité, Achats** — non collectés.
- **Chat / messages** — n'existe pas (cf. §2).

**Points fermes :**

- **Tracking publicitaire : « No ».** Aucun SDK publicitaire, aucun
  AppTrackingTransparency, aucun IDFA (`lib/analytics.ts`).
- La position n'est **jamais** exposée publiquement (agrégation par zone et par rôle).
- **[GATE]** Le label doit correspondre **exactement** au binaire soumis. Une
  divergence label / binaire / politique = rejet 5.1.1 ou retrait après coup.

---

## 4. Mapping guideline → statut

Statuts au 26/07/2026, alignés sur `docs/APP_STORE_CONFORMITE.md`.

| Guideline | Sujet | Statut | Preuve / renvoi |
|---|---|---|---|
| **1.2** | Modération UGC | **[GATE]** blocage effectif + signalement au contact du contenu | B3/B4 de l'audit — vérifier §6.1 (lignes 6 et 7) |
| **1.2** | Contact publié | **BLOQUÉ (O10)** | B2 — §7 |
| **1.4.5** | Sécurité physique | OK avec réserve | Écran de course non manipulable, aucune alerte hors tracé, aucune position live de rival, quiet hours sur les push |
| **2.1** | App complète | OK | Aucune surface démo ; états vides explicites |
| **2.3.1** | Métadonnées non trompeuses | **[GATE]** | Description ↔ `flags.ts` (§1.4) ; notes ↔ binaire (§2) |
| **2.3.3** | Screenshots fidèles | **[GATE]** | Aucune capture d'une surface derrière un drapeau (§1.3) |
| **3.1.1** | Achats intégrés | **OK par absence** | Aucun achat dans ce build ; **ne créer aucun produit IAP** (§6) |
| **4.8** | Sign in with Apple | **OK** | Offert en premier sur iOS, sur les deux portes de création |
| **5.1.1(i)** | Politique de confidentialité — contenu | **OK** | Web recalée le 26/07/2026 (`apps/web/app/confidentialite/page.tsx`) ↔ embarquée (`catalog/legal.ts`) |
| **5.1.1(i)** | Politique de confidentialité — URL | **BLOQUÉ (O10)** | B1 — §7 |
| **5.1.1(ii)** | Purpose strings | **[GATE]** | Aucune chaîne HealthKit, aucune promesse de « zones privées » |
| **5.1.1(v)** | Suppression de compte | **OK** | In-app, 2 entrées, purge cron réelle, grâce 30 j annoncée |
| **5.1.2 / 5.1.3** | Données santé | **SANS OBJET** tant qu'O8 est ouvert | Aucun accès HealthKit / Health Connect : ne rien déclarer, ne rien activer |
| **5.1.5** | Localisation | OK | Position lue pendant la course ; permissions demandées sur geste |

---

## 5. Anti-steering (3.1.1)

**Question :** un écran mobile renvoie-t-il vers un paiement WEB externe pour un
bien numérique ?

**Réponse : NON.** Vérifié le 26/07/2026 — preuves **ré-exécutables** (les
précédentes citaient du code effacé : une fonction `buy()` et un numéro de ligne
qui n'existent plus) :

1. **Aucune ouverture d'URL externe.**
   `grep -rn "Linking\.openURL\|openBrowserAsync\|openAuthSessionAsync" apps/mobile/app apps/mobile/src`
   → **1 seul hit, un commentaire** (`app/support.tsx:30`). Aucun appel réel.
2. **Aucun chemin d'achat.** Aucune bibliothèque d'achat dans
   `apps/mobile/package.json` (ni `react-native-purchases`, ni
   `expo-in-app-purchases`, ni StoreKit) ; `purchase_initiated` /
   `purchase_completed` existent au registre d'events mais ne sont **émis nulle
   part**.
3. **Le déverrouillage est impossible côté serveur** :
   `revoke insert, update, delete on public.user_inventory from anon, authenticated`
   (migration 0014) ; seul chemin d'entitlement = webhook service-role.
4. **Le site `/abonnement` n'encaisse rien et n'est jamais ouvert depuis
   l'app** — aucun checkout n'y est branché (cf. l'en-tête de
   `apps/web/app/abonnement/page.tsx`).

**[GATE] avant chaque soumission** : re-exécuter le grep du point 1. Un futur
`Linking.openURL(...)` vers une page de paiement serait un rejet 3.1.1.

---

## 6. GATE — à exécuter avant « Submit for Review »

**Si une seule ligne échoue, on ne soumet pas.** Les commandes sont à lancer
depuis la racine du dépôt.

### 6.1 Cohérence dossier ↔ binaire (les points que §2 et §3 affirment)

**Les commandes ci-dessous ont été exécutées le 26/07/2026 et rendent le
résultat annoncé.** Elles sont écrites pour être **sans ambiguïté** : un `grep`
large aurait renvoyé les commentaires qui *expliquent* un retrait, et fait
échouer le gate sur son propre correctif.

**Gate 1+2 — purpose strings iOS effectives** (aucune chaîne santé, aucune
promesse de « zones privées »). Cette vérification lit les **deux** endroits qui
alimentent l'Info.plist généré — `expo.ios.infoPlist` et les options de
`expo.plugins` — parce que la valeur du plugin l'emporte à la génération :

```bash
python3 -c "
import json
e=json.load(open('apps/mobile/app.json'))['expo']
eff={k:v for k,v in e['ios'].get('infoPlist',{}).items() if k.startswith('NS')}
for p in e.get('plugins',[]):
    if isinstance(p,list) and len(p)>1 and isinstance(p[1],dict):
        for k,v in p[1].items():
            if 'ermission' in k: eff[p[0]+'.'+k]=v
bad=[k for k,v in eff.items() if isinstance(v,str) and ('Sant' in v or 'ealth' in v or 'zones privées' in v)]
print('\n'.join(' - '+k for k in eff)); print('VIOLATIONS =', bad or 'aucune')"
```

→ attendu : **`VIOLATIONS = aucune`**.

| # | Vérification | Commande / geste | Attendu |
|---|---|---|---|
| 3 | Aucune messagerie | `grep -rn "crew_messages" apps/mobile/app apps/mobile/src packages/ supabase/functions/` | **0 hit** (ne pas ratisser `apps/web` ni `.next` : la politique y *commente* l'absence) |
| 4 | Aucun chemin d'achat externe | `grep -rn "Linking\.openURL\|openBrowserAsync\|openAuthSessionAsync" apps/mobile/app apps/mobile/src` | **1 hit, un commentaire** (`app/support.tsx`) — aucun appel réel |
| 5 | La boutique est bien fermée | `eas env:list --environment production` | `EXPO_PUBLIC_FULL_SURFACE` **absente ou ≠ 1** |
| 5b | Quelles portes de connexion seront **réellement peintes** | même commande | noter si `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` est renseignée. **Aucun fichier du dépôt ne pose ces variables** : c'est l'environnement EAS qui décide, et lui seul. Si Google est configuré, un bouton Google apparaîtra — le §1 des notes reste vrai (il n'énumère pas les fournisseurs), mais le savoir évite de décrire l'écran de travers |
| 6 | Le blocage AGIT | sur appareil : bloquer un joueur depuis le roster, revenir au roster **et** au classement | le joueur bloqué n'est plus affiché comme avant |
| 7 | Le signalement est atteignable | sur appareil : depuis la **ligne** d'un joueur (roster, classement) | une action ouvre { Signaler · Bloquer } **pré-remplie** |

> Les lignes 6 et 7 sont les bloquants **B3** et **B4** de l'audit. Tant qu'elles
> ne passent pas, le §6 du bloc de notes (« Blocking hides the blocked player…»,
> « Report and Block are available from a player's row ») **n'est pas vrai** —
> et ce bloc ne doit pas être collé.

### 6.2 Champs App Store Connect

- [ ] Icône 1024 + assets (§1.2).
- [ ] Screenshots 6,9" — **aucune surface derrière un drapeau** (§1.3).
- [ ] URLs **vivantes** : support, marketing, confidentialité, CGU → **§7 (O10)**.
- [ ] App Privacy renseigné **exactement** comme §3 ; tracking = No.
- [ ] Age Rating re-répondu sur les paliers **actuels** (4+/9+/13+/16+/18+), et
      cohérent avec le gate 16 ans (§1.5).
- [ ] Notes de review collées **après** le gate §6.1, compte de démo traité (§2.1).
- [ ] **AUCUN produit IAP créé** pour ce build. Soumettre des produits qu'un
      binaire n'expose pas fait rejeter les produits.
- [ ] Suppression de compte testable in-app (5.1.1(v)).

---

## 7. Le jour où le domaine existe (O10) — tout en une passe

**B1 et B2 ne peuvent PAS être levés par du code.** Deux champs **obligatoires**
d'App Store Connect (Privacy Policy URL, Support URL) attendent des URL qui
résolvent, et la guideline 1.2 exige « published contact information so users can
easily reach you ». Un `mailto:` vers un domaine non enregistré n'est pas un
contact.

### 7.1 Ce qui a déjà été fait pour que ce jour tienne en une passe

- Les pages légales **existent et sont à jour** : `/confidentialite` (recalée le
  26/07/2026), `/conditions`, `/cgv`, `/mentions-legales`.
- **Plus aucun lien de contact mort dans `apps/web`** : les sept `mailto:` vers
  `privacy@gryd.run` / `support@gryd.run` ont été remplacés par le **courrier au
  siège**, qui est le canal réel et celui que la politique embarquée nomme déjà.
  Vérification : `grep -rn "mailto" apps/web/app` → aucun lien (seulement des
  commentaires d'explication).
- Le canal est centralisé dans **`apps/web/lib/legal.ts`** : le jour où une boîte
  reçoit, on ajoute `SUPPORT_EMAIL` / `PRIVACY_EMAIL` **à un seul endroit**.

### 7.2 [FONDATEUR] Décisions et actions, dans l'ordre

1. **Trancher `gryd.app` vs `gryd.run`.** L'arbitrage traîne dans plusieurs docs.
   Option recommandée ailleurs dans le dépôt : `gryd.app` pour les deep links,
   `gryd.run` pour le site et les e-mails — **mais un seul domaine suffit et
   coûte moins cher en cohérence.**
2. **Acheter le domaine + DNS.**
3. **Héberger `apps/web`** (Vercel / Netlify / Cloudflare — **pas GitHub Pages**,
   qui ne permet pas de forcer le `Content-Type` d'un fichier sans extension,
   requis plus tard pour `apple-app-site-association`).
4. **Créer une boîte `support@` qui REÇOIT** — et la relever.
5. **Compléter les `<Todo>` des mentions légales** : hébergeur du site (nom,
   raison sociale, adresse, téléphone) — obligation LCEN. La page refuse
   déjà d'être publiable tant qu'ils sont là.

### 7.3 La passe de code, une fois le domaine vivant

| # | Où | Quoi |
|---|---|---|
| 1 | `apps/web/lib/legal.ts` | Ajouter `SUPPORT_EMAIL` / `PRIVACY_EMAIL` **et rien d'autre** |
| 2 | `/confidentialite`, `/mentions-legales`, `/cgv`, `/conditions` | Ajouter l'e-mail **à côté** du courrier (ne pas le remplacer : le postal reste vrai) |
| 3 | `apps/web/app/mentions-legales/page.tsx` | Remplacer les `<Todo>` hébergeur |
| 4 | Prose « le site gryd.run » | `grep -rn "gryd\.run\|gryd\.app" apps/web/app` → aligner sur le domaine tranché |
| 5 | `apps/mobile` (**autre chantier**) | `catalog/legal.ts` `contactBody` + `/support` : ajouter le canal e-mail en gardant le postal |
| 6 | Ce document, §1.4 | Renseigner les quatre URL |

**[GATE] Avant de coller une URL dans App Store Connect** : `curl -sI <url>` doit
répondre **200** — pas une redirection vers une page d'attente, pas un 404.

---

## 8. Ce qui reste au fondateur (hors code)

| Point | Ce qu'il bloque | Action |
|---|---|---|
| **O10 — domaine** | **B1, B2** : deux champs obligatoires d'App Store Connect | §7 |
| **Environnement EAS « production »** | Le **seul** chemin par lequel la boutique pourrait apparaître dans un build soumis. Invérifiable depuis le dépôt : aucun fichier ne pose `EXPO_PUBLIC_FULL_SURFACE`. | `eas env:list --environment production` (gate §6.1 ligne 5) |
| **Compte Apple Developer** | Questionnaire d'âge, notes, URL, label, compte de démo | Le dépôt prépare les réponses, la console les enregistre |
| **O3 — RevenueCat / produits IAP** | Rien aujourd'hui (aucun achat dans le build) | **Ne rien créer dans App Store Connect.** Avant d'ouvrir la vente : les 3 manques Schedule 2 (renouvellement + résiliation à l'écran, lien confidentialité au paywall, **Restaurer les achats**), la décision loot box (publier les probabilités ou retirer l'aléatoire), et l'arbitrage anti-pay-to-win des Crew Boosts |
| **O8 — dev build / appareil réel** | Gate §6.1 lignes 6-7, comportement de terminaison OS pendant une course, entitlement Sign in with Apple sur build signé | Un dev build EAS + un test terrain |

---

## Annexe — provenance

- **Audit source** : `docs/APP_STORE_CONFORMITE.md` (26/07/2026) — les 10
  bloquants, leurs preuves `fichier:ligne`, et les 23 points à risque.
- **Guidelines re-vérifiées le 26/07/2026** sur
  `developer.apple.com/app-store/review/guidelines/` (1.2, 1.4.5, 2.1(a), 2.3.1,
  2.3.3, 3.1.1, 4.8, 5.1.1(i)(ii)(v), 5.1.2, 5.1.3, 5.1.5) et les paliers d'âge
  sur `developer.apple.com/help/app-store-connect/reference/age-ratings`.
- **Ce que ce document n'affirme PAS**, faute de pouvoir le vérifier depuis le
  dépôt : le contenu réel de la fiche App Store Connect, l'état DNS de
  `gryd.run` / `gryd.app`, le contenu de l'environnement EAS « production », et
  le comportement d'un build EAS signé sur appareil.
