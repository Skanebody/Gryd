/**
 * GRYD — E12 « Couches et filtres de carte » (spec produit l.902-930) : LA
 * MÉCANIQUE, en PUR.
 *
 * ═══ CE QUE CE MODULE RÉSOUT ════════════════════════════════════════════════
 * La feuille basse « Calques » existait déjà (LayerMenu, BattleMapOverlays) et
 * le FORMAT était conforme (feuille, jamais un écran plein, filtres derrière
 * Couches — §A). C'est la MÉCANIQUE qui ne l'était pas :
 *   1. elle ne proposait qu'une LENTILLE parmi six (`MapMode`, AMENDEMENT-11
 *      §3 / -37 §7) — un choix EXCLUSIF, là où la spec l.912-918 énumère SEPT
 *      INTERRUPTEURS INDÉPENDANTS (mes territoires, crew, rivaux, contestées,
 *      missions, zones protégées privées, étiquettes) ;
 *   2. rien n'était PERSISTÉ : le mode vivait dans un `useState` de MapScreen,
 *      donc remis à zéro à chaque remontage — alors que la seule Règle de la
 *      spec pour cet écran est « Les réglages persistent PAR ACTIVITÉ »
 *      (l.922 ; `ACTIVITY_SCOPE.mapLayers === 'per_activity'`) ;
 *   3. aucune exception d'urgence : un filtre pouvait masquer une zone à moi en
 *      train d'expirer, ce que la même ligne interdit (« Le filtre ne peut pas
 *      masquer une menace urgente concernant l'utilisateur ; celle-ci reste
 *      visible sous forme de marqueur »).
 *
 * La LENTILLE n'est PAS remplacée — elle est conservée telle quelle : elle dit
 * ce que la carte MET EN AVANT (opacités `MODE_EMPHASIS`), le filtre dit ce
 * qu'elle AFFICHE. Défaire AMENDEMENT-37 §7 (« défaut = Contrôle ») pour
 * satisfaire E12 aurait été une régression, et la spec ne le demande pas.
 *
 * ═══ CE QU'IL NE FAIT PAS ═══════════════════════════════════════════════════
 * Aucun React, aucun I/O, aucune horloge implicite (`nowMs` est INJECTÉ), aucun
 * import de rendu. La persistance vit dans `mapPref.ts` (même grammaire que le
 * fond de carte, la vue 3D et la lentille Run/Bike) ; le rendu vit dans les deux
 * forks de `MapScreen`. Ici : les règles, et rien d'autre — donc testables sous
 * Deno sans monter un écran.
 *
 * ═══ POURQUOI CINQ INTERRUPTEURS PEINTS, ET PAS SEPT ════════════════════════
 * `MAP_LAYER_KEYS` en déclare SEPT, et c'est la bonne liste : c'est celle de la
 * spec, et elle est la clé du stockage comme de l'analytics. Mais la
 * constitution §2 interdit de peindre une action qui ne peut PAS aboutir, et
 * deux de ces sept n'ont AUJOURD'HUI rien à filtrer sur cette carte :
 *   · `missions` — la carte ne peint AUCUN marqueur de mission depuis la fin du
 *     mode vitrine (les POI/défis/objectifs venaient tous de `demo.ts` ;
 *     MapScreen.tsx:117-124 le dit). Un interrupteur « Missions » serait un
 *     bouton mort ;
 *   · `private_zones` — aucune zone de confidentialité n'est rendue sur la carte
 *     (aucune surface de `features/map/**` ne lit `PRIVACY_ZONES_*`). Elles
 *     EXISTENT et excluent bien la capture côté serveur : c'est leur AFFICHAGE
 *     qui n'a jamais été bâti, donc il n'y a rien à masquer.
 * Ils restent dans le type, le stockage et le défaut (une préférence posée
 * aujourd'hui restera valide le jour où ces couches seront peintes) ; ils ne
 * sont simplement pas RENDUS comme interrupteurs. `WIRED_MAP_LAYERS` est la
 * seule source de cette distinction — l'absence d'un bouton n'est pas un
 * mensonge, un bouton qui échoue toujours en est un.
 */
import {
  MAP_LAYER_DEFAULT_VISIBLE,
  MAP_LAYER_KEYS,
  MAP_URGENT_DEFENSE_WINDOW_H,
  mapFeatureVisible,
  type Activity,
  type MapLayerKey,
} from '@klaim/shared';

// ═══════════════════════════════════════════════════════════════════════════
// 1. L'ÉTAT DES SEPT INTERRUPTEURS
// ═══════════════════════════════════════════════════════════════════════════

/** Visibilité des sept couches d'E12. Défaut : toutes vraies (spec l.912-918). */
export type MapLayerVisibility = Readonly<Record<MapLayerKey, boolean>>;

/**
 * Les couches que le RENDU de cette carte sait réellement honorer aujourd'hui.
 * Voir l'en-tête : `missions` et `private_zones` en sont absents parce que rien
 * n'est peint pour elles — pas parce qu'on les juge secondaires.
 *
 * L'ORDRE EST CELUI DE LA SPEC (l.912-918), amputé des deux non peintes : la
 * feuille doit se lire dans l'ordre où le produit l'a écrite.
 */
export const WIRED_MAP_LAYERS = [
  'mine',
  'crew',
  'rivals',
  'contested',
  'labels',
] as const satisfies readonly MapLayerKey[];

export type WiredMapLayerKey = (typeof WIRED_MAP_LAYERS)[number];

/** État par défaut — délégué à game-rules (aucune seconde vérité ici). */
export const DEFAULT_MAP_LAYERS: MapLayerVisibility = MAP_LAYER_DEFAULT_VISIBLE;

/** Un interrupteur bougé → un NOUVEL objet (jamais de mutation partagée). */
export function withLayer(
  visibility: MapLayerVisibility,
  layer: MapLayerKey,
  visible: boolean,
): MapLayerVisibility {
  if (visibility[layer] === visible) return visibility;
  return { ...visibility, [layer]: visible };
}

/** Vrai si RIEN n'est filtré (sert à masquer « Tout réafficher » — §A). */
export function allLayersVisible(visibility: MapLayerVisibility): boolean {
  return MAP_LAYER_KEYS.every((key) => visibility[key]);
}

/** Clé de persistance, UNE PAR DISCIPLINE (spec l.922 « par activité »). */
export function mapLayersStorageKey(activity: Activity): string {
  return `gryd.maplayers.${activity}`;
}

/** Clé de persistance de la LENTILLE, elle aussi par discipline (même Règle). */
export function mapModeStorageKey(activity: Activity): string {
  return `gryd.mapmode.${activity}`;
}

/**
 * JSON stocké → visibilité. TOLÉRANT PAR CONSTRUCTION : une clé absente,
 * illisible ou d'un type inattendu retombe sur le DÉFAUT de cette clé, jamais
 * sur `false`. Un stockage corrompu ne doit pas faire disparaître du territoire
 * réel de la carte de quelqu'un — ce serait la sous-déclaration silencieuse que
 * le reste du dépôt refuse partout.
 *
 * `null` = rien de lisible du tout (clé absente, JSON invalide) : l'appelant
 * garde le défaut.
 */
export function parseMapLayers(raw: string | null): MapLayerVisibility | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const source = parsed as Record<string, unknown>;
  const out = {} as Record<MapLayerKey, boolean>;
  for (const key of MAP_LAYER_KEYS) {
    const value = source[key];
    out[key] = typeof value === 'boolean' ? value : MAP_LAYER_DEFAULT_VISIBLE[key];
  }
  return out;
}

/** Visibilité → JSON stocké (les sept clés, toujours — jamais un objet partiel). */
export function serializeMapLayers(visibility: MapLayerVisibility): string {
  const out = {} as Record<MapLayerKey, boolean>;
  for (const key of MAP_LAYER_KEYS) out[key] = visibility[key];
  return JSON.stringify(out);
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. À QUELLE COUCHE APPARTIENT UN TERRITOIRE PEINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ce que le filtre a besoin de savoir d'un territoire — et RIEN de plus. Type
 * structurel volontaire : il épouse `RealTerritory['props']` sans importer le
 * pipeline de rendu (qui tire h3-js), et il rend ce module testable seul.
 */
export interface LayerTerritoryFacts {
  /** `TerritoryProperties.status` — le RÔLE §C ('crew' | 'rival' | 'contested'…). */
  readonly status: string;
  /** `territories.owner_id` / `hex_claims.owner_user_id`. */
  readonly ownerId: string | null;
  /** `territories.owner_type` ('neutral' sur le chemin hexagonal). */
  readonly ownerType: 'user' | 'crew' | 'neutral';
  /** Échéance de decay la plus PROCHE (ISO), `null` si aucune source. */
  readonly earliestDecayAt: string | null;
}

/** QUI REGARDE — le même couple que celui qui a servi à PEINDRE (§C). */
export interface LayerViewer {
  readonly meId: string | null;
  /** Ids des membres de mon crew + l'id du crew lui-même (cf. MapScreen). */
  readonly crewIds: ReadonlySet<string> | null;
}

/**
 * Le territoire m'appartient-il, à moi ou à mon crew ? MÊME règle que
 * `territoriesSource.territoryRole` — reproduite ici sur les seuls faits dont le
 * filtre dispose, jamais élargie : `ownerType !== 'crew'` protège du cas où un
 * uuid de crew vaudrait par accident le mien (0074 n'a aucune contrainte croisée
 * entre les deux espaces d'uuid, `zoneDetail.zoneOwnership` le dit déjà).
 */
function isMine(facts: LayerTerritoryFacts, viewer: LayerViewer): boolean {
  const { ownerId, ownerType } = facts;
  if (ownerId === null) return false;
  if (viewer.meId !== null && ownerId === viewer.meId && ownerType !== 'crew') return true;
  return viewer.crewIds?.has(ownerId) ?? false;
}

/**
 * DANS QUELLE COUCHE D'E12 tombe ce territoire ?
 *
 * L'ordre est celui de la lisibilité, pas celui de la liste : `contested` gagne
 * sur la propriété (comme dans `territoryRole` : « une zone disputée se lit comme
 * disputée, quel qu'en soit le tenant » — c'est l'information qui déclenche
 * l'action). Puis « à moi » (`mine`) se distingue de « à mon crew » (`crew`),
 * puis tout le reste est rival.
 *
 * ⚠ `mine` vs `crew` : le RENDU ne les distingue pas (les deux sont chartreuse,
 * §C « la couleur dit le RÔLE »), mais le FILTRE le peut, parce qu'il travaille
 * sur la liste de territoires AVANT peinture, où `ownerId` existe encore. C'est
 * exactement pourquoi le filtrage se fait ici et pas dans une expression de
 * couche MapLibre : les deux interrupteurs de la spec seraient sinon impossibles
 * à honorer — donc deux boutons morts.
 */
export function territoryLayerKey(
  facts: LayerTerritoryFacts,
  viewer: LayerViewer,
): MapLayerKey {
  if (facts.status === 'contested') return 'contested';
  if (!isMine(facts, viewer)) return 'rivals';
  return facts.ownerType === 'crew' ? 'crew' : 'mine';
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. L'EXCEPTION D'URGENCE (spec l.922)
// ═══════════════════════════════════════════════════════════════════════════

/** `MAP_URGENT_DEFENSE_WINDOW_H` en millisecondes — dérivée, jamais recopiée. */
const URGENT_WINDOW_MS = MAP_URGENT_DEFENSE_WINDOW_H * 60 * 60 * 1000;

/**
 * Ce territoire est-il une MENACE URGENTE **POUR L'UTILISATEUR** ?
 *
 * « Concernant l'utilisateur » est une CONDITION, pas une politesse
 * (`MAP_LAYERS_URGENCY_OVERRIDE` le dit en toutes lettres) : deux faits, et
 * seulement deux, la constituent —
 *   1. une zone que JE tiens (ou mon crew) dont l'échéance de decay tombe dans
 *      moins de `MAP_URGENT_DEFENSE_WINDOW_H` (et n'est pas déjà passée : une
 *      échéance dépassée n'est plus une menace, c'est un fait accompli, et le
 *      serveur seul dit ce qu'il en est advenu) ;
 *   2. une zone que je tiens et qui est `contested` — elle est en train de
 *      m'être prise.
 * Un territoire rival, une étiquette, une mission ne menacent personne.
 *
 * `nowMs` est INJECTÉ : aucune horloge implicite, donc un test peut poser
 * l'instant exact où l'échéance bascule.
 */
export function isUrgentUserThreat(
  facts: LayerTerritoryFacts,
  viewer: LayerViewer,
  nowMs: number,
): boolean {
  if (!isMine(facts, viewer)) return false;
  if (facts.status === 'contested') return true;
  if (facts.earliestDecayAt === null) return false;
  const decayMs = Date.parse(facts.earliestDecayAt);
  if (Number.isNaN(decayMs)) return false;
  return decayMs >= nowMs && decayMs - nowMs <= URGENT_WINDOW_MS;
}

/**
 * CE QUE LA CARTE PEINT, ET CE QU'ELLE RÉDUIT À UN MARQUEUR.
 *
 * Trois issues par territoire, jamais deux :
 *   · `painted`       — sa couche est allumée : rendu normal (contour + aplat) ;
 *   · `urgentMarkers` — sa couche est ÉTEINTE mais il constitue une menace
 *     urgente pour moi : la spec exige qu'il « reste visible SOUS FORME DE
 *     MARQUEUR ». `mapFeatureVisible` tranche l'exception (elle n'autorise que
 *     `mine` et `contested`), et ce champ porte la nuance que la règle refuse
 *     de porter elle-même : on pose un marqueur, on ne rallume pas le calque ;
 *   · écarté          — filtré, et rien de plus à en dire.
 *
 * Générique sur la forme des éléments (`facts` extrait par l'appelant) : les
 * deux forks de MapScreen passent leurs `RealTerritory` sans les convertir, donc
 * sans copie qui pourrait diverger.
 */
export interface FilteredTerritories<T> {
  readonly painted: T[];
  readonly urgentMarkers: T[];
}

export function filterTerritoriesByLayers<T>(
  items: readonly T[],
  factsOf: (item: T) => LayerTerritoryFacts,
  visibility: MapLayerVisibility,
  viewer: LayerViewer,
  nowMs: number,
): FilteredTerritories<T> {
  const painted: T[] = [];
  const urgentMarkers: T[] = [];
  for (const item of items) {
    const facts = factsOf(item);
    const key = territoryLayerKey(facts, viewer);
    if (visibility[key]) {
      painted.push(item);
      continue;
    }
    const urgent = isUrgentUserThreat(facts, viewer, nowMs);
    if (mapFeatureVisible(key, false, urgent)) urgentMarkers.push(item);
  }
  return { painted, urgentMarkers };
}
