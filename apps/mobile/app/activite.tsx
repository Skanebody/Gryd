/**
 * GRYD — ACTIVITÉ (/activite, planche E23). Un flux TACTIQUE, pas une boîte aux
 * lettres : quatre groupes FIXES par priorité, chaque ligne mène à une action ou
 * à un détail, l'obsolète se retire seul.
 *
 * ─── ACCÈS (planche E23 : la cloche du header carte) ────────────────────────
 * La planche atteint cet écran par la cloche du Home. Cette cloche est
 * VOLONTAIREMENT ÉTEINTE aujourd'hui (décision committée dans `(tabs)/index.tsx`,
 * §47) : son BADGE compterait des événements tactiques qui n'existent pas avant
 * O1, et une cloche qui n'ouvre rien serait un bouton mort. Cet écran EXISTE et
 * est honnête ; le RECÂBLAGE de la cloche vit dans le Home (périmètre carte,
 * non touché ici) et reste lié à O1 — inscrit en suspens plutôt que forcé sur
 * l'écran d'un autre lot.
 *
 * ─── ORDRE DE COMPOSITION (planche E23) ─────────────────────────────────────
 *   1. `StackScreen` : retour + titre + kicker + sous-titre ;
 *   2. l'ÉTAT de lecture (chargement / pas connecté / sans backend / échec) ;
 *   3. le FLUX : les groupes NON VIDES, dans l'ordre de priorité À DÉFENDRE >
 *      RIVALITÉ > CREW > PROGRESSION (`buildActivityFeed`, pur + testé), chacun
 *      un `SectionLabel` puis ses lignes (`ListRow` : icône 38 pt + fait +
 *      chevron/action) ;
 *   4. l'état CALME quand le flux est vide (« Tout est calme… ») ;
 *   5. en gris, en bas : ce qui n'existe pas encore (les 3 groupes tactiques).
 *
 * ─── LA DONNÉE EST RÉELLE OU ABSENTE (AMENDEMENT-47) ────────────────────────
 * Les valeurs de la planche (« Saint-Rémy contesté par Nina M. », « K.Runner a
 * pris Quai Sud »…) sont une COMPOSITION. On ne les fabrique pas : les trois
 * groupes tactiques naissent d'actes CROSS-JOUEUR (O1), donc restent ABSENTS
 * tant qu'aucun événement réel n'existe. La seule source honnête avant O1 est la
 * PROGRESSION — les badges réellement débloqués (`useActivityEvents` lit
 * `user_badges`). Le flux porte donc la vraie progression du joueur, ou l'état
 * calme, jamais une contestation inventée.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ────────────────────────────────────────────
 * · PAS DE « TOUT LU » dans l'en-tête : il efface les alertes ACTIONNABLES, qui
 *   n'existent pas avant O1 (`actionableCount` = 0). Un bouton qui n'a jamais
 *   rien à effacer serait mort (§A). Il reviendra avec les groupes tactiques.
 * · PAS DE MINI-CARTE dans l'état calme : une carte de territoire sans donnée
 *   réelle serait un faux. Une tuile neutre (cloche) tient la place sans rien
 *   affirmer.
 * · PROGRESSION en CHEVRON, jamais en action inline : un badge se consulte
 *   (→ /badges), il n'appelle pas de décision — donc il ne compte pas dans le
 *   badge de la cloche.
 *
 * Analytics : screen('activite') au montage ; `notification_opened` (§8) au tap
 * d'une ligne — noms exacts, jamais inventés hors `events.ts`.
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  EVENTS,
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  typography,
  type IconName,
} from '@klaim/shared';
import { screen, track } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { Icon } from '../src/ui/Icon';
import { ListRow } from '../src/ui/ListRow';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { useSession } from '../src/lib/session';
import {
  buildActivityFeed,
  relativeAge,
  type ActivityEvent,
  type ActivityGroup,
} from '../src/features/notifications/activityFeed';
import { useActivityEvents } from '../src/features/notifications/useActivityEvents';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { C } from '../src/i18n/catalog/activite';

/** Titre de chaque groupe (planche E23). */
const GROUP_TITLE: Readonly<Record<ActivityGroup, Entry>> = {
  defend: C.groupDefend,
  rivalry: C.groupRivalry,
  crew: C.groupCrew,
  progression: C.groupProgression,
};

/** Picto de tête d'une ligne, par groupe (IconPlate 38 pt via ListRow). */
const GROUP_ICON: Readonly<Record<ActivityGroup, IconName>> = {
  defend: 'bouclier',
  rivalry: 'guerre',
  crew: 'crew',
  progression: 'badge',
};

/** Couleur de tête PAR RÔLE (constitution §C) — jamais une teinte par ligne. */
const GROUP_COLOR: Readonly<Record<ActivityGroup, string>> = {
  defend: gameColors.electricBlue, // bleu — une zone à tenir
  rivalry: gameColors.rival, // orange — un rival
  crew: gameColors.crew, // chartreuse — mon crew
  progression: gameColors.crew, // chartreuse — mon gain
};

function StateCard({
  title,
  body,
  cta,
}: {
  title?: string;
  body: string;
  cta?: { label: string; a11y: string; analyticsId: string; onPress: () => void };
}) {
  return (
    <Card style={styles.state}>
      {title !== undefined ? <Text style={styles.stateTitle}>{title}</Text> : null}
      <Text style={styles.stateBody}>{body}</Text>
      {cta ? (
        <View style={styles.stateCta}>
          <Button
            label={cta.label}
            accessibilityLabel={cta.a11y}
            analyticsId={cta.analyticsId}
            size="md"
            onPress={cta.onPress}
          />
        </View>
      ) : null}
    </Card>
  );
}

export default function ActiviteScreen() {
  const t = useT();
  const { status, events, reload } = useActivityEvents();
  const { configured } = useSession();

  useEffect(() => {
    screen('activite');
  }, []);

  // `Date.now()` capturé une fois par rendu — l'ordre et l'âge des lignes en
  // dépendent, mais rien de tactique n'exige la seconde près.
  const now = Date.now();
  const feed = useMemo(() => buildActivityFeed(events, now), [events, now]);

  /** Âge relatif d'un événement, en mots (planche : « il y a 3 j »). */
  const ageLabel = (ms: number): string => {
    const age = relativeAge(ms, now);
    return age.unit === 'today'
      ? t(C.ageToday)
      : age.unit === 'day'
        ? t(C.ageDays, { n: age.n })
        : t(C.ageWeeks, { n: age.n });
  };

  /** Une ligne du flux. Aujourd'hui, seule la PROGRESSION a une source réelle. */
  const renderLine = (e: ActivityEvent) => {
    const isProgression = e.group === 'progression';
    const label = isProgression ? t(C.progressionBadge) : t(GROUP_TITLE[e.group]);
    const age = ageLabel(e.createdAtMs);
    return (
      <ListRow
        key={e.id}
        icon={GROUP_ICON[e.group]}
        iconColor={GROUP_COLOR[e.group]}
        label={label}
        value={age}
        chevron={isProgression}
        accessibilityLabel={t(C.a11yBadgeLine, { label, age })}
        {...(isProgression
          ? {
              onPress: () => {
                track(EVENTS.notificationOpened, { type: 'progression' });
                router.push('/badges');
              },
            }
          : {})}
      />
    );
  };

  return (
    <StackScreen
      title={t(C.activiteTitle)}
      icon="cloche"
      kicker={t(C.activiteKicker)}
      subtitle={t(C.activiteSubtitle)}
    >
      {/* ── 1. On ne sait pas encore : une LIGNE grise, pas un spinner plein. ── */}
      {status === 'loading' ? <Text style={styles.stateInline}>{t(C.loadingLine)}</Text> : null}

      {/* ── 2. Pas de compte : l'activité vit dessus. CTA seulement s'il mène
             quelque part — sans backend, une phrase le remplace. ── */}
      {status === 'signed-out' ? (
        <StateCard
          {...(configured ? {} : { title: t(C.noBackendTitle) })}
          body={configured ? t(C.signedOutBody) : t(C.noBackendBody)}
          {...(configured
            ? {
                cta: {
                  label: t(C.signInCta),
                  a11y: t(C.a11ySignIn),
                  analyticsId: 'activite_sign_in',
                  onPress: () => router.push('/sign-in'),
                },
              }
            : {})}
        />
      ) : null}

      {/* ── 3. Échec : ses événements existent, on n'a pas su les lire. ── */}
      {status === 'failed' ? (
        <StateCard
          title={t(C.failedTitle)}
          body={t(C.failedBody)}
          cta={{
            label: t(C.retry),
            a11y: t(C.retry),
            analyticsId: 'activite_retry',
            onPress: reload,
          }}
        />
      ) : null}

      {/* ── 4. Lu. Le flux peut être VIDE : c'est l'état CALME, un fait. ── */}
      {status === 'ready' && feed.length === 0 ? (
        <View style={styles.calm}>
          {/* Tuile neutre — PAS une mini-carte de territoire (qui serait un faux). */}
          <View style={styles.calmTile}>
            <Icon name="cloche" size={30} color={colors.grisFaible} />
          </View>
          <Text style={styles.calmTitle}>{t(C.emptyTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.emptyBody)}</Text>
        </View>
      ) : null}

      {/* ── 5. Lu, peuplé : les groupes non vides, dans l'ordre de priorité. ── */}
      {status === 'ready' && feed.length > 0
        ? feed.map((group) => (
            <View key={group.group} style={styles.group}>
              <SectionLabel style={styles.groupLabel}>{t(GROUP_TITLE[group.group])}</SectionLabel>
              <View style={styles.list}>{group.events.map(renderLine)}</View>
            </View>
          ))
        : null}

      {/* Ce qui n'existe pas encore, dit à sa place : les 3 groupes tactiques
          dépendent du cross-joueur (O1). Rendu dès que la lecture a abouti
          (calme OU peuplé) — jamais pendant un état d'erreur/chargement. */}
      {status === 'ready' ? <Text style={styles.footnote}>{t(C.tacticalPendingNote)}</Text> : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: spacing.xl },
  groupLabel: { marginBottom: spacing.sm },
  list: { gap: spacing.xs },

  state: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  stateTitle: { ...typography.cardTitle, color: colors.blanc, textAlign: 'center' },
  stateBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
  },
  stateCta: { alignSelf: 'stretch', marginTop: spacing.xxs },
  stateInline: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.md,
  },

  // État CALME : tuile neutre + message centré.
  calm: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  calmTile: {
    width: 76,
    height: 76,
    borderRadius: radii.card,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  calmTitle: { ...typography.cardTitle, color: colors.blanc, textAlign: 'center' },

  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xl,
  },
});
