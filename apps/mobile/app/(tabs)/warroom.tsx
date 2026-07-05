/**
 * GRYD — onglet War Room, dashboard compact (AMENDEMENT-17 §1.3).
 * « Un écran = une action. » Les 3 priorités du crew sont comprises SANS
 * scroller : URGENT (défense critique) · ACTIF (conquête collective) ·
 * À TERMINER (frontières ouvertes, chantier 2) + COFFRE. Une card = 1 titre +
 * 1 chiffre + 1 statut + 1 CTA inline (REJOINDRE/DÉFENDRE/TERMINER) ; le détail
 * (assignation, contribution, route) descend au tap. Sous le fold, tout le reste
 * en sections REPLIÉES par défaut (Objectifs / Routes / Scout / Historique) —
 * max 2 cards visibles, « Voir tout » au-delà. Rien n'est câblé : données démo
 * DÉTERMINISTES (features/warroom/demo) — TODO(O1) brancher offensives /
 * defense_missions / partial_boundaries (0015) / crew_chests. Aucun nombre
 * magique : seuils/paliers depuis @klaim/shared.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_CHEST_TIERS,
  CREW_CHEST_TIER_ORDER,
  CREW_CHEST_WEEKLY_TARGET,
  OFFENSIVE_DURATION_H,
  colors,
  fontSizes,
  gameColors,
  radii,
  type IconName,
} from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { Icon } from '../../src/ui/Icon';
import { ProgressBar } from '../../src/ui/ProgressBar';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';
import {
  InlineRunCTA,
  StatePill,
  WarEventCard,
  type WarEventReaction,
} from '../../src/ui/game';
import {
  chestStateFor,
  CHEST_TIER_LABELS,
  CREW_ROLE_LABELS,
  roleCan,
} from '../../src/features/crew/rules';
import { MY_CREW } from '../../src/features/crew/demo';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import {
  DEFENSE_MISSION,
  MISSIONS,
  OFFENSIVE,
  OPEN_BOUNDARIES,
  SCOUT_REPORTS,
  WAR_HISTORY,
  WAR_ROUTES,
  WAR_STATUS,
  type OpenBoundaryDemo,
  type WarHistoryEventDemo,
} from '../../src/features/warroom/demo';

/** Décompte h:mm:ss depuis un total de secondes (mono, tabular-nums). */
function formatCountdown(totalS: number): string {
  const clamped = Math.max(0, totalS);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Compte à rebours ANIMÉ : tick chaque seconde (1000 ms = unité de temps,
 * pas une constante de jeu), plancher à 0. Info temporelle — reste actif
 * même en reduce motion (lisibilité, pas décoratif).
 */
function useCountdown(initialS: number): string {
  const [left, setLeft] = useState(initialS);
  useEffect(() => {
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);
  return formatCountdown(left);
}

/**
 * Fenêtre d'expiration lisible d'une frontière (AMENDEMENT-17 §CH2) : « 23 h 14 »
 * (heures + minutes, JAMAIS de seconde — le TTL 24 h se lit à la minute, pas au
 * tic). Sous l'heure → « 14 min ». Plancher « Expire » quand échu.
 */
function formatBoundaryWindow(totalMin: number): string {
  const clamped = Math.max(0, totalMin);
  if (clamped <= 0) return 'Expire';
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  if (h <= 0) return `${m} min`;
  return `${h} h ${m.toString().padStart(2, '0')}`;
}

/**
 * Décompte d'une frontière à la MINUTE : tick chaque 60 s (60 000 ms = unité de
 * temps, pas une constante de jeu), plancher à 0. Le TTL des frontières se vit
 * en heures — inutile (et anxiogène) de faire clignoter les secondes.
 */
function useBoundaryCountdown(initialMin: number): string {
  const [left, setLeft] = useState(initialMin);
  useEffect(() => {
    const id = setInterval(() => setLeft((m) => (m > 0 ? m - 1 : 0)), 60_000);
    return () => clearInterval(id);
  }, []);
  return formatBoundaryWindow(left);
}

const MISSION_ICON: Record<string, IconName> = {
  quotidienne: 'mission',
  hebdomadaire: 'serie',
  crew: 'crew',
};

// ============================================================================
// Primitives compactes
// ============================================================================

/**
 * En-tête de section repliable : icône + libellé + chevron animé par rotation.
 * Anti-scroll : tout ce qui n'est pas priorité vit replié, une seule ouverte
 * suffit à explorer.
 */
function SectionToggle({
  icon,
  label,
  open,
  onToggle,
  count,
}: {
  icon: IconName;
  label: string;
  open: boolean;
  onToggle: () => void;
  count?: number;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${open ? 'Replier' : 'Déplier'} ${label}`}
      accessibilityState={{ expanded: open }}
      onPress={() => {
        haptics.light();
        onToggle();
      }}
      style={({ pressed }) => [styles.sectionToggle, pressed && styles.pressed]}
    >
      <Icon name={icon} size={15} color={colors.gris} />
      <Text style={styles.sectionLabel}>{label}</Text>
      {count !== undefined ? <Text style={styles.sectionCount}>{count}</Text> : null}
      <View style={styles.sectionSpacer} />
      <View style={[styles.chevron, open && styles.chevronOpen]}>
        <Icon name="chevron" size={16} color={colors.gris} />
      </View>
    </Pressable>
  );
}

/**
 * Card de priorité compacte (90-130 px) : 1 kicker + 1 titre + 1 chiffre héros +
 * 1 phrase courte + 1 barre optionnelle + 1 CTA inline. `tone` lit l'état de jeu
 * (danger sobre sauf urgence en tête). Le détail descend au tap sur la card.
 */
function PriorityCard({
  tone,
  icon,
  kicker,
  title,
  metric,
  phrase,
  progress,
  cta,
  onPress,
  onCta,
  onLongPressCta,
}: {
  tone: 'danger' | 'crew' | 'neutral' | 'gold';
  icon: IconName;
  kicker: string;
  title: string;
  metric: string;
  phrase: string;
  progress?: number;
  cta: string;
  onPress?: () => void;
  onCta: () => void;
  onLongPressCta?: () => void;
}) {
  const accent =
    tone === 'danger'
      ? gameColors.danger
      : tone === 'gold'
        ? gameColors.gold
        : tone === 'crew'
          ? gameColors.crew
          : colors.blanc;
  return (
    <View style={[styles.card, tone === 'danger' && styles.cardDanger]}>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `${title} — voir le détail` : undefined}
        disabled={!onPress}
        onPress={
          onPress
            ? () => {
                haptics.light();
                onPress();
              }
            : undefined
        }
        style={({ pressed }) => [styles.cardHead, pressed && onPress && styles.pressed]}
      >
        <View style={[styles.cardIcon, { borderColor: accent }]}>
          <Icon name={icon} size={18} color={accent} />
        </View>
        <View style={styles.cardHeadText}>
          <Text style={[styles.cardKicker, { color: accent }]} numberOfLines={1}>
            {kicker}
          </Text>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Text style={[styles.cardMetric, { color: accent }]} numberOfLines={1}>
          {metric}
        </Text>
      </Pressable>
      <Text style={styles.cardPhrase} numberOfLines={2}>
        {phrase}
      </Text>
      {progress !== undefined ? (
        <View style={styles.cardGauge}>
          <ProgressBar value={progress} height={6} />
        </View>
      ) : null}
      <View style={styles.cardCta}>
        <InlineRunCTA
          label={cta}
          size="md"
          variant={tone === 'danger' ? 'primary' : tone === 'neutral' ? 'secondary' : 'primary'}
          onPress={onCta}
          onLongPress={onLongPressCta}
        />
      </View>
    </View>
  );
}

/**
 * Card compacte d'une frontière ouverte « À TERMINER » (AMENDEMENT-17 §CH2).
 * « Ouvre une frontière. Ton crew peut la fermer. » On n'affiche QUE l'humain :
 * zone · mètres restants · fenêtre (h mm, décompte live) · ouvreur, puis 2 CTA
 * — [Voir la route] (aperçu route-planner) et [Terminer] (Course Live mode
 * terminer, `?intention=complete&boundary=<id>`). Jamais de polyline, de score
 * de géométrie, de cellule ni de % (§UX-17) : « Il manque 620 m. Expire dans
 * 23 h 14. Terminer la boucle. »
 */
function BoundaryCard({
  boundary,
  onSeeRoute,
  onComplete,
}: {
  boundary: OpenBoundaryDemo;
  onSeeRoute: () => void;
  onComplete: () => void;
}) {
  const window = useBoundaryCountdown(boundary.expiresInMin);
  return (
    <View style={styles.boundaryCard}>
      <View style={styles.boundaryHead}>
        <View style={styles.boundaryIcon}>
          <Icon name="avantposte" size={18} color={gameColors.crew} />
        </View>
        <View style={styles.boundaryInfo}>
          <Text style={styles.boundaryTitle} numberOfLines={1}>
            {boundary.zone}
          </Text>
          <Text style={styles.boundaryMeta} numberOfLines={1}>
            Ouvert par {boundary.opener} · expire dans {window}
          </Text>
        </View>
        <Text style={styles.boundaryMetric} numberOfLines={1}>
          {formatInt(boundary.missingM)} m
        </Text>
      </View>
      <Text style={styles.boundaryPhrase} numberOfLines={1}>
        Il manque {formatInt(boundary.missingM)} m pour fermer la boucle.
      </Text>
      <View style={styles.boundaryActions}>
        <View style={styles.boundaryActionFill}>
          <InlineRunCTA
            label="Route"
            variant="secondary"
            size="md"
            leading={<Icon name="route" size={16} color={colors.blanc} />}
            onPress={onSeeRoute}
          />
        </View>
        <View style={styles.boundaryActionFill}>
          <InlineRunCTA
            label="Terminer"
            size="md"
            leading={<Icon name="cible" size={16} color={colors.noir} />}
            onPress={onComplete}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Événement d'historique avec réactions GRYD togglables localement (démo :
 * l'état vit dans le composant, déterministe au montage depuis demo.ts).
 */
function HistoryEvent({ event }: { event: WarHistoryEventDemo }) {
  const [reactions, setReactions] = useState<readonly WarEventReaction[]>(
    () => event.reactions.map((r) => ({ ...r })),
  );
  const toggle = (icon: IconName) => {
    setReactions((prev) =>
      prev.map((r) =>
        r.icon === icon
          ? { ...r, mine: !r.mine, count: Math.max(0, r.count + (r.mine ? -1 : 1)) }
          : r,
      ),
    );
  };
  return (
    <WarEventCard
      icon={event.icon}
      message={event.message}
      zone={event.zone}
      points={event.points}
      minutesAgo={event.minutesAgo}
      tint={gameColors[event.tint]}
      reactions={reactions}
      onReact={toggle}
    />
  );
}

/** Lien discret « Voir tout » quand une section a plus de 2 cards. */
function SeeAll({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}
    >
      <Text style={styles.seeAllLabel}>{label}</Text>
      <Icon name="chevron" size={14} color={colors.chartreuse} />
    </Pressable>
  );
}

// ============================================================================
// Écran
// ============================================================================

type OpenSection = 'objectifs' | 'routes' | 'scout' | 'historique' | null;

export default function WarRoomScreen() {
  const toast = useToast();
  // Une seule section ouverte à la fois (anti-scroll) — tout replié au montage.
  const [open, setOpen] = useState<OpenSection>(null);
  const toggle = (s: Exclude<OpenSection, null>) =>
    setOpen((cur) => (cur === s ? null : s));

  useEffect(() => {
    screen('war_room');
  }, []);

  // ACTIF — conquête collective : progression + reste + compte à rebours animé.
  const offensivePct = OFFENSIVE.hexesTaken / OFFENSIVE.objectiveHexes;
  const offensiveLeft = OFFENSIVE.objectiveHexes - OFFENSIVE.hexesTaken;
  const offensiveTimeLeft = useCountdown(OFFENSIVE.remainingS);

  // COFFRE — état/palier DÉRIVÉS de chestStateFor (source unique = Crew HQ).
  const chestPct = MY_CREW.chestProgress / CREW_CHEST_WEEKLY_TARGET;
  const chest = chestStateFor(chestPct);
  const nextTier = CREW_CHEST_TIER_ORDER.find((t) => chestPct < CREW_CHEST_TIERS[t]);
  const chestRemaining = Math.max(0, CREW_CHEST_WEEKLY_TARGET - MY_CREW.chestProgress);

  // À TERMINER — frontières ouvertes (résumé ; détail au chantier 2).
  const firstBoundary = OPEN_BOUNDARIES[0];

  // Membre à assigner sur la défense (démo : première DISPO correspondante).
  const assignee = useMemo(
    () =>
      MY_CREW.members.find(
        (m) => m.availability === DEFENSE_MISSION.assignedAvailability && !m.me,
      ),
    [],
  );

  // Gating visuel par MON rôle démo (matrice §8) — le serveur reste seul juge.
  const myRole = MY_CREW.members.find((m) => m.me)?.role ?? 'runner';
  const canLaunch = roleCan(myRole, 'launchOffensive');
  const canAssign = roleCan(myRole, 'assignDefense');

  const openMap = () => router.push('/(tabs)');

  return (
    <>
      <TabScreen
        title="War Room"
        icon="guerre"
        kicker={`${WAR_STATUS.seasonLabel} · J-${WAR_STATUS.daysLeft} · ${WAR_STATUS.city} · CREW #${WAR_STATUS.crewRank}`}
      >
        {/* ================= 3 PRIORITÉS + COFFRE (sans scroll) ================= */}

        {/* URGENT — défense critique. Rouge sobre mais EN TÊTE (vraiment prioritaire). */}
        <PriorityCard
          tone="danger"
          icon="sablier"
          kicker="URGENT · DÉFENSE"
          title={DEFENSE_MISSION.zone}
          metric={`${DEFENSE_MISSION.expiresInH} h`}
          phrase={`${DEFENSE_MISSION.hexes} zones expirent dans ${DEFENSE_MISSION.expiresInH} h. Une course suffit pour les sauver.`}
          cta="DÉFENDRE"
          onPress={openMap}
          onCta={() => {
            haptics.medium();
            toast.show(`Défense lancée — zone ${DEFENSE_MISSION.zone}`);
            router.push('/route-planner?type=defense');
          }}
          onLongPressCta={
            canAssign
              ? () => {
                  toast.show(
                    assignee
                      ? `Défense proposée à ${assignee.pseudo}`
                      : 'Défense proposée au crew',
                  );
                }
              : undefined
          }
        />

        {/* ACTIF — conquête collective (République 496/800). */}
        <PriorityCard
          tone="crew"
          icon="raid"
          kicker={`ACTIF · CONQUÊTE · ${OFFENSIVE_DURATION_H} H · ${offensiveTimeLeft}`}
          title={OFFENSIVE.zone}
          metric={`${formatInt(OFFENSIVE.hexesTaken)}/${formatInt(OFFENSIVE.objectiveHexes)}`}
          phrase={`${formatInt(offensiveLeft)} zones restantes · ${OFFENSIVE.activeMembers}/${OFFENSIVE.totalMembers} du crew en course. Ta contribution : +${formatInt(OFFENSIVE.myHexes)} zones.`}
          progress={offensivePct}
          cta="REJOINDRE"
          onPress={() => router.push('/route-planner?type=raid')}
          onCta={() => {
            haptics.medium();
            toast.show(`Conquête collective rejointe — cap sur ${OFFENSIVE.zone}`);
            router.push('/route-planner?type=raid');
          }}
        />

        {/* À TERMINER — frontières ouvertes du crew (AMENDEMENT-17 §CH2, boucle
            crew collaborative). « Ouvre une frontière. Ton crew peut la fermer. »
            Max 2 cards visibles (§1.3), « Voir tout » au-delà. Chaque card mène à
            Course Live mode terminer (?intention=complete&boundary=<id>) ou à
            l'aperçu route (route-planner). État vide = invitation à ouvrir. */}
        <View style={styles.boundarySectionHead}>
          <Icon name="avantposte" size={15} color={gameColors.crew} />
          <Text style={styles.boundarySectionLabel}>À TERMINER · FRONTIÈRES</Text>
          {OPEN_BOUNDARIES.length > 0 ? (
            <Text style={styles.boundarySectionCount}>{OPEN_BOUNDARIES.length}</Text>
          ) : null}
        </View>
        {firstBoundary ? (
          <>
            {OPEN_BOUNDARIES.slice(0, 2).map((boundary) => (
              <BoundaryCard
                key={boundary.key}
                boundary={boundary}
                onSeeRoute={() => {
                  haptics.light();
                  router.push('/route-planner');
                }}
                onComplete={() => {
                  haptics.medium();
                  toast.show(`Cap sur ${boundary.zone} — termine la boucle du crew`);
                  router.push(
                    `/course-live?intention=complete&boundary=${boundary.boundaryId}`,
                  );
                }}
              />
            ))}
            {OPEN_BOUNDARIES.length > 2 ? (
              <SeeAll
                label={`Voir les ${OPEN_BOUNDARIES.length} frontières`}
                onPress={() => router.navigate('/crew')}
              />
            ) : null}
          </>
        ) : (
          <View style={styles.boundaryEmpty}>
            <Text style={styles.boundaryEmptyText}>
              Boucle un run fermable pour ouvrir une frontière que ton crew pourra
              fermer.
            </Text>
          </View>
        )}

        {/* COFFRE — jauge hebdo compacte (paliers §39.2 depuis shared). */}
        <PriorityCard
          tone="gold"
          icon="coffre"
          kicker={
            chest.tier ? `COFFRE · ${CHEST_TIER_LABELS[chest.tier].toUpperCase()}` : 'COFFRE CREW'
          }
          title="Coffre du crew"
          metric={`${Math.round(chestPct * 100)} %`}
          phrase={
            nextTier
              ? `Encore ${formatInt(chestRemaining)} pts pour le palier ${CHEST_TIER_LABELS[nextTier]}.`
              : 'Palier max atteint cette semaine. Beau boulot.'
          }
          progress={chestPct}
          cta="Remplir"
          onCta={() => {
            haptics.light();
            toast.show('Cap sur le coffre — cours pour le remplir');
            openMap();
          }}
        />

        {/* DEMANDER AU CREW (AMENDEMENT-18 A.3) : entrée vers le Crew Chat
            actionnable où l'on émet une requête (Défense/Terminer/Route/Scout/
            Sortie). « Demander → quelqu'un aide → le crew progresse. » Aucune
            requête ne donne de territoire ni de point (anti pay-to-win). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Demander de l'aide au crew"
          onPress={() => {
            haptics.light();
            router.navigate('/crew');
          }}
          style={({ pressed }) => [styles.askRow, pressed && styles.pressed]}
        >
          <View style={styles.askIcon}>
            <Icon name="ajoutami" size={16} color={gameColors.crew} />
          </View>
          <View style={styles.askText}>
            <Text style={styles.askTitle}>Demander au crew</Text>
            <Text style={styles.askSub} numberOfLines={1}>
              Défense · Terminer · Route · Scout · Sortie
            </Text>
          </View>
          <Icon name="chevron" size={16} color={colors.gris} />
        </Pressable>

        {/* ================= SOUS LE FOLD : sections repliées ================= */}

        {/* OBJECTIFS — Aujourd'hui / Challenges / Motivation (AMENDEMENT-07) +
            missions « À faire ». Descendu sous le fold, replié par défaut. */}
        <SectionToggle
          icon="mission"
          label="OBJECTIFS"
          open={open === 'objectifs'}
          onToggle={() => toggle('objectifs')}
          count={MISSIONS.length}
        />
        {open === 'objectifs' ? (
          <View style={styles.sectionBody}>
            {/* Rôle + permissions (matrice §8) — gating visuel conservé. */}
            <View style={styles.roleBanner}>
              <Icon name="couronne" size={14} color={colors.blanc} />
              <Text style={styles.roleBannerText} numberOfLines={1}>
                Ton rôle : {CREW_ROLE_LABELS[myRole]}
              </Text>
              <Text style={[styles.rolePerm, canLaunch ? styles.rolePermOk : styles.rolePermNo]}>
                {canLaunch ? 'Peut lancer' : 'Lancer : Co-Cap+'}
              </Text>
              <Text style={[styles.rolePerm, canAssign ? styles.rolePermOk : styles.rolePermNo]}>
                {canAssign ? 'Peut assigner' : 'Assigner : Cap+'}
              </Text>
            </View>

            {/* Accès motivation (AMENDEMENT-07 §8) — entrées CONSERVÉES. */}
            <View style={styles.motivRow}>
              {(
                [
                  { label: "Aujourd'hui", icon: 'aujourdhui', href: '/aujourdhui' },
                  { label: 'Challenges', icon: 'mission', href: '/challenges' },
                  { label: 'Motivation', icon: 'reglages', href: '/settings-motivation' },
                ] as { label: string; icon: IconName; href: string }[]
              ).map((it) => (
                <Pressable
                  key={it.href}
                  accessibilityRole="button"
                  accessibilityLabel={it.label}
                  onPress={() => router.push(it.href)}
                  style={({ pressed }) => [styles.motivChip, pressed && styles.pressed]}
                >
                  <Icon name={it.icon} size={18} color={colors.blanc} />
                  <Text style={styles.motivLabel}>{it.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Missions « À faire » (§7.12) — max 2 visibles, « Voir tout » au-delà. */}
            {MISSIONS.slice(0, 2).map((m) => {
              const done = m.progress >= m.target;
              return (
                <View key={m.key} style={styles.missionRow}>
                  <View style={[styles.missionIcon, done && styles.missionIconDone]}>
                    <Icon
                      name={MISSION_ICON[m.kind] ?? 'mission'}
                      size={18}
                      color={done ? gameColors.crew : colors.blanc}
                    />
                  </View>
                  <View style={styles.missionInfo}>
                    <Text style={styles.missionLabel} numberOfLines={1}>
                      {m.label}
                    </Text>
                    <View style={styles.missionGauge}>
                      <ProgressBar value={m.progress / m.target} height={6} />
                    </View>
                  </View>
                  <Text style={[styles.missionCount, done && styles.missionCountDone]}>
                    {m.progress}/{m.target}
                  </Text>
                </View>
              );
            })}
            {MISSIONS.length > 2 ? (
              <SeeAll
                label={`Voir les ${MISSIONS.length} objectifs`}
                onPress={() => router.push('/challenges')}
              />
            ) : null}
          </View>
        ) : null}

        {/* ROUTES — max 2 visibles, « Voir tout » au-delà. */}
        <SectionToggle
          icon="route"
          label="ROUTES"
          open={open === 'routes'}
          onToggle={() => toggle('routes')}
          count={WAR_ROUTES.length}
        />
        {open === 'routes' ? (
          <View style={styles.sectionBody}>
            {WAR_ROUTES.slice(0, 2).map((route) => {
              const isOpen = route.status === 'open';
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Voir la route ${route.label} sur la carte`}
                  onPress={openMap}
                  style={({ pressed }) => [styles.routeRow, pressed && styles.pressed]}
                >
                  <View
                    style={[
                      styles.routeIcon,
                      { borderColor: isOpen ? gameColors.crew : gameColors.danger },
                    ]}
                  >
                    <Icon
                      name="route"
                      size={16}
                      color={isOpen ? gameColors.crew : gameColors.danger}
                    />
                  </View>
                  <View style={styles.routeInfo}>
                    <Text style={styles.routeLabel} numberOfLines={1}>
                      {route.label}
                    </Text>
                    <Text style={styles.routeMeta}>
                      {route.km.toLocaleString('fr-FR')} km
                      {route.expiresInH !== undefined ? ` · expire dans ${route.expiresInH} h` : ''}
                    </Text>
                  </View>
                  <StatePill
                    state={isOpen ? 'active' : 'decay'}
                    label={isOpen ? 'Ouverte' : 'À défendre'}
                  />
                </Pressable>
              );
            })}
            {WAR_ROUTES.length > 2 ? (
              <SeeAll
                label={`Voir les ${WAR_ROUTES.length} routes`}
                onPress={() => router.push('/route-planner')}
              />
            ) : null}
          </View>
        ) : null}

        {/* SCOUT REPORTS — renseignement agrégé, jamais de position live. */}
        <SectionToggle
          icon="scout"
          label="SCOUT REPORTS"
          open={open === 'scout'}
          onToggle={() => toggle('scout')}
          count={SCOUT_REPORTS.length}
        />
        {open === 'scout' ? (
          <View style={styles.sectionBody}>
            {SCOUT_REPORTS.slice(0, 2).map((report) => (
              <WarEventCard
                key={report.key}
                icon={report.icon}
                message={report.message}
                zone={`${report.zone} · scout ${report.scout}`}
                minutesAgo={report.minutesAgo}
                tint={gameColors[report.tint]}
                onPress={openMap}
              />
            ))}
          </View>
        ) : null}

        {/* HISTORIQUE — War Log compressé, max 2 visibles + « Voir tout ». */}
        <SectionToggle
          icon="historique"
          label="HISTORIQUE"
          open={open === 'historique'}
          onToggle={() => toggle('historique')}
          count={WAR_HISTORY.length}
        />
        {open === 'historique' ? (
          <View style={styles.sectionBody}>
            {WAR_HISTORY.slice(0, 2).map((event) => (
              <HistoryEvent key={event.key} event={event} />
            ))}
            {WAR_HISTORY.length > 2 ? (
              <SeeAll label="Voir tout l'historique" onPress={openMap} />
            ) : null}
          </View>
        ) : null}
      </TabScreen>
      <ToastHost state={toast} />
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.6 },

  // --- Cards de priorité (90-130 px) ---
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    marginTop: 12,
  },
  cardDanger: { borderColor: 'rgba(214,69,69,0.45)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1.5,
    backgroundColor: gameColors.carbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadText: { flex: 1 },
  cardKicker: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  cardTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', marginTop: 2 },
  cardMetric: {
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  cardPhrase: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18, marginTop: 10 },
  cardGauge: { marginTop: 10 },
  cardCta: { marginTop: 12 },

  // --- À TERMINER : en-tête de section + cards frontière (AMENDEMENT-17 §CH2) ---
  boundarySectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    paddingVertical: 4,
  },
  boundarySectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    fontWeight: '600',
  },
  boundarySectionCount: {
    color: gameColors.crew,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 18,
    textAlign: 'center',
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  boundaryCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    marginTop: 12,
  },
  boundaryHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  boundaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: gameColors.crew,
    backgroundColor: gameColors.carbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boundaryInfo: { flex: 1 },
  boundaryTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  boundaryMeta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  boundaryMetric: {
    color: gameColors.crew,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  boundaryPhrase: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18, marginTop: 10 },
  boundaryActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  boundaryActionFill: { flex: 1 },
  boundaryEmpty: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    marginTop: 12,
  },
  boundaryEmptyText: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18 },

  // --- Demander au crew (A.3) : entrée vers le Crew Chat ---
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  askIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: gameColors.crew,
    backgroundColor: gameColors.carbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askText: { flex: 1 },
  askTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  askSub: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2 },

  // --- Sections repliables ---
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 22,
    paddingVertical: 4,
  },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 2, fontWeight: '600' },
  sectionCount: {
    color: colors.gris,
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 18,
    textAlign: 'center',
    backgroundColor: gameColors.carbon,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  sectionSpacer: { flex: 1 },
  chevron: { transform: [{ rotate: '0deg' }] },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  sectionBody: { marginTop: 12, gap: 10 },

  // --- Rôle / permissions (§8) ---
  roleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  roleBannerText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700' },
  rolePerm: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  rolePermOk: { color: gameColors.crew },
  rolePermNo: { color: colors.gris },

  // --- Motivation chips (AMENDEMENT-07) ---
  motivRow: { flexDirection: 'row', gap: 8 },
  motivChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    paddingHorizontal: 6,
  },
  motivLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },

  // --- Missions ---
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  missionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionIconDone: { borderColor: gameColors.crew },
  missionInfo: { flex: 1 },
  missionLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  missionGauge: { marginTop: 8 },
  missionCount: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  missionCountDone: { color: gameColors.crew },

  // --- Routes ---
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  routeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: gameColors.carbon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeInfo: { flex: 1 },
  routeLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  routeMeta: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2, fontVariant: ['tabular-nums'] },

  // --- Voir tout ---
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  seeAllLabel: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700' },
});
