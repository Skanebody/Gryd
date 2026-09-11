/**
 * GRYD — LE JOURNAL : la liste des sorties (cahier G22, « le journal arrive
 * juste après le portrait, avec filtre sport et calendrier léger »).
 *
 * ═══ CE QUE LA LIGNE MONTRAIT, ET CE QU'ELLE MONTRE ═════════════════════════
 * Le journal du Profil affichait : une date, des kilomètres, des minutes. Deux
 * sorties de 5 km s'y ressemblaient trait pour trait, et une sortie qui avait
 * PRIS du terrain se lisait exactement comme une sortie sans capture. Toutes
 * les données manquantes étaient pourtant déjà lues (`history/real.ts`
 * sélectionne l'allure, le statut et le reçu de capture) : personne ne les
 * remontait jusqu'à la ligne.
 *
 * La ligne porte donc, dans cet ordre de lecture :
 *   1. la VIGNETTE du tracé quand cet appareil l'a (sortie enregistrée ici) —
 *      sinon le picto de la discipline, jamais une forme inventée ;
 *   2. la date, et la discipline nommée ;
 *   3. les mesures : distance, durée, puis allure (course) ou vitesse (vélo) ;
 *   4. le TERRAIN gagné, s'il y en a — et rien du tout sinon (jamais « 0 m² ») ;
 *   5. l'état : « à synchroniser » pour une sortie encore locale, ou le verdict
 *      du serveur quand il n'est pas « validée » (une sortie normale n'a pas
 *      besoin d'une pastille pour dire qu'elle va bien).
 * Un tap ouvre le détail — sortie serveur ou sortie locale, deux routes, une
 * seule grammaire.
 *
 * ═══ POURQUOI PAS DE VIGNETTE SUR LES SORTIES SERVEUR ═══════════════════════
 * La liste lit jusqu'à 200 sorties (`HISTORY_LIMIT`). Y ajouter la trace de
 * chacune ferait descendre des centaines de kilo-octets de géométrie pour
 * peindre trois vignettes de 64 pt. La trace d'une sortie serveur est donc lue
 * à l'OUVERTURE de son détail, là où elle sert vraiment. La ligne montre alors
 * le picto de la discipline : il ne prétend rien sur le parcours.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, fontSizes, gameColors, refonteColors as c, spacing, type RunStatus } from '@klaim/shared';
import { GrydIcon } from '../../ui/gryd';
import { PosterTrace } from '../share/PosterTrace2026';
import { captureAreaLabel2026 } from '../refonte/captureReceipt2026';
import type { JournalEntry2026 } from '../refonte/ProfileJournal';
import { useLocale, useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import { C as HC } from '../../i18n/catalog/historique';
// Les NOMS des disciplines vivent déjà là, en 5 langues (« Course à pied » /
// « Vélo »). Les redéclarer dans le catalogue du journal ferait deux vérités à
// maintenir pour un même mot — la règle que les catalogues appliquent déjà.
import { C as AC } from '../../i18n/catalog/setupActivity';
import { C, sportOnlyNote2026 } from '../../i18n/catalog/journal';
import { decimalSeparator } from '../../ui/format';
import { formatClock, formatKm2, formatRate } from './format';

/** Vignette du tracé — la taille déjà utilisée par le journal du Profil. */
const THUMB_W = 64;
const THUMB_H = 58;

/** Sorties visibles avant « Toutes les sorties ». */
const PREVIEW_COUNT = 3;

/**
 * Verdict serveur → pastille. `valid` ne produit AUCUNE pastille : une sortie
 * qui va bien n'a rien à annoncer, et trois lignes vertes de suite feraient du
 * bruit là où seul l'anormal doit se voir.
 */
function verdictPill(status: RunStatus | undefined): { tint: string; label: Entry } | null {
  switch (status) {
    case 'partial':
      return { tint: gameColors.contested, label: HC.verifyPartial };
    case 'rejected':
      return { tint: gameColors.danger, label: HC.verifyRejected };
    case 'flagged':
      return { tint: c.muted, label: HC.verifyStatsOnly };
    default:
      return null;
  }
}

export interface JournalRow2026Props {
  entry: JournalEntry2026;
  onOpen: (entry: JournalEntry2026) => void;
}

export function JournalRow2026({ entry, onOpen }: JournalRow2026Props) {
  const t = useT();
  const locale = useLocale();
  const sep = decimalSeparator();
  const date = new Date(entry.startedAtMs);
  const when = Number.isFinite(entry.startedAtMs)
    ? date.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })
    : null;
  const km = formatKm2(entry.km, sep);
  const duration = formatClock(entry.durationS);
  const rate = formatRate(entry.activity, entry.paceSPerKm, sep);
  const terrain = captureAreaLabel2026(entry.terrainM2, locale === 'fr');
  const pill = verdictPill(entry.status);
  const hasTrace = entry.traceSegments?.some((segment) => segment.length > 1) === true;
  const activityLabel = t(entry.activity === 'run' ? AC.optionRun : AC.optionBike);
  // « SPORT SEULEMENT » (0197) : une sortie gardée dans une discipline que la
  // mesure contredisait. Le motif est un texte serveur ; `null` = rien à dire.
  const sportOnly = entry.sportOnlyReason ?? null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.journalRowA11y, {
        activity: activityLabel,
        date: when ?? '',
        distance: km === null ? '' : `${km} km`,
        duration: duration ?? '',
      })}
      onPress={() => onOpen(entry)}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.thumb}>
        {hasTrace && entry.traceSegments ? (
          <PosterTrace segments={entry.traceSegments} width={THUMB_W} height={THUMB_H} light />
        ) : (
          <GrydIcon name={entry.activity === 'run' ? 'run' : 'bike'} size={22} color={c.muted} />
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.meta} numberOfLines={1}>
          {[when, activityLabel].filter((part): part is string => part !== null).join(' · ')}
        </Text>

        <View style={styles.measures}>
          {km !== null ? (
            <Text
              style={styles.distance}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {km}
              <Text style={styles.meta}> km</Text>
            </Text>
          ) : null}
          {duration !== null ? <Text style={styles.meta}>{duration}</Text> : null}
          {rate !== null ? (
            <Text style={styles.meta}>{`${rate.value} ${rate.unit}`}</Text>
          ) : null}
        </View>

        {/* TERRAIN : seulement s'il y en a. Une sortie sans capture ne porte
            aucune ligne — un « 0 m² » se lirait comme un échec. */}
        {terrain !== null ? (
          <View style={styles.terrain}>
            <GrydIcon name="loop" size={13} color={c.ink} />
            <Text style={styles.terrainText} numberOfLines={1}>
              {`+${terrain} ${t(C.journalTerrainGained)}`}
            </Text>
          </View>
        ) : null}

        {/* ── SPORT SEULEMENT : l'état, PUIS sa raison en une phrase ──────
            Un badge nu (« Sport seulement ») laisserait quelqu'un chercher ce
            qu'il a fait de mal. La phrase est donc sur la ligne, pas dans le
            détail : c'est ici qu'on se demande pourquoi cette sortie n'a rien
            gagné. Gris et non rouge : ce n'est pas un refus, c'est un choix
            assumé à l'arrivée. */}
        {sportOnly !== null ? (
          <View style={styles.sportOnly}>
            <View style={styles.sportOnlyBadge}>
              <Text style={styles.sportOnlyBadgeText} numberOfLines={1}>{t(C.journalSportOnly)}</Text>
            </View>
            <Text style={styles.meta}>{t(sportOnlyNote2026(sportOnly, entry.activity))}</Text>
          </View>
        ) : null}

        {entry.pending === true ? (
          <View style={styles.state}>
            <View style={[styles.dot, { backgroundColor: c.muted }]} />
            <Text style={styles.meta}>{t(C.journalPending)}</Text>
          </View>
        ) : pill !== null ? (
          <View style={styles.state}>
            <View style={[styles.dot, { backgroundColor: pill.tint }]} />
            <Text style={[styles.meta, { color: pill.tint }]}>{t(pill.label)}</Text>
          </View>
        ) : null}
      </View>

      <GrydIcon name="arrowUpRight" size={16} color={c.muted} />
    </Pressable>
  );
}

export interface JournalSection2026Props {
  /** Sorties DÉJÀ filtrées par l'écran (discipline, jour, période). */
  runs: readonly JournalEntry2026[];
  onOpen: (entry: JournalEntry2026) => void;
  /** Nombre de lignes avant le dépliage. */
  previewCount?: number;
  /** Appelé au dépliage : l'écran hôte peut relâcher ses filtres de période. */
  onExpand?: () => void;
  testID?: string;
}

/**
 * La liste, avec son dépliage. Elle ne porte NI état vide NI état d'erreur :
 * ils appartiennent à l'écran hôte, qui seul sait distinguer « pas connecté »,
 * « lecture en cours », « échec » et « lu, et rien » (L8/L19). Une liste vide
 * ne rend donc rien plutôt que d'affirmer quoi que ce soit sur le joueur.
 */
export function JournalSection2026({
  runs,
  onOpen,
  previewCount = PREVIEW_COUNT,
  onExpand,
  testID,
}: JournalSection2026Props) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  if (runs.length === 0) return null;
  const shown = expanded ? runs : runs.slice(0, previewCount);

  return (
    <View style={styles.list} testID={testID}>
      {shown.map((entry) => (
        <JournalRow2026 key={entry.id} entry={entry} onOpen={onOpen} />
      ))}
      {runs.length > previewCount ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          onPress={() => {
            setExpanded((value) => !value);
            if (!expanded) onExpand?.();
          }}
          style={styles.more}
        >
          <Text style={styles.moreText}>
            {expanded ? t(C.journalShowLess) : t(C.journalShowAll)}
          </Text>
          <GrydIcon name={expanded ? 'minus' : 'plus'} size={16} color={c.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    backgroundColor: c.surface,
    minHeight: 72,
  },
  pressed: { opacity: 0.9 },
  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: 16,
    backgroundColor: c.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  body: { flex: 1, gap: 2 },
  meta: { fontFamily: fonts.text, fontSize: fontSizes.xs, lineHeight: 18, color: c.muted },
  measures: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  distance: {
    fontFamily: fonts.displayMedium,
    fontSize: fontSizes.lg,
    lineHeight: 26,
    color: c.ink,
    fontVariant: ['tabular-nums'],
  },
  terrain: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  terrainText: {
    fontFamily: fonts.textMedium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: c.ink,
    flexShrink: 1,
  },
  sportOnly: { gap: 2, paddingTop: 2 },
  sportOnlyBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sportOnlyBadgeText: {
    fontFamily: fonts.textMedium,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    color: c.muted,
  },
  state: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  dot: { width: 6, height: 6, borderRadius: 3 },
  more: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  moreText: { fontFamily: fonts.textMedium, fontSize: fontSizes.sm, color: c.ink },
});
