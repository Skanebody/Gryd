/**
 * GRYD — E13 « Recherche de lieu » (`/map/search`, spec produit UI/UX l.926).
 *
 * ─── CE QUE CET ÉCRAN FAIT, ET LE SEUL GESTE QU'IL PROPOSE ──────────────────
 * Spec, mot pour mot : « La recherche sert à déplacer la carte ou planifier,
 * JAMAIS à publier la position. » Choisir une ligne fait UNE chose : demander à
 * la carte de se cadrer sur ce lieu (`requestPlaceFocus`) et revenir. Aucun
 * claim, aucune publication, aucune ouverture de ville — le claim est serveur
 * (constitution 4), et ouvrir une ville a son propre écran (`CityPicker`).
 *
 * ─── §A : 1 ÉCRAN = 1 DÉCISION, 0 CTA CHARTREUSE ───────────────────────────
 * La décision est « où va la carte ». Il n'y a donc AUCUN bouton chartreuse
 * plein ici : les lignes SONT l'action. Le seul autre poussoir est « Effacer
 * l'historique », un libellé discret qui n'apparaît que s'il y a un historique
 * à effacer.
 *
 * ⚠️ ET AUCUN « RÉESSAYER » sur l'état d'échec, contrairement au premier jet :
 * il aurait été mort. Le motif complet est écrit à l'endroit où le bouton aurait
 * dû se trouver.
 *
 * ─── LES CINQ ÉTATS DE LA RECHERCHE, RENDUS SÉPARÉMENT ─────────────────────
 * `idle` (proches + récentes) · `too-short` · `searching` · `results` · `empty`
 * · `failed`. La décision est PURE et testée (`placeSearch.ts:placeSearchPhase`)
 * — cet écran ne fait que peindre le verdict. « échec de recherche » et « aucun
 * résultat » ont deux blocs distincts, et c'est tout l'intérêt de l'écran.
 *
 * Les deux sources annexes ont AUSSI leurs états, et ils ne se mélangent pas :
 *   · PROCHES  — sans position connue on ne propose RIEN, on le dit
 *                (`nearbyNoPosition`). On ne demande pas la permission depuis
 *                cet écran : on lit la position seulement si elle a DÉJÀ été
 *                accordée ailleurs (le GO la demande, à sa place) ;
 *   · RÉCENTES — « lecture en cours » ≠ « aucune recherche ». Tant que le
 *                stockage n'a pas répondu, on ne dit pas que l'historique est
 *                vide.
 *
 * ─── ZÉRO DONNÉE EU FACTICE (constitution 8) ───────────────────────────────
 * Chercher « Berlin » rend un LIEU : un nom, un pays, une distance. Aucun
 * territoire, aucun crew, aucun classement n'est peint pour ce lieu — et la
 * seule chose affirmée sur son aire de jeu l'est UNIQUEMENT si `city_zones` a
 * été lu (`placeOpenness`, troisième cran `unknown`).
 *
 * ─── VIE PRIVÉE ────────────────────────────────────────────────────────────
 * Rien ne quitte l'appareil : le référentiel est embarqué (aucun géocodeur — la
 * justification complète vit en tête de `placeSearch.ts`), l'historique est
 * local, et l'event PostHog ne transporte ni le terme cherché ni le lieu choisi.
 * Un lieu situé dans une zone floutée n'entre jamais dans l'historique, et
 * l'écran EXPLIQUE cette absence (`recentPrivacyNote`) — sans quoi elle passerait
 * pour un bug.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  colors,
  fontSizes,
  iconSizes,
  radii,
  sizes,
  spacing,
  typography,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { C } from '../../i18n/catalog/placeSearch';
import { useLocale, useT } from '../../i18n/store';
import { Icon } from '../../ui/Icon';
import { SectionLabel } from '../../ui/SectionLabel';
import { StackScreen } from '../../ui/StackScreen';
import { useCityCatalog } from '../city/useCityCatalog';
import { usePrivacyZones } from '../privacy/zonesStore';
import { checkForegroundPermission, getCurrentPositionOnce } from '../run/gps/provider';
import { CITY_SCALE_ZOOM, type LatLngPoint } from './realAnchors';
import { requestPlaceFocus } from './placeFocus';
import { usePlaceRecents } from './placeRecents';
import {
  admitToRecents,
  formatPlaceDistanceKm,
  nearbyPlaceEntries,
  placeSearchPhase,
  searchPlaces,
  toPlaceResults,
  type PlaceEngineState,
  type PlacePrivacyKnowledge,
  type PlaceResult,
} from './placeSearch';

/** D'où vient le lieu choisi — vocabulaire FERMÉ, miroir de l'event. */
type PickSource = 'nearby' | 'recent' | 'query';

export function PlaceSearchScreen() {
  const t = useT();
  const locale = useLocale();
  const [query, setQuery] = useState('');

  // ── La source des lieux : l'index déjà construit ailleurs ────────────────
  // `useCityCatalog` fusionne le référentiel EMBARQUÉ (toujours là, hors ligne
  // compris) et ce que le serveur dit des villes OUVERTES. On ne le réécrit pas.
  const catalog = useCityCatalog();
  /**
   * A-t-on RÉELLEMENT lu `city_zones` ? Sans cette lecture, toutes les villes
   * ressortent `referenced` de l'index — l'afficher tel quel peindrait « pas
   * encore un terrain de jeu » SUR PARIS, qui l'est. Une puce est une
   * affirmation ; sans lecture, il n'y en a aucune.
   */
  const serverRead = catalog.state === 'ready';

  /**
   * État du MOTEUR. Le référentiel est embarqué, donc `ready` dès que l'index
   * porte au moins une ville. `unavailable` n'est pas décoratif : un paquet
   * illisible rendrait un index VIDE, et l'écran doit alors dire « recherche
   * impossible » — pas « aucun lieu ne correspond ».
   */
  const engine: PlaceEngineState =
    catalog.index.open.length + catalog.index.referenced.length > 0 ? 'ready' : 'unavailable';

  // ── Position : LUE seulement si la permission est DÉJÀ accordée ──────────
  /**
   * On ne déclenche AUCUNE demande de permission depuis cet écran. Le GO la
   * demande, à sa place et pour une raison que le joueur comprend ; la faire
   * surgir sur une recherche de lieu serait la demander pour un service qu'on
   * peut rendre sans elle. Trois issues, et une seule autorise « proches ».
   */
  const [position, setPosition] = useState<LatLngPoint | null>(null);
  const [positionRead, setPositionRead] = useState<'reading' | 'done'>('reading');
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const perm = await checkForegroundPermission();
        if (cancelled) return;
        if (perm.status !== 'granted') {
          setPositionRead('done');
          return;
        }
        const fix = await getCurrentPositionOnce();
        if (cancelled) return;
        if (fix) setPosition({ lat: fix.lat, lng: fix.lng });
      } catch {
        // `getCurrentPositionOnce` ne lève pas ; ceinture de plus.
      } finally {
        if (!cancelled) setPositionRead('done');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Zones floutées : la règle de vie privée de l'historique ──────────────
  const zonesRead = usePrivacyZones();
  /**
   * `PrivacyZonesRead` (5 états d'écran) → ce dont le moteur a besoin (sait /
   * ne sait pas). `no-account` COMPTE comme « su » : les zones sont stockées par
   * compte, donc sans compte il n'en existe aucune à honorer — c'est le même
   * arbitrage que `zonesForPublication` (features/privacy/zones.ts), pas une
   * facilité.
   */
  const privacy: PlacePrivacyKnowledge = useMemo(() => {
    if (zonesRead.status === 'ready') return { known: true, zones: zonesRead.zones };
    if (zonesRead.status === 'no-account') return { known: true, zones: [] };
    return { known: false };
  }, [zonesRead]);

  const recents = usePlaceRecents();

  // ── Les trois listes ─────────────────────────────────────────────────────
  const nearby = useMemo(
    () =>
      toPlaceResults(nearbyPlaceEntries(catalog.index, position), {
        serverRead,
        from: position,
      }),
    [catalog.index, position, serverRead],
  );

  const results = useMemo(
    () => searchPlaces(catalog.index, query, { serverRead, from: position }),
    [catalog.index, query, serverRead, position],
  );

  const phase = placeSearchPhase({ query, engine, results });

  // ── Analytics : l'ÉCRAN, puis le seul instant qui décide ─────────────────
  useEffect(() => {
    screen('map_place_search');
  }, []);

  /**
   * Un lieu est choisi. TROIS effets, dans cet ordre, et aucun de plus :
   *  1. la carte reçoit sa demande de cadrage (le seul geste de l'écran) ;
   *  2. le lieu entre dans l'historique — SI la règle de vie privée l'admet ;
   *  3. l'event part, SANS le terme cherché ni le lieu ni ses coordonnées.
   */
  const pick = useCallback(
    (place: PlaceResult, source: PickSource) => {
      haptics.light();
      requestPlaceFocus(place.center, CITY_SCALE_ZOOM);
      if (admitToRecents(place.center, privacy) === 'record') {
        recents.remember({
          cityId: place.cityId,
          label: place.label,
          lat: place.center.lat,
          lng: place.center.lng,
        });
      }
      track(EVENTS.placeSearchResultPicked, { source });
      router.back();
    },
    [privacy, recents],
  );

  const clearField = () => {
    haptics.light();
    setQuery('');
  };

  return (
    <StackScreen title={t(C.screenTitle)} icon="pin" backHref="/(tabs)">
      {/* ── LE CHAMP, en haut (spec : « champ en haut ») ───────────────── */}
      <View style={styles.fieldRow}>
        <TextInput
          style={styles.field}
          value={query}
          onChangeText={setQuery}
          placeholder={t(C.fieldPlaceholder)}
          placeholderTextColor={colors.gris}
          accessibilityLabel={t(C.fieldA11y)}
          autoCorrect={false}
          autoCapitalize="words"
          returnKeyType="search"
          // Pas d'autofocus : l'écran doit d'abord se LIRE (proches, récentes)
          // avant qu'un clavier n'en mange la moitié (§A, « comprendre en < 3 s »).
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.clearFieldA11y)}
            onPress={clearField}
            hitSlop={10}
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
          >
            {/* Icône du jeu partagé — pas un « × » typographique (charte §F). */}
            <Icon name="fermer" size={iconSizes.sm} color={colors.gris} />
          </Pressable>
        ) : null}
      </View>

      {/* ── LE VERDICT DE PHASE ─────────────────────────────────────────── */}
      {phase.kind === 'too-short' ? (
        <Text style={styles.note}>{t(C.queryTooShort, { n: phase.min })}</Text>
      ) : null}

      {phase.kind === 'searching' ? <Text style={styles.note}>{t(C.searching)}</Text> : null}

      {phase.kind === 'failed' ? (
        <View style={styles.block}>
          {/* ÉCHEC — jamais présenté comme « aucun résultat ». */}
          <Text style={styles.blockTitle} accessibilityRole="alert">
            {t(C.failedTitle)}
          </Text>
          <Text style={styles.note}>{t(C.failedBody)}</Text>
          {/*
            ⚠️ AUCUN BOUTON « RÉESSAYER » ICI, ET C'EST DÉLIBÉRÉ — il en portait
            un, qui aurait été MORT (constitution 2). Le référentiel est décodé
            par `parsePackedCitiesCached`, dont le cache est PERMANENT pour la
            durée du process (packages/shared/src/cities.ts:95) : s'il a rendu
            une liste vide une fois, il rendra la même à chaque appel. Un
            « Réessayer » rebranché sur `catalog.reload()` aurait rechargé
            `city_zones` — ce qui ne répare RIEN ici, puisque l'échec ne vient
            pas de là — et le joueur aurait tapé indéfiniment sur un bouton qui
            ne peut pas aboutir. On dit ce qui se passe, on ne peint pas une
            issue qui n'existe pas. `C.retry` reste donc NON RENDU par cet
            écran ; c'est noté dans le catalogue.
          */}
        </View>
      ) : null}

      {phase.kind === 'empty' ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t(C.noResultTitle)}</Text>
          <Text style={styles.note}>{t(C.noResultBody)}</Text>
        </View>
      ) : null}

      {phase.kind === 'results' ? (
        <>
          <SectionLabel style={styles.kicker}>{t(C.resultsKicker)}</SectionLabel>
          {phase.results.map((place) => (
            <PlaceRow
              key={place.cityId}
              place={place}
              locale={locale}
              onPress={() => pick(place, 'query')}
            />
          ))}
        </>
      ) : null}

      {/* ── PROCHES + RÉCENTES : seulement quand rien n'est tapé ────────── */}
      {phase.kind === 'idle' ? (
        <>
          <SectionLabel style={styles.kicker}>{t(C.nearbyKicker)}</SectionLabel>
          {positionRead === 'reading' ? (
            // LECTURE EN COURS — n'affirme rien sur ce qu'on trouvera.
            <Text style={styles.note}>{t(C.nearbyLoading)}</Text>
          ) : !position ? (
            // Sans fix, « proche » n'a pas de sens : on ne propose AUCUNE liste.
            <Text style={styles.note}>{t(C.nearbyNoPosition)}</Text>
          ) : nearby.length === 0 ? (
            // Position connue, mais hors du référentiel embarqué (hors Europe).
            <Text style={styles.note}>{t(C.nearbyEmpty)}</Text>
          ) : (
            nearby.map((place) => (
              <PlaceRow
                key={place.cityId}
                place={place}
                locale={locale}
                onPress={() => pick(place, 'nearby')}
              />
            ))
          )}

          <SectionLabel style={styles.kicker}>{t(C.recentKicker)}</SectionLabel>
          {!recents.loaded ? (
            // « je lis l'historique » ≠ « tu n'as rien cherché ».
            <Text style={styles.note}>{t(C.recentLoading)}</Text>
          ) : recents.items.length === 0 ? (
            <Text style={styles.note}>{t(C.recentEmpty)}</Text>
          ) : (
            <>
              {recents.items.map((r) => (
                <PlaceRow
                  key={r.cityId}
                  place={{
                    cityId: r.cityId,
                    label: r.label,
                    center: { lat: r.lat, lng: r.lng },
                    // Une récente ne REJOUE pas une affirmation d'aire de jeu :
                    // elle a pu être enregistrée avant que la ville n'ouvre (ou
                    // ne ferme). On ne peint donc aucune puce sur ces lignes.
                    openness: 'unknown',
                    distanceKm: null,
                  }}
                  locale={locale}
                  onPress={() =>
                    pick(
                      {
                        cityId: r.cityId,
                        label: r.label,
                        center: { lat: r.lat, lng: r.lng },
                        openness: 'unknown',
                        distanceKm: null,
                      },
                      'recent',
                    )
                  }
                />
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.recentClearA11y)}
                onPress={() => {
                  haptics.light();
                  recents.clear();
                }}
                style={({ pressed }) => [styles.textButton, pressed && styles.pressed]}
              >
                <Text style={styles.textButtonLabel}>{t(C.recentClear)}</Text>
              </Pressable>
            </>
          )}

          {/* L'ABSENCE S'EXPLIQUE (spec E13, §12) : sans cette ligne, un lieu qui
              ne s'inscrit pas dans l'historique passe pour un bug. */}
          <Text style={styles.footnote}>{t(C.recentPrivacyNote)}</Text>
        </>
      ) : null}

      {/* CE QUE LA RECHERCHE COUVRE — et le fait que rien ne part du téléphone.
          En pied de page : c'est une explication, pas la décision de l'écran. */}
      <Text style={styles.footnote}>{t(C.coverageNote)}</Text>
    </StackScreen>
  );
}

/**
 * Une ligne de lieu. Volontairement PAS `ui/ListRow` : cette ligne n'a ni
 * plaque d'icône chartreuse (la chartreuse dit « moi / mon crew », §C — une
 * ville d'Europe n'est ni l'un ni l'autre), ni chevron (elle ne mène pas à un
 * écran, elle déplace la carte). Elle en garde la géométrie : ≥ 44 pt de cible
 * tactile RÉELLE, et AUCUN texte tronqué par « … » (§A9).
 */
function PlaceRow({
  place,
  locale,
  onPress,
}: {
  place: PlaceResult;
  locale: string;
  onPress: () => void;
}) {
  const t = useT();
  const parts: string[] = [];
  if (place.distanceKm !== null) {
    parts.push(t(C.resultDistance, { km: formatPlaceDistanceKm(place.distanceKm, locale) }));
  }
  // AUCUNE puce quand l'aire de jeu n'a PAS été lue (`unknown`) : affirmer
  // « pas encore un terrain de jeu » sans lecture serveur serait un mensonge.
  if (place.openness === 'open') parts.push(t(C.resultOpenHere));
  else if (place.openness === 'not-open') parts.push(t(C.resultNotOpenYet));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${place.label} — ${t(C.resultOpenA11y)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{place.label}</Text>
      {parts.length > 0 ? <Text style={styles.rowMeta}>{parts.join(' · ')}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ── Champ ────────────────────────────────────────────────────────────────
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  field: {
    flex: 1,
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.carbone,
    color: colors.blanc,
    fontSize: fontSizes.md,
  },
  clear: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Sections ─────────────────────────────────────────────────────────────
  kicker: { marginTop: spacing.lg, marginBottom: spacing.sm },
  block: { marginTop: spacing.md, gap: spacing.xs },
  blockTitle: { ...typography.cardTitle, color: colors.blanc },

  // ── Lignes ───────────────────────────────────────────────────────────────
  row: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.carbone,
    marginBottom: spacing.xs,
  },
  // Aucun `numberOfLines` : un nom de ville s'enroule plutôt que d'être coupé.
  rowLabel: { color: colors.blanc, fontSize: fontSizes.md },
  rowMeta: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },

  // ── Textes et poussoirs discrets ─────────────────────────────────────────
  note: { color: colors.gris, fontSize: fontSizes.sm, marginTop: spacing.xs },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: spacing.lg,
    lineHeight: 17,
  },
  textButton: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
  textButtonLabel: { color: colors.blanc, fontSize: fontSizes.sm },
  pressed: { opacity: 0.7 },
});
