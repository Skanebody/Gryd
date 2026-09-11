# Le système de design du site public (lot W2)

Contrat pour le **lot pages (W3)**. Tout ce qui est ici existe, compile et a été vu en capture à
375, 768 et 1280 px sur l'export statique. Rien d'autre n'est à construire pour poser les huit
pages restantes.

**Source de contenu** : `docs/product/GRYD_SITE_CONTENU_2026_09.md`. Il fait foi, phrase par
phrase. Ne jamais écrire une phrase, un chiffre ou une promesse qui ne s'y trouve pas.

---

## 1. Les composants

`import { Section, Hero, … } from '../../components/ui';`

| Composant | Props | Ce qu'il fait |
|---|---|---|
| `SiteHeader` | aucune | Logo G + « Gryd », les cinq liens du plan, l'action `Télécharger`, le panneau mobile accessible, et le lien d'évitement vers `#contenu`. Composant **client**. |
| `SiteFooter` | aucune | Trois colonnes (marque, produit, légal et contact) + ligne de bas. Lit `lib/site2026.ts`. Aucune icône sociale. |
| `Hero` | `title`, `lead`, `primary?`, `secondary?`, `status?`, `photo?`, `children?` | Le `<h1>` de la page, découpé **une phrase par ligne**. `primary` est l'unique bouton chartreuse. `status` est la ligne d'état, sans emphase. |
| `Section` | `children`, `id?`, `kicker?`, `title?`, `headingLevel?`, `lead?`, `spacing?`, `className?` | Le rythme vertical et le `<h2>`. `id` pose l'ancre publique (`#bouger`, `#boucle`…). `spacing`: `normal` \| `tight` \| `flush`. |
| `FeatureCard` | `title`, `children?`, `index?`, `media?`, `footer?`, `className?` | Surface `#171717`, filet fin, rayon 22 px, **aucune ombre**. `media` se pose en haut. Jamais de carte dans une carte. |
| `StepList` | `items: { index, title, body, diagram? }[]` | Le geste en trois temps, en `<ol>`. Un schéma par étape. |
| `PhotoFigure` | `photo`, `ratio?`, `focusY?`, `caption?`, `sizes?`, `priority?`, `className?` | `<img>` + `srcset` des deux tailles réelles. `ratio`: `portrait` \| `tall` \| `square` \| `wide`. `priority` seulement sur la première image de la page. |
| `CtaButton` | `children`, `href?`, `variant?`, `type?`, `disabled?`, `className?` | `variant`: `primary` (chartreuse) \| `outline` \| `link`. Sans `href`, rend un `<button>`. |
| `Callout` | `title`, `children?`, `tone?` | L'encart d'état honnête. `tone`: `strong` \| `quiet`. |
| `FaqAccordion` | `entries: { question, answer }[]`, `group?` | `<details>` natifs. Aucun JavaScript, contenu présent dans le HTML exporté. |
| `Diagram` | `kind`, `label?`, `className?` | `kind`: `trace` \| `closure` \| `territory`. Les planches du guide de l'app, mêmes coordonnées. |
| `Stat` / `StatRow` | `value`, `label`, `rule`, `tone?` | Un chiffre et **la constante dont il sort**, posée en `data-rule` dans le DOM. `tone`: `inline` \| `block`. |
| `GrydMark` | `size?`, `color?`, `variant?`, `title?`, `className?` | Le G (`symbol`) ou le lettrage (`wordmark`) en SVG inline. `title={null}` rend le dessin décoratif. |
| `WaitlistForm` | `emailLabel`, `postalLabel`, `postalHelp`, `submitLabel`, `successMessage` | Le formulaire réel (RPC `waitlist_join`). Quatre états : repos, en cours, échec, succès. Composant **client**. |
| `JsonLd` | `data` | Un bloc `application/ld+json`. Le contenu vient de `lib/structuredData2026.ts`. |

### Ce qui n'existe pas, et pourquoi

- **Pas de composant fil d'Ariane.** Le plan du site est PLAT : neuf pages publiques, toutes
  filles de `/`. Un fil d'Ariane à deux niveaux (« Accueil > Les crews ») n'apporte rien qu'un
  en-tête collant ne donne déjà, et un `BreadcrumbList` en données structurées serait un quatrième
  bloc là où le cahier §3.10 en autorise trois. Pour le **sommaire interne** de
  `/comment-ca-marche/` (chapitres `01` à `07`), poser une navigation d'ancres :
  ```tsx
  <nav aria-label="Sommaire">
    <ol>{CHAPITRES.map((c) => <li key={c.id}><a href={`#${c.id}`}>{c.titre}</a></li>)}</ol>
  </nav>
  ```
- **Pas de composant carte, ni de maquette de téléphone.** Tant qu'aucune capture iOS n'est
  recettée, le site ne montre pas de faux écran (cahier §4.6). C'est la faute la plus facile à
  commettre, et la plus grave.
- **Pas de bascule de thème.** Le site est sombre, comme l'application.

---

## 2. La règle des CTA, et elle est dure

**UN SEUL `variant="primary"` visible par écran.** Le chartreuse ne décore pas : il désigne
l'action principale, et deux actions principales n'en font aucune.

| Emplacement | Variante | Pourquoi |
|---|---|---|
| Action de l'en-tête (`Télécharger`) | `outline` | Elle est collante, donc visible partout : en chartreuse, elle volerait son rôle à tous les héros du site. |
| Action principale du héros | `primary` | C'est le seul chartreuse du haut de page. |
| Action secondaire du héros | `outline` | |
| Renvoi de section (`Voir les crews`, `Lire le guide complet`) | `link` | Un renvoi n'est pas une décision. |
| Bouton de formulaire | `primary` | Seul second chartreuse toléré : il vit plusieurs écrans plus bas. |

Vérification : la capture d'une page, à 375, 768 et 1280 px, ne doit jamais montrer deux fonds
`rgb(180, 255, 13)` dans un même écran. Le script du lot W2 est dans le scratchpad
(`shots.mjs`) ; il compte les CTA visibles écran par écran, et mesure le débordement horizontal.

**Aucun bouton mort.** Pas de badge App Store (aucune fiche n'existe), pas de « S'abonner »
(rien n'est en vente), pas d'icône sociale (aucun compte n'existe).

---

## 3. Une page complète, de bout en bout

```tsx
/** GRYD — Les crews, `/crews/`. Copie : cahier de contenu §3.3. */
import type { Metadata } from 'next';
import { CtaButton, Hero, PhotoFigure, Section, SiteFooter, SiteHeader } from '../../components/ui';
import { SITE_PHOTOS } from '../../lib/photos2026';
import { SITE_ORIGIN } from '../../lib/site2026';

export const metadata: Metadata = {
  title: 'Les crews Gryd : courir à plusieurs pour de vrai',
  description:
    'Rejoins un crew par QR ou par code, crée le tien, organise des sorties et lance un défi de 7 jours à 5 contre 5. Aucun kilométrage imposé.',
  alternates: { canonical: `${SITE_ORIGIN}/crews/` },
};

export default function CrewsPage() {
  return (
    <>
      <SiteHeader />
      <main id="contenu">
        <Hero
          title="Un crew, c’est un petit groupe qui court vraiment ensemble"
          lead="Des amis, un club, un quartier. …"
          photo={SITE_PHOTOS.crewsHero}
        />
        <Section kicker="Rejoindre" title="Rejoindre" lead="Trois chemins, tous en un geste. …">
          <CtaButton href="/telecharger/" variant="link">Télécharger</CtaButton>
        </Section>
        <Section kicker="Gérer" title="Gérer" lead="Le tableau de bord montre qui est actif. …">
          <PhotoFigure photo={SITE_PHOTOS.crewsGerer} ratio="wide" />
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}
```

Trois obligations dans cet exemple :

1. `<main id="contenu">` — la cible du lien d'évitement de `SiteHeader`. Sans lui, le lien mène
   nulle part.
2. Un seul `<h1>` par page, et c'est celui de `Hero`.
3. Le gabarit ne rend NI en-tête NI pied : chaque page les compose. C'est voulu — `/admin/` a sa
   propre coque et `/callback/` reste une page d'arrivée sobre.

---

## 4. Ajouter une page

1. **Le dossier** : `app/<slug>/page.tsx`. L'URL publique porte un **slash final**
   (`trailingSlash: true`) : `/crews/`, jamais `/crews`. Écrire les `href` avec ce slash.
2. **Le lien** : ajouter la page à `PRIMARY_NAV` et/ou `FOOTER_PRODUCT` dans `lib/site2026.ts`.
   Une page absente de ce fichier n'est liée de nulle part.
3. **Les métadonnées** : `title` et `description` viennent du cahier §3, au caractère près (ils y
   sont comptés). `alternates.canonical` porte l'URL absolue avec son slash final. Le gabarit
   fournit déjà `metadataBase`, l'image sociale par défaut, `og:locale`, `lang="fr"` et le favicon :
   ne les redéclarer que si la page a sa propre image.
4. **Les chiffres** : jamais tapés. `import { TERRITORY_RULES_2026 } from '@klaim/shared'`, puis
   un `Stat` qui cite la constante en `rule`. La table de correspondance complète est au cahier
   §4.3. Les dates de la Saison 0 sont la seule exception : une copie unique dans
   `lib/season2026.ts`, à créer par le lot pages.
5. **La copie** : la poser en données dans `lib/<page>Copy2026.ts`, sur le modèle de
   `lib/homeCopy2026.ts`, et la relire avec un test sur le modèle de `lib/homeCopy2026.test.ts`
   (pas de tiret long, « GRYD » seulement dans `GRYD+`, tutoiement, aucun mot de l'ancien site).
   `npm run test:web` les exécute ; ils tournent sous Deno, donc **aucun import externe et un
   `Deno` déclaré localement** (voir l'en-tête du test existant).
6. **Les données structurées** : **trois blocs sur tout le site, pas un de plus**.
   `Organization` est déjà posé sur `/`. Restent `FAQPage` sur `/faq/` (les treize questions, texte
   IDENTIQUE à celui affiché) et `SoftwareApplication` sur `/telecharger/`. Les construire dans
   `lib/structuredData2026.ts` et les rendre avec `<JsonLd data={…} />`. Interdits partout :
   `Review`, `AggregateRating`, `BreadcrumbList`, `Event` et `Place` sans réalité derrière.
7. **`noindex`** : les trois pages d'arrivée (`/c/`, `/r/`, `/u/`) et `/callback/` portent
   `robots: { index: false, follow: false }`.

---

## 5. Les photographies disponibles

Toutes dans `apps/web/public/photos/`, en **deux tailles** :

- `<nom>.jpg` — 1080 × 1920, la source copiée à l'octet (le nom a été écrit pour le référencement) ;
- `<nom>-800.jpg` — 800 × 1422, JPEG qualité 78.

Le cahier §4.6 interdit de dépasser la qualité de la source : il n'existe donc PAS de variante
1600 px, qui serait un agrandissement plus lourd sans un pixel de détail en plus. `PhotoFigure`
écrit le `srcset` tout seul depuis `lib/photos2026.ts` ; ne jamais écrire une largeur à la main.

| Clef de `SITE_PHOTOS` | Fichier | Page prévue | Poids (1080 / 800) |
|---|---|---|---|
| `heroAccueil` | `gryd-duo-sprint-ville-lunettes-chartreuse` | Accueil, héros | 378 / 194 Ko |
| `crewAccueil` | `gryd-crew-course-montee-ville-foule` | Accueil, « Un crew, si tu veux » | 353 / 224 Ko |
| `guideOuverture` | `gryd-coureurs-vue-plongeante-paves` | Comment ça marche, ouverture | 389 / 333 Ko |
| `crewsHero` | `gryd-crew-femmes-cercle-selfie-ciel` | Crews, héros | 410 / 262 Ko |
| `crewsGerer` | `gryd-crew-pause-cafe-terrasse` | Crews, « Gérer » | 352 / 182 Ko |
| `saisonHero` | `gryd-foule-place-depart-collectif` | Saison, héros | 395 / 254 Ko |
| `offre` | `gryd-materiel-sol-apres-course-medailles` | `GRYD+` | 399 / 266 Ko |
| `securite` | `gryd-coureur-nuit-pluie-eclairs` | Sécurité et vie privée | 368 / 215 Ko |
| `faq` | `gryd-coureuse-lunettes-chartreuse-portrait-groupe` | Questions fréquentes | 342 / 168 Ko |
| `telecharger` | `gryd-duo-traversee-passage-pieton-pluie` | Télécharger | 365 / 186 Ko |
| `inviteCrew` | `gryd-groupe-hommes-course-pluie-brique` | `/c/<code>/` | 349 / 220 Ko |
| `parrainage` | `gryd-coureurs-vitesse-file-rue` | `/r/<code>/` | 365 / 187 Ko |

Le `alt` est DANS le manifeste : `<PhotoFigure photo={SITE_PHOTOS.faq} />` suffit. Il décrit la
scène, jamais la marque, et ne se réécrit pas sur place.

La douzième photographie de la photothèque
(`gryd-crew-course-montee-ville-foule-heros-profil.jpg`) reste à l'application : c'est le
recadrage du héros du Profil, et elle n'a pas été copiée côté web.

---

## 6. Les jetons

Tout est dans `app/globals.css`, et **aucun hex ne s'écrit ailleurs**.

| Rôle | Jeton | Valeur |
|---|---|---|
| Fond | `--gryd-carbon` | `#0A0A0A` |
| Surface | `--gryd-surface` | `#171717` |
| Surface haute, filets | `--gryd-surface-high` / `--gryd-hairline` | `#292929` |
| Texte | `--gryd-ink` | `#FAFAFA` |
| Texte secondaire | `--gryd-muted` | `#A3A3A3` (7,8:1 sur carbone) |
| Accent | `--gryd-accent` | `#B4FF0D` (16,3:1 avec du texte carbone) |
| Titres, chiffres | `--gryd-display` | Manrope |
| Texte | `--gryd-text` | Inter |
| Repères, numéros | `--gryd-mono` | JetBrains Mono |
| Rayon de carte | `--r-card` | 22 px |
| Rayon de bouton | `--r-control` | 23 px |
| Cible tactile | `--tap` | 44 px |
| Gouttière | `--gryd-gutter` | 20 px, 32 au delà de 768 |
| Largeur de page | `--gryd-max` | 1120 px |

Trois utilitaires globaux : `.grydContainer` (la largeur de page), `.grydSrOnly` (lu, pas vu),
`.grydSkipLink` (le lien d'évitement, déjà posé par `SiteHeader`).

`--gryd-steel` (`#777777`) est réservé au DÉCOR : 4,4:1 sur carbone, donc sous le seuil AA du
petit texte. Ne jamais l'employer pour du texte.

Le bloc « alias de compatibilité » en bas de `:root` (`--fond`, `--ch`, `--carbone`…) fait vivre
les pages que le lot W2 n'a pas touchées : les quatre pages légales, `/abonnement/` et `/admin/`.
**Il a vocation à disparaître quand le lot W3 aura repris ces pages.** Rien de neuf ne doit s'en
servir.

---

## 7. Ce qu'il reste à faire, et qui n'appartenait pas au lot W2

- Les huit pages du plan (`/comment-ca-marche/`, `/crews/`, `/saison/`, `/gryd-plus/`,
  `/securite-et-vie-privee/`, `/faq/`, `/telecharger/`, et la mise en page des quatre pages
  légales dont **le texte ne change pas d'un mot**).
- `404.html` en routeur pour `/c/`, `/r/`, `/u/` (cahier §2.2) : trois pages `noindex`, sans appel
  réseau, avec un `<noscript>` qui dit la vérité et renvoie vers `/telecharger/`.
- `lib/season2026.ts` : la seule copie des deux dates de la Saison 0.
- **`/abonnement/` n'est dans aucun plan de site.** Elle vend encore « GRYD Club » et le
  « Founder Pack », que le cahier de contenu déclare morts, et elle reste dans l'export statique
  donc indexable. Elle n'appartenait pas au lot W2 (qui ne touche ni `app/abonnement/` ni
  `app/components/`) : à supprimer par le lot pages ou le lot recette, pas à oublier.
- `app/components/` (ancien) : `ui/Icon.tsx`, `landing/Reveal.tsx` et `landing/ui.module.css` sont
  encore lus par les pages légales et `/abonnement/`. Le reste de `landing/` n'est plus importé par
  rien depuis la refonte de l'accueil, `PostHogProvider` et `app/lib/analytics.ts` non plus depuis
  que le gabarit ne charge plus de script tiers : tout cela part avec ces pages.
