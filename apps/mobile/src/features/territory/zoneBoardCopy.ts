/**
 * GRYD — LA COPIE DU CLASSEMENT DE ZONE, dérivée du MONDE regardé.
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * `ZoneLeaderboard` rendait `zoneBoardEmpty` — « Aucun classement tant que
 * personne n'a COURU ici. » — sans condition, y compris sur `/territoire`, qui
 * porte le commutateur de discipline et affiche « À vélo » quatre blocs plus
 * haut. L'écran se contredisait donc lui-même : un cycliste y lisait, sur la
 * même page, la portée « à vélo » en en-tête et un verbe de course en pied.
 *
 * La règle est déjà posée à côté (`territoryBuild.dataNote`, 26/07/2026) : une
 * phrase qui NOMME l'effort se décline par monde ; une phrase déjà neutre n'a
 * pas de jumelle — la dupliquer à l'identique créerait deux vérités à maintenir.
 * C'est exactement le partage ici : `zoneBoardTitle` (« CLASSEMENT DE ZONE »)
 * ne nomme aucun effort et reste UNIQUE ; seule la ligne d'absence se décline.
 *
 * Le module est PUR (zéro import React Native) pour que Deno le charge tel quel
 * et que la dérivation soit testée sans rendu, comme `pageState.ts` à côté.
 */
import type { Activity } from '@klaim/shared';
import { C } from '../../i18n/catalog/map';
import { resolve, type Entry, type Locale } from '../../i18n/types';

/**
 * L'Entry à rendre quand aucun palmarès n'existe pour la zone, dans le monde
 * REGARDÉ. `activity` est OBLIGATOIRE : un défaut ferait retomber en silence
 * sur la course, ce qui est précisément le bug corrigé.
 */
export function zoneBoardEmptyEntry(activity: Activity): Entry {
  return activity === 'bike' ? C.zoneBoardEmptyBike : C.zoneBoardEmpty;
}

/** Même dérivation, déjà résolue — pour les appelants purs (tests, modules). */
export function zoneBoardEmptyLine(activity: Activity, locale: Locale): string {
  return resolve(zoneBoardEmptyEntry(activity), locale);
}
