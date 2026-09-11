/**
 * GRYD — lecture contextuelle du profil, en fonctions pures.
 *
 * Depuis la refonte du 9 septembre, l'authentification ouvre directement la
 * carte. Profil, discipline et permissions restent disponibles séparément au
 * moment où leur bénéfice devient concret ; aucun de ces écrans n'est une garde.
 *
 * ─── LE DRAPEAU NE SE DEVINE PAS : IL SE LIT ────────────────────────────────
 * Cette sonde dit s'il existe une ligne `public.user_profiles` pour ce compte.
 * C'est un fait SERVEUR, pas une case cochée sur le téléphone :
 *   · `0011_social.sql:45` — `handle text NOT NULL unique` : une ligne existe ⇒
 *     un @handle existe. Il n'y a pas de ligne « à moitié faite » ;
 *   · `0011_social.sql:201` — `user_profiles_select_visible` autorise toujours
 *     `user_id = auth.uid()` : un joueur peut TOUJOURS lire sa propre ligne.
 * Un drapeau local (AsyncStorage) aurait renvoyé dans le parcours tout joueur
 * qui change de téléphone, et aurait laissé passer tout joueur qui vide son
 * stockage. C'est exactement l'erreur que `features/onboarding/store.ts` décrit
 * dans son entête (« ce stockage n'est pas une autorité »).
 *
 * ⚠️ CE QUE CETTE SONDE NE SIGNIFIE PLUS (10/09/2026, migration 0154). Elle a
 * longtemps voulu dire « ce joueur est passé par E08 » : `0028` provisionnait
 * `public.users` et JAMAIS `user_profiles`, si bien que l'absence de ligne
 * valait « profil jamais rempli ». Cette lecture est morte avec 0154, qui
 * provisionne la ligne À L'INSCRIPTION (avec un @handle dérivé, `runner_…`) —
 * sans quoi `get_ownership_2026` (0126:42) ne rendait le terrain d'un compte
 * neuf à personne, pas même à lui. `'present'` signifie donc désormais « une
 * identité minimale existe », JAMAIS « le joueur a choisi son identité ». Toute
 * surface qui voudrait savoir si le joueur a personnalisé son profil doit
 * regarder le CONTENU (`display_name`, un handle non dérivé), pas l'existence.
 *
 * ─── QUATRE ÉTATS, JAMAIS CONFONDUS ─────────────────────────────────────────
 * `MinimalProfileProbe` a CINQ valeurs pour n'en confondre aucune. La valeur qui
 * compte le plus est `'unknown'` : UN ÉCHEC DE LECTURE N'EST PAS UN PROFIL
 * ABSENT. Les surfaces sociales peuvent ainsi proposer la création d'identité
 * seulement après une réponse serveur fiable.
 *
 * ─── POURQUOI PUR (zéro import React / RN / Supabase) ───────────────────────
 * Même contrainte que `boot/bootSequence.ts` : `npm run test:mobile`
 * (`deno test --allow-read --allow-env apps/mobile/src`) typecheck ce fichier et
 * tout ce qu'il importe. Les I/O (lecture Supabase) vivent dans
 * `minimalProfile.ts`, qui compose ; les surfaces concernées rendent l'état.
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
 * Inventaire des réglages de premier usage. Chacun existe, chacun est une vraie
 * route, et chacun sort SUR LA CARTE — directement, ou par l'étape suivante.
 */
export const SETUP_CHAIN = ['/setup/profile', '/setup/activity', '/setup/permissions'] as const;

/** Sortie du parcours : le produit lui-même (la carte, `app/(tabs)/index.tsx`). */
export const SETUP_EXIT = '/';

/**
 * CE QUI SUIT CHAQUE ÉCRAN, ET POURQUOI CE N'EST PLUS « LA CARTE » PARTOUT.
 *
 * ─── L'ÉTAT D'AVANT (septembre, refonte du 9) ───────────────────────────────
 * Les trois écrans sortaient tous sur `/`, et RIEN n'y menait : `/setup/*`
 * n'était nommé par aucune navigation de l'app. Le résultat n'était pas « un
 * parcours contextuel », c'était trois écrans inaccessibles — et un joueur qui
 * venait de créer son compte gardait le pseudo `runner_5f3a91c0…` que
 * l'inscription lui avait collé (migration 0154), sans que rien ne lui propose
 * jamais d'en choisir un.
 *
 * ─── L'ÉTAT D'APRÈS (12/09/2026) ────────────────────────────────────────────
 * L'écran d'accueil du lien (`app/(auth)/callback.tsx`) ouvre E08 pour un
 * compte NEUF, et seulement pour lui. E08 enchaîne sur E09 parce que les deux
 * questions se posent au même moment (« qui es-tu » puis « tu cours ou tu
 * roules ») et qu'elles tiennent en deux écrans ; E09 rend la main à la carte.
 * E10 (permissions) reste HORS de la chaîne : la boîte système se demande au
 * premier GO, là où elle a un bénéfice immédiat, pas trois écrans avant.
 *
 * Une table plutôt que trois littéraux dispersés : c'est elle que lit le
 * tripwire de source (`setupChain.test.ts`), donc changer la chaîne sans
 * changer les écrans — ou l'inverse — fait échouer un test au lieu de déposer
 * un joueur sur « Unmatched route ».
 */
export const SETUP_NEXT: Readonly<Record<(typeof SETUP_CHAIN)[number], string>> = {
  '/setup/profile': '/setup/activity',
  '/setup/activity': SETUP_EXIT,
  '/setup/permissions': SETUP_EXIT,
};

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
