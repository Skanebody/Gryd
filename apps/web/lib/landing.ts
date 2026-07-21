/**
 * Constantes d'AFFICHAGE de la landing — pas des règles de jeu §3
 * (celles-ci vivent dans @klaim/shared/game-rules).
 *
 * RÈGLE ABSOLUE (décision fondateur 21/07/2026, « l'app ne ment jamais ») :
 * ce fichier ne contient AUCUNE donnée fabriquée. Plus de leaderboards de crews
 * inventés, plus de « 30 crews inscrits · 1 240 runners en attente », plus de
 * flux « en direct » d'événements qui n'ont jamais eu lieu, plus de jauges de
 * remplissage par ville, plus de compteur de places restantes. Une étiquette
 * « démonstration » ne suffisait pas : sur une page publique, une preuve sociale
 * inventée est une allégation commerciale trompeuse.
 *
 * Ce qui reste ici est soit un FAIT VÉRIFIABLE (superficie IGN), soit de la
 * GÉOMÉTRIE pure qui sert à dessiner un schéma-légende (aucune valeur lisible
 * par le visiteur). Tout nombre affiché ailleurs sur la landing doit venir de
 * @klaim/shared (règle de jeu réelle) — sinon il ne s'affiche pas.
 */

/** Superficie de la France métropolitaine (km², IGN) — AMENDEMENT-02 §2 : France entière capturable. */
export const FRANCE_CAPTURABLE_KM2 = 551_695;

// ─── Schéma-légende : les quatre états d'une zone ────────────────────────────
// Grille d'hexagones purement ILLUSTRATIVE : elle sert de légende visuelle aux
// quatre états qu'une zone peut prendre dans le jeu (à moi / ennemi / contesté /
// neutre). Aucune ville, aucun crew, aucun chiffre — ce n'est pas un état du
// monde, c'est un code couleur.

export type HexOwner = 'crew' | 'enemy' | 'neutral' | 'contested';
export type LegendHex = { points: string; owner: HexOwner };

const HEX_R = 12;
const HEX_W = Math.sqrt(3) * HEX_R;
const PAD = 4;

/**
 * Ligne de front schématique (7 colonnes × 5 rangées) :
 * C = mon crew · E = ennemi · X = contesté · N = neutre.
 */
const SECTOR_LAYOUT = ['NNEEEEN', 'NCXEEEN', 'CCCXEEN', 'CCCCXEN', 'NCCCCXN'] as const;

const OWNER_BY_CHAR: Record<string, HexOwner> = {
  C: 'crew',
  E: 'enemy',
  X: 'contested',
  N: 'neutral',
};

function hexPoints(cx: number, cy: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = ((60 * i - 30) * Math.PI) / 180;
    pts.push(
      `${(cx + HEX_R * Math.cos(angle)).toFixed(1)},${(cy + HEX_R * Math.sin(angle)).toFixed(1)}`,
    );
  }
  return pts.join(' ');
}

function buildLegendGrid(): LegendHex[] {
  const hexes: LegendHex[] = [];
  SECTOR_LAYOUT.forEach((rowChars, row) => {
    for (let col = 0; col < rowChars.length; col++) {
      const owner = OWNER_BY_CHAR[rowChars.charAt(col)];
      if (!owner) continue;
      const cx = PAD + HEX_W / 2 + col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0);
      const cy = PAD + HEX_R + row * HEX_R * 1.5;
      hexes.push({ points: hexPoints(cx, cy), owner });
    }
  });
  return hexes;
}

export const LEGEND_HEXES: LegendHex[] = buildLegendGrid();

const FIRST_ROW = SECTOR_LAYOUT[0];
export const LEGEND_VIEW_W = Math.ceil(PAD * 2 + HEX_W * (FIRST_ROW.length + 0.5));
export const LEGEND_VIEW_H = Math.ceil(PAD * 2 + HEX_R * 2 + HEX_R * 1.5 * (SECTOR_LAYOUT.length - 1));
