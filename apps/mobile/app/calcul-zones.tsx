/**
 * GRYD — « Comment GRYD calcule tes zones » (AMENDEMENT-23 §B.1 / doc §32, C2).
 * Route d'explicabilité : 6 SCÈNES posées sur le fond (AMENDEMENT-22, pas de
 * card-dans-card), chacune = icône propriétaire + phrase simple + mini-schéma
 * SVG + exemple concret. Les schémas DÉCRIVENT LE MOTEUR RÉEL post-C1 ; les
 * valeurs injectées (défense +24/48/72 h, verify 80/60) viennent des CONSTANTES
 * game-rules.ts via les helpers de labels.ts — AUCUN nombre magique ici. Les
 * chiffres en prose (+247/+214/+33, 79/21 %, 620 m) sont des SCÉNARIOS démo
 * portés par content.ts (défauts des schémas), signalés comme tels.
 *
 * Accès : Support (« Pourquoi ma course n'a pas compté ? »), Paramètres, et le
 * lien post-run « Comment est calculé ce résultat ? ».
 *
 * Positionnement zéro-friction : cette page = VISITE GUIDÉE (kicker « VISITE
 * GUIDÉE · 6 ÉTAPES ») ; la FAQ = questions précises — le lien de pied dit
 * « Voir toutes les questions » pour lever l'homonymie entre les deux écrans.
 * Réécritures d'affichage locales : l'exemple de boucle devient ADDITIF avec
 * unité nommée (214 + 33 = 247 zones) et « stats only » s'affiche « compte en
 * stats » (même pill que le Résultat de course) — les textes source vivent
 * dans content.ts / labels.ts.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, iconSizes, spacing } from '@klaim/shared';
import {
  EXPLAIN_SECTIONS,
  type ExplainSection,
  type SchemaId,
} from '../src/features/explain/content';
import {
  defenseHoursLabels,
  verifyTiersLabel,
} from '../src/features/explain/labels';
import {
  BonusCible,
  BoucleCollective,
  BoucleFaitLaZone,
  DefenseFrontiere,
  LigneVsBoucle,
  VerifySchema,
} from '../src/features/explain/schemas';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';

/**
 * Francisation d'affichage : « stats only » (hérité de labels.ts, hors
 * périmètre de cet écran) s'affiche « compte en stats » — exactement le
 * libellé de la pill du Résultat de course.
 */
function frStatut(text: string): string {
  return text.replace(/stats only/g, 'compte en stats');
}

/**
 * Exemple réécrit localement : ordre ADDITIF avec unité nommée (214 + 33 =
 * 247 zones) au lieu du total coincé entre ses deux composantes (texte source
 * dans content.ts, hors périmètre). Chiffres = scénario démo, signalé « Exemple ».
 */
const EXAMPLE_OVERRIDES: Readonly<Partial<Record<SchemaId, string>>> = {
  boucle_fait_zone:
    'Exemple : trace seule +214 zones · fermeture de la boucle +33 = 247 zones.',
};

/**
 * Honnêteté (charte §1) : TOUS les exemples de scène sont des scénarios démo
 * (chiffres, %, noms de crews fictifs). On préfixe donc « Exemple : » de façon
 * systématique — sauf ceux qui le portent déjà (override) — pour qu'aucune
 * donnée fabriquée ne se lise comme un chiffre réel.
 */
function withExamplePrefix(text: string): string {
  return /^exemple\b/i.test(text.trimStart()) ? text : `Exemple : ${text}`;
}

/**
 * Rend le schéma d'une section. Les 2 schémas paramétrés (défense, verify)
 * reçoivent leurs libellés depuis les VRAIES constantes (labels.ts), jamais des
 * littéraux — les autres portent déjà les scénarios démo en défaut de props.
 */
function Schema({ id, width }: { id: SchemaId; width: number }) {
  switch (id) {
    case 'ligne_vs_boucle':
      return <LigneVsBoucle size={width} />;
    case 'boucle_fait_zone':
      return <BoucleFaitLaZone size={width} />;
    case 'defense_frontiere': {
      const h = defenseHoursLabels();
      return (
        <DefenseFrontiere
          size={width}
          traverseLabel={h.traverse}
          longeLabel={h.longe}
          coverLabel={h.cover}
        />
      );
    }
    case 'boucle_collective':
      return <BoucleCollective size={width} />;
    case 'bonus_cible':
      return <BonusCible size={width} />;
    case 'verify': {
      const t = verifyTiersLabel();
      return (
        <VerifySchema
          size={width}
          validLabel={`Capture validée · ${t.full}+`}
          excludedLabel={`Segment exclu · < ${t.partial}`}
        />
      );
    }
  }
}

/** Une scène : numéro + icône + titre, phrase, schéma centré, exemple discret. */
function SceneBlock({ section, index }: { section: ExplainSection; index: number }) {
  // Largeur du schéma bornée à la scène (padding écran des deux côtés).
  const schemaWidth = 280;
  return (
    <View style={styles.scene}>
      <View style={styles.head}>
        <View style={styles.iconWrap}>
          <Icon name={section.icon} size={20} color={colors.blanc} />
        </View>
        <Text style={styles.step}>{`0${index + 1}`}</Text>
        <Text style={styles.title}>{section.title}</Text>
      </View>
      <Text style={styles.line}>{section.line}</Text>
      <View style={styles.schemaWrap}>
        <Schema id={section.schemaId} width={schemaWidth} />
      </View>
      <Text style={styles.example}>
        {withExamplePrefix(frStatut(EXAMPLE_OVERRIDES[section.id] ?? section.example))}
      </Text>
    </View>
  );
}

export default function CalculZonesScreen() {
  useEffect(() => {
    screen('calcul_zones');
  }, []);

  return (
    <StackScreen
      title="Calcul des zones"
      icon="info"
      kicker={`VISITE GUIDÉE · ${EXPLAIN_SECTIONS.length} ÉTAPES`}
      subtitle="Chaque zone gagnée s'explique — chaque zone refusée aussi."
    >
      <View style={styles.list}>
        {EXPLAIN_SECTIONS.map((section, i) => (
          <SceneBlock key={section.id} section={section} index={i} />
        ))}
      </View>

      {/* Sortie explicite vers la FAQ : verbe + objet, jamais un quasi-homonyme
          du titre de cette page. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voir toutes les questions"
        onPress={() => router.push('/faq')}
        style={({ pressed }) => [styles.faqLink, pressed && styles.pressed]}
      >
        <Icon name="aide" size={iconSizes.md} color={colors.blanc} />
        <Text style={styles.faqLinkText}>Voir toutes les questions</Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: spacing.sm },
  // Une SCÈNE posée sur le fond : séparée par l'espace, sans contour (AMENDEMENT-22).
  scene: { marginBottom: 40 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  title: { flex: 1, color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  line: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.sm,
  },
  schemaWrap: { alignItems: 'center', marginTop: 18 },
  // Exemple concret = contenu clé (pas un micro-label) : sm, lisible en mouvement.
  example: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.55,
    marginTop: spacing.md,
  },
  // Action légère de bas de page (pas un gros CTA chartreuse — celui-ci reste rare).
  faqLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: colors.grisLigne,
  },
  faqLinkText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
