# GRYD — Cosmétiques de profil (10/09/2026)

**Demande du fondateur** : « Est-ce qu'il y a d'autres moyens de personnalisation de profil
qu'utilisent d'autres applications, que l'on peut faire payer in-app, qui ne seraient que du code
et qui ne coûtent rien ? Si oui, mets-les en place. »

**Réponse courte** : oui, sept familles, trente-six objets, zéro asset. Tout est du SVG, des
dégradés de tokens, de la typographie déjà chargée et une animation. Rien n'est acheté à un
illustrateur, rien n'est téléchargé, rien ne pèse au-delà du code livré.

**Statut** : la boutique **n'est pas ouverte** (ADR-014, ADR-011). Les objets commerciaux existent,
sont décrits et affichés avec leur statut honnête ; **aucun bouton d'achat n'est peint** tant que
`storeAvailability2026().open` est faux.

---

## 1. Benchmark : ce qui ne coûte que du code chez les autres

| Application | Ce qui est vendu en cosmétique | Coût de production | Ce que GRYD en retient |
|---|---|---|---|
| **Strava** | rien. Le payant est fonctionnel (segments, analyses). | — | Un concurrent direct ne vend **aucun** cosmétique. Ce n'est pas une interdiction : c'est une place vide. |
| **Nike Run Club** | rien de payant. Des **badges** gagnés aux défis. | code | Le badge gagné motive sans se vendre : c'est déjà notre modèle de niveau et de saison. |
| **Zwift** | kits, maillots, **et des vélos qui roulent plus vite**. | 3D achetée | **Le contre-exemple.** Dès qu'un objet payant touche la performance, il n'est plus cosmétique. GRYD ne peut pas suivre (règle 10, anti-pay-to-win). |
| **Discord Nitro** | avatar animé, **bannière de profil**, **décorations d'avatar**, thèmes, badge. | code (+ quelques décos dessinées) | **Le modèle le plus proche.** Bannière, cadre et badge sont exactement reprenables en SVG. |
| **Duolingo** | tenues du hibou (Super/Max), gemmes. | illustration | Écarté : un personnage à habiller est un coût d'illustration récurrent, et GRYD n'a pas de mascotte. |
| **Snapchat+** | **icônes d'app**, cadres de story, badge d'abonné. | code (icônes = assets) | Cadre et badge repris. L'icône d'app est écartée (voir §6). |
| **Reddit** | avatars, styles. | illustration | Écarté pour la même raison que Duolingo. |
| **Twitch** | badges d'abonné, emotes. | illustration | Le badge d'abonné est un signe de PAIEMENT affiché aux autres. Écarté : GRYD n'affiche pas qui paie (§6). |
| **Instagram** | rien. | — | — |

**Ce que GRYD reprend** : la bannière, le cadre d'avatar, la couleur du nom et le badge de titre
(Discord, Snapchat). **Ce que GRYD ajoute et que personne n'a** : le style de la **trace** et la
silhouette du **pin** sur la carte — les deux objets que seul un jeu de territoire possède.
**Ce que GRYD ne reprend pas** : Zwift.

---

## 2. Les sept familles, et où chacune se voit

| Famille (emplacement) | Ce que ça change | Où ça se voit |
|---|---|---|
| `nameColor` | couleur du nom et du @pseudo | profil, fiche `/member` |
| `avatarFrame` | anneau autour de l'avatar | profil, `/member`, cartes sociales (`AvatarHex`, `PlayerCardAvatar`) |
| `banner` | fond derrière l'identité | profil, `/member` |
| `trace` | couleur, épaisseur et halo de ma trace | carte (`territoryPaint2026` → `RealMap`) |
| `pin` | silhouette de mon marqueur | carte (`MePinMarker2026`) |
| `titleBadge` | mise en forme du titre équipé | profil |
| `cardTheme` | fond, encre et accent des cartes exportées | Studio de partage (contrat exposé, consommé par le lot partage) |

Sept emplacements **ne font pas sept rangs** (G22). Un rang classe ; ces objets ne classent rien, ne
se comparent pas entre joueurs, et le profil n'en montre jamais plus d'un par zone. Ils **remplacent**
d'ailleurs un rang là où il en existait un : sur les avatars sociaux, un cadre choisi prend la place
de l'anneau de tier.

---

## 3. Le catalogue

Source unique : `apps/mobile/src/features/arsenal/cosmetics2026.ts` (pur, testé sous Deno).
Instantané serveur gelé : `supabase/migrations/0180_profile_cosmetics_2026.sql`.
Seuils de niveau : `PROFILE_COSMETIC_LEVELS_2026` dans `packages/shared/src/game-rules.ts`.

Légende d'obtention : **N** = niveau permanent · **S** = objet de saison · **+** = GRYD+ ·
**C** = collection permanente (contour / relief / clubhouse) · **P** = parrainage abouti.

**La cinquième source d'obtention, `referral` (11/09/2026, migration 0191).** Le lot parrainage
(0184-0186) octroie une collection **exclusive** dans `referral_grants_2026` ; 0191 la fait entrer
ici. C'est la seule origine qu'on **ne peut ni acheter, ni atteindre en courant seul** : elle demande
un parrainage abouti des deux côtés (deux sorties réelles, validées serveur). Elle est **gratuite**
et n'est vendue nulle part : un objet **P** n'affiche donc jamais « Pas encore en vente », mais
« Réservé au parrainage ». Un octroi **révoqué** (sortie rejetée ou gelée par l'anti-triche) retire
l'objet du profil : c'est la seule exception à §7.5, et elle est écrite dans 0191.

### (a) Couleur du nom — 5 objets
| Objet | Rendu | Obtention |
|---|---|---|
| Ivoire | aplat blanc | N1 · livré avec le compte |
| Chartreuse | aplat chartreuse | N2 |
| Aurore | dégradé chartreuse → blanc | N8 |
| Givre | dégradé blanc → gris | **+** |
| Lave | dégradé chartreuse pressée → chartreuse | **C** contour |

### (b) Cadre d'avatar — 6 objets
| Objet | Rendu | Obtention |
|---|---|---|
| Sans cadre | aucun anneau | N1 · livré |
| Liseré | trait simple | N2 |
| Double liseré | deux traits | N4 |
| Couture | pointillé chartreuse | N14 |
| Pulsation | anneau chartreuse qui respire (coupé si « réduire les animations ») | **+** |
| Hexagone néon | hexagone chartreuse + halo | **C** relief |
| Relais | double liseré chartreuse + **point de jonction** (le témoin qui passe) | **P** parrainage |

### (c) Bannière de profil — 5 objets
| Objet | Rendu | Obtention |
|---|---|---|
| Carbone | aplat carbone | N1 · livré |
| Trame | grille fine | N4 |
| Hachures | diagonales chartreuse | N8 |
| Aurore | dégradé chartreuse → blanc | **+** |
| Courbes de niveau | quatre courbes de relief | **C** contour |

**Jamais une photo.** Une bannière photographique serait un contenu importé : stockage, modération et
risque de vie privée pour un objet décoratif.

### (d) Style de trace — 5 objets
| Objet | Rendu | Obtention |
|---|---|---|
| Chartreuse | trait chartreuse, 3 px | N1 · livré |
| Ivoire | trait blanc | N2 |
| Trait large | chartreuse, 5 px | N8 |
| Néon | chartreuse + halo (`line-blur`) | **+** |
| Relief | blanc épais + halo léger | **C** relief |
| Relais | trait fin chartreuse dans un **halo large** (la traînée du témoin) | **P** parrainage |

**Aucun pointillé, délibérément** : la carte emploie déjà le pointillé pour dire une **affiliation de
crew** (`terr-owner-member`). Un pointillé décoratif ferait lire une information de jeu là où il n'y
en a pas (L15).

### (e) Marqueur sur la carte — 5 objets
| Objet | Rendu | Obtention |
|---|---|---|
| Goutte | la silhouette actuelle | N1 · livré |
| Hexagone | hexagone pointe en bas | N4 |
| Éclair | blason anguleux | N25 |
| Couronne | trois pointes | **S** titre de saison |
| Blason | épaules droites, base en ogive | **C** clubhouse |

Les cinq silhouettes partagent **la même pointe**, en (20, 50) du viewBox : changer de pin ne déplace
jamais la position affichée.

### (f) Thème de carte de partage — 4 objets
| Objet | Rendu | Obtention |
|---|---|---|
| Sombre | noir, encre blanche, accent chartreuse | N1 · livré |
| Minimal | carbone, accent gris | N4 |
| Chartreuse inversé | fond chartreuse, encre noire | N14 |
| Affiche | carbone profond, accent chartreuse | **+** |

### (g) Badge de titre — 4 objets
| Objet | Rendu | Obtention |
|---|---|---|
| Simple | texte gris | N1 · livré |
| Capitales | capitales espacées | N2 |
| Contour | capitales display + contour | N8 |
| Gravé | capitales chartreuse + contour | **C** clubhouse |

**Total : 36 objets, dont 24 gratuits.** Chaque famille a au moins deux objets gratuits gagnés en
bougeant, et au moins un objet commercial. Un test refuse la moindre exception.

**Les deux titres de parrainage n'entrent PAS ici.** `referral_title_parrain` et
`referral_title_filleul` sont des **titres** (des mots sous le nom), pas des cosmétiques : la maison
des titres de saison (0121) exige une saison publiée, celle des titres de niveau (0144) un palier
libre dans un instantané gelé, et `titleBadge` n'est que la **typographie** du titre équipé. Ils
restent des octrois lus sur `/parrainage`, qui le dit. Détail dans 0191, note « LES DEUX TITRES ».

---

## 4. Ce qui sera vendu quand la boutique ouvrira, et à quel prix

**Aucun prix n'est codé par ce lot, et aucun nombre nouveau n'est proposé ici.** Les seuls tarifs qui
existent sont ceux du cahier §16.1, déjà présents dans `COMMERCIAL_PROPOSAL_2026`
(`packages/shared/src/game-rules.ts`) : un abonnement mensuel, un annuel, et trois collections
permanentes à trois paliers. Les prix **définitifs** viennent du Store et de sa localisation
(`storePrices.ts`) : un montant écrit en dur serait faux dès le premier joueur hors zone euro.

**Répartition proposée** (elle n'ajoute aucun palier, elle range les objets dans ceux qui existent) :

| Ce qui se vend | Objets concernés | Palier existant |
|---|---|---|
| **GRYD+** (abonnement) | Givre, Pulsation, Aurore (bannière), Néon, Affiche | mensuel / annuel de `COMMERCIAL_PROPOSAL_2026` |
| **Collection contour** | Lave, Courbes de niveau | palier bas des collections permanentes |
| **Collection relief** | Hexagone néon, Relief | palier intermédiaire |
| **Collection clubhouse** | Blason (pin), Gravé (titre) | palier haut |

**Deux règles qui ne se négocient pas :**

1. **Une collection permanente n'est jamais incluse dans l'abonnement** (§16.1). Le test SQL le
   vérifie : un abonné GRYD+ qui tente d'équiper « Lave » reçoit `cosmetic_not_unlocked`.
2. **Un objet obtenu reste acquis pour toujours**, y compris après la fin d'un abonnement (§7.5).
   La table d'équipement n'a aucune date d'expiration, et aucune migration n'en pose.

---

## 5. Ce qui garantit que rien de tout cela n'est du pay-to-win

- **Le catalogue ne peut pas porter un avantage.** `cosmetics2026.test.ts` refuse tout champ dont le
  nom évoque un bonus (`bonus`, `multipl`, `xp`, `score`, `points`, `boost`, `capture`, `m2`…) et
  borne les nombres à une échelle de rendu.
- **Les multiplicateurs payants valent 1.** Le même test relit `COMMERCIAL_PROPOSAL_2026` : capture,
  XP et défis à 1, aucune monnaie virtuelle.
- **La table d'équipement n'a que quatre colonnes** (`user_id`, `slot`, `item_id`, `equipped_at`) —
  le test SQL les compare une par une.
- **Équiper ne touche ni les XP, ni le registre, ni aucune possession** : le test SQL joue un
  équipement et compare le registre avant/après.
- **Le remplissage du territoire reste la chartreuse de possession.** Le cosmétique ne règle que le
  TRAIT : « ce terrain est à moi » est une information de jeu, pas une décoration.

---

## 6. Ce qui a été écarté, et pourquoi

| Piste | Pourquoi non |
|---|---|
| **Icône d'app alternative** (Snapchat+) | Ce sont des **assets** : chaque variante est un jeu d'images à toutes les densités, déclaré dans `app.json`. Ce n'est pas « que du code », et `app.json` est hors de ce lot. |
| **Badge « abonné »** (Twitch, Discord) | GRYD n'affiche pas **qui paie**. Un badge d'abonné transforme l'argent en statut social visible, ce qui est un pay-to-win symbolique — et il n'est utile que si l'on met en avant l'écart entre payants et gratuits. |
| **Dégradé « vitesse » sur la trace** | Il encode une **donnée** (l'allure), pas un style : c'est une lecture de performance, elle appartient aux statistiques, pas à un cosmétique. Techniquement il exigerait en plus `line-gradient` + `lineMetrics`, incompatible avec le pointillé. |
| **Pointillé décoratif sur la trace** | Le pointillé a déjà un sens sur la carte (affiliation de crew). L15 : un motif porte du sens, il n'en imite pas un. |
| **Bannière photo** | Contenu importé : stockage, modération, vie privée. Pour un décor, le prix est trop élevé. |
| **Cadre animé sur les listes sociales** | Une pulsation par ligne coûte plus qu'elle n'apporte. Le cadre garde sa forme et sa couleur dans les listes ; il ne pulse que sur le profil. |
| **Un cosmétique qui change la couleur d'un RÔLE sur la carte** (rival, contesté, protégé) | Ces couleurs sont une information de jeu. Les laisser choisir rendrait la carte illisible pour les autres — et mensongère pour soi. |

---

## 7. Où ça vit dans le code

| Rôle | Fichier |
|---|---|
| Catalogue pur (types, liste, obtention, états) | `apps/mobile/src/features/arsenal/cosmetics2026.ts` |
| Rendu SVG (nom, cadre, bannière, badge, aperçus, silhouettes de pin) | `apps/mobile/src/features/arsenal/CosmeticArt2026.tsx` |
| Lecture et écriture partagées | `apps/mobile/src/features/arsenal/useMyCosmetics2026.ts` |
| Écran « Personnalisation » (segment de `/arsenal`) | `apps/mobile/src/features/arsenal/CosmeticsPanel2026.tsx` |
| Seuils de niveau, liste des emplacements | `packages/shared/src/game-rules.ts` (section « COSMÉTIQUES 2026 ») |
| Table, RPC d'équipement, vérification serveur | `supabase/migrations/0180_profile_cosmetics_2026.sql` |
| Lecture publique (5 emplacements sur 7) | `supabase/migrations/0181_profile_cosmetics_public_read_2026.sql` |
| Preuves | `apps/mobile/src/features/arsenal/cosmetics2026.test.ts` · `supabase/tests/profile_cosmetics_2026.pglite.test.mjs` |

**Vie privée** : la lecture publique ne sort que cinq emplacements. Le **style de trace** et le
**thème de partage** restent privés — la trace d'un tiers n'est jamais servie à un autre joueur, et
le thème voyage avec l'image exportée, pas avec la fiche d'un membre. Aucun champ nouveau ne décrit
une personne : ce sont des identifiants de rendu, comme `avatarPath`.
