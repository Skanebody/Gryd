/**
 * GRYD — les DEUX primitives de l'UI MVP : la scène et son unique action.
 *
 * ─── POURQUOI DE NOUVELLES PRIMITIVES ───────────────────────────────────────
 * `src/ui/Button.tsx` et consorts existent, mais ne figurent pas sur
 * `docs/SALVAGE.md` : ADR-001 les laisse en quarantaine logique. Les reprendre
 * ferait rentrer par la fenêtre les habitudes que la reconstruction visait —
 * variantes accumulées, tailles négociables, plusieurs CTA possibles par écran.
 *
 * Celles-ci sont volontairement PAUVRES, et c'est leur intérêt : elles rendent
 * les lois du MASTER structurelles au lieu de les laisser à la discipline.
 *
 * ─── CE QUE LA FORME IMPOSE, PLUTÔT QUE DE LE RECOMMANDER ───────────────────
 * L2 — `Stage` n'accepte QU'UNE action primaire (`cta`, pas un tableau). Un
 *      second CTA de même poids est impossible à écrire, pas seulement
 *      déconseillé.
 * L4 — le CTA vit dans un `footer` SŒUR du contenu défilant, donc ancré en bas
 *      quoi qu'on mette au-dessus, et sa hauteur minimale est `sizes.touchTarget`
 *      (le plancher WCAG). Il ne peut PAS défiler hors de portée du pouce.
 * L15 — le libellé du CTA EST son `accessibilityLabel` : impossible d'expédier
 *      un bouton que VoiceOver annonce autrement que ce qu'on lit.
 * L18 — `title`/`body`/`cta.label` reçoivent des chaînes DÉJÀ résolues par `t`.
 *      Aucun texte n'est écrit ici.
 *
 * Le lien secondaire (`link`) est un TEXTE, jamais un bouton plein : c'est ce
 * qui garde « une seule action primaire » vrai à l'œil, pas seulement au type.
 */
import { type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, fontSizes, radii, sizes, spacing, typography, withAlpha } from '@klaim/shared';

/**
 * Épaisseur du filet qui marque la NOTE.
 *
 * L15 — la hiérarchie ne se dit pas par la seule couleur : la note se distingue
 * du corps par sa TAILLE et par ce MOTIF (un filet vertical), pas par un gris
 * plus pâle. Baisser le contraste aurait été la solution facile et la seule à
 * casser l'AA sur une photo.
 */
const FILET_PT = 2;

/**
 * Paliers du voile, du haut de la photo vers le bas.
 *
 * Ils commencent à ZÉRO : le haut de l'image reste intact, c'est lui qui porte
 * la valeur montrée (L9). Et ils finissent à 1 — le bas devient le fond noir de
 * l'app, ce qui fait que le bloc de texte semble s'y poser plutôt que flotter
 * sur une photo. Assez de paliers pour qu'aucune marche ne se voie.
 */
const VOILE_PALIERS = [0, 0, 0.08, 0.2, 0.36, 0.54, 0.72, 0.88, 0.96, 1] as const;

/**
 * Interligne du corps, en MULTIPLE de la taille de police.
 *
 * ⚠️ IL NE PEUT PAS VIVRE DANS `StyleSheet.create`. Une feuille de style est
 * STATIQUE : un `lineHeight` numérique y est figé, alors que `fontSize` suit
 * Dynamic Type. 24 pt tenaient tant que le corps faisait 16 pt — à l'échelle
 * AX3 (~2,35×) le texte atteint ~38 pt dans le même interligne de 24, et les
 * lignes se recouvrent. Sur `Stage`, ça touche TOUS les écrans d'entrée à la
 * fois (onboarding, refus, connexion) : c'est la première chose que voit
 * quelqu'un qui a agrandi ses polices.
 *
 * On le dérive donc de `fontScale`, à chaque rendu. `useWindowDimensions` le
 * rend réactif : changer la taille système dans les Réglages puis revenir dans
 * l'app remet l'interligne d'aplomb sans redémarrage.
 */
const INTERLIGNE = 1.5;

/**
 * Interligne D'UNE taille de police donnée, à l'échelle système du moment.
 *
 * Extrait en fonction le jour où `Stage` a eu trois tailles à traiter (corps,
 * note, label de note) : trois copies de la même multiplication auraient fini
 * par diverger, et c'est précisément la ligne qui se recouvre en AX3 quand elle
 * est oubliée.
 */
function interligne(taille: number, echelle: number): { lineHeight: number } {
  return { lineHeight: Math.round(taille * INTERLIGNE * echelle) };
}

export interface StageAction {
  /** Déjà traduit. Impératif court (Annexe C). */
  readonly label: string;
  readonly onPress: () => void;
  /** `true` pendant un appel en cours : le libellé reste, le tap ne part plus. */
  readonly busy?: boolean;
}

/**
 * LA NOTE — un second bloc de texte, SUBORDONNÉ au corps.
 *
 * ─── POURQUOI `Stage` en a eu besoin ────────────────────────────────────────
 * L'onboarding a fusionné ses deux écrans (voir `app/(mvp)/position.tsx`). Le
 * même écran doit donc dire LE JEU puis LA DEMANDE — deux registres, pas deux
 * paragraphes de même poids. Sans ce bloc, il fallait coller les deux textes
 * dans `body` : la demande aurait pesé autant que la valeur, et l'ordre que L9
 * impose (la valeur D'ABORD) n'aurait plus été lisible, seulement respecté.
 *
 * ⚠️ Ce n'est PAS une seconde action ni un second titre. `label` est un kicker
 * de trois mots, `body` une raison courte. Y mettre une phrase longue rendrait
 * la subordination fausse — et il n'y a toujours qu'UN `cta` (L2).
 */
export interface StageNote {
  /** Déjà traduit. Le LABEL du registre — quelques mots, pas une phrase. */
  readonly label: string;
  /** Déjà traduit. La RAISON, courte. */
  readonly body: string;
}

export function Stage({
  title,
  body,
  note,
  cta,
  link,
  visual,
  photo,
}: {
  readonly title: string;
  readonly body: string;
  /** Second registre, SUBORDONNÉ au corps — voir `StageNote`. */
  readonly note?: StageNote;
  /** L'UNIQUE action primaire de l'écran (L2). */
  readonly cta: StageAction;
  /** Sortie secondaire — TEXTE, jamais un bouton plein. */
  readonly link?: StageAction;
  readonly visual?: ReactNode;
  /**
   * PHOTO plein cadre, derrière le contenu.
   *
   * ─── LA PHOTO ET L'OBJET SIGNATURE NE SONT PAS SUR LE MÊME PLAN ───────────
   * Les deux répondent à L9 (« montrer la valeur avant de demander ») mais pas
   * à la même question. La photo dit CE QUE C'EST — des gens qui courent en
   * ville, reconnaissable en une demi-seconde. `TerritoryMark` dit CE QU'ON
   * OBTIENT — un contour fermé, qui prend son sens une fois la mécanique dite.
   *
   * ⚠️ Une version de ce commentaire concluait « les superposer les
   * affaiblirait toutes les deux », et l'onboarding les tenait donc sur DEUX
   * écrans. La fusion (02/09/2026) a tranché autrement, et la raison est
   * structurelle, pas esthétique : ils n'occupent pas la même place. La photo
   * est le FOND (plein cadre, sous le voile), l'objet est un élément de la
   * COLONNE de texte, à taille réduite. Ce qui aurait affaibli les deux, c'est
   * de les donner en visuels de MÊME POIDS — pas de les mettre sur un plan de
   * profondeur différent, ce que le voile rend lisible d'un regard.
   *
   * ⚠️ Le fond `colors.noir` reste DERRIÈRE l'image : photo absente, lente ou
   * en échec → écran sombre, jamais blanc, jamais vide.
   */
  readonly photo?: ImageSourcePropType;
}) {
  const insets = useSafeAreaInsets();
  const { width, height, fontScale } = useWindowDimensions();
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
      {photo !== undefined ? (
        <>
          {/* DIMENSIONS EXPLICITES, pas `absoluteFill` — piège documenté par le
              legacy et revérifié le 03/08 : sur react-native-web (le bundle qui
              sert de preview), une image en `absoluteFill` n'est pas contrainte
              à la fenêtre, donc `cover` recadre sur une surface plus grande que
              l'écran. Résultat : un gros plan de visage là où la planche montre
              un peloton. */}
          <Image
            source={photo}
            resizeMode="cover"
            style={[styles.photo, { width, height }]}
            // L15 — DÉCORATIVE : elle porte la valeur montrée à l'ŒIL (L9), pas
            // une information. Sans ces deux props, VoiceOver l'annonçait
            // (« image ») AVANT le titre, sur l'onboarding — le tout premier
            // écran de l'app, la première seconde. La convention est celle de
            // `connexion.tsx`, mot pour mot.
            accessible={false}
            importantForAccessibility="no-hide-descendants"
        aria-hidden
          />
          {/* VOILE DÉGRADÉ — pas un aplat. Un aplat uniforme éteindrait la photo
              partout ; le dégradé ne l'assombrit QUE là où le texte se pose.
              Sans lui, un titre blanc sur un ciel clair devient illisible : ce
              n'est pas une préférence esthétique, c'est L15 (contraste AA).
              Fait en BANDES et non avec `expo-linear-gradient` : ce paquet est
              absent du projet, et le legacy avait déjà tranché ainsi plutôt que
              d'ajouter une dépendance native pour un fondu. */}
          <View style={styles.voile} pointerEvents="none">
            {VOILE_PALIERS.map((o, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: withAlpha(colors.noir, o) }} />
            ))}
          </View>
        </>
      ) : null}
      {/* Le contenu défile ; l'action, elle, ne défile JAMAIS hors de portée. */}
      <ScrollView
        contentContainerStyle={[styles.content, photo !== undefined && styles.contentPhoto]}
        showsVerticalScrollIndicator={false}
      >
        {visual}
        {/* `header` : sans lui, le rotor « En-têtes » de VoiceOver ne trouve
            RIEN sur ces écrans — on ne peut pas sauter au titre, il faut
            balayer depuis le premier élément. */}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={[styles.body, interligne(fontSizes.md, fontScale)]}>{body}</Text>

        {note ? (
          <View style={styles.note}>
            {/* Le FILET : décoratif, sans texte — aucun lecteur d'écran ne s'y
                arrête. C'est le motif qui dit « autre registre » sans avoir à
                baisser le contraste du texte (L15). */}
            <View style={styles.noteFilet} pointerEvents="none" />
            <View style={styles.noteBloc}>
              {/* ⚠️ `accessibilityLabel` avec la casse D'ORIGINE : l'uppercase
                  est une décision VISUELLE (rôle kicker), et VoiceOver épelle
                  volontiers les capitales — « U.N.E. S.E.U.L.E. » au lieu de
                  « Une seule ». Le texte reste le même, il n'est pas réécrit
                  ici : c'est la même chaîne, sa casse d'entrée (L18). */}
              <Text
                style={[styles.noteLabel, interligne(fontSizes.xs, fontScale)]}
                accessibilityLabel={note.label}
              >
                {note.label}
              </Text>
              <Text style={[styles.noteBody, interligne(fontSizes.sm, fontScale)]}>
                {note.body}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta.label}
          // `busy` EN PLUS de `disabled` : le libellé reste, le tap ne part
          // plus — mais VoiceOver annonçait « désactivé », donc « ce bouton
          // n'est pas pour toi », alors que l'appel est EN COURS. Deux états
          // opposés dits par le même mot.
          accessibilityState={{ disabled: cta.busy === true, busy: cta.busy === true }}
          disabled={cta.busy === true}
          onPress={cta.onPress}
          // ⚠️ `busy` doit SE VOIR autant qu'il s'annonce. Il n'était qu'exposé
          // à VoiceOver : à l'œil, le bouton devenait inerte sans rien changer,
          // et un tap sans effet se lit « l'app a planté », pas « ça travaille ».
          // Le voile suffit — pas de spinner : l'attente est bornée par la
          // feuille système, et un spinner infini est interdit (L8, L14, L19).
          // Même convention que `connexion.tsx`, qui peint son propre CTA.
          style={({ pressed }) => [
            styles.cta,
            pressed && styles.ctaPressed,
            cta.busy === true && styles.dim,
          ]}
        >
          {/* Pas de `numberOfLines` : un texte d'action tronqué par « … » est
              interdit (§A). Un libellé trop long doit être RACCOURCI, pas coupé. */}
          <Text style={styles.ctaLabel}>{cta.label}</Text>
        </Pressable>

        {link ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={link.label}
            onPress={link.onPress}
            hitSlop={spacing.sm}
            style={({ pressed }) => [styles.link, pressed && styles.dim]}
          >
            <Text style={styles.linkLabel}>{link.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // `colors.noir` est le near-black VERDI du dépôt (ADR-008) — jamais #000.
  root: { flex: 1, backgroundColor: colors.noir },
  content: {
    flexGrow: 1,
    // `center` et non `flex-end` : avec un visuel, « flex-end » collait tout le
    // contenu au CTA et laissait les deux tiers hauts VIDES — un écran qui ne
    // montre rien ne montre pas la valeur (L9), même s'il dit la bonne phrase.
    // Le CTA reste ancré en bas par le `footer`, hors de ce conteneur : la
    // conformité L4 ne dépend donc pas de cet alignement.
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  // Avec une photo, le texte descend : le haut de l'image doit rester LISIBLE
  // (c'est elle qui porte la valeur montrée), et le voile n'assombrit que le bas.
  contentPhoto: { justifyContent: 'flex-end' },
  photo: { position: 'absolute', top: 0, left: 0 },
  voile: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  title: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.xxl },
  // `lineHeight` VOLONTAIREMENT ABSENT : il est dérivé du `fontScale` dans le
  // composant (voir `INTERLIGNE`). Le remettre ici le re-figerait.
  body: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  // `stretch` : le filet fait la HAUTEUR du bloc, quelle que soit l'échelle de
  // police. Une hauteur figée l'aurait laissé pendre à côté d'un texte de trois
  // lignes en AX3 — le motif aurait cessé de désigner ce qu'il encadre.
  note: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.sm },
  noteFilet: { width: FILET_PT, borderRadius: radii.pill, backgroundColor: colors.chartreuse },
  // `flex: 1` : sans lui le texte déborde de l'écran au lieu de revenir à la
  // ligne — la rangée mesurerait sur son contenu, pas sur la place disponible.
  noteBloc: { flex: 1, gap: spacing.xxs },
  // Rôle kicker, en `gris` — l'usage documenté du token. La chartreuse reste
  // au FILET et au CTA : deux textes chartreuse se disputeraient le regard que
  // l'action doit avoir seule. `lineHeight` du token écrasé au rendu (AX3).
  noteLabel: { ...typography.kicker, color: colors.gris, textTransform: 'uppercase' },
  // `sm` contre le `md` du corps : la hiérarchie se fait par la TAILLE, pas par
  // un gris plus pâle qui tomberait sous l'AA sur une photo (L15).
  noteBody: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  cta: {
    // `sizes.touchTarget` — le plancher WCAG 2.5.5 vient du design system, il
    // n'est pas recopié ici. Une constante locale finit par diverger du token.
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ctaPressed: { backgroundColor: colors.chartreusePressed },
  // Texte SOMBRE sur chartreuse : l'inverse serait illisible (1,19:1).
  ctaLabel: { color: colors.noir, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '700' },
  link: { minHeight: sizes.touchTarget, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  dim: { opacity: 0.6 },
});
