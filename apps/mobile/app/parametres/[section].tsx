/**
 * GRYD — sous-page Paramètres (AMENDEMENT-17 §CHANTIER 3). Une route dynamique
 * = une sous-page COURTE et actionnable. Un écran = un sujet, action/essentiel
 * sans scroll. Style dark GRYD, texte court, honnête sur ce qui manque.
 *
 * ═══ TROIS SOUS-PAGES, PLUS HUIT (10/09/2026, LOT RÉGLAGES ET PROFIL) ═══════
 * Ce fichier rendait HUIT slugs. Cinq d'entre eux — `profil`, `crew`, `carte`,
 * `apropos`, `avance` — ne pouvaient plus arriver jusqu'à `KnownSection` : le
 * composant de route les intercepte AVANT, par un `<Redirect>` posé quand leur
 * contenu a déménagé (profil-edit, onglet Crew, la carte elle-même, /a-propos,
 * /calcul-zones). Leurs ~450 lignes de JSX restaient donc compilées, relues,
 * traduites et maintenues pour un écran QUE PERSONNE NE PEUT OUVRIR.
 *
 * Ce n'était pas seulement du code mort, c'était une DEUXIÈME VÉRITÉ, et elle
 * avait déjà coûté quelque chose de visible : la seule ligne « Conditions de
 * vente » de tout l'écran Réglages vivait dans la branche `apropos`. Depuis le
 * redirect, plus aucun chemin de Réglages ne menait aux CGV — un document
 * OBLIGATOIRE (art. L111-1 du Code de la consommation) rendu injoignable par
 * une redirection. La ligne vit maintenant dans `app/parametres.tsx`, groupe
 * « Légal », où l'on va la chercher.
 *
 * Les cinq branches sont supprimées ; les cinq `<Redirect>` RESTENT (des liens
 * profonds `/parametres/apropos` ont pu être écrits ailleurs, et une redirection
 * qui marche n'est pas un mensonge). Restent trois sous-pages, toutes reliées
 * par l'écran Réglages : Compte, Pendant la sortie (`course`), Notifications.
 *
 * ─── IDENTITÉ : RÉELLE OU VIDE (21/07/2026) ────────────────────────────────
 * L'identité affichée venait de `useMyProfile()`, dont la BASE est le persona
 * démo (`MY_SOCIAL_PROFILE` : « KORO »). Sans session, cet écran affirmait donc
 * à l'utilisateur qu'il s'appelait KORO. C'était la fuite la plus visible du
 * périmètre. Désormais l'identité n'est affichée que si une session RÉELLE
 * existe ; sinon on dit « Non connecté », et l'action proposée dépend de ce qui
 * est possible : se connecter (backend configuré) ou rien du tout (build sans
 * backend, où proposer une connexion impossible serait un deuxième mensonge).
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
 * · « Annonces audio · Bientôt » (Pendant la sortie) : un réglage qui n'existe pas.
 * · « Unités · Kilomètres » (10/09/2026, même sous-page) : un CONSTAT peint en
 *   ligne de réglage. Rien dans l'app ne convertit en miles ; la ligne ne
 *   promettait donc un choix que par sa forme.
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
 * · Sous-page Notifications — RÉÉCRITE LE 10/09/2026 sur le cahier §14. Elle
 *   portait les cinq catégories d'E71, dont les deux seules réellement câblées
 *   décrivaient des mécaniques ABOLIES : « ton territoire qui va s'effacer »
 *   (decay) et « zones prises par un rival » (alarme immédiate de reprise).
 *   §5.3 supprime l'effacement, le bouclier et la contestation ; §14.2 interdit
 *   l'alarme de reprise en toutes lettres. La sous-page sert désormais la
 *   matrice de §14.1 — sport, crew, événements suivis, résultats, résumé
 *   hebdomadaire, nouveautés/offres (opt-in, désactivée par défaut) — plus
 *   « Pause du jeu ».
 *   Les préférences vivent SUR LE SERVEUR (migration 0140) et sont lues par le
 *   moteur d'envoi `can_notify_2026` (0141) : c'est ce qui les rend opposables.
 *   Quatre états jamais confondus (lecture · pas connecté · échec · lu), et un
 *   invité voit la matrice en LECTURE avec ses valeurs par défaut.
 *   Enfin la sous-page DIT ce que ce build peut réellement envoyer : des
 *   notifications LOCALES seulement — le push distant attend une clé APNs.
 * · Sous-page « Pendant la sortie » (slug `course`, libellé « Jeu ») : elle
 *   n'a plus qu'UN réglage, les haptiques, et c'en est un vrai (persisté,
 *   `lib/haptics.ts`, lu par toute la chaîne de course). Elle était atteignable
 *   par PERSONNE jusqu'au 10/09 ; l'écran Réglages la relie désormais dans son
 *   groupe « Préférences ».
 * · Les autorisations SYSTÈME (position, photos, appareil photo, mouvement) ne
 *   sont pas ici : elles ont leur page, `app/parametres/permissions.tsx`, parce
 *   qu'elles ne sont pas des réglages de GRYD mais des faits de l'OS — G27 :
 *   « une permission système et un consentement à un usage ne sont pas
 *   confondus ».
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import {
  colors,
  EVENTS,
  fontSizes,
  NOTIFICATION_RULES_2026,
  radii,
  spacing,
  typography,
} from '@klaim/shared';
import {
  otherDevicesActionable,
  otherDevicesState,
} from '../../src/features/account/otherDevices';
import { signOutOtherDevices } from '../../src/lib/auth';
import { SwitchRow } from '../../src/features/motivation/ui';
import { useDeviceNotifications } from '../../src/features/notifications/useDeviceNotifications';
import {
  DEFAULT_NOTIFICATION_SETTINGS_2026,
  type NotificationCategory2026,
} from '../../src/features/notifications/notifications2026';
import { useNotificationSettings2026 } from '../../src/features/notifications/notificationSettingsStore2026';
import type { PushStatus } from '../../src/features/notifications/push';
import { pushActionable } from '../../src/features/notifications/pushActionable';
import { SectionLabel } from '../../src/ui/SectionLabel';
import { useMyProfile } from '../../src/features/social/profileStore';
import { C } from '../../src/i18n/catalog/reglages';
import { useT } from '../../src/i18n/store';
import { useSession } from '../../src/lib/session';
import { screen, track } from '../../src/lib/analytics';
import { getHapticsEnabled, setHapticsEnabled } from '../../src/lib/haptics';
// LOT R — « Pendant la sortie » gouverne enfin ce que la sortie FAIT : la pause
// automatique (moteur `detectPauses`, préférence PAR DISCIPLINE, cahier §8.2) ne
// se réglait que pendant le compte à rebours du départ, et les annonces vocales
// ne se réglaient nulle part. Les deux magasins sont ceux de la chaîne vivante,
// jamais une copie locale.
import { loadAutoPause2026, saveAutoPause2026 } from '../../src/features/run/gps/autoPausePref';
import { loadVoicePref2026, saveVoicePref2026 } from '../../src/features/run/gps/voicePref2026';
import { C as CL } from '../../src/i18n/catalog/courseLive';
import {
  settingsRowBySection,
  type SettingsSectionId,
} from '../../src/features/settings/sections';
import { Button } from '../../src/ui/Button';
import { ListRow } from '../../src/ui/ListRow';
import { StackScreen } from '../../src/ui/StackScreen';
import { AccountDoor2026 } from '../../src/features/account/AccountDoor2026';

/**
 * LES SLUGS QUE CE FICHIER REND ENCORE. Ils étaient huit ; cinq ne pouvaient
 * plus atteindre `KnownSection` (voir le bloc « TROIS SOUS-PAGES » en tête).
 */
const SECTION_IDS: readonly SettingsSectionId[] = ['compte', 'course', 'notifications'];

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

/**
 * LES SIX CATÉGORIES DE §14.1, DANS L'ORDRE DU CAHIER — une table, pas six
 * blocs recopiés. L'ordre est celui du texte (« sport, crew, événements suivis,
 * résultats, résumé hebdomadaire, nouveautés/offres ») et le type `satisfies`
 * garantit qu'aucune catégorie inventée ne s'y glisse : la clé doit exister
 * dans l'union dérivée de `NOTIFICATION_RULES_2026.categories`.
 */
const NOTIF_ROWS = [
  { category: 'sport', title: C.notifSportTitle, subtitle: C.notifSportSubtitle },
  { category: 'crew', title: C.notifCrewTitle, subtitle: C.notifCrewSubtitle },
  { category: 'events', title: C.notifEventsTitle, subtitle: C.notifEventsSubtitle },
  { category: 'results', title: C.notifResultsTitle, subtitle: C.notifResultsSubtitle },
  { category: 'weekly', title: C.notifWeeklyTitle, subtitle: C.notifWeeklySubtitle },
  { category: 'offers', title: C.notifOffersTitle, subtitle: C.notifOffersSubtitle },
] as const satisfies readonly {
  category: NotificationCategory2026;
  title: (typeof C)['notifSportTitle'];
  subtitle: (typeof C)['notifSportTitle'];
}[];

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
  if (raw === 'avance') return <Redirect href="/calcul-zones" />;
  if (raw === 'crew') return <Redirect href="/(tabs)/crew" />;
  if (raw === 'carte') return <Redirect href="/(tabs)" />;
  if (raw === 'apropos') return <Redirect href="/a-propos" />;
  if (raw === 'profil') return <Redirect href="/profil-edit" />;
  if (!isSection(raw)) return <UnknownSection />;
  return <KnownSection id={raw} />;
}

function KnownSection({ id }: { id: SettingsSectionId }) {
  const meta = settingsRowBySection(id);
  const t = useT();

  // Le nom AFFICHÉ dans « Connecté en tant que ». Une seule source, la même que
  // Profil et profil-edit : une édition du nom se reflète ici immédiatement.
  const { profile } = useMyProfile();
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
  const [hapticsOn, setHapticsOn] = useState(true);
  /**
   * LOT R — trois préférences de sortie, TOUJOURS lues avant d'être peintes.
   * `null` = « pas encore lu » : l'interrupteur n'affiche alors aucun état,
   * plutôt qu'un état supposé qui se corrigerait sous les yeux du joueur (même
   * règle que `PreflightApi.autoPause`).
   */
  const [autoPauseRun, setAutoPauseRun] = useState<boolean | null>(null);
  const [autoPauseBike, setAutoPauseBike] = useState<boolean | null>(null);
  const [voiceOn, setVoiceOn] = useState<boolean | null>(null);
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
  /**
   * Réglages §14.1, lus et écrits SUR LE SERVEUR (migration 0140). Le magasin
   * local E71 a disparu avec les deux catégories abolies : une préférence que
   * le décideur ne voit pas ne gouverne rien.
   */
  const {
    phase: notifPhase,
    settings: notifSettings,
    saving: notifSaving,
    saveFailed: notifSaveFailed,
    update: updateNotifSettings,
    reload: reloadNotifSettings,
  } = useNotificationSettings2026();
  // État RÉEL du push DISTANT sur ce téléphone. Sur ce build il vaut
  // `unavailable` avant toute I/O (`remotePushCapability`) : l'entitlement iOS
  // est retiré et aucun `google-services.json` n'existe pour Android.
  const {
    status: pushStatus,
    busy: pushBusy,
    enable: pushEnable,
    disable: pushDisable,
  } = useDeviceNotifications(notifSettings);

  useEffect(() => {
    screen('parametres_section', { section: id });
  }, [id]);

  useEffect(() => {
    let alive = true;
    void getHapticsEnabled().then((v) => {
      if (alive) setHapticsOn(v);
    });
    // Les trois magasins de « Pendant la sortie », lus ensemble : un
    // interrupteur qui apparaîtrait après les autres donnerait l'impression que
    // le réglage vient d'être créé.
    void Promise.all([loadAutoPause2026('run'), loadAutoPause2026('bike'), loadVoicePref2026()])
      .then(([forRun, forBike, voice]) => {
        if (!alive) return;
        setAutoPauseRun(forRun);
        setAutoPauseBike(forBike);
        setVoiceOn(voice);
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
            ) : (
              /* PAS CONNECTÉ — le FAIT d'abord (« Non connecté » est une valeur
                 lue, pas un trou), la porte ensuite.
                 ÉTAPE 0 (10/09/2026) : la ligne disait « Se connecter »
                 (`identitySignInLabel`), un mot qui n'ouvre rien à qui n'a PAS
                 de compte, et sans backend elle était REMPLACÉE par une note
                 grise — l'écran perdait alors toute mention du compte.
                 La porte partagée tient les deux cas ; sa RAISON garde la
                 nuance locale, parce qu'un build sans serveur n'a pas la même
                 conséquence pour le joueur (rien ne sort de ce téléphone). */
              <>
                <ListRow label={t(C.connectedAs)} value={t(C.identityNone)} />
                <AccountDoor2026
                  family="ui"
                  compact
                  reason={t(configured ? C.identitySignInDetail : C.identityNoBackend)}
                />
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

      {id === 'course' ? (
        <>
          {/* « PENDANT LA SORTIE », plus « PENDANT LA COURSE » : cette section
              gouverne les haptiques de n'importe quelle sortie, vélo compris, et
              l'écran ne lit aucune discipline.
              ── CE QUI A ÉTÉ RETIRÉ LE 10/09/2026 ──────────────────────────
              « Unités · Kilomètres » : une valeur en LECTURE au milieu d'une
              liste de réglages se lit comme un réglage, et celui-ci n'existe
              pas — RIEN dans l'app ne sait afficher des miles (aucune
              conversion, aucune préférence persistée, `formatKm*` partout).
              C'est le défaut exact déjà corrigé sur « Couche par défaut · Auto »
              deux sous-pages plus loin. Le jour où les miles existeront, la
              ligne reviendra en INTERRUPTEUR, pas en constat. */}
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
            {/* ── LOT R (11/09/2026) ────────────────────────────────────────
                « Annonces audio · Bientôt » vivait ici : un réglage annoncé, un
                rendez-vous jamais pris, et une ligne de plus à parcourir pour
                zéro décision. La fonction EXISTE désormais (départ, kilomètre,
                boucle presque fermée, boucle fermée) : la ligne revient en
                INTERRUPTEUR, jamais en constat.

                Et la PAUSE AUTOMATIQUE descend ici. Elle existait — moteur,
                préférence par discipline, défaut du cahier §8.2 — mais ne se
                réglait que pendant le compte à rebours du départ, c'est-à-dire
                trois secondes avant de partir, sur l'écran où l'on décide le
                moins bien. Deux disciplines, deux lignes : un cycliste s'arrête
                pour de vrai à chaque carrefour, un coureur non.

                Aucune ligne ne se peint tant que son magasin n'a pas répondu :
                un interrupteur affiché sur une valeur supposée se corrigerait
                sous les yeux du joueur, qui croirait l'avoir changé. */}
            {autoPauseRun !== null && (
              <SwitchRow
                title={t(CL.setAutoPauseRunTitle)}
                subtitle={t(CL.setAutoPauseRunSubtitle)}
                value={autoPauseRun}
                onValueChange={(v) => {
                  setAutoPauseRun(v);
                  void saveAutoPause2026('run', v);
                }}
              />
            )}
            {autoPauseBike !== null && (
              <SwitchRow
                title={t(CL.setAutoPauseBikeTitle)}
                subtitle={t(CL.setAutoPauseBikeSubtitle)}
                value={autoPauseBike}
                onValueChange={(v) => {
                  setAutoPauseBike(v);
                  void saveAutoPause2026('bike', v);
                }}
              />
            )}
            {voiceOn !== null && (
              <>
                <SwitchRow
                  title={t(CL.setVoiceTitle)}
                  subtitle={t(CL.setVoiceSubtitle)}
                  value={voiceOn}
                  onValueChange={(v) => {
                    setVoiceOn(v);
                    void saveVoicePref2026(v);
                  }}
                />
                {/* Ce que la voix NE SAIT PAS faire, dit ici et pas découvert
                    en courant : `expo-speech` ne touche pas la session audio
                    d'iOS et `app.json` ne déclare pas le mode `audio`. */}
                <Text style={styles.note}>{t(CL.setVoiceNote)}</Text>
              </>
            )}
          </Section>
        </>
      ) : null}

      {id === 'notifications' ? (
        <>
          {/* ── §14.1 : LA MATRICE DU CAHIER, ET RIEN QUE CE QUI EXISTE ──────
              CE QUI A ÉTÉ RETIRÉ LE 10/09/2026. Deux interrupteurs vivaient
              ici : « Défense · ton territoire qui va s'effacer bientôt » et
              « Rivalité · zones prises par un rival ». Ils décrivaient un jeu
              ABOLI — §5.3 supprime effacement, bouclier et contestation, §14.2
              interdit explicitement l'alarme immédiate de reprise. Un réglage
              qui décrit une mécanique disparue est pire qu'un bouton mort : il
              enseigne au joueur des règles fausses, et le journal du jeu, lui,
              raconte déjà la vraie histoire.

              LES PRÉFÉRENCES VIVENT SUR LE SERVEUR (0140). C'est ce qui rend le
              réglage OPPOSABLE : `can_notify_2026` (0141) les lit avant chaque
              envoi. L'ancien magasin AsyncStorage ne quittait jamais le
              téléphone — aucun décideur ne pouvait le respecter.

              QUATRE ÉTATS, JAMAIS CONFONDUS : lecture en cours · pas connecté ·
              lecture ratée · lu. Le troisième et le quatrième se ressemblent et
              ne veulent pas dire la même chose : montrer des valeurs par défaut
              après un échec de lecture, ce serait afficher un choix que le
              joueur n'a pas fait. */}
          <Section label={t(C.secCeQueTuRecois)}>
            {/* L'ÉTAT VRAI DU BUILD, EN TÊTE : ce que GRYD peut réellement
                envoyer aujourd'hui, c'est-à-dire des notifications LOCALES.
                Le dire ici, avant la matrice, est ce qui empêche la liste de
                promettre plus que le code (L14, L19). */}
            <Text style={styles.note}>{t(C.notifLocalOnlyNote)}</Text>

            {notifPhase === 'loading' ? (
              <Text style={styles.note}>{t(C.notifReading)}</Text>
            ) : notifPhase === 'failed' ? (
              <EmptyState
                title={t(C.notifReadFailedTitle)}
                body={t(C.notifReadFailedBody)}
                cta={{
                  label: t(C.notifReadFailedCta),
                  onPress: reloadNotifSettings,
                  variant: 'ghost',
                }}
              />
            ) : notifPhase === 'signedOut' ? (
              <>
                {/* L'ÉTAT D'ABORD, LE DÉTAIL ENSUITE. L'explication précède les
                    lignes : sans elle, « Sport · Activé » se lirait comme un
                    réglage enregistré alors qu'aucun compte ne le porte. */}
                {/* ÉTAPE 0 (10/09/2026) : « Se connecter », gardé par
                    `configured ? {cta} : {}`. Sans backend, le titre restait
                    (« Ces choix appartiennent à ton compte ») et l'action
                    disparaissait : une phrase qui désigne un compte, au-dessus
                    du vide où il devrait pouvoir naître. La porte partagée
                    nomme la création, et sans serveur elle se dit fermée. Le
                    titre vient d'elle ; le corps reste ici, car c'est lui qui
                    introduit la matrice en lecture juste dessous. */}
                <AccountDoor2026
                  family="ui"
                  reason={t(C.notifSignedOutBody)}
                />
                {/* UN INVITÉ VOIT L'ÉTAT SANS COMPTE : les six catégories, ce
                    qu'elles envoient, et leur valeur PAR DÉFAUT — en LECTURE.
                    Aucun `onPress`, donc aucun contrôle qui échouerait, et
                    aucune promesse qu'un choix serait retenu. Le sous-libellé
                    reste : une catégorie dont on ne dit pas ce qu'elle envoie
                    n'apprend rien à celui qui hésite à créer un compte. */}
                {NOTIF_ROWS.map((row) => (
                  <ListRow
                    key={row.category}
                    label={t(row.title)}
                    sublabel={t(row.subtitle)}
                    value={t(
                      DEFAULT_NOTIFICATION_SETTINGS_2026[row.category]
                        ? C.notifDefaultOn
                        : C.notifDefaultOff,
                    )}
                  />
                ))}
              </>
            ) : (
              <>
                {NOTIF_ROWS.map((row) => (
                  <SwitchRow
                    key={row.category}
                    title={t(row.title)}
                    subtitle={t(row.subtitle)}
                    value={notifSettings[row.category]}
                    onValueChange={(v) => {
                      // Clés FERMÉES, aucun libellé i18n, aucune PII — et
                      // l'event ne part QUE pour une catégorie qui gouverne
                      // réellement la décision d'envoi (`can_notify_2026`).
                      track(EVENTS.notifPrefChanged, { category: row.category, enabled: v });
                      updateNotifSettings({ [row.category]: v });
                    }}
                  />
                ))}
                {/* ÉCRITURE OPTIMISTE, MAIS DITE : l'interrupteur bascule tout
                    de suite, et l'écran ne laisse pas croire que c'est
                    enregistré tant que ça ne l'est pas. Un échec REMET la
                    valeur d'avant (`notificationSettingsStore2026`). */}
                {notifSaving ? <Text style={styles.note}>{t(C.notifSaving)}</Text> : null}
                {notifSaveFailed ? <Text style={styles.note}>{t(C.notifSaveFailed)}</Text> : null}
              </>
            )}
          </Section>

          <Section label={t(C.secQuandTuLeRecois)}>
            {notifPhase === 'ready' ? (
              <SwitchRow
                icon="cloche"
                title={t(C.notifGamePauseTitle)}
                subtitle={t(C.notifGamePauseSubtitle)}
                value={notifSettings.gamePause}
                onValueChange={(v) => {
                  track(EVENTS.notifPrefChanged, { category: 'game_pause', enabled: v });
                  updateNotifSettings({ gamePause: v });
                }}
              />
            ) : notifPhase === 'signedOut' ? (
              // « Pause du jeu » fait partie de la matrice §14.1 : un invité doit
              // la voir comme les six autres, en lecture. La cacher aurait laissé
              // croire qu'elle n'existe pas.
              <ListRow
                label={t(C.notifGamePauseTitle)}
                sublabel={t(C.notifGamePauseSubtitle)}
                value={t(
                  DEFAULT_NOTIFICATION_SETTINGS_2026.gamePause
                    ? C.notifDefaultOn
                    : C.notifDefaultOff,
                )}
              />
            ) : null}
            {/* Les nombres viennent de `NOTIFICATION_RULES_2026` : la note ne
                peut pas se désynchroniser de la politique qu'elle décrit. */}
            <Text style={styles.note}>
              {t(C.notifBudgetNote, {
                start: notifPhase === 'ready' ? notifSettings.quietStartHour : NOTIFICATION_RULES_2026.quietHoursStart,
                end: notifPhase === 'ready' ? notifSettings.quietEndHour : NOTIFICATION_RULES_2026.quietHoursEnd,
                week: NOTIFICATION_RULES_2026.maximumNonTransactionalPerWeek,
                day: NOTIFICATION_RULES_2026.maximumNonTransactionalPerDay,
              })}
            </Text>
            {/* L'ÉTAT DE L'APPAREIL POUR LE PUSH DISTANT. Il reste AFFICHÉ —
                une ligne muette informe — mais il n'est pressable que si
                `pushActionable` le permet. Sur ce build le statut vaut
                `unavailable` (capacité de build, décidée sans une seule I/O),
                donc aucun chevron : rien à réessayer, et surtout aucune boîte
                de permission ouverte pour un service incapable d'envoyer. */}
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
