/**
 * GRYD — BATTLE MAP, variante NATIVE. AMENDEMENT-13 §2/§4/§4bis/§4ter :
 * PARITÉ avec MapScreen.web — mêmes vraies tuiles sombres MONDE ENTIER
 * (RealMap natif = @maplibre/maplibre-react-native, même styleURL dark),
 * mêmes SOURCES de jeu (battleGameLayers, alimenté par les VRAIES captures
 * `hex_claims` — §4ter : la frontière EST le tracé, zéro hexagone visible),
 * même caméra (EGO_CAMERA au premier fix, vue neutre monde avant),
 * navigation MONDE libre (aucun maxBounds, aucun minZoom). Les labels secteurs
 * custom ont disparu : les tuiles réelles portent les noms de quartiers.
 * Recentrer = flyTo ego. Offline : RealMap natif affiche « Carte indisponible
 * — tes zones restent à toi ».
 *
 * ─── FIN DU MODE VITRINE (décision fondateur 21/07/2026) ─────────────────────
 * Cet écran ne peint plus AUCUNE donnée fabriquée, sur aucune plateforme.
 * Ont disparu avec `isShowcasePlatform` : les marqueurs de scénario (POI
 * Villemin, défi, avant-poste, bouclier, sablier, objectif, alliés opt-in), les
 * dots de villes conquises (territoryDotLayers) et la caméra République par
 * défaut. Avec eux disparaît l'étagement des marqueurs par bande de zoom
 * (§6/§11) : il n'existait QUE pour doser ces marqueurs de démo. Il reviendra
 * tel quel le jour où une source RÉELLE (missions serveur, alliés opt-in) les
 * nourrit — le LOD est une réponse à un volume, pas une décoration.
 * Reste peint : les tuiles, les couches dérivées de `hex_claims`, et le point
 * « moi » quand — et seulement quand — un vrai fix GPS existe.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import {
  RealMap,
  usePulse,
  type RealMapMarker,
  type RealMapPressEvent,
  type RealMapRef,
} from '../../ui/game';
import { NAV_BAR_HEIGHT } from '../nav/metrics';
import {
  BattleMapOverlays,
  type MapEmptyState,
  type MapZoneView,
} from './BattleMapOverlays';
import { useMapSheetLayout } from './mapUiStore';
import { useRealTerritories } from './hexClaims';
import { useSectorSnapshots } from './useSectorSnapshots';
import { sectorViewsFor } from './sectorView';
import { competitiveReadAllowed } from '../../ui/activityLens';
import { selectZoneView } from './zoneSelection';
import { zoneFocusLat } from './zoneFocus';
import { sectorPointLayers } from './allTerritories';
import { useSession } from '../../lib/session';
import { cityCenter } from '../social/cities';
import { useOnboardingState } from '../onboarding/store';
import { useRealCrew } from '../crew/real';
import { getLastRunResult } from '../run/runResult';
import { buildRealWidgetView, type TerritoryWidgetView } from '../widget/territoryWidget';
import { dataNote } from './territoryBuild';
import { C } from '../../i18n/catalog/map';
import { useLocale } from '../../i18n/store';
import { resolve } from '../../i18n/types';
import {
  basemapAttribution,
  basemapSpecRevision,
  battleGameLayers,
  prefetchLocalizedBasemaps,
  subscribeBasemapSpecs,
} from './mapStyle';
import { useBasemapStyle, useMap3d, useMapActivity } from './mapPref';
import { CITY_SCALE_ZOOM, EGO_CAMERA, type LatLngPoint } from './realAnchors';
import { DEFAULT_MAP_MODE, MODE_EMPHASIS, type MapMode } from './territory';
import { type MapLocationState, resolveLocation } from './locationState';
import {
  checkForegroundPermission,
  getCurrentPositionOnce,
  requestForegroundPermission,
} from '../run/gps/provider';

/**
 * Les états de `locationState.ts`, PLUS celui que seul l'écran connaît :
 * `unasked` — la permission n'a jamais été DEMANDÉE, parce que l'ouverture de la
 * carte ne la demande plus (voir l'effet de montage). `resolveLocation`, elle,
 * ne peut pas produire cet état : elle décrit l'issue d'une tentative COMPLÈTE.
 * Ce n'est ni `denied` (personne n'a refusé), ni `unavailable` (aucun capteur
 * n'a été interrogé), ni `locating` (rien n'est en cours) — les confondre serait
 * précisément le mensonge que locationState.ts a supprimé.
 */
type MapScreenLocationState = MapLocationState | 'unasked';

// ─── Constantes de rendu (UI uniquement — mêmes valeurs que la variante web) ─
/** Pulse du halo « moi » (position live, respiration lente). */
const EGO_PULSE_MS = 2_000;
/** Point « moi » (dot chartreuse cerclé) + halo. */
const EGO_DOT_SIZE = 14;
const EGO_HALO_SIZE = 40;
/**
 * L'attribution flotte au-dessus du PEEK de la sheet (obligation légale : elle
 * ne doit jamais finir masquée). Depuis que la sheet est COLLÉE au bas (planche
 * E02), son ancre n'est plus `RUN_BUTTON_BOTTOM` mais le haut du peek, publié
 * par BattleMapOverlays (`useMapSheetLayout`). Sans sheet visible, elle retombe
 * au ras de la barre d'onglets.
 */
const ATTRIBUTION_ABOVE_SHEET = 6;
/** La note d'honnêteté (P0.2) se pose juste au-dessus de l'attribution. */
const DATA_NOTE_ABOVE_SHEET = 22;

// AMENDEMENT-21 : la Carte est un ÉCRAN MISSION. Les contrôles flottants (fond
// dark/couleur + calques de lecture) vivent DANS le menu « Calques » du HUD
// (BattleMapOverlays) — plus aucun FAB de bascule de fond ici (2 FABs max :
// Recentrer + Calques). Le fond persisté (useBasemapStyle) est simplement passé
// au HUD, qui porte le menu (parité stricte avec MapScreen.web).

/**
 * Markers RealMap de la scène. Il n'en reste qu'UN, et c'est délibéré : « moi »,
 * peint UNIQUEMENT quand un vrai fix GPS existe. `ego` null (pas encore de fix,
 * refus, ou capteur muet) = AUCUN point — un dot posé sur un lieu inventé serait
 * précisément le mensonge remonté du terrain (« je suis en Normandie, l'app me
 * met à République »).
 *
 * Les marqueurs de scénario (POI, défi, avant-poste, bouclier, sablier,
 * objectif, alliés opt-in) ont été retirés avec le mode vitrine : ils sortaient
 * tous de `demo.ts`/`fakeHexes.ts`. Ils reviendront quand une source serveur les
 * portera — pas avant.
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
   * POSITION RÉELLE (retour terrain fondateur 20/07 : « quand je démarre il met
   * encore à République » alors qu'il court en Normandie).
   *
   * L'ancienne version initialisait egoPos à EGO_CAMERA (République) et passait
   * `camera={EGO_CAMERA}` en dur : la carte OUVRAIT donc sur Paris — un lieu
   * inventé présenté comme la position du joueur.
   *
   * Contrat actuel, sur TOUTES les plateformes : `null` tant qu'aucun VRAI fix
   * n'est arrivé. Aucune position par défaut, donc AUCUN point « moi » et
   * AUCUNE caméra Paris — la carte ouvre sur la vue neutre monde de RealMap
   * (camera undefined) et se cadre sur le joueur DÈS le premier fix.
   */
  const [egoPos, setEgoPos] = useState<LatLngPoint | null>(null);
  /**
   * Ce que la carte SAIT de la localisation — et donc ce qu'elle a le droit de
   * dire. Quatre états distincts (locationState.ts), là où il n'y avait qu'un
   * booléen `locationDenied` : « recherche en cours » n'est pas « refusé », et
   * « introuvable » (localisation OS coupée, GPS froid, timeout) n'est pas
   * « refusé » non plus. C'est cette confusion qui produisait le cul-de-sac
   * muet : permission accordée + fix absent ⇒ `if (!fix) return` ⇒ aucun point,
   * aucun message, et un bouton Recentrer sans effet visible.
   */
  const [locationState, setLocationState] = useState<MapScreenLocationState>('locating');
  /** Langue courante — la carte doit parler comme le reste de l'app. */
  const locale = useLocale();
  /**
   * OUVERTURE DE LA CARTE — ON NE DEMANDE RIEN (corrigé le 21/07/2026).
   *
   * Cet effet appelait `resolveLocation({ …, requestForegroundPermission })` AU
   * MONTAGE. Or `resolveLocation` DEMANDE la permission dès qu'elle n'est pas
   * accordée et que `canAskAgain` : la boîte système d'iOS tombait donc à
   * l'ouverture de l'onglet Carte — c'est-à-dire dans la seconde qui suit la
   * sortie de l'onboarding, sans contexte et sans que rien ne l'ait annoncée.
   *
   * Deux textes du produit disaient pourtant l'inverse, et ce sont eux qui font
   * foi puisque le joueur les lit : `learnNote` (« …quand le GPS s'allume au
   * départ ») et l'entête de `onboarding/content.ts`, qui justifie la
   * SUPPRESSION de l'écran `permission` par « la vraie demande vit au premier GO
   * (useRealRun.acquireNative) ». C'était faux : la carte gagnait la course.
   * Plutôt que de corriger la doc pour acter un comportement que personne n'a
   * choisi, on corrige le CODE — la demande retourne au moment annoncé.
   *
   * Au montage, la carte se contente donc de LIRE la permission :
   *   • déjà accordée   → on cherche un fix (aucune boîte, l'OS ne redemande pas) ;
   *   • refus explicite → `denied`, la carte le dit ;
   *   • jamais demandée → `unasked` : on n'affirme ni refus ni recherche.
   *
   * Les deux moments qui DEMANDENT vraiment restent, et sont tous deux des
   * gestes du joueur : le bouton Recentrer (plus bas) et le premier GO
   * (`useRealRun.acquireNative`). Aucun bouton mort : Recentrer déclenche bien
   * la boîte quand la permission n'a jamais été demandée.
   */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const permission = await checkForegroundPermission();
      if (cancelled) return;
      if (permission.status !== 'granted') {
        setLocationState(permission.status === 'denied' ? 'denied' : 'unasked');
        return;
      }
      // Permission déjà accordée : `resolveLocation` ne demandera rien (elle ne
      // demande que si le statut n'est pas `granted`) — on réutilise la séquence
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
   * La ville CHOISIE à la main pendant l'onboarding — lecture seule ici. C'est
   * la seule chose que la carte lui emprunte, et elle ne sert qu'à CADRER.
   */
  const { state: onboarding } = useOnboardingState();

  /**
   * Caméra d'OUVERTURE, DÉCLARATIVE — trois niveaux, dans cet ordre et jamais un
   * autre :
   *   1. la position RÉELLE du joueur, dès qu'un fix existe ;
   *   2. à défaut, le centre de la ville qu'il a CHOISIE à la main pendant
   *      l'onboarding (23/07/2026) ;
   *   3. à défaut, la vue neutre monde de RealMap (`undefined`).
   *
   * ⚠️ L'ORDRE EST LE FOND DU SUJET. Une ville DÉCLARÉE ne doit jamais écraser
   * une position MESURÉE : c'est exactement le bug de terrain corrigé le 20/07
   * (« quand je démarre il met encore à République » alors qu'il courait en
   * Normandie). Et ce cadrage n'affirme RIEN : il déplace un point de vue, il ne
   * peint aucune zone, aucun propriétaire, aucun classement. Sans ville choisie
   * ni fix, on garde la vue monde — qui dit la vérité (« je ne sais pas encore
   * où tu es ») plutôt que de poser le joueur quelque part.
   */
  const chosenCity = cityCenter(onboarding.cityId);
  const openCamera = useMemo(
    () =>
      egoPos
        ? { ...EGO_CAMERA, lat: egoPos.lat, lng: egoPos.lng }
        : chosenCity
          ? { lat: chosenCity.lat, lng: chosenCity.lng, zoom: CITY_SCALE_ZOOM }
          : undefined,
    [egoPos, chosenCity?.lat, chosenCity?.lng],
  );

  /** Emphase des familles de couches selon le mode actif (AMENDEMENT-11 §3). */
  const emph = MODE_EMPHASIS[mode];

  /** Fond de carte persisté (défaut sombre) — dark-first, bascule opt-in. */
  const { basemap, toggle } = useBasemapStyle();

  /**
   * LENTILLE Run / Bike (planche E14), persistée.
   *
   * ─── LE MODE BIKE EST ROUVERT (fondateur, 26/07/2026) ──────────────────────
   * Jusqu'au 26/07 cette lentille VIDAIT l'écran : `geojsonLayers` et
   * `pointLayers` forcés à `[]`, widget muet, tap désarmé, état vide supprimé.
   * C'était juste tant que `hex_claims` ne savait parler que de course à pied.
   * Ça ne l'est plus : la colonne `activity` existe en base (0070, appliquée le
   * 25/07) et la lecture est désormais BORNÉE à la lentille
   * (`useRealTerritories(crewIds, activity)`). Le vélo a donc SES zones, et les
   * peindre n'est plus une fabrication : c'est la seule chose vraie à montrer.
   *
   * CE QUI RESTE BORNÉ À LA LENTILLE PAR DÉFAUT, ET POURQUOI : les SECTEURS.
   * `sector_snapshot` a encore une clé primaire `sector_id` SEUL (migration
   * 0037) et il est alimenté par des vues NON disciplinées (`sector_holdings`
   * 0061, `sector_activity` 0040) : ses pourcentages de contrôle mélangent
   * réellement les deux mondes. Les peindre sous une étiquette vélo serait la
   * somme que la planche E14 interdit. La règle n'est pas écrite à la main ici,
   * elle est DÉRIVÉE de `competitiveReadAllowed(activity, sourceIsDisciplined)`
   * — le jour où une migration 0071 discipline la table, un seul `true` les
   * rouvre dans les deux mondes.
   */
  const { activity } = useMapActivity();
  /** Les secteurs sont-ils lisibles sous CETTE lentille ? (source mono-pot) */
  const sectorsReadable = competitiveReadAllowed(activity, false);

  /**
   * Labels en langue LOCALE (retour terrain : « la map est en anglais ») : on
   * précharge les styles CARTO patchés (name_en→name) et on REMONTE la carte
   * (via sa key) quand la spec localisée est prête — un swap à chaud perdrait
   * les couches de jeu. En pratique : un seul remontage, dans les toutes
   * premières secondes de la session.
   */
  const specRev = useSyncExternalStore(subscribeBasemapSpecs, basemapSpecRevision, basemapSpecRevision);
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
   * P0.2 (AMENDEMENT-39) — LES VRAIES CAPTURES. `territories` non-null ⇒ la carte
   * peint `hex_claims`, la démo n'est plus consultée. Y compris quand c'est VIDE :
   * un joueur qui n'a rien capturé voit une carte vide, pas un faux Paris conquis.
   */
  // Crew réel 2/3 : le roster actif teinte les zones des membres en chartreuse
  // (§C « moi/mon crew » — l'union visuelle du territoire crew). Set mémoïsé sur
  // le CONTENU (join trié) : useRealCrew retourne un nouveau tableau par fetch,
  // un Set par référence relancerait la lecture hex_claims à chaque focus.
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

  // ─── SECTEURS §C : la carte lit le VRAI `sector_snapshot` ──────────────────
  // `viewerResolved` : sait-on QUI regarde ? Le rôle d'un secteur (chartreuse
  // moi / orange rival / violet contesté) se calcule contre MON identité ; tant
  // que la lecture du crew est en vol, une couleur peinte serait peut-être la
  // mauvaise — donc un mensonge. Dans ce cas on ne peint rien.
  // Mais un ÉCHEC de cette lecture se transmet SÉPARÉMENT (`crewFailed`) : sans
  // ça il se confondait avec « en vol », et comme `useRealCrew` ne repasse pas
  // son `loadFailed` à false tout seul, la carte restait en chargement pour
  // toute la session de l'écran — un cul-de-sac muet au lieu d'un échec énoncé.
  const { session: mapSession } = useSession();
  const viewerResolved = !crewLoading && !crewFailed;
  const { status: sectorStatus, sectors: sectorRows } = useSectorSnapshots(viewerResolved, crewFailed);
  const viewerUserId = mapSession?.user.id ?? null;
  const viewerCrewId = myCrew?.id ?? null;
  const sectorViews = useMemo(
    () =>
      // Source MONO-POT : hors lentille par défaut, on ne rend RIEN plutôt que
      // des pourcentages qui somment les deux disciplines (cf. `sectorsReadable`).
      sectorsReadable
        ? sectorViewsFor(sectorRows ?? [], {
            userId: viewerUserId,
            crewId: viewerCrewId,
            resolved: viewerResolved,
          })
        : [],
    [sectorRows, viewerUserId, viewerCrewId, viewerResolved, sectorsReadable],
  );
  const { territories, isReal, failed, signedOut, loading, reload } =
    useRealTerritories(crewIds, activity);
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
    // Le widget lit MES captures DE LA LENTILLE COURANTE : `territories` est
    // déjà borné à la discipline, donc il dit la vérité dans les deux mondes.
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
    // `locale` manquait : buildRealWidgetView retombait sur son défaut 'fr' et
    // le peek du HUD parlait français à un joueur en de/es/pt/en, alors même que
    // la note d'honnêteté juste en dessous, elle, était traduite.
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
   * JAMAIS de territoires démo : `null` ferait peindre à battleGameLayers le faux
   * Paris conquis de `fakeHexes`. On passe donc toujours un tableau — `[]` tant
   * qu'on n'a rien lu — soit une carte réelle VIDE (P0.2 : « un joueur qui n'a
   * rien capturé voit une carte vide »). Ce `?? []` est le dernier verrou entre
   * la carte et la démo : ne pas le retirer.
   */
  const paintedTerritories = territories ?? [];
  const layers = useMemo(
    () =>
      // ROUVERT LE 26/07/2026 : les couches de jeu existent dans les DEUX
      // mondes. `paintedTerritories` vient d'une lecture bornée à la lentille,
      // et `sectorViews` est déjà vide hors lentille par défaut — donc aucune
      // couche ne peut porter la donnée de l'autre discipline.
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
  const sectorLayers = useMemo(
    () => sectorPointLayers(sectorViews, locale),
    [sectorViews, locale],
  );

  /** Tap carte → zone tapée (null sur le vide = désélection). Actif dans les
   *  DEUX lentilles : chacune peint ses propres zones depuis le 26/07/2026. */
  const onMapPress = useCallback((e: RealMapPressEvent) => {
    setSelectedZoneId(e.zoneId ?? null);
  }, []);
  /** Fermer la sheet de zone → carte nue (retour au peek mission). */
  const closeZone = useCallback(() => setSelectedZoneId(null), []);

  // Les dots de villes conquises (territoryDotLayers) venaient de FRANCE_CITIES_DEMO :
  // retirés avec la vitrine. Aucune agrégation RÉELLE par ville n'existe encore
  // (`city_id` est NULL sur toute capture — cf. hexClaims.ts), donc rien à peindre
  // au dézoom : la carte montre le monde nu plutôt qu'un palmarès inventé.

  const markers = useMemo(() => buildMarkers(egoPos), [egoPos]);

  // map_load_ms (§8 santé produit) — du montage au premier rendu (parité web).
  const mountedAtRef = useRef<number>(Date.now());
  const loadTrackedRef = useRef(false);
  useEffect(() => {
    if (loadTrackedRef.current) return;
    loadTrackedRef.current = true;
    track(EVENTS.mapLoadMs, { ms: Date.now() - mountedAtRef.current });
  }, []);

  // Recentrer : retour ego fluide (flyTo — saut direct si reduce motion). Sur
  // natif on RAFRAÎCHIT d'abord la position (l'utilisateur a pu se déplacer).
  /**
   * La PHRASE d'état de la carte, dans la langue du joueur. `dataNote` reçoit
   * enfin `locale` : sans elle il renvoyait du français à tout le monde (son
   * défaut) — l'i18n 5 langues s'arrêtait à la porte de la carte.
   * Priorité : localisation refusée (on ne sait pas où tu es et on le DIT) >
   * pas de compte > les 3 cas historiques de dataNote.
   */
  /**
   * O1 — ÉTAT VIDE du HUD. Hors vitrine, le peek mission démo (« République sous
   * pression · Canal Crew reprend du terrain ») ne s'affiche plus : le HUD reçoit
   * l'état RÉEL et écrit la phrase juste. Les trois cas sont ceux de `dataNote`,
   * dans le même ordre de priorité, pour que la pill du bas et le peek ne se
   * contredisent jamais. `null` = on ne sait pas encore (lecture en cours) : le
   * peek ne dit RIEN plutôt qu'une phrase démentie une seconde plus tard.
   */
  // `signedOut` et non `!isReal` : `isReal` est faux AUSSI pendant le chargement,
  // donc un joueur connecté lisait « Pas encore connecté » le temps de la requête.
  // `loading` passe AVANT tout le reste : restauration de session ou lecture en
  // vol ⇒ on n'affirme RIEN (un état de chargement n'est pas un état vide).
  // En Bike, aucun de ces trois états ne s'applique : ils décrivent la lecture
  // des zones de COURSE À PIED. Le peek Bike parle à leur place (E14).
  const emptyState: MapEmptyState | null = loading
    ? null
    : failed
      ? 'failed'
      : signedOut
        ? 'signed-out'
        : territories !== null && territories.length === 0
          ? 'empty'
          : null;

  /** « Se connecter » / « Réessayer » — la seule action de l'état vide. */
  const onEmptyAction = useCallback(() => {
    if (failed) {
      reload();
      return;
    }
    router.push('/(auth)/sign-in');
  }, [failed, reload]);

  /**
   * Zone tapée → VRAIE zone (hex_claims + sector_snapshot). `territoryId` est la
   * clé produite par buildTerritories, donc la même que celle portée par les
   * couches : un tap retrouve exactement la forme peinte. Introuvable ⇒ null ⇒
   * pas de sheet (jamais un repli sur des étiquettes de scénario).
   * La dérivation vit dans `selectZoneView` (module pur, testé), PARTAGÉE avec
   * la variante web — parité structurelle plutôt que deux copies à surveiller.
   */
  const selectedZone: MapZoneView | null = useMemo(
    () => selectZoneView(territories, sectorViews, selectedZoneId),
    [selectedZoneId, territories, sectorViews],
  );

  /**
   * §A — 1 écran = 1 décision : quand le peek du HUD porte DÉJÀ l'état vide (sa
   * phrase ET son action), la pill n'a plus rien à ajouter — la répéter à 2 cm
   * d'écart, c'est deux fois le même message pour une seule situation. Elle se
   * tait alors, et ne parle plus que pour ce que le peek ne dit pas : l'état de
   * la LOCALISATION (refusée, introuvable, en cours de recherche).
   */
  const hudCarriesEmptyState = widget === null && emptyState !== null;
  /**
   * La PHRASE unique du bas de carte. La LOCALISATION passe devant : c'est la
   * seule chose que le peek du HUD ne dit jamais, et c'est ce qui explique une
   * carte cadrée sur le monde entier. Les quatre états de `locationState` ont
   * chacun leur phrase — y compris `unavailable`, qui n'existait pas et dont
   * l'absence produisait le cul-de-sac muet.
   */
  const locationNote =
    // CINQ états, CINQ phrases (21/07/2026). `unasked` empruntait celle de
    // `denied` : « Active la localisation pour te voir » imputait un refus à un
    // joueur à qui on n'avait rien demandé. Les deux états n'ont d'ailleurs pas
    // la même ISSUE — `denied` se rouvre par les réglages système, `unasked` par
    // UN geste ici (Recentrer, ou le premier GO) — donc pas la même phrase.
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
    // Lecture en cours : on ne dit RIEN du territoire (ni « pas connecté », ni
    // « aucune zone ») tant qu'on n'a pas la réponse. En Bike non plus : la note
    // parle des zones de COURSE À PIED, la localisation seule reste pertinente.
    (loading || hudCarriesEmptyState
      ? null
      : // Plus aucune démo n'est peinte : la note dit « pas connecté », jamais
        // « démonstration » (le paramètre `demoPainted` a disparu avec la vitrine).
        dataNote(isReal, failed, territories?.length ?? 0, locale, activity)) ??
    // DERNIÈRE priorité (§A : la pill ne porte qu'UNE phrase) — l'échec de
    // lecture des SECTEURS. Il ne parle que si la localisation et les
    // territoires n'ont rien à dire, mais il parle : « secteurs non chargés »
    // n'est pas « aucun secteur », et se taire laisserait croire que personne ne
    // tient rien. Les états 'empty' / 'signedOut' / 'loading' des secteurs, eux,
    // sont déjà couverts par la note de territoire — les répéter serait deux
    // phrases pour une seule situation.
    (sectorsReadable && sectorStatus === 'error'
      ? // Hors lentille par défaut, AUCUN secteur n'est peint (source mono-pot) :
        // annoncer « secteurs non chargés » y serait un bruit sur une couche que
        // l'écran ne montre de toute façon pas — une phrase qui ne mène à rien.
        resolve(C.sectorNoteFailed, locale)
      : null);

  /**
   * Recentrer — et JAMAIS un bouton mort. On vole d'abord vers la dernière
   * position connue si elle existe, puis on relance une acquisition complète
   * (l'utilisateur a pu se déplacer, ou refuser puis accepter). Chacune des
   * trois issues pose un état visible : c'est ce qui manquait (`if (!fix) return`
   * rendait l'appui strictement invisible).
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

  /**
   * ANCRE BASSE des mentions flottantes. La sheet est désormais COLLÉE au bas
   * (planche E02) : s'accrocher à `RUN_BUTTON_BOTTOM` les enverrait DERRIÈRE
   * elle. On lit donc le haut de son PEEK (ancre stable, publiée au snap) et on
   * retombe au ras de la barre d'onglets quand aucune sheet n'est montée.
   *
   * Pourquoi le PEEK et pas le palier COURANT : l'attribution doit être LISIBLE
   * au repos, et c'est ce que garantit une ancre fixe. La suivre jusqu'au palier
   * 90 % la pousserait sous la barre d'état — et de toute façon la sheet, rendue
   * après elle, la recouvrirait. Un panneau que l'utilisateur DÉPLOIE lui-même
   * masque temporairement le bas de la carte : c'est le comportement attendu
   * d'une sheet, et il se défait d'un geste.
   */
  const sheetLayout = useMapSheetLayout();

  /**
   * E04 — CADRAGE de la zone tapée AU-DESSUS de la sheet (« la caméra la cadre
   * au-dessus du sheet »). C'était LE delta visuel manquant : jusqu'ici le tap
   * allumait la zone et atténuait le reste, mais la caméra ne bougeait pas, si
   * bien qu'une zone tapée en bas d'écran finissait derrière la sheet.
   *
   * Le décalage est un CALCUL, pas un réglage : `flyTo` n'accepte ni padding ni
   * offset, donc on déplace la latitude du centre de la moitié de la bande
   * occupée par la sheet (fonction pure `zoneFocusLat`, testée en Deno).
   *
   * La clé de garde inclut la hauteur de bande : au tap, la sheet de zone n'est
   * pas encore montée et le HUD publie encore la hauteur du peek mission — le
   * cadrage se corrige tout seul dès qu'elle a publié la sienne, puis ne rejoue
   * plus (on ne vole pas le geste du joueur qui déplace ensuite la carte).
   */
  const zoneFramedRef = useRef<string | null>(null);
  const zoneBand = sheetLayout.visible ? Math.round(sheetLayout.peekTopPx) : 0;
  useEffect(() => {
    if (selectedZoneId === null) {
      zoneFramedRef.current = null;
      return;
    }
    const center = selectedZone?.center;
    // Sans centre réel on ne vole NULLE PART (jamais un retour vers Paris).
    if (!center) return;
    const key = `${selectedZoneId}:${zoneBand}`;
    if (zoneFramedRef.current === key) return;
    zoneFramedRef.current = key;
    const zoom = EGO_CAMERA.zoom;
    mapRef.current?.flyTo({
      lng: center.lng,
      lat: zoneFocusLat({ lat: center.lat, zoom, sheetHeightPx: zoneBand }),
      zoom,
    });
  }, [selectedZoneId, selectedZone, zoneBand]);
  const noteAnchor = sheetLayout.visible
    ? sheetLayout.peekTopPx
    : insets.bottom + NAV_BAR_HEIGHT;

  return (
    <View style={styles.root}>
      {/* ── Vraies tuiles MONDE + couches de jeu + markers (RealMap) ──
          `key={basemap}` : parité web — on remonte la carte à chaque bascule
          (un simple changement de mapStyle ne réajouterait pas les couches). */}
      <RealMap
        key={`${basemap}-${specRev}`}
        ref={mapRef}
        camera={openCamera}
        geojsonLayers={layers}
        pointLayers={sectorLayers}
        markers={markers}
        onPress={onMapPress}
        attributionCompact={false}
        basemap={basemap}
        mode3d={map3d}
        style={StyleSheet.absoluteFill}
        testID="battle-map-reelle"
      />

      {/* ── NOTE D'HONNÊTETÉ (P0.2/P0.3) — même règle que performance.tsx et
          classement.tsx : si ce n'est pas ta donnée, on le DIT. TROIS cas distincts,
          jamais confondus :
          • échec de chargement → on ne prétend PAS que tu n'as rien capturé ;
          • démo (pas de session/backend) → étiquetée, jamais de faux réel ;
          • réel et vide → on donne l'ACTION, qui dit le vide sans le laisser passer
            pour un bug.
          Aucun CTA (§A — 1 écran = 1 décision, le bouton GO est déjà l'action) : la
          pill est une PHRASE, pas un bouton (pointerEvents none, aucun tap). ── */}
      {mapNote !== null && (
        <View
          style={[styles.dataNote, { bottom: noteAnchor + DATA_NOTE_ABOVE_SHEET }]}
          pointerEvents="none"
        >
          <Text
            style={styles.dataNoteText}
            numberOfLines={1}
            adjustsFontSizeToFit
            accessibilityRole="text"
          >
            {mapNote}
          </Text>
        </View>
      )}

      {/* ── Attribution relogée au-dessus de la nav (obligation légale) —
          dérivée du fond actif : © OpenStreetMap © CARTO sur dark/color, ©
          Esri, Maxar, Earthstar Geographics sur satellite (AMENDEMENT-28). ── */}
      <Text
        style={[styles.attribution, { bottom: noteAnchor + ATTRIBUTION_ABOVE_SHEET }]}
        accessibilityRole="text"
      >
        {basemapAttribution(basemap)}
      </Text>

      {/* ── HUD ÉCRAN MISSION (header 1 ligne, pill rival, card sticky + [Défendre],
          sheet 4 blocs, 2 FABs : Recentrer + Calques) — AMENDEMENT-21 ── */}
      <BattleMapOverlays
        widget={widget}
        onWidgetAction={onWidgetAction}
        emptyState={emptyState}
        onEmptyAction={onEmptyAction}
        zone={selectedZone}
        egoPos={egoPos}
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
        activity={activity}
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
  attribution: {
    position: 'absolute',
    left: 14,
    color: colors.gris,
    opacity: 0.7,
    fontSize: 9,
  },
  // Note d'honnêteté : une PILL centrée, pas un bandeau pleine largeur (retour
  // terrain « le bloc est trop large »). Même famille que styles.pendingNote de
  // l'onglet Aujourd'hui. Largeur = celle du texte, plafonnée à 86 % : elle ne
  // s'étire jamais d'un bord à l'autre et ne masque pas la carte. Blanc sur
  // carbone (jamais chartreuse : réservée à l'action, et illisible sur clair).
  dataNote: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '86%',
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.grisLigne,
  },
  dataNoteText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
  },
});

export default MapScreen;
