/**
 * GRYD — MES PARCOURS (demande fondateur 21/07 : « il faut […] avoir un endroit
 * dans les paramètres pour la personnaliser »).
 *
 * L'écran répond à UNE question : comment GRYD choisit le parcours qu'il te
 * propose ? Trois blocs, dans cet ordre, parce que c'est l'ordre de la
 * confiance :
 *
 *   1. CE QUE GRYD A DÉDUIT — la transparence d'abord. On ne profile pas
 *      quelqu'un sans lui montrer ce qu'on a déduit de lui. Quand le profil est
 *      inconnu, l'écran le DIT (et distingue « pas assez de courses », que le
 *      serveur affirme, de « lecture impossible », qu'on ne peut qu'admettre).
 *   2. MES RÉGLAGES — ce que l'humain fixe lui-même. Un réglage manuel PRIME
 *      toujours sur l'apprentissage, et la note sous la distance le dit.
 *   3. APPRENTISSAGE — l'interrupteur et l'oubli. Couper est réel, pas
 *      décoratif : l'autorité est serveur (`route_preferences.learning_enabled`
 *      / `learn_from`, migration 0054, lus par `habits_inputs` en 0055), pas cet
 *      écran. Un client qui ignorerait l'interrupteur n'obtiendrait rien.
 *
 * §A : une décision, zéro CTA chartreuse (il n'y a rien à « valider » — chaque
 * tap est enregistré), textes courts non tronqués, détails au tap
 * (DisclosureCard). Le seul geste destructif — « oublier » — passe par une
 * confirmation et se présente en `danger`, jamais en couleur d'accent.
 *
 * ANTI PAY-TO-WIN : le sous-titre le dit en clair — un parcours proposé ne
 * donne ni point ni territoire. Aucun réglage d'ici n'entre dans un calcul.
 *
 * Esthétique : strictement celle de Confidentialité (features/privacy/ui) —
 * même kit de cards repliées, même rythme vertical, mêmes tokens.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ROUTE_SHAPES,
  ROUTE_TARGET_DISTANCE_CHOICES_M,
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  type HabitSlotKey,
  type RouteShape,
} from '@klaim/shared';
import {
  DisclosureCard,
  Note,
  SectionLabel,
  SelectPills,
  SwitchRow,
} from '../src/features/privacy/ui';
import { useRoutePrefs } from '../src/features/routePrefs/store';
import { useRouteHabits, type RouteHabits } from '../src/features/routePrefs/habits';
import { formatDistanceKm, formatPaceSKm } from '../src/features/routePrefs/format';
import { C } from '../src/i18n/catalog/parcours';
import { useLocale, useT } from '../src/i18n/store';
import { format } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';

/** Sections dépliables — une seule ouverte à la fois (patron Confidentialité). */
type SectionKey = 'distance' | 'shape';

/** Valeur de pastille pour la distance : « auto » ou les mètres en texte. */
const AUTO = 'auto';

/** Créneaux : clés de HABITS_SLOTS (game-rules), jamais un enum local parallèle. */
const SLOT_ENTRY: Record<HabitSlotKey, (typeof C)['slotDawn']> = {
  dawn: C.slotDawn,
  day: C.slotDay,
  evening: C.slotEvening,
  night: C.slotNight,
};

const SHAPE_ENTRY: Record<RouteShape, (typeof C)['shapeAny']> = {
  any: C.shapeAny,
  loop: C.shapeLoop,
  out_and_back: C.shapeOutAndBack,
};

/** Une ligne « libellé → valeur » du bloc de transparence. */
function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.factValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Bloc « ce que GRYD a déduit ». Toujours visible (pas au tap) : c'est
 * l'engagement de transparence, il ne se cache pas derrière un chevron.
 */
function HabitsCard({ habits }: { habits: RouteHabits }) {
  const t = useT();
  const locale = useLocale();
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Icon name="radar" size={20} color={colors.blanc} />
        <Text style={styles.cardTitle} numberOfLines={1}>
          {t(C.habitsTitle)}
        </Text>
      </View>
      {habits.state === 'loading' ? (
        <ActivityIndicator color={colors.gris} style={styles.loader} />
      ) : habits.state === 'known' ? (
        <View style={styles.facts}>
          <FactRow label={t(C.habitsDistance)} value={formatDistanceKm(habits.distanceM, locale)} />
          {habits.paceSKm !== null ? (
            <FactRow label={t(C.habitsPace)} value={formatPaceSKm(habits.paceSKm)} />
          ) : null}
          {habits.slot !== null ? (
            <FactRow label={t(C.habitsSlot)} value={t(SLOT_ENTRY[habits.slot])} />
          ) : null}
          <Note>{format(C.habitsRuns, { n: habits.runs }, locale)}</Note>
        </View>
      ) : (
        <Note>
          {habits.state === 'off'
            ? t(C.habitsOff)
            : habits.state === 'unknown'
              ? t(C.habitsUnknown)
              : t(C.habitsUnavailable)}
        </Note>
      )}
    </View>
  );
}

/** Ligne d'action destructive (oublier) — jamais en couleur d'accent. */
function DangerRow({
  label,
  detail,
  onPress,
}: {
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon name="sablier" size={20} color={gameColors.danger} />
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, styles.rowLabelDanger]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Icon name="chevron" size={16} color={colors.gris} />
    </Pressable>
  );
}

export default function MesParcoursScreen() {
  const t = useT();
  const locale = useLocale();
  const { ready, prefs, loading, save, forget, revision } = useRoutePrefs();
  const habits = useRouteHabits(prefs?.learningEnabled ?? null, revision);
  const [open, setOpen] = useState<SectionKey | null>(null);

  useEffect(() => {
    screen('route_prefs_settings');
  }, []);

  const toggle = (key: SectionKey) => setOpen((cur) => (cur === key ? null : key));

  /** Enregistre, et DIT quand ça n'a pas marché (jamais d'échec silencieux). */
  const commit = async (patch: Parameters<typeof save>[0]) => {
    const ok = await save(patch);
    if (!ok) Alert.alert(t(C.title), t(C.saveError));
  };

  const askForget = () => {
    haptics.light();
    Alert.alert(t(C.forgetConfirmTitle), t(C.forgetConfirmBody), [
      { text: t(C.cancel), style: 'cancel' },
      {
        text: t(C.forgetConfirmCta),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const ok = await forget();
            Alert.alert(t(C.title), ok ? t(C.forgetDone) : t(C.saveError));
          })();
        },
      },
    ]);
  };

  // ─── Pastilles de distance : « Auto » + le catalogue game-rules ───────────
  const distanceOptions = [
    { value: AUTO, label: t(C.distAuto) },
    ...ROUTE_TARGET_DISTANCE_CHOICES_M.map((m) => ({
      value: String(m),
      label: formatDistanceKm(m, locale),
    })),
  ];
  const current = prefs?.targetDistanceM ?? null;
  // Une valeur venue d'ailleurs (autre client, futur curseur) doit rester
  // VISIBLE et sélectionnée — sinon l'écran afficherait « Auto » alors qu'une
  // distance est bel et bien enregistrée.
  if (current !== null && !(ROUTE_TARGET_DISTANCE_CHOICES_M as readonly number[]).includes(current)) {
    distanceOptions.push({ value: String(current), label: formatDistanceKm(current, locale) });
  }

  const shapeOptions = ROUTE_SHAPES.map((s) => ({ value: s, label: t(SHAPE_ENTRY[s]) }));

  return (
    <StackScreen
      title={t(C.title)}
      icon="route"
      kicker={t(C.kicker)}
      subtitle={t(C.subtitle)}
      backHref="/parametres"
    >
      {!ready ? (
        <Note>{t(C.signedOut)}</Note>
      ) : loading ? (
        <ActivityIndicator color={colors.gris} style={styles.loader} />
      ) : !prefs ? (
        <Note>{t(C.prefsUnavailable)}</Note>
      ) : (
        <>
          <SectionLabel>{t(C.secDeduit)}</SectionLabel>
          <HabitsCard habits={habits} />

          <SectionLabel>{t(C.secReglages)}</SectionLabel>
          <DisclosureCard
            icon="cible"
            title={t(C.distTitle)}
            value={
              prefs.targetDistanceM === null
                ? t(C.distAuto)
                : formatDistanceKm(prefs.targetDistanceM, locale)
            }
            open={open === 'distance'}
            onToggle={() => toggle('distance')}
          >
            <SelectPills
              options={distanceOptions}
              value={prefs.targetDistanceM === null ? AUTO : String(prefs.targetDistanceM)}
              onChange={(v) => {
                void commit({ targetDistanceM: v === AUTO ? null : Number(v) });
              }}
            />
            <Note>
              {prefs.targetDistanceM !== null
                ? t(C.distNoteManual)
                : prefs.learningEnabled
                  ? t(C.distNoteAuto)
                  : t(C.distNoteAutoOff)}
            </Note>
          </DisclosureCard>

          <DisclosureCard
            icon="boucle_fermee"
            title={t(C.shapeTitle)}
            value={t(SHAPE_ENTRY[prefs.routeShape])}
            open={open === 'shape'}
            onToggle={() => toggle('shape')}
          >
            <SelectPills
              options={shapeOptions}
              value={prefs.routeShape}
              onChange={(v) => {
                void commit({ routeShape: v });
              }}
            />
          </DisclosureCard>

          <View style={styles.card}>
            <View style={styles.plainBody}>
              <SwitchRow
                title={t(C.hillsTitle)}
                value={prefs.avoidHills}
                onValueChange={(v) => {
                  void commit({ avoidHills: v });
                }}
              />
            </View>
          </View>

          <SectionLabel>{t(C.secApprentissage)}</SectionLabel>
          <View style={styles.card}>
            <View style={styles.plainBody}>
              <SwitchRow
                title={t(C.learnTitle)}
                value={prefs.learningEnabled}
                onValueChange={(v) => {
                  void commit({ learningEnabled: v });
                }}
              />
              <Note>{prefs.learningEnabled ? t(C.learnHint) : t(C.learnOffHint)}</Note>
            </View>
          </View>
          <DangerRow
            label={t(C.forgetLabel)}
            detail={t(C.forgetDetail)}
            onPress={askForget}
          />

          <Note>{t(C.footerNote)}</Note>
        </>
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  loader: { marginVertical: 24 },

  card: {
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: spacing.cardPadding - 2,
  },
  cardTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500', flexShrink: 1 },
  plainBody: { paddingHorizontal: spacing.cardPadding - 2, paddingVertical: 4 },

  facts: { paddingHorizontal: spacing.cardPadding - 2, paddingBottom: 16, paddingTop: 4 },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 36,
  },
  factLabel: { color: colors.gris, fontSize: fontSizes.sm, flexShrink: 1 },
  factValue: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Rangée >= 44 px de hauteur tactile (plancher a11y du projet).
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding - 2,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    marginBottom: 10,
  },
  rowText: { flex: 1 },
  rowLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
  rowLabelDanger: { color: gameColors.danger },
  rowDetail: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },
});
