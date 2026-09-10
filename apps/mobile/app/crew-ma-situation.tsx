/**
 * GRYD — I · « MA SITUATION DANS LE CREW » (route `/crew-ma-situation`),
 * spec §4.2 I.
 *
 * ══ POURQUOI CET ÉCRAN EXISTE, ET CE QU'IL GARANTIT ═══════════════════════
 * Un membre ne doit jamais être retiré d'un crew sans avoir pu voir pourquoi.
 * `crew_my_standing_2026` est la seule lecture du dépôt qui ÉCRIT : elle
 * acquitte les avertissements ouverts de l'appelant (`acknowledged_at`), et
 * c'est cet acquittement qui rend vraie la garantie « jamais retiré sans
 * avertissement lu ou vieux de CREW_WARNING_GRACE_DAYS jours » (décision 4 du
 * fondateur). Ouvrir cet écran n'est donc pas neutre : c'est l'acte de lecture
 * lui-même. On ne le déclenche jamais en arrière-plan.
 *
 * ══ LE TON : AUCUNE INJONCTION À COURIR (§14.2) ═══════════════════════════
 * L'écran DIT un fait (« ta dernière sortie remonte à … ») et ce qui le lève
 * (« une sortie enregistrée lève cet avertissement »). Il ne demande rien, il
 * ne félicite pas, il ne compare à personne. Le cahier refuse de transformer
 * une mesure en ordre.
 *
 * ══ LE BLOC « À RISQUE » N'EXISTE QUE S'IL Y A UN RISQUE ══════════════════
 * Sans `auto_remove_after_days` armé, il n'y a pas de retrait, donc pas de
 * risque, donc RIEN à dire. Peindre un bloc « à risque » vide serait une menace
 * sans objet, et la pire façon de faire quitter quelqu'un.
 *
 * ══ AUCUN CTA CHARTREUSE hors état d'échec ════════════════════════════════
 * Il n'y a rien à faire ici : c'est une lecture. Le seul bouton possible est
 * « Réessayer », et il n'apparaît que si la lecture a échoué.
 */
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  CREW_ENFORCEMENT_KEYS,
  colors,
  fontSizes,
  gameColors,
  spacing,
  type CrewEnforcementKey,
} from '@klaim/shared';
import { CREW_WARNING_KIND_E, G } from '../src/i18n/catalog/crewGestion';
import { C } from '../src/i18n/catalog/crew';
import { useLocale, useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { openWarnings } from '../src/features/crew/management/crewBoard2026';
import {
  dayText,
  enforcementLine,
  lastRunText,
  num,
} from '../src/features/crew/management/crewManagementCopy';
import { useMyStanding } from '../src/features/crew/management/crewManagementData';

export default function CrewMaSituationRoute() {
  const t = useT();
  const locale = useLocale();
  const { session } = useSession();
  const { loading, failed, refusal, data: standing, reload } = useMyStanding();

  if (!session) {
    return (
      <StackScreen title={t(G.standingTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(G.boardSignedOut)}</Text>
        </View>
      </StackScreen>
    );
  }

  // Le serveur a RÉPONDU : pas de crew. Ce n'est pas une panne.
  if (refusal === 'no_crew') {
    return (
      <StackScreen title={t(G.standingTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(G.boardNoCrewTitle)}</Text>
          <Text style={styles.body}>{t(G.boardNoCrewBody)}</Text>
        </View>
      </StackScreen>
    );
  }

  if (failed) {
    return (
      <StackScreen title={t(G.standingTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(G.boardFailedTitle)}</Text>
          <Text style={styles.body}>{t(G.standingFailed)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      </StackScreen>
    );
  }

  if (!standing) {
    return (
      <StackScreen title={t(G.standingTitle)}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
          <Text style={styles.body}>{t(G.boardLoading)}</Text>
        </View>
      </StackScreen>
    );
  }

  const activeRules = CREW_ENFORCEMENT_KEYS.filter(
    (k: CrewEnforcementKey) => (standing.rules[k] ?? 0) > 0,
  );
  const open = openWarnings(standing);
  const removalDay = dayText(standing.removalAtMs, locale);

  return (
    <StackScreen title={t(G.standingTitle)}>
      {/* ── CE QUE CE CREW DEMANDE ──────────────────────────────────────── */}
      {activeRules.length === 0 ? (
        <View style={styles.block}>
          <Text style={styles.body}>{t(G.standingNoRules)}</Text>
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.kicker}>{t(G.standingRulesTitle)}</Text>
          {activeRules.map((k) => (
            <Text key={k} style={styles.line}>
              {enforcementLine(t, k, standing.rules[k] ?? 0)}
            </Text>
          ))}
        </View>
      )}

      {/* ── MES MESURES. Pas de masque : aucune vie privée contre soi-même ── */}
      <View style={styles.block}>
        <Text style={styles.kicker}>{t(G.standingMineTitle)}</Text>
        <Text style={styles.line}>{lastRunText(t, standing.my.lastRunAtMs, Date.now())}</Text>
        <Text style={styles.line}>{t(G.boardKm, { n: num(standing.my.distance28dKm) })}</Text>
        <Text style={styles.line}>{t(G.boardLoops, { n: num(standing.my.loops28d) })}</Text>
        {activeRules.includes('min_challenge_days') ? (
          <Text style={styles.line}>
            {t(G.boardChallengeDays, { n: num(standing.my.challengeDays) })}
          </Text>
        ) : null}
      </View>

      {/* ── AVERTISSEMENTS ──────────────────────────────────────────────── */}
      <View style={styles.block}>
        <Text style={styles.kicker}>{t(G.standingWarningsTitle)}</Text>
        {standing.warnings.length === 0 ? (
          <Text style={styles.body}>
            {activeRules.length === 0 ? t(G.standingNoWarning) : t(G.standingCompliant)}
          </Text>
        ) : (
          standing.warnings.map((w) => {
            const day = dayText(w.issuedAtMs, locale);
            return (
              <View key={w.id} style={styles.warning}>
                <Text style={styles.line}>{t(CREW_WARNING_KIND_E[w.kind])}</Text>
                {day ? (
                  <Text style={styles.body}>{t(G.standingWarningOn, { date: day })}</Text>
                ) : null}
                {w.note ? <Text style={styles.body}>{w.note}</Text> : null}
                {/* Levé n'est pas effacé : la ligne reste, avec son état. */}
                {w.resolvedAtMs !== null ? (
                  <Text style={styles.body}>{t(G.standingWarningResolved)}</Text>
                ) : w.kind === 'inactivity' ? (
                  <Text style={styles.body}>{t(G.standingWarningLift)}</Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      {/* ── À RISQUE : seulement si le retrait est ARMÉ, et avec SA date ──── */}
      {standing.atRisk && removalDay ? (
        <View style={styles.block}>
          <Text style={styles.risk}>{t(G.standingAtRisk, { date: removalDay })}</Text>
        </View>
      ) : null}
      {/* Un avertissement ouvert sans retrait armé : on le dit sans menace. */}
      {!standing.atRisk && open.length > 0 ? (
        <Text style={styles.body}>{t(G.standingWarningLift)}</Text>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.xs },
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  line: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: 22 },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  cta: { marginTop: spacing.sm },
  center: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },
  warning: { marginTop: spacing.sm, gap: 2 },
  // L15 : la phrase porte tout (« sans sortie avant le 15 septembre, tu
  // quitteras ce crew »). La couleur ne fait que la hiérarchiser.
  risk: { color: gameColors.danger, fontSize: fontSizes.md, lineHeight: 22 },
});
