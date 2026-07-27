/**
 * GRYD — PREMIUM : le DROIT (« entitlement ») GRYD Pro, lu d'un CustomerInfo.
 *
 * Ce module est la MOITIÉ PURE de l'abonnement : il transforme l'objet renvoyé
 * par RevenueCat en un état que l'app peut afficher, et rien d'autre. Aucun
 * import du SDK, aucun I/O, aucune horloge implicite — `nowMs` est INJECTÉ,
 * comme dans `packages/engine`. C'est ce qui le rend testable sous Deno alors
 * que le SDK natif ne l'est pas.
 *
 * ── POURQUOI RECALCULER L'EXPIRATION AU LIEU DE CROIRE `isActive` ───────────
 * `CustomerInfo` est un objet CACHÉ : le SDK le rend depuis son cache local
 * quand le réseau manque, et ce cache peut avoir plusieurs heures. `isActive`
 * y est un booléen figé au moment de la mise en cache. Si l'abonnement a expiré
 * entre-temps, le croire sur parole ferait afficher « Pro actif » à quelqu'un
 * qui ne l'est plus : l'app mentirait. On exige donc les DEUX : le drapeau du
 * SDK **et** une date d'expiration encore dans le futur à `nowMs`.
 * L'inverse n'est pas symétrique : on ne « réactive » jamais un droit
 * qu'`isActive` déclare éteint, même si la date semble future.
 *
 * ── CE QUE CE DROIT NE DONNE PAS (règle CONSTITUTIONNELLE, §1.6) ────────────
 * Aucun état ci-dessous n'est lu par le moteur de capture, de défense ou de
 * classement — et il ne doit jamais l'être. `ProStatus` alimente de l'affichage
 * (statut, cosmétique, analytics), point. Un `if (pro.kind === 'active')` qui
 * modifierait une règle de jeu serait un défaut de conformité, pas une feature.
 */

/**
 * L'identifiant de l'entitlement configuré dans le tableau de bord RevenueCat.
 * C'est de la CONFIGURATION (il doit être identique des deux côtés), pas une
 * constante de jeu : il n'a donc rien à faire dans `game-rules.ts`, qui décrit
 * les règles du jeu. Surchargeable par `EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID`
 * (voir `client.ts`) pour qu'une divergence de nommage se corrige sans build.
 */
export const DEFAULT_PRO_ENTITLEMENT_ID = 'gryd_pro';

/**
 * Sous-ensemble STRUCTUREL de `PurchasesEntitlementInfo` (SDK) réellement lu.
 * On ne dépend pas du type du SDK : ce fichier doit se charger sous Deno, où le
 * paquet n'existe pas. Tous les champs sont optionnels sauf `isActive` — un
 * payload amputé est un cas d'exécution, pas une impossibilité.
 */
export interface EntitlementInfoLike {
  readonly identifier?: string;
  readonly isActive: boolean;
  /** false = renouvellement automatique coupé (l'accès court jusqu'à l'échéance). */
  readonly willRenew?: boolean;
  /** 'NORMAL' | 'INTRO' | 'TRIAL' côté SDK. */
  readonly periodType?: string;
  /** ISO 8601 ; `null`/absent = achat À VIE (aucune échéance). */
  readonly expirationDate?: string | null;
  readonly productIdentifier?: string;
}

/** Sous-ensemble structurel de `CustomerInfo`. */
export interface CustomerInfoLike {
  readonly entitlements?: {
    /** Uniquement les droits ACTIFS (contrat SDK). */
    readonly active?: Record<string, EntitlementInfoLike | undefined>;
    /** Tous les droits jamais accordés — c'est lui qui permet de dire « expiré ». */
    readonly all?: Record<string, EntitlementInfoLike | undefined>;
  };
  /** URL de gestion de l'abonnement (Store) — absente si rien à gérer. */
  readonly managementURL?: string | null;
  readonly originalAppUserId?: string;
}

export type ProStatus =
  | {
      readonly kind: 'active';
      /** Période d'essai gratuite en cours (`periodType === 'TRIAL'`). */
      readonly trial: boolean;
      /** Achat à vie : actif SANS date d'échéance. */
      readonly lifetime: boolean;
      /** Renouvellement automatique coupé : actif, mais jusqu'à `expiresAtMs`. */
      readonly cancelled: boolean;
      /** null ⇔ `lifetime` (ou date illisible — on n'invente pas d'échéance). */
      readonly expiresAtMs: number | null;
      readonly productId: string | null;
    }
  | { readonly kind: 'expired'; readonly expiredAtMs: number | null; readonly productId: string | null }
  /** Jamais eu ce droit. À NE PAS confondre avec « on n'a pas encore lu ». */
  | { readonly kind: 'none' };

/** Date ISO → ms, ou `null` si absente/illisible (jamais NaN qui se propage). */
function parseIsoMs(iso: string | null | undefined): number | null {
  if (typeof iso !== 'string' || iso.length === 0) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Lit le droit Pro. `info` DOIT être un CustomerInfo réellement obtenu :
 * l'absence de lecture (chargement, échec réseau) est un état de l'ÉCRAN, pas
 * un statut d'abonnement — c'est pourquoi il n'existe pas de `kind: 'unknown'`
 * ici et que `null` n'est pas accepté.
 */
export function readProStatus(
  info: CustomerInfoLike,
  entitlementId: string,
  nowMs: number,
): ProStatus {
  const all = info.entitlements?.all;
  const active = info.entitlements?.active;
  // `all` est la source complète (il permet de distinguer « expiré » de « jamais
  // acheté ») ; `active` sert de repli si le SDK ne l'a pas fourni.
  const entry = all?.[entitlementId] ?? active?.[entitlementId];
  if (!entry) return { kind: 'none' };

  const productId = typeof entry.productIdentifier === 'string' ? entry.productIdentifier : null;
  const expiresAtMs = parseIsoMs(entry.expirationDate);
  const expired = expiresAtMs !== null && expiresAtMs <= nowMs;

  if (entry.isActive !== true || expired) {
    // Un droit éteint SANS date connue n'est pas « expiré » : on ne date pas ce
    // qu'on ignore. Il reste néanmoins distinct de « jamais eu » — l'objet
    // existe dans `all`, donc quelque chose a été acheté un jour.
    return { kind: 'expired', expiredAtMs: expiresAtMs, productId };
  }

  return {
    kind: 'active',
    trial: entry.periodType === 'TRIAL',
    lifetime: expiresAtMs === null,
    cancelled: entry.willRenew === false && expiresAtMs !== null,
    expiresAtMs,
    productId,
  };
}

/** Raccourci de lecture — le seul prédicat que les surfaces devraient utiliser. */
export function isProActive(status: ProStatus): boolean {
  return status.kind === 'active';
}

/**
 * URL de gestion de l'abonnement, ou `null`. AUCUN repli inventé : sans URL,
 * l'écran ne peint PAS de bouton « Gérer » (un bouton qui n'ouvre rien est un
 * bouton mort). RevenueCat ne la fournit que lorsqu'il y a réellement un
 * abonnement à gérer sur un store connu.
 */
export function managementUrlOf(info: CustomerInfoLike): string | null {
  const url = info.managementURL;
  if (typeof url !== 'string') return null;
  const v = url.trim();
  return v.startsWith('http') ? v : null;
}
