/**
 * GRYD — LA CLOCHE DU HEADER CARTE : existe-t-elle, et que compte-t-elle ?
 * Moteur PUR (zéro React, zéro réseau), testé sans rendu (`bell.test.ts`).
 *
 * ─── LA DÉCISION QUE CE MODULE PORTE ────────────────────────────────────────
 * La cloche du Home était VOLONTAIREMENT ÉTEINTE, et c'était juste : avant que
 * `territory_contests` existe, son badge aurait compté des événements tactiques
 * qui n'existaient pas, et elle aurait ouvert un écran vide — un bouton mort
 * (§A). Ce qui a changé : une contestation EST un événement réel, daté, qui
 * concerne le joueur. La cloche peut donc s'allumer — à UNE condition, qui est
 * tout ce fichier : **elle n'existe que quand elle a quelque chose de VRAI à
 * dire**.
 *
 * ─── ABSENTE, PAS GRISÉE, PAS « 0 » ─────────────────────────────────────────
 * Zéro événement actionnable ⇒ `kind: 'absent'`. Pas une cloche grisée (qui
 * peint une action indisponible), pas un badge « 0 » (qui affirme un compte pour
 * ne rien dire), pas une cloche nue qui ouvrirait l'état calme : ABSENTE. Elle
 * réapparaîtra d'elle-même à la première contestation réelle, sans qu'on ait à
 * revenir ici.
 *
 * ─── LE CHOIX SUR L'ÉCHEC DE LECTURE, ET SA RAISON ──────────────────────────
 * Consigne « ou elle n'apparaît pas, ou elle apparaît sans badge — choisis et
 * justifie ». CHOIX RETENU : **elle n'apparaît pas** (`'not-read'`), pour les
 * états `signed-out`, `loading` ET `failed`.
 *   · Une cloche est une ASSERTION, pas un menu : la peindre dit « il y a
 *     quelque chose pour toi ». Après une lecture ratée, on ne sait justement
 *     pas s'il y a quelque chose — la peindre affirmerait ce qu'on ignore.
 *   · Son absence, elle, n'affirme rien. C'est le silence, pas un « tout va
 *     bien » : la doctrine interdit d'inventer, pas de se taire.
 *   · Pendant `loading`, l'apparition-puis-disparition d'une alerte au-dessus
 *     d'une carte serait un clignotement alarmant tiré du seul état réseau.
 * CE QUE CE CHOIX COÛTE, dit plutôt que caché : quand la lecture échoue, le
 * joueur n'est pas averti qu'il pourrait avoir des zones à défendre. Le coût est
 * accepté ici parce que l'inverse — alerter sans savoir — est un mensonge, alors
 * que se taire est une lacune. `/activite`, lui, dit franchement son échec et
 * propose de réessayer : c'est l'écran qui doit porter l'erreur, pas la carte.
 *
 * ─── LE COMPTE EST VRAI, OU IL N'EST PAS ────────────────────────────────────
 * Le compte vient d'`actionableCount` (moteur E23 déjà testé) : les seules
 * lignes ACTIONNABLES encore VIVANTES. Aucune estimation, aucun cache optimiste,
 * aucun « au moins 1 » de repli. Un badge débloqué (chevron, non actionnable) ne
 * l'incrémente jamais ; une contestation dont l'échéance est passée en sort
 * toute seule.
 *
 * ─── LE PLAFOND D'AFFICHAGE, DOCUMENTÉ ──────────────────────────────────────
 * `BELL_BADGE_MAX` plafonne le TEXTE, jamais le compte : au-delà, le badge lit
 * « 99+ », qui se lit « plus de 99 » — une minoration explicite, pas un nombre
 * inventé. `count` reste le compte EXACT et c'est lui que l'accessibilité
 * annonce : le lecteur d'écran n'a pas de contrainte de largeur, il n'a donc
 * aucune raison d'hériter d'un arrondi. Ce plafond est une règle d'AFFICHAGE
 * (lisibilité d'une pastille de 18 pt), pas une règle de jeu : sa place est ici
 * et pas dans `game-rules`.
 */
import { actionableCount, type ActivityEvent } from './activityFeed';

/** Au-delà, le badge écrit « 99+ » (minoration explicite). Cf. en-tête. */
export const BELL_BADGE_MAX = 99;

/** Les 4 états de lecture d'`useActivityEvents`, repris tels quels. */
export type BellReadStatus = 'signed-out' | 'loading' | 'failed' | 'ready';

/**
 * Pourquoi la cloche est absente. Sert aux tests et à la lisibilité de la
 * décision ; l'UI n'a rien à en faire — absent, c'est absent.
 */
export type BellAbsentReason =
  /** Rien n'a été LU (pas de compte, lecture en vol, ou lecture échouée). */
  | 'not-read'
  /** LU, et aucune ligne actionnable vivante : l'état calme. */
  | 'nothing-actionable';

export type BellState =
  | { readonly kind: 'absent'; readonly reason: BellAbsentReason }
  | {
      readonly kind: 'visible';
      /** Compte EXACT (≥ 1), jamais plafonné — c'est lui qu'annonce l'a11y. */
      readonly count: number;
      /** Texte de la pastille : le compte, ou « 99+ » au-delà du plafond. */
      readonly badgeLabel: string;
    };

const ABSENT_NOT_READ: BellState = { kind: 'absent', reason: 'not-read' };
const ABSENT_CALM: BellState = { kind: 'absent', reason: 'nothing-actionable' };

/**
 * L'état de la cloche, pour un instant donné.
 *
 * `nowMs` est INJECTÉ : aucune horloge implicite ici, et la péremption d'une
 * fenêtre de défense est donc reproductible en test à la milliseconde.
 */
export function bellState(input: {
  readonly status: BellReadStatus;
  readonly events: readonly ActivityEvent[];
  readonly nowMs: number;
}): BellState {
  // Tout ce qui n'est pas « LU » ne peut rien affirmer (cf. en-tête).
  if (input.status !== 'ready') return ABSENT_NOT_READ;
  const count = actionableCount(input.events, input.nowMs);
  if (count <= 0) return ABSENT_CALM;
  return {
    kind: 'visible',
    count,
    badgeLabel: count > BELL_BADGE_MAX ? `${BELL_BADGE_MAX}+` : String(count),
  };
}

/**
 * Le prochain instant où le compte peut CHANGER sans nouvelle lecture, c'est-à-
 * dire la plus proche échéance ENCORE à venir. `null` s'il n'y en a aucune.
 *
 * POURQUOI CE N'EST PAS COSMÉTIQUE : `actionableCount` est exact à l'instant où
 * on l'appelle, mais un écran qui ne se redessine pas garderait une cloche
 * allumée après la fermeture de la dernière fenêtre de défense — un compte périmé
 * est un compte faux. Ce point de réveil permet à l'UI de se réévaluer PILE quand
 * la réalité change, sans minuterie qui tourne pour rien le reste du temps.
 *
 * STRICTEMENT postérieur à `nowMs` : une échéance déjà atteinte est déjà prise en
 * compte par `actionableCount`, et la reprogrammer bouclerait à l'infini.
 */
export function nextExpiryMs(events: readonly ActivityEvent[], nowMs: number): number | null {
  let next: number | null = null;
  for (const e of events) {
    const at = e.expiresAtMs;
    if (at === undefined || !Number.isFinite(at) || at <= nowMs) continue;
    if (next === null || at < next) next = at;
  }
  return next;
}
