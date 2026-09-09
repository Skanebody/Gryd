# Défis personnels de la semaine — contrat, états, règles

> Migrations `0165` → `0168` (`0169`, laissé libre par ce lot, a été pris depuis par
> `0169_challenge_measure_after_capture_admission_2026.sql`). Constantes :
> `WEEKLY_QUEST_RULES_2026`, `WEEKLY_QUEST_CATALOGUE_2026`, `WEEKLY_QUEST_REWARDS_2026`
> dans `packages/shared/src/game-rules.ts`. Preuve : `supabase/tests/weekly_quests_2026.pglite.test.mjs`
> (19 assertions) et `apps/mobile/src/features/refonte/WeeklyQuests2026Model.test.ts` (8 tests).
> Cadrage : `docs/product/ADR-013-BROUILLON.md` §2.2 ① et §2.3 ; cahier §7.4, §7.5, §4.2, G23, G24.

## 1. Ce que c'est, en une phrase

Deux défis à la fois, par discipline, dans une semaine civile lundi → dimanche (Europe/Paris),
qui demandent d'aller **ailleurs**, **avec quelqu'un** ou **autrement** — jamais **plus** — et dont
la récompense est **un objet du catalogue, jamais de l'XP et jamais un avantage de jeu**.

## 2. Les six défis de départ

| Défi | Famille (§7.4) | Discipline | Condition vérifiée par le serveur | Objet |
|---|---|---|---|---|
| `exploration_new_locality` | Exploration | de la discipline | Une boucle **publiée** de la semaine, dans un carreau où aucune boucle publiée n'avait été fermée **avant** la semaine (toutes disciplines confondues) | Sticker Ailleurs |
| `exploration_two_distinct_loops` | Exploration | de la discipline | **2** signatures de boucle distinctes parmi les boucles publiées de la semaine | Motif Deux boucles |
| `ensemble_group_outing` | Ensemble | de la discipline | Un `crew_events` non annulé, commencé, dans la semaine ; RSVP `coming` du joueur **antérieur au départ** ; ≥ 2 membres actifs `coming` dont un autre que l'organisateur ; une activité `2026.1` du joueur, même discipline, à ± 6 h du départ | Emblème Ensemble |
| `double_practice_two_sports` | Double pratique | transverse | Deux **journées admissibles différentes** du registre dans la semaine, l'une avec une preuve `run`, l'autre avec une preuve `bike` | Affiche Double pratique |
| `regularity_two_active_days` | Régularité | transverse | **2** journées admissibles du registre dans la semaine (jamais 3 : le plafond XP est déjà à 3, §7.1) | Motif Régulier |
| `hosting_open_outing` | Accueil | de la discipline | Un `crew_events` **créé par le joueur**, non annulé, commencé, dans la semaine, avec ≥ 2 membres actifs `coming` dont un autre que l'organisateur | Composition Accueil |

**Conditions de proposition** (`weekly_quests_2026.requires`) : `crew` exige une adhésion active ;
`both_disciplines` exige une activité `2026.1` réelle dans **chacune** des deux disciplines — sans
quoi « Double pratique » n'est jamais proposé. Proposer un objectif hors de portée serait la
pression que §4.2 refuse.

**Défi transverse** (`cross_discipline`) : sa condition ignore la discipline consultée, donc il n'est
proposé **qu'une fois** par semaine — un index unique partiel l'impose. Un défi de discipline, lui,
décrit deux objectifs différents et peut habiter les deux onglets.

## 3. Le contrat de lecture

```ts
type WeeklyQuests2026 = {
  ruleset: '2026.1';
  asOf: string;          // horodatage de la mesure
  passedWeek: string;    // lundi RÉVOLU (YYYY-MM-DD) — la seule date renvoyée
  current: WeeklyQuest2026[];   // la semaine en cours, 2 par discipline
  passed:  WeeklyQuest2026[];   // la semaine précédente, avec son statut final
  objects: Array<{
    rewardId: string; label: string; kind: RewardKind; slot: string;
    questId: string; earnedAt: string; equipped: boolean;
  }>;
};
type WeeklyQuest2026 = {
  activity: 'run' | 'bike';
  questId: string; version: number;
  family: 'exploration' | 'ensemble' | 'hosting' | 'regularity' | 'double_practice' | 'start' | 'running' | 'cycling';
  condition: 'new_locality' | 'distinct_loops' | 'validated_group_outing'
           | 'run_day_and_bike_day' | 'active_days' | 'hosted_open_outing';
  threshold: number;
  status: 'active' | 'completed' | 'expired';
  completedAt: string | null;  // lié au statut, dans les deux sens
  reward: { rewardId: string; label: string; kind: RewardKind; slot: string; owned: boolean };
};
type RewardKind = 'sticker' | 'trace_pattern' | 'photo_composition' | 'personal_emblem' | 'poster';
```

| Opération | RPC | Droits |
|---|---|---|
| Lire (et faire attribuer) ses défis | `read_weekly_quests_2026()` | `security definer`, révoqué de `public`/`anon`, accordé à `authenticated` |
| Équiper / retirer un objet possédé | `equip_weekly_quest_reward_2026({p_reward_id, p_equip})` | idem ; `reward_not_owned` si l'objet n'est pas gagné |

**Ce que la réponse ne porte PAS, et ne portera jamais** : `expiresAt`, `endsAt`, `remaining*`,
`deadline`, `countdown`, `daysLeft`, ni même la date de la semaine **en cours**. Un client ne peut
donc pas peindre un compte à rebours, même par erreur : la donnée n'existe pas. `parseWeeklyQuests2026`
refuse d'ailleurs toute réponse qui en porterait une — ce serait une régression de contrat, pas une
donnée à afficher.

## 4. Les états de l'écran

| État | Ce qui le déclenche | Ce que l'écran dit |
|---|---|---|
| Pas connecté | aucune session | « Connecte-toi pour voir tes défis de la semaine. » + bouton, **seulement si** la plateforme est configurée |
| Lecture en cours | RPC en vol | indicateur + « Lecture de tes défis… » |
| Lecture impossible | erreur RPC, réponse mal formée, contrat violé | « Tes défis n'ont pas pu être lus. » + « Réessayer » — **jamais** « aucun défi » |
| Lu, et vide | 0 défi dans la discipline consultée | « Aucun défi dans cette discipline cette semaine. » + « Ils reviendront la semaine prochaine. » |

Jamais un « 0 » nu, jamais un spinner infini, jamais un repli inventé (L8, L14, L19).

## 5. L'expiration, silencieuse

Une semaine finit dimanche 23:59:59 (Europe/Paris). Le passage à `expired` a lieu **24 h plus tard**
(`lateSyncHours`, calqué sur `CHALLENGE_RULES_2026.finalSyncWindowHours`) : une boucle fermée dimanche
à 23:50 se publie 30 minutes plus tard et doit encore compter pour SA semaine. Cette tolérance n'est
jamais affichée — ce n'est pas un sursis à annoncer, c'est une justesse de calcul.

L'expiration **n'envoie rien** : ni notification, ni entrée de journal, ni pastille. Le seul effet
visible est qu'à la lecture suivante, la carte de la semaine précédente dit « La semaine du 7
septembre est passée », sans « raté » et sans « dommage ».

Deux chemins l'appliquent, et ils disent la même chose :
`expire_weekly_quests_2026()` (cron `expire-weekly-quests-2026`, toutes les heures, et **mode
accéléré des tests : la fonction s'appelle directement**) et `evaluate_weekly_quests_2026(user)`,
qui expire avant d'évaluer — un défi expiré ne récompense donc pas, même si sa condition devient
vraie ensuite.

## 6. D'où vient la validation — jamais d'une déclaration

Il n'existe **aucune** RPC « j'ai réussi ». Une condition est vraie parce que le serveur retrouve un
fait qu'il a lui-même écrit :

1. **`capture_events_2026.status = 'published'`** (0118). Une sortie privée, en attente ou retirée ne
   compte pour aucun défi : la vie privée ne fuit pas par un compteur (garde-fou 4 d'ADR-013).
2. **`progress_accounts_2026.ledger`** (0119/0121/0144), écrit par le seul `commit_progress_2026`. La
   discipline d'une journée vient de la preuve sportive (`progress_activity_2026.evidence.sport`),
   jamais d'un champ déclaré par l'application.
3. **`crew_events` + `crew_event_rsvps`** (0019/0085/0124) : un rendez-vous réellement commencé, non
   annulé, avec des participants réels.

L'évaluation est déclenchée par deux faits serveur — la publication d'une capture et le changement du
registre — et par la lecture du compte. Les tables sont fermées à `authenticated` ; les fonctions
d'attribution, d'évaluation et de condition sont révoquées de tous les rôles clients.

## 7. Où vit la géographie, et pourquoi elle n'est pas dans PostGIS

Le « secteur » d'exploration est un carreau de **0,01°** (~1,1 km en latitude), calculé sur la moyenne
des sommets de l'anneau GeoJSON — même technique et mêmes limites que `gryd_geo_bucket` (0105), à une
maille plus fine. Il est **calculé à l'ingestion**, sur le GeoJSON du moteur pur
(`PhysicalFace2026.geometry`, `areaM2`), par `note_weekly_quest_faces_2026(p_run_id, p_faces)` — un
appel isolé ajouté dans `supabase/functions/ingest_run/refonte2026.ts`, juste après la mise en scène.

Raison, dite franchement : la géométrie de `capture_events_2026` est en `extensions.geometry` et
demande PostGIS, que le seul PostgreSQL du poste (PGlite) n'a pas. Une règle de jeu dont personne ne
peut rejouer la preuve n'est pas une règle de jeu. **Aucune fonction spatiale n'entre dans 0165-0168.**

Ce carreau n'est **pas** un quartier administratif, et l'interface ne le nomme jamais ainsi : elle dit
« un secteur fait environ 1 km de côté ». La table `weekly_quest_faces_2026` ne porte ni trace ni
polygone : deux nombres arrondis, une classe de taille, et une policy `auth.uid()` en plancher.

La **déduplication** du §7.4 (« traces presque identiques ») compare une signature =
carreau fin (0,002° ≈ 220 m) + classe de taille (10 000 m²). Elle ne sépare pas deux boucles
imbriquées de taille voisine ; ce qu'elle garantit, et qui est le but, c'est qu'on ne compte pas deux
fois la **même** boucle refaite.

## 8. La maison des objets, et pourquoi elle est à part

`weekly_quest_reward_templates_2026` / `..._ownership_2026` / `..._equipment_2026`, sur le modèle de
`0144` (récompenses de niveau) et pour les mêmes raisons : `season_reward_ownership_2026` exige une
collection **publiée** (y ranger un objet de défi obligerait à inventer une saison) et son catalogue
est un instantané gelé dont `tier` est unique ; `commercial_ownership_2026` exige un **reçu du
Store** (en forger un décrirait un achat qui n'a pas eu lieu).

- Un objet gagné est **permanent** (§7.5) : ni un retrait de capture, ni une correction de source, ni
  la fin d'un abonnement ne le reprend.
- **Aucun objet de défi n'est un cadre ni un titre** : ces deux emplacements d'identité sont déjà
  partagés par 0121 et 0144, et G22 interdit « sept rangs différents au-dessus du nom ».
- `kind` est contraint à cinq natures cosmétiques ; **il n'existe aucune colonne où écrire « xp »**,
  et `xp_reward = 0` est une **contrainte**, pas une valeur par défaut.

## 9. Ce qui reste à faire, et que ce lot ne prétend pas avoir fait

- Les objets de défi n'apparaissent **pas encore** dans l'écran Collection ni dans le Studio de
  partage : ces surfaces appartiennent au lot des collections. L'écran des défis dit donc exactement
  ce qui est vrai — l'objet est à toi, il est équipé — et **rien de plus**.
- Le catalogue ne contient que **six** défis et six objets. Un joueur régulier les possède tous en
  trois semaines environ ; les cartes diront alors honnêtement « Déjà dans ta collection ». Étendre
  le catalogue est une décision éditoriale, pas un correctif technique.
- Aucune notification n'est émise, et c'est volontaire (§2.4 d'ADR-013 : la plateforme ne peut pas en
  émettre, et §4.2 interdirait de toute façon celle-ci).
