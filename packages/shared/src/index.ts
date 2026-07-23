export * from './game-rules';
export * from './design-tokens';
export * from './events';
export * from './types';
export * from './badges';
export * from './skills';
export * from './bonuses';
export * from './badge-icons';
export * from './arsenal-icons';
export * from './france-geo';
export * from './icons';
export * from './sectorName';
export * from './streak';
export * from './habits';
export * from './season';
// Moteur PUR du référentiel de villes (recherche, disque d'aire de jeu).
// ⚠️ `cities-eu.ts` — la DONNÉE (7 870 villes, 346 Ko / 177 Ko gzip, MESURÉS sur
// le fichier livré) — n'est VOLONTAIREMENT
// pas ré-exportée ici : sinon le moindre `import … from '@klaim/shared'` la
// tirerait dans le bundle Metro. Elle s'importe explicitement, et seulement
// depuis un écran qui laisse choisir une ville : `@klaim/shared/cities-eu`.
export * from './cities';
