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
 * provoquer à la main (un backend injoignable, une permission bloquée). Les
 * deux seuls imports sont des CONSTANTES et un TYPE : rien qui s'exécute.
 */
import { RUN_MIN_DISTANCE_M } from '@klaim/shared';
import type { TerritoryFeatureCollection } from './territoryGeo';

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
  /**
   * Une course TERMINÉE attend-elle d'être envoyée ? (`lib/pendingUpload.ts`)
   *
   * ⚠️ CE N'EST PAS `interrupted`. Une course interrompue n'a jamais été close ;
   * celle-ci l'est, elle est complète sur le disque, et le SERVEUR ne la connaît
   * pas encore. La conséquence est exactement celle que ce module existe pour
   * empêcher : la lecture des territoires est honnête sur ce que le serveur
   * sait, et le serveur ne sait pas tout.
   *
   * `false` couvre DEUX cas — « rien en attente » et « pas encore lu / file
   * illisible » — et c'est délibéré. `hasPendingUpload()` retombe déjà sur false
   * quand AsyncStorage jette, avec sa raison écrite : « on n'affiche jamais une
   * promesse inenvoyable ». En faire une troisième raison de ne pas savoir
   * bloquerait l'accueil sur « Lecture en cours… » à VIE le jour où le stockage
   * casse — le spinner infini que L8 interdit, en échange d'un mot qu'on ne peut
   * de toute façon pas tenir.
   */
  readonly pending?: boolean;
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
 *   · `pending`     — lu « rien », mais une course TERMINÉE attend d'être
 *                     envoyée : le serveur n'a pas encore tout vu. Le zéro
 *                     qu'il rend est vrai de lui, pas du joueur.
 *   · `empty`       — lu, et le joueur n'a RIEN. Seul cas où le vide est vrai.
 *   · `owned`       — lu, et il a quelque chose.
 */
export type HomeStatus =
  | 'unavailable'
  | 'signedOut'
  | 'loading'
  | 'failed'
  | 'pending'
  | 'empty'
  | 'owned';

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
  if (input.read.ownedCount > 0) return 'owned';
  // ⚠️ DERNIÈRE RAISON DE NE PAS SAVOIR, ET LA PLUS FACILE À OUBLIER : elle ne
  // vient pas du réseau, elle vient du DISQUE. La lecture a bel et bien abouti,
  // et elle est honnête — sur ce que le SERVEUR sait. Une course terminée hors
  // réseau n'y est pas encore arrivée : conclure `empty` ici, c'est dire « Ta
  // ville est vierge. Ferme ta première boucle. » à quelqu'un qui vient de la
  // fermer.
  //
  // Sa place dans l'ordre n'est pas négociable non plus : APRÈS `owned` — un
  // territoire tenu reste tenu, l'attente n'annule rien d'acquis, et c'est
  // `pendingNotice` qui la dit alors — et AVANT `empty`, seul énoncé qu'elle
  // rendrait faux.
  if (input.pending === true) return 'pending';
  return 'empty';
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
 *   · `signIn`       — pas de compte : c'est CE qui manque, et rien d'autre.
 *   · `go`           — partir courir. C'est l'action du jeu.
 *   · `askLocation`  — l'OS acceptera de redemander : un tap suffit.
 *   · `openSettings` — l'OS a fermé la porte ; les réglages sont la seule voie.
 *   · `retry`        — la lecture a échoué : réessayer est une vraie action.
 *   · `none`         — rien de ce que le joueur peut faire ne débloque l'état.
 */
export type HomeAction = 'resume' | 'signIn' | 'go' | 'askLocation' | 'openSettings' | 'retry' | 'none';

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
  // ⚠️ SANS COMPTE, GO EST UN BOUTON MORT — défaut trouvé par la relecture
  // indépendante du 03/08, sous un autre angle : après « Se déconnecter »,
  // AUCUN écran ne menait plus à la connexion, et on ne sortait de l'app qu'en
  // la tuant. En cherchant la sortie, le vrai défaut est apparu : une course
  // lancée sans compte s'enregistre bien (never-lose-a-run), mais ne pourra
  // JAMAIS devenir un territoire — personne à qui l'attribuer. C'est exactement
  // l'argument qui ferme GO quand le backend manque, et je ne l'avais pas
  // appliqué ici. L'état vide de la carte dit « sans compte » ; l'action qui le
  // remplit est donc de se connecter (L8), pas de courir.
  if (input.session === 'signedOut') return 'signIn';
  // RESTAURATION : on ne sait pas ENCORE s'il y a un compte, donc on ne peint
  // pas l'action qui dépend de la réponse. Peindre GO ferait partir quelqu'un
  // qui se révélera déconnecté ; peindre « Se connecter » le dirait à quelqu'un
  // qui est peut-être déjà connecté. Le bandeau dit déjà « Lecture en cours »,
  // et l'attente dure le temps de lire un jeton.
  //
  // ⚠️ Ce cas m'a été rendu par l'INVARIANT du fichier de test, pas par ma
  // relecture : en fermant GO pour les déconnectés, je l'avais laissé ouvert
  // pour les « pas encore connus ». Le balayage exhaustif l'a vu tout de suite.
  if (input.session === 'restoring') return 'none';
  if (input.location === 'blocked') return 'openSettings';
  if (input.location === 'unknown') return 'askLocation';
  return 'go';
}

/**
 * Le bandeau doit-il AJOUTER que des courses attendent d'être envoyées ?
 *
 * ⚠️ CE N'EST PAS UN DOUBLON DE `homeStatus`. Le statut répond à « qu'est-ce qui
 * est à moi ? » et ne peut porter qu'UNE réponse ; l'attente, elle, est une
 * RÉSERVE sur cette réponse, et elle reste vraie pendant que le chiffre héros
 * s'affiche. Sans cette seconde voix, il aurait fallu choisir entre effacer les
 * m² du joueur pour cause de réseau coupé, ou taire la course qui attend.
 *
 * Elle se tait dans trois cas, et chacun a sa raison :
 *   · `pending` — la phrase principale le dit DÉJÀ, la répéter serait un doublon ;
 *   · `unavailable` — ce build ne joint aucun serveur : « elle partira » y serait
 *     une promesse que rien ne peut tenir, et le bandeau dit déjà le vrai fait ;
 *   · `signedOut` — le drain s'arrête sur `no_session` (`pendingUpload.ts`).
 *     Le blocage n'est pas le réseau, c'est le compte — et le bandeau porte
 *     déjà l'action qui le lève.
 */
export function pendingNotice(input: HomeInput): boolean {
  if (input.pending !== true) return false;
  const statut = homeStatus(input);
  return statut === 'owned' || statut === 'loading' || statut === 'failed';
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

// ════════════════════════════════════════════════════════════════════════════
// OÙ LA CARTE REGARDE — LE CADRAGE D'OUVERTURE, ET LUI SEUL
// ════════════════════════════════════════════════════════════════════════════
//
// ─── LE DÉFAUT QUE CETTE SECTION CORRIGE ────────────────────────────────────
// `MapCanvas` posait sa caméra par `defaultSettings`, c'est-à-dire AU MONTAGE.
// Or `center` n'arrive JAMAIS au montage : l'écran le lit dans un effet
// (`getLastKnownPositionAsync`), donc après. Conséquence, pour tout le monde et
// à chaque ouverture : la carte s'ouvrait sur le repli de ville — Rouen, z12,5 —
// et `ZOOM_EGO` n'était jamais appliqué. À z12,5, une boucle de quelques
// centaines de m² tient dans un pixel. L'usage LE PLUS FRÉQUENT de l'app —
// ouvrir pour REGARDER son territoire — était sans objet.
//
// ─── ET LE PIÈGE QU'ELLE NE DOIT PAS ROUVRIR ────────────────────────────────
// `defaultSettings` n'était pas une erreur, c'était une PARADE. Une caméra
// CONTRÔLÉE (`centerCoordinate` en prop, recréée à chaque rendu) se bat contre
// les doigts : chaque re-rendu du parent ré-applique un `easeTo` en plein
// pincement, et « le zoom revient en arrière ». Ce module ne rend donc PAS une
// caméra : il rend UNE CIBLE, que les deux forks appliquent IMPÉRATIVEMENT et
// UNE SEULE FOIS. Après quoi la caméra appartient au joueur, et rien du code ne
// la touche plus — sauf s'il le demande (le contrôle de recentrage).

/** Un point, en degrés. Ordre de lecture humain ; GeoJSON reste `[lng, lat]`. */
export interface LngLat {
  readonly lng: number;
  readonly lat: number;
}

/** Deux coins opposés. `sw` = sud-ouest, `ne` = nord-est. */
export interface MapBounds {
  readonly sw: LngLat;
  readonly ne: LngLat;
}

/**
 * CE QUE LA CAMÉRA DOIT REGARDER, une fois.
 *
 * Deux formes, parce qu'il y a deux vérités différentes : « voici ta surface »
 * (des BORNES, dont l'échelle se déduit) et « voici où tu es » (un POINT, dont
 * l'échelle est un choix — le quartier).
 */
export type MapFraming =
  | ({ readonly kind: 'bounds' } & MapBounds)
  | { readonly kind: 'point'; readonly center: LngLat; readonly zoom: number };

export interface FramingInput {
  /** Ma surface possédée, telle que la carte la peint. `null` = rien à peindre. */
  readonly territories: TerritoryFeatureCollection | null;
  /** Ma position, si — et seulement si — elle est autorisée ET connue. */
  readonly center: LngLat | null;
  /** L'échelle d'un cadrage sur MOI : le quartier (`ZOOM_EGO`, côté écran). */
  readonly zoom: number;
}

/**
 * Mètres par degré de latitude. Valeur déjà retenue partout dans ce dépôt
 * (moteur, zones de confidentialité, ancres de carte) : on ne s'en invente pas
 * une seconde.
 */
const M_PAR_DEGRE_LAT = 111_320;

/**
 * L'EMPRISE LA PLUS SERRÉE QU'ON S'AUTORISE, en mètres.
 *
 * ⚠️ Ce n'est pas un goût, c'est une conséquence des règles du jeu. La plus
 * petite boucle que GRYD accepte mesure `RUN_MIN_DISTANCE_M` de périmètre ; le
 * cercle de ce périmètre a `RUN_MIN_DISTANCE_M / π` de diamètre (~255 m). Un
 * territoire peut être PLUS PETIT que ça — écrasé par sa forme, mordu par un
 * rival — et `fitBounds` le collerait alors au ras de l'écran : on verrait la
 * forme sans plus savoir OÙ elle est. Cadrer sur son territoire n'est pas y
 * coller le nez. En dessous de cette emprise, on élargit AUTOUR du centre :
 * la forme reste entière, le quartier revient avec elle.
 */
const CADRAGE_EMPRISE_MIN_M = RUN_MIN_DISTANCE_M / Math.PI;

/** Sous ce cosinus (≈ 89,4° de latitude) un degré de longitude ne veut plus rien dire. */
const COS_LAT_PLANCHER = 0.01;

/**
 * L'emprise de MA surface, ou `null` si elle n'en a pas d'exploitable.
 *
 * `null` couvre trois cas et n'en distingue aucun, parce que l'appelant en fait
 * la même chose : pas de collection (rien n'a été lu), collection vide (le
 * joueur ne tient rien), sommets inexploitables. Aucun d'eux n'autorise à
 * pointer une caméra quelque part.
 */
export function territoryBounds(collection: TerritoryFeatureCollection | null): MapBounds | null {
  if (collection === null) return null;
  let ouest = Number.POSITIVE_INFINITY;
  let sud = Number.POSITIVE_INFINITY;
  let est = Number.NEGATIVE_INFINITY;
  let nord = Number.NEGATIVE_INFINITY;
  let vus = 0;
  for (const feature of collection.features) {
    for (const anneau of feature.geometry.coordinates) {
      for (const [lng, lat] of anneau) {
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
        vus += 1;
        if (lng < ouest) ouest = lng;
        if (lng > est) est = lng;
        if (lat < sud) sud = lat;
        if (lat > nord) nord = lat;
      }
    }
  }
  if (vus === 0) return null;
  // ⚠️ LIMITE ÉCRITE PLUTÔT QUE MASQUÉE : une surface à cheval sur l'antiméridien
  // rendrait ici une emprise qui fait le tour de la Terre. On ne la « répare »
  // pas — la réparer demanderait de deviner de quel côté est le joueur — on
  // refuse de cadrer, et la carte garde son ouverture. Se taire est honnête ;
  // montrer la planète pour un pâté de maisons ne l'est pas.
  if (est - ouest > 180) return null;
  return { sw: { lng: ouest, lat: sud }, ne: { lng: est, lat: nord } };
}

/** Élargit une emprise jusqu'à `CADRAGE_EMPRISE_MIN_M`, autour de son centre. */
function auMoinsUnQuartier(b: MapBounds): MapBounds {
  const lat = (b.sw.lat + b.ne.lat) / 2;
  const lng = (b.sw.lng + b.ne.lng) / 2;
  const cos = Math.max(Math.cos((lat * Math.PI) / 180), COS_LAT_PLANCHER);
  const demiLat = Math.max((b.ne.lat - b.sw.lat) / 2, CADRAGE_EMPRISE_MIN_M / M_PAR_DEGRE_LAT / 2);
  const demiLng = Math.max(
    (b.ne.lng - b.sw.lng) / 2,
    CADRAGE_EMPRISE_MIN_M / (M_PAR_DEGRE_LAT * cos) / 2,
  );
  return {
    sw: { lng: lng - demiLng, lat: Math.max(lat - demiLat, -90) },
    ne: { lng: lng + demiLng, lat: Math.min(lat + demiLat, 90) },
  };
}

/**
 * LA CIBLE DU CADRAGE, ou `null` quand il n'y a rien d'honnête à regarder.
 *
 * L'ORDRE dit ce que l'app croit être la raison d'ouvrir : MON TERRITOIRE
 * d'abord, ma position ensuite. On n'ouvre pas GRYD pour se localiser — on
 * l'ouvre pour voir ce qu'on tient (L1, q.2). Quand la surface est connue, la
 * position n'ajoute rien au cadrage : le point « Toi » reste peint là où il est,
 * et le joueur voit d'un coup d'œil s'il en est loin.
 *
 * `null` = on ne sait NI ce qu'on tient NI où l'on est. La carte garde alors son
 * ouverture de ville, qui ne prétend rien (voir `HOME_FALLBACK` dans les forks).
 */
export function openingFraming(input: FramingInput): MapFraming | null {
  const bornes = territoryBounds(input.territories);
  if (bornes !== null) return { kind: 'bounds', ...auMoinsUnQuartier(bornes) };
  if (input.center !== null && Number.isFinite(input.zoom)) {
    return { kind: 'point', center: input.center, zoom: input.zoom };
  }
  return null;
}

/**
 * LA CLÉ DE VALEUR D'UN CADRAGE — la pièce qui empêche le combat caméra/doigts.
 *
 * ⚠️ C'est le cœur du « une seule fois ». `territories` est un OBJET recréé à
 * chaque lecture ; comparer son IDENTITÉ ferait repartir l'effet à chaque
 * re-rendu du parent, et la caméra ré-appliquerait un `easeTo` en plein
 * pincement — précisément le bug que `defaultSettings` évitait. Une chaîne de
 * NOMBRES, elle, ne change que si la cible change réellement.
 *
 * `null` = aucune cible : rien à déclencher.
 */
export function framingKey(cadre: MapFraming | null): string | null {
  if (cadre === null) return null;
  // 6 décimales ≈ 11 cm : bien en deçà de toute dérive GPS, et assez pour que
  // deux lectures de la même géométrie rendent la MÊME clé.
  const n = (v: number): string => v.toFixed(6);
  return cadre.kind === 'bounds'
    ? `b:${n(cadre.sw.lng)},${n(cadre.sw.lat)},${n(cadre.ne.lng)},${n(cadre.ne.lat)}`
    : `p:${n(cadre.center.lng)},${n(cadre.center.lat)},${n(cadre.zoom)}`;
}
