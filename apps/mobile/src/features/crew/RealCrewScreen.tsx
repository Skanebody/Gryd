/**
 * GRYD — ÉCRAN CREW. Il a remplacé la démo Supercell, aujourd'hui supprimée : un
 * crew est RÉEL ou VIDE, jamais fabriqué (« l'app ne ment jamais »).
 *
 * §A épuration : 1 écran = 1 décision, 1 SEUL CTA chartreuse, pas de card-dans-
 * card, textes jamais coupés. Machine à états minimale :
 *   déconnecté → invite à se connecter (aucun mensonge, aucun crew fictif) ;
 *   sans crew  → pitch 1 ligne + « Créer mon crew » (chartreuse) + « J’ai un code » (ghost) ;
 *   création   → nom + ville (si >1) → « Créer le crew » ;
 *   rejoindre  → code {CREW_CODE_LENGTH} caractères → « Rejoindre » ;
 *   avec crew  → nom, X/CREW_MAX_MEMBERS, TERRITOIRE (zones tenues + rang ville),
 *                roster (pseudo + rôle + contribution), « Inviter » (chartreuse,
 *                vrai code via my_crew_code), « Quitter » en action discrète.
 *
 * Territoire + contributions = maillons 2 et 4 de la boucle AMENDEMENT-43 §0
 * (« je vois ce que mon crew contrôle », « ma contribution est visible »),
 * servis par crew_overview() (0044), calculé frais sur hex_claims. Trois états
 * honnêtes : donnée absente (chargement/échec) ⇒ AUCUN bloc ; crew sans hex ⇒
 * phrase explicite, pas un zéro décoré ni une aire inventée ; crew avec hexes ⇒
 * compte + rang. Le bloc reste de l'INFO : le seul CTA chartreuse est « Inviter ».
 * Erreurs du contrat RPC → messages i18n honnêtes (cooldown {days}, full, bad_code…).
 *
 * AMENDEMENT-44 A4/A5 — SIGNAUX + PING DE ZONE. Un 5ᵉ état, `signal`, ajoute au
 * plus DEUX pas (quel signal → quelle zone, le 2ᵉ seulement si le signal désigne
 * un lieu). Le chat LIBRE reste refusé (A-43 §9) : le vocabulaire est un
 * catalogue FERMÉ (engine/crewSignals.ts) dont le sous-ensemble proposé DÉPEND
 * de la situation réelle du crew — elle-même dérivée de LA mission prioritaire,
 * donc de faits serveur. Un signal hors contexte n'est ni proposé ni accepté.
 * Les pings viennent du serveur (0051) et JAMAIS d'un repli local : afficher un
 * ping que le crew ne voit pas serait exactement le mensonge que la doctrine
 * interdit. Aucun CTA chartreuse n'est ajouté — le seul reste « Inviter ».
 *
 * ═══ RECALAGE PLANCHE E13 « CREW HOME » (2026) ══════════════════════════════
 * L'écran devient un QUARTIER GÉNÉRAL VISUEL, dans l'ordre de la planche :
 *   1. HERO d'appartenance (blason 72 pt + nom display + ville · rang · effectif) ;
 *   2. SEGMENTED 3 vues « Aperçu | Carte | Membres » — jamais de 4ᵉ onglet Chat
 *      (pas de backend, et le chat libre reste refusé, A-43 §9) ;
 *   3. Aperçu = card NOTRE PRIORITÉ en point focal, puis l'activité (≤ 3 lignes),
 *      puis la rangée de membres ;
 *   4. Carte = TERRITOIRE (zones tenues + rang) + bande des secteurs nommés ;
 *   5. Membres = le roster, inchangé.
 * Le CREW SANS TERRITOIRE (`hexesHeld === 0`, overview LU) remplace l'aperçu par
 * un PLAN D'ACTION (`CrewStarterPlan`) — jamais un tableau de bord vide.
 *
 * Ce que la planche montre et que le code REFUSE de peindre — chaque absence est
 * une donnée qui n'existe pas, détaillée dans les composants concernés :
 * photo de crew, @tag, surface km², delta hebdomadaire, barre de progression de
 * mission, mini-carte de secteur, avatars, édition d'emblème, compteur « 0/3 »,
 * actions de gestion officier/chef, bouton Chat.
 *
 * Cette branche n'utilise plus `TabScreen` mais son propre ScrollView (patron
 * `app/(tabs)/classement.tsx`) : `TabScreen` rend son titre AVANT ses enfants,
 * or le hero PORTE le nom du crew — l'un des deux aurait fait doublon. Aucune
 * modification de `TabScreen` n'a été faite ; les autres états de l'écran
 * (déconnecté, création, adhésion, échec, sans crew) le gardent tel quel.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CREW_CODE_LENGTH,
  CREW_PING_MAX_ACTIVE_PER_MEMBER,
  CREW_SWITCH_COOLDOWN_DAYS,
  colors,
  fonts,
  elevation,
  fontSizes,
  iconSizes,
  radii,
  sizes,
  spacing,
  type IconName,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../../lib/analytics';
import { useSession } from '../../lib/session';
import { Button } from '../../ui/Button';
import { Card, IconPlate } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Segmented, type SegmentedOption } from '../../ui/game/Segmented';
import { TabScreen } from '../../ui/TabScreen';
import { TAB_CONTENT_BOTTOM_CLEARANCE } from '../nav/metrics';
import { useLocale, useT } from '../../i18n/store';
import type { Entry, Locale } from '../../i18n/types';
import { C, CREW_ROLE_E, CREW_SIGNAL_E } from '../../i18n/catalog/crew';
import { CrewHero } from './CrewHero';
import { CrewJoinRequests } from './CrewJoinRequests';
import { CrewMembersStrip } from './CrewMembersStrip';
import { CrewStarterPlan } from './CrewStarterPlan';
import { CrewTerritoryStrip } from './CrewTerritoryStrip';
import { CrewInviteQRScreen } from './CrewInviteQRScreen';
import { useCrewPings, type PingSendRefusal } from './pings';
import {
  crewPingDecision,
  crewSignalsFor,
  crewSituationOf,
  pingableSectors,
  type CrewSignalDef,
  type CrewSignalKey,
} from './engine/crewSignals';
import {
  crewCreateDecision,
  normalizeCrewCode,
  randomCrewColor,
  useRealCrew,
  type CrewRefusal,
} from './real';
import { CityField, type CityEntry } from '../city/CityPicker';
import { C as CityC } from '../../i18n/catalog/city';
import type { CrewMission } from './engine/crewMission';
// ── Guideline 1.2 : bloquer AGIT ici, et signaler part d'ici ────────────────
import {
  PlayerActionsButton,
  PlayerModerationSheet,
  useBlockedPseudos,
} from './PlayerModerationSheet';
import { canModeratePlayer, displayedPseudo, isPseudoBlocked } from './blocklist';

/**
 * Rôle serveur (texte) → libellé localisé, ou null si la valeur est inconnue du
 * catalogue (rôle ajouté côté DB avant l'app) : on n'affiche alors RIEN plutôt
 * qu'une clé technique.
 */
function roleLabelEntry(role: string): Entry | null {
  return (CREW_ROLE_E as Readonly<Record<string, Entry | undefined>>)[role] ?? null;
}

type Mode = 'home' | 'create' | 'join' | 'invite' | 'signal';

interface ErrView {
  entry: Entry;
  vars?: Record<string, string | number>;
}

/** Motif de refus RPC → message i18n honnête (jamais un « réessaie » opaque quand on sait pourquoi). */
function refusalError(reason: CrewRefusal, daysLeft?: number): ErrView {
  switch (reason) {
    case 'cooldown':
      return { entry: C.rlErrCooldown, vars: { days: daysLeft ?? CREW_SWITCH_COOLDOWN_DAYS } };
    case 'full':
      return { entry: C.rlErrFull };
    case 'bad_code':
      return { entry: C.rlErrBadCode };
    case 'already_in_crew':
      return { entry: C.rlErrAlreadyInCrew };
    case 'bad_name':
      return { entry: C.rlErrBadName };
    case 'name_unavailable':
      return { entry: C.rlErrNameUnavailable };
    case 'bad_city':
      return { entry: C.rlErrBadCity };
    default:
      return { entry: C.rlErrGeneric };
  }
}

/**
 * Refus de ping → message honnête. Chaque motif que l'on SAIT expliquer l'est ;
 * seul l'inconnu tombe sur le message générique. Un « réessaie » opaque là où la
 * cause est connue est une petite malhonnêteté (et donne l'air d'un bug).
 *
 * `bad_bounds` / `bad_signal` / `signed_out` / `no_crew` sont des bugs d'appel ou
 * des états que l'écran ne devrait jamais atteindre : ils ne méritent pas une
 * explication sur mesure, mais ils ne doivent pas non plus rester silencieux.
 */
function pingRefusalMessage(
  reason: PingSendRefusal | 'out_of_context' | 'sector_required' | 'sector_unexpected' | 'unknown_signal',
  retryInS?: number,
): ErrView {
  switch (reason) {
    case 'cooldown':
      return { entry: C.pingErrCooldown, vars: { s: retryInS ?? 0 } };
    case 'sector_not_allowed':
    case 'sector_unnamed':
    case 'sector_required':
    case 'sector_unexpected':
      return { entry: C.pingErrSector };
    case 'out_of_context':
      return { entry: C.pingErrContext };
    default:
      return { entry: C.pingErrGeneric };
  }
}

/**
 * MISSION → copie affichable (A-43 §0 maillon 3, format doctrine : une phrase +
 * le manque CONCRET + une action).
 *
 * Cette fonction ne fait QUE traduire des faits déjà dérivés (moteur pur
 * `chooseCrewMission`) : elle n'ajoute aucun chiffre, aucune urgence, aucun nom
 * de lieu. Les délais sont recalculés depuis les VRAIES échéances de la base et
 * arrondis VERS LE BAS (« dans 5 h » quand il reste 5 h 50 : sous-estimer une
 * marge est honnête, la sur-estimer ment) ; sous une heure, on le dit en toutes
 * lettres plutôt que d'afficher « 0 h ».
 *
 * Le crew adverse n'est jamais nommé : la doctrine bannit les rivaux fabriqués,
 * et exposer un vrai crew ici en ferait une cible.
 */
function missionCopy(
  m: CrewMission,
  nowMs: number,
): { title: ErrView; gap: ErrView } | { note: Entry } | null {
  const H = 3_600_000;
  switch (m.kind) {
    case 'defend': {
      const hours = Math.floor(Math.max(0, m.deadlineAt - nowMs) / H);
      const soon = hours < 1;
      return {
        title: m.sectorName
          ? { entry: C.cmDefendNamed, vars: { sector: m.sectorName } }
          : { entry: C.cmDefend },
        gap: {
          entry: m.zones === 1
            ? (soon ? C.cmDefendGapSoonOne : C.cmDefendGapOne)
            : (soon ? C.cmDefendGapSoonN : C.cmDefendGapN),
          vars: { n: m.zones, h: hours },
        },
      };
    }
    case 'reclaim': {
      const hours = Math.floor(Math.max(0, nowMs - m.lastLostAt) / H);
      // Au-delà d'un jour, « il y a 53 h » ne parle à personne.
      const useDays = hours >= 24;
      const days = Math.floor(hours / 24);
      return {
        title: m.sectorName
          ? { entry: C.cmReclaimNamed, vars: { sector: m.sectorName } }
          : { entry: C.cmReclaim },
        gap: {
          entry: m.zones === 1
            ? (useDays ? C.cmReclaimGapOneD : C.cmReclaimGapOneH)
            : (useDays ? C.cmReclaimGapND : C.cmReclaimGapNH),
          vars: { n: m.zones, h: hours, d: days },
        },
      };
    }
    case 'close_loop':
      return {
        title: m.name
          ? { entry: C.cmLoopNamed, vars: { name: m.name } }
          : { entry: C.cmLoop },
        // Mètres arrondis au plus PROCHE : c'est une distance mesurée, pas une
        // marge de sécurité — et jamais en dessous de 1 m tant qu'il en reste.
        gap: { entry: C.cmLoopGap, vars: { m: Math.max(1, Math.round(m.missingM)) } },
      };
    case 'capture':
      return {
        title: m.sectorName
          ? { entry: C.cmCaptureNamed, vars: { sector: m.sectorName } }
          : { entry: C.cmCapture },
        // Plus de {n} : freeZones est une borne supérieure (eau, bâti, privé
        // inclus), l'annoncer comme un compte serait une promesse fausse.
        gap: { entry: C.cmCaptureGap },
      };
    case 'none':
      return { note: m.reason === 'no_data' ? C.cmNoneNoData : C.cmNoneStable };
    default:
      return null;
  }
}

/**
 * PASTILLE D'ÉTAT de la card NOTRE PRIORITÉ — elle REMPLACE la mini-carte de la
 * planche. Aucune géométrie de secteur ne descend jusqu'au client (0015 garde
 * `segments`/`opener_ring` côté serveur ; `missionSectors` ne porte qu'un nom et
 * des compteurs) : une vignette carto ne montrerait qu'un fond générique, donc
 * un décor qui ferait croire à une localisation. Une icône de NATURE de mission
 * dit la même chose sans rien affirmer sur un lieu.
 */
function missionIcon(kind: CrewMission['kind']): IconName {
  switch (kind) {
    case 'defend':
      return 'bouclier';
    case 'reclaim':
      return 'cible';
    case 'close_loop':
      return 'boucle_fermee';
    default:
      return 'conquete';
  }
}

/**
 * Heure locale COURTE d'un événement (« 08:12 »), format de la planche.
 *
 * `Intl` n'est pas garanti sur tous les moteurs embarqués (même prudence que
 * `features/history/RealRunCard`) : en cas d'absence, on retombe sur 24 h
 * numérique plutôt que sur une chaîne vide. Une heure est un FAIT lu du serveur
 * (`createdAt`) — elle ne doit jamais disparaître ni être arrondie.
 */
function shortTime(ms: number, locale: Locale): string {
  const d = new Date(ms);
  try {
    return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  } catch {
    const p2 = (n: number) => n.toString().padStart(2, '0');
    return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  }
}

/** Les 3 vues du QG (planche E13). Le chat n'en est PAS une (A-43 §9). */
type CrewView = 'overview' | 'map' | 'members';

/**
 * ACTIVITÉ — plafond d'affichage de la planche (« exactement 3 événements MAX »).
 * Ce n'est pas une règle de jeu : c'est une borne de lisibilité, au même titre
 * que la largeur d'une rangée. Le plafond de LECTURE, lui, vit dans game-rules
 * (`CREW_PING_FEED_MAX`, consommé par `useCrewPings`).
 */
const ACTIVITY_MAX = 3;

export function RealCrewScreen() {
  const t = useT();
  const locale = useLocale();
  const insets = useSafeAreaInsets();
  const { configured } = useSession();
  // Les callbacks du hook sont mémoïsés (stables tant que `ready` ne change pas) :
  // on les destructure pour des deps d'effet/callback saines (l'objet `crewApi`
  // lui-même change d'identité à chaque render — jamais le mettre en dépendance).
  const {
    ready,
    loading,
    loadFailed,
    crew,
    members,
    overview,
    // `overviewLoading` sépare « je lis le territoire » de « je n'ai pas pu le
    // lire » : sans lui, la vue Carte rendrait le même vide dans les deux cas.
    overviewLoading,
    mission,
    missionSectors,
    memberCount,
    maxMembers,
    reload,
    createCrew,
    joinByCode,
    leaveCrew,
    fetchMyCode,
  } = useRealCrew({ withOverview: true });

  const [mode, setMode] = useState<Mode>('home');
  /**
   * Vue active du QG (planche E13). L'onglet Membres n'ouvre AUCUNE route : il
   * fait défiler la même page sur un autre contenu — donc aucun écran à peindre
   * qui n'existe pas.
   */
  const [view, setView] = useState<CrewView>('overview');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  /**
   * LA VILLE DU CREW — l'ENTRÉE complète, pas un simple identifiant.
   *
   * On garde `status` parce que c'est lui qui autorise la création : le serveur
   * refuse une ville absente de `city_zones` (`bad_city`, 0050:466). Avec le
   * seul identifiant, l'écran aurait peint un CTA chartreuse qui échoue —
   * exactement le « bouton mort » interdit par CLAUDE.md.
   */
  const [city, setCity] = useState<CityEntry | null>(null);
  const cityId = city?.status === 'open' ? city.cityId : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrView | null>(null);
  const [flash, setFlash] = useState<ErrView | null>(null);
  // Signal choisi en attente de sa zone (2ᵉ pas du ping). null = 1ᵉʳ pas.
  const [pendingSignal, setPendingSignal] = useState<CrewSignalKey | null>(null);
  /**
   * MODÉRATION (Guideline 1.2) — joueur visé par la feuille { Signaler ·
   * Bloquer }, ou `null` si elle est fermée. Le roster est la PREMIÈRE des deux
   * surfaces qui affichent le pseudo d'un tiers ; elle n'avait aucune
   * affordance, et le blocage n'y avait aucun effet (audit App Store B3/B4).
   */
  const [moderationTarget, setModerationTarget] = useState<string | null>(null);
  const blockedPseudos = useBlockedPseudos();

  // ── PINGS (A-44 A5) : lecture serveur, jamais de repli local ──────────────
  const {
    pings,
    mine: myPingState,
    reload: reloadPings,
    send: sendPing,
  } = useCrewPings();

  useEffect(() => {
    screen('crew_real');
  }, []);

  /*
   * PLUS DE PRÉ-CHARGEMENT DE LA LISTE DES VILLES ICI.
   *
   * L'ancienne version faisait un `select` SANS limite sur `city_zones` à
   * l'entrée en création, PRÉ-SÉLECTIONNAIT `list[0]` (arbitraire dès qu'il y a
   * plus d'une ville) et rendait UNE PILL PAR VILLE — tenable à 2 villes,
   * illisible à 20 et impossible à 7 870. Le sélecteur partagé
   * (`features/city/CityPicker`) fait la lecture, la borne et la recherche, et
   * il ne présélectionne RIEN : la ville est une décision du joueur.
   */

  const resetForms = useCallback(() => {
    setName('');
    setCode('');
    setError(null);
  }, []);

  const goHome = useCallback(() => {
    resetForms();
    setMode('home');
  }, [resetForms]);

  const onCreate = useCallback(async () => {
    if (busy || !cityId) return;
    const color = randomCrewColor();
    const pre = crewCreateDecision(name, color, cityId);
    if (!pre.ok) {
      setError(refusalError(pre.reason));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createCrew(name, color, cityId);
    setBusy(false);
    if (res.ok) {
      track(EVENTS.crewCreated);
      setFlash({ entry: C.rlCreated, vars: { name: res.crew.name } });
      resetForms();
      setMode('home');
      reload();
    } else {
      setError(refusalError(res.reason, res.daysLeft));
    }
  }, [busy, cityId, name, createCrew, reload, resetForms]);

  const onJoin = useCallback(async () => {
    if (busy) return;
    const clean = normalizeCrewCode(code);
    if (clean.length !== CREW_CODE_LENGTH) {
      setError(refusalError('bad_code'));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await joinByCode(clean);
    setBusy(false);
    if (res.ok) {
      track(EVENTS.crewJoined, { via: 'code' });
      setFlash({ entry: C.rlWelcome, vars: { name: res.crew.name } });
      resetForms();
      setMode('home');
      reload();
    } else {
      setError(refusalError(res.reason, res.daysLeft));
    }
  }, [busy, code, joinByCode, reload, resetForms]);

  // « Inviter » n'ouvre plus directement la feuille de partage : il MÈNE à
  // l'écran d'invitation (QR + code + actions). Le CTA chartreuse de cet écran
  // reste unique — c'est la même porte, elle donne juste sur plus (§A).

  const onLeave = useCallback(() => {
    Alert.alert(
      t(C.rlLeaveConfirmTitle),
      t(C.rlLeaveConfirmBody, { days: CREW_SWITCH_COOLDOWN_DAYS }),
      [
        { text: t(C.rlCancel), style: 'cancel' },
        {
          text: t(C.rlLeave),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const res = await leaveCrew();
              if (res.ok) {
                setFlash({ entry: C.rlLeft });
                reload();
              } else {
                setFlash({ entry: C.rlErrGeneric });
              }
            })();
          },
        },
      ],
    );
  }, [leaveCrew, reload, t]);

  const kicker = useMemo(() => t(C.kickerSeason), [t]);

  // ── SIGNAUX CONTEXTUELS (A-44 A4) ──────────────────────────────────────────
  // La SITUATION vient de LA mission prioritaire, qui vient elle-même de faits
  // serveur. Elle n'est jamais choisie par l'écran, jamais devinée : mission
  // inconnue ⇒ situation null ⇒ AUCUN signal proposé. Proposer « Je défends ce
  // soir » sans savoir s'il y a quelque chose à défendre serait un mensonge poli.
  const situation = useMemo(() => crewSituationOf(mission), [mission]);

  // Zones RÉELLEMENT épinglables : celles où le crew tient ou vient de perdre,
  // ET qui portent un nom géocodé. Aucune zone n'est fabriquée ni nommée ici.
  const sectors = useMemo(() => pingableSectors(missionSectors), [missionSectors]);
  const sectorIds = useMemo(() => sectors.map((s) => s.id), [sectors]);

  // Le vocabulaire du moment. Sans zone épinglable, seuls les signaux SANS lieu
  // (« sortie ce soir ? ») restent — organiser une sortie ne demande pas de
  // territoire.
  const signals = useMemo(
    () => crewSignalsFor(situation, sectors.length > 0),
    [situation, sectors.length],
  );

  const onSendPing = useCallback(
    async (signal: CrewSignalKey, sectorId: string | null) => {
      if (busy) return;
      // Pré-vol PUR : évite un aller-retour perdu et, surtout, évite de proposer
      // une action qui sera refusée. Le serveur reste seul juge à l'écriture.
      const pre = crewPingDecision({
        nowMs: Date.now(),
        signal,
        situation,
        sectorId,
        pingableSectorIds: sectorIds,
        myActivePings: myPingState?.activeCount ?? 0,
        myLastPingAt: myPingState?.lastPingAt ?? null,
      });
      if (!pre.ok) {
        setFlash(pingRefusalMessage(pre.reason, pre.retryInS));
        setMode('home');
        setPendingSignal(null);
        return;
      }
      setBusy(true);
      const res = await sendPing(signal, sectorId);
      setBusy(false);
      setPendingSignal(null);
      setMode('home');
      if (res.ok) {
        // Clés de catalogue seulement — aucun nom de zone ni pseudo en analytics.
        track(EVENTS.crewSignalSent, {
          situation: situation ?? 'unknown',
          signal,
          has_sector: sectorId !== null,
        });
        setFlash({ entry: C.pingSent });
        reloadPings();
      } else {
        setFlash(pingRefusalMessage(res.reason, res.retryInS));
      }
    },
    [busy, situation, sectorIds, myPingState, sendPing, reloadPings],
  );

  // Rôle + contribution par membre (crew_overview, 0044). Le roster garde son
  // ORDRE D'ANCIENNETÉ (pas de reclassement quand la donnée arrive : l'écran ne
  // saute pas sous le doigt) ; l'overview ne fait qu'enrichir chaque ligne.
  const detailByUser = useMemo(() => {
    const map = new Map<string, { role: string; contributionPct: number; hexesHeld: number }>();
    for (const c of overview?.contributions ?? []) {
      map.set(c.userId, {
        role: c.role,
        contributionPct: c.contributionPct,
        hexesHeld: c.hexesHeld,
      });
    }
    return map;
  }, [overview]);

  /**
   * LE ROSTER TEL QU'IL S'AFFICHE (Guideline 1.2, 3ᵉ puce — audit B3).
   *
   * Un membre bloqué GARDE sa ligne : l'effectif du crew (« 4/6 ») est un fait
   * serveur, et le faire varier selon mes blocages ferait mentir le compteur.
   * C'est son IDENTITÉ qui disparaît — le seul élément que bloquer doit
   * masquer. MA ligne n'est jamais masquée : le formulaire de Confidentialité
   * accepte n'importe quelle saisie, y compris mon propre pseudo, et me voir
   * remplacé par « Joueur bloqué » dans mon crew serait absurde.
   *
   * `displayName` sert AUSSI la rangée d'aperçu (initiales) : sans elle, le
   * pseudo bloqué reviendrait deux blocs plus haut sous forme d'initiales.
   */
  const rosterRows = useMemo(
    () =>
      members.map((m) => {
        const blocked = !m.isMe && isPseudoBlocked(blockedPseudos, m.pseudo);
        return {
          ...m,
          blocked,
          displayName: blocked ? t(C.blockedPlayerRow) : m.pseudo,
        };
      }),
    [members, blockedPseudos, t],
  );
  const stripMembers = useMemo(
    () => rosterRows.map((r) => ({ userId: r.userId, pseudo: r.displayName, isMe: r.isMe })),
    [rosterRows],
  );

  // Le crew ne tient RIEN ⇒ aucune contribution affichée : « 0 % » sur toutes
  // les lignes n'apprend rien et encombre (§A). Le bloc territoire dit déjà,
  // en une phrase honnête, qu'il n'y a pas encore de territoire.
  const showContributions = (overview?.territory.hexesHeld ?? 0) > 0;

  /**
   * MA part du territoire du crew (planche : « Votre part »), ou `null`.
   *
   * `null` couvre les trois cas où la valeur n'est pas connue — overview pas lu,
   * crew sans territoire, ma ligne absente de l'agrégat — et il n'y a alors
   * AUCUNE ligne à l'écran. Un « 0 % » nu affirmerait une paresse là où on n'a
   * simplement pas la donnée (les quatre états distincts de CLAUDE.md).
   */
  const myShare = useMemo(() => {
    if (!showContributions) return null;
    const me = members.find((m) => m.isMe);
    if (!me) return null;
    return detailByUser.get(me.userId)?.contributionPct ?? null;
  }, [showContributions, members, detailByUser]);

  /**
   * CREW COMPLET — état RÉEL, dérivé du roster serveur et de CREW_MAX_MEMBERS.
   * Dans cet état, « Inviter » échouerait TOUJOURS (`full`, 0050) : on le retire
   * et on dit pourquoi, au lieu de peindre un CTA chartreuse mort (§A4).
   */
  const crewFull = memberCount >= maxMembers;

  /**
   * CREW SANS TERRITOIRE — la bascule vers le PLAN D'ACTION.
   *
   * ⚠ Elle exige `overview !== null` : `null` signifie « pas lu » (chargement OU
   * échec), jamais « zéro ». Sans ce garde-fou, un crew qui tient 40 zones
   * verrait « Votre premier territoire crew » pendant toute la lecture de
   * l'agrégat — un mensonge de quelques centaines de millisecondes, mais un
   * mensonge quand même.
   */
  const noTerritory = overview !== null && overview.territory.hexesHeld === 0;

  const crewViews: readonly SegmentedOption<CrewView>[] = useMemo(
    () => [
      { id: 'overview', label: t(C.segOverview) },
      { id: 'map', label: t(C.segMap) },
      { id: 'members', label: t(C.tabMembers) },
    ],
    [t],
  );

  // ── DÉCONNECTÉ / sans backend : aucun crew fictif, on invite à se connecter ──
  if (!ready) {
    return (
      <TabScreen title="Crew" kicker={kicker}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.rlSignedOutTitle)}</Text>
          <Text style={styles.body}>{t(C.rlSignedOutBody)}</Text>
          {configured ? (
            <View style={styles.cta}>
              <Button label={t(C.rlSignIn)} onPress={() => router.push('/sign-in')} />
            </View>
          ) : null}
        </View>
      </TabScreen>
    );
  }

  // ── AVEC CREW : nom, effectif, roster, inviter (CTA), quitter (discret) ──────
  if (crew) {
    // Écran d'invitation (QR de recrutement) — même état « mon crew », une
    // couche plus loin. Le retour ramène ici sans rien recharger.
    if (mode === 'invite') {
      return (
        <CrewInviteQRScreen
          crewName={crew.name}
          memberCount={memberCount}
          maxMembers={maxMembers}
          fetchMyCode={fetchMyCode}
          onBack={goHome}
        />
      );
    }

    /*
      ENVOYER UN SIGNAL — une couche plus loin, DEUX pas au maximum, un seul par
      écran (§A : 1 écran = 1 décision).
        pas 1 : QUEL signal (le vocabulaire de la situation, rien d'autre) ;
        pas 2 : SUR QUELLE ZONE — et seulement pour un signal qui en désigne une.
      Un signal de crew part au 1ᵉʳ tap : lui demander un lieu qu'il n'utilise
      pas serait une question sans objet.

      Aucun CTA chartreuse ici non plus : chaque choix EST l'action. Les lignes
      font sizes.touchTarget de haut, les libellés ne sont jamais tronqués
      (`numberOfLines` volontairement absent — un signal à moitié lu est un
      signal mal envoyé).
    */
    if (mode === 'signal') {
      const pendingDef: CrewSignalDef | null = pendingSignal
        ? signals.find((s) => s.key === pendingSignal) ?? null
        : null;
      const step2 = pendingDef !== null && pendingDef.scope === 'sector';
      return (
        <TabScreen title={t(step2 ? C.pingChooseSector : C.pingChooseSignal)} kicker={kicker}>
          {/* Prévenu AVANT d'envoyer : sans ça, on croirait avoir posté deux
              signaux alors que le premier vient de disparaître. */}
          {(myPingState?.activeCount ?? 0) >= CREW_PING_MAX_ACTIVE_PER_MEMBER ? (
            <Text style={styles.signalNotice}>{t(C.pingReplaceNotice)}</Text>
          ) : null}

          {/* Aucune zone épinglable : on le DIT (et les signaux sans lieu, eux,
              restent proposés au pas 1). Jamais un secteur par défaut. */}
          {!step2 && sectors.length === 0 ? (
            <Text style={styles.signalEmpty}>{t(C.pingNoSector)}</Text>
          ) : null}

          <View style={styles.signalList}>
            {step2
              ? sectors.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => void onSendPing(pendingSignal as CrewSignalKey, s.id)}
                    disabled={busy}
                    accessibilityRole="button"
                    style={styles.signalRow}
                  >
                    <Text style={styles.signalRowText}>{s.name}</Text>
                  </Pressable>
                ))
              : signals.map((sig) => (
                  <Pressable
                    key={sig.key}
                    onPress={() => {
                      if (sig.scope === 'crew') {
                        void onSendPing(sig.key, null);
                      } else {
                        setPendingSignal(sig.key);
                      }
                    }}
                    disabled={busy}
                    accessibilityRole="button"
                    style={styles.signalRow}
                  >
                    <Text style={styles.signalRowText}>{t(CREW_SIGNAL_E[sig.key])}</Text>
                  </Pressable>
                ))}
          </View>

          <View style={styles.leaveRow}>
            <Button variant="ghost" size="md"
              label={t(C.pingCancel)}
              onPress={() => {
                // Retour d'un pas : au pas 2 on revient au choix du signal, sinon
                // on quitte. Annuler ne doit jamais faire perdre deux décisions.
                if (step2) setPendingSignal(null);
                else setMode('home');
              }}
            />
          </View>
        </TabScreen>
      );
    }

    /*
      ── LE QG (planche E13) ─────────────────────────────────────────────────
      ScrollView PROPRE et non `TabScreen` : le hero porte le nom du crew, et
      `TabScreen` rend le sien AVANT ses enfants — les deux auraient fait
      doublon. Le dégagement bas reste celui de tous les onglets
      (`TAB_CONTENT_BOTTOM_CLEARANCE` : nav flottante + capsule GO).
    */
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + TAB_CONTENT_BOTTOM_CLEARANCE },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. APPARTENANCE — blason RÉEL, nom, et seulement les faits lus. */}
          <CrewHero
            crewId={crew.id}
            crewName={crew.name}
            cityId={crew.cityId}
            memberCount={memberCount}
            maxMembers={maxMembers}
            // `?? null` et non `?? 0` : tant que l'agrégat n'a pas répondu, le
            // rang n'existe pas — il ne vaut pas « premier ».
            cityRank={overview?.territory.cityRank ?? null}
            crewsInCity={overview?.territory.crewsInCity ?? null}
            topInset={insets.top}
          />

          {flash ? <Text style={styles.flash}>{t(flash.entry, flash.vars)}</Text> : null}

          {/* 2. LES 3 VUES. `tone="surface"` est OBLIGATOIRE ici : un CTA
              chartreuse existe déjà plus bas, et un seul focus chartreuse fort
              par scène (§A4). Aucun 4ᵉ segment « Chat » — ni backend, ni
              doctrine (A-43 §9). */}
          <Segmented
            options={crewViews}
            value={view}
            onChange={setView}
            tone="surface"
            accessibilityLabel={t(C.segA11y)}
            style={styles.segmented}
          />

          {/* ── VUE APERÇU ──────────────────────────────────────────────── */}
          {view === 'overview' ? (
            noTerritory ? (
              /*
                CREW SANS TERRITOIRE : un PLAN, pas un tableau de bord à zéro.
                Le CTA chartreuse du plan devient l'unique de l'écran — c'est
                pourquoi « Inviter » disparaît du bas de page dans cet état et
                redevient l'action de l'étape 1.
              */
              <CrewStarterPlan
                memberCount={memberCount}
                canInvite={!crewFull}
                onInvite={() => setMode('invite')}
                onOpenMap={() => router.push('/')}
              />
            ) : (
              <>
                {/*
                  NOTRE PRIORITÉ — maillon 3 de la boucle A-43 §0 (« je cours
                  pour l'AIDER ») et POINT FOCAL de la planche juste après le
                  hero : sans elle, le crew n'est qu'un compteur partagé.

                  Format doctrine : UNE phrase (ce qu'on fait) + le manque
                  CONCRET (combien, dans combien de temps) + UNE action. Tout
                  vient du moteur PUR `chooseCrewMission` nourri par des faits
                  serveur (0049) — aucun secteur, rival, distance ni délai n'est
                  inventé.

                  ⚠ NI BARRE DE PROGRESSION NI POURCENTAGE, contrairement à la
                  planche : aucune mission n'a de DÉNOMINATEUR. `defend` a un
                  compte et une échéance, `reclaim` un compte et une date,
                  `close_loop` des mètres manquants sans longueur totale,
                  `capture` une BORNE SUPÉRIEURE de zones libres (le code refuse
                  déjà d'en afficher le nombre, cf. `cmCaptureGap`). Un « 62 % »
                  serait un chiffre inventé ; le manque concret rendu ici est la
                  version vraie du même signal.

                  §A : ce bloc n'ajoute AUCUN CTA chartreuse — l'action de
                  mission est un lien. UNE seule surface (la card), et rien
                  d'encapsulé dedans (l'IconPlate est un contrôle N2, pas une
                  card).

                  TROIS états, et la nuance est le cœur du zéro-mensonge :
                   · mission === null  → on n'a PAS PU lire (chargement/échec) :
                     AUCUN bloc. On ne dit pas « aucune priorité » sans savoir.
                   · kind === 'none'   → on a lu, il n'y a rien : on le DIT.
                   · une mission       → la phrase + le manque chiffré.
                */}
                {mission ? (() => {
                  const copy = missionCopy(mission, Date.now());
                  if (!copy) return null;
                  return (
                    <Card style={styles.objective}>
                      <Text style={styles.kickerMono}>{t(C.cmLabel)}</Text>
                      {'note' in copy ? (
                        <Text style={styles.priorityNote}>{t(copy.note)}</Text>
                      ) : (
                        <>
                          <View style={styles.objectiveHead}>
                            <IconPlate
                              icon={missionIcon(mission.kind)}
                              size="md"
                              color={colors.chartreuse}
                            />
                            <View style={styles.objectiveBody}>
                              <Text style={styles.priorityTitle}>
                                {t(copy.title.entry, copy.title.vars)}
                              </Text>
                              <Text style={styles.priorityGap}>
                                {t(copy.gap.entry, copy.gap.vars)}
                              </Text>
                            </View>
                          </View>
                          {/* « Votre part » de la planche, nommée pour ce
                              qu'elle mesure VRAIMENT : ma part du TERRITOIRE
                              (0044), jamais une part de la mission — qui n'est
                              mesurée nulle part. Et en %, jamais en km² :
                              aucune aire n'existe côté serveur. */}
                          {myShare !== null ? (
                            <Text style={styles.myShare}>
                              {t(C.myTerritoryShare, { pct: myShare })}
                            </Text>
                          ) : null}
                          {/* Action INLINE (§A) : la carte est l'endroit où
                              l'on agit. Le libellé nomme la DESTINATION —
                              « Voir la mission › » promettrait un écran de
                              mission dédié, qui n'existe pas. */}
                          <Pressable
                            onPress={() => router.push('/')}
                            accessibilityRole="link"
                            accessibilityLabel={t(C.cmSeeOnMap)}
                            hitSlop={8}
                            style={styles.inlineLink}
                          >
                            <Text style={styles.priorityAction}>{t(C.cmSeeOnMap)}</Text>
                            <Icon name="chevron" size={iconSizes.sm} color={colors.chartreuse} />
                          </Pressable>
                        </>
                      )}
                    </Card>
                  );
                })() : null}

                {/*
                  ACTIVITÉ (planche) = SIGNAUX DU CREW (A-44 A4/A5), plafonnés à
                  ACTIVITY_MAX lignes et datés « texte · heure ».

                  ⚠ LE LIBELLÉ RESTE « SIGNAUX DU CREW », pas « ACTIVITÉ ». La
                  planche illustre des captures, des défenses et des arrivées de
                  membres : rien de tout cela n'est lu ici. Titrer « ACTIVITÉ »
                  un fil qui ne contient que des signaux ferait conclure, devant
                  une liste vide, qu'il ne s'est rien passé dans le crew — alors
                  qu'on n'en sait rien. Le libellé précis est le seul honnête.

                  Le chat LIBRE reste refusé (A-43 §9) : chaque ligne est un
                  couple (signal du catalogue FERMÉ) × (secteur RÉEL), composé
                  ici dans la langue du lecteur. Aucun caractère saisi par un
                  humain n'y entre.

                  TROIS états, même nuance que la mission :
                   · pings === null → on n'a PAS PU lire : AUCUN bloc ;
                   · []             → le serveur a dit « rien » : on le DIT ;
                   · des pings      → les lignes, les plus récentes d'abord.

                  Le lien d'envoi n'apparaît que si un vocabulaire a du SENS
                  maintenant (`signals.length > 0`, donc situation connue) :
                  sans mission lisible, il ouvrirait une liste vide.
                */}
                {pings ? (
                  <View style={styles.signals}>
                    <Text style={styles.sectionLabel}>{t(C.pingLabel)}</Text>
                    {pings.length === 0 ? (
                      <Text style={styles.signalEmpty}>{t(C.pingEmpty)}</Text>
                    ) : (
                      pings.slice(0, ACTIVITY_MAX).map((p) => (
                        <View key={p.id} style={styles.activityRow}>
                          {/* Puce par RÔLE (§C) : tous ces signaux viennent de
                              MON crew, donc chartreuse — jamais une couleur par
                              membre ni par crew. */}
                          <View style={styles.activityDot} />
                          {/* Pas de numberOfLines : un signal tronqué est un
                              signal mal lu (§A.9). La ligne enveloppe. */}
                          <Text style={styles.signalLine}>
                            {p.sectorName
                              ? t(C.pingLine, {
                                  author: p.authorPseudo,
                                  sector: p.sectorName,
                                  signal: t(CREW_SIGNAL_E[p.signal]),
                                })
                              : t(C.pingLineNoSector, {
                                  author: p.authorPseudo,
                                  signal: t(CREW_SIGNAL_E[p.signal]),
                                })}
                          </Text>
                          <Text style={styles.activityTime}>
                            {shortTime(p.createdAt, locale)}
                          </Text>
                        </View>
                      ))
                    )}
                    {signals.length > 0 ? (
                      <Pressable
                        onPress={() => {
                          setPendingSignal(null);
                          setMode('signal');
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t(C.pingOpen)}
                        hitSlop={8}
                        style={styles.inlineLink}
                      >
                        <Text style={styles.priorityAction}>{t(C.pingOpen)}</Text>
                        <Icon name="chevron" size={iconSizes.sm} color={colors.chartreuse} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {/* Rangée de membres + accès à la vue Membres (planche). */}
                {/* `stripMembers` et non `members` : les initiales sont dérivées
                    du pseudo, donc un membre bloqué serait revenu ici sous ses
                    vraies initiales alors que le roster le masque (B3). */}
                <CrewMembersStrip
                  members={stripMembers}
                  onOpenMembers={() => setView('members')}
                />
              </>
            )
          ) : null}

          {/* ── VUE CARTE ───────────────────────────────────────────────────
              TERRITOIRE — maillon 2 de la boucle A-43 « je vois ce que mon crew
              contrôle ». Bloc d'INFO, jamais un bouton. Absent tant que
              `crew_overview` n'a rien renvoyé (chargement OU échec) : ne rien
              dire vaut mieux que dire « 0 zone » à tort.

              ⚠ AUCUNE AIRE en km², contrairement à la planche : le serveur n'en
              émet pas (0044, choix n°1) et `real.ts:58-67` interdit d'en
              fabriquer une depuis `hexesHeld`. « N zones tenues » est la mesure
              qui existe. Aucun delta hebdomadaire non plus — aucune table ne
              conserve les pertes agrégées, donc aucun solde n'est calculable, et
              une flèche « ▲ » affirmerait précisément ce solde. */}
          {view === 'map' ? (
            overview ? (
              <View style={styles.territory}>
                <Text style={styles.sectionLabel}>{t(C.rlTerritoryLabel)}</Text>
                {overview.territory.hexesHeld > 0 ? (
                  <>
                    <Text style={styles.territoryValue}>
                      {overview.territory.hexesHeld === 1
                        ? t(C.rlZonesHeldOne)
                        : t(C.rlZonesHeldN, { n: overview.territory.hexesHeld })}
                    </Text>
                    {/* Rang tu si le crew est seul dans sa ville : « 1 sur 1 »
                        n'est pas un classement, c'est du bruit. */}
                    {overview.territory.cityRank !== null &&
                    overview.territory.crewsInCity !== null &&
                    overview.territory.crewsInCity > 1 ? (
                      <Text style={styles.territoryHint}>
                        {t(C.rlCityRank, {
                          rank: overview.territory.cityRank,
                          total: overview.territory.crewsInCity,
                        })}
                      </Text>
                    ) : null}
                    {/* Bande des secteurs NOMMÉS, tirée des faits déjà chargés
                        pour la mission (aucune lecture de plus). */}
                    <CrewTerritoryStrip sectors={missionSectors} />
                    <Pressable
                      onPress={() => router.push('/')}
                      accessibilityRole="link"
                      accessibilityLabel={t(C.cmSeeOnMap)}
                      hitSlop={8}
                      style={styles.inlineLink}
                    >
                      <Text style={styles.priorityAction}>{t(C.cmSeeOnMap)}</Text>
                      <Icon name="chevron" size={iconSizes.sm} color={colors.chartreuse} />
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.territoryEmpty}>{t(C.rlNoTerritory)}</Text>
                )}
              </View>
            ) : (
              /*
                L'AGRÉGAT N'EST PAS LÀ. Ne rien rendre laisserait une vue VIDE
                sous le segmented — ça n'affirme rien, mais ça ressemble à un
                écran cassé (CLAUDE.md : jamais d'écran blanc). On nomme donc
                l'état, et on distingue les deux : « je lis » n'est pas « je n'ai
                pas pu lire », et aucun des deux n'est « 0 zone ».
              */
              <View style={styles.territory}>
                <Text style={styles.sectionLabel}>{t(C.rlTerritoryLabel)}</Text>
                <Text style={styles.territoryEmpty}>
                  {t(overviewLoading ? C.territoryReading : C.territoryUnavailable)}
                </Text>
                {!overviewLoading ? (
                  <Pressable
                    onPress={reload}
                    accessibilityRole="button"
                    accessibilityLabel={t(C.rlRetry)}
                    hitSlop={8}
                    style={styles.inlineLink}
                  >
                    <Text style={styles.priorityAction}>{t(C.rlRetry)}</Text>
                  </Pressable>
                ) : null}
              </View>
            )
          ) : null}

          {/* ── VUE MEMBRES ─────────────────────────────────────────────── */}
          {view === 'members' ? (
            <View style={styles.roster}>
              {rosterRows.map((m, i) => {
                const detail = detailByUser.get(m.userId);
                const roleEntry = detail ? roleLabelEntry(detail.role) : null;
                // Guideline 1.2 — l'affordance « … » n'est peinte que si un
                // geste est réellement possible : jamais sur MA ligne, jamais
                // sur une ligne sans identité lisible (repli « — »).
                const canModerate = canModeratePlayer({
                  // `ready` = client Supabase + session (real.ts:418) : c'est
                  // exactement la condition sous laquelle `reportContent` écrit
                  // vraiment dans `content_reports`.
                  pseudo: m.pseudo,
                  isMe: m.isMe,
                  canReport: ready,
                  blocked: blockedPseudos,
                });
                return (
                  <View
                    key={m.userId}
                    style={[styles.memberRow, i < rosterRows.length - 1 && styles.memberDivider]}
                  >
                    <View style={styles.memberIdentity}>
                      <View style={styles.memberNameRow}>
                        {/* `clip` et non « … » (§A.9) — et un membre bloqué est
                            rendu en GRIS : c'est un état, pas un pseudo. */}
                        <Text
                          style={[styles.memberName, m.blocked && styles.memberNameBlocked]}
                          numberOfLines={1}
                          ellipsizeMode="clip"
                        >
                          {m.displayName}
                        </Text>
                        {m.isMe ? <Text style={styles.youTag}>{t(C.rlYouTag)}</Text> : null}
                      </View>
                      {/* Le RÔLE rend le fondateur identifiable (correctif
                          A-43). Il reste de l'AFFICHAGE : aucune action de
                          gestion (promouvoir, exclure, assigner) n'est peinte —
                          aucune RPC rôle-gatée n'existe (0010 : « endpoints
                          rôle-gated = TODO V1 »). */}
                      {roleEntry ? <Text style={styles.memberRole}>{t(roleEntry)}</Text> : null}
                    </View>
                    {/* MEMBRE INACTIF JAMAIS HUMILIÉ (planche) : un « 0 % »
                        collé en face d'un pseudo est un classement de la
                        paresse. Tant qu'un membre ne tient aucune zone, sa
                        ligne ne porte simplement pas de chiffre. */}
                    {showContributions && detail && detail.hexesHeld > 0 ? (
                      <Text style={styles.memberPct}>
                        {t(C.rlContributionPct, { pct: detail.contributionPct })}
                      </Text>
                    ) : null}
                    {/* SIGNALER / BLOQUER AU CONTACT DU JOUEUR (audit B4) : la
                        ligne était une `View` sans le moindre `onPress`, et le
                        seul chemin de signalement exigeait de retaper à la main
                        un identifiant machine. Le « … » reste GRIS — le CTA
                        chartreuse de l'écran demeure « Inviter » (§A4). */}
                    {canModerate ? (
                      <PlayerActionsButton
                        name={m.displayName}
                        onPress={() => setModerationTarget(m.pseudo)}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : null}

          {/*
            ACTIONS D'ÉCRAN — sous les trois vues, donc atteignables partout.

            « Inviter » disparaît dans DEUX cas, et pour la même raison (§A4 : ne
            jamais peindre une action qui échoue toujours, a fortiori en
            chartreuse) :
             · crew COMPLET  → `join_crew_by_code` refuserait (`full`, 0050). On
               le dit au lieu de laisser le joueur partager un code inutile ;
             · crew SANS TERRITOIRE → le plan d'action porte déjà l'unique CTA
               chartreuse, et l'invitation y est l'étape 1.
          */}
          {/*
            LES CANDIDATURES REÇUES — livrées AVEC la découverte, jamais après.
            Depuis 0083, un joueur peut demander à rejoindre un crew depuis sa
            fiche publique ; sans ce bloc, sa demande n'aurait aucun lecteur et
            le bouton d'en face ferait semblant. Le composant se retire de
            lui-même quand je n'ai pas le droit de décider ou qu'il n'y a rien à
            trancher — il n'affiche jamais un « 0 demande ».
          */}
          <CrewJoinRequests />

          {crewFull ? <Text style={styles.fullNotice}>{t(C.crewFullNotice)}</Text> : null}
          {!crewFull && !noTerritory ? (
            <View style={styles.cta}>
              <Button label={t(C.rlShareCode)} icon="partage" onPress={() => setMode('invite')} />
            </View>
          ) : null}
          <View style={styles.leaveRow}>
            <Button variant="ghost" size="md" label={t(C.rlLeave)} onPress={onLeave} />
          </View>
        </ScrollView>
        {/* La feuille { Signaler · Bloquer }, PRÉ-REMPLIE avec le joueur de la
            ligne tapée. Montée une seule fois : c'est `moderationTarget` qui
            l'ouvre, jamais un composant par ligne. */}
        <PlayerModerationSheet
          pseudo={moderationTarget}
          onClose={() => setModerationTarget(null)}
        />
      </View>
    );
  }

  // ── CRÉATION ────────────────────────────────────────────────────────────────
  if (mode === 'create') {
    const canSubmit = name.trim().length > 0 && !!cityId;
    return (
      <TabScreen title={t(C.rlCreateTitle)} kicker={kicker}>
        <View style={styles.block}>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t(C.rlNamePlaceholder)}
            placeholderTextColor={colors.gris}
            maxLength={40}
            autoCapitalize="words"
            returnKeyType="done"
            // « Done » VALIDE (retour terrain 20/07) : la touche existait mais
            // ne faisait rien — il fallait fermer le clavier à la main pour
            // atteindre le CTA. Ici le geste naturel crée le crew.
            onSubmitEditing={() => {
              if (canSubmit && !busy) void onCreate();
            }}
            accessibilityLabel={t(C.rlNamePlaceholder)}
          />

          {/* LE SÉLECTEUR PARTAGÉ. `openOnly` : seules les villes réellement
              ouvertes sont choisissables ici, parce que ce sont les seules que
              `create_crew` accepte. Les autres ne sont plus un cul-de-sac : le
              sélecteur sait désormais les OUVRIR (Edge Function `open_city`), et
              rend alors la ville avec le statut que le serveur vient de
              confirmer — c'est ce qui débloque « choisir n'importe quelle ville ». */}
          <CityField selectedId={cityId} onSelect={setCity} openOnly />
          {/* Le refus est DIT avant le tap, pas après : le CTA est désactivé et
              l'écran explique ce qui manque. */}
          {!cityId ? (
            <Text style={styles.cityNote}>{t(CityC.crewNeedsOpenCity)}</Text>
          ) : null}

          {error ? <Text style={styles.error}>{t(error.entry, error.vars)}</Text> : null}

          <View style={styles.cta}>
            <Button
              label={t(C.rlCreateCta)}
              onPress={() => void onCreate()}
              loading={busy}
              disabled={!canSubmit}
            />
          </View>
          <View style={styles.leaveRow}>
            <Button variant="ghost" size="md" label={t(C.rlBack)} onPress={goHome} />
          </View>
        </View>
      </TabScreen>
    );
  }

  // ── REJOINDRE PAR CODE ──────────────────────────────────────────────────────
  if (mode === 'join') {
    const canSubmit = normalizeCrewCode(code).length === CREW_CODE_LENGTH;
    return (
      <TabScreen title={t(C.rlJoinTitle)} kicker={kicker}>
        <View style={styles.block}>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={(v) => setCode(normalizeCrewCode(v))}
            placeholder={t(C.rlCodePlaceholder, { n: CREW_CODE_LENGTH })}
            placeholderTextColor={colors.gris}
            maxLength={CREW_CODE_LENGTH}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            // Code complet + « Done » = on rejoint, sans chercher le bouton.
            onSubmitEditing={() => {
              if (canSubmit && !busy) void onJoin();
            }}
            accessibilityLabel={t(C.rlCodePlaceholder, { n: CREW_CODE_LENGTH })}
          />

          {error ? <Text style={styles.error}>{t(error.entry, error.vars)}</Text> : null}

          <View style={styles.cta}>
            <Button
              label={t(C.rlJoinCta)}
              onPress={() => void onJoin()}
              loading={busy}
              disabled={!canSubmit}
            />
          </View>
          <View style={styles.leaveRow}>
            <Button variant="ghost" size="md" label={t(C.rlBack)} onPress={goHome} />
          </View>
        </View>
      </TabScreen>
    );
  }

  /*
    ── ÉCHEC DE CHARGEMENT ───────────────────────────────────────────────────
    Le troisième état, distinct des deux autres, et celui qu'on rendait faux :
    la lecture d'adhésion a échoué, donc on NE SAIT PAS si l'utilisateur a un
    crew. Avant, ce cas retombait sur l'écran « sans crew » ci-dessous et
    affirmait « Personne ne tient un quartier seul · Fonde le tien » à quelqu'un
    qui a peut-être un crew de 8 personnes et du territoire — en l'invitant à en
    créer un DOUBLON.

    Ici : on dit l'échec, on ne prétend rien sur le crew, et la seule action
    proposée est de réessayer (1 CTA chartreuse, §A). Ni « Créer », ni
    « J'ai un code » : les deux agiraient sur un état inconnu.
  */
  if (loadFailed) {
    return (
      <TabScreen title="Crew" kicker={kicker}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.rlLoadFailedTitle)}</Text>
          <Text style={styles.body}>{t(C.rlLoadFailedBody)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      </TabScreen>
    );
  }

  /*
    ── E38 · SANS CREW : DÉCOUVERTE-FIRST ──────────────────────────────────────
    La planche E38 impose un ordre précis : carte héro « Trouvez votre crew »,
    CTA `DÉCOUVRIR LES CREWS`, secondaire `CRÉER UN CREW`, et une explication de
    trois lignes maximum. Sa logique tient en une phrase : « proposer d'abord
    les crews locaux pertinents, pas un annuaire mondial ».

    ⚠ CE N'EST PAS UN SIMPLE ÉCHANGE DE BOUTONS — l'écran promouvait « Créer mon
    crew » parce que découvrir était IMPOSSIBLE : `/crew-discovery` était un
    `<Redirect href="/crew"/>` (vitrine supprimée, A-47), et le seul chemin réel
    vers un crew était un CODE, c'est-à-dire un secret qu'il fallait déjà avoir
    reçu de quelqu'un. Mettre « Découvrir » en tête aurait été un bouton mort.
    Il ne l'est plus : la migration 0083 pose `crew_discovery` /
    `crew_public_profile` / `crew_join_intent`, et l'écran de découverte lit des
    crews RÉELS. La hiérarchie de la planche devient donc tenable — et le
    fondateur solo garde « Créer un crew » à un tap, en secondaire.

    Le pitch reste une vérité générale, pas une affirmation sur l'utilisateur :
    il peut rester pendant la 1ʳᵉ lecture sans mentir, et évite l'écran blanc.
    Les ACTIONS, elles, présupposent qu'on n'a pas de crew ; tant que la lecture
    est en vol elles restent visibles (la page ne saute pas) mais INERTES.
    Exception : « Découvrir » n'a PAS besoin de cette garde — cet écran-là est
    valable qu'on ait un crew ou non (il le dit et retire ses adhésions), donc
    le désactiver ferait attendre pour rien.
  */
  return (
    <TabScreen title="Crew" kicker={kicker} subtitle={loading ? undefined : t(C.emptySubtitle)}>
      {flash ? <Text style={styles.flash}>{t(flash.entry, flash.vars)}</Text> : null}
      <View style={styles.block}>
        <Text style={styles.title}>{t(C.dHeroTitle)}</Text>
        {/* Explication : DEUX phrases, sous le plafond de trois lignes de la
            planche, et aucune ne promet un crew qui n'existerait pas. */}
        <Text style={styles.body}>{t(C.dHeroBody)}</Text>
        <View style={styles.cta}>
          <Button
            label={t(C.dDiscoverCta)}
            onPress={() => router.push('/crew-discovery')}
            analyticsId="crew_discover"
          />
        </View>
        {/* Les deux autres chemins en GHOST : un seul CTA chartreuse (§A4). */}
        <View style={styles.leaveRow}>
          <Button variant="ghost" size="md"
            label={t(C.dCreateSecondary)}
            disabled={loading}
            onPress={() => {
              resetForms();
              setMode('create');
            }}
          />
        </View>
        <View style={styles.leaveRow}>
          <Button variant="ghost" size="md"
            label={t(C.rlHaveCode)}
            disabled={loading}
            onPress={() => {
              resetForms();
              setMode('join');
            }}
          />
        </View>
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  // Racine du QG (le ScrollView maison remplace TabScreen sur cette branche).
  root: { flex: 1, backgroundColor: colors.noir },
  content: { paddingHorizontal: spacing.cardPadding },

  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  cta: { marginTop: spacing.sm },
  leaveRow: { marginTop: spacing.xs, alignItems: 'center' },
  /** Motif du retrait de « Inviter » — dit, jamais laissé deviner. */
  fullNotice: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20, marginTop: spacing.lg },

  segmented: { marginTop: spacing.lg },

  /**
   * NOTRE PRIORITÉ — la SEULE card de l'écran (point focal de la planche juste
   * après le hero). Elle ne contient aucune autre surface : l'IconPlate est un
   * contrôle N2, pas une card, donc pas de card-dans-card (§A).
   */
  objective: { marginTop: spacing.lg, gap: spacing.sm },
  objectiveHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  objectiveBody: { flex: 1, gap: spacing.xxs },
  /** Kicker mono de la card (planche). */
  kickerMono: { color: colors.gris, fontFamily: fonts.mono, fontSize: fontSizes.xs, letterSpacing: 1.5 },
  /** MA part du territoire — en %, jamais en km² (aucune aire n'existe). */
  myShare: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },

  // Territoire : bloc à plat (surtout PAS une card — le roster n'en est pas une
  // non plus, deux cards imbriquées ou juxtaposées casseraient §A).
  priorityTitle: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '700' },
  priorityGap: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  priorityNote: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  // Lien discret, jamais un CTA : le seul bouton chartreuse de l'écran reste
  // « Inviter ». Chartreuse sur fond SOMBRE uniquement (contraste OK).
  priorityAction: {
    color: colors.chartreuse,
    fontSize: fontSizes.md,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
  },
  /** Lien inline + chevron (planche : « … › ») — plancher tactile via hitSlop. */
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xs },
  // SIGNAUX : bloc à plat (pas de card, §A). La hiérarchie vient de la taille
  // et de la position, comme pour NOTRE PRIORITÉ juste au-dessus.
  signals: { marginTop: spacing.xl, gap: spacing.xs },
  /**
   * Une ligne d'activité = puce de RÔLE + texte (qui enveloppe, jamais tronqué)
   * + heure alignée à droite. L'heure ne rétrécit pas (`flexShrink: 0`) : c'est
   * un fait court, c'est le texte qui doit céder de la place.
   */
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    marginTop: spacing.xs,
    flexShrink: 0,
  },
  activityTime: {
    color: colors.grisFaible,
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    lineHeight: 22,
    flexShrink: 0,
  },
  // Pas de numberOfLines : un signal tronqué est un signal mal lu (§A).
  signalLine: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: 22, flex: 1 },
  signalEmpty: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  signalNotice: { color: colors.gris, fontSize: fontSizes.sm, marginTop: spacing.lg, lineHeight: 20 },
  signalList: { marginTop: spacing.lg },
  // Plancher tactile : chaque choix EST l'action, il doit être atteignable au
  // pouce. sizes.touchTarget vient des tokens — aucun 44 en dur.
  signalRow: {
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
  },
  signalRowText: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: 22 },

  territory: { marginTop: spacing.xl, gap: spacing.xs },
  sectionLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1.5 },
  territoryValue: { color: colors.blanc, fontSize: fontSizes.xl, fontWeight: '700' },
  territoryHint: { color: colors.gris, fontSize: fontSizes.sm },
  territoryEmpty: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },

  roster: { marginTop: spacing.lg, marginBottom: spacing.lg },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  memberDivider: { borderBottomWidth: 1, borderBottomColor: colors.grisLigne },
  // flexShrink sur la colonne d'identité : le % (court, jamais tronqué) garde
  // sa place, seul un pseudo très long s'ellipse.
  memberIdentity: { flexShrink: 1, gap: 2 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberName: { color: colors.blanc, fontSize: fontSizes.md, flexShrink: 1 },
  // « Joueur bloqué » n'est pas un pseudo : il est rendu comme un ÉTAT (gris,
  // italique), pour qu'on ne le confonde jamais avec le nom de quelqu'un.
  memberNameBlocked: { color: colors.gris, fontStyle: 'italic' },
  memberRole: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1 },
  memberPct: { color: colors.blanc, fontSize: fontSizes.sm, flexShrink: 0 },
  youTag: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1 },

  // Formulaires
  input: {
    backgroundColor: elevation.raised,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    color: colors.blanc,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  codeInput: { letterSpacing: 6, textAlign: 'center', fontSize: fontSizes.lg },
  fieldLabel: { color: colors.gris, fontSize: fontSizes.sm, letterSpacing: 1 },
  /** Note de refus sous le sélecteur : gris, jamais tronquée. */
  cityNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 18 },

  error: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  flash: { color: colors.chartreuse, fontSize: fontSizes.sm, marginTop: spacing.lg },
});
