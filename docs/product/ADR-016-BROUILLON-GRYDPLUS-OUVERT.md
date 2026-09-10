# ADR-016 (BROUILLON) — 2026-09-11 — Les outils GRYD+ sont ouverts tant que personne ne peut payer

> **Statut : BROUILLON.** Ce document n'est PAS `docs/DECISIONS.md` et ne s'y substitue pas.
> Il est écrit pour que le fondateur l'intègre lui-même, mot pour mot ou corrigé. Tant qu'il
> n'y est pas, l'ADR opposable sur ce point reste ADR-011, et ce fichier documente un écart
> assumé entre le code et la lettre d'ADR-011.

## Le fait, avant toute décision

Trois faits de dépôt, vérifiés le 11/09/2026 :

1. **Personne ne peut payer.** Aucun produit n'existe côté App Store Connect, aucune clé
   RevenueCat de production n'est posée dans les environnements EAS, et `capability.ts` refuse
   délibérément toute clé qui n'est pas une clé de production (`appl_` / `goog_`). Conséquence
   mécanique : `purchasesCapability()` rend `available: false`, `usePremium` tombe en
   `unavailable`, et `storeAvailability2026()` rend `{ open: false, reason: 'notConfigured' }`
   (ou `'platform'` sur le web).
2. **Les outils étaient murés derrière un droit que personne ne pouvait obtenir.** Les
   comparaisons privées (`/premium-analytics`) et les compositions du Studio de partage se
   fermaient toutes deux sur `access.active`, c'est-à-dire sur un reçu serveur
   (`get_gryd_plus_access_2026`) qu'aucun achat ne pouvait produire. Le mur valait donc pour
   100 % des comptes, définitivement.
3. **ADR-014 l'avait constaté sans le trancher** (écart n° 3, 10/09/2026) : « Ouvrir puis
   reprendre heurterait "aucune capacité déjà offerte ne deviendra payante" ; laisser muré
   maintient un mur sans porte. Seul le fondateur tranche. »

## La décision du fondateur, mot pour mot

À la question « ouvrir ou non les outils GRYD+ (comparaisons privées, Studio) tant que rien
n'est en vente ? », le 11/09/2026 :

> « ouvre, faut les mettre en place si quelqu'un paie »

### Sa lecture, en deux temps

**Temps 1 — aujourd'hui.** Rien n'est en vente, donc les outils GRYD+ sont **ouverts à tout
compte connecté**, avec une phrase honnête qui nomme le régime : « Inclus gratuitement jusqu'à
l'ouverture de GRYD+. » Aucun bouton d'achat n'apparaît, puisque aucun achat n'est possible.

**Temps 2 — le jour de l'ouverture.** Dès qu'une offre est lue avec un prix confirmé, les
outils **redeviennent réservés aux abonnés**, et c'est le droit serveur
(`sync_gryd_plus_access_2026` puis `get_gryd_plus_access_2026`) qui décide seul, comme
aujourd'hui pour un abonné réel.

## Ce que ça change pour ADR-011

Cette décision **contredit la lettre** d'ADR-011, qui pose : « **Aucune capacité déjà offerte
ne deviendra payante.** Les entrées `freeForever: true` de `GRYD_CAPABILITIES` existent pour
ça — les reprendre serait retirer au joueur ce qu'il avait, ce que la règle anti-pay-to-win
(règle 10) interdit dans l'esprit. »

Trois précisions, pour que la contradiction soit lue exactement pour ce qu'elle est :

- **Elle est une décision fondateur, pas une dérive de code.** ADR-011 exigeait lui-même « un
  ADR à part » pour ouvrir un catalogue ; celui-ci en est un, et il est explicite sur ce qu'il
  reprend.
- **Elle ne touche pas au pay-to-win** (règle 10, constitutionnelle). Les trois outils
  concernés — comparaisons privées, compositions Studio, variantes de saison — sont
  cosmétiques, analytiques et privés. `noPaidGameAdvantage2026()` reste vrai :
  `paidCaptureMultiplier`, `paidXpMultiplier` et `paidChallengeMultiplier` valent 1, et
  `virtualCurrency` vaut `false`. Rien de ce qui se gagne sur le terrain ne change.
- **Elle ne touche pas non plus aux capacités `freeForever`.** Le suivi sportif, le journal,
  les statistiques de base, le jeu, les défis, les crews et les exports simples restent
  gratuits, avant comme après l'ouverture. Ce qui est ouvert puis repris, ce sont les
  **outils GRYD+ eux-mêmes**, annoncés comme tels dès la première ligne de l'écran.

**Ce qui n'est PAS tranché ici** : la tension n° 11 d'ADR-013 (« ADR-011 vs GRYD+ ») reste
ouverte. Ce brouillon ne met rien en vente, ne déclare aucun produit, ne touche pas
`flags.paidOffer`, et ne configure toujours pas le SDK (`noReachableCaller.test.ts` verrouille
la liste des appelants — elle est inchangée).

## La règle de bascule

**Elle est mécanique, pas manuelle.** Aucun drapeau à basculer à la main, aucune date écrite
nulle part :

```
ouverts en pré-vente  ⟺  storeCannotSellYet2026(storeAvailability2026(…)) === true
                          ET l'utilisateur est connecté
                          ET son reçu serveur a été LU (et ne dit pas « actif »)
```

`storeCannotSellYet2026` rend `true` pour quatre motifs, et quatre seulement — ce sont les
seuls qui **affirment** que personne ne peut payer :

| Motif              | Fait |
| ------------------ | ---- |
| `notConfigured`    | aucune clé de production : la boutique n'est pas raccordée |
| `platform`         | ni StoreKit ni Google Play ici (web, module natif absent) |
| `nothingOnSale`    | raccordée, mais aucun produit publié |
| `noConfirmedPrice` | des produits, mais aucun prix confirmé |

Et elle rend `false` pour les trois motifs qui **n'affirment rien** — `checking` (lecture en
cours), `signedOut` (pas de compte), `readFailed` (lecture échouée) : ouvrir sur une
non-réponse serait le même mensonge que fermer sur une non-réponse (L8 / L14 / L19).

**Le jour de l'ouverture, la bascule se fait donc toute seule** : une offre lue avec son prix
rend `storeAvailability2026()` ouverte, `storeCannotSellYet2026()` retombe à `false`, et
`grydPlusAccessState2026` rend `inactive` pour qui n'a pas de droit serveur.

### Le préavis, à définir

Reprendre en silence serait exactement ce que redoutait ADR-014. Deux niveaux existent
aujourd'hui, un troisième reste à décider par le fondateur :

1. **Fait** (fait) — le bandeau dit « Inclus gratuitement jusqu'à l'ouverture de GRYD+. »
2. **Règle** (fait) — `/premium` et `/abonnement` ajoutent : « Le jour où GRYD+ sera mis en
   vente, ces outils redeviendront réservés aux abonnés. Aucune date n'est fixée. » Aucune
   date n'est promise : ni le cahier §16.1 ni ADR-011 n'en fixent une, et ADR-011 interdit le
   « bientôt disponible ».
3. **Préavis daté** (À DÉCIDER) — combien de jours avant l'ouverture l'application prévient-elle,
   et par quelle surface (bandeau, notification, écran dédié) ? Rien n'est écrit dans le code
   tant que le fondateur n'a pas tranché : un préavis inventé serait une promesse de plus.

## Ce que le code fait maintenant

- `apps/mobile/src/features/premium/plan2026.ts` — `storeCannotSellYet2026(availability)`,
  pure, testée sous Deno : les quatre motifs qui ouvrent, les trois qui n'ouvrent pas.
- `apps/mobile/src/features/premium/access2026.ts` — `grydPlusAccessState2026` prend
  `storeCannotSell` et rend un troisième champ `reason`
  (`'server_entitlement'` | `'pre_sale_open'` | `null`) plus un statut `preSaleOpen`. Ordre des
  verdicts : `loading` → `signedOut` → `loading` (reçu non lu) → `unavailable` (reçu illisible)
  → `active` (droit serveur) → `preSaleOpen` → `pending` → `inactive`.
- `apps/mobile/src/features/premium/useGrydPlusAccess.ts` — lit l'offre courante dans le même
  lot de requêtes que le reçu serveur et le CustomerInfo, borné par la même patience
  (`STORE_READ_PATIENCE_MS`), et dérive `storeCannotSell` par les mêmes primitives que
  `usePremium`. Aucun appel réseau supplémentaire aujourd'hui : sans clé, l'offre n'est pas
  demandée.
- Les écrans distinguent `subscribed` (`access.active && !included`) de `included`
  (`access.reason === 'pre_sale_open'`) : « Abonnement actif », l'échéance et « Gérer mon
  abonnement » ne s'affichent que pour un abonnement RÉEL.

## Ce qui reste à faire

1. **Intégrer cet ADR dans `docs/DECISIONS.md`** (le seul acte qui le rend opposable), et y
   fermer l'écart n° 3 d'ADR-014.
2. **Décider le préavis** (point 3 ci-dessus) et l'écrire.
3. **Le Studio de partage** (`src/features/share/**`) s'ouvre déjà par le hook, mais ses mots
   n'ont pas été relus : il écrit encore « Composition incluse avec GRYD+ » quand l'accès est
   ouvert, ce qui nomme un abonnement que le joueur n'a pas. À reprendre dans un lot
   `share/**` (ce lot-ci n'a pas le droit d'y toucher : un autre agent y travaillait).
4. **Vérifier sur appareil** que `get_gryd_plus_access_2026` répond bien pour un compte réel :
   si la RPC échoue, l'état reste `unavailable` (« on ne sait pas ») et les outils NE
   s'ouvrent PAS. C'est voulu, mais cela signifie que l'ouverture dépend d'un backend joignable.
5. **Les six points d'ADR-014 « pour qu'un achat soit possible »** restent entiers : produits
   App Store Connect, offerings RevenueCat, clé de production EAS, déclarations « App Privacy »,
   recette sandbox des sept états de G28, bénéfices P1 réellement utilisables.
