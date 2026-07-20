/**
 * GRYD — envoi push RÉEL via le service Expo (impur : réseau).
 *
 * C'est le seul endroit du repo qui parle à exp.host. La décision d'envoyer
 * (préférences, quiet hours, cap) est prise AILLEURS, dans ./push.ts (pur).
 *
 * HONNÊTETÉ — ce que ce module ne fait PAS :
 *   • il ne simule jamais un envoi. Si l'appel réseau échoue, il le DIT
 *     (`sent: false`) et l'appelant n'écrit rien dans push_log : le cap
 *     journalier ne doit jamais être consommé par un push fantôme ;
 *   • il ne fabrique pas de token. Sans appareil enregistré, il n'envoie rien.
 *
 * CONFIGURATION FONDATEUR (docs/BACKLOG-SOURCES.md) : `EXPO_ACCESS_TOKEN` n'est
 * requis que si « Enhanced Security for Push Notifications » est activé sur le
 * compte Expo. Sans lui, l'envoi fonctionne dès que des tokens existent — et
 * les tokens n'existent qu'à partir d'un build EAS avec la clé APNs / la config
 * FCM en place. C'est CETTE étape qui bloque le bout de la chaîne, pas le code.
 */
import type { PushMessage } from './push.ts';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
/** Limite documentée de l'API Expo : 100 messages par requête. */
const EXPO_BATCH_SIZE = 100;

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export interface ExpoSendResult {
  /** Nombre de messages acceptés par Expo (status 'ok'). */
  accepted: number;
  /** Messages refusés, tous motifs confondus. */
  rejected: number;
  /**
   * Tokens réellement acceptés. C'est CE champ qui autorise l'appelant à
   * écrire dans push_log : on ne journalise que ce qui est parti pour de bon.
   */
  okTokens: string[];
  /**
   * Tokens qu'Expo déclare morts (`DeviceNotRegistered`) : app désinstallée ou
   * permission retirée. À désactiver en base — continuer à les pousser serait
   * du bruit garanti.
   */
  deadTokens: string[];
  /** Erreur de transport (le service n'a pas répondu) : rien n'a été envoyé. */
  transportError?: string;
}

const EMPTY: ExpoSendResult = { accepted: 0, rejected: 0, okTokens: [], deadTokens: [] };

function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Envoie des messages Expo. Aucun throw : le résultat porte l'échec, à charge
 * de l'appelant de ne PAS journaliser un envoi qui n'a pas eu lieu.
 */
export async function sendExpoPush(
  messages: readonly PushMessage[],
  accessToken?: string,
): Promise<ExpoSendResult> {
  if (messages.length === 0) return EMPTY;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    accept: 'application/json',
  };
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const result: ExpoSendResult = { accepted: 0, rejected: 0, okTokens: [], deadTokens: [] };

  for (const batch of chunk(messages, EXPO_BATCH_SIZE)) {
    let tickets: ExpoTicket[];
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify(batch),
      });
      if (!res.ok) {
        result.transportError = `expo http ${res.status}`;
        result.rejected += batch.length;
        continue;
      }
      const parsed = (await res.json()) as { data?: ExpoTicket[] };
      tickets = parsed.data ?? [];
    } catch (e) {
      // Réseau coupé / DNS / timeout : on ne prétend rien.
      result.transportError = `${e}`;
      result.rejected += batch.length;
      continue;
    }

    tickets.forEach((ticket, i) => {
      if (ticket.status === 'ok') {
        result.accepted += 1;
        const token = batch[i]?.to;
        if (token) result.okTokens.push(token);
        return;
      }
      result.rejected += 1;
      if (ticket.details?.error === 'DeviceNotRegistered') {
        const token = batch[i]?.to;
        if (token) result.deadTokens.push(token);
      }
    });
  }

  return result;
}
