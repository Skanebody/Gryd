# GRYD — Conformité App Store Review Guidelines

**Constat au 26/07/2026.** Audit en LECTURE SEULE, quatre domaines (permissions/localisation/batterie · vie privée/suppression de compte/santé · achats/abonnement · contenu utilisateur/connexion). Aucun fichier de l'app modifié : ce document est le seul écrit.

**Règle de lecture.** Chaque affirmation porte sa preuve `fichier:ligne`. Trois niveaux, jamais confondus :

| Niveau | Signification |
|---|---|
| **BLOQUANT** | Rejet quasi certain, ou champ de soumission impossible à remplir. |
| **À RISQUE** | Dépend du reviewer, de son parcours, ou d'un chantier futur. Ce n'est pas un rejet. |
| **CONFORME** | Déjà fait, preuve à l'appui. **À ne pas refaire.** |

Les formulations Apple citées ont été re-vérifiées le 26/07/2026 sur `developer.apple.com/app-store/review/guidelines/` et `developer.apple.com/help/app-store-connect/reference/age-ratings` — pas de mémoire.

---

## 0. État d'exécution (ajouté après coup — le constat ci-dessous n'est pas réécrit)

> **Ce document reste le CONSTAT du 26/07/2026 et ne se réécrit pas.** Cette
> section n'ajoute qu'un état d'avancement, pour qu'un lecteur ne re-livre pas un
> correctif déjà appliqué. Chaque « levé » porte sa preuve exécutable.

| Bloquant | État | Preuve |
|---|---|---|
| **B7** — la politique WEB déclare une collecte HealthKit | **LEVÉ** (26/07) | `apps/web/app/confidentialite/page.tsx` : section 05 réécrite en « Géolocalisation, mouvement — et aucune donnée de santé », ligne de tableau et entrée de sommaire supprimées. Le fichier ne déclare plus aucune collecte santé — il énonce son absence. |
| **B8** — la politique WEB déclare un chat de crew | **LEVÉ** (26/07) | Même fichier : « messages de chat de crew… réactions » → pseudo, nom de crew, **signaux à vocabulaire fermé**, signalements. Ligne de tableau « Contenu de crew — chat » remplacée par « Signaux de crew » + « Signalements ». |
| **B9** — le dossier prescrit un label déclarant HealthKit | **LEVÉ** (26/07) | `GRYD_APPSTORE_CHECKLIST.md` §3 : label réécrit, une preuve de code par ligne, « Fitness » (pas) distingué de « Health » (jamais déclaré) ; §4 passe 5.1.2/5.1.3 en « SANS OBJET tant qu'O8 est ouvert ». |
| **B10** — les notes de review décrivent une app qui n'existe plus | **LEVÉ** (26/07) | `GRYD_APPSTORE_CHECKLIST.md` §2 : bloc réécrit sur le binaire réel (aucun IAP, aucun mode démo, **compte requis**), avec le tableau de ce qui a été retiré et pourquoi. §2.1 traite le compte de démonstration **sans inventer d'identifiants**. |
| **B1 / B2** — URL et contact publiés | **NON LEVÉS — impossibles par du code** | Dépendent de l'achat du domaine (O10). Préparés en une passe : `GRYD_APPSTORE_CHECKLIST.md` §7. Ce qui pouvait l'être l'a été : **les sept `mailto:` morts d'`apps/web` sont remplacés** par le courrier au siège, canal réel et identique à celui de la politique embarquée (`apps/web/lib/legal.ts`). |

**Correction mineure au constat.** B1 cite « quatre `mailto:privacy@gryd.run` »
en `page.tsx:124,405,434,456` : il y avait **trois** `mailto:` (`:124`, `:434`,
`:456`) et une quatrième occurrence de l'adresse en gras (`:405`), sans lien. Le
fond est inchangé — les quatre sont traitées.

---

## 1. Verdict

1. **L'app n'est pas soumettable aujourd'hui** — mais l'obstacle principal n'est pas le code : sur 10 bloquants, **6 sont des textes à corriger** (purpose strings, politique web, notes de review), **2 sont du code court** (blocage et signalement, guideline 1.2), et **2 dépendent d'un achat de domaine** (O10, hors code).
2. **Le fond est solide et le chantier AMENDEMENT-33 a réellement produit.** Suppression de compte in-app + purge cron réelle, export RGPD, Sign in with Apple, modération serveur du nom de crew, permissions progressives demandées sur geste, aucun bouton d'achat qui déverrouille hors IAP, aucune donnée de santé lue. Ces points sont **conformes et prouvés** — §4.
3. **Le risque le plus élevé vient de ce que le dossier RACONTE, pas de ce que le binaire FAIT** : les notes de review promettent des achats « en démo qui révèlent l'item sans débiter » et un mode démo supprimé depuis le 21/07/2026 ; la politique web déclare une collecte HealthKit et un chat de crew qui n'existent nulle part. Un reviewer lit ces textes avant d'ouvrir l'app.

---

## 2. BLOQUANTS (10)

### B1 · 5.1.1(i) — L'URL de politique de confidentialité pointe sur un domaine non possédé

**Constat.** L'URL déclarée à App Store Connect est `https://gryd.run/confidentialite`, sur un domaine que l'entité n'a pas acquis. Le même document donne `privacy@gryd.run` comme seul canal d'exercice des droits — même domaine, donc même boîte inexistante.

**Preuve.** `GRYD_APPSTORE_CHECKLIST.md:72` (« URL politique de confidentialité | https://gryd.run/confidentialite ») et `:75` (« Les hôtes gryd.run sont **à réserver / configurer** ») · `apps/web/app/confidentialite/page.tsx:124`, `:405`, `:434`, `:456` (quatre `mailto:privacy@gryd.run`) · `.claude/orchestration-klaim/DISCOVERY.md:53-54` (O10 toujours ouvert) · `apps/mobile/app.json:19` (« déclarer un domaine qu'on ne possède pas… »). Contre-preuve interne, qui montre que le repo connaît la règle : `apps/mobile/app/parametres/[section].tsx:693-698` assume « jamais un domaine public inexistant (fini openLegal → gryd.run/*) ».

**Ce que le reviewer voit.** Il clique le lien du champ « Privacy Policy URL » — obligatoire — et n'obtient rien. Rejet avant la revue fonctionnelle. Et « describe how a user can revoke consent and/or request deletion » n'est pas satisfait : l'adresse indiquée n'existe pas.

**Correctif minimal.** Acquérir + déployer le domaine (`apps/web/app/confidentialite/page.tsx` est prêt) AVANT de renseigner l'URL. À défaut : pointer sur un hébergement réellement en ligne et remplacer les `privacy@gryd.run` par le canal qui fonctionne côté mobile — le courrier au siège (`apps/mobile/src/i18n/catalog/legal.ts:66-73`). **Dépend d'O10 — voir §6.**

---

### B2 · 1.2 (4ᵉ puce : « published contact information so users can easily reach you ») — Aucun contact joignable publié

**Constat.** `/support` dit noir sur blanc qu'écrire au support « n'est pas possible depuis l'app ». Le seul contact publié est une adresse **postale**. Les e-mails n'existent que dans `apps/web`, sur `gryd.run` — non acquis. Un `mailto:` vers un domaine non enregistré n'est pas un contact.

**Preuve.** `apps/mobile/app/support.tsx:184-187` (card « absence » puis renvoi `/a-propos`, aucun `mailto:`) · `apps/mobile/src/i18n/catalog/reglages.ts:1684` (« … écrire au support n'est pas possible depuis l'app : ces remontées n'ont pas de destination. Le seul contact publié est l'adresse du siège ») · `apps/mobile/src/i18n/catalog/legal.ts:233-239` (`contactBody` = courrier) · `apps/web/app/mentions-legales/page.tsx:135`, `:208-209` et `apps/web/app/cgv/page.tsx:164` (`mailto:support@gryd.run`) · `GRYD_APPSTORE_CHECKLIST.md:70` (« URL de support : https://gryd.run/support *(à publier)* »).

**Ce que le reviewer voit.** Double blocage. En revue 1.2, aucun canal pour joindre l'éditeur au sujet d'un signalement. À la soumission, le champ obligatoire « Support URL » ne peut pas être rempli par une URL qui résout.

**Correctif minimal.** Trancher O10, publier une page de support réelle et une boîte `support@` qui reçoit, puis renseigner l'URL de support et ajouter le contact e-mail dans `/support` + `contactBody` (en gardant l'adresse postale). **Dépend d'O10 — voir §6.**

---

### B3 · 1.2 (3ᵉ puce : « the ability to block abusive users ») — Le blocage n'a aucun effet

**Constat.** `blockMember()` écrit bien la ligne locale et `user_blocks`, mais le prédicat `isBlocked()` **n'a aucun appelant** et aucune requête serveur ne filtre sur `user_blocks`. Les deux seules surfaces qui affichent le pseudo d'un autre joueur — roster crew et classement — ne consultent jamais la liste. Bloquer ne fait disparaître personne. La copie affirme l'inverse, en cinq langues.

**Preuve.** `apps/mobile/src/features/crew/moderation.ts:322` (`export function isBlocked`) — vérifié : `grep -rn "isBlocked" apps/mobile/src apps/mobile/app` ne renvoie que la définition et un commentaire (`moderation.ts:358`) · `grep -rn "user_blocks" supabase/` → la table n'est lue QUE par `supabase/functions/export_account/index.ts:54` (export RGPD) ; sinon elle n'existe qu'en migration `supabase/migrations/0029_moderation.sql:15-30` · surfaces non filtrées : `apps/mobile/src/features/crew/RealCrewScreen.tsx:1026-1028` (`{m.pseudo}`) et `apps/mobile/src/features/social/leagueBoard.ts:194,209` · copie contredite : `apps/mobile/src/i18n/catalog/reglages.ts:1139` (« Bloquer masque immédiatement ce joueur **partout où GRYD l'afficherait** ») et `:1857` (même promesse).

**Ce que le reviewer voit.** Il bloque le compte de test depuis Réglages > Confidentialité, revient sur le roster ou le classement, et le joueur est toujours là. Rejet 1.2 — aggravé par la promesse écrite dans l'app. C'est aussi une violation frontale de « l'app ne ment jamais ».

**Correctif minimal.** Faire consommer `isBlocked()` par les deux surfaces (roster `RealCrewScreen.tsx` vue `members`, lignes de classement), avec un libellé « Joueur bloqué » plutôt qu'une disparition muette. Tant que ce n'est pas fait, corriger `reglages.ts:1139` et `:1857` pour ne décrire que ce qui agit.

---

### B4 · 1.2 (2ᵉ puce : « a mechanism to report offensive content ») — Aucun signalement au contact du contenu

**Constat.** L'unique chemin est Profil → Confidentialité → dépli « Blocage & signalement » → **saisir à la main le pseudo exact** → motif → Signaler. Les deux surfaces qui exposent un autre joueur ne portent aucune affordance : la ligne de roster est une `View` sans `onPress`, les lignes de classement non plus. Le pseudo à retaper est un identifiant machine (`runner_` + 12 hex) affiché tronqué.

**Preuve.** Point unique : `apps/mobile/app/confidentialite.tsx:402-434` (TextInput pseudo + pills motif + bouton) et `:210-220` (`submitReport` refuse si le champ est vide) · roster non interactif : `apps/mobile/src/features/crew/RealCrewScreen.tsx:1020-1023` (`<View key={m.userId} …>`, aucun `onPress`) et `:1026-1028` (`numberOfLines={1}`) · format du pseudo : `supabase/migrations/0028_provision_user_on_signup.sql:26-30` (`'runner_' || substr(replace(new.id::text,'-',''),1,12)`) · la copie assume elle-même le détour : `reglages.ts:1837-1839`.

**Ce que le reviewer voit.** Il ouvre le roster, cherche un appui long / un « … » / un « Signaler » sur la ligne d'un joueur, ne trouve rien, et conclut à l'absence du mécanisme exigé. Un formulaire situé cinq niveaux plus loin, où il faut retaper un identifiant tronqué, ne satisfait pas la puce.

**Correctif minimal.** Sur la ligne du roster et la ligne de classement, une action « … » ouvrant une feuille { Signaler · Bloquer } **pré-remplie** avec le pseudo de la ligne, appelant les `reportContent` / `blockMember` déjà branchés. Le formulaire de Confidentialité reste en repli.

---

### B5 · 5.1.1(ii) — `NSHealthShareUsageDescription` déclarée sans aucun code HealthKit, et démentie par la politique du même build

**Constat.** La chaîne d'usage HealthKit est dans l'Info.plist alors qu'aucun code ne peut lire HealthKit : pas d'entitlement `com.apple.developer.healthkit` sous `expo.ios` (il n'existe qu'en gabarit commenté `_healthkit_o8`), registre d'adaptateurs limité à `gpx`, adaptateur Apple Health = stub. Et la politique **embarquée dans le même binaire** affirme le contraire mot pour mot.

**Preuve.** `apps/mobile/app.json:64` (`"NSHealthShareUsageDescription": "GRYD peut importer tes courses depuis Apple Santé…"`) · `apps/mobile/app.json:4-16` (bloc `_healthkit_o8`, l'entitlement `:15` n'est jamais sous `expo.ios`) · `apps/mobile/src/features/sources/adapters/registry.ts:20-23` (`SOURCE_ADAPTERS = { gpx: gpxAdapter }`) · `apps/mobile/src/features/sources/adapters/appleHealth.ts:22-26` (`status: 'needs_dev_build'`, `detail: 'Dev build requis — O8'`) · démenti interne : `apps/mobile/src/i18n/catalog/legal.ts:451` (« GRYD n'importe AUCUNE donnée de santé : l'application n'est connectée ni à Apple Santé (HealthKit) ni à Google Health Connect »).

**Ce que le reviewer voit.** App Store Connect expose les usage descriptions du binaire, et le questionnaire App Privacy interroge séparément « Santé et forme ». Il voit une chaîne santé sans fonctionnalité santé, et l'app fournit elle-même la preuve de la contradiction dans son écran Confidentialité. Risque aggravé : la santé est la catégorie la plus scrutée (5.1.3).

**Correctif minimal.** Retirer la ligne `app.json:64`. Le gabarit `_healthkit_o8` conserve déjà la chaîne pour le jour où HealthKit sera branché : rien n'est perdu. Ne pas déclarer la catégorie Santé dans l'App Privacy tant que l'adaptateur est un stub.

---

### B6 · 5.1.1(ii) — La purpose string « Toujours » promet des « zones privées » qui n'existent pas

**Constat.** « Ta position n'est jamais suivie en dehors d'une course, **et jamais dans tes zones privées**. » La seconde moitié n'a aucune implémentation côté client : les préférences de confidentialité ne comportent plus que `profileVisibility` et `maskEndpoints`, aucun écran ne permet de déclarer un lieu, et le serveur — qui SAIT lire `privacy_zones` — bloquerait de toute façon le CLAIM, pas l'enregistrement du point GPS.

**Preuve.** `apps/mobile/app.json:62` **et** `apps/mobile/app.json:102` (même phrase, dupliquée dans `infoPlist` et dans le plugin expo-location) · `apps/mobile/src/features/privacy/prefs.ts:52-62` (l'interface ne porte plus que deux champs ; l'en-tête `:6-21` documente la suppression des dix autres, « aucun écran ne permet de déclarer une adresse ») · `apps/mobile/app/confidentialite.tsx:16-23` (retrait assumé du trio rayon de flou / domicile / travail) · `apps/mobile/src/features/run/gps/tracker.ts:146-153` (`addFixes` n'écarte que les timestamps non croissants — aucun filtre géographique).

**Ce que le reviewer voit.** Il lit la boîte de dialogue « Toujours » au moment de tester une course. La phrase annonce une garantie que rien dans l'app ne permet de configurer ni d'observer. C'est exactement le cas visé par « Ensure your purpose strings clearly and completely describe your use of the data » (5.1.1(ii), vérifié le 26/07/2026). Surexposition dérivée à 2.3.1 si la fonction est cherchée et introuvable.

**Correctif minimal.** Supprimer « , et jamais dans tes zones privées » **aux deux endroits** (`app.json:62` ET `app.json:102`). Modifier un seul des deux ne sert à rien : `applyPermissions` donne la priorité à la valeur du plugin (`node_modules/@expo/config-plugins/build/ios/Permissions.js`). Garder la première moitié, qui est vraie — sous réserve du point À RISQUE R1 ci-dessous.

---

### B7 · 5.1.1(i) — La politique WEB déclare une collecte HealthKit impossible dans le binaire

**Constat.** La politique qui sera derrière l'URL App Store Connect consacre une section entière à HealthKit, une ligne de tableau, une entrée de sommaire et une base légale « consentement explicite (art. 6.1.a & 9.2.a) » à un traitement qui n'a jamais lieu.

**Preuve.** `apps/web/app/confidentialite/page.tsx:41` (sommaire « Santé, mouvement & HealthKit »), `:160-164` (« Santé importée (optionnelle) : … depuis Apple Santé / HealthKit »), `:253` (ligne de tableau), `:281-306` (section 05 entière) · absence réelle : `registry.ts:20-23`, `appleHealth.ts:22-26`, `app.json:4-16` (cf. B5).

**Ce que le reviewer voit.** 5.1.1(i) exige « Identify what data, if any, the app/service collects ». Sur une app Health & Fitness, il probe la permission Santé annoncée, ne la trouve nulle part, et remonte l'écart politique↔binaire. Une politique qui **sur**-déclare est inexacte au même titre qu'une politique qui cache.

**Correctif minimal.** Aligner la politique web sur ce qui a **déjà été fait côté mobile** : supprimer `:160-164`, `:253`, `:281-306`, `:41` et les remplacer par l'énoncé d'absence + le mouvement/podomètre réel — le texte exact existe en `apps/mobile/src/i18n/catalog/legal.ts:451`.

---

### B8 · 5.1.1(i) — La politique WEB déclare un chat de crew qui n'existe pas

**Constat.** Le document annonce collecter des « messages de chat de crew » et des « réactions », et fonde un traitement « Contenu de crew » sur le chat. Il n'y a aucune messagerie : aucun écran, aucune route, aucun code client ne lit ni n'écrit `crew_messages`.

**Preuve.** `apps/web/app/confidentialite/page.tsx:166-167` (« messages de chat de crew, noms de crew, réactions ») et `:262` · absence réelle : `grep -rn crew_messages` sur `apps/` + `packages/` + `supabase/functions/` → **aucun résultat applicatif** ; la table n'existe qu'en migration `supabase/migrations/0019_crew_social.sql:8` · le vocabulaire fermé qui la remplace : `apps/mobile/app/legal/confidentialite.tsx:20-22`, texte mobile « il n'y a pas de messagerie libre » (`legal.ts:419`).

**Ce que le reviewer voit.** Deuxième inexactitude du document qu'il lit. Effet de bord 1.2 : déclarer de l'UGC de type chat appelle les obligations de filtrage/signalement/blocage sur une surface qui n'existe pas — il cherchera le chat et ses outils de modération.

**Correctif minimal.** Réécrire `:166-167` et `:262` sur le modèle mobile déjà validé (pseudo, nom de crew, signaux à vocabulaire fermé, signalements) — source : `legal.ts:419` et `:432`.

---

### B9 · 5.1.1(i) — Le dossier prescrit un App Privacy label qui déclare HealthKit

**Constat.** Le document de soumission demande de déclarer, dans le nutrition label, des données de santé « FC/allure via HealthKit », et classe 5.1.2/5.1.3 en « à activer (O8) ». Suivre la consigne produit un label affirmant une collecte absente du binaire soumis.

**Preuve.** `GRYD_APPSTORE_CHECKLIST.md:139` (« Santé & fitness (pas / podomètre, et FC/allure via HealthKit à O8) | Health & Fitness | App Functionality ») et `:163` (« 5.1.2 / 5.1.3 | Données santé (HealthKit) | À activer (O8) ») · binaire : cf. B5.

**Ce que le reviewer voit.** Un label déclarant une catégorie que le binaire ne peut pas collecter est l'un des écarts les plus systématiquement relevés. Rejet avec demande de mise en cohérence label / binaire / politique.

**Correctif minimal.** Corriger `:139` pour ne déclarer que le réel — pas/podomètre (`step_count`, lu par expo-sensors, `apps/mobile/src/features/run/gps/useRealRunCore.ts:507`) — et retirer HealthKit du label tant que l'entitlement n'est pas dans le build. Marquer `:163` « sans objet tant qu'O8 est ouvert ».

---

### B10 · 3.1.1 (+ 2.3.1 / 2.1(a)) — Les notes de review décrivent une app qui n'existe pas, et décrivent un mécanisme que 3.1.1 interdit

**Constat.** Le fait d'abord : **le paiement n'est pas câblé et l'app ne vend rien** — aucune lib d'achat en dépendance, `grantLocalItem()`/`spendEclats()` supprimés à la source, boutique masquée par drapeau. Mais le bloc « Notes de review pour Apple » à coller dans App Review Information affirme le contraire : « Digital goods (cosmetics, GRYD Club, Founder Pack) are purchased IN-APP via Apple In-App Purchase. […] IAP wiring is being finalized via RevenueCat; **purchase flows currently reveal the item in a demo state and do not charge.** » Le même bloc déclare aussi que « the onboarding capture and map are wired in **DEMO mode** » — mode supprimé le 21/07/2026 (AMENDEMENT-47). Et la section « preuves » du dossier cite du code effacé.

**Preuve.** `GRYD_APPSTORE_CHECKLIST.md:104-108` (bloc GPS/DEMO) et `:110-115` (bloc IN-APP PURCHASES), `:180` et `:182` (preuves périmées : « `buy()`, ligne ~141 », « sections.ts ligne 77-82 »), `:197-198` (cases à cocher) · réfutation par le code : `apps/mobile/package.json` — aucune lib d'achat (vérifié : ni `react-native-purchases`, ni `expo-in-app-purchases`, ni StoreKit) ; `apps/mobile/src/features/arsenal/inventory.ts:251-277` (fonctions d'octroi retirées de l'interface) ; `apps/mobile/app/arsenal.tsx:636-659` (le CTA d'achat est une `View` non pressable) ; `apps/mobile/src/features/arsenal/ShopGridCard.tsx:19-21` (« AUCUN BOUTON ») ; `grep purchase_initiated|purchase_completed apps/mobile` → 0 émission ; `apps/mobile/src/lib/flags.ts:17-50` (fin du mode démo).

**Ce que le reviewer voit.** Il lit les notes **avant** d'ouvrir l'app. Il y lit une déclaration de déverrouillage hors IAP — « reveal the item […] and do not charge » se lit mot pour mot comme le mécanisme interdit par « Apps may not use their own mechanisms to unlock content or functionality » — puis il ne trouve dans le binaire ni boutique, ni paywall, ni produit IAP. Rejet 3.1.1, ou 2.3.1 / 2.1(a) (« placeholder text […] should be scrubbed before submission »). Dans les deux cas, le rejet vient du texte fourni, pas du code.

**Correctif minimal.** Réécrire le bloc entier des notes de review pour décrire le build réel. Pour les achats, une phrase suffit : « This build contains no in-app purchases and no subscription. The store and paywall surface is not included in this build. » Supprimer RevenueCat/démo et la mention DEMO mode du bloc GPS. Réécrire §5 sur des preuves vivantes. Et **ne déclarer aucun produit IAP dans App Store Connect pour ce build** (`:198`) : soumettre des produits qu'un binaire n'expose pas fait rejeter les produits.

---

## 3. À RISQUE (ne pas dramatiser — ce ne sont pas des rejets)

### Permissions, batterie, arrière-plan

- **R1 · 2.4.2 + 5.1.1(ii) — Le suivi arrière-plan n'est jamais arrêté si l'app est tuée pendant une course.** `stopLocationUpdatesAsync` n'a **qu'un seul appelant** dans tout le dépôt (`apps/mobile/src/features/run/gps/provider.ts:197`, via `stopBackgroundUpdates`), lui-même appelé uniquement par `stopSensors()` (`useRealRunCore.ts:192-200`) — donc en fin de course (`:442`) ou au démontage (`:290`). Vérifié : `grep -rn "stopLocationUpdatesAsync|hasStartedLocationUpdatesAsync" apps/mobile` → 3 hits, tous dans `provider.ts:173/196/197`. Si l'OS termine le process en course, la tâche headless continue d'échantillonner en `Accuracy.BestForNavigation`, `distanceInterval: 0`, `pausesUpdatesAutomatically: false` (`provider.ts:174-182`) et empile sans plafond dans AsyncStorage (`runStore.ts:119-127`) — le commentaire de `arsenal/runGuard.ts:6-8` acte lui-même que le buffer « y reste des heures ou des jours ». **Contredit `app.json:62` et `legal.ts:419`.** Correctif : appeler `stopBackgroundUpdates()` au démarrage quand aucun buffer n'est vivant (`isRunLive` existe, `runGuard.ts:55`) et borner `BG_FIXES_KEY`.
- **R2 · 5.1.1(ii) — Deux `NSMotionUsageDescription` divergentes, et c'est la moins auditée qui gagne.** `app.json:63` vs `app.json:111` (plugin expo-sensors). `applyPermissions` fait gagner la valeur du plugin : `app.json:63` est du code mort, donc toute revue qui le lit audite un texte que l'utilisateur ne verra jamais. Aucune des deux n'est fausse. Correctif : une seule source.
- **R3 · 5.1.1(ii) / ITMS-90683 — `expo-media-library` installé, lie Photos/PhotosUI, appelé nulle part.** `apps/mobile/package.json:34` (`"expo-media-library": "~17.0.6"`) ; `node_modules/expo-media-library/ios/*.podspec:18` (`s.frameworks = 'Photos','PhotosUI'`). Autolinké donc présent dans le binaire, mais son plugin n'est pas dans `expo.plugins` — `NSPhotoLibraryAddUsageDescription` n'est jamais ajoutée. Côté code : un seul hit, un **commentaire** (`apps/mobile/app/partage.tsx:58`). Correctif : désinstaller la dépendance — plus sûr qu'ajouter une purpose string pour une capacité inutilisée.
- **R4 · 1.4.5 — Urgence sous l'heure affichée en clair.** `cmDefendGapSoonOne` / `cmDefendGapSoonN` (`apps/mobile/src/i18n/catalog/crew.ts:290-302`) à côté d'un CTA « Je défends ce soir » (`crew.ts:436`). Atténuation réelle : c'est de l'affichage in-app, **jamais un push** — le seul push d'expiration est le J-3 avec quiet hours 21h-8h locales (`supabase/functions/decay_job/index.ts:220-222`, `_shared/push.ts:13,77-78`). Correctif proportionné : arrondir au dernier palier horaire, ou accompagner de la phrase de sécurité déjà écrite.
- **R5 · 1.4.5 — Aucun rappel de sécurité sur le chemin de la course.** Le texte existe et il est bon (`apps/mobile/src/i18n/catalog/reglages.ts:1817-1819`), mais son unique consommateur est le Code de conduite (`apps/mobile/app/code-conduite.tsx:75`). Vérifié : ni `RunPreflight.tsx` (182 l., lu en entier), ni `RealCourseLive.tsx`, ni `course-live.tsx` n'affichent quoi que ce soit. Le reviewer d'un jeu de conquête urbaine qui cherche la mention 1.4.5 ne la trouvera pas là où il regarde. Correctif : une ligne grise sous le décompte du préflight, à la première course seulement.
- **R6 · 5.1.1(ii) — La politique nomme un retrait de consentement qui n'existe pas et omet celui qui existe.** `apps/mobile/src/i18n/catalog/legal.ts:481` : « Retrait du consentement : couper à tout moment l'accès santé ou les notifications. » L'accès santé n'existe pas (B5) et la **localisation**, seule donnée sensible réellement collectée, n'est pas citée. Atténuation : le chemin OS existe là où il est utile (`apps/mobile/app/course-live.tsx:162-164`, `Linking.openSettings()`). Correctif : remplacer « l'accès santé » par « ta position, dans les Réglages de ton téléphone » et ajouter une ligne correspondante dans l'écran Confidentialité.

### Vie privée, comptes, santé

- **R7 · 5.1.1(ii) — Aucun opt-out in-app de la mesure d'audience.** `track()`/`screen()` partent dès que `EXPO_PUBLIC_POSTHOG_KEY` est renseignée (`apps/mobile/src/lib/analytics.ts:73`, `:96-120`) ; aucune clé d'opt-out dans `PrivacyPrefs` (`prefs.ts:48-59`). Le fondement « intérêt légitime » (`legal.ts:432`) est admis sous RGPD, mais le droit d'opposition doit rester exerçable.
- **R8 · 5.1.1(v) — La suppression n'appelle pas la REST API « Revoke Tokens » de Sign in with Apple.** Aucun `revoke` ni `appleid.apple.com` dans `supabase/functions/delete_account/index.ts` ; la purge est du SQL exécuté par pg_cron (`supabase/migrations/0046_account_deletion_grace.sql:267`, `:316`), structurellement incapable d'un appel HTTP. Apple écrit « **should** use the Sign in with Apple REST API » — d'où le classement à risque. Correctif : révoquer au moment de la DEMANDE, où le JWT est disponible.
- **R9 · 5.1.1(i) — La politique embarquée annonce des tracés conservés qui ne le sont pas.** `legal.ts:476` (« Tracés de course : conservés avec ton compte… ») alors que `runs.polyline_masked` (`0002_schema.sql:107`) n'est jamais écrite par `ingest_run` ni décodée par le client. Conséquence dérivée : l'export RGPD ne peut restituer aucun tracé.
- **R10 · 5.1.1(i) — Divergences politique web ↔ politique embarquée.** Le web déclare le paiement Apple IAP comme un traitement **en cours** (`apps/web/app/confidentialite/page.tsx:335-336`) alors que le corpus embarqué affirme qu'aucun paiement n'est encaissé (`legal.ts:465`) ; le web ne cite pas Google comme fournisseur d'auth, n'a aucune section transferts hors UE (`legal.ts:471-472`), et décrit la suppression sans le délai de grâce de 30 jours ni le fait qu'une reconnexion l'annule (`page.tsx:388-393` vs comportement réel `0046:194-241`).
- **R11 · Hygiène de données — `crew_messages` existe toujours en base**, avec RLS et publication realtime (`0019_crew_social.sql:8-17,175-179` ; `0020_crew_realtime.sql:7,27`), sans aucun code applicatif. Tant qu'elle est vide et inaccessible côté client, la politique embarquée reste vraie ; le jour où quelque chose y écrit, « il n'y a pas de messagerie libre » devient faux et les obligations 1.2 s'ouvrent.

### Contenu utilisateur, sanctions, connexion, rating

- **R12 · 1.2 — Sanctions promises, inexistantes.** `reglages.ts:1870` promet « Contenu retiré, avertissement, puis suspension du compte en cas de récidive ». Or `admin_resolve_report` ne fait que changer une colonne de statut (`0046:374-389`) et `grep -rnE "is_banned|ban_until|suspend" supabase/migrations supabase/functions` → **aucun résultat**. Le dispositif est déclaratif.
- **R13 · 1.2(a) — Trois colonnes de texte librement écrivables, sans filtre serveur.** `grant update (pseudo, city_id) … to authenticated` (`0003_rls.sql:40`) et `grant insert/update (… display_name, … bio …)` (`0011_social.sql:179-184`), sans CHECK ni trigger — alors que le nom de crew, lui, est verrouillé par trigger (`0050:546-549`). Aujourd'hui aucune UI n'écrit ces champs (`profileStore` est 100 % AsyncStorage, `profileStore.ts:6-10`) : le trou est **latent**, pas visible. Il devient bloquant le jour où l'édition de profil est branchée au serveur.
- **R14 · 4.8 / « aucun bouton mort » — deux règles de capacité divergentes.** `apps/mobile/app/(auth)/sign-in.tsx:154` peint le bouton Apple sur `CAN_APPLE = Platform.OS === 'ios'` (déduction statique), alors que `src/lib/auth.ts:89` expose `isAppleAuthAvailable()` (probe runtime) et que l'onboarding l'utilise correctement (`AppleButton.tsx:41`). Le plugin est bien déclaré (`app.json:121`), donc l'entitlement sera dans le build : le risque est un bouton système peint puis échouant à 100 % si le profil de provisionnement est mal généré.
- **R15 · Classement d'âge — la valeur visée n'existe plus.** `GRYD_APPSTORE_CHECKLIST.md:69`, `:83`, `:196` visent « 12+ ». Vérifié le 26/07/2026 sur `developer.apple.com/help/app-store-connect/reference/age-ratings` : les paliers actuels sont **4+, 9+, 13+, 16+, 18+** (et Unrated) — 12+ et 17+ ont été supprimés. Le questionnaire est à re-répondre.
- **R16 · Cohérence gate ↔ rating.** L'app impose **16 ans** au point de création (`reglages.ts:1326-1327`, gate rendu par `sign-in.tsx:282-304`). Déclarer un rating inférieur à 16+ tout en refusant les moins de 16 ans est une incohérence relevable ; à aligner ou à expliquer dans les notes (motif RGPD mineurs).
- **R17 · 5.1.1(v) — Compte obligatoire pour tout usage.** `apps/mobile/app/(tabs)/_layout.tsx:70-79` redirige vers `/sign-in` dès qu'un backend est configuré sans session. Défendable au titre des « significant account-based features » (claim serveur, crews, classements), mais à justifier explicitement dans les notes avec un compte de démonstration.

### Achats — ce qui devient exigible le jour où le drapeau s'ouvre

- **R18 · Le drapeau, et la seule chose invérifiable depuis le repo.** `flags.arsenal = EXPO_PUBLIC_FULL_SURFACE === '1'` (`apps/mobile/src/lib/flags.ts:15`, `:58`) ; garde de route `if (!flags.arsenal) return <Redirect href="/" />` (`arsenal.tsx:146`) ; les trois entrées sont gatées par le même booléen (`profil-edit.tsx:712`, `performance.tsx:417`, `settings/sections.ts:116-125`). **Aucun fichier du repo ne pose la variable** (vérifié : les 7 occurrences sont en doc ou dans `flags.ts`, aucune assignation ; `apps/mobile/.env` et `apps/mobile/eas.json` n'en contiennent pas). **Réserve à lever avant soumission :** les `EXPO_PUBLIC_*` peuvent aussi vivre dans l'environnement EAS « production » côté serveur Expo — invérifiable ici. À contrôler (`eas env:list --environment production`) : si `EXPO_PUBLIC_FULL_SURFACE=1` y traîne, tous les points ci-dessous deviennent actifs d'un seul build.
- **R19 · 3.1.2(c) + Schedule 2 — les six exigences, si le paywall devenait visible** (`arsenal.tsx:437-500`) : ① prix **présent** (`:466-483` → `shop.ts:155-160` → `game-rules.ts:1773-1775`) · ② durée de période **présente** · ③ renouvellement automatique + comment résilier **ABSENT de l'écran** (n'existe que dans les CGV, `legal.ts:602-606`) · ④ lien conditions **présent** (`:487-497` → `/legal/cgv`) · ⑤ lien politique de confidentialité **ABSENT** du bloc Premium · ⑥ **Restaurer les achats ABSENT** — assumé et documenté (`arsenal.tsx:33`, `:430`), aucune implémentation. Aujourd'hui cette absence est **cohérente** (rien ne se vend ; un bouton mort serait pire) : c'est la liste des 3 manques à livrer avant d'ouvrir le drapeau, pas un défaut actuel.
- **R20 · 3.1.1 loot box.** L'en-tête d'`arsenal.tsx:66` affirme « aucune loot box », mais le catalogue contient `crew_cosmetic_chest` — « Coffre cosmétique crew », « Récompenses cosmétiques **aléatoires** pour le crew » (`catalog.ts:346-357`), non exclu de la grille (`shop.ts:117-125`). Aucune probabilité affichée. Non bloquant tant que rien n'est achetable et que le drapeau est fermé ; bloquant le jour de l'IAP (« must disclose the odds […] prior to purchase »). Deux issues : publier les probabilités, ou retirer l'aléatoire.
- **R21 · 3.1.1 crédits.** Les packs d'Éclats n'ont aucune règle d'expiration (`catalog.ts:150-203`) — bon point, à ne pas introduire. Mais « you should make sure you have a restore mechanism » reste non satisfait (cf. R19 ⑥).
- **R22 · 2.3.1 — surface dormante.** Boutique, catalogue tarifé et paywall sont dans l'arbre du bundle derrière un seul booléen. Atténuation vérifiable : les `EXPO_PUBLIC_*` sont **inlinées par Metro**, la surface n'est donc pas activable à distance après review — il faut un nouveau build (`flags.ts:10-13`). Recommandation : le **dire** en une ligne dans les notes plutôt que le taire.
- **R23 · Anti-pay-to-win (règle du projet, PAS une règle Apple).** Les Crew Boosts vendent « +25 % de progression du coffre crew » de 1,99 € à 14,99 € (`catalog.ts:293-343`). Ni zone, ni point, ni défense — la lettre de la règle tient, le serveur verrouille le reste (migration 0067) — mais un coffre qui avance plus vite reste un avantage acheté sur la progression collective. À arbitrer **avant** d'ouvrir la vente.

---

## 4. DÉJÀ CONFORME — ne pas refaire

> Cette section existe pour éviter de reconstruire ce qui est bâti. Chaque ligne a sa preuve.

### Suppression de compte et droits RGPD — 5.1.1(v), 5.1.1(i)

- **Suppression réellement offerte dans l'app**, deux entrées, jamais enterrée : Réglages → Compte (`apps/mobile/app/parametres/[section].tsx:411-419`) et Réglages → Confidentialité (`src/features/settings/sections.ts:88`) ; 3 taps jusqu'à la ligne destructive, 4 jusqu'à la confirmation plein écran (`confidentialite.tsx:613-622` → `:648-695`).
- **La purge est réelle et ordonnancée** : `purge_due_accounts()` supprime `auth.users` (CASCADE sur tout le graphe) et le cron `gryd_purge_accounts` est créé **dans la migration**, pas dans un runbook (`0046_account_deletion_grace.sql:267-297`, `:316-320`). Ce n'est pas une désactivation déguisée — ce qu'Apple refuse explicitement.
- **Délai de grâce annoncé, pas subi** : la confirmation dit ce qui arrive tout de suite, dans 30 jours, et comment annuler (`reglages.ts:1418`, `:1432`, `:1439`) ; la date affichée vient du **serveur** (`confidentialite.tsx:343`, `:591-595`) ; l'annulation n'est déclenchée que par une authentification réelle (`features/account/deletion.ts:10-18`).
- **Quatre états distincts, jamais confondus** (`signedOut` / `reading` / `known` / `failed`, `confidentialite.tsx:146`, `:177-201`) ; en cas d'échec de lecture la ligne reste accessible (`:555-585`) et aucune suppression n'est annoncée sans confirmation serveur (`:267-272`).
- **Export RGPD réel** : `export_account` lit 15 tables porteuses de données personnelles + l'état de suppression, identité dérivée du JWT (`supabase/functions/export_account/index.ts:31-56`, `:86-108`), câblé au bouton (`confidentialite.tsx:314-327`).
- **Données de tiers protégées** : un signalement survit à la suppression de son auteur en étant **anonymisé** (`reporter_id → NULL`, `0046:65-84`) plutôt que détruit ; invisibilité immédiate appliquée à la source (`0046:88-165`).

### Santé et mesure d'audience — 5.1.3(i), 5.1.3(ii), 5.1.2

- **Aucun accès HealthKit ni Health Connect** : `registry.ts:20-23` (`gpx` seul), `appleHealth.ts:22-26` et `healthConnect.ts` sont des stubs, aucun module natif santé en dépendance. Donc 5.1.3(i) satisfait par absence, et **5.1.3(ii) structurellement impossible à violer** (aucune écriture dans HealthKit).
- **Mouvement/podomètre** : réellement lu (`useRealRunCore.ts:507`, `runPipeline.ts:284`, `:322`), déclaré dans les deux politiques, et servant **uniquement** au score anti-triche serveur (`engine/validation.ts:220-245`, colonne `runs.step_count`, `0002_schema.sql:111`). Aucun SDK publicitaire.
- **PostHog ne reçoit ni position, ni pseudo, ni donnée santé** : énumération des 62 appels `track()` — aucun `lat`/`lng`/`h3`/`hex`/pseudo/e-mail/distance/pas. Super-propriétés = langue, version, route **normalisée**, écran précédent, temps sur l'écran (`analytics.ts:84-94`). `identify()` n'envoie que l'UUID Supabase (`auth.ts:185`, `:229`, `:273`). Host UE par défaut (`analytics.ts:56`).
- **Politique accessible hors réseau** : le document intégral est embarqué, 3 taps (`parametres/[section].tsx:706-712` → `app/legal/confidentialite.tsx`), avec un lien vers l'écran où l'on exerce ses droits (`legal/confidentialite.tsx:138-146`).
- **Les deux points signalés par l'audit UI sur la politique EMBARQUÉE sont déjà corrigés et committés** — vérifié `git status` propre sur `legal.ts` : chat de crew et collecte HealthKit retirés (`legal.ts:419`, `:422`, `:451`), import GPX — qui existe — ajouté ; `app/legal/licences.tsx:16-19` porte désormais la section SIL OFL 1.1. **`docs/design/vague-1/RESTE-A-RECALER.md` est périmé sur ces points** ; il reste exact pour la politique WEB (B7/B8).

### Permissions, arrière-plan, batterie — 2.4.2, 2.5.4, 5.1.5

- **`UIBackgroundModes` ne contient que `location`** (`app.json:66-68`), pour un usage réel : tâche définie (`provider.ts:65-74`), démarrée uniquement pendant une course (`:174`). Vérifié qu'aucun autre mode ne s'ajoute au prebuild : `expo-task-manager` pousserait `fetch` mais n'est ni dans `expo.plugins` ni dans `versionedExpoSDKPackages` ; le mode `remote-notification` exige `enableBackgroundRemoteNotifications`, non passé (`app.json:122-128`).
- **Suivi arrière-plan honnête côté OS** : `showsBackgroundLocationIndicator: true` (`provider.ts:180`), `activityType: Fitness` (`:182`), notification de service Android obligatoire et explicite (`:185-189`). Aucun suivi caché.
- **Permissions progressives, demandées sur geste** : foreground au premier GO, pas au lancement (`useRealRun.ts:64-75`) ; la carte ne demande que sur Recentrer (`MapScreen.tsx:202-227`) ; le planificateur ne demande rien à l'ouverture (`route-planner.tsx:397`) ; la photothèque uniquement dans `pickAvatarPhoto()` (`social/avatarPhoto.ts:81`). « Toujours » n'est proposée **qu'après** un vrai passage en arrière-plan pendant une course active (`useRealRunCore.ts:320-340`), avec rationale écrite (`runGps.ts:366-378`) et « PLUS TARD » non bloquant (`:395-400`).
- **Aucune permission déclarée inutilement** hors le cas HealthKit (B5) : pas d'`expo-camera`, `expo-contacts`, audio/micro, `expo-calendar`, ni AppTrackingTransparency/IDFA (`lib/analytics.ts:66`). La caméra est **neutralisée** : `"cameraPermission": false` (`app.json:118`) supprime la clé de l'Info.plist.
- **Pas de watch GPS hors course** : lecture ponctuelle en `Accuracy.Balanced` sur carte et mission (`provider.ts:144-154`) ; le `watchPositionAsync` BestForNavigation (`:156-167`) n'est ouvert que par `startSensors()`.
- **Teardown correct sur les chemins normaux** : `finish()` coupe le podomètre puis les capteurs (`useRealRunCore.ts:441-442`), cleanup d'effet (`:286-292`), protection `mountedRef` contre la fuite d'abonnement (`:518-523`). Pas d'`expo-keep-awake`.
- **Aide batterie Android réelle** : feuille « Courir écran éteint » avec les chemins par constructeur (`runGps.ts:462-463`, `:528-594`).
- **Honnêteté plateforme** : là où l'arrière-plan n'existe pas (navigateur), `adapter.background === null` coupe la proposition (`useRealRunCore.ts:333`) et la limite est annoncée (`runGps.ts:81-86`). Aucun bouton mort.

### Sécurité et pression — 1.4.5

- **L'écran de course est conçu pour ne pas être manipulé** (`RealCourseLive.tsx:1-9`), un seul geste sous le pouce, **verrou d'écran** (`:175`, `:529-533`). **Aucune alerte hors tracé, aucune position live de rival** — décision documentée (`:11-23`), ce qui supprime le scénario de poursuite temps réel. Au-dessus de la vitesse vélo, la célébration est réduite (`:288`, seuil dérivé de game-rules).
- **Les notifications ne pressent pas** : quiet hours 21h-8h en heure **locale** (`_shared/push.ts:13`, `:77-78`), cap journalier, copie non anxiogène avec 3 jours de préavis (`decay_job/index.ts:220-222`), doctrine écrite (`push.ts:18`).
- **La sécurité est écrite** (même si mal placée, cf. R5) : `code-conduite.tsx:75` + `reglages.ts:1810-1819`, et clause CGU complète (`legal.ts:366-368`).

### Achats — 3.1.1

- **Aucun bouton d'achat qui « réussit » hors IAP** : la seule action réelle est `equip()` sur un objet déjà reconnu par le serveur (`arsenal.tsx:211-222`) ; le CTA d'achat est une `View` non pressable (`:636-659`) ; les cartes de grille n'ont aucun bouton (`ShopGridCard.tsx:19-21`).
- **Le mensonge d'achat a été retiré à la source** : `grantLocalItem()` et `spendEclats()` n'existent plus dans `ArsenalInventoryStore` (`inventory.ts:251-277`) — aucun futur écran ne peut les rappeler.
- **Anti-steering** : **zéro** `Linking.openURL` / `openBrowserAsync` / `openAuthSessionAsync` dans tout `apps/mobile/app` + `apps/mobile/src` (une seule occurrence, un commentaire : `support.tsx:30`). Le site `apps/web/app/abonnement/page.tsx` n'est jamais ouvert depuis le mobile et n'encaisse rien.
- **Impossibilité serveur de déverrouiller sans le Store** : `revoke insert, update, delete on public.user_inventory from anon, authenticated` (`0014_items_inventory.sql:177`) ; `revoke all on function public.grant_user_items(...)` (`0014:146`) ; sur `users`, seules `pseudo, city_id` sont accordées en update (`0003_rls.sql:38-40`) — `is_club` n'est pas écrivable par le client. Seul chemin d'entitlement : `rc_webhook`, service-role, protégée par secret et idempotente (`supabase/functions/rc_webhook/index.ts:36-40`).
- **Prix honnêtes, sans nombre magique** : `premiumPrices()` lit `SKU_PRICES_EUR` (`shop.ts:155-160` → `game-rules.ts:1773-1775`) ; l'équivalent mensuel de l'annuel est arrondi au centime **supérieur** pour ne jamais annoncer moins que le prix réel (`shop.ts:143-146`), et c'est testé (`shop.test.ts:119-147`). Aucun prix barré, aucun faux rabais.
- **Analytique non mensongère** : `paywall_view` n'est émis qu'au rendu réel du bloc (`arsenal.tsx:442-444`) ; `purchase_initiated`/`purchase_completed` existent au registre (`events.ts:68-69`) mais ne sont émis nulle part.
- **CGV embarquées, atteignables depuis le paywall, à jour du code** : `arsenal.tsx:487-497` → `app/legal/cgv.tsx` ; durée/reconduction/résiliation (`legal.ts:602-606`), rétractation (`:592-600`), et **chapeau affirmant qu'aucune offre n'est commercialisée** (`:578-580`).
- **Aucune fonctionnalité verrouillée derrière l'abonnement** : la seule lecture UI de `wallet.isClub` est un affichage d'état (`arsenal.tsx:266-268`). **Et l'abonnement ne distribue plus d'objet fonctionnel, verrouillé au niveau de la donnée** : migration `0067_club_never_grants_functional_items.sql` pose une **contrainte** plutôt que de réécrire une fonction — elle vaut pour toute version future.
- **Solde et possession : lus ou rien.** Sans lecture serveur, le solde affiche « — » et non « 0 » (`arsenal.tsx:180-190`, `:259`).

### Contenu utilisateur et connexion — 1.2, 4.8

- **4.8 — Sign in with Apple offert sur iOS, au même niveau et même en premier**, sur les deux portes de création : `app/(auth)/sign-in.tsx:308-327` et `app/onboarding/index.tsx:1084-1090`. Plugin natif déclaré (`app.json:121`), flux complet (`lib/auth.ts:156-189`, nonce hashé au provider / brut à Supabase). **Rien à refaire sur 4.8.**
- **1.2(a) — Le seul contenu réellement publié (le NOM DE CREW) est filtré côté SERVEUR** : `create_crew` appelle `crew_name_refusal` (`0050_crew_name_moderation.sql:459-461`) **et** trigger `crews_name_moderation` before insert or update (`:546-549`), qui ferme aussi l'écriture directe. Le filtre couvre caractères invisibles (`:258-265`), homoglyphes cyrillique/grec (`:268-288`), leet et accents (`:290+`), marques et termes officiels via `reserved_handles` (`:386-390`). Travail sérieux, déjà fait — **ne pas réimplémenter côté client**.
- **1.2(b) — Le signalement part vraiment et il y a quelqu'un au bout** : `reportContent` insère dans `content_reports` sous session (`moderation.ts:270-283`), table + RLS (`0029_moderation.sql`), RPC de revue service-role (`0046:330-395`), et **file réellement rendue** dans la console (`apps/web/app/admin/(panel)/signalements/page.tsx` + `ResolveButtons.tsx`). Le cas hors session est traité honnêtement : le bouton n'est pas peint sans compte (`confidentialite.tsx:421-441`).
- **La contradiction code-conduite ↔ support signalée par l'audit UI est déjà levée** — vérifié : `code-conduite.tsx:14-25` documente le retrait des copies de modération de chat, `reglages.ts:1837-1839` dit « une personne examine chaque signalement ENREGISTRÉ » avec sa condition, et `support.tsx:181-193` n'affirme plus recevoir ce qu'il ne reçoit pas. **Ne pas rouvrir ce point.**
- **Gate d'âge 16+ posé au point de création**, avec trois états de lecture distincts et aucun cul-de-sac (`sign-in.tsx:214-304`) ; `MIN_AGE_YEARS` partagé, rappelé dans Confidentialité (`confidentialite.tsx:498-501`).
- **Surface UGC volontairement réduite** : pas de messagerie libre (signaux à catalogue fermé, `features/crew/pings.ts`), photo de profil **locale** jamais envoyée (`social/avatarPhoto.ts:11-38`), écran Amis sans annuaire (`app/amis.tsx:1-27`). Moins de surface = moins d'obligations 1.2.
- **Handles réservés côté serveur** avec normalisation anti-contournement (`n_i_k_e → nike`) et RPC en lecture seule (`0047_handle_verification.sql:225-270`) ; badge `verified` verrouillé service-role (`:179-188`).

---

## 5. ORDRE DE TRAITEMENT

Par **coût croissant à impact égal**. Les textes d'abord : ils lèvent 6 bloquants sur 10 sans toucher au moteur.

### Palier 1 — Textes seuls (heures, zéro risque de régression)

| # | Action | Lève | Fichiers |
|---|---|---|---|
| 1 | **Réécrire le bloc « Notes de review »** en entier : achats (« no in-app purchases in this build »), retrait de « DEMO mode », §5 sur des preuves vivantes | **B10** | `GRYD_APPSTORE_CHECKLIST.md:104-115`, `:180-182` |
| 2 | **Nettoyer `app.json`** : retirer `NSHealthShareUsageDescription` ; supprimer « , et jamais dans tes zones privées » **aux deux endroits** ; dédupliquer `NSMotionUsageDescription` | **B5, B6** + R2 | `apps/mobile/app.json:62,63,64,102,111` |
| 3 | **Aligner la politique WEB sur la politique mobile déjà corrigée** : HealthKit, chat de crew, paiement, délai de grâce 30 j, transferts hors UE | **B7, B8** + R10 | `apps/web/app/confidentialite/page.tsx:41,160-167,253,262,281-306,335-336,388-393` |
| 4 | **Corriger les lignes App Privacy label** du dossier | **B9** | `GRYD_APPSTORE_CHECKLIST.md:139,163` |
| 5 | Corriger le retrait de consentement dans la politique embarquée (santé → position) | R6 | `apps/mobile/src/i18n/catalog/legal.ts:481` |
| 6 | Aligner la copie de blocage sur ce qui agit réellement (mesure d'attente si #8 ne part pas tout de suite) | atténue **B3** | `reglages.ts:1139`, `:1857` |
| 7 | Retirer la promesse de sanctions non implémentée, ou l'écrire au conditionnel | R12 | `reglages.ts:1870` |

### Palier 2 — Code court, périmètre net (jours)

| # | Action | Lève |
|---|---|---|
| 8 | **Faire consommer `isBlocked()`** par le roster crew et le classement | **B3** |
| 9 | **Action « … » { Signaler · Bloquer } pré-remplie** sur la ligne de roster et de classement | **B4** |
| 10 | `stopBackgroundUpdates()` au démarrage quand aucun buffer n'est vivant + borner `BG_FIXES_KEY` | R1 |
| 11 | Ligne de sécurité sous le décompte du préflight, première course seulement | R5 |
| 12 | Désinstaller `expo-media-library` (aucun appelant) | R3 |
| 13 | Basculer `sign-in.tsx:154` sur la probe runtime `isAppleAuthAvailable()` | R14 |
| 14 | Ligne « Localisation → Réglages » (`Linking.openSettings()`) dans l'écran Confidentialité | R6 |
| 15 | Arrondir le palier « moins d'une heure » au dernier palier horaire | R4 |

### Palier 3 — Chantiers, à faire avant d'ouvrir une surface

| # | Action | Déclencheur |
|---|---|---|
| 16 | Révocation Sign in with Apple à la demande de suppression | R8 |
| 17 | Opt-out mesure d'audience dans `PrivacyPrefs` + écran | R7 |
| 18 | Filtre serveur (trigger) sur `users.pseudo` et `user_profiles.display_name/bio` | **avant** de brancher l'édition de profil au serveur (R13) |
| 19 | Mécanisme de sanction réel, ou copie alignée | R12 |
| 20 | Les 3 manques Schedule 2 (renouvellement/résiliation, lien confidentialité, Restaurer les achats) + odds de la loot box, ou retrait de l'aléatoire | **avant** d'ouvrir `flags.arsenal` ou O3 (R19, R20, R21) |

---

## 6. Ce qui ne peut PAS être corrigé par du code

| Point ouvert | Ce qu'il bloque | Ce qu'il faut, et par qui |
|---|---|---|
| **O10 — domaine public (`gryd.app` vs `gryd.run`)** | **B1** (URL de confidentialité) et **B2** (URL de support + contact publié 1.2). Deux champs obligatoires d'App Store Connect. | Décision + achat + DNS par le fondateur, puis déploiement d'`apps/web` (la page `/confidentialite` existe déjà) et création d'une boîte `support@` **qui reçoit**. Aucun contournement par le code : un `mailto:` vers un domaine non enregistré n'est pas un contact. Repli acceptable : une adresse e-mail opérationnelle sur un domaine **déjà possédé**. |
| **Environnement EAS « production »** | R18 — c'est le **seul** chemin par lequel le paywall pourrait apparaître dans un build soumis. Invérifiable depuis le dépôt. | Contrôle manuel sur le dashboard EAS ou `eas env:list --environment production`. Si `EXPO_PUBLIC_FULL_SURFACE=1` y traîne, R19-R23 deviennent bloquants d'un seul build. |
| **Compte Apple Developer / App Store Connect** | R15 (le palier « 12+ » n'existe plus : 4+, 9+, 13+, 16+, 18+), R16 (cohérence rating ↔ gate 16 ans), R17 (compte de démonstration à fournir), et le contenu réel de la fiche (notes, URL, label). | Le questionnaire d'âge doit être re-répondu dans l'interface ; le repo ne peut que préparer les réponses. |
| **O3 — RevenueCat / produits IAP** | R19, R20, R21, R23. **Ne rien créer dans App Store Connect tant que le binaire n'expose aucun chemin d'achat** : ce sont les produits qui seraient rejetés. | Câblage O3, puis livraison des 3 manques Schedule 2 + restauration + décision loot box + arbitrage anti-pay-to-win des Crew Boosts, **avant** d'ouvrir le drapeau. |
| **O8 — dev build / appareil réel** | Non vérifiable en lecture seule : contenu réel de l'Info.plist généré par EAS, comportement de terminaison OS pendant une course (R1), entitlement Sign in with Apple sur build signé (R14), absence d'un `PrivacyInfo.xcprivacy` au niveau de la cible (aucun `ios.privacyManifests` dans `app.json`). | Un dev build EAS et un test terrain. |

---

## Annexe — méthode et réserves

**Lecture seule intégrale.** Aucun fichier de l'app modifié ; ce document est le seul écrit. Les quatre domaines ont lu intégralement, entre autres : `apps/mobile/app.json` (134 l.), `useRealRunCore.ts` (581 l.), `RunPreflight.tsx` (182 l.), `arsenal.tsx` (929 l.), `flags.ts` (109 l.), `shop.ts` (172 l.), `confidentialite.tsx` (808 l.), `sign-in.tsx` (566 l.), `moderation.ts` (363 l.), `support.tsx` (245 l.), `code-conduite.tsx` (177 l.), `0046_account_deletion_grace.sql`, `export_account/index.ts`, `delete_account/index.ts`, `apps/web/app/confidentialite/page.tsx`, et le comportement de prebuild dans `node_modules/@expo/config-plugins` (le repo n'a ni `apps/mobile/ios` ni `apps/mobile/android` — managed workflow).

**Greps de couverture** (résultats cités dans les constats) : `isBlocked` · `user_blocks` · `crew_messages` · `stopLocationUpdatesAsync|hasStartedLocationUpdatesAsync` · `privateHexes` dans `ingest_run` (0 hit) · `EXPO_PUBLIC_FULL_SURFACE` (7 hits, aucune assignation) · `Linking.openURL|openBrowserAsync|openAuthSessionAsync` (1 hit, commentaire) · `purchase_initiated|purchase_completed` (0 émission) · `restore|Restaurer les achats` (0 implémentation) · `is_banned|ban_until|suspend` (0 hit) · dépendances d'achat dans `apps/mobile/package.json` (aucune).

**Guidelines re-vérifiées le 26/07/2026** sur `developer.apple.com/app-store/review/guidelines/` (1.2, 1.4.5, 2.3.1, 2.1(a), 2.4.2, 2.5.4, 3.1.1, 3.1.2(c), 4.8, 5.1.1(i)(ii)(iii)(v), 5.1.2, 5.1.3(i)(ii), 5.1.5), sur `developer.apple.com/support/offering-account-deletion-in-your-app/` et sur `developer.apple.com/help/app-store-connect/reference/age-ratings`.

**Réserve d'état de l'arbre.** Huit chantiers de recalage écrivaient en parallèle dans `apps/mobile/app/**` pendant l'audit. Vérifié par `git status --short` : `apps/mobile/src/i18n/catalog/legal.ts`, `apps/mobile/app.json`, `apps/mobile/app/legal/**` et `apps/web/app/confidentialite/page.tsx` étaient **propres** (= état committé) — les citations de ces fichiers ne portent pas sur un état transitoire. `apps/mobile/app/confidentialite.tsx` et `apps/mobile/app/parametres/[section].tsx` étaient modifiés en cours de session : les lignes citées valent pour l'arbre de travail lu, pas nécessairement pour HEAD.

**Non affirmé faute de preuve.** Le contenu réel de la fiche App Store Connect (URL de support, rating déclaré, notes, compte de démonstration), l'état DNS effectif de `gryd.run`/`gryd.app`, le contenu de l'environnement EAS « production », et le comportement d'un build EAS signé sur appareil.
