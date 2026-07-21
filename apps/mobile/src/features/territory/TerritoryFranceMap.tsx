/**
 * GRYD — « Mon territoire » sur VRAIE carte (AMENDEMENT-13 §3/§4bis/§4ter).
 * RealMap (vraies tuiles sombres, MONDE librement navigable — aucun verrou) +
 * les possessions en TRACÉS DE COURSE nets (§4ter : la frontière EST le tracé
 * — boucles République/Lille, rubans quai de Valmy/Faubourg-du-Temple/berges
 * du Rhône), servies par la MÊME source et le MÊME builder que la Battle Map
 * (allTerritories + territoryStateLayers — §4bis : une seule source pour les
 * deux cartes). L'écran s'OUVRE en fitBounds de l'ENSEMBLE des possessions
 * (possessionsBounds — pas un cadrage France codé en dur). Sous
 * TERRITORY_DOT_MAX_ZOOM chaque territoire est un MARQUEUR-POINT + label
 * ville, rendu en LAYERS MapLibre bornés par zoom (territoryDotLayers — le
 * seuil suit le zoom RÉEL : dézoom manuel → les points réapparaissent).
 * ─── FIN DU MODE VITRINE (21/07/2026) ───────────────────────────────────────
 * Cet écran (bloc « Mon territoire » du Profil + page /territoire) peignait les
 * possessions DÉMO d'allTerritories : boucles République et Lille en chartreuse,
 * berges du Rhône en rival, secteurs contestés, plus des chips de navigation
 * « Paris · Lille · Rival Lyon ». Un joueur qui n'a jamais couru y voyait un
 * empire — le « des zones déjà prises alors que je n'ai rien fait » du retour
 * terrain. La branche vitrine a disparu ; avec elle :
 *   • les marqueurs-points villes (FRANCE_CITIES_DEMO) et le tap-vers-ville,
 *   • les chips de navigation et le bouton « Mes territoires » (qui ne pouvaient
 *     mener qu'à des villes fabriquées — et dont les libellés étaient de surcroît
 *     du français codé en dur, hors i18n),
 *   • les secteurs agrégés de démonstration (PARIS_DEMO_SECTOR_VIEWS).
 * Ne reste que ce que `hex_claims` sait dire, cadré sur MES possessions réelles.
 *
 * `preview` = aperçu statique du Profil (aucune interaction, pas d'overlays —
 * carte NON-interactive, §7). Offline/WebGL perdu : gérés par RealMap (fond noir
 * + message — jamais d'écran blanc). Couleurs : tokens uniquement. Reduce
 * motion : géré par RealMap (flyTo → saut sec, pulse coupé).
 */
import { useMemo, useRef } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSizes } from '@klaim/shared';
import { Map3DToggle, RealMap, type RealMapBounds, type RealMapRef } from '../../ui/game';
import { useMap3d } from '../map/mapPref';
import { FULL_EMPHASIS, territoryStateLayers } from '../map/mapStyle';
import { useRealTerritories } from '../map/hexClaims';
import type { RealTerritory } from '../map/territoryBuild';
import { C } from '../../i18n/catalog/map';
import { useT } from '../../i18n/store';

// ─── Constantes de rendu (UI uniquement) ────────────────────────────────────
/** Marge intérieure du fitBounds plein écran (l'ensemble des possessions). */
const OVERVIEW_FIT_PADDING_PX = 56;
/** Marge du fitBounds de l'APERÇU Profil (cadre mini ~190 px de haut). */
const PREVIEW_FIT_PADDING_PX = 28;

export interface TerritoryFranceMapProps {
  /** Aperçu statique (bloc Profil) : aucune interaction, pas d'overlays. */
  preview?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Cadrage réel : boîte englobante des VRAIES possessions. `null` quand il n'y a
 * rien à cadrer — RealMap ouvre alors sur sa vue neutre monde, ce qui est la
 * vérité (« je ne sais pas encore où tu joues »), pas un cadrage France inventé.
 */
function realBounds(
  territories: readonly RealTerritory[] | null,
  paddingPx: number,
): RealMapBounds | undefined {
  if (territories === null || territories.length === 0) return undefined;
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const t of territories) {
    for (const polygon of t.polygons) {
      for (const ring of polygon) {
        for (const [lng, lat] of ring) {
          if (lng < minLng) minLng = lng;
          if (lat < minLat) minLat = lat;
          if (lng > maxLng) maxLng = lng;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
  }
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return undefined;
  return { sw: [minLng, minLat], ne: [maxLng, maxLat], paddingPx };
}

export function TerritoryFranceMap({ preview = false, style, testID }: TerritoryFranceMapProps) {
  const mapRef = useRef<RealMapRef>(null);
  const t = useT();
  /** Cette carte lit `hex_claims` comme la Battle Map — même source, même vérité. */
  const { territories, isReal, failed, signedOut, loading } = useRealTerritories();
  /**
   * AMENDEMENT-26 — vue 3D (pref `gryd.map3d`, défaut 2D) partagée entre toutes
   * les cartes. En 3D : carte pitchée + mes possessions en volume extrudé
   * chartreuse (RealMap `mode3d`). CONFORT visuel pur — zéro impact gameplay.
   */
  const { map3d, setMap3d } = useMap3d();
  /**
   * Couches TRACÉ-BASED partagées avec la Battle Map (§4bis/§4ter) + les
   * SECTEURS agrégés par statut (§C) au-dessus : au zoom quartier/rue « Mon
   * territoire » lit les mêmes zones contestées / attaques / urgences que la
   * Battle Map (double contour + violet + pulse), avec leurs badges (portés par
   * territoryDotLayers, bornés en minZoom). Au dézoom, disques sub-pixel +
   * badges masqués → seuls les marqueurs-points villes/fronts restent (LOD §C).
   */
  // `territories ?? []` : territoryStateLayers ne consulte JAMAIS la démo (même
  // contrat que battleGameLayers, P0.2). Passer `null` la ferait ressurgir.
  const paintedTerritories = territories ?? [];
  const layers = useMemo(
    () => territoryStateLayers(FULL_EMPHASIS, 'dark', null, paintedTerritories),
    [paintedTerritories],
  );
  /**
   * Cadrage d'ouverture : fitBounds de MES possessions réellement capturées — et
   * rien du tout tant qu'il n'y en a aucune (RealMap ouvre sur sa vue neutre
   * monde, ce qui dit la vérité au lieu d'inventer un cadrage France).
   */
  const padding = preview ? PREVIEW_FIT_PADDING_PX : OVERVIEW_FIT_PADDING_PX;
  /**
   * MES possessions. Le composant s'appelle « Mon territoire » partout où il est
   * monté (aperçu du Profil, page /territoire) : c'est sur ELLES qu'il se cadre et
   * c'est leur absence qui déclenche l'état vide. `territories` contient aussi les
   * captures RIVALES (la requête ne filtre pas par propriétaire, à dessein) —
   * s'en servir pour cadrer envoyait la carte de « mon » territoire sur le
   * territoire de quelqu'un d'autre, et taisait « aucune zone capturée » à un
   * joueur qui n'a effectivement rien pris. Les rivaux restent PEINTS (c'est du
   * réel, la carte doit le montrer) : seuls le cadrage et la phrase changent.
   */
  const mine = useMemo(
    () => (territories === null ? null : territories.filter((ter) => ter.props.status === 'crew')),
    [territories],
  );
  const bounds = useMemo(
    () =>
      // Rien à moi mais du rival visible : on cadre sur ce qu'il y a plutôt que
      // d'ouvrir sur le globe — la carte reste lisible et honnête.
      realBounds(mine, padding) ?? realBounds(territories, padding),
    [padding, mine, territories],
  );

  /**
   * ÉTAT VIDE (O1) — « retirer la démo ne veut pas dire laisser un trou ». Trois
   * cas distincts, jamais confondus, exactement comme sur la Battle Map :
   * pas connecté / connecté mais rien capturé / échec de lecture. `null` = on ne
   * sait pas encore : on n'écrit rien plutôt qu'une phrase démentie ensuite.
   *
   * On teste `signedOut` (le hook SAIT s'il y a une session) et non `!isReal` :
   * `isReal` est faux AUSSI tant que la requête tourne, donc un joueur connecté
   * voyait « Pas encore connecté » s'afficher puis se démentir. Le cas
   * « chargement » retombe désormais sur `null` — l'écran se tait.
   */
  const emptyCopy = loading
    ? null
    : failed
      ? { title: C.emptyFailedTitle, line: C.emptyFailedLine }
      : signedOut
        ? { title: C.emptySignedOutTitle, line: C.emptySignedOutLine }
        : isReal && mine !== null && mine.length === 0
          ? { title: C.emptyNoneTitle, line: C.emptyNoneLine }
          : null;

  return (
    <View style={[styles.root, style]} pointerEvents={preview ? 'none' : 'auto'} testID={testID}>
      <RealMap
        ref={mapRef}
        bounds={bounds}
        geojsonLayers={layers}
        mode3d={map3d}
        style={styles.map}
      />

      {/* ── ÉTAT VIDE : une phrase POSÉE SUR la carte (jamais un rectangle noir
          muet, jamais un spinner). Elle dit ce qu'il n'y a pas encore ; l'action
          vit ailleurs — le bouton GO de la nav — donc AUCUN CTA ici (§A : 1 écran
          = 1 décision). En aperçu Profil, seul le titre : le bloc fait ~190 px. ── */}
      {emptyCopy ? (
        <View style={styles.emptyWrap} pointerEvents="none">
          <Text style={styles.emptyTitle} numberOfLines={2}>
            {t(emptyCopy.title)}
          </Text>
          {!preview ? (
            <Text style={styles.emptyLine} numberOfLines={3}>
              {t(emptyCopy.line)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {/* ── Contrôle d'apparence 2D/3D (AMENDEMENT-26/22) — discret, jamais en aperçu ── */}
      {!preview ? (
        <Map3DToggle
          value={map3d}
          onChange={setMap3d}
          style={styles.map3dToggle}
          testID="territoire-map3d-toggle"
        />
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir, overflow: 'hidden' },
  map: { flex: 1 },
  pressed: { opacity: 0.7 },

  // ── Contrôle d'apparence 2D/3D (haut droite) ──
  map3dToggle: { position: 'absolute', top: 12, right: 12 },

  // ── État vide : centré, blanc sur la carte sombre (jamais chartreuse — elle
  //    est réservée à l'action, et illisible sur fond clair, charte). ──
  emptyWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 6,
  },
  emptyTitle: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyLine: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    textAlign: 'center',
  },

});
