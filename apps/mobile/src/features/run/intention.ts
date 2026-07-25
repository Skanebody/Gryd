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
 * par `features/nav/contextualAction.ts` — voir la note sur
 * PARTIAL_BOUNDARIES_DEMO plus bas).
 */
import { C } from '../../i18n/catalog/result';
import type { Entry } from '../../i18n/types';

// ─── Copy gelée §28 — RETIRÉE DE CE FICHIER (25/07/2026) ─────────────────────
// `FREE_RUN_COPY` / `CONQUEST_COPY` / `DEFENSE_COPY` / `CONQUEST_ADVICE` étaient
// quatre phrases FRANÇAISES EN DUR, sans aucun appelant depuis la purge du
// 21/07/2026 (le sheet qui les affichait a disparu avec la course fabriquée).
// Un texte visible non traduit qui attend un consommateur finit par en trouver
// un : le jour où ces phrases reviennent à l'écran, elles reviendront par
// `defineCatalog`, avec leurs 5 langues, comme tout le reste.

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

// ─── HELPERS DE FRONTIÈRE RETIRÉS (25/07/2026, recalage E09) ────────────────
// `tracedKmLabel`, `boundaryExpiryLabel` et `contributionPct` vivaient encore
// ici alors que leurs deux écrans (frontière ouverte / boucle crew fermée) ont
// été supprimés le 21/07/2026 avec PARTIAL_BOUNDARIES_DEMO. Ils n'avaient plus
// AUCUN appelant — `course-result.tsx` les importait sans jamais les lire.
// Deux d'entre eux formataient d'ailleurs en FRANÇAIS EN DUR (« Expire dans
// 23 h », virgule décimale forcée) : les garder, c'était garder un gabarit
// non traduit prêt à ressortir. L'échéance réelle d'une frontière ouverte se
// dérive désormais de `openBoundary.expiresAt` (verdict serveur) et passe par
// le catalogue (`C.boundaryOpenHours`).


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

// ─── Kicker d'intention du Résultat (doc §2 / §3.1) ──────────────────────────
// « L'intention guide l'expérience, le tracé décide du résultat » : ce kicker
// nomme l'INTENTION du joueur au-dessus de sa distance mesurée. Il ne dit rien
// de l'attribution (le serveur seul décide) — c'est de la copy, pas un verdict.

/**
 * Kicker §28 selon l'intention (Conquête / Défense / Run libre), en `Entry` i18n.
 *
 * ─── FUITE DE FRANÇAIS COLMATÉE (25/07/2026) ────────────────────────────────
 * Cette fonction renvoyait des LITTÉRAUX français ('CONQUÊTE' / 'DÉFENSE' /
 * 'RUN LIBRE'), rendus tels quels dans la ligne héros du Résultat : un joueur
 * en EN/ES/DE/PT lisait « CONQUÊTE · 4,30 km » sur son propre écran de fin de
 * course. Les cinq langues vivent désormais au catalogue, parité forcée par le
 * type `Entry`.
 */
export function summaryHeader(intention: RunIntention | null): { kicker: Entry } {
  if (intention === 'conquest') return { kicker: C.kickerConquest };
  if (intention === 'defense') return { kicker: C.kickerDefense };
  return { kicker: C.kickerFreeRun };
}

// ─── `resultSummaryLines` SUPPRIMÉE (25/07/2026) ────────────────────────────
// Elle fabriquait la synthèse « +1 zone conquise · 2 zones défendues · 1 route
// ouverte · {zone} +N % » : quatre affirmations de gameplay écrites en dur, en
// français, qu'aucune mesure ne produisait. Son dernier appelant l'avait déjà
// neutralisée (`summaryLines = []`) sans retirer la fonction — donc la carcasse
// d'un mensonge attendait un appelant. Le vrai bilan est celui d'ingest_run, et
// c'est le bloc IMPACT qui le rend. `ResultSummaryLine` part avec elle.
