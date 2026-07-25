/**
 * GRYD — LIGNE d'une course RÉELLE de l'historique.
 *
 * ─── ORDRE DE COMPOSITION ───────────────────────────────────────────────────
 *   1. Date/heure de départ + pastille GRYD Verify (une rangée, alignées) ;
 *   2. l'EFFORT : distance en typo de chiffre, puis durée · allure en gris ;
 *   3. l'IMPACT territorial, dans UN bloc à séparateurs (`SheetMetrics`).
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ───────────────────────────────────────
 * · LE CADRE PERMANENT (`borderWidth: 1` + `borderColor: grisLigne`). Une liste
 *   de N courses toutes encadrées, c'est N cadres qui ne signalent aucun état —
 *   exactement la faute que `Card` a corrigée à la source (79 % des cards
 *   portaient un cadre permanent, l'inverse de la règle 80/20). La surface se
 *   lit par son fond et par l'espace ; le contour reste réservé aux ÉTATS.
 * · LES DEUX MINI-CELLULES d'impact recodées, remplacées par `SheetMetrics` :
 *   le bloc canonique (aucun contenant, filet de 1 px, largeurs égales,
 *   `adjustsFontSizeToFit` sur valeur ET label, zéro cellule vide).
 * · La chartreuse sur un gain. Sur une liste, un accent répété sur chaque ligne
 *   n'est plus un accent : il ne reste chartreuse QUE ce qui est unique à
 *   l'écran (§A.4). Le chiffre reste lisible en blanc, son libellé le nomme.
 * · L'ellipse « … » : `styles.when` portait un `numberOfLines={1}` NU (RN coupe
 *   en `tail` par défaut) et les libellés d'impact un `numberOfLines={2}` nu.
 *   La date rétrécit désormais pour tenir, les libellés sont pris en charge par
 *   `SheetMetrics`.
 *
 * ─── CE QU'ELLE N'AFFICHE PAS, ET POURQUOI ──────────────────────────────────
 * La card de démo portait un nom éditorial (« Boucle République »), un secteur
 * (« Paris Est »), des chips d'impact rédigées, une note de crew et une
 * miniature de tracé. Aucune de ces cinq informations n'existe dans `runs` :
 * elles étaient écrites à la main dans le fichier de démo. Les reproduire à
 * partir d'une vraie course exigerait de les INVENTER — un nom de quartier
 * deviné à partir d'un point GPS est une affirmation sur le terrain du joueur.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ────────────────────────────────────────────
 * · PAS DE MINIATURE DE TRACÉ. Raison technique : `runs.polyline_masked` existe
 *   en base mais n'est pas décodé ici (décodage + projection = un chantier à
 *   part). Une vignette générique serait un faux tracé. Le sous-titre de
 *   l'écran a été corrigé en conséquence — il ne promet plus « le tracé ».
 * · PAS DE « VOIR DÉTAIL », donc AUCUNE ligne cliquable. Raison technique :
 *   `/course/[id]` ne sait résoudre aucun identifiant (`findRealRun()` retourne
 *   `undefined`, O1). Une ligne tappable qui ne répond pas est un bouton mort ;
 *   l'écran le DIT en pied de page, en gris, après la liste (patron /qr).
 *
 * Anti-shame : un refus s'affiche factuellement (pastille grise), jamais en
 * rouge criard — `rejected` est réservé à la course réellement écartée.
 */
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, spacing } from '@klaim/shared';
import { Card } from '../../ui/Card';
import { StatePill, type GameVisualState } from '../../ui/game';
import { SheetMetrics, type SheetMetric } from '../map/SheetMetrics';
import { useLocale, useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import type { Locale } from '../../i18n/types';
import { C } from '../../i18n/catalog/historique';
import { C as RC } from '../../i18n/catalog/result';
import { fmtDuration, fmtKm, fmtPace } from './format';
import { runImpactKeys } from './historyView';
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
  const when = formatWhen(entry.startedAtMs, locale);
  const distance = fmtKm(entry.km);

  /**
   * Durée et allure : construites par FILTRAGE puis `join(' · ')`. Un segment
   * sans mesure disparaît avec son séparateur — jamais un « · » orphelin,
   * jamais un « — ». L'allure n'est affichée que si le serveur en a une : on
   * n'en recalcule pas une « pour remplir ».
   */
  const detail = [
    fmtDuration(entry.durationS),
    entry.paceSPerKm !== null && Number.isFinite(entry.paceSPerKm)
      ? fmtPace(entry.paceSPerKm)
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');

  /**
   * Impact territorial figé par le serveur à l'ingestion. `runImpactKeys` (pur,
   * testé) tranche la seule question qui compte ici : un impact INCONNU n'est
   * pas un impact NUL. Zéro métrique sourcée ⇒ `SheetMetrics` ne rend rien.
   */
  const metrics: SheetMetric[] = runImpactKeys(entry).map((key) =>
    key === 'captured'
      ? { key, value: String(entry.captured), label: t(RC.zonesCaptured) }
      : { key, value: String(entry.defended), label: t(RC.defendedLabel) },
  );

  // `compact` : une liste dense de courses, pas une card de tête d'écran.
  return (
    <Card compact style={styles.card}>
      <View style={styles.head}>
        {/* §A.9 — la date rétrécit pour tenir, elle n'est jamais coupée par « … ». */}
        <Text style={styles.when} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {when}
        </Text>
        <StatePill state={pill.state} label={t(pill.label)} />
      </View>

      {/* Effort : la distance porte la typo de chiffre (R6) ; le reste est une
          ligne de contexte grise. Une course sans distance lisible n'affiche
          pas « NaN » : la ligne se réduit à ce qui est mesuré. */}
      <View
        accessible
        accessibilityLabel={t(C.a11yRunEffort, {
          when,
          effort: [distance, detail]
            .filter((part): part is string => part !== null && part.length > 0)
            .join(' · '),
        })}
        style={styles.effortRow}
      >
        {distance !== null ? (
          <Text style={styles.effortMain} numberOfLines={1} adjustsFontSizeToFit>
            {distance}
          </Text>
        ) : null}
        {detail.length > 0 ? <Text style={styles.effort}>{detail}</Text> : null}
      </View>

      <SheetMetrics metrics={metrics} />
    </Card>
  );
});

const styles = StyleSheet.create({
  // `Card` fournit la surface N1, le rayon et le padding — SANS contour.
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  when: { flex: 1, color: colors.gris, fontSize: fontSizes.xs },
  effortRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  /**
   * Rôle R6 « stat » recopié à la main : `typography.stat` porte un
   * `fontVariant` en LECTURE SEULE que `StyleSheet` refuse à l'étalement
   * (TextStyle le veut mutable) — même contrainte, même contournement que
   * `StatBlock`. Un chiffre porte toujours une typo de chiffre.
   */
  effortMain: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontWeight: '800',
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums'],
    fontSize: fontSizes.md,
  },
  effort: { color: colors.gris, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] },
});
