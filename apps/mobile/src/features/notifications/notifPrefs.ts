/**
 * GRYD — RÉGLAGES DE NOTIFICATIONS (E71, spec produit §13). Module PUR (zéro
 * React, zéro AsyncStorage, zéro réseau) : la forme, les défauts, la lecture et
 * les deux règles qui protègent le joueur vivent ici, testables sous Deno.
 * L'I/O (AsyncStorage, hook React) vit dans `./notifPrefsStore.ts`.
 *
 * ─── LES CINQ CATÉGORIES (E71), ET CE QUI EST RÉELLEMENT CÂBLÉ DERRIÈRE ──────
 * La spec liste défense / crew / rivalité / progression / produit. L'audit de
 * ce chantier (25-27/07/2026) a établi ce qui existe VRAIMENT côté serveur
 * aujourd'hui :
 *   · DÉFENSE    — RÉEL. `decay_job` + `_shared/push.ts#planDecayPushes` gate
 *     le push « Ton territoire s'efface bientôt » derrière le canal
 *     `NotifChannel` `'solo'`. C'est la SEULE source de vérité pour cette
 *     catégorie aujourd'hui.
 *   · RIVALITÉ   — RÉEL. `steal_push_job` + `planStealPushes` gate le push
 *     « on t'a pris une zone » derrière le canal `'competition'`, et agrège déjà
 *     plusieurs vols en UNE alerte par victime (`stealWorldByVictim`) — c'est
 *     très exactement ce que la spec appelle son défaut « regroupée ».
 *   · CREW / PROGRESSION / PRODUIT — AUCUN push réel n'existe pour elles :
 *     `useActivityEvents` documente déjà que crew/rivalité-tactique restent
 *     VIDES tant que le cross-joueur (O1) n'existe pas, `digest_job` écrit un
 *     résumé progression/crew dans l'INBOX SEULEMENT (jamais un push), et
 *     aucun événement « produit » n'existe nulle part dans le dépôt.
 *
 * RÈGLE DU DÉPÔT : « un réglage qui ne gouverne rien côté serveur est un
 * mensonge ». Résultat direct : l'écran (`app/parametres/[section].tsx`) ne
 * peint un INTERRUPTEUR que pour défense et rivalité — les deux seules
 * catégories qui gouvernent un vrai envoi. Les trois autres restent NOMMÉES
 * (absence assumée, jamais un « Bientôt » déguisé) mais sans contrôle actif.
 *
 * Ce module, lui, modélise les CINQ catégories en entier — y compris les trois
 * qui n'ont encore aucun contrôle à l'écran. C'est délibéré : les défauts de la
 * spec (crew/progression activées, produit désactivée) doivent être corrects
 * et testés dès aujourd'hui, pour que le jour où `crew`/`progression`/`produit`
 * gagnent un vrai job serveur, il n'y ait qu'un écran à câbler — pas un modèle
 * de préférences à inventer sous pression.
 */
import { NOTIF_NON_URGENT_DAILY_THRESHOLD } from '@klaim/shared';

/**
 * Miroir LITTÉRAL de `NotifChannel` (`features/motivation/store.ts`), PAS un
 * import : `motivation/store.ts` appartient à un autre chantier (hors
 * périmètre) et son import — même `import type` — tire tout son graphe dans le
 * typecheck Deno de ce module pur, y compris l'appel `AsyncStorage.getItem`
 * qu'il contient (Deno type-checke le fichier entier, pas le seul symbole
 * référencé). Les quatre valeurs sont contraintes par la contrainte SQL
 * `notif_channels <@ array['solo','crew','competition','off']` (migrations
 * 0048/0059) : ce n'est pas une valeur inventée, c'est le contrat serveur
 * recopié à l'identique. Toute évolution de `NotifChannel` doit être répercutée
 * ici par le chantier qui la possède.
 */
type WireNotifChannel = 'solo' | 'crew' | 'competition' | 'off';

// ─── Les cinq catégories (E71) ────────────────────────────────────────────────

export type NotificationCategory =
  | 'defense'
  | 'crew'
  | 'rivalite'
  | 'progression'
  | 'produit';

export const NOTIFICATION_CATEGORIES: readonly NotificationCategory[] = [
  'defense',
  'crew',
  'rivalite',
  'progression',
  'produit',
];

/** Une préférence par catégorie. `true` = activée (rivalité : « regroupée »). */
export interface NotificationPrefs {
  defense: boolean;
  crew: boolean;
  rivalite: boolean;
  progression: boolean;
  produit: boolean;
}

/**
 * Défauts EXIGÉS par E71 §13 :
 *   défense activée · crew activée · rivalité regroupée (= activée, dans son
 *   seul mode existant) · progression activée · produit désactivée (pas de
 *   consentement explicite tant que rien ne le demande).
 */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  defense: true,
  crew: true,
  rivalite: true,
  progression: true,
  produit: false,
};

/** Clé AsyncStorage — namespace dédié, distinct du magasin motivation (§21). */
export const NOTIF_PREFS_STORAGE_KEY = 'gryd.notifPrefs.v1';

/**
 * JSON stocké → préférences. PURE et TESTÉE (patron `privacy/prefs.ts`) : on
 * PIOCHE les cinq clés connues en validant leur type, jamais un simple spread —
 * une valeur inconnue ou d'un mauvais type retombe sur le défaut de SA catégorie
 * plutôt que d'entrer telle quelle ou de faire écrouler tout l'objet.
 */
export function parseNotificationPrefs(raw: string | null): NotificationPrefs {
  if (raw === null || raw.length === 0) return DEFAULT_NOTIFICATION_PREFS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_NOTIFICATION_PREFS;
  }
  if (parsed === null || typeof parsed !== 'object') return DEFAULT_NOTIFICATION_PREFS;
  const o = parsed as Record<string, unknown>;
  const pick = (key: NotificationCategory): boolean =>
    typeof o[key] === 'boolean' ? (o[key] as boolean) : DEFAULT_NOTIFICATION_PREFS[key];
  return {
    defense: pick('defense'),
    crew: pick('crew'),
    rivalite: pick('rivalite'),
    progression: pick('progression'),
    produit: pick('produit'),
  };
}

/** Patch partiel, PUR — dérive l'objet à persister sans muter l'état d'origine. */
export function applyNotificationPrefsPatch(
  current: NotificationPrefs,
  patch: Partial<NotificationPrefs>,
): NotificationPrefs {
  return { ...current, ...patch };
}

// ─── Migration depuis l'ancien magasin (motivation §21) ──────────────────────

/**
 * Un appareil déjà en service porte peut-être déjà un choix RÉEL dans l'ancien
 * magasin (`motivation/store.ts` → AsyncStorage `gryd.motivation.prefs.v1`,
 * champ `notifChannels: NotifChannel[]`). Cette fonction dérive `defense` /
 * `rivalite` de ce JSON legacy, pour ne pas RÉINITIALISER en silence le choix
 * de quelqu'un qui avait explicitement coupé la compétition, par exemple.
 *
 * Lecture SEULE : ce module n'écrit jamais dans l'ancien magasin (hors
 * périmètre — `features/motivation/**` appartient à un autre chantier).
 *
 * `null` = rien d'exploitable (jamais écrit, JSON cassé, forme inattendue) :
 * l'appelant garde alors les défauts E71 plutôt que d'inventer une migration.
 */
export function deriveFromLegacyChannels(
  raw: string | null,
): Pick<NotificationPrefs, 'defense' | 'rivalite'> | null {
  if (raw === null || raw.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object') return null;
  const channels = (parsed as Record<string, unknown>).notifChannels;
  if (!Array.isArray(channels)) return null;
  const set = new Set(channels.filter((c): c is string => typeof c === 'string'));
  if (set.has('off')) return { defense: false, rivalite: false };
  return { defense: set.has('solo'), rivalite: set.has('competition') };
}

/**
 * Les deux préférences → le tableau de canaux RÉEL attendu par le serveur
 * (`push_devices.notif_channels`, contrainte `solo|crew|competition|off`).
 *
 * DÉLIBÉRÉMENT ÉTROIT : seules `defense` (→ `solo`) et `rivalite`
 * (→ `competition`) ont un canal qui gouverne un envoi RÉEL aujourd'hui (cf.
 * l'en-tête du fichier). `crew` n'est PAS traduit en canal `'crew'` malgré son
 * existence dans l'enum serveur : aucun job ne le filtre, l'inclure ferait
 * croire au serveur (et à un futur lecteur de la colonne) qu'un choix explicite
 * a été fait alors que ce chantier ne câble rien de nouveau. `progression` et
 * `produit` n'ont aucun canal correspondant dans l'enum — elles ne peuvent pas
 * être « envoyées » au serveur par construction.
 *
 * Aucun canal actif → `['off']`, jamais un tableau vide : c'est la valeur que
 * `channelEnabled`/`syncPushPreferences` savent déjà interpréter comme
 * « désenregistre l'appareil ».
 */
export function notifPrefsToChannels(prefs: NotificationPrefs): WireNotifChannel[] {
  const channels: WireNotifChannel[] = [];
  if (prefs.defense) channels.push('solo');
  if (prefs.rivalite) channels.push('competition');
  return channels.length > 0 ? channels : ['off'];
}

// ─── §13.1/§13.2 : urgence, catégorie, et le regroupement au-delà de 3/jour ──

/**
 * Les QUATRE types URGENTS de la spec (§13.1) : jamais regroupés, jamais
 * silencés par une préférence de confort — c'est la règle qui protège le
 * joueur. Un événement urgent n'appartient à AUCUNE des cinq catégories : il
 * ignore la porte de catégorie tout autant que le seuil de regroupement.
 */
export type UrgentNotificationKind =
  | 'territoire_conteste'
  | 'defense_expirant'
  | 'activite_interrompue'
  | 'securite_compte';

/**
 * Les CINQ types NON URGENTS explicitement nommés par §13.2, plus `resume`
 * (digest — `digest_job`) et `saison` (fin/début de saison). Chacun appartient
 * à EXACTEMENT une catégorie (`categoryOf`), donc à EXACTEMENT une préférence.
 */
export type NonUrgentNotificationKind = 'crew' | 'rivalite' | 'badge' | 'saison' | 'resume';

export type NotificationKind = UrgentNotificationKind | NonUrgentNotificationKind;

const URGENT_KINDS: ReadonlySet<NotificationKind> = new Set<UrgentNotificationKind>([
  'territoire_conteste',
  'defense_expirant',
  'activite_interrompue',
  'securite_compte',
]);

/** Un événement urgent (§13.1) — jamais gaté, jamais regroupé. PURE. */
export function isUrgentKind(kind: NotificationKind): boolean {
  return URGENT_KINDS.has(kind);
}

/** §13.2 → catégorie E71. Exhaustif par construction (union fermée). */
const CATEGORY_BY_NON_URGENT_KIND: Readonly<Record<NonUrgentNotificationKind, NotificationCategory>> = {
  crew: 'crew',
  rivalite: 'rivalite',
  badge: 'progression',
  saison: 'progression',
  resume: 'progression',
};

/** La catégorie d'un événement NON urgent — jamais appelée sur un urgent. */
export function categoryOf(kind: NonUrgentNotificationKind): NotificationCategory {
  return CATEGORY_BY_NON_URGENT_KIND[kind];
}

/** Un événement à planifier, déjà résolu dans SA journée locale (voir plus bas). */
export interface DeliverableEvent {
  id: string;
  kind: NotificationKind;
  /** Instant de l'événement (ms epoch) — sert au tri interne de la journée. */
  atMs: number;
}

export type DeliveryMode = 'immediate' | 'grouped' | 'suppressed';

export interface DeliveryDecision {
  id: string;
  mode: DeliveryMode;
}

/**
 * Décide le mode de remise de chaque événement d'UNE MÊME journée locale (le
 * découpage par fuseau appartient à l'appelant — ce module PUR n'en connaît
 * aucun, comme `_shared/push.ts#canPush` le fait déjà côté serveur).
 *
 * ═══ LES DEUX RÈGLES, DANS L'ORDRE OÙ ELLES S'APPLIQUENT ════════════════════
 *  1. URGENT (`isUrgentKind`) → TOUJOURS `immediate`. Ni le rang dans la
 *     journée, ni l'état d'une catégorie (même désactivée) ne peuvent le
 *     regrouper ou le supprimer — §13.1, la règle qui protège le joueur.
 *  2. NON URGENT : sa catégorie (`categoryOf`) doit être ACTIVÉE dans `prefs`,
 *     sinon `suppressed` (choix explicite du joueur, pas un oubli). Sinon, les
 *     `NOTIF_NON_URGENT_DAILY_THRESHOLD` premiers de la journée (triés par
 *     heure) restent `immediate` ; au-delà, `grouped` (§13, fréquence).
 *
 * Le COMPTE du seuil ne porte QUE sur les non-urgents non supprimés : un
 * urgent ne consomme jamais une des trois places, et un non-urgent dont la
 * catégorie est coupée n'en consomme pas non plus (il n'a jamais existé pour
 * le joueur).
 */
export function planDailyDelivery(
  events: readonly DeliverableEvent[],
  prefs: NotificationPrefs,
): DeliveryDecision[] {
  const sorted = [...events].sort((a, b) => a.atMs - b.atMs);
  let nonUrgentDelivered = 0;
  return sorted.map((e): DeliveryDecision => {
    if (isUrgentKind(e.kind)) return { id: e.id, mode: 'immediate' };
    const category = categoryOf(e.kind as NonUrgentNotificationKind);
    if (!prefs[category]) return { id: e.id, mode: 'suppressed' };
    nonUrgentDelivered += 1;
    return {
      id: e.id,
      mode: nonUrgentDelivered <= NOTIF_NON_URGENT_DAILY_THRESHOLD ? 'immediate' : 'grouped',
    };
  });
}
