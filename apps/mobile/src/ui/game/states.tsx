/**
 * GRYD — vocabulaire VISUEL commun du design system jeu (AMENDEMENT-08 §1).
 * Les 12 états doc §26 partagés par les cartes : chaque état mappe vers UNE
 * teinte fonctionnelle (gameColors — la couleur lit l'état de jeu, jamais
 * décorative) + un libellé FR court de jeu. `StatePill` est le rendu standard.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';

export type GameVisualState =
  | 'unlocked'
  | 'locked'
  | 'inprogress'
  | 'claimable'
  | 'active'
  | 'expired'
  | 'contested'
  | 'protected'
  | 'decay'
  | 'verified'
  | 'statsonly'
  | 'rejected';

export interface GameStateStyle {
  /** Teinte fonctionnelle de l'état (token gameColors/colors). */
  tint: string;
  /** Libellé FR court, vocabulaire de jeu (doc §27). */
  label: string;
}

export const GAME_STATE_STYLE: Record<GameVisualState, GameStateStyle> = {
  unlocked: { tint: gameColors.crew, label: 'Débloqué' },
  locked: { tint: colors.gris, label: 'Verrouillé' },
  inprogress: { tint: colors.blanc, label: 'En cours' },
  claimable: { tint: gameColors.crew, label: 'À récupérer' },
  active: { tint: gameColors.crew, label: 'Actif' },
  expired: { tint: colors.gris, label: 'Expiré' },
  contested: { tint: gameColors.contested, label: 'Contesté' },
  protected: { tint: gameColors.verify, label: 'Protégé' },
  decay: { tint: gameColors.danger, label: 'Decay' },
  verified: { tint: gameColors.verify, label: 'Vérifié' },
  statsonly: { tint: colors.gris, label: 'Stats only' },
  rejected: { tint: gameColors.danger, label: 'Rejeté' },
};

export interface StatePillProps {
  state: GameVisualState;
  /** Remplace le libellé standard (ex. « Expire dans 48 h »). */
  label?: string;
}

/** Pastille d'état standard : point teinté + libellé court. */
export function StatePill({ state, label }: StatePillProps) {
  const s = GAME_STATE_STYLE[state];
  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: s.tint }]} />
      <Text style={[styles.label, { color: s.tint }]} numberOfLines={1}>
        {label ?? s.label}
      </Text>
    </View>
  );
}

/** Libellé « il y a Xmin / Xh » des feeds de guerre. */
export function timeAgoLabel(minutesAgo: number): string {
  const m = Math.max(0, Math.round(minutesAgo));
  if (m < 1) return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: gameColors.carbon,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.3 },
});
