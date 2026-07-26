/**
 * Inscription waitlist — appel CLIENT de la RPC `waitlist_join` (SPEC §6.2).
 *
 * ─── POURQUOI CE N'EST PLUS UNE SERVER ACTION (26/07/2026) ──────────────────
 * L'ancienne `app/actions.ts` ('use server') n'apportait AUCUN secret : elle
 * appelait la RPC avec la même clé ANON publique que celle inlinée dans le
 * bundle client. La vraie frontière de sécurité est la RPC elle-même
 * (0034_waitlist_lockdown : SECURITY DEFINER, INSERT direct révoqué pour anon,
 * validation + insert d'UNE ligne côté Postgres, `grant execute … to anon`).
 * Appeler la RPC depuis le navigateur est donc STRICTEMENT équivalent — et ça
 * rend le site exportable statique (AMENDEMENT-47 : le lien public sert
 * `apps/web`, GitHub Pages ne sert que du statique).
 *
 * ─── HONNÊTETÉ (charte §1) ──────────────────────────────────────────────────
 * Ne JAMAIS renvoyer un « succès » sans insert réel : env Supabase absente →
 * erreur qui NOMME la cause (en dev) ou dit l'indisponibilité (en prod). Les
 * messages sont ceux de l'ancienne action, relus pour dire quoi faire sans
 * s'excuser (addendum §F).
 */
import { createClient } from '@supabase/supabase-js';

export type WaitlistFormState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Code postal français : exactement 5 chiffres. */
const POSTAL_CODE_FR_RE = /^\d{5}$/;

export async function joinWaitlist(formData: FormData): Promise<WaitlistFormState> {
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

  // Clés PUBLIQUES par design (anon + RLS), inlinées au build par Next.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
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
  // Sécurité (0034) : pas d'insert direct sur `waitlist` (fermé au client). La RPC
  // SECURITY DEFINER valide et insère UNE ligne. Elle renvoie 'ok' | 'invalid'.
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
