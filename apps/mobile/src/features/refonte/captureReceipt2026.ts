import type { IngestRunResponse } from '@klaim/shared';
export type CaptureReceipt2026 = NonNullable<IngestRunResponse['territory2026']> & { remainingTerrainM2?: number | null; publishedAreaM2?: number | null; asOf?: string };
export function remainingCaptureArea2026(receipt: CaptureReceipt2026 | undefined): number | null {
  const value = receipt?.remainingTerrainM2;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
/** Describes only a server reason. No closed-loop verdict is guessed from the preview. */
export function captureExplanation2026(receipt: CaptureReceipt2026 | undefined, fr: boolean): { title: string; body: string } | null {
  if (!receipt || receipt.status === 'published') return null;
  const t = (a: string,b: string) => fr ? a : b;
  if (receipt.status === 'scheduled') return { title: t('Boucle validée · publication différée', 'Loop validated · delayed publication'), body: t('Ton terrain partagé changera après le délai de confidentialité. Aucun gain n’est encore annoncé.', 'Shared terrain changes after the privacy delay. No gain is confirmed yet.') };
  if (receipt.reason === 'protected_place') return { title: t('Boucle gardée privée', 'Loop kept private'), body: t('Elle touche une zone personnelle protégée. Aucun terrain partagé n’est modifié.', 'It touches a personal protected place. Shared terrain is unchanged.') };
  if (receipt.reason === 'consent_withdrawn') return { title: t('Participation retirée', 'Participation withdrawn'), body: t('Cette sortie ne participe plus à la carte partagée. Elle reste dans ton journal.', 'This activity no longer participates in shared terrain. It stays in your journal.') };
  if (receipt.status === 'private') return { title: t('Sortie privée', 'Private activity'), body: t('La participation à la carte partagée n’est pas autorisée pour cette sortie.', 'Shared terrain participation is not authorised for this activity.') };
  if (receipt.reason === 'gps_quality_unconfirmed') return { title: t('Précision GPS insuffisante', 'GPS accuracy insufficient'), body: t('La précision ou une interruption empêche de confirmer la zone. Ta sortie est enregistrée.', 'Accuracy or a recording gap prevents confirmation of this area. Your activity is saved.') };
  if (receipt.reason === 'loop_too_small') return { title: t('Boucle trop petite', 'Loop too small'), body: t('La longueur ou la surface de cette boucle est insuffisante pour le terrain partagé. Ta sortie est enregistrée.', 'The loop is too short or its area too small for shared terrain. Your activity is saved.') };
  if (receipt.reason === 'closure_crosses_known_barrier') return { title: t('Fermeture à vérifier', 'Closure needs verification'), body: t('Le raccord de fermeture traverse une exclusion connue. Aucune capture n’est publiée.', 'The closure connector crosses a known exclusion. No capture is published.') };
  if (receipt.reason === 'source_or_clock_unconfirmed') return { title: t('Origine ou horaire à confirmer', 'Source or time unconfirmed'), body: t('Le serveur ne peut pas confirmer la provenance ou l’heure de fermeture. Ta sortie reste enregistrée.', 'The server cannot confirm the source or closure time. Your activity remains saved.') };
  if (receipt.reason === 'verification_required') return { title: t('Vérification nécessaire', 'Verification required'), body: t('Cette activité nécessite une vérification avant de modifier le terrain partagé.', 'This activity needs verification before it changes shared terrain.') };
  if (receipt.status === 'no_loop') return { title: t('Aucune boucle admissible', 'No eligible loop'), body: t('La trace validée ne forme pas de boucle admissible pour cette discipline. Ta sortie est enregistrée.', 'The validated route does not form an eligible loop for this sport. Your activity is saved.') };
  if (receipt.status === 'pending') return { title: t('Terrain en attente', 'Terrain pending'), body: t('Le résultat territorial n’est pas encore disponible. Les mesures sportives sont conservées.', 'The terrain result is not available yet. Your sporting record is saved.') };
  return null;
}
