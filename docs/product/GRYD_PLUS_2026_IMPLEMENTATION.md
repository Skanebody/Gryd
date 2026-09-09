# GRYD+ — implémentation septembre 2026

La page `/premium` propose les abonnements mensuel et annuel renvoyés par RevenueCat. Les prix localisés du Store sont affichés tels quels. Le total annuel reste le montant principal et la remise n’est calculée qu’entre montants de même devise connue. Aucun nouvel abonnement à vie n’est vendu ; les droits historiques valides restent reconnus.

Les trois bénéfices sont répartis entre `/premium-analytics` (deux sorties ou deux fenêtres privées de 7/28 jours, mesures et unités identiques), le Studio (quatre compositions et contrôles guidés), et les variantes de saison persistées par la migration 0121. Les comparaisons portent sur les activités disponibles dans le journal récent, et le signalent ; elles ne constituent pas une analyse illimitée d’un historique serveur paginé. Les statistiques simples restent gratuites. Aucun de ces droits ne modifie capture, XP ou défis.

`useGrydPlusAccess()` expose `status`, `active`, `expiresAtMs`, `source` et `reload()`. Les interfaces autorisent les outils uniquement avec `active === true`. Le SDK est isolé par compte, les opérations Store sont sérialisées, les mises à jour du SDK et le retour au premier plan relisent les droits. L’expiration est réévaluée. Un achat accepté sans entitlement actif est affiché comme en attente, jamais comme un accès gagné.

La migration **0120** crée `premium_entitlements_2026` et `premium_receipts_2026`, sans déduire un droit de l’ancien booléen `users.is_club`. Le webhook et l’Edge Function authentifiée `sync_gryd_plus_access_2026` relisent le snapshot du compte auprès de RevenueCat. Cette approche suit la [recommandation officielle de synchronisation RevenueCat](https://www.revenuecat.com/docs/integrations/webhooks#syncing-subscription-status) et couvre aussi transferts, remboursements et changements de produit. Les deux comptes d’un transfert sont actualisés. Les identifiants anonymes RevenueCat ne sont pas convertis en comptes GRYD.

L’écriture du droit et de son reçu est transactionnelle. Un échec n’inscrit pas un faux succès ; les réessais sont idempotents. L’horodatage du snapshot ordonne les écritures et l’horodatage d’événement est conservé de façon monotone. Un ancien webhook peut ainsi déclencher une lecture fraîche, sans réinjecter son ancien droit. Une révocation gagne un conflit de snapshots au même instant. L’échéance est contrôlée au moment de la lecture SQL, sans dépendre d’un cron. Une notification tardive ne recrée pas un compte supprimé. Les tables sont interdites aux clients ; le RPC de lecture ne retourne que le compte authentifié.

Après cette transaction, `grant_earned_season_variants2026(user_id)` est appelé, y compris après rejeu : une erreur temporaire d’attribution reste réessayable. La migration 0121 possède les objets permanents. Les objets déjà attribués ne sont pas supprimés à l’expiration de GRYD+.

## Configuration externe nécessaire

- Expo natif : `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` et, si renommé, `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID` (défaut `gryd_pro`). Un identifiant Supabase connecté est requis avant l’achat.
- RevenueCat : offering courant avec packages `MONTHLY` et `ANNUAL`, produits Store publiés et reliés au même entitlement. Les prix et les éventuels essais viennent du Store. L’éligibilité à un essai n’est pas présumée.
- Secrets Supabase uniquement : `RC_SECRET_API_KEY` (clé RevenueCat serveur autorisant la lecture des abonnés), `RC_PRO_ENTITLEMENT_ID` (même valeur que le client), `RC_WEBHOOK_SECRET` (valeur exacte de l’en-tête Authorization configuré sur le webhook).
- `RC_ALLOW_SANDBOX=true` uniquement sur un backend de test pour accepter les droits sandbox. Les abonnements sandbox sont refusés par défaut en production.
- Appliquer 0120 puis 0121 et déployer `rc_webhook` ainsi que `sync_gryd_plus_access_2026`. Le webhook valide son propre secret ; `supabase/config.toml` désactive donc sa vérification JWT de passerelle. L’endpoint de synchronisation client exige un JWT et vérifie l’utilisateur lui-même.

Aucune clé, offre Store, migration distante ou configuration RevenueCat n’a été créée ou activée pendant cette tâche. Aucun paiement réel n’a été lancé. Les achats sont réellement câblés et deviennent disponibles quand ces services sont configurés ; une absence de configuration n’est pas maquillée en accès premium.

## Vérification effectuée

- Typecheck mobile et Edge Functions réussi.
- 109 tests ciblés premium/webhook réussis, dont expiration, prix absent, devise inconnue, lifetime historique, sandbox, transfert, remboursement, ordre des snapshots et calculs de comparaison.
- Migration 0120 exécutée en entier sur PGlite : **9 tests SQL réussis**, dont échec injecté après écriture du droit, rollback du reçu, retry, droits par compte, interdiction client, suppression de compte et horodatages.
- Achats/restauration natifs, facture App Store/Google Play, transfert réel entre appareils et webhooks RevenueCat réels restent à exécuter avec les produits sandbox configurés. Ces tests SQL ne certifient pas un achat de bout en bout.

Le lot archive/file ajoute 39 tests ciblés, soit 148 tests Deno premium + adoption + file + webhook au dernier passage ciblé. L’adoption des sorties anonymes nécessite un geste explicite dans le Profil ; elle ne publie pas un ancien parcours et ne crée pas d’ancre de confiance rétroactive.
