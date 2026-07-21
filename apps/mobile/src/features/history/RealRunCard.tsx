/**
 * GRYD — CARD d'une course RÉELLE de l'historique.
 *
 * Elle n'affiche QUE ce que le serveur sait de cette course : la date, l'effort
 * (distance · durée · allure), l'impact territorial figé dans `celebration`, et
 * le statut GRYD Verify. Rien d'autre.
 *
 * CE QU'ELLE N'AFFICHE PAS, ET POURQUOI — la card de démo (`RunHistoryCard`)
 * portait un nom éditorial (« Boucle République »), un secteur (« Paris Est »),
 * des chips d'impact rédigées (« 1 frontière fermée »), une note de crew et une
 * miniature de tracé. Aucune de ces cinq informations n'existe dans `runs` :
 * elles étaient écrites à la main dans le fichier de démo. Les reproduire à
 * partir d'une vraie course exigerait de les INVENTER — un nom de quartier
 * deviné à partir d'un point GPS est une affirmation sur le terrain du joueur.
 *
 * · Pas de miniature : `polyline_masked` existe en base mais n'est pas lu ici
 *   (décodage + projection = un chantier à part). Une vignette générique serait
 *   un faux tracé, et c'est précisément le grief d'origine.
 * · Pas de « Voir détail » : la route `/course/[id]` ne sait résoudre QUE les
 *   identifiants de démo (`findRun`). Un vrai UUID y déclencherait « cette
 *   course n'est pas dans ton historique » — un mensonge, sur une course qui y
 *   est. Tant que ce détail n'est pas branché, la card ne promet pas un écran
 *   qui n'existe pas : elle n'est pas cliquable.
 *
 * Anti-shame : un refus s'affiche factuellement (pastille grise), jamais en
 * rouge criard — `rejected` est réservé à la course réellement écartée.
 */
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, radii } from '@klaim/shared';
import { StatePill, type GameVisualState } from '../../ui/game';
import { useLocale, useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import type { Locale } from '../../i18n/types';
import { C } from '../../i18n/catalog/historique';
import { C as RC } from '../../i18n/catalog/result';
import { fmtDuration, fmtKm, fmtPace } from './format';
import type { RealRunEntry } from './real';

/** Statut serveur → pastille d'état de jeu + libellé traduit. */
function verifyPill(entry: RealRunEntry): { state: GameVisualState; label: Entry } {
  switch (entry.status) {
    case 'valid':
      return { state: 'verified', label: C.verifyVerified };
    case 'partial':
      return { state: 'contested', label: C.verifyPartial };
    case 'rejected':
      return { state: 'rejected', label: C.verifyRejected };
    default:
      // 'flagged' : la course compte comme effort, pas comme capture.
      return { state: 'statsonly', label: C.verifyStatsOnly };
  }
}

/**
 * Date + heure de départ, dans la langue de l'app.
 *
 * `Intl` n'est pas garanti sur tous les moteurs JS embarqués : en cas d'absence
 * ou d'erreur, on retombe sur un format numérique non ambigu plutôt que sur une
 * chaîne vide. Une date est un FAIT — elle ne doit jamais disparaître.
 */
function formatWhen(ms: number, locale: Locale): string {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  try {
    return d.toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    const p2 = (n: number) => n.toString().padStart(2, '0');
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} · ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }
}

export const RealRunCard = memo(function RealRunCard({ entry }: { entry: RealRunEntry }) {
  const t = useT();
  const locale = useLocale();
  const pill = verifyPill(entry);
  // `null` = impact inconnu (pas de payload serveur) → la colonne n'existe pas.
  // `0` = connu et nul → on l'affiche : « 0 zone capturée » est un fait utile
  // (il explique pourquoi la course n'a rien changé sur la carte).
  const showCaptured = entry.captured !== null;
  const showDefended = entry.defended !== null && entry.defended > 0;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.when} numberOfLines={1}>
          {formatWhen(entry.startedAtMs, locale)}
        </Text>
        <StatePill state={pill.state} label={t(pill.label)} />
      </View>

      {/* Effort : distance · durée · allure. L'allure n'est affichée que si le
          serveur en a une — on n'en recalcule pas une « pour remplir ». */}
      <View style={styles.effortRow}>
        <Text style={styles.effortMain}>{fmtKm(entry.km)}</Text>
        <Text style={styles.effortDot}>·</Text>
        <Text style={styles.effort}>{fmtDuration(entry.durationS)}</Text>
        {entry.paceSPerKm !== null ? (
          <>
            <Text style={styles.effortDot}>·</Text>
            <Text style={styles.effort}>{fmtPace(entry.paceSPerKm)}</Text>
          </>
        ) : null}
      </View>

      {/* Impact territorial — figé par le serveur au moment de l'ingestion. */}
      {showCaptured || showDefended ? (
        <View style={styles.impactRow}>
          {showCaptured ? (
            <View style={styles.impactCell}>
              <Text style={[styles.impactValue, entry.captured! > 0 && styles.impactGain]}>
                {entry.captured}
              </Text>
              <Text style={styles.impactLabel} numberOfLines={2}>
                {t(RC.zonesCaptured)}
              </Text>
            </View>
          ) : null}
          {showDefended ? (
            <View style={styles.impactCell}>
              <Text style={[styles.impactValue, styles.impactGain]}>{entry.defended}</Text>
              <Text style={styles.impactLabel} numberOfLines={2}>
                {t(RC.defendedLabel)}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: 14,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  when: { flex: 1, color: colors.gris, fontSize: fontSizes.xs },
  effortRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  effortMain: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  effort: { color: colors.gris, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] },
  effortDot: { color: colors.gris, fontSize: fontSizes.sm },
  impactRow: { flexDirection: 'row', gap: 24 },
  impactCell: { gap: 2 },
  impactValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  // Chartreuse sur fond carbone (sombre) uniquement — jamais sur fond clair.
  impactGain: { color: gameColors.crew },
  impactLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.4 },
});
