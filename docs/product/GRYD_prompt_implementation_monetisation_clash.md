# GRYD — Prompt parfait d’implémentation de la monétisation inspirée de Clash of Clans

## Objectif

Ce document est un **prompt opérationnel ultra-développé** à donner à Claude Code, Cursor, un product designer, un game economist, un développeur mobile ou un backend architect pour implémenter la monétisation de GRYD en s’inspirant des principes de Clash of Clans.

Il ne s’agit pas de copier Clash of Clans.

Il faut extraire les principes qui fonctionnent :
- pass de saison ;
- progression free/premium ;
- récompenses visibles ;
- claim dopamine ;
- cosmétiques ;
- bundles ;
- monnaie premium ;
- contribution clan/crew ;
- objets capés ;
- événement temporaire ;
- boutique structurée ;
- statut social ;
- FOMO contrôlé.

Puis les adapter à GRYD, qui est un jeu mobile de running territorial où l’action principale est une course réelle.

---

# 1. Prompt principal à donner à Claude Code / Cursor

```md
Tu es à la fois :
- Lead Product Manager mobile gaming ;
- Game Economy Designer ;
- Monetization Designer free-to-play ;
- App Store Compliance Expert ;
- UX Designer mobile premium ;
- Backend Architect ;
- Senior Full-Stack Engineer ;
- expert en StoreKit / Google Play Billing ;
- expert en game loops type Clash of Clans.

Je veux que tu conçoives et implémentes la monétisation de GRYD en t’inspirant des principes de Clash of Clans, mais sans jamais copier son univers, ses assets ou ses mécaniques pay-to-win.

## Contexte produit

GRYD est un jeu mobile de running territorial.

Les joueurs courent dans le monde réel pour :
- capturer des zones ;
- fermer des boucles ;
- ouvrir des routes ;
- défendre des territoires ;
- reprendre des zones adverses ;
- contribuer à leur crew ;
- participer à des saisons locales ;
- partager leurs conquêtes.

Le cœur gameplay :

Une ligne ouvre une route.
Une boucle crée une zone.
Une frontière défendue protège une zone.
Une boucle collective crée un territoire crew.

## Contrainte fondamentale

Dans Clash of Clans, une attaque coûte quelques taps.

Dans GRYD, une attaque coûte :
- du temps ;
- de l’énergie ;
- une vraie course ;
- un déplacement réel ;
- une exposition GPS ;
- une motivation sportive.

Donc GRYD ne doit jamais vendre ce que le joueur doit gagner par l’effort physique.

## Règles non négociables

Ne jamais vendre :
- des zones ;
- des kilomètres ;
- une capture automatique ;
- une victoire ;
- un classement direct ;
- une défense invincible ;
- une reprise automatique ;
- une position rival live ;
- un avantage territorial impossible à obtenir gratuitement ;
- une loterie payante opaque ;
- une récompense aléatoire payante sans probabilités ;
- un item qui pousse à courir trop souvent ou trop loin.

Ce que GRYD peut monétiser :
- identité joueur ;
- identité crew ;
- statut ;
- style ;
- skins de trace ;
- frames profil ;
- badges ;
- titres ;
- bannières crew ;
- blasons crew ;
- templates story ;
- replay vidéo ;
- animations de capture ;
- styles de carte ;
- confort capé ;
- analytics ;
- route suggestions ;
- contribution crew volontaire ;
- événements locaux ;
- merchandising futur GRYD Athletics.

## Objectif d’implémentation

Créer une architecture complète de monétisation pour GRYD :

1. Boutique.
2. Monnaie premium.
3. Inventaire.
4. Achats in-app.
5. Produits cosmétiques.
6. Founder Pack.
7. Templates story premium.
8. Skins de trace.
9. Frames profil.
10. Crew cosmetics.
11. Items capés.
12. Reward claim.
13. Free daily claim.
14. Préparation GRYD Pass.
15. Préparation Event Pass.
16. Système de pass en feature flag.
17. Anti-pay-to-win rules.
18. Analytics de conversion.
19. Compliance App Store.
20. UI premium sans dark pattern.

La priorité est de livrer une monétisation saine, sobre, désirable, non agressive et compatible avec une app de sport réelle.
```

---

# 2. Positionnement économique final de GRYD

```md
Implémente GRYD comme un free-to-play juste :

Free-to-play :
- courir ;
- capturer ;
- défendre ;
- rejoindre un crew ;
- progresser ;
- apparaître au classement ;
- participer aux saisons ;
- gagner des badges ;
- partager avec templates gratuits.

Payant :
- rendre son run plus beau ;
- rendre son profil plus statutaire ;
- personnaliser son crew ;
- obtenir des templates de partage premium ;
- afficher des skins de trace ;
- débloquer des frames ;
- obtenir des replays premium ;
- soutenir son crew ;
- accéder à des récompenses premium de saison ;
- obtenir du confort capé.

Formule à respecter :

Dans GRYD, payer doit rendre ton run plus beau, plus visible, plus statutaire.
Jamais plus vrai.
Jamais plus puissant.
Jamais plus rentable territorialement.
```

---

# 3. Roadmap de monétisation à implémenter

## V0 — Beta locale

```md
Objectif :
Tester le gameplay, le tracking GPS, la carte, les crews, la rétention.

Monétisation :
- aucune monétisation agressive ;
- pas de pass ;
- pas d’event pass ;
- pas de loot box ;
- pas de boost territorial ;
- éventuellement badge Founder gratuit pour beta testers.

À implémenter quand même en backend :
- table products ;
- table user_inventory ;
- table entitlements ;
- table purchase_ledger ;
- feature flags monétisation ;
- système de restore purchases ;
- architecture prête pour IAP.
```

## V1 — Lancement local

```md
Objectif :
Commencer à monétiser sans casser la confiance.

Produits à lancer :
1. Founder Pack.
2. Skins de trace.
3. Frames profil.
4. Templates story premium.
5. Crew cosmetics.
6. Éclats, monnaie premium.
7. Free daily claim.
8. Inventaire.

Ne pas lancer :
- GRYD Pass complet ;
- Event Pass ;
- Shield Token territorial ;
- loot boxes ;
- bundles agressifs ;
- abonnement obligatoire.
```

## V1.5 — Saison locale stable

```md
Condition de lancement :
Lancer seulement si :
- tracking fiable ;
- au moins une ville active ;
- crews actifs ;
- post-run stable ;
- partage story utilisé ;
- joueurs récurrents ;
- au moins 4 semaines de données.

Produits :
1. GRYD Pass.
2. Free track / premium track.
3. Reward claim.
4. Rewards rétroactives.
5. Items capés.
6. Crew Boost Coffre.
7. Replay Token.
8. Streak Freeze.
9. Route Reroll.
10. Scout Ping très limité.
```

## V2 — Events et live ops

```md
Produits :
1. Event Pass local.
2. Crew Raid Event.
3. Event cosmetics.
4. Sponsor events.
5. Packs événementiels.
6. Merchandising GRYD Athletics.
7. Drops physiques liés aux badges.
```

---

# 4. Architecture produit à créer

## 4.1 Modules à implémenter

```md
Créer les modules suivants :

1. Monetization Core
2. Product Catalog
3. Storefront
4. Purchase System
5. Receipt Validation
6. Entitlements
7. User Inventory
8. Premium Currency
9. Reward Claim
10. Daily Free Claim
11. Cosmetics Engine
12. Trace Skin Engine
13. Profile Frame Engine
14. Crew Cosmetics Engine
15. Story Template Engine
16. Replay Token Engine
17. Pass Engine
18. Event Pass Engine
19. Feature Flags
20. Analytics
21. Anti-pay-to-win Validator
22. App Store Compliance Layer
```

## 4.2 Principe technique

```md
Ne jamais lier un achat directement au moteur territorial.

Les achats peuvent modifier :
- apparence ;
- inventaire ;
- profil ;
- partage ;
- templates ;
- crew display ;
- analytics ;
- confort UX.

Les achats ne doivent jamais modifier directement :
- ownership des zones ;
- points territoriaux ;
- distance ;
- GPS Verify ;
- capture ;
- reprise ;
- défense ;
- classement brut ;
- rival visibility live.
```

---

# 5. Modèle de données recommandé

## 5.1 `products`

```sql
products (
  id uuid primary key,
  sku text unique not null,
  name text not null,
  description text,
  product_type text not null,
  platform text,
  price_amount numeric,
  price_currency text,
  premium_currency_amount integer,
  is_consumable boolean default false,
  is_active boolean default true,
  is_featured boolean default false,
  rarity text,
  category text,
  created_at timestamp,
  updated_at timestamp
)
```

`product_type` possibles :

```txt
founder_pack
premium_currency_pack
trace_skin
profile_frame
story_template
crew_banner
crew_blason
crew_hq_theme
replay_token
streak_freeze
route_reroll
scout_ping
crew_boost
season_pass
event_pass
bundle
```

## 5.2 `user_purchases`

```sql
user_purchases (
  id uuid primary key,
  user_id uuid not null,
  product_id uuid not null,
  platform text not null,
  platform_transaction_id text unique,
  purchase_status text not null,
  receipt_data jsonb,
  amount_paid numeric,
  currency text,
  purchased_at timestamp,
  validated_at timestamp,
  refunded_at timestamp
)
```

## 5.3 `user_entitlements`

```sql
user_entitlements (
  id uuid primary key,
  user_id uuid not null,
  entitlement_type text not null,
  entitlement_key text not null,
  source_product_id uuid,
  starts_at timestamp,
  expires_at timestamp,
  is_active boolean default true,
  metadata jsonb,
  created_at timestamp
)
```

Exemples :

```txt
founder_status
gryd_pass_active
skin_trace_chartreuse_pulse
profile_frame_founder
crew_banner_founder
advanced_stats_active
```

## 5.4 `user_inventory`

```sql
user_inventory (
  id uuid primary key,
  user_id uuid not null,
  item_type text not null,
  item_key text not null,
  quantity integer default 1,
  is_equipped boolean default false,
  source text,
  source_id uuid,
  acquired_at timestamp,
  expires_at timestamp,
  metadata jsonb
)
```

## 5.5 `premium_currency_wallet`

```sql
premium_currency_wallet (
  user_id uuid primary key,
  balance integer default 0,
  lifetime_earned integer default 0,
  lifetime_purchased integer default 0,
  updated_at timestamp
)
```

## 5.6 `premium_currency_ledger`

```sql
premium_currency_ledger (
  id uuid primary key,
  user_id uuid not null,
  amount integer not null,
  direction text not null,
  reason text not null,
  source_type text,
  source_id uuid,
  balance_after integer,
  created_at timestamp
)
```

## 5.7 `season_passes`

```sql
season_passes (
  id uuid primary key,
  season_key text unique not null,
  name text not null,
  city_id uuid,
  starts_at timestamp,
  ends_at timestamp,
  premium_product_id uuid,
  is_active boolean default false,
  metadata jsonb
)
```

## 5.8 `season_pass_levels`

```sql
season_pass_levels (
  id uuid primary key,
  season_pass_id uuid not null,
  level_number integer not null,
  required_points integer not null,
  free_reward jsonb,
  premium_reward jsonb,
  is_choice_node boolean default false,
  metadata jsonb
)
```

## 5.9 `user_pass_progress`

```sql
user_pass_progress (
  id uuid primary key,
  user_id uuid not null,
  season_pass_id uuid not null,
  points integer default 0,
  current_level integer default 0,
  has_premium boolean default false,
  premium_unlocked_at timestamp,
  created_at timestamp,
  updated_at timestamp
)
```

## 5.10 `user_pass_claims`

```sql
user_pass_claims (
  id uuid primary key,
  user_id uuid not null,
  season_pass_id uuid not null,
  level_number integer not null,
  track text not null,
  reward_key text,
  claimed_at timestamp
)
```

## 5.11 `daily_free_claims`

```sql
daily_free_claims (
  id uuid primary key,
  user_id uuid not null,
  claim_date date not null,
  reward jsonb not null,
  claimed_at timestamp
)
```

## 5.12 `item_usage_logs`

```sql
item_usage_logs (
  id uuid primary key,
  user_id uuid not null,
  item_type text not null,
  item_key text not null,
  used_on_type text,
  used_on_id uuid,
  effect_applied jsonb,
  created_at timestamp
)
```

---

# 6. Produits à implémenter en V1

## 6.1 Founder Pack

```md
Nom :
Founder Pack

Prix recommandé :
9,99 € en beta locale
ou 19,99 € si le contenu visuel est très fort
Éviter 24,99 € au tout début sauf communauté déjà très engagée.

Type :
one-time purchase

Contenu :
- Badge Founding Runner
- Frame Founder
- Skin de trace Founder Chartreuse
- Template Story Founder
- Crew Banner Founder
- 500 Éclats
- Titre “Founding Runner”

Règle :
Produit disponible uniquement pendant les 90 premiers jours du lancement local.

Aucun avantage territorial.
Aucun boost de zones.
Aucun classement acheté.
```

## 6.2 Éclats

```md
Nom :
Éclats

Traduction EN :
Shards

Usage :
monnaie premium pour cosmétiques et confort capé.

Packs :
100 Éclats — 0,99 €
550 Éclats — 4,99 €
1200 Éclats — 9,99 €
2500 Éclats — 19,99 €

Peut acheter :
- skins de trace ;
- frames ;
- templates story ;
- replay tokens ;
- route rerolls ;
- badge slots ;
- crew banners ;
- crew blasons ;
- map styles.

Ne peut jamais acheter :
- zones ;
- kilomètres ;
- capture ;
- défense ;
- rank ;
- victoire ;
- rival live.
```

## 6.3 Skins de trace

```md
Créer les premiers skins :

1. Chartreuse Pulse
2. Night Line
3. Carbon Flow
4. Founder Gold
5. Electric Blue
6. Rival Red
7. Ghost Trail
8. Crew Line

Prix :
150 à 300 Éclats
ou 1,99 € à 2,99 € en achat direct.

Règle :
Cosmétique uniquement.
Ne modifie jamais le calcul.
```

## 6.4 Frames profil

```md
Créer :

1. Rookie Frame
2. Runner Frame
3. Founder Frame
4. Defender Frame
5. Captain Frame
6. Royal Frame
7. Season Frame
8. Crew MVP Frame

Prix :
100 à 200 Éclats.

Usage :
visible sur profil, classement, crew, post-run, partage.
```

## 6.5 Templates story

```md
Créer :

1. Conquest Story
2. Defense Story
3. Loop Closed Story
4. Crew Victory Story
5. Founder Story
6. Ranking Story
7. Night Run Story
8. City Takeover Story

Prix :
150 Éclats le pack
ou 2,99 €.

Free :
2 templates gratuits de base doivent toujours exister.

Premium :
templates plus beaux, animés, export meilleure qualité.
```

## 6.6 Crew cosmetics

```md
Créer :

1. Crew Banner Founder
2. Crew Banner Carbon
3. Crew Banner Chartreuse
4. Crew Blason Shield
5. Crew Blason Flag
6. Crew HQ Theme Dark
7. Crew HQ Theme City
8. Crew HQ Theme Raid

Prix :
200 à 300 Éclats.

Règle :
L’achat modifie seulement l’identité visuelle du crew.
```

---

# 7. GRYD Pass à préparer en V1.5

## 7.1 Nom

```md
Nom recommandé :
GRYD Pass

Pourquoi :
simple, propriétaire, international, pas trop fitness, pas trop local.
```

## 7.2 Durée

```md
Durée :
4 semaines.

Justification :
- compatible avec une saison locale ;
- assez long pour progresser ;
- assez court pour créer un rituel ;
- pas trop agressif pour un sport réel.
```

## 7.3 Prix

```md
Prix recommandé :
5,99 €

Test possible :
4,99 € en beta
5,99 € public
```

## 7.4 Structure

```md
30 niveaux.
Free track.
Premium track.
Récompenses visibles à l’avance.
Récompenses premium rétroactives si achat tardif.
Claim manuel.
Timer de saison.
Progression claire.
```

## 7.5 Points de pass

```md
Sources de points :
- run validé ;
- boucle fermée ;
- zone défendue ;
- route ouverte ;
- contribution crew ;
- encouragement ;
- vote cible ;
- partage story ;
- challenge hebdo ;
- retour défendre une zone.

Caps obligatoires :
- maximum points sport par jour ;
- maximum points sport par semaine ;
- pas de récompense infinie au kilomètre ;
- missions low-friction non sportives pour éviter surentraînement.
```

## 7.6 Exemple de caps

```md
Max points par jour via course :
300

Max points par semaine via course :
900

Actions low-friction :
- encourager un membre ;
- voter cible ;
- contribuer au coffre ;
- partager une story ;
- consulter une mission.

But :
un joueur qui court 3 fois/semaine peut finir le pass.
Un joueur qui court tous les jours ne doit pas être obligé d’en faire trop.
```

## 7.7 Récompense finale

```md
Palier 30 premium :
- skin de trace mythique ;
- badge saison premium ;
- frame saison premium ;
- template story animé ;
- animation capture.

Aucun boost.
Aucun avantage territorial.
```

---

# 8. Exemple de GRYD Pass 30 niveaux

```md
Implémente une configuration initiale de pass avec 30 niveaux :

Niveau 1
Free : Badge Saison
Premium : Frame Founder Season

Niveau 2
Free : 20 Éclats
Premium : 80 Éclats

Niveau 3
Free : Template story simple
Premium : Template story premium

Niveau 4
Free : Emote crew
Premium : Skin trace Chartreuse Pulse

Niveau 5
Free : Badge Rookie Season
Premium : Badge premium animé

Niveau 6
Free : 20 Éclats
Premium : Route Reroll x1

Niveau 7
Free : Title Runner
Premium : Title Founder Runner

Niveau 8
Free : Template défense
Premium : Replay Token x1

Niveau 9
Free : Emote Bien joué
Premium : Crew Banner Accent

Niveau 10
Free : Badge Défense I
Premium : Skin trace Night Line

Niveau 11
Free : 30 Éclats
Premium : 100 Éclats

Niveau 12
Free : Scout Ping x1
Premium : Scout Ping x2

Niveau 13
Free : Frame simple
Premium : Frame rare

Niveau 14
Free : Template boucle
Premium : Template conquête premium

Niveau 15
Free : Badge Mid Season
Premium : Animation capture

Niveau 16
Free : 30 Éclats
Premium : Crew Boost Coffre 24 h

Niveau 17
Free : Emote crew
Premium : Emote premium

Niveau 18
Free : Map marker simple
Premium : Map marker premium

Niveau 19
Free : Streak Freeze x1
Premium : Streak Freeze x2

Niveau 20
Free : Badge Loop Runner
Premium : Skin territoire light

Niveau 21
Free : 40 Éclats
Premium : 120 Éclats

Niveau 22
Free : Template rivalité
Premium : Replay Token x2

Niveau 23
Free : Title Defender
Premium : Title rare

Niveau 24
Free : Badge Crew Helper
Premium : Crew HQ Decoration

Niveau 25
Free : Frame saison
Premium : Frame saison premium

Niveau 26
Free : Route Reroll x1
Premium : Route Reroll x2

Niveau 27
Free : Template classement
Premium : Template podium premium

Niveau 28
Free : Badge rare free
Premium : Badge epic premium

Niveau 29
Free : 50 Éclats
Premium : Crew Banner premium

Niveau 30
Free : Badge Season Finisher
Premium : Skin trace mythique + Badge Royal Season + Animation capture
```

---

# 9. Items capés à implémenter

## 9.1 Replay Token

```md
Usage :
génère un replay vidéo premium post-run.

Impact :
aucun gameplay.

Limite :
pas nécessaire.

Prix :
50 Éclats.

Obtention :
GRYD Pass, boutique, free claim rare.
```

## 9.2 Streak Freeze

```md
Usage :
protège une série personnelle.

Impact :
aucun territoire.

Limite :
2 par mois maximum.

Prix :
100 Éclats.

Ne doit jamais protéger une zone.
```

## 9.3 Route Reroll

```md
Usage :
propose une autre route recommandée.

Impact :
aucune capture garantie.

Limite :
3 par semaine.

Prix :
30 Éclats.
```

## 9.4 Scout Ping

```md
Usage :
met en avant une opportunité proche déjà disponible dans les données publiques du jeu.

Impact :
faible.

Limite :
3 par semaine.

Prix :
30 à 50 Éclats.

Ne doit jamais révéler :
- position live rival ;
- trace rival privée ;
- stratégie rival privée.
```

## 9.5 Crew Boost Coffre

```md
Usage :
augmente la progression du coffre crew.

Effet :
+10 % pendant 24 h
ou +15 % pendant 72 h.

Cap :
max +35 % total actif sur le crew.
max 1 boost actif par utilisateur par semaine.

Impact :
coffre uniquement.
Pas de zones.
Pas de classement direct.
```

## 9.6 Shield Token

```md
Ne pas implémenter au MVP.

Raison :
risque pay-to-win territorial.

Alternative recommandée :
Attack Alert Token.

Usage :
prévenir le joueur quand une zone fraîchement capturée est attaquée.

Effet :
notification + mission défense.

Ne protège pas automatiquement.
Ne bloque pas le rival.
```

---

# 10. Boutique GRYD à implémenter

## 10.1 Structure écran boutique

```md
Créer une boutique sobre :

BOUTIQUE

À la une
- Founder Pack

Éclats
- 100
- 550
- 1200
- 2500

Trace
- Chartreuse Pulse
- Night Line
- Carbon Flow
- Founder Gold

Profil
- Frames
- Badges slots
- Titles

Partage
- Templates story
- Replay tokens

Crew
- Bannières
- Blasons
- HQ themes
- Contribution coffre

Gratuit
- Free daily claim
```

## 10.2 Règles UI boutique

```md
1 CTA principal par écran.
Prix clair.
Contenu clair.
Pas de card dans card.
Pas de timer faux.
Pas de “best value” partout.
Pas de loot box.
Pas de popup agressif.
Pas d’offre pendant la course.
Pas d’offre sur la map live.
Possibilité de fermer facilement.
Restore purchases visible.
```

## 10.3 Product detail screen

```md
Pour chaque produit :

- nom ;
- visuel ;
- rareté ;
- contenu exact ;
- prix ;
- preview en contexte ;
- mention “cosmétique uniquement” si pertinent ;
- bouton acheter ;
- bouton annuler ;
- conditions ;
- disponibilité ;
- si limité : date de fin claire.
```

---

# 11. Écrans à créer

## 11.1 Boutique

```md
Écran dédié dans Profil ou Saison.
Ne pas mettre dans bottom nav au MVP.
```

## 11.2 Fiche produit

```md
Affiche le produit en grand.
Affiche le prix.
Affiche le contenu.
Affiche l’usage.
Affiche le caractère cosmétique.
```

## 11.3 Confirmation achat

```md
Résumé clair avant paiement :
- produit ;
- prix ;
- contenu ;
- caractère consommable ou permanent.
```

## 11.4 Inventaire

```md
Catégories :
- traces ;
- frames ;
- badges ;
- templates ;
- replay ;
- crew ;
- items.

Permet :
- équiper ;
- déséquiper ;
- utiliser ;
- voir source d’obtention.
```

## 11.5 Reward claim

```md
Animation courte.
Pas de casino.
Pas de jackpot.
Dopamine sobre :
- glow chartreuse ;
- item qui apparaît ;
- bouton “Équiper” ou “Continuer”.
```

## 11.6 Post-run premium share

```md
Après une course forte :
proposer 1 seule offre contextuelle.

Exemples :
- Générer replay premium.
- Utiliser template story premium.
- Équiper skin trace débloqué.

Jamais plus d’une offre.
Jamais de pack monnaie agressif.
```

## 11.7 Crew contribution

```md
Dans Crew :
- contribuer au coffre ;
- offrir un boost coffre ;
- acheter une bannière ;
- personnaliser le blason.

Toujours volontaire.
Aucune pression sociale.
Pas de classement des payeurs.
```

## 11.8 GRYD Pass

```md
À implémenter derrière feature flag.

Affichage :
- saison ;
- jours restants ;
- progression ;
- track free ;
- track premium ;
- récompenses visibles ;
- CTA Unlock Pass ;
- claim ;
- rewards rétroactives.

Ne pas activer au MVP sans validation produit.
```

---

# 12. Analytics à implémenter

## 12.1 Événements boutique

```md
store_viewed
product_viewed
purchase_started
purchase_completed
purchase_failed
purchase_refunded
restore_purchases_clicked
daily_free_claimed
inventory_item_equipped
inventory_item_used
```

## 12.2 Événements pass

```md
pass_viewed
pass_progressed
pass_reward_claimed
pass_premium_clicked
pass_premium_purchased
pass_premium_rewards_retroclaimed
pass_completed
```

## 12.3 Événements post-run

```md
post_run_share_offer_viewed
premium_replay_clicked
premium_replay_purchased
story_template_previewed
story_template_used
```

## 12.4 Métriques à suivre

```md
conversion payer
ARPPU
ARPU
LTV
D1/D7/D30 payers vs non-payers
Founder Pack conversion
skin equip rate
template usage rate
post-run premium conversion
pass view-to-purchase
refund rate
failed purchase rate
free claim retention uplift
```

---

# 13. Anti-pay-to-win validator

```md
Créer une fonction ou couche de validation qui empêche tout produit de modifier directement les propriétés territoriales.

Pseudo-règle :

If product.effect modifies:
- zone_owner
- zone_count
- territory_score
- capture_result
- defense_result
- run_distance
- GPS_verify
- ranking_points_direct
- rival_position_visibility

Then reject product configuration.

Un produit payant doit être classé uniquement dans :
- cosmetic
- status
- share
- comfort
- crew_cosmetic
- analytics
- capped_social_boost
```

---

# 14. App Store compliance

```md
Implémenter :

- achats via StoreKit / Google Play Billing ;
- receipt validation serveur ;
- restore purchases ;
- gestion refunds ;
- pas de lien vers store externe pour biens numériques ;
- prix clair ;
- contenu clair ;
- pas de loot box payante au MVP ;
- si récompense aléatoire plus tard : probabilités affichées ;
- suppression de compte disponible ;
- politique de confidentialité claire ;
- aucune promesse de gain sportif ;
- aucune mécanique qui pousse au surentraînement ;
- parental / âge si nécessaire ;
- moderation pour social/crew.
```

---

# 15. Design visuel de la monétisation

```md
Style :
- premium ;
- sombre ;
- chartreuse ;
- gaming ;
- pas casino ;
- pas enfantin ;
- pas agressif.

Palette :
- fond : carbon black ;
- CTA principal : chartreuse ;
- premium : gold subtil ;
- rare : blue / purple ;
- danger : orange-red ;
- texte : white / grey.

Règle :
la boutique doit ressembler à un équipementier running premium + game reward system,
pas à une machine à sous.
```

---

# 16. Copywriting UI

## Exemples bons

```txt
Débloque le style de ta saison.
Rends ta conquête partageable.
Personnalise ta trace.
Soutiens ton crew.
Récompenses premium de saison.
Cosmétique uniquement.
Aucun avantage territorial.
```

## Exemples interdits

```txt
Achète pour gagner.
Double tes zones.
Protège ton territoire automatiquement.
Détruis tes rivaux.
Avantage exclusif en classement.
Deviens imbattable.
```

---

# 17. Priorité d’implémentation

## Sprint 1 — Backend monétisation

```md
- products
- purchases
- entitlements
- inventory
- wallet Éclats
- ledger
- feature flags
```

## Sprint 2 — IAP

```md
- StoreKit
- Google Play Billing
- receipt validation
- restore purchases
- refunds
```

## Sprint 3 — Boutique V1

```md
- storefront
- product cards
- product detail
- purchase confirmation
- inventory
- equip cosmetics
```

## Sprint 4 — Cosmétiques

```md
- trace skins
- profile frames
- story templates
- crew banners
- blasons
```

## Sprint 5 — Founder Pack

```md
- SKU Founder Pack
- entitlement founder
- grant items
- grant Éclats
- limited availability
```

## Sprint 6 — Free daily claim

```md
- reward rotation
- claim state
- inventory grant
- analytics
```

## Sprint 7 — Pass engine behind feature flag

```md
- season pass tables
- points
- levels
- claims
- premium retroactive unlock
- UI prototype
```

---

# 18. Critères d’acceptation

```md
La monétisation est prête si :

1. Un utilisateur peut acheter un pack via IAP.
2. Le serveur valide l’achat.
3. Les items sont ajoutés à l’inventaire.
4. Les Éclats sont ajoutés au wallet.
5. L’utilisateur peut équiper un skin de trace.
6. Le skin ne modifie pas le calcul territorial.
7. L’utilisateur peut restaurer ses achats.
8. Les achats remboursés retirent l’accès si nécessaire.
9. La boutique n’apparaît jamais pendant un run.
10. Aucun produit ne modifie zone_owner, capture_result ou ranking direct.
11. Le Founder Pack est limité dans le temps.
12. Le Free Daily Claim fonctionne.
13. Les analytics sont envoyées.
14. L’app reste conforme App Store.
```

---

# 19. Résultat attendu

```md
À la fin, je veux :

1. Une boutique V1 fonctionnelle.
2. Une monnaie premium Éclats.
3. Un système d’inventaire.
4. Des achats in-app validés côté serveur.
5. Des cosmétiques équipables.
6. Un Founder Pack.
7. Des templates story premium.
8. Des skins de trace.
9. Des frames profil.
10. Des crew cosmetics.
11. Un free daily claim.
12. Un pass engine prêt mais désactivé.
13. Des règles anti-pay-to-win codées.
14. Des analytics de conversion.
15. Une UI premium, sobre, claire.
```

---

# 20. Recommandation finale à respecter

```md
Ne lance pas GRYD avec une monétisation agressive.

Implémente d’abord :
- Founder Pack ;
- Éclats ;
- skins de trace ;
- frames ;
- templates story ;
- crew cosmetics ;
- inventory ;
- boutique sobre.

Prépare le GRYD Pass techniquement,
mais ne l’active qu’après validation de la densité locale et de la rétention.

La monétisation de GRYD doit devenir un moteur de statut,
pas un moteur de domination.
```
