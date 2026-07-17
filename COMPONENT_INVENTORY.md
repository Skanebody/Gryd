# GRYD — COMPONENT_INVENTORY.md

> Inventaire des composants UI et des duplications. Cible : un composant canonique par rôle.

## Résumé exécutif

37 composants partagés existent dans `apps/mobile/src/ui`, mais **la couche partagée est
contournée** : le bouton primaire chartreuse est **recodé 21 fois** malgré `InlineRunCTA`, le
bouton secondaire **17 fois** malgré `GhostButton`, le carré d'icône **12+ fois**, le label de
section **dans 30 fichiers**. Résultat : **9 écrans > 800 lignes**, **4 composants du design
system orphelins** (exportés, jamais utilisés). La correction commence par **extraire/adopter 10
composants** avant de toucher aux écrans.

## Composants partagés existants (échantillon des rôles clés)

| Composant | Rôle | État |
|---|---|---|
| `InlineRunCTA` | CTA de lancement de course (chartreuse) | sain — mais 6 usages seulement |
| `GhostButton` | bouton secondaire bordé | sain — 21 usages, mais 17 recodes à côté |
| `Icon` | famille d'icônes unique | sain (cf. [ICON_AUDIT.md](ICON_AUDIT.md)) |
| `Segmented` | groupe de choix | sain — sous-adopté (faq recode) |
| `StackScreen` | gabarit d'écran empilé + BackBar | sain — barre à 14 px à corriger |
| `ShareCard` | carte de partage exportable | sain (mode héros récent) |
| `Toast` / `ShareToast` / `BoundaryToast` | notification transitoire | 3 implémentations à unifier |
| `RunButton`, `ContextualRunButton`, `FloatingActionButton` | boutons | **orphelins (morts)** |

## Composants à CRÉER ou ADOPTER (ordre de priorité)

| # | Composant | Statut | Remplace / adopte |
|--:|---|---|---|
| 1 | **`Button`** (variants `primary`/`ghost`/`raised`, sizes `lg`/`md`) | créer (fusion `InlineRunCTA`+`GhostButton`) | 21 recodes primaires + 17 secondaires ≈ **38 sites** |
| 2 | **`Card`** (N1 borderless, `elevation.surface`+`radii.card`, padding `default`/`compact`) | créer | 76 cards encadrées `grisLigne` → dissout ~40 bordure-dans-bordure |
| 3 | **`IconPlate`** (carré d'icône, `radii.control`) | créer | 12+ recodages (RunHistoryCard, sources, PerkCard, ChestCard, warroom…) |
| 4 | **`SectionHeader`** (kicker R1 + « Voir tout ») | créer | 30 fichiers avec `sectionLabel` local |
| 5 | **`StatBlock`** (valeur R6 + label R1) | créer | course-live, course-result, performance, profil |
| 6 | **`EmptyState`** (icône + titre + sous-titre) | créer | amis, historique, crew-discovery, badges… (états vides muets) |
| 7 | **Kit `settings/`** (`SelectPills`/`TogglePill`/`SwitchRow`/`SettingsRow`/`Section`) | créer (fusion) | `motivation/ui.tsx` + `privacy/ui.tsx` + parametres |
| 8 | **`Toast`** (promotion) | promouvoir l'existant | `ShareToast` + `BoundaryToast` |
| 9 | **`Segmented`** (adoption) | existant | faq recode `:312` |
| 10 | **`verifyPill`** (déplacer en partagé) | déplacer | `course/[id].tsx:69` |

### API proposée — `Button` (le plus structurant)

```ts
type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'raised'; // primary=chartreuse/noir · ghost=bordure/blanc · raised=N2/blanc
  size?: 'lg' | 'md';                         // lg=56 · md=48 (sizes.buttonLg/buttonMd)
  icon?: IconName;                            // leading, optionnelle
  loading?: boolean;                          // spinner in-button, label préservé
  disabled?: boolean;                         // opacité 0.5
  // rayon de famille : radii.pill (choisi par 21/22 implémentations) — À TRANCHER vs 16/14 de InlineRunCTA
  // label = typography.button (R5) ; minHeight 44 + hitSlop auto sous 48 ; pressed scale 0.97
};
```

**Décisions à trancher avant l'extraction** (fondateur) :
- **Rayon de la famille bouton** : `pill` (21/22 des implémentations) **ou** `radii.card`/`control`
  (InlineRunCTA à 16, boutons de partage à 20). Recommandation : `pill`.
- **Hauteur `md`** : 48 ou 52 (les deux existent). Recommandation : 48.
- **`InlineRunCTA` conservé à part** : le lancement de course garde son comportement propre
  (adjustsFontSizeToFit, cible haptique) — `Button primary` ne le remplace PAS.

## Spécialisés à conserver (ne PAS fusionner)

- **Capsule GO** (`GrydNavBar`) : décision fondateur gelée, spec propre.
- **`InlineRunCTA`** : lancement de course (au-dessus).
- **`AppleButton`** : contraintes de marque Apple Sign-In.

## Écrans > 800 lignes (à découper après extraction)

`crew.tsx` (~3400), `course-result.tsx`, `course-live.tsx`, `arsenal.tsx`, `onboarding/index.tsx`,
`warroom.tsx`, `profil.tsx`, `BattleMapOverlays.tsx`, `course/[id].tsx`. Le découpage vient **après**
l'extraction des composants (sinon on déplace du code dupliqué).

## Extractions anti-drift (3, hors UI mais liées)

- **`hexGeometry`** : la géométrie hexagonale est recodée ×6 (PlayerAvatarFrame, CrewCrest,
  AvatarHex, PlayerCardAvatar, CrewFrame, BadgeHex).
- **`StateIcon`** : forme+picto d'état de zone recodée ×2 (Map, légende).
- **`withAlpha`** : implémenté 4 fois — garder **uniquement** `@klaim/shared` (cf.
  [colors, UI_AUDIT.md](UI_AUDIT.md)). Piège : `scaleAlpha` (mapStyle) régexe le format `rgba`
  **sans espaces** — le shared produit **avec** espaces ; aligner avant de dédupliquer.

## Purge (après OK fondateur)

Supprimer les 4 orphelins : `RunButton`, `ContextualRunButton` (disque), `FloatingActionButton`
(+ vérifier `SourceTrustCard`, partagée mais jamais branchée — `sources.tsx` la recode).
