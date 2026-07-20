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

**RÉSOLU par l'audit du 20/07 — il n'y a PAS d'arbitrage à prendre.**
12 des 18 systèmes existent dans le repo, mais **0 sur 18 n'est atteignable en
natif** : `crew.tsx:1141` renvoie `RealCrewScreen` dès que `!isShowcasePlatform`
(≈3 000 lignes de HQ démo jamais exécutées sur iPhone), et
`flags.warRoom/arsenal/season` (= `EXPO_PUBLIC_FULL_SURFACE`, à `0`) gardent les
points d'ENTRÉE en amont, pas seulement les écrans. Les 6 restants (marché, chat
mondial, messages privés, vocal, alliances, clans secondaires) n'existent pas du
tout — `0013_crew_clans.sql` ne crée aucune table, « clan » y est du vocabulaire.

Corollaire inconfortable : **la doctrine n'a presque rien à supprimer, elle a
presque tout à construire.**

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

1. ~~Les systèmes déjà construits : masquer ou garder ?~~ **SANS OBJET** — voir §2 :
   déjà tous inaccessibles en natif. Restait 4 fuites de données fabriquées,
   corrigées le 20/07 (LOT 0, commit `51a6dce`) : `/crew-discovery` et
   `/crew-public` (crews INVENTÉS, atteints depuis l'onboarding « Rejoindre » et
   depuis la Carte), « 3 crews actifs près de toi » (chiffre inventé), et le faux
   QR d'`amis.tsx` (icône décorative 120 px présentée comme scannable).
1-bis. **Bouclier (90 Éclats) et scout_ping (120 Éclats)** — un achat en argent
   réel BLOQUE une capture (`claims.ts` → `blocked_shield`) et RÉVÈLE une
   information tactique. Contredit frontalement le §4 de cette doctrine ET
   `GRYD_REGLES_NON_NEGOCIABLES.md`. Masqué aujourd'hui par `flags.arsenal` —
   la contradiction devient publique au premier flip. On les retire du catalogue
   payant, ou on assume ?
2. **Prix et périmètre des 4 packs** : les montants du document sont des
   hypothèses de test, pas une décision — ils dépendent aussi du contrat Apple
   « paid apps » (non signé à ce jour, bloquant O-item).
3. **Chat crew** : le code existe. La doctrine le déconseille. On le coupe pour
   la Saison 0 ?
4. Rappel bloquants indépendants : clearance **INPI** avant usage commercial du
   nom, statut **DSA merchant** Apple (bloque la sortie publique UE), carte
   bancaire du compte développeur expirée.

### Autres découvertes de l'audit (factuelles, pas des arbitrages)

- **`crew_leaderboard` est une vue matérialisée MORTE** : créée, indexée et
  autorisée en lecture (`0002_schema.sql:297`), mais **rafraîchie par aucun job**
  malgré son commentaire. Figée depuis sa création, donc vide. Toute surface qui
  la lirait afficherait « 0 zone » à vie. (`sector_control`, elle, EST rafraîchie
  par `decay_job` + `recompute_sectors` + crons 0038/0039.)
- **Le serveur calcule déjà la contribution** : `ingest_run` résout le crew du
  coureur, écrit `hex_claims.winner_crew_id` et l'XP quotidienne par membre.
  Aucune ligne d'app native ne les lit. Le maillon 4 de la boucle est un trou de
  **lecture**, pas de moteur — d'où un LOT 1 court.
- **Le deep link entrant n'est pas reçu** : zéro `Linking.getInitialURL`, zéro
  listener `'url'`, aucune route `/c/[code]`, aucun `associatedDomains`. On
  génère un lien d'invite parfait qui, cliqué, ne fait rien. La viralité est
  coupée au dernier mètre (dépend de la décision « domaine »).
- **Aucun event de funnel n'est émis** : `inviteSent`/`inviteAccepted` sont
  définis dans `events.ts` et jamais `track()`és. Le badge « Recruiter » est
  donc inatteignable alors qu'il est affiché comme atteignable.
- **Aucun filtre d'insultes/usurpation sur le nom de crew** côté serveur (le
  seul filtre existant est local, démo, et réservé au chat). Risque App Store
  (UGC non modéré) — §1 de la doctrine l'exige.

## §7 — Ordre d'implémentation retenu par le document

P0 crew fonctionnel → P1 viralisation (QR attribué, stories, deferred deep
links, referral) → P2 monétisation (StoreKit, entitlements, packs) → P3
optimisation (prix, bundles, mesure).
