/**
 * GRYD — HÉROS DU PROFIL (planche E15 « Profil joueur », bloc 1 + 2).
 *
 * La planche fait du Profil une CARTE DE VISITE TERRITORIALE, pas un tableau de
 * stats : une image dominante de 210 pt, puis l'identité posée par-dessus son
 * bas. Ce composant ne porte QUE cette composition — les chiffres, la carte
 * signature et les previews restent dans l'écran.
 *
 * ─── UN SEUL AVATAR DANS LE HÉROS (écart assumé, documenté) ─────────────────
 * La planche montre une grande photo ET un avatar rond à cheval sur son bas.
 * Dans GRYD la photo du héros et celle de l'avatar sont la MÊME source
 * (`profile.avatarUri`) : les rendre toutes les deux afficherait deux fois le
 * même visage. On garde donc exactement UN avatar :
 *   · AVEC photo  → la photo occupe le héros, et l'avatar hexagonal 64 pt (même
 *     photo, anneau de palier) s'ancre dans la bande d'identité — c'est la
 *     composition de la planche ;
 *   · SANS photo  → l'avatar GÉNÉRÉ (initiales + couleur de la charte) DEVIENT
 *     le héros, en grand et centré. Il ne se répète pas en miniature juste
 *     dessous. L'avatar généré est un choix de première classe (anonymat
 *     assumé), jamais un placeholder gris ni une initiale nue.
 *
 * ─── HEXAGONE, PAS ROND (écart assumé) ──────────────────────────────────────
 * La planche dit « avatar rond ». L'hexagone EST la signature GRYD (hexAvatar,
 * BadgeHex, grille H3) : introduire un rond ici créerait une seconde grammaire
 * de forme pour la même chose. On conserve l'hexagone et son anneau de palier.
 *
 * ─── CE QUE CE COMPOSANT N'AFFICHE JAMAIS ───────────────────────────────────
 * Rien tant que ce n'est pas LU. `identity`, `levelBadge` et `visibility`
 * acceptent `null` : le nom d'un joueur qui s'appelle « Léa » ne doit pas
 * apparaître d'abord comme « Coureur » (défaut de profileStore avant hydratation),
 * et la pastille de visibilité ne doit pas annoncer « Public » à quelqu'un réglé
 * sur « Moi seul » (défaut du store privacy avant lecture async). Un chargement
 * n'affirme rien : on ne rend pas la ligne.
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  borderState,
  colors,
  elevation,
  fonts,
  fontSizes,
  iconSizes,
  radii,
  sizes,
  spacing,
  type BadgeTier,
} from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { PlayerCardAvatar } from './PlayerCardAvatar';
import { hexAvatarWidth } from '../../ui/game/hexAvatar';

// ─── Géométrie locale du héros ───────────────────────────────────────────────
// `spacing` plafonne à 32 et `sizes` à 56 : aucun token ne porte 210 pt. Ce sont
// donc des constantes NOMMÉES et commentées (comme AVATAR_PX/PENCIL_PX côté
// écran) — une mesure de composition, pas un nombre magique de JEU (game-rules).
/** Hauteur du héros (planche E15). */
export const HERO_H = 210;
/**
 * Avatar GÉNÉRÉ en position de héros (aucune photo) — il EST l'image. Calibré
 * pour tenir, pastille comprise, dans la place qui reste au-dessus de la bande
 * d'identité la plus haute (nom + @handle enroulé + ligne de contexte).
 */
const HERO_AVATAR_PX = 84;
/** Avatar dans la bande d'identité (une photo occupe alors le héros). */
const BAND_AVATAR_PX = 64;
const BAND_AVATAR_W = hexAvatarWidth(BAND_AVATAR_PX);
/** Hauteur de la pastille « NIV. n » ancrée sous l'avatar. */
const LEVEL_PILL_H = 20;

export interface ProfileHeroProps {
  /**
   * Photo de profil. C'est une copie LOCALE (documentDirectory) : elle n'est
   * envoyée nulle part aujourd'hui — le héros ne laisse donc rien croire sur sa
   * visibilité par les autres (aucune mention « vue par… »).
   */
  photoUri?: string;
  initials: string;
  avatarColor: string;
  tier: BadgeTier;
  equippedFrameKey?: string;
  /** `null` = identité pas encore LUE → on n'écrit ni nom ni @handle. */
  identity: { displayName: string; handle: string } | null;
  /** « NIV. 12 » déjà composé (i18n), ou `null` si l'XP n'est pas lue. */
  levelBadge: string | null;
  /**
   * Titre cosmétique ÉQUIPÉ et réellement POSSÉDÉ (inventaire serveur). Absent
   * de la planche E15, conservé ici en pastille discrète : sans lui, équiper un
   * titre gagné dans l'Arsenal n'aurait plus AUCUN effet visible — la règle
   * « équiper a un effet réel » (AMENDEMENT-16 §16) tomberait en silence.
   */
  equippedTitle?: string;
  /** Segments VRAIS de la ligne de contexte (crew · ville · #rang), déjà filtrés. */
  contextSegments: readonly string[];
  /** Remplace le segment crew quand le joueur n'en a pas (jamais un crew vide). */
  findCrew?: { label: string; onPress: () => void };
  /** Visibilité LUE. `null` pendant le chargement → pastille absente. */
  visibility?: { label: string; a11y: string; onPress: () => void } | null;
  /** Pilule « Modifier », haut-DROITE du héros (planche). */
  edit: { label: string; a11y: string; onPress: () => void };
}

export function ProfileHero({
  photoUri,
  initials,
  avatarColor,
  tier,
  equippedFrameKey,
  identity,
  levelBadge,
  equippedTitle,
  contextSegments,
  findCrew,
  visibility,
  edit,
}: ProfileHeroProps) {
  const hasPhoto = typeof photoUri === 'string' && photoUri.length > 0;
  const context = contextSegments.join(' · ');

  return (
    <View style={styles.root}>
      {/* ── Couche image ── */}
      {hasPhoto ? (
        <>
          <Image source={{ uri: photoUri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
          {/* ── Voile bas, empilé en paliers (expo-linear-gradient absent du
              bundle) : transparent → noir. Uniquement sur une PHOTO — sur le
              fond N1 il assombrirait l'avatar généré sans rien gagner. ── */}
          <View pointerEvents="none" style={[styles.scrim, styles.scrim1]} />
          <View pointerEvents="none" style={[styles.scrim, styles.scrim2]} />
          <View pointerEvents="none" style={[styles.scrim, styles.scrim3]} />
        </>
      ) : (
        // `flex: 1` (et non absoluteFill) : le wrap occupe exactement la place
        // AU-DESSUS de la bande d'identité, quelle que soit la hauteur de
        // celle-ci (elle varie avec la langue et le wrap du @handle). En
        // absolu, l'avatar se retrouvait à cheval sur le nom dès que la bande
        // grandissait.
        <View style={styles.generatedWrap} pointerEvents="none">
          <PlayerCardAvatar
            initials={initials}
            fillColor={avatarColor}
            tier={tier}
            equippedFrameKey={equippedFrameKey}
            size={HERO_AVATAR_PX}
            isMe
          />
          {levelBadge ? (
            <View style={[styles.levelPill, styles.levelPillFloat]}>
              <Text style={styles.levelPillLabel} numberOfLines={1}>
                {levelBadge}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* ── Pilule « Modifier » (haut-droite du HÉROS, pas de l'écran) ──
          L'engrenage Paramètres occupe déjà le coin haut-droit de l'ÉCRAN, en
          overlay absolu sur la barre de statut. Poser « Modifier » au même pixel
          empilerait deux contrôles : la pilule vit donc DANS le héros, ~90 pt
          plus bas — les deux restent atteignables, aucun ne recouvre l'autre. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={edit.a11y}
        onPress={edit.onPress}
        hitSlop={8}
        style={({ pressed }) => [styles.editPill, pressed && styles.pressed]}
      >
        <Icon name="profil" size={iconSizes.xs} color={colors.blanc} />
        {/* §A.9 : le libellé s'affiche ENTIER dans les 5 langues (« Profil ändern »). */}
        <Text style={styles.editLabel}>{edit.label}</Text>
      </Pressable>

      {/* ── Bande d'identité, posée sur le bas du héros ── */}
      <View style={styles.band}>
        {hasPhoto ? (
          <View style={styles.bandAvatar}>
            <PlayerCardAvatar
              initials={initials}
              fillColor={avatarColor}
              tier={tier}
              equippedFrameKey={equippedFrameKey}
              size={BAND_AVATAR_PX}
              isMe
              imageUri={photoUri}
            />
            {levelBadge ? (
              // Ancrage en DEUX temps : une bande absolue pleine largeur (plus
              // large que l'hexagone, pour que « NIV. 12 » ne soit jamais
              // rétréci par la boîte de l'avatar — §A : rien de tronqué), puis
              // la pastille centrée dedans, à cheval sur l'arête basse.
              <View style={styles.levelPillAnchor} pointerEvents="none">
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillLabel} numberOfLines={1}>
                    {levelBadge}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.bandInfo}>
          {/* Identité : rien tant qu'elle n'est pas lue (cf. bloc de tête). */}
          {identity ? (
            <>
              <Text style={styles.name} numberOfLines={1}>
                {identity.displayName}
              </Text>
              <View style={styles.handleRow}>
                {/* @handle — invariant technique, jamais traduit. */}
                <Text style={styles.handle} numberOfLines={1}>
                  @{identity.handle}
                </Text>
                {/* Titre cosmétique équipé — chartreuse sur le héros SOMBRE
                    (surface N1 ou photo voilée), jamais sur clair. */}
                {equippedTitle ? (
                  <Text style={styles.equippedTitle} numberOfLines={1}>
                    {equippedTitle}
                  </Text>
                ) : null}
                {/* Pastille de VISIBILITÉ : lecture seule, elle NAVIGUE vers
                    Confidentialité (source unique du réglage — jamais un second
                    interrupteur dupliqué ici). */}
                {visibility ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={visibility.a11y}
                    onPress={visibility.onPress}
                    hitSlop={8}
                    style={({ pressed }) => [styles.visPill, pressed && styles.pressed]}
                  >
                    <Icon name="bouclier" size={iconSizes.xs} color={colors.gris} />
                    <Text style={styles.visLabel} numberOfLines={1}>
                      {visibility.label}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </>
          ) : null}

          {/* Ligne CREW · ville · #rang — chaque segment n'est rendu QUE s'il est
              vrai (l'écran les filtre) : jamais un « · » orphelin, jamais « #— ». */}
          {findCrew || context.length > 0 ? (
            <View style={styles.contextRow}>
              {findCrew ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={findCrew.label}
                  onPress={findCrew.onPress}
                  hitSlop={8}
                  style={({ pressed }) => [styles.findCrew, pressed && styles.pressed]}
                >
                  <Text style={styles.findCrewLabel}>{findCrew.label}</Text>
                  <Icon name="chevron" size={iconSizes.xs} color={colors.chartreuse} />
                </Pressable>
              ) : null}
              {findCrew && context.length > 0 ? (
                <Text style={styles.contextText}>·</Text>
              ) : null}
              {context.length > 0 ? (
                <Text style={styles.contextText} numberOfLines={1}>
                  {context}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  // Le héros est la SEULE surface pleine largeur de l'écran : le débordement des
  // gouttières est appliqué par l'écran (marginHorizontal négatif) — TabScreen
  // impose son paddingHorizontal à TOUS les onglets et n'est pas modifié ici.
  root: {
    height: HERO_H,
    backgroundColor: elevation.surface,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },

  // Avatar généré en position de héros : il occupe toute la place au-dessus de
  // la bande d'identité (flex, pas absolu — la bande grandit avec la langue).
  generatedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  scrim1: { height: '62%', backgroundColor: colors.scrim },
  scrim2: { height: '38%', backgroundColor: colors.scrimStrong },
  scrim3: { height: '14%', backgroundColor: colors.noir },

  // Pilule d'édition — surface N2, jamais chartreuse : le seul accent plein de
  // l'écran ne se dépense pas sur « Modifier » (§A : 1 CTA chartreuse max).
  editPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.cardPadding,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: sizes.touchTarget - spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    borderWidth: 1,
    borderColor: colors.blanc12,
  },
  editLabel: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  band: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: spacing.md,
  },
  bandAvatar: { width: BAND_AVATAR_W, height: BAND_AVATAR_PX },
  bandInfo: { flex: 1, gap: 2 },

  // Pastille « NIV. n » — à cheval sur le bas de l'avatar (planche). Elle est
  // DÉRIVÉE de l'XP serveur : absente tant que l'XP n'est pas lue.
  // Surface N2 + filet chartreuse DOUX, pas un aplat plein : un aplat chartreuse
  // se lit comme un BOUTON (§A4 — un seul accent plein par écran, réservé à
  // l'action). Cette pastille n'est pas tappable, elle ne doit donc pas en avoir
  // l'air. Le palier, lui, est déjà porté par l'anneau de l'avatar.
  levelPill: {
    alignSelf: 'center',
    height: LEVEL_PILL_H,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    borderWidth: 1,
    borderColor: borderState.activeSoft,
  },
  /** Sous l'avatar-héros (aucune photo) : elle chevauche l'arête basse. */
  levelPillFloat: { marginTop: -LEVEL_PILL_H / 2 },
  /** Bande d'ancrage sous l'avatar de la bande d'identité — déborde volontairement. */
  levelPillAnchor: {
    position: 'absolute',
    bottom: -LEVEL_PILL_H / 2,
    left: -spacing.md,
    right: -spacing.md,
    alignItems: 'center',
  },
  // Chartreuse sur surface N2 SOMBRE (carbone2) — jamais sur clair (charte).
  levelPillLabel: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  name: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontFamily: fonts.displayBold,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: fontSizes.xl * 1.1,
  },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  handle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  equippedTitle: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  visPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
  },
  visLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  contextText: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3, flexShrink: 1 },
  findCrew: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 2 },
  // Chartreuse sur le héros SOMBRE (surface N1 ou photo voilée) — jamais clair.
  findCrewLabel: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontFamily: fonts.textSemi,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
