# AMENDEMENT-16 — Run libre, anti-abus des boucles, clans, contribution & personnalisation (05/07/2026)

**Source : `docs/product/GRYD_gameplay_crews_monetisation_contribution_personnalisation.md`.** Formule : *« Le territoire se gagne avec les jambes. Le style, le statut, l'organisation et la contribution peuvent être premium. La victoire ne s'achète jamais. »* + correctifs visuels fondateur : **vraie carte aussi pendant la course** et **zéro halo — juste le tracé**.

## 0. Correctifs visuels immédiats (priorité)
- **Course Live (mode Carte) et Route Planner passent sur les VRAIES tuiles** (RealMap, comme la Battle Map) — fin des basemaps stylisées résiduelles. La simulation suit les polylignes routées existantes, projetées en géo réel.
- **Zéro halo/glow autour des traits** : partout (Battle Map, live, planner, before/after), une frontière = trait net 2-2,5 px + remplissage intérieur faible. On supprime les couches de lueur/blur autour des lignes. (Le petit halo du marqueur ego type Uber reste.)

## 1. RUN par défaut, intentions optionnelles (§1-§3 — précise AMENDEMENT-14)
- **Tap GO = Run libre** (inchangé) : « Cours librement. GRYD calcule ce que tu as pris, défendu ou ouvert. » L'analyse post-run attribue automatiquement conquis/défendu/repris/routes.
- **Long-press = intentions** : le sheet propose désormais **Conquérir** (« Trace une boucle pour créer une zone » → boucle % de fermeture + « il reste ~280 m » en live) et **Défendre** (liste des zones à défendre avec urgence/boucle conseillée → « Frontière couverte : 64 % » en live), en plus des modes Social Run/Course privée. **L'intention guide l'expérience live, le tracé réel décide du résultat** (le serveur ne lit jamais l'intention pour attribuer).
- Post-run multi-résultats (§2) : « +1 zone conquise · 2 zones défendues · 1 route ouverte · Paris Est +3 % ».

## 2. Zones par traits — durcissement moteur (§4-§6, delta AMENDEMENT-12)
- **Fermeture** : tolérance **80 m** (remplace 100) ; **auto-intersection** = 2ᵉ mode de fermeture MVP (le tracé se recroise → zone de la partie fermée, un 8 = la plus grande boucle MVP) ; fermeture assistée = messages « il reste X m » (UI, seuils 600/300 existants).
- **Anti-abus** (constantes game-rules, messages doux) : `LOOP_MAX_AREA_BY_DISTANCE` (3 km→0,25 km² ; 5→0,8 ; 10→1,8 ; interpolation linéaire, au-delà tronqué au plus près du tracé — « Boucle validée. Capture plafonnée : seuls les secteurs proches du tracé sont capturés. ») ; **compacité minimale** (4πA/P²) + **largeur minimale** (~60 m) — boucle trop fine = course valide, « Zone non capturée : forme trop étroite ». GPS douteux : règles trust existantes (« Course validée en stats. Capture partielle ou refusée. »).
- **Zones interdites** (eau, autoroutes, voies ferrées, écoles, hôpitaux…) = **V1 explicite** (nécessite une source géo serveur ; les zones privées/privacy zones existantes s'appliquent déjà).
- **Défense par traits** (§7) : le moteur cellule (re-parcours = +3 pts, decay reset) reste LA règle ; l'UI raconte en zones (« République renforcée ») et le mode Défendre affiche la frontière couverte %. Expiry par zone (+48 h/+12 h) = V1.

## 3. Crews façon clan (§8-§11)
- **Rôles réalignés** : `founder / co_captain / captain / strategist / scout / runner / rookie` (remplacent leader/defender/raider — defender/raider deviennent des TAGS de style + war_availability). Migration DB (crew_members.role) + mapping : leader→founder, defender/raider→runner (+tag). **Rookie = essai 7 j** (`ROOKIE_TRIAL_DAYS`) : pas d'objets crew, pas de ping massif, War Room limitée, contribution comptée.
- **Permissions par rôle** (matrice §8 complète dans game-rules, serveur = source de vérité) ; Founder ne quitte pas sans transfert ; Co-Captain ne touche pas Founder/autres Co-Captains.
- **Recrutement** : statuts `open / on_request (défaut) / invite_only / closed` ; **tags de crew** (Casual, Compétitif, Défense, Raid, Exploration, Performance, Run Club réel, Débutants acceptés, Pionnier) → discovery/matching.
- War Room : déjà conforme (offensive/défense/routes/sorties/contributions) — brancher les nouveaux rôles/permissions dans l'UI (qui peut lancer/assigner).

## 4. Monétisation & contribution (§12-§26) — anti pay-to-win absolu
- **Jamais vendu** : territoire, km, zones, victoire, points leaderboard, attaque/défense illimitées. **Vendable** : statut, esthétique, personnalisation, confort, organisation, analytics, partage, contribution groupée capée.
- **Crew Boost** (contribution volontaire) : 24 h 1,99 € / 72 h 4,99 € / Weekend 6,99 € / Saison 14,99 € — effets : +25 % progression **coffre** (jamais points), templates/animations/bannières. Caps : 1 boost actif, pas de cumul, aucun effet sur les dernières 48 h de saison (`BOOST_BLACKOUT_END_OF_SEASON_H`), transparence.
- **Gifting** « Offrir au crew » (boost, coffre cosmétique 2,99 €, template recrutement 0,99-1,99 €, bannière 3,99 €) : message feed sobre, **offrande anonyme possible**, JAMAIS de classement des payeurs ni de montant affiché ; **Crew Wall** opt-in (Supporters de la saison, sans montants). Badges contributeur cosmétiques (Supporter, Boost Giver…) sans autorité.
- **Inventaire & items — migration 0013** : tables `items, user_inventory, crew_inventory, purchases, item_usage_logs, crew_boosts` (§26, RLS partout, écriture service-role) + **seed catalogue MVP §18** (14 produits : Starter Pack 2,99, **Founder Pack 9,99**, Éclats 100/320/720/**1500 (11,99)/3200 (24,99)**, skins territoire/trace, frames, templates, Shield 90, Streak Gel 60, Scout Ping 120, Crew Boost 24 h/Weekend, blasons/bannières crew). Règle §17 : un produit sans {nom, icône, rareté, animation, règle, limite, écran} n'est pas vendu. SKUs RevenueCat étendus (achat réel = O3).
- **Club 4,99/mois · 34,99/an** (SKUs existants, paywall/benefits à l'Arsenal) ; **GRYD Pass 7,99 €/saison = catalogué INACTIF** (§23 : pas avant d'avoir le contenu — 30 niveaux V1).
- **Arsenal V2** (§25) : sections Featured/Packs/Objets/Skins Territoire/Skins Trace/Frames/Blasons/Bannières/Templates/Crew Boosts ; item detail (possédé/équipé, preview, limite) ; purchase reveal existant ; **équiper** depuis l'inventaire (skins trace/territoire visibles sur la carte = personnalisation §16, V1 pour le rendu réel des skins, équipement stocké dès MVP).
- Copy gelée §28 (« Trace une boucle. Ferme-la. La zone est à toi. » / « Reviens sur tes frontières avant qu'elles tombent. » / contribution : « Aucune obligation. La victoire reste sur la route. »).

## 5. Hors scope (V1/V2)
Zones interdites géo ; expiry défense par zone ; Blason/Share Template Editor ; emotes crew ; GRYD Pass actif ; Personalization Editor complet ; rendu réel des skins de carte (équipement stocké, rendu V1) ; achats réels (RevenueCat O3).
