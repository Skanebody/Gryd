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
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { flags } from '../src/lib/flags';
import { goBack } from '../src/lib/nav';
import {
  BADGE_TIER_RANK,
  badgeKeyByName,
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
} from '@klaim/shared';
import { useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/profil';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { KeyboardSaveBar } from '../src/ui/KeyboardSaveBar';
import { InlineRunCTA } from '../src/ui/game';
import { BadgeHex } from '../src/features/badges/BadgeHex';
import { badgeById, badgeColor } from '../src/features/badges/catalog';
import { useMyBadges } from '../src/features/badges/myBadges';
import { PlayerCardAvatar } from '../src/features/social/PlayerCardAvatar';
import { clearAvatarPhoto, pickAvatarPhoto } from '../src/features/social/avatarPhoto';
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
import { useMyEconomy } from '../src/features/social/economy';

/** Badges choisissables = débloqués, non-legacy, du plus rare au moins rare.
 *  DÉRIVÉS dans le composant (O1 : useMyBadges) — plus au niveau module. */
type BadgeDefT = NonNullable<ReturnType<typeof badgeById>>;

/** Frames équipables (portée profile, hors titres) — cosmétique visible sur la card. */
const FRAME_ITEMS = itemsInSection('frames').filter(isFrameItem);

export default function ProfilEditScreen() {
  const t = useT();
  useEffect(() => {
    // Pas d'event §8 dédié à l'édition profil → screen view standard.
    screen('profil_edit');
  }, []);

  const { editable, save } = useMyProfile();
  const { equipped, equip } = useEquippedCosmetics();

  /**
   * ─── LE TIER DE L'AVATAR ÉTAIT CELUI D'UN AUTRE (21/07/2026) ──────────────
   * Il valait `playerTierForLevel(playerLevelForXp(MY_SOCIAL_PROFILE.xp))`, une
   * constante de MODULE calculée sur les 4 210 XP du persona de démo KORO — soit
   * le tier `tempo`, quel que soit le joueur et quel que soit son état de
   * session. L'anneau de l'avatar est PRÉCISÉMENT le signal de progression que
   * l'app affiche partout : il annonçait donc un palier jamais atteint, et il
   * contredisait l'onglet Profil qui, lui, dérive le tier de l'XP RÉELLE.
   *
   * Il est maintenant dérivé de la MÊME source que l'onglet Profil (`useMyEconomy`
   * → `users.xp`). Un compte neuf, une lecture vide ou une lecture en échec
   * donnent 0 XP → niveau 1 → tier `road` : le palier de départ, qui est vrai.
   */
  const economy = useMyEconomy();
  const runnerTier = playerTierForLevel(playerLevelForXp(economy.xp));

  // Badges choisissables : ceux que le SERVEUR a décernés (user_badges). Sans
  // session, ou si la lecture échoue, la liste est VIDE — on ne propose jamais
  // de mettre en avant un badge que le joueur n'a pas gagné.
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
  /**
   * PHOTO DE PROFIL (demande fondateur). `avatarUri` vide = avatar généré.
   * `photoDenied` porte le refus de permission — jamais un échec silencieux.
   */
  const [avatarUri, setAvatarUri] = useState(editable.avatarUri);
  const [photoDenied, setPhotoDenied] = useState(false);
  /**
   * Onglet AFFICHÉ du sélecteur d'avatar. Il suit d'abord ce que le joueur a
   * déjà choisi, mais reste INDÉPENDANT de `avatarUri` : consulter l'onglet
   * « Initiales » ne supprime pas une photo, et inversement. Aucun des deux
   * n'est « le défaut » — c'est tout le point de la demande.
   */
  const [avatarMode, setAvatarMode] = useState<'photo' | 'initials'>(
    editable.avatarUri ? 'photo' : 'initials',
  );
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
      avatarUri !== editable.avatarUri ||
      featuredBadgeIds.length !== editable.featuredBadgeIds.length ||
      featuredBadgeIds.some((id) => !editable.featuredBadgeIds.includes(id)),
    [
      displayName,
      handle,
      title,
      city,
      bio,
      avatarColor,
      avatarInitials,
      avatarUri,
      featuredBadgeIds,
      editable,
    ],
  );

  /**
   * Ouvrir la photothèque. Le refus de permission n'est PAS un échec silencieux :
   * il s'affiche, et il rappelle que l'avatar d'initiales reste parfaitement
   * valable — personne ne doit se retrouver coincé sans identité.
   */
  const onPickPhoto = () => {
    haptics.light();
    void (async () => {
      const result = await pickAvatarPhoto();
      if (result.kind === 'denied') {
        setPhotoDenied(true);
        return;
      }
      if (result.kind === 'canceled') return;
      setPhotoDenied(false);
      setAvatarUri(result.uri);
      setAvatarMode('photo');
      touched();
    })();
  };

  /** Retirer la photo = revenir à l'avatar généré. Choix assumé, pas une perte. */
  const onRemovePhoto = () => {
    haptics.light();
    setAvatarUri('');
    setAvatarMode('initials');
    setPhotoDenied(false);
    touched();
    void clearAvatarPhoto();
  };

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

  /**
   * Annuler (barre clavier) : on RÉTABLIT les valeurs d'origine et on ferme le
   * clavier — on ne quitte PAS l'écran. Le joueur qui s'est trompé de champ
   * reprend son édition ; celui qui veut vraiment sortir a la flèche retour.
   */
  const onCancelEdits = () => {
    haptics.light();
    setDisplayName(editable.displayName);
    setHandle(editable.handle);
    setTitle(editable.title);
    setCity(editable.city);
    setBio(editable.bio);
    setAvatarColor(editable.avatarColor);
    setAvatarInitials(editable.avatarInitials);
    setAvatarUri(editable.avatarUri);
    setAvatarMode(editable.avatarUri ? 'photo' : 'initials');
    setPhotoDenied(false);
    setFeaturedBadgeIds(editable.featuredBadgeIds);
    Keyboard.dismiss();
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
      avatarUri,
      featuredBadgeIds,
    });
    setSavedNotice(true);
    // Petit délai laissé au feedback avant retour (le profil reflète l'édit).
    setTimeout(() => goBack('/profil'), 450);
  };

  return (
    <StackScreen
      title={t(C.editMyProfile)}
      icon="profil"
      kicker={t(C.editKicker)}
      /* Barre qui SUIT LE CLAVIER (retour terrain 20/07) : dès qu'une valeur
         change, « Enregistrer les modifications ? » se pose au-dessus du
         clavier. Le CTA de pied de page devenait inatteignable pendant la
         saisie — une modification tapée était une modification perdue. Rendue
         via `floating` : hors du ScrollView, donc fixe à l'écran. */
      floating={
        <KeyboardSaveBar
          visible={dirty}
          onSave={onSave}
          onCancel={onCancelEdits}
          saveDisabled={!canSave}
        />
      }
    >
      {/* ── APERÇU vivant : reflète nom, couleur, initiales et frame équipé ── */}
      <View style={styles.previewCard}>
        <PlayerCardAvatar
          initials={previewInitials}
          fillColor={avatarColor}
          tier={runnerTier}
          equippedFrameKey={equippedFrameKey}
          size={72}
          isMe
          imageUri={avatarUri || undefined}
        />
        <View style={styles.previewInfo}>
          <Text style={styles.previewName} numberOfLines={1}>
            {displayName.trim().length > 0 ? displayName : t(C.previewNameFallback)}
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
      <Text style={styles.sectionLabel}>{t(C.sectionIdentity)}</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>{t(C.fieldDisplayName)}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={displayName}
            onChangeText={(v) => {
              setDisplayName(v.slice(0, DISPLAY_NAME_MAX));
              touched();
            }}
            placeholder={t(C.namePlaceholder)}
            placeholderTextColor={colors.gris}
            style={styles.input}
            maxLength={DISPLAY_NAME_MAX}
          />
          <Text style={styles.counter}>
            {displayName.length}/{DISPLAY_NAME_MAX}
          </Text>
        </View>
        {!nameValid ? <Text style={styles.invalid}>{t(C.nameEmpty)}</Text> : null}

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
            placeholder={t(C.handlePlaceholder)}
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
          <Text style={styles.hint}>{t(C.handleHint)}</Text>
        )}
      </View>

      {/* ── TITRE + VILLE ── */}
      <Text style={styles.sectionLabel}>{t(C.sectionTitleCity)}</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>{t(C.fieldTitle)}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={title}
            onChangeText={(v) => {
              setTitle(v.slice(0, TITLE_MAX));
              touched();
            }}
            placeholder={t(C.titlePlaceholder)}
            placeholderTextColor={colors.gris}
            style={styles.input}
            maxLength={TITLE_MAX}
          />
          <Text style={styles.counter}>
            {title.length}/{TITLE_MAX}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>{t(C.fieldCity)}</Text>
        <View style={styles.inputRow}>
          <TextInput
            value={city}
            onChangeText={(v) => {
              setCity(v.slice(0, CITY_MAX));
              touched();
            }}
            placeholder={t(C.cityPlaceholder)}
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
      <Text style={styles.sectionLabel}>{t(C.sectionBio)}</Text>
      <View style={styles.card}>
        <TextInput
          value={bio}
          onChangeText={(v) => {
            setBio(v.slice(0, BIO_MAX));
            touched();
          }}
          placeholder={t(C.bioPlaceholder)}
          placeholderTextColor={colors.gris}
          style={styles.textarea}
          multiline
          maxLength={BIO_MAX}
        />
        <Text style={styles.counterRight}>
          {bio.length}/{BIO_MAX}
        </Text>
      </View>

      {/* ── AVATAR : PHOTO ou INITIALES ──────────────────────────────────────
          Deux chemins de PREMIÈRE CLASSE (demande fondateur). Le sélecteur ne
          désigne aucun « bon » choix : pas de coche par défaut sur la photo, pas
          de libellé « aucune photo », et l'aide sous les onglets dit les deux
          options équivalentes. On ne pousse jamais quelqu'un à se montrer. ── */}
      <Text style={styles.sectionLabel}>{t(C.sectionAvatar)}</Text>
      <View style={styles.card}>
        <View style={styles.modeRow}>
          {(['photo', 'initials'] as const).map((mode) => {
            const on = mode === avatarMode;
            const label = t(mode === 'photo' ? C.avatarModePhoto : C.avatarModeInitials);
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityLabel={t(C.a11yAvatarMode, { mode: label })}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  haptics.light();
                  setAvatarMode(mode);
                }}
                style={[styles.modeTab, on && styles.modeTabOn]}
              >
                <Text style={[styles.modeTabText, on && styles.modeTabTextOn]} numberOfLines={1}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.modeHint}>{t(C.avatarChoiceHint)}</Text>

        <View style={styles.divider} />

        {avatarMode === 'photo' ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(avatarUri ? C.photoReplace : C.photoChoose)}
              onPress={onPickPhoto}
              style={({ pressed }) => [styles.photoBtn, pressed && styles.dim]}
            >
              <Icon name="profil" size={iconSizes.md} color={colors.blanc} />
              <Text style={styles.photoBtnText} numberOfLines={1}>
                {t(avatarUri ? C.photoReplace : C.photoChoose)}
              </Text>
            </Pressable>
            {avatarUri ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(C.photoRemove)}
                onPress={onRemovePhoto}
                style={({ pressed }) => [styles.photoRemoveBtn, pressed && styles.dim]}
              >
                <Text style={styles.photoRemoveText} numberOfLines={1}>
                  {t(C.photoRemove)}
                </Text>
              </Pressable>
            ) : null}
            {/* ZÉRO MENSONGE : le stockage distant n'est pas câblé (cf.
                features/social/avatarPhoto.ts) — on ne laisse pas croire que la
                photo est publiée ni visible par les autres joueurs. */}
            <Text style={styles.photoNote}>{t(C.photoLocalOnly)}</Text>
            {photoDenied ? <Text style={styles.photoDenied}>{t(C.photoDenied)}</Text> : null}
          </>
        ) : (
          <>
        <Text style={styles.fieldLabel}>{t(C.fieldColor)}</Text>
        <View style={styles.swatchRow}>
          {AVATAR_COLORS.map((c) => {
            const on = c.value === avatarColor;
            return (
              <Pressable
                key={c.key}
                accessibilityRole="button"
                accessibilityLabel={t(C.a11yAvatarColor, { label: t(c.label) })}
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

        <Text style={styles.fieldLabel}>{t(C.fieldInitials)}</Text>
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
          </>
        )}
      </View>

      {/* ── FRAME cosmétique équipé — effet TANGIBLE sur la Player Card ── */}
      <Text style={styles.sectionLabel}>{t(C.sectionFrame)}</Text>
      <View style={styles.frameWrap}>
        {FRAME_ITEMS.map((f) => {
          const on = f.key === equippedFrameKey;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityLabel={t(C.a11yEquip, { name: f.name })}
              accessibilityState={{ selected: on }}
              onPress={() => onEquipFrame(f.key)}
              style={[styles.frameChip, on && styles.frameChipOn]}
            >
              <PlayerCardAvatar
                initials={previewInitials}
                fillColor={avatarColor}
                tier={runnerTier}
                equippedFrameKey={f.key}
                size={44}
                isMe={false}
                imageUri={avatarUri || undefined}
              />
              <Text style={[styles.frameChipText, on && styles.frameChipTextOn]} numberOfLines={1}>
                {f.name.replace(/^Frame\s*/, '')}
              </Text>
              {on ? <Text style={styles.frameChipTag}>{t(C.equippedTag)}</Text> : null}
            </Pressable>
          );
        })}
      </View>
      {/* D8 : Arsenal masqué hors MVP. */}
      {flags.arsenal ? (
        <>
          <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.a11yOpenArsenal)}
          onPress={() => {
            haptics.light();
            router.push('/arsenal');
          }}
          style={({ pressed }) => [styles.arsenalLink, pressed && styles.dim]}
        >
          <Icon name="boutique" size={16} color={colors.blanc} />
          <Text style={styles.arsenalLinkText}>{t(C.arsenalLink)}</Text>
          <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
        </Pressable>
        </>
      ) : null}

      {/* ── BADGES MIS EN AVANT (3 max) ── */}
      <Text style={styles.sectionLabel}>
        {t(C.sectionFeaturedBadges, { n: featuredBadgeIds.length, max: FEATURED_BADGE_COUNT })}
      </Text>
      <View style={styles.badgeWrap}>
        {choosableBadges.map((def) => {
          const on = featuredBadgeIds.includes(def.id);
          const full = !on && featuredBadgeIds.length >= FEATURED_BADGE_COUNT;
          return (
            <Pressable
              key={def.id}
              accessibilityRole="button"
              accessibilityLabel={t(C.a11yBadge, { name: def.name })}
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
      <Text style={styles.hint}>{t(C.featuredHint)}</Text>

      {/* ── Enregistrer (en pied de contenu — reste le chemin au repos) ── */}
      <View style={styles.saveBlock}>
        {savedNotice ? (
          <View style={styles.savedRow}>
            <Icon name="cible" size={iconSizes.sm} color={gameColors.crew} />
            <Text style={styles.savedText}>{t(C.savedNotice)}</Text>
          </View>
        ) : null}
        <InlineRunCTA
          label={t(C.saveCta)}
          leading={<Icon name="profil" size={iconSizes.md} color={colors.noir} />}
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
    marginTop: spacing.xxs,
    fontVariant: ['tabular-nums'],
  },
  previewTitle: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700', marginTop: spacing.xxs },

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
    paddingVertical: spacing.sm,
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

  // ── Avatar : PHOTO ou INITIALES ──
  // Deux onglets de LARGEUR ÉGALE : aucun des deux n'a l'air d'être « le »
  // choix. L'état sélectionné est une SURFACE N2 + un texte ivoire — pas un
  // aplat chartreuse : le seul accent plein de l'écran reste le CTA d'enregistrement.
  modeRow: { flexDirection: 'row', gap: spacing.xs },
  modeTab: {
    flex: 1,
    minHeight: sizes.touchTarget,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  modeTabOn: { backgroundColor: colors.carbone2, borderColor: colors.blanc },
  modeTabText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  modeTabTextOn: { color: colors.blanc },
  modeHint: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    marginTop: spacing.sm,
  },
  // Choisir/changer la photo : action SECONDAIRE (surface N2 + icône), jamais
  // un bouton chartreuse — mettre une photo n'est pas l'action forte de l'écran.
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: sizes.buttonMd,
    borderRadius: radii.control,
    backgroundColor: colors.carbone2,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.md,
  },
  photoBtnText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  photoRemoveBtn: {
    minHeight: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  photoRemoveText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  photoNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    marginTop: spacing.sm,
  },
  photoDenied: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    marginTop: spacing.xs,
  },
  // ── Avatar : swatches ──
  swatchRow: { flexDirection: 'row', gap: 12 },
  swatch: {
    // Token, pas le littéral 44 : même valeur aujourd'hui, mais solidaire du
    // plancher tactile — sinon relever sizes.touchTarget laisserait ce contrôle
    // derrière (le reste du fichier l'utilise déjà).
    width: sizes.touchTarget,
    height: sizes.touchTarget,
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
  frameChipTag: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700', letterSpacing: 0.5 },
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
  saveBlock: { marginTop: spacing.xl, gap: 12 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedText: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '600' },
});
