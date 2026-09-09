export interface CrewMessage2026 {
  id: string; body: string; createdAt: string; mine: boolean; canRemove: boolean;
  authorId: string; authorName: string;
}
export interface CrewConversation2026 {
  crewId: string; crewName: string; myRole: string; bodyMax: number; windowSize: number; olderCursor: { createdAt: string; id: string } | null; messages: CrewMessage2026[];
}
/** Reject mismatched audiences and incomplete contracts rather than painting an empty chat. */
export function parseCrewConversation2026(value: unknown, expectedCrewId: string): CrewConversation2026 | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.crewId !== expectedCrewId || typeof row.crewName !== 'string' || typeof row.myRole !== 'string'
    || !Number.isSafeInteger(row.bodyMax) || (row.bodyMax as number) < 1
    || !Number.isSafeInteger(row.windowSize) || (row.windowSize as number) < 1 || !Array.isArray(row.messages)) return null;
  const cursor = row.olderCursor as Record<string, unknown> | null;
  if (cursor !== null && (!cursor || typeof cursor.createdAt !== 'string' || !Number.isFinite(Date.parse(cursor.createdAt)) || typeof cursor.id !== 'string')) return null;
  const ids = new Set<string>();
  for (const message of row.messages) {
    if (!message || typeof message !== 'object' || typeof message.id !== 'string' || ids.has(message.id)
      || typeof message.authorId !== 'string' || typeof message.authorName !== 'string' || !message.authorName.trim()
      || typeof message.body !== 'string' || !message.body.trim() || message.body.length > (row.bodyMax as number)
      || typeof message.createdAt !== 'string' || !Number.isFinite(Date.parse(message.createdAt))
      || typeof message.mine !== 'boolean' || typeof message.canRemove !== 'boolean') return null;
    ids.add(message.id);
  }
  if (row.messages.length > (row.windowSize as number)) return null;
  return row as unknown as CrewConversation2026;
}
export function crewConversationError2026(reason: string, en: boolean): string {
  const errors: [string, string, string][] = [
    ['crew_changed', 'Ton crew a changé. Reviens à la page Crew.', 'Your crew changed. Return to the Crew page.'],
    ['session_changed', 'Le compte a changé. Reviens à ton crew.', 'Your account changed. Return to your crew.'],
    ['message_rate_limited', 'Quelques instants avant ton prochain message.', 'Wait a moment before your next message.'],
    ['message_request_changed', 'Ce message a déjà été traité. Actualise la conversation.', 'This message was already handled. Refresh the conversation.'],
    ['moderated', 'Ce texte ne peut pas être envoyé. Modifie-le.', 'This text cannot be sent. Edit it.'],
    ['forbidden', 'Cette action n’est pas autorisée pour ton rôle.', 'Your role does not allow this action.'],
    ['invalid_message', 'Écris un message dans la limite indiquée.', 'Write a message within the displayed limit.'],
    ['message_removed', 'Ce message a déjà été retiré.', 'This message was already removed.'],
    ['message_unavailable', 'Ce message n’est plus accessible.', 'This message is no longer available.'],
  ];
  const match = errors.find(([key]) => reason.includes(key));
  return match ? match[en ? 2 : 1] : en ? 'The action could not be confirmed. Your draft is kept.' : 'L’action n’a pas pu être confirmée. Ton brouillon est conservé.';
}

export const CREW_SPORTING_ROLES_2026 = ['welcomer', 'outing_host', 'route_scout'] as const;
export type CrewSportingRole2026 = typeof CREW_SPORTING_ROLES_2026[number];
export function isCrewSportingRole2026(role: unknown): role is CrewSportingRole2026 {
  return typeof role === 'string' && (CREW_SPORTING_ROLES_2026 as readonly string[]).includes(role);
}
export function sportingRoleLabel2026(role: CrewSportingRole2026, en: boolean): string {
  return ({ welcomer: ['Accueil', 'Welcome'], outing_host: ['Organisation de sorties', 'Outing organizer'], route_scout: ['Repérage de parcours', 'Route scouting'] } as const)[role][en ? 1 : 0];
}
