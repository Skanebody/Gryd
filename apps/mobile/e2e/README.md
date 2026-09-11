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

État au 12/09/2026 : **28 tests, tous au vert**, sans aucun `test.fail()` (~15 s sans ré-export,
~4 min avec). Les deux bugs qui étaient épinglés rouges sont **corrigés** ; leurs tests sont
restés, verts, comme gardes (voir « Anciens bugs épinglés »).

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
| S2 | Création de compte | Carte → porte de compte → `/sign-in` → gate 16+ (refus = état terminal, acceptation = formulaire, et il **ne se redemande pas**) → adresse refusée → adresse acceptée → **lien envoyé** → cadence de renvoi tenue → lien mort (l'écran le dit, sans emprunter le message du voisin) → lien bon → carte connectée → le Profil montre une **identité**, pas « Invité » ni un `…` figé |
| S3 | Reconnexion | Session en mémoire → la carte s'ouvre **directement**, sans redemander la découverte ; déconnexion réelle (passe par le serveur) → la porte de compte se repeint et mène quelque part ; reconnexion sans redemander l'âge, la session revenant **par le lien** ; `/profil` en lien profond sert le même écran que la barre basse |
| S4 | Échecs honnêtes | Réseau coupé et serveur 503 sur **l'envoi du lien** produisent **deux** messages différents, le bouton se ré-arme (aucun spinner infini), rien ne prétend avoir été envoyé, et la carte connectée annonce « Terrains indisponibles · Réessayer » au lieu d'un vide qui aurait l'air vrai |
| S5 | Retour sans pile | `/email` ouvert par URL → le retour ramène à la carte ; atteint par la porte de compte → le retour rend `/sign-in`. L'affichage se dérive de la capacité **réelle** |
| S6 | L'accueil du lien, puis le profil | Le lien qui **crée** un compte dit « Félicitations, ton compte GRYD est créé » et **un** bouton ; celui qui **reconnecte** dit « Bon retour, @… » ; sans `type`, c'est `handle_chosen_2026` qui tranche ; un lien mort ne félicite personne. Puis la chaîne entière : pseudo (disponibilité en direct, photo et ville facultatives) → discipline (ou « Plus tard ») → carte, avec l'identité **choisie** au Profil. Et arriver par le lien inscrit la découverte + l'âge sur l'appareil, donc une reconnexion ne les redemande pas |

C'est déjà beaucoup : la classe de régression la plus fréquente de ce dépôt est un écran qui ne
monte plus, une copie fausse, ou un bouton qui n'emmène nulle part.

---

## Le parcours e-mail testé est le LIEN MAGIQUE, pas un code

Ce harnais a été écrit contre l'**OTP par code** : `build-dist.mjs` posait
`EXPO_PUBLIC_EMAIL_AUTH_MODE=code`, et les tests tapaient six chiffres. Depuis le 10/09/2026 l'app
**refuse** ce mode sans preuve serveur : `emailDelivery2026(raw, otpTemplateProven)`
(`src/features/account/authCallback2026.ts`) exige un second argument que personne ne sait mettre à
`true` — le gabarit e-mail est **global au projet** Supabase, il porte un **lien**, et l'API de
gestion refuse de le changer sur le plan hébergé avec l'expéditeur par défaut. Les deux appelants
(`lib/auth.ts`, `lib/auth.web.ts`) passent un `false` littéral et greppable.

Poser la variable ne changeait donc plus rien à l'écran : le harnais décrivait un parcours que le
produit ne sert pas, et cherchait un bouton « Recevoir un code » qui n'existe plus. Elle n'est plus
posée. Ce qui est testé est ce qu'un joueur vit :

1. `/email` dit « Un lien de connexion : il te connecte si ton compte existe, il le crée sinon. » et
   son CTA unique est **« Recevoir le lien »** ;
2. l'état « envoyé » nomme l'adresse (« Regarde dans … »), dit les deux limites réelles du lien
   (cet appareil, une heure, une fois), arme le renvoi **daté** et laisse changer d'adresse ;
3. le retour se fait par `/callback`. L'e-mail est hors d'atteinte d'un test, mais ce qui arrive à
   l'app, lui, est connu : GoTrue redirige avec la session dans le **fragment**
   (`#access_token=…&refresh_token=…&type=magiclink`) ou avec son refus
   (`#error=access_denied&error_code=otp_expired…`). `fixtures/supabase-mock.ts` expose les deux —
   `magicLinkReturn()` et `EXPIRED_LINK_RETURN` — et les tests **naviguent** vers eux.

`POST /auth/v1/verify` n'est plus servi par le mock, **volontairement** : si un écran redemandait un
code un jour, sa requête tomberait dans la case « chemin Supabase sans fixture » et le test le
dirait, au lieu de réussir sur un vestige.

Ce que ça ne prouve pas : que Supabase envoie vraiment l'e-mail, ni que le lien reçu est valide. Le
harnais prouve **ce que l'app fait du retour**, jamais la chaîne d'envoi.

### Depuis le 12/09/2026, le retour arrive par `https://gryd.run/callback`

`emailRedirectTo` valait `gryd://callback` — un schéma privé, qu'**aucun client mail ne rend
cliquable**. C'est la panne que le fondateur a vue (« le bouton mène vers rien du tout »). Le lien
est désormais une URL https réelle, servie par `apps/web`, et l'app l'accepte sous **deux** formes :
le lien universel (iOS a vérifié `apple-app-site-association`, il ouvre GRYD directement) et le
schéma (`gryd://callback#…`, le bouton « Ouvrir GRYD » de la page web).

**Ce harnais ne joue ni l'un ni l'autre, et ce n'est pas un oubli.** Le retour est servi sur
l'**origine locale** (`http://127.0.0.1:<port>/callback#…`) : un navigateur de test ne peut pas
atterrir sur `https://gryd.run/callback` sans sortir de la machine, ce que le filet réseau interdit
— à raison. Ce qui EST joué est pourtant l'essentiel : la **forme** que l'app reçoit, une URL
absolue avec la session dans le fragment, lue par `Linking.useLinkingURL()`. Que l'hôte soit
`gryd.run` ou `127.0.0.1` ne change rien au code traversé : ni `parseAuthCallback2026` ni
`callbackType2026` ne regardent l'hôte.

Le reste est prouvé ailleurs, sur les fichiers réellement embarqués :

| Ce qu'il faut savoir | Où c'est prouvé |
|---|---|
| `gryd.run` remet bien `/callback`, `/c/*`, `/r/*`, `/u/*` à l'app | `src/lib/links.test.ts` — couture `app.json` ↔ `apple-app-site-association`, et chaque segment a sa route |
| Les deux formes d'URL sont reconnues | `src/lib/links.test.ts`, `features/account/authCallback2026.test.ts` |
| Le lien du mail n'est plus écrit en dur | `src/lib/links.test.ts` relit `src/lib/auth.ts` |
| iOS ouvre réellement l'app | **APPAREIL**, après un nouveau build EAS. Aucun harnais ne peut le dire |
| `https://gryd.run/callback` est dans l'`uri_allow_list` Supabase | **DASHBOARD**. Invérifiable depuis le client |

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

## Anciens bugs épinglés — corrigés, leurs tests restent en GARDE

Un test qui échoue parce que **l'écran** se comporte mal n'est pas un test à assouplir : il est
épinglé `test.fail()` avec son motif, et le jour où le bug est corrigé Playwright signale
« expected to fail but passed » — ce qui interdit de refermer un bug en silence.

Les deux bugs qui vivaient ici **sont corrigés**. Il n'y a donc plus aucun `test.fail()` dans ce
harnais, et leurs tests sont restés — verts — parce qu'aucun des deux ne se voit à l'œil nu.

| Test (vert) | Ce que le joueur vivait | Ce qui a tranché |
|---|---|---|
| `s2` › « le gate 16+ ne se redemande PAS après avoir été franchi » | Il répondait « Oui, j'ai 16 ans ou plus » sur `/sign-in`, tapait son adresse sur `/email`, touchait le CTA — et la **même question revenait**. Il déclarait son âge deux fois pour créer un compte. | `useOnboardingState` donnait à chaque appelant un instantané **privé**, lu une fois au montage : la porte de compte écrivait `ageConfirmed: true` sans l'attendre puis naviguait au même tick, et `/email` lisait le disque avant l'écriture. L'état vit désormais **au niveau du module** (`src/features/onboarding/store.ts`) : une lecture par processus, les décisions de session au-dessus du disque, chaque instance abonnée par `useSyncExternalStore`. Défaut invisible sur une machine rapide — d'où la garde. |
| `s3` › « `/profil` en lien profond sert le MÊME écran que la barre basse » | Par la barre basse il voyait « Profil · Invité · Sur cet appareil · Connexion ». Il rafraîchissait la page et tombait sur un **écran entièrement différent** : « Toi · Se connecter », la ligne MASTER mise en quarantaine par ADR-001. | Deux fichiers servaient `/profil` (les parenthèses d'un groupe expo-router ne comptent pas dans l'URL) : la navigation **interne** rendait le cahier, le chargement **à froid** rendait le legacy — lequel gagnait était un détail d'implémentation. Le fichier legacy porte maintenant un chemin propre (`app/(mvp)/profil-mvp.tsx`) et `/profil` n'a plus qu'un seul fichier. La quarantaine n'est étanche que tant que personne n'en repose un second. |

---

## `testID` ajoutés

**Aucun.** Tous les sélecteurs passent par le rôle, le libellé accessible ou le texte visible —
c'est-à-dire par ce qu'un joueur (ou un lecteur d'écran) perçoit réellement. Rien dans les écrans
n'a été modifié pour ce harnais.

Quatre pièges à connaître, notés dans `fixtures/app.ts` :

- sur `/sign-in`, le bouton « Oui, j'ai 16 ans ou plus » porte un `accessibilityLabel` **différent**
  de son libellé visible (`J'ai 16 ans ou plus`) : c'est celui-là que résout `getByRole`. Sur
  `/email` le même bouton n'en porte pas et garde son libellé ;
- dans la feuille **Couches**, « Retrouver mes terrains » et sa note (« Sans compte, tes sorties
  restent sur cet appareil et ne prennent aucun terrain. ») vivent dans **un seul** `Pressable` :
  son nom accessible est la concaténation des deux. Les assertions passent donc par `getByText` sur
  chacune des deux phrases, pas par le nom du bouton ;
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
  s6-accueil-et-profil.spec.ts
```

`apps/mobile/dist/` (l'export) et `test-results/` sont ignorés par git.

Un dernier piège, si vous ajoutez un scénario : `seedStorage` sème l'état de départ **une seule
fois**, gardé par une clé témoin. `addInitScript` s'exécute à chaque chargement de document, y
compris un `page.goto` en cours de test — sans ce garde, un test qui se déconnecte puis ouvre
`/sign-in` par son URL voyait la session **revenir**. Le garde donne la sémantique d'un vrai
appareil : recharger la page ne remet pas le stockage à zéro.
