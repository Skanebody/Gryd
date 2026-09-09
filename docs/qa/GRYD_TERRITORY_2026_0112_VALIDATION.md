# Carte et lecture territoriale — migration 0112

Validation locale du 9 septembre 2026. Aucun déploiement, aucun changement de données distantes, aucun territoire ou joueur de démonstration inséré dans l’application.

## Ce qui est livré

- `get_ownership_2026(activity,west,south,east,north)` : contrat GeoJSON `ownership.2026.2`, discipline réelle, `asOf`, crew actuel du lecteur et rôle explicite de chaque face (`mine`, `crew`, `others`). Le client ne déduit plus une affiliation depuis un identifiant. Le rôle crew est un regroupement de possessions individuelles via `crew_members.left_at is null` ; il ne donne pas un second titre de propriété. La table existante ne porte pas `crews.activity` : aucun sport du crew n’est inventé.
- `properties.areaM2` représente la géométrie encore présente pour cette face ; `capturedAreaM2` représente sa géométrie initiale. Les identifiants des autres propriétaires ne sont pas exposés. Les refus de partage, comptes en suppression et blocages sont filtrés serveur. Un ancien contrat ou une géométrie mal formée produit une erreur visible, jamais une carte de remplacement fictive.
- Carte : mes terrains pleins chartreuse, crew en trait neutre discontinu, autres en trait gris fin. Légende compacte, filtre des trois rôles dans Couches, détail au toucher et état explicite invité/chargement/échec/vue vide.
- `capture_result_2026(runId)` reste réservé au propriétaire ou au service. Il ajoute `publishedAreaM2`, `remainingTerrainM2` et `asOf`. Le restant est l’intersection de l’empreinte publiée d’origine avec **toutes les possessions actuelles du même joueur et de la même discipline** : se recapturer ne fait pas disparaître artificiellement l’ancien résultat. La mesure historique nette reste distincte.
- Le motif principal du résultat est limité à l’état actif des faces, pour qu’une face privée ne fasse pas décrire une capture partiellement publiée comme entièrement privée. L’interface distingue absence de boucle admissible, seuil insuffisant, interruption/précision GPS, zone personnelle, origine/heure à confirmer, fermeture sur exclusion, contrôle nécessaire et délai avant publication.
- La préférence privé/partagé est un store commun Carte/Prévol, persisté par propriétaire. Écriture avant départ, erreur explicite, aucun transfert de consentement entre comptes ; le décompte relit l’autorité et le choix durable avant de lancer. Le refus global `user_profiles.map_sharing='none'` reste opposable serveur.
- Selon le cahier §5.6, les masques automatiques de début/fin protègent les **médias**. Seules les zones personnelles explicitement protégées sont des masques de capture. Une face qui touche une telle zone reste entièrement privée, sans trou révélateur. Aucun ancien événement privé n’est republié par cette migration.
- L’entrée de publication crew dans le résultat est volontaire et limitée à une activité serveur valid/partial, détenue par le compte actuel, sans upload local en attente. Elle ouvre un aperçu ; elle ne publie rien automatiquement.

## Vérifications exécutées

**87 tests Deno, 0 échec**, sur les fichiers suivants :

- `apps/mobile/src/features/refonte/territoryState2026.test.ts` : 11 — persistance du consentement, changements de compte pendant lecture/écriture, échec de stockage, validation du contrat/coordonnées, motifs et zéro restant.
- `apps/mobile/src/features/run/ownerWiring2026.test.ts` : 4 — raccordement des providers natif et web, enregistrement/résultat propriétaire et requête crew liée au compte initiateur.
- `apps/mobile/src/features/run/resultVariant.test.ts` : 42 — variantes de résultat et distinction des verdicts du nouveau modèle.
- `supabase/functions/ingest_run/capture2026_test.ts` : 16 — boucle, huit, intersections, trace ouverte, GPS/pause, séparation Run/Bike, ancre serveur, XP indépendant, masques média/personnels et petites boucles.
- `apps/mobile/src/features/sources/adapters/gpx-parse.test.ts` : 9 — formats/rejets GPX, rupture de segments, reprise invalide et coordonnées vides. Le déplacement entre segments de moins de 30 secondes ne gonfle plus la distance.
- `apps/mobile/src/features/refonte/crewOutingsModel2026.test.ts` : 5 — date locale, capacité, point public, discipline et contrat des rendez-vous.

**10 vérifications PostgreSQL/PGlite, 0 échec** avec `node supabase/tests/territory_read_2026.pglite.test.mjs`. La migration 0112 complète est chargée sans modification. Les tests exécutent réellement le rôle calculé, le départ du crew, les privilèges et les refus avant travail spatial (authentification, propriétaire, viewport null/invalide/non fini). Ils ne simulent pas PostGIS.

`npm run typecheck --workspace @klaim/mobile` : réussi. `deno check supabase/functions/ingest_run/index.ts` : réussi. `node scripts/sync-game-rules.mjs` : exécuté ; les copies du moteur sont générées depuis leur source.

## Limites vérifiées, pas dissimulées

- **PostGIS non exécuté** : aucun PostgreSQL/PostGIS local disponible et aucune base distante utilisée. `node supabase/tests/refonte2026.postgis.test.mjs` retourne explicitement « NON EXÉCUTÉ » sans `GRYD_TEST_DATABASE_URL` vers une base locale vide. Le harnais utilise une transaction annulée ; il inclut 0112, la reprise partielle, les surfaces avant/restantes, la recapture par soi-même, les rôles, blocages, séparation des disciplines et masques personnels. Ces assertions spatiales restent à exécuter avant déploiement.
- Le calcul de lecture actuel n’ajoute ni pagination ni simplification à grande échelle. Cette passe ne démontre pas la capacité à afficher 200 000 joueurs/possessions. Le rejeu territorial pilote garde sa limite antérieure de calcul global par discipline.
- La base existante impose un seul crew actif par compte. La lecture respecte cette source réelle ; elle ne réalise pas une migration vers deux adhésions indépendantes Run/Bike.
- La géométrie est testée par les fonctions pures, et le contrat/les refus SQL par PGlite. Ces tests ne remplacent pas la recette cartographique native authentifiée, la publication réelle après délai et les permissions GPS sur appareil.
- Les imports GPX demeurent déclaratifs, privés et sans preuve automatique d’XP/capture. Le module `gpx.web.ts` demeure explicitement `app_only`, conformément au périmètre de l’aperçu web.

## Revue voisine bornée

La revue Sources/Rendez-vous a corrigé deux défauts indépendants : conservation des ruptures GPX et garde propriétaire **avant** les RPC RSVP/édition. `CrewOutings2026Screen` fige désormais le jeton Authorization du compte initiateur, puis vérifie encore l’époque de session à la réponse. Les contrôles CAS, capacité, événement commencé/annulé et permissions de 0113 restent la responsabilité du serveur ; aucune modification de 0113 n’a été faite par ce lot.

Dernière régression prévol : `apps/mobile/src/features/run/gps/runActivity.test.ts`, **19 tests réussis**. Le garde-fou vérifie toujours que l’unique appel de départ transmet `requestedActivity`, la discipline affichée. Il vérifie aussi que le second argument vient du consentement durable relu à cet instant, et qu’un propriétaire/consentement devenu indisponible interrompt le décompte avant l’appel. Le remplacement de l’ancien nom local `shared` ne diminue donc pas la couverture.
