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

## Dettes héritées à ne pas perdre
- `territories.owner_id` polymorphe : purge OK depuis 0111 ; l'arbitrage produit « supprimer vs relâcher » est tranché (suppression) et testé.
- O-items : O2 (Apple Developer), O3 (RevenueCat — post-MVP), O5 (INPI GRYD), O10 (domaine gryd.app vs gryd.run — requis Phase 3 pour les universal links).
