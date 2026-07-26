/**
 * GRYD — CE QUI PASSE DE LA COURSE AU RÉSULTAT (E14, vélo réel — 26/07/2026).
 *
 * ─── LE DÉFAUT QUE CE MODULE EXISTE POUR RENDRE IMPOSSIBLE ─────────────────
 * `RealCourseLive.finish()` construisait son objet `params` à la main, et il y
 * mettait `mode`, `dist`, `dur`, `queued` — mais PAS la discipline, alors
 * qu'elle était dans sa portée deux cents lignes plus haut. Conséquence exacte :
 * `/course-result` lisait `parseStartActivity(undefined)`, retombait sur la
 * discipline déclarée par défaut du jeu (`run`), et un cycliste lisait
 * « COURSE TERMINÉE » à la fin de CHAQUE sortie — sur l'écran le plus vu du
 * jeu, celui qui ferme l'effort. Les vingt libellés vélo du catalogue
 * (`RESULT_COPY.bike`) et les raisons de refus vélo existaient déjà : elles
 * étaient simplement inatteignables. Un mot oublié dans un objet littéral
 * suffisait à annuler tout un chantier.
 *
 * ─── POURQUOI UNE FONCTION PLUTÔT QU'UNE LIGNE DE PLUS ─────────────────────
 * Une ligne rajoutée dans un objet littéral au milieu d'un composant React
 * n'est vérifiable par rien : ni le typage (les params d'`expo-router` sont un
 * dictionnaire libre), ni un test (le composant n'est pas exécutable sous
 * Deno). Le passage de relais devient donc une fonction PURE, et un test prouve
 * que la discipline SURVIT à l'aller-retour sérialisation → relecture. Sans
 * ça, le défaut renaît en silence à la première refonte de l'écran.
 *
 * Ce module ne lit RIEN (ni carte, ni stockage, ni réseau) : la discipline lui
 * est DONNÉE par la sortie qui se termine, jamais devinée — l'interdit du
 * 25/07 (une préférence d'affichage ne décide pas de la nature d'un effort)
 * tient aussi sur le chemin du retour.
 */
import type { Activity } from '@klaim/shared';
import { START_ACTIVITY_PARAM } from './runActivity';

/**
 * Ce qu'une sortie TERMINÉE transmet à son écran de résultat. Tout est MESURÉ
 * ou DÉCLARÉ — aucune valeur estimée en cours de route (zones, fermeture,
 * progression) ne franchit cette frontière : le Résultat lit le verdict SERVEUR.
 */
export interface FinishedRunHandoff {
  /** Mode de course demandé au départ (`conquete` / `social_run` / `course_privee`). */
  readonly mode: string;
  /** DISCIPLINE RÉELLEMENT ENREGISTRÉE — celle que le préflight a montrée. */
  readonly activity: Activity;
  /** Mètres MESURÉS par le tracker. */
  readonly distanceM: number;
  /** Secondes MESURÉES par le tracker. */
  readonly durationS: number;
  /** Fin hors-ligne : le payload attend son envoi (note discrète, anti-shame). */
  readonly uploadQueued: boolean;
}

/**
 * Les paramètres de `/course-result`. Chaînes uniquement : `expo-router` les
 * sérialise dans l'URL, et une valeur non textuelle y perdrait son type de
 * toute façon — autant que la conversion soit explicite et testée.
 *
 * LA DISCIPLINE EST TOUJOURS ÉCRITE, y compris quand c'est la course à pied.
 * Ailleurs (`withStartActivity`) on omet le défaut, et c'est volontaire : il
 * s'agit d'URL existantes qu'on ne veut pas changer. Ici la relation est neuve
 * et INTERNE — un paramètre présent se relit, se teste et se lit dans un log,
 * là où une absence oblige à savoir par cœur ce que « rien » veut dire.
 */
export function courseResultParams(run: FinishedRunHandoff): Record<string, string> {
  return {
    mode: run.mode,
    [START_ACTIVITY_PARAM]: run.activity,
    // Arrondis à l'entier : ce sont des mètres et des secondes, pas des
    // flottants d'accumulateur — et l'écran les réaffiche formatés.
    dist: String(Math.round(run.distanceM)),
    dur: String(Math.round(run.durationS)),
    // Absent plutôt que « 0 » : l'écran teste `queued === '1'`, et une clé
    // toujours présente inviterait à lire un faux booléen.
    ...(run.uploadQueued ? { queued: '1' } : {}),
  };
}
