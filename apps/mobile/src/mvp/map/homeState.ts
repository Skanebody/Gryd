/**
 * GRYD — CE QUE L'ÉCRAN D'ACCUEIL A LE DROIT D'AFFIRMER. PUR (lot M3).
 *
 * ─── POURQUOI CE MODULE EXISTE ──────────────────────────────────────────────
 * L1 exige que la carte réponde en moins d'une seconde à trois questions : « où
 * suis-je ? », « qu'est-ce qui est à moi ? », « que dois-je faire ? ». La
 * deuxième est un PIÈGE : la réponse honnête dépend d'un aller-retour réseau
 * qui peut être en cours, échouer, ou n'avoir jamais eu de destinataire.
 *
 * Un écran qui rend « rien » dans ces trois cas dit trois fois la même chose —
 * « tu n'as pas de territoire » — et c'est FAUX deux fois sur trois. C'est
 * exactement le mensonge que la constitution interdit : « données RÉELLES ou
 * VIDES, jamais fabriquées ; quatre états DISTINCTS, jamais confondus ». Une
 * carte vide pendant un chargement AFFIRME quelque chose qu'elle ne sait pas.
 *
 * D'où cette machine, isolée du rendu : `homeStatus` ne peut PAS renvoyer
 * `empty` sans une lecture réussie, et `heroAreaM2` ne peut PAS renvoyer un
 * nombre sans elle. Ce n'est plus une discipline de revue, c'est un type.
 *
 * ─── CE QU'IL NE FAIT PAS ───────────────────────────────────────────────────
 * Aucune I/O, aucun React, aucun Supabase, aucune horloge. Tout entre par les
 * paramètres — c'est ce qui rend testables les états qu'on ne sait pas
 * provoquer à la main (un backend injoignable, une permission bloquée).
 */

/** Le backend est-il seulement JOIGNABLE par ce build ? (`isSupabaseConfigured`) */
export type BackendReach = 'configured' | 'absent';

/**
 * Sait-on DE QUI on parle ? Sans compte, « à moi » n'a pas de référent.
 *
 * ⚠️ `restoring` N'EST PAS UN DÉTAIL. Au démarrage à froid, la session est lue
 * depuis le stockage avant d'être connue : la confondre avec `signedOut` ferait
 * afficher « pas de compte » à quelqu'un qui en a un, à CHAQUE ouverture, le
 * temps d'un aller-retour. C'est un mensonge bref, donc invisible en revue, et
 * vu par tous les joueurs à chaque fois. (Le legacy avait déjà tranché ainsi —
 * `features/map/territoriesSource.ts:720` ordonne `sessionLoading` en premier.)
 */
export type SessionState = 'signedIn' | 'signedOut' | 'restoring';

/**
 * Le résultat de la lecture des territoires du joueur.
 *
 * `idle` et `loading` sont DISTINCTS de `failed`, et les trois sont distincts
 * de `ok` avec zéro territoire : c'est toute la raison d'être de ce type.
 *
 * ⚠️ CONTRAT DE L'APPELANT : « ÉCHEC PARTIEL » N'EXISTE PAS. Si la carte
 * s'alimente un jour à plusieurs lectures et qu'une seule échoue, ce qui entre
 * ici est `failed` — pas un `ok` amputé. Peindre la moitié qui a répondu
 * montrerait MOINS de territoire qu'il n'y en a : une sous-déclaration
 * silencieuse est un mensonge au même titre qu'une donnée inventée.
 */
export type TerritoryRead =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'failed' }
  | { readonly kind: 'ok'; readonly ownedCount: number; readonly areaM2: number };

/**
 * L'autorisation de position, telle que l'écran la connaît.
 *
 * `blocked` = l'OS ne rouvrira plus son dialogue (`canAskAgain: false`, voir
 * `onboarding/permission.ts`). `unknown` = pas encore demandée.
 */
export type LocationAccess = 'granted' | 'unknown' | 'blocked';

export interface HomeInput {
  readonly backend: BackendReach;
  readonly session: SessionState;
  readonly read: TerritoryRead;
  readonly location: LocationAccess;
  /**
   * Une course interrompue attend-elle sur le disque ? (`mvp/run/persist.ts`)
   *
   * C'est une CAPACITÉ, pas un affichage : elle change ce que le joueur peut
   * faire de plus urgent. Une trace qui survit à un crash sans que personne ne
   * le sache est perdue quand même — c'est tout l'objet de never-lose-a-run.
   */
  readonly interrupted?: boolean;
}

/**
 * Ce que l'écran a le droit de DIRE sur « qu'est-ce qui est à moi ? ».
 *
 * Six valeurs, parce qu'il y a six réponses honnêtes différentes — et pas une
 * de moins : les fondre reviendrait à affirmer l'une à la place de l'autre.
 *   · `unavailable` — ce build ne peut joindre aucun serveur. On ne sait pas.
 *   · `signedOut`   — pas de compte. « À moi » n'a pas encore de sens.
 *   · `loading`     — la lecture est EN COURS. Elle n'affirme rien.
 *   · `failed`      — la lecture a échoué. Elle n'affirme rien non plus.
 *   · `empty`       — lu, et le joueur n'a RIEN. Seul cas où le vide est vrai.
 *   · `owned`       — lu, et il a quelque chose.
 */
export type HomeStatus = 'unavailable' | 'signedOut' | 'loading' | 'failed' | 'empty' | 'owned';

/**
 * Réponse honnête à « qu'est-ce qui est à moi ? ». PURE.
 *
 * L'ORDRE des cas est le fond du sujet : chaque test écarte une raison de ne
 * pas savoir, et `empty` n'est atteignable qu'une fois toutes écartées ET la
 * lecture réussie. Un `empty` prononcé plus tôt serait une donnée fabriquée.
 */
export function homeStatus(input: HomeInput): HomeStatus {
  if (input.backend === 'absent') return 'unavailable';
  // La session AVANT la lecture, et `restoring` avant `signedOut` : tant qu'on
  // restaure, on ne sait pas encore s'il y a un compte — donc on n'en conclut
  // rien, ni dans un sens ni dans l'autre.
  if (input.session === 'restoring') return 'loading';
  if (input.session === 'signedOut') return 'signedOut';
  // `idle` compte comme `loading` : n'avoir pas encore demandé n'autorise pas
  // davantage à conclure que d'attendre la réponse.
  if (input.read.kind === 'idle' || input.read.kind === 'loading') return 'loading';
  if (input.read.kind === 'failed') return 'failed';
  return input.read.ownedCount > 0 ? 'owned' : 'empty';
}

/**
 * Le CHIFFRE HÉROS (L12) — ou `null` quand il n'y a pas de vérité à afficher.
 *
 * `null` et zéro ne sont PAS interchangeables : « 0 m² » affirme que le joueur
 * n'a rien, et la constitution interdit le « 0 » nu précisément parce qu'il se
 * lit comme un fait alors qu'il vient souvent d'un écran qui ne sait pas.
 * Ici, un nombre ne sort que d'une lecture réussie et non vide — dans tous les
 * autres cas, c'est une PHRASE qui parle, pas un compteur.
 */
export function heroAreaM2(input: HomeInput): number | null {
  return homeStatus(input) === 'owned' && input.read.kind === 'ok' ? input.read.areaM2 : null;
}

/**
 * L'UNIQUE action primaire de l'accueil (L2).
 *
 *   · `resume`       — une course interrompue attend d'être reprise ou close.
 *   · `go`           — partir courir. C'est l'action du jeu.
 *   · `askLocation`  — l'OS acceptera de redemander : un tap suffit.
 *   · `openSettings` — l'OS a fermé la porte ; les réglages sont la seule voie.
 *   · `retry`        — la lecture a échoué : réessayer est une vraie action.
 *   · `none`         — rien de ce que le joueur peut faire ne débloque l'état.
 */
export type HomeAction = 'resume' | 'go' | 'askLocation' | 'openSettings' | 'retry' | 'none';

/**
 * Quelle action peindre. PURE.
 *
 * ⚠️ « AUCUN BOUTON MORT » (constitution) : cette fonction dérive l'action de
 * la CAPACITÉ RÉELLE, jamais de l'écran où l'on se trouve.
 *
 *   1. Backend injoignable → `none`. Peindre GO ici ferait courir quelqu'un
 *      pour un territoire que rien ne pourra jamais lui attribuer : le bouton
 *      « marcherait », et la promesse ne viendrait pas. C'est la définition
 *      d'un bouton mort, et c'est plus grave qu'une absence de bouton.
 *   2. Permission bloquée → `openSettings`. 3. Pas encore accordée →
 *      `askLocation`. Sans position, la trace n'existe pas : GO ne peut rien
 *      produire.
 *   1bis. Une course INTERROMPUE l'emporte sur tout le reste (sauf le backend) :
 *      c'est la seule chose à l'écran qui puisse encore être PERDUE.
 *   4. Sinon → `go`, MÊME PENDANT LE CHARGEMENT et MÊME après un échec de
 *      lecture. Courir ne dépend pas de savoir ce qu'on possède déjà, et faire
 *      attendre le départ derrière un aller-retour réseau casserait L3 (deux
 *      taps) pour une information dont le départ n'a aucun besoin.
 *
 * `retry` n'est donc JAMAIS l'action primaire quand on peut courir : l'échec de
 * lecture se rejoue par un geste secondaire, il ne prend pas la place du jeu.
 */
export function homeAction(input: HomeInput): HomeAction {
  // AVANT TOUT LE RESTE, backend compris. Rouvrir une course qui attend sur le
  // disque ne demande NI serveur NI nouvelle permission : la trace est déjà là,
  // on peut la voir et la clore. La cacher derrière l'une ou l'autre la ferait
  // disparaître pour quelqu'un hors ligne ou ayant refusé la position —
  // c'est-à-dire annuler la garantie dans les cas mêmes où elle sert le plus.
  //
  // ⚠️ L'ordre inverse a été écrit d'abord, et la preview l'a démenti : avec un
  // backend absent, l'accueil ANNONÇAIT la course retrouvée sans offrir aucun
  // moyen de l'ouvrir. Dire qu'une chose existe sans permettre d'y accéder est
  // pire que se taire.
  if (input.interrupted === true) return 'resume';
  if (input.backend === 'absent') return 'none';
  if (input.location === 'blocked') return 'openSettings';
  if (input.location === 'unknown') return 'askLocation';
  return 'go';
}

/**
 * L'échec de lecture se rattrape-t-il par un geste SECONDAIRE ?
 *
 * Séparé de l'action primaire exprès : « réessayer » doit rester atteignable
 * sans jamais déloger GO (L2 — une seule action primaire, et c'est le jeu).
 */
export function canRetryRead(input: HomeInput): boolean {
  return homeStatus(input) === 'failed';
}

/**
 * La carte peut-elle CENTRER sur le joueur ? (« où suis-je ? », L1)
 *
 * Sans autorisation, non — et l'écran doit alors montrer la ville sans prétendre
 * savoir où l'on est. Un point bleu au centre par défaut serait une position
 * inventée.
 */
export function canCenterOnPlayer(input: HomeInput): boolean {
  return input.location === 'granted';
}
