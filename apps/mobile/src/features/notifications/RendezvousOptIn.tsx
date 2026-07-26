/**
 * GRYD — OPT-IN RENDEZ-VOUS (§ rétention) sur l'écran de résultat. Après une
 * course, le joueur peut poser UN rappel LOCAL pour sa prochaine sortie — le seul
 * déclencheur de retour shippable sans backend (cf. localReminder.ts).
 *
 * Surface SECONDAIRE : jamais la chartreuse du CTA [Partager] (§A, un seul CTA
 * chartreuse par écran). Web / module absent / erreur → RIEN (absence honnête,
 * pas de bouton mort). Refus de permission → message honnête, pas un bouton qui
 * échoue en boucle. Une fois posé, la surface montre l'état « posé » (tap =
 * annuler) — jamais re-proposer en boucle.
 *
 * ─── LE RAPPEL PARLE DE LA DISCIPLINE QU'ON VIENT DE TERMINER (26/07/2026) ──
 * Cette surface servait « Me rappeler ma prochaine sortie » / « Ta prochaine
 * sortie t'attend » en version course à pied à tout le monde. Deux raisons pour
 * lesquelles c'est pire ici qu'ailleurs : le rappel est POSÉ depuis le Résultat,
 * donc il hérite naturellement de ce que le joueur vient de faire ; et il
 * REVIENT tous les jours, hors de l'app, sur l'écran de verrouillage. Promettre
 * une course à un cycliste, c'est lui proposer un autre sport que le sien, tous
 * les soirs. La discipline est donc une PROP obligatoire — pas une valeur par
 * défaut : un appelant qui l'ignore doit s'en apercevoir à la compilation.
 */
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, iconSizes, sizes, spacing, type Activity } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { useT } from '../../i18n/store';
import { C, resultCopy } from '../../i18n/catalog/result';
import {
  RENDEZVOUS_DEFAULT_HOUR,
  cancelRendezvous,
  reconcileRendezvous,
  scheduleDailyRendezvous,
} from './localReminder';

type Mode = 'loading' | 'offer' | 'set' | 'denied' | 'hidden';

function timeLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function RendezvousOptIn({ activity }: { activity: Activity }) {
  const t = useT();
  /** Les mots de CETTE discipline — porte d'entrée unique, exhaustive (§ result). */
  const A = resultCopy(activity);
  const [mode, setMode] = useState<Mode>('loading');
  const [time, setTime] = useState(timeLabel(RENDEZVOUS_DEFAULT_HOUR, 0));

  useEffect(() => {
    let alive = true;
    // Web : pas de notification locale à poser → on n'affiche RIEN (jamais un
    // bouton qui échouerait toujours sur cette plateforme).
    if (Platform.OS === 'web') {
      setMode('hidden');
      return;
    }
    // RÉCONCILIÉ avec l'OS (natif) : jamais « posé » si la notif n'existe plus ou
    // si la permission a été coupée dans les Réglages système (l'app ne ment jamais).
    void reconcileRendezvous().then((s) => {
      if (!alive) return;
      if (s.scheduled) {
        setTime(timeLabel(s.hour ?? RENDEZVOUS_DEFAULT_HOUR, s.minute ?? 0));
        setMode('set');
      } else {
        setMode('offer');
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const schedule = async () => {
    const status = await scheduleDailyRendezvous(RENDEZVOUS_DEFAULT_HOUR, 0, {
      title: t(C.rendezvousNotifTitle),
      // Le CORPS de la notification, dans la discipline de la sortie qu'on
      // vient de terminer. C'est le texte qui sortira de l'app tous les jours.
      body: t(A.rendezvousNotifBody),
    });
    if (status === 'scheduled') {
      setTime(timeLabel(RENDEZVOUS_DEFAULT_HOUR, 0));
      setMode('set');
    } else if (status === 'permission_denied') {
      setMode('denied');
    } else {
      // unsupported / module_missing / error → on efface la surface (honnête).
      setMode('hidden');
    }
  };

  const cancel = async () => {
    await cancelRendezvous();
    setMode('offer');
  };

  if (mode === 'loading' || mode === 'hidden') return null;

  if (mode === 'denied') {
    return (
      <View style={styles.row} accessibilityRole="text">
        <Icon name="cloche" size={iconSizes.sm} color={colors.gris} />
        <Text style={styles.denied}>{t(C.rendezvousDenied)}</Text>
      </View>
    );
  }

  if (mode === 'set') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.rendezvousCancel)}
        onPress={cancel}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {/* §A : jamais chartreuse ici — le CTA chartreuse unique de l'écran reste
            [Partager]. L'état « posé » est une confirmation passive, pas un CTA. */}
        <Icon name="cloche" size={iconSizes.sm} color={colors.gris} />
        <Text style={styles.setLabel}>{t(C.rendezvousSet, { time })}</Text>
        <Text style={styles.cancel}>{t(C.rendezvousCancel)}</Text>
      </Pressable>
    );
  }

  // offer
  return (
    <Pressable
      accessibilityRole="button"
      onPress={schedule}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon name="cloche" size={iconSizes.sm} color={colors.blanc} />
      <Text style={styles.offerLabel}>{t(A.rendezvousOffer)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    // Plancher tactile du projet — le TOKEN, jamais un 44 recopié : une valeur
    // dupliquée ne suit pas la charte le jour où la charte bouge.
    minHeight: sizes.touchTarget,
    paddingHorizontal: spacing.md,
  },
  pressed: { opacity: 0.6 },
  offerLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  setLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  cancel: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '700' },
  denied: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600', textAlign: 'center' },
});
