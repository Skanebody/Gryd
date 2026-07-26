/**
 * GRYD — décisions d'AFFICHAGE de l'Historique (planche E24), isolées en
 * fonctions PURES et testables sans réseau ni rendu (`historyView.test.ts`).
 *
 * ─── CE QUE LA PLANCHE E24 DEMANDE, ET POURQUOI CE MODULE ───────────────────
 * E24 n'est pas un tableau de séances : c'est un JOURNAL DE CONQUÊTE. Chaque
 * ligne raconte d'abord son IMPACT territorial, colorée PAR RÔLE (Capture
 * chartreuse, Reprise orange, Défense bleu, libre neutre), et les lignes sont
 * groupées PAR SEMAINE (« Cette semaine », « Semaine dernière »…). Trois
 * décisions s'y trompent en silence si on les laisse dans le JSX :
 *   1. QUEL TYPE colorer — et surtout distinguer une CAPTURE (zones neuves) d'une
 *      REPRISE (zones ARRACHÉES à un adversaire) : la seconde est le fait le plus
 *      fort à raconter, et elle ne se lit que dans `hexes.stolen` du serveur ;
 *   2. QUEL IMPACT afficher — un impact INCONNU (`null`, pas de payload serveur)
 *      ne se rend jamais comme un impact NUL (`0`, le serveur a décidé « rien ») ;
 *   3. DANS QUELLE SEMAINE ranger chaque course — sans jamais mélanger deux
 *      semaines civiles sous un même titre.
 *
 * ─── MODULE PUR : ZÉRO IMPORT ───────────────────────────────────────────────
 * Il ne dépend PAS de `./real` (React + Supabase + AsyncStorage) ni des tokens de
 * couleur (design-tokens tire du natif RN) : les tests Deno doivent pouvoir le
 * type-checker SEUL. Les couleurs sont donc renvoyées comme un RÔLE
 * (`'me' | 'rival' | 'defense' | 'neutral'`), que le composant mappe sur un token
 * — « couleurs par RÔLE » de la constitution, littéralement. Les unions de
 * vocabulaire vivent ICI ; `real.ts` réexporte ce dont ses consommateurs ont
 * besoin : une seule source, dans le sens qui ne tire rien.
 */

/**
 * Sous-ensemble d'une course dont dépendent les décisions d'affichage. Défini
 * en local (et non importé de `./real`) pour garder le module sans dépendance :
 * `RealRunEntry` en est un sur-type structurel, donc il se passe tel quel.
 */
export interface RunImpactInput {
  /** Zones prises AU TOTAL (claimed + stolen + pioneer). `null` = impact inconnu. */
  captured: number | null;
  /** Zones ARRACHÉES à un adversaire (hexes.stolen). `null` = inconnu. */
  retaken: number | null;
  /** Zones défendues. `null` = inconnu. */
  defended: number | null;
}

/**
 * Les quatre TYPES colorés de la planche E24, DÉRIVÉS de l'impact serveur — pas
 * d'une intention déclarée au départ (le joueur annonce « défense » et finit par
 * conquérir : c'est le terrain qui tranche). `unknown` n'est PAS un cinquième
 * type visible : c'est l'absence de payload, rendue en neutre SANS rien affirmer
 * (on ne colle pas l'étiquette « libre » — donc « a tout raté » — à une course
 * dont on ignore l'impact).
 */
export type RunStoryType = 'reprise' | 'capture' | 'defense' | 'free' | 'unknown';

/** Rôle de couleur d'un type — le composant le mappe sur un token (jamais l'inverse). */
export type RunColorRole = 'me' | 'rival' | 'defense' | 'neutral';

/**
 * L'histoire d'une course : son type + la SEULE grandeur d'impact qui a du sens
 * pour ce type. Volontairement un seul chiffre par ligne (l'impact DOMINANT),
 * pas un tableau de compteurs : la planche mène par l'impact, pas par un bilan.
 *  · `reprise` → `zones` arrachées ;
 *  · `capture` → `zones` prises ;
 *  · `defense` → `zones` conservées ;
 *  · `free`    → aucune zone (course sans capture, FAIT serveur) ;
 *  · `unknown` → pas de payload, on n'affiche AUCUN chiffre.
 */
export type RunStory =
  | { type: 'reprise'; zones: number }
  | { type: 'capture'; zones: number }
  | { type: 'defense'; zones: number }
  | { type: 'free' }
  | { type: 'unknown' };

/**
 * Type + impact d'une course, en une seule passe.
 *
 * ORDRE DE PRÉCÉDENCE, et sa raison : une course peut à la fois arracher et
 * défendre. On raconte alors la REPRISE — c'est l'acte le plus offensif, celui
 * qui déplace la frontière. `retaken` prime donc sur tout ; puis la capture
 * neuve ; puis la défense ; puis « libre » (le serveur a dit 0) ; enfin
 * « unknown » quand il n'a rien dit du tout.
 *
 * ⚠ `captured` INCLUT `stolen` : on teste donc `retaken` EN PREMIER, sinon une
 * reprise pure (tout en `stolen`) serait étiquetée « Capture ».
 */
export function runStory(e: RunImpactInput): RunStory {
  if (e.retaken !== null && e.retaken > 0) return { type: 'reprise', zones: e.retaken };
  if (e.captured !== null && e.captured > 0) return { type: 'capture', zones: e.captured };
  if (e.defended !== null && e.defended > 0) return { type: 'defense', zones: e.defended };
  // Ici, aucune prise ni défense POSITIVE. Reste à distinguer « le serveur a dit
  // 0 » (course libre, un fait) de « le serveur n'a rien dit » (payload absent).
  if (e.captured === 0) return { type: 'free' };
  return { type: 'unknown' };
}

/** Le rôle de couleur d'un type — mappé sur un token par le composant. */
export function runColorRole(type: RunStoryType): RunColorRole {
  switch (type) {
    case 'capture':
      return 'me'; // chartreuse — mon gain
    case 'reprise':
      return 'rival'; // orange — arraché à un rival
    case 'defense':
      return 'defense'; // bleu — zone tenue
    default:
      return 'neutral'; // free / unknown — gris
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// GROUPEMENT PAR SEMAINE (planche E24 : « Cette semaine » / « Semaine dernière »)
// ═════════════════════════════════════════════════════════════════════════════

/** Où tombe une semaine par rapport à maintenant. */
export type WeekBucket = 'this' | 'last' | 'older';

export interface RunWeekGroup<T> {
  /** ms du LUNDI 00:00 (heure locale) qui ouvre la semaine — clé stable + tri. */
  weekStartMs: number;
  bucket: WeekBucket;
  /** Courses de la semaine, plus récentes d'abord. */
  entries: T[];
}

/**
 * Début de la semaine CIVILE (lundi 00:00, heure locale) contenant `ms`.
 *
 * Semaine à départ LUNDI (Europe) : `getDay()` rend 0=dimanche…6=samedi, on le
 * décale pour que lundi vaille 0. Heure LOCALE assumée : « cette semaine » se lit
 * dans le fuseau du joueur, pas en UTC. Exporté pour que le test verrouille
 * l'invariant sans redériver la formule.
 */
export function startOfWeekMs(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const mondayIndex = (d.getDay() + 6) % 7; // lundi → 0, dimanche → 6
  d.setDate(d.getDate() - mondayIndex);
  return d.getTime();
}

/**
 * Range les courses par semaine civile, groupes les plus récents d'abord, et
 * chaque groupe trié du plus récent au plus ancien. `nowMs` est injecté (jamais
 * `Date.now()` en dur) pour que « cette semaine » soit testable et déterministe.
 *
 * Générique sur `{ startedAtMs }` : le même groupement servira le jour où une
 * autre surface (partage, profil) voudra ce découpage.
 */
export function groupRunsByWeek<T extends { startedAtMs: number }>(
  entries: readonly T[],
  nowMs: number,
): RunWeekGroup<T>[] {
  const thisWeek = startOfWeekMs(nowMs);
  const lastWeek = startOfWeekMs(thisWeek - 1); // 1 ms avant lundi = semaine d'avant
  const byWeek = new Map<number, T[]>();
  for (const e of entries) {
    if (!Number.isFinite(e.startedAtMs)) continue; // une date illisible ne crée pas de semaine fantôme
    const key = startOfWeekMs(e.startedAtMs);
    const bucket = byWeek.get(key);
    if (bucket) bucket.push(e);
    else byWeek.set(key, [e]);
  }
  return [...byWeek.entries()]
    .sort((a, b) => b[0] - a[0]) // semaines récentes d'abord
    .map(([weekStartMs, list]) => ({
      weekStartMs,
      bucket: (weekStartMs === thisWeek
        ? 'this'
        : weekStartMs === lastWeek
          ? 'last'
          : 'older') as WeekBucket,
      entries: [...list].sort((a, b) => b.startedAtMs - a.startedAtMs),
    }));
}

// ═════════════════════════════════════════════════════════════════════════════
// BANDEAU DE SYNTHÈSE (planche E24 : « 38 courses · 247 km · 14 captures · 9 défenses »)
// ═════════════════════════════════════════════════════════════════════════════

export interface HistorySummary {
  /** Nombre de courses lues (jamais un total inventé au-delà de la fenêtre lue). */
  runs: number;
  /** Distance cumulée en km (somme des mesures réelles). */
  km: number;
  /** Courses ayant pris AU MOINS une zone (capture ou reprise). */
  captures: number;
  /** Courses ayant défendu au moins une zone. */
  defenses: number;
}

/**
 * Le bandeau de tête. Ne compte QUE des faits serveur :
 *  · `captures` = courses dont `captured > 0` (une reprise EST une capture) ;
 *  · `defenses` = courses dont `defended > 0`.
 * Un impact `null` (payload absent) ne compte NI comme capture NI comme
 * défense : on ne sait pas, on ne l'invente pas. Une distance non finie est
 * ignorée plutôt que de propager un `NaN km` dans le total.
 */
export function summarizeHistory(
  entries: readonly (RunImpactInput & { km: number })[],
): HistorySummary {
  let km = 0;
  let captures = 0;
  let defenses = 0;
  for (const e of entries) {
    if (Number.isFinite(e.km) && e.km > 0) km += e.km;
    if (e.captured !== null && e.captured > 0) captures += 1;
    if (e.defended !== null && e.defended > 0) defenses += 1;
  }
  return { runs: entries.length, km, captures, defenses };
}
