/**
 * GRYD — E66 « ANALYSE TERRITORIALE » (route `/premium-analytics`).
 *
 * ══ RÈGLE CONSTITUTIONNELLE, ÉCRITE ICI PARCE QU'ELLE S'APPLIQUE ICI ═══════
 * ANTI PAY-TO-WIN STRICT (§1.6) : **cet écran ne donne aucune capacité de jeu.**
 * Pas un mètre carré de territoire, pas un point, pas une protection, pas une
 * priorité de classement, pas une immunité. Il LIT ce que le joueur a déjà fait
 * et le lui explique — ce que §1.6 range explicitement dans le vendable
 * (« analyses avancées, outils de planification et de replay »). Un joueur Club
 * et un joueur gratuit qui courent la même boucle obtiennent EXACTEMENT le même
 * territoire. Le jour où une valeur de cette page entrerait dans le moteur, ce
 * serait un défaut de conformité, pas une feature.
 *
 * ══ §12 / E66 : « pas pour espionner » ════════════════════════════════════
 * La spec : « Aucune information privée sur les rivaux. Le Premium aide à
 * comprendre SON PROPRE territoire, pas à espionner. » Cet écran n'affiche RIEN
 * d'autrui : la lecture est bornée à `owner_id = moi` et les colonnes
 * d'assaillant ne sont même pas demandées au serveur (`analytics/read.ts`). On
 * sait qu'une zone est attaquée et QUAND il faut la défendre ; on ne sait ni
 * par qui, ni d'où, ni à quelle heure l'autre court.
 *
 * ══ LA « HEATMAP » EST UNE VRAIE CARTE, D'UNE VRAIE GRANDEUR ══════════════
 * Le catalogue Arsenal vend « stats avancées + heatmap ». Une heatmap classique
 * (densité de passages) exigerait les polylignes brutes de toutes les sorties :
 * elles ne sont pas lues ici, et les fabriquer serait exactement l'interdit de
 * CLAUDE.md. Ce qui est peint est donc ce qui EXISTE : MES polygones
 * (`territories.geometry`, migration 0074), projetés par le cadrage déjà écrit
 * et déjà testé de `share/mapFrame.frameFor`, et coloriés par une grandeur
 * MESURÉE — la durée de contrôle (`now − controlled_since`).
 * §C « couleurs par RÔLE » est respecté à la lettre : une seule teinte (celle
 * de MON rôle, chartreuse en course / vert vélo en Bike), et c'est l'OPACITÉ qui
 * porte l'intensité — jamais une couleur par zone. Quand l'écart de durée est
 * nul (tout vient d'être capturé), il n'y a pas de dégradé et l'écran LE DIT au
 * lieu d'en inventer un.
 *
 * ══ CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS ════════════════════════════════
 * chargement · pas connecté · pas (encore) Club · échec de lecture · lu.
 * Et dans « lu », le vide RÉEL — le cas d'aujourd'hui, la base étant vide — a
 * son propre écran : « pas encore de territoire », jamais une heatmap de
 * démonstration ni un « 0 » nu. §A : un seul CTA chartreuse, et il n'existe que
 * dans l'état où il peut aboutir (aucun bouton mort).
 *
 * ══ CE QUE CET ÉCRAN NE MONTRE PAS, ET POURQUOI (écart assumé) ════════════
 * LES PERTES DE TERRITOIRE. À l'échéance d'une contestation,
 * `resolve_due_contests` (0080) réécrit le propriétaire ; la policy de 0078
 * ouvre la ligne au défenseur *via le territoire*, donc l'ancien propriétaire
 * cesse de voir la contestation qui l'a dépossédé, et aucune table n'historise
 * la propriété. « Tu as perdu N zones » est donc INTENABLE. On l'écrit
 * (`lossesUnavailable`) plutôt que d'afficher un « 0 perte » qui flatterait en
 * mentant. Même doctrine que l'écart n° 2 de `app/performance.tsx`.
 *
 * Analytics : `$screen premium_analytics` à l'ouverture ; `paywall_view` (§8,
 * nom exact d'`events.ts`) UNIQUEMENT quand l'écran se présente à un
 * non-abonné — c'est là, et seulement là, qu'il joue le rôle d'un paywall.
 */
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import {
  EVENTS,
  colors,
  fonts,
  fontSizes,
  gameColors,
  radii,
  sizes,
  spacing,
  withAlpha,
  type Activity,
} from '@klaim/shared';
import {
  longestFinishedReign,
  type TerritoryHistory,
} from '../src/features/premium/analytics';
import { C } from '../src/i18n/catalog/premiumAnalytics';
import { useLocale, useT } from '../src/i18n/store';
import { screen, track } from '../src/lib/analytics';
import { formatIntFor } from '../src/ui/numberFormat';
import { Button } from '../src/ui/Button';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { ActivitySwitch, useActivityLens } from '../src/ui/ActivitySwitch';
import { startSortieHref } from '../src/ui/activityLens';
import { REAL_M_PER_DEG_LAT } from '../src/features/map/realAnchors';
import { frameFor, type FrameRing } from '../src/features/share/mapFrame';
import {
  centerLatitudeOf,
  heatRings,
  metersPerDegreeLng,
  useTerritoryAnalytics,
  type TerritoryAnalytics,
  type ZoneAnalytics,
} from '../src/features/premium/analytics';
import type { Entry, Locale } from '../src/i18n/types';

/**
 * Aspect du cadre de la carte (largeur / hauteur). CONSTANTE DE MISE EN PAGE,
 * pas une règle de jeu : elle ne décide de rien, elle cadre. `frameFor` garantit
 * qu'aucun territoire n'est coupé quel que soit ce ratio.
 */
const HEAT_ASPECT = 1.6;

/**
 * Opacités entre lesquelles la durée de contrôle est déclinée. Deux bornes, une
 * seule teinte : c'est §C « la couleur dit le RÔLE, l'opacité dit la force ».
 * Le plancher n'est pas 0 — une zone que je tiens depuis ce matin doit rester
 * VISIBLE, sinon la carte omettrait une zone réellement possédée.
 */
const HEAT_ALPHA_MIN = 0.22;
const HEAT_ALPHA_MAX = 0.9;
/** Teinte d'une zone dont la durée est INCONNUE : neutre, jamais chaude. */
const HEAT_ALPHA_UNKNOWN = 0.12;

/** La fonction de traduction, telle que `useT()` la rend — passée aux sous-vues. */
type Translate = (entry: Entry, vars?: Record<string, string | number>) => string;

const MS_PER_HOUR = 3_600_000;
const M2_PER_HECTARE = 10_000;

/**
 * Surfaces en HECTARES, et pas en km². Un hexagone de capture fait
 * `OFFENSIVE_HEX_AREA_KM2` = 0,015 km² : en km², un territoire réel s'écrirait
 * « 0,1 » et se lirait comme un zéro. L'hectare est l'unité à laquelle ces
 * chiffres DISENT quelque chose. L'unité elle-même (« ha ») est invariante et
 * n'est donc pas traduite.
 */
function hectares(areaM2: number): number {
  return areaM2 / M2_PER_HECTARE;
}

/** Heure locale « hh:mm » sans `Intl` (Hermes n'embarque pas ICU). */
function clockOf(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Date LISIBLE d'un instant, dans la langue du joueur. Le mois est écrit en
 * toutes lettres : « du 4 mars au 4 septembre » se lit, « du 04/03 au 04/09 »
 * se déchiffre — et c'est une phrase de mémoire, pas un tableau.
 */
function dayOf(ms: number, locale: Locale): string {
  return new Date(ms).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Anneau projeté → commande SVG fermée. */
function ringPath(ring: FrameRing, project: (lng: number, lat: number) => { x: number; y: number }): string {
  let d = '';
  ring.forEach((point, i) => {
    const p = project(point[0], point[1]);
    d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)} `;
  });
  return `${d}Z`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LA CARTE DE CHALEUR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `zones` ne doit contenir QUE des zones TENUES et dessinables — l'appelant les
 * filtre (`mapZones`). Une zone éteinte peinte dans la teinte « moi » se lirait
 * comme un territoire encore possédé : ce serait la carte qui ment, pas les
 * chiffres. Les zones éteintes sont dites en toutes lettres plus bas
 * (`deadZones`), là où elles ne peuvent pas être prises pour du territoire.
 */
function HeatMap({
  zones,
  tint,
  label,
}: {
  zones: readonly ZoneAnalytics[];
  tint: string;
  label: string;
}) {
  const frame = useMemo(() => {
    const rings = heatRings(zones);
    // La latitude de MES zones, pas celle d'un ancrage parisien figé : sinon un
    // territoire lillois serait écrasé horizontalement (cf. `metersPerDegreeLng`).
    const lat = centerLatitudeOf(rings) ?? 0;
    return frameFor(rings, HEAT_ASPECT, metersPerDegreeLng(lat, REAL_M_PER_DEG_LAT), REAL_M_PER_DEG_LAT);
  }, [zones]);

  if (zones.length === 0) return null;

  return (
    <View style={styles.heatFrame} accessibilityRole="image" accessibilityLabel={label}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${frame.vbW} ${frame.vbH}`}>
        {zones.map((zone) => {
          const alpha =
            zone.heat === null
              ? HEAT_ALPHA_UNKNOWN
              : HEAT_ALPHA_MIN + zone.heat * (HEAT_ALPHA_MAX - HEAT_ALPHA_MIN);
          const d = zone.rings.map((ring) => ringPath(ring, frame.project)).join(' ');
          return (
            <Path
              key={zone.id}
              d={d}
              // `evenodd` : un territoire peut avoir des trous (parc fermé,
              // zone de confidentialité). Les remplir peindrait comme mien un
              // morceau qui ne l'est pas.
              fillRule="evenodd"
              fill={withAlpha(tint, alpha)}
              stroke={tint}
              strokeWidth={0.8}
              strokeOpacity={0.85}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function HeatLegend({ tint, lowLabel, highLabel }: { tint: string; lowLabel: string; highLabel: string }) {
  return (
    <View style={styles.legend}>
      <Text style={styles.legendText}>{lowLabel}</Text>
      <View style={styles.legendBar}>
        {[0, 0.25, 0.5, 0.75, 1].map((step) => (
          <View
            key={step}
            style={[
              styles.legendStep,
              { backgroundColor: withAlpha(tint, HEAT_ALPHA_MIN + step * (HEAT_ALPHA_MAX - HEAT_ALPHA_MIN)) },
            ]}
          />
        ))}
      </View>
      <Text style={styles.legendText}>{highLabel}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// BRIQUES D'ÉTAT (même grammaire que /performance : une seule dans l'app)
// ═══════════════════════════════════════════════════════════════════════════

function StateBlock({
  title,
  body,
  note,
  ctaLabel,
  onPress,
  ctaVariant = 'primary',
  analyticsId,
}: {
  title: string;
  body: string;
  note?: string;
  ctaLabel?: string;
  onPress?: () => void;
  ctaVariant?: 'primary' | 'ghost';
  analyticsId?: string;
}) {
  return (
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {note ? <Text style={styles.stateNote}>{note}</Text> : null}
      {ctaLabel && onPress ? (
        <Button
          label={ctaLabel}
          variant={ctaVariant}
          onPress={onPress}
          {...(analyticsId ? { analyticsId } : {})}
        />
      ) : null}
    </View>
  );
}

/** Une métrique : chiffre héros + son libellé. Jamais de card dans une card (§A). */
function Metric({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricValueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        {unit ? <Text style={styles.metricUnit}>{unit}</Text> : null}
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LE CORPS « LU, ET NON VIDE »
// ═══════════════════════════════════════════════════════════════════════════

function AnalyticsBody({
  data,
  history,
  computedAtMs,
  activity,
  locale,
  t,
}: {
  data: TerritoryAnalytics;
  /** `null` = le serveur n'a pas rendu d'histoire. JAMAIS « rien tenu ». */
  history: TerritoryHistory | null;
  computedAtMs: number;
  activity: Activity;
  locale: Locale;
  t: Translate;
}) {
  // §C : la teinte dit le RÔLE (« moi »), et les deux univers ne se mélangent
  // jamais — la lentille Bike remplace la teinte, elle ne l'additionne pas.
  const tint = activity === 'bike' ? gameColors.bike : gameColors.crew;
  // Ce que la carte a le droit de peindre : mes zones TENUES qui ont un contour
  // exploitable. Une zone éteinte n'est plus du territoire ; une géométrie
  // illisible ne se remplace pas par une forme inventée.
  const mapZones = useMemo(
    () => data.zones.filter((z) => z.held && z.rings.length > 0),
    [data.zones],
  );
  const heldWithHeat = data.maxControlMs !== null && data.maxControlMs > 0;

  const oldest = data.longestHeld;
  const oldestDays = oldest?.controlDays ?? null;

  return (
    <>
      {/* ── 1. LA CARTE ─────────────────────────────────────────────────── */}
      <SectionLabel style={styles.sectionLabel}>{t(C.heatLabel)}</SectionLabel>
      {mapZones.length > 0 ? (
        <>
          <HeatMap zones={mapZones} tint={tint} label={t(C.heatA11y)} />
          {heldWithHeat ? (
            <HeatLegend tint={tint} lowLabel={t(C.heatLegendNew)} highLabel={t(C.heatLegendOld)} />
          ) : (
            // Aucun écart de durée : il n'y a rien à dégrader. On le dit plutôt
            // que de peindre une échelle qui ne mesurerait rien.
            <Text style={styles.note}>{t(C.heatNoScale)}</Text>
          )}
          <Text style={styles.caption}>{t(C.heatCaption)}</Text>
        </>
      ) : data.heldZones > 0 ? (
        // Des zones TENUES, mais aucune n'a de contour lisible : on nomme la
        // vraie cause plutôt que de laisser un cadre vide sans explication.
        <Text style={styles.note}>{t(C.heatNoGeometry)}</Text>
      ) : (
        // Plus AUCUNE zone tenue : la carte serait vide parce qu'il n'y a rien à
        // peindre, pas parce qu'un contour manque. La ligne `deadZones` juste
        // en dessous dit ce qu'il est advenu — inutile d'ajouter une cause fausse.
        <Text style={styles.note}>{t(C.emptyTitle)}</Text>
      )}

      {/* ── 2. LES CHIFFRES ─────────────────────────────────────────────── */}
      <SectionLabel style={styles.sectionLabel}>{t(C.statsLabel)}</SectionLabel>
      <View style={styles.metrics}>
        <Metric value={formatIntFor(data.heldZones, locale)} label={t(C.statZones)} />
        <Metric
          value={formatIntFor(Math.round(hectares(data.heldAreaM2)), locale)}
          unit="ha"
          label={t(C.statArea)}
        />
        {oldestDays === null ? null : (
          <Metric
            value={formatIntFor(oldestDays, locale)}
            unit={t(C.unitDays)}
            label={t(C.statOldest)}
          />
        )}
      </View>
      {oldest === null ? <Text style={styles.note}>{t(C.oldestNone)}</Text> : null}
      {oldest !== null && oldestDays === 0 ? (
        <Text style={styles.note}>{t(C.underADay)}</Text>
      ) : null}
      {data.mostDefended ? (
        <Text style={styles.line}>
          {t(C.statMostDefended)} —{' '}
          {t(C.defensesCount, { n: formatIntFor(data.mostDefended.defensesWon, locale) })}
        </Text>
      ) : (
        // 0 défense n'élit pas une « zone la plus défendue » : ce serait un fait
        // d'armes inventé, et c'est exactement ce que le fondateur verrait.
        <Text style={styles.note}>{t(C.mostDefendedNone)}</Text>
      )}
      {data.deadZones > 0 ? (
        <Text style={styles.note}>
          {t(C.deadZones, { n: formatIntFor(data.deadZones, locale) })}
        </Text>
      ) : null}

      {/* ── 3. LA FENÊTRE ───────────────────────────────────────────────── */}
      <SectionLabel style={styles.sectionLabel}>
        {t(C.windowLabel, { days: formatIntFor(data.window.days, locale) })}
      </SectionLabel>
      <View style={styles.metrics}>
        <Metric value={formatIntFor(data.window.gainedZones, locale)} label={t(C.windowGained)} />
        <Metric
          value={formatIntFor(Math.round(hectares(data.window.gainedAreaM2)), locale)}
          unit="ha"
          label={t(C.windowGainedArea)}
        />
        <Metric value={formatIntFor(data.window.defensesWon, locale)} label={t(C.windowDefenses)} />
      </View>
      {/* `lossesDerivable` vaut `false` par construction (cf. l'en-tête) : la
          note est LUE du modèle, elle n'est pas une opinion de l'écran. */}
      {data.window.lossesDerivable ? null : (
        <Text style={styles.note}>{t(C.lossesUnavailable)}</Text>
      )}

      {/* ── 4. LES FRONTIÈRES ───────────────────────────────────────────── */}
      <SectionLabel style={styles.sectionLabel}>{t(C.watchLabel)}</SectionLabel>
      {data.watchlist.length === 0 ? (
        <Text style={styles.note}>{t(C.watchNone)}</Text>
      ) : (
        <View style={styles.watchList}>
          {data.watchlist.map((zone) => (
            <View key={zone.id} style={styles.watchRow}>
              <View style={[styles.watchDot, { backgroundColor: gameColors.contested }]} />
              <Text style={styles.watchZone}>
                {t(C.watchZone, { area: formatIntFor(Math.round(hectares(zone.areaM2)), locale) })}
              </Text>
              <Text style={styles.watchDeadline}>{deadlineLabel(zone, computedAtMs, locale, t)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── 5. TON HISTOIRE (0109/0110) ──────────────────────────────────
          La MÉMOIRE : « ce territoire était à toi du … au … ». C'est la seule
          chose de cette page que GRYD FABRIQUE au lieu de restituer — le
          serveur oubliait tout avant la migration 0109.

          TROIS ÉTATS, jamais confondus :
           · `null`          → on n'a pas pu lire. On le DIT, on ne se tait pas.
           · aucun règne     → lu, et ce joueur n'a encore rien tenu : on invite.
           · des règnes      → les chiffres, puis LA PHRASE.

          §A : aucun CTA ici — l'unique CTA chartreuse de l'écran vit dans l'état
          vide. Cette section se lit, elle ne demande rien. */}
      <SectionLabel style={styles.sectionLabel}>{t(C.historyLabel)}</SectionLabel>
      {history === null ? (
        <Text style={styles.note}>{t(C.historyUnavailable)}</Text>
      ) : history.reigns.length === 0 ? (
        <Text style={styles.note}>{t(C.historyEmpty)}</Text>
      ) : (
        <>
          <Text style={styles.caption}>{t(C.historyCaption)}</Text>
          <View style={styles.metrics}>
            <Metric
              value={formatIntFor(history.holdingCount, locale)}
              label={t(C.historyHolding)}
            />
            {/* « Perdu » n'apparaît QUE s'il y a eu une reprise réelle : un
                « 0 zone reprise » à quelqu'un qui n'a jamais rien perdu est un
                reproche gratuit (anti-shame). */}
            {history.lostCount > 0 ? (
              <Metric
                value={formatIntFor(history.lostCount, locale)}
                label={t(C.historyLost)}
              />
            ) : null}
            {history.longestDays === null ? null : (
              <Metric
                value={formatIntFor(history.longestDays, locale)}
                unit={t(C.unitDays)}
                label={t(C.historyLongest)}
              />
            )}
          </View>
          {/* LA PHRASE — écrite seulement si un règne est réellement TERMINÉ.
              Un règne en cours n'a pas de « au … » : le raconter obligerait à
              inventer une fin. */}
          {(() => {
            const fini = longestFinishedReign(history);
            if (fini === null || fini.endedAtMs === null) return null;
            return (
              <Text style={styles.line}>
                {t(C.historyStory, {
                  from: dayOf(fini.startedAtMs, locale),
                  to: dayOf(fini.endedAtMs, locale),
                })}
              </Text>
            );
          })()}
          {/* L'histoire NE REMONTE PAS avant le registre. Le dire est la seule
              façon de ne pas laisser croire au joueur qu'il n'avait rien tenu
              avant cette date. */}
          {history.firstKnownAtMs === null ? null : (
            <Text style={styles.footnote}>
              {t(C.historySince, { date: dayOf(history.firstKnownAtMs, locale) })}
            </Text>
          )}
        </>
      )}

      {/* ── 6. CE QUE CETTE PAGE EST, ET N'EST PAS ──────────────────────── */}
      <Text style={styles.footnote}>{t(C.scopeNote)}</Text>
      <Text style={styles.footnote}>{t(C.privacyNote)}</Text>
      <Text style={styles.footnote}>{t(C.antiP2w)}</Text>
      <Text style={styles.footnote}>{t(C.computedAt, { time: clockOf(computedAtMs) })}</Text>
    </>
  );
}

/**
 * L'échéance de défense, dite depuis l'instant du CALCUL (jamais depuis une
 * horloge de rendu) : c'est ce que `computedAt` annonce en bas d'écran, et deux
 * horloges différentes finiraient par se contredire à une minute près.
 */
function deadlineLabel(
  zone: ZoneAnalytics,
  computedAtMs: number,
  locale: Locale,
  t: Translate,
): string {
  const until = zone.underAttackUntilMs;
  if (until === null) return '';
  const remaining = until - computedAtMs;
  if (remaining <= 0) return t(C.watchDeadlinePassed);
  const hours = Math.floor(remaining / MS_PER_HOUR);
  // Sous l'heure, un « 0 h » se lirait « rien à faire » : on nomme l'urgence.
  if (hours <= 0) return t(C.watchDeadlineSoon);
  return t(C.watchDeadlineHours, { h: formatIntFor(hours, locale) });
}

// ═══════════════════════════════════════════════════════════════════════════
// L'ÉCRAN
// ═══════════════════════════════════════════════════════════════════════════

export default function PremiumAnalyticsScreen() {
  const t = useT();
  const locale = useLocale();
  // MÊME lentille que /performance (`gryd.activity.stats`) : cet écran en est le
  // prolongement, lui donner une mémoire séparée ferait diverger deux surfaces
  // que le joueur vit comme une seule.
  const { activity, setActivity, switchVisible } = useActivityLens('stats');
  const analytics = useTerritoryAnalytics(activity);
  const paywallLogged = useRef(false);

  useEffect(() => {
    screen('premium_analytics');
  }, []);

  useEffect(() => {
    // `paywall_view` (§8) UNE fois, et seulement quand l'écran joue réellement
    // le rôle d'un mur : un abonné qui consulte ses stats n'a pas vu de paywall.
    if (analytics.status === 'locked' && !paywallLogged.current) {
      paywallLogged.current = true;
      track(EVENTS.paywallView, { trigger: 'e66_analytics' });
    }
  }, [analytics.status]);

  let body: React.ReactNode;
  switch (analytics.status) {
    case 'loading':
      // Une ligne, pas un spinner plein écran. État BORNÉ : la lecture aboutit
      // ou bascule sur 'failed'. Un chargement n'affirme RIEN sur le joueur.
      body = <Text style={styles.stateInline}>{t(C.loading)}</Text>;
      break;

    case 'signedOut':
      body = (
        <StateBlock
          title={t(C.signedOutTitle)}
          body={t(C.signedOutBody)}
          // Sans backend configuré, `/sign-in` n'a personne au bout : aucun
          // bouton plutôt qu'un bouton mort.
          {...(analytics.canSignIn
            ? { ctaLabel: t(C.ctaSignIn), onPress: () => router.push('/sign-in'), analyticsId: 'e66_sign_in' }
            : {})}
        />
      );
      break;

    case 'failed':
      body = (
        <StateBlock
          title={t(C.failedTitle)}
          body={t(C.failedBody)}
          ctaLabel={t(C.ctaRetry)}
          ctaVariant="ghost"
          onPress={analytics.reload}
          analyticsId="e66_retry"
        />
      );
      break;

    case 'locked':
      // APERÇU HONNÊTE, pas un mur brutal ni une donnée floutée : on DÉCRIT ce
      // que la page calcule, sans en simuler le rendu. Une fausse heatmap
      // grisée mentirait sur son contenu — ce serait vendre une image.
      body = (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>{t(C.lockedTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.lockedBody)}</Text>
          <View style={styles.points}>
            <Point label={t(C.lockedPoint1)} />
            <Point label={t(C.lockedPoint2)} />
            <Point label={t(C.lockedPoint3)} />
          </View>
          <Text style={styles.stateNote}>{t(C.antiP2w)}</Text>
          {/* L'UNIQUE CTA chartreuse de cet état — et il aboutit : /premium
              existe et sait dire lui-même s'il peut vendre ici. */}
          <Button
            label={t(C.ctaSeePremium)}
            onPress={() => router.push('/premium')}
            analyticsId="e66_see_premium"
          />
        </View>
      );
      break;

    case 'ready':
      body =
        analytics.data === null || analytics.data.isEmpty ? (
          // Club, lu, et RIEN. C'est l'état réel aujourd'hui (la base est vide)
          // et il est VRAI : ni heatmap de démonstration, ni « 0 » nu.
          <StateBlock
            title={t(C.emptyTitle)}
            body={t(C.emptyBody)}
            note={t(C.emptyNote)}
            ctaLabel={t(C.ctaStart)}
            onPress={() => router.push(startSortieHref(activity))}
            analyticsId="e66_start_run"
          />
        ) : (
          <AnalyticsBody
            data={analytics.data}
            history={analytics.history}
            computedAtMs={analytics.computedAtMs ?? Date.now()}
            activity={activity}
            locale={locale}
            t={t}
          />
        );
      break;
  }

  return (
    <StackScreen
      title={t(C.title)}
      icon="carte"
      kicker={t(C.kicker)}
      subtitle={t(C.promise)}
      {...(switchVisible
        ? {
            headerRight: (
              <ActivitySwitch
                activity={activity}
                onChange={setActivity}
                runLabel={t(C.activityRunA11y)}
                bikeLabel={t(C.activityBikeA11y)}
                testID="premium-analytics-activity-switch"
              />
            ),
          }
        : {})}
    >
      {body}
    </StackScreen>
  );
}

/** Puce d'aperçu : une ligne, un point. Jamais une card dans une card (§A). */
function Point({ label }: { label: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointDot} />
      <Text style={styles.pointText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.xs },

  // ── Carte de chaleur ──
  heatFrame: {
    width: '100%',
    aspectRatio: HEAT_ASPECT,
    borderRadius: radii.card,
    backgroundColor: colors.carbone,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  legendBar: { flex: 1, flexDirection: 'row', height: 6, borderRadius: radii.pill, overflow: 'hidden' },
  legendStep: { flex: 1 },
  legendText: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.xs },
  caption: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.xs,
  },

  // ── Métriques ──
  metrics: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  metric: { minWidth: 88 },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  // Rôle R6 « stat » recopié à la main, comme dans `stats/StatBlock.tsx` :
  // `typography.stat` porte un `fontVariant` en LECTURE SEULE que StyleSheet
  // refuse à l'étalement (TextStyle le veut mutable). Mêmes valeurs, chiffres
  // TABULAIRES compris — sans quoi les colonnes de métriques danseraient.
  metricValue: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.xl,
    lineHeight: fontSizes.xl * 1.1,
  },
  metricUnit: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  metricLabel: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.xs, marginTop: 2 },

  line: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
  },
  note: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.sm,
  },
  footnote: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.sm,
  },

  // ── Frontières à surveiller ──
  watchList: { gap: spacing.xs },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget,
  },
  watchDot: { width: 8, height: 8, borderRadius: 4 },
  watchZone: { flex: 1, color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.sm },
  watchDeadline: { color: colors.gris, fontFamily: fonts.textSemi, fontSize: fontSizes.sm },

  // ── Aperçu (état « pas encore Club ») ──
  points: { gap: spacing.xs, marginTop: spacing.xs },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  pointDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.gris,
    marginTop: fontSizes.sm * 0.6,
  },
  pointText: { flex: 1, color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.sm },

  // ── États (même grammaire que /performance) ──
  stateCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  stateTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
  },
  stateBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  stateNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
  },
  stateInline: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
  },
});
