# GRYD — Reprise de session

> À lire EN PREMIER dans une nouvelle session. Établi le 01/08/2026.
> `main` = `268c345`. Gate vert. Backend appliqué jusqu'à `0106`.

---

## 1. Où en est le projet

**Le gate, en une commande** — rien ne se commit sans son vert :

```bash
npm run gate
```
typecheck 4/4 · sync sans drift · `audit:migrations` · **152** packages + **2222** mobile
+ **1457** edge + **32** fichiers SQL.

Trois vérifications **hors** gate, à lancer selon le chantier :

```bash
node scripts/audit-routes.mjs                                   # aucune route orpheline
npm run test:map                                                # gate carte séparé
set -a && . ./scratchpad-secrets.local && set +a && npm run verify:rls   # RLS RÉELLE (réseau + secret)
```

**Backend** : migrations `0001` → `0106` **appliquées en production** (projet `gryd`,
`sydwxwwirinjoheeodcg`). Base **non vide** : 3 comptes réels, 35 397 lignes publiques
(34 969 communes, 204 badges…), mais **vide de jeu** — 0 course, 0 territoire, 0 crew.

⚠️ **Cursor pousse sur le même projet.** Toujours `supabase migration list --db-url …`
avant un push : une migration écrite ailleurs peut être en attente.

---

## 2. Les décisions du fondateur, encore chaudes

**Les saisons sortent du MVP** (`0106`). Le job `gryd_season_close` est déplanifié et
`resetSeason` n'efface plus rien — il supprimait *toutes* les lignes `hex_claims` chaque
nuit, ce qui aurait rasé la carte des comptes réels. `SEASON_RESET_KEEPS.territory` et
`.shields` valent désormais `true`. Rien n'est supprimé : le moteur resservira, mais une
saison remettra alors à zéro **le tableau** (points, rangs), jamais **la carte**.

**Simplifier au maximum.** Direction explicite : « on se complique la vie […] il faut
faciliter au max le jeu pour les utilisateurs ».

**Le monde est capturable.** `0104` puis `0105` : un territoire ne devient public qu'avec
**3 propriétaires distincts** dans le même carreau de ~11 km, même discipline. Leçon
Strava 2018 — à faible densité, une zone *nommée* révèle une personne et un lieu. Ça ne
bloque **aucune** capture, seulement la visibilité par autrui.

---

## 3. La suite, par ordre de valeur

**① Retirer de la navigation ce qui exige une densité absente.** C'est la suite directe
de « simplifier au max », et le plus rentable. Saison (E59/E60/E61), classements, crews :
les écrans existent et ne mentent pas, mais un onglet désert enseigne au joueur que le jeu
est mort alors qu'il est jeune. Ne rien supprimer — retirer la **porte**.
Le jeu se réduit alors à ce qui marche seul : courir, fermer, prendre, tenir.

**② Le pionnier permanent.** Le seul moteur d'envie qui fonctionne à un joueur, et son
stock diminue chaque jour. `pioneer` existe dans le moteur, traité comme un simple bonus
de points. En faire un **badge qui nomme le lieu et la date**, que rien ne reprend.

**③ Le decay dégressif.** Récompenser la durée : plus on tient, plus on tient facilement.
Fonction **pure** dans `packages/engine` + tests **avant** tout branchement — ça touche
l'équilibre. Débloqué depuis que le reset de saison n'efface plus.

**④ Le classement départemental côté écran.** `dept_player_surface_board` (`0103`) est
posée et prouvée sur les 34 969 communes ; **aucun écran ne la consomme** — le sélecteur
propose « ville », pas « département ».

**⑤ La vérification de bout en bout sur appareil.** Rien de ce qui a été livré n'a tourné
sur un vrai téléphone. Build EAS + une sortie de 10 min. **Seul le fondateur peut le faire.**

---

## 4. Les pièges de ce dépôt, payés cher

Chacun est un bug qui a réellement existé — pas une hypothèse.

1. **Un filtrage de vie privée côté client ne protège personne.** Deux fois en juillet
   (zones d'un rival, mode discret) : la donnée fine avait déjà quitté le serveur. Toute
   règle de confidentialité s'applique **là où la donnée est écrite**. Vérifier en lisant
   les migrations, jamais les noms de fonctions.
2. **Deux fuites de position vers des tiers** (Nominatim, puis OSRM) pendant qu'un docblock
   affirmait le contraire. Tout appel réseau : arrondir l'origine, **déclarer le
   sous-traitant** dans `i18n/catalog/legal.ts`, mettre à jour `LEGAL_LAST_UPDATED`.
3. **Un test qui fige un APPEL au lieu de garder une RÈGLE** rougit sur un argument ajouté
   et bloque du travail légitime. Garder le comportement, pas la syntaxe.
4. **Deux migrations au même préfixe `0087`** — `db push` en aurait ignoré une en silence.
   `npm run audit:migrations` garde ça maintenant.
5. **Une file d'envoi qui s'écrasait elle-même** : un stockage illisible se lisait « file
   vide », donc une écriture pouvait remplacer trois courses par une.
6. **PGlite ne prouve PAS la RLS** (superutilisateur, ni rôles ni PostGIS). Il prouve du
   SQL indépendant du rôle. `npm run verify:rls` fait le reste, hors gate.
7. **Le pire bug de la session n'était couvert par aucun test** : `resetSeason` supprimait
   toute la carte, et les 12 tests de `season_close` passaient — ils testaient les rangs.
   *Un test vert ne dit rien de ce qu'il ne regarde pas.*

---

## 5. Comment orchestrer (le patron qui a marché)

Le quota d'agents est réinitialisé. La forme qui a produit les meilleures vagues :

**Phase 1 — Fondation, UN agent.** Il possède **seul** `game-rules.ts`, `events.ts` et les
catalogues i18n. Sans ça, dix agents parallèles se marchent dessus. Consigne clé : *vérifier
par grep qu'une constante équivalente n'existe pas* — ce dépôt en a des centaines, un
doublon est pire qu'un manque.

**Phase 2 — Écrans, en parallèle, partitionnés par PROPRIÉTAIRE DE FICHIER.** Jamais deux
agents sur le même fichier : ça a déjà provoqué la **suppression** d'un fichier ici. Quand
deux écrans partagent un composant, partitionner par *branche* et le dire.

**Phase 3 — Trois auditeurs adversariaux, lentilles DISTINCTES**, `effort: 'high'` :
*donnée fabriquée / quatre états* · *bouton mort, §A, charte* · *fondations et régressions*.
Consigne : **prouver fichier:ligne**, liste vide si rien, ne jamais fabriquer de grief.
C'est cette phase qui a trouvé la surface surestimée, les deux fuites, la destruction de
file et le crew orphelin — **jamais le constructeur**.

**Phase 4 — Correction + gate**, `effort: 'high'`. Ne jamais désactiver un test.

**Modèles** : laisser les agents hériter du modèle de session (presque toujours correct).
Ne surcharger que sur conviction forte — `effort: 'low'` pour du mécanique, `'high'` pour
les auditeurs et la correction.

**Taille** : viser 11–15 agents par vague. Au-delà, les collisions coûtent plus que le
parallélisme ne rapporte.

---

## 6. Ce que seul le fondateur débloque

| Sujet | Effet aujourd'hui |
|---|---|
| `app.json` — `LSApplicationQueriesSchemes` | aucune pastille Instagram/TikTok sur natif |
| `app.json` — portée photothèque | pas de mode Photo dans le partage (geste Strava) |
| Appel OSRM automatique à l'ouverture d'E16/E17 | position arrondie et déclarée, mais l'appel reste sans geste |
| Credentials APNs/FCM | notifications non livrées (E10 et E71 le disent) |
| **O8** — compte Apple Developer / dev build | HealthKit et Health Connect restent des stubs honnêtes |
| Vérification sur appareil | **aucun** parcours joué de bout en bout |

---

## 7. Documents à lire, dans cet ordre

`SOURCE_OF_TRUTH_REGISTER.md` → `docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md` →
`CLAUDE.md` + `GRYD_REGLES_NON_NEGOCIABLES.md` (**la constitution prime sur la spec**).

Briefs de chantier déjà écrits : `CHANTIER_TRACE_INGEST.md` (fait),
`CHANTIER_TRACE_SANTE.md` (à faire après O8), `PLAN_VAGUES_7_A_10.md`,
`PROMPT_CURSOR_VAGUES_8_A_10.md`.

⚠️ `AUDIT_GRYD.md` est **périmé** — sept vagues depuis. Auditer soi-même par grep, toujours.
