# Progression, saisons et collections — septembre 2026

## Chemin livré

Les migrations `0108`, `0109` et `0110` relient les preuves de mouvement, les choix datés de collection, les changements de fuseau et les objets acquis. `ingest_run` recalcule le compte entier à partir de ses preuves normalisées. L’Edge Function `progression_2026` permet de reprendre ce calcul indépendamment d’une nouvelle sortie, notamment après une interruption ou une suppression de source.

Les mêmes journées font progresser la carrière et une seule collection. Un changement de collection prend effet le lendemain dans le fuseau de progression. Le fuseau demandé prend effet au prochain lundi à minuit dans le fuseau encore actif ; ses périodes passées restent conservées. Les sélections ne réaffectent pas les journées antérieures. Avant l’ouverture réelle d’une collection, les journées conservent leurs XP de carrière sans créditer cette collection.

La première lecture inscrit le compte à la saison réellement ouverte, si une saison a été configurée. Cette collection reste suivie après sa clôture jusqu’à un choix explicite : les XP au-delà de 1 200 continuent la carrière et ne remplissent pas automatiquement une autre saison. Une archive ne peut être choisie que si le compte l’avait commencée. Les archives ne modifient aucun match ni aucune possession géographique.

## API de l’application

Toutes les opérations exigent le JWT du compte. Aucun `userId`, XP, date d’effet ou droit premium fourni par le client n’est accepté.

`supabase.functions.invoke('progression_2026', { body: {} })` recalcule puis renvoie la vue suivante. Le RPC `get_progression_2026()` renvoie la même forme sans exécuter le moteur TypeScript ; `pending: true` indique alors une version de preuves ou de paramètres non encore recalculée. L’application doit distinguer cet état d’un total confirmé.

```ts
type Progression2026 = {
  ruleset: '2026.1';
  totalXp: number;
  activeDays: number; // Toutes les journées >= 10 min, même au-delà du plafond XP.
  pending: boolean;
  timeZone: string;
  pendingTimeZone: { timeZone: string; effectiveAt: string } | null;
  selectedCollectionId: string | null;
  pendingSelection: { collectionId: string; effectiveDay: string } | null;
  season: null | {
    id: string; title: string; startsAt: string; endsAt: string;
    activeDays: number; stage: number; xp: number; archived: boolean;
  }; // Collection suivie, qui peut être une archive ; stage/activeDays = XP / 100.
  collections: Array<{
    id: string; title: string; startsAt: string; endsAt: string;
    state: 'upcoming' | 'current' | 'archived';
    started: boolean; selectable: boolean; xp: number; stage: number;
  }>;
  ownedRewards: Array<{
    id: string; collectionId: string; rewardId: string; tier: number;
    label: string; variant: 'standard' | 'premium'; earnedAt: string;
    equipped: boolean;
  }>;
};
```

| Opération | Arguments RPC | Résultat |
|---|---|---|
| Choisir la saison ou reprendre une archive | `select_progress_collection_2026({p_collection_id})` | `{collectionId, changed, effectiveDay}` ; jour ISO ou `null` pour un choix initial inchangé. |
| Changer le fuseau | `set_progress_timezone_2026({p_time_zone})` | `{timeZone, effectiveAt}` ; demander le fuseau encore actif annule une demande future. |
| Équiper un objet détenu | `equip_season_reward_2026({p_collection_id,p_reward_id,p_variant})` | `{collectionId,rewardId,variant,equipped:true}`. |
| Retirer un objet équipé | `unequip_season_reward_2026({p_reward_id})` | `{rewardId,equipped:false}`. |

Il existe une place par type d’objet : équiper un nouveau cadre remplace le cadre équipé, sans détruire l’ancien objet. Les autres types ne sont pas modifiés. La fiche ne doit proposer que des rendus effectivement implémentés pour cet identifiant. Une preuve d’acquisition n’est ni une affiche déjà générée ni une activité fictive.

Après une mutation, rappeler `progression_2026` puis afficher sa réponse. Les paramètres de choix restent datés même si le recalcul échoue ; un nouveau rappel reprend la même opération sans attribuer deux fois des XP. L’Edge renvoie 401 pour un JWT absent/invalide, 405 pour une méthode autre que POST et 503 lorsque le calcul ou la lecture sont indisponibles. Les OPTIONS sont admises pour le navigateur.

## Calendrier et droits serveur

`configure_season_collection_2026(p_id,p_title,p_starts_at,p_time_zone default 'Europe/Paris')` est réservé au service. Il publie une entrée immuable de six semaines civiles et refuse les chevauchements. Le même appel exact est idempotent. Il ne remet à zéro ni les XP permanents ni la carte.

**Aucune date de saison de production n’est inventée ou insérée par la migration.** Les opérations doivent publier le calendrier réel. Sans cette configuration, la vue expose `season:null` et une liste vide ; les XP de carrière continuent normalement. Les entrées `fixture_*` n’existent que dans la base éphémère des tests.

Les douze modèles gratuits sont référencés par les identifiants `SEASON_REWARDS_2026`. À chaque commit, les paliers réellement atteints créent des possessions uniques `(user, collection, reward, variant)`. Les six variantes supplémentaires concernent exactement les paliers 2, 4, 6, 8, 10 et 12.

`grant_earned_season_variants2026(p_user_id)` est réservé au service. Il appelle `has_gryd_plus_access_2026` fourni par `0109`, refuse les comptes supprimés et les ledgers en attente, puis attribue les variantes déjà méritées pour la collection actuellement suivie ou la saison actuelle déjà commencée. Le webhook et la synchronisation RevenueCat peuvent le rappeler après un rattrapage ou un replay. Aucune ancienne archive non suivie n’est remplie automatiquement. L’expiration des outils GRYD+ ne supprime pas les objets acquis et ne bloque pas leur équipement.

Les tables sont sous RLS, sans accès direct des rôles `anon` ou `authenticated`. Les RPC de lecture/mutation utilisent uniquement `auth.uid()`. La lecture arbitraire d’un autre compte, les commits et les droits premium restent réservés au service. Le commit compare la version lue à la version courante ; un conflit relance un snapshot complet, au maximum trois fois. Le reçu XP de sortie et la correction du compte sont écrits dans la même transaction.

La suppression d’une preuve invalide la version du compte. Un rafraîchissement recalcule les XP à partir des sources restantes et journalise la correction ; les objets déjà acquis ne disparaissent pas parce qu’une sortie a été supprimée. Une procédure de retrait disciplinaire d’objets, distincte d’une suppression volontaire de sortie, n’est pas définie ici.

## Validation et limites

`node scripts/sync-game-rules.mjs` synchronise le moteur partagé. Le test PostgreSQL `supabase/tests/season_collections_2026.pglite.test.mjs` exécute les migrations réelles `0108`–`0110` et le moteur partagé, avec uniquement `users`, `runs` et `auth.uid()` comme fixtures du schéma antérieur. Les tests utilisent `SET ROLE authenticated` pour vérifier les refus réels de privilèges, pas seulement la présence de politiques. Ils vérifient également le drift entre constantes SQL et TypeScript.

Le test couvre calendrier/DST, absence de fausse saison, isolation, immutabilité, idempotence, conflit concurrent, douze paliers en six semaines, six variantes, expiration, équipement, archive, fuseau, suppression et reprise. Les tests Deno du moteur et de la reprise couvrent le découpage des journées, les plafonds, les imports normalisés, l’historique complet et les pannes de snapshot/commit.

Cette validation locale ne déploie rien. Elle n’exerce pas PostGIS, le passage HTTP Supabase, RevenueCat réel, un achat Store, ni une capture GPS physique. Le calcul d’un compte lit encore tout son historique : une optimisation incrémentale à volume élevé doit préserver les périodes et les corrections.

Hors de ce lot : le calendrier d’exploitation à publier, les rendus/exporteurs pour les douze types d’objets dans l’application, les achats sandbox, les imports Santé/Watch opérationnels et leur dédoublonnage canonique entre fournisseurs, la persistance/exécution des défis 5v5, ainsi que l’album géographique à la clôture d’une saison. Les fonctions pures de défis ne prouvent pas leur branchement opérationnel. Le ledger accepte les preuves indoor normalisées, mais cette capacité n’est pas une preuve de connecteur Santé livré.
