# GRYD — SOURCE OF TRUTH REGISTER

> **Reconstruit intégralement le 26/07/2026.** Remplace la version du 24/07/2026
> (100 lignes), qui avait deux jours et six chantiers de retard : elle ignorait le
> cahier **REFONTE DIRECTEMENT BRANCHÉE** (26/07), le document **PARTAGE SOCIAL
> 2026**, et la décision fondateur du **26/07 sur le vélo comme discipline réelle**.
> Elle laissait par ailleurs **116 des 131 documents du dépôt** dans une seule ligne
> « À RECLASSER » — c'est-à-dire non classés, donc citables par erreur comme autorité.
>
> Artefact mandaté deux fois : par la **Spécification Maître Unifiée 2026**
> (§ « PROTOCOLE DE FUSION ET SOURCE DE VÉRITÉ ») et par le **cahier REFONTE**
> (§13 « Fichiers à produire », §25 prompt d'exécution).

---

## 0. CE QUE CE REGISTRE PROUVE, ET CE QU'IL NE PROUVE PAS

**Il prouve :** quel document fait autorité sur quel sujet, à quelle date, contre
quel autre document — et lequel ne doit plus servir de référence d'implémentation.

**Il ne prouve rien sur le code.** Ce registre est produit en **Phase 0 — audit sans
modification**, alors qu'un autre chantier écrit en ce moment dans les `.ts`/`.tsx`
du dépôt. Toute observation de code ci-dessous est **datée, sourcée `fichier:ligne`,
et explicitement non certifiée** comme preuve de conformité. La conformité du code
est le lot de `CURRENT_STATE_CONFORMITY_MATRIX.md`, pas celui-ci.

**Règle du fondateur appliquée sans exception :** *l'existant n'est jamais une preuve
de conformité.* Aucune ligne de ce registre ne dit « déjà fait ». Les 15 lignes de
l'ancien registre qui affirmaient un statut ont toutes été re-vérifiées ou requalifiées.

### Vérifications matérielles faites pour ce registre

| Vérification | Méthode | Résultat |
|---|---|---|
| Spéc Maître du dépôt = celle du fondateur ? | `md5 docs/product/GRYD_SPEC_MAITRE_UNIFIEE_2026.md` vs `~/Downloads/GRYD_SPECIFICATION_MAITRE_UNIFIEE_UI_UX_RUN_BIKE_LOOP_I18N_2026.md` | **IDENTIQUES** — `53340493efe085cd7c7b38370fbfead1`, 3 973 lignes de part et d'autre. Le doublon `(1).md` de Downloads a le même md5. |
| Cahier REFONTE présent au dépôt ? | `find . -iname "*REFONTE_DIRECTEMENT*"` | **ABSENT** — 0 résultat hors `~/Downloads`. |
| PARTAGE SOCIAL présent ou couvert ? | `find` + `grep -rl "Flyover\|Sticker Stats\|STICKER TRANSPARENT" --include=*.md` | **ABSENT et NON COUVERT** — 0 résultat sur les 131 `.md` du dépôt. |
| Cahier visuel Claude Design présent ? | `find . -iname "*CAHIER_DES_CHARGES_VISUEL*"` | **ABSENT** — pourtant cité en tête du cahier REFONTE et par `docs/design/vague-1/README.md:11`. |
| Inventaire exhaustif des `.md` | `find . -name "*.md"` hors `node_modules`, `.git`, `.claude/worktrees` | **131 fichiers** : 78 racine · 45 `docs/` · 5 `.claude/orchestration-klaim/` · 3 `apps/`. |
| Nombre réel d'amendements | `ls -1 AMENDEMENT-*.md \| wc -l` | **46 fichiers**, pas 47 : la numérotation va de 02 à 47, **03 manque**, et **41 existe en double** (deux sujets sans rapport). |

### Vocabulaire de statut (mapping explicite)

Le fondateur impose neuf statuts, un seul par élément. Appliqués à un **document**,
ils répondent à une question unique : *ce document est-il aujourd'hui une référence
d'implémentation valide, et sur quoi ?*

| Statut | Sens pour un document |
|---|---|
| `CONFORME` | Aligné avec l'autorité courante ; citable tel quel comme référence d'implémentation. |
| `PARTIELLEMENT CONFORME` | Rouvert sur certains points par un document plus récent ; citable **uniquement** sur les points non rouverts, qui sont nommés. |
| `OBSOLETE` | **DEPRECATED — DO NOT IMPLEMENT.** Conservé comme trace historique, jamais comme instruction. |
| `REDONDANT` | Son contenu utile est intégralement porté ailleurs ; sa persistance crée deux sources pour une vérité. |
| `SURDIMENSIONNÉ` | Promet, décrit ou planifie au-delà de ce que le projet tient ou vise aujourd'hui. |
| `SOUS-DIMENSIONNÉ` | Trop pauvre pour l'autorité qu'on lui prête ; laisse des décisions ouvertes qu'il prétend fermer. |
| `NON VÉRIFIABLE` | Son autorité ou son contenu ne peut pas être établi depuis le dépôt (hors dépôt, non versionné, dépend d'un état externe). |
| `ABSENT` | Cité comme autorité, introuvable dans le dépôt. |
| `BLOQUANT` | Son absence, son conflit ou son ambiguïté empêche un chantier de démarrer honnêtement. |

---

## 1. HIÉRARCHIE D'AUTORITÉ — ARBITRAGE DES DEUX PRÉTENTIONS

Deux documents se déclarent chacun source de vérité, et **ils n'ont pas tort tous les
deux de la même façon** :

- le **cahier REFONTE** (26/07) : « **Statut : source de vérité d'implémentation** »,
  et donne son propre ordre §3.1 (1. ce cahier · 2. règles produit permanentes ·
  3. planches Vague 1 · 4. fondations et tokens · 5. contrats backend réels ·
  6. code existant · 7. anciens prototypes) ;
- la **Spéc Maître Unifiée** (24/07) : « source de vérité active », règle « la
  spécification la plus récente, la plus explicite et la plus cohérente prévaut ».

### DÉCISION D-01 — Deux rangs 1, sur deux axes explicites

**Décision.** Les deux sont **ACTIFS et de rang 1**, sur des axes qui ne se recouvrent
pas. La **Spéc Maître Unifiée** est la source de vérité **PRODUIT** : *quoi* construire
(hiérarchie d'écran, wording, design system, carte, Run+Bike, i18n, accessibilité,
anti-triche, monétisation, classements, Loop). Le **cahier REFONTE** est la source de
vérité **D'EXÉCUTION** : *comment le prouver et dans quel ordre* (contrat « directement
branché » §15, interdictions runtime §0/§7.1, plan §14, critères de refus §22,
définition de terminé §23, livrables §13). En **conflit sur un point de SURFACE**
(composition d'écran, copie, palette, états), le cahier REFONTE prime : il est
postérieur, plus explicite et plus contraignant — ce qui est exactement le critère que
la Spéc pose elle-même. En **conflit sur le MOTEUR ou l'HONNÊTETÉ**, la couche
constitutionnelle (§2) prime sur les deux.

**Alternatives écartées.**
1. *Subordonner la Spéc Maître au cahier REFONTE en bloc.* Écarté : le cahier ne
   couvre ni la monétisation, ni l'anti-triche détaillé, ni les 5 langues, ni la Loop,
   ni les classements, ni la boutique. Le subordonner effacerait 3 973 lignes de
   spécification produit sans rien mettre à la place — et son propre §3.1 place
   « les règles produit permanentes » au rang 2, c'est-à-dire qu'il **se subordonne
   lui-même** à elle sur le produit permanent.
2. *Subordonner le cahier REFONTE à la Spéc.* Écarté : le cahier est postérieur de
   deux jours, se déclare exécutable, et fournit la hiérarchie §3.1 + le contrat de
   branchement §15 que la Spéc ne fournit pas du tout.
3. *Déclarer un vainqueur unique et archiver l'autre.* Écarté : les deux sont des
   documents fondateurs vivants ; archiver l'un ferait perdre soit le *quoi*, soit
   la preuve du *comment*.

**Motif.** Les deux répondent à des questions différentes. « Source de vérité » n'est
pas un titre, c'est une **portée**. Un plan d'exécution et une spécification produit ne
peuvent pas se contredire tant qu'on nomme leur objet.

**Impact.** Aucune réécriture de document. Le prochain chantier lit la **Spéc pour
savoir QUOI**, le **cahier pour savoir COMMENT PROUVER que c'est branché**, et n'a plus
à arbitrer lui-même.

### La hiérarchie résultante (ordre strict, à recopier dans `CLAUDE.md`)

| Rang | Autorité | Portée | Documents |
|---|---|---|---|
| **0** | **CONSTITUTION — NON NÉGOCIABLE** | Moteur, honnêteté, sécurité, données | `CLAUDE.md` (§Règles non négociables) · `AMENDEMENT-47` · `GRYD_REGLES_NON_NEGOCIABLES.md` · `packages/shared/src/game-rules.ts` (source unique des constantes) |
| **1a** | **PRODUIT / UI-UX** | *Quoi* construire | **`docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md`** (v1.0, 26/07/2026) — voir **D-19** |
| **1a-bis** | *(REMPLACÉE)* | — | ~~`docs/product/GRYD_SPEC_MAITRE_UNIFIEE_2026.md` (24/07) + addendum psycho-cognitif~~ — **antérieure, ne plus consulter pour décider** (D-19). Conservée comme trace ; ses apports non contredits restent valables mais ne tranchent plus. |
| **1b** | **EXÉCUTION / BRANCHEMENT** | *Comment le prouver*, dans quel ordre | `PLAN_IMPLEMENTATION_GRYD.md` (26/07) · état réel : `AUDIT_GRYD.md` · conflits tranchés : `ARBITRAGES_SPEC_2026.md` |
| **2** | **RÈGLES PRODUIT PERMANENTES** | Ce que le jeu EST | `docs/product/GRYD_MASTER_SPEC.md` · `AMENDEMENT-02` · `SPEC-MVP-territoire-running-v0.md` §3 |
| **3** | **PLANCHES VAGUE 1** | Composition écran par écran | `docs/design/vague-1/PLANCHES.md` (E01→E21, porte l'override vélo du 26/07) |
| **4** | **FONDATIONS ET TOKENS** | Palette, typo, grille, 7 états de territoire | `GRYD - Fondations.dc.html` (à verser) · `packages/shared/src/design-tokens.ts` · `DESIGN_TOKENS.md` |
| **5** | **CONTRATS BACKEND RÉELS** | Ce que la base et les Edge Functions tiennent | `supabase/migrations/*.sql` · `supabase/functions/_shared/` (généré) |
| **6** | **CODE EXISTANT** | **Observation, jamais exigence** (cahier §3.3) | `apps/` · `packages/` |
| **7** | **ANCIENS PROTOTYPES ET AUDITS** | Trace historique | `maquette-ui-klaim.html` · les audits datés du 15-17/07 |

---

## 2. LA COUCHE CONSTITUTIONNELLE — VÉRIFIÉE FACE AUX DEUX NOUVEAUX DOCUMENTS

L'ancien registre distinguait deux couches (invariants de moteur/honnêteté vs
spécifications de surface). **Cette distinction tient**, et les deux nouveaux documents
la renforcent au lieu de la fragiliser. Vérification invariant par invariant :

| Invariant | Le cahier REFONTE le… | La Spéc Maître le… | Verdict |
|---|---|---|---|
| **L'app ne ment jamais** (données réelles ou vides) | **RENFORCE** — §0 « Interdiction absolue » liste 15 formes interdites dont « un faux territoire », « un faux rival », « une UI seulement branchée à des fixtures » ; §7.1 interdit nommément « Nina M. », « 1,84 km² », « NIGHT RUNNERS » | **CONTREDIT sur un mot** — §7.2 « données de démonstration » | **TIENT.** Voir D-02 : deux documents sur trois sont catégoriques, le troisième offre une alternative dont une branche est honnête. |
| **Anti pay-to-win STRICT** | ne l'aborde pas | **RÉAFFIRME** (§3.5) | **TIENT**, non contesté. |
| **Tout claim décidé serveur, RLS partout** | **RENFORCE** — §15 « elle lit ou écrit les vraies données », « elle respecte l'auth » | ne l'aborde pas | **TIENT**, non contesté. |
| **Aucun nombre magique hors `game-rules.ts`** | **TENSION DE FORME** — §5.2/§5.5/§5.6/§5.7 donnent des valeurs en CSS brut | ne l'aborde pas | **TIENT** — ce sont des tokens de design, pas des constantes de jeu ; leur source unique est `design-tokens.ts`, qui les porte déjà. Aucune règle de jeu n'est chiffrée hors `game-rules.ts` par ces deux documents. |
| **Zéro donnée européenne factice** | **RENFORCE** — « un faux classement », « un faux rival » | ne l'aborde pas | **TIENT**, non contesté. |
| **Une migration appliquée n'est jamais réécrite** | ne l'aborde pas | ne l'aborde pas | **TIENT** — et la décision vélo l'a explicitement respecté : `0070` ajoute une colonne à valeur par défaut plutôt que de convertir la table en partitionnée, motif écrit dans son en-tête (« il faudrait DÉPLACER les lignes […] ce que la loi du projet interdit »). |

**Un point de vigilance nouveau, pas un invariant nouveau.** Le cahier REFONTE ajoute
une exigence que la constitution n'exprimait pas : **une fonctionnalité non branchée
doit être MASQUÉE, pas expliquée** (§1.2, §4.5 : « il est interdit d'afficher […] une
explication longue sur l'absence de produit »). C'est plus strict que
« aucun bouton mort » de `CLAUDE.md` : un écran qui explique honnêtement son vide reste
interdit s'il imite un produit actif. **Retenu comme extension de rang 0.**

---

## 3. REGISTRE — LES DOCUMENTS DU FONDATEUR

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| **`GRYD_REFONTE_DIRECTEMENT_BRANCHEE_ZERO_DEMO_CLAUDE_CODE.md`** (2 289 l.) — `~/Downloads` | **ABSENT** du dépôt (contenu : ACTIF, rang **1b**) | 26/07/2026 (fichier 03:58) | **Source de vérité D'EXÉCUTION.** Contrat « directement branché », interdictions runtime, plan §14, définition de terminé §23 | les plans d'exécution UI antérieurs : `SCREEN_BY_SCREEN_FIX_PLAN.md`, `MVP_CHANGESET.md`, `MVP_LAUNCH_PLAN_20_DAYS.md`, `docs/design/vague-1/RESTE-A-RECALER.md` (sur l'ordre, pas sur le détail écran) | rien à ce jour | (a) **son propre §1.2** est périmé par la décision vélo du 26/07 — voir D-09 ; (b) numérotation **E01→E12** en collision avec les planches E01→E21 — voir D-05 ; (c) §4.6 « 1 crew Run + 1 crew Bike » sans porteur dans le modèle actuel — voir D-08 |
| **`GRYD_PARTAGE_SOCIAL_OPTIMISE_STRAVA_2026.md`** (1 246 l.) — `~/Downloads` | **ABSENT** du dépôt (contenu : ACTIF, rang **1a**, domaine partage) | 25/07/2026 (fichier 00:11) | **Source de vérité PRODUIT unique sur le partage** : 11 modes (AUTO, IMPACT, PHOTO, AVANT/APRÈS, CREW, PERFORMANCE, CLASSEMENT, MINIMAL, STICKER, REPLAY), composer §5, confidentialité §7, deep links §8, monétisation §9, analytics §12 | `GRYD_systeme_partage_social_strava_viral.md` (11/07, `~/Downloads`, absent du dépôt) ; complète `AMENDEMENT-24` (template 3D) sans le contredire | rien à ce jour | **AUCUN document du dépôt ne le couvre** — vérifié par grep sur 131 `.md` : 0 occurrence de « Flyover », « Sticker Stats », « STICKER TRANSPARENT ». Le seul voisin est `SHARE_TECHNICAL_SPIKE.md` (plomberie, pas produit) |
| **`GRYD_SPECIFICATION_MAITRE_UNIFIEE_UI_UX_RUN_BIKE_LOOP_I18N_2026.md`** (3 973 l.) | **CONFORME** — présent, **md5-identique** | 24/07/2026 | **Source de vérité PRODUIT**, rang **1a** | les 2 documents UI/UX antérieurs qu'elle cite fusionner ; prime sur `AMENDEMENT-08..37` sur les points UI qu'elle rouvre | rien — **prime sur le cahier REFONTE seulement pour le *quoi*** (D-01) | **§7.2 « données de démonstration »** — arbitré en D-02 ; §23 ICU vs catalogue TS typé — arbitré (le résultat prime sur la forme) ; §1.2 du cahier REFONTE la contredit sur l'état du vélo, pas sur sa spécification |
| **`GRYD_Addendum_Psychologie_Cognitive_Neuromarketing.docx`** | **CONFORME** — présent et fidèle | 24/07/2026 | Couche **transversale** de la Spéc Maître (rang 1a) : lois de Hick/Fitts/Gestalt, Zeigarnik, Goal Gradient, Endowment | rien | rien | aucun — cohérent avec §19 de la Spéc et avec `GRYD_REGLES_NON_NEGOCIABLES.md` §A |
| **Archive « Vague 0 : Analyse du cahier des charges »** — 3 `.dc.html` | **ABSENT** du dépôt sous forme source ; **transcrit partiellement** | 26/07/2026 (export) | Rang **4** (Fondations) et **3** (Planches) — voir ligne par ligne ci-dessous | les moodboards et directions antérieurs | rien | la transcription du dépôt est **partielle et dérivée** : c'est elle qu'un chantier lira, pas la source |
| ├ `GRYD - Fondations.dc.html` | **ABSENT** (source) — contenu **CONFORME**, rang **4** | 26/07/2026 | **AUTORITÉ DE LA PALETTE** : « FONDATIONS — DIRECTION NIGHT PRINT (**B AMENDÉE**) », `gryd-chartreuse #C9FF38` quota 8–10 %, échelle carbone, 7 états de territoire, rayons concentriques, tactile 44/48 | `ADDENDUM-DESIGN-v0.1.md` **sur la palette** (#B4FF0D) | rien | **tranche D-04** : #C9FF38 gagne contre le #B4FF0D encore écrit dans `CLAUDE.md` et `ADDENDUM-DESIGN-v0.1.md` |
| ├ `GRYD - Vague 0 Analyse.dc.html` | **ABSENT** (source) — contenu **CONFORME**, rang **3** amont | 26/07/2026 | 20 contraintes structurantes, matrice des 10 écrans maîtres, 8 risques nommés `R1..R8` avec leurs arbitrages (quota chartreuse 8–10 %, capture 900–1100 ms, CTA flottant vs sheet, typo Inter Tight/Inter, photographie = **R7 BLOQUANT assets**) | les deux listes divergentes de « 10 écrans maîtres » (arbitrées en R1) | rien | **R7 est un BLOQUANT non résolu** : « aucune photo n'existe » — c'est la même décision ouverte que §13.3 de la Spéc |
| └ `GRYD - Vague 1 Planches.dc.html` | **ABSENT** (source) — **transcrit** dans `docs/design/vague-1/PLANCHES.md` | 26/07/2026 | Rang **3** : composition, copie exacte et règles des écrans E01→E21 | les maquettes antérieures (`maquette-ui-klaim.html`) | rien | la copie locale `planches.html` est **tronquée à 256 KiB (E01–E07)** — E08→E21 n'existent que via la transcription `.md`, qui est donc l'autorité de fait pour 14 écrans sur 21 |

### Documents d'autorité cités mais absents — au-delà des cinq

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `GRYD_CAHIER_DES_CHARGES_VISUEL_COMPLET_2026_CLAUDE_DESIGN.md` (~96 Ko) — `~/Downloads` | **ABSENT** | 24/07/2026 | Cité **en tête du cahier REFONTE** (« Documents analysés ») et par `docs/design/vague-1/README.md:11` comme source des Fondations ; porte le §26.1 (prompt photographique) et l'échelle typo de 11 styles arbitrée en R6 | les chartes visuelles antérieures | rien | **deux documents du rang 1 le citent, aucun chantier ne peut le lire.** C'est la référence manquante des arbitrages R2/R3/R6/R8 de la Vague 0 |
| `GRYD_ETUDE_MARCHE_LOGO_2026_DIRECTION_FINALE.md` (~41 Ko) — `~/Downloads` | **NON VÉRIFIABLE** | 25/07/2026 | Inconnue — **cité par zéro document du dépôt** (grep « ETUDE_MARCHE_LOGO » → 0) | inconnu | inconnu | son autorité n'est ni déclarée ni citée : à verser ou à écarter **explicitement**, pas à laisser en suspens |
| `GRYD_systeme_partage_social_strava_viral.md` (11/07) — `~/Downloads` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 11/07/2026 | néant (prédécesseur) | rien | `GRYD_PARTAGE_SOCIAL_OPTIMISE_STRAVA_2026.md` | aucun — il n'a jamais été versé, il ne peut donc pas être cité par erreur depuis le dépôt |
| `GRYD_PROMPT_CLAUDE_CODE_MVP_VIRAL_EPURE.md` (15/07) — `~/Downloads` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 15/07/2026 | néant (prompt source) | rien | `AMENDEMENT-39-MVP-VIRAL.md`, qui l'a converti en amendement versé | aucun |

---

## 4. REGISTRE — RACINE DU DÉPÔT (78 fichiers)

### 4.1 Constitution et cadres (rang 0)

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `CLAUDE.md` | **PARTIELLEMENT CONFORME** | 24/07/2026 | **Rang 0** — instructions de projet, invariants, structure monorepo, pièges | `AGENTS.md` (dont il est la version à jour) | rien | **3 dettes nommées** : (a) cite `#B4FF0D` (§Règles) — périmé par D-04 ; (b) son ordre d'autorité §0-§8 ignore le cahier REFONTE et le doc PARTAGE ; (c) ne mentionne pas la décision vélo du 26/07 |
| `AMENDEMENT-47-FIN-DU-MODE-DEMO.md` | **CONFORME** | 21/07 (rév. 25/07) | **Rang 0 — CONTRAIGNANT.** Fin du mode vitrine ; sa section « Ce qui reste EN SUSPENS » est la **seule liste qui fasse foi** sur ce qui n'est pas fait | `EXPO_PUBLIC_SHOWCASE` / `isShowcasePlatform` (supprimés) | rien | **gagne contre Spéc §7.2** (D-02). Renforcé, jamais contredit, par le cahier REFONTE §0 et §7.1 |
| `GRYD_REGLES_NON_NEGOCIABLES.md` | **CONFORME** | 05/07/2026 | **Rang 0** — constitution UI + carte : §A 20 règles d'épuration, §B trace GPS héros, §C couleurs par RÔLE + scalabilité 200k | rien | rien | aucun — le cahier REFONTE §5.8 (anti-cards) et §6 (carte) en sont la reformulation textuelle ; convergence, pas conflit |
| `AGENTS.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 09/07/2026 | néant | rien | `CLAUDE.md` | **DANGEREUX** : copie périmée de `CLAUDE.md` que les harnais d'agents lisent par convention. `AGENTS.md:3` porte la tagline **« Cours. Capture. Défends. »** (remplacée par `AMENDEMENT-42` le 20/07) et **« France entière capturable »** (remplacé par `AMENDEMENT-35` le 12/07). Deux mensonges de positionnement dans une seule ligne |

### 4.2 Spécifications produit fondatrices (rang 2)

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `SPEC-MVP-territoire-running-v0.md` | **PARTIELLEMENT CONFORME** | 03/07/2026 | **Rang 2** — citable **uniquement** sur les règles de jeu gelées §3 et l'architecture, comme le dit `CLAUDE.md` (« là où l'amendement ne dit rien ») | rien | rouvert par `AMENDEMENT-02` (réconciliation), `-11` (fin des hexagones), `-12` (boucle→zone), `-35` (Europe), `-42` (positionnement), Spéc Maître (toute la surface) | porte encore le nom de code **« KLAIM »**, le périmètre **« France (Paris + Lille) »** et le vocabulaire hexagonal — les trois sont périmés |
| `ADDENDUM-DESIGN-v0.1.md` | **PARTIELLEMENT CONFORME** | 03/07/2026 | **Rang 4** — citable sur l'AMENDEMENT-01 (carte égocentrée) et la doctrine « toute couleur hors tokens = bug » | rien | **sur la palette** : `GRYD - Fondations.dc.html` + cahier REFONTE §5.2 + `packages/shared/src/design-tokens.ts` | **cite `#B4FF0D` en titre et dans 3 lignes de sa table de tokens** — périmé par D-04. Contient aussi l'AMENDEMENT-01, qui n'existe nulle part ailleurs : ne pas supprimer le fichier |
| `GRYD_TERRITORY_ENGINE.md` | **CONFORME** | 06/07/2026 | **Rang 0 (moteur)** — l'artefact propriétaire à protéger | rien | rien | aucun ; à re-lire à la lumière de la dimension `activity` (0070) qu'il ne décrit pas encore |

### 4.3 Les 46 amendements

**Neutralisation préalable d'une clause dangereuse.** `AMENDEMENT-39`, `-40` et
`-41-NOMMAGE` portent chacun en tête un « **Rang documentaire : amendement le plus
récent → prime sur AMENDEMENT-02..38/39/40** ». **Cette clause est PÉRIMÉE** : la Spéc
Maître (24/07) et le cahier REFONTE (26/07) leur sont postérieurs et de rang supérieur.
Un chantier qui lit `AMENDEMENT-41` et applique sa clause d'auto-primauté se croira
autorisé à contredire les deux documents du fondateur. **La clause d'auto-primauté des
amendements est abrogée par ce registre** : elle ne vaut plus qu'entre amendements.

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `AMENDEMENT-02-GRYD.md` | **CONFORME** | 03/07 | **Rang 2** — réconciliation GRYD ↔ SPEC v0.1 ; deltas actifs + arbitrages A1-A4 | intègre les 18 `docs/product/GRYD_*.md` | rien | aucun ; sa règle « MASTER_SPEC > cet amendement > SPEC v0.1 » reste valide sous le rang 1 |
| `AMENDEMENT-04-BADGES.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** (§2 catalogue) | 03/07 | néant sur le catalogue | `AMENDEMENT-02` §6 (~20 badges) | `AMENDEMENT-06` §catalogue, explicitement | son §2 décrit un catalogue plat que `-06` a converti en badges à niveaux |
| `AMENDEMENT-05-LANDING-V2.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 3 — landing `apps/web` uniquement | la landing V1 | partiellement par `AMENDEMENT-42` (tagline) et `AMENDEMENT-47` §4 (fin des chiffres fabriqués) | sa « war room sportive » supposait des flux live et des podiums que `-47` a supprimés du web |
| `AMENDEMENT-06-BADGES-NIVEAUX-CREWS.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 2 — badges à niveaux, crews, Activity Hub | `AMENDEMENT-04` §2 | rouvert sur la nav par `-29`, `-39`, planche E02/E19 | « nav V2 » et « Activity Hub » sont antérieurs aux 3 onglets Carte/Crew/Profil |
| `AMENDEMENT-07-SOCIAL-MOTIVATION.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 2 — social + motivation saine | rien | rouvert sur la surface par `-17`, `-18`, `-43` | portée MVP §52/§22 antérieure à la doctrine Crew MVP |
| `AMENDEMENT-08-GAME-UI.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | `AMENDEMENT-20`/`-21`/`-22` (épuration), Spéc Maître, cahier REFONTE §5 | « scènes de jeu Supercell » contredit frontalement la direction **Night Print** et §5.8 anti-cards |
| `AMENDEMENT-09-MAP-UBER.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | `AMENDEMENT-37` puis cahier REFONTE §6 | la structure « map Uber » est remplacée par les 7 états de territoire des Fondations |
| `AMENDEMENT-10-ROUTE-PLANNER-UIUX-2026.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 3 — citable sur le planificateur d'itinéraire seul | rien | sur la Battle Map et le Live : `-21`, `-37`, cahier REFONTE E05/E07 | « Live Run Nike » et « régimes UI » périmés par la DA Night Print |
| `AMENDEMENT-11-TERRITOIRES-ORGANIQUES.md` | **CONFORME** | 03/07 | **Rang 2 — décision produit majeure** : plus jamais d'hexagone visible | les points carte de `-08`, `-09`, `-10` | rien | aucun — **confirmé mot pour mot** par le cahier REFONTE §6.1 (« L'utilisateur ne voit jamais d'hexagones ») |
| `AMENDEMENT-12-BOUCLE-ZONE.md` | **CONFORME** | 04/07 | **Rang 2** — 2 objectifs (CONQUÉRIR/DÉFENDRE) + la boucle capture l'intérieur | delta explicite sur SPEC §3 | rien | aucun — confirmé par le cahier REFONTE §4.1 (Core Loop) et E01 |
| `AMENDEMENT-13-CARTE-REELLE.md` | **CONFORME** | 04/07 | Rang 2 — tuiles réelles, fin des basemaps stylisés génériques | rien | rien | aucun |
| `AMENDEMENT-14-GO-FIRST.md` | **CONFORME** | 05/07 | Rang 2 — zéro question avant de courir | rien | rien sur la doctrine ; le libellé du bouton est tranché par `-38` | aucun |
| `AMENDEMENT-15-GPS-REEL.md` | **CONFORME** | 05/07 | Rang 2 (moteur GPS + objets connectés) | rien | rien | aucun ; ses bornes sont désormais **par discipline** (voir D-09) |
| `AMENDEMENT-16-GAMEPLAY-CREWS-MONETISATION.md` | **PARTIELLEMENT CONFORME** | 05/07 | Rang 2 — run libre, anti-abus des boucles, contribution | rien | sur la monétisation : `AMENDEMENT-40` puis `-45` | sa doctrine de monétisation est antérieure à la règle « 90 % de marge » |
| `AMENDEMENT-17-SIMPLICITE-BOUCLE-CREW.md` | **CONFORME** | 05/07 | Rang 2 — « 1 écran = 1 action », boucle crew collaborative | rien | l'ambiguïté joueur/crew est tranchée par `AMENDEMENT-41-SORTIES-DE-GROUPE` | aucun — sa règle transverse est reprise en §A de `GRYD_REGLES_NON_NEGOCIABLES.md` |
| `AMENDEMENT-18-CREW-SOCIAL-CARTE-LIVE.md` | **PARTIELLEMENT CONFORME** | 05/07 | Rang 2 — crew actionnable (requêtes, dons, chat) | rien | sur la carte : `-21`, `-37`, cahier REFONTE §6 ; sur le crew : `-43` | « carte action-first » périmée par la carte-mission de `-21` |
| `AMENDEMENT-19-BONUS-CIBLES.md` | **CONFORME** | 05/07 | Rang 2 (moteur d'opportunités, capé, anti-p2w) | rien | rien | aucun ; sa fenêtre de bonus est désormais **disciplinée** (`0071`/`0072`) |
| `AMENDEMENT-20-EPURE-STRAVA.md` | **CONFORME** | 05/07 | Rang 2/3 — Live · Résultat · Partage épurés | rien | sur le partage : le doc **PARTAGE SOCIAL 2026** l'élargit sans le contredire | aucun |
| `AMENDEMENT-21-CARTE-ECRAN-MISSION.md` | **CONFORME** | 05/07 | Rang 2/3 — la Carte est un écran MISSION, pas un dashboard | les surcharges de `-09`, `-18` | rien | aucun — **confirmé** par le cahier REFONTE §1.4 (« la carte doit toujours raconter un état ») et E02/E03 |
| `AMENDEMENT-22-PROFONDEUR-UI-EN-SCENES.md` | **PARTIELLEMENT CONFORME** | 05/07 | Rang 4 — règle de profondeur, fin des cards imbriquées | rien | reformulé par cahier REFONTE §5.8 (anti-cards) | son vocabulaire « scènes » vient de `-08` (obsolète) ; **la règle survit, le vocabulaire non** |
| `AMENDEMENT-23-EXPLICABILITE-ET-SKILLS.md` | **CONFORME** | 05/07 | Rang 2 — explicabilité des calculs + Skills | rien | rien | aucun ; source canonique = `docs/product/GRYD_calcul_zones_skills_FAQ_regles.md` |
| `AMENDEMENT-24-CARTE-3D-CONQUETE.md` | **PARTIELLEMENT CONFORME** | 05/07 | Rang 3 — template de partage 3D | rien | élargi par le doc **PARTAGE SOCIAL 2026** §4.11 (Replay Conquête) | aucun conflit ; le nouveau doc en fait un mode parmi onze |
| `AMENDEMENT-25-CARTE-INFO-ET-HISTORIQUE-3D.md` | **PARTIELLEMENT CONFORME** | 05/07 | Rang 3 — historique avec tracé 3D | rien | sur la sheet carte : cahier REFONTE E04/E05 | « mission dans Info » périmé : E05 fait de la mission une sheet de briefing, pas un onglet Info |
| `AMENDEMENT-26-3D-SUR-TOUTES-LES-CARTES.md` | **SURDIMENSIONNÉ** | 05/07 | Rang 3, portée à réduire | rien | non remplacé, mais **non repris** par les Fondations ni par le cahier REFONTE §6 | ni les Fondations ni le cahier REFONTE ne prévoient un toggle 2D/3D sur toutes les cartes ; §6.5 impose au contraire un budget de performance |
| `AMENDEMENT-27-VRAI-3D-RELIEF-BATIMENTS.md` | **SURDIMENSIONNÉ** | 05/07 | Rang 3, portée à réduire | rien | non repris par les Fondations | même motif que `-26` ; relief DEM + bâtiments extrudés absents de la DA Night Print |
| `AMENDEMENT-28-VUE-REALISTE-SATELLITE.md` | **SURDIMENSIONNÉ** | 05/07 | Rang 3, portée à réduire | rien | non repris ; **contredit** par le « fond sombre propriétaire » des Fondations §4 | un fond satellite photographique est l'inverse du fond cartographique sombre propriétaire |
| `AMENDEMENT-29-BOUTON-ACTION-FLOTTANT-CONTEXTUEL.md` | **PARTIELLEMENT CONFORME** | 06/07 | Rang 3 — CTA flottant contextuel | rien | le **libellé** est tranché par `-38` (GO) ; les onglets Missions/Saison sont périmés par les 3 onglets Carte/Crew/Profil | sa nav à 5 onglets contredit « 3 onglets exactement » (Vague 0, contrainte 3) et le cahier REFONTE §4.2 |
| `AMENDEMENT-30-ONBOARDING-SANS-FRICTION.md` | **CONFORME** | 06/07 | Rang 2 — friction hors du chemin critique | rien | précisé par Spéc §7 et cahier REFONTE E01 | aucun — convergent |
| `AMENDEMENT-31-EMPRUNTS-STRAVA.md` | **PARTIELLEMENT CONFORME** | 06/07 | Rang 3 — invite crew, réactions, leaderboard zone, site abonnement | rien | sur le partage : doc **PARTAGE SOCIAL 2026** | aucun conflit dur |
| `AMENDEMENT-32-BACKLOG-P2.md` | **PARTIELLEMENT CONFORME** | 06/07 | Rang 7 (backlog) | rien | rien | son « câblés démo » est **incompatible avec `AMENDEMENT-47`** : à relire avant tout usage |
| `AMENDEMENT-33-APP-STORE-READINESS.md` | **PARTIELLEMENT CONFORME** | 06/07 | Rang 2 — conformité App Review | rien | **`docs/APP_STORE_CONFORMITE.md` (26/07)** et `GRYD_APPSTORE_CHECKLIST.md` (26/07) portent l'état à jour | son état est daté du 06/07 ; l'audit du 26/07 relève 10 bloquants |
| `AMENDEMENT-34-CLASH-DELTA.md` | **CONFORME** | 06/07 | Rang 2 — cadences de clan sans obligation quotidienne | rien | rien | aucun |
| `AMENDEMENT-35-EUROPE.md` | **CONFORME** | 12/07 | **Rang 2 — cadre géographique : Europe entière capturable** | « France entière » de `AMENDEMENT-02` | rien | aucun ; sa vision est **bornée par l'invariant zéro donnée EU factice** (rang 0) |
| `AMENDEMENT-36-CARTE-JUSTE-LE-TRACE.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 12/07 | néant | les aplats de `-08`/`-09` | **`AMENDEMENT-37` §1, qui le révise nommément** (« là où -36 et l'étude divergent, l'étude prime ») | sa thèse « zéro aplat de territoire » est contredite trois fois : `-37` §1, Fondations (« remplissage 12–22 % »), cahier REFONTE §6.2 (« chartreuse 15–17 % ») |
| `AMENDEMENT-37-CARTE-ETUDE-2026.md` | **PARTIELLEMENT CONFORME** | 13/07 | Rang 2 — réconciliation carte ↔ étude de marché | `AMENDEMENT-36` | rouvert par le cahier REFONTE §6 (7 états normatifs) et les Fondations §4 | ses valeurs de fill (16–24 %) diffèrent du cahier REFONTE §6.2 (15–17 % pour « moi ») — **le cahier prime** (D-01) |
| `AMENDEMENT-38-BOUTON-GO.md` | **CONFORME** | 13/07 | **Rang 2 — override fondateur** : le CTA central est « GO » | les verbes contextuels de `-29` | rien | **aucun** — Spéc §20 cite « GO » en exemple de bon CTA ; le cahier REFONTE §4.3 ne le contredit pas. La skill « zéro GO » est **supplantée** |
| `AMENDEMENT-39-MVP-VIRAL.md` | **PARTIELLEMENT CONFORME** | 15/07 | Rang 2 — chemin critique d'abord, épuration par flags | `MVP_REDUCTION_AUDIT.md` (dont il est la décision) | **sa clause d'auto-primauté est abrogée** (voir en-tête §4.3) | croit primer sur tout ; ne prime plus sur les rangs 1a/1b |
| `AMENDEMENT-40-MONETISATION.md` | **PARTIELLEMENT CONFORME** | 15/07 | Rang 2 — gameplay gratuit, statut payant | la monétisation de `-16` | complété par `-45` (marge 90 %) ; **clause d'auto-primauté abrogée** | à croiser avec le doc **PARTAGE SOCIAL 2026** §9, qui ajoute une monétisation cosmétique du partage |
| `AMENDEMENT-41-NOMMAGE-SECTEURS-CARTE.md` | **PARTIELLEMENT CONFORME** | 17/07 | Rang 2 — nommage des secteurs partout en Europe | rien | **clause d'auto-primauté abrogée** | **COLLISION DE NUMÉRO** avec `AMENDEMENT-41-SORTIES-DE-GROUPE.md` : deux amendements « 41 » sans rapport. Citer « AMENDEMENT-41 » seul est ambigu |
| `AMENDEMENT-41-SORTIES-DE-GROUPE.md` | **CONFORME** | 20-21/07 | Rang 2 — LE RELAIS : 1 propriétaire, récompense 1/rang, horloges intouchées | rapatrie les mécaniques de groupe orphelines | rien | **COLLISION DE NUMÉRO** (voir ci-dessus) ; **à renuméroter en `-48`** — décision documentaire, sans effet code |
| `AMENDEMENT-42-POSITIONNEMENT.md` | **CONFORME** | 20/07 | **Rang 2** — « Cours pour ton crew. Conquiers ta ville. » sur TOUTES les surfaces publiques | « Cours. Capture. Défends. » | rien | **`AGENTS.md:3` porte encore l'ancienne tagline** — voir D-06 |
| `AMENDEMENT-43-CREW-MVP.md` | **SOUS-DIMENSIONNÉ** | 20/07 | Rang 2 partiel — se déclare lui-même « **REÇU, audit en cours** », décisions « à trancher » OUVERTES | rien | rien | il fige une doctrine sans la trancher : le citer comme autorité ferme serait lui prêter ce qu'il refuse d'affirmer. Le cahier REFONTE §4.6 et E11 le rouvrent (voir D-08) |
| `AMENDEMENT-44-AUDIT-85-100.md` | **PARTIELLEMENT CONFORME** | 21/07 | Rang 7 — 15 actions issues d'un audit externe | rien | ses 5 contradictions sont tranchées par `-45` | l'audit notait un *document*, pas l'implémentation — le doc le dit lui-même |
| `AMENDEMENT-45-MARGE-ET-COMPROMIS.md` | **CONFORME** | 21/07 | Rang 2 — arbitrage des contradictions de `-44` + structure de marge ≥ 90 % | tranche `-44` | rien | aucun |
| `AMENDEMENT-46-PARCOURS-PERSONNALISES.md` | **CONFORME** | 21/07 | Rang 2 — suggestion depuis les habitudes réelles ; la route utilisée n'est **pas** apprise (vie privée) | rien | rien | aucun — cohérent avec cahier REFONTE §11.5 (« géométrie sociale distincte de la géométrie brute ») |
| `AMENDEMENT-47-FIN-DU-MODE-DEMO.md` | **CONFORME (rang 0)** | 21/07, rév. 25/07 | voir §4.1 | voir §4.1 | voir §4.1 | voir §4.1 |

> **`AMENDEMENT-01` et `AMENDEMENT-03` n'existent pas comme fichiers.** `-01` (carte
> égocentrée) vit **à l'intérieur** de `ADDENDUM-DESIGN-v0.1.md` — c'est la raison pour
> laquelle ce fichier ne peut pas être supprimé malgré sa palette périmée. `-03` n'a
> jamais existé : ce n'est pas une perte, c'est un trou de numérotation à ne pas
> chercher.

### 4.4 Audits, plans et inventaires (rang 7 — trace, jamais instruction)

Ces 20 documents ont une caractéristique commune : **ils décrivent un état daté du
code**. Un audit périmé n'est pas faux, il est **hors sujet** — et son danger est
exactement celui que le fondateur nomme : être cité comme preuve de conformité.

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `CURRENT_STATE_CONFORMITY_MATRIX.md` | **PARTIELLEMENT CONFORME** | 24/07 | Rang 7 — 102 exigences, preuves `fichier:ligne` ; **le seul audit dont chaque ligne porte sa preuve** | les audits du 15-17/07 sur les domaines qu'il couvre | à reconstruire : **6 chantiers postérieurs** | sa ligne 14 (« Programme Mode BIKE, post-stabilité Run, tout derrière `FEATURE_BIKE_*` défaut off ») et son bloquant §3 sont **périmés par la décision du 26/07** — voir D-09 |
| `SOURCE_OF_TRUTH_REGISTER.md` | **CONFORME** | **26/07** (ce fichier) | Rang 0 — arbitre l'autorité entre documents | la version du 24/07 (100 l.) | rien | néant |
| `MVP_READINESS_AUDIT.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 17/07 | néant | rien | `CURRENT_STATE_CONFORMITY_MATRIX.md`, puis l'audit App Store du 26/07 | audit d'un code d'il y a 9 jours et ~40 commits |
| `UI_AUDIT.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 17/07 | néant | rien | Fondations + cahier REFONTE §5 | 43 sous-agents sur une UI antérieure à Night Print |
| `TYPOGRAPHY_AUDIT.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 17/07 | néant | rien | Fondations §2 (Inter Tight / Inter, 11 styles) | vise « ≤ 6 rôles fermes » quand les Fondations en posent 11 nommés |
| `ICON_AUDIT.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 17/07 | néant | rien | Fondations §5 (7 icônes propriétaires monoline) + arbitrage R8 | 323 appels audités sur une famille d'icônes antérieure |
| `COMPONENT_INVENTORY.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 17/07 | néant | rien | Vague 0 §3 (inventaire des composants partagés) | inventaire d'un arbre de composants antérieur |
| `DESIGN_TOKENS.md` | **PARTIELLEMENT CONFORME** | 17/07 | Rang 4 — citable comme **carte de lecture** de `packages/shared/src/design-tokens.ts`, jamais comme source | rien | **Fondations** (source de la palette) | dérivé d'un audit périmé ; la source unique reste le `.ts` |
| `SCREEN_BY_SCREEN_FIX_PLAN.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 17/07 | néant | rien | `docs/design/vague-1/RESTE-A-RECALER.md` puis cahier REFONTE §14 | plan de correction écran par écran antérieur aux planches |
| `MVP_CHANGESET.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 17/07 | néant | rien | cahier REFONTE §14 | liste atomique de fichiers d'il y a 9 jours |
| `MVP_LAUNCH_PLAN_20_DAYS.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 17/07 | néant | rien | cahier REFONTE §14 + `GRYD_RUNBOOK_LANCEMENT.md` | son ordre imposé est antérieur à la refonte |
| `MVP_ANALYTICS_TAXONOMY.md` | **PARTIELLEMENT CONFORME** | 17/07 | Rang 7 — citable sur le **delta** de funnel, pas sur l'inventaire | rien | Spéc §26 + cahier REFONTE §16 + doc PARTAGE §12 | trois grammaires d'events coexistent : §8 (`events.ts`), §26 (Spéc), §12 (partage) — **table de correspondance à produire, pas de renommage** |
| `MVP_REDUCTION_AUDIT.md` | **REDONDANT** | 15/07 | néant | rien | `AMENDEMENT-39`, qui en est la décision | l'audit qui a produit `-39` ; le garder comme trace, jamais comme instruction |
| `VISUAL_REGRESSION_PLAN.md` | **PARTIELLEMENT CONFORME** | 17/07 | Rang 7 — citable sur la **méthode** de verrouillage | rien | cahier REFONTE §19.4 + §20 (boucle de QA visuelle obligatoire) | le cahier impose une boucle plus stricte (capture → comparaison → correction → consignation) |
| `SHARE_TECHNICAL_SPIKE.md` | **CONFORME** | 15/07 | Rang 5 — **plomberie** du partage (view-shot, formats, deep links) | rien | rien | aucun — **aucun recouvrement produit** avec le doc PARTAGE SOCIAL 2026, qui ne traite pas la plomberie |
| `CRITICAL_PATH_TO_FIRST_REAL_CAPTURE.md` | **PARTIELLEMENT CONFORME** | 15/07 | Rang 7 — citable sur la **définition du parcours minimal** | rien | `CRITICAL_PATH_TO_FIRST_CAPTURE.md` (17/07, plus court et plus récent) | **deux fichiers pour un même objet** — le plus récent gagne, l'autre est à fusionner ou archiver |
| `CRITICAL_PATH_TO_FIRST_CAPTURE.md` | **PARTIELLEMENT CONFORME** | 17/07 | Rang 7 — les 15 étapes du test fermé | `CRITICAL_PATH_TO_FIRST_REAL_CAPTURE.md` | rien | son « état réel » est daté du 17/07 |
| `FEATURE_FLAG_ARCHITECTURE.md` | **PARTIELLEMENT CONFORME** | 15/07 | Rang 5 — citable sur l'architecture de flags | rien | rouvert par la décision vélo (`flags.bike`) et par `AMENDEMENT-39` §6 | ne connaît pas `flags.bike` ni `EXPO_PUBLIC_FULL_SURFACE` dans leur état actuel |
| `GRYD_BACKLOG.md` | **CONFORME** | 25/07 | Rang 7 — backlog consommé par la skill `/gryd-loop` | rien | rien | à ré-alimenter depuis le cahier REFONTE §14 et le doc PARTAGE §14 |
| `README.md` | **PARTIELLEMENT CONFORME** | 21/07 | Rang 7 — porte d'entrée du dépôt | rien | rien | titre **« KLAIM (nom de code) »** et périmètre **« Paris + Lille »** : le nom public est GRYD (`-42`) et le cadre est l'Europe (`-35`) |

### 4.5 Doctrine commerciale, légale et lancement

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `GRYD_APPSTORE_CHECKLIST.md` | **CONFORME** | **26/07** | Rang 2 — dossier de soumission, exécute l'audit du 26/07 | la checklist de `AMENDEMENT-33` | rien | aucun ; **l'un des deux seuls documents du dépôt à jour au 26/07** |
| `GRYD_LEGAL_A_COMPLETER.md` | **CONFORME** | 21/07 | Rang 2 — ce qui manque pour être en règle (droit français) | rien | rien | **décision fondateur requise** (juridique) : les gabarits ne sont pas un avis juridique |
| `GRYD_RUNBOOK_LANCEMENT.md` | **PARTIELLEMENT CONFORME** | 06/07 | Rang 7 — qui fait quoi, dépendances | rien | partiellement par `GRYD_APPSTORE_CHECKLIST.md` (26/07) | daté du 06/07 ; ses dépendances O1-O4 ont bougé |
| `GRYD_STRATEGIE_OCEAN_BLEU.md` | **CONFORME** | 06/07 | Rang 7 — analyse marché/positionnement, **explicitement « à challenger »** | rien | rien | aucun ; il source `AMENDEMENT-30` |
| `GRYD_TEARDOWN_STRAVA_COMPLET.md` | **CONFORME** | 06/07 | Rang 7 — observation concurrentielle | rien | rien | aucun ; il source `-31` et `-32` |
| `GRYD_TEARDOWN_STRAVA_ONBOARDING.md` | **CONFORME** | 06/07 | Rang 7 — observation concurrentielle | rien | rien | aucun |

---

## 5. REGISTRE — `docs/` (45 fichiers)

### 5.1 `docs/` racine (4)

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `docs/APP_STORE_CONFORMITE.md` | **CONFORME** | **26/07** | **Rang 2** — audit lecture seule, 4 domaines, 10 bloquants prouvés `fichier:ligne` | l'état App Store de `AMENDEMENT-33` | rien | aucun ; **document le plus récent du dépôt avec la checklist** |
| `docs/BACKLOG-SOURCES.md` | **CONFORME** | 21/07 | Rang 7 — sources qui marchent vs celles qui attendent le fondateur | rien | rien | aucun ; sa règle (« une source qui dépend de son intervention est nommée ») est exemplaire |
| `docs/GRYD_PROGRAMME_AMBASSADEUR.md` | **CONFORME** | 21/07 | Rang 2 — exécute `-44` A7 / `-45` §3 | rien | rien | aucun |
| `docs/GRYD_SPONSORING_TERRITORIAL.md` | **CONFORME** | 21/07 | Rang 2 — exécute `-45` §4 (canal ~99 % de marge) | rien | rien | aucun |

### 5.2 `docs/design/vague-1/` (4)

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `docs/design/vague-1/PLANCHES.md` | **CONFORME** | **26/07** | **Rang 3 — autorité de fait des planches E01→E21** (la copie `planches.html` est tronquée à E07). Porte l'**override fondateur du 26/07** sur E12 | `maquette-ui-klaim.html` | rien | **collision d'identifiants avec le cahier REFONTE** — voir D-05 ; sa « Loi de lecture » (valeurs = placeholders) est exactement §7.1 du cahier |
| `docs/design/vague-1/README.md` | **CONFORME** | 25/07 | Rang 4 — porte le système de tokens Night Print et la provenance Claude Design | rien | rien | cite les Fondations et le cahier visuel comme vivant « dans le projet Claude Design », donc **hors dépôt** |
| `docs/design/vague-1/IMPLEMENTATION.md` | **PARTIELLEMENT CONFORME** | 25/07 | Rang 7 — état par écran E01→E19 | rien | l'état est dépassé par les 6 chantiers du 25-26/07 | son tableau d'état est daté ; sa **règle non négociable** (composition fidèle + données réelles ou vides) reste valide |
| `docs/design/vague-1/RESTE-A-RECALER.md` | **PARTIELLEMENT CONFORME** | 26/07 | Rang 7 — plan des 29 écrans restants ; **se déclare lui-même « PLAN D'EXÉCUTION, pas source de vérité »** | rien | sur l'ordre : cahier REFONTE §14 | il porte sa propre mise à jour d'état du 26/07 et se déclare périmé sur la partie « mensonges par document » — **modèle de tenue documentaire à généraliser** |

### 5.3 `docs/product/` (37)

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `GRYD_SPEC_MAITRE_UNIFIEE_2026.md` | **CONFORME** | 24/07 | **Rang 1a** — voir §3 | les 2 docs UI/UX qu'elle fusionne | rien | §7.2 (D-02), §23 ICU (arbitré), §13.3 photo (ouvert) |
| `GRYD_ADDENDUM_PSYCHO_COGNITIVE_NEUROMARKETING.md` | **CONFORME** | 24/07 | **Rang 1a** — couche transversale | rien | rien | aucun |
| `GRYD_MASTER_SPEC.md` | **CONFORME** | 03/07 | **Rang 2** — source de vérité produit antérieure ; cède à la Spéc Unifiée sur l'UI/UX | `SPEC-MVP` sur les points qu'il rouvre | rien sur le fond | son ambiguïté joueur/crew est tranchée par `AMENDEMENT-41-SORTIES-DE-GROUPE` |
| `GRYD_ETUDE_MARCHE_CARTE_2026.md` | **PARTIELLEMENT CONFORME** | 13/07 | Rang 2 — autorité carte déclarée par `AMENDEMENT-37` | `AMENDEMENT-36` | rouvert par cahier REFONTE §6 (7 états normatifs) + Fondations §4 | ses valeurs de fill (16–24 %) diffèrent de §6.2 du cahier (15–17 %) — **le cahier prime** |
| `GRYD_calcul_zones_skills_FAQ_regles.md` | **CONFORME** | 05/07 | Rang 2 — **référence canonique des règles de calcul** (zones/routes/boucles/défense/bonus/verify) | rien | rien | aucun ; à relire à la lumière des bornes **par discipline** |
| `GRYD_carte_sans_hexagones_territoires_routes.md` | **CONFORME** | 03/07 | Rang 2 — source de `AMENDEMENT-11` | rien | rien | aucun — confirmé par cahier REFONTE §6.1 |
| `GRYD_reglement_saison_0.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 2 — règlement public | rien | rouvert par la **séparation des points de saison par discipline** (0070) | ne connaît pas les deux disciplines : un règlement qui décrit un seul classement est faux depuis le 25/07 |
| `GRYD_safety_privacy_rgpd.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 2 — sécurité et vie privée | rien | complété par cahier REFONTE §11.5 et doc PARTAGE §7 (pipeline de masquage) | le doc PARTAGE impose un masquage adaptatif que celui-ci ne décrit pas |
| `GRYD_gameplay_strategie_scoring_zones.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 2 — scoring | rien | rouvert par `-23` (points multiplicatifs) et 0070 (scores par discipline) | scoring mono-monde |
| `GRYD_gameplay_crews_monetisation_contribution_personnalisation.md` | **PARTIELLEMENT CONFORME** | 05/07 | Rang 2 — source de `AMENDEMENT-16` | rien | sur la monétisation : `-40`, `-45` | antérieur à la règle 90 % de marge |
| `GRYD_lignes_droites_maillage_controle_secteur.md` | **CONFORME** | 03/07 | Rang 2 — maillage et contrôle de secteur | rien | rien | aucun |
| `GRYD_map_zones_sectors_rules.md` | **CONFORME** | 03/07 | Rang 2 — règles de zones/secteurs | rien | rien | aucun |
| `GRYD_missions_quests.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 2 — missions | rien | rouvert par cahier REFONTE E05 + `ACTIVITY_SCOPE.missions = per_activity` | ne connaît pas les missions par discipline |
| `GRYD_notifications_logic.md` | **CONFORME** | 03/07 | Rang 2 — logique de notifications | rien | rien | aucun |
| `GRYD_page_conquerir_amelioration.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 07/07 | néant | rien | cahier REFONTE E02/E03/E05 | décrit une page « Conquérir » que les 3 onglets Carte/Crew/Profil ont supprimée |
| `GRYD_page_performance_stats_running.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 3 — contenu statistique | rien | planche E18 + cahier REFONTE E12 | « running » seul : les stats sont désormais **séparées par discipline, jamais sommées** (E18) |
| `GRYD_map_uber_running_gaming.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | Fondations §4 + cahier REFONTE §6 | source de `AMENDEMENT-09`, obsolète comme lui |
| `GRYD_refonte_app_complete_game_ui_supercell.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | Spéc Maître + cahier REFONTE §5 (Night Print) | source de `AMENDEMENT-08` ; direction Supercell abandonnée |
| `GRYD_refonte_pages_v2_badges_integrations.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | `GRYD_refonte_pages_v3_*` puis Night Print | v2 remplacée par v3 par son propre auteur |
| `GRYD_refonte_pages_v3_supercell_crews_badges.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant sur la DA ; le **catalogue de badges** survit dans `packages/shared/src/badges.ts` | v2 | Night Print | direction Supercell abandonnée |
| `GRYD_refonte_uiux_2026_route_planner_battle_map.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | cahier REFONTE §6 + planches | source de `AMENDEMENT-10` |
| `GRYD_refonte_uiux_rondesignlab_sport_game.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | Night Print (Fondations) | direction visuelle abandonnée ; la Spéc mandate encore un `RONDESIGNLAB_STYLE_AUDIT` — **programme, pas prérequis** |
| `GRYD_motion_design_univers_visuel_objets_virtuels.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 4 — citable sur le **principe** de motion utile | rien | Fondations + Addendum psycho (Reduce Motion, 900–1100 ms) | son univers d'objets virtuels est antérieur à l'anti-p2w strict |
| `GRYD_motivation_challenges_sains_neuropsychologie.md` | **CONFORME** | 03/07 | Rang 2 — source de `AMENDEMENT-07` ; converge avec l'Addendum psycho | rien | rien | aucun |
| `GRYD_social_communaute_recrutement_runs_groupes.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 2 — social | rien | `AMENDEMENT-41-SORTIES-DE-GROUPE` sur les sorties de groupe | aucun conflit dur |
| `GRYD_verify_motion_intelligence_antitriche.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 2 — anti-triche | rien | rouvert par les **bornes par discipline** (`ACTIVITY_RULES`) et Spéc §8 | il ne connaît qu'un monde : ses bornes « course » rejetteraient tout cycliste |
| `GRYD_admin_dashboard_support.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 2 — dashboard admin | rien | rien | `AMENDEMENT-47` laisse `/admin` explicitement **EN SUSPENS** (données PRNG derrière un login, « à trancher ») |
| `GRYD_store_submission.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | `GRYD_APPSTORE_CHECKLIST.md` + `docs/APP_STORE_CONFORMITE.md` (26/07) | 4 Ko d'intentions face à 835 lignes d'audit daté |
| `GRYD_sponsors_partners.md` | **REDONDANT** | 03/07 | néant | rien | `docs/GRYD_SPONSORING_TERRITORIAL.md` (21/07) | 4 Ko remplacés par 338 lignes chiffrées |
| `GRYD_launch_crew_founders.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 7 — crews fondateurs | rien | partiellement par `docs/GRYD_PROGRAMME_AMBASSADEUR.md` | recouvrement partiel |
| `GRYD_synthese_complete_conversation.md` | **REDONDANT** | 06/07 | néant | rien | les amendements qui en sont issus | 36 Ko de transcription : trace, jamais instruction |
| `GRYD_prompt_Claude_resolution_complete.md` | **REDONDANT** | 08/07 | néant | rien | les amendements produits | prompt de travail, pas une spécification |
| `GRYD_prompt_pages_ux.md` | **REDONDANT** | 03/07 | néant | rien | les amendements produits | idem |
| `GRYD_prompt_monetisation_supercell.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | `-40` puis `-45` | doctrine Supercell abandonnée |
| `GRYD_prompt_analyse_paiements_clash_of_clans.md` | **REDONDANT** | 08/07 | néant | rien | `AMENDEMENT-34` (delta retenu) + `-40` | analyse source, décision ailleurs |
| `GRYD_prompt_implementation_monetisation_clash.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 08/07 | néant | rien | `-40` puis `-45` (marge 90 %) | un plan d'implémentation de monétisation antérieur à l'arbitrage de marge |
| `GRYD_INDEX_DOCUMENTS_MANQUANTS.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | **ce registre** | index de 12 lignes listant 2 documents ; sa fonction est reprise intégralement ici |

---

## 6. REGISTRE — `.claude/` et `apps/` (8 fichiers)

| Document | Statut | Date | Autorité | Remplace | Est remplacé par | Conflits connus |
|---|---|---|---|---|---|---|
| `.claude/orchestration-klaim/PRD.md` | **PARTIELLEMENT CONFORME** | 03/07 | Rang 7 — PRD d'origine | rien | Spéc Maître + cahier REFONTE | porte le nom de code KLAIM et le périmètre France |
| `.claude/orchestration-klaim/DISCOVERY.md` | **CONFORME** | 03/07 | **Rang 2** — décisions **D1-D18** et points ouverts **O1-O4**, cités par `CLAUDE.md` | rien | rien | **D8** (onglet Saison masqué) est rouvert par Spéc §16 — décision fondateur requise |
| `.claude/orchestration-klaim/PHASES.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | cahier REFONTE §14 (Phases 0→6) | phasage d'origine, dépassé de 47 amendements |
| `.claude/orchestration-klaim/PROGRESS.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | `GRYD_BACKLOG.md` + l'historique git | journal de progression figé |
| `.claude/orchestration-klaim/START.md` | **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** | 03/07 | néant | rien | `CLAUDE.md` | amorce d'orchestration initiale |
| `apps/web/DEPLOY-VERCEL.md` | **PARTIELLEMENT CONFORME** | non daté | Rang 5 — procédure de déploiement web | rien | rien | à croiser avec `AMENDEMENT-47` §4 : le lien public doit servir `apps/web`, **bascule non faite** |
| `apps/web/app/fonts/README.md` | **CONFORME** | non daté | Rang 5 — note technique de polices | rien | rien | aucun |
| `apps/mobile/.expo/README.md` | **NON VÉRIFIABLE** | généré | néant — **artefact d'outil**, jamais un document de projet | rien | rien | aucun ; à ignorer dans tout inventaire documentaire futur |

---

## 7. LA CONTRADICTION CENTRALE — ARBITRÉE

### DÉCISION D-02 — La « carte démo » d'arrivée

**Les trois textes en présence :**

| Source | Texte exact | Nature |
|---|---|---|
| Spéc Maître §7.2 (l. 1069-1073) | « **Arrivée directe sur carte démo** — Pas de permission obligatoire. Afficher une carte explorable avec **données de démonstration OU zones publiques agrégées**. » | **Alternative à deux branches** |
| Cahier REFONTE §0 « Interdiction absolue » | interdit « un faux territoire », « une fausse mission », « des données codées en dur présentées comme réelles », « une UI seulement branchée à des fixtures » | **Catégorique** |
| Cahier REFONTE E02 | « Ne pas afficher une fausse boucle de 900 m. […] **La carte montre la position réelle sans zone artificielle.** » + CTA « COMMENCER UNE COURSE LIBRE » | **Catégorique, et propose le remède** |
| `CLAUDE.md` + `AMENDEMENT-47` | « données RÉELLES ou VIDES, jamais fabriquées » ; « une étiquette *démonstration* ne rend PAS une donnée honnête » | **Catégorique, rang 0** |

**La lecture fine demandée par le fondateur est décisive.** « Zones publiques agrégées »
n'est **pas** une donnée fabriquée : ce sont de **vrais claims de vrais joueurs**, dont
on réduit la précision. L'agrégation n'invente rien — elle floute. La clause §7.2 offre
donc **deux moyens pour une même intention**, dont **un seul** est malhonnête.

**Décision.** La clause §7.2 est **SCINDÉE** :
- sa branche « **données de démonstration** » est **DEPRECATED — DO NOT IMPLEMENT** ;
- sa branche « **zones publiques agrégées** » est **RETENUE** et devient la lecture
  officielle et unique de §7.2 ;
- l'**intention** (arriver sur une carte explorable, sans permission forcée, sans
  friction) est **conservée intégralement**.

La carte d'arrivée a donc exactement **trois issues honnêtes**, dans cet ordre :
1. **agrégat public réel** (vrais claims agrégés par ville/secteur), quand il existe ;
2. **position réelle sans zone artificielle** + CTA « commencer une course libre »
   (cahier REFONTE E02, mot pour mot), quand l'agrégat n'existe pas ;
3. **état vide nommé** (« aucune zone n'a encore été prise ici »), qui est une
   information vraie, pas un remplissage.

**Alternatives écartées.**
1. *Supprimer §7.2 en entier au motif du conflit.* Écarté : cela jetterait l'intention
   anti-friction avec le moyen malhonnête. Le cahier REFONTE, censé être le plus dur
   des trois, **réaffirme lui-même** cette intention en E02 et fournit le remède exact.
2. *Conserver « données de démonstration » derrière une étiquette « démo ».* Écarté
   **deux fois** et par écrit : `AMENDEMENT-47` (« une étiquette démonstration ne rend
   PAS une donnée honnête ») et cahier REFONTE §0 (« une UI seulement branchée à des
   fixtures »).
3. *Conclure que le conflit n'existe pas, la clause étant lisible honnêtement.* Écarté :
   le mot « démonstration » **figure bien** à la ligne 1073 d'un document de rang 1a.
   Un chantier qui le lit de bonne foi fabriquera. **Un conflit qu'on n'écrit pas est
   un conflit qui sera tranché par accident.**

**Motif.** Trois textes sur quatre sont catégoriques et concordants. Le quatrième offre
une alternative dont une branche est honnête. On ne casse donc pas un document du
fondateur : on **retire une branche et on garde l'autre**, ce qui préserve 100 % de
l'intention et 0 % de la fabrication.

**Impact.**
- §7.2 **n'autorise plus aucune fabrication**, sur aucune surface, sous aucune étiquette.
- Le chantier « **agrégation faible zoom / zones publiques agrégées** » (ligne 13 de la
  matrice de conformité, classé P2 « programme ») **devient le porteur officiel de
  §7.2**. Il cesse d'être décoratif : c'est la seule voie qui honore la lettre ET
  l'esprit de la clause.
- Une seule question reste **ouverte au fondateur** : la lecture des zones publiques
  agrégées est-elle accessible **avant création de compte** ? C'est une décision
  produit + sécurité (RLS sur une lecture anonyme), pas un arbitrage documentaire.
- **Aucun code n'est touché par cette décision** : c'est une décision d'autorité
  documentaire, exécutée par le chantier qui la portera.

---

## 8. LES AUTRES CONTRADICTIONS RELEVÉES

### DÉCISION D-03 — « Rang » et « niveau » ne sont pas le même objet

**Question posée :** le cahier REFONTE E12 exige « rang Run / rang Bike **séparés** » ;
la décision fondateur du 26/07 impose « XP et NIVEAU **GLOBAUX** ». Contradiction ?

**Décision. NON — il n'y a aucun conflit, et le fondateur l'a déjà écrit.**
`docs/design/vague-1/PLANCHES.md` §E12 porte un encadré « **OVERRIDE FONDATEUR —
26/07/2026** » qui tranche exactement ce point :

> « Elle reste vraie pour le **RANG DE SAISON** […] : les classements, les points de
> saison et les territoires restent **SÉPARÉS** par discipline. Elle ne vaut **PLUS**
> pour le **NIVEAU ET L'XP**, que le fondateur tranche **GLOBAUX**. […] un **classement**
> compare des joueurs entre eux (les mêler fabriquerait une hiérarchie fausse) ; un
> **niveau** ne compare personne, il mesure le chemin d'UNE personne — le scinder
> punirait le joueur complet avec deux demi-progressions. »

**Le cahier REFONTE E12 est donc CONFIRMÉ, pas contredit** : « rang » y désigne le rang
compétitif, qui reste séparé. La frontière est portée par un objet unique et nommé,
`ACTIVITY_SCOPE` (`packages/shared/src/game-rules.ts:3173-3200`) : `territory`, `runs`,
`seasonPoints`, `seasonRank`, `leaderboards`, `history`, `missions` = `per_activity` ;
`xp`, `level`, `foulees`, `streak` = `global`.

**Alternatives écartées.** *Scinder l'XP par discipline pour « aligner » sur E12* —
écarté : c'est l'inverse de l'override, et `supabase/functions/_shared/activity_scope_test.ts`
est déclaré verrouiller la frontière (observation datée, non certifiée par moi).
*Fusionner les rangs pour « aligner » sur l'XP* — écarté : fabriquerait une hiérarchie
fausse entre un coureur et un cycliste, ce qui viole « l'app ne ment jamais ».

**Motif.** Un classement est **relatif** (il ordonne des personnes) ; un niveau est
**absolu** (il mesure un chemin). Deux objets, deux règles.

**Impact.** Aucun. La règle est écrite, sourcée et verrouillée. **Ce registre l'inscrit
pour qu'aucun chantier ne « recorrige » la planche vers des niveaux séparés** — ce que
la planche elle-même demande explicitement d'éviter.

### DÉCISION D-04 — Palette : `#C9FF38` contre `#B4FF0D`

**Décision.** `#C9FF38` **est** la chartreuse de GRYD. `#B4FF0D` est **DEPRECATED**.

**Preuves concordantes, dans l'ordre chronologique :** `GRYD - Fondations.dc.html`
(« FONDATIONS — DIRECTION NIGHT PRINT (**B AMENDÉE**) · gryd-chartreuse **#C9FF38** ·
quota 8–10 % ») → `docs/design/vague-1/README.md:19` → cahier REFONTE §5.2
(`--gryd-chartreuse: #C9FF38`) → `packages/shared/src/design-tokens.ts:7-8`, qui écrit
en toutes lettres « **Remplace la charte #B4FF0D** ».

**Alternatives écartées.** *Revenir à `#B4FF0D`* — écarté : quatre sources postérieures
et concordantes le remplacent, aucune ne le défend. *Laisser les deux coexister* —
écarté : « toute couleur hors tokens = bug » ne peut pas avoir deux valeurs.

**Motif.** Le fondateur a amendé la direction B ; la valeur amendée est celle des
Fondations et du cahier. Rien ne plaide pour l'ancienne.

**Impact — dette documentaire nommée, hors de mon lot.** Deux documents portent encore
`#B4FF0D` en toutes lettres et seront lus : `CLAUDE.md` (§Autorité rang 4) et
`ADDENDUM-DESIGN-v0.1.md` (titre + 3 lignes de table). **Une ligne à corriger dans
chacun.** Je n'écris que ce fichier : la correction est inscrite ici comme dette, pas
appliquée.

### DÉCISION D-05 — Collision d'identifiants d'écran

**Le fait.** Deux documents de rang 1 et 3 emploient les **mêmes identifiants pour des
écrans différents** :

| ID | Cahier REFONTE (E01→E12) | Planches Vague 1 (E01→E21) | Collision |
|---|---|---|---|
| E01–E10 | Onboarding, Home Map ×2, Territoire rival, Briefing, Préflight, Live, Capture, Résultat, Partage | identiques | **aucune** |
| **E11** | **CREW** | **Classement local** | **OUI** |
| **E12** | **PROFIL** | **Saison & rang** | **OUI** |
| E13–E21 | n'existent pas | Crew Home, Commutateur Run/Bike, Profil, QR, Boutique, Stats, Badges, Édition profil | s.o. |

**Décision.** Les identifiants du cahier REFONTE sont **préfixés `R-Exx`** dans toute
citation future (`R-E11` = Crew, `R-E12` = Profil). Les planches gardent `Exx` nu. La
table ci-dessus est la correspondance officielle.

**Alternatives écartées.** *Renuméroter les planches* — écarté : 20 écrans sont recalés
et ~40 commits les citent par leur numéro. *Renuméroter le cahier* — écarté : c'est un
document fondateur, on ne le réécrit pas. *Ne rien faire* — écarté : un chantier qui
lit « recale E12 » a **une chance sur deux** de recaler le mauvais écran.

**Motif.** Collision d'espace de noms. **Coût de conservation** : un écran refait à tort
par occurrence, plus le temps de s'en apercevoir. **Coût de correction** : une convention
d'écriture, zéro fichier modifié.

**Impact.** Convention à respecter dans les commits, les docs et les prompts.

### DÉCISION D-06 — `AGENTS.md` est un piège actif

**Décision.** `AGENTS.md` est **OBSOLETE — DEPRECATED — DO NOT IMPLEMENT** comme source
d'instruction.

**Preuve.** `AGENTS.md:3` porte deux valeurs périmées dans une seule phrase : la tagline
« **Cours. Capture. Défends.** » (remplacée le 20/07 par `AMENDEMENT-42` : « Cours pour
ton crew. Conquiers ta ville. ») et « **France entière capturable** » (remplacé le 12/07
par `AMENDEMENT-35` : Europe). `CLAUDE.md:3` porte les deux valeurs à jour.

**Motif et gravité.** `AGENTS.md` est le fichier que **les harnais d'agents lisent par
convention**. Un fichier périmé que personne n'ouvre est une dette ; un fichier périmé
que les outils ouvrent **par défaut** est une source d'erreur active. C'est la seule
raison pour laquelle il est classé ici plutôt qu'en rang 7.

**Impact.** Deux issues, à trancher par celui qui aura le droit d'écrire ailleurs :
le réduire à un pointeur d'une ligne vers `CLAUDE.md`, ou le supprimer. **Le laisser
en l'état est la seule option exclue.**

### DÉCISION D-08 — Crew Run / Crew Bike : cible retenue, delta nommé

**La règle du cahier (§4.6).** « 1 crew Run maximum · 1 crew Bike maximum » ; un joueur
peut donc être « Crew X en Run, Crew Y en Bike » ; un crew hybride peut exister comme
organisation commune avec deux divisions compétitivement séparées.

**Ce que disent les autres documents.** Vague 0 Analyse, contrainte 13 : « Run et Bike
jamais mélangés dans une lecture compétitive : territoires, classements, scoring séparés ;
**même compte, crew partageable** ». Planche E14 : « crews hybrides = **deux métriques
côte à côte, jamais sommées** ». **Ni l'une ni l'autre n'autorise deux crews différents.**
Le cahier REFONTE est le **seul** document qui l'autorise explicitement.

**Observation datée, NON certifiée comme conformité** (26/07/2026, hors de mon lot) :
`supabase/migrations/0002_schema.sql:62` crée `crew_members_one_active_per_user`, un
index unique **partiel par utilisateur** — pas par `(utilisateur, discipline)`. Six
migrations postérieures (`0044`, `0046`, `0049`, `0051`, `0071`) le citent comme
invariant d'adhésion. Le modèle porte donc **une** adhésion active.

**Décision.** Le cahier REFONTE §4.6 est retenu comme **CIBLE documentaire** — il est le
plus récent et le plus explicite (D-01). Il n'est **pas** déclaré atteint.

**Alternatives écartées.** *Retenir « crew partageable » (Vague 0) comme règle* —
écarté : Vague 0 est antérieure et se présente comme une analyse, pas comme une décision.
*Déclarer §4.6 conforme parce qu'un crew existe* — écarté par la règle n°1 : un crew
n'est pas deux crews.

**Motif.** Le delta est **plus grand qu'il n'y paraît** : ce n'est pas un affichage,
c'est la cardinalité d'adhésion, avec un aval (`crew_overview`, `crew_leaderboard`,
comptages, rangs de ville).

**Impact et ce qui reste au fondateur.** Ce qui rendrait §4.6 atteignable : une migration
remplaçant l'index par `(user_id, activity)`. **Elle ne réécrit aucune histoire** (0070 a
rétro-rempli toutes les lignes existantes en `'run'`, valeur vraie et non repli), donc
l'invariant « une migration appliquée n'est jamais réécrite » n'est pas menacé. Le
**timing** relève du fondateur : c'est une migration plus un coût aval.

### DÉCISION D-09 — Le diagnostic §1.2 du cahier : périmé sur le fait, actif sur la règle

**Le texte.** §1.2 « Mode Bike exposé sans proposition de valeur opérationnelle » cite
l'écran affichant « **GRYD ne chronomètre pas encore le vélo : aucune sortie, aucun
territoire, aucun classement.** » et en conclut une fausse affordance.

**Datation, pièce par pièce** (observations sourcées, **non certifiées** comme
conformité — un autre chantier écrit dans ces fichiers en ce moment) :

| Pièce | Ce qu'elle établit | Source | Date |
|---|---|---|---|
| La phrase citée par §1.2 | déclarée **retirée** ; le fichier écrit qu'elle a été vraie « jusqu'au matin du 26/07 » et que la garder aurait été « le mensonge symétrique » | `apps/mobile/src/lib/flags.ts` (bloc `bike`) | 26/07 |
| `0070_activity_dimension.sql` | PK composite `hex_claims (h3index, activity)` + `season_scores (season_id, user_id, activity)` | `supabase/migrations/0070_*.sql` | **appliquée en production le 25/07** (déclaré `game-rules.ts:3214`) |
| `0071`, `0072` | lectures disciplinées (`crew_overview`, `active_bonuses`) | `supabase/migrations/` | **écrites 26/07, exécution NON VÉRIFIABLE depuis le dépôt** |
| `ACTIVITY_SCOPE` | frontière séparé/global explicite, 11 dimensions nommées | `packages/shared/src/game-rules.ts:3173-3200` | 26/07 |
| `ACTIVITY_RULES` / `ACTIVITIES` | bornes anti-triche **par discipline** ; `ACTIVITIES = ['run','bike']` | `packages/shared/src/game-rules.ts:2614, 2907` | 25-26/07 |
| `flags.bike` | **`bike: true`** | `apps/mobile/src/lib/flags.ts:130` | 26/07 |
| Commit `a85189b` | « Fondation VÉLO : deux disciplines réelles, sous revue adversariale » — 17 défauts trouvés par mutation testing | `git log` | 25/07 22:12 |

**Décision.** Le §1.2 est **OBSOLETE sur son CONSTAT DE FAIT** (« aucune sortie, aucun
territoire, aucun classement ») : il a été écrit contre une version antérieure au
25-26/07. Il reste **ACTIF et de rang 1b sur sa RÈGLE** (§4.5 : ne pas exposer Bike comme
mode jouable s'il n'est pas entièrement disponible ; ne jamais afficher « une explication
longue sur l'absence de produit »). **Une règle ne périme pas parce que sa cause a été
traitée.**

**Ce que je ne conclus pas.** Je ne déclare **pas** §4.5 satisfait. Deux réserves sont
écrites **par le code lui-même** dans le bloc `flags.bike` : `sector_snapshot` n'est pas
discipliné (PK `sector_id` seul) et `specialty_leaderboard`/`user_badges` reposent sur
`user_stats` mono-pot. Tant que ces deux lectures restent mono-monde, « **entièrement
disponible** » au sens strict de §4.5 **n'est pas établi** — et un commentaire de code,
si honnête soit-il, ne vaut pas preuve (règle n°2).

**Ce qui rendrait ce diagnostic de nouveau opposable :** que le commutateur Run/Bike soit
peint sur une surface où l'un des deux mondes ne lit rien (secteurs, spécialités, badges).
C'est précisément la mesure à faire — **elle n'est pas faite ici**, et aucune ligne de ce
registre ne prétend l'avoir faite.

**Impact.** Le §1.2 ne peut plus être cité comme un **constat**. Il doit être re-mesuré
avant tout usage. `CURRENT_STATE_CONFORMITY_MATRIX.md` porte le même retard : son
bloquant « Run + Bike suppose de LEVER un invariant anti-vélo » et sa ligne 14
(« Programme Mode BIKE, post-stabilité Run, tout derrière `FEATURE_BIKE_*` défaut off »)
décrivent un monde antérieur au 25/07.

### DÉCISION D-19 — La spec du 26/07 REMPLACE celle du 24/07

**Décision fondateur du 26/07/2026, énoncée en trois mots : « prends le dernier ».**

**Ce qui change.** `docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md` (v1.0, 26/07, 3 419 l.) devient la
**source de vérité PRODUIT unique**, rang **1a**. `docs/product/GRYD_SPEC_MAITRE_UNIFIEE_2026.md` (24/07,
3 973 l.) et son addendum psycho-cognitif deviennent **antérieurs** : conservés comme trace, **ils ne
tranchent plus**. Leurs apports non contredits par la nouvelle spec restent valables, mais on ne les cite
plus pour décider.

**Pourquoi c'était nécessaire.** Deux documents se présentaient chacun comme « la » source de vérité
produit, à deux jours d'écart, avec des modèles de jeu différents. Deux vérités = deux agents qui
travaillent l'un contre l'autre. La règle est désormais mécanique : **le plus récent gagne.**

**Conséquences inscrites, à ne pas redécouvrir plus tard :**

| Sujet | Avant | Après D-19 |
|---|---|---|
| **Numérotation d'écrans** | `E01-E26` (planches Vague 1) | **`E00-E79`** de la nouvelle spec fait foi partout : code, tickets, tests E2E, analytics. Les planches Vague 1 se citent **`V1-*`**. Complète et **remplace D-05**. |
| **Palette primaire** | `#C9FF38` (D-04, autorité `GRYD - Fondations.dc.html`, absent du dépôt) | **`#C2FF23`** (spec §3.2). D-04 avait tranché contre `#B4FF0D` sur l'autorité d'un fichier de design **non versionné** ; la règle « le plus récent gagne » s'applique aussi ici. **Un seul token à changer**, tout en dérive — réversible instantanément si le fondateur veut garder `#C9FF38`. |
| **Géométrie du territoire** | hexagones H3 (`hex_claims`) | **polygones** (spec §1.4). Migration en 4 étapes réversibles — `ARBITRAGES_SPEC_2026.md` A1, `PLAN_IMPLEMENTATION_GRYD.md` lot 1. |
| **Onglets** | 4 visibles (Carte/Crew/Saison/Moi) | **3** (Carte/Crew/Profil) ; Saison sous Profil, Missions sous Carte. |
| **Modèle de contestation** | vol instantané + lock/bouclier | **contestation 60 % + fenêtre de défense 18 h + fortification 0-3** (spec §9). Les protections actuelles deviennent des cas de fortification. |
| **Métrique de classement** | points | **surface** pour le classement, points/XP pour la progression (spec §10.1/§10.5). |

**Ce qui NE change pas.** La **constitution (rang 0) reste au-dessus** : l'app ne ment jamais, anti-p2w,
claim décidé serveur, couleurs par RÔLE (elle gagne contre §3.9 « couleur crew »), zéro donnée EU factice,
aucun nombre magique hors `game-rules.ts`. La spec §0 l'admet elle-même en réservant la primauté d'une
« contrainte démontrée ».

**Documents d'exécution associés** (rang 1b) : `AUDIT_GRYD.md` (état réel cité fichier:ligne),
`PLAN_IMPLEMENTATION_GRYD.md` (13 lots, dépendances, rollback), `ARBITRAGES_SPEC_2026.md` (9 conflits
tranchés).

---

### Contradictions résiduelles, inscrites sans décision de ma part

| # | Contradiction | Documents | Statut |
|---|---|---|---|
| C-1 | **§13.3 : humain dans l'onboarding** — photo/vidéo d'un runner réel exigée ; le code montre une démonstration géométrique ; §13.4 et `AMENDEMENT-47` interdisent le stock. Vague 0 le classe **`R7 · BLOQUANT (assets)` : « aucune photo n'existe »** | Spéc §13.1/§13.3/§13.4 · `AMENDEMENT-47` · Vague 0 R7 | **DÉCISION FONDATEUR** (produit + achat d'assets). Deux issues honnêtes seulement : vraie photo non-stock, ou lever §13.3 par écrit |
| C-2 | **Classements §16 visibles en MVP** vs `flags.season` masqué (décision de scope D8) | Spéc §16/§2.6 · `.claude/orchestration-klaim/DISCOVERY.md` D8 | **DÉCISION FONDATEUR** (périmètre MVP) |
| C-3 | **i18n §23 : ICU MessageFormat / `locales/*.json`** vs catalogue TypeScript typé | Spéc §23 · existant | **TRANCHÉ (reconduit) :** le **résultat** prime sur la forme. Garder le catalogue TS (parité imposée à la compilation, impossible en JSON) ; ajouter la sémantique ICU (`Intl.PluralRules`) dans `format()`. Ne pas migrer vers `locales/*.json` |
| C-4 | **Trois grammaires d'analytics** : `events.ts` §8, Spéc §26, doc PARTAGE §12 | `packages/shared/src/events.ts` · Spéc §26 · PARTAGE §12 | **TRANCHÉ :** table de correspondance officielle, **jamais de renommage brutal** (préserve l'historique d'instrumentation). Le doc PARTAGE ajoute une famille d'events, il ne renomme pas |
| C-5 | **Quota chartreuse** : ≤ 10 % (prompt §5.1) · 8–12 % (cahier §3.1) · 8–10 % (Fondations, cahier REFONTE §5.3) | Vague 0 R2 · Fondations · REFONTE §5.3 | **TRANCHÉ par Vague 0 R2 et confirmé par le cahier :** cible **8–10 %**, tolérance 12 % sur les écrans de victoire uniquement |
| C-6 | **Durée de la capture** : 600–1200 ms · 700–1100 ms · 900–1200 ms selon la source | Vague 0 R3 | **TRANCHÉ par Vague 0 R3 :** **900–1100 ms**, version Reduce Motion ≤ 400 ms sans remplissage animé |
| C-7 | **CTA flottant vs CTA dans la sheet** — le cahier interdit de dupliquer GO dans la sheet, E04/E05 y placent REPRENDRE / COMMENCER LA MISSION | Vague 0 R5 · REFONTE §4.3/E04/E05 | **TRANCHÉ par Vague 0 R5 :** CTA flottant sur les états racine ; CTA sticky en bas de sheet dès qu'une sheet intermédiaire ou pleine est ouverte — **jamais les deux simultanément** |
| C-8 | **`/admin` sert des données PRNG derrière un login** | `AMENDEMENT-47` « EN SUSPENS » · `docs/product/GRYD_admin_dashboard_support.md` | **OUVERT** — inscrit tel quel par A-47, jamais tranché. `AMENDEMENT-47` §0 dit qu'une étiquette ne suffit pas ; un login n'est pas une étiquette, mais ce n'est pas non plus une donnée réelle |
| C-9 | **Le lien public sert encore le bundle mobile-web**, pas `apps/web` | `AMENDEMENT-47` §4 · `apps/web/DEPLOY-VERCEL.md` | **OUVERT** — bascule déclarée non faite par A-47 lui-même |
| C-10 | **`GRYD_reglement_saison_0.md` décrit un classement unique** alors que les points de saison sont séparés par discipline depuis `0070` | `docs/product/GRYD_reglement_saison_0.md` · `0070` · E12 | **DETTE DOCUMENTAIRE** : un règlement **public** qui décrit une règle de jeu périmée est un mensonge de documentation au sens de `CLAUDE.md`. À corriger avant toute publication |

---

## 9. LE SORT DES DOCUMENTS ABSENTS — DÉCISION D-07

**Le problème, en une phrase :** *un document d'autorité hors du dépôt est un document
que le prochain chantier ne lira pas.* Deux documents de rang 1 et 4 (le cahier REFONTE
et les Fondations) vivent aujourd'hui dans `~/Downloads`. Un chantier qui clone le dépôt
ne les a pas, ne sait pas qu'ils existent, et appliquera par défaut les documents périmés
qu'il **trouve** — c'est-à-dire `ADDENDUM-DESIGN-v0.1.md` et sa palette `#B4FF0D`.

**Le précédent existe déjà et il est bon.** La Spéc Maître a été versée sous un nom
raccourci (`docs/product/GRYD_SPEC_MAITRE_UNIFIEE_2026.md`) et elle est **md5-identique**
à l'original. La convention est donc établie : *nom court dans le dépôt, contenu
strictement inchangé.* Il suffit de l'appliquer.

**Recommandation de versement — NON EXÉCUTÉE (phase d'audit, aucun fichier hors celui-ci) :**

| Fichier source (`~/Downloads`) | Destination recommandée | Rang | Motif du nom et de l'emplacement |
|---|---|---|---|
| `GRYD_REFONTE_DIRECTEMENT_BRANCHEE_ZERO_DEMO_CLAUDE_CODE.md` | `docs/product/GRYD_REFONTE_BRANCHEE_2026.md` | **1b** | Même dossier et même convention de nommage que la Spéc Maître, avec laquelle il partage le rang 1 |
| `GRYD_PARTAGE_SOCIAL_OPTIMISE_STRAVA_2026.md` | `docs/product/GRYD_PARTAGE_SOCIAL_2026.md` | **1a** (domaine partage) | Idem ; c'est une spécification produit, pas un plan |
| `GRYD_CAHIER_DES_CHARGES_VISUEL_COMPLET_2026_CLAUDE_DESIGN.md` | `docs/product/GRYD_CAHIER_VISUEL_2026.md` | **4** | Cité par deux documents du dépôt qui ne peuvent pas être honorés sans lui |
| `GRYD - Fondations.dc.html` | `docs/design/vague-0/fondations.html` | **4** | **Autorité de la palette** (D-04) ; à côté de `vague-1/`, dont il est l'amont |
| `GRYD - Vague 0 Analyse.dc.html` | `docs/design/vague-0/analyse.html` | **3** amont | Porte les 8 arbitrages `R1..R8` (C-5, C-6, C-7 ci-dessus en dépendent) |
| `GRYD - Vague 1 Planches.dc.html` | `docs/design/vague-1/planches-full.html` | **3** | La copie actuelle `planches.html` est **tronquée à 256 KiB (E01–E07)** : 14 écrans sur 21 n'ont aujourd'hui **aucune source visuelle** dans le dépôt |
| `GRYD_ETUDE_MARCHE_LOGO_2026_DIRECTION_FINALE.md` | `docs/product/GRYD_ETUDE_MARCHE_LOGO_2026.md` **ou écarté explicitement** | à déclarer | **Cité par zéro document** : c'est le seul cas où je ne peux pas trancher, faute de savoir s'il est une autorité ou un brouillon |

**Deux conditions de versement, non négociables :**
1. **Contenu strictement inchangé** — un document du fondateur ne se résume pas, ne se
   reformate pas, ne se « met pas à jour » au versement. Contrôle : `md5` identique,
   comme pour la Spéc Maître.
2. **Chaque versement met à jour ce registre et `CLAUDE.md`** — un document versé mais
   non inscrit dans la hiérarchie reste invisible, ce qui est exactement le problème
   qu'on résout.

---

## 10. BILAN CHIFFRÉ

Chiffres **recomptés depuis les tables de ce fichier**, pas estimés : 143 lignes de
registre à 7 colonnes, dont 2 doublons volontaires (Spéc Maître et Addendum psycho
figurent au §3 comme documents du fondateur **et** au §5.3 comme fichiers du dépôt) et
1 ligne de regroupement (l'archive Vague 0, qui contient 3 documents comptés à part).
**143 − 2 − 1 = 140 documents uniques.**

```txt
DOCUMENTS INVENTORIÉS ......................... 140
  · dépôt (hors node_modules/.git/worktrees) ... 131   ← vérifié : 0 fichier non cité
      racine ..................................  78    (32 docs + 46 amendements)
      docs/ ...................................  45    (4 + 37 product + 4 design/vague-1)
      .claude/orchestration-klaim/ ............   5
      apps/ ...................................   3    (dont 1 artefact généré)
  · hors dépôt ................................   9
      du mandat fondateur .....................   5    (REFONTE · PARTAGE · Fondations
                                                        · Vague 0 Analyse · Vague 1 Planches source)
      cités comme autorité, hors mandat .......   2    (cahier visuel · étude logo)
      prédécesseurs identifiés ................   2    (partage viral 11/07 · prompt MVP viral 15/07)

ACTIFS (citables comme référence) .............  93
  CONFORME ....................................  47
  PARTIELLEMENT CONFORME ......................  46

DÉPRÉCIÉS ....................................  35
  OBSOLETE — DEPRECATED — DO NOT IMPLEMENT ....  29
  REDONDANT ...................................   6

AUTRES STATUTS ...............................  12
  ABSENT (cité, introuvable au dépôt) .........   6    (REFONTE · PARTAGE · cahier visuel
                                                        · Fondations · Vague 0 · Vague 1 source)
  SURDIMENSIONNÉ ..............................   3    (A-26, A-27, A-28)
  NON VÉRIFIABLE ..............................   2    (étude logo · apps/mobile/.expo/README)
  SOUS-DIMENSIONNÉ ............................   1    (AMENDEMENT-43, « audit en cours »)
  BLOQUANT ....................................   0    ← voir la note ci-dessous

EN CONFLIT (contradiction nommée) ............  19
  tranchées dans ce registre ..................  14    (D-01 à D-09 · C-3 à C-7)
  laissées au fondateur .......................   5    (C-1, C-2, C-8, C-9 + timing de D-08)

DÉCISIONS AUTONOMES PRISES ...................   9    (D-01 → D-09, format imposé)
DÉCISIONS RENVOYÉES AU FONDATEUR .............   5
DETTES DOCUMENTAIRES NOMMÉES, NON CORRIGÉES ..   5    (D-04 ×2 · D-06 · C-10 · renumérotation A-41)
```

**Pourquoi `BLOQUANT` est à zéro, et pourquoi ce n'est pas rassurant.** Aucun *document*
ne porte ce statut, parce que le statut décrit ce qu'un document **est**, et deux
candidats évidents sont mieux décrits autrement : le cahier visuel est `ABSENT` (c'est
la cause ; le blocage est l'effet, inscrit dans sa colonne « Conflits connus »), et la
photographie manquante est un blocage d'**assets**, pas de document — Vague 0 le classe
lui-même `R7 · BLOQUANT (assets)`. **Les blocages réels de ce projet ne sont donc pas
documentaires** : ils sont dans C-1 (photographie), C-2 (périmètre des classements),
C-8 (`/admin`), C-9 (lien public) et dans le timing de D-08. Un registre propre ne les
fait pas disparaître.

**Ce que ces chiffres disent, et qu'il ne faut pas adoucir.** **35 documents sur 140**
— soit **25 % du corpus** — étaient jusqu'à aujourd'hui citables comme autorité alors
qu'ils sont périmés ou redondants. Aucun ne portait de marque. Trois amendements
(`-39`, `-40`, `-41`) portaient même une clause d'auto-primauté qui les plaçait
au-dessus des deux documents du fondateur. Et le fichier que les harnais d'agents
ouvrent par convention, `AGENTS.md`, contenait deux valeurs de positionnement périmées
dans sa troisième ligne.

**Ce que ce registre ne dit pas.** Il ne dit rien de l'état du code. Il ne déclare aucun
écran conforme. Il ne clôt aucune ligne de `CURRENT_STATE_CONFORMITY_MATRIX.md` — dont
il constate au contraire, preuve à l'appui, que **quatre de ses lignes décrivent un monde
antérieur au 25/07** et doivent être re-mesurées.

---

## 11. CE QUI DOIT SUIVRE (dépendances de ce registre)

| # | Livrable | Dépend de | Pourquoi il ne peut pas être écrit avant |
|---|---|---|---|
| 1 | Versement des 6 documents absents | D-07 | Trois des livrables ci-dessous les citent ; les écrire sans eux serait promettre au-delà du dépôt |
| 2 | `CURRENT_STATE_CONFORMITY_MATRIX.md` reconstruite | ce registre + D-09 | Elle doit auditer contre la **bonne** hiérarchie, et re-mesurer les 4 lignes périmées par la décision vélo |
| 3 | `LEGACY_DECISION_AUDIT.md` (mandaté §13, **jamais produit**) | ce registre §4-§6 | C'est le pendant code des 30 documents dépréciés : quel code sert encore une autorité morte |
| 4 | `DATA_WIRING_AUDIT.md` (mandaté §13, **jamais produit**) | D-02, D-08, D-09 | Les trois décisions portent sur des branchements de données : agrégat public, cardinalité crew, disciplines |
| 5 | `IMPLEMENTATION_PLAN.md` (mandaté §13, **jamais produit**) | 2, 3, 4 | Le cahier REFONTE §14 exige que le plan suive l'audit, jamais l'inverse |
| 6 | `VISUAL_QA_REPORT.md` (mandaté §13, **jamais produit**) | 5 + convention D-05 | Une QA visuelle qui cite « E12 » sans préfixe auditerait un écran au hasard sur deux |
| 7 | Corrections documentaires de D-04 et D-06 | ce registre | Une ligne dans `CLAUDE.md`, une dans `ADDENDUM-DESIGN-v0.1.md`, un pointeur dans `AGENTS.md` |
| 8 | Renumérotation `AMENDEMENT-41-SORTIES-DE-GROUPE` → `-48` | D-05 (même motif) | Deux amendements « 41 » rendent toute citation ambiguë |

> **Dernière règle, qui vaut pour ce fichier comme pour les autres.** Ce registre est
> daté du **26/07/2026**. Il sera faux au premier chantier qui le suivra. Une entrée
> disparaît quand le document change, **pas quand une intention est prise** — et
> `AMENDEMENT-47` a déjà payé le prix de l'inverse : « la phrase a précédé le code de
> plusieurs heures, et pendant ces heures elle était un mensonge de documentation. »
