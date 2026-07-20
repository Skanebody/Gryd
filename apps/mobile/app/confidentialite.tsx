/**
 * GRYD — Confidentialité (AMENDEMENT-17 CHANTIER 3). LA page la plus critique :
 * elle gouverne l'exposition de la géolocalisation. Le sous-titre dit le
 * POURQUOI du GPS (courses → territoire, rien de partagé sans accord). Résumé +
 * détail : chaque groupe est une card repliée (valeur courante visible sans
 * scroll), le détail s'ouvre au tap — une seule ouverte à la fois.
 *
 * Au-dessus du fold : MODE PRIVÉ (toggle maître) + Profil + Courses +
 * Départ/arrivée + Position live. Plus bas : données sportives/territoire, crew
 * & social, blocage & signalement ACTIONNABLES ICI (signaler un pseudo avec
 * motif via reportContent, bloquer via blockMember, débloquer, lien vers le
 * chat crew pour un message précis), âge minimum affiché, export RGPD réel et
 * suppression de compte (5.1.1v).
 *
 * Défauts alignés AMENDEMENT-07 (voir store) : position live JAMAIS, FC privée,
 * profil/courses `crew`. Chaque changement est persisté localement (AsyncStorage)
 * et pilote le FILTRAGE d'affichage — jamais le gameplay (l'impact crew reste
 * compté même quand une course est masquée).
 */
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  spacing,
  type ProfileVisibility,
} from '@klaim/shared';
import { C } from '../src/i18n/catalog/reglages';
import { t as tStatic, useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/lib/session';
import { signOut } from '../src/lib/auth';
import { StackScreen } from '../src/ui/StackScreen';
import { GhostButton } from '../src/ui/GhostButton';
import { Icon } from '../src/ui/Icon';
import {
  PRIVATE_MODE_PATCH,
  usePrivacyPrefs,
  type LivePosition,
  type MaskRadius,
  type PrivacyPrefs,
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
import {
  REPORT_REASONS,
  REPORT_REVIEW_HOURS,
  blockMember,
  reportContent,
  unblockMember,
  useModeration,
  type ReportReason,
} from '../src/features/crew/moderation';

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
/** Motifs de signalement (source unique : store de modération partagé). */
const REASON_OPTS: { value: ReportReason; label: string }[] = REPORT_REASONS.map((r) => ({
  value: r.key,
  label: r.label,
}));

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
  const t = useT();
  const { prefs, update, enablePrivateMode } = usePrivacyPrefs();
  // « Mode privé » ACTIF = DÉRIVÉ de l'état RÉEL des réglages, pas du flag figé
  // `privateMode` : si l'utilisateur ré-ouvre un réglage sensible après avoir tout
  // verrouillé, la card ne peut plus prétendre « tout est verrouillé » (l'app ne
  // ment jamais). On compare chaque réglage d'exposition à sa valeur fermée.
  const privateActive = useMemo(
    () =>
      (Object.keys(PRIVATE_MODE_PATCH) as (keyof PrivacyPrefs)[])
        .filter((k) => k !== 'privateMode')
        .every((k) => prefs[k] === PRIVATE_MODE_PATCH[k]),
    [prefs],
  );
  // Joueurs bloqués (store de modération partagé avec le Crew Chat) — la carte
  // « Blocage & signalement » les liste ici avec un « Débloquer » réel.
  const { blocked } = useModeration();
  // Session : la suppression RÉELLE serveur n'a lieu que si une session existe.
  const { session, configured } = useSession();
  // Section ouverte (résumé + détail : une seule à la fois, aucune par défaut).
  const [openKey, setOpenKey] = useState<SectionKey | null>(null);
  // Écran de confirmation de suppression de compte (5.1.1v). Plein écran =
  // 1 écran / 1 décision (§A) : tant qu'il est ouvert, il remplace la page.
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Garde de ré-entrée de la suppression (action DESTRUCTIVE réseau) : sans elle,
  // un double-tap déclenche deux invoke('delete_account').
  const [deleting, setDeleting] = useState(false);
  // Signalement/blocage ACTIONNABLE depuis la card « Blocage & signalement » :
  // pseudo saisi + motif choisi → reportContent / blockMember (store partagé
  // avec le Crew Chat — mêmes données, même traitement sous 24 h).
  const [targetPseudo, setTargetPseudo] = useState('');
  const [reportReason, setReportReason] = useState<ReportReason>('spam');

  useEffect(() => {
    screen('privacy_settings');
  }, []);

  const toggle = (k: SectionKey) => setOpenKey((cur) => (cur === k ? null : k));

  // Signale le pseudo saisi avec le motif choisi (RÉEL : store de modération —
  // persistance locale + écriture `content_reports` si session). Feedback
  // immédiat, jamais de promesse morte.
  const submitReport = () => {
    const pseudo = targetPseudo.trim();
    if (pseudo.length === 0) {
      Alert.alert(t(C.pseudoManquantTitle), t(C.reportMissingBody));
      return;
    }
    haptics.medium();
    reportContent({ kind: 'member', targetId: pseudo, author: pseudo, reason: reportReason });
    setTargetPseudo('');
    Alert.alert(t(C.reportSentTitle), t(C.reportSentBody, { h: REPORT_REVIEW_HOURS }));
  };

  // Bloque le pseudo saisi (RÉEL : blockMember, silencieux pour l'autre). Le
  // joueur apparaît aussitôt dans la liste « Joueurs bloqués » ci-dessous.
  const submitBlock = () => {
    const pseudo = targetPseudo.trim();
    if (pseudo.length === 0) {
      Alert.alert(t(C.pseudoManquantTitle), t(C.blockMissingBody));
      return;
    }
    haptics.medium();
    blockMember(pseudo);
    setTargetPseudo('');
    Alert.alert(t(C.playerBlockedTitle), t(C.playerBlockedBody, { pseudo }));
  };

  // Suppression de compte (Guideline 5.1.1v). RÉEL : si session, on appelle
  // l'Edge Function `delete_account` (service-role) qui supprime auth.users → le
  // CASCADE FK efface compte + runs + hex_claims + season_scores + badges +
  // crew_members côté serveur. PUIS déconnexion + purge locale + retour
  // onboarding. Sur ÉCHEC serveur : on n'efface RIEN localement et on informe —
  // jamais de faux « compte supprimé ». Sans session (dev/web) : purge locale
  // seule. Distinct de l'export RGPD.
  const runAccountDeletion = async () => {
    if (deleting) return; // anti double-tap sur une action irréversible
    setDeleting(true);
    haptics.medium();
    if (configured && session && supabase) {
      const { error } = await supabase.functions.invoke('delete_account');
      if (error) {
        setDeleting(false); // échec : on rend la main pour réessayer
        Alert.alert(t(C.deleteFailTitle), t(C.deleteFailBody));
        return;
      }
      // Session serveur invalidée : on réinitialise l'auth locale (best-effort).
      await signOut().catch(() => {});
    }
    try {
      // Efface toutes les prefs/état locaux (privacy, motivation, onboarding,
      // haptics, session persistée…). Best-effort — un stockage indispo ne bloque rien.
      await AsyncStorage.clear();
    } catch {
      // no-op : on route quand même vers l'onboarding.
    }
    router.replace('/onboarding');
  };

  // Export RGPD (art. 15/20) — RÉEL : si session, appelle l'Edge Function
  // `export_account` (service-role) qui agrège les données perso de l'utilisateur,
  // puis présente le JSON via la feuille de partage native (aucune lib ajoutée).
  // Sans session (dev/web) : message d'indisponibilité. Ne modifie/efface rien.
  const runDataExport = async () => {
    haptics.light();
    if (!(configured && session && supabase)) {
      Alert.alert(t(C.exportUnavailableTitle), t(C.exportUnavailableBody));
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('export_account');
      if (error || !data) {
        Alert.alert(t(C.exportFailTitle), t(C.exportFailBody));
        return;
      }
      await Share.share({
        title: t(C.exportShareTitle),
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      Alert.alert(t(C.exportFailTitle), t(C.exportFailBody));
    }
  };

  if (confirmDelete) {
    return (
      <DeleteAccountConfirm
        busy={deleting}
        onCancel={() => {
          haptics.light();
          setConfirmDelete(false);
        }}
        onConfirm={() => void runAccountDeletion()}
      />
    );
  }

  return (
    <StackScreen title={t(C.privTitle)} icon="verrou" subtitle={t(C.privSubtitle)}>
      {/* MODE PRIVÉ — toggle maître, tout en haut. */}
      <MasterCard active={privateActive} onEnable={enablePrivateMode} />

      {/* Au-dessus du fold : Profil + Courses + Départ/arrivée + Position live. */}
      <DisclosureCard
        icon="profil"
        title={t(C.profilVisiblePar)}
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
        title={t(C.visibiliteCourses)}
        value={RUN_VISIBILITY_LABELS[prefs.runVisibility]}
        open={openKey === 'runs'}
        onToggle={() => toggle('runs')}
      >
        <SelectPills
          options={RUN_OPTS}
          value={prefs.runVisibility}
          onChange={(v) => void update({ runVisibility: v })}
        />
        <Note>{t(C.masqueNote)}</Note>
      </DisclosureCard>

      <DisclosureCard
        icon="pin"
        title={t(C.departArrivee)}
        value={prefs.maskEndpoints ? MASK_RADIUS_LABELS[prefs.maskRadius] : t(C.visibles)}
        open={openKey === 'endpoints'}
        onToggle={() => toggle('endpoints')}
      >
        <SwitchRow
          title={t(C.masquerDepartArrivee)}
          subtitle={t(C.masquerDepartSub)}
          value={prefs.maskEndpoints}
          onValueChange={(v) => void update({ maskEndpoints: v })}
        />
        {prefs.maskEndpoints ? (
          <>
            <Text style={styles.miniLabel}>{t(C.rayonFlou)}</Text>
            <SelectPills
              options={RADIUS_OPTS}
              value={prefs.maskRadius}
              onChange={(v) => void update({ maskRadius: v })}
            />
            <View style={styles.divider} />
            <SwitchRow
              title={t(C.autourDomicile)}
              value={prefs.maskHome}
              onValueChange={(v) => void update({ maskHome: v })}
            />
            <SwitchRow
              title={t(C.autourTravail)}
              value={prefs.maskWork}
              onValueChange={(v) => void update({ maskWork: v })}
            />
          </>
        ) : null}
      </DisclosureCard>

      <DisclosureCard
        icon="gps"
        title={t(C.positionDirect)}
        value={LIVE_POSITION_LABELS[prefs.livePosition].label}
        open={openKey === 'live'}
        onToggle={() => toggle('live')}
      >
        <SelectPills
          options={LIVE_OPTS}
          value={prefs.livePosition}
          onChange={(v) => void update({ livePosition: v })}
        />
        <Note>{`${LIVE_POSITION_LABELS[prefs.livePosition].hint} ${t(C.parDefautJamais)}`}</Note>
      </DisclosureCard>

      {/* Sous le fold : données, social, sécurité, RGPD. */}
      <SectionLabel>{t(C.secDonnees)}</SectionLabel>

      <DisclosureCard
        icon="performance"
        title={t(C.donneesSportives)}
        value={prefs.heartRatePrivate ? t(C.fcPrivee) : t(C.fcVisible)}
        open={openKey === 'sport'}
        onToggle={() => toggle('sport')}
      >
        <SwitchRow
          title={t(C.freqCardiaquePrivee)}
          subtitle={t(C.freqCardiaqueSub)}
          value={prefs.heartRatePrivate}
          onValueChange={(v) => void update({ heartRatePrivate: v })}
        />
        <SwitchRow
          title={t(C.allureCadencePrivees)}
          subtitle={t(C.allureCadenceSub)}
          value={prefs.sportDataPrivate}
          onValueChange={(v) => void update({ sportDataPrivate: v })}
        />
      </DisclosureCard>

      <DisclosureCard
        icon="carte"
        title={t(C.donneesTerritoire)}
        value={prefs.territoryVisible ? t(C.visibles) : t(C.masquees)}
        open={openKey === 'territory'}
        onToggle={() => toggle('territory')}
      >
        <SwitchRow
          title={t(C.afficherZonesTenues)}
          subtitle={t(C.afficherZonesSub)}
          value={prefs.territoryVisible}
          onValueChange={(v) => void update({ territoryVisible: v })}
        />
        <Note>{t(C.masquerTerritoiresNote)}</Note>
      </DisclosureCard>

      <SectionLabel>{t(C.secCrewSocial)}</SectionLabel>

      {/* Titre aligné sur le CONTENU (ajout, invitation, message, statut) —
          « contacter » était plus étroit que les 4 réglages qu'il couvre. */}
      <DisclosureCard
        icon="crew"
        title={t(C.quiPeutInteragir)}
        value={SOCIAL_AUDIENCE_LABELS[prefs.whoCanMessage]}
        open={openKey === 'social'}
        onToggle={() => toggle('social')}
      >
        <Text style={styles.miniLabel}>{t(C.quiPeutAjouter)}</Text>
        <SelectPills
          options={AUDIENCE_OPTS}
          value={prefs.whoCanAdd}
          onChange={(v) => void update({ whoCanAdd: v })}
        />
        <Text style={styles.miniLabel}>{t(C.quiPeutInviter)}</Text>
        <SelectPills
          options={AUDIENCE_OPTS}
          value={prefs.whoCanInvite}
          onChange={(v) => void update({ whoCanInvite: v })}
        />
        <Text style={styles.miniLabel}>{t(C.quiPeutMessage)}</Text>
        <SelectPills
          options={AUDIENCE_OPTS}
          value={prefs.whoCanMessage}
          onChange={(v) => void update({ whoCanMessage: v })}
        />
        <Text style={styles.miniLabel}>{t(C.quiVoitStatut)}</Text>
        <SelectPills
          options={AUDIENCE_OPTS}
          value={prefs.whoSeesStatus}
          onChange={(v) => void update({ whoSeesStatus: v })}
        />
      </DisclosureCard>

      {/* Blocage & signalement ACTIONNABLES ICI (la card tient sa promesse) :
          pseudo saisi + motif → Signaler / Bloquer, liste des bloqués avec
          Débloquer, et lien direct vers le chat crew pour un message précis. */}
      <DisclosureCard
        icon="bouclier"
        title={t(C.blocageSignalement)}
        value={
          blocked.length > 0
            ? t(blocked.length > 1 ? C.blockedMany : C.blockedOne, { n: blocked.length })
            : undefined
        }
        open={openKey === 'block'}
        onToggle={() => toggle('block')}
      >
        <Note>{t(C.blockNote, { h: REPORT_REVIEW_HOURS })}</Note>
        <Text style={styles.miniLabel}>{t(C.pseudoJoueurLabel)}</Text>
        <TextInput
          accessibilityLabel={t(C.pseudoInputA11y)}
          value={targetPseudo}
          onChangeText={setTargetPseudo}
          placeholder={t(C.pseudoPlaceholder)}
          placeholderTextColor={colors.gris}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.pseudoInput}
        />
        <Text style={styles.miniLabel}>{t(C.motifSignalement)}</Text>
        <SelectPills options={REASON_OPTS} value={reportReason} onChange={setReportReason} />
        <Note>{REPORT_REASONS.find((r) => r.key === reportReason)?.hint ?? ''}</Note>
        <View style={styles.actionGap}>
          <GhostButton label={t(C.signalerJoueur)} icon="alerte" onPress={submitReport} />
          <GhostButton label={t(C.bloquerJoueur)} icon="bouclier" onPress={submitBlock} />
        </View>
        {blocked.length > 0 ? (
          <>
            <Text style={styles.miniLabel}>{t(C.joueursBloques)}</Text>
            {blocked.map((pseudo) => (
              <View key={pseudo} style={styles.blockedRow}>
                <Text style={styles.blockedName} numberOfLines={1}>
                  {pseudo}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t(C.debloquerA11y, { pseudo })}
                  onPress={() => {
                    haptics.light();
                    unblockMember(pseudo);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [styles.unblockBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.unblock}>{t(C.debloquer)}</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}
        <View style={styles.divider} />
        <Note>{t(C.signalerMessageNote)}</Note>
        <View style={styles.actionGap}>
          <GhostButton
            label={t(C.ouvrirChatCrew)}
            icon="crew"
            onPress={() => {
              haptics.light();
              router.push('/crew');
            }}
          />
          <GhostButton
            label={t(C.lireCodeConduite)}
            icon="bouclier"
            onPress={() => {
              haptics.light();
              router.push('/code-conduite');
            }}
          />
        </View>
      </DisclosureCard>

      <SectionLabel>{t(C.secMesDonneesRgpd)}</SectionLabel>

      {/* Âge minimum SURFACE ici (protection des mineurs) — même règle que
          l'age-gate de l'onboarding (features/onboarding/content.ts, 16 ans). */}
      <View style={styles.ageRow}>
        <Icon name="info" size={16} color={colors.gris} />
        <Text style={styles.ageText}>{t(C.ageMinimum)}</Text>
      </View>

      <DisclosureCard
        icon="reglages"
        title={t(C.exportSuppression)}
        open={openKey === 'export'}
        onToggle={() => toggle('export')}
        danger
      >
        <Text style={styles.miniLabel}>{t(C.exporterRgpdLabel)}</Text>
        <Note>{t(C.exportNote)}</Note>
        <View style={styles.actionGap}>
          <GhostButton
            label={t(C.exporterMesDonnees)}
            icon="partage"
            onPress={() => void runDataExport()}
          />
        </View>

        <Text style={styles.miniLabel}>{t(C.supprimerPartiellement)}</Text>
        <DangerRow
          title={t(C.suppHistoriqueTitle)}
          subtitle={t(C.suppHistoriqueSub)}
          onPress={() => confirmPartialDelete(t(C.suppHistoriqueTitle))}
        />
        <DangerRow
          title={t(C.suppSportivesTitle)}
          subtitle={t(C.suppSportivesSub)}
          last
          onPress={() => confirmPartialDelete(t(C.suppSportivesTitle))}
        />
      </DisclosureCard>

      {/* Suppression de compte (Guideline 5.1.1v) — DISTINCTE de l'export : une
          card dédiée, action unique, vers un écran de confirmation plein écran. */}
      <SectionLabel>{t(C.secSuppressionCompte)}</SectionLabel>
      <View style={styles.deleteCard}>
        <Text style={styles.deleteCardText}>{t(C.deleteCardText)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.supprimerMonCompte)}
          onPress={() => {
            haptics.medium();
            setConfirmDelete(true);
          }}
          style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
        >
          <Icon name="fermer" size={iconSizes.md} color={gameColors.danger} />
          <Text style={styles.deleteRowLabel}>{t(C.supprimerMonCompte)}</Text>
          <View style={styles.deleteChevron}>
            <Icon name="chevron" size={16} color={gameColors.danger} />
          </View>
        </Pressable>
      </View>
    </StackScreen>
  );
}

/**
 * Écran de confirmation de suppression de compte (Guideline 5.1.1v). PLEIN ÉCRAN
 * = 1 écran / 1 décision (§A) : une seule action destructive, une seule sortie.
 * Textes non tronqués, palette tri-couleur (danger = orange sobre, jamais de
 * rouge criard ni de chartreuse sur fond clair). Le CTA de confirmation est un
 * ghost destructif explicite — pas de disque chartreuse (réservé à COURIR).
 */
function DeleteAccountConfirm({
  onCancel,
  onConfirm,
  busy,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const t = useT();
  useEffect(() => {
    screen('account_delete_confirm');
  }, []);
  return (
    <StackScreen
      title={t(C.supprimerMonCompte)}
      icon="alerte"
      subtitle={t(C.deleteConfirmSubtitle)}
    >
      <View style={styles.confirmBox}>
        <Icon name="alerte" size={28} color={gameColors.danger} />
        <Text style={styles.confirmTitle}>{t(C.deleteConfirmTitle)}</Text>
        <Text style={styles.confirmBody}>{t(C.deleteConfirmBody)}</Text>
      </View>

      <View style={styles.confirmActions}>
        <GhostButton label={t(C.annulerGarder)} onPress={onCancel} disabled={busy} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.deleteDefinitifA11y)}
          accessibilityState={{ disabled: busy, busy }}
          disabled={busy}
          onPress={onConfirm}
          style={({ pressed }) => [styles.confirmDelete, (pressed || busy) && styles.pressed]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={gameColors.danger} />
          ) : (
            <Icon name="fermer" size={iconSizes.md} color={gameColors.danger} />
          )}
          <Text style={styles.confirmDeleteText}>
            {busy ? t(C.suppressionEnCours) : t(C.supprimerDefinitivement)}
          </Text>
        </Pressable>
      </View>
    </StackScreen>
  );
}

/**
 * Card MAÎTRE « Mode privé ». Résume ce que fait le toggle, un seul CTA pour tout
 * verrouiller d'un coup. Actif → état confirmé (bordure chartreuse + check), le
 * détail des réglages reste accessible en dessous pour ajuster.
 */
function MasterCard({ active, onEnable }: { active: boolean; onEnable: () => Promise<void> }) {
  const t = useT();
  return (
    <View style={[styles.master, active && styles.masterActive]}>
      <View style={styles.masterHead}>
        <Icon name="verrou" size={iconSizes.lg} color={active ? colors.chartreuse : colors.blanc} />
        <Text style={styles.masterTitle}>{t(C.modePrive)}</Text>
        {active ? <Text style={styles.masterBadge}>{t(C.modePriveActive)}</Text> : null}
      </View>
      <Text style={styles.masterDesc}>{t(C.modePriveDesc)}</Text>
      {active ? (
        <View style={styles.masterConfirm}>
          <Icon name="badge" size={16} color={colors.chartreuse} />
          <Text style={styles.masterConfirmText}>{t(C.modePriveConfirm)}</Text>
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
          <Icon name="verrou" size={iconSizes.md} color={colors.noir} />
          <Text style={styles.masterCtaText}>{t(C.activerModePrive)}</Text>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Suppression PARTIELLE (RGPD) — l'effacement serveur automatique n'est PAS
 * encore câblé (O1, Edge Function service-role). HONNÊTE : on ne simule jamais
 * une confirmation destructive ni un « c'est appliqué » mensonger ; on annonce
 * la disponibilité à venir et on pointe les vrais chemins (support, export,
 * suppression de compte réelle ci-dessous).
 */
function confirmPartialDelete(title: string): void {
  haptics.light();
  Alert.alert(title, tStatic(C.partialDeleteBody), [{ text: tStatic(C.compris) }]);
}

function DangerRow({
  title,
  subtitle,
  last = false,
  onPress,
}: {
  title: string;
  subtitle: string;
  last?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
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
  divider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: spacing.sm },
  actionGap: { gap: 10, marginTop: 12 },

  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
  },
  blockedName: { flex: 1, color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  // Cible de tap ≥ 44 px (bouton réel, pas un simple texte chartreuse).
  unblockBtn: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  unblock: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '700' },

  // Champ pseudo (signaler / bloquer) — 48 px, texte md (pas de zoom iOS).
  pseudoInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    color: colors.blanc,
    fontSize: fontSizes.md,
    marginTop: 6,
  },

  // Ligne informative « Âge minimum » (protection des mineurs) — pas une card.
  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  ageText: {
    flex: 1,
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
  },

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
    marginTop: spacing.xxs,
  },

  // Card dédiée « Supprimer mon compte » (5.1.1v) — distincte de l'export.
  deleteCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
  },
  deleteCardText: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
  },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.danger,
  },
  deleteRowLabel: {
    color: gameColors.danger,
    fontSize: fontSizes.sm,
    fontWeight: '600',
    flex: 1,
  },
  deleteChevron: { transform: [{ rotate: '90deg' }] },

  // Écran de confirmation plein écran.
  confirmBox: {
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: gameColors.danger,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 12,
    marginTop: 8,
  },
  confirmTitle: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '600',
    lineHeight: fontSizes.lg * 1.35,
  },
  confirmBody: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.55,
  },
  confirmActions: { gap: spacing.sm, marginTop: spacing.lg },
  confirmDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.danger,
  },
  confirmDeleteText: {
    color: gameColors.danger,
    fontSize: fontSizes.md,
    fontWeight: '700',
  },
});
