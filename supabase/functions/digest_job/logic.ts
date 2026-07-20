/**
 * GRYD — digest_job/logic.ts (SPEC §4.3, GRYD_notifications_logic.md §3/§6).
 *
 * Fonctions PURES :
 *   - canPush : garde-fous push — quiet hours 21h-8h (heure LOCALE du joueur,
 *     défaut Europe/Paris) + cap PUSH_MAX_PER_DAY tous types confondus.
 *   - buildDigest : regroupe les petits événements en UN résumé
 *     (« Résumé GRYD — 3 zones défendues, 1 zone perdue… », doc notifs §6).
 *
 * canPush vit désormais dans `../_shared/push.ts` (PÉRIMÈTRE 3) : decay_job en a
 * besoin aussi, et deux copies de la règle « quiet hours + cap » auraient
 * dérivé. Ré-exporté ici pour ne rien casser des appelants existants.
 */
export {
  canPush,
  type CanPushResult,
  type PushBlockReason,
  type PushUser,
} from '../_shared/push.ts';

// ─── Digest (doc notifs §6) ──────────────────────────────────────────────────

/** Petits événements agrégeables — jamais poussés un par un. */
export type DigestEventType =
  | 'hexes_gained'
  | 'hexes_defended'
  | 'hexes_lost'
  | 'zones_defended'
  | 'zones_lost'
  | 'badges_unlocked'
  | 'crew_runs';

export interface DigestEvent {
  type: DigestEventType;
  count: number;
}

export interface Digest {
  title: string;
  body: string;
  /** Nombre d'événements agrégés (analytics `digest_sent`). */
  itemCount: number;
}

/** Libellés fr : [singulier, pluriel] — le compte est préfixé. */
const LABELS: Record<DigestEventType, [string, string]> = {
  hexes_gained: ['hex gagné', 'hexes gagnés'],
  hexes_defended: ['hex défendu', 'hexes défendus'],
  hexes_lost: ['hex perdu', 'hexes perdus'],
  zones_defended: ['zone défendue', 'zones défendues'],
  zones_lost: ['zone perdue', 'zones perdues'],
  badges_unlocked: ['badge débloqué', 'badges débloqués'],
  crew_runs: ['course du crew', 'courses du crew'],
};

/** Ordre d'affichage stable (le positif d'abord, le crew en dernier). */
const DISPLAY_ORDER: readonly DigestEventType[] = [
  'hexes_gained',
  'hexes_defended',
  'zones_defended',
  'hexes_lost',
  'zones_lost',
  'badges_unlocked',
  'crew_runs',
];

/**
 * Groupe les événements en un résumé unique. null = rien à dire, PAS de digest
 * (« rares, utiles, actionnables » — on n'envoie jamais un résumé vide).
 */
export function buildDigest(
  events: readonly DigestEvent[],
  scope: 'crew' | 'weekly',
): Digest | null {
  // Fusion des doublons par type, comptes <= 0 ignorés.
  const totals = new Map<DigestEventType, number>();
  for (const e of events) {
    if (e.count <= 0) continue;
    totals.set(e.type, (totals.get(e.type) ?? 0) + e.count);
  }
  if (totals.size === 0) return null;

  const parts: string[] = [];
  for (const type of DISPLAY_ORDER) {
    const count = totals.get(type);
    if (!count) continue;
    const [singular, plural] = LABELS[type];
    const label = count === 1 ? singular : plural;
    parts.push(type === 'hexes_gained' ? `+${count} ${label}` : `${count} ${label}`);
  }

  return {
    title: scope === 'weekly' ? 'Résumé GRYD de la semaine' : 'Résumé GRYD du crew',
    body: `${parts.join(', ')}.`,
    itemCount: parts.length,
  };
}

// ─── Nudge challenge sain (AMENDEMENT-07 §9, motivation §12) ──────────────────

/** Avancement d'un challenge pour le nudge (sous-ensemble de ChallengeUpdate). */
export interface ChallengeNudgeInput {
  name: string;
  /** Sujet : joueur (`user`) ou crew (`crew`). */
  kind: 'user' | 'crew';
  progress: number;
  target: number;
}

export interface ChallengeNudge {
  title: string;
  body: string;
}

/**
 * Construit un rappel de challenge NON CULPABILISANT (motivation §11.1/§12). PURE.
 * Règles anti-shame :
 *  - JAMAIS « en retard / tu vas perdre / tu n'as pas couru » ;
 *  - objectif atteint → félicitation ; proche (reste ≤ 1 unité) → « à 1 de ton
 *    objectif » ; sinon progression positive (« X/Y, ta régularité progresse »).
 * Renvoie null si rien d'actionnable (target ≤ 0, ou aucun progrès à saluer sans
 * pression — on n'envoie jamais un rappel vide/anxiogène).
 */
export function buildChallengeNudge(ch: ChallengeNudgeInput): ChallengeNudge | null {
  const target = ch.target;
  if (target <= 0) return null;
  const progress = Math.max(0, ch.progress);
  const remaining = Math.max(0, target - progress);
  const who = ch.kind === 'crew' ? 'Votre crew' : 'Tu';
  const possessive = ch.kind === 'crew' ? 'votre' : 'ton';

  if (remaining === 0) {
    return {
      title: `${ch.name} — objectif atteint`,
      body: ch.kind === 'crew'
        ? `${who} avez bouclé ${ch.name}. Beau travail collectif.`
        : `${who} as bouclé ${ch.name}. Beau travail.`,
    };
  }
  if (remaining <= 1) {
    return {
      title: `${ch.name}`,
      body: ch.kind === 'crew'
        ? `${who} êtes à 1 pas de ${possessive} objectif ${ch.name}.`
        : `${who} es à 1 pas de ${possessive} objectif ${ch.name}.`,
    };
  }
  // Progression saine : on valorise l'avancée, jamais le manque.
  return {
    title: `${ch.name}`,
    body: ch.kind === 'crew'
      ? `${who} avancez sur ${ch.name} : ${progress}/${target}. La régularité paie.`
      : `${who} avances sur ${ch.name} : ${progress}/${target}. Ta régularité progresse.`,
  };
}
