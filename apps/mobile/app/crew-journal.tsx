/**
 * GRYD — F · « JOURNAL DES DÉCISIONS » (route `/crew-journal`), spec §4.1 F.
 *
 * ══ POURQUOI UN JOURNAL, ET POURQUOI IL NOMME ═════════════════════════════
 * L'exclusion sans motif est la blessure du modèle Clash (§1.3 ⑤) : manuelle,
 * immédiate, muette. GRYD la répare en DEUX endroits qui ne disent pas la même
 * chose, et c'est délibéré :
 *   · la notification reçue par la personne exclue dit le MOTIF et jamais le
 *     nom de qui a décidé (on n'arme pas une rancune) ;
 *   · CE journal, lui, nomme le décideur. Un officier qui exclut engage sa
 *     responsabilité devant les autres officiers, pas devant l'exclu.
 * Supprimer l'un des deux rendrait l'autre injuste.
 *
 * ══ « AUTOMATIQUE » N'EST PAS UNE CASE VIDE ═══════════════════════════════
 * Quand c'est le job quotidien qui a décidé, `actor` vaut `null` et
 * `automatic` vaut `true`. L'écran écrit « automatique » : un journal qui
 * laisserait une case vide ferait chercher un responsable qui n'existe pas.
 *
 * ══ LECTURE SEULE, ET AUCUNE ACTION ═══════════════════════════════════════
 * Aucun bouton, aucun CTA chartreuse : rien ne s'annule ici. Une décision
 * levée (un avertissement, par exemple) reste écrite — levé n'est pas effacé.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, sizes, spacing } from '@klaim/shared';
import { CREW_DECISION_E, CREW_KICK_REASON_E, G } from '../src/i18n/catalog/crewGestion';
import { C } from '../src/i18n/catalog/crew';
import { useLocale, useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { dayText } from '../src/features/crew/management/crewManagementCopy';
import { useCrewDecisions } from '../src/features/crew/management/crewManagementData';
import type { Decision2026 } from '../src/features/crew/management/crewBoard2026';

const KICK_REASONS: readonly string[] = Object.keys(CREW_KICK_REASON_E);

export default function CrewJournalRoute() {
  const t = useT();
  const { session } = useSession();
  const { loading, failed, refusal, data, reload } = useCrewDecisions();

  if (!session) {
    return (
      <StackScreen title={t(G.logTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(G.boardSignedOut)}</Text>
        </View>
      </StackScreen>
    );
  }

  // Le serveur a RÉPONDU non. Pas de « Réessayer » : rien ne changera au
  // deuxième essai, et faire tourner quelqu'un en rond est une faute.
  if (refusal === 'forbidden' || refusal === 'no_crew') {
    return (
      <StackScreen title={t(G.logTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>
            {t(refusal === 'forbidden' ? G.boardForbiddenTitle : G.boardNoCrewTitle)}
          </Text>
          <Text style={styles.body}>
            {t(refusal === 'forbidden' ? G.boardForbiddenBody : G.boardNoCrewBody)}
          </Text>
        </View>
      </StackScreen>
    );
  }

  if (failed) {
    return (
      <StackScreen title={t(G.logTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(G.boardFailedTitle)}</Text>
          <Text style={styles.body}>{t(G.logFailed)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      </StackScreen>
    );
  }

  if (!data) {
    return (
      <StackScreen title={t(G.logTitle)}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
          <Text style={styles.body}>{t(G.boardLoading)}</Text>
        </View>
      </StackScreen>
    );
  }

  return (
    <StackScreen title={t(G.logTitle)} kicker={t(G.logKicker)}>
      {/* Une liste VIDE est une réponse : ce crew n'a rien décidé. Elle ne se
          confond pas avec l'échec traité au-dessus. */}
      {data.length === 0 ? (
        <View style={styles.block}>
          <Text style={styles.body}>{t(G.logEmpty)}</Text>
        </View>
      ) : (
        data.map((entry, i) => <LogRow key={`${entry.kind}-${entry.atMs ?? i}-${i}`} entry={entry} />)
      )}
    </StackScreen>
  );
}

function LogRow({ entry }: { entry: Decision2026 }) {
  const t = useT();
  const locale = useLocale();
  const day = dayText(entry.atMs, locale);
  /**
   * Le motif n'est traduit que s'il appartient au catalogue fermé d'exclusion.
   * Un motif interne (`resolved` sur un avertissement levé, par exemple) est
   * rendu TEL QUEL : le traduire au hasard raconterait autre chose que ce qui
   * s'est passé.
   */
  const reasonText =
    entry.reason && KICK_REASONS.includes(entry.reason)
      ? t(CREW_KICK_REASON_E[entry.reason as keyof typeof CREW_KICK_REASON_E])
      : entry.reason;

  return (
    <View style={styles.row}>
      <Text style={styles.kind}>{t(CREW_DECISION_E[entry.kind])}</Text>
      <Text style={styles.meta}>
        {day ?? ''}
        {entry.target ? ` · ${t(G.logAbout, { name: entry.target })}` : ''}
      </Text>
      <Text style={styles.meta}>
        {entry.automatic ? t(G.logAutomatic) : entry.actor ? t(G.logBy, { name: entry.actor }) : ''}
      </Text>
      {reasonText ? (
        <Text style={styles.meta}>{t(G.logMotive, { reason: reasonText })}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  cta: { marginTop: spacing.sm },
  center: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },

  // Lignes à PLAT, séparées par un filet : une card par décision ferait un mur
  // de rectangles là où l'œil cherche une chronologie (§A).
  row: {
    marginTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
    gap: 2,
    minHeight: sizes.touchTarget,
  },
  kind: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  meta: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
});
