/**
 * GRYD — Header Home Map (Vague 1 · E02 / E03).
 * Avatar 40 + pill lieu + notifs 44. Translucide, 3 cibles séparées ≥ 44 pt.
 * Ne concurrence pas la mission (sheet) ni le CTA RUN.
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii, withAlpha } from '@klaim/shared';
import { C } from '../../i18n/catalog/map';
import { useT } from '../../i18n/store';
import { haptics } from '../../lib/haptics';
import {
  effectiveInitials,
  useMyProfile,
} from '../social/profileStore';
import { Icon } from '../../ui/Icon';

const AVATAR = 40;
const NOTIF = 44;
const SIDE = 20;

export function MapHomeHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { profile } = useMyProfile();
  const initials = effectiveInitials(profile);
  const place =
    profile.city.trim().length > 0 ? profile.city.trim() : t(C.mapHeaderPlaceFallback);

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
});
