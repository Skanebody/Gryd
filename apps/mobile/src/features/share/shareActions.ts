/**
 * GRYD — actions de partage réelles (doc « partage social viral » §2, §4.2, §7).
 * Copie presse-papier + feuille de partage système, tolérantes à l'absence de
 * dépendance native (même pattern que crew/invite.ts : `expo-clipboard` en
 * require dynamique, sinon on retombe sur la feuille de partage — jamais un
 * point de défaillance, jamais bloquant). Web/preview : `navigator.clipboard` /
 * Web Share API. En natif sans dep, la copie retombe sur la feuille de partage.
 *
 * HONNÊTETÉ (charte §A « l'app ne ment pas ») : ces fonctions renvoient un
 * résultat réel — l'UI ne dit « copié » que si quelque chose a VRAIMENT été
 * copié. Le PNG sticker transparent (rendu image) reste un TODO natif
 * (react-native-view-shot, O1) ; ici le sticker est son ÉQUIVALENT TEXTE prêt à
 * coller (résultat territorial + lien), 100 % fonctionnel sans dépendance.
 */
import { Platform, Share } from 'react-native';
import type { ShareDemoData } from './templates';

/** Résultat d'une action (feedback UI, jamais une exception propagée). */
export type ShareActionResult =
  | { ok: true; via: 'clipboard' | 'share' | 'webshare' }
  | { ok: false; reason: 'dismissed' | 'unavailable' };

interface ClipboardModule {
  setStringAsync(text: string): Promise<boolean>;
}

let clipboardMod: ClipboardModule | null | undefined;

/** Charge `expo-clipboard` s'il est installé (`null` = absent). */
function getClipboard(): ClipboardModule | null {
  if (clipboardMod !== undefined) return clipboardMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    clipboardMod = require('expo-clipboard') as ClipboardModule;
  } catch {
    clipboardMod = null;
  }
  return clipboardMod;
}

/**
 * Copie du texte (sticker prêt à coller / lien). Web : Clipboard API navigateur.
 * Natif : `expo-clipboard` si présent, sinon feuille de partage système. Renvoie
 * `ok:false` seulement si RIEN n'a pu être copié ni partagé (l'UI n'affiche alors
 * pas « copié » — honnêteté).
 */
export async function copyText(text: string): Promise<ShareActionResult> {
  if (Platform.OS === 'web') {
    try {
      const nav = (globalThis as { navigator?: Navigator }).navigator;
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        return { ok: true, via: 'clipboard' };
      }
    } catch {
      // tombe sur le partage web
    }
    return openShareSheet(text);
  }
  const clip = getClipboard();
  if (clip) {
    try {
      await clip.setStringAsync(text);
      return { ok: true, via: 'clipboard' };
    } catch {
      // tombe sur la feuille système
    }
  }
  return openShareSheet(text);
}

/**
 * Feuille de partage système (native) ou Web Share API (preview). Un « annulé »
 * n'est jamais une erreur. Fire-and-forget.
 */
export async function openShareSheet(message: string): Promise<ShareActionResult> {
  if (Platform.OS === 'web') {
    try {
      const nav = (
        globalThis as { navigator?: Navigator & { share?: (d: unknown) => Promise<void> } }
      ).navigator;
      if (nav?.share) {
        await nav.share({ title: 'GRYD', text: message });
        return { ok: true, via: 'webshare' };
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(message);
        return { ok: true, via: 'clipboard' };
      }
    } catch {
      return { ok: false, reason: 'dismissed' };
    }
    return { ok: false, reason: 'unavailable' };
  }
  try {
    const res = await Share.share({ message });
    if (res.action === Share.dismissedAction) return { ok: false, reason: 'dismissed' };
    return { ok: true, via: 'share' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

/**
 * Contenu TEXTE du sticker transparent (doc §4.2) : résultat territorial + stats
 * courtes + GRYD Verified + lien. Court, collable tel quel sur une story/photo.
 * Le rendu PNG transparent est un TODO natif — ce texte en est l'équivalent
 * fonctionnel (jamais un mensonge : c'est bien ce qui est copié).
 *
 *   +47 zones · République
 *   4,4 km · 22:54
 *   GRYD Verified
 *   https://gryd.run/zone/republique
 */
export function stickerText(d: ShareDemoData, headline: string, link: string): string {
  return [
    headline,
    `${d.distanceKm} km · ${d.clockLabel}`,
    'GRYD Verified',
    link,
  ].join('\n');
}
