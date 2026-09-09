# GRYD — « Ta commune, cette semaine » : le contrat

> Note de CONTRAT, pas de décision. La décision est `docs/product/ADR-013-BROUILLON.md` §2.1,
> qui n'a aucune autorité tant que le fondateur ne l'a pas datée dans `docs/DECISIONS.md`.
> Ce document décrit ce que le code FAIT, migrations `0160` → `0164`. Il ne promet rien au-delà.

**État au 10/09/2026 :** migrations écrites et testées, **non appliquées en production** (la prod
est à `0128`). Tant qu'elles ne sont pas poussées, aucune de ces RPC n'existe côté serveur, et
l'écran mobile affiche son état « indisponible ». `docs/STATUS.md` ne bouge que sur preuve
`qa-verify`.

---

## 1. En une phrase

Un joueur, une discipline, une commune, une semaine : **la somme du terrain NOUVEAU publié entre
lundi 00:00 et dimanche 23:59 (Europe/Paris)**. Le terrain tenu s'affiche à côté, comme un état.
Sous cinq personnes classées, **il n'y a pas de classement**.

---

## 2. Les constantes — une seule source

Tout vient de `LEADERBOARD_RULES_2026` (`packages/shared/src/game-rules.ts`, ADR-003), plus
`LEADERBOARD_ROWS_LIMIT` (50, déjà en vigueur — on ne l'a pas dupliquée).

| Champ | Valeur | Ce qu'il commande |
|---|---|---|
| `subject` | `user` | le crew se classe aux **résultats de matchs**, jamais aux km² |
| `metric` | `weekly_new_terrain_m2` | la mesure qui ORDONNE |
| `stateMetric` | `held_terrain_m2` | affichée, jamais triée, pas même en départage |
| `minRankedSubjects` | **5** | sous ce nombre, aucune ligne n'est servie |
| `scopes` | `commune`, `department`, `country` | les portées réellement servies |
| `declaredNotServed` | `region`, `europe` | nommées, **jamais peintes** (un onglet gris est un bouton mort) |
| `weekStartsOn` / `timeZone` | `monday` / `Europe/Paris` | fuseau NOMMÉ : l'heure d'été ne décale pas le lundi |
| `snapshotIntervalMinutes` | 60 | cadence du `pg_cron` |
| `snapshotMaxAgeMinutes` | 180 | au-delà, la mesure est servie **et dite périmée** |

`public.leaderboard_rules_2026()` est le **miroir SQL** de cet objet ; le test PGlite compare les
deux champ par champ. Le seuil n'est ni un paramètre d'appel ni une constante de requête : un
client ne peut pas demander « classe-moi ces trois personnes ».

---

## 3. Les fonctions

### Lecture — pour un compte (`authenticated`), jamais pour `anon`

#### `read_leaderboard_2026(p_activity, p_scope, p_scope_ref) → jsonb`

```jsonc
{
  "contract": "leaderboard.2026.1",
  "status": "ranked" | "not_enough_people" | "unavailable",
  "reason": null | "below_threshold" | "not_measured_yet" | "unknown_scope",
  "activity": "run" | "bike",
  "scope": "commune" | "department" | "country",
  "scopeRef": "insee-76540",          // city_zones.city_id | code département | "FR"
  "scopeLabel": "Rouen" | null,       // nom RÉEL de la commune ; null ailleurs (aucun nom inventé)
  "measuredAt": "2026-09-10T12:00:00Z" | null,
  "stale": false,                     // true = plus vieux que snapshotMaxAgeMinutes
  "window": { "start": "…", "end": "…", "timeZone": "Europe/Paris" },
  "entries": [                        // VIDE sauf si status = "ranked" ; ≤ 50 lignes
    {
      "rank": 1, "tiedCount": 1,
      "key": "<md5 scopé au lecteur>",  // pseudonyme 0126, jamais l'uuid d'autrui
      "label": "Marie" | null,          // null = identité non publiable pour CE lecteur
      "crew": { "key": "…", "name": "…" } | null,
      "isMe": true,
      "subjectId": "<uuid>" | null,     // renseigné UNIQUEMENT sur ma propre ligne
      "newTerrainM2": 1234.5,           // la mesure qui classe
      "heldM2": 987.6                   // l'état, jamais un rang
    }
  ],
  "me": { "ranked": true, "rank": 1, "tiedCount": 1, "newTerrainM2": 1234.5, "heldM2": 987.6 } | null,
  "subjectsCount": 7 | null,
  "minRankedSubjects": 5
}
```

Règles opposables :

- `status = "ranked"` **exige** `measuredAt` non nul et au moins une ligne. Un classement sans sa
  date de mesure est un mensonge d'écran ; le client refuse même de le lire.
- `status ≠ "ranked"` ⇒ `entries` **vide**. Un podium à trois est une donnée factice même si les
  trois lignes sont vraies.
- `me` est servi dès qu'une mesure existe, y compris sous le seuil : ma mesure me concerne, ce
  n'est pas une comparaison. **Non classé ⇒ tous les chiffres à `null`** — l'écran écrit une
  phrase, jamais un « 0 » nu.
- `unavailable` a deux raisons distinctes : `not_measured_yet` (rien n'a été mesuré cette semaine)
  et `unknown_scope` (la commune n'est pas ouverte). On ne dit **jamais** « personne n'a couru » :
  c'est une affirmation qu'on ne vérifie pas.
- Une identité non visible (`discreet_mode` exclut d'ailleurs la personne en amont ;
  `profile_visibility`, blocage) **garde son rang et perd son nom**. Retirer la ligne fausserait le
  classement de tout le monde.

**Erreurs levées :** `authentication_required`, `invalid_activity`, `invalid_scope`.

#### `my_leaderboard_scopes_2026(p_activity) → jsonb`

```jsonc
{
  "contract": "leaderboard.scopes.2026.1",
  "activity": "run",
  "commune": "insee-76540" | null,
  "window": { "start": "…", "end": "…", "timeZone": "Europe/Paris" },
  "scopes": [ { "scope": "commune", "ref": "insee-76540", "label": "Rouen",
                "subjectsCount": 7, "measuredAt": "…", "open": true } ],
  "declaredNotServed": ["region", "europe"],
  "minRankedSubjects": 5
}
```

« Ma commune » se déduit **(1)** du dernier tableau de commune où j'ai figuré, **(2)** à défaut de
la ville de mon compte si c'est une commune réelle. **Jamais d'une position GPS** — un test vérifie
que le corps de la fonction ne contient ni coordonnée ni appel spatial. `open = subjectsCount ≥ 5`.
L'app ne peint que les portées ouvertes.

### Serveur uniquement (`service_role`)

| Fonction | Rôle |
|---|---|
| `board_scope_communes_2026(scope, ref)` | les communes RÉELLES d'une portée (`city_zones.city_id LIKE 'insee-%'`) |
| `board_eligible_events_2026(activity, from, to)` | qui a le droit d'être compté — **aucune géométrie** |
| `board_source_metrics_2026(activity, scope, ref, from, to)` | m² pris et m² tenus par propriétaire (PostGIS) |
| `take_leaderboard_snapshot_2026(activity, scope, ref, at = now())` | écrit un snapshot + ses lignes, rend son `uuid` |
| `active_leaderboard_scopes_2026(at)` | les portées où un événement éligible est tombé cette semaine |
| `take_active_leaderboard_snapshots_2026(at)` | le balayage horaire ; rend le nombre de snapshots pris |

---

## 4. Qui compte, qui ne compte pas

Un événement de capture entre dans la mesure si **tout** tient (`board_eligible_events_2026`) :

1. `capture_events_2026.status = 'published'` — jamais `pending`, `private`, `scheduled` ni
   `withdrawn` (recette n° 36 : un rang qui bouge avant le polygone trahit une sortie privée) ;
2. `closed_at` dans `[lundi, lundi suivant[` — la fenêtre porte sur **la fermeture de la boucle**,
   pas sur l'instant de publication ;
3. `runs.shared_map_consent_2026` — relu à CHAQUE mesure : un consentement retiré après publication
   sort la personne du classement sans attendre une republication ;
4. `user_profiles.map_sharing <> 'none'` ;
5. `user_profiles.discreet_mode = false` (lecture fail-closed : un drapeau nul vaut discret) ;
6. `users.deletion_requested_at is null` ;
7. `runs.game_status_2026 <> 'pending'` — §18.4 : conserver l'activité, autoriser le jeu libre et
   **autoriser un rang** sont trois décisions. Une sortie remise en revue garde ses polygones sur la
   carte et perd son rang.

**Ne sont jamais lus :** allure, chrono, records, XP, journées actives, messages, parrainages,
achats. Aucun champ payant n'entre dans le calcul (`COMMERCIAL_PROPOSAL_2026` : tous les
multiplicateurs valent 1, et le moteur pur n'a aucun paramètre par lequel un achat pourrait entrer).

---

## 5. La géographie

Rien, en base, ne dit dans quelle commune un événement s'est produit : `capture_events_2026` (0118)
n'a pas de `city_id`, et `runs` n'en a pas non plus (**vérifié en production le 09/09/2026**). La
commune d'un mètre carré est donc **la commune qui le contient** : on mesure l'aire de
l'intersection entre la géométrie publiée et le contour de chaque commune de la portée.

- une boucle à cheval sur deux communes compte dans les deux, **chacune pour sa part** ;
- un département est **exactement** la somme de ses communes : les trois portées lisent la même
  intersection, elles ne peuvent pas se contredire ;
- un mètre carré hors de toute commune **ouverte** n'est compté nulle part. Assumé : le référentiel
  ne connaît pas ce sol, et l'inventer serait pire que de ne pas le compter ;
- `'paris'` et `'lille'` (0004) sont des **rectangles** sans code INSEE — Paris y couvre quatre
  départements. Ils ne sont pas des communes et ne captent rien. Seules les zones `insee-<code>`,
  ouvertes par présence avec un contour geo.api.gouv.fr, comptent ;
- `fr_communes` (34 969 communes, Etalab) n'a **pas** de polygone : elle sert à vérifier qu'un code
  existe, jamais à délimiter.

---

## 6. Le job

`pg_cron` **1.6.4 est installé** sur le projet `gryd` (constaté le 09/09/2026, dix jobs actifs) :
aucune Edge Function n'est nécessaire.

```
leaderboard-snapshots-2026   0 * * * *   select public.take_active_leaderboard_snapshots_2026()
```

Il ne balaie que les portées **actives** — celles où un événement éligible est tombé cette semaine.
Une commune sans course n'a pas de snapshot, et la lecture le dit avec ses propres mots.
Le preneur **ne déclenche jamais** `rebuild_ownership_2026` (qui efface et rejoue une discipline
entière) : il lit, il n'ordonne pas de recalcul.

**Premier snapshot, à la main, après application des migrations :**

```sql
select public.take_active_leaderboard_snapshots_2026();   -- rend le nombre de snapshots pris
```

---

## 7. Le stockage (tables de 0082, étendues et non réécrites)

| Colonne | Ce qu'elle porte pour ce classement |
|---|---|
| `leaderboard_snapshots.period` | `weekly` |
| `leaderboard_snapshots.scope` | `commune` / `department` / `country` (valeurs **ajoutées** au `check` par 0160) |
| `leaderboard_snapshots.metric` | `weekly_new_terrain_m2` — **quelle mesure a fait le rang** |
| `leaderboard_snapshots.subjects_count` | combien de sujets étaient classés à la prise |
| `leaderboard_entries.conquered_area_m2` | le terrain **pris** dans la semaine (celui qui classe) |
| `leaderboard_entries.controlled_area_m2` | le terrain **tenu** (l'état) |
| `leaderboard_entries.rank` / `tied_count` | rang de compétition : les ex æquo partagent, le suivant saute |
| `leaderboard_entries.previous_snapshot_at` | ancienneté dans CE tableau — le seul départage |

Chaque colonne garde le sens que 0082 lui a donné ; `metric` dit laquelle a ordonné, pour qu'un
lecteur de la table n'ait jamais à le deviner. Les tableaux 2026 sont **fermés à la lecture
directe** par une policy RESTRICTIVE : sans elle, la policy publique de 0082 aurait servi un podium
à trois en lecture directe et le seuil n'aurait protégé que l'écran.

---

## 8. Ce que le contrat NE couvre pas

- **La preuve spatiale.** PGlite n'a pas PostGIS : `leaderboard_2026.pglite.test.mjs` prouve les
  règles (seuil, fenêtre, exclusions, tri, lecture, privilèges) et **remplace** la mesure.
  L'intersection commune × événement est prouvée par `leaderboard_2026.postgis.test.mjs`, qui exige
  un PostgreSQL/PostGIS local et **sort en code 2** quand il n'y en a pas.
- **L'effet des policies.** PGlite tourne en superutilisateur : on vérifie l'existence des policies
  et l'absence de privilèges au catalogue, pas qu'un tiers se fasse refuser. La preuve réseau reste
  `npm run verify:rls`.
- **La lecture sans compte.** Elle est refusée, et c'est un choix : un classement nomme des
  personnes dans un lieu. Voir la question ouverte n° 1 ci-dessous.

---

## 9. Questions ouvertes — fondateur

1. **Lecture sans compte.** Servir le classement au rôle `anon` publierait, pour quiconque détient
   la clé publique, la liste des gens qui courent dans une commune cette semaine. J'ai refusé ;
   l'écran propose la connexion au lieu d'un aperçu. À confirmer ou à renverser.
2. **La fenêtre porte sur `closed_at`.** Une boucle fermée dimanche 23:50 et publiée lundi 00:20
   compte pour la semaine où elle a été courue, et apparaît donc dans un snapshot déjà clos. Le
   classement affiché ne couvre que la semaine EN COURS : la semaine passée n'est jamais recorrigée.
3. **Le terrain hors commune ouverte** n'est compté nulle part (§5). Alternative : ouvrir la commune
   traversée dès la première intersection, pas seulement au départ de la course.
4. **Le département n'a pas de nom** dans ce dépôt : l'app affiche « Département 76 ». Importer le
   référentiel Etalab (code → nom, et département → région) ouvrirait aussi la portée **région**,
   aujourd'hui déclarée et non servie.
5. **`me.heldM2` n'existe que si je suis classé.** Servir le terrain tenu d'une personne absente du
   snapshot demanderait une mesure spatiale à chaque lecture ; ça n'a pas été fait.
