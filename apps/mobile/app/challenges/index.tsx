/**
 * GRYD — LISTE DES CHALLENGES (écran poussé depuis Aujourd'hui).
 *
 * ⚠️ AUCUNE PLANCHE DE LA VAGUE 1 (E01→E21) NE COUVRE LES CHALLENGES. Cet écran
 * n'est donc PAS « recalé sur sa planche » : il applique la grammaire commune
 * (kicker, lignes scannables, bloc d'états, rôles typo) sans prétendre suivre un
 * modèle qui n'existe pas. Ne pas le citer comme référence.
 *
 * ⚠️ ÉCRAN SANS PORTE STABLE. Sa seule entrée est `/aujourdhui`, qui n'en a
 * elle-même AUCUNE dans toute l'app (cf. le docblock de `app/aujourdhui.tsx`).
 * Ce chantier a donc corrigé ce qui MENT et retiré ce qui est MORT, sans
 * embellir un écran que personne ne peut atteindre : peindre une pièce sans
 * porte n'est pas une livraison.
 *
 * ─── ORDRE DE COMPOSITION ───────────────────────────────────────────────────
 *  1. Barre de retour + titre + kicker + sous-titre (`StackScreen`).
 *  2. UN état parmi quatre — jamais deux à la fois :
 *     ④ lecture en cours  → une LIGNE grise non tapable ;
 *     ① pas de compte     → carte d'état + « Se connecter » (ghost) ;
 *     ③ serveur injoignable → carte d'état, sans action à tenter ici ;
 *     ② aucun défi actif  → carte d'état, un fait sur le jeu, sans reproche.
 *  3. Sinon : la liste, en LIGNES scannables (plaque d'icône → libellé → chevron,
 *     séparées par un filet, jamais des cards bordées).
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ───────────────────────────────────────
 * · LA BRANCHE RIVALRY et LE BLOC SPONSOR — INATTEIGNABLES. `challengeState`
 *   ne sert que le type `solo` (`readable()`), et `sponsor` / `rivalMine` /
 *   `rivalOther` / `partnerName` n'étaient JAMAIS remplis. Deux blocs peints
 *   pour rien, qui faisaient croire au prochain lecteur qu'ils étaient vivants.
 *   Les champs ont disparu du TYPE (`features/motivation/catalog.ts`) : la faute
 *   n'est plus rattrapable par inadvertance.
 * · LA JAUGE FABRIQUÉE. `pct = target > 0 ? current / target : 0.5` peignait une
 *   barre À MOITIÉ PLEINE quand la cible était nulle — une mesure inventée. Il
 *   n'y a plus de barre sans dénominateur honnête (règle `ProgressBar`).
 * · LE SPINNER CENTRÉ (`ActivityIndicator`) — remplacé par une ligne grise : un
 *   chargement n'affirme rien et ne prend pas l'écran.
 * · LES CARDS BORDÉES (fond carbone + `borderWidth: 1` sur chaque item) —
 *   remplacées par des lignes posées sur l'espace, séparées par un filet
 *   (règle 6 + règle 8 : un contour signale un ÉTAT, pas une frontière).
 * · LE DOCBLOCK QUI CITAIT `features/motivation/demo` — ce module n'existe plus
 *   (renommé `catalog.ts` le 21/07/2026). Une référence morte en tête de
 *   fichier est une doc qui promet au-delà du code.
 *
 * ─── ÉCARTS ASSUMÉS ─────────────────────────────────────────────────────────
 * · Pas d'`analyticsId` sur les lignes. RAISON TECHNIQUE : `analyticsId` est une
 *   prop de `src/ui/Button` (CTA), pas de la ligne de liste, et `packages/shared/
 *   src/events.ts` n'a aucun event §8 pour l'ouverture d'un défi. Le `screen(
 *   'challenge_detail', { id })` de l'écran de destination mesure déjà l'entrée ;
 *   on n'invente pas de nom d'event (règle 18).
 * · Les défis de CREW et de RIVALITÉ restent au catalogue mais ne sont pas
 *   servis. RAISON TECHNIQUE : leur progression est stockée sous `kind='crew'`
 *   et la contribution personnelle n'est ventilée par membre NULLE PART — on ne
 *   peut pas l'afficher sans l'inventer (cf. `challengeState.ts`).
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  borderState,
  colors,
  fonts,
  fontSizes,
  sizes,
  spacing,
  typography,
} from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { Button } from '../../src/ui/Button';
import { Card, IconPlate } from '../../src/ui/Card';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { StackScreen } from '../../src/ui/StackScreen';
import { formatChallengeValue, type ChallengeCard } from '../../src/features/motivation/catalog';
import {
  useChallenges,
  type ChallengesEmptyReason,
} from '../../src/features/motivation/challengeState';
import {
  CHALLENGES_NONE_ACTIVE_BODY,
  CHALLENGES_NONE_ACTIVE_TITLE,
  CHALLENGE_DIFFICULTY_LABELS,
  CHALLENGE_TYPE_LABELS,
  challengeUnitLabel,
} from '../../src/features/motivation/labels';
import { C } from '../../src/i18n/catalog/motivation';
import { useT } from '../../src/i18n/store';

/** Icône de tête par type. Seul `solo` est servi aujourd'hui (cf. en-tête). */
const TYPE_ICON = { solo: 'aujourdhui', crew: 'crew', rivalry: 'cible' } as const;

/**
 * UNE LIGNE SCANNABLE (règle 6) : plaque d'icône → libellé `flex: 1` → chevron.
 * La jauge vit sous le libellé, dans la MÊME ligne : c'est le seul chiffre de
 * l'item, il ne mérite pas une card à lui.
 */
function Row({ c }: { c: ChallengeCard }) {
  const t = useT();
  // Aucune barre sans dénominateur honnête. `target <= 0` ⇒ on montre la valeur
  // atteinte, et RIEN qui ressemble à une progression vers un objectif inconnu.
  const measured = formatChallengeValue(c.current, c.unit);
  const goal = c.target > 0 ? formatChallengeValue(c.target, c.unit) : null;
  const unit = challengeUnitLabel(c.unit);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={c.name}
      onPress={() => router.push(`/challenges/${c.id}`)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <IconPlate
          icon={TYPE_ICON[c.type as keyof typeof TYPE_ICON] ?? 'mission'}
          size="md"
          color={colors.blanc}
        />
        <View style={styles.headText}>
          {/* Aucun `numberOfLines` : le libellé s'enroule, jamais de « … ». */}
          <Text style={styles.name}>{c.name}</Text>
          <Text style={styles.meta}>
            {t(CHALLENGE_TYPE_LABELS[c.type])} · {t(CHALLENGE_DIFFICULTY_LABELS[c.difficulty])}
          </Text>
        </View>
        <Icon name="chevron" size={16} color={colors.gris} />
      </View>

      {measured !== null ? (
        <View style={styles.progress}>
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
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * État vide — une seule carte, une seule raison, une seule action au maximum
 * (§A). Les trois raisons ne se ressemblent pas et ne se remplacent pas :
 *   · pas de compte  → on invite à se connecter (Button ghost : le CTA
 *     chartreuse de l'app reste le départ de course) ;
 *   · serveur injoignable → on l'explique, on ne propose rien à tenter ici ;
 *   · aucun défi actif → on le dit comme un fait sur le jeu, sans reprocher au
 *     joueur une absence qui n'est pas la sienne.
 */
function EmptyState({ reason }: { reason: Exclude<ChallengesEmptyReason, 'none'> }) {
  const t = useT();
  const signedOut = reason === 'signedOut';
  const noneActive = reason === 'noneActive';
  const title = noneActive
    ? CHALLENGES_NONE_ACTIVE_TITLE
    : signedOut
      ? C.challengesEmptySignedOutTitle
      : C.challengesEmptyOfflineTitle;
  const body = noneActive
    ? CHALLENGES_NONE_ACTIVE_BODY
    : signedOut
      ? C.challengesEmptySignedOutBody
      : C.challengesEmptyOfflineBody;
  return (
    <Card style={styles.stateCard}>
      <Text style={styles.stateTitle}>{t(title)}</Text>
      <Text style={styles.stateBody}>{t(body)}</Text>
      {signedOut ? (
        <View style={styles.stateAction}>
          <Button
            variant="ghost"
            size="md"
            label={t(C.todaySignIn)}
            onPress={() => router.push('/sign-in')}
            analyticsId="challenges_sign_in"
          />
        </View>
      ) : null}
    </Card>
  );
}

export default function ChallengesScreen() {
  const t = useT();

  useEffect(() => {
    screen('challenges');
  }, []);

  // Défis actifs du serveur + MA progression réelle. `empty` porte la RAISON
  // d'une liste vide : l'écran ne reste jamais muet — mais il ne parle pas non
  // plus avant d'avoir la réponse (`loading`).
  const { challenges, empty, loading } = useChallenges();

  return (
    <StackScreen
      title={t(C.challengesTitle)}
      icon="mission"
      kicker={t(C.challengesKicker)}
      subtitle={t(C.challengesSubtitle)}
    >
      {loading ? (
        // ÉTAT ④ : une ligne, non tapable. Elle n'affirme rien sur le joueur.
        <Text style={styles.stateInline}>{t(C.challengesReading)}</Text>
      ) : empty === 'none' ? (
        challenges.map((c) => <Row key={c.id} c={c} />)
      ) : (
        <EmptyState reason={empty} />
      )}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  // LIGNE, pas card : aucune surface, aucun contour — un filet de séparation.
  row: {
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: borderState.hairline,
  },
  pressed: { opacity: 0.7 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headText: { flex: 1 },
  name: { ...typography.itemTitle, color: colors.blanc },
  meta: { ...typography.meta, color: colors.gris, marginTop: spacing.xxs },

  progress: { marginTop: spacing.sm },
  progressNums: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  // Rôle R6 « stat » recopié à la main, comme dans `StatBlock.tsx:104-115` :
  // `typography.stat` porte un `fontVariant` en LECTURE SEULE que StyleSheet
  // refuse à l'étalement (TextStyle le veut mutable). Mêmes valeurs.
  current: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.lg,
  },
  target: { ...typography.body, color: colors.gris },

  // ─── Les quatre états ──────────────────────────────────────────────────────
  stateInline: { ...typography.body, color: colors.gris, marginTop: spacing.lg },
  stateCard: { marginTop: spacing.sm, gap: spacing.xs },
  stateTitle: { ...typography.cardTitle, color: colors.blanc },
  stateBody: { ...typography.body, color: colors.gris },
  stateAction: { marginTop: spacing.sm },
});
