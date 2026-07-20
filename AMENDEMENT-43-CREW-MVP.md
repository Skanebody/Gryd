# AMENDEMENT-43 — Doctrine Crew MVP (document fondateur du 20/07/2026)

**Statut : REÇU, audit en cours.** Ce fichier fige la doctrine telle que le
fondateur l'a écrite, pour qu'elle devienne une autorité citable. Les décisions
d'arbitrage (§« à trancher ») restent OUVERTES tant que le fondateur n'a pas
répondu — aucune n'est appliquée par défaut.

## §0 — La boucle (le test de tout le reste)

```
Je rejoins un crew → je vois ce qu'il contrôle → je cours pour l'aider
→ ma contribution est visible → le crew gagne une zone
→ nous partageons la victoire → de nouveaux membres rejoignent
```

Tout ce qui ne sert pas cette boucle au MVP passe derrière un flag. Toute brique
qui la casse est un P0.

## §1 — Les trois besoins

Le crew doit permettre de **se regrouper, agir ensemble, et montrer publiquement
ce que le groupe accomplit**. Pas une guilde de jeu de stratégie.

## §2 — Les exclusions explicites (§16 du document)

À masquer derrière feature flags, PAS à supprimer : War Room · coffre collectif ·
donations · arsenal · boosts · guerre programmée complexe · rôles avancés ·
monnaie virtuelle · marché · chat mondial · messages privés · vocal · événements
payants · raid multizone · alliances de crews · clans secondaires · arbres
technologiques · achat d'avantage territorial.

**Point de tension connu** : GRYD a déjà construit plusieurs de ces systèmes
(War Room, arsenal, coffres, clans, raids, chat crew). L'audit chiffre lesquels
sont atteignables aujourd'hui. C'est LA décision fondateur du document.

Le §9 déconseille aussi le **chat libre** au MVP (modération, sécurité mineurs,
signalements, charge juridique) et propose à la place : fil d'activité
automatique + réactions prédéfinies + messages rapides figés.

## §3 — Ce qui doit rester GRATUIT (§21, contraignant)

Créer/rejoindre un crew · inviter · QR basique · lien · story basique ·
missions · demande d'aide · contribution · territoire · membres · classement ·
nom alphanumérique · emblème gratuit · notifications essentielles.

## §4 — Ce qu'il ne faut JAMAIS vendre (§22 — aligné anti pay-to-win CLAUDE.md)

Création de crew · nombre de membres · capacité d'inviter · QR fonctionnel ·
droit de rejoindre · droit de partager · messages d'aide · nombre de missions ·
portée de capture · protection · bonus de fermeture/surface · rang · visibilité
carte · notification plus rapide · position d'un rival · suppression d'une perte.

> **La monétisation donne une meilleure IDENTITÉ, jamais un meilleur POUVOIR.**

## §5 — Règles techniques d'achat (§23-24, contraignantes)

- 4 produits NON CONSOMMABLES permanents : `gryd.expression_pack`,
  `gryd.conquest_pack`, `gryd.crew_identity_pack`, `gryd.founder_pack`.
- **Prix JAMAIS en dur** : toujours `product.displayPrice` du store (règle Apple
  ET doctrine). Tout prix littéral dans l'UI est un bug.
- Entitlement lié à l'**UTILISATEUR**, pas à l'appareil ; restauration obligatoire.
- Validation SERVEUR (le client ne s'auto-accorde jamais un entitlement — même
  doctrine que « tout claim est décidé serveur »).
- Pas de paywall avant la première capture. Pas de dark pattern, pas de faux
  compte à rebours.

### Violation déjà confirmée (avant même la fin de l'audit)

L'Arsenal formate ses prix en euros CÔTÉ CLIENT (`toLocaleString('fr-FR')` +
`' €'` en dur — `apps/mobile/app/arsenal.tsx:497,723,785,894` et
`src/ui/game/ArsenalItemCard.tsx:90-96`). C'est doublement fautif : la doctrine
§23 l'interdit, et Apple exige le prix localisé venant du store (un joueur
allemand verrait un prix formaté à la française, et tout changement de prix ou
de devise mentirait). À corriger avant tout branchement d'achat réel.

## §6 — À TRANCHER par le fondateur (rien n'est appliqué sans réponse)

1. **Les systèmes déjà construits** (War Room, arsenal, coffres, clans, raids,
   chat) : on les masque derrière un flag pour la Saison 0, ou on les garde ?
   L'audit chiffre le coût des deux options.
2. **Prix et périmètre des 4 packs** : les montants du document sont des
   hypothèses de test, pas une décision — ils dépendent aussi du contrat Apple
   « paid apps » (non signé à ce jour, bloquant O-item).
3. **Chat crew** : le code existe. La doctrine le déconseille. On le coupe pour
   la Saison 0 ?
4. Rappel bloquants indépendants : clearance **INPI** avant usage commercial du
   nom, statut **DSA merchant** Apple (bloque la sortie publique UE), carte
   bancaire du compte développeur expirée.

## §7 — Ordre d'implémentation retenu par le document

P0 crew fonctionnel → P1 viralisation (QR attribué, stories, deferred deep
links, referral) → P2 monétisation (StoreKit, entitlements, packs) → P3
optimisation (prix, bundles, mesure).
