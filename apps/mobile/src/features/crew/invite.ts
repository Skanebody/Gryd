/**
 * GRYD — construction du LIEN D'INVITE crew + actions de partage (AMENDEMENT-31
 * §1 [P0], teardown Strava §2 : « seeding social / densité »). C'est le MOAT
 * DENSITÉ : un crew = rétention + clustering géographique. La machine de
 * croissance n°1 de Strava (inviter des amis) transposée à GRYD — proposée
 * APRÈS la 1re capture (jamais imposée, §7 : « après la valeur »).
 *
 * CÂBLÉ DÉMO : le lien affiché est un lien de PARTAGE réaliste (`INVITE_HOST`),
 * mais l'invite RÉELLE = un deep link prod (`gryd://` — scheme app.json — ou un
 * universal link `https://…` qui rebondit vers l'app). Le token ci-dessous est
 * dérivé côté client pour la démo ; en prod il vient du serveur (un code crew
 * signé, à usage suivi — event `inviteSent`/`inviteAccepted`, §8). Aucun secret
 * ici, aucune valeur de jeu : juste une chaîne partageable.
 *
 * ANTI PAY-TO-WIN : inviter n'achète RIEN et ne donne aucun territoire/point —
 * ça amène des joueurs, pas des avantages. Pur social.
 *
 * Pas de dépendance hors stack : le partage passe par l'API `Share` de
 * react-native (native) ou l'API Web Share / presse-papier `navigator`
 * (preview web). La copie utilise `expo-clipboard` s'il est présent (require
 * dynamique, comme haptics) et retombe sinon sur le partage système — jamais un
 * point de défaillance (fire-and-forget : un échec ne casse jamais le flow).
 */
import { Platform, Share } from 'react-native';

/**
 * Hôte du lien de partage (démo). Court, lisible dans une story/DM (façon
 * `strava.com/…`). Le domaine réel = O-item (comme le deep link prod).
 */
const INVITE_HOST = 'gryd.run';

/** Segment de chemin des invites crew (démo — `gryd.run/c/<token>`). */
const INVITE_PATH = 'c';

/**
 * Deep link natif (scheme `gryd`, app.json) — l'ouverture in-app RÉELLE en prod.
 * Exposé pour information/QA ; l'UI d'onboarding partage l'URL web lisible.
 */
export const INVITE_DEEP_LINK_SCHEME = 'gryd';

/** Résultat d'une action de partage/copie (pour le feedback UI, jamais bloquant). */
export type InviteActionResult =
  | { ok: true; via: 'share' | 'clipboard' | 'webshare' }
  | { ok: false; reason: 'dismissed' | 'unavailable' | 'error' };

/**
 * Construit le lien de partage d'invite (démo). `token` = code crew (démo :
 * dérivé du nom ; prod : émis par le serveur). Ne fabrique jamais un secret —
 * c'est une URL publique partageable.
 *
 * Exemple : `https://gryd.run/c/foulees93`.
 */
export function buildInviteLink(token: string): string {
  const safe = sanitizeToken(token);
  return `https://${INVITE_HOST}/${INVITE_PATH}/${safe}`;
}

/**
 * Deep link natif équivalent (`gryd://c/<token>`) — l'ouverture in-app réelle en
 * prod. L'UI partage l'URL web (universelle, cliquable partout) ; ce helper sert
 * au routage natif quand le lien est ouvert sur un appareil qui a l'app.
 */
export function buildInviteDeepLink(token: string): string {
  const safe = sanitizeToken(token);
  return `${INVITE_DEEP_LINK_SCHEME}://${INVITE_PATH}/${safe}`;
}

/**
 * Dérive un token de démo lisible depuis un nom de crew (minuscules, sans
 * accents/espaces). PROD : ignoré — le serveur émet un code crew signé (§8).
 * Purement cosmétique pour que le lien démo « ressemble » au crew du joueur.
 */
export function demoInviteToken(crewName: string): string {
  const base = sanitizeToken(crewName) || 'gryd';
  // Suffixe court stable (démo) — évoque un code de crew sans en être un vrai.
  return `${base}`.slice(0, 16);
}

/** Nettoie un token pour une URL : ascii minuscule, tirets, jamais vide côté appel. */
function sanitizeToken(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // enlève les diacritiques (plage Unicode)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
}

/**
 * Message de partage prêt à coller (DM/story). Court, chaleureux, orienté
 * DENSITÉ (« prenons le quartier ensemble ») — jamais une promesse d'avantage
 * (anti pay-to-win). Le lien est ajouté à la fin par l'appelant/`Share`.
 */
export function inviteMessage(link: string): string {
  return `Je prends mon quartier sur GRYD. Rejoins mon crew, on le tient à plusieurs : ${link}`;
}

// ─── Clipboard optionnel (require dynamique, jamais un crash au bundle) ───────

interface ClipboardModule {
  setStringAsync(text: string): Promise<boolean>;
}

let clipboardMod: ClipboardModule | null | undefined;

/** Charge `expo-clipboard` s'il est installé (comme haptics). `null` = absent. */
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

// ─── Actions (fire-and-forget, jamais bloquantes) ────────────────────────────

/**
 * Copie le lien d'invite dans le presse-papier. Web preview : `navigator`.
 * Natif : `expo-clipboard` si présent, sinon on retombe sur le partage système
 * (pour ne jamais laisser l'action sans effet). Retourne un résultat pour le
 * feedback (« Lien copié ») — jamais d'exception propagée.
 */
export async function copyInviteLink(link: string): Promise<InviteActionResult> {
  // Web (preview) : Clipboard API du navigateur.
  if (Platform.OS === 'web') {
    try {
      const nav = (globalThis as { navigator?: Navigator }).navigator;
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(link);
        return { ok: true, via: 'clipboard' };
      }
    } catch {
      // tombe sur le partage web ci-dessous
    }
    return shareInviteLink(link);
  }
  // Natif : clipboard réel s'il est là.
  const clip = getClipboard();
  if (clip) {
    try {
      await clip.setStringAsync(link);
      return { ok: true, via: 'clipboard' };
    } catch {
      // tombe sur le partage système
    }
  }
  // Pas de clipboard installé (dev build minimal) → feuille de partage native.
  return shareInviteLink(link);
}

/**
 * Ouvre la feuille de partage système (native) ou l'API Web Share (preview).
 * Le message inclut le lien + une phrase densité. Un « annulé » n'est jamais une
 * erreur (l'utilisateur a le droit de fermer). Fire-and-forget.
 */
export async function shareInviteLink(link: string): Promise<InviteActionResult> {
  const message = inviteMessage(link);
  // Web preview : Web Share API si dispo, sinon presse-papier navigateur.
  if (Platform.OS === 'web') {
    try {
      const nav = (globalThis as { navigator?: Navigator & { share?: (d: unknown) => Promise<void> } })
        .navigator;
      if (nav?.share) {
        await nav.share({ title: 'GRYD', text: message, url: link });
        return { ok: true, via: 'webshare' };
      }
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(link);
        return { ok: true, via: 'clipboard' };
      }
    } catch {
      return { ok: false, reason: 'dismissed' };
    }
    return { ok: false, reason: 'unavailable' };
  }
  // Natif : feuille de partage react-native.
  try {
    const res = await Share.share({ message });
    if (res.action === Share.dismissedAction) return { ok: false, reason: 'dismissed' };
    return { ok: true, via: 'share' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
