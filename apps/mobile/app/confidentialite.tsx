/**
 * GRYD — Confidentialité (AMENDEMENT-17 CHANTIER 3). LA page la plus critique :
 * elle gouverne l'exposition de la géolocalisation. Contrôle total, clair, sans
 * jargon. Résumé + détail : chaque groupe est une card repliée (valeur courante
 * visible sans scroll), le détail s'ouvre au tap — une seule ouverte à la fois.
 *
 * Au-dessus du fold : MODE PRIVÉ (toggle maître) + Profil + Courses +
 * Départ/arrivée + Position live. Le reste (données sportives/territoire, crew &
 * social, blocage, export/suppression RGPD) se déplie plus bas.
 *
 * Défauts alignés AMENDEMENT-07 (voir store) : position live JAMAIS, FC privée,
 * profil/courses `crew`. Chaque changement est persisté localement (AsyncStorage)
 * et pilote le FILTRAGE d'affichage — jamais le gameplay (l'impact crew reste
 * compté même quand une course est masquée).
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  colors,
  fontSizes,
  gameColors,
  radii,
  spacing,
  type ProfileVisibility,
} from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';
import { GhostButton } from '../src/ui/GhostButton';
import { Icon } from '../src/ui/Icon';
import {
  usePrivacyPrefs,
  type LivePosition,
  type MaskRadius,
  type RunVisibility,
  type SocialAudience,
} from '../src/features/privacy/store';
import {
  DisclosureCard,
  Note,
  SectionLabel,
  SelectPills,
  SwitchRow,
} from '../src/features/privacy/ui';
import {
  LIVE_POSITION_LABELS,
  MASK_RADIUS_LABELS,
  PROFILE_VISIBILITY_LABELS,
  RUN_VISIBILITY_LABELS,
  SOCIAL_AUDIENCE_LABELS,
} from '../src/features/privacy/labels';

/** Ordres d'options (source des enums = @klaim/shared / store). */
const PROFILE_OPTS: { value: ProfileVisibility; label: string }[] = (
  ['public', 'crew', 'friends', 'private'] as ProfileVisibility[]
).map((v) => ({ value: v, label: PROFILE_VISIBILITY_LABELS[v] }));
const RUN_OPTS: { value: RunVisibility; label: string }[] = (
  ['public', 'crew', 'hidden'] as RunVisibility[]
).map((v) => ({ value: v, label: RUN_VISIBILITY_LABELS[v] }));
const LIVE_OPTS: { value: LivePosition; label: string }[] = (
  ['never', 'crew_run', 'crew'] as LivePosition[]
).map((v) => ({ value: v, label: LIVE_POSITION_LABELS[v].label }));
const RADIUS_OPTS: { value: MaskRadius; label: string }[] = (
  ['200', '500', '1000'] as MaskRadius[]
).map((v) => ({ value: v, label: MASK_RADIUS_LABELS[v] }));
const AUDIENCE_OPTS: { value: SocialAudience; label: string }[] = (
  ['everyone', 'friends', 'crew', 'nobody'] as SocialAudience[]
).map((v) => ({ value: v, label: SOCIAL_AUDIENCE_LABELS[v] }));

/** Clés des sections dépliables (une seule ouverte à la fois). */
type SectionKey =
  | 'profile'
  | 'runs'
  | 'endpoints'
  | 'live'
  | 'sport'
  | 'territory'
  | 'social'
  | 'block'
  | 'export';

export default function ConfidentialiteScreen() {
  const { prefs, update, enablePrivateMode } = usePrivacyPrefs();
  // Section ouverte (résumé + détail : une seule à la fois, aucune par défaut).
  const [openKey, setOpenKey] = useState<SectionKey | null>(null);

  useEffect(() => {
    screen('privacy_settings');
  }, []);

  const toggle = (k: SectionKey) => setOpenKey((cur) => (cur === k ? null : k));

  return (
    <StackScreen
      title="Confidentialité"
      icon="verrou"
      subtitle="Ta géoloc t'appartient. Tout est réglable ici, et fermé par défaut."
    >
      {/* MODE PRIVÉ — toggle maître, tout en haut. */}
      <MasterCard active={prefs.privateMode} onEnable={enablePrivateMode} />

      {/* Au-dessus du fold : Profil + Courses + Départ/arrivée + Position live. */}
      <DisclosureCard
        icon="profil"
        title="Profil visible par"
        value={PROFILE_VISIBILITY_LABELS[prefs.profileVisibility]}
        open={openKey === 'profile'}
        onToggle={() => toggle('profile')}
      >
        <SelectPills
          options={PROFILE_OPTS}
          value={prefs.profileVisibility}
          onChange={(v) => void update({ profileVisibility: v })}
        />
      </DisclosureCard>

      <DisclosureCard
        icon="route"
        title="Visibilité des courses"
        value={RUN_VISIBILITY_LABELS[prefs.runVisibility]}
        open={openKey === 'runs'}
        onToggle={() => toggle('runs')}
      >
        <SelectPills
          options={RUN_OPTS}
          value={prefs.runVisibility}
          onChange={(v) => void update({ runVisibility: v })}
        />
        <Note>
          « Masqué » cache ta trace et tes stats aux autres. Ton impact pour le crew reste compté
          — masquer une course ne pénalise jamais ton équipe.
        </Note>
      </DisclosureCard>

      <DisclosureCard
        icon="pin"
        title="Départ & arrivée"
        value={prefs.maskEndpoints ? MASK_RADIUS_LABELS[prefs.maskRadius] : 'Visibles'}
        open={openKey === 'endpoints'}
        onToggle={() => toggle('endpoints')}
      >
        <SwitchRow
          title="Masquer départ et arrivée"
          subtitle="Le début et la fin de tes courses sont floutés autour de tes lieux sensibles."
          value={prefs.maskEndpoints}
          onValueChange={(v) => void update({ maskEndpoints: v })}
        />
        {prefs.maskEndpoints ? (
          <>
            <Text style={styles.miniLabel}>RAYON DE FLOU</Text>
            <SelectPills
              options={RADIUS_OPTS}
              value={prefs.maskRadius}
              onChange={(v) => void update({ maskRadius: v })}
            />
            <View style={styles.divider} />
            <SwitchRow
              title="Autour du domicile"
              value={prefs.maskHome}
              onValueChange={(v) => void update({ maskHome: v })}
            />
            <SwitchRow
              title="Autour du travail"
              value={prefs.maskWork}
              onValueChange={(v) => void update({ maskWork: v })}
            />
          </>
        ) : null}
      </DisclosureCard>

      <DisclosureCard
        icon="gps"
        title="Position en direct"
        value={LIVE_POSITION_LABELS[prefs.livePosition].label}
        open={openKey === 'live'}
        onToggle={() => toggle('live')}
      >
        <SelectPills
          options={LIVE_OPTS}
          value={prefs.livePosition}
          onChange={(v) => void update({ livePosition: v })}
        />
        <Note>{LIVE_POSITION_LABELS[prefs.livePosition].hint} Par défaut : jamais.</Note>
      </DisclosureCard>

      {/* Sous le fold : données, social, sécurité, RGPD. */}
      <SectionLabel>DONNÉES</SectionLabel>

      <DisclosureCard
        icon="performance"
        title="Données sportives"
        value={prefs.heartRatePrivate ? 'FC privée' : 'FC visible'}
        open={openKey === 'sport'}
        onToggle={() => toggle('sport')}
      >
        <SwitchRow
          title="Fréquence cardiaque privée"
          subtitle="Ta FC n'est visible que par toi. Recommandé."
          value={prefs.heartRatePrivate}
          onValueChange={(v) => void update({ heartRatePrivate: v })}
        />
        <SwitchRow
          title="Allure & cadence privées"
          subtitle="Masque le détail de tes performances aux autres."
          value={prefs.sportDataPrivate}
          onValueChange={(v) => void update({ sportDataPrivate: v })}
        />
      </DisclosureCard>

      <DisclosureCard
        icon="carte"
        title="Données territoire"
        value={prefs.territoryVisible ? 'Visibles' : 'Masquées'}
        open={openKey === 'territory'}
        onToggle={() => toggle('territory')}
      >
        <SwitchRow
          title="Afficher mes zones tenues"
          subtitle="Tes secteurs contrôlés apparaissent sur ton profil et sur la carte publique."
          value={prefs.territoryVisible}
          onValueChange={(v) => void update({ territoryVisible: v })}
        />
        <Note>Masquer tes territoires n'enlève rien à ton crew : ils comptent toujours.</Note>
      </DisclosureCard>

      <SectionLabel>CREW & SOCIAL</SectionLabel>

      <DisclosureCard
        icon="crew"
        title="Qui peut me contacter"
        value={SOCIAL_AUDIENCE_LABELS[prefs.whoCanMessage]}
        open={openKey === 'social'}
        onToggle={() => toggle('social')}
      >
        <Text style={styles.miniLabel}>QUI PEUT M'AJOUTER</Text>
        <SelectPills
          options={AUDIENCE_OPTS}
          value={prefs.whoCanAdd}
          onChange={(v) => void update({ whoCanAdd: v })}
        />
        <Text style={styles.miniLabel}>QUI PEUT M'INVITER DANS UN CREW</Text>
        <SelectPills
          options={AUDIENCE_OPTS}
          value={prefs.whoCanInvite}
          onChange={(v) => void update({ whoCanInvite: v })}
        />
        <Text style={styles.miniLabel}>QUI PEUT M'ENVOYER UN MESSAGE</Text>
        <SelectPills
          options={AUDIENCE_OPTS}
          value={prefs.whoCanMessage}
          onChange={(v) => void update({ whoCanMessage: v })}
        />
        <Text style={styles.miniLabel}>QUI VOIT MON STATUT</Text>
        <SelectPills
          options={AUDIENCE_OPTS}
          value={prefs.whoSeesStatus}
          onChange={(v) => void update({ whoSeesStatus: v })}
        />
      </DisclosureCard>

      <DisclosureCard
        icon="bouclier"
        title="Blocage & signalement"
        open={openKey === 'block'}
        onToggle={() => toggle('block')}
      >
        <Note>
          Bloque un joueur pour qu'il ne puisse plus te voir, te contacter, ni interagir avec toi.
          Signale un comportement à l'équipe GRYD — traité sous 48 h.
        </Note>
        <View style={styles.actionGap}>
          <GhostButton
            label="Voir les joueurs bloqués"
            icon="fermer"
            onPress={() => haptics.light()}
          />
          <GhostButton label="Signaler un joueur" icon="alerte" onPress={() => haptics.light()} />
        </View>
      </DisclosureCard>

      <SectionLabel>MES DONNÉES (RGPD)</SectionLabel>

      <DisclosureCard
        icon="reglages"
        title="Export & suppression"
        open={openKey === 'export'}
        onToggle={() => toggle('export')}
        danger
      >
        <Note>
          Tu peux récupérer une copie de toutes tes données, ou en supprimer une partie. Ces choix
          sont définitifs.
        </Note>
        <View style={styles.actionGap}>
          <GhostButton
            label="Télécharger mes données"
            icon="partage"
            onPress={() => haptics.light()}
          />
        </View>

        <Text style={styles.miniLabel}>SUPPRIMER</Text>
        <DangerRow
          title="Supprimer mon historique de courses"
          subtitle="Retire tes courses de l'affichage. Ton impact déjà gagné pour le crew cette saison est anonymisé, pas effacé."
        />
        <DangerRow
          title="Supprimer mes données sportives"
          subtitle="Efface FC, allure et cadence enregistrées. Sans effet sur le territoire."
        />
        <DangerRow
          title="Supprimer mon compte"
          subtitle="Efface ton profil et tes données personnelles. Ta contribution passée au crew est anonymisée pour ne pas fausser la saison."
          last
        />
      </DisclosureCard>
    </StackScreen>
  );
}

/**
 * Card MAÎTRE « Mode privé ». Résume ce que fait le toggle, un seul CTA pour tout
 * verrouiller d'un coup. Actif → état confirmé (bordure chartreuse + check), le
 * détail des réglages reste accessible en dessous pour ajuster.
 */
function MasterCard({ active, onEnable }: { active: boolean; onEnable: () => Promise<void> }) {
  return (
    <View style={[styles.master, active && styles.masterActive]}>
      <View style={styles.masterHead}>
        <Icon name="verrou" size={22} color={active ? colors.chartreuse : colors.blanc} />
        <Text style={styles.masterTitle}>Mode privé</Text>
        {active ? <Text style={styles.masterBadge}>ACTIVÉ</Text> : null}
      </View>
      <Text style={styles.masterDesc}>
        Un seul geste pour tout fermer : courses non publiques, départ et arrivée masqués, position
        en direct coupée, données sportives privées, impact crew anonymisé.
      </Text>
      {active ? (
        <View style={styles.masterConfirm}>
          <Icon name="badge" size={16} color={colors.chartreuse} />
          <Text style={styles.masterConfirmText}>
            Tout est verrouillé. Ajuste chaque réglage ci-dessous si besoin.
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptics.medium();
            void onEnable();
          }}
          style={({ pressed }) => [styles.masterCta, pressed && styles.pressed]}
        >
          <Icon name="verrou" size={18} color={colors.noir} />
          <Text style={styles.masterCtaText}>Activer le mode privé</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Ligne d'action destructive (RGPD) — libellé explicite, pas de rouge criard. */
function DangerRow({
  title,
  subtitle,
  last = false,
}: {
  title: string;
  subtitle: string;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => haptics.medium()}
      style={({ pressed }) => [
        styles.dangerRow,
        !last && styles.dangerRowBorder,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.dangerText}>
        <Text style={styles.dangerTitle}>{title}</Text>
        <Text style={styles.dangerSub}>{subtitle}</Text>
      </View>
      <Icon name="chevron" size={16} color={gameColors.danger} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  master: {
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    marginTop: 8,
    marginBottom: 18,
  },
  masterActive: { borderColor: colors.chartreuse },
  masterHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  masterTitle: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  masterBadge: {
    marginLeft: 'auto',
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  masterDesc: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 10,
  },
  masterCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    marginTop: 16,
  },
  masterCtaText: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '700' },
  masterConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  masterConfirmText: {
    color: colors.blanc,
    fontSize: fontSizes.xs,
    flex: 1,
    lineHeight: fontSizes.xs * 1.5,
  },

  miniLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 2,
  },
  divider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 12 },
  actionGap: { gap: 10, marginTop: 12 },

  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  dangerRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.grisLigne },
  dangerText: { flex: 1 },
  dangerTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '500' },
  dangerSub: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 3,
  },
});
