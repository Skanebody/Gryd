/**
 * GRYD — LA REMISE DE SESSION, CÔTÉ APP. TOUT CE QUI SE DÉCIDE SANS RÉSEAU.
 *
 * ═══ LE DÉFAUT DU FONDATEUR (12/09/2026) ════════════════════════════════════
 * « vas juste vers une page qui dit que ça a été bien validé mais derrière il
 * faut que le compte fonctionne dans l'application ».
 *
 * ═══ CE QUE E4 AVAIT LAISSÉ OUVERT, ET QUE CE MODULE FERME ══════════════════
 * E4 fait viser au lien de l'e-mail `https://gryd.run/callback?token_hash=…`,
 * et compte sur le LIEN UNIVERSEL pour qu'iOS remette l'adresse à l'app plutôt
 * qu'à Safari. Ce chemin exige la capacité Apple « Associated Domains », que le
 * profil de signature n'a pas encore : le build `fe030292` est ERRORED. Donc,
 * aujourd'hui, sur un vrai iPhone, le clic ouvre Safari — la page pouvait
 * féliciter, et derrière, le compte restait fermé.
 *
 * La remise renverse la charge. L'app tire un NONCE, l'écrit dans l'adresse de
 * retour de SA demande de lien ; la page web vérifie le haché (elle a donc une
 * vraie session), dépose son jeton de rafraîchissement contre `sha256(nonce)`
 * (migration 0198), et se déconnecte ; l'app, restée sur « Lien envoyé »,
 * réclame avec son nonce et ouvre sa session. Aucun lien universel dans la
 * boucle : ça marche sur un Mac, dans un webmail, sur Android — et ça
 * continuera de marcher le jour où le lien universel marchera.
 *
 * ═══ POURQUOI CE MODULE EXISTE SÉPARÉMENT DES DEUX `lib/auth*.ts` ═══════════
 * `lib/auth.ts` importe `expo-apple-authentication` au niveau module : rien de
 * ce qu'il contient n'est type-vérifiable sous Deno, donc rien n'y est
 * prouvable sans téléphone. Or ce qui se décide ici — la FORME d'un nonce,
 * l'adresse qu'on écrit dans l'e-mail, la lecture de ce que le serveur rend,
 * le moment où l'on cesse d'attendre — se décide sans réseau et sans écran.
 * Ça vit donc ici, c'est PUR, et `npm run test:mobile` le rejoue.
 *
 * La conséquence pratique compte : `auth.ts` et `auth.web.ts` ne dupliquent
 * plus que le TIRAGE (expo-crypto d'un côté, `crypto.getRandomValues` de
 * l'autre — il n'y a pas de troisième voie), et appellent les mêmes fonctions
 * pour tout le reste. Un seul endroit à corriger si la forme change.
 *
 * ═══ ZÉRO IMPORT NON PUR ════════════════════════════════════════════════════
 * Ni React, ni réseau, ni horloge : `now` est TOUJOURS injecté. Un seul
 * `import` de React Native rendrait ces règles impossibles à prouver sans
 * appareil, c'est-à-dire impossibles à prouver.
 */
import { AUTH_HANDOFF_2026, AUTH_HANDOFF_NONCE_PARAM_2026 } from '@klaim/shared';
import type { CallbackType2026 } from './welcome2026';

/**
 * Longueur EXACTE, en caractères, du nonce rendu en hexadécimal.
 *
 * Dérivée, jamais écrite à la main : `AUTH_HANDOFF_2026.nonceBytes` est la
 * seule source, et la migration 0198 accepte de 64 à 128 caractères. Écrire
 * « 64 » ici ferait un second nombre à tenir accordé avec le premier.
 */
export const HANDOFF_NONCE_LENGTH_2026 = AUTH_HANDOFF_2026.nonceBytes * 2;

/** La forme qu'un nonce doit avoir — et la SEULE que la base acceptera (0198). */
const NONCE_RE = /^[0-9a-f]+$/;

/**
 * Octets → hexadécimal minuscule. PURE.
 *
 * Pourquoi ici et pas dans chacun des deux `lib/auth*` : les deux plateformes
 * tirent leurs octets différemment (expo-crypto / WebCrypto) mais doivent en
 * produire la MÊME chaîne, sans quoi l'un des deux écrirait dans l'e-mail un
 * nonce que 0198 refuserait — et la remise se perdrait en silence, c'est-à-dire
 * de la pire façon possible.
 */
export function hexFromBytes2026(bytes: Uint8Array | readonly number[]): string {
  let out = '';
  for (const byte of bytes) {
    // `& 0xff` : un octet reste un octet même si l'appelant se trompe de type.
    out += (byte & 0xff).toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Ce nonce a-t-il la forme que la base acceptera ? PURE.
 *
 * L'app le vérifie AVANT d'écrire l'adresse de retour : un nonce malformé
 * partirait dans un e-mail, reviendrait dans une page, et serait refusé par
 * 0198 sans que personne ne sache pourquoi — l'écran attendrait dix minutes une
 * remise qui ne pouvait pas exister.
 */
export function isHandoffNonce2026(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false;
  return value.length === HANDOFF_NONCE_LENGTH_2026 && NONCE_RE.test(value);
}

/**
 * L'ADRESSE DE RETOUR QUI PART DANS L'E-MAIL. PURE.
 *
 * `https://gryd.run/callback` + `?n=<nonce>`. Le gabarit d'e-mail y accroche
 * ensuite `&token_hash=…&type=…` : c'est pour ça que le nonce est le PREMIER
 * paramètre, et pour ça que cette fonction ne rend jamais une adresse qui se
 * termine par un séparateur.
 *
 * Elle rend `base` INCHANGÉE quand le nonce est malformé : mieux vaut le
 * parcours E4 (la page tend son bouton « Ouvrir GRYD ») qu'une adresse
 * corrompue. L'app ne se met alors simplement pas à attendre.
 */
export function handoffRedirectUrl2026(base: string, nonce: string | null | undefined): string {
  if (!isHandoffNonce2026(nonce)) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}${AUTH_HANDOFF_NONCE_PARAM_2026}=${nonce}`;
}

/** Ce que `auth_handoff_claim_2026` rend quand elle rend quelque chose. */
export interface HandoffClaim2026 {
  readonly refreshToken: string;
  /** `signup` / `magiclink` / … tel que GoTrue l'a écrit, ou `null` s'il manque. */
  readonly type: CallbackType2026 | null;
}

const CALLBACK_TYPES: readonly string[] = [
  'signup',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
];

/**
 * Lit la réponse de `auth_handoff_claim_2026`. PURE.
 *
 * `null` couvre TOUS les refus, et c'est voulu jusqu'ici : la RPC ne dit pas si
 * le nonce est inconnu, expiré ou déjà servi (dire lequel donnerait un oracle
 * d'énumération à un appelant anonyme — voir 0198 §5). L'app n'en a rien à
 * faire : tant qu'elle n'a pas de jeton, elle attend ; passé son plafond, elle
 * propose de renvoyer.
 *
 * ⚠️ ELLE NE DEVINE PAS DE TYPE. Un `type` absent ou inconnu reste `null`, et
 * l'accueil retombe alors sur ses autres sources (`welcomeKind2026`). Fabriquer
 * `'signup'` ici ferait féliciter quelqu'un qui se reconnecte.
 */
export function parseHandoffClaim2026(payload: unknown): HandoffClaim2026 | null {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  const token = record.refresh_token;
  if (typeof token !== 'string' || token.trim().length === 0) return null;
  const rawType = record.type;
  const type =
    typeof rawType === 'string' && CALLBACK_TYPES.includes(rawType)
      ? (rawType as CallbackType2026)
      : null;
  return { refreshToken: token, type };
}

/**
 * L'ÉCRAN DOIT-IL ENCORE INTERROGER ? PURE, horloge injectée.
 *
 * `pollForMs` (10 min) est délibérément PLUS LONG que le TTL du dépôt (5 min,
 * `ttlS`) : un dépôt peut arriver à la 4ᵉ minute et 59ᵉ seconde, et l'app doit
 * encore être là pour le prendre. Au-delà, elle s'arrête — et elle le dit,
 * plutôt que de faire tourner un indicateur pour toujours (L14).
 *
 * Une horloge qui recule (changement de fuseau, mise à l'heure réseau) rend
 * `now - startedAt` négatif : on continue d'attendre plutôt que de conclure sur
 * une mesure qu'on sait fausse.
 */
export function handoffStillWaiting2026(startedAt: number, now: number): boolean {
  if (!Number.isFinite(startedAt) || !Number.isFinite(now)) return false;
  const elapsed = now - startedAt;
  if (elapsed < 0) return true;
  return elapsed < AUTH_HANDOFF_2026.pollForMs;
}

/**
 * L'URL DE RETOUR SYNTHÉTIQUE QUE L'ACCUEIL RELIT. PURE.
 *
 * ─── POURQUOI FABRIQUER UNE URL PLUTÔT QUE PASSER LE TYPE ──────────────────
 * `AccountWelcome2026` calcule son verdict par `callbackType2026(callbackUrl)`,
 * et c'est ce chemin-là qui est testé depuis E3. Lui ajouter un second moyen de
 * dire la même chose (« ou bien ce type-ci, en prop ») créerait exactement la
 * divergence que ce composant existe pour empêcher : deux arrivées, deux règles.
 *
 * L'adresse rendue ne porte AUCUN jeton — seulement le `type` que le serveur a
 * écrit. Elle n'est ni ouverte, ni affichée, ni journalisée : elle n'existe que
 * pour traverser le même lecteur que le lien e-mail.
 *
 * `null` quand le type est inconnu : l'accueil retombe alors sur ses autres
 * sources, ce qui est exactement ce qu'il faut faire quand on ne sait pas.
 */
export function handoffWelcomeUrl2026(
  deepLinkBase: string,
  type: CallbackType2026 | null,
): string | null {
  if (type === null) return null;
  return `${deepLinkBase}?type=${type}`;
}
