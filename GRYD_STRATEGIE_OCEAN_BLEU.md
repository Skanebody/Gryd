# GRYD — Stratégie, Océan Bleu & UI/UX 2026
**Document de travail (06/07/2026) — analyse critique, marché, positionnement, friction/rétention, état de l'art design, specs.** À challenger.

> Distinguer faits sourcés / estimations / jugements. Chiffres marché & rétention = sources publiques 2025-2026 (§9), écarts de méthodo signalés. Recommandations produit = jugements argumentés.

## 0. Synthèse exécutive
**GRYD = le premier sport d'équipe en conditions réelles** (ni running app, ni « jeu de territoire »).
1. La mécanique territoriale n'est PAS un moat (construite 5×+ depuis 2014 : Run An Empire, Turfly, Turf Wars, City Domination ; INTVL a gagné par la distribution TikTok, pas l'idée).
2. La friction d'activation de GRYD est unique : activer = courir 1 km (vs 1 tap ailleurs). Le fitness meurt à ~3 % D30 à cause de ça.
3. Les 2 moats réels = **crew + densité locale**, et c'est le MÊME levier (un crew = verrouillage social + clustering géographique).
**À verrouiller avant tout :** moteur de capture fiable + moment de capture jouissif + ingestion de runs synchronisés (Apple Health / Garmin / Strava).

## 1. Angles morts du doc GRYD existant
- **N°1 — Cold-start dans le cold-start** : le crew n'est vivant qu'à masse critique → boucle SOLO satisfaisante dès le run #1, le crew s'active quand la densité existe.
- **N°2 — Mur de friction (courir DANS l'app)** : risque produit n°1. Correctif : capture depuis run synchronisé en first-class (§6).
- **N°3 — Calendrier irréaliste (×3 à ×5)** : le moteur GPS + boucle + territorial = mois, pas 15 jours. Re-séquencer autour du moteur (§8).
- **N°4 — Monétisation trop mince** : ajouter le sponsoring local (§3.5), qui règle aussi le risque loterie.

## 2. Marché 2026 (sourcé)
- Marché ~1,8 Md$ (2025, Dataintelo) → ~14,5 Md$ « 2026 » (périmètre + large). Croissance ~8,7 %/an.
- Océan rouge = tracking + training : **Strava** (monopole social, 120M+, a racheté Runna avr. 2025), Runna, Nike Run Club, Garmin. Ne PAS jouer sur ce terrain.
- **Rétention (le vrai combat)** : D1 ~20-27 %, D7 ~7-8,5 %, D30 ~3-4 % ; ~72-77 % churnent en 3 j. Tueur n°1 = perte de motivation (~38 %). Churn mensuel ~9,2 %.
- Levier prouvé : activation < 3 min ≈ ×2 rétention ; 1re action utile J1 = prédicteur n°1 de D30 ; plans annuels +40-60 % ; prix élevé = filtre qualité.
- Niche territoriale PAS vide (10+ ans) : Run An Empire/Stride, Turfly, Turf Wars, City Domination, INTVL (~1,1M DL, plaintes GPS/support/loterie), **Runify 2026** (rang décroissant + sync SANS double-tracking, 4,8★). Gagne = exécution + distribution + courbe de valeur inédite.

## 3. Océan Bleu
- **Repositionnement** : le concurrent n'est plus Strava, c'est **l'ennui et la solitude du fitness solo** (non-consommation). L'acheteur devient « les gens qui veulent appartenir à une équipe et représenter leur quartier ».
- **ERRC** — ÉLIMINER : pay-to-win, loterie, classement vitesse, scoring opaque, surcharge carte, obligation de courir dans l'app pour capturer. RÉDUIRE : training/métriques (céder à Strava via sync), étalement géo, étapes onboarding, pression abo, scope V1. AUGMENTER : fiabilité (« never lose a run »), transparence, profondeur défensive, densité locale, juice de capture, partage-conquête. CRÉER : guerre crew-vs-crew + War Room, identité de quartier, boucle collective, défense = raison de revenir, saisons narratives, **capture depuis run synchronisé**.
- **Strategy Canvas cible** : GRYD abandonne le training (→ Strava) et crée un pic sur équipe + local + fiabilité + transparence + capture synchronisée.
- **Monétisation (2 problèmes à la fois)** : 1) sponsors locaux (financent les lots → contourne la loterie), 2) cosmétiques/statut, 3) Founder Pack, 4) confort capé/analytics crew (jamais territoire/victoire), 5) GRYD Athletics (textile). Abo éventuel = prix élevé, sur la couche sociale/statut, JAMAIS sur le jeu.

## 4. Friction vs Rétention
- **Principe** : déplacer TOUTE la friction hors de la course ; mettre TOUTE la rétention sur crew + aversion à la perte (decay). La course est la « monnaie » : la rendre jouissive, supprimer toute autre taxe.
- **Tuer la friction non-course** : pas de mur d'inscription (auth différée, Apple/passkey), 1 tap = RUN, capture depuis run synchronisé, « aha » avant de courir (quartier = plateau de jeu en < 60 s), permission GPS pédagogique.
- **Moteurs de rétention** : le crew EST l'antidote à la perte de motivation ; decay = aversion à la perte ; saisons = cadence ; capture jouissive = payoff ; push contextuel dosé.
- **Métriques** : activation = 1re capture (< 72 h run neuf / immédiat via sync) ; nord = % 1re capture J1 ; cibles beachhead D1 ≥ 30 %, D7 ≥ 12 %, D30 ≥ 8 % ; suivi par cohorte de ville.

## 5. UI/UX 2026 appliqué
- **Liquid Glass (iOS 26)** = séparateur spatial (overlay temporaire au-dessus de la carte), pas déco ; gérer contraste + option « réduire transparence ».
- **Motion** = langage fonctionnel (physics-based, continuité spatiale/morph). **Moment signature = animation de remplissage de zone à la capture.**
- **Haptique** (sous-exploitée, décisive) : boucle possible=light ; zone capturée=success+heavy ; défendue=success medium ; perdue/attaque=warning ; segment exclu=error light ; CTA principal=medium.
- **Ergonomie** : thumb-first, dark mode première classe, bottom-sheets, 1 écran = 1 décision.
- **Onboarding** : divulgation progressive (gestes révélés au besoin), apprendre en faisant.
- **Batterie = rétention cachée** : mode course basse conso (écran atténué/verrouillé) = argument produit.
- **Design tokens** : couleurs par rôle (chartreuse=moi, orange=rival, violet=contesté…), trace type Strava (core/casing, round caps), motion spring, typo à hiérarchie de poids, chiffres confiants, jamais de « … ».

## 6. SPEC — Capture depuis run synchronisé (le disruptor friction)
> *« Tu ne dois pas courir dans GRYD. Cours comme tu veux — Apple Watch, Garmin, Strava. GRYD transforme ta course en conquête. »*
- Sources : MVP = Apple Health/HealthKit + GPX manuel ; V1.1 = Strava API + Garmin ; V1.2 = Coros/Suunto/Polar.
- Pipeline = même que le run in-app (nettoyage → boucle → polygone → micro-cellules → attribution → GRYD Verify → rendu).
- **GRYD Verify sur import** : montre GPS dédiée = trust élevé ; GPX sans métadonnées = trust plafonné → partiel/stats-only ; anti-triche renforcée (détecter GPX fabriqués : vitesses trop lisses, absence de bruit GPS).
- **Modèle hybride assumé** : synchronisé = activation post-hoc (pas de live) ; in-app = live/défense temps réel/toasts. Ne pas opposer les deux.
- Risque : la contestation temps réel n'a pas de sens sur un run synchronisé décalé → régler les fenêtres decay/contestation pour tolérer le délai de sync.

## 7. Audit de friction — onboarding idéal (écran par écran)
Activer (1re capture) le plus vite ; différer le reste. Valeur perçue < 60 s, 1re capture < 72 h (ou immédiate via sync).
1. Splash/hook (1 phrase « Prends ta ville »). 2. Ta ville maintenant (quartier réel en plateau AVANT compte). 3. Permission GPS pédagogique (écran d'explication avant la demande système). 4. Choix du chemin (« J'ai déjà des runs » → sync / « Je vais courir » → 1 tap RUN). 4a. Sync → 1re zone en secondes (aha). 4b. Premier run (1 tap, zéro config). 5. 1re capture = moment signature (animation + haptique + partage). 6. Création compte APRÈS la valeur (Apple/passkey). 7. Rejoindre/créer crew après la 1re capture. 8. Notifications opt-in cadrées après la valeur.
**Règle transversale : aucun écran ne demande avant d'avoir donné.**

## 8. Séquencement réaliste
Phase 1 — Le moteur (le plus dur, la diff) : GPS fiable + never-lose-a-run + boucle + zones + Verify + ingestion synchronisée + moment de capture. Phase 2 — Boucle jouable solo (carte-mission, post-run, partage, decay/statuts). Phase 3 — Couche crew (densité : crews, boucle collective, War Room, classement local). Phase 4 — Beachhead & saison 1 (ville où l'exécution présentielle est la plus facile ; valider la densité running).
> À valider : Rouen (scène running modeste vs Nantes/Lille/Paris) — assez de run clubs pour le seuil « ville vivante » (500 inscrits, 150 actifs/sem) ?

## 9. Sources & confiance
🟢 Élevé : structure concurrentielle running, existence des concurrents territoriaux, benchmarks rétention (fourchettes), langage iOS 26. 🟡 Moyen : chiffres marché absolus, revenu INTVL (~200K$/mois estimé Sensor Tower, non vérifié), rétention par app. 🔴 À valider : densité running Rouen, faisabilité calendrier, appétit local crew. (Sources détaillées : Dataintelo, Verified Market Reports, neoads, runifyapp, provizsports, lucid.now, snoopr, uxcam, retentioncheck, adapty, asappstudio, orizon, mindinventory, muz.li, runanempire, INTVL stores/Sensor Tower.)
