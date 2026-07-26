# DELTA-IDENTITE — E15 Profil · E16 QR · E17 Boutique/Premium · E18 Stats + logo GRYD

> Revue adversariale, LECTURE SEULE. Aucun fichier de code touché.
> Lecture des images + du code **datée du 26/07/2026** (des chantiers écrivent en
> parallèle dans les `.tsx` : ce qui bouge est signalé). Méthode imposée :
> EXIGENCE → implémentation (fichier:ligne) → différence → action → test.
> « L'existant n'est jamais une preuve. »

---

## 0. AVERTISSEMENT CAPITAL — LES IMAGES DE MES 4 ÉCRANS NE SONT PAS DANS LE LOT

J'ai ouvert **les 14 PNG** de `docs/design/vague-1/planches-png/` (il n'y a pas de
`selection9`). Ce que chaque image montre RÉELLEMENT (mesuré, pas deviné) :

| Fichier | Contenu réel vu |
|---|---|
| `-selection.png` | **blanc** (vide) |
| `-selection2.png` | Onboarding « FERME LA BOUCLE » (tracé chartreuse fermé) |
| `-selection3.png` | Fragment carto « REPRIS » (zone chartreuse + zone orange sur grille) |
| `-selection4.png` | Fragment (deux silhouettes arrondies, sans texte) |
| `-selection5.png` | Onboarding « VOTRE POSITION CRÉE LE TRACÉ » (permission géoloc) |
| `-selection6.png` | **blanc** (vide) |
| `-selection7.png` | Fragment carte « 900 M » (point joueur + boucle) |
| `-selection8.png` | Carte « PORT OUEST » / rival « K.RUNNER » |
| `-selection10.png` | Sheet REPRISE « Quartier Saint-Rémy » |
| `-selection11.png` | Briefing mission « Reprenez Saint-Rémy » |
| `-selection12.png` | Fragment tracé live |
| `-selection13.png` | Victoire « SAINT-RÉMY REPRIS +0,42 km² » |
| `-selection14.png` | Résultat « Vous avez repris Saint-Rémy » (E09) |
| `-selection15.png` | Résultat « Boucle non fermée » (E09 variante) |

**Aucune de ces 14 images ne montre E15 (Profil), E16 (QR), E17 (Boutique/Premium),
E18 (Stats), ni le logo GRYD.** Aucune non plus n'est une capture « canvas deux
téléphones + panneaux d'annotations » : ce sont toutes des maquettes mono-téléphone
(ou des fragments). **Je ne peux donc PAS mesurer la fidélité de mes écrans à une
image que je n'ai pas.** Contrairement au brief, il n'y a rien à transcrire ici pour
mes écrans.

**Conséquence méthodo :** ma seule référence écrite pour E15-E18 + logo est
`docs/design/vague-1/PLANCHES.md` (transcription E01→E21, elle-même déclarée
« potentiellement périmée »). Je la traite comme la SPEC à confronter, jamais comme
une preuve, et je signale partout que la planche-image manque. Le fondateur doit
re-fournir les captures E15/E16/E17/E18 + logo pour un vrai recalage pixel.

---

## 1. LE LOGO GRYD — l'identité n'a PAS de composant unique

**Ce que dit le brief / la charte :** « GRYD en chartreuse sur noir, grotesque très
gras espacé », titrage prévu « High Cruiser » (retiré de l'export → dépôt en
Inter Tight), constat à faire sans résoudre.

**Ce que le code fait RÉELLEMENT (aucun `GrydLogo`/`Wordmark` réutilisable n'existe —
`grep` sur `Wordmark|brandmark|GrydLogo` = 0) :** le mot « GRYD » est **re-déclaré
à la main sur chaque surface**, avec des réglages DIVERGENTS :

| Surface | fichier:ligne | Couleur | Famille | letterSpacing | Taille |
|---|---|---|---|---|---|
| Onboarding (signature de page) | `onboarding/index.tsx:497` + style `brand` `:1157-1161` | **chartreuse** | `fonts.displayBold` = **InterTight_700Bold** | **3.5** | `sm` |
| ShareCard (partage) | `ui/game/ShareCard.tsx:193` + `:382-387` | **blanc** | (hérite système, weight 800) | **4** | `sm` |
| FormatPreview | `features/share/FormatPreview.tsx:211,247` + `:339` | **blanc** | weight 800 | **4** | `sm` |
| StickerCard | `features/share/StickerCard.tsx:39` + `:66-71` | **blanc** | weight 800 | **4** | `xs` |
| Splash (natif) | `app.json:59-60,81` | fond **#B4FF0D** + `splash.png` (asset binaire, non inspectable ici) | — | — | — |

**Différences vs identité voulue :**
1. **Pas de source unique.** Le logo est un `<Text>GRYD</Text>` copié 4 fois ; au
   premier changement de tracking/couleur, les surfaces divergeront (elles divergent
   DÉJÀ : chartreuse@3.5 en onboarding vs blanc@4 en partage).
2. **La couleur n'est pas stable.** L'onboarding tient la promesse « chartreuse sur
   noir » (`brand` = `colors.chartreuse`, commentaire `:1155-1156` « chartreuse sur
   fond noir, jamais sur clair, très espacée — se lit comme un logo »). Les cartes de
   partage rendent un **wordmark BLANC**. L'identité « chartreuse » n'est donc portée
   que par un seul écran.
3. **Font.** `packages/shared/src/design-tokens.ts:51,59-62` confirme le constat du
   brief : titrage = **Inter Tight** (`InterTight_800ExtraBold`/`700Bold`), **pas
   « High Cruiser »** (absent du dépôt). C'est un CONSTAT, non un bug à résoudre ici.

**Action recommandée (hors périmètre lecture-seule) :** extraire UN composant
`GrydWordmark` (couleur/tracking/famille par variante) pour que l'identité cesse de
se dupliquer, et re-fournir la planche-logo pour arbitrer chartreuse vs blanc par
surface. **Test à écrire :** snapshot du wordmark + assertion « jamais chartreuse
sur fond clair » (charte contraste 1,2:1).

---

## 2. E15 — MON PROFIL (`app/(tabs)/profil.tsx`, 1561 l. · `ProfileHero.tsx`)

> ⚠️ `profil.tsx` daté **26/07/2026 03:47** et `arsenal.tsx`/`performance.tsx`
> encore plus récents : fichiers **en mouvement**, lecture datée.

Composition de la planche (PLANCHES.md E15) reproduite **fidèlement dans la forme**,
de haut en bas — chaque bloc confronté :

| Exigence planche | Implémentation (fichier:ligne) | Verdict |
|---|---|---|
| Héros 210 pt + « Modifier » haut-droite | `ProfileHero.tsx:57` `HERO_H = 210` ; pilule Modifier `:162-172` | **conforme** |
| Avatar cerclé + pastille « NIV. n » | `ProfileHero.tsx:139-153` (héros) / `:187-199` (bande) ; pastille dérivée XP serveur | **conforme** (écarts assumés : hexagone au lieu de rond `:22-26` ; UN seul avatar `:9-20`) |
| Nom · @handle · « CREW · ville · #rang » · badge visibilité | nom `:207` · handle `:212` · contexte `:245-267` · visibilité `:225-238` (lecture seule → Confidentialité) | **conforme** |
| 4 métriques MAX, 1 bloc, 1 mise en avant (surface) | `profil.tsx:802-838` bloc `metrics` `:1312-1347` ; surface = `metricLead` chartreuse | **conforme** (mono-discipline) |
| Carte Signature 164 pt + « Voir ma carte › » | `profil.tsx:943-960` `SignatureMapCard` | **conforme** (une silhouette par monde) |
| Progression : bouclier + « Niveau 12 · Argent II » + XP + « Saison › » | `profil.tsx:969-1008` : **GripMascot** + `GRIP_RANK_LABELS` + XP réelle | **PARTIEL — écart de forme** |
| Previews : Hier · Badges · Historique | `profil.tsx:1014-1118` (+ Prochaine mission `:1038-1054`, Partage `:1123-1131`) | **conforme** |

**Écarts majeurs assumés (documentés dans le code, pas masqués) :**

- **PROFIL PUBLIC (moitié E15) = NON CONSTRUIT.** `profil.tsx:48-53` le déclare :
  « inconstructible aujourd'hui — aucune route de profil d'autrui, `profileStore` est
  un AsyncStorage LOCAL, aucun moteur de confrontations, aucune vue serveur de badges
  publics ; DÉFIER n'existe qu'au post-run, Suivre n'existe pas ». Confirmé par
  `RESTE-A-RECALER.md:993-994,1314` (dépend de O1). → **Donc « vos confrontations
  2-3 », badge « Jamais de position live », « Badges publics · 12 », CTA DÉFIER/Suivre,
  « contours généralisés » ne sont NULLE PART.** C'est le plus gros trou du lot, et il
  est honnête (rien de faux peint).
- **« Argent II » remplacé par le rang GRIP** (`profil.tsx:993-998`, commentaire :
  « l'échelle Argent II n'existe pas dans le jeu : la reproduire afficherait un statut
  que personne n'a gagné »). Bouclier planche → **mascotte GRIP**. Écart de forme
  assumé, fidèle à l'anti-mensonge.
- **Cas HYBRIDE Run+Bike** (`profil.tsx:840-907`) : deux blocs de 2 métriques au lieu
  d'un bloc de 4 (E14 « jamais sommées ») + ligne de portée `metricsScope`. Écart
  assumé, absent de la planche E15.
- **Commutateur Run/Bike** volontairement absent du Profil (`:54-65` : « carte de
  visite, pas un monde qu'on arbitre »).
- **« +18 % / 24,6 km cette semaine »** non peints (`:66-67` : aucune source de
  tendance sur cet écran).

**Données « réelles » vs à vider (E15) :**

| Valeur planche | Calculée depuis | Verdict |
|---|---|---|
| « surface contrôlée » (1,84 km²) | `hex_claims` via `useRealTerritoriesByActivity` → `profileTerritoryView` (`:451-491`) | **RÉELLE** |
| « 6 zones » | idem (compte d'hexagones) | **RÉELLE** |
| « 3 défenses » | `stat('defends')` = `user_stats` (`:822`) | **RÉELLE mais NON disciplinée** — mélange Run+Bike (migration 0070 « en suspens », signalé `:790-801`) |
| « 128 km saison » | `stat('seasonDistanceM')` (`:822`) | **RÉELLE, non disciplinée** (même réserve) |
| « #4 » (rang quartier) | `seasonRankProgress(season…rows)` (`:369-370,590-596`) | **RÉELLE** si saison prête, sinon segment absent |
| « Hier · reprise… +0,42 km² » | `useMyLastActivity` daté ; **le NOM de zone et le +km² sont VIDÉS** (`:606-645` : displayName NULL en base, serveur rend des comptes d'hex, pas une aire) → « dernière course » | **partiellement vidée, à raison** |
| « Badges · 8 » | `unlockedIds.size` réel (`:506,1077`) | **RÉELLE** (collection vide → ligne « comment en ouvrir un ») |
| « Historique · 42 » | **nombre RETIRÉ** (`:1087-1112` : `runs_valid` mélange les mondes ; la ligne redevient une nav sans compteur) | **vidé, à raison** |

Les **4 états** sont distincts et corrects : pas de compte `:724-747` · échec de
lecture `:753-768` · chargement `:774` · compte NEUF → PREMIÈRE MISSION (jamais 4 zéros)
`:914-930`.

---

## 3. E21 (édition profil) — donné « FAIT », VÉRIFIÉ : oui, avec une réserve

**Exigence :** le dépôt donne E21 (moitié Profil) pour fait.
**Vérifié** dans `app/profil-edit.tsx` : Aperçu-first (`previewInitials`/`previewMeta`
`:211,221`), Nom `:144`, **@handle avec dispo EN DIRECT** (`useHandleAvailability`
`:190-195`, planche « ✓ disponible »), Ville (`CityField` `:162-163`), Bio
(`:164`), avatar (couleur+initiales+photo), 3 badges mis en avant, frame cosmétique
(équipé seulement si POSSÉDÉ `:83-90`), **visibilité en reflet lecture-seule →
Confidentialité** (`:198`). → **CONFORME et FAIT.**

**Réserve honnête :** la planche E21 recalée (PLANCHES.md:301-306) parle de
**« 6 contrôles »** (Nom · Handle · Ville · Bio · Afficher mon crew · Visibilité).
Le code en expose **plus** (titre + avatar + frames + badges), hérité d'avant le
recalage. Écart « plus riche que la planche », pas un manque. La **moitié Identité de
crew** reste NON faite (`crew-edit.tsx` stub, O1) — hors mon périmètre mais confirmé.

---

## 4. E16 — QR CODES (`app/qr.tsx` + `features/social/ProfileQRCard.tsx`)

**Composition planche reproduite**, avec omissions assumées et documentées :

| Exigence planche E16 | Implémentation (fichier:ligne) | Verdict |
|---|---|---|
| Carte QR = seul élément CLAIR (fond blanc) | `ProfileQRCard.tsx:246` `backgroundColor: colors.blanc` ; encre sombre `:252-266` | **conforme** |
| QR **noir sur blanc**, quiet zone ≥ 4 modules, ECL M | `:207-216` `color noir`/`backgroundColor blanc`/`quietZone 16`/`ecl 'M'` ; `QR_QUIET_ZONE=16` `:63` | **conforme** (contrainte optique argumentée `:1-10`) |
| **Module central chartreuse** (signature, ≤ 6 px graphique) | `:219-230` + `signature` `:273-278` ; taille DÉRIVÉE `QR_SIGNATURE_SIZE` `:89` | **conforme** (dérivé, pas posé à l'œil) |
| Avatar + nom + « @handle · ville » + URL « gryd.app/… » | avatar `:190`, nom `:192-196`, identité `:197-199`, URL `:234-236` | **conforme** (avatar SANS anneau — écart assumé `:19-33`) |
| CTA « PARTAGER LE LIEN » | `qr.tsx:228-235` | **conforme** |
| Onglets « Mon code | Scanner » | **SCANNER OMIS** (`qr.tsx:8-16` : aucune dépendance caméra ; segmented à 1 item n'est pas un segmented ; dit en bas d'écran) | **écart assumé — bloqué expo-camera** |
| « Enregistrer l'image » | **remplacé par « Partager l'image »** (`:130-141` : `NSPhotoLibraryAddUsageDescription` absent → écriture pellicule échouerait toujours = bouton mort) | **écart assumé** |
| Variante crew (URL copiable, « Expire dans 7 j · 3 places ») | **NON dupliquée ici** → vit dans `features/crew/CrewInviteQRScreen` (`:17-20`) | **délégué** (⚠ `RESTE-A-RECALER.md:983` note que l'URL crew n'y serait ni copiable ni sélectionnable — hors mon périmètre) |
| « Scannez pour suivre ou défier » | **NON promis** (`:35-40` : ni suivi ni duel joueur↔joueur n'existent, la page `/u/[handle]` n'est pas en ligne — dit honnêtement `linkPending`) | **écart assumé** |

**Données réelles (E16) :** le QR encode `buildProfileLink(handle)` — **lien bien
formé mais MORT** (aucune page ne répond, O10), dit à l'écran. Le @handle n'est
imprimé que s'il APPARTIENT au joueur (`:87` — jamais le repli « @coureur »). **4
états** (hydratation / pas connecté / pas de handle / prêt) `:143-247`. Généré
**localement** (fonctionne hors-ligne). → honnête.

---

## 5. E17 — BOUTIQUE & PREMIUM (`app/arsenal.tsx`, 939 l.)

**Composition planche reproduite dans l'ordre** : hero saisonnier `:249-253` · solde
`:256-273` · note anti-p2w permanente `:281-284` · chips catégories `:322-333` · grille
2 colonnes `:339-350` · paywall Premium `:353,446-509`.

**Écart le plus lourd, ASSUMÉ et écrit en tête de fichier (`:10-49`) : LE PAIEMENT
N'EXISTE PAS.** Aucune dépendance RevenueCat/IAP, aucune RPC d'achat (O3).
Conséquences honnêtes :

- **« La boutique n'est pas ouverte » est dit AVANT les prix** (`:315-319`
  `notOpenTitle/Body`). Les prix restent affichés (vrais, `game-rules`) comme
  catalogue consultable, mais **rien ne s'achète, rien n'est débité/attribué**.
  `buy()`/`spendEclats()`/`confirmGift()` ont été **retirés du store** (`:27-40`).
- **Pas d'« ESSAYER 7 JOURS » ni « Restaurer les achats »** (`:436-439`) : APIs
  inexistantes → boutons morts interdits (§A4). Seul lien vivant = « Conditions »
  (`/legal/cgv`) `:496-506`.
- **Hero Premium SANS heatmap** (`:42-49`) : la planche veut « la VRAIE heatmap 90 j » ;
  aucun composant heatmap n'existe, `hex_claims` = [] → une illustration se lirait
  comme « ton territoire ». Hero **typographique** (titre + promesse vrais).

**Données réelles vs à vider (E17) :**

| Valeur planche | Source | Verdict |
|---|---|---|
| « SAISON 3 · HIVER · 18 j » | RPC `season_current` via `useActiveSeason` (`:227-235,400-425`) — 4 états | **RÉELLE** (numéro + jours) |
| « Collection Night Print » | **VIDÉE** (`:52-55` : aucun champ collection sur les items) | **absente, à raison** |
| Prix « 39,99 €/an · 3,33 €/mois » | **CALCULÉS** : `SKU_PRICES_EUR` + `monthlyEquivalentEur` (`:56-58,473-491`) — jamais recopiés | **RÉELS** |
| Solde Éclats / Club | `useArsenalInventory` **serveur uniquement** ; sinon « — », jamais « 0 » (`:173-191,255-278`) | **RÉEL ou vidé honnêtement** |
| Note « Cosmétique uniquement… » | `SHOP_C.cosmeticOnlyNote` verbatim planche (`:281-284`) | **conforme** |

Anti-p2w tenu (`:65-68`) ; aucun achat pendant une course (`:298-311`, `useRunInProgress`).

---

## 6. E18 — STATISTIQUES & DATA (`app/performance.tsx`, 728 l.)

**Grammaire planche reproduite fidèlement** : 3 blocs, chacun **chiffre → graphique →
conclusion en langage naturel** (`:5-8`).

| Bloc planche | Implémentation | Données |
|---|---|---|
| 1. Volume (« 24,6 km » + « ▲+18 % » + 7 barres, 1 chartreuse + phrase) | `:357-382` `StatBlock` + `Bars7` ; delta `:274-280` (jamais +0 %/+∞) | **RÉELLES** (`useStats`→`deriveStats` sur `runs`) |
| 2. Progression territoriale (« 1,84 km² » + courbe + phrase) | `:384-422` ; **courbe = aire des GAINS/semaine**, pas surface tenue | **RÉELLE** (gain = hex capturés × `OFFENSIVE_HEX_AREA_KM2`) |
| 3. Régularité (« 3 courses/sem » + carrés + phrase) | `:424-447` `WeekSquares` | **RÉELLE** |
| Chips Semaine/Mois/Saison | `:553-558` (Saison seulement si saison active) | conforme |
| Commutateur Run/Bike (E14) | `:645-657` `ActivitySwitch` dans `headerRight` (visible si `flags.bike`, retiré en course) | conforme, bascule une **vraie lecture** disciplinée `:494-502` |
| Pied « Analytics détaillées — Premium › » | `:460-471` (seulement si `flags.arsenal`) | conforme |

**Écarts assumés (`:77-95`, aucun masqué) :**
1. Segment « Saison » rendu **seulement si saison réelle** (sinon onglet vide à vie).
2. **« Courbe de surface tenue » INTENABLE** : `hex_claims` ne garde que le
   propriétaire courant, les pertes ne sont historisées nulle part → une courbe
   serait croissante par construction (mentirait « jamais rien perdu »). Remplacée par
   l'aire des gains.
3. **« Aucune perte de zone depuis 12 jours » SUPPRIMÉ** (indérivable). Remplacé par
   la meilleure semaine de capture (lisible dans les payloads serveur).
4. **État hors-ligne** (« dernier calcul + horodatage ») : pas d'infra → servi par
   l'état `failed`, jamais un horodatage inventé.
5. **Écran Premium séparé (heatmap « temps de contrôle par zone », « 31 j contrôle
   moyen », « À SURVEILLER ») = NON CONSTRUIT.** La ligne Premium route vers le paywall
   `/arsenal` (lui-même sans heatmap, cf. §5). C'est une promesse de la planche E18 non
   tenue par le code (honnêtement, aucune donnée fabriquée).

Records personnels **réintroduits** sous les 3 blocs (décision fondateur `:15-24`),
dérivés des MÊMES lignes (`records.ts`), sans graphique ni conclusion. **4 états** de
lecture corrects `:561-639` + états vides nommés par discipline (vélo vs course).

---

## 7. BILAN CHIFFRÉ

**Écrans/surfaces ouverts et lus (images) :** 14 PNG (100 % du lot) → **0** montre mes
4 écrans ou le logo.
**Fichiers de code confrontés (fichier:ligne) :** 6 — `profil.tsx`, `ProfileHero.tsx`,
`ProfileQRCard.tsx`, `qr.tsx`, `arsenal.tsx`, `performance.tsx` (+ `profil-edit.tsx`,
`design-tokens.ts`, 4 surfaces wordmark, `app.json`).

| Statut | Compte | Détail |
|---|---|---|
| **Vérifiés** (confrontés fichier:ligne) | **8** | E15 mon-profil · E15 héros · E16 qr · E16 carte · E17 boutique · E18 stats · E21 édition · logo (4 surfaces) |
| **Conformes** (forme planche tenue + données réelles/vidées honnêtement) | **5** | E15 mon-profil, E16 Mon code, E17 boutique, E18 stats, E21 profil |
| **Partiels** (forme tenue mais écart assumé de composant/donnée) | **4** | E15 progression (GRIP≠« Argent II ») · E15 hybride (2×2 métriques) · E16 image « Enregistrer » → « Partager » · logo (chartreuse en onboarding / **blanc** en partage, pas de composant unique) |
| **Absents** (planche décrit, code ne peint RIEN — honnête) | **5** | E15 **profil public** (confrontations, badges publics 12, DÉFIER/Suivre, position live) · E16 **Scanner** · E16 variante crew (déléguée) · E17 **collection saisonnière** · E18 **écran Premium heatmap** |
| **Bloquants** (dépendance dure) | **5** | O1 (profil/confrontations/annuaire serveur) · O3 (paiement IAP) · expo-camera (Scanner) · O10 (domaine gryd.app → lien QR mort) · pas de composant logo + « High Cruiser » absent (Inter Tight) |

**Données « réelles » confirmées :** surface km²/zones (`hex_claims`), défenses/km
(`user_stats`, ⚠ non disciplinées), rang #4 (season_scores), badges N (user_badges),
volume/delta/régularité (`runs`), prix (game-rules calculés), saison N + jours (RPC).
**Données VIDÉES à raison :** nom de zone + « +0,42 km² » en preview, compteur
historique, « confrontations 2-3 », « Badges publics 12 », collection Night Print,
courbe de surface tenue, « aucune perte depuis 12 j ».

**Incertitude n°1 (à lever par le fondateur) :** re-fournir les **images E15/E16/E17/
E18 + logo** — sans elles, « reproduction fidèle de la planche » est invérifiable pour
ces écrans ; je n'ai confronté qu'à `PLANCHES.md` (déclarée périmable).
