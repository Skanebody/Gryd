/**
 * GRYD — CE QU'UNE SORTIE A APPORTÉ AU CREW. Module PUR (zéro React, zéro
 * réseau) : testable sous Deno. Le câblage vit dans `crewRunImpactData2026.ts`.
 *
 * ─── LA DEMANDE, ET LE DÉFAUT QU'ELLE A RÉVÉLÉ (LOT K, 11/09/2026) ──────────
 * Cahier §13.4 : « Après une première contribution : "Ta sortie compte dans
 * celle du crew." » L'écran de résultat ne pouvait pas le dire — AUCUNE lecture
 * ne reliait une sortie à un crew. Il proposait « Partager avec mon crew » (un
 * geste) et se taisait sur le reste. La migration 0182 ajoute
 * `crew_run_impact_2026`, qui réunit trois faits DÉJÀ écrits en base.
 *
 * ─── LA RÈGLE QUI GOUVERNE TOUT CE FICHIER ─────────────────────────────────
 * UN CREW NE POSSÈDE PAS DE TERRAIN. 0118 a gelé les tables héritées, 0126 a
 * posé que le titre territorial est INDIVIDUEL, 0152 a retiré `hexesHeld`,
 * `cityRank` et `contributionPct` du QG pour cette raison. La phrase juste est
 * donc « ta capture compte parmi les membres de ton crew qui tiennent du
 * terrain », JAMAIS « +0,18 km² pour ton crew ».
 *
 * La SURFACE de la sortie reste servie par `capture_result_2026` (0158), que le
 * même écran lit déjà. La redire ici produirait deux chiffres pour la même
 * chose, qui divergeraient au premier correctif appliqué d'un seul côté — la
 * faute que 0086 §5 documente pour `crew_stats`.
 *
 * ─── QUATRE ÉTATS, ET ILS NE SE CONFONDENT PAS ─────────────────────────────
 *   · 'loading'   la lecture est en cours — n'affirme rien ;
 *   · 'none'      lu, et cette personne n'a pas de crew. Un FAIT : l'écran
 *                 n'affiche alors aucun bloc, et surtout pas une invitation à
 *                 fonder un crew au milieu d'un résultat de course ;
 *   · 'failed'    la lecture a échoué. « Je n'ai pas pu lire » n'est pas
 *                 « tu n'as pas de crew » : les fondre ferait disparaître le
 *                 crew de quelqu'un à cause d'un réseau lent ;
 *   · 'ready'     des faits réels.
 */

/** La contribution de CETTE sortie à un défi de crew, si elle a compté. */
export interface CrewRunChallenge2026 {
  challengeId: string;
  title: string;
  /** Titre du secteur PUBLIÉ du défi. `null` si le serveur ne le retrouve pas. */
  sectorTitle: string | null;
}

export interface CrewRunImpactFacts2026 {
  crewId: string;
  crewName: string;
  /** Emblème (`crews.color`) — même graine que la page du crew, ou `null`. */
  crewEmblem: number | null;
  /**
   * La capture de cette sortie est-elle PUBLIÉE ? Un fait de STATUT, jamais une
   * surface : le combien vient de `capture_result_2026`, sur le même écran.
   */
  capturePublished: boolean;
  /** La sortie a-t-elle été partagée AVEC CE CREW ? Un geste, pas un effet. */
  sharedWithCrew: boolean;
  challenge: CrewRunChallenge2026 | null;
}

export type CrewRunImpact2026 =
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'none' }
  | { kind: 'ready'; facts: CrewRunImpactFacts2026 };

const obj = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0;

/**
 * jsonb `crew_run_impact_2026` → état, ou `null` quand la forme n'est PAS celle
 * attendue. `null` remonte en `'failed'` chez l'appelant, jamais en `'none'` :
 * un contrat inconnu n'apprend rien sur l'appartenance de quelqu'un.
 *
 * ⚠️ `{ok:false}` NE DEVIENT PAS `'none'` NON PLUS. `signed_out`,
 * `not_authorized` et `not_found` sont des refus — ils ne disent pas que cette
 * personne est sans crew.
 */
export function parseCrewRunImpact2026(raw: unknown): CrewRunImpact2026 | null {
  const root = obj(raw);
  if (!root || root.ok !== true) return null;
  // `crew: null` est une RÉPONSE explicite du serveur : lu, pas de crew.
  if (root.crew === null) return { kind: 'none' };
  const crew = obj(root.crew);
  if (!crew || !text(crew.id) || !text(crew.name)) return null;
  // Deux booléens EXIGÉS : un `undefined` replié sur `false` ferait dire
  // « rien n'a été publié » à un serveur qui n'a pas répondu à la question.
  if (typeof root.capturePublished !== 'boolean' || typeof root.sharedWithCrew !== 'boolean') return null;

  let challenge: CrewRunChallenge2026 | null = null;
  if (root.challenge !== null && root.challenge !== undefined) {
    const row = obj(root.challenge);
    if (!row || !text(row.challengeId) || !text(row.title)) return null;
    challenge = {
      challengeId: row.challengeId,
      title: row.title,
      // Secteur introuvable : on nomme le défi sans nommer un secteur inventé.
      sectorTitle: text(row.sectorTitle) ? row.sectorTitle : null,
    };
  }

  return {
    kind: 'ready',
    facts: {
      crewId: crew.id,
      crewName: crew.name,
      crewEmblem: Number.isInteger(crew.color) ? (crew.color as number) : null,
      capturePublished: root.capturePublished,
      sharedWithCrew: root.sharedWithCrew,
      challenge,
    },
  };
}

/**
 * LA PHRASE que l'écran affiche, dérivée des seuls faits lus.
 *
 * Elle ne devient JAMAIS une injonction (§14.2 : « ne jamais transformer la
 * notification en ordre de courir ») et ne promet jamais une surface de crew.
 * Ordre de priorité : le défi d'abord (c'est le fait le plus rare et le plus
 * daté), puis la capture, puis le simple fait d'appartenir.
 */
export function crewRunImpactLine2026(facts: CrewRunImpactFacts2026, fr: boolean): string {
  if (facts.challenge) {
    const where = facts.challenge.sectorTitle;
    if (where) {
      return fr
        ? `Cette journée compte pour ${facts.crewName} dans « ${facts.challenge.title} », secteur ${where}.`
        : `This day counts for ${facts.crewName} in “${facts.challenge.title}”, sector ${where}.`;
    }
    return fr
      ? `Cette journée compte pour ${facts.crewName} dans « ${facts.challenge.title} ».`
      : `This day counts for ${facts.crewName} in “${facts.challenge.title}”.`;
  }
  if (facts.capturePublished) {
    return fr
      ? `Ton terrain est publié. Tu comptes parmi les membres de ${facts.crewName} qui en tiennent.`
      : `Your terrain is published. You are one of the members of ${facts.crewName} who hold some.`;
  }
  return fr
    ? `Cette sortie est la tienne. ${facts.crewName} n’en sait rien tant que tu ne la partages pas.`
    : `This activity is yours. ${facts.crewName} knows nothing about it until you share it.`;
}
