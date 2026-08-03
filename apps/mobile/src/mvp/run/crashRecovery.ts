/**
 * GRYD — DÉCLENCHEUR DE REPRISE APRÈS CRASH (LOT 2.3, 27/07/2026).
 *
 * ─── LE DÉFAUT CORRIGÉ (AUDIT_GRYD.md) ──────────────────────────────────────
 * La trace GPS d'une course interrompue par un kill process SURVIT déjà :
 * `lib/runStore.ts` la flushe périodiquement (`run_autosave`, §8) sous
 * `gryd.activeRun.v1` / `.current.v1`, et `course-live` sait très bien la
 * reproposer — `useRealRunCore.ts` charge ce buffer à SON montage et rend
 * `RestoreRunCard` (« {distance} — reprendre ou enregistrer telle quelle ? »,
 * copie déjà i18n 5 langues dans `i18n/catalog/runGps.ts`).
 *
 * Le trou n'est PAS dans cette mécanique : il est dans ce qui y MÈNE. Rien
 * n'atteint `course-live` au relancement de l'app — seul un nouveau « GO »
 * tapé par le joueur y navigue. Un joueur qui rouvre GRYD après un crash
 * retombe sur ses tabs, ignore que sa sortie est encore sur le disque, et n'a
 * aucune raison de retaper GO pour la « redécouvrir ». Spec §25.3 : « Activité
 * active → app tuée → relance → RÉCUPÉRATION → suite → résultat sans perte » ;
 * E00 : « activité active retrouvée : aller directement à la récupération ».
 *
 * ─── CE QUE CE MODULE FAIT, ET NE FAIT PAS ──────────────────────────────────
 * PUR (aucune I/O, aucune horloge interne — `now` est INJECTÉ, comme partout
 * dans le moteur) : il décide seulement si une session interrompue MÉRITE
 * ENCORE d'interrompre le lancement de l'app pour être proposée. Le chargement
 * réel du buffer (AsyncStorage, via `lib/runStore.ts`) et la navigation
 * (`expo-router`) restent dans `app/_layout.tsx`, qui compose ce module avec
 * `runStore.loadActiveRun`/`loadCurrentRun`.
 *
 * Cette séparation n'est pas cosmétique : `runStore.ts` importe
 * `@react-native-async-storage/async-storage`, un module dont les types ne se
 * résolvent PAS sous le runtime Deno qui fait tourner `test:mobile`
 * (`deno test --allow-read --allow-env apps/mobile/src`) — vérifié empirique-
 * ment, un simple `import type { StoredRun } from './runStore'` suffit à faire
 * échouer le typecheck de CE fichier avec les erreurs `AsyncStorage.getItem
 * does not exist`. Un seul appel à `runStore` ici ferait donc échouer le gate
 * Deno pour la totalité de `apps/mobile/src`, pas seulement pour ce chantier.
 * `runGuard.ts` (boutique pendant une course) suit déjà exactement le même
 * principe pour la même raison — voir sa réduction `probeFromStoredRun`.
 *
 * La reprise RÉELLE (fusionner la trace, envoyer le payload) reste entièrement
 * dans `useRealRunCore.ts` / `RestoreRunCard` : ce module ne fait QUE décider
 * s'il faut y ENVOYER le joueur au lancement, jamais reprendre ou clôturer une
 * course lui-même.
 */

/**
 * Réduction minimale d'un `StoredRun` (runStore.ts) à ce que la décision de
 * reprise a besoin de savoir. AUCUNE position, AUCUNE discipline : la décision
 * « faut-il proposer ? » ne dépend que de la fraîcheur et du contenu du
 * buffer, jamais d'où le joueur a couru.
 */
export interface InterruptedRunSnapshot {
  /** UUID local de la course — pas utilisé par la décision, gardé pour traçabilité côté appelant. */
  readonly runId: string;
  /** Départ de la course interrompue (epoch ms). */
  readonly startedAt: number;
  /** Horodatages (epoch ms) des points bruts déjà enregistrés. */
  readonly fixTimestamps: readonly number[];
}

/**
 * Silence maximal (ms) au-delà duquel une session interrompue n'est PLUS
 * proposée au lancement. Ce n'est PAS une règle de jeu — elle ne décide ni
 * claim, ni point, ni distance — donc elle ne vit pas dans `game-rules.ts`
 * (même principe que `RUN_LIVE_MAX_SILENCE_MS` de `runGuard.ts`, qui documente
 * la même distinction).
 *
 * Elle répond à une question différente de `RUN_LIVE_MAX_SILENCE_MS` (2 min :
 * « cette course tourne-t-elle encore MAINTENANT ? », utilisée pour fermer la
 * boutique pendant une sortie vivante). Ici la question est « cette session
 * mérite-t-elle ENCORE qu'on interrompe le lancement de l'app pour la
 * proposer ? ». 24 h couvre le cas visé par la spec — kill en pleine sortie,
 * relance le soir ou le lendemain matin — sans jamais ressurgir des semaines
 * plus tard sur une trace que le joueur a oubliée (une session aussi vieille
 * reste de toute façon clôturable manuellement : `discardStored` ne dépend pas
 * de cette fenêtre).
 */
export const CRASH_RECOVERY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Dernier horodatage d'activité connu d'une session (dernier fix, ou le départ
 * si la trace est vide). Jamais `NaN` en sortie si `startedAt` est fini.
 */
function lastActivityMs(snapshot: InterruptedRunSnapshot): number {
  let last = snapshot.startedAt;
  for (const ts of snapshot.fixTimestamps) {
    if (Number.isFinite(ts) && ts > last) last = ts;
  }
  return last;
}

/**
 * Une session interrompue donnée mérite-t-elle d'être proposée en reprise ?
 * PURE.
 *
 * `null` (rien à charger — buffer absent, DONC déjà envoyée ou jamais
 * commencée : `runStore.clearActiveRun` retire la clé dès l'upload réussi ou
 * mis en file) → jamais proposée.
 *
 * `fixTimestamps.length <= 1` → session VIDE au sens du jeu : un seul point
 * (le départ) sans aucun mouvement enregistré n'est pas une course perdue,
 * c'est un GO annulé avant le premier pas. Même seuil que `useRealRunCore.ts`
 * (`stored.fixes.length > 1`) pour rester cohérent avec ce que l'écran de
 * course traite déjà comme « une vraie course interrompue ».
 *
 * Horodatage dans le FUTUR (horloge remise à l'heure, buffer corrompu) → non :
 * on ne conclut rien d'un âge négatif, comme `runGuard.isRunLive`.
 *
 * Silence au-delà de `CRASH_RECOVERY_MAX_AGE_MS` → non : trop vieille pour
 * interrompre le lancement, mais elle reste sur le disque et restera
 * clôturable à la main au prochain GO (comportement de `course-live`,
 * inchangé par ce module).
 */
export function shouldProposeCrashRecovery(
  snapshot: InterruptedRunSnapshot | null,
  now: number,
): boolean {
  if (snapshot === null) return false;
  if (snapshot.fixTimestamps.length <= 1) return false;
  if (!Number.isFinite(snapshot.startedAt) || !Number.isFinite(now)) return false;
  const ageMs = now - lastActivityMs(snapshot);
  if (!Number.isFinite(ageMs) || ageMs < 0) return false;
  return ageMs <= CRASH_RECOVERY_MAX_AGE_MS;
}

/**
 * Décision finale consommée par `_layout.tsx` : au lancement, DEUX buffers
 * peuvent coexister (`ACTIVE_RUN_KEY` et `CURRENT_RUN_KEY` — cf. runStore.ts,
 * cas du « 2ᵉ kill pendant qu'une reprise attendait déjà »). Il suffit qu'UN
 * SEUL des candidats mérite d'être proposé pour déclencher la navigation —
 * `course-live` refait ensuite sa PROPRE réconciliation complète des deux clés
 * (elle est déjà correcte, ce module ne la duplique pas).
 */
export interface CrashRecoveryNavigationDecision {
  /** Faut-il envoyer le joueur vers l'écran de reprise dès le lancement ? */
  readonly shouldNavigate: boolean;
}

export function decideCrashRecoveryNavigation(
  candidates: readonly (InterruptedRunSnapshot | null)[],
  now: number,
): CrashRecoveryNavigationDecision {
  return { shouldNavigate: candidates.some((c) => shouldProposeCrashRecovery(c, now)) };
}
