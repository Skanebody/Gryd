/**
 * GRYD — E22 « DÉFENSE · Zone attaquée ». Ma zone (mon crew) est CONTESTÉE :
 * l'étape « Se faire reprendre → Revenir » du core loop. Un sheet = UNE décision :
 * DÉFENDRE. Ouvert par un tap sur la zone hachurée violette (ou un deep link de
 * notification, plus tard) ; il REMPLACE la sheet d'info « à moi · contestée » qui
 * n'avait aucune action — le trou que cet écran comble.
 *
 * ─── LE TON, QUI EST LA MOITIÉ DU TRAVAIL ──────────────────────────────────
 * Urgence MAÎTRISÉE, jamais anxiogène : des FAITS NEUTRES (« un rival gagne du
 * terrain »), jamais « Nina t'attaque ! ». Aucune donnée privée du rival — ni son
 * pseudo, ni « il y a 2 h », ni son tracé (RLS `runs_select_own`). La seule
 * couverture montrée est APPROXIMATIVE, agrégée du secteur (`deriveDefenseView`).
 * Le compte à rebours est en HEURES, figé au montage — aucune seconde qui défile.
 *
 * ─── CE QUE LE COMPOSANT NE FAIT PAS ────────────────────────────────────────
 * · Il ne calcule rien : `view` lui est DONNÉE (fonctions pures testées), et la
 *   même vue dimensionne la sheet côté parent — écran et hauteur ne peuvent pas
 *   diverger.
 * · Il n'envoie PAS le ping lui-même : « Alerter le crew » remonte au parent, qui
 *   tient le canal RÉEL (`crew_ping_zone`) et le toast d'issue. Le sheet reste
 *   présentational et testable.
 * · La pulsation du contour de zone vit sur la CARTE (paint §C) ; ici, seule la
 *   pastille violette respire — faiblement, et STATIQUE en Reduce Motion.
 */
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, gameColors, iconSizes, radii, sizes, typography } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { useReduceMotion } from '../../ui/game/anim';
import { C } from '../../i18n/catalog/map';
import { useLocale, useT } from '../../i18n/store';
import { SheetMetrics, type SheetMetric } from './SheetMetrics';
import { areaInPlayParts, type DefenseView } from './defenseZone';
import type { MapZoneView } from './zoneSelection';

/** Durée d'un cycle de respiration de la pastille (§C « pulsation 3 s, faible »). */
const PULSE_MS = 3000;

export interface DefenseZoneSheetProps {
  zone: MapZoneView;
  /** Nom RÉEL du quartier, ou null → le libellé neutre traduit (« Zone »). */
  zoneName: string | null;
  /** Vue dérivée (échéance, urgence, couverture, métriques) — source unique. */
  view: DefenseView;
  /** ✕ — referme la sheet, retour à la carte. */
  onClose: () => void;
  /** CTA UNIQUE : ouvre le briefing E05 avec le label DÉFENSE (boucle pré-tracée). */
  onDefendre: () => void;
  /** Lien tertiaire : un signal de renfort RÉEL au crew (le parent l'envoie). */
  onAlertCrew: () => void;
  /** Alerte en cours d'envoi : évite le double tap, discret. */
  alerting?: boolean;
}

export function DefenseZoneSheet({
  zone,
  zoneName,
  view,
  onClose,
  onDefendre,
  onAlertCrew,
  alerting = false,
}: DefenseZoneSheetProps) {
  const t = useT();
  const locale = useLocale();
  const reduce = useReduceMotion();

  // Respiration de la pastille : 1 → 0,5 → 1 sur 3 s, en boucle. FAIBLE amplitude
  // (urgence maîtrisée). En Reduce Motion : opacité fixe, aucune animation lancée.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: PULSE_MS / 2, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: PULSE_MS / 2, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse]);

  // Métriques SOURCÉES uniquement (jamais une cellule vide). L'échéance porte son
  // unité « h » à côté du gros nombre ; la surface son « km² ». Les libellés courts
  // (« pour défendre », « en jeu ») vivent sous chaque valeur.
  const cells: readonly SheetMetric[] = view.metrics.map((key) => {
    if (key === 'deadline') {
      return {
        key,
        value: String(view.hoursRemaining ?? 0),
        unit: t(C.defenseHourUnit),
        label: t(C.defenseMetricDeadline),
      };
    }
    const { value, unit } = areaInPlayParts(zone.areaKm2, locale);
    return { key, value, unit, label: t(C.defenseMetricArea) };
  });

  // Ligne de couverture : la part rivale APPROXIMATIVE si elle a une source, sinon
  // le seul fait contesté (neutre). Jamais l'activité privée du rival.
  const coverageLine =
    view.coveragePercent !== null
      ? t(C.defenseCoverageRival, { pct: view.coveragePercent })
      : t(C.defenseCoverageNeutral);

  // Note OR : seulement quand l'échéance est connue ET imminente (< 2 h). Portée
  // par le TEXTE, jamais la couleur seule — et jamais rouge (planche E22).
  const showUrgency = view.urgency === 'imminent' && view.hoursRemaining !== null;

  return (
    <View style={styles.info}>
      {/* ── Kicker VIOLET (contesté §C) + ✕ ── */}
      <View style={styles.head}>
        <Animated.View style={[styles.pastille, { opacity: pulse }]} />
        <Text style={styles.kicker} numberOfLines={1} adjustsFontSizeToFit>
          {t(C.defenseKicker)}
        </Text>
        <View style={styles.spacer} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.closeZoneA11y)}
          hitSlop={8}
          onPress={onClose}
          style={({ pressed }) => [styles.closeCircle, pressed && styles.pressed]}
          testID="defense-close"
        >
          <Icon name="fermer" size={iconSizes.sm} color={colors.gris} />
        </Pressable>
      </View>

      {/* ── Titre HÉROS : nom RÉEL du quartier, ou « Zone » — jamais inventé ── */}
      <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
        {zoneName ?? t(C.zoneFallback)}
      </Text>

      {/* ── Couverture rivale approximative / fait contesté (2 lignes max) ── */}
      <Text style={styles.coverage} numberOfLines={2}>
        {coverageLine}
      </Text>

      {/* ── Note d'urgence OR (état imminent uniquement) ── */}
      {showUrgency ? (
        <Text style={styles.urgency} numberOfLines={1} adjustsFontSizeToFit testID="defense-urgency">
          {t(C.defenseUrgencyNote)}
        </Text>
      ) : null}

      {/* ── UN SEUL bloc de métriques à séparateurs (échéance · surface) ── */}
      <SheetMetrics metrics={cells} testID="defense-metrics" />

      {/* ── Phrase tactique NEUTRE et VRAIE (la course reste libre, serveur après) ── */}
      <Text style={styles.tactical} numberOfLines={3}>
        {t(C.defenseTactical)}
      </Text>

      {/* ── CTA UNIQUE chartreuse : DÉFENDRE → briefing E05 label DÉFENSE ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.defendCtaA11y)}
        onPress={onDefendre}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        testID="defense-defend"
      >
        <Text style={styles.ctaLabel} numberOfLines={1} adjustsFontSizeToFit>
          {t(C.defendCta)}
        </Text>
      </Pressable>

      {/* ── Action SECONDAIRE (lien tertiaire, §A.4) : signal de renfort RÉEL ── */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.defenseAlertCrewA11y)}
        accessibilityState={{ disabled: alerting }}
        hitSlop={8}
        disabled={alerting}
        onPress={onAlertCrew}
        style={({ pressed }) => [styles.secondaryHit, pressed && styles.pressed]}
        testID="defense-alert-crew"
      >
        <Text style={[styles.secondaryLabel, alerting && styles.secondaryPending]} numberOfLines={1}>
          {t(C.defenseAlertCrew)}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  // Contenu posé DIRECTEMENT sur la sheet : aucune sous-card (§A). Mêmes marges
  // que la sheet de zone E04 (16 / 12 / gap 6).
  info: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },

  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Pastille VIOLET §C (contesté) — la couleur par RÔLE, jamais par identité.
  pastille: { width: 10, height: 10, borderRadius: 5, backgroundColor: gameColors.contested },
  kicker: {
    color: gameColors.contested,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 2,
    flexShrink: 1,
  },
  spacer: { flex: 1 },
  // ✕ dans un DISQUE (planches E04/E05) — même traitement que la sheet de zone.
  closeCircle: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gameColors.carbon,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  // Nom de quartier = TITRE HÉROS (`typography.title`, 28 px), comme E04/E05.
  name: {
    ...typography.title,
    color: colors.blanc,
    marginTop: 4,
  },
  // Fait NEUTRE, ton compétitif jamais humiliant. Blanc lisible (pas un gris effacé).
  coverage: { color: colors.blanc, fontSize: 12.5, fontWeight: '600' },
  // Note OR — urgence sans alarme (jamais rouge). Petite majuscule discrète.
  urgency: {
    color: gameColors.gold,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Phrase tactique — vraie, neutre, sur fond de sheet (jamais une card).
  tactical: { color: colors.blanc, fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  // CTA plein — hauteur 54 mesurée sur la planche, pill, libellé NOIR sur chartreuse.
  cta: {
    marginTop: 12,
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '800' },
  // « Alerter le crew » CENTRÉ sous le CTA (planche), semibold gris — l'écho
  // tertiaire de la décision, jamais un 2ᵉ bouton plein (§A.4).
  secondaryHit: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  secondaryLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  // Envoi en cours : plus discret, sans bloquer la lecture (le toast dira l'issue).
  secondaryPending: { opacity: 0.5 },
});
