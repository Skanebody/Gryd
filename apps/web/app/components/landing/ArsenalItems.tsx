/**
 * Icônes SVG des objets de l'Arsenal — AMENDEMENT-05 §3.10.
 * Esthétique running/tech (gel énergétique, plaque carbone, radar HUD,
 * semelle, bannière crew) — PAS fantasy. Filaire 1,5 px, couleur héritée
 * (currentColor) : la rareté de la carte parente pilote la teinte.
 */

import type { SVGProps } from 'react';

function baseProps(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    viewBox: '0 0 32 32',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

/** Bouclier de quartier : plaque hexagonale, tissage carbone en diagonale. */
export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps(props)}>
      <path d="M16 3.5 26.5 9.6v12.3L16 28.5 5.5 21.9V9.6L16 3.5Z" />
      <path d="M10 9 23 22" opacity={0.55} />
      <path d="M7.5 13 17 22.5" opacity={0.55} />
      <path d="M13.5 6.5 25 18" opacity={0.55} />
    </svg>
  );
}

/** Streak Gel : sachet de gel énergétique, éclair de série. */
export function GelIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps(props)}>
      <path d="M13.2 3.5h5.6l.9 3.2h-7.4l.9-3.2Z" />
      <path d="M12.3 6.7h7.4c1.6 4.1 2.8 7.7 2.8 11.2 0 4.2-2.9 7.1-6.5 7.1s-6.5-2.9-6.5-7.1c0-3.5 1.2-7.1 2.8-11.2Z" />
      <path d="m17.4 11.5-2.4 3.9h3.4L16 19.3" opacity={0.7} />
    </svg>
  );
}

/** Radar : balayage HUD, échos de zones contestées. */
export function RadarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="16" cy="16" r="11.5" />
      <circle cx="16" cy="16" r="6.2" opacity={0.45} />
      <path d="m16 16 7.4-8.8" />
      <path d="M23.4 7.2A11.5 11.5 0 0 1 27.5 16" opacity={0.45} />
      <circle cx="11.5" cy="19.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Scout : viseur HUD + ping, repérage sans capture. */
export function ScoutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps(props)}>
      <circle cx="16" cy="16" r="8.5" />
      <path d="M16 3.5v4.2M16 24.3v4.2M3.5 16h4.2M24.3 16h4.2" />
      <circle cx="16" cy="16" r="1.6" fill="currentColor" stroke="none" />
      <path d="M22 10a8.5 8.5 0 0 1 2.5 6" opacity={0.45} />
    </svg>
  );
}

/** Bannière crew : fanion à queue d'aronde, emblème hexagonal. */
export function BannerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps(props)}>
      <path d="M9.5 3.5v25" />
      <path d="M9.5 5.5H23l-3.4 4.75L23 15H9.5" />
      <path d="m16.5 7.1 1.9 1.1v2.2l-1.9 1.1-1.9-1.1V8.2l1.9-1.1Z" opacity={0.55} />
    </svg>
  );
}

/** Skin Neon/Carbon : semelle vue de dessous, crampons. */
export function SkinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps(props)}>
      <path d="M16 3.2c3.6 0 5.9 3 5.9 7.3 0 2.6-.9 4.6-.9 7s.9 3.6.9 5.9c0 3.4-2.6 5.4-5.9 5.4s-5.9-2-5.9-5.4c0-2.3.9-3.5.9-5.9s-.9-4.4-.9-7c0-4.3 2.3-7.3 5.9-7.3Z" />
      <path d="M12.6 9.4h6.8M12.6 13h6.8M13.4 22.6h5.2" opacity={0.55} />
    </svg>
  );
}
