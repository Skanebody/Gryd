/**
 * GRYD — HISTORIQUE (/historique, planche E14). « L'utilisateur doit retrouver
 * TOUS ses parcours » : la LISTE COMPLÈTE des courses du filtre, jamais tronquée.
 *
 * ─── ORDRE DE COMPOSITION ───────────────────────────────────────────────────
 *   1. `StackScreen` : retour + titre + kicker mono gris + sous-titre, et le
 *      commutateur Run / Bike (planche E14) en `headerRight` ;
 *   2. l'ÉTAT de la page — un seul à la fois, chacun avec sa forme propre :
 *      lentille Bike / lecture en cours / pas de compte / sans backend /
 *      échec / lu-et-vide ;
 *   3. le groupe de filtres (`Segmented` `tone="surface"` `scrollable`) ;
 *   4. le kicker de comptage (`SectionLabel`) ;
 *   5. la liste des courses (`RealRunCard`) ;
 *   6. en gris, en bas, APRÈS la liste : ce qui n'existe pas encore.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ───────────────────────────────────────
 * · LA BARRE DE CHIPS RECODÉE (Pressable bordés 1 px, chartreuse sur le chip
 *   sélectionné). Deux fautes : un groupe de choix se dit avec `Segmented`, et
 *   l'accent chartreuse ne se dépense pas sur un FILTRE — il est réservé à la
 *   décision de l'écran. Le sélectionné passe en surface N2 (`tone="surface"`).
 * · LE CTA RECODÉ de la card d'état (Pressable + fond chartreuse à la main),
 *   remplacé par `<Button>` : il apporte l'anneau de focus clavier, le libellé
 *   qui rétrécit sans ellipse et un `analyticsId` stable non-PII.
 * · LA CARD CENTRÉE de chargement, devenue une LIGNE grise non tapable. Un
 *   chargement n'est pas un message : il n'affirme rien, il occupe le moins de
 *   place possible.
 * · Le tri des filtres visibles, sorti du JSX vers `visibleHistoryFilters`
 *   (fonction pure testée) : « un seul filtre utile n'est pas un filtre ».
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ────────────────────────────────────────────
 * · PAS DE VIGNETTE DE TRACÉ sur les lignes de course, et le sous-titre ne la
 *   promet plus. Raison technique : `runs.polyline_masked` n'est pas décodé
 *   (décodage + projection = chantier à part) — cf. `RealRunCard`.
 * · AUCUNE LIGNE N'EST CLIQUABLE. Raison technique : `/course/[id]` ne sait
 *   résoudre aucun identifiant (`findRealRun()` retourne `undefined`, O1). On
 *   ne peint pas une action qui échouerait ; l'absence est ÉCRITE en pied de
 *   page, en gris, après la liste (patron `qr.tsx`).
 * · PAS DE PAGINATION. Raison technique : la lecture est bornée à 200 courses
 *   (`HISTORY_LIMIT`) ; au-delà il faudra un vrai « plus ancien », pas une
 *   troncature silencieuse — l'écran promet « TOUS tes parcours ».
 *
 * ─── LES CINQ ÉTATS, JAMAIS CONFONDUS ───────────────────────────────────────
 * L'écran était câblé en dur sur le vide hors vitrine : la liste ne pouvait
 * MATHÉMATIQUEMENT pas contenir une course, et il servait alors « Tes courses
 * apparaîtront ici… ». C'était une AFFIRMATION SUR LE JOUEUR — le troisième
 * état (fonction non câblée) déguisé en deuxième (vide légitime). La lecture
 * réelle est branchée (`features/history/real`, table `runs`, RLS
 * `runs_select_own`), et les états sont distincts :
 *   · chargement   → on n'affirme RIEN tant qu'on ne sait pas ;
 *   · pas connecté → l'historique vit sur le compte → CTA « Se connecter » ;
 *   · sans backend → il n'y a personne au bout : une phrase, PAS de bouton ;
 *   · échec        → on le dit, et on propose de réessayer ;
 *   · lu, vide     → LÀ, et seulement là, « Lance-toi ! » est vrai.
 *
 * ─── COMMUTATEUR RUN / BIKE (planche E14) ───────────────────────────────────
 * Sa lentille est mémorisée POUR CET ONGLET (`useActivityLens`, clé
 * `gryd.activity.historique`) : la basculer ici ne touche ni la Carte ni le
 * Classement. Pendant une course, elle est mise EN VEILLE — sinon un joueur
 * resté en Bike se retrouverait devant un état vide qu'aucun contrôle visible
 * ne pourrait quitter.
 *
 * CE QU'IL FAIT DEPUIS LE 26/07/2026 : il BASCULE UNE VRAIE LECTURE. La liste
 * était auparavant remplacée, en lentille Bike, par un état vide expliquant que
 * « GRYD ne chronomètre pas encore le vélo » — pas une ligne de `runs` n'était
 * rendue, parce qu'aucune sortie vélo ne pouvait exister. Le vélo enregistre
 * désormais (décision fondateur ; `runs.activity`, migration 0070 appliquée le
 * 25/07) : `useMyRunHistory(activity)` borne sa lecture par `.eq('activity', …)`
 * et l'écran affiche les VRAIES sorties de la discipline choisie.
 *
 * Il ne réétiquette toujours RIEN : les courses à pied ne sont jamais rendues
 * sous une étiquette vélo — c'est le filtre SQL qui le garantit, pas une
 * branche d'affichage. Et quand la lentille vélo est vide, ce n'est plus une
 * absence de fonctionnalité : c'est le début de CE joueur dans cette
 * discipline, dit comme tel, avec le geste qui le remplit.
 *
 * ─── LA COPIE SUIT LA LECTURE (26/07/2026, seconde passe) ───────────────────
 * La bascule de lecture était juste ; les MOTS ne suivaient pas. La branche
 * `bike` de cet écran était imbriquée dans « lu ET zéro sortie » : elle ne
 * couvrait donc QUE l'état vide. Un cycliste qui a des sorties atteignait la
 * branche PEUPLÉE et y lisait « {n} courses », « Filtrer tes courses » (LU À
 * VOIX HAUTE), « Aucune course dans ce filtre » — et, pire, le kicker
 * « TES COURSES », rendu HORS de toute branche, s'affichait même au-dessus de
 * l'état vide vélo qui explique deux lignes plus bas que les sorties vélo sont
 * comptées à part. L'écran se contredisait sur le même écran.
 *
 * Le correctif ne rajoute PAS de `bike ? … : …` — c'est cette forme qui avait
 * laissé passer la moitié de la page. Les libellés qui NOMMENT l'effort sont
 * indexés par `Activity` dans les catalogues (`historyCopy`, `statsCopy`), et
 * l'écran lit ce jeu-là. Ce qui est déjà NEUTRE (« Historique », les filtres,
 * « Réessayer », « Se connecter ») reste unique : dupliquer à l'identique
 * créerait deux vérités à maintenir.
 *
 * Analytics : screen('historique') au montage (§8). Aucun event inventé pour un
 * changement de filtre — on n'en crée pas hors `packages/shared/src/events.ts`.
 */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, spacing, typography } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card } from '../src/ui/Card';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { Segmented } from '../src/ui/game/Segmented';
import { ActivitySwitch, useActivityLens } from '../src/ui/ActivitySwitch';
import { startSortieHref } from '../src/ui/activityLens';
import { useSession } from '../src/lib/session';
import { RealRunCard } from '../src/features/history/RealRunCard';
import { visibleHistoryFilters } from '../src/features/history/historyView';
import {
  filterRuns,
  useMyRunHistory,
  type RealHistoryFilter,
  type RealRunEntry,
} from '../src/features/history/real';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { C, historyCopy } from '../src/i18n/catalog/historique';
import { C as PC, statsCopy } from '../src/i18n/catalog/performance';

/**
 * Libellé de chaque filtre. Il n'y a QUE les natures que la donnée serveur sait
 * distinguer : la barre de démo en comptait cinq, dont « Routes » (boucle
 * ouverte mais fermable), que rien dans `runs` ne permet de reconnaître. Un
 * onglet qui resterait vide à vie n'est pas un filtre, c'est un piège.
 */
const FILTER_LABELS: Readonly<Record<RealHistoryFilter, Entry>> = {
  all: C.filterAll,
  conquest: C.filterConquest,
  defense: C.filterDefense,
  stats: C.filterStats,
};

/**
 * Card d'état : ce qui se passe, et AU PLUS une action (§A — un seul CTA
 * chartreuse, et seulement là où il change quelque chose).
 */
function StateCard({
  title,
  body,
  note,
  cta,
}: {
  title?: string;
  body: string;
  /** Seconde ligne FACTUELLE (ex. « tes courses à pied restent intactes »). */
  note?: string;
  cta?: { label: string; a11y: string; analyticsId: string; onPress: () => void };
}) {
  return (
    <Card style={styles.state}>
      {title !== undefined ? <Text style={styles.stateTitle}>{title}</Text> : null}
      <Text style={styles.stateBody}>{body}</Text>
      {note !== undefined ? <Text style={styles.stateBody}>{note}</Text> : null}
      {cta ? (
        <View style={styles.stateCta}>
          <Button
            label={cta.label}
            accessibilityLabel={cta.a11y}
            analyticsId={cta.analyticsId}
            size="md"
            onPress={cta.onPress}
          />
        </View>
      ) : null}
    </Card>
  );
}

export default function HistoriqueScreen() {
  const t = useT();
  const [filter, setFilter] = useState<RealHistoryFilter>('all');
  // LENTILLE de CET onglet (planche E14, « mémorisé par onglet ») + éligibilité
  // du commutateur (flags.bike, retiré pendant une course).
  const { activity, setActivity, switchVisible } = useActivityLens('historique');
  // La lecture SUIT la lentille : deux mondes, deux listes, jamais une somme.
  const { status, runs, reload } = useMyRunHistory(activity);
  // `configured` = un backend existe. Sans lui, proposer « Se connecter » serait
  // un cul-de-sac : il n'y a personne au bout (le bouton mort de §A).
  const { configured } = useSession();
  const bike = activity === 'bike';
  /**
   * LA COPIE SUIT LA LECTURE (26/07/2026). L'écran lisait déjà par discipline
   * (`useMyRunHistory(activity)`) mais parlait d'une seule : sa branche `bike`
   * était imbriquée dans « lu ET zéro sortie », donc un cycliste qui A des
   * sorties lisait « TES COURSES », « {n} courses », « Filtrer tes courses ».
   * Ces deux jeux de libellés sont indexés par `Activity` dans les catalogues :
   * pas un `bike ? … : …` de plus dans le JSX — c'est cette forme-là qui avait
   * laissé passer la moitié de l'écran.
   */
  const H = historyCopy(activity);
  const S = statsCopy(activity);

  useEffect(() => {
    screen('historique');
  }, []);

  const counts = useMemo<Record<RealHistoryFilter, number>>(
    () => ({
      all: runs.length,
      conquest: runs.filter((r) => r.kind === 'conquest').length,
      defense: runs.filter((r) => r.kind === 'defense').length,
      stats: runs.filter((r) => r.kind === 'stats').length,
    }),
    [runs],
  );
  /** Les filtres qui mènent quelque part (fonction pure testée). */
  const filterOptions = useMemo(
    () =>
      visibleHistoryFilters(counts).map((key) => ({
        id: key,
        label: t(C.filterWithCount, { label: t(FILTER_LABELS[key]), n: counts[key] }),
      })),
    [counts, t],
  );
  /**
   * Le filtre RÉELLEMENT appliqué. Une nature peut disparaître de la barre
   * entre deux lectures (dernière course de ce type effacée côté serveur) :
   * sans ce repli, la liste resterait filtrée par un choix qu'AUCUN contrôle
   * visible ne permet plus d'annuler — un cul-de-sac silencieux.
   */
  const activeFilter: RealHistoryFilter = filterOptions.some((o) => o.id === filter)
    ? filter
    : 'all';
  const list: RealRunEntry[] = useMemo(
    () => filterRuns(runs, activeFilter),
    [runs, activeFilter],
  );

  return (
    <StackScreen
      title={t(C.historiqueTitle)}
      icon="historique"
      kicker={t(H.kicker)}
      subtitle={t(H.subtitle)}
      {...(switchVisible
        ? {
            headerRight: (
              <ActivitySwitch
                activity={activity}
                onChange={setActivity}
                runLabel={t(C.activityRunA11y)}
                bikeLabel={t(C.activityBikeA11y)}
                testID="historique-activity-switch"
              />
            ),
          }
        : {})}
    >
      {/* ── 1. On ne sait pas encore : une LIGNE grise, pas une card.
             Un chargement n'affirme rien et ne mérite pas une surface. ── */}
      {status === 'loading' ? <Text style={styles.stateInline}>{t(S.loading)}</Text> : null}

      {/* ── 2. Pas de compte : l'historique vit dessus. Le CTA n'apparaît que
             s'il mène quelque part — sans backend, une phrase le remplace. ── */}
      {status === 'signed-out' ? (
        <StateCard
          {...(configured ? {} : { title: t(S.noBackendTitle) })}
          body={configured ? t(H.emptySignedOut) : t(PC.noBackendBody)}
          {...(configured
            ? {
                cta: {
                  label: t(C.emptySignedOutCta),
                  a11y: t(H.a11ySignIn),
                  analyticsId: 'historique_sign_in',
                  onPress: () => router.push('/sign-in'),
                },
              }
            : {})}
        />
      ) : null}

      {/* ── 3. Échec : ses courses existent, on n'a pas su les lire. Dire
             « tu n'as rien couru » ici serait le mensonge d'origine. ── */}
      {status === 'failed' ? (
        <StateCard
          title={t(S.failedTitle)}
          body={t(PC.failedBody)}
          cta={{
            label: t(PC.retry),
            a11y: t(PC.retry),
            analyticsId: 'historique_retry',
            onPress: reload,
          }}
        />
      ) : null}

      {/* ── 4. Lu. Zéro sortie est alors un FAIT, pas un trou — et la
             LENTILLE choisit les mots, parce qu'elle choisit le geste : on
             ne dit pas « cours » à quelqu'un qui regarde son monde vélo, et
             le CTA DÉCLARE la discipline qu'il lance (jamais devinée depuis
             la lentille — cf. `startSortieHref`). ── */}
      {status === 'ready' && runs.length === 0 ? (
        bike ? (
          <StateCard
            title={t(C.bikeEmptyTitle)}
            body={t(C.bikeEmptyBody)}
            note={t(C.bikeEmptyRunSafe)}
            cta={{
              label: t(C.bikeEmptyCta),
              a11y: t(C.bikeEmptyCta),
              analyticsId: 'historique_bike_start',
              onPress: () => router.push(startSortieHref('bike')),
            }}
          />
        ) : (
          <StateCard body={t(C.emptyRealUser)} />
        )
      ) : null}

      {status === 'ready' && runs.length > 0 ? (
        <>
          {/* Groupe de choix UNIQUE, `tone="surface"` (l'accent chartreuse
              ne se dépense pas sur un filtre) et `scrollable` : aucun
              libellé n'est jamais coupé, on fait défiler. */}
          {filterOptions.length > 0 ? (
            <Segmented
              options={filterOptions}
              value={activeFilter}
              onChange={setFilter}
              tone="surface"
              scrollable
              accessibilityLabel={t(H.a11yFilterGroup)}
              style={styles.filters}
            />
          ) : null}
          <SectionLabel style={styles.count}>
            {t(list.length === 1 ? H.countOne : H.countMany, { n: list.length })}
          </SectionLabel>
          {list.length === 0 ? (
            /* Il y a des sorties, mais aucune dans CE filtre : une absence
               locale, pas un jugement sur le joueur. */
            <StateCard body={t(H.emptyFilter)} />
          ) : (
            <View style={styles.list}>
              {list.map((entry) => (
                <RealRunCard key={entry.id} entry={entry} />
              ))}
            </View>
          )}
          {/* Ce qui n'existe pas encore, dit à sa place : en bas, en gris,
              APRÈS la liste — jamais en travers de l'écran. */}
          <Text style={styles.footnote}>{t(H.detailPendingNote)}</Text>
        </>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  filters: { marginTop: spacing.md },
  count: { marginTop: spacing.xl, marginBottom: spacing.sm },
  list: { gap: spacing.sm },

  // Card fournit fond/rayon/padding (sans contour, règle 80/20) : on ne garde
  // que le centrage et le rythme interne.
  state: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  // R3 — titre de card : le rôle typo, jamais une famille + un poids recodés.
  stateTitle: { ...typography.cardTitle, color: colors.blanc, textAlign: 'center' },
  stateBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
  },
  stateCta: { alignSelf: 'stretch', marginTop: spacing.xxs },
  // LECTURE EN COURS — une ligne, non tapable, jamais un spinner plein écran.
  stateInline: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: spacing.md,
  },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xl,
  },
});
