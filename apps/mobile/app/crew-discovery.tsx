/**
 * GRYD — E39 · DÉCOUVERTE DES CREWS (route `/crew-discovery`).
 *
 * ══ CE QUE CET ÉCRAN REMPLACE ═════════════════════════════════════════════
 * Un `<Redirect href="/crew"/>`. La version d'avant listait des crews INVENTÉS
 * (`features/crew/publicDemo`) avec des filtres calculés sur ces mêmes données
 * fabriquées et un « Demander à rejoindre » qui n'écrivait NULLE PART ; la fin
 * du mode vitrine (A-47) l'a réduite à une redirection, et le manque a été
 * inscrit en suspens plutôt que maquillé.
 *
 * Ce fichier lève ce suspens avec des données SERVEUR : `crew_discovery`
 * (migration 0083), SECURITY DEFINER, qui ne renvoie que des faits calculés
 * FRAIS — jamais `crews.code` (secret depuis 0036), jamais une identité de
 * membre (§12), jamais les colonnes `activity_score`/`league`/`xp` qu'aucun job
 * du dépôt n'alimente (elles vaudraient leur défaut et peindraient un
 * écosystème entier de crews « dormants en bronze » sans qu'on ait rien mesuré).
 *
 * ══ SIX ÉTATS DISTINCTS, JAMAIS CONFONDUS ═════════════════════════════════
 *   pas connecté · lecture EN COURS · échec de lecture · ville inconnue ·
 *   lu et VIDE · lu avec des crews.
 * Le couple qui compte : « lu et vide » AFFIRME qu'aucun crew ne court ici ;
 * « échec » n'affirme rien du tout. Les rendre pareil serait le mensonge le
 * plus facile de cet écran.
 *
 * ══ UN SEUL ÉCRAN, UNE SEULE DÉCISION (§A) ════════════════════════════════
 * Ici on CHOISIT un crew — on ne le rejoint pas. Aucune adhésion ne part de
 * cette liste : le tap ouvre la fiche publique (E40), où la décision se prend
 * avec les faits sous les yeux. Conséquence directe : AUCUN CTA chartreuse sur
 * cet écran hors état d'échec, donc aucun risque d'en peindre un qui échouerait
 * (§A4).
 *
 * ══ LE CLASSEMENT N'EST PAS ICI ═══════════════════════════════════════════
 * La pertinence §E39 (ville > amis > activité > capacité > compatibilité) est
 * PURE et testée : `features/crew/discovery.ts` + `discovery.test.ts`. Cet
 * écran appelle `rankCrews`, il ne trie rien lui-même.
 */
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  colors,
  elevation,
  fonts,
  fontSizes,
  iconSizes,
  radii,
  sizes,
  spacing,
} from '@klaim/shared';
import { C } from '../src/i18n/catalog/crew';
import { C as CityC } from '../src/i18n/catalog/city';
import { useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { Segmented } from '../src/ui/game/Segmented';
import { CityField, type CityEntry } from '../src/features/city/CityPicker';
import {
  applyFilter,
  isJoinable,
  rankCrews,
  seatsLeft,
  type DiscoveryCrew,
  type DiscoveryFilter,
} from '../src/features/crew/discovery';
import { useCrewDiscovery } from '../src/features/crew/discoveryData';

/** Un jour en millisecondes — unité de TEMPS, pas une constante de jeu. */
const DAY_MS = 86_400_000;

export default function CrewDiscoveryRoute() {
  const t = useT();
  const { session } = useSession();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DiscoveryFilter>('all');
  /**
   * Ville CHOISIE à la main. `null` = « laisse le serveur prendre la mienne »
   * (`users.city_id`). On ne pré-remplit RIEN : si le serveur ne connaît pas ma
   * ville, il le DIT (`no_city`) et l'écran demande — il ne devine pas Paris.
   */
  const [cityId, setCityId] = useState<string | null>(null);

  const { loading, failed, refusal, page, reload } = useCrewDiscovery({ cityId, query });

  const crews = useMemo(() => {
    if (!page) return [] as readonly DiscoveryCrew[];
    const ranked = rankCrews(page.crews, {
      viewerCityId: page.cityId,
      viewerInCrew: page.viewerInCrew,
      /**
       * Discipline du joueur — critère 5 de §E39. Elle n'est PAS lue ici :
       * aucune source fiable côté client ne la donne sans une requête de plus,
       * et la deviner fausserait le classement en silence. `null` neutralise
       * proprement le critère (cf. `activityFit`) au lieu de le fabriquer.
       */
      viewerActivity: null,
    });
    return applyFilter(ranked, filter, { viewerInCrew: page.viewerInCrew });
  }, [page, filter]);

  // ── Pas connecté ──────────────────────────────────────────────────────────
  if (!session) {
    return (
      <StackScreen title={t(C.dTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.dSignedOut)}</Text>
        </View>
      </StackScreen>
    );
  }

  // ── Ville inconnue : on DEMANDE (jamais « près de chez vous ») ────────────
  if (refusal === 'no_city') {
    return (
      <StackScreen title={t(C.dTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.dNoCityTitle)}</Text>
          <Text style={styles.body}>{t(C.dNoCityBody)}</Text>
          <CityField
            selectedId={cityId}
            onSelect={(c: CityEntry) => setCityId(c.cityId)}
            note={t(CityC.crewNeedsOpenCity)}
          />
        </View>
      </StackScreen>
    );
  }

  return (
    <StackScreen
      title={t(C.dTitle)}
      subtitle={page?.cityName ? t(C.dScope, { city: page.cityName }) : undefined}
    >
      {/* RECHERCHE — un seul champ, jamais un formulaire (§A). */}
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder={t(C.dSearchPh)}
        placeholderTextColor={colors.gris}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={t(C.dSearchPh)}
      />

      {/*
        FILTRES — `tone="surface"` : la sélection ne doit PAS être chartreuse.
        La chartreuse marque l'action décisive d'un écran, et cet écran n'en a
        aucune (la décision se prend sur la fiche).
        « Proches » de §E39 n'est pas un segment : c'est déjà l'état par défaut
        (la RPC ne sort pas de la ville). En faire une case laisserait croire
        qu'on peut la décocher pour voir le monde entier — ce serait faux.
      */}
      <Segmented
        style={styles.filters}
        tone="surface"
        accessibilityLabel={t(C.dTitle)}
        value={filter}
        onChange={setFilter}
        options={[
          { id: 'all', label: t(C.dFilterAll) },
          { id: 'friends', label: t(C.dFilterFriends) },
          { id: 'open', label: t(C.dFilterOpen) },
        ]}
      />

      {/* LECTURE EN COURS — n'affirme RIEN sur la ville. */}
      {loading && !page ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
        </View>
      ) : null}

      {/* ÉCHEC — dit, avec la seule action qui ait du sens : réessayer. */}
      {failed ? (
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.dFailedTitle)}</Text>
          <Text style={styles.body}>{t(C.dFailedBody)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      ) : null}

      {/* LU ET VIDE — une affirmation VRAIE, distincte de l'échec ci-dessus. */}
      {page && crews.length === 0 ? (
        <View style={styles.block}>
          {query.trim().length > 0 || filter !== 'all' ? (
            <Text style={styles.body}>{t(C.dEmptySearch)}</Text>
          ) : (
            <>
              <Text style={styles.title}>{t(C.dEmptyTitle)}</Text>
              <Text style={styles.body}>{t(C.dEmptyBody)}</Text>
            </>
          )}
        </View>
      ) : null}

      {/* LA LISTE — une ligne = un crew, tap = sa fiche. */}
      {crews.map((c) => (
        <CrewRow
          key={c.id}
          crew={c}
          viewerInCrew={page?.viewerInCrew ?? false}
          onPress={() => router.push({ pathname: '/crew-public', params: { crewId: c.id } })}
        />
      ))}
    </StackScreen>
  );
}

/**
 * Une ligne de crew : identité, puis des FAITS. Rien d'autre — pas de badge de
 * ligue, pas de score d'activité, pas de « recommandé pour vous ». Ce que la
 * base ne sait pas, la ligne ne le dit pas.
 */
function CrewRow({
  crew,
  viewerInCrew,
  onPress,
}: {
  crew: DiscoveryCrew;
  viewerInCrew: boolean;
  onPress: () => void;
}) {
  const t = useT();
  const seats = seatsLeft(crew);
  const joinable = isJoinable(crew, { viewerInCrew });

  // « Actif » = la dernière capture RÉELLE. Aucune capture = on le dit ; on ne
  // remplace pas l'absence par « nouveau » ou « en formation », qui sont des
  // interprétations flatteuses de la même donnée manquante.
  const activity =
    crew.lastCaptureAtMs === null
      ? t(C.dNeverActive)
      : (() => {
          const days = Math.floor((Date.now() - crew.lastCaptureAtMs) / DAY_MS);
          return days <= 0 ? t(C.dActiveToday) : t(C.dLastActive, { d: days });
        })();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={crew.name}
      style={styles.row}
    >
      <View style={styles.rowBody}>
        <View style={styles.rowHead}>
          {/* Pas de numberOfLines sur le nom : un nom de crew tronqué est un
              nom qu'on ne reconnaît pas (§A.9). */}
          <Text style={styles.rowName}>{crew.name}</Text>
          {crew.tag ? <Text style={styles.rowTag}>{crew.tag}</Text> : null}
        </View>

        {/* Ligne de faits n°1 : ce que le crew EST. */}
        <Text style={styles.rowFacts}>
          {t(C.dMembers, { n: crew.memberCount })}
          {' · '}
          {crew.hexesHeld > 0 ? t(C.dZonesHeld, { n: crew.hexesHeld }) : t(C.dNoZones)}
        </Text>

        {/* Ligne de faits n°2 : ce qui me concerne, MOI. */}
        <Text style={styles.rowFacts}>
          {activity}
          {crew.friendsInside > 0 ? ` · ${t(C.dFriendsInside, { n: crew.friendsInside })}` : ''}
          {' · '}
          {joinable ? t(C.dSeatsLeft, { n: seats }) : t(C.dNoSeats)}
        </Text>

        {/* Candidature en cours : un ÉTAT, pas un bouton (aucune action ne part
            d'ici — l'écran n'a aucune adhésion à offrir). */}
        {crew.myRequestPending ? (
          <Text style={styles.rowPending}>{t(C.dRequestPending)}</Text>
        ) : null}
      </View>
      <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  cta: { marginTop: spacing.sm },
  center: { marginTop: spacing.xl, alignItems: 'center' },

  search: {
    marginTop: spacing.lg,
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
  filters: { marginTop: spacing.md },

  // Liste à PLAT : jamais une card par crew (card-in-card serait garanti dès
  // qu'on ajouterait une section autour — §A).
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
  },
  rowBody: { flex: 1, gap: spacing.xxs },
  rowHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  rowName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600', flexShrink: 1 },
  rowTag: { color: colors.gris, fontFamily: fonts.mono, fontSize: fontSizes.xs, letterSpacing: 1 },
  rowFacts: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  rowPending: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
});
