/**
 * GRYD — H · « DEMANDER À REJOINDRE » (route `/crew-rejoindre?crewId=…`),
 * spec §4.2 H.
 *
 * ══ CE QU'IL REMPLACE, ET POURQUOI IL EXISTE ══════════════════════════════
 * La fiche publique appelait `crew_join_intent` (0083) au tap : une écriture
 * qui insère `(crew_id, user_id)` et RIEN d'autre. Le mot du candidat n'avait
 * aucun chemin d'écriture (trou ① de la spec : `crew_join_requests` lisait
 * fidèlement un `message` que personne n'écrivait), les exigences n'existaient
 * pas, et la charte non plus. `crew_apply_2026` (0188) écrit les trois.
 *
 * ══ LA PHRASE DU FONDATEUR : « IL TE MANQUE 2 KM » ════════════════════════
 * Quand un critère manque, l'écran dit CE QUI manque ET DE COMBIEN. Jamais
 * « tu n'es pas éligible » tout seul, qui ne dit ni quoi ni de combien et ne
 * laisse aucune suite possible. `missingLine` (pur, testé) tient cette phrase,
 * et le serveur seul fournit les chiffres : ils ne concernent QUE l'appelant,
 * le capitaine n'en reçoit jamais le détail (doctrine 0083 §6).
 *
 * ══ QUATRE ÉTATS, ET LE QUATRIÈME EST CELUI QU'ON OUBLIE ══════════════════
 * pas connecté · éligible · non éligible (avec la liste) · VÉRIFICATION
 * IMPOSSIBLE. Le dernier ne se replie SURTOUT PAS sur « tu n'es pas éligible » :
 * « on ne sait pas » n'est pas une réponse, et transformer un échec réseau en
 * refus personnel est le mensonge le plus facile de cet écran.
 *
 * ══ LE BOUTON N'EST JAMAIS PEINT ACTIF PUIS REFUSÉ (§A4) ══════════════════
 * Il est explicitement inactif, avec sa raison JUSTE À CÔTÉ. Deux raisons
 * possibles, et elles ne se ressemblent pas : il te manque une condition, ou tu
 * n'as pas encore accepté la charte.
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CREW_APPLICATION_MESSAGE_MAX,
  colors,
  elevation,
  fontSizes,
  gameColors,
  radii,
  sizes,
  spacing,
} from '@klaim/shared';
import { G } from '../src/i18n/catalog/crewGestion';
import { C } from '../src/i18n/catalog/crew';
import { C as CRoute } from '../src/i18n/catalog/route';
import { useLocale, useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { haptics } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import {
  CrewCharterBlock,
  CrewEnforcementBlock,
  CrewRequirementsBlock,
} from '../src/features/crew/management/CrewRulesBlocks';
import { dayText, missingLine } from '../src/features/crew/management/crewManagementCopy';
import {
  applyToCrew,
  missingOfRefusal,
  useCrewEligibility,
  useCrewRules,
} from '../src/features/crew/management/crewManagementData';
import type { MissingRequirement2026 } from '../src/features/crew/management/crewRules2026';

export default function CrewRejoindreRoute() {
  const t = useT();
  const locale = useLocale();
  const { session } = useSession();
  const params = useLocalSearchParams<{ crewId?: string }>();
  const crewId =
    typeof params.crewId === 'string' && params.crewId.length > 0 ? params.crewId : null;

  const rules = useCrewRules(crewId);
  const eligibility = useCrewEligibility(crewId);
  /**
   * LE QUATRIÈME ÉTAT, nommé. Il vaut `true` quand la lecture a échoué OU quand
   * le serveur a refusé pour une raison qui n'est pas une réponse sur mes
   * conditions. Dans les deux cas, on ne SAIT PAS : on ne dit donc pas « non ».
   */
  const eligibilityFailed = eligibility.failed || eligibility.refusal !== null;

  const [message, setMessage] = useState('');
  const [charterAccepted, setCharterAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<'applied' | 'joined' | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Ce que le serveur a dit manquer AU MOMENT DE L'ENVOI (§6.3, `not_eligible`). */
  const [serverMissing, setServerMissing] = useState<readonly MissingRequirement2026[]>([]);

  const charterRequired = rules.data?.charter !== null && rules.data !== null;
  const missing = eligibility.data?.missing ?? [];
  const blockedByMissing = !eligibilityFailed && missing.length > 0;
  const blockedByCharter = charterRequired && !charterAccepted;

  const onSend = useCallback(async () => {
    if (!crewId || busy) return;
    setBusy(true);
    setError(null);
    setServerMissing([]);
    // La VERSION de charte vient du serveur, jamais d'un compteur local : une
    // version périmée est refusée (`charter_stale`), et c'est ce qui empêche
    // d'enregistrer un consentement à un texte déjà remplacé.
    const version = rules.data?.charterVersion ?? eligibility.data?.charterVersion ?? null;
    const out = await applyToCrew(crewId, message, charterRequired ? version : null);
    setBusy(false);
    if (out.kind === 'ok') {
      haptics.success();
      setDone(out.effect === 'joined' ? 'joined' : 'applied');
      return;
    }
    haptics.error();
    if (out.kind === 'failed') {
      setError(t(G.actionFailed));
      return;
    }
    if (out.kind === 'unsupported') {
      setError(t(G.refusedUnsupported));
      return;
    }
    if (out.reason === 'not_eligible') {
      // Le serveur a la liste À JOUR : elle prime sur la lecture d'il y a
      // trente secondes, et elle est CHIFFRÉE.
      setServerMissing(missingOfRefusal(out));
      setError(t(G.applyBlockedMissing));
      return;
    }
    const days = typeof out.data.daysLeft === 'number' ? out.data.daysLeft : null;
    const rejoin =
      typeof out.data.rejoinAllowedAt === 'string'
        ? dayText(Date.parse(out.data.rejoinAllowedAt), locale)
        : null;
    setError(
      out.reason === 'cooldown'
        ? rejoin
          ? t(G.refusedRejoin, { date: rejoin })
          : t(G.refusedCooldown, { n: days ?? 0 })
        : out.reason === 'pending'
          ? t(G.refusedPending)
          : out.reason === 'closed'
            ? t(G.refusedClosed)
            : out.reason === 'full'
              ? t(G.refusedFull)
              : out.reason === 'already_in_crew'
                ? t(G.refusedAlreadyInCrew)
                : out.reason === 'dead_crew'
                  ? t(G.refusedDeadCrew)
                  : out.reason === 'rate_limited'
                    ? t(G.refusedRateLimited, {
                        n: typeof out.data.max === 'number' ? out.data.max : 0,
                      })
                    : out.reason === 'charter_stale'
                      ? t(G.refusedCharterStale)
                      : out.reason === 'not_found'
                        ? t(G.refusedNotFound)
                        : t(G.refusedGeneric),
    );
    // La charte a bougé : on relit, et on redemande l'acceptation. Réutiliser
    // la case cochée sur l'ancien texte serait un consentement volé.
    if (out.reason === 'charter_stale') {
      setCharterAccepted(false);
      rules.reload();
    }
  }, [crewId, busy, message, charterRequired, rules, eligibility.data, locale, t]);

  if (!session) {
    return (
      <StackScreen title={t(G.applyTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(G.applySignedOut)}</Text>
        </View>
      </StackScreen>
    );
  }

  if (!crewId) {
    return (
      <StackScreen title={t(G.applyTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.dNotFound)}</Text>
        </View>
      </StackScreen>
    );
  }

  // ── LE GESTE EST FAIT : on le dit, et on ne promet rien de plus ───────────
  if (done !== null) {
    return (
      <StackScreen title={t(G.applyTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>
            {t(done === 'joined' ? G.applySentJoined : G.applySentApplied)}
          </Text>
          {done === 'applied' ? <Text style={styles.body}>{t(G.applyNoNotice)}</Text> : null}
          <View style={styles.cta}>
            <Button label={t(CRoute.back)} onPress={() => router.back()} />
          </View>
        </View>
      </StackScreen>
    );
  }

  if (rules.loading && !rules.data) {
    return (
      <StackScreen title={t(G.applyTitle)}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
          <Text style={styles.body}>{t(G.applyChecking)}</Text>
        </View>
      </StackScreen>
    );
  }

  const shownMissing = serverMissing.length > 0 ? serverMissing : missing;

  return (
    <StackScreen title={t(G.applyTitle)}>
      {/* ── ÉLIGIBILITÉ ─────────────────────────────────────────────────── */}
      {eligibility.loading && !eligibility.data ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
          <Text style={styles.body}>{t(G.applyChecking)}</Text>
        </View>
      ) : eligibilityFailed ? (
        <View style={styles.block}>
          <Text style={styles.title}>{t(G.applyCheckFailedTitle)}</Text>
          <Text style={styles.body}>{t(G.applyCheckFailedBody)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={eligibility.reload} loading={eligibility.loading} />
          </View>
        </View>
      ) : shownMissing.length === 0 ? (
        <View style={styles.block}>
          <Text style={styles.ok}>{t(G.applyEligible)}</Text>
        </View>
      ) : (
        <View style={styles.block}>
          {shownMissing.map((m) => (
            <Text key={m.key} style={styles.missing}>
              {missingLine(t, m)}
            </Text>
          ))}
          {/* La porte humaine, DITE sous la liste : sans elle, un seuil se lit
              comme un mur définitif (leçon ② de Clash). */}
          <Text style={styles.note}>{t(G.applyInvitesBypass)}</Text>
        </View>
      )}

      {/* ── CE QUE CE CREW DEMANDE, ET SES RÈGLES ───────────────────────── */}
      {rules.data ? (
        <>
          <CrewRequirementsBlock rules={rules.data} showBypass={false} />
          <CrewEnforcementBlock rules={rules.data} />
          {/* La charte est DÉPLIÉE ici : on ne coche pas « j'ai lu » sous un
              texte replié. C'est toute la différence entre un consentement et
              une case à cocher. */}
          <CrewCharterBlock rules={rules.data} defaultOpen />
        </>
      ) : rules.failed ? (
        <Text style={styles.note}>{t(G.publicRulesUnread)}</Text>
      ) : null}

      {/* ── L'ACCEPTATION DE LA CHARTE ──────────────────────────────────── */}
      {charterRequired ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: charterAccepted }}
          accessibilityLabel={t(G.applyCharterCheckbox)}
          onPress={() => {
            haptics.light();
            setCharterAccepted((v) => !v);
          }}
          style={styles.checkbox}
        >
          {/* La case porte un GLYPHE et un texte : la couleur seule ne dit
              jamais un état (L15). */}
          <Text style={[styles.box, charterAccepted && styles.boxOn]}>
            {charterAccepted ? 'X' : ' '}
          </Text>
          <Text style={styles.checkboxLabel}>{t(G.applyCharterCheckbox)}</Text>
        </Pressable>
      ) : null}
      {charterRequired ? <Text style={styles.note}>{t(G.charterRefuseNote)}</Text> : null}

      {/* ── LE MOT DU CANDIDAT — il s'écrit ENFIN ───────────────────────── */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{t(G.applyMessageLabel)}</Text>
          <Text style={styles.counter}>
            {t(G.charterCount, { n: message.length, max: CREW_APPLICATION_MESSAGE_MAX })}
          </Text>
        </View>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={message}
          onChangeText={setMessage}
          placeholder={t(G.applyMessagePlaceholder)}
          placeholderTextColor={colors.gris}
          multiline
          maxLength={CREW_APPLICATION_MESSAGE_MAX}
          accessibilityLabel={t(G.applyMessageLabel)}
        />
      </View>

      {/* ── L'ACTION : unique, chartreuse, jamais peinte active puis refusée ─ */}
      <View style={styles.cta}>
        <Button
          label={t(G.applyCta)}
          onPress={() => void onSend()}
          loading={busy}
          disabled={busy || blockedByMissing || blockedByCharter || eligibilityFailed}
          analyticsId="crew_apply_2026"
        />
      </View>
      {blockedByMissing ? <Text style={styles.note}>{t(G.applyBlockedMissing)}</Text> : null}
      {blockedByCharter ? <Text style={styles.note}>{t(G.applyBlockedCharter)}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.xs },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  note: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20, marginTop: spacing.xs },
  cta: { marginTop: spacing.lg },
  center: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },

  ok: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: 22 },
  // L15 : le manque est porté par la PHRASE (« il te manque 2 km »), la couleur
  // ne fait que la hiérarchiser. Lue sans couleur, la ligne dit encore tout.
  missing: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: 22 },

  field: { marginTop: spacing.lg, gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  counter: { color: colors.gris, fontSize: fontSizes.xs },
  input: {
    backgroundColor: elevation.raised,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    color: colors.blanc,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: sizes.touchTarget,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },

  checkbox: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
  },
  box: {
    width: 28,
    height: 28,
    lineHeight: 28,
    textAlign: 'center',
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    color: colors.noir,
  },
  boxOn: { backgroundColor: colors.chartreuse, borderColor: colors.chartreuse },
  checkboxLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.md, lineHeight: 22 },

  error: { marginTop: spacing.md, color: gameColors.danger, fontSize: fontSizes.sm, lineHeight: 20 },
});
