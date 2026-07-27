/**
 * GRYD — E22 « DÉFENSE ACTIVE » : CE QUE LA VARIANTE AJOUTE À L'ÉCRAN.
 * (docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md, l.1163-1182.)
 *
 * E22 n'est PAS un écran de plus : c'est E20/E21 avec quatre ajouts, et rien
 * d'autre — le contour de la zone contestée (dessiné sur la carte par
 * `RealCourseLive`, pas ici), la jauge de couverture, le temps restant et le
 * libellé `DÉFENSE`. Les métriques, la pause, le GPS et la trace ne bougent pas
 * d'un pixel : quelqu'un qui court ne doit pas réapprendre son écran parce
 * qu'une contestation s'est ouverte.
 *
 * ─── §A4 : L'UNIQUE CHARTREUSE D'ACTION RESTE LA PAUSE ──────────────────────
 * Ce bloc ne contient AUCUNE action. Pas de bouton « défendre » : on défend en
 * courant, pas en tapant. La jauge se remplit donc en VIOLET (`gameColors.
 * contested`, la couleur de RÔLE du contesté/défense — §C), jamais en
 * chartreuse : la chartreuse porte le gain et l'action, et il n'y a ici ni
 * l'un ni l'autre tant que le serveur n'a pas tranché.
 *
 * ─── « AUCUNE BARRE AGRESSIVE OU ALARMISTE » (spec l.1173) ──────────────────
 * L'échéance est un FAIT en heures pleines, jamais un chrono qui défile — un
 * compte à rebours à la seconde lu en courant est exactement la barre anxiogène
 * que la spec proscrit. Aucun rouge : `gameColors.danger` est réservé à l'erreur
 * système, et perdre une zone n'en est pas une.
 *
 * ─── CE QUE CE BLOC NE DIT JAMAIS ───────────────────────────────────────────
 * Que la zone est sauvée. La jauge est une MESURE locale sur la trace déjà
 * enregistrée ; « la validation finale reste serveur » (l.1182) est écrit à
 * l'écran, en toutes lettres, sous la jauge.
 */
import { StyleSheet, Text, View } from 'react-native';
import {
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  spacing,
  withAlpha,
} from '@klaim/shared';
import { C } from '../../../i18n/catalog/defenseLive';
import { useT } from '../../../i18n/store';
import type { Entry } from '../../../i18n/types';
import { Icon } from '../../../ui/Icon';
import { ProgressBar } from '../../../ui/ProgressBar';
import type { DefenseLevel } from './coverage';
import type { DefenseDeadlineDisplay } from './liveDefense';

/** Libellé du palier atteint. `null` = rien n'a encore été longé (jamais « 0 % » nu). */
function coverageLabel(level: DefenseLevel | null): Entry {
  if (level === null) return C.coverageNone;
  switch (level) {
    case 'cover':
      return C.coverageFull;
    case 'longe':
      return C.coverageLonge;
    case 'traverse':
      return C.coverageTraverse;
  }
}

export interface DefenseHudProps {
  /**
   * Couverture MESURÉE 0-1 sur le contour réel (moteur `frontierCoverage`).
   * `null` tant qu'aucune trace exploitable n'existe : la jauge reste à zéro et
   * le libellé dit quoi faire, il n'annonce pas un pourcentage.
   */
  readonly coverage: number | null;
  /** Palier atteint, ou `null` si rien n'a encore été longé. */
  readonly level: DefenseLevel | null;
  /** Les quatre formes d'échéance (`liveDefense.defenseDeadlineDisplay`). */
  readonly deadline: DefenseDeadlineDisplay;
  /**
   * La couverture vient de devenir suffisante : on affiche le label exact de la
   * spec (l.1180). L'haptique succès est jouée par l'écran, pas par ce bloc.
   */
  readonly possible: boolean;
  /**
   * La lecture de la zone est EN COURS : l'échéance ne s'affirme pas encore.
   * Distinct de « échéance inconnue » — un chargement n'affirme rien.
   */
  readonly deadlineLoading: boolean;
}

export function DefenseHud({
  coverage,
  level,
  deadline,
  possible,
  deadlineLoading,
}: DefenseHudProps) {
  const t = useT();
  const label = t(coverageLabel(level));

  // ─── L'ÉCHÉANCE EST DERRIÈRE NOUS : ON ARRÊTE DE PROMETTRE ─────────────────
  // `defenseDeadlineDisplay` produit QUATRE formes ; ce bloc n'en traitait que
  // trois et laissait `'passed'` tomber dans « Échéance inconnue », la copie
  // d'une échéance ILLISIBLE. Le HUD continuait alors à peindre la pill DÉFENSE,
  // la jauge violette et « La défense est validée par le serveur » pour une
  // contestation dont le délai est écoulé — un mensonge d'écran entier, pas
  // seulement un mot. Le cas n'est pas théorique : `useLiveDefense` lit les
  // contestations UNE fois (au premier fix) alors que l'échéance est recalculée
  // à chaque rendu avec `Date.now()`, donc une sortie assez longue le traverse.
  // La garde est ici, dans le composant, plutôt que chez l'appelant : aucun
  // futur consommateur ne peut la contourner par oubli.
  if (!deadlineLoading && deadline.kind === 'passed') return <DefenseDeadlinePassedNotice />;

  const deadlineText = deadlineLoading
    ? t(C.deadlineLoading)
    : deadline.kind === 'in' && deadline.hours !== null
      ? t(C.deadlineIn, { hours: deadline.hours })
      : deadline.kind === 'soon'
        ? t(C.deadlineSoon)
        : t(C.deadlineUnknown);

  return (
    <View style={styles.root} accessibilityLabel={t(C.a11yMode)}>
      <View style={styles.head}>
        <View style={styles.kicker}>
          <Icon name="bouclier" size={iconSizes.xs} color={gameColors.contested} />
          <Text style={styles.kickerText} numberOfLines={1}>
            {t(C.kicker)}
          </Text>
        </View>
        {/* L'échéance : un fait, en heures pleines. Jamais un chrono. */}
        <Text style={styles.deadline} numberOfLines={1}>
          {deadlineText}
        </Text>
      </View>

      <View
        accessibilityLabel={t(C.a11yCoverage, { label })}
        // La valeur lue vient du libellé de palier, pas du pourcentage brut :
        // c'est ce que l'écran affirme, et un lecteur d'écran doit entendre
        // exactement ce que les autres voient.
      >
        <ProgressBar value={coverage ?? 0} height={6} fill={gameColors.contested} />
      </View>

      <Text style={styles.coverage} numberOfLines={1}>
        {possible ? t(C.defensePossible) : label}
      </Text>

      {/* « La validation finale reste serveur » — sans cette ligne, la jauge se
          lirait comme un verdict. Elle est discrète, jamais absente. */}
      <Text style={styles.server}>{t(C.serverDecides)}</Text>
    </View>
  );
}

/**
 * La zone n'a pas pu être lue (réseau coupé, lecture échouée). On le DIT — et
 * on dit surtout ce qui compte : l'activité continue d'être enregistrée. Une
 * jauge figée à zéro mentirait par immobilité.
 */
export function DefenseUnavailableNotice() {
  const t = useT();
  return (
    <View style={styles.notice}>
      <Icon name="bouclier" size={iconSizes.xs} color={colors.gris} />
      <Text style={styles.noticeText}>{t(C.zoneUnavailable)}</Text>
    </View>
  );
}

/**
 * L'ÉCHÉANCE EST PASSÉE PENDANT LA SORTIE. Même forme neutre que la notice
 * d'indisponibilité, et pour la même raison : ce qui reste à l'écran ne doit
 * plus rien affirmer sur une défense qui n'a plus d'effet. Ni jauge (elle
 * mesurerait un effort qui ne compte plus), ni « validé par le serveur » (il n'y
 * a plus rien à valider ici), ni couleur de contesté — la bordure redevient
 * grise. La seule chose vraie, et elle est dite : la sortie continue.
 */
export function DefenseDeadlinePassedNotice() {
  const t = useT();
  return (
    <View style={styles.notice}>
      <Icon name="bouclier" size={iconSizes.xs} color={colors.gris} />
      <Text style={styles.noticeText}>{t(C.deadlinePassed)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
    maxWidth: 360,
    width: '100%',
    backgroundColor: withAlpha(colors.noir, 0.7),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: withAlpha(gameColors.contested, 0.45),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kickerText: {
    color: gameColors.contested,
    fontSize: fontSizes.xs,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  deadline: {
    flex: 1,
    textAlign: 'right',
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
  },
  coverage: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '800' },
  server: { color: colors.grisFaible, fontSize: fontSizes.xs, fontWeight: '500' },

  notice: {
    alignSelf: 'center',
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: withAlpha(colors.noir, 0.7),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  noticeText: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', flexShrink: 1 },
});
