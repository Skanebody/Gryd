/**
 * GRYD — E19 « BADGE RARE DÉBLOQUÉ » : la LOGIQUE du moment dédié.
 *
 * La planche décrit un arrêt : badge en grand, lumière contrôlée, kicker, nom,
 * condition réalisée datée, ligne de rareté, « AJOUTER AU PROFIL ». Tout ce qui
 * DÉCIDE — qui y a droit, ce qu'on a le droit d'écrire, ce qui a déjà été
 * célébré — vit ici, en fonctions pures testées. Le composant ne fait que peindre.
 *
 * ─── (a) LA LIGNE « POSSÉDÉ PAR 2 % DES JOUEURS DE DIEPPE » N'EXISTE PAS ─────
 * La planche la promet. L'app ne peut pas la tenir, et ce fichier refuse de la
 * fabriquer. L'audit, fait avant d'écrire une ligne d'UI :
 *   · aucune vue, aucune matview, aucun compteur de porteurs par badge n'existe
 *     dans `supabase/migrations/**` (grep rarity/owners/holders : rien) ;
 *   · `user_badges` est lisible (policy `user_badges_select_all`) et
 *     `public_profiles` expose `(id, pseudo, city_id)` — on POURRAIT donc compter
 *     des porteurs, mais pas les CROISER avec une ville sans une vue serveur :
 *     le client devrait rapatrier tous les joueurs d'une ville puis filtrer, ce
 *     qui n'est ni scalable ni honnête (le chiffre dépendrait de ce qu'on a
 *     réussi à télécharger) ;
 *   · `users.city_id` n'est renseigné que par `ingest_run/ensureHomeCity`, donc
 *     une part des comptes n'a AUCUNE ville — un dénominateur troué.
 * Conclusion : la ligne DISPARAÎT. Elle n'est pas remplacée par un « rare »
 * vague qui ferait le même effet sans le dire : ce qu'on affiche à sa place est
 * une propriété VÉRIFIABLE du catalogue — le MATÉRIAU du badge et sa position
 * dans l'échelle des 6 matériaux (`materialLine`). C'est un fait sur l'objet,
 * pas une statistique sur la population.
 * Ce qu'il faudrait pour tenir la promesse : une vue serveur
 * `badge_rarity (badge_key, city_id, holders, players)` rafraîchie par job, plus
 * un plancher de population sous lequel on n'affiche RIEN (à 12 joueurs dans une
 * ville, « 8 % » ne veut rien dire). Hors périmètre — noté en openItems.
 *
 * ─── (b) LA CONDITION ET LA DATE VIENNENT DU BADGE RÉELLEMENT DÉCERNÉ ────────
 * `unlockMomentContent` part d'une CLÉ lue dans `user_badges` (décernée par
 * ingest_run, service_role) : la condition affichée est `requirement` de CE
 * badge dans le catalogue de jeu, jamais une phrase générique. La date vient de
 * `user_badges.earned_at`, formatée par `myBadges.ts`. Quand elle manque, le
 * contenu porte `dateLabel: null` et l'écran le DIT — on ne date jamais au
 * hasard, et surtout pas avec « aujourd'hui ».
 *
 * ─── (c) « AJOUTER AU PROFIL » AGIT VRAIMENT ────────────────────────────────
 * `addToFeatured` décide, en pur, les trois issues possibles du mécanisme qui
 * existe déjà (`profileStore.featuredBadgeIds`, cap `FEATURED_BADGE_COUNT`) :
 * ajouté · déjà là · plein. Le cas « plein » n'est pas un échec silencieux : il
 * remonte le cap pour que l'écran propose la seule action qui débloque
 * réellement la situation (choisir lequel remplacer).
 *
 * PUR : n'importe que le catalogue de badges (lui-même sans React/RN) — testable
 * en Deno, comme `revealSequence.ts` dont ce fichier reprend la grammaire.
 */
import {
  BADGE_TIERS,
  BADGE_TIER_LABEL,
  BADGE_TIER_RANK,
  badgeById,
  isRareBadge,
  type BadgeDef,
} from './catalog';

// ─── Les temps de la séquence (planche : ≤ 1,4 s, skippable) ─────────────────

/** Les six temps de la planche, dans l'ordre exact où elle les énumère. */
export const UNLOCK_STEPS = [
  'badge', // le badge en grand, lumière contrôlée
  'kicker', // « BADGE RARE DÉBLOQUÉ »
  'name', // le nom en display
  'condition', // la condition réalisée, datée
  'material', // la ligne de rareté (matériau + position)
  'actions', // AJOUTER AU PROFIL · Partager · Continuer
] as const;
export type UnlockStep = (typeof UNLOCK_STEPS)[number];

/** Index du dernier temps = état FINAL (skip / reduce motion y vont directement). */
export const UNLOCK_LAST_STEP = UNLOCK_STEPS.length - 1;

/** Plafond IMPOSÉ par la planche : la séquence entière dure moins que ça. */
export const UNLOCK_BUDGET_MS = 1_400;

/**
 * Base de temps MAXIMALE tolérée. Le budget doit couvrir les 6 temps (5 écarts
 * depuis le badge) PLUS le fondu du dernier, et on garde une base de marge pour
 * rester STRICTEMENT sous le plafond — d'où la division par (6 + 1). Avec la base
 * réelle du projet (`motion.transitionMs` = 225) le plafond n'est jamais atteint :
 * il n'existe que pour qu'un futur token exotique ne puisse pas faire déborder la
 * séquence sans que ce fichier le sache.
 */
export const UNLOCK_MAX_BASE_MS = Math.floor(UNLOCK_BUDGET_MS / (UNLOCK_STEPS.length + 1));

/** Délai d'apparition de chaque temps, en ms depuis l'ouverture du moment. */
export function unlockDelaysMs(stepMs: number): readonly number[] {
  const safe = Number.isFinite(stepMs) && stepMs > 0 ? stepMs : 1;
  const base = Math.min(safe, UNLOCK_MAX_BASE_MS);
  return UNLOCK_STEPS.map((_, i) => Math.round(i * base));
}

/** Durée totale (dernier temps + son fondu) — toujours < UNLOCK_BUDGET_MS. */
export function unlockTotalMs(stepMs: number): number {
  const delays = unlockDelaysMs(stepMs);
  const last = delays[delays.length - 1] ?? 0;
  const base = delays[1] ?? 0;
  return last + base;
}

/** Index du temps atteint à `elapsedMs` (le même calcul décide le rendu et les tests). */
export function unlockStepAt(elapsedMs: number, stepMs: number): number {
  const t = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const delays = unlockDelaysMs(stepMs);
  let step = 0;
  for (let i = 0; i < delays.length; i += 1) {
    if (t >= (delays[i] ?? 0)) step = i;
  }
  return step;
}

/** Le temps `step` est-il atteint ? (garde de rendu, lisible côté composant). */
export function unlockReached(currentStep: number, step: UnlockStep): boolean {
  return currentStep >= UNLOCK_STEPS.indexOf(step);
}

// ─── Ce que le moment a le droit d'écrire ────────────────────────────────────

/** Ligne de rareté : le MATÉRIAU du badge et sa place dans l'échelle. */
export interface MaterialLine {
  /** Libellé du tier tel que le catalogue le nomme (Road…Legend). */
  tierLabel: string;
  /** Position dans l'échelle, 1-indexée (Road = 1 … Legend = 6). */
  position: number;
  /** Nombre de matériaux de l'échelle (6) — lu, jamais écrit en dur. */
  total: number;
}

/** Position d'un badge dans l'échelle des matériaux (fait de catalogue). */
export function materialLine(def: BadgeDef): MaterialLine {
  return {
    tierLabel: BADGE_TIER_LABEL[def.tier],
    position: BADGE_TIER_RANK[def.tier] + 1,
    total: BADGE_TIERS.length,
  };
}

/** Tout ce que le moment dédié affiche — et rien d'autre. */
export interface UnlockMomentContent {
  key: string;
  def: BadgeDef;
  /** Condition RÉELLE du badge décerné (catalogue de jeu), jamais générique. */
  requirement: string;
  /** Date d'obtention lisible (`user_badges.earned_at`), ou null si illisible. */
  dateLabel: string | null;
  material: MaterialLine;
}

/**
 * Contenu du moment pour une clé RÉELLEMENT décernée. Renvoie `null` — donc
 * aucun écran — dans les deux cas où il n'y a rien d'honnête à montrer :
 *   · la clé n'est pas au catalogue (badge retiré, client en retard sur le
 *     serveur) : on n'invente pas un nom ni une condition ;
 *   · le badge n'est PAS rare : la planche est formelle, « les badges COURANTS
 *     n'ont pas droit à cet écran » — ils vivent en carte dans le résultat de
 *     course, jamais en écran bloquant.
 */
export function unlockMomentContent(
  key: string,
  dateLabel: string | null,
): UnlockMomentContent | null {
  const def = badgeById(key);
  if (!def || !isRareBadge(def)) return null;
  return {
    key,
    def,
    requirement: def.requirement,
    dateLabel: dateLabel && dateLabel.trim().length > 0 ? dateLabel : null,
    material: materialLine(def),
  };
}

// ─── Qui déclenche un moment, et une seule fois ──────────────────────────────

/** Ce que la lecture des badges décide : à célébrer maintenant / à mémoriser. */
export interface UnlockSelection {
  /** Les moments dédiés à jouer, dans l'ordre (matériau décroissant, puis clé). */
  celebrate: string[];
  /**
   * Clés à inscrire TOUT DE SUITE dans la mémoire : elles ne déclencheront
   * jamais de moment (courantes, inconnues, ou niveaux inférieurs absorbés).
   * Les clés de `celebrate` n'y sont PAS : elles ne sont mémorisées qu'une fois
   * réellement montrées — une app tuée pendant la séquence ne perd pas le moment.
   */
  remember: string[];
}

export interface UnlockSelectionInput {
  /** Clés débloquées, telles que `user_badges` les donne. */
  unlocked: readonly string[];
  /** Clés déjà connues du client (mémoire locale). */
  known: readonly string[];
  /**
   * Une base a-t-elle déjà été posée pour CE compte ? À la toute première
   * lecture, non : on inscrit la collection existante SANS rien célébrer.
   * Sinon un joueur décoré qui installe l'app sur un nouveau téléphone
   * subirait trente écrans bloquants pour des badges gagnés il y a des mois —
   * une célébration qui n'est pas un ÉVÉNEMENT n'est plus une célébration.
   */
  baselineDone: boolean;
}

/**
 * Décide les moments dédiés à partir d'une lecture de `user_badges` et de la
 * mémoire locale. PURE et déterministe.
 *
 * Trois règles, dans cet ordre :
 *  1. pas de base → on ne célèbre rien, on mémorise tout (cf. `baselineDone`) ;
 *  2. seul le NOUVEAU et le RARE s'arrête ; le reste est mémorisé en silence ;
 *  3. quand plusieurs niveaux d'une MÊME famille progressive tombent ensemble
 *     (le moteur décerne tous les paliers franchis d'un coup), seul le plus HAUT
 *     mérite l'arrêt — les niveaux inférieurs sont absorbés, pas escamotés : ils
 *     entrent en mémoire et restent visibles dans la collection.
 */
export function selectUnlockMoments(input: UnlockSelectionInput): UnlockSelection {
  const known = new Set(input.known);
  const fresh = input.unlocked.filter((k) => !known.has(k));

  if (!input.baselineDone) return { celebrate: [], remember: [...fresh] };

  const rare: BadgeDef[] = [];
  const remember: string[] = [];
  for (const key of fresh) {
    const def = badgeById(key);
    if (def && isRareBadge(def)) rare.push(def);
    else remember.push(key);
  }

  // Règle 3 — un seul niveau par famille progressive : le plus haut matériau.
  const bestOfFamily = new Map<string, BadgeDef>();
  const standalone: BadgeDef[] = [];
  for (const def of rare) {
    const slug = def.familySlug;
    if (!slug) {
      standalone.push(def);
      continue;
    }
    const current = bestOfFamily.get(slug);
    if (!current || rank(def) > rank(current)) {
      if (current) remember.push(current.id);
      bestOfFamily.set(slug, def);
    } else {
      remember.push(def.id);
    }
  }

  const celebrate = [...standalone, ...bestOfFamily.values()]
    .sort((a, b) => rank(b) - rank(a) || a.id.localeCompare(b.id))
    .map((d) => d.id);

  return { celebrate, remember };
}

function rank(def: BadgeDef): number {
  return BADGE_TIER_RANK[def.tier];
}

// ─── « AJOUTER AU PROFIL » : l'issue réelle, jamais un bouton mort ───────────

/**
 * Issue de l'ajout à la vitrine du profil (`profileStore.featuredBadgeIds`).
 *  · `added`   — la liste à enregistrer (le badge est le dernier ajouté) ;
 *  · `already` — il y est déjà : l'écran le dit, il ne re-« réussit » pas ;
 *  · `full`    — la vitrine est pleine ; l'écran propose d'aller choisir lequel
 *                remplacer, plutôt que d'échouer en silence.
 */
export type FeaturedOutcome =
  | { kind: 'added'; next: string[] }
  | { kind: 'already' }
  | { kind: 'full'; max: number };

/** Décide l'ajout du badge à la vitrine, sans jamais dépasser le cap. PURE. */
export function addToFeatured(
  current: readonly string[],
  key: string,
  max: number,
): FeaturedOutcome {
  if (current.includes(key)) return { kind: 'already' };
  if (current.length >= max) return { kind: 'full', max };
  return { kind: 'added', next: [...current, key] };
}
