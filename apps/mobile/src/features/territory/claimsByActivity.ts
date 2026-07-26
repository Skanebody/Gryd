/**
 * GRYD — LES DEUX MONDES, SÉPARÉS À LA SOURCE (E14 ; le vélo est réel, 26/07/2026).
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * `hex_claims` a une clé primaire COMPOSITE `(h3index, activity)` depuis la
 * migration 0070 (appliquée en production le 25/07). Un joueur qui court ET qui
 * roule occupe donc DEUX lignes pour un même hexagone, et ces deux lignes
 * peuvent avoir des propriétaires différents.
 *
 * Les surfaces qui portent le commutateur E14 (Carte, Classement, Historique,
 * Statistiques) bornent leur lecture en SQL (`.eq('activity', …)`). Les surfaces
 * qui n'en ont PAS — Profil, /territoire, widget — n'ont pas de lentille à
 * appliquer : elles ne doivent pour autant ni choisir en silence (le défaut
 * `run` faisait dire « tu n'as jamais rien pris » à un cycliste), ni fondre les
 * deux mondes (ce serait la somme interdite : deux lignes pour une même
 * parcelle de ville).
 *
 * Elles lisent donc TOUT et SÉPARENT ICI. Le point capital est que ce module
 * ne fait JAMAIS de total : il rend deux listes de lignes qui ne se touchent
 * pas, et chacune est ensuite bâtie par son propre `buildTerritories`. Deux
 * géométries indépendantes, jamais une union.
 *
 * ─── PUR, DONC TESTÉ ────────────────────────────────────────────────────────
 * Zéro React, zéro réseau, zéro horloge : Deno le charge tel quel.
 */
import { ACTIVITIES, type Activity } from '@klaim/shared';
import type { HexClaimRow } from '../map/territoryBuild';

/**
 * Une ligne de `hex_claims` AVEC sa discipline. La colonne est `not null` et
 * contrainte à `('run','bike')` (0070:103-104) — on la type quand même en
 * `string` : le typage de la réponse réseau est une PROMESSE, pas une preuve, et
 * ce module doit rester juste même si la base répondait autre chose.
 */
export type HexClaimRowWithActivity = HexClaimRow & { activity: string };

/** Les deux mondes, toujours présents — un monde vide est un FAIT, pas une absence. */
export interface ClaimsByActivity {
  rows: Readonly<Record<Activity, HexClaimRow[]>>;
  /**
   * Lignes dont la discipline est ILLISIBLE (valeur hors `ACTIVITIES`). La
   * contrainte SQL les rend impossibles ; si elles arrivaient quand même, les
   * ranger « dans la course à pied » fabriquerait du territoire, et les jeter en
   * silence en effacerait. On les COMPTE, et l'appelant décide d'en parler.
   */
  unknownCount: number;
}

/**
 * Range chaque capture dans SON monde. Aucune addition, aucun repli : une
 * discipline inconnue n'est ni convertie ni oubliée, elle est comptée à part.
 */
export function splitClaimsByActivity(
  rows: readonly HexClaimRowWithActivity[],
): ClaimsByActivity {
  const out = {} as Record<Activity, HexClaimRow[]>;
  for (const a of ACTIVITIES) out[a] = [];
  let unknownCount = 0;
  for (const row of rows) {
    if (!(ACTIVITIES as readonly string[]).includes(row.activity)) {
      unknownCount += 1;
      continue;
    }
    out[row.activity as Activity].push(row);
  }
  return { rows: out, unknownCount };
}
