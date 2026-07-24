/**
 * GRYD — Page « Aujourd'hui » : PORTE D'ENTRÉE quotidienne (AMENDEMENT-10 §4,
 * AMENDEMENT-11 vocabulaire zones/territoires). Règle stricte « un écran = une
 * décision » : 1 objectif, 1 CTA verbe (AMENDEMENT-29 : « GO » retiré). Pas de
 * feed. Les seuls blocs affichés sous le CTA sont ceux qui ont quelque chose de
 * VRAI à dire : la série réelle et la Zone du Jour, qui disparaissent d'eux-mêmes
 * quand la donnée n'existe pas. Le prochain badge proche (1 carte compacte)
 * reste une invitation douce, jamais une injonction. Fond plein, contraste max.
 *
 * ─── « L'APP NE MENT JAMAIS » (21/07/2026) ─────────────────────────────────
 * Cet écran était le pire menteur de l'app : sur un iPhone neuf, sans compte, il
 * affichait « BONJOUR KORO », « Paris Est est contesté. », une route héros
 * « Route défense République · 4,8 km · +86 zones » et un bandeau semaine
 * (2/3 courses, 78/100 de forme, coffre crew à 66 %) — TOUT inventé. Le retour
 * terrain du fondateur (« je suis à Ouville-la-Rivière, l'app me met à
 * République ») venait en partie d'ici.
 *
 * Une première passe avait déplacé ces blocs derrière `isShowcasePlatform`. La
 * décision du 21/07 va au bout : LE MODE VITRINE EST ABANDONNÉ, il n'y a plus
 * de quatrième cas « démo » sur aucune surface. Les branches démo ne sont donc
 * pas gardées, elles sont SUPPRIMÉES :
 *   · `battleContext()` — entièrement dérivé de fakeHexes / warroom / route
 *     demo. Sans lui, le verbe honnête par défaut est CONQUÉRIR : sans
 *     territoire, tout est à prendre. C'est vrai, pas décoratif.
 *   · la card héros ROUTE RECOMMANDÉE — aucune route réelle n'existe encore,
 *     donc l'écran affiche l'état vide qui DIT ce qui manque et quand ça
 *     arrivera, au lieu d'un KPI géant fabriqué.
 *   · le bandeau semaine (courses / Score Forme / coffre crew) — aucun de ces
 *     trois indicateurs n'est câblé au réel. Rien ne le remplace : la série
 *     réelle et la Zone du Jour occupent déjà cette place quand elles ont
 *     quelque chose de vrai à dire.
 *
 * L'écran dit donc la vérité SANS laisser de trou : pas de compte → il invite à
 * se connecter ; pas de backend → il le dit ; connecté sans rien → il invite à
 * courir. Le départ de course reste toujours offert : c'est la seule action qui
 * fait avancer. Anti-shame (§11) conservé.
 */
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { flags } from '../src/lib/flags';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { intentionHref } from '../src/features/nav/runContext';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { BadgeCard, DailyFocusBlock, StreakBlock } from '../src/ui/game';
import { useMyStreak } from '../src/features/social/streak';
import { useDailyFocus } from '../src/features/daily/useDailyFocus';
import {
  COLLECTION_BADGES,
  BADGE_FAMILIES,
  badgeColor,
  badgeProgress,
  badgeRewardLabel,
} from '../src/features/badges/catalog';
import { useMyBadges } from '../src/features/badges/myBadges';
import { useMyProfile } from '../src/features/social/profileStore';
import { useSession } from '../src/lib/session';
import { C } from '../src/i18n/catalog/motivation';
import { useT } from '../src/i18n/store';

export default function AujourdhuiScreen() {
  const t = useT();

  useEffect(() => {
    screen('today');
  }, []);

  // AMENDEMENT-12 §A : 2 verbes joueur. « DÉFENDRE » suppose des zones à
  // défendre, et rien ne dit encore lesquelles le joueur tient — le verbe
  // honnête est donc CONQUÉRIR : sans territoire, tout est à prendre.
  const objectiveTag = t(C.objectiveConquer);

  // Débloqués + progression. ATTENTION : `useMyBadges` retombe sur la DÉMO quand
  // la lecture serveur échoue ou n'a pas lieu (source `local`) — on ne consomme
  // donc ce hook que lorsqu'il dit lire le serveur (voir `nextBadge`).
  const { unlockedIds, stat, source: badgeSource } = useMyBadges();

  // Les TROIS situations, qui n'ont PAS la même réponse :
  //   backend absent → on le dit, rien ne sera enregistré ;
  //   pas de compte  → on invite à se connecter ;
  //   compte, rien à montrer → on invite à courir.
  const { session, configured } = useSession();
  const { profile } = useMyProfile();
  const signedIn = configured && !!session;
  const showSignIn = configured && !session;

  // LOT 1 « LA SÉRIE VISIBLE » : la SEULE donnée réelle du bandeau motivation.
  // Dérivée des vraies courses du joueur (features/social/streak) — `null` tant
  // qu'on ne sait rien (pas de session, lecture en cours, aucune course) : dans
  // ce cas le bloc ne s'affiche PAS, plutôt qu'un « 0 » qui ne veut rien dire.
  const { state: streak } = useMyStreak();

  // LOT 3 : Zone du Jour / défi d'accueil. `null` tant qu'on ne sait rien —
  // aucune zone de démonstration ne remplace une zone réelle absente.
  const { focus: dailyFocus } = useDailyFocus();
  // Un prénom ne s'invente pas : `null` = on salue sans nom plutôt que d'appeler
  // l'utilisateur « KORO ». Aucun nom de démo n'existe plus nulle part.
  // Le nom vide est traité comme absent : `profileStore` renvoie
  // désormais `''` tant que l'identité n'est pas résolue — « BONJOUR » seul est
  // correct, « BONJOUR  » avec un trou ne l'est pas.
  const greetingName = (signedIn ? profile.displayName.trim() : '') || null;
  const situation = !configured
    ? t(C.todayOfflineSituation)
    : signedIn
      ? t(C.todayNextRunAwaits)
      : t(C.todaySignedOutSituation);

  // Prochain badge proche : top 1 verrouillé non secret par ratio (même calcul
  // que la section « Proches du déblocage » de la Collection — cohérence).
  // Rien du tout si la progression ne vient pas du serveur : un « plus que 3 km »
  // calculé sur des stats de démo est un mensonge, et un bloc bonus absent ne
  // laisse pas de trou (l'écran garde son accueil, sa card et son CTA).
  const nextBadge = useMemo(() => {
    if (badgeSource !== 'server') return undefined;
    return COLLECTION_BADGES
      .filter((b) => !unlockedIds.has(b.id) && !b.secret)
      .map((b) => ({ def: b, prog: badgeProgress(b.id, stat(b.metric)) }))
      .filter((x) => x.prog !== null && x.prog.ratio > 0 && !x.prog.unlocked)
      .sort((a, b) => b.prog!.ratio - a.prog!.ratio)[0];
  }, [unlockedIds, stat, badgeSource]);

  /**
   * Départ immédiat (AMENDEMENT-14 §2) — zéro question. Il n'y a pas de plan
   * pré-calculé : on part en conquête SANS route pré-remplie (`intentionHref`),
   * ce qui est exactement ce que le CTA promet — le tracé réel décide, le
   * serveur attribue.
   */
  const goNow = () => {
    haptics.medium();
    track(EVENTS.runStart, { mode: 'conquete', context: 'CONQUERIR' });
    router.push(intentionHref('conquest'));
  };

  return (
    <StackScreen title={t(C.todayTitle)} icon="aujourdhui" kicker={t(C.todayKicker)}>
      {/* Bonjour + situation en UNE phrase — le contexte avant la décision. */}
      <Text style={styles.greeting}>
        {greetingName ? t(C.todayGreeting, { name: greetingName }) : t(C.todayGreetingAnon)}
      </Text>
      <Text style={styles.situation}>{situation}</Text>

      {/* L'OBJECTIF. Aucune route recommandée n'existe encore (le Route Planner
          calcule à la demande, depuis la position RÉELLE) : plutôt qu'un KPI
          géant fabriqué, l'écran DIT ce qui manque et quand ça arrivera.
          Non tappable : il n'y a rien à ouvrir tant qu'il n'y a pas de route. */}
      <View style={styles.hero}>
        <View style={styles.heroHead}>
          <Icon name="route" size={18} color={colors.gris} />
          <Text style={styles.heroKicker}>{t(C.todayNoRouteKicker)}</Text>
        </View>
        <Text style={styles.emptyHeroTitle}>{t(C.todayNoRouteTitle)}</Text>
        <Text style={styles.emptyHeroBody}>{t(C.todayNoRouteBody)}</Text>
      </View>

      {/* LE CTA unique — VERBE contextuel, départ immédiat (AMENDEMENT-29 :
          « GO » retiré ; le libellé = l'objectif du plan du jour). Composant
          Button partagé (audit UI L2) : famille, autoshrink, plancher tactile. */}
      <View style={styles.ctaWrap}>
        <Button
          label={objectiveTag}
          onPress={goNow}
          accessibilityLabel={t(C.todayCtaA11y, { objective: objectiveTag })}
        />
      </View>

      {/* Compte manquant : invitation SECONDAIRE (ghost), sous le CTA — elle
          répond à la phrase de situation sans concurrencer la décision du jour
          (§A : 1 seul CTA chartreuse, qui reste le départ de course). */}
      {showSignIn ? (
        <View style={styles.signInWrap}>
          <Button variant="ghost" size="md" label={t(C.todaySignIn)} onPress={() => router.push('/sign-in')} />
        </View>
      ) : null}

      {/* LA SÉRIE (LOT 1) — sous le CTA : elle motive la décision sans la
          concurrencer (aucun bouton, une seule ligne de détail). Elle ne
          s'affiche que si elle est RÉELLE ; sinon rien du tout. */}
      <StreakBlock state={streak} />

      {/* LOT 3 (A-45 §3) — LA raison de revenir aujourd'hui : le parcours
          d'accueil tant qu'il n'est pas fini, puis la Zone du Jour. UN SEUL des
          deux (§A « 1 écran = 1 décision ») — l'arbitrage est dans le hook.
          Aucun CTA ici : le seul CTA chartreuse de l'écran reste le départ.
          Rien n'est affiché sans donnée réelle (hors session / lecture vide). */}
      <DailyFocusBlock focus={dailyFocus} />

      {/* Le bandeau semaine (courses · Score Forme · coffre crew) a été RETIRÉ :
          aucun des trois indicateurs n'est câblé au réel, et présenter
          « 2/3 courses · 78/100 · 66 % » à quelqu'un qui n'a jamais couru est
          exactement le mensonge qu'on supprime. Rien ne le remplace : la série
          réelle (StreakBlock) et la Zone du Jour occupent déjà cette place
          quand elles ont quelque chose de vrai à dire. */}

      {/* Prochain badge proche — 1 seule carte, invitation douce. */}
      {nextBadge ? (
        <View style={styles.badgeBlock}>
          <Text style={styles.blockKicker}>{t(C.todayNextBadge)}</Text>
          <BadgeCard
            name={nextBadge.def.name}
            family={nextBadge.def.family}
            familyLabel={
              BADGE_FAMILIES.find((f) => f.id === nextBadge.def.family)?.name ??
              t(C.badgeFamilySecret)
            }
            familyColor={badgeColor(nextBadge.def)}
            tier={nextBadge.def.tier}
            state="locked"
            requirement={nextBadge.def.requirement}
            progress={
              nextBadge.prog
                ? { value: nextBadge.prog.value, threshold: nextBadge.prog.threshold }
                : undefined
            }
            reward={badgeRewardLabel(nextBadge.def)}
            onPress={() => router.push('/badges')}
          />
        </View>
      ) : null}

      {/* Accès existants (ghost — l'accent reste au CTA). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.todayMyChallengesA11y)}
        onPress={() => router.push('/challenges')}
        style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
      >
        <Icon name="mission" size={20} color={colors.blanc} />
        <Text style={styles.linkLabel}>{t(C.todayMyChallenges)}</Text>
        <Icon name="chevron" size={16} color={colors.gris} />
      </Pressable>
      {/* D8 : War Room masquée hors MVP. */}
      {flags.warRoom ? (
        <>
          <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.todayWarRoomA11y)}
          onPress={() => router.push('/warroom')}
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
        >
          <Icon name="guerre" size={20} color={colors.blanc} />
          <Text style={styles.linkLabel}>War Room</Text>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>
        </>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  situation: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.4,
    marginTop: 4,
  },

  hero: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    marginTop: 16,
  },
  heroHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroKicker: {
    flex: 1,
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },

  // Card héros : même gabarit qu'une card pleine (pas de card-in-card, §A),
  // sans KPI géant — il n'y a aucun chiffre à montrer, et on n'en invente pas.
  emptyHeroTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginTop: 10,
  },
  emptyHeroBody: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: spacing.xs,
  },

  ctaWrap: { marginTop: spacing.sm },
  signInWrap: { marginTop: spacing.sm },

  badgeBlock: { marginTop: 18 },
  blockKicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginBottom: 10,
    fontVariant: ['tabular-nums'],
  },

  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  linkLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },
  pressed: { opacity: 0.85 },
});
