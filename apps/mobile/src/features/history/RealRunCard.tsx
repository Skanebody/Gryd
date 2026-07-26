/**
 * GRYD — LIGNE d'une course RÉELLE de l'Historique (planche E24 : journal de
 * CONQUÊTE, l'impact territorial en PREMIER).
 *
 * ─── ORDRE DE COMPOSITION (planche E24) ─────────────────────────────────────
 *   1. TUILE DE TYPE 76 pt à gauche, colorée PAR RÔLE + son picto ;
 *   2. l'IMPACT territorial EN PREMIER : le TYPE coloré (Capture / Reprise /
 *      Défense / Course libre) puis la grandeur d'impact dominante ;
 *   3. l'EFFORT en second, en gris : distance · durée · allure ;
 *   4. la méta : date de départ + pastille GRYD Verify.
 *
 * ─── LE TYPE VIENT DU SERVEUR, PAS D'UNE INTENTION (planche E24) ─────────────
 * `runStory` (pur, testé) tranche : une REPRISE (orange) est une capture dont au
 * moins une zone a été ARRACHÉE à un adversaire (`hexes.stolen`) — le fait le
 * plus fort à raconter, et le seul qui distingue l'orange du chartreuse. Une
 * capture neuve reste chartreuse (moi), une défense est bleue (zone tenue), une
 * course sans prise est neutre. Couleurs PAR RÔLE (constitution §C), jamais une
 * teinte par ligne : `runColorRole` rend un rôle, ce composant le mappe sur un
 * token.
 *
 * ─── POURQUOI LA CHARTREUSE REVIENT ICI (ET NE VIOLE PAS §A) ────────────────
 * Une passe antérieure avait RETIRÉ la chartreuse des gains « un accent répété
 * n'est plus un accent (§A.4) ». La planche E24, elle, EXIGE le type coloré. Ce
 * n'est pas une contradiction : §A.4 réserve la chartreuse au CTA (l'action), et
 * cette ligne n'a AUCUN CTA (elle n'est même pas tapable, cf. plus bas). Ce
 * chartreuse-ci est une couleur de RÔLE (§C, « moi »), le même registre que la
 * carte où mon territoire est chartreuse sur des dizaines d'hexes. On la garde
 * PETITE (le mot de type + le picto de la tuile), l'impact et l'effort restent en
 * blanc/gris — la ligne ne devient pas un aplat vert.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ────────────────────────────────────────────
 * · PAS DE MINI-CARTE DE TRACÉ. La planche montre le tracé réel dans la tuile
 *   76 pt ; `runs.polyline_masked` existe en base mais n'est pas décodé
 *   (décodage + projection = un chantier à part, cf. `RunLoopMap`, sans
 *   importeur). Une polyligne générique serait un FAUX tracé. La tuile porte
 *   donc le PICTO DE TYPE coloré, pas une géométrie inventée — elle code le rôle
 *   de la ligne au premier coup d'œil sans rien affirmer sur le terrain.
 * · LE NOM DE LA ZONE (« Saint-Rémy ») N'EST PAS AFFICHÉ : le déduire d'un point
 *   GPS serait une affirmation sur le terrain du joueur (aucune colonne ne le
 *   porte). L'impact reste quantitatif et honnête.
 * · « REPRIS À K.RUNNER » : le nom de l'adversaire exige une identité
 *   cross-joueur (O1). La ligne dit « Reprise » + le nombre de zones arrachées,
 *   jamais un nom fabriqué.
 * · AUCUNE LIGNE N'EST TAPABLE, donc PAS DE CHEVRON. La planche ouvre E09
 *   archivé au tap ; `/course/[id]` ne résout aucun identifiant (O1). Un chevron
 *   promettrait une ouverture qui échoue toujours (bouton mort §A) : il est
 *   absent, et l'écran l'ÉCRIT en pied de liste (cf. `historique.tsx`).
 *
 * Anti-shame : un refus s'affiche factuellement (pastille grise), jamais en
 * rouge criard — `rejected` est réservé à la course réellement écartée.
 */
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, gameColors, radii, spacing, type IconName } from '@klaim/shared';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { StatePill, type GameVisualState } from '../../ui/game';
import { useLocale, useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import type { Locale } from '../../i18n/types';
import { C } from '../../i18n/catalog/historique';
import { fmtDuration, fmtKm, fmtPace } from './format';
import { runColorRole, runStory, type RunColorRole, type RunStory, type RunStoryType } from './historyView';
import type { RealRunEntry } from './real';

/** Côté de la tuile de type (planche E24 : mini-carte 76 pt). */
const TILE = 76;

/** Rôle de couleur (pur) → token de la charte. Jamais l'inverse. */
function roleToken(role: RunColorRole): string {
  switch (role) {
    case 'me':
      return colors.chartreuse; // moi — gain
    case 'rival':
      return gameColors.rival; // orange — arraché à un rival
    case 'defense':
      return gameColors.electricBlue; // bleu — zone tenue
    default:
      return colors.gris; // free / unknown — neutre
  }
}

/** Picto de la tuile, par type. */
const TYPE_ICON: Readonly<Record<RunStoryType, IconName>> = {
  capture: 'conquete',
  reprise: 'raid',
  defense: 'bouclier',
  free: 'boucle_ouverte',
  unknown: 'historique',
};

/** Libellé du type (le mot coloré de la planche). */
const TYPE_LABEL: Readonly<Record<RunStoryType, Entry>> = {
  capture: C.typeCapture,
  reprise: C.typeReprise,
  defense: C.typeDefense,
  free: C.typeFree,
  unknown: C.typeUnknown,
};

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
 * Date + heure de départ, dans la langue de l'app. `Intl` n'est pas garanti sur
 * tous les moteurs JS embarqués : en cas d'erreur, format numérique non ambigu
 * plutôt qu'une chaîne vide. Une date est un FAIT — elle ne disparaît jamais.
 */
function formatWhen(ms: number, locale: Locale): string {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  try {
    return d.toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    const p2 = (n: number) => n.toString().padStart(2, '0');
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)} · ${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }
}

export const RealRunCard = memo(function RealRunCard({ entry }: { entry: RealRunEntry }) {
  const t = useT();
  const locale = useLocale();
  const pill = verifyPill(entry);
  const when = formatWhen(entry.startedAtMs, locale);
  const distance = fmtKm(entry.km);
  const story = runStory(entry);
  const role = runColorRole(story.type);
  const roleColor = roleToken(role);

  /**
   * L'IMPACT DOMINANT en toutes lettres. `null` pour `free`/`unknown` : le TYPE
   * (« Course libre » / « Sortie ») porte alors seul le message, sans un chiffre
   * qui n'existe pas.
   */
  const impact = impactText(story, t);

  /**
   * Effort : durée · allure, par FILTRAGE puis `join(' · ')`. Un segment sans
   * mesure disparaît avec son séparateur — jamais un « · » orphelin. L'allure
   * n'est affichée que si le serveur en a une : on n'en recalcule pas une.
   */
  const effort = [
    distance,
    fmtDuration(entry.durationS),
    entry.paceSPerKm !== null && Number.isFinite(entry.paceSPerKm) ? fmtPace(entry.paceSPerKm) : null,
  ]
    .filter((part): part is string => part !== null && part.length > 0)
    .join(' · ');

  // a11y (planche E24 : type, impact, effort, date) — la ligne visuelle est
  // découpée, le lecteur d'écran l'entend d'un tenant.
  const a11y = t(C.a11yRunLine, {
    type: t(TYPE_LABEL[story.type]),
    impact: impact ?? t(C.impactNone),
    effort: effort.length > 0 ? effort : '—',
    when,
  });

  return (
    <Card compact style={styles.card}>
      <View accessible accessibilityLabel={a11y} style={styles.row}>
        {/* Tuile de TYPE — pas un tracé : un picto de rôle (cf. en-tête). */}
        <View style={[styles.tile, { backgroundColor: colors.carbone2 }]}>
          <Icon name={TYPE_ICON[story.type]} size={30} color={roleColor} />
        </View>

        <View style={styles.body}>
          {/* IMPACT D'ABORD : le type coloré, puis la grandeur dominante. */}
          <View style={styles.impactLine}>
            <Text style={[styles.type, { color: roleColor }]} numberOfLines={1}>
              {t(TYPE_LABEL[story.type])}
            </Text>
            {impact !== null ? (
              <Text style={styles.impactValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                {impact}
              </Text>
            ) : null}
          </View>

          {/* EFFORT en second, gris. Une course sans mesure lisible n'affiche
              pas « NaN » : la ligne se réduit à ce qui est mesuré. */}
          {effort.length > 0 ? (
            <Text style={styles.effort} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {effort}
            </Text>
          ) : null}

          {/* Méta : date (jamais coupée par « … », elle rétrécit) + Verify. */}
          <View style={styles.meta}>
            <Text style={styles.when} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {when}
            </Text>
            <StatePill state={pill.state} label={t(pill.label)} />
          </View>
        </View>
      </View>
    </Card>
  );
});

/**
 * L'impact dominant en toutes lettres, par type. Singulier / pluriel géré par
 * l'entrée (« 1 zone » vs « 3 zones ») : un « 1 zones » est une petite négligence
 * qui trahit tout de suite le texte fabriqué.
 */
function impactText(
  story: RunStory,
  t: (e: Entry, vars?: Record<string, string | number>) => string,
): string | null {
  switch (story.type) {
    case 'capture':
      return t(story.zones === 1 ? C.impactCapturedOne : C.impactCapturedMany, { n: story.zones });
    case 'reprise':
      return t(story.zones === 1 ? C.impactRetakenOne : C.impactRetakenMany, { n: story.zones });
    case 'defense':
      return t(story.zones === 1 ? C.impactDefendedOne : C.impactDefendedMany, { n: story.zones });
    default:
      // free / unknown : aucun chiffre — le type porte le sens.
      return null;
  }
}

const styles = StyleSheet.create({
  // `Card` fournit la surface N1, le rayon et le padding — SANS contour.
  card: { gap: 0 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  // Tuile de type : carré, surface N2, picto centré. Pas un tracé (cf. en-tête).
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, justifyContent: 'center', gap: spacing.xxs },
  impactLine: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  type: { fontSize: fontSizes.sm, fontWeight: '700', letterSpacing: 0.2 },
  /**
   * Rôle R6 « stat » recopié à la main : `typography.stat` porte un `fontVariant`
   * en LECTURE SEULE que `StyleSheet` refuse à l'étalement — même contournement
   * que `StatBlock`. Un chiffre porte toujours une typo de chiffre.
   */
  impactValue: {
    flex: 1,
    color: colors.blanc,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -0.2,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.md,
  },
  effort: { color: colors.gris, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  when: { flex: 1, color: colors.grisFaible, fontSize: fontSizes.xs },
});
