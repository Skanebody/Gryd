/**
 * GRYD — CODE DE CONDUITE de la communauté (AMENDEMENT-33 §1, App Store
 * Guideline 1.2). Écran POUSSÉ depuis le Chat crew. Règles COURTES de la
 * communauté + « Tolérance zéro » harcèlement/haine. Volontairement sobre :
 * ton calme, cards courtes iconées, pas de vocabulaire gaming. Rappelle aussi
 * comment SIGNALER / BLOQUER (déjà dans le chat) — Apple veut voir un moyen
 * clair de modérer le contenu généré par les utilisateurs. Contenu légal RÉEL.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, spacing, type IconName } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';

interface Rule {
  key: string;
  icon: IconName;
  title: string;
  body: string;
}

/** Les règles de la communauté GRYD — courtes, non négociables. */
const RULES: readonly Rule[] = [
  {
    key: 'respect',
    icon: 'crew',
    title: 'Respecte les autres coureurs',
    body:
      'On se pousse à courir, jamais à se rabaisser. Encouragements et fair-play, dans le crew ' +
      'comme face aux rivaux. Pas de moquerie, pas d’acharnement.',
  },
  {
    key: 'zero_haine',
    icon: 'alerte',
    title: 'Tolérance zéro : harcèlement et haine',
    body:
      'Aucun racisme, sexisme, homophobie, menace, insulte ni harcèlement. Un seul message de ' +
      'ce type suffit à faire retirer le contenu et suspendre le compte.',
  },
  {
    key: 'pseudo',
    icon: 'profil',
    title: 'Un pseudo et un crew corrects',
    body:
      'Le nom de ton crew et ton pseudo sont publics. Rien de haineux, sexuel ou trompeur : ' +
      'ils peuvent être modifiés ou masqués par la modération.',
  },
  {
    key: 'no_spam',
    icon: 'cloche',
    title: 'Pas de spam ni d’arnaque',
    body:
      'Le chat crew sert à jouer et se coordonner. Pas de publicité, de lien douteux ni de ' +
      'sollicitation d’argent. Les demandes de boost sont toujours facultatives.',
  },
  {
    key: 'securite',
    icon: 'bouclier',
    title: 'La sécurité passe avant le jeu',
    body:
      'Cours en respectant le code de la route et les lieux privés. Aucune zone ne vaut de se ' +
      'mettre, ni de mettre quelqu’un, en danger.',
  },
];

/** Ce que fait la modération quand une règle est enfreinte. */
const ENFORCEMENT: readonly Rule[] = [
  {
    key: 'report',
    icon: 'alerte',
    title: 'Signale ce qui te choque',
    body:
      'Sur un message ou un membre : appui long ou menu « Signaler », choisis un motif. ' +
      'Chaque signalement est examiné par une personne sous 24 h.',
  },
  {
    key: 'block',
    icon: 'verrou',
    title: 'Bloque qui tu ne veux plus voir',
    body:
      'Bloquer un membre masque tous ses messages, immédiatement et sans le prévenir. ' +
      'Tu peux le débloquer à tout moment.',
  },
  {
    key: 'sanctions',
    icon: 'fermer',
    title: 'Ce qu’on fait des abus',
    body:
      'Contenu retiré, avertissement, puis suspension du compte en cas de récidive ou de ' +
      'gravité. Les décisions sont prises par une personne, jamais automatiquement.',
  },
];

function RuleCard({ rule, tint = colors.blanc }: { rule: Rule; tint?: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Icon name={rule.icon} size={18} color={tint} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title}>{rule.title}</Text>
        <Text style={styles.body}>{rule.body}</Text>
      </View>
    </View>
  );
}

export default function CodeConduiteScreen() {
  useEffect(() => {
    screen('code_conduite');
  }, []);

  return (
    <StackScreen
      title="Code de conduite"
      icon="crew"
      kicker="COMMUNAUTÉ"
      subtitle="GRYD est un jeu qui pousse à courir, pas à se rabaisser. Ces règles s’appliquent à tout le monde, tout le temps."
    >
      <View style={styles.list}>
        <Text style={styles.sectionLabel}>LES RÈGLES</Text>
        {RULES.map((r) => (
          <RuleCard
            key={r.key}
            rule={r}
            tint={r.key === 'zero_haine' ? gameColors.danger : colors.blanc}
          />
        ))}

        <Text style={styles.sectionLabel}>MODÉRATION</Text>
        {ENFORCEMENT.map((r) => (
          <RuleCard key={r.key} rule={r} />
        ))}
      </View>

      <Text style={styles.footnote}>
        En jouant à GRYD, tu acceptes ce code de conduite. Le contenu haineux ou de harcèlement
        n’a pas sa place ici — une personne lit chaque signalement.
      </Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 8 },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  body: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 4,
  },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 18,
  },
});
