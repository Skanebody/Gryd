/**
 * GRYD — enregistrement de la tâche GPS background au démarrage de l'app
 * (AMENDEMENT-15 §2). expo-task-manager exige que defineTask soit exécuté au
 * chargement du bundle pour qu'une relance HEADLESS (app tuée, service Android
 * encore vivant) retrouve sa tâche — d'où cet import de provider.ts depuis
 * app/_layout.tsx. Variante .web.ts VIDE : le bundle web ne voit jamais
 * expo-location/expo-task-manager (la simulation démo reste intacte).
 */
// DÉFENSIF : `require` sous try/catch plutôt qu'un `import` statique. Un throw à
// l'IMPORT de expo-location / expo-task-manager (module natif absent ou non lié)
// surviendrait AVANT le try/catch interne de provider.ts, et tuerait l'app au
// démarrage — écran de splash puis fermeture, sans aucun message.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./provider');
} catch (e) {
  console.warn('[GRYD] chaîne GPS background indisponible au démarrage', e);
}
