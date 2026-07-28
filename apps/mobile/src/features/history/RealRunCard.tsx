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
 *
 * ─── LA LIGNE S'OUVRE (E67 → E68, 28/07/2026) ───────────────────────────────
 * Cet en-tête portait, jusqu'ici : « AUCUNE LIGNE N'EST TAPABLE, donc PAS DE
 * CHEVRON […] `/course/[id]` ne résout aucun identifiant (O1) ». C'était vrai
 * du CODE, pas du DROIT : la policy `runs_select_own` ouvrait déjà la lecture
 * d'UNE ligne, personne n'avait écrit la requête. Elle existe
 * (`features/history/detailRead.ts`), l'écran de détail la rend
 * (`app/course/[id].tsx`), et la ligne mène donc quelque part — chevron compris.
 * Ce n'est pas un bouton mort : le détail sait dire lui-même ses cinq états
 * (pas connecté / lecture / échec / pas dans ton historique / lu).
 *
 * ⚠ LA DESTINATION EST EN FORME OBJET (`{ pathname, params }`), jamais un
 * gabarit `` `/course/${id}` `` : expo-router encode alors le segment lui-même,
 * ET le patron littéral `/course/[id]` apparaît dans le code — c'est ce que
 * `scripts/audit-routes.mjs` sait reconnaître comme une PORTE. Un gabarit
 * laisserait E68 compté « orphelin » alors qu'il est bel et bien atteint.
 *
 * Anti-shame : un refus s'affiche factuellement (pastille grise), jamais en
 * rouge criard — `rejected` est réservé à la course réellement écartée.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, fontSizes, radii, sizes, spacing } from '@klaim/shared';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { StatePill, type GameVisualState } from '../../ui/game';
import { useLocale, useT } from '../../i18n/store';
import type { Entry } from '../../i18n/types';
import type { Locale } from '../../i18n/types';
import { C } from '../../i18n/catalog/historique';
import { fmtDuration, fmtKm, fmtPace } from './format';
import { runColorRole, runStory } from './historyView';
import { TYPE_ICON, TYPE_LABEL, impactText, roleToken } from './runStoryUi';
import type { RealRunEntry } from './real';

/** Côté de la tuile de type (planche E24 : mini-carte 76 pt). */
const TILE = 76;

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
  // découpée, le lecteur d'écran l'entend d'un tenant. Le rôle `button` (et non
  // plus un simple bloc `accessible`) dit que la ligne S'OUVRE : sans lui, un
  // utilisateur de VoiceOver n'aurait aucun moyen d'apprendre que le détail
  // existe — le chevron est une information VISUELLE, et rien d'autre.
  const a11y = t(C.a11yRunLine, {
    type: t(TYPE_LABEL[story.type]),
    impact: impact ?? t(C.impactNone),
    effort: effort.length > 0 ? effort : '—',
    when,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.a11yOpenRun, { line: a11y })}
      // FORME OBJET, jamais un gabarit : c'est ce que l'audit de routes
      // reconnaît comme une porte vers `/course/[id]` (cf. en-tête).
      onPress={() => router.push({ pathname: '/course/[id]', params: { id: entry.id } })}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      <Card compact style={styles.card}>
        <View style={styles.row}>
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

          {/* Le chevron ne se peint QUE parce que le tap aboutit. Centré sur la
              hauteur de la tuile, cible tactile portée par la ligne entière
              (76 pt de haut > 44) — pas simulée par un `hitSlop`. */}
          <View style={styles.chevron}>
            <Icon name="chevron" size={16} color={colors.gris} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // `Card` fournit la surface N1, le rayon et le padding — SANS contour.
  card: { gap: 0, minHeight: sizes.touchTarget },
  pressed: { opacity: 0.6 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  // Chevron : centré verticalement, marge à gauche seulement (le `gap` de la
  // rangée le sépare déjà du texte). Il n'est pas tapable À PART — c'est la
  // ligne entière qui l'est.
  chevron: { justifyContent: 'center' },
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
