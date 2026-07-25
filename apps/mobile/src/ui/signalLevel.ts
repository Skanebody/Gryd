/**
 * GRYD — correspondance PURE « GPS Trust / état de signal RÉELS → niveau d'antenne
 * (0-4) + tonalité ». Aucun import natif → Deno-testable (comme pioneerCelebration
 * / finishedTrace). Le rendu vit dans SignalBars.tsx ; ici, que la décision.
 *
 * Rien d'inventé : un signal faible (intérieur, tunnel…) est NORMAL et universel à
 * tous les appareils — 'weak' colore en AMBRE, jamais en rouge, jamais « ça marche
 * pas ». Un fix pas encore obtenu = 0 barre en acquisition, pas un faux plein.
 */

/** Nombre de barres de l'antenne. */
export const SIGNAL_BAR_COUNT = 4;

/** Tonalité des barres pleines : bon signal (neutre) vs faible (ambre). */
export type SignalTone = 'ok' | 'weak';

/**
 * Niveau (0-`SIGNAL_BAR_COUNT`) + tonalité dérivés du snapshot RÉEL du tracker :
 *  · pas encore de fix exploitable OU signal perdu → 0 barre, ambre ;
 *  · sinon `gpsTrust` (0-100) → 1..N barres (≥ 1 dès qu'un fix compte), ambre si
 *    l'état du dernier fix est « weak ».
 */
export function signalLevel(
  gpsTrust: number,
  signal: 'ok' | 'weak' | 'lost',
  awaitingFirstFix: boolean,
): { level: number; tone: SignalTone } {
  if (awaitingFirstFix || signal === 'lost') return { level: 0, tone: 'weak' };
  const t = Number.isFinite(gpsTrust) ? Math.max(0, Math.min(100, gpsTrust)) : 0;
  const level = Math.max(1, Math.min(SIGNAL_BAR_COUNT, Math.ceil((t / 100) * SIGNAL_BAR_COUNT)));
  return { level, tone: signal === 'weak' ? 'weak' : 'ok' };
}
