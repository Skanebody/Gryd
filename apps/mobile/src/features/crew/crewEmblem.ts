/**
 * GRYD — L'EMBLÈME D'UN CREW : la colonne `crews.color` rendue VISIBLE.
 *
 * ═══ POURQUOI CE FICHIER EXISTE (et pourquoi il ne peint PAS une couleur) ═══
 * `create_crew` (0042 → 0097) exige un `p_color` entier dans
 * `0 .. CREW_COLORS_COUNT-1`, et le stocke. Jusqu'ici l'app l'envoyait au
 * HASARD (`randomCrewColor`) et ne le relisait JAMAIS : le fondateur d'un crew
 * ne choisissait rien, et ne voyait rien de son choix. L'en-tête de 0097 en
 * tirait la conséquence juste pour l'époque — « un sélecteur de couleur serait
 * un contrôle sans effet visible : la définition d'un bouton mort, doublé du
 * mensonge "ton crew est vert" ».
 *
 * Cette objection vise la COULEUR, et elle reste entièrement valable : la
 * charte GRYD n'a qu'un accent (`colors.chartreuse`, ADR-008), la carte
 * différencie les crews adverses « par motif, JAMAIS par teinte »
 * (design-tokens `foePatterns`, 8 motifs), et douze teintes inventées
 * casseraient les deux à la fois.
 *
 * Ce que la valeur devient donc ici est un EMBLÈME, pas une couleur : la
 * variante géométrique du blason `CrewCrest`, qui dérive déjà 2-3 formes
 * déterministes d'une graine. Le nombre stocké ne change pas, la colonne ne
 * change pas, le serveur ne change pas — c'est la LECTURE de ce nombre qui
 * existe enfin. Le contrôle n'est plus mort : la même graine rend le même
 * blason à l'aperçu de création et sur la page du crew.
 *
 * ═══ AUCUN NOMBRE MAGIQUE ═══════════════════════════════════════════════════
 * Le compte vient de `CREW_COLORS_COUNT` (game-rules), qui est aussi la borne
 * que le SQL vérifie (`p_color < 12`, 0097). Une divergence entre les deux ne
 * peut donc pas naître ici.
 *
 * ═══ PUR ═══════════════════════════════════════════════════════════════════
 * Aucun React, aucun réseau, aucune couleur : des entiers et une chaîne.
 */
import { CREW_COLORS_COUNT } from '@klaim/shared';

/** Les valeurs acceptées par `create_crew.p_color`, dans l'ordre d'affichage. */
export const CREW_EMBLEMS: readonly number[] = Array.from(
  { length: CREW_COLORS_COUNT },
  (_unused, index) => index,
);

/** Emblème proposé par défaut quand le joueur n'a encore rien choisi. */
export const CREW_EMBLEM_DEFAULT = 0;

/**
 * L'entier stocké est-il un emblème que ce build sait rendre ?
 *
 * Un crew créé par une version future (ou par une écriture serveur qu'on ne
 * connaît pas) peut porter une valeur hors bornes. On ne la corrige PAS en
 * silence : `isCrewEmblem` dit non, et l'appelant choisit de ne rien afficher
 * plutôt que d'afficher le blason de quelqu'un d'autre.
 */
export function isCrewEmblem(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < CREW_COLORS_COUNT;
}

/**
 * Graine `CrewCrest` d'un emblème.
 *
 * ⚠ ELLE NE DÉPEND QUE DE L'EMBLÈME, et c'est le point : l'aperçu de création
 * a lieu AVANT que le crew ait un identifiant. Une graine qui contiendrait
 * `crew.id` rendrait donc un blason à la création et un AUTRE juste après —
 * l'aperçu mentirait sur ce qu'on est en train de choisir. Deux crews qui
 * prennent le même emblème partagent la même géométrie : ce qui les distingue
 * reste leurs initiales (le nom), exactement comme un blason standard
 * (cahier §G17 : « Le blason standard suffit »).
 */
export function crewEmblemSeed(emblem: number): string {
  return `gryd-crew-emblem-${emblem}`;
}
