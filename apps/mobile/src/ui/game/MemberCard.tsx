/**
 * GRYD — MemberCard : membre du crew mis en scène (AMENDEMENT-08 §1, doc §12).
 * Avatar hex, pseudo, rôle iconé, dispo guerre, contribution semaine, dernière
 * action ; actions au tap (Assigner / Inviter / Promouvoir…) rendues en rangée
 * de boutons ghost courts. Rôles monochromes charte (icône ≠ couleur — la
 * couleur reste réservée aux états de jeu).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, type BadgeTier, type IconName } from '@klaim/shared';
import { Icon } from '../Icon';
import { PlayerAvatarFrame } from './PlayerAvatarFrame';

export type CrewRole =
  | 'runner'
  | 'scout'
  | 'defender'
  | 'raider'
  | 'captain'
  | 'cocaptain'
  | 'leader';

/** Rôle → libellé FR + icône filaire (doc §12 — chaque rôle a son icône). */
export const CREW_ROLE_META: Record<CrewRole, { label: string; icon: IconName }> = {
  runner: { label: 'Runner', icon: 'foulees' },
  scout: { label: 'Scout', icon: 'scout' },
  defender: { label: 'Defender', icon: 'bouclier' },
  raider: { label: 'Raider', icon: 'raid' },
  captain: { label: 'Captain', icon: 'couronne' },
  cocaptain: { label: 'Co-Captain', icon: 'couronne' },
  leader: { label: 'Leader', icon: 'crest' },
};

export interface MemberAction {
  label: string;
  icon?: IconName;
  onPress: () => void;
}

export interface MemberCardProps {
  name: string;
  role: CrewRole;
  /** Tier joueur (frame de l'avatar). */
  tier?: BadgeTier;
  imageUri?: string;
  /** Dispo guerre (« Dispo guerre » chartreuse si true). */
  warReady?: boolean;
  /** Contribution de la semaine en points. */
  weeklyPoints?: number;
  /** Dernière action courte (« 14 hexes repris »). */
  lastAction?: string;
  /** true = c'est moi. */
  isMe?: boolean;
  /** Actions au tap (Assigner mission / Inviter sortie / Promouvoir…). */
  actions?: readonly MemberAction[];
  onPress?: () => void;
}

export function MemberCard({
  name,
  role,
  tier,
  imageUri,
  warReady = false,
  weeklyPoints,
  lastAction,
  isMe = false,
  actions,
  onPress,
}: MemberCardProps) {
  const meta = CREW_ROLE_META[role];

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.row}>
        <PlayerAvatarFrame name={name} tier={tier} size="m" imageUri={imageUri} isMe={isMe} />
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.roleRow}>
            <Icon name={meta.icon} size={13} color={colors.gris} />
            <Text style={styles.role} numberOfLines={1}>
              {meta.label}
              {warReady ? ' · ' : ''}
            </Text>
            {warReady ? <Text style={styles.warReady}>Dispo guerre</Text> : null}
          </View>
          {lastAction ? (
            <Text style={styles.lastAction} numberOfLines={1}>
              Dernière action : {lastAction}
            </Text>
          ) : null}
        </View>
        {weeklyPoints !== undefined ? (
          <View style={styles.points}>
            <Text style={styles.pointsValue}>{weeklyPoints.toLocaleString('fr-FR')}</Text>
            <Text style={styles.pointsLabel}>pts / sem</Text>
          </View>
        ) : null}
      </View>

      {actions && actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              onPress={a.onPress}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              {a.icon ? <Icon name={a.icon} size={13} color={colors.blanc} /> : null}
              <Text style={styles.actionLabel} numberOfLines={1}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    gap: 12,
  },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { flex: 1, gap: 2 },
  name: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  role: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  warReady: { color: gameColors.crew, fontSize: fontSizes.xs, fontWeight: '600' },
  lastAction: { color: colors.gris, fontSize: fontSizes.xs },
  points: { alignItems: 'flex-end' },
  pointsValue: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700' },
  pointsLabel: { color: colors.gris, fontSize: 10, letterSpacing: 0.3 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  actionLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
});
