/**
 * GRYD — @klaim/engine : moteur de jeu PUR (validation §3.2, hexing §3.1,
 * claims §3.3/§3.4, scoring §3.4, badges AMENDEMENT-04). SOURCE DE VÉRITÉ
 * UNIQUE du moteur.
 *
 * Les Edge Functions Deno consomment les copies GÉNÉRÉES
 * supabase/functions/_shared/engine/*.ts (scripts/sync-game-rules.mjs,
 * drift testé) — ne jamais les éditer à la main.
 */
export * from './validation.ts';
export * from './gps.ts';
export * from './hexing.ts';
export * from './boundary.ts';
export * from './coverage.ts';
export * from './zone.ts';
export * from './sectors.ts';
export * from './sectorSnapshot.ts';
export * from './claims.ts';
export * from './crewJoin.ts';
export * from './scoring.ts';
export * from './engine.ts';
export * from './badges.ts';
export * from './skills.ts';
export * from './crew.ts';
export * from './raid.ts';
export * from './revanche.ts';
export * from './social.ts';
export * from './challenge.ts';
export * from './bonus.ts';
export * from './group.ts';
export * from './opportunities.ts';
export * from './route.ts';
