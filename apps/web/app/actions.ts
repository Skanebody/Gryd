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
    // Honnêteté (charte §1) : ne JAMAIS renvoyer un faux « succès » sans insert —
    // le visiteur croirait être inscrit et son e-mail serait perdu en silence.
    // En PROD, l'env absente est une mauvaise config → erreur honnête. En DEV
    // seulement, on tolère un succès simulé pour ne pas bloquer le travail local.
    if (process.env.NODE_ENV === 'production') {
      console.error('[waitlist] env Supabase absente en production — inscription NON enregistrée');
      return {
        status: 'error',
        message: 'L’inscription est momentanément indisponible. Réessaie dans quelques minutes.',
      };
    }
    console.log('[waitlist] DEV — env Supabase absente, inscription simulée (non enregistrée) :', {
      email,
      postalCode,
    });
    return { status: 'success' };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase
    .from('waitlist')
    .insert({ email_or_user: email, postal_code: postalCode });

  if (error) {
    console.error('[waitlist] insert échoué :', error.message);
    return { status: 'error', message: 'L’inscription n’est pas passée. Réessaie dans un instant.' };
  }

  return { status: 'success' };
}
