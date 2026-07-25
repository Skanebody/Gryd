# Refonte visuelle — Vague 1 (Direction « Night Print »)

Source : projet Claude Design `Vague 0 : Analyse du cahier des charges`
(`claude.ai/design/p/7f3d9ca2-…`). Importé via la MCP DesignSync le 25/07/2026.

## Fichiers de référence
- `planches.html` — les 15 planches d'écrans maîtres **E01 → E15** (décodé du `.dc.html`).
  Non rendu tel quel (dépend du runtime `support.js` de Claude Design) : c'est la
  spécification visuelle par écran, lue au fil de l'implémentation.
- Fondations + cahier des charges : dans le projet Claude Design (Fondations.dc.html,
  uploads/GRYD_CAHIER_DES_CHARGES_VISUEL_COMPLET_2026, PARTAGE_SOCIAL_OPTIMISE_STRAVA).

## Système de tokens Night Print (« B amendée ») — implémenté dans `packages/shared/src/design-tokens.ts`
Palette (échelle CARBONE, remplace #B4FF0D / noir plat) :
- carbon-1000 `#060807` (immersif/live/splash) · 950 `#0A0D0C` (fond) · 900 `#101412`
  (surfaces profondes) · surface-800 `#171C19` (cards/sheets) · surface-700 `#202622`
  (surélevé/désactivé) · line-600 `#313934` (séparateurs).
- **chartreuse `#C9FF38`** (pressé `#AEEB1F`, quota 8–10 %) — action/propriété.
- Rôles : rival-orange `#FF7043` · contested-violet `#8A70FF` · protected-blue `#4A8DFF`
  · prestige-gold `#FFC857` · danger-red `#FF4D57` · success-mint `#5CE6A8`.
- Texte : `#F5F7F4` / `#AEB7B0` / `#778079`.

Type : Inter Tight (titres/chiffres) · Inter (interface) · JetBrains Mono (labels), tabular-nums.
Spacing base-8 · rayons concentriques (btn primaire 18, card 20, sheet 28) · tactile 44/48,
CTA 56 / live 60 · 7 états de territoire (jamais d'hexagone visible) · 7 icônes propriétaires monoline.

## Plan d'implémentation (phasé — un chantier = un commit, gate + revue)
- [x] **Phase 1a — Fondation COULEUR** : palette Night Print dans `colors`/`gameColors`
  (noms de tokens conservés → re-skin auto de toute l'app). Preview vérifiée.
- [ ] Phase 1b — Fonts (Inter Tight / Inter / JetBrains Mono chargées) + échelle typo + rayons concentriques.
- [ ] Phase 1c — Système cartographique (7 états) + icônes propriétaires.
- [ ] Phases 2+ — Écrans E01→E15, un par chantier, en mappant chaque planche à l'écran RN
  réel + les **nouveaux boutons**, dans le respect de l'honnêteté (données réelles/vides)
  et de l'épuration §A. Ordre suggéré du doc : E01 → E10 puis E11 → E15.

> Contrainte maintenue : la refonte est VISUELLE ; elle ne fabrique aucune donnée, ne
> promet rien au-delà du code, et garde les états honnêtes (pas connecté / vide / échec /
> en cours / prêt). « conformité §14 » = note sous chaque planche du doc source.
