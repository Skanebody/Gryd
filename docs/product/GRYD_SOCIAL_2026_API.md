# Social GRYD — implémentation septembre 2026

Migration `0124_refonte_2026_social.sql`. Ce document décrit le code livré, pas un déploiement ni une validation de production.

## Identité

`my_social_profile_2026()` lit exclusivement le compte authentifié. `save_my_social_profile_2026({p_profile})` sauvegarde pseudo unique, nom affiché, bio, visibilité et référence d’avatar appartenant au compte. Les visibilités sont `private`, `friends`, `crew` et `public` (membres GRYD authentifiés). La visibilité du profil ne publie aucune sortie ni position.

Le store client sépare les comptes et l’invité ; la clé locale historique `gryd.social.profile.v1` n’est ni supprimée, ni lue comme identité d’un compte, ni envoyée silencieusement. Un choix photo et une opération asynchrone sont invalidés si le compte change, y compris A → B → A. Les URL de média expirent après 120 secondes et sont renouvelées ; un échec les retire de l’affichage.

`social_people_2026`, `social_member_2026`, `social_member_by_handle_2026` et `social_crew_members_2026` limitent les résultats aux profils accessibles et appliquent les blocages. La politique RLS de lecture directe des profils utilise la même règle. `/amis` relie la recherche aux demandes et aux relations existantes. `/member` offre demande d’amitié, suivi, retrait du suivi et blocage. Les nouveaux blocages retirent les liens/demandes existants entre les deux personnes et ferment les anciens endpoints de sollicitation via leur garde commune. Le helper privé utilisé par la carte et les défis reprend les nouveaux blocages stables ; les lectures sociales conservent aussi les blocages hérités par pseudo ou identité mémorisée. Le déblocage depuis Amis ne rétablit pas silencieusement les liens retirés.

## Publication volontaire

`SocialPublicationAction2026({runId, activity, surface?: 'light'|'dark'})` ouvre `/crew-publish`. L’ouverture ne publie et n’envoie rien. Le contexte serveur retourne une sortie réelle `2026.1`, valide ou partielle, détenue par le compte, le crew destinataire et l’existence éventuelle d’une publication antérieure.

`social_publish_2026({p_client_id, p_run_id, p_body, p_media_path, p_consent:true, p_expected_crew_id})` vérifie ce même destinataire sous verrou d’adhésion. Une adhésion modifiée après l’aperçu retourne `crew_changed` et exige un nouveau consentement. Le serveur autorise une publication par sortie et crew ; les rejeux n’en créent pas deux et ne ressuscitent pas un contenu retiré.

Le fil partage seulement le résumé sportif confirmé, le texte et éventuellement une photo choisie. Il ne reçoit ni ne rend la trace GPS. Il ne reprend pas les anciens événements de conquête H3. Les photos sont privées dans `social-2026` : insertion sous le préfixe de son compte, lecture selon profil/publication accessible. Les métadonnées JPEG/PNG sont retirées avant upload ; un format non pris en charge ou illisible est refusé, sans envoi de l’original. Taille maximale : 5 Mo.

`social_feed_2026`, `social_comments_read_2026`, `social_react_2026`, `social_comment_2026`, `social_remove_2026`, `social_report_2026` couvrent fil, encouragement unique par membre, commentaires idempotents, retrait par l’auteur et signalement. Les signalements sont enregistrés dans une table de modération réservée au service et masquent le contenu au déclarant. Aucun délai de traitement humain ni modération automatique des images n’est promis. Le retrait du post ne supprime pas la sortie sportive du journal.

## Rendez-vous du crew

`crew_outings_2026()` retourne `{ok, canCreate, items}` ; chaque élément contient `id`, `title`, `startsAt`, `activity`, `placeLabel`, `capacity`, `goingCount`, `joined`, `canManage`, `cancelled`, `revision`, `hostName`. Le lieu est un libellé de lieu public lisible par les membres actifs, sans coordonnées collectées. Les RSVP de membres partis ne comptent plus dans la capacité.

`crew_outing_rsvp_2026({p_event_id,p_joined})` inscrit ou retire uniquement le lecteur, sous verrou du rendez-vous. `crew_outing_change_2026({p_event_id,p_revision,p_title,p_starts_at,p_activity,p_place_label,p_capacity,p_cancelled})` exige créateur actif ou direction active ; une révision périmée est refusée. L’annulation est logique, idempotente et retire les inscriptions. Les anciennes lectures/créations excluent désormais les événements annulés. Aucun push collectif de publication/modification n’est ajouté par cette migration.

## Vérifications et limites

- 11 scénarios PostgreSQL/PGlite exécutent les véritables RPC 0124, y compris `SET ROLE authenticated`, audience, RLS des profils/posts/commentaires/médias, blocages hérités et nouveaux, idempotence, retrait, capacité, autorisations et révision. Le filtre de blocage carte/défis est exécuté sans géométrie ; aucune validation PostGIS n’est revendiquée. Les schémas préexistants utilisés dans ce harnais sont des fixtures.
- Un second harnais applique 91 migrations existantes jusqu’à 0099 puis 0124. Le schéma Storage et la colonne scalaire `runs.ruleset_version` sont simulés ; ce test n’exécute pas le moteur PostGIS de 0118.
- Tests clients : séparation d’un snapshot par propriétaire et suppression JPEG/PNG des métadonnées, y compris métadonnées entre scans JPEG et données après l’image. La suite sociale existante et les décisions de sorties ont aussi été exécutées.
- Non validés ici : déploiement, API HTTP Storage, upload/photothèque sur appareils iOS/Android, livraison de notification, concurrence de plusieurs connexions PostgreSQL, traitement humain des signalements et nouvelle campagne juridique. Les photos privées déjà délivrées par URL signée peuvent rester accessibles pendant leur courte durée de validité.
