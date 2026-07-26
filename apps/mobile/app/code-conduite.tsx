/**
 * GRYD — CODE DE CONDUITE (App Store Guideline 1.2). C'est le texte qu'un
 * examinateur lit comme un ENGAGEMENT de modération : chacune de ses phrases est
 * opposable, donc chacune doit être vraie dans CE build.
 *
 * ─── ORDRE DE COMPOSITION ─────────────────────────────────────────────────────
 *   1. `StackScreen` : kicker « COMMUNAUTÉ » + titre + sous-titre ;
 *   2. LES RÈGLES — cinq blocs courts, un par règle ;
 *   3. MODÉRATION — ce qui se passe quand une règle est enfreinte ;
 *   4. LE CHEMIN VERS L'ACTION — une `ListRow` vers Confidentialité, où
 *      signaler et bloquer existent RÉELLEMENT ;
 *   5. la note de pied, qui redit l'engagement sans le dépasser.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · QUATRE COPIES DÉCRIVANT UN CHAT QUI N'EXISTE PAS : « appui long ou menu
 *   "Signaler" » sur un message, « bloquer masque tous ses messages », « le chat
 *   crew sert à jouer ». Il n'y a ni route, ni onglet, ni écran de chat — le chat
 *   libre est refusé (A-43 §9) et l'écran Crew le dit lui-même. Les règles
 *   portent maintenant sur ce qui existe : le pseudo et le nom de crew.
 * · LA CONTRADICTION AVEC `/support`. Cet écran promettait « une personne lit
 *   chaque signalement » pendant que l'Aide répondait « cette remontée n'est pas
 *   encore transmise » dans le même build. Elle est levée du bon côté : l'Aide
 *   ne prétend plus recevoir ce qu'elle ne reçoit pas, et le signalement de
 *   joueur — qui, lui, écrit vraiment dans `content_reports` — est nommé avec sa
 *   condition (un compte).
 * · L'ABSENCE DE CHEMIN VERS L'ACTION. L'écran expliquait comment signaler et
 *   bloquer sans un seul lien vers l'endroit où ces deux gestes se font.
 * · Le carré d'icône CADRÉ enfermé dans une card CADRÉE (un contour dans un
 *   contour) → `IconPlate`, la seule source du carré d'icône ; et les huit
 *   cadres permanents des cards → surface N1 séparée par l'espace.
 * · Le sur-titre recodé à la main → `SectionLabel` (rôle typo R1).
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ──────────────────────────────────────────────
 * · L'écran ne fait aucune lecture réseau : pas d'état vide, d'échec ni de
 *   chargement — il le déclare ici plutôt que d'en simuler.
 * · Le filtre de mots reste local et minimal (`features/crew/moderation.ts`) :
 *   le nom de crew, lui, est filtré côté SERVEUR (migration 0050). Le code de
 *   conduite ne détaille pas ce partage — il décrit la règle, pas son moteur.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  colors,
  elevation,
  fontSizes,
  gameColors,
  radii,
  spacing,
  typography,
  type IconName,
} from '@klaim/shared';
import { C } from '../src/i18n/catalog/reglages';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { IconPlate } from '../src/ui/Card';
import { ListRow } from '../src/ui/ListRow';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';

interface Rule {
  key: string;
  icon: IconName;
  title: Entry;
  body: Entry;
}

/** Les règles de la communauté GRYD — courtes, non négociables. */
const RULES: readonly Rule[] = [
  { key: 'respect', icon: 'crew', title: C.respectTitle, body: C.respectBody },
  { key: 'zero_haine', icon: 'alerte', title: C.zeroHaineTitle, body: C.zeroHaineBody },
  { key: 'pseudo', icon: 'profil', title: C.pseudoCorrectTitle, body: C.pseudoCorrectBody },
  { key: 'no_spam', icon: 'cloche', title: C.noSpamTitle, body: C.noSpamBody },
  { key: 'securite', icon: 'bouclier', title: C.securiteTitle, body: C.securiteBody },
];

/** Ce que fait la modération quand une règle est enfreinte. */
const ENFORCEMENT: readonly Rule[] = [
  { key: 'report', icon: 'alerte', title: C.reportEnfTitle, body: C.reportEnfBody },
  { key: 'block', icon: 'verrou', title: C.blockEnfTitle, body: C.blockEnfBody },
  { key: 'sanctions', icon: 'fermer', title: C.sanctionsTitle, body: C.sanctionsBody },
];

function RuleCard({ rule, tint = colors.gris }: { rule: Rule; tint?: string }) {
  const t = useT();
  return (
    <View style={styles.card}>
      {/* `IconPlate` : la SEULE source du carré d'icône. L'ancien `iconWrap`
          local était un carré bordé à l'intérieur d'une card bordée. */}
      <IconPlate icon={rule.icon} size="md" color={tint} />
      <View style={styles.info}>
        <Text style={styles.title}>{t(rule.title)}</Text>
        <Text style={styles.body}>{t(rule.body)}</Text>
      </View>
    </View>
  );
}

export default function CodeConduiteScreen() {
  const t = useT();
  useEffect(() => {
    screen('code_conduite');
  }, []);

  return (
    <StackScreen
      title={t(C.conduiteTitle)}
      icon="crew"
      kicker={t(C.conduiteKicker)}
      subtitle={t(C.conduiteSubtitle)}
    >
      <SectionLabel style={styles.kicker}>{t(C.secLesRegles)}</SectionLabel>
      {RULES.map((r) => (
        <RuleCard
          key={r.key}
          rule={r}
          // La couleur porte un RÔLE (l'urgence de la tolérance zéro), jamais
          // une identité — et elle est toujours doublée par le TITRE.
          tint={r.key === 'zero_haine' ? gameColors.danger : colors.gris}
        />
      ))}

      <SectionLabel style={styles.kicker}>{t(C.secModeration)}</SectionLabel>
      {ENFORCEMENT.map((r) => (
        <RuleCard key={r.key} rule={r} />
      ))}

      {/* LE CHEMIN QUI MANQUAIT : l'écran expliquait comment signaler et bloquer
          sans jamais mener là où ces deux gestes existent. */}
      <ListRow
        icon="verrou"
        label={t(C.conduiteActionCta)}
        sublabel={t(C.conduiteActionDetail)}
        chevron
        onPress={() => router.push('/confidentialite')}
        style={styles.actionRow}
      />

      <Text style={styles.footnote}>{t(C.conduiteFootnote)}</Text>
    </StackScreen>
  );
}

/** Rythme vertical des sur-titres — commun à tous les écrans de réglages. */
const KICKER_TOP = 24;
// Aligné sur les six autres écrans de réglages (10, pas 12) : cet écran était le
// seul à dériver alors que le commentaire ci-dessus revendique un rythme commun.
const KICKER_BOTTOM = 10;

const styles = StyleSheet.create({
  kicker: { marginTop: KICKER_TOP, marginBottom: KICKER_BOTTOM },
  // Surface N1 SANS contour : les blocs se séparent par l'espace (règle 80/20).
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding - 2,
    marginBottom: 10,
  },
  info: { flex: 1 },
  title: { ...typography.itemTitle, color: colors.blanc },
  body: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xxs,
  },
  actionRow: { marginTop: KICKER_TOP },
  footnote: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 18,
  },
});
