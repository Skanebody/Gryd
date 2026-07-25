/**
 * GRYD — ingest_run : LA MÊME TRACE EST LE MÊME EFFORT, quelle que soit
 * l'étiquette qu'on lui colle (AMENDEMENT-06 §4 « Activity Hub », E14 vélo).
 *
 * ═══ CE QUE CE MODULE FERME ═════════════════════════════════════════════════
 * La déduplication cherchait les candidats dans une fenêtre de ±2 jours autour
 * du `started_at` DÉCLARÉ PAR LE CLIENT. La branche « empreinte identique » de
 * `dedupeActivity` ne pouvait donc jamais s'exprimer au-delà de cette fenêtre :
 * il suffisait de redater le même fichier pour qu'il redevienne une course
 * neuve. Tant qu'il n'existait qu'un monde, le gain d'un rejeu se limitait à
 * quelques points sur un territoire DÉJÀ tenu (`defend`).
 *
 * L'arrivée de la discipline (migration 0070) a changé l'ordre de grandeur, pas
 * la nature du trou : le monde vélo est VIERGE. Rejouer un GPX déjà ingéré en
 * `run`, redaté et réétiqueté `bike`, reprenait chaque hexagone en `pioneer`
 * (bonus PIONNIER PLEIN), ouvrait un SECOND classement de saison, et recréditait
 * XP et Foulées (mono-pot). La migration écrit pourtant que « chaque bonus
 * demande une sortie RÉELLE et valide dans sa discipline » : c'est ici, et
 * nulle part ailleurs, que cette phrase devient vraie.
 *
 * ═══ LE MÉCANISME CHOISI, ET POURQUOI CELUI-LÀ ══════════════════════════════
 * DEUX lectures, dans cet ordre :
 *
 *  1. L'EMPREINTE DE TRACE — `polyline_hash`, sur TOUT l'historique du joueur,
 *     SANS borne de temps et SANS filtre de discipline. C'est la seule des deux
 *     qui soit un FAIT et non une ressemblance : le hash est calculé SERVEUR sur
 *     la géométrie (lat/lng à 6 décimales, triés par horodatage), jamais lu du
 *     client. Deux traces identiques au dix-millionième de degré près sur des
 *     centaines de points ne sont pas deux sorties, c'est un fichier rejoué.
 *     · POURQUOI SANS DISCIPLINE : c'est tout l'objet du correctif. Une même
 *       trace ne peut pas être à la fois une course et une sortie vélo — un
 *       corps ne fait qu'un effort à la fois. L'étiquette est déclarative, la
 *       géométrie ne l'est pas ; on dédoublonne donc sur la géométrie.
 *     · POURQUOI SANS BORNE DE TEMPS : la date de départ est elle aussi
 *       DÉCLARÉE. Borner la recherche par une valeur que l'attaquant choisit,
 *       c'est lui donner la clé. Coût nul : `runs_user_hash_idx (user_id,
 *       polyline_hash) where polyline_hash is not null` (0009) sert cette
 *       égalité exacte directement.
 *     · CE QUE ÇA NE BLOQUE PAS, et c'est voulu : refaire RÉELLEMENT la même
 *       boucle demain, à pied ou à vélo, produit une trace différente (bruit
 *       GPS, points distincts) donc une empreinte différente. On ne punit pas
 *       l'habitude, on refuse le fichier rejoué.
 *
 *  2. L'APPARIEMENT APPROCHÉ — départ ±3 min ET durée ±10 % ET distance ±10 %,
 *     sur une fenêtre large autour du départ déclaré. Inchangé : il rattrape
 *     le même effort importé par DEUX sources (GRYD Live + HealthKit) dont les
 *     traces diffèrent, et il n'a de sens qu'autour d'un même instant.
 *
 * ═══ CE QUE « SANS BORNE DE TEMPS » A OUVERT, ET QU'ON REFERME ICI ══════════
 * Retirer la borne de temps était juste, mais elle masquait une hypothèse qui,
 * elle, était fausse : « une empreinte identifie une trace ». Elle n'identifie
 * une trace que si la trace A UNE FORME.
 *
 *   · `polylineHash([])` est une CONSTANTE (le sha-256 de la chaîne vide) ;
 *   · `polylineHash([un seul point])` ne dépend QUE des coordonnées arrondies —
 *     pas des horodatages. Deux arrêts au même endroit, à six mois d'écart,
 *     produisent la MÊME empreinte.
 *
 * Or `runs` porte `polyline_hash` même sur les courses `rejected`/`flagged`, et
 * le payload accepte `points: []`. Le scénario, exécuté : une course rejetée en
 * janvier avec un seul point ; en juillet le joueur appuie sur GO et s'arrête
 * aussitôt au même endroit. L'empreinte rendait la course de JANVIER, l'app
 * disait « doublon » au lieu de « trace insuffisante », aucune ligne `runs`
 * n'était créée — et `awardRejectedRun` n'était donc jamais appelé (Clean
 * Runner faussé). L'app affirmait un fait qui n'existait pas.
 *
 * D'où le SEUIL DE FORME ci-dessous : on n'interroge l'empreinte que si la
 * trace porte au moins deux positions DISTINCTES. Et quand elle n'en porte pas,
 * on ne se contente pas de sauter la lecture — on retire l'empreinte du verdict
 * (`dedupeActivity` court-circuite sur l'égalité de hash, la fenêtre approchée
 * la ferait rentrer par la fenêtre). Une trace sans forme retombe donc sur le
 * SEUL appariement approché, qui exige un même instant : deux arrêts au même
 * endroit à six mois d'écart n'y sont plus jamais le même effort.
 *
 * Le VERDICT reste `dedupeActivity` (moteur pur, `_shared/engine/badges.ts`) :
 * le SQL ne fait que restreindre les candidats, il ne décide rien. Une seule
 * définition de « doublon » dans tout le projet.
 *
 * ═══ POURQUOI UN LECTEUR INJECTÉ ════════════════════════════════════════════
 * `index.ts` est un `Deno.serve` : rien de ce qu'il contient n'est importable
 * dans un test sans démarrer un serveur. La décision vit donc ici, avec ses
 * deux lectures derrière une interface — exactement le patron déjà employé pour
 * `validate.ts` et pour `resolveOwnership` dans la fermeture de boucle crew.
 */
import { dedupeActivity, type DedupActivity } from '../_shared/engine/badges.ts';

/** Une course DÉJÀ en base, réduite aux seuls faits qui servent la dédup. */
export interface DedupCandidate extends DedupActivity {
  /** `runs.id` de la course déjà ingérée — c'est elle que le doublon rejoue. */
  runId: string;
}

/**
 * Positions DISTINCTES qu'une trace doit porter pour que son empreinte
 * IDENTIFIE quelque chose.
 *
 * POURQUOI 2, et pas 1 ni 10. En dessous de deux positions distinctes il n'y a
 * pas de CHEMIN, seulement un LIEU — et un lieu se reproduit à l'identique
 * simplement en y retournant : « je me suis arrêté ici » n'a rien d'unique.
 * À partir de deux positions distinctes il y a un segment orienté, arrondi au
 * dix-millionième de degré (~11 cm) : deux sorties réelles ne le reproduisent
 * pas par hasard, un fichier rejoué si.
 *
 * Ce n'est PAS une constante de jeu (elle ne règle aucun équilibrage, aucun
 * joueur ne la ressent) : c'est une propriété du POUVOIR DISCRIMINANT de
 * `polylineHash`, donc elle vit avec lui, exportée et testée pour ne pas
 * dériver. Le plancher de points d'une course VALIDE, lui, est une règle de
 * jeu et vit ailleurs (§3.2, `validate.ts`) — les deux ne se confondent pas :
 * une trace peut être trop pauvre pour être une preuve d'effort tout en étant
 * assez riche pour être une empreinte.
 */
export const FINGERPRINT_MIN_DISTINCT_POINTS = 2;

/** Un point de trace, réduit à ce dont l'empreinte dépend. */
export interface TracePoint {
  lat: number;
  lng: number;
  /** Horodatage (ms) — sert à ORDONNER, jamais à distinguer deux positions. */
  t: number;
}

/**
 * La FORME CANONIQUE d'une trace, et ce qu'elle vaut comme empreinte. PURE.
 *
 * `canonical` est l'entrée EXACTE du sha-256 calculé par `index.ts` : positions
 * arrondies à 6 décimales, triées par horodatage, jointes par `;`. Elle est
 * produite ICI — et pas dans `index.ts` — pour que le COMPTE de positions
 * distinctes soit dérivé de la MÊME chaîne que le hash. Deux calculs séparés
 * auraient pu diverger d'un arrondi, et c'est exactement l'écart qui rouvrirait
 * le trou (une trace jugée « avec forme » dont le hash, lui, n'en aurait pas).
 */
export interface TraceShape {
  /** Entrée du sha-256 — jamais recalculée ailleurs. */
  canonical: string;
  /** Positions distinctes APRÈS arrondi (c'est le hash qui compte, pas le GPS). */
  distinctPoints: number;
}

export function traceShape(points: readonly TracePoint[]): TraceShape {
  const rounded = [...points]
    .sort((a, b) => a.t - b.t)
    .map((p) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`);
  return { canonical: rounded.join(';'), distinctPoints: new Set(rounded).size };
}

/**
 * Les DEUX lectures dont la dédup a besoin. Le `user_id` est capturé à la
 * construction : aucune des deux méthodes ne prend de discipline ni de fenêtre
 * de temps EN PARAMÈTRE, et ce n'est pas un oubli — c'est le contrat. On ne
 * peut pas restreindre par accident ce qu'on ne peut pas exprimer.
 */
export interface DedupReader {
  /**
   * Courses du joueur portant EXACTEMENT cette empreinte. Tout l'historique,
   * les deux disciplines. Triées de la PLUS ANCIENNE à la plus récente :
   * l'originale est celle qu'on renvoie, pas le dernier rejeu en date.
   */
  byFingerprint(polylineHash: string): Promise<DedupCandidate[]>;
  /** Courses du joueur AUTOUR de `startedAt` (fenêtre large, toutes disciplines). */
  aroundStart(startedAt: string): Promise<DedupCandidate[]>;
}

/**
 * La course entrante, telle que la dédup la voit. `distinctPoints` n'est pas
 * une commodité : c'est ce qui dit si `polylineHash` IDENTIFIE une trace ou
 * décrit seulement un endroit. Il est dans l'objet — et non en paramètre
 * optionnel — pour qu'aucun appelant ne puisse l'oublier sans casser le
 * typecheck.
 */
export interface DedupSubject extends DedupActivity {
  /** `traceShape(points).distinctPoints` de la course entrante. */
  distinctPoints: number;
}

/**
 * L'empreinte de cette course a-t-elle un pouvoir DISCRIMINANT ? PURE.
 * Rend le hash quand la trace porte une forme, `null` sinon — et ce `null` est
 * ensuite substitué dans le verdict, pas seulement dans la lecture.
 */
export function discriminatingFingerprint(candidate: DedupSubject): string | null {
  if (!candidate.polylineHash) return null;
  return candidate.distinctPoints >= FINGERPRINT_MIN_DISTINCT_POINTS
    ? candidate.polylineHash
    : null;
}

/**
 * Cette activité rejoue-t-elle une course déjà ingérée par ce joueur ?
 * Retourne l'id de la course d'ORIGINE, ou null.
 *
 * L'empreinte d'abord : c'est la lecture la plus sélective (une égalité sur un
 * index) et la seule qui tienne hors de la fenêtre de temps. Si elle tranche, on
 * ne paie pas la seconde.
 *
 * Une trace SANS FORME (< FINGERPRINT_MIN_DISTINCT_POINTS positions distinctes)
 * n'interroge pas l'empreinte ET ne l'emporte pas dans le verdict : elle
 * retombe sur le seul appariement approché, qui exige un même instant. Sans
 * cette seconde moitié, `dedupeActivity` — qui court-circuite sur l'égalité de
 * hash — la ferait rentrer par la fenêtre de ±2 jours.
 */
export async function findDuplicateRun(
  reader: DedupReader,
  candidate: DedupSubject,
): Promise<string | null> {
  const fingerprint = discriminatingFingerprint(candidate);
  // Le sujet SOUMIS AU VERDICT porte l'empreinte retenue, pas celle calculée.
  const subject: DedupActivity = { ...candidate, polylineHash: fingerprint };

  if (fingerprint) {
    const sameTrace = await reader.byFingerprint(fingerprint);
    for (const existing of sameTrace) {
      if (dedupeActivity(subject, existing)) return existing.runId;
    }
  }

  const nearby = await reader.aroundStart(candidate.startedAt);
  for (const existing of nearby) {
    if (dedupeActivity(subject, existing)) return existing.runId;
  }
  return null;
}
