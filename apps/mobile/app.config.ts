/**
 * GRYD — config Expo (build-time).
 * Les clés Supabase ne sont JAMAIS en dur ici : elles viennent des variables
 * d'environnement EAS (sensibles) ou d'un `.env` local gitignoré.
 * Seule la clé publishable/anon est injectée dans `extra` — jamais sb_secret_*.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

function rejectServiceSecret(key: string | undefined, label: string): string | undefined {
  if (!key) return undefined;
  if (key.startsWith('sb_secret_') || key.includes('service_role')) {
    throw new Error(
      `${label} : la clé service Supabase (sb_secret_*) ne doit JAMAIS être bundlée dans l'app mobile.`,
    );
  }
  return key;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    'https://sydwxwwirinjoheeodcg.supabase.co';

  const rawKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseAnonKey = rejectServiceSecret(rawKey, 'SUPABASE_ANON_KEY');

  return {
    ...config,
    extra: {
      ...config.extra,
      supabaseUrl,
      ...(supabaseAnonKey ? { supabaseAnonKey } : {}),
    },
  } as ExpoConfig;
};
