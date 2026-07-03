# AMENDEMENT-05 — Landing V2 « war room sportive » (03/07/2026)

**Source : diagnostic complet du fondateur sur la landing V1.** Verdict : « propre, premium, lisible, mais ressemble à une landing SaaS/fitness. Il faut comprendre en 3 secondes : *je vais courir pour prendre la France avec mon crew*. » Trois mots-clés : **TERRITOIRE · CREW · SAISON**. Direction : `Nike Running × Risk × Clash Royale UI × Strava heatmap × carte tactique nocturne` — pas fantasy, pas militaire réaliste.

## 1. Langage visuel de conflit — 2ᵉ exception contrôlée à la palette (après AMENDEMENT-04)
Le fondateur : « tout appartient à GRYD, on ne voit pas les adversaires — sans ennemi, pas de conflit. » Couleurs secondaires TRÈS contrôlées, réservées aux états de jeu :

| Var CSS (globals.css) | Valeur | Usage EXCLUSIF |
|---|---|---|
| `--ch` (existant) | #B4FF0D | Mon crew, action principale, gains |
| `--ennemi` / `--ennemi-14` | #FF5C33 / 14 % | Zone ennemie, attaque subie, alerte, danger |
| `--rival` / `--rival-14` | #8B5CF6 / 14 % | Crew rival (classements, raretés épiques) — aligné violet AMENDEMENT-04 |
| `--or` | #E7B84C | Victoire, médaille, badge Fondateur, Legend — aligné or AMENDEMENT-04 |
| blanc/gris (existants) | — | Neutre |
| carbone (existant) | — | Premium |

États à savoir exprimer : `à moi · ennemi · neutre · contesté (hachures ennemi+chartreuse) · protégé (double contour blanc) · en danger (pulse ennemi) · légendaire (or)`. Ces couleurs n'apparaissent JAMAIS sur les CTA, la nav, ou hors contexte de jeu. Interdit : rouge vif générique, 12 couleurs, fantasy.

## 2. Copy V2 (remplacements actés)
- Hero : « LA FRANCE EST OUVERTE. » + « Cours. Capture. Défends. » + « Rejoins ton crew, prends ton quartier, et termine la saison au sommet de la carte. »
- « Un jeu de territoire construit sur l'effort réel. » → **« Pas de joystick. Pas de triche. Ton corps est la manette. »**
- « La France entière est capturable. » → **« La carte est ouverte. Chaque run peut changer la frontière. »**
- « Chaque fin de course doit se ressentir. » → **« Quand ta course se termine, la carte a changé. »**
- « Seul, tu prends des rues. En crew, tu prends la ville. » → conservé (validé).
- Narration France : « Paris devient une bataille. Dieppe devient un avant-poste. Offranville devient une terre pionnière. Chaque village peut écrire sa carte. »
- Performance : « Plus tu progresses comme coureur, plus tes runs deviennent dangereux sur la carte. »
- Avant/Après : « Avant GRYD : tu cours, c'est enregistré. Avec GRYD : tu cours, tu prends un territoire, ton crew avance, la carte change. »

## 3. Sections V2 (ordre de page) et contenu exigé
1. **Hero war room** : titre V2 ; chip saison ; **compte à rebours Saison 0** (« J-18 · 30 crews inscrits · 1 240 runners en attente » — chiffres fictifs assumés) ; **mini-leaderboard 3 crews** (1. Bastille Runners 18 420 pts · 2. Canal Crew 16 870 pts · 3. Night Pacers 15 240 pts, rival en violet) ; **notifications flottantes** autour du téléphone (« ⚠ Paris Est attaqué », « +214 hexes capturés », « Night Pacers passe #3 », « Zone République : 62 % contrôlée », « Saison 0 : 18 jours restants ») ; 2 CTA : « Réserver mon accès » (chartreuse) + « Créer mon crew » (ghost → #crews).
2. **Téléphone HUD** (dans le hero) : carte à 3 factions (mon crew chartreuse, ennemi #FF5C33, neutre), hexes qui basculent en direct, ligne de course active, HUD « RAID LIVE · Paris Est · 62 % GRYD Crew · 31 % Rival · 7 % Neutre · +18 hexes pris · 4 membres actifs · 22 min restantes », alerte raid, badge gagné qui pop.
3. **Gameplay Loop** (remplace Concept) : 5 étapes « Cours → Capture → Défends → Attaque → Domine » avec mini-map SVG qui CHANGE à chaque étape (hover/click) ; textes courts du diagnostic §4.
4. **Battle Map France** : la carte devient un plateau — territoires par crew (chartreuse/rival/ennemi), zones contestées hachurées, routes, avant-postes ; **légende complète** (à moi/rival/neutre/contesté/protégé/decay) ; statuts par ville : `Paris — Zone active · Lille — Guerre ouverte · Rouen — Émergente · Dieppe — Avant-postes · Pays de Caux — Pionnier` ; badges de statut ACTIVE/ÉMERGENTE/PIONNIÈRE/SAUVAGE/CONTESTÉE/DOMINÉE ; compteur France 551 695 km² ; **City Activation Progress** (villes qui se remplissent).
5. **War Room** (NOUVELLE section) : carte d'offensive (« OFFENSIVE CREW · Canal Saint-Martin · Objectif 800 hexes · Temps restant 04:21:08 (décompte animé) · Progression 62 % · Membres actifs 7/10 · Récompense : Coffre Crew ») + **Live Territory Feed** (flux « zones capturées récemment » défilant) + **classement crews** avec onglets France/Paris/Lille/Pionniers/Crews.
6. **Victoire** (upgrade Reward) : carte de VICTOIRE, pas de stats — « +214 HEXES · Paris Est bascule à 62 % · Ton crew passe #3 · Badge Route Opened débloqué · +7 % bonus performance » ; badge qui pop (motion), médaille, mention « Zone capturée », bouton « Partager en story » avec aperçu 9:16.
7. **Badges & Medals** (NOUVELLE) : galerie depuis le catalogue @klaim/shared (Founder, Long Run, Route Opened, Défenseur, Top 10 City, Legend Crew…) + raretés visibles `Road · Tempo · Race · Carbon · Elite · Legend` (common→flat, legend→or+halo).
8. **Crews compétitifs** (upgrade CrewBuilder) : le builder reste mais devient un **CREW WAR ROOM** (« Night Pacers · #3 Paris Est · 4 membres actifs aujourd'hui · 1 offensive en cours · 42 % du secteur contrôlé ») + rivalité affichée (3 crews fictifs classés, rival en violet).
9. **Performance = arme** : ajouter « +7 % bonus conquête (plafonné +15 %) · 88 % données fiables · 3 records cette saison · 412 hexes cette semaine » + message « Plus tu progresses… dangereux sur la carte ». Relier visuellement au territoire (mini-hexes dans les cards).
10. **Arsenal** (upgrade Pricing) : boutique de jeu premium, pas du pricing SaaS — objets stylisés en SVG inspirés running/tech (Bouclier=coque carbone, Streak Gel=gel énergétique, Radar HUD, Scout, Bannière crew, Skin Carbon/Neon) avec rareté ; Starter Pack détaillé (« Skin Neon Territory + 120 Éclats + 1 Shield + Badge Founder ») ; prix INCHANGÉS depuis lib/pricing (Club 4,99/34,99, Starter 2,99, Pass 7,99 « Saison 1 ») ; preuve visuelle « non pay-to-win » (objets capés, jamais d'hexes/points).
11. **Waitlist = porte de la saison** : « Saison 0 — Fondateurs · 500 accès par vague · 30 crews fondateurs · France ouverte en premier » ; compteur de places, villes qui se remplissent, bénéfices fondateur (badge Saison 0 permanent, crew avant l'ouverture) ; formulaire INCHANGÉ côté backend (joinWaitlist réel).
12. **FAQ gameplay** : ajouter 6 questions (« Comment je prends un quartier ? », « Comment mon crew gagne une saison ? », « Que se passe-t-il si on me vole une zone ? », « Comment une ville passe en mode Guerre ? », « Je peux jouer en campagne ? », « Comment fonctionne GRYD Verify ? ») — réponses depuis les règles réelles (@klaim/shared game-rules : lock 24 h, decay 21 j, seuil mode Guerre 20 coureurs/30 j/5 km, etc.).

## 4. Contraintes de fabrication (non négociables)
- Les CHIFFRES DE JEU réels viennent de @klaim/shared (lock, decay, saisons 8 sem, seuils) ; les données de DÉMO (leaderboards, feed, countdown) sont fictives assumées, centralisées dans `lib/landing.ts` — déterministes (pas de Math.random au rendu, SSR stable ; les décomptes animés démarrent d'une valeur fixe côté client).
- i18n : chaque section garde FR/EN via useLang() — nouvelles strings locales au composant (const STRINGS = {fr,en}) pour éviter la contention sur dictionary.ts ; l'intégrateur peut consolider.
- Motion : hex takeover, compteurs, alerts, rank-up — 200-250 ms ease-out, `prefers-reduced-motion` partout ; pas de confettis permanents.
- Typo/graisses inchangées (Poppins, titres 500, héros 400). 1 CTA chartreuse par section (le CTA « Créer mon crew » du hero est ghost).
- Formulaire waitlist : ne PAS toucher actions.ts ni la logique Supabase.
- Zéro dépendance nouvelle. CSS Modules. Typecheck + build verts exigés.
