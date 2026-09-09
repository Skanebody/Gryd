import { ScrollView, Text, View } from 'react-native';
import { PROGRESSION_RULES_2026, SEASON_REWARDS_2026 } from '@klaim/shared';
import { seasonObjectPreview2026, studioRewardLabel2026 } from '../share/studioObjects2026';
import { StudioObjectArtwork2026 } from '../share/StudioObjectArtwork2026';
import { s, lightStyles, useRefonteCopy } from './ProfilePrimitives';
/** Actual templates, explicitly previews: no user grant, price or outing is invented. */
export function PremiumObjectsPreview2026({locale,tone='dark'}:{tone?:'light'|'dark';locale:'fr'|'en'}) {
  const copy=useRefonteCopy();
  const styles = {
    linkTitle: [s.linkTitle, tone === 'light' && lightStyles.linkTitle],
    meta: [s.meta, tone === 'light' && lightStyles.meta],
  };
  return <View style={{paddingVertical:16,gap:10}}><Text style={styles.linkTitle}>{copy('Les éditions de saison','Season editions')}</Text><Text style={styles.meta}>{copy('Six modèles à obtenir aux mêmes paliers. Leur rendu reste disponible une fois acquis.','Six templates earned at the same milestones. Their render remains available once owned.')}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:18,paddingVertical:8}}>{SEASON_REWARDS_2026.filter(r=>(PROGRESSION_RULES_2026.premiumVariantTiers as readonly number[]).includes(r.tier)).map(reward=><View key={reward.id} style={{width:162,gap:8}}><StudioObjectArtwork2026 object={seasonObjectPreview2026(reward,copy('Saison','Season'),'premium')!} facts={null} width={162} locale={locale}/><Text style={styles.meta}>{copy('Palier','Tier')} {reward.tier} · {copy('Aperçu','Preview')}</Text><Text style={styles.linkTitle}>{studioRewardLabel2026(reward.id,reward.label,locale)}</Text></View>)}</ScrollView></View>;
}
