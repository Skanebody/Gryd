import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydIcon, RewardEmblem } from '../../ui/gryd';
import { useLocale } from '../../i18n/store';
import type { OwnedSeasonReward2026, ProgressCollection2026 } from './ProfileProgress';
import { equippedSeasonIdentity2026 } from './seasonIdentityModel2026';

type IdentityTone2026 = 'dark' | 'light';

/** The same season frame geometry is used by catalogue previews and equipped profiles. */
export function SeasonFrameArtwork2026({ size, premium, tone = 'light', active = true, children, accessibilityLabel }: {
  size: number; premium: boolean; tone?: IdentityTone2026; active?: boolean; children?: ReactNode; accessibilityLabel?: string;
}) {
  const borderWidth = active ? premium ? Math.max(2, Math.round(size * .045)) : Math.max(1, Math.round(size * .025)) : 0;
  const padding = active ? Math.max(3, Math.round(size * .07)) : 0;
  return <View
    accessible={!!accessibilityLabel}
    accessibilityRole={accessibilityLabel ? 'image' : undefined}
    accessibilityLabel={accessibilityLabel}
    style={[styles.frameArtwork, {
      width: size,
      height: size,
      borderRadius: Math.round(size * .25),
      borderWidth,
      borderColor: tone === 'dark' && premium ? c.accent : tone === 'dark' ? c.darkInk : c.ink,
      backgroundColor: tone === 'dark' ? c.carbon : c.surface,
      padding,
    }]}
  >
    <View style={[styles.avatar, { borderRadius: Math.round(size * .18), backgroundColor: tone === 'dark' ? c.darkSurface : c.canvas }]}>
      {children ?? <GrydIcon name="profile" size={Math.round(size * .52)} color={tone === 'dark' ? c.darkInk : c.ink} />}
    </View>
  </View>;
}

/** Season emblem artwork shared by previews, details and the equipped avatar overlay. */
export function SeasonEmblemArtwork2026({ size, premium, tier, tone = 'light', state = 'earned', accessibilityLabel }: {
  size: number; premium: boolean; tier: number; tone?: IdentityTone2026; state?: 'preview' | 'locked' | 'earned'; accessibilityLabel?: string;
}) {
  return <RewardEmblem
    variant="relay"
    size={size}
    level={tier}
    serial={String(tier).padStart(2, '0')}
    tone={tone === 'dark' && premium ? 'accent' : 'neutral'}
    state={state}
    accessibilityLabel={accessibilityLabel}
  />;
}

/** A title is shown as typography because that is exactly how it appears once equipped. */
export function SeasonTitleArtwork2026({ label, premium, tone = 'light', size = 110 }: {
  label: string; premium: boolean; tone?: IdentityTone2026; size?: number;
}) {
  return <View style={[styles.titleArtwork, { width: size, minHeight: Math.min(size, 84), backgroundColor: tone === 'dark' ? c.carbon : c.surface }]} accessible accessibilityRole="text" accessibilityLabel={label}>
    <Text style={[styles.titleEyebrow, { color: tone === 'dark' ? c.darkMuted : c.muted }]}>GRYD · {premium ? 'PLUS' : 'SEASON'}</Text>
    <Text style={[styles.title, { color: tone === 'dark' && premium ? c.accent : tone === 'dark' ? c.darkInk : c.ink }]}>{label}</Text>
  </View>;
}

/** Paints only server-confirmed owned/equipped identity objects, including after GRYD+ expires. */
export function SeasonalIdentity2026({ rewards, collections, children, size = 56 }: {
  rewards: readonly OwnedSeasonReward2026[]; collections: readonly ProgressCollection2026[]; children?: ReactNode; size?: number;
}) {
  const locale = useLocale(); const { frame, title, emblem } = equippedSeasonIdentity2026(rewards);
  if (!frame && !title && !emblem) return <>{children ?? null}</>;
  const titleCollection = title ? collections.find(collection => collection.id === title.collectionId)?.title : null;
  return <View style={styles.identity}>
    <View style={styles.avatarAssembly}>
      <SeasonFrameArtwork2026 size={size} premium={frame?.variant === 'premium'} tone="dark" active={!!frame} accessibilityLabel={frame ? `${locale === 'en' ? 'Season frame' : 'Cadre de saison'} · ${collections.find(collection => collection.id === frame.collectionId)?.title ?? frame.label}` : undefined}>{children}</SeasonFrameArtwork2026>
      {emblem ? <View style={styles.emblem}><SeasonEmblemArtwork2026 size={30} premium={emblem.variant === 'premium'} tier={emblem.tier} tone="dark" state="earned" accessibilityLabel={`${emblem.label} · ${collections.find(collection => collection.id === emblem.collectionId)?.title ?? ''}`} /></View> : null}
    </View>
    {title ? <Text style={[styles.title, title.variant === 'premium' && styles.premiumTitle]}>{titleCollection ?? (locale === 'en' ? 'Season title' : title.label)}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  identity: { alignItems: 'flex-start', gap: 8 },
  avatarAssembly: { position: 'relative' },
  frameArtwork: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  emblem: { position: 'absolute', right: -9, bottom: -7, backgroundColor: c.carbon, borderRadius: 8 },
  titleArtwork: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center', gap: 4 },
  titleEyebrow: { fontFamily: fonts.textMedium, fontSize: 9, lineHeight: 12, letterSpacing: 1.1 },
  title: { maxWidth: 168, fontFamily: fonts.textMedium, fontSize: 11, lineHeight: 16, color: c.darkInk },
  premiumTitle: { color: c.accent },
});
