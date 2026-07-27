/**
 * GRYD — LA PORTE DU PREMIER USAGE, en fonctions PURES.
 *
 * Spec produit `GRYD_SPEC_PRODUIT_UI_UX_COMPLET.md` : après E06/E07
 * (authentification), le joueur doit traverser E08 `/setup/profile` → E09
 * `/setup/activity` → E10 `/setup/permissions` → la carte. Un joueur qui a DÉJÀ
 * un profil ne doit JAMAIS retraverser ces écrans.
 *
 * ─── LE DRAPEAU NE SE DEVINE PAS : IL SE LIT ────────────────────────────────
 * « Profil minimal fait » = il existe une ligne `public.user_profiles` pour ce
 * compte. C'est un fait SERVEUR, pas une case cochée sur le téléphone :
 *   · `0011_social.sql:45` — `handle text NOT NULL unique` : une ligne existe ⇒
 *     un @handle existe. Il n'y a pas de ligne « à moitié faite » ;
 *   · `0011_social.sql:201` — `user_profiles_select_visible` autorise toujours
 *     `user_id = auth.uid()` : un joueur peut TOUJOURS lire sa propre ligne ;
 *   · `0028_provision_user_on_signup.sql` provisionne `public.users`, JAMAIS
 *     `user_profiles` — l'existence de la ligne est donc bien le signal d'un
 *     passage par E08, et de rien d'autre.
 * Un drapeau local (AsyncStorage) aurait renvoyé dans le parcours tout joueur
 * qui change de téléphone, et aurait laissé passer tout joueur qui vide son
 * stockage. C'est exactement l'erreur que `features/onboarding/store.ts` décrit
 * dans son entête (« ce stockage n'est pas une autorité »).
 *
 * ─── QUATRE ÉTATS, JAMAIS CONFONDUS ─────────────────────────────────────────
 * `MinimalProfileProbe` a CINQ valeurs pour n'en confondre aucune. La valeur qui
 * compte le plus est `'unknown'` : UN ÉCHEC DE LECTURE N'EST PAS UN PROFIL
 * ABSENT. Le confondre avec `'absent'` enverrait un joueur DÉJÀ inscrit dans un
 * formulaire de création où son propre @handle lui serait refusé (« déjà pris »)
 * — un cul-de-sac fabriqué par une panne réseau.
 *
 * ─── POURQUOI PUR (zéro import React / RN / Supabase) ───────────────────────
 * Même contrainte que `boot/bootSequence.ts` : `npm run test:mobile`
 * (`deno test --allow-read --allow-env apps/mobile/src`) typecheck ce fichier et
 * tout ce qu'il importe. Les I/O (lecture Supabase) vivent dans
 * `minimalProfile.ts`, qui compose ; la navigation vit dans
 * `app/(tabs)/_layout.tsx`, qui rend la décision.
 */

/**
 * Ce que l'app SAIT de la ligne `user_profiles` du compte courant.
 *
 * · `'idle'`    — il n'y a rien à lire : aucun backend configuré (O1) ou aucune
 *                 session. Ce n'est PAS « pas de profil » : c'est « la question
 *                 ne se pose pas encore ».
 * · `'reading'` — la requête est partie, rien n'est revenu. N'affirme RIEN sur
 *                 le joueur.
 * · `'present'` — une ligne a été LUE. Le profil minimal existe.
 * · `'absent'`  — la requête a abouti et n'a rendu AUCUNE ligne. C'est une
 *                 réponse, pas une absence de réponse.
 * · `'unknown'` — la lecture a échoué (réseau, RLS, délai dépassé). On ne sait
 *                 pas. Ni `'present'`, ni `'absent'`.
 */
export type MinimalProfileProbe = 'idle' | 'reading' | 'present' | 'absent' | 'unknown';

/**
 * Ce que la garde de route fait de cette connaissance.
 *
 * · `'wait'`  — on ne tranche pas encore. L'écran E00 (`SplashE00`) couvre :
 *               le joueur voit « ça travaille », jamais un verdict inventé.
 * · `'setup'` — le parcours de premier usage, à son PREMIER écran.
 * · `'app'`   — le produit (la carte).
 */
export type FirstRunGate = 'wait' | 'setup' | 'app';

/**
 * LE PARCOURS, DANS L'ORDRE. Cette constante n'est pas décorative : le tripwire
 * `setupChain.test.ts` lit la SOURCE des trois écrans et vérifie que le
 * `NEXT_STEP` de chacun est bien le suivant de cette liste, et que le dernier
 * sort sur `SETUP_EXIT`. Un écran qui pointerait ailleurs (ou vers une route
 * inexistante) casse le test au lieu de casser le parcours.
 *
 * Chaque écran continue de nommer SON suivant chez lui — c'est la convention
 * posée par `app/setup/_layout.tsx` (« ce layout n'orchestre pas le parcours »),
 * et elle est nécessaire : E09 se retire lui-même quand `flags.bike` est fermé,
 * une table de flow centrale ne saurait pas le faire.
 */
export const SETUP_CHAIN = ['/setup/profile', '/setup/activity', '/setup/permissions'] as const;

/** Premier écran du parcours — la cible de la garde de route. */
export const SETUP_ENTRY = SETUP_CHAIN[0];

/** Sortie du parcours : le produit lui-même (la carte, `app/(tabs)/index.tsx`). */
export const SETUP_EXIT = '/';

/**
 * LA DÉCISION. PURE, exhaustive, sans défaut caché.
 *
 * L'ordre des branches EST le raisonnement :
 *
 *  1. SANS BACKEND (O1, `configured === false`), il n'existe aucun serveur pour
 *     répondre : aucune lecture ne pourra jamais trancher. Bloquer le joueur sur
 *     un parcours dont l'écriture serveur ne peut pas aboutir serait un cul-de-
 *     sac. La garde est donc INERTE — exactement comme la garde d'auth du même
 *     layout, qui ne redirige pas non plus sans backend.
 *
 *  2. SANS SESSION, la garde d'auth (au-dessus, dans le même layout) a déjà
 *     envoyé le visiteur vers /onboarding ou /sign-in. Ici, ne rien faire.
 *
 *  3. `'reading'` → on attend. C'est le SEUL cas où l'on retient le joueur, et
 *     il est borné (`PROFILE_READ_TIMEOUT_MS`) : jamais de spinner infini.
 *
 *  4. `'absent'` → le parcours. C'est la seule porte vers E08.
 *
 *  5. `'present'` → le produit. C'est ce qui garantit qu'un joueur déjà installé
 *     ne retraverse JAMAIS E08/E09/E10.
 *
 *  6. `'unknown'` → LE PRODUIT, et c'est un arbitrage assumé, pas un oubli. On
 *     ne sait pas ; les deux erreurs possibles ne coûtent pas la même chose :
 *     envoyer un joueur inscrit dans E08 lui fait rencontrer le refus « @handle
 *     déjà pris » sur SON PROPRE handle (un cul-de-sac), tandis que laisser
 *     entrer un joueur pas encore configuré ne lui ment sur rien — la carte et
 *     le profil affichent leurs propres états honnêtes, et la lecture est
 *     retentée (voir `minimalProfile.ts`, reprise au retour au premier plan).
 *     Ce qu'on ne fait JAMAIS, c'est traiter `'unknown'` comme `'absent'`.
 *
 *  7. `'idle'` → rien à lire, rien à décider : le produit.
 */
export function decideFirstRun(input: {
  readonly configured: boolean;
  readonly hasSession: boolean;
  readonly profile: MinimalProfileProbe;
}): FirstRunGate {
  if (!input.configured) return 'app';
  if (!input.hasSession) return 'app';
  switch (input.profile) {
    case 'reading':
      return 'wait';
    case 'absent':
      return 'setup';
    case 'present':
    case 'unknown':
    case 'idle':
      return 'app';
  }
}

/**
 * Ce qu'on a le droit de conclure d'une réponse PostgREST. PURE.
 *
 * `failed` recouvre TOUT ce qui n'est pas une réponse : erreur transport, refus
 * RLS, délai dépassé. Aucun de ces cas ne dit quoi que ce soit sur l'existence
 * d'une ligne — d'où `'unknown'`, jamais `'absent'`.
 */
export function classifyProfileRead(read: {
  readonly failed: boolean;
  readonly rowFound: boolean;
}): MinimalProfileProbe {
  if (read.failed) return 'unknown';
  return read.rowFound ? 'present' : 'absent';
}

/**
 * PLAFOND DE PATIENCE de la lecture du profil minimal.
 *
 * « Jamais de spinner infini » : `supabase-js` n'impose aucun délai maximum à sa
 * requête ; sans ce plafond, un réseau qui accepte la connexion puis ne répond
 * jamais tiendrait le joueur sur l'écran E00 indéfiniment. Passé ce délai on
 * conclut `'unknown'` — « on ne sait pas » — et jamais `'absent'`.
 *
 * Valeur alignée sur le seul autre plafond RÉSEAU/matériel du dépôt :
 * `features/map/webGeolocation.ts:204` (`POSITION_TIMEOUT_MS = 10_000`). Elle
 * est délibérément plus haute que les plafonds de STOCKAGE local
 * (`BOOT_STORAGE_TIMEOUT_MS`, `STORAGE_TIMEOUT_MS` = 3 s) : un disque qui ne
 * répond pas en 3 s est en panne, un réseau mobile qui met 5 s est ordinaire.
 *
 * Ce n'est PAS une règle de jeu (elle ne décide ni claim, ni point, ni distance)
 * : elle ne vit donc pas dans `game-rules.ts`, même distinction que
 * `BOOT_STORAGE_TIMEOUT_MS` et `CRASH_RECOVERY_MAX_AGE_MS`.
 */
export const PROFILE_READ_TIMEOUT_MS = 10_000;

/**
 * Faut-il (re)lancer une lecture ? PURE — c'est la seule règle de relance, et
 * elle est ici pour être testée plutôt que dispersée dans des `if` du store.
 *
 * On relit tant qu'on n'a pas de RÉPONSE : `'unknown'` doit être retenté (c'est
 * une panne, pas un verdict), `'idle'` doit partir dès qu'une session existe.
 * On ne relit JAMAIS un `'present'` ou un `'absent'` : ce sont des réponses, et
 * les rejouer à chaque montage ferait une requête par navigation.
 */
export function shouldStartRead(input: {
  readonly configured: boolean;
  readonly hasSession: boolean;
  readonly inFlight: boolean;
  readonly profile: MinimalProfileProbe;
}): boolean {
  if (!input.configured || !input.hasSession) return false;
  if (input.inFlight) return false;
  return input.profile === 'idle' || input.profile === 'unknown';
}
