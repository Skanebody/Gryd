# GRYD — BACKLOG (hors périmètre MVP, §7 OUT)

> Tout ce qui est demandé hors périmètre atterrit ici avec sa date. Rien de cette
> liste ne s'implémente ni ne se « prépare au cas où » avant la fin de la Saison 0.

## Coupé par le MASTER (§7 OUT)
Bike (masqué intégralement — `flags.bike` repasse à false en Phase 1) · boucle collective crew ·
rôles de crew avancés · chat · feed social/DM · missions multiples · attaques nommées ·
route planner · XP/niveaux/skills · boutique/paiements/Éclats/passes/packs · replay animé ·
widgets/Live Activities/Watch · HealthKit/Health Connect/Garmin/Strava · classement mondial ·
espagnol (+ de/pt existants : gelés, FR/EN seuls maintenus) · zones interdites au-delà de l'eau.

## Parqué post-MVP (construit, inerte, conservé — ADR-005)
- A-48 Soutien de crew (moteur pur + tests ; aucune surface d'achat).
- Les trois offres (free/plus/pro, `GRYD_CAPABILITIES`) + GRYD+ analytics (E66) + histoire de propriété (0109-0111 restent en base : le registre CONTINUE d'enregistrer, il ne s'affiche juste pas au MVP).
- Classement départemental (0103), badges 204, arsenal, saisons multiples, LE RELAIS (A-41), parcours personnalisés (A-46).

## Dettes DÉCLARÉES de la Phase 1 (dans le périmètre, pas encore faites)
- **Jauge de fermeture du Live Run** (« il te manque 84 m »). `loopClosureVerdict` vit dans `packages/engine/src/hexing.ts`, qui importe h3-js : le faire tomber dans le bundle Expo demande soit une cible `MOBILE_ENGINE_TARGETS` supplémentaire, soit l'extraction des fonctions de fermeture dans un module sans h3. C'est l'arbitrage que SALVAGE annonçait pour `features/run/gps/**` — à trancher avant de clore M5. En attendant, `app/(mvp)/course.tsx` le DIT dans son en-tête et n'affiche rien à la place.
- **Never-lose-a-run sur la nouvelle UI.** La trace de `(mvp)/course.tsx` vit en mémoire : un crash la perd. Rien à l'écran ne promet le contraire, mais la course ne sera pas ENVOYÉE tant que ce point n'est pas fait — donc `/course` se termine aujourd'hui par un retour à la carte, sans capture.
- **Bascule d'entrée du groupe `(mvp)`.** `/bienvenue`, `/position`, `/carte`, `/prete`, `/course` ne sont atteints que par URL directe. Les lignes `KNOWN_ORPHANS` de `scripts/audit-routes.mjs` DOIVENT disparaître au basculement.

## Dettes héritées à ne pas perdre
- `territories.owner_id` polymorphe : purge OK depuis 0111 ; l'arbitrage produit « supprimer vs relâcher » est tranché (suppression) et testé.
- O-items : O2 (Apple Developer), O3 (RevenueCat — post-MVP), O5 (INPI GRYD), O10 (domaine gryd.app vs gryd.run — requis Phase 3 pour les universal links).
