/**
 * GRYD — résolveur d'APERÇU Arsenal (détail « à quoi ça sert »). Mappe un item du
 * catalogue vers son ILLUSTRATION react-native-svg :
 *  - COSMÉTIQUES → aperçu FIDÈLE (on VOIT le rendu réel : skin territoire/trace,
 *    frame, bannière, template, blason) ;
 *  - OBJETS FONCTIONNELS → SCHÉMA de mécanique HONNÊTE (ce que ça fait ET ce que
 *    ça NE fait pas — anti pay-to-win : Bouclier temporaire, Crew Boost = coffre
 *    jamais points, Scout Ping = info sans capture, Streak Gel = série sans zone).
 * Un seul point d'entrée `<ArsenalPreview item size />`, consommé par ItemDetail.
 */
import {
  BannerPreview,
  EmblemPreview,
  FramePreview,
  TemplatePreview,
  TerritorySkinPreview,
  TraceSkinPreview,
  type ArsenalPreviewProps,
} from './cosmetic';
import {
  CrewBoostSchema,
  EclatsPreview,
  MECHANIC_KEYS,
  PackPreview,
  ScoutPingSchema,
  ShieldSchema,
  StreakGelSchema,
  SubscriptionPreview,
} from './mechanics';

export type { ArsenalPreviewProps };

/**
 * Résout et rend l'aperçu illustré d'un item (dispatch par clé puis section).
 * Défaut sûr = un bundle (PackPreview) : jamais de crash sur une clé inconnue.
 */
export function ArsenalPreview({ item, size }: ArsenalPreviewProps) {
  const { key, section } = item;

  // 1) Objets fonctionnels par CLÉ exacte — schéma de mécanique honnête.
  if (key === 'shield') return <ShieldSchema item={item} size={size} />;
  if (key === 'scout_ping') return <ScoutPingSchema item={item} size={size} />;
  if (key === 'streak_gel') return <StreakGelSchema item={item} size={size} />;

  // 2) Crew Boosts = coffre +25 % (JAMAIS points/zones). MAIS le coffre COSMÉTIQUE
  //    'crew_cosmetic_chest' (même section) est un cadeau de style, pas un boost :
  //    il part vers PackPreview (« plusieurs cosmétiques », honnête §21.3) — sinon
  //    il afficherait à tort « +25 % coffre ».
  if (key === 'crew_cosmetic_chest') return <PackPreview item={item} size={size} />;
  if (key.startsWith(MECHANIC_KEYS.crewBoostPrefix)) return <CrewBoostSchema item={item} size={size} />;

  // 3) Cosmétiques par SECTION — aperçu fidèle du rendu réel.
  switch (section) {
    case 'skins_territory':
      return <TerritorySkinPreview item={item} size={size} />;
    case 'skins_trace':
      return <TraceSkinPreview item={item} size={size} />;
    case 'frames':
      return <FramePreview item={item} size={size} />;
    case 'banners':
      return <BannerPreview item={item} size={size} />;
    case 'emblems':
      return <EmblemPreview item={item} size={size} />;
    case 'templates':
      return <TemplatePreview item={item} size={size} />;
    case 'subscriptions':
      return <SubscriptionPreview item={item} size={size} />;
    case 'packs':
      // Packs d'Éclats → aperçu monnaie ; bundles → aperçu contenu.
      return item.slug.startsWith('eclats') ? (
        <EclatsPreview item={item} size={size} />
      ) : (
        <PackPreview item={item} size={size} />
      );
    default:
      return <PackPreview item={item} size={size} />;
  }
}
