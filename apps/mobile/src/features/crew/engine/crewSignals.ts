// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/crewSignals.ts (drift testé côté Deno).

/**
 * GRYD — engine/crewSignals.ts (AMENDEMENT-44 A4 « messages crew contextuels » +
 * A5 « ping de zone »).
 *
 * ═══ LE PROBLÈME ════════════════════════════════════════════════════════════
 * Cinq messages génériques ne permettent pas à vingt personnes de s'organiser :
 * « Bien joué » ne dit ni QUOI faire, ni OÙ. Mais ouvrir la saisie libre est
 * exclu (A-43 §9 : modération, sécurité des mineurs, charge juridique). La seule
 * issue est un vocabulaire FIGÉ mais SITUÉ : le jeu de signaux proposé dépend de
 * ce que le crew vit RÉELLEMENT, et un ping désigne un secteur RÉEL.
 *
 * ═══ CE QUI EST INTERDIT ICI (CLAUDE.md, doctrine « l'app ne ment jamais ») ══
 * Ce fichier ne produit AUCUN texte. Il renvoie des CLÉS ; la traduction vit
 * dans le catalogue i18n, et le nom de secteur vient de `sectors.name`
 * (reverse-geocode réel). Conséquence recherchée : il est structurellement
 * impossible qu'un caractère saisi par un utilisateur transite par un ping —
 * donc rien à modérer, par construction et non par filtrage.
 *
 * Il n'invente pas non plus de SITUATION : la situation est dérivée de LA mission
 * prioritaire (`chooseCrewMission`, elle-même nourrie de faits serveur 0049).
 * Quand la mission est inconnue (`null` : lecture en cours ou échouée), la
 * situation est `null` et AUCUN signal n'est proposé — proposer « Je défends ce
 * soir » sans savoir s'il y a quoi que ce soit à défendre serait un mensonge poli.
 *
 * PURETÉ : aucune I/O, aucune horloge implicite (`nowMs` fourni), aucun aléa.
 * Aucun nombre magique : les bornes viennent de @klaim/shared/game-rules.
 */
import {
  CREW_PING_COOLDOWN_MIN,
  CREW_PING_FEED_MAX,
  CREW_PING_MAX_ACTIVE_PER_MEMBER,
  CREW_PING_TTL_H,
} from '@klaim/shared';
import type { CrewMission, CrewSectorState } from './crewMission';

// ─── Situations ──────────────────────────────────────────────────────────────

/**
 * Les quatre situations qu'un crew peut vivre, et la seule chose qui décide du
 * vocabulaire proposé. Elles ne se cumulent pas : `chooseCrewMission` a déjà
 * arbitré une priorité unique, et un écran qui proposerait le vocabulaire des
 * quatre à la fois retomberait dans le menu générique qu'on cherche à quitter.
 *
 *  · `defense`  — du territoire à nous expire bientôt ;
 *  · `attack`   — on a perdu des zones à reprendre, ou un secteur est ouvert ;
 *  · `loop`     — une frontière est ouverte, il manque des mètres pour fermer ;
 *  · `gather`   — rien d'urgent : reste l'organisation d'une sortie.
 */
export type CrewSituation = 'defense' | 'attack' | 'loop' | 'gather';

/**
 * Mission prioritaire → situation. `null` en entrée (on n'a PAS PU lire) ⇒ `null`
 * en sortie : l'ignorance ne se convertit pas en `gather`, sans quoi un échec
 * réseau ferait dire à l'app « tout est calme » alors qu'un secteur brûle.
 *
 * `capture` et `reclaim` partagent le vocabulaire d'ATTAQUE : dans les deux cas
 * on part prendre du terrain qui n'est pas à nous. Les distinguer donnerait deux
 * menus quasi identiques — de la complexité sans décision nouvelle (§A).
 */
export function crewSituationOf(mission: CrewMission | null): CrewSituation | null {
  if (mission === null) return null;
  switch (mission.kind) {
    case 'defend':
      return 'defense';
    case 'reclaim':
    case 'capture':
      return 'attack';
    case 'close_loop':
      return 'loop';
    case 'none':
      return 'gather';
    default:
      return null;
  }
}

// ─── Catalogue FIGÉ des signaux ──────────────────────────────────────────────

/**
 * Les 15 signaux. Un signal est une INTENTION DE COURSE (« j'y vais », « il me
 * faut du renfort »), jamais un commentaire sur quelqu'un : c'est ce qui rend le
 * vocabulaire utile sans être modérable.
 *
 * ANTI-SHAME (contrainte fondateur) : aucun signal ne permet de désigner un
 * membre, de reprocher une absence ni de pointer un manquement. `gather_out`
 * (« pas dispo ») est déclaratif et parle de SOI — c'est l'inverse d'un reproche,
 * et son absence obligerait à se justifier par un autre canal.
 */
export type CrewSignalKey =
  // Défense
  | 'defend_tonight'
  | 'defend_now'
  | 'defend_backup'
  | 'defend_covered'
  // Attaque (reprise ou conquête)
  | 'attack_now'
  | 'attack_tonight'
  | 'attack_backup'
  | 'attack_split'
  // Boucle de frontière
  | 'loop_closing'
  | 'loop_open'
  // Rassemblement (toujours pertinent)
  | 'gather_tonight'
  | 'gather_tomorrow'
  | 'gather_weekend'
  | 'gather_out'
  // Universel, rattaché à un secteur
  | 'watch';

/**
 * Portée d'un signal :
 *  · `sector` — il DÉSIGNE un secteur réel du crew (« ici », « cette zone ») ;
 *  · `crew`   — il s'adresse au crew sans lieu (« sortie ce soir ? »).
 *
 * La distinction n'est pas cosmétique : un signal `sector` sans secteur nommé
 * produirait « KORO a pingé … » — donc soit un blanc, soit un nom inventé. Les
 * deux sont exclus, il est donc simplement indisponible tant qu'aucun secteur
 * réel n'est lisible.
 */
export type CrewSignalScope = 'sector' | 'crew';

export interface CrewSignalDef {
  key: CrewSignalKey;
  scope: CrewSignalScope;
  /** Situations où le signal a un SENS. Hors de cette liste, il n'est pas proposé. */
  situations: readonly CrewSituation[];
}

/** Toutes les situations — pour les signaux qui ne sont jamais hors sujet. */
const ALL: readonly CrewSituation[] = ['defense', 'attack', 'loop', 'gather'];

/**
 * L'ORDRE de ce tableau est l'ordre d'affichage : le vocabulaire de la situation
 * en cours d'abord (c'est lui qu'on est venu chercher), le rassemblement ensuite.
 * `CREW_SIGNALS` est la SEULE source de vérité du vocabulaire — le catalogue
 * i18n en dérive par le typage (une clé ajoutée sans ses 5 langues ne compile pas).
 */
export const CREW_SIGNALS: readonly CrewSignalDef[] = [
  // ── Défense : on tient, il faut repasser dessus ──────────────────────────
  { key: 'defend_now', scope: 'sector', situations: ['defense'] },
  { key: 'defend_tonight', scope: 'sector', situations: ['defense'] },
  { key: 'defend_backup', scope: 'sector', situations: ['defense'] },
  // « c'est couvert » évite le gâchis le plus commun d'un crew : trois personnes
  // sur la même zone pendant que le reste tombe.
  { key: 'defend_covered', scope: 'sector', situations: ['defense'] },

  // ── Attaque : reprendre (reclaim) ou prendre du libre (capture) ───────────
  { key: 'attack_now', scope: 'sector', situations: ['attack'] },
  { key: 'attack_tonight', scope: 'sector', situations: ['attack'] },
  { key: 'attack_backup', scope: 'sector', situations: ['attack'] },
  { key: 'attack_split', scope: 'sector', situations: ['attack'] },

  // ── Boucle ouverte : il manque des mètres, pas des gens ───────────────────
  { key: 'loop_closing', scope: 'sector', situations: ['loop'] },
  { key: 'loop_open', scope: 'sector', situations: ['loop'] },

  // ── Universel, situé : « surveillez ça » n'est jamais hors contexte ───────
  { key: 'watch', scope: 'sector', situations: ALL },

  // ── Rassemblement : organiser une sortie est pertinent dans TOUTES les
  //    situations — c'est précisément la réponse à « défendre » comme à
  //    « reprendre ». D'où `ALL` et non `['gather']`.
  { key: 'gather_tonight', scope: 'crew', situations: ALL },
  { key: 'gather_tomorrow', scope: 'crew', situations: ALL },
  { key: 'gather_weekend', scope: 'crew', situations: ALL },
  { key: 'gather_out', scope: 'crew', situations: ALL },
];

/** Index clé → définition (lecture O(1) côté écran et côté validation). */
export const CREW_SIGNAL_BY_KEY: Readonly<Record<CrewSignalKey, CrewSignalDef>> =
  Object.fromEntries(CREW_SIGNALS.map((s) => [s.key, s])) as Record<
    CrewSignalKey,
    CrewSignalDef
  >;

/** Toutes les clés, pour les gardes serveur et les tests d'exhaustivité. */
export const CREW_SIGNAL_KEYS: readonly CrewSignalKey[] = CREW_SIGNALS.map((s) => s.key);

// ─── Secteurs réellement pingables ───────────────────────────────────────────

/**
 * Un secteur RÉEL du crew, pingable, tel qu'il sera affiché.
 * `id` et `name` sont tous deux non-nuls : c'est la condition d'existence.
 */
export interface PingableSector {
  id: string;
  name: string;
}

/**
 * Secteurs qu'un membre peut épingler. Trois conditions, chacune contre un
 * mensonge précis :
 *
 *  1. `sectorId !== null` — sans identifiant, le serveur ne pourrait rattacher
 *     le ping à rien de vérifiable ;
 *  2. `sectorName !== null` (et non vide) — `discover_sectors` nomme les secteurs
 *     de façon asynchrone (Nominatim, rate-limité). Un secteur pas encore nommé
 *     est un état NORMAL, pas une erreur : on ne lui fabrique pas de nom de repli
 *     (« Secteur 3 » serait une invention affichée comme un lieu) ;
 *  3. le crew y a un lien RÉEL — il y tient des zones (`heldTotal > 0`) ou vient
 *     d'y perdre (`lostRecently > 0`). On ne peut pas pinger un quartier où le
 *     crew n'a jamais mis les pieds : ce serait désigner une cible fabriquée.
 *
 * Tri par nom : ordre stable et lisible, indépendant de l'ordre de la charge
 * utile serveur. La liste peut légitimement être VIDE — l'écran le dit alors,
 * il ne propose pas un secteur par défaut.
 */
export function pingableSectors(
  sectors: readonly CrewSectorState[],
): readonly PingableSector[] {
  const out: PingableSector[] = [];
  for (const s of sectors) {
    if (s.sectorId === null) continue;
    const name = s.sectorName;
    if (name === null || name.trim().length === 0) continue;
    if (s.heldTotal <= 0 && s.lostRecently <= 0) continue;
    out.push({ id: s.sectorId, name });
  }
  return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

// ─── Signaux proposés pour une situation ─────────────────────────────────────

/**
 * Le jeu de signaux à proposer MAINTENANT.
 *
 * `situation === null` ⇒ tableau VIDE : on ne sait pas ce que vit le crew, donc
 * on ne propose rien (et surtout pas « au cas où »).
 *
 * `hasPingableSector === false` ⇒ les signaux de portée `sector` disparaissent :
 * ils désigneraient un lieu qu'on ne sait pas nommer. Les signaux de crew, eux,
 * restent : organiser une sortie ne demande aucun territoire.
 */
export function crewSignalsFor(
  situation: CrewSituation | null,
  hasPingableSector: boolean,
): readonly CrewSignalDef[] {
  if (situation === null) return [];
  return CREW_SIGNALS.filter(
    (s) =>
      s.situations.includes(situation) && (s.scope === 'crew' || hasPingableSector),
  );
}

// ─── Décision d'émission d'un ping (anti-spam, bornes game-rules) ────────────

/** Ce que l'appelant sait de MOI au moment où j'appuie. Aucune horloge cachée. */
export interface CrewPingAttempt {
  nowMs: number;
  signal: CrewSignalKey;
  /** Situation courante, dérivée de la mission (jamais choisie par l'écran). */
  situation: CrewSituation | null;
  /** Secteur visé, ou `null` pour un signal de portée `crew`. */
  sectorId: string | null;
  /** Secteurs RÉELLEMENT pingables (ids), issus de `pingableSectors`. */
  pingableSectorIds: readonly string[];
  /** Mes pings encore ACTIFS (non expirés), comptés serveur. */
  myActivePings: number;
  /** Date de mon dernier ping émis (ms epoch), `null` si je n'en ai jamais posé. */
  myLastPingAt: number | null;
}

/**
 * Motifs de refus. Ils sont tous EXPLICABLES à l'écran : un refus muet ferait
 * croire à un bug, et un refus vague (« réessaie ») est une petite malhonnêteté.
 */
export type CrewPingRefusal =
  /** Clé inconnue du catalogue (client plus vieux/neuf que le serveur). */
  | 'unknown_signal'
  /** Le signal n'a pas de sens dans la situation courante — ou on ignore la situation. */
  | 'out_of_context'
  /** Signal de portée `sector` sans secteur choisi. */
  | 'sector_required'
  /** Secteur fourni pour un signal de crew : on refuse plutôt que d'ignorer. */
  | 'sector_unexpected'
  /** Secteur qui n'est pas dans la liste réelle du crew (jamais toléré). */
  | 'sector_not_allowed'
  /** Trop tôt après mon ping précédent (CREW_PING_COOLDOWN_MIN). */
  | 'cooldown';

export type CrewPingDecision =
  | {
      ok: true;
      /**
       * true ⇒ ce ping REMPLACE le mien encore actif. L'écran doit le DIRE avant
       * d'envoyer : sinon un membre croirait avoir posté deux pings quand le
       * premier vient de disparaître.
       */
      replacesPrevious: boolean;
      /** Expiration à poser (ms epoch) — le serveur reste seul juge à l'écriture. */
      expiresAt: number;
    }
  | {
      ok: false;
      reason: CrewPingRefusal;
      /** Secondes restantes avant de pouvoir re-pinger (refus `cooldown` uniquement). */
      retryInS?: number;
    };

const MS_PER_MIN = 60_000;
const MS_PER_H = 3_600_000;

/**
 * Le ping est-il légitime ? PURE et exhaustive : cette même fonction garde
 * l'écran (griser plutôt que laisser taper dans le vide) ET documente ce que la
 * RPC re-vérifie côté serveur. Le client ne « décide » rien : il anticipe le
 * verdict pour ne pas mentir sur l'issue — l'écriture, elle, reste serveur.
 *
 * L'ordre des contrôles va du plus STRUCTUREL (la clé existe-t-elle ?) au plus
 * conjoncturel (le cooldown), pour que le motif rendu soit le plus explicatif :
 * dire « trop tôt » à propos d'un signal hors contexte n'aiderait personne.
 */
export function crewPingDecision(attempt: CrewPingAttempt): CrewPingDecision {
  const def = CREW_SIGNAL_BY_KEY[attempt.signal] as CrewSignalDef | undefined;
  if (!def) return { ok: false, reason: 'unknown_signal' };

  // Situation inconnue = pas de contexte du tout. On refuse au lieu de laisser
  // passer : un ping émis « à l'aveugle » serait affiché au crew comme un fait.
  if (attempt.situation === null || !def.situations.includes(attempt.situation)) {
    return { ok: false, reason: 'out_of_context' };
  }

  if (def.scope === 'sector') {
    if (attempt.sectorId === null) return { ok: false, reason: 'sector_required' };
    if (!attempt.pingableSectorIds.includes(attempt.sectorId)) {
      return { ok: false, reason: 'sector_not_allowed' };
    }
  } else if (attempt.sectorId !== null) {
    // Silencieusement ignorer le secteur produirait un ping dont le sens diffère
    // de ce que l'émetteur a vu à l'écran. On refuse : l'appelant a un bug.
    return { ok: false, reason: 'sector_unexpected' };
  }

  if (attempt.myLastPingAt !== null) {
    const elapsed = attempt.nowMs - attempt.myLastPingAt;
    const cooldown = CREW_PING_COOLDOWN_MIN * MS_PER_MIN;
    // `elapsed < 0` (horloge client en retard sur le serveur) est traité comme
    // « trop tôt » : on préfère un refus temporaire à un contournement.
    if (elapsed < cooldown) {
      return {
        ok: false,
        reason: 'cooldown',
        // Arrondi vers le HAUT : annoncer 4 s quand il en reste 4,2 ferait
        // échouer la seconde tentative, et « ça ne marche pas » est pire qu'attendre.
        retryInS: Math.max(1, Math.ceil((cooldown - elapsed) / 1000)),
      };
    }
  }

  return {
    ok: true,
    replacesPrevious: attempt.myActivePings >= CREW_PING_MAX_ACTIVE_PER_MEMBER,
    expiresAt: attempt.nowMs + CREW_PING_TTL_H * MS_PER_H,
  };
}

// ─── Lecture : les pings à afficher ──────────────────────────────────────────

/**
 * Un ping tel qu'il revient du serveur. AUCUN texte libre : `signal` est une clé
 * du catalogue, `sectorName` un nom géocodé réel, `authorPseudo` un pseudo déjà
 * modéré à l'inscription (0047). Rien d'autre ne transite.
 */
export interface CrewPing {
  id: string;
  authorUserId: string;
  authorPseudo: string;
  signal: CrewSignalKey;
  /** `null` pour un signal de crew (« sortie ce soir ? »). */
  sectorId: string | null;
  /** `null` pour un signal de crew. Jamais une chaîne fabriquée. */
  sectorName: string | null;
  createdAt: number;
  expiresAt: number;
}

/**
 * Les pings à AFFICHER : non expirés, les plus récents d'abord, plafonnés à
 * CREW_PING_FEED_MAX.
 *
 * L'expiration est re-vérifiée ICI en plus du serveur, et ce n'est pas une
 * redondance inutile : entre la lecture et l'affichage il s'écoule du temps
 * (écran laissé ouvert, retour d'arrière-plan). Sans ce filtre, un « je défends
 * ce soir » resterait affiché le lendemain matin — l'app aurait menti sans qu'une
 * seule ligne ne soit fausse au moment où elle a été écrite.
 *
 * Un signal devenu inconnu (client plus ancien que le serveur) est ÉCARTÉ : on
 * n'affiche pas une clé technique, et on n'invente pas de libellé de repli.
 */
export function visibleCrewPings(
  pings: readonly CrewPing[],
  nowMs: number,
): readonly CrewPing[] {
  return pings
    .filter((p) => p.expiresAt > nowMs && CREW_SIGNAL_BY_KEY[p.signal] !== undefined)
    .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, CREW_PING_FEED_MAX);
}
