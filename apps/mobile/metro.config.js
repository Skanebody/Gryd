/**
 * GRYD mobile — config Metro monorepo (doc Expo « Work with monorepos »).
 * Le workspace npm hoiste les deps à la racine et `@klaim/shared` est un
 * package source (TS) : Metro doit surveiller la racine et résoudre les
 * modules aux deux niveaux.
 */
/* eslint-env node */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Surveiller tout le monorepo (packages/shared inclus) EN PLUS des défauts
// Expo (expo-doctor exige que les défauts soient conservés ; workspaceRoot est
// le parent de projectRoot donc il couvre l'app).
config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];
// 2. Résoudre les node_modules de l'app puis ceux de la racine (hoisting npm).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. supabase-js ≥ 2.71 fait un import() OPTIONNEL de '@opentelemetry/api'
// (télémétrie opt-in, peer optionnel volontairement NON installé — pas de lib
// sans besoin actif). Metro le résout statiquement et casse le bundle →
// module vide : le `.catch(() => null)` de supabase-js désactive la
// télémétrie, comportement identique à « non installé ».
const baseResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@opentelemetry/api') return { type: 'empty' };
  return baseResolveRequest
    ? baseResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
