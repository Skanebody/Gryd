/**
 * GRYD — HISTORIQUE (AMENDEMENT-17 CHANTIER 3, AMENDEMENT-25 §2) : « l'utilisateur
 * doit retrouver TOUS ses parcours ». Filtres en tête puis la LISTE COMPLÈTE des
 * courses du filtre — PAS de troncature de liste. Analytics : screen('historique').
 *
 * ─── CE QUI A ÉTÉ RÉPARÉ ICI (21/07/2026) ───────────────────────────────────
 * L'écran était câblé en dur sur le vide : `const list = showcase ?
 * runsByFilter(filter) : []`. Hors vitrine — c'est-à-dire sur l'iPhone et sur
 * localhost, les deux seuls endroits qui comptent — la liste ne pouvait
 * MATHÉMATIQUEMENT pas contenir une course, et l'écran servait alors
 * « Tes courses apparaîtront ici après ta première capture. Lance-toi ! ».
 * C'est une AFFIRMATION SUR LE JOUEUR : tu n'as rien couru.
 *
 * Or ses courses existent. `/performance`, atteignable juste au-dessus depuis
 * Profil, les lisait déjà et affichait « 3 courses · 18,4 km ». Deux écrans
 * voisins se contredisaient, et deux CTA de la carte menaient ici depuis une
 * zone que le joueur venait de capturer : il tapait « voir l'historique » sur sa
 * propre conquête et l'app lui répondait qu'il n'avait jamais couru.
 *
 * C'était le TROISIÈME état (fonction non câblée) déguisé en DEUXIÈME (vide
 * légitime). La lecture réelle est désormais branchée (`features/history/real`,
 * table `runs`, RLS `runs_select_own`), et les quatre états sont distincts :
 *   · chargement  → on n'affirme RIEN sur le joueur tant qu'on ne sait pas ;
 *   · pas connecté→ l'historique vit sur le compte → CTA « Se connecter » ;
 *   · échec       → on le dit, et on propose de réessayer ;
 *   · lu, vide    → LÀ, et seulement là, « Lance-toi ! » est vrai.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, gameColors, radii, sizes, spacing, typography } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Card } from '../src/ui/Card';
import { StackScreen } from '../src/ui/StackScreen';
import { useSession } from '../src/lib/session';
import { RealRunCard } from '../src/features/history/RealRunCard';
import {
  filterRuns,
  useMyRunHistory,
  type RealHistoryFilter,
  type RealRunEntry,
} from '../src/features/history/real';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { C } from '../src/i18n/catalog/historique';
import { C as PC } from '../src/i18n/catalog/performance';

/**
 * Filtres, dans l'ordre d'affichage. Il n'y a QUE les natures que la donnée
 * serveur sait distinguer : la barre de démo en comptait cinq, dont « Routes »
 * (boucle ouverte mais fermable), que rien dans `runs` ne permet de reconnaître.
 * Un onglet qui resterait vide à vie n'est pas un filtre, c'est un piège.
 */
const FILTERS: readonly { key: RealHistoryFilter; label: Entry }[] = [
  { key: 'all', label: C.filterAll },
  { key: 'conquest', label: C.filterConquest },
  { key: 'defense', label: C.filterDefense },
  { key: 'stats', label: C.filterStats },
];

/**
 * Barre de filtres horizontale.
 *
 * Ne rend QUE les chips qui portent au moins une course (« Tout » excepté) :
 * une rangée de « Conquêtes 0 · Défenses 0 · Stats seules 0 » répète trois fois
 * la seule information réelle — il n'y a rien — et donne trois boutons qui ne
 * mènent nulle part (§A). Les chips réapparaissent d'elles-mêmes dès la
 * première course de la nature concernée.
 */
function FilterBar({
  counts,
  active,
  onSelect,
}: {
  counts: Readonly<Record<RealHistoryFilter, number>>;
  active: RealHistoryFilter;
  onSelect: (f: RealHistoryFilter) => void;
}) {
  const t = useT();
  const shown = FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0);
  // Un seul filtre utile (« Tout ») = pas de filtre : on n'affiche pas la barre.
  if (shown.length < 2) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterBar}
    >
      {shown.map((f) => {
        const selected = f.key === active;
        const count = counts[f.key];
        const label = t(f.label);
        return (
          <Pressable
            key={f.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t(C.a11yFilter, { label, n: count })}
            onPress={() => onSelect(f.key)}
            style={({ pressed }) => [
              styles.filterChip,
              selected && styles.filterChipOn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.filterLabel, selected && styles.filterLabelOn]}>{label}</Text>
            <Text style={[styles.filterCount, selected && styles.filterCountOn]}>{count}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * Card d'état : ce qui se passe, et AU PLUS une action (§A — un seul CTA
 * chartreuse, et seulement là où il change quelque chose).
 */
function StateCard({
  title,
  body,
  cta,
}: {
  title?: string;
  body: string;
  cta?: { label: string; a11y: string; onPress: () => void };
}) {
  return (
    <Card style={styles.empty}>
      {title !== undefined ? <Text style={styles.emptyTitle}>{title}</Text> : null}
      <Text style={styles.emptyText}>{body}</Text>
      {cta ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={cta.a11y}
          onPress={cta.onPress}
          style={({ pressed }) => [styles.emptyCta, pressed && styles.pressed]}
        >
          <Text style={styles.emptyCtaLabel}>{cta.label}</Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export default function HistoriqueScreen() {
  const t = useT();
  const [filter, setFilter] = useState<RealHistoryFilter>('all');
  const { status, runs, reload } = useMyRunHistory();
  // `configured` = un backend existe. Sans lui, proposer « Se connecter » serait
  // un cul-de-sac : il n'y a personne au bout.
  const { configured } = useSession();

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
  const list: RealRunEntry[] = useMemo(() => filterRuns(runs, filter), [runs, filter]);

  const selectFilter = (f: RealHistoryFilter) => {
    if (f === filter) return;
    haptics.light();
    setFilter(f);
  };

  return (
    <StackScreen
      title={t(C.historiqueTitle)}
      icon="historique"
      kicker={t(C.historiqueKicker)}
      subtitle={t(C.historiqueSubtitle)}
    >
      {/* ── 1. On ne sait pas encore : on ne dit rien du joueur. ── */}
      {status === 'loading' ? <StateCard body={t(PC.loading)} /> : null}

      {/* ── 2. Pas de compte : l'historique vit dessus. Le CTA n'apparaît que
             s'il mène quelque part. ── */}
      {status === 'signed-out' ? (
        <StateCard
          {...(configured ? {} : { title: t(PC.noBackendTitle) })}
          body={configured ? t(C.emptySignedOut) : t(PC.noBackendBody)}
          {...(configured
            ? {
                cta: {
                  label: t(C.emptySignedOutCta),
                  a11y: t(C.a11ySignIn),
                  onPress: () => {
                    haptics.light();
                    router.push('/sign-in');
                  },
                },
              }
            : {})}
        />
      ) : null}

      {/* ── 3. Échec : ses courses existent, on n'a pas su les lire. Dire
             « tu n'as rien couru » ici serait le mensonge d'origine. ── */}
      {status === 'failed' ? (
        <StateCard
          title={t(PC.failedTitle)}
          body={t(PC.failedBody)}
          cta={{
            label: t(PC.retry),
            a11y: t(PC.retry),
            onPress: () => {
              haptics.light();
              reload();
            },
          }}
        />
      ) : null}

      {/* ── 4. Lu. Zéro course est alors un FAIT, pas un trou. ── */}
      {status === 'ready' && runs.length === 0 ? <StateCard body={t(C.emptyRealUser)} /> : null}

      {status === 'ready' && runs.length > 0 ? (
        <>
          <FilterBar counts={counts} active={filter} onSelect={selectFilter} />
          <Text style={styles.sectionLabel}>
            {t(list.length === 1 ? C.countRunsOne : C.countRunsMany, { n: list.length })}
          </Text>
          {list.length === 0 ? (
            /* Il y a des courses, mais aucune dans CE filtre : une absence
               locale, pas un jugement sur le joueur. */
            <StateCard body={t(C.emptyFilter)} />
          ) : (
            <View style={styles.list}>
              {list.map((entry) => (
                <RealRunCard key={entry.id} entry={entry} />
              ))}
            </View>
          )}
        </>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  filterBar: { gap: 8, paddingVertical: 4, paddingRight: 4 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: sizes.touchTarget, // plancher tactile 44
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    paddingHorizontal: spacing.md,
  },
  filterChipOn: { borderColor: gameColors.crew, backgroundColor: colors.chartreuse14 },
  filterLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  filterLabelOn: { color: gameColors.crew },
  filterCount: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  filterCountOn: { color: gameColors.crew },
  sectionLabel: {
    ...typography.kicker,
    color: colors.gris,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm },
  pressed: { opacity: 0.75 },
  // Card fournit fond/rayon/padding (sans contour, règle 80/20) : on ne garde que le centrage.
  empty: { alignItems: 'center', gap: spacing.md },
  emptyTitle: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
  },
  // CTA d'état — chartreuse sur fond sombre, texte NOIR.
  emptyCta: {
    minHeight: sizes.touchTarget,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyCtaLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '700' },
});
