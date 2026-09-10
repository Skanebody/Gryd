/**
 * GRYD — LE @PSEUDO, SES DEUX CHANGEMENTS ET SA RÉSERVATION (LOT H, 10/09/2026).
 *
 * DEMANDE FONDATEUR : « Pour les pseudos, inspire-toi d'Instagram : tu as un @
 * et tu peux le changer X fois tous les X temps, reprends les mêmes conditions
 * qu'Instagram. »
 *
 * ─── CE QUE CE MODULE EST ───────────────────────────────────────────────────
 * La LECTURE de ce que le serveur (migration 0175) décide, et les phrases qui
 * le disent. Il ne décide RIEN : il ne compte pas les changements, ne pose
 * aucune réservation et n'autorise aucun renommage. `change_my_handle_2026` est
 * le seul juge, et il l'est même quand l'app est vieille d'une version — c'est
 * pour cela que `my_handle_status_2026()` renvoie AUSSI ses trois constantes
 * (`changes_per_window`, `window_days`, `hold_days`) : l'écran affiche la règle
 * DU SERVEUR, pas celle de son binaire.
 *
 * ─── LES QUATRE ÉTATS, ET POURQUOI AUCUN N'EST UN REPLI ─────────────────────
 * `useMyHandleStatus2026()` rend `signedOut | loading | failed | ready`, et
 * l'écran peint les quatre. La tentation était d'afficher « il te reste 2
 * changements » quand la lecture n'a pas abouti : ce serait un chiffre inventé
 * au moment précis où le joueur s'apprête à agir dessus (L8/L14, « jamais un
 * zéro nu ni un repli inventé »). Quand on ne sait pas, on dit qu'on ne sait
 * pas, et le champ reste utilisable : le serveur tranchera à l'enregistrement.
 *
 * ─── LE CAS QUE PERSONNE N'AURAIT VU ────────────────────────────────────────
 * `handleChosen === false` : le joueur porte encore l'étiquette posée par
 * l'inscription (`runner_5f3a91c0…`, migration 0154). Son prochain
 * enregistrement NOMME son pseudo, il ne le change pas : aucun crédit, aucune
 * réservation. Annoncer « il te reste 2 changements sur 2 » serait vrai mais
 * trompeur, parce que celui qu'il s'apprête à faire n'en consomme aucun.
 *
 * ─── POURQUOI LE HOOK N'EST PAS DANS CE FICHIER ────────────────────────────
 * Le hook vit dans `handleStatus2026Data.ts`, à côté, exactement comme
 * `social2026Model` (pur) et `social2026Data` (réseau). Ce n'est pas une manie
 * de rangement : `npm run test:mobile` est un `deno test` sur tout `src/`, et
 * Deno TYPE-VÉRIFIE le graphe d'imports complet. Un seul `import` de React
 * Native ou de supabase-js dans ce fichier rendrait ses tests impossibles à
 * écrire — pas « difficiles » : impossibles, la vérification échoue avant le
 * premier `Deno.test`. Les règles de pseudo sont précisément ce qu'il faut
 * pouvoir prouver sans téléphone.
 *
 * PUR : ni React, ni réseau, ni Intl imposé (la date arrive déjà formatée par
 * l'appelant) — Deno-testable.
 */
import {
  HANDLE_CHANGES_PER_WINDOW,
  HANDLE_CHANGE_WINDOW_DAYS,
  HANDLE_HOLD_DAYS,
} from '@klaim/shared';

/** Ce que le joueur peut reprendre : son ancien pseudo, encore réservé pour lui. */
export interface HandleReclaim2026 {
  handle: string;
  /** ISO. Au-delà, n'importe qui pourra le prendre. */
  heldUntil: string;
}

/** Miroir TypeScript du jsonb de `my_handle_status_2026()` (0175). */
export interface HandleStatus2026 {
  handle: string;
  hasProfile: boolean;
  /** false = pseudo pas encore choisi : le prochain enregistrement est gratuit. */
  handleChosen: boolean;
  changesPerWindow: number;
  windowDays: number;
  holdDays: number;
  changesUsed: number;
  changesLeft: number;
  /** ISO, uniquement quand le joueur est BLOQUÉ. `null` = il peut changer. */
  nextChangeAllowedAt: string | null;
  reclaimable: HandleReclaim2026 | null;
}

/** Motifs de refus de `change_my_handle_2026` (contrat figé, miroir SQL 0175). */
export type HandleRefusal2026 =
  | 'authentication_required'
  | 'no_profile'
  | 'too_short'
  | 'too_long'
  | 'bad_chars'
  | 'reserved'
  | 'taken'
  | 'held'
  | 'rate_limited';

/** Motifs de SUCCÈS. « named » ne consomme rien, « unchanged » non plus. */
export type HandleSuccess2026 = 'changed' | 'named' | 'unchanged';

export interface HandleChange2026 {
  ok: boolean;
  reason: HandleSuccess2026 | HandleRefusal2026 | 'unknown';
  handle: string;
  changesLeft: number | null;
  nextChangeAllowedAt: string | null;
  heldUntil: string | null;
}

const REFUSALS: readonly string[] = [
  'authentication_required',
  'no_profile',
  'too_short',
  'too_long',
  'bad_chars',
  'reserved',
  'taken',
  'held',
  'rate_limited',
];
const SUCCESSES: readonly string[] = ['changed', 'named', 'unchanged'];

const asString = (value: unknown): string => (typeof value === 'string' ? value : '');
const asIso = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;
const asInt = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;

/**
 * PURE. jsonb de `my_handle_status_2026()` → état affichable, ou `null` quand
 * la réponse n'est pas exploitable (pas de session, serveur plus vieux que
 * l'app, forme inattendue). `null` n'est PAS « zéro changement restant » :
 * l'écran doit le dire, pas le combler.
 */
export function parseHandleStatus2026(data: unknown): HandleStatus2026 | null {
  if (typeof data !== 'object' || data === null) return null;
  const row = data as Record<string, unknown>;
  if (typeof row.changes_left !== 'number') return null;
  const claim = row.reclaimable;
  let reclaimable: HandleReclaim2026 | null = null;
  if (typeof claim === 'object' && claim !== null) {
    const c = claim as Record<string, unknown>;
    const handle = asString(c.handle);
    const heldUntil = asIso(c.held_until);
    // Une reprise sans date de fin ne se peint pas : le bouton ne saurait pas
    // dire jusqu'à quand il reste vrai.
    if (handle.length > 0 && heldUntil) reclaimable = { handle, heldUntil };
  }
  return {
    handle: asString(row.handle),
    hasProfile: row.has_profile === true,
    handleChosen: row.handle_chosen === true,
    // Les trois règles viennent du SERVEUR quand il les dit ; les constantes
    // partagées ne servent que de repli pour un serveur en retard.
    changesPerWindow: asInt(row.changes_per_window, HANDLE_CHANGES_PER_WINDOW),
    windowDays: asInt(row.window_days, HANDLE_CHANGE_WINDOW_DAYS),
    holdDays: asInt(row.hold_days, HANDLE_HOLD_DAYS),
    changesUsed: asInt(row.changes_used, 0),
    changesLeft: asInt(row.changes_left, 0),
    nextChangeAllowedAt: asIso(row.next_change_allowed_at),
    reclaimable,
  };
}

/** PURE. jsonb de `change_my_handle_2026()` → résultat lisible. */
export function parseHandleChange2026(data: unknown): HandleChange2026 {
  const unknownResult: HandleChange2026 = {
    ok: false,
    reason: 'unknown',
    handle: '',
    changesLeft: null,
    nextChangeAllowedAt: null,
    heldUntil: null,
  };
  if (typeof data !== 'object' || data === null) return unknownResult;
  const row = data as Record<string, unknown>;
  const reason = asString(row.reason);
  const ok = row.ok === true;
  const known = ok ? SUCCESSES.includes(reason) : REFUSALS.includes(reason);
  return {
    ok,
    reason: known ? (reason as HandleSuccess2026 | HandleRefusal2026) : 'unknown',
    handle: asString(row.handle),
    changesLeft: typeof row.changes_left === 'number' ? Math.trunc(row.changes_left) : null,
    nextChangeAllowedAt: asIso(row.next_change_allowed_at),
    heldUntil: asIso(row.held_until),
  };
}

/** Une phrase, ses deux langues. Lues par `noDashFr2026` : pas de tiret long en fr. */
interface Phrase {
  fr: string;
  en: string;
}

const pick = (phrase: Phrase, en: boolean): string => (en ? phrase.en : phrase.fr);

/**
 * LA RÈGLE, EN UNE PHRASE. Elle est dite AVANT que le joueur touche au champ,
 * jamais après coup dans un message d'erreur : découvrir un plafond au moment
 * où il vous refuse quelque chose est la définition d'une règle cachée.
 */
export function handleRuleSentence2026(
  changesPerWindow: number,
  windowDays: number,
  holdDays: number,
  en: boolean,
): string {
  const phrase: Phrase = {
    fr: 'Tu peux changer ton pseudo {n} fois par {w} jours. Ton ancien pseudo reste réservé {h} jours.',
    en: 'You can change your handle {n} times every {w} days. Your previous handle stays reserved for {h} days.',
  };
  return pick(phrase, en)
    .replace('{n}', String(changesPerWindow))
    .replace('{w}', String(windowDays))
    .replace('{h}', String(holdDays));
}

/**
 * CE QU'IL LUI RESTE. Trois phrases distinctes, parce que trois situations
 * différentes : il n'a pas encore choisi, il peut encore changer, il est bloqué
 * jusqu'à une date. Aucune ne se replie sur une autre.
 */
export function handleCreditSentence2026(
  status: HandleStatus2026,
  en: boolean,
  formatDate: (iso: string) => string,
): string {
  if (!status.handleChosen) {
    return pick(
      {
        fr: 'Ton pseudo n’est pas encore choisi. Le premier ne compte pas dans tes changements.',
        en: 'You have not chosen your handle yet. The first one does not count towards your changes.',
      },
      en,
    );
  }
  if (status.changesLeft > 0) {
    const phrase: Phrase =
      status.changesLeft === 1
        ? {
            fr: 'Il te reste 1 changement sur cette période.',
            en: 'You have 1 change left in this period.',
          }
        : {
            fr: 'Il te reste {n} changements sur cette période.',
            en: 'You have {n} changes left in this period.',
          };
    return pick(phrase, en).replace('{n}', String(status.changesLeft));
  }
  if (status.nextChangeAllowedAt) {
    return pick(
      {
        fr: 'Tu as utilisé tes {n} changements. Le prochain sera possible le {date}.',
        en: 'You have used your {n} changes. The next one is possible on {date}.',
      },
      en,
    )
      .replace('{n}', String(status.changesPerWindow))
      .replace('{date}', formatDate(status.nextChangeAllowedAt));
  }
  // Plus de crédit ET pas de date : le serveur n'a pas dit quand. On ne la
  // devine pas (14 jours après quoi ?), on dit ce qu'on sait.
  return pick(
    {
      fr: 'Tu as utilisé tes {n} changements pour cette période.',
      en: 'You have used your {n} changes for this period.',
    },
    en,
  ).replace('{n}', String(status.changesPerWindow));
}

/**
 * LE REFUS, NOMMÉ. Chaque motif a sa phrase et son geste : « pris » se répare
 * en changeant de pseudo, « plafond » en attendant une date, « format » en
 * retapant. Un message unique les mélangerait et n'apprendrait rien.
 */
export function handleRefusalMessage2026(
  result: HandleChange2026,
  en: boolean,
  formatDate: (iso: string) => string,
  bounds: { min: number; max: number },
): string {
  const messages: Record<HandleRefusal2026, Phrase> = {
    authentication_required: {
      fr: 'Ton pseudo s’enregistre sur ton compte. Reconnecte-toi pour le changer.',
      en: 'Your handle is saved to your account. Sign in again to change it.',
    },
    no_profile: {
      fr: 'Ton profil n’est pas encore créé sur le serveur. Enregistre ton nom d’abord.',
      en: 'Your profile does not exist on the server yet. Save your name first.',
    },
    too_short: {
      fr: 'Ton pseudo fait au moins {min} caractères.',
      en: 'Your handle needs at least {min} characters.',
    },
    too_long: {
      fr: 'Ton pseudo fait au plus {max} caractères.',
      en: 'Your handle can be at most {max} characters.',
    },
    bad_chars: {
      fr: 'Ton pseudo n’accepte que des minuscules, des chiffres et des tirets bas.',
      en: 'Your handle only accepts lowercase letters, numbers and underscores.',
    },
    reserved: {
      fr: 'Ce pseudo est réservé (marque ou terme officiel). Choisis-en un autre.',
      en: 'This handle is reserved (brand or official term). Pick another one.',
    },
    taken: {
      fr: 'Ce pseudo est déjà porté par quelqu’un. Choisis-en un autre.',
      en: 'Someone already uses this handle. Pick another one.',
    },
    held: {
      fr: 'Ce pseudo est réservé à son ancien titulaire jusqu’au {date}. Personne d’autre ne peut le prendre avant.',
      en: 'This handle is reserved for its previous owner until {date}. Nobody else can take it before then.',
    },
    rate_limited: {
      fr: 'Tu as utilisé tes changements. Le prochain sera possible le {date}.',
      en: 'You have used your changes. The next one is possible on {date}.',
    },
  };
  if (result.reason === 'unknown' || !(result.reason in messages)) {
    return en
      ? 'Your handle could not be changed. Try again.'
      : 'Ton pseudo n’a pas pu être changé. Réessaie.';
  }
  const phrase = messages[result.reason as HandleRefusal2026];
  const iso = result.reason === 'held' ? result.heldUntil : result.nextChangeAllowedAt;
  return pick(phrase, en)
    .replace('{min}', String(bounds.min))
    .replace('{max}', String(bounds.max))
    // Un refus daté dont le serveur n'a pas donné la date reste un refus : on
    // retire la date au lieu d'en inventer une ou d'afficher « Invalid Date ».
    .replace(' le {date}', iso ? ` le ${formatDate(iso)}` : '')
    .replace(" jusqu’au {date}", iso ? ` jusqu’au ${formatDate(iso)}` : '')
    .replace(' on {date}', iso ? ` on ${formatDate(iso)}` : '')
    .replace(' until {date}', iso ? ` until ${formatDate(iso)}` : '');
}
