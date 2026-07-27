/**
 * GRYD — E13 « Recherche de lieu » (`/map/search`, spec produit UI/UX l.926) :
 * LE MOTEUR. Fonctions PURES, zéro import React / react-native / expo — ramassé
 * par `npm run test:map`.
 *
 * ═══ D'OÙ VIENNENT LES LIEUX, ET CE QUI NE SORT PAS DE L'APPAREIL ═══════════
 * D'UN SEUL endroit : le référentiel EMBARQUÉ des villes d'Europe
 * (`packages/shared/src/cities-eu.ts` — 7 870 villes GeoNames `cities15000`,
 * CC BY 4.0), lu à travers l'index déjà construit par
 * `features/city/catalog.ts`. Cet écran n'invente donc aucun lieu, et il
 * n'ajoute AUCUN appel réseau.
 *
 * ⚠️ POURQUOI AUCUN GÉOCODEUR EXTERNE ICI, alors que le dépôt en utilise un.
 * `features/route/geocode.ts` interroge OpenStreetMap/Nominatim, et ce
 * sous-traitant EST déclaré dans la politique embarquée
 * (`i18n/catalog/legal.ts:596`). Mais il y est déclaré pour un flux précis —
 * « nommer une ville, un secteur, ou identifier le pays où tu te trouves », donc
 * une POSITION qui part et un NOM qui revient. Une recherche de lieu inverse ce
 * flux : ce sont LES TERMES TAPÉS qui partiraient — et la spec E13 dit
 * elle-même que ces termes peuvent être une adresse de domicile. Envoyer ça à
 * un tiers sans l'avoir écrit dans la politique serait exactement la faute
 * décrite en CLAUDE.md (« une doc ne promet jamais au-delà du code », dans
 * l'autre sens). Tant que la politique ne le dit pas, la recherche reste LOCALE
 * — et elle marche donc hors ligne, ce qui est aussi le bon comportement pour
 * un écran qu'on ouvre en courant.
 *
 * CONSÉQUENCE ASSUMÉE, ET DITE À L'ÉCRAN : le référentiel s'arrête à 15 000
 * habitants (692 communes françaises sur ~35 000) et ne porte qu'un nom par
 * ville — pas de quartier, pas de rue. Le placeholder du champ le reflète
 * (« Ville ou commune », pas « Ville, quartier, rue ») et `noResultBody`
 * explique le trou. Promettre une rue qu'on ne sait pas trouver serait le même
 * mensonge qu'une donnée fabriquée.
 *
 * ═══ ZÉRO DONNÉE EU FACTICE (constitution 8) ════════════════════════════════
 * Chercher « Berlin » rend un LIEU — un nom, un pays, un centre. Rien d'autre.
 * `PlaceResult` ne porte NI territoire, NI crew, NI classement, NI population,
 * NI nombre de joueurs : le référentiel connaît la population, elle sert au
 * classement de la recherche et ne sort jamais du moteur. La seule chose que
 * l'écran a le droit d'AFFIRMER sur un lieu est « GRYD y a-t-il ouvert une aire
 * de jeu ? » — et encore, seulement si le serveur a été LU (voir
 * `PlaceOpenness`, qui a un troisième cran `unknown` pour ça).
 */
import {
  CITY_SEARCH_MIN_QUERY_LENGTH,
  PLACE_SEARCH_NEARBY_LIMIT,
  type EuCity,
} from '@klaim/shared';
import {
  isCitySubdivisionOf,
  searchCityEntries,
  cityEntryLabel,
  type CityEntry,
  type CityIndex,
} from '../city/catalog';
import { distanceKm } from '../onboarding/cityMatch';
import type { LatLngPoint } from './realAnchors';

/**
 * Longueur minimale d'une requête. AUCUNE constante nouvelle : c'est la même
 * frappe, dans le même référentiel, que le sélecteur de ville — deux seuils
 * pour un seul moteur, ce serait un écran qui cherche là où l'autre se tait.
 */
export const PLACE_SEARCH_MIN_QUERY_LENGTH = CITY_SEARCH_MIN_QUERY_LENGTH;

/**
 * Ce que GRYD sait de l'aire de jeu d'un lieu. TROIS crans, jamais deux :
 *  · `open`      — le serveur a été lu ET ce lieu est dans `city_zones` ;
 *  · `not-open`  — le serveur a été lu ET ce lieu n'y est pas ;
 *  · `unknown`   — le serveur n'a PAS été lu (hors session, lecture en cours ou
 *                  échouée). Aucune puce n'est peinte : « pas encore un terrain
 *                  de jeu » posé sur Paris serait une affirmation non vérifiée.
 * Même discipline que le `known` de `CityPicker` — et pour la même raison.
 */
export type PlaceOpenness = 'open' | 'not-open' | 'unknown';

export function placeOpenness(entry: CityEntry, serverRead: boolean): PlaceOpenness {
  if (!serverRead) return 'unknown';
  return entry.status === 'open' ? 'open' : 'not-open';
}

/**
 * Une ligne de résultat. Elle porte STRICTEMENT ce qu'il faut pour déplacer la
 * carte et pour ne pas mentir : un identifiant, un libellé, un centre, l'état
 * de l'aire de jeu, et — seulement si la position du joueur est connue — la
 * distance à vol d'oiseau.
 */
export interface PlaceResult {
  readonly cityId: string;
  /** « Brest (FR) » — le code pays désambiguë les homonymes (cityEntryLabel). */
  readonly label: string;
  /** Centre publié. TOUJOURS fini : une ligne sans centre est écartée en amont. */
  readonly center: LatLngPoint;
  readonly openness: PlaceOpenness;
  /** Distance à vol d'oiseau, `null` quand la position du joueur est inconnue. */
  readonly distanceKm: number | null;
}

/** Un centre est-il exploitable pour déplacer une caméra ? */
function hasUsableCenter(entry: CityEntry): entry is CityEntry & {
  center: { lat: number; lng: number };
} {
  const c = entry.center;
  return !!c && Number.isFinite(c.lat) && Number.isFinite(c.lng);
}

/**
 * `CityEntry[]` → lignes affichables.
 *
 * ⚠️ LES LIEUX SANS CENTRE SONT ÉCARTÉS, et ce n'est pas cosmétique : le seul
 * geste de cet écran est « déplacer la carte ici ». Une ligne dont on ne connaît
 * pas les coordonnées ne peut pas la déplacer — la peindre serait un bouton
 * mort (constitution 2). Le cas existe pour de vrai : `buildCityIndex` rend une
 * ville servie par le serveur mais absente du référentiel avec `lat/lng = NaN`
 * plutôt que d'inventer 0,0 (le golfe de Guinée).
 */
export function toPlaceResults(
  entries: readonly CityEntry[],
  options: { readonly serverRead: boolean; readonly from?: LatLngPoint | null },
): readonly PlaceResult[] {
  const from = options.from ?? null;
  const out: PlaceResult[] = [];
  for (const entry of entries) {
    if (!hasUsableCenter(entry)) continue;
    const center: LatLngPoint = { lat: entry.center.lat, lng: entry.center.lng };
    out.push({
      cityId: entry.cityId,
      label: cityEntryLabel(entry),
      center,
      openness: placeOpenness(entry, options.serverRead),
      distanceKm: from ? distanceKm(from, center) : null,
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// RÉSULTATS PROCHES (avant toute frappe) — spec E13 « résultats proches »
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Profondeur de lecture avant le filtrage des subdivisions, en multiples de la
 * limite affichée. Même raison que `CITY_SEARCH_OVERSCAN` : quelqu'un debout
 * dans le 15ᵉ a pour cinq plus proches voisins cinq arrondissements de Paris —
 * les écarter sans marge rendrait une liste vide. Ce n'est PAS une règle de jeu
 * (aucun score, aucun rejeu serveur), donc pas une constante de `game-rules`.
 */
export const PLACE_NEARBY_OVERSCAN = 6;

/**
 * Les lieux les plus proches d'une position, du plus proche au plus lointain.
 *
 * PAS DE RAYON, DÉLIBÉRÉMENT (la justification vit avec la constante, dans
 * `game-rules.ts:PLACE_SEARCH_NEARBY_LIMIT`) : un rayon en mètres serait un
 * chiffre inventé, et il rendrait la liste VIDE à la campagne — là où la commune
 * la plus proche est justement la bonne réponse.
 *
 * LES ARRONDISSEMENTS SONT REMONTÉS À LEUR VILLE, comme dans
 * `nearestCityEntry` : proposer « Paris 15 Vaugirard » là où personne n'a rien
 * demandé est le même bruit que dans la liste de recherche, en pire.
 *
 * `from` inconnue ⇒ liste VIDE. On ne propose JAMAIS un repli « les plus grandes
 * villes » présenté comme voisin : l'écran dit alors `nearbyNoPosition`.
 */
export function nearbyPlaceEntries(
  index: CityIndex,
  from: LatLngPoint | null,
  limit: number = PLACE_SEARCH_NEARBY_LIMIT,
): readonly CityEntry[] {
  const max = Math.max(0, limit);
  if (!from || max === 0) return [];

  const openIds = new Set(index.open.map((c) => c.id));
  const pool: readonly EuCity[] = [...index.open, ...index.referenced].filter(
    (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng),
  );
  // Fenêtre des plus proches, ÉLARGIE : les subdivisions écartées juste après
  // doivent pouvoir être remplacées (sinon « je suis dans le 15ᵉ » rend une
  // liste vide). Départage par identifiant à distance égale → déterministe.
  const window = pool
    .map((city) => ({ city, km: distanceKm(from, { lat: city.lat, lng: city.lng }) }))
    .sort((a, b) => a.km - b.km || (a.city.id < b.city.id ? -1 : 1))
    .slice(0, max * PLACE_NEARBY_OVERSCAN)
    .map((r) => r.city);

  const kept: CityEntry[] = [];
  const seen = new Set<string>();
  for (const city of window) {
    if (kept.length >= max) break;
    // Une ville OUVERTE n'est jamais remontée ni masquée : elle est jouable,
    // quoi que son nom ressemble (même invariant que `searchCityEntries`).
    const target = openIds.has(city.id) ? city : liftToParent(window, city);
    if (seen.has(target.id)) continue;
    seen.add(target.id);
    kept.push({
      cityId: target.id,
      name: target.name,
      country: target.country.length > 0 ? target.country : null,
      status: openIds.has(target.id) ? 'open' : 'referenced',
      center: { lat: target.lat, lng: target.lng },
    });
  }
  return kept;
}

/** Remonte une subdivision à sa ville, au plus deux crans (borne anti-cycle). */
function liftToParent(pool: readonly EuCity[], city: EuCity): EuCity {
  let current = city;
  for (let step = 0; step < 2; step++) {
    const parent = pool.find((p) => isCitySubdivisionOf(current, p));
    if (!parent) return current;
    current = parent;
  }
  return current;
}

// ═══════════════════════════════════════════════════════════════════════════
// LES CINQ ÉTATS DE LA RECHERCHE (constitution : ils ne se confondent JAMAIS)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * État du MOTEUR de recherche, c'est-à-dire du référentiel embarqué.
 *  · `loading`     — le paquet de 7 870 villes n'a pas encore été décodé. Le
 *                    décodage est différé APRÈS la première peinture pour que le
 *                    champ soit utilisable tout de suite ; pendant cette
 *                    fenêtre, une frappe n'a pas encore de réponse, et c'est une
 *                    LECTURE EN COURS, pas un « aucun résultat » ;
 *  · `ready`       — décodé ;
 *  · `unavailable` — décodage impossible ou référentiel vide. La recherche a
 *                    ÉCHOUÉ ; on ne le déguise pas en « aucun lieu ne
 *                    correspond ». C'est toute la nuance de cet écran.
 */
export type PlaceEngineState = 'loading' | 'ready' | 'unavailable';

export type PlaceSearchPhase =
  /** Aucune saisie : l'écran montre proches + récentes. */
  | { readonly kind: 'idle' }
  /** Saisie trop courte : on DIT le seuil au lieu de rendre une liste nue. */
  | { readonly kind: 'too-short'; readonly min: number }
  /** Lecture EN COURS — n'affirme rien sur ce qu'on trouvera. */
  | { readonly kind: 'searching' }
  | { readonly kind: 'results'; readonly results: readonly PlaceResult[] }
  /** VIDE HONNÊTE : la recherche a abouti, rien ne correspond. */
  | { readonly kind: 'empty' }
  /** ÉCHEC DE RECHERCHE — distinct de « aucun résultat ». */
  | { readonly kind: 'failed' };

/**
 * L'ORDRE DES CRANS EST LA RÈGLE, pas un détail d'implémentation.
 *
 * 1. pas de saisie ⇒ `idle`, quel que soit l'état du moteur : rien n'a été
 *    demandé, donc il n'y a rien à dire sur une recherche qui n'existe pas ;
 * 2. saisie trop courte ⇒ `too-short` — avant d'interroger quoi que ce soit ;
 * 3. moteur `loading` ⇒ `searching` ;
 * 4. moteur `unavailable` ⇒ `failed` — JAMAIS `empty` ;
 * 5. zéro ligne ⇒ `empty` ;
 * 6. sinon ⇒ `results`.
 */
export function placeSearchPhase(input: {
  readonly query: string;
  readonly engine: PlaceEngineState;
  readonly results: readonly PlaceResult[];
  readonly minLength?: number;
}): PlaceSearchPhase {
  const min = input.minLength ?? PLACE_SEARCH_MIN_QUERY_LENGTH;
  const trimmed = input.query.trim();
  if (trimmed.length === 0) return { kind: 'idle' };
  if (trimmed.length < min) return { kind: 'too-short', min };
  if (input.engine === 'loading') return { kind: 'searching' };
  if (input.engine === 'unavailable') return { kind: 'failed' };
  if (input.results.length === 0) return { kind: 'empty' };
  return { kind: 'results', results: input.results };
}

/** Cherche dans l'index et rend des lignes prêtes. Délègue le classement. */
export function searchPlaces(
  index: CityIndex,
  query: string,
  options: { readonly serverRead: boolean; readonly from?: LatLngPoint | null; readonly limit?: number },
): readonly PlaceResult[] {
  const trimmed = query.trim();
  if (trimmed.length < PLACE_SEARCH_MIN_QUERY_LENGTH) return [];
  const entries = searchCityEntries(index, trimmed, options.limit);
  return toPlaceResults(entries, { serverRead: options.serverRead, from: options.from ?? null });
}

// ═══════════════════════════════════════════════════════════════════════════
// RECHERCHES RÉCENTES — et la règle de vie privée qui décide de les retenir
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Une entrée d'historique. Elle ne porte PAS le terme tapé, seulement le lieu
 * CHOISI : un journal de requêtes est une carte des intentions de son
 * propriétaire, et §12 n'en veut pas plus que l'analytics (cf. le docblock de
 * `EVENTS.placeSearchResultPicked`, qui s'interdit la même chose).
 */
export interface RecentPlace {
  readonly cityId: string;
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
}

/** Une zone floutée du joueur, réduite à ce dont la géométrie a besoin. */
export interface PlacePrivacyZone {
  readonly center: LatLngPoint;
  readonly radiusM: number;
}

/**
 * CE QUE LE MOTEUR SAIT des zones floutées. `known: false` couvre indistinctement
 * « lecture en cours » et « lecture échouée », et c'est VOULU : les deux
 * conduisent à la même décision (ne pas retenir), et seul l'écran a besoin de les
 * raconter séparément. Le type détaillé (`PrivacyZonesRead`) vit dans
 * `features/privacy/zones.ts` — on ne l'importe pas ici pour garder ce module
 * sans dépendance à `h3-js`.
 */
export type PlacePrivacyKnowledge =
  | { readonly known: false }
  | { readonly known: true; readonly zones: readonly PlacePrivacyZone[] };

/**
 * Faut-il retenir ce lieu dans l'historique ?
 *
 * Spec E13, mot pour mot : « Les adresses de domicile ne sont pas ajoutées à
 * l'historique si elles se trouvent dans une zone floutée. »
 *
 * ⚠️ TANT QU'ON NE SAIT PAS, ON NE RETIENT PAS. C'est la même asymétrie que
 * `zonesForPublication` (features/privacy/zones.ts) : écrire « en attendant »
 * reviendrait à parier que le joueur n'a déclaré aucune zone — et le jour où il
 * en a une, l'historique garde son quartier, ce qui ne se rattrape pas. Ne pas
 * retenir est réversible ; retenir ne l'est pas.
 *
 * Les trois issues sont DISTINCTES parce que l'écran doit pouvoir expliquer une
 * absence : sans explication, un lieu qui ne s'inscrit pas passe pour un bug.
 */
export type RecentAdmission = 'record' | 'skip-private' | 'skip-unknown';

export function admitToRecents(
  point: LatLngPoint,
  knowledge: PlacePrivacyKnowledge,
): RecentAdmission {
  if (!knowledge.known) return 'skip-unknown';
  for (const zone of knowledge.zones) {
    if (!Number.isFinite(zone.radiusM) || zone.radiusM <= 0) continue;
    if (distanceKm(point, zone.center) * 1000 <= zone.radiusM) return 'skip-private';
  }
  return 'record';
}

/**
 * Ajoute un lieu en tête de l'historique. Déduplique par identifiant (rejouer
 * une récente la remonte, elle ne s'y ajoute pas deux fois) et PLAFONNE à
 * `PLACE_SEARCH_RECENT_MAX` — le plafond est une règle de vie privée (un
 * historique qui s'allonge indéfiniment devient une carte des habitudes), pas
 * une limite d'affichage : il vient donc de `game-rules.ts`.
 */
export function pushRecentPlace(
  list: readonly RecentPlace[],
  entry: RecentPlace,
  max: number,
): readonly RecentPlace[] {
  const kept = list.filter((r) => r.cityId !== entry.cityId);
  return [entry, ...kept].slice(0, Math.max(0, max));
}

/**
 * Historique persisté → mémoire. DÉFENSIVE et jamais silencieusement
 * permissive : une entrée illisible est ÉCARTÉE plutôt que « réparée » en une
 * ligne à 0,0 — un lieu inventé dans l'historique enverrait la carte au golfe
 * de Guinée sur un simple tap. Stockage illisible ⇒ liste vide, jamais une
 * exception qui casserait l'écran.
 */
export function parseRecentPlaces(raw: string | null, max: number): readonly RecentPlace[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: RecentPlace[] = [];
  const seen = new Set<string>();
  for (const row of parsed) {
    if (out.length >= Math.max(0, max)) break;
    if (typeof row !== 'object' || row === null) continue;
    const r = row as Record<string, unknown>;
    if (typeof r.cityId !== 'string' || r.cityId.length === 0) continue;
    if (typeof r.label !== 'string' || r.label.trim().length === 0) continue;
    if (typeof r.lat !== 'number' || !Number.isFinite(r.lat)) continue;
    if (typeof r.lng !== 'number' || !Number.isFinite(r.lng)) continue;
    if (seen.has(r.cityId)) continue;
    seen.add(r.cityId);
    out.push({ cityId: r.cityId, label: r.label, lat: r.lat, lng: r.lng });
  }
  return out;
}

export function serializeRecentPlaces(list: readonly RecentPlace[]): string {
  return JSON.stringify(list);
}

/**
 * Distance affichée, arrondie. Sous 10 km on garde une décimale (« à 2,4 km »
 * dit quelque chose), au-delà on arrondit à l'entier (« à 412 km » — la
 * décimale y serait du bruit). Jamais « à 0 km » : un lieu sur lequel on se
 * trouve rend `0,1`, plancher lisible plutôt qu'un zéro nu.
 */
export function formatPlaceDistanceKm(km: number, locale: string): string {
  const value = km >= 10 ? Math.round(km) : Math.max(0.1, Math.round(km * 10) / 10);
  return value.toLocaleString(locale, {
    minimumFractionDigits: km >= 10 ? 0 : 1,
    maximumFractionDigits: km >= 10 ? 0 : 1,
  });
}
