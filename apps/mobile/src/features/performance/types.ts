/**
 * GRYD — FORMES d'affichage de la page Performance (AMENDEMENT-17 CHANTIER 3).
 *
 * Ce fichier s'appelait `demo.ts`. Il n'en reste que des TYPES : la forme d'un
 * point de graphe, d'un record perso, d'une ligne d'impact. Un type ne dit rien
 * sur le joueur — il dit seulement quelles cases un écran sait remplir. Renommé
 * le 21/07/2026 (AMENDEMENT-47) parce qu'un fichier « demo » qui ne contient
 * plus de démo envoie le prochain lecteur sur une fausse piste.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ ────────────────────────────────────────────────────
 * `PERFORMANCE` (et son type `PerformanceData`) : la page Performance entière
 * d'un joueur inventé — Score Forme 78 « en progression depuis 3 semaines »,
 * records personnels, courbe de 4 semaines, zones tenues. Elle n'avait plus
 * aucun appelant depuis la fin du mode vitrine (`performance/real.ts` lit les
 * vraies `runs`), mais elle restait le gabarit tout prêt d'un mensonge : des
 * records de course attribués à quelqu'un qui n'a peut-être jamais couru.
 *
 * Les valeurs affichées viennent désormais de `performance/real.ts` (lecture de
 * `runs`) et de `derive.ts` (agrégats purs). Aucune valeur ici.
 */

/** Un point de mini-graph (semaine → valeur). Un seul graph sur la page. */
export interface TrendPoint {
  /** Libellé court d'axe (« S-3 », « S-2 », « S-1 », « Cette sem. »). */
  label: string;
  /** Valeur brute (km) — l'échelle est calculée à l'affichage. */
  km: number;
}

/** Un record personnel : libellé, valeur formatée, sous-texte optionnel. */
export interface PerfRecord {
  key: string;
  /** Ce qui est mesuré (« 5 km », « 10 km », « Plus longue », « Série »). */
  label: string;
  /** Valeur déjà formatée pour l'affichage (« 26:40 », « 12,8 km »). */
  value: string;
  /** Contexte discret (« il y a 2 sem. ») ou vide. */
  meta?: string;
  /** true = record battu récemment → pastille chartreuse discrète. */
  fresh?: boolean;
}

/** Une ligne d'impact GRYD : ce que la course a produit dans le jeu. */
export interface GrydImpactStat {
  key: string;
  /** Icône filaire @klaim/shared (Icon.tsx) — pas d'icône « territoire »
   *  dédiée : « carte » est la plus proche pour les zones tenues. */
  icon: 'carte' | 'bouclier' | 'route' | 'virage' | 'crew';
  /** Grand chiffre. */
  value: string;
  /** Vocabulaire varié (zones / frontières / routes…). */
  label: string;
}
