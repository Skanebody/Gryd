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

export function emailDelivery2026(raw: string | undefined): 'link' | 'code' {
  return raw === 'code' ? 'code' : 'link';
}

/** The dedicated callback consumes its own one-use code. Legacy URLs retain SDK detection. */
export function shouldAutoDetectAuth2026(platform: string, pathname: string | null): boolean {
  return platform === 'web' && pathname !== null && !/^\/callback\/?$/.test(pathname);
}
