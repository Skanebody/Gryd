# GRYD — SALVAGE (liste blanche, version hybride ADR-001)

> Périmètre : ce que l'UI legacy (`apps/mobile/app`, `src/features/*` écrans) a le
> DROIT de fournir à la nouvelle UI. Le moteur/backend conservés ne sont PAS du
> salvage (ADR-001). Récupération = copier → adapter → tester, jamais d'import
> depuis un chemin d'écran legacy. **Statut : À VALIDER PAR BELOU.**

| Source exacte | Quoi | Où ça va |
|---|---|---|
| `packages/shared/src/design-tokens.ts` | tokens (couleurs, spacing, typo, elevation) | conservé tel quel (hors UI) — chartreuse : ADR-008 |
| `apps/mobile/src/ui/Icon.tsx` + jeu d'icônes | pictos | nouvelle UI, copie |
| `apps/mobile/src/features/map/mapStyle.ts` | style carte sombre + trace héros (casing/core, largeurs par zoom) | nouvelle carte, copie adaptée |
| `apps/mobile/src/i18n/catalog/*` | clés FR/EN uniquement (de/es/pt gelés) | `locales/fr.json` + `en.json`, extraction |
| `brand/` | assets de marque | inchangé |
| `apps/web` (Next.js waitlist + légal) | base du site public zones/crews | évolue en place (Phase 3) |
| `apps/mobile/src/features/run/gps/**` (service + buffer + reprise) | never-lose-a-run éprouvé | à ARBITRER en Phase 1 : copie vs réécriture — c'est de la plomberie, pas un écran |

Non récupérables par principe (MASTER 0.b-4) : écrans, navigation, stores d'écran, hooks d'UI.
