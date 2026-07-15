# AMENDEMENT-40 — Monétisation : le gameplay est gratuit, le statut est payant

> **Rang documentaire** : amendement le plus récent → prime sur AMENDEMENT-02..39 sur les points traités ici.
> Complète AMENDEMENT-39 (§6 : Arsenal conservé mais masqué en prod) sans le contredire.
> Source : doctrine de monétisation fondateur (15/07/2026).
> **Statut : décisions FERMES.**

---

## §0 — La règle

```txt
Ne fais pas payer l'action qui rend GRYD viral.
Fais payer la manière dont l'utilisateur se met en scène lorsqu'il la partage.
```

```txt
GRYD gratuit  = courir, capturer, reprendre, rejoindre un crew, partager
GRYD payant   = mieux se montrer, mieux partager, mieux personnaliser
```

**100 % du gameplay est gratuit.** Renforce et précise la règle CLAUDE.md « anti pay-to-win STRICT ».

---

## §1 — Gratuit, non négociable

Tout ce qui alimente la boucle virale : création de compte · tracking GPS · **capture** · **reprise** · carte
territoriale · première mission guidée · classement local de base · **création/adhésion à un crew** ·
notifications de reprise · **story automatique** · **deep link de zone** · **invitation d'un ami** ·
confidentialité et masquage départ/arrivée.

**Ne JAMAIS faire payer** : le nombre de zones capturées · la distance autorisée · **la possibilité de
défendre** · la visibilité normale de la carte · l'accès à un crew · les classements essentiels · le partage de
base · **la sécurité** · la récupération d'une course perdue.

> Faire payer l'une de ces choses ralentit l'acquisition **et** crée une suspicion de pay-to-win.

---

## §2 — 🔴 VIOLATIONS CONSTATÉES DANS LE CODE ACTUEL (à corriger avant toute réactivation)

Audit du 15/07 — la chaîne est **vérifiée maillon par maillon** :

| Maillon | Preuve |
|---|---|
| Les Éclats sont vendus en EUROS | `apps/mobile/src/features/arsenal/catalog.ts:140-159` (`SKUS.eclatsS/eclatsM`, `priceEur`) |
| Le **Bouclier** s'achète en Éclats | `catalog.ts:197` — `priceShards: SHIELD_EXTRA_ECLATS` — « Protège un secteur pendant 48 h » |
| Le **Streak Gel** s'achète en Éclats | `catalog.ts:209` — `priceShards: STREAK_GEL_ECLATS` |
| La **série multiplie les points** | `packages/engine/src/scoring.ts:17` — `points = floor(base × verify × streak × perf)`, `STREAK_MULTIPLIER_CAP = 1.5` |
| **GRYD Club** donne 2 gels/mois vs 1 gratuit | `game-rules.ts:207-208` — `STREAK_FREEZE_FREE_PER_MONTH = 1`, `STREAK_FREEZE_CLUB_PER_MONTH = 2` |

**Conclusions :**
1. **Argent réel → Éclats → Bouclier = PROTECTION ACHETÉE.** CLAUDE.md interdit explicitement de vendre
   « territoire, points, vitesse ni **protection** ». Violation directe.
2. **Argent réel → Éclats/Club → Streak Gel → protège un multiplicateur ×1,5 sur les POINTS de territoire.**
   Violation de « aucun multiplicateur de score ».
3. **Mensonge produit (charte §1)** : la description du Streak Gel dit « **Aucun effet territoire** » alors
   qu'il protège un multiplicateur **sur les points de territoire**.

**À décharge — l'intention anti-p2w tient ailleurs**, et ces garde-fous sont à CONSERVER :
`SHIELD_CLUB_INCLUDED_PER_WEEK = 0` · le Bouclier est « jamais dans l'abonnement » · les crew boosts sont
« +25 % coffre, **jamais de points** » · les Éclats disent « Le territoire, lui, se gagne en courant ».

**Gravité réelle : LATENTE, pas active.** Aucun client IAP n'existe (`react-native-purchases` absent) et
l'Arsenal est masqué en prod (AMENDEMENT-39 §6). Rien n'est vendable aujourd'hui. **Mais ça partirait tel quel
à la réactivation V1.5.** → Corriger AVANT de lever le flag, pas après.

**Correctifs imposés** (à appliquer quand l'Arsenal sera rouvert) :
- Le **Bouclier** et le **Streak Gel** ne sont plus achetables contre de l'argent (ni directement, ni via une
  monnaie achetable). Ils redeviennent **gagnés par le jeu**, ou disparaissent.
- **`STREAK_FREEZE_CLUB_PER_MONTH` doit valoir `STREAK_FREEZE_FREE_PER_MONTH`** : l'abonnement ne protège pas
  mieux la série que la gratuité.
- Corriger la description mensongère du Streak Gel.

---

## §3 — Pas de monnaie virtuelle au MVP

**Les Éclats ne sortent PAS au lancement.** Une monnaie virtuelle exige : boutique, portefeuille, ledger,
remboursements, plusieurs produits, règles de consommation, prix équilibrés, UI supplémentaire, conformité
accrue, tests. Trop de travail avant d'avoir validé rétention et viralité.

→ Cohérent avec AMENDEMENT-39 §6 (Arsenal masqué) : **le masquage de l'Arsenal EST le retrait des Éclats.**
On vend **directement** les 4 produits du §4.

---

## §4 — L'offre MVP : exactement 4 produits, tous cosmétiques

| Produit | Type | Prix test |
|---|---|---|
| **Founder Pack** | achat permanent | **9,99 €** |
| **Fire Trace** | achat permanent | **2,99 €** |
| **Conquest Story Pack** | achat permanent | **3,99 €** |
| **Crew Identity Pack** | achat permanent | **14,99 €** |

**Rien de plus au départ.** Suffisant pour mesurer : taux de conversion · préférence individuelle vs crew ·
intérêt pour les stories · sensibilité au prix · revenu par payeur.

### Founder Pack (9,99 €) — le premier produit
Badge Founder permanent · cadre de profil Founder · skin de trace exclusive · template Story Founder ·
animation de capture Founder · titre « Fondateur de la ville » · blason crew exclusif · accès anticipé aux
futurs cosmétiques.

**Ne donne : aucune zone, aucun bonus de capture, aucun multiplicateur de score, aucune défense automatique,
aucun avantage de classement.**

**Rareté RÉELLE, jamais réinitialisée artificiellement** : « Disponible pendant la Saison 0 » **ou**
« Limité aux 5 000 premiers Founders ».

---

## §5 — Partage : gratuit beau, payant remarquable

```txt
La story gratuite doit être belle.
La story payante doit être remarquable.
```

**Gratuit** : story conquête/reprise/crew standard · fond sombre GRYD · trace chartreuse · sticker de base ·
export correct · deep link.
**Payant** : animation cinématique · styles feu/néon/carbone/Founder · avant-après animé · replay 3D · bordure
crew premium · badge animé · export HD · effets liés au skin de trace.

**Pas de watermark énorme sur le gratuit — le contenu gratuit est la publicité.**

---

## §6 — Crews : payer son identité, jamais sa domination

**Crew Identity Pack (9,99–19,99 €)** : blason premium · bannière · couleurs secondaires · template Story Crew ·
animation de victoire · page crew personnalisée · cadre membres · invitation sociale premium.

**Ne jamais vendre** : davantage de puissance · bonus de territoire · défense automatique · meilleur classement ·
runners supplémentaires réservés au paiement.

---

## §7 — Abonnement (GRYD+) : pas avant la rétention

Pas au MVP. Plus tard, si valeur récurrente réelle : **4,99 €/mois ou 39,99 €/an** — historique avancé,
heatmap, analyses, planificateur avancé, routes hors ligne, replay 3D, bibliothèque de templates, stats crew.

**Jamais dans l'abonnement** : la capture · la défense · les classements de base · la story standard · les
notifications · les crews · la sécurité.

```txt
GRYD gratuit = le jeu complet.
GRYD+        = l'expérience augmentée.
```

---

## §8 — Où montrer la monétisation

**JAMAIS** : pendant une course · avant la première capture · dans l'onboarding · en popup sur la carte ·
après chaque action · **au moment où une zone est perdue**.

**Funnel imposé** :
```txt
Installation → première capture → première story → premier retour après reprise → proposition Founder Pack
```
et surtout **pas** `Installation → paywall`.

**Déclencheurs** (UN SEUL par utilisateur, puis présence discrète dans le profil) : première capture partagée ·
troisième capture · entrée dans le top 10 · création d'un crew · premier ami recruté.

**Emplacements** : après la première story partagée (CTA secondaire `[VOIR LE PACK]`) · Profil → « Personnaliser » ·
aperçu de story (gratuit présélectionné, premium visibles plus bas, **partage gratuit sans obstacle**) ·
Crew → « Personnaliser le crew ».

---

## §9 — Conformité paiement

Biens numériques utilisés dans l'app : **StoreKit** (iOS) et **Google Play Billing** (Android). Les packs/skins
permanents = **non-consommables** ; GRYD+ = abonnement renouvelable. Ne pas bâtir le MVP sur un paiement web
externe sans cadrer les règles européennes.

**État réel** : aucun client IAP (`react-native-purchases` absent), `rc_webhook` existe côté serveur mais **rien
ne le déclenche**, et le compte Apple Developer n'existe pas (O2). **L'IAP n'est pas testable aujourd'hui.**

---

## §10 — Architecture de données

**Existe déjà** : `purchases` (0002) · `feature_entitlements` (0026) · `club_entitlements` (0027) ·
`user_inventory` (0014) · `rc_webhook`.
**À créer** : `products` (catalogue serveur) ; aligner `entitlements` sur les clés du §4.

Produits : `founder_pack` · `trace_fire` · `story_pack_conquest` · `crew_identity_pack`
Entitlements : `founder_badge` · `founder_frame` · `founder_story` · `trace_fire` · `story_conquest_pack` ·
`crew_premium_identity`

**RLS obligatoire** ; écriture serveur uniquement (webhook), jamais le client.

---

## §11 — Revenus sans faire payer l'utilisateur

**Événements sponsorisés** (le sponsor paie présence/branding/récompense/challenge/visibilité — **mais n'achète
jamais de zones permanentes**) · **partenariats locaux** (la récompense est financée par le partenaire) ·
**événements d'entreprise** (challenge collaborateurs, crew privé, dashboard — potentiellement plus rentable que
les microtransactions au début) · **merchandising** (parcours et paiements séparés des biens numériques).

---

## §12 — Honnêteté sur les ordres de grandeur

La projection fondateur (10 000 actifs → ≈ 4 744 € brut) **n'est pas une prévision** : elle montre que les
achats cosmétiques seuls **ne financent pas une structure sans volume**.

**Le véritable enjeu initial reste la croissance, la rétention et la densité locale.**

---

## §13 — Priorité réelle

Cet amendement est **P2**. Il ne devient exécutable qu'après le chemin critique d'AMENDEMENT-39 :

```txt
O2 (auth) → première capture réelle → première story réelle → rétention
                                                              ↓
                                                        ALORS monétiser
```

On ne vend rien à **0 utilisateur**. La seule action utile aujourd'hui : **ne pas réactiver l'Arsenal sans avoir
corrigé les violations du §2.**
