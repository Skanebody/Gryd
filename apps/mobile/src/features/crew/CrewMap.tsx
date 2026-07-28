/**
 * GRYD — E44 « CARTE DU CREW » (spec produit l.1611), la vue Carte du QG et
 * l'illustration de l'écran de mission E45.
 *
 * ═══ CE QUE CET ÉCRAN MONTRAIT AVANT (et pourquoi ce n'était pas une carte) ══
 * La vue « Carte » du QG n'a JAMAIS eu de carte : elle rendait « N zones
 * tenues », le rang de ville, la bande de secteurs nommés et deux liens
 * (`RealCrewScreen`, branche `view === 'map'`). C'était honnête et lisible, mais
 * ça ne répondait pas à la question de la planche — « où est notre emprise ? ».
 * Le composant ci-dessous répond à CELLE-LÀ, et la bande nommée reste sous lui :
 * un nom de quartier se lit mieux qu'un contour, un contour se situe mieux qu'un
 * nom. Les deux ne disent pas la même chose.
 *
 * ═══ AUCUN HEXAGONE (constitution 6) ════════════════════════════════════════
 * Rien n'est peint ici en cellules : le rendu passe par `territoryStateLayers`,
 * qui reçoit des `RealTerritory` — des POLYGONES. Leur source est
 * `useRealTerritories`, qui lit d'abord `public.territories` (colonne `geometry`
 * en GeoJSON, migration 0074) et, LÀ OÙ ELLE MANQUE, retombe encore sur un
 * contour dérivé de la grille de capture (`territoriesSource.ts:437-490`, suspens
 * documenté). Ce repli n'est PAS aggravé ici — ce composant ne construit aucune
 * géométrie, il consomme celle qui est servie aux autres cartes. Le correctif de
 * fond est le backfill de `territories`, hors de ce chantier.
 *
 * ═══ COULEURS PAR RÔLE, JAMAIS PAR CREW (§C) ════════════════════════════════
 * C'est ici que la tentation est maximale : une carte de crew appelle une
 * « couleur du crew ». Refusé. `stateFor` (territoryBuild.ts:116) ne connaît que
 * trois rôles — chartreuse = nous (moi ET les membres actifs), orange = rival,
 * violet = contesté. Le crew ne teinte RIEN : `crews.color` n'entre pas dans ce
 * fichier, et deux crews rivaux se peignent de la même orange. La légende
 * ci-dessous nomme donc des RÔLES, pas des équipes.
 *
 * ═══ CONFIDENTIALITÉ (constitution 7 + spec E44 « Confidentialité ») ═════════
 * Trois refus explicites, et chacun est une ligne de code absente :
 *  1. AUCUN `onPress` n'est branché sur la carte. `buildTerritories` regroupe PAR
 *     PROPRIÉTAIRE (territoryBuild.ts:171) et un tap dirait donc QUI tient quoi —
 *     l'attribution nominative que la spec interdit. L'emprise se montre
 *     agrégée : une seule teinte pour tout le crew, aucun moyen de désigner un
 *     membre sur la carte.
 *  2. AUCUN marqueur de membre, aucune position live, aucun horaire. `markers`
 *     n'est pas passé, et rien ici ne lit de position.
 *  3. AUCUNE trace de sortie. Les polygones servis sont ceux de la carte
 *     publique — déjà soumis à `publish_after` et à `geometry_generalized` pour
 *     autrui (RLS 0074:270) — jamais un tracé de course d'un membre.
 *
 * ═══ JAMAIS TOUS LES COUREURS : LOD (§C) ════════════════════════════════════
 * Aucun point de coureur n'est peint, et l'étagement par zoom est celui, déjà
 * testé, de `territoryStateLayers` (fills LOD, tracés gelés sous
 * TERRITORY_TRACE_MIN_ZOOM). Ce composant n'ajoute aucune couche par membre —
 * c'est ce qui le rend indifférent à la taille du crew.
 *
 * ═══ QUATRE ÉTATS, JAMAIS CONFONDUS ═════════════════════════════════════════
 * pas connecté · lecture EN COURS · échec de lecture · lu et VIDE. La carte est
 * peinte dans les quatre (fond réel, jamais un rectangle noir muet) ; c'est la
 * phrase posée dessus qui change. Un « lu et vide » ne se dit pas « je charge »,
 * et aucun des quatre ne se dit « 0 zone ».
 *
 * §A : ce composant n'a AUCUN CTA — il décrit. L'action vit dans l'écran qui le
 * monte (le QG, ou E45).
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, fontSizes, gameColors, radii, spacing, type Activity } from '@klaim/shared';
import { RealMap, type RealMapBounds } from '../../ui/game';
import { FULL_EMPHASIS, territoryStateLayers } from '../map/mapStyle';
import { useRealTerritories } from '../map/hexClaims';
import { heldByCrew, type RealTerritory } from '../map/territoryBuild';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/crew';

/** Marge intérieure du fitBounds. Mesure d'écran — aucune règle de jeu. */
const FIT_PADDING_PX = 40;

/**
 * Boîte englobante des polygones passés, ou `undefined` quand il n'y a rien à
 * cadrer — RealMap ouvre alors sur sa vue neutre monde, ce qui dit « je ne sais
 * pas encore où vous jouez » au lieu d'inventer un cadrage.
 */
function boundsOf(
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

export interface CrewMapProps {
  /**
   * Ids des membres ACTIFS du crew — MOI COMPRIS si je suis dedans.
   *
   * L'appelant DOIT le mémoïser : c'est une dépendance d'effet dans
   * `useRealTerritories`, et un `new Set()` reconstruit à chaque rendu
   * relancerait la lecture en boucle.
   *
   * `null` = roster pas encore connu. Les zones du crew retomberaient alors en
   * « rival » (orange), ce qui serait un mensonge de couleur : le composant se
   * TAIT dans ce cas plutôt que de peindre le crew en adversaire.
   */
  memberIds: ReadonlySet<string> | null;
  /**
   * DISCIPLINE PEINTE — obligatoire, jamais un défaut silencieux. `hex_claims` a
   * une clé primaire composite `(h3index, activity)` (0070) : sans lentille, un
   * crew de cyclistes lirait une carte de course. Aucune version « les deux
   * mondes » : la couleur dit le RÔLE (§C), pas la discipline — les superposer
   * rendrait deux emprises distinctes indiscernables.
   */
  activity: Activity;
  /** Hauteur du cadre (pt). L'écran décide — la carte ne s'impose pas. */
  height: number;
  /** Légende des rôles. Fausse sur un cadre trop court (E45 la garde). */
  showLegend?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function CrewMap({
  memberIds,
  activity,
  height,
  showLegend = true,
  style,
  testID,
}: CrewMapProps) {
  const t = useT();
  const { territories, isReal, failed, signedOut, loading } = useRealTerritories(
    memberIds,
    activity,
  );

  // `?? []` : `territoryStateLayers` ne consulte JAMAIS de démo, et lui passer
  // `null` n'existe pas dans son contrat. Une carte vide EST la vérité.
  const painted = territories ?? [];
  const layers = useMemo(
    () => territoryStateLayers(FULL_EMPHASIS, 'dark', null, painted),
    [painted],
  );

  /**
   * L'EMPRISE DU CREW = les territoires TENUS par le crew (moi + membres actifs),
   * y compris ceux qui sont DISPUTÉS — une zone qu'on défend est une zone qu'on
   * tient. C'est sur elle qu'on cadre et c'est son absence qui déclenche l'état
   * vide, dont la phrase (« Ton crew ne tient encore aucune zone ») est une
   * affirmation absolue : elle doit être vraie de TOUT ce que la carte montre.
   * Les rivaux restent PEINTS (c'est du réel, la carte doit le montrer) : les
   * cacher ferait croire à un terrain libre. Seuls le cadrage et la phrase
   * regardent l'emprise.
   */
  const ours = useMemo(
    // `heldByCrew` et NON `status === 'crew'` : `territoryRole` rend 'contested'
    // AVANT tout test de propriété (territoriesSource.ts), donc une zone TENUE
    // PAR LE CREW mais disputée sortait de cette liste tout en restant peinte.
    // L'écran affirmait alors « aucune zone » par-dessus la carte qui montrait
    // le terrain du crew. La couleur reste violette — c'est juste, le contesté
    // prime — mais le COMPTE d'emprise, lui, lit la propriété.
    () => (territories === null ? null : territories.filter((ter) => heldByCrew(ter, memberIds))),
    [territories, memberIds],
  );
  const bounds = useMemo(
    // Rien à nous mais du rival visible : on cadre sur ce qu'il y a plutôt que
    // d'ouvrir sur le globe — la carte reste lisible, et elle reste vraie.
    () => boundsOf(ours, FIT_PADDING_PX) ?? boundsOf(territories, FIT_PADDING_PX),
    [ours, territories],
  );

  /**
   * LA PHRASE POSÉE SUR LA CARTE. `null` = on ne sait pas encore quoi dire, donc
   * on ne dit rien (jamais une phrase démentie à la frame suivante).
   *
   * L'ordre compte : `memberIds === null` passe AVANT tout le reste — sans
   * roster, les zones du crew seraient peintes en rival, et aucune phrase ne
   * rattraperait cette couleur-là.
   */
  const note =
    memberIds === null
      ? C.mapRosterUnknown
      : loading
        ? C.mapReading
        : failed
          ? C.mapFailed
          : signedOut
            ? C.mapSignedOut
            : isReal && ours !== null && ours.length === 0
              ? C.mapNoGround
              : null;

  return (
    <View style={[styles.root, { height }, style]} testID={testID}>
      {/* Aucune interaction : ni tap (qui désignerait un membre), ni marqueur,
          ni bouton 2D/3D — E44 est une LECTURE d'emprise, pas un poste de
          pilotage. La navigation de carte vit dans l'onglet Carte. */}
      <RealMap bounds={bounds} geojsonLayers={layers} style={styles.map} />

      {note ? (
        <View style={styles.noteWrap} pointerEvents="none">
          <Text style={styles.note}>{t(note)}</Text>
        </View>
      ) : null}

      {/* ── LÉGENDE LIMITÉE (spec E44) : TROIS rôles, et rien d'autre. Pas de
          nom de crew, pas de couleur d'équipe, pas de statut de decay — une
          légende qui explique tout n'explique plus rien (§A, < 3 s). ── */}
      {showLegend ? (
        <View style={styles.legend} pointerEvents="none">
          <LegendChip color={gameColors.crew} label={t(C.mapLegendOurs)} />
          <LegendChip color={gameColors.rival} label={t(C.mapLegendRival)} />
          <LegendChip color={gameColors.contested} label={t(C.mapLegendContested)} />
        </View>
      ) : null}
    </View>
  );
}

/** Une pastille de RÔLE. La couleur y est portée par un carré ET par un mot :
 *  une légende qui repose sur la seule teinte est illisible en daltonisme. */
function LegendChip({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendChip}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      {/* Pas de `numberOfLines` : un mot de légende coupé est une légende
          fausse (§A.9). Les trois libellés sont courts dans les 5 langues. */}
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.carbone,
  },
  map: { flex: 1 },
  noteWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  note: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  legend: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    // Fond sombre TOUJOURS, y compris sur un fond de carte clair : le libellé
    // est blanc et la charte interdit blanc/chartreuse sur clair.
    backgroundColor: colors.noir,
  },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
  },
});
