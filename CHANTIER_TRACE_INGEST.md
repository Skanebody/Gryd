# Chantier — persister une trace exploitable à l'ingestion

*Établi le 28/07/2026 sur `main` = `821d158`. Tous les faits ci-dessous sont vérifiés
dans le code, pas supposés.*

C'est le **suspens n°1** : il commande la carte complète, le backfill des territoires,
et un signal anti-triche aujourd'hui indisponible. Ce n'est pas d'abord un problème
technique — c'est une décision de confidentialité, et elle t'appartient.

---

## 1. L'état réel, en trois faits

**La colonne existe depuis le premier jour, avec son intention écrite.**
`supabase/migrations/0002_schema.sql:107` :
> `polyline_masked text, -- trace déjà expurgée des zones privées (§7) ; purge à 90 j (RAW_POLYLINE_RETENTION_DAYS) côté job`

**Le serveur a la trace complète au moment de l'ingestion.** Le client envoie
`points: RunPoint[]` (`packages/shared/src/types.ts:128`), chaque point portant
`{ lat, lng, t, acc? }`. Rien ne manque : la matière première est là, à chaque course.

**Elle n'est jamais écrite, et rien ne la purgerait si elle l'était.**
`ingest_run` ne remplit pas la colonne — l'aveu est dans
`supabase/functions/ingest_run/anticheat_wiring.ts:178`. Et surtout : **aucun job
n'applique les 90 jours**. `RAW_POLYLINE_RETENTION_DAYS = 90`
(`game-rules.ts:768`) n'est référencée que par des commentaires et par l'analytics
Premium. Grep exhaustif sur `supabase/functions/*/index.ts` et les migrations : zéro
`delete`, zéro `update … set polyline_masked = null`.

> ⚠️ **Conséquence directe : on ne peut pas livrer l'écriture sans la purge.**
> Écrire une trace dont la doc annonce une rétention de 90 jours que rien n'applique,
> c'est une doc qui promet au-delà du code — la faute n°5 de la constitution, sur la
> donnée la plus sensible du produit. Les deux partent ensemble ou ne partent pas.

---

## 2. Ce qui existe déjà et qu'il ne faut pas réécrire

| Brique | Où | Disponible côté serveur ? |
|---|---|---|
| `simplifyPolyline` (Douglas-Peucker) | `packages/engine/src/polygon.ts:710` | ✅ oui (`_shared/engine/polygon.ts`) |
| `trimTraceEnds` (masque départ/arrivée) | `apps/mobile/src/features/share/sharePrivacy.ts:146` | ❌ **mobile uniquement** |
| `applyPrivacyZones` (exclut les zones privées) | `sharePrivacy.ts:200` | ❌ **mobile uniquement** |
| `SHARE_TRIM_M = 250` | `game-rules.ts:793` | ✅ |
| `SHARE_SIMPLIFY_EPSILON_M = 15` | `game-rules.ts:823` | ✅ |
| `RAW_POLYLINE_RETENTION_DAYS = 90` | `game-rules.ts:768` | ✅ (constante seule, aucun job) |

**Le point dur est là.** Deux des trois primitives de masquage vivent dans l'app mobile.
Or ce dépôt a appris **deux fois cette semaine** — sur les zones d'un rival, puis sur le
mode discret du classement — qu'un filtrage de confidentialité appliqué côté client ne
protège personne : la donnée fine a déjà quitté le serveur. Le masquage doit donc
s'exécuter **dans `ingest_run`**, avant l'écriture. Ces deux fonctions doivent migrer
vers `packages/engine` (pures, testées en Deno, synchronisées vers `_shared`).

---

## 3. Les décisions qui t'appartiennent

Je peux tout implémenter, mais ces quatre choix engagent la vie privée de tes joueurs
et je ne les prends pas à ta place.

**① Que garde-t-on exactement ?** Ma recommandation : réutiliser à l'identique le
pipeline du partage — extrémités coupées à 250 m, zones privées exclues, trace
simplifiée à 15 m. Deux vertus : ces valeurs sont déjà éprouvées et documentées, et la
trace stockée ne peut jamais être *plus précise* que ce que le joueur accepte déjà de
partager publiquement. Une seule règle de confidentialité dans tout le produit.

**② Combien de temps ?** 90 jours est déjà écrit partout. À confirmer — et à trancher :
la purge **efface-t-elle la colonne** (`set polyline_masked = null`, la course reste avec
ses chiffres) ou **supprime-t-elle la course** ? Ma recommandation : effacer la colonne.
La distance et la durée d'une course sont des faits que le joueur a gagnés ; sa trace
géographique est une donnée de localisation. Les deux n'ont pas la même durée de vie.

**③ Cette trace sort-elle du serveur ?** Ma recommandation : **non, jamais**. Elle sert
au backfill des territoires et à l'anti-triche, tous deux serveur. L'app affiche déjà la
trace qu'elle a en mémoire pour la course en cours. Une colonne qui ne sort pas est une
colonne qu'on ne peut pas fuir par erreur — et la RLS le prouvera (`npm run verify:rls`).

**④ Que fait-on des 3 comptes réels déjà en base ?** Ils ont des courses sans trace.
Elles resteront **sans géométrie**, définitivement — on ne peut pas reconstruire ce qui
n'a jamais été écrit, et surtout pas depuis les cellules H3 (le garde `0100` le refuse
désormais en production, je l'ai vérifié en conditions réelles). La carte continuera de
le dire. C'est le prix honnête du démarrage.

---

## 4. Le plan, une fois ces choix faits

**Lot 1 — déplacer le masquage côté moteur.** `trimTraceEnds` et `applyPrivacyZones`
migrent de `features/share/sharePrivacy.ts` vers `packages/engine/src/tracePrivacy.ts`,
pures et testées en Deno. L'app mobile les réimporte depuis là : **une seule
implémentation**, pas deux qui divergeront. `node scripts/sync-game-rules.mjs`.

**Lot 2 — écrire la trace.** Dans `ingest_run`, après le verdict de capture : masquer
puis encoder les points, écrire `polyline_masked`. Deux gardes à tenir — l'écriture ne
doit **jamais** faire échouer une ingestion (une course validée reste validée même si
l'encodage échoue), et une course en `flagged` ou `rejected` n'écrit rien.

**Lot 3 — la purge, dans le même lot.** Une fonction edge planifiée qui passe la colonne
à `null` au-delà de `RAW_POLYLINE_RETENTION_DAYS`, idempotente, avec son test PGlite.
Sans elle, le lot 2 ne part pas.

**Lot 4 — le backfill devient possible.** La vue `territories_backfill_trace_ready`
(posée par `0100`, aujourd'hui vide par construction) commencera à rendre des lignes.
Le backfill se fera alors depuis la **trace**, jamais depuis H3.

**Vérification.** `npm run gate`, `npm run test:sql`, puis `npm run verify:rls` sur le
vrai projet pour prouver qu'aucun rôle client ne lit `polyline_masked`.

---

## 5. Ce que ça débloque

La carte cesse d'être incomplète : les captures récentes auront enfin un polygone issu
de la vraie boucle du joueur, au lieu d'être invisibles. Le signal anti-triche
`duplicate_trace`, aujourd'hui déclaré indisponible dans le rapport, devient calculable.
Et E68 « détail historique » peut enfin montrer la trace d'une course passée — ce qui
était impossible faute de donnée, pas faute d'écran.
