# GRYD - Tracés GPS : ce qu'on garde, ce que tu décides, ce qui s'efface (LOT T)

> **Rang** : document produit, subordonné au cahier de septembre (`GRYD_REFONTE_INTEGRALE_2026_09.md`,
> rang 0, ADR-012) et à `docs/DECISIONS.md`. Il ne tranche rien que le cahier tranche déjà.
> **Statut** : LIVRÉ. Migrations `0195` et `0196`, écrans Confidentialité et Détail de sortie.
> Ce document décrit du code écrit et testé, pas une intention.
> **Date** : 11/09/2026. Chaque fait de dépôt cité a été vérifié le même jour par lecture directe.

**Décision du fondateur (11/09/2026, soir), mot pour mot :** « Trace GPS : ce qui est le plus
adapté, ou mettre dans les réglages l'option, mais ne pas purger directement. »

---

## 0. Le défaut que ce lot ferme

GRYD garde **deux formes** de la même trace. Jusqu'au 11/09/2026, elles avaient deux durées de vie
**opposées**, et le joueur n'avait son mot à dire sur aucune des deux.

| Forme | Colonne | Écrite par | Contenu | Durée de vie AVANT ce lot |
|---|---|---|---|---|
| Trace protégée | `runs.polyline_masked` | `ingest_run/index.ts` | géométrie seule, extrémités coupées de `SHARE_TRIM_M`, zones privées retirées, simplifiée à 15 m | **effacée à 90 jours pour tout le monde** (`purge_expired_polylines`, migration 0101 ; job `gryd_purge_polylines`, migration 0102) |
| Points détaillés | `runs.trace_points_2026` | `ingest_run/refonte2026.ts` | points complets et horodatés (lat, lng, t, précision) | **jamais effacée, par rien** |

La forme la **plus détaillée** survivait donc indéfiniment pendant que la forme la **plus protégée**
disparaissait. C'est l'inverse exact de ce qu'une purge de vie privée devrait produire, et cela se
lisait dans l'app : le détail d'une sortie annonçait « elle s'efface au bout de 90 jours » sous une
carte dessinée à partir de la colonne qui, elle, ne s'effaçait jamais.

Le rang 0 disait déjà l'inverse de 0101. Cahier §18.5 : « trace canonique conservée **tant que
l'activité est conservée** ». La purge uniforme à 90 jours était donc un écart au cahier, pas son
application.

---

## 1. Ce qui est conservé, par défaut

**Par défaut, rien n'est effacé.** La conservation vaut `keep`, et `keep` n'a aucune durée : aucune
purge ne peut en découler. Le tracé d'une sortie vit aussi longtemps que la sortie.

Trois raisons, et aucune n'est un renoncement à la minimisation.

1. **C'est la décision du fondateur**, et elle est aussi celle du cahier (§18.5).
2. **Un défaut à 90 jours aurait été une purge de masse.** Poser la préférence avec ce défaut aurait
   effacé, la nuit du déploiement, les tracés de tous les comptes existants, sans que personne l'ait
   demandé. Un défaut qui détruit est un défaut qu'on n'a pas le droit de choisir à la place des gens.
3. **Le vrai défaut de 0101 n'était pas sa durée, c'était son silence.** Elle effaçait une donnée que
   le joueur croyait garder, sans écran pour le lui dire ni bouton pour l'accélérer. Ce lot rend les
   deux : un choix, et un effacement immédiat à la demande.

La minimisation RGPD porte sur ce qu'on **collecte** et sur la **finalité**, pas sur une durée
uniforme imposée à tous. La trace d'une sortie **est** le service : c'est elle qui dessine la carte
du détail, les splits, la courbe d'allure et le dénivelé.

---

## 2. Les trois choix, et ce qu'ils font

Réglage : **Confidentialité et données → TRACÉS DÉTAILLÉS**. Source unique des valeurs :
`TRACE_RETENTION_CHOICES_2026` (`packages/shared/src/game-rules.ts`, section « TRACÉS 2026 »).

| Choix | Effet | Ce qui reste, dans tous les cas |
|---|---|---|
| **Tout garder** (défaut) | rien n'est jamais effacé | — |
| **90 jours** | les **deux** formes s'effacent 90 jours après le départ de la sortie | distance, durée, allure, points, XP, capture et terrain |
| **1 an** | les **deux** formes s'effacent 1 an après le départ de la sortie | idem |

**Les deux formes partent ensemble, et c'est le cœur de l'alignement.** Garder les points détaillés
en effaçant la trace protégée (ou l'inverse) laisserait le joueur croire qu'il a effacé sa trace
alors que l'autre colonne la porte encore. Une préférence de vie privée qui ne couvre qu'une moitié
de la donnée n'est pas une préférence, c'est une illusion.

**Où vit le réglage.** Colonne `user_profiles.trace_retention_2026` (migration 0195), à côté de
`profile_visibility`, `map_sharing` et `discreet_mode` : `user_profiles` **est** la table de
préférences de confidentialité côté serveur depuis 0011, et 0126 la lit déjà. Une table dédiée aurait
créé une seconde source de vérité à joindre partout, exactement le défaut que 0135 a corrigé.

**Lecture et écriture.** `my_privacy_settings_2026()` rend désormais `traceRetention` à côté des trois
autres réglages ; `set_trace_retention_2026(choice)` l'écrit. RPC séparée, pas un quatrième paramètre
de `save_privacy_settings_2026` : les trois réglages d'audience gouvernent **ce que les autres
voient**, celui-ci gouverne **ce que tu gardes**. Deux décisions, deux portes, et la signature de 0135
reste intacte pour les clients déjà déployés.

**Le quatrième état.** Si le serveur ne dit pas quelle conservation il applique (serveur antérieur à
0195, valeur inconnue), l'écran affiche « Conservation inconnue » et **ne présélectionne aucun
choix**. Afficher « Tout garder » sans que le serveur l'ait dit serait le repli inventé que L19
interdit. L'échec est **local au bloc** : les trois réglages d'exposition, eux, restent utilisables,
parce que ne pas savoir lire une conservation n'expose personne.

---

## 3. Le job

`purge_traces_by_retention_2026(p_at timestamptz default now())` — migration 0196, `pg_cron`
quotidien à **04:20 UTC** (`trace-retention-purge-2026`), réservé au `service_role`.

- Il ne touche **aucun** compte réglé sur `keep`, ni aucun compte sans ligne `user_profiles`. Le mode
  de défaillance d'une fonction destructive doit être « ne rien détruire ».
- Il met les deux colonnes de trace à `NULL`. Il **ne supprime jamais** la sortie, ses statistiques,
  sa capture ni un mètre carré de territoire : `capture_events_2026` porte sa **propre** géométrie
  (0118), donc effacer une trace ne retire rien à personne et ne rejoue aucune possession.
- Il est **idempotent** : son `where` exige qu'au moins une des deux colonnes soit non nulle.
- `p_at` **est** le mode accéléré des tests : ils avancent l'horloge en paramètre au lieu d'attendre
  400 jours. Aucun drapeau caché, aucune variable d'environnement.

**La rupture avec 0102.** 0196 exécute `cron.unschedule('gryd_purge_polylines')`. Laisser ce job
tourner à côté du nouveau aurait produit exactement le mensonge qu'on corrige : un écran qui annonce
« Tout est conservé » pendant qu'un cron efface la moitié de la trace chaque nuit.
`purge_expired_polylines(integer)` (0101) **n'est pas supprimée** — une migration ne se réécrit jamais
— elle n'est plus ordonnancée, et son commentaire le dit.

**Le journal.** `trace_purge_log_2026` (0195). Une ligne **par passage**, même à vide : c'est la seule
façon de distinguer « le job n'a rien trouvé » de « le job ne tourne plus ». Elle porte le décompte
purgé **et** le décompte retenu par le plancher anti-triche : sans ce second nombre, un plancher qui
retient dix dossiers et un job sans travail écriraient la même ligne.

> **Ce que le job n'écrit PAS, délibérément :** aucune ligne par sortie purgée. Ce serait
> reconstruire, au moment même où l'on efface, un index durable de « cette personne a couru ce
> jour-là » — la donnée que la purge est censée retirer. Un journal plus bavard aurait été une
> régression de vie privée déguisée en traçabilité.

**Le diagnostic.** `polyline_retention_health` (0101) comptait « les traces de plus de 90 jours encore
stockées » : avec `keep` par défaut, ce compteur monterait pour toujours en signalant une panne qui
n'existe pas. Elle est remplacée par `trace_retention_health_2026`, qui ne compte comme **en retard**
que ce qu'une préférence **réelle** aurait dû faire effacer, isole ce que le plancher retient, et rend
la date du dernier passage du job.

---

## 4. L'effacement à la demande

Une préférence de conservation regarde l'**avenir**. Elle ne répond pas à « je veux que **cette**
sortie-là n'ait plus de tracé, maintenant ».

`delete_run_trace_2026(run_id)` — migration 0195, propriétaire uniquement, immédiate, journalisée
(`trace_purge_log_2026`, source `on_demand`). Elle efface **les mêmes deux colonnes** que le job.

**Dans l'app** : Détail de sortie (`/course/[id]`), tout en bas, sous le partage, action secondaire
« Supprimer le tracé de cette sortie ». Elle n'apparaît **que s'il y a un tracé** — sans tracé, il n'y
a rien à effacer et la ligne disparaît au lieu d'échouer. Elle se confirme, et **la confirmation dit
ce qui reste avant de demander** : « La carte de cette sortie et ses splits disparaissent
définitivement. Sa distance, sa durée, son allure et le terrain pris restent. » Sans cette phrase,
l'action se lirait « supprimer la sortie » et personne n'y toucherait.

Après l'effacement, l'écran **relit** la sortie et retombe sur l'état honnête qui existait déjà :
« Tracé non disponible pour cette sortie. Ses mesures, elles, sont conservées. »

**Chaque issue a sa phrase**, et aucune ne se déguise :

| Issue | Ce que l'écran dit |
|---|---|
| `deleted` | « Tracé supprimé. Il n'en reste rien chez GRYD. » |
| `already_empty` | « Cette sortie n'avait déjà plus de tracé. » (ni succès à fêter, ni échec) |
| `review_open` | « Vérification en cours » + le motif (voir §5) |
| `not_found` | « Cette sortie n'est plus dans ton historique. » |
| échec réseau / hors session | « Rien n'a été supprimé. Ton tracé est intact. » |

`not_found` couvre **deux** situations que la RLS rend volontairement indistinguables : identifiant
inconnu, ou sortie d'autrui. Les distinguer dirait à qui forge un identifiant « cette sortie existe,
mais elle est à quelqu'un d'autre » — un oracle d'existence sur la donnée d'un tiers (§12).

---

## 5. Le plancher anti-triche

**Tant qu'une revue anti-triche (`anticheat_reviews`, 0081) ou un recours (`anticheat_appeals`) est
OUVERT sur une sortie, son tracé n'est effacé par rien** : ni le job, ni le bouton.

Il protège les deux camps, et c'est ce qui le rend défendable :

- **côté joueur** — le tracé **est** la preuve de son recours. Le laisser s'effacer pendant
  l'instruction reviendrait à lui faire perdre son dossier par une préférence réglée des mois plus tôt ;
- **côté jeu** — sans plancher, effacer la preuve deviendrait le premier geste de qui vient d'être
  signalé.

Ce n'est pas une confiscation du droit à l'effacement : c'est sa **suspension pendant l'instruction
d'une réclamation**, le cas que prévoit l'art. 17(3)(e) du RGPD. Le refus est **nommé**
(`review_open`), il est **temporaire**, et la copie promet le retour du droit : « Tu pourras l'effacer
une fois la vérification terminée. » Une revue close ne retient plus rien, et la sortie part au
passage suivant du job.

**Pourquoi ce plancher-là et pas d'autre.** 0081 le dit sans détour : aucun engagement de délai n'est
tenu par du code (`sla_due_at` n'existe pas). Une revue peut donc rester ouverte plus longtemps que la
plus longue des conservations — c'est le **seul** état du schéma qui puisse dépasser 90 jours. Le
pipeline de capture, lui, n'a besoin d'aucun plancher : une capture `pending` expire dans les 24 h de
la fermeture physique (0156), très loin des 90 jours de la plus courte conservation. Ce cas a été
examiné et écarté, il n'a pas été oublié.

---

## 6. L'export RGPD

**Les tracés eux-mêmes sortent déjà** : `export_account` exporte `runs` sans projection restreinte,
donc `trace_points_2026` et `polyline_masked` partent avec la sortie. Vérifié plutôt que supposé.

Ce qui manquait, c'est la **preuve de l'effacement**. `trace_purge_log_2026` entre dans
`PERSONAL_TABLES` (clé `traceDeletions2026`) : le joueur peut vérifier que son droit à l'effacement a
bien été exécuté, sur quelle sortie et quand.

Les lignes du **job** n'en sortent pas, et ce n'est pas un oubli : elles portent `user_id is null` (un
agrégat par passage, sans identité), donc le filtre `.eq('user_id', moi)` ne les rend jamais.

---

## 7. Ce que ce lot ne fait pas

- **Il ne chiffre rien.** Le cahier §18.5 propose « coordonnées brutes privées chiffrées et accès
  limité ». Ce lot ne le livre pas et ne le promet pas. Ce qu'il livre est la **durée de vie** de ces
  coordonnées et le moyen de les effacer.
- **Il ne distingue pas les trois causes d'un tracé absent.** Sortie antérieure à l'écriture des
  traces, purge par préférence, ou effacement à la main : rien en base ne les sépare côté client (le
  journal n'est servi à aucun client). L'écran dit donc ce qui est vrai dans les trois cas plutôt que
  de deviner laquelle s'applique.
- **Il ne touche pas `TERRITORY_ANALYTICS_WINDOW_DAYS`.** Cette fenêtre d'analyse premium est encore
  dérivée de `RAW_POLYLINE_RETENTION_DAYS` (90) au motif qu'« on n'analyse pas plus loin que ce que le
  projet accepte de conserver ». Le motif a changé sous elle : le projet accepte désormais de
  conserver tant que le joueur le veut. Arbitrage produit, hors du périmètre de ce lot, à reprendre.
- **`purge_expired_polylines(90)` reste exécutable à la main** par le `service_role`. Elle **ignore**
  la préférence et le plancher. Son commentaire le dit ; personne ne devrait l'appeler.

---

## 8. La preuve

`supabase/tests/trace_retention_2026.pglite.test.mjs` — 21 contrôles, dans le gate (`npm run test:sql`).

**Étape 0, rejouée sur un vrai Postgres** : avant 0195 aucune préférence n'existe (ni colonne, ni
RPC) ; `purge_expired_polylines(90)` efface `polyline_masked` pour **deux comptes qui n'ont rien
demandé** et laisse `trace_points_2026` intacte ; 0102 planifie cette purge chaque jour avec 90 écrit
en dur.

Puis : le défaut ne purge rien à 400 jours simulés ; `days_90` efface les **deux** formes à 91 jours
et pas à 89 ; les statistiques et la géométrie de capture sont vérifiées **caractère par caractère**
après purge ; `days_365` ne se déclenche pas à 100 jours et se déclenche à 366 ; le plancher retient
une revue ouverte **et** un recours ouvert, et le journal les compte ; l'idempotence ; les quatre
refus nommés de l'effacement à la demande ; le diagnostic qui ne crie plus au loup ; le **miroir** des
durées entre `game-rules.ts` et le SQL ; et les privilèges (`anon` jamais, purge globale au
`service_role` seul).

Côté mobile : `traceRetention.test.ts` (module pur) et `traceRetentionScreen.test.ts` (gardes de
source sur les deux écrans), dans `npm run test:mobile`.

**Ce que PGlite ne prouve pas**, et qu'aucun vert ne doit laisser croire : il tourne en
superutilisateur (la RLS n'est pas prouvée, seulement les `grant`), il n'a pas PostGIS (la géométrie
de capture est reconstruite en `text` : ce qui est prouvé, c'est qu'aucune instruction de la purge ne
touche cette table), et il n'a pas `pg_cron` (le retrait du job de 0102 est prouvé sur le **texte** de
la migration, pas sur `cron.job`). La vérification en production reste à faire après le push :
`supabase migration list`, puis `select * from public.trace_retention_health_2026`.
