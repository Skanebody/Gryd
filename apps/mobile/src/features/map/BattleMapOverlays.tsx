/**
 * GRYD — la Carte comme ÉCRAN MISSION, révisée par AMENDEMENT-37 §3/§8 (étude
 * marché 2026). Règle absolue : 1 écran = 1 carte, 1 décision, 1 CTA à la fois.
 *
 * AMENDEMENT-37 §8 (révise -25/-29) — **2 FABs MAX** (Couches + Recentrer, plus
 * de 3ᵉ FAB « Info ») et une **bottom sheet peek PERSISTANTE de la mission**
 * (§6.3 : « République sous pression · 3 zones · 4,4 km ») qui surface aussi le
 * rival SANS tap (§26.2). Le peek se déplie sur les options (parcours / équipe /
 * détails). Le gros CTA de mission vit sur le bouton d'action FLOTTANT
 * (AMENDEMENT-29) — le peek n'en duplique pas (anti double-CTA §A.4).
 *
 * AMENDEMENT-37 §3/§10 — **TAP → ZONE** : taper une zone (RealMap onPress →
 * `selectedZoneId`, contrat C2/C3) REMPLACE temporairement le peek mission par
 * la **sheet de LA zone** : propriétaire (VRAI crew, pastille de RÔLE), contrôle
 * %, tenue, surface, défendue il y a X, PRESSION (top rival % + neutre %),
 * ACTIVITÉ 24 H (agrégée, jamais localisée), ACTION RECOMMANDÉE + 1 CTA, « Plus »
 * (détail hors 1er niveau → historique). Fermer → carte nue + retour au peek
 * mission. Les données viennent d'un modèle démo (ZONE_DETAILS, demo.ts) —
 * étiquettes Paris/Lille/Lyon, ZÉRO ranking européen fabriqué ; le CLAIM reste
 * tranché SERVEUR (on n'AFFICHE que des étiquettes).
 *
 * PLANCHE E02 (retour fondateur 25/07/2026) — la sheet est désormais ANCRÉE :
 * collée juste au-dessus de la barre d'onglets (plus de trou de 91 px), pleine
 * largeur, poignée visible, TIRABLE au geste vers 52 % puis 90 % de l'ÉCRAN avec
 * accrochage (`MapAnchoredSheet` + géométrie pure `sheetSnap.ts`). Le CONTENANT
 * change ; la VÉRITÉ du contenu (territoire non chargé / vide / lecture en cours
 * / pas connecté) est strictement conservée.
 *
 * PLANCHE E14 — commutateur Run/Bike : la prop `activity` choisit la LENTILLE.
 * En Bike, l'écran n'affiche AUCUN territoire, AUCUNE mission, AUCUN classement
 * (le vélo n'existe pas encore sous l'écran) — le peek Bike le DIT.
 *
 * ─── UN SEUL RÉCIT DOMINANT (retour fondateur 25/07/2026) ────────────────────
 * « Pas de next best action clair », « jamais plusieurs récits concurrents »,
 * « Active la localisation pour te voir n'est pas assez : l'utilisateur a besoin
 * d'une action dirigée ». Le choix du contenu de la sheet n'est donc plus une
 * cascade de ternaires écrite ici : il vient de `mapPlan` (locationState.ts),
 * fonction PURE et testée qui tranche pour CHAQUE combinaison
 * (permission × lentille × données) quel est LE récit et quelle est SON action.
 * Ce fichier ne fait plus que rendre la décision — et la même décision alimente
 * la barre haute de `app/(tabs)/index.tsx`, ce qui rend structurellement
 * impossible que les deux surfaces racontent deux histoires différentes.
 *
 * Trois états de position deviennent AGISSANTS (E02 « position indisponible /
 * permission refusée ») : « jamais demandé » → Activer ma position (geste →
 * `resolveLocation`), « refusé » → réglages système (natif ; sur web on explique
 * sans peindre de bouton, aucune API n'y mène), « introuvable » → Réessayer.
 * Le chargement, lui, ne dit RIEN : skeleton dans la sheet, aucun spinner plein
 * écran, aucune phrase démentie une seconde plus tard.
 *
 * Vocabulaire TERRITOIRES ORGANIQUES (zones/frontières/rues — jamais hexagone).
 * Anti pay-to-win : le serveur tranche territoire et récompenses ; km/pts/% sont
 * des labels de scénario (demo.ts). Reduce motion respecté (snap direct de la
 * sheet). Haptics à chaque intention. Partagé MapScreen natif ↔ .web (parité).
 * Events : screen('map_sheet_open') (options mission) / screen('map_zone_open')
 * (sheet de zone) / screen('map_zone_details') (« Plus ») / screen('map_zone_act').
 */
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  clearMapSheetLayout,
  setMapHudHidden,
  setMapSheetLayout,
  setZoneSheetOpen,
  useMapHudHidden,
} from './mapUiStore';
import {
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  // Plancher tactile du projet (`sizes.touchTarget`) : il était RECOPIÉ en 44 en
  // quatre points de ce fichier — §A exige le token, pas le nombre. Un plancher
  // recopié ne suit pas la charte quand elle bouge, et rien ne le relie au
  // gabarit qu'il est censé garantir.
  sizes,
  // Rôle typographique des TITRES d'écran des planches (Inter Tight 700, 28 px) :
  // le nom de zone E04 le consomme désormais, au lieu d'un titre de 16 px.
  typography,
  withAlpha,
  DEFAULT_ACTIVITY,
} from '@klaim/shared';
import { C } from '../../i18n/catalog/map';
import { C as N } from '../../i18n/catalog/nav';
import { useLocale, useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import { EVENTS, screen, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { Map3DToggle } from '../../ui/game';
import { NAV_BAR_HEIGHT } from '../nav/metrics';
import { MapAnchoredSheet } from './MapAnchoredSheet';
import { mapSheetStops, type MapSheetStop } from './sheetSnap';
import { type MapActivity } from './mapPref';
// Provider de position RÉSOLU PAR PLATEFORME (Metro sert `locate.web.ts` sur
// web). On l'emprunte à l'onboarding plutôt que d'importer `run/gps/provider`
// ici : ce module tire `expo-task-manager`, sans support web, et cet écran-ci est
// partagé natif ⇄ web (cf. l'en-tête de `webGeolocation.ts`).
import { LOCATION_CAPABLE, LOCATION_PROVIDER } from '../onboarding/locate';
import {
  mapPlan,
  resolveLocation,
  type MapAccessState,
  type MapDataState,
  type MapPlan,
} from './locationState';
import { BASEMAP_KEYS, type BasemapKey } from './mapStyle';
import type { TerritoryWidgetView } from '../widget/territoryWidget';
import { MAP_MODE_ICON, MAP_MODE_ORDER, type MapMode } from './territory';
import { SheetMetrics, type SheetMetric } from './SheetMetrics';
import { MissionBriefingSheet } from './MissionBriefingSheet';
// LES DEUX CIBLES DE DÉPART DE CET ÉCRAN, en PUR et testées (features/route/
// startTargets.ts) : elles portent la déclaration de discipline, exactement
// comme `withStartActivity` la porte pour le GO.
import { missionStartHref, plannerHref } from '../route/startTargets';
import { resolveSectorName } from './sectorNaming';
import type { LatLngPoint } from './realAnchors';
import {
  areaStatParts,
  briefMetricKeys,
  briefSheetHeight,
  daysSinceCapture,
  zoneMetricKeys,
  zoneSheetHeight,
  type BriefRouteState,
  type ZoneMetricKey,
} from './zoneDecision';

/*
 * `Translate` (la signature de useT passée aux helpers) est partie avec
 * `zonesLabel`, son dernier consommateur : plus aucun helper de ce fichier ne
 * reçoit `t` en paramètre, les composants l'appellent directement.
 */

/**
 * Libellés AFFICHÉS des calques : « Raid » devient « Rival » à l'écran
 * (AMENDEMENT-12 §A — la clé interne `raid` de territory.ts ne change pas).
 * Entries de catalogue résolues à l'affichage (t) — les libellés fr de
 * MAP_MODE_LABELS restent la clé interne, plus jamais un texte d'écran.
 */
const MODE_CHIP_ENTRIES: Record<MapMode, Entry> = {
  territoire: C.modeTerritoire,
  route: C.modeRoute,
  defense: C.modeDefense,
  raid: C.modeRival,
  exploration: C.modeExploration,
  crew: C.modeCrew,
};

/**
 * Couleur d'icône par mode/rôle : chaque calque devient identifiable À LA
 * COULEUR (façon Waze) : territoire/route = chartreuse (moi), défense = bleu
 * bouclier, rival = orange, exploration = or. Tokens de jeu uniquement.
 */
const MODE_COLOR: Record<MapMode, string> = {
  territoire: gameColors.crew,
  route: gameColors.crew,
  defense: gameColors.verify,
  raid: gameColors.rival,
  exploration: gameColors.gold,
  // Lentille Crew : ton du crew/allié = la chartreuse (moi/crew), rôle « on joue ensemble ».
  crew: gameColors.crew,
};

/**
 * FOND de carte (AMENDEMENT-28) — 3 options du menu Calques, libellés COURTS non
 * tronqués (« Satellite » dit ce que c'est — vraies photos aériennes).
 * Entries de catalogue — résolues à l'affichage (t).
 */
const BASEMAP_ENTRIES: Record<BasemapKey, Entry> = {
  dark: C.basemapDark,
  color: C.basemapLight,
  satellite: C.basemapSatellite,
};
/** Icône par fond : réutilise le jeu d'icônes EXISTANT (le libellé fait foi). */
const BASEMAP_ICON: Record<BasemapKey, 'carte' | 'calques'> = {
  dark: 'carte',
  color: 'carte',
  satellite: 'calques',
};

/** Pile de FABs : dégagement au-dessus de la sheet visible. */
const FAB_ABOVE_SHEET = 12;
/**
 * Hauteur du PEEK MISSION persistant (§8) : titre + méta + rival + lien options.
 * Calée AU PLUS JUSTE sur le contenu réel (poignée 18 + bloc info ~118) pour ne
 * PAS laisser de vide sous « Voir les options » — le peek épouse son contenu, la
 * carte reste le cœur. (Était 168 → ~30 px de vide sous le lien.)
 */
const MISSION_PEEK_COMPACT_HEIGHT = 138;
/** Espace du HUD haut à préserver (secteur + ligne mission) — le menu Calques ne
 *  descend jamais son bord haut au-dessus de cette limite (anti-chevauchement). */
const TOP_HUD_CLEARANCE = 112;
/** Hauteur de la pile de FABs PERMANENTS (2 cellules au plancher tactile + 1 gap
 *  de 10 + marge) — réserve l'espace sous le menu Calques pour qu'il ne recouvre
 *  pas la pile. La hauteur d'une cellule vient du TOKEN, pas d'un 44 recopié :
 *  sinon la réserve mentirait à la première évolution du gabarit. */
const FAB_STACK_HEIGHT = 2 * sizes.touchTarget + 10 + 6;
/*
 * Les deux hauteurs DEVINÉES de la sheet de zone (132 / 132+62) ont disparu :
 * E04 ajoute des lignes qui APPARAISSENT ou DISPARAISSENT selon la disponibilité
 * réelle de leur source, et une constante en dur produisait alors soit du texte
 * sous la ligne de flottaison (§A9), soit une bande carbone vide (§A). La
 * hauteur se DÉDUIT désormais de ce qui est rendu — `zoneSheetHeight` /
 * `briefSheetHeight` (zoneDecision.ts, pures et testées).
 */
/**
 * Hauteur de l'ÉTAT VIDE (titre + phrase, + lien d'action quand il y en a un).
 * Deux valeurs : sans CTA le peek se resserre au lieu de laisser un vide qui se
 * lirait comme un écran cassé.
 */
const EMPTY_PEEK_HEIGHT = 104;
const EMPTY_PEEK_WITH_CTA_HEIGHT = 140;
// Le peek BIKE et sa hauteur dédiée (BIKE_PEEK_HEIGHT = 190) ont été RETIRÉS le
// 26/07/2026 : il n'existait que pour dire « GRYD ne chronomètre pas encore le
// vélo » et pour offrir la seule action alors vraie (revenir en Run). Le vélo
// enregistre désormais, donc la lentille Bike montre exactement la même sheet
// que la lentille Run — territoire quand il y en a, état vide sinon. Un panneau
// spécial pour un monde devenu ordinaire aurait continué à le désigner comme
// une exception.
/**
 * Hauteurs du peek de POSITION. Trois formes, parce que trois contenus :
 * sans action (refus sur web : on explique, on ne peint pas de bouton mort),
 * avec le bouton, et avec le bouton + le lien « Ouvrir les réglages ».
 * La phrase peut tenir sur 3 lignes en allemand : le budget les prévoit.
 */
const LOCATION_PEEK_HEIGHT = 180;
const LOCATION_PEEK_NO_ACTION_HEIGHT = 126;
const LOCATION_PEEK_WITH_LINK_HEIGHT = 230;
/** Skeleton de chargement (E02) : deux barres neutres, aucune affirmation. */
const SKELETON_PEEK_HEIGHT = 100;

/**
 * La plateforme sait-elle ouvrir des RÉGLAGES SYSTÈME ? Sur web, non : aucune
 * API ne mène aux réglages du navigateur, et `Linking.openSettings` n'y existe
 * pas. On dérive donc l'affichage de la capacité RÉELLE — l'absence d'un bouton
 * n'est pas un mensonge, un bouton qui échoue à coup sûr en est un (§A4).
 *
 * `openLocationSettings` (features/run/gps/provider.ts) fait exactement ça, mais
 * son module tire `expo-task-manager` et ne doit JAMAIS entrer dans le bundle
 * web (cf. l'en-tête de `webGeolocation.ts`) — or cet écran est partagé. On
 * appelle donc `Linking.openSettings` directement, comme le font déjà
 * `app/course-live.tsx` et `app/parametres/[section].tsx`.
 */
const CAN_OPEN_SETTINGS = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * ÉTAT VIDE de la carte (O1 — vitrine OFF par défaut). Trois cas qui n'ont PAS
 * la même copie ni la même action ; les confondre serait remplacer un mensonge
 * par un autre (cf. `dataNote`, même discipline).
 */
export type MapEmptyState = 'signed-out' | 'empty' | 'failed';

// ═══════════════════════════════════════════════════════════════════════════
// CE QUE L'ÉCRAN SAIT DE LA POSITION — un état, DEUX surfaces disjointes.
//
// La sheet (ici) et la barre haute (app/(tabs)/index.tsx, frère de <MapScreen/>)
// doivent parler de la MÊME position. Un micro-store, comme les trois autres de
// `mapUiStore` et pour la même raison : deux sous-arbres qui ne se voient pas.
// UN SEUL ÉCRIVAIN — ce fichier — pour qu'aucune divergence ne soit possible.
//
// ⚠️ CE STORE NE DEMANDE JAMAIS RIEN TOUT SEUL. Au montage il LIT la permission
// (`checkForegroundPermission` : aucune boîte système, ni sur iOS ni dans le
// navigateur). La DEMANDE ne part que d'un geste — le bouton « Activer ma
// position » de la sheet, la barre haute, ou Recentrer. C'est la promesse tenue
// depuis le 21/07 (« la vraie demande vit au premier geste »), et l'ouverture de
// la Carte ne doit pas la reprendre.
// ═══════════════════════════════════════════════════════════════════════════

/** Ce que les deux surfaces lisent : l'état, et si une tentative est en vol. */
export interface MapAccessView {
  access: MapAccessState;
  /** Tentative EXPLICITE en cours (geste du joueur) — verrouille son bouton. */
  pending: boolean;
}

let accessView: MapAccessView = { access: 'unknown', pending: false };
const accessListeners = new Set<() => void>();

function publishAccess(next: MapAccessView): void {
  if (accessView.access === next.access && accessView.pending === next.pending) return;
  accessView = next;
  for (const listener of accessListeners) listener();
}

function subscribeAccess(listener: () => void): () => void {
  accessListeners.add(listener);
  return () => {
    accessListeners.delete(listener);
  };
}

function getAccessSnapshot(): MapAccessView {
  return accessView;
}

/** État de position partagé par la sheet et la barre haute (lecture seule). */
export function useMapAccess(): MapAccessView {
  return useSyncExternalStore(subscribeAccess, getAccessSnapshot, getAccessSnapshot);
}

/**
 * LECTURE non intrusive de la permission. Trois issues, et la troisième est le
 * point délicat :
 *  • refus explicite   → `denied` (fait dur : il gagne toujours, même après un
 *                        fix réussi — le joueur a pu couper la permission dans
 *                        les réglages puis revenir dans l'app) ;
 *  • jamais demandée   → `unasked` (un geste ici suffit) ;
 *  • ACCORDÉE          → `locating`, PAS `unavailable`. On ne sait pas d'ici si
 *                        un fix est arrivé — MapScreen mène sa propre acquisition
 *                        — et affirmer « introuvable » pendant qu'elle cherche
 *                        serait un chargement déguisé en échec. `unavailable`
 *                        n'est écrit QUE lorsqu'on a vu NOTRE tentative échouer.
 */
async function probeAccess(): Promise<void> {
  // Aucun capteur derrière le bouton (navigateur sans géolocalisation, rendu
  // serveur) : on ne peint AUCUN état de position. L'absence d'un bouton n'est
  // pas un mensonge, un bouton qui échoue à coup sûr en est un (§A4).
  if (!LOCATION_CAPABLE) return;
  if (accessView.pending) return;
  const permission = await LOCATION_PROVIDER.checkForegroundPermission();
  const next: MapAccessState =
    permission.status === 'denied'
      ? 'denied'
      : permission.status === 'granted'
        ? 'locating'
        : 'unasked';
  // Ne JAMAIS défaire un fix réel : sur Safari, `checkForegroundPermission`
  // répond `undetermined` même après un accord (pas de Permissions API pour la
  // géoloc). Sans cette garde, un joueur qui SE VOIT sur la carte lirait
  // « Position inconnue · Activer » — le mislabel Safari, revenu par la fenêtre.
  if (next !== 'denied' && accessView.access === 'ok') return;
  publishAccess({ access: next, pending: false });
}

/**
 * LA TENTATIVE, déclenchée par un GESTE. Elle demande la permission si besoin
 * (c'est le moment annoncé), cherche un fix, et POSE l'issue — c'est ce qui rend
 * `unavailable` affirmable : on l'a observé, on ne l'a pas déduit.
 *
 * `onFix` n'est appelé QUE sur succès : il rend la main à la carte (vol vers le
 * joueur + acquisition côté MapScreen). Sur échec on ne l'appelle pas — relancer
 * une seconde séquence qui vient d'échouer ne ferait qu'attendre pour rien.
 */
async function attemptLocation(onFix?: () => void): Promise<void> {
  if (!LOCATION_CAPABLE || accessView.pending) return;
  publishAccess({ access: accessView.access, pending: true });
  const outcome = await resolveLocation(LOCATION_PROVIDER);
  publishAccess({ access: outcome.state, pending: false });
  if (outcome.state === 'ok') onFix?.();
}

/**
 * La vue d'une VRAIE zone tapée vit dans `zoneSelection.ts` (module PUR), avec
 * la fonction qui la dérive : les DEUX MapScreen (natif et web) la partagent, ce
 * qui rend leur divergence structurellement impossible. Ré-exportée ici pour les
 * importeurs historiques.
 */
export type { MapZoneView } from './zoneSelection';
import type { MapZoneView } from './zoneSelection';

/*
 * `zonesLabel` (« 3 zones ») a disparu avec la ligne concaténée
 * « À un rival · 3 zones · 0,42 km² » : E04 rend désormais un BLOC DE MÉTRIQUES
 * à séparateurs, où la valeur (« 3 ») et son libellé (« Zones ») sont deux
 * niveaux typographiques distincts. Les entrées zonesOne/zonesMany restent au
 * catalogue — d'autres surfaces les utilisent.
 */

/*
 * `formatArea` a migré vers `zoneDecision.areaStatParts` (PURE + testée Deno) :
 * la planche compose « 0,42 » (gros) + « km² » (petit), le rendu a donc besoin
 * des deux morceaux SÉPARÉS, pas d'une chaîne « 0,42 km² » déjà collée.
 */

/**
 * NOM RÉEL du quartier d'une zone (planche E04 : « Quartier Saint-Rémy »).
 * Reverse-geocode OSM caché par secteur — le MÊME résolveur que le
 * planificateur, donc les deux écrans nomment un lieu de la même façon.
 *
 * DEUX GARDE-FOUS D'HONNÊTETÉ :
 *  · on passe NOTRE repli (le « Zone » traduit) : sans lui, `resolveSectorName`
 *    retomberait sur `gridFallbackLabel`, qui rend « Secteur 49,7N · 1,0E » en
 *    FRANÇAIS EN DUR (packages/shared) — du français affiché aux cinq langues ;
 *  · si le résolveur rend ce repli, on renvoie `null` : l'UI affiche alors son
 *    propre libellé neutre. Jamais un faux lieu, jamais une étiquette technique.
 */
function useResolvedZoneName(
  center: LatLngPoint | null,
  cacheKey: string | null,
  fallback: string,
): string | null {
  const [name, setName] = useState<string | null>(null);
  const lat = center?.lat ?? null;
  const lng = center?.lng ?? null;
  useEffect(() => {
    if (lat === null || lng === null || cacheKey === null) {
      setName(null);
      return;
    }
    let cancelled = false;
    // Remise à null AVANT la lecture : pendant la résolution la sheet affiche
    // son libellé neutre, jamais le nom du quartier PRÉCÉDEMMENT tapé.
    setName(null);
    void resolveSectorName({ lat, lng }, cacheKey, fallback)
      .then((resolved) => {
        if (!cancelled) setName(resolved === fallback ? null : resolved);
      })
      .catch(() => {
        // `resolveSectorName` ne lève pas ; ce catch est une ceinture de plus.
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, cacheKey, fallback]);
  return name;
}

/*
 * SUPPRIMÉS LE 21/07/2026 AVEC LE MODE VITRINE — et volontairement listés ici,
 * pour que personne ne les « restaure » en croyant réparer un trou :
 *   • MissionPeek      — « République sous pression · Canal Crew reprend du
 *                         terrain » : une mission ET un rival fabriqués.
 *   • SituationBlock   — parts de contrôle, directive bonus, horloge : aucune
 *                         donnée serveur ne les porte.
 *   • ZonePeek / ZoneDetailBlock / actionLine / ZONE_ROLE_TINT — la sheet de
 *                         zone alimentée par ZONE_DETAILS (propriétaire, %
 *                         rival, « 24 runs en 24 h »). La VRAIE sheet de zone
 *                         (RealZonePeek, dérivée de hex_claims) la remplace.
 * Leur retour passera par une source RÉELLE, pas par un fichier `*Demo`.
 */
export interface BattleMapOverlaysProps {
  /** Calque de carte actif (un seul à la fois) — AUTO par défaut (MapScreen). */
  mode: MapMode;
  onSelectMode: (mode: MapMode) => void;
  /** Retour ego fluide (anim caméra/scène côté écran) — bouton Recentrer. */
  onRecenter?: () => void;
  /** Parcours affiché en aperçu sur la carte (RouteProgress, progress 0). */
  /**
   * Aperçu de PARCOURS sur la carte. Plus aucune surface ne le SÉLECTIONNE
   * depuis la suppression de PARCOURS_DEMO (le seul sélecteur était une liste de
   * parcours fabriqués) ; la prop reste le point d'entrée du Route Planner, qui
   * porte de vrais itinéraires. Non alimentée aujourd'hui : c'est dit, pas caché.
   */
  selectedParcoursId?: string | null;
  /**
   * AMENDEMENT-37 §3 (contrat C2/C3) — zone tapée (RealMap onPress). `null` =
   * carte nue → le peek mission persistant est affiché ; non-null → la sheet de
   * CETTE zone remplace le peek. `onCloseZone` referme la sheet (retour au peek).
   */
  selectedZoneId?: string | null;
  onCloseZone?: () => void;
  /**
   * Fond de carte courant + sélection dans le menu Calques (3 fonds — Sombre /
   * Clair / Satellite). `onToggleBasemap(key)` fixe une valeur ; sans argument
   * il cycle (compat. `toggle` de mapPref).
   */
  basemap?: BasemapKey;
  onToggleBasemap?: (next?: BasemapKey) => void;
  /**
   * Vue 2D/3D courante (AMENDEMENT-26) + setter — pilotés par la pref
   * `gryd.map3d`. Le toggle vit DANS le menu Calques, PAS un FAB. Omis : pas de
   * toggle 3D.
   */
  map3d?: boolean;
  onSetMap3d?: (value: boolean) => void;
  /**
   * WIDGET « Mon territoire » (spec 17/07) — fourni par MapScreen quand les
   * DONNÉES RÉELLES existent (session + hex_claims lus). Absent/null ⇒ c'est
   * `emptyState` qui parle (le peek mission de démo n'existe plus). L'action du
   * widget est un LIEN (anti double-CTA §A.4 / AMENDEMENT-29 : le gros CTA reste
   * le bouton flottant).
   */
  widget?: TerritoryWidgetView | null;
  /** Tap sur l'action du widget (routage côté écran : partage, options…). */
  onWidgetAction?: (view: TerritoryWidgetView) => void;
  /**
   * ÉTAT VIDE HONNÊTE. Il n'existe AUCUNE mission, aucun rival, aucun parcours
   * réel : le peek de démo (« République sous pression · Canal Crew reprend du
   * terrain ») a été supprimé avec le mode vitrine. Quand `widget` est absent,
   * c'est cet état qui parle — jamais un trou, jamais la démo.
   * `null` = on ne sait pas ENCORE (lecture en cours) : la sheet se tait, elle
   * n'affirme pas « pas connecté » avant d'avoir la réponse.
   */
  emptyState?: MapEmptyState | null;
  /** Action de l'état vide : se connecter ('signed-out') / réessayer ('failed'). */
  onEmptyAction?: () => void;
  /**
   * VRAIE zone tapée (dérivée de `hex_claims` côté écran) : la SEULE source de
   * la sheet de zone depuis la suppression de `ZONE_DETAILS` (République, Quai
   * de Valmy, Lille Centre… — des étiquettes de scénario).
   */
  zone?: MapZoneView | null;
  /**
   * Position du joueur telle que la CARTE la connaît déjà (acquise par un
   * geste : Recentrer ou le premier GO). Consommée par le briefing E05 pour
   * router un VRAI tracé. `null` = inconnue : le briefing le DIT, et n'ouvre
   * surtout pas l'invite système de localisation à l'ouverture d'une sheet.
   */
  egoPos?: LatLngPoint | null;
  /**
   * LENTILLE de la carte (planche E14) — 'run' par défaut.
   *
   * ─── ROUVERTE LE 26/07/2026 ────────────────────────────────────────────────
   * Jusque-là, 'bike' VIDAIT ce HUD : sheet remplacée par un peek « pas encore
   * chronométré », menu Calques amputé de ses calques de lecture, sheet non
   * tirable, tap de zone désarmé, GO retiré. C'était juste tant que le vélo
   * n'existait pas sous l'écran. Il existe (décision fondateur : « il faut avoir
   * sa propre data, ses propres classements »), et l'écran lit maintenant les
   * captures de SA discipline.
   *
   * CE QUE CETTE PROP CHANGE ENCORE : uniquement la COPIE de l'état vide (le
   * monde vélo d'un joueur qui n'a jamais roulé se dit comme un DÉBUT, pas comme
   * l'absence d'une fonctionnalité). Tout le reste du HUD est identique dans les
   * deux mondes — c'est précisément ce que « les deux segments sont des pairs »
   * veut dire.
   */
  activity?: MapActivity;
}

export function BattleMapOverlays({
  mode,
  onSelectMode,
  onRecenter,
  selectedParcoursId: _selectedParcoursId = null,
  selectedZoneId = null,
  onCloseZone,
  basemap = 'dark',
  onToggleBasemap,
  widget = null,
  onWidgetAction,
  emptyState = null,
  onEmptyAction,
  zone = null,
  egoPos = null,
  map3d,
  onSetMap3d,
  activity = 'run',
}: BattleMapOverlaysProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  /** « Carte nue » : l'utilisateur a masqué tout le HUD (rangée du menu Calques). */
  const hudHidden = useMapHudHidden();
  /** Ce que l'écran sait de la position (store partagé avec la barre haute). */
  const { access, pending: locating } = useMapAccess();

  /**
   * LECTURE de la permission au montage, puis à CHAQUE retour en avant-plan :
   * c'est le seul moment où un refus peut avoir été levé (l'utilisateur revient
   * des réglages système). Sans ce second temps, le bouton « Ouvrir les
   * réglages » enverrait quelque part sans jamais constater le résultat.
   */
  useEffect(() => {
    void probeAccess();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void probeAccess();
    });
    return () => sub.remove();
  }, []);

  /**
   * Un fix RÉEL est arrivé (par n'importe quel chemin : premier GO, Recentrer,
   * acquisition d'ouverture de MapScreen) ⇒ l'état de position est `ok`, et plus
   * aucune surface ne réclame quoi que ce soit. C'est la seule écriture qui vient
   * d'une observation extérieure, d'où sa place ici plutôt que dans le store.
   */
  useEffect(() => {
    if (egoPos) publishAccess({ access: 'ok', pending: false });
  }, [egoPos]);
  /**
   * LENTILLE courante. Elle ne pilote plus qu'UNE chose ici : la COPIE de l'état
   * vide (cf. la doc de la prop `activity`). Les couches, la sheet, le tap et GO
   * sont les mêmes dans les deux mondes depuis le 26/07/2026.
   */
  // Peek MISSION persistant (§8) : `sheet.initial` distingue le PEEK (compact)
  // de l'état OUVERT (les options), remonté par « Voir les options » (remount
  // key + initialState — snap, façon reduce motion).
  const [sheet, setSheet] = useState<{ key: number }>({ key: 0 });
  /**
   * Palier ATTEINT par la sheet ancrée. Écrit au SNAP uniquement (jamais par
   * frame) : c'est lui qui pilote le morph du bouton GO — pill au-dessus de la
   * nav quand la sheet est compacte, rond ancré au bord haut de la sheet quand
   * elle est déployée (planche E02).
   */
  const [sheetStop, setSheetStop] = useState<{ stop: MapSheetStop; heightPx: number }>({
    stop: 'compact',
    heightPx: 0,
  });
  /**
   * Menu « Calques » (fond + vue + carte nue + calques de lecture) — fermé par
   * défaut, ouvert EN 1 TAP par le FAB Calques permanent (retour terrain 20/07 :
   * l'ancien détour « Outils → Calques » imposait 3 taps à travers 2 menus
   * imbriqués ; on aplatit à 1). Re-tap du FAB ou tap ailleurs (backdrop) =
   * referme. Plus de menu « Outils » intermédiaire ni d'engrenage : le
   * déclencheur EST Calques.
   */
  const [layersOpen, setLayersOpen] = useState(false);
  /**
   * Sheet de zone : ouverte dès qu'on connaît la VRAIE zone tapée. `ZONE_DETAILS`
   * (République tenue par MY_CREW, « Canal Crew à 31 % », « 24 runs en 24 h ») a
   * disparu avec le mode vitrine — une collision d'identifiant suffisait sinon à
   * peindre un propriétaire inventé sur une zone réellement possédée.
   * Une zone tapée sans donnée (`zone` null) n'ouvre RIEN : on ne remplit pas le
   * vide avec un scénario.
   */
  const zoneOpen = selectedZoneId != null && zone != null;
  /**
   * Nom du quartier de la zone tapée — résolu ici (et non par MapScreen) pour
   * que les deux surfaces qui l'affichent (E04 et son briefing E05) parlent du
   * même lieu, sans double appel.
   */
  const zoneName = useResolvedZoneName(
    zone?.center ?? null,
    zone?.sectorId ?? null,
    t(C.zoneFallback),
  );
  /**
   * E05 — BRIEFING ouvert par le CTA « Reprendre » de E04. Il REMPLACE la sheet
   * de zone dans le même emplacement : un sheet = une décision, jamais deux
   * empilés. `✕` du briefing recule d'un cran (retour à E04), pas jusqu'à la
   * carte nue : le briefing est une étape DANS la décision de zone.
   */
  const [briefingOpen, setBriefingOpen] = useState(false);
  /**
   * État du tracé REMONTÉ par le briefing : la sheet épouse son contenu, et ce
   * contenu dépend de ce que le routage a réellement produit. Le parent ne peut
   * pas le déduire — il l'apprend.
   */
  const [briefState, setBriefState] = useState<BriefRouteState>('loading');

  // Un changement de zone (ou sa fermeture) referme le briefing : il porte le
  // nom et le tracé d'UNE zone, le laisser ouvert sur une autre le ferait mentir.
  useEffect(() => {
    setBriefingOpen(false);
  }, [selectedZoneId]);

  // Chaque entrée sur la Carte repart de la CARTE + peek mission : on referme le
  // menu Calques, ramène le peek en compact ET désélectionne la zone (retour au
  // peek mission) — règle « 1 écran = 1 carte » garantie au retour.
  useFocusEffect(
    useCallback(() => {
      setLayersOpen(false);
      setBriefingOpen(false);
      // Remount de la sheet = retour au palier compact (la géométrie repart de
      // zéro, sans animation « collante » entre deux entrées sur l'onglet).
      setSheet((s) => ({ key: s.key + 1 }));
      setSheetStop({ stop: 'compact', heightPx: 0 });
      onCloseZone?.();
      // « Repart de la carte » inclut le HUD : chaque entrée sur l'onglet réaffiche
      // les infos (pas de carte nue « collante » qui semblerait un écran cassé).
      setMapHudHidden(false);
    }, [onCloseZone]),
  );

  // AMENDEMENT-37 §8 (§A.4) : signale à la nav qu'une sheet de zone est ouverte
  // → son bouton d'action central passe en CONTOUR (un seul CTA chartreuse PLEIN
  // à l'écran : celui de la zone). Remis à false au démontage (bascule d'onglet).
  useEffect(() => {
    setZoneSheetOpen(zoneOpen);
    return () => setZoneSheetOpen(false);
  }, [zoneOpen]);

  // §3 : $screen à chaque ouverture / changement de zone (contrat d'events du module).
  useEffect(() => {
    if (zoneOpen && selectedZoneId) screen('map_zone_open', { zone: selectedZoneId });
  }, [zoneOpen, selectedZoneId]);

  /**
   * ANCRAGE DE LA SHEET (planche E02, retour fondateur 25/07 : « l'onglet
   * territoire non chargé doit se déployer en swipe et être collé au menu en
   * bas »). Elle se pose JUSTE au-dessus de la barre d'onglets — plus de trou de
   * 91 px entre elle et la nav. Elle ne passe jamais SOUS la barre : le
   * dégagement est exactement `insets.bottom + NAV_BAR_HEIGHT`.
   *
   * (Avant : `insets.bottom + RUN_BUTTON_BOTTOM + 12`, soit 152 px de vide — le
   * bouton GO occupait ce trou, et la sheet flottait au milieu de la carte.)
   */
  const sheetBottom = insets.bottom + NAV_BAR_HEIGHT;
  // « Carte nue » masque le HUD : ligne mission (haut, index.tsx) + sheet du bas.
  // Les 2 FABs permanents (Recentrer + Calques) RESTENT visibles même en carte nue :
  // le FAB Calques rouvre le menu, dont la rangée « Carte nue » (active) ramène tout.
  // Un tap sur une ZONE reste explicite → sa sheet s'affiche même en carte nue.
  /**
   * CE QUE LA LECTURE DU TERRITOIRE A RENDU, dans le vocabulaire de la matrice.
   * `emptyState` porte déjà les trois états distincts ; `null` veut dire soit
   * « on lit encore », soit « il y a du territoire » — c'est le widget qui
   * tranche entre les deux. Ordre CONSERVÉ du rendu précédent : un état vide
   * explicite prime sur le widget (il ne peut pas y avoir les deux).
   */
  const data: MapDataState =
    emptyState === 'signed-out'
      ? 'signed-out'
      : emptyState === 'failed'
        ? 'failed'
        : emptyState === 'empty'
          ? 'empty'
          : widget !== null
            ? 'territory'
            : 'loading';

  /**
   * L'ARBITRAGE, en un appel : quel récit, quelle action, faut-il une barre
   * haute, GO est-il légitime. Fonction PURE et testée (locationState.ts) —
   * c'est elle qui garantit qu'il n'y a jamais deux récits concurrents, ici
   * comme dans la barre haute de l'onglet.
   */
  const plan: MapPlan = useMemo(
    () =>
      mapPlan({
        access,
        data,
        canOpenSettings: CAN_OPEN_SETTINGS,
      }),
    [access, data],
  );
  /** Les trois récits qui parlent de POSITION (rendu commun, copie distincte). */
  const locationNarrative =
    plan.narrative === 'grant-location' ||
    plan.narrative === 'denied-location' ||
    plan.narrative === 'retry-location';

  /**
   * La sheet a TOUJOURS quelque chose d'honnête à montrer — y compris pendant la
   * lecture, où elle porte un SKELETON (planche E02 : « fond de carte d'abord,
   * skeleton dans la sheet, AUCUN spinner plein écran »). Avant, elle se retirait
   * dans ce cas : l'écran sautait, et le bouton GO changeait de place au moment
   * précis où la donnée arrivait.
   */
  const sheetVisible = zoneOpen || !hudHidden;
  /**
   * MÉTRIQUES RÉELLEMENT AFFICHABLES de la zone tapée (E04). C'est la même liste
   * qui pilote le rendu ET la hauteur : impossible de peindre une ligne que la
   * hauteur ignore, ou l'inverse.
   */
  const zoneMetrics: readonly ZoneMetricKey[] = useMemo(
    () =>
      zone === null
        ? []
        : zoneMetricKeys({
            areaKm2: zone.areaKm2,
            zones: zone.zones,
            capturedDaysAgo: daysSinceCapture(zone.capturedAt, new Date()),
          }),
    [zone],
  );

  /** Hauteur du CONTENU compact : le peek épouse son contenu, jamais tronqué (§A9). */
  // E04/E05 : la hauteur se DÉDUIT de ce qui est rendu (fonctions pures testées),
  // elle n'est plus une constante devinée. Une zone rivale porte le CTA REPRENDRE
  // et le lien tertiaire ; MA zone n'a pas de décision à prendre, donc ni l'un ni
  // l'autre — et sa sheet se resserre d'autant au lieu de laisser un vide.
  const zoneHeight = zoneSheetHeight({
    metrics: zoneMetrics.length,
    hasCta: zone?.role === 'rival',
    hasTertiary: zone?.role === 'rival',
  });
  const briefingHeight = briefSheetHeight({
    state: briefState,
    metrics: briefMetricKeys(briefState).length,
    hasStateAction: briefState !== 'loading',
  });
  /** Le peek de position se resserre quand il n'a rien de plus à porter. */
  const locationPeekHeight =
    plan.action === 'none'
      ? LOCATION_PEEK_NO_ACTION_HEIGHT
      : plan.secondary === 'none'
        ? LOCATION_PEEK_HEIGHT
        : LOCATION_PEEK_WITH_LINK_HEIGHT;
  const peekContentHeight = zoneOpen
    ? briefingOpen
      ? briefingHeight
      : zoneHeight
    : plan.narrative === 'skeleton'
      ? SKELETON_PEEK_HEIGHT
      : locationNarrative
        ? locationPeekHeight
        : plan.narrative === 'sign-in' || plan.narrative === 'retry-data'
          ? EMPTY_PEEK_WITH_CTA_HEIGHT
          : widget !== null
            ? MISSION_PEEK_COMPACT_HEIGHT
            : EMPTY_PEEK_HEIGHT;

  const { height: winH } = useWindowDimensions();
  /**
   * La sheet de ZONE n'a pas de contenu déployé : c'est un panneau FIXE
   * (`['compact']`) — une poignée qui n'ouvrirait sur rien serait un contrôle
   * mort. Le peek mission, lui, porte le bloc « Détails » : il est TIRABLE aux
   * trois paliers de la planche (29 % / 52 % / 90 % de l'écran) — dans les DEUX
   * lentilles depuis le 26/07/2026 (le peek Bike figé a disparu avec sa cause).
   */
  const sheetDraggable = !zoneOpen;
  const sheetGeometry = useMemo(
    () =>
      mapSheetStops({
        screenH: winH,
        bottomInset: insets.bottom,
        navBarH: NAV_BAR_HEIGHT,
        peekMinHeight: peekContentHeight,
        stops: sheetDraggable ? undefined : ['compact'],
        // Un panneau FIXE épouse son contenu : sans geste pour le déployer, une
        // bande carbone vide sous le texte se lirait comme un écran cassé (§A).
        hugContent: !sheetDraggable,
      }),
    [winH, insets.bottom, peekContentHeight, sheetDraggable],
  );

  /**
   * Publie la géométrie aux DEUX surfaces qui vivent hors de cet arbre : le
   * bouton GO (morph pill ⇄ rond) et, dans MapScreen, l'attribution légale + la
   * note d'état — qui doivent se recaler AU-DESSUS d'une sheet désormais collée
   * au bas. Écrit au SNAP uniquement : publier une hauteur par frame re-rendrait
   * MapScreen 60 fois par seconde et la caméra MapLibre se ré-appliquerait
   * par-dessus le geste (retour terrain « le zoom revient en arrière »).
   */
  useEffect(() => {
    // `heightPx` vient de la sheet elle-même : elle peut avoir PLAFONNÉ ses
    // paliers à son contenu réel, une hauteur que le parent ne sait pas déduire.
    // Tant qu'elle n'a rien reporté (0), on retombe sur le palier compact calculé.
    const height = sheetStop.heightPx > 0 ? sheetStop.heightPx : sheetGeometry.heights.compact;
    setMapSheetLayout({
      visible: sheetVisible,
      expanded: sheetVisible && sheetStop.stop !== 'compact',
      topPx: sheetBottom + (sheetVisible ? height : 0),
      peekTopPx: sheetBottom + (sheetVisible ? sheetGeometry.heights.compact : 0),
    });
  }, [sheetVisible, sheetStop, sheetGeometry, sheetBottom]);

  // Remise à zéro au DÉMONTAGE seulement (bascule d'onglet). La mettre en
  // nettoyage de l'effet ci-dessus la ferait passer par « aucune sheet » à chaque
  // changement de palier — le bouton GO clignoterait en pill entre deux états.
  useEffect(() => clearMapSheetLayout, []);

  /** Bas de la pile de FABs : au-dessus du PEEK (ancre stable — ils ne dansent
   *  pas au rythme du geste), sinon au ras de la barre d'onglets. */
  const fabBottom = sheetVisible
    ? sheetBottom + sheetGeometry.heights.compact + FAB_ABOVE_SHEET
    : sheetBottom;

  // Le menu Calques s'ouvre AU-DESSUS de la pile de FABs. On PLAFONNE sa hauteur à
  // l'espace libre entre le HUD du haut (secteur + ligne mission) et le sommet des
  // FABs → il défile au lieu de recouvrir « République attaquée » (retour fondateur).
  const layerMenuMaxHeight = Math.max(
    120,
    winH - insets.top - TOP_HUD_CLEARANCE - fabBottom - FAB_STACK_HEIGHT,
  );

  /** FAB Calques : ouvre/ferme le menu Calques EN 1 TAP (haptic géré par le FAB). */
  const toggleLayers = () => {
    setLayersOpen((v) => !v);
  };

  /** Ferme le menu Calques (re-tap FAB ou tap « ailleurs » sur le backdrop). */
  const closeLayers = () => {
    setLayersOpen(false);
  };

  /**
   * Recentrer = action one-shot → referme le menu Calques (« ferme en
   * l'utilisant »). DEUX chemins, et la distinction compte :
   *  • position déjà connue → on rend la main à la carte (vol immédiat vers la
   *    dernière position + réacquisition côté MapScreen) : comportement inchangé ;
   *  • position INCONNUE → on MÈNE la tentative pour en apprendre l'issue. C'est
   *    ce qui rend « Position introuvable · Réessayer » affirmable : on l'a
   *    observé. Avant, un appui sans fix ne produisait STRICTEMENT rien à
   *    l'écran ici — la carte le disait ailleurs, ce bouton restait muet.
   */
  const recenterAndClose = () => {
    setLayersOpen(false);
    if (egoPos) {
      onRecenter?.();
      return;
    }
    void attemptLocation(() => onRecenter?.());
  };

  /** « Activer ma position » / « Réessayer » — le MÊME appel, deux libellés. */
  const locateFromSheet = () => {
    void attemptLocation(() => onRecenter?.());
  };

  /** « Ouvrir les réglages » — natif uniquement (cf. CAN_OPEN_SETTINGS). */
  const openSystemSettings = () => {
    haptics.light();
    void Linking.openSettings();
  };

  /**
   * Bascule « carte nue » (rangée du menu Calques) : masque/affiche TOUT le HUD
   * (ligne mission du haut + sheet du bas) → carte plein écran. Referme le menu
   * pour qu'on VOIE réellement la carte nue ; le FAB Calques reste visible pour
   * rouvrir le menu et tout ramener.
   */
  const toggleHud = () => {
    haptics.light();
    setLayersOpen(false);
    setMapHudHidden(!hudHidden);
  };

  const selectMode = (key: MapMode) => {
    setLayersOpen(false);
    if (mode === key) return;
    haptics.light();
    onSelectMode(key);
    screen('map_mode_select', { mode: key });
  };

  /** Fermer la sheet de zone → carte nue + retour au peek mission. */
  const closeZone = () => {
    haptics.light();
    onCloseZone?.();
  };

  /**
   * E04 → E05 : « Reprendre » n'envoie plus directement au planificateur, il
   * ouvre le BRIEFING, où l'intention devient un objectif concret. Le
   * planificateur reste accessible en un tap depuis le briefing (« Ajuster »)
   * et depuis le lien tertiaire « Planifier pour plus tard ».
   */
  const openBriefing = () => {
    haptics.medium();
    screen('map_zone_act', { zone: selectedZoneId ?? '', action: 'reprendre' });
    // On repart de « calcul en cours » : ne pas réutiliser l'état d'un briefing
    // précédent, qui ferait clignoter la sheet à la mauvaise hauteur.
    setBriefState('loading');
    setBriefingOpen(true);
  };

  /**
   * « Planifier pour plus tard » / « Ajuster » → le planificateur RÉEL.
   *
   * La LENTILLE voyage avec (`plannerHref`). Le planificateur n'a pas de
   * commutateur à lui : sans cette transmission, un cycliste qui ouvre
   * « Ajuster » depuis sa carte vélo se voit proposer des distances de coureur,
   * routées au profil piéton — et repart à pied.
   */
  const openPlanner = () => {
    haptics.light();
    onCloseZone?.();
    router.push(plannerHref(activity));
  };

  /**
   * CTA du briefing. La sortie qui démarre est une sortie de CONQUÊTE réelle —
   * exactement celle du bouton GO. Le tracé affiché reste indicatif et le
   * briefing le DIT : `/course-live` ignore volontairement tout paramètre
   * d'objectif, et le serveur classe la capture APRÈS coup.
   *
   * ⚠️ CE BOUTON NE DÉCLARAIT RIEN jusqu'au 26/07/2026 : il poussait
   * `/course-live?mode=conquete` en dur, donc TOUJOURS une course à pied — y
   * compris atteint depuis la lentille vélo, où le tap de zone est réarmé. Le
   * GO d'à côté déclarait déjà correctement ; il n'y avait aucune raison que
   * deux départs du même écran n'enregistrent pas la même chose.
   */
  const startMission = () => {
    onCloseZone?.();
    router.push(missionStartHref(activity));
  };

  /**
   * LE CONTENU DE LA SHEET — un `switch` sur LE récit décidé par la matrice,
   * plus une cascade de conditions locales. Aucun cas n'est « le repli » d'un
   * autre : chaque récit a son composant, et l'ordre n'a plus de sens caché.
   */
  const missionPeek =
    plan.narrative === 'skeleton' ? (
      <SkeletonPeek />
    ) : plan.narrative === 'sign-in' ? (
      <EmptyPeek state="signed-out" onAction={onEmptyAction} />
    ) : plan.narrative === 'retry-data' ? (
      <EmptyPeek state="failed" onAction={onEmptyAction} />
    ) : locationNarrative ? (
      <LocationPeek
        plan={plan}
        busy={locating}
        onLocate={locateFromSheet}
        onOpenSettings={openSystemSettings}
      />
    ) : widget ? (
      <TerritoryWidgetPeek view={widget} onAction={() => onWidgetAction?.(widget)} />
    ) : (
      // `first-capture` sans widget : le joueur n'a rien capturé DANS CETTE
      // DISCIPLINE et la lecture n'a rien produit d'autre à dire. Sortir EST
      // l'action — GO la porte (§A4). La lentille choisit seulement les mots :
      // un monde vélo neuf est un DÉBUT, pas l'absence d'une fonctionnalité.
      <EmptyPeek state="empty" activity={activity} onAction={onEmptyAction} />
    );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop invisible : un tap « ailleurs » referme le menu Calques (contrat
          §1). Rendu SOUS la pile de FABs et la sheet (enfants suivants = au-dessus)
          → seuls les taps hors de ces zones l'atteignent. Absent quand le menu est
          fermé : la carte reçoit alors ses gestes normalement (pan/zoom). Hors a11y
          (les lecteurs d'écran referment via le FAB Calques, dont l'état
          « sélectionné » est lisible). */}
      {layersOpen ? (
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={closeLayers} />
      ) : null}

      {/* ── Droite : 2 FABs PERMANENTS (AMENDEMENT-37 §8) — Recentrer + Calques.
          Le FAB Calques ouvre le menu EN 1 TAP (retour terrain 20/07 : l'ancien
          détour « Outils → Calques » imposait 3 taps à travers 2 menus imbriqués).
          Le menu Calques absorbe désormais « Carte nue » (rangée d'affichage) :
          plus de menu Outils ni d'engrenage. Le déclencheur Calques est le dernier
          de la pile (en bas, sous le pouce), visible même en carte nue pour tout
          ramener. ── */}
      <View
        style={[styles.fabColumn, { bottom: fabBottom }]}
        pointerEvents="box-none"
      >
        {layersOpen ? (
          <LayerMenu
            maxHeight={layerMenuMaxHeight}
            active={mode}
            onSelect={selectMode}
            basemap={basemap}
            onSelectBasemap={
              onToggleBasemap
                ? (key) => {
                    if (key === basemap) return;
                    haptics.light();
                    onToggleBasemap(key);
                  }
                : undefined
            }
            map3d={map3d}
            onSetMap3d={onSetMap3d}
            hudHidden={hudHidden}
            onToggleHud={toggleHud}
            /* ROUVERT : les calques de lecture existent dans les deux mondes —
               ils décrivent la carte, pas la discipline. */
            showReadingLayers
          />
        ) : null}
        {/* CAPSULE (planche E02/E03) : les 2 FABs permanents groupés dans une
            capsule arrondie — Recentrer en haut, séparateur, Calques en bas.
            « Où suis-je ? » et « Calques » en 1 tap, à une main, en courant. */}
        <View style={styles.fabCapsule}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.recenterA11y)}
            onPress={recenterAndClose}
            style={({ pressed }) => [styles.fabCell, pressed && styles.pressed]}
          >
            <Icon name="gps" size={iconSizes.md} color={colors.blanc} />
          </Pressable>
          <View style={styles.fabDivider} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.layersFabA11y)}
            accessibilityState={{ selected: layersOpen }}
            onPress={toggleLayers}
            style={({ pressed }) => [styles.fabCell, pressed && styles.pressed]}
          >
            <Icon name="calques" size={iconSizes.md} color={layersOpen ? colors.chartreuse : colors.blanc} />
          </Pressable>
        </View>
      </View>

      {/* ── Sheet du bas, COLLÉE au-dessus de la barre d'onglets (planche E02) :
          la sheet de ZONE tapée REMPLACE le peek mission (§3) ; sinon le peek
          MISSION persistant (§8), tirable aux 3 paliers. Une seule sheet à la
          fois = 1 seul gros CTA à la fois (anti double-CTA §A.4). ── */}
      <View style={[styles.sheetWrap, { bottom: sheetBottom }]} pointerEvents="box-none">
        {zoneOpen && zone ? (
          /* VRAIE zone tapée : ce que le serveur sait dire, rien de plus. Panneau
             FIXE (rien à déployer) ; son CTA REPRENDRE — puis, une fois le
             briefing ouvert, COMMENCER LA MISSION — est l'unique CTA chartreuse
             de l'écran : GO se retire (useZoneSheetOpen, §A.4). */
          <MapAnchoredSheet
            key={`realzone-${selectedZoneId}-${briefingOpen ? 'brief' : 'zone'}`}
            geometry={sheetGeometry}
            peek={
              briefingOpen ? (
                <MissionBriefingSheet
                  zoneId={selectedZoneId ?? ''}
                  zoneName={zoneName}
                  egoPos={egoPos}
                  activity={activity}
                  onStateChange={setBriefState}
                  onClose={() => setBriefingOpen(false)}
                  onOpenPlanner={openPlanner}
                  onStart={startMission}
                />
              ) : (
                <ZoneDecisionPeek
                  zone={zone}
                  zoneName={zoneName}
                  metrics={zoneMetrics}
                  onClose={closeZone}
                  onReprendre={openBriefing}
                  onPlanLater={openPlanner}
                />
              )
            }
            testID="map-zone-sheet"
          />
        ) : hudHidden ? null : (
          <MapAnchoredSheet
            key={`mission-${sheet.key}`}
            geometry={sheetGeometry}
            testID="map-mission-sheet"
            onStopChange={(stop, heightPx) => {
              setSheetStop({ stop, heightPx });
              // Event §8 : uniquement un DÉPLOIEMENT (le report de montage vaut
              // 'compact' et ne doit pas compter pour une ouverture).
              if (stop !== 'compact') screen('map_sheet_open', { state: stop });
            }}
            peek={missionPeek}
            expanded={
              <View style={styles.openBlock}>
                {/* SITUATION / PARCOURS / ÉQUIPE ont été RETIRÉS (21/07/2026) :
                    tous trois sortaient de `demo.ts` (MAP_MISSION_SUMMARY,
                    PARCOURS_DEMO, MATES_OPT_IN). Il n'existe ni parcours proposé,
                    ni allié partageant sa position, ni part de contrôle réelle —
                    les afficher, c'était fabriquer une situation de jeu. Ne
                    restent que des entrées VRAIES : l'historique local, et la War
                    Room quand son flag est levé. */}
                {/* BLOC — DÉTAILS. La rangée « mission du jour » (MISSIONS[0],
                    warroom/demo.ts) est partie avec le reste de la démo : elle
                    n'était masquée que par le flag warRoom, donc un `FULL_SURFACE=1`
                    suffisait à afficher une mission fabriquée. Ne reste que ce qui
                    est vrai — l'historique local du joueur. */}
                {/* LE LIEN HISTORIQUE NE PORTE PAS DE DISCIPLINE, ET C'EST
                    DÉLIBÉRÉ (26/07/2026). Il disait « Tes courses passées » sous
                    lentille vélo — corrigé, mais PAS par un jumeau : ce lien
                    décrit l'écran où il MÈNE, et `/historique` a sa PROPRE
                    lentille mémorisée (`useActivityLens('historique')`), que ce
                    `router.push` ne transmet pas. Écrire « tes sorties vélo »
                    promettrait un filtrage que la destination n'applique pas
                    forcément. Les deux textes sont donc NEUTRES — vrais dans les
                    deux mondes (cf. `i18n/catalog/map.ts` + `map.test.ts`). */}
                <Text style={styles.sectionTitle}>{t(C.sectionDetails)}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.historyA11y)}
                  onPress={() => {
                    haptics.light();
                    router.push('/historique');
                  }}
                  style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
                >
                  <View style={styles.rowIcon}>
                    <Icon name="historique" size={iconSizes.sm} color={colors.blanc} />
                  </View>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle} numberOfLines={1} ellipsizeMode="clip">
                      {t(C.myHistory)}
                    </Text>
                    <Text style={styles.rowMeta} numberOfLines={1} ellipsizeMode="clip">
                      {t(C.pastRuns)}
                    </Text>
                  </View>
                  <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
                </Pressable>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
}

/**
 * WIDGET « Mon territoire » (spec 17/07) rendu dans le peek de la carte :
 * titre de situation + ≤ 2 lignes + UNE action en LIEN (le gros CTA chartreuse
 * reste le bouton flottant — anti double-CTA §A.4). Vue utilisateur trackée
 * UNE fois par état (jamais le refresh auto), tap tracké avec l'action.
 */
function TerritoryWidgetPeek({
  view,
  onAction,
}: {
  view: TerritoryWidgetView;
  onAction: () => void;
}) {
  useEffect(() => {
    track(EVENTS.territoryWidgetViewed, { widget_state: view.state });
  }, [view.state]);
  return (
    <View style={styles.info}>
      <View style={styles.peekHead}>
        <View style={styles.missionBar} />
        <View style={styles.rowBody}>
          <Text style={styles.peekTitle} numberOfLines={1} adjustsFontSizeToFit>
            {view.title}
          </Text>
          {view.lines[0] ? (
            <Text style={styles.peekMeta} numberOfLines={1} adjustsFontSizeToFit>
              {view.lines[0]}
            </Text>
          ) : null}
        </View>
      </View>
      {view.lines[1] ? (
        <Text style={styles.peekMeta} numberOfLines={1} adjustsFontSizeToFit>
          {view.lines[1]}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={view.ctaLabel}
        hitSlop={8}
        onPress={() => {
          track(EVENTS.territoryWidgetActionTapped, {
            widget_state: view.state,
            primary_action: view.action,
          });
          onAction();
        }}
        style={({ pressed }) => [styles.optionsHit, pressed && styles.pressed]}
      >
        <Text style={styles.optionsLink} numberOfLines={1}>
          {view.ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}

/**
 * ÉTAT VIDE du peek (O1) — ce que voit un téléphone neuf, sans compte, quand
 * plus aucune démo ne remplit l'écran. Il DIT ce qu'il n'y a pas encore, sans
 * culpabiliser, et propose au plus UNE action :
 *   • 'signed-out' → « Se connecter » (lien : le CTA chartreuse reste GO) ;
 *   • 'empty'      → aucune action ici — courir EST l'action, et le bouton GO
 *                    flottant la porte déjà (§A.4 : un seul CTA à l'écran) ;
 *   • 'failed'     → « Réessayer » : un échec réseau se dit et se rejoue, il ne
 *                    se déguise jamais en « tu n'as rien capturé ».
 */
function EmptyPeek({
  state,
  activity = DEFAULT_ACTIVITY,
  onAction,
}: {
  state: MapEmptyState;
  /**
   * Lentille courante — elle ne change QUE la copie du vide légitime
   * (`state === 'empty'`). Les deux autres états parlent du COMPTE et du RÉSEAU,
   * qui n'ont pas de discipline : les décliner par lentille inventerait une
   * différence entre « pas connecté à vélo » et « pas connecté à pied ».
   */
  activity?: MapActivity;
  onAction?: () => void;
}) {
  const t = useT();
  const copy =
    state === 'signed-out'
      ? { title: C.emptySignedOutTitle, line: C.emptySignedOutLine, cta: C.emptySignedOutCta }
      : state === 'failed'
        ? { title: C.emptyFailedTitle, line: C.emptyFailedLine, cta: C.emptyFailedCta }
        : activity === 'bike'
          ? // Monde vélo neuf. La phrase dit un COMMENCEMENT, pas une absence :
            // le joueur n'a rien à vélo parce qu'il n'a pas encore roulé, comme
            // un nouveau venu n'a rien à pied. L'action est le bouton GO, déjà
            // présent dans cette lentille depuis le 26/07 — on ne peint donc pas
            // un second CTA ici (§A4).
            { title: C.emptyBikeTitle, line: C.emptyBikeLine, cta: null }
          : { title: C.emptyNoneTitle, line: C.emptyNoneLine, cta: null };
  return (
    <View style={styles.info}>
      <View style={styles.peekHead}>
        {/* Barre GRISE (pas chartreuse) : rien n'est à moi ici, la couleur suit
            le RÔLE et il n'y a pas encore de territoire à revendiquer. */}
        <View style={styles.emptyBar} />
        <View style={styles.rowBody}>
          <Text style={styles.peekTitle} numberOfLines={1} adjustsFontSizeToFit>
            {t(copy.title)}
          </Text>
        </View>
      </View>
      {/* 2 lignes autorisées : la phrase explique, elle n'est jamais coupée (§A9). */}
      <Text style={styles.peekMeta} numberOfLines={2}>
        {t(copy.line)}
      </Text>
      {copy.cta && onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(copy.cta)}
          hitSlop={8}
          onPress={() => {
            haptics.light();
            onAction();
          }}
          style={({ pressed }) => [styles.optionsHit, pressed && styles.pressed]}
        >
          <Text style={styles.optionsLink} numberOfLines={1}>
            {t(copy.cta)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * SKELETON de la sheet (planche E02 : « chargement : fond de carte d'abord,
 * territoires ensuite, skeleton dans la sheet — AUCUN spinner plein écran »).
 *
 * POURQUOI DEUX BARRES ET PAS UNE PHRASE. Un chargement n'affirme RIEN sur le
 * joueur : ni « pas connecté », ni « aucune zone ». Une phrase démentie une
 * seconde plus tard reste une phrase fausse. Avant, la sheet se RETIRAIT
 * pendant la lecture — l'écran sautait, et le bouton GO changeait de place au
 * moment exact où la donnée arrivait. Le skeleton tient la place, sans mentir.
 * Le lecteur d'écran, lui, entend « chargement » : le silence visuel ne doit
 * pas devenir un silence tout court.
 */
function SkeletonPeek() {
  const t = useT();
  return (
    <View
      style={styles.info}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t(N.sheetLoadingA11y)}
    >
      <View style={styles.peekHead}>
        <View style={styles.emptyBar} />
        <View style={styles.rowBody}>
          <View style={[styles.skeletonBar, styles.skeletonTitle]} />
          <View style={[styles.skeletonBar, styles.skeletonLine]} />
        </View>
      </View>
    </View>
  );
}

/**
 * PEEK DE POSITION (planche E02 « états critiques ») — LA correction du retour
 * fondateur : « Active la localisation pour te voir n'est pas assez :
 * l'utilisateur n'a pas besoin d'une phrase, il a besoin d'une action dirigée ».
 *
 * TROIS récits, jamais confondus, chacun avec SON issue réelle :
 *  • jamais demandé → « Activer ma position » : un geste, et `resolveLocation`
 *    ouvre l'invite système — c'est le moment annoncé par le produit ;
 *  • refusé → « Ouvrir les réglages » sur natif. Sur WEB, aucune API n'y mène :
 *    on explique OÙ régler ça et on ne peint AUCUN bouton (§A4) ;
 *  • introuvable → « Réessayer » (+ les réglages en LIEN : la localisation
 *    système peut être coupée, et c'est l'autre issue vraie).
 *
 * LE BOUTON N'EST PAS CHARTREUSE, et c'est un arbitrage assumé : GO reste le
 * seul CTA plein de l'écran (§A4) et il n'est pas mort ici — le préflight de
 * course redemande la permission et explique un refus. Un bouton CONTOUR reste
 * une action dirigée (44 pt, libellé explicite), sans peindre deux CTA pleins.
 * Aucun message technique brut : ni code d'erreur, ni nom d'API.
 */
function LocationPeek({
  plan,
  busy,
  onLocate,
  onOpenSettings,
}: {
  plan: MapPlan;
  /** Tentative en vol : le bouton reste, verrouillé, avec son spinner interne. */
  busy: boolean;
  onLocate: () => void;
  onOpenSettings: () => void;
}) {
  const t = useT();
  const copy =
    plan.narrative === 'grant-location'
      ? { title: N.locGrantTitle, line: N.locGrantLine, cta: N.locGrantCta }
      : plan.narrative === 'retry-location'
        ? { title: N.locRetryTitle, line: N.locRetryLine, cta: N.locRetryCta }
        : {
            title: N.locDeniedTitle,
            // La phrase dit où se règle la chose SUR CETTE plateforme : renvoyer
            // aux « réglages du téléphone » dans un navigateur serait une piste
            // fausse, aussi inutile qu'un bouton mort.
            line: plan.action === 'open-settings' ? N.locDeniedLineSettings : N.locDeniedLineBrowser,
            cta: N.locSettingsCta,
          };
  return (
    <View style={styles.info}>
      <View style={styles.peekHead}>
        {/* Barre AMBRE : un état qui appelle une action, jamais une alarme rouge
            (rien n'est cassé) ni la chartreuse (elle dit « à moi »). §C. */}
        <View style={styles.warnBar} />
        <View style={styles.rowBody}>
          <Text style={styles.peekTitle} numberOfLines={1} adjustsFontSizeToFit>
            {t(copy.title)}
          </Text>
        </View>
      </View>
      {/* 3 lignes autorisées (l'allemand est long) — jamais coupée par « … » (§A9). */}
      <Text style={styles.peekMeta} numberOfLines={3}>
        {t(copy.line)}
      </Text>
      {plan.action === 'none' ? null : (
        // ALIGNÉ À GAUCHE et borné en largeur : le bouton GO flotte au-dessus du
        // coin bas-DROIT du peek, un bouton pleine largeur lui glisserait sa zone
        // de tap sous le pouce (même raison que le lien « Voir les options »).
        <View style={styles.peekActionWrap}>
          <Button
            label={t(busy ? N.locSearching : copy.cta)}
            onPress={plan.action === 'open-settings' ? onOpenSettings : onLocate}
            variant="ghost"
            size="md"
            loading={busy}
            analyticsId={`map_location_${plan.narrative}`}
          />
        </View>
      )}
      {plan.secondary === 'open-settings' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(N.locSettingsCta)}
          hitSlop={8}
          onPress={onOpenSettings}
          style={({ pressed }) => [styles.optionsHit, pressed && styles.pressed]}
          testID="map-location-settings"
        >
          <Text style={styles.optionsLink} numberOfLines={1}>
            {t(N.locSettingsCta)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * E04 (planche) — sheet de DÉCISION d'une zone tapée : un sheet = UNE décision.
 * Kicker de RÔLE (couleur §C) + nom de quartier + ✕ · propriétaire en fait
 * NEUTRE · bloc de 3 MÉTRIQUES À SÉPARATEURS (jamais 6, jamais des cards) ·
 * CTA REPRENDRE + action tertiaire « Planifier pour plus tard ». GO se retire
 * tant que ce sheet est ouvert (useZoneSheetOpen, planche + §A.4) : REPRENDRE
 * est alors l'UNIQUE CTA chartreuse de l'écran.
 *
 * ─── CE QUE LA PLANCHE MONTRE ET QU'ON N'AFFICHE PAS ───────────────────────
 * · IDENTITÉ du propriétaire (avatar · pseudo · crew) et sa variante « privé » :
 *   sourçable (public_profiles + crew_members), mais c'est du câblage réseau
 *   neuf assorti d'une décision de vie privée. La ligne reste « À un rival »,
 *   qui est strictement VRAI. On ne synthétise jamais un pseudo depuis un UUID,
 *   et surtout pas un avatar « générique » qui laisserait croire à une identité.
 * · « ≈ 3,1 km effort estimé » : aucune source. Ce n'est ni une distance à vol
 *   d'oiseau ni une distance de route (aucun routage n'est lancé au tap), et
 *   « effort » n'est pas « distance ».
 * · « 2 h dernière activité » : DOUBLEMENT interdit — la RLS `runs_select_own`
 *   empêche le client de lire l'activité d'autrui, et une fraîcheur d'activité
 *   rivale à l'heure près est un pas vers la position live, que la planche
 *   proscrit explicitement.
 * · « Zone reprise 2 fois ce mois · la défense a expiré » : `hex_claims` ne
 *   porte que l'état COURANT, aucune table d'historique n'est exposée.
 * · Variante PROTÉGÉE (liseré bleu + échéance) : elle suppose les `shields`,
 *   qu'aucun code mobile ne lit.
 * · CTA « VOIR LA MISSION » de la variante contestée : aucun objet mission de
 *   secteur n'existe — un bouton sans cible serait un bouton mort. L'état
 *   contesté, lui, se dit : il vient d'un booléen serveur RÉEL.
 * Aucune de ces lignes ne devient un tiret ou un zéro : elles ne sont PAS là.
 */
function ZoneDecisionPeek({
  zone,
  zoneName,
  metrics,
  onClose,
  onReprendre,
  onPlanLater,
}: {
  zone: MapZoneView;
  /** Nom RÉEL du quartier, ou null → le libellé neutre traduit. */
  zoneName: string | null;
  /** Métriques sourcées, déjà filtrées par `zoneMetricKeys` (0 à 3). */
  metrics: readonly ZoneMetricKey[];
  onClose: () => void;
  onReprendre: () => void;
  onPlanLater: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const isRival = zone.role === 'rival';
  /**
   * Couleur par RÔLE, jamais par identité (§C). Le CONTESTÉ prime : c'est l'état
   * le plus chaud de la zone, et il vaut aussi pour une zone à moi (un secteur
   * disputé l'est pour tout le monde). L'appartenance, elle, est portée par le
   * TEXTE juste en dessous — la couleur ne reste jamais seule porteuse de sens.
   */
  const tint = zone.contested
    ? gameColors.contested
    : isRival
      ? gameColors.rival
      : gameColors.crew;
  const kicker = zone.contested
    ? C.zoneKickerContested
    : isRival
      ? C.zoneKickerRival
      : C.zoneKickerMine;

  const days = daysSinceCapture(zone.capturedAt, new Date());
  const cells: readonly SheetMetric[] = metrics.map((key) => {
    if (key === 'area') {
      // « 0,42 » (gros) + « km² » (petit) : la composition de la planche.
      const { value, unit } = areaStatParts(zone.areaKm2, locale);
      return { key, value, unit, label: t(C.zoneMetricArea) };
    }
    if (key === 'zones') {
      // Pas d'unité : le libellé « Zones » porte déjà le sens (planche E04).
      return { key, value: String(zone.zones), label: t(C.zoneMetricZones) };
    }
    return {
      key,
      value: days === 0 ? t(C.zoneAgoToday) : t(C.zoneAgoDays, { n: days ?? 0 }),
      label: t(C.zoneMetricLastCapture),
    };
  });

  return (
    <View style={styles.info}>
      <View style={styles.zoneHead}>
        <View style={[styles.zonePastille, { backgroundColor: tint }]} />
        <Text style={[styles.zoneKicker, { color: tint }]} numberOfLines={1}>
          {t(kicker)}
        </Text>
        <View style={styles.zoneHeadSpacer} />
        {/* ✕ DANS UN DISQUE (planches E04/E05) : « des icônes plutôt que du
            texte » (décision fondateur 03/07) — remplace l'ancien lien « Fermer ».
            Le tap reste au plancher a11y grâce au hitSlop. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.closeZoneA11y)}
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.closeCircle, pressed && styles.pressed]}
        >
          <Icon name="fermer" size={iconSizes.sm} color={colors.gris} />
        </Pressable>
      </View>
      {/* Nom RÉEL du quartier quand le géocodage inverse en a rendu un ; sinon le
          libellé neutre traduit — jamais un lieu inventé. */}
      <Text style={styles.zoneName} numberOfLines={1} adjustsFontSizeToFit>
        {zoneName ?? t(C.zoneFallback)}
      </Text>
      {/* PROPRIÉTAIRE — un fait neutre, ton compétitif jamais humiliant. */}
      <Text style={styles.zoneControl} numberOfLines={1} adjustsFontSizeToFit>
        {t(isRival ? C.zoneOwnerRival : C.zoneOwnerMine)}
      </Text>
      {/* 3 MÉTRIQUES MAX à séparateurs — et moins dès qu'une source manque. */}
      <SheetMetrics metrics={cells} testID="zone-metrics" />
      {isRival ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.zoneReprendre)}
            onPress={onReprendre}
            style={({ pressed }) => [styles.zoneReprendreBtn, pressed && styles.pressed]}
            testID="zone-reprendre"
          >
            <Text style={styles.zoneReprendreLabel} numberOfLines={1} adjustsFontSizeToFit>
              {t(C.zoneReprendre)}
            </Text>
          </Pressable>
          {/* Action TERTIAIRE : jamais un 2ᵉ bouton plein (§A.4). CENTRÉE sous le
              CTA pleine largeur, semibold gris — la forme exacte de la planche
              (-selection10). Sûre ici car GO se retire tant que la sheet de zone
              est ouverte (useZoneSheetOpen) : aucun tap volé au coin bas-droit. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.zonePlanLaterA11y)}
            hitSlop={8}
            onPress={onPlanLater}
            style={({ pressed }) => [styles.zoneTertiaryHit, pressed && styles.pressed]}
            testID="zone-plan-later"
          >
            <Text style={styles.zoneTertiaryLabel} numberOfLines={1}>
              {t(C.zonePlanLater)}
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

/**
 * Menu « Calques » (AMENDEMENT-21) : ouvert EN 1 TAP par le FAB Calques — le FOND
 * (Sombre / Clair / Satellite) en haut, la VUE (2D/3D + « Carte nue »), puis les
 * calques de lecture. Fermé par défaut. L'actif se lit en chartreuse sur la
 * surface SOMBRE du menu. La rangée « Carte nue » (retour terrain 20/07) remplace
 * l'ancien FAB : masquer tout le HUD est une option d'AFFICHAGE, sa vraie famille.
 */
function LayerMenu({
  maxHeight,
  active,
  onSelect,
  basemap,
  onSelectBasemap,
  map3d,
  onSetMap3d,
  hudHidden,
  onToggleHud,
  showReadingLayers = true,
}: {
  /** Plafond de hauteur : au-delà, le menu défile (ne recouvre pas le HUD haut). */
  maxHeight?: number;
  active: MapMode;
  onSelect: (mode: MapMode) => void;
  basemap: BasemapKey;
  onSelectBasemap?: (key: BasemapKey) => void;
  map3d?: boolean;
  onSetMap3d?: (value: boolean) => void;
  /** « Carte nue » actif = tout le HUD est masqué (la rangée est en surbrillance). */
  hudHidden: boolean;
  /** Bascule « Carte nue » (masque/affiche le HUD) — referme le menu pour la voir. */
  onToggleHud: () => void;
  /**
   * Section « CALQUES » (territoire, défense, rival…) — masquée en mode Bike :
   * ces calques lisent des territoires de COURSE À PIED, qui ne sont pas peints
   * dans cette lentille. Les proposer là serait offrir six bascules sans effet,
   * c'est-à-dire six boutons morts. Le FOND et la VUE, eux, sont neutres vis-à-vis
   * de l'activité : ils restent.
   */
  showReadingLayers?: boolean;
}) {
  const t = useT();
  return (
    <ScrollView
      style={[styles.layerMenu, maxHeight != null ? { maxHeight } : null]}
      contentContainerStyle={styles.layerMenuContent}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      {onSelectBasemap ? (
        <>
          <Text style={styles.layerHeading}>{t(C.headingBasemap)}</Text>
          {BASEMAP_KEYS.map((key) => {
            const on = basemap === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(C.basemapA11y, { label: t(BASEMAP_ENTRIES[key]) })}
                onPress={() => onSelectBasemap(key)}
                style={({ pressed }) => [
                  styles.layerItem,
                  on && styles.layerItemActive,
                  pressed && styles.pressed,
                ]}
              >
                <Icon
                  name={BASEMAP_ICON[key]}
                  size={15}
                  color={on ? gameColors.crew : colors.blanc}
                />
                <Text
                  style={[styles.layerLabel, on && styles.layerLabelActive]}
                  numberOfLines={1}
                >
                  {t(BASEMAP_ENTRIES[key])}
                </Text>
              </Pressable>
            );
          })}
          <View style={styles.layerDivider} />
        </>
      ) : null}
      {/* VUE — options d'AFFICHAGE de la carte. Toujours présent car « Carte nue »
          (masquer tout le HUD) y vit désormais : elle reste accessible même sans
          toggle 3D. Le 2D/3D n'apparaît que si le parent le pilote (onSetMap3d). */}
      <Text style={styles.layerHeading}>{t(C.headingView)}</Text>
      {onSetMap3d ? (
        <Map3DToggle
          value={map3d}
          onChange={onSetMap3d}
          style={styles.layerToggle}
          testID="battle-map-3d-toggle"
        />
      ) : null}
      {/* « Carte nue » — bascule d'affichage (masque/affiche tout le HUD). Icône
          « discret » (masquer). Actif = HUD masqué ; l'a11y décrit l'action du tap. */}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: hudHidden }}
        accessibilityLabel={hudHidden ? t(C.hudShowA11y) : t(C.hudHideA11y)}
        onPress={onToggleHud}
        style={({ pressed }) => [
          styles.layerItem,
          hudHidden && styles.layerItemActive,
          pressed && styles.pressed,
        ]}
      >
        <Icon name="discret" size={15} color={hudHidden ? gameColors.crew : colors.blanc} />
        <Text style={[styles.layerLabel, hudHidden && styles.layerLabelActive]} numberOfLines={1}>
          {t(C.hudRowLabel)}
        </Text>
      </Pressable>
      {showReadingLayers ? (
        <>
          <View style={styles.layerDivider} />
          <Text style={styles.layerHeading}>{t(C.headingLayers)}</Text>
          {MAP_MODE_ORDER.map((key) => {
            const on = active === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(C.layerA11y, { label: t(MODE_CHIP_ENTRIES[key]) })}
                onPress={() => onSelect(key)}
                style={({ pressed }) => [
                  styles.layerItem,
                  on && styles.layerItemActive,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name={MAP_MODE_ICON[key]} size={15} color={MODE_COLOR[key]} active={on} />
                <Text style={[styles.layerLabel, on && styles.layerLabelActive]} numberOfLines={1}>
                  {t(MODE_CHIP_ENTRIES[key])}
                </Text>
              </Pressable>
            );
          })}
        </>
      ) : null}
    </ScrollView>
  );
}

/** Surface profonde translucide commune aux flottants (HUD sur carte). */
const OVERLAY_SURFACE = withAlpha(gameColors.carbon, 0.92);

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  // ── FAB column : 2 MAX (Calques + Recentrer) ──
  fabColumn: { position: 'absolute', right: 14, gap: 10, alignItems: 'flex-end' },
  // Capsule des 2 FABs (planche) : un seul contenant arrondi, 2 cellules + séparateur.
  fabCapsule: {
    // Largeur = plancher tactile : la capsule EST la cible, dans les deux axes.
    width: sizes.touchTarget,
    borderRadius: 22,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    overflow: 'hidden',
  },
  fabCell: { height: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  fabDivider: { height: 1, backgroundColor: colors.grisLigne },

  // ── Menu Calques (fond + vue + calques de lecture) — ScrollView plafonné ──
  layerMenu: {
    alignSelf: 'flex-end',
    flexGrow: 0, // épouse son contenu tant qu'on est sous `maxHeight`
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: OVERLAY_SURFACE,
    marginBottom: 4,
    minWidth: 168,
  },
  layerMenuContent: { gap: 4, padding: 8 },
  layerHeading: {
    color: colors.gris,
    fontSize: fontSizes.xs, // >= 12 px (a11y)
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 2,
    marginTop: 2,
    marginBottom: 2,
  },
  layerDivider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 4 },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: sizes.touchTarget, // plancher tactile du projet (jamais recopié)
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  layerItemActive: { borderColor: gameColors.crew, backgroundColor: gameColors.carbon },
  layerToggle: { alignSelf: 'stretch', marginHorizontal: 2 },
  layerLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  layerLabelActive: { color: gameColors.crew },

  // Le wrapper CLIPPE la sheet : sa hauteur totale vaut le palier le plus ouvert,
  // et la part qui dépasse sous le palier courant est masquée ici. Son bord bas
  // est collé AU-DESSUS de la barre d'onglets (`bottom: sheetBottom`) — le
  // bouton GO, lui, vit HORS de ce wrapper (app/(tabs)/index.tsx) : c'est ce qui
  // lui permet de chevaucher le bord haut de la sheet sans être tronqué.
  sheetWrap: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },

  // ── Contenu du peek (mission / zone) : posé directement, pas de sous-card ──
  info: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },

  // ── PEEK MISSION ──
  peekHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionBar: { width: 4, height: 34, borderRadius: 2, backgroundColor: gameColors.crew },
  // État vide : barre GRISE — la chartreuse dit « à moi », et rien ne l'est encore.
  emptyBar: { width: 4, height: 34, borderRadius: 2, backgroundColor: colors.grisLigne },
  // Position à régler : barre AMBRE (planche E02 « barre ambre non bloquante ») —
  // un état qui appelle une action, jamais une alarme rouge : rien n'est cassé.
  warnBar: { width: 4, height: 34, borderRadius: 2, backgroundColor: gameColors.warn },
  // Skeleton de chargement : des BARRES, pas du texte — un chargement n'affirme
  // rien. Même gris de ligne que les séparateurs (aucune couleur de rôle).
  skeletonBar: { backgroundColor: colors.grisLigne, borderRadius: 3, opacity: 0.6 },
  skeletonTitle: { width: '58%', height: 13 },
  skeletonLine: { width: '38%', height: 10, marginTop: 8 },
  /**
   * Zone d'action du peek : ALIGNÉE À GAUCHE et bornée en largeur. Le bouton GO
   * flotte au-dessus du coin bas-DROIT du peek compact ; une action pleine
   * largeur lui glisserait sa zone de tap sous le pouce — invisible à l'œil,
   * mais un tap volé (même raison que le lien « Voir les options »).
   */
  peekActionWrap: { alignSelf: 'flex-start', maxWidth: '62%', marginTop: 4 },
  peekTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md, // 16 px
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  peekMeta: { color: colors.gris, fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  // Rival nommé — teinte rival (>= 12 px : aucun texte porteur sous 12).
  peekRival: { color: gameColors.rival, fontSize: 12.5, fontWeight: '600' },

  // ── SITUATION (état OUVERT du peek mission) ──
  situation: { gap: 2, marginBottom: 6 },
  situationTitle: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  situationShares: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  situationCrew: { color: gameColors.crew },
  situationFoot: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  situationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
  },
  situationChipText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },

  // ── PEEK ZONE (§3/§10) ──
  zoneHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zonePastille: { width: 10, height: 10, borderRadius: 5 },
  // Kicker de rôle (couleur inline §C) en tête de sheet (E04). Interlettrage 2
  // (rôle `typography.kicker`) — mesuré sur la planche, plus large que l'ancien 1,5.
  zoneKicker: { fontSize: fontSizes.xs, fontWeight: '800', letterSpacing: 2 },
  zoneHeadSpacer: { flex: 1 },
  // Nom de quartier = TITRE HÉROS de la planche (`typography.title`, 28 px,
  // Inter Tight 700) — et non plus un titre de 16 px : c'est le premier repère
  // de l'écran, il domine comme sur -selection10.
  zoneName: {
    ...typography.title,
    color: colors.blanc,
    marginTop: 4,
  },
  // ✕ dans un DISQUE (planches E04/E05) : cible ronde au plancher tactile via
  // hitSlop, fond carbone discret pour se détacher sans crier (§C : pas de rôle).
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  zoneControl: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  // E04 — CTA REPRENDRE : chartreuse (unique CTA tant que le sheet est ouvert,
  // GO retiré via useZoneSheetOpen). Libellé NOIR (jamais chartreuse sur clair).
  // CTA REPRENDRE — hauteur 54 mesurée sur la planche (-selection10), pill,
  // libellé NOIR sur chartreuse (jamais chartreuse sur clair). Marges latérales
  // de la sheet (paddingHorizontal 16 de `info`) — la planche donne ~20.
  zoneReprendreBtn: {
    marginTop: 12,
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneReprendreLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },
  // « Planifier pour plus tard » — CENTRÉ sous le CTA (planche), semibold gris,
  // sans soulignement : c'est l'écho tertiaire de la décision, pas un lien perdu.
  zoneTertiaryHit: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  zoneTertiaryLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  zoneActionLine: {
    color: colors.blanc,
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  // 1 CTA chartreuse (texte noir sur chartreuse — jamais chartreuse sur clair).
  zoneCta: {
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 2,
  },
  zoneCtaText: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.2 },

  // ── DÉTAIL ZONE (état OUVERT « Plus ») ──
  zoneDetailLine: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // « Voir les options » / « Plus » — lien discret (jamais un 2ᵉ CTA).
  // ALIGNÉ À GAUCHE et à la largeur de son texte (planche E02) : le bouton GO
  // flotte au-dessus du coin bas-DROIT du peek compact ; un lien pleine largeur
  // lui aurait glissé sa zone de tap sous le pouce — invisible à l'œil, mais un
  // tap volé. Le lien s'aligne d'ailleurs désormais sur le reste du peek.
  optionsHit: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  optionsLink: {
    color: colors.gris,
    fontSize: 13,
    textDecorationLine: 'underline',
    textAlign: 'left',
  },

  // ── État OUVERT : les options (Situation / Parcours / Équipe / Détails) ──
  openBlock: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8, gap: 8 },
  sectionTitle: {
    color: colors.gris,
    fontSize: fontSizes.xs, // >= 12 px (a11y)
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 6,
  },

  // Lignes-cartes (parcours / équipe / détails).
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  rowCardSelected: { borderColor: colors.chartreuse40 },
  rowIcon: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  rowBody: { flex: 1, gap: 1 },
  rowTitle: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  rowMeta: { color: colors.gris, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] },
  onMapTag: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.5 },
  joinSoon: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
  },
  joinSoonLabel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700' },
});
