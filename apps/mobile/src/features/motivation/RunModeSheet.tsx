/**
 * GRYD — CHOIX AVANCÉS de course. AMENDEMENT-16 §1 (doc §1-§3) enrichit la
 * sheet d'appui long : elle s'ouvre désormais sur les INTENTIONS optionnelles
 * — RUN libre (défaut : fermer = tap GO), **Conquérir** (« Trace une boucle
 * pour créer une zone. Distance conseillée : 2 à 5 km » → Planifier une boucle
 * / Courir librement) et **Défendre** (liste des zones à défendre : République
 * · expire 18 h · boucle 3,1 km / Canal · contesté · 4,6 km) — PUIS les modes
 * Social Run / Course privée (AMENDEMENT-07, inchangés).
 *
 * « L'intention guide, le tracé décide » (doc §2) : l'intention est 100 %
 * CLIENT (teinte les bandeaux live), elle ne part JAMAIS au serveur pour
 * l'attribution — le tracé réel seul décide (ingest_run ne la lit pas).
 *
 * Le tap simple sur GO reste le run libre immédiat (AMENDEMENT-14 §2) ; cette
 * sheet n'apparaît qu'à l'APPUI LONG. Anti-shame : aucune intention/mode n'est
 * « le bon » — Run libre est présenté en premier et par défaut.
 */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing, withAlpha, type RunMode } from '@klaim/shared';
import { Icon } from '../../ui/Icon';
import { RULE_PHRASE } from '../nav/runContext';
import {
  CONQUEST_ADVICE,
  DEFENSE_COPY,
  DEFENSE_TARGETS_DEMO,
  FREE_RUN_COPY,
  defenseLoopLabel,
  type DefenseTargetDemo,
  type RunIntention,
} from '../run/intention';
import { useT } from '../../i18n/store';
import { RUN_MODE_LABELS } from './labels';

/** Modes proposés au départ (MVP actif — race_mode/event_run = V1, exclus). */
const RUN_MODE_ORDER: Extract<RunMode, 'social_run' | 'course_privee'>[] = [
  'social_run',
  'course_privee',
];

export function RunModeSheet({
  visible,
  onSelect,
  onIntention,
  onDefenseTarget,
  onPlanLoop,
  onChangeRoute,
  onClose,
}: {
  visible: boolean;
  /** Mode « social/privé » choisi → l'appelant lance la course avec ce runMode. */
  onSelect: (mode: RunMode) => void;
  /** Intention optionnelle (Conquérir/Défendre) → live intention=… (client only). */
  onIntention: (intention: RunIntention) => void;
  /** Zone à défendre choisie → live intention=defense&route=… (doc §3.3). */
  onDefenseTarget: (target: DefenseTargetDemo) => void;
  /** « Planifier une boucle » (Conquérir) → Route Planner présélectionné capture. */
  onPlanLoop: () => void;
  /** « Changer d'itinéraire » → Route Planner (outil optionnel, A-14 §3). */
  onChangeRoute?: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  // Sous-panneaux d'intention dépliés à la demande (repliés par défaut :
  // Run libre est l'action première — on ne noie pas le tap GO).
  const [expanded, setExpanded] = useState<RunIntention | null>(null);

  const toggle = (intention: RunIntention) =>
    setExpanded((cur) => (cur === intention ? null : intention));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer">
        {/* Le contenu ne propage pas le tap de fermeture. */}
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={() => {}}
        >
          <View style={styles.grab} />
          <Text style={styles.title}>Comment tu cours ?</Text>
          <Text style={styles.subtitle}>Tu peux changer à chaque sortie.</Text>

          {/* ── RUN libre (défaut) : fermer la sheet = tap GO (doc §3.1) ── */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Run libre — cours librement"
            onPress={onClose}
            style={({ pressed }) => [styles.row, styles.rowFirst, pressed && styles.rowPressed]}
          >
            <View style={[styles.iconWrap, styles.iconWrapDefault]}>
              <Icon name="foulees" size={22} color={colors.chartreuse} />
            </View>
            <View style={styles.rowText}>
              <View style={styles.rowTitleLine}>
                <Text style={styles.rowTitle}>Run libre</Text>
                <View style={styles.defaultTag}>
                  <Text style={styles.defaultTagText}>DÉFAUT</Text>
                </View>
              </View>
              <Text style={styles.rowSubtitle}>{FREE_RUN_COPY}</Text>
            </View>
            <View style={styles.chevron}>
              <Icon name="chevron" size={18} color={colors.gris} />
            </View>
          </Pressable>

          {/* ── Conquérir (intention optionnelle, doc §3.2) ── */}
          <IntentionRow
            icon="cible"
            title="Conquérir"
            subtitle={CONQUEST_ADVICE}
            open={expanded === 'conquest'}
            onPress={() => toggle('conquest')}
          />
          {expanded === 'conquest' ? (
            <View style={styles.panel}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Planifier une boucle — ouvrir le Route Planner"
                onPress={onPlanLoop}
                style={({ pressed }) => [styles.panelPrimary, pressed && styles.rowPressed]}
              >
                <Icon name="route" size={16} color={colors.noir} />
                <Text style={styles.panelPrimaryLabel}>Planifier une boucle</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Courir librement en mode Conquérir"
                onPress={() => onIntention('conquest')}
                style={({ pressed }) => [styles.panelSecondary, pressed && styles.rowPressed]}
              >
                <Text style={styles.panelSecondaryLabel}>Courir librement</Text>
              </Pressable>
            </View>
          ) : null}

          {/* ── Défendre (intention optionnelle, doc §3.3) ── */}
          <IntentionRow
            icon="bouclier"
            title="Défendre"
            subtitle={DEFENSE_COPY}
            open={expanded === 'defense'}
            onPress={() => toggle('defense')}
          />
          {expanded === 'defense' ? (
            <View style={styles.panel}>
              <Text style={styles.panelKicker}>
                {DEFENSE_TARGETS_DEMO.length} ZONES À DÉFENDRE
              </Text>
              {DEFENSE_TARGETS_DEMO.map((target) => (
                <Pressable
                  key={target.routeId}
                  accessibilityRole="button"
                  accessibilityLabel={`Défendre ${target.zone} — ${target.urgency}`}
                  onPress={() => onDefenseTarget(target)}
                  style={({ pressed }) => [styles.defenseRow, pressed && styles.rowPressed]}
                >
                  <Icon name="cible" size={15} color={colors.chartreuse} />
                  <View style={styles.rowText}>
                    <Text style={styles.defenseZone}>{target.zone}</Text>
                    <Text style={styles.defenseMeta} numberOfLines={1}>
                      {target.urgency} · {defenseLoopLabel(target)}
                    </Text>
                  </View>
                  <Icon name="chevron" size={16} color={colors.gris} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* ── Modes existants (AMENDEMENT-07) : Social Run / Course privée ── */}
          {RUN_MODE_ORDER.map((mode) => {
            const def = RUN_MODE_LABELS[mode];
            return (
              <Pressable
                key={mode}
                accessibilityRole="button"
                accessibilityLabel={t(def.title)}
                onPress={() => onSelect(mode)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <View style={styles.iconWrap}>
                  <Icon name={def.icon} size={22} color={colors.blanc} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{t(def.title)}</Text>
                  <Text style={styles.rowSubtitle}>{t(def.subtitle)}</Text>
                </View>
                <View style={styles.chevron}>
                  <Icon name="chevron" size={18} color={colors.gris} />
                </View>
              </Pressable>
            );
          })}

          {onChangeRoute ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Changer d'itinéraire — ouvrir le Route Planner"
              onPress={onChangeRoute}
              style={({ pressed }) => [styles.routeRow, pressed && styles.rowPressed]}
            >
              <Icon name="route" size={16} color={colors.blanc} />
              <Text style={styles.routeLabel}>Changer d'itinéraire</Text>
              <View style={styles.chevron}>
                <Icon name="chevron" size={16} color={colors.gris} />
              </View>
            </Pressable>
          ) : null}

          {/* Aide (AMENDEMENT-14 §1) : la règle en une phrase — GO fait le reste. */}
          <Text style={styles.help}>{RULE_PHRASE}</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Ligne d'intention dépliable (Conquérir / Défendre) — chevron pivoté à l'ouverture. */
function IntentionRow({
  icon,
  title,
  subtitle,
  open,
  onPress,
}: {
  icon: 'cible' | 'bouclier';
  title: string;
  subtitle: string;
  open: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, open && styles.rowOpen, pressed && styles.rowPressed]}
    >
      <View style={styles.iconWrap}>
        <Icon name={icon} size={22} color={colors.blanc} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.chevron, open && styles.chevronOpen]}>
        <Icon name="chevron" size={18} color={colors.gris} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: withAlpha(colors.noir, 0.55),
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.carbone,
    borderTopLeftRadius: radii.card + 8,
    borderTopRightRadius: radii.card + 8,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  grab: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.grisLigne,
    marginBottom: 16,
  },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  subtitle: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 4, marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  // Run libre : première entrée, pas de filet au-dessus (colle au sous-titre).
  rowFirst: { borderTopWidth: 0 },
  // Intention dépliée : on retire le filet du panneau qui suit (bloc continu).
  rowOpen: {},
  rowPressed: { opacity: 0.7 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pastille Run libre : cerclée chartreuse discrète (l'action première).
  iconWrapDefault: { borderWidth: 1, borderColor: colors.chartreuse40 },
  rowText: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  // Tag DÉFAUT : filet chartreuse, texte chartreuse (jamais de fond clair).
  defaultTag: {
    borderWidth: 1,
    borderColor: colors.chartreuse40,
    borderRadius: radii.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  defaultTagText: {
    color: colors.chartreuse,
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rowSubtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    marginTop: 2,
  },
  chevron: { opacity: 0.8 },
  chevronOpen: { transform: [{ rotate: '90deg' }] },

  // ── Sous-panneau d'intention (Conquérir : actions ; Défendre : zones) ──
  panel: {
    gap: 8,
    paddingBottom: 12,
    paddingLeft: 58, // aligné sous le texte de la ligne (icône 44 + gap 14).
  },
  panelPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
  // Libellé NOIR sur chartreuse (charte — jamais de chartreuse sur fond clair).
  panelPrimaryLabel: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800' },
  panelSecondary: {
    height: 42,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelSecondaryLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  panelKicker: {
    color: colors.gris,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 2,
  },
  defenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  defenseZone: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  defenseMeta: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 1 },

  // « Changer d'itinéraire » — entrée discrète (le Route Planner est optionnel).
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: colors.grisLigne,
  },
  routeLabel: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
  help: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 10,
  },
});
