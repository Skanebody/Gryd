/**
 * GRYD — CE QUE L'APP A LE DROIT DE DIRE QUAND LE LIEN VIENT D'ABOUTIR. PURE.
 *
 * ═══ LE DÉFAUT DU FONDATEUR (12/09/2026) ════════════════════════════════════
 * « il faudrait qu'appuyer sur le lien dise félicitations, vous êtes inscrit ».
 * Jusqu'ici `app/(auth)/callback.tsx` faisait, à la seconde où la session
 * prenait : `router.replace('/')`. Le joueur passait donc de sa boîte mail à
 * une carte, sans un mot — rien ne lui confirmait que son compte existait. Le
 * geste le plus engageant du produit n'avait aucun accusé de réception.
 *
 * ═══ MAIS ON NE FÉLICITE PAS QUELQU'UN QUI REVIENT ══════════════════════════
 * Le même lien connecte ET crée (`shouldCreateUser: true`). Dire « ton compte
 * est créé » à quelqu'un qui se reconnecte serait un mensonge de plus, pas un
 * mot gentil. D'où un VERDICT, calculé ici, sur des faits — jamais sur une
 * supposition d'écran.
 *
 * ─── LES TROIS SOURCES, DANS L'ORDRE DE FIABILITÉ ───────────────────────────
 *
 *  1. `type` DANS LE RETOUR. GoTrue le pose lui-même : `signup` quand le lien a
 *     CRÉÉ le compte, `magiclink` / `recovery` / `invite` / `email_change`
 *     sinon. C'est le serveur qui parle, et il parle du geste qui vient d'avoir
 *     lieu : rien ne peut être plus juste. `signup` tranche à lui seul.
 *
 *  2. `handle_chosen_2026` (migration 0175, lu par `my_handle_status_2026`).
 *     `false` = le joueur porte encore l'étiquette posée à l'inscription par
 *     0154 (`runner_5f3a91c0…`) : il n'a jamais nommé son pseudo, donc il n'a
 *     jamais fini de s'inscrire. C'est ce qui rattrape le cas où `type` manque
 *     — un lien recopié, un client mail qui coupe le fragment, un retour PKCE.
 *
 *  3. LA DATE DE CRÉATION DU COMPTE, en tout dernier recours, quand la lecture
 *     serveur n'a pas abouti. Elle vient de la session (`user.created_at`) donc
 *     elle est toujours là ; elle est moins sûre que les deux autres parce
 *     qu'elle mesure un délai, pas un fait.
 *
 * ─── ET QUAND ON NE SAIT PAS, ON NE DEVINE PAS ──────────────────────────────
 * `'unknown'` existe pour ça. L'écran lui donne sa propre phrase — celle qui
 * est vraie dans tous les cas, « Te voilà connecté » — au lieu d'emprunter
 * celle du voisin. C'est la même discipline que `authCallbackVerdict2026`, qui
 * a cinq verdicts parce qu'il y a cinq faits.
 *
 * PUR : ni React, ni réseau. `npm run test:mobile` type-vérifie tout le graphe
 * d'imports ; ces règles doivent être prouvables sans téléphone et sans compte.
 */

/**
 * Ce que GoTrue écrit dans le retour. Fermé : une valeur inconnue ne devient
 * jamais un verdict, elle retombe sur les autres sources.
 */
export type CallbackType2026 = 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change';

const CALLBACK_TYPES: readonly string[] = [
  'signup',
  'magiclink',
  'recovery',
  'invite',
  'email_change',
];

/**
 * Lit `type` dans le FRAGMENT ou la query d'une URL de retour. PURE.
 *
 * Le fragment d'abord : c'est là que GoTrue le met en flux implicite, et c'est
 * la seule partie de l'URL qui ne part jamais au serveur.
 */
export function callbackType2026(rawUrl: string | null | undefined): CallbackType2026 | null {
  if (!rawUrl) return null;
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  const query = new URLSearchParams(url.search.replace(/^\?/, ''));
  const value = fragment.get('type') ?? query.get('type');
  if (value === null) return null;
  return CALLBACK_TYPES.includes(value) ? (value as CallbackType2026) : null;
}

/**
 * FENÊTRE DE « COMPTE CRÉÉ À L'INSTANT ».
 *
 * Ce n'est PAS une règle de jeu (elle ne décide ni claim, ni point, ni
 * distance) : elle ne vit donc pas dans `game-rules.ts`, même distinction que
 * `AUTH_CALLBACK_URL_WAIT_MS` ou `PROFILE_READ_TIMEOUT_MS`.
 *
 * Cinq minutes, et le raisonnement tient à ce qui sépare les deux cas qu'elle
 * doit distinguer : entre l'inscription et l'ouverture du lien il y a un
 * aller-retour d'e-mail (secondes à quelques minutes), tandis qu'une
 * RECONNEXION porte forcément un compte plus vieux que la session qui vient de
 * l'engendrer — en pratique des heures ou des jours. Un lien Supabase expire
 * d'ailleurs dans l'heure : au-delà de cinq minutes on est encore largement
 * dans la vie du lien, mais plus du tout dans le geste d'inscription.
 *
 * ⚠️ ELLE N'EST LUE QU'EN DERNIER RECOURS — quand ni `type` ni
 * `handle_chosen_2026` n'ont pu répondre. Une horloge d'appareil décalée ne
 * peut donc pas, à elle seule, faire féliciter quelqu'un qui revient.
 */
export const FRESH_ACCOUNT_WINDOW_MS = 5 * 60 * 1000;

/**
 * La lecture serveur du statut de pseudo (`my_handle_status_2026`), en trois
 * états — jamais deux. `'failed'` recouvre l'échec ET le délai dépassé : dans
 * les deux cas on n'a pas de réponse, et une absence de réponse n'est pas une
 * réponse.
 */
export type WelcomeRead2026 =
  | { readonly state: 'reading' }
  | { readonly state: 'ready'; readonly handle: string; readonly handleChosen: boolean }
  | { readonly state: 'failed' };

/**
 * · `'fresh'`     — ce lien vient de CRÉER le compte. On félicite.
 * · `'returning'` — le compte existait. On accueille.
 * · `'unknown'`   — on ne sait pas lequel des deux. On dit ce qui est vrai
 *                   dans les deux cas, et rien de plus.
 */
export type WelcomeKind2026 = 'fresh' | 'returning' | 'unknown';

export interface WelcomeInput2026 {
  /** `type` lu dans le retour (`callbackType2026`). */
  readonly callbackType: CallbackType2026 | null;
  /** Ce que `my_handle_status_2026` a répondu, ou pas encore. */
  readonly read: WelcomeRead2026;
  /** `user.created_at` de la session (ISO), s'il est lisible. */
  readonly accountCreatedAt: string | null;
  /** Horloge de l'appareil. Injectée : une fonction pure n'appelle pas `Date.now()`. */
  readonly now: number;
}

/**
 * Le verdict, ou `null` tant qu'il faut ATTENDRE.
 *
 * `null` n'est pas un quatrième verdict : c'est l'absence de verdict, et
 * l'écran doit continuer d'afficher son attente. Le distinguer d'`'unknown'`
 * est tout l'intérêt — l'un dit « pas encore », l'autre dit « jamais ».
 */
export function welcomeKind2026(input: WelcomeInput2026): WelcomeKind2026 | null {
  // 1. Le serveur a nommé le geste : rien ne peut être plus juste, et aucune
  //    lecture n'est nécessaire. Le joueur n'attend pas une milliseconde.
  if (input.callbackType === 'signup') return 'fresh';
  // Un lien de récupération ou de changement d'e-mail ne crée jamais un compte.
  if (input.callbackType === 'recovery' || input.callbackType === 'email_change') {
    return 'returning';
  }

  // 2. La lecture est partie et n'est pas revenue : on attend (l'écran pose son
  //    propre plafond de patience, au-delà duquel il passe `'failed'`).
  if (input.read.state === 'reading') return null;

  // 3. Le serveur sait si ce joueur s'est déjà nommé. `false` = il porte encore
  //    l'étiquette de l'inscription : son compte est neuf, quoi qu'en dise
  //    l'horloge de l'appareil.
  if (input.read.state === 'ready') return input.read.handleChosen ? 'returning' : 'fresh';

  // 4. Dernier recours : la date de création du compte.
  const created = parseIso(input.accountCreatedAt);
  if (created === null) return 'unknown';
  const age = input.now - created;
  if (age < 0) return 'unknown'; // horloge en avance : on ne conclut rien
  return age <= FRESH_ACCOUNT_WINDOW_MS ? 'fresh' : 'returning';
}

/** ISO → millisecondes, ou `null` si la chaîne n'en est pas une. */
function parseIso(value: string | null): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * LE PSEUDO QU'ON A LE DROIT D'AFFICHER DANS « Bon retour, @… ». PURE.
 *
 * Deux refus, et ils comptent tous les deux :
 *   · la lecture n'a pas abouti  → on ne connaît aucun pseudo, on n'en invente
 *     pas un à partir de l'e-mail juste pour remplir la phrase ;
 *   · `handleChosen === false`   → le « pseudo » est l'étiquette dérivée posée
 *     par l'inscription (`runner_5f3a91c0…`). Personne ne se reconnaît
 *     là-dedans, et le lire à voix haute serait plus froid que de ne rien dire.
 * Dans les deux cas l'écran rend une phrase SANS nom, qui reste vraie.
 */
export function welcomeHandle2026(read: WelcomeRead2026): string | null {
  if (read.state !== 'ready') return null;
  if (!read.handleChosen) return null;
  const handle = read.handle.trim();
  return handle.length > 0 ? handle : null;
}

/**
 * PLAFOND DE PATIENCE de la lecture du statut de pseudo, sur l'écran de retour.
 *
 * Beaucoup plus court que `PROFILE_READ_TIMEOUT_MS` (10 s), et pour une raison
 * de fond : cette lecture ne DÉBLOQUE rien. Elle affine une phrase d'accueil et
 * y ajoute un pseudo. Faire patienter quelqu'un dix secondes devant un logo
 * pour choisir entre deux félicitations serait absurde — au-delà de ce délai on
 * conclut sans elle (`'failed'`, puis la date de création tranche) et le joueur
 * entre dans l'app.
 */
export const WELCOME_READ_TIMEOUT_MS = 2500;

/**
 * OÙ MÈNE LE BOUTON UNIQUE DE L'ÉCRAN D'ACCUEIL. PURE, pour que la chaîne
 * complète soit vérifiable sans monter un seul écran.
 *
 * · compte NEUF   → la configuration du profil. C'est le seul moment où l'on a
 *   le droit de demander un pseudo : juste après « ton compte est créé », pas
 *   trois écrans plus tard quand le joueur regardait la carte.
 * · sinon         → la carte. Il n'y a rien à lui demander : il a déjà tout ça.
 */
export const WELCOME_SETUP_ROUTE = '/setup/profile' as const;
export const WELCOME_MAP_ROUTE = '/' as const;

export function welcomeDestination2026(
  kind: WelcomeKind2026,
): typeof WELCOME_SETUP_ROUTE | typeof WELCOME_MAP_ROUTE {
  return kind === 'fresh' ? WELCOME_SETUP_ROUTE : WELCOME_MAP_ROUTE;
}
