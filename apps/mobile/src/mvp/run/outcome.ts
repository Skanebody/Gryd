/**
 * GRYD — CE QUE L'ÉCRAN DE RÉSULTAT A LE DROIT DE DIRE. PUR (lot M7).
 *
 * ─── LES DEUX LOIS QUI GOUVERNENT CE MODULE ─────────────────────────────────
 * L19 — L'APP N'ACCUSE JAMAIS, et les stats sont TOUJOURS préservées. Un refus
 * nomme un fait, donne le manque en mètres quand il existe, et rappelle ce qui
 * reste. « Raté » n'est pas une phrase que GRYD prononce.
 *
 * « L'app ne ment jamais » — et c'est ici que le mensonge serait le plus
 * tentant. Une course ENVOYÉE PLUS TARD (hors ligne) n'a pas de verdict : dire
 * « aucun territoire » serait affirmer un refus que personne n'a prononcé.
 * L'attente est donc une issue À PART ENTIÈRE, jamais un échec par défaut.
 *
 * ─── CE QUI EST TOUJOURS VRAI, QUOI QU'AIT DIT LE SERVEUR ───────────────────
 * La distance et la durée viennent de la trace LOCALE. Elles existent avant
 * l'envoi, elles survivent à un refus, elles survivent à l'absence de réseau.
 * C'est exactement ce que L19 appelle « tes stats restent disponibles » : elles
 * ne sont pas une consolation, elles sont un fait mesuré.
 */
import type { RejectReason } from '@klaim/shared';

/**
 * La réponse d'`ingest_run`, réduite à ce que le résultat en lit.
 *
 * Structurelle et PARTIELLE à dessein : ce module ne doit dépendre que des
 * champs qu'il utilise, sinon toute évolution de la réponse le casserait sans
 * qu'aucun comportement n'ait changé.
 */
export interface ServerVerdict {
  readonly status: 'valid' | 'partial' | 'rejected' | 'flagged';
  readonly rejectReason?: RejectReason;
  readonly loopClosed?: boolean;
  readonly loopAssisted?: true;
  readonly loopMissingM?: number;
  readonly loopRejectedReason?: 'narrow';
  /** Aire de l'anneau. Absente = aucun territoire écrit (voir `interiorPartial`). */
  readonly loopAreaM2?: number;
  /** Vrai = `loopAreaM2` SURESTIME le gain : elle ne doit pas être annoncée. */
  readonly interiorPartial?: boolean;
  readonly capReached?: boolean;
}

/** Ce qu'on a pu faire de la course, avant même de parler de territoire. */
export type SendResult =
  | { readonly kind: 'answered'; readonly verdict: ServerVerdict }
  /** Envoi impossible : la course est EN FILE, elle partira. Pas un échec. */
  | { readonly kind: 'queued' }
  /** Même la mise en file a échoué (stockage plein). Le seul vrai échec. */
  | { readonly kind: 'lost' };

/**
 * Ce que l'écran affiche.
 *
 *   · `captured`  — territoire pris, avec son aire. Le pic émotionnel (L7).
 *   · `takenNoArea` — pris, mais l'aire ne décrit PAS le gain (`interiorPartial`)
 *     ou n'a pas été écrite. On dit la prise, on n'invente pas le chiffre.
 *   · `missing`   — la boucle ne s'est pas refermée, et on sait de combien.
 *   · `noLoop`    — pas de boucle, et aucun manque chiffrable. Aucun reproche.
 *   · `refused`   — la course elle-même n'a pas été retenue (allure, durée…).
 *   · `pending`   — pas encore envoyée. AUCUN verdict : on ne dit rien du
 *     territoire, parce qu'on ne sait rien.
 *   · `lost`      — on n'a même pas pu la mettre en file. On le DIT.
 */
export type ResultView =
  | { readonly kind: 'captured'; readonly areaM2: number; readonly assisted: boolean }
  | { readonly kind: 'takenNoArea' }
  | { readonly kind: 'missing'; readonly missingM: number }
  | { readonly kind: 'noLoop' }
  | { readonly kind: 'refused'; readonly reason: RejectReason | 'narrow' | 'unknown' }
  | { readonly kind: 'pending' }
  | { readonly kind: 'lost' };

/**
 * Issue de l'envoi → ce que l'écran dit du TERRITOIRE. PURE.
 *
 * ⚠️ L'ORDRE est le fond du sujet, comme pour la carte : chaque cas écarte une
 * raison de ne pas savoir, et aucun verdict négatif n'est prononcé tant qu'un
 * serveur ne l'a pas réellement dit.
 */
export function resultView(send: SendResult): ResultView {
  if (send.kind === 'lost') return { kind: 'lost' };
  if (send.kind === 'queued') return { kind: 'pending' };

  const v = send.verdict;

  // La course elle-même refusée (trop courte, allure hors bornes…) : il n'y a
  // pas de territoire à discuter, et le motif est NOMMÉ — un refus sans raison
  // se lit comme une accusation.
  if (v.status === 'rejected') {
    return { kind: 'refused', reason: v.rejectReason ?? 'unknown' };
  }

  // Boucle fermée ET territoire écrit : le seul cas où un chiffre s'affiche.
  if (v.loopClosed === true) {
    // `interiorPartial` : l'aire de l'anneau SURESTIME ce qui a été obtenu.
    // L'annoncer serait un mensonge chiffré — le pire, parce que le joueur le
    // retient et le partage.
    if (v.loopAreaM2 !== undefined && v.loopAreaM2 > 0 && v.interiorPartial !== true) {
      return { kind: 'captured', areaM2: v.loopAreaM2, assisted: v.loopAssisted === true };
    }
    return { kind: 'takenNoArea' };
  }

  // Forme refusée par le moteur : un fait de géométrie, pas une faute.
  if (v.loopRejectedReason === 'narrow') return { kind: 'refused', reason: 'narrow' };

  // Pas de boucle. Si le serveur sait de combien il manquait, on le dit — c'est
  // toute la différence entre « raté » et « il te manquait 23 m ».
  if (v.loopMissingM !== undefined && v.loopMissingM > 0) {
    return { kind: 'missing', missingM: v.loopMissingM };
  }
  return { kind: 'noLoop' };
}

/**
 * Un chiffre héros de territoire est-il affichable ? PURE.
 *
 * Séparé de la vue pour que l'invariant soit testable seul : aucun m² ne sort
 * d'un état qui ne sait pas — ni pendant l'attente, ni après un refus, ni quand
 * l'aire surestime le gain.
 */
export function resultAreaM2(view: ResultView): number | null {
  return view.kind === 'captured' ? view.areaM2 : null;
}

/**
 * Les stats locales sont-elles affichées ? TOUJOURS OUI (L19).
 *
 * Cette fonction existe pour que la loi soit un test plutôt qu'une intention :
 * il n'y a aucun chemin, dans aucune issue, où la distance et la durée d'une
 * course réellement parcourue disparaissent de l'écran.
 */
export function showsLocalStats(_view: ResultView): boolean {
  return true;
}
