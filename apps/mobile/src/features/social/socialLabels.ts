/**
 * GRYD — E57 / E58 : la COPIE dérivée (un motif → une phrase, un défi → une
 * ligne). Aucun état, aucune I/O ; seulement des `Entry` du catalogue rendues
 * avec les constantes de `game-rules`.
 *
 * ═══ POURQUOI CE FICHIER, ET PAS DEUX COPIES DANS LES ÉCRANS ════════════════
 * `/amis`, `/defis` et `/defi` doivent répondre LA MÊME CHOSE au même refus
 * serveur. Écrite trois fois, la table des motifs aurait divergé au premier
 * ajout — et un écran aurait fini par répondre « une erreur est survenue » à un
 * motif que les deux autres savaient nommer.
 *
 * ═══ LES NOMBRES NE SONT JAMAIS DANS LA COPIE ══════════════════════════════
 * « tu pourras redemander dans 30 jours » n'est écrit NULLE PART dans le
 * catalogue : la phrase porte `{days}` et la valeur vient de
 * SOCIAL_FRIEND_REQUEST_COOLDOWN_DAYS. Changer la constante change les cinq
 * langues d'un coup ; recopier le nombre aurait créé cinq mensonges le jour du
 * changement.
 */
import {
  DUEL_MAX_PENDING_SENT,
  DUEL_RETRY_COOLDOWN_HOURS,
  SOCIAL_FOLLOW_MAX_PER_DAY,
  SOCIAL_FRIEND_REQUESTS_MAX_PENDING,
  SOCIAL_FRIEND_REQUEST_COOLDOWN_DAYS,
  type DuelKind,
} from '@klaim/shared';
import { ACTIVITY_LABELS } from '../../ui/activityLens';
import { C } from '../../i18n/catalog/social';
import type { Entry } from '../../i18n/types';
import type { SocialRefusal } from './socialGraph';

/** La signature de `useT()` — un traducteur avec interpolation. */
export type Translate = (entry: Entry, vars?: Record<string, string | number>) => string;

/** Le nom d'un format de défi, dans la langue courante. */
export const DUEL_KIND_LABEL: Readonly<Record<DuelKind, Entry>> = {
  surface_period: C.duelKindSurface,
  loops: C.duelKindLoops,
  defend_zone: C.duelKindDefend,
  distance: C.duelKindDistance,
};

/**
 * L'UNITÉ de la cible, par format. `defend_zone` n'en a pas : ce format ne
 * porte PAS de cible chiffrée (le serveur la refuse, `bad_target`), et lui en
 * inventer une afficherait un objectif que personne n'a fixé.
 */
export const DUEL_TARGET_UNIT: Readonly<Record<DuelKind, Entry | null>> = {
  surface_period: C.duelTargetZones,
  loops: C.duelTargetLoops,
  defend_zone: null,
  distance: C.duelTargetKm,
};

/** Ce qu'un défi a d'affichable, quel que soit son sens (reçu, envoyé, en cours). */
export interface DuelFacts {
  readonly kind: DuelKind;
  readonly activity: 'run' | 'bike';
  readonly periodDays: number;
  readonly target: number | null;
  readonly zoneLabel: string | null;
}

/**
 * UNE LIGNE, lisible d'un coup d'œil : « Distance · 10 km · 7 j · RUN ».
 *
 * Chaque segment n'est présent que s'il a une VALEUR : un défi sans cible ne
 * porte pas de « — », et un défi de zone porte le libellé au lieu d'un chiffre.
 * Rien n'est jamais tronqué par « … » (§A.9) — la ligne s'enroule à l'écran.
 */
export function duelLine(t: Translate, d: DuelFacts): string {
  const parts: string[] = [t(DUEL_KIND_LABEL[d.kind])];
  const unit = DUEL_TARGET_UNIT[d.kind];
  if (d.kind === 'defend_zone' && d.zoneLabel) {
    parts.push(d.zoneLabel);
  } else if (d.target !== null && unit) {
    parts.push(`${formatTarget(d.target)} ${t(unit)}`);
  }
  parts.push(t(C.duelPeriodDays, { n: d.periodDays }));
  parts.push(ACTIVITY_LABELS[d.activity]);
  return parts.join(' · ');
}

/** Une cible se lit sans décimale inutile : « 10 », jamais « 10.0 ». */
function formatTarget(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

/**
 * UN MOTIF SERVEUR → UNE PHRASE. Aucun motif ne tombe dans « une erreur est
 * survenue » sans qu'on l'ait décidé : le `default` est l'aveu explicite que le
 * serveur a refusé sans que ce client sache pourquoi, et il DIT au moins que
 * rien n'a changé.
 *
 * `duelContext` bascule les motifs AMBIGUS : `cooldown` et `too_many_pending`
 * existent des deux côtés (amitié et défi) avec des unités différentes — jours
 * contre heures, demandes contre défis. Une seule table sans ce drapeau aurait
 * annoncé « 30 jours » à quelqu'un qui doit attendre 168 heures.
 */
export function socialRefusalText(
  t: Translate,
  refusal: SocialRefusal,
  duelContext = false,
): string {
  switch (refusal) {
    case 'not_found':
      return t(C.errNotFound);
    case 'self':
      return t(C.errSelf);
    case 'bad_handle':
      return t(C.errNotFound);
    case 'signed_out':
      return t(C.signedOutTitle);
    case 'rate_limited':
      return t(C.errRateLimited, { max: SOCIAL_FOLLOW_MAX_PER_DAY });
    case 'cooldown':
      return duelContext
        ? t(C.duelErrCooldown, { hours: DUEL_RETRY_COOLDOWN_HOURS })
        : t(C.errFriendCooldown, { days: SOCIAL_FRIEND_REQUEST_COOLDOWN_DAYS });
    case 'too_many_pending':
      return duelContext
        ? t(C.duelErrTooManyPending, { max: DUEL_MAX_PENDING_SENT })
        : t(C.errTooManyPending, { max: SOCIAL_FRIEND_REQUESTS_MAX_PENDING });
    case 'no_relation':
      return t(C.duelErrNoRelation);
    case 'already_pending':
      return t(C.duelErrAlreadyPending);
    case 'expired':
      return t(C.duelErrExpired);
    // Vie privée du libellé de zone : le motif est DIT (le joueur doit pouvoir
    // corriger). Le sous-motif `kind` que le serveur renvoie n'arrive pas
    // jusqu'ici — le miroir client (`duelDraftIssue`) l'a déjà distingué avant
    // l'envoi ; ce texte-ci ne sert que si les deux divergent, et il suffit.
    case 'zone_looks_like_address':
      return t(C.duelErrZoneAddress);
    // Modération : muet par doctrine (0050).
    case 'zone_unavailable':
      return t(C.duelErrZoneUnavailable);
    default:
      // `not_pending`, `bad_*` et `unknown` : le serveur a refusé une forme que
      // l'écran croyait valide. C'est un désaccord client/serveur, pas une
      // information à donner au joueur — on lui dit que rien n'a changé.
      return t(C.errGeneric);
  }
}
