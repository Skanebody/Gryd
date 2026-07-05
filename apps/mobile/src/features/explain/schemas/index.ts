/**
 * GRYD — Schémas pédagogiques d'explicabilité (AMENDEMENT-23 §B.3 / doc §31).
 * 6 composants SVG propriétaires, PURS (aucun état, aucune dépendance runtime),
 * responsive (`size` = largeur px, hauteur suit le viewBox), charte dark/chartreuse.
 * Réutilisables par la page « Comment GRYD calcule tes zones », la FAQ et le post-run.
 * RÈGLE D'OR : les valeurs chiffrées affichées sont des SCÉNARIOS DÉMO passés en
 * props (défauts = exemples du doc) ; les vraies constantes (DEFENSE_HOURS_*,
 * VERIFY_FULL_MIN…) sont injectées par les PAGES via labels dérivés de game-rules.ts.
 * Aucune animation (statiques) → conformes reduce motion par construction.
 */
export type { SchemaBaseProps } from './types';

export { LigneVsBoucle } from './LigneVsBoucle';
export type { LigneVsBoucleProps } from './LigneVsBoucle';

export { BoucleFaitLaZone } from './BoucleFaitLaZone';
export type { BoucleFaitLaZoneProps } from './BoucleFaitLaZone';

export { DefenseFrontiere } from './DefenseFrontiere';
export type { DefenseFrontiereProps } from './DefenseFrontiere';

export { BoucleCollective } from './BoucleCollective';
export type { BoucleCollectiveProps, Contributor } from './BoucleCollective';

export { BonusCible } from './BonusCible';
export type { BonusCibleProps } from './BonusCible';

export { VerifySchema } from './VerifySchema';
export type { VerifySchemaProps } from './VerifySchema';
