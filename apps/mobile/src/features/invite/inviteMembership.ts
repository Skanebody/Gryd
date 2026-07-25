/**
 * GRYD — INVITATION CREW : « suis-je DÉJÀ dans ce crew ? », en fonction PURE.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 * L'écran `/c/[code]` posait la question à `useRealCrew().fetchMyCode()` et
 * lisait la réponse naïvement : `if (res.ok && res.code === code)`. Or
 * `fetchMyCode` REPLIE toute panne sur la MÊME valeur que l'absence de crew —
 * `{ ok: false, reason: 'no_crew' }` (features/crew/real.ts:654-663 : le `catch`
 * et la branche `error` renvoient tous deux `no_crew`). Réseau coupé, RLS, RPC
 * absente et « je n'ai réellement aucun crew » deviennent indiscernables.
 * Conséquence à l'écran : une RPC injoignable était rendue EXACTEMENT comme
 * « tu n'es pas dans ce crew ». Un fait qu'on n'a pas pu lire ne s'affirme pas.
 *
 * ── LA SORTIE, SANS TOUCHER AU HOOK ─────────────────────────────────────────
 * `src/features/crew/real.ts` appartient à un périmètre GELÉ (écrans recalés) :
 * on ne peut pas y ajouter un `reason: 'error'`. Mais le hook expose une SECONDE
 * lecture, indépendante : l'adhésion (`crew` / `loading` / `loadFailed`). Elle
 * sait si le joueur a un crew — sans savoir LEQUEL (la colonne `code` est
 * secrète depuis la migration 0036, seule la RPC `my_crew_code` la rend).
 *
 * Croiser les deux rend l'échec DÉTECTABLE : **avoir un crew ET ne pas obtenir
 * son code est une contradiction, donc une panne.** C'est ce raisonnement, et
 * lui seul, qui fait exister le 3ᵉ état honnête sur cet écran.
 *
 * ── POURQUOI « UN AUTRE CREW » EST UN ÉTAT À PART ───────────────────────────
 * `join_crew_by_code` (migration 0042 §2, réécrite 0043 §3) fait un SWITCH quand
 * l'appelant a déjà une adhésion active : elle CLÔT l'ancienne (`left_at = now()`)
 * avant d'insérer la nouvelle. Rejoindre depuis un autre crew, c'est donc QUITTER
 * le sien — un effet destructif que la copie doit annoncer avant le tap, pas
 * après. Sans cette distinction, l'écran promettrait une addition là où le
 * serveur fait un remplacement.
 *
 * ── ORDRE DE DÉCISION (il est le cœur de la correction) ─────────────────────
 * On consulte D'ABORD la lecture du code, parce qu'elle est la seule qui puisse
 * répondre POSITIVEMENT. Ce n'est qu'en cas d'échec de celle-ci qu'on interroge
 * l'adhésion pour trancher entre « pas de crew » et « pas pu lire ». Ce sens
 * évite l'affirmation prématurée : `useRealCrew` démarre à
 * `{ loading: false, crew: null }` AVANT que son effet ait tourné — lire ce
 * `null` en premier dirait « pas de crew » sans avoir regardé.
 *
 * Deno, zéro réseau, zéro horloge : tout entre par l'input.
 */

/** Ce que la RPC `my_crew_code` a renvoyé. `null` = elle n'a pas encore répondu. */
export type MyCodeRead = { ok: true; code: string } | { ok: false };

/** Les cinq situations que l'écran a le droit de rendre — jamais fondues. */
export type InviteMembership =
  /** ④ On lit encore. N'affirme RIEN : ni « rejoins », ni « déjà membre ». */
  | 'reading'
  /** ③ La lecture a échoué. DISTINCT du vide : on propose « Réessayer ». */
  | 'unreadable'
  /** (a) Membre de CE crew — l'invitation est sans objet. */
  | 'this-crew'
  /** (b′) Membre d'un AUTRE crew — rejoindre ici l'en fait SORTIR (switch serveur). */
  | 'other-crew'
  /** (b) Lu, et sans crew : rejoindre est une simple entrée. */
  | 'no-crew';

export interface InviteMembershipInput {
  /** Réponse de `my_crew_code`, ou `null` tant qu'elle n'est pas revenue. */
  codeRead: MyCodeRead | null;
  /** `useRealCrew().loading` — la lecture d'adhésion est en vol. */
  membershipLoading: boolean;
  /** `useRealCrew().loadFailed` — la lecture d'adhésion a échoué. */
  membershipFailed: boolean;
  /** `useRealCrew().crew !== null` — le joueur a une adhésion active. */
  hasCrew: boolean;
  /** Le code porté par le lien d'invitation. */
  invitedCode: string;
}

/**
 * Normalisation locale (majuscules + espaces retirés). Volontairement DUPLIQUÉE
 * plutôt qu'importée de `crew/pendingInvite.ts` : ce module tire AsyncStorage,
 * qui ne s'importe pas dans un test Deno. Trois caractères de logique, aucun
 * risque de dérive — les codes sont `[A-Z0-9]{6}` côté serveur (0043 §3).
 */
function norm(code: string): string {
  return code.trim().toUpperCase();
}

export function inviteMembership(input: InviteMembershipInput): InviteMembership {
  const { codeRead, membershipLoading, membershipFailed, hasCrew, invitedCode } = input;

  // Rien n'est encore revenu : on ne sait pas, et on le dit comme tel.
  if (codeRead === null) return 'reading';

  // Le code est là : c'est la seule réponse qui tranche à elle seule. Même si
  // la lecture d'adhésion a échoué par ailleurs, savoir mon code SUFFIT.
  if (codeRead.ok) {
    return norm(codeRead.code) === norm(invitedCode) ? 'this-crew' : 'other-crew';
  }

  // Pas de code. Trois réalités se cachent derrière ce même `{ ok: false }` ;
  // seule l'adhésion peut les séparer.
  if (membershipLoading) return 'reading';
  // Contradiction — il A un crew, la RPC aurait dû rendre son code : c'est une
  // panne, pas une absence. Idem si l'adhésion elle-même n'a pas pu être lue.
  if (membershipFailed || hasCrew) return 'unreadable';
  return 'no-crew';
}
