/**
 * GRYD — DÉTAIL D'UN CHALLENGE (écran poussé depuis `/challenges`).
 *
 * ⚠️ AUCUNE PLANCHE DE LA VAGUE 1 NE COUVRE LES CHALLENGES, et cet écran est à
 * DEUX portes d'un écran qui n'en a aucune (cf. `app/aujourdhui.tsx`). Ce
 * chantier a corrigé ce qui MENT et retiré ce qui est MORT ; il n'a pas embelli
 * un écran inatteignable.
 *
 * ─── ORDRE DE COMPOSITION ───────────────────────────────────────────────────
 *  1. Barre + titre (le NOM du défi) + kicker « TYPE · DIFFICULTÉ ».
 *  2. La promesse du défi (corps gris).
 *  3. UN bloc de progression : kicker → chiffre + cible → jauge → encouragement.
 *  4. Une LIGNE « récompense » posée sur l'espace, séparée par un filet.
 * Aucun CTA : rien ne se décide ici, on lit où l'on en est.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ───────────────────────────────────────
 * · TROIS BLOCS INATTEIGNABLES : rivalité (deux scores), contribution crew
 *   (« tu as déjà défendu {n} zones ») et sponsor (« Offert par … »).
 *   `challengeState` ne sert que le type `solo`, et `rivalMine` / `rivalOther` /
 *   `partnerName` / `myContrib` / `sponsor` n'étaient JAMAIS remplis : ces
 *   sections ne pouvaient pas s'afficher, mais leur code faisait croire le
 *   contraire. Les champs ont disparu du TYPE — la faute n'est plus rattrapable.
 * · LA JAUGE FABRIQUÉE : `pct = target > 0 ? current / target : 0.5` peignait
 *   une barre à moitié pleine sur une cible nulle. Plus de barre sans
 *   dénominateur honnête.
 * · « CE CHALLENGE N'EST PLUS DISPONIBLE » COMME RÉPONSE À TOUT. Cette phrase
 *   est une CONCLUSION SUR LE JEU ; elle était servie aussi bien à un joueur
 *   déconnecté qu'à un serveur injoignable. `useChallenge` remonte désormais la
 *   RAISON, et chaque cause a sa copie (§1.3, les quatre états).
 * · TROIS CARDS EMPILÉES → un seul bloc + de l'espace (règle 8).
 * · LA CHARTREUSE EN DÉCORATION (icône « coffre », chiffre de contribution) sur
 *   un écran qui n'a AUCUN CTA chartreuse : l'accent ne se dépense pas sur un
 *   ornement (règle 13).
 * · LE KICKER CONSTRUIT PAR `.toUpperCase()` EN JS — sur 5 langues, une mise en
 *   capitales sans locale casse (turc, accents). La casse est un STYLE
 *   (`textTransform`), portée par `StackScreen`.
 * · LE SPINNER PLEIN ÉCRAN → une ligne grise non tapable.
 *
 * ─── ÉCARTS ASSUMÉS ─────────────────────────────────────────────────────────
 * · Aucun bouton « Réessayer » sur l'état ③. RAISON TECHNIQUE : `useChallenges`
 *   n'expose pas de `reload()` — sa lecture est relancée par l'effet, sur
 *   changement de session. Peindre un bouton qui ne relancerait rien serait un
 *   bouton mort ; on dit l'état, on ne promet pas l'action.
 * · Le libellé d'unité (« courses », « zones ») vient de `challengeUnitLabel`,
 *   pas du seed. RAISON TECHNIQUE : `CHALLENGE_SEEDS` porte une clé technique
 *   (`km`, `courses`, `zones`), pas une copie traduisible.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { borderState, colors, fonts, fontSizes, spacing, typography } from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { Card, IconPlate } from '../../src/ui/Card';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { SectionLabel } from '../../src/ui/SectionLabel';
import { StackScreen } from '../../src/ui/StackScreen';
import { formatChallengeValue } from '../../src/features/motivation/catalog';
import { useChallenge } from '../../src/features/motivation/challengeState';
import {
  CHALLENGES_NONE_ACTIVE_BODY,
  CHALLENGES_NONE_ACTIVE_TITLE,
  CHALLENGE_DIFFICULTY_LABELS,
  CHALLENGE_TYPE_LABELS,
  challengeUnitLabel,
  encouragement,
} from '../../src/features/motivation/labels';
import { C } from '../../src/i18n/catalog/motivation';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';

export default function ChallengeDetailScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { challenge: c, empty, loading } = useChallenge(typeof id === 'string' ? id : undefined);

  useEffect(() => {
    screen('challenge_detail', { id: id ?? '' });
  }, [id]);

  // ── ÉTAT ④ : lecture en cours. On ne conclut rien avant la réponse. ────────
  if (loading) {
    return (
      <StackScreen title={t(C.challengeTitle)} icon="mission">
        <Text style={styles.stateInline}>{t(C.challengeReading)}</Text>
      </StackScreen>
    );
  }

  // ── ÉTATS ①②③ : la carte manque, et les causes n'ont PAS la même réponse. ──
  if (!c) {
    const state: { title: Entry; body: Entry } =
      empty === 'signedOut'
        ? { title: C.challengesEmptySignedOutTitle, body: C.challengesEmptySignedOutBody }
        : empty === 'backendOff'
          ? { title: C.challengesEmptyOfflineTitle, body: C.challengesEmptyOfflineBody }
          : empty === 'noneActive'
            ? { title: CHALLENGES_NONE_ACTIVE_TITLE, body: CHALLENGES_NONE_ACTIVE_BODY }
            : // `empty === 'none'` : la liste a bien été LUE et cette carte n'y est
              // pas. C'est le SEUL cas où « plus disponible » est une vérité.
              { title: C.challengeUnavailable, body: C.challengeUnavailableBody };
    return (
      <StackScreen title={t(C.challengeTitle)} icon="mission">
        <Card style={styles.stateCard}>
          <Text style={styles.stateTitle}>{t(state.title)}</Text>
          <Text style={styles.stateBody}>{t(state.body)}</Text>
        </Card>
      </StackScreen>
    );
  }

  // Aucune jauge sans dénominateur honnête (règle `ProgressBar`).
  const measured = formatChallengeValue(c.current, c.unit);
  const goal = c.target > 0 ? formatChallengeValue(c.target, c.unit) : null;
  const unit = challengeUnitLabel(c.unit);
  const remaining = c.target > 0 ? formatChallengeValue(Math.max(0, c.target - c.current), c.unit) : null;
  const done = c.target > 0 && c.current >= c.target;

  return (
    <StackScreen
      title={c.name}
      icon="mission"
      kicker={`${t(CHALLENGE_TYPE_LABELS[c.type])} · ${t(CHALLENGE_DIFFICULTY_LABELS[c.difficulty])}`}
    >
      <Text style={styles.blurb}>{t(c.blurb)}</Text>

      {/* UN SEUL bloc : le reste se sépare par l'espace, pas par des cards. Et
          PAS DE BLOC VIDE : sans valeur lisible, la card ne s'ouvre même pas —
          un cadre sans contenu est un trou, pas un état. */}
      {measured !== null ? (
        <Card style={styles.block}>
          <SectionLabel style={styles.kicker}>{t(C.progressKicker)}</SectionLabel>
          <View style={styles.progressNums}>
            <Text style={styles.current}>{measured}</Text>
            {goal !== null ? (
              <Text style={styles.target}>
                / {goal} {unit}
              </Text>
            ) : (
              <Text style={styles.target}>{unit}</Text>
            )}
          </View>
          {goal !== null ? <ProgressBar value={c.current / c.target} /> : null}
          {remaining !== null ? (
            <Text style={styles.hint}>{encouragement(done, `${remaining} ${unit}`.trim())}</Text>
          ) : null}
        </Card>
      ) : null}

      {/* La récompense est une LIGNE, pas une card : un seul objet, un filet. */}
      <View style={styles.rewardRow}>
        <IconPlate icon="coffre" size="md" color={colors.blanc} />
        <View style={styles.rewardText}>
          <SectionLabel>{t(C.challengeRewardKicker)}</SectionLabel>
          {/* Pas de `numberOfLines` : la récompense s'enroule, jamais de « … ». */}
          <Text style={styles.rewardValue}>{t(c.reward)}</Text>
        </View>
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  stateInline: { ...typography.body, color: colors.gris, marginTop: spacing.lg },
  stateCard: { marginTop: spacing.sm, gap: spacing.xs },
  stateTitle: { ...typography.cardTitle, color: colors.blanc },
  stateBody: { ...typography.body, color: colors.gris },

  blurb: { ...typography.body, color: colors.gris, marginTop: spacing.xxs },
  block: { marginTop: spacing.md },
  kicker: { marginBottom: spacing.sm },
  progressNums: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, marginBottom: spacing.xs },
  // Rôle R6 « stat » recopié à la main, comme dans `StatBlock.tsx:104-115` :
  // `typography.stat` porte un `fontVariant` en LECTURE SEULE que StyleSheet
  // refuse à l'étalement (TextStyle le veut mutable). Mêmes valeurs.
  current: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.xxl,
    lineHeight: fontSizes.xxl * 1.1,
  },
  target: { ...typography.body, color: colors.gris },
  hint: { ...typography.body, color: colors.gris, marginTop: spacing.sm },

  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
  },
  rewardText: { flex: 1, gap: spacing.xxs },
  rewardValue: { ...typography.cardTitle, color: colors.blanc },
});
