/**
 * GRYD — ANGLES DE CAMÉRA de la vue 3D (AMENDEMENT-24 §1).
 *
 * Ce fichier s'appelait `demo3d.ts` et portait deux choses très différentes :
 * la SIGNATURE VISUELLE de la 3D GRYD (l'inclinaison et le cap de la caméra) et
 * une GÉOMÉTRIE FABRIQUÉE (le scénario République). Renommé et vidé de la
 * seconde le 21/07/2026 (AMENDEMENT-47).
 *
 * Ce qui reste est un choix de RENDU, pas une donnée : deux angles. Ils ne
 * décrivent aucune course, aucun territoire, aucun joueur — ils disent
 * seulement sous quel angle une carte 3D se regarde pour que le relief se lise.
 * C'est pour ça qu'ils sont partagés par toutes les surfaces 3D : le look est
 * le même partout, quel que soit le tracé réel affiché dessous.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ ────────────────────────────────────────────────────
 * · `carte3dLayers()` — les couches de jeu d'une conquête INVENTÉE : une zone
 *   « conquise » extrudée sur la boucle République, une zone RIVALE orange rue
 *   du Faubourg-du-Temple, et la trace d'un run que personne n'a couru.
 * · `CARTE_3D_CAMERA` — le cadrage figé sur cette scène.
 * · `ShareMap3D.tsx`, leur unique consommateur, supprimé en même temps :
 *   `share/templates.tsx` avait déjà cessé de le monter (une carte de partage
 *   doit montrer LE run partagé, pas une maquette), ce qui le laissait orphelin.
 *
 * Une vue 3D se cadre désormais sur SON tracé réel (`history/demoRuns.ts` →
 * `traceCamera`), jamais sur une scène pré-écrite.
 */

/** Inclinaison signature de la carte 3D (caméra pitchée ~55°, AMENDEMENT-24 §1). */
export const CARTE_3D_PITCH = 55;
/** Léger cap pour que la perspective ne soit pas frontale (relief de volume). */
export const CARTE_3D_BEARING = -18;
