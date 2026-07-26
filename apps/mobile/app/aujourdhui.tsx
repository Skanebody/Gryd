/**
 * GRYD — « AUJOURD'HUI » : lanceur quotidien (AMENDEMENT-10 §4).
 *
 * ═══ ⚠️ ÉCRAN SANS PORTE — LA DÉCISION, ÉCRITE (25/07/2026) ═══════════════════
 * CE FICHIER N'EST ATTEIGNABLE PAR AUCUN CHEMIN DE L'APPLICATION. Vérifié le
 * 25/07/2026 : la seule occurrence de la route est sa DÉCLARATION
 * (`app/_layout.tsx:172`) ; toutes les autres occurrences du mot « aujourdhui »
 * dans le repo sont le nom d'une ICÔNE. Aucun `router.push('/aujourdhui')`
 * n'existe. Conséquence en cascade : `/challenges` (dont l'unique entrée est
 * ci-dessous) et `/challenges/[id]` sont eux aussi hors d'atteinte, et
 * `DailyFocusBlock` — donc toute la mécanique « Zone du Jour » (A-45 §3) — n'est
 * RENDU NULLE PART ailleurs dans l'app.
 *
 * DÉCISION PRISE : **CÂBLER, PAS ARCHIVER.** L'archiver (redirect, à la manière
 * de `crew-discovery`) supprimerait le seul rendu de la Zone du Jour et la seule
 * porte des Challenges — deux mécaniques adossées à de VRAIES tables serveur
 * (`daily_zone_inputs`, `welcome_challenge_facts`, `challenges`,
 * `challenge_progress`). On ne supprime pas une fonctionnalité qui marche parce
 * qu'il manque une ligne de navigation.
 *
 * CE QUI MANQUE, ET OÙ : UNE entrée depuis le Profil (une `PreviewRow` de plus
 * dans `app/(tabs)/profil.tsx`) ou depuis la Carte. Ces deux fichiers sont des
 * écrans RECALÉS, donc intouchables par ce lot ; le câblage est remonté au
 * chantier qui les possède. TANT QUE CETTE LIGNE N'EXISTE PAS, CET ÉCRAN NE
 * DOIT PAS ÊTRE EMBELLI davantage : peindre une pièce sans porte n'est pas une
 * livraison. Ce chantier s'est donc limité à ce qui MENT et à ce qui est MORT.
 *
 * ═══ ORDRE DE COMPOSITION ════════════════════════════════════════════════════
 *  1. Kicker + salutation — DEUX lignes de contexte, pas trois.
 *  2. (conditionnel) la phrase de situation, UNIQUEMENT quand elle dit quelque
 *     chose : pas de compte, ou serveur injoignable.
 *  3. LE CTA unique, chartreuse : partir courir. C'est la seule décision.
 *  4. (conditionnel) « Se connecter » en ghost — jamais un second chartreuse.
 *  5. La série RÉELLE, puis la Zone du Jour / le parcours d'accueil : au plus un
 *     bloc chacun, et rien du tout sans donnée réelle.
 *  6. Le prochain badge, en LIGNE scannable.
 *  7. Les accès (Challenges, War Room sous drapeau), en `ListRow`.
 *
 * ═══ CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ════════════════════════════════════════
 * · LA CARD HÉROS « GRYD ne connaît pas encore ton terrain » / « Les routes
 *   recommandées arrivent après tes premières sorties ». Rendue SANS AUCUNE
 *   CONDITION — donc affichée aussi à quelqu'un ayant des dizaines de courses
 *   et une distance apprise. Et surtout FAUSSE dans tous les cas : le
 *   planificateur (`/route-planner`) calcule une boucle recommandée À LA
 *   DEMANDE depuis la position GPS, sans aucune course préalable
 *   (`features/route/suggestion.ts` est TOTAL : il rend toujours une distance).
 *   Une card qui annonce pour plus tard ce que le produit fait déjà est une
 *   promesse à l'envers. Supprimée, pas déplacée.
 * · « Ta prochaine course t'attend. » — la troisième ligne de contexte. Elle
 *   habillait un LANCEUR en plan personnalisé alors que le CTA est toujours le
 *   même verbe. La page assume maintenant d'être un lanceur : deux lignes de
 *   contexte, puis la décision.
 * · LA `BadgeCard` DU PROCHAIN BADGE → une ligne scannable. Une carte de
 *   collection au milieu d'un lanceur concurrençait la décision du jour.
 * · LES `Pressable` D'ACCÈS RECODÉS (`linkRow`, `borderTopWidth` sur
 *   `colors.grisLigne`, AUCUN plancher tactile déclaré) → `ListRow`, qui apporte
 *   `minHeight: sizes.touchTarget`, la plaque d'icône unique et un libellé qui
 *   ne se tronque jamais.
 * · Le bandeau semaine (courses · Score Forme · coffre crew) avait déjà été
 *   retiré le 21/07/2026 : aucun des trois indicateurs n'est câblé au réel.
 *
 * ═══ ÉCARTS ASSUMÉS ══════════════════════════════════════════════════════════
 * · LA SÉRIE NE DISTINGUE TOUJOURS PAS L'ÉCHEC DU VIDE. `useMyStreak`
 *   (`src/features/social/streak.ts`) renvoie `state: null` pour « pas de
 *   session », « pas de backend », « lecture ratée » ET « aucune course » : le
 *   bloc disparaît dans les quatre cas. RAISON TECHNIQUE : `features/social/**`
 *   appartient à un autre périmètre (écrans recalés) et ce lot n'a pas le droit
 *   d'y écrire. La Zone du Jour, elle, a reçu son état ③ ici même
 *   (`useDailyFocus.unavailable`) — le même correctif est à faire côté série.
 * · LE VERBE DU CTA EST FIXE (« CONQUÉRIR »). RAISON TECHNIQUE : « DÉFENDRE »
 *   suppose de savoir quelles zones le joueur TIENT, ce qu'aucune lecture de cet
 *   écran ne fournit. « Conquérir » reste vrai dans tous les cas : sans
 *   territoire, tout est à prendre.
 * · Les noms et conditions des badges restent non traduits (catalogue de jeu
 *   partagé). RAISON TECHNIQUE : les traduire est un chantier `packages/shared`,
 *   hors périmètre — même écart que celui déjà assumé par `app/badges.tsx`.
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { DEFAULT_ACTIVITY, colors, spacing, typography } from '@klaim/shared';
import { flags } from '../src/lib/flags';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { intentionHref } from '../src/features/nav/runContext';
import { Button } from '../src/ui/Button';
import { ListRow } from '../src/ui/ListRow';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { DailyFocusBlock, StreakBlock } from '../src/ui/game';
import { useMyStreak } from '../src/features/social/streak';
import { useDailyFocus } from '../src/features/daily/useDailyFocus';
import {
  COLLECTION_BADGES,
  badgeProgress,
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
  //   compte, rien à montrer → l'écran garde sa décision, sans phrase de trop.
  const { session, configured } = useSession();
  const { profile } = useMyProfile();
  const signedIn = configured && !!session;
  const showSignIn = configured && !session;

  // LOT 1 « LA SÉRIE VISIBLE » : la SEULE donnée réelle du bandeau motivation.
  // Dérivée des vraies courses du joueur (features/social/streak) — `null` tant
  // qu'on ne sait rien : dans ce cas le bloc ne s'affiche PAS, plutôt qu'un « 0 »
  // qui ne veut rien dire (cf. « écarts assumés » : ce hook ne sépare pas encore
  // l'échec du vide).
  const { state: streak } = useMyStreak();

  // LOT 3 : Zone du Jour / défi d'accueil. `focus: null` = rien à dire ;
  // `unavailable` = la lecture est partie et a ÉCHOUÉ. Deux états DISTINCTS.
  const { focus: dailyFocus, unavailable: dailyUnavailable } = useDailyFocus();

  // Un prénom ne s'invente pas : `null` = on salue sans nom plutôt que d'appeler
  // l'utilisateur par un nom de démonstration. Le nom vide est traité comme
  // absent : `profileStore` renvoie `''` tant que l'identité n'est pas résolue —
  // « BONJOUR » seul est correct, « BONJOUR  » avec un trou ne l'est pas.
  const greetingName = (signedIn ? profile.displayName.trim() : '') || null;

  // La phrase de situation n'existe QUE quand elle dit quelque chose. Connecté
  // et en ligne, elle ne faisait que meubler — et trois lignes de contexte avant
  // la première décision, c'est une de trop (§A « compris en moins de 3 s »).
  const situation = !configured
    ? t(C.todayOfflineSituation)
    : !session
      ? t(C.todaySignedOutSituation)
      : null;

  // Prochain badge proche : top 1 verrouillé non secret par ratio (même calcul
  // que la section « Proches du déblocage » de la Collection — cohérence).
  // Rien du tout si la progression ne vient pas du serveur : un « plus que 3 km »
  // calculé sur des stats de démo est un mensonge, et un bloc bonus absent ne
  // laisse pas de trou (l'écran garde son accueil et son CTA).
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
   *
   * LA DISCIPLINE EST DÉCLARÉE, EXPLICITEMENT (E14, 26/07/2026). Cet écran ne
   * porte PAS le commutateur Run/Bike : il n'a aucune lentille à respecter, et
   * il n'ira jamais lire celle d'un autre écran — une préférence d'AFFICHAGE ne
   * décide pas de la NATURE d'un effort (interdit du 25/07). Il déclare donc la
   * course à pied, en toutes lettres plutôt qu'en se taisant : le jour où on lui
   * câble une porte depuis une surface qui porte une lentille, c'est CETTE ligne
   * qu'on change, et la discipline reste corrigeable d'un tap au préflight.
   */
  const goNow = () => {
    haptics.medium();
    track(EVENTS.runStart, { mode: 'conquete', context: 'CONQUERIR', activity: DEFAULT_ACTIVITY });
    router.push(intentionHref('conquest', undefined, DEFAULT_ACTIVITY));
  };

  return (
    <StackScreen title={t(C.todayTitle)} icon="aujourdhui" kicker={t(C.todayKicker)}>
      {/* 1. Deux lignes de contexte AU PLUS, avant la décision. */}
      <Text style={styles.greeting}>
        {greetingName ? t(C.todayGreeting, { name: greetingName }) : t(C.todayGreetingAnon)}
      </Text>
      {situation !== null ? <Text style={styles.situation}>{situation}</Text> : null}

      {/* 2. LE CTA unique — départ immédiat (AMENDEMENT-29 : « GO » retiré ; le
             libellé = l'objectif). Composant Button partagé : famille, autoshrink
             sans ellipse, plancher tactile, anneau de focus clavier. */}
      <View style={styles.ctaWrap}>
        <Button
          label={objectiveTag}
          onPress={goNow}
          accessibilityLabel={t(C.todayCtaA11y, { objective: objectiveTag })}
          analyticsId="today_start_run"
        />
      </View>

      {/* 3. Compte manquant : invitation SECONDAIRE (ghost), sous le CTA — elle
             répond à la phrase de situation sans concurrencer la décision du
             jour (§A : 1 seul CTA chartreuse, qui reste le départ de course). */}
      {showSignIn ? (
        <View style={styles.signInWrap}>
          <Button
            variant="ghost"
            size="md"
            label={t(C.todaySignIn)}
            onPress={() => router.push('/sign-in')}
            analyticsId="today_sign_in"
          />
        </View>
      ) : null}

      {/* 4. LA SÉRIE — sous le CTA : elle motive la décision sans la
             concurrencer. Elle ne s'affiche que si elle est RÉELLE. */}
      <StreakBlock state={streak} />

      {/* 5. LA raison de revenir aujourd'hui : le parcours d'accueil tant qu'il
             n'est pas fini, puis la Zone du Jour. UN SEUL des deux — l'arbitrage
             est dans le hook. Aucun CTA ici. Rien n'est affiché sans donnée
             réelle ; une lecture RATÉE, elle, le dit (état ③). */}
      <DailyFocusBlock focus={dailyFocus} unavailable={dailyUnavailable} />

      {/* 6. Prochain badge — une LIGNE, pas une carte de collection : c'est une
             invitation douce, pas la décision de l'écran. */}
      {nextBadge ? (
        <View style={styles.badgeBlock}>
          <SectionLabel style={styles.kicker}>{t(C.todayNextBadge)}</SectionLabel>
          <ListRow
            icon="badge"
            label={nextBadge.def.name}
            sublabel={nextBadge.def.requirement}
            chevron
            onPress={() => router.push('/badges')}
          />
        </View>
      ) : null}

      {/* 7. Accès — `ListRow` : plancher tactile, libellé jamais tronqué. */}
      <View style={styles.links}>
        <ListRow
          icon="mission"
          label={t(C.todayMyChallenges)}
          accessibilityLabel={t(C.todayMyChallengesA11y)}
          chevron
          onPress={() => router.push('/challenges')}
        />
        {/* D8 : War Room masquée hors MVP — l'entrée est gardée par le même
            drapeau que la route, donc jamais un bouton mort. */}
        {flags.warRoom ? (
          <ListRow
            icon="guerre"
            label="War Room"
            accessibilityLabel={t(C.todayWarRoomA11y)}
            chevron
            onPress={() => router.push('/warroom')}
          />
        ) : null}
      </View>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  // Rôle R2 (titre d'écran) : la salutation EST le titre de la page, la barre
  // ne portant qu'un rappel de navigation.
  greeting: { ...typography.title, color: colors.blanc, marginTop: spacing.xxs },
  situation: { ...typography.body, color: colors.gris, marginTop: spacing.xxs },

  ctaWrap: { marginTop: spacing.md },
  signInWrap: { marginTop: spacing.sm },

  badgeBlock: { marginTop: spacing.lg },
  kicker: { marginBottom: spacing.sm },
  links: { marginTop: spacing.lg },
});
