// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/index.ts

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
// Géométrie POLYGONALE des territoires (spec §1.4) — H3 n'est plus qu'un index
// spatial interne. Aucune dépendance : ni h3-js, ni game-rules.
export * from './polygon.ts';
export * from './boundary.ts';
// Soutien de crew (A-48) : « la course ouvre, l'argent habille ». N'ouvre QUE
// des emplacements cosmétiques — aucune sortie de ce module n'entre jamais dans
// la capture, la défense, le decay, le scoring ou le classement.
export * from './crewSupport.ts';
// Les TROIS OFFRES (free · plus · pro) : « les faits sont gratuits,
// l'interprétation est payante ». N'ouvre QUE de la lecture et des outils —
// aucune sortie n'entre jamais dans la capture, la défense ou le classement.
export * from './offer.ts';
export * from './coverage.ts';
export * from './zone.ts';
export * from './sectors.ts';
export * from './sectorSnapshot.ts';
// Contestation & défense §9 (lot 3) : règles PURES du modèle TEMPOREL — une
// boucle rivale ouvre une contestation, le propriétaire a une fenêtre pour
// défendre, le transfert n'a lieu qu'à l'échéance. Remplace (et n'empile pas)
// le vol instantané de claim_hexes — cf. le tableau de réexpression du docblock.
export * from './contest.ts';
// Classement §10.1/§10.2 (lot 8) : la métrique est une SURFACE (m² dérivés de
// la géométrie serveur), pas un point. Coexiste avec `scoring.ts` — points et
// XP restent la PROGRESSION (§10.5), la surface est le CLASSEMENT.
export * from './leaderboard.ts';
// Anti-triche §11 (lot 9) : SCORING PUR multi-signal → PASS /
// PASS_WITH_EXCLUSIONS / MANUAL_REVIEW / REJECT. N'est encore appelé par aucune
// Edge Function (le câblage d'ingest_run est un lot suivant) — le docblock du
// module le dit, pour qu'aucune copie ne prétende qu'une revue « a lieu ».
export * from './anticheat.ts';
export * from './claims.ts';
export * from './crewJoin.ts';
export * from './scoring.ts';
export * from './engine.ts';
export * from './badges.ts';
export * from './skills.ts';
export * from './crew.ts';
export * from './crewMission.ts';
export * from './offensive.ts';
export * from './crewSignals.ts';
export * from './dailyZone.ts';
export * from './welcomeChallenge.ts';
export * from './raid.ts';
export * from './revanche.ts';
export * from './social.ts';
export * from './challenge.ts';
export * from './bonus.ts';
export * from './group.ts';
export * from './opportunities.ts';
export * from './route.ts';
export * from './activityScope.ts';
