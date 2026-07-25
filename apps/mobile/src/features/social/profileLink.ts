/**
 * GRYD — LIEN PUBLIC DE PROFIL (planche E16 « Mon code »).
 *
 * Un seul rôle : transformer un @handle en une URL partageable, et rien d'autre.
 * Ce module ne lit aucun profil, n'ouvre aucune feuille de partage de son chef
 * et ne connaît aucune donnée de jeu — les écrans lui passent un handle, il rend
 * une chaîne.
 *
 * ── CE QUE LE LIEN CONTIENT, ET SURTOUT CE QU'IL NE CONTIENT PAS ─────────────
 * `https://<hôte>/u/<handle>`. Le handle est PUBLIC par nature (c'est ce que le
 * joueur affiche partout dans l'app). N'entrent JAMAIS dans ce lien :
 *   · l'`user_id` Supabase (identifiant interne, jamais exposé) ;
 *   · une position, une zone, un hex, une ville d'attache serveur ;
 *   · un jeton, une session, quoi que ce soit qui autorise une action.
 * Conséquence directe : scanner ce code n'apprend rien de plus que lire le @ sur
 * l'écran de quelqu'un. C'est ce qui rend vraie la phrase de l'écran « le code
 * n'expose ni ta position ni tes zones privées ».
 *
 * ── L'HÔTE VIENT DE `INVITE_HOSTS`, PAS D'UNE CHAÎNE EN DUR ──────────────────
 * L'arbitrage `gryd.app` vs `gryd.run` n'est PAS rendu (point ouvert O10). Le QR
 * crew a déjà posé la doctrine : une seule constante à toucher le jour de la
 * décision. On la réutilise telle quelle plutôt que de recopier « gryd.app »
 * comme le fait la maquette — un QR imprimé ne se corrige pas.
 *
 * ⚠️ ÉTAT RÉEL AU 25/07/2026 : AUCUNE page ne répond encore sur cet hôte, et
 * l'app n'a pas de route `/u/[handle]` (seul `/c/CODE` est reçu, cf.
 * crew/pendingInvite). Le lien est donc BIEN FORMÉ mais ne mène nulle part
 * aujourd'hui. L'écran /qr le DIT au lieu de promettre une page qui n'existe
 * pas — c'est la seule façon honnête d'expédier le générateur avant le récepteur.
 */
import { INVITE_HOSTS } from '../crew/pendingInvite';
import { C } from '../../i18n/catalog/qr';
import { t } from '../../i18n/store';

/**
 * Hôte servi aux liens partagés. Premier de `INVITE_HOSTS` : les DEUX domaines
 * restent reconnus en lecture, un seul est écrit — sinon deux QR imprimés à deux
 * semaines d'écart ne porteraient pas la même adresse.
 */
export const PROFILE_LINK_HOST = INVITE_HOSTS[0];

/** Segment de chemin d'un profil public (`/u/<handle>`), pendant du `/c/` crew. */
export const PROFILE_LINK_PATH = 'u';

/**
 * Nettoie un @handle pour l'URL : minuscules, `a-z0-9_` (l'invariant technique
 * de `HANDLE_REGEX`), 20 caractères max. Défensif par principe — le handle peut
 * venir d'une saisie locale ou d'un préfixe d'e-mail, jamais d'une source sûre.
 */
function sanitizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

/**
 * Lien public d'un profil, ou `null` s'il ne reste rien du handle une fois
 * nettoyé. `null` n'est pas un cas d'erreur à afficher : c'est le signal qu'il
 * n'y a PAS de code à montrer, et l'écran doit alors demander un @handle plutôt
 * que dessiner un QR menant à une adresse vide.
 */
export function buildProfileLink(handle: string): string | null {
  const safe = sanitizeHandle(handle);
  if (safe.length === 0) return null;
  return `https://${PROFILE_LINK_HOST}/${PROFILE_LINK_PATH}/${safe}`;
}

/**
 * Forme AFFICHÉE du lien sous le QR (`gryd.run/u/lea`) : le `https://` est du
 * bruit sur une carte qu'on lit à 30 cm. On n'enlève QUE le schéma — jamais le
 * chemin, sinon le texte affiché ne serait plus recopiable à l'identique.
 */
export function profileLinkLabel(link: string): string {
  return link.replace(/^https?:\/\//, '');
}

/**
 * Message de partage d'un profil. Volontairement DISTINCT de `inviteMessage()`
 * (crew), qui dit « prenons le quartier ensemble » : ici on ne recrute personne,
 * on donne son adresse. Le catalogue porte le texte, ce module ne fait que le
 * remplir.
 */
export function profileShareMessage(link: string): string {
  return t(C.shareMessage, { link });
}
