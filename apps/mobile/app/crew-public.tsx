/**
 * GRYD — Page CREW PUBLIQUE / recrutement (AMENDEMENT-07 §8, doc social §27).
 * Écran POUSSÉ (depuis Crew Discovery). Blason à cadre par tier (CrewFrame),
 * level (DÉRIVÉ de l'XP), league, membres, statut de recrutement, rôles
 * recherchés ; boutons Demander à rejoindre / Partager / Copier lien (+ toast).
 * Le niveau et le statut d'activité viennent des règles réelles (features/crew/
 * rules) — pas de nombre magique local. Données démo (features/crew/publicDemo).
 * Zéro position live.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CREW_MAX_MEMBERS,
  colors,
  fontSizes,
  radii,
  spacing,
} from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { GhostButton } from '../src/ui/GhostButton';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { formatInt } from '../src/ui/format';
import { CrewFrame } from '../src/features/crew/CrewFrame';
import {
  ACTIVITY_STATUS_LABELS,
  CREW_ROLE_LABELS,
  activityStatusForScore,
  crewFrameTierForLevel,
  crewLevelForXp,
} from '../src/features/crew/rules';
import {
  LEAGUE_LABELS,
  PUBLIC_CREW,
  RECRUITMENT_LABELS,
} from '../src/features/crew/publicDemo';
import { ToastHost, useToast } from '../src/features/social/Toast';

export default function CrewPublicScreen() {
  const toast = useToast();
  const crew = PUBLIC_CREW;

  useEffect(() => {
    screen('crew_public');
  }, []);

  const level = crewLevelForXp(crew.xp);
  const frameTier = crewFrameTierForLevel(level);
  const status = activityStatusForScore(crew.activityScore);
  const canRequest = crew.recruitment !== 'closed';

  return (
    <>
      <StackScreen title={crew.name} icon="crew" kicker={`CREW · ${crew.city.toUpperCase()}`}>
        {/* Blason + identité */}
        <View style={styles.headerCard}>
          <CrewFrame tier={frameTier} tag={crew.tag} size={88} />
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{crew.name}</Text>
            <Text style={styles.meta}>
              Niv. {level} · {LEAGUE_LABELS[crew.league]}
            </Text>
            <View style={styles.statusChip}>
              <Icon name="alerte" size={13} color={colors.chartreuse} />
              <Text style={styles.statusText}>{ACTIVITY_STATUS_LABELS[status]}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.bio}>{crew.bio}</Text>

        {/* Stats clés */}
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
            <Text style={styles.statValue}>{crew.language}</Text>
            <Text style={styles.statLabel}>langue</Text>
          </View>
        </View>

        {/* Statut de recrutement */}
        <View style={styles.recruitCard}>
          <Icon name="ajoutami" size={18} color={colors.blanc} />
          <View style={styles.recruitInfo}>
            <Text style={styles.recruitLabel}>Recrutement</Text>
            <Text style={styles.recruitValue}>{RECRUITMENT_LABELS[crew.recruitment]}</Text>
          </View>
        </View>

        {/* Rôles recherchés (§27) */}
        {crew.rolesWanted.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>RÔLES RECHERCHÉS</Text>
            <View style={styles.roles}>
              {crew.rolesWanted.map((role) => (
                <View key={role} style={styles.roleChip}>
                  <Icon name="bouclier" size={14} color={colors.blanc} />
                  <Text style={styles.roleText}>{CREW_ROLE_LABELS[role]}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Actions : demander / partager / copier lien */}
        <View style={styles.actions}>
          <GhostButton
            label={crew.recruitment === 'open' ? 'Rejoindre' : 'Demander à rejoindre'}
            icon="ajoutami"
            disabled={!canRequest}
            onPress={() =>
              toast.show(
                crew.recruitment === 'open' ? 'Bienvenue dans le crew' : 'Demande envoyée',
              )
            }
          />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 16,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  headerInfo: { flex: 1, gap: 6 },
  name: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: 0.3 },
  meta: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  statusText: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.3 },
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
  recruitLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.4 },
  recruitValue: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', marginTop: 2 },
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
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionCell: { flex: 1 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 22,
  },
});
