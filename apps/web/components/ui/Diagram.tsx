/**
 * GRYD — LES SCHÉMAS (lot W2).
 *
 * Repris de `apps/mobile/src/features/help/helpArt2026.ts` : MÊME cadre
 * (320 × 180), MÊMES coordonnées, MÊME fond de rues. Le site montre donc
 * exactement les dessins que le guide de l'application montre, pas une
 * interprétation.
 *
 * ⚠️ DUPLICATION ASSUMÉE, ET BORNÉE : `apps/web` ne peut pas importer
 * `apps/mobile` (deux React, deux bundlers, `react-native-svg` d'un côté). Ce
 * sont des coordonnées de `viewBox`, pas des règles de jeu : aucune valeur de
 * `game-rules.ts` n'est recopiée ici, et aucun nombre de ce fichier n'apparaît
 * à l'écran.
 *
 * ─── TROIS RÈGLES TENUES, COMME DANS L'APPLICATION ──────────────────────────
 *  · JAMAIS LA COULEUR SEULE (L15) : la part déjà possédée n'est pas « une
 *    autre teinte », elle est HACHURÉE.
 *  · RIEN N'EST AFFIRMÉ : aucun dessin ne montre un état de joueur, une ville,
 *    un score ni une jauge à moitié pleine, qui serait une donnée inventée.
 *  · AUCUN MOUVEMENT : le site rend ces planches TERMINÉES. Une animation ne
 *    dirait rien de plus et devrait respecter `prefers-reduced-motion` ; ne pas
 *    en avoir est plus simple que de la désactiver correctement.
 */
import styles from './Diagram.module.css';

export type DiagramKind = 'trace' | 'closure' | 'territory';

const VIEW_BOX = '0 0 320 180';
const GRID = 'M0 44H320M0 92H320M0 140H320M64 0V180M132 0V180M200 0V180M264 0V180';

type Point = readonly [number, number];

const TRACE: readonly Point[] = [[36, 154], [74, 122], [98, 120], [120, 88], [160, 80], [178, 48], [234, 42], [284, 60]];
const OPEN_LOOP: readonly Point[] = [[188, 152], [252, 128], [262, 74], [206, 32], [128, 30], [66, 66], [58, 124], [124, 152]];
const CLOSURE_CENTRE: Point = [156, 152];
const CLOSURE_RADIUS = 38;
const TERRITORY: readonly Point[] = [[52, 130], [60, 58], [116, 32], [200, 42], [260, 90], [238, 146], [138, 158]];
const OWNED: readonly Point[] = [[112, 88], [178, 78], [200, 118], [140, 134]];
const OWNED_HATCH: readonly (readonly [Point, Point])[] = [
  [[124, 89], [124, 105]], [[136, 87], [136, 125]], [[148, 85], [148, 129]],
  [[160, 83], [160, 126]], [[172, 81], [172, 123]], [[184, 91], [184, 120]],
];

/** Le `d` d'une polyligne ouverte. Commandes absolues seulement. */
function openD(points: readonly Point[]): string {
  const [first, ...rest] = points;
  if (!first) return '';
  return `M${first[0]} ${first[1]}${rest.map(([x, y]) => ` L${x} ${y}`).join('')}`;
}

/** Le `d` d'un polygone fermé. */
function closedD(points: readonly Point[]): string {
  return `${openD(points)}Z`;
}

/** Le fond de rues : un décor régulier, aucune ville réelle, aucun lieu nommé. */
function StreetGrid() {
  return <path d={GRID} stroke="var(--gryd-surface-high)" strokeWidth={1} fill="none" />;
}

/** Une description textuelle par planche : le dessin porte du sens, il se lit aussi sans les yeux. */
const LABELS: Record<DiagramKind, string> = {
  trace: 'Schéma : une trace enregistrée serpente sur un fond de rues, du point de départ à la position courante. Elle reste ouverte.',
  closure: 'Schéma : une boucle presque refermée, ses deux bouts libres entourés d’un cercle de tolérance.',
  territory: 'Schéma : la surface refermée par une boucle, avec la part déjà possédée hachurée à l’intérieur.',
};

function Trace() {
  const start = TRACE[0] ?? ([0, 0] as Point);
  const head = TRACE[TRACE.length - 1] ?? ([0, 0] as Point);
  const d = openD(TRACE);
  return (
    <g>
      <StreetGrid />
      <path d={d} fill="none" stroke="var(--gryd-carbon)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="var(--gryd-accent)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={start[0]} cy={start[1]} r={7} fill="var(--gryd-carbon)" stroke="var(--gryd-ink)" strokeWidth={1.5} />
      <circle cx={head[0]} cy={head[1]} r={6} fill="var(--gryd-accent)" stroke="var(--gryd-carbon)" strokeWidth={2} />
    </g>
  );
}

function Closure() {
  const left = OPEN_LOOP[OPEN_LOOP.length - 1] ?? ([0, 0] as Point);
  const right = OPEN_LOOP[0] ?? ([0, 0] as Point);
  const d = openD(OPEN_LOOP);
  return (
    <g>
      <StreetGrid />
      <path d={d} fill="none" stroke="var(--gryd-surface-high)" strokeWidth={1} strokeDasharray="3 7" />
      <path d={d} fill="none" stroke="var(--gryd-accent)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx={CLOSURE_CENTRE[0]}
        cy={CLOSURE_CENTRE[1]}
        r={CLOSURE_RADIUS}
        fill="none"
        stroke="var(--gryd-accent)"
        strokeWidth={1.5}
        strokeDasharray="3 7"
      />
      <circle cx={left[0]} cy={left[1]} r={6} fill="var(--gryd-carbon)" stroke="var(--gryd-ink)" strokeWidth={2} />
      <circle cx={right[0]} cy={right[1]} r={6} fill="var(--gryd-accent)" stroke="var(--gryd-carbon)" strokeWidth={2} />
    </g>
  );
}

function Territory() {
  return (
    <g>
      <StreetGrid />
      <path d={closedD(TERRITORY)} fill="var(--gryd-accent-soft)" stroke="var(--gryd-accent)" strokeWidth={3} strokeLinejoin="round" />
      {/* La part DÉJÀ possédée : hachurée, jamais seulement d'une autre teinte. */}
      <path d={closedD(OWNED)} fill="var(--gryd-carbon)" fillOpacity={0.55} stroke="var(--gryd-ink)" strokeWidth={1} />
      {OWNED_HATCH.map(([a, b]) => (
        <line
          key={`${a[0]}-${a[1]}`}
          x1={a[0]}
          y1={a[1]}
          x2={b[0]}
          y2={b[1]}
          stroke="var(--gryd-ink)"
          strokeWidth={1}
          strokeOpacity={0.5}
        />
      ))}
    </g>
  );
}

const SHAPES: Record<DiagramKind, () => React.JSX.Element> = {
  trace: Trace,
  closure: Closure,
  territory: Territory,
};

export interface DiagramProps {
  readonly kind: DiagramKind;
  /** Remplace la description par défaut quand le contexte en demande une autre. */
  readonly label?: string;
  readonly className?: string;
}

export function Diagram({ kind, label, className }: DiagramProps) {
  const Shape = SHAPES[kind];
  return (
    <div className={[styles.frame, className].filter(Boolean).join(' ')}>
      <svg className={styles.svg} viewBox={VIEW_BOX} role="img" aria-label={label ?? LABELS[kind]} focusable="false">
        <Shape />
      </svg>
    </div>
  );
}
