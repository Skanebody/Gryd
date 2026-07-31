# Chantier — récupérer la trace via HealthKit / Health Connect

*Établi le 28/07/2026. Tous les faits ci-dessous sont vérifiés dans le code.*

Quand GRYD perd le signal, **le téléphone continue d'enregistrer son propre parcours**.
iOS le fait via HealthKit (`HKWorkoutRouteQuery`), Android via Health Connect. Cette
trace est **réelle et mesurée** — la récupérer n'est pas déduire un trajet, c'est aller
chercher une donnée que l'appareil possède déjà.

> **La ligne rouge, et elle ne bouge pas.** Récupérer ≠ déduire. Relier deux fixes
> distants de 400 m par une droite ferait « traverser » des rues jamais courues, et le
> serveur attribuerait du territoire sur cette invention. Aucune interpolation, jamais.
> Un trou dans la trace est vrai ; il reste un trou.

---

## 1. L'état réel

Les deux adaptateurs **existent déjà** et sont des **stubs honnêtes** — ils n'inventent
rien et affichent « Dev build requis — O8 » plutôt qu'un toggle de démo :

| Fichier | Plateforme | Ce qu'il faudra |
|---|---|---|
| `features/sources/adapters/appleHealth.ts` | iOS | entitlement `com.apple.developer.healthkit` + `NSHealthShareUsageDescription`, module Expo Modules exposant `HKHealthStore`, puis `HKWorkoutRouteQuery` |
| `features/sources/adapters/healthConnect.ts` | Android | `<queries>` du provider + permissions `health.READ_EXERCISE` / `READ_DISTANCE` |

Le chemin d'intégration est **déjà documenté ligne par ligne** dans chaque fichier. Ce
qui bloque n'est donc pas technique : c'est **O8** — le compte Apple Developer et le dev
build natif. Ni Expo Go ni la preview web ne peuvent y accéder.

**Et la règle anti-triche est déjà écrite**, pour Strava : `supabase/functions/strava_import/logic.ts:88`
classe chaque import en `capture_eligible` **ou** `stats_only`, et le §15 est catégorique —
*« imports sans trace → `stats_only`, jamais de claims »*. Une activité manuelle, un
tapis (`VirtualRun`), une sortie sans `summary_polyline` : tout cela compte en distance,
**rien** en territoire.

---

## 2. Les décisions qui t'appartiennent

**① Le statut d'une trace HealthKit récupérée.** C'est la question centrale.

Ma recommandation : **`capture_eligible` seulement si elle comble un trou d'une course
GRYD réellement démarrée**, jamais pour un import autonome. Autrement dit, HealthKit sert
de **filet**, pas de source. La différence est nette : dans le premier cas GRYD a mesuré
le départ, l'arrivée et l'essentiel du parcours, et va chercher le segment manquant ;
dans le second, GRYD n'a rien vu et croirait un tiers sur parole. Un import autonome
reste `stats_only`, exactement comme Strava aujourd'hui.

**② Jusqu'où combler ?** Un trou de trente secondes dans un tunnel n'est pas un trou de
vingt minutes. Ma recommandation : une borne en secondes **et** en mètres, dans
`game-rules.ts`, au-delà de laquelle on ne comble pas et l'écran dit pourquoi. Sans
borne, « filet » devient « source » sans que personne ne l'ait décidé.

**③ La permission.** Lire l'historique santé est **plus intrusif** que lire la position
pendant une course : c'est l'accès à un journal médical, pas à un instant. Ma
recommandation : la demander **au moment du bénéfice** — après une course où un trou a
été constaté, jamais à l'installation — et dire en une phrase ce qu'on lit et ce qu'on
n'en garde pas. Cela suit la règle déjà appliquée à E10.

**④ Ce qu'on stocke.** Une trace récupérée doit passer par le **même pipeline de masquage
serveur** que le reste (`engine/tracePrivacy.ts`, posé hier) : extrémités coupées à 250 m,
zones protégées exclues, simplification à 15 m. Aucune exception : une trace importée n'a
aucune raison d'être mieux protégée ni moins bien qu'une trace mesurée.

---

## 3. Le plan, une fois O8 levé

**Lot 1 — le module natif.** Expo Modules API, une méthode par plateforme, rendant des
points bruts `{lat, lng, t}` et **rien d'autre** (ni fréquence cardiaque, ni poids, ni
quoi que ce soit dont GRYD n'a pas l'usage — la minimisation se décide ici, pas en aval).

**Lot 2 — la décision, PURE.** Un module `engine/traceGapFill.ts` : étant donné la trace
GRYD (avec ses trous horodatés) et la trace de l'appareil, décider ce qui est comblable.
Testé en Deno, avec les cas qui comptent — trou trop long, trou trop grand, traces
désynchronisées, trace santé qui ne recouvre pas le trou, et le cas où combler
changerait le verdict de boucle (à refuser par défaut).

**Lot 3 — le statut.** Étendre la règle `capture_eligible` / `stats_only` existante au
cas « comblé », avec un troisième état explicite dans le rapport post-course : le joueur
doit voir que son territoire vient en partie d'une trace récupérée. Le taire serait un
mensonge par omission sur la provenance d'une capture.

**Lot 4 — l'écran.** Après une course avec trou : proposer la récupération, dire ce
qu'elle lira, et **ne rien peindre si la permission est refusée ou si l'appareil n'a
rien** — anti-bouton-mort.

---

## 4. Ce que ça n'apportera pas

Sois lucide sur le gain réel : HealthKit ne comble un trou **que si le téléphone avait
lui-même un fix pendant ce trou**. Dans un tunnel ou un parking souterrain, les deux
sont aveugles en même temps — la récupération ne donnera rien, et c'est normal.

Le cas où ça marche vraiment, c'est **l'app tuée par le système** ou un plantage : iOS
continue d'alimenter HealthKit quand GRYD n'existe plus en mémoire. C'est un vrai cas,
mais plus rare que ce que l'intuition suggère — les quatre filets existants (tâche
d'arrière-plan, sauvegarde toutes les 15 s, reprise sur 24 h, file d'envoi hors-ligne)
couvrent déjà l'essentiel.

**Conclusion honnête : c'est un chantier de finition, pas un correctif urgent.** Il vaut
d'être fait après O8, avec le dev build — pas avant, et pas à la place d'une vraie
vérification de bout en bout sur appareil.
