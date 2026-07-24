/**
 * GRYD — cœur PUR du journal local des courses (aucun import : Deno-testable).
 * Séparé de runJournal.ts, qui ajoute les I/O AsyncStorage (module RN que Deno ne
 * résout pas). Voir runJournal.ts pour le POURQUOI (série locale hors-ligne/pré-O1).
 */

/** Borne mémoire : bien au-delà de la fenêtre de calcul de série. */
export const RUN_JOURNAL_CAP = 400;
/** Rétention (≈ 400 jours). Borne LOCALE de stockage, pas une règle de jeu. */
export const RUN_JOURNAL_RETAIN_MS = 400 * 86_400_000;

/**
 * Ajoute un timestamp de course (ms) et élague : on retire les entrées non finies,
 * futures, ou plus vieilles que la rétention ; on trie du plus récent au plus
 * ancien ; on borne au CAP. PURE — `now` injecté, jamais Date.now() implicite.
 */
export function appendRun(existing: readonly number[], atMs: number, now: number): number[] {
  const cutoff = now - RUN_JOURNAL_RETAIN_MS;
  // Set : dédoublonne les timestamps identiques (enregistrement idempotent — une
  // même course ne doit jamais compter double dans la série).
  const merged = [...new Set([...existing, atMs])].filter(
    (t) => Number.isFinite(t) && t > cutoff && t <= now,
  );
  merged.sort((a, b) => b - a);
  return merged.slice(0, RUN_JOURNAL_CAP);
}
