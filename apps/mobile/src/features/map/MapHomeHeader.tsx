/**
 * GRYD — Header Home Map (Vague 1 · E02 / E03).
 * Avatar 40 (profil joueur — planche « LR ») + pill lieu « Ville · Centre » +
 * notifs 44. Translucide, 3 cibles séparées ≥ 44 pt.
 * Ne concurrence pas la mission (sheet) ni le CTA RUN.
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, gameColors, radii, withAlpha } from '@klaim/shared';
import { C } from '../../i18n/catalog/map';
import { useT } from '../../i18n/store';
import { haptics } from '../../lib/haptics';
import { useOnboardingState } from '../onboarding/store';
import {
  effectiveInitials,
  useMyProfile,
} from '../social/profileStore';
import { Icon } from '../../ui/Icon';

const AVATAR = 40;
const NOTIF = 44;
const SIDE = 20;

/** « Brest (FR) » → « Brest » — le pays n'entre pas dans la pill planche. */
function cityShortName(raw: string): string {
  return raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export function MapHomeHeader({ alertDot = false }: { alertDot?: boolean }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { profile } = useMyProfile();
  const { state: onboarding } = useOnboardingState();
  const initials = effectiveInitials(profile);
  const city =
    cityShortName(profile.city) ||
    cityShortName(onboarding.cityName ?? '') ||
    '';
  const place =
    city.length > 0
      ? `${city} · ${t(C.mapHeaderDistrictCentre)}`
      : t(C.mapHeaderPlaceFallback);

  return (
    <View
      style={[styles.row, { top: insets.top + 10, paddingHorizontal: SIDE }]}
      pointerEvents="box-none"
      testID="map-home-header"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.mapHeaderAvatarA11y)}
        hitSlop={4}
        onPress={() => {
          haptics.light();
          router.push('/(tabs)/profil');
        }}
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
      >
        {profile.avatarUri ? (
          <Image source={{ uri: profile.avatarUri }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText} numberOfLines={1}>
            {initials}
          </Text>
        )}
      </Pressable>

      <View style={styles.placePill} accessibilityRole="text" accessibilityLabel={place}>
        <Icon name="pin" size={12} color={colors.chartreuse} />
        <Text style={styles.placeText} numberOfLines={1} adjustsFontSizeToFit>
          {place}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.mapHeaderNotifA11y)}
        hitSlop={4}
        onPress={() => {
          haptics.light();
          router.push('/parametres/notifications');
        }}
        style={({ pressed }) => [styles.notif, pressed && styles.pressed]}
      >
        <Icon name="cloche" size={19} color={colors.blanc} />
        {/* E03 : badge 6 pt orange = événement territorial réel (jamais décoratif). */}
        {alertDot ? <View style={styles.alertDot} accessibilityElementsHidden /> : null}
      </Pressable>
    </View>
  );
}

const SURFACE = withAlpha(colors.carbonDeep, 0.82);

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.carbone2,
    borderWidth: 2,
    borderColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: AVATAR, height: AVATAR },
  avatarText: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: 13,
    fontWeight: '600',
  },
  placePill: {
    flexShrink: 1,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.blanc12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    maxWidth: '58%',
  },
  placeText: {
    color: colors.blanc,
    fontFamily: fonts.textSemi,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  notif: {
    width: NOTIF,
    height: NOTIF,
    borderRadius: NOTIF / 2,
    backgroundColor: SURFACE,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.blanc12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: gameColors.rival,
  },
});
