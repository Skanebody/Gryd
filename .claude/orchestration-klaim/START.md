# START — protocole d'exécution

1. Lire `PROGRESS.md` → première tâche non-done.
2. Lire la tâche dans `PHASES.md`, la spec (sections citées), DISCOVERY.md (décisions liées).
3. Implémenter. Constantes depuis `packages/shared/src/game-rules.ts` uniquement.
4. Tester : `deno test` (functions), `npm run typecheck`, build de l'app touchée.
5. Mettre à jour PROGRESS.md, commit (message français, préfixe `P1.x:`).
6. Régression de fin de phase : tout re-tester avant de passer à la phase suivante.

Escalade : 3 tentatives max sur une erreur → noter le blocage dans PROGRESS.md, passer à la tâche suivante non bloquée.
