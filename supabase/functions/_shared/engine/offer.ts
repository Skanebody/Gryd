// GÉNÉRÉ par scripts/sync-game-rules.mjs — ne pas éditer.
// Source : packages/engine/src/offer.ts

/**
 * GRYD — engine/offer.ts : les TROIS OFFRES, décidées ici et nulle part ailleurs.
 *
 * « Les faits sont gratuits. L'interprétation est payante. »
 *
 * Fonctions PURES : aucune I/O, aucune horloge, aucun prix. Les montants sont de
 * la CONFIGURATION (le Store fait foi, spec E74) — les mettre ici obligerait à
 * un rebuild pour corriger un prix, et le montant affiché finirait par diverger
 * du montant réellement débité.
 *
 * ─── CE QUE CE MODULE DÉCIDE, ET CE QU'IL NE DÉCIDERA JAMAIS ────────────────
 * Il décide quelles CAPACITÉS D'ANALYSE un palier ouvre, et lesquelles peuvent
 * être présentées à la vente. Rien d'autre. Aucune de ses sorties n'est lue —
 * et ne doit jamais l'être — par la capture, la défense, le decay, le scoring ou
 * le classement. `offer.test.ts` monte la garde sur les onze modules de règle.
 *
 * ─── LA RÈGLE QUI REND L'ÉCRAN DE VENTE HONNÊTE PAR CONSTRUCTION ────────────
 * `offerBoard()` ne rend QUE des capacités `built`. Une capacité décidée mais
 * non construite est donc INVISIBLE : elle ne peut ni être promise, ni être
 * vendue, ni faire nombre dans une colonne. Et un palier dont rien n'est
 * construit n'est pas « offrable » du tout — c'est le cas de GRYD Pro au
 * 01/08/2026, et l'écran ne le peindra pas tant que ça dure.
 *
 * C'est la version « offre » de la règle du dépôt : ne jamais peindre une action
 * qui échoue toujours.
 */
import {
  GRYD_CAPABILITIES,
  GRYD_TIERS,
  type GrydCapability,
  type GrydTier,
} from '../game-rules.ts';

/** Rang du palier (0 = gratuit). `-1` pour une valeur inconnue. */
export function tierRank(tier: GrydTier | string): number {
  return (GRYD_TIERS as readonly string[]).indexOf(tier);
}

/**
 * Un palier DONNE-T-IL accès à cette capacité ? Un palier supérieur contient
 * toujours les précédents — c'est ce qui rend l'offre lisible en trois lignes.
 * Un palier inconnu ne donne rien (position par défaut : dans le doute, on
 * n'ouvre pas).
 */
export function tierGrants(tier: GrydTier | string, capability: GrydCapability): boolean {
  const have = tierRank(tier);
  const need = tierRank(capability.tier);
  return have >= 0 && need >= 0 && have >= need;
}

/**
 * VENDABLE = construite ET pas gratuite pour toujours.
 *
 * Les deux conditions comptent, et pour des raisons différentes :
 *  · `built` — on ne vend pas ce qui n'existe pas ;
 *  · `freeForever` — on ne reprend jamais ce qui est déjà donné. C'est la
 *    garantie anti-reprise, celle dont l'absence a coûté sa réputation à un
 *    concurrent qui a fait payer pour récupérer des fonctions gratuites.
 */
export function isSellable(capability: GrydCapability): boolean {
  return capability.built === true && capability.freeForever !== true;
}

/** Capacités qu'un palier AJOUTE (les siennes), construites uniquement. */
export function builtCapabilitiesAddedBy(tier: GrydTier): readonly GrydCapability[] {
  return GRYD_CAPABILITIES.filter((c) => c.tier === tier && c.built);
}

/**
 * Un palier est-il OFFRABLE aujourd'hui ?
 *
 * Le gratuit l'est toujours : il n'a rien à vendre, il est le produit. Un palier
 * payant ne l'est que s'il ajoute au moins une capacité RÉELLEMENT construite —
 * sinon la colonne serait vide, ou pire, remplie de promesses.
 */
export function tierIsOfferable(tier: GrydTier): boolean {
  if (tier === 'free') return true;
  return builtCapabilitiesAddedBy(tier).some(isSellable);
}

export interface OfferColumn {
  readonly tier: GrydTier;
  /** Capacités que CE palier ajoute, construites uniquement. */
  readonly adds: readonly string[];
  /** Tout ce dont on dispose à ce palier (cumulé), construites uniquement. */
  readonly includes: readonly string[];
  /**
   * `false` ⇒ l'écran de vente ne peint PAS cette colonne. Elle reste dans le
   * modèle (le contrat existe, il dit ce qu'il faudra tenir) mais elle n'est
   * jamais montrée : une colonne vide ne se vend pas, elle inquiète.
   */
  readonly offerable: boolean;
}

/**
 * LE MODÈLE DE L'ÉCRAN DE VENTE. Ne rend que du construit — c'est ce qui rend
 * la page honnête sans que personne n'ait à y penser au moment de la dessiner.
 */
export function offerBoard(): readonly OfferColumn[] {
  return GRYD_TIERS.map((tier) => ({
    tier,
    adds: builtCapabilitiesAddedBy(tier).map((c) => c.key),
    includes: GRYD_CAPABILITIES.filter((c) => c.built && tierGrants(tier, c)).map((c) => c.key),
    offerable: tierIsOfferable(tier),
  }));
}

/**
 * Le joueur a-t-il accès à `key` avec son palier courant ?
 *
 * Une clé inconnue rend `false` : dans le doute sur ce qu'on ouvre, on n'ouvre
 * pas. Une capacité NON CONSTRUITE rend `false` pour tout le monde, y compris au
 * palier le plus élevé — payer n'a jamais fait exister une fonctionnalité.
 */
export function hasCapability(tier: GrydTier | string, key: string): boolean {
  const capability = GRYD_CAPABILITIES.find((c) => c.key === key);
  if (!capability || !capability.built) return false;
  return tierGrants(tier, capability);
}
