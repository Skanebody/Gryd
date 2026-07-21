// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/dailyZone.ts

/**
 * GRYD — engine/dailyZone.ts — LA ZONE DU JOUR (A-45 §3, action 3).
 *
 * LE PROBLÈME QUE CE FICHIER RÉSOUT. L'audit A-44 §2 constate qu'il n'existe
 * aucune raison QUOTIDIENNE de rouvrir GRYD : la carte est la même qu'hier, le
 * decay se compte en semaines, et rien ne dit « aujourd'hui, il se passe ÇA ».
 * La Zone du Jour est cette raison — une zone désignée chaque jour, que capturer
 * donne une DISTINCTION VISUELLE TEMPORAIRE.
 *
 * ═══ CE QUE LA RÉCOMPENSE EST, ET CE QU'ELLE N'EST PAS ═══════════════════════
 * La distinction est PUREMENT COSMÉTIQUE et dure DAILY_ZONE_DISTINCTION_H.
 * Zéro point, zéro XP, zéro Foulée, zéro Éclat, zéro influence sur le decay, le
 * classement ou la défense. C'est une contrainte, pas une timidité : la mécanique
 * est GRATUITE (décision fondateur 21/07 : monétisation par achats intégrés
 * uniquement) et l'anti pay-to-win est STRICT — une mécanique quotidienne qui
 * donnerait le moindre point deviendrait mécaniquement un avantage pour qui peut
 * courir tous les jours, et un futur levier de vente. Elle n'en donne aucun.
 *
 * ═══ POURQUOI LE TIRAGE EST PAR VILLE, ET PAS PAR JOUEUR ════════════════════
 * C'est L'ARBITRAGE central de ce fichier, et il se défend :
 *
 *  · Une zone tirée PAR JOUEUR est invérifiable. Personne ne peut confirmer à un
 *    coureur que sa « zone du jour » était bien la sienne : c'est une promesse
 *    que seul le serveur connaît, donc une promesse qu'on ne peut pas AUDITER.
 *    Dans une app dont la règle première est « l'app ne ment jamais », une
 *    récompense non vérifiable par un tiers est une mauvaise fondation.
 *  · Une zone tirée PAR VILLE est un FAIT PARTAGÉ. Deux coureurs de la même
 *    ville voient la même zone, peuvent se le dire, s'y croiser, se la disputer.
 *    C'est ce qui transforme une notification en événement — et c'est aussi ce
 *    qui rend la mécanique intéressante quand la densité arrive (A-45 §4 : la
 *    densité locale est l'actif réel de GRYD).
 *  · `city_zones.city_id` est une donnée RÉELLE (migration 0033), déjà rattachée
 *    aux claims. Le tirage n'a donc besoin d'inventer aucun regroupement.
 *
 * Le prix payé, assumé : la zone tirée peut être loin du coureur. On ne la
 * remplace pas par une zone plus proche (ça re-fragmenterait le tirage et
 * casserait le partage) ; on affiche la DISTANCE RÉELLE et le coureur décide.
 * Une zone lointaine annoncée honnêtement vaut mieux qu'une zone proche fabriquée.
 *
 * ═══ POURQUOI LE TIRAGE EST DÉTERMINISTE (ET REPRODUCTIBLE SERVEUR) ══════════
 * Le tirage est une fonction PURE de (`dayKey`, `cityId`, liste des candidats).
 * Aucun `Math.random`, aucune horloge implicite, aucun état stocké : le serveur
 * REFAIT le même calcul et retombe sur la même zone, ce qui permet de valider une
 * capture sans avoir persisté le tirage (« tout claim est décidé serveur » sans
 * table de tirage à maintenir, donc sans risque de divergence client/serveur).
 * Le hash est FNV-1a 32 bits : petit, stable, sans dépendance — ses deux
 * constantes sont des constantes d'ALGORITHME (la spec FNV), pas des constantes
 * de jeu ; les seuils de jeu, eux, viennent tous de game-rules.
 *
 * ═══ CE QUI N'EST JAMAIS FABRIQUÉ ═══════════════════════════════════════════
 * Chaque candidat vient d'un compte réel en base : zones libres d'un secteur
 * (`sectors.total_hexes` − claims vivants) et zones fragiles (`hex_claims.decay_at`
 * dans la fenêtre). Quand la liste éligible est vide, quand la ville est inconnue
 * ou quand le jour est illisible, la réponse est `{ kind: 'none' }` — un ÉTAT
 * HONNÊTE que l'écran dit tel quel (« pas de zone du jour aujourd'hui »), et
 * surtout pas un prétexte à en désigner une au hasard sur la carte.
 *
 * Aucun nombre magique : les seuils viennent de @klaim/shared/game-rules.
 */
import {
  DAILY_ZONE_MIN_FREE_HEXES,
} from '../game-rules.ts';

// ─── Entrées : l'état RÉEL des secteurs d'une ville, tel que lu en base ───────

/**
 * Un secteur RÉEL de la ville, réduit aux deux faits qui le rendent éligible.
 *
 * `sectorName` peut être `null` : `discover_sectors` nomme les secteurs de façon
 * asynchrone (Nominatim, rate-limité). Un secteur pas encore nommé reste un
 * candidat parfaitement valide — l'écran dira « une zone de ta ville » plutôt
 * que d'inventer un nom de quartier.
 */
export interface DailyZoneCandidate {
  /** `sectors.id` — identité réelle, sert aussi d'ordre de tri stable. */
  sectorId: string;
  /** Nom RÉEL (reverse-geocode) ou `null` tant que le secteur n'est pas nommé. */
  sectorName: string | null;
  /**
   * Zones réellement LIBRES du secteur (`total_hexes` − claims vivants).
   * `null` = INCONNU (secteur sans total fiable), ce qui n'est PAS « 0 libre » :
   * un secteur au total inconnu ne peut pas être proposé comme conquête, il est
   * donc écarté de la branche `neutral` au lieu d'être compté vide ou plein.
   */
  freeHexes: number | null;
  /**
   * Zones du secteur dont l'échéance de decay tombe dans
   * DAILY_ZONE_FRAGILE_WINDOW_H. Comptées en base (la fenêtre est passée à la
   * RPC depuis game-rules : aucun seuil en dur en SQL non plus).
   */
  fragileHexes: number;
}

/** Tout ce dont le tirage a besoin. Aucune horloge, aucun aléa, aucune I/O. */
export interface DailyZoneState {
  /**
   * Jour du tirage au format `YYYY-MM-DD`, dans le fuseau du JOUEUR (calculé par
   * l'appelant via `dayKeyOf`). Un format invalide n'est pas « réparé » : il
   * produit `none`, parce qu'un tirage sur un jour faux serait un tirage faux.
   */
  dayKey: string;
  /**
   * Ville RÉELLE du joueur (`city_zones.city_id`), ou `null` s'il court hors
   * zone dense — cas parfaitement normal (la France/l'Europe entière est
   * capturable, A-35), qui donne simplement `none` plutôt qu'un rattachement
   * inventé à la ville la plus proche.
   */
  cityId: string | null;
  /** Secteurs réels de cette ville. Vide = `none`, jamais un secteur fabriqué. */
  candidates: readonly DailyZoneCandidate[];
}

// ─── Sortie : AU PLUS UNE zone ───────────────────────────────────────────────

/**
 * Motif d'absence. Les trois se disent DIFFÉREMMENT à l'écran, parce qu'ils ne
 * demandent pas la même chose au joueur :
 *  · `no_city`      : le joueur court hors zone dense — rien à corriger, la
 *                     mécanique ne s'applique simplement pas ici ;
 *  · `no_candidate` : la ville est connue mais aucun secteur n'est ni ouvert ni
 *                     fragile aujourd'hui (tout est tenu et stable) ;
 *  · `bad_day_key`  : entrée illisible — bug d'appelant, jamais montré comme un
 *                     fait de jeu.
 * Aucun n'est un échec : ce sont des VÉRITÉS sur l'état du monde réel.
 */
export type DailyZoneNoneReason = 'no_city' | 'no_candidate' | 'bad_day_key';

/**
 * Le RÔLE de la zone tirée — ce qu'on y fait, pas qui la tient. On n'expose
 * jamais l'identité du détenteur d'une zone fragile : la doctrine bannit les
 * rivaux fabriqués, et nommer un vrai joueur sur un objectif quotidien partagé
 * par toute une ville ouvrirait un vecteur de harcèlement non modéré.
 */
export type DailyZoneRole = 'neutral' | 'fragile';

export type DailyZone =
  | {
      kind: 'zone';
      /** Rappelés pour que l'appelant puisse re-vérifier le tirage tel quel. */
      dayKey: string;
      cityId: string;
      sectorId: string;
      sectorName: string | null;
      role: DailyZoneRole;
      /** Zones libres comptées (≥ DAILY_ZONE_MIN_FREE_HEXES si role='neutral'). */
      freeHexes: number | null;
      /** Zones fragiles comptées (≥ 1 si role='fragile'). */
      fragileHexes: number;
    }
  | { kind: 'none'; reason: DailyZoneNoneReason };

// ─── Garde-fous d'entrée ─────────────────────────────────────────────────────

/**
 * Entier fini ≥ 0, sinon 0. Une valeur aberrante (NaN, négatif, Infinity, texte)
 * ne doit JAMAIS rendre un secteur éligible : elle le rend inéligible.
 */
function count(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/**
 * Compte OPTIONNEL : `null` reste `null` (inconnu ≠ zéro). Toute autre valeur
 * non exploitable retombe sur `null` — « je ne sais pas » plutôt que « 0 libre »,
 * parce que confondre les deux ferait proposer, ou taire, une conquête à tort.
 */
function optionalCount(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v > 0 ? Math.floor(v) : 0;
}

/** Chaîne non vide après trim, sinon `null`. */
function text(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length > 0 ? s : null;
}

/** `YYYY-MM-DD` STRICT — ni date « réparée », ni format alternatif toléré. */
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Jour local et hash déterministe ─────────────────────────────────────────

const MS_PER_MINUTE = 60_000;

/**
 * Jour local `YYYY-MM-DD` d'un instant, PURE. L'offset (minutes à AJOUTER à
 * l'UTC, ex. +120 pour Paris en été) est fourni par l'appelant : la fonction
 * n'interroge jamais le fuseau de la machine, sans quoi un test et un serveur
 * ne tireraient pas le même jour.
 *
 * Pourquoi le jour LOCAL et pas UTC : « aujourd'hui » est une notion vécue. Un
 * coureur qui sort à 23 h à Paris doit voir la zone de SA journée, pas celle de
 * demain en UTC.
 */
export function dayKeyOf(nowMs: number, utcOffsetMinutes = 0): string | null {
  if (!Number.isFinite(nowMs) || !Number.isFinite(utcOffsetMinutes)) return null;
  const shifted = new Date(nowMs + utcOffsetMinutes * MS_PER_MINUTE);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  if (!Number.isFinite(y)) return null;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * FNV-1a 32 bits. Constantes d'ALGORITHME (spec FNV : offset basis 2166136261,
 * prime 16777619) — ce ne sont pas des constantes de JEU, elles n'ont donc rien
 * à faire dans game-rules et ne sont jamais « réglées ».
 *
 * Pourquoi un hash plutôt qu'un simple `jour % n` : l'index doit changer de
 * façon non triviale d'un jour à l'autre ET d'une ville à l'autre. Un modulo sur
 * le numéro de jour ferait défiler les secteurs dans l'ordre, toujours le même,
 * et donnerait la même position à toutes les villes le même jour.
 */
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    // Multiplication par 16777619 en arithmétique 32 bits non signée.
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ─── Le tirage ───────────────────────────────────────────────────────────────

/**
 * Tire LA Zone du Jour de la ville, ou `none`. PURE et DÉTERMINISTE : mêmes
 * entrées ⇒ même zone, toujours, sur le client comme sur le serveur.
 *
 * ÉLIGIBILITÉ (un secteur est candidat s'il porte au moins un des deux faits) :
 *   · NEUTRE  — `freeHexes >= DAILY_ZONE_MIN_FREE_HEXES` : il reste vraiment du
 *     terrain libre à prendre. `freeHexes === null` (total inconnu) n'est PAS
 *     éligible par cette branche : on ne propose pas une conquête qu'on ne sait
 *     pas exister.
 *   · FRAGILE — `fragileHexes >= 1` : au moins une zone du secteur arrive à
 *     échéance dans la fenêtre, échéance RÉELLE lue en base.
 *
 * Un secteur éligible par les deux est étiqueté `neutral` : à faits égaux, on
 * préfère envoyer les coureurs sur du terrain libre plutôt que sur le territoire
 * de quelqu'un. Ce n'est pas de la pudeur — c'est ce qui évite qu'une mécanique
 * quotidienne, partagée par toute une ville, se transforme en désignation
 * collective d'une cible.
 *
 * TIRAGE : `fnv1a32("<dayKey>:<cityId>") % n` sur la liste éligible triée par
 * `sectorId`. Le tri rend l'index insensible à l'ordre de la requête SQL — sans
 * lui, un `ORDER BY` modifié changerait la zone du jour sans que personne ne
 * l'ait décidé.
 */
export function chooseDailyZone(state: DailyZoneState): DailyZone {
  const dayKey = text(state?.dayKey);
  if (dayKey === null || !DAY_KEY_RE.test(dayKey)) {
    return { kind: 'none', reason: 'bad_day_key' };
  }

  const cityId = text(state?.cityId);
  if (cityId === null) return { kind: 'none', reason: 'no_city' };

  const raw = Array.isArray(state?.candidates) ? state.candidates : [];

  const eligible = raw
    .map((c) => ({
      sectorId: text(c?.sectorId),
      sectorName: text(c?.sectorName),
      freeHexes: optionalCount(c?.freeHexes),
      fragileHexes: count(c?.fragileHexes),
    }))
    // Un secteur sans identité réelle n'est pas un secteur : on ne peut ni le
    // trier de façon stable, ni enregistrer une capture dessus.
    .filter((c): c is { sectorId: string; sectorName: string | null; freeHexes: number | null; fragileHexes: number } =>
      c.sectorId !== null,
    )
    .map((c) => ({
      ...c,
      role: ((c.freeHexes !== null && c.freeHexes >= DAILY_ZONE_MIN_FREE_HEXES)
        ? 'neutral'
        : c.fragileHexes >= 1
          ? 'fragile'
          : null) as DailyZoneRole | null,
    }))
    .filter((c): c is typeof c & { role: DailyZoneRole } => c.role !== null)
    // Ordre TOTAL et stable : les sectorId sont uniques, donc pas d'ex aequo à
    // départager — l'index du hash désigne toujours la même ligne.
    .sort((a, b) => (a.sectorId === b.sectorId ? 0 : a.sectorId < b.sectorId ? -1 : 1));

  if (eligible.length === 0) return { kind: 'none', reason: 'no_candidate' };

  const picked = eligible[fnv1a32(`${dayKey}:${cityId}`) % eligible.length];
  // Inatteignable (index borné par la longueur), mais on ne renvoie jamais un
  // objet à moitié construit plutôt que de laisser passer un `undefined`.
  if (picked === undefined) return { kind: 'none', reason: 'no_candidate' };

  return {
    kind: 'zone',
    dayKey,
    cityId,
    sectorId: picked.sectorId,
    sectorName: picked.sectorName,
    role: picked.role,
    freeHexes: picked.freeHexes,
    fragileHexes: picked.fragileHexes,
  };
}

/**
 * La distinction obtenue le `awardedAtMs` est-elle encore active à `nowMs` ?
 * PURE. Sert l'affichage (badge temporaire) ET la purge : rien à révoquer, la
 * distinction s'éteint d'elle-même au bout de DAILY_ZONE_DISTINCTION_H et ne
 * retire jamais RIEN au joueur (aucun point n'ayant jamais été donné).
 */
export function isDistinctionActive(
  awardedAtMs: number | null,
  nowMs: number,
  distinctionHours: number,
): boolean {
  if (awardedAtMs === null || !Number.isFinite(awardedAtMs)) return false;
  if (!Number.isFinite(nowMs) || !Number.isFinite(distinctionHours) || distinctionHours <= 0) {
    return false;
  }
  const endsAt = awardedAtMs + distinctionHours * 3_600_000;
  return nowMs >= awardedAtMs && nowMs < endsAt;
}
