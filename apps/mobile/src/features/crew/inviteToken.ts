/**
 * GRYD — E52 : LE JETON D'INVITATION, CÔTÉ CLIENT. Module PUR.
 *
 * ═══ CE QU'IL EST, ET CE QU'IL N'EST PAS ════════════════════════════════════
 * Le dépôt connaissait UN SEUL objet d'invitation : `crews.code`, six
 * caractères A-Z0-9, permanent, partagé par tout le crew (0002:43, rendu par
 * `my_crew_code()` 0042:238). La migration 0090 en ajoute un SECOND, sans
 * retirer le premier : un JETON de 26 caractères base32 tiré de 128 bits,
 * qui EXPIRE et se RÉVOQUE.
 *
 * Les deux coexistent parce qu'ils ne servent pas au même geste :
 *   · LE CODE se TAPE. Il se dit à voix haute au bord d'une piste, il se
 *     recopie depuis un écran, il ne dépend d'aucun lien. Il ne peut pas être
 *     long, donc il ne peut pas être sûr, donc il ne peut pas expirer sans
 *     casser le crew entier. C'est un mot de passe d'équipe.
 *   · LE JETON se PARTAGE. Il vit dans une URL, un QR, un DM. Il est long,
 *     donc il peut être sûr, donc il peut porter un droit daté et révocable.
 * Ce fichier ne décide RIEN sur l'adhésion : il met en forme, il reconnaît, et
 * il dit ce qu'une date d'expiration signifie. La seule autorité reste la RPC
 * `redeem_crew_invite` (0090 §4.5), arbitrée serveur.
 *
 * ═══ POURQUOI IL EST PUR (ZÉRO IMPORT REACT-NATIVE) ═════════════════════════
 * `pendingInvite.ts` tire `AsyncStorage` et `expo-router`, donc il ne
 * s'importe pas dans un test Deno — c'est exactement pour ça que
 * `features/invite/inviteMembership.ts` avait dû DUPLIQUER trois lignes de
 * normalisation. On ne recommence pas : tout ce qui est décidable sans I/O vit
 * ICI, testé en Deno, et les modules impurs viennent s'y servir.
 *
 * ANTI PAY-TO-WIN : aucune constante de jeu ne passe par ce fichier. Un jeton
 * n'attribue ni territoire, ni point, ni protection — il ouvre une porte.
 *
 * VIE PRIVÉE : un lien construit ici ne contient AUCUN @handle, AUCUN
 * identifiant de personne, AUCUNE ville. Le jeton est un aléa pur (0090 §0 bis)
 * et le chemin ne porte rien d'autre. C'est vérifié par le test.
 */
import {
  CREW_CODE_LENGTH,
  CREW_INVITE_DEFAULT_TTL_HOURS,
  CREW_INVITE_MAX_TTL_HOURS,
  CREW_INVITE_MIN_TTL_HOURS,
  CREW_INVITE_TOKEN_LENGTH,
} from '@klaim/shared';

/**
 * Hôtes acceptés pour un lien web d'invitation. Les DEUX sont reconnus tant que
 * l'arbitrage `gryd.app` vs `gryd.run` n'est pas rendu (point ouvert O10) : le
 * jour où le domaine existe, aucun code applicatif à toucher.
 *
 * ⚠ SOURCE UNIQUE : `features/crew/pendingInvite.ts` et
 * `features/social/profileLink.ts` s'y adossent. Deux listes divergeraient au
 * premier arbitrage.
 */
export const INVITE_HOSTS = ['gryd.run', 'gryd.app'] as const;

/** Scheme natif déclaré dans `app.json`. */
export const INVITE_DEEP_LINK_SCHEME = 'gryd';

/** Segment de chemin des invitations par CODE (héritage 0042, inchangé). */
export const INVITE_CODE_PATH = 'c';

/**
 * Segment de chemin des invitations par JETON. Distinct de `/c/` À DESSEIN :
 * un jeton et un code n'ont ni la même longueur, ni la même durée de vie, ni
 * la même RPC au bout. Les mélanger sur un même chemin obligerait le
 * destinataire à deviner lequel il tient — et l'écran à afficher une expiration
 * qui, pour un code, n'existe pas.
 */
export const INVITE_TOKEN_PATH = 'i';

/**
 * Alphabet base32 « Crockford » (les 32 symboles moins I, L, O, U) — le MÊME
 * que celui du tirage serveur (0090 §3). Ni 1/I ni 0/O ne peuvent se confondre :
 * un jeton se relit à voix haute et se retape depuis un écran photographié.
 */
const TOKEN_ALPHABET_RE = /^[0-9A-HJKMNP-TV-Z]+$/;

// ─── Normalisation ───────────────────────────────────────────────────────────

/**
 * Code crew → forme canonique (majuscules, A-Z0-9, longueur EXACTE
 * `CREW_CODE_LENGTH`), ou `null`. Aucun nombre magique : la longueur vient de
 * shared.
 */
export function normalizeInviteCode(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length === CREW_CODE_LENGTH ? clean : null;
}

/**
 * Jeton → forme canonique, ou `null`.
 *
 * On retire tout ce qui n'est pas alphanumérique (espaces, tirets, retours à la
 * ligne) AVANT de valider : un jeton recopié depuis un message arrive coupé.
 * C'est la MÊME normalisation que `gryd_invite_token_hash` côté serveur
 * (0090 §3) — si les deux divergeaient, un jeton accepté par l'app serait
 * refusé par la base, ce qui est le pire des deux mondes.
 *
 * On refuse ensuite tout ce qui contient I, L, O ou U : ces lettres ne sortent
 * JAMAIS d'un tirage, donc leur présence signale une faute de recopie (un « I »
 * pour un « 1 ») plutôt qu'un jeton valide. Mieux vaut dire « ce lien n'est pas
 * lisible » que d'aller interroger le serveur avec une chaîne qu'on sait fausse.
 */
export function normalizeInviteToken(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (clean.length !== CREW_INVITE_TOKEN_LENGTH) return null;
  return TOKEN_ALPHABET_RE.test(clean) ? clean : null;
}

// ─── Ce qu'un lien entrant désigne ───────────────────────────────────────────

/**
 * Une invitation reçue, une fois reconnue. Discriminée : l'écran d'atterrissage
 * ne doit JAMAIS traiter un code comme un jeton (il promettrait une expiration
 * inexistante) ni un jeton comme un code (`join_crew_by_code` répondrait
 * `bad_code` sur un jeton parfaitement valide).
 */
export type InviteRef =
  | { readonly kind: 'code'; readonly value: string }
  | { readonly kind: 'token'; readonly value: string };

const hostAlternation = INVITE_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|');

/**
 * Regex CONSTRUITES depuis `INVITE_HOSTS` et les constantes de chemin, jamais
 * écrites en dur : sans ça, éditer la liste d'hôtes n'aurait aucun effet sur le
 * parsing réel — un piège documenté à l'envers. Les points sont échappés (sinon
 * `grydxrun` matcherait aussi).
 */
const DEEP_LINK_RE = new RegExp(
  `^${INVITE_DEEP_LINK_SCHEME}:/*(${INVITE_CODE_PATH}|${INVITE_TOKEN_PATH})/([A-Za-z0-9]+)/*(?:[?#].*)?$`,
  'i',
);
const WEB_LINK_RE = new RegExp(
  `^https?://(?:www\\.)?(?:${hostAlternation})/(${INVITE_CODE_PATH}|${INVITE_TOKEN_PATH})/([A-Za-z0-9]+)/*(?:[?#].*)?$`,
  'i',
);

/**
 * URL entrante → invitation reconnue, ou `null`.
 *
 * STRICT PAR CONSTRUCTION : un deep link est une entrée hostile comme une
 * autre. Un `gryd://run/42`, un `https://gryd.run/blog`, un autre domaine, une
 * longueur qui ne colle pas — rien de tout ça ne produit de navigation.
 *
 * ⚠ LE SEGMENT DÉCIDE, PAS LA LONGUEUR. Un `/c/` porte un code, un `/i/` porte
 * un jeton : si le segment et la forme se contredisent, on rend `null` plutôt
 * que de « corriger » l'intention de l'émetteur.
 */
export function parseInviteRef(url: string | null | undefined): InviteRef | null {
  if (typeof url !== 'string' || url.length === 0) return null;
  const trimmed = url.trim();
  const match = DEEP_LINK_RE.exec(trimmed) ?? WEB_LINK_RE.exec(trimmed);
  if (!match) return null;
  // `noUncheckedIndexedAccess` : les groupes sont typés `string | undefined`
  // même quand la regex les rend obligatoires. On ne casse pas le typage avec
  // un `!` — un groupe absent est ici indiscernable d'une URL non reconnue.
  const segment = match[1];
  const raw = match[2];
  if (segment === undefined || raw === undefined) return null;
  if (segment.toLowerCase() === INVITE_TOKEN_PATH) {
    const token = normalizeInviteToken(raw);
    return token === null ? null : { kind: 'token', value: token };
  }
  const code = normalizeInviteCode(raw);
  return code === null ? null : { kind: 'code', value: code };
}

/**
 * Paramètre de route `/c/[code]` (ou une saisie manuelle) → invitation. Même
 * arbitrage que ci-dessus, mais sans URL : on n'a que la chaîne, donc c'est sa
 * FORME qui tranche, et les deux formes ne peuvent pas se confondre (6 vs 26).
 */
export function parseInviteInput(raw: string | null | undefined): InviteRef | null {
  const token = normalizeInviteToken(raw);
  if (token !== null) return { kind: 'token', value: token };
  const code = normalizeInviteCode(raw);
  return code === null ? null : { kind: 'code', value: code };
}

// ─── Construction des liens ──────────────────────────────────────────────────

/** Hôte servi aux liens partagés (premier de `INVITE_HOSTS`). */
export const INVITE_LINK_HOST = INVITE_HOSTS[0];

/**
 * Lien HTTPS d'une invitation par JETON — `https://gryd.run/i/<TOKEN>`.
 *
 * POURQUOI HTTPS ET PAS `gryd://` : un lien d'invitation atterrit chez
 * quelqu'un qui n'a PAS l'app (c'est même le cas le plus fréquent). Un
 * `gryd://…` ouvert sans l'app ne mène nulle part — un cul-de-sac. Un lien
 * https fonctionne partout, et le jour où le domaine sert les universal links,
 * le MÊME lien ouvre l'app sans qu'on retouche une ligne ni qu'on réimprime les
 * affiches déjà distribuées.
 *
 * Le jeton est écrit en MAJUSCULES : c'est sa forme canonique, celle du serveur
 * (`upper()` dans `gryd_invite_token_hash`). Le parsing reste insensible à la
 * casse des deux côtés, donc un lien recopié en minuscules fonctionne quand
 * même — mais ce qu'on ÉMET est lisible et cohérent avec ce qu'on AFFICHE.
 */
export function buildInviteTokenLink(token: string): string {
  const safe = normalizeInviteToken(token);
  if (safe === null) throw new Error('buildInviteTokenLink: jeton invalide');
  return `https://${INVITE_LINK_HOST}/${INVITE_TOKEN_PATH}/${safe}`;
}

/** Deep link natif équivalent — réservé au routage in-app, jamais au QR. */
export function buildInviteTokenDeepLink(token: string): string {
  const safe = normalizeInviteToken(token);
  if (safe === null) throw new Error('buildInviteTokenDeepLink: jeton invalide');
  return `${INVITE_DEEP_LINK_SCHEME}://${INVITE_TOKEN_PATH}/${safe}`;
}

/**
 * Découpe le jeton en groupes de lisibilité (`ABCD-EFGH-…`) pour l'AFFICHAGE
 * seul. Jamais pour un lien : la normalisation retire les tirets des deux
 * côtés, mais un lien propre n'a pas à contenir de décor.
 */
export function formatInviteTokenForDisplay(token: string, group = 4): string {
  const safe = normalizeInviteToken(token);
  if (safe === null) return '';
  const chunks: string[] = [];
  for (let i = 0; i < safe.length; i += group) chunks.push(safe.slice(i, i + group));
  return chunks.join('-');
}

// ─── Ce qu'une date d'expiration VEUT DIRE ───────────────────────────────────

/**
 * L'état d'une invitation, tel que l'écran a le droit de le rendre. Cinq
 * valeurs, jamais fondues — c'est la règle des états distincts appliquée à un
 * objet qui a une horloge.
 */
export type InviteLifetime =
  /** Vivante, avec du temps devant. */
  | { readonly state: 'live'; readonly hoursLeft: number }
  /** Vivante mais bientôt morte : l'écran a le DEVOIR de le dire avant le tap. */
  | { readonly state: 'expiring'; readonly hoursLeft: number }
  /** Morte par le temps. */
  | { readonly state: 'expired' }
  /** Morte par décision humaine — DISTINCT de l'expiration (0090 §4.4). */
  | { readonly state: 'revoked' }
  /** On ne sait pas : date absente ou illisible. On n'affirme RIEN. */
  | { readonly state: 'unknown' };

/**
 * Seuil de l'alerte « ça expire bientôt ». 24 h et pas une constante de jeu :
 * c'est une règle d'AFFICHAGE (au-delà d'un jour, « expire le … » suffit ; en
 * deçà, la personne doit savoir qu'elle n'a plus le temps de repousser).
 * Aucune mécanique de jeu ne la lit — sa place n'est donc pas dans
 * `game-rules.ts`, qui ne contient que ce qui décide du jeu.
 */
export const INVITE_EXPIRING_SOON_HOURS = 24;

/**
 * Que reste-t-il de cette invitation ? PURE : l'horloge entre par `now`, jamais
 * par `Date.now()` — sinon la fonction ne serait pas testable et l'écran
 * dépendrait de la montre du téléphone sans qu'on puisse le prouver.
 *
 * `revokedAt` PRIME sur l'expiration : une invitation fermée à la main l'a été
 * pour une raison, et « expirée » raconterait une histoire d'oubli là où il y a
 * eu une décision.
 */
export function inviteLifetime(
  input: {
    readonly expiresAt?: string | number | null;
    readonly revokedAt?: string | number | null;
  },
  now: number,
): InviteLifetime {
  if (input.revokedAt !== null && input.revokedAt !== undefined && input.revokedAt !== '') {
    return { state: 'revoked' };
  }
  const at = toEpochMs(input.expiresAt);
  if (at === null || !Number.isFinite(now)) return { state: 'unknown' };
  const msLeft = at - now;
  if (msLeft <= 0) return { state: 'expired' };
  // Arrondi au SUPÉRIEUR : à 90 minutes on annonce « 2 h », jamais « 1 h ».
  // Sous-estimer le temps restant ferait courir quelqu'un pour rien ; le
  // surestimer ferait rater la fenêtre. On choisit de ne jamais faire rater.
  const hoursLeft = Math.ceil(msLeft / 3_600_000);
  return hoursLeft <= INVITE_EXPIRING_SOON_HOURS
    ? { state: 'expiring', hoursLeft }
    : { state: 'live', hoursLeft };
}

/** Date ISO ou epoch ms → epoch ms, ou `null` si ce n'est pas une date. */
function toEpochMs(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

// ─── Durée demandée à la création ────────────────────────────────────────────

/**
 * Les durées que l'écran a le droit de proposer. Bornées par les constantes
 * partagées, donc jamais en contradiction avec ce que le serveur acceptera —
 * `create_crew_invite` REFUSE hors bornes (`bad_ttl`) au lieu de rogner, et un
 * écran qui proposerait 60 jours ferait mentir le serveur pour lui.
 */
export const INVITE_TTL_CHOICES: readonly number[] = [24, 168, 720].filter(
  (h) => h >= CREW_INVITE_MIN_TTL_HOURS && h <= CREW_INVITE_MAX_TTL_HOURS,
);

/** La durée par défaut, celle que le serveur appliquerait sans paramètre. */
export const INVITE_TTL_DEFAULT = CREW_INVITE_DEFAULT_TTL_HOURS;

/**
 * Une durée est-elle envoyable ? Le client ne « corrige » pas une valeur hors
 * bornes : il ne l'envoie pas. Rogner en silence produirait un lien dont la
 * durée n'est pas celle qu'on vient d'annoncer.
 */
export function isSendableTtlHours(hours: number): boolean {
  return (
    Number.isInteger(hours) &&
    hours >= CREW_INVITE_MIN_TTL_HOURS &&
    hours <= CREW_INVITE_MAX_TTL_HOURS
  );
}
