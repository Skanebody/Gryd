import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** A user-triggered file export; never claims that a calendar import succeeded. */
export async function exportCrewCalendar2026(content: string, stillCurrent: () => boolean): Promise<'prepared' | 'unavailable' | 'stale'> {
  if (!stillCurrent()) return 'stale';
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return 'unavailable';
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    try {
      if (!stillCurrent()) return 'stale';
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'gryd-sortie.ics';
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    return 'prepared';
  }
  if (!FileSystem.cacheDirectory || !await Sharing.isAvailableAsync()) return 'unavailable';
  if (!stillCurrent()) return 'stale';
  const uri = `${FileSystem.cacheDirectory}gryd-calendar-${Date.now()}-${Math.random().toString(36).slice(2)}.ics`;
  try {
    await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
    if (!stillCurrent()) return 'stale';
    await Sharing.shareAsync(uri, { mimeType: 'text/calendar', UTI: 'com.apple.ical.ics', dialogTitle: 'GRYD · Calendrier' });
    return 'prepared';
  } finally { await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {}); }
}
