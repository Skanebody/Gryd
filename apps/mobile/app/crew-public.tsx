/**
 * GRYD — page CREW PUBLIQUE « la base » (AMENDEMENT-08 §10, doc §16). Écran
 * POUSSÉ depuis Crew Discovery (« Voir la base », param ?crew=TAG — fallback
 * garanti, jamais d'écran cassé §0). Scène de jeu cohérente avec la
 * CrewDiscoveryCard : grand blason CrewCrest + frame de ligue, Niv · ligue,
 * tags de style de jeu, stats (membres/runs/zone tenue), rôles recherchés
 * iconés, candidature (CTA chartreuse fort) + Partager / Copier lien (toast).
 * Niveau/tier/statut DÉRIVÉS des règles réelles (features/crew/rules) — pas de
 * nombre magique. Données démo (features/crew/publicDemo). Zéro position live.
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  CREW_MAX_MEMBERS,
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  type IconName,
} from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { GhostButton } from '../src/ui/GhostButton';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { formatInt } from '../src/ui/format';
import { CrewCrest, CREW_ROLE_META } from '../src/ui/game';
import {
  ACTIVITY_STATUS_LABELS,
  activityStatusForScore,
  CREW_ROLE_LABELS,
  crewFrameTierForLevel,
  crewLevelForXp,
  FRAME_TIER_LABELS,
} from '../src/features/crew/rules';
import {
  playTagsFor,
  publicCrewForTag,
  RECRUITMENT_LABELS,
  type CrewPlayTagKey,
} from '../src/features/crew/publicDemo';
import { ToastHost, useToast } from '../src/features/social/Toast';

/** Tag de jeu → libellé + teinte d'ÉTAT (même lecture que CrewDiscoveryCard). */
const TAG_META: Record<CrewPlayTagKey, { label: string; tint: string }> = {
  war: { label: 'War Active', tint: gameColors.rival },
  defense: { label: 'Defense Active', tint: gameColors.verify },
  competitive: { label: 'Competitive', tint: gameColors.contested },
};

/**
 * Métadonnées de rôle (icône + libellé). CREW_ROLE_META (ui/game) est indexé
 * par les clés MemberCard ('cocaptain') — les rôles shared ('co_captain')
 * passent par le fallback libellé (features/crew/rules) + icône bouclier.
 */
function roleMeta(role: string): { label: string; icon: IconName } {
  const meta = (CREW_ROLE_META as Partial<Record<string, { label: string; icon: IconName }>>)[role];
  return meta ?? { label: CREW_ROLE_LABELS[role] ?? role, icon: 'bouclier' };
}

export default function CrewPublicScreen() {
  const params = useLocalSearchParams<{ crew?: string }>();
  const toast = useToast();
  // Guard §0 : param absent/inconnu → première fiche démo, jamais d'écran cassé.
  const crew = publicCrewForTag(typeof params.crew === 'string' ? params.crew : undefined);

  useEffect(() => {
    screen('crew_public');
  }, []);

  const level = crewLevelForXp(crew.xp);
  const tier = crewFrameTierForLevel(level);
  const leagueLabel = `${FRAME_TIER_LABELS[tier] ?? tier} League`;
  const status = activityStatusForScore(crew.activityScore);
  const tags = playTagsFor(crew);
  const openRecruitment = crew.recruitment === 'open';
  const canRequest = crew.recruitment !== 'closed';
  const placesLeft = Math.max(0, CREW_MAX_MEMBERS - crew.members);

  return (
    <>
      <StackScreen title={crew.name} icon="crest" kicker={`CREW · ${crew.city.toUpperCase()}`}>
        {/* LA BASE — grand blason + frame de ligue + identité de jeu */}
        <View style={styles.headerCard}>
          <CrewCrest
            seed={`${crew.tag}·${crew.name}`}
            name={crew.name}
            size="xl"
            leagueTier={tier}
            tint={colors.blanc}
          />
          <Text style={styles.name}>{crew.name.toUpperCase()}</Text>
          <Text style={styles.meta}>
            Niv. {level} · {leagueLabel}
          </Text>
          <View style={styles.statusChip}>
            <Icon name="radar" size={13} color={gameColors.crew} />
            <Text style={styles.statusText}>{ACTIVITY_STATUS_LABELS[status]}</Text>
          </View>
          {tags.length > 0 ? (
            <View style={styles.tags}>
              {tags.map((t) => {
                const m = TAG_META[t];
                return (
                  <View key={t} style={[styles.tag, { borderColor: m.tint }]}>
                    <Text style={[styles.tagLabel, { color: m.tint }]}>{m.label}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <Text style={styles.bio}>{crew.bio}</Text>

        {/* Stats de base : effectif, rythme, territoire tenu */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {crew.members}/{CREW_MAX_MEMBERS}
            </Text>
            <Text style={styles.statLabel}>membres</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatInt(crew.weeklyRuns)}</Text>
            <Text style={styles.statLabel}>runs/sem</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{formatInt(crew.heldHexes)}</Text>
            <Text style={styles.statLabel}>zone tenue</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{crew.language}</Text>
            <Text style={styles.statLabel}>langue</Text>
          </View>
        </View>

        {/* Recrutement : statut + places restantes */}
        <View style={styles.recruitCard}>
          <Icon name="ajoutami" size={18} color={colors.blanc} />
          <View style={styles.recruitInfo}>
            <Text style={styles.recruitLabel}>RECRUTEMENT</Text>
            <Text style={styles.recruitValue}>{RECRUITMENT_LABELS[crew.recruitment]}</Text>
          </View>
          <Text style={[styles.places, placesLeft === 0 && styles.placesFull]}>
            {placesLeft === 0
              ? 'Complet'
              : `${placesLeft} place${placesLeft > 1 ? 's' : ''} restante${placesLeft > 1 ? 's' : ''}`}
          </Text>
        </View>

        {/* Rôles recherchés (§16) — chips iconées par rôle */}
        {crew.rolesWanted.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>RECHERCHE</Text>
            <View style={styles.roles}>
              {crew.rolesWanted.map((role) => {
                const meta = roleMeta(role);
                return (
                  <View key={role} style={styles.roleChip}>
                    <Icon name={meta.icon} size={14} color={colors.blanc} />
                    <Text style={styles.roleText}>{meta.label}</Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        {/* Candidature : CTA fort + partage */}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canRequest || placesLeft === 0 }}
            disabled={!canRequest || placesLeft === 0}
            onPress={() => {
              // TODO(O1) : crew_applications (candidature réelle).
              haptics.medium();
              toast.show(openRecruitment ? 'Bienvenue dans le crew' : 'Demande envoyée');
            }}
            style={({ pressed }) => [
              styles.primary,
              (pressed || !canRequest || placesLeft === 0) && styles.dim,
            ]}
          >
            <Text style={styles.primaryLabel}>
              {openRecruitment ? 'Rejoindre' : 'Demander à rejoindre'}
            </Text>
          </Pressable>
          <View style={styles.actionsRow}>
            <View style={styles.actionCell}>
              <GhostButton
                label="Partager"
                icon="partage"
                onPress={() => toast.show('Fiche crew partagée')}
              />
            </View>
            <View style={styles.actionCell}>
              <GhostButton
                label="Copier le lien"
                icon="copier"
                onPress={() => toast.show(`Lien copié — ${crew.inviteLink}`)}
              />
            </View>
          </View>
        </View>

        <Text style={styles.footnote}>
          Les signaux d'activité sont agrégés au niveau du crew. Aucune position live n'est
          exposée (§37.3).
        </Text>
      </StackScreen>
      <ToastHost state={toast} />
    </>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 22,
    paddingHorizontal: spacing.cardPadding,
  },
  name: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 6,
    textAlign: 'center',
  },
  meta: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.3 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  statusText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.3 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 2 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  tagLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  bio: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.55,
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 16,
    paddingHorizontal: spacing.cardPadding,
  },
  stat: { alignItems: 'center', flex: 1 },
  statValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 3 },
  recruitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
  },
  recruitInfo: { flex: 1 },
  recruitLabel: { color: colors.gris, fontSize: 10, letterSpacing: 1.2 },
  recruitValue: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', marginTop: 2 },
  places: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '700' },
  placesFull: { color: colors.gris },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 26,
    marginBottom: 12,
  },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.carbone,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  roleText: { color: colors.blanc, fontSize: fontSizes.xs, letterSpacing: 0.2 },
  actions: { marginTop: 24, gap: 10 },
  primary: {
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: gameColors.crew,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Libellé noir sur chartreuse (contraste charte — jamais l'inverse).
  primaryLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '700' },
  dim: { opacity: 0.6 },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCell: { flex: 1 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 22,
  },
});
