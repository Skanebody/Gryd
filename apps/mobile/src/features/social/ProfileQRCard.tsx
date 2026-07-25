/**
 * GRYD — LA CARTE « MON CODE » (planche E16, variante profil).
 *
 * C'est la SEULE surface claire de l'écran, et c'est une contrainte OPTIQUE, pas
 * un choix graphique : un décodeur QR cherche un fort contraste de luminance et
 * une marge claire autour des motifs de repérage. Un QR chartreuse sur noir
 * (charte) inverse la polarité et fait échouer beaucoup de scanners. La plaque
 * blanche est donc assumée — exactement le raisonnement déjà tenu par
 * `features/crew/CrewInviteQRScreen`, dont on reprend les réglages optiques
 * (taille, quiet zone, ECL M) au lieu de les réinventer.
 *
 * ── DA SUR FOND CLAIR ───────────────────────────────────────────────────────
 * Corollaire de la charte : sur cette plaque, AUCUN texte n'est chartreuse
 * (contraste 1,2:1). Toute l'encre est sombre — `colors.noir` pour le nom,
 * `colors.grisLigne` pour la ligne @handle, `colors.carbone` pour l'URL. La
 * SEULE chartreuse admise ici est le module CENTRAL du QR : un élément
 * GRAPHIQUE de 6 px, pas du texte (signature discrète demandée par la planche).
 *
 * ── L'AVATAR N'A PAS SON ANNEAU DE TIER (écart assumé à la planche) ─────────
 * La planche montre « l'avatar avec son anneau ». On dessine ici le corps de
 * l'avatar SANS l'anneau, pour deux raisons cumulatives :
 *   1. les anneaux de `BADGE_TIER_STYLE` sont encrés POUR FOND SOMBRE — trois
 *      des six tiers sont des blancs translucides (`rgba(250,250,247,0.30/0.55)`)
 *      et `elite` un bleu très clair : posés sur la plaque blanche, ils
 *      DISPARAISSENT. Un anneau invisible pour la moitié des joueurs n'est pas
 *      une signature de rareté, c'est un bug de contraste ;
 *   2. le tier se dérive de l'XP, qui se LIT au réseau (`useMyEconomy`). Une
 *      lecture qui échoue rend 0 XP → tier « road ». Afficher « road » sur une
 *      carte qui dit « voici qui je suis » serait affirmer un niveau qu'on n'a
 *      pas lu. Cette carte porte l'IDENTITÉ (photo/initiales, nom, @handle),
 *      pas la progression — donc elle n'a besoin d'aucune lecture réseau.
 * La géométrie reste celle de `ui/game/hexAvatar` (source unique) : même corps,
 * mêmes initiales, même ligne de base optique que partout ailleurs.
 *
 * Ce composant est MUET : il reçoit des chaînes déjà résolues (i18n fait à
 * l'écran) et ne décide d'aucun état. S'il est monté, c'est que l'écran a déjà
 * établi qu'il y a un vrai @handle à montrer.
 */
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Svg, {
  ClipPath,
  Defs,
  Image as SvgImage,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import { colors, fonts, fontSizes, radii, spacing } from '@klaim/shared';
import {
  BODY_R,
  BODY_STROKE,
  INITIALS_BASELINE,
  INITIALS_FONT,
  hexAvatarBox,
  hexPoints,
} from '../../ui/game/hexAvatar';

/** Côté du QR en points — ≥ 200 : scannable depuis un écran de téléphone à ~30 cm. */
const QR_SIZE = 220;

/** Marge claire autour des motifs (norme QR : ≥ 4 modules). Sans elle, ça ne scanne pas. */
const QR_QUIET_ZONE = 16;

/**
 * Grille la plus DENSE que ce QR puisse produire, en modules par côté.
 *
 * Notre charge utile est `https://<hôte>/u/<handle>` : au plus ~39 octets, donc
 * une version 3 (29×29) en ECL M. On dimensionne la signature sur la version 4
 * (33×33, 62 octets) pour garder de la marge si l'hôte s'allonge : sur une
 * grille moins dense, le carré chartreuse sera simplement PLUS PETIT qu'un
 * module et restera à l'intérieur du module central — jamais à cheval sur deux.
 * (Les grilles QR ont toujours un nombre IMPAIR de modules : il existe donc
 * toujours un module exactement centré.)
 */
const QR_GRID_MAX = 33;

/**
 * Côté du module chartreuse, en points. DÉRIVÉ, jamais posé à l'œil :
 * le composant dessine la grille + sa quiet zone dans une boîte de `QR_SIZE`
 * (viewBox `-quietZone … size + 2·quietZone`), donc un module mesure à l'écran
 * `QR_SIZE² / ((QR_SIZE + 2·quietZone) · nombre de modules)`.
 *
 * Impact sur le décodage : la chartreuse est une couleur CLAIRE (luminance
 * proche du blanc), donc au pire un module noir est lu comme blanc — UNE erreur
 * de module, très en deçà des ~15 % de redondance d'ECL M. Le code reste
 * décodable ; c'est ce qui rend cette signature acceptable.
 */
const QR_SIGNATURE_SIZE = (QR_SIZE * QR_SIZE) / ((QR_SIZE + QR_QUIET_ZONE * 2) * QR_GRID_MAX);

/** Hauteur de l'avatar sur la carte, en points. */
const AVATAR_PX = 76;

/** Encre lisible sur un aplat d'avatar donné (même recette que PlayerCardAvatar). */
function inkOn(fill: string): string {
  return fill === colors.blanc || fill === colors.chartreuse ? colors.noir : colors.blanc;
}

interface LightHexAvatarProps {
  initials: string;
  fillColor: string;
  imageUri?: string;
}

/**
 * Corps hexagonal seul (photo OU initiales), contour SOMBRE pour tenir sur la
 * plaque claire — y compris quand le joueur a choisi un aplat ivoire, qui
 * sinon se confondrait avec la carte.
 */
function LightHexAvatar({ initials, fillColor, imageUri }: LightHexAvatarProps) {
  const box = hexAvatarBox(AVATAR_PX);
  const body = hexPoints(box.cx, box.cy, BODY_R);
  // Identifiant de clip unique par instance (leçon PlayerCardAvatar : un id
  // dérivé de la taille se dupliquait dès que deux avatars coexistaient).
  const clipId = `pqrc-${useId()}`;

  return (
    <Svg width={box.width} height={box.height} viewBox={box.viewBox}>
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={body} />
        </ClipPath>
      </Defs>
      <Polygon points={body} fill={fillColor} />
      {imageUri ? (
        <SvgImage
          x={box.cx - BODY_R}
          y={box.cy - BODY_R}
          width={BODY_R * 2}
          height={BODY_R * 2}
          preserveAspectRatio="xMidYMid slice"
          href={{ uri: imageUri }}
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <SvgText
          x={box.cx}
          y={INITIALS_BASELINE}
          textAnchor="middle"
          fontSize={INITIALS_FONT}
          fontWeight="600"
          fill={inkOn(fillColor)}
        >
          {initials}
        </SvgText>
      )}
      <Polygon
        points={body}
        fill="none"
        stroke={colors.carbone}
        strokeWidth={BODY_STROKE}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export interface ProfileQRCardProps {
  /**
   * Nom affiché — `null` quand le joueur n'en a PAS renseigné et qu'aucune
   * session n'en fournit. Dans ce cas la ligne n'existe pas : le neutre
   * « Coureur » n'est l'identité de personne, et cette carte est une identité.
   */
  displayName: string | null;
  /** « @handle · ville » ou « @handle » — déjà composé (séparateur inclus/exclu). */
  identityLine: string;
  /** Ce que le QR encode : le lien public complet. */
  link: string;
  /** Le même lien, sans son schéma — la ligne à recopier à la main. */
  linkLabel: string;
  /** Étiquette d'accessibilité de la plaque (une image n'a pas de texte). */
  qrA11yLabel: string;
  initials: string;
  avatarColor: string;
  avatarUri?: string;
}

export function ProfileQRCard({
  displayName,
  identityLine,
  link,
  linkLabel,
  qrA11yLabel,
  initials,
  avatarColor,
  avatarUri,
}: ProfileQRCardProps) {
  return (
    <View style={styles.card}>
      <LightHexAvatar initials={initials} fillColor={avatarColor} imageUri={avatarUri} />

      {displayName ? (
        <Text style={styles.name} numberOfLines={1} ellipsizeMode="clip">
          {displayName}
        </Text>
      ) : null}
      <Text style={styles.identity} numberOfLines={1} ellipsizeMode="clip">
        {identityLine}
      </Text>

      <View
        style={styles.qrWrap}
        accessible
        accessibilityRole="image"
        accessibilityLabel={qrA11yLabel}
      >
        <QRCode
          value={link}
          size={QR_SIZE}
          quietZone={QR_QUIET_ZONE}
          color={colors.noir}
          backgroundColor={colors.blanc}
          // ECL M : ~15 % de redondance. Marge confortable pour un code montré
          // sur un écran sale ou photographié de travers, sans densifier la grille.
          ecl="M"
        />
        {/* Signature GRYD : le module central, et lui seul. `pointerEvents none`
            — c'est de l'encre, pas un contrôle. */}
        <View
          pointerEvents="none"
          style={[
            styles.signature,
            {
              width: QR_SIGNATURE_SIZE,
              height: QR_SIGNATURE_SIZE,
              marginLeft: -QR_SIGNATURE_SIZE / 2,
              marginTop: -QR_SIGNATURE_SIZE / 2,
            },
          ]}
        />
      </View>

      {/* Sélectionnable : qui ne peut pas scanner doit pouvoir recopier. */}
      <Text style={styles.url} selectable numberOfLines={1} ellipsizeMode="clip">
        {linkLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.blanc,
    borderRadius: radii.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  // Encre SOMBRE de bout en bout : la charte interdit la chartreuse sur clair.
  name: {
    color: colors.noir,
    fontFamily: fonts.displaySemi,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  identity: {
    color: colors.grisLigne, // gris FONCÉ : `colors.gris` est un gris pour fond sombre.
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  // Boîte exacte du <QRCode> : c'est elle qui donne le centre à la signature.
  qrWrap: {
    width: QR_SIZE,
    height: QR_SIZE,
    marginTop: spacing.xs,
  },
  signature: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    backgroundColor: colors.chartreuse,
  },
  url: {
    color: colors.carbone,
    fontFamily: fonts.mono,
    fontSize: fontSizes.sm,
    letterSpacing: 0.4,
    textAlign: 'center',
  },
});
