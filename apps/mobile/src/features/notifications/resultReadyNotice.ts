/**
 * GRYD — « TA SORTIE EST ANALYSÉE. TON RÉSULTAT EST PRÊT. » (matrice §14.2,
 * première ligne), en notification LOCALE.
 *
 * ─── POURQUOI LOCALE, ET POURQUOI C'EST HONNÊTE ─────────────────────────────
 * Le push DISTANT est impossible sur ce build (`remotePushCapability`). La
 * première ligne de la matrice reste pourtant réalisable : le résultat arrive
 * DANS l'app, sur ce téléphone, et c'est ce téléphone qui peut prévenir.
 * `scheduleNotificationAsync` n'a besoin ni de jeton, ni d'APNs, ni de réseau.
 *
 * ─── LES QUATRE EXCLUSIONS DE LA MATRICE, TOUTES APPLIQUÉES ─────────────────
 *  · « une fois » — l'identifiant d'événement est le `runId` ; le journal local
 *    (`localNotificationLog.ts`) refuse le doublon même après un redémarrage ;
 *  · « rien si résultat déjà ouvert » — `appActive` : si le joueur est devant
 *    l'écran, la notification ne part pas. Le prévenir de ce qu'il regarde,
 *    c'est le §14 tout entier à l'envers ;
 *  · préférence « résultats » et « Pause du jeu » — passées par `canNotify2026` ;
 *  · budget et plage calme — même moteur, mêmes nombres que le serveur.
 *
 * ─── LA PERMISSION EST DEMANDÉE ICI, ET SEULEMENT ICI ───────────────────────
 * Au moment où un message RÉEL est prêt à partir — jamais à froid, jamais au
 * premier lancement. C'est la règle qu'E10 violait et qui a coûté la boîte iOS.
 * Et on ne la demande qu'APRÈS que le moteur ait dit oui : refuser d'abord, puis
 * demander une permission pour un message qui ne partira pas, serait la même
 * faute une couche plus bas.
 *
 * PUR d'i18n : le titre et le corps arrivent en prop, résolus par l'appelant.
 */
import { Platform } from 'react-native';
import {
  canNotify2026,
  type NotificationDecision2026,
  type NotificationSettings2026,
} from './notifications2026';
import { appendNotificationLog2026, readNotificationLog2026 } from './localNotificationLog';

type NotificationsModule = typeof import('expo-notifications');

/** null = module absent du build (dégradation propre, jamais un crash). */
function loadModule(): NotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as NotificationsModule;
  } catch (e) {
    console.warn('[GRYD] expo-notifications absent de ce build', e);
    return null;
  }
}

/** Diagnostic — chaque valeur a une conséquence d'écran distincte. */
export type ResultNoticeOutcome =
  /** La notification est partie (ou est programmée à l'instant même). */
  | { kind: 'delivered' }
  /** Le moteur §14.3 a dit non — la raison est celle du cahier, telle quelle. */
  | { kind: 'refused'; decision: NotificationDecision2026 }
  /** Le joueur a refusé la permission système — un choix, pas une panne. */
  | { kind: 'permission_denied' }
  /** Web / module natif absent : il n'y a pas de notification locale ici. */
  | { kind: 'unsupported' }
  /** Échec technique, journalisé — jamais avalé en silence. */
  | { kind: 'error' };

export interface ResultReadyInput {
  /** Identifiant de la sortie : c'est LUI qui empêche le doublon (§14.3). */
  runId: string;
  /** Titre et corps déjà traduits par l'appelant. */
  content: { title: string; body: string };
  settings: NotificationSettings2026;
  /** L'app est-elle au premier plan ? Si oui, on ne notifie pas. */
  appActive: boolean;
  now?: Date;
}

/** Heure LOCALE de l'appareil — le fuseau du joueur, jamais celui du serveur. */
function localHour(now: Date): number {
  return now.getHours();
}

/**
 * Prévient que le résultat d'une sortie est prêt, si et seulement si le cahier
 * l'autorise. Ne jette JAMAIS : un appelant en fin de course ne doit pas voir
 * son écran tomber parce qu'une notification n'a pas pu partir.
 */
export async function notifyResultReady(input: ResultReadyInput): Promise<ResultNoticeOutcome> {
  const now = input.now ?? new Date();
  const eventId = `result:${input.runId}`;

  // ── 1. LA DÉCISION, AVANT TOUTE PERMISSION ────────────────────────────────
  // « rien si résultat déjà ouvert » (§14.2) : l'app au premier plan, c'est le
  // joueur devant son résultat. On l'inscrit quand même au journal — l'événement
  // a bien eu lieu, et il ne doit pas ressurgir en notification plus tard.
  const log = await readNotificationLog2026(now.getTime());
  const decision = canNotify2026(
    input.settings,
    { category: 'results', eventId, atMs: now.getTime(), localHour: localHour(now) },
    log,
  );
  if (!decision.allowed) return { kind: 'refused', decision };
  if (input.appActive) {
    await appendNotificationLog2026({
      eventId,
      category: 'results',
      atMs: now.getTime(),
      transactional: false,
    });
    return { kind: 'refused', decision: { allowed: false, reason: 'duplicate' } };
  }

  if (Platform.OS === 'web') return { kind: 'unsupported' };
  const N = loadModule();
  if (N === null) return { kind: 'unsupported' };

  try {
    // ── 2. LA PERMISSION, AU MOMENT OÙ ELLE SERT ────────────────────────────
    const current = await N.getPermissionsAsync();
    if (!current.granted) {
      if (current.canAskAgain === false) return { kind: 'permission_denied' };
      const asked = await N.requestPermissionsAsync();
      if (!asked.granted) return { kind: 'permission_denied' };
    }

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('resultat', {
        name: 'GRYD',
        importance: N.AndroidImportance.DEFAULT,
      });
    }

    await N.scheduleNotificationAsync({
      // L'identifiant d'événement du cahier EST l'identifiant système : deux
      // programmations pour la même sortie se remplacent au lieu de s'empiler.
      identifier: eventId,
      content: { title: input.content.title, body: input.content.body },
      // `null` = tout de suite. Le résultat est prêt maintenant ; le différer
      // ferait mentir la phrase.
      trigger: null,
    });
    await appendNotificationLog2026({
      eventId,
      category: 'results',
      atMs: now.getTime(),
      transactional: false,
    });
    return { kind: 'delivered' };
  } catch (e) {
    console.warn('[GRYD] notification de résultat non posée', e);
    return { kind: 'error' };
  }
}
