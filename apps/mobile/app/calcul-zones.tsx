/**
 * GRYD — « Comment GRYD calcule tes zones » (/calcul-zones). Recalage Night
 * Print, 25/07/2026.
 *
 * L'objet : une VISITE GUIDÉE. On la lit une fois, dans l'ordre, et on comprend
 * comment une sortie devient un territoire. Les questions précises, elles, vivent
 * dans la FAQ — d'où le lien de pied, formulé en verbe + objet pour ne pas être
 * un quasi-homonyme du titre de cette page.
 *
 * ── ORDRE DE COMPOSITION ────────────────────────────────────────────────────
 *  1. Barre + kicker « VISITE GUIDÉE · N ÉTAPES » + sous-titre (`StackScreen`) ;
 *     le N est `EXPLAIN_SECTIONS.length`, jamais un nombre recopié ;
 *  2. les scènes, posées sur le fond et séparées par l'ESPACE (aucun contour) —
 *     chacune : plaque d'icône → kicker numéroté → titre → phrase → schéma →
 *     exemple ;
 *  3. une ligne scannable de sortie vers la FAQ, séparée par un filet.
 *
 * L'ordre des scènes suit l'ordre des questions qu'on se pose : comment une
 * sortie devient une zone → ce qu'elle rapporte → ce qui se passe à plusieurs
 * dessus (LE RELAIS) → comment on la garde → pourquoi on la perd → ce qui peut
 * l'invalider.
 *
 * ── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ────────────────────────────────────────
 *  · LE CARRÉ D'ICÔNE RECODÉ (38 px, rayon 11, contour) → `IconPlate` : c'est la
 *    seule source du carré d'icône, et son rayon vient des tokens. Un contour de
 *    plus signalait un état que cette icône n'a pas.
 *  · LE NUMÉRO DE SCÈNE FABRIQUÉ À LA MAIN (`` `0${index + 1}` ``) : la visite
 *    est déjà passée de 6 à 8 scènes ; à la dixième, il aurait imprimé « 010 ».
 *    Il passe par `sceneStepLabel` (pure, testée) et devient un VRAI kicker
 *    (`SectionLabel`, rôle typo R1) au-dessus du titre, au lieu d'un texte gris
 *    coincé entre l'icône et le titre.
 *  · LES TAILLES ET GRAISSES RECODÉES (`fontFamily` + `fontWeight` cumulés sur
 *    le titre, tailles nues sur la phrase et l'exemple) → rôles `typography`.
 *  · LES LITTÉRAUX DE MESURE NUS (280, 40, 18, 20) → constantes nommées et
 *    commentées, ou tokens. Ce sont des mesures de COMPOSITION, pas des règles
 *    de jeu : les règles, elles, viennent toutes de game-rules.ts.
 *  · « TU NE PERDS JAMAIS UNE ZONE PAR SURPRISE » (scène « vie de la zone »).
 *    L'alerte de fin de vie EXISTE (`decay_job` envoie un push à J-3) mais elle
 *    ne part que si le joueur a accepté les notifications ET si le build porte
 *    des credentials push — que `features/notifications/push.ts` déclare encore
 *    manquants. Un « jamais » conditionnel est une garantie écrite avant que le
 *    code la tienne : la phrase dit désormais sa condition (catalogue explain,
 *    `secVieExample` ; même correction sur `q12A`, côté FAQ).
 *
 * ── UNE VISITE POUR LES DEUX DISCIPLINES, SANS EN NOMMER AUCUNE ─────────────
 * La visite n'affiche pas la discipline du lecteur, et ne peut pas la
 * connaître : elle ne lit rien du joueur. Sa copie est donc NEUTRALISÉE
 * (« sortie », « repasser ») plutôt que dédoublée — une scène jumelle par
 * discipline serait un texte sans surface pour la choisir. Les règles énoncées
 * ici (decay, cooldown, points, protections, défense, Verify) valent bien à
 * l'identique dans les deux mondes ; les bornes qui DIFFÈRENT (distance,
 * allure, périmètre de boucle) ne sont pas chiffrées. Verrouillé par
 * `features/explain/copyDiscipline.test.ts`.
 *
 * ── ÉCARTS ASSUMÉS ─────────────────────────────────────────────────────────
 *  · CET ÉCRAN N'A PAS QUATRE ÉTATS, ET C'EST VOLONTAIRE. Il ne fait AUCUNE
 *    lecture réseau : les textes sont statiques (content.ts) et toutes les
 *    valeurs affichées sont dérivées des CONSTANTES de game-rules.ts via
 *    labels.ts / ExplainSchema. Il n'y a donc ni « lecture en cours », ni
 *    « échec de lecture », ni « Réessayer » — et il ne faut pas en ajouter :
 *    un spinner ici affirmerait qu'on attend quelque chose qui n'existe pas.
 *  · LES CHIFFRES DE SCÉNARIO (+247/+214/+33, 79/21 %, 620 m) restent des
 *    EXEMPLES, préfixés « Exemple : » dans le catalogue et formulés de façon
 *    IMPERSONNELLE (« une sortie de 6,2 km », jamais « ta sortie ») : rattachés
 *    au joueur, ils redeviendraient une donnée fabriquée sur lui.
 *  · AUCUN CTA CHARTREUSE : la page n'appelle aucune décision. La sortie vers la
 *    FAQ est une ligne scannable, pas un bouton plein.
 *
 * Accès : Support (« Pourquoi ma sortie n'a pas compté ? »), Paramètres, et le
 * lien post-run « Comment est calculé ce résultat ? ». La PORTE et la PAGE
 * disent maintenant le même mot : le libellé du Support vit dans
 * `i18n/catalog/reglages.ts` (`whyNotCountedTitle`), neutralisé de son côté.
 *
 * i18n : titres, phrases et exemples arrivent en `Entry` 5 langues (content.ts +
 * catalogue explain) et sont résolus ICI via t().
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { borderState, colors, iconSizes, sizes, spacing, typography } from '@klaim/shared';
import {
  EXPLAIN_SECTIONS,
  type ExplainSection,
} from '../src/features/explain/content';
import { ExplainSchema } from '../src/features/explain/ExplainSchema';
import { sceneStepLabel } from '../src/features/explain/sceneStep';
import { C } from '../src/i18n/catalog/explain';
import { useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { IconPlate } from '../src/ui/Card';
import { Icon } from '../src/ui/Icon';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';

/** Largeur des schémas : bornée à la scène, gouttière d'écran des deux côtés.
 *  Mesure de composition, pas une règle de jeu. */
const SCENE_SCHEMA_WIDTH = 280;

/** Respiration entre deux scènes. Plus large que `spacing.xxl` (32) : c'est ce
 *  vide — et lui seul — qui sépare les scènes, puisqu'aucune ne porte de cadre. */
const SCENE_GAP = 40;

/** Une scène : plaque d'icône + kicker numéroté + titre, phrase, schéma, exemple. */
function SceneBlock({ section, index }: { section: ExplainSection; index: number }) {
  const t = useT();
  const step = sceneStepLabel(index);
  return (
    <View style={styles.scene}>
      <View style={styles.head}>
        <IconPlate icon={section.icon} size="md" />
        <View style={styles.headText}>
          {/* Un rang sans libellé affichable ne s'imprime pas (jamais « 0NaN »). */}
          {step === null ? null : <SectionLabel style={styles.step}>{step}</SectionLabel>}
          {/* Aucun `numberOfLines` : un titre de scène s'enroule, il ne se coupe pas. */}
          <Text style={styles.title}>{t(section.title)}</Text>
        </View>
      </View>
      <Text style={styles.line}>{t(section.line)}</Text>
      <View style={styles.schemaWrap}>
        <ExplainSchema id={section.schemaId} width={SCENE_SCHEMA_WIDTH} />
      </View>
      <Text style={styles.example}>{t(section.example)}</Text>
    </View>
  );
}

export default function CalculZonesScreen() {
  const t = useT();

  useEffect(() => {
    screen('calcul_zones');
  }, []);

  return (
    <StackScreen
      title={t(C.calcTitle)}
      icon="info"
      kicker={t(C.calcKicker, { n: EXPLAIN_SECTIONS.length })}
      subtitle={t(C.calcSubtitle)}
    >
      <View style={styles.list}>
        {EXPLAIN_SECTIONS.map((section, i) => (
          <SceneBlock key={section.id} section={section} index={i} />
        ))}
      </View>

      {/* Sortie explicite vers la FAQ : ligne scannable (visuel → libellé →
          chevron), sur le plancher tactile. Le filet est en HAUT : c'est la
          dernière ligne de la page, un filet dessous flotterait dans le vide. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.calcSeeAllQuestions)}
        onPress={() => router.push('/faq')}
        style={({ pressed }) => [styles.faqLink, pressed && styles.pressed]}
      >
        <IconPlate icon="aide" size="sm" />
        <Text style={styles.faqLinkText}>{t(C.calcSeeAllQuestions)}</Text>
        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
      </Pressable>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: spacing.sm },
  // Une SCÈNE posée sur le fond : séparée par l'espace, sans contour.
  scene: { marginBottom: SCENE_GAP },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headText: { flex: 1 },
  // Le rang de la scène porte des chiffres : chasse fixe, comme tout kicker
  // numéroté de l'app (la casse et la couleur viennent de SectionLabel).
  step: { fontVariant: ['tabular-nums'] },
  title: { ...typography.cardTitle, color: colors.blanc },
  line: { ...typography.body, color: colors.blanc, marginTop: spacing.sm },
  schemaWrap: { alignItems: 'center', marginTop: spacing.md },
  // Exemple concret = contenu clé (pas un micro-label) : rôle `body`, en gris.
  example: { ...typography.body, color: colors.gris, marginTop: spacing.md },
  // Ligne scannable de bas de page (pas un CTA chartreuse — celui-ci reste rare).
  faqLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.md,
    marginTop: spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
  },
  faqLinkText: { ...typography.itemTitle, flex: 1, color: colors.blanc },
  pressed: { opacity: 0.6 },
});
