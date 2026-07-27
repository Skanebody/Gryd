/**
 * GRYD — E15 « Carte des zones d'un rival » (spec produit UI/UX l.991,
 * route de spec `/player/:playerId/zones`).
 *
 * ═══ CE QUE CET ÉCRAN MONTRE, ET SURTOUT CE QU'IL NE MONTRERA JAMAIS ════════
 * Spec, mot pour mot : « carte plein écran ; header avec identité réduite ;
 * contours GÉNÉRALISÉS ; CTA de retour ; AUCUNE position actuelle ». Et §12 :
 * aucun départ, aucune arrivée, aucun horaire précis, aucune trace brute d'un
 * tiers. Cet écran tient cette frontière PAR CONSTRUCTION, pas par vigilance :
 *   · il lit `public.public_territories` (migration 0077), jamais `territories`.
 *     La vue n'expose QUE `geometry_generalized`, sans `source_run_id`, avec un
 *     `controlled_since` tronqué à l'heure, et seulement après le délai de
 *     publication (§1.5) ;
 *   · la généralisation est faite EN AMONT et est IRRÉVERSIBLE : le producteur
 *     (`supabase/functions/ingest_run/territory.ts:198`) applique `simplifyRing`
 *     (moteur `packages/engine/src/polygon.ts:663`) et PERSISTE le résultat.
 *     Rien n'est lissé ici — un lissage d'affichage ne protégerait personne,
 *     puisque la géométrie fine aurait déjà traversé le réseau ;
 *   · le type d'entrée du moteur (`RivalZoneRow`) n'a AUCUN champ `geometry` :
 *     servir la trace exacte ne compile pas.
 *
 * ═══ AUCUN FOND DE CARTE, ET C'EST UN CHOIX ════════════════════════════════
 * On dessine les contours SEULS, sur le noir de la charte — pas de rues, pas de
 * bâti. Deux raisons : (1) une emprise posée sur un plan de rues se relit comme
 * un itinéraire, ce que §12 refuse ; (2) l'écran n'a aucune décision à prendre
 * ici — c'est une lecture, pas une mission. La forme, sa taille et son âge
 * suffisent à jauger un adversaire.
 *
 * ═══ LA BASE EST VIDE (27/07/2026) ═════════════════════════════════════════
 * Aucun profil, aucun territoire. Cet écran rendra donc « joueur introuvable »
 * ou « aucun territoire public » — et c'est le comportement JUSTE, pas un
 * placeholder. Il n'existe ici aucune fixture, aucun rival d'illustration,
 * aucun contour de démonstration : deux écrans de frontière crew ont été
 * supprimés le 21/07/2026 pour exactement cette faute.
 *
 * ═══ AUCUN BOUTON MORT, UN SEUL CTA ════════════════════════════════════════
 * Le seul geste toujours offert est le RETOUR (barre d'en-tête, cible 44×44).
 * L'unique CTA chartreuse — « Réessayer » — n'apparaît QUE dans l'état d'échec,
 * le seul où réessayer a un sens. Rien à « suivre », rien à « attaquer » depuis
 * cet écran : ces actions demandent un backend cross-utilisateur qui n'existe
 * pas (O1), et les peindre serait le mensonge d'interface le plus coûteux.
 *
 * ⚠️ ATTEIGNABILITÉ RÉELLE : aucune surface de l'app ne route vers cet écran
 * aujourd'hui (même situation que `profil-rival/[handle]`, dont le CTA « VOIR
 * SES ZONES » n'est délibérément pas peint tant que son profil reste
 * indisponible). Il se rejoint par lien profond, où un état honnête vaut mieux
 * qu'un « route introuvable ».
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  EVENTS,
  colors,
  fonts,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
  withAlpha,
} from '@klaim/shared';
import { Icon } from '../../src/ui/Icon';
import { Button } from '../../src/ui/Button';
import { formatIntFor, formatKm2For } from '../../src/ui/numberFormat';
import { goBack } from '../../src/lib/nav';
import { screen, track } from '../../src/lib/analytics';
import { useLocale, useT } from '../../src/i18n/store';
import { C } from '../../src/i18n/catalog/rivalZones';
import { frameFor, type FrameRing, type MapFrame } from '../../src/features/share/mapFrame';
import { REAL_M_PER_DEG_LAT } from '../../src/features/map/realAnchors';
import { centerLatitudeOf, metersPerDegreeLng } from '../../src/features/premium/analytics/derive';
import {
  rivalZonesAnalyticsState,
  resolveRivalZonesState,
  type RivalZonesView,
} from '../../src/features/social/rivalZones';
import { useRivalZones } from '../../src/features/social/rivalZonesRead';

/** m² → km². Conversion d'unités, jamais une règle de jeu. */
const M2_PER_KM2 = 1_000_000;

/**
 * Opacité du remplissage d'une emprise rivale. Basse À DESSEIN : la forme se lit
 * par son CONTOUR (c'est lui qui est généralisé et qui dit quelque chose de
 * vrai), pas par un aplat lourd qui laisserait croire à une couverture pleine.
 */
const FILL_ALPHA = 0.16;
const STROKE_WIDTH = 1.2;

export default function RivalZonesRoute() {
  const t = useT();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ handle?: string }>();
  // Le handle est un paramètre d'URL : normalisé (minuscules, sans @) avant
  // toute requête. On ne le RÉAFFICHE jamais comme un nom tant que le profil
  // n'a pas été rendu — laisser croire qu'on a identifié quelqu'un serait faux.
  const handle = (params.handle ?? '').trim().replace(/^@/, '').toLowerCase();

  const { read, identity, reload } = useRivalZones(handle);
  // `Date.now()` est lu UNE fois par composition, et passé au moteur : l'écran
  // n'a pas d'horloge qui court, et le moteur reste pur.
  const view = useMemo<RivalZonesView>(() => resolveRivalZonesState(read, Date.now()), [read]);

  useEffect(() => {
    screen('zones_rival');
  }, []);

  // `rival_zones_viewed` : l'ÉTAT, jamais le rival (aucun id, aucun décompte —
  // un nombre de zones croisé avec l'heure de consultation situerait quelqu'un).
  // Rien pendant le chargement : un chargement n'est pas un écran vu.
  const analyticsState = rivalZonesAnalyticsState(view);
  useEffect(() => {
    if (analyticsState === null) return;
    track(EVENTS.rivalZonesViewed, { state: analyticsState });
  }, [analyticsState]);

  const name = identity?.name ?? null;

  return (
    <View style={styles.root}>
      {/* ── Header : identité RÉDUITE (un pseudo) + retour ─────────────────── */}
      <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={() => goBack()}
          accessibilityRole="button"
          accessibilityLabel={t(C.backA11y)}
          hitSlop={spacing.sm}
          style={styles.back}
        >
          {/* Chevron pointé à gauche (le tracé pointe à droite → miroir), même
              geste que la barre standard `StackScreen`. */}
          <View style={styles.mirror}>
            <Icon name="chevron" size={iconSizes.md} color={colors.blanc} />
          </View>
        </Pressable>
        <View style={styles.barText}>
          {/* §A.9 — titre de barre JAMAIS coupé par « … » : `clip` plutôt que le
              défaut RN `tail` (même règle que `StackScreen`). */}
          <Text style={styles.barTitle} numberOfLines={1} ellipsizeMode="clip">
            {t(C.screenTitle)}
          </Text>
          {name !== null ? (
            <Text style={styles.barSubtitle} numberOfLines={1}>
              {t(C.headerSubtitle, { name })}
            </Text>
          ) : null}
        </View>
      </View>

      {view.status === 'ready' ? (
        <ReadyBody view={view} name={name ?? handle} locale={locale} t={t} />
      ) : (
        <StateBody view={view} onRetry={reload} t={t} />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LA CARTE — contours généralisés, et rien d'autre
// ═══════════════════════════════════════════════════════════════════════════

type Translate = ReturnType<typeof useT>;

function ReadyBody({
  view,
  name,
  locale,
  t,
}: {
  view: Extract<RivalZonesView, { status: 'ready' }>;
  name: string;
  locale: ReturnType<typeof useLocale>;
  t: Translate;
}) {
  // Le cadre se calcule sur le slot MESURÉ : sans mesure, `frameFor` retomberait
  // sur un carré et écraserait l'emprise. Tant que la mesure n'est pas arrivée,
  // on ne dessine pas — on ne devine pas une échelle.
  const [slot, setSlot] = useState<{ w: number; h: number } | null>(null);
  const onLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSlot({ w: width, h: height });
  };

  const rings = useMemo<FrameRing[]>(() => {
    const out: FrameRing[] = [];
    for (const zone of view.zones) for (const ring of zone.rings) out.push(ring);
    return out;
  }, [view.zones]);

  const frame = useMemo<MapFrame | null>(() => {
    if (!slot) return null;
    // La latitude de SES zones, pas un ancrage parisien figé : sinon une emprise
    // lilloise serait écrasée horizontalement.
    const lat = centerLatitudeOf(rings) ?? 0;
    return frameFor(rings, slot.w / slot.h, metersPerDegreeLng(lat, REAL_M_PER_DEG_LAT), REAL_M_PER_DEG_LAT);
  }, [rings, slot]);

  const areaKm2 = formatKm2For(view.facts.totalAreaM2 / M2_PER_KM2, locale);
  const held = view.facts.oldestHeldFor;

  return (
    <>
      <View style={styles.mapSlot} onLayout={onLayout}>
        {frame ? (
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${frame.vbW} ${frame.vbH}`}
            accessibilityRole="image"
            accessibilityLabel={t(C.mapA11y, { name })}
          >
            {view.zones.map((zone) => (
              <Path
                key={zone.id}
                d={zone.rings.map((ring) => ringPath(ring, frame)).join(' ')}
                // `evenodd` : un territoire peut avoir des trous (zone privée
                // exclue, §12). Les remplir peindrait comme sien un morceau qui
                // ne l'est pas.
                fillRule="evenodd"
                // §C : la couleur dit le RÔLE (rival = orange), jamais l'identité
                // — 200 000 joueurs ne tiennent pas dans une palette de crews.
                fill={withAlpha(gameColors.rival, FILL_ALPHA)}
                stroke={gameColors.rival}
                strokeWidth={STROKE_WIDTH}
              />
            ))}
          </Svg>
        ) : null}
      </View>

      {/* ── Faits publics : les SEULS que la vue 0077 autorise ───────────────── */}
      <View style={styles.footer}>
        <View style={styles.factRow}>
          <Text style={styles.fact}>
            {view.facts.zoneCount === 1
              ? t(C.zonesHeldOne)
              : t(C.zonesHeld, { n: formatIntFor(view.facts.zoneCount, locale) })}
          </Text>
          {/* Une surface qu'on ne sait pas formater est OMISE, jamais rendue en
              « 0 » ni en « NaN » : l'absence est vraie, le zéro serait faux. */}
          {areaKm2 !== null ? <Text style={styles.fact}>{t(C.surface, { v: areaKm2 })}</Text> : null}
          {held !== null ? (
            <Text style={styles.fact}>
              {held.unit === 'h' ? t(C.sinceHours, { h: held.value }) : t(C.sinceDays, { d: held.value })}
            </Text>
          ) : null}
        </View>

        {/* Des lignes écartées faute de contour public : DITES, jamais tues —
            sinon l'écran sous-déclarerait son emprise sans le signaler. */}
        {view.unreadable > 0 ? (
          <Text style={styles.footnote}>
            {t(C.partialFootnote, { n: formatIntFor(view.unreadable, locale) })}
          </Text>
        ) : null}

        {/* La frontière de vie privée, DITE. Sans elle, l'absence de tracé passe
            pour une carte incomplète ; avec elle, c'est une garantie lisible —
            et c'en est une que le code tient (vue 0077). */}
        <Text style={styles.privacy}>{t(C.privacyNote)}</Text>
        <Text style={styles.privacy}>{t(C.noLivePosition)}</Text>
      </View>
    </>
  );
}

/** Anneau `[lng, lat]` → commande SVG fermée, dans le cadre projeté. */
function ringPath(ring: FrameRing, frame: MapFrame): string {
  let d = '';
  ring.forEach((point, i) => {
    const p = frame.project(point[0], point[1]);
    d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
  });
  return `${d}Z`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LES ÉTATS SANS CARTE — sept mondes distincts, jamais confondus
// ═══════════════════════════════════════════════════════════════════════════

function StateBody({
  view,
  onRetry,
  t,
}: {
  view: Exclude<RivalZonesView, { status: 'ready' }>;
  onRetry: () => void;
  t: Translate;
}) {
  // Chaque état a SON titre et SON corps. Aucun n'est le repli d'un autre : un
  // vide n'est pas un échec, un masquage n'est pas un vide, et un chargement
  // n'affirme rien du tout.
  switch (view.status) {
    case 'loading':
      // Aucun spinner infini, aucun écran blanc : une phrase qui dit ce qui se
      // passe, et qui ne dit RIEN du joueur observé.
      return <Panel body={t(C.loading)} />;
    case 'signed_out':
      return <Panel title={t(C.signedOutTitle)} body={t(C.signedOut)} />;
    case 'not_found':
      return <Panel title={t(C.notFoundTitle)} body={t(C.notFound)} />;
    case 'hidden':
      return <Panel title={t(C.hiddenTitle)} body={t(C.hiddenBody)} />;
    case 'unreadable':
      return <Panel title={t(C.unreadableTitle)} body={t(C.unreadableBody)} />;
    case 'empty':
      return (
        <Panel title={t(C.emptyTitle)} body={t(C.emptyBody)} note={t(C.emptyPendingPublication)} />
      );
    case 'failed':
      return (
        <Panel title={t(C.failedTitle)} body={t(C.failedBody)}>
          {/* L'UNIQUE CTA chartreuse de l'écran, et il n'existe que là où
              réessayer a un sens (§A4). */}
          <Button label={t(C.retry)} onPress={onRetry} analyticsId="rival_zones_retry" />
        </Panel>
      );
  }
}

function Panel({
  title,
  body,
  note,
  children,
}: {
  title?: string;
  body: string;
  note?: string;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <View style={styles.stateWrap}>
      {/* Plaque de RÔLE « rival » (orange), vide : aucune emprise n'est dessinée,
          et on ne peint pas un contour d'illustration à la place. */}
      <View style={styles.roleMark}>
        <Icon name="carte" size={iconSizes.lg} color={gameColors.rival} />
      </View>
      <View style={styles.statePanel}>
        {title !== undefined ? <Text style={styles.stateTitle}>{title}</Text> : null}
        <Text style={styles.stateBody}>{body}</Text>
        {note !== undefined ? <Text style={styles.stateNote}>{note}</Text> : null}
      </View>
      {children !== undefined ? <View style={styles.stateCta}>{children}</View> : null}
      {/* La garantie de vie privée reste vraie DANS TOUS LES ÉTATS — elle n'est
          pas une décoration de l'état « carte rendue ». */}
      <Text style={styles.privacy}>{t(C.noLivePosition)}</Text>
    </View>
  );
}

const ROLE_MARK_PX = 72;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },

  // Barre d'en-tête : identité RÉDUITE. Pas d'avatar, pas de niveau, pas de
  // crew — la spec dit « identité réduite », et un pseudo suffit à savoir de qui
  // on regarde la carte.
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  // Cible tactile RÉELLE 44×44 (plancher a11y), pas seulement l'icône.
  back: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.sm,
  },
  barText: { flex: 1 },
  barTitle: { color: colors.blanc, fontSize: fontSizes.md, fontFamily: fonts.displaySemi },
  barSubtitle: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },

  // La carte prend tout ce qui reste : c'est l'écran (« carte plein écran »).
  mapSlot: { flex: 1 },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  factRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xxs },
  fact: { color: colors.blanc, fontSize: fontSizes.sm, fontFamily: fonts.textSemi },
  footnote: { color: colors.gris, fontSize: fontSizes.xs },
  privacy: { color: colors.grisFaible, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5 },

  // Les états sans carte occupent la même place que la carte : l'écran ne se
  // vide pas, il DIT quelque chose.
  stateWrap: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    gap: spacing.md,
  },
  roleMark: {
    width: ROLE_MARK_PX,
    height: ROLE_MARK_PX,
    borderRadius: ROLE_MARK_PX / 2,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(gameColors.rival, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(gameColors.rival, 0.4),
  },
  // Surface N1 : rien à taper, tout à lire. Aucune card dans une card (§A).
  statePanel: {
    backgroundColor: withAlpha(colors.blanc, 0.04),
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  stateTitle: { color: colors.blanc, fontSize: fontSizes.md, fontFamily: fonts.display },
  stateBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.6 },
  stateNote: { color: colors.grisFaible, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5 },
  stateCta: { marginTop: spacing.xxs },
  // Miroir horizontal du chevron (le tracé de l'icône pointe à droite).
  mirror: { transform: [{ scaleX: -1 }] },
});
