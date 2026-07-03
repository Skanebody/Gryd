/**
 * GRYD — étape de la séquence de résultat (AMENDEMENT-08 §5, doc §10) :
 * n'occupe AUCUNE place tant qu'elle n'est pas révélée, puis apparaît en
 * reveal (useReveal — fondu simple si reduce motion) avec un haptic léger.
 * Grammaire haptique doc §25 : light par étape, medium badge Race+, success
 * pour la validation — le choix est passé par l'écran, jamais deviné ici.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useReveal } from '../../ui/game';
import { haptics } from '../../lib/haptics';

export type RevealHaptic = 'none' | 'light' | 'medium' | 'heavy' | 'success';

export interface ResultRevealProps {
  /** L'étape est atteinte (step courant >= index de l'étape). */
  visible: boolean;
  /** Retour haptique déclenché UNE fois à la révélation. */
  haptic?: RevealHaptic;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

export function ResultReveal({ visible, haptic = 'light', style, children }: ResultRevealProps) {
  const fired = useRef(false);
  useEffect(() => {
    if (visible && !fired.current) {
      fired.current = true;
      if (haptic !== 'none') haptics[haptic]();
    }
  }, [visible, haptic]);

  if (!visible) return null;
  return <Mounted style={style}>{children}</Mounted>;
}

/** Monté seulement à la révélation → useReveal anime depuis le montage. */
function Mounted({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { opacity, scale } = useReveal(true);
  return (
    <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>
  );
}
