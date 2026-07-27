/**
 * GRYD — E56 « Profil public / rival » (spec produit UI/UX l.1871, route de
 * spec `/player/:playerId` ; planche E26).
 *
 * ══ CET ÉCRAN PUBLIE DE L'INFORMATION SUR QUELQU'UN D'AUTRE ══════════════════
 * C'est le seul écran du Profil qui parle d'un TIERS. Tout ce qu'il montre est
 * donc borné PAR LE SERVEUR, jamais par cette page :
 *   · l'identité vient de `user_profiles`, dont la policy
 *     `user_profiles_select_visible` (0011:201) ne rend la ligne que si le
 *     joueur observé l'a rendue publique, ou m'a en ami / en coéquipier ;
 *   · les faits territoriaux viennent de la vue `public_territories` (0077) :
 *     contours GÉNÉRALISÉS uniquement, aucun `source_run_id`, instant tronqué à
 *     l'heure, et seulement après le délai de publication (§1.5) ;
 *   · depuis la migration 0087, cette vue respecte AUSSI `map_sharing` : un
 *     joueur qui refuse de partager sa carte n'est plus protégé par un filtre
 *     client (donc décoratif — la donnée avait déjà quitté le serveur), mais
 *     par le `where` de la vue, opposable à n'importe quel appelant.
 * Rien n'est filtré ici. Ce que cet écran ne reçoit pas ne peut pas fuir.
 *
 * ══ CE QUI A CHANGÉ LE 27/07/2026 (l'écran d'avant était PÉRIMÉ) ═════════════
 * Il rendait « profil indisponible » EN DUR, sur une constante
 * `RIVAL_PROFILE_SOURCES_TODAY = { identity: 'none' }` justifiée par « O1 : le
 * chemin cross-utilisateur n'existe pas ». Ce n'était plus vrai : E15
 * (`zones-rival/[handle]`) lit ce chemin depuis la vague précédente. L'écran
 * mentait donc par excès de prudence — il annonçait une impossibilité que le
 * dépôt avait déjà levée. Il lit maintenant la MÊME source consentie qu'E15,
 * par le MÊME hook (`useRivalZones`) et la MÊME résolution pure.
 *
 * ══ CE QUI N'EST TOUJOURS PAS PEINT, ET POURQUOI (aucun bouton mort) ═════════
 *  · « Suivre » et « Défier » : aucun backend de suivi ni de défi entre joueurs.
 *    Un CTA qui échoue toujours est le mensonge d'interface le plus coûteux.
 *  · Le rang du joueur observé : aucune lecture de classement d'autrui. Un
 *    « Rang — » serait un faux vide, un rang inventé serait pire.
 *  · Le bloc « Votre rivalité » : le moteur existe et il est testé
 *    (`deriveRivalry`), mais rien ne rattache aujourd'hui un contour public à un
 *    identifiant de SECTEUR commun aux deux joueurs. Une rivalité déduite d'une
 *    adjacence devinée serait une donnée fabriquée — donc pas de bloc.
 *  · Le niveau, la ville, le crew : non lus. On ne les fabrique pas, et on ne
 *    demande pas au serveur ce qu'on n'affiche pas.
 * L'UNIQUE CTA chartreuse (§A4) est « Voir ses zones », et il n'apparaît que
 * lorsqu'il existe réellement des contours à ouvrir (`canOpenZones`).
 *
 * ══ LA BASE EST VIDE (27/07/2026) ═══════════════════════════════════════════
 * Aucun profil, aucun territoire. Cet écran rendra donc « profil inaccessible »
 * ou « aucune zone publiée ». C'est le comportement JUSTE, pas un placeholder :
 * aucune fixture, aucun rival d'illustration, aucun « Nina M. ».
 *
 * ATTEIGNABILITÉ : aucune surface de l'app ne route vers cet écran (pas de
 * bouton mort qui y MÈNE) ; il se rejoint par lien profond / QR, où un état
 * honnête vaut mieux qu'un « route introuvable ».
 */
import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  borderState,
  colors,
  fonts,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  spacing,
  withAlpha,
} from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { StackScreen } from '../../src/ui/StackScreen';
import { Icon } from '../../src/ui/Icon';
import { Button } from '../../src/ui/Button';
import { formatIntFor, formatKm2For } from '../../src/ui/numberFormat';
import { useLocale, useT } from '../../src/i18n/store';
import { RIVAL_C } from '../../src/i18n/catalog/rivalProfile';
import {
  resolveRivalProfileScreen,
  type RivalProfileScreen,
  type RivalPublicTerritory,
} from '../../src/features/social/rivalProfile';
import { resolveRivalZonesState } from '../../src/features/social/rivalZones';
import { useRivalZones } from '../../src/features/social/rivalZonesRead';

/** m² → km². Conversion d'unités, jamais une règle de jeu. */
const M2_PER_KM2 = 1_000_000;

export default function RivalProfileRoute() {
  const t = useT();
  const locale = useLocale();
  const params = useLocalSearchParams<{ handle?: string }>();
  // Paramètre d'URL normalisé avant toute requête. Il n'est JAMAIS réaffiché
  // comme un nom : tant qu'aucun profil n'a été rendu, l'écran n'a identifié
  // personne, et laisser croire le contraire serait faux.
  const handle = (params.handle ?? '').trim().replace(/^@/, '').toLowerCase();

  const { read, identity, reload } = useRivalZones(handle);
  // `Date.now()` lu UNE fois par composition et passé au moteur : l'écran n'a
  // pas d'horloge qui court, le moteur reste pur.
  const view = useMemo(() => resolveRivalZonesState(read, Date.now()), [read]);
  const state = useMemo<RivalProfileScreen>(() => resolveRivalProfileScreen(view), [view]);

  useEffect(() => {
    screen('profil_rival');
  }, []);

  return (
    <StackScreen title={t(RIVAL_C.screenTitle)} icon="profil">
      {state.status === 'profile' ? (
        <ProfileBody
          state={state}
          // `identity.name` = `display_name` consenti, sinon le handle rendu par
          // le serveur — jamais le segment d'URL tapé par l'appelant.
          name={identity?.name ?? null}
          handle={identity?.handle ?? null}
          locale={locale}
        />
      ) : (
        <StateBody state={state} onRetry={reload} />
      )}
    </StackScreen>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LE PROFIL — identité consentie, faits publics, un seul CTA
// ═══════════════════════════════════════════════════════════════════════════

function ProfileBody({
  state,
  name,
  handle,
  locale,
}: {
  state: Extract<RivalProfileScreen, { status: 'profile' }>;
  name: string | null;
  handle: string | null;
  locale: ReturnType<typeof useLocale>;
}) {
  const t = useT();
  return (
    <View style={styles.body}>
      {/* ── Identité RÉDUITE : une plaque de RÔLE (orange §C, jamais une couleur
          par crew), un nom, un handle. Pas d'avatar photo : `avatar_url` n'est
          pas lu, et une initiale inventée ne serait pas lui. ─────────────── */}
      <View style={styles.heroPlate}>
        <View style={styles.rivalMark}>
          <Icon name="profil" size={iconSizes.lg} color={gameColors.rival} />
        </View>
        {name !== null ? (
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
        ) : null}
        {handle !== null ? (
          <Text style={styles.handle} numberOfLines={1}>
            {t(RIVAL_C.identiteHandle, { handle })}
          </Text>
        ) : null}
      </View>

      {/* ── Les faits publics — ou la raison de leur absence ─────────────── */}
      <TerritoryFacts territory={state.territory} locale={locale} />

      {/* La frontière de vie privée, DITE : elle est vraie dans TOUS les états
          (c'est la vue serveur qui la tient), donc elle ne décore pas le seul
          état « chiffré ». */}
      <Text style={styles.privacy}>{t(RIVAL_C.territoireGeneralise)}</Text>

      {/* ── L'UNIQUE CTA chartreuse, et seulement s'il mène quelque part ─── */}
      {state.canOpenZones && handle !== null ? (
        <View style={styles.cta}>
          <Button
            label={t(RIVAL_C.ctaVoirSesZones)}
            accessibilityLabel={t(RIVAL_C.ctaVoirSesZonesA11y)}
            onPress={() => router.push(`/zones-rival/${handle}`)}
            analyticsId="rival_profile_zones"
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Les deux chiffres que la surface publique autorise — ou l'ÉTAT qui explique
 * pourquoi il n'y en a pas. Un refus de partage n'est pas un vide, un vide
 * n'est pas un échec de dessin : trois phrases distinctes, jamais un « 0 ».
 */
function TerritoryFacts({
  territory,
  locale,
}: {
  territory: RivalPublicTerritory;
  locale: ReturnType<typeof useLocale>;
}) {
  const t = useT();
  if (territory.kind !== 'facts') {
    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>{t(RIVAL_C.sectionTerritoirePublic)}</Text>
        <Text style={styles.panelBody}>
          {territory.kind === 'hidden'
            ? t(RIVAL_C.territoireMasque)
            : territory.kind === 'empty'
              ? t(RIVAL_C.territoireAucun)
              : t(RIVAL_C.territoireIllisible)}
        </Text>
      </View>
    );
  }

  // Une surface qu'on ne sait pas formater est OMISE (« Non public » serait
  // faux : elle est mesurée, c'est son rendu qui manque). Le décompte, lui, est
  // toujours vrai — la lecture a abouti.
  const areaKm2 = formatKm2For(territory.totalAreaM2 / M2_PER_KM2, locale);

  return (
    <View style={styles.metrics}>
      {areaKm2 !== null ? (
        <Metric label={t(RIVAL_C.statSurfacePublique)} value={areaKm2} lead />
      ) : null}
      <Metric
        label={t(RIVAL_C.statZones)}
        value={formatIntFor(territory.zoneCount, locale)}
        divided={areaKm2 !== null}
      />
    </View>
  );
}

function Metric({
  label,
  value,
  lead = false,
  divided = false,
}: {
  label: string;
  value: string;
  lead?: boolean;
  divided?: boolean;
}) {
  return (
    <View style={[styles.metricCell, lead ? styles.metricLead : null, divided ? styles.metricDivided : null]}>
      <Text
        style={lead ? styles.metricLeadValue : styles.metricValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {/* §A.9 — on enroule, on ne tranche jamais un libellé par « … ». */}
      <Text style={styles.metricLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LES ÉTATS SANS PROFIL — quatre mondes, jamais confondus
// ═══════════════════════════════════════════════════════════════════════════

function StateBody({
  state,
  onRetry,
}: {
  state: Exclude<RivalProfileScreen, { status: 'profile' }>;
  onRetry: () => void;
}) {
  const t = useT();
  switch (state.status) {
    case 'loading':
      // Une phrase, pas un spinner infini — et elle ne dit RIEN du joueur
      // observé : un chargement n'affirme ni son existence ni son absence.
      return <StatePanel body={t(RIVAL_C.etatChargement)} />;
    case 'signed_out':
      return (
        <StatePanel title={t(RIVAL_C.etatDeconnecteTitre)} body={t(RIVAL_C.etatDeconnecteCorps)} />
      );
    case 'failed':
      return (
        <StatePanel title={t(RIVAL_C.etatEchecTitre)} body={t(RIVAL_C.etatEchecCorps)}>
          {/* L'unique CTA de CET état, et le seul où réessayer a un sens. */}
          <Button label={t(RIVAL_C.reessayer)} onPress={onRetry} analyticsId="rival_profile_retry" />
        </StatePanel>
      );
    case 'unavailable':
      return <StatePanel title={t(RIVAL_C.unavailableTitle)} body={t(RIVAL_C.unavailableBody)} />;
  }
}

function StatePanel({
  title,
  body,
  children,
}: {
  title?: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.body}>
      {/* Plaque de rôle « rival » (orange), VIDE : aucune identité n'a été lue,
          on ne peint donc ni avatar ni faux nom à la place. */}
      <View style={styles.heroPlate}>
        <View style={styles.rivalMark}>
          <Icon name="profil" size={iconSizes.lg} color={gameColors.rival} />
        </View>
      </View>
      <View style={styles.panel}>
        {title !== undefined ? <Text style={styles.panelTitle}>{title}</Text> : null}
        <Text style={styles.panelBody}>{body}</Text>
      </View>
      {children !== undefined ? <View style={styles.cta}>{children}</View> : null}
    </View>
  );
}

const RIVAL_MARK_PX = 96;

const styles = StyleSheet.create({
  body: { gap: spacing.md },

  // Place de l'avatar de la planche. Centrée, sobre — pas un placeholder gris.
  heroPlate: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs },
  rivalMark: {
    width: RIVAL_MARK_PX,
    height: RIVAL_MARK_PX,
    borderRadius: RIVAL_MARK_PX / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(gameColors.rival, 0.12),
    borderWidth: 1,
    borderColor: withAlpha(gameColors.rival, 0.4),
  },
  name: { color: colors.blanc, fontSize: fontSizes.lg, fontFamily: fonts.display, marginTop: spacing.xs },
  handle: { color: colors.gris, fontSize: fontSizes.sm },

  // UN bloc à séparateurs, jamais deux cards côte à côte (§A : pas de card
  // dans une card, et pas de mur de cards non plus).
  metrics: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  metricCell: { flex: 1, gap: 3, paddingHorizontal: spacing.xs, justifyContent: 'center' },
  metricLead: { flex: 1.45 },
  metricDivided: { borderLeftWidth: 1, borderLeftColor: borderState.hairline },
  metricLeadValue: { color: colors.blanc, fontSize: fontSizes.xxl, fontFamily: fonts.display },
  metricValue: { color: colors.blanc, fontSize: fontSizes.lg, fontFamily: fonts.displaySemi },
  metricLabel: { color: colors.gris, fontSize: fontSizes.xs },

  // Surface N1 : rien à taper, tout à lire. Pas de bordure chartreuse — aucune
  // action ne vit dans ce panneau.
  panel: {
    backgroundColor: withAlpha(colors.blanc, 0.04),
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  panelTitle: { color: colors.blanc, fontSize: fontSizes.md, fontFamily: fonts.display },
  panelBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.6 },

  privacy: { color: colors.grisFaible, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.5 },
  cta: { marginTop: spacing.xs },
});
