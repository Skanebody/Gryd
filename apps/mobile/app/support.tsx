/**
 * GRYD — AIDE. L'écran de recours. C'est celui qui a le moins le droit de
 * promettre quoi que ce soit : quelqu'un qui l'ouvre a déjà un problème.
 *
 * ─── ORDRE DE COMPOSITION ─────────────────────────────────────────────────────
 *   1. `StackScreen` : kicker « AIDE » + titre + sous-titre ;
 *   2. COMPRENDRE LES CALCULS — deux `ListRow` qui NAVIGUENT vers les pages
 *      d'explicabilité (calcul des zones, FAQ) ;
 *   3. MA SORTIE — deux blocs d'EXPLICATION, non tappables : du contenu, pas des
 *      contrôles ;
 *   4. SIGNALER — une `ListRow` vers le seul signalement RÉEL de l'app ;
 *   5. MES DONNÉES — export et suppression, réels, dans Confidentialité ;
 *   6. LE CANAL DE CONTACT — `hey@gryd.run`, ouverte le 09/08/2026. Cette carte
 *      nommait l'ABSENCE tant qu'aucune boîte n'existait ; elle nomme désormais
 *      l'adresse, en gardant la même franchise sur ce qui n'existe toujours pas
 *      (signalement de zone, contestation de statut).
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · LES QUATRE CARDS DE SIGNALEMENT MORTES. « Course non comptée », « Segment
 *   exclu », « Signaler une triche », « Zone dangereuse » portaient toutes un
 *   chevron et ouvraient toutes la MÊME `Alert` : « cette remontée n'est pas
 *   encore transmise ». Quatre boutons morts sur l'écran de recours — et un
 *   chevron identique à celui des cards qui, elles, naviguent vraiment : les
 *   neuf entrées faisaient la même promesse, deux tenaient. Désormais :
 *     — les deux EXPLICATIONS deviennent des blocs de texte, sans chevron ;
 *     — la TRICHE devient « Signaler un joueur » et ouvre Confidentialité, où le
 *       signalement écrit réellement dans `content_reports` ;
 *     — la ZONE DANGEREUSE disparaît : elle n'a aucune destination, nulle part.
 * · LA DOUBLE ENTRÉE VERS `/calcul-zones`. Deux cards distinctes ouvraient la
 *   même page ; il n'en reste qu'une.
 * · `supportFootnote`, qui affirmait « les décisions … jamais automatiques sans
 *   recours ». Le recours n'existe pas : cet écran n'a ni adresse e-mail, ni
 *   formulaire, ni `Linking.openURL('mailto:')`.
 * · Le composant `TopicCard` / `NavCard` / `TopicIcon` local, qui dupliquait
 *   `ListRow` et son `IconPlate`, ses neuf cadres permanents, et ses styles typo
 *   sans `fontFamily` (donc la fonte système, pas Inter).
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ──────────────────────────────────────────────
 * · Pas de BOUTON « Nous écrire », mais l'adresse est ÉCRITE et lisible.
 *   L'argument d'origine — « un `mailto:` vers une adresse inventée serait un
 *   bouton mort de plus » — est levé : l'adresse existe et a été vérifiée (MX).
 *   Ce qui reste vrai, c'est qu'un `mailto:` échoue en silence sur un appareil
 *   sans client mail configuré. Une adresse en toutes lettres se recopie
 *   toujours ; un bouton qui ne s'ouvre pas, jamais. Le bouton viendra avec sa
 *   gestion d'échec, pas avant.
 * · Cet écran ne fait AUCUNE lecture réseau : il n'a donc ni état vide, ni état
 *   d'échec, ni état de chargement — et il le déclare ici plutôt que d'en
 *   simuler.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, elevation, fontSizes, radii, spacing, typography, type IconName } from '@klaim/shared';
import { C } from '../src/i18n/catalog/reglages';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { IconPlate } from '../src/ui/Card';
import { ListRow } from '../src/ui/ListRow';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';

/** Une entrée qui NAVIGUE — donc qui porte un chevron, et le mérite. */
interface NavTopic {
  key: string;
  icon: IconName;
  title: Entry;
  body: Entry;
  href: string;
}

/** Explicabilité : les deux pages qui répondent vraiment (AMENDEMENT-23 §B). */
const EXPLAIN_TOPICS: readonly NavTopic[] = [
  {
    key: 'why_not_counted',
    icon: 'info',
    title: C.whyNotCountedTitle,
    body: C.whyNotCountedBody,
    href: '/calcul-zones',
  },
  {
    key: 'faq_rules',
    icon: 'aide',
    title: C.explainFaqTitle,
    body: C.faqRulesBody,
    href: '/faq',
  },
];

/** Les deux actions RÉELLES de l'app, dans l'écran qui les concerne. */
const ACTION_TOPICS: readonly NavTopic[] = [
  {
    key: 'report_player',
    icon: 'alerte',
    title: C.reportPlayerTitle,
    body: C.reportPlayerBody,
    href: '/confidentialite',
  },
  {
    key: 'data_export',
    icon: 'partage',
    title: C.exporterMesDonnees,
    body: C.dataExportBody,
    href: '/confidentialite',
  },
  {
    key: 'data_delete',
    icon: 'fermer',
    title: C.dataDeleteTitle,
    body: C.dataDeleteBody,
    href: '/confidentialite',
  },
];

/**
 * Bloc d'EXPLICATION : même surface qu'une ligne, mais ni chevron ni `onPress`.
 * C'est ce qui distingue à l'œil ce qui navigue de ce qui informe — la confusion
 * que produisaient neuf cards au chevron identique.
 */
function ExplainBlock({ icon, title, body }: { icon: IconName; title: Entry; body: Entry }) {
  const t = useT();
  return (
    <View style={styles.block}>
      <IconPlate icon={icon} size="md" color={colors.gris} />
      <View style={styles.blockText}>
        <Text style={styles.blockTitle}>{t(title)}</Text>
        <Text style={styles.blockBody}>{t(body)}</Text>
      </View>
    </View>
  );
}

export default function SupportScreen() {
  const t = useT();
  useEffect(() => {
    screen('support');
  }, []);

  return (
    <StackScreen
      title={t(C.supportTitle)}
      icon="aide"
      kicker={t(C.supportKicker)}
      subtitle={t(C.supportSubtitle)}
    >
      <SectionLabel style={styles.kicker}>{t(C.secComprendreCalculs)}</SectionLabel>
      {EXPLAIN_TOPICS.map((topic) => (
        <ListRow
          key={topic.key}
          icon={topic.icon}
          label={t(topic.title)}
          sublabel={t(topic.body)}
          chevron
          onPress={() => router.push(topic.href)}
        />
      ))}

      {/* « MA SORTIE » — cet écran est celui qu'ouvre quelqu'un dont la sortie
          vient d'être refusée, et c'est aussi bien un cycliste : `ingest_run`
          valide les deux disciplines, avec des bornes propres à chacune. L'Aide
          ne LIT aucune discipline (aucun commutateur E14) : elle ne peut donc
          pas avoir de jumeau, elle doit parler à tout le monde. */}
      <SectionLabel style={styles.kicker}>{t(C.secMaSortie)}</SectionLabel>
      <ExplainBlock icon="aide" title={C.runStatusTitle} body={C.notCountedBody} />
      <ExplainBlock
        icon="pin"
        title={C.segmentExcludedTitle}
        body={C.segmentExcludedBody}
      />

      <SectionLabel style={styles.kicker}>{t(C.secSignaler)}</SectionLabel>
      <ListRow
        icon={ACTION_TOPICS[0]!.icon}
        label={t(ACTION_TOPICS[0]!.title)}
        sublabel={t(ACTION_TOPICS[0]!.body)}
        chevron
        onPress={() => router.push(ACTION_TOPICS[0]!.href)}
      />

      <SectionLabel style={styles.kicker}>{t(C.secMesDonnees)}</SectionLabel>
      {ACTION_TOPICS.slice(1).map((topic) => (
        <ListRow
          key={topic.key}
          icon={topic.icon}
          label={t(topic.title)}
          sublabel={t(topic.body)}
          chevron
          onPress={() => router.push(topic.href)}
        />
      ))}

      {/* LE CONTACT, nommé — après les actions, en gris : c'est un recours, pas
          l'action principale de l'écran. La carte garde le même ton qu'avant,
          quand elle nommait une absence : elle dit d'abord ce qui n'existe
          TOUJOURS pas (signaler une zone, contester un statut), puis l'adresse
          qui couvre tout le reste. */}
      <View style={styles.absenceCard}>
        <Text style={styles.absenceTitle}>{t(C.supportNoChannelTitle)}</Text>
        <Text style={styles.absenceBody}>{t(C.supportNoChannelBody)}</Text>
      </View>
      <ListRow
        icon="pass"
        label={t(C.supportLegalCta)}
        chevron
        onPress={() => router.push('/a-propos')}
      />

      <Text style={styles.footnote}>{t(C.supportFootnote)}</Text>
    </StackScreen>
  );
}

/** Rythme vertical des sur-titres — commun à tous les écrans de réglages. */
const KICKER_TOP = 24;
const KICKER_BOTTOM = 10;

const styles = StyleSheet.create({
  kicker: { marginTop: KICKER_TOP, marginBottom: KICKER_BOTTOM },

  // Même géométrie qu'une `ListRow`, sans chevron ni interaction : c'est un
  // contenu. Surface N1 sans contour, séparée par l'espace.
  block: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding - 2,
    marginBottom: 10,
  },
  blockText: { flex: 1 },
  blockTitle: { ...typography.itemTitle, color: colors.blanc },
  blockBody: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xxs,
  },

  absenceCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginTop: KICKER_TOP,
    marginBottom: 10,
  },
  absenceTitle: { ...typography.itemTitle, color: colors.blanc },
  absenceBody: { ...typography.meta, color: colors.gris, lineHeight: fontSizes.xs * 1.6 },

  footnote: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 18,
  },
});
