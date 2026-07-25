# Refonte Vague 1 — Implémentation fidèle des 19 planches (E01→E19)

**Source visuelle** : projet Claude Design `7f3d9ca2-23cf-4f70-9303-a7f87f0ebddc`,
`GRYD - Vague 1 Planches.dc.html` (rendu). Copie locale `planches.html` (markup
inline-styled, tronqué 256 KiB → E01-E07 dedans ; E08-E19 = re-fetch/DesignSync si besoin).
Rendre : `cd docs/design/vague-1 && python3 -m http.server 8899` → `localhost:8899/planches.html`.

## Règle non négociable (constitution)
Reproduire **composition + DA** fidèlement ; remplir avec **données RÉELLES ou VIDES**,
JAMAIS les placeholders de maquette (« Nina M. », « 1,84 km² », « 6,2 km² »,
« 1 zone à reprendre »…). Les états critiques des planches (position indispo, hors
ligne, permission refusée, chargement) sont les VRAIS états honnêtes. Anti-pay-to-win
strict (E17). Chartreuse ≈ 8-10 %, jamais sur clair. Couleurs par RÔLE (moi chartreuse,
rival orange, contesté violet, crew bleu désaturé).

## Preview des écrans carte (auth-gated)
Injecter une session simulée (localStorage `sb-sydwxwwirinjoheeodcg-auth-token` + JWT
factice) → la carte rend avec états vides honnêtes → permet de VÉRIFIER chaque écran
contre la planche. (Cf. transcript.)

## État par écran
| # | Écran | Statut | Deltas / à faire (fidèle planche) |
|---|-------|--------|-----------------------------------|
| E01 | Onboarding promesse | ✅ fidèle (`1d30f55`/`e6c3798`) | Photo à déposer (`assets/onboarding/e01-crew.png`). Boucle anguleuse qui se remplit ✓ |
| E02 | Home Map — nouveau joueur | 🔄 header ✓, RUN rond ✓, **capsule FABs ✓** (`9be934c`), **nav Profil ✓** (`9f79397`) | RESTE : sheet TIRABLE « PREMIÈRE MISSION » (poignée déjà là ; 900 m·6 min = O1/vraie suggestion de boucle, sinon absents) + boucle 900 m pointillée + pin joueur (O1) |
| E03 | Home Map — joueur actif | 🔄 recalage | Mon territoire chartreuse 15 % + halo + label ; 1 rival orange (K.RUNNER=démo→réel) ; crews voisins bleu désaturé ; pill contexte « 1 zone à reprendre » (réelle, 5 s) ; sheet « VOTRE TERRITOIRE km² » (réel) |
| E04 | Zone rivale — REPRENDRE | 🔄 (fait `4b3ca10`, à recaler) | Sheet 52 % : propriétaire (avatar+handle+crew RÉELS), « tenu depuis », 3 métriques séparateurs, historique 1 ligne, REPRENDRE + « Planifier pour plus tard ». Zone cadrée au-dessus |
| E05 | Briefing mission | 🔄 (bloc métriques `059ac09`) | Sheet 58 %, mini-carte tracé recommandé, 4 métriques 1 bloc (gain km²/difficulté=O1→absents), « Ajuster », COMMENCER LA MISSION + microtexte GPS |
| E06 | Préflight + décompte | ✅ (`b4bd13c`/`3a95007`) | — |
| E07 | Live Run | 🔄 antenne ✓ (`d60002e`) | Carte dominante 100 %, position 62 %, tracé 4 px, fermeture DESSINÉE sur carte + %, 3 métriques 24 pt, Pause centre, Terminer dans Pause |
| E08 | Fermeture & capture | 🆕 à construire | Séquence 900-1100 ms : contour ferme → surface se remplit (encre) → nom → gain km² → badge. Post-run, avant E09 |
| E09 | Résultat | 🔄 (fait `4ce0d2c`) | Hero carte avant/après 44 % (O1) OU tracé ; ordre territoire→progression→stats→partage ; DÉFIER dormant ✓ |
| E10 | Story / Partage | 🔄 (partage existe) | Compositeur : preview média exporté, rangée modes (Auto/Impact/Photo/Avant-Après/…), PARTAGER LA STORY, sticker PNG, replay 6-8 s |
| E11 | Classement local | 🔄 (classement existe) | Podium (photos R7), ma ligne surlignée, chips « Autour de moi/Quartier/Ville/Amis/Crew », variations ▲▼, monde caché. Données RÉELLES/vides |
| E12 | Saison & rang | 🔄 (saison existe) | Carte rang (bouclier) + jalon + frise récompenses cosmétiques ; moment « passage de rang » (anneau). Matériaux acier→chrome→titane→or |
| E13 | Crew Home | 🔄 (crew existe) | Hero photo+emblème, mission collective, territoire, activité, membres ; onglets Aperçu/Carte/Membres ; état vide « premier territoire crew » |
| E14 | Commutateur Run/Bike | 🆕 (Bike flag OFF) | Petit switch header droite, visible SEULEMENT si Bike activé. Reste masqué tant que flag OFF |
| E15 | Profil joueur | 🔄 (profil existe) | Hero photo+identité+statut visibilité, 4 métriques, carte signature, progression, previews (activité/badges/historique) |
| E16 | QR codes | 🆕 à construire | Mon code (profil) / code crew (invitation) / Scanner. QR = deep link public, jamais position. `expo-camera` ? |
| E17 | Boutique & Premium | 🔄 (arsenal existe) | Boutique cosmétique (hero saison + grille) + paywall Premium (heatmap réelle + 3 bénéfices + prix). Anti-p2w STRICT |
| E18 | Statistiques & data | 🔄 (performance existe) | 3 blocs (volume/territoire/régularité) chiffre→graphe→conclusion ; heatmap = Premium ; commutateur Run/Bike |
| E19 | Collection badges | 🔄 (badges existe) | Grille 3 col, familles par silhouette, rareté par matériau, verrouillés en pointillé ; déverrouillage rare (écran 49) |

## Modèle d'exécution
Écran par écran (décision fondateur), fidèle au markup, VÉRIFIÉ en preview (session
simulée pour la carte), gate dur (typecheck 4/4 · deno · sync) + commit sélectif.
La plupart des écrans P1 (E11-E19) EXISTENT déjà → RECALAGE, pas build-from-scratch.
Prochain : finir E02 (sheet tirable + boucle mission + capsule FABs + nav Profil).
