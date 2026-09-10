# E2E — le PARCOURS CLIENT : ce que ce harnais prouve, et ce qu'il ne prouve pas

Onboarding → première utilisation → **création de compte** → reconnexion, joués de bout en bout
dans un vrai navigateur, sur le bundle web **exporté** de `apps/mobile`.

---

## Lancer

```bash
npm run test:e2e:parcours          # exporte le bundle, puis joue les 5 scénarios
```

La première fois seulement :

```bash
npx playwright install chromium
```

Pour rejouer sans ré-exporter (itération rapide, le bundle est déjà dans `apps/mobile/dist/`) :

```bash
npx playwright test -c apps/mobile/e2e/playwright.config.ts
npx playwright test -c apps/mobile/e2e/playwright.config.ts s2      # un seul scénario
npx playwright test -c apps/mobile/e2e/playwright.config.ts --ui    # mode inspecteur
```

État au 10/09/2026 : **22 tests, tous au vert** (~40 s sans ré-export, ~4 min avec), dont **2
volontairement rouges** et marqués comme tels (voir « Bugs épinglés »).

**Ces tests ne sont PAS dans `npm run gate`.** Le gate doit rester une boucle courte ; l'export web
prend des minutes. Ils tournent avant un push de lot.

> `npm run test:e2e` (racine) est un **autre** harnais, antérieur : il vise `apps/web` et le bundle
> Expo servi par `expo start`. Les deux cohabitent, ils ne testent pas la même chose.

---

## Ce que ça prouve

Sur le bundle **web** — react-native-web, le seul runtime exécutable ici, Xcode n'étant pas
installé sur cette machine — que **le parcours client tient** :

| # | Scénario | Ce qu'un vert signifie |
|---|---|---|
| S1 | Première ouverture | Stockage vide → la découverte s'affiche, son CTA ouvre la carte, aucun compte n'est exigé pour entrer |
| S2 | Création de compte | Carte → porte de compte → `/sign-in` → gate 16+ (refus = état terminal, acceptation = formulaire) → adresse refusée → adresse acceptée → code envoyé → cadence de renvoi tenue → code faux → code juste → carte connectée → le Profil montre une **identité**, pas « Invité » ni un `…` figé |
| S3 | Reconnexion | Session en mémoire → la carte s'ouvre **directement**, sans redemander la découverte ; déconnexion réelle (passe par le serveur) → la porte de compte se repeint et mène quelque part ; reconnexion sans redemander l'âge |
| S4 | Échecs honnêtes | Réseau coupé et serveur 503 produisent **deux** messages différents, le bouton se ré-arme (aucun spinner infini), et la carte connectée annonce « Terrains indisponibles · Réessayer » au lieu d'un vide qui aurait l'air vrai |
| S5 | Retour sans pile | `/email` ouvert par URL → le retour ramène à la carte ; atteint par la porte de compte → le retour rend `/sign-in`. L'affichage se dérive de la capacité **réelle** |

C'est déjà beaucoup : la classe de régression la plus fréquente de ce dépôt est un écran qui ne
monte plus, une copie fausse, ou un bouton qui n'emmène nulle part.

---

## Ce que ça ne prouve PAS

- **Rien sur le natif.** Le produit final est une app iOS. La carte est un fork web
  (`RealMap.web.tsx`, pas MapLibre natif), le GPS passerait par l'API navigateur et non
  `expo-location`, et Apple/Google Sign-In n'ont aucun chemin utilisable dans un navigateur tant
  que O2 est ouvert. Un vert ici ne dit rien d'un iPhone.
- **Rien sur le GPS ni la capture.** Aucune trace, aucune boucle, aucun territoire.
- **Rien sur l'auth réelle.** Tout le réseau Supabase est simulé (voir plus bas). Le jeton de
  session est de forme valide mais de **signature bidon** : aucun serveur réel ne l'accepterait.
  Ce harnais prouve le comportement de l'**app** une fois connectée, jamais la validité d'un jeton
  ni la configuration du projet Supabase.
- **Rien sur la RLS**, les migrations, ou quoi que ce soit de serveur.
- **Rien sur le rendu de la carte.** MapLibre rend noir en capture headless (piège documenté dans
  `CLAUDE.md`) ; les tuiles, glyphes et services de géocodage sont coupés.

---

## Le filet réseau : rien ne sort

`e2e/fixtures/supabase-mock.ts` intercepte **toutes** les requêtes (`**/*`), pas seulement
Supabase, et les classe en quatre cases :

1. l'origine locale du bundle servi → laissée passer ;
2. `*.supabase.co` → répondue par une **fixture** ;
3. un tiers **nommé** et hors périmètre (fonds de carte, glyphes, Nominatim, routing, geo.api.gouv.fr)
   → coupé, silencieusement ;
4. **tout le reste → coupé ET enregistré comme violation : le test échoue.**

Le filet est monté par une fixture Playwright **`auto: true`**, et ce n'est pas un détail : une
fixture ordinaire n'est construite que si le test la demande dans sa signature. Un test écrit
`async ({ page })` — parfaitement naturel quand il ne consulte pas le journal réseau —
n'installait alors **aucun** filet et ses requêtes partaient pour de vrai. C'est arrivé pendant la
mise au point de ce harnais. La sécurité ne peut pas dépendre de ce que l'auteur d'un test pense à
écrire : `auto` la rend inconditionnelle.

Deux ceintures, pas une :

- le bundle E2E est compilé avec une **URL Supabase fictive** (`e2e-mock.supabase.co`,
  cf. `e2e/build-dist.mjs`), donc même un trou dans le filet ne peut pas atteindre la production ;
- PostHog et RevenueCat sont neutralisés (clé vide) : aucun événement de test ne part dans le
  funnel du pilote.

**Aucun compte n'est créé nulle part, aucun quota d'e-mail consommé, aucune écriture en prod.**

Les fixtures rendent du **vide honnête** — `[]`, `null`, aucun terrain, aucun crew — jamais des
chiffres inventés. Si un écran affichait un nombre alors que le serveur n'a rien donné, ce harnais
doit le montrer, pas le couvrir.

Un RPC PostgREST absent de la table de `rpcFixture()` est traité comme une **violation** : il faut
le regarder et décider ce que « vide » veut dire pour lui, jamais rendre `null` au hasard.

---

## Bugs épinglés (tests volontairement rouges)

Un test qui échoue parce que **l'écran** se comporte mal n'est pas un test à assouplir.

| Test | Symptôme vécu par le joueur | Cause |
|---|---|---|
| `s2` › « le gate 16+ ne se redemande PAS après avoir été franchi » | Il répond « Oui, j'ai 16 ans ou plus » sur `/sign-in`, tape son adresse sur `/email`, touche « Recevoir un code » — et la **même question revient**. Il déclare son âge deux fois pour créer un compte. | `useOnboardingState` (`src/features/onboarding/store.ts:167`) donne un instantané **privé**, lu une fois au montage, sans magasin partagé ni relecture. `AuthEntry2026.confirmAge` (`src/features/account/AuthEntry2026.tsx:106`) écrit sans attendre (`void update`, l. 111) puis navigue au même tick (l. 112) : `/email` lit le disque avant l'écriture. Le disque est correct (vérifié : `ageConfirmed: true` deux secondes plus tard) ; c'est l'écran qui garde une valeur périmée, et `email.tsx:100` tranche dessus. **Correctif proposé** : un état de module partagé + des abonnés dans `useOnboardingState`, comme `writePatch` l'est déjà. |
| `s3` › « `/profil` en lien profond sert le MÊME écran que la barre basse » | Par la barre basse il voit « Profil · Invité · Sur cet appareil · Connexion ». Il rafraîchit la page, ou rouvre le même lien plus tard, et tombe sur un **écran entièrement différent** : « Toi · Sans compte, GRYD ne sait pas encore ce qui est à toi · Se connecter » — `app/(mvp)/profil.tsx`, la ligne MASTER **mise en quarantaine** par ADR-001 et remplacée par ADR-012. | Deux fichiers servent `/profil` (`app/(tabs)/profil.tsx` et `app/(mvp)/profil.tsx` — les parenthèses d'un groupe expo-router ne comptent pas dans l'URL). La navigation **interne** résout dans le navigateur d'onglets et rend le cahier ; le chargement **à froid** d'une URL résout dans l'arbre de linking et rend le legacy. `scripts/audit-routes.mjs` voit déjà la collision de fichiers, mais suppose que « le script ne sème l'arbre qu'avec celui du cahier » : à l'exécution, c'est le legacy qui gagne. **Correctif proposé** : trancher à la source — retirer `app/(mvp)/profil.tsx` de l'arbre servi, ou lui donner un chemin propre. |

Ils sont marqués `test.fail()`. **Le jour où le bug est corrigé, le test passe, Playwright signale
« expected to fail but passed », et la suite reste rouge tant que la marque n'est pas retirée.**
Un bug épinglé ne peut pas se refermer en silence.

---

## `testID` ajoutés

**Aucun.** Tous les sélecteurs passent par le rôle, le libellé accessible ou le texte visible —
c'est-à-dire par ce qu'un joueur (ou un lecteur d'écran) perçoit réellement. Rien dans les écrans
n'a été modifié pour ce harnais.

Trois pièges à connaître, notés dans `fixtures/app.ts` :

- sur `/sign-in`, le bouton « Oui, j'ai 16 ans ou plus » porte un `accessibilityLabel` **différent**
  de son libellé visible (`J'ai 16 ans ou plus`) : c'est celui-là que résout `getByRole`. Sur
  `/email` le même bouton n'en porte pas et garde son libellé ;
- « Explorer la carte » existe en double sur la découverte (le CTA, et le bouton de fermeture
  « Fermer et explorer la carte ») : il faut `exact: true` ;
- `getByLabel` fait une correspondance **partielle et insensible à la casse** (« Couches » attrape
  « Fermer les couches ») et voit aussi les écrans que expo-router garde **montés** derrière l'écran
  courant. Les repères d'écran passent donc par `getByRole(..., { exact: true })`, qui ne lit que
  l'arbre d'accessibilité (`mapLayersButton`).

---

## Fichiers

```
e2e/
  playwright.config.ts      config dédiée (voir son en-tête : pourquoi pas la config racine)
  tsconfig.json             coupe l'héritage `expo/tsconfig.base`, que Playwright ne sait pas suivre
  build-dist.mjs            `expo export --platform web` avec l'environnement E2E
  serve-dist.mjs            serveur statique SPA (repli sur index.html — le bundle est `output: single`)
  fixtures/
    supabase-mock.ts        le filet réseau + les fixtures honnêtes + la session simulée
    app.ts                  états de stockage de départ, fixture Playwright, copie FR de référence
  s1-premiere-ouverture.spec.ts
  s2-creation-de-compte.spec.ts
  s3-reconnexion.spec.ts
  s4-echecs-honnetes.spec.ts
  s5-retour-sans-pile.spec.ts
```

`apps/mobile/dist/` (l'export) et `test-results/` sont ignorés par git.

Un dernier piège, si vous ajoutez un scénario : `seedStorage` sème l'état de départ **une seule
fois**, gardé par une clé témoin. `addInitScript` s'exécute à chaque chargement de document, y
compris un `page.goto` en cours de test — sans ce garde, un test qui se déconnecte puis ouvre
`/sign-in` par son URL voyait la session **revenir**. Le garde donne la sémantique d'un vrai
appareil : recharger la page ne remet pas le stockage à zéro.
