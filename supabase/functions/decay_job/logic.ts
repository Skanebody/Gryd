/**
 * GRYD — decay_job/logic.ts (SPEC §3.3, GRYD_reglement_saison_0.md §9).
 *
 * Fonction PURE : partitionne les hexes en « à neutraliser » (decay échu) et
 * « à avertir » (fenêtre J-3 entamée, pas encore averti pour ce cycle), puis
 * groupe les avertissements par joueur — UNE notification « ton quartier
 * s'efface » par joueur, jamais par hex (GRYD_notifications_logic.md §6) —
 * avec, à l'intérieur, UN COMPTE PAR DISCIPLINE (0071) : le territoire est
 * séparé, un compte de zones ne somme jamais les deux mondes (E14).
 *
 * Anti double-warning SANS reset : une défense repousse decay_at, donc l'ancien
 * decay_warned_at devient antérieur au début de la nouvelle fenêtre J-3 → le
 * warning caduc ne bloque pas le cycle suivant.
 */
import { ACTIVITIES, type Activity, DECAY_WARNING_DAYS_BEFORE } from '../_shared/game-rules.ts';
import { daysUntilDecay } from '../_shared/push.ts';

const MS_PER_DAY = 86_400_000;
const WARNING_WINDOW_MS = DECAY_WARNING_DAYS_BEFORE * MS_PER_DAY;

/** Ligne hex_claims minimale vue par le job (id opaque : h3index DB en string). */
export interface DecayHexRow {
  id: string;
  /**
   * Univers de la ligne (E14, migration 0070). La clé primaire de `hex_claims`
   * est COMPOSITE `(h3index, activity)` : `id` seul ne désigne plus UNE ligne,
   * il en désigne jusqu'à deux. Toute écriture doit donc porter les deux.
   */
  activity: Activity;
  ownerUserId: string | null;
  /** null = territoire protégé (compte < 14 j, §3.3) : ni decay ni warning. */
  decayAt: Date | null;
  /** Dernier avertissement J-3 envoyé (null = jamais). */
  decayWarnedAt: Date | null;
}

/** Ce qui s'efface DANS UN MONDE. Jamais additionné à l'autre. */
export interface DecayActivityWarning {
  activity: Activity;
  /**
   * Hexes menacés dans cette discipline. La clé primaire `(h3index, activity)`
   * (0070) garantit qu'un hexagone n'y figure qu'UNE fois : ce compte ne peut
   * pas être gonflé, contrairement à un total tous mondes confondus.
   */
  hexCount: number;
  /** Échéance la plus proche DANS CE MONDE (le « dans N jours » de sa phrase). */
  earliestDecayAt: Date;
}

/**
 * Avertissement groupé : une notification par joueur, MAIS DEUX COMPTES.
 *
 * L'UNITÉ D'ENVOI reste le JOUEUR (même arbitrage que `claim_steal_push_batch`,
 * 0070 : grouper par discipline doublerait la notification). L'UNITÉ DE COMPTE,
 * elle, est le couple (joueur, discipline) — et c'est là que le fichier se
 * trompait.
 *
 * CE QUI A CHANGÉ ET POURQUOI (0071). L'ancienne version exposait un `hexCount`
 * unique, tous mondes confondus. Il portait deux fautes :
 *   · il SOMMAIT deux territoires séparés (« 12 hexes » pour 7 à pied + 5 à
 *     vélo), alors que `ACTIVITY_SCOPE.territory = 'per_activity'` et que E14
 *     interdit de mêler les mondes dans une lecture de territoire — un compte
 *     de zones EST une lecture de territoire, même quand il ne classe personne ;
 *   · au-dessus du même hexagone tenu dans les deux mondes, il comptait DEUX,
 *     là où la carte du joueur n'en montre qu'un.
 * Séparer les comptes règle les deux d'un coup : dans un monde, un hexagone
 * menacé vaut exactement un, et aucune addition n'est présentée au joueur.
 */
export interface DecayWarning {
  userId: string;
  /**
   * Un bloc par discipline concernée, dans l'ordre de `ACTIVITIES`. JAMAIS
   * sommés — ni ici, ni dans la copie, ni dans la réponse du job.
   */
  perActivity: DecayActivityWarning[];
  /**
   * Échéance la plus proche, toutes disciplines. C'est un INSTANT, pas un
   * compte : prendre le plus tôt des deux mondes ne mélange aucun territoire.
   */
  earliestDecayAt: Date;
  /** Lignes à marquer decay_warned_at = now — hexagone ET discipline. */
  hexKeys: DecayHexKey[];
}

/** Clé RÉELLE d'une ligne `hex_claims` depuis 0070 : l'hexagone ET son monde. */
export interface DecayHexKey {
  id: string;
  activity: Activity;
}

export interface DecayPartition {
  /** decay_at < now (SPEC §6.3) → redeviennent neutres. */
  toNeutralize: DecayHexRow[];
  /** Fenêtre J-3 atteinte (decay_at − 3 j <= now), pas encore avertis ce cycle. */
  toWarn: DecayHexRow[];
  /** toWarn groupé par joueur — 1 notif par user. */
  warnings: DecayWarning[];
}

export function partitionDecay(hexes: readonly DecayHexRow[], now: Date): DecayPartition {
  const toNeutralize: DecayHexRow[] = [];
  const toWarn: DecayHexRow[] = [];

  for (const hex of hexes) {
    if (hex.decayAt === null) continue; // protégé nouveau joueur : exempt (§3.3)
    const decayMs = hex.decayAt.getTime();

    // Échu → neutre (strict, comme le SPEC : `decay_at < now()`).
    if (decayMs < now.getTime()) {
      toNeutralize.push(hex);
      continue;
    }

    if (hex.ownerUserId === null) continue; // déjà neutre : personne à avertir

    // Fenêtre d'avertissement : à J-3 EXACTEMENT on avertit (inclusif — c'est
    // le contrat produit « notification à J-3 », §3.3).
    const warnFromMs = decayMs - WARNING_WINDOW_MS;
    if (warnFromMs > now.getTime()) continue; // trop tôt

    // Déjà averti pour CE cycle ? Un warning antérieur au début de la fenêtre
    // courante date d'un cycle précédent (decay_at repoussé depuis) → caduc.
    const alreadyWarned = hex.decayWarnedAt !== null &&
      hex.decayWarnedAt.getTime() >= warnFromMs;
    if (alreadyWarned) continue;

    toWarn.push(hex);
  }

  return { toNeutralize, toWarn, warnings: groupWarningsByUser(toWarn) };
}

/**
 * Groupe les hexes à avertir par joueur : 1 notification « ton quartier
 * s'efface » par user (jamais « tu as été attaqué 47 fois », doc notifs §5),
 * mais UN COMPTE PAR MONDE à l'intérieur (cf. DecayWarning).
 */
export function groupWarningsByUser(toWarn: readonly DecayHexRow[]): DecayWarning[] {
  interface Acc {
    userId: string;
    byActivity: Map<Activity, { hexCount: number; earliestDecayAt: Date }>;
    earliestDecayAt: Date;
    hexKeys: DecayHexKey[];
  }
  const byUser = new Map<string, Acc>();

  for (const hex of toWarn) {
    if (hex.ownerUserId === null || hex.decayAt === null) continue;
    let acc = byUser.get(hex.ownerUserId);
    if (!acc) {
      acc = {
        userId: hex.ownerUserId,
        byActivity: new Map(),
        earliestDecayAt: hex.decayAt,
        hexKeys: [],
      };
      byUser.set(hex.ownerUserId, acc);
    }
    acc.hexKeys.push({ id: hex.id, activity: hex.activity });
    if (hex.decayAt.getTime() < acc.earliestDecayAt.getTime()) acc.earliestDecayAt = hex.decayAt;

    const world = acc.byActivity.get(hex.activity);
    if (!world) {
      acc.byActivity.set(hex.activity, { hexCount: 1, earliestDecayAt: hex.decayAt });
    } else {
      world.hexCount += 1;
      if (hex.decayAt.getTime() < world.earliestDecayAt.getTime()) {
        world.earliestDecayAt = hex.decayAt;
      }
    }
  }

  return [...byUser.values()].map((acc) => ({
    userId: acc.userId,
    // Ordre de ACTIVITIES (course puis vélo) : une notification ne change pas
    // d'ordre selon l'ordre de lecture de la base.
    perActivity: ACTIVITIES.flatMap((activity) => {
      const world = acc.byActivity.get(activity);
      return world ? [{ activity, ...world }] : [];
    }),
    earliestDecayAt: acc.earliestDecayAt,
    hexKeys: acc.hexKeys,
  }));
}

// ─── Copie de l'avertissement (PURE : ce que le joueur lit) ──────────────────

/** Le monde, dit au joueur. Même vocabulaire que le vol subi (steal_push_job). */
const WORLD_LABEL: Readonly<Record<Activity, string>> = {
  run: 'à pied',
  bike: 'à vélo',
};

/** L'action qui SAUVE la zone, par monde. Une course ne défend pas une zone vélo. */
const SAVE_ACTION: Readonly<Record<Activity, [string, string]>> = {
  run: ['Une course dessus la garde.', 'Une course dessus les garde.'],
  bike: ['Une sortie vélo dessus la garde.', 'Une sortie vélo dessus les garde.'],
};

/**
 * Corps de la notification « ton quartier s'efface ». PURE.
 *
 * TROIS RÈGLES, chacune contre un mensonge précis :
 *  1. le monde est TOUJOURS nommé — « 3 zones » sans discipline laisse un
 *     cycliste croire qu'on lui parle de course ;
 *  2. les deux mondes ne sont JAMAIS additionnés — ils sont énoncés côte à
 *     côte (E14), et le joueur peut vérifier chaque nombre sur sa carte ;
 *  3. le délai est CALCULÉ (daysUntilDecay), pas écrit en dur : l'ancienne
 *     copie annonçait « dans 3 jours » même quand la zone partait le lendemain.
 */
export function buildDecayWarningBody(warning: DecayWarning, now: Date): string {
  const parts = warning.perActivity;
  if (parts.length === 0) return ''; // aucun monde menacé : l'appelant n'écrit rien

  if (parts.length === 1) {
    const [{ activity, hexCount, earliestDecayAt }] = parts;
    const days = daysUntilDecay(earliestDecayAt, now);
    const [saveOne, saveMany] = SAVE_ACTION[activity];
    return hexCount === 1
      ? `1 zone ${WORLD_LABEL[activity]} redevient neutre dans ${days} j. ${saveOne}`
      : `${hexCount} zones ${WORLD_LABEL[activity]} redeviennent neutres dans ${days} j. ${saveMany}`;
  }

  // Deux mondes : on les énonce, on ne les additionne pas. Le délai est celui
  // de la PREMIÈRE échéance — dit comme tel (« au plus tôt »), pour ne pas
  // laisser croire que tout part en même temps.
  const listed = parts
    .map((p, i) =>
      i === 0
        ? `${p.hexCount} ${p.hexCount === 1 ? 'zone' : 'zones'} ${WORLD_LABEL[p.activity]}`
        : `${p.hexCount} ${WORLD_LABEL[p.activity]}`
    )
    .join(' et ');
  const days = daysUntilDecay(warning.earliestDecayAt, now);
  return `${listed} redeviennent neutres dans ${days} j au plus tôt. ` +
    `Chaque monde se défend dans sa discipline.`;
}

/**
 * Range des clés de lignes PAR DISCIPLINE — la forme qu'attend une écriture
 * correcte depuis 0070 : `.in('h3index', ids).eq('activity', a)`, une passe par
 * monde. Sans ce regroupement, un `.in('h3index', …)` seul frapperait les DEUX
 * lignes d'un hexagone tenu à la fois à pied et à vélo : neutraliser la zone
 * échue d'un coureur effacerait la zone ENCORE VIVANTE du cycliste.
 *
 * Un garde-fou SQL (`hex_claims_guard_decay_trg`, 0070) empêche déjà le dégât
 * TERRITORIAL — mais pas le dégât d'INFORMATION : sans discipline, une passe de
 * course peut marquer « déjà prévenue » la ligne vélo du même hexagone, dont
 * l'échéance est lointaine ; le cycliste perdrait son avertissement. Ce
 * regroupement est la vraie correction ; le trigger reste la ceinture.
 *
 * Les disciplines SANS ligne sont absentes du résultat : une passe vide ne doit
 * pas produire un appel réseau qui ne peut rien changer.
 */
export function groupKeysByActivity(
  keys: readonly DecayHexKey[],
): Map<Activity, string[]> {
  const byActivity = new Map<Activity, string[]>();
  for (const a of ACTIVITIES) {
    const ids = keys.filter((k) => k.activity === a).map((k) => k.id);
    if (ids.length > 0) byActivity.set(a, ids);
  }
  return byActivity;
}
