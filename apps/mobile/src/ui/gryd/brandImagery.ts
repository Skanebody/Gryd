import type { ImageSourcePropType } from 'react-native';
import { photoHerosProfil2026 } from './photoLibrary2026';

/**
 * GRYD — LES PHOTOGRAPHIES DE MARQUE, ET LA FIN D'UN DOUBLON (LOT P, 10/09/2026).
 *
 * ─── CE QUI CLOCHAIT ────────────────────────────────────────────────────────
 * `movement` servait TROIS écrans : l'accueil de la découverte
 * (`Discovery2026Screen`), la porte de compte (`AuthEntry2026`) et le bloc
 * « Tout commence dehors » du Profil. Le fondateur, 10/09/2026 : « Pour la
 * photo dans le Profil, celle au milieu dans "Tout commence dehors", on a déjà
 * utilisé cette photo pour l'onboarding. » C'est exactement cela : on ouvrait
 * l'app sur une image, et on la retrouvait, identique, sur sa propre page.
 *
 * ─── CE QUI CHANGE, ET CE QUI NE CHANGE PAS ─────────────────────────────────
 * · `movement` NE BOUGE PAS. La découverte garde SA photo (`e01-crew.jpg`), et
 *   la porte de compte aussi : ce sont les deux premiers écrans de la vie d'un
 *   compte, ils forment une paire, et rien ne demandait de les toucher.
 * · `profileMovement` est NOUVEAU : la photo du crew qui remonte une rue,
 *   recadrée pour le bloc de 148 pt du Profil. Le Profil, et lui seul, la
 *   regarde. Sa géométrie et sa preuve de cadrage vivent dans
 *   `photoLibrary2026.ts` : c'est là que le recadrage se discute.
 */
export const brandImagery = {
  movement: {
    source: require('../../../assets/onboarding/e01-crew.jpg') as ImageSourcePropType,
    fr: 'Visuel GRYD : coureurs et cycliste en ville, détails chartreuse',
    en: 'GRYD brand image: urban runners and cyclist with chartreuse details',
  },
  /**
   * Le héros du Profil. Le `source` vient de la photothèque : une seule ligne
   * décide de ce qui entre dans le binaire, et elle est comptée par un test.
   */
  profileMovement: {
    source: photoHerosProfil2026.source,
    fr: photoHerosProfil2026.alt.fr,
    en: photoHerosProfil2026.alt.en,
  },
  community: {
    source: require('../../../assets/auth/sign-in-crew.jpg') as ImageSourcePropType,
    fr: 'Visuel GRYD : un groupe après une sortie, vêtements noirs et détails chartreuse',
    en: 'GRYD brand image: a group after an outing, black kit and chartreuse details',
  },
} as const;
