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

// 1. Surveiller tout le monorepo (packages/shared inclus).
config.watchFolders = [workspaceRoot];
// 2. Résoudre les node_modules de l'app puis ceux de la racine (hoisting npm).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
