/**
 * GRYD — INTENTIONS de course (AMENDEMENT-16 §1, doc §1-§3) : RUN libre par
 * défaut, Conquérir/Défendre OPTIONNELS à l'appui long. « L'intention guide
 * l'expérience live, le tracé réel décide du résultat » : le paramètre
 * `intention` est 100 % CLIENT — il teinte les bandeaux du live et rien
 * d'autre, il ne part JAMAIS au serveur pour l'attribution (ingest_run ne le
 * lit pas, le tracé seul décide). Copy gelée doc §28.
 *
 * ─── PURGE DU 21/07/2026 (A-47, lot « DemoCourseLive ») ─────────────────────
 * Tout ce qui n'existait que pour la course FABRIQUÉE est parti avec elle :
 *   - les bandeaux de mission (`conquestMissionLabel`, `defenseMissionLabel`,
 *     `completeMissionLabel`, `freeRunMissionLabel`) et leurs variantes longues
 *     (`conquestBannerLabel`, `defenseBannerLabel`, `completeBannerLabel`) : ils
 *     lisaient la phase de boucle de la simulation (`loop.ts`, supprimé) ;
 *   - `defenseCoveragePct`, un « % de frontière couverte » calculé sur les
 *     cellules du scénario — un pourcentage sans mesure derrière ;
 *   - `DEFENSE_TARGETS_DEMO` / `defenseLoopLabel` / `defenseZoneForRoute` : la
 *     liste de zones à défendre inventée (« République · Expire dans 18 h »,
 *     « Canal · Contesté »), qui pointait vers les itinéraires d'authoring de
 *     `route/demo.ts`. Un joueur, où qu'il soit, se voyait proposer de défendre
 *     République ;
 *   - `isCompleteParam` / `CompleteIntention` : le mode « terminer » du live.
 * Ce qui reste est soit une règle du jeu en une phrase, soit la lecture d'un
 * paramètre de route, soit la forme UX des frontières crew (encore consommée
 * par le Résultat — voir la note sur PARTIAL_BOUNDARIES_DEMO plus bas).
 */

// ─── Copy gelée (doc §28) ────────────────────────────────────────────────────

/** Run libre (§28) — sous-titre de l'entrée RUN du sheet. */
export const FREE_RUN_COPY =
  'Cours librement. GRYD calcule ce que tu as pris, défendu ou ouvert.';
/** Conquête (§28) — aide de la section Conquérir. */
export const CONQUEST_COPY = 'Trace une boucle. Ferme-la. La zone est à toi.';
/** Défense (§28) — sous-titre de l'entrée Défendre. */
export const DEFENSE_COPY = 'Reviens sur tes frontières avant qu’elles tombent.';
/** Conseil Conquérir (doc §3.2) — sous-titre de l'entrée Conquérir. */
export const CONQUEST_ADVICE =
  'Trace une boucle pour créer une zone. Distance conseillée : 2 à 5 km.';

// ─── Intention (client only — jamais envoyée au serveur) ─────────────────────

/** Les deux intentions optionnelles (l'absence = run libre). */
export type RunIntention = 'conquest' | 'defense';

/** Parse le param de route `intention` — inconnu/absent → null (run libre). */
export function intentionFromParam(
  param: string | string[] | undefined,
): RunIntention | null {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === 'conquest' || value === 'defense') return value;
  return null;
}

// ─── AMENDEMENT-17 §CH2 — Frontière crew : ouverture + complétion (démo UX) ──
// « Ouvre une frontière. Ton crew peut la fermer. » Côté UX pur : le résultat
// d'une course VALIDE non bouclée mais fermable montre l'état FRONTIÈRE OUVERTE
// (il manque N m) ; la course d'un membre qui referme la boucle montre BOUCLE
// CREW FERMÉE + contributions. En prod, ces données viennent d'ingest_run
// (IngestRunResponse.openBoundary / boundaryCompleted) ; ici on MIROIRE cette
// forme en démo déterministe (le serveur reste seul décideur). Jamais de
// polyline, de score de géométrie, de cellule ni de % de géométrie exposé :
// on affiche « Il manque 620 m. Expire dans 23 h. »

/**
 * Frontière partielle démo (miroir UX de PartialBoundary / openBoundary — la
 * géométrie serveur n'est jamais exposée). `missingM` = mètres restants affichés
 * tels quels (« Il manque 620 m ») ; `ttlHoursLeft` alimente « Expire dans 23 h »
 * (le vrai `expiresAt` vient du serveur). `openerName` = l'ouvreur (« Ouvert par
 * KORO »). `contributions` = répartition au prorata démo pour l'écran complétion.
 */
export interface PartialBoundaryDemo {
  id: string;
  zone: string;
  tracedKm: number;
  missingM: number;
  ttlHoursLeft: number;
  openerName: string;
  routeId: string;
  /** Répartition au prorata (somme des share = 1) — miroir contributionSplit. */
  contributions: readonly { name: string; share: number }[];
  /** Points crew de la zone capturée à la fermeture (démo). */
  crewPoints: number;
}

/**
 * Frontières partielles démo (doc §CH2 : « Il manque 620 m pour prendre
 * République »). Une seule cible principale (République, 620 m) + une secondaire.
 * La vraie liste est serveur (partial_boundaries du crew, RLS lecture crew).
 *
 * ⚠️ DONNÉE FABRIQUÉE ENCORE ATTEINTE — NON TRAITÉE PAR LE LOT « DemoCourseLive »
 * (21/07/2026). Contrairement au reste de ce fichier, ce catalogue n'est pas
 * mort : `partialBoundaryById()` ci-dessous ne renvoie JAMAIS null (il retombe
 * sur République par défaut), et deux surfaces HORS du périmètre de ce lot
 * l'appellent — `app/course-result.tsx` et `features/nav/contextualAction.ts`,
 * qui construit un CTA « terminer la frontière ». Un joueur peut donc encore se
 * voir proposer de refermer une frontière ouverte par un « KORO » qui n'existe
 * pas, à République, où qu'il soit. Le retrait appartient aux lots propriétaires
 * de ces deux fichiers : il n'est PAS fait ici, et rien dans ce commentaire ne
 * doit laisser croire le contraire.
 */
/*
 * PARTIAL_BOUNDARIES_DEMO SUPPRIMÉ (21/07/2026) — deux frontières fabriquées
 * (« République », « Canal »), ouvertes par un « KORO » qui n'existe pas, avec
 * des contributions chiffrées (Benjamin 79 % / Lena 21 %) et 420 points de crew.
 * `partialBoundaryById()` allait avec, et ne renvoyait JAMAIS null : un
 * identifiant inconnu retombait sur République. Le repli était donc le mensonge,
 * pas l'exception.
 *
 * Ce que ça devient : rien, tant que le SERVEUR ne décide pas ces états.
 * `IngestRunResponse` ne porte aujourd'hui ni `openBoundary` ni
 * `boundaryCompleted` — le jour où il les portera, les écrans se rebranchent sur
 * une vraie frontière. Le type `PartialBoundaryDemo` est conservé ci-dessus
 * comme CONTRAT de ce que le serveur devra renvoyer.
 */

/** « 2,4 km » — virgule FR, distance tracée (copy « Tu as tracé 2,4 km »). */
export function tracedKmLabel(boundary: PartialBoundaryDemo): string {
  return `${boundary.tracedKm.toFixed(1).replace('.', ',')} km`;
}

/** « Expire dans 23 h » — TTL restant lisible (jamais l'ISO brut). */
export function boundaryExpiryLabel(boundary: PartialBoundaryDemo): string {
  return `Expire dans ${boundary.ttlHoursLeft} h`;
}

/**
 * Part affichée « 79 % » d'une contribution (arrondi entier — jamais un % de
 * géométrie trop précis, juste la répartition lisible du prorata).
 */
export function contributionPct(share: number): number {
  return Math.round(Math.max(0, Math.min(1, share)) * 100);
}


/**
 * FORME d'une zone à défendre — un TYPE, sans aucune donnée derrière.
 *
 * La liste qui le peuplait (`DEFENSE_TARGETS_DEMO` : « République · Expire dans
 * 18 h », « Canal · Contesté ») est supprimée : elle affirmait qu'un joueur
 * possédait des zones parisiennes. Le type survit pour UNE seule raison, et
 * c'est une dette, pas une justification : `features/motivation/RunModeSheet.tsx`
 * déclare encore une prop `onDefenseTarget?: (target: DefenseTargetDemo) => void`
 * — vestige du panneau démo qu'il a lui-même retiré. Cette prop n'a aucun
 * appelant (le composant lui-même n'est monté nulle part). Elle doit disparaître,
 * et ce type avec elle ; ce lot n'a pas la main sur `features/motivation/`
 * (agents parallèles), donc il le signale au lieu de l'écrire en douce.
 *
 * Tant qu'il est vide de données, il ne peut mentir à personne : c'est une
 * forme, pas une affirmation sur le joueur.
 */
export interface DefenseTargetDemo {
  /** Zone (vocabulaire territoire — jamais « hex »). */
  zone: string;
  /** Urgence affichée (« Expire dans 18 h » / « Contesté »). */
  urgency: string;
  /** Boucle défense conseillée (km). */
  loopKm: number;
}

// ─── Synthèse multi-résultats (doc §2 / §3.1 — « l'intention guide, le tracé
//     décide ») ──────────────────────────────────────────────────────────────
// Le tracé réel produit PLUSIEURS effets, quelle que soit l'intention : la
// synthèse liste ce que la course a pris/défendu/repris/ouvert. Étiquettes de
// SCÉNARIO démo (le vrai bilan vient d'ingest_run côté serveur, jamais du
// client). L'intention ne teinte que l'ordre/l'accent — pas l'attribution.

/** Une ligne de la synthèse : icône + texte, `accent` = mise en avant chartreuse. */
export interface ResultSummaryLine {
  icon: 'cible' | 'bouclier' | 'route' | 'crew';
  text: string;
  accent?: boolean;
}

/** Titre + copy §28 selon l'intention (Conquête / Défense / Run libre). */
export function summaryHeader(intention: RunIntention | null): {
  kicker: string;
  copy: string;
} {
  if (intention === 'conquest') return { kicker: 'CONQUÊTE', copy: CONQUEST_COPY };
  if (intention === 'defense') return { kicker: 'DÉFENSE', copy: DEFENSE_COPY };
  return { kicker: 'RUN LIBRE', copy: FREE_RUN_COPY };
}

/**
 * Synthèse multi-résultats (doc §2/§3.1). `zoneName`/`zonePctDelta` viennent
 * des stats démo (le serveur reste décideur). Chaque intention met en avant SON
 * effet, mais tous les effets du tracé sont listés (« pas une prison » §2) :
 *  - Conquérir : +1 zone conquise (accent) · 2 défendues · 1 route ouverte
 *  - Défendre  : 2 zones défendues (accent) · 1 petite zone conquise · 1 route
 *  - Run libre : +1 conquise · 2 défendues · 1 route ouverte (analyse auto)
 * La ligne zone crew (« Paris Est +3 % ») clôt toujours la synthèse.
 */
export function resultSummaryLines(
  intention: RunIntention | null,
  zoneName: string,
  zonePctDelta: number,
): ResultSummaryLine[] {
  const conquered: ResultSummaryLine = {
    icon: 'cible',
    text: '+1 zone conquise',
    accent: intention !== 'defense',
  };
  const defended: ResultSummaryLine = {
    icon: 'bouclier',
    text: '2 zones défendues',
    accent: intention === 'defense',
  };
  const opened: ResultSummaryLine = { icon: 'route', text: '1 route ouverte' };
  const crewLine: ResultSummaryLine = {
    icon: 'crew',
    text: `${zoneName} +${zonePctDelta} %`,
  };
  if (intention === 'defense') {
    // Défendre : la défense prime, la conquête au passage est « petite ».
    return [
      defended,
      { ...conquered, text: '1 petite zone conquise', accent: false },
      opened,
      crewLine,
    ];
  }
  return [conquered, defended, opened, crewLine];
}
