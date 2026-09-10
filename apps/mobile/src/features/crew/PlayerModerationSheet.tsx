/**
 * GRYD — SIGNALER / BLOQUER AU CONTACT DU JOUEUR (App Store Guideline 1.2).
 *
 * Apple exige « a mechanism for users to flag objectionable content » et « the
 * ability to block abusive users from the service ». Le seul chemin existant
 * était : Profil → Confidentialité → dépli « Blocage & signalement » → RETAPER À
 * LA MAIN un pseudo qui est un identifiant machine (`runner_` + 12 hexadécimaux)
 * et qui n'est affiché nulle part en entier. Un mécanisme qu'on ne peut pas
 * atteindre depuis le contenu ne satisfait pas la puce (audit App Store, B4).
 *
 * Ce fichier pose l'affordance MANQUANTE, sur les deux seules surfaces qui
 * affichent le pseudo d'un tiers (roster de crew, classement de saison) :
 *   · `PlayerActionsButton` — un « … » DISCRET en bout de ligne. Gris, jamais
 *     chartreuse : §A4 (« 1 seul CTA chartreuse par écran ») n'est pas entamé,
 *     et le CTA de l'écran reste le seul point focal ;
 *   · `PlayerModerationSheet` — la feuille { Signaler · Bloquer }, PRÉ-REMPLIE
 *     avec le joueur de la ligne. Elle appelle `reportContent` / `blockMember`
 *     de `moderation.ts`, déjà branchés sur `content_reports` / `user_blocks` —
 *     rien n'est réimplémenté, la charge utile vient de `blocklist.ts` (pur).
 *
 * ─── DEUX PAS MAXIMUM, ET AUCUN ALERT ────────────────────────────────────────
 * §A1 « 1 écran = 1 décision » : la feuille pose UNE question (que faire de ce
 * joueur), et le motif n'apparaît QUE si l'on a choisi de signaler. La
 * confirmation d'envoi est un 3ᵉ état DE LA FEUILLE, pas un `Alert` : sur Expo
 * Web `Alert.alert` ne rend rien, et un accusé de réception invisible sur une
 * plateforme est un accusé de réception qui ment. Le blocage, lui, n'a besoin
 * d'aucun accusé : la ligne devient « Joueur bloqué » sous le doigt.
 *
 * ─── CE QUI N'EST PAS PEINT, ET POURQUOI ─────────────────────────────────────
 * « Signaler » n'existe QUE sous session : hors session `reportContent` reste
 * local et n'atteint personne (`moderation.ts`) — le peindre serait un bouton
 * mort et l'accusé « examiné sous {h} h » un mensonge. C'est la règle déjà
 * appliquée par l'écran Confidentialité, dérivée ici par `moderationActionsFor`
 * (fonction pure, testée) plutôt que réécrite à la main.
 */
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CREW_KICK_NOTE_MAX,
  CREW_KICK_REASONS,
  CREW_KICK_REASON_REQUIRING_NOTE,
  CREW_MEMBER_ACTIONS,
  CREW_REJOIN_AFTER_KICK_DAYS,
  colors,
  fontSizes,
  radii,
  sizes,
  spacing,
  typography,
  withAlpha,
  type CrewKickReason,
  type CrewRole,
} from '@klaim/shared';
import { C, CREW_DUTY_HELP_E, CREW_ROLE_E } from '../../i18n/catalog/crew';
import { CREW_KICK_REASON_E, G } from '../../i18n/catalog/crewGestion';
import { C as CReg } from '../../i18n/catalog/reglages';
import { useT } from '../../i18n/store';
import { useSession } from '../../lib/session';
import { EVENTS, track } from '../../lib/analytics';
import { Button } from '../../ui/Button';
import {
  REPORT_REASONS,
  REPORT_REVIEW_HOURS,
  blockMember,
  reportContent,
  unblockMember,
  useModeration,
  type ReportReason,
} from './moderation';
import {
  blockTargetFor,
  blockedPseudoSet,
  memberReportInput,
  moderationActionsFor,
} from './blocklist';
import { assignableRolesFor, dutyOf, isCrewRole, nextRoleDown, nextRoleUp, roleActionsFor, roleRank } from './memberRoles';
import {
  setMemberRole,
  transferLead,
  type MemberActionOutcome,
  type MemberActionRefusal,
} from './memberRolesData';
import {
  removeMemberWithReason,
  warnMember,
  type WriteOutcome,
} from './management/crewManagementData';
import { dayText } from './management/crewManagementCopy';
import { useLocale } from '../../i18n/store';

/**
 * Un geste EN ATTENTE DE CONFIRMATION. Le paramètre est capturé AU MOMENT DU
 * TAP et transporté jusqu'à l'appel : la confirmation affiche donc exactement
 * ce qui sera demandé, et non un état recalculé entre-temps.
 *
 * ⚠ `remove` PORTE DÉSORMAIS SON MOTIF. C'était le dernier endroit du lot où
 * l'exclusion partait muette : `crew_remove_member` (0093) n'a aucun paramètre
 * de motif, n'écrit aucune ligne de journal et ne notifie personne. La personne
 * exclue n'apprenait jamais pourquoi — la blessure du modèle Clash (spec §1.3
 * ⑤), que GRYD refuse explicitement (§2.10).
 */
type PendingRoleAction =
  | { key: 'promote' | 'demote'; role: CrewRole }
  | { key: 'remove'; reason: CrewKickReason; note: string }
  | { key: 'warn'; note: string }
  | { key: 'transfer_lead' };

/**
 * Motif de refus serveur → phrase. On NE DIT PAS mieux que le serveur, et on ne
 * transforme jamais un refus en « réessaie » : `forbidden` est une information,
 * pas une panne. Les motifs qui ne devraient pas atteindre l'écran (le gating
 * client les a déjà écartés) retombent sur la formulation la plus honnête :
 * « ton rôle ne permet pas ce geste ».
 */
function refusalEntry(reason: MemberActionRefusal) {
  switch (reason) {
    case 'out_of_scope':
      return C.maRefusedScope;
    case 'not_member':
      return C.maRefusedNotMember;
    case 'cannot_target_lead':
      return C.maRefusedLead;
    default:
      return C.maRefusedForbidden;
  }
}

/**
 * CE QUE LE SERVEUR A RÉPONDU à un avertissement ou à une exclusion, en une
 * phrase. Quatre issues, jamais confondues : fait · refusé avec SON motif ·
 * serveur sans la fonction · injoignable. On ne dit jamais mieux que le serveur,
 * et on ne transforme jamais un refus en « réessaie » : `forbidden` est une
 * information, pas une panne.
 *
 * `already_removed` et `unchanged` disent « c'était déjà fait », pas « c'est
 * fait » : la nuance est ce qui empêche un officier de croire qu'il vient
 * d'exclure quelqu'un qu'un autre avait déjà exclu.
 */
function managementText(
  res: WriteOutcome<string>,
  key: 'remove' | 'warn',
  t: ReturnType<typeof useT>,
  locale: string,
): string {
  if (res.kind === 'failed') return t(G.actionFailed);
  if (res.kind === 'unsupported') return t(G.refusedUnsupported);
  if (res.kind === 'refusal') {
    switch (res.reason) {
      case 'out_of_scope':
        return t(G.refusedScope);
      case 'not_member':
        return t(G.refusedNotMember);
      case 'cannot_target_lead':
        return t(G.refusedLead);
      case 'self':
        return t(G.refusedSelf);
      case 'forbidden':
        return t(G.refusedForbidden);
      case 'note_required':
        return t(G.kickNoteRequired);
      default:
        return t(G.refusedGeneric);
    }
  }
  if (key === 'warn') {
    return t(res.effect === 'unchanged' ? G.warnUnchanged : G.warnDone);
  }
  if (res.effect === 'already_removed') return t(C.maDoneAlready);
  // La date de re-adhésion vient du SERVEUR (`rejoinAllowedAt`) : la recalculer
  // ici la ferait diverger du jour où la constante change.
  const day = dayText(
    typeof res.data.rejoinAllowedAt === 'string' ? Date.parse(res.data.rejoinAllowedAt) : null,
    locale,
  );
  return day ? `${t(G.kickDone)} ${t(G.kickRejoin, { date: day })}` : t(G.kickDone);
}

/**
 * Pseudos bloqués sous leur forme de COMPARAISON, mémoïsée. C'est le pont entre
 * le store de modération (React) et le prédicat pur `isPseudoBlocked` que les
 * surfaces consomment ligne par ligne.
 *
 * ═══ LE DÉFAUT CORRIGÉ (10/09/2026) ═════════════════════════════════════════
 * Ce hook ne lisait que `user_blocks` — la table LEGACY, indexée par pseudo.
 * Or le fil (`crew-feed.tsx`) et le profil d'un membre (`member.tsx`) écrivent
 * dans `social_blocks_2026` (RPC `social_block_2026`, migration 0124), indexée
 * par COMPTE. Résultat : on bloquait quelqu'un depuis le fil, le serveur le
 * masquait bien du fil et du profil… et il restait visible dans le roster de
 * crew, qui filtrait avec cette liste-là. `useModeration` unit désormais les
 * deux mondes.
 *
 * L'ID DU COMPTE ENTRE AUSSI DANS L'INDEX. Deux surfaces peuvent afficher deux
 * noms pour la même personne (`users.pseudo` côté roster,
 * `user_profiles.display_name` côté profil 2026) : comparer par nom seul rate
 * ce cas. Un UUID n'est jamais un pseudo, l'ajouter n'élargit donc rien — il
 * permet aux surfaces qui tiennent un `userId` de filtrer sans ambiguïté.
 */
export function useBlockedPseudos(): ReadonlySet<string> {
  const { blocked, blockedPeople } = useModeration();
  return useMemo(
    () => blockedPseudoSet([...blocked, ...blockedPeople.map((p) => p.id)]),
    [blocked, blockedPeople],
  );
}

/**
 * L'affordance « … » d'une ligne. Discrète par construction : glyphe gris, pas
 * de fond, pas de bordure — mais avec un `hitSlop` qui lui donne une cible
 * tactile réelle, et un nom accessible qui DIT de qui il s'agit (« Actions pour
 * K.Runner75 »), sans quoi VoiceOver n'annoncerait que « points de suspension ».
 */
export function PlayerActionsButton({ name, onPress }: { name: string; onPress: () => void }) {
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.playerActionsA11y, { name })}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [styles.more, pressed && styles.pressed]}
    >
      <Text style={styles.moreGlyph}>···</Text>
    </Pressable>
  );
}

/**
 * Les états de la feuille — jamais deux questions à la fois.
 * `confirm` et `result` sont venus avec E47 (28/07/2026) : une action sensible
 * se confirme DANS la feuille (jamais un `Alert`, invisible sur Expo Web), et
 * ce que le serveur a répondu s'affiche là où le geste a été fait.
 */
/**
 * `sent` = le SERVEUR a accepté le signalement. `reportFailed` = il n'a RIEN
 * enregistré, et on le dit — l'étape n'existait pas avant le 28/07/2026, ce qui
 * obligeait l'écran à afficher « Signalement envoyé » dans les deux cas.
 */
type SheetStep =
  | 'choice'
  | 'role'
  | 'reason'
  | 'sent'
  | 'reportFailed'
  | 'confirm'
  | 'result'
  /** LOT Q3 : le motif d'exclusion, obligatoire, choisi dans un catalogue fermé. */
  | 'kick'
  /** LOT Q3 : l'avertissement, en UN temps (il n'exclut personne). */
  | 'warn';

/**
 * E47 — LE CONTEXTE DE CREW, OPTIONNEL PAR CONSTRUCTION.
 *
 * Sans lui, la feuille reste exactement ce qu'elle était : { Signaler ·
 * Bloquer }, deux droits de PERSONNE ouverts à tout le monde (Guideline 1.2).
 * Le classement de saison l'ouvre ainsi, et c'est juste — on n'y a aucun rôle.
 *
 * Avec lui, et SEULEMENT si mon rôle réel le permet, s'ajoutent les quatre
 * gestes de la spéc E47. Ils n'ont de sens que dans un crew : promouvoir
 * quelqu'un depuis un classement de ville ne veut rien dire.
 */
export interface MemberRoleContext {
  /** L'identifiant de la personne visée — la RPC ne travaille pas au pseudo. */
  userId: string;
  /** MON rôle, lu en base (`crew_overview.role`). Jamais choisi par le client. */
  actorRole: string;
  /** Le rôle de la personne visée, tel que le serveur l'a rendu. */
  targetRole: string;
  /**
   * Le nom du crew, pour l'APERÇU du message que la personne exclue recevra
   * (§4.1 E). Optionnel : les surfaces qui ne le connaissent pas n'affichent
   * pas une phrase à trou, elles n'affichent pas d'aperçu du tout.
   */
  crewName?: string | null;
  /** Relit le roster après un geste ABOUTI : on ne réécrit jamais la ligne ici. */
  onChanged: () => void;
}

export interface PlayerModerationSheetProps {
  /** Joueur de la ligne tapée, ou `null` : la feuille est fermée. */
  pseudo: string | null;
  onClose: () => void;
  /** E47 : présent uniquement sur le roster d'un crew. */
  crew?: MemberRoleContext | null;
}

export function PlayerModerationSheet({ pseudo, onClose, crew }: PlayerModerationSheetProps) {
  const t = useT();
  const locale = useLocale();
  const { session, configured } = useSession();
  const blocked = useBlockedPseudos();
  const [step, setStep] = useState<SheetStep>('choice');
  const [reason, setReason] = useState<ReportReason>('spam');
  /** Le geste de rôle en cours de confirmation, ou `null`. */
  const [pending, setPending] = useState<PendingRoleAction | null>(null);
  /** Ce que le serveur a répondu — jamais ce qu'on espérait qu'il réponde. */
  const [outcome, setOutcome] = useState<MemberActionOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  /** LOT Q3 — le motif d'exclusion en cours de choix, et la note qui l'accompagne. */
  const [kickReason, setKickReason] = useState<CrewKickReason>('inactivity');
  const [note, setNote] = useState('');
  /**
   * Le résultat des gestes de GESTION (avertir, exclure avec motif). Séparé de
   * `outcome` parce qu'ils n'ont pas les mêmes effets : `warned` et
   * `already_removed` ne se rangent pas dans le vocabulaire de 0093.
   */
  const [mgmtText, setMgmtText] = useState<string | null>(null);

  // Chaque ouverture repart de la question 1 : sans ça, rouvrir la feuille sur
  // un AUTRE joueur la rouvrirait sur l'accusé de réception du précédent.
  useEffect(() => {
    if (pseudo !== null) {
      setStep('choice');
      setReason('spam');
      setPending(null);
      setOutcome(null);
      setBusy(false);
      setKickReason('inactivity');
      setNote('');
      setMgmtText(null);
    }
  }, [pseudo]);

  const target = pseudo === null ? null : blockTargetFor(pseudo);
  const actions = moderationActionsFor({
    pseudo: pseudo ?? '',
    isMe: false, // MA ligne ne peint pas l'affordance (cf. les deux surfaces).
    canReport: configured && session !== null,
    blocked,
  });

  const send = async () => {
    const input = pseudo === null ? null : memberReportInput(pseudo, reason);
    if (input === null) return;
    setBusy(true);
    // ON ATTEND LE VERDICT SERVEUR. Avant, `reportContent` partait en
    // fire-and-forget et l'écran enchaînait `setStep('sent')` : il affirmait
    // « ton signalement est enregistré » sans l'avoir vérifié une seule fois.
    const res = await reportContent(input);
    setBusy(false);
    // ⚠ AUCUNE CIBLE, AUCUN MOTIF (events.ts) : un identifiant de cible dirait
    // « qui signale qui » — le graphe social, la donnée la plus ré-identifiante
    // que GRYD manipule. Le motif, lui, est déjà dans `content_reports.reason`.
    // `effect` dit ce qui S'EST PASSÉ, pas ce qu'on espérait.
    track(EVENTS.crewMemberAction, {
      action: 'report',
      effect: res.state === 'recorded' ? 'done' : 'error',
    });
    setStep(res.state === 'recorded' ? 'sent' : 'reportFailed');
  };

  const doBlock = () => {
    if (target === null) return;
    blockMember(target);
    track(EVENTS.crewMemberAction, { action: 'block', effect: 'done' });
    // Aucun accusé : la ligne d'où l'on vient devient « Joueur bloqué ».
    onClose();
  };

  const doUnblock = () => {
    if (target === null) return;
    unblockMember(target);
    track(EVENTS.crewMemberAction, { action: 'unblock', effect: 'done' });
    onClose();
  };

  // ── E47 · LES QUATRE GESTES DE RÔLE ─────────────────────────────────────────
  /**
   * Ce que je peux RÉELLEMENT faire sur cette personne. `roleActionsFor` est le
   * miroir client des bornes de 0093 : sans contexte de crew, la liste est vide
   * et rien ne se peint — pas parce qu'on cache, mais parce qu'il n'y a rien à
   * proposer hors d'un crew.
   */
  const roleActions = useMemo(
    () =>
      crew
        ? roleActionsFor({
            actorRole: crew.actorRole,
            targetRole: crew.targetRole,
            // La feuille n'est jamais ouverte sur MA ligne (les deux surfaces
            // ne peignent pas l'affordance) — on le redit ici plutôt que de le
            // supposer, car `roleActionsFor` en fait sa toute première borne.
            isMe: false,
          })
        : [],
    [crew],
  );

  /**
   * `other` est le SEUL motif qui rend la note obligatoire, et c'est le SERVEUR
   * qui l'exige (`note_required`). On le dérive de game-rules plutôt que de
   * l'écrire en dur : le jour où le catalogue change, l'écran suit sans qu'on y
   * pense, et le bouton ne part jamais se faire refuser.
   */
  const kickNoteMissing =
    kickReason === CREW_KICK_REASON_REQUIRING_NOTE && note.trim().length === 0;

  /** Le rôle visé par une promotion / rétrogradation d'UN cran, ou `null`. */
  const upRole = crew ? nextRoleUp(crew.actorRole, crew.targetRole) : null;
  const downRole = crew ? nextRoleDown(crew.actorRole, crew.targetRole) : null;

  /**
   * TOUS les barreaux que MON rôle m'autorise à attribuer, du plus haut au plus
   * bas — la « liste FERMÉE » que le docblock d'`assignableRolesFor` annonçait
   * et que cette feuille n'offrait pas.
   *
   * ─── LE DÉFAUT QUE ÇA CORRIGE ────────────────────────────────────────────
   * Seuls `nextRoleUp` / `nextRoleDown` étaient peints : UN cran à la fois.
   * Nommer un modérateur (co_captain) à partir d'un rookie demandait donc CINQ
   * promotions successives, chacune avec son aller-retour serveur et sa
   * relecture de roster. Le cahier §13.3 confie au capitaine la gestion des
   * rôles ; une échelle à gravir n'est pas une gestion.
   *
   * Aucune borne n'est ajoutée ici : la liste vient telle quelle du module pur,
   * miroir de 0093, et le serveur rejuge tout.
   */
  const assignable = useMemo(
    () =>
      crew
        ? assignableRolesFor(crew.actorRole, crew.targetRole).sort(
            (a, b) => roleRank(b) - roleRank(a),
          )
        : [],
    [crew],
  );
  /*
   * Le bouton ne s'ajoute que s'il OUVRE quelque chose : avec deux barreaux au
   * plus, « promouvoir » et « rétrograder » les atteignent déjà tous les deux,
   * et une troisième porte vers la même chose serait du bruit.
   */
  const showRoleList = assignable.length > 2;

  /**
   * Lance un geste : direct s'il n'est pas sensible (`promote`), via l'étape de
   * confirmation sinon. La sensibilité vient de `CREW_MEMBER_ACTIONS`
   * (game-rules) — jamais d'un `if` écrit à la main ici, sans quoi ajouter une
   * action au catalogue laisserait sa confirmation à la charge du prochain.
   */
  const startRoleAction = (action: PendingRoleAction) => {
    const def = CREW_MEMBER_ACTIONS.find((a) => a.key === action.key);
    if (def?.sensitive) {
      setPending(action);
      setStep('confirm');
      return;
    }
    void runRoleAction(action);
  };

  /**
   * LES DEUX GESTES DE GESTION (LOT Q3). Ils passent par 0189, pas par 0093 :
   * l'exclusion porte son MOTIF, écrit une ligne de journal et notifie la
   * personne visée sans nommer qui a décidé.
   *
   * Le texte rendu est celui du SERVEUR traduit, jamais une supposition : un
   * `already_removed` dit « c'était déjà fait », pas « c'est fait ».
   */
  const runManagementAction = async (action: PendingRoleAction) => {
    if (!crew || busy || (action.key !== 'remove' && action.key !== 'warn')) return;
    setBusy(true);
    const res: WriteOutcome<string> =
      action.key === 'remove'
        ? await removeMemberWithReason(crew.userId, action.reason, action.note)
        : await warnMember(crew.userId, action.note);
    setBusy(false);
    setMgmtText(managementText(res, action.key, t, locale));
    setOutcome(null);
    setStep('result');
    if (res.kind === 'ok') {
      track(EVENTS.crewMemberAction, {
        action: action.key === 'remove' ? 'remove' : 'warn',
        effect:
          res.effect === 'unchanged' || res.effect === 'already_removed' ? 'unchanged' : 'done',
      });
      // On ne réécrit JAMAIS la ligne de notre côté : c'est le serveur qui sait.
      crew.onChanged();
      return;
    }
    if (res.kind === 'refusal') {
      track(EVENTS.crewMemberAction, {
        action: action.key === 'remove' ? 'remove' : 'warn',
        effect: 'refused',
      });
    }
  };

  const runRoleAction = async (action: PendingRoleAction) => {
    if (!crew || busy) return;
    if (action.key === 'remove' || action.key === 'warn') {
      await runManagementAction(action);
      return;
    }
    setBusy(true);
    const res =
      action.key === 'transfer_lead'
        ? await transferLead(crew.userId)
        : await setMemberRole(crew.userId, action.role);
    setBusy(false);
    setOutcome(res);
    setMgmtText(null);
    setStep('result');
    /*
      L'EFFET MESURÉ EST CELUI DU SERVEUR, jamais l'intention. Un fondateur qui
      tente dix exclusions refusées ne doit pas produire la même série que dix
      exclusions abouties — sans `effect`, l'event ne compterait que des taps.
      `failed`/`unsupported` n'émettent RIEN : on ne sait pas ce qui s'est
      passé, et un event est une affirmation.
      Toujours AUCUNE cible : `distinct_id` de l'émetteur, et rien d'autre.
    */
    if (res.kind === 'ok') {
      track(EVENTS.crewMemberAction, {
        action: action.key,
        effect:
          res.effect === 'unchanged' || res.effect === 'already_removed' ? 'unchanged' : 'done',
      });
    } else if (res.kind === 'refusal') {
      track(EVENTS.crewMemberAction, { action: action.key, effect: 'refused' });
    }
    // On ne réécrit JAMAIS la ligne de notre côté : c'est le serveur qui sait.
    // La relecture n'a lieu que si quelque chose a réellement changé.
    if (res.kind === 'ok') crew.onChanged();
  };

  return (
    <Modal
      visible={pseudo !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Taper À CÔTÉ annule : une feuille de modération ne doit jamais piéger
            quelqu'un qui l'a ouverte par erreur. La zone de fermeture est un
            calque DERRIÈRE la feuille (et non un parent), sinon les taps dans
            la feuille remonteraient jusqu'à lui sur le web — react-native-web
            ne connaît pas le système de « responder » natif. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.sheetCloseA11y)}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.kicker}>{t(C.playerSheetTitle)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.sheetCloseA11y)}
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Text style={styles.closeGlyph}>✕</Text>
            </Pressable>
          </View>
          {/* Le pseudo est le SUJET de la feuille : il s'enroule plutôt que
              d'être coupé (§A.9) — c'est justement sa troncature ailleurs qui
              rendait le formulaire de Confidentialité inutilisable.
              Il est montré EN CLAIR même pour un joueur déjà bloqué : on ne
              peut pas décider de débloquer quelqu'un dont on ne voit pas le
              nom. Même raison que la liste « Joueurs bloqués » de
              Confidentialité, qui l'affiche aussi. */}
          <Text style={styles.target}>{pseudo ?? ''}</Text>

          {step === 'choice' ? (
            <>
              {/* ── E47 · LES GESTES DE RÔLE, EN PREMIER ────────────────────
                  Ils ne sont peints QUE si mon rôle réel les autorise
                  (`roleActionsFor`, miroir de 0093) : un membre simple ne voit
                  rien ici, et c'est normal — pas un manque. Tous en `ghost` :
                  le CTA chartreuse de l'écran reste ailleurs (§A4). */}
              {roleActions.includes('promote') && upRole !== null ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="crest"
                  label={`${t(C.maPromote)} ${t(C.maToRole, { role: t(CREW_ROLE_E[upRole]) })}`}
                  onPress={() => startRoleAction({ key: 'promote', role: upRole })}
                />
              ) : null}
              {roleActions.includes('demote') && downRole !== null ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="chevron"
                  label={`${t(C.maDemote)} ${t(C.maToRole, { role: t(CREW_ROLE_E[downRole]) })}`}
                  onPress={() => startRoleAction({ key: 'demote', role: downRole })}
                />
              ) : null}
              {showRoleList ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="crest"
                  label={t(C.maChooseRole)}
                  onPress={() => setStep('role')}
                />
              ) : null}
              {/* ── LOT Q3 · AVERTIR, PUIS EXCLURE ─────────────────────────
                  Les deux partagent EXACTEMENT les bornes de `kick`
                  (`CREW_PERMISSIONS.kick`, périmètre du co_captain, jamais soi,
                  jamais le fondateur) : un avertissement entre dans le dossier
                  de quelqu'un, le donner ne peut pas être un pouvoir plus large
                  que celui d'exclure. D'où le même `roleActions.includes`.
                  AVERTIR VIENT AVANT : c'est le geste réparable. */}
              {roleActions.includes('remove') ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="alerte"
                  label={t(G.warnCta)}
                  onPress={() => setStep('warn')}
                />
              ) : null}
              {roleActions.includes('remove') ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="alerte"
                  label={t(C.maRemove)}
                  onPress={() => setStep('kick')}
                />
              ) : null}
              {roleActions.includes('transfer_lead') ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="crest"
                  label={t(C.maTransferLead)}
                  onPress={() => startRoleAction({ key: 'transfer_lead' })}
                />
              ) : null}
              {/* ANTI PAY-TO-WIN, dit à l'écran et pas seulement en commentaire
                  (spéc l.1677). Ne s'affiche que pour qui a un geste de rôle
                  sous la main : pour les autres, ce serait une réponse à une
                  question qu'ils ne se posent pas. */}
              {roleActions.length > 0 ? (
                <Text style={styles.note}>{t(C.maPromoteNote)}</Text>
              ) : null}

              {actions.includes('report') ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="alerte"
                  label={t(C.reportMemberLabel)}
                  accessibilityLabel={t(C.reportUserA11y, { name: pseudo ?? '' })}
                  onPress={() => setStep('reason')}
                />
              ) : null}
              {actions.includes('block') ? (
                <>
                  <Button
                    variant="ghost"
                    size="md"
                    icon="bouclier"
                    label={t(C.blockMemberLabel)}
                    accessibilityLabel={t(C.blockUserA11y, { name: pseudo ?? '' })}
                    onPress={doBlock}
                  />
                  {/* Ce que bloquer fait EXACTEMENT — dit AVANT le geste. */}
                  <Text style={styles.note}>{t(C.blockSheetNote)}</Text>
                </>
              ) : null}
              {actions.includes('unblock') ? (
                <Button
                  variant="ghost"
                  size="md"
                  icon="bouclier"
                  label={t(C.unblockMemberLabel)}
                  accessibilityLabel={t(C.unblockUserA11y, { name: pseudo ?? '' })}
                  onPress={doUnblock}
                />
              ) : null}
              {/* Hors session, « Signaler » n'est pas peint : on DIT pourquoi
                  plutôt que de laisser un manque inexpliqué. */}
              {actions.includes('report') ? null : (
                <View style={styles.stateCard}>
                  <Text style={styles.stateTitle}>{t(CReg.reportSignedOutTitle)}</Text>
                  <Text style={styles.stateBody}>{t(CReg.reportSignedOutBody)}</Text>
                </View>
              )}
            </>
          ) : null}

          {/* ── LE CHOIX DU RÔLE — une liste FERMÉE, jamais un champ libre ──
              Chaque ligne dit le RANG (le mot que la base stocke) et, dessous,
              le DEVOIR du cahier §13.3 : « Co-Capitaine » ne veut rien dire
              tant qu'on ne lit pas « traite les signalements et les accès ».
              Le rôle actuel n'y figure pas — `assignableRolesFor` l'exclut :
              le réappliquer ne ferait rien (0093 est idempotente) et
              ressemblerait pourtant à un geste. */}
          {step === 'role' && crew ? (
            <>
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>
                  {t(C.maChooseRoleTitle, { name: pseudo ?? '' })}
                </Text>
                {isCrewRole(crew.targetRole) ? (
                  <Text style={styles.stateBody}>
                    {t(C.maChooseRoleCurrent, { role: t(CREW_ROLE_E[crew.targetRole]) })}
                  </Text>
                ) : null}
              </View>
              {/* LA LISTE S'ENROULE. La feuille est plafonnée à 80 % de la
                  hauteur d'écran ; un fondateur agissant sur un rookie a CINQ
                  barreaux à proposer, chacun avec sa phrase de devoir. Sans
                  défilement, les derniers rôles seraient coupés par le bord —
                  et sur un petit téléphone, le bouton « Annuler » avec eux. */}
              <ScrollView style={styles.roleList} contentContainerStyle={styles.roleListInner}>
              {assignable.map((role) => {
                const duty = dutyOf(role);
                return (
                  <View key={role}>
                    <Button
                      variant="ghost"
                      size="md"
                      icon="crest"
                      label={t(CREW_ROLE_E[role])}
                      disabled={busy}
                      onPress={() => {
                        /*
                          UN SAUT SE CONFIRME, DANS LES DEUX SENS. `promote` est
                          « non sensible » dans CREW_MEMBER_ACTIONS, et ça reste
                          vrai d'une montée d'un cran ; passer quelqu'un
                          directement modérateur, c'est lui confier le pouvoir
                          d'exclure. On ne part donc pas au premier tap.
                        */
                        setPending({
                          key: roleRank(role) > roleRank(crew.targetRole) ? 'promote' : 'demote',
                          role,
                        });
                        setStep('confirm');
                      }}
                    />
                    {duty ? <Text style={styles.note}>{t(CREW_DUTY_HELP_E[duty])}</Text> : null}
                  </View>
                );
              })}
              </ScrollView>
              <Text style={styles.note}>{t(C.maPromoteNote)}</Text>
            </>
          ) : null}

          {/* ── LOT Q3 · AVERTIR : UN SEUL TEMPS ────────────────────────────
              Un avertissement ne retire personne (seul l'avertissement
              d'inactivité peut le faire, et uniquement si le capitaine a armé
              la règle). Le confirmer en deux temps ferait croire l'inverse. */}
          {step === 'warn' && crew ? (
            <>
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>{t(G.warnTitle, { name: pseudo ?? '' })}</Text>
                <Text style={styles.stateBody}>{t(G.warnBody)}</Text>
              </View>
              <Text style={styles.miniLabel}>{t(G.warnNoteLabel)}</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={CREW_KICK_NOTE_MAX}
                accessibilityLabel={t(G.warnNoteLabel)}
                placeholderTextColor={colors.gris}
              />
              <Button
                variant="ghost"
                size="md"
                icon="alerte"
                label={t(G.warnCta)}
                disabled={busy}
                loading={busy}
                onPress={() => void runRoleAction({ key: 'warn', note })}
              />
            </>
          ) : null}

          {/* ── LOT Q3 · EXCLURE : LE MOTIF, PUIS LA CONFIRMATION ───────────
              Premier temps : le motif (catalogue FERMÉ de game-rules), la note,
              et l'APERÇU EXACT de ce que la personne recevra. Décider d'exclure
              sans voir ce que l'autre lira, c'est décider à l'aveugle. */}
          {step === 'kick' && crew ? (
            <>
              <Text style={styles.miniLabel}>{t(G.kickReasonStep)}</Text>
              <ScrollView style={styles.reasons} contentContainerStyle={styles.reasonsInner}>
                {CREW_KICK_REASONS.map((r) => {
                  const on = r === kickReason;
                  return (
                    <Pressable
                      key={r}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => setKickReason(r)}
                      style={({ pressed }) => [
                        styles.reason,
                        on && styles.reasonOn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.reasonLabel, on && styles.reasonLabelOn]}>
                        {t(CREW_KICK_REASON_E[r])}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.miniLabel}>{t(G.warnNoteLabel)}</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                multiline
                maxLength={CREW_KICK_NOTE_MAX}
                accessibilityLabel={t(G.warnNoteLabel)}
                placeholderTextColor={colors.gris}
              />
              {/* `other` exige la note CÔTÉ SERVEUR (`note_required`) : on le dit
                  ici plutôt que de laisser le bouton partir se faire refuser. */}
              {kickNoteMissing ? <Text style={styles.invalid}>{t(G.kickNoteRequired)}</Text> : null}

              {/* L'APERÇU. Il n'existe que si l'appelant connaît le nom du crew :
                  une phrase à trou serait pire que pas d'aperçu du tout. */}
              {crew.crewName ? (
                <View style={styles.stateCard}>
                  <Text style={styles.stateTitle}>{t(G.kickPreviewLabel)}</Text>
                  <Text style={styles.stateBody}>
                    {t(G.kickPreviewBody, {
                      crew: crew.crewName,
                      reason: t(CREW_KICK_REASON_E[kickReason]),
                    })}
                  </Text>
                  <Text style={styles.note}>{t(G.kickPreviewNote)}</Text>
                </View>
              ) : null}
              <Text style={styles.note}>
                {t(G.kickRejoinDays, { n: CREW_REJOIN_AFTER_KICK_DAYS })}
              </Text>
              <Button
                variant="ghost"
                size="md"
                icon="alerte"
                label={t(C.maRemove)}
                disabled={busy || kickNoteMissing}
                onPress={() => {
                  setPending({ key: 'remove', reason: kickReason, note });
                  setStep('confirm');
                }}
              />
            </>
          ) : null}

          {step === 'reason' ? (
            <>
              <Text style={styles.miniLabel}>{t(C.reportReasonStep)}</Text>
              <ScrollView style={styles.reasons} contentContainerStyle={styles.reasonsInner}>
                {REPORT_REASONS.map((r) => {
                  const on = r.key === reason;
                  return (
                    <Pressable
                      key={r.key}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      onPress={() => setReason(r.key)}
                      style={({ pressed }) => [
                        styles.reason,
                        on && styles.reasonOn,
                        pressed && styles.pressed,
                      ]}
                    >
                      {/* Le motif choisi porte SON aide sous lui : le joueur sait
                          ce qu'il déclare avant d'envoyer. */}
                      <Text style={[styles.reasonLabel, on && styles.reasonLabelOn]}>
                        {t(r.label)}
                      </Text>
                      {on ? <Text style={styles.reasonHint}>{t(r.hint)}</Text> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Button
                variant="ghost"
                size="md"
                icon="alerte"
                label={t(C.reportSendCta)}
                onPress={() => void send()}
                disabled={busy}
                loading={busy}
              />
            </>
          ) : null}

          {step === 'sent' ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>{t(CReg.reportSentTitle)}</Text>
              <Text style={styles.stateBody}>
                {t(CReg.reportSentBody, { h: REPORT_REVIEW_HOURS })}
              </Text>
            </View>
          ) : null}

          {/* LE SIGNALEMENT N'EST PAS PARTI, et on le DIT. Un accusé de réception
              donné sur un échec laisserait quelqu'un croire qu'un humain va
              regarder un contenu qui n'a jamais atteint le serveur — la pire
              version du mensonge, sur le chemin exigé par Apple 1.2. Le geste
              reste possible : le bouton « Signaler » réarme l'étape motif. */}
          {step === 'reportFailed' ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>{t(CReg.reportFailedTitle)}</Text>
              <Text style={styles.stateBody}>{t(CReg.reportFailedBody)}</Text>
              <Button
                variant="ghost"
                size="md"
                icon="alerte"
                label={t(C.reportSendCta)}
                onPress={() => void send()}
                disabled={busy}
                loading={busy}
              />
            </View>
          ) : null}

          {/* ── E47 · CONFIRMATION D'UNE ACTION SENSIBLE ───────────────────────
              « Toute action sensible affiche une conséquence claire » (spéc
              l.1695). La conséquence est écrite AVANT le tap, et elle dit aussi
              ce qui NE change PAS — un rôle n'a jamais porté de territoire.
              Le bouton de confirmation reste `ghost` : §A4 n'est pas entamé. */}
          {step === 'confirm' && pending !== null ? (
            <>
              <View style={styles.stateCard}>
                <Text style={styles.stateTitle}>
                  {pending.key === 'remove'
                    ? t(C.maRemoveConfirmTitle, { name: pseudo ?? '' })
                    : pending.key === 'warn'
                      ? t(G.warnTitle, { name: pseudo ?? '' })
                      : pending.key === 'transfer_lead'
                        ? t(C.maTransferConfirmTitle, { name: pseudo ?? '' })
                        : t(
                            pending.key === 'promote'
                              ? C.maPromoteConfirmTitle
                              : C.maDemoteConfirmTitle,
                            { name: pseudo ?? '', role: t(CREW_ROLE_E[pending.role]) },
                          )}
                </Text>
                <Text style={styles.stateBody}>
                  {pending.key === 'remove'
                    ? /* LE MOTIF EST RAPPELÉ DANS LA CONFIRMATION : sans lui, le
                         second temps ne confirmerait pas ce qu'on a choisi au
                         premier, et l'aperçu vu plus haut serait déjà oublié. */
                      `${t(C.maRemoveConfirmBody)} ${t(G.logMotive, {
                        reason: t(CREW_KICK_REASON_E[pending.reason]),
                      })}`
                    : pending.key === 'warn'
                      ? t(G.warnBody)
                      : pending.key === 'transfer_lead'
                        ? t(C.maTransferConfirmBody)
                        : t(
                            pending.key === 'promote'
                              ? C.maPromoteConfirmBody
                              : C.maDemoteConfirmBody,
                          )}
                </Text>
              </View>
              <Button
                variant="ghost"
                size="md"
                label={t(C.maConfirmCta)}
                disabled={busy}
                onPress={() => void runRoleAction(pending)}
              />
            </>
          ) : null}

          {/* ── E47 · CE QUE LE SERVEUR A RÉPONDU ──────────────────────────────
              Quatre issues DISTINCTES, jamais confondues : fait / refusé /
              serveur sans la fonction / injoignable. Un refus n'est pas une
              panne, et une panne n'affirme rien sur le geste. */}
          {/* LOT Q3 — ce que le serveur a répondu à un AVERTISSEMENT ou à une
              EXCLUSION À MOTIF. Séparé du bloc ci-dessous parce que leurs
              effets ne se rangent pas dans le vocabulaire de 0093. */}
          {step === 'result' && mgmtText !== null ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateBody}>{mgmtText}</Text>
              <Text style={styles.stateBody}>{t(C.maRoleServerSide)}</Text>
            </View>
          ) : null}

          {step === 'result' && outcome !== null ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateBody}>
                {outcome.kind === 'failed'
                  ? t(C.maFailed)
                  : outcome.kind === 'unsupported'
                    ? t(C.maUnsupported)
                    : outcome.kind === 'refusal'
                      ? t(refusalEntry(outcome.reason))
                      : outcome.effect === 'unchanged' || outcome.effect === 'already_removed'
                        ? t(C.maDoneAlready)
                        : outcome.effect === 'removed'
                          ? t(C.maDoneRemoved, { name: pseudo ?? '' })
                          : outcome.effect === 'transferred'
                            ? t(C.maDoneTransferred, { name: pseudo ?? '' })
                            : t(C.maDonePromoted, {
                                name: pseudo ?? '',
                                role: outcome.role ? t(CREW_ROLE_E[outcome.role]) : '',
                              })}
              </Text>
              {/* Le serveur décide — dit une fois, à l'endroit où ça compte. */}
              <Text style={styles.stateBody}>{t(C.maRoleServerSide)}</Text>
            </View>
          ) : null}

          <Button
            variant="ghost"
            size="md"
            label={t(
              step === 'sent' || step === 'result' || step === 'reportFailed'
                ? C.sheetCloseA11y
                : C.sheetCancel,
            )}
            // Depuis une CONFIRMATION, « Annuler » revient à la liste des
            // gestes — il ne ferme pas la feuille. Reculer d'un pas ne doit pas
            // coûter de rouvrir la ligne, sans quoi on confirme par lassitude.
            onPress={() => {
              // Depuis une CONFIRMATION venue de la liste de rôles, on revient à
              // la LISTE — pas au début : reculer d'un pas ne doit jamais faire
              // reculer de deux, sinon choisir un autre rôle coûte de tout
              // rouvrir.
              if (step === 'confirm') {
                const backToList =
                  showRoleList && (pending?.key === 'promote' || pending?.key === 'demote');
                // Une exclusion revient à SON motif, jamais au début : refaire
                // le choix du motif parce qu'on a hésité une seconde serait une
                // punition de la prudence.
                const backToKick = pending?.key === 'remove';
                setPending(null);
                setStep(backToList ? 'role' : backToKick ? 'kick' : 'choice');
                return;
              }
              if (step === 'role' || step === 'kick' || step === 'warn') {
                setStep('choice');
                return;
              }
              onClose();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },

  // ── L'affordance « … » de la ligne : grise, sans fond, cible tactile pleine ──
  more: {
    minWidth: sizes.touchTarget / 2,
    minHeight: sizes.touchTarget / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `lineHeight` FIXE : le podium réserve une hauteur constante pour ce glyphe
  // (voir `podiumActions`), et une hauteur de ligne laissée à la plateforme
  // décalerait les marches entre une colonne qui porte l'action et une qui n'en
  // porte pas (ma propre ligne).
  moreGlyph: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 18, letterSpacing: 1 },

  // ── La feuille ──
  backdrop: {
    flex: 1,
    backgroundColor: withAlpha(colors.noir, 0.85),
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.carbone,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: spacing.sm,
    maxHeight: '80%',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kicker: { ...typography.kicker, color: colors.gris, flex: 1 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  closeGlyph: { color: colors.gris, fontSize: 14 },
  // R3 (titre d'item) : le pseudo est le sujet de la feuille, pas un titre
  // d'écran — et il s'enroule, jamais de « … » sur une identité (§A.9).
  target: { ...typography.cardTitle, color: colors.blanc },
  note: { ...typography.meta, color: colors.gris },
  miniLabel: { ...typography.kicker, color: colors.gris },

  // ── Motifs : une colonne (les libellés ne sont jamais coupés, §A.9) ──
  roleList: { maxHeight: 300 },
  roleListInner: { gap: spacing.sm },
  reasons: { maxHeight: 260 },
  reasonsInner: { gap: spacing.xs },
  reason: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: sizes.touchTarget,
    justifyContent: 'center',
    gap: spacing.xxs,
  },
  // §C — la sélection est portée par la BORDURE **et** la couleur du texte :
  // jamais par la couleur seule, jamais par un aplat chartreuse sur un filtre.
  reasonOn: { borderColor: colors.chartreuse40 },
  reasonLabel: { ...typography.body, color: colors.gris },
  reasonLabelOn: { color: colors.blanc },
  reasonHint: { ...typography.meta, color: colors.gris },

  // ── État nommé (pas de compte / signalement envoyé) ──
  stateCard: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  stateTitle: { ...typography.itemTitle, color: colors.blanc },
  stateBody: { ...typography.meta, color: colors.gris },

  // ── LOT Q3 · la note qui accompagne un avertissement ou un motif ──────────
  noteInput: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.control,
    color: colors.blanc,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: sizes.touchTarget,
    textAlignVertical: 'top',
  },
  // L15 : le motif d'invalidité est un TEXTE, la couleur ne fait que le
  // hiérarchiser. Lu sans couleur, il dit encore ce qui manque.
  invalid: { ...typography.meta, color: colors.blanc },
});
