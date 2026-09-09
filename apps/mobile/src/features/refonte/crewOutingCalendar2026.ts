type CalendarOuting = {
  id: string; title: string; startsAt: string; placeLabel: string;
  joined: boolean; cancelled: boolean; revision: number;
};

const escapeText = (value: string) => value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
  .replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** RFC 5545: fold between Unicode characters, at most 75 UTF-8 octets per line. */
function fold(line: string): string {
  let output = '', bytes = 0;
  for (const character of line) {
    const point = character.codePointAt(0)!;
    const size = point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4;
    if (bytes + size > 75) { output += '\r\n '; bytes = 1; }
    output += character; bytes += size;
  }
  return output;
}

/** Export a confirmed RSVP only. A calendar import is not a live subscription. */
export function crewOutingCalendar2026(item: CalendarOuting, nowMs: number, fr = true): string | null {
  const start = Date.parse(item.startsAt);
  if (!item.joined || item.cancelled || !item.id || !item.title.trim() || !Number.isFinite(start)
    || !Number.isFinite(nowMs) || start <= nowMs || !Number.isSafeInteger(item.revision) || item.revision < 0) return null;
  if (![start, nowMs].every(value => /^\d{4}-/.test(new Date(value).toISOString()))) return null;
  const description = fr
    ? 'Rendez-vous GRYD. Vérifie la sortie dans GRYD avant le départ : cet événement ne se met pas à jour automatiquement.'
    : 'GRYD meetup. Check the outing in GRYD before leaving: this calendar event does not update automatically.';
  // No end time, attendees, coordinates or reminders are invented or exported.
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GRYD//Crew outings//EN', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${encodeURIComponent(item.id)}@gryd`, `DTSTAMP:${utc(nowMs)}`,
    `DTSTART:${utc(start)}`, `SEQUENCE:${item.revision}`, 'CLASS:PRIVATE',
    `SUMMARY:${escapeText(item.title)}`, `LOCATION:${escapeText(item.placeLabel)}`,
    `DESCRIPTION:${escapeText(description)}`, 'END:VEVENT', 'END:VCALENDAR',
  ].map(fold).join('\r\n') + '\r\n';
}
