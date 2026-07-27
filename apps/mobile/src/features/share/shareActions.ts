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
 * copié, et « PNG » que si une image a VRAIMENT été produite.
 *
 * Le sticker existe désormais en DEUX canaux, jamais confondus (planche E10) :
 *   · natif  → `shareStickerImage` : PNG à fond transparent (captureRef alpha) ;
 *   · web / échec de capture → `stickerText` : l'équivalent TEXTE prêt à coller.
 * Le second n'est jamais annoncé comme un PNG.
 */
import { Platform, Share } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import type { ShareDemoData } from './templates';
import type { ExportPlan, ExportQualityId } from './clubExport';

/**
 * Résultat d'une action (feedback UI, jamais une exception propagée).
 *
 * `quality` n'est renseignée que sur un `via: 'image'`, et vaut ce qui a
 * RÉELLEMENT été produit — jamais ce qui a été demandé. Un HD refusé (pas
 * membre, étage absent, aucun gain de pixels) redescend en `'standard'` et
 * l'écran doit annoncer standard : « HD » ne se dit que quand l'image l'est.
 */
export type ShareActionResult =
  | {
      ok: true;
      via: 'clipboard' | 'share' | 'webshare' | 'image';
      quality?: ExportQualityId;
    }
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
/**
 * P1 D6 (MVP_CHANGESET) — LA story est une IMAGE, pas un texte. Rasterise le
 * conteneur de la ShareCard (react-native-view-shot) en PNG et le remet au
 * share sheet natif (expo-sharing). Le partage texte reste le FILET (web, ou
 * échec de capture) : jamais un partage muet, mais jamais annoncé comme story.
 * `target` = la ref du <View> qui enveloppe la ShareCard (collapsable={false}).
 */
export async function shareAsImage(
  target: unknown,
  fallbackMessage: string,
): Promise<ShareActionResult> {
  if (Platform.OS === 'web' || target == null) return openShareSheet(fallbackMessage);
  try {
    const uri = await captureRef(target as Parameters<typeof captureRef>[0], {
      format: 'png',
      quality: 1,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'GRYD' });
      return { ok: true, via: 'image' };
    }
  } catch (e) {
    console.warn('[share] export image échoué, filet texte :', e);
  }
  return openShareSheet(fallbackMessage);
}

/**
 * EXPORT DE LA CARTE, EN STANDARD OU EN HD (promesse Arsenal « export HD »).
 *
 * L'appelant fournit les DEUX cibles possibles — l'aperçu à l'écran et l'étage
 * hors écran (`ShareExportStage`) — et le plan calculé par `buildExportPlan`.
 * Cette fonction ne DÉCIDE rien : elle exécute le plan et rapporte ce qui a
 * vraiment été produit.
 *
 * ─── AUCUNE OPTION DE REDIMENSIONNEMENT, JAMAIS ─────────────────────────────
 * On expédie `plan.captureOptions` tel quel (`SafeCaptureOptions` : format,
 * quality, result — et rien d'autre). Passer `width`/`height` à `captureRef`
 * serait le réflexe évident et ce serait un mensonge : Android rééchantillonne
 * le bitmap déjà rendu et iOS étire l'instantané de la vue. La définition vient
 * de la TAILLE À LAQUELLE LA CARTE EST MONTÉE, pas d'une option de sortie.
 *
 * ─── ON N'ANNONCE JAMAIS UN HD QU'ON N'A PAS PRODUIT ────────────────────────
 * Si le plan dit `hd` mais que la ref de l'étage manque à l'appel (démontage,
 * course de rendu), on capture l'aperçu et on rapporte `quality: 'standard'`.
 * Web : `captureRef` n'existe pas → filet TEXTE, et le résultat ne porte alors
 * aucune qualité (il n'y a pas d'image).
 *
 * ANTI PAY-TO-WIN (§1.6) : une définition d'image. Aucune capacité de jeu — ni
 * territoire, ni points, ni protection, ni priorité de classement.
 * CONFIDENTIALITÉ : les deux cibles rendent la MÊME carte, donc la même trace
 * déjà masquée (`applySharePrivacy`) ; le HD ne révèle rien de plus.
 */
export async function shareCardImage(
  targets: { preview: unknown; hd: unknown },
  plan: Pick<ExportPlan, 'quality' | 'captureOptions'>,
  fallbackMessage: string,
): Promise<ShareActionResult> {
  const wantsHd = plan.quality === 'hd' && targets.hd != null;
  const target = wantsHd ? targets.hd : targets.preview;
  const quality: ExportQualityId = wantsHd ? 'hd' : 'standard';
  if (Platform.OS === 'web' || target == null) return openShareSheet(fallbackMessage);
  try {
    const uri = await captureRef(
      target as Parameters<typeof captureRef>[0],
      // Le plan, tel quel. Le type `SafeCaptureOptions` interdit structurellement
      // width/height : on ne peut pas rééchantillonner par distraction.
      plan.captureOptions,
    );
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'GRYD' });
      return { ok: true, via: 'image', quality };
    }
  } catch (e) {
    console.warn('[share] export image échoué, filet texte :', e);
  }
  return openShareSheet(fallbackMessage);
}

/**
 * E10 (planche) — STICKER PNG À FOND TRANSPARENT. Rasterise la vue sticker
 * (`StickerCard`, montée hors écran par /partage) en PNG avec canal alpha, puis
 * la remet au share sheet natif.
 *
 * `result: 'tmpfile'` : `expo-sharing` partage un FICHIER, pas une data-URI.
 *
 * ─── POURQUOI CE N'EST PAS UN `shareAsImage` DE PLUS ────────────────────────
 * Le canal change ce qu'on a le droit de DIRE. Si la capture aboutit, l'app peut
 * annoncer « sticker PNG » ; sinon elle retombe sur le sticker TEXTE et doit le
 * dire autrement (`via: 'clipboard' | 'share'`). D'où un `via: 'image'` distinct
 * remonté à l'appelant : le toast suit le canal RÉEL, jamais l'intention.
 * Web : `captureRef` n'existe pas → filet texte, sans jamais l'appeler « PNG ».
 */
export async function shareStickerImage(
  target: unknown,
  fallbackText: string,
): Promise<ShareActionResult> {
  if (Platform.OS === 'web' || target == null) return copyText(fallbackText);
  try {
    const uri = await captureRef(target as Parameters<typeof captureRef>[0], {
      format: 'png', // seul format à canal alpha — le JPEG aplatirait le fond
      quality: 1,
      result: 'tmpfile',
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'GRYD' });
      return { ok: true, via: 'image' };
    }
  } catch (e) {
    console.warn('[share] sticker PNG échoué, filet texte :', e);
  }
  return copyText(fallbackText);
}

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
 * Contenu TEXTE du sticker transparent (doc §4.2) : résultat territorial +
 * mesures courtes + sceau + lien. Court, collable tel quel sur une story/photo.
 * C'est le FILET du sticker PNG (web, ou échec de capture).
 *
 *   +47 zones · République
 *   4,4 km · 22:54
 *   GRYD Verified          ← seulement si le SERVEUR l'a jugée ainsi
 *   https://gryd.run/zone/republique
 *
 * ─── DEUX FABRICATIONS COLMATÉES (25/07/2026) — MÉDIA SORTANT ───────────────
 * 1. « GRYD Verified » était écrit EN DUR, sans jamais lire `d.verified` : le
 *    sticker texte se décernait le sceau SERVEUR sur n'importe quelle course, y
 *    compris non jugée, `flagged` ou `rejected` — alors que `StickerCard` et
 *    `ShareCard` le gataient correctement. Ce texte part sur tous les canaux web
 *    et sur tout échec de capture native : le mensonge SORTAIT de l'app.
 * 2. La ligne de mesures était interpolée sans filtre : distance ou durée vide
 *    produisait « km · » ou « · 22:54 ». La version PNG filtrait déjà
 *    (partage.tsx) — deux chemins, une seule vérité attendue.
 */
export function stickerText(
  d: ShareDemoData,
  headline: string,
  link: string,
  verifiedLabel = 'GRYD Verified',
): string {
  const metrics = [d.distanceKm ? `${d.distanceKm} km` : '', d.clockLabel]
    .filter(Boolean)
    .join(' · ');
  return [headline, metrics, d.verified ? verifiedLabel : '', link]
    .filter(Boolean)
    .join('\n');
}
