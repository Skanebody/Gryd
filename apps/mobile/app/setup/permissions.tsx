/**
 * GRYD — E10 « PERMISSIONS UTILES » (`/setup/permissions`).
 * Spec produit UI/UX complète, l.810 : deux cartes, la localisation a déjà été
 * expliquée (E05), « chaque permission est demandée au moment de son bénéfice »,
 * « le bouton principal peut être CONTINUER même si une permission secondaire
 * est refusée ».
 *
 * ═══ CE QUE CET ÉCRAN DÉCIDE, ET CE QU'IL NE DÉCIDE PAS ══════════════════════
 * UNE décision : continuer. Les deux cartes sont des propositions latérales —
 * elles ne bloquent rien, ne conditionnent rien, et leur refus ne change pas le
 * libellé du CTA. Il n'y a donc qu'UN seul bouton chartreuse (§A4), et pas de
 * « Plus tard » en doublon : ne rien autoriser et continuer, c'est le MÊME
 * bouton (voir la note dans le catalogue).
 *
 * ═══ AUCUN BOUTON MORT — LE CŒUR DE L'ÉCRAN (§A4) ════════════════════════════
 * Chaque carte peint son bouton à partir de la capacité RÉELLE, constatée, et
 * jamais de l'apparence :
 *
 *  1. LA PLATEFORME. `features/setup/permissionSensors.ts` / `.web.ts` — même
 *     fork que `onboarding/locate.ts` / `locate.web.ts`. Sur web les deux
 *     providers valent `null` : aucun bouton d'autorisation n'est peint, la
 *     carte DIT qu'elle est indisponible, et le parcours continue.
 *  2. L'APPAREIL. Un podomètre n'est pas une propriété de la plateforme :
 *     `supported()` sonde `Pedometer.isAvailableAsync()`. Un Android sans
 *     `TYPE_STEP_COUNTER` ou un simulateur iOS répond non → carte indisponible.
 *     Pendant cette sonde, l'écran affiche « Vérification… » : un chargement
 *     n'affirme rien sur le joueur.
 *  3. L'ÉTAT SYSTÈME. Une permission DÉJÀ accordée ne se redemande pas (la carte
 *     dit « Autorisé »). Un refus DÉFINITIF (`canAskAgain === false`, le cas
 *     normal sur iOS) ne rouvre plus aucun dialogue : redemander serait le bouton
 *     mort — on montre à la place « Ouvrir les réglages », la seule action encore
 *     vivante. Et si l'ouverture des réglages échoue, l'écran le dit aussi.
 *
 * Les DÉCLARATIONS ont été vérifiées avant d'écrire cet écran (une permission
 * non déclarée échoue à coup sûr) : `NSMotionUsageDescription` via les options du
 * plugin `expo-sensors` dans app.json, `ACTIVITY_RECOGNITION` et
 * `POST_NOTIFICATIONS` via les manifestes des bibliothèques, entitlement
 * `aps-environment` via le plugin `expo-notifications`. Détail en tête de
 * `permissionSensors.ts`.
 *
 * ═══ QUATRE ÉTATS JAMAIS CONFONDUS ═══════════════════════════════════════════
 * `checking` (lecture en cours) · `undetermined` (jamais demandée — ce n'est PAS
 * un refus) · `granted` · `denied`/`blocked`. Plus `unavailable`, qui n'est ni un
 * refus ni une panne. La machine à états est PURE et testée :
 * `features/setup/permissionCards.ts` (+ `.test.ts`) — l'écran ne fait que la
 * rendre.
 *
 * ═══ ANTI-CHANTAGE / ANTI-PAY-TO-WIN ════════════════════════════════════════
 * Aucune phrase ne suggère qu'un refus coûte du territoire, des points ou une
 * protection : ce serait faux (le claim est décidé serveur à partir de la trace
 * GPS) autant qu'une mécanique de pression. `footnote` le dit noir sur blanc, une
 * seule fois.
 *
 * ═══ « AUTORISÉ » N'EST PAS « TU RECEVRAS » (corrigé le 27/07/2026) ═════════
 * Cet écran n'enregistrait PAS l'appareil auprès du serveur de push, au nom de
 * « ne pas refaire le travail de Réglages ». Le résultat était une contradiction
 * DANS LE MÊME BINAIRE : E10 affichait « Autorisé » et annonçait trois messages
 * (`notificationsBody`), pendant que Réglages › Notifications affichait « Pas
 * encore disponibles sur cette version de l'app » pour exactement la même
 * situation — les credentials APNs/FCM ne sont pas déposés sur EAS (app.json
 * `_note_push_perimetre3`), donc `getExpoPushTokenAsync` échoue et AUCUN des
 * trois messages ne peut arriver. C'est l'écran d'onboarding, celui que 100 %
 * des nouveaux traversent, qui portait la version optimiste.
 *
 * E10 fait donc désormais l'enregistrement RÉEL, avec le MÊME hook, le MÊME
 * appel et les MÊMES canaux que Réglages (`useDeviceNotifications`,
 * `registerPushDevice`, `notifPrefsToChannels`), et affiche le verdict de cette
 * tentative sous la ligne d'état — `notificationsDeliveryLine`, pure et testée.
 * Il n'y a plus deux récits : il y a une mesure, lue à deux endroits. Et le
 * bouton sert enfin à quelque chose de vérifiable, au lieu de ne poser qu'une
 * autorisation dont personne ne se servait.
 *
 * ═══ ACCESSIBILITÉ / MOUVEMENT ══════════════════════════════════════════════
 * Aucune animation propre à cet écran (rien à désactiver sous Reduce Motion) ;
 * les seules cibles tactiles sont des `Button` (48 pt en `md`, 56 en `lg`),
 * au-dessus du plancher 44 — aucune cible n'est simulée par un `hitSlop`. Le
 * contenu défile, donc aucune copie n'est tronquée quelle que soit la taille de
 * police, et le CTA vit hors du ScrollView : il reste atteignable.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  iconSizes,
  sizes,
  spacing,
  typography,
  type EventName,
  type IconName,
} from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { C } from '../../src/i18n/catalog/setupPermissions';
import { Button } from '../../src/ui/Button';
import { Card, IconPlate } from '../../src/ui/Card';
import { Icon } from '../../src/ui/Icon';
import {
  MOTION_LINE,
  NOTIFICATIONS_LINE,
  analyticsResult,
  canAsk,
  cardAction,
  cardState,
  isGranted,
  notificationsDeliveryLine,
  type PermissionCardState,
  type PermissionSensor,
  type PushDeliveryProbe,
} from '../../src/features/setup/permissionCards';
import { notifPrefsToChannels } from '../../src/features/notifications/notifPrefs';
import { useNotificationPrefs } from '../../src/features/notifications/notifPrefsStore';
import { useDeviceNotifications } from '../../src/features/notifications/useDeviceNotifications';
import type { PushStatus } from '../../src/features/notifications/push';
import {
  MOTION_SENSOR,
  NOTIFICATIONS_SENSOR,
  OPEN_APP_SETTINGS,
} from '../../src/features/setup/permissionSensors';

/**
 * SORTIE du parcours de premier usage : E10 est le DERNIER écran de `/setup/*`,
 * son « suivant » est donc le produit lui-même — la carte. Écrit en toutes
 * lettres ici, comme chez ses voisins (`NEXT_STEP` de E08/E09) : le parcours
 * setup n'a volontairement pas de table de flow.
 *
 * `replace` et pas `push` : le parcours de configuration ne doit pas rester
 * derrière le joueur dans la pile. La suite (session absente, onboarding non
 * terminé) est arbitrée par les gardes de la racine — cet écran ne les rejoue
 * pas.
 */
const NEXT_STEP = '/';

/**
 * ÉGALITÉ FORCÉE des deux unions de statut push. `permissionCards.ts` est un
 * module PUR : il ne peut pas `import type { PushStatus }` de
 * `features/notifications/push.ts` (qui tire react-native, AsyncStorage,
 * expo-constants et Supabase — Deno type-checke le fichier entier). Il en porte
 * donc un miroir littéral, `PushDeliveryProbe`. Les deux affectations croisées
 * ci-dessous sont la garde : `tsc` refuse la moindre divergence de membre, dans
 * un sens comme dans l'autre. C'est un contrôle de TYPE, pas du code exécuté.
 */
type _PushProbeCoversStatus = PushStatus extends PushDeliveryProbe ? true : never;
type _PushStatusCoversProbe = PushDeliveryProbe extends PushStatus ? true : never;
const _PUSH_UNIONS_MATCH: [_PushProbeCoversStatus, _PushStatusCoversProbe] = [true, true];
void _PUSH_UNIONS_MATCH;

// ═══════════════════════════════════════════════════════════════════════════
// LE HOOK D'UNE CARTE
//
// Il ne demande RIEN au montage : il LIT (`check()` n'ouvre aucun dialogue).
// La boîte système ne tombe qu'au tap sur le bouton de la carte, après que le
// bénéfice a été lu — « chaque permission est demandée au moment de son
// bénéfice ».
// ═══════════════════════════════════════════════════════════════════════════

interface PermissionCard {
  state: PermissionCardState;
  ask: () => void;
  openSettings: () => void;
  /** L'ouverture des réglages a échoué — ça se dit, ça ne s'avale pas. */
  settingsFailed: boolean;
}

function usePermissionCard(sensor: PermissionSensor | null, event: EventName): PermissionCard {
  const [state, setState] = useState<PermissionCardState>('checking');
  const [settingsFailed, setSettingsFailed] = useState(false);
  /** Un dialogue système est-il ouvert à cet instant ? (hors cycle de rendu.) */
  const asking = useRef(false);
  /**
   * Dernier verdict REMONTÉ. On ne mesure que les CHANGEMENTS : sans ce garde-fou,
   * chaque retour d'avant-plan renverrait `permission_motion { granted }` et le
   * KPI compterait des non-événements.
   */
  const lastReported = useRef<PermissionCardState | null>(null);

  const emit = useCallback(
    (next: PermissionCardState) => {
      if (lastReported.current === next) return;
      lastReported.current = next;
      const result = analyticsResult(next);
      // null = lecture en cours / dialogue ouvert : ce n'est pas un résultat, et
      // l'envoyer fabriquerait un verdict que l'OS n'a pas rendu.
      if (result !== null) track(event, { result });
    },
    [event],
  );

  /**
   * Relecture de l'état système, SANS ouvrir de dialogue. Rejouée au retour
   * d'avant-plan : le joueur peut revenir des Réglages avec une décision
   * différente, et une carte qui garderait l'ancien verdict mentirait sur l'état
   * de son appareil.
   */
  const probe = useCallback(async (): Promise<PermissionCardState> => {
    if (sensor === null) return 'unavailable';
    const supported = await sensor.supported();
    if (!supported) return 'unavailable';
    return cardState(true, await sensor.check());
  }, [sensor]);

  useEffect(() => {
    let alive = true;
    const settle = (next: PermissionCardState) => {
      if (!alive || asking.current) return;
      setState(next);
      emit(next);
    };

    void probe().then(settle);

    const sub = AppState.addEventListener('change', (status) => {
      // Pendant un dialogue système ouvert, on ne relit rien : on écraserait la
      // demande en cours par un verdict périmé.
      if (status !== 'active' || asking.current) return;
      void probe().then(settle);
    });

    return () => {
      alive = false;
      sub.remove();
    };
  }, [probe, emit]);

  /**
   * Garde DOUBLE, et les deux servent : `canAsk(state)` refuse les états où l'OS
   * n'ouvrirait plus rien (bloqué, indisponible, lecture en cours) ; le ref
   * refuse le second tap parti dans la même frame, avant le re-rendu — sans lui,
   * deux dialogues système pourraient être demandés d'affilée.
   */
  const ask = useCallback(() => {
    if (sensor === null || asking.current || !canAsk(state)) return;
    asking.current = true;
    setState('asking');
    void sensor
      .request()
      .then((response) => {
        const next = cardState(true, response);
        setState(next);
        emit(next);
      })
      .finally(() => {
        asking.current = false;
      });
  }, [sensor, state, emit]);

  const openSettings = useCallback(() => {
    if (OPEN_APP_SETTINGS === null) return;
    setSettingsFailed(false);
    void OPEN_APP_SETTINGS().catch(() => setSettingsFailed(true));
  }, []);

  return { state, ask, openSettings, settingsFailed };
}

// ═══════════════════════════════════════════════════════════════════════════
// LA CARTE
// ═══════════════════════════════════════════════════════════════════════════

interface PermissionCardViewProps {
  icon: IconName;
  title: Entry;
  body: Entry;
  askLabel: Entry;
  /** Table EXHAUSTIVE état → ligne (module pur), jamais un `if` local. */
  lines: Readonly<Record<PermissionCardState, Entry | null>>;
  /**
   * SECONDE ligne, facultative : ce que la carte sait de la LIVRAISON, une fois
   * la permission accordée. `null`/absente = on ne sait rien, donc on se tait.
   * Décidée par `notificationsDeliveryLine` (pur, testé) — jamais ici.
   */
  deliveryLine?: Entry | null;
  card: PermissionCard;
  analyticsId: string;
}

function PermissionCardView({
  icon,
  title,
  body,
  askLabel,
  lines,
  deliveryLine = null,
  card,
  analyticsId,
}: PermissionCardViewProps) {
  const t = useT();
  const action = cardAction(card.state);
  const granted = isGranted(card.state);
  const line = lines[card.state];

  return (
    // Contour d'ÉTAT seulement (règle 80/20) : la carte se cadre quand la
    // permission est réellement accordée, pas pour se séparer de sa voisine.
    <Card state={granted ? 'active' : 'none'} style={styles.card}>
      <View style={styles.cardHead}>
        <IconPlate icon={icon} size="md" color={granted ? colors.chartreuse : colors.blanc} />
        {/* Aucun numberOfLines : le titre s'enroule plutôt que d'être coupé (§A9). */}
        <Text style={styles.cardTitle}>{t(title)}</Text>
      </View>

      <Text style={styles.body}>{t(body)}</Text>

      {line === null ? null : (
        <Text style={[styles.line, granted && styles.lineGranted]}>{t(line)}</Text>
      )}

      {/* LA LIVRAISON, quand on la connaît. Elle reste en GRIS même sous un
          « Autorisé » chartreuse : ce n'est pas une bonne nouvelle de plus,
          c'est une précision — et dans le cas dominant d'aujourd'hui, c'est un
          aveu (« pas encore livrées par cette version »). Aucun numberOfLines :
          la phrase s'enroule, elle n'est jamais coupée (§A9). */}
      {deliveryLine === null ? null : <Text style={styles.line}>{t(deliveryLine)}</Text>}

      {action === 'ask' ? (
        <Button
          label={t(askLabel)}
          onPress={card.ask}
          variant="ghost"
          size="md"
          loading={card.state === 'asking'}
          analyticsId={analyticsId}
        />
      ) : null}

      {/* Le seul bouton encore vivant quand l'OS a définitivement fermé la porte
          — et uniquement là où des réglages existent (jamais sur web). */}
      {action === 'open_settings' && OPEN_APP_SETTINGS !== null ? (
        <Button
          label={t(C.openSettingsCta)}
          onPress={card.openSettings}
          variant="ghost"
          size="md"
          analyticsId={`${analyticsId}_settings`}
        />
      ) : null}

      {card.settingsFailed ? <Text style={styles.line}>{t(C.openSettingsFailed)}</Text> : null}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// L'ÉCRAN
// ═══════════════════════════════════════════════════════════════════════════

export default function SetupPermissionsScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  /**
   * Y a-t-il RÉELLEMENT un écran derrière celui-ci ? Lu une fois au montage :
   * la position de cet écran dans la pile ne change pas tant qu'il est affiché,
   * et le relire à chaque rendu ne dirait rien de plus.
   */
  const [canGoBack] = useState(() => router.canGoBack());

  const motion = usePermissionCard(MOTION_SENSOR, EVENTS.permissionMotion);
  const notifications = usePermissionCard(NOTIFICATIONS_SENSOR, EVENTS.permissionNotifications);

  /**
   * ═══ « AUTORISÉ » NE SUFFIT PAS : ON VA VOIR SI ÇA ARRIVE (27/07/2026) ═════
   *
   * Cet écran n'enregistrait PAS l'appareil auprès du serveur de push, et
   * l'arbitrage était écrit en tête de fichier : « le second a déjà son écran et
   * son diagnostic honnête dans Réglages ». Le prix de cet arbitrage était une
   * contradiction INTERNE au même binaire : E10 affichait « Autorisé » et
   * annonçait trois messages (`notificationsBody`), pendant que Réglages ›
   * Notifications affichait « Pas encore disponibles sur cette version de
   * l'app » pour EXACTEMENT la même situation — les credentials APNs/FCM ne sont
   * pas déposés sur EAS (app.json `_note_push_perimetre3`). Deux récits d'un
   * seul fait, et l'écran que 100 % des nouveaux traversent portait l'optimiste.
   *
   * On ne corrige pas ça en rabotant la copie (une phrase plus vague resterait
   * une phrase non vérifiée) : on va CHERCHER le fait. `useDeviceNotifications`
   * est le même hook que Réglages, `registerPushDevice` le même appel, les mêmes
   * canaux (`notifPrefsToChannels`) et le même diagnostic à huit valeurs. Il n'y
   * a donc plus deux récits, il y a une seule mesure lue à deux endroits.
   *
   * AUCUN DIALOGUE SYSTÈME EN DOUBLE : l'appel ne part qu'APRÈS un `granted`
   * CONSTATÉ, et `registerPushDevice` commence par `getPermissionsAsync` — il ne
   * redemande rien quand c'est déjà accordé. Sur web `NOTIFICATIONS_SENSOR` est
   * `null` : l'état reste `unavailable`, donc rien ne part.
   * UNE SEULE FOIS : `enable()` change d'identité à chaque rendu (il dépend de
   * `busy`), un effet qui en dépendrait boucherait. Le drapeau `ref` est ce qui
   * garantit un unique enregistrement par passage sur l'écran.
   */
  const { prefs: notifPrefs } = useNotificationPrefs();
  const push = useDeviceNotifications(notifPrefsToChannels(notifPrefs));
  const pushArmed = useRef(false);
  const notificationsGranted = isGranted(notifications.state);
  useEffect(() => {
    if (!notificationsGranted || pushArmed.current) return;
    pushArmed.current = true;
    push.enable();
    // `push` est volontairement HORS des dépendances : seul le passage à
    // « accordé » doit déclencher l'enregistrement, et le drapeau ci-dessus le
    // rend idempotent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsGranted]);

  useEffect(() => {
    track(EVENTS.setupPermissionsViewed);
  }, []);

  /**
   * Sortie unique. L'event porte l'état RÉEL des deux permissions à cet instant
   * — `isGranted` ne vaut vrai que sur un `granted` CONSTATÉ : une lecture encore
   * en cours ou une capacité absente comptent comme non accordées, jamais comme
   * un refus du joueur.
   */
  const left = useRef(false);
  const onContinue = useCallback(() => {
    if (left.current) return;
    left.current = true;
    track(EVENTS.setupPermissionsCompleted, {
      motion: isGranted(motion.state),
      notifications: isGranted(notifications.state),
    });
    router.replace(NEXT_STEP);
  }, [motion.state, notifications.state]);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* RETOUR — peint UNIQUEMENT s'il existe vraiment quelque part où
            revenir. `canGoBack()` est la capacité RÉELLE de la pile, pas une
            supposition : E09 arrive ici par `push`, donc le retour existe ; mais
            quand `flags.bike` est fermé, E09 se remplace lui-même par un
            `<Redirect>` et il n'y a plus rien derrière — aucune flèche n'est
            alors peinte, plutôt qu'une flèche qui ne ferait rien (§2 « aucun
            bouton mort »). Zéro chartreuse : le CTA reste le seul accent. */}
        {canGoBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(C.backA11y)}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            {/* Le tracé du chevron pointe à droite → miroir pour un retour. */}
            <View style={styles.backMirror}>
              <Icon name="chevron" size={iconSizes.lg} color={colors.gris} />
            </View>
          </Pressable>
        ) : null}
        <Text style={styles.kicker}>{t(C.kicker)}</Text>
        <Text style={styles.title}>{t(C.title)}</Text>
        <Text style={styles.subtitle}>{t(C.subtitle)}</Text>

        <PermissionCardView
          icon="foulees"
          title={C.motionTitle}
          body={C.motionBody}
          askLabel={C.motionCta}
          lines={MOTION_LINE}
          card={motion}
          analyticsId="setup_e10_motion"
        />

        <PermissionCardView
          icon="cloche"
          title={C.notificationsTitle}
          body={C.notificationsBody}
          askLabel={C.notificationsCta}
          lines={NOTIFICATIONS_LINE}
          // Tant que l'enregistrement court (`busy`), on ne dit RIEN de la
          // livraison : un aller-retour en vol n'affirme rien sur le joueur.
          // `idle` (jamais tenté) rend `null` de la même façon, et c'est le
          // module pur qui le décide.
          deliveryLine={
            push.busy ? null : notificationsDeliveryLine(notifications.state, push.status)
          }
          card={notifications}
          analyticsId="setup_e10_notifications"
        />

        <Text style={styles.footnote}>{t(C.footnote)}</Text>
      </ScrollView>

      {/* CTA hors du ScrollView : toujours atteignable, jamais poussé hors écran
          par une grande taille de police. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label={t(C.cta)}
          onPress={onContinue}
          variant="primary"
          size="lg"
          analyticsId="setup_e10_continue"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  // Cible 44×44 RÉELLE (`sizes.touchTarget`), jamais un hitSlop. Le décalage
  // négatif aligne le TRACÉ du chevron sur la marge du texte, sans rogner la
  // cible — même traitement que le retour de E07.
  back: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    marginLeft: -10,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backMirror: { transform: [{ scaleX: -1 }] },
  pressed: { opacity: 0.7 },
  kicker: {
    ...typography.kicker,
    color: colors.gris,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  title: { ...typography.title, color: colors.blanc, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.gris, marginBottom: spacing.xl },
  card: { gap: spacing.sm, marginBottom: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // flexShrink pour que le titre s'enroule à côté de la plaque d'icône au lieu
  // de déborder — le texte d'action n'est jamais coupé (§A9).
  cardTitle: { ...typography.cardTitle, color: colors.blanc, flexShrink: 1 },
  body: { ...typography.body, color: colors.gris },
  line: { ...typography.meta, color: colors.gris },
  // Chartreuse sur surface SOMBRE (colors.carbone) — jamais sur fond clair.
  lineGranted: { color: colors.chartreuse },
  footnote: { ...typography.meta, color: colors.grisFaible, marginTop: spacing.xs },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.noir,
  },
});
