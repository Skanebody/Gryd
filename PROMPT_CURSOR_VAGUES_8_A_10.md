# Prompt pour Cursor — finir les vagues 8, 9 et 10 de GRYD

> À coller tel quel dans Cursor, en mode agent, à la racine de `/Users/benjaminbel/KLAIM RUN`.
> Établi le 28/07/2026, `main` = `5515cf0`, gate vert (3 851 tests + 31 fichiers SQL).

---

## §0 — LA LOI (elle prime sur tout le reste de ce prompt)

Tu travailles sur **GRYD**, un jeu de conquête de territoire par la course à pied.
Monorepo : `apps/mobile` (Expo RN 0.76), `apps/web` (Next 15), `packages/shared`,
`packages/engine`, `supabase/`.

**Autorité documentaire, dans cet ordre strict :**
1. `SOURCE_OF_TRUTH_REGISTER.md` — arbitre l'autorité entre docs.
2. `docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md` — source de vérité produit (écrans E00–E79).
3. `CLAUDE.md` + `GRYD_REGLES_NON_NEGOCIABLES.md` — **la constitution, qui prime sur la spec**.

**LA CONSTITUTION — non négociable, elle gagne contre la spec en cas de conflit :**

1. **L'APP NE MENT JAMAIS.** Données RÉELLES ou VIDES, jamais fabriquées. **Quatre états
   DISTINCTS et jamais confondus** : pas connecté / connecté mais vide / échec de chargement /
   lecture EN COURS. Jamais d'écran blanc, de spinner infini, de « 0 » nu, ni de repli inventé.
   Un chargement n'affirme rien sur le joueur.
2. **AUCUN BOUTON MORT.** L'affichage se dérive de la capacité RÉELLE, pas de l'apparence.
3. **ANTI PAY-TO-WIN STRICT** : aucun achat ne donne territoire, points, vitesse ni protection.
   Verrou : `supabase/functions/ingest_run/anti_pay_to_win_test.ts`.
4. **Tout claim est décidé SERVEUR.** Le client n'attribue jamais un territoire.
5. **Une doc ne promet jamais au-delà du code.**
6. **AUCUN HEXAGONE visible** : le territoire est POLYGONAL, H3 est un index interne.
7. **Confidentialité géospatiale** : aucune position exacte en direct visible par autrui ;
   départ/arrivée masqués ; zones privées exclues ; publication différée.
8. **Zéro donnée européenne factice.**
9. **Les prix viennent du Store ou d'une remote config**, jamais du code.

**Règles de fabrication :**
- Aucun nombre magique hors `packages/shared/src/game-rules.ts`.
- Ne JAMAIS éditer `supabase/functions/_shared/` à la main (`node scripts/sync-game-rules.mjs`).
- i18n **5 langues** (fr/en/es/de/pt). FR **tutoie** ; PT est **brésilien** (`você`), jamais
  `teu/tua`. Deux tests verrouillent ces règles : `apps/mobile/src/i18n/catalog/registre.test.ts`.
- Events PostHog depuis `packages/shared/src/events.ts`, **aucune PII**. Toute route à segment
  dynamique doit être inscrite dans `apps/mobile/src/lib/screenName.ts`.
- Toute logique de règle = fonction **PURE** + tests Deno.
- §A épuration : 1 écran = 1 décision + **1 seul CTA chartreuse** ; jamais de card dans une card ;
  cible tactile **44×44 réelle**.

⚠️ **LE BACKEND EST EN PRODUCTION** (migrations 0001→0099 appliquées) et la base contient
**3 comptes réels** + 35 397 lignes. Toute migration neuve doit être **ADDITIVE**.

---

## §1 — LE GATE (rien ne se commit sans le vert)

```bash
npm run gate            # typecheck 4/4 + sync sans drift + audit:migrations + tests packages/mobile/edge/SQL
node scripts/audit-routes.mjs   # doit sortir en 0
npm run test:map
```

Ne désactive **jamais** un test pour passer. Si un test change légitimement, mets-le à jour **et
explique pourquoi dans son corps**.

---

## §2 — CE QU'IL FAUT FAIRE, DANS CET ORDRE

### Lot A — 415 lignes de code mort à trancher *(commence par là, c'est rapide et ça nettoie)*

Quatre modules ont été écrits par des agents interrompus en cours de route. Ils sont purs,
testés… et **personne ne les consomme**. La constitution interdit le code mort.

| Module | Lignes | Écrans qui l'utilisent |
|---|---|---|
| `apps/mobile/src/features/map/mapLayers.ts` | 292 | **0** |
| `apps/mobile/src/features/map/mapAnalytics.ts` | 123 | **0** |
| `apps/mobile/src/features/run/degraded/pauseModel.ts` | — | à vérifier |
| `apps/mobile/src/features/run/degraded/signalHealth.ts` | — | à vérifier |

Pour chacun : **soit tu le branches** (il répond alors à un besoin réel des écrans du lot B),
**soit tu le supprimes avec ses tests**. Un test vert sur un chemin que rien n'exécute est un
faux vert — c'est pire que pas de test.

### Lot B — Les 6 écrans de la vague 8 qui n'ont jamais été faits

| Écran | Spec | Fichier |
|---|---|---|
| E11 Carte principale | l.829 | `apps/mobile/app/(tabs)/index.tsx`, `features/map/MapScreen*.tsx` |
| E12 Couches et filtres | l.902 | `features/map/BattleMapOverlays.tsx` |
| E20 Activité Run active | l.1110 | `app/course-live.tsx`, `features/run/gps/RealCourseLive.tsx` |
| E21 Activité Bike active | l.1150 | idem |
| E23 Pause | l.1185 | `features/run/degraded/` |
| E24 GPS faible / récupération | l.1201 | idem |

*(E18 planificateur est fait et câblé — n'y touche pas.)*

**Le risque ici n'est pas le manque, c'est la RÉGRESSION.** Ces écrans portent sept amendements
et quatre batchs carte. **Lis `AMENDEMENT-16`, `-20`, `-21`, `-37` à la racine AVANT d'écrire.**
Si tu changes un comportement qu'un amendement a posé, tu dois le justifier en citant la spec.

Deux exigences propres à E20/E21 : Run et Bike sont **strictement séparés** (aucune métrique ne
fuit d'une discipline à l'autre — les règles sont dans `activityRules`), et ces écrans tournent
**30 à 90 minutes GPS actif, écran allumé** : une animation permanente ou un re-render à chaque
fix est un défaut produit, pas du style.

Pour E24 : **ne fabrique jamais une position pour lisser le tracé.** Un trou dans la trace est
vrai ; une interpolation inventée est un mensonge qui finira dans un verdict de capture.

### Lot C — Vague 9 : résultats et réglages

| Écran | Spec |
|---|---|
| E29 Résultat : conquête | l.1290 |
| E31 Résultat : défense | l.1329 |
| E32 Résultat : sortie libre | l.1344 |
| E76 Modifier le profil | l.2320 |
| E77 Confidentialité et sécurité | l.2338 |

⚠️ **`app/course-result.tsx` a été modifié trois fois cette semaine et porte des gardes.**
Lis ses docblocks AVANT d'écrire. En particulier la garde `interiorPartial` : quand l'intérieur
capturé est partiel (plafond quotidien, zone privée, zone interdite, cellule tenue par un rival),
**la surface DISPARAÎT** au lieu d'être fausse. Elle n'est pas remplacée par un ratio — aucun
chiffre exact n'est calculable, et un ratio inventé serait plausible ET faux. Des tripwires dans
`resultVariant.test.ts` relisent la source : ils casseront si tu la défais.

E32 : une course sans capture **n'est pas un échec**. La distance est réelle, elle se dit. Pas de
culpabilisation, et **aucune promesse de revue anti-triche** (piège documenté dans
`i18n/catalog/result.ts` à propos de `flagged`).

### Lot D — Vague 10 : le backfill des territoires *(le plus important, et le plus piégeux)*

C'est le seul moyen de rendre la carte **complète** après que le repli hexagonal a été coupé.
Aujourd'hui, une capture réelle sans polygone est simplement **invisible**.

🚨 **UN AGENT A DÉJÀ REFUSÉ D'ÉCRIRE CE BACKFILL, ET IL AVAIT RAISON.** Reconstruire un polygone
depuis des **cellules H3** injecterait des contours **hexagonaux** dans la colonne polygonale,
**indistinguables des vrais**. Le backfill n'est légitime **que** s'il part de la **trace GPS**
de la course source (table `runs`). Les courses sans trace exploitable **restent sans géométrie**,
et la carte doit continuer à le dire.

Migration ADDITIVE, testée en PGlite (`npm run test:sql`).

---

## §3 — LES PIÈGES DE CE DÉPÔT, PAYÉS CHER CETTE SEMAINE

Ce ne sont pas des hypothèses : chacun est un bug qui a réellement existé dans ce code.

1. **Le filtrage de vie privée côté client ne protège personne.** Deux fois cette semaine, une
   donnée fine avait déjà quitté le serveur et n'était masquée qu'à l'affichage — invisible pour
   soi, visible pour tous les autres. Toute règle de confidentialité doit être **appliquée
   serveur**, dans une vue ou une RPC. Vérifie-le en lisant les migrations, pas les noms.

2. **Deux fuites de position vers des tiers.** `Nominatim` puis `OSRM` recevaient la position
   du coureur **en pleine précision**, pendant qu'un docblock affirmait le contraire. Elle part
   maintenant arrondie (`coarseRoutingOrigin`). Si tu ajoutes un appel réseau : arrondis,
   **déclare le sous-traitant dans `i18n/catalog/legal.ts`**, et mets à jour `LEGAL_LAST_UPDATED`.

3. **Un test qui fige un APPEL au lieu de garder une RÈGLE.** Un tripwire exigeait la chaîne
   littérale `useRealTerritories(crewIds, activity)` et a rougi quand un lot légitime a ajouté un
   argument. Écris des gardes sur le **comportement**, pas sur la syntaxe exacte.

4. **Deux migrations avec le même préfixe `0087`.** `supabase db push` indexe dessus : l'une
   aurait été **silencieusement ignorée**. `npm run audit:migrations` garde ça maintenant.

5. **Une file d'envoi qui s'écrasait elle-même.** Un stockage illisible se lisait « file vide »,
   donc un chemin d'écriture pouvait remplacer trois courses en attente par une seule.

6. **PGlite ne prouve PAS la RLS** : il tourne en superutilisateur, sans rôles ni PostGIS. Il
   prouve du SQL indépendant du rôle. Pour la vraie preuve : `npm run verify:rls` (hors gate,
   exige `GRYD_SUPABASE_DB_URL`).

---

## §4 — COMMENT TRAVAILLER, ET SURTOUT COMMENT RENDRE

**Audite avant de construire.** Le dépôt est bâti à ~85 % et `AUDIT_GRYD.md` est périmé. Pour
chaque écran, établis toi-même par `grep` et lecture « ce qui existe déjà vs le vrai delta »,
en citant `fichier:ligne`. **Ne reconstruis jamais ce qui marche.** Si un écran est déjà
conforme, dis-le et n'y touche pas — c'est un résultat valide, plusieurs lots l'ont rendu.

**Fais une seconde passe en ADVERSAIRE.** Quand un lot est fini, relis-le en cherchant
activement à le **réfuter**, avec ces trois lentilles séparées :
- *Donnée fabriquée* — un état vide confondu avec un chargement ou un échec ; une statistique
  sur un échantillon vide ; une célébration déclenchée par un calcul client.
- *Bouton mort et §A* — une action peinte qui échoue toujours ; plus d'un CTA chartreuse ; une
  cible sous 44×44 ; un contour hexagonal.
- *Fondations* — nombre magique, langue i18n manquante, portugais européen, test tautologique,
  code mort, route orpheline.

Cette passe n'est pas cosmétique : dans les vagues précédentes, **c'est elle qui a trouvé les
vrais bugs** — une surface surestimée, deux fuites de position, une destruction de file, un crew
pouvant devenir orphelin. Le constructeur ne les avait pas vus.

**🚨 RENDS SUR `main`, PAS SUR UNE BRANCHE ORPHELINE.** Dix branches `cursor/*` existent sur ce
dépôt ; **huit sont mortes à 363 commits derrière `main`** parce qu'elles n'ont jamais été
fusionnées. Le travail y était bon et n'a servi à personne. Donc : travaille sur une branche
courte, **rebase sur `main`**, fais passer le gate, et **fusionne**. Une branche non fusionnée
est du travail perdu.

**Sois honnête dans le message de commit.** Dis ce qui est fait, ce que l'audit a trouvé, et ce
qui reste en suspens. N'écris jamais « terminé » pour quelque chose qui dépend encore d'une
fixture, d'une simulation ou d'un composant non branché.
