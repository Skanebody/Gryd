/**
 * GRYD — CONFIDENTIALITÉ. La page la plus critique de l'app : elle gouverne
 * l'exposition de la géolocalisation, donc elle n'a pas le droit d'exagérer ce
 * qu'elle contrôle.
 *
 * ─── ORDRE DE COMPOSITION ─────────────────────────────────────────────────────
 *   1. `StackScreen` : kicker « RÉGLAGES · TES DONNÉES » + titre + sous-titre qui
 *      dit, en une phrase VÉRIFIABLE, ce que GRYD expose aujourd'hui ;
 *   2. CE QUE LES AUTRES VOIENT — « Profil visible par » et « Départ & arrivée »,
 *      deux cards repliées (résumé visible, détail au tap), chacune suivie de la
 *      note qui dit son étendue RÉELLE ;
 *   3. BLOCAGE & SIGNALEMENT — la seule zone d'action de la page ;
 *   4. MES DONNÉES (RGPD) — export, puis suppression du compte.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · DIX RÉGLAGES SANS AUCUN CONSOMMATEUR : position live, territoire visible, FC
 *   privée, données sportives privées, les quatre audiences sociales, visibilité
 *   des courses, et le trio rayon de flou / domicile / travail. Zéro occurrence
 *   hors du store et de cet écran (détail et preuve dans
 *   `features/privacy/prefs.ts`). Un interrupteur de confidentialité sans effet
 *   est le pire mensonge de l'app : « Rayon de flou · 1 km » masquait 200 m, et
 *   « Autour du domicile » était inopérable — aucun écran ne permet de déclarer
 *   une adresse. Ni câblables ici (le miroir serveur est O1), donc retirés.
 * · LE TOGGLE MAÎTRE « MODE PRIVÉ ». Sa card affirmait « tout est verrouillé »
 *   sur un `every()` de valeurs purement LOCALES, alors que rien n'est envoyé au
 *   serveur — et « tout », c'était en réalité dix inerties et deux réglages.
 * · LES DEUX LIGNES DESTRUCTIVES « Supprimer l'historique » / « Supprimer les
 *   données sportives ». Peintes en rouge, avec chevron, leur SEUL comportement
 *   était une `Alert` renvoyant vers Aide & support — qui n'a aucun canal. Une
 *   ligne destructive qui ne détruit rien et pointe vers une porte fermée.
 * · LE BOUTON « OUVRIR LE CHAT DU CREW » et la note qui l'accompagnait. Il n'y a
 *   ni route, ni onglet, ni écran de chat : le chat libre est refusé (A-43 §9).
 * · LES DIX CADRES PERMANENTS des cards (voir `features/privacy/ui.tsx`) : le
 *   contour d'ouverture redevient un état.
 * · Le `formatDate()` qui renvoyait `'—'` : « supprimé le — » est exactement le
 *   segment sans source que la règle 15 interdit. Une date absente fait
 *   disparaître le segment, pas apparaître un tiret.
 * · Le CTA « Exporter » peint hors session, et le `numberOfLines={1}` sur le
 *   pseudo d'un joueur bloqué — tronquer un pseudo dans une liste de blocage est
 *   le pire endroit possible pour une ellipse.
 *
 * ─── LES QUATRE ÉTATS, NOMMÉS SÉPARÉMENT ──────────────────────────────────────
 * ① pas connecté  → l'export et le signalement le disent AVANT le tap, et ne
 *                   peignent aucun bouton qui échouerait ;
 * ② connecté, rien → aucun joueur bloqué : la liste disparaît (pas de « 0 ») ;
 * ③ échec         → `deletionRead === 'failed'` a sa propre copie et son
 *                   « Réessayer » : un réseau qui lâche ne prouve pas qu'aucune
 *                   suppression n'est en cours. La ligne « Supprimer mon compte »
 *                   reste néanmoins accessible : ne pas savoir LIRE l'état d'un
 *                   compte n'autorise pas à retirer le droit de le supprimer ;
 * ④ lecture       → `deletionRead === 'reading'` est une LIGNE grise. La branche
 *                   « aucune suppression en cours » ne s'affiche qu'après une
 *                   réponse RÉELLE du serveur : elle affirmait auparavant sur un
 *                   `deletionStatus === null` qui voulait aussi dire « je ne sais
 *                   pas encore » et « je n'ai pas pu lire ».
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ──────────────────────────────────────────────
 * · « Blocage & signalement » et « Mes données » restent sur CE scroll au lieu de
 *   deux pages poussées : ouvrir deux routes sort du périmètre de fichiers de ce
 *   lot. La page passe de neuf cards à trois, ce qui traite la cause.
 * · Les préférences restent LOCALES (AsyncStorage) : il n'existe aucune colonne
 *   ni RPC de confidentialité côté serveur (O1). L'écran le DIT plutôt que de
 *   laisser croire qu'un réglage suit le compte.
 * · La confirmation de suppression reste un écran plein — 1 écran / 1 décision.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACCOUNT_DELETION_GRACE_DAYS,
  borderState,
  colors,
  elevation,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  sizes,
  spacing,
  typography,
  type IconName,
  type ProfileVisibility,
} from '@klaim/shared';
import { C } from '../src/i18n/catalog/reglages';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { supabase } from '../src/lib/supabase';
import { useSession } from '../src/lib/session';
import {
  cancelAccountDeletion,
  fetchDeletionStatus,
  requestAccountDeletion,
  type DeletionStatus,
} from '../src/features/account/deletion';
import { signOut } from '../src/lib/auth';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { ListRow } from '../src/ui/ListRow';
import { SectionLabel } from '../src/ui/SectionLabel';
import { PROFILE_VISIBILITIES } from '../src/features/privacy/prefs';
import { usePrivacyPrefs } from '../src/features/privacy/store';
import { DisclosureCard, Note, SelectPills, SwitchRow } from '../src/features/privacy/ui';
// Le masquage partagé vient de la MÊME constante que le rendu : la note ne peut
// donc plus annoncer une distance différente de celle qui est réellement
// retirée (c'était le cœur du mensonge « rayon de flou »).
import { SHARE_TRIM_M } from '../src/features/share/sharePrivacy';
import { usePrivacyZones } from '../src/features/privacy/zonesStore';
import { slotsLeft, zoneEditPlan } from '../src/features/privacy/zoneEdit';
import { removeZone, saveZone } from '../src/features/privacy/zonesWrite';
import { resolveLocation } from '../src/features/map/locationState';
import { LOCATION_PROVIDER } from '../src/features/onboarding/locate';
import { PRIVACY_ZONE_DEFAULT_RADIUS_M, PRIVACY_ZONES_MAX } from '@klaim/shared';
import {
  REPORT_REASONS,
  REPORT_REVIEW_HOURS,
  blockMember,
  reportContent,
  unblockMember,
  useModeration,
  type ReportReason,
} from '../src/features/crew/moderation';
// Le nom du crew alimente la CONSÉQUENCE honnête du réglage « Mes territoires
// portent mon nom » (« sinon Un coureur de … ») : lecture légère (roster seul,
// pas l'agrégat crew_overview). Absent → variante sans nom, jamais un crew inventé.
import { useRealCrew } from '../src/features/crew/real';

/** Libellés de visibilité — traduits (ils étaient en français en dur). */
const VISIBILITY_ENTRY: Record<ProfileVisibility, Entry> = {
  public: C.visPublic,
  crew: C.visCrew,
  friends: C.visFriends,
  private: C.visPrivate,
};

/** Sections dépliables (une seule ouverte à la fois, aucune par défaut). */
type SectionKey = 'profile' | 'endpoints' | 'block' | 'export';

/**
 * L'issue de la lecture du statut de suppression. Quatre valeurs, parce qu'il y
 * a quatre situations qui n'appellent pas la même phrase — et que `null` les
 * confondait toutes les trois premières.
 */
type DeletionRead = 'signedOut' | 'reading' | 'known' | 'failed';

export default function ConfidentialiteScreen() {
  const t = useT();
  const { prefs, update } = usePrivacyPrefs();
  const { blocked } = useModeration();
  const { crew } = useRealCrew();
  const { session, configured, loading: sessionLoading } = useSession();
  const signedIn = configured && session !== null && supabase !== null;
  /** Nom RÉEL du crew, ou null : jamais un crew fabriqué pour la conséquence. */
  const crewName = crew?.name ?? null;

  const [openKey, setOpenKey] = useState<SectionKey | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Garde de ré-entrée d'une action DESTRUCTIVE réseau (anti double-tap). */
  const [deleting, setDeleting] = useState(false);
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const [deletionRead, setDeletionRead] = useState<DeletionRead>('reading');
  /** Avance à chaque « Réessayer » : relance la lecture du statut. */
  const [readTick, setReadTick] = useState(0);

  const [targetPseudo, setTargetPseudo] = useState('');
  const [reportReason, setReportReason] = useState<ReportReason>('spam');

  useEffect(() => {
    screen('privacy_settings');
  }, []);

  /**
   * ÉTAT RÉEL de la suppression différée, lu au serveur. On distingue « pas de
   * compte » (rien à lire) de « je lis » et de « je n'ai pas pu lire » —
   * `fetchDeletionStatus()` renvoie `null` sur échec ET sans backend, et c'est
   * l'appelant qui doit savoir dans lequel des deux cas il est.
   */
  useEffect(() => {
    if (sessionLoading) {
      setDeletionRead('reading');
      return;
    }
    if (!signedIn) {
      setDeletionRead('signedOut');
      setDeletionStatus(null);
      return;
    }
    let alive = true;
    setDeletionRead('reading');
    void fetchDeletionStatus().then((st) => {
      if (!alive) return;
      if (st === null) {
        setDeletionRead('failed');
        return;
      }
      setDeletionStatus(st);
      setDeletionRead('known');
    });
    return () => {
      alive = false;
    };
  }, [signedIn, sessionLoading, readTick]);

  const toggle = (k: SectionKey) => setOpenKey((cur) => (cur === k ? null : k));

  // ── ENDROITS PROTÉGÉS (E77) ────────────────────────────────────────────────
  // La lecture porte ses quatre états ; on ne les fond jamais. `reloadKey` force
  // une relecture après écriture : sans elle, l'écran afficherait encore l'état
  // d'avant et le joueur croirait son geste perdu.
  const zonesRead = usePrivacyZones();
  const [zoneReloadKey, setZoneReloadKey] = useState(0);
  const [zoneBusy, setZoneBusy] = useState(false);
  const [zoneFlash, setZoneFlash] = useState<Entry | null>(null);

  const takenIndexes =
    zonesRead.status === 'ready' ? zonesRead.zones.map((_, i) => i) : null;
  const zoneSlotsLeft = slotsLeft(takenIndexes);

  /**
   * Pose une zone AUTOUR DE LA POSITION ACTUELLE.
   *
   * La position n'est demandée QU'ICI, sur geste explicite — jamais au montage
   * de l'écran : une page de confidentialité qui réveille le GPS à l'ouverture
   * serait la dernière à pouvoir se le permettre.
   */
  const addZoneAtCurrentPosition = async (): Promise<void> => {
    if (zoneBusy) return;
    setZoneFlash(null);
    setZoneBusy(true);
    try {
      // `resolveLocation` ne rend JAMAIS « rien » : chacune de ses issues a son
      // état. Seul un `point` non nul est exploitable ici — un refus de
      // permission ou un capteur muet tombent tous deux sur `no-position`.
      const outcome = await resolveLocation(LOCATION_PROVIDER);
      const here = outcome.point;
      const plan = zoneEditPlan(
        here === null
          ? null
          : { lat: here.lat, lng: here.lng, radiusM: PRIVACY_ZONE_DEFAULT_RADIUS_M },
        takenIndexes,
      );
      if (plan.kind !== 'write') {
        // Chaque refus a SA phrase : « pas de position » et « c'est plein » ne
        // demandent pas la même chose au joueur.
        setZoneFlash(
          plan.kind === 'full'
            ? C.zonesFull
            : plan.kind === 'no-position'
              ? C.zonesNoPosition
              : C.zonesLoading,
        );
        return;
      }
      const uid = session?.user?.id ?? null;
      if (uid === null || here === null) {
        setZoneFlash(C.zonesNoPosition);
        return;
      }
      const out = await saveZone(uid, plan.index, here.lat, here.lng, plan.radiusM);
      // On n'annonce « protégé » que sur un acquittement RÉEL de la base.
      setZoneFlash(out.kind === 'saved' ? C.zonesSaved : C.zonesSaveFailed);
      if (out.kind === 'saved') {
        haptics.success();
        setZoneReloadKey((k) => k + 1);
      }
    } finally {
      setZoneBusy(false);
    }
  };

  /** Retirer une zone est une PERTE de protection : on la fait confirmer. */
  const confirmRemoveZone = async (index: number): Promise<void> => {
    if (zoneBusy) return;
    const uid = session?.user?.id ?? null;
    if (uid === null) return;
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert(t(C.zonesRemove), t(C.zonesRemoveConfirm), [
        { text: t(C.annulerGarder), style: 'cancel', onPress: () => resolve(false) },
        { text: t(C.zonesRemove), style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!ok) return;
    setZoneBusy(true);
    try {
      const out = await removeZone(uid, index);
      setZoneFlash(out.kind === 'saved' ? null : C.zonesSaveFailed);
      if (out.kind === 'saved') setZoneReloadKey((k) => k + 1);
    } finally {
      setZoneBusy(false);
    }
  };

  /**
   * Signale le pseudo saisi. RÉEL uniquement sous session : `reportContent`
   * n'écrit dans `content_reports` que si un compte existe. Le bouton n'est donc
   * jamais peint hors session (cf. le rendu plus bas).
   */
  const submitReport = async () => {
    const pseudo = targetPseudo.trim();
    if (pseudo.length === 0) {
      Alert.alert(t(C.pseudoManquantTitle), t(C.reportMissingBody));
      return;
    }
    haptics.medium();
    // ON ATTEND LE VERDICT SERVEUR (28/07/2026). `reportContent` partait
    // auparavant en fire-and-forget et cet écran annonçait « Signalement
    // envoyé · une personne l'examine sous 24 h » même quand rien n'avait été
    // enregistré. Un accusé de réception sur un échec est un mensonge sur le
    // chemin de signalement lui-même.
    const res = await reportContent({
      kind: 'member',
      targetId: pseudo,
      author: pseudo,
      reason: reportReason,
    });
    if (res.state !== 'recorded') {
      Alert.alert(t(C.reportFailedTitle), t(C.reportFailedBody));
      return;
    }
    setTargetPseudo('');
    Alert.alert(t(C.reportSentTitle), t(C.reportSentBody, { h: REPORT_REVIEW_HOURS }));
  };

  /** Bloque le pseudo saisi. RÉEL même hors session : le filtrage est local. */
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

  /**
   * Date localisée d'une échéance (jour + mois + année, sans heure : la purge
   * est un job quotidien, annoncer une heure serait faux). Renvoie `null` quand
   * il n'y a pas de date — l'appelant fait alors DISPARAÎTRE le segment au lieu
   * d'afficher « le — » (règle 15).
   */
  const formatDate = useCallback((iso: string | null): string | null => {
    if (iso === null) return null;
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return null;
    return new Date(ms).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  /**
   * DEMANDE de suppression différée (0046 + Guideline 5.1.1v). Ce n'est PAS un
   * effacement immédiat : le serveur marque le compte, le rend invisible tout de
   * suite, et la purge réelle a lieu à l'échéance.
   *
   * On NE déconnecte QUE si le serveur a confirmé. Sur échec : on n'efface rien,
   * on ne déconnecte pas, et on le dit — jamais de faux « compte supprimé ». La
   * déconnexion est VOULUE : « toute reconnexion annule la suppression » n'a de
   * sens que si l'utilisateur est effectivement déconnecté.
   */
  const runAccountDeletion = async () => {
    if (deleting) return;
    setDeleting(true);
    haptics.medium();

    const status = await requestAccountDeletion();
    if (!status) {
      setDeleting(false);
      Alert.alert(t(C.deleteFailTitle), t(C.deleteFailBody));
      return;
    }

    setDeletionStatus(status);
    setDeletionRead('known');
    setConfirmDelete(false);
    setDeleting(false);
    const date = formatDate(status.purgeAt);
    Alert.alert(
      t(C.deletionScheduledTitle),
      date === null ? t(C.deletionPendingTitle) : t(C.deletionScheduledBody, { date }),
    );

    await signOut().catch(() => {});
    try {
      await AsyncStorage.clear();
    } catch {
      // no-op : on route quand même vers l'onboarding.
    }
    router.replace('/onboarding');
  };

  /** ANNULATION explicite. N'annonce une restauration que si le serveur l'a dit. */
  const runCancelDeletion = async () => {
    if (deleting) return;
    setDeleting(true);
    haptics.medium();
    const { ok, restored } = await cancelAccountDeletion();
    setDeleting(false);
    if (!ok) {
      Alert.alert(t(C.deleteFailTitle), t(C.deleteFailBody));
      return;
    }
    setDeletionStatus({ pending: false, graceDays: null, requestedAt: null, purgeAt: null });
    setDeletionRead('known');
    if (restored) Alert.alert(t(C.deletionRestoredTitle), t(C.deletionRestoredBody));
  };

  /**
   * Export RGPD (art. 15/20) — RÉEL : Edge Function `export_account`, rendue via
   * la feuille de partage native. N'est atteignable que sous session (le bouton
   * n'existe pas autrement), donc plus aucune `Alert` « connecte-toi » après tap.
   */
  const runDataExport = async () => {
    haptics.light();
    if (supabase === null) return;
    try {
      const { data, error } = await supabase.functions.invoke('export_account');
      if (error || !data) {
        Alert.alert(t(C.exportFailTitle), t(C.exportFailBody));
        return;
      }
      await Share.share({ title: t(C.exportShareTitle), message: JSON.stringify(data, null, 2) });
    } catch {
      Alert.alert(t(C.exportFailTitle), t(C.exportFailBody));
    }
  };

  if (confirmDelete) {
    return (
      <DeleteAccountConfirm
        graceDays={deletionStatus?.graceDays ?? ACCOUNT_DELETION_GRACE_DAYS}
        busy={deleting}
        onCancel={() => {
          haptics.light();
          setConfirmDelete(false);
        }}
        onConfirm={() => void runAccountDeletion()}
      />
    );
  }

  const purgeDate = formatDate(deletionStatus?.purgeAt ?? null);

  return (
    <StackScreen
      title={t(C.privTitle)}
      icon="verrou"
      kicker={t(C.privKicker)}
      subtitle={t(C.privSubtitle)}
    >
      {/* Bandeau de confiance (planche E25) — protected-blue. Il n'affirme QUE la
          garantie qui tient aujourd'hui et pour toujours : la position en direct
          n'est jamais partagée. Pas de promesse de visibilité croisée (O1). */}
      <TrustBanner text={t(C.privTrustBanner)} />

      <SectionLabel style={styles.kicker}>{t(C.secVisibilite)}</SectionLabel>

      <DisclosureCard
        icon="profil"
        title={t(C.profilVisiblePar)}
        value={t(VISIBILITY_ENTRY[prefs.profileVisibility])}
        open={openKey === 'profile'}
        onToggle={() => toggle('profile')}
      >
        <SelectPills
          options={PROFILE_VISIBILITIES.map((v) => ({ value: v, label: t(VISIBILITY_ENTRY[v]) }))}
          value={prefs.profileVisibility}
          onChange={(v) => void update({ profileVisibility: v })}
        />
        <Note>{t(C.visScopeNote)}</Note>
      </DisclosureCard>

      {/* Deux réglages de la planche dont l'effet suppose une visibilité CROISÉE
          (O1) : coque fidèle, mais NON interactive et marquée « Bientôt » — jamais
          un interrupteur qui prétendrait gouverner une exposition inexistante. La
          conséquence de jeu est écrite en sous-titre (fidèle à la planche). */}
      <PendingSwitchRow
        title={t(C.territoryNameTitle)}
        conseq={
          crewName !== null
            ? t(C.territoryNameConseqCrew, { crew: crewName })
            : t(C.territoryNameConseqSolo)
        }
        soonLabel={t(C.soonPill)}
      />
      <PendingSwitchRow
        title={t(C.leaderboardVisibleTitle)}
        conseq={t(C.leaderboardVisibleConseq)}
        soonLabel={t(C.soonPill)}
      />
      <Note>{t(C.visibilitySoonNote)}</Note>

      <SectionLabel style={styles.kicker}>{t(C.secZonesProtegees)}</SectionLabel>

      <DisclosureCard
        icon="pin"
        title={t(C.departArrivee)}
        value={prefs.maskEndpoints ? t(C.masquees) : t(C.visibles)}
        open={openKey === 'endpoints'}
        onToggle={() => toggle('endpoints')}
      >
        <SwitchRow
          title={t(C.masquerDepartArrivee)}
          subtitle={t(C.masquerDepartSub)}
          value={prefs.maskEndpoints}
          onValueChange={(v) => void update({ maskEndpoints: v })}
        />
        {/* La distance annoncée est la constante RÉELLEMENT appliquée par
            `applySharePrivacy` — plus un choix de rayon qui ne changeait rien. */}
        <Note>{t(C.maskScopeNote, { m: SHARE_TRIM_M })}</Note>
      </DisclosureCard>

      {/* ENDROITS PROTÉGÉS — RÉELS depuis le 28/07/2026. Ils remplacent un
          `PendingRow` « Bientôt » : la table `privacy_zones` existait depuis 0002
          avec sa RLS owner-only, le pipeline de masquage la lisait, mais aucun
          écran ne permettait d'en déclarer une — la liste était donc vide pour
          tout le monde et toute la chaîne tournait à vide.
          L'ENJEU A CHANGÉ : depuis qu'`ingest_run` persiste une trace masquée
          dans `runs.polyline_masked`, une zone déclarée n'est plus seulement
          retirée d'une image de partage — elle est retirée de ce qui est ÉCRIT
          EN BASE. C'est la seule protection qui couvre le MILIEU d'une sortie ;
          la coupe départ/arrivée (card ci-dessus) ne couvre que les bouts.
          LES QUATRE ÉTATS SONT DISTINCTS : chargement, pas de compte, échec de
          lecture, et liste lue (vide ou non). On ne dit JAMAIS « aucun endroit »
          quand on n'a pas pu lire. */}
      {zonesRead.status === 'loading' ? (
        <Note>{t(C.zonesLoading)}</Note>
      ) : zonesRead.status === 'error' ? (
        <Note>{t(C.zonesFailed)}</Note>
      ) : zonesRead.status === 'no-account' ? (
        <Note>{t(C.namedZonesSoonNote)}</Note>
      ) : (
        <>
          {zonesRead.zones.map((z, i) => (
            <ListRow
              key={`zone-${i}`}
              icon="pin"
              label={t(C.zonesItem, { m: z.radiusM })}
              value={t(C.zonesRemove)}
              onPress={() => {
                void confirmRemoveZone(i);
              }}
            />
          ))}
          {zonesRead.zones.length === 0 ? <Note>{t(C.zonesEmpty)}</Note> : null}
          {/* Le CTA n'est peint que si un emplacement est libre : un bouton qui
              échouerait toujours (trois zones déjà posées) est un bouton mort.
              Le refus est DIT à sa place, jamais un bouton grisé sans motif. */}
          {zoneSlotsLeft !== null && zoneSlotsLeft > 0 ? (
            <>
              <Button
                label={t(C.zonesAddTitle)}
                onPress={() => void addZoneAtCurrentPosition()}
                loading={zoneBusy}
              />
              <Note>{t(C.zonesAddSub)}</Note>
            </>
          ) : (
            <Note>{t(C.zonesFull)}</Note>
          )}
          {zoneFlash !== null ? <Note>{t(zoneFlash)}</Note> : null}
        </>
      )}

      <SectionLabel style={styles.kicker}>{t(C.secSecurite)}</SectionLabel>

      <DisclosureCard
        icon="bouclier"
        title={t(C.signalerAbusTitle)}
        value={
          blocked.length > 0
            ? t(blocked.length > 1 ? C.blockedMany : C.blockedOne, { n: blocked.length })
            : undefined
        }
        open={openKey === 'block'}
        onToggle={() => toggle('block')}
      >
        <Note>{t(C.blockNote)}</Note>
        {/* Guideline 1.2 — ce formulaire n'est plus la SEULE porte : depuis
            l'audit App Store (B4), la ligne d'un joueur (roster de crew,
            classement) porte un « … » qui ouvre la même action, pré-remplie.
            On le DIT ici, sinon personne ne trouverait le chemin court. */}
        <Note>{t(C.blockShortcutNote)}</Note>
        <Text style={styles.miniLabel}>{t(C.pseudoJoueurLabel)}</Text>
        <TextInput
          accessibilityLabel={t(C.pseudoInputA11y)}
          value={targetPseudo}
          onChangeText={setTargetPseudo}
          placeholder={t(C.pseudoPlaceholder)}
          placeholderTextColor={colors.gris}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          // Les actions sont SOUS le clavier pendant la saisie : « Done » le
          // referme et les rend atteignables sans perdre la saisie.
          onSubmitEditing={() => Keyboard.dismiss()}
          style={styles.pseudoInput}
        />

        {/* SIGNALER n'existe que si le signalement PART vraiment. Hors session,
            `reportContent` reste local : le bouton serait un bouton mort, et
            l'alerte « examiné sous 24 h » un mensonge. BLOQUER, lui, agit
            toujours (filtrage d'affichage local) — il reste. */}
        {signedIn ? (
          <>
            <Text style={styles.miniLabel}>{t(C.motifSignalement)}</Text>
            <SelectPills options={REASON_OPTS(t)} value={reportReason} onChange={setReportReason} />
            <Note>{t(reasonHint(reportReason))}</Note>
            <View style={styles.actionGap}>
              <Button
                variant="ghost"
                size="md"
                label={t(C.signalerJoueur)}
                icon="alerte"
                onPress={() => void submitReport()}
              />
            </View>
          </>
        ) : (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>{t(C.reportSignedOutTitle)}</Text>
            <Text style={styles.stateBody}>{t(C.reportSignedOutBody)}</Text>
          </View>
        )}

        <View style={styles.actionGap}>
          <Button
            variant="ghost"
            size="md"
            label={t(C.bloquerJoueur)}
            icon="bouclier"
            onPress={submitBlock}
          />
        </View>

        {blocked.length > 0 ? (
          <>
            <Text style={styles.miniLabel}>{t(C.joueursBloques)}</Text>
            {blocked.map((pseudo) => (
              <View key={pseudo} style={styles.blockedRow}>
                {/* Aucun `numberOfLines` : un pseudo tronqué dans une liste de
                    blocage empêche d'identifier qui l'on a bloqué. */}
                <Text style={styles.blockedName}>{pseudo}</Text>
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
          <Button
            variant="ghost"
            size="md"
            label={t(C.lireCodeConduite)}
            icon="bouclier"
            onPress={() => {
              haptics.light();
              router.push('/code-conduite');
            }}
          />
        </View>
      </DisclosureCard>

      {/* Délai de publication des captures (planche) : suppose que d'autres
          joueurs VOIENT tes captures (O1) — pas encore le cas. Coque fidèle avec
          la valeur illustrative « 1 h », mais NON interactive et « Bientôt ». */}
      <PendingRow
        icon="reglages"
        title={t(C.publishDelayTitle)}
        value={t(C.publishDelayValue)}
        conseq={t(C.publishDelayConseq)}
        soonLabel={t(C.soonPill)}
      />
      <Note>{t(C.publishDelaySoonNote)}</Note>

      {/* Notifications par catégorie (planche) : réglage RÉEL — route existante,
          poussée vers la section notifications des paramètres. Pas de bouton mort. */}
      <ListRow
        icon="alerte"
        label={t(C.notifByCategoryTitle)}
        chevron
        onPress={() => {
          haptics.light();
          router.push('/parametres/notifications');
        }}
      />

      <SectionLabel style={styles.kicker}>{t(C.secMesDonneesRgpd)}</SectionLabel>

      {/* Âge minimum (protection des mineurs) — même règle que l'age-gate de
          l'onboarding. Une ligne d'information, jamais une card. */}
      <View style={styles.ageRow}>
        <Icon name="info" size={iconSizes.sm} color={colors.gris} />
        <Text style={styles.ageText}>{t(C.ageMinimum)}</Text>
      </View>

      {sessionLoading ? (
        <Text style={styles.stateInline}>{t(C.deletionReading)}</Text>
      ) : !signedIn ? (
        /* ① PAS CONNECTÉ — on le dit AVANT le tap, et on ne peint aucun bouton
           qui échouerait. Sans backend, proposer une connexion serait un
           deuxième mensonge : le CTA n'apparaît que si elle est possible. */
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>{t(C.rgpdSignedOutTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.rgpdSignedOutBody)}</Text>
          {configured ? (
            <View style={styles.actionGap}>
              <Button
                variant="ghost"
                size="md"
                label={t(C.identitySignInLabel)}
                onPress={() => router.push('/sign-in')}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <>
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
              <Button
                variant="ghost"
                size="md"
                label={t(C.exporterMesDonnees)}
                icon="partage"
                onPress={() => void runDataExport()}
              />
            </View>
            <View style={styles.divider} />
            {/* Les deux lignes destructives qui n'ouvraient qu'une `Alert` sont
                remplacées par ce qu'elles auraient dû dire depuis le début. */}
            <Note>{t(C.partialDeleteAbsence)}</Note>
          </DisclosureCard>

          <SectionLabel style={styles.kicker}>{t(C.secSuppressionCompte)}</SectionLabel>

          {deletionRead === 'reading' ? (
            /* ④ LECTURE EN COURS — une ligne grise non tapable. Un chargement
               n'affirme RIEN : surtout pas « aucune suppression en cours ». */
            <Text style={styles.stateInline}>{t(C.deletionReading)}</Text>
          ) : deletionRead === 'failed' ? (
            /* ③ ÉCHEC — distinct du vide, avec sa copie et son « Réessayer ».
               La ligne « Supprimer mon compte » RESTE en dessous : ne pas
               pouvoir LIRE l'état d'un compte n'est pas une raison de retirer le
               droit de le supprimer (Guideline 5.1.1v), et la demande est
               idempotente côté serveur — re-demander ne repousse aucune
               échéance. On dit ce qu'on ignore, on ne confisque rien. */
            <>
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>{t(C.deletionUnknownTitle)}</Text>
                <Text style={styles.stateBody}>{t(C.deletionUnknownBody)}</Text>
                <View style={styles.actionGap}>
                  <Button
                    variant="ghost"
                    size="md"
                    label={t(C.deletionRetry)}
                    onPress={() => setReadTick((n) => n + 1)}
                  />
                </View>
              </View>
              <ListRow
                tone="danger"
                icon="fermer"
                label={t(C.supprimerMonCompte)}
                chevron
                onPress={() => {
                  haptics.medium();
                  setConfirmDelete(true);
                }}
              />
            </>
          ) : deletionStatus?.pending ? (
            /* Suppression DÉJÀ demandée : on n'en repropose pas une seconde. La
               date ne s'affiche que si le serveur en a donné une. */
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>{t(C.deletionPendingTitle)}</Text>
              {purgeDate !== null ? (
                <Text style={styles.stateBody}>
                  {t(C.deletionPendingBody, { date: purgeDate })}
                </Text>
              ) : null}
              <View style={styles.actionGap}>
                <Button
                  variant="ghost"
                  size="md"
                  label={t(C.deletionCancelCta)}
                  onPress={() => void runCancelDeletion()}
                  disabled={deleting}
                />
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.deleteIntro}>
                {t(C.deleteCardText, {
                  d: deletionStatus?.graceDays ?? ACCOUNT_DELETION_GRACE_DAYS,
                })}
              </Text>
              <ListRow
                tone="danger"
                icon="fermer"
                label={t(C.supprimerMonCompte)}
                chevron
                onPress={() => {
                  haptics.medium();
                  setConfirmDelete(true);
                }}
              />
            </>
          )}
        </>
      )}

      {/* Conditions (planche : « … · Conditions ») — lien légal RÉEL, hors
          session comprise (aucune donnée requise pour lire les CGU). */}
      <ListRow
        icon="info"
        label={t(C.conditionsRow)}
        chevron
        onPress={() => {
          haptics.light();
          router.push('/legal/cgu');
        }}
      />
    </StackScreen>
  );
}

/**
 * Bandeau de confiance en tête (planche E25) — protected-blue (`gameColors.verify`),
 * le seul bleu « info de confiance » de la charte, en wash discret + liseré. Texte
 * blanc lisible sur fond sombre. Purement informatif : aucune action, jamais de
 * chartreuse (réservée à l'action qui fait courir).
 */
function TrustBanner({ text }: { text: string }) {
  return (
    <View accessible accessibilityLabel={text} style={styles.banner}>
      <Icon name="verrou" size={iconSizes.md} color={gameColors.verify} />
      <Text style={styles.bannerText}>{text}</Text>
    </View>
  );
}

/**
 * Interrupteur EN ATTENTE : la COQUE fidèle d'un réglage que la planche montre
 * activable, mais dont l'effet suppose une visibilité croisée qui n'existe pas
 * encore (O1). On dessine le shell du toggle en position PROTECTRICE, dimmé et
 * NON interactif (ni `Pressable`, ni `onPress`), doublé d'une puce « Bientôt » :
 * impossible de le confondre avec un contrôle actif, et rien ne prétend gouverner
 * une exposition inexistante. La conséquence de jeu est écrite sous le titre.
 */
function PendingSwitchRow({
  title,
  conseq,
  soonLabel,
}: {
  title: string;
  conseq: string;
  soonLabel: string;
}) {
  return (
    <View accessible accessibilityLabel={`${title}. ${conseq} ${soonLabel}.`} style={styles.pendingRow}>
      <View style={styles.pendingText}>
        {/* Aucun `numberOfLines` : un réglage s'enroule, jamais coupé (§A.9). */}
        <Text style={styles.pendingTitle}>{title}</Text>
        <Text style={styles.pendingConseq}>{conseq}</Text>
      </View>
      <View style={styles.pendingRight}>
        <View style={styles.soonPill}>
          <Text style={styles.soonPillText}>{soonLabel}</Text>
        </View>
        {/* Shell dimmé, en position « on » (défaut protecteur de la planche). */}
        <View style={styles.switchShellDim}>
          <View style={styles.switchKnobDim} />
        </View>
      </View>
    </View>
  );
}

/**
 * Ligne EN ATTENTE avec valeur (planche fidèle) : icône + titre + valeur
 * illustrative + puce « Bientôt », et une conséquence de jeu optionnelle. NON
 * interactive — même raison que `PendingSwitchRow`.
 */
function PendingRow({
  icon,
  title,
  value,
  conseq,
  soonLabel,
}: {
  icon: IconName;
  title: string;
  value?: string;
  conseq?: string;
  soonLabel: string;
}) {
  const a11y = `${title}${value ? `, ${value}` : ''}${conseq ? `. ${conseq}` : ''} ${soonLabel}.`;
  return (
    <View accessible accessibilityLabel={a11y} style={styles.pendingRow}>
      <Icon name={icon} size={iconSizes.md} color={colors.gris} />
      <View style={styles.pendingText}>
        <Text style={styles.pendingTitle}>{title}</Text>
        {conseq ? <Text style={styles.pendingConseq}>{conseq}</Text> : null}
      </View>
      <View style={styles.pendingRight}>
        {value ? <Text style={styles.pendingValue}>{value}</Text> : null}
        <View style={styles.soonPill}>
          <Text style={styles.soonPillText}>{soonLabel}</Text>
        </View>
      </View>
    </View>
  );
}

/** Motifs de signalement — source unique : le store de modération partagé. */
function REASON_OPTS(t: (e: Entry) => string): { value: ReportReason; label: string }[] {
  return REPORT_REASONS.map((r) => ({ value: r.key, label: t(r.label) }));
}

/** Aide d'une ligne sous le motif choisi. */
function reasonHint(reason: ReportReason): Entry {
  const found = REPORT_REASONS.find((r) => r.key === reason);
  return found ? found.hint : REPORT_REASONS[0]!.hint;
}

/**
 * Écran de confirmation de suppression de compte (Guideline 5.1.1v). PLEIN ÉCRAN
 * = 1 écran / 1 décision : une seule action destructive, une seule sortie.
 * Palette d'alerte sobre, jamais de chartreuse (réservée à l'action qui fait
 * courir).
 */
function DeleteAccountConfirm({
  onCancel,
  onConfirm,
  busy,
  graceDays,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
  /** Délai de grâce annoncé — du SERVEUR quand il a répondu, sinon la constante
   *  partagée. Jamais un nombre écrit en dur dans la copie. */
  graceDays: number;
}) {
  const t = useT();
  useEffect(() => {
    screen('account_delete_confirm');
  }, []);
  return (
    <StackScreen title={t(C.supprimerMonCompte)} icon="alerte" subtitle={t(C.deleteConfirmSubtitle)}>
      <View style={styles.confirmBox}>
        <Icon name="alerte" size={iconSizes.lg} color={gameColors.danger} />
        <Text style={styles.confirmTitle}>{t(C.deleteConfirmTitle, { d: graceDays })}</Text>
        <Text style={styles.confirmBody}>{t(C.deleteConfirmBody, { d: graceDays })}</Text>
      </View>

      <View style={styles.confirmActions}>
        <Button variant="ghost" size="md" label={t(C.annulerGarder)} onPress={onCancel} disabled={busy} />
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

/** Rythme vertical des sur-titres — commun à tous les écrans de réglages. */
const KICKER_TOP = 24;
const KICKER_BOTTOM = 10;
/** Hauteur du bouton destructif : alignée sur `sizes.buttonLg` par le token. */
const CONFIRM_BTN_H = sizes.buttonLg;

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  kicker: { marginTop: KICKER_TOP, marginBottom: KICKER_BOTTOM },

  miniLabel: {
    ...typography.kicker,
    color: colors.gris,
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 2,
  },
  divider: { height: 1, backgroundColor: borderState.hairline, marginVertical: spacing.sm },
  actionGap: { gap: 10, marginTop: 12 },

  // ── Bandeau de confiance (protected-blue) ─────────────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: gameColors.verifySoft, // wash #4A8DFF @ 28 %
    borderWidth: 1,
    borderColor: gameColors.verify,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sm,
  },
  bannerText: {
    ...typography.body,
    flex: 1,
    color: colors.blanc,
    lineHeight: fontSizes.sm * 1.5,
  },

  // ── Réglages EN ATTENTE (coque fidèle, non interactive, « Bientôt ») ───────
  // Surface N1 comme les cards, pour lire comme un réglage — mais sans chevron
  // ni Pressable : rien ne suggère qu'un tap agit.
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: sizes.touchTarget,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding - 2,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    marginBottom: 10,
  },
  pendingText: { flex: 1 },
  pendingTitle: { ...typography.cardTitle, color: colors.blanc },
  pendingConseq: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 3,
  },
  pendingRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingValue: {
    ...typography.meta,
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontVariant: ['tabular-nums'],
  },
  soonPill: {
    borderWidth: 1,
    borderColor: borderState.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  soonPillText: {
    ...typography.meta,
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 0.5,
  },
  // Shell du toggle en attente : géométrie de `features/privacy/ui` (44×26/20),
  // en position « on », mais fondu à 40 % — il montre l'état protecteur par
  // défaut sans jamais se donner pour un contrôle qu'on peut basculer.
  switchShellDim: {
    width: 44,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse40,
    borderWidth: 1,
    borderColor: colors.chartreuse,
    padding: 2,
    justifyContent: 'center',
    opacity: 0.4,
  },
  switchKnobDim: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignSelf: 'flex-end',
  },

  // ── Card d'ÉTAT (pas connecté / échec) : surface N1 sans contour, titre blanc,
  // corps gris, AU PLUS un CTA — le patron des vingt écrans recalés. ──
  stateCard: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: spacing.xs,
    marginBottom: 10,
  },
  stateTitle: { ...typography.itemTitle, color: colors.blanc },
  stateBody: { ...typography.meta, color: colors.gris, lineHeight: fontSizes.xs * 1.6 },
  // Lecture EN COURS : une ligne grise non tapable, jamais un spinner plein écran.
  stateInline: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.6,
    paddingVertical: spacing.sm,
  },

  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: sizes.touchTarget,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: borderState.hairline,
  },
  blockedName: { ...typography.cardTitle, color: colors.blanc, flex: 1 },
  unblockBtn: { minHeight: sizes.touchTarget, justifyContent: 'center', paddingHorizontal: 10 },
  unblock: { ...typography.meta, color: colors.chartreuse, fontSize: fontSizes.sm },

  // Champ pseudo — 48 px, texte md (pas de zoom iOS à la saisie).
  pseudoInput: {
    height: sizes.buttonMd,
    borderWidth: 1,
    borderColor: borderState.hairline,
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    color: colors.blanc,
    fontSize: fontSizes.md,
    marginTop: 6,
  },

  ageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  ageText: { ...typography.meta, flex: 1, color: colors.gris, lineHeight: fontSizes.xs * 1.5 },

  // Explication AU-DESSUS de la ligne d'action (la ligne, elle, est une
  // `ListRow` tone danger) — pas de bouton bordé enfermé dans une card.
  deleteIntro: {
    ...typography.body,
    color: colors.gris,
    paddingHorizontal: 2,
    marginBottom: 12,
  },

  // ── Écran de confirmation plein écran ──
  confirmBox: {
    backgroundColor: elevation.surface,
    borderWidth: 1,
    borderColor: gameColors.danger, // contour d'ÉTAT (alerte) — assumé
    borderRadius: radii.card,
    padding: spacing.cardPadding,
    gap: 12,
    marginTop: 8,
  },
  confirmTitle: {
    ...typography.cardTitle,
    color: colors.blanc,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.35,
  },
  confirmBody: { ...typography.body, color: colors.gris, lineHeight: fontSizes.sm * 1.55 },
  confirmActions: { gap: spacing.sm, marginTop: spacing.lg },
  confirmDelete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: CONFIRM_BTN_H,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: gameColors.danger,
  },
  confirmDeleteText: { ...typography.button, color: gameColors.danger },
});
