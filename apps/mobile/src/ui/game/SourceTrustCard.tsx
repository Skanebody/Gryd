/**
 * GRYD — SourceTrustCard : source connectée du GRYD Verify Hub
 * (AMENDEMENT-08 §1 & §10, doc §21). Nom, statut de connexion, trust level
 * (teinte verify — la confiance est un état de jeu), rôle des données, et
 * éligibilité capture vs stats only. « Seules les courses vérifiées capturent. »
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii, type IconName } from '@klaim/shared';
import { Icon } from '../Icon';
import { StatePill } from './states';

export type SourceStatus = 'connected' | 'disconnected' | 'error';
export type SourceTrust = 'high' | 'medium' | 'low';

const TRUST_LABEL: Record<SourceTrust, string> = {
  high: 'Trust : élevé',
  medium: 'Trust : moyen',
  low: 'Trust : faible',
};

const STATUS_META: Record<SourceStatus, { label: string; tint: string }> = {
  connected: { label: 'Connecté', tint: gameColors.verify },
  disconnected: { label: 'Non connecté', tint: colors.gris },
  error: { label: 'À reconnecter', tint: gameColors.danger },
};

export interface SourceTrustCardProps {
  /** Nom de la source (« Apple Health », « GRYD Live GPS »). */
  name: string;
  /** Icône de la source (défaut lien ; gps pour le Live GPS). */
  icon?: IconName;
  status: SourceStatus;
  trust: SourceTrust;
  /** Rôle des données (« courses, pas, cadence »). */
  role: string;
  /** Éligibilité : capture (après vérif) ou stats uniquement. */
  capture: 'verified' | 'statsonly';
  /** CTA (« Connecter », « Gérer »). */
  actionLabel?: string;
  onAction?: () => void;
}

export function SourceTrustCard({
  name,
  icon = 'lien',
  status,
  trust,
  role,
  capture,
  actionLabel,
  onAction,
}: SourceTrustCardProps) {
  const s = STATUS_META[status];
  const connected = status === 'connected';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { borderColor: connected ? s.tint : colors.grisLigne }]}>
          <Icon name={icon} size={20} color={connected ? s.tint : colors.gris} />
        </View>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.status, { color: s.tint }]} numberOfLines={1}>
            {s.label}
            {connected ? ` · ${TRUST_LABEL[trust]}` : ''}
          </Text>
          <Text style={styles.role} numberOfLines={1}>
            Rôle : {role}
          </Text>
        </View>
        <StatePill
          state={capture === 'verified' ? 'verified' : 'statsonly'}
          label={capture === 'verified' ? 'Capture après vérif' : 'Stats only'}
        />
      </View>

      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
  },
  body: { flex: 1, gap: 2 },
  name: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  status: { fontSize: fontSizes.xs, fontWeight: '600' },
  role: { color: colors.gris, fontSize: fontSizes.xs },
  action: {
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '600' },
  pressed: { opacity: 0.85 },
});
