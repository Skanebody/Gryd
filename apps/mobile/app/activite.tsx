/**
 * GRYD — ACTIVITÉ (/activite, planche E23). Un flux TACTIQUE, pas une boîte aux
 * lettres : quatre groupes FIXES par priorité, chaque ligne mène à une action ou
 * à un détail, l'obsolète se retire seul.
 *
 * ─── ACCÈS (planche E23 : la cloche du header carte) ────────────────────────
 * La planche atteint cet écran par la cloche du Home. Cette cloche a été
 * RECÂBLÉE (`features/notifications/bell.ts`) : elle n'existe que quand elle a
 * quelque chose de VRAI à dire — au moins une ligne actionnable vivante — et
 * reste ABSENTE (pas grisée, pas à « 0 ») le reste du temps.
 *
 * ─── ORDRE DE COMPOSITION (planche E23) ─────────────────────────────────────
 *   1. `StackScreen` : retour + titre + kicker + sous-titre ;
 *   2. l'ÉTAT de lecture (chargement / pas connecté / sans backend / échec) ;
 *   3. le FLUX : les groupes NON VIDES, dans l'ordre de priorité À DÉFENDRE >
 *      RIVALITÉ > CREW > PROGRESSION (`buildActivityFeed`, pur + testé), chacun
 *      un `SectionLabel` puis ses lignes (`ListRow` : icône 38 pt + fait +
 *      chevron/action) ;
 *   4. l'état CALME quand le flux est vide (« Tout est calme… ») ;
 *   5. en gris, en bas : ce qui n'existe pas encore (RIVALITÉ et CREW) ;
 *   6. le LIEN de réglages (planche « PUSH & RÉGLAGES ») : lien DIRECT vers le
 *      réglage par catégorie réel (`/parametres/notifications`) — discret, pas un
 *      second CTA, et jamais un bouton mort (l'écran de canaux existe).
 *
 * ─── LA DONNÉE EST RÉELLE OU ABSENTE (AMENDEMENT-47) ────────────────────────
 * Les valeurs de la planche (« Saint-Rémy contesté par Nina M. », « K.Runner a
 * pris Quai Sud »…) sont une COMPOSITION. On ne les fabrique pas. DEUX groupes
 * ont aujourd'hui une source RÉELLE :
 *   · À DÉFENDRE  — les contestations ACTIVES visant mes territoires
 *     (`territory_contests`, 0078, ouvertes par `ingest_run`). Chaque ligne
 *     porte l'identifiant de SA contestation et ouvre E70.
 *   · PROGRESSION — les badges réellement décernés (`user_badges`).
 * RIVALITÉ et CREW naissent d'actes cross-joueur qui n'ont AUCUNE table : ils
 * restent absents, pas peints « à venir ». Le flux porte donc du vrai, ou l'état
 * calme, jamais une contestation inventée.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ────────────────────────────────────────────
 * · PAS DE « TOUT LU » dans l'en-tête. Ce n'est PLUS un problème d'événements
 *   absents (il y en a) mais de MODÈLE : `bell.ts` expose un statut de LECTURE
 *   DE DONNÉES, jamais un curseur lu/non-lu, et rien en base ne stocke ce
 *   curseur. Surtout, « lire » une contestation ne la ferme pas : le bouton
 *   effacerait un compte qui doit rester vrai jusqu'à l'échéance. Il viendra
 *   AVEC son modèle de lecture, pas avant (décision inscrite aussi dans
 *   `events.ts`, qui refuse de définir son event tant que le curseur n'existe
 *   pas).
 * · PAS DE MINI-CARTE dans l'état calme : une carte de territoire sans donnée
 *   réelle serait un faux. Une tuile neutre (cloche) tient la place sans rien
 *   affirmer.
 * · PROGRESSION en CHEVRON, jamais en action inline : un badge se consulte
 *   (→ /badges), il n'appelle pas de décision — donc il ne compte pas dans le
 *   badge de la cloche. À DÉFENDRE est, lui, ACTIONNABLE : il compte, et il
 *   OUVRE (une alerte comptée qui ne mènerait nulle part serait le symétrique
 *   exact d'un bouton mort).
 *
 * Analytics : screen('activite') au montage ; `notification_opened` (§8) au tap
 * d'une ligne — noms exacts, jamais inventés hors `events.ts`.
 */
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
import { contestIdOf } from '../src/features/notifications/contestEvents';
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

  /**
   * Une ligne du flux. Deux groupes ont aujourd'hui une source RÉELLE, et
   * chacun mène quelque part :
   *  · DÉFENDRE    — une contestation de `territory_contests`. Elle est
   *    ACTIONNABLE (elle compte dans le badge de la cloche), donc elle DOIT
   *    ouvrir sa zone : E70 `/zone-attaquee/[contestId]`. Une alerte comptée qui
   *    ne mènerait nulle part serait le symétrique exact d'un bouton mort — on
   *    alarmerait sans donner de sortie. L'identifiant vient de `contestIdOf`,
   *    l'inverse exact du préfixe posé par `defendEventsFromContests`.
   *  · PROGRESSION — un badge réellement décerné → /badges, en simple chevron
   *    (il se consulte, il n'appelle aucune décision).
   * RIVALITÉ et CREW n'ont pas de source : aucune de leurs lignes n'existe, donc
   * ce cas ne se rend jamais aujourd'hui. Il reste NON tapable plutôt que
   * d'inventer une destination pour un événement qui n'existe pas.
   */
  const renderLine = (e: ActivityEvent) => {
    const isProgression = e.group === 'progression';
    const contestId = e.group === 'defend' ? contestIdOf(e.id) : null;
    const label = isProgression
      ? t(C.progressionBadge)
      : contestId !== null
        ? t(C.defendLine)
        : t(GROUP_TITLE[e.group]);
    const age = ageLabel(e.createdAtMs);
    // Le chevron n'est peint QUE là où le tap aboutit : `contestIdOf` peut
    // rendre `null` (identifiant serveur inattendu), et une ligne sans
    // destination ne doit pas en promettre une.
    //
    // FORME OBJET pour la route dynamique, jamais un gabarit `` `/…/${id}` `` :
    // expo-router encode alors le segment lui-même, ET le PATRON littéral
    // (`/zone-attaquee/[contestId]`) apparaît dans le code — c'est ce que
    // `scripts/audit-routes.mjs` sait reconnaître comme une PORTE. Un gabarit
    // aurait laissé E70 compté « orphelin » alors qu'il est bel et bien atteint.
    const target: Parameters<typeof router.push>[0] | null = isProgression
      ? '/badges'
      : contestId !== null
        ? { pathname: '/zone-attaquee/[contestId]', params: { contestId } }
        : null;
    return (
      <ListRow
        key={e.id}
        icon={GROUP_ICON[e.group]}
        iconColor={GROUP_COLOR[e.group]}
        label={label}
        value={age}
        chevron={target !== null}
        accessibilityLabel={
          isProgression ? t(C.a11yBadgeLine, { label, age }) : t(C.a11yDefendLine, { age })
        }
        {...(target !== null
          ? {
              onPress: () => {
                // `type` est une clé FERMÉE, jamais un identifiant : le
                // `contestId` désignerait une zone, donc situerait le joueur
                // (§18.2).
                track(EVENTS.notificationOpened, {
                  type: isProgression ? 'progression' : 'defend',
                });
                router.push(target);
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
      {status === 'ready' ? (
        <>
          <Text style={styles.footnote}>{t(C.tacticalPendingNote)}</Text>
          {/* PUSH & RÉGLAGES (planche E23) : lien DIRECT en bas de liste vers le
              réglage par catégorie RÉEL (/parametres/notifications). Un lien gris
              discret, pas un second CTA chartreuse (§A) — et jamais un bouton mort :
              l'écran de canaux existe. */}
          <Pressable
            onPress={() => router.push('/parametres/notifications')}
            accessibilityRole="link"
            accessibilityLabel={t(C.a11yNotifSettings)}
            style={styles.settingsLink}
            hitSlop={8}
          >
            <Text style={styles.settingsLinkText}>{t(C.notifSettingsLink)}</Text>
          </Pressable>
        </>
      ) : null}
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

  // Lien réglages : discret, gris souligné — un LIEN, jamais un CTA chartreuse.
  settingsLink: { alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: spacing.xxs },
  settingsLinkText: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    textDecorationLine: 'underline',
  },
});
