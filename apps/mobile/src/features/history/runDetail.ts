/**
 * GRYD — E68 « DÉTAIL HISTORIQUE » : les décisions d'affichage d'UNE sortie
 * archivée, isolées en fonctions PURES et testables sans réseau ni rendu
 * (`runDetail.test.ts`).
 *
 * ─── POURQUOI CE FICHIER EXISTE (28/07/2026) ────────────────────────────────
 * `app/course/[id].tsx` était une PAGE D'ÉTAT et rien d'autre : « GRYD ne sait
 * pas encore ouvrir une sortie une par une », plus un renvoi vers l'historique.
 * Son docblock, `RealRunCard` (« AUCUNE LIGNE N'EST TAPABLE »), le catalogue
 * i18n et `scripts/audit-routes.mjs` disaient tous la même chose : « aucune
 * lecture d'une course PAR IDENTIFIANT n'existe (O1) : ni requête ni RPC ».
 *
 * C'ÉTAIT VRAI ; ça ne l'est plus, et rien de neuf n'a dû être ouvert pour ça :
 *   · la policy `runs_select_own` (0003_rls.sql:107) autorise déjà `select` sur
 *     SES lignes — `features/history/real.ts` s'en sert pour la LISTE. Lire la
 *     même table filtrée par `id` ne demande donc ni RPC, ni migration, ni
 *     nouveau droit : la ligne est déjà lisible, elle n'était pas demandée ;
 *   · le backend est appliqué en production (migrations 0001-0089, 28/07/2026).
 * L'écran manquant n'était pas bloqué par O1, il était simplement à écrire.
 *
 * ─── CE QUE CE MODULE NE FERA PAS ───────────────────────────────────────────
 * IL NE RECALCULE RIEN. L'impact d'une sortie vient du payload `celebration`
 * que le SERVEUR a persisté au moment de l'ingestion (même source, et pour les
 * mêmes raisons, que `real.ts` : `hex_claims` répond à « qui tient quoi
 * MAINTENANT », pas à « qu'a fait cette sortie »). Ici comme là-bas, un payload
 * absent ou d'une forme inattendue rend `null` — jamais `0`. La distinction est
 * la règle de tout l'écran : « le serveur a décidé rien » et « le serveur n'a
 * rien dit » ne s'écrivent pas pareil.
 *
 * ─── MODULE PUR : AUCUN IMPORT DE VALEUR ────────────────────────────────────
 * Comme `historyView.ts`, il ne dépend ni de React, ni de Supabase, ni des
 * design-tokens (qui tirent du natif RN) : les tests Deno doivent pouvoir le
 * type-checker seul. Les seuls imports sont des `import type` — entièrement
 * effacés à l'exécution.
 */
import type { Activity, IngestRunResponse, RejectReason, RunStatus } from '@klaim/shared';

/**
 * UNE sortie archivée, telle que la lecture la normalise (jamais de snake_case
 * ici : ce module ne connaît pas la forme des colonnes).
 */
export interface RunDetailInput {
  id: string;
  /** Instant de départ (ms epoch). Non fini = date illisible, dite comme telle. */
  startedAtMs: number;
  /** DISCIPLINE de la sortie, LUE en base (`runs.activity`, migration 0070). */
  activity: Activity;
  km: number;
  durationS: number;
  /** `null` = le serveur n'a pas d'allure pour cette sortie (on n'en calcule pas). */
  paceSPerKm: number | null;
  status: RunStatus;
  /** Motif de refus serveur, BRUT (jamais réécrit ni deviné côté client). */
  rejectReason: string | null;
  /** Points de territoire crédités (colonne `runs.points_awarded`). */
  pointsAwarded: number | null;
  /** XP joueur créditée (colonne `runs.xp_awarded`). */
  xpAwarded: number | null;
  /** Payload `IngestRunResponse` persisté par `ingest_run` — ou n'importe quoi. */
  celebration: unknown;
}

// ═════════════════════════════════════════════════════════════════════════════
// L'IMPACT, DÉTAILLÉ — mais jamais inventé
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Le détail de ce que la sortie a fait au territoire. CHAQUE compteur est
 * indépendamment `null`able : un payload tronqué peut porter `claimed` et pas
 * `defended`, et remplacer le manquant par `0` affirmerait que le serveur a
 * jugé « rien » — ce qu'il n'a pas fait.
 *
 * ⚠ `claimed` est ici la valeur BRUTE du serveur (`hexes.claimed`), qui ne
 * compte QUE les zones neuves : `stolen` et `pioneer` sont des compteurs
 * séparés. C'est `real.ts` qui les additionne pour la LIGNE de liste (« +N
 * zones ») ; le détail, lui, a la place de les distinguer, et c'est tout son
 * intérêt — « 4 prises dont 3 arrachées » raconte autre chose que « +4 ».
 */
export interface RunImpactBreakdown {
  /** Zones NEUVES (terrain vierge). */
  claimed: number | null;
  /** Zones ARRACHÉES à un adversaire. */
  stolen: number | null;
  /** Zones où j'étais le premier humain à passer (pionnier). */
  pioneer: number | null;
  /** Zones à moi, retenues face à une contestation. */
  defended: number | null;
  /** Zones traversées mais NON créditées (lock, bouclier, zone privée, cap…). */
  blocked: number | null;
  /** A-41 (LE RELAIS) : zones co-courues, payées 1/rang. */
  coCaptured: number | null;
}

/** Un entier de compteur, ou `null` si ce n'en est pas un. Jamais de repli à 0. */
function counter(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

/**
 * Détaille l'impact d'un payload `celebration`. Un payload absent, tronqué ou
 * d'une forme inattendue rend SIX `null` — l'écran n'affiche alors aucun chiffre
 * plutôt qu'un bilan à zéro qui dirait « cette sortie n'a rien pris ».
 */
export function impactBreakdown(celebration: unknown): RunImpactBreakdown {
  const none: RunImpactBreakdown = {
    claimed: null,
    stolen: null,
    pioneer: null,
    defended: null,
    blocked: null,
    coCaptured: null,
  };
  if (typeof celebration !== 'object' || celebration === null) return none;
  const hexes = (celebration as Partial<IngestRunResponse>).hexes;
  if (typeof hexes !== 'object' || hexes === null) return none;
  return {
    claimed: counter(hexes.claimed),
    stolen: counter(hexes.stolen),
    pioneer: counter(hexes.pioneer),
    defended: counter(hexes.defended),
    blocked: counter(hexes.blocked),
    coCaptured: counter(hexes.coCaptured),
  };
}

/**
 * L'impact est-il DIT par le serveur ? `false` = payload illisible : l'écran
 * affiche la raison (« GRYD n'a pas gardé le détail »), pas un bilan vide qui
 * se lirait comme un échec sportif.
 *
 * Un seul compteur lisible suffit : un payload partiel dit quand même quelque
 * chose de vrai, et le taire serait perdre de l'information réelle.
 */
export function impactIsKnown(b: RunImpactBreakdown): boolean {
  return (
    b.claimed !== null ||
    b.stolen !== null ||
    b.pioneer !== null ||
    b.defended !== null ||
    b.blocked !== null ||
    b.coCaptured !== null
  );
}

/**
 * Le TOTAL pris (neuf + arraché + pionnier), avec la convention EXACTE de
 * `real.ts` et de l'écran de résultat. `null` dès qu'une composante manque :
 * additionner en traitant l'absente comme 0 SOUS-DÉCLARERAIT la conquête, et un
 * joueur verrait son détail contredire sa propre ligne d'historique.
 */
export function capturedTotal(b: RunImpactBreakdown): number | null {
  return b.claimed !== null && b.stolen !== null && b.pioneer !== null
    ? b.claimed + b.stolen + b.pioneer
    : null;
}

// ═════════════════════════════════════════════════════════════════════════════
// LE VERDICT — « explication d'une invalidation » (spec E68)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Les sept motifs de refus du domaine (`RejectReason`, packages/shared/types).
 * Liste FERMÉE et locale : la valeur lue en base est une chaîne libre pour
 * PostgREST, et une chaîne inconnue (version serveur plus récente, écriture
 * manuelle) ne doit pas se retrouver telle quelle à l'écran — ni servir de clé
 * dans un `Record` qu'elle ferait rendre `undefined`.
 */
const REJECT_REASONS: readonly RejectReason[] = [
  'too_short',
  'too_brief',
  'pace_too_fast',
  'pace_too_slow',
  'too_far',
  'no_valid_points',
];

/**
 * Motif de refus BRUT → motif du domaine. `null` = absent OU inconnu. L'écran
 * dit alors « refusée » sans en inventer la cause : une explication fausse est
 * pire qu'une explication manquante, parce qu'elle se défend.
 */
export function parseRejectReason(raw: string | null | undefined): RejectReason | null {
  return typeof raw === 'string' && (REJECT_REASONS as readonly string[]).includes(raw)
    ? (raw as RejectReason)
    : null;
}

/**
 * Ce que le serveur a fait de cette sortie, dans la forme que l'écran rend.
 * Quatre cas EXHAUSTIFS, un par valeur de `runs.status` — la spec E68 demande
 * « l'explication d'une invalidation », et il y en a TROIS sortes distinctes
 * qu'aucune ne doit absorber :
 *   · `partial` — une PARTIE de la trace a été écartée, le reste a capturé ;
 *   · `flagged` — la sortie compte comme effort, jamais comme capture ;
 *   · `rejected`— la sortie n'a pas été retenue, avec (ou sans) son motif.
 */
export type RunVerdict =
  | { kind: 'valid' }
  | { kind: 'partial' }
  | { kind: 'flagged' }
  | { kind: 'rejected'; reason: RejectReason | null };

export function runVerdict(status: RunStatus, rejectReason: string | null): RunVerdict {
  switch (status) {
    case 'valid':
      return { kind: 'valid' };
    case 'partial':
      return { kind: 'partial' };
    case 'rejected':
      return { kind: 'rejected', reason: parseRejectReason(rejectReason) };
    default:
      return { kind: 'flagged' };
  }
}

/**
 * Une sortie invalidée peut-elle avoir capturé ? NON pour `rejected` et
 * `flagged` : `ingest_run` insère la ligne et n'écrit AUCUN hex
 * (`index.ts` — « Course rejetée ou gelée : insérée, AUCUNE écriture hex »).
 *
 * L'écran s'en sert pour ne PAS ouvrir un bloc « impact territorial » sur une
 * sortie qui, par construction, n'en a aucun : un bloc vide sous une sortie
 * refusée se lirait comme une perte, alors que c'est une non-participation.
 */
export function verdictAllowsImpact(v: RunVerdict): boolean {
  return v.kind === 'valid' || v.kind === 'partial';
}

// ═════════════════════════════════════════════════════════════════════════════
// LES GAINS — points et XP, tels que la base les porte
// ═════════════════════════════════════════════════════════════════════════════

export interface RunAwards {
  /** Points de territoire. `0` est un FAIT ici (colonne NOT NULL DEFAULT 0). */
  points: number | null;
  xp: number | null;
}

/**
 * ⚠ ICI, ET SEULEMENT ICI, `0` EST UNE VÉRITÉ. `runs.points_awarded` et
 * `runs.xp_awarded` sont `not null default 0` (0002_schema.sql) : la valeur est
 * TOUJOURS écrite par `ingest_run`, y compris à 0 sur une sortie refusée. Un 0
 * lu n'est donc pas un trou de données, c'est la décision du serveur — au
 * contraire exact du payload `celebration`, qui peut manquer.
 *
 * `null` reste réservé au cas où la colonne n'est pas un nombre (lecture
 * partielle, forme inattendue) : on ne fabrique alors aucun chiffre.
 */
export function runAwards(input: Pick<RunDetailInput, 'pointsAwarded' | 'xpAwarded'>): RunAwards {
  return { points: counter(input.pointsAwarded), xp: counter(input.xpAwarded) };
}

// ═════════════════════════════════════════════════════════════════════════════
// LE TRACÉ — ce que E68 ne peut PAS montrer, et pourquoi (écart assumé)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * LA SPEC E68 DEMANDE « carte · trace protégée ». GRYD N'ARCHIVE AUCUN TRACÉ.
 *
 * Ce n'est pas un oubli de câblage, c'est une propriété du serveur, vérifiée :
 * la colonne `runs.polyline_masked` existe (0002_schema.sql:107) mais
 * `ingest_run` ne l'écrit JAMAIS — le dit lui-même en toutes lettres
 * (`ingest_run/anticheat_wiring.ts:178` : « `polyline_masked` n'est jamais écrit
 * par `ingest_run` »), et la ligne insérée (`index.ts`, `baseRow`) ne porte que
 * `polyline_hash`, un SHA-256 de forme canonique, irréversible par construction.
 * Côté client, la seule trace qui survit à une sortie est
 * `features/run/finishedTrace.ts` — un singleton MÉMOIRE, purgé au départ de la
 * sortie suivante, sans identifiant de course. Aucun chemin ne rend donc le
 * tracé d'une sortie PASSÉE.
 *
 * CONSÉQUENCE, ET C'EST LA SEULE HONNÊTE : l'écran ne dessine pas de carte et
 * DIT pourquoi. Une polyligne générique, une boucle décorative ou un cadre
 * « bientôt » rempli d'un fond de carte seraient tous des affirmations sur le
 * terrain du joueur.
 *
 * ─── LA CONFIDENTIALITÉ QUI S'APPLIQUERAIT, LE JOUR OÙ IL Y AURA UN TRACÉ ───
 * Les deux cas de la doctrine de partage ne se confondent pas :
 *   · SA PROPRE sortie, vue PAR LUI, sur SON écran → AUCUN masquage. Masquer
 *     ses propres extrémités à soi-même n'ajoute pas un gramme de vie privée
 *     (il connaît son domicile) et rendrait le détail moins vrai que la
 *     réalité. C'est déjà la doctrine écrite de `finishedTrace.ts` pour l'écran
 *     de résultat, et E68 est le même regard, plus tard ;
 *   · TOUTE sortie SORTANTE (export, image, lien, capture partagée) →
 *     `features/share/sharePrivacy.applySharePrivacy` d'abord, jamais la trace
 *     brute, dont le départ et l'arrivée trahissent le domicile.
 * `runTraceState` renvoie donc `'not-archived'` aujourd'hui, sans exception ;
 * le jour où le serveur archivera une trace, ce sera ici — et le masquage
 * restera indexé sur la DESTINATION (écran vs partage), pas sur l'écran.
 */
export type RunTraceState = 'not-archived';

export function runTraceState(): RunTraceState {
  return 'not-archived';
}

// ═════════════════════════════════════════════════════════════════════════════
// L'EFFORT — trois mesures, chacune présente ou absente, jamais « 0 »
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Une mesure d'effort est-elle affichable ? Une distance de 0 km ou une durée
 * de 0 s n'est pas une mesure : c'est une ligne dont la valeur manque (les
 * `check (… >= 0)` de la table admettent 0). L'écran fait disparaître le
 * segment plutôt que d'écrire « 0,0 km », qui se lirait comme une performance.
 */
export function effortIsMeasured(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
