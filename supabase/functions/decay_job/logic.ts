/**
 * GRYD — decay_job/logic.ts (SPEC §3.3, GRYD_reglement_saison_0.md §9).
 *
 * Fonction PURE : partitionne les hexes en « à neutraliser » (decay échu) et
 * « à avertir » (fenêtre J-3 entamée, pas encore averti pour ce cycle), puis
 * groupe les avertissements par joueur — UNE notification « ton quartier
 * s'efface » par joueur, jamais par hex (GRYD_notifications_logic.md §6).
 *
 * Anti double-warning SANS reset : une défense repousse decay_at, donc l'ancien
 * decay_warned_at devient antérieur au début de la nouvelle fenêtre J-3 → le
 * warning caduc ne bloque pas le cycle suivant.
 */
import { DECAY_WARNING_DAYS_BEFORE } from '../_shared/game-rules.ts';

const MS_PER_DAY = 86_400_000;
const WARNING_WINDOW_MS = DECAY_WARNING_DAYS_BEFORE * MS_PER_DAY;

/** Ligne hex_claims minimale vue par le job (id opaque : h3index DB en string). */
export interface DecayHexRow {
  id: string;
  ownerUserId: string | null;
  /** null = territoire protégé (compte < 14 j, §3.3) : ni decay ni warning. */
  decayAt: Date | null;
  /** Dernier avertissement J-3 envoyé (null = jamais). */
  decayWarnedAt: Date | null;
}

/** Avertissement groupé : une notification par joueur. */
export interface DecayWarning {
  userId: string;
  /** Nombre d'hexes menacés (contenu de la notif « X hexes s'effacent »). */
  hexCount: number;
  /** Échéance la plus proche parmi les hexes menacés (le « dans N jours »). */
  earliestDecayAt: Date;
  /** Ids des hexes à marquer decay_warned_at = now. */
  hexIds: string[];
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

/** Groupe les hexes à avertir par joueur : 1 notification « ton quartier
 * s'efface » par user (jamais « tu as été attaqué 47 fois », doc notifs §5). */
export function groupWarningsByUser(toWarn: readonly DecayHexRow[]): DecayWarning[] {
  const byUser = new Map<string, DecayWarning>();
  for (const hex of toWarn) {
    if (hex.ownerUserId === null || hex.decayAt === null) continue;
    const existing = byUser.get(hex.ownerUserId);
    if (!existing) {
      byUser.set(hex.ownerUserId, {
        userId: hex.ownerUserId,
        hexCount: 1,
        earliestDecayAt: hex.decayAt,
        hexIds: [hex.id],
      });
    } else {
      existing.hexCount += 1;
      existing.hexIds.push(hex.id);
      if (hex.decayAt.getTime() < existing.earliestDecayAt.getTime()) {
        existing.earliestDecayAt = hex.decayAt;
      }
    }
  }
  return [...byUser.values()];
}
