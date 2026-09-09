# Défis de crews 2026 — contrat serveur P1

## Parcours écrit

La migration `0122_refonte_2026_crew_challenges.sql` ajoute les invitations entre deux crews, l’inscription personnelle avec consentement, le verrouillage des équipes de cinq, l’annulation avant départ, les préférences de secteur, les contributions persistées et les publications de résultat. Elle conserve le moteur partagé `challenges2026.ts` comme référence testée pour le calcul des scores. Aucun abonnement n’entre dans le calcul.

Chaque défi utilise une discipline, un fuseau fixe, une semaine du lundi à minuit au lundi suivant et trois secteurs figés. Chaque personne réserve au maximum une équipe par sport et semaine ; des semaines de fuseaux différents ne peuvent pas créer deux réservations qui se chevauchent. Les changements de crew après le début ne réaffectent pas les contributions de l’équipe initiale.

Une personne doit s’inscrire elle-même. Son consentement concerne la participation agrégée aux secteurs et ne rend pas sa trace ou sa boucle publique. Les directions des deux crews confirment que les trois secteurs sont comparablement accessibles. Un secteur choisi uniquement après une sortie n’est pas une préférence admissible.

## Catalogue réel préalable

`configure_challenge_arena_2026(p_id,p_title,p_activity,p_time_zone,p_sectors,p_access_source,p_reviewed_at)` est réservé au service. Les trois secteurs sont un tableau ordonné `{id,title,geometry}`. Le serveur valide leurs polygones avec PostGIS. L’ordre des identifiants dans ce tableau est l’ordre de repli présenté avant inscription. L’arène publiée est immuable ; son retrait utilise `retired_at` côté exploitation, et une modification demande une nouvelle version.

**Aucune arène n’est créée par la migration.** Une absence de catalogue est une indisponibilité réelle, jamais remplacée par des carrés fictifs. La revue d’accès terrain, la fraîcheur des sources et l’accord pratique des deux groupes restent nécessaires. Le calcul ne prétend pas déterminer automatiquement l’accessibilité depuis les kilomètres parcourus.

## RPC de l’application

Toutes les RPC suivantes exigent une session authentifiée. Les identités et dates d’action proviennent du serveur. Les rôles de direction autorisés sont `co_captain` et `founder`, identiques au droit existant d’invitation d’un crew.

| RPC | Arguments | Effet / résultat |
|---|---|---|
| `list_challenge_arenas_2026` | `{p_activity:'run'|'bike'}` | Tableau `{id,title,activity,timeZone,sectors,accessSource,reviewedAt}`. |
| `create_crew_challenge_2026` | `{p_client_id:UUID,p_opponent_crew_id:UUID,p_arena_id,p_starts_at:ISO,p_access_confirmed:true}` | Direction du crew courant ; lundi futur à minuit dans le fuseau de l’arène. Retour `{id,status:'invited',replayed}` ; même identifiant client = même invitation. |
| `accept_crew_challenge_2026` | `{p_challenge_id,p_access_confirmed:true}` | Direction du crew invité ; retour `{id,status:'assembling'}`. |
| `join_crew_challenge_2026` | `{p_challenge_id,p_consent:boolean}` | Inscription/retrait de soi uniquement ; retour `{id,joined}`. Aucun capitaine ne consent à la place d’un membre. |
| `lock_crew_challenge_2026` | `{p_challenge_id}` | La direction verrouille son équipe de cinq volontaires ; `{id,status}` devient `scheduled` quand les deux équipes ont confirmé. |
| `cancel_crew_challenge_2026` | `{p_challenge_id}` | Direction de l’une des équipes, avant le début ; `{id,status:'cancelled'}`. Réservations libérées. |
| `set_challenge_preference_2026` | `{p_challenge_id,p_sector_id}` | Enregistre une préférence datée ; `{sectorId,recordedAt}`. Seule la dernière préférence antérieure au départ de l’activité compte. |
| `withdraw_challenge_activity_2026` | `{p_run_id}` | Retire les contributions d’une activité appartenant à l’appelant, en conservant ses tentatives consommées. |
| `get_crew_challenges_2026` | `{p_activity}` | Tableau de défis accessibles, avec la forme ci-dessous. Reprend aussi la publication en retard. |

La découverte d’un crew adverse utilise le RPC existant `crew_discovery`, limité à une ville. Une invitation n’envoie pas automatiquement un message privé ou une notification externe depuis cette migration.

États : `invited → assembling → scheduled → active → final`, ou `cancelled` avant départ. Une équipe incomplète au début est annulée. Le retrait d’un inscrit avant le début déverrouille son équipe pour permettre un remplacement volontaire. Un non-inscrit ne peut pas déverrouiller une équipe en simulant un retrait. Après le début, une personne déjà dans l’effectif peut retirer son consentement puis le réactiver pour de futures sorties ; aucun nouveau membre n’entre dans l’effectif. Le retrait reste possible après le résultat final ; la réinscription après la fin ne l’est pas.

Erreurs utiles pour l’écran : `direction_required`, `challenge_unavailable`, `five_volunteers_required`, `team_full`, `roster_locked`, `player_already_registered`, `challenge_started`, `challenge_closed`, `preference_unavailable`. Un blocage renvoie un motif générique, sans indiquer qui a bloqué qui.

```ts
type ChallengeView2026 = {
  id: string; title: string; activity: 'run' | 'bike';
  status: 'invited' | 'assembling' | 'scheduled' | 'active' | 'final' | 'cancelled';
  reason: string | null; timeZone: string; startsAt: string; endsAt: string;
  sectors: Array<{ id: string; title: string; geometry: object }>;
  myTeamId: string; canManage: boolean; joined: boolean; rostered: boolean;
  myPreference: null | { sectorId: string; recordedAt: string };
  teams: Array<{ id: string; name: string; accepted: boolean; locked: boolean; players: number; side: 0 | 1 }>;
  ownScore: { teamId: string; totalPoints: number; sectors: Record<string, number> };
  publishedResult: null | {
    scores: Array<{ teamId: string; totalPoints: number; sectors: Record<string, number>; matchPoints: number }>;
    winnerTeamId: string | null; isDraw: boolean;
  };
  publishedAt: string | null; resultRevision: number | null;
  myContributions: Array<{
    runId: string | null; day: string; sectorId: string;
    points: number; withdrawn: boolean; usedFallback: boolean;
  }>;
};
```

`ownScore` exclut volontairement les points de match : ils permettraient de déduire le score adverse en direct. Les résultats comparatifs utilisent seulement `publishedResult`, avec sa date et sa révision. Les identifiants d’activités retournés appartiennent uniquement à l’appelant. Aucun polygone d’activité, masque personnel, position en direct ou identifiant de joueur adverse n’apparaît dans cette API.

## Preuve géographique et calcul

`ingest_run` appelle désormais `stage_game_activity_2026` avec les faces admissibles et les segments de trace validés. Cette fonction conserve dans une même transaction la capture libre et les contributions de défi. Une panne conserve l’activité durable et laisse le résultat du jeu en attente ; les XP sportifs restent indépendants.

Pour un défi, le serveur intersecte les segments réellement suivis avec le bord de la face puis les secteurs. Il retire les raccords synthétiques et les géométries interdites. Une trace intérieure au secteur mais absente du bord de cette boucle, un passage inventé entre deux segments GPS ou le simple fait d’englober un secteur ne suffit pas. Le seuil est de 400 m à pied et 1 000 m à vélo. Une boucle privée peut contribuer avec le consentement distinct du défi. Une preuve d’horloge insuffisante ou une revue anti-triche en cours empêche l’attribution.

Les deux premières journées physiques attribuées valent au maximum trois points chacune. Une journée et une activité ne peuvent être attribuées deux fois. L’ordre des importations ne crée pas une troisième journée payante ; un jour antérieur reçu plus tard corrige le plafond. Une affectation déjà validée conserve son secteur. Les suppressions et retraits créent des annulations persistées et ne libèrent aucune tentative.

Chaque équipe atteint au maximum trente points. Le score de match compare les trois secteurs, avec un point par victoire et un demi-point par égalité ; aucun départage par allure, distance supplémentaire ou heure de sortie. Les constantes SQL sont comparées aux constantes partagées par un test exécutable, et le résultat SQL est comparé au moteur TypeScript.

Le délai de réception d’un défi est indépendant du délai de capture libre : fermeture physique avant la fin du défi, fin technique et réception avant `endsAt + 24 heures`. Une réception trop tardive pour la carte libre peut donc rester admissible dans la fenêtre explicite du match. Les imports via d’autres fournisseurs ne sont toutefois pas déclarés livrés par cette possibilité de calcul.

## Publication et confidentialité

`publish_due_challenges_2026()` est un job SQL réservé au service, programmé chaque minute si `pg_cron` est installé. Il active les effectifs prêts et publie le dernier instantané autorisé. Une lecture authentifiée reprend ce même traitement si le job a été interrompu.

Le score adverse change au plus une fois par jour à midi dans le fuseau figé. La dernière publication comparative ordinaire est le dimanche midi. Seules les preuves reçues **et validées** avant la coupure entrent dans l’instantané. Le résultat final paraît après les vingt-quatre heures de synchronisation. Un retrait peut réviser immédiatement un instantané existant, à coupure inchangée, sans y incorporer de nouvelles activités ; l’historique des révisions est conservé.

Les tables sont sous RLS et interdites directement aux clients. Les fonctions internes de score, de mesure et de publication sont réservées au service. Les blocages sont vérifiés dans les deux sens ; les identités résolues depuis les anciens blocages par pseudo sont mémorisées pour qu’un changement de nom ne contourne pas le blocage. Les anciens pseudos sans correspondance connue ne sont pas rapprochés arbitrairement.

## Validation et limites de livraison

Le harnais `supabase/tests/crew_challenges_2026.pglite.test.mjs` exécute la migration réelle `0122` sur PostgreSQL/WASM, avec le schéma antérieur minimal en fixtures. Il utilise les rôles authentifiés pour tester les refus effectifs de privilèges et couvre le cycle, les effectifs, les blocages, les chevauchements de fuseaux, les plafonds, les imports tardifs, les préférences, les retraits, les résultats, midi/DST et la comparaison avec le moteur partagé.

Le harnais PostGIS `supabase/tests/refonte2026.postgis.test.mjs` contient aussi les cas géographiques de défi : vraie portion de frontière, secteur entouré sans passage, rupture GPS, discipline, refus sans consentement/provenance, réception finale et absence de polygone public issu d’une participation privée. **Ces assertions spatiales n’ont pas été exécutées sur ce poste**, qui ne dispose pas d’une base PostgreSQL/PostGIS locale. Le harnais refuse toute cible hébergée et sort en code 2 sans base locale ; ce n’est jamais un test vert.

Pas de déploiement, d’inscription réelle ou de match fictif. L’exécution réelle de `pg_cron`, les essais GPS sur appareils, les imports Santé/Watch canoniques, la calibration territoriale, le matchmaking automatique et le défi privé miroir restent à valider ou implémenter séparément. La table d’adhésion de crew héritée reste globale au compte ; les réservations de défis sont, elles, séparées par discipline. Aucun classement de ligue ou album de fin de saison n’est fabriqué par ces résultats de match.
