/**
 * GRYD — toast léger (AMENDEMENT-07 §8 : « Copier lien + toast »). Bandeau
 * carbone flottant qui apparaît en fondu, se dismiss seul (motion.toastDismissMs,
 * addendum §G) — aucune couleur hors tokens, pas de rouge. Usage :
 *   const toast = useToast();
 *   toast.show('Lien copié');
 *   <ToastHost state={toast} />
 * Volontairement minimal (pas de file d'attente) : suffisant pour les confirms
 * démo. react-native Animated (aucune dépendance nouvelle).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, fontSizes, motion, radii } from '@klaim/shared';
import { Icon } from '../../ui/Icon';

export interface ToastController {
  message: string | null;
  show: (message: string) => void;
}

/** Hook d'état de toast — un seul message à la fois. */
export function useToast(): ToastController {
  const [message, setMessage] = useState<string | null>(null);
  const show = useCallback((m: string) => setMessage(m), []);
  return { message, show };
}

export function ToastHost({ state }: { state: ToastController }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (state.message === null) return;
    setVisible(true);
    Animated.timing(opacity, {
      toValue: 1,
      duration: motion.transitionMs,
      useNativeDriver: true,
    }).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: motion.transitionMs,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, motion.toastDismissMs);
    return () => clearTimeout(t);
  }, [state.message, opacity]);

  if (!visible || state.message === null) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { opacity }]}>
      <Icon name="badge" size={16} color={colors.chartreuse} />
      <Text style={styles.text}>{state.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.carbone2,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  text: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', letterSpacing: 0.2 },
});
