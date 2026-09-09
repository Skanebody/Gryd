# Objets et collections permanentes — septembre 2026

Les objets saisonniers détenus ont un modèle de création précis. La sélection transporte `collectionId`, `rewardId` et `variant`, jamais une attribution. Le Studio relit les droits du compte puis les vérifie avant la préparation et juste avant la remise du PNG/MP4. Une révocation pendant la préparation détruit le fichier sans le transmettre. Un changement de compte révoque immédiatement la sélection. Sans sortie réelle, le Studio ouvre le journal ; aucun tracé ou chiffre de démonstration ne remplace l’activité.

| Objet saisonnier | Usage disponible |
|---|---|
| Première affiche | Affiche de la sortie choisie, édition de saison |
| Participation | Badge graphique exportable, uniquement si le palier est réellement détenu |
| Motif de trace | Composition à lignes avec la trace protégée |
| Cadre | Équipement profil existant et modèle cadre dans le Studio |
| Sticker | PNG transparent de la sortie |
| Titre | Équipement profil existant et composition typographique |
| Photo | Photo choisie via le sélecteur système, ou alternative typographique sans photo |
| Emblème | Équipement profil existant et composition d’identité |
| Animation courte | MP4 de huit secondes portant l’édition, avec le même moteur natif que Replay |
| Récap | Récap personnel de la sortie choisie ; ne prétend pas agréger plusieurs activités |
| Affiche finale | Composition éditoriale de l’activité, avec l’édition réellement détenue |
| Souvenir complet | Page personnelle de saison utilisant une sortie ; ne prétend pas être un album multi-activités |

Le composant `StudioObjectArtwork2026` sert à la fois à l’aperçu et à la capture PNG. Le composant d’aperçu vidéo et le MP4 utilisent exactement `buildRunFilmScene2026`, y compris le nom de l’édition. La géographie passe par le filtrage des extrémités, zones privées et ruptures de trace. Une protection non résolue produit un visuel sans trace. Les variantes déjà acquises ne consultent pas l’état de l’abonnement pour leur rendu standard permanent.

Les aperçus de catalogue montrent le vrai modèle sans données sportives. Les planches PNG/HTML isolées de `docs/design/review-2026/intvl-integration/objects-24` et `objects-story` utilisent des données synthétiques explicitement marquées QA ; elles ne sont jamais introduites dans l’application.

## Trois achats uniques indépendants

- **Contour** : deux compositions originales (`contour_line`, `contour_margin`).
- **Relief** : quatre compositions (`relief_strata`, `relief_column`, `relief_window`, `relief_survey`) et un cadre de profil.
- **Clubhouse** : six compositions (`clubhouse_type`, `clubhouse_grid`, `clubhouse_ticket`, `clubhouse_photo`, `clubhouse_report`, `clubhouse_diary`) et un emblème personnel.

Le catalogue présente le contenu et la permanence, sans stock fictif ni montant provenant du cahier. Le prix affiché est `StoreProduct.priceString`. Le SDK lit les produits avec la catégorie `NON_SUBSCRIPTION`, achète le `StoreProduct` choisi et restaure via RevenueCat. Un retour SDK ne suffit pas à afficher « possédé » : l’Edge function relit le subscriber auprès de RevenueCat et applique le droit côté serveur. Les transferts et remboursements passent aussi par le webhook existant.

Migration **0114** : catalogue sans identifiant Store présumé, droits permanents, reçus idempotents et équipements. Les quatre tables ont RLS activée et n’acceptent aucune écriture cliente. Les snapshots sont ordonnés par date d’observation ; un conflit au même instant préfère la révocation. Attribution et reçu commercial sont transactionnels ; une erreur ne laisse pas un reçu de succès. Une révocation enlève également l’équipement correspondant. La résiliation GRYD+ n’est pas une révocation d’achat permanent.

## Configuration avant vente

1. Appliquer **0114** avant de redéployer `rc_webhook` et `sync_gryd_plus_access_2026` : ces fonctions lisent désormais aussi le catalogue commercial.
2. Créer les produits **non consommables** dans App Store Connect et Google Play, puis les relier à trois entitlements RevenueCat distincts, également distincts de `gryd_pro`. La configuration Store définit seule les montants et devises.
3. Pour chaque ligne de `commercial_collections_2026`, renseigner via un accès administrateur `entitlement_id` et `product_ids` (identifiants réellement configurés sur iOS/Android), puis `enabled=true`. Un identifiant produit ne peut appartenir à deux collections.
4. Conserver les secrets serveur et clés publiques RevenueCat documentés dans `GRYD_PLUS_2026_IMPLEMENTATION.md`. `RC_ALLOW_SANDBOX=true` est réservé au backend de test.
5. Recetter sur les deux appareils : achat, annulation, pending, restauration, changement de compte, remboursement et maintien après résiliation GRYD+. Vérifier l’export des objets déjà détenus sans abonnement.

Aucun produit Store, prix, entitlement distant ou paiement n’a été créé pendant l’implémentation. Tant que les produits ne sont pas lus, l’interface dit « vente indisponible » ; elle ne présente pas de bouton d’achat sans prix confirmé. Les objets détenus restent lisibles même si leur vente est désactivée.

## Preuves et limites

- Typecheck mobile et `deno check` des deux fonctions RevenueCat réussis.
- 315 tests Deno ciblés partage/premium/refonte réussis ; six tests de parsing des collections RevenueCat réussis.
- Dix tests SQL PGlite sur la migration réelle : absence de configuration, droits client, ownership par compte, replay/stale, équipement, permanence, rollback, remboursement, transfert, suppression de compte.
- 24 compositions inspectées en carré puis Story depuis le composant réel rendu avec React Native Web ; zéro débordement horizontal, zéro conteneur tronqué au contrôle Story. Réserve Story de 250 pixels natifs en haut et en bas.
- Les tests locaux ne certifient ni une facture Store réelle, ni le webhook distant, ni une application iOS/Android reconstruite. L’animation demande le module natif Film déjà documenté ; le Web propose explicitement le résumé texte, pas un faux export PNG/MP4.

Références SDK vérifiées : [achats hors abonnement](https://www.revenuecat.com/docs/platform-resources/non-subscriptions), [achat d’un produit Store](https://www.revenuecat.com/docs/getting-started/making-purchases).
