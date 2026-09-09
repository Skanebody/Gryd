import { studioRewardLabel2026 } from '../share/studioObjects2026';

/** Libellés anglais des objets §7.2 (niveaux) et §7.3 (saison). Le serveur
 * stocke le libellé français figé des modèles ; la traduction reste au client
 * (L18). Module PUR : `SeasonalIdentity2026` le lit sans dépendre d'un écran. */
export const REWARD_EN_2026: Record<string, string> = {
  first_trace: 'First trace', line_frame: 'Line frame', chalk: 'Chalk palette', atlas: 'Atlas collection', contour_animation: 'Contour animation', ridge_merit: 'Ridgeline', cartographer: 'Cartographer', horizon: 'Horizon set',
  season_poster: 'First season poster', participation_badge: 'Participation badge', trace_pattern: 'Trace pattern', profile_frame: 'Season frame', sticker: 'Sticker', title: 'Season title', photo_composition: 'Photo or type composition', personal_emblem: 'Personal emblem', short_animation: 'Short animation', recap: 'Activity recap', final_poster: 'Final poster', season_memory: 'Complete season memory',
};
export function rewardLabel2026(id: string, label: string, locale: string) {
  return studioRewardLabel2026(id, locale === 'en' ? REWARD_EN_2026[id] ?? label : label, locale);
}
