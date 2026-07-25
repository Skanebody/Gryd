/**
 * GRYD — E18 : LE PALMARÈS À L'ÉCRAN (« Records personnels »).
 *
 * ─── POURQUOI CETTE SECTION N'EST PAS UN QUATRIÈME BLOC ─────────────────────
 * La planche E18 impose TROIS blocs et une seule grammaire :
 * chiffre → graphique → conclusion en langage naturel. Cette grammaire est celle
 * de l'ANALYSE : elle promet une tendance et la phrase qui l'interprète.
 * Un palmarès ne fait rien de tel — il CONSTATE. Un record est un point, pas une
 * série (rien à tracer) ; « ta plus longue course fait 18,4 km » EST déjà la
 * conclusion (rien à interpréter). Le peindre en `StatBlock` lui promettrait un
 * graphique et une lecture qu'il n'a pas, et ferait mentir la grammaire des
 * trois blocs. Il vit donc SOUS eux, dans une forme délibérément plus pauvre :
 * une liste de faits.
 *
 * ─── SUBORDINATION ASSUMÉE (elle ne doit jamais concurrencer les blocs) ─────
 *  · AUCUNE surface : la section vit à même le fond (N0). Les trois blocs sont
 *    les seules surfaces N1 de l'écran — leur relief est ce qui les désigne.
 *  · Chiffres en `fontSizes.md` (16) contre `xxl` (40) pour les blocs : à côté
 *    d'un chiffre héros, un record est une ligne, pas un titre.
 *  · Séparateurs hairline (`borderState.hairline`), jamais de cadre : un contour
 *    signale un ÉTAT (règle 80/20), pas une frontière de section.
 *  · Zéro chartreuse, zéro CTA : l'écran garde UNE seule décision (la période).
 *
 * ─── HONNÊTETÉ ─────────────────────────────────────────────────────────────
 * Une ligne sans source ne s'affiche PAS (pas de tiret muet, pas de « 0 km »).
 * Aucun record du tout → une phrase qui invite à courir. Les trois autres états
 * (pas connecté · lecture en cours · échec) sont ceux de l'ÉCRAN : cette section
 * vit sous `status === 'ready'` et se dérive de la MÊME lecture que les blocs,
 * elle ne peut donc pas les contredire — c'est tout le bénéfice de la lecture
 * unique.
 */
import { StyleSheet, Text, View } from 'react-native';
import {
  borderState,
  colors,
  fontSizes,
  fonts,
  spacing,
  typography,
} from '@klaim/shared';
import { useT } from '../../../i18n/store';
import { C } from '../../../i18n/catalog/performance';
import type { Entry } from '../../../i18n/types';
import { decimalSeparator } from '../../../ui/format';
import { fmtPace } from '../../history/format';
import type { PersonalRecords } from './records';

/**
 * Séparateur décimal de la LANGUE, sans `Intl` (Hermes n'embarque pas ICU) —
 * même formatage que l'écran, à la ligne près : « 12,8 km » en français,
 * « 12.8 km » en anglais.
 */
function fmtNum(value: number, digits: number): string {
  return value.toFixed(digits).replace('.', decimalSeparator());
}

/**
 * Durée d'un record : « 1h42 » au-delà de l'heure, « 48:12 » en dessous.
 * Format INVARIANT (chiffres et séparateurs), jamais traduit. La seconde près
 * n'apporte rien à un record d'endurance — l'heure ronde, si.
 */
function fmtLongDuration(totalS: number): string {
  const s = Math.max(0, Math.round(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, '0')}`;
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Line {
  key: string;
  label: Entry;
  /** Déjà formatée : cette section n'a pas de chiffre à calculer. */
  value: string;
  /** Contexte discret, ou `null`. */
  meta?: string | null;
}

export function RecordsSection({ records }: { records: PersonalRecords }) {
  const t = useT();

  const lines: Line[] = [];
  if (records.longestDistance) {
    lines.push({
      key: 'distance',
      label: C.recordLongest,
      value: `${fmtNum(records.longestDistance.value / 1000, 1)} ${t(C.weekKm)}`,
    });
  }
  if (records.longestDuration) {
    lines.push({
      key: 'duration',
      label: C.recordDuration,
      value: fmtLongDuration(records.longestDuration.value),
    });
  }
  if (records.bestPace) {
    lines.push({
      key: 'pace',
      label: C.recordBestPace,
      // `fmtPace` est LE formateur d'allure de l'app (historique, course) : le
      // dupliquer ferait vivre deux écritures d'allure dans le même produit.
      value: fmtPace(Math.round(records.bestPace.value)),
      // Une allure ne veut rien dire sans sa distance : 4'10/km sur 2 km et sur
      // 30 km ne sont pas le même fait.
      meta:
        records.bestPace.distanceM > 0
          ? t(C.recordOverKm, { km: fmtNum(records.bestPace.distanceM / 1000, 1) })
          : null,
    });
  }
  if (records.bestStreakWeeks !== null) {
    lines.push({
      key: 'streak',
      label: C.recordBestStreak,
      value: t(C.weeksShort, { n: records.bestStreakWeeks }),
    });
  }

  return (
    <View style={styles.section}>
      <Text style={styles.kicker}>{t(C.recordsPersonalTitle)}</Text>
      {lines.length === 0 ? (
        <Text style={styles.empty}>{t(C.recordsNoneYet)}</Text>
      ) : (
        lines.map((line, i) => (
          // Groupé pour VoiceOver : la ligne se lit d'un bloc (« Meilleure
          // allure, 4'52/km, sur 10,2 km ») au lieu de trois fragments.
          <View key={line.key} style={[styles.row, i > 0 && styles.rowSep]} accessible>
            {/* Aucun `numberOfLines` sur le libellé : il passe à la ligne plutôt
                que de se faire couper par un « … » (§A.9). */}
            <Text style={styles.label}>{t(line.label)}</Text>
            <View style={styles.right}>
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="clip">
                {line.value}
              </Text>
              {line.meta ? <Text style={styles.meta}>{line.meta}</Text> : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Séparée des trois blocs par l'ESPACE, jamais par une boîte.
  section: { marginTop: spacing.lg },
  kicker: {
    ...typography.kicker,
    color: colors.gris,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  rowSep: { borderTopWidth: 1, borderTopColor: borderState.hairline },
  label: {
    flex: 1,
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
  },
  right: { alignItems: 'flex-end', gap: spacing.xxs },
  // Chiffres tabulaires (rôle « stat »), mais en `md` : un record accompagne les
  // blocs, il ne rivalise pas avec leur chiffre héros.
  value: {
    color: colors.blanc,
    fontFamily: fonts.displaySemi,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.md,
  },
  meta: { color: colors.grisFaible, fontFamily: fonts.text, fontSize: fontSizes.xs },
  empty: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
});
