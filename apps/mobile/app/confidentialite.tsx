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
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      Alert.alert('Pseudo manquant', 'Entre le pseudo du joueur à signaler.');
      return;
    }
    haptics.medium();
    reportContent({ kind: 'member', targetId: pseudo, author: pseudo, reason: reportReason });
    setTargetPseudo('');
    Alert.alert(
      'Signalement envoyé',
      `Merci. Une personne de l'équipe examine ton signalement sous ${REPORT_REVIEW_HOURS} h.`,
    );
  };

  // Bloque le pseudo saisi (RÉEL : blockMember, silencieux pour l'autre). Le
  // joueur apparaît aussitôt dans la liste « Joueurs bloqués » ci-dessous.
  const submitBlock = () => {
    const pseudo = targetPseudo.trim();
    if (pseudo.length === 0) {
      Alert.alert('Pseudo manquant', 'Entre le pseudo du joueur à bloquer.');
      return;
    }
    haptics.medium();
    blockMember(pseudo);
    setTargetPseudo('');
    Alert.alert(
      'Joueur bloqué',
      `${pseudo} ne peut plus te voir, te contacter, ni interagir avec toi. Tu peux le débloquer ici à tout moment.`,
    );
  };

  // Suppression de compte (Guideline 5.1.1v). RÉEL : si session, on appelle
  // l'Edge Function `delete_account` (service-role) qui supprime auth.users → le
  // CASCADE FK efface compte + runs + hex_claims + season_scores + badges +
  // crew_members côté serveur. PUIS déconnexion + purge locale + retour
  // onboarding. Sur ÉCHEC serveur : on n'efface RIEN localement et on informe —
  // jamais de faux « compte supprimé ». Sans session (dev/web) : purge locale
  // seule. Distinct de l'export RGPD.
  const runAccountDeletion = async () => {
    haptics.medium();
    if (configured && session && supabase) {
      const { error } = await supabase.functions.invoke('delete_account');
      if (error) {
        Alert.alert(
          'Suppression impossible',
          "Ton compte n'a pas pu être supprimé. Réessaie dans un instant ou contacte le support.",
        );
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
      Alert.alert('Export indisponible', 'Connecte-toi pour exporter tes données.');
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke('export_account');
      if (error || !data) {
        Alert.alert('Export impossible', 'Réessaie dans un instant ou contacte le support.');
        return;
      }
      await Share.share({
        title: 'Mes données GRYD (RGPD)',
        message: JSON.stringify(data, null, 2),
      });
    } catch {
      Alert.alert('Export impossible', 'Réessaie dans un instant ou contacte le support.');
    }
  };

  if (confirmDelete) {
    return (
      <DeleteAccountConfirm
        onCancel={() => {
          haptics.light();
          setConfirmDelete(false);
        }}
        onConfirm={() => void runAccountDeletion()}
      />
    );
  }

  return (
    <StackScreen
      title="Confidentialité"
      icon="verrou"
      subtitle="Ta géoloc t'appartient. On la lit pour transformer tes courses en territoire — rien n'est partagé sans ton accord. Tout est fermé par défaut."
    >
      {/* MODE PRIVÉ — toggle maître, tout en haut. */}
      <MasterCard active={privateActive} onEnable={enablePrivateMode} />

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

      {/* Titre aligné sur le CONTENU (ajout, invitation, message, statut) —
          « contacter » était plus étroit que les 4 réglages qu'il couvre. */}
      <DisclosureCard
        icon="crew"
        title="Qui peut interagir"
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

      {/* Blocage & signalement ACTIONNABLES ICI (la card tient sa promesse) :
          pseudo saisi + motif → Signaler / Bloquer, liste des bloqués avec
          Débloquer, et lien direct vers le chat crew pour un message précis. */}
      <DisclosureCard
        icon="bouclier"
        title="Blocage & signalement"
        value={blocked.length > 0 ? `${blocked.length} bloqué${blocked.length > 1 ? 's' : ''}` : undefined}
        open={openKey === 'block'}
        onToggle={() => toggle('block')}
      >
        <Note>
          Un joueur bloqué ne peut plus te voir, te contacter, ni interagir avec toi. Chaque
          signalement est examiné par une personne sous {REPORT_REVIEW_HOURS} h.
        </Note>
        <Text style={styles.miniLabel}>PSEUDO DU JOUEUR</Text>
        <TextInput
          accessibilityLabel="Pseudo du joueur à signaler ou bloquer"
          value={targetPseudo}
          onChangeText={setTargetPseudo}
          placeholder="Ex. K.Runner75"
          placeholderTextColor={colors.gris}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.pseudoInput}
        />
        <Text style={styles.miniLabel}>MOTIF DU SIGNALEMENT</Text>
        <SelectPills options={REASON_OPTS} value={reportReason} onChange={setReportReason} />
        <Note>{REPORT_REASONS.find((r) => r.key === reportReason)?.hint ?? ''}</Note>
        <View style={styles.actionGap}>
          <GhostButton label="Signaler ce joueur" icon="alerte" onPress={submitReport} />
          <GhostButton label="Bloquer ce joueur" icon="bouclier" onPress={submitBlock} />
        </View>
        {blocked.length > 0 ? (
          <>
            <Text style={styles.miniLabel}>JOUEURS BLOQUÉS</Text>
            {blocked.map((pseudo) => (
              <View key={pseudo} style={styles.blockedRow}>
                <Text style={styles.blockedName} numberOfLines={1}>
                  {pseudo}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Débloquer ${pseudo}`}
                  onPress={() => {
                    haptics.light();
                    unblockMember(pseudo);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => [styles.unblockBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.unblock}>Débloquer</Text>
                </Pressable>
              </View>
            ))}
          </>
        ) : null}
        <View style={styles.divider} />
        <Note>
          Pour signaler un message précis, passe par le chat du crew (appui long sur le message).
        </Note>
        <View style={styles.actionGap}>
          <GhostButton
            label="Ouvrir le chat du crew"
            icon="crew"
            onPress={() => {
              haptics.light();
              router.push('/crew');
            }}
          />
          <GhostButton
            label="Lire le code de conduite"
            icon="bouclier"
            onPress={() => {
              haptics.light();
              router.push('/code-conduite');
            }}
          />
        </View>
      </DisclosureCard>

      <SectionLabel>MES DONNÉES (RGPD)</SectionLabel>

      {/* Âge minimum SURFACE ici (protection des mineurs) — même règle que
          l'age-gate de l'onboarding (features/onboarding/content.ts, 16 ans). */}
      <View style={styles.ageRow}>
        <Icon name="info" size={16} color={colors.gris} />
        <Text style={styles.ageText}>Âge minimum : 16 ans — confirmé à ton inscription.</Text>
      </View>

      <DisclosureCard
        icon="reglages"
        title="Export & suppression"
        open={openKey === 'export'}
        onToggle={() => toggle('export')}
        danger
      >
        <Text style={styles.miniLabel}>EXPORTER (RGPD)</Text>
        <Note>
          Récupère une copie de toutes tes données — courses, zones, profil — au format JSON,
          via le partage. Ça n'efface rien.
        </Note>
        <View style={styles.actionGap}>
          <GhostButton
            label="Exporter mes données"
            icon="partage"
            onPress={() => void runDataExport()}
          />
        </View>

        <Text style={styles.miniLabel}>SUPPRIMER PARTIELLEMENT (BIENTÔT)</Text>
        <DangerRow
          title="Supprimer mon historique de courses"
          subtitle="Retirera tes courses de l'affichage. Ton impact déjà gagné pour le crew reste anonymisé, pas effacé. Bientôt depuis l'app."
          onPress={() => confirmPartialDelete('Supprimer mon historique de courses')}
        />
        <DangerRow
          title="Supprimer mes données sportives"
          subtitle="Effacera FC, allure et cadence enregistrées. Sans effet sur le territoire. Bientôt depuis l'app."
          last
          onPress={() => confirmPartialDelete('Supprimer mes données sportives')}
        />
      </DisclosureCard>

      {/* Suppression de compte (Guideline 5.1.1v) — DISTINCTE de l'export : une
          card dédiée, action unique, vers un écran de confirmation plein écran. */}
      <SectionLabel>SUPPRESSION DU COMPTE</SectionLabel>
      <View style={styles.deleteCard}>
        <Text style={styles.deleteCardText}>
          Tu peux supprimer ton compte GRYD directement depuis l'app. Cela efface ton compte, tes
          courses et ton territoire. C'est irréversible.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Supprimer mon compte"
          onPress={() => {
            haptics.medium();
            setConfirmDelete(true);
          }}
          style={({ pressed }) => [styles.deleteRow, pressed && styles.pressed]}
        >
          <Icon name="fermer" size={18} color={gameColors.danger} />
          <Text style={styles.deleteRowLabel}>Supprimer mon compte</Text>
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
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    screen('account_delete_confirm');
  }, []);
  return (
    <StackScreen
      title="Supprimer mon compte"
      icon="alerte"
      subtitle="Dernière étape avant l'effacement définitif."
    >
      <View style={styles.confirmBox}>
        <Icon name="alerte" size={28} color={gameColors.danger} />
        <Text style={styles.confirmTitle}>Ceci efface ton compte, tes courses et ton territoire.</Text>
        <Text style={styles.confirmBody}>
          Ton profil, ton historique de courses et les zones que tu tiens seront supprimés. Ta
          contribution passée au crew est anonymisée pour ne pas fausser la saison. Cette action est
          irréversible : on ne peut pas restaurer ton compte ensuite.
        </Text>
      </View>

      <View style={styles.confirmActions}>
        <GhostButton label="Annuler, garder mon compte" onPress={onCancel} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Supprimer définitivement mon compte"
          onPress={onConfirm}
          style={({ pressed }) => [styles.confirmDelete, pressed && styles.pressed]}
        >
          <Icon name="fermer" size={18} color={gameColors.danger} />
          <Text style={styles.confirmDeleteText}>Supprimer définitivement</Text>
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
  return (
    <View style={[styles.master, active && styles.masterActive]}>
      <View style={styles.masterHead}>
        <Icon name="verrou" size={22} color={active ? colors.chartreuse : colors.blanc} />
        <Text style={styles.masterTitle}>Mode privé</Text>
        {active ? <Text style={styles.masterBadge}>ACTIVÉ</Text> : null}
      </View>
      <Text style={styles.masterDesc}>
        Un seul geste pour tout fermer : profil privé, courses non publiques, départ et arrivée
        masqués, position en direct coupée, données sportives privées.
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

/**
 * Suppression PARTIELLE (RGPD) — l'effacement serveur automatique n'est PAS
 * encore câblé (O1, Edge Function service-role). HONNÊTE : on ne simule jamais
 * une confirmation destructive ni un « c'est appliqué » mensonger ; on annonce
 * la disponibilité à venir et on pointe les vrais chemins (support, export,
 * suppression de compte réelle ci-dessous).
 */
function confirmPartialDelete(title: string): void {
  haptics.light();
  Alert.alert(
    title,
    "Bientôt disponible depuis l'app. En attendant, demande-la depuis Aide & support — ou exporte / supprime ton compte ci-dessous, ces deux actions sont déjà réelles.",
    [{ text: 'Compris' }],
  );
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
  divider: { height: 1, backgroundColor: colors.grisLigne, marginVertical: 12 },
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
    marginTop: 3,
  },

  // Card dédiée « Supprimer mon compte » (5.1.1v) — distincte de l'export.
  deleteCard: {
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
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
  confirmActions: { gap: 12, marginTop: 20 },
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
