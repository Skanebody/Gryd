/**
 * GRYD — E52 : QUELLES ACTIONS D'INVITATION ONT LE DROIT D'ÊTRE PEINTES.
 *
 * ═══ POURQUOI CE FICHIER EXISTE (CONSTITUTION §2, « aucun bouton mort ») ════
 * `CrewInviteQRScreen` peint aujourd'hui « Partager l'invitation » et « Copier
 * le code » SANS CONDITION, puis découvre à l'appel si ça marche
 * (`invite.ts:171-199` rend `{ ok:false, reason:'unavailable' }`, et l'écran
 * affiche alors « Partage indisponible sur cet appareil »). C'est un bouton qui
 * échoue toujours sur les plateformes où il ne peut pas marcher — exactement ce
 * que `features/share/shareTargets.ts` a déjà refusé une fois pour les
 * destinations de partage. On applique ici la MÊME rigueur, avec le même
 * renversement : on ne peint pas une action « sauf si elle est cassée », on ne
 * la peint QUE si sa capacité est DÉMONTRÉE — et « je ne sais pas » compte
 * comme un non.
 *
 * ═══ CE QUI DIFFÈRE DE `shareTargets.ts`, ET POURQUOI ═══════════════════════
 * `shareTargets` répond « vers QUELLE application ». Ici la question est « quel
 * GESTE » : montrer un QR, ouvrir la feuille système, copier, créer un lien qui
 * expire, le révoquer. Deux vocabulaires distincts pour deux décisions
 * distinctes — les fusionner aurait fait porter à un module de partage social
 * une règle de permission de crew, qui n'a rien à y faire.
 *
 * ═══ LE PIÈGE PROPRE À LA COPIE (déjà payé deux fois dans ce dépôt) ═════════
 * `copyInviteLink` (invite.ts:138-164) retombe SILENCIEUSEMENT sur la feuille
 * de partage quand `expo-clipboard` est absent — et renvoie quand même
 * `ok:true`. Deux écrans ont dû corriger le « Code copié » affiché alors qu'une
 * feuille de partage venait de s'ouvrir (`CrewInviteQRScreen:130-135`,
 * `qr.tsx:98-104`). La vraie sortie n'est pas un meilleur message d'après-coup :
 * c'est de savoir AVANT le rendu si un presse-papier existe. D'où
 * `clipboardAvailable` en entrée, et une action `copy` qui ne se peint pas
 * quand la réponse est non.
 *
 * ═══ CE QUE CE MODULE NE FAIT PAS ══════════════════════════════════════════
 * Il n'ouvre rien, ne copie rien, n'importe ni React ni Expo : il est PUR et
 * testable en Deno. Sonder la plateforme est le travail de l'appelant, qui rend
 * ses réponses dans l'entrée — et l'absence de réponse est une valeur légitime
 * (`undefined` = « pas encore sondé », traité comme un non, jamais comme un oui).
 *
 * ANTI PAY-TO-WIN : aucune de ces capacités ne dépend d'un achat, et aucune
 * n'attribue quoi que ce soit. Créer plus de liens ne donne ni territoire, ni
 * point, ni avantage — seulement des gens.
 */
import { CREW_PERMISSIONS, type CrewRole } from '@klaim/shared';

/** Plateforme d'exécution, telle que `Platform.OS` la rapporte. */
export type InvitePlatform = 'ios' | 'android' | 'web';

/**
 * Vocabulaire FERMÉ des gestes d'invitation. Ordre = ordre de lecture à
 * l'écran : ce qu'on montre, puis ce qu'on envoie, puis ce qu'on administre.
 */
export type InviteActionId = 'qr' | 'share' | 'copy' | 'create_link' | 'revoke_link';

export const INVITE_ACTION_ORDER: readonly InviteActionId[] = [
  'qr',
  'share',
  'copy',
  'create_link',
  'revoke_link',
];

/** POURQUOI un geste n'est pas là. Jamais « parce que ». */
export type InviteActionOmission =
  /** Rien à montrer/envoyer : ni code ni jeton n'a encore été lu. */
  | 'nothing_to_share'
  /** Aucun canal sur cette plateforme (structurel). */
  | 'no_channel_on_platform'
  /** Le canal existe mais on n'a pas pu vérifier qu'il répondrait. */
  | 'capability_unknown'
  /** Vérifié, et absent : pas de presse-papier, pas de Web Share. */
  | 'capability_absent'
  /** Aucun backend configuré : la RPC n'a personne au bout. */
  | 'no_backend'
  /** Le rôle ne l'autorise pas (CREW_PERMISSIONS). */
  | 'role_forbidden'
  /** Le rôle n'a pas encore été lu — on ne devine pas une permission. */
  | 'role_unknown'
  /** Rien à révoquer : aucune invitation vivante. */
  | 'nothing_to_revoke';

/** D'où vient le droit de peindre. Jamais une supposition. */
export type InviteActionCertainty =
  /** Rendu localement, sans réseau ni permission système (QR SVG). */
  | 'local'
  /** Fourni par l'OS (feuille de partage native). */
  | 'os_provided'
  /** Une capacité a été SONDÉE et a répondu oui. */
  | 'probed'
  /** Le serveur arbitrera, et le rôle lu autorise la demande. */
  | 'server_arbitrated';

export interface ResolvedInviteAction {
  readonly id: InviteActionId;
  readonly certainty: InviteActionCertainty;
}

export interface OmittedInviteAction {
  readonly id: InviteActionId;
  readonly reason: InviteActionOmission;
}

export interface InviteCapabilitiesResolution {
  readonly actions: readonly ResolvedInviteAction[];
  readonly omitted: readonly OmittedInviteAction[];
}

export interface InviteCapabilitiesInput {
  readonly platform: InvitePlatform;
  /**
   * A-t-on quelque chose à montrer ? Un code lu, un jeton créé — ou rien
   * (lecture en cours, échec). Tant que c'est `false`, AUCUN geste de partage
   * n'est peint : on ne propose pas d'envoyer le vide.
   */
  readonly hasShareable: boolean;
  /**
   * `expo-clipboard` (natif) ou `navigator.clipboard.writeText` (web) est-il
   * RÉELLEMENT là ? `undefined` = pas encore sondé, et vaut non.
   */
  readonly clipboardAvailable?: boolean;
  /**
   * Web uniquement : `navigator.share` existe-t-il ? `undefined` = pas sondé.
   * Sur natif l'API `Share` de react-native est fournie par l'OS — rien à
   * sonder, et c'est pourquoi ce champ n'y est pas consulté.
   */
  readonly webShareAvailable?: boolean;
  /** Un backend est-il configuré (`useSession().configured`) ? */
  readonly backendConfigured: boolean;
  /**
   * Rôle de l'appelant dans SON crew, tel que le serveur l'a rendu. `null` =
   * pas encore lu, ou pas de crew : on ne peint alors aucune administration.
   */
  readonly myRole?: CrewRole | null;
  /** Nombre d'invitations VIVANTES connues (0090 `list_crew_invites`). */
  readonly liveInviteCount?: number;
}

/**
 * Les rôles autorisés à émettre une invitation. LU DANS LA MATRICE, jamais
 * recopié : `CREW_PERMISSIONS.invite` est la loi (game-rules.ts), et la
 * migration 0090 §4.1 applique exactement la même liste côté serveur. Si la
 * matrice s'ouvrait demain au capitaine, l'écran suivrait sans qu'on y touche —
 * et un test PGlite casserait si le SQL, lui, ne suivait pas.
 */
const INVITE_ROLES: readonly string[] = CREW_PERMISSIONS.invite;

/** Le rôle lu autorise-t-il l'émission ? (exporté : l'écran l'affiche aussi) */
export function canIssueInvite(role: CrewRole | null | undefined): boolean {
  return typeof role === 'string' && INVITE_ROLES.includes(role);
}

type Decision =
  | { readonly ok: true; readonly certainty: InviteActionCertainty }
  | { readonly ok: false; readonly reason: InviteActionOmission };

function decideShare(input: InviteCapabilitiesInput): Decision {
  if (!input.hasShareable) return { ok: false, reason: 'nothing_to_share' };
  if (input.platform !== 'web') {
    // `Share.share` de react-native est fourni par l'OS sur iOS et Android :
    // il n'y a rien à sonder, et il ouvre toujours quelque chose.
    return { ok: true, certainty: 'os_provided' };
  }
  if (input.webShareAvailable === undefined) return { ok: false, reason: 'capability_unknown' };
  if (!input.webShareAvailable) return { ok: false, reason: 'capability_absent' };
  return { ok: true, certainty: 'probed' };
}

function decideCopy(input: InviteCapabilitiesInput): Decision {
  if (!input.hasShareable) return { ok: false, reason: 'nothing_to_share' };
  if (input.clipboardAvailable === undefined) return { ok: false, reason: 'capability_unknown' };
  if (!input.clipboardAvailable) return { ok: false, reason: 'capability_absent' };
  return { ok: true, certainty: 'probed' };
}

function decideCreate(input: InviteCapabilitiesInput): Decision {
  // Sans backend, la RPC n'a personne au bout : le bouton serait mort au sens
  // le plus littéral. L'absence est ici la seule réponse honnête.
  if (!input.backendConfigured) return { ok: false, reason: 'no_backend' };
  if (input.myRole === undefined || input.myRole === null) {
    return { ok: false, reason: 'role_unknown' };
  }
  if (!canIssueInvite(input.myRole)) return { ok: false, reason: 'role_forbidden' };
  // Le serveur reste seul juge (plafond d'invitations vivantes, durée) : on
  // peint la DEMANDE, pas la certitude du résultat.
  return { ok: true, certainty: 'server_arbitrated' };
}

function decideRevoke(input: InviteCapabilitiesInput): Decision {
  const create = decideCreate(input);
  // Révoquer suppose les mêmes prérequis d'accès que créer, PLUS quelque chose
  // à fermer. (Le serveur est plus permissif — l'émetteur rétrogradé referme sa
  // propre porte, 0090 §4.2 — mais l'écran n'a pas de quoi le savoir avant
  // d'avoir lu la liste, et peindre « Révoquer » à quelqu'un qui n'a rien émis
  // serait un bouton sans objet.)
  if (!create.ok) return create;
  if (input.liveInviteCount === undefined) return { ok: false, reason: 'capability_unknown' };
  if (input.liveInviteCount <= 0) return { ok: false, reason: 'nothing_to_revoke' };
  return { ok: true, certainty: 'server_arbitrated' };
}

/**
 * LES GESTES RÉELLEMENT DISPONIBLES, dans l'ordre `INVITE_ACTION_ORDER`.
 *
 * PURE : aucune I/O, aucun accès à `Platform`, aucune horloge — tout arrive par
 * `input`. Deux appels avec la même entrée rendent la même sortie.
 *
 * GARANTIES (tenues par `inviteShareCapabilities.test.ts`) :
 *   · rien n'est peint tant qu'il n'y a rien à partager ;
 *   · une capacité non sondée n'autorise JAMAIS un bouton ;
 *   · sans backend, aucune action serveur n'apparaît ;
 *   · l'ordre est stable ;
 *   · `actions` et `omitted` forment ensemble exactement `INVITE_ACTION_ORDER`
 *     — aucun geste ne disparaît sans raison nommée.
 */
export function resolveInviteCapabilities(
  input: InviteCapabilitiesInput,
): InviteCapabilitiesResolution {
  const actions: ResolvedInviteAction[] = [];
  const omitted: OmittedInviteAction[] = [];

  for (const id of INVITE_ACTION_ORDER) {
    let decision: Decision;
    switch (id) {
      case 'qr':
        // Le QR est du SVG rendu localement (react-native-qrcode-svg, dépendance
        // statique) : il marche en avion, dans un parking, sans permission. La
        // seule question est « ai-je quelque chose à encoder ».
        decision = input.hasShareable
          ? { ok: true, certainty: 'local' }
          : { ok: false, reason: 'nothing_to_share' };
        break;
      case 'share':
        decision = decideShare(input);
        break;
      case 'copy':
        decision = decideCopy(input);
        break;
      case 'create_link':
        decision = decideCreate(input);
        break;
      default:
        decision = decideRevoke(input);
        break;
    }
    if (decision.ok) actions.push({ id, certainty: decision.certainty });
    else omitted.push({ id, reason: decision.reason });
  }

  return { actions, omitted };
}
