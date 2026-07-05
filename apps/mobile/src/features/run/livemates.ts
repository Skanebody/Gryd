/**
 * GRYD — Live alliés & rival PAR SECTEUR (AMENDEMENT-18 PARTIE C §C.4).
 * SÉCURITÉ D'ABORD — c'est le point le plus sensible de tout l'amendement :
 *
 *   ALLIÉS  : position live OPT-IN, UNIQUEMENT pendant une mission crew REJOINTE.
 *             On ne voit QUE les personnes UTILES à la course en cours (qui
 *             couvre un segment, qui ferme la boucle). Points chartreuse +
 *             prénom + statut. Hors mission → AUCUN allié affiché.
 *             Réglage : Confidentialité → position live (défaut « Missions
 *             rejointes »). Ici on suppose le consentement donné (mission
 *             rejointe) — la vraie gate vit dans le store de confidentialité.
 *
 *   ENNEMIS : JAMAIS de position exacte/live. Activité par SECTEUR, RETARDÉE
 *             (1-3 min) : halo orange approximatif + « Activité Canal détectée ·
 *             pression élevée ». Anti-stalking / anti-harcèlement / App Store.
 *             AUCUNE trace, cellule, ni position rivale précise n'est produite ici.
 *
 * Purement DÉMO déterministe (la simulation joue les positions/événements) :
 * aucune géoloc réelle publiée, aucune règle de jeu, le serveur reste décideur.
 * L'ancrage géo réutilise worldToGeo (liveNav) pour poser alliés et halo secteur
 * sur les vraies tuiles, à proximité du tracé — jamais dérivé d'une vraie personne.
 */
import { gameColors, type IconName } from '@klaim/shared';
import type { LatLngPoint } from '../map/realAnchors';
import { worldToGeo, type LiveNav } from './liveNav';
import type { LiveRunMode } from './simulation';

// ─── Alliés (opt-in, mission SEULEMENT) ──────────────────────────────────────

export interface LiveMate {
  id: string;
  /** Prénom affiché (jamais un nom complet — parité confidentialité). */
  name: string;
  /** Direction cardinale approximative (« nord ») — pas une coordonnée exacte. */
  bearing: string;
  /** Statut UTILE à la course (« Koro termine 420 m », « Boucle 82 % »). */
  status: string;
  /** Position géo DÉMO (posée près du tracé) — jamais une vraie personne. */
  geo: LatLngPoint;
}

/**
 * Un allié n'est affiché QUE si la course est une mission crew rejointe :
 *   - mode « terminer » (`completing`) — on referme une frontière crew ensemble ;
 *   - mode conquête AVEC une mission crew explicite (`mission=true`).
 * Toute autre configuration (run libre, social, privé) → aucun allié (retour []).
 * C'est la garde de sécurité centrale : hors mission, on ne montre personne.
 */
export function shouldShowMates(context: {
  mode: LiveRunMode;
  completing: boolean;
  mission: boolean;
}): boolean {
  if (context.completing) return true;
  return context.mode === 'conquete' && context.mission;
}

/**
 * Alliés UTILES de la démo (2-3 max) posés près du tracé au tick courant.
 * Chaque allié couvre un rôle concret de la course collective (nord, boucle,
 * connexion) — on ne liste jamais tout le crew, seulement l'utile (doc §C.4).
 * Les positions sont dérivées de sommets du tracé (déterministe), décalées, et
 * réattachées à la géo réelle par worldToGeo — 100 % démo, jamais publié.
 */
export function liveMatesAt(nav: LiveNav, tickIndex: number): LiveMate[] {
  const pts = nav.actualPoints;
  if (pts.length < 4) return [];
  const last = nav.ticks.length - 1;
  const i = Math.min(Math.max(Math.round(tickIndex), 0), last);
  // Progression 0-1 : les alliés « avancent » un peu avec la course (utile).
  const p = last > 0 ? i / last : 0;

  /** Sommet du tracé à la fraction f (0-1), décalé de (dx,dy) px-monde. */
  const near = (f: number, dx: number, dy: number): LatLngPoint => {
    const idx = Math.min(pts.length - 1, Math.max(0, Math.round(f * (pts.length - 1))));
    const v = pts[idx] ?? pts[0]!;
    return worldToGeo(v.x + dx, v.y + dy);
  };

  return [
    {
      id: 'lena',
      name: 'Lena',
      bearing: 'nord',
      status: 'Koro termine 420 m · Boucle 82 %',
      geo: near(Math.min(1, 0.62 + p * 0.2), 34, -28),
    },
    {
      id: 'sami',
      name: 'Sami',
      bearing: 'est',
      status: 'Couvre la frontière est',
      geo: near(Math.min(1, 0.4 + p * 0.15), -30, 22),
    },
    {
      id: 'nour',
      name: 'Nour',
      bearing: 'sud',
      status: 'Ferme la connexion sud',
      geo: near(Math.min(1, 0.28 + p * 0.1), 26, 40),
    },
  ];
}

/**
 * Ligne d'alliés du bas (une seule, courte, non tronquée) : le PREMIER allié
 * utile — « Lena · nord · Koro termine 420 m · Boucle 82 % ». On met en avant
 * un seul allié à la fois (anti-bruit) ; la carte porte les 2-3 points.
 */
export function primaryMateLine(mates: readonly LiveMate[]): string | null {
  const m = mates[0];
  if (!m) return null;
  return `${m.name} · ${m.bearing} · ${m.status}`;
}

// ─── Rival PAR SECTEUR (jamais exact, retardé) ───────────────────────────────

export interface RivalSector {
  /** Secteur nommé (jamais une position) — « Canal ». */
  sector: string;
  /** Pression lisible (« pression élevée ») — qualitatif, jamais un compteur live. */
  pressure: string;
  /** Détail RETARDÉ : « 14 zones reprises il y a 12 min » (jamais « maintenant »). */
  delayed: string;
  /** Rayon APPROXIMATIF du halo (m) — flou volontaire, jamais une cellule. */
  radiusM: number;
  /** Centre géo APPROXIMATIF du secteur (posé loin du coureur, jamais sur lui). */
  geo: LatLngPoint;
  icon: IconName;
  /** Teinte orange rival (jamais chartreuse — c'est une menace). */
  tint: string;
}

/** Tick à partir duquel l'activité rivale « détectée » apparaît (retardée). */
const RIVAL_REVEAL_TICK = 44;

/**
 * Activité rivale PAR SECTEUR au tick — null tant qu'elle n'est pas « détectée »
 * (retard volontaire) et null hors conquête/défense (rien à contester). Le halo
 * est posé à ~450 m au NORD-EST du tracé : approximatif, jamais sur le coureur,
 * jamais une trace. Le texte est toujours au PASSÉ (« il y a 12 min ») — on ne
 * localise ni ne suit personne en temps réel (anti-stalking, App Store).
 */
export function rivalSectorAt(
  nav: LiveNav,
  tickIndex: number,
  context: { mode: LiveRunMode; completing: boolean; intention: 'conquest' | 'defense' | null },
): RivalSector | null {
  const active =
    context.completing || context.mode === 'conquete' || context.intention === 'defense';
  if (!active) return null;
  const last = nav.ticks.length - 1;
  const i = Math.min(Math.max(Math.round(tickIndex), 0), last);
  if (i < RIVAL_REVEAL_TICK) return null;

  const pts = nav.actualPoints;
  if (pts.length < 2) return null;
  // Centre du secteur : un sommet AVANCÉ du tracé, poussé loin au nord-est —
  // volontairement décorrélé de la position exacte du coureur (~450 m).
  const anchor = pts[Math.min(pts.length - 1, Math.round(0.7 * (pts.length - 1)))] ?? pts[0]!;
  const geo = worldToGeo(anchor.x + 105, anchor.y - 95);

  return {
    sector: 'Canal',
    pressure: 'pression élevée',
    delayed: '14 zones reprises il y a 12 min',
    radiusM: 260,
    geo,
    icon: 'cible',
    tint: gameColors.rival,
  };
}

/**
 * AMENDEMENT-20 §1 — RIVAL épuré : plus de bandeau permanent « Activité Canal
 * détectée · pression élevée ». Le rival vit désormais comme HALO orange sur la
 * carte (LiveNavMap) + un TOAST court « Canal actif » (2 s). Cette ligne
 * raccourcie sert le toast — jamais un bandeau plein.
 */
export function rivalSectorLine(rival: RivalSector): string {
  return `${rival.sector} actif`;
}
