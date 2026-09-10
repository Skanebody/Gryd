/**
 * GRYD — PRÉVENIR QUE LE RÉSULTAT EST PRÊT, DEPUIS LE SEUL ENDROIT QUI LE SAIT.
 *
 * ─── LE TROU QUE CE MODULE BOUCHE ───────────────────────────────────────────
 * `features/notifications/resultReadyNotice.ts` sait envoyer la première ligne
 * de la matrice §14.2 (« Ta sortie est analysée. Ton résultat est prêt. ») et
 * son en-tête le disait en toutes lettres : « CE MODULE N'A PAS ENCORE
 * D'APPELANT ». Tant qu'il n'en avait pas, `analyse.leaveNotified` (« on te
 * prévient quand le résultat est prêt ») était une promesse qu'aucun code ne
 * tenait. L'appel manquant part d'ICI, et d'ici seulement.
 *
 * ─── POURQUOI DANS `features/run/` ET PAS DANS `features/notifications/` ────
 * Le module de notification est PUR d'i18n et de session : il reçoit un texte
 * déjà traduit et un état de réglages déjà lu. Quelqu'un doit donc faire ces
 * deux lectures, et ce quelqu'un ne peut être que le chemin du résultat — c'est
 * lui qui tient le `clientRunId` et qui sait, à la milliseconde près, quand la
 * réponse d'`ingest_run` arrive.
 *
 * ─── UN SEUL POINT D'APPEL, ET C'EST STRUCTUREL ─────────────────────────────
 * `useRealRunCore.uploadOrQueue`, juste après `server_accepted`. C'est le seul
 * endroit du dépôt où une réponse d'ingestion est lue alors que le joueur peut
 * avoir rangé son téléphone. Le drain de la file d'envoi différé
 * (`lib/pendingUpload.ts`) n'en est PAS un second : il ne tourne qu'au retour au
 * PREMIER PLAN — l'app est active par construction, la notification serait
 * refusée par `appActive`, et l'ajouter là ne ferait qu'un deuxième chemin à
 * maintenir pour zéro message envoyé.
 *
 * ─── CE MODULE NE DÉCIDE RIEN ───────────────────────────────────────────────
 * Ni la plage calme, ni le budget, ni le doublon, ni la préférence
 * « résultats » : tout cela est tranché par `canNotify2026` à l'intérieur de
 * `notifyResultReady`. Ici on ne fait que DEUX lectures et on transmet.
 *
 * ⚠ ON N'APPELLE PAS `notifyResultReady` « seulement si l'app est en fond ».
 * On l'appelle TOUJOURS, en lui passant `appActive`. La différence n'est pas
 * cosmétique : quand l'app est au premier plan, le module inscrit quand même
 * l'événement au journal de déduplication, ce qui empêche la même sortie de
 * ressurgir en notification plus tard. Court-circuiter l'appel ici rendrait ce
 * garde-fou inopérant.
 *
 * ─── ET SI ON NE SAIT PAS CE QUE LE JOUEUR A CHOISI, ON SE TAIT ─────────────
 * Les réglages vivent sur le serveur (§14.1). Une lecture qui échoue rend
 * `settings_unreadable` et AUCUNE notification ne part : retomber sur les
 * défauts enverrait un message à quelqu'un qui l'a peut-être coupé — la version
 * notification du « repli inventé » que la constitution interdit.
 */
import { AppState } from 'react-native';
import { supabase } from '../../lib/supabase';
import { t } from '../../i18n/store';
import { C } from '../../i18n/catalog/analyse';
import { parseNotificationSettings2026 } from '../notifications/notifications2026';
import { notifyResultReady, type ResultNoticeOutcome } from '../notifications/resultReadyNotice';

/** Pourquoi aucune notification n'a même été TENTÉE. Jamais confondus. */
export type ResultNoticeSkip2026 =
  /** Aucun backend configuré : il n'y a ni réglage à lire ni résultat à annoncer. */
  | 'no_backend'
  /** Pas de compte côté serveur : ces réglages appartiennent à un compte. */
  | 'signed_out'
  /** La lecture des réglages a échoué — on ne devine pas un consentement. */
  | 'settings_unreadable';

/** Ce que l'annonce est devenue. Rendu pour les tests et le diagnostic. */
export type ResultAnnouncement2026 =
  /** Le moteur §14.3 a été consulté ; son verdict est ci-joint. */
  | { readonly kind: 'engine'; readonly outcome: ResultNoticeOutcome }
  /** On n'a pas pu, ou pas eu le droit, de le consulter. */
  | { readonly kind: 'skipped'; readonly why: ResultNoticeSkip2026 };

/** Contrat de la RPC `my_notification_settings_2026()` (jsonb, migration 0140). */
interface WireSettings2026 {
  hasAccount?: unknown;
}

/**
 * Annonce que le résultat de `runId` est disponible, si et seulement si le
 * cahier l'autorise. Ne jette JAMAIS : une notification qui ne part pas ne doit
 * pas faire tomber la fin de course.
 *
 * ⚠ À APPELER SANS L'ATTENDRE (`void`). Un aller-retour réseau de plus entre la
 * fin de l'effort et l'écran de résultat serait une attente ajoutée au joueur
 * pour un message qui, la plupart du temps, ne partira même pas.
 */
export async function announceResultReady2026(runId: string): Promise<ResultAnnouncement2026> {
  const client = supabase;
  if (client === null) return { kind: 'skipped', why: 'no_backend' };
  try {
    // La MÊME RPC que `notificationSettingsStore2026`, lue ici sans passer par
    // lui : ce magasin est un hook React, et ce chemin-ci n'est pas un rendu.
    // La lecture est identique et le PARSING est partagé (`parseNotification…`),
    // pour qu'un champ nouveau n'ait qu'un seul endroit où être compris.
    const { data, error } = await client.rpc('my_notification_settings_2026');
    if (error !== null) return { kind: 'skipped', why: 'settings_unreadable' };
    if (data === null || data === undefined) return { kind: 'skipped', why: 'signed_out' };
    if ((data as WireSettings2026).hasAccount === false) {
      return { kind: 'skipped', why: 'signed_out' };
    }
    const outcome = await notifyResultReady({
      runId,
      content: { title: t(C.noticeTitle), body: t(C.noticeBody) },
      settings: parseNotificationSettings2026(data),
      appActive: AppState.currentState === 'active',
    });
    return { kind: 'engine', outcome };
  } catch (e) {
    console.warn('[GRYD] annonce de résultat non tentée', e);
    return { kind: 'skipped', why: 'settings_unreadable' };
  }
}
