/**
 * GRYD — « CE QUE CE CREW DEMANDE » : les deux blocs partagés (LOT Q3).
 *
 * ─── POURQUOI ILS SONT PARTAGÉS ET NON RECOPIÉS ──────────────────────────────
 * Trois surfaces montrent les mêmes exigences et la même charte : la fiche
 * publique (avant l'entrée), l'écran de candidature (au moment d'accepter) et
 * l'écran de règles (côté capitaine, en relecture). Le risque 3 de la spec
 * (§5.3) tient à ce qu'elles disent EXACTEMENT la même chose : la vie privée du
 * tableau de suivi n'est acceptable que si le candidat a lu, avant d'entrer, les
 * règles qui rendront ses mesures visibles. Deux copies divergentes de ce bloc,
 * et le consentement devient fictif.
 *
 * ─── CE QU'ILS NE FONT PAS ───────────────────────────────────────────────────
 * Ils ne lisent RIEN : les règles leur sont passées. Ils n'affirment rien non
 * plus quand elles manquent — c'est l'appelant qui distingue « ce crew n'a pas
 * de condition » (une réponse) de « je n'ai pas pu lire » (une absence de
 * réponse), parce que lui seul connaît l'état de sa lecture.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, radii, sizes, spacing } from '@klaim/shared';
import { G } from '../../../i18n/catalog/crewGestion';
import { useLocale, useT } from '../../../i18n/store';
import { enforcementLine, dayText, requirementLine } from './crewManagementCopy';
import {
  activeEnforcement,
  activeRequirements,
  type CrewRules2026,
} from './crewRules2026';

/**
 * LES EXIGENCES D'ENTRÉE, en clair. Un crew sans exigence le DIT (« ce crew n'a
 * pas de condition d'entrée ») : laisser un vide ferait croire à un chargement
 * raté, et surtout à un mur invisible.
 *
 * `invitesBypass` peint la porte humaine (leçon ② de Clash) : sans elle, le
 * seuil se lit comme un refus définitif alors qu'un membre peut inviter
 * n'importe qui, exigences comprises.
 */
export function CrewRequirementsBlock({
  rules,
  showBypass = true,
}: {
  rules: CrewRules2026;
  showBypass?: boolean;
}) {
  const t = useT();
  const reqs = activeRequirements(rules.requirements);
  return (
    <View style={styles.block}>
      <Text style={styles.kicker}>{t(G.publicRequirementsTitle)}</Text>
      {reqs.length === 0 ? (
        <Text style={styles.body}>{t(G.publicNoRequirements)}</Text>
      ) : (
        reqs.map((r) => (
          <Text key={r.key} style={styles.line}>
            {requirementLine(t, r.key, r.value)}
          </Text>
        ))
      )}
      {showBypass ? <Text style={styles.note}>{t(G.applyInvitesBypass)}</Text> : null}
    </View>
  );
}

/**
 * LES RÈGLES ARMÉES, et le consentement qu'elles impliquent.
 *
 * ⚠ LA PHRASE DE CONSENTEMENT N'EST PEINTE QUE S'IL Y A UNE RÈGLE. Écrire « tes
 * mesures seront vérifiées » sur un crew sans règle serait une menace sans
 * objet, et rendrait le texte inaudible là où il compte vraiment.
 */
export function CrewEnforcementBlock({ rules }: { rules: CrewRules2026 }) {
  const t = useT();
  const active = activeEnforcement(rules.enforcement);
  if (active.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text style={styles.kicker}>{t(G.publicRulesTitle)}</Text>
      {active.map((r) => (
        <Text key={r.key} style={styles.line}>
          {enforcementLine(t, r.key, r.value)}
        </Text>
      ))}
      <Text style={styles.note}>{t(G.publicRulesConsent)}</Text>
    </View>
  );
}

/**
 * LA CHARTE, repliable. Repliée par défaut sur la fiche publique : 600
 * caractères poussent le bouton d'adhésion hors de l'écran, et une décision
 * qu'on ne voit plus n'est pas une décision. Le dépli est un vrai bouton (44 pt)
 * qui dit son état, pas une flèche muette.
 */
export function CrewCharterBlock({
  rules,
  defaultOpen = false,
}: {
  rules: CrewRules2026;
  defaultOpen?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(defaultOpen);
  if (rules.charter === null) return null;
  const day = dayText(rules.updatedAtMs, locale);
  return (
    <View style={styles.block}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen((v) => !v)}
        style={styles.toggle}
      >
        <Text style={styles.kicker}>{t(G.charterTitle)}</Text>
        <Text style={styles.toggleText}>
          {open ? t(G.publicCharterExpanded) : t(G.publicCharterCollapsed)}
        </Text>
      </Pressable>
      {open ? <Text style={styles.charter}>{rules.charter}</Text> : null}
      {open && day ? (
        <Text style={styles.note}>
          {t(G.charterVersionLine, { n: rules.charterVersion, date: day })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Blocs à PLAT : la hiérarchie vient de l'espace, jamais d'une card autour
  // d'une card (charte §A).
  block: { marginTop: spacing.lg, gap: spacing.xs },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  line: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: 22 },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  note: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.touchTarget,
    gap: spacing.sm,
  },
  toggleText: { color: colors.blanc, fontSize: fontSizes.sm, textDecorationLine: 'underline' },
  charter: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    lineHeight: 24,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.md,
  },
});
