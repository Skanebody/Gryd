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
- **La chaîne n'est pas prouvée contre un VRAI serveur.** `sendRun` et l'écran de résultat sont testés purement et vérifiés à l'écran par injection d'issues ; la base est vide et le build local n'a pas de `.env`. La preuve manquante est celle de l'Annexe D : une course réelle sur le terrain, envoyée, capturée, relue sur la carte.
- ~~Jauge de fermeture du Live Run~~ — **FAIT le 03/08/2026.** L'arbitrage a été tranché par l'extraction : `packages/engine/src/closure.ts` sort de `hexing.ts` la géométrie de fermeture (sans h3), synchronisée vers `apps/mobile/src/mvp/run/engine/` et drift-testée. Même fonction à l'écran et au serveur — voir `mvp/run/gauge.ts` pour la seule chose que le verdict ne dit pas : QUAND se taire.
- ~~Never-lose-a-run sur la nouvelle UI~~ — **FAIT le 03/08/2026.** Arbitrage SALVAGE tranché : on RÉUTILISE la plomberie (`lib/runStore.ts`, buffer à 3 clés, `RawFix` canoniques) et on RÉÉCRIT la surface. Voir `mvp/run/persist.ts`. Reste ouvert : l'ENVOI de la course (capture/résultat, M6-M7) — `/course` se termine par un retour à la carte, sans claim.
- **La reprise legacy au lancement détourne les routes `(mvp)`.** `app/_layout.tsx` pousse `/course-live` dès qu'une course interrompue existe, quelle que soit l'URL demandée — vérifié en preview le 03/08/2026 sur `/carte`. À retirer AU BASCULEMENT, en même temps que les `KNOWN_ORPHANS` : c'est `(mvp)/carte.tsx` qui portera l'offre de reprise.
- **Bascule d'entrée du groupe `(mvp)`.** `/bienvenue`, `/position`, `/carte`, `/prete`, `/course` ne sont atteints que par URL directe. Les lignes `KNOWN_ORPHANS` de `scripts/audit-routes.mjs` DOIVENT disparaître au basculement.

## Dettes héritées à ne pas perdre
- `territories.owner_id` polymorphe : purge OK depuis 0111 ; l'arbitrage produit « supprimer vs relâcher » est tranché (suppression) et testé.
- O-items : O2 (Apple Developer), O3 (RevenueCat — post-MVP), O5 (INPI GRYD), O10 (domaine gryd.app vs gryd.run — requis Phase 3 pour les universal links).
