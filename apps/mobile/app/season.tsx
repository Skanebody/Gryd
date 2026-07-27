/**
 * GRYD — E59 « SAISON » (spéc l.1938, route `/season`).
 *
 * ─── CE QUI EXISTAIT DÉJÀ, ET CE QUE CET ÉCRAN AJOUTE ────────────────────────
 * Le MOTEUR de saison était complet avant cet écran : `season_current` (0060),
 * `useActiveSeason`, le moteur pur `seasonProgress` (@klaim/shared), le barème
 * `SEASON_RANK_TIERS` (game-rules) exposé par `seasonRewards.ts`, la courbe
 * d'XP/niveau (`@klaim/engine`) et l'échelle GRIP (`GRIP_RANK_LEVELS`). Ses
 * TEXTES aussi (i18n/catalog/saison.ts, section E59) et son event
 * (`seasonViewed`). Ce qui manquait était l'ÉCRAN : la Saison n'existait que
 * comme un bloc de l'onglet Classement (E11/E12 dans `(tabs)/classement.tsx`).
 *
 * La spéc sépare les deux (E53 « Classement joueurs » vs E59 « Saison ») et §A
 * l'exige : un écran = une décision. `/classement` garde le CLASSEMENT (qui est
 * devant qui) ; ici vit la PROGRESSION personnelle. La frise des paliers a été
 * EXTRAITE (`features/season/SeasonTierList.tsx`) plutôt que recopiée — un seul
 * barème rendu à un seul endroit.
 *
 * ─── COMPOSITION (spéc E59) ──────────────────────────────────────────────────
 *   titre Saison N · temps restant · carte de rang · XP · prochain jalon ·
 *   récompenses de saison · règles · historique saison précédente.
 *
 * ─── CE QUE L'ÉCRAN NE DIRA JAMAIS ──────────────────────────────────────────
 *  · AUCUNE saison inventée. Le numéro et les bornes viennent de la RPC ; sans
 *    saison en base, l'écran dit « aucune saison ouverte » — un état de première
 *    classe, distinct d'un chargement et d'un échec (les quatre états de la
 *    constitution sont ci-dessous, jamais confondus).
 *  · AUCUN rang, AUCUN participant, AUCUN classement fabriqué. Rien ici ne lit
 *    un classement : la « carte de rang » est le rang GRIP, dérivé de MON XP
 *    (`users.xp`, valeur serveur), pas d'une comparaison entre joueurs.
 *  · AUCUN historique d'illustration. « Aucune saison terminée » est l'état
 *    NORMAL aujourd'hui — la base est vide, aucune saison n'a jamais été close.
 *  · AUCUN décompte négatif : une saison dont `ends_at` est passé mais que le
 *    cron n'a pas encore close rend la phase 'ended', et on écrit « clôture en
 *    cours » plutôt que « J-0 ».
 *
 * ─── ANTI-PAY-TO-WIN (constitution §3) — CE QUI EST VÉRIFIÉ ICI ─────────────
 * Cette vague touche les rangs : c'est exactement là qu'un avantage payant se
 * glisserait. Il n'y en a aucun, et c'est vérifiable :
 *  · le rang GRIP dépend de `users.xp`, crédité UNIQUEMENT par `claim_hexes`
 *    (D18) à partir d'une course validée serveur ;
 *  · les paliers de saison dépendent du RANG au classement, calculé par
 *    `season_close` sur des points de territoire ;
 *  · aucun chemin d'achat n'est importé ici (ni `usePremium`, ni l'Arsenal, ni
 *    RevenueCat), et la copie l'énonce (`regleRecompensesCosmetiques`,
 *    `xpPermanent` : « ne s'achète pas »).
 *
 * ─── UN SEUL CTA CHARTREUSE (§A.4) ──────────────────────────────────────────
 * Aucun. Cet écran se CONSULTE : il n'a pas de décision à porter. Le seul bouton
 * plein qui peut apparaître est « Réessayer » sur l'état d'échec — et il n'est
 * peint que là, parce que c'est le seul moment où une action existe vraiment.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import {
  EVENTS,
  INTERSEASON_DAYS,
  SEASON_DURATION_WEEKS,
  colors,
  elevation,
  fonts,
  fontSizes,
  iconSizes,
  radii,
  seasonProgress,
  spacing,
} from '@klaim/shared';
import { flags } from '../src/lib/flags';
import {
  GRIP_RANK_LABELS,
  playerLevelForXp,
  playerLevelXpTable,
} from '../src/features/crew/rules';
import { useActivityLens } from '../src/ui/ActivitySwitch';
import { useActiveSeason } from '../src/features/season/useActiveSeason';
import { useCitySeasons } from '../src/features/season/useCitySeasons';
import { levelProgress, rankMilestoneFor } from '../src/features/season/rankMilestone';
import { SeasonTierList } from '../src/features/season/SeasonTierList';
import { useMyBadges } from '../src/features/badges/myBadges';
import { useMyEconomy } from '../src/features/social/economy';
import { C as S } from '../src/i18n/catalog/saison';
import { useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { formatInt } from '../src/ui/format';
import { screen, track } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { ProgressBar } from '../src/ui/ProgressBar';
import { StackScreen } from '../src/ui/StackScreen';

/** Table d'XP cumulée : une seule courbe, calculée une fois pour le module. */
const XP_TABLE = playerLevelXpTable();

/**
 * ROUTE = LE GARDE, et rien d'autre (même patron que `(tabs)/classement.tsx`).
 * Ce composant n'appelle AUCUN hook : sa sortie anticipée est donc inoffensive.
 */
export default function SeasonRoute() {
  // Même drapeau que le classement : Saison est UNE surface, elle s'ouvre et se
  // ferme d'un bloc. Les scores continuent d'accumuler côté serveur quoi qu'il
  // arrive — on cache l'écran, jamais le moteur.
  if (!flags.season) return <Redirect href="/" />;
  return <SeasonScreen />;
}

function SeasonScreen() {
  const t = useT();
  /**
   * La lentille est celle du CLASSEMENT, volontairement partagée : `/season` est
   * poussé depuis `/classement`, et la discipline doit VOYAGER (même raison que
   * `plannerHref(activity)`). Cet écran ne peint PAS de commutateur — il n'a
   * aucune lecture comparative à basculer, et un contrôle qui ne change rien de
   * visible serait un bouton mort. Ce que la lentille borne ici est unique et
   * réel : le rang final lu sur la saison précédente (E59 « rangs séparés »).
   */
  const { activity } = useActivityLens('classement');

  const { status: seasonStatus, season, reload: reloadSeason } = useActiveSeason();
  const prog = season ? seasonProgress(season.startsAt, season.endsAt) : null;

  const economy = useMyEconomy(activity);
  const badges = useMyBadges();
  const history = useCitySeasons(activity);

  /**
   * ─── LES QUATRE ÉTATS NE SE DEVINENT PAS PAR L'ÉCONOMIE (28/07/2026) ──────
   * Cet écran dérivait « pas connecté » de `economy.source !== 'server' &&
   * !economy.loading`. Or `useMyEconomy` rend EXACTEMENT cette signature sur un
   * ÉCHEC DE LECTURE (economy.ts : `source:'none'`, `loading:false`,
   * `failed:true`) — et `economy.failed` n'était lu NULLE PART ici. Le cas est
   * documenté par le dépôt lui-même : sans la colonne `season_scores.activity`
   * (migration 0070), la lecture de l'économie ÉCHOUE tandis que la RPC
   * `season_current` (0060), indépendante, réussit et rend 0 ligne. Un joueur
   * CONNECTÉ lisait alors « Connecte-toi pour suivre ta saison », sa carte de
   * rang disparaissait sans un mot, et l'event §18 partait en `signed_out`.
   *
   * La session est désormais lue À LA SOURCE. `sessionLoading` prime : pendant
   * la restauration, on ne SAIT pas — et un chargement n'affirme rien sur le
   * joueur.
   */
  const { session, loading: sessionLoading } = useSession();
  const signedOut = !session && !sessionLoading;
  /** Connecté, mais l'économie n'a pas pu être lue. Ni un vide, ni une absence de compte. */
  const economyFailed = !signedOut && !sessionLoading && economy.failed;

  useEffect(() => {
    screen('season');
  }, []);

  // §18 — l'écran s'est composé, avec la PHASE réelle et l'état de lecture.
  // `state` est l'état de la SAISON (le sujet de l'écran), pas celui des badges.
  useEffect(() => {
    // `state` est l'état de la SAISON, et il se lit sur la saison :
    // `seasonStatus === 'none'` veut dire que `season_current` a RÉPONDU et
    // rendu zéro ligne. Le distinguo « pas de compte » vient de la SESSION, plus
    // de l'économie — dont l'échec (bloc XP ci-dessous) est un autre sujet et
    // n'a jamais rien dit sur l'existence d'une saison.
    const state =
      seasonStatus === 'loading' || sessionLoading
        ? null // rien à mesurer tant qu'on ne sait rien
        : seasonStatus === 'error'
          ? 'failed'
          : seasonStatus === 'none'
            ? signedOut
              ? 'signed_out'
              : 'none'
            : 'ready';
    if (state === null) return;
    track(EVENTS.seasonViewed, { phase: prog?.phase ?? 'upcoming', activity, state });
  }, [seasonStatus, signedOut, sessionLoading, prog?.phase, activity]);

  // ── XP RÉEL et rang GRIP (mono-pot, assumé : c'est une progression
  //    personnelle, pas un rang comparatif — cf. migration 0070 § 3) ──
  const xpKnown = economy.source === 'server';
  const level = playerLevelForXp(economy.xp);
  const levelState = levelProgress(economy.xp, XP_TABLE, level);
  const milestone = rankMilestoneFor(level);

  const badgesKnown = badges.source === 'server' && !badges.loading;
  // Note des badges : leur propre état, dans l'ordre des quatre. « Connecte-toi »
  // ne sort plus d'une inférence sur l'économie — il sort de l'absence RÉELLE de
  // session, sinon un échec de lecture s'affichait comme une absence de compte.
  const badgeNote = badges.loading || sessionLoading
    ? S.badgesLecture
    : signedOut
      ? S.badgesConnexion
      : badges.failed
        ? S.badgesEchec
        : null;

  // ── LES QUATRE ÉTATS DE LA SAISON, JAMAIS CONFONDUS ──
  const body = (() => {
    if (seasonStatus === 'loading') {
      return <Text style={styles.stateNote}>{t(S.ecranChargement)}</Text>;
    }
    if (seasonStatus === 'error') {
      return (
        <View style={styles.stateBlock}>
          <Text style={styles.stateTitle}>{t(S.ecranEchecTitre)}</Text>
          <Text style={styles.stateBody}>{t(S.ecranEchecCorps)}</Text>
          <Button label={t(S.ecranReessayer)} onPress={reloadSeason} variant="ghost" size="md" />
        </View>
      );
    }
    if (seasonStatus === 'none') {
      // Deux causes, DEUX textes : pas de compte / lu et aucune saison ouverte.
      // `signedOut` vient de la SESSION (voir plus haut) : le dériver de
      // l'économie confondait un échec de lecture avec une absence de compte.
      return (
        <View style={styles.stateBlock}>
          <Text style={styles.stateTitle}>
            {t(signedOut ? S.ecranDeconnecteTitre : S.ecranAucuneSaisonTitre)}
          </Text>
          <Text style={styles.stateBody}>
            {t(signedOut ? S.ecranDeconnecteCorps : S.ecranAucuneSaisonCorps)}
          </Text>
        </View>
      );
    }
    return null;
  })();

  return (
    <StackScreen
      title={t(S.ecranTitre)}
      icon="couronne"
      kicker={
        seasonStatus === 'active' && season
          ? t(S.kickerSaison, { n: season.number })
          : seasonStatus === 'error'
            ? t(S.kickerIndispo)
            : seasonStatus === 'none'
              ? t(S.kickerPasOuverte)
              : undefined
      }
      backHref="/classement"
    >
      {/* ── 1 · TEMPS RESTANT — décompte RÉEL, jamais négatif ── */}
      {seasonStatus === 'active' && prog ? (
        <View style={styles.countdown}>
          <Text style={styles.countdownLabel}>
            {prog.phase === 'ended'
              ? t(S.classementGele)
              : prog.joursRestants <= 1
                ? t(S.finAujourdhui)
                : t(S.finDansJours, { n: formatInt(prog.joursRestants) })}
          </Text>
          <ProgressBar value={prog.pct} />
        </View>
      ) : null}

      {body}

      {/* ══════════ 2 · TA PROGRESSION — XP RÉEL + rang GRIP ══════════
          Affiché SEULEMENT si `users.xp` a été lu pour CE compte. Une barre sans
          dénominateur, ou posée sur un zéro d'échec, se lirait « tu n'as rien
          fait » : sans lecture, on n'affiche pas la carte, on affiche la note
          d'état (badgeNote couvre les mêmes trois causes). */}
      {xpKnown ? (
        <>
          <Section icon="niveau" label={t(S.sectionXp)} />
          <View style={styles.rankCard}>
            <View style={styles.rankHead}>
              {/* Rang GRIP TRADUIT (i18n/catalog/rang.ts) — plus de nom français
                  en dur dans les cinq langues. */}
              <Text style={styles.rankName}>{t(GRIP_RANK_LABELS[milestone.current.rank])}</Text>
              <Text style={styles.rankLevel}>{`LVL ${formatInt(level)}`}</Text>
            </View>
            <ProgressBar value={levelState.ratio} />
            {/* La ligne « n / max XP vers le niveau L+1 » n'existe QUE s'il y a
                un niveau au-dessus. Au plafond, l'écrire avec `max = plancher` et
                `level = 50` afficherait « 12 000 / 12 000 XP vers le niveau 50 »
                à quelqu'un QUI EST niveau 50 : un objectif déjà atteint présenté
                comme un objectif. On la retire — le niveau est déjà lisible à
                droite du rang, et rien ne manque. */}
            {levelState.ceilXp === null ? null : (
              <Text style={styles.rankMeta}>
                {t(S.xpVersNiveau, {
                  n: formatInt(economy.xp),
                  max: formatInt(levelState.ceilXp),
                  level: formatInt(level + 1),
                })}
              </Text>
            )}
            <Text style={styles.rankMeta}>{t(S.xpPermanent)}</Text>
          </View>

          {/* ── 3 · PROCHAIN JALON — le rang suivant, ou rien au-dessus ── */}
          <Section icon="cible" label={t(S.prochainJalon)} />
          <Text style={styles.paragraph}>
            {milestone.next === null
              ? t(S.prochainJalonAucun)
              : t(S.prochainJalonRang, {
                  rank: t(GRIP_RANK_LABELS[milestone.next.rank]),
                  level: formatInt(milestone.next.level),
                })}
          </Text>
        </>
      ) : economy.loading || sessionLoading ? (
        /* ── ④ LECTURE EN COURS — une ligne, qui n'affirme rien sur le joueur. */
        <>
          <Section icon="niveau" label={t(S.sectionXp)} />
          <Text style={styles.stateNote}>{t(S.xpLecture)}</Text>
        </>
      ) : economyFailed ? (
        /* ── ③ ÉCHEC DE LECTURE — DIT, avec de quoi réessayer. C'est le cas que
              l'écran confondait avec « pas de compte » : la carte de rang
              disparaissait en silence et la note disait « Connecte-toi » à
              quelqu'un qui l'était. Un chemin de lecture peut tomber sans que
              l'autre tombe (economy.ts §« dépendance de déploiement »). */
        <>
          <Section icon="niveau" label={t(S.sectionXp)} />
          <View style={styles.stateBlock}>
            <Text style={styles.stateTitle}>{t(S.xpEchecTitre)}</Text>
            <Text style={styles.stateBody}>{t(S.xpEchecCorps)}</Text>
            <Button
              label={t(S.ecranReessayer)}
              onPress={economy.reload}
              variant="ghost"
              size="md"
            />
          </View>
        </>
      ) : null
      /* ① pas connecté : rien ici — la note des badges le dit déjà une fois, et
         §A interdit de répéter la même phrase deux fois sur un écran. */
      }

      {/* ══════════ 4 · RÉCOMPENSES DE SAISON ══════════
          Les paliers RÉELS que `season_close` décerne, avec leur condition en
          clair. Le statut « Obtenu » est LU dans `user_badges` ; tant que la
          lecture n'a rien établi, aucun statut n'est peint. */}
      <Section icon="cadeau" label={t(S.recompensesSaison)} />
      {badgeNote ? <Text style={styles.stateNote}>{t(badgeNote)}</Text> : null}
      <SeasonTierList unlocked={badgesKnown ? badges.unlockedIds : null} />

      {/* ══════════ 5 · LES RÈGLES ══════════
          Durées LUES dans game-rules (jamais retapées), et les deux lignes de
          reset qui disent ce que le MOTEUR fait — y compris que la carte est
          effacée, ce que la planche adoucissait. */}
      <Section icon="info" label={t(S.sectionRegles)} />
      <Text style={styles.paragraph}>{t(S.regleRangsSepares)}</Text>
      <Text style={styles.paragraph}>
        {t(S.regleDuree, {
          weeks: formatInt(SEASON_DURATION_WEEKS),
          days: formatInt(INTERSEASON_DAYS),
        })}
      </Text>
      <Text style={styles.paragraph}>{t(S.regleRecompensesCosmetiques)}</Text>
      <Text style={styles.paragraph}>{t(S.resetLigne1)}</Text>
      <Text style={styles.paragraph}>{t(S.resetLigne2)}</Text>

      {/* ══════════ 6 · SAISON PRÉCÉDENTE ══════════
          L'état DOMINANT aujourd'hui est « aucune saison terminée » : la base est
          vide. Il est de première classe, et distinct d'un échec de lecture. */}
      <Section icon="historique" label={t(S.sectionHistorique)} />
      {history.status === 'loading' ? (
        <Text style={styles.stateNote}>{t(S.ecranChargement)}</Text>
      ) : history.status === 'signed-out' ? (
        // Sans compte, on ne SAIT PAS s'il y a un historique : dire « aucune
        // saison terminée » serait affirmer à la place du serveur.
        <Text style={styles.paragraph}>{t(S.ecranDeconnecteCorps)}</Text>
      ) : history.status === 'failed' ? (
        <Text style={styles.stateNote}>{t(S.histoEchec)}</Text>
      ) : history.previous === null ? (
        <Text style={styles.paragraph}>{t(S.histoAucune)}</Text>
      ) : (
        <>
          <Text style={styles.paragraph}>
            {history.previousRank === null
              ? t(S.histoSansRang, { n: formatInt(history.previous.number) })
              : t(S.histoLigne, {
                  n: formatInt(history.previous.number),
                  rank: formatInt(history.previousRank),
                })}
          </Text>
          {/* Le bilan complet (E61) n'est proposé QUE si une saison est
              réellement terminée — sinon ce lien mènerait à un écran vide. */}
          <Button
            label={t(S.histoVoirBilan)}
            onPress={() => router.push('/fin-saison')}
            variant="ghost"
            size="md"
          />
        </>
      )}
    </StackScreen>
  );
}

/** En-tête de section : icône + libellé, posé sur l'espace (jamais une card). */
function Section({ icon, label }: { icon: 'niveau' | 'cible' | 'cadeau' | 'info' | 'historique'; label: string }) {
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={iconSizes.sm} color={colors.gris} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Décompte de saison ──
  countdown: { gap: spacing.xs, marginBottom: spacing.sm },
  countdownLabel: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },

  // ── Sections ──
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2 },

  // ── Card RANG (une seule couche de container — jamais de card dans card) ──
  rankCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  rankHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  rankName: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontFamily: fonts.display,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  rankLevel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.4,
    fontVariant: ['tabular-nums'],
  },
  rankMeta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    fontVariant: ['tabular-nums'],
  },

  // ── Paragraphes de règles / historique : texte à plat, jamais tronqué ──
  paragraph: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.55,
    marginBottom: spacing.xs,
  },
  stateNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.sm,
  },
  stateBlock: { gap: spacing.sm, marginTop: spacing.md, alignItems: 'flex-start' },
  stateTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '700',
  },
  stateBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.55 },
});
