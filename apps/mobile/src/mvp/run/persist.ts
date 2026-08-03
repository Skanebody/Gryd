/**
 * GRYD — NEVER-LOSE-A-RUN : quand écrire, et quoi faire de ce qu'on retrouve.
 * PUR (lot M5b).
 *
 * ─── L'ARBITRAGE QUE SALVAGE LAISSAIT OUVERT, TRANCHÉ ───────────────────────
 * SALVAGE annonçait un choix pour `features/run/gps/**` : copie ou réécriture.
 * L'audit tranche autrement, et c'est mieux : on RÉUTILISE la plomberie et on
 * RÉÉCRIT la surface.
 *
 * Ce qui est réutilisé, `lib/runStore.ts`, n'est pas un écran — c'est un buffer
 * AsyncStorage à TROIS clés dont chacune répond à un cas que je me serais
 * trompé à redécouvrir :
 *   · `activeRun`  — la course en cours ;
 *   · `current`    — la NOUVELLE course quand une reprise est encore en
 *     attente : un 2ᵉ kill ne doit pas perdre la seconde sortie sous prétexte
 *     que la première n'a pas été arbitrée ;
 *   · `bgFixes`    — les points reçus par la tâche background quand l'app est
 *     relancée sans écran vivant.
 * Et il stocke des `RawFix` CANONIQUES — la forme exacte qu'`ingest_run`
 * attend. Réécrire ce buffer aurait produit une trace à reconvertir plus tard.
 *
 * Ce qui n'est PAS repris : `useRealRunCore.ts` (677 lignes), `RealCourseLive`
 * (61 Ko), `RestoreRunCard` et leur navigation. La surface se réécrit.
 *
 * ─── POURQUOI CE MODULE N'IMPORTE PAS `runStore` ────────────────────────────
 * ⚠️ `runStore.ts` importe `@react-native-async-storage/async-storage`, dont
 * les types ne se résolvent PAS sous le runtime Deno qui fait tourner
 * `test:mobile`. Un seul `import type` depuis ce fichier ferait échouer le gate
 * pour la TOTALITÉ de `apps/mobile/src` — pas seulement pour ce module.
 * (`crashRecovery.ts` documente exactement le même piège, payé avant moi.)
 *
 * Ici vivent donc les DÉCISIONS, sur des formes structurelles ; les appels au
 * stockage restent dans les écrans, qui ne sont pas type-checkés par Deno.
 */
import {
  shouldProposeCrashRecovery,
  type InterruptedRunSnapshot,
} from './crashRecovery';

/**
 * Écriture au plus tous les `FLUSH_INTERVAL_MS`.
 *
 * Pas à chaque point : à 1 fix/seconde, écrire la trace entière à chaque fois
 * fait grossir le coût en O(n²) sur une heure de course — et l'écriture se
 * paye sur le thread qui dessine. Pas trop rare non plus : ce qui n'est pas
 * écrit est ce qu'un crash emporte. Cinq secondes = au pire cinq secondes de
 * trace perdues, soit une vingtaine de mètres.
 *
 * Constante d'UI/robustesse, pas de jeu : elle ne décide aucun claim.
 */
export const FLUSH_INTERVAL_MS = 5_000;

/**
 * Faut-il écrire maintenant ? PURE.
 *
 * `lastFlushAt === null` = rien n'a jamais été écrit → OUI, immédiatement.
 * C'est le cas qui compte le plus : une course tuée dans ses dix premières
 * secondes ne doit pas disparaître parce qu'on attendait le premier intervalle.
 */
export function shouldFlush(
  lastFlushAt: number | null,
  now: number,
  pendingFixes: number,
): boolean {
  // Rien de neuf à écrire : réécrire à l'identique n'apporte rien et coûte.
  if (pendingFixes <= 0) return false;
  if (lastFlushAt === null) return true;
  if (!Number.isFinite(lastFlushAt) || !Number.isFinite(now)) return true;
  const depuis = now - lastFlushAt;
  // Horloge qui recule (changement d'heure, NTP) : on écrit plutôt que de
  // conclure « c'était il y a -3 s, on attend ». Se tromper vers l'écriture
  // coûte une I/O ; l'inverse coûte la course.
  if (depuis < 0) return true;
  return depuis >= FLUSH_INTERVAL_MS;
}

/**
 * Ce que l'écran d'accueil doit faire d'une course retrouvée sur le disque.
 *
 *   · `none`   — rien à proposer.
 *   · `resume` — une vraie course interrompue attend : on le DIT, et on offre
 *     de la rouvrir. C'est tout l'objet de « never-lose-a-run » : une trace qui
 *     survit sans que personne ne le sache est perdue quand même.
 */
export type RecoveryOffer = 'none' | 'resume';

/**
 * Forme minimale d'une course stockée, réduite à ce dont la décision a besoin.
 * Structurelle À DESSEIN : `StoredRun` ne peut pas être importé ici (voir
 * l'en-tête), et la décision n'a de toute façon besoin ni des positions, ni de
 * la discipline, ni du mode.
 */
export interface StoredRunShape {
  readonly startedAt: number;
  readonly fixes: readonly { readonly ts: number }[];
}

/** `StoredRun` → la réduction que `crashRecovery` sait juger. PURE. */
export function toSnapshot(
  runId: string,
  stored: StoredRunShape | null,
): InterruptedRunSnapshot | null {
  if (stored === null) return null;
  return {
    runId,
    startedAt: stored.startedAt,
    fixTimestamps: stored.fixes.map((f) => f.ts),
  };
}

/**
 * Y a-t-il une course à reproposer ? PURE.
 *
 * Prend les DEUX buffers (`activeRun` et `current`) parce qu'ils peuvent
 * coexister — cf. `runStore.ts`, cas du 2ᵉ kill pendant qu'une reprise
 * attendait déjà. Il suffit qu'UN seul mérite d'être proposé.
 */
export function recoveryOffer(
  candidates: readonly (InterruptedRunSnapshot | null)[],
  now: number,
): RecoveryOffer {
  return candidates.some((c) => shouldProposeCrashRecovery(c, now)) ? 'resume' : 'none';
}
