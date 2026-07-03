# ADDENDUM DESIGN — « KLAIM » v0.1
### Charte graphique & direction UI/UX — Noir · Blanc · Chartreuse #B4FF0D
*Complète la SPEC MVP v0.1. Référence : méthode et standards Outcrowd (outcrowd.io).*

---

## A. Ce qu'est exactement Outcrowd (analysé le 03/07/2026)

**Positionnement** : « Design & Brand Acceleration for SaaS Startups » — agence de branding + design + développement pour startups, avec des modèles d'engagement par stade (pre-seed/POC, seed/MVP, série A/optimisation).

**Leur catalogue de services (page /services)** :
1. **Branding** — Brand Strategy (naming, mission & valeurs, positionnement, vision, personas) + Brand Visual (moodboard, concept créatif, charte graphique, logotype).
2. **Digital Design** — Platforms (audit UX, wireframes, user flows, prototypage) ; Websites (expériences interactives, design system, art direction, responsive, UI kit) ; Mobile apps (research, UX design, prototypage, design system, visual design).
3. **Development** — full stack, front, back, intégrations, CMS/Webflow.
4. **Marketing Assets** — motion, logos animés, illustrations 2D/3D, launch videos.

**Leur méthode (FAQ)** : analyse → **wireframes obligatoires** (« essentiels, à ne jamais sauter ») → design → dev. Zéro template (« no soul in them »), tout custom. Kick-off en 1 semaine, projets de 2 semaines à 5 mois.

**Preuves sociales (leurs propres claims, non audités)** : 300 M$ levés par leurs clients, 60+ awards (Awwwards SOTD, FWA, CSSDA), 100 M d'utilisateurs actifs sur leurs produits ; 200 645 followers Dribbble, clients cités : Toyota, Dolby, McDonald's.

**Signature visuelle observée (Dribbble, shots 2025-26)** : dominance **dark-first** (« dark dashboard », « dark theme » sur la majorité des shots récents), un seul accent fort par projet, typographie bold, gros chiffres de data-viz, cartes arrondies sur fonds profonds, micro-interactions, discipline design system. Cas mobile le plus proche du nôtre : **Fitonist** (app de gym, Awwwards Site of the Day 2024).

---

## B. « Faire pareil ici » = transposer leur PROCESS, pas copier leurs écrans

Séquence Outcrowd appliquée au projet (insérée dans le plan de build) :

| Étape Outcrowd | Chez nous | Quand |
|---|---|---|
| Brand Strategy | Déjà fait (SPEC §0-§2 : positionnement, cible, promesse) | ✔ |
| Brand Visual / charte | **Ce document** (palette, typo, règles) | ✔ |
| Wireframes obligatoires | Low-fi des 9 écrans AVANT toute UI (papier/Excalidraw, 1 journée) | Semaine 1 |
| Design System / UI kit | `packages/shared/design-tokens.ts` + composants (section F) | Semaines 1-2 |
| Visual Design | Écrans hi-fi (maquette HTML livrée = référence) | Semaines 2-3 |
| Motion & assets | Section G + carte de partage | Semaines 5, 10 |

Règle héritée : **aucun écran ne se code sans wireframe validé.** C'est leur assurance anti-refonte, elle coûte 1 jour et en économise 10.

---

## C. Palette & règles de contraste (verrouillées)

### C.1 Tokens

| Token | Hex | Usage |
|---|---|---|
| `noir` | `#0A0B09` | Fond global (nuance chaude, pas #000 pur — évite le smearing OLED) |
| `carbone` | `#141613` | Surfaces, cartes |
| `carbone-2` | `#1D201B` | Surfaces élevées, inputs |
| `blanc` | `#FAFAF7` | Texte principal, icônes |
| `gris` | `#8A8F84` | Texte secondaire, labels |
| `gris-ligne` | `blanc à 8-12 %` | Bordures 1 px, séparateurs |
| `chartreuse` | `#B4FF0D` | Accent unique |
| `chartreuse-14` | `#B4FF0D à 14 %` | Remplissage de MON territoire |
| `chartreuse-40` | `#B4FF0D à 40 %` | Contours de territoire, glows |

### C.2 Mathématique du contraste (WCAG, calculée — non négociable)
- Chartreuse sur noir : **≈ 17:1** → AAA. Noir sur chartreuse : idem. ✔
- Blanc sur noir : 21:1. ✔
- **Chartreuse sur blanc : ≈ 1,2:1 → interdit absolu** (illisible). Jamais de texte ou d'icône chartreuse sur fond clair, nulle part (app, site, stores, print).
- Conséquence : l'écosystème entier est **dark-first** (app, site waitlist, share cards, pitch sponsors). Le blanc est de l'encre, pas un fond.

### C.3 Doctrine d'usage du chartreuse (la rareté fait la valeur)
Le chartreuse est réservé à exactement 4 emplois : **(1) moi et mon crew sur la carte, (2) l'action primaire (1 seul CTA par écran), (3) les gains** (+hexes, +points, streak), **(4) l'état « en direct »** (course en cours, progress). Tout le reste vit en noir/blanc/gris. Si un écran contient plus de ~10 % de surface chartreuse, il est faux.

---

## D. Direction artistique de la carte — **AMENDEMENT-01 à la SPEC §3.5**

**Décision : rendu égocentré monochrome + accent** (remplace les 12 couleurs de crews de la v0.1).

- **Mon territoire / mon crew** : remplissage `chartreuse-14`, contour `chartreuse-40`, cœur de cluster avec glow léger.
- **Territoires adverses** : remplissage `blanc 6 %` + **motif distinctif par crew** (hachures 45°, pointillés, croisillons — 8 motifs) + label du crew en mono. La différenciation se fait par motif + étiquette, pas par teinte.
- **Neutre** : contour `blanc 5 %` seul. **Verrouillé (lock 24 h)** : contour pointillé animé. **Bouclier** : double contour blanc.
- Fond de carte : style vectoriel sombre custom (routes `blanc 7 %`, eau `#0D1112`, parcs `blanc 3 %`), aucun POI commercial.

**Pourquoi** : (1) chaque capture d'écran devient un asset de marque — la boucle de partage EST le branding ; (2) daltonien-safe par construction (différenciation par luminance/motif, pas par teinte — supprime le point faible signalé sur INTVL, couleurs confondues) ; (3) esthétique « radar de nuit » qui incarne la conquête ; (4) lisibilité : une seule question visuelle — *à moi ou pas à moi*.
**Coût assumé** : l'identité-couleur des crews disparaît → compensée par motif + emblème + nom. Si la bêta montre une perte d'attachement crew, bascule possible vers « chartreuse pour moi + 1 teinte unique pour mon crew » sans refonte (le rendu est un style de couche).

---

## E. Typographie — **AMENDEMENT-03 (03/07/2026) : alignement sur la typo Outcrowd**

> Relevé sur outcrowd.io : body + h1-h3 en **ITC Avant Garde Gothic Std** (Md pour titres/UI, Bk pour paragraphes, variantes BkCn/MdCn/XLtObl), **Lora** 300-700 en éditorial. Space Grotesk/Inter sont abandonnées.

| Rôle | Fonte | Usage |
|---|---|---|
| Display | **ITC Avant Garde Gothic Std Md** 500/700 *(fallback libre : Josefin Sans)* | Titres, gros chiffres (tabulaires), tracking -2 % |
| Texte | **ITC Avant Garde Gothic Std Bk** 400 *(fallback libre : Josefin Sans)* | UI, paragraphes, labels |
| Éditorial | **Lora** 400/500 + italique | Citations, longform, pages légales |
| Utilitaire | **Space Mono** 400 | Coordonnées, timers, codes crew, étiquettes carte (exception fonctionnelle — Avant Garde n'a pas de chasse fixe) |

⚠️ **Licence** : ITC Avant Garde Gothic Std est commerciale (Monotype ; dispo via Adobe Fonts/MyFonts). Aucun fichier non licencié dans le repo — emplacements `@font-face` préparés (`apps/web/app/fonts/README.md`), Josefin Sans sert d'équivalent libre en attendant. Budget à prévoir avant lancement public.

Échelle (mobile) : 12 / 14 / 16 / 20 / 28 / 40 / **64-88 (stats héros)**. Les chiffres géants sont la signature typographique (héritée des dashboards Outcrowd) : chaque écran de résultat a UN chiffre qui domine.

---

## F. Composants (UI kit v0)

- **Cartes** : `carbone`, radius 20, bordure `gris-ligne` 1 px, padding 20. Jamais d'ombre portée colorée.
- **Bouton primaire** : pill 56 px, fond chartreuse, texte noir 600 — 1 par écran max. **Secondaire** : ghost, bordure `gris-ligne`, texte blanc. **Destructif** : ghost blanc + libellé explicite (pas de rouge : la palette est tri-couleur stricte ; l'urgence s'exprime par le mot, l'icône et le motion).
- **Bouton COURIR** (home) : disque 72 px chartreuse flottant bas-centre, halo pulsé 2 s.
- **Stop protégé** (in-run) : **maintenir 1,2 s pour terminer** avec anneau de progression — la protection anti-annulation devient un geste de marque.
- **Chips** : streak, ligue, badges — carbone-2, radius full, icône 16.
- **Barres de nav** : 3 onglets max (Carte · Classements · Profil), icônes filaires 1,5 px.
- **Toasts de gain** : slide-up noir, chiffre chartreuse, auto-dismiss 2,5 s.
- États vides : une phrase directive + un CTA (« Personne n'a encore pris ce quartier. Sois le premier. »). Les erreurs disent quoi faire, ne s'excusent pas.

## G. Motion & haptique (sobre, orchestré)

- **Le moment orchestré unique** : la célébration post-course — les hexes se remplissent en vague depuis le tracé (400 ms), le chiffre héros compte en accéléré (800 ms), haptique success, son signature < 1 s. Tout le reste de l'app reste calme.
- In-run : pulse chartreuse discret + haptique légère à chaque capture ; annonce audio toutes les 10 captures (pas à chaque hex).
- Transitions : 200-250 ms, ease-out. `prefers-reduced-motion` respecté partout (les vagues deviennent des fondus).
- Interdits : confettis permanents, parallax gratuit, skeletons chartreuse (les loaders sont gris).

## H. Assets de marque

- **Icône app** : hexagone chartreuse plein sur noir, aucune lettre (lisible à 29 px, unique sur une home screen).
- **Carte de partage 9:16** : fond noir, cluster chartreuse glowing, chiffre héros (+47), grain 2 % ; watermark logo bas ; générée aux couleurs exactes → chaque story est une pub.
- **Poster de fin de saison** : carte complète de la ville, territoire du joueur en chartreuse, données de saison en mono — format imprimable A3.
- **Stores** : screenshots sur fond noir, un bénéfice par slide en Space Grotesk 700, device flottant. Site waitlist Next.js : même charte, dark-first, hero = la carte animée.

---

## I. Trois mises en garde (mode sceptique)

1. **Collision Olise** : cette palette est déjà celle d'Olise (noir/chartreuse/off-white). Deux produits du portefeuille visuellement jumeaux = confusion de marque à terme. Options : assumer un « house style » commun (façon studio), ou décaler d'un cran (ex. chartreuse conservé mais typo/logo radicalement différents — c'est la voie prise ici via Space Grotesk + hexagone). **À trancher avant le dépôt de marque.**
2. **Noir + vert acide est une esthétique encombrée en 2026** (fintechs, Spotify-core, et l'un des looks « IA par défaut »). Le brief l'impose et il est excellent pour ce produit — mais la distinctivité ne viendra PAS de la palette : elle viendra de la carte égocentrée, des chiffres géants et du hold-to-stop. La palette est le costume, la carte est le visage.
3. **Outcrowd ≠ à cloner écran par écran** : leur corpus est surtout dashboards/sites marketing. Un écran de course se lit en mouvement à bout de bras — max 3 données, corps 40+, zéro décor. On prend leur discipline, pas leur densité.

---

## J. Intégration au plan de build

- Semaine 1 : `design-tokens.ts` (section C+E gelées) + wireframes des 9 écrans (jalon bloquant).
- Semaine 2-3 : UI kit (section F) + style de carte MapLibre custom (section D).
- Semaine 5 : célébration (section G). Semaine 10 : carte de partage (section H).
- Référence visuelle : `maquette-ui-klaim.html` (3 écrans clés, tokens exacts).

*Charte v0.1 — gelée pour la Saison 0. Toute couleur hors tokens = bug.*
