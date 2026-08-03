/**
 * GRYD — tests du FOND DE CARTE EMBARQUÉ.
 *
 * Un style de carte est une donnée muette : il n'échoue pas, il rend NOIR. Ces
 * tests verrouillent les quatre façons dont ce fichier pourrait casser la carte
 * sans que personne ne s'en aperçoive avant le terrain :
 *   1. un nom de `source-layer` ou un champ écrit de mémoire au lieu d'être relu
 *      dans le schéma `carto.streets/v1` → la couche ne matche RIEN, silence total ;
 *   2. une teinte écrite en dur → la charte s'arrête au bord de la carte ;
 *   3. un identifiant de couche qui percute une couche de JEU, l'extrusion 3D ou
 *      le fond satellite → une couche écrasée, ou le jeu peint sous le décor ;
 *   4. un `glyphs` perdu → plus AUCUN label, ni du fond ni du jeu.
 *
 * Deno, aucun réseau, aucun mock : on importe le module de prod et on lit ce
 * qu'il produit. (Le fait que ces noms de couches EXISTENT chez CARTO a été
 * vérifié en téléchargeant le style et le TileJSON le 26/07/2026 ; le test, lui,
 * garantit qu'on ne s'en écarte plus par inadvertance.)
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { colors, gameColors, mapTokens, withAlpha } from '@klaim/shared';
import {
  BASEMAP_GLYPHS_URL,
  BASEMAP_LAYER_PREFIX,
  BASEMAP_SOURCE_ID,
  BASEMAP_TILEJSON_URL,
  NIGHT_PALETTE,
  buildBasemapStyle,
  grydNightStyle,
  grydNightStyleJson,
} from './nightStyle.ts';

/**
 * Le contrat avec `mapStyle.ts` est vérifié en LISANT SON TEXTE, pas en
 * l'important : ce module tire `RealMapGeoJSONLayer` du barrel `ui/game`, donc
 * du TSX que `deno test` ne sait pas type-checker. Lire la source est aussi une
 * détection INDÉPENDANTE — elle attrape un identifiant ajouté à la main
 * là-bas, ce qu'un import de constantes ne verrait pas.
 */
/**
 * ⚠️ Ce chemin pointe vers le LEGACY, et c'est volontaire tant que la carte
 * legacy vit : c'est elle qui peut entrer en collision d'identifiants avec ce
 * fond. Le module testé, lui, n'importe rien de `features/` — seule cette
 * VÉRIFICATION regarde là-bas. Ces lignes disparaissent avec la carte legacy
 * au basculement (ADR-001, mode hybride), pas avant.
 */
const mapStyleSource = await Deno.readTextFile(
  new URL('../../features/map/mapStyle.ts', import.meta.url),
);

/**
 * Les 14 `vector_layers` du TileJSON `carto.streets/v1` (relevés le 26/07/2026).
 * Un `source-layer` hors de cette liste ne matchera jamais une seule géométrie.
 */
const SCHEMA_SOURCE_LAYERS = new Set([
  'water',
  'waterway',
  'landcover',
  'landuse',
  'mountain_peak',
  'park',
  'boundary',
  'aeroway',
  'transportation',
  'building',
  'water_name',
  'transportation_name',
  'place',
  'housenumber',
  'poi',
  'aerodrome_label',
]);

const style = grydNightStyle();

Deno.test('style — spec MapLibre valide (version, source, glyphs)', () => {
  assertEquals(style.version, 8);
  // `glyphs` : sans lui, aucun label ne s'affiche — ni ceux du fond, ni les
  // libellés de POINTS du jeu, qui demandent leurs polices au MÊME endpoint.
  assert(BASEMAP_GLYPHS_URL.includes('{fontstack}'));
  assert(BASEMAP_GLYPHS_URL.includes('{range}'));
  assertEquals(style.glyphs, BASEMAP_GLYPHS_URL);
  const source = style.sources[BASEMAP_SOURCE_ID];
  assert(source !== undefined, 'la source vectorielle doit exister');
  assertEquals(source.type, 'vector');
  assertEquals(source.url, BASEMAP_TILEJSON_URL);
  assert(style.layers.length > 0);
});

Deno.test('style — chaque couche est complète et branchée sur la bonne source', () => {
  for (const layer of style.layers) {
    assert(typeof layer.id === 'string' && layer.id.length > 0, 'id manquant');
    assert(
      ['background', 'fill', 'line', 'symbol'].includes(layer.type),
      `type inattendu sur ${layer.id}`,
    );
    if (layer.type === 'background') {
      assertEquals(layer.source, undefined);
      continue;
    }
    assertEquals(layer.source, BASEMAP_SOURCE_ID, `${layer.id} : mauvaise source`);
    const sourceLayer = layer['source-layer'];
    assert(sourceLayer !== undefined, `${layer.id} : source-layer manquant`);
    assert(
      SCHEMA_SOURCE_LAYERS.has(sourceLayer),
      `${layer.id} : source-layer « ${sourceLayer} » absent du schéma carto.streets/v1`,
    );
  }
});

Deno.test('style — le métier est couvert : voirie, eau, bâti, lieux, noms de rues', () => {
  const used = new Set(
    style.layers.map((l) => l['source-layer']).filter((s): s is string => s !== undefined),
  );
  // Sans `transportation`, la carte n'a pas de rues : c'est ELLE qui porte la
  // lecture d'un fond de course (le reste est du contexte).
  for (const required of [
    'transportation',
    'transportation_name',
    'water',
    'building',
    'place',
    'boundary',
    'landcover',
  ]) {
    assert(used.has(required), `source-layer « ${required} » absent du style`);
  }
});

Deno.test('style — épuré : beaucoup moins de couches que le dark-matter d’origine', () => {
  // dark-matter servait 93 couches tout-usage. Le seuil n'est pas cosmétique :
  // c'est la moitié de ces couches qui se battait avec la chartreuse/l'orange/le
  // violet du jeu. Le plancher (> 15) interdit l'excès inverse — une carte sans
  // hiérarchie de voirie ni labels ne serait plus une carte.
  assert(style.layers.length < 35, `trop de couches : ${style.layers.length}`);
  assert(style.layers.length > 15, `trop peu de couches : ${style.layers.length}`);
});

Deno.test('style — AUCUNE couleur hors tokens @klaim/shared', () => {
  // On construit l'ensemble des teintes AUTORISÉES depuis les tokens eux-mêmes :
  // hex bruts + toutes les déclinaisons alpha effectivement produites par la
  // palette. Toute autre chaîne de couleur trouvée dans le `paint` est un bug.
  const allowed = new Set<string>([
    ...Object.values(colors),
    ...Object.values(gameColors),
    ...Object.values(mapTokens),
    ...Object.values(NIGHT_PALETTE),
  ]);
  // Garde-fou : la palette elle-même ne doit contenir QUE des tokens ou des
  // dérivations `withAlpha` d'un token (aucune teinte inventée).
  const tokenHexes = [...Object.values(colors), ...Object.values(gameColors)].filter((v) =>
    v.startsWith('#'),
  );
  for (const [role, value] of Object.entries(NIGHT_PALETTE)) {
    const isToken = allowed.has(value);
    const isDerived =
      value.startsWith('rgba(') &&
      tokenHexes.some((hex) => {
        for (let a = 1; a <= 100; a += 1) {
          if (withAlpha(hex, a / 1000) === value || withAlpha(hex, a / 100) === value) return true;
        }
        return false;
      });
    assert(isToken || isDerived, `palette.${role} = « ${value} » n'est pas un token GRYD`);
  }

  const colorLike = /#[0-9a-fA-F]{3,8}|rgba?\(/;
  for (const layer of style.layers) {
    for (const [prop, value] of Object.entries(layer.paint ?? {})) {
      if (typeof value !== 'string' || !colorLike.test(value)) continue;
      assert(allowed.has(value), `${layer.id}.${prop} = « ${value} » hors tokens`);
    }
  }
});

Deno.test('style — le fond n’emprunte JAMAIS le vocabulaire de couleur du jeu', () => {
  // RÈGLES §C : chartreuse = moi, orange = rival, violet = contesté. Un décor qui
  // reprend ces teintes (même diluées) fait dire au fond quelque chose sur la
  // possession — la faute exacte que ce lot vient corriger.
  const forbidden = [colors.chartreuse, gameColors.rival, gameColors.contested];
  const serialized = grydNightStyleJson();
  for (const hex of forbidden) {
    const rgb = hex.slice(1);
    assert(!serialized.includes(hex), `teinte de jeu ${hex} présente dans le fond`);
    const [r, g, b] = [
      parseInt(rgb.slice(0, 2), 16),
      parseInt(rgb.slice(2, 4), 16),
      parseInt(rgb.slice(4, 6), 16),
    ];
    assert(
      !serialized.includes(`rgba(${r}, ${g}, ${b}`) && !serialized.includes(`rgba(${r},${g},${b}`),
      `déclinaison de la teinte de jeu ${hex} présente dans le fond`,
    );
  }
});

Deno.test('style — aucune collision d’identifiant avec le JEU, le 3D ou le satellite', () => {
  const baseIds = new Set(style.layers.map((l) => l.id));
  assertEquals(baseIds.size, style.layers.length, 'deux couches du fond portent le même id');

  // 1. Tout le fond vit dans SON espace de noms.
  for (const id of baseIds) {
    assert(id.startsWith(BASEMAP_LAYER_PREFIX), `${id} : préfixe de fond manquant`);
  }

  // 2. AUCUNE chaîne littérale de `mapStyle.ts` — d'où sortent tous les ids de
  //    couches de JEU (`terr-*`, `sector-*`) et ceux du 3D / du satellite
  //    (`gryd-3d-buildings`, `gryd-satellite*`, `gryd-dem-terrarium`) — ne tombe
  //    dans cet espace de noms. Les deux ensembles sont donc disjoints par
  //    construction, y compris pour les ids composés (`${idBase}-casing`…).
  const literals = [...mapStyleSource.matchAll(/'([^'\n]*)'/g)].map((m) => m[1] ?? '');
  assert(literals.length > 50, 'lecture de mapStyle.ts suspecte (trop peu de littéraux)');
  for (const lit of literals) {
    assert(
      !lit.startsWith(BASEMAP_LAYER_PREFIX),
      `mapStyle.ts contient « ${lit} », dans l'espace de noms du fond`,
    );
  }

  // 3. Réciproquement, le fond n'emprunte aucun préfixe de couche de jeu.
  for (const id of baseIds) {
    assert(!id.startsWith('terr-') && !id.startsWith('sector-'), `${id} : préfixe de JEU`);
  }
});

Deno.test('style — le 3D retrouve sa source et ses bâtiments', () => {
  // AMENDEMENT-27 : le fork web extrude sur `MAP_3D.vectorSourceId` CHERCHÉ dans
  // le style servi. Si le style embarqué ne l'expose plus, le 3D s'éteint sans
  // erreur — ce test est le seul filet.
  assert(style.sources[BASEMAP_SOURCE_ID] !== undefined);
  const building = style.layers.find((l) => l['source-layer'] === 'building');
  assert(building !== undefined, 'le source-layer des bâtiments doit être atteignable');
  // Et `MAP_3D` doit tirer son id de source / son TileJSON D'ICI : deux valeurs
  // recopiées dériveraient un jour, et le 3D chercherait une source inexistante.
  assert(
    mapStyleSource.includes('vectorSourceId: BASEMAP_SOURCE_ID'),
    'MAP_3D.vectorSourceId doit venir de mvp/map/nightStyle',
  );
  assert(
    mapStyleSource.includes('vectorTileJsonUrl: BASEMAP_TILEJSON_URL'),
    'MAP_3D.vectorTileJsonUrl doit venir de mvp/map/nightStyle',
  );
});

Deno.test('style — hiérarchie de voirie : l’axe est plus large et peint APRÈS la rue', () => {
  const ids = style.layers.map((l) => l.id);
  const order = ['road-minor', 'road-secondary', 'road-primary', 'road-major'].map((k) =>
    ids.indexOf(`${BASEMAP_LAYER_PREFIX}${k}`),
  );
  for (const i of order) assert(i >= 0, 'une famille de voirie manque');
  for (let i = 1; i < order.length; i += 1) {
    assert(
      (order[i] ?? -1) > (order[i - 1] ?? -1),
      'ordre de peinture : un axe doit passer AU-DESSUS d’une rue au croisement',
    );
  }

  /** Largeur d'une rampe `interpolate` à un zoom donné (paliers exacts). */
  const widthAt = (id: string, zoom: number): number => {
    const layer = style.layers.find((l) => l.id === id);
    const expr = layer?.paint?.['line-width'] as unknown[] | undefined;
    assert(Array.isArray(expr) && expr[0] === 'interpolate', `${id} : largeur non interpolée`);
    for (let i = 3; i + 1 < expr.length; i += 2) {
      if (expr[i] === zoom) return expr[i + 1] as number;
    }
    throw new Error(`${id} : pas de palier au zoom ${zoom}`);
  };
  // À z16 (l'échelle du coureur) les quatre familles doivent être DISTINCTES.
  const minor = widthAt(`${BASEMAP_LAYER_PREFIX}road-minor`, 16);
  const secondary = widthAt(`${BASEMAP_LAYER_PREFIX}road-secondary`, 16);
  const primary = widthAt(`${BASEMAP_LAYER_PREFIX}road-primary`, 16);
  const major = widthAt(`${BASEMAP_LAYER_PREFIX}road-major`, 16);
  assert(minor < secondary && secondary < primary && primary < major, 'hiérarchie de largeur plate');
  // Chaque rue porte un liseré sombre STRICTEMENT plus large qu'elle : c'est lui
  // qui sépare deux voies parallèles sur un fond quasi noir.
  assert(widthAt(`${BASEMAP_LAYER_PREFIX}road-minor-casing`, 16) > minor);
  assert(widthAt(`${BASEMAP_LAYER_PREFIX}road-major-casing`, 16) > major);
});

Deno.test('style — labels en langue LOCALE, jamais name_en (le patch à chaud est mort)', () => {
  const labels = style.layers.filter((l) => l.type === 'symbol');
  assert(labels.length > 0, 'un fond sans aucun label est illisible');
  // Le point de tout ce lot : le nom local est ÉCRIT dans le style. Aucun
  // `name_en` ne doit survivre, sinon on aurait juste déplacé le bug.
  assert(!grydNightStyleJson().includes('name_en'), 'name_en présent dans le style embarqué');
  for (const layer of labels) {
    assertEquals(layer.layout?.['text-field'], '{name}', `${layer.id} : champ de texte inattendu`);
    const font = layer.layout?.['text-font'] as string[] | undefined;
    assert(Array.isArray(font) && font.length > 0, `${layer.id} : pile de polices manquante`);
  }
  // Labels RARES : au-delà, le fond redevient une carte à lire au lieu d'un canevas.
  assert(labels.length <= 8, `trop de couches de labels : ${labels.length}`);
});

Deno.test('style — la carte silencieuse de run garde prise sur ce style', () => {
  // AMENDEMENT-20 §1 : le mode silencieux masque les symboles par `source-layer`
  // et amincit les rues dont l'id contient minor/service/path. Si le style change
  // de nommage, l'override devient un no-op SILENCIEUX (la carte de course
  // resterait bavarde pendant le run) — on verrouille les deux prises.
  const hideable = new Set(['place', 'water_name', 'waterway', 'poi', 'housenumber', 'mountain_peak']);
  const hidden = style.layers.filter(
    (l) => l.type === 'symbol' && hideable.has(l['source-layer'] ?? ''),
  );
  assert(hidden.length > 0, 'aucun label ne serait masqué en Course Live');
  const thinnable = style.layers.filter(
    (l) =>
      l.type === 'line' &&
      l['source-layer'] === 'transportation' &&
      /minor|service|path/.test(l.id.toLowerCase()),
  );
  assert(thinnable.length > 0, 'aucune rue ne serait amincie en Course Live');
});

Deno.test('style — sérialisation stable et mémoïsée', () => {
  // Les deux forks RealMap consomment une CHAÎNE ; elle doit être identique d'un
  // appel à l'autre (sinon un remount inutile à chaque render) et reparsable.
  assertEquals(grydNightStyleJson(), grydNightStyleJson());
  assertEquals(grydNightStyle(), grydNightStyle());
  const parsed = JSON.parse(grydNightStyleJson()) as { layers: unknown[] };
  assertEquals(parsed.layers.length, style.layers.length);
});

Deno.test('style — la palette est le SEUL levier de teinte (aucune couleur codée en dur)', () => {
  // Reconstruit le style avec une palette entièrement fictive : si une teinte
  // survit à la substitution, c'est qu'elle est écrite en dur dans une couche.
  const sentinel = Object.fromEntries(
    Object.keys(NIGHT_PALETTE).map((k, i) => [k, `#${(i + 16).toString(16).padStart(6, '0')}`]),
  ) as unknown as typeof NIGHT_PALETTE;
  const probe = buildBasemapStyle(sentinel, 'probe');
  for (const layer of probe.layers) {
    for (const [prop, value] of Object.entries(layer.paint ?? {})) {
      if (typeof value !== 'string' || !/#[0-9a-fA-F]{3,8}|rgba?\(/.test(value)) continue;
      assert(
        Object.values(sentinel).includes(value),
        `${layer.id}.${prop} = « ${value} » ne vient pas de la palette`,
      );
    }
  }
});
