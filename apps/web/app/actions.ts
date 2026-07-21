'use server';

import { createClient } from '@supabase/supabase-js';

export type WaitlistFormState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Code postal français : exactement 5 chiffres. */
const POSTAL_CODE_FR_RE = /^\d{5}$/;

/**
 * Inscription waitlist — insert dans la table `waitlist` (SPEC §6.2 :
 * waitlist(email_or_user, postal_code, created_at)).
 * Les erreurs disent quoi faire, ne s'excusent pas (addendum §F).
 */
export async function joinWaitlist(
  _prevState: WaitlistFormState,
  formData: FormData,
): Promise<WaitlistFormState> {
  const email = String(formData.get('email') ?? '')
    .trim()
    .toLowerCase();
  const postalCode = String(formData.get('postal_code') ?? '').trim();

  if (!EMAIL_RE.test(email)) {
    return { status: 'error', message: 'Entre une adresse e-mail valide.' };
  }
  if (!POSTAL_CODE_FR_RE.test(postalCode)) {
    return { status: 'error', message: 'Entre un code postal français à 5 chiffres.' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Honnêteté (charte §1) : ne JAMAIS renvoyer un « succès » sans insert — le
    // visiteur croirait être inscrit et son e-mail serait perdu en silence.
    //
    // La branche DEV renvoyait auparavant `success` pour ne pas gêner le travail
    // local : c'était le même mensonge, juste sur localhost. La décision
    // fondateur du 21/07/2026 ne fait pas d'exception pour localhost. En dev, on
    // renvoie donc une erreur qui NOMME la cause, pour que le fondateur voie
    // immédiatement que rien n'a été enregistré.
    console.error('[waitlist] env Supabase absente — inscription NON enregistrée');
    if (process.env.NODE_ENV !== 'production') {
      return {
        status: 'error',
        message:
          'Waitlist non connectée en local (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY absentes) — rien n’a été enregistré.',
      };
    }
    return {
      status: 'error',
      message: 'L’inscription est momentanément indisponible. Réessaie dans quelques minutes.',
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  // Sécurité (0034) : plus d'insert direct sur `waitlist` (fermé au client pour couper
  // l'insertion en masse). On passe par la RPC SECURITY DEFINER qui valide et insère UNE
  // ligne. Elle renvoie 'ok' | 'invalid'.
  const { data, error } = await supabase.rpc('waitlist_join', {
    p_email: email,
    p_postal_code: postalCode,
  });

  if (error) {
    console.error('[waitlist] rpc waitlist_join échouée :', error.message);
    return { status: 'error', message: 'L’inscription n’est pas passée. Réessaie dans un instant.' };
  }
  if (data === 'invalid') {
    return { status: 'error', message: 'Vérifie ton e-mail et ton code postal (5 chiffres).' };
  }

  return { status: 'success' };
}
