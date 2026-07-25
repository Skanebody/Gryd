/**
 * GRYD — MOTEUR NARRATIF du post-run (planches E09 + E10).
 *
 * La planche E10 est catégorique : « le MOTEUR choisit le récit selon l'événement
 * dominant ; l'utilisateur change le STYLE, jamais l'histoire ». Ce fichier EST ce
 * moteur, et il sert les DEUX écrans :
 *   · E09 (Résultat) — il décide si le héros parle de TERRITOIRE ou d'EFFORT ;
 *   · E10 (Partage)  — il décide le style « Auto » et la phrase « Pourquoi ce
 *     style ? », toutes deux dérivées de la MÊME décision (sinon les deux écrans
 *     raconteraient deux histoires différentes du même run).
 *
 * ─── POURQUOI CE FICHIER EXISTE (le bug qu'il ferme) ────────────────────────
 * Avant lui, /partage choisissait son style sur l'INTENTION du joueur (ce qu'il
 * VOULAIT faire), pas sur le VERDICT (ce que le serveur a jugé) : une course en
 * mode conquête qui n'avait rien capturé partait donc sur le template héros
 * « J'AI PRIS {ZONE} · +0 · PRENDS-LA-MOI », exporté en PNG. Le moteur ne lit
 * QUE le verdict : sans capture jugée, il ne peut pas produire un récit de
 * conquête.
 *
 * ORDRE DE DOMINANCE (planche E10, mot pour mot) :
 *   capture > reprise > défense > boucle > crew > classement > record
 * et, quand rien n'est jugé ou que rien n'a été gagné : `effort` — jamais un
 * récit territorial vide, jamais un ton d'échec (planche E09).
 *
 * PUR : type d'entrée STRUCTUREL, zéro import (Deno-testable, comme
 * rivalChallenge.ts / pioneerCelebration.ts). Aucune décision de jeu ici : on ne
 * fait que LIRE ce que le serveur a décidé et choisir quoi RACONTER.
 */

/** L'événement dominant du run — ce que la course a d'abord fait. */
export type NarrativeId =
  | 'capture'
  | 'reprise'
  | 'defense'
  | 'boucle'
  | 'crew'
  | 'classement'
  | 'record'
  | 'effort';

/**
 * Styles de card disponibles — miroir structurel de `ShareTemplateId`
 * (templates.tsx). Dupliqué ici EXPRÈS : ce module doit rester sans import pour
 * être testable en Deno. La compatibilité est vérifiée à la compilation par
 * l'affectation faite dans `app/partage.tsx`.
 */
export type NarrativeStyleId =
  | 'simple'
  | 'conquete'
  | 'defense'
  | 'boucle'
  | 'crew'
  | 'classement'
  | 'avantApres'
  | 'carte3d';

/**
 * Ce que le SERVEUR a jugé de cette course. Chaque champ a une source réelle
 * (`IngestRunResponse`) ou vaut une valeur neutre explicite quand personne ne l'a
 * mesuré — jamais un défaut qui affirmerait quelque chose.
 */
export interface NarrativeVerdict {
  /** Le serveur a rendu un verdict (sinon rien n'est jugé : hors-ligne, file). */
  readonly judged: boolean;
  /** La course est créditée (ni refusée §11 ni signalée par GRYD Verify). */
  readonly credited: boolean;
  /** Zones prises sur du NEUTRE (claimed + pionnier) — verdict serveur. */
  readonly zonesClaimed: number;
  /** Zones REPRISES à un rival (stolen) — verdict serveur. */
  readonly zonesStolen: number;
  /** Zones DÉFENDUES (déjà à moi, retenues) — verdict serveur. */
  readonly zonesDefended: number;
  /** La boucle a été jugée fermée par le serveur. */
  readonly loopClosed: boolean;
  /** Zones intérieures gagnées grâce à la boucle (déjà comptées dans les autres). */
  readonly enclosedZones: number;
  /** XP crew créditée par cette course (0 = pas de crew, ou rien crédité). */
  readonly crewXp: number;
  /**
   * Un rang RÉEL est disponible pour cette course. `false` aujourd'hui : aucune
   * lecture de `season_scores` n'alimente le Résultat (cf. templates.tsx
   * `rankLabel: null`). Le champ existe pour que le récit « classement »
   * s'allume le jour où la source arrive — jamais avant.
   */
  readonly rankKnown: boolean;
  /**
   * Record personnel battu. `false` aujourd'hui : aucune source ne le mesure
   * jusqu'ici. Même contrat que `rankKnown` — un branchement futur, pas une
   * affirmation présente.
   */
  readonly personalRecord: boolean;
}

/** Verdict NEUTRE : « on ne sait rien ». Base des lectures partielles. */
export const UNJUDGED_VERDICT: NarrativeVerdict = {
  judged: false,
  credited: false,
  zonesClaimed: 0,
  zonesStolen: 0,
  zonesDefended: 0,
  loopClosed: false,
  enclosedZones: 0,
  crewXp: 0,
  rankKnown: false,
  personalRecord: false,
};

/**
 * L'événement DOMINANT de la course — le récit que les deux écrans racontent.
 *
 * Un run non jugé ou non crédité ne peut produire QUE `effort` : le seul fait
 * mesuré est alors l'effort (distance/durée), et c'est le seul chose qu'on ait
 * le droit de raconter.
 */
export function dominantNarrative(v: NarrativeVerdict): NarrativeId {
  // Rien de jugé, ou course refusée/signalée (§11) : aucun récit territorial
  // n'est disponible. L'effort, lui, a bien eu lieu.
  if (!v.judged || !v.credited) return 'effort';
  if (v.zonesClaimed > 0) return 'capture';
  if (v.zonesStolen > 0) return 'reprise';
  if (v.zonesDefended > 0) return 'defense';
  if (v.loopClosed && v.enclosedZones > 0) return 'boucle';
  if (v.crewXp > 0) return 'crew';
  if (v.rankKnown) return 'classement';
  if (v.personalRecord) return 'record';
  // Jugé, crédité, mais rien de gagné : la variante SANS CAPTURE de la planche.
  return 'effort';
}

/**
 * Style de card qui PORTE ce récit. « Auto » de E10 = ce choix-là, réversible :
 * l'utilisateur peut prendre un autre style, il ne change pas l'histoire.
 *
 * `record` retombe sur la carte de stats : c'est bien un fait de performance, et
 * aucun template « record » n'existe (on n'en peint pas un sans source).
 */
export function styleForNarrative(n: NarrativeId): NarrativeStyleId {
  switch (n) {
    case 'capture':
      return 'conquete';
    case 'reprise':
      return 'avantApres';
    case 'defense':
      return 'defense';
    case 'boucle':
      return 'boucle';
    case 'crew':
      return 'crew';
    case 'classement':
      return 'classement';
    case 'record':
    case 'effort':
      return 'simple';
  }
}

/**
 * Styles qui AFFIRMERAIENT une conquête. Tant que le serveur n'a jugé aucune
 * prise, ils ne doivent pas être proposés : leur rendu porte « J'AI PRIS {ZONE} »
 * ou une bascule avant/après d'un territoire qui n'a pas changé de main. C'est
 * l'image EXPORTÉE, pas un texte d'écran — le mensonge sortirait de l'app.
 */
export const CONQUEST_CLAIMING_STYLES: readonly NarrativeStyleId[] = [
  'conquete',
  'avantApres',
  'carte3d',
];

/**
 * Le style `s` peut-il être proposé pour ce verdict ?
 *
 * ─── LA RÈGLE : UN STYLE NE S'OUVRE QUE SUR LA QUANTITÉ QU'IL AFFICHE ───────
 * Chaque template porte un KPI GÉANT tiré d'une grandeur précise. Sans cette
 * grandeur, il n'affiche pas « rien » : il affiche « +0 » ou « — » en géant,
 * dans une image destinée à être PUBLIÉE. Un « 0 » nu à l'écran est déjà
 * interdit ; exporté sur une story sous le nom du joueur, c'en est la version
 * définitive. D'où :
 *   · Conquête / Avant-Après / Carte 3D → une PRISE réelle (neutre ou reprise) ;
 *   · Défense                           → des zones réellement DÉFENDUES ;
 *   · Boucle                            → une boucle fermée AVEC intérieur gagné ;
 *   · Crew                              → de l'XP crew réellement créditée ;
 *   · Classement                        → un rang réellement connu ;
 *   · Carte (simple)                    → TOUJOURS : son KPI est la distance
 *     MESURÉE, qui existe dès qu'une course existe. C'est le repli honnête, et
 *     la raison pour laquelle il reste toujours au moins un style proposable.
 * Tout cela exige en outre un verdict JUGÉ et CRÉDITÉ (§11 : rien d'offensif ni
 * de festif greffé sur un refus ou un signalement).
 */
export function styleAllowed(s: NarrativeStyleId, v: NarrativeVerdict): boolean {
  const settled = v.judged && v.credited;
  switch (s) {
    case 'conquete':
    case 'avantApres':
    case 'carte3d':
      return settled && v.zonesClaimed + v.zonesStolen > 0;
    case 'defense':
      return settled && v.zonesDefended > 0;
    case 'boucle':
      return settled && v.loopClosed && v.enclosedZones > 0;
    case 'crew':
      return settled && v.crewXp > 0;
    case 'classement':
      return settled && v.rankKnown;
    case 'simple':
      return true;
  }
}
