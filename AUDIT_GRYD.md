# AUDIT_GRYD — état réel du dépôt face à la spec produit v1.0

**Daté du 26/07/2026.** Référence : `docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md` (3419 lignes),
déclarée **source de vérité unique** par le fondateur.

Produit par 13 agents spécialisés en lecture seule (moteur, tracking, backend, 7 sections d'écrans,
design system, confidentialité, i18n/tests). **Chaque constat est cité `fichier:ligne`** — rien ici n'est
une impression. Ce qui n'est pas prouvé par le code est écrit « absent », jamais « probablement là ».

---

## 0. Le verdict en cinq lignes

Le dépôt est **beaucoup plus bâti que vide** — un moteur territorial pur de 8 052 lignes, testé, sans I/O,
est la meilleure fondation du projet. Mais il **implémente un autre jeu que celui de la spec** sur trois axes
structurels : la propriété est **hexagonale** (H3) là où la spec veut des polygones, le vol est **instantané**
là où la spec veut une contestation de 18 h, et le classement est en **points** là où la spec veut de la
**surface**. Ces trois écarts sont la vraie charge de travail ; le reste est du rattrapage d'écrans.

**Et une faute doit être corrigée avant tout le reste** — elle est détaillée en §1.

---

## 1. 🔴 Le mensonge actif : « GRYD Verify examine cette course »

**C'est le seul point de cet audit qui ne peut pas attendre un lot.**

`apps/mobile/src/features/run/result.ts:303-309` annonce au joueur qu'une revue anti-triche est en cours.
**Cette revue n'existe pas.** `runs.status` est contraint à `valid|partial|rejected|flagged`
(`supabase/migrations/0002_schema.sql:105`) et `flagged` est un état **terminal** : aucune table de revue,
aucune file, aucun opérateur, aucun endpoint d'appel, aucune notification de décision. Une course marquée
`flagged` y reste pour toujours, pendant que l'écran promet un examen.

C'est une violation frontale de la constitution du projet (« l'app ne ment jamais ») et de §11.4 de la spec.
**Correctif immédiat, indépendant de toute refonte** : soit on construit la revue (lot 9), soit la copie dit
le fait — « capture non créditée : cohérence insuffisante » — sans promettre un examen. **Je prends la
seconde voie tout de suite, la première dans son lot.**

---

## 2. Matrice des 80 écrans E00-E79

| Statut | Nombre | Sens |
|---|---:|---|
| conforme | **4** | fait et fidèle |
| partiel | **33** | existe, incomplet |
| existant_non_conforme | **13** | existe mais contredit la spec |
| absent | **28** | rien dans le dépôt |
| à supprimer | **2** | existe, la spec n'en veut plus |

**Priorités** (§21 de la spec) : P0 **11** · P1 **50** · P2 **19**.

> Quatre écrans seulement sont conformes : E01 promesse, E21 activité Bike, E24 GPS faible, E64 badge débloqué.

| ID | Écran | Statut | P | Eff. | Porté par | Écart principal |
|---|---|---|---|---|---|---|
| **E00** | Splash / restauration de session | partiel | P0 | L | `apps/mobile/app/(tabs)/_layout.tsx:60-79 ; apps/mobi` | Pas de logo GRYD centré pendant la restauration (fond noir muet uniquement, (tabs)/_layout.tsx:64/71/78) ; aucun indicateur de chargement passé 600 ms |
| **E01** | Promesse visuelle | conforme | P2 | S | `apps/mobile/src/features/onboarding/E01Hero.tsx ; ap` | Titre 'COURS. PRENDS TA VILLE.' et CTA 'CONTINUER' identiques au mot près à la spec ; layout (photo plein écran, voile bas, 'Passer' 44px en haut-droi |
| **E02** | Onboarding : fermer la boucle | absent | P1 | M | `—` | Aucun écran distinct 'FERME LA BOUCLE' (titre/corps de la spec absents du catalogue). L'animation boucle→zone existe (RivalryDemo, apps/mobile/src/fea |
| **E03** | Onboarding : rivalité | partiel | P1 | S | `apps/mobile/app/onboarding/index.tsx:391-406 (step '` | Le concept ('ta zone peut être reprise') est présent mais avec une copie différente de la spec ('ON PEUT TE LA REPRENDRE.' / 'Vos zones restent en jeu |
| **E04** | Onboarding : crew | a_supprimer | P1 | M | `— (docblock apps/mobile/app/onboarding/index.tsx:41-` | Le repo a EXPLICITEMENT retiré cet écran ('rendue à l'onglet Crew permanent', content.ts) : il ne subsiste qu'une phrase dans la tagline de rivalry (' |
| **E05** | Pré-permission de localisation | existant_non_conforme | P1 | M | `apps/mobile/app/onboarding/index.tsx:748-913 (CitySt` | Aucun écran dédié 'VOTRE POSITION CRÉE LE TRACÉ' avec les 3 garanties de confidentialité (usage pendant l'activité seulement / jamais visible en direc |
| **E06** | Authentification | existant_non_conforme | P0 | M | `apps/mobile/app/(auth)/sign-in.tsx (611 lignes) + si` | Pas de route `/auth` dédiée : l'écran vit en `/sign-in`, atteint seulement via 'J'ai déjà un compte' ou en sortie de compte non requis. Un DEUXIÈME je |
| **E07** | Connexion par e-mail | existant_non_conforme | P1 | S | `apps/mobile/app/(auth)/sign-in.tsx:355-401 (états em` | Pas de route `/auth/email` séparée : la saisie e-mail est un état interne du même écran que E06 (pas d'écran à part avec son propre retour/titre comme |
| **E08** | Création du profil minimal | partiel | P1 | M | `apps/mobile/app/onboarding/index.tsx:962-1126 (Accou` | Champ 'nom d'affichage' présent (optionnel, conforme). Champ 'ville de jeu' existe mais sur un ÉCRAN SÉPARÉ et ANTÉRIEUR (CityStep), pas sur le même é |
| **E09** | Choix d'activité initial | absent | P1 | S | `— (composants existants mais hors onboarding : apps/` | `ONBOARDING_STEPS` (content.ts:78-86) ne comporte que mechanic/rivalry/city/account : aucune étape 'choix d'activité initial' Run/Bike. Le choix Run/B |
| **E10** | Permissions utiles | absent | P2 | S | `— (mécaniques dispersées : apps/mobile/src/features/` | Aucun écran avec les 2 cartes attendues ('mouvements et activité physique' / 'notifications tactiques') et un CTA 'CONTINUER' qui tolère un refus seco |
| **E11** | Carte principale | partiel | P0 | L | `apps/mobile/app/(tabs)/index.tsx + apps/mobile/src/f` | 1) Header : avatar 40px + pill ville conformes (index.tsx:179-230), mais la cloche exigée par la spec (droite du header) n'existe pas — commentée comm |
| **E12** | Couches et filtres de carte | existant_non_conforme | P1 | M | `apps/mobile/src/features/map/BattleMapOverlays.tsx` | Le format (feuille basse, jamais plein écran) est respecté : `LayerMenu` (BattleMapOverlays.tsx:1693-1930+) s'ouvre via le FAB Calques. Mais la MÉCANI |
| **E13** | Recherche de lieu | absent | P1 | M | `—` | Aucune route, aucun composant, aucun champ de recherche de lieu n'existe dans le dépôt (grep exhaustif sur `search`/`recherche` dans apps/mobile/app e |
| **E14** | Détail d'un territoire | existant_non_conforme | P0 | M | `apps/mobile/src/features/map/zoneSelection.ts + Batt` | Le mécanisme tap-zone → sheet basse existe et fonctionne (onMapPress → selectedZoneId → sheet, MapScreen.tsx:463-469). Mais le modèle de données ne po |
| **E15** | Carte des zones d'un rival | absent | P1 | L | `apps/mobile/app/profil-rival/[handle].tsx` | Aucune route ni écran ne correspond à « carte plein écran des territoires publics généralisés d'un rival ». Le seul écran voisin, `profil-rival/[handl |
| **E16** | Mission recommandée | absent | P1 | L | `apps/mobile/app/(tabs)/warroom.tsx + apps/mobile/src` | Aucune route dédiée `/map/missions/:missionId` avec carte + objectif + RAISON + métriques (distance/durée/surface potentielle) + difficulté + CTA « PR |
| **E17** | Préparation d'activité | absent | P1 | L | `apps/mobile/src/features/map/MissionBriefingSheet.ts` | Aucun écran « un seul écran, objectif → activité » avec mini-carte + trois états techniques (GPS/batterie/synchronisation) + options repliées (audio/p |
| **E18** | Planificateur de boucle | partiel | P2 | S | `apps/mobile/app/route-planner.tsx` | Le cœur est conforme : carte plein écran avec tracé réel, un `Segmented` de 3 formats rapides (court/moyen/long, docblock ligne 13 « FORMATS — un Segm |
| **E19** | Acquisition GPS / prêt | existant_non_conforme | P0 | L | `apps/mobile/src/features/run/gps/RunPreflight.tsx (+` | La spec exige un anneau de précision avec 3 seuils chiffrés (vert ≤15 m / orange 16-30 m / rouge >30 m), un bouton « DÉMARRER MAINTENANT » qui n'appar |
| **E20** | Activité Run active | partiel | P1 | S | `apps/mobile/src/features/run/gps/RealCourseLive.tsx` | La plupart des éléments de la planche sont là et fidèles : temps/distance/allure en haut, statut GPS (SignalBars + GpsSignalPill), trace active mesuré |
| **E21** | Activité Bike active | conforme | P2 | S | `apps/mobile/src/features/run/gps/RealCourseLive.tsx ` | Vitesse à la place de l'allure : liveRateDisplay(activity,...) bascule bien pace↔vitesse par discipline. Seuils anti-triche Bike réels et distincts de |
| **E22** | Défense active | absent | P0 | XL | `apps/mobile/src/features/run/intention.ts (l.13-16, ` | La spec veut une variante live de E20/E21 avec : contour de la zone contestée dessiné sur la carte pendant la course, jauge de couverture de défense e |
| **E23** | Pause | partiel | P0 | M | `apps/mobile/src/features/run/gps/RealCourseLive.tsx ` | La spec veut un OVERLAY plein (pas de navigation) avec 3 actions : reprendre / terminer / annuler l'activité (avertissement trace locale supprimée). L |
| **E24** | GPS faible / activité en récupération | conforme | P1 | S | `apps/mobile/src/features/run/gps/GpsStatusUI.tsx + l` | Les 5 cas de la spec sont couverts par du code réel et testé : GPS faible → GpsSignalPill (continue à enregistrer, ambre jamais rouge) ; permission ré |
| **E25** | Sécurité | absent | P1 | L | `apps/mobile/src/i18n/catalog/reglages.ts (l.1895-191` | La spec veut un panneau accessible PENDANT l'activité depuis une icône discrète, avec : partager la sortie avec un contact, appeler les secours selon  |
| **E26** | Fin d'activité | absent | P1 | M | `apps/mobile/src/features/run/gps/RealCourseLive.tsx ` | La spec veut une feuille basse intermédiaire (temps, distance, objectif détecté, bouton « TERMINER ET ANALYSER », bouton « REPRENDRE ») avant que la f |
| **E27** | Analyse et synchronisation | absent | P2 | M | `apps/mobile/src/features/run/gps/useRealRunCore.ts (` | La spec veut un écran carte+trace avec 3 étapes visibles et progressives (sécurisation / analyse de boucle / validation territoriale), une progression |
| **E28** | Activité en revue anti-triche | partiel | P1 | M | `apps/mobile/app/course-result.tsx (l.836-974, stats.` | Le texte-pivot de la spec (« une incohérence doit être vérifiée avant le classement ») est incarné avec un wording différent mais fidèle en ton et en  |
| **E29** | Résultat : conquête | existant_non_conforme | P0 | M | `apps/mobile/app/course-result.tsx (ConquestResultScr` | Route réelle /course-result avec query params, pas /result/:activityId. Le hero carte rend une union de cellules H3 (ResultHeroMap / cellToBoundary de |
| **E30** | Résultat : reprise | absent | P1 | L | `—` | Aucune variante distincte n'existe : qu'une zone soit prise sur du neutre ou reprise à un rival, le titre reste TERRITOIRE ÉTENDU — la distinction cap |
| **E31** | Résultat : défense | existant_non_conforme | P0 | M | `apps/mobile/app/course-result.tsx (branche heroDefen` | Le titre ZONE DÉFENDUE dépend de l'intention déclarée AVANT la course, pas du verdict serveur (hexes.defended>0) — un joueur en intention conquête/lib |
| **E32** | Résultat : sortie libre | partiel | P1 | S | `apps/mobile/app/course-result.tsx (branche effortHer` | Couvre boucle non fermée (avec mètres manquants réels + échéance) et une variante générique aucune zone, avec un ton anti-échec soigné (l'effort compt |
| **E33** | Résultat : contribution crew | absent | P1 | L | `—` | Les deux écrans de frontière crew ont été explicitement retirés le 21/07/2026 (ils lisaient une frontière fabriquée). Il ne reste qu'une ligne discrèt |
| **E34** | Résultat partiellement valide | absent | P1 | L | `apps/mobile/app/course-result.tsx (verified = status` | Le statut serveur partial existe dans le moteur (segment exclu) mais l'écran de résultat le fusionne avec valid dans un seul booléen verified — un seu |
| **E35** | Compositeur de partage | partiel | P1 | L | `apps/mobile/app/partage.tsx ; features/share/narrati` | Conforme sur l'essentiel : le moteur choisit le récit, l'utilisateur change le style (dominantNarrative, ordre capture>reprise>défense>boucle>crew>cla |
| **E36** | Partage personnalisé | absent | P2 | M | `— (fonctionnalité diffusée inline dans apps/mobile/a` | Pas d'éditeur séparé accessible via un lien Personnaliser (inexistant). Pas de CTA APPLIQUER — les segmented Format/Style s'appliquent en temps réel s |
| **E37** | Partage terminé | partiel | P2 | S | `apps/mobile/src/features/share/shareOutcome.ts ; ShareDonePanel.tsx ; app/partage.tsx:869` | FAIT le 27/07/2026 : le retour de fin n'est plus un toast muet. `shareOutcome()` (pur, testé) choisit la surface SELON LE CANAL comme la spec — copie → toast, canal externe → panneau `ShareDonePanel` avec « retour au résultat » (CTA), « copier le lien » et « partager ailleurs ». Le titre n'affirme un envoi que si la plateforme l'a rapporté (iOS Share.share, Web Share API) ; `expo-sharing` et Android disent « Média remis au partage ». Une annulation n'ouvre rien. RESTE : « voir le profil public » n'est pas peint — aucune route de profil public n'existe (`PUBLIC_PROFILE_ROUTE_EXISTS = false`, O1) ; et la remise par `Linking.openURL` (pastille WhatsApp web) n'ouvre pas le panneau.
| **E38** | Crew : état sans crew | existant_non_conforme | P1 | M | `apps/mobile/src/features/crew/RealCrewScreen.tsx:130` | La spec veut un flux DÉCOUVERTE-FIRST : CTA primaire chartreuse « DÉCOUVRIR LES CREWS », secondaire « CRÉER UN CREW », logique « proposer d'abord les  |
| **E39** | Découverte des crews | absent | P1 | XL | `apps/mobile/app/crew-discovery.tsx (redirection arch` | Aucune recherche, aucun filtre (proches/amis/ouverts), aucune liste de crews, aucun classement par pertinence (ville>amis>activité>capacité>compat). L |
| **E40** | Profil public d'un crew | absent | P1 | L | `apps/mobile/app/crew-public.tsx (redirection archivé` | Aucune fiche publique de crew réelle. Le fichier lui-même (lignes 19-24) note qu'il n'a AUCUN segment dynamique (`crew-public.tsx`, pas `crew-public/[ |
| **E41** | Création d'un crew | partiel | P1 | L | `apps/mobile/src/features/crew/RealCrewScreen.tsx:116` | Champs réels : nom (TextInput, ligne 1171-1187) + ville (CityField, ligne 1195, via `city_zones` réelles, jamais de ville devinée). MANQUANT : pas de  |
| **E42** | Crew nouveau sans territoire | partiel | P2 | S | `apps/mobile/src/features/crew/CrewStarterPlan.tsx` | Bonne fidélité générale : identité crew (hero au-dessus), CTA chartreuse unique « LANCER LA PREMIÈRE MISSION » (firstMissionCta, ligne 79) menant à la |
| **E43** | Crew actif : aperçu | partiel | P1 | M | `apps/mobile/src/features/crew/RealCrewScreen.tsx:755` | Structure globalement fidèle : hero identité (photo/bannière ABSENTE faute de colonne/bucket, CrewHero.tsx:8-15), segment 3 vues Aperçu/Carte/Membres  |
| **E44** | Carte du crew | partiel | P1 | L | `apps/mobile/src/features/crew/RealCrewScreen.tsx:995` | N'est PAS une carte : c'est un bloc texte (compte de zones tenues + rang ville, RealCrewScreen.tsx:999-1017) + une bande horizontale de PASTILLES NOMM |
| **E45** | Mission crew | partiel | P1 | L | `apps/mobile/src/features/crew/RealCrewScreen.tsx:841` | Pas d'écran dédié : la mission vit comme une card compacte dans la vue Aperçu (« Notre priorité »). Contenu réel : objectif (phrase dérivée du moteur  |
| **E46** | Membres et rôles | partiel | P1 | L | `apps/mobile/src/features/crew/RealCrewScreen.tsx:106` | Ligne membre réelle : nom (avec état bloqué géré proprement, ligne 1088-1098), rôle si connu du catalogue (`roleLabelEntry`, ligne 1105, sinon rien pl |
| **E47** | Actions sur un membre | partiel | P1 | XL | `apps/mobile/src/features/crew/PlayerModerationSheet.` | 2 des 6 actions demandées existent et sont bien construites : signaler (avec motif, ligne 91-129, écrit dans `content_reports`) et bloquer/débloquer ( |
| **E48** | Activité et annonces crew | existant_non_conforme | P1 | XL | `apps/mobile/src/features/crew/RealCrewScreen.tsx:921` | Le repo a un « fil de signaux » (A-44) au lieu du fil d'activité structuré de la spec. C'est un substitut voisin mais différent : vocabulaire FERMÉ de |
| **E49** | Créer une sortie crew | absent | P1 | XL | `apps/mobile/src/features/crew/RealCrewScreen.tsx:682` | Aucun écran de création de sortie crew avec date/heure, point de rendez-vous, activité Run/Bike, objectif/zone, places facultatives, et confidentialit |
| **E50** | Statistiques du crew | absent | P2 | L | `—` | Aucun écran de statistiques crew dédié. Les seules données qui s'en rapprochent sont dispersées ailleurs dans le même écran : nombre de zones tenues + |
| **E51** | Paramètres du crew | absent | P1 | XL | `apps/mobile/app/crew-edit.tsx (redirection archivée ` | Le fichier dédié est une redirection morte (`<Redirect href="/crew"/>`) — son propre docblock (lignes 16-26) liste le manque : « renommer/décrire son  |
| **E52** | Invitation crew | partiel | P2 | M | `apps/mobile/src/features/crew/CrewInviteQRScreen.tsx` | Bien construit et honnête sur ses 2 canaux principaux : lien réel (`buildInviteLink`, https://gryd.run/c/<code>, ligne 17) + QR réel généré depuis `my |
| **E53** | Classement joueurs | partiel | P1 | M | `apps/mobile/app/(tabs)/classement.tsx` | Pas de route /leaderboard dédiée : fusionné avec E54/E59/E60 dans l'onglet Saison. Sélecteur de période Semaine/Saison ABSENT (season_scores cumulatif |
| **E54** | Classement crews | absent | P1 | L | `apps/mobile/app/(tabs)/classement.tsx (tab "Crews", ` | L'onglet existe mais n'a AUCUNE source serveur : la matview crew_leaderboard n'est jamais rafraîchie (commenté L95-96). L'écran dit honnêtement "pas e |
| **E55** | Profil personnel | partiel | P2 | S | `apps/mobile/app/(tabs)/profil.tsx` | Très haute fidélité à la composition planche (héros+avatar niveau, nom/handle/crew/ville/rang, EXACTEMENT 4 métriques = surface/zones/défenses/distanc |
| **E56** | Profil public / rival | absent | P1 | XL | `apps/mobile/app/profil-rival/[handle].tsx` | Écran honnête mais totalement bloqué par O1 : identity:'none' codé en dur (L54), rend systématiquement l'état "profil indisponible" (plaque orange vid |
| **E57** | Suivis et amis | absent | P1 | XL | `apps/mobile/app/amis.tsx` | Ancienne UI à 5 onglets avec faux amis/confirmations mensongères supprimée le 21/07/2026 (bonne décision). Aujourd'hui : aucune table d'amitié, aucun  |
| **E58** | Défi | existant_non_conforme | P1 | L | `apps/mobile/app/challenges/index.tsx + [id].tsx ; CT` | Le "Défier" au post-run est un CTA dormant qui, même actif, redirige vers re-courir un secteur sur la carte — aucun objet défi n'est créé (commenté TO |
| **E59** | Saison | partiel | P0 | L | `apps/mobile/app/(tabs)/classement.tsx (bloc bas d'éc` | Pas de route /season dédiée. Titre+décompte réel : oui (season_current + seasonProgress). Carte de rang : oui mais remplacée par les paliers Season Ra |
| **E60** | Passage de rang | a_supprimer | P1 | M | `apps/mobile/src/ui/game/RankUpCard.tsx ; apps/mobile` | Aucun écran plein écran de passage de rang n'est monté nulle part (RankUpCard n'est importé par AUCUN écran, seulement ré-exporté). Le seul artefact l |
| **E61** | Fin de saison | absent | P1 | L | `— (aucun écran client ; logique serveur dans supabas` | Aucun écran de récapitulatif de fin de saison (rang final, bilan, récompenses, prochaine saison, règles de reset, CTA RÉCUPÉRER) côté client. season_c |
| **E62** | Collection de badges | partiel | P2 | M | `apps/mobile/app/badges.tsx` | Compteur obtenu/total réel avec 4 états honnêtes, grille 3 colonnes, rareté par matériau (jamais couleur criarde) : conforme et même exemplaire. Catég |
| **E63** | Détail d'un badge | partiel | P2 | S | `apps/mobile/app/badges.tsx (composant BadgeSheet, L2` | Visuel, nom, description, rareté, date (jamais affirmée sans source), progression et partage-si-obtenu : tous présents et honnêtes. Le CTA "ajouter au |
| **E64** | Badge débloqué | conforme | P1 | S | `apps/mobile/src/features/badges/BadgeUnlockMoment.ts` | Correspondance quasi parfaite à la spec : plein écran immersif, visuel grand avec glow limité (halo radial non animé si Reduce Motion), nom, condition |
| **E65** | Statistiques personnelles | partiel | P1 | S | `apps/mobile/app/performance.tsx` | Route réelle = /performance (expo-router), pas /profile/stats — navigation différente mais fonctionnellement équivalente. Les 3 blocs (volume l.357-38 |
| **E66** | Analytics territoriales Premium | absent | P2 | XL | `—` | Aucun composant heatmap, temps de contrôle par zone, gains/pertes 90 jours, zone la plus défendue ou frontières à surveiller n'existe dans le dépôt (g |
| **E67** | Historique des activités | partiel | P1 | M | `apps/mobile/app/historique.tsx + apps/mobile/src/fea` | Route réelle /historique (pas /profile/history). Header : titre + commutateur Run/Bike (l.174-191) + résumé sorties/km/captures/défenses (SheetMetrics |
| **E68** | Détail historique | absent | P1 | L | `apps/mobile/app/course/[id].tsx` | L'écran existe comme fichier mais son propre en-tête de code le dit noir sur blanc (l.4-9, l.40-47) : « IL N'EXISTE AUCUNE LECTURE D'UNE COURSE PAR ID |
| **E69** | Flux d'activité | partiel | P1 | L | `apps/mobile/app/activite.tsx` | Route réelle /activite (pas /map/activity-feed) et l'accès prévu (cloche du header carte) est explicitement désactivé (l.9-13). Les 4 groupes fixes (à |
| **E70** | Zone attaquée | partiel | P0 | S | `apps/mobile/src/features/map/DefenseZoneSheet.tsx` | Très fidèle : carte en haut + sheet basse (composant embarqué dans MapScreen), kicker/titre (« VOTRE ZONE EST CONTESTÉE » via C.defenseKicker), nom de |
| **E71** | Réglages de notifications | existant_non_conforme | P1 | L | `apps/mobile/app/parametres/[section].tsx (bloc id===` | La taxonomie entière diverge de la spec. Spec : 5 catégories (défense / crew / rivalité / progression / produit) avec des défauts distincts par catégo |
| **E72** | Boutique | partiel | P2 | XL | `apps/mobile/app/arsenal.tsx` | Route réelle /arsenal (pas /shop), et la route est masquée hors flag `flags.arsenal` (D8, l.146). Layout conforme : hero saisonnier, catégories horizo |
| **E73** | Détail produit | partiel | P2 | M | `apps/mobile/app/arsenal.tsx (fonction ItemDetail, l.` | Aperçu grand (ArsenalPreview 208px, l.558), contexte d'utilisation (ExplanationLine ×3, l.571-575), prix affiché comme info (l.628-633), propriété (l. |
| **E74** | Premium | partiel | P2 | L | `apps/mobile/app/arsenal.tsx (fonction PremiumBlock, ` | Pas d'écran dédié /premium : le bloc Premium est un paywall EMBARQUÉ en bas de la Boutique, pas une route séparée. Contenu conforme pour l'essentiel : |
| **E75** | Gestion d'abonnement et achats | absent | P2 | L | `—` | Aucune route, aucun composant « statut abonnement / prochaine échéance / gérer dans le store / restaurer / historique / support » dans tout `apps/mobi |
| **E76** | Modifier le profil | partiel | P1 | S | `apps/mobile/app/profil-edit.tsx` | Aperçu vivant (l.375-402), nom (l.404-424), handle avec disponibilité en direct (l.428-461), ville via sélecteur (l.465-481), bio (l.484-501) — tous p |
| **E77** | Confidentialité et sécurité | partiel | P1 | M | `apps/mobile/app/confidentialite.tsx` | Bloc confiance EXACT (l.363, C.privTrustBanner = « Votre position en direct n'est jamais visible par les autres joueurs »). Visibilité : profil visibl |
| **E78** | Connexions et appareils | existant_non_conforme | P2 | L | `apps/mobile/app/sources.tsx + apps/mobile/src/featur` | La spec attend Apple Health, Google Health Connect, Strava, Garmin, Whoop et une entrée montre générique, avec 5 états (connecté/expiré/synchronisatio |
| **E79** | Compte, aide et légal | partiel | P1 | M | `apps/mobile/app/parametres.tsx + apps/mobile/src/fea` | La spec décrit UN écran avec 10 sections. Le dépôt éclate ce contenu sur un hub de navigation (`parametres.tsx`, 3 groupes) + plusieurs sous-pages. Co |
---

## 3. Les trois écarts structurels

Ils ne sont pas des « manques » : le dépôt implémente un modèle **cohérent et différent**. On ne les comble
pas en ajoutant du code, on les migre.

### 3.1 — La propriété est hexagonale, la spec la veut polygonale

| | Dépôt | Spec |
|---|---|---|
| Unité de propriété | 1 cellule **H3 res 10** (~15 047 m²) | polygone issu de la trace |
| Stockage | `hex_claims` PK `(h3index, activity)` | `territories` (geometry + généralisée) |
| Rendu | **union de cellules** lissée Chaikin → bords hexagonaux | contour réel |
| Plancher d'aire | 1 cellule ≈ **15 047 m²** | `MIN_POLYGON_AREA` = **5 000 m²** |
| Économie | `POINTS_BASE_PER_ZONE=10`/cellule, `MAX_CLAIMS_PER_DAY=1200` hexes | surface en m² |

**Ce qui se garde tel quel** — et c'est beaucoup : `detectLoop` produit **déjà un vrai polygone lat/lng**
(`hexing.ts:231-239`), avec fermeture par tolérance ET par auto-intersection ; `loopShapeVerdict` (compacité,
largeur) ; `frontierCoverage` (défense par couverture, distance point→segment) ; `cleanTrace`/`smoothTrace`/
`detectPauses` ; la frontière crew collective `boundary.ts` ; le decay. **Tout cela est déjà géométrique et
indépendant de H3.** Seules la conversion finale en cellules, le stockage et le rendu sont hexagonaux.

**Fait qui corrige mon arbitrage initial** : PostGIS est installé (`0001_extensions.sql:8`) mais **n'a aucune
colonne `geometry` dans les 73 migrations** — toute la géo persistée est du GeoJSON `jsonb` évalué en
TypeScript (`pointInGeoJson`, ray-casting). Introduire PostGIS est donc un *ajout*, pas une reprise.

### 3.2 — Le vol est instantané, la spec veut une contestation de 18 h

`claim_hexes` fait `on conflict do update set owner_user_id = excluded.owner_user_id`
(`0070_activity_dimension.sql:610`) : **le territoire change de main dans la transaction**. Le dépôt protège
autrement — lock 24 h anti ping-pong, bouclier 48 h, protection fraîche 6 h, nouveau joueur 14 j — un modèle
cohérent, documenté (AMENDEMENT-23 §D), et **incompatible** avec `CONTEST_INTERSECTION_THRESHOLD 60 %` +
`BASE_DEFENSE_WINDOW 18 h` + fortification 0→3.

**Ne pas empiler les deux** : ce serait injouable. La spec l'emporte ; lock/bouclier/fraîcheur deviennent des
cas particuliers de **fortification**, et le decay reste orthogonal.

### 3.3 — Le classement est en points, la spec le veut en surface

`season_scores` stocke des **points entiers** ; §10.1 veut la **surface contrôlée validée**, avec pour
tie-breakers surface → défenses réussies → surface conquise → timestamp.

**Tranché : les deux axes coexistent, séparés.** SURFACE = classement (m², dérivée de la géométrie serveur).
POINTS/XP = progression et récompenses — §10.5 dit explicitement que l'XP « ne modifie jamais la puissance
territoriale ». Aucun des deux ne se sacrifie.

---

## 4. Ce qui est absent et que l'on croyait acquis

| Sujet | Réalité vérifiée |
|---|---|
| **Trace GPS serveur** | jamais persistée. `runs.polyline_masked` déclarée (`0002:108`) mais **écrite par aucun code**, aucun bucket Storage. Donc : pas de replay, pas d'« données concernées » pour un appel, pas de rendu de partage serveur. |
| **Session d'activité** | inexistante. `ingest_run` est un **POST unique en fin de course** : aucun `/activities`, `/points`, `/pause`, `/resume`, `/finish`. |
| **Propriété crew** | **impossible** : `hex_claims.owner_user_id` est `NOT NULL` et une décision récente (`0041:30-32`) dit « contexte d'affichage uniquement, jamais de propriété ». La spec §8.4 veut `ownerType: CREW`. |
| **File d'upload** | **un seul slot**, documenté comme tel (`pendingUpload.ts:11-12`). Deux courses hors ligne = la première est perdue. |
| **Reprise après crash** | la donnée **survit**, mais la reprise **n'est jamais proposée au relancement**. |
| **Écouteur réseau** | aucun. `netinfo` non utilisé : rien ne déclenche le rejeu à la reconnexion. |
| **Tests E2E** | **aucune infrastructure** (ni Playwright, ni Detox, ni Maestro). Les 10 scénarios §25 ont 0 couverture. |
| **Publication différée** | absente. `hex_claims` est **lisible par tout joueur connecté instantanément** (`0003_rls.sql:114-116`) — le point de vie privée le plus sérieux du backend. |
| **Zones protégées (domicile)** | aucun écran pour déclarer une adresse. |
| **Visibilité du profil** | réglage **100 % local** (AsyncStorage), sans miroir serveur : il ne protège rien. |
| **Anti-triche** | **5 signaux réels** sur les 17 listés (§11.1). |
| **Analytics** | noms **totalement différents** de §18.1, et une partie des events n'est **jamais émise**. |
---

## 5. Ce qui est solide et qu'il ne faut pas toucher

- **Le moteur pur** (`packages/engine`, 8 052 lignes, 67 fichiers de test) : un seul point d'entrée
  `runTerritoryEngine`, aucune horloge interne, aucun accès DB, I/O injecté. C'est la fondation du produit.
- **Le nettoyage GPS** : rejet accuracy/téléport/vitesse, ré-ancrage, lissage médian pondéré, détection de
  pauses, score de confiance. Sérieux et testé.
- **L'ordre de décision des claims** (`claims.ts:198-390`), gelé et testé.
- **La frontière crew collective** (`boundary.ts`) avec répartition au prorata et résidu d'arrondi maîtrisé.
- **L'anti-pay-to-win** : contrainte SQL + typage `purchasable:false` sur les objets fonctionnels
  (`0065`, `0067`). *Un seul reliquat à trancher : `crew_boost_24` garde un prix.*
- **La déduplication de notifications** de vol (`steal_push_queue` + agrégation + cooldown).
- **L'i18n à parité typée** sur 5 langues.

---

## 6. Points où la constitution du projet PRIME sur la spec

La spec §0 admet la primauté d'une « contrainte démontrée ». Trois cas :

1. **Couleur de territoire crew** — §3.9 veut « couleur crew à 16-20 % ». `GRYD_REGLES_NON_NEGOCIABLES.md` §C
   impose des **couleurs par RÔLE** et interdit la couleur par crew, précisément pour rester lisible à 200 k
   joueurs. **La constitution gagne** ; §3.9 est une formulation à corriger dans la spec.
2. **Positions d'alliés en course** — §E20 les autorise « en partage crew volontaire et approximation ». Le
   dépôt a supprimé toute position live d'autrui et l'a inscrit en règle. **On n'ouvre pas cette porte dans
   ce chantier** : la spec elle-même la rend optionnelle.
3. **Noms d'événements analytics** — §18.1 semble imposer un renommage ; `events.ts:2` et le registre (C-4)
   ont déjà tranché « ne pas renommer, produire une table de correspondance ». **On produit la table**, on ne
   renomme pas — un renommage casse l'historique de mesure.
---

## 7. Dette et risques (classés par ce qu'ils coûtent si on les ignore)

| # | Risque | Conséquence si ignoré | Parade |
|---|---|---|---|
| R1 | **Mensonge anti-triche** (§1) | Le joueur attend une décision qui ne viendra jamais. Faute constitutionnelle. | Correctif de copie immédiat, revue réelle au lot 9. |
| R2 | **Migration H3 → polygone** | Tout le lot territorial est bloqué ; un demi-chemin donnerait une carte qui ment sur la propriété. | 4 étapes réversibles, double écriture, aucune destruction avant la dernière. |
| R3 | **`hex_claims` lisible par tous** | Reconstruction possible des habitudes d'un joueur : contredit §12.3 et les promesses de l'écran Confidentialité. | Vue `public_territories` masquant `run_id`, arrondissant les horodatages, appliquant `publish_after`. |
| R4 | **File d'upload à 1 slot** | Deux sorties hors ligne = la première **perdue**. Perte de données utilisateur. | File FIFO persistée + écouteur réseau. |
| R5 | **Reprise jamais proposée** | Après un crash, le joueur croit sa course perdue alors qu'elle est sur le disque. | Détection au démarrage (E00 → E19). |
| R6 | **Zéro E2E** | Une refonte de cette taille sans filet d'intégration = régressions invisibles. | Maestro (le moins coûteux en RN) sur les 10 scénarios §25, lot 0. |
| R7 | **Tests mobiles hors gate** | La moitié du filet de la course n'est dans aucune commande de vérification. | Ajouter `test:mobile` au gate — coût nul, gain immédiat. |
| R8 | **Deux specs concurrentes** | `GRYD_SPEC_MAITRE_UNIFIEE_2026.md` (24/07, 3973 l.) est encore déclarée source de vérité par `CLAUDE.md`. Deux vérités = arbitrages contradictoires. | Inscrire la nouvelle spec au registre **avant** tout code (fait dans ce lot). |
| R9 | **`crew_boost_24` a un prix** | Seul reliquat pouvant se lire comme un multiplicateur vendu (§1.6). | Trancher : cosmétique assumé, ou retrait du prix comme `0065`/`0067`. |
| R10 | **Tolérance de fermeture adaptative** | §8.2 veut `max(35 m, 2,5 × précision)` ; le 80 m fixe a été durci **exprès** (AMENDEMENT-16 §2) contre un abus. | Passer à l'adaptatif **avec plancher à 35 m et plafond à 80 m** — respecte la spec sans rouvrir la faille. |

---

## 8. Écarts de constantes (§8.2 / §9.1) — le diff exact

| Constante spec | Valeur spec | Valeur dépôt | Action |
|---|---|---|---|
| `MIN_ACTIVITY_DISTANCE_RUN` | 800 m | `RUN_MIN_DISTANCE_M` = 1 000 m | aligner (dépôt plus strict) |
| `MIN_ACTIVE_DURATION_RUN` | 5 min | `RUN_MIN_DURATION_S` = 360 s (6 min) | aligner |
| `MIN_ACTIVITY_DISTANCE_BIKE` | 2 000 m | à confirmer | aligner |
| `MIN_POLYGON_AREA` | 5 000 m² | ≈ 15 047 m² (1 cellule res 10) | **structurel** — n'a de sens qu'après R2 |
| `MAX_CLOSURE_DISTANCE` | max(35 m, 2,5 × précision) | 80 m **fixe** | adaptatif borné 35-80 m (cf. R10) |
| `CONTEST_INTERSECTION_THRESHOLD` | 60 % | *n'existe pas* | créer (lot territorial) |
| `BASE_DEFENSE_WINDOW` | 18 h | *n'existe pas* | créer |
| Fortification 0→3 | 18/24/30/36 h | *n'existe pas* | créer |

Toutes vont dans `packages/shared/src/game-rules.ts` (source unique) puis `node scripts/sync-game-rules.mjs`.

---

## 9. Méthode de cet audit

13 agents en lecture seule, modèle calibré par complexité : **Opus** pour moteur/tracking/backend (les trois
domaines où une erreur d'analyse coûte des semaines), **Sonnet** pour les 7 sections d'écrans et les 3
domaines transverses. 497 appels d'outils, 2,2 M tokens. Consigne donnée à chacun : *« ce qui n'est pas prouvé
par le code est absent, pas probablement là »*.

**Ce document ne contient aucune estimation de délai.** Les efforts sont en S/M/L/XL relatifs ; le séquencement
est dans `PLAN_IMPLEMENTATION_GRYD.md`.
