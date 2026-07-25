/**
 * GRYD — MES PARCOURS. La page qui répond à UNE question : comment GRYD choisit
 * le parcours qu'il te propose ?
 *
 * ─── ORDRE DE COMPOSITION ─────────────────────────────────────────────────────
 *   1. CE QUE GRYD A DÉDUIT — la transparence d'abord. On ne profile pas
 *      quelqu'un sans lui montrer ce qu'on a déduit de lui ;
 *   2. MES RÉGLAGES — ce que l'humain fixe lui-même. Un réglage manuel PRIME
 *      toujours sur l'apprentissage, et la note sous la distance le dit ;
 *   3. APPRENTISSAGE — l'interrupteur et l'oubli. Couper est réel : l'autorité
 *      est serveur (`route_preferences.learning_enabled` / `learn_from`), pas cet
 *      écran. Un client qui ignorerait l'interrupteur n'obtiendrait rien.
 *
 * ─── LES QUATRE ÉTATS, NOMMÉS SÉPARÉMENT ──────────────────────────────────────
 * Ils étaient branchés sur le MAUVAIS SIGNAL : l'écran testait `!ready`, puis
 * `loading`, puis `!prefs` — trois booléens qui ne savent pas distinguer « pas
 * de backend » de « lecture ratée ». Le store expose EXPRÈS un `status` à quatre
 * valeurs (`routePrefs/store.ts`) ; c'est lui qui décide maintenant :
 *   ① `unavailable` → pas de compte : ces réglages vivent sur le compte, on le
 *      dit, et on ne peint aucun contrôle qui n'irait nulle part ;
 *   ② vide          → il n'y a pas d'état « vide » ici : un compte a toujours
 *      des réglages (le serveur en renvoie les défauts). C'est `unknown` côté
 *      HABITUDES qui joue ce rôle, et il est rendu explicitement ;
 *   ③ `error`       → sa propre copie ET un « Réessayer ». C'était un CUL-DE-SAC :
 *      une phrase d'échec, aucune action, il fallait quitter l'écran ;
 *   ④ `loading`     → une LIGNE grise, plus un `ActivityIndicator` plein écran.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · LES DEUX SPINNERS PLEIN ÉCRAN (page et card d'habitudes) : un spinner
 *   n'affirme rien et n'apprend rien ; une ligne grise dit ce qui est en train
 *   d'être lu.
 * · LES CADRES PERMANENTS des cards et de la ligne « oublier » (règle 80/20).
 * · LES SEPT `numberOfLines={1}` NUS (libellés et valeurs de faits, ligne
 *   destructive) : en allemand « Bevorzugte Distanz » et « Zurückgelegte Läufe »
 *   coupaient en « … ».
 * · La ligne destructive locale, qui redessinait `ListRow tone="danger"`.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ──────────────────────────────────────────────
 * · L'échec d'ENREGISTREMENT reste une `Alert` native. Raison technique : il
 *   n'existe aucun composant de toast dans `src/ui`, et en créer un
 *   reviendrait à ajouter une primitive partagée — hors périmètre de ce lot.
 *   La confirmation destructive, elle, doit rester native (elle est bloquante).
 * · Aucun CTA chartreuse sur cet écran, et c'est voulu : il n'y a rien à
 *   « valider », chaque tap est enregistré. Le seul bouton plein est le
 *   « Réessayer » d'un état d'échec, en ghost.
 *
 * ANTI PAY-TO-WIN : le sous-titre le dit en clair — un parcours proposé ne donne
 * ni point ni territoire. Aucun réglage d'ici n'entre dans un calcul.
 */
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  ROUTE_SHAPES,
  ROUTE_TARGET_DISTANCE_CHOICES_M,
  colors,
  elevation,
  fontSizes,
  radii,
  sizes,
  spacing,
  typography,
  type HabitSlotKey,
  type RouteShape,
} from '@klaim/shared';
import { DisclosureCard, Note, SelectPills, SwitchRow } from '../src/features/privacy/ui';
import { useRoutePrefs } from '../src/features/routePrefs/store';
import { useRouteHabits, type RouteHabits } from '../src/features/routePrefs/habits';
import { formatDistanceKm, formatPaceSKm } from '../src/features/routePrefs/format';
import { C } from '../src/i18n/catalog/parcours';
import { useLocale, useT } from '../src/i18n/store';
import { format } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Button } from '../src/ui/Button';
import { IconPlate } from '../src/ui/Card';
import { ListRow } from '../src/ui/ListRow';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';

/** Sections dépliables — une seule ouverte à la fois. */
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
      {/* Aucun `numberOfLines` : ces libellés s'allongent beaucoup en allemand. */}
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

/**
 * Bloc « ce que GRYD a déduit ». Toujours visible (pas au tap) : c'est
 * l'engagement de transparence, il ne se cache pas derrière un chevron.
 *
 * Les QUATRE issues du profil sont nommées ici, y compris `unknown` — qui était
 * la seule garde IMPLICITE de l'écran (« pas encore assez de courses » tombait
 * dans un `else` de dernier recours, indistinguable d'une panne).
 */
function HabitsCard({ habits }: { habits: RouteHabits }) {
  const t = useT();
  const locale = useLocale();
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <IconPlate icon="radar" size="md" color={colors.gris} />
        <Text style={styles.cardTitle}>{t(C.habitsTitle)}</Text>
      </View>
      <View style={styles.cardBody}>
        {habits.state === 'loading' ? (
          <Text style={styles.stateInline}>{t(C.habitsLoadingLine)}</Text>
        ) : habits.state === 'known' ? (
          <>
            <FactRow label={t(C.habitsDistance)} value={formatDistanceKm(habits.distanceM, locale)} />
            {habits.paceSKm !== null ? (
              <FactRow label={t(C.habitsPace)} value={formatPaceSKm(habits.paceSKm)} />
            ) : null}
            {habits.slot !== null ? (
              <FactRow label={t(C.habitsSlot)} value={t(SLOT_ENTRY[habits.slot])} />
            ) : null}
            <Note>{format(C.habitsRuns, { n: habits.runs }, locale)}</Note>
          </>
        ) : habits.state === 'off' ? (
          <Note>{t(C.habitsOff)}</Note>
        ) : habits.state === 'unknown' ? (
          /* Le serveur AFFIRME qu'il n'a pas assez de courses — ce n'est pas la
             même chose que « je n'ai pas pu lire », juste en dessous. */
          <Note>{t(C.habitsUnknown)}</Note>
        ) : (
          <Note>{t(C.habitsUnavailable)}</Note>
        )}
      </View>
    </View>
  );
}

export default function MesParcoursScreen() {
  const t = useT();
  const locale = useLocale();
  const { prefs, status, save, forget, revision, reload } = useRoutePrefs();
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
      {status === 'loading' ? (
        /* ④ LECTURE — une ligne grise, jamais un spinner plein écran. */
        <Text style={styles.stateInline}>{t(C.loadingLine)}</Text>
      ) : status === 'unavailable' ? (
        /* ① PAS DE COMPTE — ces réglages vivent sur le compte, pas ici. */
        <Text style={styles.stateInline}>{t(C.signedOut)}</Text>
      ) : status === 'error' || prefs === null ? (
        /* ③ ÉCHEC — distinct du vide, avec sa copie ET sa sortie. */
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>{t(C.loadFailedTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.prefsUnavailable)}</Text>
          <View style={styles.stateCta}>
            <Button variant="ghost" size="md" label={t(C.retry)} onPress={reload} />
          </View>
        </View>
      ) : (
        <>
          <SectionLabel style={styles.kicker}>{t(C.secDeduit)}</SectionLabel>
          <HabitsCard habits={habits} />

          <SectionLabel style={styles.kicker}>{t(C.secReglages)}</SectionLabel>
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
            <View style={styles.cardBody}>
              <SwitchRow
                title={t(C.hillsTitle)}
                value={prefs.avoidHills}
                onValueChange={(v) => {
                  void commit({ avoidHills: v });
                }}
              />
            </View>
          </View>

          <SectionLabel style={styles.kicker}>{t(C.secApprentissage)}</SectionLabel>
          <View style={styles.card}>
            <View style={styles.cardBody}>
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
          <ListRow
            tone="danger"
            icon="sablier"
            label={t(C.forgetLabel)}
            sublabel={t(C.forgetDetail)}
            chevron
            onPress={askForget}
          />

          <Note>{t(C.footerNote)}</Note>
        </>
      )}
    </StackScreen>
  );
}

/** Rythme vertical des sur-titres — commun à tous les écrans de réglages. */
const KICKER_TOP = 24;
const KICKER_BOTTOM = 10;
/** Hauteur minimale d'une ligne de fait (lisible sans être tactile). */
const FACT_MIN_H = 36;

const styles = StyleSheet.create({
  kicker: { marginTop: KICKER_TOP, marginBottom: KICKER_BOTTOM },

  // Surface N1 SANS contour (règle 80/20) — l'espace sépare, pas la boîte.
  card: {
    backgroundColor: elevation.surface,
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
  cardTitle: { ...typography.cardTitle, color: colors.blanc, flex: 1 },
  cardBody: {
    paddingHorizontal: spacing.cardPadding - 2,
    paddingVertical: 4,
    paddingBottom: 16,
  },

  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: FACT_MIN_H,
  },
  factLabel: { ...typography.body, color: colors.gris, flexShrink: 1 },
  factValue: {
    ...typography.meta,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontVariant: ['tabular-nums'],
    flexShrink: 1,
    textAlign: 'right',
  },

  // Lecture EN COURS : une ligne grise non tapable.
  stateInline: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.6,
    paddingVertical: spacing.sm,
  },
  // ÉCHEC : surface N1, titre blanc, corps gris, UNE action.
  stateCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  stateTitle: { ...typography.itemTitle, color: colors.blanc },
  stateBody: { ...typography.meta, color: colors.gris, lineHeight: fontSizes.xs * 1.6 },
  stateCta: { marginTop: spacing.sm, minHeight: sizes.touchTarget },
});
