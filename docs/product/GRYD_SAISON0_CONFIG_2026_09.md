# Saison 0 — le script de configuration, prêt, NON exécuté

> **Rien de ce document n'a été exécuté en production.** Il est écrit pour être joué par le fondateur,
> une fois, et sous ses yeux. Les valeurs de sortie annoncées plus bas ne sont pas des prévisions :
> elles ont été **mesurées** en rejouant la vraie migration `0121` sur PostgreSQL/WASM le 10/09/2026.
>
> Décision du fondateur (10/09/2026) : début **lundi 14/09/2026 00:00 Europe/Paris**, **6 semaines**,
> fin **dimanche 25/10/2026 23:59**, thème **« Saison 0 »**, les **12 modèles de récompense déjà semés**.
> Contexte : `docs/product/ADR-013-BROUILLON.md` §4 « Configuration (bloquant, sans code) » et
> `docs/product/GRYD_INTVL_ANALYSE_2026_09_10.md` §6 lot 1.

## 0. Ce qu'il faut savoir avant de taper quoi que ce soit

1. **La fonction est immuable après coup.** `configure_season_collection_2026` refuse de modifier une
   saison publiée : rejouer l'appel **à l'identique** est sans effet (elle renvoie la même ligne),
   mais changer le titre, la date ou le fuseau lève `published_season_is_immutable`. Il n'existe
   aucune RPC pour supprimer une saison. **Une erreur de date se corrige au `DELETE` manuel, avant
   que quiconque y soit inscrit.**
2. **Publier le calendrier aujourd'hui n'inscrit personne aujourd'hui.**
   `ensure_progress_account_2026` ne rattache un compte qu'à une saison dont `starts_at <= now() <
   ends_at`. Le 14/09 à 00:00, la première lecture de progression de chaque compte l'inscrit
   automatiquement. Avant cette date, `read_progression_2026` continue de renvoyer `season: null` —
   ce n'est pas une panne, c'est la vérité.
3. **Aucun XP rétroactif.** Les journées antérieures à `initial_collection_effective_at`
   (`greatest(users.created_at, season.starts_at)`) créditent la carrière et **pas** la collection.
4. **Les 12 objets gratuits ne sont pas à créer** : `season_reward_templates_2026` est semée par
   `0121` (paliers 1 à 12). L'octroi est fait par `commit_progress_2026` dès que
   `ledger->collections->'saison_0' >= palier × 100`.
5. **La fonction est `security definer` et révoquée de `public`, `anon`, `authenticated`.** Il faut
   donc l'appeler en `service_role` ou en `postgres` (l'éditeur SQL Supabase et `psql` via les
   identifiants de service le sont).
6. **Secrets** : rien en dur. La chaîne de connexion vient de `scratchpad-secrets.local` (gitignoré).

## 1. Vérifications AVANT — lecture seule, aucune écriture

```bash
# 0. Le dépôt et la base disent la même chose (CLAUDE.md : toujours avant un push).
supabase migration list
```

```sql
-- 1. Aucune saison n'existe encore. Attendu : 0 ligne.
select id, title, time_zone, starts_at, ends_at from public.season_collections_2026 order by starts_at;

-- 2. Les règles gelées sont bien celles du cahier §7.3.
--    Attendu : (t, 6, 12, 100, {2,4,6,8,10,12})
select * from public.season_collection_rules_2026;

-- 3. Les 12 modèles de récompense sont semés. Attendu : 12 | 1 | 12
select count(*) as modeles, min(tier) as premier, max(tier) as dernier
  from public.season_reward_templates_2026;

-- 4. Personne n'est inscrit à quoi que ce soit. Attendu : 0 | 0 | 0
select (select count(*) from public.season_collection_enrollments_2026) as inscriptions,
       (select count(*) from public.season_reward_ownership_2026)      as objets_saison,
       (select count(*) from public.progress_accounts_2026
         where initial_collection_id is not null)                      as comptes_rattaches;

-- 5. Le fuseau demandé existe bien dans cette base. Attendu : 1 ligne.
select name, utc_offset, is_dst from pg_timezone_names where name = 'Europe/Paris';

-- 6. Ce que l'application répond AUJOURD'HUI, pour un compte réel de son choix.
--    Attendu : "season": null  (et ce n'est pas une panne)
-- select public.read_progression_2026('<uuid du compte>'::uuid) -> 'season';
```

Si l'une de ces six lectures ne renvoie pas la valeur attendue, **s'arrêter** : la base n'est pas
dans l'état décrit ici, et la suite ne serait plus le même script.

## 2. L'appel exact — une seule instruction

```sql
-- Saison 0 — lundi 14/09/2026 00:00 (heure de Paris), 6 semaines.
-- `p_starts_at` est un timestamptz : on l'écrit comme un instant LOCAL converti,
-- jamais comme un décalage codé en dur (+02:00 serait faux dès le 25/10).
select public.configure_season_collection_2026(
  'saison_0',
  'Saison 0',
  ('2026-09-14 00:00:00'::timestamp at time zone 'Europe/Paris'),
  'Europe/Paris'
);
```

En une commande, avec le secret hors du dépôt :

```bash
# `GRYD_SUPABASE_DB_URL` est la variable déjà utilisée par `npm run verify:rls` ;
# elle vit dans scratchpad-secrets.local, gitignoré. Aucun secret ici.
set -a && . ./scratchpad-secrets.local && set +a
psql "$GRYD_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 \
  -c "select public.configure_season_collection_2026('saison_0','Saison 0',('2026-09-14 00:00:00'::timestamp at time zone 'Europe/Paris'),'Europe/Paris');"
```

Sans `psql` sur le poste, la même chose avec la dépendance `pg` déjà déclarée :

```bash
set -a && . ./scratchpad-secrets.local && set +a
node -e "import('pg').then(async ({default:pg})=>{
  const c=new pg.Client({connectionString:process.env.GRYD_SUPABASE_DB_URL,ssl:{rejectUnauthorized:false}});
  await c.connect();
  const r=await c.query(\"select public.configure_season_collection_2026('saison_0','Saison 0',('2026-09-14 00:00:00'::timestamp at time zone 'Europe/Paris'),'Europe/Paris') as season\");
  console.log(JSON.stringify(r.rows[0].season,null,2)); await c.end();
})"
```

**Retour attendu** (mesuré le 10/09/2026 en rejouant `0121` sur PostgreSQL/WASM) :

```json
{
  "id": "saison_0",
  "title": "Saison 0",
  "time_zone": "Europe/Paris",
  "starts_at": "2026-09-13T22:00:00+00:00",
  "ends_at":   "2026-10-25T23:00:00+00:00",
  "published_at": "…"
}
```

`ends_at` est **exclusif** : le dernier instant de la saison est donc
**dimanche 25/10/2026 23:59:59 heure de Paris**, exactement la fin demandée. La durée mesurée est
`42 days 01:00:00` — quarante-deux jours **plus une heure**, parce que le changement d'heure du
25/10/2026 rallonge la dernière semaine. C'est la valeur juste : la fonction compte **six semaines
civiles**, pas 1 008 heures.

## 3. Vérifications APRÈS — lecture seule

```sql
-- 1. Les bornes, dites en heure locale. Attendu :
--    debut_local = 2026-09-14 00:00:00 · fin_exclusive_local = 2026-10-26 00:00:00
--    dernier_instant_local = 2026-10-25 23:59:59 · duree = 42 days 01:00:00
select id, title, time_zone,
  to_char(starts_at at time zone 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS')              as debut_local,
  to_char(ends_at   at time zone 'Europe/Paris', 'YYYY-MM-DD HH24:MI:SS')              as fin_exclusive_local,
  to_char((ends_at - interval '1 second') at time zone 'Europe/Paris','YYYY-MM-DD HH24:MI:SS') as dernier_instant_local,
  (ends_at - starts_at)::text as duree
from public.season_collections_2026 where id = 'saison_0';

-- 2. Une seule saison, aucun chevauchement. Attendu : 1
select count(*) from public.season_collections_2026;

-- 3. Le rejeu à l'identique est sans effet (idempotence). Attendu : la MÊME ligne.
select public.configure_season_collection_2026(
  'saison_0','Saison 0',('2026-09-14 00:00:00'::timestamp at time zone 'Europe/Paris'),'Europe/Paris');

-- 4. Aucun objet n'a été distribué par la publication. Attendu : 0
select count(*) from public.season_reward_ownership_2026;

-- 5. Ce que l'application répondra à partir du 14/09 pour un compte réel :
--    "season" non nul, "stage": 0, "archived": false.
-- select public.read_progression_2026('<uuid du compte>'::uuid) -> 'season';
```

**Deux refus attendus, à ne PAS forcer** (ils prouvent que la saison est bien gelée) :

```sql
-- Titre différent → published_season_is_immutable
select public.configure_season_collection_2026(
  'saison_0','Saison zéro',('2026-09-14 00:00:00'::timestamp at time zone 'Europe/Paris'),'Europe/Paris');
-- Autre identifiant, dates qui se chevauchent → overlapping_season
select public.configure_season_collection_2026(
  'saison_0b','Essai',('2026-10-01 00:00:00'::timestamp at time zone 'Europe/Paris'),'Europe/Paris');
```

## 4. Retour arrière

Tant que **personne** n'est inscrit (vérification n° 4 de la partie 1 : trois zéros), la saison peut
être retirée par un `DELETE` explicite. Dès qu'une inscription existe, ce `DELETE` échouerait sur les
clés étrangères — et devrait échouer : effacer une saison à laquelle des gens progressent
effacerait leur progression.

```sql
-- À n'utiliser QUE si les trois compteurs de la vérification n° 4 valent 0.
begin;
  delete from public.season_collections_2026 where id = 'saison_0';
  -- Relire avant de valider :
  select count(*) from public.season_collections_2026;
commit;  -- ou rollback
```

## 5. Ce que cette configuration débloque, et ce qu'elle ne débloque pas

**Débloque** : les 12 paliers gratuits de la saison (`read_progression_2026().season` cesse d'être
`null`), l'inscription automatique des comptes au 14/09, et les variantes GRYD+ des paliers 2/4/6/8/10/12
pour les comptes qui portent un droit actif.

**Ne débloque pas** : les défis de crew 5 contre 5, qui attendent des **arènes**
(`configure_challenge_arena_2026`, ADR-013 §5 question 4) — c'est une décision de géographie, pas de
calendrier, et elle n'est pas dans ce document.

**N'a aucun rapport avec** les défis personnels de la semaine (`0165`-`0168`,
`docs/product/GRYD_DEFIS_SEMAINE_2026_API.md`) : ils fonctionnent sans saison et ne consomment aucun
palier saisonnier. Les deux systèmes ne partagent ni table d'objets, ni compteur.
