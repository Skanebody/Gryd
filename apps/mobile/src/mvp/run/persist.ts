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
 * ─── LE TEMPS MORT : CE QUE LE CHRONO N'A PAS LE DROIT DE COMPTER ───────────
 *
 * Le chrono de la course était `Date.now() - startedAt`. À la reprise d'une
 * course tuée, `startedAt` est celui de la course d'ORIGINE — donc une sortie
 * interrompue à 20 min et rouverte 3 h plus tard affichait 3 h 20, et servait
 * cette durée comme stat locale. C'est un mensonge au sens strict du MASTER :
 * l'app affirmait un temps que personne n'a couru.
 *
 * ─── LA MODÉLISATION, ET POURQUOI CELLE-LÀ ──────────────────────────────────
 * Le seul instant dont on ait une PREUVE est le dernier relevé écrit sur le
 * disque : après lui, plus rien n'a été mesuré. L'écart entre ce relevé et la
 * reprise est donc du temps mort — pas « probablement », par construction.
 *
 * Deux imprécisions assumées, et elles vont TOUTES LES DEUX dans le même sens
 * (afficher moins, jamais plus) :
 *   · les ~5 s de trace non encore flushées (`FLUSH_INTERVAL_MS`) au moment du
 *     kill sont comptées comme mortes ;
 *   · le temps entre le dernier relevé et le kill lui-même l'est aussi.
 * Se tromper dans l'autre sens rendrait au chrono des heures qui n'ont pas été
 * courues — exactement le défaut qu'on corrige.
 */

/** Une valeur de durée relue du disque est-elle croyable ? */
function dureeCroyable(ms: number | undefined): number {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms <= 0) return 0;
  return ms;
}

/**
 * Temps mort TOTAL d'une course qu'on reprend, à l'instant `now`. PURE.
 *
 * Cumule ce qui avait DÉJÀ été mesuré (`deadMs`, écrit sur le disque) et
 * l'écart de CETTE reprise. Le cumul est toute la raison de persister le champ :
 * sans lui, une deuxième interruption rendrait au chrono les heures de la
 * première.
 *
 * Sans AUCUN relevé, le dernier instant connu est le départ : rien ne prouve
 * qu'une seconde ait été courue, et on ne l'invente pas.
 */
export function resumedDeadMs(stored: StoredRunShape, now: number): number {
  const deja = dureeCroyable(stored.deadMs);
  const dernier = stored.fixes[stored.fixes.length - 1];
  const dernierInstantConnu = dernier === undefined ? stored.startedAt : dernier.ts;
  const ecart = now - dernierInstantConnu;
  // Horloge qui recule, horodatage aberrant : on ne retranche que ce qu'on sait
  // mesurer. Un écart négatif ALLONGERAIT le chrono.
  if (!Number.isFinite(ecart) || ecart <= 0) return deja;
  return deja + ecart;
}

/**
 * Durée ACTIVE : le temps au mur, moins le temps mort. PURE.
 *
 * C'est elle que le chrono affiche et que la stat de fin annonce — jamais
 * `now - startedAt`. Bornée à zéro : une durée négative (horodatages
 * incohérents) s'afficherait « −00:12 » et donnerait une allure absurde.
 */
export function activeElapsedMs(startedAt: number, deadMs: number, now: number): number {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return 0;
  const actif = now - startedAt - dureeCroyable(deadMs);
  return actif > 0 ? actif : 0;
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
  /**
   * Temps MORT déjà mesuré (ms) — voir `resumedDeadMs`. OPTIONNEL : une course
   * écrite par une version antérieure n'en porte pas, et c'est un FAIT (« aucun
   * temps mort n'a été enregistré »), pas un zéro par défaut.
   */
  readonly deadMs?: number;
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
