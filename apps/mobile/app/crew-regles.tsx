/**
 * GRYD — B + C · « RÈGLES ET EXIGENCES » (route `/crew-regles`), spec §4.1 B/C.
 *
 * ══ POURQUOI LES TROIS BLOCS VIVENT SUR UN SEUL ÉCRAN ═════════════════════
 * La spec en décrivait deux (`/crew-regles` et `/crew-charte`). Les séparer
 * serait un PIÈGE, et il est mécanique : `crew_rules_set_2026` écrit charte,
 * exigences ET règles dans le même appel, avec `coalesce(p_requirements, '{}')`.
 * Un écran de charte qui n'enverrait que son texte remettrait donc à ZÉRO, EN
 * SILENCE, tous les seuils du crew. Un capitaine perdrait ses règles en
 * corrigeant une faute d'orthographe. Un seul écran, un seul brouillon, un seul
 * appel : `rulesPayload` (pur, testé) construit toujours les trois champs.
 *
 * ══ LA CONSÉQUENCE AVANT L'ARMEMENT (§4.1 B) ══════════════════════════════
 * Sous chaque règle active, l'écran dit combien de membres ne la respecteraient
 * pas AUJOURD'HUI, et combien n'ont pas partagé la mesure. « Un capitaine doit
 * voir la conséquence avant de l'armer, pas après. » Le calcul est PUR
 * (`enforcementImpact`) et se fait sur le tableau de suivi déjà lu : le serveur
 * n'a pas de RPC de simulation, et en écrire une côté client ferait diverger
 * deux calculs du même fait. Quand le tableau n'a pas pu être lu, l'écran le
 * DIT au lieu d'afficher un zéro rassurant.
 *
 * ══ LES TROIS GARDE-FOUS, PEINTS ET PAS SEULEMENT APPLIQUÉS ═══════════════
 * ① le retrait automatique est INACTIONNABLE tant que l'inactivité maximale est
 *    éteinte (`removalArmable`, miroir du refus `removal_without_warning`) ;
 * ② il ne vise jamais le capitaine ni son second, et ③ il attend qu'un
 *    avertissement soit lu ou vieux de `CREW_WARNING_GRACE_DAYS`. Les deux
 *    derniers sont serveur ; l'écran les ÉCRIT, parce qu'une règle qu'on arme
 *    sans en connaître les limites est une règle qu'on n'a pas vraiment choisie.
 *
 * ══ UN SEUL CTA CHARTREUSE (§A4) ══════════════════════════════════════════
 * « Enregistrer », dans la barre FIXE (hors ScrollView) : atteignable clavier
 * ouvert, comme sur `/crew-edit`. Il est grisé tant que `rulesBlock` rend un
 * motif, et ce motif s'affiche sous le champ concerné.
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  ACTIVITIES,
  CREW_CHARTER_MAX_CHARS,
  CREW_ENFORCEMENT_KEYS,
  CREW_MIN_CHALLENGE_DAYS_MAX,
  CREW_WARNING_GRACE_DAYS,
  colors,
  elevation,
  fontSizes,
  gameColors,
  radii,
  sizes,
  spacing,
  type Activity,
  type CrewEnforcementKey,
} from '@klaim/shared';
import {
  BAD_RULES_E,
  CREW_ACTIVITY_E,
  CREW_ENFORCEMENT_E,
  CREW_ENFORCEMENT_HELP_E,
  CREW_REQUIREMENT_E,
  G,
} from '../src/i18n/catalog/crewGestion';
import { C } from '../src/i18n/catalog/crew';
import { useLocale, useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { haptics } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Segmented } from '../src/ui/game/Segmented';
import { useRealCrew } from '../src/features/crew/real';
import { enforcementImpact } from '../src/features/crew/management/crewBoard2026';
import { dayText, num } from '../src/features/crew/management/crewManagementCopy';
import {
  detailOfRefusal,
  saveCrewRules,
  useCrewBoard,
  useCrewRules,
} from '../src/features/crew/management/crewManagementData';
import {
  draftOfRules,
  removalArmable,
  rulesBlock,
  rulesPayload,
  type RulesDraft2026,
} from '../src/features/crew/management/crewRules2026';

/**
 * Le PAS et le PLAFOND de chaque réglage. Un stepper plutôt qu'un champ libre :
 * un clavier numérique ouvre la porte à « 400 » journées de défi, que le
 * serveur refuserait après coup. Le plafond des journées de défi vient de
 * game-rules (`CREW_MIN_CHALLENGE_DAYS_MAX`), jamais d'un 7 écrit ici.
 */
const ENF_STEP: Readonly<Record<CrewEnforcementKey, { step: number; max: number }>> = {
  min_weekly_outings: { step: 1, max: 7 },
  min_challenge_days: { step: 1, max: CREW_MIN_CHALLENGE_DAYS_MAX },
  max_inactivity_days: { step: 7, max: 90 },
  auto_remove_after_days: { step: 7, max: 90 },
};

export default function CrewReglesRoute() {
  const t = useT();
  const locale = useLocale();
  const { session } = useSession();
  const crew = useRealCrew();
  const crewId = crew.crew?.id ?? null;
  const { loading, failed, refusal, data: rules, reload } = useCrewRules(crewId);
  /**
   * Le tableau de suivi sert UNIQUEMENT à la conséquence. Il peut échouer sans
   * empêcher de régler : l'écran dit alors qu'il ne sait pas, et le capitaine
   * garde la main. Faire dépendre le réglage d'une lecture annexe serait pire.
   */
  const board = useCrewBoard();

  const [draft, setDraft] = useState<RulesDraft2026 | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rules) setDraft(draftOfRules(rules));
  }, [rules]);

  const block = rules && draft ? rulesBlock(rules, draft) : 'pristine';
  const charterDraft = draft?.charter ?? '';
  const charterLength = charterDraft.trim().length;
  const willBump = !!rules && charterDraft.trim() !== (rules.charter ?? '').trim();

  const impacts = useMemo(() => {
    if (!draft || !board.data) return null;
    const now = Date.now();
    const out = new Map<CrewEnforcementKey, ReturnType<typeof enforcementImpact>>();
    for (const key of CREW_ENFORCEMENT_KEYS) {
      out.set(key, enforcementImpact(board.data.rows, key, draft.enforcement[key], now));
    }
    return out;
  }, [draft, board.data]);

  async function onSave() {
    if (!draft || block !== null || saving) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    const out = await saveCrewRules(rulesPayload(draft));
    setSaving(false);
    if (out.kind === 'ok') {
      haptics.success();
      const bumped = out.data.bumped === true;
      const version = typeof out.data.charterVersion === 'number' ? out.data.charterVersion : 1;
      setNotice(bumped ? t(G.rulesSavedBumped, { n: version }) : t(G.rulesSaved));
      // On RELIT : la version de charte et l'horodatage viennent du serveur.
      reload();
      return;
    }
    haptics.error();
    if (out.kind === 'failed') {
      setError(t(G.rulesSaveFailed));
      return;
    }
    if (out.kind === 'unsupported') {
      setError(t(G.refusedUnsupported));
      return;
    }
    // `bad_rules` porte TOUJOURS son `detail` : on dit LEQUEL des dix refus,
    // jamais « réglage refusé » tout court.
    const detail = detailOfRefusal(out);
    setError(
      detail
        ? t(BAD_RULES_E[detail])
        : out.reason === 'forbidden'
          ? t(G.rulesFounderOnly)
          : t(G.refusedGeneric),
    );
  }

  if (!session) {
    return (
      <StackScreen title={t(G.rulesTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(G.boardSignedOut)}</Text>
        </View>
      </StackScreen>
    );
  }

  if (refusal === 'not_found' || (!crew.loading && !crew.loadFailed && crewId === null)) {
    return (
      <StackScreen title={t(G.rulesTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(G.boardNoCrewTitle)}</Text>
          <Text style={styles.body}>{t(G.boardNoCrewBody)}</Text>
        </View>
      </StackScreen>
    );
  }

  if (failed || crew.loadFailed) {
    return (
      <StackScreen title={t(G.rulesTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(G.boardFailedTitle)}</Text>
          <Text style={styles.body}>{t(G.boardFailedBody)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      </StackScreen>
    );
  }

  if (!rules || !draft) {
    return (
      <StackScreen title={t(G.rulesTitle)}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
          <Text style={styles.body}>{t(G.boardLoading)}</Text>
        </View>
      </StackScreen>
    );
  }

  const saveBlocked = block !== null || saving;
  const updated = dayText(rules.updatedAtMs, locale);

  return (
    <StackScreen
      title={t(G.rulesTitle)}
      kicker={t(G.rulesKicker)}
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(G.rulesSave)}
          accessibilityState={{ disabled: saveBlocked, busy: saving }}
          disabled={saveBlocked}
          onPress={() => void onSave()}
          hitSlop={8}
          style={({ pressed }) => [styles.headerSave, pressed && styles.dim]}
        >
          <Text style={[styles.headerSaveText, saveBlocked && styles.headerSaveOff]}>
            {t(G.rulesSave)}
          </Text>
        </Pressable>
      }
    >
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* ── BLOC 1 · LES CONDITIONS D'ENTRÉE ───────────────────────────────── */}
      <Text style={styles.section}>{t(G.rulesEntryTitle)}</Text>
      <Stepper
        label={t(CREW_REQUIREMENT_E.min_level)}
        value={draft.requirements.min_level}
        step={1}
        max={50}
        onChange={(min_level) =>
          setDraft({ ...draft, requirements: { ...draft.requirements, min_level } })
        }
      />
      <Stepper
        label={t(CREW_REQUIREMENT_E.min_distance_km_28d)}
        value={draft.requirements.min_distance_km_28d}
        step={5}
        max={400}
        unit="km"
        onChange={(min_distance_km_28d) =>
          setDraft({ ...draft, requirements: { ...draft.requirements, min_distance_km_28d } })
        }
      />
      <Stepper
        label={t(CREW_REQUIREMENT_E.min_active_days_28d)}
        value={draft.requirements.min_active_days_28d}
        step={1}
        max={28}
        onChange={(min_active_days_28d) =>
          setDraft({ ...draft, requirements: { ...draft.requirements, min_active_days_28d } })
        }
      />
      {/*
        LA COMMUNE N'EST PAS UN CHAMP LIBRE : c'est celle DU CREW, ou rien. Un
        sélecteur de commune arbitraire laisserait poser une exigence que le
        crew lui-même ne remplit pas, et le serveur refuse déjà toute commune
        absente de `city_zones` (`unknown_city`).
      */}
      <Toggle
        label={t(CREW_REQUIREMENT_E.city_id)}
        on={draft.requirements.city_id !== null}
        disabled={crew.crew === null}
        onChange={(on) =>
          setDraft({
            ...draft,
            requirements: { ...draft.requirements, city_id: on ? (crew.crew?.cityId ?? null) : null },
          })
        }
      />
      <View style={styles.field}>
        <Text style={styles.label}>{t(CREW_REQUIREMENT_E.activity)}</Text>
        <Segmented
          tone="surface"
          accessibilityLabel={t(CREW_REQUIREMENT_E.activity)}
          value={draft.requirements.activity ?? 'none'}
          onChange={(id: string) =>
            setDraft({
              ...draft,
              requirements: { ...draft.requirements, activity: id === 'none' ? null : id },
            })
          }
          options={[
            { id: 'none', label: t(G.rulesNone) },
            ...ACTIVITIES.map((a: Activity) => ({ id: a, label: t(CREW_ACTIVITY_E[a]) })),
          ]}
        />
      </View>
      <Text style={styles.hint}>{t(G.rulesEntryHint)}</Text>

      {/* ── BLOC 2 · LES RÈGLES APPLIQUÉES ─────────────────────────────────── */}
      <Text style={styles.section}>{t(G.rulesEnforceTitle)}</Text>
      {CREW_ENFORCEMENT_KEYS.map((key) => {
        const locked = key === 'auto_remove_after_days' && !removalArmable(draft);
        const impact = impacts?.get(key) ?? null;
        return (
          <View key={key}>
            <Stepper
              label={t(CREW_ENFORCEMENT_E[key])}
              value={draft.enforcement[key]}
              step={ENF_STEP[key].step}
              max={ENF_STEP[key].max}
              unit={key === 'min_weekly_outings' ? undefined : 'j'}
              disabled={locked}
              onChange={(v) =>
                setDraft({ ...draft, enforcement: { ...draft.enforcement, [key]: v } })
              }
            />
            <Text style={styles.hint}>{t(CREW_ENFORCEMENT_HELP_E[key])}</Text>
            {locked ? <Text style={styles.hint}>{t(G.rulesRemovalLocked)}</Text> : null}
            {/* LA CONSÉQUENCE, sous le réglage qui la produit, et seulement si
                le réglage est armé : une règle éteinte n'a pas de conséquence. */}
            {draft.enforcement[key] > 0 && !locked ? (
              board.failed ? (
                <Text style={styles.hint}>{t(G.rulesImpactUnavailable)}</Text>
              ) : impact ? (
                <>
                  <Text style={styles.impact}>{t(G.rulesImpact, { n: impact.wouldWarn })}</Text>
                  {impact.unknown > 0 ? (
                    <Text style={styles.hint}>
                      {t(G.rulesImpactUnknown, { n: impact.unknown })}
                    </Text>
                  ) : null}
                </>
              ) : null
            ) : null}
          </View>
        );
      })}
      <Text style={styles.hint}>{t(G.rulesEnforceHint)}</Text>
      <Text style={styles.hint}>{t(G.rulesRemovalGuard, { n: CREW_WARNING_GRACE_DAYS })}</Text>
      {block === 'removal_without_warning' ? (
        <Text style={styles.invalid}>{t(BAD_RULES_E.removal_without_warning)}</Text>
      ) : null}
      {block === 'challenge_days_over_max' ? (
        <Text style={styles.invalid}>{t(BAD_RULES_E.challenge_days_over_max)}</Text>
      ) : null}

      {/* ── BLOC 3 · LA CHARTE ─────────────────────────────────────────────── */}
      <Text style={styles.section}>{t(G.charterTitle)}</Text>
      <Text style={styles.hint}>{t(G.charterHint)}</Text>
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{t(G.charterTitle)}</Text>
          <Text style={styles.counter}>
            {t(G.charterCount, { n: charterLength, max: CREW_CHARTER_MAX_CHARS })}
          </Text>
        </View>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={charterDraft}
          onChangeText={(charter) => setDraft({ ...draft, charter })}
          placeholder={t(G.charterPlaceholder)}
          placeholderTextColor={colors.gris}
          multiline
          maxLength={CREW_CHARTER_MAX_CHARS}
          accessibilityLabel={t(G.charterTitle)}
        />
        {block === 'charter_too_long' ? (
          <Text style={styles.invalid}>{t(BAD_RULES_E.charter_too_long)}</Text>
        ) : null}
        {rules.charter === null ? (
          <Text style={styles.hint}>{t(G.charterNoneYet)}</Text>
        ) : updated ? (
          <Text style={styles.hint}>
            {t(G.charterVersionLine, { n: rules.charterVersion, date: updated })}
          </Text>
        ) : null}
        {/* Le prix social du geste, dit AVANT : changer le texte redemandera à
            tout le monde de l'accepter. Un changement de seuil, lui, ne fait
            jamais monter la version (§6.3). */}
        {willBump && charterLength > 0 ? (
          <Text style={styles.hint}>{t(G.charterWillBump)}</Text>
        ) : null}
      </View>

      {block === 'pristine' ? <Text style={styles.hint}>{t(G.rulesBlockPristine)}</Text> : null}
      <Text style={styles.hint}>{t(G.rulesFounderOnly)}</Text>
    </StackScreen>
  );
}

/**
 * UN RÉGLAGE NUMÉRIQUE. Zéro s'affiche « éteint » ou « aucune », JAMAIS « 0 » :
 * zéro n'est pas un seuil de zéro, c'est l'absence de règle (§6.4), et les deux
 * ne se ressemblent pas à la lecture.
 *
 * Les deux boutons font 44 pt (L4) et disent ce qu'ils font à VoiceOver, avec
 * le nom du réglage : « Augmenter · Inactivité maximale » se comprend seul, un
 * « plus » nu ne se comprend jamais.
 */
function Stepper({
  label,
  value,
  step,
  max,
  unit,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  max: number;
  unit?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const t = useT();
  const shown = value <= 0 ? t(G.rulesOff) : `${num(value)}${unit ? ` ${unit}` : ''}`;
  const bump = (delta: number) => {
    if (disabled) return;
    haptics.light();
    onChange(Math.max(0, Math.min(max, value + delta)));
  };
  return (
    <View style={[styles.stepper, disabled && styles.stepperOff]}>
      <Text style={[styles.label, styles.stepperLabel]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${num(Math.max(0, value - step))}`}
        accessibilityState={{ disabled: disabled || value <= 0 }}
        disabled={disabled || value <= 0}
        onPress={() => bump(-step)}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.dim]}
      >
        <Text style={styles.stepGlyph}>-</Text>
      </Pressable>
      <Text style={styles.stepValue}>{shown}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${num(Math.min(max, value + step))}`}
        accessibilityState={{ disabled: disabled || value >= max }}
        disabled={disabled || value >= max}
        onPress={() => bump(step)}
        style={({ pressed }) => [styles.stepBtn, pressed && styles.dim]}
      >
        <Text style={styles.stepGlyph}>+</Text>
      </Pressable>
    </View>
  );
}

/** Un oui/non. La sélection est portée par la bordure ET le mot, jamais par la couleur seule (L15). */
function Toggle({
  label,
  on,
  disabled = false,
  onChange,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        haptics.light();
        onChange(!on);
      }}
      style={({ pressed }) => [styles.stepper, disabled && styles.stepperOff, pressed && styles.dim]}
    >
      <Text style={[styles.label, styles.stepperLabel]}>{label}</Text>
      <Text style={[styles.stepValue, on && styles.stepValueOn]}>
        {on ? t(C.dAcceptCta) : t(G.rulesNone)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  cta: { marginTop: spacing.sm },
  center: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },
  dim: { opacity: 0.6 },

  section: {
    marginTop: spacing.xl,
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  field: { marginTop: spacing.lg, gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  counter: { color: colors.gris, fontSize: fontSizes.xs },
  hint: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20, marginTop: spacing.xxs },
  impact: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20, marginTop: spacing.xxs },
  invalid: { color: gameColors.danger, fontSize: fontSizes.sm, lineHeight: 20 },

  stepper: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
  },
  stepperOff: { opacity: 0.45 },
  stepperLabel: { flex: 1 },
  stepBtn: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: { color: colors.blanc, fontSize: fontSizes.lg },
  stepValue: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    minWidth: 72,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stepValueOn: { fontWeight: '700' },

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
  multiline: { minHeight: 140, textAlignVertical: 'top' },

  notice: { marginTop: spacing.lg, color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  error: { marginTop: spacing.lg, color: gameColors.danger, fontSize: fontSizes.sm, lineHeight: 20 },

  headerSave: { minHeight: sizes.touchTarget, justifyContent: 'center', paddingLeft: spacing.sm },
  headerSaveText: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '700' },
  headerSaveOff: { color: colors.gris },
});
