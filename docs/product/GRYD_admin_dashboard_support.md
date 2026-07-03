# GRYD — Admin Dashboard, support, litiges et exploitation

## Objectif

Définir l’outil admin interne de GRYD.

Sans dashboard admin, GRYD devient ingérable :
- courses suspectes ;
- claims gelés ;
- litiges ;
- crews abusifs ;
- messages signalés ;
- zones dangereuses ;
- remboursements ;
- saisons ;
- notifications ;
- utilisateurs bloqués.

---

# 1. Principes admin

L’admin doit permettre :
- comprendre rapidement ;
- corriger sans casser ;
- auditer une décision ;
- agir par niveau ;
- éviter les sanctions injustes ;
- garder des logs.

Règle :

```txt
Aucune action critique sans trace.
```

---

# 2. Rôles admin

## Support

Peut :
- voir les courses ;
- lire les tickets ;
- répondre ;
- demander une revue.

Ne peut pas :
- bannir définitivement ;
- modifier les scores manuellement ;
- changer les règles de saison.

## Moderator

Peut :
- gérer chat ;
- supprimer noms de crew ;
- masquer contenus ;
- sanctionner temporairement.

## Game Master

Peut :
- valider/refuser claims ;
- corriger secteurs ;
- gérer saisons ;
- lancer événements.

## Admin Owner

Peut :
- modifier règles ;
- gérer paiements ;
- exporter données ;
- configurer zones.

---

# 3. Pages admin P0

## Dashboard général

Afficher :
- courses du jour ;
- courses flaggées ;
- claims gelés ;
- utilisateurs actifs ;
- nouveaux crews ;
- signalements ;
- crashs ;
- paiements ;
- notifications envoyées.

## Courses suspectes

Colonnes :
- user ;
- run id ;
- date ;
- distance ;
- durée ;
- trust score ;
- reason flags ;
- segments exclus ;
- source ;
- statut ;
- action.

Actions :
- valider ;
- valider partiellement ;
- rejeter ;
- demander infos ;
- marquer comme abus ;
- ouvrir ticket.

## Détail course

Afficher :
- carte ;
- trace ;
- segments ;
- vitesse ;
- cadence/pas si disponible ;
- GPS accuracy ;
- motion trust ;
- claims demandés ;
- claims accordés ;
- zones touchées ;
- historique utilisateur.

## Utilisateurs à risque

Afficher :
- risk score ;
- nombre de runs flaggés ;
- traces répétées ;
- multi-compte suspect ;
- device integrity ;
- sanctions ;
- tickets.

## Claims gelés

Afficher :
- hexes concernés ;
- score potentiel ;
- raison ;
- impact classement ;
- temps en attente ;
- action admin.

---

# 4. Pages admin P1

## Crews

Afficher :
- nom ;
- membres ;
- activité ;
- signalements ;
- offensives ;
- chat flags ;
- noms interdits ;
- historique de changements.

Actions :
- renommer ;
- avertir ;
- suspendre chat ;
- bloquer invitations ;
- dissoudre si abus grave.

## Modération chat

Afficher :
- messages signalés ;
- mots interdits ;
- contexte ;
- historique du joueur ;
- actions rapides.

Actions :
- supprimer ;
- avertir ;
- mute ;
- ban chat ;
- escalade.

## Zones dangereuses

Afficher :
- signalements de terrain ;
- routes rapides ;
- propriétés privées ;
- zones interdites ;
- incidents.

Actions :
- marquer non capturable ;
- réduire scoring ;
- masquer objectif ;
- alerter utilisateurs.

## Saisons

Afficher :
- dates ;
- règles ;
- classements ;
- patch notes ;
- récompenses ;
- reset status.

Actions :
- geler ;
- publier résultats ;
- générer posters ;
- distribuer badges.

---

# 5. Support utilisateur

## Tickets types

1. Ma course n’a pas compté.
2. Ma course est partiellement validée.
3. Je pense qu’un joueur triche.
4. Je veux supprimer mes données.
5. J’ai un problème d’achat.
6. Un crew m’insulte.
7. Une zone est dangereuse.
8. Mon classement est faux.

## Page “Pourquoi ma course n’a pas capturé ?”

Afficher :
- statut ;
- segments validés ;
- segments exclus ;
- raison ;
- impact points ;
- bouton demander revue.

Messages :
- non accusatoires ;
- pédagogiques ;
- précis.

---

# 6. Workflow de revue

## Étape 1 — Signal automatique

Course flaggée par système.

## Étape 2 — Claims gelés

La course ne modifie pas le classement.

## Étape 3 — Revue support / game master

Analyse :
- trace ;
- vitesse ;
- cadence ;
- GPS ;
- historique ;
- source.

## Étape 4 — Décision

Options :
- validée ;
- validée partiellement ;
- rejetée ;
- sanction ;
- besoin d’infos.

## Étape 5 — Notification utilisateur

Message clair.

---

# 7. Sanctions progressives

1. Correction silencieuse.
2. Avertissement doux.
3. Claims gelés.
4. Restriction 24 h.
5. Restriction 7 jours.
6. Wipe saison.
7. Ban capture.
8. Ban compte.

Jamais de ban définitif sans historique ou fraude évidente.

---

# 8. Paiements / refunds

Admin doit voir :
- abonnement ;
- achats ;
- monnaie premium ;
- transactions RevenueCat ;
- entitlements ;
- erreurs ;
- remboursements ;
- statut Apple/Google.

Actions :
- resynchroniser achat ;
- vérifier entitlement ;
- contacter utilisateur ;
- jamais attribuer des hexes manuellement contre paiement.

---

# 9. Logs obligatoires

Logger :
- action admin ;
- avant/après ;
- auteur ;
- date ;
- raison ;
- ticket lié.

Tables utiles :
- `admin_actions`
- `support_tickets`
- `review_decisions`
- `moderation_events`
- `zone_reports`
- `payment_events`

---

# 10. MVP admin

À créer dès le MVP :
1. Dashboard général.
2. Liste courses flaggées.
3. Détail course.
4. Claims gelés.
5. Liste utilisateurs à risque.
6. Tickets support simples.
7. Signalement joueur/crew.
8. Journal actions admin.
9. Gestion saisons minimale.
10. Gestion zones dangereuses basique.

---

# 11. Prompt Claude Code

```md
Tu es Lead Backend + Product Ops.
Crée un admin dashboard web pour GRYD avec Supabase.

Pages obligatoires :
- dashboard général
- courses suspectes
- détail course
- claims gelés
- utilisateurs à risque
- tickets support
- crews signalés
- zones dangereuses
- saisons
- paiements

Contraintes :
- toutes les actions admin sont loggées
- aucune action irréversible sans confirmation
- support et modération ont des rôles séparés
- UI sobre, table-first, rapide
- priorité : régler les litiges de courses et triche
```
