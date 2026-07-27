/**
 * GRYD — E22 « DÉFENSE ACTIVE » : LE DISCERNEMENT, PUR ET TESTÉ.
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1163-1182.)
 *
 * E22 est une VARIANTE de l'activité en cours (E20/E21), pas un écran de plus :
 * même carte, mêmes métriques, même pause — plus un contour de zone, une jauge
 * de couverture, une échéance et le libellé `DÉFENSE`. Ce module décide, à
 * partir de faits SERVEUR uniquement, si cette variante a lieu d'être et sur
 * QUELLE zone.
 *
 * ═══ LA MÉCANIQUE N'EST PAS RÉINVENTÉE ICI ══════════════════════════════════
 * La contestation existe déjà de bout en bout : `packages/engine/src/contest.ts`
 * (règles §9), `public.territory_contests` (migration 0078), le cron d'échéance
 * (0080), et la lecture client `features/notifications/contestEvents.ts` qui en
 * fait déjà les lignes « À DÉFENDRE » du flux d'activité. Ce module NE CRÉE
 * AUCUNE contestation, n'en résout aucune, et n'invente aucune zone : il
 * SÉLECTIONNE, parmi les contestations réelles que la RLS m'ouvre, celle qui
 * concerne la sortie en cours.
 *
 * ═══ SI RIEN NE VISE LE JOUEUR, LA VARIANTE N'EXISTE PAS ════════════════════
 * `pickLiveDefenseTarget` rend `null` dans TOUS les cas douteux — aucune
 * contestation, contestation close, contestation qui vise la zone d'un autre,
 * géométrie illisible, échéance illisible ou déjà passée, zone hors de portée.
 * L'écran retombe alors sur E20/E21 à l'identique. Il n'existe aucun chemin par
 * lequel une zone contestée puisse être FABRIQUÉE pour peupler la variante.
 *
 * ═══ LES QUATRE FILTRES, ET CE QUE CHACUN ÉVITE ═════════════════════════════
 * 1. LE CAMP. La policy `territory_contests_select_parties` (0078 §4) m'ouvre
 *    les deux camps : celles que je subis ET celles que j'ai lancées. Défendre
 *    son propre assaut n'a pas de sens — on ne garde que les contestations qui
 *    visent MES territoires (même tri que `contestEvents.ts`, refait ici en pur).
 * 2. LE STATUT. Seul `'active'` se défend ; `'defended'`/`'transferred'`/
 *    `'cancelled'` sont de l'histoire.
 * 3. L'ÉCHÉANCE. Illisible ⇒ écartée (une jauge sans échéance ne se retirerait
 *    jamais). Déjà passée ⇒ écartée : le cron n'a peut-être pas encore tourné,
 *    mais courir ne la sauvera plus — afficher « défends-la » serait promettre
 *    un effet qui n'aura pas lieu.
 * 4. LA PORTÉE. Une zone contestée à 40 km n'a rien à voir avec la sortie en
 *    cours ; transformer une course en « défense » à cause d'elle serait un
 *    contresens complet. Voir `LIVE_DEFENSE_REACH_M`.
 *
 * ═══ PURETÉ ════════════════════════════════════════════════════════════════
 * Aucune I/O, aucune horloge : `nowMs` est TOUJOURS un paramètre. La lecture
 * Supabase vit dans `useLiveDefense.ts`, qui n'ajoute aucune décision.
 */
import { type CoveragePoint, distanceToPolylineM } from './coverage';

// ═══════════════════════════════════════════════════════════════════════════
// 1. CE QU'ON DEMANDE AU SERVEUR — ET RIEN DE PLUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Colonnes de `territory_contests` lues pour E22. `attacker_id` /
 * `attacker_type` sont ABSENTS, exactement comme dans `contestEvents.ts` : la
 * RLS me les rendrait, mais le camp qui défend a le droit de savoir qu'il est
 * attaqué, pas d'en tirer une fiche de renseignement (§12). Conséquence
 * assumée : l'écran ne peut pas nommer l'assaillant — il ne le nomme donc pas.
 */
export const LIVE_DEFENSE_CONTEST_COLUMNS = 'id, territory_id, status, expires_at';

/**
 * Colonnes de `territories` lues pour E22. `geometry` est la géométrie EXACTE
 * (0074) : c'est légitime ici et seulement ici — c'est MA zone, le propriétaire
 * la voit sans délai de publication (policy `territories_select_published`), et
 * on ne peut pas dessiner le contour d'un polygone qu'on ne lit pas.
 */
export const LIVE_DEFENSE_TERRITORY_COLUMNS = 'id, owner_type, owner_id, geometry';

/** Une ligne `territory_contests` telle que le `select` ci-dessus la rend. */
export interface LiveContestRow {
  readonly id: string;
  readonly territory_id: string;
  /** 'active' | 'defended' | 'transferred' | 'cancelled' (0078). */
  readonly status: string | null;
  /** ISO 8601 — échéance de la fenêtre de défense (§9.1/§9.2). */
  readonly expires_at: string | null;
}

/** Une ligne `territories` telle que le `select` ci-dessus la rend. */
export interface LiveTerritoryRow {
  readonly id: string;
  readonly owner_type: 'user' | 'crew' | null;
  readonly owner_id: string | null;
  /** GeoJSON `Polygon` en jsonb (0074) — forme non garantie côté client. */
  readonly geometry: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. GÉOMÉTRIE — LIRE UN POLYGONE SANS JAMAIS EN INVENTER UN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Anneau EXTÉRIEUR d'un GeoJSON `Polygon`, en points {lat, lng}.
 *
 * `null` dès que quoi que ce soit cloche : type absent ou différent de
 * 'Polygon', coordonnées non tabulaires, anneau de moins de 3 sommets, couple
 * non numérique, latitude/longitude hors bornes. Un polygone à demi lisible
 * dessinerait un contour FAUX sur la carte — pire qu'aucun contour, parce qu'il
 * dirait au joueur de courir au mauvais endroit.
 *
 * Les trous (`coordinates[1..]`) sont ignorés : la spec demande « le contour de
 * la zone contestée », et la couverture de frontière du moteur (doc §17) se
 * mesure sur l'anneau extérieur.
 */
export function polygonOuterRing(geometry: unknown): CoveragePoint[] | null {
  if (typeof geometry !== 'object' || geometry === null) return null;
  const g = geometry as { type?: unknown; coordinates?: unknown };
  if (g.type !== 'Polygon') return null;
  if (!Array.isArray(g.coordinates) || g.coordinates.length === 0) return null;
  const ring = g.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 3) return null;
  const out: CoveragePoint[] = [];
  for (const pair of ring) {
    if (!Array.isArray(pair) || pair.length < 2) return null;
    const lng = pair[0];
    const lat = pair[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') return null;
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    out.push({ lat, lng });
  }
  return out;
}

/**
 * Le point est-il À L'INTÉRIEUR de l'anneau ? Lancer de rayon classique, en
 * coordonnées brutes — suffisant à l'échelle d'un quartier (le moteur fait le
 * même choix de projection locale partout ailleurs). PURE.
 */
export function pointInRing(p: CoveragePoint, ring: readonly CoveragePoint[]): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const straddles = a.lat > p.lat !== b.lat > p.lat;
    if (!straddles) continue;
    const x = ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng;
    if (p.lng < x) inside = !inside;
  }
  return inside;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. LA PORTÉE — POURQUOI CE NOMBRE N'EST PAS UNE RÈGLE DE JEU
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Distance (m) au-delà de laquelle une zone contestée ne concerne PLUS la
 * sortie en cours. Ce n'est PAS une règle de jeu et elle ne vit donc pas dans
 * `game-rules.ts` (même distinction que `CRASH_RECOVERY_MAX_AGE_MS` dans
 * `gps/crashRecovery.ts`, ou `RUN_LIVE_MAX_SILENCE_MS` dans `runGuard.ts`) :
 * elle ne décide d'AUCUN claim, d'aucun point, d'aucune durée de protection.
 * Le serveur mesurera la couverture réelle quoi qu'il arrive, et une défense
 * reste parfaitement valide même si cet écran n'a jamais affiché la variante.
 *
 * Elle répond à une seule question d'AFFICHAGE : « cette zone est-elle celle
 * autour de laquelle je cours ? ». 2 km, c'est l'ordre de grandeur d'un aller
 * de dix minutes à pied : au-delà, la zone appartient à une autre sortie, et
 * peindre `DÉFENSE` par-dessus une course qui n'a rien à voir serait un
 * contresens que personne ne pourrait corriger en courant.
 */
export const LIVE_DEFENSE_REACH_M = 2_000;

/** Sous cette échéance, l'écran dit « moins d'une heure » plutôt qu'un nombre d'heures. */
export const DEFENSE_DEADLINE_SOON_MS = 3_600_000;

// ═══════════════════════════════════════════════════════════════════════════
// 4. LA SÉLECTION
// ═══════════════════════════════════════════════════════════════════════════

/** La zone que la sortie en cours défend RÉELLEMENT — ou rien. */
export interface LiveDefenseTarget {
  /** `territory_contests.id` — sert de clé de rendu et d'anti-rebond, jamais d'affichage. */
  readonly contestId: string;
  readonly territoryId: string;
  /** Anneau extérieur du polygone, prêt à dessiner ET à mesurer. */
  readonly ring: readonly CoveragePoint[];
  /** Échéance serveur (epoch ms) — déjà calculée par `contestDeadline` (§9.2). */
  readonly expiresAtMs: number;
  /** Distance mesurée (m) de la position courante à l'anneau. 0 si à l'intérieur. */
  readonly distanceM: number;
}

export interface PickLiveDefenseInput {
  readonly contests: readonly LiveContestRow[];
  readonly territories: readonly LiveTerritoryRow[];
  /** Mon identifiant de joueur (session ouverte). */
  readonly meId: string | null;
  /** Mon crew RÉEL, ou `null` (sans crew, ou roster non chargé). */
  readonly myCrewId: string | null;
  /** Position courante mesurée — `null` tant qu'aucun fix n'est arrivé. */
  readonly here: CoveragePoint | null;
  readonly nowMs: number;
}

/**
 * La contestation qui concerne CETTE sortie, ou `null`.
 *
 * Quand plusieurs zones à moi sont contestées à portée, on prend LA PLUS
 * PROCHE : c'est la seule qui puisse être défendue par la boucle en cours, et
 * un écran qui n'a qu'un contour ne peut pas en montrer trois sans devenir
 * illisible en courant (§A « comprendre l'écran en moins de 3 secondes »).
 * À égalité de distance, l'échéance la plus proche l'emporte — c'est celle qui
 * se perd en premier.
 */
export function pickLiveDefenseTarget(input: PickLiveDefenseInput): LiveDefenseTarget | null {
  const { contests, territories, meId, myCrewId, here, nowMs } = input;
  if (here === null || !Number.isFinite(nowMs)) return null;

  // Filtre 1 — MES territoires seulement (propriété perso ou crew actif).
  const mine = new Map<string, LiveTerritoryRow>();
  for (const t of territories) {
    if (t.owner_type === 'user' && meId !== null && t.owner_id === meId) mine.set(t.id, t);
    else if (t.owner_type === 'crew' && myCrewId !== null && t.owner_id === myCrewId)
      mine.set(t.id, t);
  }
  if (mine.size === 0) return null;

  let best: LiveDefenseTarget | null = null;
  for (const c of contests) {
    // Filtre 2 — seule une contestation OUVERTE se défend.
    if (c.status !== 'active') continue;
    const territory = mine.get(c.territory_id);
    if (territory === undefined) continue;
    // Filtre 3 — une échéance lisible ET encore à venir.
    const expiresAtMs = c.expires_at === null ? NaN : Date.parse(c.expires_at);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) continue;
    // Géométrie lisible, sinon rien (jamais un contour approximatif).
    const ring = polygonOuterRing(territory.geometry);
    if (ring === null) continue;
    // Filtre 4 — la zone est-elle celle autour de laquelle je cours ?
    const distanceM = pointInRing(here, ring) ? 0 : distanceToPolylineM(here, ring);
    if (!Number.isFinite(distanceM) || distanceM > LIVE_DEFENSE_REACH_M) continue;

    const candidate: LiveDefenseTarget = {
      contestId: c.id,
      territoryId: territory.id,
      ring,
      expiresAtMs,
      distanceM,
    };
    if (best === null) best = candidate;
    else if (candidate.distanceM < best.distanceM) best = candidate;
    else if (candidate.distanceM === best.distanceM && candidate.expiresAtMs < best.expiresAtMs)
      best = candidate;
  }
  return best;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. L'ÉCHÉANCE, DITE SANS ALARME
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Comment l'écran doit dire le temps restant. QUATRE formes, jamais confondues
 * (`i18n/catalog/defenseLive.ts` porte les quatre phrases) :
 *  · `'in'`      — il reste N heures pleines (arrondi au SUPÉRIEUR : annoncer
 *                  « 0 h » quand il reste 40 minutes serait faux) ;
 *  · `'soon'`    — moins d'une heure. Dit calmement, sans chrono à la seconde :
 *                  la spec interdit « toute barre agressive ou alarmiste »
 *                  (l.1173), et un compte à rebours en courant est exactement ça ;
 *  · `'unknown'` — échéance illisible : on se tait plutôt que d'inventer ;
 *  · `'passed'`  — l'échéance est derrière nous. `pickLiveDefenseTarget` écarte
 *                  déjà ces cas, mais l'horloge de l'écran avance PENDANT la
 *                  sortie : cette forme est ce qui empêche l'affichage de
 *                  continuer à promettre une défense qui n'a plus d'effet.
 */
export type DefenseDeadlineKind = 'in' | 'soon' | 'unknown' | 'passed';

export interface DefenseDeadlineDisplay {
  readonly kind: DefenseDeadlineKind;
  /** Heures restantes (entier ≥ 1) — présent UNIQUEMENT quand `kind === 'in'`. */
  readonly hours: number | null;
}

export function defenseDeadlineDisplay(
  expiresAtMs: number | null,
  nowMs: number,
): DefenseDeadlineDisplay {
  if (
    expiresAtMs === null ||
    !Number.isFinite(expiresAtMs) ||
    !Number.isFinite(nowMs)
  ) {
    return { kind: 'unknown', hours: null };
  }
  const remaining = expiresAtMs - nowMs;
  if (remaining <= 0) return { kind: 'passed', hours: null };
  if (remaining < DEFENSE_DEADLINE_SOON_MS) return { kind: 'soon', hours: null };
  return { kind: 'in', hours: Math.ceil(remaining / DEFENSE_DEADLINE_SOON_MS) };
}
