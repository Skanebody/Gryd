/**
 * GRYD — BATTLE MAP, variante WEB. Depuis la décision fondateur du 21/07/2026,
 * `npx expo start --web` sur localhost N'EST PLUS UNE VITRINE : c'est
 * l'INSTRUMENT DE PREVIEW du vrai produit, et il doit montrer exactement ce que
 * l'iPhone montrera. Ce fichier est donc tenu à la PARITÉ STRICTE avec
 * MapScreen.tsx, pas à une ressemblance.
 *
 * ─── DIVERGENCES WEB ⇄ NATIF CORRIGÉES LE 21/07/2026 ────────────────────────
 * • Le roster crew n'était PAS passé à `useRealTerritories()` : les zones de MON
 *   crew ressortaient en ORANGE RIVAL sur localhost et en chartreuse alliée sur
 *   iPhone. Deux cartes racontant des camps opposés (violation §C). Corrigé :
 *   `useRealCrew()` + Set mémoïsé, à l'identique du natif.
 * • Les LABELS LOCAUX (name_en → name : München, pas Munich) n'existaient que
 *   sur natif — `prefetchLocalizedBasemaps` / `subscribeBasemapSpecs` n'étaient
 *   jamais appelés ici. Corrigé : même préchargement, même remontage par
 *   `key={basemap}-${specRev}`.
 *
 * ─── DIVERGENCES QUI RESTENT, ET QU'ON NE PEUT PAS SUPPRIMER ────────────────
 * • Le RENDU : maplibre-gl (WebGL navigateur) ici, @maplibre/maplibre-react-native
 *   (natif) là-bas. Mêmes styles, mêmes couches, mais l'antialiasing, les polices
 *   et la 3D ne seront jamais pixel-identiques.
 * • La GÉOLOCALISATION : `navigator.geolocation` (précision poste fixe,
 *   permission par ORIGINE, Safari sans Permissions API) contre expo-location
 *   (GPS). La LOGIQUE de décision est partagée (locationState.ts), les CAPTEURS
 *   ne le sont pas : un fix web peut être à 2 km, ou absent en intérieur.
 * • La barre d'ÉCHELLE + attribution est rendue ici en overlay React (le natif
 *   n'affiche que l'attribution) — différence assumée, propre au navigateur.
 *
 * AMENDEMENT-13 §2/§4bis/§4ter : l'onglet Carte est posé sur de
 * VRAIES tuiles vectorielles MONDE ENTIER (RealMap — maplibre-gl, style
 * sombre type Uber-night surchargé aux tokens), librement navigable du niveau
 * rue au niveau planète : les rues RÉELLES (canal Saint-Martin, bd Voltaire,
 * Faubourg-du-Temple…) sont reconnaissables SOUS les couches de jeu. ZÉRO
 * hexagone visible — les couches sont les TRACÉS DE COURSE d'allTerritories
 * (§4ter : la frontière EST le tracé — boucles nettes + rubans le long des
 * vraies rues, TOUTES les possessions y compris Lille/Lyon — une seule
 * source pour les deux cartes) servis par battleGameLayers (mapStyle) :
 * remplissages faibles + traits NETS par état (AMENDEMENT-16 §0 : zéro
 * halo/glow — contesté DOUBLE trait décalé dont l'orange PULSE, decay
 * pointillé + sablier/secteur, protégé trait verify + UN shield/secteur,
 * objectif aplat + pin, avant-poste, or de la zone
 * bonus), route ouverte, aperçu du parcours sélectionné en source ligne
 * GeoJSON réelle. (Les marqueurs-points villes du dézoom — territoryDotLayers,
 * alimentés par FRANCE_CITIES_DEMO — ont été retirés : aucune agrégation réelle
 * par ville n'existe encore.) La
 * situation live passe en MARKERS RealMap (natifs maplibre-gl côté web — §5
 * perf) : uniquement « moi », et seulement quand un VRAI fix existe (les
 * MateMarker, POI et défis de scénario sont partis avec le mode vitrine).
 * Les labels secteurs custom ont disparu : les
 * tuiles réelles portent les noms de quartiers (République, Belleville…).
 * 5 CALQUES de lecture (AMENDEMENT-11 §3) : MODE_EMPHASIS module l'opacité
 * des couches GeoJSON (fills + alpha des frontières) — MapLibre fond les
 * transitions de peinture, bascule douce sans code d'animation dédié.
 * Échelle : barre PILOTÉE PAR LA CARTE (remplace la barre 500 m fixe) — elle
 * suit le zoom réel MapLibre, stylée tokens, attribution © OpenStreetMap
 * © CARTO accolée (relogée au-dessus de la nav : le bas de la carte est
 * couvert par la sheet). Offline : RealMap affiche fond noir + « Carte
 * indisponible — tes zones restent à toi », jamais d'écran blanc.
 * HUD (BattleMapOverlays), recentrer = flyTo ego, CTA COURIR au layout :
 * INCHANGÉS. Track EVENTS.mapLoadMs au montage (parité native).
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { colors } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import {
  RealMap,
  usePulse,
  type RealMapMarker,
  type RealMapPressEvent,
  type RealMapRef,
} from '../../ui/game';
import { RUN_BUTTON_BOTTOM } from '../nav/metrics';
import {
  BattleMapOverlays,
  type MapEmptyState,
  type MapZoneView,
} from './BattleMapOverlays';
import { useRealTerritories } from './hexClaims';
import { useSectorSnapshots } from './useSectorSnapshots';
import { sectorViewsFor } from './sectorView';
import { sectorPointLayers } from './allTerritories';
import { useSession } from '../../lib/session';
import { useRealCrew } from '../crew/real';
import { getLastRunResult } from '../run/runResult';
import { buildRealWidgetView, type TerritoryWidgetView } from '../widget/territoryWidget';
import { dataNote } from './territoryBuild';
import {
  basemapAttribution,
  basemapSpecRevision,
  battleGameLayers,
  battleMapStyle as ms,
  prefetchLocalizedBasemaps,
  subscribeBasemapSpecs,
  type BasemapKey,
} from './mapStyle';
import { useBasemapStyle, useMap3d } from './mapPref';
import { EGO_CAMERA, REAL_M_PER_DEG_LAT, type LatLngPoint } from './realAnchors';
import { DEFAULT_MAP_MODE, MODE_EMPHASIS, type MapMode } from './territory';
import { type MapLocationState, resolveLocation } from './locationState';
import { C } from '../../i18n/catalog/map';
import { useLocale } from '../../i18n/store';
import { resolve } from '../../i18n/types';
// Position réelle côté WEB : `../run/gps/provider` est marqué « fichier natif
// uniquement » (il tire expo-task-manager, sans support web) — l'importer ici
// mettait dans le bundle navigateur un module qui n'y a pas sa place. Même
// surface, même honnêteté (aucune position de repli) : voir webGeolocation.ts.
import {
  checkForegroundPermission,
  getCurrentPositionOnce,
  hasProvenGrant,
  isPermissionStateReadable,
  requestForegroundPermission,
} from './webGeolocation';

/**
 * Parité stricte avec la variante native : les états de `locationState.ts` PLUS
 * `unasked` — la permission n'a jamais été DEMANDÉE, parce que l'ouverture de la
 * carte ne la demande plus (voir l'effet de montage). Ni `denied` (personne n'a
 * refusé), ni `unavailable` (aucun capteur interrogé), ni `locating` (rien en
 * cours). Sur Safari — où l'état de permission n'est pas lisible — c'est l'état
 * d'ouverture TANT QUE cette origine n'a pas déjà rendu un fix : le navigateur
 * n'y est interrogé qu'au geste du joueur, jamais par surprise au chargement.
 */
type MapScreenLocationState = MapLocationState | 'unasked';

// ─── Constantes de rendu (UI uniquement — pas des règles de jeu) ────────────
/** Pulse du halo « moi » (position live, respiration lente). */
const EGO_PULSE_MS = 2_000;
/** Point « moi » (dot chartreuse cerclé) + halo. */
const EGO_DOT_SIZE = 14;
const EGO_HALO_SIZE = 40;
/** Le shield du secteur maison s'écarte du point « moi » (pas de collision). */
const SHIELD_ABOVE_EGO_PX = 26;
/** Taille des markers d'état posés sur la carte. */
const MARKER_SIZE = 18;
/** La barre d'échelle flotte à gauche du bouton COURIR, au-dessus de la nav. */
const SCALE_ABOVE_RUN_BOTTOM = 6;
/** La note d'honnêteté (P0.2) se pose juste au-dessus de l'échelle/attribution. */
const DATA_NOTE_ABOVE_RUN_BOTTOM = 34;
/** Largeur max de la barre d'échelle + segment de mesure (comme ScaleControl). */
const SCALE_MAX_PX = 130;
const SCALE_PROBE_PX = 100;
/** Paliers « ronds » de l'échelle (m) — la carte est librement zoomable monde. */
const SCALE_STEPS_M: readonly number[] = [
  50, 100, 200, 300, 500, 1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000, 200_000,
  500_000, 1_000_000, 2_000_000,
];

// AMENDEMENT-21 : la Carte est un ÉCRAN MISSION. Les contrôles flottants (fond
// dark/couleur + calques de lecture) vivent DANS le menu « Calques » du HUD
// (BattleMapOverlays) — plus aucun FAB de bascule de fond ici (2 FABs max :
// Recentrer + Calques). Le fond persisté (useBasemapStyle) est simplement passé
// au HUD, qui porte le menu.

/**
 * Markers RealMap de la scène — parité stricte avec la variante native : il n'en
 * reste qu'UN, « moi », peint UNIQUEMENT si un VRAI fix existe. `ego` null =
 * aucun point (jamais un dot posé sur République « pour meubler »).
 *
 * Les marqueurs de scénario (POI, défi, avant-poste, bouclier, sablier,
 * objectif, alliés opt-in) et leur étagement par bande de zoom sont partis avec
 * le mode vitrine : ils ne dosaient QUE de la démo.
 */
function buildMarkers(ego: LatLngPoint | null): RealMapMarker[] {
  if (!ego) return [];
  return [{ id: 'ego', lng: ego.lng, lat: ego.lat, children: <EgoMarker /> }];
}

export function MapScreen() {
  // AMENDEMENT-37 §7 : la carte OUVRE en mode CONTRÔLE (territoire = tous les
  // territoires pleins) — « état du monde d'abord » (étude §12, ordre
  // comprendre→décider→courir). autoMapMode reste disponible pour une bascule
  // ULTÉRIEURE (menace réellement live), mais n'est plus l'état INITIAL.
  const [mode, setMode] = useState<MapMode>(DEFAULT_MAP_MODE);
  /**
   * Aperçu de parcours peint sur la carte. Le SÉLECTEUR a disparu avec la démo
   * (c'était une liste de parcours fabriqués dans la sheet) : cet état reste
   * donc `null` tant que le Route Planner — qui produit de VRAIS itinéraires —
   * ne l'alimente pas. On garde le câblage plutôt qu'un faux choix.
   */
  const [selectedParcours] = useState<string | null>(null);
  // AMENDEMENT-37 §3 : zone tapée (null = carte nue). Un tap carte la pose
  // (tap sur le vide → null = désélection) ; elle pilote la sheet de zone (HUD)
  // ET l'accent « l'actif domine » via le 4ᵉ arg de battleGameLayers (contrat C3).
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<RealMapRef>(null);

  /**
   * POSITION RÉELLE — parité stricte avec la variante native : `null` tant
   * qu'aucun VRAI fix n'est arrivé. Aucune caméra République, aucun point
   * « moi » ; la carte ouvre sur la vue neutre monde et se cadre sur le joueur
   * dès le 1er fix.
   */
  const [egoPos, setEgoPos] = useState<LatLngPoint | null>(null);
  /**
   * Ce que la carte SAIT de la localisation (locationState.ts) — quatre états
   * distincts au lieu d'un booléen. « Recherche en cours » n'est pas « refusé »,
   * et « introuvable » (localisation macOS coupée, timeout de 10 s) n'est pas
   * « refusé » non plus : c'est cette confusion qui, sur Safari — dépourvu de
   * `navigator.permissions.query({name:'geolocation'})` — affichait « Active la
   * localisation » à quelqu'un qui venait de l'autoriser.
   */
  const [locationState, setLocationState] = useState<MapScreenLocationState>('locating');
  const locale = useLocale();
  /**
   * OUVERTURE DE LA CARTE — ON NE DEMANDE RIEN (corrigé le 21/07/2026, parité
   * stricte avec MapScreen.tsx, où l'entête détaille le raisonnement).
   *
   * En deux mots : `resolveLocation` DEMANDE la permission dès qu'elle n'est pas
   * accordée, donc l'invite du navigateur tombait au CHARGEMENT de la page,
   * alors que le produit annonce au joueur « le GPS s'allume au départ » et que
   * l'onboarding justifie la suppression de son écran `permission` par « la
   * vraie demande vit au premier GO ». Le code se range derrière ce qui a été
   * annoncé. Bénéfice web spécifique : une invite de géolocalisation non liée à
   * un geste est de toute façon ce que les navigateurs pénalisent le plus.
   *
   * ─── LE TROU SAFARI, ET COMMENT IL EST BOUCHÉ (même jour, 2e passe) ────────
   * Première version de ce correctif : « permission.status !== 'granted' ⇒ on
   * renonce ». Sur tout navigateur SANS Permissions API pour la géoloc — Safari
   * — `checkForegroundPermission` répond TOUJOURS `undetermined`, même après un
   * accord. La position n'était donc PLUS JAMAIS tentée à l'ouverture et le
   * joueur Safari ne se voyait JAMAIS sur sa carte, alors qu'il avait autorisé.
   *
   * On ne rétablit PAS la demande automatique pour autant. On distingue deux
   * `undetermined` qui n'ont rien à voir :
   *   • état LISIBLE et `undetermined` → on ne t'a vraiment rien demandé
   *     (`unasked`), et on ne demande pas ;
   *   • état ILLISIBLE (Safari) → « je ne sais pas ». Là, et là seulement, on
   *     consulte la mémoire d'accord de l'origine (`hasProvenGrant` : cette
   *     origine a DÉJÀ rendu un fix, donc le navigateur a déjà accordé, donc la
   *     lecture n'ouvrira pas d'invite). Sans cette preuve : `unasked`.
   * Une première visite Safari reste donc muette et sans invite ; c'est le geste
   * (Recentrer, ou le premier GO) qui déclenche la demande, comme annoncé.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const permission = await checkForegroundPermission();
      if (cancelled) return;
      // « Je peux lire une position sans ouvrir d'invite » — accord lisible, OU
      // état illisible mais accord DÉJÀ prouvé sur cette origine.
      const safeToRead =
        permission.status === 'granted' ||
        (permission.status === 'undetermined' &&
          !isPermissionStateReadable() &&
          hasProvenGrant());
      if (!safeToRead) {
        setLocationState(permission.status === 'denied' ? 'denied' : 'unasked');
        return;
      }
      // `resolveLocation` ne demandera rien quand la permission est accordée, et
      // rien non plus quand l'origine l'a déjà obtenue — on réutilise la séquence
      // testée plutôt que d'en réécrire une deuxième à la main.
      const outcome = await resolveLocation({
        checkForegroundPermission,
        requestForegroundPermission,
        getCurrentPositionOnce,
      });
      if (cancelled) return;
      // Chacune des issues pose un état : plus AUCUNE sortie silencieuse.
      setLocationState(outcome.state);
      if (outcome.point) setEgoPos(outcome.point);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Caméra d'OUVERTURE déclarative : `undefined` = vue neutre monde côté RealMap,
   * honnête tant qu'on ne sait pas où est le joueur.
   */
  const openCamera = useMemo(
    () => (egoPos ? { ...EGO_CAMERA, lat: egoPos.lat, lng: egoPos.lng } : undefined),
    [egoPos],
  );

  /** Emphase des familles de couches selon le mode actif (AMENDEMENT-11 §3). */
  const emph = MODE_EMPHASIS[mode];

  /** Fond de carte persisté (défaut sombre) — dark-first, bascule opt-in. */
  const { basemap, toggle } = useBasemapStyle();

  /**
   * Labels en langue LOCALE — PARITÉ NATIVE (le correctif « la map est en
   * anglais » n'existait que sur iPhone : localhost affichait Munich/Vienna là
   * où le device affiche München/Wien, et le fondateur en concluait que le
   * correctif n'avait pas été livré). Même mécanique : on précharge les styles
   * CARTO patchés (name_en → name), et on REMONTE la carte via sa `key` quand la
   * spec localisée est prête — un swap à chaud perdrait les couches de jeu.
   */
  const specRev = useSyncExternalStore(
    subscribeBasemapSpecs,
    basemapSpecRevision,
    basemapSpecRevision,
  );
  useEffect(() => {
    prefetchLocalizedBasemaps();
  }, []);

  /**
   * Vue 2D/3D persistée (AMENDEMENT-26, défaut false = 2D) — partagée par toutes
   * les surfaces via gryd.map3d. Passée en `mode3d` à RealMap (pitch/extrusion de
   * convenance) et au HUD, qui porte le toggle dans le menu Calques (pas un FAB).
   * Pur confort visuel — zéro impact gameplay (le serveur décide du claim).
   */
  const { map3d, setMap3d } = useMap3d();

  /**
   * Couches GeoJSON de jeu (ordre = ordre de peinture) — builder partagé. Sur
   * le fond COULEUR, battleGameLayers ajoute le liseré sombre porteur sous les
   * traits chartreuse (lisibilité — charte).
   */
  /**
   * P0.2 (AMENDEMENT-39) — LES VRAIES CAPTURES, à parité stricte avec la variante
   * native : `territories` non-null ⇒ on peint `hex_claims` (même vide : la carte
   * dit le vide au lieu d'inventer un Paris conquis) ; null ⇒ démo ÉTIQUETÉE.
   */
  // Crew réel — PARITÉ NATIVE (§C). Sans ce roster, `buildTerritories` classait
  // les zones de MES COÉQUIPIERS en 'rival' : localhost peignait en ORANGE ce
  // que l'iPhone peint en CHARTREUSE. Set mémoïsé sur le CONTENU (join trié) :
  // useRealCrew renvoie un nouveau tableau à chaque fetch, et un Set par
  // référence relancerait la lecture hex_claims à chaque rendu.
  const {
    members: crewMembers,
    crew: myCrew,
    loading: crewLoading,
    loadFailed: crewFailed,
  } = useRealCrew();
  const crewIdsKey = crewMembers
    .map((m) => m.userId)
    .sort()
    .join(',');
  const crewIds = useMemo(
    () => (crewIdsKey.length === 0 ? null : new Set(crewIdsKey.split(','))),
    [crewIdsKey],
  );

  // ─── SECTEURS §C : la carte lit le VRAI `sector_snapshot` (parité native) ──
  // `viewerResolved` : sait-on QUI regarde ? Le rôle d'un secteur (chartreuse
  // moi / orange rival / violet contesté) se calcule contre MON identité ; tant
  // que la lecture du crew est en vol, une couleur peinte serait peut-être la
  // mauvaise — donc un mensonge. On ne peint alors rien.
  // Mais un ÉCHEC de cette lecture se transmet SÉPARÉMENT (`crewFailed`) : sans
  // ça il se confondait avec « en vol », et comme `useRealCrew` ne repasse pas
  // son `loadFailed` à false tout seul, la carte restait en chargement pour toute
  // la session de l'écran — un cul-de-sac muet au lieu d'un échec énoncé.
  const { session: mapSession } = useSession();
  const viewerResolved = !crewLoading && !crewFailed;
  const { status: sectorStatus, sectors: sectorRows } = useSectorSnapshots(viewerResolved, crewFailed);
  const viewerUserId = mapSession?.user.id ?? null;
  const viewerCrewId = myCrew?.id ?? null;
  const sectorViews = useMemo(
    () =>
      sectorViewsFor(sectorRows ?? [], {
        userId: viewerUserId,
        crewId: viewerCrewId,
        resolved: viewerResolved,
      }),
    [sectorRows, viewerUserId, viewerCrewId, viewerResolved],
  );
  const { territories, isReal, failed, signedOut, loading, reload } =
    useRealTerritories(crewIds);
  // P0 C5 (MVP_CHANGESET) — reload() n'était consommé par PERSONNE : après une
  // course qui capture, la carte ne montrait la zone qu'au redémarrage (le
  // refetch ne tenait qu'au remontage accidentel de la navigation). Ici : refetch
  // à CHAQUE retour sur l'onglet Carte — donc au retour de course-result — en
  // sautant le premier focus (le hook fetch déjà au montage, pas de doublon).
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      reload();
    }, [reload]),
  );
  /**
   * WIDGET « Mon territoire » (spec 17/07) — construit UNIQUEMENT depuis des
   * données RÉELLES : territoires lus de hex_claims + dernier verdict serveur
   * (openBoundary → boucle presque fermée ; capture → moment de partage).
   * Les signaux sans source réelle (attaque, zone perdue, crew, rang) restent
   * ÉTEINTS — on ne fabrique pas une urgence. Démo (pas de session) ⇒ null ⇒
   * le peek mission démo actuel, étiqueté par la note de source.
   */
  const widget = useMemo(() => {
    if (!isReal || territories === null) return null;
    const lastResult = getLastRunResult();
    const ob = lastResult?.openBoundary;
    return buildRealWidgetView({
      mineAreasM2: territories
        .filter((t) => t.props.status === 'crew')
        .map((t) => t.props.areaM2),
      openBoundary: ob ? { name: ob.name, missingM: ob.missingM } : null,
      capturedInLastRun: lastResult
        ? lastResult.hexes.claimed + lastResult.hexes.stolen + lastResult.hexes.pioneer > 0
        : false,
    },
    // Parité native : sans `locale`, le peek du HUD parlait français à tout le
    // monde (défaut de buildRealWidgetView).
    locale);
  }, [isReal, territories, locale]);

  /** Routage de l'action du widget : partage → /partage ; le reste → la carte. */
  const onWidgetAction = useCallback((view: TerritoryWidgetView) => {
    if (view.action === 'share') {
      router.push('/partage');
      return;
    }
    // go / view_map / complete… : la carte EST l'écran d'action (GO flottant).
    // Sans position connue on ne vole nulle part (jamais un retour vers Paris).
    if (!egoPos) return;
    mapRef.current?.flyTo({ ...EGO_CAMERA, lat: egoPos.lat, lng: egoPos.lng });
  }, [egoPos]);

  /**
   * `territories` null (pas de session, lecture en vol) ne doit PAS retomber sur
   * la démo : `[]` force battleGameLayers à peindre le RÉEL — donc rien. Ce
   * `?? []` est le dernier verrou entre la carte et le faux Paris conquis de
   * `fakeHexes` : ne pas le retirer. Parité stricte avec la variante native.
   */
  const paintedTerritories = territories ?? [];
  const layers = useMemo(
    () =>
      battleGameLayers(
        emph,
        selectedParcours,
        basemap,
        selectedZoneId,
        paintedTerritories,
        sectorViews,
      ),
    [emph, selectedParcours, basemap, selectedZoneId, paintedTerritories, sectorViews],
  );
  /**
   * Calques-points des secteurs (% de contrôle + badge de statut), bornés par
   * zoom. Vides tant qu'il n'y a rien de réel à dire — ce qui est le cas
   * aujourd'hui en production (0 capture ⇒ 0 secteur snapshoté).
   */
  const sectorLayers = useMemo(() => sectorPointLayers(sectorViews, locale), [sectorViews, locale]);

  /** Tap carte → zone tapée (null sur le vide = désélection). */
  const onMapPress = useCallback((e: RealMapPressEvent) => {
    setSelectedZoneId(e.zoneId ?? null);
  }, []);
  /** Fermer la sheet de zone → carte nue (retour au peek mission). */
  const closeZone = useCallback(() => setSelectedZoneId(null), []);

  // Les dots de villes conquises (territoryDotLayers) sortaient de la démo :
  // retirés. Aucune agrégation RÉELLE par ville n'existe (`city_id` est NULL sur
  // toute capture — cf. hexClaims.ts), donc rien à peindre au dézoom.

  const markers = useMemo(() => buildMarkers(egoPos), [egoPos]);

  /**
   * O1 — ÉTAT VIDE du HUD (mêmes trois cas que `dataNote`, même ordre de priorité
   * pour que la note du bas et le peek ne se contredisent jamais). `null` = on ne
   * sait pas encore : le peek se tait plutôt que d'affirmer quoi que ce soit.
   */
  // `signedOut` et non `!isReal` : `isReal` est faux AUSSI pendant le chargement,
  // donc un joueur connecté lisait « Pas encore connecté » le temps de la requête.
  // `loading` passe AVANT tout le reste : restauration de session ou lecture en
  // vol ⇒ on n'affirme RIEN (un état de chargement n'est pas un état vide).
  const emptyState: MapEmptyState | null = loading
    ? null
    : failed
      ? 'failed'
      : signedOut
        ? 'signed-out'
        : territories !== null && territories.length === 0
          ? 'empty'
          : null;

  const onEmptyAction = useCallback(() => {
    if (failed) {
      reload();
      return;
    }
    router.push('/(auth)/sign-in');
  }, [failed, reload]);

  /** Zone tapée → VRAIE zone (hex_claims), jamais les étiquettes de ZONE_DETAILS. */
  const selectedZone: MapZoneView | null = useMemo(() => {
    if (selectedZoneId === null || territories === null) return null;
    const found = territories.find((t) => t.props.territoryId === selectedZoneId);
    if (!found) return null;
    return {
      role: found.props.status === 'crew' ? 'mine' : 'rival',
      zones: found.zoneCount,
      areaKm2: found.props.areaM2 / 1_000_000,
    };
  }, [selectedZoneId, territories]);

  /** Instance maplibre-gl de CETTE carte (échelle scopée — §6). */
  const [glMap, setGlMap] = useState<MapLibreMap | null>(null);

  // map_load_ms (§8) — du montage au premier rendu de la carte (parité native).
  const mountedAtRef = useRef<number>(Date.now());
  const loadTrackedRef = useRef(false);
  useEffect(() => {
    if (loadTrackedRef.current) return;
    loadTrackedRef.current = true;
    track(EVENTS.mapLoadMs, { ms: Date.now() - mountedAtRef.current });
  }, []);

  /**
   * La PHRASE d'état de la carte, dans la langue du joueur (parité native).
   * Priorité : localisation refusée > pas de compte > les 3 cas de `dataNote`.
   */
  /** §A — la pill se tait quand le peek du HUD porte déjà l'état vide (et son
   *  action) : deux fois le même message pour une seule situation, c'est un de
   *  trop. Elle ne parle plus que de l'état de la LOCALISATION. */
  const hudCarriesEmptyState = widget === null && emptyState !== null;
  /** Parité native : les quatre états de localisation ont chacun leur phrase. */
  const locationNote =
    // CINQ états, CINQ phrases — parité stricte avec la variante native.
    // `unasked` empruntait celle de `denied` : « Active la localisation pour te
    // voir » imputait un refus à un joueur à qui on n'avait rien demandé, et
    // désignait en prime la mauvaise issue (les réglages du navigateur, alors
    // qu'un simple tap sur Recentrer suffit ici).
    locationState === 'unasked'
      ? resolve(C.dataNoteLocationUnasked, locale)
      : locationState === 'denied'
        ? resolve(C.dataNoteLocationDenied, locale)
        : locationState === 'unavailable'
          ? resolve(
              egoPos ? C.dataNoteLocationStale : C.dataNoteLocationUnavailable,
              locale,
            )
          : locationState === 'locating'
            ? resolve(C.dataNoteLocating, locale)
            : null;
  const mapNote =
    locationNote ??
    (loading || hudCarriesEmptyState
      ? null
      : // Plus aucune démo n'est peinte : la note dit « pas connecté », jamais
        // « démonstration » (le paramètre `demoPainted` a disparu avec la vitrine).
        dataNote(isReal, failed, territories?.length ?? 0, locale)) ??
    // DERNIÈRE priorité (§A : la pill ne porte qu'UNE phrase) — l'échec de
    // lecture des SECTEURS, qui n'est PAS « aucun secteur ». Parité native.
    (sectorStatus === 'error' ? resolve(C.sectorNoteFailed, locale) : null);

  /**
   * Recentrer — et JAMAIS un bouton mort (parité native). On vole vers la
   * dernière position connue si elle existe, puis on relance une acquisition
   * complète. Chacune des trois issues pose un état VISIBLE : c'est ce qui
   * manquait (`if (!fix) return` rendait l'appui strictement invisible).
   */
  const recenter = () => {
    if (egoPos) mapRef.current?.flyTo({ ...EGO_CAMERA, lat: egoPos.lat, lng: egoPos.lng });
    setLocationState('locating');
    void (async () => {
      const outcome = await resolveLocation({
        checkForegroundPermission,
        requestForegroundPermission,
        getCurrentPositionOnce,
      });
      setLocationState(outcome.state);
      if (!outcome.point) return;
      setEgoPos(outcome.point);
      mapRef.current?.flyTo({ ...EGO_CAMERA, lat: outcome.point.lat, lng: outcome.point.lng });
    })();
  };

  return (
    <View style={styles.root}>
      {/* ── Vraies tuiles MONDE + couches de jeu + markers (RealMap) ──
          `key={basemap}` : setStyle() MapLibre EFFACE les sources/couches
          custom ; on remonte donc la carte à chaque bascule → l'effet `load`
          réajoute les couches de jeu sur le nouveau style (robuste). */}
      {/* `key` : setStyle() MapLibre EFFACE les sources/couches custom — on
          remonte donc la carte à chaque bascule de fond ET à chaque arrivée
          d'une spec localisée (specRev), pour que l'effet `load` réajoute les
          couches de jeu sur le nouveau style. Parité stricte avec le natif. */}
      <RealMap
        key={`${basemap}-${specRev}`}
        ref={mapRef}
        camera={openCamera}
        geojsonLayers={layers}
        pointLayers={sectorLayers}
        markers={markers}
        onPress={onMapPress}
        onMapReady={setGlMap}
        attributionCompact={false}
        basemap={basemap}
        mode3d={map3d}
        style={StyleSheet.absoluteFill}
        testID="battle-map-reelle"
      />

      {/* ── NOTE D'HONNÊTETÉ (P0.2/P0.3, parité stricte avec la variante native) — même règle que performance.tsx et
          classement.tsx : si ce n'est pas ta donnée, on le DIT. TROIS cas distincts,
          jamais confondus :
          • échec de chargement → on ne prétend PAS que tu n'as rien capturé ;
          • démo (pas de session/backend) → étiquetée, jamais de faux réel ;
          • réel et vide → on nomme le vide au lieu de le laisser passer pour un bug.
          Aucun CTA (§A — 1 écran = 1 décision, le bouton GO est déjà l'action). ── */}
      {mapNote !== null && (
        <Text
          style={[
            styles.dataNote,
            { bottom: insets.bottom + RUN_BUTTON_BOTTOM + DATA_NOTE_ABOVE_RUN_BOTTOM },
          ]}
          accessibilityRole="text"
        >
          {mapNote}
        </Text>
      )}

      {/* ── Échelle MapLibre stylée tokens + attribution (au-dessus de la nav) ── */}
      <ScaleAttribution
        map={glMap}
        basemap={basemap}
        bottom={insets.bottom + RUN_BUTTON_BOTTOM + SCALE_ABOVE_RUN_BOTTOM}
      />

      {/* ── HUD ÉCRAN MISSION (header 1 ligne, pill rival, card sticky + [Défendre],
          sheet 4 blocs, 2 FABs : Recentrer + Calques) — AMENDEMENT-21 ── */}
      <BattleMapOverlays
        widget={widget}
        onWidgetAction={onWidgetAction}
        emptyState={emptyState}
        onEmptyAction={onEmptyAction}
        zone={selectedZone}
        mode={mode}
        onSelectMode={setMode}
        onRecenter={recenter}
        selectedParcoursId={selectedParcours}
        selectedZoneId={selectedZoneId}
        onCloseZone={closeZone}
        basemap={basemap}
        onToggleBasemap={toggle}
        map3d={map3d}
        onSetMap3d={setMap3d}
      />
    </View>
  );
}

/** Point « moi » : dot chartreuse cerclé blanc + halo STATIQUE (AMENDEMENT-37 §5
 * « une seule animation permanente » : le halo ego ne pulse plus — l'unique
 * pulse permanent est réservé au secteur le plus urgent, géré ailleurs). */
function EgoMarker() {
  const halo = usePulse(false, 1.3, EGO_PULSE_MS);
  const haloOpacity = halo.interpolate({ inputRange: [1, 1.3], outputRange: [0.4, 0.05] });
  return (
    <View pointerEvents="none" style={styles.ego}>
      <Animated.View
        style={[styles.egoHalo, { opacity: haloOpacity, transform: [{ scale: halo }] }]}
      />
      <View style={styles.egoDot} />
    </View>
  );
}

/**
 * Échelle graphique PILOTÉE PAR MAPLIBRE (remplace la barre 500 m fixe) :
 * même principe que le ScaleControl (distance réelle d'un segment écran au
 * centre de la vue, palier « rond » ≤ SCALE_MAX_PX), rendue en tokens GRYD.
 * L'instance carte arrive par la prop `map` (onMapReady de RealMap.web) —
 * l'échelle est SCOPÉE à SA carte, jamais de sélecteur DOM global (§6 :
 * plusieurs cartes peuvent être montées en même temps, aperçu Profil +
 * onglet Carte). Attribution DÉRIVÉE du fond actif (basemapAttribution) accolée
 * — © OpenStreetMap © CARTO sur dark/color, © Esri, Maxar, Earthstar
 * Geographics sur satellite (AMENDEMENT-28). Le bas de la carte est couvert par
 * la sheet/nav, la mention doit rester VISIBLE (obligation légale).
 */
function ScaleAttribution({
  map,
  basemap,
  bottom,
}: {
  map: MapLibreMap | null;
  basemap: BasemapKey;
  bottom: number;
}) {
  const [scale, setScale] = useState<{ width: number; label: string } | null>(null);

  useEffect(() => {
    if (!map) return undefined;
    const onMove = () => {
      const midY = map.getContainer().clientHeight / 2;
      const a = map.unproject([0, midY]);
      const b = map.unproject([SCALE_PROBE_PX, midY]);
      const latRad = (((a.lat + b.lat) / 2) * Math.PI) / 180;
      const meters = Math.hypot(
        (b.lng - a.lng) * REAL_M_PER_DEG_LAT * Math.cos(latRad),
        (b.lat - a.lat) * REAL_M_PER_DEG_LAT,
      );
      if (!(meters > 0)) return;
      const mPerPx = meters / SCALE_PROBE_PX;
      let step: number = SCALE_STEPS_M[0] ?? 100;
      for (const candidate of SCALE_STEPS_M) {
        if (candidate / mPerPx <= SCALE_MAX_PX) step = candidate;
      }
      const width = step / mPerPx;
      const label = step >= 1_000 ? `${step / 1_000} km` : `${step} m`;
      setScale((prev) =>
        prev && prev.label === label && Math.abs(prev.width - width) < 1 ? prev : { width, label },
      );
    };
    map.on('move', onMove);
    onMove();
    return () => {
      map.off('move', onMove);
    };
  }, [map]);

  return (
    <View pointerEvents="none" style={[styles.scaleWrap, { bottom }]}>
      {scale ? (
        <>
          <View style={[styles.scaleLine, { width: scale.width }]} />
          <Text style={styles.scaleLabel}>{scale.label}</Text>
        </>
      ) : null}
      <Text style={styles.attribution} accessibilityRole="text">
        {basemapAttribution(basemap)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  ego: {
    width: EGO_HALO_SIZE,
    height: EGO_HALO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  egoHalo: {
    position: 'absolute',
    width: EGO_HALO_SIZE,
    height: EGO_HALO_SIZE,
    borderRadius: EGO_HALO_SIZE / 2,
    backgroundColor: colors.chartreuse14,
    borderWidth: 1.5,
    borderColor: colors.chartreuse40,
  },
  egoDot: {
    width: EGO_DOT_SIZE,
    height: EGO_DOT_SIZE,
    borderRadius: EGO_DOT_SIZE / 2,
    backgroundColor: colors.chartreuse,
    borderWidth: 2,
    borderColor: colors.blanc,
  },
  scaleWrap: { position: 'absolute', left: 14 },
  scaleLine: {
    height: 4,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: ms.scaleBar,
    opacity: 0.7,
  },
  scaleLabel: {
    color: ms.scaleBar,
    fontSize: 9,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  attribution: { color: colors.gris, opacity: 0.7, fontSize: 9, marginTop: 2 },
  // Jamais chartreuse : réservée à l'action, et illisible sur fond clair (charte).
  dataNote: { position: 'absolute', left: 14, right: 14, color: colors.gris, fontSize: 11 },
});

export default MapScreen;
