/**
 * GRYD — HORODATEUR DE SAISON (composant d'affichage).
 *
 * « Où en est-on dans la saison ? » — numéro, temps restant, progression. Il
 * BRANCHE le hook `useActiveSeason` (RPC serveur `season_current`) au moteur PUR
 * `seasonProgress` (@klaim/shared), et rend les QUATRE états honnêtes du hook,
 * jamais confondus (cf. useActiveSeason) :
 *
 *   · 'loading' → n'affirme RIEN (« Lecture de la saison… ») ;
 *   · 'active'  → décompte RÉEL dérivé de `ends_at` (jours restants, % écoulé) ;
 *   · 'none'    → « Saison 0 · pas encore ouverte · la date arrive », JAMAIS une
 *                 date inventée (c'est exactement le mensonge qu'on retire) ;
 *   · 'error'   → on dit l'échec et on propose de relire (jamais « aucune »).
 *
 * La PHASE (upcoming/active/ended) vient de `seasonProgress`, dérivée du temps
 * seul : une saison encore 'active' en base mais dont `ends_at` est passé (cron
 * de clôture pas repassé) s'affiche « en clôture », pas « J-0 ».
 *
 * CHARTE : une seule card N1 (elevation.surface + radii.card, SANS contour — la
 * règle 80/20), MÊME grammaire que les `ListRow` de Paramètres où il vit (À propos
 * › GRYD) : surface carbone, `IconPlate` de tête, séparation par l'espace, jamais
 * de card dans card. Accent chartreuse sur fond sombre uniquement. Chaînes déjà
 * traduites via le catalogue `faq` (domaine saison), interpolées ICI depuis les
 * BORNES RÉELLES.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, elevation, fontSizes, radii, seasonProgress, spacing } from '@klaim/shared';
import { C } from '../../i18n/catalog/faq';
import { useT } from '../../i18n/store';
import { Button } from '../../ui/Button';
import { IconPlate } from '../../ui/Card';
import { useActiveSeason } from './useActiveSeason';

/** Numéro canonique de la saison annoncée quand aucune n'est encore active. */
const UPCOMING_SEASON_NUMBER = 0;

/** Carré d'icône de tête — l'`IconPlate` partagé, comme les lignes de Paramètres. */
function SeasonIcon({ name }: { name: 'sablier' | 'pass' }) {
  return <IconPlate icon={name} size="md" color={colors.chartreuse} />;
}

export function SeasonStatus() {
  const t = useT();
  const { status, season, reload } = useActiveSeason();

  // ── Chargement : on n'affirme rien (ni saison, ni absence). ────────────────
  if (status === 'loading') {
    return (
      <View style={styles.card}>
        <Text style={styles.loading}>{t(C.sLoading)}</Text>
      </View>
    );
  }

  // ── Échec de lecture : on le DIT, et on propose de relire. Bouton FANTÔME
  //    (pas le CTA chartreuse) : cet écran garde son unique accent ailleurs. ──
  if (status === 'error') {
    return (
      <View style={styles.card}>
        <Text style={styles.errorTitle}>{t(C.sErrorTitle)}</Text>
        <Text style={styles.hint}>{t(C.sErrorBody)}</Text>
        <View style={styles.retry}>
          <Button label={t(C.sRetry)} variant="ghost" size="md" onPress={reload} />
        </View>
      </View>
    );
  }

  // ── Aucune saison active : « Saison 0 · pas encore ouverte · la date arrive »
  //    — le nombre 0 est le NOM de la saison annoncée, et « pas encore ouverte »
  //    dit clairement qu'elle ne court pas. Aucune date fabriquée. ────────────
  if (status === 'none' || season === null) {
    const name = t(C.sName, { n: UPCOMING_SEASON_NUMBER });
    return (
      <View style={styles.card} accessibilityLabel={`${name} · ${t(C.sNotOpen)}`}>
        <View style={styles.head}>
          <SeasonIcon name="pass" />
          <View style={styles.info}>
            <Text style={styles.kicker}>{name}</Text>
            <Text style={styles.headline}>{t(C.sNotOpen)}</Text>
          </View>
        </View>
        <Text style={styles.hint}>{t(C.sNotOpenHint)}</Text>
      </View>
    );
  }

  // ── Saison active : décompte RÉEL depuis les bornes de la base. ────────────
  const { pct, joursRestants, phase } = seasonProgress(season.startsAt, season.endsAt);
  const pctInt = Math.round(pct * 100);
  const name = t(C.sName, { n: season.number });

  // Accord grammatical : le dernier jour (joursRestants === 1) prend le singulier.
  const one = joursRestants === 1;
  const endsIn = one ? t(C.sEndsInDay, { n: joursRestants }) : t(C.sEndsInDays, { n: joursRestants });
  const daysLeft = one ? t(C.sDayLeft, { n: joursRestants }) : t(C.sDaysLeft, { n: joursRestants });

  // Phrase de tête selon la phase (dérivée du temps, pas du statut serveur).
  const headline =
    phase === 'ended' ? t(C.sClosing) : phase === 'upcoming' ? t(C.sStartsSoon) : endsIn;

  // Pied : toujours le % écoulé ; les jours restants n'ont de sens qu'en phase
  // active (avant le début → 0, après la fin → 0 : on ne les répète pas).
  const elapsed = t(C.sElapsed, { pct: pctInt });
  const footnote = phase === 'active' ? `${elapsed} · ${daysLeft}` : elapsed;

  return (
    <View style={styles.card} accessibilityLabel={`${name} · ${headline} · ${elapsed}`}>
      <View style={styles.head}>
        <SeasonIcon name="sablier" />
        <View style={styles.info}>
          <Text style={styles.kicker}>{name}</Text>
          <Text style={styles.headline}>{headline}</Text>
        </View>
      </View>
      {/* Barre de progression : part écoulée en chartreuse sur piste N2. */}
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.fill, { width: `${pctInt}%` }]} />
      </View>
      <Text style={styles.hint}>{footnote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Une seule card N1, alignée sur la géométrie des lignes de Paramètres
  // (carbone + filet grisLigne + radii.card + marge basse de groupe).
  card: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 16,
    paddingHorizontal: spacing.cardPadding - 2,
    marginBottom: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  info: { flex: 1 },
  // Numéro de saison en sur-titre discret ; le statut est la ligne forte.
  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headline: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    marginTop: spacing.xxs,
  },
  // Piste + remplissage : jamais de chartreuse sur fond clair — ici tout est sombre.
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
  hint: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.sm,
  },
  loading: { color: colors.gris, fontSize: fontSizes.sm },
  errorTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  retry: { marginTop: spacing.sm },
});
