import type { IngestRunResponse } from '@klaim/shared';

/**
 * STATUT DE CAPTURE, VOLONTAIREMENT OUVERT. Le serveur (ingest_run) est seul
 * juge et son vocabulaire s'enrichit — `rejected` arrive avec le lot R2S. Un
 * client qui ferme l'union à ce qu'il connaît AUJOURD'HUI ne se contente pas de
 * ne rien afficher : il fait tomber le statut inconnu dans sa branche par
 * défaut, c'est-à-dire « Sortie enregistrée », et transforme un refus en
 * silence rassurant. Le `(string & {})` garde l'autocomplétion des valeurs
 * connues tout en laissant passer celles qui viendront.
 */
export type CaptureStatus2026 =
  | 'private' | 'pending' | 'scheduled' | 'published' | 'no_loop' | 'rejected'
  | (string & {});

export type CaptureReceipt2026 =
  Omit<NonNullable<IngestRunResponse['territory2026']>, 'status'>
  & { status: CaptureStatus2026; remainingTerrainM2?: number | null; publishedAreaM2?: number | null; asOf?: string };

/**
 * Réponse d'ingestion telle que le serveur de septembre la rend RÉELLEMENT :
 * la progression sportive y est confirmée séparément du terrain (§5.5 règle 8 —
 * « un échec géographique ne bloque pas les XP sportifs »). Le type partagé ne
 * porte pas encore ce champ ; on le lit ici de façon tolérante plutôt que de
 * gater la progression sur `status`, qui vaut invariablement `'valid'`.
 */
export type RunReceipt2026 = IngestRunResponse & {
  progression2026?: { status?: 'confirmed' | 'pending'; totalXp?: number };
};

/**
 * SEUIL D'AFFICHAGE (pas une règle de jeu : il ne décide d'aucune capture) —
 * en dessous, une surface se lit en m². À 0,01 km² près, trois décimales de
 * km² affichent « 0 » pour un gain qui existe : le cahier §5.4 raisonne en
 * « +0,18 km² », mais une part de gain de quelques centaines de m² est réelle
 * et doit se voir. Jamais un zéro nu (L14).
 */
const AREA_M2_MIN_FOR_KM2 = 10_000;

/**
 * Surface RÉELLE, avec son unité. `null` quand ce n'est pas une surface — on
 * n'invente pas un zéro pour remplir une case.
 */
export function captureAreaParts2026(
  m2: number | null | undefined,
  fr: boolean,
): { value: string; unit: 'km²' | 'm²' } | null {
  if (typeof m2 !== 'number' || !Number.isFinite(m2) || m2 < 0) return null;
  const locale = fr ? 'fr-FR' : 'en-GB';
  if (m2 < AREA_M2_MIN_FOR_KM2) return { value: Math.round(m2).toLocaleString(locale), unit: 'm²' };
  return { value: (m2 / 1e6).toLocaleString(locale, { maximumFractionDigits: 3 }), unit: 'km²' };
}

export function captureAreaLabel2026(m2: number | null | undefined, fr: boolean): string | null {
  const parts = captureAreaParts2026(m2, fr);
  return parts === null ? null : `${parts.value} ${parts.unit}`;
}
export function remainingCaptureArea2026(receipt: CaptureReceipt2026 | undefined): number | null {
  const value = receipt?.remainingTerrainM2;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}
/**
 * Les motifs que CE client sait mettre en français. La liste n'est pas une
 * règle de jeu : c'est l'inventaire de ce qu'on sait traduire, et tout ce qui
 * n'y figure pas est affiché tel quel plutôt que rangé sous la phrase générique
 * du statut.
 */
const KNOWN_CAPTURE_REASONS_2026: readonly string[] = [
  'protected_place', 'consent_withdrawn', 'gps_quality_unconfirmed', 'loop_too_small',
  'closure_crosses_known_barrier', 'source_or_clock_unconfirmed', 'verification_required',
  'no_admissible_loop',
];

/** Describes only a server reason. No closed-loop verdict is guessed from the preview. */
export function captureExplanation2026(receipt: CaptureReceipt2026 | undefined, fr: boolean): { title: string; body: string } | null {
  if (!receipt || receipt.status === 'published') return null;
  const t = (a: string,b: string) => fr ? a : b;
  // Un motif que ce client ne sait pas traduire NE DOIT PAS tomber dans la
  // phrase générique de son statut (« Aucune boucle admissible ») : le joueur
  // lirait une explication qui n'est pas la sienne. On sort tout de suite vers
  // la reprise brute, en bas de fonction.
  const known = receipt.reason === undefined || KNOWN_CAPTURE_REASONS_2026.includes(receipt.reason);
  if (known) {
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
  }
  // ─── CE QUE LE CLIENT NE CONNAÎT PAS, IL LE DIT (10/09/2026) ──────────────
  // Ce `return null` final valait « aucune explication » : l'écran retombait
  // alors sur « Sortie enregistrée » et le joueur ne savait pas pourquoi sa
  // boucle n'avait pris aucun terrain. Le serveur est seul juge et son
  // vocabulaire s'enrichit : un motif ou un statut inconnu est RECOPIÉ tel
  // quel — un mot technique visible vaut mieux qu'un silence rassurant, et il
  // rend le support possible.
  const raw = receipt.reason ?? receipt.status;
  return {
    title: t('Terrain non attribué', 'No terrain awarded'),
    body: t(
      `Le serveur n’a pas attribué de terrain à cette sortie. Motif transmis : ${raw}. Ta sortie est enregistrée.`,
      `The server awarded no terrain for this activity. Reported reason: ${raw}. Your activity is saved.`,
    ),
  };
}
