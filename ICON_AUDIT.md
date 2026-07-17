# GRYD — ICON_AUDIT.md

> Audit de la famille d'icônes : `apps/mobile/src/ui/Icon.tsx` + `packages/shared/src/icons.ts`
> et les 323 appels `<Icon>` de `apps/mobile`.

## Résumé exécutif

**Bonne nouvelle** : GRYD a déjà **UNE seule famille** — le composant custom `Icon` alimenté par
les tracés SVG de `packages/shared/src/icons.ts` (stroke 1.5, round caps, viewBox 24×24). La règle
« une bibliothèque principale » est **déjà respectée** ; il ne faut surtout pas introduire Lucide
ou Material. Les défauts sont périphériques :

1. **Aucune échelle de tailles gelée** (P1) : 18 tailles littérales sur 323 appels, **31 % seulement**
   sur la cible 16/20/24.
2. **69 icônes en tailles impaires** (13/15/17/18/22/26) — toutes à 2 px d'un palier.
3. **6 glyphes texte + 1 SVG inline** hors famille (coche, kebab, play/pause recodés localement).
4. Émojis en **contenu de jeu** (légitimes) vs émojis en **chrome UI** (à surveiller).

## Histogramme des tailles (323 appels, 0 défaut — toujours explicite)

| Taille | Occ. | Sur cible ? | | Taille | Occ. | Sur cible ? |
|---:|---:|:--|---|---:|---:|:--|
| 16 | 72 | ✅ | | 15 | 37 | → 16 |
| 18 | 68 | → 20 | | 13 | 27 | → 12 |
| 14 | 43 | → 16 | | 12 | 7 | ✅ (xs) |
| 20 | 24 | ✅ | | 17 | 3 | → 16 |
| 22 | 17 | → 24 | | 26 | 3 | → 24 |
| 24 | 4 | ✅ | | 11 | 2 | → 12 |
| 40 | 5 | → 48 (display) | | 28/36/44/48/120 | 1 ch. | cas isolés |

**Sur cible (16/20/24) : 100 appels ≈ 31 %.** Migration mécanique couvrant 285/323 :
`11→12 · 13→12 · 14→16 · 15→16 · 17→16 · 18→20 · 22→24 · 26→24 · 28→24 · 40→48`.

## Consolidations

**CON-1 — Geler `iconSizes` (P1)** : token partagé + type strict (cf.
[DESIGN_TOKENS.md §3](DESIGN_TOKENS.md)).

```ts
export const iconSizes = { xs: 12, sm: 16, md: 20, lg: 24, display: 48 } as const;
// IconProps.size?: (typeof iconSizes)[keyof typeof iconSizes]  → refuse 13/15/17/18 à la compilation
```

**CON-2 — Ajouter 4 tracés manquants à `icons.ts`** (style famille : stroke 1.5, round, 24×24) :
`check` (coche seule), `options` (kebab ⋯ horizontal), `play`, `pause` (`play` remplissable pour
l'état actif). Débloque le remplacement des glyphes texte/SVG inline ci-dessous (9 occurrences).

**CON-3 — Éliminer les recodages hors famille** :
- `✕` / `⋯` / `✓` en `<Text>` dans plusieurs sheets → `Icon name="close|options|check"`.
- `PausePlayGlyph` (SVG local dans `RealCourseLive.tsx:251` et la démo) → `Icon name="play|pause"`.
- Vérifier les `size` d'icône **hors tokens** dans les mêmes fichiers.

## Émojis : contenu vs chrome

L'audit distingue deux usages — **ne pas tout supprimer** :
- **Légitime (contenu de jeu / copie)** : émojis dans des chaînes de texte de célébration, de
  badges, de messages. Ce sont des *données*, pas des icônes d'interface.
- **À remplacer (chrome UI)** : tout émoji jouant le rôle d'une icône d'action ou de statut dans
  un contrôle (bouton, pill, header). Ex. le cadenas `🔒` de la légende privacy (`partage.tsx`) est
  toléré car c'est une annotation, mais un émoji sur un CTA doit passer par `Icon`.

## Centrage optique

Vérifier l'alignement vertical `Icon`↔`Text` dans les rows où l'icône est posée sans conteneur
aligné (`alignItems: 'center'` manquant). Le centrage mathématique ne suffit pas : certaines
icônes de la famille (chevron, foulées) gagnent 1 px d'offset optique — à traiter au cas par cas
lors de l'extraction d'`IconPlate` (cf. [COMPONENT_INVENTORY.md](COMPONENT_INVENTORY.md)).

## Couleurs d'icônes

Conformes à la charte dans l'immense majorité : `color={colors.*}` / `gameColors.*` /
`roleColor(...)`. Aucune couleur d'icône hors tokens signalée en P1. Continuer à passer les
teintes d'état par `roleColor` (jamais un hex).
