/**
 * GRYD — L'INDEX DE VILLES DU CLIENT, en fonctions PURES.
 *
 * « Dans la création de crew on doit pouvoir choisir n'importe quelle ville, et
 *   il faut le fichier qui répertorie toutes les villes en Europe pour pouvoir
 *   choisir la ville que l'on souhaite et ne pas en inventer une. »
 *
 * ─── DEUX SOURCES, DEUX STATUTS, JAMAIS CONFONDUS ──────────────────────────
 * Ce module fusionne DEUX listes qui ne disent pas la même chose :
 *
 *  1. `city_zones` (SERVEUR) — les villes que GRYD a réellement OUVERTES : elles
 *     ont un contour, une saison, et `create_crew` les accepte (0050 :
 *     `if not exists (select 1 from city_zones …) → 'bad_city'`). Statut `open`.
 *  2. le RÉFÉRENTIEL GeoNames embarqué (7 870 villes d'Europe, CC BY 4.0) — des
 *     villes RÉELLES, mais dont GRYD n'a encore ouvert AUCUNE aire de jeu.
 *     Statut `referenced`.
 *
 * ⚠️ LA DISTINCTION EST LE CŒUR DE CE FICHIER, pas un détail d'affichage. Une
 * ville `referenced` est un lieu qui existe ; elle n'est PAS un terrain de jeu
 * provisionné, et rien ici ne doit laisser croire l'inverse. C'est pour ça que
 * `CityEntry` ne porte NI population, NI classement, NI densité, NI nombre de
 * joueurs : le référentiel contient bien la population INSEE/GeoNames, elle sert
 * au CLASSEMENT de la recherche (les grandes villes d'abord) et elle s'arrête
 * là — un écran qui affiche « 2 148 000 » à côté d'une ville vide fabrique une
 * activité que personne n'a produite (CLAUDE.md, AMENDEMENT-47).
 *
 * ─── POURQUOI CE MODULE EST PUR ────────────────────────────────────────────
 * Zéro import React / react-native / expo : ramassé par `npm run test:map`
 * (Deno). Le tri « ville ouverte d'abord », la déduplication Paris/Paris et le
 * fait qu'aucun statut ne soit deviné se PROUVENT par des tests, pas par une
 * capture d'écran.
 */
import {
  CITY_SEARCH_MIN_QUERY_LENGTH,
  CITY_SEARCH_RESULT_LIMIT,
  cityLabel,
  normalizeCityQuery,
  searchCities,
  starterCityCenter,
  type EuCity,
} from '@klaim/shared';
// Le haversine et le « plus proche dans un rayon » NE SONT PAS réécrits ici :
// deux implémentations, ce sont deux rayons qui finissent par diverger, et un
// raccourci « utiliser ma position » qui ne dit pas la même chose selon l'écran.
import { cityAt, distanceKm } from '../onboarding/cityMatch';
import type { LatLngPoint } from '../map/realAnchors';

/**
 * Ce que le serveur dit d'une ville ouverte. Volontairement RÉDUIT aux deux
 * colonnes réellement lisibles dans `city_zones` par un client (`city_id`,
 * `name`) : cette table n'a AUCUNE colonne de centre, et on n'en invente pas.
 */
export interface OpenCityRow {
  readonly cityId: string;
  readonly name: string;
}

/**
 * Statut d'une ville proposée au choix.
 *  · `open`       — provisionnée côté serveur : un crew peut y être créé.
 *  · `referenced` — ville réelle du référentiel, aire de jeu PAS encore ouverte.
 */
export type CityStatus = 'open' | 'referenced';

/** Une ville choisissable. Aucune donnée de jeu — voir l'avertissement en tête. */
export interface CityEntry {
  /** `paris`/`lille` (villes de démarrage) ou le `geonameid` en chaîne. */
  readonly cityId: string;
  readonly name: string;
  /** Code pays ISO 2 — `null` quand le serveur sert une ville hors référentiel. */
  readonly country: string | null;
  readonly status: CityStatus;
  /**
   * Centre publié, `undefined` quand il est inconnu. Il sert à CADRER une carte
   * et à reconnaître « je suis ici » — jamais à décider d'une capture (le seul
   * test in/out qui fait autorité est serveur, sur `city_zones.geojson`).
   */
  readonly center?: { readonly lat: number; readonly lng: number };
}

/**
 * Index prêt pour la recherche. Les deux listes sont SÉPARÉES et le restent :
 * c'est ce qui garantit qu'une ville non ouverte ne peut pas se retrouver
 * étiquetée « ouverte » par accident de tri.
 */
export interface CityIndex {
  /** Villes ouvertes, telles que le serveur les a nommées. */
  readonly open: readonly EuCity[];
  /** Villes du référentiel qui ne sont PAS ouvertes (pas de doublon avec `open`). */
  readonly referenced: readonly EuCity[];
}

/**
 * Tolérance d'appariement entre une ville de démarrage (`paris`, `lille`) et son
 * homologue du référentiel, en kilomètres.
 *
 * Ce n'est PAS une règle de jeu (aucune valeur de score, aucun rejeu serveur) :
 * c'est la tolérance d'une DÉDUPLICATION d'affichage, et c'est pour ça qu'elle
 * vit ici et non dans `game-rules.ts` — même arbitrage que
 * `CITY_MATCH_RADIUS_KM` (features/onboarding/cityMatch.ts). Deux villes
 * homonymes distantes de moins de 30 km sont la même ville ; au-delà, on préfère
 * en montrer deux plutôt que d'en fusionner deux qui n'en sont pas une.
 */
export const CITY_DEDUP_RADIUS_KM = 30;

/**
 * Comparaison de noms humains. Elle DÉLÈGUE à `normalizeCityQuery` (moteur
 * partagé) plutôt que de re-normaliser ici : deux normalisations qui divergent,
 * c'est une ville que la recherche trouve et que la déduplication rate — donc
 * « Paris » affiché deux fois.
 */
function sameName(a: string, b: string): boolean {
  return normalizeCityQuery(a) === normalizeCityQuery(b);
}

/**
 * Construit l'index à partir de ce que le serveur a répondu et du référentiel.
 *
 * INVARIANTS (testés) :
 *  · une ville ouverte n'apparaît JAMAIS deux fois — ni par identifiant (le
 *    `city_id` EST le `geonameid` pour toute ville ouverte après Saison 0), ni
 *    par nom+proximité (les villes de démarrage `paris`/`lille` portent un
 *    identifiant historique et ont pourtant leur jumelle dans le référentiel) ;
 *  · le nom AFFICHÉ d'une ville ouverte est celui du SERVEUR, pas celui du
 *    référentiel : `city_zones` porte « Lille (MEL) » là où GeoNames dit
 *    « Lille », et c'est le serveur qui décrit son aire de jeu ;
 *  · `openRows` VIDE ⇒ index sans aucune ville `open`. On ne « complète » pas
 *    avec les villes de démarrage : ne pas avoir lu le serveur n'autorise pas à
 *    affirmer qu'une ville est ouverte.
 */
export function buildCityIndex(
  openRows: readonly OpenCityRow[],
  referential: readonly EuCity[],
): CityIndex {
  const openById = new Map<string, OpenCityRow>();
  for (const row of openRows) {
    if (row.cityId.trim().length === 0 || row.name.trim().length === 0) continue;
    openById.set(row.cityId, row);
  }

  const byId = new Map<string, EuCity>();
  for (const city of referential) byId.set(city.id, city);

  /** Identifiants de référentiel « consommés » par une ville ouverte. */
  const consumed = new Set<string>();
  const open: EuCity[] = [];

  for (const [cityId, row] of openById) {
    // 1) Appariement par identifiant : le cas normal dès qu'une ville est
    //    ouverte par le référentiel (city_id = geonameid).
    const direct = byId.get(cityId);
    if (direct) {
      consumed.add(direct.id);
      open.push({ ...direct, id: cityId, name: row.name });
      continue;
    }

    // 2) Villes de DÉMARRAGE (`paris`, `lille`) : identifiant historique, centre
    //    publié par game-rules. On les rapproche du référentiel par nom ET
    //    proximité — le nom seul apparierait Paris (FR) et Paris (TX).
    const center = starterCityCenter(cityId);
    const twin = center
      ? referential.find(
          (c) =>
            !consumed.has(c.id) &&
            sameName(c.name, row.name.split('(')[0] ?? row.name) &&
            distanceKm(center, { lat: c.lat, lng: c.lng }) <= CITY_DEDUP_RADIUS_KM,
        )
      : undefined;
    if (twin) {
      consumed.add(twin.id);
      open.push({ ...twin, id: cityId, name: row.name });
      continue;
    }

    // 3) Ville servie par le serveur que le référentiel ne connaît pas. Elle
    //    reste choisissable — c'est le serveur qui fait autorité sur ce qui est
    //    ouvert. Ce qu'on ne sait pas reste vide : pas de pays inventé, pas de
    //    coordonnées à 0,0 (le golfe de Guinée), pas de population supposée.
    open.push({
      id: cityId,
      name: row.name,
      country: '',
      lat: center?.lat ?? Number.NaN,
      lng: center?.lng ?? Number.NaN,
      population: 0,
    });
  }

  const referenced = referential.filter((c) => !consumed.has(c.id) && !openById.has(c.id));
  return { open, referenced };
}

/** `EuCity` + statut → `CityEntry`. Un pays vide ou des coordonnées inconnues restent vides. */
function toEntry(city: EuCity, status: CityStatus): CityEntry {
  const hasCenter = Number.isFinite(city.lat) && Number.isFinite(city.lng);
  return {
    cityId: city.id,
    name: city.name,
    country: city.country.length > 0 ? city.country : null,
    status,
    ...(hasCenter ? { center: { lat: city.lat, lng: city.lng } } : {}),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ARRONDISSEMENTS : le bruit qui rendait le cas principal illisible
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Rayon au-delà duquel deux villes homonymes ne sont plus « l'une dans
 * l'autre », en kilomètres. Comme `CITY_DEDUP_RADIUS_KM`, ce n'est PAS une règle
 * de jeu (aucun score, aucun rejeu serveur) : c'est le garde-fou géographique
 * d'un filtre d'AFFICHAGE, et il vit donc ici et non dans `game-rules.ts`.
 * 30 km couvre largement l'étalement d'une grande ville européenne (Zürich fait
 * 9 km de large, le Grand Paris 25 km) sans avaler une commune voisine
 * indépendante.
 */
export const CITY_SUBDIVISION_RADIUS_KM = 30;

/**
 * MARQUEURS de subdivision, MESURÉS sur le référentiel livré — pas devinés.
 *
 * Le référentiel GeoNames `cities15000` liste les arrondissements comme des
 * localités à part entière : chercher « paris » rendait Paris puis 24 lignes
 * « Paris 15 Vaugirard », « Paris 13e Arrondissement »… — 90 % de bruit sur le
 * cas le plus fréquent, un écran incompréhensible en moins de 3 s (§A).
 *
 * L'inventaire complet des noms de la forme « <ville plus peuplée à moins de
 * 30 km> <reste> » donne 127 cas, dont trois familles massives et sans
 * ambiguïté, retenues ici :
 *  · reste commençant par un CHIFFRE — 49 cas, tous des arrondissements
 *    français (« Paris 15 Vaugirard », « Lyon 03 », « Marseille 13 ») ;
 *  · « kreis … » — 20 cas, les Kreise de Zürich (« Zürich (Kreis 4) /
 *    Aussersihl ») ;
 *  · chiffre romain + « kerulet » — 22 cas, les kerület de Budapest.
 *
 * ⚠️ TOUT LE RESTE EST GARDÉ, DÉLIBÉRÉMENT. Les 36 autres cas contiennent des
 * COMMUNES RÉELLES et indépendantes qu'une heuristique plus large avalerait :
 * Clichy-sous-Bois (⊂ « Clichy »), Saint-Ouen-l'Aumône (⊂ « Saint-Ouen »),
 * Annecy-le-Vieux, Sant Andreu de la Barca, Mansfield Woodhouse. Faire
 * disparaître la ville de quelqu'un est un défaut plus grave que trois lignes de
 * bruit : dans le doute, on montre.
 */
const CITY_SUBDIVISION_MARKER = /^(?:\d|kreis\b|[ivxlcdm]+ kerulet\b)/;

/**
 * `child` est-il une subdivision de `parent` ? Trois conditions CUMULÉES, et
 * aucune n'est cosmétique :
 *  1. le nom de `child` commence par le nom entier de `parent` suivi d'un espace
 *     (frontière de mot : « Brest » n'est pas préfixe de « Brestovac ») ;
 *  2. ce qui suit porte un marqueur de subdivision mesuré ci-dessus ;
 *  3. `parent` est plus peuplé ET à moins de `CITY_SUBDIVISION_RADIUS_KM` —
 *     un arrondissement n'est jamais plus grand que sa ville, ni à 400 km.
 *
 * Coordonnées inconnues (ville servie par le serveur, hors référentiel) ⇒
 * `false` : on ne masque jamais une ville sur la foi d'une distance qu'on n'a
 * pas pu calculer.
 */
export function isCitySubdivisionOf(child: EuCity, parent: EuCity): boolean {
  if (child.id === parent.id) return false;
  if (!(parent.population > child.population)) return false;
  if (
    !Number.isFinite(child.lat) ||
    !Number.isFinite(child.lng) ||
    !Number.isFinite(parent.lat) ||
    !Number.isFinite(parent.lng)
  ) {
    return false;
  }
  const childName = normalizeCityQuery(child.name);
  const parentName = normalizeCityQuery(parent.name);
  if (parentName.length === 0 || !childName.startsWith(parentName + ' ')) return false;
  if (!CITY_SUBDIVISION_MARKER.test(childName.slice(parentName.length + 1))) return false;
  return (
    distanceKm({ lat: parent.lat, lng: parent.lng }, { lat: child.lat, lng: child.lng }) <=
    CITY_SUBDIVISION_RADIUS_KM
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EXONYMES : « londres » doit rendre London
// ═══════════════════════════════════════════════════════════════════════════

/**
 * TABLE D'EXONYMES SAISIE À LA MAIN — sa provenance est déclarée, pas suggérée.
 *
 * Le référentiel embarqué ne porte QUE le nom principal GeoNames (« London »,
 * « Wien » devient « Vienna », « Praha » devient « Prague »). Le fichier
 * `alternateNames` de GeoNames, qui contient les 5 langues de l'app, pèse
 * 193 Mo : il n'est PAS embarqué, et ce n'est pas un oubli.
 *
 * Conséquence mesurée : un francophone tapant « londres », « bruxelles »,
 * « cracovie » ou « lisbonne » n'obtenait RIEN et pouvait conclure que sa ville
 * n'existe pas. Un germanophone tapant « München » ou « Wien » non plus.
 *
 * CE QUE CETTE TABLE EST : une aide à la SAISIE. Elle traduit une requête en une
 * autre requête, elle ne renomme jamais rien — le nom affiché reste celui du
 * référentiel, et l'identifiant reste le `geonameid`. Une entrée fausse ne peut
 * donc pas désigner la mauvaise ville : au pire elle ne rend rien, et le test
 * `chaque exonyme mène à une ville réelle` échoue.
 *
 * CE QU'ELLE N'EST PAS : une donnée de jeu. Aucun classement, aucune densité.
 *
 * PÉRIMÈTRE ASSUMÉ : les capitales d'Europe et les grandes villes dont le nom
 * change franchement d'une langue à l'autre. Une ville absente d'ici reste
 * trouvable sous son nom du référentiel — et l'écran dit désormais lequel.
 */
export const CITY_EXONYMS: Readonly<Record<string, string>> = {
  // Capitales
  londres: 'london',
  londra: 'london',
  bruxelles: 'brussels',
  bruselas: 'brussels',
  bruxelas: 'brussels',
  lisboa: 'lisbon',
  lisbonne: 'lisbon',
  lissabon: 'lisbon',
  copenhague: 'copenhagen',
  copenhaga: 'copenhagen',
  kopenhagen: 'copenhagen',
  kobenhavn: 'copenhagen',
  wien: 'vienna',
  vienne: 'vienna',
  viena: 'vienna',
  praha: 'prague',
  praga: 'prague',
  warszawa: 'warsaw',
  varsovie: 'warsaw',
  varsovia: 'warsaw',
  warschau: 'warsaw',
  moscou: 'moscow',
  moscu: 'moscow',
  moskau: 'moscow',
  moskva: 'moscow',
  athenes: 'athens',
  atenas: 'athens',
  bucarest: 'bucharest',
  bucareste: 'bucharest',
  bukarest: 'bucharest',
  bucuresti: 'bucharest',
  belgrado: 'belgrade',
  beograd: 'belgrade',
  kiev: 'kyiv',
  kiew: 'kyiv',
  roma: 'rome',
  berne: 'bern',
  berna: 'bern',
  nicosie: 'nicosia',
  'la valette': 'valletta',
  'la valeta': 'valletta',
  'andorre la vieille': 'andorra la vella',
  'cite du vatican': 'vatican',
  // Grandes villes au nom franchement différent d'une langue à l'autre
  cracovie: 'krakow',
  cracovia: 'krakow',
  krakau: 'krakow',
  munchen: 'munich',
  mailand: 'milan',
  milano: 'milan',
  milao: 'milan',
  napoli: 'naples',
  neapel: 'naples',
  napoles: 'naples',
  firenze: 'florence',
  florenz: 'florence',
  florencia: 'florence',
  florenca: 'florence',
  venise: 'venice',
  venezia: 'venice',
  venecia: 'venice',
  veneza: 'venice',
  venedig: 'venice',
  torino: 'turin',
  turim: 'turin',
  genova: 'genoa',
  genes: 'genoa',
  genua: 'genoa',
  // ⚠️ SENS DE LA FLÈCHE : le référentiel dit « Köln », pas « Cologne ». La
  // table pointe TOUJOURS vers le nom du référentiel — l'inverse ne menait à
  // aucune ville, et c'est le test `chaque exonyme mène à une ville RÉELLE` qui
  // l'a attrapé, pas une relecture.
  cologne: 'koln',
  colonia: 'koln',
  seville: 'sevilla',
  'la haye': 'the hague',
  'den haag': 'the hague',
  'la haya': 'the hague',
  haia: 'the hague',
  anvers: 'antwerp',
  antwerpen: 'antwerp',
  amberes: 'antwerp',
  goteborg: 'gothenburg',
  gotemburgo: 'gothenburg',
  nurnberg: 'nuremberg',
  'aix la chapelle': 'aachen',
  bale: 'basel',
  basilea: 'basel',
  geneve: 'geneva',
  ginebra: 'geneva',
  genebra: 'geneva',
  genf: 'geneva',
};

/**
 * Nombre maximal de requêtes d'exonymes ajoutées à une recherche. Trois suffit
 * (« co… » touche copenhague, copenhaga, colonia) et borne le bruit : ce sont
 * des résultats AJOUTÉS en fin de liste, jamais des résultats substitués.
 */
export const CITY_ALIAS_LIMIT = 3;

/**
 * Longueur à partir de laquelle un exonyme est reconnu à son DÉBUT.
 *
 * Mesuré : à 2 lettres, « co » remontait Köln (via « cologne ») avant Coventry,
 * et « la » remontait La Haye et La Valette avant Latina. Un exonyme partiel de
 * deux lettres ne dit rien de ce que le joueur cherche ; à quatre, « lond »,
 * « münc » ou « copen » ne laissent plus de doute. La correspondance EXACTE,
 * elle, n'a pas de seuil supplémentaire — et le plus court exonyme de la table
 * en fait justement quatre (« wien », « kiev », « roma »).
 */
export const CITY_ALIAS_PREFIX_MIN_LENGTH = 4;

/**
 * Requêtes supplémentaires induites par la table d'exonymes.
 *
 * Correspondance EXACTE d'abord (« londres » → « london »), puis par PRÉFIXE
 * (« londr… » → « london ») pour que la liste se remplisse pendant la frappe et
 * non au dernier caractère. Le résultat est trié et borné : deux appels
 * identiques rendent les mêmes requêtes, dans le même ordre.
 */
export function cityQueryAliases(query: string): readonly string[] {
  const q = normalizeCityQuery(query);
  if (q.length < CITY_SEARCH_MIN_QUERY_LENGTH) return [];
  const exact = CITY_EXONYMS[q];
  const out: string[] = exact ? [exact] : [];
  if (q.length < CITY_ALIAS_PREFIX_MIN_LENGTH) return out;
  for (const exonym of Object.keys(CITY_EXONYMS).sort()) {
    if (out.length >= CITY_ALIAS_LIMIT) break;
    if (!exonym.startsWith(q)) continue;
    const target = CITY_EXONYMS[exonym];
    if (target && !out.includes(target)) out.push(target);
  }
  return out;
}

/**
 * Profondeur de lecture du moteur avant filtrage, en multiples de la limite
 * affichée. Sans elle, demander 25 résultats sur « paris » en rendrait 1 : les
 * 24 arrondissements écartés ne seraient remplacés par rien. Le moteur parcourt
 * de toute façon les 7 870 villes à chaque appel — élargir la fenêtre ne coûte
 * qu'un tri un peu plus long, et c'est ce qui garantit une liste PLEINE.
 */
export const CITY_SEARCH_OVERSCAN = 4;

/**
 * Cherche dans l'index. Les VILLES OUVERTES passent devant, toujours : à
 * question égale, la réponse utile est celle où l'on peut réellement jouer.
 * Le classement à l'intérieur de chaque groupe est celui du moteur partagé
 * (égalité exacte → début de nom → début de mot → n'importe où, puis population
 * décroissante, puis identifiant — déterministe).
 *
 * DEUX CORRECTIONS par rapport au moteur brut, toutes deux au service du même
 * objectif (§A : comprendre l'écran en moins de 3 s) :
 *  · les SUBDIVISIONS d'une ville déjà présente dans la même réponse sont
 *    écartées — « paris » rend Paris, pas Paris + 24 arrondissements ;
 *  · les EXONYMES ajoutent leur ville en fin de liste — « londres » rend
 *    London, sans jamais déplacer un résultat obtenu par le nom réel (« vienne »
 *    rend d'abord Vienne (FR), puis Vienna (AT)).
 *
 * Requête vide ou trop courte : on rend le haut de chaque liste plutôt qu'un
 * écran vide — soit les villes ouvertes, puis les plus grandes villes d'Europe.
 * Le total est BORNÉ (`CITY_SEARCH_RESULT_LIMIT`) : on ne peint jamais 7 870
 * lignes.
 */
export function searchCityEntries(
  index: CityIndex,
  query: string,
  limit: number = CITY_SEARCH_RESULT_LIMIT,
): readonly CityEntry[] {
  const max = Math.max(0, limit);
  if (max === 0) return [];
  const depth = max * CITY_SEARCH_OVERSCAN;

  // Les deux groupes sont accumulés SÉPARÉMENT : c'est ce qui garde l'invariant
  // « aucune ville ouverte ne suit une ville non ouverte » vrai même quand un
  // exonyme ajoute une passe de résultats.
  const open: Ranked[] = [];
  const referenced: Ranked[] = [];
  const seen = new Set<string>();

  for (const q of [query, ...cityQueryAliases(query)]) {
    const normalized = normalizeCityQuery(q);
    const openHits = searchCities(index.open, q, { limit: depth });
    const referencedHits = searchCities(index.referenced, q, { limit: depth });
    // Le parent d'une subdivision peut être ouvert (Paris) ou seulement
    // référencé (Zürich) : on cherche dans les deux.
    const pool = [...openHits, ...referencedHits];

    for (const city of openHits) {
      // Une ville que le SERVEUR déclare ouverte n'est jamais masquée : elle est
      // jouable, quoi que son nom ressemble.
      if (seen.has(city.id)) continue;
      seen.add(city.id);
      open.push(rank(city, 'open', normalized));
    }
    for (const city of referencedHits) {
      if (seen.has(city.id)) continue;
      if (pool.some((parent) => isCitySubdivisionOf(city, parent))) continue;
      seen.add(city.id);
      referenced.push(rank(city, 'referenced', normalized));
    }
  }
  // ⚠️ AUCUNE SORTIE ANTICIPÉE quand la liste est pleine, et c'est délibéré :
  // s'arrêter dès `max` atteint aurait fait dépendre le résultat de l'ordre des
  // passes. « roma » rend aujourd'hui 10 lignes, donc l'exonyme a sa chance ;
  // le jour où le référentiel grossit et où la passe littérale en rend 25, Rome
  // aurait silencieusement disparu de « roma ». Quatre passes au maximum
  // (1 littérale + `CITY_ALIAS_LIMIT`), et le classement décide seul.

  return [...byNameStart(open), ...byNameStart(referenced)].slice(0, max);
}

/** Un résultat et la force de sa correspondance, le temps du classement. */
interface Ranked {
  readonly entry: CityEntry;
  /** 0 = le nom EST la requête · 1 = il commence par elle · 2 = elle tombe ailleurs. */
  readonly tier: 0 | 1 | 2;
}

function rank(city: EuCity, status: CityStatus, normalizedQuery: string): Ranked {
  const name = normalizeCityQuery(city.name);
  const tier: 0 | 1 | 2 =
    normalizedQuery.length === 0 || name === normalizedQuery
      ? 0
      : name.startsWith(normalizedQuery)
        ? 1
        : 2;
  return { entry: toEntry(city, status), tier };
}

/**
 * Reclasse les résultats de TOUTES les passes ensemble : nom exact, puis début
 * de nom, puis le reste.
 *
 * Sans ça, un germanophone tapant « Wien » verrait « Wiener Neustadt » (44 000
 * habitants, qui commence bien par « wien ») avant Vienna, et « München »
 * rendrait « Ottobrunn bei München » avant Munich : la passe du nom littéral
 * arrive d'abord, quelle que soit la qualité de ses correspondances.
 *
 * Le tri est STABLE (`Array.prototype.sort` l'est depuis ES2019) : à force
 * égale, l'ordre du moteur — et donc la priorité du nom LITTÉRALEMENT tapé sur
 * l'exonyme — est conservé. C'est ce qui laisse « vienne » rendre Vienne (FR),
 * exacte, avant Vienna (AT), exacte elle aussi via son exonyme.
 *
 * ⚠️ Ce n'est PAS une réimplémentation du classement du moteur (`matchRank`,
 * cities.ts, qui a un quatrième cran « début de mot » et départage ensuite par
 * population) : deux classements complets qui divergent, ce serait une ville
 * trouvée ici et perdue là. C'est un tri PLUS GROSSIER, appliqué ENTRE les
 * passes, avec la même normalisation partagée — et le classement fin du moteur
 * survit intact sous lui, par stabilité.
 */
function byNameStart(ranked: readonly Ranked[]): readonly CityEntry[] {
  return [...ranked].sort((a, b) => a.tier - b.tier).map((r) => r.entry);
}

/**
 * Retrouve une ville choisie par son identifiant, avec son statut RÉEL au moment
 * de la lecture. `null` = cet identifiant n'est ni ouvert ni dans le référentiel
 * — l'écran doit alors le DIRE, pas afficher un nom vide ni supposer.
 */
export function findCityEntry(index: CityIndex, cityId: string | null): CityEntry | null {
  if (!cityId) return null;
  const open = index.open.find((c) => c.id === cityId);
  if (open) return toEntry(open, 'open');
  const referenced = index.referenced.find((c) => c.id === cityId);
  return referenced ? toEntry(referenced, 'referenced') : null;
}

/**
 * LE RACCOURCI « UTILISER MA POSITION », côté index fusionné.
 *
 * Il PRÉSÉLECTIONNE une ville que le joueur confirme ensuite — il ne décide
 * rien, et surtout il ne décide AUCUNE capture (le seul test in/out qui fasse
 * autorité est serveur, sur les contours de `city_zones`).
 *
 * ⚠️ LES VILLES OUVERTES SONT INTERROGÉES D'ABORD, et c'est indispensable, pas
 * cosmétique : le référentiel GeoNames contient les arrondissements comme
 * localités (« Paris 15 Vaugirard »…). Sans cette priorité, quelqu'un debout
 * dans le 15ᵉ se verrait proposer « Paris 15 Vaugirard » — une ville PAS
 * ouverte — au lieu de Paris, qui l'est. On cherche donc « suis-je dans une
 * ville ouverte ? » puis, seulement sinon, « quelle vraie ville est la plus
 * proche ? ».
 *
 * La même règle vaut hors ville ouverte : le plus proche de quelqu'un debout
 * dans le 3ᵉ arrondissement de Lyon est « Lyon 03 », pas Lyon. On REMONTE donc
 * une subdivision à sa ville (`isCitySubdivisionOf`) avant de proposer quoi que
 * ce soit — proposer un arrondissement comme ville est le même bruit que dans la
 * liste de recherche, en pire : ici personne ne l'a demandé.
 *
 * Hors rayon des deux ⇒ `null`. Jamais de repli sur la ville la plus peuplée ni
 * sur Paris : le repli qui invente est le mensonge démonté par AMENDEMENT-47.
 */
export function nearestCityEntry(
  index: CityIndex,
  point: LatLngPoint,
  radiusKm?: number,
): CityEntry | null {
  const open = cityAt(point, index.open.map((c) => toEntry(c, 'open')), radiusKm);
  if (open) return open;
  const near = cityAt(point, index.referenced.map((c) => toEntry(c, 'referenced')), radiusKm);
  if (!near) return null;
  const city = index.referenced.find((c) => c.id === near.cityId);
  return city ? toEntry(parentCityOf(index, city), 'referenced') : near;
}

/**
 * Remonte une subdivision à sa ville, au plus deux crans (un arrondissement
 * d'arrondissement n'existe pas ; la borne évite tout cycle sur une donnée
 * inattendue). Rend la ville elle-même quand elle n'est la subdivision de rien.
 */
function parentCityOf(index: CityIndex, city: EuCity): EuCity {
  let current = city;
  for (let step = 0; step < 2; step++) {
    const parent = index.referenced.find((p) => isCitySubdivisionOf(current, p));
    if (!parent) return current;
    current = parent;
  }
  return current;
}

/**
 * Libellé affiché : « Brest (FR) ». Le code pays est TOUJOURS présent quand on
 * le connaît — c'est ce qui rend Brest (BY) et Brest (FR), Saint-Denis (FR) et
 * Saint-Denis (RE), Newport (GB) et Newport (US) distinguables à l'œil. Il
 * disparaît, et lui seul, quand le serveur sert une ville hors référentiel.
 */
export function cityEntryLabel(entry: CityEntry): string {
  if (!entry.country) return entry.name;
  return cityLabel({
    id: entry.cityId,
    name: entry.name,
    country: entry.country,
    lat: 0,
    lng: 0,
    population: 0,
  });
}
