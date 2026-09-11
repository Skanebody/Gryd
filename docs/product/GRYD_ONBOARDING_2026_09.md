# GRYD — L'ONBOARDING, DE A À Z

**12/09/2026.** Demande du fondateur : « fais-moi fonctionner l'onboarding parfaitement de A à Z ».
Et, sur le lien reçu par e-mail : « le bouton mène vers rien du tout ; il faudrait qu'appuyer sur le
lien dise félicitations, vous êtes inscrit ».

Ce document dit **ce qu'un joueur traverse, écran par écran**, **ce qui est prouvé** (et par quoi),
et **ce qui exige un appareil**. Il ne promet rien au-delà du code : chaque ligne renvoie au fichier
qui la tient.

---

## 1. Le parcours, écran par écran

| # | Écran | Ce que le joueur voit | Fichier |
|---|---|---|---|
| 1 | Découverte (3 planches) | « La ville est ton terrain. » puis la boucle, le crew, la carte. Sautable à tout moment. | `src/features/onboarding/Discovery2026Screen.tsx` |
| 2 | Carte, invité | La carte réelle. Un bandeau dit ce que coûte l'absence de compte : « Sans compte, tes sorties restent sur cet appareil et ne prennent aucun terrain. » | `src/features/refonte/MapHome.tsx` |
| 3 | Porte de compte (`/sign-in`) | « Crée ton compte ou connecte-toi ». Apple sur iOS, e-mail partout, « Continuer sans compte » toujours. Rien qui ne soit **réellement** utilisable n'est peint. | `src/features/account/AuthEntry2026.tsx` |
| 4 | Gate 16 ans et plus | Posé **avant** la collecte. Le refus est un état terminal persisté ; sa seule issue est « Ce n'est pas moi ». | idem, + `features/onboarding/store.ts` (`ageDeclined`) |
| 5 | Adresse (`/email`) | Un champ, un CTA « Recevoir le lien », et la phrase qui dit ce que le lien fait vraiment (il crée **ou** connecte). | `app/(auth)/email.tsx` |
| 6 | « Lien envoyé » | Nomme l'adresse, dit d'ouvrir l'e-mail **sur cet appareil**, dit les deux limites réelles (une heure, une fois), arme le renvoi **daté**, et laisse changer d'adresse. | idem |
| 7 | L'e-mail → la page web | Le lien est `https://gryd.run/callback`. iOS ouvre l'app directement (lien universel) ; sinon la page web dit « Félicitations » et propose « Ouvrir GRYD » (`gryd://callback#…`). | `src/lib/links.ts`, `apps/web` (lot E2) |
| 8 | **L'accueil** | Compte NEUF : le G chartreuse, « Félicitations, ton compte GRYD est créé. », **un** bouton « Commencer ». Compte existant : « Bon retour, @pseudo. » et « Continuer ». Lien mort : « Ce lien a expiré » et le champ se rouvre. | `src/features/account/AccountWelcome2026.tsx`, `app/(auth)/callback.tsx` |
| 9 | Profil (`/setup/profile`) | Pseudo **obligatoire**, disponibilité en direct ; nom affiché ; photo **facultative** ; ville **facultative**. Un seul CTA. | `app/setup/profile.tsx` |
| 10 | Discipline (`/setup/activity`) | Course ou vélo, et « Plus tard ». Aucune présélection. | `app/setup/activity.tsx` |
| 11 | Carte, connecté | Ses terrains, et le premier conseil quand la vue est vide : « Le quartier est à découvrir · Ferme une boucle pour le prendre ». | `src/features/refonte/MapHome.tsx` |

**Apple** suit exactement la même arrivée : `AuthEntry2026` dépose sur `/bienvenue`, qui rend le
**même** composant d'accueil. Le nom accordé au premier consentement pré-remplit le champ et propose
un pseudo dérivé ; rien n'est publié tant que le joueur n'a pas touché CONTINUER.

---

## 2. Les deux pannes réparées, et leur cause exacte

### 2.1 Le lien du mail ne menait nulle part

`src/lib/auth.ts` envoyait `emailRedirectTo: 'gryd://callback'`. **Un client mail ne rend cliquable
que `http`/`https`** : un schéma privé dans un courrier est du texte, pas un lien. Gmail réécrit en
plus chaque URL par son proxy. Le lien existait et était inatteignable — un bouton mort, à l'endroit
exact où l'on demande à quelqu'un de créer son compte.

Il vaut désormais `AUTH_CALLBACK_URL` = `https://gryd.run/callback`, et il n'existe **qu'une source
de domaine** : `apps/mobile/src/lib/links.ts`. `INVITE_HOSTS` (invitations de crew) en dérive au lieu
de recopier sa propre liste — il y avait deux vérités sur le domaine de GRYD, condamnées à diverger.

`app.json` déclare `ios.associatedDomains: ["applinks:gryd.run", "webcredentials:gryd.run"]` et les
`intentFilters` Android. Le gabarit `_universal_links_o10`, qui attendait l'arbitrage depuis juillet,
est **appliqué puis supprimé** : un gabarit conservé à côté de son application est la prochaine
divergence.

### 2.2 L'arrivée ne disait rien

`app/(auth)/callback.tsx` faisait `router.replace('/')` à la seconde où la session prenait. On passait
de sa boîte mail à une carte, **sans un mot** : le geste le plus engageant du produit n'avait aucun
accusé de réception.

Il en a un, et il est **juste** — le même lien crée **ou** connecte, donc on ne félicite pas
quelqu'un qui revient. Le verdict est calculé par `features/account/welcome2026.ts` (PUR, 11 tests),
sur trois sources, dans cet ordre de fiabilité :

1. **`type` dans le retour** — GoTrue le pose lui-même : `signup` quand le lien a **créé** le compte,
   `magiclink` sinon. C'est le serveur qui parle du geste qui vient d'avoir lieu ; il tranche seul,
   sans aucune lecture, donc sans faire patienter ;
2. **`handle_chosen_2026`** (migration 0175, lu par `my_handle_status_2026`) — `false` = le joueur
   porte encore l'étiquette `runner_5f3a91c0…` posée à l'inscription par 0154 : il n'a jamais fini de
   s'inscrire. C'est ce qui rattrape un lien recopié ou un client mail qui coupe le fragment ;
3. **la date de création du compte**, en dernier recours seulement.

Et quand aucune des trois ne répond : `'unknown'` → « Te voilà connecté. », la seule phrase vraie
dans les deux cas. On ne devine pas.

---

## 3. Deux défauts trouvés en chemin

### 3.1 `/u/*` n'avait aucune route

L'`apple-app-site-association` remet **quatre** chemins à l'app : `/callback`, `/c/*`, `/r/*`,
`/u/*`. Les trois premiers avaient une route ; `/u/*` n'en avait aucune. Dès la publication du
fichier de domaine, un lien de profil partagé — le chemin qu'un joueur envoie à quelqu'un qui n'a pas
encore l'app — aurait ouvert GRYD sur « Unmatched route ». `app/u/[handle].tsx` redirige vers
`/profil-rival/[handle]`, l'écran qui existait déjà.

### 3.2 Le profil s'écrivait à côté de la règle du pseudo

`app/setup/profile.tsx` écrivait `handle` **en direct** sur `public.user_profiles` (les grants
colonne par colonne de 0011 le permettent). Trois conséquences, toutes silencieuses :

- il contournait `gryd_handle_change_2026` (0175) : aucune ligne dans `handle_changes_2026`, et
  surtout **`handle_chosen_2026` restait `false`**. Le joueur s'était nommé, le serveur continuait de
  croire qu'il portait l'étiquette de 0154 ;
- il ignorait `handle_holds_2026` : créer un compte neuf suffisait à rafler un pseudo qu'un joueur
  venait de libérer — le trou que 0175 avait bouché ;
- le `saveProfile(...)` qui suivait était appelé **sans propriétaire**, donc levait
  `authentication_required` à sa première ligne, dans un `.catch(() => undefined)`. Nom affiché,
  ville et photo n'atteignaient **jamais** `save_my_social_profile_2026`.

Chemin unique désormais : la RPC. Elle applique la règle (premier nommage **gratuit**), refuse un
pseudo réservé par quelqu'un d'autre, pose `handle_chosen_2026`, et écrit tout d'un tenant.

Au passage, **la ville ne bloque plus** : c'est un cadrage de carte qu'une position mesurée supplante
toujours, jamais une condition d'identité. Un joueur hors ligne restait enfermé dans un formulaire
qu'il ne pouvait pas finir, au premier écran suivant la création de son compte.

---

## 4. Ce qui est prouvé, et par quoi

| Fait | Preuve | Commande |
|---|---|---|
| Le lien du mail est une URL https, écrite une seule fois | `src/lib/links.test.ts` relit `src/lib/auth.ts` | `npm run test:mobile` |
| `app.json` déclare le domaine, et il couvre les mêmes segments que l'`apple-app-site-association` | `src/lib/links.test.ts` (couture, lit `apps/web`) | idem |
| Les deux formes d'arrivée sont reconnues, et rien d'autre ne passe | `src/lib/links.test.ts` (`isAuthCallbackUrl`), `authCallback2026.test.ts` | idem |
| Chaque chemin remis par le domaine a une route Expo | `src/lib/links.test.ts` | idem |
| « Félicitations » ne se dit qu'à un compte neuf | `features/account/welcome2026.test.ts` (11 tests) | idem |
| Le nom d'Apple propose et n'impose pas | `features/account/providerIdentity2026.test.ts` (7 tests) | idem |
| La chaîne `/setup/*` est nommée une fois, ne boucle pas, et quelqu'un y entre | `features/setup/setupChain.test.ts` | idem |
| Apple et le lien e-mail rendent le **même** accueil | idem (tripwire de source) | idem |
| La ville n'est pas une condition | `features/setup/handle.test.ts` | idem |
| Aucune route orpheline, aucun lien mort | `scripts/audit-routes.mjs` | `node scripts/audit-routes.mjs` |
| **Le parcours joué dans un vrai navigateur** : accueil neuf / retour / sans `type` / lien mort, puis pseudo → discipline → carte, et l'identité au Profil | `e2e/s6-accueil-et-profil.spec.ts` (+ S2, S3 mis à jour) | `npm run test:e2e:parcours` — **28 tests** |

---

## 5. Ce qui exige un appareil, ou quelqu'un d'autre

Rien de ce qui suit n'est vérifiable depuis ce dépôt. C'est dit ici plutôt que supposé ailleurs.

1. **Un nouveau build EAS.** Les entitlements `com.apple.developer.associated-domains` sont posés
   **à la compilation** : le binaire déjà installé sur l'iPhone du fondateur ne sait rien de
   `gryd.run`. Tant qu'il n'est pas rebâti, le lien universel ouvre Safari — et la page web fait son
   travail de repli (« Ouvrir GRYD » → `gryd://callback#…`), qui marche, lui, dès aujourd'hui.
2. **L'`uri_allow_list` du projet Supabase** doit contenir `https://gryd.run/callback` (dashboard →
   Authentication → URL Configuration). Sans elle, GoTrue **refuse la redirection et retombe sur
   `SITE_URL`** : le lien partirait, et ramènerait ailleurs. Aucun code client ne peut le vérifier ni
   le corriger.
3. **Le lien universel réel.** Qu'iOS ouvre vraiment l'app dépend de la vérification de
   `apple-app-site-association` par les serveurs d'Apple, du cache CDN, et du premier lancement de
   l'app. Ça se constate sur un iPhone, pas dans un test.
4. **Apple Sign-In.** `isAvailableAsync()` dit que le **système** le propose ; il ne dit pas que le
   profil de provisionnement porte l'entitlement. Un build qui en manque répond `true` puis échoue à
   `signInAsync` — ce cas ressort en `auth_error`, avec sa propre phrase. Le pendant serveur
   (Services ID + secret Apple côté Supabase) est réel mais **invisible du client**.
5. **Android.** `assetlinks.json` n'est pas publié : la vérification échoue silencieusement, l'OS
   ouvre le navigateur, et le repli est le même chemin qu'aujourd'hui. Pour l'ouverture directe :
   publier `/.well-known/assetlinks.json` avec l'empreinte SHA-256 du keystore EAS. Aucun build
   Android n'existe à ce jour.
6. **L'envoi de l'e-mail lui-même.** Le harnais prouve ce que l'app fait du **retour**, jamais la
   chaîne d'envoi ni la validité d'un jeton réel (le jeton du harnais a une signature bidon,
   volontairement).

---

## 6. Ce qui reste ouvert

- **`/setup/permissions` (E10) est hors de la chaîne, délibérément.** La boîte système de
  localisation se demande au premier GO, là où elle a un bénéfice immédiat ; la faire tomber trois
  écrans avant la première course est le défaut corrigé sur la carte le 21/07/2026. L'écran existe et
  reste atteignable par ailleurs.
- **La photo de profil à l'inscription dépend du binaire.** `pickAvatarPhoto` charge
  `expo-image-picker` **paresseusement** : un build antérieur à sa déclaration répond `unavailable`,
  et l'écran le dit au lieu de peindre un bouton mort.
- **Le premier conseil de la carte ne sait pas si le joueur a du terrain ailleurs.** Il parle de la
  **vue courante** (« Le quartier est à découvrir · Ferme une boucle pour le prendre »), parce que
  c'est tout ce que cet écran lit. Dire « ton premier terrain » demanderait un compte global que
  personne ne charge ici — on ne l'affirme donc pas.
