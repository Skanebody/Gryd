/**
 * GRYD — DÉCOUVERTE DES CREWS (route `/crew-discovery`).
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
 * La pertinence (ville > amis > SORTIES À VENIR §13.1 > activité > capacité >
 * compatibilité) est PURE et testée : `features/crew/discovery.ts` +
 * `discovery.test.ts`. Cet écran appelle `rankCrews`, il ne trie rien lui-même.
 *
 * ══ CE QUE 0152 A RETIRÉ, ET POURQUOI CE N'EST PAS UNE PERTE ══════════════
 * Le compte de zones et le rang de crew ne sont plus lus : leur source
 * (`hex_claims`) est gelée pour toute activité 2026 depuis 0118, et le titre
 * territorial est INDIVIDUEL depuis 0126 — un crew n'en possède aucun. Les
 * afficher revenait à peindre « Aucune zone tenue » sur tous les crews du
 * monde. À la place : l'accueil, les sorties, les gens.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  ACTIVITIES,
  CREW_TAG_KEYS,
  colors,
  elevation,
  fonts,
  fontSizes,
  iconSizes,
  radii,
  sizes,
  spacing,
  type Activity,
} from '@klaim/shared';
import { C, CREW_PROFILE_E, CREW_TAG_E } from '../src/i18n/catalog/crew';
import { C as CityC } from '../src/i18n/catalog/city';
import { useT } from '../src/i18n/store';
import { EVENTS, track } from '../src/lib/analytics';
import { useSession } from '../src/lib/session';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { Segmented } from '../src/ui/game/Segmented';
import { CityField, type CityEntry } from '../src/features/city/CityPicker';
import {
  applyFilter,
  crewActivityProfile,
  isJoinable,
  rankCrews,
  refusalView,
  seatsLeft,
  type DiscoveryCrew,
  type DiscoveryFilter,
} from '../src/features/crew/discovery';
import { useCrewDiscovery } from '../src/features/crew/discoveryData';
import { CREW_ACTIVITY_E, G } from '../src/i18n/catalog/crewGestion';
import { useCrewDiscovery2026 } from '../src/features/crew/management/crewManagementData';
import {
  CREW_SIZE_BANDS_2026,
  CREW_SIZE_MEDIUM_MAX_2026,
  CREW_SIZE_SMALL_MAX_2026,
  CREW_TAG_FILTER_MAX_2026,
  NO_DISCOVERY_FILTER_STATE_2026,
  canAddDiscoveryTag2026,
  discoveryFiltersActive2026,
  toggleDiscoveryTag2026,
  type CrewSizeBand2026,
  type DiscoveryFilterState2026,
} from '../src/features/crew/management/crewDiscoveryFilters2026';

/** Un jour en millisecondes — unité de TEMPS, pas une constante de jeu. */
const DAY_MS = 86_400_000;

/**
 * ─── 11/09/2026 · LE FILTRE PAR CONDITIONS D'ENTRÉE (LOT Q3, §2.7) ──────────
 *
 * `all` n'est PAS un filtre du serveur : c'est son absence. Les trois autres
 * sont le catalogue fermé de `crew_discovery_2026` (`none` · `any` ·
 * `eligible`), et le serveur refuse tout autre mot (`bad_requirements`).
 */
type ReqFilter = 'all' | 'none' | 'any' | 'eligible';

/** Tranche de taille, plus son absence. `all` n'est pas un intervalle. */
type SizeChoice = 'all' | CrewSizeBand2026;
/** Discipline, plus son absence. */
type ActivityChoice = 'all' | Activity;

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
  /**
   * ─── 11/09/2026 · LES QUATRE FILTRES QUI MANQUAIENT (LOT Q4, §2.7) ────────
   * `crew_discovery_2026` accepte NEUF paramètres depuis Q3 ; l'écran en
   * envoyait DEUX et laissait `p_activity`, `p_min_members`, `p_max_members`,
   * `p_tags` et `p_active_only` à `null` en dur. La moitié de la migration
   * était déployée et morte. L'état vit maintenant dans un objet unique, et sa
   * traduction en charge utile est PURE et testée
   * (`crewDiscoveryFilters2026.ts`) : le serveur REFUSE une valeur hors
   * catalogue au lieu de la rogner, donc une charge fausse ne se verrait qu'à
   * l'exécution, sur une liste vide sans explication.
   */
  const [f, setF] = useState<DiscoveryFilterState2026>(NO_DISCOVERY_FILTER_STATE_2026);
  /** Le panneau est REPLIÉ par défaut : la décision de l'écran est la LISTE. */
  const [panelOpen, setPanelOpen] = useState(false);
  const reqFilter: ReqFilter = f.requirements ?? 'all';

  const { loading, failed, refusal, page, reload } = useCrewDiscovery({ cityId, query });
  /** Vocabulaire de refus FERMÉ (discovery.ts) : plus aucun motif ne traverse. */
  const refused = refusalView(refusal);

  /**
   * ══ POURQUOI DEUX LECTURES, ET CE QUE CHACUNE APPORTE ═══════════════════
   *
   * `crew_discovery` (0152) reste la SOURCE DE LA LISTE : elle seule rend
   * `friendsInside` (« deux de tes amis sont dedans ») et `viewerInCrew`, dont
   * dépendent le classement de pertinence et le filtre « Amis ». Basculer
   * entièrement sur 0190 aurait supprimé un fait réel pour en gagner un autre.
   *
   * `crew_discovery_2026` (0190) sert d'ANNOTATION, et pour une seule raison :
   * « je suis éligible » compare MES mesures aux exigences de CHAQUE crew, et
   * ce calcul est serveur par construction — le client ne connaît ni mon niveau
   * ni mes 28 derniers jours, et le détail de ce qui manque n'appartient qu'à
   * la fiche du crew (§6.3). Les deux réponses se recollent par identifiant.
   *
   * Si l'annotation échoue, le filtre par conditions n'est PAS peint : un
   * contrôle qui ne pourrait rien filtrer serait un bouton mort. L'écran dit
   * alors pourquoi, au lieu de laisser un manque inexpliqué.
   */
  const annot = useCrewDiscovery2026({ ...f, cityId, query });
  const conditions = useMemo(() => {
    const byId = new Map<string, { hasRequirements: boolean; eligible: boolean }>();
    for (const r of annot.data?.rows ?? []) {
      byId.set(r.id, { hasRequirements: r.hasRequirements, eligible: r.iAmEligible });
    }
    return byId;
  }, [annot.data]);
  const conditionsReadable = annot.data !== null;
  /**
   * ⚠ DEPUIS LE LOT Q4, L'ANNOTATION FILTRE AUSSI. Les quatre critères de §2.7
   * (discipline, taille, étiquettes, activité) n'existent QUE dans 0190 : c'est
   * donc sa réponse qui décide quelles lignes de 0152 restent. Un crew que
   * l'annotation ne connaît pas est ÉCARTÉ, jamais gardé « au cas où » — le
   * garder affirmerait qu'il coche des cases qu'on n'a pas pu vérifier.
   *
   * Corollaire : quand AUCUN filtre §2.7 n'est actif, l'annotation ne retire
   * rien. Une panne de 0190 ne doit pas vider une recherche qui n'a rien
   * demandé à 0190.
   */
  const serverFiltering = discoveryFiltersActive2026(f);
  const activeFilterCount =
    (f.activity !== null ? 1 : 0) +
    (f.requirements !== null ? 1 : 0) +
    (f.size !== null ? 1 : 0) +
    (f.activeOnly ? 1 : 0) +
    f.tags.length;

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
    const base = applyFilter(ranked, filter, { viewerInCrew: page.viewerInCrew });
    if (!serverFiltering) return base;
    // Un crew que l'annotation ne connaît pas est ÉCARTÉ des filtres serveur
    // plutôt que rangé au hasard : le garder dirait quelque chose de ses
    // exigences ou de sa discipline, et on ne sait rien d'elles.
    return base.filter((c) => conditions.has(c.id));
  }, [page, filter, serverFiltering, conditions]);

  /**
   * ══ L'EVENT §8, ÉMIS SUR L'ÉTAT RÉELLEMENT ATTEINT ═══════════════════════
   * `crew_discovery_viewed { state, filter }` était DÉCLARÉ (events.ts) et
   * n'était émis nulle part : un contrat analytics écrit mais pas tenu est la
   * même faute qu'une doc qui promet au-delà du code.
   *
   * `state` reprend EXACTEMENT les états que l'écran distingue à l'affichage —
   * y compris la distinction entre « aucun crew ici » et « aucun crew ne
   * correspond à ma recherche », qui sont deux faits différents. Les
   * confondre dans la mesure reproduirait à l'analyse le mensonge que l'écran
   * s'interdit à l'affichage.
   *
   * `loading` n'est jamais émis : une lecture en cours n'affirme rien sur la
   * ville, il n'y a donc rien à mesurer tant qu'elle n'a pas abouti.
   */
  const state: string | null = !session
    ? 'signed_out'
    : failed
      ? 'failed'
      : refusal !== null
        ? refusal
        : !page
          ? null // lecture en cours : rien à dire encore.
          : crews.length > 0
            ? 'list'
            : query.trim().length > 0 || filter !== 'all' || serverFiltering
              ? 'empty_search'
              : 'empty';

  // Un seul event par état atteint : sans cette garde, chaque frappe au clavier
  // rejouerait `list` et gonflerait la mesure d'un signal qui n'a pas changé.
  const lastLogged = useRef<string | null>(null);
  useEffect(() => {
    if (state === null) return;
    const key = `${state}:${filter}`;
    if (lastLogged.current === key) return;
    lastLogged.current = key;
    track(EVENTS.crewDiscoveryViewed, { state, filter });
  }, [state, filter]);

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

  // ── Ville inconnue : on DEMANDE (jamais « près de chez toi ») ────────────
  if (refused === 'no_city') {
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

  /**
   * ─── 27/07/2026 — LES REFUS QUI RENDAIENT UN ÉCRAN MUET ───────────────────
   * Seul `no_city` était peint. `crew_discovery` (0083:267) refuse AUSSI avec
   * `signed_out` (jeton expiré alors que la session locale tient), et
   * `refusalOf` rabat en outre tout motif inconnu sur `not_found`. Dans ces cas
   * `loading=false`, `failed=false`, `page=null` : les trois blocs
   * conditionnels plus bas étaient TOUS faux, et l'écran rendait un champ de
   * recherche + trois filtres au-dessus de RIEN. Une zone de liste muette se
   * lit « il n'y a aucun crew ici » — l'affirmation exacte que cet écran
   * s'interdit. L'event §8 juste au-dessus, lui, savait déjà distinguer ces
   * états : l'analytics était plus honnête que l'affichage.
   *
   * Ces états sortent AVANT la recherche : un champ de saisie n'a pas de sens
   * quand aucune lecture ne peut aboutir (§A « 1 écran = 1 décision »).
   */
  if (refused === 'session_expired') {
    return (
      <StackScreen title={t(C.dTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.dSessionExpired)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlSignIn)} onPress={() => router.push('/sign-in')} />
          </View>
        </View>
      </StackScreen>
    );
  }

  // `not_found` et les motifs incohérents en lecture : un ÉCHEC, dit comme tel,
  // avec la seule action qui ait du sens. Jamais un vide, jamais un silence.
  if (refused !== null) {
    return (
      <StackScreen title={t(C.dTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.dFailedTitle)}</Text>
          <Text style={styles.body}>{t(C.dRefusedUnreadable)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={reload} loading={loading} />
          </View>
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

      {/*
        LES FILTRES DE §2.7 (lot Q4). Peints SEULEMENT si `crew_discovery_2026`
        a répondu : un segment « je suis éligible » qui ne filtrerait rien
        serait un bouton mort, et le pire de tous — il laisserait croire
        qu'aucun crew ne veut de vous. Quand la lecture n'aboutit pas, l'écran
        le DIT, et aucun contrôle n'apparaît.

        REPLIÉS par défaut : cet écran a UNE décision, choisir un crew (§A), et
        un formulaire de six contrôles au-dessus de la liste la repousserait
        hors de l'écran à l'ouverture. La ligne de tête porte le compte des
        filtres actifs — jamais un « 0 filtre », qui n'apprend rien.
      */}
      {conditionsReadable ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: panelOpen }}
            aria-expanded={panelOpen}
            onPress={() => setPanelOpen((v) => !v)}
            style={({ pressed }) => [styles.panelHead, pressed && styles.dim]}
          >
            <Text style={styles.panelTitle}>
              {activeFilterCount > 0
                ? t(G.filterPanelCount, { n: activeFilterCount })
                : t(G.filterPanel)}
            </Text>
            {/* La famille d'icônes n'a pas de « moins » : on dit donc le geste
                réel de chaque état (ouvrir / refermer), jamais un signe
                approchant. Le nom accessible, lui, vient de `aria-expanded`. */}
            <Icon name={panelOpen ? 'fermer' : 'plus'} size={iconSizes.sm} color={colors.gris} />
          </Pressable>

          {panelOpen ? (
            <View style={styles.panel}>
              {/* DISCIPLINE — `holds_run` / `holds_bike` : ce que des membres
                  TIENNENT vraiment, jamais une déclaration d'intention. */}
              <Text style={styles.label}>{t(G.filterActivity)}</Text>
              <Segmented
                scrollable
                tone="surface"
                accessibilityLabel={t(G.filterActivity)}
                value={(f.activity ?? 'all') as ActivityChoice}
                onChange={(id: ActivityChoice) =>
                  setF((p) => ({ ...p, activity: id === 'all' ? null : id }))
                }
                options={[
                  { id: 'all' as ActivityChoice, label: t(G.filterAny) },
                  ...ACTIVITIES.map((a) => ({
                    id: a as ActivityChoice,
                    label: t(CREW_ACTIVITY_E[a]),
                  })),
                ]}
              />

              {/* TAILLE — les bornes viennent du CODE (dérivées de
                  CREW_MAX_MEMBERS), jamais du texte traduit. */}
              <Text style={styles.label}>{t(G.filterSize)}</Text>
              <Segmented
                scrollable
                tone="surface"
                accessibilityLabel={t(G.filterSize)}
                value={(f.size ?? 'all') as SizeChoice}
                onChange={(id: SizeChoice) =>
                  setF((p) => ({ ...p, size: id === 'all' ? null : id }))
                }
                options={[
                  { id: 'all' as SizeChoice, label: t(G.filterAny) },
                  ...CREW_SIZE_BANDS_2026.map((band) => ({
                    id: band as SizeChoice,
                    label:
                      band === 'small'
                        ? t(G.filterSizeSmall, { n: CREW_SIZE_SMALL_MAX_2026 })
                        : band === 'medium'
                          ? t(G.filterSizeMedium, {
                              min: CREW_SIZE_SMALL_MAX_2026 + 1,
                              max: CREW_SIZE_MEDIUM_MAX_2026,
                            })
                          : t(G.filterSizeLarge, { n: CREW_SIZE_MEDIUM_MAX_2026 + 1 }),
                  })),
                ]}
              />

              {/* CONDITIONS D'ENTRÉE — inchangé, c'est le filtre le plus utile. */}
              <Text style={styles.label}>{t(G.filterRequirements)}</Text>
              <Segmented
                scrollable
                tone="surface"
                accessibilityLabel={t(G.filterRequirements)}
                value={reqFilter}
                onChange={(id: ReqFilter) =>
                  setF((p) => ({ ...p, requirements: id === 'all' ? null : id }))
                }
                options={[
                  { id: 'all', label: t(G.filterAny) },
                  { id: 'none', label: t(G.filterReqNone) },
                  { id: 'any', label: t(G.filterReqAny) },
                  { id: 'eligible', label: t(G.filterReqEligible) },
                ]}
              />

              {/* ACTIVITÉ RÉCENTE — une case, et ce qu'elle veut dire EN CLAIR :
                  « actif » n'est pas un jugement, c'est une sortie à venir ou
                  du terrain pris ces 14 jours (0190). */}
              <Text style={styles.label}>{t(G.filterActiveOnly)}</Text>
              <Segmented
                tone="surface"
                accessibilityLabel={t(G.filterActiveOnly)}
                value={f.activeOnly ? 'on' : 'off'}
                onChange={(id: 'on' | 'off') => setF((p) => ({ ...p, activeOnly: id === 'on' }))}
                options={[
                  { id: 'off' as const, label: t(G.filterAny) },
                  { id: 'on' as const, label: t(G.filterOn) },
                ]}
              />
              <Text style={styles.hint}>{t(G.filterActiveOnlyHelp)}</Text>

              {/* ÉTIQUETTES — au plus trois, et le plafond est dit AVANT qu'on
                  le heurte : un choix qui ne répond pas se lit comme une panne. */}
              <Text style={styles.label}>{t(G.filterTags)}</Text>
              <Text style={styles.hint}>
                {t(G.filterTagsCap, { n: CREW_TAG_FILTER_MAX_2026 })}
              </Text>
              <View style={styles.tags}>
                {CREW_TAG_KEYS.map((tag) => {
                  const on = f.tags.includes(tag);
                  const possible = canAddDiscoveryTag2026(f.tags, tag);
                  return (
                    <Pressable
                      key={tag}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on, disabled: !possible }}
                      aria-checked={on}
                      aria-disabled={!possible}
                      disabled={!possible}
                      onPress={() => setF((p) => ({ ...p, tags: toggleDiscoveryTag2026(p.tags, tag) }))}
                      style={({ pressed }) => [
                        styles.tag,
                        on && styles.tagOn,
                        !possible && styles.tagOff,
                        pressed && styles.dim,
                      ]}
                    >
                      {/* L15 : l'état coché se lit AUSSI sans la couleur, par le
                          contour et par le libellé annoncé « coché ». */}
                      <Text style={[styles.tagText, on && styles.tagTextOn]}>
                        {t(CREW_TAG_E[tag])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {activeFilterCount > 0 ? (
                <View style={styles.resetRow}>
                  <Button
                    variant="ghost"
                    size="md"
                    label={t(G.filterPanelReset)}
                    onPress={() => setF({ ...NO_DISCOVERY_FILTER_STATE_2026, cityId, query })}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : annot.failed ? (
        <Text style={styles.body}>{t(G.publicRulesUnread)}</Text>
      ) : null}

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

      {/* LU ET VIDE — une affirmation VRAIE, distincte de l'échec ci-dessus.
          TROIS vides, pas un : « aucun crew ici » est un fait sur la ville,
          « rien pour cette recherche » un fait sur les mots tapés, et « rien
          ne coche tout ça » une conséquence de ce qu'on vient de cocher. Le
          dernier se répare en retirant un filtre, les deux autres non. */}
      {page && crews.length === 0 ? (
        <View style={styles.block}>
          {serverFiltering ? (
            <Text style={styles.body}>{t(G.filterEmpty)}</Text>
          ) : query.trim().length > 0 || filter !== 'all' ? (
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
          /* L'annotation, ou `null` quand on ne l'a pas lue : la ligne n'écrit
             alors RIEN sur les conditions, plutôt que « aucune condition ». */
          conditions={conditions.get(c.id) ?? null}
          onPress={() => router.push({ pathname: '/crew-public', params: { crewId: c.id } })}
        />
      ))}
    </StackScreen>
  );
}

/**
 * Une ligne de crew : identité, puis des FAITS, dans l'ordre de §13.1 —
 * « son accueil, ses horaires et ses sorties, AVANT son classement ». Rien
 * d'autre : pas de badge de ligue, pas de score d'activité, pas de « recommandé
 * pour vous ». Ce que la base ne sait pas, la ligne ne le dit pas.
 *
 * ⚠ PLUS AUCUN COMPTE DE ZONES (migration 0152). La ligne affichait
 * « Aucune zone tenue » pour TOUS les crews, à vie : la source (`hex_claims`)
 * est gelée depuis 0118. Ce qui la remplace n'est pas une autre mesure de la
 * même chose — c'est ce qui reste VRAI : combien de membres tiennent du
 * terrain, dans quelle discipline, et quand ils l'ont pris.
 */
function CrewRow({
  crew,
  viewerInCrew,
  conditions,
  onPress,
}: {
  crew: DiscoveryCrew;
  viewerInCrew: boolean;
  conditions: { hasRequirements: boolean; eligible: boolean } | null;
  onPress: () => void;
}) {
  const t = useT();
  const seats = seatsLeft(crew);
  const joinable = isJoinable(crew, { viewerInCrew });

  // HORAIRES ET SORTIES (§13.1) : la DATE, jamais le lieu — un point de
  // rendez-vous est une information de membre (garde de vie privée, 0085), et
  // la RPC ne le renvoie même pas.
  const outing =
    crew.nextOutingAtMs === null
      ? t(C.dNoOutings)
      : (() => {
          const days = Math.floor((crew.nextOutingAtMs - Date.now()) / DAY_MS);
          return days <= 0 ? t(C.dOutingToday) : t(C.dOutingIn, { d: days });
        })();

  // « Actif » = la dernière prise de contrôle RÉELLE. Aucune = on le dit ; on
  // ne remplace pas l'absence par « nouveau » ou « en formation », qui sont des
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

        {/* Ligne n°1 — L'ACCUEIL : combien ils sont, et s'il reste de la place. */}
        <Text style={styles.rowFacts}>
          {t(C.dMembers, { n: crew.memberCount })}
          {' · '}
          {joinable ? t(C.dSeatsLeft, { n: seats }) : t(C.dNoSeats)}
          {crew.friendsInside > 0 ? ` · ${t(C.dFriendsInside, { n: crew.friendsInside })}` : ''}
        </Text>

        {/* Ligne n°2 — LES SORTIES, avant tout le reste (§13.1). */}
        <Text style={styles.rowFacts}>
          {outing}
          {crew.upcomingOutings > 1
            ? ` · ${t(C.dOutingsUpcoming, { n: crew.upcomingOutings })}`
            : ''}
        </Text>

        {/* Ligne n°3 — CE QU'ILS FONT : des personnes et une discipline
            mesurée, jamais une emprise de crew (le titre est individuel). */}
        <Text style={styles.rowFacts}>
          {crew.membersHolding > 0
            ? t(C.dMembersHolding, { n: crew.membersHolding })
            : t(C.dNoneHolding)}
          {' · '}
          {t(CREW_PROFILE_E[crewActivityProfile(crew)])}
          {' · '}
          {activity}
        </Text>

        {/* Ligne n°4 — LES CONDITIONS D'ENTRÉE, quand le serveur les a dites.
            Deux mots seulement : ce crew en demande, et je les remplis ou non.
            Le DÉTAIL de ce qui manque n'appartient qu'à la fiche du crew : le
            mettre ici afficherait les kilomètres de quelqu'un dans une liste. */}
        {conditions?.hasRequirements ? (
          <Text style={conditions.eligible ? styles.rowEligible : styles.rowFacts}>
            {conditions.eligible ? t(G.filterEligibleBadge) : t(G.filterHasRequirements)}
          </Text>
        ) : null}

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

  // ── Le panneau de filtres (§2.7) ──────────────────────────────────────────
  // À PLAT : StackScreen fournit déjà le contenant, une Card ici ferait
  // card-in-card (§A). Le filet du haut suffit à détacher le bloc.
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.touchTarget,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  panelTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  panel: {
    gap: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
  },
  label: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  hint: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.6 },
  resetRow: { marginTop: spacing.sm, alignItems: 'flex-start' },
  dim: { opacity: 0.6 },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xxs },
  tag: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: elevation.raised,
  },
  // L15 : coché = un CONTOUR net en plus de la couleur, jamais la couleur seule.
  tagOn: { borderColor: colors.chartreuse, borderWidth: 2 },
  // Plafond atteint : la pastille reste LISIBLE, elle ne disparaît pas — sinon
  // le catalogue changerait sous les yeux à chaque coche.
  tagOff: { opacity: 0.4 },
  tagText: { color: colors.gris, fontSize: fontSizes.sm },
  tagTextOn: { color: colors.blanc, fontWeight: '600' },

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
  // L15 : « Tu remplis les conditions » est un TEXTE avant d'être une couleur.
  // Le blanc gras le distingue de la ligne de faits ; la phrase, elle, se lit
  // seule, en noir et blanc comme sous n'importe quel réglage d'accessibilité.
  rowEligible: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20, fontWeight: '600' },
});
