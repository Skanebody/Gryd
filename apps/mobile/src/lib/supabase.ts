/**
 * GRYD — client Supabase (SPEC §6.1).
 * Milestone 1 : l'app doit tourner SANS backend. Si les env EXPO_PUBLIC_*
 * sont absentes (point ouvert O1), le client est null et l'app passe en
 * mode dev : accès direct à la carte, aucun appel réseau.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * DÉFENSIF : `createClient` s'exécute à l'import et LÈVE une exception si l'URL
 * est malformée (le garde ci-dessous ne teste que la présence, pas le format).
 * Un throw ici tuerait l'app au démarrage, avant tout écran. On retombe alors
 * sur le mode sans backend plutôt que de faire planter le lancement.
 */
function makeSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        /**
         * NATIF : false — React Native n'a pas d'URL de callback, il n'y a rien
         * à détecter (et le retour d'auth passe par un deep link, pas par un
         * fragment).
         *
         * WEB : true (corrigé le 21/07/2026). Ça n'a AUCUN effet sur le chemin
         * principal du navigateur, qui est l'OTP par CODE (`verifyOtp`, le code
         * se tape dans l'onglet déjà ouvert — rien ne transite par l'URL). Deux
         * raisons de l'activer quand même :
         *  1. l'e-mail Supabase contient AUSSI un lien ; si le fondateur clique
         *     le lien au lieu de recopier le code, il revient avec la session
         *     dans le fragment `#access_token=…`. À false, ce retour était
         *     silencieusement ignoré : il retombait sur /sign-in alors qu'il
         *     venait de s'authentifier — exactement le genre de cul-de-sac muet
         *     qu'on chasse (⚠️ suppose que l'URL de redirection est allowlistée
         *     côté Supabase ; ce n'est pas le cas de localhost aujourd'hui) ;
         *  2. c'est le préalable technique à un vrai `signInWithOAuth` web le
         *     jour où O2 (identifiants Apple/Google) sera fermé — sans lui,
         *     brancher OAuth donnerait une redirection qui n'aboutit jamais.
         */
        detectSessionInUrl: Platform.OS === 'web',
      },
    });
  } catch (e) {
    console.warn('[GRYD] client Supabase indisponible', e);
    return null;
  }
}

/** Null tant que O1 (projet Supabase) n'est pas configuré. */
export const supabase: SupabaseClient | null = makeSupabase();

export const isSupabaseConfigured: boolean = supabase !== null;
