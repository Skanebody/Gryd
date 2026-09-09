/** Données minimales d'un retour Supabase. Les jetons ne doivent jamais être journalisés. */
export type AuthCallback2026 =
  | { readonly kind: 'pkce'; readonly code: string }
  | { readonly kind: 'tokens'; readonly accessToken: string; readonly refreshToken: string }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'none' };

function paramsFrom(part: string): URLSearchParams {
  return new URLSearchParams(part.replace(/^[?#]/, ''));
}

/**
 * Accepte les deux retours officiellement utilisés par Supabase : code PKCE
 * dans la query, ou session implicite dans le fragment. Fonction pure pour que
 * la régression du deep link natif soit testable sans ouvrir un e-mail.
 */
export function parseAuthCallback2026(rawUrl: string | null | undefined): AuthCallback2026 {
  if (!rawUrl) return { kind: 'none' };
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { kind: 'none' };
  }

  const query = paramsFrom(url.search);
  const fragment = paramsFrom(url.hash);
  const error = query.get('error_description') ?? fragment.get('error_description') ??
    query.get('error') ?? fragment.get('error');
  if (error) return { kind: 'error', message: error };

  const code = query.get('code');
  if (code) return { kind: 'pkce', code };

  const accessToken = fragment.get('access_token') ?? query.get('access_token');
  const refreshToken = fragment.get('refresh_token') ?? query.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'tokens', accessToken, refreshToken };
  return { kind: 'none' };
}

/**
 * CE QUE L'E-MAIL CONTIENT VRAIMENT — un lien, ou un code à six chiffres.
 *
 * ⚠️ `'code'` DEMANDE UNE PREUVE (10/09/2026). L'ancienne règle rendait `'code'`
 * dès que `EXPO_PUBLIC_EMAIL_AUTH_MODE` valait `'code'`. Or le gabarit e-mail
 * est GLOBAL au projet Supabase et porte un LIEN : sur le plan hébergé avec
 * l'expéditeur par défaut, l'API de gestion refuse de le modifier
 * (`supabase/config.toml`, section des gabarits, commentée). Poser cette
 * variable suffisait donc à faire réclamer par l'écran six chiffres que
 * personne ne recevrait — un écran qui attend une saisie impossible, c'est-à-dire
 * un cul-de-sac. Une variable d'environnement CLIENT ne peut pas prouver ce que
 * le SERVEUR envoie.
 *
 * `otpTemplateProven` est donc obligatoire, et il n'existe aujourd'hui AUCUNE
 * source capable de le mettre à `true` : les deux appelants (`lib/auth.ts` et
 * `lib/auth.web.ts`) passent un `false` littéral et greppable. Le jour où un
 * SMTP personnalisé et un gabarit `{{ .Token }}` existent, la preuve devient un
 * fait vérifiable côté serveur — et c'est ELLE qu'on branchera ici, pas la
 * variable d'environnement.
 */
export function emailDelivery2026(
  raw: string | undefined,
  otpTemplateProven: boolean,
): 'link' | 'code' {
  return raw === 'code' && otpTemplateProven ? 'code' : 'link';
}

/**
 * PLAFOND DE PATIENCE du retour de lien magique (`app/(auth)/callback.tsx`).
 *
 * `Linking.useLinkingURL()` peut rendre `null` au tout premier rendu — l'URL
 * initiale d'un lancement à froid arrive par un événement, pas de façon
 * synchrone. L'écran concluait « ce retour n'est plus valide » sur ce premier
 * `null`, c'est-à-dire avant que le système ait eu le temps de répondre : le
 * joueur voyait un échec là où rien n'avait encore échoué.
 *
 * Ce n'est PAS une règle de jeu (elle ne décide ni claim, ni point, ni
 * distance) : elle ne vit donc pas dans `game-rules.ts` — même distinction que
 * `BOOT_STORAGE_TIMEOUT_MS` ou `PROFILE_READ_TIMEOUT_MS`. Valeur alignée sur les
 * autres plafonds de LECTURE LOCALE (3 s, `STORAGE_TIMEOUT_MS`) : au-delà, ce
 * n'est plus une latence de système, c'est une absence de retour.
 */
export const AUTH_CALLBACK_URL_WAIT_MS = 3000;

/**
 * CE QUE L'ÉCRAN DE RETOUR A LE DROIT D'AFFIRMER. PURE.
 *
 * ÉTAPE 0 — LE DÉFAUT : `callback.tsx` n'avait qu'un booléen `failed` et une
 * seule phrase (« Ce retour de connexion n'est plus valide. Demande un nouveau
 * lien. ») pour QUATRE faits incompatibles : un lien expiré, un lien tronqué par
 * un client mail, une panne réseau pendant l'échange, et l'absence pure et
 * simple de retour. Conseiller « demande un nouveau lien » à quelqu'un dont le
 * réseau est coupé lui fait brûler son quota d'envoi pour rien.
 *
 *  · `'expired'`   — GoTrue a nommé l'expiration (`otp_expired`, ou
 *                    « Email link is invalid or has expired ») ;
 *  · `'invalid'`   — le retour porte une erreur SANS mention d'expiration : lien
 *                    recopié à la main, coupé, déjà consommé ;
 *  · `'network'`   — l'échange a été TENTÉ et le transport a lâché ;
 *  · `'no_return'` — aucune URL n'est arrivée dans le délai. On n'accuse ni le
 *                    lien ni le réseau : on dit qu'il ne s'est rien passé ;
 *  · `'unknown'`   — le serveur a refusé sans se laisser classer. On ne devine
 *                    pas la cause (même refus que `classifyEmailLinkFailure`).
 */
export type AuthCallbackVerdict2026 = 'expired' | 'invalid' | 'network' | 'no_return' | 'unknown';

export function authCallbackVerdict2026(input: {
  /** Ce que `parseAuthCallback2026` a lu de l'URL de retour. */
  readonly parsed: AuthCallback2026;
  /**
   * `true` quand le délai est écoulé sans qu'aucune URL ne soit arrivée. Un
   * `parsed.kind === 'none'` AVANT le délai n'est pas un verdict : c'est une
   * attente, et l'écran doit continuer d'attendre.
   */
  readonly waited: boolean;
  /** Message du refus d'échange, s'il y en a eu un. */
  readonly exchangeMessage?: string;
  /** L'échange a-t-il seulement été tenté ? */
  readonly exchanged: boolean;
  /**
   * Verdict de forme, lu dans les paramètres du retour — injecté plutôt
   * qu'importé pour que ce module reste sans dépendance (voir `emailLink.ts`,
   * `linkVerdictFromParams`).
   */
  readonly linkVerdict: 'expired' | 'invalid' | null;
}): AuthCallbackVerdict2026 | null {
  if (input.parsed.kind === 'error') return input.linkVerdict === 'expired' ? 'expired' : 'invalid';
  if (input.exchanged) {
    const m = (input.exchangeMessage ?? '').toLowerCase();
    if (m.length === 0) return 'unknown';
    if (m.includes('expired')) return 'expired';
    if (
      m.includes('failed to fetch') || m.includes('network request failed') ||
      m.includes('networkerror') || m.includes('load failed') || m.includes('timeout')
    ) return 'network';
    // Un code PKCE à usage unique déjà consommé, un `code_verifier` absent : le
    // lien ne vaut plus rien, mais rien ne dit qu'il a EXPIRÉ.
    return 'invalid';
  }
  if (input.parsed.kind === 'none') return input.waited ? 'no_return' : null;
  return null;
}

/** The dedicated callback consumes its own one-use code. Legacy URLs retain SDK detection. */
export function shouldAutoDetectAuth2026(platform: string, pathname: string | null): boolean {
  return platform === 'web' && pathname !== null && !/^\/callback\/?$/.test(pathname);
}
