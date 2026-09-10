/**
 * GRYD — CE QU'UN QR SCANNÉ DÉSIGNE. Module PUR (LOT Q4, 11/09/2026).
 *
 * ═══ POURQUOI UN SCANNER DANS L'APP, ET PAS L'APPAREIL PHOTO D'iOS ══════════
 * L'app Appareil photo d'iOS n'ouvre QUE des liens http/https, et seulement
 * quand le domaine sert un `apple-app-site-association`. GRYD n'a pas de
 * domaine (arbitrage `gryd.app` vs `gryd.run`, point ouvert O10), donc :
 *   · un QR `https://gryd.run/c/<CODE>` scanné par iOS ouvre Safari sur une
 *     page qui n'existe pas. Un cul-de-sac au moment le plus fragile du
 *     produit, celui où quelqu'un amène quelqu'un ;
 *   · un QR `gryd://c/<CODE>` n'est même pas proposé par l'app Appareil photo
 *     (elle ignore les schémas privés).
 * Le seul chemin qui FONCTIONNE aujourd'hui est donc un scanner EMBARQUÉ : il
 * lit un `gryd://…`, et il route à l'intérieur de l'app, sans domaine, sans
 * navigateur, sans promesse. C'est ce que ce module décide.
 *
 * ═══ CE QU'IL DÉCIDE, ET CE QU'IL REFUSE DE DEVINER ═════════════════════════
 * Il prend le CONTENU BRUT d'un code-barres et rend l'une des quatre réponses
 * ci-dessous. Il ne navigue pas, ne lit rien au réseau, n'ouvre aucune caméra :
 * c'est un test Deno qui le prouve, pas une relecture.
 *
 * ⚠ UNE CHAÎNE NUE N'EST JAMAIS UN CODE DE CREW. `parseInviteInput` (saisie
 * manuelle) accepte « AB12CD » parce que la personne l'a TAPÉ dans un champ qui
 * ne demande que ça. Ici, l'entrée est ce que la caméra a vu : accepter six
 * caractères alphanumériques ferait passer pour une invitation de crew le QR
 * d'un ticket de parking, d'un vélo en libre-service ou d'un code wifi. On
 * n'accepte donc QUE des liens GRYD, et on le dit à l'écran quand ce n'en est
 * pas un.
 *
 * ⚠ UN LIEN GRYD QU'ON NE SAIT PAS OUVRIR N'EST PAS « PAS UN CODE GRYD ». Le
 * jeton d'invitation de 0090 (`/i/<JETON>`, 26 caractères, révocable et daté)
 * est reconnu par `parseInviteRef` mais AUCUN écran ne le consomme aujourd'hui
 * (aucune route `/i/[token]`, `redeem_crew_invite` n'est câblée nulle part).
 * Lui répondre « ce n'est pas un code GRYD » serait faux ; l'envoyer sur une
 * route inexistante serait pire. Il a donc son propre verdict, et l'écran dit
 * la seule chose vraie : cette version de l'app ne sait pas encore le lire.
 */
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH } from '@klaim/shared';
import {
  INVITE_DEEP_LINK_SCHEME,
  INVITE_HOSTS,
  parseInviteRef,
} from '../crew/inviteToken';

/**
 * Segment de chemin d'un profil public. MIROIR de `PROFILE_LINK_PATH`
 * (`features/social/profileLink.ts`), qui construit les liens que ce module
 * lit. Les deux ne peuvent pas être fusionnés : `profileLink.ts` importe le
 * store i18n, donc il ne s'importe pas dans un test Deno. La divergence est
 * tenue par `scanTarget2026.test.ts`, qui lit la SOURCE de l'autre fichier.
 */
export const PROFILE_SCAN_PATH = 'u';

/** Ce qu'un contenu de QR désigne, une fois reconnu. */
export type ScanTarget2026 =
  /** Une invitation de crew par CODE : `gryd://c/AB12CD`. */
  | { readonly kind: 'crew-code'; readonly value: string; readonly path: string }
  /** Une invitation de crew par JETON (0090) : reconnue, pas encore consommable. */
  | { readonly kind: 'crew-token'; readonly value: string }
  /** Un profil public : `gryd://u/lea`. */
  | { readonly kind: 'profile'; readonly value: string; readonly path: string }
  /** Tout le reste. On ne devine pas. */
  | { readonly kind: 'unknown' };

const hostAlternation = INVITE_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|');

/**
 * Regex CONSTRUITES depuis les constantes, jamais écrites en dur (même
 * doctrine que `inviteToken.ts`) : le jour où l'hôte est arbitré, éditer
 * `INVITE_HOSTS` suffit. Les points sont échappés, sinon `grydxrun` matcherait.
 * La longueur du handle vient de `HANDLE_REGEX` via ses deux miroirs.
 */
const PROFILE_DEEP_LINK_RE = new RegExp(
  `^${INVITE_DEEP_LINK_SCHEME}:/*${PROFILE_SCAN_PATH}/(@?[A-Za-z0-9_]{${HANDLE_MIN_LENGTH},${HANDLE_MAX_LENGTH}})/*(?:[?#].*)?$`,
  'i',
);
const PROFILE_WEB_LINK_RE = new RegExp(
  `^https?://(?:www\\.)?(?:${hostAlternation})/${PROFILE_SCAN_PATH}/(@?[A-Za-z0-9_]{${HANDLE_MIN_LENGTH},${HANDLE_MAX_LENGTH}})/*(?:[?#].*)?$`,
  'i',
);

/**
 * Handle d'URL → forme canonique, ou `null`. Même nettoyage que
 * `profileLink.sanitizeHandle` (minuscules, `a-z0-9_`), plus la borne basse :
 * un « @a » n'est le handle de personne, et l'envoyer à un écran de profil
 * produirait « profil introuvable » là où « ce code n'est pas lisible » est la
 * vérité.
 */
function normalizeScannedHandle(raw: string): string | null {
  const clean = raw.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (clean.length < HANDLE_MIN_LENGTH || clean.length > HANDLE_MAX_LENGTH) return null;
  return clean;
}

/**
 * Contenu brut d'un code-barres → ce qu'il désigne.
 *
 * L'ordre compte : on tente le crew d'abord (c'est l'objet du lot), puis le
 * profil. Les deux grammaires ne peuvent pas se recouvrir — `/c/`, `/i/` et
 * `/u/` sont trois segments distincts — donc l'ordre n'arbitre aucun conflit,
 * il évite seulement une seconde passe inutile.
 */
export function parseScannedCode2026(raw: string | null | undefined): ScanTarget2026 {
  if (typeof raw !== 'string') return { kind: 'unknown' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: 'unknown' };

  const invite = parseInviteRef(trimmed);
  if (invite !== null) {
    return invite.kind === 'code'
      ? { kind: 'crew-code', value: invite.value, path: `/c/${invite.value}` }
      : { kind: 'crew-token', value: invite.value };
  }

  const profile = PROFILE_DEEP_LINK_RE.exec(trimmed) ?? PROFILE_WEB_LINK_RE.exec(trimmed);
  if (profile) {
    const raw1 = profile[1];
    const handle = raw1 === undefined ? null : normalizeScannedHandle(raw1);
    if (handle !== null) {
      return { kind: 'profile', value: handle, path: `/profil-rival/${handle}` };
    }
  }

  return { kind: 'unknown' };
}
