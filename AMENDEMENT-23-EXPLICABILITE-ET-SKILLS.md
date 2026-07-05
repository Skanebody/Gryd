# AMENDEMENT-23 — Explicabilité des calculs + système de Skills (05/07/2026)

**Source.** `GRYD_calcul_zones_skills_FAQ_regles.md` (Downloads) — référence canonique des RÈGLES du jeu (calcul zones/routes/boucles/défense/bonus/verify) + brief de construction d'une **couche d'explicabilité** et d'un **système de Skills**. *« Chaque zone gagnée doit pouvoir être expliquée. Chaque zone refusée aussi. »* GRYD aussi clair qu'un Supercell dans ses règles, aussi crédible qu'une app sportive dans ses calculs.

## 0. Autorité & discipline (LIRE EN PREMIER)
- Ce doc est **la référence de transparence & de design des règles**. Il ne remplace PAS `packages/shared/src/game-rules.ts` (constantes gelées) ni la décision serveur (« tout claim décidé serveur »). Ses nombres sont annoncés « MVP recommandés » = **repères**, pas des overrides.
- **Aucun nombre magique dans les pages.** La FAQ / la page calculs / le post-run / l'historique **affichent les vraies constantes** de `game-rules.ts` (via labels dérivés), jamais des littéraux copiés du doc. Les exemples chiffrés en prose (+247/+214/+33, 79 %/21 %, 620 m) restent des **scénarios démo** (comme le reste des `*/demo.ts`).
- Là où le doc et le code **divergent**, le code gelé (SPEC §3 + game-rules) **gagne** ; on le SIGNALE (audit §A) et on ne modifie une constante que sur décision explicite du fondateur.

## A. Réconciliation (déjà construit vs nouveau) — **table d'audit du 05/07/2026**
**✅ Déjà implémenté, conforme au doc (à AFFICHER, pas réécrire)** : ligne→route vs boucle→zone ; distance min (1 km) / durée min (6 min) / tolérance fermeture (80 m) / compacité (0,12) ; boucle collective crew (fenêtre 24 h, finisher 400 m ou 15 %, contributions au prorata `boundary.ts`) ; reprises rival (`stolen`) ; bonus ciblés 6 types + cap **+35 %** + 1 seul multiplicateur (`bonuses.ts`/`engine/bonus.ts`) ; micro-cellules H3 res10 invisibles + fusion secteurs res7. Valeurs gelées dans `game-rules.ts`.

**⚠️ DIVERGENCES doc ↔ code gelé (le code gagne ; à arbitrer par le fondateur) :**
- **Défense graduée +12/24/48/72 h : NON implémentée.** Le code n'a qu'une défense **binaire** (re-parcours d'un hex à soi = `defended` +3 pts, cooldown 24 h, repousse le decay). *(Correction : une version antérieure de ce doc affirmait à tort que les 3 niveaux existaient.)*
- **Statuts de zone nommés (Stable/Fragile/À défendre/Protégée/En decay) : ABSENTS** ; decay **binaire à 21 j** (doc : 14 j + statuts).
- **Formule de points §23 (multiplicative) ≠ code** : le code est **forfaitaire par cellule** (neutre +10 / volé +15 / défendu +3, + pionnier par densité) × streak (cap ×1,5) × performance (0,9-1,15), PAS `zones × coeff action × contexte × verify`. Les coefficients ×1,3/×1,2/×0,4-0,7 n'existent pas.
- **Frontière couverte %** (§17), **seuils zone contestée §18** (>15 % rival/24 h ; 2 crews ≥30 %), **nommage secteur OSM** (§15) : **non calculés** (les % « frontière couverte/repoussée » vus en UI sont de la **démo**, pas un calcul).
- Petits écarts de valeur : surface max (code sans cap dur 3 km², palier bas 0,25 vs 0,20) ; **GPS trust ≥80 non exigé** pour capturer (seul motionTrust ≥70 = « vérifié ») ; largeur min boucle 60 m vs 80 m ; verify **seuil unique 70** vs paliers 80/60.

**Règle d'or de l'explicabilité (§0) : les pages décrivent le MODÈLE RÉEL DU CODE, pas la formule du doc.** Ne rien promettre que le moteur ne fait pas (ex. la FAQ « comment sont calculés les points » décrit le barème forfaitaire réel). Les divergences P0/P1 ci-dessus sont un **backlog d'arbitrage** séparé, pas un pré-requis des pages.

**NOUVEAU à construire :**
- **Couche d'explicabilité** (§B).
- **Système de Skills** (§C).
- Icônes manquantes éventuelles (la plupart existent déjà dans `icons.ts` : conquête/défense/route/scout/rival/crew/coffre/bonus/verify/segment exclu/decay/protected — compléter le trou seulement).

## B. Couche d'explicabilité (UI nouvelle)
Discipline AMENDEMENT-22 (UI en scènes) + charte. Mobile-first, très peu de texte/écran, schémas simples, icônes propriétaires, exemples concrets, **détails au tap**, zéro flou, pas de jargon visible hors section avancée.
1. **Page « Comment GRYD calcule tes zones »** (route dédiée) — 6 sections, chacune = 1 icône + 1 phrase simple + 1 mini-schéma + 1 exemple : (1) la ligne ouvre une route · (2) la boucle crée une zone · (3) la défense protège une frontière · (4) le crew ferme une boucle ensemble · (5) les bonus sont ciblés · (6) GRYD Verify valide les courses.
2. **Page « Calculs & règles du jeu »** (FAQ complète) — les 20 Q/R (§33) + FAQ courte post-run (§34), en accordéons « détails au tap ». Accès : Résultat, Paramètres, écran « Pourquoi ma course n'a pas compté ? ».
3. **Schémas pédagogiques** (SVG propriétaires, charte, reduce motion) : (1) ligne vs boucle · (2) la boucle fait la zone (trace +214 / boucle +247 / gain +33) · (3) défense de frontière (traverser/longer/fermer) · (4) boucle collective (KORO 79 % / LENA 21 %) · (5) bonus ciblé (segment manquant pointillé) · (6) GRYD Verify (check bleu / segment grisé). Réutiliser l'anim trait→boucle→remplissage existante (AMENDEMENT-20).
4. **Post-run « Comment est calculé ce résultat ? »** — lien dans le Résultat (dans « Voir détails », AMENDEMENT-20) : Trace seule / Boucle fermée / Gain boucle · zones défendues · routes ouvertes · segments exclus · GPS score · Motion score · verify status. (Le bloc « La boucle fait la zone » existe déjà — l'étendre, pas le dupliquer.)
5. **Détail du calcul dans l'Historique** — par course : zones par trace, zones par boucle, zones défendues, segments exclus, verify score.

## C. Système de Skills (nouveau)
Spécialisations de gameplay **gagnées par comportement** (pas seulement achetées — anti pay-to-win : Supporter n'a **aucun pouvoir territorial direct**).
- **8 familles** : Defender · Finisher · Scout · Route Maker · Conqueror · Strategist · Supporter · Streak Runner. Chacune : déclencheurs (comportements) + niveaux à seuils (ex. Defender I/II/III = 10/50/150 zones défendues).
- **Data** : catalogue dans `packages/shared` (familles, seuils, déclencheurs, icônes) — aucun nombre magique. **Dérivation** : fonction pure `packages/engine` (stats joueur → niveau par skill) + tests Deno. Les seuils = constantes gelées.
- **Affichage** : section Skills dans **Profil** (ex. `Defender II · 50 zones défendues`) façon AMENDEMENT-22 (pas de card-dans-card) ; **recommandation War Room** (ex. `KORO recommandé · Finisher II · 620 m restants`).
- Anti pay-to-win : un skill ne donne jamais de territoire/points/victoire directs ; il oriente missions & reconnaissance.

## D. DÉCISION FONDATEUR (05/07/2026) & ordre de build
**Le fondateur a tranché : implémenter POUR DE VRAI les 3 mécaniques divergentes** (défense graduée, statuts de zone + decay 14 j, formule de points multiplicative), **puis explicabilité AVANT Skills**. Comme les pages doivent décrire le comportement réel, l'alignement moteur est la FONDATION et précède l'explicabilité. Tout APRÈS le commit d'AMENDEMENT-22 (collision `game-rules.ts`).

**Chantier 1 — Alignement moteur (fondation, backend/engine, vérifié par tests) :**
- **Défense graduée** : calcul « frontière couverte % » (buffer 30 m ∩ frontière ciblée / total) + 3 niveaux traverser/longer/fermer → +12/24 h · +24/48 h · +48/72 h de stabilité. Constantes gelées dans `game-rules.ts`.
- **Statuts de zone + decay 14 j** : statuts nommés `stable/fragile/a_defendre/contestee/protegee/en_decay` + cycle Stable 7 j / Fragile 8-14 j / À défendre 48 h / decay après 14 j. Migration + moteur + types. (Remplace le decay binaire 21 j.)
- **Formule de points multiplicative** : `points = zones × coeff_action × coeff_contexte × verify_score`, coeffs §23 (conquête ×1 · reprise ×1,3 · défense ×1,2 · boucle propre ×1,1 · route ×0,4-0,7 ; contestée ×1,2 · crew ×1,1 ; verify >80 complet / 60-80 partiel / <60 stats-only). Refonte `scoring.ts`/`claims.ts` + ingest_run + Deno tests + sync. **Anti pay-to-win intact** : les bonus payants ne touchent jamais les points (coffre/XP/cosmétiques), cap +35 %.
- Petits alignements de valeur associés (à faire ici) : surface max cap dur 3 km², GPS trust ≥80 pour capturer, largeur min 80 m, verify paliers 80/60. Regénérer `_shared` via `sync-game-rules.mjs` (+ miroir drift test).

**Chantier 2 — Explicabilité (décrit les NOUVELLES règles, aucun nombre magique — valeurs tirées de game-rules)** : page « Comment GRYD calcule tes zones » (6 sections) + FAQ in-app « Calculs & règles » (§33-34) + 6 schémas SVG (§31) + lien post-run « Comment est calculé ce résultat ? » (étend « Voir détails ») + détail calcul dans l'historique. Réutiliser `course-result` (bloc boucle), `support.tsx`, `RunLoopMap`.

**Chantier 3 — Skills** : catalogue `packages/shared` (8 familles, seuils, déclencheurs, icônes) réutilisant les **mêmes compteurs de stats que les badges** (une seule source) + dérivation pure `packages/engine` + Deno tests + section Profil + reco War Room + sync. Distinct des badges (spécialisation/rôle vs récompense).

**Icônes à créer (audit §4)** : `boucle_ouverte`, `boucle_fermee`, `segment_exclu`, `conquete` (drapeau), `trophee` ; + trancher `bonus`/`verify`/`protected`/`warroom` (aliaser l'existant si possible). Charte : verify bleu = `gameColors.verify` toléré, jamais chartreuse sur clair.

Chaque chantier : vérif adversariale (zéro flou, zéro nombre magique, zéro card-dans-card AMENDEMENT-22, textes non tronqués, anti pay-to-win) + build (typecheck + Deno tests + preview) + fix + commit + push. Migrations déployées sur le projet Supabase live.
