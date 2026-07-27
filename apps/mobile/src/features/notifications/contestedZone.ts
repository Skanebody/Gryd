/**
 * GRYD — E70 « ZONE ATTAQUÉE » (spec produit UI/UX l.2177) : MOTEUR PUR.
 * Zéro React, zéro Supabase, zéro horloge implicite — testé sans réseau ni
 * rendu (`contestedZone.test.ts`).
 *
 * ═══ LA RÈGLE QUI FONDE CET ÉCRAN ═══════════════════════════════════════════
 * **UNE ZONE ATTAQUÉE EST UN FAIT SERVEUR, PAS UNE DÉDUCTION CLIENT.** Elle
 * existe si, et seulement si, `public.territory_contests` (migration 0078) porte
 * une ligne qui la décrit. Aucune fonction de ce module ne prend « la carte »,
 * « la dernière course » ou « l'état d'un territoire » pour en INFÉRER une
 * attaque : l'entrée est une ligne de contestation lue telle quelle. Si le fait
 * n'arrive pas — RLS qui ne me rend rien, identifiant inconnu, lecture ratée —
 * la sortie est un état d'ABSENCE, jamais une attaque de repli.
 *
 * ═══ LES SEPT SORTIES, ET POURQUOI AUCUNE N'EST LE REPLI D'UNE AUTRE ════════
 *  · `loading`      — on lit. N'affirme RIEN sur le territoire du joueur.
 *  · `signed_out`   — pas de compte / pas de backend : `territory_contests`
 *                     n'est accordée qu'à `authenticated` (0078 §4), la lecture
 *                     échouerait. On le dit AVANT de la tenter.
 *  · `failed`       — la lecture a échoué. Une contestation existe peut-être :
 *                     on ne le sait pas, donc on ne dit ni « attaquée » ni
 *                     « calme ». On propose de réessayer.
 *  · `not_found`    — lecture ABOUTIE, aucune ligne. Deux causes rendues
 *                     INDISTINGUABLES à dessein (même arbitrage qu'en
 *                     `rivalZonesRead`) : cet identifiant n'existe pas, ou la
 *                     policy `territory_contests_select_parties` ne me le rend
 *                     pas parce que je n'en suis pas partie. Les séparer ferait
 *                     de l'écran un oracle d'existence de contestations.
 *  · `not_defender` — la contestation m'est VISIBLE, mais la zone visée n'est
 *                     pas une zone que je détiens EN PROPRE. Deux situations
 *                     réelles : je suis le camp qui ATTAQUE (la policy m'ouvre
 *                     les deux camps), ou la zone appartient à mon CREW. Dans
 *                     les deux cas, titrer « ta zone est contestée » serait
 *                     faux. Cf. la note « défense de crew » plus bas.
 *  · `closed`       — la contestation est TRANCHÉE (`defended` / `transferred`
 *                     / `cancelled`). Il n'y a plus rien à défendre : peindre un
 *                     compte à rebours sur une affaire close serait une alarme
 *                     inventée.
 *  · `window_closed`— encore `active` en base, mais l'échéance est PASSÉE. Ce
 *                     n'est pas un bug : `resolve_due_contests` (0080) est un
 *                     cron, il y a donc une fenêtre où la base dit « ouverte »
 *                     alors que le temps de défendre est écoulé. On dit
 *                     exactement ça — jamais un rebours négatif, jamais un
 *                     « 0 h 0 » qui laisserait croire qu'il reste une chance.
 *  · `under_attack` — le seul état qui alarme, et il repose sur trois faits
 *                     serveur simultanés : ligne `active`, échéance à venir,
 *                     zone dont JE suis le propriétaire.
 *
 * ═══ CE QUE CE MODULE NE CALCULE PAS, ET POURQUOI ═══════════════════════════
 * · AUCUNE DURÉE DE FENÊTRE. `expires_at` est un INSTANT déjà calculé serveur
 *   par `contestDeadline` depuis `FORTIFICATION_WINDOW_HOURS_BY_LEVEL`. Ce
 *   module SOUSTRAIT deux instants ; il ne dérive aucun seuil de jeu et ne
 *   contient donc aucun nombre magique (CLAUDE.md).
 * · AUCUNE « BOUCLE DE DÉFENSE ESTIMÉE ». La spec la liste ; rien dans le dépôt
 *   ne sait produire, pour CE polygone, une distance ou un temps de course qui
 *   soit autre chose qu'une invention. Elle est donc ABSENTE de `Facts` et son
 *   absence est NOMMÉE à l'écran, plutôt que remplie par un chiffre plausible.
 * · AUCUN SEUIL D'URGENCE (« plus que 2 h ! »). Le ton exigé par la spec est
 *   « des faits, une échéance, une décision. Pas d'alarme anxiogène » : le temps
 *   restant est rendu tel quel, sans palier rouge dérivé d'une constante qui
 *   n'existe pas.
 *
 * ═══ VIE PRIVÉE (§12) : CE QUI PEUT ÊTRE NOMMÉ, ET PAR QUI ══════════════════
 * `rivalName` n'est PAS lu depuis `territory_contests`. La policy me rendrait
 * `attacker_id`, mais un identifiant n'est pas une identité publique : le nom ne
 * peut venir que de `user_profiles`, dont la policy `user_profiles_select_visible`
 * (0011:201) applique le CONSENTEMENT du rival côté serveur. Conséquence assumée
 * et VISIBLE : un rival qui n'a pas rendu son profil visible reste ANONYME ici
 * (`rivalName: null`), et l'écran le dit — il ne fabrique pas un nom pour
 * ressembler à la planche. Aucun horaire précis, aucun départ/arrivée, aucune
 * trace brute ne transite : `started_at` ne sert QU'À l'ancienneté relative, et
 * la géométrie rendue est `geometry_generalized`.
 *
 * ═══ DÉFENSE DE CREW : NON COUVERTE, ET DITE ════════════════════════════════
 * Une zone `owner_type = 'crew'` contestée est un fait serveur tout aussi réel,
 * mais savoir si J'EN SUIS le défenseur exige une lecture de `crew_members` que
 * ce lot n'écrit pas. Elle tombe donc en `not_defender`, avec une copie qui
 * NOMME la limite. C'est le même choix qu'en `useActivityEvents`, qui ne fait
 * remonter au flux que les contestations visant des territoires `owner_type =
 * 'user'` : les deux surfaces racontent la même histoire, plutôt que l'une
 * promettre ce que l'autre ne tient pas.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. LA FORME SERVEUR LUE — la liste vit ici, à côté de son interprétation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Colonnes lues sur `public.territory_contests` pour E70. Écrite ICI pour qu'un
 * ajout au `select` soit forcément un ajout RAISONNÉ. Par rapport à
 * `CONTEST_FEED_COLUMNS` (le flux E69), trois colonnes s'ajoutent — et chacune a
 * une raison d'écran :
 *   · `overlap_ratio`  → « ta zone a été couverte à X % », un fait MESURÉ et
 *     persisté (0078), pas une estimation ;
 *   · `attacker_type`  → savoir s'il y a un profil public à tenter de résoudre ;
 *   · `attacker_id`    → la clé de cette résolution, qui reste soumise au
 *     consentement du rival (cf. l'en-tête). Elle ne quitte JAMAIS l'appareil :
 *     aucun event analytics ne la porte (§18.2).
 * Ce qui reste NON demandé : `source_activity_id` (il désigne la course du
 * rival — §12), `created_at`, `updated_at`.
 */
export const CONTESTED_ZONE_COLUMNS =
  'id, territory_id, status, started_at, expires_at, overlap_ratio, attacker_type, attacker_id';

/** Une ligne `territory_contests` telle que le `select` ci-dessus la rend. */
export interface ContestRow {
  readonly id: string;
  readonly territory_id: string;
  /** 'active' | 'defended' | 'transferred' | 'cancelled' (0078). */
  readonly status: string;
  readonly started_at: string | null;
  readonly expires_at: string | null;
  /** ∈ [0,1] — fraction de l'aire du territoire couverte par la boucle rivale. */
  readonly overlap_ratio: number | null;
  readonly attacker_type: string | null;
  readonly attacker_id: string | null;
}

/**
 * Colonnes lues sur `public.territories` pour la zone visée. `geometry` (le
 * polygone AUTORITAIRE) n'est PAS demandée, alors même que la policy me
 * l'ouvrirait sur MA zone : la carte de cet écran n'a besoin que d'une forme
 * lisible, et ne demander que le contour généralisé garantit qu'aucun tracé fin
 * ne traverse le réseau pour un simple accusé de réception d'alerte.
 */
export const CONTESTED_TERRITORY_COLUMNS =
  'id, owner_type, owner_id, area_m2, defense_level, geometry_generalized';

/** Anneau `[lng, lat]`, la forme que sait dessiner `mapFrame`. */
export type ZoneRing = readonly (readonly [number, number])[];

/**
 * La zone visée, déjà réduite à ce que l'écran dessine. `rings` est `null`
 * quand `geometry_generalized` est absente ou illisible : la carte disparaît
 * alors et son absence est dite. AUCUN repli sur la géométrie fine.
 */
export interface ContestedTerritory {
  readonly id: string;
  /** True seulement si `owner_type = 'user'` ET `owner_id` = le lecteur. */
  readonly mineAsUser: boolean;
  readonly areaM2: number | null;
  readonly rings: ZoneRing[] | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. LE RÉSULTAT DE LECTURE (produit par le hook, consommé par le moteur)
// ═══════════════════════════════════════════════════════════════════════════

export type ContestedZoneRead =
  | { readonly kind: 'loading' }
  | { readonly kind: 'signed_out' }
  | { readonly kind: 'failed' }
  | { readonly kind: 'not_found' }
  | {
      readonly kind: 'loaded';
      readonly contest: ContestRow;
      /**
       * `null` = la contestation est visible mais son territoire ne l'est pas
       * (course de la RLS, ligne supprimée entre les deux lectures). Traité
       * comme `not_defender` : sans territoire, rien ne prouve que je défends.
       */
      readonly territory: ContestedTerritory | null;
      /** Pseudo public du rival, ou `null` s'il n'a pas consenti (cf. en-tête). */
      readonly rivalName: string | null;
    };

// ═══════════════════════════════════════════════════════════════════════════
// 3. LE TEMPS RESTANT — une soustraction, jamais une règle de jeu
// ═══════════════════════════════════════════════════════════════════════════

/** Millisecondes dans une heure / une minute. Unités, pas des constantes de jeu. */
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

/**
 * Temps restant avant `expiresAtMs`, décomposé en heures + minutes ENTIÈRES.
 *
 * `null` dès que l'échéance est atteinte ou passée : il n'existe PAS de « temps
 * restant négatif », et rendre `{ h: 0, m: 0 }` laisserait croire qu'il reste
 * une poignée de secondes alors que la fenêtre est close. L'appelant traduit ce
 * `null` en `window_closed`, qui est un état, pas un compteur à zéro.
 *
 * TRONCATURE (`floor`) et non arrondi : dire « il reste 3 h » quand il reste
 * 2 h 55 donnerait au joueur cinq minutes qu'il n'a pas. On minore toujours.
 */
export function remainingWindow(
  expiresAtMs: number,
  nowMs: number,
): { readonly hours: number; readonly minutes: number } | null {
  if (!Number.isFinite(expiresAtMs) || !Number.isFinite(nowMs)) return null;
  const left = expiresAtMs - nowMs;
  if (left <= 0) return null;
  return {
    hours: Math.floor(left / MS_PER_HOUR),
    minutes: Math.floor((left % MS_PER_HOUR) / MS_PER_MINUTE),
  };
}

/**
 * `overlap_ratio` ∈ [0,1] → pourcentage ENTIER, ou `null` si la valeur est
 * illisible ou hors bornes (le CHECK de 0078 l'interdit, mais une lecture ne
 * fait jamais confiance à une contrainte pour valider ce qu'elle affiche).
 * `null` fait DISPARAÎTRE la ligne : mieux vaut une ligne en moins qu'un « 0 % »
 * qui affirmerait que le rival n'a rien couvert.
 */
export function overlapPercent(ratio: number | null): number | null {
  if (typeof ratio !== 'number' || !Number.isFinite(ratio)) return null;
  if (ratio < 0 || ratio > 1) return null;
  return Math.round(ratio * 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA VUE — sept états, jamais confondus
// ═══════════════════════════════════════════════════════════════════════════

/** Les trois issues de §19.3, plus `unknown` pour un statut que la base a ajouté. */
export type ContestOutcome = 'defended' | 'transferred' | 'cancelled' | 'unknown';

export interface ContestedZoneFacts {
  /** Temps restant, TOUJOURS strictement positif dans `under_attack`. */
  readonly remaining: { readonly hours: number; readonly minutes: number };
  /** Aire du polygone (m²), `null` si le serveur ne l'a pas rendue. */
  readonly areaM2: number | null;
  /** Recouvrement mesuré en %, `null` si illisible (cf. `overlapPercent`). */
  readonly overlapPercent: number | null;
  /** Contour GÉNÉRALISÉ, `null` si absent — la carte disparaît alors. */
  readonly rings: ZoneRing[] | null;
  /** Pseudo public du rival, `null` s'il n'a pas consenti à être nommé. */
  readonly rivalName: string | null;
}

export type ContestedZoneView =
  | { readonly status: 'loading' }
  | { readonly status: 'signed_out' }
  | { readonly status: 'failed' }
  | { readonly status: 'not_found' }
  | { readonly status: 'not_defender' }
  | { readonly status: 'closed'; readonly outcome: ContestOutcome }
  | { readonly status: 'window_closed' }
  | { readonly status: 'under_attack'; readonly facts: ContestedZoneFacts };

const OUTCOMES: ReadonlySet<string> = new Set(['defended', 'transferred', 'cancelled']);

/**
 * Lecture + horloge → l'état d'écran. PURE : `nowMs` est INJECTÉ, donc la
 * bascule `under_attack` → `window_closed` est reproductible à la milliseconde.
 *
 * L'ORDRE DES TESTS EST LA DÉCISION. Il se lit du plus « je ne sais rien » au
 * plus engageant, et on n'alarme qu'au tout dernier pas :
 *   1. je n'ai rien lu  → loading / signed_out / failed / not_found ;
 *   2. je ne suis pas le camp qui défend → not_defender (avant toute lecture de
 *      statut : le sort d'une contestation qui ne me vise pas ne me regarde pas
 *      en tant que défenseur) ;
 *   3. l'affaire est tranchée → closed ;
 *   4. l'échéance est passée → window_closed ;
 *   5. et alors seulement → under_attack.
 */
export function resolveContestedZone(
  read: ContestedZoneRead,
  nowMs: number,
): ContestedZoneView {
  if (read.kind !== 'loaded') return { status: read.kind };

  const { contest, territory, rivalName } = read;

  // 2. Le camp. Sans territoire lisible, ou avec un territoire qui n'est pas le
  //    mien en propre, cet écran n'a rien à titrer (cf. en-tête).
  if (!territory || !territory.mineAsUser) return { status: 'not_defender' };

  // 3. Tranchée : plus rien à défendre.
  if (contest.status !== 'active') {
    return {
      status: 'closed',
      outcome: OUTCOMES.has(contest.status) ? (contest.status as ContestOutcome) : 'unknown',
    };
  }

  // 4/5. L'échéance décide. Une date illisible se traite comme une fenêtre
  //      fermée : sans échéance, on ne peut promettre AUCUN délai — et un
  //      compte à rebours « NaN » serait pire que pas de compte à rebours.
  const expiresAtMs = contest.expires_at === null ? Number.NaN : Date.parse(contest.expires_at);
  const remaining = remainingWindow(expiresAtMs, nowMs);
  if (!remaining) return { status: 'window_closed' };

  return {
    status: 'under_attack',
    facts: {
      remaining,
      areaM2: territory.areaM2,
      overlapPercent: overlapPercent(contest.overlap_ratio),
      rings: territory.rings,
      rivalName,
    },
  };
}

/**
 * `state` de l'event `zone_detail_viewed` (§18) pour cet écran — ou `null`
 * quand il n'y a RIEN à mesurer.
 *
 * POURQUOI CE N'EST PAS UN SIMPLE `'contested'` CONSTANT : `events.ts` inscrit
 * que E70 est « couvert par `zone_detail_viewed { state: 'contested' }' ». Ce
 * `state` est une ÉNUMÉRATION FERMÉE (free|personal|crew|rival|contested) : on
 * ne peut donc pas y faire passer nos états d'absence, et on ne le déclenche
 * QUE lorsque l'écran a réellement rendu une zone contestée. Un `loading`, un
 * `not_found` ou une affaire close ne sont pas des « détails de zone vus » —
 * les compter comme tels gonflerait la métrique d'écrans qui ne montrent aucune
 * zone. Aucun identifiant, aucune surface, aucun temps restant n'accompagne
 * l'event : ils localiseraient le joueur (§18.2).
 */
export function contestedZoneAnalyticsState(view: ContestedZoneView): 'contested' | null {
  return view.status === 'under_attack' ? 'contested' : null;
}
