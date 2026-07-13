# AMENDEMENT-37 — Carte : réconciliation avec l'ÉTUDE DE MARCHÉ UI/UX 2026

**Statut : ACTIF.** Autorité : `docs/product/GRYD_ETUDE_MARCHE_CARTE_2026.md` (versée le
2026-07-13, rang 1 « docs/product ») devient la **source de vérité produit pour la
Battle Map**. Cet amendement réconcilie l'étude avec l'état bâti (~85 %) et **révise
explicitement AMENDEMENT-36** (« JUSTE LE TRACÉ, zéro aplat »). *Le plus récent gagne* :
là où -36 et l'étude divergent, l'étude prime — mais on garde l'esprit épuré de -36.

Cet amendement est né d'un **audit multi-agents** carte-actuelle ↔ étude (5 clusters,
0 régression) : GRYD est déjà conforme sur les couleurs par rôle, l'ordre route>territoire
(§19), l'agrégation (jamais 200k runners), la sheet 2 niveaux et le détail-au-tap. Le
delta réel = **5 P0 + 11 P1**, regroupés ci-dessous en 2 batches.

---

## §1 — Arbitrage FILLS : révision d'AMENDEMENT-36 (P0)

**Décision.** L'étude §7.1 (« remplissage = propriétaire ») + §7.2 (fill 16-24 %) + §8
(« stable = fill propriétaire léger + contour plein ») rétablissent un **aplat de
possession**, retiré par -36. On le **réintroduit SUBTIL et gouverné par le zoom (LOD)** :

- **Opacité plancher, pas plafond** : fill propriétaire **16 %** (crew chartreuse, rival
  orange), contesté **~18 %**. Jamais les 26-30 % d'avant -36 (jugés trop lourds — c'était
  la vraie cause de la réaction « retire les zones »). Le **contour/la trace reste
  DOMINANT** (règle §B trace-héros intacte).
- **LOD** : le fill ne vit qu'au **dézoom ville/quartier (~z10-15)** où lire la surface
  « qui possède quoi » compte (§26.1). Au **zoom rue (z16+)**, le fill **s'efface** et la
  trace-héros Strava domine seule — l'esthétique de -36 est préservée là où le coureur
  regarde son tracé.
- **Ordre de rendu** : fills SOUS les contours/traces (§19). Aucune couleur hors tokens.

**Une seule vérité de fill.** Source unique = `mapTokens.mineFill` (porté à ~16 %) et ses
homologues rôle. Les constantes mortes `crewFill 0.30 / rivalFill 0.26 / contestedFill 0.24`
de `territoryStyle` sont **alignées à 16-18 % ou supprimées** (elles n'étaient plus
consommées). *AMENDEMENT-36 §« zéro aplat » est donc caduc ; son §« trace-héros dominante »
reste pleinement en vigueur.*

## §2 — L'actif domine : dimming à la SÉLECTION (P0)

Étude §4.2 : sélection **100 %**, contexte proche **40-60 %**, secondaire **10-25 %**.
Aujourd'hui l'atténuation ne vient que du **mode** (MODE_EMPHASIS), jamais de la sélection.
→ À la sélection d'une zone (tap), la zone active passe à 100 % (fill+contour), les autres
territoires retombent à ~15-25 % (feature-state / expression paint pilotée par
`selectedZoneId`). La **route active reste au-dessus** (§19). *(Batch 2 — dépend du tap.)*

## §3 — « Qui possède quoi » en 1 tap : sheet par ZONE (P0)

Étude §9/§10/§25 : taper une zone ouvre **SA** sheet, pas une mission figée. Champs §10 :
Propriétaire (vrai crew, peut être rival), Contrôle %, **Tenue depuis**, **Surface km²**,
**Défendue il y a X**, bloc **PRESSION** (top rival % + neutre %), bloc **ACTIVITÉ 24 H**
(« 12 runs · 7 alliés · 5 rivaux » — **agrégé, jamais localisé**), **ACTION RECOMMANDÉE**
(`{type} · {km} · {min} · +{n} zones` + 1 CTA), affordance **« Plus »** (historique /
contributeurs / verify / pression — hors 1ᵉ niveau).
Câblage : `RealMap onPress → queryRenderedFeatures` sur la couche territoires →
`selectedZoneId` → sheet. **Le claim reste décidé serveur** ; ici on n'affiche que des
**étiquettes de scénario démo** (Paris/Lille) — *jamais de faux rankings/crews européens*
(garde-fou CLAUDE.md). *(Batch 2.)*

## §4 — Fraîcheur des données (P0, critère §26.14)

Étude §6.1 + §17 : la carte doit dire si elle est **à jour**. → micro-indicateur 1 ligne,
fusionné dans la ligne de secteur en tête de carte (jamais un 2ᵉ bloc) :
`PARIS EST · ● À jour` avec les 4 états **À jour / Mise à jour… / Hors ligne / Données de
N min**. Source démo déterministe (`MAP_FRESHNESS` dans `demo.ts`). *(Batch 1.)*

## §5 — États territoriaux : grammaire (P1)

- **Protégé = BLEU ÉLECTRIQUE** (§7.2/§8), token dédié `electricBlue ~#2E6BFF`, contour
  à alpha **0.7-0.85** (dissocié de `verify #6FB7FF`, qui reste au GRYD Verify). *(Batch 1.)*
- **Le contesté ne PULSE plus** (§8 : contesté = double contour + hachures + badge, SANS
  mouvement ; l'animation est réservée à l'**attaque active / urgence**, §7.1). *(Batch 1.)*
- **Une seule animation permanente** (§15) : garder le pulse du **secteur le plus urgent**
  uniquement ; figer bonus, contesté, et rendre le **halo ego statique** (ou l'unique
  pulse). Reduce-motion déjà câblé. *(Batch 1.)*
- **3 états manquants** (§8) — `openBoundary` (pointillé + point de fermeture),
  `loopIncomplete` (anneau ouvert + segment manquant chartreuse + distance), `excluded`
  (hachures grises + pas de CTA + raison au tap) : réutiliser les dashes live existants.
  *(Batch 2 — extension d'enum.)*

## §6 — Zoom sémantique : 5 bandes, pas 2 (P1)

Étude §11. Aujourd'hui 2 paliers (dots<z9 / tout≥z9) + **couture morte z9-11**. Cible :

| Bande | Zoom | Contenu |
|---|---|---|
| Pays/région | z6-9 | villes + drapeau/pression rival |
| Métropole | z10-12 | **secteurs + crew dominant + contrôle %** |
| Quartier | z13-15 | **territoires + frontières + missions** |
| Rue | z16-18 | route + position + segment restant + point de fermeture |
| Live | z19+ | trace live |

Correctifs Batch 1 : **`TERRITORY_TRACE_MIN_ZOOM ≈ 13`** (les tracés de territoire
n'apparaissent qu'au quartier ; sous z13, villes+secteurs portent seuls la lecture) ;
**fermer la couture** (abaisser `SECTOR_MIN_ZOOM` à ~9-10 **ou** relever
`TERRITORY_DOT_MAX_ZOOM` à ~10-11 pour un chevauchement continu). Étagement des markers
par bande (missions z13+, alliés opt-in z16+) et badge secteur `%` : Batch 2.

## §7 — Mode par défaut = CONTRÔLE (P1)

Étude §12 + §1 (« état du monde d'abord », ordre comprendre→décider→courir §27). La carte
ouvre aujourd'hui en Défense/Route (territoires atténués). → **défaut = Contrôle
(`territoire`, tous les territoires pleins)**. `DEFAULT_MAP_MODE = 'territoire'` existe déjà
mais n'est pas utilisé à l'init ; `autoMapMode` devient une **suggestion** (ne bascule en
`defense` que sur menace réellement live). *(Batch 1.)* La taxonomie 5→3 modes de l'étude
(Contrôle / Action / Crew) et le mode Crew manquant : *(Batch 2/backlog.)*

## §8 — ≤ 2 boutons flottants (P1, révise AMENDEMENT-25)

Étude §6.2/§15/§26.7 : **max 2 FABs**. GRYD en a 3 (Calques + Recentrer + Info) parce que
-25 a poussé la mission dans le FAB Info. → revenir à **2 FABs (Couches + Recentrer)** et
restaurer la **bottom sheet peek persistante** de la mission (§6.3 : « RÉPUBLIQUE SOUS
PRESSION · 3 zones à sauver · 4,4 km · [DÉFENDRE] »), qui surface aussi le **rival principal**
sans tap (§26.2). *AMENDEMENT-25 §1 (mission→FAB Info) est révisé ; l'étude prime.* *(Batch 2.)*

---

## §9 — Découpage d'exécution

**Batch 1 — Grammaire + lisibilité < 3 s** (rendu/config, aucune nouvelle plomberie
d'interaction) : §1 fills subtils LOD, §4 fraîcheur, §5 protégé bleu + pulse contesté off
+ 1 animation, §6 trace-min-zoom + couture LOD, §7 mode Contrôle défaut, rival nommé en
tête de carte. **Vérif** : gate dur (typecheck 4/4, deno ≥ baseline, sync sans drift) +
preview mobile-web.

**Batch 2 — Détail au tap + l'actif domine** : §2 dimming sélection, §3 tap→zone sheet +
champs §10 + action recommandée, §8 ≤2 FABs + mission peek + rival, §5 3 états manquants,
§6 étagement markers + badge secteur %.

**Backlog (P2/P3)** : opacité=force/récence (§7.1), taxonomie 3 modes + mode Crew,
activité rivale agrégée « N runs récents », hachures contesté/exclue (trancher réactiver
vs supprimer le code mort), sécurité dans display_priority (§14), instrumentation perf
§21, note 3D/satellite = extensions post-MVP (§22).

## §10 — Garde-fous (inchangés, vérifiés à chaque écran)

- Couleurs par **RÔLE** uniquement (chartreuse=moi, orange=rival, violet=contesté, bleu
  électrique=protégé) — jamais par crew. Aucune couleur hors tokens.
- Jamais de chartreuse sur fond clair (contraste). Fills subtils = teinte de rôle à basse
  opacité sur fond sombre.
- **Jamais de données européennes factices** : villes/classements/rivaux hors Paris/Lille
  restent une VISION (copie + docs), jamais des rankings inventés.
- Tout claim décidé serveur ; le client n'attribue jamais un hex ; la sheet n'AFFICHE que
  des étiquettes.
- 1 écran = 1 décision + 1 CTA chartreuse max ; détail au tap ; compris en < 3 s (§A).
