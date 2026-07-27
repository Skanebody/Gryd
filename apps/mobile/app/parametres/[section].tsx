/**
 * GRYD — sous-page Paramètres (AMENDEMENT-17 §CHANTIER 3). Une route dynamique
 * = une sous-page COURTE et actionnable. Un écran = un sujet, action/essentiel
 * sans scroll. Les sous-pages MVP branchées : Compte, Profil, Crew, Course,
 * Notifications, Carte, À propos, Avancé. Course pilote le store motivation
 * (filtrage d'affichage, JAMAIS le gameplay §1) ; Notifications pilote son
 * propre magasin (E71, `features/notifications/notifPrefs.ts`), distinct.  Les
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
 *
 * ─── ORDRE DE COMPOSITION (Vague 1) ───────────────────────────────────────────
 *   1. `StackScreen` : retour + KICKER « RÉGLAGES » + titre = libellé de la ligne
 *      d'origine, TRADUIT (il était rendu tel quel depuis un catalogue français) ;
 *   2. une à deux sections, chacune ouverte par le `SectionLabel` canonique ;
 *   3. des `ListRow` (action, navigation, valeur en lecture) et, pour ce qui n'a
 *      rien à afficher, un `EmptyState` qui REMPLACE la ligne au lieu de s'y
 *      ajouter.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ─────────────────────────────────────────
 * · « E-mail » et « Sécurité » (Compte). Deux lignes à chevron qui n'ouvraient
 *   qu'une `Alert` « arrive très bientôt » : elles échouaient à 100 % des taps,
 *   sur toutes les plateformes. Leur absence est maintenant NOMMÉE en gris —
 *   et l'une d'elles renvoyait vers Aide & support, qui n'a aucun canal : la
 *   boucle est fermée par la suppression, pas par un autre renvoi.
 * · Les TROIS copies « bientôt disponible » sans date ni code. « Bientôt » n'est
 *   pas un état ; ne pas savoir en est un, et il se dit.
 * · « Annonces audio · Bientôt » (Course) : un réglage qui n'existe pas.
 * · « Couche par défaut · Auto » (Carte) : une valeur en lecture qui faisait
 *   croire à un réglage. Il ne restait qu'à lire la note qui l'explique.
 * · « Build » (Avancé) : EXACTEMENT la même chaîne que « Version » (À propos),
 *   sous un autre nom, dans une autre sous-page. Deux noms pour une valeur, ce
 *   n'est pas de la transparence, c'est une distinction fabriquée.
 * · Le `Soon` (italique gris, réservé au « pas encore disponible ») autour de la
 *   baseline produit : la baseline n'est pas une indisponibilité.
 * · L'`EmptyState` local n'a pas été retiré mais son titre passe par le rôle
 *   `typography.itemTitle` (il recodait famille + graisse à la main).
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ──────────────────────────────────────────────
 * · Sous-page Compte : toujours aucune gestion d'IDENTITÉ (changer l'e-mail,
 *   délier Apple / Google) — il n'existe ni RPC ni écran pour ça. En revanche,
 *   depuis le 27/07/2026, la section APPAREILS (E78) existe, et elle tient
 *   exactement ce que Supabase Auth permet, ni plus ni moins :
 *     · PAS de liste d'appareils — le client ne peut lire QUE la session de ce
 *       téléphone. Une liste serait entièrement fabriquée ; l'écran nomme donc
 *       l'absence (`otherDevicesNoListNote`) au lieu de la simuler ;
 *     · UNE action réelle — `signOut({ scope: 'others' })` révoque côté serveur
 *       toutes les autres sessions sans toucher celle-ci (`lib/auth.ts`).
 *   L'état de la ligne est dérivé par `features/account/otherDevices.ts` (pur,
 *   testé) : `unknown` / `noBackend` / `signedOut` ne peignent aucun `onPress`.
 * · Sous-page Notifications (E71, `docs/product/GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md`
 *   §13) : la spec liste CINQ catégories (défense/crew/rivalité/progression/
 *   produit). L'audit de ce chantier n'a trouvé que DEUX push RÉELS derrière
 *   elles — décay (défense, canal `solo`) et vol de territoire (rivalité,
 *   canal `competition`), cf. `features/notifications/notifPrefs.ts`. Les
 *   trois autres n'ont AUCUN job serveur : elles restent NOMMÉES (absence
 *   assumée) plutôt que peintes en interrupteur qui ne gouvernerait rien.
 *   Les catégories restent choisissables hors session (elles sont locales)
 *   mais l'écran DIT que rien ne partira — l'enregistrement de l'appareil
 *   exige une session (`features/notifications/push.ts` renvoie
 *   `not_configured` sans session).
 * · Sous-page Carte : aucun réglage. Raison technique : le choix de couche est
 *   dérivé du contexte par la carte elle-même (`features/map`), il n'existe
 *   aucune préférence persistée à écrire.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import {
  colors,
  EVENTS,
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
  typography,
} from '@klaim/shared';
import {
  otherDevicesActionable,
  otherDevicesState,
} from '../../src/features/account/otherDevices';
import { signOutOtherDevices } from '../../src/lib/auth';
import { PLAY_STYLE_LABELS } from '../../src/features/motivation/labels';
import { useMotivationPrefs } from '../../src/features/motivation/store';
import { SwitchRow } from '../../src/features/motivation/ui';
import { useDeviceNotifications } from '../../src/features/notifications/useDeviceNotifications';
import { notifPrefsToChannels } from '../../src/features/notifications/notifPrefs';
import { useNotificationPrefs } from '../../src/features/notifications/notifPrefsStore';
import type { PushStatus } from '../../src/features/notifications/push';
import { pushActionable } from '../../src/features/notifications/pushActionable';
import { SectionLabel } from '../../src/ui/SectionLabel';
import { useRealCrew } from '../../src/features/crew/real';
import { SeasonStatus } from '../../src/features/season/SeasonStatus';
import { useMyProfile } from '../../src/features/social/profileStore';
import { C as CityC } from '../../src/i18n/catalog/city';
import { C } from '../../src/i18n/catalog/reglages';
import { useT } from '../../src/i18n/store';
import { flags } from '../../src/lib/flags';
import { useSession } from '../../src/lib/session';
import { screen, track } from '../../src/lib/analytics';
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

// Version LUE depuis app.json (source unique), jamais un doublon en dur.
const APP_VERSION: string = Constants.expoConfig?.version ?? '0.0.0';

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

function isSection(x: string | undefined): x is SettingsSectionId {
  return x !== undefined && (SECTION_IDS as readonly string[]).includes(x);
}

/**
 * Section titrée — sur-titre canonique (`src/ui/SectionLabel`, la même source
 * que les vingt écrans recalés). Le rythme vertical appartient à la PAGE, il est
 * posé ici une seule fois : trois espacements différents pour un même type
 * d'écran, c'est ce qui donnait l'impression de trois maquettes distinctes.
 */
function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <SectionLabel style={styles.kicker}>{label}</SectionLabel>
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

/**
 * Note grise d'ABSENCE : « ce que GRYD ne fait pas, et qu'on ne promet pas ».
 * Elle a remplacé le `Soon` italique, dont la promesse implicite (« ça arrive »)
 * était portée par un style, donc invérifiable. Une absence se constate ; elle
 * ne se date pas tant que le code ne la referme pas.
 */
function Absence({ children }: { children: string }) {
  return <Text style={styles.absence}>{children}</Text>;
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
  /**
   * `variant` par défaut `primary` (chartreuse) : c'est le cas d'un vide qu'on
   * peut REMPLIR (se connecter, rejoindre un crew). Un « Réessayer » d'échec de
   * lecture descend d'un cran en `ghost` : l'accent ne se dépense pas sur une
   * reprise après panne, il se garde pour l'action qui fait avancer le joueur.
   */
  cta?: { label: string; onPress: () => void; loading?: boolean; variant?: 'primary' | 'ghost' };
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {cta ? (
        <View style={styles.emptyCta}>
          <Button
            label={cta.label}
            variant={cta.variant ?? 'primary'}
            onPress={cta.onPress}
            loading={cta.loading === true}
          />
        </View>
      ) : null}
    </View>
  );
}

/**
 * SLUG INCONNU — un état à part entière, pas un repli silencieux. `/parametres/xyz`
 * affichait la sous-page Compte sans jamais dire que la section demandée
 * n'existait pas : le joueur croyait avoir ouvert autre chose. On le dit, et on
 * donne la seule sortie utile.
 */
function UnknownSection() {
  const t = useT();
  useEffect(() => {
    screen('parametres_section', { section: 'unknown' });
  }, []);
  return (
    <StackScreen title={t(C.paramsTitle)} icon="reglages" kicker={t(C.paramsKicker)}>
      <EmptyState
        title={t(C.sectionUnknownTitle)}
        body={t(C.sectionUnknownBody)}
        cta={{ label: t(C.sectionUnknownCta), onPress: () => router.replace('/parametres') }}
      />
    </StackScreen>
  );
}

export default function SettingsSectionScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const raw = Array.isArray(params.section) ? params.section[0] : params.section;
  if (!isSection(raw)) return <UnknownSection />;
  return <KnownSection id={raw} />;
}

function KnownSection({ id }: { id: SettingsSectionId }) {
  const meta = settingsRowBySection(id);
  const t = useT();

  const { prefs } = useMotivationPrefs();
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
  /**
   * E78 — révocation des AUTRES sessions. Deux bribes d'état seulement (en vol /
   * issue de la dernière tentative) : tout le reste est DÉRIVÉ par un module pur
   * et testé (`features/account/otherDevices.ts`), pour que la règle « ne peins
   * jamais une action qui échouerait » ne dépende pas d'une condition écrite à
   * la main dans le JSX.
   */
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeResult, setRevokeResult] = useState<'none' | 'ok' | 'error'>('none');
  const otherDevices = otherDevicesState({
    sessionLoading,
    configured,
    signedIn,
    busy: revokeBusy,
    lastResult: revokeResult,
  });
  const revokeOtherDevices = () => {
    if (revokeBusy) return;
    setRevokeBusy(true);
    // L'issue est lue du serveur, jamais supposée : un échec reste un échec à
    // l'écran (`otherDevicesFailed`), il ne se transforme pas en silence.
    void signOutOtherDevices()
      .then((result) => setRevokeResult(result.ok ? 'ok' : 'error'))
      .catch(() => setRevokeResult('error'))
      .finally(() => setRevokeBusy(false));
  };
  // Réglages de notifications E71 (5 catégories) — cf. `notifPrefs.ts` pour ce
  // qui est réellement câblé derrière chacune.
  const { prefs: notifPrefs, update: updateNotifPrefs } = useNotificationPrefs();
  // État RÉEL du push sur ce téléphone + propagation des canaux au serveur
  // (un job serveur ne peut respecter que les préférences qu'il connaît).
  // Seules défense/rivalité produisent un canal RÉEL (`notifPrefsToChannels`) :
  // crew/progression/produit n'ont encore aucun push serveur à propager.
  const {
    status: pushStatus,
    busy: pushBusy,
    enable: pushEnable,
    disable: pushDisable,
  } = useDeviceNotifications(notifPrefsToChannels(notifPrefs));

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
    <StackScreen
      /* Le titre était `meta?.label` — une chaîne FRANÇAISE rendue telle quelle :
         les huit sous-pages gardaient leur titre français dans les cinq langues.
         `label` est maintenant une `Entry`, donc traduite. Kicker (règle 2). */
      title={meta ? t(meta.label) : t(C.paramsTitle)}
      icon={meta?.icon ?? 'reglages'}
      kicker={t(C.paramsKicker)}
    >
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
            {/* « E-mail » et « Sécurité » vivaient ici : deux `ListRow` à
                chevron dont le seul comportement était une `Alert` « arrive très
                bientôt » — donc deux boutons morts, sur toutes les plateformes.
                L'absence d'un contrôle n'est pas un mensonge ; un contrôle qui
                échoue toujours en est un. On la nomme, sans date. */}
            <Absence>{t(C.accountNoEditNote)}</Absence>
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
          {/* ── E78 « CONNEXIONS ET APPAREILS » (spec l.2373) ──────────────────
              Ce que la spec appelle une LISTE d'appareils n'est pas lisible :
              le client Supabase Auth ne connaît que la session de CE téléphone
              (cf. `lib/auth.ts`, `signOutOtherDevices`). Peindre « iPhone 14 ·
              Paris · il y a 2 j » serait la donnée fabriquée la plus banale et
              la plus grave de l'écran de sécurité. On dit donc l'absence, et on
              n'offre que ce qui existe VRAIMENT : la révocation serveur des
              autres sessions. L'autre moitié de E78 — les connexions d'apps et
              de montres — vit déjà dans le Verify Hub (`/sources`), et la note
              y renvoie plutôt que d'en dupliquer une seconde liste ici. */}
          {otherDevices !== 'unknown' ? (
            <Section label={t(C.secAppareils)}>
              {otherDevices === 'noBackend' ? (
                <Absence>{t(C.otherDevicesNoBackend)}</Absence>
              ) : otherDevices === 'signedOut' ? (
                <Absence>{t(C.otherDevicesSignedOut)}</Absence>
              ) : (
                <ListRow
                  icon="verrou"
                  label={t(C.otherDevicesLabel)}
                  /* La ligne DIT l'issue de la dernière tentative — jamais un
                     silence après un échec, jamais un « fait » pendant l'appel. */
                  sublabel={
                    otherDevices === 'busy'
                      ? t(C.otherDevicesBusy)
                      : otherDevices === 'failed'
                        ? t(C.otherDevicesFailed)
                        : otherDevices === 'done'
                          ? t(C.otherDevicesDone)
                          : t(C.otherDevicesDetail)
                  }
                  tone={otherDevices === 'failed' ? 'danger' : 'default'}
                  /* Aucun `onPress` tant que l'action ne peut pas aboutir : une
                     ligne pressable qui échoue à coup sûr est un bouton mort. */
                  onPress={
                    otherDevicesActionable(otherDevices) ? revokeOtherDevices : undefined
                  }
                />
              )}
              <Absence>{t(C.otherDevicesNoListNote)}</Absence>
              <ListRow
                icon="lien"
                label={t(C.rowSources)}
                sublabel={t(C.otherDevicesSourcesHint)}
                chevron
                onPress={() => router.push('/sources')}
              />
            </Section>
          ) : null}
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
              cta={{
                label: t(C.crewRetry),
                onPress: reloadCrew,
                loading: crewLoading,
                variant: 'ghost',
              }}
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
            /* Le libellé était la chaîne littérale « Crew » — rendue telle
               quelle dans les cinq langues. Le concept « Crew » reste un
               invariant GRYD, mais il passe par le catalogue comme tout le
               reste : c'est la traduction qui décide, pas un `string` en dur. */
            <ListRow label={t(C.rowCrew)} value={realCrew.name} />
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
          {/* « PENDANT LA SORTIE », plus « PENDANT LA COURSE » : cette section
              gouverne les haptiques et les unités de n'importe quelle sortie,
              vélo compris, et l'écran ne lit aucune discipline. */}
          <Section label={t(C.secPendantSortie)}>
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
            {/* « Annonces audio · Bientôt » vivait ici : un réglage annoncé, un
                rendez-vous jamais pris, et une ligne de plus à parcourir pour
                zéro décision. Une fonction qui n'existe pas ne mérite pas une
                rangée dans une liste de réglages. */}
          </Section>
        </>
      ) : null}

      {id === 'notifications' ? (
        <Section label={t(C.secCeQueTuRecois)}>
          {/* E71 : cinq catégories dans la spec (défense/crew/rivalité/
              progression/produit). DEUX seulement gouvernent un envoi RÉEL
              aujourd'hui — `notifPrefs.ts` documente l'audit qui l'établit.
              AUCUN BOUTON MORT : les trois autres restent NOMMÉES plus bas
              (`notifOtherCategoriesNote`), jamais peintes en interrupteur. */}
          {/* ── L'EVENT §18, ENFIN ÉMIS (27/07/2026) ─────────────────────────
              `notif_pref_changed` était DÉFINI dans `events.ts` et émis par
              PERSONNE : le seul instant de l'écran qui décide quelque chose
              n'était pas mesuré. Il l'est maintenant, et UNIQUEMENT pour les
              deux catégories qui gouvernent un envoi RÉEL — c'est la consigne
              écrite dans `events.ts` en toutes lettres (« n'émettre que pour une
              catégorie réellement gouvernée »), et elle tient toute seule ici :
              l'écran ne peint pas d'interrupteur pour les trois autres.
              Les props sont des clés FERMÉES (`category` ∈ les 5 de §13,
              `enabled` booléen) — aucun libellé i18n, aucune PII. */}
          <SwitchRow
            icon="bouclier"
            title={t(C.notifDefenseTitle)}
            subtitle={t(C.notifDefenseSubtitle)}
            value={notifPrefs.defense}
            onValueChange={(v) => {
              track(EVENTS.notifPrefChanged, { category: 'defense', enabled: v });
              void updateNotifPrefs({ defense: v });
            }}
          />
          <SwitchRow
            icon="raid"
            title={t(C.notifRivaliteTitle)}
            subtitle={t(C.notifRivaliteSubtitle)}
            value={notifPrefs.rivalite}
            onValueChange={(v) => {
              track(EVENTS.notifPrefChanged, { category: 'rivalite', enabled: v });
              void updateNotifPrefs({ rivalite: v });
            }}
          />
          <Text style={styles.note}>{t(C.notifsNote)}</Text>
          <Absence>{t(C.notifOtherCategoriesNote)}</Absence>
          {/* Choisir SES catégories ne sert à rien si l'appareil n'est
              enregistré nulle part : cette ligne dit l'état RÉEL du téléphone,
              et son détail change avec le diagnostic (jamais un « Activer »
              muet).

              ── L'ÉTAT « PAS CONNECTÉ » MANQUAIT ─────────────────────────────
              La condition ne testait que `pushStatus`. Hors session,
              `registerPushDevice` renvoie `not_configured` (push.ts : « aucune
              session ») : le joueur cochait ses catégories, tapait
              « Activer », accordait une permission système — et n'apprenait
              qu'APRÈS que rien ne serait envoyé. Le coût était payé avant le
              message. On le dit AVANT, et on ne peint pas le contrôle qui
              échouera. */}
          {notifPrefsToChannels(notifPrefs).includes('off') ? null : identityUnknown ? (
            <Text style={styles.note}>{t(C.crewLoading)}</Text>
          ) : !signedIn ? (
            <EmptyState
              title={t(C.notifSignedOutTitle)}
              body={t(C.notifSignedOutBody)}
              {...(configured
                ? {
                    cta: {
                      label: t(C.identitySignInLabel),
                      onPress: () => router.push('/sign-in'),
                    },
                  }
                : {})}
            />
          ) : (
            /* AUCUN BOUTON MORT (28/07/2026). Cette ligne était pressable ET
               chevronnée dans TOUS les statuts non-`registered`, et sa branche
               par défaut appelait `pushEnable()` — y compris sur `unsupported`
               (push.ts:95, verdict de plateforme rendu avant toute I/O),
               `module_missing` (push.ts:98, verdict de build) et `unavailable`
               (aucun token : credentials APNs/FCM absents). Le joueur pouvait
               réappuyer sans fin sur ce que le sous-libellé de la MÊME ligne
               venait de déclarer impossible.
               `pushActionable` (fonction pure, testée) tranche, exactement comme
               `otherDevicesActionable` le fait 260 lignes plus haut sur la ligne
               voisine — les deux règles étaient opposées, elles sont désormais
               les mêmes. L'état RESTE affiché : une ligne muette informe, une
               ligne pressable qui échoue à coup sûr ment. */
            <ListRow
              icon="cloche"
              label={t(C.pushDeviceLabel)}
              sublabel={pushBusy ? t(C.pushBusy) : t(PUSH_STATUS_TEXT[pushStatus])}
              chevron={pushActionable(pushStatus)}
              onPress={
                pushActionable(pushStatus)
                  ? () => {
                      if (pushStatus === 'registered') pushDisable();
                      // Refus système : seul le joueur peut revenir dessus, dans
                      // les réglages du téléphone — redemander ne rouvrirait rien.
                      else if (pushStatus === 'permission_denied') void Linking.openSettings();
                      else pushEnable();
                    }
                  : undefined
              }
            />
          )}
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
          {/* « Couche par défaut · Auto » a disparu : une valeur en LECTURE, dans
              une liste de réglages, se lit comme un réglage — alors qu'aucune
              préférence de couche n'existe (la carte dérive la sienne du
              contexte). La note ci-dessous suffit, et elle, elle est vraie. */}
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
            {/* CRÉDITS DE DONNÉES — obligation CC BY de GeoNames (référentiel de
                7 870 villes) et Licence Ouverte des contours geo.api.gouv.fr
                (0033). Distinct de « Licences », qui parle des bibliothèques
                LOGICIELLES : citer React ne crédite pas GeoNames. Tant qu'aucun
                écran ne portait cette mention, la condition d'usage de la donnée
                n'était pas tenue. */}
            <ListRow
              icon="carte"
              label={t(CityC.creditsRowLabel)}
              sublabel={t(CityC.creditsRowHint)}
              chevron
              onPress={() => router.push('/credits-donnees')}
            />
            {/* La baseline produit n'est pas une indisponibilité : elle sortait
                du style `Soon` (italique gris, réservé au « pas encore
                disponible ») pour rejoindre la note grise ordinaire. */}
            <Text style={styles.note}>{t(C.tagline)}</Text>
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
            {/* « Build » a disparu : c'était EXACTEMENT la même chaîne que
                « Version » (À propos), sous un autre nom, dans une autre
                sous-page. Deux noms pour une seule valeur laissent croire à
                deux informations — une distinction fabriquée. */}
          </Section>
        </>
      ) : null}
    </StackScreen>
  );
}

/** Rythme vertical d'un sur-titre de section — identique sur tous les écrans de
 *  réglages (mesure de composition, pas une règle de jeu). */
const KICKER_TOP = 24;
const KICKER_BOTTOM = 10;

const styles = StyleSheet.create({
  kicker: { marginTop: KICKER_TOP, marginBottom: KICKER_BOTTOM },
  note: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.5,
    marginBottom: 4,
  },
  // Note d'ABSENCE : même gris, même taille que les autres notes — elle ne
  // s'italise plus, parce que rien ici n'est « en attente ».
  absence: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xs,
  },
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
  // Rôles typo plutôt que famille + graisse recodées à la main : la famille
  // encode déjà la graisse (design-tokens §fonts), un `fontWeight` par-dessus
  // n'agit pas et fait croire à un réglage.
  emptyTitle: { ...typography.itemTitle, color: colors.blanc },
  emptyBody: {
    ...typography.meta,
    color: colors.gris,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xxs,
  },
  emptyCta: { marginTop: spacing.sm },
});
