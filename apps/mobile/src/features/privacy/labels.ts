/**
 * GRYD — libellés FR de la page Confidentialité (AMENDEMENT-17 CHANTIER 3).
 * Textes courts, clairs, non anxiogènes mais francs sur la géoloc (« la plus
 * critique »). Séparé du store pour que les enums (@klaim/shared + store) restent
 * la source unique ; ici, uniquement de la présentation. Aucun jargon technique
 * (pas de « polyline », « cellule », « rayon H3 »).
 */
import type { ProfileVisibility } from '@klaim/shared';
import type { LivePosition, MaskRadius, RunVisibility, SocialAudience } from './store';

/** Visibilité du profil (aligné motivation PROFILE_VISIBILITY_LABELS). */
export const PROFILE_VISIBILITY_LABELS: Record<ProfileVisibility, string> = {
  private: 'Moi seul',
  friends: 'Mes amis',
  crew: 'Mon crew',
  public: 'Public',
};

/** Visibilité des courses. `hidden` = trace masquée mais impact crew compté. */
export const RUN_VISIBILITY_LABELS: Record<RunVisibility, string> = {
  public: 'Public',
  crew: 'Mon crew',
  hidden: 'Masqué',
};

/** Position live — défaut `never`, jamais publique quel que soit le choix. */
export const LIVE_POSITION_LABELS: Record<LivePosition, { label: string; hint: string }> = {
  never: { label: 'Jamais', hint: 'Personne ne voit où tu es en temps réel.' },
  crew_run: {
    label: 'Sortie crew',
    hint: 'Visible par ton crew seulement pendant une sortie commune.',
  },
  crew: { label: 'Mon crew', hint: 'Ton crew peut voir ta position pendant tes courses.' },
};

/** Rayon de masquage départ/arrivée. */
export const MASK_RADIUS_LABELS: Record<MaskRadius, string> = {
  '200': '200 m',
  '500': '500 m',
  '1000': '1 km',
};

/** Audience sociale (qui peut ajouter / inviter / message / statut). */
export const SOCIAL_AUDIENCE_LABELS: Record<SocialAudience, string> = {
  everyone: 'Tout le monde',
  crew: 'Mon crew',
  friends: 'Mes amis',
  nobody: 'Personne',
};
