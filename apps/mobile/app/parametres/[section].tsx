/**
 * GRYD — sous-page Paramètres (AMENDEMENT-17 §CHANTIER 3). Une route dynamique
 * = une sous-page COURTE et actionnable. Un écran = un sujet, action/essentiel
 * sans scroll. Les sous-pages MVP branchées : Compte, Profil, Crew, Course,
 * Notifications, Carte, À propos, Avancé. Course & Notifications pilotent le
 * store motivation (filtrage d'affichage/notifs, JAMAIS le gameplay §1). Les
 * réglages purement techniques (tolérance boucle…) vivent sous « Avancé » et
 * restent en lecture (moteur serveur, jamais un curseur client). Style dark GRYD,
 * texte court, honnête sur ce qui est « bientôt ».
 *
 * ─── IDENTITÉ ET CREW : RÉELS OU VIDES (21/07/2026) ───────────────────────────
 * L'identité affichée venait de `useMyProfile()`, dont la BASE est le persona
 * démo (`MY_SOCIAL_PROFILE` : « KORO », crew « LES FOULÉES 9³ »). Sans session,
 * cet écran — atteignable AUJOURD'HUI sur l'iPhone, il n'est derrière aucun flag
 * — affirmait donc à l'utilisateur qu'il s'appelait KORO et qu'il appartenait à
 * un crew qui n'existe pas. C'était la fuite la plus visible du périmètre.
 *
 * Désormais :
 *  · Identité — affichée UNIQUEMENT quand une session réelle existe. Sinon on dit
 *    « Non connecté », et l'action proposée dépend de ce qui est possible :
 *    se connecter (backend configuré) ou rien du tout (build sans backend, où
 *    proposer une connexion impossible serait un deuxième mensonge).
 *  · Crew — lu par `useRealCrew()` (RPC serveur), jamais la constante démo. Ses
 *    QUATRE états sont distingués, parce qu'ils n'appellent pas la même phrase :
 *    chargement · pas connecté · connecté sans crew · lecture ratée. Confondre
 *    les deux derniers, c'est dire « tu n'as pas de crew » à quelqu'un qui en a
 *    peut-être un — et l'inviter à en créer un doublon.
 *  · Avancé — les valeurs du moteur (24 h, 80 m, 400 m / 15 %) étaient écrites en
 *    dur ici et dans le catalogue i18n. Elles viennent maintenant de game-rules :
 *    un réglage de moteur qui bouge ne peut plus laisser l'écran mentir.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  colors,
  FINISHER_MIN_SEGMENT_M,
  FINISHER_MIN_SHARE,
  fontSizes,
  PARTIAL_BOUNDARY_TTL_H,
  PARTIAL_JOIN_TOLERANCE_M,
  PUSH_MAX_PER_DAY,
  PUSH_QUIET_HOURS_END,
  PUSH_QUIET_HOURS_START,
  radii,
  spacing,
} from '@klaim/shared';
import {
  NOTIF_CHANNEL_LABELS,
  PLAY_STYLE_LABELS,
} from '../../src/features/motivation/labels';
import {
  toggleNotifChannel,
  useMotivationPrefs,
  type NotifChannel,
} from '../../src/features/motivation/store';
import { SwitchRow, TogglePill } from '../../src/features/motivation/ui';
import { useDeviceNotifications } from '../../src/features/notifications/useDeviceNotifications';
import type { PushStatus } from '../../src/features/notifications/push';
import { SectionLabel } from '../../src/features/privacy/ui';
import { useRealCrew } from '../../src/features/crew/real';
import { SeasonStatus } from '../../src/features/season/SeasonStatus';
import { useMyProfile } from '../../src/features/social/profileStore';
import { C } from '../../src/i18n/catalog/reglages';
import { t as tStatic, useT } from '../../src/i18n/store';
import { flags } from '../../src/lib/flags';
import { useSession } from '../../src/lib/session';
import { screen } from '../../src/lib/analytics';
import { getHapticsEnabled, setHapticsEnabled } from '../../src/lib/haptics';
import {
  settingsRowBySection,
  type SettingsSectionId,
} from '../../src/features/settings/sections';
import { Button } from '../../src/ui/Button';
import { ListRow } from '../../src/ui/ListRow';
import { StackScreen } from '../../src/ui/StackScreen';

const SECTION_IDS: readonly SettingsSectionId[] = [
  'compte',
  'profil',
  'crew',
  'course',
  'notifications',
  'carte',
  'apropos',
  'avance',
];

const APP_VERSION = '0.1.0';
const NOTIF_ORDER: NotifChannel[] = ['solo', 'crew', 'competition', 'off'];

/**
 * Un texte par diagnostic (features/notifications/push.ts). L'écran ne dit
 * jamais « activé » quand il ne l'est pas, et explique toujours l'obstacle.
 */
const PUSH_STATUS_TEXT: Readonly<Record<PushStatus, (typeof C)['pushIdle']>> = {
  idle: C.pushIdle,
  registered: C.pushRegistered,
  unsupported: C.pushUnsupported,
  module_missing: C.pushUnavailable,
  // Deux causes distinctes, deux textes : « version de l'app » serait FAUX ici
  // (c'est la configuration serveur qui manque, pas le build du joueur).
  unavailable: C.pushNoCredentials,
  permission_denied: C.pushDenied,
  not_configured: C.pushNotConfigured,
  error: C.pushError,
};

/** Accusé de réception honnête pour un flux pas encore câblé (O1) — le bouton
 *  répond au tap au lieu de rester muet, en cohérence avec la note « bientôt ». */
function soonAlert(title: string, body: string): void {
  Alert.alert(title, body, [{ text: tStatic(C.compris) }]);
}

function isSection(x: string | undefined): x is SettingsSectionId {
  return x !== undefined && (SECTION_IDS as readonly string[]).includes(x);
}

/**
 * Section titrée — sur-titre COMMUN aux écrans de réglages (features/privacy/ui,
 * la même source que Confidentialité et Support). Remplace le `Section` du
 * module motivation, dont l'espacement différait de quelques pixels : trois
 * rythmes verticaux pour un même type d'écran, c'est ce qui donnait
 * l'impression de trois maquettes distinctes.
 */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </View>
  );
}

/**
 * Les lignes de réglage (action neutre, action destructive, valeur en lecture)
 * ne sont plus réimplémentées ici : elles passent toutes par la primitive
 * partagée `ListRow` (src/ui/ListRow) — même hauteur, même marge, même trailing,
 * même cible tactile que Confidentialité et À propos. C'est cette primitive qui
 * résout le « pourquoi ce n'est pas le même UI ».
 *   · action / navigation → `icon` + `label` (+ `sublabel`) + `chevron` + `onPress`
 *   · action destructive  → idem + `tone="danger"`
 *   · valeur en lecture    → `label` + `value` (ni `icon` ni `onPress`)
 */

/** Petite note honnête « bientôt » quand un flux n'est pas encore câblé. */
function Soon({ children }: { children: string }) {
  return <Text style={styles.soon}>{children}</Text>;
}

/**
 * ÉTAT VIDE — ce qu'il n'y a pas encore, et AU PLUS une action pour avancer
 * (§A : 1 CTA chartreuse max). Sans `cta`, c'est une simple explication : il y a
 * des vides sur lesquels le joueur ne peut rien, et lui donner un faux bouton
 * serait aussi malhonnête que d'inventer la donnée manquante.
 *
 * Une seule card, jamais imbriquée dans une autre (§A « pas de card-in-card ») :
 * elle REMPLACE la ligne qu'elle explique, elle ne s'ajoute pas autour.
 */
function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { label: string; onPress: () => void; loading?: boolean };
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {cta ? (
        <View style={styles.emptyCta}>
          <Button label={cta.label} onPress={cta.onPress} loading={cta.loading === true} />
        </View>
      ) : null}
    </View>
  );
}

export default function SettingsSectionScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const raw = Array.isArray(params.section) ? params.section[0] : params.section;
  const id: SettingsSectionId = isSection(raw) ? raw : 'compte';
  const meta = settingsRowBySection(id);
  const t = useT();

  const { prefs, update } = useMotivationPrefs();
  // Identité ÉDITABLE persistée (même source que Profil / profil-edit) : une
  // édition du nom/titre se reflète ici immédiatement — une seule vérité.
  // `profile` est le rendu FINAL (replis compris) ; `editable` est ce que le
  // joueur a RÉELLEMENT saisi. La distinction est le cœur du correctif ci-dessous.
  const { profile, editable } = useMyProfile();
  // Une session RÉELLE, ou rien.
  const { session, configured, loading: sessionLoading } = useSession();
  const signedIn = configured && session !== null;
  /**
   * UN CHARGEMENT N'EST PAS UN ÉTAT VIDE. Au démarrage, `useSession()` met un
   * instant à restaurer la session : pendant cette fenêtre `session === null`
   * SANS que cela signifie « pas de compte ». Les deux blocs ci-dessous
   * affirmaient donc « Non connecté » + « Se connecter » à quelqu'un qui EST
   * connecté, avant de se corriger tout seuls — un mensonge bref, mais un
   * mensonge, et le genre qui pousse à taper sur un bouton inutile.
   *
   * Tant qu'on ne sait pas, on n'affirme rien : on le dit.
   */
  const identityUnknown = sessionLoading;
  /**
   * ─── LE GARDE-FOU D'IDENTITÉ ────────────────────────────────────────────────
   *
   * Il s'écrivait `identityValue(stored, base, shown)` avec
   * `own = isShowcasePlatform || stored !== base` puis `if (own || signedIn)`.
   * C'était un NO-OP : la branche « rien de vrai à montrer » était pratiquement
   * inatteignable, et quand elle l'était elle disait la mauvaise chose.
   *
   *  · `shown` (= `profile.*`) n'est JAMAIS le brut : `useMyProfile()` refuse
   *    de laisser un nom blanc à l'écran et retombe sur l'identité de session,
   *    sinon sur un neutre traduit (« Coureur »). Le garde recevait donc une
   *    valeur déjà remplie et n'avait plus rien à garder.
   *  · `signedIn ||` court-circuitait le reste dès qu'une session existait —
   *    alors qu'une session ne rend pas un TITRE vrai : RIEN ne dérive le titre
   *    du compte.
   *  · Symétriquement, la sortie `identityNone` (« Non connecté ») s'appliquait
   *    aussi au titre. Elle y ment sur la CAUSE : un titre vide n'a rien à voir
   *    avec la connexion, et laisser croire que se connecter le remplirait
   *    envoie le joueur dans un couloir sans porte.
   *
   * Les deux champs n'ont pas la même nature, ils ne peuvent pas partager un
   * garde unique :
   *  · NOM — peut venir de trois endroits, dans cet ordre : ce que le joueur a
   *    saisi ; à défaut le compte (nom du profil OAuth, préfixe e-mail) ; sinon
   *    RIEN. Le repli neutre « Coureur » n'est pas une identité : il ne doit
   *    jamais être présenté comme la sienne, la ligne l'annonce alors comme
   *    manquante (et le bloc Identifiants, lui, propose de se connecter).
   *  · TITRE — purement local, dérivé de rien. Saisi, ou la ligne n'existe pas.
   *
   * On lit `editable` (ce qui est PERSISTÉ, avant tout repli) et non `profile`
   * (le rendu final) : c'est la seule façon de distinguer « saisi » de « rempli
   * pour l'affichage ».
   */
  const storedName = editable.displayName.trim();
  const sessionName = signedIn ? profile.displayName.trim() : '';
  const displayNameShown = storedName.length > 0 ? storedName : sessionName.length > 0 ? sessionName : null;
  const storedTitle = editable.title.trim();
  const titleShown = storedTitle.length > 0 ? storedTitle : null;
  // Crew RÉEL (RPC serveur), jamais `profile.crewName` (constante démo).
  const {
    crew: realCrew,
    ready: crewReady,
    loading: crewLoading,
    loadFailed: crewLoadFailed,
    reload: reloadCrew,
  } = useRealCrew();
  const [hapticsOn, setHapticsOn] = useState(true);
  // État RÉEL du push sur ce téléphone + propagation des canaux au serveur
  // (un job serveur ne peut respecter que les préférences qu'il connaît).
  const {
    status: pushStatus,
    busy: pushBusy,
    enable: pushEnable,
    disable: pushDisable,
  } = useDeviceNotifications(prefs.notifChannels);

  useEffect(() => {
    screen('parametres_section', { section: id });
  }, [id]);

  useEffect(() => {
    let alive = true;
    void getHapticsEnabled().then((v) => {
      if (alive) setHapticsOn(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <StackScreen title={meta?.label ?? t(C.paramsTitle)} icon={meta?.icon ?? 'reglages'}>
      {id === 'compte' ? (
        <>
          <Section label={t(C.secIdentifiants)}>
            {/* Le nom n'est affirmé que s'il vient d'une session réelle. Les
                deux « non connecté » ne se valent pas : avec un backend, se
                connecter est une action ; sans backend, c'est impossible — on
                l'explique au lieu d'offrir un bouton qui ne mène nulle part. */}
            {identityUnknown ? (
              /* Session en cours de restauration : on ne sait pas encore. Aucune
                 ligne plutôt qu'une affirmation — la section garde ses autres
                 rangées, donc jamais d'écran blanc, et la ligne apparaît dès
                 qu'on sait. (Pas de « Chargement… » ici : ajouter une copie
                 traduite dans le catalogue partagé sort de ce lot.) */
              null
            ) : signedIn ? (
              <ListRow label={t(C.connectedAs)} value={profile.displayName} />
            ) : configured ? (
              <ListRow
                icon="ami"
                label={t(C.identitySignInLabel)}
                sublabel={t(C.identitySignInDetail)}
                chevron
                onPress={() => router.push('/sign-in')}
              />
            ) : (
              <>
                <ListRow label={t(C.connectedAs)} value={t(C.identityNone)} />
                <Text style={styles.note}>{t(C.identityNoBackend)}</Text>
              </>
            )}
            <ListRow
              icon="lien"
              label={t(C.emailLabel)}
              sublabel={t(C.emailDetail)}
              chevron
              onPress={() => soonAlert(t(C.emailLabel), t(C.emailSoonBody))}
            />
            <ListRow
              icon="verrou"
              label={t(C.securityLabel)}
              sublabel={t(C.securityDetail)}
              chevron
              onPress={() => soonAlert(t(C.securityLabel), t(C.securitySoonBody))}
            />
            <Soon>{t(C.accountSoonNote)}</Soon>
          </Section>
          <Section label={t(C.secCompte)}>
            <ListRow
              icon="partage"
              label={t(C.exporterMesDonnees)}
              sublabel={t(C.exportDataDetail)}
              chevron
              onPress={() => router.push('/confidentialite')}
            />
            <ListRow
              icon="fermer"
              label={t(C.supprimerMonCompte)}
              sublabel={t(C.deleteAccountDetail)}
              tone="danger"
              chevron
              onPress={() => router.push('/confidentialite')}
            />
          </Section>
        </>
      ) : null}

      {id === 'profil' ? (
        <Section label={t(C.secApparence)}>
          {/* Chaque ligne n'apparaît que si elle a quelque chose de VRAI à dire
              (cf. `identityValue`). Le nom survit toujours — session ou « Non
              connecté » ; le titre, lui, s'efface tant que personne ne l'a
              écrit : « Modifier le profil » juste en dessous est le chemin pour
              le renseigner, et il ne disparaît jamais. */}
          {displayNameShown !== null ? (
            <ListRow label={t(C.displayName)} value={displayNameShown} />
          ) : null}
          {titleShown !== null ? (
            <ListRow label={t(C.titleLabel)} value={titleShown} />
          ) : null}
          <ListRow
            icon="ami"
            label={t(C.editProfile)}
            sublabel={t(C.editProfileDetail)}
            chevron
            onPress={() => router.push('/profil-edit')}
          />
          <ListRow
            icon="verrou"
            label={t(C.whoSeesProfile)}
            sublabel={t(C.whoSeesProfileDetail)}
            chevron
            onPress={() => router.push('/confidentialite')}
          />
        </Section>
      ) : null}

      {id === 'crew' ? (
        <Section label={t(C.secMonCrew)}>
          {/* ── Le crew est LU, jamais supposé. Quatre états, quatre phrases. ──
              L'ORDRE EST LA LOGIQUE, et il avait été inversé : « chargement »
              passait AVANT « échec ». Or `useRealCrew` garde volontairement
              `loadFailed` à true pendant une nouvelle tentative (cf. son
              commentaire : « on garde l'écran d'échec, avec le bouton en cours
              de chargement, jusqu'à ce qu'on sache vraiment »). En testant
              `crewLoading` d'abord, chaque tap sur « Réessayer » effaçait donc
              la carte d'échec ET son bouton, les remplaçait par un « Lecture de
              ton crew… » gris, puis les faisait réapparaître à l'échec suivant :
              exactement le clignotement que le hook avait été modifié pour
              empêcher — et plus aucun moyen de réessayer une 2ᵉ fois sans
              attendre.

              Le bon ordre va du fait le plus établi au plus incertain — et il
              lui manquait sa première marche : la SESSION elle-même. Au
              démarrage, `useSession()` n'a pas fini de restaurer le compte, donc
              `crewReady` (qui exige une session) vaut false ; l'écran affirmait
              alors « Non connecté · connecte-toi pour voir ton crew » à un
              joueur connecté. Pire, cette branche captait le rendu AVANT
              `crewLoadFailed` : au retour d'arrière-plan, l'état d'échec — et
              son bouton « Réessayer », la seule action utile — était remplacé
              par une invitation à se connecter le temps de l'hydratation.

                0. session pas encore restaurée → on ne sait RIEN, on le dit ;
                1. pas de session / pas de backend → rien à lire, on invite ;
                2. on a déjà échoué             → on le dit, on propose de relire
                                                  (le bouton porte le chargement) ;
                3. 1re lecture en vol           → on le dit une seule fois ;
                4. lu, aucun crew               → on l'affirme, enfin ;
                5. lu, un crew                  → son vrai nom. */}
          {identityUnknown ? (
            <Text style={styles.note}>{t(C.crewLoading)}</Text>
          ) : !crewReady ? (
            <EmptyState
              title={t(C.identityNone)}
              body={t(C.crewSignedOutBody)}
              {...(configured
                ? { cta: { label: t(C.identitySignInLabel), onPress: () => router.push('/sign-in') } }
                : {})}
            />
          ) : crewLoadFailed ? (
            /* On NE SAIT PAS s'il a un crew : ni « tu n'en as pas » (faux s'il
               en a un), ni un nom inventé. On le dit, et on propose de relire —
               la seule action qui ne présume rien. Pendant la relecture, la
               carte RESTE : seul le bouton passe en chargement. */
            <EmptyState
              title={t(C.crewLoadFailedTitle)}
              body={t(C.crewLoadFailedBody)}
              cta={{ label: t(C.crewRetry), onPress: reloadCrew, loading: crewLoading }}
            />
          ) : crewLoading && realCrew === null ? (
            <Text style={styles.note}>{t(C.crewLoading)}</Text>
          ) : realCrew === null ? (
            <EmptyState
              title={t(C.crewNoneTitle)}
              body={t(C.crewNoneBody)}
              cta={{ label: t(C.crewNoneCta), onPress: () => router.push('/crew') }}
            />
          ) : (
            <ListRow label="Crew" value={realCrew.name} />
          )}

          {/* Les réglages de crew ne s'affichent QUE s'il y a un crew : proposer
              « notifications crew » ou « quitter le crew » à quelqu'un qui n'en a
              pas, c'est lui laisser croire qu'il en a un. */}
          {realCrew !== null ? (
            <>
              {/* D8 : War Room masquée hors MVP. */}
              {flags.warRoom ? (
                <ListRow
                  icon="guerre"
                  label={t(C.crewMissions)}
                  sublabel={t(C.crewMissionsDetail)}
                  chevron
                  onPress={() => router.push('/warroom')}
                />
              ) : null}
              <ListRow
                icon="cloche"
                label={t(C.crewNotifs)}
                sublabel={t(C.crewNotifsDetail)}
                chevron
                onPress={() => router.push('/parametres/notifications')}
              />
              {/* « Bientôt » était FAUX : `leave_crew` est câblée et le flux
                  complet (confirmation incluse) vit dans l'écran Crew. On y
                  emmène au lieu d'annoncer une indisponibilité inexistante. */}
              <ListRow
                icon="fermer"
                label={t(C.leaveCrew)}
                sublabel={t(C.leaveCrewDetailReal)}
                tone="danger"
                chevron
                onPress={() => router.push('/crew')}
              />
            </>
          ) : null}
        </Section>
      ) : null}

      {id === 'course' ? (
        <>
          <Section label={t(C.secStyleJeu)}>
            <Text style={styles.note}>{t(PLAY_STYLE_LABELS[prefs.playStyle].subtitle)}</Text>
            <ListRow
              icon="cible"
              label={t(C.setStyle)}
              sublabel={t(C.setStyleDetail)}
              chevron
              onPress={() => router.push('/settings-motivation')}
            />
          </Section>
          <Section label={t(C.secPendantCourse)}>
            <SwitchRow
              title={t(C.hapticsTitle)}
              subtitle={t(C.hapticsSubtitle)}
              value={hapticsOn}
              onValueChange={(v) => {
                setHapticsOn(v);
                setHapticsEnabled(v);
              }}
            />
            <ListRow label={t(C.unites)} value={t(C.kilometres)} />
            <ListRow label={t(C.annoncesAudio)} value={t(C.bientot)} />
          </Section>
        </>
      ) : null}

      {id === 'notifications' ? (
        <Section label={t(C.secCeQueTuRecois)}>
          <View style={styles.pills}>
            {NOTIF_ORDER.map((ch) => (
              <TogglePill
                key={ch}
                label={t(NOTIF_CHANNEL_LABELS[ch].title)}
                on={prefs.notifChannels.includes(ch)}
                onPress={() =>
                  void update({ notifChannels: toggleNotifChannel(prefs.notifChannels, ch) })
                }
              />
            ))}
          </View>
          <Text style={styles.note}>
            {prefs.notifChannels.includes('off')
              ? t(NOTIF_CHANNEL_LABELS.off.subtitle)
              : t(C.notifsNote)}
          </Text>
          {/* Choisir SES canaux ne sert à rien si l'appareil n'est enregistré
              nulle part : cette ligne dit l'état RÉEL du téléphone, et son
              détail change avec le diagnostic (jamais un « Activer » muet). */}
          {!prefs.notifChannels.includes('off') ? (
            <ListRow
              icon="cloche"
              label={t(C.pushDeviceLabel)}
              sublabel={pushBusy ? t(C.pushBusy) : t(PUSH_STATUS_TEXT[pushStatus])}
              chevron
              onPress={() => {
                if (pushStatus === 'registered') pushDisable();
                // Refus système : seul le joueur peut revenir dessus, dans les
                // réglages du téléphone — redemander ne rouvrirait rien.
                else if (pushStatus === 'permission_denied') void Linking.openSettings();
                else pushEnable();
              }}
            />
          ) : null}
          <Text style={styles.note}>
            {t(C.pushQuietNote, {
              start: PUSH_QUIET_HOURS_START,
              end: PUSH_QUIET_HOURS_END,
              max: PUSH_MAX_PER_DAY,
            })}
          </Text>
        </Section>
      ) : null}

      {id === 'carte' ? (
        <Section label={t(C.secAffichageCarte)}>
          <ListRow label={t(C.coucheDefaut)} value={t(C.coucheAuto)} />
          <Text style={styles.note}>{t(C.carteNote)}</Text>
          <ListRow
            icon="verrou"
            label={t(C.maTrace)}
            sublabel={t(C.maTraceDetail)}
            chevron
            onPress={() => router.push('/confidentialite')}
          />
        </Section>
      ) : null}

      {id === 'apropos' ? (
        <>
          <Section label="GRYD">
            <ListRow label={t(C.version)} value={APP_VERSION} />
            {/* La ligne figée « Saison 0 · Paris + Lille » (C.saison/C.saisonValue)
                affirmait une saison sans jamais la lire : remplacée par le vrai
                statut serveur, qui distingue active / aucune / échec / chargement
                et n'invente jamais de date de fin. */}
            <SeasonStatus />
          </Section>
          {/* Chaque ligne légale ouvre son VRAI document DANS l'app (routes
              /legal/* + /a-propos), jamais un domaine public inexistant
              (fini `openLegal` → gryd.run/*, arbitrage O10 non tranché) ni le
              renvoi de « Politique de confidentialité » vers l'écran de RÉGLAGES
              (/confidentialite) au lieu du texte de la politique
              (/legal/confidentialite). LCEN : ces pages sont donc toujours
              accessibles, sans réseau ni hébergement. */}
          <Section label={t(C.secLegal)}>
            <ListRow
              icon="pass"
              label={t(C.cgu)}
              chevron
              onPress={() => router.push('/legal/cgu')}
            />
            <ListRow
              icon="verrou"
              label={t(C.privacyPolicy)}
              chevron
              onPress={() => router.push('/legal/confidentialite')}
            />
            <ListRow
              icon="pass"
              label={t(C.cgv)}
              sublabel={t(C.cgvDetail)}
              chevron
              onPress={() => router.push('/legal/cgv')}
            />
            <ListRow
              icon="pass"
              label={t(C.mentions)}
              sublabel={t(C.mentionsDetail)}
              chevron
              onPress={() => router.push('/a-propos')}
            />
            <ListRow
              icon="crest"
              label={t(C.licences)}
              chevron
              onPress={() => router.push('/legal/licences')}
            />
            <Soon>{t(C.tagline)}</Soon>
          </Section>
        </>
      ) : null}

      {id === 'avance' ? (
        <>
          <Section label={t(C.secReglesJeu)}>
            <Text style={styles.note}>{t(C.reglesNote)}</Text>
            {/* « Affichées ici pour transparence » n'a de valeur que si ce sont
                les VRAIES constantes : ces trois lignes étaient écrites en dur
                (ici et dans le catalogue i18n), donc un changement de moteur les
                aurait laissées mentir en silence. Elles viennent de game-rules. */}
            <ListRow
              label={t(C.fermetureFrontiere)}
              value={t(C.valueHours, { n: PARTIAL_BOUNDARY_TTL_H })}
            />
            <ListRow
              label={t(C.toleranceJonction)}
              value={t(C.valueMeters, { n: PARTIAL_JOIN_TOLERANCE_M })}
            />
            <ListRow
              label={t(C.contributionMin)}
              value={t(C.contributionMinBoth, {
                m: FINISHER_MIN_SEGMENT_M,
                pct: Math.round(FINISHER_MIN_SHARE * 100),
              })}
            />
          </Section>
          <Section label={t(C.secDiagnostics)}>
            <ListRow
              icon="radar"
              label={t(C.fiabiliteVerify)}
              sublabel={t(C.fiabiliteVerifyDetail)}
              chevron
              onPress={() => router.push('/sources')}
            />
            <ListRow label="Build" value={APP_VERSION} />
          </Section>
        </>
      ) : null}
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  note: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginBottom: 4,
  },
  soon: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.xxs },
  // ── État vide : MÊME surface que `ListRow` (carbone, radii.card, sans contour,
  // séparée par l'espace — règle 80/20). Un vide n'est pas un écran à part, c'est
  // la ligne qui manque : elle garde exactement la place et la géométrie d'une
  // ligne de réglage. ──
  empty: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    paddingVertical: 16,
    paddingHorizontal: spacing.cardPadding - 2,
    marginBottom: 10,
  },
  emptyTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  emptyBody: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xxs,
  },
  emptyCta: { marginTop: spacing.sm },
});
