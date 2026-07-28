/**
 * GRYD — E45 « MISSION CREW » (spéc produit l.1628), route `/crew-mission`.
 *
 * La spéc liste sept éléments : objectif, carte, progression collective,
 * échéance, contributions nécessaires, participants, CTA `CONTRIBUER`. Cinq
 * existent vraiment, DEUX N'EXISTENT PAS EN BASE — et l'écart est le sujet de
 * cet écran, pas un détail d'implémentation :
 *
 *   · « PROGRESSION COLLECTIVE » n'a AUCUN DÉNOMINATEUR. `defend` a un compte et
 *     une échéance, `reclaim` un compte, `close_loop` des mètres manquants sans
 *     longueur totale, `capture` une BORNE SUPÉRIEURE de zones libres. Aucune de
 *     ces quatre missions ne sait dire « x sur y ». Une barre à 40 % serait un
 *     chiffre inventé — la ligne exacte que deux écrans de frontière crew ont
 *     déjà coûtée au dépôt (21/07/2026). `crewMissionBriefing` renvoie donc
 *     `progress: null` en toutes circonstances (testé, `crew_mission_briefing_test.ts`),
 *     et l'écran affiche le MANQUE CONCRET, qui est la version vraie du même
 *     signal, plus une phrase qui dit pourquoi il n'y a pas de pourcentage.
 *   · « PARTICIPANTS » n'est relié à rien. Aucune table ne rattache un membre à
 *     une mission : la mission est DÉRIVÉE à la lecture (`chooseCrewMission`),
 *     jamais inscrite. Ce que la base sait, c'est QUI TIENT DU TERRAIN
 *     (`crew_overview()`, 0044) — l'écran nomme donc la liste pour ce qu'elle
 *     mesure. Écrire « participants » prêterait à ces gens un engagement qu'ils
 *     n'ont pas pris.
 *
 * ═══ LA RAISON DE LA MISSION EST DÉRIVÉE DE FAITS RÉELS ════════════════════
 * Rien n'est choisi ici. `useRealCrew({ withOverview: true })` lit la RPC
 * `crew_mission_inputs` (0049) — comptes de zones tenues, échéances de decay
 * réelles, pertes récentes, boucles ouvertes, zones libres — et le moteur PUR
 * `chooseCrewMission` en dérive AU PLUS UNE mission. Quand aucun fait ne permet
 * de recommander, il renvoie `{ kind: 'none' }` : L'ÉCRAN NE RECOMMANDE ALORS
 * RIEN ET LE DIT. C'est l'état réel au 28/07/2026 (base vide de jeu), et c'est
 * un résultat, pas un échec.
 *
 * ═══ QUATRE ÉTATS DE LECTURE, PLUS L'ÉTAT « LU ET VIDE » ═══════════════════
 * pas connecté · lecture EN COURS · échec de lecture · pas de crew · mission non
 * lue · aucune mission · une mission. Aucun n'emprunte la phrase d'un autre. En
 * particulier `msUnread` (« on n'a pas pu lire ») ne se confond jamais avec
 * `msNoneTitle` (« il n'y a rien à recommander ») : le premier n'affirme rien du
 * crew, le second affirme un fait.
 *
 * ═══ CARTE : POLYGONES, RÔLES, ET RIEN SUR PERSONNE ═══════════════════════
 * `CrewMap` (E44) est monté tel quel : aucun hexagone (constitution 6), couleurs
 * par RÔLE et jamais par crew (§C), aucun tap qui désignerait un membre, aucun
 * marqueur, aucune position live (constitution 7). Son docblock porte le détail.
 *
 * ═══ §A ═══════════════════════════════════════════════════════════════════
 * UN SEUL CTA chartreuse — « CONTRIBUER », et il n'est peint QUE s'il y a une
 * mission. Il mène à la Carte, qui EST l'écran de mission (A-21) et porte le
 * bouton GO : ce n'est pas un bouton mort. Pas de card dans une card ; aucun
 * texte d'action tronqué ; l'écran se comprend en moins de 3 s (objectif, manque,
 * échéance).
 *
 * Analytics : `$screen crew_mission` à l'ouverture. Aucun autre event — l'écran
 * décrit, et le seul geste qu'il propose est déjà mesuré à l'arrivée.
 */
import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, fontSizes, spacing } from '@klaim/shared';
import { C } from '../src/i18n/catalog/crew';
import { useLocale, useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Card, IconPlate } from '../src/ui/Card';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { ActivitySwitch, useActivityLens } from '../src/ui/ActivitySwitch';
import { formatIntFor } from '../src/ui/numberFormat';
import { useRealCrew } from '../src/features/crew/real';
import { CrewMap } from '../src/features/crew/CrewMap';
import { missionCopy, missionIcon } from '../src/features/crew/missionCopy';
import { crewMissionBriefing } from '../src/features/crew/engine/crewMission';

/** Hauteur du cadre carto de cet écran (pt). Mesure d'écran, pas de jeu. */
const MISSION_MAP_HEIGHT = 240;

export default function CrewMissionScreen() {
  const t = useT();
  const locale = useLocale();
  // Même lentille que la Carte et que la vue Carte du QG : c'est le même
  // territoire, dans la même discipline. Les deux mondes ne sont jamais sommés.
  const { activity, setActivity, switchVisible } = useActivityLens('map');
  const { ready, loading, loadFailed, crew, members, overview, overviewFailed, mission } =
    useRealCrew({ withOverview: true });

  useEffect(() => {
    screen('crew_mission');
  }, []);

  /**
   * Ids du crew pour la carte — mémoïsé (dépendance d'effet de
   * `useRealTerritories`), `null` tant que le roster n'est pas lu : un Set vide
   * ferait peindre nos propres zones en ORANGE RIVAL.
   */
  const memberIds = useMemo(
    () => (members.length === 0 ? null : new Set(members.map((m) => m.userId))),
    [members],
  );

  /**
   * TOUT ce que l'écran a le droit d'affirmer, décidé par une fonction PURE.
   *
   * `overviewFailed` est ce qui sépare « personne ne tient rien » de « on n'a pas
   * pu lire les parts » : sans lui, un timeout sur `crew_overview()` ferait dire
   * à l'écran que personne n'a jamais couru pour ce crew.
   */
  const brief = useMemo(
    () =>
      crewMissionBriefing({
        nowMs: Date.now(),
        mission,
        contributions: overviewFailed || overview === null ? null : overview.contributions,
      }),
    [mission, overview, overviewFailed],
  );

  // ── 1. PAS CONNECTÉ ───────────────────────────────────────────────────────
  if (!ready && !loading && !loadFailed) {
    return (
      <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
        <Card>
          <Text style={styles.stateTitle}>{t(C.rlSignedOutTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.msSignedOut)}</Text>
          <View style={styles.stateCta}>
            <Button label={t(C.rlSignIn)} variant="ghost" onPress={() => router.push('/sign-in')} />
          </View>
        </Card>
      </Shell>
    );
  }

  // ── 2. LECTURE EN COURS — n'affirme RIEN sur le crew ──────────────────────
  if (loading) {
    return (
      <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
        <Text style={styles.note}>{t(C.sLoading)}</Text>
      </Shell>
    );
  }

  // ── 3. ÉCHEC DE LECTURE — distinct du vide ────────────────────────────────
  if (loadFailed) {
    return (
      <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
        <Card>
          <Text style={styles.stateTitle}>{t(C.sFailedTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.sFailedBody)}</Text>
        </Card>
      </Shell>
    );
  }

  // ── 4. PAS DE CREW — il n'y a pas de mission de crew, et c'est tout ───────
  if (crew === null) {
    return (
      <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
        <Card>
          <Text style={styles.stateTitle}>{t(C.emptyTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.msNoCrew)}</Text>
          <View style={styles.stateCta}>
            <Button
              label={t(C.sMembersLink)}
              variant="ghost"
              onPress={() => router.push('/(tabs)/crew')}
            />
          </View>
        </Card>
      </Shell>
    );
  }

  const copy = brief.view === 'brief' ? missionCopy(brief.mission, Date.now()) : null;

  return (
    <Shell activity={activity} setActivity={setActivity} switchVisible={switchVisible} t={t}>
      {/* ── OBJECTIF ─────────────────────────────────────────────────────── */}
      <SectionLabel>{t(C.msObjectiveLabel)}</SectionLabel>

      {brief.view === 'unread' ? (
        /* MISSION NON LUE. On ne dit RIEN du crew — et surtout pas « aucune
           mission », qui serait une affirmation qu'aucune panne n'autorise. */
        <Card>
          <Text style={styles.stateBody}>{t(C.msUnread)}</Text>
        </Card>
      ) : brief.view === 'none' ? (
        /* AUCUNE MISSION À RECOMMANDER — état RÉEL, pas un échec. L'écran ne
           tire pas une mission au hasard pour avoir l'air vivant. Les deux
           motifs se disent DIFFÉREMMENT : « on ne sait rien encore » n'est pas
           « tout est stable ». */
        <Card>
          <Text style={styles.stateTitle}>{t(C.msNoneTitle)}</Text>
          <Text style={styles.stateBody}>
            {t(brief.reason === 'no_data' ? C.cmNoneNoData : C.cmNoneStable)}
          </Text>
        </Card>
      ) : copy !== null && !('note' in copy) ? (
        <Card>
          <View style={styles.objectiveHead}>
            <IconPlate icon={missionIcon(brief.mission.kind)} size="md" color={colors.chartreuse} />
            <View style={styles.objectiveBody}>
              {/* Pas de `numberOfLines` : un objectif tronqué est un objectif
                  mal lu (§A.9). Le nom de secteur enveloppe. */}
              <Text style={styles.objectiveTitle}>{t(copy.title.entry, copy.title.vars)}</Text>
              {/* LE MANQUE CONCRET — ce qui remplace la jauge de la spéc. */}
              <Text style={styles.objectiveGap}>{t(copy.gap.entry, copy.gap.vars)}</Text>
            </View>
          </View>
          {/* Le refus de la jauge, dit à l'écran et pas seulement en commentaire. */}
          <Text style={styles.footnote}>{t(C.msNoProgressNote)}</Text>
        </Card>
      ) : null}

      {/* ── ÉCHÉANCE : réelle, ou explicitement absente ───────────────────── */}
      {brief.view === 'brief' ? (
        <>
          <SectionLabel>{t(C.msDeadlineLabel)}</SectionLabel>
          <Card>
            <Text style={styles.deadline}>
              {brief.overdue
                ? t(C.msDeadlineOverdue)
                : brief.hoursLeft !== null
                  ? t(C.msDeadlineHours, { h: formatIntFor(brief.hoursLeft, locale) })
                  : t(C.msNoDeadline)}
            </Text>
          </Card>
        </>
      ) : null}

      {/* ── CARTE (E44) — l'emprise du crew, agrégée ──────────────────────── */}
      <SectionLabel>{t(C.rlTerritoryLabel)}</SectionLabel>
      <CrewMap
        memberIds={memberIds}
        activity={activity}
        height={MISSION_MAP_HEIGHT}
        testID="crew-mission-map"
      />
      <Text style={styles.footnote}>{t(C.mapAggregatedNote)}</Text>

      {/* ── QUI TIENT DU TERRAIN (≠ « participants ») ─────────────────────── */}
      <SectionLabel>{t(C.msHoldersLabel)}</SectionLabel>
      <Card>
        {/* LES PARTS NE DÉPENDENT PAS DE LA MISSION (correctif 28/07/2026).
            La condition testait `brief.view !== 'brief'` : sans mission — l'état
            le plus courant, et le seul possible sur une base vide — l'écran
            affichait « Parts non chargées » alors que `crew_overview()` avait
            RÉPONDU, et masquait des parts réelles. Un échec de lecture ne
            s'invente pas : seul `holders === null` le dit. */}
        {brief.holders === null ? (
          /* Parts NON LUES. Un « personne » ici accuserait tout le crew de
             n'avoir rien fait sur la foi d'un timeout. */
          <Text style={styles.stateBody}>{t(C.msHoldersUnread)}</Text>
        ) : brief.holders.length === 0 ? (
          <Text style={styles.stateBody}>{t(C.msHoldersEmpty)}</Text>
        ) : (
          brief.holders.map((h) => (
            <View key={h.userId} style={styles.row}>
              <Text style={styles.rowName} numberOfLines={1}>
                {h.pseudo}
              </Text>
              <Text style={styles.rowValue}>
                {t(C.sContribution, { pct: formatIntFor(h.contributionPct, locale) })}
              </Text>
            </View>
          ))
        )}
        <Text style={styles.footnote}>{t(C.msHoldersNote)}</Text>
      </Card>

      {/* Ce que « collectif » veut dire ici, faute de jauge : chaque zone
          reprise par un membre compte pour le crew entier (`crew_overview`). */}
      <Text style={styles.footnote}>{t(C.msCollectiveNote)}</Text>

      {/* ── L'UNIQUE CTA CHARTREUSE (§A.4), et seulement s'il y a une mission.
          Il mène à la Carte — l'écran de mission (A-21), qui porte le bouton GO.
          Sans mission, il n'y a rien à quoi contribuer : peindre le bouton
          quand même en ferait une invitation vide. ── */}
      {brief.view === 'brief' ? (
        <View style={styles.stateCta}>
          <Button
            label={t(C.msContributeCta)}
            onPress={() => router.push('/')}
            analyticsId="crew_mission_contribute"
          />
        </View>
      ) : null}
    </Shell>
  );
}

/** Enveloppe commune : le même en-tête dans TOUS les états (jamais deux gabarits). */
function Shell({
  activity,
  setActivity,
  switchVisible,
  t,
  children,
}: {
  activity: 'run' | 'bike';
  setActivity: (a: 'run' | 'bike') => void;
  switchVisible: boolean;
  t: ReturnType<typeof useT>;
  children: React.ReactNode;
}) {
  return (
    <StackScreen
      title={t(C.msTitle)}
      icon="cible"
      backHref="/(tabs)/crew"
      headerRight={
        switchVisible ? (
          <ActivitySwitch
            activity={activity}
            onChange={setActivity}
            runLabel={t(C.sActivityRunA11y)}
            bikeLabel={t(C.sActivityBikeA11y)}
          />
        ) : undefined
      }
    >
      {children}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  stateTitle: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
    marginBottom: spacing.xs,
  },
  stateBody: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  stateCta: { marginTop: spacing.lg },
  objectiveHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  objectiveBody: { flex: 1, gap: spacing.xs },
  objectiveTitle: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontSize: fontSizes.lg,
  },
  objectiveGap: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  deadline: { color: colors.blanc, fontFamily: fonts.mono, fontSize: fontSizes.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowName: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md, flexShrink: 1 },
  rowValue: { color: colors.blanc, fontFamily: fonts.mono, fontSize: fontSizes.md },
  footnote: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    marginTop: spacing.md,
  },
});
