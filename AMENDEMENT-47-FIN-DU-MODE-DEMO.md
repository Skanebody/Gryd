# AMENDEMENT-47 — Fin du mode démo, et une vitrine alignée sur le vrai produit

**Décision fondateur 21/07/2026** : « vérifie qu'il n'y a plus aucun mode démo,
j'en avais vu dans les crew et je vois aussi des résidus sur la carte. Fais
toutes modifications pour l'application mais aussi sur le localhost que je puisse
visualiser avant de faire une modification sur l'expo dev. »
Puis, sur la question de la vitrine : **« Aligner la vitrine sur le vrai
produit »**, et le lien public pointe désormais vers `apps/web`.

Cet amendement **remplace** la doctrine « la démo n'a le droit d'exister que sur
la vitrine web » posée le 20/07 (A-42, retour terrain n°1). Cette doctrine était
un compromis ; elle tombe.

---

## §1 — Ce que l'audit a trouvé (96 occurrences, 74 visibles sur iPhone)

L'audit a couvert 7 surfaces en parallèle. **Aucune n'était propre** : les 7 ont
rendu le verdict `DEMO_QUI_FUIT`. Les trois mensonges bloquants :

| Écran | Ce que voyait un compte NEUF, à zéro course |
|---|---|
| `/performance` | « Score Forme 78 », « 3 courses · 18,4 km », records personnels, « Plus longue 12,8 km · République », Impact GRYD — **aucune garde, aucune lecture serveur** |
| `onboarding` | « Apple Health · ce matin · 6,4 km » puis **« +47 zones »** en compteur animé, avec haptique de succès et event de célébration |
| `profil` → crew | `showCrew = !realUser` : **logique inversée**, c'est l'utilisateur SANS compte qui se voyait attribuer « LES FOULÉES 9³ » |

Deux détails qui disent l'ampleur du problème :

- `crew-edit.tsx` faisait de **n'importe quel visiteur le fondateur (KORO)** d'un
  crew inexistant, champs éditables et bouton « ENREGISTRER » compris. Et
  `saveCrewEdit` appliquait le repli `name.trim() || MY_CREW.name` : vider le
  champ ne vidait pas le crew, ça le **rebaptisait**.
- Le peek mission de la carte s'affichait dès que la donnée réelle manquait —
  « République sous pression », « Canal Crew reprend du terrain ». Trois cas le
  déclenchent, dont **un simple hoquet réseau chez un joueur réel et connecté**.
  C'est le résidu que le fondateur voyait depuis la Normandie.

`profil.tsx` refusait explicitement d'afficher le Score Forme hors vitrine, avec
en commentaire « c'est justement ce qu'un joueur ne peut pas distinguer à
l'œil » — **tout en offrant le raccourci qui y menait**. La contradiction vivait
dans le même fichier.

---

## §2 — L'étiquette ne suffit pas (règle générale)

Plusieurs écrans se croyaient couverts par une note « données de démonstration ».
**Elle ne couvre rien.** Décision fondateur du 21/07 sur la course simulée : « le
bandeau n'y changeait rien — c'est un run fabriqué à la place du sien ».

Règle générale qui en découle : **une donnée fabriquée ne devient pas honnête
parce qu'on l'étiquette.** Soit elle est réelle, soit elle n'est pas affichée.
La seule exception est l'onboarding, qui a le droit d'ILLUSTRER — à condition que
l'exemple enseigne sans être attribué au joueur, et surtout **sans être célébré**
(compteur héros + haptique de succès + event de célébration = célébration).

---

## §3 — Pourquoi localhost ne suffisait pas non plus

Couper la démo ne rendait pas localhost fidèle. `src/lib/session.web.tsx` forçait
en dur `{ session: null, configured: false }` : la cible web était **figée dans
l'état déconnecté**, quelles que soient les clés Supabase présentes.

Le fondateur aurait donc obtenu un **troisième état qui n'existe sur aucun
téléphone** : ni vitrine, ni produit connecté. Le web utilise désormais la vraie
session Supabase (l'auth fonctionne en navigateur ; les clés sont déjà dans
`apps/mobile/.env`).

C'est ce qui rend la demande réalisable : **`localhost:8081` = ce que l'iPhone
affichera**, ce qui compte d'autant plus que les builds EAS sont bloqués par le
quota Expo jusqu'au 1er août.

---

## §4 — La vitrine est alignée, le lien public déménage

### Ce que cette section affirmait à tort

La première rédaction de ce §4 déclarait, le matin même : « le mode vitrine est
abandonné : plus aucune surface de GRYD n'affiche de données fabriquées. »
**C'était faux au moment où c'était écrit.** `isShowcasePlatform` vivait encore
dans 34 fichiers, et la phrase décrivait une intention, pas le code. Elle est
corrigée ici parce qu'un document d'amendement ne doit jamais donner une garantie
que le code ne tient pas — c'est la même faute que l'app affichant une donnée
fabriquée : une affirmation plus confortable que la réalité.

### Ce qui est VRAI après le passage de nettoyage (21/07/2026)

- `isShowcasePlatform` **n'existe plus** : l'export est supprimé de
  `src/lib/flags.ts`, plus aucun fichier ne le référence (hors commentaires
  d'historique). `EXPO_PUBLIC_SHOWCASE` est retiré de `.env.example` et du README.
- **Le typage est devenu le verrou.** `territoryGeoByState`, `territoryStateLayers`
  et `battleGameLayers` prennent désormais `real: readonly RealTerritory[]`
  **requis et non-nullable**. L'ancien défaut `real = null` signifiait « pas de
  vraies données ⇒ peins la démo » : il confondait un état de CHARGEMENT avec un
  feu vert pour inventer. Oublier l'argument ne compile plus.
- Ce verrou a **révélé une fuite réelle** que les six lots avaient manquée :
  `RoutePlannerMap` appelait `territoryStateLayers(emph)` sans 4ᵉ argument et
  peignait donc le faux Paris conquis (boucle République, Lille, couloir rival de
  Lyon) sous l'itinéraire de tout joueur, où qu'il soit. Il lit maintenant les
  vraies captures.
- **Le bouton central de la Carte ne ment plus.** `deriveContextualAction` lisait
  `battleContext()` — dérivé de `fakeHexes` et de `warroom/demo` — et annonçait
  « CONQUÉRIR / DÉFENDRE ta zone » puis partait sur un itinéraire de démo. La
  lecture d'écran est supprimée : sans sélection réelle, le bouton dit **RUN**,
  la seule action toujours vraie (GRYD classe conquis/défendu après la course,
  d'après le tracé réel).
- **Couches supprimées, pas re-gardées** : zone bonus, route « recommandée »,
  aperçu de parcours, secteurs agrégés de Paris, marqueurs-points villes
  (`FRANCE_CITIES_DEMO`, labels « LYON · RIVAL »). Aucune n'avait de source
  réelle. La spec de STYLE `SECTOR_STATUS_SPEC` (§C) est conservée intacte : le
  rendu reviendra branché sur `sector_snapshot`, pas sur de la démo.
- **Fichiers démo sans aucun appelant, supprimés** : `crew/publicDemo.ts`,
  `territory/pageDemo.ts`, `territory/leaderboardDemo.ts`, `badges/demo.ts`,
  `onboarding/syncDemo.ts`, `map/sectorsDemo.ts`, `warroom/demo.ts`, plus deux
  modules morts qui les consommaient (`map/opportunities.ts`, `nav/RunButton.tsx`).

### Le lien public déménage

Le build mobile-web ne démontre plus rien à un visiteur sans compte (écran de
connexion + états vides). Le lien public `skanebody.github.io/Gryd` **doit donc
pointer vers `apps/web`** — le vrai site Next.js, qui existait déjà pour ça :
waitlist par code postal, page abonnement, mentions légales, CGV. Son rôle est
d'**expliquer GRYD et de recueillir des inscriptions**, sans qu'un visiteur ait
besoin d'un compte.

> ⚠️ **Cette section a d'abord écrit « il explique GRYD sans fabriquer de
> joueurs » — au présent, alors que c'était faux.** C'est exactement la faute que
> le paragraphe « Ce que cette section affirmait à tort » ci-dessus s'engageait à
> ne plus commettre : une garantie donnée avant que le code la tienne. Au moment
> où la phrase a été écrite, `apps/web/lib/landing.ts` portait encore
> `SEASON0.runnersWaiting = 1_240`, `SEASON0.crews = 30` et un podium de crews
> inventés, réutilisés par le hero, la boucle de gameplay et l'onglet crews.
> Le nettoyage a été fait DEPUIS, et seulement depuis : voir la ligne fermée dans
> « Ce qui reste EN SUSPENS ». La leçon reste inscrite ici parce qu'elle vaut
> au-delà de ce fichier — **la phrase a précédé le code de plusieurs heures, et
> pendant ces heures elle était un mensonge de documentation.**

Le build mobile-web reprend son seul usage légitime : **l'instrument de preview
du fondateur, sur localhost.**

### Ce qui reste EN SUSPENS (état réel, pas intention)

> **Comment lire cette liste.** C'est la SEULE partie du document qui dit ce qui
> n'est PAS fait : elle doit rester exhaustive et datée, jamais rassurante. Une
> entrée disparaît quand le code la ferme — pas quand une intention est prise.
> Elle a été complétée le 21/07/2026 : il y manquait `apps/web`, c'est-à-dire la
> surface que §4 venait de déclarer propre.

- ~~**`apps/web` fabrique encore des joueurs.**~~ **FERMÉ le 21/07/2026** —
  cette ligne s'efface parce que le fichier a été rouvert et relu, comme elle
  l'exigeait. `lib/landing.ts` : 307 → 77 lignes ; il ne reste que la superficie
  IGN et la géométrie d'une légende. Supprimés : `SEASON0` (1 240 runners, 30
  crews), `DEMO_LEADERBOARD`, `FAKE_WAITLIST_COUNTS` (« 173 places restantes » —
  une rareté inventée qui poussait à l'inscription), le flux territoire « EN
  DIRECT », le HUD `RAID LIVE`, les podiums de personnes nommées, les statuts par
  ville (« Lille · Guerre ouverte »), et les faux chiffres de performance.
  Deux défauts trouvés au passage : `useCountUp` publiait « 0 km² capturables »
  avant animation (donc au rendu serveur et sans JS), et « Paris Est » était
  tronqué. Corrigés.
  Restent à traiter, hors périmètre du lien public : le dashboard `/admin`
  (données PRNG derrière un login — à trancher) et des seuils codés en dur dans
  `dictionary.ts` (règles annoncées, pas mesures inventées, mais nombres magiques
  au sens de CLAUDE.md).
- **`DemoCourseLive` (`app/course-live.tsx`) est encore dans le fichier.** Il n'a
  plus aucun appelant — `useRealRun` renvoie `RunUnavailable` quand le GPS manque,
  donc aucune course fabriquée n'est atteignable — mais le code reste présent,
  ainsi que la chaîne qu'il alimentait (`run/liveNav.ts` → `route/demo.ts`, avec
  ses checkpoints nommés « Passerelle Alibert »). Le lot propriétaire a
  délibérément différé son retrait : ces vues partagent des sous-composants avec
  le live réel et les démêler est un chantier à part. **Tant qu'il est là, la
  garantie tient par un seul point de contrôle (`gate.kind`), pas par le typage.**
- **Le redéploiement du lien public n'est pas fait** : c'est une action
  d'hébergement (côté fondateur), pas un changement de code. Tant qu'elle n'est
  pas faite, `skanebody.github.io/Gryd` sert encore l'ancien bundle mobile-web.
- **« localhost = ce que l'iPhone affichera » a des limites, et §3 ne les disait
  pas.** Trois surfaces divergent par construction, pas par négligence : le rendu
  de carte est un fork web (`RealMap.web.tsx`, pas MapLibre natif) ; le GPS passe
  par l'API navigateur et non par `expo-location` ; et l'étape compte n'offre
  **ni Apple ni Google** sur web — ces deux fournisseurs n'ont aucun chemin
  utilisable dans un navigateur tant qu'**O2** est ouvert (identifiants Google
  placeholders, Apple Services ID + secret non créés, URL de redirection
  `http://localhost:8081` non allowlistée côté Supabase). L'onboarding et
  `(auth)/sign-in.web.tsx` les MASQUENT désormais au lieu de peindre des boutons
  qui échouent toujours (21/07/2026) — mais cela veut dire qu'une validation sur
  localhost ne dit rien de la connexion par fournisseur ni du rendu carte/GPS :
  ces trois-là se vérifient sur l'iPhone, donc après le 1er août.
- Fichiers démo **encore appelés**, à traiter par les lots propriétaires :
  `route/demo.ts` (via `liveNav`, `popularRoutes` — ce dernier orphelin),
  `crew/demo.ts` + `crew/eventsDemo.ts`, `social/demo.ts`, `map/demo.ts`,
  `history/demo.ts` + `demoRuns.ts`, `performance/demo.ts` (type seul),
  `motivation/demo.ts` (catalogue légitime), `share/demo3d.ts` (angles de caméra).
  Plusieurs sont inoffensifs (types, constantes de rendu, catalogue de contenu) —
  la liste est un point de contrôle, pas une liste de fautes.

## §5 — Ce qui reste vrai après ce chantier

- Les fichiers `demo.ts` ne sont pas supprimés par principe : ce qui compte est
  que **plus rien ne les appelle** sur une surface visible. Une donnée fabriquée
  qui n'a aucun appelant ne peut mentir à personne.
- Les trois états restent DISTINCTS partout — déconnecté / vide / échec. Les
  confondre est la faute la plus fréquente trouvée par l'audit : un échec réseau
  affiché comme « tu n'as rien », ou pire, comblé par de la démo.
- Un état vide n'est pas un écran blanc : il dit ce qui n'existe pas encore et
  propose UNE action (§A, 1 CTA chartreuse max).
