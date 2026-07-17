/**
 * GRYD — MODIFIER MON PROFIL (§8). Retour fondateur : « pas trouvé les boutons
 * pour modifier le profil ». Écran POUSSÉ (StackScreen) où le joueur édite son
 * IDENTITÉ : nom affiché, @handle (regex ^[a-z0-9_]{3,20}$, base 0011), titre,
 * ville, bio courte, AVATAR (couleur + initiales) et les 3 BADGES mis en avant.
 * Il équipe aussi son FRAME cosmétique — l'aperçu et la Player Card le reflètent
 * IMMÉDIATEMENT (équiper = effet tangible, AMENDEMENT-16 §16).
 *
 * Persisté en démo (AsyncStorage via profileStore / inventory), reflété au
 * retour sur l'onglet Profil. Aucun gameplay édité (le niveau/tier restent
 * dérivés). Charte dark GRYD : cards carbone, accent chartreuse, haptic light,
 * anti-shame (bio jamais imposée). Analytics : screen('profil_edit').
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { flags } from '../src/lib/flags';
import { goBack } from '../src/lib/nav';
import {
  BADGE_TIER_RANK,
  badgeKeyByName,
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
} from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { InlineRunCTA } from '../src/ui/game';
import { BadgeHex } from '../src/features/badges/BadgeHex';
import { badgeById, badgeColor } from '../src/features/badges/catalog';
import { useMyBadges } from '../src/features/badges/myBadges';
import { PlayerCardAvatar } from '../src/features/social/PlayerCardAvatar';
import {
  AVATAR_COLORS,
  BIO_MAX,
  CITY_MAX,
  DISPLAY_NAME_MAX,
  FEATURED_BADGE_COUNT,
  TITLE_MAX,
  effectiveInitials,
  useMyProfile,
  validateHandle,
} from '../src/features/social/profileStore';
import { itemsInSection } from '../src/features/arsenal/catalog';
import { isFrameItem, useEquippedCosmetics } from '../src/features/arsenal';
import { playerLevelForXp, playerTierForLevel } from '../src/features/crew/rules';
import { MY_SOCIAL_PROFILE } from '../src/features/social/demo';

/** Tier joueur dérivé (anneau d'avatar par défaut) — jamais un nombre magique. */
const RUNNER_TIER = playerTierForLevel(playerLevelForXp(MY_SOCIAL_PROFILE.xp));

/** Badges choisissables = débloqués, non-legacy, du plus rare au moins rare.
 *  DÉRIVÉS dans le composant (O1 : useMyBadges) — plus au niveau module. */
type BadgeDefT = NonNullable<ReturnType<typeof badgeById>>;

/** Frames équipables (portée profile, hors titres) — cosmétique visible sur la card. */
const FRAME_ITEMS = itemsInSection('frames').filter(isFrameItem);

export default function ProfilEditScreen() {
  useEffect(() => {
    // Pas d'event §8 dédié à l'édition profil → screen view standard.
    screen('profil_edit');
  }, []);

  const { editable, save } = useMyProfile();
  const { equipped, equip } = useEquippedCosmetics();

  // Badges choisissables : réels (user_badges) si session, sinon démo.
  const { unlockedIds } = useMyBadges();
  const choosableBadges = useMemo<readonly BadgeDefT[]>(
    () =>
      [...unlockedIds]
        .map((id) => badgeById(id))
        .filter((def): def is BadgeDefT => def !== undefined && !def.legacy)
        .sort((a, b) => BADGE_TIER_RANK[b.tier] - BADGE_TIER_RANK[a.tier]),
    [unlockedIds],
  );

  // Brouillon local initialisé sur les valeurs persistées (reflète les édits déjà faits).
  const [displayName, setDisplayName] = useState(editable.displayName);
  const [handle, setHandle] = useState(editable.handle);
  const [title, setTitle] = useState(editable.title);
  const [city, setCity] = useState(editable.city);
  const [bio, setBio] = useState(editable.bio);
  const [avatarColor, setAvatarColor] = useState(editable.avatarColor);
  const [avatarInitials, setAvatarInitials] = useState(editable.avatarInitials);
  const [featuredBadgeIds, setFeaturedBadgeIds] = useState<readonly string[]>(
    editable.featuredBadgeIds,
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const touched = () => setSavedNotice(false);

  const handleError = validateHandle(handle);
  const nameValid = displayName.trim().length > 0;
  const canSave = nameValid && handleError === null;

  /** Initiales aperçu (override manuel sinon 1re lettre du nom édité). */
  const previewInitials = effectiveInitials({ avatarInitials, displayName });

  /** Le frame équipé courant (pour surligner la sélection). */
  const equippedFrameKey = equipped.profile;

  const dirty = useMemo(
    () =>
      displayName !== editable.displayName ||
      handle !== editable.handle ||
      title !== editable.title ||
      city !== editable.city ||
      bio !== editable.bio ||
      avatarColor !== editable.avatarColor ||
      avatarInitials !== editable.avatarInitials ||
      featuredBadgeIds.length !== editable.featuredBadgeIds.length ||
      featuredBadgeIds.some((id) => !editable.featuredBadgeIds.includes(id)),
    [displayName, handle, title, city, bio, avatarColor, avatarInitials, featuredBadgeIds, editable],
  );

  const toggleBadge = (id: string) => {
    haptics.light();
    touched();
    setFeaturedBadgeIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= FEATURED_BADGE_COUNT) return prev; // cap dur : 3 max
      return [...prev, id];
    });
  };

  const onEquipFrame = (key: string) => {
    haptics.light();
    void equip(key); // persiste + met à jour l'aperçu ET la Player Card
  };

  const onSave = () => {
    if (!canSave) return;
    // InlineRunCTA déclenche déjà haptics au press.
    void save({
      displayName: displayName.trim(),
      handle: handle.trim(),
      title: title.trim(),
      city: city.trim(),
      bio: bio.trim(),
      avatarColor,
      avatarInitials: avatarInitials.trim(),
      featuredBadgeIds,
    });
    setSavedNotice(true);
    // Petit délai laissé au feedback avant retour (le profil reflète l'édit).
    setTimeout(() => goBack('/profil'), 450);
  };

  return (
    <StackScreen title="Modifier mon profil" icon="profil" kicker="PLAYER CARD · IDENTITÉ">
      {/* ── APERÇU vivant : reflète nom, couleur, initiales et frame équipé ── */}
      <View style={styles.previewCard}>
        <PlayerCardAvatar
          initials={previewInitials}
          fillColor={avatarColor}
          tier={RUNNER_TIER}
          equippedFrameKey={equippedFrameKey}
          size={72}
          isMe
        />
        <View style={styles.previewInfo}>
          <Text style={styles.previewName} numberOfLines={1}>
            {displayName.trim().length > 0 ? displayName : 'Ton nom'}
          </Text>
          <Text style={styles.previewHandle} numberOfLines={1}>
            @{handle || 'handle'}
          </Text>
          {title.trim().length > 0 ? (
            <Text style={styles.previewTitle} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
      </View>

      {/* ── IDENTITÉ : nom + @handle ── */}
      <Text style={styles.sectionLabel}>IDENTITÉ</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Nom affiché</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={displayName}
            onChangeText={(v) => {
              setDisplayName(v.slice(0, DISPLAY_NAME_MAX));
              touched();
            }}
            placeholder="KORO"
            placeholderTextColor={colors.gris}
            style={styles.input}
            maxLength={DISPLAY_NAME_MAX}
          />
          <Text style={styles.counter}>
            {displayName.length}/{DISPLAY_NAME_MAX}
          </Text>
        </View>
        {!nameValid ? <Text style={styles.invalid}>Le nom ne peut pas être vide.</Text> : null}

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>@handle</Text>
        <View style={styles.inputRow}>
          <Text style={styles.at}>@</Text>
          <TextInput
            value={handle}
            onChangeText={(v) => {
              // Normalise : minuscules, on ne garde que a-z0-9_ (regex base).
              setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));
              touched();
            }}
            placeholder="koro"
            placeholderTextColor={colors.gris}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, styles.inputHandle]}
            maxLength={20}
          />
        </View>
        {handleError ? (
          <Text style={styles.invalid}>{handleError}</Text>
        ) : (
          <Text style={styles.hint}>3 à 20 caractères : minuscules, chiffres, « _ ».</Text>
        )}
      </View>

      {/* ── TITRE + VILLE ── */}
      <Text style={styles.sectionLabel}>TITRE &amp; VILLE</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Titre affiché</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={title}
            onChangeText={(v) => {
              setTitle(v.slice(0, TITLE_MAX));
              touched();
            }}
            placeholder="Tenace du 19ᵉ"
            placeholderTextColor={colors.gris}
            style={styles.input}
            maxLength={TITLE_MAX}
          />
          <Text style={styles.counter}>
            {title.length}/{TITLE_MAX}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Ville</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={city}
            onChangeText={(v) => {
              setCity(v.slice(0, CITY_MAX));
              touched();
            }}
            placeholder="Paris"
            placeholderTextColor={colors.gris}
            style={styles.input}
            maxLength={CITY_MAX}
          />
          <Text style={styles.counter}>
            {city.length}/{CITY_MAX}
          </Text>
        </View>
      </View>

      {/* ── BIO (optionnelle, anti-shame) ── */}
      <Text style={styles.sectionLabel}>BIO COURTE</Text>
      <View style={styles.card}>
        <TextInput
          value={bio}
          onChangeText={(v) => {
            setBio(v.slice(0, BIO_MAX));
            touched();
          }}
          placeholder="Une ligne sur ta manière de courir (optionnel)."
          placeholderTextColor={colors.gris}
          style={styles.textarea}
          multiline
          maxLength={BIO_MAX}
        />
        <Text style={styles.counterRight}>
          {bio.length}/{BIO_MAX}
        </Text>
      </View>

      {/* ── AVATAR : couleur + initiales ── */}
      <Text style={styles.sectionLabel}>AVATAR</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Couleur</Text>
        <View style={styles.swatchRow}>
          {AVATAR_COLORS.map((c) => {
            const on = c.value === avatarColor;
            return (
              <Pressable
                key={c.key}
                accessibilityRole="button"
                accessibilityLabel={`Avatar ${c.label}`}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  haptics.light();
                  setAvatarColor(c.value);
                  touched();
                }}
                style={[styles.swatch, on && styles.swatchOn]}
              >
                <View style={[styles.swatchFill, { backgroundColor: c.value }]} />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Initiales (1-2 lettres, optionnel)</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={avatarInitials}
            onChangeText={(v) => {
              setAvatarInitials(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2));
              touched();
            }}
            placeholder={effectiveInitials({ avatarInitials: '', displayName })}
            placeholderTextColor={colors.gris}
            autoCapitalize="characters"
            style={styles.input}
            maxLength={2}
          />
          <Text style={styles.counter}>{avatarInitials.length}/2</Text>
        </View>
      </View>

      {/* ── FRAME cosmétique équipé — effet TANGIBLE sur la Player Card ── */}
      <Text style={styles.sectionLabel}>FRAME DE LA CARD</Text>
      <View style={styles.frameWrap}>
        {FRAME_ITEMS.map((f) => {
          const on = f.key === equippedFrameKey;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityLabel={`Équiper ${f.name}`}
              accessibilityState={{ selected: on }}
              onPress={() => onEquipFrame(f.key)}
              style={[styles.frameChip, on && styles.frameChipOn]}
            >
              <PlayerCardAvatar
                initials={previewInitials}
                fillColor={avatarColor}
                tier={RUNNER_TIER}
                equippedFrameKey={f.key}
                size={44}
                isMe={false}
              />
              <Text style={[styles.frameChipText, on && styles.frameChipTextOn]} numberOfLines={1}>
                {f.name.replace(/^Frame\s*/, '')}
              </Text>
              {on ? <Text style={styles.frameChipTag}>Équipé</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {/* D8 : Arsenal masqué hors MVP. */}
      {flags.arsenal ? (
        <>
          <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ouvrir l'Arsenal pour d'autres cosmétiques"
          onPress={() => {
            haptics.light();
            router.push('/arsenal');
          }}
          style={({ pressed }) => [styles.arsenalLink, pressed && styles.dim]}
        >
          <Icon name="boutique" size={16} color={colors.blanc} />
          <Text style={styles.arsenalLinkText}>Débloquer d&apos;autres frames — Arsenal</Text>
          <Icon name="chevron" size={15} color={colors.gris} />
        </Pressable>
        </>
      ) : null}

      {/* ── BADGES MIS EN AVANT (3 max) ── */}
      <Text style={styles.sectionLabel}>
        BADGES AFFICHÉS · {featuredBadgeIds.length}/{FEATURED_BADGE_COUNT}
      </Text>
      <View style={styles.badgeWrap}>
        {choosableBadges.map((def) => {
          const on = featuredBadgeIds.includes(def.id);
          const full = !on && featuredBadgeIds.length >= FEATURED_BADGE_COUNT;
          return (
            <Pressable
              key={def.id}
              accessibilityRole="button"
              accessibilityLabel={`Badge ${def.name}`}
              accessibilityState={{ selected: on, disabled: full }}
              disabled={full}
              onPress={() => toggleBadge(def.id)}
              style={[styles.badgeCell, on && styles.badgeCellOn, full && styles.dim]}
            >
              <BadgeHex
                family={def.family}
                familyColor={badgeColor(def)}
                state="unlocked"
                tier={def.tier}
                size="sm"
                secret={def.secret}
                slug={badgeKeyByName(def.name)}
              />
              <Text style={[styles.badgeCellName, on && styles.badgeCellNameOn]} numberOfLines={1}>
                {def.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>
        Sans choix, la card affiche automatiquement tes 3 badges les plus rares.
      </Text>

      {/* ── Enregistrer ── */}
      <View style={styles.saveBlock}>
        {savedNotice ? (
          <View style={styles.savedRow}>
            <Icon name="cible" size={14} color={gameColors.crew} />
            <Text style={styles.savedText}>Enregistré — ton profil est à jour.</Text>
          </View>
        ) : null}
        <InlineRunCTA
          label="ENREGISTRER"
          leading={<Icon name="profil" size={18} color={colors.noir} />}
          disabled={!canSave || !dirty}
          onPress={onSave}
        />
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  dim: { opacity: 0.6 },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },

  // ── Aperçu vivant ──
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 18,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  previewInfo: { flex: 1 },
  previewName: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700', letterSpacing: 0.3 },
  previewHandle: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  previewTitle: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700', marginTop: 5 },

  // ── Champs texte ──
  fieldLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.4, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  at: { color: colors.gris, fontSize: fontSizes.md, fontWeight: '700' },
  input: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '600',
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  inputHandle: { fontVariant: ['tabular-nums'] },
  counter: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    width: 44,
    textAlign: 'right',
  },
  counterRight: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    marginTop: 8,
  },
  invalid: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 8 },
  hint: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 8, lineHeight: 17 },
  divider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 16 },
  textarea: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    backgroundColor: colors.carbone2,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },

  // ── Avatar : swatches ──
  swatchRow: { flexDirection: 'row', gap: 12 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOn: { borderColor: colors.chartreuse },
  swatchFill: { width: 30, height: 30, borderRadius: radii.pill },

  // ── Frames ──
  frameWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  frameChip: {
    width: 96,
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  frameChipOn: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse14 },
  frameChipText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', textAlign: 'center' },
  frameChipTextOn: { color: colors.blanc },
  frameChipTag: { color: colors.chartreuse, fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  arsenalLink: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  arsenalLinkText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },

  // ── Badges affichés (3 max) ──
  badgeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCell: {
    width: 96,
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  badgeCellOn: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse14 },
  badgeCellName: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', textAlign: 'center' },
  badgeCellNameOn: { color: colors.blanc },

  // ── Enregistrer ──
  saveBlock: { marginTop: 26, gap: 12 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedText: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '600' },
});
