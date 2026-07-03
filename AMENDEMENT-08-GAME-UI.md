# AMENDEMENT-08 — Refonte Game UI « scènes de jeu » (03/07/2026)

**Source : `docs/product/GRYD_refonte_app_complete_game_ui_supercell.md`.** L'app a les bons modules mais ressemble à un SaaS dark ; chaque page doit devenir une **scène de jeu** (Supercell adapté running : crew, territoire, saison — PAS cartoon, PAS militaire réaliste, PAS SaaS). Périmètre = priorités MVP §29/§31 du doc. **HORS scope (V1/V2)** : sound design, vidéos de fin de saison, recap animé, tournois, skins dynamiques, IA de reco. Les écrans AMENDEMENT-07 (Onboarding motiv, Aujourd'hui, Challenges, Motivation Settings) restent tels quels (déjà cohérents) — seuls leurs composants communs peuvent être upgradés.

## 0. Erreur « Cannot read properties of undefined » (doc §28) — PRIORITÉ ABSOLUE
`ErrorBoundary` global brandé (logo hex + « Reprends ta course » + bouton recharger) monté dans `app/_layout.tsx` + guards/fallbacks sur toute lecture de données démo. Plus JAMAIS d'écran d'erreur brut. (Cause historique des captures : onglet connecté à un ancien serveur dev planté — le boundary protège aussi contre ça.)

## 1. Design system jeu — `apps/mobile/src/ui/game/`
Composants (doc §26) : `CrewCrest` (blason hexagonal, taille S/M/L, frame de ligue), `PlayerAvatarFrame` (avatar hex + frame par tier joueur), `BadgeCard` (GRAND, désirable : hex + tier + progression + condition + récompense), `RewardCard`, `ChestCard` (jauge %, palier, état claimable), `LeagueMedal`, `PerkCard` (carte reward : icône/rareté/niveau/statut), `WarEventCard` (icône + action + zone + pts + réactions), `MemberCard` (avatar/rôle/dispo/contribution/dernière action + actions au tap), `ArsenalItemCard` (icône/rareté/usage/limite/prix/statut), `ContextualRunButton` (états RUN/DEFEND/RAID/CAPTURE + pulse + appui long), `BattleMapHUD`, `WarRoomObjectiveCard`, `FriendCard`, `CrewDiscoveryCard`, `RankUpCard`, `ShareCard`, `SourceTrustCard`. États visuels communs : Unlocked/Locked/In progress/Claimable/Active/Expired/Contested/Protected/Decay/Verified/Stats only/Rejected.
Animations : **RN `Animated` core uniquement** (pas de reanimated) — pulse, pressScale, compteur qui monte, slide-in, reveal ; hook `useReduceMotion` (AccessibilityInfo) → fades simples ; wrapper `haptics.ts` (expo-haptics, no-op web, désactivable).

## 2. Palette fonctionnelle (doc §5) — design-tokens mobile
Réutilise les couleurs de conflit AMENDEMENT-05 : chartreuse `#B4FF0D` = ton crew/action ; `#FF5C33` = rival/attaque ; `#8B5CF6` = contesté/rare/événement ; `#E7B84C` = victoire/or ; **ajouts** : blue steel `#6FB7FF` = Verify/info ; muted red `#D64545` = danger/decay urgent ; carbon `#101210` = surfaces profondes. Règle inchangée : la couleur sert à lire l'ÉTAT DE JEU, jamais décorative, jamais CTA/nav.

## 3. Navigation (doc §6)
Onglets : **Carte · War Room · Crew · League · Profil** (route `classement` conservée, label affiché « League »). Bouton central **contextuel** : RUN (libre) / DEFEND (zone menacée) / RAID (offensive active) / CAPTURE (zone neutre proche) — état dérivé des données démo ; conserve le RunModeSheet AMENDEMENT-07 (Conquête/Social Run/Course privée) puis navigue vers Course Live.

## 4. Battle Map (doc §7 — priorité 2)
4 couches : basemap urbaine stylisée SUBTILE (axes, Seine/canal, parcs, noms de secteurs discrets — pas Google Maps), hex grid, ownership, HUD. États hexes : neutre / ton crew (chartreuse + glow) / rival (orange sombre) / contesté (double contour + pulse) / protégé (shield + halo) / decay (pointillé + sablier, muted red si urgent) / objectif crew (pin + halo) / avant-poste (marker) / route ouverte (ligne chartreuse). HUD haut : `SAISON 0 · J-12 / Paris Est · Zone contestée / Crew rank #8`. Bandeau bas au-dessus du bouton : objectif crew + pts possibles. **Mini war feed flottant** (3 events glissants). Layers activables (Decay/Routes/Crew/Rivals/Missions) — défaut simple.

## 5. Course Live + Résultat (doc §9-§10 — priorité 3, moment dopamine)
`course-live` : trace qui se dessine, hexes qui s'allument, compteurs (distance/temps/allure/hexes/pts), GPS & Motion Trust, objectif crew, états (GPS faible, zone privée, segment exclu, run groupé, contesté). Démo simulée en web. `course-result` : séquence animée 7 étapes — validée/Verified → +hexes (compteur) → zone modifiée (before/after) → contribution crew → bonus perf → badge unlock (full-screen reveal, glow par tier) → share card. Haptic par étape.

## 6. Crew HQ (doc §11-§14 — priorité 4)
Header base : grand blason animé + frame ligue + niveau + jauge XP + badge War Ready + rank local + membres actifs + coffre hebdo %. **Onglets internes : Base / Membres / Coffre / Perks / Chat** (fini le scroll infini). Base = 4 cartes courtes + CTA. Perks = cartes reward débloquées + « PROCHAIN PERK — XP restants ». Membres = `MemberCard` (rôle iconé/dispo guerre/contribution/dernière action ; actions assigner/inviter/promouvoir). Feed = **War Log** (`WarEventCard` + réactions GRYD + badge LIVE). Chat = messages actionnables (sortie défense → Je participe/Peut-être/Indispo ; ping zone → Ouvrir carte).

## 7. League (doc §17 — priorité 6) + anti-shame
Header saison/semaine + PARIS LEAGUE ; **podium** top 3 ; **ligne TOI sticky** (`#8 KORO · 342 pts du #7 · ≈ 35 hexes neutres peuvent suffire`) ; récompenses Top 10 (badge, frame, coffre saison) ; onglets Joueurs/Crews/Ville/France/Pionniers/Performance. Anti-shame AMENDEMENT-07 : formulations positives uniquement, jamais « dernier/lent », mode discret respecté.

## 8. Player Card (doc §18 — priorité 5) + Badges (doc §23 — priorité 6) + Amis (doc §19)
Profil = Player Card : `PlayerAvatarFrame` + @handle + titre (« Tenace du 19ᵉ ») + crew + niveau/XP jauge + Score Forme + série + contribution crew + **BADGES RARES en GRAND** + territoire + Partager. Badges : header compte réel (`53 / 200 · Tier max`), filtres familles existants, « Proches du déblocage », **BadgeCards plus grandes** + détail au tap (condition + récompense/titre). Amis : onglets Amis/Demandes/Suggestions/QR/Recherche ; `FriendCard` (dispo/runs semaine ; actions Inviter sortie/Inviter crew) ; **Bloquer relégué au menu « … »**.

## 9. Arsenal (doc §20 — priorité 4b)
Header : `ARSENAL · Saison 0 · Gear` + soldes Éclats/Foulées/Club. Sections : Featured / Pass Saison / Objets capés / Skins territoire / Skins trace / Crew gear / Packs. `ArsenalItemCard` complet + animation d'achat (reveal + solde qui descend). Bannière permanente : **« Le territoire ne s'achète pas. Le style et le confort, si. »** Interdits inchangés (hexes/km/victoire/classement achetables = JAMAIS).

## 10. War Room (doc §15), Verify Hub (§21), Discovery (§16), Support (§22)
War Room : sections À faire / Offensives (`WarRoomObjectiveCard` : objectif, progression, temps restant, participants, récompense) / Défense urgente (hexes qui expirent + Assigner) / Routes / Scout Reports / Coffre / Historique. Sources → **GRYD VERIFY HUB** (« Connecte tes sources. GRYD vérifie l'effort réel. ») avec `SourceTrustCard` (statut/trust/rôle/capture vs stats). Crew Discovery : `CrewDiscoveryCard` (blason, ligue, tags War/Defense/Competitive, places restantes, rôles recherchés). Support : sobre, cards courtes, ton calme (pas gaming).

## 11. Copywriting (doc §27)
Court, au tap pour le détail. Vocabulaire FR de jeu : Prêt guerre, Offensive, Défense, Capture, Rang gagné, Coffre, Avantage, Ligue, Avant-poste, Route ouverte, Zone tenue, XP crew.

## 12. Contraintes transverses
Demo data locale déterministe (mulberry32 existant) ; zéro position live publique ; privacy AMENDEMENT-07 respectée ; reduce motion ; haptics optionnels ; TS strict ; typecheck 4 workspaces + `expo export --platform web` + tests Deno VERTS ; pas de nouvelle dépendance hors `expo-haptics`. Icônes : UNIQUEMENT dans `packages/shared/src/icons.ts` (ajout centralisé), rendu via `src/ui/Icon.tsx`.
